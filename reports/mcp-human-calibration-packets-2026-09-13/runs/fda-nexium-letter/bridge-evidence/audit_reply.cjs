// Answer every pending vision-audit request in a saved poll with the same audit JSON (the three
// auditor prompts differ only in wording), then poll and show the next state.
// Usage: node audit_reply.cjs <run-file> <audit.json> <state-in> <state-out> <img-prefix> <img-dir>
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const [runFile, auditFile, stateIn, stateOut, prefix, imgDir] = process.argv.slice(2);
const run = fs.readFileSync(path.join(here, runFile), 'utf8').trim();
const audit = JSON.parse(fs.readFileSync(path.join(here, auditFile), 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(here, stateIn), 'utf8'));
const pending = (state.structuredContent.pendingRequests || []).filter((q) => q.kind === 'vision' && /accessibility auditor/.test(q.prompt));
if (!pending.length) { console.log('no pending vision audits'); process.exit(0); }
const args = { run_id: run, wait_seconds: 28, responses: pending.map((q) => ({ request_id: q.requestId, text: JSON.stringify(audit) })) };
const argsFile = path.join(here, prefix + '-args.json');
fs.writeFileSync(argsFile, JSON.stringify(args));
const out = path.join(here, stateOut);
execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', 'remediation_agent_respond_batch', '@' + argsFile, '--out', out, '--images', path.join(here, imgDir), '--prefix', prefix, '--max', '200'], { stdio: 'ignore' });
console.log('answered', pending.map((q) => q.requestId.slice(-4)).join(','));
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=6'], { encoding: 'utf8' }).split('\n').slice(0, 30).join('\n'));
