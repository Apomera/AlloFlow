import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = source.indexOf('const fixContrastViolations = (htmlContent) => {');
const end = source.indexOf('\n  };', start) + 4;
const makeFix = (Parser) => new Function('DOMParser', source.slice(start, end) + '\nreturn fixContrastViolations;')(Parser);
const fixContrastViolations = makeFix(DOMParser);
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
const channels = (value) => { const color = value === 'white' ? '#ffffff' : value; return color.startsWith('#')
  ? color.slice(1).match(/../g).map((v) => parseInt(v, 16))
  : color.match(/[\d.]+/g).slice(0, 3).map(Number); };
const luminance = (color) => channels(color).map((v) => v / 255)
  .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const wrap = (body) => '<html><head><style>body{background:#fff}</style></head><body>' + body + '</body></html>';

describe('deterministic contrast repair respects inherited surfaces', () => {
  it.each([
    ['Replace', '#475569'],
    ['Upload image', '#1d4ed8'],
    ['Pick extracted', '#7c3aed'],
    ['Generate (AI)', '#0f766e'],
  ])('keeps the passing white %s label on its generated image control', (text, background) => {
    const html = wrap(`<label style="background:${background};color:#fff !important"><svg aria-hidden="true"></svg><span style="color:#ffffff !important">${text}</span></label>`);
    const result = fixContrastViolations(html);
    const doc = parse(result.html);
    const label = doc.querySelector('span');
    expect(label.style.color).toBe('rgb(255, 255, 255)');
    expect(label.style.getPropertyPriority('color')).toBe('important');
    expect(contrast(label.style.color, background)).toBeGreaterThanOrEqual(4.5);
    expect(result.html).not.toContain('alloflow-inherited-color');
  });

  it.each(['white', 'rgb(255,255,255)', '#fff'])('handles %s on a distant ancestor through transparent wrappers', (foreground) => {
    const html = wrap(`<section style="background:#172554"><div style="background:transparent"><label><span data-padding="${'x'.repeat(800)}" style='color:${foreground} !important'>Read this label</span></label></div></section>`);
    const doc = parse(fixContrastViolations(html).html);
    expect(contrast(doc.querySelector('span').style.color, '#172554')).toBeGreaterThanOrEqual(4.5);
  });

  it('repairs a genuinely failing foreground against its nearest inherited background', () => {
    const html = wrap('<div style="background:#172554"><span style="color:#737373 !important">Important instruction</span></div>');
    const result = fixContrastViolations(html);
    const style = parse(result.html).querySelector('span').style;
    expect(contrast(style.color, '#172554')).toBeGreaterThanOrEqual(4.5);
    expect(style.getPropertyPriority('color')).toBe('important');
  });

  it.each(['#475569', '#1d4ed8', '#7c3aed', '#0f766e'])('recovers an already damaged image-control label on %s', (background) => {
    const html = wrap(`<label style="background:${background};color:#fff"><span style="color:#737373 !important">Image action</span></label>`);
    const first = fixContrastViolations(html).html;
    const second = fixContrastViolations(first).html;
    const firstColor = parse(first).querySelector('span').style.color;
    expect(contrast(firstColor, background)).toBeGreaterThanOrEqual(4.5);
    expect(parse(second).querySelector('span').style.color).toBe(firstColor);
  });

  it('handles unquoted style attributes without rewriting unrelated source text', () => {
    const html = wrap('<div style="background:#172554"><span style=color:rgb(255,255,255)>Read &amp; retain</span></div>');
    const result = fixContrastViolations(html).html;
    expect(parse(result).querySelector('span').style.color).toBe('rgb(255, 255, 255)');
    expect(result).toContain('Read &amp; retain');
  });

  it('uses the nearest light surface rather than a more distant dark ancestor', () => {
    const html = wrap('<section style="background:#172554"><div style="background:#f8fafc"><span style="color:white">Required text</span></div></section>');
    const color = parse(fixContrastViolations(html).html).querySelector('span').style.color;
    expect(contrast(color, '#f8fafc')).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves colors over an unresolved gradient for rendered contrast checks', () => {
    const html = wrap('<div style="background:linear-gradient(#172554,#1e293b)"><span style="color:white">Gradient label</span></div>');
    expect(parse(fixContrastViolations(html).html).querySelector('span').style.color).toBe('white');
  });

  it('does not treat closed sibling backgrounds or color strings in handlers as ancestry', () => {
    const html = wrap('<div style="background:#172554">Dark block</div><p style="color:white" onclick="this.dataset.note=\'color:white\'">White text on the page</p>');
    const result = fixContrastViolations(html);
    const p = parse(result.html).querySelector('p');
    expect(contrast(p.style.color, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(p.getAttribute('onclick')).toBe("this.dataset.note='color:white'");
  });
});


describe('contrast repair requires usable ancestry evidence', () => {
  const html = wrap('<label style="background:#475569;color:#fff"><span style="color:white !important">Replace</span></label><p style="color:white">Needs rendered review</p>');
  it('is an explicit no-op without DOMParser', () => {
    expect(makeFix(undefined)(html)).toEqual({ html, fixCount: 0 });
  });
  it('preserves the original HTML when DOM parsing fails', () => {
    class BrokenParser { parseFromString() { throw new Error('DOM parse unavailable'); } }
    expect(makeFix(BrokenParser)(html)).toEqual({ html, fixCount: 0 });
  });
  it('recognizes Chromium solid-background shorthand with backgroundImage initial', () => {
    class ChromiumStyleParser extends DOMParser {
      parseFromString(...args) {
        const doc = super.parseFromString(...args);
        doc.querySelectorAll('[style]').forEach((el) => {
          if (el.style.backgroundColor) Object.defineProperty(el.style, 'backgroundImage', { get: () => 'initial' });
        });
        return doc;
      }
    }
    const damaged = html.replace('color:white !important', 'color:#737373 !important');
    const repaired = makeFix(ChromiumStyleParser)(damaged).html;
    expect(contrast(parse(repaired).querySelector('span').style.color, '#475569')).toBeGreaterThanOrEqual(4.5);
  });
});


describe('contrast repair defers unresolved stylesheet surfaces', () => {
  it('preserves white inline text on a class-styled dark ancestor without blocking unrelated repairs', () => {
    const html = '<html><head><style>body{background:#fff}.dark{background:#172554}</style></head><body><section class="dark"><span style="color:#ffffff !important">Keep readable</span></section><p style="color:#dddddd">Repair faint page text</p></body></html>';
    const doc = parse(fixContrastViolations(html).html);
    expect(doc.querySelector('span').style.color).toBe('rgb(255, 255, 255)');
    expect(contrast(doc.querySelector('p').style.color, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
  it('preserves the foreground when the element itself has a stylesheet background', () => {
    const html = '<style>.dark{background:#172554}</style><span class="dark" style="color:white">Readable text</span>';
    expect(parse(fixContrastViolations(html).html).querySelector('span').style.color).toBe('white');
  });
  it('defers unknown external stylesheet surfaces instead of assuming a white page', () => {
    const html = '<html><head><link rel="stylesheet" href="theme.css"></head><body><span style="color:white">Theme-controlled text</span></body></html>';
    expect(parse(fixContrastViolations(html).html).querySelector('span').style.color).toBe('white');
  });
});
