import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
const axe = require(resolve(MODULES_DIR, 'axe-core'));

const ctxStub = new Proxy({}, { get: () => () => ctxStub });
HTMLCanvasElement.prototype.getContext = function () { return ctxStub; };
if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};

const noop = () => {};
function mountCtx(toolData, setToolData) {
  const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': 'true' }) });
  return { React, toolData, setToolData, update: noop, updateMulti: noop, setStemLabTool: noop,
    addToast: noop, announceToSR: noop, awardXP: noop, callGemini: null, aiHintsEnabled: false,
    gradeLevel: '7th Grade', icons: Icons, t: (k, f) => (f != null ? f : k) };
}

function mountLive(seed) {
  const cfg = window.StemLab._registry.spaceStation;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ spaceStation: seed });
    return cfg.render(mountCtx(toolData, setToolData));
  }
  act(() => { root.render(React.createElement(Harness)); });
  return { host, cleanup() { try { act(() => root.unmount()); } catch (_) {} host.remove(); } };
}

// Scoped to the two NEW regions only. axe cost is superlinear in tree size, so
// auditing the whole 9,700-line tool here would take minutes and duplicate what
// the main suite already covers; these runs answer one question — did the
// prediction gate and the challenge deck introduce a violation.
async function auditRegion(selector, seed) {
  const live = mountLive(seed);
  try {
    const node = live.host.querySelector(selector);
    expect(node, 'region ' + selector + ' should render').toBeTruthy();
    const res = await axe.run(node, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return res.violations.map((v) => v.id + ' (' + v.nodes.length + ')');
  } finally {
    live.cleanup();
  }
}

const SEED = {
  tab: 'orbit', selModule: 'zarya', orbitAlt: 250, orbitInc: 51.6,
  orbitPredictRef: 420, orbitPredictPick: null, orbitPredictAlt: null, orbitPredictLog: [],
  orbitChallenge: 'phasing', orbitChallengePick: null, orbitChallengeDone: {},
  interiorDone: {}, seenModules: {}, seenHours: {},
};

describe('orbit lab additions — accessibility', () => {
  it('the prediction gate has no axe violations while closed', async () => {
    resetStemLab();
    loadTool('desktop/web-app/public/stem_lab/stem_tool_spacestation.js', 'spaceStation');
    expect(await auditRegion('#iss-orbit-predict', SEED)).toEqual([]);
  });

  it('the prediction gate has no axe violations once committed', async () => {
    resetStemLab();
    loadTool('desktop/web-app/public/stem_lab/stem_tool_spacestation.js', 'spaceStation');
    const committed = { ...SEED, orbitPredictPick: 'faster', orbitPredictAlt: 250,
      orbitPredictLog: [{ from: 420, to: 250, pick: 'faster', truth: 'faster', correct: true, fromV: 7.66, toV: 7.76 },
                        { from: 300, to: 420, pick: 'faster', truth: 'slower', correct: false, fromV: 7.73, toV: 7.66 }] };
    expect(await auditRegion('#iss-orbit-predict', committed)).toEqual([]);
  });

  it('the challenge deck has no axe violations, answered or not', async () => {
    resetStemLab();
    loadTool('desktop/web-app/public/stem_lab/stem_tool_spacestation.js', 'spaceStation');
    // The deck is the last card in the Orbit tab; it carries no id, so it is
    // located by the aria-label the card() helper puts on its region.
    const SEL = '[aria-label*="Orbit challenges"]';
    expect(await auditRegion(SEL, SEED)).toEqual([]);
    expect(await auditRegion(SEL,
      { ...SEED, orbitChallengePick: 'slowdown', orbitChallengeDone: { phasing: true } })).toEqual([]);
  });
});
