// Replay helper: answer pending requests whose prompt text exactly matches a prompt already
// answered in an earlier run (same document, same pipeline stage), and surface the rest.
//   node replay.cjs <run-file> <memory-prefix> <out-json> [--images dir] [--prefix p]
// Memory = every earlier <prefix>-req-*.json (prompts) joined with <prefix>-batch-*.json (replies).
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const here = __dirname;
const [runFile, memPrefix, outJson, ...rest] = process.argv.slice(2);
const opts = {};
for (let i = 0; i < rest.length; i++) { if (rest[i] === '--images') opts.images = rest[++i]; else if (rest[i] === '--prefix') opts.prefix = rest[++i]; }
const run = fs.readFileSync(runFile, 'utf8').trim();

// Build prompt -> reply memory from the earlier run's files.
const promptById = new Map(), replyById = new Map();
for (const f of fs.readdirSync(here)) {
  if (f.startsWith(memPrefix + '-req-') && f.endsWith('.json')) {
    try { for (const q of (JSON.parse(fs.readFileSync(path.join(here, f), 'utf8')).structuredContent || {}).pendingRequests || []) if (q.prompt && q.promptNextOffset == null) promptById.set(q.requestId, q.prompt); } catch (_) {}
  }
  if (f.startsWith(memPrefix + '-batch-') && f.endsWith('.json')) {
    try { for (const r of JSON.parse(fs.readFileSync(path.join(here, f), 'utf8')).responses || []) replyById.set(r.request_id, r.text); } catch (_) {}
  }
}
const memory = new Map();
for (const [id, prompt] of promptById) if (replyById.has(id)) memory.set(prompt, { reply: replyById.get(id), from: id });

const argsFile = outJson + '.args.json';
const call = (tool, args) => { fs.writeFileSync(argsFile, JSON.stringify(args)); execFileSync(process.execPath, [path.join(here, 'bridge.cjs'), 'call', tool, '@' + argsFile, '--out', outJson, '--max', '0', ...(opts.images ? ['--images', opts.images] : []), ...(opts.prefix ? ['--prefix', opts.prefix] : [])], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); return JSON.parse(fs.readFileSync(outJson, 'utf8')); };

let result = call('remediation_agent_requests', { run_id: run, wait_seconds: 25 });
for (let round = 0; round < 40; round++) {
  const sc = result.structuredContent || {};
  const pending = sc.pendingRequests || [];
  const answered = [], unknown = [];
  for (const q of pending) {
    const hit = q.prompt && q.promptNextOffset == null ? memory.get(q.prompt) : null;
    if (hit) answered.push({ request_id: q.requestId, text: hit.reply, from: hit.from }); else unknown.push(q);
  }
  console.log(`round ${round}: status=${sc.status} calls=${sc.modelCallsSoFar} pending=${pending.length} replayable=${answered.length} new=${unknown.length}` + (answered.length ? ' (' + answered.map(a => a.request_id.slice(-3) + '<-' + a.from.slice(-3)).join(' ') + ')' : ''));
  if (sc.status && sc.status !== 'running') { console.log('TERMINAL', sc.status); break; }
  if (unknown.length) { console.log('NEW PROMPTS need an answer:', unknown.map(q => q.requestId + ' kind=' + q.kind + ' chars=' + q.promptTotalChars).join(' | ')); break; }
  if (!answered.length) { result = call('remediation_agent_requests', { run_id: run, wait_seconds: 30 }); continue; }
  result = call('remediation_agent_respond_batch', { run_id: run, wait_seconds: 28, responses: answered.map(({ request_id, text }) => ({ request_id, text })) });
}
fs.writeFileSync(outJson, JSON.stringify(result, null, 2));
