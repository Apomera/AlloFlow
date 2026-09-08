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

// ── Bioluminescence Lab: the 24-hour symbiosis cycle ──
describe('Cephalopod Lab bacterial symbiosis cycle', () => {
  const renderSym = (hour) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'biolux', bioluxView: 'symbiosis', bioluxSymbiosisHour: hour } });
    return c;
  };
  const chart = (c) => c.querySelector('svg[aria-label^="Bacterial symbiosis over one day"]');

  it('tracks the stated phase sequence: near-empty after the dawn expulsion, refilled by late day', () => {
    // the phase cards say ~95% is expelled by dawn and the 5% left regrows to full
    expect(chart(renderSym(0)).getAttribute('aria-label')).toMatch(/population about 100 percent/);
    expect(chart(renderSym(6)).getAttribute('aria-label')).toMatch(/population about 5 percent/);
    expect(chart(renderSym(18)).getAttribute('aria-label')).toMatch(/population about 100 percent/);
    expect(renderSym(6).textContent).toMatch(/5% of full/);
  });

  it('turns the ventral glow on only for the counter-illumination window', () => {
    expect(chart(renderSym(8)).getAttribute('aria-label')).toMatch(/ventral glow 0 percent/);
    expect(chart(renderSym(20)).getAttribute('aria-label')).toMatch(/ventral glow 100 percent/);
    expect(renderSym(20).textContent).toMatch(/glowing · counter-illumination/);
    expect(renderSym(8).textContent).toMatch(/buried in sand, repopulating/);
  });

  it('names the phase in the chart summary and labels the series directly rather than by colour alone', () => {
    const c = renderSym(20);
    expect(chart(c).getAttribute('aria-label')).toMatch(/Night — Counter-Illumination Active/);
    expect(c.textContent).toMatch(/bacterial population/);
    expect(c.textContent).toMatch(/ventral glow/);
    // and it is honest about what the curve is
    expect(c.textContent).toMatch(/Schematic of the phases described below, not plotted measurements/);
  });
});

// ── Life Cycle flow ──
describe('Cephalopod Lab Life Cycle flow', () => {
  const renderLife = (data = {}) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'lifecycle', ...data } });
    return c;
  };
  const flow = (c) => c.querySelector('svg[aria-label^="Life cycle flow"]');

  it('says in its summary that the path forks by sex and then ends', () => {
    const label = flow(renderLife()).getAttribute('aria-label');
    expect(label).toMatch(/females brood, males go straight to senescence/);
    expect(label).toMatch(/return arrow to Egg is the next generation, not the same animal/);
    expect(label).toMatch(/Currently selected: Egg\.$/);
    expect(flow(renderLife({ lifeStage: 'brooding' })).getAttribute('aria-label')).toMatch(/Currently selected: Brooding \(female only\)\.$/);
  });

  it('draws every stage as a selectable node and shows one record at a time', () => {
    const c = renderLife({ lifeStage: 'senescence' });
    const chips = Array.from(c.querySelectorAll('[role="group"][aria-label="Pick a life stage"] button'));
    expect(chips).toHaveLength(8);
    expect(chips.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    expect(c.textContent).toMatch(/8 \/ 8/);
    // the open record is senescence, not the whole list
    expect(c.textContent).toMatch(/1-4 weeks after eggs hatch/);
    expect(c.textContent).not.toMatch(/50,000-500,000 eggs/);
  });

  it('states the semelparity terminus and marks the return arrow as the next generation', () => {
    const c = renderLife();
    expect(c.textContent).toMatch(/death — one reproduction, then the line ends/);
    expect(c.textContent).toMatch(/eggs hatch → the NEXT generation, not this animal/);
    expect(c.textContent).toMatch(/males skip brooding/);
  });

  it('keeps white node ink on ramp steps dark enough to read', () => {
    const c = renderLife();
    const fills = Array.from(flow(c).querySelectorAll('rect[rx="8"]')).map((r) => r.getAttribute('fill'));
    // the three late stages carry white text, so they must not be the light ramp steps
    expect(fills).toContain('#be185d');
    expect(fills).toContain('#a21caf');
    expect(fills).toContain('#9f1239');
    expect(fills).not.toContain('#d946ef');
  });
});

