const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const log = fs.openSync(path.join(__dirname, 'preview.log'), 'a');
const child = spawn(process.execPath, [path.join(__dirname, 'preview.cjs')], { detached: true, windowsHide: true, stdio: ['ignore', log, log] });
child.unref();
console.log(JSON.stringify({ startedPid: child.pid }));
