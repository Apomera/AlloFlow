const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'C:/Users/cabba/AppData/Local/ms-playwright';
const { chromium } = require('playwright');
const wr = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const out = path.resolve(process.argv[2] || 'reports/assess-analysis-2026-10-17/final-regeneration-browser');
fs.mkdirSync(out, { recursive: true });

function mountFixture() {
  const initial = { id: 'regeneration-browser', type: 'quiz', data: {
    title: 'Plant investigation', mode: 'exit-ticket', deliverySettings: { feedbackTiming: 'after-submit' },
    questions: [
      { id: 'plant-resource', type: 'mcq', question: 'Which resource supports leaf growth?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight', conceptLabel: 'Plant needs' },
      { id: 'leaf-count', type: 'numeric-response', question: 'A seedling has two pairs of leaves. How many leaves?', correctValue: 4, unit: 'leaves', tolerance: 0, conceptLabel: 'Counting leaves' },
    ], reflections: [],
  } };
  const unrelated = { id: 'unrelated-resource', type: 'quiz', data: { title: 'Keep this history record', questions: [{ type: 'short-answer', question: 'Unrelated prompt', expectedAnswer: 'Unrelated answer' }] } };
  const clone = value => JSON.parse(JSON.stringify(value));
  window.fixture = { requests: [], toasts: [], renders: 0, unrelated: clone(unrelated) };
  const callGemini = prompt => new Promise(resolve => fixture.requests.push({ prompt, resolve, resolved: false }));
  fixture.resolve = (index, value) => { const request = fixture.requests[index]; if (!request || request.resolved) throw Error('Unknown or completed generation request: ' + index); request.resolved = true; request.resolve(JSON.stringify(value)); };
  function App() {
    const [generatedContent, setGeneratedContent] = React.useState(() => clone(initial));
    const [history, setHistory] = React.useState(() => [clone(initial), clone(unrelated)]);
    fixture.renders++;
    fixture.snapshot = () => ({ generatedContent: clone(generatedContent), history: clone(history), toasts: clone(fixture.toasts), renders: fixture.renders, requests: fixture.requests.map(({ prompt, resolved }) => ({ prompt, resolved })) });
    fixture.reset = () => { fixture.requests = []; fixture.toasts = []; setGeneratedContent(clone(initial)); setHistory([clone(initial), clone(unrelated)]); };
    const handlers = AlloModules.createHostHandlers({
      get generatedContent() { return generatedContent; }, get history() { return history; },
      setGeneratedContent, setHistory, isTeacherMode: true, activeSessionCode: null,
      t: fixtureT, addToast: (message, level) => fixture.toasts.push({ message, level }),
    });
    return React.createElement(React.Fragment, null,
      React.createElement(AlloModules.AppStyles.AppStyles),
      React.createElement('h1', { className: 'mb-5 text-2xl font-bold text-slate-900' }, 'Assessment question authoring'),
      React.createElement(AlloModules.QuizView, {
        t: fixtureT, generatedContent, history, user: { uid: 'teacher' }, appId: 'regeneration-fixture',
        isTeacherMode: true, isParentMode: false, isIndependentMode: false, isEditingQuiz: true,
        studentProjectSettings: {}, activeSessionCode: null, sessionData: {}, isPresentationMode: false, isReviewGame: false,
        escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, gameTeams: [],
        isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', inputText: 'Plants use sunlight and water. A pair contains two leaves.',
        callGemini, handleQuizChange: handlers.handleQuizChange, handleQuizQuestionAction: handlers.handleQuizQuestionAction,
        addToast: (message, level) => fixture.toasts.push({ message, level }),
        formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 2,
        playSound: () => {}, handleFactCheck: () => {}, handleToggleIsEditingQuiz: () => {}, handleToggleIsPresentationMode: () => {},
        ErrorBoundary: value => value.children, ConfettiExplosion: () => null, Stamp: () => null,
      }));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}

(async () => {
  const css = await wr('postcss')([wr('tailwindcss')({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: ['view_quiz_source.jsx'] })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const server = http.createServer((_, response) => { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end('<!doctype html><html lang="en" class="theme-light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assessment regeneration verification</title></head><body style="margin:0;padding:16px;background:#f1f5f9"><main id="root" class="allo-docsuite" style="max-width:1100px;margin:auto"></main></body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const checks = [], errors = [], snapshots = {}, audits = [];
  const check = (name, passed, detail) => { checks.push({ name, passed: !!passed, ...(detail ? { detail } : {}) }); assert.ok(passed, name + (detail ? ': ' + JSON.stringify(detail) : '')); };
  const snapshot = async name => (snapshots[name] = await page.evaluate(() => fixture.snapshot()));
  const consistent = state => JSON.stringify(state.generatedContent.data) === JSON.stringify(state.history.find(entry => entry.id === state.generatedContent.id)?.data)
    && JSON.stringify(state.history.find(entry => entry.id === 'unrelated-resource')) === JSON.stringify({ id: 'unrelated-resource', type: 'quiz', data: { title: 'Keep this history record', questions: [{ type: 'short-answer', question: 'Unrelated prompt', expectedAnswer: 'Unrelated answer' }] } });
  const replacement = type => type === 'mcq'
    ? { id: 'plant-resource', type, question: 'Regenerated: which resource powers leaf growth?', options: ['Sunlight', 'Metal'], correctAnswer: 'Sunlight', conceptLabel: 'Plant needs' }
    : { id: 'leaf-count', type, question: 'Regenerated: three pairs contain how many leaves?', correctValue: 6, unit: 'leaves', tolerance: 0, conceptLabel: 'Counting leaves' };
  const settle = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].some(button => button.textContent === 'Regenerating…'));
  const reset = async () => { await page.evaluate(() => fixture.reset()); await page.waitForFunction(() => fixture.requests.length === 0 && fixture.snapshot().generatedContent.data.questions[0].question === 'Which resource supports leaf growth?'); await page.getByRole('button', { name: 'Regenerate item', exact: true }).nth(1).waitFor(); };
  const startBoth = async () => { const buttons = await page.getByRole('button', { name: 'Regenerate item', exact: true }).elementHandles(); assert.equal(buttons.length, 2); await buttons[0].click(); await buttons[1].click(); await page.waitForFunction(() => fixture.requests.length === 2); };
  const fingerprint = file => ({ file, bytes: fs.statSync(file).size, sha256: require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
  const modules = ['view_quiz_module.js', 'host_handlers_module.js'].map(fingerprint);
  page.on('pageerror', error => errors.push(error.message));
  let failure;
  try {
    await page.goto('http://127.0.0.1:' + server.address().port); await page.addStyleTag({ content: css.css });
    for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: 'desktop/web-app/node_modules/' + file });
    await page.evaluate(en => {
      window.fixtureT = (key, opts = {}) => { const value = key.split('.').reduce((object, part) => object?.[part], en); return typeof value === 'string' ? value : opts.defaultValue || key; };
      window.__alloT = fixtureT; window.AlloModules = {}; window.AlloIcons = {}; window.AlloLanguageContext = React.createContext({ t: fixtureT });
    }, JSON.parse(fs.readFileSync('ui_strings.js')));
    for (const file of ['app_styles_module.js', 'host_handlers_module.js', 'quiz_live_aggregators.js', 'view_quiz_module.js']) await page.addScriptTag({ path: file });
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    await page.evaluate(mountFixture);
    await startBoth();
    await page.evaluate(value => fixture.resolve(1, value), replacement('numeric-response'));
    await page.waitForFunction(() => fixture.snapshot().generatedContent.data.questions[1].question.startsWith('Regenerated:'));
    await page.evaluate(value => fixture.resolve(0, value), replacement('mcq')); await settle();
    const reversed = await snapshot('reversed');
    check('Reversed AI completion retains both regenerated types and consistent history', reversed.generatedContent.data.questions.every(question => question.question.startsWith('Regenerated:')) && reversed.generatedContent.data.questions[1].correctValue === 6 && consistent(reversed), reversed.generatedContent.data.questions);

    await reset(); await startBoth();
    await page.evaluate(values => Promise.resolve().then(() => { fixture.resolve(0, values[0]); fixture.resolve(1, values[1]); }), [replacement('mcq'), replacement('numeric-response')]); await settle();
    const batched = await snapshot('sameMicrotask');
    check('Two completions in one microtask retain both results and consistent history', batched.generatedContent.data.questions.every(question => question.question.startsWith('Regenerated:')) && consistent(batched), batched.generatedContent.data.questions);
    check('Both completed results are visible in the authoring fields', await page.locator('#assessment-question-0 textarea').first().inputValue() === replacement('mcq').question && await page.getByRole('textbox', { name: 'Edit question prompt', exact: true }).inputValue() === replacement('numeric-response').question);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      check('Authoring layout fits ' + width + ' pixels', !await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
      const audit = await page.evaluate(async () => { const result = await axe.run(document); return { violations: result.violations.map(issue => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map(node => node.target) })), passes: result.passes.length }; });
      audits.push({ width, ...audit });
      await page.screenshot({ path: path.join(out, 'regenerated-' + width + '.png'), fullPage: true, animations: 'disabled' });
      check('No axe violations at ' + width + ' pixels', audit.violations.length === 0, audit.violations);
    }

    await reset();
    await page.locator('#assessment-question-0').getByRole('button', { name: 'Regenerate item', exact: true }).click();
    await page.waitForFunction(() => fixture.requests.length === 1);
    await page.locator('#assessment-question-0 textarea').first().fill('Teacher revision: keep this wording.');
    await page.evaluate(value => fixture.resolve(0, value), replacement('mcq')); await settle();
    const edited = await snapshot('manualEdit');
    check('A pending result cannot overwrite a manual target edit', edited.generatedContent.data.questions[0].question === 'Teacher revision: keep this wording.' && !edited.generatedContent.data.questions[1].question.startsWith('Regenerated:') && consistent(edited), edited.generatedContent.data.questions);

    await reset();
    await page.locator('#assessment-question-0').getByRole('button', { name: 'Regenerate item', exact: true }).click();
    await page.waitForFunction(() => fixture.requests.length === 1);
    await page.locator('#assessment-question-0').getByRole('button', { name: 'Move down', exact: true }).click();
    await page.evaluate(value => fixture.resolve(0, value), replacement('mcq')); await settle();
    const moved = await snapshot('reordered');
    check('A pending result cannot overwrite the new occupant after reordering', moved.generatedContent.data.questions[0].type === 'numeric-response' && moved.generatedContent.data.questions[1].id === 'plant-resource' && moved.generatedContent.data.questions.every(question => !question.question.startsWith('Regenerated:')) && consistent(moved), moved.generatedContent.data.questions);

    await reset();
    await page.locator('#assessment-question-0').getByRole('button', { name: 'Regenerate item', exact: true }).click();
    await page.waitForFunction(() => fixture.requests.length === 1);
    await page.locator('#assessment-question-0').getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();
    await page.evaluate(value => fixture.resolve(0, value), replacement('mcq')); await settle();
    const deleted = await snapshot('deleted');
    check('A pending result cannot restore a deleted question or replace its neighbor', deleted.generatedContent.data.questions.length === 1 && deleted.generatedContent.data.questions[0].type === 'numeric-response' && !deleted.generatedContent.data.questions[0].question.startsWith('Regenerated:') && consistent(deleted), deleted.generatedContent.data.questions);
    check('No browser runtime errors', errors.length === 0, errors);
  } catch (error) {
    failure = error.stack || String(error);
    snapshots.failure = await page.evaluate(() => window.fixture?.snapshot?.()).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true, animations: 'disabled' }).catch(() => {});
  } finally {
    const result = { modules, passed: checks.filter(entry => entry.passed).length, total: checks.length, checks, audits, errors, snapshots, coverage: 'Generated QuizView and HostHandlers; real React resource/history state and editor buttons; only AI completions are deferred local fixtures.', ...(failure ? { failure } : {}) };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ passed: result.passed, total: result.total, errors, report: path.join(out, 'results.json'), ...(failure ? { failure } : {}) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
    if (failure) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