// ── Intelligence Lab evidence ladder ──
describe('Cephalopod Lab Intelligence Lab evidence ladder', () => {
  const renderIntel = (caseId) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'intel', intelSelectedCase: caseId } });
    return c;
  };

  it('sorts every case onto a rung, strongest at the top of the list order', () => {
    const c = renderIntel('otto');
    const rungs = Array.from(c.querySelectorAll('ol li'));
    expect(rungs).toHaveLength(5);
    // the DOM order is weakest-first; the column is reversed for display
    expect(rungs[0].textContent).toMatch(/Single incident, reported afterwards/);
    expect(rungs[4].textContent).toMatch(/Expert position statement/);
    // every one of the seven cases appears on exactly one rung
    const chips = rungs.flatMap((r) => Array.from(r.querySelectorAll('button')));
    expect(chips).toHaveLength(7);
  });

  it('places the two most famous anecdotes on the weakest rung and the papers on the strongest', () => {
    const rungOf = (name) => {
      const c = renderIntel('otto');
      const li = Array.from(c.querySelectorAll('ol li')).find((r) => Array.from(r.querySelectorAll('button')).some((b) => b.textContent.includes(name)));
      return li ? li.textContent : '';
    };
    expect(rungOf('Otto')).toMatch(/Single incident/);
    expect(rungOf('Inky')).toMatch(/Single incident/);
    expect(rungOf('Heidi')).toMatch(/One animal, recorded/);
    expect(rungOf('Coconut Octopus tool use')).toMatch(/Peer-reviewed study/);
    expect(rungOf('Optic Gland')).toMatch(/Peer-reviewed study/);
    expect(rungOf('Mirror self-recognition')).toMatch(/Real test, result not clean/);
    expect(rungOf('The consciousness question')).toMatch(/Expert position statement/);
  });

  it('badges the open case with its evidence type and says what that type can support', () => {
    const anecdote = renderIntel('inky');
    expect(anecdote.textContent).toMatch(/Evidence: Single incident, reported afterwards/);
    expect(anecdote.textContent).toMatch(/What this kind of evidence can show: Can raise a question\. Cannot settle one/);
    const study = renderIntel('opticgland');
    expect(study.textContent).toMatch(/Evidence: Peer-reviewed study/);
    expect(study.textContent).toMatch(/other researchers can check it/);
  });

  it('says plainly that weak evidence still has a job, so the ladder is not a dismissal', () => {
    expect(renderIntel('otto').textContent).toMatch(/Weak evidence is not worthless/);
  });
});

// ── Camo Discovery theming ──
describe('Cephalopod Lab Camo Discovery', () => {
  const renderDiscovery = () => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', {
      cephalopodLab: { activeSection: 'camoHunt', camoHunt: { substrate: 'coral', brightness: 60, hue: 80, coarseness: 85, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] } },
    });
    return c;
  };

  it('carries no light-theme utility classes, so it cannot render as a white card in the dark tool', () => {
    const html = renderDiscovery().innerHTML;
    expect(html).not.toMatch(/bg-white/);
    expect(html).not.toMatch(/bg-slate-(50|100)/);
    expect(html).not.toMatch(/text-slate-[5-8]00/);
    expect(html).not.toMatch(/bg-(amber|emerald|rose|indigo)-(50|100|200)/);
    // the only classes left are screen-reader captions
    const classed = Array.from(renderDiscovery().querySelectorAll('[class]'));
    expect(classed.every((el) => el.getAttribute('class') === 'sr-only')).toBe(true);
  });

  it('lets the substrate colour reach the frame around the diagram', () => {
    const c = renderDiscovery();
    const svg = c.querySelector('svg[role="img"]');
    expect(svg).not.toBeNull();
    // the wrapper is painted with the substrate so the fitted diagram has no pale bars
    expect(svg.parentElement.getAttribute('style')).toMatch(/background:\s*#c97777/);
  });

  it('keeps its accessible summary of the current sliders', () => {
    const label = renderDiscovery().querySelector('svg[role="img"]').getAttribute('aria-label');
    expect(label).toMatch(/brightness 60 percent, hue 80 percent, coarseness 85 percent/);
  });
});

