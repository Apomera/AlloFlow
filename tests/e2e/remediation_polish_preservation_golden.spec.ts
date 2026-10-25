// Whole-pipeline regression for the long-document polish boundary. All model replies
// are scripted and all browser libraries are loaded from the checkout. These are
// preservation assertions, not live-model quality or human accessibility evidence.
import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const root = path.resolve(__dirname, '../..');
const vendor = (name: string) => path.join(root, 'desktop/mcp/vendor', name);
const origin = 'http://127.0.0.1:8179';
const sourceHref = 'https://example.org/course/reference';
const changedHref = 'https://example.org/course/alternate';

test.setTimeout(180000);

for (const mode of ['mutated-content', 'safe-style']) {
  test('nine-page pipeline polish preserves content: ' + mode, async ({ page }) => {
    const externalRequests: string[] = [];
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url === origin + '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' });
      if (url === origin + '/pdf.worker.min.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(vendor('pdf.worker.min.js')) });
      // The pipeline also injects axe into audit frames and loads DOMPurify on
      // demand. Fulfill those pinned-library URLs locally, with no network.
      if (/\/axe-core(?:\/|@)4\.12\.1\/(?:axe\.min\.js)/.test(url)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(vendor('axe.min.js')) });
      if (/\/dompurify(?:\/|@)3\.1\.7\/(?:dist\/)?purify\.min\.js/.test(url)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'dompurify/3.1.7/purify.min.js')) });
      if (/^(?:blob:|data:|about:)/.test(url)) return route.continue();
      externalRequests.push(url);
      return route.abort();
    });
    await page.goto(origin + '/');
    for (const asset of ['pdf-lib.min.js', 'pdfjs.min.js', 'pako.min.js', 'axe.min.js']) {
      await page.addScriptTag({ path: vendor(asset) });
    }
    // Equal Access is an actual local engine here, rather than a fabricated score.
    await page.addScriptTag({ path: path.join(root, 'accessibility-checker-engine/3.1.83/ace.js') });
    for (const module of ['verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js']) {
      await page.addScriptTag({ path: path.join(root, module) });
    }

    const out = await page.evaluate(async ({ mode, sourceHref, changedHref, origin }) => {
      const w = window as any;
      w.__alloHeadlessHost = true;
      w.__alloflowRuntimeAssets = { pdfjsWorker: origin + '/pdf.worker.min.js' };
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = origin + '/pdf.worker.min.js';
      const paragraphs = Array.from({ length: 9 }, (_, index) =>
        'Page ' + (index + 1) + ': Students examine the water cycle and record observations about evaporation, condensation, precipitation, and collection. ' +
        'Read every instruction carefully before comparing your observations with the reference. Keep all measurements in their original units and discuss the evidence with your group.');
      const { PDFDocument, StandardFonts } = w.PDFLib;
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf.setTitle('Water-cycle reference packet');
      pdf.setLanguage('en');
      for (let index = 0; index < 9; index++) {
        const sheet = pdf.addPage([612, 792]);
        sheet.drawText(index === 0 ? 'Water-cycle reference packet' : 'Observation page ' + (index + 1), { x: 40, y: 740, size: 16, font });
        const words = paragraphs[index].split(' ');
        for (let line = 0; line * 12 < words.length; line++) {
          sheet.drawText(words.slice(line * 12, (line + 1) * 12).join(' '), { x: 40, y: 710 - line * 20, size: 10, font });
        }
        if (index === 0) {
          sheet.drawText('Course reference', { x: 40, y: 550, size: 10, font });
          sheet.drawText('Observation totals: Monday 12; Tuesday 21.', { x: 40, y: 530, size: 10, font });
        }
      }
      const bytes = await pdf.save();
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const base64 = btoa(binary);
      const calls: { kind: string; inputLength: number; mutation: boolean }[] = [];
      const diagnostics: string[] = [];
      let polishCalls = 0;
      let changedPolishReplies = 0;
      const dispatch = async (raw: string) => {
        const prompt = String(raw);
        if (/Return ONLY the fixed fragment — raw HTML, no JSON wrapping\./.test(prompt) && prompt.includes('UNTRUSTED HTML DATA:\n')) {
          polishCalls++;
          const fragment = prompt.split('UNTRUSTED HTML DATA:\n')[1]?.split('\n\nReturn ONLY the fixed fragment')[0] || '';
          if (!fragment.trim().startsWith('<')) throw new Error('Polish prompt did not contain the expected HTML payload.');
          const candidate = mode === 'mutated-content'
            ? fragment.replace(sourceHref, changedHref).replace(/>(12|21)<\/td>/g, (_match: string, value: string) => '>' + (value === '12' ? '21' : '12') + '</td>')
            : fragment.replace(/<p\b/, '<p style="letter-spacing:0.01em"');
          const mutation = candidate !== fragment;
          if (mutation) changedPolishReplies++;
          calls.push({ kind: 'polish', inputLength: fragment.length, mutation });
          return candidate;
        }
        const chunk = prompt.match(/Extract ALL content from pages (\d+) through (\d+) of this PDF as a JSON array/);
        if (chunk) {
          const start = Number(chunk[1]);
          const end = Number(chunk[2]);
          const blocks: any[] = [];
          if (start === 1) blocks.push({ type: 'h1', text: 'Water-cycle reference packet', id: 'water-cycle-reference' });
          for (let number = start; number <= end; number++) {
            blocks.push({ type: 'h2', text: 'Observation page ' + number, id: 'observation-page-' + number });
            blocks.push({ type: 'p', text: paragraphs[number - 1] });
            if (number === 1) {
              blocks.push({ type: 'p', text: '<a href="' + sourceHref + '">Course reference</a>' });
              blocks.push({ type: 'table', caption: 'Observation totals', headers: ['Day', 'Count'], rows: [['Monday', '12'], ['Tuesday', '21']] });
            }
          }
          calls.push({ kind: 'transform', inputLength: prompt.length, mutation: false });
          return JSON.stringify(blocks);
        }
        if (/accessibility auditor\. Audit this HTML/i.test(prompt)) return JSON.stringify({ score: 100, summary: 'Scripted audit, not a human judgment', issues: [], passes: ['Scripted fixture'] });
        if (/Analyze the visual design of this PDF/i.test(prompt)) return JSON.stringify({ headingColor: '#1e3a8a', accentColor: '#1d4ed8', bgColor: '#ffffff', headerBg: '#1e3a8a', headerText: '#ffffff' });
        if (/Return ONLY a JSON array/i.test(prompt)) throw new Error('Expected chunked extraction for a nine-page document.');
        // Later repair suggestions make no changes, so they cannot repair or hide the
        // deliberately corrupted polish reply before the final artifact assertions.
        return 'UNCHANGED';
      };
      const pipeline = w.AlloModules.createDocPipeline({
        callGemini: dispatch, callGeminiVision: dispatch, callImagen: async () => null,
        addToast() {}, t: (key: string) => key, isRtlLang: () => false,
        updateExportPreview() {}, getDefaultTitle: () => 'Water-cycle reference packet',
        warnLog: (...parts: any[]) => diagnostics.push(parts.map(String).join(' ')),
        state: {},
      });
      const result = await pipeline.fixAndVerifyPdf({
        documentEpoch: 1, base64, fileName: 'water-cycle-nine-pages.pdf',
        auditResult: { score: 55, summary: 'Scripted baseline', confidence: 'high', documentLanguage: 'en', pageCount: 9, hasSearchableText: true, hasImages: false, hasTables: true, hasForms: false, critical: [], serious: [], moderate: [], minor: [], passes: [] },
        targetScore: 80, autoFixPasses: 0, polishPasses: 1,
        onProgress() {}, extraRequestPacing: false,
      });
      const html = String(result?.accessibleHtml || '');
      const output = new DOMParser().parseFromString(html, 'text/html');
      const table = Array.from(output.querySelectorAll('table')).find((node: any) => /Observation totals/.test(node.textContent || '')) as HTMLTableElement | undefined;
      const observations = table ? Array.from(table.querySelectorAll('tbody tr')).map(row => Array.from(row.querySelectorAll('td,th')).map(cell => cell.textContent?.trim())) : [];
      return {
        polishCalls, changedPolishReplies, transformCalls: calls.filter(call => call.kind === 'transform').length,
        hrefs: Array.from(output.querySelectorAll('a')).filter(anchor => anchor.textContent?.trim() === 'Course reference').map(anchor => anchor.getAttribute('href')),
        observations, hasSafeStyle: html.includes('letter-spacing:0.01em'),
        hasEveryPage: paragraphs.every(paragraph => output.body.textContent?.includes(paragraph)),
        candidateRejections: result?.candidateRejections || [],
        candidateRejectionCount: result?.candidateRejectionCount ?? 0,
        diagnostics,
      };
    }, { mode, sourceHref, changedHref, origin });

    await test.info().attach('polish-preservation-result', { body: JSON.stringify(out, null, 2), contentType: 'application/json' });
    expect(externalRequests, 'the fixture must not contact a model provider or download dependencies').toEqual([]);
    expect(out.transformCalls, 'the real >8-page structure branch must run').toBe(3);
    expect(out.polishCalls, 'this must exercise the actual long-document polish call').toBeGreaterThan(0);
    expect(out.changedPolishReplies, 'the scheduled candidate change must actually fire').toBeGreaterThan(0);
    expect(out.hasEveryPage).toBe(true);
    expect(out.hrefs).toEqual([sourceHref]);
    expect(out.observations).toEqual([['Monday', '12'], ['Tuesday', '21']]);
    if (mode === 'mutated-content') {
      expect(out.candidateRejectionCount, 'reverted polish must leave review evidence on the returned result').toBeGreaterThan(0);
      expect(out.candidateRejections.some((entry: any) => entry.pass === 1 && entry.phase === 'chunk' && typeof entry.reason === 'string')).toBe(true);
    }
    if (mode === 'safe-style') expect(out.hasSafeStyle, 'a safe styling edit must remain possible').toBe(true);
  });
}
