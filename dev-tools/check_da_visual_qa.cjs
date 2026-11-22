#!/usr/bin/env node
/*
 * check_da_visual_qa.cjs
 *
 * Screenshot-style visual QA for the Dynamic Assessment Studio
 * (dynamic_assessment_module.js), using the same public module file
 * PrismFlow serves. Companion to check_sel_visual_qa.cjs.
 *
 * Why: the 2026-07-12 theme uplift converted ~1,350 hardcoded colors to
 * --da-* tokens with light/dark/contrast values. SSR smokes prove the render
 * paths don't crash, but only a real paint proves the palettes are legible.
 * This drives every major screen across all three themes (by stamping the
 * host's `theme-<name>` class on <main>, which the module's MutationObserver
 * watches — so theme SWITCHING is exercised too, not just initial detection),
 * checks for page errors / blank surfaces / horizontal overflow, and saves
 * screenshots for human review.
 *
 * Usage: node dev-tools/check_da_visual_qa.cjs [--quiet]
 * Exits 0 with a SKIP notice when Playwright is unavailable.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'desktop/web-app', 'public');
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const SHOT_DIR = path.join(ROOT, 'a11y-audit', 'da_visual_qa');
const QUIET = process.argv.includes('--quiet');

let chromium;
try {
  chromium = require(path.join(ROOT, 'node_modules', 'playwright')).chromium;
} catch (e) {
  try {
    chromium = require(path.join(MODULES, 'playwright')).chromium;
  } catch (_) {
    console.warn('[check_da_visual_qa] SKIPPED - Playwright not found (' + e.message + ')');
    process.exit(0);
  }
}

// ── Seed data ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'alloflow_dynamic_assessment_v1';
const T0 = '2026-07-12T10:00:00.000Z';

function result(itemId, phase, finalCorrect, lvl, extra) {
  return Object.assign({
    itemId, phase,
    promptLevelReached: lvl || 0,
    studentResponseText: finalCorrect ? 'seven' : 'twelve',
    examinerObservation: '',
    observationTags: [],
    supportType: lvl ? 'leading' : null,
    finalCorrect: !!finalCorrect,
    scaffoldLeaked: false,
    scoreAwarded: finalCorrect ? 5 - (lvl || 0) : 0,
    attemptedAt: T0
  }, extra || {});
}

function completedSession(id, nickname, mi, dateCompleted, domain) {
  return {
    id, studentNickname: nickname, domain: domain || 'math', difficulty: 'easy',
    mode: 'clinician', isCustomBank: false, dateStarted: dateCompleted,
    dateCompleted, sessionItemIds: ['math-e-01', 'math-e-02', 'math-e-03'],
    itemResults: [
      result('math-e-01', 'pretest', true, 0), result('math-e-02', 'pretest', false, 0), result('math-e-03', 'pretest', false, 0),
      result('math-e-01', 'mediation', true, 0), result('math-e-02', 'mediation', true, 2), result('math-e-03', 'mediation', true, 4),
      result('math-e-01', 'posttest', true, 0), result('math-e-02', 'posttest', true, 0), result('math-e-03', 'posttest', false, 0)
    ],
    sessionNote: '', currentPhase: 'summary', currentItemIdx: 0, currentLadderLevel: 0,
    pretestSum: 5, posttestSum: 10, modifiabilityIndex: mi,
    modifiabilityTier: null, intake: null
  };
}

const PRIOR_SESSIONS = [
  completedSession('da-p1', 'Testling', 0.20, '2026-05-02T10:00:00.000Z'),
  completedSession('da-p2', 'Testling', 0.35, '2026-05-20T10:00:00.000Z'),
  completedSession('da-p3', 'OtherKid', 0.65, '2026-06-01T10:00:00.000Z'),
  completedSession('da-p4', 'OtherKid', -0.10, '2026-06-10T10:00:00.000Z', 'reading'),
  completedSession('da-p5', 'ThirdKid', 0.50, '2026-06-20T10:00:00.000Z'),
  completedSession('da-p6', 'Testling', 0.45, '2026-07-01T10:00:00.000Z')
];

const MEDIATION_SESSION = {
  id: 'da-live-med', studentNickname: 'Testling', domain: 'math', difficulty: 'easy',
  mode: 'clinician', isCustomBank: false, dateStarted: T0,
  sessionItemIds: ['math-e-01', 'math-e-02', 'math-e-03'],
  currentPhase: 'mediation', currentItemIdx: 1, currentLadderLevel: 2,
  itemResults: [
    result('math-e-01', 'pretest', true, 0), result('math-e-02', 'pretest', false, 0), result('math-e-03', 'pretest', false, 0),
    result('math-e-01', 'mediation', true, 0)
  ],
  sessionNote: '', intake: null
};

const SUMMARY_SESSION = Object.assign(
  completedSession('da-live-sum', 'Testling', 0.5, T0),
  {
    currentPhase: 'summary',
    intake: { referralReason: 'Math problem-solving referral', hypothesizedBottleneck: '', priorInterventions: '', existingAssessmentData: '', specificQuestion: '', languageContext: 'Somali at home; English at school since K.' },
    itemResults: [
      result('math-e-01', 'pretest', true, 0), result('math-e-02', 'pretest', false, 0), result('math-e-03', 'pretest', false, 0),
      result('math-e-01', 'mediation', true, 0, { observationTags: ['fluent'] }),
      result('math-e-02', 'mediation', true, 2, { observationTags: ['self-corrected', 'self-talk'], accessReadAloudHelped: true }),
      result('math-e-03', 'mediation', true, 3, { observationTags: ['wait-time'], scaffoldLeaked: true, scoreAwarded: 1 }),
      result('math-e-01', 'posttest', true, 0), result('math-e-02', 'posttest', true, 0), result('math-e-03', 'posttest', false, 0),
      result('math-e-01', 'transfer', true, 0), result('math-e-02', 'transfer', false, 0)
    ]
  }
);

// ── Scenarios ────────────────────────────────────────────────────────────
// Each: which state to seed, which view to reach, themes to shoot.
const SCENARIOS = [
  { id: 'start', themes: ['light', 'dark', 'contrast'],
    state: { sessions: PRIOR_SESSIONS, activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'mediation', themes: ['light', 'dark', 'contrast'],
    state: { sessions: [], activeSession: MEDIATION_SESSION, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'summary', themes: ['light', 'dark', 'contrast'],
    state: { sessions: PRIOR_SESSIONS, activeSession: SUMMARY_SESSION, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'sessions-browser', themes: ['dark'], nav: 'sessions',
    state: { sessions: PRIOR_SESSIONS, activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'population', themes: ['dark'], nav: 'population',
    state: { sessions: PRIOR_SESSIONS, activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'analytics', themes: ['dark'], nav: 'analytics',
    state: { sessions: PRIOR_SESSIONS, activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'reference', themes: ['dark'], nav: 'reference',
    state: { sessions: [], activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'calibration', themes: ['light', 'dark'], nav: 'calibration',
    state: { sessions: [], activeSession: null, onboardingSeen: true, savedProbeTemplates: [] } },
  { id: 'confirm-dialog', themes: ['dark'], clickDiscard: true,
    state: { sessions: [], activeSession: MEDIATION_SESSION, onboardingSeen: true, savedProbeTemplates: [] } }
];

// Map nav ids to the start-screen button labels that reach each view.
const NAV_CLICK = {
  sessions: 'text=📁 Sessions',
  population: null, // reached from sessions browser
  analytics: null,
  reference: 'text=📚 Guide',
  calibration: 'text=🎓 Calibrate'
};

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1200 } });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err && err.message || err)));

  // Serve the harness over localhost (secure context for WebCrypto + localStorage)
  // so the real SensitiveWorkspace encrypted boundary mounts authentically.
  const harnessHtml = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>DA visual QA</title></head>' +
    '<body style="margin:0"><main class="theme-light"><div id="host-card" style="background:#ffffff;border-radius:16px;max-width:896px;margin:24px auto;">' +
    '<div id="root"></div></div></main></body></html>';
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(harnessHtml);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const problems = [];
  let shot = 0;
  try {
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.addScriptTag({ path: path.join(MODULES, 'react', 'umd', 'react.development.js') });
  await page.addScriptTag({ path: path.join(MODULES, 'react-dom', 'umd', 'react-dom.development.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'allo_crypto_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'allo_device_vault_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'identifier_redaction_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'sensitive_workspace_module.js') });
  await page.addScriptTag({ path: path.join(PUBLIC, 'dynamic_assessment_module.js') });

  // Unlock the real in-memory SensitiveWorkspace clinical boundary once.
  await page.evaluate(async () => {
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
    await service.setup('Synthetic DA visual QA password');
    const recoveryInput = service.getStatus().setupRecoveryCode;
    await service.exportBackup();
    await service.finishSetup({ recoveryInput, backupSaved: true });
    window.__daQaService = service;
    window.AlloModules.SensitiveWorkspace = Object.assign({}, realApi, {
      Boundary: function (props) {
        return window.React.createElement(realApi.Boundary, Object.assign({}, props, { service }));
      }
    });
  });

  for (const sc of SCENARIOS) {
    // Seed state into the real protected clinical session + (re)mount fresh.
    await page.evaluate(([key, state]) => {
      if (window.__daQaRoot) { try { window.__daQaRoot.unmount(); } catch (_) {} }
      localStorage.clear();
      const session = window.__daQaService.getSession('dynamic-assessment');
      session.storage.setItem(key, JSON.stringify(state));
      const main = document.querySelector('main');
      main.className = 'theme-light';
      const DA = window.AlloModules.DynamicAssessment;
      window.__daQaRoot = window.ReactDOM.createRoot(document.getElementById('root'));
      window.__daQaRoot.render(window.React.createElement(DA, {
        React: window.React,
        onClose: function () {},
        addToast: function () {},
        t: function (k) { return k; },
        studentNickname: '',
        outputLanguage: 'English'
      }));
    }, [STORAGE_KEY, sc.state]);
    await page.waitForTimeout(300);

    // Navigate to a sub-view when requested.
    if (sc.nav) {
      if (sc.nav === 'population' || sc.nav === 'analytics') {
        await page.click('text=📁 Sessions');
        await page.waitForTimeout(150);
        await page.click(sc.nav === 'population' ? 'text=📈 Population stats' : 'text=📊 Item analytics');
      } else if (NAV_CLICK[sc.nav]) {
        await page.click(NAV_CLICK[sc.nav]);
      }
      await page.waitForTimeout(200);
    }
    if (sc.clickDiscard) {
      await page.click('text=✕ Discard');
      await page.waitForTimeout(200);
    }

    for (const theme of sc.themes) {
      // Stamp the host theme class — exercises the MutationObserver path.
      await page.evaluate((t) => {
        document.querySelector('main').className = 'theme-' + t;
        document.body.style.background = t === 'light' ? '#f8fafc' : t === 'dark' ? '#0b1220' : '#000000';
      }, theme);
      await page.waitForTimeout(200);

      const name = sc.id + '.' + theme + '.png';
      await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });
      shot++;

      // Structural checks: content present, no horizontal overflow.
      const check = await page.evaluate(() => {
        const shell = document.querySelector('.da-shell');
        const text = shell ? shell.innerText.trim() : '';
        return {
          hasShell: !!shell,
          textLen: text.length,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        };
      });
      if (!check.hasShell) problems.push(name + ': .da-shell missing');
      if (check.textLen < 40) problems.push(name + ': blank/near-blank surface (' + check.textLen + ' chars)');
      if (check.overflow) problems.push(name + ': horizontal overflow');
      if (!QUIET) console.log('  shot ' + name + ' (text ' + check.textLen + ')');
    }
  }

  } finally {
    await browser.close();
    server.close();
  }

  if (pageErrors.length) {
    console.error('\n[check_da_visual_qa] PAGE ERRORS:');
    pageErrors.forEach((e) => console.error('  ' + e));
  }
  if (problems.length) {
    console.error('\n[check_da_visual_qa] PROBLEMS:');
    problems.forEach((p) => console.error('  ' + p));
  }
  console.log('\n[check_da_visual_qa] ' + shot + ' screenshots -> ' + path.relative(ROOT, SHOT_DIR));
  if (pageErrors.length || problems.length) process.exit(1);
  console.log('[check_da_visual_qa] PASS');
})().catch((e) => { console.error('[check_da_visual_qa] CRASH: ' + (e && e.stack || e)); process.exit(1); });
