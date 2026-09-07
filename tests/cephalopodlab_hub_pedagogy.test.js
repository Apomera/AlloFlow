// Cephalopod Lab Hub — behaviour pins for the rebuilt landing page.
//
// The Hub is the first screen every student sees, and it used to be three
// text cards plus two buttons. It now carries a guided path, a lab record,
// a fact-or-metaphor retrieval check, and an area explorer, all driven by the
// tool's existing state. These tests pin the INVARIANTS (what state produces
// what affordance), not the copy, so a wording pass will not red them.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

// ── Field Guide (guided-path step 1) ──
function renderField(data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection: 'field', fieldGuideSpeciesId: 'mimicOcto', ...data },
  });
  return container;
}

describe('Cephalopod Lab Field Guide', () => {
  it('filters the picker by group and shows the count on every filter chip', () => {
    const all = renderField();
    const allCards = all.querySelectorAll('button[aria-pressed]');
    const filtered = renderField({ fieldGuideGroup: 'squid' });
    const squidCards = Array.from(filtered.querySelectorAll('button[aria-pressed]'))
      .filter((b) => /^(?!All|Octopus|Squid|Cuttlefish|Nautilus)/.test(b.textContent.trim()));
    expect(squidCards.length).toBeGreaterThan(0);
    expect(squidCards.length).toBeLessThan(allCards.length);
    const chips = Array.from(filtered.querySelectorAll('[role="group"][aria-label="Filter by group"] button'));
    expect(chips).toHaveLength(5);
    expect(chips.every((c) => /\d+$/.test(c.textContent.trim()))).toBe(true);
    expect(chips.find((c) => /Squid\s+\d+$/.test(c.textContent.trim())).getAttribute('aria-pressed')).toBe('true');
  });

  it('asks an observation question built from the species data before the notes', () => {
    const c = renderField();
    const text = c.textContent;
    const observeAt = text.indexOf('Observe first');
    const notesAt = text.indexOf('Discovered 1998 off Sulawesi');
    expect(observeAt).toBeGreaterThan(-1);
    expect(notesAt).toBeGreaterThan(observeAt);
    expect(text).toMatch(/hunts in Sandy Bottom, Estuary \/ Muck/);
    expect(text).toMatch(/tactics are Mimicry, Ambush/);
  });

  it('renders prey chips with their sim difficulty and prev/next browsing', () => {
    const c = renderField();
    expect(c.textContent).toMatch(/Crab · 3\/10/);
    expect(c.querySelector('button[aria-label="Previous species"]')).not.toBeNull();
    expect(c.querySelector('button[aria-label="Next species"]')).not.toBeNull();
    expect(c.textContent).toMatch(/2 \/ 15/);
  });

  it('shows the comparison table only when a second species is chosen, with labelled select and captioned table', () => {
    const closed = renderField();
    expect(closed.querySelector('table')).toBeNull();
    const select = closed.querySelector('select#cl-fg-compare');
    expect(select).not.toBeNull();
    expect(closed.querySelector('label[for="cl-fg-compare"]')).not.toBeNull();
    // the selected species is never offered as its own comparison partner
    expect(Array.from(select.options).some((o) => o.value === 'mimicOcto')).toBe(false);

    const open = renderField({ fieldGuideCompareId: 'cuttlefish' });
    const table = open.querySelector('table');
    expect(table).not.toBeNull();
    expect(table.querySelector('caption')).not.toBeNull();
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
    expect(table.querySelectorAll('tbody th[scope="row"]').length).toBeGreaterThanOrEqual(9);
    expect(open.textContent).toMatch(/Only this one: Polychaete Worm/);
    expect(open.textContent).toMatch(/shared: Crab, Small Fish/);
  });

  it('offers onward links that depend on the species: body plan for coleoids, hunt only for playable ones', () => {
    const mimic = renderField();
    const labels = (c) => Array.from(c.querySelectorAll('button')).map((b) => b.textContent.trim());
    expect(labels(mimic).some((t) => /See the body plan in 3D/.test(t))).toBe(true);
    expect(labels(mimic).some((t) => /Hunt as this species/.test(t))).toBe(true);
    const nautilus = renderField({ fieldGuideSpeciesId: 'nautilus' });
    expect(labels(nautilus).some((t) => /See the body plan in 3D/.test(t))).toBe(false);
    const dayOcto = renderField({ fieldGuideSpeciesId: 'dayOcto' });
    expect(labels(dayOcto).some((t) => /Hunt as this species/.test(t))).toBe(false);
  });
});

