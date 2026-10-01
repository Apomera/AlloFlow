import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  applyAlloSheetRequestAuth,
  isAllowedPrivateApiRequest,
  isTrustedAlloSheetGristFrameRequest,
  normalizedHttpOrigin,
  validPrivateAuth,
} = require(path.join(process.cwd(), 'desktop/electron/allosheet-request-auth.cjs'));

const auth = Object.freeze({
  origin: 'http://127.0.0.1:43123',
  cookieName: 'electron_key',
  electronKey: 'AbCdEfGhIjKlMnOpQrStUv',
  sessionCookieName: 'allosheet_1234567890abcdef',
});

describe('AlloSheet Electron request authentication', () => {
  it('accepts only a canonical random-port IPv4 loopback origin', () => {
    expect(validPrivateAuth(auth)).toBe(true);
    expect(validPrivateAuth({ ...auth, origin: 'http://localhost:43123' })).toBe(false);
    expect(validPrivateAuth({ ...auth, origin: 'http://127.0.0.1' })).toBe(false);
    expect(validPrivateAuth({ ...auth, origin: 'https://127.0.0.1:43123' })).toBe(false);
    expect(validPrivateAuth({ ...auth, origin: 'http://127.0.0.1:43123/' })).toBe(false);
  });

  it('scopes the private desktop token to an exact runtime origin and API path', () => {
    const runtimeOrigins = ['http://127.0.0.1:32170', 'http://localhost:32170'];
    expect(isAllowedPrivateApiRequest(
      'http://127.0.0.1:32170/api/allosheet/config',
      runtimeOrigins,
    )).toBe(true);
    expect(isAllowedPrivateApiRequest(
      'http://127.0.0.1:43123/api/orgs',
      runtimeOrigins,
    )).toBe(false);
    expect(isAllowedPrivateApiRequest(
      'http://127.0.0.1:32170/app/allo_sheet/allo_sheet.html',
      runtimeOrigins,
    )).toBe(false);
    expect(isAllowedPrivateApiRequest('ws://127.0.0.1:32170/api/socket', runtimeOrigins)).toBe(false);
  });

  it('authorizes only the dedicated companion-to-Grist frame chain', () => {
    const companionOrigin = 'http://127.0.0.1:32170';
    expect(isTrustedAlloSheetGristFrameRequest({
      url: `${auth.origin}/doc/example`,
      resourceType: 'subFrame',
      initiator: `${companionOrigin}/app/allo_sheet/allo_sheet.html`,
      frame: { url: 'about:blank', parent: { url: `${companionOrigin}/app/allo_sheet/allo_sheet.html` } },
    }, companionOrigin, auth.origin)).toBe(true);

    expect(isTrustedAlloSheetGristFrameRequest({
      url: `${auth.origin}/api/orgs`,
      resourceType: 'xhr',
      initiator: `${auth.origin}/doc/example`,
      frame: { url: `${auth.origin}/doc/example`, parent: { url: `${companionOrigin}/app/allo_sheet/allo_sheet.html` } },
    }, companionOrigin, auth.origin)).toBe(true);

    expect(isTrustedAlloSheetGristFrameRequest({
      url: `ws://127.0.0.1:43123/ws`,
      resourceType: 'webSocket',
      initiator: `${auth.origin}/doc/example`,
      frame: { url: `${auth.origin}/doc/example`, parent: { url: `${companionOrigin}/app/allo_sheet/allo_sheet.html` } },
    }, companionOrigin, auth.origin)).toBe(true);

    expect(isTrustedAlloSheetGristFrameRequest({
      url: `${auth.origin}/api/docs/example`,
      resourceType: 'xhr',
      initiator: 'https://widget.example/tool',
      frame: { url: 'https://widget.example/tool', parent: { url: `${auth.origin}/doc/example` } },
    }, companionOrigin, auth.origin)).toBe(false);

    expect(isTrustedAlloSheetGristFrameRequest({
      url: 'http://127.0.0.1:32170/api/allosheet/config',
      resourceType: 'xhr',
      initiator: `${auth.origin}/doc/example`,
      frame: { url: `${auth.origin}/doc/example` },
    }, companionOrigin, auth.origin)).toBe(false);
  });

  it('preserves the issued session and replaces any presented key on the exact trusted origin', () => {
    const result = applyAlloSheetRequestAuth(
      {
        Cookie: 'theme=dark; electron_key=forged',
        cookie: `${auth.sessionCookieName}=session-value; locale=en`,
      },
      `${auth.origin}/doc/example`,
      auth,
      41,
      [auth.sessionCookieName],
    );
    expect(Object.keys(result).filter((name) => name.toLowerCase() === 'cookie')).toEqual(['Cookie']);
    expect(result.Cookie).toContain('theme=dark');
    expect(result.Cookie).toContain(`${auth.sessionCookieName}=session-value`);
    expect(result.Cookie).toContain('locale=en');
    expect(result.Cookie).toContain(`electron_key=${auth.electronKey}`);
    expect(result.Cookie).not.toContain('electron_key=forged');
  });

  it('normalizes the managed WebSocket scheme and injects only for a trusted WebContents', () => {
    expect(normalizedHttpOrigin('ws://127.0.0.1:43123/ws').origin).toBe(auth.origin);
    const trusted = applyAlloSheetRequestAuth({}, 'ws://127.0.0.1:43123/ws', auth, 41);
    const serviceWorker = applyAlloSheetRequestAuth({}, 'ws://127.0.0.1:43123/ws', auth, -1);
    expect(trusted.Cookie).toBe(`electron_key=${auth.electronKey}`);
    expect(serviceWorker.Cookie).toBeUndefined();
  });

  it('strips Grist key and session cookies from every wrong port and untrusted window', () => {
    const raw = `safe=1; electron_key=${auth.electronKey}; ${auth.sessionCookieName}=secret`;
    const wrongPort = applyAlloSheetRequestAuth(
      { Cookie: raw },
      'http://127.0.0.1:32170/api/health',
      auth,
      41,
      [auth.sessionCookieName],
    );
    expect(wrongPort.Cookie).toBe('safe=1');
    const wrongScheme = applyAlloSheetRequestAuth(
      { Cookie: raw },
      'https://127.0.0.1:43123/api/orgs',
      auth,
      41,
      [auth.sessionCookieName],
    );
    expect(wrongScheme.Cookie).toBe('safe=1');
    expect(applyAlloSheetRequestAuth(
      { Cookie: raw },
      `${auth.origin}/api/orgs`,
      auth,
      0,
      [auth.sessionCookieName],
    ).Cookie).toBe('safe=1');
  });
});
