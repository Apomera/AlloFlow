import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadSelTool, renderSelTool } from './helpers/sel_tool_harness.js';
import { extractReactSsrStyles } from './helpers/stem_widgets_smoke_harness.js';
import { auditFocusVisibility } from './helpers/stem_focus_visibility_browser_checks.js';
import { auditTargetSize, auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const selDirectory = path.join(root, 'sel_hub');
const browserModules = path.join(root, 'desktop/web-app/node_modules');
const reactBrowserPath = path.join(browserModules, 'react/umd/react.development.js');
const reactDomBrowserPath = path.join(browserModules, 'react-dom/umd/react-dom.development.js');
const selSupportPaths = ['sel_safety_layer.js', 'sel_standards_alignment.js']
  .map((file) => path.join(selDirectory, file));
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const englishUiStrings = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
window.AlloModules = window.AlloModules || {};
if (!window.AlloModules.AppStyles) Function('window', appStylesSource)(window);
const appStylesMarkup = ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
);
const runtimeAppCssSheets = extractReactSsrStyles(appStylesMarkup).cssSheets;

const selShellCss = `
  html, body { margin: 0; min-width: 0; background: #020617; }
  #tool-root {
    width: 100%;
    min-width: 0;
    min-height: 100vh;
    box-sizing: border-box;
    background: #0f172a;
    color: #f8fafc;
  }
`;

const darkTheme = {
  id: 'dark',
  isDark: true,
  isContrast: false,
  reduceMotion: true,
  bg: '#0f172a',
  bgCard: '#1e293b',
  bgInput: '#0f172a',
  text: '#f8fafc',
  textMuted: '#cbd5e1',
  border: '#64748b',
  headerBg: '#0f172a',
  headerText: '#f8fafc',
  btnBg: '#334155',
  btnText: '#f8fafc',
  accent: '#a78bfa',
  accentText: '#0f172a',
};
darkTheme.palette = { ...darkTheme };

function translateEnglish(key, fallback) {
  const value = String(key || '').split('.').reduce(
    (branch, part) => branch && typeof branch === 'object' ? branch[part] : undefined,
    englishUiStrings,
  );
  return typeof value === 'string' ? value : (fallback != null ? fallback : key);
}

