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

const SAMPLE_ARTIFACTS = [
  {
    id: 'browser-qa-sel-packet',
    type: 'sel-share-packet',
    source: 'sel_hub',
    sourceLabel: 'SEL Hub',
    kindLabel: 'SEL Share Packet',
    title: 'SEL Share Packet',
    summary: '2 selected SEL checkpoints',
    privacy: 'student-controlled',
    audience: 'student-selected',
    sharingModel: 'item-level-privacy',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    itemCount: 2,
    artifact: {
      id: 'browser-qa-sel-packet',
      type: 'sel-share-packet',
      source: 'sel_hub',
      sourceLabel: 'SEL Hub',
      kindLabel: 'SEL Share Packet',
      title: 'SEL Share Packet',
      summary: '2 selected SEL checkpoints',
      privacy: 'student-controlled',
      audience: 'student-selected',
      sharingModel: 'item-level-privacy',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      itemCount: 2,
      items: [
        { id: 'browser-qa-zone', title: 'Zone check reflection', toolLabel: 'Emotion Zones', privacy: 'summary', privacyLabel: 'Share summary only', summary: 'Student noticed a yellow-zone signal and chose grounding.' },
        { id: 'browser-qa-strengths', title: 'Strengths checkpoint', toolLabel: 'Strengths Finder', privacy: 'followup', privacyLabel: 'Ask adult to follow up', summary: 'Student wants an adult to notice perseverance and kindness.', followUpRequested: true }
      ]
    }
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
    window.Audio = function Audio() {
      return { play: function () { return Promise.resolve(); } };
    };
    window.matchMedia = window.matchMedia || function () {
      return { matches: false, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
    };
    try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (e) {}
    try { localStorage.setItem('alloflow_sel_snapshots', JSON.stringify(snapshots)); } catch (e) {}
    try { localStorage.setItem('alloflow_student_artifacts', JSON.stringify(artifacts)); } catch (e) {}
  }, { snapshots: SAMPLE_SNAPSHOTS, artifacts: SAMPLE_ARTIFACTS });

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
  const restoredIsControl = restored && restored.tag !== 'body' && restored.tag !== 'html';
  const restoredToTrigger = restoredIsControl && (new RegExp(triggerName, 'i').test(restored.aria) || new RegExp(triggerName, 'i').test(restored.text));

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
        await page.waitForTimeout(150);
        const afterExplainerDismiss = await activeInfo(page);
        result.checks.push({
          id: 'first-run-explainer-dismissable',
          pass: !!explainerFocus && explainerFocus.inExplainer && !!afterExplainerDismiss && afterExplainerDismiss.tag !== 'body' && afterExplainerDismiss.tag !== 'html' && !afterExplainerDismiss.inExplainer,
          activeBeforeDismiss: explainerFocus,
          activeAfterDismiss: afterExplainerDismiss
        });
      }

      await page.getByRole('button', { name: /For Educators/i }).first().focus();
      await page.getByRole('button', { name: /For Educators/i }).first().click();
      result.checks.push(Object.assign({ id: 'for-educators-focus-trap' }, await auditFocusTrap(page, 'sel-for-educators-modal', 'For Educators')));

      await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().focus();
      await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().click();
      result.checks.push(Object.assign({ id: 'share-packet-focus-trap' }, await auditFocusTrap(page, 'sel-share-packet-modal', 'Create SEL Share Packet')));

      await page.getByRole('button', { name: /Create SEL Share Packet/i }).first().click();
      await page.locator('#sel-share-packet-modal').waitFor({ state: 'visible', timeout: 10000 });
      await page.getByRole('button', { name: /Reopen saved SEL Share Packet as draft/i }).first().click();
      await page.waitForTimeout(250);
      const lifecycle = await page.evaluate(function () {
        const modal = document.getElementById('sel-share-packet-modal');
        const update = modal ? modal.querySelector('[aria-label="Update this saved SEL Share Packet in AlloHaven"]') : null;
        const status = modal ? (modal.textContent || '').replace(/\s+/g, ' ').trim() : '';
        const checked = modal ? Array.from(modal.querySelectorAll('input[type="checkbox"]')).filter(function (el) { return el.checked; }).length : 0;
        return {
          hasSavedPanel: !!(modal && modal.querySelector('[aria-label="Saved SEL Share Packets"]')),
          hasUpdateAction: !!update,
          loadedDraftText: /Loaded saved packet as a draft|Draft loaded from saved packet/.test(status),
          checkedCount: checked
        };
      });
      result.checks.push({
        id: 'share-packet-lifecycle-reopen-draft',
        pass: lifecycle.hasSavedPanel && lifecycle.hasUpdateAction && lifecycle.loadedDraftText && lifecycle.checkedCount >= 2,
        details: lifecycle
      });
      await page.getByRole('button', { name: /Update this saved SEL Share Packet in AlloHaven/i }).first().click();
      await page.waitForTimeout(300);
      const updateResult = await page.evaluate(function () {
        const artifacts = Array.isArray(window.__alloflowStudentArtifacts) ? window.__alloflowStudentArtifacts : [];
        const packets = artifacts.filter(function (artifact) {
          return artifact && artifact.type === 'sel-share-packet';
        });
        const packet = packets.filter(function (artifact) { return artifact.id === 'browser-qa-sel-packet'; })[0] || null;
        const status = (document.getElementById('sel-share-packet-modal') || document.body).textContent || '';
        return {
          packetCount: packets.length,
          updatedSamePacket: !!packet,
          version: packet ? packet.version : null,
          notice: /Updated the saved AlloHaven portfolio copy/.test(status)
        };
      });
      result.checks.push({
        id: 'share-packet-lifecycle-update-in-place',
        pass: updateResult.packetCount === 1 && updateResult.updatedSamePacket && updateResult.version === 2 && updateResult.notice,
        details: updateResult
      });
      await page.keyboard.press('Escape');
      await page.locator('#sel-share-packet-modal').waitFor({ state: 'detached', timeout: 10000 });

      const teacherSummary = page.locator('summary').filter({ hasText: /Teacher launch/i }).first();
      await teacherSummary.scrollIntoViewIfNeeded();
      await teacherSummary.click();
      const launchPlan = page.getByRole('button', { name: /Load teacher launch plan: Morning advisory check-in/i }).first();
      await launchPlan.waitFor({ state: 'visible', timeout: 10000 });
      await launchPlan.click();
      await page.waitForTimeout(350);
      const customAfterLaunch = page.locator('summary').filter({ hasText: /Custom SEL Stations/i }).first();
      if (!(await page.locator('#sel-station-name-input').isVisible().catch(function () { return false; }))) {
        await customAfterLaunch.scrollIntoViewIfNeeded();
        await customAfterLaunch.click();
      }
      await page.locator('#sel-station-name-input').waitFor({ state: 'visible', timeout: 10000 });
      const teacherLaunch = await page.evaluate(function () {
        const region = document.querySelector('[role="region"][aria-label="Station Builder"]');
        const name = document.getElementById('sel-station-name-input');
        const note = region ? region.querySelector('textarea') : null;
        const text = (region && region.innerText || '').replace(/\s+/g, ' ').trim();
        return {
          name: name ? name.value : '',
          note: note ? note.value : '',
          hasStudentPreview: /Students privately check their zone/.test(text),
          hasSharingBoundary: /No journal text is collected/.test(text),
          hasTeacherMove: note ? /Teacher move:/.test(note.value) : false,
          selectedTools: (text.match(/\d+ tools selected/) || [''])[0],
          selectedQuests: (text.match(/\d+ quests/) || [''])[0]
        };
      });
      result.checks.push({
        id: 'teacher-launch-loads-station-preview',
        pass: /Morning advisory check-in/.test(teacherLaunch.name)
          && /Student view:/.test(teacherLaunch.note)
          && teacherLaunch.hasStudentPreview
          && teacherLaunch.hasSharingBoundary
          && teacherLaunch.hasTeacherMove
          && teacherLaunch.selectedTools === '4 tools selected'
          && teacherLaunch.selectedQuests === '2 quests',
        details: teacherLaunch
      });
      await page.getByRole('button', { name: /Cancel station builder/i }).first().click();
      await page.waitForTimeout(150);

      const summary = page.locator('summary').filter({ hasText: /Custom SEL Stations/i }).first();
      await summary.scrollIntoViewIfNeeded();
      const build = page.getByRole('button', { name: /Build a new custom SEL Station/i }).first();
      if (!(await build.isVisible().catch(function () { return false; }))) {
        await summary.click();
      }
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
