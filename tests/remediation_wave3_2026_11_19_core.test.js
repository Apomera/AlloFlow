import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const _req = createRequire(import.meta.url);
const _WEB_MODULES = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = _req(resolve(_WEB_MODULES, 'react'));
const ReactDOMClient = _req(resolve(_WEB_MODULES, 'react-dom/client'));
const act = React.act;
window.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROOT = process.cwd();
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const DP_SRC = read('doc_pipeline_source.jsx');
const VIEW_SRC = read('view_pdf_audit_source.jsx');
const MISC_SRC = read('misc_handlers_source.jsx');
const ALT_SRC = read('alt_text_source.jsx');
const REM_HTML = read('remediation.html');

const sliceBetween = (src, startMarker, endMarker) => {
  const s = src.indexOf(startMarker);
  const e = src.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('Missing slice markers: ' + startMarker);
  return src.slice(s, e);
};

// ── W3-C1: createTaggedPdf Stage 5a/5b H43 id+headers & direct-owned rows ──
describe('W3-C1: createTaggedPdf Stage 5a/5b H43 id+headers & direct-owned rows', () => {
  const placeSrc = sliceBetween(DP_SRC, 'function _alloPlaceTableCells(table) {', '// Stamp scope on scope-less');
  const placeTableCells = new Function(placeSrc + '\nreturn _alloPlaceTableCells;')();
  const stage5b = new Function(
    'htmlDoc', '_alloPlaceTableCells',
    sliceBetween(DP_SRC, "      let tableIndex = 0;\n      for (const table of Array.from(htmlDoc.querySelectorAll('table'))) {", '    } catch(tableErr) {')
  );

  it('wires /ID + /Headers for H43 id+headers tables even when <th> has no scope', () => {
    const doc = new DOMParser().parseFromString(
      '<body><table>'
      + '<tr><th id="g1" colspan="2">Fall</th><th id="g2">Spring</th></tr>'
      + '<tr><th id="c1">Midterm</th><th id="c2">Final</th><th id="c3">Exam</th></tr>'
      + '<tr><td headers="g1 c1">88</td><td headers="g1 c2">92</td><td headers="g2 c3">95</td></tr>'
      + '</table></body>',
      'text/html'
    );
    stage5b(doc, placeTableCells);
    const byStructId = {};
    doc.querySelectorAll('th[data-struct-id]').forEach((th) => {
      byStructId[th.getAttribute('data-struct-id')] = th.textContent.trim();
    });
    const resolved = {};
    doc.querySelectorAll('td').forEach((td) => {
      resolved[td.textContent.trim()] = (td.getAttribute('data-headers') || '').split(/\s+/).filter(Boolean).map((id) => byStructId[id]);
    });
    expect(resolved['88']).toEqual(['Fall', 'Midterm']);
    expect(resolved['92']).toEqual(['Fall', 'Final']);
    expect(resolved['95']).toEqual(['Spring', 'Exam']);
  });

  it('honors explicit HTML headers="..." over geometric fallback when both scope and headers exist', () => {
    const doc = new DOMParser().parseFromString(
      '<body><table>'
      + '<tr><th id="h_a" scope="col">Col A</th><th id="h_b" scope="col">Col B</th></tr>'
      + '<tr><td headers="h_b">CrossRef</td><td>Normal</td></tr>'
      + '</table></body>',
      'text/html'
    );
    stage5b(doc, placeTableCells);
    const byStructId = {};
    doc.querySelectorAll('th[data-struct-id]').forEach((th) => {
      byStructId[th.getAttribute('data-struct-id')] = th.textContent.trim();
    });
    const tds = Array.from(doc.querySelectorAll('td'));
    expect((tds[0].getAttribute('data-headers') || '').split(/\s+/).map((id) => byStructId[id])).toEqual(['Col B']);
    expect((tds[1].getAttribute('data-headers') || '').split(/\s+/).map((id) => byStructId[id])).toEqual(['Col B']);
  });

  it('Stage 5a filters direct-owned rows/headers so nested tables cannot pollute outer promotion', () => {
    expect(DP_SRC).toContain("const _directRows = (tbl) => Array.from(tbl.querySelectorAll('tr')).filter((tr) => tr.closest && tr.closest('table') === tbl);");
    expect(DP_SRC).toContain("const _directThs = (tbl) => Array.from(tbl.querySelectorAll('th')).filter((th) => th.closest && th.closest('table') === tbl);");
  });
});

