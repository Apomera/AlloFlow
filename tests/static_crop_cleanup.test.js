import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const helperStart = source.indexOf('function _stripGeneratedImageEditorControls(html, stripFileHandlers) {');
const helperEnd = source.indexOf('function _alloSanitizeRemediationHtml', helperStart);
const helperCode = source.slice(helperStart, helperEnd);
const stripStart = source.indexOf('function _stripExecutableScripts(html) {');
const stripCode = source.slice(stripStart, source.indexOf('\n}', stripStart) + 2);
const cleanup = new Function(helperCode + '\nreturn _stripGeneratedImageEditorControls;')();
const strip = new Function(helperCode + stripCode + '\nreturn _stripExecutableScripts;')();
const sanitizerStart = source.indexOf('function _alloDecodeImportedCss');
const sanitizerEnd = source.indexOf('function _alloSanitizeRemediationProject', sanitizerStart);
const sanitizerCode = 'var _ALLO_MAX_IMPORTED_HTML_CHARS = 128 * 1024 * 1024;\n' + source.slice(sanitizerStart, sanitizerEnd);
const sanitize = new Function(sanitizerCode + '\nreturn _alloSanitizeRemediationHtml;')();
const legacy = readFileSync('tests/fixtures/mcp_crop_legacy.html', 'utf8');
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const cropButton = legacy.match(/<button\b[^>]*onclick="window\.__pdfCropImage[\s\S]*?<\/button>/)[0];
const replaceLabel = legacy.match(/<label\b[\s\S]*?<\/label>/)[0];
const generatedTemplate = source.match(/\$\{hasCropData \? (`<button[^\n]+`) : ''\}/)[1];
const generatedButton = new Function('imgId', 'return ' + generatedTemplate)('pdf-img-1');
const current = legacy.replace(cropButton, generatedButton).replace('<label ', '<label data-alloflow-image-replace="pdf-img-1" ');
const markuplessButton = generatedButton.replace(/ onclick="[^"]*"/, '');
const ld = '<script type="application/ld+json">{"name":"data", "example":"<button>Adjust Crop</button>"}</script>';

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 30000);
afterAll(async () => { await browser?.close(); });

