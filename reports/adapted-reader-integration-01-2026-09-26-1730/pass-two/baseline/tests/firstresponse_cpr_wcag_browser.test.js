// First Response CPR + AED — real-browser WCAG audit.
//
// Why this file exists: `stem_focus_visibility_wcag_browser.test.js` already
// owns this machinery and lists First Response among its cases — but with
// `state: { firstResponse: {} }`. The tool has a CONSENT GATE, so that fixture
// renders the consent screen and never reaches a module. Every surface in the
// CPR lab was therefore unaudited while the case sat green.
//
// It found two real defects on first run, both since fixed and pinned here:
//   · the module paints a DARK palette (T.text #f1f5f9) but the host shell
//     serves stem tools a LIGHT substrate — `var(--allo-stem-canvas,#0f172a)`
//     resolves to #ffffff in the default theme, and .theme-dark adds a white
//     `data-stem-tool-surface` card on top. Cards were fine (each carries its
//     own dark background); the backBar title was not: 1.09:1, white on white.
//   · the redcross/heart/stopthebleed links sat inside paragraphs distinguished
//     by colour alone at 1.42:1 against the surrounding text (WCAG 1.4.1).
//
// This does not replace the shared suite's media profiles (forced colors,
// reduced motion, reflow); it covers the module surfaces that suite cannot see.
//
// THE SHELL IS PART OF THE FIXTURE. A theme class alone is not what a tool is
// rendered into: the host wraps every stem tool in a backdrop div, and in
// .theme-dark it ALSO inserts a white `data-stem-tool-surface` card between
// that backdrop and the tool (stem_lab_module.js ~1871-1902, gated on
// `isDarkBackdrop === (shellTheme === 'dark')`). Auditing without it made the
// dark theme structurally unable to show a dark-on-white failure — deleting the
// substrate wrapper turned only theme-default red while dark and contrast
// stayed green, which looked like coverage and was not. `hostShell()` below
// reproduces that structure, and `pins the host shell it models` fails if the
// host's own values drift away from it.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import {
  React, ReactDOMServer, loadTool, resetStemLab, makeCtx, newStore, prepareStemBrowserRender,
} from './helpers/stem_widgets_smoke_harness.js';
import { auditTargetSize, auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
// Same override the unit suite uses, so this file can be pointed at an older
// build to prove an assertion is not vacuous.
const TOOL_PATH = process.env.FR_TOOL_FILE || 'stem_lab/stem_tool_firstresponse.js';
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) Function('window', appStylesSource)(window);
const runtimeAppCssSheets = prepareStemBrowserRender(
  ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null)),
).cssSheets;

// Lift the theme variables out of the shared suite rather than restating them,
// so a change there cannot leave this file auditing a palette nobody ships.
const suiteSrc = fs.readFileSync(path.join(root, 'tests/stem_focus_visibility_wcag_browser.test.js'), 'utf8');
const themeStart = suiteSrc.indexOf('const stemThemeCss = `');
if (themeStart < 0) throw new Error('stemThemeCss block not found in the shared WCAG suite.');
const stemThemeCss = suiteSrc.slice(suiteSrc.indexOf('`', themeStart) + 1, suiteSrc.indexOf('`;', themeStart));

// Mirror of stem_lab_module.js's tool shell. Values are asserted against the
// host source by a test below, so this cannot quietly go stale.
const HOST_SHELL = {
  backdropBg: 'var(--allo-stem-canvas, #0f172a)',
  backdropFg: 'var(--allo-stem-text, #e2e8f0)',
  surfaceBg: '#ffffff',
  surfaceFg: '#0f172a',
};

function hostShell(themeClass, innerHtml) {
  const dark = themeClass === 'theme-dark';
  const srOnlyH1 =
    '<h1 style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
    'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">First Response Lab</h1>';
  const body = dark
    ? '<div data-stem-tool-surface="firstResponse" style="background:' + HOST_SHELL.surfaceBg +
      ';color:' + HOST_SHELL.surfaceFg + ';color-scheme:light;border-radius:10px;padding:10px">' +
      innerHtml + '</div>'
    : innerHtml;
  return '<div data-stem-tool-shell="firstResponse" data-stem-theme="' + themeClass + '" ' +
    'style="background:' + HOST_SHELL.backdropBg + ';color:' + HOST_SHELL.backdropFg +
    ';border-radius:12px;padding:' + (dark ? '10px' : '0') + '">' + srOnlyH1 + body + '</div>';
}

