const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const target = 'generate_dispatcher_source.jsx';
const original = fs.readFileSync(target, 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const anchor = '// Keep the selected saved resource until a usable replacement is ready.';
if (!original.includes(anchor)) throw new Error('Mutation anchor absent');
const candidate = 'tests/report_generation_recovery.mutant-source.jsx';
if (fs.existsSync(candidate)) throw new Error('Mutation path already exists');
fs.writeFileSync(candidate, original.replace(anchor, "if (switchView) { setGeneratedContent(null); setActiveView('input'); }"));
try {
  const result = cp.spawnSync(process.execPath, [
    'node_modules/vitest/vitest.mjs', 'run', 'tests/report_generation_recovery.test.js',
    '--maxWorkers=1', '--testNamePattern=keeps last-good content',
  ], { encoding: 'utf8', env: { ...process.env, REPORT_GENERATION_SOURCE_PATH: candidate } });
  const output = (result.stdout || '') + (result.stderr || '');
  process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 1 || !output.includes('keeps last-good content') || !output.includes('expected null')) {
    throw new Error('The intended blank-draft mutation was not detected by its preservation assertion');
  }
  console.log('MUTATION DETECTED: old blank-draft behavior fails the preservation assertion.');
} finally {
  fs.unlinkSync(candidate);
  if (hash(fs.readFileSync(target, 'utf8')) !== hash(original)) throw new Error('Owned source changed during mutation verification');
  console.log('Owned source re-read with identical hash; standalone mutation candidate removed.');
}
