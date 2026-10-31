#!/usr/bin/env node
// Walks the main app tour in Chromium and reports, step by step, whether the
// spotlight landed on a visible, expanded target.
//
// It runs the REAL tour engine (the tour blocks of AlloFlowANTI.txt, unedited)
// and the REAL TourOverlay (view_misc_panels_module.js) over a stand-in page.
// The stand-in reproduces only what the tour depends on: which anchors exist,
// which cards collapse (read from view_sidebar_panels_source.jsx), the History
// tab, the collapsed/expanded header and Zen/student-mode hiding. It is not the
// full app, so it cannot catch layout problems of real panels.
//
//   node dev-tools/check_tour_reveal.cjs            # check the working tree
//   ALLO_TOUR_HOST=old.txt ALLO_TOUR_OVERLAY=old_module.js node dev-tools/check_tour_reveal.cjs --report
//     --report  print findings without failing (for a before/after comparison)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8').replace(/\r\n/g, '\n');
const reportOnly = process.argv.includes('--report');
const hostFile = process.env.ALLO_TOUR_HOST || 'AlloFlowANTI.txt';
const overlayFile = process.env.ALLO_TOUR_OVERLAY || 'view_misc_panels_module.js';

function between(source, start, end, label) {
  const from = source.indexOf(start);
  if (from < 0) throw new Error(`${label}: start anchor missing: ${start.slice(0, 60)}`);
  const to = source.indexOf(end, from + start.length);
  if (to < 0) throw new Error(`${label}: end anchor missing: ${end.slice(0, 60)}`);
  return source.slice(from, to);
}

const host = read(hostFile);
const engine = [
  between(host, '  const [runTour, setRunTour] = useState(false);', '  // The pipeline guided tours', 'tour state'),
  between(host, '  const [isSpotlightMode, setIsSpotlightMode] = useState(false);', '    const tourSteps = [', 'spotlight state'),
  between(host, '    const tourSteps = [', '  useEffect(() => {\n    if (!isHelpMode) return;', 'tour steps'),
  '  const handleSetRunTourToFalse = useCallback(() => setRunTour(false), []);\n',
  between(host, '  // A delayed measurement belongs to the tour/step that requested it.', '  const toastTimersRef = useRef(new Map());', 'tour engine'),
].join('\n');
const overlayCall = between(host, 'React.createElement(window.AlloModules.TourOverlay, {', '\n      })}', 'overlay call') + '\n      })';
const guidedMap = between(read('guided_mode_config_source.jsx'), 'const GUIDED_TOUR_MAP = {', '};', 'guided map').replace('const GUIDED_TOUR_MAP = ', '') + '}';
const helperMap = between(read('text_pipeline_helpers_source.jsx'), 'const DOM_TO_TOOL_ID_MAP = {', '\n  };', 'helper map').replace('const DOM_TO_TOOL_ID_MAP = ', '') + '\n  }';

// Which anchors collapse, and under which expandedTools id, comes from the real sidebar.
const sidebar = read('view_sidebar_panels_source.jsx');
const collapseIdFor = (anchor) => {
  const at = sidebar.search(new RegExp(`id=["'{]${anchor.replace(/-/g, '\\-')}["'}]`));
  if (at < 0) return null;
  const match = sidebar.slice(at, at + 2500).match(/toggleTool\('([^']+)'\)/);
  return match ? match[1] : null;
};
const strings = JSON.parse(read('ui_strings.js'));

