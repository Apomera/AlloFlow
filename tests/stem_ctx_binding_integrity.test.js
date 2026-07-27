// Free-identifier crashes in STEM tools.
//
// `dev-tools/check_free_vars.cjs` only inspects the files its caller hands it,
// and that caller passes four pipeline *_source.jsx files — so all 129
// stem_lab tools sit outside the gate. Three real ReferenceErrors reached
// students through that gap:
//
//   watercycle  — ctx.addToast was never bound, yet addToast is called 14 times.
//                 On a CORRECT quiz answer the throw landed before awardStemXP
//                 on the next line: no toast, no XP, no streak bonus.
//   epidemic    — ctx.addToast likewise unbound, and clamp lived in the render
//                 closure while OUTBREAK_EVENTS (module-level data) called it,
//                 so every random event killed the event system mid-simulation.
//
// Event-handler throws do not reach a React error boundary, so all of this
// failed silently rather than visibly — which is why it survived.
//
// ★ `if (addToast)` is NOT a guard. A bare reference to an undeclared name
//   throws inside the if() itself; only `typeof x === 'function'` tolerates one.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('STEM tools bind every ctx helper they call', () => {
  // Helpers a tool may only use after binding them off ctx.
  const CTX_HELPERS = ['addToast', 'announceToSR', 'celebrate', 'awardXP'];

  for (const tool of ['stem_tool_watercycle.js', 'stem_tool_epidemic.js']) {
    it(tool + ' binds what it calls', () => {
      const src = read('stem_lab/' + tool);
      for (const name of CTX_HELPERS) {
        const called = new RegExp('(^|[^\\w.$])' + name + '\\s*\\(', 'm').test(src);
        if (!called) continue;
        const bound = new RegExp('(?:var|let|const)\\s+' + name + '\\s*=|\\b' + name + '\\s*=\\s*ctx\\.').test(src)
          || new RegExp('function\\s+' + name + '\\b').test(src);
        expect(bound, tool + ' calls ' + name + '() but never binds it — ReferenceError at runtime').toBe(true);
      }
    });
  }
});

describe('epidemic — module-level event data can reach its helpers', () => {
  const src = read('stem_lab/stem_tool_epidemic.js');

  function events(withModuleClamp) {
    const start = src.indexOf('var OUTBREAK_EVENTS = [');
    const arr = src.slice(start, src.indexOf('];', start) + 2);
    const sandbox = { Math };
    const prelude = withModuleClamp ? 'function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}\n' : '';
    vm.runInNewContext(prelude + arr + '\nout = OUTBREAK_EVENTS;', sandbox);
    return sandbox.out;
  }
  const state = () => ({
    groups: [{ id: 'workingAge', trust: 50, infected: 10 }, { id: 'elderly', trust: 50, infected: 10 }],
    activeMods: []
  });

  it('declares clamp at module scope, where the event data lives', () => {
    const clampAt = src.indexOf('function clamp(');
    const eventsAt = src.indexOf('var OUTBREAK_EVENTS = [');
    expect(clampAt, 'no clamp declaration found').toBeGreaterThan(-1);
    expect(clampAt, 'clamp must be declared before the event data that calls it')
      .toBeLessThan(eventsAt);
  });

  it('every event applies without throwing', () => {
    for (const ev of events(true)) {
      if (typeof ev.apply !== 'function') continue;
      expect(() => ev.apply(state()), 'event "' + ev.id + '" threw').not.toThrow();
    }
  });

  it('clamping is real, not a no-op', () => {
    // publicProtest: working-age trust −14, everyone else −7, floored at 0.
    const s = state();
    events(true).find((e) => e.id === 'publicProtest').apply(s);
    expect(s.groups[0].trust).toBe(36);
    expect(s.groups[1].trust).toBe(43);
    // And the floor holds when the hit would go negative.
    const low = state();
    low.groups.forEach((g) => { g.trust = 3; });
    events(true).find((e) => e.id === 'publicProtest').apply(low);
    for (const g of low.groups) expect(g.trust).toBeGreaterThanOrEqual(0);
  });

  it('would have thrown without the module-scope clamp', () => {
    // Pins WHY the declaration has to sit where it does.
    expect(() => events(false).find((e) => e.id === 'publicProtest').apply(state()))
      .toThrow(/clamp is not defined/);
  });
});
