// Unit tests for _toTesseractLang — maps a detected/user BCP-47/ISO language code to the
// Tesseract.js traineddata code used for OCR (its word boxes drive the positioned searchable
// layer; the right model segments non-Latin scripts correctly). Pins the mapping + the
// normalization + the safe 'eng' fallback for unknowns. (The detection call _detectOcrLanguage
// is a network Gemini call — covered by e2e/manual, not unit-testable headless.)
//
// Anti-drift: extracts the real arrow from source at runtime.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
function extractConst(name) {
  const anchor = 'const ' + name + ' = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('not found: ' + name);
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', at));
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  const head = SRC.slice(at + anchor.length, SRC.indexOf('=>', at));
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + SRC.slice(braceStart, end + 1) + ')');
}
const toTess = extractConst('_toTesseractLang');

describe('_toTesseractLang', () => {
  it('defaults to eng for null / empty / unknown', () => {
    expect(toTess(null)).toBe('eng');
    expect(toTess('')).toBe('eng');
    expect(toTess('xx')).toBe('eng');
    expect(toTess('klingon')).toBe('eng');
  });
  it('maps common European languages', () => {
    expect(toTess('en')).toBe('eng');
    expect(toTess('es')).toBe('spa');
    expect(toTess('fr')).toBe('fra');
    expect(toTess('de')).toBe('deu');
    expect(toTess('it')).toBe('ita');
    expect(toTess('pt')).toBe('por');
    expect(toTess('ru')).toBe('rus');
  });
  it('maps common refugee/ELL languages', () => {
    expect(toTess('ar')).toBe('ara');
    expect(toTess('fa')).toBe('fas');
    expect(toTess('ur')).toBe('urd');
    expect(toTess('vi')).toBe('vie');
    expect(toTess('hi')).toBe('hin');
    expect(toTess('so')).toBe('som');
    expect(toTess('am')).toBe('amh');
    expect(toTess('ja')).toBe('jpn');
    expect(toTess('ko')).toBe('kor');
  });
  it('resolves Chinese script variants', () => {
    expect(toTess('zh')).toBe('chi_sim');
    expect(toTess('zh-CN')).toBe('chi_sim');
    expect(toTess('zh-Hans')).toBe('chi_sim');
    expect(toTess('zh-TW')).toBe('chi_tra');
    expect(toTess('zh-Hant')).toBe('chi_tra');
    expect(toTess('zh-HK')).toBe('chi_tra');
  });
  it('normalizes region subtags, underscores, and case', () => {
    expect(toTess('en-US')).toBe('eng');
    expect(toTess('pt-BR')).toBe('por');
    expect(toTess('ES')).toBe('spa');
    expect(toTess('fr_FR')).toBe('fra');
  });
});
