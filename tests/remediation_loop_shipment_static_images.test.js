// 2026-10-25 keyless corpus runs. Three ways a correct remediation reached families broken:
// 1. the fix loop reverted to the pre-fix document whenever ANY checker's evidence was missing,
//    so every fix pass was silently thrown away (a pass scoring AI 90 shipped as the pre-fix 25);
// 2. a figure whose image never arrived shipped as an editor placeholder (buttons, drag handlers)
//    with its description hidden from screen readers;
// 3. OCR markup ("[Image: ...]", "[text](url)") counted as printed source text, raising false
//    "missing words" / "changed numbers" warnings.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
// ALLO_PIPELINE_SOURCE lets a mutation run point at a private copy instead of the shared file.
const source = readFileSync(process.env.ALLO_PIPELINE_SOURCE || 'doc_pipeline_source.jsx', 'utf8');
const FILE = { file: 'doc_pipeline_source.jsx' };

const shipmentCode = sliceBetween(source, 'function _alloChooseLoopShipment(s) {', '\n}', { ...FILE, includeEnd: true });
const chooseShipment = new Function(shipmentCode + '\nreturn _alloChooseLoopShipment;')();
const ocrCode = sliceBetween(source, 'function _alloStripOcrMarkup(text) {', '\n}', { ...FILE, includeEnd: true });
const stripOcr = new Function(ocrCode + '\nreturn _alloStripOcrMarkup;')();
const controlCode = sliceBetween(source, 'function _stripGeneratedImageEditorControls(html, stripFileHandlers) {', 'function _alloSanitizeRemediationHtml', FILE);
const stripCode = sliceBetween(source, 'function _stripExecutableScripts(html, opts) {', '\n}', { ...FILE, includeEnd: true });
const stripScripts = new Function(controlCode + stripCode + '\nreturn _stripExecutableScripts;')();

