// P5 surgical shared-doc goldens (2026-07-02). The direct-map loop used to apply each
// targeted directive string→string — a full DOMParser parse + serialize of the whole
// document PER directive. The refactor parses once and applies doc-native tools (fnDoc)
// on the shared document. These tests pin: (1) string-path vs doc-path EQUIVALENCE for
// every target-capable tool (shared mutators make drift structurally impossible, this
// proves it stays that way), (2) the parse-count win, (3) fail-safe direction (miss /
// decline / throw leave the input pristine), and (4) _serializeDomEdit's shape contract
// including the fragment head-hoist caveat.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let createDocPipeline, applyDoc, applyStr, serialize, registry;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  createDocPipeline = window.AlloModules.createDocPipeline;
  applyDoc = createDocPipeline.applyToAxeTargetDoc;
  applyStr = createDocPipeline.applyToAxeTarget;
  serialize = createDocPipeline.serializeDomEdit;
  expect(typeof applyDoc).toBe('function');
  const pipeline = createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Document', state: {},
  });
  registry = pipeline.surgicalToolRegistry;
  expect(registry && typeof registry).toBe('object');
});

const FULL = (inner) => `<!DOCTYPE html>\n<html lang="en"><head><title>T</title></head><body><main>${inner}</main></body></html>`;

// One fixture per target-capable tool: [toolName, innerHtml, params, expectChange]
const CASES = [
  ['fix_alt_text', '<img id="t1" src="x.png" alt="">', { target: '#t1', alt: 'A bar chart of rainfall' }, true],
  ['fix_link_text', '<a id="t2" href="/report.pdf">click here</a>', { target: '#t2', newText: 'Download the annual report' }, true],
  ['fix_input_label', '<input id="t3" type="text">', { target: '#t3', label: 'Student name' }, true],
  ['fix_button_name', '<button id="t4"></button>', { target: '#t4', label: 'Submit answers' }, true],
  ['fix_iframe_title', '<iframe id="t5" src="about:blank"></iframe>', { target: '#t5', title: 'Embedded video' }, true],
  ['fix_remove_empty_heading', '<h2 id="t6">   </h2><p>after</p>', { target: '#t6' }, true],
  ['fix_color_contrast', '<p id="t7" style="color:#8a8a8a">Reading passage text</p>', { target: '#t7', fgColor: '#8a8a8a', bgColor: '#ffffff', expectedContrastRatio: 4.5 }, true],
  // Decline paths — the mutator refuses, both paths must be no-ops:
  ['fix_input_label', '<input id="t8" type="text" aria-label="Already named">', { target: '#t8', label: 'New label' }, false],
  ['fix_button_name', '<button id="t9">Save</button>', { target: '#t9', label: 'New label' }, false],
  ['fix_remove_empty_heading', '<h2 id="t10">Real heading</h2>', { target: '#t10' }, false],
];

describe('string-path vs shared-doc-path equivalence (all 7 target-capable tools)', () => {
  for (const [tool, inner, params, expectChange] of CASES) {
    it(`${tool}${expectChange ? '' : ' (decline)'} — identical output both paths`, () => {
      const entry = registry[tool];
      expect(entry).toBeTruthy();
      expect(typeof entry.fnDoc).toBe('function');
      expect(entry.fnDocWhen(params)).toBe(true);
      const HTML = FULL(inner);
      const viaString = entry.fn(HTML, params);
      const doc = new DOMParser().parseFromString(HTML, 'text/html');
      const changed = entry.fnDoc(doc, params);
      const viaDoc = changed ? serialize(HTML, doc) : HTML;
      expect(viaDoc).toBe(viaString);
      expect(changed).toBe(viaString !== HTML);
      if (expectChange) expect(viaString).not.toBe(HTML);
      else expect(viaString).toBe(HTML); // decline → pristine
    });
  }
});

describe('parse-count property — the point of P5', () => {
  it('N sequential doc-native fixes parse ONCE; N string-path fixes parse N times', () => {
    const HTML = FULL('<img id="a" src="1.png" alt=""><img id="b" src="2.png" alt=""><input id="c"><button id="d"></button><iframe id="e" src="about:blank"></iframe>');
    const Real = window.DOMParser;
    let parses = 0;
    window.DOMParser = class extends Real {
      parseFromString(...args) { parses++; return super.parseFromString(...args); }
    };
    try {
      // Legacy string path: one parse per applied fix.
      parses = 0;
      let h = HTML;
      h = registry.fix_alt_text.fn(h, { target: '#a', alt: 'First' });
      h = registry.fix_alt_text.fn(h, { target: '#b', alt: 'Second' });
      h = registry.fix_input_label.fn(h, { target: '#c', label: 'Name' });
      h = registry.fix_button_name.fn(h, { target: '#d', label: 'Go' });
      h = registry.fix_iframe_title.fn(h, { target: '#e', title: 'Map' });
      expect(parses).toBe(5);
      // Shared-doc path: one parse total, serialize once at the end.
      parses = 0;
      const doc = new DOMParser().parseFromString(HTML, 'text/html');
      let dirty = false;
      dirty = registry.fix_alt_text.fnDoc(doc, { target: '#a', alt: 'First' }) || dirty;
      dirty = registry.fix_alt_text.fnDoc(doc, { target: '#b', alt: 'Second' }) || dirty;
      dirty = registry.fix_input_label.fnDoc(doc, { target: '#c', label: 'Name' }) || dirty;
      dirty = registry.fix_button_name.fnDoc(doc, { target: '#d', label: 'Go' }) || dirty;
      dirty = registry.fix_iframe_title.fnDoc(doc, { target: '#e', title: 'Map' }) || dirty;
      const out = dirty ? serialize(HTML, doc) : HTML;
      expect(parses).toBe(1);
      expect(out).toBe(h); // and the batched result equals the legacy sequential result
    } finally {
      window.DOMParser = Real;
    }
  });
});

