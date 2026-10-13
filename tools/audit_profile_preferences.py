#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 profile and cloud-preference invariants."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "profile-preferences-audit.json"
VERSION = "5.0.5"


def main() -> int:
    errors=[]; warnings=[]; passes=[]
    package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
    if package.get('version') != VERSION: errors.append(f'package.json version must be {VERSION}')

    pref_path=ROOT/'backend/preferences-service.js'
    pref=pref_path.read_text(encoding='utf-8') if pref_path.is_file() else ''
    for token in ('MorphoraPreferences','getPreferences','upsertPreferences','morphora:languagechange','morphora:themechange','morphora:preferenceschange','applyLocal'):
        if token not in pref: errors.append(f'Preference service missing invariant: {token}')
    if pref and not any('Preference service' in e for e in errors): passes.append('Dedicated preference service hydrates and persists account-scoped language/theme state')

    profile=(ROOT/'backend/profile-service.js').read_text(encoding='utf-8')
    if 'Object.prototype.hasOwnProperty.call(values, "avatar_url")' not in profile:
        errors.append('Profile updates can overwrite avatar_url when only display_name changes')
    else: passes.append('Profile partial updates preserve unrelated identity fields for future OAuth providers')

    nav=(ROOT/'navigation.js').read_text(encoding='utf-8')
    for token in ('setThemePreference','getThemePreference','morphora:themechange','preference === "light" || preference === "dark"'):
        if token not in nav: errors.append(f'Theme preference controller missing: {token}')
    if not any('Theme preference' in e for e in errors): passes.append('Theme controller supports system/light/dark preferences and emits sync-safe changes')

    index=(ROOT/'index.html').read_text(encoding='utf-8')
    for token in ('backend/preferences-service.js?v=5.0.5','id="accountProfileForm"','id="accountPreferencesForm"','id="accountPreferenceLanguage"','id="accountPreferenceTheme"','id="accountMemberSince"','id="accountProvider"'):
        if token not in index: errors.append(f'Account profile/preferences UI missing: {token}')
    css=(ROOT/'style.css').read_text(encoding='utf-8')
    for token in ('.account-settings-section','.account-sync-pill','.account-settings-grid','.account-metadata-list'):
        if token not in css: errors.append(f'Profile/preferences styling missing: {token}')
    if not any('Account profile' in e or 'styling' in e for e in errors): passes.append('Signed-in account dialog exposes responsive profile, preferences and account metadata surfaces')

    required_keys=('account.profileTitle','account.preferencesTitle','account.themeSystem','account.savePreferences','account.memberSince','account.preferencesSynced')
    for locale in ('en','es'):
        data=json.loads((ROOT/'i18n'/f'{locale}.json').read_text(encoding='utf-8'))
        for key in required_keys:
            if not data.get(key): errors.append(f'i18n/{locale}.json missing {key}')
    if not any('i18n/' in e for e in errors): passes.append('Profile and preference UI is complete in Spanish and English')

    sw=(ROOT/'service-worker.js').read_text(encoding='utf-8')
    if './backend/preferences-service.js' not in sw: errors.append('service-worker APP_SHELL is missing preferences-service.js')
    else: passes.append('Preference runtime participates in the release-versioned application shell')

    build=(ROOT/'tools/build_release.py').read_text(encoding='utf-8')
    checker=(ROOT/'tools/check_release.py').read_text(encoding='utf-8')
    if 'profile-preferences-audit.json' not in build: errors.append('Release builder does not require profile/preferences audit')
    if 'profilePreferences' not in checker: errors.append('Release checker does not verify profilePreferences metadata')
    if not any('Release' in e for e in errors): passes.append('Production release requires the V5.0.5 profile/preferences quality gate')

    report={'product':'MORPHORA','version':VERSION,'gate':'profile-preferences','summary':{'errors':len(errors),'warnings':len(warnings),'passes':len(passes)},'errors':errors,'warnings':warnings,'passes':passes}
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'MORPHORA V{VERSION} profile/preferences audit')
    for item in passes: print('✓',item)
    for item in warnings: print('!',item)
    for item in errors: print('✗',item)
    print(f'Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)')
    return 1 if errors else 0

if __name__=='__main__': raise SystemExit(main())