const pageScript = `
(() => {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;
  const STRINGS = ${JSON.stringify(strings)};
  const lookup = (key) => key.split('.').reduce((value, part) => value == null ? undefined : value[part], STRINGS);
  const t = (key, params) => { let value = lookup(key); if (typeof value !== 'string') return ''; if (params) value = value.replace(/\\{(\\w+)\\}/g, (_, name) => params[name] == null ? '' : String(params[name])); return value; };
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TextPipelineHelpers = { DOM_TO_TOOL_ID_MAP: ${helperMap} };
  const GUIDED_TOUR_MAP = ${guidedMap};
  const COLLAPSE = window.__collapse;
  const HEADER = ['tour-header-utils', 'tour-header-tools', 'tour-header-actions'];
  const h = React.createElement;
  function Host({ cfg }) {
    const [expandedTools, setExpandedTools] = useState(cfg.expandedTools);
    const [activeSidebarTab, setActiveSidebarTab] = useState('create');
    const isTeacherMode = cfg.teacher, isHelpMode = false;
    const alloBotRef = useRef({ moveTo() {} });
    const spotlightOpenTimeRef = useRef(0);
    const _alloHostHandlers = () => ({ highlightElement() {} });
    const warnLog = () => {};
${engine}
    const _reveal = typeof tourRevealHeader === 'undefined' ? false : tourRevealHeader;
    const headerCollapsed = cfg.headerCollapsed && !_reveal;
    useEffect(() => { window.__tourStepChangedAt = performance.now(); }, [tourStep, runTour]);
    window.__tour = { mountId: cfg.mountId, runTour, tourStep, tourRect, setRunTour, setTourStep, expandedTools, activeSidebarTab, steps: tourSteps, headerCollapsed,
      notice: typeof tourNavigator === 'undefined' || !tourNavigator ? '' : tourNavigator.notice };
    const card = (id, title, body) => h('section', { key: id, id, 'data-card': id, style: { border: '1px solid #ccc', margin: '4px 0', minHeight: '40px' } }, h('strong', null, title), body);
    const toolCard = (step) => {
      const collapseId = COLLAPSE[step.id];
      if (step.id === 'quiz-mode-select' || step.id === 'tour-upload-source') return null;
      if (step.id === 'tour-tool-directions') return h('section', { key: step.id, id: step.id, style: { display: isTeacherMode ? undefined : 'none', minHeight: '40px' } }, step.title);
      if (!collapseId) return card(step.id, step.title, null);
      const open = expandedTools.includes(collapseId);
      return card(step.id, step.title, open ? h('div', { 'data-open': collapseId, style: { height: '220px' } },
        step.id === 'ui-tool-quiz' ? h('select', { id: 'quiz-mode-select' }, h('option', null, 'Exit ticket')) : null,
        step.id === 'tour-input-panel' ? h('button', { id: 'tour-upload-source' }, 'Upload') : null) : null);
    };
    const sidebarSteps = tourSteps.filter(step => !HEADER.includes(step.id) && step.id !== 'tour-history-panel' && step.id !== 'tour-guided-mode');
    return h('div', null,
      cfg.zen ? null : h('header', { style: { background: '#312e81', color: 'white', padding: '8px' } },
        h('button', { 'data-help-key': 'header_rerun_wizard' }, 'Start & setup'),
        headerCollapsed ? h('span', { id: 'compact-bar' }, ' compact') : HEADER.map(id => h('div', { key: id, id, style: { padding: '12px', margin: '4px', border: '1px solid white' } }, id))),
      h('main', { style: { width: '420px' } },
        activeSidebarTab === 'history'
          ? h('section', { id: 'tour-history-panel', style: { minHeight: '200px' } }, 'History')
          : sidebarSteps.map(toolCard)),
      (runTour && tourRect) && ${overlayCall});
  }
  window.__mount = (cfg) => { window.__root && window.__root.unmount(); document.getElementById('root').innerHTML = ''; window.__root = ReactDOM.createRoot(document.getElementById('root')); ReactDOM.flushSync(() => window.__root.render(h(Host, { cfg }))); };
})();`;

const CONFIGS = [
  { name: 'header collapsed (default)', headerCollapsed: true, teacher: true, zen: false, expect: { headerShown: true } },
  { name: 'header expanded', headerCollapsed: false, teacher: true, zen: false, expect: { headerShown: true } },
  { name: 'Zen mode', headerCollapsed: true, teacher: true, zen: true, expect: { headerShown: false } },
  { name: 'student mode', headerCollapsed: true, teacher: false, zen: false, expect: { headerShown: true } },
];

// A step has settled once its delayed measurement (100ms + 600ms) has run and
// the smooth scroll it started has stopped, or the tour ended. Auto-skips
// restart the clock, so this waits through them.
async function settle(page) {
  await page.waitForFunction(() => !window.__tour.runTour || (window.__tour.tourRect
    && performance.now() - window.__tourStepChangedAt > 900 && performance.now() - (window.__lastScrollAt || 0) > 400), null, { timeout: 15000, polling: 100 });
}

