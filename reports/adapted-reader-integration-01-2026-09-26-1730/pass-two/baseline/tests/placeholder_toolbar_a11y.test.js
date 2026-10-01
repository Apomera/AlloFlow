// Image-placeholder toolbar accessibility (NCES tables pilot, 2026-09-13).
//
// The pipeline injects an upload / pick / generate toolbar into every image placeholder. On the
// pilot, IBM Equal Access failed the pick and generate buttons four times over (label_name_visible:
// the aria-label did not contain the visible text), and the fix loop could never repair it because
// the candidate gate rejects any chunk whose form-control names change. That one stranded failure
// held the document headline at 76 while the AI layer sat at 95 and axe at 100. Two injected
// colours also failed 4.5:1: the 11 px hint on the grey box (4.34:1) and the teal Generate control
// (3.74:1). These locks keep the generated markup accessible at the source, in BOTH placeholder
// renderers, and keep the chart-data table captioned.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const PIPELINE = read('doc_pipeline_source.jsx');
const RENDERER = read('doc_builder_renderer_source.jsx');

const channels = (hex) => hex.slice(1).match(/../g).map((v) => parseInt(v, 16));
const luminance = (hex) => channels(hex).map((v) => v / 255)
  .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

// Every generated toolbar button: its aria-label and the white label span that follows it.
const buttonNames = (src) => {
  const out = [];
  const re = /<button[^>]*?aria-label="([^"]+)"[^>]*>(?:(?!<\/button>)[\s\S])*?<span style="color:#ffffff !important">([^<]+)<\/span><\/button>/g;
  let m;
  while ((m = re.exec(src))) out.push({ name: m[1], visible: m[2].trim() });
  return out;
};

describe('placeholder toolbar: accessible names contain the visible label (WCAG 2.5.3, IBM label_name_visible)', () => {
  it('pipeline placeholder buttons', () => {
    const names = buttonNames(PIPELINE);
    expect(names.map((n) => n.visible)).toEqual(expect.arrayContaining(['Pick extracted', 'Generate (AI)']));
    for (const n of names) expect(n.name, n.visible).toContain(n.visible);
  });
  it('doc-builder renderer placeholder buttons', () => {
    const names = buttonNames(RENDERER);
    expect(names.map((n) => n.visible)).toEqual(expect.arrayContaining(['Pick extracted']));
    for (const n of names) expect(n.name, n.visible).toContain(n.visible);
  });
  it('the old non-matching names are gone, and the placeholder carry-out still recognises both spellings', () => {
    expect(PIPELINE).not.toContain('aria-label="Pick from extracted images"><svg');
    expect(RENDERER).not.toContain('aria-label="Pick from extracted images"');
    expect(PIPELINE).not.toContain('aria-label="Generate an AI illustration');
    // A document remediated before this change still carries the old label; the nested-block
    // carry-out must keep recognising it as pipeline chrome.
    expect(PIPELINE).toContain('button[aria-label="Pick extracted image from this document"],button[aria-label="Pick from extracted images"]');
  });
  it('the Generate control label carries no emoji (an emoji in the visible text can never be contained by a spoken name)', () => {
    expect(PIPELINE).toContain('<span style="color:#ffffff !important">Generate (AI)</span></button>');
    expect(PIPELINE).not.toContain('✨ Generate (AI)</span>');
  });
});

describe('placeholder toolbar: injected colours meet 4.5:1', () => {
  it('the Generate control is white on #0f766e, not the 3.74:1 teal', () => {
    expect(PIPELINE).toContain('background:#0f766e;color:#ffffff !important;border:1px solid #115e59');
    expect(PIPELINE).not.toContain('background:#0d9488;color:#ffffff !important');
    expect(contrast('#ffffff', '#0f766e')).toBeGreaterThanOrEqual(4.5);
  });
  it('the 11 px hint on the #f1f5f9 box is #475569 in both renderers, not the 4.34:1 grey', () => {
    for (const [label, src] of [['pipeline', PIPELINE], ['renderer', RENDERER]]) {
      expect(src, label).toContain('font-size:11px;color:#475569;font-style:italic">Drag an extracted image here, or:</span>');
      expect(src, label).not.toContain('font-size:11px;color:#64748b;font-style:italic">Drag an extracted image here');
    }
    expect(contrast('#475569', '#f1f5f9')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#64748b', '#f1f5f9')).toBeLessThan(4.5); // the defect this guards against
  });
});

describe('chart-data table carries a caption', () => {
  it('the AI-estimated chart data table opens with a caption naming the chart', () => {
    expect(PIPELINE).toContain("'<table><caption>' + esc2(_chartCaption) + '</caption><thead><tr>'");
    expect(PIPELINE).toContain("const _chartCaption = 'Chart data, AI-estimated' + (_capAlt ? ': ' + _capAlt.slice(0, 160) : '');");
  });
});

describe('built modules carry the change', () => {
  it.each([
    'doc_pipeline_module.js',
    'desktop/web-app/public/doc_pipeline_module.js',
    'doc_builder_renderer_module.js',
    'desktop/web-app/public/doc_builder_renderer_module.js',
  ])('%s', (file) => {
    if (!existsSync(resolve(process.cwd(), file))) return; // mirror absent in a partial checkout
    const built = read(file);
    expect(built).toContain('aria-label="Pick extracted image from this document"><svg');
    expect(built).not.toContain('aria-label="Pick from extracted images"><svg');
  });
});
