import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const helperStart = source.indexOf('function _stripGeneratedImageEditorControls(html, stripFileHandlers) {');
const helperEnd = source.indexOf('function _alloSanitizeRemediationHtml', helperStart);
const helperCode = source.slice(helperStart, helperEnd);
const stripStart = source.indexOf('function _stripExecutableScripts(html) {');
const stripCode = source.slice(stripStart, source.indexOf('\n}', stripStart) + 2);
const sanitizerStart = source.indexOf('function _alloDecodeImportedCss');
const sanitizerEnd = source.indexOf('function _alloSanitizeRemediationProject', sanitizerStart);
const sanitizerCode = 'var _ALLO_MAX_IMPORTED_HTML_CHARS = 128 * 1024 * 1024;\n' + source.slice(sanitizerStart, sanitizerEnd);
const legacy = readFileSync('tests/fixtures/mcp_crop_legacy.html', 'utf8');
const cropButton = legacy.match(/<button\b[^>]*onclick="window\.__pdfCropImage[\s\S]*?<\/button>/)[0];
const generatedTemplate = source.match(/\$\{hasCropData \? (`<button[^\n]+`) : ''\}/)[1];
const generatedButton = new Function('imgId', 'return ' + generatedTemplate)('pdf-img-1');
const current = legacy.replace(cropButton, generatedButton).replace('<label ', '<label data-alloflow-image-replace="pdf-img-1" ');

test.describe('Chromium static document behavior', () => {
  test('keeps the actual raw Replace file-change behavior after removing crop', async ({ page }) => {
    const cleaned = await page.evaluate(({ helperCode, stripCode, legacy }) => {
      return new Function(helperCode + stripCode + '\nreturn _stripExecutableScripts;')()(legacy);
    }, { helperCode, stripCode, legacy });
    await page.setContent(cleaned);
    expect(await page.getByRole('button', { name: 'Adjust crop for this image' }).count()).toBe(0);
    const before = await page.locator('figure img').first().getAttribute('src');
    const replacement = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
    await page.locator('input[type="file"]').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: replacement });
    await page.waitForFunction(before => document.querySelector('figure img').getAttribute('src') !== before, before);
    expect(await page.locator('figure img').first().getAttribute('src')).toBe('data:image/png;base64,' + replacement.toString('base64'));
    expect(await page.locator('figcaption').count()).toBe(1);
  });
  test('canonical browser export has no dead picker while source controls and content remain', async ({ page }) => {
    const sourceContent = '<p id="note">Source note</p><button id="source">Source choice</button><label>Answer<input id="answer" type="text"></label>';
    const cleaned = await page.evaluate(({ sanitizerCode, html }) => new Function(sanitizerCode + '\nreturn _alloSanitizeRemediationHtml;')()(html), { sanitizerCode, html: legacy.replace(cropButton, cropButton + sourceContent) });
    await page.setContent(cleaned);
    expect(await page.locator('input[type="file"]').count()).toBe(0);
    expect(await page.getByRole('button', { name: 'Adjust crop for this image' }).count()).toBe(0);
    expect(await page.locator('#source').count()).toBe(1);
    await page.locator('#answer').fill('Preserved');
    expect(await page.locator('#answer').inputValue()).toBe('Preserved');
    expect(await page.locator('#note').textContent()).toBe('Source note');
    expect(await page.locator('figure img, figure figcaption, figure details').count()).toBe(3);
  });
  test('current generated preview control can call its runtime before static cleanup', async ({ page }) => {
    await page.setContent(current);
    await page.evaluate(() => { window.__pdfCropImage = id => { window.cropRequested = id; }; });
    await page.getByRole('button', { name: 'Adjust crop for this image' }).click();
    expect(await page.evaluate(() => window.cropRequested)).toBe('pdf-img-1');
    const cleaned = await page.evaluate(({ helperCode, html }) => new Function(helperCode + '\nreturn _stripGeneratedImageEditorControls;')()(html, true), { helperCode, html: current });
    await page.setContent(cleaned);
    expect(await page.locator('[data-alloflow-crop-control],[data-alloflow-image-replace]').count()).toBe(0);
  });
});
