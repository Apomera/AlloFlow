// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const ROOT = process.cwd();
const readRepo = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

function extractBraceBlock(src, anchor) {
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error('Anchor not found: ' + anchor);
  let depth = 0;
  let open = -1;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      if (open < 0) open = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (open >= 0 && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('Unbalanced block for anchor: ' + anchor);
}

describe('Wave 8B — Script-Free Image Placeholders + Preview Delegation', () => {
  loadAlloModule('doc_builder_renderer_module.js');
  const Renderer = window.AlloModules.DocBuilderRenderer;
  const render = Renderer.createRenderer({
    docStyle: {
      headingColor: '#0f172a',
      textColor: '#1e293b',
      accentColor: '#2563eb',
      bgColor: '#ffffff',
      sectionBorderColor: '#cbd5e1',
      tableBg: '#1e3a8a',
      headerBg: '#1e3a8a',
    },
    _accessibleHeaderColors: () => null,
    _alloCellRichText: (v, esc) => esc(v),
    _emitAccessibleTableHtml: () => '<table></table>',
    _pipeLog: () => {},
    _sanitizeRawHtmlBlock: (html) => String(html || ''),
    _validateTableGrid: () => ({ ok: false }),
    renderWordArtHtml: (t) => '<span>' + t + '</span>',
    warnLog: () => {},
  });

  it('emits zero inline on*= event handlers and carries declarative data-allo-placeholder-* attributes', () => {
    const html = render([
      {
        type: 'image',
        id: 'chart1',
        alt: 'Enrollment trend "2020-2024"',
        description: "NASA's enrollment chart <2020 & 2024>",
      },
      {
        type: 'image',
        id: 'decor1',
        alt: '',
        description: 'Decorative flourish',
      },
    ]);

    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).toContain('data-img-placeholder="true"');
    expect(html).toContain('data-allo-placeholder-id="pdf-img-ph-chart1"');
    expect(html).toContain('data-allo-placeholder-action="remove"');
    expect(html).toContain('data-allo-placeholder-dropzone="true"');
    expect(html).toContain('data-allo-placeholder-action="upload"');
    expect(html).toContain('data-allo-placeholder-accept="image/*"');
    expect(html).toContain('data-allo-placeholder-action="pick"');
    expect(html).toContain('data-allo-alt="Enrollment trend &quot;2020-2024&quot;"');
    expect(html).toContain('data-allo-decorative="true"');
  });

  it('wires idempotent delegated click/change/dragover/dragleave/drop handling in 04_reports_and_inplace_tagging.js', () => {
    const reportsSrc = readRepo('remediation_modules/pipeline/04_reports_and_inplace_tagging.js');
    expect(reportsSrc).toContain('const _attachPreviewImagePlaceholders = (idoc) => {');
    expect(reportsSrc).toContain('_attachPreviewImagePlaceholders(doc);');

    const attachFnSrc = extractBraceBlock(reportsSrc, 'const _attachPreviewImagePlaceholders = (idoc) => {');
    const attach = new Function(attachFnSrc + ';\nreturn _attachPreviewImagePlaceholders;')();

    const html = render([
      { type: 'image', id: 'slotA', alt: 'Cell diagram', description: 'Diagram of a plant cell' },
      { type: 'image', id: 'slotB', description: 'Chart to remove' },
    ]);

    const idoc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
    let mutations = 0;
    window.__alloflowOnPdfPreviewMutated = () => { mutations++; };
    window.__alloflowExtractedImages = [];

    try {
      // Attach twice to prove idempotency (no duplicate event listeners).
      attach(idoc);
      attach(idoc);

      // 1. Pick with empty extracted list shows friendly notice.
      const pickBtn = idoc.querySelector('#pdf-img-ph-slotA-figure [data-allo-placeholder-action="pick"]');
      pickBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(idoc.querySelector('#pdf-img-ph-slotA-container [data-alloflow-nomsg="true"]')).not.toBeNull();

      // 2. Pick with extracted image renders thumbnail picker and inserts image on click.
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      window.__alloflowExtractedImages = [{ src: samplePng, description: 'Extracted cell photo' }];
      pickBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const thumb = idoc.querySelector('#pdf-img-ph-slotA-container [data-alloflow-picker="true"] img');
      expect(thumb).not.toBeNull();
      thumb.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      const insertedImg = idoc.querySelector('#pdf-img-ph-slotA-container > img');
      expect(insertedImg).not.toBeNull();
      expect(insertedImg.getAttribute('src')).toBe(samplePng);
      expect(insertedImg.getAttribute('alt')).toBe('Extracted cell photo');
      expect(idoc.querySelector('#pdf-img-ph-slotA-container').hasAttribute('data-allo-placeholder-dropzone')).toBe(false);
      expect(idoc.querySelector('#pdf-img-ph-slotA-container .allo-img-controls')).not.toBeNull();
      expect(mutations).toBe(1);

      // 3. Remove action removes the target placeholder figure exactly once.
      const removeBtn = idoc.querySelector('#pdf-img-ph-slotB-figure [data-allo-placeholder-action="remove"]');
      removeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(idoc.getElementById('pdf-img-ph-slotB-figure')).toBeNull();
      expect(mutations).toBe(2);
    } finally {
      delete window.__alloflowOnPdfPreviewMutated;
      delete window.__alloflowExtractedImages;
    }
  });
});

