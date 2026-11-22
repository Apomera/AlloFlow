#!/usr/bin/env node
/*
 * check_da_e2e_qa.cjs
 *
 * End-to-end runtime QA for the Dynamic Assessment Studio. Companion to
 * check_da_visual_qa.cjs (which verifies PAINT); this verifies BEHAVIOR:
 *
 *   1. Drives a complete real session through the UI — typed answers,
 *      Auto-check clicks, a ladder reveal, the Undo button, the themed
 *      confirm dialog (cancel path), Skip on twin-less transfer items —
 *      from "Begin pretest" all the way to Save, then asserts the computed
 *      Modifiability Index and the movement table against hand-computed
 *      expectations (2/6 pretest, 4/6 posttest → MI exactly +0.50).
 *   2. Runs an axe-core audit on the start / mediation / summary screens in
 *      light AND dark themes, scoped to the .da-shell dialog. Serious or
 *      critical violations fail the check; moderate/minor are reported.
 *
 * Usage: node dev-tools/check_da_e2e_qa.cjs [--quiet]
 * Exits 0 with a SKIP notice when Playwright is unavailable.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'desktop/web-app', 'public');
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const AXE_PATH = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
const QUIET = process.argv.includes('--quiet');

let chromium;
try {
  chromium = require(path.join(ROOT, 'node_modules', 'playwright')).chromium;
} catch (e) {
  console.warn('[check_da_e2e_qa] SKIPPED - Playwright not found (' + e.message + ')');
  process.exit(0);
}

const failures = [];
function check(cond, label) {
  if (cond) { if (!QUIET) console.log('  ok  ' + label); }
  else { failures.push(label); console.error('  FAIL ' + label); }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1200 } });
  // Emulate reduced-motion: the module's own WCAG 2.3.3 CSS then disables the
  // fade-in / pop animations, so axe measures settled opacity instead of a
  // mid-animation blend (and the behavioral drive runs without waiting them out).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err && err.message || err)));

  const harnessHtml = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>DA e2e QA</title></head>' +
    '<body style="margin:0"><main class="theme-light"><div style="background:#ffffff;border-radius:16px;max-width:896px;margin:24px auto;">' +
    '<div id="root"></div></div></main></body></html>';
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(harnessHtml);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let axeTotals = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  try {
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.addScriptTag({ path: path.join(MODULES, 'react', 'umd', 'react.development.js') });
  await page.addScriptTag({ path: path.join(MODULES, 'react-dom', 'umd', 'react-dom.development.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'allo_crypto_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'allo_device_vault_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'identifier_redaction_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'sensitive_workspace_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'dynamic_assessment_module.js') });

  await page.evaluate(async () => {
    localStorage.clear();
    const realApi = window.AlloModules.SensitiveWorkspace;
    const cryptoMod = window.AlloModules.AlloCrypto;
    const vaultMod = window.AlloModules.AlloDeviceVault;
    let stored = null, revision = 0;
    const clone = (x) => x == null ? x : JSON.parse(JSON.stringify(x));
    const service = realApi.createService({
      repository: {
        read: async () => ({ store: clone(stored), revision }),
        compareAndSwap: async (expected, next) => {
          if (expected !== revision) return false;
          stored = clone(next);
          revision++;
          return true;
        }
      },
      vaultModule: vaultMod,
      crypto: cryptoMod,
      cryptoOptions: { iterations: cryptoMod.MIN_PBKDF2_ITERATIONS },
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
      lifecycle: false,
      saveDelayMs: 100000,
      getContext: () => ({ learner: false, isCanvas: false }),
      policy: { version: 1, allowExternalAi: [] },
      confirmExport: () => true
    });
    await service.init();
    await service.setup('Synthetic DA e2e QA password');
    const recoveryInput = service.getStatus().setupRecoveryCode;
    await service.exportBackup();
    await service.finishSetup({ recoveryInput, backupSaved: true });
    window.__daQaService = service;
    window.AlloModules.SensitiveWorkspace = Object.assign({}, realApi, {
      Boundary: function (props) {
        return window.React.createElement(realApi.Boundary, Object.assign({}, props, { service }));
      }
    });
    const session = service.getSession('dynamic-assessment');
    session.storage.setItem('alloflow_dynamic_assessment_v1', JSON.stringify({
      sessions: [], activeSession: null, onboardingSeen: true, savedProbeTemplates: []
    }));
    window.__daClosed = false;
    const DA = window.AlloModules.DynamicAssessment;
    window.__daQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
    window.__daQaRoot.render(window.React.createElement(DA, {
      React: window.React,
      onClose: function () { window.__daClosed = true; },
      addToast: function () {},
      t: function (k) { return k; },
      studentNickname: '',
      outputLanguage: 'English'
    }));
  });
  await page.waitForTimeout(300);

  // ── Helpers ────────────────────────────────────────────────────────────
  const answer = async (text, btn) => {
    await page.fill('#da-response', text);
    await page.click(btn || 'text=✓ Auto-check + record');
    await page.waitForTimeout(120);
  };
  const phaseLabel = () => page.evaluate(() => {
    const el = document.querySelector('.da-root [aria-current="step"]');
    return el ? el.innerText.trim() : '(no stepper)';
  });

  // ── 1. Start a session (privacy-safe codename picker) ──────────────────
  await page.selectOption('#da-codename-adjective', { index: 1 });
  await page.waitForTimeout(80);
  const chosenCodename = await page.evaluate(() => {
    const adj = document.getElementById('da-codename-adjective');
    const ani = document.getElementById('da-codename-animal');
    return ((adj && adj.value) ? adj.value : '') + ((adj && adj.value && ani && ani.value) ? ' ' : '') + ((ani && ani.value) ? ani.value : '');
  });
  await page.click('text=Begin pretest →');
  await page.waitForTimeout(250);
  check((await phaseLabel()).indexOf('Pretest') === 0, 'session starts in Pretest phase');

  // ── 2. Pretest: 2 correct, then UNDO the 2nd and redo it, then 4 wrong ──
  const EASY_ANSWERS = { 'math-e-01': '7', 'math-e-02': '14', 'math-e-03': '6', 'math-e-04': '12', 'math-e-05': '6', 'math-e-06': '6' };
  const sessionItems = await page.evaluate(() => {
    const st = JSON.parse(window.__daQaService.getSession('dynamic-assessment').storage.getItem('alloflow_dynamic_assessment_v1'));
    return (st && st.activeSession && Array.isArray(st.activeSession.sessionItemIds)) ? st.activeSession.sessionItemIds : ['math-e-01', 'math-e-02', 'math-e-03', 'math-e-04', 'math-e-05', 'math-e-06'];
  });
  const preAns = sessionItems.map((id) => EASY_ANSWERS[id] || '6');
  await answer(preAns[0]);                 // item 1 correct
  await answer(preAns[1]);                 // item 2 correct
  // Undo the last entry — should re-present item 2 with the response restored.
  await page.click('text=↩ Undo item');
  await page.waitForTimeout(150);
  const restored = await page.inputValue('#da-response');
  check(restored === preAns[1], 'undo re-presents the item with the response draft restored (got "' + restored + '")');
  const itemCount = await page.evaluate(() => (JSON.parse(window.__daQaService.getSession('dynamic-assessment').storage.getItem('alloflow_dynamic_assessment_v1')).activeSession.itemResults || []).length);
  check(itemCount === 1, 'undo removed the popped result from the session (results=' + itemCount + ')');
  await answer(preAns[1]);                 // redo item 2 correct
  for (let i = 0; i < 4; i++) await answer('0');  // items 3-6 wrong
  check((await phaseLabel()).indexOf('Mediation') === 0, 'advances to Mediation after 6 pretest items');

  // ── 3. Confirm dialog: open Discard, CANCEL, session must survive ──────
  await page.click('text=✕ Discard');
  await page.waitForTimeout(150);
  const dlgVisible = await page.evaluate(() => !!document.querySelector('[role="alertdialog"]'));
  check(dlgVisible, 'themed confirm dialog opens on Discard');
  await page.click('text=Cancel');
  await page.waitForTimeout(150);
  const stillActive = await page.evaluate(() => !!JSON.parse(window.__daQaService.getSession('dynamic-assessment').storage.getItem('alloflow_dynamic_assessment_v1')).activeSession);
  check(stillActive, 'Cancel keeps the session');

  // ── 4. Mediation: reveal a ladder rung on item 1, then answer all 6 ────
  await page.click('.da-ladder-step button >> nth=0'); // reveal L1
  await page.waitForTimeout(120);
  const ladderShown = await page.evaluate(() => !!document.querySelector('.da-ladder-step.active'));
  check(ladderShown, 'ladder rung reveals as active');
  for (const a of preAns) await answer(a);
  check((await phaseLabel()).indexOf('Posttest') === 0, 'advances to Posttest after mediation');

  // ── 5. Posttest: 4 correct (from active posttest form), 2 wrong → MI = +0.50 ──
  const postAnswers = await page.evaluate((fallbackAns) => {
    const st = JSON.parse(window.__daQaService.getSession('dynamic-assessment').storage.getItem('alloflow_dynamic_assessment_v1'));
    const snap = st && st.activeSession && Array.isArray(st.activeSession.posttestItemSnapshot) ? st.activeSession.posttestItemSnapshot : null;
    const right4 = [0, 1, 2, 3].map((idx) => (snap && snap[idx] && snap[idx].correctAnswer) ? String(snap[idx].correctAnswer) : fallbackAns[idx]);
    return right4.concat(['0', '0']);
  }, preAns);
  for (const a of postAnswers) await answer(a);
  await page.waitForTimeout(250);
  // Modern matched-parallel / mixed sessions administer novel parallel items during
  // Posttest and advance straight to Summary; legacy same-item sessions enter Transfer.
  const phaseAfterPost = await phaseLabel();
  if (phaseAfterPost.indexOf('Transfer') === 0) {
    check(true, 'advances to Transfer (legacy same-item form)');
    await answer('8');
    await answer('16');
    const skipBtn = page.getByRole('button', { name: 'Skip', exact: true });
    for (let guard = 0; guard < 8; guard++) {
      const onSummary = await page.evaluate(() => document.querySelector('.da-shell').innerText.indexOf('Session complete') >= 0);
      if (onSummary) break;
      if (await skipBtn.count()) { await skipBtn.first().click(); await page.waitForTimeout(120); }
      else break;
    }
    await page.waitForTimeout(250);
  } else {
    const onSummary = await page.evaluate(() => {
      const shell = document.querySelector('.da-shell');
      return !!shell && shell.innerText.indexOf('Modifiability profile') >= 0;
    });
    check(onSummary, 'advances directly to Summary after matched-parallel/mixed posttest');
  }

  // ── 7. Summary: assert the hand-computed MI and new summary surfaces ───
  const summaryText = await page.evaluate(() => {
    const shell = document.querySelector('.da-shell');
    return shell ? shell.innerText : '';
  });
  // NB: innerText reflects CSS text-transform, so "Session complete" renders
  // uppercased — assert on the h1 (not transformed) instead.
  check(summaryText.indexOf('Modifiability profile') >= 0, 'summary screen reached');
  // pretest 2×5=10/30, posttest 4×5=20/30 → MI = (20-10)/(30-10) = +0.50
  const actualMi = await page.evaluate(() => {
    const gauge = document.querySelector('[aria-label^="Modifiability Index gauge:"]');
    return gauge ? gauge.getAttribute('aria-label') : '';
  });
  check(summaryText.indexOf('+0.50') >= 0, 'Modifiability Index computes to +0.50 from the driven answers (got "' + actualMi + '")');
  check(summaryText.indexOf('Learning-zone snapshot') >= 0, 'ZPD snapshot renders');
  check(summaryText.indexOf('Per-item movement') >= 0, 'movement table renders');
  check(summaryText.indexOf('▲ gained') >= 0, 'movement table shows gained items');
  check(summaryText.indexOf('Sensitivity:') >= 0, 'MI sensitivity band renders');

  // ── 8. Save, land back on start, session appears in history ────────────
  await page.click('text=✓ Save session');
  await page.waitForTimeout(250);
  const startText = await page.evaluate(() => document.querySelector('.da-shell').innerText);
  check(startText.indexOf('Start a session') >= 0, 'saving returns to the start screen');
  check(startText.indexOf(chosenCodename || 'Anonymous') >= 0, 'saved session appears in recent sessions');

  // ── 9. Escape on the start screen closes the dialog (host onClose) ─────
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  check(await page.evaluate(() => window.__daClosed === true), 'Escape on start screen invokes onClose');

  // ── 10. axe-core audit: start / mediation / summary × light + dark ─────
  if (fs.existsSync(AXE_PATH)) {
    await page.addScriptTag({ path: AXE_PATH });
    const AXE_STATES = [
      { id: 'start', state: { sessions: [], activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
      { id: 'mediation', state: null /* seeded below */ },
      { id: 'summary', state: null }
    ];
    // Reuse the just-saved session for the summary state; synthesize mediation.
    const saved = await page.evaluate(() => JSON.parse(window.__daQaService.getSession('dynamic-assessment').storage.getItem('alloflow_dynamic_assessment_v1')).sessions[0]);
    AXE_STATES[1].state = { sessions: [], onboardingSeen: true, savedProbeTemplates: [], activeSession: Object.assign({}, saved, { currentPhase: 'mediation', currentItemIdx: 1, currentLadderLevel: 2, dateCompleted: undefined }) };
    AXE_STATES[2].state = { sessions: [], onboardingSeen: true, savedProbeTemplates: [], activeSession: Object.assign({}, saved, { currentPhase: 'summary', dateCompleted: undefined }) };

    for (const sc of AXE_STATES) {
      for (const theme of ['light', 'dark']) {
        // Set the theme class BEFORE a fresh mount so daDetectTheme() reads it
        // correctly at mount time — avoids the MutationObserver re-theme race
        // that would otherwise leave a transient mixed-theme state under axe.
        await page.evaluate(([state, t]) => {
          if (window.__daQaRoot) { try { window.__daQaRoot.unmount(); } catch (_) {} }
          document.querySelector('main').className = 'theme-' + t;
          window.__daQaService.getSession('dynamic-assessment').storage.setItem('alloflow_dynamic_assessment_v1', JSON.stringify(state));
          const DA = window.AlloModules.DynamicAssessment;
          window.__daQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
          window.__daQaRoot.render(window.React.createElement(DA, {
            React: window.React, onClose: function () {}, addToast: function () {}, t: function (k) { return k; },
            studentNickname: '', outputLanguage: 'English'
          }));
        }, [sc.state, theme]);
        await page.waitForTimeout(300);
        const result = await page.evaluate(async () => {
          const res = await window.axe.run(document.querySelector('.da-shell'), {
            rules: { region: { enabled: false }, 'page-has-heading-one': { enabled: false } }
          });
          return res.violations.map((v) => ({
            id: v.id, impact: v.impact, help: v.help,
            nodes: v.nodes.slice(0, 4).map((n) => {
              var cc = (n.any || []).find((a) => a.id === 'color-contrast');
              var d = cc && cc.data ? cc.data : null;
              var tag = n.html.slice(0, 120);
              return d ? (tag + '  [fg=' + d.fgColor + ' bg=' + d.bgColor + ' ratio=' + d.contrastRatio + ' expected=' + d.expectedContrastRatio + ']') : tag;
            })
          }));
        });
        for (const v of result) {
          axeTotals[v.impact] = (axeTotals[v.impact] || 0) + 1;
          const line = 'axe[' + sc.id + '.' + theme + '] ' + v.impact + ': ' + v.id + ' — ' + v.help;
          if (v.impact === 'critical' || v.impact === 'serious') { failures.push(line); console.error('  FAIL ' + line); v.nodes.forEach((n) => console.error('       ' + n)); }
          else { console.warn('  warn ' + line); v.nodes.forEach((n) => console.warn('       ' + n)); }
        }
        if (!QUIET && result.length === 0) console.log('  ok  axe[' + sc.id + '.' + theme + '] no violations');
      }
    }
  } else {
    console.warn('[check_da_e2e_qa] axe-core not found — audit skipped');
  }

  } finally {
    await browser.close();
    server.close();
  }

  if (pageErrors.length) {
    console.error('\n[check_da_e2e_qa] PAGE ERRORS:');
    pageErrors.forEach((e) => console.error('  ' + e));
  }
  console.log('\n[check_da_e2e_qa] axe totals: ' + JSON.stringify(axeTotals));
  if (failures.length || pageErrors.length) {
    console.error('[check_da_e2e_qa] ' + failures.length + ' failure(s)');
    process.exit(1);
  }
  console.log('[check_da_e2e_qa] PASS');
})().catch((e) => { console.error('[check_da_e2e_qa] CRASH: ' + (e && e.stack || e)); process.exit(1); });
