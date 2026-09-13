// Post one reply (text read from a file) to one pending request of the current ED-guide run, then
// show the next state. Usage: node reply_one.cjs <run-file> <request_id> <reply-text-file> <out-json> [prefix]
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const [runFile, requestId, replyFile, outName, prefix] = process.argv.slice(2);
const run = fs.readFileSync(path.join(here, runFile), 'utf8').trim();
const text = fs.readFileSync(path.join(here, replyFile), 'utf8');
const args = { run_id: run, wait_seconds: 28, responses: [{ request_id: requestId, text }] };
const argsFile = path.join(here, 'reply-args.json');
fs.writeFileSync(argsFile, JSON.stringify(args));
const out = path.join(here, outName);
execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', 'remediation_agent_respond_batch', '@' + argsFile, '--out', out, '--images', path.join(here, process.argv[7] || 'edg-images'), '--prefix', prefix || 'ex', '--max', '200'], { stdio: 'ignore' });
console.log('replied to', requestId.slice(-4), 'with', text.length, 'chars');
console.log(execFileSync(process.execPath, [path.join(here, 'show.cjs'), out, '--tail=8'], { encoding: 'utf8' }).split('\n').slice(0, 60).join('\n'));