const ALL_CASES = fs.readdirSync(selDirectory)
  .filter((file) => /^sel_tool_.*\.js$/.test(file))
  .sort()
  .map((file) => {
    const source = fs.readFileSync(path.join(selDirectory, file), 'utf8');
    const registration = source.match(/window\.SelHub\.registerTool\(\s*(['"])([^'"]+)\1/);
    if (!registration) throw new Error(`${file} has no string-literal window.SelHub.registerTool registration.`);
    return { file, id: registration[2] };
  });

const caseFilter = (process.env.ALLO_SEL_WCAG_CASE || '').toLowerCase();
const profileFilter = (process.env.ALLO_SEL_WCAG_PROFILE || '').toLowerCase();
const CASES = caseFilter
  ? ALL_CASES.filter(({ file, id }) => `${file} ${id}`.toLowerCase().includes(caseFilter))
  : ALL_CASES;

const MEDIA_PROFILES = [
  {
    name: 'standard colors',
    media: { reducedMotion: 'reduce' },
    viewport: { width: 320, height: 760 },
    auditAxe: true,
    auditTargetSize: true,
    auditTextSpacingReflow: true,
  },
  {
    name: 'Windows forced colors',
    media: { reducedMotion: 'reduce', forcedColors: 'active' },
    viewport: { width: 320, height: 760 },
    forcedColors: true,
  },
  {
    name: 'standard colors at 760x320 short landscape',
    media: { reducedMotion: 'reduce' },
    viewport: { width: 760, height: 320 },
  },
].filter(({ name }) => !profileFilter || name.toLowerCase().includes(profileFilter));

function renderCase(testCase, viewport) {
  const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewport.width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewport.height });
  try {
    loadSelTool(testCase.file);
    return renderSelTool(testCase.id, {
      gradeBand: 'middle',
      gradeLevel: '8th Grade',
      theme: darkTheme,
      t: translateEnglish,
    });
  } finally {
    if (widthDescriptor) Object.defineProperty(window, 'innerWidth', widthDescriptor);
    else delete window.innerWidth;
    if (heightDescriptor) Object.defineProperty(window, 'innerHeight', heightDescriptor);
    else delete window.innerHeight;
  }
}

async function mountRenderedTool(page, testCase, mediaProfile, includeAxe = false) {
  await page.emulateMedia(mediaProfile.media);
  if (mediaProfile.forcedColors) {
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
  }
  await page.setContent(
    '<!doctype html><html lang="en" class="theme-dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
      '<body class="theme-dark"><main id="tool-root"></main></body></html>',
    { waitUntil: 'domcontentloaded' },
  );
  await page.addStyleTag({ content: appCss });
  for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: selShellCss });
  await page.addScriptTag({ path: reactBrowserPath });
  await page.addScriptTag({ path: reactDomBrowserPath });
  await page.evaluate(() => {
    const noop = () => {};
    function iconStub(props) {
      const next = { ...(props || {}), 'aria-hidden': 'true' };
      return window.React.createElement('span', next);
    }
    window.AlloIcons = new Proxy({}, { get: () => iconStub });
    window.AlloModules = window.AlloModules || {};
    window.SelHub = {
      _registry: {},
      _order: [],
      registerTool(id, config) {
        config.id = id;
        config.ready = config.ready !== false;
        this._registry[id] = config;
        if (!this._order.includes(id)) this._order.push(id);
      },
      isRegistered(id) { return !!this._registry[id]; },
      getRegisteredTools() { return this._order.map((id) => this._registry[id]).filter(Boolean); },
      renderTool(id, ctx) {
        const tool = this._registry[id];
        return tool && typeof tool.render === 'function' ? tool.render(ctx) : null;
      },
    };
    window.AlloToggleTheme = noop;
    window.callGemini = null;
    window.callTTS = null;
    window.callImagen = null;
    window.callGeminiVision = null;
    window.Audio = function Audio() { return { play: () => Promise.resolve() }; };
  });
  for (const supportPath of selSupportPaths) await page.addScriptTag({ path: supportPath });
  await page.addScriptTag({ path: path.join(selDirectory, testCase.file) });
  await page.evaluate(({ id, theme, strings }) => {
    const h = window.React.createElement;
    const noop = () => {};
    function translate(key, fallback) {
      const value = String(key || '').split('.').reduce(
        (branch, part) => branch && typeof branch === 'object' ? branch[part] : undefined,
        strings,
      );
      return typeof value === 'string' ? value : (fallback != null ? fallback : key);
    }
    function App() {
      const [toolData, setToolData] = window.React.useState({});
      const base = {
        React: window.React,
        toolData,
        setToolData,
        update(toolId, key, value) {
          setToolData((previous) => {
            const nextTool = { ...((previous && previous[toolId]) || {}), [key]: value };
            return { ...(previous || {}), [toolId]: nextTool };
          });
        },
        updateMulti(toolId, values) {
          setToolData((previous) => {
            const nextTool = { ...((previous && previous[toolId]) || {}), ...(values || {}) };
            return { ...(previous || {}), [toolId]: nextTool };
          });
        },
        setSelHubTool: noop,
        setSelHubTab: noop,
        selHubTab: '',
        selHubTool: id,
        addToast: noop,
        awardXP: noop,
        getXP: () => 0,
        announceToSR: noop,
        celebrate: noop,
        beep: noop,
        t: translate,
        theme,
        isDark: !!theme.isDark,
        isContrast: !!theme.isContrast,
        themePalette: theme.palette,
        callGemini: null,
        callTTS: null,
        callImagen: null,
        callGeminiVision: null,
        onSafetyFlag: noop,
        studentCodename: null,
        selectedVoice: null,
        activeSessionCode: null,
        icons: window.AlloIcons,
        gradeLevel: '8th Grade',
        gradeBand: 'middle',
        toolSnapshots: [],
        setToolSnapshots: noop,
        saveSnapshot: noop,
        saveCheckpoint: noop,
        getSavePolicy: () => ({
          checkpointLabel: 'Private checkpoint',
          sharePacketLabel: 'Share Packet eligible',
        }),
        srOnly: (text) => h('span', { className: 'sr-only' }, text),
        a11yClick: (handler) => ({
          onClick: handler,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handler(event);
            }
          },
          role: 'button',
          tabIndex: 0,
        }),
        props: { onExportRequested: noop },
      };
      const ctx = new Proxy(base, { get: (object, property) => property in object ? object[property] : noop });
      return window.SelHub.renderTool(id, ctx);
    }
    window.__selWcagRoot = window.ReactDOM.createRoot(document.getElementById('tool-root'));
    window.__selWcagRoot.render(h(App));
  }, { id: testCase.id, theme: darkTheme, strings: englishUiStrings });
  await page.waitForFunction(() => document.querySelector('#tool-root')?.children.length > 0);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (includeAxe) await page.addScriptTag({ content: axeSource });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.cancel();
  });
}