// ── W3-C2: createTaggedPdf _buildOutlineStructElems ──
describe('W3-C2: createTaggedPdf _buildOutlineStructElems PDF/UA-1 list, leaf & decorative fixes', () => {
  const outlineCode = sliceBetween(
    DP_SRC,
    'const _buildOutlineStructElems = () => {',
    '\n    };\n    // b0d24ae3 hypothesis-#1 hook'
  );
  const buildTree = (html) => {
    const htmlDoc = new DOMParser().parseFromString(html, 'text/html');
    const assigned = new Map();
    const unifiable = [];
    let refSeq = 0;
    const context = {
      nextRef: () => ({ _ref: ++refSeq }),
      obj: (x) => x,
      register: (d) => { const r = { _ref: ++refSeq }; assigned.set(r, d); return r; },
      assign: (r, d) => { assigned.set(r, d); },
      lookup: (r) => ({ set: (k, v) => { const d = assigned.get(r); if (d) d[(k && k._name) || String(k)] = v; } }),
    };
    const mkName = { of: (s) => ({ _name: s }) };
    const mkStr = { of: (s) => ({ _str: s }) };
    const mkHex = { fromText: (s) => ({ _hex: s }) };
    const mkNum = { of: (n) => ({ _num: n }) };
    const structRootRef = context.nextRef();
    const TAG_TO_PDF_ROLE = {
      h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6', p: 'P',
      table: 'Table', tr: 'TR', th: 'TH', td: 'TD', caption: 'Caption',
      ul: 'L', ol: 'L', li: 'LI', img: 'Figure', figure: 'Figure',
      blockquote: 'BlockQuote', a: 'Link',
    };
    const fn = new Function(
      'htmlDoc', '_outlineItems', 'TAG_TO_PDF_ROLE', 'PDFName', 'PDFString', 'PDFHexString', 'PDFNumber',
      'context', 'structRootRef', '_unifiableLeafRefs', 'idTreeEntries', 'warnLog', 'HEADING_LEVEL', '_alloFigureCrop',
      outlineCode + '\n    };\n; return _buildOutlineStructElems;'
    )(htmlDoc, [], TAG_TO_PDF_ROLE, mkName, mkStr, mkHex, mkNum, context, structRootRef, unifiable, [], () => {},
      { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }, () => null);
    fn();
    return { assigned, unifiable };
  };
  const kidRoles = (assigned, dict) => (Array.isArray(dict.K) ? dict.K : []).map((r) => assigned.get(r)?.S?._name);

  it('nests sub-lists inside L > LI > LBody > L, uses bullet for <ul> inside <ol>, and emits /ListNumbering', () => {
    const { assigned } = buildTree(
      '<html><body><ol><li>Outer item<ul><li>Inner bullet</li></ul></li></ol></body></html>'
    );
    const lists = Array.from(assigned.values()).filter((d) => d?.S?._name === 'L');
    expect(lists).toHaveLength(2);
    // Neither /L may directly contain another /L
    for (const l of lists) {
      expect(kidRoles(assigned, l)).toEqual(['LI']);
    }
    const numberings = lists.map((l) => l.A?.ListNumbering?._name).sort();
    expect(numberings).toEqual(['Decimal', 'Disc']);
    // Outer LBody contains [P("Outer item"), L]
    const lBodies = Array.from(assigned.values()).filter((d) => d?.S?._name === 'LBody');
    const outerBody = lBodies.find((b) => Array.isArray(b.K) && kidRoles(assigned, b).includes('L'));
    expect(outerBody).toBeTruthy();
    expect(kidRoles(assigned, outerBody)).toEqual(['P', 'L']);
    // Labels: outer is "1.", inner is "•" (NOT "1.")
    const lbls = Array.from(assigned.values())
      .filter((d) => d?.S?._name === 'Lbl')
      .map((d) => d.ActualText?._hex);
    expect(lbls).toEqual(['1.', '•']);
  });

  it('respects <ol start="N"> and <li value="M"> numbering', () => {
    const { assigned } = buildTree(
      '<html><body><ol start="5"><li>Five</li><li value="10">Ten</li><li>Eleven</li></ol></body></html>'
    );
    const lbls = Array.from(assigned.values())
      .filter((d) => d?.S?._name === 'Lbl')
      .map((d) => d.ActualText?._hex);
    expect(lbls).toEqual(['5.', '10.', '11.']);
  });

  it('does not double-emit <p> inside <td>/<li>/<blockquote> (including <blockquote> inside promoted <li>/<td>) and keeps direct <p> inside promoted <li>', () => {
    const { assigned } = buildTree(
      '<html><body>'
      + '<table><tr><td><p>Cell A</p><p>Cell B</p></td></tr></table>'
      + '<ul><li><p>Item A</p><p>Item B</p></li></ul>'
      + '<blockquote><p>Quote A</p><p>Quote B</p></blockquote>'
      + '<ul><li><p>Direct intro</p><blockquote><p>Nested quote</p></blockquote><ul><li>Sub</li></ul></li></ul>'
      + '</body></html>'
    );
    const pTexts = Array.from(assigned.values()).filter((d) => d?.S?._name === 'P').map((d) => d.ActualText?._hex);
    expect(pTexts).toEqual(['Direct intro']);
    const td = Array.from(assigned.values()).find((d) => d?.S?._name === 'TD');
    const bqs = Array.from(assigned.values()).filter((d) => d?.S?._name === 'BlockQuote').map((d) => d.ActualText?._hex);
    expect(td.ActualText._hex).toBe('Cell A Cell B');
    expect(bqs).toEqual(['Quote A Quote B', 'Nested quote']);
  });

  it('treats <img alt="">, role="none", and data-allo-kind="decorative" as NonStruct, while keeping equations Formula', () => {
    const { assigned } = buildTree(
      '<html><body>'
      + '<img src="a.png" alt="">'
      + '<img src="b.png" role="none">'
      + '<img src="c.png" data-allo-kind="decorative">'
      + '<img src="eq.png" alt="" data-allo-kind="equation">'
      + '</body></html>'
    );
    const nonStructs = Array.from(assigned.values()).filter((d) => d?.S?._name === 'NonStruct');
    const formulas = Array.from(assigned.values()).filter((d) => d?.S?._name === 'Formula');
    expect(nonStructs).toHaveLength(3);
    expect(formulas).toHaveLength(1);
  });
});