// The real host passes ctx.update(toolId, key, val); the shared smoke harness
// stubs it as (key, val), which silently corrupts state. See
// tests/firstresponse_cpr_practice.test.js for the same local ctx.
function applyPatch(store, toolId, patch) {
  const prev = store.toolData[toolId] || {};
  if (!Object.keys(patch).some((k) => prev[k] !== patch[k])) return;
  store.toolData = Object.assign({}, store.toolData, { [toolId]: Object.assign({}, prev, patch) });
  store.dirty = true;
}

function renderFr(extra) {
  const store = newStore({ firstResponse: Object.assign({ consentAccepted: true }, extra) });
  const cfg = window.StemLab._registry.firstResponse;
  let html = '';
  for (let pass = 0; pass < 8; pass++) {
    store.dirty = false;
    const ctx = makeCtx({
      toolData: store.toolData,
      update: (t, k, v) => applyPatch(store, t, { [k]: v }),
      updateMulti: (t, o) => applyPatch(store, t, o || {}),
    }, store);
    html = ReactDOMServer.renderToStaticMarkup(React.createElement(() => cfg.render(ctx)));
    if (!store.dirty) break;
  }
  return prepareStemBrowserRender(html);
}

// Every view the dispatch switch can reach, not just the CPR tabs. The
// substrate fix below applies to all of them, so all of them get audited.
const VIEWS = [
  ['menu', { view: 'menu' }],
  ['cpr overview', { view: 'cprAed', cprView: 'overview' }],
  ['cpr metronome', { view: 'cprAed', cprView: 'metronome' }],
  ['cpr practice', { view: 'cprAed', cprView: 'practice' }],
  ['cpr aed walkthrough', { view: 'cprAed', cprView: 'aed', aedStep: 0 }],
  ['cpr aed branch', { view: 'cprAed', cprView: 'aed', aedStep: 4, aedShockBranch: 'noshock' }],
  ['recognize', { view: 'recognize' }],
  ['call', { view: 'call' }],
  ['bleed', { view: 'bleed' }],
  ['choking', { view: 'choking' }],
  ['disability aware', { view: 'disabilityAware' }],
  ['scenarios', { view: 'scenarios' }],
  ['first action sleuth', { view: 'firstAction' }],
  ['ai practice', { view: 'aiPractice' }],
  ['resources', { view: 'resources' }],
  ['mastery', { view: 'mastery' }],
  ['decision hunt', { view: 'decisionHunt' }],
  ['body3d gate', { view: 'body3d', b3dTab: 'gate' }],
  ['consent gate', { view: 'menu', consentAccepted: false }],
];

// ── Live mount ──────────────────────────────────────────────────────────────
// Mounts the tool for real — hooks live, state held in React the way the host
// holds it — with an in-page clock so a 30-second window costs milliseconds.
// SSR plus a hand-built ctx proves the maths and the markup; only this proves
// that pressing the button changes anything.
async function mountLive(page, initialState) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.setContent(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<style>*,::after,::before{box-sizing:border-box;border:0 solid #e5e7eb}</style></head>' +
    '<body><main id="tool-root" class="theme-default"><div id="mount"></div></main></body></html>',
    { waitUntil: 'domcontentloaded' },
  );
  await page.evaluate(() => {
    window.__t = 1700000000000;
    Date.now = () => window.__t;
  });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.evaluate(() => {
    window.__alloT = (k, fb) => (typeof fb === 'string' ? fb : k);
    window.AlloIcons = new Proxy({}, { get: () => function () { return window.React.createElement('span'); }, has: () => true });
  });
  await page.addScriptTag({ path: path.join(root, TOOL_PATH) });
  await page.evaluate((seed) => {
    const React = window.React;
    const cfg = window.StemLab._registry.firstResponse;
    const noop = () => {};
    function App() {
      const [data, setData] = React.useState({ firstResponse: seed });
      // Exactly the host's signatures: stem_lab_module.js:7600/7608.
      const ctx = {
        React,
        toolData: data,
        update: (id, k, v) => setData((d) => ({ ...d, [id]: { ...d[id], [k]: v } })),
        updateMulti: (id, o) => setData((d) => ({ ...d, [id]: { ...d[id], ...o } })),
        setToolData: noop, labToolData: {}, setLabToolData: noop,
        setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop,
        addToast: noop, announceToSR: noop, awardXP: noop, beep: noop, celebrate: noop,
        canvasNarrate: noop, canvasA11yDesc: noop, callGemini: null, callTTS: null,
        gradeLevel: '8th', stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {},
        srOnly: {}, a11yClick: (fn) => ({ onClick: fn }), icons: window.AlloIcons,
        t: (k, fb) => fb || k, tryAward: noop, getXP: () => 0,
      };
      return React.createElement(() => cfg.render(ctx));
    }
    window.ReactDOM.render(React.createElement(App), document.getElementById('mount'));
  }, initialState);
  return errors;
}

