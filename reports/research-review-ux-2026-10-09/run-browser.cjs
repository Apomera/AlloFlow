const path = require('node:path');
const { spawn } = require('node:child_process');

async function run() {
  const preview = spawn(process.execPath, [path.join(__dirname, 'preview.cjs')], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'inherit']
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Preview startup timed out')), 30000);
      preview.once('error', error => { clearTimeout(timer); reject(error); });
      preview.once('exit', code => { clearTimeout(timer); reject(new Error('Preview exited: ' + code)); });
      preview.stdout.once('data', data => { clearTimeout(timer); process.stdout.write(data); resolve(); });
    });
    process.exitCode = await new Promise((resolve, reject) => {
      const browser = spawn(process.execPath, [path.join(__dirname, 'browser-flow.cjs')], {
        windowsHide: true, stdio: 'inherit'
      });
      browser.once('error', reject);
      browser.once('exit', code => resolve(code === 0 ? 0 : 1));
    });
  } finally {
    preview.kill();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
