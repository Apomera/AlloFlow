// Render goldens for the SCIENCE-SIM + STUDIO remainder — the final cluster of
// STEM tools that had NO vitest digest coverage, only the static crash gate
// (dev-tools/check_stem_render.cjs) + the CDN-reachability e2e. A 2026-06-20
// coverage audit found 33 tools in this state: the science simulations
// (anatomy, astronomy, cell, chemBalance, epidemicSim, microbiology, molecule,
// physics, punnett, rockCycle/rocks, titrationLab, waterCycle, wave, weldLab,
// galaxy, moonMission, spaceExplorer, swimLab, throwlab, echolocation,
// echoTrainer, fireEcology, flightSim, bakingScience, kitchenLab, bridgeLab,
// semiconductor, cyberDefense) plus the studio/utility tools that shared the
// gap (a11yAuditor, archStudio, artStudio, gameStudio).
//
// WHY: the crash gate only answers "does default-state render() throw?" — it
// pins NO behaviour, so a drive-by edit (an AI-gating sweep, a contrast/a11y
// pass, a decomposition) could silently restructure one of these tools' render
// with nothing to catch it. This pins a deterministic render DIGEST (length
// bucket + element counts + content sha) per tool so a structural regression
// fails loudly. It does NOT test simulation correctness (canvas/effect logic is
// invisible to SSR) — that gap is tracked separately.
//
// TWO RENDER MODES (this is the subtle part):
//   • mode 'ssr'   — renderToStaticMarkup of the default-state render. Faithful
//                    for the 26 tools whose first paint IS the real UI.
//   • mode 'mount' — a STATEFUL client render (createRoot + act) that owns
//                    `toolData` as real React state, exactly like the live host
//                    (stem_lab_module.js StemPluginBridge). SEVEN tools gate
//                    their first paint behind a "seed my state bucket, then
//                    return <Loading…>" pattern: `if (!ctx.toolData.<id>) {
//                    ctx.setToolData(seed); return Loading }`. Under plain SSR
//                    those tools pin only the LOADING placeholder (≈60 chars) —
//                    a hollow golden that locks the spinner, not the tool. The
//                    'mount' harness lets setToolData seed the bucket and
//                    re-render, so the digest pins the REAL body (8K–38K chars).
//                    This is also why the crash gate never exercised their real
//                    render path — a previously-unknown blind spot the audit
//                    surfaced.
//
// Determinism: Date + Math.random are frozen so the digest is stable run-to-run;
// requestAnimationFrame is stubbed to never fire (animation loops can't advance
// mid-snapshot) and canvas getContext returns an inert proxy (jsdom has no 2D
// context). Re-baseline an INTENTIONAL render change with:
//   npx vitest -u tests/stem_sim_tools_golden.test.js
//
// FIXED 2026-06-20 — throwlab: this audit surfaced a real Rules-of-Hooks
// violation — useRef/useState/useEffect (and ~5 more hooks deep in the body)
// sat BELOW the loading-gate's early-return, so the empty→seeded transition
// changed the hook count and React threw "Rendered more hooks than during the
// previous render" (it would crash on first open, since throwlab state is not
// persisted and starts empty every reload). Fixed in stem_tool_throwlab.js by
// making the gate seed defaults WITHOUT early-returning (the body reads state
// only via the local `d`, now bucket-or-defaults), so all hooks run every
// render. throwlab now renders its real body under plain 'ssr' like the rest.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

// ── jsdom shims for the 'mount' (effect-running) renders ──────────────────
// jsdom has no canvas 2D context (returns null) and no rAF. Tools that defer
// drawing to an effect reach for both; give them inert stubs so the effect
// runs without throwing. Animation callbacks intentionally never fire — that
// keeps the snapshot deterministic (no half-advanced sim frame).
const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};

// Build the same defensive ctx the SSR harness uses, but with a caller-supplied
// toolData + setToolData so the host's stateful contract is faithfully emulated.
function mountCtx(toolData, setToolData) {
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });
  return {
    React, toolData, setToolData, update: noop, updateMulti: noop,
    setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, addToast: noop,
    announceToSR: noop, awardXP: noop, beep: noop, celebrate: noop, canvasNarrate: noop,
    canvasA11yDesc: noop, callGemini: null, callTTS: null, callImagen: null,
    callGeminiVision: null, callGeminiImageEdit: null, gradeLevel: '5th Grade',
    stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
    icons: Icons, t: (k, f) => f || k, tryAward: noop, getXP: () => 0,
  };
}

