#!/usr/bin/env node
/*
 * check_sel_visual_qa.cjs
 *
 * Screenshot-style visual QA for SEL Hub and the AlloHaven authored-products
 * shelf, using the same public/demo module files PrismFlow loads. This is not
 * a pixel baseline test; it catches blank surfaces, horizontal overflow, and
 * obvious control clipping while saving screenshots for human review.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'desktop/web-app', 'public');
const SEL_DIR = path.join(PUBLIC, 'sel_hub');
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const REPORT_JSON = path.join(ROOT, 'a11y-audit', 'sel_visual_qa.json');
const REPORT_MD = path.join(ROOT, 'a11y-audit', 'sel_visual_qa.md');
const SHOT_DIR = path.join(ROOT, 'a11y-audit', 'sel_visual_qa');
const QUIET = process.argv.includes('--quiet');

let chromium;
try {
  chromium = require(path.join(ROOT, 'node_modules', 'playwright')).chromium;
} catch (e) {
  try {
    chromium = require(path.join(MODULES, 'playwright')).chromium;
  } catch (_) {
    console.warn('[check_sel_visual_qa] SKIPPED - Playwright not found (' + e.message + ')');
    process.exit(0);
  }
}

const SAMPLE_SNAPSHOTS = [
  {
    id: 'visual-zone',
    tool: 'zones',
    label: 'Zone check reflection',
    ts: Date.now() - 5 * 60000,
    data: { reflection: 'I noticed I was in the yellow zone and chose grounding before group work.' }
  },
  {
    id: 'visual-journal',
    toolId: 'journal',
    label: 'Journal checkpoint',
    ts: Date.now() - 34 * 60000,
    data: { response: 'I want to remember that asking for a quiet minute helped me reset.' }
  },
  {
    id: 'visual-strengths',
    toolId: 'strengths',
    label: 'Strengths checkpoint',
    ts: Date.now() - 52 * 60000,
    data: { summary: 'I chose perseverance and kindness as strengths I want adults to notice.' }
  }
];

const SAMPLE_ARTIFACTS = [
  {
    id: 'sel-visual-packet',
    type: 'sel-share-packet',
    source: 'sel_hub',
    sourceLabel: 'SEL Hub',
    kindLabel: 'SEL Share Packet',
    title: 'SEL Share Packet',
    summary: '2 selected SEL checkpoints',
    privacy: 'student-controlled',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    items: [
      { id: 'zone', title: 'Zone check reflection', toolLabel: 'Emotion Zones', privacy: 'summary', privacyLabel: 'Summary only', summary: 'Student noticed a yellow-zone signal and chose grounding.' },
      { id: 'journal', title: 'Journal checkpoint', toolLabel: 'Feelings Journal', privacy: 'private', privacyLabel: 'Kept private', summary: 'Kept private by student choice.' }
    ]
  },
  {
    id: 'storyforge-visual',
    type: 'storyforge-submission',
    source: 'storyforge',
    sourceLabel: 'StoryForge',
    kindLabel: 'StoryForge Story',
    title: 'The Bridge of Choices',
    summary: '284 words across 3 paragraphs',
    privacy: 'student-controlled',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      { id: 'p1', title: 'Paragraph 1', toolLabel: 'StoryForge', privacy: 'full', text: 'Mira found a bridge that only appeared when someone named a brave choice out loud.' },
      { id: 'p2', title: 'Paragraph 2', toolLabel: 'StoryForge', privacy: 'full', text: 'She crossed slowly, pausing to help a classmate who was worried about being left behind.' }
    ]
  },
  {
    id: 'adventure-visual',
    type: 'adventure-storybook',
    source: 'adventure',
    sourceLabel: 'Adventure Mode',
    kindLabel: 'Adventure Storybook',
    title: 'Rainforest Rescue',
    summary: 'Adventure storybook with 3 journey entries',
    privacy: 'student-controlled',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    items: [
      { id: 'epilogue', title: 'Epilogue', toolLabel: 'Adventure Mode', privacy: 'full', text: 'You learned that careful observation and teamwork changed the outcome.' },
      { id: 'scene', title: 'Scene 1', toolLabel: 'Adventure Mode', privacy: 'full', text: 'The canopy opened above a flooded trail, and your team had to choose a safe path.' },
      { id: 'choice', title: 'Student choice', toolLabel: 'Adventure Mode', privacy: 'full', text: 'You asked the group to check the map before rushing forward.' }
    ]
  },
  {
    id: 'poettree-visual',
    type: 'poettree-poem',
    source: 'poettree',
    sourceLabel: 'PoetTree',
    kindLabel: 'Poem',
    title: 'Steady Hands',
    summary: 'A student poem with 8 lines',
    privacy: 'student-controlled',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    poemTitle: 'Steady Hands',
    poemText: 'I breathe and count the window light. I name one thing that stayed.'
  },
  {
    id: 'story-stage-visual',
    type: 'story-stage-performance',
    source: 'story-stage',
    sourceLabel: 'Story Stage',
    kindLabel: 'Performance',
    title: 'Kindness Scene',
    summary: 'Short performance script with 2 lines',
    privacy: 'student-controlled',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    script: {
      lines: [
        { id: 'line-1', character: 'Narrator', text: 'The class paused and made space for a quieter voice.' },
        { id: 'line-2', character: 'Student', text: 'I can try again if someone reads the first line with me.' }
      ]
    }
  }
];

function selFiles() {
  return [path.join(SEL_DIR, 'sel_hub_module.js')].concat(
    fs.readdirSync(SEL_DIR).filter(function (f) {
      return /^sel_tool_.*\.js$/.test(f);
    }).sort().map(function (f) {
      return path.join(SEL_DIR, f);
    })
  );
}

function safeName(name) {
  return String(name).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function applyTheme(page, theme) {
  await page.evaluate(function (args) {
    const classes = ['theme-dark', 'theme-contrast'];
    document.documentElement.classList.remove.apply(document.documentElement.classList, classes);
    document.body.classList.remove.apply(document.body.classList, classes);
    if (args.theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
      document.body.classList.add('theme-dark');
    }
    if (args.theme === 'high-contrast') {
      document.documentElement.classList.add('theme-contrast');
      document.body.classList.add('theme-contrast');
    }
  }, { theme: theme });
}

async function addReact(page) {
  await page.addScriptTag({ path: path.join(MODULES, 'react', 'umd', 'react.development.js') });
  await page.addScriptTag({ path: path.join(MODULES, 'react-dom', 'umd', 'react-dom.development.js') });
}

async function basePage(page, title) {
  await page.setContent([
    '<!doctype html><html><head><meta charset="utf-8"><title>' + title + '</title>',
    '<style>',
    'html,body,#root{margin:0;min-height:100%;font-family:Inter,system-ui,sans-serif;}',
    'body{background:#f8fafc;}',
    '.theme-dark body,body.theme-dark{background:#0f172a;}',
    '.theme-contrast body,body.theme-contrast{background:#000;}',
    '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    '</style></head><body><div id="root"></div></body></html>'
  ].join(''));
}

async function mountSelHub(page, scenario) {
  await page.setViewportSize(scenario.viewport);
  await basePage(page, 'SEL Visual QA');
  await addReact(page);
  await page.evaluate(function (args) {
    const snapshots = args.snapshots;
    const artifacts = args.artifacts;
    function iconStub(props) {
      const next = Object.assign({}, props || {});
      next['aria-hidden'] = 'true';
      return window.React.createElement('span', next);
    }
    window.AlloIcons = new Proxy({}, { get: function () { return iconStub; } });
    window.AlloModules = window.AlloModules || {};
    window.AlloToggleTheme = function () {};
    window.callGemini = null;
    window.callTTS = null;
    window.callImagen = null;
    window.callGeminiVision = null;
    window.__alloflowSelSnapshots = snapshots;
    window.__alloflowStudentArtifacts = artifacts;
    window.Audio = function Audio() { return { play: function () { return Promise.resolve(); } }; };
    window.matchMedia = window.matchMedia || function () {
      return { matches: false, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
    };
    try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (e) {}
    try { localStorage.setItem('alloflow_sel_snapshots', JSON.stringify(snapshots)); } catch (e) {}
    try { localStorage.setItem('alloflow_student_artifacts', JSON.stringify(artifacts)); } catch (e) {}
  }, { snapshots: SAMPLE_SNAPSHOTS, artifacts: SAMPLE_ARTIFACTS });

  await applyTheme(page, scenario.theme);
  for (const file of selFiles()) await page.addScriptTag({ path: file });
  await page.evaluate(function () {
    const h = window.React.createElement;
    function Icon(props) {
      const next = Object.assign({}, props || {});
      next['aria-hidden'] = 'true';
      return h('span', next);
    }
    function App() {
      const showState = window.React.useState(true);
      const tabState = window.React.useState('explore');
      const toolState = window.React.useState(null);
      return h(window.AlloModules.SelHub, {
        showSelHub: showState[0],
        setShowSelHub: showState[1],
        selHubTab: tabState[0],
        setSelHubTab: tabState[1],
        selHubTool: toolState[0],
        setSelHubTool: toolState[1],
        addToast: function () {},
        awardXP: function () {},
        getXP: function () { return 0; },
        gradeLevel: '5th Grade',
        callGemini: null,
        callTTS: null,
        callImagen: null,
        callGeminiVision: null,
        onSafetyFlag: null,
        studentCodename: 'student',
        selectedVoice: null,
        activeSessionCode: null,
        t: function (k) { return k; },
        ArrowLeft: Icon,
        X: Icon,
        Sparkles: Icon,
        Heart: Icon,
        GripVertical: Icon
      });
    }
    window.__selVisualQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
    window.__selVisualQaRoot.render(h(App));
  });
  await page.locator('[role="dialog"][aria-label="SEL Hub"]').waitFor({ state: 'visible', timeout: 45000 });
  await applyTheme(page, scenario.theme);
  await page.waitForTimeout(500);
  const explainer = page.locator('#sel-ephemeral-explainer-modal');
  if (await explainer.count()) {
    await explainer.locator('[data-primary-action]').first().click();
    await explainer.waitFor({ state: 'detached', timeout: 10000 });
    await page.waitForTimeout(150);
  }
}

async function mountAlloHaven(page, scenario) {
  await page.setViewportSize(scenario.viewport);
  await basePage(page, 'AlloHaven Portfolio Visual QA');
  await addReact(page);
  const artifacts = scenario.emptyPortfolio ? [] : SAMPLE_ARTIFACTS;
  await page.evaluate(function (args) {
    window.AlloModules = window.AlloModules || {};
    window.__alloflowStudentArtifacts = args.artifacts;
    window.matchMedia = window.matchMedia || function () {
      return { matches: false, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
    };
    try {
      localStorage.setItem('alloflow_student_artifacts', JSON.stringify(args.artifacts));
      localStorage.setItem('alloflow_allohaven_v1', JSON.stringify({
        onboardingSeen: true,
        tokens: 8,
        studentArtifacts: args.artifacts,
        decorations: [],
        journalEntries: [],
        earnings: [],
        stories: [],
        goals: [],
        visits: []
      }));
      localStorage.setItem('alloflow_stemlab_v2', JSON.stringify({
        typingPractice: {
          theme: args.theme === 'dark' ? 'dark' : 'default',
          accommodations: { highContrast: args.theme === 'high-contrast' }
        }
      }));
    } catch (e) {}
  }, { artifacts: artifacts, theme: scenario.theme });
  await applyTheme(page, scenario.theme);
  await page.addScriptTag({ path: path.join(PUBLIC, 'allohaven_module.js') });
  await page.evaluate(function () {
    const h = window.React.createElement;
    function App() {
      return h(window.AlloModules.AlloHaven, {
        isOpen: true,
        onClose: function () {},
        addToast: function () {},
        callImagen: null,
        callGemini: null,
        callTTS: null,
        selectedVoice: null,
        disableAnimations: true
      });
    }
    window.__alloHavenVisualQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
    window.__alloHavenVisualQaRoot.render(h(App));
  });
  await page.locator('[role="dialog"][aria-label="AlloHaven"]').waitFor({ state: 'visible', timeout: 45000 });
  await applyTheme(page, scenario.theme);
  const welcome = page.locator('[role="dialog"][aria-label="Welcome to AlloHaven"]');
  if (await welcome.count()) {
    await welcome.getByRole('button', { name: /Got it/i }).first().click();
    await welcome.waitFor({ state: 'detached', timeout: 10000 });
    await page.waitForTimeout(200);
  }
  const tour = page.locator('[role="dialog"][aria-label^="AlloHaven tour"]');
  if (await tour.count()) {
    const done = tour.getByRole('button', { name: /Got it|Skip|Close|Done/i }).first();
    if (await done.count()) await done.click();
    await page.waitForTimeout(200);
  }
  await page.getByRole('button', { name: /Open my portfolio/i }).first().waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: /Open my portfolio/i }).first().click();
  await page.locator('[role="dialog"][aria-label="My portfolio"]').waitFor({ state: 'visible', timeout: 20000 });
  if (scenario.filterSource) {
    await page.getByRole('button', { name: new RegExp('Show ' + scenario.filterSource + ' portfolio products', 'i') }).first().click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(400);
}

async function openSelSurface(page, surface) {
  if (surface === 'share-packet') {
    await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().click();
    await page.locator('#sel-share-packet-modal').waitFor({ state: 'visible', timeout: 15000 });
  } else if (surface === 'station-builder') {
    const summary = page.locator('summary').filter({ hasText: /Custom SEL Stations/i }).first();
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    const build = page.getByRole('button', { name: /Build a new custom SEL Station/i }).first();
    await build.waitFor({ state: 'visible', timeout: 15000 });
    await build.click();
    await page.locator('#sel-station-name-input').waitFor({ state: 'visible', timeout: 15000 });
  } else if (surface === 'teacher-launch') {
    const summary = page.locator('summary').filter({ hasText: /Teacher launch/i }).first();
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    await page.locator('[aria-label="Teacher launch routines"]').waitFor({ state: 'visible', timeout: 15000 });
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 600) {
      await page.getByRole('button', { name: /Load teacher launch plan: Morning advisory check-in/i }).first().scrollIntoViewIfNeeded();
    }
  } else if (surface === 'for-educators') {
    await page.getByRole('button', { name: /For Educators/i }).first().click();
    await page.locator('#sel-for-educators-modal').waitFor({ state: 'visible', timeout: 15000 });
  }
  await page.waitForTimeout(400);
}

async function auditSurface(page, scenario) {
  const selector = scenario.selector;
  const shotName = safeName(scenario.name) + '.png';
  const shotPath = path.join(SHOT_DIR, shotName);
  await page.screenshot({ path: shotPath, fullPage: false });
  const shotBytes = fs.statSync(shotPath).size;
  const audit = await page.evaluate(function (args) {
    const root = document.querySelector(args.selector) || document.body;
    const text = (root.innerText || root.textContent || '').replace(/\s+/g, ' ').trim();
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none';
    }
    const overflowOffenders = Array.from(root.querySelectorAll('[role="dialog"], [role="main"], [role="region"], section, article, details, form, div')).map(function (el) {
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        label: el.getAttribute('aria-label') || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        width: Math.round(rect.width),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflowX: cs.overflowX
      };
    }).filter(function (item) {
      return item.width > 16 && item.scrollWidth > item.clientWidth + 6 && item.overflowX !== 'auto' && item.overflowX !== 'scroll';
    }).slice(0, 12);
    const clippedControls = Array.from(root.querySelectorAll('button, [role="button"], select, input, textarea')).filter(function (el) {
      if (!visible(el)) return false;
      if (el.getAttribute('data-sel-tool-card-id')) return false;
      const cs = window.getComputedStyle(el);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') return false;
      return el.scrollWidth > el.clientWidth + 6 || el.scrollHeight > el.clientHeight + 6;
    }).map(function (el) {
      return {
        tag: el.tagName.toLowerCase(),
        label: el.getAttribute('aria-label') || (el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight
      };
    }).slice(0, 12);
    return {
      textLength: text.length,
      controlCount: root.querySelectorAll('button, [role="button"], select, input, textarea, a[href]').length,
      bodyScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      overflowOffenders: overflowOffenders,
      clippedControls: clippedControls
    };
  }, { selector: selector });
  const checks = [
    { id: 'nonblank-screenshot', pass: shotBytes > 5000, details: { bytes: shotBytes } },
    { id: 'readable-surface', pass: audit.textLength >= (scenario.minText || 120), details: { textLength: audit.textLength, controlCount: audit.controlCount } },
    { id: 'no-horizontal-page-overflow', pass: audit.bodyScrollWidth <= audit.viewportWidth + 6, details: { bodyScrollWidth: audit.bodyScrollWidth, viewportWidth: audit.viewportWidth } },
    { id: 'no-unexpected-container-overflow', pass: audit.overflowOffenders.length === 0, details: audit.overflowOffenders },
    { id: 'no-clipped-controls', pass: audit.clippedControls.length === 0, details: audit.clippedControls }
  ];
  return Object.assign({}, scenario, {
    screenshot: path.relative(ROOT, shotPath),
    checks: checks,
    audit: audit
  });
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage();
  const result = Object.assign({}, scenario, { checks: [], errors: [] });
  page.on('console', function (msg) {
    const text = msg.text();
    if (msg.type() === 'error') result.errors.push('console: ' + text.slice(0, 300));
  });
  page.on('pageerror', function (err) {
    result.errors.push('pageerror: ' + ((err && err.message) || String(err)).slice(0, 300));
  });
  try {
    if (scenario.kind === 'sel') {
      await mountSelHub(page, scenario);
      await openSelSurface(page, scenario.surface);
    } else {
      await mountAlloHaven(page, scenario);
    }
    const audited = await auditSurface(page, scenario);
    result.checks = audited.checks;
    result.audit = audited.audit;
    result.screenshot = audited.screenshot;
  } catch (e) {
    result.errors.push((e && e.message) || String(e));
  } finally {
    await page.close().catch(function () {});
  }
  return result;
}

function summarize(results) {
  const checks = [];
  results.forEach(function (scenario) {
    scenario.checks.forEach(function (check) {
      checks.push({ scenario: scenario.name, id: check.id, pass: !!check.pass });
    });
    scenario.errors.forEach(function (err) {
      checks.push({ scenario: scenario.name, id: 'runtime-error', pass: false, error: err });
    });
  });
  return {
    total: checks.length,
    passed: checks.filter(function (x) { return x.pass; }).length,
    failed: checks.filter(function (x) { return !x.pass; }).length
  };
}

(async function main() {
  fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const scenarios = [
    { name: 'sel-catalog-desktop-light', kind: 'sel', theme: 'light', viewport: { width: 1280, height: 900 }, surface: 'catalog', selector: '[role="dialog"][aria-label="SEL Hub"]', minText: 900 },
    { name: 'sel-share-packet-desktop-light', kind: 'sel', theme: 'light', viewport: { width: 1280, height: 900 }, surface: 'share-packet', selector: '#sel-share-packet-modal', minText: 500 },
    { name: 'sel-teacher-launch-desktop-light', kind: 'sel', theme: 'light', viewport: { width: 1280, height: 900 }, surface: 'teacher-launch', selector: '[aria-label="Teacher launch routines"]', minText: 800 },
    { name: 'sel-teacher-launch-mobile-high-contrast', kind: 'sel', theme: 'high-contrast', viewport: { width: 390, height: 844 }, surface: 'teacher-launch', selector: '[aria-label="Teacher launch routines"]', minText: 800 },
    { name: 'sel-station-builder-mobile-high-contrast', kind: 'sel', theme: 'high-contrast', viewport: { width: 390, height: 844 }, surface: 'station-builder', selector: '[role="region"][aria-label="Station Builder"]', minText: 400 },
    { name: 'sel-for-educators-tablet-dark', kind: 'sel', theme: 'dark', viewport: { width: 820, height: 900 }, surface: 'for-educators', selector: '#sel-for-educators-modal', minText: 700 },
    { name: 'allohaven-portfolio-empty-desktop-light', kind: 'allohaven', theme: 'light', viewport: { width: 1280, height: 900 }, emptyPortfolio: true, selector: '[role="dialog"][aria-label="My portfolio"]', minText: 220 },
    { name: 'allohaven-portfolio-desktop-light', kind: 'allohaven', theme: 'light', viewport: { width: 1280, height: 900 }, selector: '[role="dialog"][aria-label="My portfolio"]', minText: 500 },
    { name: 'allohaven-portfolio-filter-sel-desktop-light', kind: 'allohaven', theme: 'light', viewport: { width: 1280, height: 900 }, filterSource: 'SEL Hub', selector: '[role="dialog"][aria-label="My portfolio"]', minText: 300 },
    { name: 'allohaven-portfolio-mobile-high-contrast', kind: 'allohaven', theme: 'high-contrast', viewport: { width: 390, height: 844 }, selector: '[role="dialog"][aria-label="My portfolio"]', minText: 500 }
  ];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const scenario of scenarios) results.push(await runScenario(browser, scenario));
    const summary = summarize(results);
    const report = {
      generatedAt: new Date().toISOString(),
      harness: 'public module visual fixture',
      screenshotDir: path.relative(ROOT, SHOT_DIR),
      summary: summary,
      scenarios: results
    };
    fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n');
    const lines = [
      '# SEL Visual QA',
      '',
      'Generated: ' + report.generatedAt,
      '',
      'Harness: public module visual fixture',
      '',
      'Screenshots: ' + report.screenshotDir,
      '',
      '## Summary',
      '',
      '- Passed: ' + summary.passed,
      '- Failed: ' + summary.failed,
      '- Scenarios: ' + results.length,
      '',
      '## Checks',
      ''
    ];
    results.forEach(function (scenario) {
      lines.push('### ' + scenario.name);
      if (scenario.screenshot) lines.push('- Screenshot: ' + scenario.screenshot);
      scenario.errors.forEach(function (err) { lines.push('- FAIL runtime-error: ' + err); });
      scenario.checks.forEach(function (check) {
        lines.push('- ' + (check.pass ? 'PASS' : 'FAIL') + ' ' + check.id);
      });
      lines.push('');
    });
    fs.writeFileSync(REPORT_MD, lines.join('\n') + '\n');
    if (!QUIET) console.log('[check_sel_visual_qa] report: ' + path.relative(ROOT, REPORT_JSON));
    console.log('Summary: ' + summary.passed + ' passed, ' + summary.failed + ' failed.');
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(function () {});
  }
})().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
