const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'C:/Users/cabba/AppData/Local/ms-playwright';
const { chromium } = require('playwright');
const wr = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const modulePath = process.env.ALLO_ASSESS_CANDIDATE || 'view_quiz_module.js';
const sourcePath = modulePath.replace('_module.js', '_source.jsx');
const out = path.resolve(process.argv[2] || 'reports/assess-analysis-2026-10-17/seven-multitab-browser');
fs.mkdirSync(out, { recursive: true });

async function mountFixture() {
  const en = await fetch('/strings.json').then(response => response.json());
  window.fixtureT = (key, opts = {}) => {
    const value = key.split('.').reduce((obj, part) => obj?.[part], en);
    return typeof value === 'string' ? value : opts.defaultValue || key;
  };
  window.__alloT = fixtureT;
  window.AlloIcons = {};
  window.AlloLanguageContext = React.createContext({ t: fixtureT });
  window.fixture = { completions: 0, inputTimes: [], events: [] };
  document.addEventListener('input', event => {
    if (event.target.closest('#assessment-question-2')) { fixture.inputTimes.push(Date.now()); fixture.events.push({ at: Date.now(), kind: 'input', value: event.target.value }); }
  });
  const originalSetItem = Storage.prototype.setItem;
  const originalGetItem = Storage.prototype.getItem;
  Storage.prototype.getItem = function (key) {
    const value = originalGetItem.call(this, key);
    if (key.startsWith('alloflow_assess_')) { let saved; try { saved = JSON.parse(value); } catch {} fixture.events.push({ at: Date.now(), kind: 'read', key, value: saved?.items?.['q-2']?.response }); }
    return value;
  };
  Storage.prototype.setItem = function (key, value) {
    if (key.startsWith('alloflow_assess_')) { let saved; try { saved = JSON.parse(value); } catch {} fixture.events.push({ at: Date.now(), kind: 'write', key, value: saved?.items?.['q-2']?.response, attemptId: saved?.attemptId || saved?.items?.root?.attemptMeta?.attemptId }); }
    return originalSetItem.call(this, key, value);
  };
  for (const kind of ['storage', 'alloflow:assessment-draft-saved', 'alloflow:assessment-draft-error', 'alloflow:assessment-draft-changed', 'alloflow:assessment-draft-synced']) window.addEventListener(kind, event => fixture.events.push({ at: Date.now(), kind, key: event.key, detail: event.detail, value: document.querySelector('#assessment-question-2 textarea')?.value }));
  const questions = [
    { type: 'mcq', question: 'Which resource supports leaf growth?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight' },
    { type: 'mcq', question: 'What do roots take in?', options: ['Water', 'Metal'], correctAnswer: 'Water' },
    { type: 'short-answer', question: 'Explain how roots help a plant.', expectedAnswer: 'Roots absorb water from soil.' },
    { type: 'short-answer', question: 'Explain how leaves help a plant.', expectedAnswer: 'Leaves use light to make food.' },
  ];
  const props = {
    t: fixtureT, isTeacherMode: false, isParentMode: false, isIndependentMode: false,
    user: { uid: 'multitab-learner' }, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    generatedContent: { id: 'multitab-browser', type: 'quiz', data: { title: 'Plant assessment', questions, deliverySettings: { feedbackTiming: 'after-submit' } } },
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false,
    escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, gameTeams: [],
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
    formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
    playSound: () => {}, addToast: () => {}, ErrorBoundary: value => value.children,
    TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
    onResourceComplete: () => fixture.completions++, onRecordQuizResponses: () => {}, handleQuizQuestionAction: () => true,
  };
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(React.Fragment, null,
    React.createElement(AlloModules.AppStyles.AppStyles), React.createElement(AlloModules.QuizView, props)));
}

