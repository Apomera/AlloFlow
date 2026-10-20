// <meta charset> inside the first 1024 bytes (1954 scan keyless re-run, 2026-10-20). The four
// injected <style> blocks (contrast-safety, text-spacing, focus-visible, reduced-motion) were each
// inserted straight after <head>, so every delivered HTML file carried its charset at byte ~1,880:
// past the HTML encoding prescan, a validator error and a mojibake risk for the form's "—", "☐", "→".
// Runs the REAL sanitizeStyleForWCAG and the REAL contrast-fixer line, sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const SAN = sliceBetween(SRC, '  const sanitizeStyleForWCAG = (htmlContent, options = {}) => {', '\n  };', { file: 'doc_pipeline_source.jsx' }) + '\n  };';
const CONTRAST_LINE = sliceBetween(SRC, '    // <meta charset> must sit in the first 1024 bytes', '    warnLog(`[Contrast Fix] Fixed', { file: 'doc_pipeline_source.jsx' });
const hoistInContrast = new Function('fixed', CONTRAST_LINE + '\nreturn fixed;');
// Stand-in for fixContrastViolations: injects a contrast-safety block after <head> exactly like the
// real one (~700 bytes), then runs the real fixer's closing line.
const CONTRAST_CSS = '<style>/* a11y-contrast-safety */\n' + '.text-gray-400{color:#4b5563 !important}\n'.repeat(16) + '</style>';
const fakeContrast = (html) => ({ html: hoistInContrast(html.includes('/* a11y-contrast-safety */') ? html : html.replace('<head>', '<head>\n' + CONTRAST_CSS)), fixCount: 0 });
const sanitize = new Function('fixContrastViolations', 'warnLog', SAN + '\nreturn sanitizeStyleForWCAG;')(fakeContrast, () => {});

const HEAD = '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\n<title>Form 1040: U. S. Individual Income Tax Return, 1954</title>\n<style>body { font-family: system-ui; line-height: 1.6 }</style>';
const DOC = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' + HEAD + '\n</head>\n<body><main><h1>Form 1040</h1><p>Losses from fire, storm, or other casualty, or theft — ☐ Yes ☐ No →</p></main></body>\n</html>';
// byte offset of a needle (a position, not an anchored region); -1 when absent
const byteAt = (s, needle) => { const i = s.indexOf(needle); return i < 0 ? -1 : Buffer.byteLength(s.substring(0, i), 'utf8'); };
const MARKERS = ['a11y-contrast-safety', 'a11y-text-spacing', 'a11y-focus-visible', 'a11y-reduced-motion'];

describe('<meta charset> stays inside the 1024-byte encoding prescan', () => {
  it('after the four injected style blocks, the charset is the first thing in <head>', () => {
    const out = sanitize(DOC).html;
    for (const m of MARKERS) expect(out.includes('/* ' + m + ' */'), m).toBe(true);
    const at = byteAt(out, '<meta charset="UTF-8">');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(1024);
    expect(out.indexOf('<head>\n<meta charset="UTF-8">')).toBeGreaterThan(0);
    // cascade order unchanged: the injected baselines still come BEFORE the document's own stylesheet
    for (const m of MARKERS) expect(out.indexOf('/* ' + m + ' */'), m).toBeLessThan(out.indexOf('body { font-family'));
    expect(out.includes('<title>Form 1040: U. S. Individual Income Tax Return, 1954</title>')).toBe(true);
    expect(out.includes('or theft — ☐ Yes ☐ No →')).toBe(true);
  });
  it('is idempotent: a second pass changes nothing', () => {
    const once = sanitize(DOC).html;
    expect(sanitize(once).html).toBe(once);
  });
  it('repairs a file that was already delivered with the charset late', () => {
    const late = sanitize(DOC).html.replace('<head>\n<meta charset="UTF-8">', '<head>').replace('\n<meta name="viewport"', '\n<meta charset="UTF-8">\n<meta name="viewport"');
    expect(byteAt(late, '<meta charset')).toBeGreaterThan(1024);
    expect(byteAt(sanitize(late).html, '<meta charset')).toBeLessThan(1024);
  });
  it('the contrast fixer alone also keeps the charset first (it runs standalone in several places)', () => {
    const out = fakeContrast(DOC).html;
    expect(out.indexOf('<head>\n<meta charset="UTF-8">')).toBeGreaterThan(0);
    expect(out.indexOf('<meta charset')).toBeLessThan(out.indexOf('/* a11y-contrast-safety */'));
  });
  it('handles the http-equiv form and never pulls a charset meta out of <body>', () => {
    const httpEquiv = '<html><head><style>x{}</style><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body></body></html>';
    expect(hoistInContrast(httpEquiv)).toBe('<html><head>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8"><style>x{}</style></head><body></body></html>');
    const inBody = '<html><head><style>x{}</style></head><body><meta charset="utf-8"></body></html>';
    expect(hoistInContrast(inBody)).toBe(inBody);
    expect(hoistInContrast('<html><header><meta charset="utf-8"></header></html>')).toBe('<html><header><meta charset="utf-8"></header></html>');
  });
  it('both functions use the identical line', () => {
    const line = CONTRAST_LINE.split('\n').find((l) => l.includes('fixed = fixed.replace(')).trim().replace(/^fixed = fixed\./, '');
    expect(SAN.includes('html = html.' + line), 'sanitizeStyleForWCAG copy drifted').toBe(true);
  });
});
