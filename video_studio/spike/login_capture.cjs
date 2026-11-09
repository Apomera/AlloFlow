'use strict';
/*
 * login_capture.cjs - SPIKE (2026-11-08)
 *
 * Save a browser login ONCE, by hand, so tutorial workflows never contain or type a password.
 *
 *   node compile_tutorial.cjs --login=easycbm --url=https://app.easycbm.com/
 *
 * A visible browser opens on the site. Log in yourself (SSO, MFA and CAPTCHAs all just work), get to the
 * page a tutorial should start from, then come back to the terminal and press Enter. The session (cookies
 * and local storage) is saved to auth/<name>.json. A workflow, or `--auth=easycbm`, then starts already
 * signed in.
 *
 * That file IS the login: anyone who has it is signed in as you until the session expires. So:
 *   - it is only ever written under auth/, which .gitignore excludes (this folder is committed to git);
 *   - it refuses to write if git would NOT ignore the file;
 *   - use a DEMO or SANDBOX account, never a real teacher's or student's, and delete the file when done.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const L = require('./compile_lib.cjs');

// 0 = ignored by git, 1 = NOT ignored, 128 = not a git repository (a copy of the folder elsewhere).
function gitIgnoreStatus(file, cwd) {
  const r = spawnSync('git', ['check-ignore', '-q', '--', file], { cwd, encoding: 'utf8' });
  if (r.error) return 128;
  return r.status;
}

function waitForEnter(prompt) {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.once('data', () => { process.stdin.pause(); resolve(); });
  });
}

/**
 * @param {object} o
 * @param {string} o.url        https/http page to open (not file:)
 * @param {string} o.name       saved-login name, e.g. "easycbm"
 * @param {string} o.spikeDir   folder that holds auth/
 * @param {object} o.chromium   playwright's chromium
 * @param {string} [o.browser]  msedge | chrome | chromium (default msedge)
 * @param {boolean} [o.headless] false for a person; true only in tests
 * @param {Function} [o.until]  resolves when the person is done (default: press Enter in the terminal)
 * @param {Function} [o.onPage] test hook: receives the page after it loads
 */
async function captureLogin(o) {
  const log = o.log || (m => process.stdout.write(m + '\n'));
  if (!/^https?:\/\//i.test(String(o.url || ''))) throw new Error('--url must be an http(s) address (got ' + L.redactUrl(o.url) + ')');
  const statePath = L.authStatePath(o.spikeDir, o.name); // throws on a bad name
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  // The guard that matters: never write a live session where git could pick it up.
  const ig = gitIgnoreStatus(statePath, o.spikeDir);
  if (ig === 1) throw new Error('Refusing to save a login: git does not ignore ' + statePath + '. Add "auth/" to video_studio/spike/.gitignore first.');
  if (ig === 128) log('NOTE: this folder is not inside a git repository, so no ignore check was possible. Keep ' + statePath + ' out of any repository.');

  const launchOpts = Object.assign({ headless: o.headless === true }, (o.browser || 'msedge') === 'chromium' ? {} : { channel: o.browser || 'msedge' });
  const browser = await o.chromium.launch(launchOpts);
  try {
    const ctx = await browser.newContext(o.headless === true ? { viewport: { width: 1280, height: 720 } } : { viewport: null });
    const page = await ctx.newPage();
    await page.goto(o.url, { waitUntil: 'load', timeout: 60000 });
    if (typeof o.onPage === 'function') await o.onPage(page, ctx);
    log('A browser is open on ' + L.redactUrl(o.url) + '.');
    log('Log in with a DEMO or SANDBOX account, then go to the page the tutorial should start from.');
    await (typeof o.until === 'function' ? o.until() : waitForEnter('When you are signed in, press Enter here to save the login... '));
    const state = await ctx.storageState();
    const tmp = statePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(tmp, statePath);
    const result = { statePath, cookies: (state.cookies || []).length, origins: (state.origins || []).length };
    log('Saved login "' + o.name + '" (' + result.cookies + ' cookies, ' + result.origins + ' sites with stored data) to ' + statePath);
    log('That file is your session: do not share it, and delete it when the tutorial is done.');
    return result;
  } finally {
    await browser.close();
  }
}

module.exports = { captureLogin, gitIgnoreStatus };
