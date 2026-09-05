// Water Cycle — independent accessibility audit with axe-core.
//
// WHY THIS EXISTS
// The tool's other 47 suites assert affordances somebody chose to add: this aria-label exists,
// that region announces. They cannot report the things nobody thought of — a control with an empty
// accessible name, an aria-* attribute invalid on the role it sits on, a duplicated id, a list
// whose children are not list items. axe knows those rules; a hand-written pin does not.
//
// ★ Four smaller STEM tools already have one of these (nuclearLab, lumen, skateLab, titration) and
// the LARGEST tool in the lab — 28,000 lines, four modes, the flagship "Be the Water" simulation —
// did not. That is the wrong way round: the surface with the most controls had the least
// independent checking.
//
// SCOPE, stated honestly. This renders with SSR and audits in Chromium without Tailwind, so rules needing
// computed style — colour-contrast above all — would be judging default black-on-transparent rather
// than what a student sees. Those are DISABLED here rather than left to report a meaningless pass.
// Contrast on this tool is covered where it can actually be measured: watercycle_stage_label_ground
// (canvas ink, measured off real screenshots) and the theme contrast sweep. This file covers
// structure and semantics, which is the half static markup can answer for.
//
// ★ NOT COVERED, and worth knowing rather than assuming: the quiz and myth panels. Passing wcQuiz
// or wcMyth through renderTool produces output byte-identical to the plain explorer — those panels
// open through interaction this harness does not perform — so listing them here would have audited
// the default view three more times under three confident names. Every surface below therefore
// asserts a marker of its own before axe sees it.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
let axe;
let host;
let browser;
let page;

beforeAll(async () => {
  axe = require(resolve(process.cwd(), 'desktop/web-app/node_modules', 'axe-core'));
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
}, 60000);
afterAll(async () => { if (browser) await browser.close(); }, 60000);

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_watercycle.js', 'waterCycle');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  host?.remove();
  host = null;
});

// Needs the real stylesheet, or is a page-level rule that cannot apply to a fragment rendered alone.
const DISABLED = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
  'page-has-heading-one': { enabled: false },
  'landmark-one-main': { enabled: false },
  'html-has-lang': { enabled: false },
  'heading-order': { enabled: false },
};

// Every surface must PROVE it rendered the thing it is named after. Without this a state key the
// tool ignores audits the default view again under a different name and the suite reports more
// coverage than it has — which is exactly what a probe found when the quiz and myth states were
// tried: they render byte-identical to the plain explorer, so those panels are not reachable
// through renderTool at all and are deliberately absent below.
async function auditState(state, must, mustNot) {
  host.innerHTML = renderTool('waterCycle', { waterCycle: state });
  expect(host.innerHTML, 'surface did not render its own marker: ' + must).toContain(must);
  if (mustNot) expect(host.innerHTML, 'surface rendered a different view: ' + mustNot).not.toContain(mustNot);
  return (await auditMarkup(host.innerHTML)).violations;
}

// Keep the same SSR surface assertions and rule set, but run axe in Chromium.
// jsdom's style traversal timed out on the expanded water UI, leaving axe running
// and causing every subsequent surface to fail without being audited at all.
async function auditMarkup(markup) {
  const styles = [...document.head.querySelectorAll('style')].map(node => node.outerHTML).join('');
  await page.setContent('<!doctype html><html lang="en"><head><title>Water accessibility audit</title>' + styles + '</head><body><main id="audit">' + markup + '</main></body></html>');
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async (rules) => {
    const results = await window.axe.run(document.getElementById('audit'), { rules });
    return {
      passes: results.passes.length,
      violations: results.violations.map(v => ({
        id: v.id, impact: v.impact, help: v.help,
        nodes: v.nodes.slice(0, 3).map(n => n.html.slice(0, 160)),
      })),
    };
  }, DISABLED);
}

function report(violations) {
  if (!violations.length) return '';
  return '\n' + violations.map((v) =>
    `  [${v.impact}] ${v.id}: ${v.help}\n` + v.nodes.map((n) => `      ${n}`).join('\n')
  ).join('\n');
}

// One per surface a student can actually reach. States are the same shapes the screenshot harness
// drives (dev-tools/wc_scene_shots.cjs), so the two stay describing the same tool.
// [name, state, must-contain, must-NOT-contain]. Markers were read off the rendered output rather
// than guessed, so a state the tool stops honouring turns this suite red instead of quiet.
const EXPLORER = 'Build the water cycle';
const JOURNEY = 'Immersive droplet journey';
const STORM = 'Interactive storm chamber';
const LAUNCH = 'Become one parcel';
const FLIGHT = 'Flight deck';
const SURFACES = [
  ['explorer — default', {}, EXPLORER],
  ['explorer — night', { climSolar: 0.2, climateAdjusted: true }, EXPLORER],
  ['explorer — forest catchment', { landCover: 'forest', landAdjusted: true, infiltrationIndex: 78 }, EXPLORER],
  ['explorer — urban catchment', { landCover: 'urban', landAdjusted: true, infiltrationIndex: 18 }, EXPLORER],
  ['droplet journey — 3D, evaporating', { journeyView: '3d', journeyActive: true, journeyState: 'evaporating' }, JOURNEY],
  ['droplet journey — 3D, aquifer', { journeyView: '3d', journeyActive: true, journeyState: 'aquifer_flow', activeStage: 'infiltration' }, JOURNEY],
  ['droplet journey — hydro quest visible', { journeyView: '3d', journeyActive: true, journeyState: 'evaporating', journeyLoops: 1, stagesViewed: { evaporation: true, condensation: true } }, JOURNEY],
  ['storm lab — 2D', { wcMode: 'precipHunt' }, STORM, EXPLORER],
  ['storm lab — mountain snow preset', { wcMode: 'precipHunt', precipHunt: { preset: 'mountainSnow' } }, STORM, EXPLORER],
  ['storm lab — 3D chamber', { wcMode: 'precipHunt', precipHunt: { viewMode: '3d', preset: 'summerStorm' } }, STORM, EXPLORER],
  // Steward has no string of its own that the explorer lacks, so it is pinned by absence: this is
  // the watershed campaign precisely because the explorer's headline is not in it.
  ['steward — setup', { wcMode: 'steward' }, 'Steward', EXPLORER],
  ['be the water — launch card', { wcMode: 'pilot' }, LAUNCH, EXPLORER],
  ['be the water — in flight', { wcMode: 'pilot', pilot: { onboardingComplete: true } }, FLIGHT, LAUNCH],
  ['be the water — water view', { wcMode: 'pilot', pilot: { onboardingComplete: true, cameraMode: 'water' } }, FLIGHT, LAUNCH],
];

describe('waterCycle — axe audit of every reachable surface', () => {
  for (const [name, state, must, mustNot] of SURFACES) {
    it(name + ' has no axe violations', async () => {
      const violations = await auditState(state, must, mustNot);
      expect(violations, name + report(violations)).toEqual([]);
    }, 30000);
  }

  it('audits a surface at all — the check must not be silently empty', async () => {
    // A suite that renders nothing passes every rule. Prove the markup reached axe: the explorer
    // has controls, and axe must have had a populated tree to judge.
    host.innerHTML = renderTool('waterCycle', { waterCycle: {} });
    expect(host.querySelectorAll('button').length).toBeGreaterThan(5);
    const results = await auditMarkup(host.innerHTML);
    expect(results.passes, 'axe returned no passing rules, so it judged nothing').toBeGreaterThan(3);
  }, 30000);
});