describe('fail-safe direction', () => {
  const HTML = FULL('<img id="only" src="x.png" alt="">');
  it('selector miss: string path returns the SAME string reference; doc path returns false, doc untouched', () => {
    expect(applyStr(HTML, '#does-not-exist', (el) => el.remove())).toBe(HTML);
    const doc = new DOMParser().parseFromString(HTML, 'text/html');
    const before = doc.documentElement.outerHTML;
    expect(applyDoc(doc, '#does-not-exist', (el) => el.remove())).toBe(false);
    expect(doc.documentElement.outerHTML).toBe(before);
  });
  it('invalid selector: both paths fail safe', () => {
    expect(applyStr(HTML, ':::not a selector:::', (el) => el.remove())).toBe(HTML);
    const doc = new DOMParser().parseFromString(HTML, 'text/html');
    expect(applyDoc(doc, ':::not a selector:::', (el) => el.remove())).toBe(false);
  });
  it('throwing mutator: both paths fail safe (read-then-single-write contract means nothing was written)', () => {
    expect(applyStr(HTML, '#only', () => { throw new Error('boom'); })).toBe(HTML);
    const doc = new DOMParser().parseFromString(HTML, 'text/html');
    const before = doc.documentElement.outerHTML;
    expect(applyDoc(doc, '#only', () => { throw new Error('boom'); })).toBe(false);
    expect(doc.documentElement.outerHTML).toBe(before);
  });
  it('axe nested-frame array targets resolve (last-array form)', () => {
    const out = applyStr(HTML, [['#only']], (el) => { el.setAttribute('alt', 'Nested target form'); });
    expect(out).toContain('Nested target form');
  });
});

describe('_serializeDomEdit shape contract (the head-hoist pin)', () => {
  it('full document: DOCTYPE + documentElement (identical to the string-path serialization)', () => {
    const HTML = FULL('<p id="p">x</p>');
    const doc = new DOMParser().parseFromString(HTML, 'text/html');
    doc.querySelector('#p').textContent = 'y';
    const out = serialize(HTML, doc);
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(out).toContain('<html lang="en">');
    expect(out).toContain('>y</p>');
  });
  it('fragment: body.innerHTML only — no <html>/<body> chrome gained', () => {
    const FRAG = '<p id="p">x</p><ul><li>item</li></ul>';
    const doc = new DOMParser().parseFromString(FRAG, 'text/html');
    doc.querySelector('#p').textContent = 'y';
    const out = serialize(FRAG, doc);
    expect(out).not.toMatch(/<html|<body|<head/i);
    expect(out).toContain('<p id="p">y</p>');
  });
  it('CAVEAT (documented limit): head-only leading content in a FRAGMENT is hoisted and lost — the shared-doc loop must only ever see full documents (it does: accessibleHtml)', () => {
    const FRAG = '<title>hoisted</title><p>kept</p>';
    const doc = new DOMParser().parseFromString(FRAG, 'text/html');
    const out = serialize(FRAG, doc);
    expect(out).toContain('kept');
    expect(out).not.toContain('hoisted'); // the pin: this is WHY fnDoc is wired only into the full-document direct-map loop
  });
});

describe('source pins — the state machine cannot silently regress', () => {
  let src;
  beforeAll(async () => {
    const fs = await import('fs');
    const path = await import('path');
    src = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
  });
  it('all 7 target-capable tools carry fnDoc + fnDocWhen', () => {
    expect((src.match(/fnDoc: function \(doc, p\)/g) || []).length).toBe(7);
    expect((src.match(/fnDocWhen: function \(p\)/g) || []).length).toBe(7);
  });
  it('the direct-map loop is the state machine: parse-once, flush-before-string-tools, drop-doc-on-throw', () => {
    expect(src).toContain("const _dm = { html: currentHtml, doc: null, dirty: false };");
    expect(src).toMatch(/_dmFlush\(\);\s*\n\s*_dm\.html = _entry\.fn\(_dm\.html, _p\);/);
    expect(src).toMatch(/_dm\.doc = null; \/\/ drop the in-flight doc/);
    expect(src).toMatch(/_dmFlush\(\);\s*\n\s*currentHtml = _dm\.html;/);
  });
  it('mutators are shared between fn and fnDoc (no drift surface)', () => {
    for (const m of ['_mutAltText', '_mutLinkText', '_mutInputLabel', '_mutButtonName', '_mutIframeTitle', '_mutRemoveEmptyHeading', '_mutColorContrast']) {
      expect(src, m + ' definition').toContain('const ' + m + ' = ');
      const calls = (src.match(new RegExp(m + '\\(', 'g')) || []).length;
      expect(calls, m + ' must be CALLED by both fn and fnDoc (exactly 2 call sites)').toBe(2);
    }
  });
});