describe('fix loop shipment', () => {
  const pre = '<p>pre-fix</p>', fixed = '<p>fixed</p>';
  it('keeps the last working state when no pass had complete evidence', () => {
    expect(chooseShipment({ bestHtml: pre, lastHtml: fixed, bestEvidenceComplete: false, verificationHtml: fixed }))
      .toEqual({ ship: 'last-unverified', dropVerification: false });
  });
  it('drops an audit that describes other bytes', () => {
    expect(chooseShipment({ bestHtml: pre, lastHtml: fixed, bestEvidenceComplete: false, verificationHtml: pre }))
      .toEqual({ ship: 'last-unverified', dropVerification: true });
  });
  it('still reverts to a best version chosen on complete evidence', () => {
    expect(chooseShipment({ bestHtml: pre, lastHtml: fixed, bestEvidenceComplete: true, verificationHtml: fixed }).ship).toBe('best');
  });
  it('is a no-op when best and last are the same bytes', () => {
    expect(chooseShipment({ bestHtml: fixed, lastHtml: fixed, bestEvidenceComplete: false, verificationHtml: pre }).ship).toBe('last');
  });
  it('is wired into the loop, with the audited bytes tracked', () => {
    expect(source.includes('_alloChooseLoopShipment({ bestHtml, lastHtml: accessibleHtml, bestEvidenceComplete: _bestEvidenceComplete, verificationHtml: _verificationHtml })'), 'pinned source line').toBe(true);
    expect(source.includes('if (reVerify) { verification = reVerify; _verificationHtml = accessibleHtml; }'), 'pinned source line').toBe(true);
    expect(source).toMatch(/if \(_loopShipment\.dropVerification\) verification = null;/);
    expect(source).toMatch(/\} else if \(_loopShipment\.ship === 'best'\) \{\s*warnLog\('\[Auto-fix\] Shipping best verified version/);
  });
});

// Same structure the pipeline's figure template emits for an image that never arrived.
const placeholder = (idx) => `<figure id="pdf-img-${idx}-figure" data-img-idx="${idx}" style="position:relative;margin:1em 0">
<button type="button" contenteditable="false" onclick="(function(){})()" aria-label="Remove this image placeholder">Ã—</button>
<div id="pdf-img-${idx}-container" style="background:#f1f5f9" ondragover="event.preventDefault();" ondrop="(function(c,ev){})(this,event)">
<svg aria-hidden="true"></svg>
<span style="font-size:13px">Image from page 1</span>
<span style="font-size:11px">Drag an extracted image here, or:</span>
<div data-alloflow-image-toolbar="pdf-img-${idx}"><button type="button" onclick="(function(btn){})(this)" aria-label="Pick extracted image from this document"><span>Pick extracted</span></button><button type="button" data-allo-genai onclick="(function(b){})(this)"><span>Generate (AI)</span></button></div>
</div>
<figcaption style="font-size:0.9em"><span aria-hidden="true">Logotipo das Escolas PÃºblicas de Portland</span><br><em><span lang="en">Purpose:</span> identifies the district</em></figcaption>
</figure>`;

describe('static delivery of an image that never arrived', () => {
  const html = '<main><p>Antes</p>' + placeholder(1) + '<p>Depois</p></main>';
  it('becomes a readable description with no controls', () => {
    const out = stripScripts(html, { stripImageReplace: true });
    expect(out).not.toMatch(/<button|ondrop|ondragover|onclick|Drag an extracted image|Pick extracted|Generate \(AI\)/);
    expect(out).toContain('<span>Logotipo das Escolas PÃºblicas de Portland</span>');
    expect(out).not.toContain('aria-hidden="true">Logotipo');
    expect(out).toContain('<span lang="en" style="font-weight:600">Image not reproduced:</span>');
    expect(out).toContain('<p>Antes</p>');
    expect(out).toContain('<p>Depois</p>');
  });
  it('leaves a figure that has its image alone', () => {
    const withImg = placeholder(2).replace('<svg aria-hidden="true"></svg>', '<img src="__ALLOFLOW_DATAURL_0__" alt="Logotipo">');
    expect(stripScripts(withImg, { stripImageReplace: true })).toContain('<img src="__ALLOFLOW_DATAURL_0__" alt="Logotipo">');
    expect(stripScripts(withImg, { stripImageReplace: true })).toContain('aria-hidden="true">Logotipo');
  });
  it('keeps the editable placeholder in the app preview (no static delivery)', () => {
    expect(stripScripts(html, {})).toContain('Drag an extracted image here, or:');
  });
  it('says so when there is no description at all', () => {
    const bare = placeholder(3).replace(/<figcaption[\s\S]*<\/figcaption>/, '');
    expect(stripScripts(bare, { stripImageReplace: true })).toContain('no description was available.');
  });
  it('drops the image toolbar wrapper once static delivery has emptied it (civics: an empty box under the logo)', () => {
    const fig = (inner) => '<figure id="pdf-img-4-figure" data-img-idx="4"><div id="pdf-img-4-container"><img src="__ALLOFLOW_DATAURL_1__" alt="Logo">\n<div data-alloflow-image-toolbar="pdf-img-4" style="display:flex;gap:4px">' + inner + '</div>\n</div><figcaption>Logo</figcaption></figure>';
    expect(stripScripts(fig('\n\n\n\n'), { stripImageReplace: true })).not.toContain('data-alloflow-image-toolbar');
    expect(stripScripts(fig('<span>kept</span>'), { stripImageReplace: true })).toContain('data-alloflow-image-toolbar="pdf-img-4"'); // never a wrapper with content
    expect(stripScripts(fig('\n'), {})).toContain('data-alloflow-image-toolbar="pdf-img-4"'); // app preview keeps its editor
  });
});

describe('image crops land where the image is drawn, and pair by overlap', () => {
  const rectsCode = sliceBetween(source, 'var _alloImageRectsFromOpList = function (fnArray, argsArray, OPS, viewportTransform) {', '\n};', { ...FILE, includeEnd: true });
  const rectsOf = new Function(rectsCode + '\nreturn _alloImageRectsFromOpList;')();
  const pairCode = sliceBetween(source, 'var _alloPairBoxesToRegions = function (boxes, regions, minIou) {', '\n};', { ...FILE, includeEnd: true });
  const pair = new Function(pairCode + '\nreturn _alloPairBoxesToRegions;')();
  const OPS = { save: 10, restore: 11, transform: 12, paintImageXObject: 85, paintFormXObjectBegin: 74, paintFormXObjectEnd: 75 };
  const VIEWPORT = [1.5, 0, 0, -1.5, 0, 1188]; // 612 x 792 page rendered at 1.5x
  const near = (a, b) => Math.abs(a - b) < 0.5;
  it('uses the running matrix: the MSAD 52 banner is at y~89, not 408', () => {
    const fn = [12, 10, 12, 85, 11], args = [[1, 0, 0, -1, 0, 792], null, [538.5, 0, 0, -230.18, 36.75, 289.58], null, null];
    const [r] = rectsOf(fn, args, OPS, VIEWPORT);
    expect(near(r.x, 55.1) && near(r.y, 89.1) && near(r.w, 807.8) && near(r.h, 345.3), JSON.stringify(r)).toBe(true);
  });
  it('restore drops a transform; a form XObject matrix applies inside it only', () => {
    const fn = [10, 12, 11, 74, 85, 75, 85];
    const args = [null, [1, 0, 0, 1, 300, 0], null, [[1, 0, 0, 1, 100, 0], [0, 0, 1, 1]], null, null, null];
    const [inForm, after] = rectsOf(fn, args, OPS, VIEWPORT);
    expect(near(inForm.x, 150)).toBe(true); // 100 pt form offset x 1.5, the restored 300 pt shift gone
    expect(near(after.x, 0)).toBe(true);
  });
  it('accepts typed-array arguments as pdf.js supplies them', () => {
    const [r] = rectsOf([12, 85], [new Float32Array([100, 0, 0, 50, 10, 20]), null], OPS, VIEWPORT);
    expect(near(r.w, 150) && near(r.h, 75)).toBe(true);
  });
  it('pairs by overlap regardless of order, and leaves a non-overlapping image unpaired', () => {
    const regions = [{ x0: 0.05, y0: 0.5, x1: 0.95, y1: 0.8 }, { x0: 0.05, y0: 0.07, x1: 0.95, y1: 0.37 }];
    expect(pair([{ x0: 0.06, y0: 0.075, x1: 0.94, y1: 0.365 }, { x0: 0.06, y0: 0.5, x1: 0.94, y1: 0.79 }, null], regions, 0.5)).toEqual([1, 0, -1]);
    expect(pair([{ x0: 0.59, y0: 0.12, x1: 0.69, y1: 0.22 }], [{ x0: 0, y0: 0, x1: 1, y1: 1 }], 0.5)).toEqual([-1]); // an item inside one big illustration
    // One region, two candidate boxes: the closer box gets it, the other is not handed the same picture.
    expect(pair([{ x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.5 }, { x0: 0.1, y0: 0.1, x1: 0.52, y1: 0.52 }], [{ x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.5 }], 0.5)).toEqual([0, -1]);
  });
  it('a small signature still pairs with its real embedded image (notifications run)', () => {
    const looseCode = sliceBetween(source, 'var _alloLooseBox = function (img) {', '\n};', { ...FILE, includeEnd: true });
    const loose = new Function(looseCode + '\nreturn _alloLooseBox;')();
    const sig = loose({ bbox: [0.534, 0.631, 0.605, 0.677] });
    expect(sig).not.toBeNull();
    // The signature's own image region among six tiny decorative icons.
    const regions = [{ x0: 0.1, y0: 0.1, x1: 0.12, y1: 0.12 }, { x0: 0.533, y0: 0.632, x1: 0.604, y1: 0.676 }, { x0: 0.8, y0: 0.9, x1: 0.82, y1: 0.92 }];
    expect(pair([sig], regions, 0.5)).toEqual([1]);
    expect(loose({ bbox: [0.5, 0.5, 0.5, 0.9] })).toBeNull(); // zero width is not a box
    expect(source.includes('const _invBoxes = imgs.map((img) => _alloLooseBox(img));'), 'pairing uses the loose box').toBe(true);
  });
  it('a thin calendar key and a small worksheet item both get a usable box', () => {
    const bboxCode = sliceBetween(source, 'var _alloImageBbox = function (img) {', '\n};', { ...FILE, includeEnd: true });
    const bbox = new Function(bboxCode + '\nreturn _alloImageBbox;')();
    expect(bbox({ bbox: [0.385, 0.471, 0.623, 0.496] })).not.toBeNull();
    expect(bbox({ bbox: [0.591, 0.125, 0.691, 0.221] })).not.toBeNull();
  });
  it('a whole-page region is not cropped under a small item, and a repeated transcription is skipped (ballot)', () => {
    const areaCode = sliceBetween(source, 'var _alloRawBoxArea = function (img) {', '\n};', { ...FILE, includeEnd: true });
    const rawArea = new Function(areaCode + '\nreturn _alloRawBoxArea;')();
    expect(rawArea({ bbox: [0.626, 0.223, 0.659, 0.237] })).toBeLessThan(0.01);
    expect(rawArea({ position: 'top' })).toBeNull();
    expect(source.includes('(_pairedPos.w * _pairedPos.h) >= 0.85 * canvas.width * canvas.height && _rawArea !== null && _rawArea < 0.5'), 'full-page guard wired').toBe(true);
    const shareCode = sliceBetween(source, 'var _alloShareOfWordsPresent = function (text, haystack) {', '\n};', { ...FILE, includeEnd: true });
    const share = new Function(shareCode + '\nreturn _alloShareOfWordsPresent;')();
    const ballot = 'INSTRUCTIONS TO VOTERS: completely fill in the oval. QUESTION 1: Do you favor approving the bond of $81,000,000?';
    expect(share(ballot, 'Sample ballot. ' + ballot + ' Typ:03')).toBe(1);
    expect(share('A bar chart of rainfall by month', ballot)).toBe(0);
    expect(source.includes("_alloShareOfWordsPresent(parsed.extractedText, (htmlDoc2.body && htmlDoc2.body.textContent) || '') >= 0.8"), 'transcription dedupe wired').toBe(true);
  });
  it('is wired into the crop path, with no blind band and no bogus page estimate', () => {
    expect(source.includes('_alloImageRectsFromOpList(opList.fnArray, opList.argsArray, OPS, viewport.transform)'), 'rect walk').toBe(true);
    expect(source.includes('let currentTransform = [1, 0, 0, 1, 0, 0];'), 'old last-transform walk gone').toBe(false);
    expect(source.includes('drawImage(canvas, Math.round(_pairedPos.x), Math.round(_pairedPos.y)'), 'paired region is what gets cropped').toBe(true);
    expect(source.includes("_alloPairBoxesToRegions(_invBoxes, imagePositions.map("), 'overlap pairing').toBe(true);
    expect(source.includes('!(Number(_auditResult && _auditResult.pageCount) >= 1)'), 'real page count not overridden').toBe(true);
  });
});

describe('figure slots pair with images by what they describe; wrong pictures are removed', () => {
  const overlapCode = sliceBetween(source, 'var _alloTextOverlap = function (a, b) {', '\n};', { ...FILE, includeEnd: true });
  const alignCode = sliceBetween(source, 'var _alloAlignImagesToSlots = function (slotTexts, imageTexts) {', '\n};', { ...FILE, includeEnd: true });
  const align = new Function(overlapCode + alignCode + '\nreturn _alloAlignImagesToSlots;')();
  const dropCode = sliceBetween(source, 'function _alloDropImagesAt(html, indexes) {', '\n}', { ...FILE, includeEnd: true });
  const dropAt = new Function(dropCode + '\nreturn _alloDropImagesAt;')();
  it('fixes the worksheet off-by-one: title art in the image list, not in the slots', () => {
    const slots = ['Wood duck bill, flat and wide', 'Rake with long tines', 'Chicken beak short and pointed'];
    const images = ['Beaks and Feet title artwork in orange letters', 'Wood duck with a flat wide bill', 'Garden rake with long metal tines', 'Chicken with a short pointed beak'];
    const r = align(slots, images);
    expect(r.confident).toBe(true);
    expect(r.map).toEqual([1, 2, 3]);
  });
  it('fixes the newsletter shift: a calendar key the slots no longer have', () => {
    const slots = ['MSAD 52 banner with school logos', 'August 2026 school calendar', 'September 2026 school calendar'];
    const images = ['MSAD 52 banner with the school logos', 'August 2026 calendar grid', 'Key to the August calendar colours', 'September 2026 calendar grid'];
    expect(align(slots, images).map).toEqual([0, 1, 3]);
  });
  it('does not pair on one shared word or on short words', () => {
    // "school" is 1 of 3 content words: below the floor.
    expect(align(['District school boundaries'], ['School lunch menu week']).map).toEqual([-1]);
    // Only 3-letter words in common ("cat", "the"): not evidence.
    expect(align(['The cat sat'], ['The cat ran']).map).toEqual([-1]);
  });
  it('is not confident across languages, so the caller keeps the ordinal rule', () => {
    expect(align(['Logotipo das Escolas Públicas', 'Assinatura do superintendente'], ['Portland Public Schools logo', 'Superintendent signature']).confident).toBe(false);
  });
  it('removes the chosen pictures and leaves every other byte alone', () => {
    const html = '<p>a</p><img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="x"><p>b</p><img alt="no src"><img src=\'__ALLOFLOW_DATAURL_FINAL_2__\' alt="y">';
    const out = dropAt(html, [1]);
    expect(out.removed).toEqual(['__ALLOFLOW_DATAURL_FINAL_2__']);
    expect(out.html).toBe('<p>a</p><img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="x"><p>b</p><img alt="no src">');
    expect(dropAt(html, []).html).toBe(html);
  });
  it('a legend caption claims only its best-matching image, never the calendar it explains (newsletter run 3)', () => {
    const claimsCode = sliceBetween(source, 'var _alloLegendImageClaims = function (legendTexts, imageTexts) {', '\n};', { ...FILE, includeEnd: true });
    const claims = new Function(overlapCode + claimsCode + '\nreturn _alloLegendImageClaims;')();
    const images = [
      'MSAD 52 banner with school logos',
      'August 2026 calendar month grid with dated school events',
      'Colour key for the August 2026 calendar: early release, no school, holiday',
      'September 2026 calendar month grid with dated school events',
      'Colour key for the September 2026 calendar: early release, no school, holiday',
    ];
    expect(claims(['Key to the August 2026 calendar colours', 'Key to the September 2026 calendar colours'], images)).toEqual([false, false, true, false, true]);
    expect(claims([], images)).toEqual([false, false, false, false, false]);
  });
  it('the pairing-doubt note is skipped when descriptions paired every slot', () => {
    // (2026-10-28) or every slot that needs a picture (decorative slots excluded: NASA)
    expect(source.includes('if (!_imagePairingTrusted && _placeholderCount > 0 && !(_slotAlign && (_slotAlign.matched === _placeholderCount || (_meaningfulSlots > 0 && _slotAlign.matched >= _meaningfulSlots)))) {'), 'note gated').toBe(true);
  });
  it('refuses when a commented-out image would shift the indexes', () => {
    const html = '<!-- <img src="old.png"> --><img src="__ALLOFLOW_DATAURL_FINAL_1__" alt="x">';
    expect(dropAt(html, [0])).toEqual({ html, removed: [] });
  });
  it('is wired: every image checked, a "no" drops the picture and its token, legend images stay out', () => {
    expect(source.includes('const _altSpot = await _visionAltSpotCheck(accessibleHtml, {\n          sample: 16,'), 'sample 16').toBe(true);
    expect(source.includes("_drop.removed.forEach((src) => { if (/^__ALLOFLOW_DATAURL_FINAL_\\d+__$/.test(src)) delete _deferredImageMap[src]; });"), 'token removed so recovery cannot re-add it').toBe(true);
    expect(source.includes('_alloStaticImagePlaceholders(_drop.html)'), 'delivered figure becomes a description').toBe(true);
    expect(source.includes("window.__alloLegendReplacedTexts.push(_was);"), 'legend repair records what it replaced').toBe(true);
    expect(source.includes("window.__alloLegendReplacedTexts = []; // image blocks legend repair turned into text, fresh each run"), 'reset per run').toBe(true);
    expect(source.includes('const _unplacedImg = (j) => (_pairedImg ? !_pairedImg.has(j) : j >= imgIdx) && !_legendImg[j];'), 'unplaced = unpaired and not legend text').toBe(true);
    expect(source.includes('.filter((j) => _unplacedImg(j) && !_tableImg[j]);'), 'recovered = unplaced and not rebuilt as a table').toBe(true);
    expect(source.includes('? (_slotAlign.map[imgIdx] >= 0 ? extractedImages[_slotAlign.map[imgIdx]] : null)'), 'slot takes its aligned image').toBe(true);
  });
});

describe('a source link is not re-attached a second time', () => {
  const reattachCode = sliceBetween(source, 'function _reattachSourceLinks(html, srcLinks) {', '\n}\n', FILE);
  const reattach = new Function(reattachCode + '\n}\nreturn _reattachSourceLinks;')();
  const form = 'https://forms.gle/bullying';
  it('an anchor already carrying the URL spends its budget (newsletter: wrong link on "this form")', () => {
    const html = '<p>We ask ALL families to complete this form.</p><p>To report bullying, <a href="' + form + '">complete this form</a>.</p>';
    const out = reattach(html, [{ text: 'this form', url: form, occurrences: 1 }]);
    expect(out.count).toBe(0);
    expect(out.html).toBe(html);
  });
  it('still restores a link the extraction flattened', () => {
    const out = reattach('<p>To report bullying, complete this form.</p>', [{ text: 'this form', url: form, occurrences: 1 }]);
    expect(out.count).toBe(1);
    expect(out.html).toContain('<a href="' + form + '">this form</a>');
  });
});

describe('inline language changes in structure text render as markup (WCAG 3.1.2)', () => {
  const { loadAlloModule } = require('./setup.js');
  loadAlloModule('doc_builder_renderer_module.js');
  const renderer = window.AlloModules.DocBuilderRenderer.createRenderer({
    docStyle: { headingColor: '#0f172a', textColor: '#1e293b', accentColor: '#2563eb', bgColor: '#ffffff', sectionBorderColor: '#cbd5e1', tableBg: '#1e3a8a', headerBg: '#1e3a8a' },
    _accessibleHeaderColors: () => null, _alloCellRichText: (v, e) => e(v), _emitAccessibleTableHtml: () => '<table></table>',
    _pipeLog: () => {}, _sanitizeRawHtmlBlock: (h) => String(h || ''), _validateTableGrid: () => ({ ok: false }),
    renderWordArtHtml: (t) => '<span>' + t + '</span>', warnLog: () => {},
  });
  const render = (text, type = 'li') => renderer(type === 'li' ? [{ type: 'ul', items: [text] }] : [{ type, text }]);
  it('a list item keeps <em lang> as a real element, balanced', () => {
    const html = render("escuelas autÃ³nomas (<em lang='en'>charter</em>) y (<em lang='en'>magnet</em>)");
    expect(html).toContain('<em lang="en">charter</em>');
    expect(html).toContain('<em lang="en">magnet</em>');
    expect(html).not.toContain('&lt;em');
  });
  it('a paragraph keeps <span lang dir>', () => {
    expect(render('Hola <span lang="ar" dir="rtl">Ù…Ø±Ø­Ø¨Ø§</span> amigos', 'p')).toContain('<span lang="ar" dir="rtl">Ù…Ø±Ø­Ø¨Ø§</span>');
  });
  it('any other attribute keeps the whole thing escaped', () => {
    const html = render('x <span lang="en" onclick="alert(1)">y</span> z', 'p');
    expect(html).not.toMatch(/<span[^>]*onclick/);
    expect(html).toContain('&lt;span');
  });
  it('table header text has AA contrast on the scheme fill, and a wide table scrolls in a labelled region', () => {
    const red = window.AlloModules.DocBuilderRenderer.createRenderer({
      docStyle: { headingColor: '#0f172a', textColor: '#1e293b', accentColor: '#2563eb', bgColor: '#ffffff', sectionBorderColor: '#cbd5e1', tableBg: '#c0504d', headerBg: '#1e3a8a', tableBorder: '#cbd5e1' },
      _accessibleHeaderColors: () => null, _alloCellRichText: (v, e) => e(v), _emitAccessibleTableHtml: () => '<table></table>',
      _pipeLog: () => {}, _sanitizeRawHtmlBlock: (h) => String(h || ''), _validateTableGrid: () => ({ ok: false }),
      renderWordArtHtml: (t) => '<span>' + t + '</span>', warnLog: () => {},
    });
    const narrow = red([{ type: 'table', caption: 'Totals', headers: ['A', 'B'], rows: [['1', '2']] }]);
    expect(narrow).toContain('background:#c0504d;color:#ffffff;');
    expect(narrow).not.toContain('role="region"');
    const cols = Array.from({ length: 14 }, (_, i) => 'C' + i);
    const wide = red([{ type: 'table', caption: 'Resident expenditures', headers: cols, rows: [cols] }]);
    expect(wide).toMatch(/^<div role="region" aria-label="Resident expenditures" tabindex="0" style="overflow-x:auto;max-width:100%"><table/);
  });
  it('a legend renders with a real text colour and no invalid role', () => {
    const html = renderer([{ type: 'definition_list', caption: 'Key to the August calendar', sections: [{ entries: [{ marker: 'Green', label: 'Early release' }] }] }]);
    expect(html).toContain('<dt');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('role="group"');
  });
  it('a malformed language code is not trusted', () => {
    expect(render('x <em lang="en"><b>y</b></em>', 'p')).toContain('<em lang="en">');
    expect(render('x <em lang="javascript:1">y</em>', 'p')).not.toContain('<em lang="javascript');
  });
});

describe('OCR markup is not printed source text', () => {
  it('drops image descriptions and keeps link text', () => {
    const out = stripOcr('[Image: Logotipo com 72 pontos]\nOlÃ¡ [resumo](https://x/a%20b%202020.pdf) fim');
    expect(out).not.toMatch(/Logotipo|72|2020|https/);
    expect(out).toMatch(/OlÃ¡ resumo fim/);
  });
  it('leaves ordinary brackets alone', () => {
    expect(stripOcr('Item [a] and (b) cost $5 [see note]')).toBe('Item [a] and (b) cost $5 [see note]');
  });
  it('the OCR-correction note reads as a sentence (trust run: "On pages 1, 2, 22 word run(s)")', () => {
    expect(source.includes("msg: 'The scan\\'s text recognition misread some words, and ' + _vaN + ' of them were corrected from a second reading of page'"), 'reworded note').toBe(true);
    expect(source.includes("' word run(s) of the scan\\'s searchable text were taken from the second OCR reading"), 'old garbled note gone').toBe(false);
  });
  it('an OCR-correction note with no digit involved is a caution, not a review item (Aaron, 2026-10-25)', () => {
    expect(source.includes("var note = function (from, to) { if (/\\d/.test(String(from)) || /\\d/.test(String(to))) stats.digitChanges++;"), 'every correction counted for digits').toBe(true);
    expect(source.includes('digitChanges: _aligned.stats.digitChanges || 0 });'), 'carried per page').toBe(true);
    expect(source.includes("const _vaDigits = _va.reduce((a, e) => a + (e && Number.isFinite(e.digitChanges) ? e.digitChanges : 1), 0);"), 'old records without the count stay review').toBe(true);
    expect(source.includes("_structuralFidelityNotes.push({ kind: 'ocrVisionAlignment', caution: _vaDigits === 0,"), 'caution only when no digit changed').toBe(true);
    expect(source.includes('const _contentFidelityConcern = !!integrityWarning || _structuralFidelityNotes.some((n) => !(n && n.caution === true));'), 'caution notes are not a concern').toBe(true);
    expect(source.includes("if (kinds.ocrVisionAlignment) cautions.push("), 'still disclosed as a caution').toBe(true);
    expect(source.includes('hand out the tagged PDF if learners need to answer'), 'form caution no longer promises a PDF').toBe(false);
  });
  it('is applied to the integrity source only for OCR / vision extraction', () => {
    expect(source.includes("const _srcOcrClean = (typeof window !== 'undefined' && /ocr|vision/i.test(String(window.__lastGroundTruthMethod || ''))) ? _alloStripOcrMarkup(_srcMarked) : _srcMarked;"), 'pinned source line').toBe(true);
  });
  it('running headers and footers count once in the integrity source (complaint form: "October 2023")', () => {
    const dropCode = sliceBetween(source, 'function _alloDropRunningLines(text, pages) {', '\n}', { ...FILE, includeEnd: true });
    const drop = new Function(dropCode + '\nreturn _alloDropRunningLines;')();
    const pages = [1, 2, 3, 4].map((n) => ({ pageNum: n, text: 'Section ' + n + ' text.\nOctober 2023' }));
    expect(drop(pages.map((p) => p.text).join('\n'), pages).match(/October 2023/g)).toHaveLength(1);
    // A short line on only two pages is not treated as running (it may be a real repeated sentence).
    const two = [{ text: 'See below.\nYes or no' }, { text: 'Yes or no' }];
    expect(drop(two.map((p) => p.text).join('\n'), two).match(/Yes or no/g)).toHaveLength(2);
    // A line repeated several times on each page ("Vote: Yea- Nay-" under every agenda item) is content.
    const agenda = [1, 2, 3].map((n) => ({ text: 'Item ' + n + 'a\nVote: Yea- Nay-\nItem ' + n + 'b\nVote: Yea- Nay-' }));
    expect(drop(agenda.map((p) => p.text).join('\n'), agenda).match(/Vote: Yea- Nay-/g)).toHaveLength(6);
    // The same on pages handed over as ONE line (USCIS civics): a footnote + page number + URL every page ends with.
    const flat = [1, 2, 3, 4].map((n) => ({ text: 'Question ' + n + '? Answer ' + n + '. * If you are 65 years old you may study fewer questions. -' + n + '- www.uscis.gov' }));
    const flatOut = drop(flat.map((p) => p.text).join('\n\n'), flat);
    expect(flatOut.match(/65 years old/g)).toHaveLength(1);
    expect(flatOut.match(/www\.uscis\.gov/g)).toHaveLength(1);
    expect(flatOut).not.toMatch(/-\d-/); // page numbers gone, even from the kept copy
    expect(flatOut.match(/Question \d\?/g)).toHaveLength(4); // content untouched
    // OSEP letter: "Page 2—Dear Colleague" heads pages 2-16 (dash glued to the number): all copies go, page numbers with them.
    const osep = ['Alpha 10 text.', 'Beta text.', 'Gamma text.', 'Delta text.'].map((b, i) => ({ text: (i ? 'Page ' + (i + 1) + '—Dear Colleague ' : '') + b }));
    const osepOut = drop(osep.map((p) => p.text).join('\n'), osep);
    expect(osepOut).not.toMatch(/Dear Colleague|Page \d/);
    expect(osepOut).toMatch(/Alpha 10 text\.[\s\S]*Beta text\.[\s\S]*Gamma text\.[\s\S]*Delta text\./);
    const agendaFlat = [1, 2, 3].map((n) => ({ text: 'Item ' + n + 'a Vote: Yea- Nay- Item ' + n + 'b Vote: Yea- Nay-' }));
    expect(drop(agendaFlat.map((p) => p.text).join('\n'), agendaFlat).match(/Vote: Yea- Nay-/g)).toHaveLength(6);
    expect(source.includes('const _srcRunning = _alloDropRunningLines(_srcOcrClean, typeof window !== \'undefined\' ? window.__lastGroundTruthPageMap : null);'), 'wired').toBe(true);
    expect(source.includes("const _srcRaw = /<ol\\b/i.test(accessibleHtml || '') ? _srcRunning.replace(/^[ \\t]*\\(?\\d{1,3}[.)][ \\t]+/gm, '') : _srcRunning;"), 'list numbers not counted as values when the output has an <ol>').toBe(true);
  });
  const Plan = require('../desktop/mcp/remediation_narration_plan.cjs');
  it('the connector gate does not count OCR image descriptions or link URLs as missing words', () => {
    const sourceText = '[Image: Logotipo das Escolas PÃºblicas de Portland com a frase prepared]\nOlÃ¡ famÃ­lias, veja o [resumo](https://x/a%20b%202020.pdf) hoje.';
    const outputHtml = '<main><figure><img alt="Logotipo"></figure><p>OlÃ¡ famÃ­lias, veja o <a href="https://x/a%20b%202020.pdf">resumo</a> hoje.</p></main>';
    expect(Plan.assessSourceCoverage({ sourceText, outputHtml, method: 'vision-ocr' }).missingTokens).toBe(0);
    expect(Plan.assessSourceCoverage({ sourceText, outputHtml, method: 'pdfjs' }).missingTokens).toBeGreaterThan(0);
  });
  it('a short footer or repeated table header on 3+ pages counts once (complaint form, expenditure tables)', () => {
    const pages = [1, 2, 3].map((n) => ({ pageNum: n, text: 'ORG ID District Total\nRow ' + n + ' 1,058,319.66\nOctober 2023' }));
    const out = '<table><tr><th>ORG ID</th><th>District</th><th>Total</th></tr><tr><td>Row 1 1,058,319.66</td></tr><tr><td>Row 2 1,058,319.66</td></tr><tr><td>Row 3 1,058,319.66</td></tr></table><p>October 2023</p>';
    expect(Plan.assessSourceCoverage({ sourceText: pages.map((p) => p.text).join('\n'), pages, outputHtml: out, method: 'pdfjs' }).missingTokens).toBe(0);
  });
  it('a line repeated within each page is content, not a running line (agenda: "Vote: Yea- Nay-")', () => {
    const pages = [1, 2, 3].map((n) => ({ pageNum: n, text: 'Motion ' + n + ' carried\nVote: Yea- Nay-\nMotion ' + (n + 10) + ' carried\nVote: Yea- Nay-' }));
    const out = pages.map((p) => '<p>' + p.text.split('\n').join('</p><p>') + '</p>').join('');
    expect(Plan.assessSourceCoverage({ sourceText: pages.map((p) => p.text).join('\n'), pages, outputHtml: out, method: 'pdfjs' }).missingTokens).toBe(0);
    // ...and if the output drops those lines, coverage notices.
    expect(Plan.assessSourceCoverage({ sourceText: pages.map((p) => p.text).join('\n'), pages, outputHtml: out.replace(/<p>Vote: Yea- Nay-<\/p>/g, ''), method: 'pdfjs' }).missingTokens).toBeGreaterThan(0);
  });
  it('a running footer printed on every page counts once', () => {
    const footer = 'The University of Maine is an EEO/AA employer and does not discriminate on the grounds of race';
    const pages = [{ pageNum: 1, text: 'Rain in a Jar\nFill a jar with hot water.\n' + footer }, { pageNum: 2, text: 'Watch the rain fall.\n' + footer }];
    const sourceText = pages.map((p) => p.text).join('\n');
    const outputHtml = '<main><h1>Rain in a Jar</h1><p>Fill a jar with hot water.</p><p>Watch the rain fall.</p><footer><p>' + footer + '</p></footer></main>';
    expect(Plan.assessSourceCoverage({ sourceText, outputHtml, pages, method: 'pdfjs' }).missingTokens).toBe(0);
    // A sentence repeated on the SAME page still counts twice: dropping one copy is a real omission.
    const onePage = [{ pageNum: 1, text: 'Wash your hands before you start.\nWash your hands before you start.' }, { pageNum: 2, text: 'Done.' }];
    expect(Plan.assessSourceCoverage({ sourceText: onePage.map((p) => p.text).join('\n'), outputHtml: '<p>Wash your hands before you start.</p><p>Done.</p>', pages: onePage, method: 'pdfjs' }).missingTokens).toBeGreaterThan(0);
  });
  it('a text layer that split a ligature or used a modifier apostrophe is not missing words', () => {
    const MOD = String.fromCharCode(0x2BC);
    const sourceText = 'Our sta ff will answer from the o ff ice. Parents don' + MOD + 't need the child' + MOD + 's form.';
    const outputHtml = "<p>Our staff will answer from the office. Parents don't need the child’s form.</p>";
    expect(Plan.assessSourceCoverage({ sourceText, outputHtml, method: 'pdfjs' }).missingTokens).toBe(0);
    // The text layer often carries the ligature glyph itself (U+FB00 "ﬀ"), only "ff" after NFKC.
    const LIG = String.fromCharCode(0xFB00);
    expect(Plan.assessSourceCoverage({ sourceText: 'Our sta ' + LIG + ' will drop o ' + LIG + ' forms.', outputHtml: '<p>Our staff will drop off forms.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // Words split at a line end, where the newline already became a space (notifications run).
    expect(Plan.assessSourceCoverage({ sourceText: 'Our plan- ning team and the De- partment of Education agree.', outputHtml: '<p>Our planning team and the Department of Education agree.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // A hyphen at a line end: "long-term" stays two words, "plan-ning" joins, "as follows-" does not glue on.
    expect(Plan.assessSourceCoverage({ sourceText: 'A long-\nterm plan- \nning effort as follows-\nFirst step.', outputHtml: '<p>A long-term planning effort as follows- First step.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // A real hyphenated pair stays two words when the output keeps it hyphenated.
    expect(Plan.assessSourceCoverage({ sourceText: 'A well- known rule.', outputHtml: '<p>A well-known rule.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // Superscript ordinals split by the text layer, and each page's own printed number (syllabus run).
    const pages = [{ pageNum: 1, text: 'Exams in the 8 th and 10 th weeks.\n1' }, { pageNum: 2, text: 'Page 2\nFinal exam in the 12 th week.' }];
    expect(Plan.assessSourceCoverage({ sourceText: pages.map((p) => p.text).join('\n'), pages, outputHtml: '<p>Exams in the 8th and 10th weeks.</p><p>Final exam in the 12th week.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // A number that is content, not the page's own number, still counts.
    const content = [{ pageNum: 1, text: 'Bring\n7\nitems.' }, { pageNum: 2, text: 'Done.' }];
    expect(Plan.assessSourceCoverage({ sourceText: 'Bring\n7\nitems.\nDone.', pages: content, outputHtml: '<p>Bring items.</p><p>Done.</p>', method: 'pdfjs' }).missingTokens).toBeGreaterThan(0);
    // Small caps split as a lone capital, an in-line hyphenation, a capital I for l (1913 Form 1040).
    expect(Plan.assessSourceCoverage({ sourceText: 'G ROSS I NCOME of corpora-tions under the normaI tax.', outputHtml: '<p>GROSS INCOME of corporations under the normal tax.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // A real two-word capital phrase and a real hyphenated word are left alone.
    expect(Plan.assessSourceCoverage({ sourceText: 'A GOOD long-term plan.', outputHtml: '<p>A GOOD long-term plan.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // A real hyphenated word stays split even when the output also has the joined spelling.
    expect(Plan.assessSourceCoverage({ sourceText: 'Our well-being plan. Wellbeing matters.', outputHtml: '<p>Our well-being plan. Wellbeing matters.</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    // A genuine standalone token is not merged into a word the output lacks.
    const keep = Plan.assessSourceCoverage({ sourceText: 'Grade fi results', outputHtml: '<p>Grade results</p>', method: 'pdfjs' });
    expect(keep.missingTokens).toBeGreaterThan(0);
  });
  it('matches the connector coverage gate', () => {
    const plan = readFileSync('desktop/mcp/remediation_narration_plan.cjs', 'utf8');
    expect(plan).toContain(".replace(/\\[Image:[^\\]\\n]*\\]/gi, ' ')");
    expect(plan).toContain(".replace(/\\[([^\\]\\n]*)\\]\\((?:[^()\\s]|\\([^()\\s]*\\))*\\)/g, '$1')");
  });
});

describe('scanned text layer over a script Tesseract cannot read', () => {
  const code = sliceBetween(source, 'function _alloOcrWordsScriptMismatch(words, pageText) {', '\n}', { ...FILE, includeEnd: true });
  const mismatch = new Function(code + '\nreturn _alloOcrWordsScriptMismatch;')();
  const urdu = 'تمہید چونکہ ہر انسان کی ذاتی عزت اور حرمت اور انسانوں کے مساوی اور ناقابل انتقال حقوق';
  it('drops English-model word boxes laid over Urdu (UDHR run: Latin junk drawn as the hidden layer)', () => {
    expect(mismatch([{ t: 'Sabu' }, { t: 'ple' }, { t: 'SS' }, { t: 'pelt' }], urdu)).toBe(true);
    expect(mismatch([{ text: 'Sabu' }, { text: 'ple' }], urdu)).toBe(true);
  });
  it('keeps word boxes in the same script, and Latin pages with a stray foreign word', () => {
    expect(mismatch([{ t: 'تمہید' }, { t: 'چونکہ' }, { t: 'انسان' }], urdu)).toBe(false);
    expect(mismatch([{ t: 'Dear' }, { t: 'families' }], 'Dear families, the meeting is on Monday. شكرا')).toBe(false);
    expect(mismatch([{ t: 'Estimadas' }, { t: 'familias' }], 'Estimadas familias, la reunión es el lunes por la tarde en la escuela.')).toBe(false);
    expect(mismatch([{ t: 'Welcome' }], 'Welcome to our school family. Every family receives this letter in English with a greeting: مرحبا بكم في مدرستنا أهلا وسهلا. Please read the attached calendar, sign the permission form, and return it to the main office by Friday afternoon.')).toBe(false);
    expect(mismatch([], urdu)).toBe(false);
    expect(mismatch([{ t: 'ab' }], 'ہر انسان')).toBe(false); // too little page text to judge
  });
  it('the tagged-PDF builder applies it before choosing the positioned path', () => {
    const at = source.indexOf('if (_ocrWords && _alloOcrWordsScriptMismatch(_ocrWords, ocrText)) {');
    expect(at).toBeGreaterThan(0);
    expect(source.slice(at, at + 400)).toContain('_ocrWords = null;');
    expect(source.indexOf('const _perWord = !!(_ocrWords && _ocrWords.length', at)).toBeGreaterThan(at);
  });
});

describe('the generator placeholder title gives way to the printed title', () => {
  const start = '        // 4. Ensure <title> is non-empty';
  const code = sliceBetween(source, start, '        // 5. Ensure all tables have scope', FILE);
  const helper = sliceBetween(source, 'function _alloTitleFromHeading(html) {', '\nfunction _alloExecutableActiveContentFindings', FILE);
  const preflight = new Function('accessibleHtml', '_fileName', helper + 'let aiFixCount = 0;\n' + start + code + '\nreturn accessibleHtml;');
  const doc = (title, h1) => '<html lang="en"><head><meta charset="utf-8">' + title + '</head><body><main><h1>' + h1 + '</h1><p>x</p></main></body></html>';
  it('replaces "Accessible Document - <file>" with the h1 (English and Urdu UDHR runs)', () => {
    const out = preflight(doc('<title>Accessible Document — ohchr-udhr-english</title>', 'Universal Declaration of Human Rights'), 'ohchr-udhr-english.pdf');
    expect(out.match(/<title>[^<]*<\/title>/g)).toEqual(['<title>Universal Declaration of Human Rights</title>']);
    // with the subtitle line printed under the h1, as the wrapper does (2026-10-27)
    const sub = doc('<title>Accessible Document — msad35</title>', 'Maine SAD 35').replace('<p>x</p>', '<p>Regular Meeting Agenda</p>');
    expect(preflight(sub, 'msad35.pdf').match(/<title>[^<]*<\/title>/g)).toEqual(['<title>Maine SAD 35 – Regular Meeting Agenda</title>']);
  });
  it('keeps an author title, and keeps the placeholder when no plain h1 can name the page', () => {
    const own = doc('<title>Accessible Document Guidelines</title>', 'Other');
    expect(preflight(own, 'x.pdf')).toBe(own);
    const styled = doc('<title>Accessible Document — f</title>', 'Title <em>styled</em>');
    expect(preflight(styled, 'f.pdf')).toBe(styled); // never swapped for the bare file name
  });
});

describe('a zlib content stream cut short before its checksum still decodes (Spanish UDHR p5)', () => {
  const code = sliceBetween(source, '  const _stage4_inflate = (bytes) => {', '\n  };', { ...FILE, includeEnd: true });
  const pako = require('../desktop/mcp/vendor/pako.min.js');
  const inflate = new Function('window', code + '\nreturn _stage4_inflate;')({ pako });
  const zlib = require('node:zlib');
  const content = Buffer.from('BT\n/F1 12 Tf\n72 700 Td\n(Art\xedculo 15) Tj\nET\n'.repeat(40), 'latin1');
  const full = new Uint8Array(zlib.deflateSync(content));
  it('decodes a whole stream exactly as pako does', () => {
    expect(Buffer.from(inflate(full)).equals(content)).toBe(true);
  });
  it('keeps everything that decoded when the last bytes are missing (pako.inflate returns undefined)', () => {
    const cut = full.slice(0, full.length - 4); // checksum gone
    expect(pako.inflate(cut)).toBeUndefined(); // the trap: no throw, no bytes
    const out = inflate(cut);
    expect(Buffer.from(out).equals(content)).toBe(true);
  });
  it('still refuses bytes that are not zlib at all', () => {
    expect(() => inflate(new Uint8Array([1, 2, 3, 4, 5, 6]))).toThrow(/could not be decompressed/);
    expect(() => inflate(full.slice(0, 2))).toThrow(/could not be decompressed/); // a header and nothing else
  });
  it('both page-stream sites use it', () => {
    // includes(), not toContain: a failing toContain diffs the whole 2.5 MB source and hangs vitest.
    expect(source.includes("if (info.filter === 'FlateDecode') bytes = _stage4_inflate(bytes);"), 'probe site').toBe(true);
    expect(source.includes('      bytes = _stage4_inflate(bytes);\n    }') || source.includes('      bytes = _stage4_inflate(bytes);\r\n    }'), 'wrap site').toBe(true);
    expect(source.match(/bytes = window\.pako\.inflate\(bytes\)/g)).toBeNull();
  });
});

describe('coverage: page furniture on pages handed over as one line, and printed bullets (USCIS civics)', () => {
  const Plan = require('../desktop/mcp/remediation_narration_plan.cjs');
  const foot = (n) => '* If you are 65 years old or older you may study j ust the marked 20 questions. -' + n + '- www.uscis.gov';
  const bodies = ['Alpha beta gamma delta.', 'Epsilon zeta eta theta.', 'Iota kappa lambda mu.', 'Nu xi omicron pi.'];
  const pages = bodies.map((b, i) => ({ pageNum: i + 1, text: b + ' ' + foot(i + 1) }));
  const sourceText = pages.map((p) => p.text).join('\n\n');
  it('a footer every page ends with counts once, page numbers aside (was ~400 missing words)', () => {
    const html = '<p>' + bodies.join('</p><p>') + '</p><p>* If you are 65 years old or older you may study just the marked 20 questions.</p><p>www.uscis.gov</p>';
    expect(Plan.assessSourceCoverage({ sourceText, outputHtml: html, pages, method: 'pdfjs' }).missingTokens).toBe(0);
    // The same number on every page ("65") is text, not a page number: an output without it is short one word.
    expect(Plan.assessSourceCoverage({ sourceText, outputHtml: html.replace('65 years', 'years'), pages, method: 'pdfjs' }).missingTokens).toBe(1);
  });
  it('a header every page starts with counts once too', () => {
    const hp = bodies.map((b, i) => ({ pageNum: i + 1, text: 'Form 1234 Instructions Page ' + b }));
    const html = '<p>Form 1234 Instructions Page</p><p>' + bodies.join('</p><p>') + '</p>';
    expect(Plan.assessSourceCoverage({ sourceText: hp.map((p) => p.text).join('\n\n'), outputHtml: html, pages: hp, method: 'pdfjs' }).missingTokens).toBe(0);
  });
  it('words on too few pages are content: a real omission still counts', () => {
    const few = bodies.concat(['Rho sigma tau.', 'Upsilon phi chi.']).map((b, i) => ({ pageNum: i + 1, text: b + (i < 2 ? ' Please return this signed form.' : '') }));
    const html = '<p>' + few.map((p) => p.text.replace(' Please return this signed form.', '')).join('</p><p>') + '</p><p>Please return this signed form.</p>';
    const r = Plan.assessSourceCoverage({ sourceText: few.map((p) => p.text).join('\n\n'), outputHtml: html, pages: few, method: 'pdfjs' });
    expect(r.missingTokens).toBe(5); // 2 of 6 pages is not running furniture: the second copy really is missing
  });
  it('printed bullet glyphs are credited to the output list items, at most one per item', () => {
    const src = 'Fruits ▪ apples ▪ pears ▪ plums'; // U+25AA is a symbol token; U+2022 is punctuation and never counted
    expect(Plan.assessSourceCoverage({ sourceText: src, outputHtml: '<p>Fruits</p><ul><li>apples</li><li>pears</li><li>plums</li></ul>', method: 'pdfjs' }).missingTokens).toBe(0);
    expect(Plan.assessSourceCoverage({ sourceText: src, outputHtml: '<p>Fruits</p><ul><li>apples</li><li>pears plums</li></ul>', method: 'pdfjs' }).missingTokens).toBe(1);
    expect(Plan.assessSourceCoverage({ sourceText: src, outputHtml: '<p>Fruits apples pears plums</p>', method: 'pdfjs' }).missingTokens).toBe(3);
    // Bullets inside numbered items: the bullet credit must not shift the numbered-marker credits (agenda run).
    const mixed = 'Agenda 1. Opening ● roll call ● minutes 2. Budget ● vote 3. Adjourn';
    const mixedHtml = '<p>Agenda</p><ol><li>Opening<ul><li>roll call</li><li>minutes</li></ul></li><li>Budget<ul><li>vote</li></ul></li><li>Adjourn</li></ol>';
    expect(Plan.assessSourceCoverage({ sourceText: mixed, outputHtml: mixedHtml, method: 'pdfjs' }).missingTokens).toBe(0);
  });
  it('a phrase twice on one page is content even when every page ends with it', () => {
    const ag = [1, 2, 3].map((n) => ({ pageNum: n, text: 'Item ' + n + 'a Vote: Yea Nay Item ' + n + 'b Vote: Yea Nay' }));
    const html = '<p>' + ag.map((p) => p.text).join('</p><p>').replace(/Vote: Yea Nay/g, '') + '</p><p>Vote: Yea Nay</p>';
    expect(Plan.assessSourceCoverage({ sourceText: ag.map((p) => p.text).join('\n\n'), outputHtml: html, pages: ag, method: 'pdfjs' }).missingTokens).toBe(15);
  });
  it('a lone lower-case letter rejoins its word only when that letter is not itself a word in the output', () => {
    expect(Plan.assessSourceCoverage({ sourceText: 'study j ust these', outputHtml: '<p>study just these</p>', method: 'pdfjs' }).missingTokens).toBe(0);
    expect(Plan.assessSourceCoverage({ sourceText: 'eat a pple now', outputHtml: '<p>eat a apple now</p>', method: 'pdfjs' }).missingTokens).toBe(1);
  });
});

describe('the fix loop does not re-send a title finding the HTML already settled (USCIS civics)', () => {
  const code = sliceBetween(source, 'function _alloTitleIssueSettled(issue, html) {', '\nfunction _alloExecutableActiveContentFindings', FILE);
  const settled = new Function(code + '\nreturn _alloTitleIssueSettled;')();
  const doc = (title, h1) => '<html><head><title>' + title + '</title></head><body><h1>' + h1 + '</h1></body></html>';
  const issue = { ruleId: 'document-title', issue: "title element reads 'Accessible Document \u2014 uscis-civics-100q'" };
  it('settled once the title is the printed h1', () => {
    expect(settled(issue, doc('Civics Questions for the Naturalization Test', 'Civics Questions <em>for</em> the Naturalization Test'))).toBe(true);
  });
  it('still open while the placeholder stands, the title differs from the h1, or there is no h1', () => {
    expect(settled(issue, doc('Accessible Document \u2014 uscis-civics-100q', 'Accessible Document \u2014 uscis-civics-100q'))).toBe(false);
    expect(settled(issue, doc('Civics', 'Civics Questions for the Naturalization Test'))).toBe(false);
    expect(settled(issue, '<html><head><title>Civics</title></head><body><p>x</p></body></html>')).toBe(false);
    expect(settled(issue, doc('', 'Civics'))).toBe(false);
  });
  it('a finding that quotes the CURRENT title stays open (agenda2: the h1 named the district, not the agenda)', () => {
    const agenda = doc('Maine School Administrative District No. 35', 'Maine School Administrative District No. 35');
    expect(settled({ ruleId: 'document-title', location: '<title>Maine School Administrative District No. 35</title>' }, agenda)).toBe(false);
    expect(settled({ ruleId: 'document-title', location: '&lt;title&gt;Maine School Administrative District No. 35&lt;/title&gt;' }, agenda)).toBe(false);
    // a stale finding quoting the old placeholder is still settled
    expect(settled({ ruleId: 'document-title', location: '<title>Accessible Document — msad35</title>' }, agenda)).toBe(true);
    // the h1 plus its subtitle line is the derived title: settled too
    const sub = '<html><head><title>Maine SAD 35 – Regular Meeting Agenda</title></head><body><h1>Maine SAD 35</h1><p>Regular Meeting Agenda</p></body></html>';
    expect(settled(issue, sub)).toBe(true);
  });
  // (2026-10-28, IRS i1040: location was "document" and the quote sat in the finding's text)
  it('a quote of the current title in the finding TEXT also keeps it open', () => {
    const irs = doc('Standard Deduction Worksheet for Dependents', 'Standard Deduction Worksheet for Dependents');
    expect(settled({ ruleId: 'document-title', location: 'document', issue: 'The page title "Standard Deduction Worksheet for Dependents" names only the first of three worksheets.' }, irs)).toBe(false);
    expect(settled({ ruleId: 'document-title', location: 'document', message: 'Title "standard deduction worksheet for dependents" is too narrow' }, irs)).toBe(false);
    expect(settled({ ruleId: 'document-title', location: 'document', issue: 'The title should describe the worksheets.' }, irs)).toBe(true);
  });
  it('only ever applies to document-title findings', () => {
    expect(settled({ ruleId: 'image-alt', issue: 'x' }, doc('Civics', 'Civics'))).toBe(false);
    expect(settled('a bare string issue', doc('Civics', 'Civics'))).toBe(false);
  });
  it('is wired into the pass entries, and an empty pass skips the fixer', () => {
    // (2026-10-28) entries expand per merged instance after the same filter
    expect(source.includes('.filter((i) => !_alloTitleIssueSettled(i, accessibleHtml))\n              .flatMap((i) =>'), 'entries filter').toBe(true);
    // (2026-10-28) also when only Equal Access reminders are left
    expect(source.includes('const fixedHtml = ((!_fixEntries.length && !_feedbackNow) || _remindersOnly) ? accessibleHtml : await aiFixChunked('), 'skip fixer').toBe(true);
    expect((source.match(/AI audit evidence was incomplete \(/g) || []).length, 'logged once').toBe(1);
  });
});

describe('option B: a generic Equal Access reminder the AI review settled stops holding the verdict (Aaron, 2026-10-26)', () => {
  const code = sliceBetween(source, 'var _ALLO_AI_SETTLED_REMINDERS = ', '\n};', { ...FILE, includeEnd: true });
  const apply = new Function(code + '\nreturn _alloApplyReminderTriage;')();
  const color = { id: 'style_color_misuse', nodes: 1, description: 'Verify color is not used as the only visual means of conveying information' };
  const sensory = { id: 'text_sensory_misuse', nodes: 4, description: "Confirm the word(s) 'larger' is used logically" };
  const ea = () => ({ failViolations: 0, potentialViolations: 2, manualViolations: 0, reviewFindingCount: 2, potentialFindings: [color, sensory], manualFindings: [], score: 96, manualReviewRequired: true, verificationStatus: 'complete-with-review' });
  const triage = (action, key = 'equalAccess|potential|style_color_misuse') => ({ dispositions: [{ key, action, reason: 'The style block only draws a focus ring.' }] });
  it('moves only an allowlisted reminder the AI judged not an issue, disclosed with its reason, and rescores', () => {
    const out = apply(ea(), { dispositions: [triage('not-an-issue').dispositions[0], { key: 'equalAccess|potential|text_sensory_misuse', action: 'not-an-issue', reason: 'x' }] });
    expect(out.potentialFindings.map((f) => f.id)).toEqual(['text_sensory_misuse']); // not on the allowlist: still review
    expect(out.potentialViolations).toBe(1);
    expect(out.reviewFindingCount).toBe(1);
    expect(out.score).toBe(98);
    expect(out.acknowledgedByAiReview).toEqual([expect.objectContaining({ id: 'style_color_misuse', acknowledgedBy: 'ai-review', reason: 'The style block only draws a focus ring.', bucket: 'potential' })]);
  });
  it('clears the review state when it was the only finding', () => {
    const one = Object.assign(ea(), { potentialViolations: 1, reviewFindingCount: 1, potentialFindings: [color], score: 98 });
    const out = apply(one, triage('not-an-issue'));
    expect(out).toMatchObject({ reviewFindingCount: 0, score: 100, manualReviewRequired: false, verificationStatus: 'complete' });
  });
  it('changes nothing for needs-person or fix, another engine, a malformed key, or no triage', () => {
    for (const t of [triage('needs-person'), triage('fix'), triage('not-an-issue', 'axe|incomplete|style_color_misuse'), triage('not-an-issue', 'axe|potential|style_color_misuse'), triage('not-an-issue', 'style_color_misuse'), null, {}]) {
      const input = ea();
      expect(apply(input, t)).toBe(input);
    }
  });
  it('is idempotent and works on the manual bucket', () => {
    const once = apply(ea(), triage('not-an-issue'));
    expect(apply(once, triage('not-an-issue'))).toBe(once);
    const manual = { failViolations: 0, potentialViolations: 0, manualViolations: 1, potentialFindings: [], manualFindings: [color] };
    expect(apply(manual, triage('not-an-issue', 'equalAccess|manual|style_color_misuse'))).toMatchObject({ manualViolations: 0, reviewFindingCount: 0 });
  });
  it('is applied to both final Equal Access results and disclosed in the downloaded report', () => {
    expect(source.includes('      eaResults = _alloApplyReminderTriage(eaResults, _reviewTriage);'), 'final audit').toBe(true);
    expect(source.includes('          _reEa = _alloApplyReminderTriage(_reEa, _reviewTriage);'), 'recovery re-audit').toBe(true);
    expect(source.includes("+ _eaAckRpt.map(function (f) { return '<div style=\"margin-top:4px\">○ ' + esc(f.description || f.id) + ' — judged not an issue by this run\\'s AI review'"), 'report line rendered').toBe(true);
  });
  it('the connector report keeps it as a quick check with the AI reason', () => {
    const V = require('../desktop/mcp/remediation_verification.cjs');
    const compact = V.compactVerificationEvidence({ equalAccess: apply(ea(), triage('not-an-issue')) });
    expect(compact.equalAccess.acknowledgedByAiReview).toEqual([expect.objectContaining({ id: 'style_color_misuse', reason: 'The style block only draws a focus ring.' })]);
    const out = V.explainDelivery({ files: {}, verification: compact });
    expect(out.quickChecks).toEqual(expect.arrayContaining([expect.stringMatching(/^Check that colour is not the only way information is shown\. \(AI review found no problem: The style block only draws a focus ring\.\)$/)]));
    // Nothing acknowledged: the compact evidence keeps its original shape (no empty field).
    expect('acknowledgedByAiReview' in V.compactVerificationEvidence({ equalAccess: ea() }).equalAccess).toBe(false);
  });
});

describe('coverage: OSEP letter artefacts (2026-10-26)', () => {
  const Plan = require('../desktop/mcp/remediation_narration_plan.cjs');
  const cov = (sourceText, outputHtml, pages) => Plan.assessSourceCoverage({ sourceText, outputHtml, pages, method: 'pdfjs' }).missingTokens;
  const bodies = ['Alpha text here.', 'Beta text here.', 'Gamma text here.', 'Delta text here.'];
  it('a header with a dash glued to the page number is furniture: every copy goes', () => {
    const pages = bodies.map((b, i) => ({ pageNum: i + 1, text: (i ? 'Page ' + (i + 1) + '—Dear Colleague ' : '') + b }));
    expect(cov(pages.map((p) => p.text).join('\n'), '<p>' + bodies.join('</p><p>') + '</p>', pages)).toBe(0);
  });
  it('repeated text that does not say "page" keeps one copy, so dropping it still counts', () => {
    const pages = bodies.map((b, i) => ({ pageNum: i + 1, text: 'Section ' + (i + 1) + ' Report ' + b }));
    expect(cov(pages.map((p) => p.text).join('\n'), '<p>' + bodies.join('</p><p>') + '</p>', pages)).toBeGreaterThan(0);
  });
  it('a raised ordinal read early, or set as <sup>, still matches the output', () => {
    expect(cov('released as th part of the 40 Anniversary of IDEA', '<p>released as part of the 40<sup>th</sup> Anniversary of IDEA</p>')).toBe(0);
    expect(cov('the 40 th Anniversary', '<p>the 40<sup>th</sup> Anniversary</p>')).toBe(0);
    expect(cov('with th part of the 40 days', '<p>with part of the 40 days</p>')).toBe(1); // no "40th" in the output: the lone "th" stays missing
    expect(cov('grade th band 40 now', '<p>grade th band 40 now</p>')).toBe(0); // printed as separate words: never joined
  });
  it('a web address wrapped across a line rejoins only when neither piece is a word in the output', () => {
    expect(cov('see acccombinedosersdisputereso lutionqafinalmemo here', '<p>see acccombinedosersdisputeresolutionqafinalmemo here</p>')).toBe(0);
    expect(cov('the black board', '<p>the blackboard black board</p>')).toBe(0); // pieces are words: left alone, and matched as words
    expect(cov('the black board', '<p>the blackboard</p>')).toBe(0); // only the joined word is there: a wrapped word, nothing lost
    expect(cov('the black board', '<p>the board</p>')).toBe(1); // no joined word in the output: "black" really is missing
    expect(cov('the black board', '<p>the blackboard black</p>')).toBe(1); // "black" is a word there: no join, "board" is missing
  });
});

describe('RSU 57 budget run fixes (2026-10-26)', () => {
  const Plan = require('../desktop/mcp/remediation_narration_plan.cjs');
  const cov = (sourceText, outputHtml) => Plan.assessSourceCoverage({ sourceText, outputHtml, method: 'pdfjs' }).missingTokens;
  const escCode = sliceBetween(source, 'var _alloEscapeTextOnce = function (s) {', '\n};', { ...FILE, includeEnd: true });
  const escOnce = new Function(escCode + '\nreturn _alloEscapeTextOnce;')();
  it('an image caption never escapes an entity twice ("ACHIEVING &amp; ENGAGED" on the page)', () => {
    expect(escOnce('ACHIEVING &amp; ENGAGED')).toBe('ACHIEVING &amp; ENGAGED');
    expect(escOnce('Career & Tech <b>')).toBe('Career &amp; Tech &lt;b&gt;');
    expect(escOnce('A&B &#169; &#x2014; &copy; & ;')).toBe('A&amp;B &#169; &#x2014; &copy; &amp; ;');
    // (2026-10-28) through _alloCaptionSpan, which escapes once with the same helper
    expect(source.includes('${_alloCaptionSpan(desc, imgAlt)}</figcaption>') && source.includes("var esc = (typeof _alloEscapeTextOnce === 'function') ? _alloEscapeTextOnce"), 'caption uses it').toBe(true);
  });
  it('the delivered caption no longer carries the English "Purpose:" line (Aaron, option B); the purpose stays in the image metadata', () => {
    expect(source.includes('<span lang="en">Purpose:</span>'), 'no Purpose line in the figure template').toBe(false);
    expect(source.includes("_deferredImageMeta[srcToken] = { alt: imgAlt || '', purpose: purpose || '' };"), 'kept in metadata').toBe(true);
  });
  it('a Wingdings bullet read as a letter is credited to the list items, unless that letter is a word in the output', () => {
    const src = 'Budget u baseline costs u new positions u debt service';
    const list = '<p>Budget</p><ul><li>baseline costs</li><li>new positions</li><li>debt service</li></ul>';
    expect(cov(src, list)).toBe(0);
    expect(cov(src, '<p>Budget baseline costs new positions debt service</p>')).toBe(3); // no list items: nothing to credit
    expect(cov('Plan u is ready u today', '<p>Plan</p><ul><li>is ready</li><li>today u</li></ul>')).toBe(1); // "u" IS a word in the output: no credit, so the second "u" is missing
  });
  it('a figure caption\'s visible description counts as printed text; other hidden text does not', () => {
    expect(cov('Aid 2600 3800 FY09', '<figure><img alt="Chart of aid"><figcaption><span aria-hidden="true">Aid axis 2600 to 3800 from FY09</span></figcaption></figure>')).toBe(0);
    expect(cov('Aid 2600 3800 FY09', '<p aria-hidden="true">Aid 2600 3800 FY09</p><p>Aid</p>')).toBe(3);
  });
});

describe('SIE 515 syllabus: name the unmatched words; a bracketed raised ordinal (2026-10-26)', () => {
  const Plan = require('../desktop/mcp/remediation_narration_plan.cjs');
  const V = require('../desktop/mcp/remediation_verification.cjs');
  const run = (sourceText, outputHtml) => Plan.assessSourceCoverage({ sourceText, outputHtml, method: 'pdfjs' });
  it('a raised suffix read early still joins a number with an opening bracket', () => {
    expect(run('ISBN: 0130461091 nd Introduction to Human Factors Engineering (2 Edition)', '<p>ISBN: 0130461091 Introduction to Human Factors Engineering (2nd Edition)</p>').missingTokens).toBe(0);
  });
  it('the check lists the unmatched words with counts, distinct, in source order', () => {
    const r = run('alpha beta gamma beta delta', '<p>alpha delta</p>');
    expect(r.missingWords).toEqual([{ word: 'beta', count: 2 }, { word: 'gamma', count: 1 }]);
    expect(run('alpha', '<p>alpha</p>').missingWords).toEqual([]);
    const many = run(Array.from({ length: 40 }, (_, i) => 'w' + i).join(' '), '<p>x</p>');
    expect(many.missingWords).toHaveLength(25);
  });
  it('the report names those words instead of token offsets, and does not suggest running again', () => {
    const out = V.explainDelivery({ files: {}, taggedPdfError: 'content_coverage_requires_review', contentCoverage: { missingWords: [{ word: 'rd', count: 1 }, { word: '3', count: 2 }] } });
    expect(out.items[0].detail).toBe('Words not found in the accessible version: "rd", "3" (x2)');
    expect(out.items[0].nextStep).toMatch(/Search the original for the words listed below/);
    expect(out.items[0].nextStep).not.toMatch(/roughly where|Run again,/);
    expect(V.explainDelivery({ files: {}, taggedPdfError: 'content_coverage_requires_review' }).items[0].detail).toBeUndefined();
  });
});
