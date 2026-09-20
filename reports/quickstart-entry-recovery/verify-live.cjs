'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const git = args => execFileSync('git', args, { maxBuffer: 30000000 });
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const commit = git(['rev-parse', 'HEAD']).toString().trim();
  const appFiles = git(['ls-tree', '-r', '--name-only', 'HEAD', 'app/']).toString().trim().split(/\r?\n/);
  const paths = [...new Set(['AlloFlowANTI.txt', 'quickstart_module.js', 'view_canvas_recovery_dialog_module.js', ...appFiles])];
  const results = [];
  for (const file of paths) {
    const expected = sha256(git(['show', 'HEAD:' + file]));
    try {
      const response = await fetch('https://alloflow-cdn.pages.dev/' + file + '?quickstart_fix=' + commit, { signal: AbortSignal.timeout(30000) });
      const actual = sha256(Buffer.from(await response.arrayBuffer()));
      results.push({ path: file, status: response.status, expected, actual, pass: response.status === 200 && expected === actual });
    } catch (error) { results.push({ path: file, expected, pass: false, error: error.message }); }
  }
  const report = { checkedAt: new Date().toISOString(), commit, pass: results.every(result => result.pass), results };
  const destination = report.pass ? 'live-verification.json' : 'live-verification-pending.json';
  fs.writeFileSync(path.join(__dirname, destination), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ commit, pass: report.pass, checked: results.length, pending: results.filter(result => !result.pass).map(result => result.path) }));
  process.exitCode = report.pass ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
