// Behavioral e2e for finding 6 of the 2026-09-13 gap-lane pilot: a large PDF with a page_range
// must be audited in slices that stay inside the range, and each image-mode slice call must
// carry only the rendered pages of that slice. A 24-page PDF (padded past the pipeline's
// page-count probe threshold) is generated on the fly; a scripted OpenAI-style loopback server
// answers every model call and records what each vision call carried.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

vi.setConfig({ testTimeout: 900000, hookTimeout: 120000 });

const requireCjs = createRequire(import.meta.url);

// A minimal, valid multi-page PDF. `padBytes` of a comment stream push the file over the
// pipeline's page-count probe threshold (1500 KB) so the >20-page rule routes it to slices.
function buildPdf(pageCount, padBytes) {
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalog = add(null);
  const pagesObj = add(null);
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  for (let i = 1; i <= pageCount; i++) {
    const text = `BT /F1 24 Tf 72 720 Td (Page ${i} of ${pageCount}) Tj ET`;
    const content = add(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  const pad = 'x'.repeat(padBytes);
  add(`<< /Length ${pad.length} >>\nstream\n${pad}\nendstream`);
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => id + ' 0 R').join(' ')}] /Count ${pageCount} >>`;
  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const AUDIT_PDF = JSON.stringify({
  score: 55, summary: 'scripted PDF audit', confidence: 'high', documentLanguage: 'en',
  pageCount: 4, hasSearchableText: true, hasImages: false, hasTables: false, hasForms: false,
  critical: [], serious: [{ ruleId: 'image-alt', claimKind: 'absence', issue: 'Images without alternative text', wcag: '1.1.1', count: 1, location: 'page 1' }],
  moderate: [], minor: [], passes: ['document has a title'],
});
const AUDIT_HTML = JSON.stringify({
  score: 70, summary: 'scripted weak audit',
  issues: [{ ruleId: 'heading-order', claimKind: 'structure', issue: 'Heading structure is unclear', wcag: '1.3.1', count: 1 }],
  passes: ['lang present'],
});

let server = null;
let driver = null;
let scratch = null;
const visionCalls = []; // { window, imageCount, noteMatch }
const textCalls = [];

function dispatch(prompt) {
  if (/Reply with exactly: OK/.test(prompt)) return 'OK';
  if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return AUDIT_PDF;
  if (/Audit this HTML/i.test(prompt)) return AUDIT_HTML;
  if (/Return ONLY a JSON array/i.test(prompt)) {
    return JSON.stringify([{ type: 'h1', text: 'Page range study guide', id: 'page-range-study-guide' }, { type: 'p', text: 'Pages five to ten.' }]);
  }
  if (/Extract ALL text content/i.test(prompt)) return '# Page range study guide\nPages five to ten.';
  return '<p>Pages five to ten.</p>';
}

beforeAll(async () => {
  scratch = mkdtempSync(join(tmpdir(), 'alloflow-sliced-audit-'));
  const pdfPath = join(scratch, 'twenty-four-pages.pdf');
  writeFileSync(pdfPath, buildPdf(24, 1700 * 1024));
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let prompt = '';
      try {
        const j = JSON.parse(body);
        const content = (((j.messages || [])[0] || {}).content);
        if (Array.isArray(content)) {
          const text = content.filter((p) => p && p.type === 'text').map((p) => p.text).join('\n');
          const images = content.filter((p) => p && p.type === 'image_url').length;
          const window = text.match(/SLICE CONTEXT: This file contains ONLY pages (\d+)[–—-](\d+) of a larger (\d+)-page document/);
          const note = text.match(/source PDF pages: ([0-9, ]+)\./);
          visionCalls.push({ window: window ? [Number(window[1]), Number(window[2]), Number(window[3])] : null, imageCount: images, notedPages: note ? note[1].split(',').map((n) => Number(n.trim())) : null });
          prompt = text;
        } else {
          textCalls.push(String(content || '').slice(0, 80));
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
  globalThis.__slicedAuditPdfPath = pdfPath;
});

afterAll(async () => {
  for (const name of ['ALLOFLOW_MCP_MODEL_BACKEND', 'ALLOFLOW_MCP_MODEL_BASE', 'ALLOFLOW_MCP_MODEL_NAME', 'ALLOFLOW_MCP_VISION_MODEL', 'ALLOFLOW_MCP_NO_KEY_FILES']) delete process.env[name];
  if (driver) await driver.close();
  if (server) server.close();
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

describe('sliced audit with a page range (image mode, provider transport)', () => {
  it('slices only the requested pages and attaches each slice its own rendered pages', async () => {
    const out = await driver.remediate({
      filePath: globalThis.__slicedAuditPdfPath,
      targetScore: 100, fixPasses: 1, polishPasses: 0, taggedPdf: false, autoContinue: false,
      visionMode: 'images', pageRange: [5, 10],
    });
    expect(typeof out.accessibleHtml).toBe('string');
    expect(typeof out.beforeScore).toBe('number');

    const slices = visionCalls.filter((call) => call.window);
    // Pages 5-10 of 24 at four pages per slice: two slices, not six for the whole document.
    expect(slices.map((call) => call.window.slice(0, 2))).toEqual([[5, 8], [9, 10]]);
    expect(slices.every((call) => call.window[2] === 24)).toBe(true);
    // Each slice carried exactly its own pages, and said so.
    expect(slices.map((call) => call.imageCount)).toEqual([4, 2]);
    expect(slices.map((call) => call.notedPages)).toEqual([[5, 6, 7, 8], [9, 10]]);
    // No vision call attached pages outside the requested range.
    for (const call of visionCalls) {
      if (call.notedPages) expect(call.notedPages.every((n) => n >= 5 && n <= 10)).toBe(true);
    }
    expect(textCalls.length).toBeGreaterThan(0);
  });
});
