#!/usr/bin/env node
/* Browser checks use the production modules, a local HTTP origin, and a deterministic AI callback. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const wr = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const out = path.resolve('reports/concept-quest-solo-2026-09-12');
fs.mkdirSync(out, { recursive: true });
const build = spawnSync(process.execPath, ['_build_concept_quest_solo_module.js', '--check'], { encoding: 'utf8', windowsHide: true });
if (build.status !== 0) {
  const rebuilt = spawnSync(process.execPath, ['_build_concept_quest_solo_module.js'], { encoding: 'utf8', windowsHide: true });
  if (rebuilt.status !== 0) throw new Error(rebuilt.stderr || rebuilt.stdout || 'Solo build failed');
}
function installFixture() {
  window.AlloModules = {}; window.AlloIcons = {};
  window.fixtureT = (key, params = {}) => {
    let value = key.split('.').reduce((obj, part) => obj?.[part], window.fixtureEnglish);
    if (typeof value !== 'string') return params.defaultValue || key;
    for (const [name, entry] of Object.entries(params)) value = value.replaceAll('{' + name + '}', String(entry));
    return value;
  };
  window.AlloLanguageContext = React.createContext({ t: window.fixtureT }); window.__alloT = window.fixtureT;
  window.gmCalls = [];
  window.fixtureCallGemini = async (prompt, jsonMode) => {
    const text = prompt.split('CONTEXT_JSON_START\n\n')[1].split('\n\nCONTEXT_JSON_END')[0];
    const context = JSON.parse(text), action = context.playerAction;
    window.gmCalls.push({ turn: context.authoritativeGameFacts.turn, phase: context.authoritativeGameFacts.phase, intent: action.intent, text: action.text, jsonMode });
    await new Promise(resolve => setTimeout(resolve, 40));
    return JSON.stringify({
      narrative: 'Mira pauses beside a brass compass and a weathered notebook. The next discovery begins with careful observation.',
      character: { name: 'Mira the Wayfinder', dialogue: action.intent === 'talk' ? 'An observation can support a claim when you explain the connection. What detail would you compare first?' : 'Which detail in the lesson could guide your next step?' },
      feedback: action.intent === 'explain' ? 'Your explanation connects evidence with an idea. Name one detail that supports the connection.' : action.intent === 'talk' ? 'You asked how to connect an observation with a claim. Compare the observation with the lesson before deciding.' : 'Look for a relevant observation before choosing your next action.',
      evidence: 'Compare observations before drawing a conclusion.',
      choices: [ { intent: 'investigate', label: 'Examine the notebook', prompt: 'I examine the notebook for a lesson clue.' }, { intent: 'talk', label: 'Ask Mira about evidence', prompt: 'Mira, how does an observation support a claim?' } ],
      memory: 'Mira the Wayfinder carries a brass compass. The learner is investigating how observations support claims and has asked Mira to explain the connection.'
    });
  };
  window.__alloLazyConceptQuestSolo = () => {
    if (window.AlloModules.ConceptQuestSolo) return Promise.resolve();
    if (window.soloLoadPromise) return window.soloLoadPromise;
    window.soloLoadPromise = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = '/solo.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
    return window.soloLoadPromise;
  };
  const visual = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="320" height="120" rx="12" fill="#ecfdf5"/><path d="M155 105V35M155 65Q95 20 90 65Q120 90 155 65M155 50Q220 10 220 45Q190 70 155 50" stroke="#047857" stroke-width="6" fill="#6ee7b7"/></svg>');
  const questions = [
    { type: 'mcq', question: 'Which resource helps this plant grow?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight', imageUrl: visual, imageAltText: 'A young plant with leaves', concept: 'Plant needs' },
    { type: 'numeric-response', question: 'A plant has two pairs of leaves. How many leaves does it have?', correctValue: 4, unit: 'leaves', concept: 'Counting' },
    { type: 'short-answer', question: 'Explain how observations can support a claim.', expectedAnswer: 'Observations provide evidence that can be compared with a claim.', concept: 'Evidence' },
    { type: 'mcq', question: 'What do roots absorb?', options: ['Water', 'Smoke'], correctAnswer: 'Water', concept: 'Plant needs' },
    { type: 'multi-select', question: 'Choose both living things.', options: ['Tree', 'Rock', 'Flower'], correctAnswers: ['Tree', 'Flower'], concept: 'Living things' }
  ];
  const content = { id: 'solo-browser-qa', type: 'quiz', title: 'Plant investigation', data: { title: 'Plant investigation', questions, reflections: [] } };
  window.fixtureSaveContext = { generatedContent: content, userId: 'qa-local-reader', appId: 'qa-local-app' };
  window.fixtureSnapshot = () => window.AlloModules.ConceptQuestSoloStorage.read(localStorage, window.fixtureSaveContext);
  function App() {
    return React.createElement(window.AlloModules.QuizView, {
      t: window.fixtureT, isTeacherMode: false, isParentMode: false, isIndependentMode: true,
      studentProjectSettings: {}, sessionData: {}, activeSessionCode: null, isPresentationMode: false, isReviewGame: false, isEditingQuiz: false,
      escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, gameTeams: [], soundEnabled: false, globalPoints: 0,
      inputText: 'Plants need adequate light and moisture. Compare observations before drawing a conclusion. Explain how an observation supports a claim.',
      isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', generatedContent: content,
      user: { uid: 'qa-local-reader' }, appId: 'qa-local-app', callGemini: window.fixtureCallGemini,
      formatInlineText: value => value, renderFormattedText: value => value, getRows: () => 1, playSound: () => {},
      ErrorBoundary: props => props.children, ConfettiExplosion: () => null, getReviewCategories: () => []
    });
  }
  window.mountFixture = () => ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}
(async () => {
  const css = await wr('postcss')([wr('tailwindcss')({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: ['./view_quiz_source.jsx', './concept_quest_solo_source.jsx', './concept_quest_solo_question_source.jsx', './concept_quest_solo_gm_source.jsx'] })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const english = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
  const assets = {
    '/': ['text/html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Concept Quest solo QA</title><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0;background:#f1f5f9;padding:12px"><main id="root" style="max-width:1120px;margin:auto"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/fixture.js"></script><script src="/view.js"></script><script>window.mountFixture();</script></body></html>'],
    '/fixture.css': ['text/css', css.css],
    '/fixture.js': ['text/javascript', 'window.fixtureEnglish=' + JSON.stringify(english) + ';(' + installFixture.toString() + ')();'],
    '/react.js': ['text/javascript', fs.readFileSync('desktop/web-app/node_modules/react/umd/react.development.js')],
    '/react-dom.js': ['text/javascript', fs.readFileSync('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')],
    '/view.js': ['text/javascript', fs.readFileSync('view_quiz_module.js')],
    '/solo.js': ['text/javascript', fs.readFileSync('concept_quest_solo_module.js')]
  };
  const server = http.createServer((request, response) => { const asset = assets[request.url]; if (!asset) { response.writeHead(request.url === '/favicon.ico' ? 204 : 404); response.end(); return; } response.writeHead(200, { 'Content-Type': asset[0], 'Cache-Control': 'no-store' }); response.end(asset[1]); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true }); const results = [], errors = [];
  try {
    for (const width of [1280, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.setDefaultTimeout(12000);
      const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
      const checks = { width, realHttpStorage: true, aiScenes: false, typedDialogue: false, answerRecap: false, closeResume: false, reloadResume: false, transcriptPreserved: false, horizontalOverflow: false };
      const checkOverflow = async phase => { const overflow = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map(el => ({ tag: el.tagName, text: el.textContent.slice(0, 90), right: el.getBoundingClientRect().right })) })); assert.ok(overflow.page <= overflow.viewport, phase + ' horizontal overflow: ' + JSON.stringify(overflow)); };
      const screenshot = async name => { if (await page.locator('[data-solo-save-status]').count()) await page.getByText('Progress saved on this device.', { exact: true }).waitFor(); await checkOverflow(name); await page.screenshot({ path: path.join(out, name + '-' + width + '.png'), fullPage: true, animations: 'disabled' }); };
      const openSolo = async () => { await page.locator('[data-quiz-games-toggle]').click(); await page.locator('[data-open-concept-quest-solo]').click(); await page.locator('[data-concept-quest-solo]').waitFor(); };
      const waitAI = async count => { await page.waitForFunction(expected => window.gmCalls.length >= expected, count); await page.locator('[data-gm-origin="ai"]').waitFor(); };
      const waitSave = () => page.getByText('Progress saved on this device.', { exact: true }).waitFor();
      try {
        await page.goto(origin, { waitUntil: 'networkidle' }); await openSolo(); await screenshot('setup');
        await page.getByRole('button', { name: 'Start solo adventure', exact: true }).click(); await waitAI(1); checks.aiScenes = true;
        const gm = page.locator('[data-concept-quest-solo-gm]'); await gm.getByRole('combobox', { name: /What would you like to do/ }).selectOption('talk');
        const playerText = 'Mira, how can I compare an observation with a claim?'; await gm.getByRole('textbox', { name: /Your action or explanation/ }).fill(playerText); await gm.getByRole('button', { name: 'Send to game master', exact: true }).click();
        await gm.getByText('You asked how to connect an observation with a claim. Compare the observation with the lesson before deciding.', { exact: true }).waitFor(); checks.typedDialogue = true; await gm.locator('[data-gm-history] summary').click(); await gm.locator('[data-gm-history]').getByText(playerText, { exact: true }).waitFor(); await screenshot('ai-dialogue');
        await page.locator('[data-solo-travel="room-2"]').click(); await waitAI(3);
        await page.locator('[data-solo-question-type="mcq"]').getByRole('radio').first().check(); await page.getByRole('button', { name: '3. Resolve this turn', exact: true }).click();
        await page.getByRole('button', { name: 'Continue adventure', exact: true }).waitFor(); await waitAI(4); await waitSave(); checks.answerRecap = true; await screenshot('answer-recap');
        const before = await page.evaluate(() => window.fixtureSnapshot()); assert.equal(before.status, 'saved'); assert.equal(before.snapshot.quest.solo.cursor, 1); assert.ok(before.snapshot.gmState.history.some(entry => entry.role === 'player' && entry.text === playerText));
        await page.getByRole('button', { name: 'Back to Assess', exact: true }).click(); await page.locator('[data-quiz-games-toggle]').waitFor(); await page.waitForFunction(() => document.activeElement === document.querySelector('[data-quiz-games-toggle]'));
        await openSolo(); await page.getByRole('button', { name: 'Resume adventure', exact: true }).waitFor(); await screenshot('resume-choice'); await page.getByRole('button', { name: 'Resume adventure', exact: true }).click();
        await page.getByRole('button', { name: 'Continue adventure', exact: true }).waitFor(); const resumed = await page.evaluate(() => window.fixtureSnapshot());
        assert.equal(resumed.snapshot.quest.sessionId, before.snapshot.quest.sessionId); assert.equal(resumed.snapshot.quest.turn, before.snapshot.quest.turn); assert.equal(resumed.snapshot.quest.party.xp, before.snapshot.quest.party.xp); assert.deepEqual(resumed.snapshot.gmState.history, before.snapshot.gmState.history); assert.equal(resumed.snapshot.gmState.memory, before.snapshot.gmState.memory); await page.locator('[data-gm-history] summary').click(); await page.locator('[data-gm-history]').getByText(playerText, { exact: true }).waitFor(); checks.closeResume = checks.transcriptPreserved = true;
        await page.getByRole('button', { name: 'Continue adventure', exact: true }).click(); await page.locator('[data-solo-question-type="numeric-response"]').waitFor(); await waitSave(); await screenshot('resumed-encounter');
        const savedTurn = resumed.snapshot.quest.turn; await page.reload({ waitUntil: 'networkidle' }); await openSolo(); await page.getByRole('button', { name: 'Resume adventure', exact: true }).click();
        await page.locator('[data-solo-question-type="numeric-response"]').waitFor(); const reloaded = await page.evaluate(() => window.fixtureSnapshot());
        assert.equal(reloaded.snapshot.quest.turn, savedTurn); assert.deepEqual(reloaded.snapshot.gmState.history, before.snapshot.gmState.history); assert.equal(await page.evaluate(() => window.gmCalls.length), 0); await page.locator('[data-gm-history] summary').click(); await page.locator('[data-gm-history]').getByText(playerText, { exact: true }).waitFor(); checks.reloadResume = true;
        await screenshot('reload-resume'); assert.deepEqual(pageErrors, []); const staleFailure = path.join(out, 'failure-' + width + '.png'); if (fs.existsSync(staleFailure)) fs.unlinkSync(staleFailure); results.push({ ...checks, savedTurn, conversationEntries: before.snapshot.gmState.history.length, errors: pageErrors });
      } catch (error) {
        errors.push({ width, error: error.stack || String(error), pageErrors }); results.push({ ...checks, failure: error.message }); await page.screenshot({ path: path.join(out, 'failure-' + width + '.png'), fullPage: true }).catch(() => {});
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ mockedAI: true, externalProviderCalls: false, results, errors }, null, 2));
    fs.writeFileSync(path.join(out, 'README.md'), '# Solo Concept Quest browser checks\n\nRun `node dev-tools/check_concept_quest_solo_gm.cjs` from the repository root.\n\nThe production QuizView and solo bundle run on a local HTTP origin with real browser localStorage. A deterministic callback simulates the configured AI provider; no external AI requests are made.\n\nChecks cover automatic AI scenes, typed character dialogue, question/recap, close/reopen/resume, page reload, preserved game progress and conversation memory, restored keyboard focus, and horizontal overflow at 1280, 390, and 320 pixels. Screenshots cover setup, dialogue, recap, saved adventure selection, and resumed encounters.\n\nResults: ' + results.filter(item => !item.failure).length + ' of ' + results.length + ' viewport runs passed. See `browser-results.json`.\n');
    console.log(JSON.stringify({ results, errors }, null, 2)); assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
