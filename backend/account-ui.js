(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const Auth = root.MorphoraAuth;
  const Backend = root.MorphoraBackend;
  const Profiles = root.MorphoraProfiles;
  const Preferences = root.MorphoraPreferences;
  const Config = root.MORPHORA_BACKEND_CONFIG || {};
  const I18n = root.MorphoraI18n;
  let session = null;
  let profile = null;
  let view = "signin";
  let busy = false;
  let accountLoadToken = 0;
  let lastFocused = null;

  const $ = (id) => root.document?.getElementById?.(id) || null;
  const t = (key, vars) => I18n?.t?.(key, vars) || key;

  function elements() {
    return {
      toggle: $("accountToggle"), dialog: $("accountDialog"), backdrop: $("accountBackdrop"), close: $("closeAccountDialog"),
      title: $("accountDialogTitle"), eyebrow: $("accountDialogEyebrow"), status: $("accountStatus"),
      unavailable: $("accountUnavailable"), authContent: $("accountAuthContent"), signedIn: $("accountSignedIn"),
      signInForm: $("accountSignInForm"), signUpForm: $("accountSignUpForm"), resetForm: $("accountResetForm"), recoveryForm: $("accountRecoveryForm"),
      signInTab: $("accountSignInTab"), signUpTab: $("accountSignUpTab"), forgot: $("accountForgotPassword"), resetBack: $("accountResetBack"),
      verification: $("accountVerificationPending"), verificationBack: $("accountVerificationBack"),
      googleWrap: $("accountGoogleWrap"), google: $("accountGoogleButton"), signOut: $("accountSignOutButton"),
      email: $("accountSignedInEmail"), name: $("accountSignedInName"), avatar: $("accountSignedInAvatar"),
      profileForm: $("accountProfileForm"), profileName: $("accountProfileDisplayName"),
      preferenceForm: $("accountPreferencesForm"), language: $("accountPreferenceLanguage"), theme: $("accountPreferenceTheme"),
      memberSince: $("accountMemberSince"), provider: $("accountProvider"), preferenceState: $("accountPreferenceState")
    };
  }

  function emailOf(user) { return String(user?.email || "").trim(); }
  function fallbackName(user) {
    const value = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    return String(value).trim() || emailOf(user).split("@")[0] || t("account.user");
  }
  function nameOf(user) {
    return String(profile?.display_name || "").trim() || fallbackName(user);
  }
  function initials(user) {
    const name = nameOf(user);
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)[0]}` : name.slice(0, 2)).toUpperCase();
  }
  function providerOf(user) {
    const provider = String(user?.app_metadata?.provider || user?.identities?.[0]?.provider || "email").toLowerCase();
    if (provider === "google") return t("account.providerGoogle");
    if (provider === "apple") return t("account.providerApple");
    if (provider === "azure" || provider === "microsoft") return t("account.providerMicrosoft");
    return t("account.providerEmail");
  }
  function formatDate(value) {
    if (!value) return t("account.notAvailable");
    try {
      return new Intl.DateTimeFormat(I18n?.getLanguage?.() === "es" ? "es-CL" : "en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
    } catch (_) { return String(value); }
  }

  function setMessage(message = "", kind = "info") {
    const el = elements().status;
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
    el.hidden = !message;
  }

  function setBusy(next) {
    busy = Boolean(next);
    elements().dialog?.querySelectorAll?.("button, input, select").forEach((control) => {
      if (control.id === "closeAccountDialog") return;
      control.disabled = busy;
    });
  }

  function availability() {
    return Auth?.availability?.() || { available: false, configured: false, mode: "local-only", googleEnabled: false };
  }

  function setView(next) {
    const el = elements();
    view = next;
    [el.signInForm, el.signUpForm, el.resetForm, el.recoveryForm, el.verification].forEach((panel) => { if (panel) panel.hidden = true; });
    if (next === "signup") el.signUpForm.hidden = false;
    else if (next === "reset") el.resetForm.hidden = false;
    else if (next === "recovery") el.recoveryForm.hidden = false;
    else if (next === "verification") el.verification.hidden = false;
    else el.signInForm.hidden = false;
    const tabbed = ["signin", "signup"].includes(next);
    el.signInTab?.setAttribute("aria-selected", String(next === "signin"));
    el.signUpTab?.setAttribute("aria-selected", String(next === "signup"));
    el.signInTab?.classList.toggle("is-active", next === "signin");
    el.signUpTab?.classList.toggle("is-active", next === "signup");
    $("accountTabs")?.toggleAttribute("hidden", !tabbed);
    el.googleWrap?.toggleAttribute("hidden", !(tabbed && availability().googleEnabled));
    setMessage();
  }

  function renderSignedInDetails(user) {
    const el = elements();
    const preference = Preferences?.current?.() || {};
    el.email.textContent = emailOf(user);
    el.name.textContent = nameOf(user);
    el.avatar.textContent = initials(user);
    if (el.profileName && root.document.activeElement !== el.profileName) el.profileName.value = String(profile?.display_name || fallbackName(user)).slice(0, 120);
    if (el.language) el.language.value = preference.language || I18n?.getLanguage?.() || "es";
    if (el.theme) el.theme.value = preference.theme || root.MorphoraNavigation?.getThemePreference?.() || "system";
    if (el.memberSince) el.memberSince.textContent = formatDate(user?.created_at || profile?.created_at);
    if (el.provider) el.provider.textContent = providerOf(user);
    if (el.preferenceState) {
      el.preferenceState.textContent = preference.syncing ? t("account.preferencesSyncing") : preference.loaded ? t("account.preferencesSynced") : t("account.preferencesLocal");
      el.preferenceState.dataset.state = preference.error ? "error" : preference.syncing ? "syncing" : preference.loaded ? "synced" : "local";
    }
  }

  function render() {
    const el = elements();
    if (!el.toggle || !el.dialog) return;
    const cloud = availability();
    const user = session?.user || null;
    el.unavailable.hidden = cloud.available;
    el.authContent.hidden = !cloud.available || Boolean(user);
    el.signedIn.hidden = !cloud.available || !user;

    el.toggle.classList.toggle("is-signed-in", Boolean(user));
    el.toggle.classList.toggle("is-local-only", !cloud.available);
    const avatar = el.toggle.querySelector(".account-toggle-avatar");
    if (avatar) avatar.textContent = user ? initials(user) : "";
    const icon = el.toggle.querySelector(".account-toggle-icon");
    if (icon) icon.hidden = Boolean(user);
    el.toggle.setAttribute("aria-expanded", String(!el.dialog.hidden));
    el.toggle.setAttribute("aria-label", user ? t("account.openSignedIn", { name: nameOf(user) }) : t("account.open"));
    el.toggle.title = user ? nameOf(user) : t("account.guest");

    if (!cloud.available) {
      el.eyebrow.textContent = t("account.localEyebrow");
      el.title.textContent = t("account.localTitle");
      $("accountUnavailableText").textContent = cloud.configured ? t("account.cloudUnavailable") : t("account.notConfigured");
      return;
    }
    if (user) {
      el.eyebrow.textContent = t("account.signedInEyebrow");
      el.title.textContent = t("account.yourAccount");
      renderSignedInDetails(user);
      return;
    }
    el.eyebrow.textContent = t("account.eyebrow");
    el.title.textContent = t("account.title");
    setView(view === "recovery" ? "recovery" : view);
  }

  async function loadAccountData({ applyPreferences = true } = {}) {
    const user = session?.user;
    if (!user) { profile = null; render(); return; }
    const token = ++accountLoadToken;
    try {
      const [profileResult] = await Promise.all([
        Profiles?.getProfile?.(),
        Preferences?.load?.({ apply: applyPreferences })
      ]);
      if (token !== accountLoadToken || !session?.user) return;
      if (profileResult?.error) throw profileResult.error;
      profile = profileResult?.data || null;
      if (!profile) {
        const created = await Profiles?.upsertProfile?.({ display_name: fallbackName(user) });
        if (created?.error) throw created.error;
        profile = created?.data || null;
      }
      render();
    } catch (error) {
      if (token !== accountLoadToken) return;
      render();
      setMessage(t("account.errorProfileLoad"), "error");
    }
  }

  function open() {
    const el = elements();
    if (!el.dialog || !el.backdrop) return;
    lastFocused = root.document.activeElement;
    el.backdrop.hidden = false;
    el.dialog.hidden = false;
    el.dialog.setAttribute("aria-hidden", "false");
    el.toggle?.setAttribute("aria-expanded", "true");
    root.document.body.classList.add("account-dialog-open");
    render();
    if (session?.user) loadAccountData({ applyPreferences: false });
    root.requestAnimationFrame?.(() => {
      const target = el.dialog.querySelector("input:not([hidden]):not(:disabled), select:not([hidden]):not(:disabled), button:not([hidden]):not(:disabled)");
      target?.focus?.();
    });
  }

  function close() {
    const el = elements();
    if (!el.dialog || !el.backdrop) return;
    el.dialog.hidden = true;
    el.backdrop.hidden = true;
    el.dialog.setAttribute("aria-hidden", "true");
    el.toggle?.setAttribute("aria-expanded", "false");
    root.document.body.classList.remove("account-dialog-open");
    setMessage();
    lastFocused?.focus?.();
  }

  function friendlyError(error, fallbackKey = "account.errorGeneric") {
    const code = String(error?.code || "");
    if (code === "invalid_credentials") return t("account.errorInvalidCredentials");
    if (code === "email_not_confirmed") return t("account.errorEmailNotConfirmed");
    if (code === "weak_password") return t("account.errorWeakPassword");
    if (code.includes("over_email_send_rate_limit")) return t("account.errorRateLimit");
    return t(fallbackKey);
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setMessage(t("account.signingIn"));
    try {
      const { data, error } = await Auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
      if (error) throw error;
      session = data?.session || null;
      profile = null;
      render();
      await loadAccountData();
      setMessage(t("account.signedInSuccess"), "success");
      root.MorphoraA11y?.announce?.(t("account.signedInSuccess"));
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { setBusy(false); }
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.password.value;
    if (password !== form.confirmPassword.value) { setMessage(t("account.errorPasswordMatch"), "error"); return; }
    const minimum = Number(Config.auth?.minPasswordLength || 8);
    if (password.length < minimum) { setMessage(t("account.errorPasswordLength", { count: minimum }), "error"); return; }
    setBusy(true); setMessage(t("account.creating"));
    try {
      const { data, error } = await Auth.signUp({
        email: form.email.value.trim(), password, displayName: form.displayName.value,
        language: I18n?.getLanguage?.() || "es"
      });
      if (error) throw error;
      form.reset();
      session = data?.session || null;
      profile = null;
      if (session) {
        render(); await loadAccountData(); setMessage(t("account.createdSignedIn"), "success");
      } else {
        setView("verification"); setMessage(t("account.verificationSent"), "success");
      }
    } catch (error) { setMessage(friendlyError(error, "account.errorCreate"), "error"); }
    finally { setBusy(false); }
  }

  async function handleReset(event) {
    event.preventDefault();
    setBusy(true); setMessage(t("account.sendingReset"));
    try {
      const { error } = await Auth.requestPasswordReset(event.currentTarget.email.value.trim());
      if (error) throw error;
      setMessage(t("account.resetSent"), "success");
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { setBusy(false); }
  }

  async function handleRecovery(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.password.value;
    if (password !== form.confirmPassword.value) { setMessage(t("account.errorPasswordMatch"), "error"); return; }
    const minimum = Number(Config.auth?.minPasswordLength || 8);
    if (password.length < minimum) { setMessage(t("account.errorPasswordLength", { count: minimum }), "error"); return; }
    setBusy(true); setMessage(t("account.updatingPassword"));
    try {
      const { error } = await Auth.updatePassword(password);
      if (error) throw error;
      form.reset(); setView("signin"); setMessage(t("account.passwordUpdated"), "success");
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { setBusy(false); }
  }

  async function handleGoogle() {
    setBusy(true); setMessage(t("account.openingGoogle"));
    try {
      const { error } = await Auth.signInWithGoogle();
      if (error) throw error;
    } catch (error) { setMessage(friendlyError(error), "error"); setBusy(false); }
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    const displayName = event.currentTarget.displayName.value.trim();
    if (!displayName) { setMessage(t("account.errorDisplayName"), "error"); return; }
    setBusy(true); setMessage(t("account.savingProfile"));
    try {
      const result = await Profiles.upsertProfile({ display_name: displayName });
      if (result?.error) throw result.error;
      profile = result?.data || { ...profile, display_name: displayName };
      render();
      setMessage(t("account.profileSaved"), "success");
      try { root.dispatchEvent(new root.CustomEvent("morphora:profilechange", { detail: { profile } })); } catch (_) {}
    } catch (error) { setMessage(t("account.errorProfileSave"), "error"); }
    finally { setBusy(false); }
  }

  async function handlePreferencesSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setMessage(t("account.savingPreferences"));
    try {
      const result = await Preferences.save({ language: form.language.value, theme: form.theme.value }, { apply: true });
      if (result?.error) throw result.error;
      render();
      setMessage(t("account.preferencesSaved"), "success");
    } catch (error) { setMessage(t("account.errorPreferencesSave"), "error"); }
    finally { setBusy(false); }
  }

  async function handleSignOut() {
    setBusy(true); setMessage(t("account.signingOut"));
    try {
      const { error } = await Auth.signOut();
      if (error) throw error;
      session = null; profile = null; accountLoadToken += 1; view = "signin";
      Preferences?.clearCloudState?.();
      render(); setMessage(t("account.signedOut"), "success");
    } catch (error) { setMessage(friendlyError(error), "error"); }
    finally { setBusy(false); }
  }

  function bind() {
    const el = elements();
    el.toggle?.addEventListener("click", open);
    el.close?.addEventListener("click", close);
    el.backdrop?.addEventListener("click", close);
    el.signInTab?.addEventListener("click", () => setView("signin"));
    el.signUpTab?.addEventListener("click", () => setView("signup"));
    el.forgot?.addEventListener("click", () => setView("reset"));
    el.resetBack?.addEventListener("click", () => setView("signin"));
    el.verificationBack?.addEventListener("click", () => setView("signin"));
    el.signInForm?.addEventListener("submit", handleSignIn);
    el.signUpForm?.addEventListener("submit", handleSignUp);
    el.resetForm?.addEventListener("submit", handleReset);
    el.recoveryForm?.addEventListener("submit", handleRecovery);
    el.google?.addEventListener("click", handleGoogle);
    el.profileForm?.addEventListener("submit", handleProfileSave);
    el.preferenceForm?.addEventListener("submit", handlePreferencesSave);
    el.signOut?.addEventListener("click", handleSignOut);
    root.document?.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !el.dialog?.hidden) close();
      if (event.key !== "Tab" || el.dialog?.hidden) return;
      const focusable = Array.from(el.dialog.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]):not([hidden]), a[href]')).filter((node) => node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && root.document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && root.document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    root.addEventListener?.("morphora:backend-status", render);
    root.addEventListener?.("morphora:languagechange", render);
    root.addEventListener?.("morphora:preferenceschange", render);
  }

  async function init() {
    await I18n?.ready;
    bind();
    await Backend?.ready;
    const initial = await Auth?.getSession?.();
    session = initial?.session || null;
    render();
    if (session?.user) await loadAccountData();
    Auth?.onAuthStateChange?.((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") view = "recovery";
      const previousUser = session?.user?.id || null;
      session = nextSession || null;
      if (session?.user?.id !== previousUser) profile = null;
      render();
      try { root.dispatchEvent(new root.CustomEvent("morphora:authchange", { detail: { event, session } })); } catch (_) {}
      if (session?.user && ["SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED"].includes(event)) loadAccountData();
      if (event === "PASSWORD_RECOVERY") open();
    });
  }

  if (root.document?.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  root.MorphoraAccountUI = Object.freeze({ version: 2, open, close, render, loadAccountData, getSession: () => session, getProfile: () => profile });
})();