describe('All registered SEL tools in a real browser', () => {
  let browser;

  beforeAll(async () => {
    expect(ALL_CASES.length, 'SEL browser coverage discovered too few tool files').toBeGreaterThan(60);
    expect(new Set(ALL_CASES.map(({ id }) => id)).size, 'SEL tool ids must be unique').toBe(ALL_CASES.length);
    expect(CASES.length, `No SEL case matched ALLO_SEL_WCAG_CASE=${caseFilter}`).toBeGreaterThan(0);
    expect(MEDIA_PROFILES.length, `No SEL profile matched ALLO_SEL_WCAG_PROFILE=${profileFilter}`).toBeGreaterThan(0);
    browser = await chromium.launch({ headless: true });
  }, 30000);

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const mediaProfile of MEDIA_PROFILES) {
    for (const testCase of CASES) {
      it(`${testCase.id} exposes an operable WCAG surface in ${mediaProfile.name}`, async () => {
        const html = renderCase(testCase, mediaProfile.viewport);
        expect(html.trim().length, `${testCase.file} rendered no audit surface`).toBeGreaterThan(0);

        const page = await browser.newPage({ viewport: mediaProfile.viewport });
        try {
          await mountRenderedTool(page, testCase, mediaProfile, mediaProfile.auditAxe);

          const axeAudit = mediaProfile.auditAxe ? await page.evaluate(async () => axe.run('#tool-root', {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
            resultTypes: ['violations'],
          })) : null;

          const focus = await auditFocusVisibility(page);
          const focusDiagnostics = JSON.stringify({
            case: testCase,
            profile: mediaProfile.name,
            viewport: mediaProfile.viewport,
            candidates: focus.candidates,
            traversed: focus.traversed,
            unreached: focus.unreached,
            unreachedDetails: focus.unreachedDetails,
            warnings: focus.warnings,
            failures: focus.failures,
          }, null, 2);
          expect.soft(focus.traversed, focusDiagnostics).toBeGreaterThan(0);
          expect.soft(focus.failures, focusDiagnostics).toEqual([]);
          expect.soft(focus.warnings, focusDiagnostics).toEqual([]);
          expect.soft(focus.unreached, focusDiagnostics).toEqual([]);

          if (mediaProfile.auditTargetSize) {
            const targetSize = await auditTargetSize(page);
            const targetDiagnostics = JSON.stringify({
              case: testCase,
              profile: mediaProfile.name,
              viewport: mediaProfile.viewport,
              ...targetSize,
            }, null, 2);
            expect.soft(targetSize.checked, targetDiagnostics).toBeGreaterThan(0);
            expect.soft(targetSize.failures, targetDiagnostics).toEqual([]);
          }

          if (axeAudit) {
            const violations = axeAudit.violations.map((violation) => ({
              id: violation.id,
              impact: violation.impact,
              help: violation.help,
              helpUrl: violation.helpUrl,
              targets: violation.nodes.slice(0, 12).map((node) => ({
                target: node.target,
                html: node.html,
                failureSummary: node.failureSummary,
              })),
            }));
            const axeDiagnostics = JSON.stringify({ case: testCase, profile: mediaProfile.name, violations }, null, 2);
            expect.soft(violations, axeDiagnostics).toEqual([]);
          }

          if (mediaProfile.auditTextSpacingReflow) {
            const spacingPage = await browser.newPage({ viewport: mediaProfile.viewport });
            try {
              await mountRenderedTool(spacingPage, testCase, mediaProfile);
              const spacing = await auditTextSpacingReflow(spacingPage);
              const spacingDiagnostics = JSON.stringify({
                case: testCase,
                profile: mediaProfile.name,
                viewport: mediaProfile.viewport,
                scrollWidth: spacing.scrollWidth,
                clientWidth: spacing.clientWidth,
                offenders: spacing.offenders,
                forcedColors: spacing.forcedColors,
              }, null, 2);
              expect.soft(spacing.scrollWidth, spacingDiagnostics).toBeLessThanOrEqual(spacing.clientWidth);
            } finally {
              await spacingPage.close();
            }
          }
        } finally {
          await page.close();
        }
      }, 45000);
    }
  }
});
