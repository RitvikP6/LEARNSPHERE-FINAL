/* ============================================================
   LearnSphere Knowledge Check questions — EDIT THIS FILE to add or
   refine questions for any course, subject, or lesson.

   Key format:  "<courseId>-<lessonNumber>"  (lesson number starts at 1,
   matching the key in lesson-content.js).

   Each lesson maps to an array of question objects:
     { q:      "Question text",
       options: ["choice 1", "choice 2", ...],
       answer:  index of the correct option (0-based),
       explain: optional short explanation shown after submission }

   Lessons that do NOT appear here will surface a friendly "questions
   coming soon" state in the Knowledge Check page. Add a real question
   set there once the lesson content is finalised.

   Only truthful, on-topic questions are included by default. Edit this
   file to expand coverage as your course material grows.
   ============================================================ */
window.LESSON_QUIZZES = {
  /* ===== c1 — JavaScript: From Zero to Confident ===== */
  "c1-1": [ // Getting started with JavaScript
    { q: "Which keyword declares a block-scoped variable that can be reassigned?",
      options: ["const", "let", "static", "define"], answer: 1,
      explain: "`let` declares a block-scoped, reassignable binding. `const` is also block-scoped but cannot be reassigned after declaration." },
    { q: "What does Array.prototype.map() return?",
      options: ["The original array only", "A number", "A new array", "A boolean"], answer: 2,
      explain: "map() returns a brand new array built by applying the callback to every element of the original. The original array is left untouched." },
    { q: "Which symbol is commonly used for strict equality in JavaScript?",
      options: ["=", "==", "===", "!="], answer: 2,
      explain: "`===` compares both value and type without coercing. It is the preferred equality operator in modern JavaScript." },
    { q: "What does addEventListener() help you do?",
      options: ["Style an element", "Respond to an event", "Create a database", "Load a font"], answer: 1,
      explain: "addEventListener() attaches a handler that runs whenever the specified event is fired on the target element." },
    { q: "Which value represents an intentional absence of any object value?",
      options: ["undefined only", "null", "NaN", "false"], answer: 1,
      explain: "`null` is the deliberate \"no value\" sentinel. `undefined` means a value has not been assigned, which is subtly different." }
  ],
  "c1-2": [ // Variables, values & operators
    { q: "Which of these is a JavaScript string literal?",
      options: ["<hello>", "'hello'", "(hello)", "{hello}"], answer: 1,
      explain: "Strings can be wrapped in single quotes, double quotes, or backticks; angle brackets and braces are not valid string delimiters." },
    { q: "What is the result of the expression 0.1 + 0.2 in JavaScript?",
      options: ["0.3 exactly", "0.30000000000000004", "0", "NaN"], answer: 1,
      explain: "IEEE-754 floating-point arithmetic cannot represent 0.1 and 0.2 exactly, so the sum is a very close approximation rather than 0.3." },
    { q: "Which operator returns the remainder of a division?",
      options: ["/", "%", "//", "**"], answer: 1,
      explain: "The modulo operator (%) returns the remainder after integer division, e.g. 7 % 3 === 1." }
  ],

  /* ===== c2 — UI Design Essentials ===== */
  "c2-1": [ // How people scan interfaces
    { q: "Which scan pattern do most Western readers use when looking at a web page?",
      options: ["Z-pattern", "F-pattern", "Spiral pattern", "Random walk"], answer: 1,
      explain: "Eye-tracking studies consistently show an F-shaped pattern on text-heavy pages: a strong horizontal scan across the top, then shorter scans down the left edge." },
    { q: "Which visual element is most effective at guiding a reader's eye to a primary action?",
      options: ["Subtle border", "High contrast button", "Long paragraph", "Repeated icon"], answer: 1,
      explain: "High contrast against the surrounding chrome makes a button the dominant focal point on first scan." },
    { q: "What does the principle of \"visual hierarchy\" primarily help a reader do?",
      options: ["Memorise colour codes", "Find the most important information first", "Read every word in order", "Avoid scrolling"], answer: 1,
      explain: "Hierarchy orders elements by importance so the reader notices the right thing first, even with a quick scan." }
  ],

  /* ===== c3 — Data Analytics with Python ===== */
  "c3-1": [ // Python data toolkit
    { q: "Which library is the de-facto standard for tabular data manipulation in Python?",
      options: ["NumPy", "pandas", "Matplotlib", "Requests"], answer: 1,
      explain: "pandas provides the DataFrame structure that is the workhorse of most Python data-analysis workflows." },
    { q: "What does pandas.DataFrame.head() return by default?",
      options: ["The first row", "The first 5 rows", "The column names", "A summary of dtypes"], answer: 1,
      explain: "head() defaults to n=5, returning the first 5 rows so you can quickly inspect a frame's shape and values." },
    { q: "Which library is most commonly used to draw charts in a Jupyter notebook?",
      options: ["Seaborn only", "Matplotlib", "Plotly only", "scikit-learn"], answer: 1,
      explain: "Matplotlib is the foundational plotting library; Seaborn and Plotly are higher-level alternatives built on top of it." }
  ],

  /* ===== c4 — Productivity & Project Planning ===== */
  "c4-1": [ // Set a useful goal
    { q: "What does the SMART acronym stand for in goal-setting?",
      options: ["Simple, Measurable, Achievable, Real, Time-bound",
                "Specific, Measurable, Achievable, Relevant, Time-bound",
                "Strategic, Manageable, Actionable, Realistic, Tracked",
                "Shared, Measured, Assigned, Reviewed, Tested"], answer: 1,
      explain: "SMART goals are Specific, Measurable, Achievable, Relevant, and Time-bound — a checklist for turning vague aspirations into actionable plans." },
    { q: "Which is the best first step when starting a large project?",
      options: ["Open every tool you might need", "Define the outcome in one sentence", "Pick a deadline at random", "Skip planning to save time"], answer: 1,
      explain: "A one-sentence definition of the desired outcome is the most leveraged first move; it makes every later decision easier to evaluate." },
    { q: "Why is \"time-bound\" useful when writing a goal?",
      options: ["It removes the need for measurement", "It creates a natural deadline that drives focus", "It guarantees success", "It replaces the need for clarity"], answer: 1,
      explain: "A concrete deadline converts intention into commitment and gives you a point to review progress against." }
  ]
};
