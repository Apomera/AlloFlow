'use strict';

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const COOKIE_VALUE_PATTERN = /^[^\u0000-\u0020\u007f;,]+$/;
const ELECTRON_KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function takeCookieHeaders(headers) {
  const values = [];
  for (const name of Object.keys(headers || {})) {
    if (name.toLowerCase() !== 'cookie') continue;
    values.push(String(headers[name] || ''));
    delete headers[name];
  }
  return values.filter(Boolean).join('; ');
}

function stripNamedCookies(rawHeader, names) {
  const blocked = new Set(Array.from(names || [], (name) => String(name).toLowerCase()));
  return String(rawHeader || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const separator = part.indexOf('=');
      const name = separator > 0 ? part.slice(0, separator).trim().toLowerCase() : '';
      return !blocked.has(name);
    });
}

function validPrivateAuth(auth) {
  if (
    !auth
    || typeof auth.origin !== 'string'
    || auth.cookieName !== 'electron_key'
    || !COOKIE_NAME_PATTERN.test(String(auth.cookieName))
    || !COOKIE_NAME_PATTERN.test(String(auth.sessionCookieName || ''))
    || !ELECTRON_KEY_PATTERN.test(String(auth.electronKey || ''))
    || !COOKIE_VALUE_PATTERN.test(String(auth.electronKey || ''))
  ) {
    return false;
  }
  try {
    const origin = new URL(auth.origin);
    const port = Number(origin.port);
    return origin.protocol === 'http:'
      && origin.hostname === '127.0.0.1'
      && Number.isInteger(port)
      && port > 0
      && port <= 65535
      && auth.origin === origin.origin;
  } catch (_) {
    return false;
  }
}

function normalizedHttpOrigin(requestUrl) {
  const target = new URL(String(requestUrl || ''));
  if (target.protocol === 'ws:') target.protocol = 'http:';
  else if (target.protocol === 'wss:') target.protocol = 'https:';
  return target;
}

function isAllowedPrivateApiRequest(requestUrl, allowedOrigins) {
  try {
    const target = new URL(String(requestUrl || ''));
    const origins = new Set(Array.from(allowedOrigins || [], (origin) => {
      try { return new URL(String(origin || '')).origin; } catch (_) { return ''; }
    }).filter(Boolean));
    return target.protocol === 'http:'
      && !target.username
      && !target.password
      && origins.has(target.origin)
      && (target.pathname === '/api' || target.pathname.startsWith('/api/'));
  } catch (_) {
    return false;
  }
}

function hasExactOrigin(value, expectedOrigin) {
  try {
    const parsed = normalizedHttpOrigin(value);
    return !parsed.username && !parsed.password && parsed.origin === expectedOrigin;
  } catch (_) {
    return false;
  }
}

function isTrustedAlloSheetGristFrameRequest(details, companionOrigin, managedOrigin) {
  if (!details || !hasExactOrigin(details.url, managedOrigin)) return false;
  const frame = details.frame && typeof details.frame === 'object' ? details.frame : null;
  const frameUrl = frame && frame.url || '';
  const parentUrl = frame && frame.parent && frame.parent.url || '';
  const initiator = details.initiator || '';
  const resourceType = String(details.resourceType || '');

  // Initial navigation of the dedicated Grist iframe is initiated by the
  // companion (or by Grist itself during a same-origin navigation).
  if (resourceType === 'subFrame') {
    return hasExactOrigin(initiator, companionOrigin)
      || hasExactOrigin(initiator, managedOrigin)
      || hasExactOrigin(parentUrl, companionOrigin)
      || hasExactOrigin(parentUrl, managedOrigin);
  }

  // Assets, XHR/fetch, and WebSocket requests must originate inside the
  // managed Grist frame. A foreign custom-widget frame in the same
  // WebContents does not inherit this authorization.
  return hasExactOrigin(frameUrl, managedOrigin)
    || hasExactOrigin(initiator, managedOrigin);
}

/**
 * Remove AlloSheet's sensitive cookies from every other request and inject the
 * native Grist Desktop credential only for the exact managed origin and the
 * approved companion WebContents. This applies to iframe HTTP requests and
 * WebSocket upgrade requests handled by Electron's webRequest API.
 */
function applyAlloSheetRequestAuth(headers, requestUrl, auth, trustedWebContents, knownCookieNames = []) {
  const result = { ...(headers || {}) };
  const rawCookies = takeCookieHeaders(result);

  let exactManagedOrigin = false;
  if (Number.isInteger(trustedWebContents) && trustedWebContents > 0 && validPrivateAuth(auth)) {
    try {
      const target = normalizedHttpOrigin(requestUrl);
      exactManagedOrigin = !target.username
        && !target.password
        && target.origin === auth.origin;
    } catch (_) {
      exactManagedOrigin = false;
    }
  }
  const sensitiveNames = new Set(knownCookieNames);
  if (auth && auth.cookieName) sensitiveNames.add(auth.cookieName);
  if (auth && auth.sessionCookieName) sensitiveNames.add(auth.sessionCookieName);
  const namesToStrip = exactManagedOrigin
    ? new Set([String(auth.cookieName)])
    : sensitiveNames;
  const cookies = stripNamedCookies(rawCookies, namesToStrip);
  if (exactManagedOrigin) cookies.push(`${auth.cookieName}=${auth.electronKey}`);

  if (cookies.length) result.Cookie = cookies.join('; ');
  return result;
}

module.exports = {
  applyAlloSheetRequestAuth,
  isAllowedPrivateApiRequest,
  isTrustedAlloSheetGristFrameRequest,
  normalizedHttpOrigin,
  stripNamedCookies,
  takeCookieHeaders,
  validPrivateAuth,
};
