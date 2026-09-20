// The mailbox config has to survive AlloFlow's primary surface.
//
// It lived in localStorage, which does not. allo_device_storage_module.js exists
// precisely because in the Canvas iframe "the app's own origin is ephemeral
// (localStorage/IndexedDB vanish between sessions)". A teacher who set up a
// mailbox would find it gone next session and have to re-enter a deployment URL
// and an admin token they probably never kept a copy of.
//
// So the bridge is the source of truth and localStorage is a cache. The bridge
// is not guaranteed either (on Canvas it can need a user gesture, or fall back
// to memory), which is why export exists and why it must work even when nothing
// durable does.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Blob } from 'node:buffer';

let S;
beforeAll(() => {
  const src = readFileSync('AlloFlowANTI.txt', 'utf8');
  const names = ['_alloCleanMailboxUrl', 'alloMailboxConfigExportPayload', 'alloParseMailboxConfigImport'];
  const parts = names.map((name) => {
    const start = src.search(new RegExp(`function ${name}\\(`));
    if (start < 0) throw new Error(`${name} not found`);
    let depth = 0, seen = false, end = -1;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
      if (src[i] === '{') { depth++; seen = true; }
      else if (src[i] === '}') { depth--; if (seen && depth === 0) { end = i + 1; break; } }
    }
    if (end < 0) throw new Error(`could not brace-match ${name}`);
    return src.slice(start, end);
  });
  // eslint-disable-next-line no-new-func
  S = new Function(`${parts.join('\n')}\n;return {${names.join(',')}};`)();
});

const GOOD_URL = 'https://script.google.com/macros/s/AKfycb-example/exec';
const hostArtifact = new vm.Script(readFileSync('host_handlers_module.js', 'utf8'), { filename: 'host_handlers_module.js' });
function shippedHandlers(deps, globals = {}) {
  const window = { React: {}, AlloModules: {} };
  hostArtifact.runInContext(vm.createContext({ window, Date, console: { log() {}, warn() {}, error() {} }, ...globals }));
  return window.AlloModules.HostHandlers(deps);
}
function canonicalDependencies(file, bindings) {
  const shell = readFileSync(file, 'utf8');
  const names = Object.keys(bindings);
  const getters = names.map(name => {
    const match = shell.match(new RegExp('get\\s+' + name + '\\(\\)\\s*\\{\\s*return\\s+' + name + ';?\\s*\\}'));
    expect(match, file + ': missing host dependency getter for ' + name).not.toBeNull();
    return match[0];
  });
  // Execute the actual shell getter definitions, then pass them to the shipped
  // module factory so extraction cannot silently disconnect its host services.
  return new Function(...names, 'return ({' + getters.join(',') + '});')(...Object.values(bindings));
}

describe('exporting a config', () => {
  it('carries what is needed to restore the deployment', () => {
    const out = S.alloMailboxConfigExportPayload({ url: GOOD_URL, admin: 'tok-123', v: 12 }, '2026-08-05T00:00:00.000Z');
    expect(out).toMatchObject({ v: 1, kind: 'alloflow-session-mailbox', url: GOOD_URL, admin: 'tok-123', scriptVersion: 12 });
  });

  it('exports nothing when there is nothing configured', () => {
    expect(S.alloMailboxConfigExportPayload(null, '')).toBeNull();
    expect(S.alloMailboxConfigExportPayload({ url: '' }, '')).toBeNull();
  });

  it('round-trips through import', () => {
    const payload = S.alloMailboxConfigExportPayload({ url: GOOD_URL, admin: 'tok-123', v: 12 }, '');
    const back = S.alloParseMailboxConfigImport(JSON.stringify(payload));
    expect(back).toEqual({ url: GOOD_URL, admin: 'tok-123', v: 12 });
  });
});

describe('importing is a trust boundary', () => {
  it('accepts a hand-edited file only if the URL still passes the real validator', () => {
    // Import runs the SAME check as manual entry, so a file cannot point
    // AlloFlow at an arbitrary origin.
    expect(S.alloParseMailboxConfigImport({ url: GOOD_URL, admin: 'a' })).toMatchObject({ url: GOOD_URL });
    for (const bad of [
      'https://evil.example.com/exec',
      'http://script.google.com/macros/s/x/exec',   // not https
      'javascript:alert(1)',
      '',
    ]) {
      expect(S.alloParseMailboxConfigImport({ url: bad, admin: 'a' }), bad).toBeNull();
    }
  });

  it('refuses junk rather than half-importing it', () => {
    for (const junk of [null, undefined, 'not json', '[]', '5', {}]) {
      expect(S.alloParseMailboxConfigImport(junk)).toBeNull();
    }
  });

  it('bounds the admin token instead of storing whatever the file says', () => {
    const out = S.alloParseMailboxConfigImport({ url: GOOD_URL, admin: 'x'.repeat(5000) });
    expect(out.admin.length).toBe(200);
  });

  it('tolerates a config exported before an admin token existed', () => {
    const out = S.alloParseMailboxConfigImport({ url: GOOD_URL });
    expect(out).toEqual({ url: GOOD_URL, admin: '', v: 0 });
  });
});

