// The agent bridge must never hand the client a raw PDF as a vision part.
//
// The pipeline's default is to attach the whole document to a vision call —
// right for Gemini, which accepts PDFs natively, but wrong for this transport:
// a single inline part over AGENT_IMAGE_BYTES_CAP (4MB) is dropped with reason
// "single-image-exceeds-response-cap" and there is NO chunked-fetch path for it,
// unlike prompts, which page via prompt_offset. Every PDF above that size
// therefore reached the answering model as an audit prompt with no document
// attached — and the run did not fail, it just invited the model to invent
// findings, which is precisely the fabrication the honesty gate exists to catch.
//
// The fix switches the bridge lane to visionMode 'images' so pages arrive as
// individually-sized PNGs. This suite pins the property that matters: the part
// the client is offered is a page image, not a PDF.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

vi.setConfig({ testTimeout: 600000, hookTimeout: 120000 });

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs');
const FIXTURE = resolve(process.cwd(), 'tests/e2e/artifacts/remediation-e2e.source.pdf');

const tmp = mkdtempSync(join(tmpdir(), 'alloflow-bridge-vision-'));
const stateDir = join(tmp, 'job-state');
const outDir = join(tmp, 'out');

let child;
let nextId = 1;
const pending = new Map();
let buffer = '';

function onStdout(chunk) {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { continue; }
    if (msg.id === undefined) continue;
    const resolver = pending.get(msg.id);
    if (resolver) { pending.delete(msg.id); resolver(msg); }
  }
}

function request(method, params, timeoutMs = 180000) {
  const id = nextId++;
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(id); rejectP(new Error(`timeout waiting for ${method}`)); }, timeoutMs);
    pending.set(id, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function callTool(name, args, timeoutMs) {
  const r = await request('tools/call', { name, arguments: args || {} }, timeoutMs);
  if (r.error) throw new Error(name + ': ' + JSON.stringify(r.error));
  const content = r.result && r.result.content;
  const text = Array.isArray(content) ? content.filter((c) => c.type === 'text').map((c) => c.text).join('\n') : '';
  const images = Array.isArray(content) ? content.filter((c) => c.type === 'image') : [];
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { json, images, isError: !!(r.result && r.result.isError) };
}

beforeAll(async () => {
  mkdirSync(stateDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const env = { ...process.env, ALLOFLOW_MCP_STATE_DIR: stateDir, ALLOFLOW_MCP_NO_KEY_FILES: '1' };
  delete env.GEMINI_API_KEY; // the bridge lane must need no key at all
  delete env.GOOGLE_API_KEY;
  child = spawn(process.execPath, [SERVER], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], env });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bridge-vision', version: '0' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
});

afterAll(() => {
  if (child) child.kill();
  rmSync(tmp, { recursive: true, force: true });
});

describe('agent bridge: vision requests carry page images, not the source PDF', () => {
  it('offers rendered pages the client can actually fetch', async () => {
    const start = await callTool('pdf_remediate_agent_start', { file_path: FIXTURE, output_dir: outDir, tagged_pdf: false }, 180000);
    const runId = start.json && start.json.runId;
    expect(runId, 'agent run did not start').toBeTruthy();

    try {
      let vision = null;
      // Rendering happens before the pipeline page exists, so the first vision
      // request can take a while to surface on a cold Chromium.
      for (let i = 0; i < 30 && !vision; i++) {
        const poll = await callTool('remediation_agent_requests', { run_id: runId, wait_seconds: 10, include_images: false }, 120000);
        const state = poll.json || {};
        if (['completed', 'failed', 'cancelled'].includes(String(state.status))) break;
        vision = (state.pendingRequests || []).find((r) => r.kind === 'vision') || null;
      }
      expect(vision, 'no vision request was ever published').toBeTruthy();

      const parts = vision.images || [];
      expect(parts.length, 'vision request carried no inline parts').toBeGreaterThan(0);

      // The regression: a part typed application/pdf is the whole document, and
      // above the cap it is unreachable. Pages are images.
      for (const part of parts) {
        expect(part.mimeType, 'vision part must not be a raw PDF').not.toBe('application/pdf');
        expect(part.mimeType).toMatch(/^image\//);
        expect(part.bytes).toBeLessThan(4 * 1024 * 1024);
      }

      // And the client can actually retrieve one as image content.
      const fetched = await callTool('remediation_agent_requests', {
        run_id: runId, request_id: vision.requestId, include_images: true, image_index: 0,
      }, 120000);
      expect(fetched.images.length, 'no image content block came back').toBe(1);
      expect(fetched.images[0].mimeType).toMatch(/^image\//);
      expect(Buffer.from(fetched.images[0].data, 'base64').length).toBeGreaterThan(0);
    } finally {
      await callTool('remediation_agent_cancel', { run_id: runId }, 60000).catch(() => {});
    }
  });
});
