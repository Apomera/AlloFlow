// EvoLab's live region must not talk over itself, and the milestone it announces
// must be the one that actually happened.
//
// Background (2026-09-15). EvoLab has one polite live region and 60 announce() call
// sites. Four of them report every generation of a simulation and are guarded by a
// `silent` flag. Measuring one press of each lab's "×10" button showed the guard was
// not holding everywhere:
//
//     selection sandbox : 11 announcements   (the ×10 button called stepGeneration()
//                                             with no argument, so silent was undefined)
//     speciation        :  9, seven of them the SAME milestone sentence
//     beak lab          :  2   (already correct: stepYear(yi < 4))
//     coevolution       :  0   (already correct: stepGeneration(true))
//
// For a screen-reader user those do not overwrite each other — they queue and play in
// full, so one keypress produced close to a minute of speech.
//
// The speciation case was also a CORRECTNESS bug, not only a noise one. Its
// "first time only" guard read `speciated`, a plain useState value, inside a ten-pass
// synchronous loop, so it was stale `false` on every pass. setSpeciatedAt() was
// therefore overwritten each time and the milestone card reported the LAST generation
// of the burst. Measured over 12 runs before the fix: the card said "generation 10"
// every single time while the real crossing ranged from generation 2 to 5. A student
// comparing settings to see which diverges faster was reading a constant.
//
// Instrument note: a MutationObserver is the WRONG tool here. Its records are
// delivered as a microtask, so it reports 0 inside a synchronous act() block even
// though every write happened. Patch the live region's textContent setter instead.
import { describe, expect, it, beforeEach } from 'vitest';
import { loadTool, makeCtx, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;

beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab'); });

function mount(view) {
  const cfg = window.StemLab._registry.evoLab;
  const host = document.createElement('div');
  document.body.appendChild(host);
  function Host() {
    const [d, sd] = React.useState({ evoLab: { view } });
    const ctx = makeCtx({
      toolData: d,
      update: (k, v) => sd((p) => ({ ...p, evoLab: { ...p.evoLab, [k]: v } }))
    });
    return cfg.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Host)); });
  return { host, root, cleanup: () => { act(() => root.unmount()); host.remove(); } };
}

// Count every write to the live region, including writes that overwrite each other
// inside a single synchronous burst — those are exactly the ones a screen reader
// queues and reads out one after another.
function recordAnnouncements(fn) {
  const lr = document.getElementById('allo-live-evolab');
  if (!lr) throw new Error('EvoLab live region is missing; announcements would go nowhere');
  const said = [];
  const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  Object.defineProperty(lr, 'textContent', {
    configurable: true,
    get() { return desc.get.call(this); },
    set(v) { said.push(String(v)); desc.set.call(this, v); }
  });
  try { fn(); } finally { delete lr.textContent; }
  return said;
}

function button(host, re) {
  const b = [...host.querySelectorAll('button')].find((x) => re.test(x.textContent || ''));
  if (!b) throw new Error('no button matching ' + re + '; buttons were: ' +
    [...host.querySelectorAll('button')].map((x) => (x.textContent || '').trim()).filter(Boolean).join(' | '));
  return b;
}

describe('EvoLab live region does not flood on multi-step buttons', () => {
  // One press advances ten generations. A per-generation report for each of them is
  // the flood this guards against. A small allowance is left for the genuinely
  // event-driven announcements (an experiment detected, a challenge met, the final
  // state) which SHOULD still fire.
  const CASES = [
    ['selectionSandbox', /Step 10/i],
    ['speciation', /Step 10/i],
    ['coevolution', /Step 10/i],
    ['beakLab', /Run 5 Years/i]
  ];

  for (const [view, re] of CASES) {
    it(view + ': one multi-step press stays under the flood threshold', () => {
      const { host, cleanup } = mount(view);
      try {
        const said = recordAnnouncements(() => { act(() => { button(host, re).click(); }); });
        // Before the fix: 11 (sandbox) and 9 (speciation). The correct labs measured 0-2.
        expect(said.length, view + ' announced:\n  ' + said.join('\n  ')).toBeLessThanOrEqual(4);
        // And specifically: no per-generation running commentary.
        const perGen = said.filter((sd) => /^Generation \d+\./.test(sd) || /^Year \d+\b/.test(sd));
        expect(perGen.length, view + ' per-generation lines:\n  ' + perGen.join('\n  ')).toBeLessThanOrEqual(1);
      } finally { cleanup(); }
    });
  }

  it('single-step buttons still announce — the guard must not silence everything', () => {
    // The risk of a "fix" that passes silent everywhere: the lab goes mute and a
    // screen-reader user gets nothing at all from a deliberate single step.
    const { host, cleanup } = mount('selectionSandbox');
    try {
      const said = recordAnnouncements(() => { act(() => { button(host, /Step 1 Generation/i).click(); }); });
      expect(said.some((sd) => /^Generation \d+\./.test(sd))).toBe(true);
    } finally { cleanup(); }
  });
});

describe('EvoLab speciation milestone reports the generation it happened', () => {
  it('announces the milestone once and the card agrees with it', () => {
    // Ten trials: the model is stochastic, so this both pins the behaviour and shows
    // the crossing generation VARIES. Before the fix the card read 10 every time.
    const seenGenerations = new Set();
    for (let trial = 0; trial < 10; trial++) {
      resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
      const { host, cleanup } = mount('speciation');
      try {
        const said = recordAnnouncements(() => { act(() => { button(host, /Step 10/i).click(); }); });
        const milestones = said.filter((sd) => /milestone reached at generation \d+/.test(sd));
        expect(milestones.length, 'milestone announced ' + milestones.length + ' times').toBeLessThanOrEqual(1);
        if (milestones.length === 1) {
          const announced = milestones[0].match(/generation (\d+)/)[1];
          const card = (host.textContent || '').match(/At generation (\d+), the overlap proxy/);
          expect(card, 'milestone announced but no card shown').toBeTruthy();
          expect(card[1], 'card generation must match the announced one').toBe(announced);
          // The crossing must be the FIRST one, so it cannot be the last generation
          // of the burst every time — that was the symptom of the stale read.
          seenGenerations.add(announced);
        }
      } finally { cleanup(); }
    }
    // If every run reported the same generation, the "first crossing" is not being
    // captured — that is the regression this whole block exists to catch.
    expect(seenGenerations.size, 'crossing generation never varied: ' + [...seenGenerations].join(',')).toBeGreaterThan(1);
  }, 30000);

  it('a reset lets the milestone fire again', () => {
    // A ref-based guard that is not cleared on reset would make the milestone
    // unreachable for the rest of the session.
    const { host, cleanup } = mount('speciation');
    try {
      act(() => { button(host, /Step 10/i).click(); });
      act(() => { button(host, /Reset/i).click(); });
      const said = recordAnnouncements(() => { act(() => { button(host, /Step 10/i).click(); }); });
      expect(said.some((sd) => /milestone reached at generation \d+/.test(sd)),
        'after a reset the milestone should be reachable again; got:\n  ' + said.join('\n  ')).toBe(true);
    } finally { cleanup(); }
  });
});
