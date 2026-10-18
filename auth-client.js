(() => {
  const c = window.LEARNSPHERE_CONFIG || {};
  const urlOK = typeof c.SUPABASE_URL === "string" && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.SUPABASE_URL) && !c.SUPABASE_URL.includes("YOUR-PROJECT-REF");
  const keyOK = typeof c.SUPABASE_ANON_KEY === "string" && c.SUPABASE_ANON_KEY.length > 20 && !c.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  window.LearnSphereAuth = { configured: !!(urlOK && keyOK && window.supabase), client: urlOK && keyOK && window.supabase ? window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null };
})();