// Stateful client render: a wrapper owns toolData as real state, so a tool that
// seeds its bucket via setToolData on first render re-renders into its real
// body — mirroring stem_lab_module.js StemPluginBridge. Returns the committed
// innerHTML. Throws if the tool throws (e.g. a hooks-order violation).
function renderToolMount(toolId) {
  const cfg = window.StemLab._registry[toolId];
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({});
    return cfg.render(mountCtx(toolData, setToolData));
  }
  try {
    act(() => { root.render(React.createElement(Harness)); });
    return host.innerHTML;
  } finally {
    try { act(() => root.unmount()); } catch (_) {}
    host.remove();
  }
}

// mode: 'ssr' (default) or 'mount'. rocks.js registers TWO tools.
const TOOLS = [
  { file: 'stem_lab/stem_tool_a11yauditor.js', id: 'a11yAuditor' },
  { file: 'stem_lab/stem_tool_anatomy.js', id: 'anatomy' },
  { file: 'stem_lab/stem_tool_archstudio.js', id: 'archStudio' },
  { file: 'stem_lab/stem_tool_artstudio.js', id: 'artStudio' },
  { file: 'stem_lab/stem_tool_astronomy.js', id: 'astronomy', mode: 'mount' },
  { file: 'stem_lab/stem_tool_bakingscience.js', id: 'bakingScience' },
  { file: 'stem_lab/stem_tool_bridgelab.js', id: 'bridgeLab', mode: 'mount' },
  { file: 'stem_lab/stem_tool_cell.js', id: 'cell' },
  { file: 'stem_lab/stem_tool_chembalance.js', id: 'chemBalance' },
  { file: 'stem_lab/stem_tool_cyberdefense.js', id: 'cyberDefense' },
  { file: 'stem_lab/stem_tool_echotrainer.js', id: 'echoTrainer' },
  { file: 'stem_lab/stem_tool_echolocation.js', id: 'echolocation' },
  { file: 'stem_lab/stem_tool_epidemic.js', id: 'epidemicSim' },
  { file: 'stem_lab/stem_tool_fireecology.js', id: 'fireEcology' },
  { file: 'stem_lab/stem_tool_flightsim.js', id: 'flightSim' },
  { file: 'stem_lab/stem_tool_galaxy.js', id: 'galaxy' },
  { file: 'stem_lab/stem_tool_gamestudio.js', id: 'gameStudio' },
  { file: 'stem_lab/stem_tool_kitchenlab.js', id: 'kitchenLab' },
  { file: 'stem_lab/stem_tool_microbiology.js', id: 'microbiology', mode: 'mount' },
  { file: 'stem_lab/stem_tool_molecule.js', id: 'molecule' },
  { file: 'stem_lab/stem_tool_moonmission.js', id: 'moonMission' },
  { file: 'stem_lab/stem_tool_physics.js', id: 'physics', mode: 'mount' },
  { file: 'stem_lab/stem_tool_punnett.js', id: 'punnett' },
  { file: 'stem_lab/stem_tool_rocks.js', id: 'rockCycle' },
  { file: 'stem_lab/stem_tool_rocks.js', id: 'rocks' },
  { file: 'stem_lab/stem_tool_semiconductor.js', id: 'semiconductor', mode: 'mount' },
  { file: 'stem_lab/stem_tool_spaceexplorer.js', id: 'spaceExplorer' },
  { file: 'stem_lab/stem_tool_swimlab.js', id: 'swimLab' },
  { file: 'stem_lab/stem_tool_throwlab.js', id: 'throwlab' },
  { file: 'stem_lab/stem_tool_titration.js', id: 'titrationLab' },
  { file: 'stem_lab/stem_tool_watercycle.js', id: 'waterCycle' },
  { file: 'stem_lab/stem_tool_wave.js', id: 'wave', mode: 'mount' },
  { file: 'stem_lab/stem_tool_weldlab.js', id: 'weldLab' },
];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    // coarse length bucket: a 1-char copy tweak doesn't churn, a lost/doubled
    // panel does.
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    canvases: count(/<canvas/g),
    inputs: count(/<input/g),
    selects: count(/<select/g),
    paths: count(/<path/g),
    sha: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => resetStemLab());