let mounts = 0;
// Each run gets a fresh page state; wait until the new host has rendered before driving it.
async function mount(page, cfg) {
  const mountId = ++mounts;
  await page.evaluate((c) => window.__mount(c), { ...cfg, mountId });
  await page.waitForFunction((id) => window.__tour && window.__tour.mountId === id, mountId, { timeout: 5000 });
}

async function walk(page, cfg) {
  await mount(page, { ...cfg, expandedTools: ['glossary'] });
  await page.evaluate(() => { window.__tour.setTourStep(0); window.__tour.setRunTour(true); });
  const visits = [];
  for (let guard = 0; guard < 60; guard++) {
    await settle(page);
    const state = await page.evaluate(() => {
      const tour = window.__tour;
      if (!tour.runTour) return { done: true };
      const step = tour.steps[tour.tourStep];
      const byId = step.id ? document.getElementById(step.id) : null;
      const byKey = step.helpKey ? [...document.querySelectorAll('[data-help-key="' + step.helpKey + '"]')].find(el => el.getClientRects().length > 0) : null;
      const target = (byId && byId.getClientRects().length > 0 ? byId : null) || byKey || byId;
      const shown = !!target && target.getClientRects().length > 0;
      const box = shown ? target.getBoundingClientRect() : null;
      const collapseId = window.__collapse[step.id];
      return { index: tour.tourStep, id: step.id, title: step.title, rect: tour.tourRect, shown,
        boxTop: box ? Math.round(box.top) : null, expanded: collapseId ? tour.expandedTools.includes(collapseId) : null,
        headerCollapsed: tour.headerCollapsed, notice: tour.notice };
    });
    if (state.done) break;
    if (!visits.length || visits[visits.length - 1].index !== state.index) visits.push(state);
    const next = page.locator('[role="dialog"] button[aria-label="Next"], [role="dialog"] button[aria-label="Finish"]').first();
    if (!(await next.count())) break;
    await next.click();
  }
  await page.waitForFunction(() => !window.__tour.runTour, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ expandedTools: window.__tour.expandedTools, tab: window.__tour.activeSidebarTab, running: window.__tour.runTour }));
  return { visits, after };
}

async function sectionCheck(page) {
  await mount(page, { headerCollapsed: true, teacher: true, zen: false, expandedTools: [] });
  await page.evaluate(() => { window.__tour.setTourStep(0); window.__tour.setRunTour(true); });
  await settle(page);
  const select = page.locator('#allo-tour-jump');
  if (!(await select.count())) return { available: false };
  const groups = await page.locator('#allo-tour-jump optgroup').evaluateAll(nodes => nodes.map(n => ({ label: n.label, count: n.children.length })));
  const memoryIndex = await page.evaluate(() => window.__tour.steps.findIndex(step => step.id === 'tour-tool-memory-aid'));
  await select.selectOption(String(memoryIndex));
  await settle(page);
  await page.locator('[data-tour-section-toggle]').click();
  await page.waitForTimeout(300);
  const progress = await page.locator('[data-tour-progress]').innerText();
  await page.locator('[role="dialog"] button[aria-label="Next"]').click();
  await settle(page);
  const afterNext = await page.evaluate(() => window.__tour.steps[window.__tour.tourStep].id);
  const visited = [afterNext];
  for (let guard = 0; guard < 15; guard++) {
    const finish = page.locator('[role="dialog"] button[aria-label="Finish"]');
    if (await finish.count()) { await finish.click(); break; }
    await page.locator('[role="dialog"] button[aria-label="Next"]').click();
    await settle(page);
    visited.push(await page.evaluate(() => window.__tour.runTour ? window.__tour.steps[window.__tour.tourStep].id : 'ended'));
  }
  const ended = await page.evaluate(() => !window.__tour.runTour);
  return { available: true, groups, progress, afterNext, visited, ended };
}

