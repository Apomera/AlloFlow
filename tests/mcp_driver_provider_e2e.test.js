// Behavioral e2e for the remediation driver's provider transport — a REAL remediate run in
// headless Chromium with ALLOFLOW_MCP_MODEL_BACKEND pointing at a SCRIPTED loopback
// OpenAI-style server (LM Studio shape). The sibling tests/mcp_driver_scripted_e2e.test.js
// proves the Gemini transport through the same page bridge; this one proves that the
// __mcpGeminiText / __mcpGeminiVision exposures route through the provider transport, that
// rendered pages travel as image_url parts, and that the pipeline's verdict machinery is
// indifferent to who answered.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

vi.setConfig({ testTimeout: 900000, hookTimeout: 60000 });

const requireCjs = createRequire(import.meta.url);

let server = null;
let driver = null;
const calls = { total: 0, text: 0, vision: 0, imageParts: 0, probes: 0 };
const seenModels = new Set();
const seenPaths = new Set();

// Same contract as the scripted Gemini e2e: the replies must be what the pipeline's own
// prompts instruct a model to emit, or the strict audit parsers discard them.
const AUDIT_PDF = JSON.stringify({
  score: 55, summary: 'scripted PDF audit', confidence: 'high', documentLanguage: 'en',
  pageCount: 1, hasSearchableText: true, hasImages: true, hasTables: false, hasForms: false,
  critical: [],
  serious: [{ ruleId: 'image-alt', claimKind: 'absence', issue: 'Images without alternative text', wcag: '1.1.1', count: 1, location: 'page 1' }],
  moderate: [], minor: [], passes: ['document has a title'],
});
const AUDIT_HTML = JSON.stringify({
  score: 70, summary: 'scripted weak audit',
  issues: [{ ruleId: 'heading-order', claimKind: 'structure', issue: 'Heading structure is unclear', wcag: '1.3.1', count: 1 }],
  passes: ['lang present'],
});

function dispatch(prompt) {
  calls.total++;
  if (/Reply with exactly: OK/.test(prompt)) { calls.probes++; return 'OK'; }
  if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return AUDIT_PDF;
  if (/Audit this HTML/i.test(prompt)) return AUDIT_HTML;
  if (/Return ONLY a JSON array/i.test(prompt)) {
    return JSON.stringify([
      { type: 'h1', text: 'Photosynthesis Study Guide', id: 'photosynthesis-study-guide' },
      { type: 'p', text: 'Plants convert light energy into chemical energy stored as glucose.' },
    ]);
  }
  if (/Extract ALL text content/i.test(prompt)) return '# Photosynthesis Study Guide\nPlants convert light energy into chemical energy stored as glucose.';
  return '<p>Plants convert light energy into chemical energy stored as glucose.</p>';
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seenPaths.add(req.url);
      let prompt = '';
      try {
        const j = JSON.parse(body);
        seenModels.add(j.model);
        const content = (((j.messages || [])[0] || {}).content);
        if (Array.isArray(content)) {
          calls.vision++;
          calls.imageParts += content.filter((part) => part && part.type === 'image_url').length;
          prompt = content.filter((part) => part && part.type === 'text').map((part) => part.text).join('\n');
        } else {
          calls.text++;
          prompt = String(content || '');
        }
      } catch (_) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: dispatch(prompt) }, finish_reason: 'stop' }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.ALLOFLOW_MCP_MODEL_BACKEND = 'lmstudio';
  process.env.ALLOFLOW_MCP_MODEL_BASE = 'http://127.0.0.1:' + server.address().port;
  process.env.ALLOFLOW_MCP_MODEL_NAME = 'scripted-text-model';
  process.env.ALLOFLOW_MCP_VISION_MODEL = 'scripted-vision-model';
  process.env.ALLOFLOW_MCP_NO_KEY_FILES = '1';
  delete process.env.GEMINI_API_KEY;
  const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));
  driver = Driver.createDriver({ log: () => {} });
});

afterAll(async () => {
  for (const name of ['ALLOFLOW_MCP_MODEL_BACKEND', 'ALLOFLOW_MCP_MODEL_BASE', 'ALLOFLOW_MCP_MODEL_NAME', 'ALLOFLOW_MCP_VISION_MODEL', 'ALLOFLOW_MCP_NO_KEY_FILES']) delete process.env[name];
  if (driver) await driver.close();
  if (server) server.close();
});

describe('driver behavioral e2e (provider transport, scripted OpenAI-style server)', () => {
  it('remediates the fixture with no Gemini key, sending rendered pages as image_url parts to the vision model', async () => {
    const out = await driver.remediate({
      filePath: resolve(process.cwd(), 'tests/e2e/artifacts/remediation-e2e.source.pdf'),
      targetScore: 100, fixPasses: 1, polishPasses: 0, taggedPdf: false,
      autoContinue: false, visionMode: 'images',
    });

    expect(typeof out.accessibleHtml).toBe('string');
    expect(out.accessibleHtml).toMatch(/Photosynthesis|light energy/i);
    expect(typeof out.beforeScore).toBe('number');
    expect(out.beforeScore).toBeGreaterThan(0);
    expect(out.verdict).toBeTruthy();
    expect(out.verificationHtmlBound).toBe(true);

    // Every model call reached the loopback server on the OpenAI-style route, none went to Gemini.
    expect(calls.total).toBeGreaterThan(0);
    expect([...seenPaths]).toEqual(['/v1/chat/completions']);
    expect(seenModels.has('scripted-text-model')).toBe(true);
    // The document audit went out as a vision call carrying the rendered page(s) as image parts,
    // addressed to the configured vision model rather than the text model.
    expect(calls.vision).toBeGreaterThan(0);
    expect(calls.imageParts).toBeGreaterThan(0);
    expect(seenModels.has('scripted-vision-model')).toBe(true);
    expect(calls.text).toBeGreaterThan(0);
  });
});