// ── W3-C3 & W3-C4: fixListViolations & fixFormLabels ──
describe('W3-C3 & W3-C4: fixListViolations and fixFormLabels DOM-backed repairs', () => {
  loadAlloModule('doc_pipeline_module.js');
  const _serializeDomEdit = window.AlloModules.createDocPipeline.serializeDomEdit;
  const fixersSrc = sliceBetween(DP_SRC, '  const fixListViolations = (htmlContent) => {', '  // ── fixDecorativeImages:');
  const { fixListViolations, fixFormLabels } = new Function(
    '_serializeDomEdit', 'warnLog',
    fixersSrc + '\nreturn { fixListViolations, fixFormLabels };'
  )(_serializeDomEdit, () => {});

  it('W3-C3: wraps start/middle/end stray elements & text, unwraps sibling & nested <div>s, and preserves nested lists', () => {
    const bad = '<html><body><ul><p>Start</p><li>Mid</li><hr>Tail text</ul>'
      + '<ul><div><div><li>A</li></div></div><div><li>B</li></div></ul>'
      + '<ul><li>Outer<ul><li>Inner</li></ul></li><li>Second</li></ul></body></html>';
    const res = fixListViolations(bad);
    expect(res.fixCount).toBeGreaterThanOrEqual(6);
    const doc = new DOMParser().parseFromString(res.html, 'text/html');
    const lists = Array.from(doc.querySelectorAll('ul'));
    expect(lists).toHaveLength(4);
    // Every direct child element of every <ul> must be <li>
    for (const ul of lists) {
      for (const ch of Array.from(ul.children)) expect(ch.tagName).toBe('LI');
      for (const n of Array.from(ul.childNodes)) {
        if (n.nodeType === 3) expect(n.nodeValue.trim()).toBe('');
      }
    }
    expect(lists[0].textContent).toContain('Start');
    expect(lists[0].textContent).toContain('Tail text');
    expect(lists[1].querySelectorAll('div')).toHaveLength(0);
    expect(Array.from(lists[1].children).map((li) => li.textContent)).toEqual(['A', 'B']);
    expect(lists[2].querySelector('li > ul > li')?.textContent).toBe('Inner');
  });

  it('W3-C4: skips wrapped <label><input>, avoids duplicate IDs, escapes placeholder HTML, and fixes empty aria-label=""', () => {
    const html = '<html><body>'
      + '<label>Email <input type="email" name="email"></label>'
      + '<input id="docpipe-field-1" aria-label="Existing">'
      + '<input type="text" placeholder="Enter <name> &amp; date">'
      + '<input type="text" aria-label="" name="notes">'
      + '<input type="text" title="Search query">'
      + '</body></html>';
    const res = fixFormLabels(html);
    expect(res.fixCount).toBe(2);
    const doc = new DOMParser().parseFromString(res.html, 'text/html');
    // No nested <label> inside <label>
    expect(doc.querySelector('label label')).toBeNull();
    // All IDs unique
    const ids = Array.from(doc.querySelectorAll('[id]')).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    // No injected <name> tag from placeholder
    expect(doc.querySelector('name')).toBeNull();
    const labels = Array.from(doc.querySelectorAll('label.sr-only'));
    expect(labels).toHaveLength(2);
    expect(labels[0].textContent).toBe('Enter <name> & date');
    expect(labels[1].textContent).toBe('Notes');
  });
});