const clickText = (page, text) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t);
  if (!b) return false;
  b.click();
  return true;
}, text);

const liveText = (page) => page.evaluate(
  () => document.getElementById('mount').textContent.replace(/\s+/g, ' '),
);

const advance = (page, ms) => page.evaluate((n) => { window.__t += n; }, ms);

let browser;
beforeAll(async () => {
  browser = await chromium.launch();
  resetStemLab();
  loadTool(TOOL_PATH, 'firstResponse');
}, 120000);
afterAll(async () => { if (browser) await browser.close(); });

const THEMES = ['theme-default', 'theme-dark', 'theme-contrast'];

describe('First Response CPR + AED — WCAG in a real browser', () => {
  for (const theme of THEMES) {
  for (const [name, state] of VIEWS) {
    it('has no axe violations or undersized targets: ' + name + ' [' + theme + ']', async () => {
      const rendered = renderFr(state);
      expect(rendered.html.trim().length, name + ' rendered nothing').toBeGreaterThan(0);

      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await page.setContent(
          '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body><main id="tool-root" class="' + theme + '">' + hostShell(theme, rendered.html) + '</main></body></html>',
          { waitUntil: 'domcontentloaded' },
        );
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: axeSource });
        await page.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); });
        // A closed <details> hides its children, and axe skips hidden content —
        // so folding a block away would silently remove it from this audit.
        // Open every disclosure first: the content is reachable by one click,
        // so it has to meet the same bar as the rest of the page.
        await page.evaluate(() => {
          for (const d of document.querySelectorAll('details')) d.open = true;
        });

        const audit = await page.evaluate(async () => window.axe.run('#tool-root', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
          resultTypes: ['violations'],
        }));
        // Keep the failure summary: for contrast it carries the measured ratio
        // and the exact foreground/background pair, which is the difference
        // between fixing the right colour and guessing at one.
        const summary = audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            html: String(n.html || '').slice(0, 120),
            why: String(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 180),
          })),
        }));
        expect(summary, name + ' axe violations').toEqual([]);

        const targets = await auditTargetSize(page);
        expect(targets.checked, name + ' audited no targets').toBeGreaterThan(0);
        expect(targets.failures || [], name + ' undersized targets').toEqual([]);
      } finally {
        await page.close();
      }
    }, 120000);
  }
  }

  // WCAG 1.4.10 reflow at the normative 320 CSS px, with the 1.4.12 text-spacing
  // overrides applied on top, then re-checked under forced colors. The auditor
  // throws on target-size findings at each stage, so this covers all three.
  // Intentional inner scrollers stay allowed; only document-level overflow fails.
  for (const [name, state] of VIEWS) {
    it('reflows at 320px with author text spacing overridden: ' + name, async () => {
      const rendered = renderFr(state);
      const page = await browser.newPage({ viewport: { width: 320, height: 512 } });
      try {
        await page.setContent(
          '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
          '<body style="margin:0"><main id="tool-root" class="theme-default">' + hostShell('theme-default', rendered.html) + '</main></body></html>',
          { waitUntil: 'domcontentloaded' },
        );
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); });

        const audit = await auditTextSpacingReflow(page);
        expect(audit.offenders, name + ' overflows 320px: ' + JSON.stringify(audit.offenders, null, 2)).toEqual([]);
        expect(audit.scrollWidth, name + ' document scrolls sideways')
          .toBeLessThanOrEqual(audit.clientWidth);
      } finally {
        await page.close();
      }
    }, 120000);
  }

  // Everything else about the practice window is verified through an SSR render
  // and a ctx this repo's tests construct themselves. That proves the maths and
  // the markup; it does not prove a learner pressing the button changes
  // anything. This mounts the tool for real, with hooks live and state held the
  // way the host holds it, and drives it by clicking.
  it('scores a real run driven by real clicks', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      const errors = await mountLive(page, { consentAccepted: true, view: 'cprAed', cprView: 'practice' });
      expect(await clickText(page, '▶ Start 30s'), 'Start button not found').toBe(true);
      await page.waitForTimeout(50);

      // 55 compressions at a steady 545 ms — a textbook run.
      for (let i = 0; i < 55; i++) {
        await advance(page, 545);
        expect(await clickText(page, 'TAP'), 'TAP vanished at compression ' + i).toBe(true);
      }
      await advance(page, 1200);
      await clickText(page, 'TAP');
      await page.waitForTimeout(100);

      const text = await liveText(page);
      const bpm = text.match(/Rate: (\d+) bpm/);
      expect(errors, 'page errors during the run').toEqual([]);
      expect(text.includes('All four: rate, steadiness, pauses, and compression time'),
        'no passing debrief after a clean run: ' + text.slice(0, 400)).toBe(true);
      expect(bpm, 'no rate reported in the debrief: ' + text.slice(0, 300)).toBeTruthy();
      expect(Number(bpm[1]), 'reported rate').toBeGreaterThanOrEqual(100);
      expect(Number(bpm[1]), 'reported rate').toBeLessThanOrEqual(120);
    } finally {
      await page.close();
    }
  }, 180000);

  // The happy path proves the wiring. What the tool actually TEACHES lives in
  // the failure branches, so drive one of those by hand too.
  it('tells a learner who stopped pushing that they stopped pushing', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      const errors = await mountLive(page, { consentAccepted: true, view: 'cprAed', cprView: 'practice' });
      expect(await clickText(page, '▶ Start 30s')).toBe(true);
      await page.waitForTimeout(50);

      // Eight seconds of textbook rhythm...
      for (let i = 0; i < 15; i++) {
        await advance(page, 545);
        expect(await clickText(page, 'TAP'), 'TAP vanished at compression ' + i).toBe(true);
      }

      // ...then the learner looks around for twelve seconds. The banner has to
      // appear while they are still in the run, not only in the debrief — and
      // it can only appear on a render that is NOT caused by a tap, since a tap
      // closes the gap it is reporting. In the real tool that render comes from
      // the metronome interval, which runs on the wall clock, so wait for a
      // genuine tick rather than forcing one.
      await advance(page, 12_000);
      await page.waitForTimeout(800);
      const midRun = await liveText(page);
      expect(midRun, 'no hands-off warning during a 12s pause').toContain('Hands off the chest');

      for (let i = 0; i < 10; i++) {
        await advance(page, 545);
        await clickText(page, 'TAP');
      }
      await advance(page, 20_000);
      await clickText(page, 'TAP');
      await page.waitForTimeout(100);

      const text = await liveText(page);
      expect(errors, 'page errors during the run').toEqual([]);
      expect(text, 'a run with a 12s hole should not read as a pass')
        .not.toContain('All four: rate, steadiness, pauses, and compression time');
      expect(text).toContain('What to fix next run');
      expect(text, 'the pause is what failed, so the pause is what it must name')
        .toContain('over 10 seconds');
    } finally {
      await page.close();
    }
  }, 180000);

  it('will not let a learner past the AED decision without making it', async () => {
    // Pinned by source and SSR in the unit suite; this proves the click is
    // actually refused rather than merely marked aria-disabled.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      const errors = await mountLive(page, {
        consentAccepted: true, view: 'cprAed', cprView: 'aed', aedStep: 4,
      });
      expect(await liveText(page)).toContain('Step 5 of 6');

      await clickText(page, 'Next →');
      await page.waitForTimeout(60);
      expect(await liveText(page), 'Next advanced without a branch').toContain('Step 5 of 6');

      expect(await clickText(page, '🚫 "No shock advised"')).toBe(true);
      await page.waitForTimeout(60);
      const branched = await liveText(page);
      expect(branched).toContain('does not mean they are fine');

      await clickText(page, 'Next →');
      await page.waitForTimeout(60);
      expect(await liveText(page), 'Next still blocked after choosing').toContain('Step 6 of 6');
      expect(errors).toEqual([]);
    } finally {
      await page.close();
    }
  }, 180000);

  it('pins the host shell it models', () => {
    // If the host changes how it wraps tools, this fixture is auditing a page
    // nobody ships — and the failure mode is a false green, so it must be loud.
    const host = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
    expect(host).toContain("var isDarkBackdrop = shellTheme === 'dark';");
    expect(host).toContain("background: 'var(--allo-stem-canvas, #0f172a)'");
    expect(host).toContain("color: 'var(--allo-stem-text, #e2e8f0)'");
    expect(host).toContain("'data-stem-tool-surface': id");
    expect(host).toContain("background: '#ffffff'");
    expect(host).toContain("colorScheme: 'light'");
  });

  it('gives the dark palette a dark substrate to sit on', async () => {
    // The host serves a light canvas; without this wrapper the module's own
    // title measured 1.09:1 against it.
    const src = fs.readFileSync(path.join(root, TOOL_PATH), 'utf8');
    expect(src).toContain("'data-fr-substrate': 'true'");
    expect(src).toContain('style: { background: T.bg, color: T.text, borderRadius: 12 }');
  });
});
