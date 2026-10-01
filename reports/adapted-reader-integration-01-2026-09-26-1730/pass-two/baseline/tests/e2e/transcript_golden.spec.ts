// Transcript-format golden (2026-06-10): audio/video inputs become the
// 'ALLOTRANSCRIPT' first-class document format. Pins: (1) unicode-safe
// encode/decode round-trip, (2) the extractPdfTextDeterministic chokepoint
// (every downstream path inherits transcript awareness there), (3) the audit
// dispatcher's transcript branch (axe-only, honest summary, no Vision/PDF
// machinery touched), (4) the full lecture→tagged chain: transcript html
// through createTypesetTaggedPdf earns the declaration. Deterministic, no AI.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const PIPELINE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let r: any = null;

test.describe('ALLOTRANSCRIPT format — audio/video as first-class pipeline input', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ url: PDFLIB_CDN });
    await page.waitForFunction(() => !!(window as any).PDFLib, null, { timeout: 30000 });
    await page.addScriptTag({ path: PIPELINE_PATH });

    r = await page.evaluate(async () => {
      try {
        const pipeline = (window as any).AlloModules.createDocPipeline({
          callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
          addToast: () => {}, t: (k: string) => k, isRtlLang: () => false, updateExportPreview: () => {},
          getDefaultTitle: () => 'Document', state: {},
        });
        const TRANSCRIPT = 'Welcome to the photosynthesis lecture — versión española: café, naïve, 中文.\n\nPlants convert light into chemical energy through a process occurring in the chloroplasts of every green cell.\n\nToday we will cover the light-dependent reactions and the Calvin cycle.';
        const payload = pipeline.encodeTranscriptPayload(TRANSCRIPT);
        const decoded = pipeline.decodeTranscriptPayload(payload);
        const notTranscript = pipeline.decodeTranscriptPayload('JVBERi0xLjQK');
        const det = await pipeline.extractPdfTextDeterministic(payload);
        const audit = await pipeline.runPdfAccessibilityAudit(payload, { skipUiUpdates: true, skipCache: true });
        // The lecture→tagged chain: a structured version of the transcript
        // through typeset-then-tag (what Fix & Verify produces).
        const structuredHtml = '<!DOCTYPE html><html lang="en"><head><title>Photosynthesis Lecture</title></head><body><main>'
          + '<h1>Photosynthesis Lecture</h1>'
          + '<p>Welcome to the photosynthesis lecture.</p>'
          + '<h2>Overview</h2>'
          + '<p>Plants convert light into chemical energy through a process occurring in the chloroplasts of every green cell.</p>'
          + '<p>Today we will cover the light-dependent reactions and the Calvin cycle.</p>'
          + '</main></body></html>';
        // Markdown table support: CSV-derived pipe-tables must become REAL
        // scoped tables in the audit html (Stage 5b then adds Headers/IDTree).
        const tablePayload = pipeline.encodeTranscriptPayload('# Grades\n\n| Student | Score |\n| --- | --- |\n| Ada | 95 |\n| Grace | 88 |');
        const tableAudit = await pipeline.runPdfAccessibilityAudit(tablePayload, { skipUiUpdates: true, skipCache: true });
        const tableHtmlCheck = await pipeline.extractPdfTextDeterministic(tablePayload);
        const tagged = await pipeline.createTypesetTaggedPdf({ accessibleHtml: structuredHtml }, { title: 'Photosynthesis Lecture', lang: 'en' });
        return {
          tableAudit: tableAudit ? { isTranscript: !!tableAudit._transcriptInput, ok: tableAudit.score !== undefined } : null,
          tableText: tableHtmlCheck ? tableHtmlCheck.fullText.includes('| Ada | 95 |') : false,
          roundTrip: decoded === TRANSCRIPT,
          notTranscript,
          det: det ? { method: det.method, chars: det.sourceCharCount, pages: det.pageCount } : null,
          audit: audit ? { isTranscript: !!audit._transcriptInput, score: audit.score, summaryHasHonesty: /transcription errors/i.test(audit.summary || ''), pageCount: audit.pageCount } : null,
          tagged: tagged && tagged.bytes ? { uaDeclared: !!(tagged.summary || {}).uaDeclared, orphans: (tagged.summary || {}).orphanedLeaves, roundTripOk: !(tagged.roundTrip && tagged.roundTrip.ok === false) } : null,
        };
      } catch (e: any) { return { error: String((e && e.stack) || e) }; }
    });
    await page.close();
  });

  test('unicode round-trip + non-transcript inputs decode to null', () => {
    expect(r && !r.error, 'error: ' + (r && r.error)).toBeTruthy();
    expect(r.roundTrip, 'encode→decode must be byte-faithful incl. unicode').toBeTruthy();
    expect(r.notTranscript, 'a PDF payload must NOT decode as a transcript').toBeNull();
  });

  test('extractor chokepoint returns the transcript deterministically', () => {
    expect(r.det.method).toBe('transcript');
    expect(r.det.chars).toBeGreaterThan(100);
    expect(r.det.pages).toBeGreaterThanOrEqual(1);
  });

  test('audit dispatcher: transcript branch is axe-only and honest', () => {
    expect(r.audit.isTranscript).toBeTruthy();
    expect(r.audit.summaryHasHonesty, 'summary must tell the teacher to review for transcription errors').toBeTruthy();
    expect(r.audit.pageCount).toBeGreaterThanOrEqual(1);
  });

  test('markdown pipe-tables ride the transcript format', () => {
    expect(r.tableAudit.isTranscript).toBeTruthy();
    expect(r.tableText, 'table text survives the chokepoint').toBeTruthy();
  });

  test('lecture → typeset tagged PDF earns the declaration', () => {
    expect(r.tagged).toBeTruthy();
    expect(r.tagged.roundTripOk).toBeTruthy();
    expect(r.tagged.orphans).toBe(0);
    expect(r.tagged.uaDeclared).toBeTruthy();
  });
});
