#!/usr/bin/env node
/*
 * check_sel_tool_interactions.cjs
 *
 * Dynamic browser QA for high-impact SEL tools. The static SEL audits catch
 * first-render and markup issues; this opens priority tools through the real
 * SEL Hub UI and checks focus handoff, responsive overflow, and return focus.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SEL_DIR = path.join(ROOT, 'sel_hub');
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const REPORT_JSON = path.join(ROOT, 'a11y-audit', 'sel_tool_interaction_qa.json');
const REPORT_MD = path.join(ROOT, 'a11y-audit', 'sel_tool_interaction_qa.md');
const QUIET = process.argv.includes('--quiet');

let chromium;
try {
  chromium = require(path.join(ROOT, 'node_modules', 'playwright')).chromium;
} catch (e) {
  try {
    chromium = require(path.join(MODULES, 'playwright')).chromium;
  } catch (_) {
    console.warn('[check_sel_tool_interactions] SKIPPED - Playwright not found (' + e.message + ')');
    process.exit(0);
  }
}

const TARGET_TOOLS = [
  { id: 'zones', label: 'Emotion Zones' },
  { id: 'coping', label: 'Coping Toolkit' },
  { id: 'journal', label: 'Feelings Journal' },
  { id: 'emotions', label: 'Emotion Explorer' },
  { id: 'thoughtRecord', label: 'CBT Thought Record' },
  { id: 'anxietyToolkit', label: 'Anxiety Toolkit' },
  { id: 'safety', label: 'Safety & Boundaries' },
  { id: 'conflict', label: 'Conflict Resolution' },
  { id: 'strengths', label: 'Strengths Finder' },
  { id: 'social', label: 'Social Skills Lab' },
  { id: 'peersupport', label: 'Peer Support Coach' }
];
const MOBILE_SAMPLE_TOOL_IDS = ['zones', 'journal', 'anxietyToolkit', 'safety', 'social'];

function selFiles() {
  return [path.join(SEL_DIR, 'sel_hub_module.js')].concat(
    fs.readdirSync(SEL_DIR).filter(function (f) {
      return /^sel_tool_.*\.js$/.test(f);
    }).sort().map(function (f) {
      return path.join(SEL_DIR, f);
    })
  );
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

async function mountSelHub(page, scenario) {
  await page.setViewportSize(scenario.viewport);
  await page.setContent([
    '<!doctype html><html><head><meta charset="utf-8"><title>SEL Tool Interaction QA</title>',
    '<style>',
    'html,body,#root{margin:0;min-height:100%;font-family:Inter,system-ui,sans-serif;}',
    'body{background:#f8fafc;}',
    '.theme-dark body,body.theme-dark{background:#0f172a;}',
    '.theme-contrast body,body.theme-contrast{background:#000;}',
    '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    '</style></head><body><div id="root"></div></body></html>'
  ].join(''));

  await page.addScriptTag({ path: path.join(MODULES, 'react', 'umd', 'react.development.js') });
  await page.addScriptTag({ path: path.join(MODULES, 'react-dom', 'umd', 'react-dom.development.js') });
  await page.evaluate(function () {
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
    window.__alloflowSelSnapshots = [];
    window.__alloflowStudentArtifacts = [];
    window.Audio = function Audio() { return { play: function () { return Promise.resolve(); } }; };
    window.matchMedia = window.matchMedia || function () {
      return { matches: false, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
    };
    try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (e) {}
  });

  await applyTheme(page, scenario.theme);
  for (const file of selFiles()) {
    await page.addScriptTag({ path: file });
  }
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
    window.__selToolQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
    window.__selToolQaRoot.render(h(App));
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

async function activeInfo(page) {
  return page.evaluate(function () {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
      aria: el.getAttribute('aria-label') || '',
      toolCardId: el.getAttribute('data-sel-tool-card-id') || '',
      inSelDialog: !!el.closest('[role="dialog"][aria-label="SEL Hub"]')
    };
  });
}

async function checkOverflow(page) {
  return page.evaluate(function () {
    const dialog = document.querySelector('[role="dialog"][aria-label="SEL Hub"]');
    const root = document.documentElement;
    const offenders = Array.from(document.querySelectorAll('[role="dialog"], [role="main"], [role="region"], section, article, form, details')).map(function (el) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        label: el.getAttribute('aria-label') || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
        width: Math.round(rect.width),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowX: window.getComputedStyle(el).overflowX
      };
    }).filter(function (item) {
      return item.width > 12 && item.scrollWidth > item.clientWidth + 4 && item.overflowX !== 'auto' && item.overflowX !== 'scroll';
    });
    return {
      bodyScrollWidth: root.scrollWidth,
      viewportWidth: window.innerWidth,
      dialogScrollWidth: dialog ? dialog.scrollWidth : 0,
      dialogClientWidth: dialog ? dialog.clientWidth : 0,
      offenders: offenders.slice(0, 12)
    };
  });
}

async function openTool(page, tool) {
  const search = page.getByLabel('Search SEL tools');
  await search.fill(tool.label);
  await page.waitForTimeout(120);
  const card = page.locator('[data-sel-tool-card-id="' + tool.id + '"]').first();
  if (await card.count()) {
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.focus();
    await card.click();
  } else {
    const byName = page.getByRole('button', { name: new RegExp('^' + tool.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    await byName.waitFor({ state: 'visible', timeout: 10000 });
    await byName.focus();
    await byName.click();
  }
  await page.getByRole('button', { name: /Back to (SEL )?tools/i }).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(250);
}

async function returnToGrid(page, tool) {
  await page.getByRole('button', { name: /Back to (SEL )?tools/i }).first().click();
  await page.getByLabel('Search SEL tools').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(200);
  return activeInfo(page);
}

async function auditTool(page, scenario, tool) {
  const checks = [];
  await openTool(page, tool);
  const activeAfterOpen = await activeInfo(page);
  checks.push({
    id: 'tool-open-focus',
    pass: !!activeAfterOpen && activeAfterOpen.inSelDialog && activeAfterOpen.tag !== 'body' && activeAfterOpen.tag !== 'html',
    activeAfterOpen: activeAfterOpen
  });

  const readable = await page.evaluate(function () {
    const dialog = document.querySelector('[role="dialog"][aria-label="SEL Hub"]');
    const text = (dialog && dialog.innerText || '').replace(/\s+/g, ' ').trim();
    return {
      textLength: text.length,
      hasHeading: !!(dialog && dialog.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')),
      controlCount: dialog ? dialog.querySelectorAll('button,input,select,textarea,[role="button"],a[href]').length : 0,
      selectedToolText: text.slice(0, 180)
    };
  });
  checks.push({
    id: 'tool-readable-interactive',
    pass: readable.textLength > 200 && readable.hasHeading && readable.controlCount > 1,
    details: readable
  });

  const saveCues = await page.evaluate(function () {
    const shell = document.querySelector('[data-sel-standard-shell]');
    const text = (shell && shell.innerText || '').replace(/\s+/g, ' ').trim();
    const exportButton = shell ? shell.querySelector('button[aria-label="Export SEL project file now"]') : null;
    return {
      hasStandardShell: !!shell,
      hasPrivateCheckpoint: /Private checkpoint/.test(text),
      hasSharePacketEligible: /Share Packet eligible/.test(text),
      hasSavedWorkCue: /Tool checkpoints stay private here unless you choose them for a Share Packet/.test(text),
      hasExportButton: !!exportButton
    };
  });
  checks.push({
    id: 'tool-save-consistency-cues',
    pass: saveCues.hasStandardShell && saveCues.hasPrivateCheckpoint && saveCues.hasSharePacketEligible && saveCues.hasSavedWorkCue && saveCues.hasExportButton,
    details: saveCues
  });

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const activeAfterTabs = await activeInfo(page);
  checks.push({
    id: 'tool-keyboard-progress',
    pass: !!activeAfterTabs && activeAfterTabs.inSelDialog && activeAfterTabs.tag !== 'body' && activeAfterTabs.tag !== 'html',
    activeAfterTabs: activeAfterTabs
  });

  const overflow = await checkOverflow(page);
  checks.push({
    id: 'tool-responsive-overflow',
    pass: overflow.bodyScrollWidth <= overflow.viewportWidth + 4 && overflow.dialogScrollWidth <= overflow.dialogClientWidth + 4 && overflow.offenders.length === 0,
    details: overflow
  });

  const activeAfterBack = await returnToGrid(page, tool);
  checks.push({
    id: 'tool-back-focus-restore',
    pass: !!activeAfterBack && activeAfterBack.toolCardId === tool.id,
    activeAfterBack: activeAfterBack
  });
  await page.getByLabel('Search SEL tools').fill('');
  await page.waitForTimeout(80);

  return {
    toolId: tool.id,
    label: tool.label,
    scenario: scenario.name,
    checks: checks
  };
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const result = {
    name: scenario.name,
    theme: scenario.theme,
    viewport: scenario.viewport,
    tools: [],
    errors: []
  };
  page.on('console', function (msg) {
    if (msg.type() === 'error') result.errors.push('console: ' + msg.text().slice(0, 300));
  });
  page.on('pageerror', function (err) {
    result.errors.push('pageerror: ' + ((err && err.message) || String(err)).slice(0, 300));
  });
  try {
    await mountSelHub(page, scenario);
    const tools = scenario.tools || TARGET_TOOLS;
    for (const tool of tools) {
      if (!QUIET) console.log('[check_sel_tool_interactions] ' + scenario.name + ': ' + tool.id);
      try {
        result.tools.push(await auditTool(page, scenario, tool));
      } catch (e) {
        result.tools.push({
          toolId: tool.id,
          label: tool.label,
          scenario: scenario.name,
          checks: [{ id: 'tool-runtime', pass: false, error: (e && e.message) || String(e) }]
        });
      }
    }
  } catch (e) {
    result.errors.push((e && e.message) || String(e));
  } finally {
    await page.close().catch(function () {});
  }
  return result;
}

function summarize(scenarios) {
  const flat = [];
  scenarios.forEach(function (scenario) {
    scenario.errors.forEach(function (err) {
      flat.push({ scenario: scenario.name, toolId: 'scenario', id: 'runtime-error', pass: false, error: err });
    });
    scenario.tools.forEach(function (tool) {
      tool.checks.forEach(function (check) {
        flat.push({ scenario: scenario.name, toolId: tool.toolId, id: check.id, pass: !!check.pass });
      });
    });
  });
  return {
    total: flat.length,
    passed: flat.filter(function (item) { return item.pass; }).length,
    failed: flat.filter(function (item) { return !item.pass; }).length
  };
}

(async function main() {
  const scenarios = [
    { name: 'desktop-light', theme: 'light', viewport: { width: 1280, height: 900 } },
    {
      name: 'mobile-high-contrast-sample',
      theme: 'high-contrast',
      viewport: { width: 390, height: 844 },
      tools: TARGET_TOOLS.filter(function (tool) { return MOBILE_SAMPLE_TOOL_IDS.indexOf(tool.id) >= 0; })
    }
  ];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(browser, scenario));
    }
    const summary = summarize(results);
    const report = {
      generatedAt: new Date().toISOString(),
      scope: TARGET_TOOLS.map(function (tool) { return tool.id; }),
      summary: summary,
      scenarios: results
    };
    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n');

    const lines = [
      '# SEL Tool Interaction QA',
      '',
      'Generated: ' + report.generatedAt,
      '',
      '## Summary',
      '',
      '- Passed: ' + summary.passed,
      '- Failed: ' + summary.failed,
      '- Tools: ' + TARGET_TOOLS.length,
      '- Scenarios: ' + scenarios.length,
      '',
      '## Checks',
      ''
    ];
    results.forEach(function (scenario) {
      lines.push('### ' + scenario.name);
      scenario.errors.forEach(function (err) { lines.push('- FAIL scenario runtime-error: ' + err); });
      scenario.tools.forEach(function (tool) {
        const failed = tool.checks.filter(function (check) { return !check.pass; });
        lines.push('- ' + (failed.length ? 'FAIL' : 'PASS') + ' ' + tool.label + ' (' + tool.toolId + ')');
        failed.forEach(function (check) {
          lines.push('  - ' + check.id + (check.error ? ': ' + check.error : ''));
        });
      });
      lines.push('');
    });
    fs.writeFileSync(REPORT_MD, lines.join('\n') + '\n');

    if (!QUIET) console.log('[check_sel_tool_interactions] report: ' + path.relative(ROOT, REPORT_JSON));
    console.log('Summary: ' + summary.passed + ' passed, ' + summary.failed + ' failed.');
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(function () {});
  }
})().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
