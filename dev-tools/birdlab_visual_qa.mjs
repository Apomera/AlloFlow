import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

export const HABITATS = ['forest', 'marsh', 'backyard', 'coast', 'mountain'];
export const LENSES = ['wide', 'left', 'center', 'right'];
export const CONDITIONS = ['dawn', 'day', 'dusk'];
export const VIEWPORTS = [
  { id: 'desktop', width: 1280, height: 900 },
  { id: 'mobile', width: 390, height: 844 },
];
export const MOTION_MODES = [
  { id: 'live', reducedMotion: false, sceneMotion: true },
  { id: 'manual-paused', reducedMotion: false, sceneMotion: false },
  { id: 'reduced', reducedMotion: true, sceneMotion: true },
];

const FOCUSED_LENSES = {
  forest: ['left', 'center', 'right'],
  marsh: ['left', 'center', 'right'],
  backyard: ['left', 'center', 'right'],
  coast: ['left'],
  mountain: ['right'],
};

function stateId(state) {
  const pieces = [state.habitat, state.lens, state.condition, state.viewport.id, state.motionMode];
  if (state.behaviorId) pieces.push(state.behaviorId, state.behaviorCheckpoint);
  if (state.behaviorVariant) pieces.push(state.behaviorVariant);
  if (state.hintSpecies) pieces.push('hint-' + state.hintSpecies);
  if (state.targetScenario) pieces.push(state.targetScenario);
  return pieces.join('--');
}

function sceneAspectForViewport(viewport) {
  const stageWidth = Math.max(1, Math.min(1120, viewport.width - 48));
  const sceneHeight = Math.max(300, stageWidth / (900 / 500));
  return Number((stageWidth / sceneHeight).toFixed(4));
}

function makeState(input) {
  const viewport = typeof input.viewport === 'string'
    ? VIEWPORTS.find((candidate) => candidate.id === input.viewport)
    : input.viewport;
  const motion = MOTION_MODES.find((candidate) => candidate.id === input.motionMode);
  const state = {
    habitat: input.habitat,
    lens: input.lens,
    condition: input.condition,
    viewport,
    sceneAspect: input.sceneAspect == null ? sceneAspectForViewport(viewport) : Number(input.sceneAspect),
    motionMode: input.motionMode,
    reducedMotion: motion.reducedMotion,
    sceneMotion: motion.sceneMotion,
    lifecycleMs: input.lifecycleMs == null ? 4000 : input.lifecycleMs,
    behaviorMs: input.behaviorMs == null ? null : input.behaviorMs,
    frozenBehavior: input.frozenBehavior || null,
    targetId: input.targetId || null,
    dwellProgress: input.dwellProgress == null ? 0 : input.dwellProgress,
    behaviorId: input.behaviorId || null,
    behaviorCheckpoint: input.behaviorCheckpoint || null,
    behaviorVariant: input.behaviorVariant || null,
    behaviorPose: input.behaviorPose || null,
    behaviorPresence: input.behaviorPresence || null,
    behaviorTrackable: typeof input.behaviorTrackable === 'boolean' ? input.behaviorTrackable : null,
    hintSpecies: input.hintSpecies || null,
    assignmentSearchActive: input.assignmentSearchActive === true,
    assignmentComplete: input.assignmentComplete === true,
    assignmentDate: input.assignmentDate || '2026-08-12',
    assignmentClueStage: input.assignmentClueStage || null,
    difficulty: input.difficulty || 'normal',
    targetScenario: input.targetScenario || null,
  };
  state.id = stateId(state);
  return Object.freeze(state);
}

const baseStates = [];
for (const habitat of HABITATS) {
  for (const lens of LENSES) {
    for (const condition of CONDITIONS) {
      for (const viewport of VIEWPORTS) {
        for (const motion of MOTION_MODES) {
          baseStates.push(makeState({
            habitat,
            lens,
            condition,
            viewport,
            motionMode: motion.id,
          }));
        }
      }
    }
  }
}

