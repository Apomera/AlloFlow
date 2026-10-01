const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const sourcePath = 'personas_source.jsx';
const mutantPath = 'tests/report_generation_recovery_interview.mutant-source.jsx';
const reportDir = 'reports/report-fixes-2026-09-30';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const source = fs.readFileSync(sourcePath, 'utf8');
const before = sha(source);
if (fs.existsSync(mutantPath)) throw new Error('Refusing to replace existing mutation scratch file');
const mutations = [
  {
    name: 'generic-no-attribution-message',
    pattern: /let recovery = candidateRecoveryText\(t, key, fallback\);/,
    replacement: "let recovery = 'Failed to generate characters.';",
    test: 'explains the Canvas no-attribution refusal without publishing',
  },
  {
    name: 'publish-explicitly-ungrounded-candidates',
    pattern: /if \(explicitSearchGrounding && !hasAttributableCandidateSearchSource\(explicitSearchGrounding.value\)\) \{/,
    replacement: 'if (false) {',
    test: 'refuses an explicit current search envelope',
  },
];
const evidence = [];
fs.mkdirSync(reportDir, { recursive: true });
try {
  for (const mutation of mutations) {
    if (!mutation.pattern.test(source)) throw new Error('Mutation anchor missing: ' + mutation.name);
    fs.writeFileSync(mutantPath, source.replace(mutation.pattern, mutation.replacement));
    const outputPath = path.join(reportDir, 'interview-mutation-' + mutation.name + '.json');
    const result = cp.spawnSync(process.execPath, [
      'node_modules/vitest/vitest.mjs', 'run', 'tests/report_generation_recovery_interview.test.js',
      '--config', 'tests/report_generation_recovery_interview.vitest.config.js',
      '--pool=threads', '--maxWorkers=1', '-t', mutation.test,
      '--reporter=json', '--outputFile=' + outputPath,
    ], { encoding: 'utf8', env: { ...process.env, REPORT_INTERVIEW_PERSONA_SOURCE: path.resolve(mutantPath) } });
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const failed = report.testResults.flatMap(file => file.assertionResults).filter(test => test.status === 'failed');
    evidence.push({ name: mutation.name, exitCode: result.status, failedTests: failed.map(test => ({ name: test.fullName, failureMessages: test.failureMessages })), detected: result.status !== 0 && failed.length > 0 });
    if (result.error) throw result.error;
    if (!evidence.at(-1).detected) throw new Error('Mutation was not detected: ' + mutation.name);
    console.log(mutation.name + ': expected assertion failures detected (' + failed.length + ')');
  }
} finally {
  if (fs.existsSync(mutantPath)) fs.unlinkSync(mutantPath);
  const after = sha(fs.readFileSync(sourcePath));
  fs.writeFileSync(path.join(reportDir, 'interview-mutation-validation.json'), JSON.stringify({ completedAt: new Date().toISOString(), sourceSHA256Before: before, sourceSHA256After: after, realSourceUnchanged: before === after, mutations: evidence, scratchRemoved: !fs.existsSync(mutantPath) }, null, 2) + '\n');
  if (before !== after) throw new Error('Real persona source changed during mutation validation');
}