describe('static image control cleanup preserves document source', () => {
  it('removes the actual legacy crop button even when scripts are already absent', () => {
    expect(strip(legacy)).toBe(legacy.replace(cropButton, ''));
  });
  it('marks the current generated crop button and removes it with handlers present', () => {
    expect(generatedButton).toContain('data-alloflow-crop-control="pdf-img-1"');
    expect(strip(current)).toBe(current.replace(generatedButton, ''));
  });
  it('recognizes owned crop and Replace controls after handlers were already removed', () => {
    const html = current.replace(generatedButton, markuplessButton).replace(/ onchange="[^"]*"/, '');
    const result = cleanup(html, true);
    expect(parse(result).querySelector('[data-alloflow-crop-control],[data-alloflow-image-replace]')).toBeNull();
    expect(result).toContain('<figcaption');
  });
  it('preserves raw MCP Replace label and handler byte for byte', () => {
    expect(strip(legacy)).toContain(replaceLabel);
    expect(strip(legacy)).toContain('r.readAsDataURL(f)');
  });
  it('removes only the exact legacy controls at the handler-stripping boundary', () => {
    expect(cleanup(legacy, true)).toBe(legacy.replace(cropButton, '').replace(replaceLabel, ''));
  });
  it('preserves image bytes, transcript, captions, entities, and unknown toolbar children', () => {
    const content = '<p id="source-note">A &amp; B &lt; C</p><button id="source-button" onclick="this.textContent=\'Clicked\'">Source control</button><label id="source-label">Answer<input type="text"></label>';
    const html = legacy.replace(cropButton, cropButton + content);
    expect(cleanup(html, true)).toBe(html.replace(cropButton, '').replace(replaceLabel, ''));
    expect(cleanup(html, true)).toContain(content);
  });
  it('is idempotent with executable scripts removed and JSON-LD kept', () => {
    const html = ld + legacy + '<script>window.__pdfCropImage=function(){};</script>';
    const once = strip(html);
    expect(once).toBe(ld + legacy.replace(cropButton, ''));
    expect(strip(once)).toBe(once);
    expect(cleanup(cleanup(html, true), true)).toBe(cleanup(html, true));
  });
  it.each([
    ['unowned handler', html => html.replace(/onclick="window\.__pdfCropImage[^"]*"/, 'onclick="sourceCrop()"')],
    ['different handler target', html => html.replace("__pdfCropImage('pdf-img-1')", "__pdfCropImage('pdf-img-2')")],
    ['extra handler action', html => html.replace("__pdfCropImage('pdf-img-1')", "__pdfCropImage('pdf-img-1');sourceAction()")],
    ['wrong figure id', html => html.replace('id="pdf-img-1-figure"', 'id="source-figure"')],
    ['wrong index', html => html.replace('data-img-idx="1"', 'data-img-idx="2"')],
    ['missing crop', html => html.replace(/ data-crop="[^"]*"/, '')],
    ['invalid crop', html => html.replace(/ data-crop="[^"]*"/, ' data-crop="{}"')],
    ['wrong container', html => html.replace('id="pdf-img-1-container"', 'id="source-container"')],
    ['text and aria label alone', html => html.replace(/ onclick="window\.__pdfCropImage[^"]*"/, '')],
  ])('preserves a source-like crop near miss: %s', (_name, change) => {
    const html = change(legacy);
    expect(cleanup(html, false)).toBe(html);
  });
  it.each([
    ['unknown prose in crop', html => html.replace('Adjust Crop</button>', 'Adjust Crop<p>Source prose</p></button>')],
    ['unknown prose in Replace', html => html.replace('</label>', '<span>Source prose</span></label>')],
    ['unrelated input in Replace', html => html.replace('</label>', '<input type="text" value="Source"></label>')],
    ['source-authored Replace handler', html => html.replace(/ onchange="[^"]*"/, ' onchange="sourceUpload(this)"')],
  ])('keeps source content inside a control: %s', (_name, change) => {
    const html = change(legacy);
    const result = cleanup(html, true);
    if (_name.includes('crop')) expect(result).toContain('Source prose</p></button>');
    else expect(result).toContain(change(replaceLabel));
  });
  it('does not treat buttons in raw text, comments, or quoted attributes as controls', () => {
    const examples = '<!--' + legacy + '--><textarea>' + legacy + '</textarea><style>.example{content:"<button>Adjust Crop</button>"}</style>'
      + '<div title="<button data-alloflow-crop-control=\'pdf-img-1\'>Adjust Crop</button>">Source</div>' + ld;
    expect(cleanup(examples, true)).toBe(examples);
    const html = legacy.replace(cropButton, cropButton.replace('<button ', '<button title="A > B and C < D" '));
    expect(cleanup(html, false)).toBe(legacy.replace(cropButton, ''));
  });
  it('preserves malformed nested or unclosed buttons instead of deleting source ranges', () => {
    const nested = legacy.replace('Adjust Crop</button>', 'Adjust Crop<button>Source</button></button>');
    expect(cleanup(nested, false)).toBe(nested);
    const unclosed = legacy.replace('</button>', '');
    expect(cleanup(unclosed, false)).toBe(unclosed);
  });
  it('preserves following source prose when browser repair closes a malformed control early', () => {
    const crop = parse(legacy).querySelector('figure').getAttribute('data-crop').replace(/"/g, '&quot;');
    const html = '<figure id="pdf-img-1-figure" data-img-idx="1" data-crop="' + crop + '"><div id="pdf-img-1-container">'
      + '<button onclick="window.__pdfCropImage &amp;&amp; window.__pdfCropImage(\'pdf-img-1\')">Adjust Crop</div>'
      + '<p id="source-instruction">Submit the worksheet tomorrow.</p></button></figure>';
    expect(cleanup(html, false)).toBe(html);
    expect(parse(cleanup(html, true)).querySelector('#source-instruction').textContent).toBe('Submit the worksheet tomorrow.');
  });
  it.each([undefined, class { parseFromString() { throw new Error('unavailable'); } }])('preserves crop content when DOM parsing is unavailable (%#)', parser => {
    const noParserCleanup = new Function('DOMParser', helperCode + '\nreturn _stripGeneratedImageEditorControls;')(parser);
    const noParserStrip = new Function('DOMParser', helperCode + stripCode + '\nreturn _stripExecutableScripts;')(parser);
    expect(noParserCleanup(legacy, true)).toBe(legacy);
    expect(noParserStrip(legacy + ld + '<script>execute()</script>')).toBe(legacy + ld);
  });
  it('canonical sanitization removes legacy picker before stripping its signature', () => {
    const out = parse(sanitize(legacy));
    expect(out.querySelector('input[type="file"]')).toBeNull();
    expect(out.querySelector('button')).toBeNull();
    expect(out.querySelector('img').getAttribute('src')).toBe(parse(legacy).querySelector('img').getAttribute('src'));
    expect(out.querySelector('figcaption').textContent).toBe(parse(legacy).querySelector('figcaption').textContent);
  });
});

describe('Chromium static document behavior', () => {
  it('keeps the actual raw Replace file-change behavior after removing crop', async () => {
    const page = await browser.newPage();
    try {
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
    } finally { await page.close(); }
  });
  it('canonical browser export has no dead picker while source controls and content remain', async () => {
    const page = await browser.newPage();
    try {
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
    } finally { await page.close(); }
  });
  it('current generated preview control can call its runtime before static cleanup', async () => {
    const page = await browser.newPage();
    try {
      await page.setContent(current);
      await page.evaluate(() => { window.__pdfCropImage = id => { window.cropRequested = id; }; });
      await page.getByRole('button', { name: 'Adjust crop for this image' }).click();
      expect(await page.evaluate(() => window.cropRequested)).toBe('pdf-img-1');
      const cleaned = await page.evaluate(({ helperCode, html }) => new Function(helperCode + '\nreturn _stripGeneratedImageEditorControls;')()(html, true), { helperCode, html: current });
      await page.setContent(cleaned);
      expect(await page.locator('[data-alloflow-crop-control],[data-alloflow-image-replace]').count()).toBe(0);
    } finally { await page.close(); }
  });
});