const behaviorDefinitions = [
  {
    habitat: 'backyard', targetId: 'bird-2', behaviorId: 'feeder-grab-go', pose: 'chickadee-feeder',
    checkpoints: [
      ['landing', 8000, null], ['observe', 9000, null], ['seed-dip', 13000, null],
      ['seed-hold', 14000, null], ['preflight', 15000, null], ['depart', 16000, null],
    ],
  },
  {
    habitat: 'marsh', targetId: 'bird-1', behaviorId: 'hover-aim-dive', pose: 'kingfisher-hover',
    checkpoints: [
      ['braking', 5000, null], ['hover', 6000, null], ['pre-dive', 11000, null],
      ['dive', 13000, null],
    ],
  },
  {
    habitat: 'mountain', targetId: 'bird-2', behaviorId: 'ground-forage-flush', pose: 'junco-ground',
    checkpoints: [
      ['landing', 8000, null], ['forage', 9000, null], ['tail-flick', 14000, null],
      ['alert', 15000, null], ['flush', 16000, null],
    ],
  },
];

const legacyBehaviorStates = behaviorDefinitions.flatMap((definition) => definition.checkpoints.map((checkpoint) => {
  const nonTrackable = ['landing', 'braking', 'depart', 'dive', 'flush'].includes(checkpoint[0]);
  const acquired = !nonTrackable;
  return makeState({
    habitat: definition.habitat,
    lens: 'wide',
    condition: 'day',
    viewport: 'desktop',
    motionMode: 'live',
    lifecycleMs: checkpoint[1],
    behaviorMs: checkpoint[2],
    targetId: acquired ? definition.targetId : null,
    dwellProgress: acquired ? 52 : 0,
    frozenBehavior: acquired ? { script: definition.behaviorId, state: checkpoint[0], pose: definition.pose } : null,
    behaviorId: definition.behaviorId,
    behaviorCheckpoint: checkpoint[0],
  });
}));

// These checkpoints use the exact one-second lifecycle values sampled by the
// live game. Natural states prove the behavior is reachable without a QA
// freeze; a separate acquired sample verifies binocular descriptor parity.
const lifecycleBehaviorDefinitions = [
  {
    habitat: 'marsh', targetId: 'bird-1', behaviorId: 'hover-aim-dive',
    checkpoints: [
      { state: 'dive', lifecycleMs: 13000, pose: 'kingfisher-dive', presence: 'exiting', trackable: false },
    ],
    acquired: [],
  },
  {
    habitat: 'marsh', targetId: 'bird-2', behaviorId: 'paddle-dabble-recover',
    checkpoints: [
      { state: 'landing', lifecycleMs: 8000, pose: 'species-default', presence: 'arriving', trackable: false },
      { state: 'paddle', lifecycleMs: 9000, pose: 'species-default', presence: 'visible', trackable: true },
      { state: 'dabble', lifecycleMs: 12000, pose: 'mallard-dabble', presence: 'visible', trackable: true },
      { state: 'recover', lifecycleMs: 14000, pose: 'species-default', presence: 'visible', trackable: true },
      { state: 'depart', lifecycleMs: 16000, pose: 'species-default', presence: 'exiting', trackable: false },
    ],
    acquired: [{ state: 'dabble', lifecycleMs: 12000, pose: 'mallard-dabble' }],
  },
  {
    habitat: 'coast', targetId: 'bird-0', behaviorId: 'snag-land-sentinel-launch',
    checkpoints: [
      { state: 'landing', lifecycleMs: 1000, pose: 'eagle-flight', presence: 'arriving', trackable: false },
      { state: 'sentinel', lifecycleMs: 2000, pose: 'eagle-sentinel', presence: 'visible', trackable: true },
      { state: 'crouch', lifecycleMs: 8000, pose: 'eagle-sentinel', presence: 'visible', trackable: true },
      { state: 'launch', lifecycleMs: 9000, pose: 'eagle-flight', presence: 'exiting', trackable: false },
    ],
    acquired: [{ state: 'sentinel', lifecycleMs: 2000, pose: 'eagle-sentinel' }],
  },
];

const lifecycleBehaviorStates = lifecycleBehaviorDefinitions.flatMap((definition) => [
  ...definition.checkpoints.map((checkpoint) => makeState({
    habitat: definition.habitat, lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live',
    lifecycleMs: checkpoint.lifecycleMs, targetId: null, dwellProgress: 0, frozenBehavior: null,
    behaviorId: definition.behaviorId, behaviorCheckpoint: checkpoint.state, behaviorVariant: 'natural',
    behaviorPose: checkpoint.pose, behaviorPresence: checkpoint.presence, behaviorTrackable: checkpoint.trackable,
  })),
  ...definition.acquired.map((checkpoint) => makeState({
    habitat: definition.habitat, lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live',
    lifecycleMs: checkpoint.lifecycleMs, targetId: definition.targetId, dwellProgress: 52,
    frozenBehavior: { script: definition.behaviorId, state: checkpoint.state, pose: checkpoint.pose },
    behaviorId: definition.behaviorId, behaviorCheckpoint: checkpoint.state, behaviorVariant: 'acquired',
    behaviorPose: checkpoint.pose, behaviorPresence: 'visible', behaviorTrackable: true,
  })),
]);