describe('Wave 8B — _alloStructureOnlyEdit MathML & Form preservation', () => {
  const pureSrc = readRepo('remediation_modules/pipeline/01_pure_helpers_and_policies.js');
  const visibleTextFn = extractBraceBlock(pureSrc, 'function _alloTriageVisibleText(markup) {');
  const gateFn = extractBraceBlock(pureSrc, 'function _alloStructureOnlyEdit(original, replacement) {');
  const gate = new Function('DOMParser', visibleTextFn + '\n' + gateFn + '\nreturn _alloStructureOnlyEdit;')(DOMParser);

  it('allows safe structural edits when <math> or <form> already existed in original', () => {
    const mathOrig = '<p>Solve <math><mi>x</mi><mo>+</mo><mn>1</mn></math></p>';
    const mathRepl = '<h2>Solve <math aria-label="x plus 1"><mi>x</mi><mo>+</mo><mn>1</mn></math></h2>';
    expect(gate(mathOrig, mathRepl)).toEqual({ ok: true, reason: null });

    const formOrig = '<form><input id="q" type="text"> Search</form>';
    const formRepl = '<form aria-label="Search"><label for="q">Search</label><input id="q" type="text"></form>';
    expect(gate(formOrig, formRepl)).toEqual({ ok: true, reason: null });
  });

  it('still rejects newly introduced <math>, <form>, <script>, <iframe>, <annotation-xml>, or altered form action', () => {
    expect(gate('<p>x + 1</p>', '<p><math><mi>x</mi><mo>+</mo><mn>1</mn></math></p>')).toEqual({ ok: false, reason: 'executable-markup' });
    expect(gate('<p>Search</p>', '<form><p>Search</p></form>')).toEqual({ ok: false, reason: 'executable-markup' });
    expect(gate('<form><p>Search</p></form>', '<form action="https://evil.example"><p>Search</p></form>')).toEqual({ ok: false, reason: 'executable-markup' });
    expect(gate('<p><math><mi>x</mi></math></p>', '<p><math><mi>x</mi></math><script>alert(1)</script></p>')).toEqual({ ok: false, reason: 'executable-markup' });
    expect(gate('<p><math><mi>x</mi></math></p>', '<p><math><annotation-xml encoding="text/html"><img src="a" onerror="x()"></annotation-xml><mi>x</mi></math></p>')).toEqual({ ok: false, reason: 'executable-markup' });
    expect(gate('<form><p>Search</p></form>', '<form onsubmit="alert(1)"><p>Search</p></form>')).toEqual({ ok: false, reason: 'executable-markup' });
    expect(gate('<p>Hello</p>', '<iframe src="about:blank"></iframe><p>Hello</p>')).toEqual({ ok: false, reason: 'executable-markup' });
  });

  it('rejects dropping pre-existing <math> or <form> elements', () => {
    expect(gate('<div><math><mi>x</mi></math></div>', '<div>x</div>').ok).toBe(false);
    expect(gate('<form><p>Search</p></form>', '<div><p>Search</p></div>').ok).toBe(false);
  });
});

