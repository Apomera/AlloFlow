const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const { executeValidation } = require(path.join(root, 'dev-tools/remediation_validation.cjs'));
const commands = [];
const reportDir = path.join(__dirname, 'validation');
function run(cli, args, extraEnv, logFile) {
  const actual = args.map(arg => arg === '--maxWorkers=2' ? '--maxWorkers=1' : arg === '--workers=2' ? '--workers=1' : arg);
  commands.push({ cli, args: actual, workers: 1 });
  fs.writeFileSync(path.join(__dirname, 'validation-commands.json'), JSON.stringify(commands, null, 2) + '\n');
  const log = fs.openSync(logFile, 'w');
  let result;
  try { result = spawnSync(process.execPath, [path.join(root, cli), ...actual], { cwd: root, windowsHide: true, shell: false, stdio: ['ignore', log, log], env: { ...process.env, ...extraEnv } }); }
  finally { fs.closeSync(log); }
  if (result.error || result.status !== 0) {
    const error = new Error('Validation command failed: ' + cli + ' (exit ' + result.status + ') ' + (result.error?.message || ''));
    error.exitCode = result.status; error.signal = result.signal; throw error;
  }
  return { exitCode: result.status, signal: result.signal };
}
try { executeValidation({ reportDir, run }); }
catch (error) { console.error(error.message); process.exitCode = 1; }
