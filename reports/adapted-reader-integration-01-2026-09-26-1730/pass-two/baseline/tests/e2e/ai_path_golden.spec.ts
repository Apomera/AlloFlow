// Full-AI-path golden: the audit→plan→fix loop with a SCRIPTED Gemini.
// Every other golden stubs callGemini to '{}', so the chunked-AI fixing
// contracts had zero coverage: plan parsing, surgical-tool execution,
// rewrite accept/reject (length + text + image-token guards), data-URL
// strip/restore, and graceful failure on malformed AI output. The mock
// dispatches on PROMPT SHAPE (stable markers in the real prompts), so tests
// stay valid as prompt wording evolves around the markers.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../doc_pipeline_module.js');

// In-page helper source: builds a pipeline whose callGemini is scripted.
// behaviors: { plan?: string|object, surgical?: string, rewrite?: 'echo'|'shrink'|'drop-token'|string }
const SETUP = `
  window.__buildScriptedPipeline = (behaviors) => {
    const calls = [];
    const callGemini = async (prompt, jsonMode) => {
      calls.push({ jsonMode: !!jsonMode, head: String(prompt).slice(0, 120) });
      const p = String(prompt);
      if (p.indexOf('AVAILABLE TOOLS:') !== -1) {
        const plan = behaviors.plan;
        if (typeof plan === 'string') return plan;
        return JSON.stringify(plan || { analysis: 'nothing', actions: [], shouldContinue: false });
      }
      if (p.indexOf('Return ONLY a JSON array') !== -1) {
        return behaviors.surgical || '[]';
      }
      if (p.indexOf('Return ONLY the fixed fragment') !== -1) {
        const s = p.indexOf('HTML:\\n"""\\n');
        const e = p.lastIndexOf('\\n"""');
        const chunk = (s !== -1 && e > s) ? p.slice(s + 9, e) : '';
        if (behaviors.rewrite === 'echo') return chunk;
        if (behaviors.rewrite === 'shrink') return '<p>ok</p>';
        if (behaviors.rewrite === 'drop-token') {
          // Remove the image token but keep length ≥0.9× via padding, so ONLY
          // the tokensOk guard can be the rejection reason.
          const dropped = chunk.replace(/<img[^>]*__ALLOFLOW_DATAURL_\\d+__[^>]*>/g, '<span>image removed</span>');
          return dropped + ' '.repeat(Math.max(0, chunk.length - dropped.length));
        }
        return behaviors.rewrite || chunk;
      }
      return '{}';
    };
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini, callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
      getDefaultTitle: () => 'Document', state: {},
    });
    return { pipeline, calls };
  };
`;

const DATA_URL = 'data:image/png;base64,' + 'A'.repeat(180);
const SENTINEL = 'Photosynthesis converts light energy into chemical energy for the cell.';

