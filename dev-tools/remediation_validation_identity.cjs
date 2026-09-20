'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

// Hash declared inputs, including whole fixture trees. Missing paths are retained
// so deletion during a run is a recorded change, not a lost diagnostic.
function snapshotInputs(root, inputs) {
  const hashes = {};
  function visit(relative) {
    const absolute = path.resolve(root, relative);
    const key = path.relative(root, absolute).replace(/\\/g, '/');
    if (!key || key.startsWith('../') || path.isAbsolute(key)) throw new Error('Validation input must be inside the workspace: ' + relative);
    let stat;
    try { stat = fs.lstatSync(absolute); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      hashes[key] = null; return;
    }
    if (stat.isSymbolicLink()) throw new Error('Symlink validation input is unsupported: ' + key);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) visit(key + '/' + name);
    } else if (stat.isFile()) hashes[key] = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    else throw new Error('Unsupported validation input: ' + key);
  }
  for (const input of inputs) visit(input);
  return Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b)));
}

function captureIdentity(root, inputs) {
  const version = name => JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', shell: false, timeout: 10000, windowsHide: true });
  const browsers = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/playwright-core/browsers.json'), 'utf8')).browsers
    .filter(browser => browser.name.startsWith('chromium')).map(({ name, revision, browserVersion }) => ({ name, revision, browserVersion }));
  return {
    capturedAt: new Date().toISOString(),
    gitHead: git.status === 0 ? git.stdout.trim() : null,
    tools: { node: process.version, platform: process.platform, arch: process.arch, vitest: version('vitest'), playwright: version('@playwright/test'), jsdom: version('jsdom'), configuredBrowsers: browsers },
    inputSha256: snapshotInputs(root, inputs),
  };
}

function compareIdentity(before, after) {
  const a = before.inputSha256, b = after.inputSha256;
  return {
    changedInputs: [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(file => a[file] !== b[file]).sort(),
    toolsChanged: JSON.stringify(before.tools) !== JSON.stringify(after.tools),
    gitHeadChanged: !!(before.gitHead && after.gitHead && before.gitHead !== after.gitHead),
    gitHeadVerified: !!(before.gitHead && after.gitHead),
  };
}
module.exports = { snapshotInputs, captureIdentity, compareIdentity };
