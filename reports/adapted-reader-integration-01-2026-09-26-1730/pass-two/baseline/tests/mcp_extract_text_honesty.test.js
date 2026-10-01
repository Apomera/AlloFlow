import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

// extract_document_text reads text layers only. Before 2026-09-13 an image-only PDF came back as
// `characters: 0, method: null` with no note, indistinguishable from an empty document, and a
// text layer that decodes to unmapped glyph codes (a font without a ToUnicode map) reported a
// healthy character count. Both hid the fact that OCR was needed and that this tool does not
// run it. These cases drive the real server through the stdio harness the CLI tests use.

const ROOT = resolve(import.meta.dirname, '..');
const HARNESS = join(ROOT, 'mcp-testing', 'tools', 'mcp_call.cjs');
const SERVER = join(ROOT, 'desktop', 'mcp', 'alloflow-remediation-mcp-stdio.cjs');
const require = createRequire(import.meta.url);
const PDF = require(join(ROOT, 'desktop', 'mcp', 'vendor', 'pdf-lib.min.js'));

const dir = mkdtempSync(join(tmpdir(), 'alloflow-extract-honesty-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Pages with painted content and no text operators: what a scan looks like to pdf.js.
async function imageOnlyPdf(pages) {
  const doc = await PDF.PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([300, 400]);
    page.drawRectangle({ x: 20, y: 20, width: 260, height: 360, color: PDF.rgb(0.85, 0.85, 0.85) });
  }
  return Buffer.from(await doc.save());
}

async function textPdf() {
  const doc = await PDF.PDFDocument.create();
  const font = await doc.embedFont(PDF.StandardFonts.Helvetica);
  const page = doc.addPage([300, 400]);
  page.drawText('Universal design gives every learner a way in.', { x: 20, y: 360, size: 12, font });
  page.drawText('Second line of ordinary text for the extractor.', { x: 20, y: 340, size: 12, font });
  return Buffer.from(await doc.save());
}

function extract(filePath) {
  const argsFile = join(dir, 'args-' + Date.now() + '.json');
  writeFileSync(argsFile, JSON.stringify({ file_path: filePath }));
  const output = execFileSync(process.execPath, [HARNESS, 'call', SERVER, 'extract_document_text', '--timeout', '240000', argsFile], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ALLOFLOW_MCP_NO_KEY_FILES: '1', ALLOFLOW_MCP_STATE_DIR: join(dir, 'state') },
  });
  return JSON.parse(output);
}

describe('extract_document_text says what an empty or unusable text layer means', () => {
  it('reports an image-only PDF as scanned, unusable, and outside this tool\'s OCR scope', async () => {
    const file = join(dir, 'image-only.pdf');
    writeFileSync(file, await imageOnlyPdf(3));
    const result = extract(file);
    expect(result).toMatchObject({
      kind: 'pdf', characters: 0, method: 'text-layer', pageCount: 3, isScanned: true, pageErrors: 0, textLayerUsable: false,
    });
    expect(result.error).toBeUndefined();
    expect(result.note).toMatch(/No text layer found on 3 page\(s\)/);
    expect(result.note).toMatch(/does not run OCR/);
    expect(result.note).toMatch(/pdf_remediate_agent_start/);
  }, 400000);

  it('reports an ordinary text layer as usable with no note and a zero unmapped-glyph ratio', async () => {
    const file = join(dir, 'text.pdf');
    writeFileSync(file, await textPdf());
    const result = extract(file);
    expect(result).toMatchObject({ kind: 'pdf', method: 'text-layer', pageCount: 1, isScanned: false, textLayerUsable: true, unmappedGlyphRatio: 0 });
    expect(result.characters).toBeGreaterThan(40);
    expect(result.text).toContain('every learner a way in');
    expect(result.note).toBeUndefined();
  }, 400000);
});