const behaviorStates = [...legacyBehaviorStates, ...lifecycleBehaviorStates];

const hintedAnimationStates = ['live', 'manual-paused', 'reduced'].map((motionMode) => makeState({
  habitat: 'marsh', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode,
  lifecycleMs: 11000, hintSpecies: 'kingfisher',
}));

// Target Search changes the learner's goal and HUD only. These fixed-date
// scenarios keep the daily species deterministic while guarding desktop,
// mobile, reduced-motion, acquisition, and completion states.
const targetSearchStates = [
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', assignmentSearchActive: true, targetScenario: 'target-active' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', assignmentComplete: true, targetScenario: 'target-complete' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'mobile', motionMode: 'live', assignmentSearchActive: true, targetScenario: 'target-mobile' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'dusk', viewport: 'desktop', motionMode: 'reduced', assignmentSearchActive: true, targetScenario: 'target-reduced' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', assignmentSearchActive: true, targetId: 'bird-0', dwellProgress: 52, targetScenario: 'target-acquiring' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'habitat', targetScenario: 'target-clue-habitat' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'silhouette', targetScenario: 'target-clue-silhouette' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'behavior', targetScenario: 'target-clue-behavior' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'field-mark', targetScenario: 'target-clue-field-mark' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'desktop', motionMode: 'live', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'spatial', targetScenario: 'target-clue-spatial' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'day', viewport: 'mobile', motionMode: 'live', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'field-mark', targetScenario: 'target-clue-field-mark-mobile' }),
  makeState({ habitat: 'forest', lens: 'wide', condition: 'dusk', viewport: 'desktop', motionMode: 'reduced', difficulty: 'easy', assignmentSearchActive: true, assignmentClueStage: 'behavior', targetScenario: 'target-clue-posture-reduced' }),
];

export const EXHAUSTIVE_STATES = Object.freeze([...baseStates, ...behaviorStates, ...hintedAnimationStates, ...targetSearchStates]);

const coreIds = new Set();
function addCore(match) {
  const state = EXHAUSTIVE_STATES.find(match);
  if (!state) throw new Error('BirdLab visual QA core state could not be resolved.');
  coreIds.add(state.id);
}

// Every habitat and condition gets a wide establishing shot.
for (const habitat of HABITATS) {
  for (const condition of CONDITIONS) {
    addCore((state) => state.habitat === habitat && state.lens === 'wide' && state.condition === condition && state.viewport.id === 'desktop' && state.motionMode === 'live' && !state.behaviorId);
  }
}
// Only focused views with a readable species are captured. The exhaustive
// manifest enumerates every lens for DOM/layout consumers; production owns
// the ResizeObserver-driven wide fallback and its focused source contract.
for (const habitat of HABITATS) {
  for (const lens of FOCUSED_LENSES[habitat]) {
    addCore((state) => state.habitat === habitat && state.lens === lens && state.condition === 'day' && state.viewport.id === 'desktop' && state.motionMode === 'live' && !state.behaviorId);
  }
}
for (const habitat of HABITATS) {
  addCore((state) => state.habitat === habitat && state.lens === 'wide' && state.condition === 'day' && state.viewport.id === 'mobile' && state.motionMode === 'live' && !state.behaviorId);
  addCore((state) => state.habitat === habitat && state.lens === 'wide' && state.condition === 'dusk' && state.viewport.id === 'desktop' && state.motionMode === 'reduced' && !state.behaviorId);
  addCore((state) => state.habitat === habitat && state.lens === 'wide' && state.condition === 'dawn' && state.viewport.id === 'desktop' && state.motionMode === 'manual-paused' && !state.behaviorId);
}
for (const state of behaviorStates) coreIds.add(state.id);
for (const state of hintedAnimationStates) coreIds.add(state.id);
for (const state of targetSearchStates) coreIds.add(state.id);

export const CORE_STATES = Object.freeze(EXHAUSTIVE_STATES.filter((state) => coreIds.has(state.id)));

