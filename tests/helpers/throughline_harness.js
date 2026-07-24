// Throughline (spatial unit builder) render golden-master harness.
//
// Pins the RENDER phase of mind_map_module.js (registered as
// window.AlloModules.MindMap / .Throughline) under fixed, deterministic prop +
// localStorage states, using real React 18 + renderToStaticMarkup — the
// tests/helpers/lumen_harness.js pattern.
//
// WHY (the design's mandatory Step 0): mind_map_module.js is being grown with a
// long async "Generate Unit" driver + a review state machine. It was the only
// major module with NO characterization net. This pins v1+v1.1 render across the
// load-bearing states so a drive-by edit that structurally breaks the canvas,
// the empty state, the toolbar, or the populated/seed render fails loudly.
//
// DETERMINISM: the module's uid() uses Date.now()+Math.random() and emptyUnit()
// uses new Date(); the test freezes both so the digest is stable run-to-run.
//
// HONEST LIMIT: SSR render only. useEffect (incl. the seedUnitId auto-build) and
// click/async handlers do NOT run; the seeded/populated states are pinned by
// pre-seeding localStorage with a unitLayout (the lumen feed-state-in pattern).

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

export const React = require(resolve(MODULES_DIR, 'react'));
export const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

const STORAGE_KEY = 'alloflow_throughline_v1';
let _Component = null;

export function setupThroughline() {
  if (_Component) return _Component;
  const src = readFileSync(resolve(process.cwd(), 'mind_map_module.js'), 'utf8');
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.Throughline;
  delete window.AlloModules.MindMap;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  _Component = window.AlloModules.Throughline;
  if (typeof _Component !== 'function') {
    throw new Error('Throughline harness: module did not register window.AlloModules.Throughline (anchor changed?).');
  }
  return _Component;
}

const noop = () => {};
function baseProps(over) {
  return Object.assign({
    isOpen: true,
    onClose: noop,
    addToast: noop,
    studentNickname: '',
    t: (k) => k,
  }, over || {});
}

/** Seed localStorage with a unitLayout so loadUnitFromStorage returns a populated unit. */
export function seedStorage(unitLayout) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unitLayout)); } catch (_) {}
}
export function clearStorage() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

function scrub(html) { return html.split('><').join('>\n<'); }

/** SSR-render the modal with a given prop overlay. Returns scrubbed HTML. */
export function renderState(over) {
  const C = setupThroughline();
  return scrub(ReactDOMServer.renderToStaticMarkup(React.createElement(C, baseProps(over))));
}

/** A small deterministic 2-lesson unitLayout for the populated state. */
export function sampleUnit() {
  return {
    schemaVersion: 1,
    generator: 'throughline@1',
    minAppSchema: 1,
    unitId: 'tl_fixture1',
    sourceUnitId: 'u_fix',
    title: 'The Water Cycle',
    essentialQuestion: 'How does Earth recycle its water?',
    author: '',
    license: null,
    parentUnitId: null,
    forkedFrom: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    nodes: [
      { nodeId: 'n1', lessonId: 'h1', x: 80, y: 120, description: 'Hook.', role: '', status: 'draft', category: 'u_fix' },
      { nodeId: 'n2', lessonId: 'h2', x: 350, y: 120, description: 'Key terms.', role: '', status: 'draft', category: 'u_fix' },
    ],
    edges: [{ from: 'n1', to: 'n2', type: 'sequence' }],
  };
}

export function sampleHistory() {
  return [
    { id: 'h1', type: 'analysis', title: 'Source Intro', meta: '5th Gr Analysis', unitId: 'u_fix', data: {} },
    { id: 'h2', type: 'glossary', title: 'Key Terms', meta: '5th Gr Glossary', unitId: 'u_fix', data: [] },
    { id: 'h3', type: 'quiz', title: 'Exit Ticket', meta: '5th Gr Quiz', unitId: 'u_other', data: {} },
  ];
}

export function sampleUnits() {
  return [{ id: 'u_fix', name: 'Water Cycle' }, { id: 'u_other', name: 'Rocks' }];
}

/** Stub host capabilities that turn on the Generate-Unit affordance. They are
 *  never invoked under SSR (no click handlers run); their presence is what makes
 *  the "✨ Generate unit" toolbar button render, so we can pin that surface. */
export function sampleGenProps() {
  return {
    onProposeUnit: async () => ({ title: 'X', essentialQuestion: '', gradeBand: '', desiredResults: [], goldenThread: [], keyTerms: [], lessons: [] }),
    onGenerateUnitLesson: async () => ({ items: [], dnaOut: {}, anchorItem: null, nulls: [] }),
  };
}
