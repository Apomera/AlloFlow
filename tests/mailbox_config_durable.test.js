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
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

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

  it('writes durably when a mailbox is connected', () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain('alloPersistMailboxConfig({ url: execUrl, admin,');
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
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      const forgetAt = src.indexOf('Forget mailbox');
      expect(forgetAt, f).toBeGreaterThan(0);
      // Look back at the handler that precedes the button label.
      const handler = src.slice(Math.max(0, forgetAt - 1200), forgetAt);
      expect(handler, f).toContain('alloPersistMailboxConfig(null)');
      expect(handler, f).not.toContain('localStorage.removeItem(ALLO_MB_URL_KEY)');
    }
  });

  it('offers a file export, and does not default to a QR', () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain('const exportMailboxConfig = useCallback(');
      expect(src, f).toContain('const importMailboxConfig = useCallback(');
      // The payload carries a never-expiring credential, and a QR is something
      // anyone in the room can photograph off a projector.
      expect(src, f).toContain('alloflow-mailbox-');
      expect(src, f).toMatch(/access key for your mailbox/);
    }
  });

  it('uses its own namespace so the config is visible and erasable', () => {
    for (const f of COPIES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain("const ALLO_MB_CONFIG_NAMESPACE = 'mailbox_config';");
    }
  });
});