export function validateStateMatrix() {
  const errors = [];
  const ids = new Set();
  for (const state of EXHAUSTIVE_STATES) {
    if (!state.id || ids.has(state.id)) errors.push('Duplicate or empty scenario id: ' + state.id);
    ids.add(state.id);
    if (!HABITATS.includes(state.habitat)) errors.push('Unknown habitat in ' + state.id);
    if (!LENSES.includes(state.lens)) errors.push('Unknown lens in ' + state.id);
    if (!CONDITIONS.includes(state.condition)) errors.push('Unknown condition in ' + state.id);
    if (!state.viewport || !VIEWPORTS.some((viewport) => viewport.id === state.viewport.id)) errors.push('Unknown viewport in ' + state.id);
    if (!MOTION_MODES.some((mode) => mode.id === state.motionMode)) errors.push('Unknown motion mode in ' + state.id);
    if (state.behaviorVariant) {
      if (!['natural', 'acquired'].includes(state.behaviorVariant)) errors.push('Unknown behavior variant in ' + state.id);
      if (!state.behaviorPose) errors.push('Behavior pose is missing in ' + state.id);
      if (!['arriving', 'visible', 'exiting'].includes(state.behaviorPresence)) errors.push('Behavior presence is invalid in ' + state.id);
      if (typeof state.behaviorTrackable !== 'boolean') errors.push('Behavior trackability is missing in ' + state.id);
      if (!Number.isInteger(state.lifecycleMs) || state.lifecycleMs % 1000 !== 0) errors.push('Behavior checkpoint is off the one-second lifecycle lattice in ' + state.id);
      if (state.behaviorVariant === 'natural' && (state.targetId || state.frozenBehavior || state.dwellProgress !== 0)) errors.push('Natural behavior checkpoint is accidentally acquired in ' + state.id);
      if (state.behaviorVariant === 'acquired' && (!state.targetId || !state.frozenBehavior || state.dwellProgress <= 0)) errors.push('Acquired behavior checkpoint is incomplete in ' + state.id);
    }
  }
  for (const state of CORE_STATES) {
    if (!ids.has(state.id)) errors.push('Core scenario is absent from exhaustive matrix: ' + state.id);
  }
  if (baseStates.length !== 360) errors.push('Expected 360 base matrix states; received ' + baseStates.length);
  if (!behaviorStates.length) errors.push('Behavior checkpoint states are missing.');
  if (targetSearchStates.length < 5) errors.push('Target Search visual states are incomplete.');
  return { ok: errors.length === 0, errors, exhaustiveCount: EXHAUSTIVE_STATES.length, coreCount: CORE_STATES.length };
}

function installDom(reducedMotion) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://birdlab.local/' });
  const media = {
    matches: !!reducedMotion,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; },
  };
  dom.window.matchMedia = () => media;
  dom.window.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
  dom.window.cancelAnimationFrame = clearTimeout;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.localStorage = dom.window.localStorage;
  return dom;
}

// Exported so a caller can render/capture a chosen subset into a directory of
// its own. The default output lives under test-results/, which other tooling
// in this repo clears mid-run; a capture racing that cleanup silently loses
// most of its shots.
let smokeHarnessImportOrdinal = 0;
const smokeHarnessModuleUrl = pathToFileURL(resolve('tests/helpers/stem_widgets_smoke_harness.js')).href;

async function loadSmokeHarness(reducedMotion) {
  // Vitest's module runner cannot reliably resolve a second cache-busted
  // relative file import after renderScenarios installs a fresh jsdom window.
  // An absolute file URL bypasses that transformed /@id/file: path while the
  // ordinal still re-evaluates the helper for each newly installed window.
  const cacheKey = (reducedMotion ? 'reduced' : 'standard') + '-' + (++smokeHarnessImportOrdinal);
  return import(/* @vite-ignore */ smokeHarnessModuleUrl + '?birdlabVisualQa=' + cacheKey);
}

