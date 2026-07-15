import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const source = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = source.indexOf('const _READER_APP_CSS =');
const end = source.indexOf('\nconst DOC_MODES =', start);
if (start === -1 || end === -1) throw new Error('standalone reader extraction markers missing');
const _wrapAsReaderApp = new Function(source.slice(start, end) + '; return _wrapAsReaderApp;')();

describe('standalone accessible HTML reader', () => {
  it('wraps once, preserves document language, and remains fully offline', () => {
    const html = '<!doctype html><html lang="fr-CA"><head><title>Leçon</title></head><body><main><h1>Bonjour</h1></main></body></html>';
    const wrapped = _wrapAsReaderApp(html);
    expect(wrapped).toContain('id="allo-reader-bar"');
    expect(wrapped).toContain('id="allo-reader-script"');
    expect(wrapped).toContain('<html lang="fr-CA">');
    expect(wrapped).not.toMatch(/<script[^>]+src=/i);
    expect(wrapped).not.toMatch(/https?:\/\//i);
    expect(_wrapAsReaderApp(wrapped)).toBe(wrapped);
  });

  it('sets every speech utterance language from the exported document', () => {
    const spoken = [];
    const wrapped = _wrapAsReaderApp(
      '<!doctype html><html lang="es-MX"><head><title>Lección</title></head><body><main><h1>La fotosíntesis</h1><p>Las plantas convierten la luz en energía.</p></main></body></html>'
    );
    const dom = new JSDOM(wrapped, {
      runScripts: 'dangerously',
      url: 'https://reader.test/',
      beforeParse(window) {
        window.SpeechSynthesisUtterance = class {
          constructor(text) { this.text = text; this.rate = 1; this.lang = ''; }
        };
        window.speechSynthesis = {
          cancel() {},
          speak(utterance) { spoken.push(utterance); },
        };
      },
    });
    dom.window.document.getElementById('allo-rd-play').click();
    expect(spoken.length).toBeGreaterThan(0);
    expect(spoken.every((utterance) => utterance.lang === 'es-MX')).toBe(true);
    expect(spoken.map((utterance) => utterance.text).join(' ')).toContain('fotosíntesis');
    expect(spoken.map((utterance) => utterance.text).join(' ')).not.toContain('Reading tools');
    dom.window.close();
  });

  it('adds the same reader to translated, plain-language, and edited-preview HTML downloads', () => {
    expect(source).toContain("new Blob([_wrapAsReaderApp(pdfFixResult._translation.html)], { type: 'text/html' })");
    expect(source).toContain("new Blob([_wrapAsReaderApp(pdfFixResult._plainLanguage.html)], { type: 'text/html' })");
    expect(source).toMatch(/setPdfFixResult\(prev => \(\{ \.\.\.prev, accessibleHtml: html \}\)\);\s+const blob = new Blob\(\[_wrapAsReaderApp\(html\)\]/);
  });
});
