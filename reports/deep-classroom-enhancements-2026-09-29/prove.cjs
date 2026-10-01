const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '../..'), scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'allo-deep-proofs-'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const host = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8'), teacher = fs.readFileSync(path.join(root, 'teacher_module.js'), 'utf8');
function change(text, from, to) { if (text.split(from).length !== 2) throw Error('Ambiguous mutation: ' + from); return text.replace(from, to); }
const cases = [
  { id: 'audio-stale-context', env: 'ALLO_ANTI_CANDIDATE', text: change(host, ' || !context.every((value, index) => value === cardAudioContextRef.current[index])', ''), test: 'tests/k5_deep_action_readiness.test.js', pattern: 'rejects changed context field 1', assertion: 'rejects changed context field 1' },
  { id: 'document-stale-generation', env: 'ALLO_ANTI_CANDIDATE', text: change(host, '(window.__alloPdfRunGen || 0) !== generation || ', ''), test: 'tests/k5_deep_action_readiness.test.js', pattern: 'rejects a changed document \\(generation\\)', assertion: 'rejects a changed document (generation)' },
  { id: 'weekly-ungraded-accuracy', env: 'ALLO_TEACHER_CANDIDATE', text: change(teacher, 'const weekGradedWords = weekWords.filter((h) => h.practiceOnly !== true && h.activity !== "letter_tracing");', 'const weekGradedWords = weekWords;'), test: 'tests/learner_progress_scope_browser.test.js', pattern: 'keeps weekly accuracy honest \\(mixed\\)', assertion: 'keeps weekly accuracy honest (mixed)' },
  { id: 'family-selector-unscoped', env: 'ALLO_TEACHER_CANDIDATE', text: change(teacher, '!selectedChild || selectedChild === child.name', 'true'), test: 'tests/learner_progress_scope_browser.test.js', pattern: 'selects real child sessions', assertion: 'selects real child sessions and labels aggregate totals honestly' },
  { id: 'progress-outside-main', env: 'ALLO_ANTI_CANDIDATE', text: fs.readFileSync(path.join(__dirname, 'before/AlloFlowANTI.txt'), 'utf8'), test: 'tests/dashboard_progress_workspace.test.js', pattern: 'places learner progress inside the main', assertion: 'places learner progress inside the main landmark' }
];
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const before = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const results = [];
const prior = fs.existsSync(path.join(__dirname, 'proof-results.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'proof-results.json'), 'utf8')) : null;
for (const item of cases.filter(item => !process.env.PROOF_ONLY || item.id === process.env.PROOF_ONLY)) {
  const candidate = path.join(scratch, item.id + '.js'), output = path.join(__dirname, 'proof-' + item.id + '.json');
  fs.writeFileSync(candidate, item.text);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', item.test, '-t', item.pattern, '--maxWorkers=1', '--testTimeout=60000', '--reporter=json', '--outputFile=' + output];
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, env: { ...process.env, [item.env]: candidate, ALLO_PROGRESS_ARTIFACTS: path.join(scratch, 'screens-' + item.id) } });
  fs.writeFileSync(path.join(__dirname, 'proof-' + item.id + '.log'), (run.stdout || '') + '\n' + (run.stderr || ''));
  const report = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : null;
  const failed = report?.testResults.flatMap(file => file.assertionResults).filter(test => test.status === 'failed') || [];
  const proved = run.status === 1 && !run.error && !run.signal && failed.length === 1 && failed[0].title === item.assertion && failed[0].failureMessages.some(message => /AssertionError|expected/.test(message)) && !failed[0].failureMessages.some(message => /Timeout.*exceeded|Test timed out/.test(message));
  results.push({ id: item.id, exit: run.status, error: run.error?.message, signal: run.signal, proved, failures: failed.map(test => ({ title: test.title, messages: test.failureMessages })), command: [process.execPath, ...args] });
  console.log(item.id + ': ' + (proved ? 'intended assertion rejected regression' : 'NOT PROVED'));
}
const after = Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const unchanged = files.every(file => before[file] === after[file]);
const combined = cases.map(item => results.find(result => result.id === item.id) || prior?.results.find(result => result.id === item.id));
fs.writeFileSync(path.join(__dirname, 'proof-results.json'), JSON.stringify({ at: new Date().toISOString(), scratch, unchanged, before, after, results: combined }, null, 2));
if (!unchanged || combined.some(result => !result?.proved)) process.exitCode = 1;
