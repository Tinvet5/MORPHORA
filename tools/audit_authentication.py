#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 authentication UI and security invariants."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; REPORT=ROOT/'reports'/'authentication-audit.json'; VERSION='5.0.5'
def main():
    errors=[]; warnings=[]; passes=[]
    package=json.loads((ROOT/'package.json').read_text())
    if package.get('version')!=VERSION: errors.append(f'package.json version must be {VERSION}')
    auth=(ROOT/'backend/auth-service.js').read_text()
    for token in ['signUp','signInWithPassword','resetPasswordForEmail','updateUser','signInWithOAuth','onAuthStateChange','redirectUrl']:
        if token not in auth: errors.append(f'Auth service missing {token}')
    if 'service_role' in auth or 'sb_secret_' in auth: errors.append('Auth runtime contains a privileged credential token')
    else: passes.append('Auth service exposes signup, sign-in, recovery, OAuth and session lifecycle without privileged keys')
    ui=ROOT/'backend/account-ui.js'; index=(ROOT/'index.html').read_text(); css=(ROOT/'style.css').read_text()
    if not ui.is_file(): errors.append('backend/account-ui.js is missing')
    for token in ['id="accountToggle"','id="accountDialog"','id="accountSignInForm"','id="accountSignUpForm"','id="accountResetForm"','id="accountRecoveryForm"']:
        if token not in index: errors.append(f'Account interface missing {token}')
    if 'backend/account-ui.js?v=5.0.5' not in index: errors.append('index.html does not load versioned account UI runtime')
    if '.account-dialog' not in css or '.header-account-button' not in css: errors.append('Account UI styling is missing')
    if not any('Account interface' in e for e in errors): passes.append('Header account entry and accessible authentication dialog are present')
    config=(ROOT/'backend-config.js').read_text()
    for token in ['googleEnabled: false','minPasswordLength: 8','redirectUrl: "https://morphora.cl/"','enabled: true','publishableKey: "sb_publishable_']:
        if token not in config: errors.append(f'Authentication connected-config invariant missing: {token}')
    if re.search(r'publishableKey:\s*"(?:sb_secret_|[^"\n]*service[_-]?role)',config,re.I): errors.append('Privileged key found in public configuration')
    if 'hostname === "localhost"' not in auth or 'hostname === "127.0.0.1"' not in auth: errors.append('Auth redirect helper does not preserve local Live Server origins')
    else: passes.append('Email/password accounts are connected through a public Supabase key while Google OAuth remains disabled until provider setup')
    migration=(ROOT/'database/migrations/202610040002_v5_authentication.sql').read_text()
    for token in ['security definer',"set search_path = ''",'after insert on auth.users','public.profiles','public.user_preferences']:
        if token not in migration.lower(): errors.append(f'Authentication migration missing invariant: {token}')
    if not any('migration' in e.lower() for e in errors): passes.append('Auth-user provisioning creates only minimal profile/preferences rows through a constrained trigger')
    for locale in ('en','es'):
        d=json.loads((ROOT/'i18n'/f'{locale}.json').read_text())
        for key in ('account.title','account.signIn','account.createAccount','account.signOut','account.privacyNote','account.notConfigured'):
            if not d.get(key): errors.append(f'i18n/{locale}.json missing {key}')
    if not any('i18n/' in e for e in errors): passes.append('Account entry is fully bilingual in Spanish and English')
    sw=(ROOT/'service-worker.js').read_text()
    if './backend/account-ui.js' not in sw: errors.append('service-worker app shell is missing account-ui.js')
    else: passes.append('Authentication UI remains available in the offline application shell while cloud auth itself fails safely')
    build=(ROOT/'tools/build_release.py').read_text(); checker=(ROOT/'tools/check_release.py').read_text()
    if 'authentication-audit.json' not in build: errors.append('Release builder does not require authentication audit')
    if 'authentication' not in checker: errors.append('Release checker does not verify authentication gate metadata')
    if not any('Release' in e for e in errors): passes.append('Production build requires the V5.0.5 authentication quality gate')
    report={'product':'MORPHORA','version':VERSION,'gate':'authentication','summary':{'errors':len(errors),'warnings':len(warnings),'passes':len(passes)},'errors':errors,'warnings':warnings,'passes':passes}
    REPORT.parent.mkdir(exist_ok=True); REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(f'MORPHORA V{VERSION} authentication audit')
    for x in passes: print('✓',x)
    for x in warnings: print('!',x)
    for x in errors: print('✗',x)
    print(f'Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)')
    return 1 if errors else 0
if __name__=='__main__': raise SystemExit(main())
