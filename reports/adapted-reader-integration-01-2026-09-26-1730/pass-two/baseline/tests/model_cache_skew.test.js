// The local-resource panel must survive a monolith/module version skew.
//
// AlloFlowANTI.txt and allo_commands_module.js version INDEPENDENTLY: the module
// is fetched from the CDN under its own ?v= pin, so a page can easily run a
// monolith that is newer than the module it loads. When that happened,
// `Promise.resolve(mc.hasKokoro()).catch(() => false)` threw
// "mc.hasKokoro is not a function" as an UNHANDLED REJECTION and took the panel
// down, because .catch() covers a rejected promise and this throws
// synchronously, before any promise exists.
//
// hasKokoro itself was never missing: it and its caller shipped in the same
// commit. Only the deployed module lagged. That is a normal condition here, so
// the monolith has to tolerate it rather than crash.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

describe('model-cache calls tolerate an older module', () => {
  for (const f of COPIES) {
    it(`${f} routes every probe through the guard`, () => {
      const src = readFileSync(f, 'utf8');
      expect(src, 'the guard exists').toContain('const _mcCall = (mc, name, fallback) =>');
      // It must check the METHOD, not just that the cache object is present.
      expect(src).toMatch(/typeof mc\[name\] !== 'function'/);

      for (const [method, fallback] of [['hasWhisper', 'false'], ['hasKokoro', 'false'], ['cachedBytes', '0']]) {
        expect(src, `${method} goes through _mcCall`).toContain(`_mcCall(mc, '${method}', ${fallback})`);
        // The unguarded shape must be gone, or the skew crash comes straight back.
        expect(src, `${method} is not called directly`).not.toContain(`Promise.resolve(mc.${method}())`);
      }
    });

    it(`${f} explains itself when a download cannot run`, () => {
      const src = readFileSync(f, 'utf8');
      // A download is user-initiated, so silently doing nothing would read as a
      // broken button.
      expect(src).toContain("if (typeof mc.prefetchWhisper !== 'function') {");
      expect(src).toMatch(/older copy of the voice modules/);
    });
  }

  it('the method the crash named really does exist in the command module', () => {
    // Guards the opposite mistake: concluding "add the missing function" when
    // the function was there all along and only the deployed copy was stale.
    const mod = readFileSync('allo_commands_module.js', 'utf8');
    expect(mod).toMatch(/hasKokoro: function\(\)/);
  });
});
