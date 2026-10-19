const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'C:/Users/cabba/AppData/Local/ms-playwright';
const { chromium } = require('playwright');
const wr = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const out = path.resolve(process.argv[2] || 'reports/assess-analysis-2026-10-17/third-seven-attempt-browser');
const modulePath = process.env.ALLO_ASSESS_CANDIDATE || 'view_quiz_module.js';
fs.mkdirSync(out, { recursive: true });

function mountFixture() {
  const LP = AlloModules.LivePolling, aggs = AlloModules.QuizLiveAggregators;
  const uid = 'attempt-learner', roster = { [uid]: { displayName: 'Learner' } };
  const content = { id: 'attempt-isolation-browser', type: 'quiz', data: {
    title: 'Plant assessment', mode: 'exit-ticket', scoringPolicy: { writtenResponseMode: 'teacher-review' },
    deliverySettings: { feedbackTiming: 'after-submit' },
    questions: [
      { type: 'mcq', question: 'Which resource supports leaf growth?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight' },
      { type: 'mcq', question: 'What do roots absorb?', options: ['Water', 'Metal'], correctAnswer: 'Water' },
    ], reflections: ['Explain what you learned.'],
  } };
  window.fixture = { bank: {}, packets: [], wire: [], receipts: [], requests: [], completions: 0, cloudWrites: 0 };
  function session() { return { roster, quizState: { isActive: true, activityId: 'activity-one', allResponses: { [uid]: fixture.bank } } }; }
  const host = LP.createHost({ sessionCode: 'ROOM', signalingPath: 'quiz-signaling',
    acceptResponse: (_, payload) => payload.response?.assessmentActivityId === 'activity-one',
    onResponse: (_, __, payload) => {
      const result = LP.mergeAssessmentResponse(fixture.bank, payload.pollId, payload.response);
      fixture.packets.push({ questionIndex: payload.pollId, response: payload.response, accepted: result.accepted });
      if (result.accepted) { fixture.bank = result.responses; window.refreshTeacher?.(); }
      return result.accepted;
    },
  });
  const guest = LP.createGuest({ sessionCode: 'ROOM', userUid: uid, signalingPath: 'quiz-signaling' });
  host.peers.set(uid, { dc: { readyState: 'open', send: data => {
    const packet = JSON.parse(data); fixture.receipts.push(packet);
    if (packet.type === 'confirmedResponseReceipt') guest._receiveConfirmedResponseReceipt(packet.payload);
  } } });
  guest.dc = { readyState: 'open', send: data => {
    const packet = JSON.parse(data); fixture.wire.push(packet);
    if (packet.type === 'confirmedResponse') host._receiveConfirmedResponse(uid, 'Learner', packet.payload);
    else if (packet.type === 'response') host._receiveResponse(uid, 'Learner', packet.payload);
  } };
  fixture.setConnected = connected => { guest.dc.readyState = connected ? 'open' : 'closed'; if (connected) window.dispatchEvent(new Event('online')); };
  const deps = { activeSessionCode: 'ROOM', user: { uid }, sessionData: session(), quizGuestRef: { current: guest },
    doc: () => ({}), db: {}, appId: 'browser-fixture', updateDoc: () => { fixture.cloudWrites++; return Promise.resolve(); } };
  const submitHandler = AlloModules.createHostHandlers(deps).handleSubmitLiveAnswer;
  const submit = payload => { fixture.requests.push(payload); return submitHandler(payload); };
  fixture.snapshot = () => {
    const state = session().quizState;
    return { bank: fixture.bank, row: aggs.aggregateGradebook(state, content, roster).studentRows[0],
      reflections: aggs.aggregateReflections(state, content, roster), completions: fixture.completions };
  };
  fixture.replayPrevious = async () => {
    const previousId = fixture.firstAttemptId;
    const old = fixture.wire.filter(packet => packet.type === 'confirmedResponse' && packet.payload.response.assessmentAttemptId === previousId);
    const results = [];
    for (const [index, packet] of old.entries()) {
      results.push(await guest.sendConfirmedResponse(packet.payload.pollId, { ...packet.payload.response, timestamp: Date.now() + 1000 }, 'late-old-' + index));
    }
    const practice = fixture.wire.find(packet => packet.type === 'response' && packet.payload.response.assessmentAttemptId === previousId);
    if (practice) host._receiveResponse(uid, 'Learner', { ...practice.payload, response: { ...practice.payload.response, timestamp: Date.now() + 2000 } });
    return results;
  };
  function App() {
    const [, refresh] = React.useState(0); window.refreshTeacher = () => refresh(value => value + 1);
    const common = {
      t: fixtureT, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: 'ROOM',
      sessionData: session(), generatedContent: content, isPresentationMode: false, isReviewGame: false, isEditingQuiz: false,
      escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {}, gameTeams: [],
      isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
      formatInlineText: value => value, renderFormattedText: value => value, getReviewCategories: () => [], getRows: () => 1,
      playSound: () => {}, addToast: () => {}, ErrorBoundary: value => value.children,
      TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: () => null,
      onResourceComplete: () => fixture.completions++, onRecordQuizResponses: () => {}, handleQuizQuestionAction: () => true,
      onSubmitLiveAnswer: submit,
    };
    return React.createElement(React.Fragment, null, React.createElement(AlloModules.AppStyles.AppStyles),
      React.createElement('section', { id: 'student-panel', 'aria-label': 'Learner assessment' },
        React.createElement('h1', { className: 'text-2xl font-bold mb-4 text-slate-900' }, 'Learner'),
        React.createElement(AlloModules.QuizView, { ...common, user: { uid }, isTeacherMode: false })),
      React.createElement('section', { id: 'teacher-panel', 'aria-label': 'Teacher assessment results', className: 'mt-10 border-t-4 border-indigo-300 pt-6' },
        React.createElement('h1', { className: 'text-2xl font-bold mb-4 text-slate-900' }, 'Teacher — current attempt'),
        React.createElement(AlloModules.QuizView, { ...common, user: { uid: 'teacher' }, isTeacherMode: true })));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}

(async () => {
  const css = await wr('postcss')([wr('tailwindcss')({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: ['view_quiz_source.jsx'] })])
    .process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
  const server = http.createServer((_, res) => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><html lang="en" class="theme-light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assess attempt isolation</title></head><body style="margin:0;padding:16px;background:#f1f5f9"><main id="root" class="allo-docsuite" style="max-width:1100px;margin:auto"></main></body></html>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const checks = [], errors = [], snapshots = {};
  const check = (name, passed, detail) => { checks.push({ name, passed: !!passed, ...(detail ? { detail } : {}) }); assert.ok(passed, name + (detail ? ': ' + JSON.stringify(detail) : '')); };
  const snapshot = async name => (snapshots[name] = await page.evaluate(() => fixture.snapshot()));
  let failure;
  const fingerprint = file => ({ file, bytes: fs.statSync(file).size, sha256: require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
  const modules = [modulePath, 'host_handlers_module.js', 'live_polling_module.js', 'quiz_live_aggregators.js'].map(fingerprint);
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:' + server.address().port); await page.addStyleTag({ content: css.css });
    for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: 'desktop/web-app/node_modules/' + file });
    await page.evaluate(en => {
      window.fixtureT = (key, opts = {}) => { const value = key.split('.').reduce((obj, part) => obj?.[part], en); return typeof value === 'string' ? value : opts.defaultValue || key; };
      window.__alloT = fixtureT; window.AlloModules = {}; window.AlloIcons = {}; window.AlloLanguageContext = React.createContext({ t: fixtureT });
    }, JSON.parse(fs.readFileSync('ui_strings.js')));
    for (const file of ['app_styles_module.js', 'live_polling_module.js', 'host_handlers_module.js', 'quiz_live_aggregators.js', modulePath]) await page.addScriptTag({ path: file });
    await page.evaluate(mountFixture);
    const student = page.locator('#student-panel'), teacher = page.locator('#teacher-panel');
    const submit = async () => {
      await student.locator('[data-assessment-submit-footer]').getByRole('button', { name: 'Review & submit', exact: true }).click();
      await page.getByRole('button', { name: 'Submit assessment', exact: true }).click();
      const confirm = page.getByRole('button', { name: 'Submit with unanswered items', exact: true });
      if (await confirm.count()) await confirm.click();
      await student.locator('[data-assessment-delivery-status]').filter({ hasText: 'Received by teacher' }).waitFor();
    };
    await student.locator('#assessment-question-0').getByRole('button', { name: /Sunlight/ }).click();
    await student.locator('#assessment-question-1').getByRole('button', { name: /Water/ }).click();
    await student.getByRole('textbox', { name: 'Your reflection', exact: true }).fill('First attempt reflection: plants need water and light.');
    await submit();
    const first = await snapshot('firstSubmitted');
    await page.evaluate(() => { fixture.firstAttemptId = fixture.bank.__assessmentAttempt.attemptId; });
    check('First attempt reaches the teacher through confirmed delivery', first.row.attemptStatus === 'submitted' && first.row.totalAnswered === 2 && first.row.scorePercent === 100);
    check('First reflection reaches the canonical teacher reflection summary', JSON.stringify(first.reflections).includes('First attempt reflection'));
    check('Learner completion and teacher summary agree', first.completions === 1 && (await teacher.getByRole('table').innerText()).includes('2 / 2 (100%)'));
    await teacher.getByRole('button', { name: 'Expand Learner details', exact: true }).click();
    await teacher.screenshot({ path: path.join(out, 'teacher-first-submitted.png'), animations: 'disabled' });

    await page.evaluate(() => fixture.setConnected(false));
    await student.getByRole('button', { name: 'Start another attempt', exact: true }).click();
    await student.getByRole('button', { name: 'Clear and start again', exact: true }).click();
    await page.waitForFunction(() => fixture.requests.some(packet => packet.itemType === 'assessment-start'));
    check('A temporarily disconnected restart preserves the teacher snapshot until delivery', (await snapshot('restartDisconnected')).bank.__assessmentAttempt.attemptId === first.bank.__assessmentAttempt.attemptId);
    check('Disconnected restart still opens a clean learner draft', await student.locator('#assessment-question-0').isVisible() && await student.locator('[aria-pressed="true"]').count() === 0);
    await page.evaluate(() => fixture.setConnected(true));
    await page.waitForFunction(() => fixture.bank.__assessmentAttempt?.attemptId !== fixture.firstAttemptId && fixture.bank.__assessmentAttempt?.status === 'in-progress');
    check('Reconnect retries the same restart marker without learner action', await page.evaluate(() => { const requests = fixture.requests.filter(packet => packet.itemType === 'assessment-start'); return requests.length >= 2 && requests.every(packet => packet.requestId === requests[0].requestId); }));
    const restarted = await snapshot('secondStarted');
    check('Restart announces a new attempt before an answer is entered', restarted.bank.__assessmentAttempt.startedAt > first.bank.__assessmentAttempt.startedAt && restarted.bank[2]?.itemType === 'assessment-start');
    check('Restart clears previous teacher answers and completion', !restarted.bank[0] && !restarted.bank[1] && restarted.row.totalAnswered === 0 && restarted.row.totalPossible === 0 && restarted.row.attemptStatus === 'in-progress');
    check('Restart clears the previous teacher reflection summary', restarted.reflections === null);
    check('Previous responses remain only in the prior-attempt history', restarted.bank.__assessmentHistory?.[0]?.responses?.[2]?.answer?.reflections?.[0]?.draft.includes('First attempt reflection'));
    check('Learner receives an empty new draft', await student.locator('[aria-pressed="true"]').count() === 0 && await student.getByRole('textbox', { name: 'Your reflection', exact: true }).inputValue() === '');
    await teacher.screenshot({ path: path.join(out, 'teacher-second-started.png'), animations: 'disabled' });
    const replay = await page.evaluate(() => fixture.replayPrevious());
    check('Late first-attempt final packets are explicitly rejected even with newer timestamps', replay.length === 3 && replay.every(result => result.status === 'rejected'), replay);
    const afterReplay = await snapshot('afterLatePackets');
    check('Late old final and practice packets cannot restore old answers or completion', JSON.stringify(afterReplay.bank) === JSON.stringify(restarted.bank));
    check('Late old packets cannot restore old reflections or teacher scores', afterReplay.reflections === null && afterReplay.row.totalAnswered === 0 && afterReplay.row.totalPossible === 0);

    await student.locator('#assessment-question-0').getByRole('button', { name: /Stone/ }).click();
    await page.waitForFunction(() => fixture.snapshot().row.totalAnswered === 1);
    const draft = await snapshot('secondDraft');
    check('Second practice answer is owned by the new attempt', draft.bank[0].assessmentAttemptId === restarted.bank.__assessmentAttempt.attemptId && draft.bank[0].answer.optionText === 'Stone');
    check('Second attempt has its own in-progress count and score', draft.row.attemptStatus === 'in-progress' && draft.row.totalAnswered === 1 && draft.row.totalCorrect === 0 && draft.row.totalPossible === 1 && !draft.bank[1]);
    await submit();
    const final = await snapshot('secondSubmitted');
    check('Second completion replaces its start marker', final.bank[2].itemType === 'assessment-complete' && final.bank[2].assessmentAttemptId === restarted.bank.__assessmentAttempt.attemptId);
    check('Second final progress includes only its one answer and blank second item', final.row.attemptStatus === 'submitted' && final.row.totalAnswered === 1 && final.row.totalCorrect === 0 && final.row.totalEarned === 0 && final.row.totalPossible === 2 && final.row.scorePercent === 0);
    check('Second final reflection summary stays empty', final.reflections === null);
    check('Teacher displays the second attempt progress and score', (await teacher.getByRole('table').innerText()).includes('1 / 2') && (await teacher.getByRole('table').innerText()).includes('0 / 2 (0%)'));
    check('Learner displays the same final progress', (await student.locator('[data-assessment-submitted]').innerText()).includes('1 of 2 questions answered'));
    check('Exactly one completion was reported per attempt', final.completions === 2);
    check('Confirmed flow used no cloud response writes', await page.evaluate(() => fixture.cloudWrites === 0));
    await teacher.screenshot({ path: path.join(out, 'teacher-second-submitted.png'), animations: 'disabled' });
    await student.screenshot({ path: path.join(out, 'student-second-submitted.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 900 });
    await teacher.scrollIntoViewIfNeeded();
    check('Teacher results fit a mobile viewport', !await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    await teacher.screenshot({ path: path.join(out, 'teacher-second-mobile.png'), animations: 'disabled' });
    check('No browser runtime errors', errors.length === 0, errors);
  } catch (error) {
    failure = error.stack || String(error);
    snapshots.failure = await page.evaluate(() => window.fixture ? { snapshot: fixture.snapshot(), packets: fixture.packets, wire: fixture.wire, receipts: fixture.receipts, requests: fixture.requests } : null).catch(() => null);
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true, animations: 'disabled' });
  } finally {
    const result = { modules, passed: checks.filter(check => check.passed).length, total: checks.length, checks, errors, snapshots, coverage: 'Generated learner and teacher QuizView, actual host handler conversion, LivePolling confirmation/merging, canonical aggregation; data channel bridged locally, no WebRTC signaling or external network.', ...(failure ? { failure } : {}) };
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ passed: result.passed, total: result.total, errors, report: path.join(out, 'results.json'), ...(failure ? { failure } : {}) }, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
    if (failure) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