describe('science-sim + studio render goldens', () => {
  for (const tool of TOOLS) {
    const mode = tool.mode || 'ssr';
    it('renders + pins a digest for ' + tool.id + ' [' + mode + ']', () => {
      const cfg = loadTool(tool.file, tool.id);
      expect(typeof cfg.render).toBe('function');
      let html;
      try {
        html = mode === 'mount' ? renderToolMount(tool.id) : renderTool(tool.id, {});
      } catch (e) {
        throw new Error('render threw for ' + tool.id + ' (' + tool.file + ', ' + mode + '): ' + (e && e.message ? e.message : e));
      }
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      // 'mount' tools must render their REAL body, not the loading placeholder —
      // guards against the gate silently reverting to a hollow golden.
      if (mode === 'mount') {
        expect(html.length).toBeGreaterThan(2000);
        expect(/Loading\.\.\.|Initializing|Loading [A-Z]/.test(html)).toBe(false);
      }
      expect(digest(html)).toMatchSnapshot();
    });
  }

  it('all tool ids are unique (no copy-paste id collisions)', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Space Explorer mission dossier contract', () => {
  it('builds a teachable mission dossier and deterministic local event deck', () => {
    loadTool('stem_lab/stem_tool_spaceexplorer.js', 'spaceExplorer');
    const pure = window.StemLab.spaceExplorerPure;
    expect(pure).toBeTruthy();

    const dest = {
      id: 'europa',
      name: 'Europa',
      difficulty: 2,
      hazards: ['radiation belts', 'ice crust instability'],
      scienceFocus: ['oceanography', 'astrobiology']
    };
    const dossier = pure.buildMissionDossier(dest, { o2: 80, power: 70, hull: 100, fuel: 90, science: 0 }, [], []);
    expect(dossier.riskBand).toMatch(/training|moderate|high|extreme/);
    expect(dossier.guidingQuestion).toContain('Europa');
    expect(dossier.stagePlan.map((x) => x.name)).toEqual(['Arrival', 'Survey', 'Departure']);
    expect(dossier.evidenceGoals).toHaveLength(3);
    expect(dossier.evidenceGoals[0].label).toBe('oceanography');

    const event = pure.buildLocalMissionEvent(dest, { o2: 80, power: 70, hull: 100, fuel: 90, science: 0 }, 1, 11, []);
    expect(event.title).toBeTruthy();
    expect(event.description).toContain('Europa');
    expect(event.choices.map((x) => x.quality)).toEqual(['optimal', 'adequate', 'poor']);
    expect(event.hiddenOption).toBeTruthy();
    expect(event.stemConcepts.length).toBeGreaterThan(0);

    const assessment = pure.assessMissionIntent(
      'I predict oceanography evidence will decide whether the crew can survive Europa.',
      [{ turn: 1, title: 'Ice Fault', quality: 'optimal', concept: 'oceanography', note: 'Mapped oceanography clues under the ice.' }],
      dossier
    );
    expect(assessment.hasIntent).toBe(true);
    expect(assessment.status).toMatch(/partly supported|strongly supported/);
    expect(assessment.supportCount).toBeGreaterThan(0);
    expect(assessment.revisionPrompt).toContain('Next run');

    const protocol = pure.buildMissionProtocol(
      'I predict oceanography evidence and science data will decide whether the crew can survive Europa.',
      dossier,
      dest
    );
    expect(protocol.id).toBe('evidence_first');
    expect(protocol.ruleText).toContain('science +3');
    const applied = pure.applyMissionProtocol(protocol, { o2: 80, power: 70, hull: 100, fuel: 90, morale: 80, science: 12 }, { quality: 'optimal' }, { title: 'Ice Fault' });
    expect(applied.applied).toBe(true);
    expect(applied.resources.science).toBe(15);
    expect(applied.resources.power).toBe(69);

    const lens = pure.buildProtocolEventLens(protocol, dossier, 0, []);
    expect(lens.category).toBe('science');
    expect(lens.promptLine).toContain('Evidence-first protocol');
    const protocolEvent = pure.buildLocalMissionEvent(dest, { o2: 80, power: 70, hull: 100, fuel: 90, science: 0 }, 0, 11, [], protocol, dossier);
    expect(protocolEvent.protocolLens.protocolId).toBe('evidence_first');
    expect(protocolEvent.description).toContain('Evidence-first protocol');

    const forecast = pure.buildMissionForecast(dest, { o2: 22, power: 70, hull: 100, fuel: 90, morale: 80, science: 0 }, 1, 11, dossier, protocol, [], { life: 0, science: 2, shields: 0, comms: 0 });
    expect(forecast.category).toMatch(/systems|science/);
    expect(forecast.recommendedSystem).toBeTruthy();
    expect(forecast.summary).toContain('consider');

    const objectives = pure.buildMissionObjectives(dest, dossier, protocol);
    expect(objectives).toHaveLength(3);
    const objectiveReport = pure.evaluateMissionObjectives(objectives, [
      { turn: 1, title: 'Ice Fault', quality: 'optimal', concept: 'oceanography', note: 'Mapped oceanography clues.' },
      { turn: 2, title: 'Bio Trace', quality: 'optimal', concept: 'astrobiology', note: 'Compared astrobiology evidence.' }
    ], [
      { title: 'Ice Fault', quality: 'optimal' },
      { title: 'Bio Trace', quality: 'optimal' }
    ], { o2: 40, hull: 55, power: 60, fuel: 70, morale: 80, science: 0 }, [
      { turn: 1, protocol: protocol.label },
      { turn: 2, protocol: protocol.label }
    ]);
    expect(objectiveReport.completed).toBe(3);
    expect(objectiveReport.totalBonus).toBeGreaterThan(0);
  });

  it('renders dossier, evidence tracker, and debrief review surfaces', () => {
    loadTool('stem_lab/stem_tool_spaceexplorer.js', 'spaceExplorer');
    const base = {
      destination: 'europa',
      resources: { o2: 80, power: 70, hull: 100, fuel: 90, science: 12 },
      crew: [],
      missionLog: [],
      decisionLog: [],
      missionIntent: 'I predict oceanography evidence and science data will decide whether the crew can survive Europa.',
      protocolLog: [],
      missionEvidence: []
    };

    const briefing = renderTool('spaceExplorer', { spaceExplorer: Object.assign({}, base, { missionPhase: 'briefing' }) });
    expect(briefing).toContain('data-spaceexplorer-dossier');
    expect(briefing).toContain('Mission Dossier');
    expect(briefing).toContain('data-spaceexplorer-intent');
    expect(briefing).toContain('Commander');
    expect(briefing).toContain('data-spaceexplorer-protocol');
    expect(briefing).toContain('Evidence-first protocol');
    expect(briefing).toContain('data-spaceexplorer-deck-lens');
    expect(briefing).toContain('data-spaceexplorer-objectives');
    expect(briefing).toContain('Optional Mission Objectives');

    const allocate = renderTool('spaceExplorer', { spaceExplorer: Object.assign({}, base, { missionPhase: 'allocate', powerAllocation: { life: 0, science: 2, shields: 0, comms: 0 } }) });
    expect(allocate).toContain('data-spaceexplorer-forecast');
    expect(allocate).toContain('Mission Forecast');

    const explore = renderTool('spaceExplorer', { spaceExplorer: Object.assign({}, base, {
      missionPhase: 'explore',
      missionEvidence: [{ turn: 1, title: 'Ice Fault', category: 'terrain', quality: 'optimal', concept: 'oceanography', note: 'Mapped oceanography clues under the ice.' }]
    }) });
    expect(explore).toContain('data-spaceexplorer-evidence');
    expect(explore).toContain('Expedition Evidence');
    expect(explore).toContain('Latest observation');
    expect(explore).toContain('Hypothesis status');
    expect(explore).toContain('data-spaceexplorer-objectives-live');

    const debrief = renderTool('spaceExplorer', { spaceExplorer: Object.assign({}, base, {
      missionPhase: 'debrief',
      missionResult: 'success',
      turn: 4,
      protocolLog: [{ turn: 1, protocol: 'Evidence-first protocol', effects: { science: 3, power: -1 }, note: 'Protocol applied.' }],
      objectiveBonusScience: 20,
      decisionLog: [{ title: 'Ice Fault', chosen: 'Map it', quality: 'optimal', optimal: 'Map it', lesson: 'Evidence before action.' }],
      missionEvidence: [{ turn: 1, title: 'Ice Fault', category: 'terrain', quality: 'optimal', concept: 'oceanography', note: 'Mapped oceanography clues under the ice.' }]
    }) });
    expect(debrief).toContain('data-spaceexplorer-dossier-review');
    expect(debrief).toContain('MISSION DOSSIER REVIEW');
    expect(debrief).toContain('data-spaceexplorer-intent-review');
    expect(debrief).toContain('HYPOTHESIS REVIEW');
    expect(debrief).toContain('Protocol tested');
    expect(debrief).toContain('data-spaceexplorer-objectives-review');
    expect(debrief).toContain('MISSION OBJECTIVES');
  });
});