// ── Myth Busters predict-then-reveal ──
describe('Cephalopod Lab Myth Busters', () => {
  const renderMyths = (data = {}) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'misconceptions', ...data } });
    return c;
  };

  it('hides every correction until the reader commits to a confidence rating', () => {
    const fresh = renderMyths();
    expect(fresh.textContent).not.toMatch(/Evidence-based correction/);
    expect(fresh.textContent).toMatch(/how true does this sound to you\?/);
    const groups = fresh.querySelectorAll('[role="group"][aria-labelledby^="cl-myth-claim-"]');
    expect(groups).toHaveLength(12);
    // five labelled confidence buttons per claim, so a rating is a real commitment
    const scale = Array.from(groups[0].querySelectorAll('button'));
    expect(scale).toHaveLength(5);
    expect(scale[0].getAttribute('aria-label')).toBe('1 — Definitely false');
    expect(scale[4].getAttribute('aria-label')).toBe('5 — Definitely true');
  });

  it('reveals only the rated claim, and reflects the rating back', () => {
    const c = renderMyths({ mythConfidence: { 0: 5 } });
    expect(c.textContent).toMatch(/You rated this 5 of 5 — it read as true, and it is not/);
    expect(c.textContent).toMatch(/Most octopus species live 1-2 years/);
    // the second claim stays hidden
    expect(c.textContent).not.toMatch(/1 in 256 odds/);
    const low = renderMyths({ mythConfidence: { 0: 2 } });
    expect(low.textContent).toMatch(/You doubted this one \(2 of 5\)/);
  });

  it('tallies ratings and states the point: every claim on the page is wrong', () => {
    const c = renderMyths({ mythConfidence: { 0: 5, 1: 2, 2: 4 } });
    expect(c.textContent).toMatch(/3 \/ 12/);
    expect(c.textContent).toMatch(/Every claim on this page is wrong or misleading/);
    expect(c.textContent).toMatch(/You leaned towards believing 2 of them/);
    const none = renderMyths({ mythConfidence: { 0: 1 } });
    expect(none.textContent).toMatch(/did not lean towards believing any of them/);
    expect(renderMyths().textContent).not.toMatch(/What your ratings say/);
  });

  it('keeps a teacher view that shows every correction without rating', () => {
    const c = renderMyths({ mythRevealAll: true });
    expect(c.textContent).toMatch(/Most octopus species live 1-2 years/);
    expect(c.textContent).toMatch(/1 in 256 odds/);
    expect(c.textContent).not.toMatch(/how true does this sound to you\?/);
    expect(c.querySelector('button[aria-pressed="true"]').textContent).toMatch(/Hide corrections again/);
  });
});