// ── W3-C5: RFC 4180 CSV/TSV, duplicate XLSX truncation note removal, & transcript _paraHtml ──
describe('W3-C5: CSV/TSV RFC 4180 parity, XLSX truncation dedup & transcript HTML escaping', () => {
  it('both misc_handlers_source and view_pdf_audit_source handle BOM, quoted newlines, "" escapes, jagged rows, and pipes', () => {
    for (const [label, src, startMarker, endMarker] of [
      ['misc_handlers', MISC_SRC, 'if (/\\.(csv|tsv)$/i.test(file.name)) {', 'if (text.trim().length < 5)'],
      ['view_pdf_audit', VIEW_SRC, "if (/\\.(csv|tsv)$/i.test(file.name || '')) {", '          }\n          if (!textValue || !textValue.trim())'],
    ]) {
      const snippet = sliceBetween(src, startMarker, endMarker);
      const isView = label === 'view_pdf_audit';
      const fn = new Function(
        'file', isView ? 'textValue' : 'text',
        snippet + '\nreturn ' + (isView ? 'textValue' : 'text') + ';'
      );
      const csv = '\uFEFF"Name","Notes","Score"\r\n"Ada ""Ace""","Line 1\nLine 2 | ok"\r\n"Ben","Solo",95\r\n';
      const md = fn({ name: 'grades.csv' }, csv);
      expect(md, label).toContain('# grades');
      expect(md, label).toContain('| Name | Notes | Score |');
      expect(md, label).toContain('| --- | --- | --- |');
      expect(md, label).toContain('| Ada "Ace" | Line 1 Line 2 \\| ok |  |');
      expect(md, label).toContain('| Ben | Solo | 95 |');
    }
  });

  it('neither misc_handlers nor view_pdf_audit appends a duplicate XLSX truncation note', () => {
    expect(MISC_SRC).not.toContain('row(s) beyond the first 200 per sheet were not included');
    expect(VIEW_SRC).not.toContain('row(s) beyond the first 200 per sheet were omitted');
  });

  it('transcript _paraHtml escapes & before < and preserves escaped \\| inside table cells', () => {
    const paraSrc = sliceBetween(DP_SRC, '        const _paraHtml = (p) => {', '        const _transcriptTitle =');
    const _paraHtml = new Function(paraSrc + '\nreturn _paraHtml;')();
    expect(_paraHtml('## Cost & <Risk>')).toBe('<h2>Cost &amp; &lt;Risk&gt;</h2>');
    expect(_paraHtml('A & B < C')).toBe('<p>A &amp; B &lt; C</p>');
    const tbl = _paraHtml('| A \\| B | C & D |\n| --- | --- |\n| 1 \\| 2 | 3 < 4 |');
    expect(tbl).toContain('<th scope="col">A | B</th><th scope="col">C &amp; D</th>');
    expect(tbl).toContain('<td>1 | 2</td><td>3 &lt; 4</td>');
  });
});

