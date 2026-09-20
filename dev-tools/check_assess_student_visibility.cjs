const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
const { chromium } = require('playwright');
const wr = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const out = path.resolve(process.argv[2] || 'reports/assess-student-visibility-2026-09-19');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const css = await wr('postcss')([wr('tailwindcss')({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: [process.env.ALLO_ASSESS_CANDIDATE ? process.env.ALLO_ASSESS_CANDIDATE.replace('_module.js','_source.jsx') : './view_quiz_source.jsx'] })]).process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assess visibility verification</title></head><body style="margin:0;background:#f1f5f9;padding:12px"><main id="root" class="allo-docsuite" style="max-width:1100px;margin:auto"></main></body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true }), errors = [], checks = [], accessibility = [];
  let page;
  const check = (name, value, detail) => { checks.push({ name, passed: !!value, ...(detail ? { detail } : {}) }); assert.ok(value, name + (detail ? ': ' + JSON.stringify(detail) : '')); };
  try {
    for (const { width, dark } of [{ width: 1280 }, { width: 390 }, { width: 320 }, { width: 1280, dark: true }, { width: 390, dark: true }, { width: 320, dark: true }]) {
      const label = `${width}${dark ? '-dark' : ''}`;
      page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.addStyleTag({ content: css.css });
      if (dark) await page.evaluate(() => { document.documentElement.classList.add('theme-dark'); document.body.style.background = '#0f172a'; document.body.style.color = '#e2e8f0'; });
      for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: 'desktop/web-app/node_modules/' + file });
      await page.evaluate(en => {
        window.fixtureT = (key, params = {}) => { let value = key.split('.').reduce((o, k) => o?.[k], en); if (typeof value !== 'string') return params.defaultValue || key; for (const [k, v] of Object.entries(params)) value = value.replaceAll('{' + k + '}', v); return value; };
        window.AlloModules = {}; window.AlloIcons = {}; window.AlloLanguageContext = React.createContext({ t: window.fixtureT }); window.__alloT = window.fixtureT;
      }, JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')));
      await page.addScriptTag({ path: 'app_styles_module.js' });
      await page.evaluate(() => { const styles = document.createElement('div'); document.body.append(styles); ReactDOM.createRoot(styles).render(React.createElement(AlloModules.AppStyles.AppStyles)); });
      await page.addScriptTag({ path: process.env.ALLO_ASSESS_CANDIDATE || 'view_quiz_module.js' });
      await page.addScriptTag({ path: require.resolve('axe-core') });
      await page.evaluate(() => {
        const questions = [
          { type: 'mcq', question: 'Which resource helps a plant grow?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight', factCheck: 'The answer guide explains that leaves use light for photosynthesis.' },
          { type: 'short-answer', question: 'How do roots help a plant?', expectedAnswer: 'Roots absorb water from the soil.' },
          { type: 'numeric-response', question: 'Two pairs of leaves: how many leaves?', correctValue: 4, unit: 'leaves' }
        ];
        window.fixture = { legacyGrades: 0, legacyReveals: 0, sounds: 0 };
        function App() {
          const [state, setState] = React.useState({ isTeacherMode: true, isParentMode: false, isIndependentMode: false, isPresentationMode: true, isReviewGame: false, isEditingQuiz: false, showQuizAnswers: false, activeSessionCode: null });
          window.setFixture = patch => setState(old => ({ ...old, ...patch }));
          return React.createElement(window.AlloModules.QuizView, {
            ...state, t: window.fixtureT, user: { uid: 'fixture-facilitator' }, studentProjectSettings: {}, sessionData: {},
            generatedContent: { id: state.resourceId || 'visibility-browser', type: 'quiz', data: { title: 'Plant investigation', questions, reflections: ['What would you change to help a plant grow?'] } },
            escapeRoomState: { isActive: !!state.staleEscape }, presentationState: { 0: { selectedOption: 'Sunlight', isCorrect: true, showAnswer: true, showExplanation: true } },
            reviewGameState: { claimed: new Set(), activeQuestion: questions[1], showAnswer: true },
            gameTeams: [], soundEnabled: false, globalPoints: 0, inputText: 'Plant growth', isFactChecking: {}, leveledTextLanguage: 'English',
            formatInlineText: v => v, renderFormattedText: v => v, getRows: () => 1, playSound: () => window.fixture.sounds++, addToast: () => {},
            ErrorBoundary: p => p.children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
            handleToggleIsPresentationMode: () => setState(s => ({ ...s, isPresentationMode: !s.isPresentationMode })),
            handleToggleIsReviewGame: () => setState(s => ({ ...s, isReviewGame: !s.isReviewGame })),
            handlePresentationOptionClick: () => window.fixture.legacyGrades++, togglePresentationAnswer: () => window.fixture.legacyReveals++,
            togglePresentationExplanation: () => window.fixture.legacyReveals++, resetPresentation: () => window.fixture.legacyReveals++, getReviewCategories: () => []
          });
        }
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
      });
      const btn = name => page.getByRole('button', { name: new RegExp('^' + name + '$', 'i') });
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const audit = async surface => {
        const result = await page.evaluate(() => axe.run(document.getElementById('root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
        const violations = result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
        accessibility.push({ label, surface, violations });
      };
      await page.locator('[data-assessment-presentation]').waitFor();
      check(`${label}: presentation starts concealed`, (await page.locator('[data-presentation-visibility]').innerText()).includes('are hidden') && !(await page.locator('body').innerText()).includes('leaves use light'));
      const storageBefore = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
      for (const choice of ['Stone', 'Sunlight']) {
        const option = page.locator('[data-presentation-question-type="mcq"]').getByRole('button', { name: new RegExp(choice) });
        await option.click();
        check(`${label}: ${choice} stays neutral`, await option.getAttribute('aria-pressed') === 'true' && !/green|red-/.test(await option.getAttribute('class')));
      }
      check(`${label}: selection does not grade, play sounds, reveal, or write a learner record`, await page.evaluate(before => fixture.legacyGrades === 0 && fixture.legacyReveals === 0 && fixture.sounds === 0 && JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]) === before, storageBefore));
      check(`${label}: hidden presentation fits viewport`, !await overflow());
      await audit('presentation-hidden');
      await page.screenshot({ path: path.join(out, `presentation-hidden-${label}.png`), fullPage: true, animations: 'disabled' });
      await btn('Reveal answer').focus(); await page.keyboard.press('Enter');
      check(`${label}: keyboard answer reveal`, (await page.locator('[data-presentation-visibility]').innerText()).includes('1'));
      await btn('Show explanation').click();
      check(`${label}: explanation deliberately revealed`, (await page.locator('body').innerText()).includes('leaves use light'));
      await audit('presentation-revealed');
      await page.screenshot({ path: path.join(out, `presentation-revealed-${label}.png`), fullPage: true, animations: 'disabled' });
      await btn('Hide answer').click();
      await page.locator('[data-presentation-question-type="mcq"]').getByRole('button', { name: /Stone/ }).click();
      await btn('Reveal answer').click();
      check(`${label}: incorrect discussion selection is explained only after reveal`, (await page.locator('[data-presentation-selection-feedback]').innerText()).includes('differs from the answer guide'));
      await audit('presentation-incorrect-revealed');
      await btn('Next question').click(); await btn('Reveal answer guide').click();
      check(`${label}: mixed-format guide available`, (await page.locator('body').innerText()).includes('Roots absorb water from the soil.'));
      check(`${label}: hidden-slide answers counted`, (await page.locator('[data-presentation-visibility]').innerText()).includes('2'));
      await page.locator('[data-presentation-hide-guides]').focus(); await page.keyboard.press('Enter');
      await btn('Show all questions').click();
      check(`${label}: keyboard hide clears all questions`, !(await page.locator('body').innerText()).includes('leaves use light') && !(await page.locator('body').innerText()).includes('Roots absorb water from the soil.'));
      await btn('Show one question').click(); await btn('Previous question').click(); await btn('Show explanation').click();
      await btn('Exit presentation').click(); await btn('Present questions').click();
      check(`${label}: reentry starts concealed`, (await page.locator('[data-presentation-visibility]').innerText()).includes('are hidden'));
      await btn('Show explanation').click();
      await page.evaluate(() => setFixture({ resourceId: 'another-assessment' }));
      await page.waitForFunction(() => document.querySelector('[data-presentation-visibility]')?.textContent.includes('are hidden'));
      check(`${label}: different assessment clears guides`, !(await page.locator('body').innerText()).includes('leaves use light'));
      await page.evaluate(() => setFixture({ isTeacherMode: false, isPresentationMode: true, isReviewGame: true, isEditingQuiz: true, showQuizAnswers: true, staleEscape: true, activeSessionCode: 'CLASS' }));
      await page.locator('[data-assessment-student-view]').waitFor();
      check(`${label}: Student View removes stale facilitator surfaces`, await page.locator('[data-assessment-presentation],[data-assessment-facilitator-tools],[data-quiz-games-toggle],[data-review-answer-guide]').count() === 0);
      check(`${label}: Student View conceals guides`, !(await page.locator('body').innerText()).includes('leaves use light') && !(await page.locator('body').innerText()).includes('Roots absorb water from the soil.'));
      const answer = page.getByRole('button', { name: /Sunlight/ }); await answer.click();
      check(`${label}: ordinary student response works`, await answer.getAttribute('aria-pressed') === 'true');
      check(`${label}: Student View fits viewport`, !await overflow());
      await audit('student');
      await page.screenshot({ path: path.join(out, `student-${label}.png`), fullPage: true, animations: 'disabled' });
      await btn('Review & submit').click(); await page.getByRole('dialog').waitFor();
      check(`${label}: student can review before submission`, (await page.getByRole('dialog').innerText()).includes('Review'));
      await page.keyboard.press('Escape');
      await page.evaluate(() => setFixture({ isTeacherMode: true, isIndependentMode: true, isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, showQuizAnswers: false, staleEscape: false, activeSessionCode: null }));
      await page.locator('[data-quiz-games-toggle]').click();
      check(`${label}: independent study retains labeled practice games`, (await page.locator('[data-quiz-games-toggle]').innerText()).includes('Practice games') && (await page.locator('#quiz-games-tools').innerText()).includes('can reveal answers'));
      await page.close(); page = null;
    }
    check('No browser runtime errors', errors.length === 0, errors);
    check('No automated accessibility violations', accessibility.every(a => !a.violations.length), accessibility.filter(a => a.violations.length));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ checks, accessibility, errors }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify({ checks: checks.length, accessibilitySurfaces: accessibility.length, errors }));
})().catch(error => { console.error(error); process.exitCode = 1; });