// ── Comparative Cognition matrix ──
describe('Cephalopod Lab comparative cognition matrix', () => {
  const renderMatrix = () => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'compcog', compView: 'matrix' } });
    return c;
  };

  it('no longer advertises a click that does not exist', () => {
    const c = renderMatrix();
    expect(c.textContent).not.toMatch(/Click any cell/);
    expect(c.textContent).toMatch(/Every cell carries its own evidence note/);
    expect(c.innerHTML).not.toMatch(/cursor: help/);
  });

  it('states each rating in words, so the stars are never the only encoding', () => {
    const c = renderMatrix();
    const cells = Array.from(c.querySelectorAll('tbody td'));
    expect(cells).toHaveLength(30);
    // every cell names its rating for a screen reader as well as on screen
    expect(cells.every((td) => /no documented evidence|documented|strong|exceptional/.test(td.textContent))).toBe(true);
    // the star glyphs themselves are hidden from assistive tech
    expect(cells[0].querySelector('[aria-hidden="true"]').textContent).toMatch(/[★☆]/);
    // and the tint is a second encoding, not the only one
    expect(cells.every((td) => /background:/.test(td.getAttribute('style') || ''))).toBe(true);
  });

  it('uses one meaning of zero stars, matching its own footnote', () => {
    const c = renderMatrix();
    // the legend used to say zero stars meant "minimal" while the footnote said
    // it meant absence of evidence; the footnote is the careful reading
    expect(c.textContent).toMatch(/☆☆☆ no documented evidence/);
    expect(c.textContent).toMatch(/Absence of stars = absence of evidence/);
    expect(c.textContent).not.toMatch(/☆ minimal/);
  });
});

// ── Through Time: mass extinctions on a dated axis ──
describe('Cephalopod Lab mass extinction axis', () => {
  const renderExt = (data = {}) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'time', timeView: 'extinctions', ...data } });
    return c;
  };
  const axis = (c) => c.querySelector('svg[aria-label^="The five mass extinctions"]');

  it('places all five events by date and names them in its summary', () => {
    const label = axis(renderExt()).getAttribute('aria-label');
    ['444', '372', '252', '201', '66'].forEach((mya) => expect(label).toContain(mya + ' million years ago'));
    expect(label).toMatch(/End-Permian/);
  });

  it('positions markers by their real dates, not evenly', () => {
    const svg = axis(renderExt());
    const xs = Array.from(svg.querySelectorAll('circle')).map((c) => Number(c.getAttribute('cx')));
    expect(xs).toHaveLength(5);
    // dates run 444, 372, 252, 201, 66 -> left to right, increasing x
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    // and the gaps are genuinely uneven: 252->201 is much closer than 372->252
    const gapPermianTriassic = xs[3] - xs[2];
    const gapDevonianPermian = xs[2] - xs[1];
    expect(gapPermianTriassic).toBeLessThan(gapDevonianPermian);
  });

  it('gives every event an accent that is not the page background', () => {
    // the end-Cretaceous accent used to be #0c1432, the first stop of this
    // tool's own root gradient, so its marker and card border were invisible
    const svg = axis(renderExt());
    const fills = Array.from(svg.querySelectorAll('circle')).map((c) => c.getAttribute('fill').toLowerCase());
    expect(fills).not.toContain('#0c1432');
    expect(new Set(fills).size).toBe(5);
  });

  it('highlights the matching card when an event is selected', () => {
    const none = renderExt();
    const chosen = renderExt({ timeExtinctionId: 'end-permian' });
    // the harness serializes inline styles without a space after the colon
    const bordered = (c) => Array.from(c.querySelectorAll('div')).filter((el) => /border:\s?1px solid #dc2626/i.test(el.getAttribute('style') || ''));
    expect(bordered(none)).toHaveLength(0);
    expect(bordered(chosen).length).toBeGreaterThan(0);
  });
});

// ── Keyboard parity for the clickable diagrams ──
describe('Cephalopod Lab clickable diagrams have a keyboard path', () => {
  // Three sections pair a clickable SVG with a selection. An SVG <g> with an
  // onClick is reachable by mouse only, so each of these must also offer real
  // buttons for the same selection — otherwise a keyboard user cannot select
  // anything at all. The extinction axis shipped without one.
  const render = (data) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: data });
    return c;
  };

  it('offers a button for every extinction, not just an axis marker', () => {
    const c = render({ activeSection: 'time', timeView: 'extinctions' });
    const group = c.querySelector('[role="group"][aria-label="Pick a mass extinction"]');
    expect(group).not.toBeNull();
    const chips = Array.from(group.querySelectorAll('button'));
    expect(chips).toHaveLength(5);
    expect(chips.every((b) => b.hasAttribute('aria-pressed'))).toBe(true);
    const chosen = render({ activeSection: 'time', timeView: 'extinctions', timeExtinctionId: 'end-permian' });
    const pressed = Array.from(chosen.querySelectorAll('[role="group"][aria-label="Pick a mass extinction"] button'))
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toMatch(/End-Permian/);
  });

  it('keeps the same guarantee for the skin cross-section and the life cycle', () => {
    const skin = render({ activeSection: 'skin' });
    expect(skin.querySelectorAll('[role="group"][aria-label="Pick a skin cell type"] button')).toHaveLength(5);
    const life = render({ activeSection: 'lifecycle' });
    expect(life.querySelectorAll('[role="group"][aria-label="Pick a life stage"] button')).toHaveLength(8);
  });
});