// ── Camouflage Lab (guided-path step 3) ──
function renderCamo(data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection: 'camo', ...data },
  });
  return container;
}

describe('Cephalopod Lab Camouflage Lab', () => {
  it('hides the target slider numbers by default and reveals them on request', () => {
    const hidden = renderCamo({ camoScene: 'sand' });
    expect(hidden.textContent).toMatch(/Settings hidden/);
    expect(hidden.textContent).not.toMatch(/C:30 I:10 L:70/);
    const shown = renderCamo({ camoScene: 'sand', camoRevealTarget: true });
    expect(shown.textContent).toMatch(/C:30 I:10 L:70/);
  });

  it('coaches the furthest-off layers in words, with direction, and goes quiet when close', () => {
    // sand target: chro 30, irid 10, leuc 70
    const far = renderCamo({ camoScene: 'sand', camoChromatophore: 90, camoIridophore: 10, camoLeucophore: 10, camoPattern: 'uniform' });
    const items = Array.from(far.querySelectorAll('ul[aria-label="Layer coaching"] li')).map((li) => li.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/^Chromatophores too much pigment/);
    expect(items[1]).toMatch(/^Leucophores too dim/);
    expect(far.textContent).not.toMatch(/\b30\b.*\b10\b.*\b70\b/);
    const close = renderCamo({ camoScene: 'sand', camoChromatophore: 32, camoIridophore: 12, camoLeucophore: 68, camoPattern: 'uniform' });
    expect(close.querySelector('ul[aria-label="Layer coaching"]')).toBeNull();
  });

  it('shows the predator-eye view only when toggled and tracks the four-scene challenge from camoBest', () => {
    const off = renderCamo();
    expect(off.textContent).not.toMatch(/Can you still find the animal/);
    const on = renderCamo({ camoSquint: true, camoBest: { sand: 91, kelp: 62 } });
    expect(on.textContent).toMatch(/Can you still find the animal/);
    expect(on.textContent).toMatch(/1 \/ 4 done/);
    const sand = on.querySelector('button[aria-label^="Sandy bottom: best 91"]');
    expect(sand.getAttribute('aria-label')).toMatch(/invisible$/);
    const kelp = on.querySelector('button[aria-label^="Kelp forest: best 62"]');
    expect(kelp.getAttribute('aria-label')).not.toMatch(/invisible$/);
  });
});

// ── Quiz (guided-path step 5) ──
function renderQuiz(data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection: 'quiz', ...data },
  });
  return container;
}

describe('Cephalopod Lab Quiz', () => {
  it('renders one progress dot per question with state labels and marks the current one', () => {
    const c = renderQuiz({ quizIdx: 2, quizAnswers: { q1_anatomy_class: 0 } });
    const dots = Array.from(c.querySelectorAll('[role="group"][aria-label="Quiz progress"] button'));
    expect(dots).toHaveLength(40);
    expect(dots.filter((b) => /: unanswered$/.test(b.getAttribute('aria-label')))).toHaveLength(39);
    expect(dots[0].getAttribute('aria-label')).toMatch(/: (correct|incorrect)$/);
    expect(dots[2].getAttribute('aria-current')).toBe('true');
    expect(c.textContent).toMatch(/1 \/ 40 answered/);
  });

  it('offers a revisit link to the teaching section only after the question is answered', () => {
    const before = renderQuiz({ quizIdx: 0 });
    expect(before.textContent).not.toMatch(/This is taught in/);
    const after = renderQuiz({ quizIdx: 0, quizAnswers: { q1_anatomy_class: 0 } });
    expect(after.textContent).toMatch(/This is taught in Body plan & physiology/);
    expect(Array.from(after.querySelectorAll('button')).some((b) => /^Revisit Body Plan/.test(b.textContent.trim()))).toBe(true);
  });

  it('recap groups results by area, weakest first, with a captioned table and a retake-missed button', () => {
    const src = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
    const seg = src.slice(src.indexOf('var QUIZ_QUESTIONS = ['), src.indexOf('\n      ];', src.indexOf('var QUIZ_QUESTIONS = [')));
    const ids = Array.from(seg.matchAll(/id: '([a-z0-9_]+)'/g)).map((m) => m[1]);
    expect(ids).toHaveLength(40);
    const answers = {};
    ids.forEach((id) => { answers[id] = 0; });
    const c = renderQuiz({ quizShowAll: true, quizAnswers: answers });
    const table = c.querySelector('table');
    expect(table.querySelector('caption')).not.toBeNull();
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const pcts = rows.map((r) => { const m = r.textContent.match(/(\d+) \/ (\d+)/); return Number(m[1]) / Number(m[2]); });
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThanOrEqual(pcts[i - 1]);
    expect(c.textContent).toMatch(/Retake the \d+ missed/);
    expect(c.querySelector('svg[role="img"][aria-label^="Score "]')).not.toBeNull();
  });
});

