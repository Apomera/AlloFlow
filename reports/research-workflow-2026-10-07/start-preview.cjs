const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const output = fs.openSync(path.join(__dirname, 'preview.stdout.log'), 'a');
const errors = fs.openSync(path.join(__dirname, 'preview.stderr.log'), 'a');
const child = spawn(process.execPath, [path.join(__dirname, 'preview.cjs')], {
  cwd: path.resolve(__dirname, '../..'), detached: true, windowsHide: true,
  stdio: ['ignore', output, errors]
});
child.unref();
fs.closeSync(output);
fs.closeSync(errors);
console.log(JSON.stringify({ pid: child.pid, status: 'starting' }));