// ── Ethogram scan-sample recorder ──
describe('Cephalopod Lab ethogram recorder', () => {
  const renderEtho = (data = {}) => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'ethogram', ...data } });
    return c;
  };

  it('offers one recording button per catalogued behaviour', () => {
    const c = renderEtho();
    const group = c.querySelector('[role="group"][aria-label="Record a scan sample"]');
    expect(group).not.toBeNull();
    expect(group.querySelectorAll('button')).toHaveLength(25);
    expect(group.querySelector('button').getAttribute('aria-label')).toMatch(/none recorded yet$/);
  });

  it('shows no budget until something is recorded, then ranks by frequency', () => {
    expect(renderEtho().textContent).not.toMatch(/Behavioural budget/);
    const c = renderEtho({ ethoTally: { REST: 9, CRAWL: 6, COLOR: 4 }, ethoLog: new Array(19).fill('REST') });
    expect(c.textContent).toMatch(/Behavioural budget/);
    const meters = Array.from(c.querySelectorAll('[role="meter"]'));
    expect(meters).toHaveLength(3);
    // ordered most frequent first, and each states its share in words
    expect(meters[0].getAttribute('aria-label')).toMatch(/^Resting: 9 of 19 scans, 47 percent$/);
    expect(meters[1].getAttribute('aria-label')).toMatch(/^Slow crawl: 6 of 19/);
  });

  it('tracks progress toward the 20-minute protocol the section describes', () => {
    const c = renderEtho({ ethoTally: { REST: 10 }, ethoLog: new Array(10).fill('REST') });
    const bar = c.querySelector('[role="progressbar"][aria-label="Scan samples recorded"]');
    expect(bar.getAttribute('aria-valuenow')).toBe('10');
    expect(bar.getAttribute('aria-valuemax')).toBe('40');
    expect(c.textContent).toMatch(/25% of a 20-minute observation/);
  });

  it('warns that a short session makes a shaky budget, and stops warning at 40', () => {
    const short = renderEtho({ ethoTally: { REST: 3 }, ethoLog: new Array(3).fill('REST') });
    expect(short.textContent).toMatch(/A budget from a handful of samples can swing wildly/);
    const full = renderEtho({ ethoTally: { REST: 40 }, ethoLog: new Array(40).fill('REST') });
    expect(full.textContent).not.toMatch(/can swing wildly/);
  });

  it('writes a field note that reports the sample count alongside the result', () => {
    const c = renderEtho({ ethoTally: { REST: 9, CRAWL: 6 }, ethoLog: new Array(15).fill('REST') });
    expect(c.textContent).toMatch(/Scan sampling, 15 samples at 30-second intervals/);
    expect(c.textContent).toMatch(/Most frequent: Resting \(60%\), then Slow crawl \(40%\)/);
    expect(c.textContent).toMatch(/2 of the 25 catalogued behaviours were seen/);
  });
});

