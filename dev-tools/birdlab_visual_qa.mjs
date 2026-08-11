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
    targetId: input.targetId || null,
    dwellProgress: input.dwellProgress == null ? 0 : input.dwellProgress,
    behaviorId: input.behaviorId || null,
    behaviorCheckpoint: input.behaviorCheckpoint || null,
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
    habitat: 'backyard', targetId: 'bird-2', behaviorId: 'feeder-grab-go',
    checkpoints: [
      ['landing', 8000, null], ['observe', 9000, null], ['seed-dip', 13000, null],
      ['seed-hold', 14000, null], ['preflight', 15000, null], ['depart', 16000, null],
    ],
  },
  {
    habitat: 'marsh', targetId: 'bird-1', behaviorId: 'hover-aim-dive',
    checkpoints: [
      ['braking', 5000, null], ['hover', 6000, null], ['pre-dive', 11000, null],
      ['dive', 13000, null],
    ],
  },
  {
    habitat: 'mountain', targetId: 'bird-2', behaviorId: 'ground-forage-flush',
    checkpoints: [
      ['landing', 8000, null], ['forage', 9000, null], ['tail-flick', 14000, null],
      ['alert', 15000, null], ['flush', 16000, null],
    ],
  },
];

const behaviorStates = behaviorDefinitions.flatMap((definition) => definition.checkpoints.map((checkpoint) => makeState({
  habitat: definition.habitat,
  lens: 'wide',
  condition: 'day',
  viewport: 'desktop',
  motionMode: 'live',
  lifecycleMs: checkpoint[1],
  behaviorMs: checkpoint[2],
  targetId: checkpoint[0] === 'observe' || checkpoint[0] === 'hover' || checkpoint[0] === 'forage' ? definition.targetId : null,
  dwellProgress: checkpoint[0] === 'observe' || checkpoint[0] === 'hover' || checkpoint[0] === 'forage' ? 52 : 0,
  behaviorId: definition.behaviorId,
  behaviorCheckpoint: checkpoint[0],
})));

export const EXHAUSTIVE_STATES = Object.freeze([...baseStates, ...behaviorStates]);

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
  }
  for (const state of CORE_STATES) {
    if (!ids.has(state.id)) errors.push('Core scenario is absent from exhaustive matrix: ' + state.id);
  }
  if (baseStates.length !== 360) errors.push('Expected 360 base matrix states; received ' + baseStates.length);
  if (!behaviorStates.length) errors.push('Behavior checkpoint states are missing.');
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

async function renderScenarios(states) {
  let activeReduced = null;
  let harness = null;
  const results = [];
  for (const state of states) {
    if (activeReduced !== state.reducedMotion) {
      installDom(state.reducedMotion);
      harness = await import('../tests/helpers/stem_widgets_smoke_harness.js?birdlabVisualQa=' + (state.reducedMotion ? 'reduced' : 'standard') + '-' + Date.now());
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
      },
    }, {
      props: {
        birdLabVisualQa: {
          lifecycleMs: state.lifecycleMs,
          behaviorMs: state.behaviorMs,
          targetId: state.targetId,
          dwellProgress: state.dwellProgress,
          viewport: state.viewport,
          sceneAspect: state.sceneAspect,
        },
      },
    });
    results.push({ state, markup, injectedStyles: document.head.innerHTML });
  }
  return results;
}

function assertRenderedScenario(result) {
  const { state, markup } = result;
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
  if (state.behaviorId) {
    const behaviorMarker = 'data-birdlab-behavior="' + state.behaviorId + '" data-birdlab-behavior-state="' + state.behaviorCheckpoint + '"';
    if (!markup.includes(behaviorMarker)) throw new Error(state.id + ' is missing expected checkpoint ' + behaviorMarker);
    const { JSDOM } = require('jsdom');
    const behaviorDom = new JSDOM('<!doctype html><body>' + markup + '</body>');
    const behaviorNodes = [...behaviorDom.window.document.querySelectorAll('[data-birdlab-behavior="' + state.behaviorId + '"]')];
    const actorNode = behaviorNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
    const targetNode = behaviorNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
    if (!actorNode || !targetNode) throw new Error(state.id + ' must render matching visual and focus behavior nodes.');
    if (state.behaviorCheckpoint === 'landing' || state.behaviorCheckpoint === 'braking') {
      if (actorNode.getAttribute('data-birdlab-presence') !== 'arriving') throw new Error(state.id + ' arrival checkpoint must be visible and nontrackable.');
      if (!result.injectedStyles.includes('.birdlab-scene-subject--arriving { opacity: 1')) throw new Error(state.id + ' arrival CSS must paint at nonzero opacity.');
    }
    for (const attribute of ['data-birdlab-presence', 'data-birdlab-behavior', 'data-birdlab-behavior-state']) {
      if (actorNode.getAttribute(attribute) !== targetNode.getAttribute(attribute)) throw new Error(state.id + ' actor/target mismatch for ' + attribute);
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

async function captureScenarios(results, outputDir) {
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
      const html = '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style>' + result.injectedStyles + '<style>body{margin:0;padding:24px;background:#e2e8f0;font-family:system-ui,sans-serif}.birdlab-visual-stage{width:min(1120px,100%);margin:0 auto}</style></head><body><main class="birdlab-visual-stage" data-birdlab-visual-stage="true">' + stage + '</main></body></html>';
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

export async function runCheck() {
  const matrix = validateStateMatrix();
  if (!matrix.ok) throw new Error(matrix.errors.join('\n'));
  const rendered = await renderScenarios(CORE_STATES);
  rendered.forEach(assertRenderedScenario);
  return { ...matrix, renderedCount: rendered.length };
}

async function main() {
  const capture = process.argv.includes('--capture');
  const check = process.argv.includes('--check') || !capture;
  const matrix = validateStateMatrix();
  if (!matrix.ok) throw new Error(matrix.errors.join('\n'));
  const rendered = await renderScenarios(CORE_STATES);
  if (check) rendered.forEach(assertRenderedScenario);
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