export async function renderScenarios(states) {
  let activeReduced = null;
  let harness = null;
  const results = [];
  for (const state of states) {
    if (activeReduced !== state.reducedMotion) {
      installDom(state.reducedMotion);
      harness = await loadSmokeHarness(state.reducedMotion);
      harness.resetStemLab();
      harness.loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
      activeReduced = state.reducedMotion;
    }
    window.localStorage.clear();
    delete window.__alloflowBirdLab;
    const markup = harness.renderTool('birdLab', {
      birdLab: {
        view: 'ispy',
        activeHabitat: state.habitat,
        blSceneLens: state.lens,
        blSceneMotion: state.sceneMotion,
        blFieldCondition: state.condition,
        blDifficulty: state.difficulty,
        blAssignmentSearchActive: state.assignmentSearchActive,
      },
    }, {
      props: {
        birdLabVisualQa: {
          lifecycleMs: state.lifecycleMs,
          behaviorMs: state.behaviorMs,
          frozenBehavior: state.frozenBehavior,
          targetId: state.targetId,
          dwellProgress: state.dwellProgress,
          viewport: state.viewport,
          sceneAspect: state.sceneAspect,
          assignmentSearchActive: state.assignmentSearchActive,
          assignmentComplete: state.assignmentComplete,
          assignmentDate: state.assignmentDate,
          assignmentClueStage: state.assignmentClueStage,
          hintSpecies: state.hintSpecies,
        },
      },
    });
    // The tool injects its shared gradient/filter defs as a hidden <svg> in
    // document.BODY, not head. Replaying only head silently drops every
    // fill="url(#…)" — sprite shading, atmospheric haze and the whole
    // dawn/day/dusk colour grade — so the shots looked flat and identical
    // across conditions and no screenshot review could ever see those layers.
    const spriteDefsNode = document.getElementById('birdlab-sprite-defs');
    results.push({
      state,
      markup,
      injectedStyles: document.head.innerHTML,
      spriteDefs: spriteDefsNode ? spriteDefsNode.outerHTML : '',
    });
  }
  return results;
}

// Every paint reference in the scene must resolve to a def that the capture
// page actually contains. A url(#…) pointing at nothing renders as "no fill"
// in Chrome, which looks like a plausible flat-colour design instead of a
// missing layer — the exact failure that hid the sprite shading and the
// dawn/dusk grade from this harness.
function assertPaintReferencesResolve(result) {
  const { state, markup } = result;
  const available = new Set();
  const idPattern = /\sid="([^"]+)"/g;
  for (const source of [markup, result.spriteDefs || '']) {
    let match;
    while ((match = idPattern.exec(source)) !== null) available.add(match[1]);
  }
  const missing = new Set();
  const refPattern = /url\(#([^)"']+)\)/g;
  let ref;
  while ((ref = refPattern.exec(markup)) !== null) {
    if (!available.has(ref[1])) missing.add(ref[1]);
  }
  if (missing.size) {
    throw new Error(state.id + ' references undefined paint ids: ' + [...missing].sort().join(', '));
  }
}