// ── Evasion Sim strike lane ──
function renderEvasion(data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection: 'evasion', evasionPhase: 'execute', evasionSpeciesId: 'commonOcto', evasionPredatorId: 'reef-shark', evasionTacticId: 'ink-flee', ...data },
  });
  return container;
}

describe('Cephalopod Lab Evasion Sim strike lane', () => {
  it('is one focusable lane whose label narrates the phase: ready, waiting, strike, escaped', () => {
    const lane = (c) => c.querySelector('button[aria-label^="Strike lane."]');
    expect(lane(renderEvasion()).getAttribute('aria-label')).toMatch(/Press to begin/);
    expect(lane(renderEvasion({ _evasionArmed: true })).getAttribute('aria-label')).toMatch(/wait for the lunge/);
    expect(lane(renderEvasion({ _evasionArmed: true, _evasionShowGo: true })).getAttribute('aria-label')).toMatch(/STRIKE/);
    const done = lane(renderEvasion({ evasionReactionMs: 180 }));
    expect(done.getAttribute('aria-label')).toMatch(/Escaped/);
    expect(done.hasAttribute('disabled')).toBe(true);
  });

  it('animates the predator approach only while armed, and the lunge only on GO', () => {
    const idle = renderEvasion();
    expect(idle.querySelector('.cl-ev-pred-approach')).toBeNull();
    expect(idle.querySelector('.cl-ev-pred-lunge')).toBeNull();
    const armed = renderEvasion({ _evasionArmed: true, _evasionApproachMs: 1234 });
    const pred = armed.querySelector('.cl-ev-pred-approach');
    expect(pred).not.toBeNull();
    expect(pred.getAttribute('style')).toMatch(/--cl-ev-ms:\s*1234ms/);
    const go = renderEvasion({ _evasionArmed: true, _evasionShowGo: true });
    expect(go.querySelector('.cl-ev-pred-lunge')).not.toBeNull();
    expect(go.querySelector('.cl-ev-flash')).not.toBeNull();
    const css = go.querySelector('style').textContent;
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]*animation: none/);
  });

  it('reports false starts and explains the cost; shows the reaction scale with reference bands after an escape', () => {
    const fs2 = renderEvasion({ _evasionFalseStarts: 2 });
    expect(fs2.textContent).toMatch(/2 false starts/);
    expect(fs2.textContent).toMatch(/bolting early burns energy/);
    const done = renderEvasion({ evasionReactionMs: 180 });
    const scale = done.querySelector('[role="img"][aria-label^="Reaction scale"]');
    expect(scale).not.toBeNull();
    expect(scale.getAttribute('aria-label')).toMatch(/yours 180 ms/);
    expect(done.textContent).toMatch(/cephalopod 25–150/);
    expect(done.querySelector('.cl-ev-ink')).not.toBeNull();
    expect(Array.from(done.querySelectorAll('button')).some((b) => /See result/.test(b.textContent))).toBe(true);
  });
});