(async () => {
  const moduleBytes = fs.readFileSync(modulePath);
  const moduleFingerprint = { bytes: moduleBytes.length, sha256: require('crypto').createHash('sha256').update(moduleBytes).digest('hex') };
  const css = await wr('postcss')([wr('tailwindcss')({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: [sourcePath] })])
    .process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const routes = {
    '/react.js': ['text/javascript', fs.readFileSync('desktop/web-app/node_modules/react/umd/react.development.js')],
    '/react-dom.js': ['text/javascript', fs.readFileSync('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')],
    '/app-styles.js': ['text/javascript', fs.readFileSync('app_styles_module.js')],
    '/quiz.js': ['text/javascript', moduleBytes],
    '/axe.js': ['text/javascript', fs.readFileSync(require.resolve('axe-core'))],
    '/strings.json': ['application/json', fs.readFileSync('ui_strings.js')],
    '/fixture.css': ['text/css', css.css],
    '/fixture.js': ['text/javascript', '(' + mountFixture.toString() + ')().catch(error => { console.error(error); throw error; });'],
  };
  const html = '<!doctype html><html lang="en" class="theme-light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assess two-tab verification</title><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0;padding:12px;background:#f1f5f9"><main id="root" class="allo-docsuite" style="max-width:1100px;margin:auto"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/app-styles.js"></script><script src="/quiz.js"></script><script src="/axe.js"></script><script src="/fixture.js"></script></body></html>';
  const server = http.createServer((req, res) => {
    const route = routes[new URL(req.url, 'http://localhost').pathname];
    res.setHeader('Content-Type', (route ? route[0] : 'text/html') + '; charset=utf-8');
    res.end(route ? route[1] : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const withoutWebLocks = process.env.ALLO_ASSESS_NO_WEB_LOCKS === '1';
  const failFirstLockOpen = withoutWebLocks && process.env.ALLO_ASSESS_FAIL_LOCK_OPEN === '1';
  if (withoutWebLocks) await context.addInitScript(failFirstLockOpen => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    window.assessLockTransactions = 0;
    window.assessLockOpenAttempts = 0;
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      if (args[0] === 'alloflow-assessment-locks') {
        window.assessLockOpenAttempts++;
        // Keep the simulated outage active until Retry so the initial metadata
        // autosave cannot consume the failure before the response is entered.
        if (failFirstLockOpen && location.search.includes('failLockOpen=1') && !window.assessAllowLockOpen) throw new DOMException('Simulated temporary database open failure', 'UnknownError');
      }
      return open.apply(this, args);
    };
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      if (args[1] === 'readwrite') window.assessLockTransactions++;
      return transaction.apply(this, args);
    };
  }, failFirstLockOpen);
  const checks = [], errors = [], audits = [];
  const check = (name, value, detail) => { checks.push({ name, passed: !!value, ...(detail ? { detail } : {}) }); assert.ok(value, name + (detail ? ': ' + JSON.stringify(detail) : '')); };
  const pages = [];
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const status = page => page.locator('[data-assessment-draft-status]');
  const input = (page, index = 2) => page.locator('#assessment-question-' + index + ' textarea');
  const stored = (page, receipt = false) => page.evaluate(receipt => {
    const prefix = receipt ? 'alloflow_assess_attempt_v1:' : 'alloflow_assess_draft_v1:';
    const key = Object.keys(localStorage).find(key => key.startsWith(prefix));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  }, receipt);
  const waitInput = (page, value, index = 2) => page.waitForFunction(({ value, index }) => document.querySelector('#assessment-question-' + index + ' textarea')?.value === value, { value, index });
  const audit = async (page, name) => {
    const result = await page.evaluate(() => axe.run(document.getElementById('root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    audits.push({ name, violations: result.violations.map(issue => ({ id: issue.id, impact: issue.impact, targets: issue.nodes.map(node => node.target) })) });
  };
  const save = async page => { await status(page).filter({ hasText: 'Saved locally' }).waitFor(); };
  const compete = async (a, b, values) => {
    const diagnosticGap = Math.max(0, Math.min(250, Number(process.env.ALLO_ASSESS_CONFLICT_GAP_MS) || 0));
    if (diagnosticGap) {
      // Optional diagnostic separates the writes while retaining overlapping autosave windows.
      await a.waitForTimeout(500);
      await input(a).fill(values[0]); await a.waitForTimeout(diagnosticGap); await input(b).fill(values[1]);
    } else await Promise.all([input(a).fill(values[0]), input(b).fill(values[1])]);
    const times = await Promise.all([a, b].map(page => page.evaluate(() => fixture.inputTimes.at(-1))));
    check('Competing edits land before the 350ms autosave delay', Math.abs(times[0] - times[1]) < 350, { gapMs: Math.abs(times[0] - times[1]) });
    await Promise.race([a, b].map(page => status(page).filter({ hasText: 'This answer changed in another tab' }).waitFor({ timeout: 10000 })));
    const conflict = await button(a, 'Use saved answers').count() ? a : b;
    check('Conflicting answer offers both explicit recovery choices', await button(conflict, 'Use saved answers').isVisible() && await button(conflict, 'Save my changes').isVisible());
    return conflict;
  };
  try {
    const origin = 'http://127.0.0.1:' + server.address().port;
    const a = await context.newPage(); pages.push(a); a.on('pageerror', error => errors.push({ tab: 'A', message: error.message }));
    await a.goto(origin + (failFirstLockOpen ? '?failLockOpen=1' : '')); await input(a).fill('Starting answer');
    if (failFirstLockOpen) {
      await button(a, 'Retry save').waitFor();
      check('Temporary IndexedDB open failure keeps the latest response available for retry', await input(a).inputValue() === 'Starting answer' && (await stored(a))?.items?.['q-2']?.response !== 'Starting answer');
      // Release the simulated outage on the actual retry gesture. Opening it
      // earlier lets a pending autosave recover and remove the button before
      // Playwright can click it, bypassing the recovery control under test.
      await button(a, 'Retry save').evaluate(element => {
        element.addEventListener('pointerdown', () => { window.assessAllowLockOpen = true; }, { once: true });
      });
      await button(a, 'Retry save').click(); await save(a);
      check('Retry save reopens IndexedDB and persists the latest response', await a.evaluate(() => assessLockOpenAttempts >= 2) && (await stored(a)).items['q-2'].response === 'Starting answer');
    } else await save(a);
    const b = await context.newPage(); pages.push(b); b.on('pageerror', error => errors.push({ tab: 'B', message: error.message }));
    await b.goto(origin); await waitInput(b, 'Starting answer');
    check('Both tabs share one browser storage context', a.context() === b.context() && (await stored(a)).items.root.attemptMeta.attemptId === (await stored(b)).items.root.attemptMeta.attemptId);
    check('Requested cross-tab locking path is active', await a.evaluate(withoutWebLocks => withoutWebLocks ? !navigator.locks && window.assessLockTransactions > 0 : typeof navigator.locks?.request === 'function', withoutWebLocks), { path: withoutWebLocks ? 'IndexedDB transaction fallback' : 'Web Locks' });

    await Promise.all([a.locator('#assessment-question-0').getByRole('button', { name: /Sunlight/ }).click(), b.locator('#assessment-question-1').getByRole('button', { name: /Water/ }).click()]);
    for (const page of pages) await page.waitForFunction(() => document.querySelector('#assessment-question-0 [aria-pressed="true"]')?.textContent.includes('Sunlight') && document.querySelector('#assessment-question-1 [aria-pressed="true"]')?.textContent.includes('Water'));
    const mcq = (await stored(a)).items.root.mcqAnswers;
    check('Independent MCQ edits merge in storage and both visible tabs', mcq[0] === 0 && mcq[1] === 0);
    await Promise.all([input(a).fill('Roots take in water'), input(b, 3).fill('Leaves use light')]);
    await Promise.all(pages.flatMap(page => [waitInput(page, 'Roots take in water'), waitInput(page, 'Leaves use light', 3)]));
    check('Independent written responses merge in storage and both visible tabs', (await stored(b)).items['q-2'].response === 'Roots take in water' && (await stored(b)).items['q-3'].response === 'Leaves use light');

    let conflict = await compete(a, b, ['First version from A', 'First version from B']);
    const savedFirst = (await stored(a)).items['q-2'].response;
    await conflict.setViewportSize({ width: 390, height: 900 }); await status(conflict).scrollIntoViewIfNeeded();
    await audit(conflict, 'mobile-answer-conflict');
    check('Conflict recovery fits a 390px viewport', !await conflict.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await conflict.screenshot({ path: path.join(out, 'conflict-mobile.png'), animations: 'disabled' });
    const independentLocal = 'An independent response typed while resolving another answer';
    await input(conflict, 3).fill(independentLocal);
    await conflict.waitForTimeout(500);
    check('Independent work stays visible while another answer is conflicted', await input(conflict, 3).inputValue() === independentLocal);
    await button(conflict, 'Use saved answers').click();
    await Promise.all(pages.map(page => waitInput(page, savedFirst)));
    await Promise.all(pages.map(page => waitInput(page, independentLocal, 3)));
    check('Use saved answers adopts the stored answer without overwriting it', (await stored(a)).items['q-2'].response === savedFirst && await button(conflict, 'Use saved answers').count() === 0);
    check('Use saved answers also persists independent local work and syncs both tabs', (await stored(a)).items['q-3'].response === independentLocal);

    conflict = await compete(a, b, ['Second version from A', 'Second version from B']);
    const localChoice = await input(conflict).inputValue();
    await button(conflict, 'Save my changes').click();
    await Promise.all(pages.map(page => waitInput(page, localChoice)));
    check('Save my changes persists the chosen local answer and updates the other tab', (await stored(a)).items['q-2'].response === localChoice && await button(conflict, 'Use saved answers').count() === 0);

    await a.locator('[data-assessment-submit-footer]').getByRole('button', { name: 'Review & submit', exact: true }).click();
    await button(a, 'Submit assessment').click();
    if (await button(a, 'Submit with unanswered items').count()) await button(a, 'Submit with unanswered items').click();
    await a.locator('[data-assessment-submitted]').waitFor();
    await b.locator('[data-assessment-external-change]').waitFor();
    check('Submitting in one tab blocks stale editing in the other', await b.locator('#assessment-question-2 textarea').count() === 0 && await button(b, 'Download draft').isVisible());
    await audit(b, 'external-submission');
    await b.screenshot({ path: path.join(out, 'external-submitted.png'), fullPage: true, animations: 'disabled' });
    await button(b, 'Open latest attempt').click(); await b.locator('[data-assessment-submitted]').waitFor();
    check('Open latest attempt displays the submitted answers', (await b.locator('[data-assessment-attempt-feedback]').innerText()).includes(localChoice));
    const firstAttemptId = (await stored(a, true)).attemptId;

    await button(a, 'Start another attempt').click(); await button(a, 'Clear and start again').click();
    await input(a).waitFor(); await b.locator('[data-assessment-external-change]').waitFor();
    check('Restarting in one tab prevents stale receipt actions in the other', await b.locator('[data-assessment-start-another]').count() === 0);
    await button(b, 'Open latest attempt').click(); await input(b).waitFor();
    check('Opening the restarted attempt clears prior responses in both tabs', await input(a).inputValue() === '' && await input(b).inputValue() === '' && !await stored(a, true));
    const restarted = await stored(a);
    check('Restart creates one new shared attempt identity', restarted.items.root.attemptMeta.attemptId !== firstAttemptId && restarted.items.root.attemptMeta.attemptId === (await stored(b)).items.root.attemptMeta.attemptId);
    await input(b).fill('A response in the restarted attempt'); await waitInput(a, 'A response in the restarted attempt');
    check('Both tabs can continue the restarted attempt with synchronized answers', (await stored(a)).items['q-2'].response === 'A response in the restarted attempt');
    check('No runtime errors', errors.length === 0, errors);
    check('Conflict and external-change surfaces have no automated accessibility violations', audits.every(item => item.violations.length === 0), audits.filter(item => item.violations.length));
  } catch (error) {
    checks.push({ name: 'Browser scenario completed', passed: false, detail: error.message });
    for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(out, 'failure-tab-' + i + '.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    const tabState = await Promise.all(pages.map(page => page.evaluate(() => ({ events: fixture.events, storage: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])), answer: document.querySelector('#assessment-question-2 textarea')?.value })).catch(error => ({ error: error.message }))));
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ testedAt: new Date().toISOString(), modulePath, moduleFingerprint, lockPath: withoutWebLocks ? 'indexeddb' : 'web-locks', failFirstLockOpen, checks, audits, errors, tabState }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ checks: checks.length, auditedSurfaces: audits.length, errors }));
})().catch(error => { console.error(error); process.exitCode = 1; });