// ── Challenge tracker checked against real dives ──
describe('Cephalopod Lab challenge tracker', () => {
  const KEY = 'allo.cephalopodlab.leaderboard.v1';
  const renderChal = () => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'challenges' } });
    return c;
  };

  it('claims nothing when there is no dive history', () => {
    window.localStorage.removeItem(KEY);
    const c = renderChal();
    expect(c.textContent).toMatch(/0 \/ 5 met/);
    expect(c.textContent).toMatch(/No dives recorded yet/);
    // and it never marks an untracked challenge as done
    expect(c.textContent).not.toMatch(/✓ done/);
  });

  it('ticks only the challenges the dive record can actually settle', () => {
    window.localStorage.setItem(KEY, JSON.stringify({
      commonOcto: { bestScore: 18, bestSurvivalMs: 372000, bestCamoEff: 0.94, totalDives: 4, totalCatches: 22 },
      cuttlefish: { bestScore: 9, bestSurvivalMs: 141000, bestCamoEff: 0.71, totalDives: 2, totalCatches: 7 },
    }));
    const c = renderChal();
    // 6.2 minutes best dive clears the 5-minute target but not 10 or 15;
    // 94% camouflage clears 90%; 2 of 12 species is short
    expect(c.textContent).toMatch(/2 \/ 5 met/);
    expect(c.textContent).toMatch(/6\.2 \/ 5\.0 min best dive/);
    expect(c.textContent).toMatch(/6\.2 \/ 10\.0 min best dive/);
    expect(c.textContent).toMatch(/94% \/ 90% best camouflage/);
    expect(c.textContent).toMatch(/2 \/ 12 species dived/);
    window.localStorage.removeItem(KEY);
  });

  it('marks the ten it cannot verify as the reader’s to check, never as done', () => {
    window.localStorage.removeItem(KEY);
    const c = renderChal();
    const selfChecks = c.textContent.match(/check this one yourself/g) || [];
    expect(selfChecks).toHaveLength(10);
    // the untrackable ones are exactly those depending on unrecorded detail
    expect(c.textContent).toMatch(/Use 3 different shelter types in one dive[\s\S]{0,120}check this one yourself/);
  });
});

// ── Ocean Sounds frequency spectrum ──
describe('Cephalopod Lab ocean sound spectrum', () => {
  const renderSounds = () => {
    const c = document.createElement('div');
    c.innerHTML = renderTool('cephalopodLab', { cephalopodLab: { activeSection: 'sounds' } });
    return c;
  };
  const chart = (c) => c.querySelector('svg[aria-label^="Marine soundscape on a logarithmic frequency axis"]');

  it('plots a band for every entry whose figure is a plain range', () => {
    const c = renderSounds();
    const svg = chart(c);
    expect(svg).not.toBeNull();
    const bars = Array.from(svg.querySelectorAll('rect'));
    expect(bars).toHaveLength(9);
    expect(svg.getAttribute('aria-label')).toMatch(/Humpback whale song, 30 Hz - 2 kHz/);
  });

  it('says which entry it could not plot instead of approximating it', () => {
    const c = renderSounds();
    expect(c.textContent).toMatch(/Not plotted, because the figure is not a plain range: Cephalopod jet noise \(Sub-kHz to 1 kHz\)/);
    expect(chart(c).getAttribute('aria-label')).not.toMatch(/Cephalopod jet noise/);
  });

  it('places bands on a log axis, so a decade is a constant distance', () => {
    const svg = chart(renderSounds());
    const ticks = Array.from(svg.querySelectorAll('text')).filter((t) => /^(0\.1|1|10|100) Hz$|^(1|10) kHz$/.test(t.textContent));
    expect(ticks).toHaveLength(6);
    const xs = ticks.map((t) => Number(t.getAttribute('x')));
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    gaps.forEach((g) => expect(Math.abs(g - gaps[0])).toBeLessThan(1));
  });

  it('repeats only the claim the section already makes about cephalopod hearing', () => {
    const c = renderSounds();
    // the chart must not invent a cephalopod audible range
    expect(c.textContent).toMatch(/cephalopods cannot hear as pressure waves/);
    expect(c.textContent).not.toMatch(/cephalopod hearing range/i);
  });
});