test.describe('full AI path — scripted Gemini', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
    await page.addScriptTag({ path: MODULE_PATH });
    await page.addScriptTag({ content: SETUP });
  });

  test('autonomous agent: plan parses, surgical tool executes, target reached', async ({ page }) => {
    test.setTimeout(120000);
    const out = await page.evaluate(async () => {
      const { pipeline } = (window as any).__buildScriptedPipeline({
        plan: { analysis: 'image missing alt', actions: [{ tool: 'fix_alt_text', params: { index: 0, alt: 'A test diagram' }, reason: 'img-alt' }], shouldContinue: false },
      });
      const html = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><main><h1>Title</h1><p>Body</p><img src="x.png"></main></body></html>';
      const r = await pipeline.runAutonomousRemediation(html, { targetScore: 90, maxPasses: 3 });
      return { html: r.html, score: r.score, passes: r.passes, logText: (r.log || []).map((l: any) => l.text).join(' | ') };
    });
    expect(out.html).toContain('alt="A test diagram"');
    expect(out.score, 'log: ' + out.logText).toBeGreaterThanOrEqual(90);
  });

  test('autonomous agent: malformed (non-JSON) AI plan degrades gracefully — html untouched, no throw', async ({ page }) => {
    test.setTimeout(120000);
    const out = await page.evaluate(async () => {
      const { pipeline } = (window as any).__buildScriptedPipeline({
        plan: 'Sure! I recommend adding alt text to your images for better accessibility.',
      });
      const html = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><main><h1>Title</h1><img src="x.png"></main></body></html>';
      const r = await pipeline.runAutonomousRemediation(html, { targetScore: 100, maxPasses: 2 });
      return { same: r.html === html, logText: (r.log || []).map((l: any) => l.text).join(' | ') };
    });
    expect(out.same, 'html must be byte-identical when the plan is unusable — log: ' + out.logText).toBe(true);
    expect(out.logText).toContain('failed to parse');
  });

  test('chunked rewrite: clean echo is ACCEPTED and the stripped data URL is restored', async ({ page }) => {
    test.setTimeout(120000);
    const out = await page.evaluate(async (fix) => {
      const { pipeline } = (window as any).__buildScriptedPipeline({ rewrite: 'echo' });
      const html = '<!DOCTYPE html><html><body><main><p>' + fix.sentinel + '</p><img src="' + fix.dataUrl + '" alt="diagram"></main></body></html>';
      const r = await pipeline.remediateSurgicallyThenAI(html, { aiIssues: [{ issue: 'general polish', severity: 'minor' }], axeResult: null });
      return { gemini: r.geminiPassCount, rejected: r.rejectedChunks, hasDataUrl: r.html.indexOf(fix.dataUrl) !== -1, hasSentinel: r.html.indexOf(fix.sentinel) !== -1 };
    }, { dataUrl: DATA_URL, sentinel: SENTINEL });
    expect(out.gemini, 'echo rewrite should be accepted').toBe(1);
    expect(out.rejected).toBe(0);
    expect(out.hasDataUrl, 'data URL must be restored after the AI pass').toBe(true);
    expect(out.hasSentinel).toBe(true);
  });

  test('chunked rewrite: massive SHRINK is REJECTED — content preserved', async ({ page }) => {
    test.setTimeout(120000);
    const out = await page.evaluate(async (fix) => {
      const { pipeline } = (window as any).__buildScriptedPipeline({ rewrite: 'shrink' });
      const html = '<!DOCTYPE html><html><body><main><p>' + fix.sentinel + '</p><p>' + fix.sentinel + '</p><img src="' + fix.dataUrl + '" alt="diagram"></main></body></html>';
      const r = await pipeline.remediateSurgicallyThenAI(html, { aiIssues: [{ issue: 'general polish', severity: 'minor' }], axeResult: null });
      return { rejected: r.rejectedChunks, hasDataUrl: r.html.indexOf(fix.dataUrl) !== -1, hasSentinel: r.html.indexOf(fix.sentinel) !== -1 };
    }, { dataUrl: DATA_URL, sentinel: SENTINEL });
    expect(out.rejected, 'shrunken rewrite must be rejected').toBeGreaterThanOrEqual(1);
    expect(out.hasSentinel, 'original content must survive a rejected rewrite').toBe(true);
    expect(out.hasDataUrl).toBe(true);
  });

  test('chunked rewrite: dropping the image token is REJECTED — the image survives', async ({ page }) => {
    test.setTimeout(120000);
    const out = await page.evaluate(async (fix) => {
      const { pipeline } = (window as any).__buildScriptedPipeline({ rewrite: 'drop-token' });
      const html = '<!DOCTYPE html><html><body><main><p>' + fix.sentinel + '</p><img src="' + fix.dataUrl + '" alt="diagram"></main></body></html>';
      const r = await pipeline.remediateSurgicallyThenAI(html, { aiIssues: [{ issue: 'general polish', severity: 'minor' }], axeResult: null });
      return { rejected: r.rejectedChunks, hasDataUrl: r.html.indexOf(fix.dataUrl) !== -1 };
    }, { dataUrl: DATA_URL, sentinel: SENTINEL });
    expect(out.rejected, 'token-dropping rewrite must be rejected (tokensOk guard)').toBeGreaterThanOrEqual(1);
    expect(out.hasDataUrl, 'the image must survive via rejection of the bad rewrite').toBe(true);
  });
});