function assertRenderedScenario(result) {
  const { state, markup } = result;
  assertPaintReferencesResolve(result);
  const expected = [
    'data-birdlab-ispy="true"',
    'data-birdlab-scene-shell="true"',
    'data-birdlab-realistic-scene="' + state.habitat + '"',
    'data-birdlab-condition="' + state.condition + '"',
    'data-birdlab-scene-lens="' + state.lens + '"',
    'data-birdlab-observation-rail="true"',
  ];
  for (const marker of expected) {
    if (!markup.includes(marker)) throw new Error(state.id + ' is missing ' + marker);
  }
  if ((state.motionMode === 'manual-paused' || state.motionMode === 'reduced') && !markup.includes('birdlab-scene--motion-off')) {
    throw new Error(state.id + ' should render with motion paused.');
  }
  if (state.targetScenario) {
    const { JSDOM } = require('jsdom');
    const targetDom = new JSDOM('<!doctype html><body>' + markup + '</body>');
    const targetDocument = targetDom.window.document;
    const card = targetDocument.querySelector('[data-birdlab-target-search]');
    const rail = targetDocument.querySelector('[data-birdlab-target-search-state]');
    if (!card || !rail) throw new Error(state.id + ' is missing Target Search card or rail state.');
    const expectedState = state.assignmentComplete ? 'complete' : (state.assignmentSearchActive ? 'active' : 'free');
    if (card.getAttribute('data-birdlab-target-search') !== expectedState || rail.getAttribute('data-birdlab-target-search-state') !== expectedState) {
      throw new Error(state.id + ' Target Search card and rail states disagree.');
    }
    const cardSpecies = card.getAttribute('data-birdlab-target-species');
    const railSpecies = rail.getAttribute('data-birdlab-target-species');
    if (expectedState === 'active') {
      if (!cardSpecies || cardSpecies !== railSpecies) throw new Error(state.id + ' active Target Search species disagree.');
      const assignmentNodes = [...targetDocument.querySelectorAll('[data-birdlab-assignment-target="true"]')];
      const actor = assignmentNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
      const hotspot = assignmentNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
      if (!actor || !hotspot || actor.getAttribute('data-birdlab-species') !== cardSpecies || hotspot.getAttribute('data-birdlab-species') !== cardSpecies) {
        throw new Error(state.id + ' card, actor, and hotspot must share one target species.');
      }
    } else if (expectedState === 'complete') {
      if (!cardSpecies || cardSpecies !== railSpecies) throw new Error(state.id + ' completed Target Search species disagree.');
    }
    if (state.assignmentClueStage) {
      const clueStage = targetDocument.querySelector('[data-birdlab-target-clue-stage="' + state.assignmentClueStage + '"]');
      if (!clueStage) throw new Error(state.id + ' is missing Target Search clue stage ' + state.assignmentClueStage + '.');
      if (clueStage.getAttribute('data-birdlab-target-clue-stage') !== state.assignmentClueStage) {
        throw new Error(state.id + ' has the wrong Target Search clue stage marker.');
      }
      const expectedClueKind = state.assignmentClueStage === 'spatial' ? 'spatial' : 'text';
      if (clueStage.getAttribute('data-birdlab-target-clue-kind') !== expectedClueKind) {
        throw new Error(state.id + ' has the wrong Target Search clue kind.');
      }
      if (clueStage.getAttribute('data-birdlab-target-clue-spatial') !== (state.assignmentClueStage === 'spatial' ? 'true' : 'false')) {
        throw new Error(state.id + ' has the wrong Target Search spatial marker.');
      }
    }
  }
  if (!state.targetScenario && !state.assignmentSearchActive && !state.assignmentComplete) {
    const { JSDOM } = require('jsdom');
    const freeDom = new JSDOM('<!doctype html><body>' + markup + '</body>');
    const freeCard = freeDom.window.document.querySelector('[data-birdlab-target-search="free"]');
    const freeRail = freeDom.window.document.querySelector('[data-birdlab-target-search-state="free"]');
    if (!freeCard || !freeRail || freeCard.hasAttribute('data-birdlab-target-species') || freeRail.hasAttribute('data-birdlab-target-species')) {
      throw new Error(state.id + ' must keep the daily target private during free discovery.');
    }
  }
  if (state.behaviorId) {
    const behaviorMarker = 'data-birdlab-behavior="' + state.behaviorId + '" data-birdlab-behavior-state="' + state.behaviorCheckpoint + '"';
    if (!markup.includes(behaviorMarker)) throw new Error(state.id + ' is missing expected checkpoint ' + behaviorMarker);
    const { JSDOM } = require('jsdom');
    const behaviorDom = new JSDOM('<!doctype html><body>' + markup + '</body>');
    const behaviorNodes = [...behaviorDom.window.document.querySelectorAll('[data-birdlab-behavior="' + state.behaviorId + '"]')];
    const actorNode = behaviorNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
    const targetNode = behaviorNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
    if (!actorNode || !targetNode) throw new Error(state.id + ' must render matching visual and focus behavior nodes.');
    const targetButton = targetNode.querySelector('[data-birdlab-kind="bird"]');
    const expectedPresence = state.behaviorPresence || ((state.behaviorCheckpoint === 'landing' || state.behaviorCheckpoint === 'braking') ? 'arriving' : null);
    if (expectedPresence && actorNode.getAttribute('data-birdlab-presence') !== expectedPresence) throw new Error(state.id + ' rendered the wrong lifecycle presence.');
    if (expectedPresence === 'arriving' && !result.injectedStyles.includes('.birdlab-scene-subject--arriving { opacity: 1')) throw new Error(state.id + ' arrival CSS must paint at nonzero opacity.');
    for (const attribute of ['data-birdlab-presence', 'data-birdlab-behavior', 'data-birdlab-behavior-state', 'data-birdlab-behavior-pose', 'data-birdlab-behavior-frozen']) {
      if (actorNode.getAttribute(attribute) !== targetNode.getAttribute(attribute)) throw new Error(state.id + ' actor/target mismatch for ' + attribute);
    }
    if (state.behaviorPose && actorNode.getAttribute('data-birdlab-behavior-pose') !== state.behaviorPose) throw new Error(state.id + ' rendered the wrong behavior pose.');
    if (typeof state.behaviorTrackable === 'boolean') {
      if (!targetButton || targetButton.disabled === state.behaviorTrackable || targetButton.tabIndex !== (state.behaviorTrackable ? 0 : -1)) throw new Error(state.id + ' rendered the wrong behavior trackability.');
    }
    if (state.behaviorVariant === 'natural' && actorNode.hasAttribute('data-birdlab-behavior-frozen')) throw new Error(state.id + ' natural checkpoint must remain unacquired.');
    if (state.behaviorId === 'hover-aim-dive' && state.behaviorCheckpoint === 'dive') {
      const impact = behaviorDom.window.document.querySelector('.birdlab-kingfisher-impact');
      if (!impact || impact.closest('.birdlab-motion-subject')) throw new Error(state.id + ' kingfisher impact must stay fixed at the waterline.');
    }
    if (state.behaviorId === 'paddle-dabble-recover' && state.behaviorVariant === 'natural') {
      const actorMotionForWater = actorNode.querySelector('.birdlab-motion-subject');
      const targetMotionForWater = targetNode.querySelector('.birdlab-motion-subject');
      const isDabble = state.behaviorCheckpoint === 'dabble';
      if (!actorMotionForWater || !targetMotionForWater || actorMotionForWater.classList.contains('birdlab-motion-subject--dabbling') !== isDabble || targetMotionForWater.classList.contains('birdlab-motion-subject--dabbling') !== isDabble) throw new Error(state.id + ' mallard route hold diverged.');
      if (!actorNode.querySelector('.birdlab-mallard-contact--' + state.behaviorCheckpoint)) throw new Error(state.id + ' mallard contact state is missing.');
    }
    if (state.frozenBehavior) {
      if (actorNode.getAttribute('data-birdlab-behavior-frozen') !== 'true') throw new Error(state.id + ' must freeze its acquired behavior checkpoint.');
      if (actorNode.getAttribute('data-birdlab-behavior-pose') !== state.frozenBehavior.pose) throw new Error(state.id + ' froze the wrong behavior pose.');
    }
    const actorMotion = actorNode.querySelector('.birdlab-motion-subject');
    const targetMotion = targetNode.querySelector('.birdlab-motion-subject');
    if (!actorMotion || !targetMotion || actorMotion.className.baseVal !== targetMotion.className.baseVal || actorMotion.getAttribute('style') !== targetMotion.getAttribute('style')) {
      throw new Error(state.id + ' actor/target motion wrappers diverged.');
    }
    if (!actorMotion.querySelector('[data-birdlab-motion-box="60x60"]') || !targetMotion.querySelector('[data-birdlab-motion-box="60x60"]')) {
      throw new Error(state.id + ' actor/target fixed transform boxes are missing.');
    }
  }
  if (state.hintSpecies) {
    const { JSDOM } = require('jsdom');
    const hintDom = new JSDOM('<!doctype html><body>' + markup + '</body>');
    const hintedNodes = [...hintDom.window.document.querySelectorAll('[data-birdlab-species="' + state.hintSpecies + '"]')];
    const hintedActor = hintedNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
    const hintedTarget = hintedNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
    if (!hintedActor || !hintedTarget) throw new Error(state.id + ' hinted actor and target are missing.');
    const hintedMotion = hintedActor.querySelector('.birdlab-motion-subject');
    const hintedTargetMotion = hintedTarget.querySelector('.birdlab-motion-subject');
    if (!hintedMotion || !hintedTargetMotion || !hintedMotion.classList.contains('birdlab-motion-subject--anchored') || hintedMotion.className.baseVal !== hintedTargetMotion.className.baseVal) throw new Error(state.id + ' hint containment diverged.');
    if (!hintedActor.querySelector('.birdlab-anatomy-motion--pinned-safe')) throw new Error(state.id + ' hinted bird lost its bounded anatomy motion.');
  }
}