describe('Wave 8B — Preview/Exporter UI Polish (Custom Color, Brand Match, Preview Audio)', () => {
  const viewCore = readRepo('remediation_modules/view/05_pdf_audit_view_core.jsx');
  const narrationSrc = readRepo('remediation_modules/view/03_epub_daisy_braille_narration.js');

  it('Custom Color contrast badge reads active background color instead of hardcoding #FFFFFF', () => {
    expect(viewCore).not.toContain('const ratio = (1.05) / (lum + 0.05); // contrast vs white');
    expect(viewCore).toContain('const _activeBgRgb = (doc, panel) => {');
    expect(viewCore).toContain('const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);');
    expect(viewCore).toContain('data-custom-color-prop={item.prop}');
    expect(viewCore).toContain("item.prop === 'bgColor'");

    // Execute the real helper logic against a dark background (#111827).
    const parseFn = extractBraceBlock(viewCore, 'const _parseColorRgb = (val) => {');
    const lumFn = extractBraceBlock(viewCore, 'const _relLum = (rgb) => {');
    const activeBgFn = extractBraceBlock(viewCore, 'const _activeBgRgb = (doc, panel) => {');
    const updateBadgeFn = extractBraceBlock(viewCore, 'const _updateContrastBadge = (rowEl, fgVal, bgRgb) => {');
    const helpers = new Function(
      parseFn + '\n' + lumFn + '\n' + activeBgFn + '\n' + updateBadgeFn
      + '\nreturn { _activeBgRgb, _updateContrastBadge };',
    )();

    const previewDoc = new DOMParser().parseFromString('<!DOCTYPE html><html><body style="background-color:#111827"><h1>Title</h1></body></html>', 'text/html');
    const row = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = 'contrast-badge';
    row.appendChild(badge);

    const bgRgb = helpers._activeBgRgb(previewDoc, null);
    expect(bgRgb).toEqual([17, 24, 39]);

    // White text on dark #111827 background passes WCAG AA (>17:1), whereas old hardcoded-white math gave 1.0:1!
    helpers._updateContrastBadge(row, '#ffffff', bgRgb);
    expect(badge.textContent).toMatch(/^✅ 17\.\d:1$/);

    // Dark slate text on dark #111827 background fails WCAG AA.
    helpers._updateContrastBadge(row, '#1e293b', bgRgb);
    expect(badge.textContent).toMatch(/^⚠️ 1\.\d:1$/);
  });

  it('Brand Match runs generated theme HTML through sanitizeStyleForWCAG', () => {
    const brandIdx = viewCore.indexOf("style.id = 'brand-theme';");
    expect(brandIdx).toBeGreaterThan(0);
    const brandSlice = viewCore.slice(brandIdx, brandIdx + 1600);
    expect(brandSlice).toContain('sanitizeStyleForWCAG(fullHtml)');
    expect(brandSlice).toContain('_viewSanitizeMarkupForExport(sanitized.html, _docPipeline)');
  });

  it('Preview audio uses _audioReadyText instead of raw doc.body.textContent and strips editor chrome', () => {
    const audioIdx = viewCore.indexOf('id="preview-audio-dl-btn"');
    expect(audioIdx).toBeGreaterThan(0);
    const audioSlice = viewCore.slice(audioIdx, audioIdx + 900);
    expect(audioSlice).toContain('_audioReadyText(previewHtml)');
    expect(audioSlice).not.toContain('doc?.body?.textContent');
    expect(audioSlice).toContain('.allo-img-controls');

    // Sanity check that _audioReadyText is defined in view modules and handles alt/MathML/aria-hidden.
    expect(narrationSrc).toContain('function _audioReadyText(html, narrationOptions)');
  });
});