// ── W3-C6: OOXML _officeMediaFromPart & _notesForSlide ──
describe('W3-C6: OOXML relationship order/quote/path normalization & title fallback', () => {
  it('_officeMediaFromPart handles Target-before-Id, single quotes, ./media path, and title alt fallback', async () => {
    const mediaSrc = sliceBetween(DP_SRC, 'const _officeMediaFromPart = async', '\n  // DOM-walker for OOXML');
    const _officeMediaFromPart = new Function(
      '_ooxmlInflatePart', '_ooxmlDeclaredSize', '_OFFICE_IMG_MIME', '_OOXML_RELS_PART_MAX_BYTES',
      mediaSrc + '\nreturn _officeMediaFromPart;'
    )(
      async (f, type) => (type === 'base64' ? f.b64 : f.str),
      (f) => f.size || 100,
      { png: 'image/png' },
      1024 * 1024
    );
    const fakeZip = {
      files: {
        'word/_rels/document.xml.rels': { str: "<Relationships><Relationship Target='./media\\chart.png' Type='img' Id='rId9'/></Relationships>" },
        'word/media/chart.png': { b64: 'iVBORw0KGgo=', size: 120 },
      },
      file(p) { return this.files[p] || null; },
    };
    const partXml = "<w:drawing><wp:docPr id='1' name='Picture 1' title='Bar chart of rainfall'/><a:blip r:embed='rId9'/></w:drawing>";
    const imgs = await _officeMediaFromPart(
      fakeZip,
      'word/_rels/document.xml.rels',
      partXml,
      (tgt) => {
        let p = String(tgt || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/(?:\.\/)+/g, '/');
        if (p.charAt(0) === '/') return p.slice(1).replace(/^(\.\/)+/, '');
        const norm = [];
        for (const seg of ('word/' + p.replace(/^word\//i, '')).split('/')) {
          if (!seg || seg === '.') continue;
          if (seg === '..') { if (norm.length) norm.pop(); } else norm.push(seg);
        }
        return norm.join('/');
      },
      null,
      { used: 0 }
    );
    expect(imgs).toHaveLength(1);
    expect(imgs[0].alt).toBe('Bar chart of rainfall');
    expect(imgs[0].src).toBe('data:image/png;base64,iVBORw0KGgo=');
  });
});

// ── W3-C7: accessibility_evidence_module.js ──
describe('W3-C7: AccessibilityEvidence provenance honesty & 0 <-> N findingDigest diff', () => {
  it('respects executed:false, computes Equal Access reviewCount from potential+manual, and flags 0 <-> N finding changes', () => {
    loadAlloModule('accessibility_evidence_module.js');
    const Ev = window.AlloModules.AccessibilityEvidence;
    const prov = Ev.createEvidenceProvenance({
      profile: 'document-remediation',
      evidence: {
        ai: { executed: false, score: null, runAt: '2026-11-19T12:00:00Z' },
        axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
        equalAccess: { score: 94, failViolations: 0, potentialViolations: 3, manualViolations: 2 },
      },
      findings: [],
    });
    expect(prov.lanes.ai.executed).toBe(false);
    expect(prov.lanes.equalAccess.reviewCount).toBe(5);
    expect(prov.findingDigest).toBeNull();

    const provWithFindings = Ev.createEvidenceProvenance({
      profile: 'document-remediation',
      evidence: {
        ai: { executed: false, score: null, runAt: '2026-11-19T12:00:00Z' },
        axe: { score: 100, totalViolations: 0, totalIncomplete: 0 },
        equalAccess: { score: 94, failViolations: 0, potentialViolations: 3, manualViolations: 2 },
      },
      findings: [{ source: 'axe', ruleId: 'image-alt', issue: 'Missing alt' }],
    });
    const zeroToOne = Ev.compareEvidenceProvenance(prov, provWithFindings);
    expect(zeroToOne.changed).toBe(true);
    expect(zeroToOne.stale).toBe(true);
    expect(zeroToOne.reasons).toContain('findings-changed');

    const oneToZero = Ev.compareEvidenceProvenance(provWithFindings, prov);
    expect(oneToZero.changed).toBe(true);
    expect(oneToZero.stale).toBe(true);
    expect(oneToZero.reasons).toContain('findings-changed');
  });
});

// ── W3-C8: alt_text_module.js ──
describe('W3-C8: alt_text_module hardening, canvas cleanup & ImageAltField label a11y', () => {
  let host, root;
  beforeEach(() => { loadAlloModule('alt_text_module.js'); });
  afterEach(async () => {
    if (root) { await act(async () => root.unmount()); root = null; }
    if (host) { host.remove(); host = null; }
  });

  it('guards String.fromCodePoint against out-of-range entities in Wikimedia metadata', () => {
    const AT = window.AlloModules.AltText;
    const norm = AT.normalizeCommonsPage({
      pageid: 1,
      title: 'File:Test.png',
      imageinfo: [{
        mime: 'image/png',
        thumburl: 'https://upload.wikimedia.org/thumb.png',
        descriptionurl: 'https://commons.wikimedia.org/wiki/File:Test.png',
        extmetadata: {
          LicenseShortName: { value: 'CC0' },
          ImageDescription: { value: 'Valid &#65; and huge &#99999999; and hex &#xFFFFFF;' },
        },
      }],
    });
    expect(norm).toBeTruthy();
    expect(norm.description).toContain('Valid A');
  });

  it('parses fenced or bracket-wrapped draft/screen replies while keeping parseScreenReply strict', () => {
    const AT = window.AlloModules.AltText;
    const draft = AT.parseDraftReply('[Note]: ```json\n[{"index":1,"kind":"photo","alt":"A red fox in snow.","matchesBrief":true}]\n``` [ref]', 1);
    expect(draft?.get(0)?.alt).toBe('A red fox in snow.');
    const screen = AT.parseScreenReply('[Check] [{"index":1,"safe":true,"reason":"","relevant":true,"alt":"Fox."}] [ok]', 1);
    expect(screen?.get(0)?.safe).toBe(true);
    // Strictness preserved: wrong length still rejected
    expect(AT.parseScreenReply('[{"index":1,"safe":true,"reason":"","relevant":true,"alt":"Fox."}]', 2)).toBeNull();
  });

  it('ImageAltField associates label when id is omitted and avoids dangling label[for] when decorative', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => root.render(React.createElement(window.AlloModules.ImageAltField, { value: 'A maple leaf.', decorative: false })));
    const ta = host.querySelector('textarea');
    const lbl = host.querySelector('label[for]');
    expect(ta?.id).toBeTruthy();
    expect(lbl?.getAttribute('for')).toBe(ta.id);

    await act(async () => root.render(React.createElement(window.AlloModules.ImageAltField, { id: 'dec-1', value: '', decorative: true })));
    expect(host.querySelector('textarea')).toBeNull();
    expect(host.querySelector('label[for="dec-1"]')).toBeNull();
  });

  it('clears canvas dimensions in finally blocks across all 3 canvas helpers', () => {
    const count = (ALT_SRC.match(/canvas\.width = 0; canvas\.height = 0;/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ── W3-C9: fixLandmarkFoundations ──
describe('W3-C9: fixLandmarkFoundations empty <title>, skip-link false negative, and custom <main id>', () => {
  const fnSrc = sliceBetween(DP_SRC, 'function fixLandmarkFoundations(html) {', '// Remove EXECUTABLE <script>');
  const fixLandmarkFoundations = new Function(fnSrc + '\nreturn fixLandmarkFoundations;')();

  it('fills empty <title>   </title> from <h1>, ignores body "skip to", and targets custom <main id="content">', () => {
    const raw = '<!DOCTYPE html><html lang="en"><head><title>   </title></head>'
      + '<body><main id="content"><h1>Lab Safety</h1><p>Please skip to question 5 if finished.</p></main></body></html>';
    const once = fixLandmarkFoundations(raw);
    const twice = fixLandmarkFoundations(once);
    expect(twice).toBe(once);
    const doc = new DOMParser().parseFromString(once, 'text/html');
    expect(doc.querySelector('title')?.textContent).toBe('Lab Safety');
    const skip = doc.querySelector('a[href="#content"]');
    expect(skip).toBeTruthy();
    expect(skip.textContent).toMatch(/Skip to main content/i);
  });
});

// ── W3-C10: remediation_audio_module.js & remediation.html ──
describe('W3-C10: remediationAudio resume/disconnect hygiene & remediation.html drift/a11y', () => {
  it('handles rejected ctx.resume() cleanly and disconnects osc & gain on onended', async () => {
    let oscDisconnected = false, gainDisconnected = false, capturedOnEnded = null;
    const fakeCtx = {
      state: 'suspended',
      currentTime: 0,
      destination: {},
      resume: () => Promise.reject(new Error('autoplay blocked')),
      createOscillator: () => ({
        type: 'sine',
        frequency: { value: 0 },
        connect() {},
        disconnect() { oscDisconnected = true; },
        start() {},
        stop() {},
        set onended(fn) { capturedOnEnded = fn; },
      }),
      createGain: () => ({
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        disconnect() { gainDisconnected = true; },
      }),
    };
    const prevCtx = window.getGlobalAudioContext;
    const prevMute = window.isGlobalMuted;
    window.getGlobalAudioContext = () => fakeCtx;
    window.isGlobalMuted = () => false;
    try {
      loadAlloModule('remediation_audio_module.js');
      // Since 2026-11-21 a suspended context only asks to resume and skips that tone (no queued burst later);
      // the rejected resume() must be swallowed and no node created.
      let resumeCalls = 0;
      const rejectResume = fakeCtx.resume;
      fakeCtx.resume = () => { resumeCalls += 1; return rejectResume(); };
      expect(() => window.remediationAudio.chunkGood()).not.toThrow();
      await Promise.resolve(); await Promise.resolve();
      expect(resumeCalls).toBeGreaterThan(0);
      expect(capturedOnEnded).toBe(null);
      // Once running, the tone plays and its nodes disconnect when it ends.
      fakeCtx.state = 'running';
      await new Promise((r) => setTimeout(r, 200)); // past the 150 ms chunk-sound debounce
      window.remediationAudio.chunkGood();
      await Promise.resolve();
      expect(typeof capturedOnEnded).toBe('function');
      capturedOnEnded();
      expect(oscDisconnected).toBe(true);
      expect(gainDisconnected).toBe(true);
    } finally {
      window.getGlobalAudioContext = prevCtx;
      window.isGlobalMuted = prevMute;
    }
  });

  it('remediation.html matches mcpb-v0.11.3 href in CTA text and marks all decorative Lucide icons aria-hidden', () => {
    expect(REM_HTML).toContain('Download\n                            MCPB v0.11.3</a>');
    expect(REM_HTML).not.toContain('Download\n                            MCPB v0.3.5');
    const lucideTags = REM_HTML.match(/<i\b[^>]*data-lucide="[^"]+"[^>]*>/gi) || [];
    expect(lucideTags.length).toBeGreaterThanOrEqual(5);
    for (const tag of lucideTags) {
      expect(tag).toMatch(/\baria-hidden="true"/i);
    }
  });
});
