#!/usr/bin/env node
/*
 * check_sel_browser_qa.cjs
 *
 * Live browser QA for SEL Hub follow-up. This mounts the real SEL Hub React
 * module and registered SEL tools in a tiny browser fixture, then verifies
 * modal focus behavior, station-builder focus handoff, responsive overflow,
 * and theme class responsiveness.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SEL_DIR = path.join(ROOT, 'sel_hub');
const MODULES = path.join(ROOT, 'prismflow-deploy', 'node_modules');
const REPORT_JSON = path.join(ROOT, 'a11y-audit', 'sel_hub_browser_qa.json');
const REPORT_MD = path.join(ROOT, 'a11y-audit', 'sel_hub_browser_qa.md');
const QUIET = process.argv.includes('--quiet');

let chromium;
try {
  chromium = require(path.join(ROOT, 'node_modules', 'playwright')).chromium;
} catch (e) {
  try {
    chromium = require(path.join(MODULES, 'playwright')).chromium;
  } catch (_) {
    console.warn('[check_sel_browser_qa] SKIPPED - Playwright not found (' + e.message + ')');
    process.exit(0);
  }
}

const SAMPLE_SNAPSHOTS = [
  {
    id: 'browser-qa-zone',
    tool: 'zones',
    label: 'Zone check reflection',
    ts: Date.now() - 5 * 60000,
    data: { reflection: 'I noticed I was in the yellow zone and chose grounding before group work.' }
  },
  {
    id: 'browser-qa-strengths',
    toolId: 'strengths',
    label: 'Strengths checkpoint',
    ts: Date.now() - 42 * 60000,
    data: { summary: 'I chose perseverance and kindness as strengths I want adults to notice.' }
  }
];

function selFiles() {
  const files = fs.readdirSync(SEL_DIR).filter(function (f) {
    return /^sel_tool_.*\.js$/.test(f);
  }).sort();
  return [path.join(SEL_DIR, 'sel_hub_module.js')].concat(files.map(function (f) {
    return path.join(SEL_DIR, f);
  }));
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
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><title>SEL Hub Browser QA</title>',
    '<style>',
    'html,body,#root{margin:0;min-height:100%;font-family:Inter,system-ui,sans-serif;}',
    'body{background:#f8fafc;}',
    '.theme-dark body,body.theme-dark{background:#0f172a;}',
    '.theme-contrast body,body.theme-contrast{background:#000;}',
    '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}',
    '</style></head><body>',
    '<div id="root"></div>',
    '</body></html>'
  ].join(''));

  await page.addScriptTag({ path: path.join(MODULES, 'react', 'umd', 'react.development.js') });
  await page.addScriptTag({ path: path.join(MODULES, 'react-dom', 'umd', 'react-dom.development.js') });
  await page.evaluate(function (snapshots) {
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
    window.__alloflowStudentArtifacts = [];
    window.Audio = function Audio() {
      return { play: function () { return Promise.resolve(); } };
    };
    window.matchMedia = window.matchMedia || function () {
      return { matches: false, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
    };
    try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (e) {}
    try { localStorage.setItem('alloflow_sel_snapshots', JSON.stringify(snapshots)); } catch (e) {}
  }, SAMPLE_SNAPSHOTS);

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
      const state = window.React.useState(true);
      const showSelHub = state[0];
      const setShowSelHub = state[1];
      const tabState = window.React.useState('explore');
      const selHubTab = tabState[0];
      const setSelHubTab = tabState[1];
      const toolState = window.React.useState(null);
      const selHubTool = toolState[0];
      const setSelHubTool = toolState[1];
      return h(window.React.Fragment, null,
        h('button', {
          id: 'sel-hub-open-trigger',
          onClick: function () { setShowSelHub(true); }
        }, 'Open SEL Hub'),
        h(window.AlloModules.SelHub, {
          showSelHub: showSelHub,
          setShowSelHub: setShowSelHub,
          selHubTab: selHubTab,
          setSelHubTab: setSelHubTab,
          selHubTool: selHubTool,
          setSelHubTool: setSelHubTool,
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
        })
      );
    }
    window.__selQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
    window.__selQaRoot.render(h(App));
  });
  await page.locator('[role="dialog"][aria-label="SEL Hub"]').waitFor({ state: 'visible', timeout: 45000 });
  await applyTheme(page, scenario.theme);
  await page.waitForTimeout(500);
}

async function activeInfo(page) {
  return page.evaluate(function () {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      aria: el.getAttribute('aria-label') || '',
      inExplainer: !!el.closest('#sel-ephemeral-explainer-modal'),
      inSharePacket: !!el.closest('#sel-share-packet-modal'),
      inEducators: !!el.closest('#sel-for-educators-modal')
    };
  });
}

async function auditFocusTrap(page, modalId, triggerName) {
  const steps = [];
  await page.locator('#' + modalId).waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(150);
  steps.push({ key: 'initial', active: await activeInfo(page) });
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    steps.push({ key: 'Tab', active: await activeInfo(page) });
  }
  await page.keyboard.press('Shift+Tab');
  steps.push({ key: 'Shift+Tab', active: await activeInfo(page) });

  const allInside = steps.every(function (step) {
    const a = step.active || {};
    return modalId === 'sel-share-packet-modal' ? a.inSharePacket : a.inEducators;
  });

  await page.keyboard.press('Escape');
  await page.locator('#' + modalId).waitFor({ state: 'detached', timeout: 10000 });
  await page.waitForTimeout(150);
  const restored = await activeInfo(page);
  const restoredToTrigger = restored && (new RegExp(triggerName, 'i').test(restored.aria) || new RegExp(triggerName, 'i').test(restored.text));

  return {
    pass: allInside && !!restoredToTrigger,
    modalId: modalId,
    allTabStopsInside: allInside,
    focusRestoredToTrigger: !!restoredToTrigger,
    activeAfterClose: restored,
    steps: steps
  };
}

async function checkOverflow(page) {
  return page.evaluate(function () {
    const dialog = document.querySelector('[role="dialog"][aria-label="SEL Hub"]');
    const root = document.documentElement;
    const candidates = Array.from(document.querySelectorAll('[role="dialog"], [role="main"], section, details')).map(function (el) {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        label: el.getAttribute('aria-label') || (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        width: Math.round(rect.width),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowX: window.getComputedStyle(el).overflowX
      };
    }).filter(function (item) {
      return item.scrollWidth > item.clientWidth + 3 && item.overflowX !== 'auto' && item.overflowX !== 'scroll';
    });
    return {
      bodyScrollWidth: root.scrollWidth,
      viewportWidth: window.innerWidth,
      dialogScrollWidth: dialog ? dialog.scrollWidth : 0,
      dialogClientWidth: dialog ? dialog.clientWidth : 0,
      offenders: candidates.slice(0, 10)
    };
  });
}

async function runScenario(browser, scenario) {
  const page = await browser.newPage();
  const result = {
    name: scenario.name,
    theme: scenario.theme,
    viewport: scenario.viewport,
    checks: [],
    errors: []
  };
  page.on('console', function (msg) {
    const text = msg.text();
    if (msg.type() === 'error') result.errors.push('console: ' + text.slice(0, 300));
  });
  page.on('pageerror', function (err) {
    result.errors.push('pageerror: ' + ((err && err.message) || String(err)).slice(0, 300));
  });

  try {
    await mountSelHub(page, scenario);
    const overflow = await checkOverflow(page);
    result.checks.push({
      id: 'responsive-overflow',
      pass: overflow.bodyScrollWidth <= overflow.viewportWidth + 4 && overflow.dialogScrollWidth <= overflow.dialogClientWidth + 4 && overflow.offenders.length === 0,
      details: overflow
    });

    const themeClass = await page.evaluate(function () {
      const dialog = document.querySelector('[role="dialog"][aria-label="SEL Hub"]');
      return {
        dark: !!document.querySelector('.theme-dark'),
        contrast: !!document.querySelector('.theme-contrast'),
        selText: dialog ? window.getComputedStyle(dialog).color : ''
      };
    });
    result.checks.push({
      id: 'theme-class-detected',
      pass: scenario.theme === 'light' ? (!themeClass.dark && !themeClass.contrast) : (scenario.theme === 'dark' ? themeClass.dark : themeClass.contrast),
      details: themeClass
    });

    if (scenario.focus) {
      const explainer = page.locator('#sel-ephemeral-explainer-modal');
      if (await explainer.count()) {
        await explainer.waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(150);
        const explainerFocus = await activeInfo(page);
        await explainer.locator('[data-primary-action]').first().click();
        await explainer.waitFor({ state: 'detached', timeout: 10000 });
        result.checks.push({
          id: 'first-run-explainer-dismissable',
          pass: !!explainerFocus && explainerFocus.inExplainer,
          activeBeforeDismiss: explainerFocus
        });
      }

      await page.getByRole('button', { name: /For Educators/i }).first().focus();
      await page.getByRole('button', { name: /For Educators/i }).first().click();
      result.checks.push(Object.assign({ id: 'for-educators-focus-trap' }, await auditFocusTrap(page, 'sel-for-educators-modal', 'For Educators')));

      await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().focus();
      await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().click();
      result.checks.push(Object.assign({ id: 'share-packet-focus-trap' }, await auditFocusTrap(page, 'sel-share-packet-modal', 'Create SEL Share Packet')));

      const summary = page.locator('summary').filter({ hasText: /Custom SEL Stations/i }).first();
      await summary.scrollIntoViewIfNeeded();
      await summary.click();
      const build = page.getByRole('button', { name: /Build a new custom SEL Station/i }).first();
      await build.waitFor({ state: 'visible', timeout: 10000 });
      await build.focus();
      await build.click();
      await page.waitForTimeout(250);
      const builderFocus = await activeInfo(page);
      result.checks.push({
        id: 'station-builder-focus-handoff',
        pass: !!builderFocus && builderFocus.id === 'sel-station-name-input',
        activeAfterOpen: builderFocus
      });
    }
  } catch (e) {
    result.errors.push((e && e.message) || String(e));
  } finally {
    await page.close().catch(function () {});
  }
  return result;
}

function summarize(results) {
  const flat = [];
  results.forEach(function (scenario) {
    scenario.checks.forEach(function (check) {
      flat.push({ scenario: scenario.name, id: check.id, pass: !!check.pass, check: check });
    });
    scenario.errors.forEach(function (err) {
      flat.push({ scenario: scenario.name, id: 'runtime-error', pass: false, error: err });
    });
  });
  return {
    total: flat.length,
    failed: flat.filter(function (x) { return !x.pass; }).length,
    passed: flat.filter(function (x) { return x.pass; }).length
  };
}

(async function main() {
  let browser;
  const scenarios = [
    { name: 'desktop-light-focus', theme: 'light', viewport: { width: 1280, height: 900 }, focus: true },
    { name: 'desktop-dark-responsive', theme: 'dark', viewport: { width: 1280, height: 900 }, focus: false },
    { name: 'tablet-high-contrast-responsive', theme: 'high-contrast', viewport: { width: 820, height: 900 }, focus: false },
    { name: 'mobile-high-contrast-responsive', theme: 'high-contrast', viewport: { width: 390, height: 844 }, focus: false }
  ];
  try {
    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const scenario of scenarios) {
      results.push(await runScenario(browser, scenario));
    }
    const summary = summarize(results);
    const report = {
      generatedAt: new Date().toISOString(),
      harness: 'standalone SEL Hub browser fixture',
      summary: summary,
      scenarios: results
    };
    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n');

    const lines = [
      '# SEL Hub Browser QA',
      '',
      'Generated: ' + report.generatedAt,
      '',
      'Harness: standalone SEL Hub browser fixture',
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
      if (scenario.errors.length) {
        scenario.errors.forEach(function (err) { lines.push('- FAIL runtime-error: ' + err); });
      }
      scenario.checks.forEach(function (check) {
        lines.push('- ' + (check.pass ? 'PASS' : 'FAIL') + ' ' + check.id);
      });
      lines.push('');
    });
    fs.writeFileSync(REPORT_MD, lines.join('\n') + '\n');

    if (!QUIET) console.log('[check_sel_browser_qa] report: ' + path.relative(ROOT, REPORT_JSON));
    console.log('Summary: ' + summary.passed + ' passed, ' + summary.failed + ' failed.');
    if (summary.failed > 0) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(function () {});
  }
})().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
