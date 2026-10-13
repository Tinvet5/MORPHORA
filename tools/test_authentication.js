"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ROOT = path.resolve(__dirname, "..");
function run(context, rel) { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), context, { filename: rel }); }
(async () => {
  const calls = [];
  const api = { auth: {
    signUp: async (value) => (calls.push(["signUp", value]), { data: { user: { id: "u1" }, session: null }, error: null }),
    signInWithPassword: async (value) => (calls.push(["signIn", value]), { data: { session: { user: { id: "u1" } } }, error: null }),
    signInWithOAuth: async (value) => (calls.push(["oauth", value]), { data: {}, error: null }),
    resetPasswordForEmail: async (email, options) => (calls.push(["reset", { email, options }]), { data: {}, error: null }),
    updateUser: async (value) => (calls.push(["update", value]), { data: {}, error: null }),
    signOut: async () => (calls.push(["signOut"]), { error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
  }};
  const context = vm.createContext({ console, location: { origin: "https://morphora.cl", pathname: "/index.html" }, MORPHORA_BACKEND_CONFIG: { auth: { redirectUrl: "https://morphora.cl/", googleEnabled: true } }, MorphoraBackend: { ready: Promise.resolve(), getClient: () => api, status: () => ({ mode: "cloud-ready", configured: true }) } });
  context.window=context; context.globalThis=context;
  run(context,"backend/auth-service.js");
  assert.strictEqual(context.MorphoraAuth.version, 2);
  assert.strictEqual(context.MorphoraAuth.redirectUrl(), "https://morphora.cl/");
  assert.strictEqual(context.MorphoraAuth.availability().available, true);
  await context.MorphoraAuth.signUp({ email:"student@example.com", password:"12345678", displayName:"Student One", language:"es" });
  await context.MorphoraAuth.signInWithPassword({ email:"student@example.com", password:"12345678" });
  await context.MorphoraAuth.requestPasswordReset("student@example.com");
  await context.MorphoraAuth.updatePassword("abcdefgh");
  await context.MorphoraAuth.signInWithGoogle();
  await context.MorphoraAuth.signOut();
  const signup=calls.find(([name])=>name==="signUp")[1];
  assert.strictEqual(signup.options.data.display_name,"Student One");
  assert.strictEqual(signup.options.data.language,"es");
  assert.strictEqual(signup.options.emailRedirectTo,"https://morphora.cl/");
  const reset=calls.find(([name])=>name==="reset")[1];
  assert.strictEqual(reset.options.redirectTo,"https://morphora.cl/");
  const oauth=calls.find(([name])=>name==="oauth")[1];
  assert.strictEqual(oauth.provider,"google");
  assert.strictEqual(oauth.options.redirectTo,"https://morphora.cl/");

  // Local development must return to the exact VS Code Live Server page instead
  // of the production redirect configured above.
  context.location.hostname = "127.0.0.1";
  context.location.origin = "http://127.0.0.1:5500";
  context.location.pathname = "/index.html";
  assert.strictEqual(context.MorphoraAuth.redirectUrl(), "http://127.0.0.1:5500/index.html");
  console.log("MORPHORA V5.0.5 authentication runtime test");
  console.log("✓ Signup carries display-name/language metadata and safe redirect");
  console.log("✓ Password sign-in, recovery, update and sign-out call current Supabase auth methods");
  console.log("✓ Google OAuth hook uses the same controlled return URL");
  console.log("✓ VS Code Live Server redirects stay on the active local host, port and page");
})();