function builtCss() {
  const cssDir = resolve('desktop/web-app/build/static/css');
  let css;
  try {
    css = readdirSync(cssDir).filter((file) => file.endsWith('.css')).sort().map((file) => readFileSync(join(cssDir, file), 'utf8')).join('\n');
  } catch (error) {
    throw new Error('BirdLab capture requires the compiled app CSS at ' + cssDir + ': ' + error.message);
  }
  if (!css.trim()) throw new Error('BirdLab capture found no compiled app CSS at ' + cssDir + '.');
  return css;
}

function extractStage(markup) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><body>' + markup + '</body>');
  const shell = dom.window.document.querySelector('[data-birdlab-scene-shell="true"]');
  const rail = dom.window.document.querySelector('[data-birdlab-observation-rail="true"]');
  if (!shell || !rail) throw new Error('BirdLab visual stage could not find scene shell and observation rail.');
  return shell.outerHTML + rail.outerHTML;
}

export async function captureScenarios(results, outputDir) {
  const { chromium } = await import('playwright');
  mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const css = builtCss();
  const manifest = [];
  try {
    for (const result of results) {
      const { state } = result;
      const context = await browser.newContext({
        viewport: { width: state.viewport.width, height: state.viewport.height },
        reducedMotion: state.reducedMotion ? 'reduce' : 'no-preference',
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });
      const page = await context.newPage();
      const stage = extractStage(result.markup);
      const html = '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style>' + result.injectedStyles + '<style>body{margin:0;padding:24px;background:#e2e8f0;font-family:system-ui,sans-serif}.birdlab-visual-stage{width:min(1120px,100%);margin:0 auto}</style></head><body>' + result.spriteDefs + '<main class="birdlab-visual-stage" data-birdlab-visual-stage="true">' + stage + '</main></body></html>';
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
      });
      const screenshotPath = join(outputDir, state.id + '.png');
      await page.locator('[data-birdlab-visual-stage="true"]').screenshot({ path: screenshotPath });
      manifest.push({ id: state.id, file: screenshotPath, state });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), scenarios: manifest }, null, 2) + '\n');
  return manifest;
}

