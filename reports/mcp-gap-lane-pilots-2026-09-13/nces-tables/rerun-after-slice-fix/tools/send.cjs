// node send.cjs <replies.json> <out.json> <prefix> [wait]
// replies.json = [{ "request_id": "<full id or -N suffix>", "file": "<file whose contents are the reply text>" }]
// Sends the batch, saves the next poll result to <out.json> (images under img/ with <prefix>), prints show.cjs.
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const [repliesFile, outFile, prefix, waitArg] = process.argv.slice(2);
const run = fs.readFileSync(path.join(here, 'run.txt'), 'utf8').trim();
const replies = JSON.parse(fs.readFileSync(path.join(here, repliesFile), 'utf8'));
// resolve "-N" suffixes against the most recent poll file
const polls = fs.readdirSync(here).filter((f) => /^req-\d+\.json$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const latest = polls.length ? JSON.parse(fs.readFileSync(path.join(here, polls[polls.length - 1]), 'utf8')) : null;
const pending = latest && latest.structuredContent ? (latest.structuredContent.pendingRequests || []) : [];
const responses = replies.map((r) => {
  let id = r.request_id;
  if (/^-\d+$/.test(id)) { const hit = pending.find((p) => p.requestId.endsWith(id)); if (!hit) throw new Error('no pending request ends with ' + id); id = hit.requestId; }
  const text = r.text !== undefined ? r.text : fs.readFileSync(path.join(here, r.file), 'utf8');
  return { request_id: id, text };
});
const batchFile = path.join(here, 'batch-' + outFile.replace(/\.json$/, '') + '.json');
fs.writeFileSync(batchFile, JSON.stringify({ run_id: run, wait_seconds: Number(waitArg) || 25, responses }));
execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', 'remediation_agent_respond_batch', '@' + batchFile, '--out', path.join(here, outFile), '--images', path.join(here, 'img'), '--prefix', prefix, '--max', '200'], { stdio: 'ignore' });
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), path.join(here, outFile), '--tail=14'], { encoding: 'utf8' }));
