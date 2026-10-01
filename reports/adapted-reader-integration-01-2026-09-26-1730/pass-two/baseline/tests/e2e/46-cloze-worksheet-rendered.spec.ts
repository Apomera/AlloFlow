import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * X2 (wave 3): the cloze worksheet at the RENDERED level, in a real browser.
 *
 * tests/cloze_worksheet_print.test.js pins the HTML string; this spec drives
 * the same shipped doc_pipeline module through the same injected-state seam,
 * but then RENDERS the export and asserts what a student would see printed:
 * visible fixed-width blank underlines, the word bank in the passage
 * language, the numbered teacher key, and no read-aloud attribute on the
 * cloze passage (reading the answers out loud defeats the worksheet).
 */

test.describe.configure({ timeout: 120000 });

const ROOT = process.cwd();
const PIPELINE = readFileSync(`${ROOT}/doc_pipeline_module.js`, 'utf8');

const SPANISH_PASSAGE = [
  'La célula es la unidad basica de la vida.',
  'Cada célula tiene una membrana que la protege.',
].join('\n\n');
const SPANISH_GLOSSARY = [
  { term: 'cell', def: 'The basic unit of life.', tier: 'Domain-Specific', translations: { Spanish: 'célula: la unidad basica de la vida' } },
  { term: 'membrane', def: 'The layer around a cell.', tier: 'Domain-Specific', translations: { Spanish: 'membrana: la capa que rodea la célula' } },
];

test('the worksheet a student receives: blanks visible, bank in passage language, key numbered', async ({ page }) => {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
  window.__err = [];
  window.addEventListener('error', e => window.__err.push(String(e.message)));
</script>
</body></html>`, { waitUntil: 'load' });
  // addScriptTag, not an inline <script>: the module source contains
  // "</script>" sequences that terminate an inline block early.
  await page.addScriptTag({ content: PIPELINE });

  const html = await page.evaluate(({ passage, glossary }) => {
    const factory = (window as any).AlloModules.createDocPipeline;
    const stub = async () => '{}';
    const pipeline = factory({
      callGemini: stub, callGeminiVision: stub, callImagen: async () => null,
      addToast: () => {}, t: () => undefined, isRtlLang: () => false,
      updateExportPreview: () => {}, getDefaultTitle: () => 'Leveled Text',
      state: { leveledTextLanguage: 'Spanish', exportConfig: {}, currentUiLanguage: 'English' },
    });
    return pipeline.generateFullPackHTML(
      [
        { id: 'simp-1', type: 'simplified', title: 'Leveled Text', data: passage },
        { id: 'gloss-1', type: 'glossary', title: 'Glossary', data: glossary },
      ],
      'Celulas', true, {},
      { clozeWorksheet: true, includeTeacherKey: true, includeSimplified: true, includeGlossary: false },
    );
  }, { passage: SPANISH_PASSAGE, glossary: SPANISH_GLOSSARY });

  expect((await page.evaluate(() => (window as any).__err)), 'pipeline must load clean').toEqual([]);

  // Render the export the way the browser will.
  await page.setContent(html, { waitUntil: 'load' });

  // Blanks are visually present: rendered, non-zero fixed width, on the line.
  const blanks = page.locator('.alloflow-cloze-blank');
  await expect(blanks).toHaveCount(3); // célula x2 + membrana x1
  const widths = await blanks.evaluateAll((nodes) =>
    nodes.map((n) => (n as HTMLElement).getBoundingClientRect().width));
  for (const w of widths) expect(w, 'each blank must render a visible underline').toBeGreaterThan(30);

  // The word bank lists passage-language terms (with English beside them).
  await expect(page.locator('body')).toContainText('célula (cell)');
  await expect(page.locator('body')).toContainText('membrana (membrane)');

  // The teacher copy carries the numbered answer key.
  await expect(page.locator('body')).toContainText('Fill in the Blanks: Answer Key');
  const keySection = page.locator('[id$="-cloze-key"]');
  await expect(keySection).toHaveCount(1);
  // One key entry per blank, in blank order (numbering renders as list
  // markers/spans, so assert the entries and their order, not a bare "1").
  const keyText = (await keySection.innerText()).replace(/\s+/g, ' ');
  const first = keyText.indexOf('célula');
  const last = keyText.indexOf('membrana');
  expect(first, 'key lists the first blank answer').toBeGreaterThanOrEqual(0);
  expect(last, 'key lists the last blank answer, after the first').toBeGreaterThan(first);

  // Read-aloud must not narrate the answers into the blanks.
  const readable = await page.evaluate(() => {
    const passageEl = document.querySelector('.alloflow-cloze-blank')?.closest('[data-ka-readable]');
    return passageEl ? passageEl.getAttribute('data-ka-readable') : null;
  });
  expect(readable, 'cloze passage must not be read-aloud eligible').toBeNull();

  // And the blanked words are genuinely absent from the student passage prose.
  const passageText = await page.evaluate(() => document.body.innerText.split(/word bank/i)[0]);
  expect(passageText).not.toContain('La célula es');
});