describe('the monolith wires it up', () => {
  const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

  it('treats the bridge as the source of truth and localStorage as a cache', () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      // Seeded from the cache so the UI is not blank, then corrected from the
      // bridge. On Canvas the cache is usually empty, so the hydrate is the one
      // that matters.
      expect(src, f).toContain('useState(() => alloReadMailboxConfigCache())');
      expect(src, f).toContain('alloLoadMailboxConfigDurable().then((durable)');
      // The old inline localStorage read would silently reintroduce the bug.
      expect(src, f).not.toContain("const admin = localStorage.getItem(ALLO_MB_ADMIN_KEY) || '';\n          const v =");
    }
  });

  it('writes durably when a mailbox is connected through the extracted handler', async () => {
    for (const f of COPIES) {
      const persist = vi.fn();
      const deps = canonicalDependencies(f, { alloPersistMailboxConfig: persist });
      Object.assign(deps, {
        mbUrlInput: GOOD_URL, mbAdminInput: 'tok-123', mbLive: { code: 'already-live' },
        ALLO_MB_URL_KEY: 'mailbox-url', ALLO_MB_ADMIN_KEY: 'mailbox-admin', ALLO_MB_VERSION_KEY: 'mailbox-version',
        _alloCleanMailboxUrl: S._alloCleanMailboxUrl,
        _alloMailboxCall: vi.fn(async (_url, request) => request.a === 'hello' ? { v: 12 } : { admin: true }),
        setMbBusy: vi.fn(), setMbStatus: vi.fn(), setMbAdminInput: vi.fn(), setMbConfig: vi.fn(), warnLog: vi.fn(),
      });
      const localStorage = { getItem: vi.fn(() => null), setItem: vi.fn() };
      await shippedHandlers(deps, { localStorage }).connectMailbox();
      expect(persist, f).toHaveBeenCalledOnce();
      expect(persist, f).toHaveBeenCalledWith({ url: GOOD_URL, admin: 'tok-123', v: 12 });
      expect(deps.setMbConfig, f).toHaveBeenCalledWith(expect.objectContaining({ url: GOOD_URL, admin: 'tok-123', v: 12 }));
      expect(localStorage.setItem, f).toHaveBeenCalledWith('mailbox-admin', 'tok-123');
      expect(deps.warnLog, f).not.toHaveBeenCalled();
    }
  });

  it('never lets a failed durable write break configuring a mailbox', () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      const fn = src.slice(src.indexOf('async function alloPersistMailboxConfig'));
      const body = fn.slice(0, fn.indexOf('\n}\n'));
      // The cache write comes FIRST and the bridge work is wrapped, so a bridge
      // in memory mode or waiting on a gesture cannot throw into the caller.
      expect(body.indexOf('alloWriteMailboxConfigCache'), f).toBeLessThan(body.indexOf('_alloGetCanvasDeviceStorage'));
      expect(body, f).toContain('catch (_) { return false; }');
    }
  });

  it('forgetting a mailbox clears the DURABLE copy, not just the cache', () => {
    // The bug the bridge work would otherwise have introduced: Forget cleared
    // localStorage only, so the next load's hydrate would restore the mailbox
    // from the bridge and it would come back from the dead.
    // The mailbox card (Forget button + handler) was extracted from ANTI into the share/session surfaces view module.
    for (const f of ['view_share_session_surfaces_source.jsx']) {
      const src = readFileSync(f, 'utf8');
      const forgetAt = src.indexOf('Forget mailbox');
      expect(forgetAt, f).toBeGreaterThan(0);
      // Look back at the handler that precedes the button label.
      const handler = src.slice(Math.max(0, forgetAt - 1200), forgetAt);
      expect(handler, f).toContain('alloPersistMailboxConfig(null)');
      expect(handler, f).not.toContain('localStorage.removeItem(ALLO_MB_URL_KEY)');
    }
  });

  it('exports an actual JSON file with the credential warning instead of a QR', async () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain('const exportMailboxConfig = useCallback(');
      expect(src, f).toContain('_alloHostHandlers().exportMailboxConfig(...__a)');
      expect(src, f).toContain('const importMailboxConfig = useCallback(');
      const addToast = vi.fn();
      const deps = canonicalDependencies(f, {
        alloMailboxConfigExportPayload: S.alloMailboxConfigExportPayload,
        mbConfig: { url: GOOD_URL, admin: 'tok-123', v: 12 }, addToast,
      });
      const anchor = { click: vi.fn() };
      const document = { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn(), removeChild: vi.fn() } };
      const URL = { createObjectURL: vi.fn(() => 'blob:local-mailbox-config'), revokeObjectURL: vi.fn() };
      const setTimeout = vi.fn();
      shippedHandlers(deps, { document, URL, Blob, setTimeout }).exportMailboxConfig();
      expect(document.createElement.mock.calls, f).toEqual([['a']]);
      expect(URL.createObjectURL, f).toHaveBeenCalledOnce();
      const blob = URL.createObjectURL.mock.calls[0][0];
      expect(blob.type).toBe('application/json');
      expect(JSON.parse(await blob.text())).toMatchObject({ v: 1, kind: 'alloflow-session-mailbox', url: GOOD_URL, admin: 'tok-123', scriptVersion: 12 });
      expect(anchor.download, f).toMatch(/^alloflow-mailbox-\d{4}-\d{2}-\d{2}\.json$/);
      expect(anchor.href).toBe('blob:local-mailbox-config');
      expect(anchor.click).toHaveBeenCalledOnce();
      expect(document.body.appendChild).toHaveBeenCalledWith(anchor);
      expect(document.body.removeChild).toHaveBeenCalledWith(anchor);
      // The credential stays in an explicit downloaded file, with a warning.
      expect(addToast, f).toHaveBeenCalledWith(expect.stringContaining('access key for your mailbox'), 'success');
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
      setTimeout.mock.calls[0][0]();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-mailbox-config');
    }
  });

  it('uses its own namespace so the config is visible and erasable', () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain("const ALLO_MB_CONFIG_NAMESPACE = 'mailbox_config';");
    }
  });
});
