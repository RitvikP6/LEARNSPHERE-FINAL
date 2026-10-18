(() => {
let currentUser = null;
let authSubscription = null;
let authStateToken = 0; // increments on every auth-state change to invalidate stale async work

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
// Student data is scoped to the authenticated Supabase UUID. Supabase is authoritative
// when configured; localStorage is only a per-user cache/offline fallback.
let remoteState = {};
let remoteStateReady = false;
let persistQueue = Promise.resolve();
let persistenceError = null;
const storageKey = key => currentUser?.id ? `ls_${currentUser.id}_${key.replace(/^ls_/, "")}` : `ls_demo_${key}`;
const read = (key, fallback) => {
  if (currentUser?.id && Object.prototype.hasOwnProperty.call(remoteState, key)) return remoteState[key] ?? fallback;
  try { return JSON.parse(localStorage.getItem(storageKey(key))) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch (e) { console.warn("Local cache write failed", e); }
  if (!currentUser?.id) return;
  remoteState[key] = value;
  const client = getAuthClient();
  if (!client || !remoteStateReady) return;
  const uid = currentUser.id;
  const snapshot = JSON.parse(JSON.stringify(remoteState));
  persistQueue = persistQueue.then(async () => {
    if (currentUser?.id !== uid) return;
    const { error } = await client.from("user_learning_state").upsert(
      { user_id: uid, state: snapshot, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) throw error;
    persistenceError = null;
  }).catch(error => {
    persistenceError = error;
    console.error("LearnSphere cloud save failed:", error);
    toast("Cloud save failed. Your changes remain in this browser; check your connection and retry.");
  });
};
async function loadStudentState(user) {
  const client = getAuthClient();
  remoteStateReady = false;
  remoteState = {};
  if (!user?.id) return;
  if (!client) { remoteStateReady = true; return; }
  const uid = user.id;
  const { data, error } = await client.from("user_learning_state").select("state").eq("user_id", uid).maybeSingle();
  if (currentUser?.id !== uid) return;
  if (error) {
    console.error("Could not load LearnSphere cloud state:", error);
    throw new Error("Your learning data could not be loaded from Supabase. Please check the database migration and reload.");
  }
  remoteState = data?.state && typeof data.state === "object" ? data.state : {};
  Object.entries(remoteState).forEach(([key, value]) => {
    try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch {}
  });
  remoteStateReady = true;
}
const courses = [
{id:"c1",title:"JavaScript: From Zero to Confident",category:"Programming",level:"Beginner",duration:"8h 20m",minutes:500,lessons:24,instructor:"Maya Chen",rating:"4.9",students:"12.4k",art:"art-code",icon:"bi-code-slash",tag:"Bestseller",description:"Build a strong JavaScript foundation by creating useful, interactive projects. Learn language fundamentals, the DOM, events, and modern patterns.",outcomes:["Understand variables, functions, arrays, and objects","Build interactive pages with the DOM","Write cleaner code with modern JavaScript"],modules:[{title:"JavaScript foundations",lessons:["Getting started with JavaScript","Variables, values & operators","Functions and scope"]},{title:"Working with data",lessons:["Arrays and objects","Loops and array methods"]},{title:"Interactive web pages",lessons:["DOM selection and events","Build a mini task manager"]}]},
{id:"c2",title:"UI Design Essentials",category:"Design",level:"Beginner",duration:"5h 10m",minutes:310,lessons:18,instructor:"Jordan Lee",rating:"4.8",students:"8.2k",art:"art-design",icon:"bi-bezier2",tag:"Popular",description:"Turn rough ideas into clear, accessible interfaces with layout, typography, color, and practical design systems.",outcomes:["Use hierarchy and spacing with intention","Create accessible color and type systems","Design a consistent multi-screen experience"],modules:[{title:"Design foundations",lessons:["How people scan interfaces","Typography that works"]},{title:"Build a visual system",lessons:["Color and contrast","Spacing and layout systems"]},{title:"Put it into practice",lessons:["Reusable components","A polished dashboard concept"]}]},
{id:"c3",title:"Data Analytics with Python",category:"Technology",level:"Intermediate",duration:"10h 40m",minutes:640,lessons:31,instructor:"Aarav Mehta",rating:"4.9",students:"6.7k",art:"art-data",icon:"bi-bar-chart-line",tag:"New",description:"Explore data with Python, tidy datasets, uncover patterns, and communicate findings through clear visualizations.",outcomes:["Work with tables and basic data cleaning","Summarize data with meaningful metrics","Communicate insights with charts"],modules:[{title:"Tools and data",lessons:["Python data toolkit","Cleaning messy datasets"]},{title:"Explore and explain",lessons:["Exploratory analysis","Charts that explain"]},{title:"Project",lessons:["Mini project: learner trends"]}]},
{id:"c4",title:"Productivity & Project Planning",category:"Technology",level:"Beginner",duration:"3h 45m",minutes:225,lessons:14,instructor:"Sofia Williams",rating:"4.7",students:"4.1k",art:"art-business",icon:"bi-kanban",tag:"Practical",description:"Plan realistic projects, set priorities, and build repeatable routines that make progress visible.",outcomes:["Break large work into small milestones","Prioritize without overloading your week","Run a simple project review"],modules:[{title:"Plan with purpose",lessons:["Set a useful goal","Map the work"]},{title:"Keep moving",lessons:["Plan weekly milestones","Manage focus and energy"]},{title:"Improve your process",lessons:["Review and improve"]}]},
{id:"c5",title:"Photography: Light & Composition",category:"Design",level:"Beginner",duration:"4h 30m",minutes:270,lessons:16,instructor:"Noah Brooks",rating:"4.8",students:"3.9k",art:"art-photo",icon:"bi-camera",tag:"Creative",description:"Learn to notice light, frame stronger photographs, and tell a story through simple composition choices.",outcomes:["Recognize direction and quality of light","Use framing and visual balance","Edit a photo with a clear intention"],modules:[{title:"See like a photographer",lessons:["Seeing light","Composition basics"]},{title:"Create a mood",lessons:["Color and mood","Portraits and scenes"]},{title:"Finish thoughtfully",lessons:["Editing with restraint"]}]},
{id:"c6",title:"Writing Clearly for the Web",category:"Design",level:"Intermediate",duration:"3h 20m",minutes:200,lessons:12,instructor:"Priya Nair",rating:"4.9",students:"2.8k",art:"art-writing",icon:"bi-pencil-square",tag:"Editor’s pick",description:"Make digital writing easier to scan, understand, and act on with structure, plain language, and thoughtful editing.",outcomes:["Write useful headings and concise paragraphs","Structure pages around reader needs","Edit for clarity and accessibility"],modules:[{title:"Write for readers",lessons:["Start with the reader","Structure and flow"]},{title:"Refine your writing",lessons:["Plain language","Writing for scanning","Editing checklist"]}]},
{id:"c7",title:"Algebra: Patterns to Equations",category:"Mathematics",level:"Beginner",duration:"6h 15m",minutes:375,lessons:20,instructor:"Elena Garcia",rating:"4.8",students:"7.1k",art:"art-data",icon:"bi-infinity",tag:"Foundations",description:"Build confidence with variables, expressions, linear equations, and the patterns that connect them.",outcomes:["Simplify expressions with confidence","Solve and verify linear equations","Translate word problems into equations"],modules:[{title:"Expressions and patterns",lessons:["Variables and expressions","Simplifying expressions"]},{title:"Equations",lessons:["One-step equations","Multi-step equations"]},{title:"Apply your skills",lessons:["Word problems","Check your solutions"]}]},
{id:"c8",title:"Geometry: Shapes & Proofs",category:"Mathematics",level:"Intermediate",duration:"7h 5m",minutes:425,lessons:22,instructor:"Daniel Kim",rating:"4.7",students:"5.6k",art:"art-design",icon:"bi-triangle",tag:"Popular",description:"Explore angles, triangles, congruence, and logical proof-writing through visual examples and guided practice.",outcomes:["Use core angle and triangle properties","Recognize congruence criteria","Write clear step-by-step proofs"],modules:[{title:"Geometry language",lessons:["Points, lines, and planes","Angles and parallel lines"]},{title:"Triangles",lessons:["Triangle properties","Congruence criteria"]},{title:"Reasoning and proof",lessons:["Build a logical proof","Practice problems"]}]},
{id:"c9",title:"Physics: Motion & Forces",category:"Science",level:"Beginner",duration:"5h 50m",minutes:350,lessons:19,instructor:"Dr. Nisha Rao",rating:"4.9",students:"9.3k",art:"art-business",icon:"bi-speedometer2",tag:"Student favorite",description:"Understand motion, speed, acceleration, and forces through intuitive explanations and everyday examples.",outcomes:["Read distance-time and velocity-time graphs","Apply basic motion equations","Explain how forces change motion"],modules:[{title:"Describe motion",lessons:["Distance and displacement","Speed and velocity"]},{title:"Acceleration",lessons:["Motion graphs","Equations of motion"]},{title:"Forces in action",lessons:["Newton's laws","Everyday force problems"]}]},
{id:"c10",title:"Chemistry: Atoms & Molecules",category:"Science",level:"Beginner",duration:"4h 55m",minutes:295,lessons:17,instructor:"Kabir Sharma",rating:"4.8",students:"6.2k",art:"art-photo",icon:"bi-atom",tag:"Core science",description:"Discover atomic structure, chemical symbols, formulae, and how atoms combine to form molecules.",outcomes:["Interpret common chemical symbols","Understand atoms, molecules, and ions","Calculate simple molecular masses"],modules:[{title:"The building blocks",lessons:["Atoms and symbols","Atomic structure basics"]},{title:"Molecules and formulae",lessons:["How atoms combine","Reading chemical formulae"]},{title:"Use the ideas",lessons:["Molecular mass","Practice and review"]}]},
{id:"c11",title:"Computer Networks Made Simple",category:"Technology",level:"Intermediate",duration:"6h 35m",minutes:395,lessons:21,instructor:"Omar Hassan",rating:"4.7",students:"4.4k",art:"art-code",icon:"bi-diagram-3",tag:"Career skills",description:"Learn how devices communicate, how the internet routes information, and what common network protocols do.",outcomes:["Explain LANs, WANs, and network devices","Understand the purpose of DNS and HTTP","Recognize basic security practices"],modules:[{title:"Network essentials",lessons:["How devices connect","Routers and switches"]},{title:"The internet",lessons:["IP addresses and DNS","HTTP and HTTPS"]},{title:"Safer connections",lessons:["Network security basics","Troubleshooting fundamentals"]}]},
{id:"c12",title:"Creative Coding with HTML & CSS",category:"Programming",level:"Beginner",duration:"7h 30m",minutes:450,lessons:26,instructor:"Amara Okafor",rating:"4.9",students:"10.1k",art:"art-writing",icon:"bi-window",tag:"Hands-on",description:"Create responsive web pages from scratch using semantic HTML, modern CSS, layout systems, and accessible patterns.",outcomes:["Structure pages with semantic HTML","Build responsive layouts with Flexbox and Grid","Create accessible interactive-ready interfaces"],modules:[{title:"Build the structure",lessons:["HTML essentials","Semantic page layout"]},{title:"Style with confidence",lessons:["CSS selectors and box model","Flexbox and Grid","Responsive design"]},{title:"Polish and publish",lessons:["Accessible interface patterns","Build a portfolio page"]}]}
];
const initialProgress = {c1:42,c2:18,c3:0,c4:0,c5:0,c6:0};
let progress = read("ls_progress", initialProgress);
let enrolled = read("ls_enrolled", ["c1","c2","c3"]);

/* ---------- Authenticated user & per-user profile (single source of truth) ----------
 * - currentUser is populated from Supabase `auth.getUser()` / session on init and
 *   refreshed by `auth.onAuthStateChange`. There is no hardcoded name anywhere.
 * - For signed-in users the editable profile (goal, bio, updates, name) is keyed
 *   in localStorage by the Supabase user id (`ls_profile_<uid>`), so two accounts
 *   on the same browser no longer clobber each other.
 * - For the demo path (no Supabase configured) the app falls back to a neutral
 *   "Learner" placeholder; it never falls back to a real user's name.
 * ---------------------------------------------------------------------------------- */

function getAuthClient(){return window.LearnSphereAuth?.client||null}

function displayNameFromUser(user){
  if(!user)return "Learner";
  const m=user.user_metadata||{};
  return (m.full_name||m.display_name||m.name||(user.email?user.email.split("@")[0]:"")||"Learner").toString().trim()||"Learner";
}
function initialsFromName(name){
  if(!name)return "L";
  const parts=String(name).trim().split(/\s+/).filter(Boolean);
  if(!parts.length)return "L";
  return parts.map(p=>p[0]).slice(0,2).join("").toUpperCase()||"L";
}
function emailFromUser(user){return user?.email?String(user.email).trim():""}
function profileKey(uid){return uid?`ls_profile_${uid}`:"ls_profile_anon"}
function defaultProfile(user){
  if(!user)return {name:"Learner",email:"",bio:"",goal:"3 hours per week",updates:true};
  return {name:displayNameFromUser(user),email:emailFromUser(user),bio:"",goal:"3 hours per week",updates:true};
}
function getProfile(){
  if(!currentUser)return defaultProfile(null);
  const stored=read("ls_profile",read(profileKey(currentUser.id),null));
  return {...defaultProfile(currentUser),...(stored&&typeof stored==="object"?stored:{})};
}
function saveProfile(p){
  if(!currentUser)return;
  save("ls_profile",{...p});
}
function exportableData(){
  const profile=currentUser?getProfile():read("ls_profile",{});
  return {profile,progress:read("ls_progress",{}),enrolled:read("ls_enrolled",[]),notes:read("ls_notes",[]),bestQuiz:read("ls_bestQuiz",0)};
}
function applyNameToUI(name){
  if($("#topName"))$("#topName").textContent=(name||"Learner").toString().split(/\s+/)[0]||"Learner";
  if($("#topAvatar"))$("#topAvatar").textContent=initialsFromName(name);
}
let notes = read("ls_notes", currentUser ? [] : [
{id:1,title:"JavaScript functions",course:"JavaScript: From Zero to Confident",tag:"Development",body:"A function packages reusable logic. Parameters are inputs; return sends a value back to the caller.",date:"Today"},
{id:2,title:"Visual hierarchy",course:"UI Design Essentials",tag:"Design",body:"Use size, weight, spacing, and contrast to guide attention. Keep one clear primary action per section.",date:"Yesterday"},
{id:3,title:"Chart selection",course:"Data Analytics with Python",tag:"Data",body:"Use a line chart for change over time, bars for comparing categories, and labels to explain the takeaway.",date:"Oct 8"}
]);
let currentLesson = 0, quizTimer = null, secondsLeft = 300, quizSubmitted = false;
courses.forEach(c=>{c.curriculum=c.modules.flatMap(m=>m.lessons)});
const getCourse = id => courses.find(c=>c.id===id) || courses[0];
const pct = id => progress[id] || 0;
const art = c => `<div class="course-art ${c.art}"><span class="art-kicker">${c.category} · ${c.level}</span><i class="bi ${c.icon} art-icon"></i></div>`;
const card = (c, enrolledCard=false) => `<article class="course-card">${art(c)}<div class="course-body"><div class="course-meta"><span>${c.duration} · ${c.lessons} lessons</span><span><i class="bi bi-star-fill text-warning"></i> ${c.rating}</span></div><a href="course.html?id=${c.id}" class="course-title d-block">${c.title}</a><p class="tiny mb-3">${c.description}</p><p class="instructor mb-0"><span class="avatar" style="width:27px;height:27px;font-size:.65rem">${c.instructor.split(" ").map(x=>x[0]).join("")}</span>${c.instructor}</p>${enrolledCard?`<div class="course-progress"><span>${pct(c.id)}% complete</span><span>${Math.round(c.lessons*pct(c.id)/100)} of ${c.lessons} lessons</span></div><div class="progress"><div class="progress-bar" style="width:${pct(c.id)}%"></div></div><a class="btn btn-primary w-100 mt-3" href="workspace.html?id=${c.id}">${pct(c.id)>0?"Open course":"Start course"} <i class="bi bi-arrow-right ms-1"></i></a>`:`<div class="d-flex justify-content-between align-items-center mt-3"><span class="pill pill-purple">${c.tag}</span><a class="btn btn-light btn-sm" href="course.html?id=${c.id}">View course <i class="bi bi-arrow-up-right ms-1"></i></a></div>`}</div></article>`;

const sideLink = (href, icon, label, key) => `<a class="side-link${document.body.dataset.page===key?" active":""}" href="${href}"${document.body.dataset.page===key?' aria-current="page"':""}><i class="bi ${icon}"></i><span>${label}</span></a>`;

/* ---------- Lesson media (YouTube video + Google Drive PDF/notes) ---------- */
const lessonItem = (cid,i) => (window.LESSON_CONTENT||{})[`${cid}-${i+1}`] || {};
function safeUrl(u){try{const x=new URL(String(u||"").trim());return x.protocol==="https:"?x:null}catch{return null}}

/* ---------- Knowledge Check: data-driven, per-course/lesson ---------- */
// Lesson index helpers (the lesson index `i` is absolute across modules).
const lessonAbsoluteIndex = (course, subjectIdx, lessonIdx) => {
  let n = 0;
  for (let m = 0; m < subjectIdx; m++) n += course.modules[m]?.lessons?.length || 0;
  return n + lessonIdx;
};
const findSubjectForLesson = (course, absIdx) => {
  let n = 0;
  for (let mi = 0; mi < course.modules.length; mi++){
    if (absIdx < n + course.modules[mi].lessons.length) return mi;
    n += course.modules[mi].lessons.length;
  }
  return 0;
};
const lessonCountInModule = (course, mi) => course.modules[mi]?.lessons?.length || 0;
const lessonNameAt = (course, absIdx) => {
  const flat = course.curriculum || [];
  return flat[absIdx] || `Lesson ${absIdx + 1}`;
};

// Question data lookup. Keys in quiz-content.js are 1-indexed to match LESSON_CONTENT.
const getQuizQuestions = (courseId, absIdx) => {
  const key = `${courseId}-${absIdx + 1}`;
  const arr = (window.LESSON_QUIZZES || {})[key] || [];
  return arr.map(q => ({ q: q.q, options: q.options || [], answer: q.answer, explain: q.explain || "" }));
};
const hasQuiz = (courseId, absIdx) => getQuizQuestions(courseId, absIdx).length > 0;

// Per-lesson best score in localStorage; global `ls_bestQuiz` keeps the highest
// percentage across every lesson for backward-compat with the dashboard tile.
const quizBestKey = (courseId, absIdx) => `ls_quizBest_${courseId}_${absIdx}`;
const readQuizBest = (courseId, absIdx) => read(quizBestKey(courseId, absIdx), null);
function writeQuizBest(courseId, absIdx, score, total){
  if (!courseId || !total) return;
  const ratio = score / total;
  const prev = read(quizBestKey(courseId, absIdx), null);
  const prevRatio = prev && prev.total ? prev.score / prev.total : 0;
  if (!prev || ratio > prevRatio) save(quizBestKey(courseId, absIdx), { score, total, when: Date.now() });
  const prevPct = Number(read("ls_bestQuizPct", 0));
  if (ratio * 100 > prevPct) save("ls_bestQuizPct", Math.round(ratio * 100));
  const prevTotal = Number(read("ls_bestQuiz", 0));
  if (score > prevTotal) save("ls_bestQuiz", score); // keep the absolute high score too
}
const readGlobalQuizPct = () => Number(read("ls_bestQuizPct", 0));
function youtubeEmbed(u){const x=safeUrl(u);if(!x)return null;const h=x.hostname.replace(/^www\.|^m\./,"");let id=null;
 if(h==="youtu.be")id=x.pathname.slice(1);else if(h==="youtube.com"||h==="youtube-nocookie.com"){if(x.pathname==="/watch")id=x.searchParams.get("v");else{const m=x.pathname.match(/^\/(embed|shorts|live)\/([\w-]{11})/);if(m)id=m[2]}}
 id=id&&id.match(/^[\w-]{11}/)?.[0];return id?`https://www.youtube-nocookie.com/embed/${id}?rel=0`:null}
function drivePreview(u){const x=safeUrl(u);if(!x||!/(^|\.)google\.com$/.test(x.hostname))return null;const m=x.pathname.match(/\/(file|document|presentation|spreadsheets)\/d\/([\w-]+)/);if(!m)return null;return m[1]==="file"?`https://drive.google.com/file/d/${m[2]}/preview`:`https://docs.google.com/${m[1]}/d/${m[2]}/preview`}
function videoHtml(cid,i,title){const emb=youtubeEmbed(lessonItem(cid,i).video);
 return emb?`<div class="video-stage" style="padding:0"><iframe src="${emb}" title="${escapeHtml(title)}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
 :`<div class="video-stage"><div class="text-center" style="z-index:1"><i class="bi bi-camera-video" style="font-size:3rem;opacity:.8"></i><div class="mt-2 fw-bold">Video coming soon</div><div class="tiny" style="color:#c5cce2">Add a YouTube link for lesson ${i+1} in lesson-content.js</div></div></div>`}
function resourceCard(kind,icon,label,url){const x=safeUrl(url);const prev=drivePreview(url);
 if(!x)return `<div class="panel d-flex align-items-center gap-3 mb-2" style="opacity:.7"><span class="stat-icon"><i class="bi ${icon}"></i></span><div class="flex-grow-1"><div class="fw-bold">${label}</div><div class="tiny muted">Placeholder — link not added yet</div></div><span class="pill">Coming soon</span></div>`;
 return `<div class="panel mb-2"><div class="d-flex align-items-center gap-3"><span class="stat-icon"><i class="bi ${icon}"></i></span><div class="flex-grow-1"><div class="fw-bold">${label}</div><div class="tiny muted">Google Drive</div></div>${prev?`<button class="btn btn-light btn-sm" data-preview="${kind}">Preview</button>`:""}<a class="btn btn-primary btn-sm" href="${escapeHtml(x.href)}" target="_blank" rel="noopener noreferrer">Open <i class="bi bi-box-arrow-up-right ms-1"></i></a></div>${prev?`<iframe data-frame="${kind}" data-src="${prev}" title="${label}" hidden style="width:100%;height:480px;border:1px solid var(--line);border-radius:12px;margin-top:14px" referrerpolicy="no-referrer"></iframe>`:""}</div>`}
function resourcesHtml(cid,i){const it=lessonItem(cid,i);return resourceCard("pdf","bi-file-earmark-pdf","Lesson PDF",it.pdf)+resourceCard("notes","bi-journal-text","Lesson notes",it.notes)}
function wireResources(){$$("[data-preview]").forEach(b=>b.onclick=()=>{const f=$(`[data-frame="${b.dataset.preview}"]`);if(!f)return;if(f.hidden){if(!f.src)f.src=f.dataset.src;f.hidden=false;b.textContent="Hide preview"}else{f.hidden=true;b.textContent="Preview"}})}
function sidebar(){return `<div class="mobile-overlay" id="overlay"></div><aside class="sidebar" id="sidebar"><a class="brand" href="index.html"><span class="brand-mark"><i class="bi bi-compass"></i></span>LearnSphere</a><div class="nav-label">LEARN</div>${sideLink("dashboard.html","bi-grid-1x2","Overview","dashboard")}${sideLink("mycourses.html","bi-collection-play","My courses","mycourses")}${sideLink("courses.html","bi-journal-bookmark","Explore courses","courses")}${sideLink("learn.html","bi-play-circle","Learning room","learn")}${sideLink("notes.html","bi-sticky","My notes","notes")}${sideLink("quiz.html","bi-patch-question","Knowledge check","quiz")}<div class="nav-label">PERSONAL</div>${sideLink("profile.html","bi-person","Profile & settings","profile")}<div class="sidebar-bottom"><div class="mini-plan"><div class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-stars text-primary"></i><strong>Keep your momentum</strong></div><p class="tiny mb-3">A little progress each day adds up.</p><a href="courses.html" class="btn btn-primary btn-sm w-100">Find your next lesson</a></div><a class="side-link" href="index.html"><i class="bi bi-box-arrow-up-right"></i><span>View public site</span></a></div></aside>`}
function topbar(){return `<header class="topbar"><div class="d-flex align-items-center gap-3"><button class="icon-btn mobile-menu" id="menuToggle" aria-label="Open navigation"><i class="bi bi-list"></i></button><div class="searchbox"><i class="bi bi-search muted"></i><input id="globalSearch" aria-label="Search courses" placeholder="Search anything..."></div></div><div class="top-actions"><button class="icon-btn" id="quickNote" title="Quick note" aria-label="Create quick note"><i class="bi bi-pencil-square"></i></button><a href="profile.html" class="d-flex align-items-center gap-2"><span class="avatar" id="topAvatar">LS</span><span class="d-none d-md-block"><strong id="topName">Learner</strong><span class="d-block tiny muted">Learner account</span></span></a><button class="btn btn-light btn-sm" id="logoutBtn" type="button" title="Sign out"><i class="bi bi-box-arrow-right me-1"></i><span class="d-none d-sm-inline">Sign out</span></button></div></header>`}
function shell(content){$("#app").innerHTML=`<div class="app-shell">${sidebar()}<main class="main">${topbar()}<div class="content">${content}</div></main><div class="toast-area" id="toasts" aria-live="polite"></div></div>`;wireCommon();wireLogout();setName();}
function wireLogout(){const b=$("#logoutBtn");if(!b)return;b.addEventListener("click",async()=>{const c=getAuthClient();if(c){const {error}=await c.auth.signOut();if(error){toast("Could not sign out. Please try again.");return}}currentUser=null;authStateToken++;location.href="index.html"})}
function setName(){const p=getProfile();applyNameToUI(p.name||displayNameFromUser(currentUser))}
function toast(msg){let host=$("#toasts");if(!host)return;let el=document.createElement("div");el.className="app-toast";el.textContent=msg;host.append(el);setTimeout(()=>el.remove(),3000)}
function wireCommon(){const menu=$("#menuToggle"),side=$("#sidebar"),overlay=$("#overlay");menu?.addEventListener("click",()=>{side.classList.toggle("open");overlay.classList.toggle("show")});overlay?.addEventListener("click",()=>{side.classList.remove("open");overlay.classList.remove("show")});$("#quickNote")?.addEventListener("click",()=>{const title=prompt("Give your note a title:");if(!title)return;const body=prompt("Write a quick note:");if(!body)return;notes.unshift({id:Date.now(),title,body,course:"Quick note",tag:"Personal",date:"Today"});save("ls_notes",notes);toast("Note saved successfully.");});$("#globalSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter"){location.href="courses.html?q="+encodeURIComponent(e.target.value)}})}
function home(){let featured=courses.slice(0,3);$("#app").innerHTML=`<nav class="home-nav"><a class="brand" href="index.html"><span class="brand-mark"><i class="bi bi-compass"></i></span>LearnSphere</a><div class="home-links"><a href="#courses">Courses</a><a href="#categories">Categories</a><a href="#benefits">Why LearnSphere</a><a class="btn btn-light btn-sm" href="auth.html?mode=login">Log in</a><a class="btn btn-primary" href="auth.html">Get started <i class="bi bi-arrow-up-right ms-1"></i></a></div></nav><section class="hero"><div><span class="eyebrow"><i class="bi bi-stars me-1"></i> Your next chapter starts here</span><h1>Learn something new. <span>Become someone more.</span></h1><p class="hero-copy">Build real skills with thoughtful courses, clear learning paths, and a little momentum every day.</p><div class="d-flex flex-wrap gap-3 mt-4"><a class="btn btn-primary btn-lg" href="courses.html">Explore courses <i class="bi bi-arrow-right ms-2"></i></a><a class="btn btn-light btn-lg" href="dashboard.html"><i class="bi bi-play-circle me-2"></i>Go to dashboard</a></div><div class="d-flex gap-4 mt-4 flex-wrap"><span class="muted"><i class="bi bi-check-circle-fill text-success me-1"></i>Learn at your pace</span><span class="muted"><i class="bi bi-check-circle-fill text-success me-1"></i>Track your progress</span></div></div><div class="hero-art"><div class="hero-orbit"></div><div class="hero-book"><i class="bi bi-journal-richtext"></i><h3 class="mt-3 mb-2">Small steps.<br>Real progress.</h3><p class="tiny mb-3">Your learning journey, all in one place.</p><div class="progress"><div class="progress-bar" style="width:68%"></div></div><div class="d-flex justify-content-between tiny mt-2"><span>Weekly goal</span><strong>68%</strong></div></div><div class="float-chip chip-one"><i class="bi bi-lightning-charge-fill text-warning me-1"></i>Build a daily streak</div><div class="float-chip chip-two"><i class="bi bi-check2-circle text-success me-1"></i>Progress you can see</div></div></section><section class="home-section" id="courses"><div class="section-head"><div><span class="eyebrow">Made for curious minds</span><h2 class="mt-2">Courses worth your time</h2><p class="mb-0">Practical knowledge, taught one clear step at a time.</p></div><a href="courses.html" class="btn btn-light">Browse all courses <i class="bi bi-arrow-right ms-1"></i></a></div><div class="course-grid">${featured.map(c=>card(c)).join("")}</div></section><section class="home-section alt" id="categories"><div class="section-title"><span class="eyebrow">Find your direction</span><h2 class="mt-2">A skill for every next step</h2><p>Start with what interests you. Build toward what matters to you.</p></div><div class="category-grid"><a class="category-tile" href="courses.html?category=Programming"><i class="bi bi-code-slash"></i>Programming</a><a class="category-tile" href="courses.html?category=Mathematics"><i class="bi bi-infinity"></i>Mathematics</a><a class="category-tile" href="courses.html?category=Science"><i class="bi bi-atom"></i>Science</a><a class="category-tile" href="courses.html?category=Design"><i class="bi bi-bezier2"></i>Design</a><a class="category-tile" href="courses.html?category=Technology"><i class="bi bi-cpu"></i>Technology</a></div></section><section class="home-section" id="benefits"><div class="section-title"><span class="eyebrow">Learning, made human</span><h2 class="mt-2">A better way to make progress</h2><p>Everything you need to stay focused, curious, and moving forward.</p></div><div class="benefits-grid"><div class="benefit"><div class="benefit-icon"><i class="bi bi-signpost-split"></i></div><h3>Clear learning paths</h3><p>Know what to learn next with organized lessons and practical course goals.</p></div><div class="benefit"><div class="benefit-icon"><i class="bi bi-graph-up-arrow"></i></div><h3>Progress that motivates</h3><p>See your learning activity, track completion, and celebrate the small wins.</p></div><div class="benefit"><div class="benefit-icon"><i class="bi bi-journal-text"></i></div><h3>Your ideas, kept close</h3><p>Capture notes as you learn and revisit useful ideas whenever you need them.</p></div></div></section><section class="cta-band"><div><h2 class="text-white mb-2">Your next skill is closer than you think.</h2><p class="mb-0">Choose a course and make a start today.</p></div><a href="courses.html" class="btn btn-light">Find your course <i class="bi bi-arrow-right ms-1"></i></a></section><footer class="footer"><a class="brand" href="index.html"><span class="brand-mark"><i class="bi bi-compass"></i></span>LearnSphere</a><span>Thoughtful learning for curious minds.</span><span>© 2026 LearnSphere · Frontend demo</span></footer>`}
function dashboard(){const enrolledCourses=enrolled.map(getCourse);const active=enrolledCourses.filter(c=>pct(c.id)<100);const completedLessons=enrolledCourses.reduce((s,c)=>s+Math.round(c.lessons*pct(c.id)/100),0);const quizBestPct=readGlobalQuizPct();const quizBestScore=Number(read("ls_bestQuiz",0));const recent=read("ls_recent",[]).filter(id=>courses.some(c=>c.id===id)).slice(0,3);const recentCourses=(recent.length?recent:enrolledCourses.slice(0,3).map(c=>c.id)).map(getCourse);const profile=getProfile();const displayName=profile.name||displayNameFromUser(currentUser);const firstName=displayName.split(/\s+/)[0]||"Learner";const avatarInitials=initialsFromName(displayName);const first=active[0]||courses.find(c=>!enrolled.includes(c.id))||courses[0];return `<div class="welcome-row"><div><span class="eyebrow">Your learning space</span><h1 class="mt-2 mb-2">Welcome back, ${escapeHtml(firstName)} <span>👋</span></h1><p class="mb-0">You're building something great. Here's your learning at a glance.</p></div><div class="d-flex align-items-center gap-3"><div class="d-none d-md-block text-end"><strong>${escapeHtml(displayName)}</strong><div class="tiny muted">${escapeHtml(profile.goal||"3 hours per week")} goal</div></div><span class="avatar" style="width:48px;height:48px">${escapeHtml(avatarInitials)}</span></div></div><div class="stat-grid"><div class="stat-card"><div class="stat-top"><span class="muted">Enrolled courses</span><span class="stat-icon"><i class="bi bi-journal-bookmark"></i></span></div><div class="stat-number">${enrolledCourses.length}</div><div class="delta mt-2">Your active learning paths</div></div><div class="stat-card"><div class="stat-top"><span class="muted">Lessons completed</span><span class="stat-icon" style="background:#e9f8f2;color:#16865f"><i class="bi bi-check2-circle"></i></span></div><div class="stat-number">${completedLessons}</div><div class="delta mt-2">Progress across your courses</div></div><div class="stat-card"><div class="stat-top"><span class="muted">Study time</span><span class="stat-icon" style="background:#fff4e7;color:#c0842e"><i class="bi bi-clock-history"></i></span></div><div class="stat-number">12.5<span class="fs-6">h</span></div><div class="muted tiny mt-2">Estimated demo learning time</div></div><div class="stat-card"><div class="stat-top"><span class="muted">Best quiz score</span><span class="stat-icon" style="background:#f8eefa;color:#a35bb5"><i class="bi bi-trophy"></i></span></div><div class="stat-number">${quizBestPct?`${quizBestPct}<span class="fs-6">%</span>`:quizBestScore||0}</div><div class="muted tiny mt-2">${quizBestPct>=100?"Perfect score — excellent work!":quizBestPct?"Best across all knowledge checks":"Take a knowledge check to track your best result"}</div></div></div><div class="dashboard-grid"><div><section class="panel mb-4"><div class="section-head"><div><h2 class="mb-1">Continue learning</h2><p class="mb-0">Pick up right where you left off.</p></div><a href="courses.html" class="fw-bold text-primary">Explore courses <i class="bi bi-arrow-right ms-1"></i></a></div>${active.length?`<div class="course-grid">${active.slice(0,2).map(c=>card(c,true)).join("")}</div>`:`<div class="empty-state"><i class="bi bi-mortarboard"></i><h3 class="mt-3">Ready for a fresh start?</h3><p>Enroll in a course to begin your learning journey.</p><a href="courses.html" class="btn btn-primary">Explore courses</a></div>`}</section><section class="panel mb-4"><div class="section-head"><div><h2 class="mb-1">Weekly study activity</h2><p class="mb-0">Minutes spent learning over the last seven days</p></div><span class="pill pill-green"><i class="bi bi-activity me-1"></i>Weekly overview</span></div><div class="activity-chart"><canvas id="activityChart" role="img" aria-label="Bar chart showing study minutes for the past seven days"></canvas></div></section><section class="panel"><div class="section-head"><div><h2 class="mb-1">Recently accessed</h2><p class="mb-0">Jump back into a course you've visited.</p></div></div>${recentCourses.length?recentCourses.map(c=>`<div class="deadline"><span class="stat-icon"><i class="bi ${c.icon}"></i></span><div class="flex-grow-1"><a class="deadline-title d-block" href="learn.html?id=${c.id}">${c.title}</a><span class="tiny muted">${c.instructor} · ${pct(c.id)}% complete</span></div><a class="icon-btn" href="learn.html?id=${c.id}" aria-label="Resume ${c.title}"><i class="bi bi-arrow-up-right"></i></a></div>`).join(""):`<p class="mb-0">Your recently visited courses will appear here.</p>`}</section></div><div><section class="panel mb-4"><div class="section-head"><div><h2 class="mb-1">Upcoming learning goals</h2><p class="mb-0">Small steps, steady progress.</p></div><i class="bi bi-calendar2-check muted fs-5"></i></div><div class="deadline"><div class="date-tile"><span>Goal</span>01</div><div class="flex-grow-1"><div class="deadline-title">Finish a lesson today</div><div class="tiny muted">A simple way to keep momentum</div></div><span class="pill pill-green">Daily</span></div><div class="deadline"><div class="date-tile"><span>Goal</span>02</div><div class="flex-grow-1"><div class="deadline-title">Reach your weekly study target</div><div class="tiny muted">${escapeHtml(profile.goal||"3 hours per week")}</div></div></div><div class="deadline"><div class="date-tile"><span>Goal</span>03</div><div class="flex-grow-1"><div class="deadline-title">Try a knowledge check</div><div class="tiny muted">Test what you've learned</div></div><a href="quiz.html" class="icon-btn" aria-label="Open the knowledge check"><i class="bi bi-arrow-right"></i></a></div><a href="profile.html" class="fw-bold text-primary d-inline-block mt-3">Edit learning goals <i class="bi bi-arrow-right ms-1"></i></a></section><section class="panel mb-4"><div class="section-head"><h2 class="mb-0">Quick actions</h2><i class="bi bi-lightning-charge text-warning fs-5"></i></div><a href="learn.html?id=${first.id}" class="btn btn-primary w-100 mb-2"><i class="bi bi-play-circle me-2"></i>Resume a lesson</a><a href="courses.html" class="btn btn-light w-100 mb-2"><i class="bi bi-search me-2"></i>Explore courses</a><a href="notes.html" class="btn btn-light w-100"><i class="bi bi-journal-text me-2"></i>Review my notes</a></section><section class="panel"><div class="section-head"><h2 class="mb-0">Learning tip</h2><i class="bi bi-lightbulb text-warning fs-5"></i></div><p class="mb-0">After a lesson, write down one key idea in your own words. That quick recall can help it stick.</p></section></div></div>`}
function catalog(){let q=new URLSearchParams(location.search);return `<div class="welcome-row"><div><span class="eyebrow">Explore your potential</span><h1 class="mt-2 mb-2">Find your next course</h1><p class="mb-0">Build skills with expert-led lessons and practical projects.</p></div><span class="pill">${courses.length} courses to explore</span></div><div class="filters"><input class="filter-input catalog-search" id="courseSearch" placeholder="Search courses or instructors..." value="${(q.get("q")||"").replace(/"/g,"&quot;")}" aria-label="Search courses"><select class="filter-input" id="categoryFilter" aria-label="Filter by category"><option value="">All categories</option>${["Development","Design","Data","Business","Creative","Writing"].map(x=>`<option ${q.get("category")===x?"selected":""}>${x}</option>`).join("")}</select><select class="filter-input" id="levelFilter" aria-label="Filter by difficulty"><option value="">All levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><select class="filter-input" id="sortFilter" aria-label="Sort courses"><option value="featured">Sort: Featured</option><option value="rating">Top rated</option><option value="title">Name A–Z</option><option value="duration">Shortest first</option></select></div><div class="section-head"><h2 class="mb-0" id="resultsCount">All courses</h2><button class="btn btn-light btn-sm" id="resetFilters">Reset filters</button></div><div class="course-grid" id="catalogGrid">${courses.map(c=>card(c)).join("")}</div><div id="catalogEmpty" class="panel empty-state d-none"><i class="bi bi-search"></i><h3 class="mt-3">No courses found</h3><p>Try a different search or remove a filter.</p><button class="btn btn-primary" id="emptyReset">Clear filters</button></div>`}
function courseDetail(){let c=getCourse(new URLSearchParams(location.search).get("id"));const isEnrolled=enrolled.includes(c.id);return `<div class="mb-4"><a href="courses.html" class="muted"><i class="bi bi-arrow-left me-2"></i>Back to courses</a></div><section class="detail-hero"><div><span class="pill pill-purple">${c.category} · ${c.level}</span><h1 class="mt-3 mb-3">${c.title}</h1><p>${c.description}</p><div class="d-flex flex-wrap gap-3 muted mt-3"><span><i class="bi bi-star-fill text-warning me-1"></i>${c.rating} rating</span><span><i class="bi bi-people me-1"></i>${c.students} learners</span><span><i class="bi bi-clock me-1"></i>${c.duration}</span><span><i class="bi bi-play-circle me-1"></i>${c.lessons} lessons</span></div><div class="instructor mt-4"><span class="avatar">${c.instructor.split(" ").map(x=>x[0]).join("")}</span><div><strong class="d-block" style="color:var(--ink)">${c.instructor}</strong><span>Course instructor</span></div></div></div><div class="detail-art ${c.art}"><i class="bi ${c.icon}"></i></div><div><button class="btn ${isEnrolled?"btn-light":"btn-primary"} w-100" id="enrollBtn" data-id="${c.id}">${isEnrolled?'<i class="bi bi-check-circle me-1"></i>Enrolled — continue learning':'Enroll in this course'} ${isEnrolled?'':'<i class="bi bi-arrow-right ms-1"></i>'}</button>${isEnrolled?`<button class="btn btn-outline-danger w-100 mt-2" id="unenrollBtn" data-id="${c.id}">Unenroll from course</button>`:""}<p class="tiny text-center mt-3 mb-0"><i class="bi bi-infinity me-1"></i>Learn at your own pace · Progress saved on this device</p></div></section><div class="dashboard-grid"><section class="panel"><h2>What you'll learn</h2><div class="row g-3 mt-1">${c.outcomes.map(o=>`<div class="col-md-6"><div class="d-flex gap-2"><i class="bi bi-check-circle-fill text-success mt-1"></i><span>${o}</span></div></div>`).join("")}</div><hr class="my-4"><h2>Course curriculum</h2><p>Explore the modules and lessons included in this course.</p>${c.modules.map((m,mi)=>`<div class="mt-4"><div class="d-flex align-items-center gap-2 mb-2"><span class="lesson-num">${String(mi+1).padStart(2,"0")}</span><h3 class="mb-0">${m.title}</h3><span class="tiny muted ms-auto">${m.lessons.length} lessons</span></div>${m.lessons.map((l,li)=>{let n=c.modules.slice(0,mi).reduce((sum,x)=>sum+x.lessons.length,0)+li+1;return `<div class="curriculum-item"><span class="lesson-num"><i class="bi bi-play-fill"></i></span><div class="flex-grow-1"><strong>${l}</strong><div class="tiny muted">Lesson ${n} · ${6+n*2} min</div></div><i class="bi bi-lock muted"></i></div>`}).join("")}</div>`).join("")}</section><aside><section class="panel mb-3"><h3>About this course</h3><div class="d-flex justify-content-between py-2"><span class="muted">Level</span><strong>${c.level}</strong></div><div class="d-flex justify-content-between py-2"><span class="muted">Lessons</span><strong>${c.lessons}</strong></div><div class="d-flex justify-content-between py-2"><span class="muted">Duration</span><strong>${c.duration}</strong></div><div class="d-flex justify-content-between py-2"><span class="muted">Your progress</span><strong>${pct(c.id)}%</strong></div><div class="progress mt-2"><div class="progress-bar" style="width:${pct(c.id)}%"></div></div></section><section class="panel"><h3>Make it stick</h3><p class="mb-0">Take notes as you go and revisit useful ideas before moving to the next lesson.</p><a href="notes.html" class="fw-bold text-primary d-inline-block mt-3">Open notes <i class="bi bi-arrow-right ms-1"></i></a></section></aside></div>`}
function learn(){let c=getCourse(new URLSearchParams(location.search).get("id"));let lessons=c.curriculum;return `<div class="welcome-row"><div><a href="course.html?id=${c.id}" class="muted tiny"><i class="bi bi-arrow-left me-1"></i>${c.title}</a><h1 class="mt-2 mb-1">Learning room</h1><p class="mb-0">Lesson ${currentLesson+1} of ${lessons.length} · ${lessons[currentLesson]}</p></div><span class="pill pill-purple">${pct(c.id)}% complete</span></div><div class="learning-layout"><div><div id="lessonVideo">${videoHtml(c.id,currentLesson,lessons[currentLesson])}</div><div class="d-flex justify-content-between align-items-center mt-3 gap-2 flex-wrap"><button class="btn btn-light" id="prevLesson" ${currentLesson===0?"disabled":""}><i class="bi bi-arrow-left me-1"></i>Previous</button><button class="btn btn-light" id="playLesson"><i class="bi bi-check2-circle me-1"></i>Mark complete</button><button class="btn btn-primary" id="nextLesson">${currentLesson===lessons.length-1?"Finish course":"Next lesson"} <i class="bi bi-arrow-right ms-1"></i></button></div><section class="mt-4"><h2 class="mb-3">Lesson resources</h2><div id="lessonResources">${resourcesHtml(c.id,currentLesson)}</div></section><section class="panel mt-4"><div class="section-head"><div><h2 class="mb-1">Lesson notes</h2><p class="mb-0">Capture an idea before it slips away.</p></div><i class="bi bi-journal-text fs-5 text-primary"></i></div><textarea id="lessonNote" class="form-control" rows="4" placeholder="What stood out to you in this lesson?"></textarea><div class="d-flex justify-content-end mt-3"><button class="btn btn-light" id="saveLessonNote"><i class="bi bi-bookmark me-1"></i>Save note</button></div></section></div><aside class="panel"><div class="section-head"><div><h2 class="mb-1">Course content</h2><p class="mb-0">${lessons.length} lessons · ${c.duration}</p></div><i class="bi bi-list-task fs-5 muted"></i></div><div class="progress mb-3"><div class="progress-bar" style="width:${pct(c.id)}%"></div></div><div class="d-flex justify-content-between tiny muted mb-3"><span>Course progress</span><strong>${pct(c.id)}%</strong></div><div class="lesson-list">${lessons.map((l,i)=>`<div class="lesson-row ${i===currentLesson?"active":""}" data-lesson="${i}" tabindex="0" role="button" aria-label="Open lesson ${i+1}: ${l}"><i class="bi ${i<Math.round(lessons.length*pct(c.id)/100)?"bi-check-circle-fill text-success":"bi-play-circle"}"></i><div><div class="lesson-name">${i+1}. ${l}</div><div class="tiny muted">${6+i*2} min</div></div></div>`).join("")}</div><a href="quiz.html?course=${c.id}&lesson=${currentLesson}" class="btn btn-light w-100 mt-3"><i class="bi bi-patch-question me-1"></i>Take knowledge check</a></aside></div>`}
function quiz(){
  const params = new URLSearchParams(location.search);
  const courseId = params.get("course");
  let subjectParam = params.get("subject");
  let lessonParam = params.get("lesson");
  const course = courseId ? getCourse(courseId) : null;
  if (!course) return quizCoursePicker();
  // If the user lands with only a course+lesson (no subject), infer the subject.
  if (lessonParam != null && subjectParam == null) subjectParam = String(findSubjectForLesson(course, Number(lessonParam)));
  if (subjectParam == null) return quizSubjectPicker(course);
  if (lessonParam == null) return quizLessonPicker(course, Number(subjectParam));
  return quizRunner(course, Number(subjectParam), Number(lessonParam));
}

function quizCoursePicker(){
  return `<div class="welcome-row"><div><span class="eyebrow">Check your understanding</span><h1 class="mt-2 mb-2">Pick a course</h1><p class="mb-0">Start by choosing a course, then drill into the subject and lesson you'd like to test yourself on.</p></div><span class="pill">${courses.length} courses available</span></div>
<div class="course-grid">${courses.map(c => {
  const isEnrolled = enrolled.includes(c.id);
  return `<article class="course-card">${art(c)}<div class="course-body">
    <div class="course-meta"><span>${c.duration} · ${c.lessons} lessons</span><span><i class="bi bi-star-fill text-warning"></i> ${c.rating}</span></div>
    <a href="course.html?id=${c.id}" class="course-title d-block">${escapeHtml(c.title)}</a>
    <p class="tiny mb-3">${escapeHtml(c.description)}</p>
    <p class="instructor mb-0"><span class="avatar" style="width:27px;height:27px;font-size:.65rem">${c.instructor.split(" ").map(x=>x[0]).join("")}</span>${escapeHtml(c.instructor)}</p>
    <div class="d-flex justify-content-between align-items-center mt-3"><span class="pill ${isEnrolled?"pill-green":"pill-purple"}">${isEnrolled?"Enrolled":c.tag}</span><button class="btn btn-primary btn-sm" data-pick-course="${c.id}">Choose <i class="bi bi-arrow-right ms-1"></i></button></div>
  </div></article>`;
}).join("")}</div>`;
}

function quizSubjectPicker(course){
  return `<div class="mb-3"><a href="quiz.html" class="muted"><i class="bi bi-arrow-left me-2"></i>All courses</a></div>
<div class="welcome-row"><div><span class="pill pill-purple">${escapeHtml(course.category)} · ${escapeHtml(course.level)}</span><h1 class="mt-2 mb-1">${escapeHtml(course.title)}</h1><p class="mb-0">Pick a subject to test your understanding.</p></div><span class="pill">${course.modules.length} subjects · ${course.curriculum.length} lessons</span></div>
<div class="dashboard-grid"><div>${course.modules.map((m, mi) => {
  const ready = m.lessons.some((_, li) => hasQuiz(course.id, lessonAbsoluteIndex(course, mi, li)));
  return `<section class="panel mb-3">
    <div class="section-head"><div><span class="eyebrow">Subject ${mi+1}</span><h2 class="mb-0 mt-1">${escapeHtml(m.title)}</h2><p class="tiny mb-0">${m.lessons.length} lesson${m.lessons.length===1?"":"s"}</p></div><span class="pill ${ready?"pill-green":""}">${ready?"Quiz ready":"Coming soon"}</span></div>
    <p class="tiny mb-3">${m.lessons.slice(0,3).map(l => escapeHtml(l)).join(" · ")}${m.lessons.length>3?` · +${m.lessons.length-3} more`:""}</p>
    <button class="btn btn-primary btn-sm" data-pick-subject="${mi}" ${ready?"":"disabled"}>${ready?"Pick a lesson <i class=\"bi bi-arrow-right ms-1\"></i>":"Questions coming soon"}</button>
  </section>`;
}).join("")}</div></div>`;
}

function quizLessonPicker(course, subjectIdx){
  const m = course.modules[subjectIdx];
  if (!m) return quizSubjectPicker(course);
  return `<div class="mb-3"><a href="quiz.html?course=${course.id}" class="muted"><i class="bi bi-arrow-left me-2"></i>${escapeHtml(course.title)}</a></div>
<div class="welcome-row"><div><span class="eyebrow">Subject ${subjectIdx+1}</span><h1 class="mt-2 mb-1">${escapeHtml(m.title)}</h1><p class="mb-0">Pick a lesson to test your understanding.</p></div><span class="pill">${m.lessons.length} lesson${m.lessons.length===1?"":"s"}</span></div>
<div class="dashboard-grid"><div>${m.lessons.map((l, li) => {
  const absIdx = lessonAbsoluteIndex(course, subjectIdx, li);
  const ready = hasQuiz(course.id, absIdx);
  const best = readQuizBest(course.id, absIdx);
  return `<div class="curriculum-item">
    <span class="lesson-num">${li+1}</span>
    <div class="flex-grow-1">
      <div class="fw-bold">${escapeHtml(l)}</div>
      ${ready?`<div class="tiny muted">Quiz ready${best?` · best ${best.score}/${best.total}`:""}</div>`:`<div class="tiny muted">Questions coming soon</div>`}
    </div>
    <button class="btn btn-${ready?"primary":"light"} btn-sm" data-pick-lesson="${li}" ${ready?"":"disabled"}>${ready?"Start <i class=\"bi bi-arrow-right ms-1\"></i>":"Coming soon"}</button>
  </div>`;
}).join("")}</div></div>`;
}

function quizRunner(course, subjectIdx, lessonIdx){
  const absIdx = lessonAbsoluteIndex(course, subjectIdx, lessonIdx);
  const lessonName = course.modules[subjectIdx]?.lessons?.[lessonIdx] || lessonNameAt(course, absIdx);
  const questions = getQuizQuestions(course.id, absIdx);
  const best = readQuizBest(course.id, absIdx);
  const total = questions.length;
  if (!total) {
    return `<div class="mb-3"><a href="quiz.html?course=${course.id}&subject=${subjectIdx}" class="muted"><i class="bi bi-arrow-left me-2"></i>${escapeHtml(course.modules[subjectIdx]?.title || "Lessons")}</a></div>
<section class="panel"><div class="empty-state"><i class="bi bi-patch-question"></i><h3 class="mt-3">Questions coming soon</h3><p>We're still writing questions for <strong>${escapeHtml(lessonName)}</strong>. In the meantime, you can pick another lesson or revisit the course material.</p><a href="quiz.html?course=${course.id}&subject=${subjectIdx}" class="btn btn-primary">Pick another lesson</a></div></section>`;
  }
  return `<div class="mb-3"><a href="quiz.html?course=${course.id}&subject=${subjectIdx}" class="muted"><i class="bi bi-arrow-left me-2"></i>${escapeHtml(course.modules[subjectIdx]?.title || "Lessons")}</a></div>
<div class="welcome-row"><div><span class="eyebrow">${escapeHtml(course.title)} · Subject ${subjectIdx+1}</span><h1 class="mt-2 mb-2">${escapeHtml(lessonName)} — Knowledge check</h1><p class="mb-0">${total} question${total===1?"":"s"} · Learn from every answer.</p></div><div class="pill pill-amber" id="timerLabel"><i class="bi bi-clock me-1"></i>Timer off</div></div>
<div class="dashboard-grid"><section class="panel">
<div class="d-flex justify-content-between align-items-center mb-4">
  <span class="pill pill-purple">${total} question${total===1?"":"s"}</span>
  <label class="d-flex align-items-center gap-2 tiny muted"><input type="checkbox" id="timerToggle" style="accent-color:var(--primary)"> Enable 5-minute timer</label>
</div>
<form id="quizForm" data-course="${course.id}" data-lesson="${absIdx}">
  <div id="quizQuestions">${questions.map((q, i) => `<div class="mb-4 quiz-question" data-answer="${q.answer}" data-explain="${escapeHtml(q.explain)}">
    <h3 class="mb-3">${i+1}. ${escapeHtml(q.q)}</h3>
    ${q.options.map((a, j) => `<label class="quiz-option"><input type="radio" name="q${i}" value="${j}"><span>${escapeHtml(a)}</span></label>`).join("")}
    <div class="feedback tiny mt-2" aria-live="polite"></div>
  </div>`).join("")}</div>
  <button type="submit" class="btn btn-primary" id="submitQuiz">Submit answers <i class="bi bi-arrow-right ms-1"></i></button>
  <button type="button" class="btn btn-light ms-2 d-none" id="retryQuiz">Try again</button>
</form>
</section>
<aside>
  <section class="panel mb-3"><div class="stat-icon mb-3"><i class="bi bi-lightbulb"></i></div>
    <h3>Make the most of a quiz</h3>
    <p>Answer from memory first. Review any missed concept, then try again when you're ready.</p>
    <hr>
    <div class="d-flex justify-content-between mb-2"><span class="muted">Your best on this lesson</span><strong id="bestScore">${best?`${best.score} / ${best.total}`:`0 / ${total}`}</strong></div>
  </section>
  <section class="panel"><h3>Need a quick review?</h3>
    <p>Revisit the course lessons or check your saved notes.</p>
    <a href="learn.html?id=${course.id}&lesson=${absIdx}" class="btn btn-light w-100 mb-2">Review lesson</a>
    <a href="notes.html" class="btn btn-light w-100">Open notes</a>
  </section>
</aside></div>`;
}
function notesPage(){return `<div class="welcome-row"><div><span class="eyebrow">Your personal knowledge base</span><h1 class="mt-2 mb-2">My notes</h1><p class="mb-0">Useful ideas, saved in one place.</p></div><button class="btn btn-primary" id="newNote"><i class="bi bi-plus-lg me-1"></i>New note</button></div><div class="filters"><input id="noteSearch" class="filter-input catalog-search" placeholder="Search notes, courses, or keywords..." aria-label="Search notes"><select id="noteTag" class="filter-input" aria-label="Filter notes by topic"><option value="">All topics</option>${[...new Set(notes.map(n=>n.tag))].map(t=>`<option>${t}</option>`).join("")}</select><span class="pill">${notes.length} saved notes</span></div><div class="course-grid" id="notesGrid"></div><div class="panel empty-state d-none" id="notesEmpty"><i class="bi bi-journal-x"></i><h3 class="mt-3">No notes match that search</h3><p>Try another keyword or create a new note.</p><button class="btn btn-primary" id="noteEmptyNew">Create a note</button></div>`}
function renderNotes(){let q=($("#noteSearch")?.value||"").toLowerCase(),tag=$("#noteTag")?.value||"";let filtered=notes.filter(n=>(!tag||n.tag===tag)&&`${n.title} ${n.body} ${n.course} ${n.tag}`.toLowerCase().includes(q));let grid=$("#notesGrid");if(!grid)return;grid.innerHTML=filtered.map(n=>`<article class="note-card"><div class="d-flex justify-content-between"><span class="note-tag">${n.tag}</span><button class="icon-btn" data-delete-note="${n.id}" aria-label="Delete ${n.title}"><i class="bi bi-trash3"></i></button></div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p><div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top"><span class="tiny muted">${escapeHtml(n.course)}</span><span class="tiny muted">${n.date}</span></div><button class="btn btn-light btn-sm mt-3" data-edit-note="${n.id}"><i class="bi bi-pencil me-1"></i>Edit note</button></article>`).join("");$("#notesEmpty")?.classList.toggle("d-none",filtered.length>0);$$("[data-delete-note]",grid).forEach(b=>b.onclick=()=>{if(confirm("Delete this note?")){notes=notes.filter(n=>n.id!==Number(b.dataset.deleteNote));save("ls_notes",notes);renderNotes();toast("Note deleted.")}});$$("[data-edit-note]",grid).forEach(b=>b.onclick=()=>{let n=notes.find(x=>x.id===Number(b.dataset.editNote));editNote(n)})}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function editNote(existing){let title=prompt("Note title:",existing?.title||"");if(title===null)return;let body=prompt("Note content:",existing?.body||"");if(body===null)return;if(!title.trim()||!body.trim()){toast("Add a title and some note content.");return}if(existing){existing.title=title;existing.body=body;existing.date="Today"}else notes.unshift({id:Date.now(),title,body,course:"Personal note",tag:"Personal",date:"Today"});save("ls_notes",notes);renderNotes();toast(existing?"Note updated.":"Note saved.")}
function profilePage(){const p=getProfile();const displayName=p.name||displayNameFromUser(currentUser);const avatarInitials=initialsFromName(displayName);const email=p.email||emailFromUser(currentUser);return `<div class="welcome-row"><div><span class="eyebrow">Make this space yours</span><h1 class="mt-2 mb-2">Profile & settings</h1><p class="mb-0">Manage your learner profile and preferences.</p></div></div><div class="profile-layout"><section class="panel"><div class="text-center py-3"><div class="avatar mx-auto mb-3" style="width:76px;height:76px;font-size:1.4rem" id="profileAvatar">${escapeHtml(avatarInitials)}</div><h3 class="mb-1" id="profileDisplayName">${escapeHtml(displayName)}</h3><p class="tiny mb-3">${escapeHtml(email)}</p><span class="pill pill-green">Learner account</span></div><hr><div class="profile-menu"><a href="#personal" class="active"><i class="bi bi-person"></i>Personal information</a><a href="#preferences"><i class="bi bi-sliders"></i>Learning preferences</a><a href="#data"><i class="bi bi-database"></i>Local data</a></div></section><div><form class="panel mb-4" id="profileForm"><h2 id="personal">Personal information</h2><p>${currentUser?`Signed in as <strong>${escapeHtml(email)}</strong>. Your display name is editable; the sign-in email is managed by your account.`:"These details are stored in this browser only."}</p><div class="row g-3 mt-1"><div class="col-md-6"><label class="form-label" for="fullName">Full name</label><input class="form-control" id="fullName" required maxlength="80" value="${escapeHtml(displayName)}"></div><div class="col-md-6"><label class="form-label" for="email">Email address</label><input class="form-control" id="email" type="email" required value="${escapeHtml(email)}" ${currentUser?"readonly":""}></div><div class="col-12"><label class="form-label" for="bio">About you</label><textarea class="form-control" id="bio" rows="3" maxlength="240">${escapeHtml(p.bio||"")}</textarea></div></div><hr class="my-4"><h2 id="preferences">Learning preferences</h2><div class="mt-3"><label class="form-label" for="goal">Weekly learning goal</label><select class="form-select" id="goal"><option ${p.goal==="1 hour per week"?"selected":""}>1 hour per week</option><option ${p.goal==="3 hours per week"?"selected":""}>3 hours per week</option><option ${p.goal==="5 hours per week"?"selected":""}>5 hours per week</option><option ${p.goal==="7 hours per week"?"selected":""}>7 hours per week</option></select></div><div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="updates" ${p.updates?"checked":""}><label class="form-check-label" for="updates">Show learning tips and reminders in my dashboard</label></div><div class="d-flex justify-content-end mt-4"><button class="btn btn-primary" type="submit"><i class="bi bi-check2 me-1"></i>Save changes</button></div></form><section class="panel" id="data"><h2>My data</h2><p>${currentUser?"Your personal learning data is stored in Supabase for this account, with a separate browser cache.":"Demo data is stored in this browser until Supabase authentication is configured."}</p><div class="d-flex flex-wrap gap-2"><button class="btn btn-light" id="exportData"><i class="bi bi-download me-1"></i>Export my data</button><button class="btn btn-outline-primary" id="retryCloudSave"><i class="bi bi-cloud-arrow-up me-1"></i>Retry cloud sync</button><button class="btn btn-outline-danger" id="resetData"><i class="bi bi-trash3 me-1"></i>Reset my data</button></div></section></div></div>`}
function initChart(){let canvas=$("#activityChart");if(!canvas||!window.Chart)return;new Chart(canvas,{type:"bar",data:{labels:["Wed","Thu","Fri","Sat","Sun","Mon","Tue"],datasets:[{label:"Minutes learned",data:[25,45,30,65,40,55,35],backgroundColor:"#7778ea",borderRadius:7,maxBarThickness:26}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} minutes`}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:"#8b94aa"}},y:{beginAtZero:true,grid:{color:"#eff0f6"},border:{display:false},ticks:{stepSize:20,color:"#8b94aa",callback:v=>v+"m"}}}}})}
function wireCatalog(){const search=$("#courseSearch"),cat=$("#categoryFilter"),level=$("#levelFilter"),sort=$("#sortFilter");function update(){let list=courses.filter(c=>(`${c.title} ${c.instructor} ${c.category}`.toLowerCase().includes(search.value.toLowerCase()))&&(!cat.value||c.category===cat.value)&&(!level.value||c.level===level.value));if(sort.value==="rating")list.sort((a,b)=>Number(b.rating)-Number(a.rating));if(sort.value==="title")list.sort((a,b)=>a.title.localeCompare(b.title));if(sort.value==="duration")list.sort((a,b)=>a.minutes-b.minutes);$("#catalogGrid").innerHTML=list.map(c=>card(c,enrolled.includes(c.id))).join("");$("#resultsCount").textContent=`${list.length} course${list.length===1?"":"s"} found`;$("#catalogEmpty").classList.toggle("d-none",list.length!==0);$("#catalogGrid").classList.toggle("d-none",list.length===0);$("#emptyReset").onclick=reset}function reset(){search.value="";cat.value="";level.value="";sort.value="featured";update()}[search,cat,level,sort].forEach(el=>el.addEventListener(el===search?"input":"change",update));$("#resetFilters").onclick=reset;$("#emptyReset")?.addEventListener("click",reset);update()}
function wireCourse(){let b=$("#enrollBtn");if(b)b.onclick=()=>{let id=b.dataset.id;if(!enrolled.includes(id)){enrolled.push(id);save("ls_enrolled",enrolled);toast("You're enrolled! Your course is ready.");location.href="workspace.html?id="+id}else location.href="workspace.html?id="+id};let ub=$("#unenrollBtn");if(ub)ub.onclick=()=>{let id=ub.dataset.id,c=getCourse(id);if(confirm(`Unenroll from "${c.title}"? Your saved progress will be kept in case you enroll again.`)){save("ls_enrolled",enrolled.filter(x=>x!==id));toast("You have been unenrolled. Saved progress was kept.");location.href="dashboard.html"}}}
function wireLearn(){let c=getCourse(new URLSearchParams(location.search).get("id"));let lessons=c.curriculum;function refresh(){let page=$("#app");let scroll=window.scrollY; // update lesson labels without replacing the DOM
let title=$(".welcome-row p");if(title)title.textContent=`Lesson ${currentLesson+1} of ${lessons.length} · ${lessons[currentLesson]}`;$("#lessonVideo").innerHTML=videoHtml(c.id,currentLesson,lessons[currentLesson]);$("#lessonResources").innerHTML=resourcesHtml(c.id,currentLesson);wireResources();$$(".lesson-row").forEach((r,i)=>r.classList.toggle("active",i===currentLesson));$("#prevLesson").disabled=currentLesson===0;$("#nextLesson").innerHTML=`${currentLesson===lessons.length-1?"Finish course":"Next lesson"} <i class="bi bi-arrow-right ms-1"></i>`;window.scrollTo(0,scroll)}
function complete(){markDone(c.id,currentLesson);let amount=Math.min(100,Math.max(pct(c.id),Math.round((currentLesson+1)/lessons.length*100)));progress[c.id]=amount;save("ls_progress",progress);toast("Lesson marked complete.");let pill=$(".welcome-row .pill");if(pill)pill.textContent=amount+"% complete";let bar=$(".learning-layout aside .progress-bar");if(bar)bar.style.width=amount+"%";let p=$(".learning-layout aside .d-flex.justify-content-between.tiny strong");if(p)p.textContent=amount+"%";let row=$$("[data-lesson]")[currentLesson];if(row)row.querySelector("i").className="bi bi-check-circle-fill text-success"}
$("#playLesson").onclick=complete;$("#nextLesson").onclick=()=>{complete();if(currentLesson<lessons.length-1){currentLesson++;refresh()}else{progress[c.id]=100;save("ls_progress",progress);toast("Course completed. Great work!");location.href="dashboard.html"}};$("#prevLesson").onclick=()=>{if(currentLesson>0){currentLesson--;refresh()}};$$("[data-lesson]").forEach(el=>{const go=()=>{currentLesson=Number(el.dataset.lesson);refresh()};el.onclick=go;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}}});$("#saveLessonNote").onclick=()=>{let body=$("#lessonNote").value.trim();if(!body){toast("Write a note before saving.");return}notes.unshift({id:Date.now(),title:lessons[currentLesson],course:c.title,tag:c.category,body,date:"Today"});save("ls_notes",notes);$("#lessonNote").value="";toast("Lesson note saved.")}}
function wireQuiz(){
  // ---- Selection flow (Course → Subject → Lesson) ----
  $$("[data-pick-course]").forEach(b => b.onclick = () => navigateQuiz(b.dataset.pickCourse, null, null));
  $$("[data-pick-subject]").forEach(b => b.onclick = () => {
    if (b.disabled) return;
    const params = new URLSearchParams(location.search);
    navigateQuiz(params.get("course"), Number(b.dataset.pickSubject), null);
  });
  $$("[data-pick-lesson]").forEach(b => b.onclick = () => {
    if (b.disabled) return;
    const params = new URLSearchParams(location.search);
    navigateQuiz(params.get("course"), Number(params.get("subject")), Number(b.dataset.pickLesson));
  });
  // Browser back/forward should re-render the content area too.
  window.addEventListener("popstate", renderQuizContent, { once: false });

  // ---- Quiz form ----
  const form = $("#quizForm");
  if (!form) return;
  const courseId = form.dataset.course;
  const lessonIdx = Number(form.dataset.lesson);
  const questions = $$(".quiz-question");
  const total = questions.length;
  function stopTimer(){ if (quizTimer){ clearInterval(quizTimer); quizTimer = null } }
  function updateTimer(){
    const m = Math.floor(secondsLeft/60), s = secondsLeft%60;
    const lbl = $("#timerLabel"); if (lbl) lbl.innerHTML = `<i class="bi bi-clock me-1"></i>${m}:${String(s).padStart(2,"0")} remaining`;
  }
  const timerToggle = $("#timerToggle");
  if (timerToggle) timerToggle.onchange = e => {
    if (e.target.checked){
      secondsLeft = 300; updateTimer();
      quizTimer = setInterval(() => {
        secondsLeft--; updateTimer();
        if (secondsLeft <= 0){ stopTimer(); submit() }
      }, 1000);
    } else { stopTimer(); const lbl=$("#timerLabel"); if (lbl) lbl.innerHTML = '<i class="bi bi-clock me-1"></i>Timer off'; }
  };
  function submit(){
    if (quizSubmitted) return;
    quizSubmitted = true; stopTimer();
    let score = 0;
    questions.forEach((q) => {
      const correct = Number(q.dataset.answer);
      const chosen = q.querySelector("input:checked");
      const feedback = q.querySelector(".feedback");
      const explain = q.dataset.explain || "";
      if (chosen && Number(chosen.value) === correct){
        score++;
        if (feedback){ feedback.textContent = "Correct — nice work!" + (explain ? " " + explain : ""); feedback.style.color = "var(--green)"; }
      } else {
        const answer = q.querySelectorAll(".quiz-option")[correct];
        const correctText = answer ? (answer.querySelector("span")?.textContent || answer.textContent || "").trim() : "";
        if (feedback){
          feedback.textContent = "Correct answer: " + correctText + (explain ? " — " + explain : "");
          feedback.style.color = "#bd7b25";
        }
      }
      q.querySelectorAll("input").forEach(i => i.disabled = true);
    });
    writeQuizBest(courseId, lessonIdx, score, total);
    // Keep an immutable attempt history in addition to the best-score summary.
    const attemptUserId = currentUser?.id;
    const attemptClient = getAuthClient();
    if (attemptUserId && attemptClient) {
      const selectedAnswers = questions.map((q, index) => {
        const selected = q.querySelector("input:checked");
        return { question_index: index, selected_option: selected ? Number(selected.value) : null, correct_option: Number(q.dataset.answer) };
      });
      attemptClient.from("quiz_attempts").insert({
        user_id: attemptUserId, course_id: courseId, lesson_index: lessonIdx,
        score, max_score: total, correct_count: score, incorrect_count: total - score,
        answers: selectedAnswers, completed_at: new Date().toISOString()
      }).then(({error}) => {
        if (error) {
          console.error("Quiz attempt cloud save failed:", error);
          toast("Score shown, but the attempt could not be saved to your account. Check the database migration and retry.");
        }
      });
    }
    const updated = readQuizBest(courseId, lessonIdx);
    const bestEl = $("#bestScore");
    if (bestEl) bestEl.textContent = updated ? `${updated.score} / ${updated.total}` : `${score} / ${total}`;
    const submitBtn = $("#submitQuiz"), retryBtn = $("#retryQuiz");
    if (submitBtn) submitBtn.classList.add("d-none");
    if (retryBtn) retryBtn.classList.remove("d-none");
    toast(`Quiz complete: ${score} out of ${total}.`);
    const result = document.createElement("div");
    result.className = "panel mb-4";
    result.innerHTML = `<div class="d-flex gap-3 align-items-center"><div class="stat-icon"><i class="bi bi-trophy"></i></div><div><h2 class="mb-1">You scored ${score} / ${total}</h2><p class="mb-0">${score === total ? "Excellent work — perfect score!" : score >= Math.ceil(total/2) ? "Good progress. Review the explanations for anything you missed." : "Keep going. Every attempt is practice."}</p></div></div>`;
    form.prepend(result);
  }
  form.onsubmit = e => { e.preventDefault(); submit() };
  const retry = $("#retryQuiz");
  if (retry) retry.onclick = () => {
    stopTimer(); secondsLeft = 300; quizSubmitted = false;
    form.reset();
    $$(".feedback").forEach(f => f.textContent = "");
    questions.forEach(q => q.querySelectorAll("input").forEach(i => i.disabled = false));
    const prior = form.querySelector(".panel.mb-4"); if (prior) prior.remove();
    const submitBtn = $("#submitQuiz"), retryBtn = $("#retryQuiz"), label = $("#timerLabel");
    if (submitBtn) submitBtn.classList.remove("d-none");
    if (retryBtn) retryBtn.classList.add("d-none");
    if (label) label.innerHTML = '<i class="bi bi-clock me-1"></i>Timer off';
    if (timerToggle) timerToggle.checked = false;
  };
}

function navigateQuiz(courseId, subjectIdx, lessonIdx){
  const params = new URLSearchParams();
  if (courseId) params.set("course", courseId);
  if (subjectIdx != null) params.set("subject", String(subjectIdx));
  if (lessonIdx != null) params.set("lesson", String(lessonIdx));
  const qs = params.toString();
  const url = location.pathname + (qs ? "?" + qs : "");
  history.pushState(null, "", url);
  // Reset transient quiz state when switching between lessons.
  quizSubmitted = false; secondsLeft = 300;
  if (quizTimer){ clearInterval(quizTimer); quizTimer = null }
  renderQuizContent();
}

function renderQuizContent(){
  const contentEl = $(".content");
  if (contentEl) contentEl.innerHTML = quiz();
  wireQuiz();
}
function wireNotes(){renderNotes();$("#noteSearch").oninput=renderNotes;$("#noteTag").onchange=renderNotes;$("#newNote").onclick=()=>editNote();$("#noteEmptyNew").onclick=()=>editNote()}
function wireProfile(){const retryButton=$("#retryCloudSave");if(retryButton)retryButton.onclick=async()=>{if(!currentUser?.id){toast("Sign in to sync data to Supabase.");return}const c=getAuthClient();if(!c){toast("Supabase is not configured.");return}retryButton.disabled=true;try{const {error}=await c.from("user_learning_state").upsert({user_id:currentUser.id,state:remoteState,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;persistenceError=null;toast("Your learning data synced successfully.")}catch(err){console.error(err);toast("Cloud sync still failed. Check the migration and your connection.")}finally{retryButton.disabled=false}};let form=$("#profileForm");form.onsubmit=e=>{e.preventDefault();let p={name:$("#fullName").value.trim(),email:$("#email").value.trim(),bio:$("#bio").value.trim(),goal:$("#goal").value,updates:$("#updates").checked};if(currentUser&&!p.email)p.email=emailFromUser(currentUser);saveProfile(p);setName();$("#profileDisplayName").textContent=p.name;$("#profileAvatar").textContent=initialsFromName(p.name);toast("Your settings have been saved.")};$("#exportData").onclick=()=>{let data=exportableData();let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="learnsphere-data.json";a.click();URL.revokeObjectURL(url);toast("Your data export is ready.")};$("#resetData").onclick=()=>{if(confirm("Reset this account's LearnSphere data? This cannot be undone.")){const prefix=currentUser?.id?`ls_${currentUser.id}_`:"ls_demo_";const keys=Object.keys(localStorage).filter(k=>k.startsWith(prefix));keys.forEach(k=>localStorage.removeItem(k));if(currentUser?.id){const c=getAuthClient();c?.from("user_learning_state").delete().eq("user_id",currentUser.id).then(({error})=>{if(error){toast("Cloud data could not be reset.");return}location.reload()})}else location.reload()}}}

/* ---------- My courses + course workspace ---------- */
const doneMap = () => read("ls_done", {});
const totalLessons = c => c.curriculum.length;
function markDone(id, idx, on=true){const m=doneMap();const set=new Set(m[id]||[]);on?set.add(idx):set.delete(idx);m[id]=[...set].sort((a,b)=>a-b);save("ls_done",m);const c=getCourse(id);progress[id]=Math.round(set.size/totalLessons(c)*100);save("ls_progress",progress)}
function myCourses(){const list=enrolled.map(getCourse);const avg=list.length?Math.round(list.reduce((s,c)=>s+pct(c.id),0)/list.length):0;
return `<div class="welcome-row"><div><span class="eyebrow">Your library</span><h1 class="mt-2 mb-2">My courses</h1><p class="mb-0">Everything you're enrolled in, in one place.</p></div><div class="d-flex gap-2 align-items-center"><span class="pill pill-purple">${list.length} enrolled</span><span class="pill pill-green">${avg}% average progress</span></div></div>${list.length?`<div class="course-grid">${list.map(c=>card(c,true)).join("")}</div>`:`<section class="panel"><div class="empty-state"><i class="bi bi-mortarboard"></i><h3 class="mt-3">No courses yet</h3><p>Enroll in a course and it will appear here.</p><a href="courses.html" class="btn btn-primary">Explore courses</a></div></section>`}`}
function workspace(){const c=getCourse(new URLSearchParams(location.search).get("id"));
if(!enrolled.includes(c.id))return `<div class="mb-4"><a href="mycourses.html" class="muted"><i class="bi bi-arrow-left me-2"></i>My courses</a></div><section class="panel"><div class="empty-state"><i class="bi bi-lock"></i><h3 class="mt-3">You're not enrolled in this course</h3><p>Enroll to unlock subjects and notes.</p><a href="course.html?id=${c.id}" class="btn btn-primary">View course</a></div></section>`;
const done=new Set(doneMap()[c.id]||[]);let n=0;
const subjects=c.modules.map((m,mi)=>`<section class="panel mb-3"><div class="section-head"><div><span class="eyebrow">Subject ${mi+1}</span><h2 class="mb-0 mt-1">${escapeHtml(m.title)}</h2></div><span class="pill">${m.lessons.length} lessons</span></div>${m.lessons.map(l=>{const i=n++;return `<div class="curriculum-item"><input type="checkbox" class="form-check-input mt-0 lesson-done" data-idx="${i}" ${done.has(i)?"checked":""} aria-label="Mark ${escapeHtml(l)} complete" style="accent-color:var(--primary)"><span class="lesson-num">${i+1}</span><div class="flex-grow-1 fw-bold">${escapeHtml(l)}</div><span class="muted me-2 d-none d-sm-inline" title="Video / PDF / Notes">${["video:bi-camera-video","pdf:bi-file-earmark-pdf","notes:bi-journal-text"].map(t=>{const[k,ic]=t.split(":");const on=!!safeUrl(lessonItem(c.id,i)[k]);return `<i class="bi ${ic} me-1" style="opacity:${on?1:.25};color:${on?"var(--primary)":"inherit"}"></i>`}).join("")}</span><div class="d-flex gap-2"><a class="btn btn-light btn-sm" href="learn.html?id=${c.id}&lesson=${i}">Open <i class="bi bi-arrow-right ms-1"></i></a><a class="btn btn-outline-primary btn-sm" href="quiz.html?course=${c.id}&lesson=${i}" title="Take the Knowledge check for this lesson"><i class="bi bi-patch-question me-1"></i>Knowledge check</a></div></div>`}).join("")}</section>`).join("");
const opts=c.modules.map(m=>`<option>${escapeHtml(m.title)}</option>`).join("");
return `<div class="mb-3"><a href="mycourses.html" class="muted"><i class="bi bi-arrow-left me-2"></i>My courses</a></div><div class="welcome-row"><div><span class="pill pill-purple">${c.category} · ${c.level}</span><h1 class="mt-2 mb-1">${escapeHtml(c.title)}</h1><p class="mb-0">${escapeHtml(c.instructor)} · ${c.duration} · ${totalLessons(c)} lessons</p></div><div style="min-width:220px"><div class="d-flex justify-content-between tiny mb-1"><span>Progress</span><strong id="wsPct">${pct(c.id)}%</strong></div><div class="progress"><div class="progress-bar" id="wsBar" style="width:${pct(c.id)}%"></div></div><a class="btn btn-primary w-100 mt-3" href="learn.html?id=${c.id}&lesson=${Math.min(totalLessons(c)-1,done.size)}"><i class="bi bi-play-circle me-2"></i>Resume learning</a></div></div>
<ul class="nav nav-pills gap-2 mb-4" id="wsTabs"><li><button class="btn btn-primary btn-sm" data-tab="subjects"><i class="bi bi-list-task me-1"></i>Subjects & lessons</button></li><li><button class="btn btn-light btn-sm" data-tab="notes"><i class="bi bi-sticky me-1"></i>Notes</button></li><li><button class="btn btn-light btn-sm" data-tab="about"><i class="bi bi-info-circle me-1"></i>About</button></li></ul>
<div data-pane="subjects">${subjects}</div>
<div data-pane="notes" hidden><section class="panel mb-3"><h3>Add a note</h3><div class="row g-2"><div class="col-md-4"><select class="form-select" id="wsNoteSubject"><option>General</option>${opts}</select></div><div class="col-md-8"><input class="form-control" id="wsNoteTitle" placeholder="Note title"></div><div class="col-12"><textarea class="form-control" id="wsNoteBody" rows="3" placeholder="Write your note…"></textarea></div><div class="col-12"><button class="btn btn-primary" id="wsNoteSave"><i class="bi bi-plus-lg me-1"></i>Save note</button></div></div></section><div id="wsNotes"></div></div>
<div data-pane="about" hidden><section class="panel mb-3"><h3>About this course</h3><p>${escapeHtml(c.description)}</p><h3 class="mt-4">What you'll learn</h3><ul>${c.outcomes.map(o=>`<li>${escapeHtml(o)}</li>`).join("")}</ul><button class="btn btn-light mt-2" id="unenrollBtn" data-id="${c.id}">Unenroll from course</button></section></div>`}
function wireWorkspace(){const c=getCourse(new URLSearchParams(location.search).get("id"));if(!enrolled.includes(c.id))return;
$$("#wsTabs [data-tab]").forEach(b=>b.onclick=()=>{$$("#wsTabs [data-tab]").forEach(x=>x.className="btn btn-sm "+(x===b?"btn-primary":"btn-light"));$$("[data-pane]").forEach(p=>p.hidden=p.dataset.pane!==b.dataset.tab)});
$$(".lesson-done").forEach(cb=>cb.onchange=()=>{markDone(c.id,Number(cb.dataset.idx),cb.checked);$("#wsPct").textContent=pct(c.id)+"%";$("#wsBar").style.width=pct(c.id)+"%"});
const renderN=()=>{const list=notes.filter(n=>n.course===c.title);$("#wsNotes").innerHTML=list.length?list.map(n=>`<article class="note-card mb-3"><div class="d-flex justify-content-between"><span class="note-tag">${escapeHtml(n.subject||n.tag)}</span><button class="icon-btn" data-del="${n.id}" aria-label="Delete note"><i class="bi bi-trash3"></i></button></div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p></article>`).join(""):`<p>No notes for this course yet.</p>`;$$("[data-del]",$("#wsNotes")).forEach(b=>b.onclick=()=>{notes=notes.filter(n=>String(n.id)!==b.dataset.del);save("ls_notes",notes);renderN()})};renderN();
$("#wsNoteSave").onclick=()=>{const title=$("#wsNoteTitle").value.trim(),body=$("#wsNoteBody").value.trim();if(!title||!body){toast("Add a title and some content.");return}notes.unshift({id:Date.now(),title,body,course:c.title,subject:$("#wsNoteSubject").value,tag:c.category,date:"Today"});save("ls_notes",notes);$("#wsNoteTitle").value="";$("#wsNoteBody").value="";renderN();toast("Note saved.")};
wireCourse()}
async function init(){let page=document.body.dataset.page;if(page==="home"){home();return}const a=window.LearnSphereAuth;if(a?.configured&&a.client){try{const {data,error}=await a.client.auth.getSession();if(error)throw error;if(!data.session){const next=location.pathname.split("/").pop()+location.search;location.replace("auth.html?next="+encodeURIComponent(next));return}currentUser=data.session?.user||null;authStateToken++;await loadStudentState(currentUser);progress=read("ls_progress",{});enrolled=read("ls_enrolled",[]);notes=read("ls_notes",[]);await subscribeAuthChanges();}catch(err){console.error("LearnSphere session check failed:",err);$("#app").innerHTML="<main class=\"container py-5\"><div class=\"alert alert-warning\">We could not verify your session. Check your connection and Supabase configuration, then reload. <a href=\"auth.html\">Open sign in</a>.</div></main>";return}}if(page==="learn"){let id=new URLSearchParams(location.search).get("id")||"c1";const ln=parseInt(new URLSearchParams(location.search).get("lesson"),10);if(ln>=0)currentLesson=ln;let recent=read("ls_recent",[]).filter(x=>x!==id);recent.unshift(id);save("ls_recent",recent.slice(0,5))}renderPage(page)}
async function subscribeAuthChanges(){const c=getAuthClient();if(!c||authSubscription)return;const {data}=c.auth.onAuthStateChange((event,session)=>{if(event==="TOKEN_REFRESHED")return;const token=++authStateToken;currentUser=event==="SIGNED_OUT"?null:(session?.user||null);remoteStateReady=false;remoteState={};progress={};enrolled=[];notes=[];const activePage=document.body.dataset.page;if(currentUser&&activePage&&activePage!=="home")$("#app").innerHTML='<main class="container py-5"><div class="alert alert-info">Loading your private learning data…</div></main>';if(!currentUser){const page=document.body.dataset.page;if(page&&page!=="home")location.replace("auth.html");return}Promise.resolve().then(async()=>{if(token!==authStateToken)return;await loadStudentState(currentUser);if(token!==authStateToken)return;progress=read("ls_progress",{});enrolled=read("ls_enrolled",[]);notes=read("ls_notes",[]);const page=document.body.dataset.page;if(page&&page!=="home")renderPage(page)}).catch(err=>{console.error(err);$("#app").innerHTML=`<main class="container py-5"><div class="alert alert-warning">${escapeHtml(err.message||"Could not load your account data.")}</div></main>`})});authSubscription=data?.subscription||null}
function renderPage(page){const renderers={mycourses:myCourses,workspace,dashboard,courses:catalog,course:courseDetail,learn,quiz,notes:notesPage,profile:profilePage};const renderer=renderers[page]||dashboard;shell(renderer());if(page==="dashboard")initChart();if(page==="courses")wireCatalog();if(page==="workspace")wireWorkspace();if(page==="learn")wireResources();if(page==="course")wireCourse();if(page==="learn")wireLearn();if(page==="quiz")wireQuiz();if(page==="notes")wireNotes();if(page==="profile")wireProfile();}
document.addEventListener("DOMContentLoaded",init);
})();