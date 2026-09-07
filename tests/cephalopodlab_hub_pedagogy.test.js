// Cephalopod Lab Hub — behaviour pins for the rebuilt landing page.
//
// The Hub is the first screen every student sees, and it used to be three
// text cards plus two buttons. It now carries a guided path, a lab record,
// a fact-or-metaphor retrieval check, and an area explorer, all driven by the
// tool's existing state. These tests pin the INVARIANTS (what state produces
// what affordance), not the copy, so a wording pass will not red them.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';

function renderHub(data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection: 'hub', ...data },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Cephalopod Lab Hub', () => {
  it('renders the guided path with the first step as Next when nothing is done', () => {
    const hub = renderHub();
    const bar = hub.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('5');
    const steps = Array.from(hub.querySelectorAll('ol li button'));
    expect(steps).toHaveLength(5);
    expect(steps[0].className).toContain('cl-hub-next');
    expect(steps[0].getAttribute('aria-label')).toMatch(/Next$/);
  });

  it('marks path steps done from viewed flags, hunts, and quiz answers, and moves Next forward', () => {
    const hub = renderHub({
      clViewedField: true,
      clViewedAnatomy: true,
      clViewedCamo: true,
      huntsAttempted: 2,
      huntsSuccessful: 1,
    });
    expect(hub.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('4');
    const steps = Array.from(hub.querySelectorAll('ol li button'));
    expect(steps.slice(0, 4).every((b) => /Done$/.test(b.getAttribute('aria-label')))).toBe(true);
    expect(steps[4].className).toContain('cl-hub-next');
    // the quiz step completes on any recorded answer
    const done = renderHub({ quizAnswers: { q1_anatomy_class: 0 } });
    const last = done.querySelectorAll('ol li button')[4];
    expect(last.getAttribute('aria-label')).toMatch(/Done$/);
  });

  it('fact-or-metaphor shows feedback and an evidence link only after a pick, and grades it', () => {
    const fresh = renderHub();
    const groups = fresh.querySelectorAll('[role="group"][aria-labelledby^="cl-hub-check-"]');
    expect(groups).toHaveLength(5);
    expect(fresh.textContent).not.toMatch(/correct so far/);

    const answered = renderHub({ hubCheckAnswers: { nine: 'metaphor', blue: 'metaphor' } });
    const pressed = Array.from(answered.querySelectorAll('[aria-pressed="true"]'));
    expect(pressed).toHaveLength(2);
    expect(answered.textContent).toMatch(/1 \/ 2 correct so far/);
    expect(answered.textContent).toMatch(/Correct\./);
    expect(answered.textContent).toMatch(/Not quite\./);
    const evidenceLinks = Array.from(answered.querySelectorAll('button')).filter((b) => /See the evidence in/.test(b.textContent));
    expect(evidenceLinks).toHaveLength(2);
  });

  it('lists every topic area except Start with a section count and explored count', () => {
    const hub = renderHub({ clViewedAnatomy: true, clViewedSkin: true });
    const areas = Array.from(hub.querySelectorAll('button[aria-label*=" sections, "]'));
    expect(areas).toHaveLength(12);
    expect(areas.some((b) => /^Start:/.test(b.getAttribute('aria-label')))).toBe(false);
    const biology = areas.find((b) => /^Biology:/.test(b.getAttribute('aria-label')));
    expect(biology.getAttribute('aria-label')).toMatch(/2 explored$/);
  });

  it('keeps the hero octopus decorative and respects reduced motion in its stylesheet', () => {
    const hub = renderHub();
    const svg = hub.querySelector('svg.cl-hub-octo');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const css = hub.querySelector('style').textContent;
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]*\.cl-hub-octo[^}]*animation: none/);
  });

  it('pins light ink on the root so host light themes cannot hide body copy on the dark ground', () => {
    const hub = renderHub();
    const root = hub.querySelector('[role="region"]');
    expect(root.getAttribute('style')).toMatch(/--allo-stem-text:\s*#e2e8f0/);
    expect(root.getAttribute('style')).toMatch(/--allo-stem-text-soft:\s*#94a3b8/);
  });
});