(async () => {
  const collapse = {};
  const ids = [...between(host, '    const tourSteps = [', '\n  ];', 'step ids').matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]);
  for (const id of ids) { const c = collapseIdFor(id); if (c) collapse[id] = c; }
  const browser = await chromium.launch({ headless: true });
  const problems = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // The overlay's own positioning utilities. Without them the tour card sits at the
    // bottom of the page, and clicking Next scrolls there, cancelling the tour's scroll.
    const overlayCss = '.fixed{position:fixed}.absolute{position:absolute}.inset-0{inset:0}.top-4{top:1rem}.bottom-4{bottom:1rem}.left-0{left:0}.right-0{right:0}'
      + '.w-\\[500px\\]{width:500px}.overflow-y-auto{overflow-y:auto}.bg-white{background:#fff}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}';
    await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${overlayCss}</style></head><body><div id="root"></div></body></html>`);
    for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules', file) });
    await page.evaluate((c) => { window.__collapse = c; addEventListener('scroll', () => { window.__lastScrollAt = performance.now(); }, true); }, collapse);
    await page.addScriptTag({ path: path.resolve(root, overlayFile) });
    await page.addScriptTag({ content: pageScript });
    if (errors.length) throw new Error('Page failed to load: ' + errors.join(' | '));
    for (const cfg of CONFIGS) {
      const { visits, after } = await walk(page, cfg);
      const seen = new Set(visits.map(v => v.id));
      const empty = visits.filter(v => !v.shown || !v.rect || v.rect.width <= 0 || v.rect.height <= 0);
      const collapsed = visits.filter(v => v.expanded === false);
      const missing = ids.filter(id => !seen.has(id));
      const header = ['tour-header-utils', 'tour-header-tools', 'tour-header-actions'];
      const noted = visits.map(v => v.notice).filter(Boolean);
      // A skip mid-tour must be named on the step the teacher lands on. A skip
      // after the last visited step just ends the tour, so there is no card to name it on.
      const lastVisited = Math.max(-1, ...visits.map(v => v.index));
      const stepTitles = await page.evaluate(() => Object.fromEntries(window.__tour.steps.map(step => [step.id, step.title])));
      const unexplained = missing.filter(id => ids.indexOf(id) < lastVisited && !noted.some(n => n.includes(stepTitles[id])));
      console.log(`\n== ${cfg.name}: visited ${visits.length}/${ids.length} steps`);
      for (const v of empty) console.log(`  EMPTY spotlight: ${v.id} (target ${v.shown ? 'shown' : 'hidden'}, rect ${v.rect ? Math.round(v.rect.width) + 'x' + Math.round(v.rect.height) : 'none'})`);
      for (const v of collapsed) console.log(`  COLLAPSED card highlighted: ${v.id}`);
      if (missing.length) console.log(`  not shown: ${missing.join(', ')}`);
      for (const n of [...new Set(noted)]) console.log(`  note: ${n}`);
      console.log(`  after tour: tools=${JSON.stringify(after.expandedTools)} tab=${after.tab}`);
      const fail = (message) => problems.push(`${cfg.name}: ${message}`);
      if (empty.length) fail(`${empty.length} empty spotlight(s)`);
      if (collapsed.length) fail(`${collapsed.length} collapsed card(s) highlighted`);
      if (cfg.expect.headerShown && header.some(id => !seen.has(id))) fail('header steps were skipped');
      if (!cfg.expect.headerShown && header.some(id => seen.has(id))) fail('header steps shown with no header');
      if (unexplained.length) fail(`steps skipped without telling the teacher: ${unexplained.join(', ')}`);
      if (JSON.stringify(after.expandedTools) !== JSON.stringify(['glossary']) || after.tab !== 'create') fail('tour did not restore the open tools and sidebar tab');
    }
    const section = await sectionCheck(page);
    console.log('\n== sections:', JSON.stringify(section));
    if (!section.available) problems.push('sections: no Jump to list');
    else {
      if (section.groups.length !== 5 || section.groups.reduce((n, g) => n + g.count, 0) !== ids.length) problems.push('sections: jump list does not cover every step exactly once');
      if (!/Understand & access · 6 \/ 10/.test(section.progress)) problems.push('sections: progress label is ' + section.progress);
      if (section.afterNext !== 'tour-tool-visual') problems.push('sections: Next left the section (went to ' + section.afterNext + ')');
      if (!section.ended) problems.push('sections: Finish did not end the tour');
    }
    if (errors.length) problems.push('page errors: ' + [...new Set(errors)].join(' | '));
  } finally { await browser.close(); }
  console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join('\n- ') : '\nAll tour steps landed on visible, expanded targets.');
  if (problems.length && !reportOnly) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
