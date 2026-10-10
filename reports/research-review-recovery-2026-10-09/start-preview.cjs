const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const child = spawn(process.execPath, [path.join(__dirname, 'preview.cjs')], {
  cwd: path.resolve(__dirname, '../..'), detached: true, windowsHide: true,
  stdio: ['ignore', fs.openSync(path.join(__dirname, 'preview.stdout.log'), 'a'), fs.openSync(path.join(__dirname, 'preview.stderr.log'), 'a')]
});
child.unref();
console.log(JSON.stringify({ pid: child.pid }));