// ── Jet Propulsion Lab live schematic + Day in the Life sky band ──
describe('Cephalopod Lab Jet Lab schematic and Day sky band', () => {
  const renderJet = (data = {}) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'jet', jetSpeciesId: 'humboldt', ...data } });
    return c;
  };
  it('draws the jet from the computed numbers and names them for screen readers', () => {
    const c = renderJet({ jetContractionKPa: 80, jetSiphonDiameter: 22, jetMantleVolume: 400 });
    const svg = c.querySelector('svg[aria-label^="Humboldt Squid: jet velocity"]');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toMatch(/documented top speed 25 m\/s, siphon 22 mm, mantle 400 mL/);
    const plume = svg.querySelector('polygon.cl-jet-plume');
    expect(plume).not.toBeNull();
    // higher pressure -> faster jet -> longer plume
    const lenOf = (el) => Number(el.getAttribute('points').split(' ')[1].split(',')[0]);
    const slow = renderJet({ jetContractionKPa: 20 }).querySelector('polygon.cl-jet-plume');
    expect(lenOf(plume)).toBeGreaterThan(lenOf(slow));
    const meters = c.querySelectorAll('[role="meter"][aria-label*="m/s"]');
    expect(meters).toHaveLength(2);
    expect(c.querySelector('style').textContent).toMatch(/prefers-reduced-motion: reduce[^}]*cl-jet-mantle[^}]*animation: none/);
  });
  it('gives the nautilus a shell instead of arms', () => {
    const c = renderJet({ jetSpeciesId: 'nautilus' });
    const svg = c.querySelector('svg[aria-label^="Chambered Nautilus"]');
    expect(svg.querySelectorAll('circle[r="50"]')).toHaveLength(1);
    const humboldt = renderJet().querySelector('svg[aria-label^="Humboldt"]');
    expect(humboldt.querySelectorAll('circle[r="50"]')).toHaveLength(0);
  });

  const renderDay = (done) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'day', dayActive: true, daySpeciesId: 'commonOcto', dayEncountersDone: done,
      dayCurrentEncounter: { type: 'hunt', emoji: '🦀', title: 'Crab', detail: 'A crab.', options: [{ id: 'ambush', label: 'Ambush' }] } } });
    return c;
  };
  it('maps encounter progress onto a dawn-to-night sky with a labelled progressbar', () => {
    const labelAt = (n) => renderDay(n).querySelector('[role="progressbar"][aria-label^="Day progress"]').getAttribute('aria-label');
    expect(labelAt(0)).toMatch(/Dawn$/);
    expect(labelAt(4)).toMatch(/Midday$/);
    expect(labelAt(8)).toMatch(/Dusk$/);
    expect(labelAt(9)).toMatch(/(Dusk|Night)$/);
    expect(renderDay(4).querySelector('[role="progressbar"][aria-label^="Day progress"]').getAttribute('aria-valuenow')).toBe('4');
  });
});

// ── Skin Anatomy cross-section + chromatophore demo ──
describe('Cephalopod Lab Skin Anatomy', () => {
  const renderSkin = (data = {}) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'skin', ...data } });
    return c;
  };

  it('draws a cross-section whose summary names the depth order and the selection', () => {
    const c = renderSkin();
    const svg = c.querySelector('svg[aria-label^="Cross-section of cephalopod skin"]');
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-label')).toMatch(/chromatophores nearest the surface, iridophores beneath them, leucophores deepest/);
    expect(svg.getAttribute('aria-label')).toMatch(/Currently selected: Chromatophore\.$/);
    expect(renderSkin({ skinCell: 'papilla' }).querySelector('svg[aria-label^="Cross-section"]').getAttribute('aria-label'))
      .toMatch(/Currently selected: Dermal papilla\.$/);
  });

  it('offers every cell type as a pressed-state chip and shows one record at a time', () => {
    const c = renderSkin({ skinCell: 'iridophore' });
    const chips = Array.from(c.querySelectorAll('[role="group"][aria-label="Pick a skin cell type"] button'));
    expect(chips).toHaveLength(5);
    expect(chips.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    // the open record is the iridophore's, and no other cell's citation is on screen
    expect(c.textContent).toMatch(/Crookes et al\., 2007/);
    expect(c.textContent).not.toMatch(/Florey, 1969/);
    expect(c.textContent).toMatch(/2 \/ 5/);
  });

  it('states what each layer cannot do, which is why the stack exists', () => {
    const c = renderSkin();
    const table = c.querySelector('table');
    expect(table.querySelector('caption')).not.toBeNull();
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5);
    const chroma = Array.from(table.querySelectorAll('tbody tr')).find((r) => /^Chromatophore/.test(r.textContent));
    expect(chroma.textContent).toMatch(/blue or green/);
    const irid = Array.from(table.querySelectorAll('tbody tr')).find((r) => /^Iridophore/.test(r.textContent));
    expect(irid.textContent).toMatch(/browns/);
  });

  it('expands the chromatophore sac with muscle drive, up to the 15x diameter the record claims', () => {
    const radius = (c) => Number(c.querySelector('svg[aria-label^="One chromatophore at"] circle[fill="#c2410c"]').getAttribute('r'));
    const rest = renderSkin({ skinDrive: 0 });
    const full = renderSkin({ skinDrive: 100 });
    expect(radius(full) / radius(rest)).toBeCloseTo(15, 1);
    expect(full.textContent).toMatch(/15\.0× resting diameter/);
    expect(full.querySelector('svg[aria-label^="One chromatophore at"]').getAttribute('aria-label')).toMatch(/100 percent muscle drive/);
    // the drive slider is labelled, and the three presets are real buttons
    expect(rest.querySelector('label[for="cl-skin-drive"]')).not.toBeNull();
    const presets = Array.from(rest.querySelectorAll('button')).filter((b) => /Relaxed|Half-expanded|Fully expanded/.test(b.textContent));
    expect(presets).toHaveLength(3);
    expect(presets.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });
});