function targetSearchSceneSignature(markup) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><body>' + markup + '</body>');
  const document = dom.window.document;
  const svg = document.querySelector('[data-birdlab-realistic-scene]');
  const actors = [...document.querySelectorAll('[data-birdlab-species][data-birdlab-presence]')].map((node) => [
    node.getAttribute('data-birdlab-species'), node.getAttribute('data-birdlab-presence'), node.getAttribute('class'), node.getAttribute('style'),
  ]);
  return JSON.stringify({ viewBox: svg && svg.getAttribute('viewBox'), actors });
}

function assertTargetSearchDoesNotRewriteScene(rendered) {
  for (const active of rendered.filter((result) => result.state.targetScenario
    && result.state.assignmentSearchActive
    && !result.state.targetId
    && result.state.assignmentClueStage !== 'spatial')) {
    const state = active.state;
    const free = rendered.find((candidate) => !candidate.state.targetScenario
      && candidate.state.habitat === state.habitat
      && candidate.state.lens === state.lens
      && candidate.state.condition === state.condition
      && candidate.state.viewport.id === state.viewport.id
      && candidate.state.motionMode === state.motionMode);
    if (!free) throw new Error(state.id + ' has no free-discovery comparison state.');
    if (targetSearchSceneSignature(active.markup) !== targetSearchSceneSignature(free.markup)) {
      throw new Error(state.id + ' changed actor lifecycle, geometry, or lens composition.');
    }
  }
}

export async function runCheck() {
  const matrix = validateStateMatrix();
  if (!matrix.ok) throw new Error(matrix.errors.join('\n'));
  const rendered = await renderScenarios(CORE_STATES);
  rendered.forEach(assertRenderedScenario);
  assertTargetSearchDoesNotRewriteScene(rendered);
  return { ...matrix, renderedCount: rendered.length };
}

async function main() {
  const capture = process.argv.includes('--capture');
  const check = process.argv.includes('--check') || !capture;
  const matrix = validateStateMatrix();
  if (!matrix.ok) throw new Error(matrix.errors.join('\n'));
  const rendered = await renderScenarios(CORE_STATES);
  if (check) {
    rendered.forEach(assertRenderedScenario);
    assertTargetSearchDoesNotRewriteScene(rendered);
  }
  if (capture) {
    const outputDir = resolve('test-results/birdlab-visual-qa');
    const manifest = await captureScenarios(rendered, outputDir);
    console.log('[BirdLab visual QA] Captured ' + manifest.length + ' scenarios in ' + outputDir);
  } else {
    console.log('[BirdLab visual QA] ' + rendered.length + ' core states passed; ' + matrix.exhaustiveCount + ' exhaustive states validated.');
  }
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    console.error('[BirdLab visual QA] ' + (error && error.stack ? error.stack : error));
    process.exitCode = 1;
  });
}

