// Contact Tracing was mouse-only.
//
// The network graph rendered each person as a bare <g onClick> — no role, no tabIndex,
// no key handler, no accessible name — so a keyboard or screen-reader student could not
// trace a single contact in a sub-tool whose entire subject is following a chain. This
// is the same shape as the Moon Mission EVA and the music tool before them, and nothing
// in the suite would have caught it.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// A hand-built deterministic network: P0 (id 0) is the first case, A (id 1) is a contact
// of P0 and infected, B (id 2) is a contact of A, C (id 3) is connected to nobody traced.
const NETWORK = {
  patientZero: 0,
  solution: [0, 1],
  chain: [{ from: 0, to: 1 }],
  edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }],
  nodes: [
    { id: 0, x: 100, y: 100, state: 'infected', name: 'Person A', isPatientZero: true },
    { id: 1, x: 200, y: 100, state: 'unknown', name: 'Person B' },
    { id: 2, x: 300, y: 100, state: 'unknown', name: 'Person C' },
    { id: 3, x: 400, y: 100, state: 'unknown', name: 'Person D' },
  ],
};

function renderTrace(extra) {
  return renderTool('epidemicSim', {
    epidemicSim: Object.assign({
      tab: 'contacttrace',
      ctNetwork: NETWORK,
      ctRevealed: [0],
      ctGuesses: 0,
      ctScore: 0,
      ctComplete: false,
    }, extra || {}),
  });
}

beforeAll(() => { resetStemLab(); });
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_epidemic.js', 'epidemicSim');
});

describe('Contact Tracing keyboard access', () => {
  it('a traceable person is a focusable button, not a bare click target', () => {
    const html = renderTrace();
    // Person B (id 1) is in contact with the revealed, confirmed case P0.
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
  });

  it('every person in the network carries an accessible name', () => {
    const html = renderTrace();
    expect(html).toContain('Patient Zero');
    expect(html).toMatch(/aria-label="Person B[^"]*"/);
    expect(html).toMatch(/aria-label="Person C[^"]*"/);
  });

  it('the name says whether the person can be tested and why', () => {
    const html = renderTrace();
    // In contact with a confirmed case -> actionable.
    expect(html).toMatch(/Person B: not yet traced, in contact with a confirmed case/);
    // Not in contact with any confirmed case -> explicitly not actionable.
    expect(html).toMatch(/Person D: not yet traced, no known contact/);
  });

  it('people who cannot be tested are not focusable', () => {
    const html = renderTrace();
    // Exactly one person (B) is traceable from the seeded state, so exactly one
    // tabbable node should exist.
    expect((html.match(/role="button"[^>]*tabindex="0"/g) || []).length).toBe(1);
  });

  it('the graph itself is announced with its progress', () => {
    const html = renderTrace();
    expect(html).toMatch(/aria-label="Contact network: 4 people, 1 of 2 infections traced/);
  });

  it('a completed trace exposes no stale button affordances', () => {
    const html = renderTrace({ ctRevealed: [0, 1], ctComplete: true });
    expect((html.match(/role="button"[^>]*tabindex="0"/g) || []).length).toBe(0);
  });
});

describe('Contact Tracing framing', () => {
  it('ruling someone out is not presented as a mistake', () => {
    const html = renderTrace({ ctFeedback: '➖ Clear — ruled out, and that narrows the search.' });
    expect(html).toContain('ruled out');
    // The old copy flagged a correct exclusion with a red ❌.
    expect(html).not.toContain('❌ Clear');
  });
});
