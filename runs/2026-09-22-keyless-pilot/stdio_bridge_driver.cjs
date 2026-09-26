// Keyless agent-bridge driver over STDIO: the connector runs as a child process, so no network
// port is opened. Prompts go out as files; replies come back as files.
//   node driver.cjs <input.pdf> <workDir>
//   <workDir>/outbox/<requestId>/prompt.txt, meta.json, image-<i>.<ext>   (written by this driver)
//   <workDir>/inbox/<requestId>.txt                                       (written by the answerer)
//   <workDir>/status.json, driver.log, result.json, server.err.log
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const REPO = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const [input, work] = process.argv.slice(2);
if (!input || !work) { console.error('usage: driver.cjs <input.pdf> <workDir>'); process.exit(2); }
for (const d of ['outbox', 'inbox', 'answered', 'output', 'state']) fs.mkdirSync(path.join(work, d), { recursive: true });
const log = line => fs.appendFileSync(path.join(work, 'driver.log'), new Date().toISOString() + ' ' + line + String.fromCharCode(10));
const env = { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: path.join(work, 'state'), ALLOFLOW_MCP_VERBOSE: '1', ALLOFLOW_MCP_HEADFUL: '0' };
for (const k of Object.keys(env)) if (/API_KEY$|API_TOKEN$/.test(k)) delete env[k];
delete env.ALLOFLOW_MCP_ENV_PATH; delete env.ALLOFLOW_MCP_MODEL_BACKEND;
const child = spawn(process.execPath, ['desktop/mcp/alloflow-remediation-mcp-stdio.cjs'], { cwd: REPO, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
const errLog = fs.createWriteStream(path.join(work, 'server.err.log'));
child.stderr.pipe(errLog);
let buffer = '', nextId = 1;
const waiting = new Map();
child.stdout.on('data', chunk => {
  buffer += chunk.toString('utf8');
  let nl;
  while ((nl = buffer.indexOf(String.fromCharCode(10))) >= 0) {
    const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
    if (!line.trim()) continue;
    let msg; try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id !== undefined && waiting.has(msg.id)) { const w = waiting.get(msg.id); waiting.delete(msg.id); w(msg); }
  }
});
child.on('exit', code => { log('server exited ' + code); fs.writeFileSync(path.join(work, 'status.json'), JSON.stringify({ status: 'server-exited', code }, null, 2)); process.exit(1); });
const rpc = (method, params) => new Promise(resolve => { const id = nextId++; waiting.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + String.fromCharCode(10)); });
async function call(name, args) {
  const msg = await rpc('tools/call', { name, arguments: args });
  if (msg.error) throw new Error(name + ' rpc error: ' + JSON.stringify(msg.error).slice(0, 500));
  const result = msg.result || {};
  let data = result.structuredContent;
  if (!data) { const text = (result.content || []).filter(c => c.type === 'text').map(c => c.text).join(String.fromCharCode(10)); try { data = JSON.parse(text); } catch (_) { data = { text }; } }
  if (result.isError) throw new Error(name + ' tool error: ' + JSON.stringify(data).slice(0, 800));
  return { data, content: result.content || [] };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const extOf = mime => /png/.test(mime || '') ? 'png' : /webp/.test(mime || '') ? 'webp' : 'jpg';
function saveImages(content, requestId, dir) {
  let n = 0;
  for (const block of content) {
    if (block.type !== 'image' || !block._meta || block._meta.alloflowRequestId !== requestId) continue;
    fs.writeFileSync(path.join(dir, 'image-' + block._meta.alloflowImageIndex + '.' + extOf(block.mimeType)), Buffer.from(block.data, 'base64')); n++;
  }
  return n;
}
(async () => {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'r2-stdio-bridge', version: '1' } });
  log('initialized ' + JSON.stringify(init.result && init.result.serverInfo));
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + String.fromCharCode(10));
  const startArgs = { file_path: input, output_dir: path.join(work, 'output'), max_run_minutes: 170, validate_ua: true };
  const started = await call('pdf_remediate_agent_start', startArgs);
  fs.writeFileSync(path.join(work, 'start.json'), JSON.stringify(started.data, null, 2));
  const runId = started.data.runId || started.data.run_id;
  log('started run ' + runId);
  if (!runId) throw new Error('no runId in ' + JSON.stringify(started.data).slice(0, 500));
  const seen = new Set();
  for (;;) {
    const polled = await call('remediation_agent_requests', { run_id: runId, wait_seconds: 5, include_images: true });
    const view = polled.data;
    const pending = view.pendingRequests || [];
    for (const p of pending) {
      const dir = path.join(work, 'outbox', p.requestId);
      if (!seen.has(p.requestId)) {
        fs.mkdirSync(dir, { recursive: true });
        let prompt = p.prompt, offset = p.promptNextOffset;
        while (offset !== null && offset !== undefined) {
          const page = await call('remediation_agent_requests', { run_id: runId, request_id: p.requestId, prompt_offset: offset, include_images: false });
          const entry = (page.data.pendingRequests || [])[0];
          prompt += entry.prompt; offset = entry.promptNextOffset;
        }
        let saved = saveImages(polled.content, p.requestId, dir);
        for (let i = 0; i < (p.imageCount || 0); i++) {
          if (fs.readdirSync(dir).some(f => f.startsWith('image-' + i + '.'))) continue;
          const one = await call('remediation_agent_requests', { run_id: runId, request_id: p.requestId, image_index: i, include_images: true });
          saved += saveImages(one.content, p.requestId, dir);
        }
        fs.writeFileSync(path.join(dir, 'prompt.txt'), prompt);
        fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ requestId: p.requestId, kind: p.kind, imageCount: p.imageCount, imagesSaved: saved, promptChars: prompt.length, publishedAt: new Date().toISOString() }, null, 2));
        seen.add(p.requestId);
        log('published ' + p.requestId + ' kind=' + p.kind + ' chars=' + prompt.length + ' images=' + saved + '/' + (p.imageCount || 0));
      }
    }
    fs.writeFileSync(path.join(work, 'status.json'), JSON.stringify({ at: new Date().toISOString(), runId, status: view.status, stage: view.stage || view.phase || null,
      pending: pending.map(p => ({ requestId: p.requestId, kind: p.kind, ageSeconds: p.ageSeconds })), note: view.note, error: view.error || null }, null, 2));
    const replies = [];
    for (const p of pending) {
      const file = path.join(work, 'inbox', p.requestId + '.txt');
      if (fs.existsSync(file)) replies.push({ request_id: p.requestId, text: fs.readFileSync(file, 'utf8'), file });
    }
    if (replies.length) {
      try {
        const res = await call('remediation_agent_respond_batch', { run_id: runId, wait_seconds: 0, responses: replies.map(r => ({ request_id: r.request_id, text: r.text })) });
        for (const r of replies) fs.renameSync(r.file, path.join(work, 'answered', r.request_id + '.txt'));
        log('answered ' + replies.map(r => r.request_id).join(',') + ' -> ' + JSON.stringify(res.data).slice(0, 300));
      } catch (e) { log('respond failed: ' + e.message); fs.writeFileSync(path.join(work, 'respond-error.txt'), e.message); }
    }
    if (['completed', 'failed', 'cancelled', 'error', 'interrupted'].includes(view.status)) {
      fs.writeFileSync(path.join(work, 'result.json'), JSON.stringify(view, null, 2));
      log('run finished: ' + view.status);
      child.kill(); process.exit(0);
    }
    await sleep(1500);
  }
})().catch(e => { log('driver error: ' + (e.stack || e.message)); fs.writeFileSync(path.join(work, 'driver-error.txt'), String(e.stack || e)); child.kill(); process.exit(1); });
