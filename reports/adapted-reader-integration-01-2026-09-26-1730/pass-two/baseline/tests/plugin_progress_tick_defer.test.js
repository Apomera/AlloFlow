// Render-safe plugin-progress tick (2026-07-03).
// The STEM Lab + SEL Hub each listen for the 'allo-plugins-changed' event and
// bump a "tick" useState to re-render the tool-tile grid as plugins stream in.
// dispatchEvent runs listeners SYNCHRONOUSLY, so a direct setState in the
// handler updates the hub mid-render if the event is ever dispatched during a
// host render → React "Cannot update a component while rendering a different
// component" (reported against StemLabModal / AlloFlowContent). The handlers
// now defer the tick to a microtask. This pins that so a refactor can't
// reintroduce the synchronous setState.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

// Pull the exact 'allo-plugins-changed' useEffect handler body out of a module.
function pluginChangedHandler(src) {
  const anchor = src.indexOf("addEventListener('allo-plugins-changed'");
  expect(anchor, "allo-plugins-changed listener present").toBeGreaterThan(-1);
  // The handler is defined just above the addEventListener call; grab a window
  // around it that includes the setState line.
  return src.slice(Math.max(0, anchor - 700), anchor);
}

const cases = [
  ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js'],
  ['sel_hub/sel_hub_module.js', 'desktop/web-app/public/sel_hub/sel_hub_module.js'],
];

describe('allo-plugins-changed tick is deferred out of render', () => {
  for (const [rootFile, mirrorFile] of cases) {
    it(`${rootFile}: tick is wrapped in a microtask, not called synchronously`, () => {
      const body = pluginChangedHandler(read(rootFile));
      // The setState must be inside a Promise.resolve().then(...) microtask.
      expect(body).toMatch(/Promise\.resolve\(\)\.then\(function\s*\(\)\s*\{\s*_setPluginProgressTick/);
      // And NOT called bare as the handler's own statement (the old bug).
      expect(body).not.toMatch(/\n\s*_setPluginProgressTick\(function\(t\) \{ return t \+ 1; \}\);\s*\n\s*\};/);
    });
    it(`${rootFile}: deployed mirror matches root (no drift)`, () => {
      expect(read(mirrorFile)).toBe(read(rootFile));
    });
  }
});
