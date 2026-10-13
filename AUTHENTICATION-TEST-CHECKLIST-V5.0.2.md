# MORPHORA V5.0.2 — Authentication Test Checklist

- [ ] Guest mode opens the atlas with no backend configuration.
- [ ] Account button opens/closes by mouse, keyboard, backdrop click and Escape.
- [ ] Spanish/English account UI follows the active language.
- [ ] Email signup sends confirmation when Supabase email confirmation is enabled.
- [ ] Confirmed account signs in and restores its session after refresh.
- [ ] Sign-out returns the interface to Guest without deleting local atlas data.
- [ ] Password reset email returns to the configured MORPHORA redirect URL.
- [ ] PASSWORD_RECOVERY opens the new-password flow and successfully updates the password.
- [ ] User A cannot select/update/delete User B profile/preferences/documents.
- [ ] Google button remains hidden until `googleEnabled: true`.
- [ ] Google OAuth returns to MORPHORA after provider setup.
- [ ] No secret/service-role key is present anywhere in browser source.
- [ ] `npm run ci` passes before deployment.
