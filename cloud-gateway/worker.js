/**
 * MORPHORA Histology v0.8.3 — private R2 slide gateway (pilot)
 * Cloudflare Worker (module syntax), no third-party dependencies.
 * Required R2 binding: HISTOLOGY_BUCKET => morphora-histology-private
 * Required text variables: SUPABASE_URL, ALLOWED_USER_IDS, ALLOWED_ORIGINS
 *
 * Authenticated /slides/hueso-4/* remains restricted to approved Supabase users.
 * Congress-only /demo/slides/hueso-4/* is public (GET/HEAD) until DEMO_ENDS_AT.
 * Fail-closed: DEMO_ENABLED must be true AND DEMO_ENDS_AT must be a valid UTC expiry.
 * The public demo cannot read other slides, barcodes, private manifests, or directories.
 * DEMO_ENABLED must be turned off after the congress even though expiry is automatic.
 */

const textEncoder = new TextEncoder();
const MAX_TOKEN_LENGTH = 8192;
const KEY_CACHE_MS = 5 * 60 * 1000;
const CLOCK_SKEW_SEC = 60;
const DEMO_PREFIX = '/demo';
const SLIDE_KEY_PATTERN = /^hueso-4\/(?:slide\.dzi|slide_files\/\d+\/\d+_\d+\.(?:jpe?g|png|webp))$/i;
let cachedKeys = null;
let keysExpiresAt = 0;

function errorResponse(status, message, cors = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store', ...cors },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return {};
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'Authorization',
    'access-control-max-age': '600',
    'vary': 'Origin',
  };
}

function base64urlBytes(encoded) {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Invalid token encoding');
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function decodePart(part) {
  return JSON.parse(new TextDecoder().decode(base64urlBytes(part)));
}

async function getPublicKeys(supabaseUrl, fresh = false) {
  if (!fresh && cachedKeys && Date.now() < keysExpiresAt) return cachedKeys;
  const url = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('JWKS retrieval failed');
  const jwks = await response.json();
  if (!Array.isArray(jwks.keys)) throw new Error('JWKS not available');
  cachedKeys = jwks.keys;
  keysExpiresAt = Date.now() + KEY_CACHE_MS;
  return cachedKeys;
}

function pickSigningKey(keys, header) {
  if (typeof header.kid !== 'string' || !header.kid) return null;
  return keys.find(k => k.kid === header.kid && k.kty === 'EC' && k.crv === 'P-256' &&
    (!k.alg || k.alg === 'ES256') && (!k.use || k.use === 'sig') &&
    (!k.key_ops || k.key_ops.includes('verify')));
}

async function verifySessionJWT(token, env) {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (header.alg !== 'ES256' || header.typ && header.typ !== 'JWT') return null;
  const base = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)) return null;
  if (claims.iss !== `${base}/auth/v1`) return null;
  if (claims.role !== 'authenticated') return null;
  if (claims.aud !== 'authenticated' &&
      !(Array.isArray(claims.aud) && claims.aud.includes('authenticated'))) return null;
  if (typeof claims.sub !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(claims.sub)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= now) return null;
  if (typeof claims.nbf === 'number' && claims.nbf > now + CLOCK_SKEW_SEC) return null;
  if (typeof claims.iat === 'number' && claims.iat > now + CLOCK_SKEW_SEC) return null;

  let jwks = await getPublicKeys(base);
  let jwk = pickSigningKey(jwks, header);
  if (!jwk) { jwks = await getPublicKeys(base, true); jwk = pickSigningKey(jwks, header); }
  if (!jwk) return null;
  const publicKey = await crypto.subtle.importKey('jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const sig = base64urlBytes(parts[2]);
  if (sig.length !== 64) return null;
  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' },
    publicKey, sig, textEncoder.encode(`${parts[0]}.${parts[1]}`));
  return valid ? claims : null;
}

function allowedUser(sub, env) {
  const ids = String(env.ALLOWED_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.length > 0 && ids.includes(sub);
}

function objectKeyFromPath(pathname, demo = false) {
  // Only this precisely defined Hueso-4 DZI descriptor and its image tiles are readable.
  const prefix = demo ? '/demo/slides/' : '/slides/';
  if (!pathname.startsWith(prefix)) return null;
  const key = pathname.slice(prefix.length);
  return SLIDE_KEY_PATTERN.test(key) ? key : null;
}

function congressDemoActive(env, now = Date.now()) {
  if (env.DEMO_ENABLED !== 'true') return false;
  const stamp = String(env.DEMO_ENDS_AT || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(stamp)) return false;
  const expires = Date.parse(stamp);
  return Number.isFinite(expires) && expires > now;
}

function contentType(key) {
  if (key.endsWith('.dzi')) return 'application/xml; charset=utf-8';
  if (/\.png$/i.test(key)) return 'image/png';
  if (/\.webp$/i.test(key)) return 'image/webp';
  return 'image/jpeg';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(request, env);
    if (origin && !cors) return errorResponse(403, 'Origin not allowed');
    const corsSafe = cors || {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204,
      headers: { ...corsSafe, 'cache-control': 'no-store' } });
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return errorResponse(405, 'Method not allowed', corsSafe);
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('MORPHORA histology gateway online', {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...corsSafe },
    });
    const isDemo = url.pathname.startsWith('/demo/');
    const key = objectKeyFromPath(url.pathname, isDemo);
    if (!key || url.search) return errorResponse(404, 'Not found', corsSafe);
    if (!env.HISTOLOGY_BUCKET) return errorResponse(503, 'Gateway not configured', corsSafe);
    if (isDemo) {
      if (!congressDemoActive(env)) return errorResponse(404, 'Demo not available', corsSafe);
      // Intentionally anonymous access to this single preview slide only.
      return await serveObject(request, env, key, corsSafe, true);
    }
    if (!env.SUPABASE_URL || !env.ALLOWED_USER_IDS)
      return errorResponse(503, 'Gateway not configured', corsSafe);
    const authorization = request.headers.get('Authorization') || '';
    const match = /^Bearer ([A-Za-z0-9._-]+)$/i.exec(authorization);
    if (!match) return errorResponse(401, 'Authentication required', corsSafe);
    let claims;
    try { claims = await verifySessionJWT(match[1], env); }
    catch (error) { return errorResponse(503, 'Authentication temporarily unavailable', corsSafe); }
    if (!claims) return errorResponse(401, 'Invalid or expired session', corsSafe);
    if (!allowedUser(claims.sub, env)) return errorResponse(403, 'Not authorized for this slide', corsSafe);
    return await serveObject(request, env, key, corsSafe, false);
  },
};

async function serveObject(request, env, key, corsSafe, isDemo) {
    try {
      const obj = request.method === 'HEAD'
        ? await env.HISTOLOGY_BUCKET.head(key)
        : await env.HISTOLOGY_BUCKET.get(key);
      if (!obj) return errorResponse(404, 'Tile not found', corsSafe);
      const headers = new Headers(corsSafe);
      headers.set('content-type', contentType(key));
      headers.set('cache-control', isDemo ? 'public, max-age=60' : 'private, no-store');
      headers.set('x-content-type-options', 'nosniff');
      if (obj.size != null) headers.set('content-length', String(obj.size));
      return new Response(request.method === 'HEAD' ? null : obj.body, {
        status: 200, headers,
      });
    } catch (error) {
      return errorResponse(502, 'Storage temporarily unavailable', corsSafe);
    }
}
