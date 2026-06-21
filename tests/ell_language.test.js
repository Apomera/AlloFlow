// ELL language support (2026-06-20) — from the pipeline-enhancement workflow.
// (1) Apply the AUDIT-DETECTED document language to <html lang>, INCLUDING overriding a valid-but-
//     wrong attribute (a Somali/Spanish handout shipped as lang="en" mis-announces the whole doc to a
//     screen reader, and the audit then reports lang as a PASS). Only overrides TO a detected non-en.
// (2) Wire the dead OCR-language picker: a manual override so a teacher can tell the pipeline a scanned
//     handout is e.g. Somali → Tesseract uses the right model. Every option must be a supported code.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const hostSrc = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Mirror of _applyDetectedLang (kept in sync via anti-drift) ──
const applyDetectedLang = (html, detected) => {
  const vl = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
  const nm = { english: 'en', spanish: 'es', french: 'fr', somali: 'so', arabic: 'ar' };
  const adRaw = detected ? String(detected).trim().toLowerCase().replace(/_/g, '-') : '';
  const ad = vl.test(adRaw) ? adRaw : null;
  if (!/lang=/i.test(html)) return html.replace(/<html/i, '<html lang="' + (ad || 'en') + '"');
  return html.replace(/<html([^>]*)lang=["']([^"']*)["']/i, (m, before, langVal) => {
    const trimmed = String(langVal).trim().toLowerCase().replace(/_/g, '-');
    const invalid = !trimmed || !vl.test(trimmed);
    const overrideToDetected = !invalid && ad && ad !== 'en' && ad !== trimmed;
    if (invalid || overrideToDetected) { const fixed = ad || nm[trimmed] || 'en'; return '<html' + before + 'lang="' + fixed + '"'; }
    return m;
  });
};
const langOf = (html) => (html.match(/lang="([^"]*)"/) || [])[1];

describe('apply detected language to <html lang>', () => {
  it('a valid-but-wrong lang="en" is OVERRIDDEN to the detected non-English language (the ELL bug)', () => {
    expect(langOf(applyDetectedLang('<html lang="en"><body>', 'so'))).toBe('so');
  });
  it('a missing lang is filled from detection', () => {
    expect(langOf(applyDetectedLang('<html><body>', 'es'))).toBe('es');
  });
  it('a missing lang with no detection falls back to en', () => {
    expect(langOf(applyDetectedLang('<html><body>', null))).toBe('en');
  });
  it('does NOT flip a valid non-English lang down to en on a weak/en detection', () => {
    expect(langOf(applyDetectedLang('<html lang="es"><body>', 'en'))).toBe('es');
  });
  it('leaves a correct attribute alone when detection agrees', () => {
    expect(langOf(applyDetectedLang('<html lang="so"><body>', 'so'))).toBe('so');
  });
  it('an invalid attribute with no detection name-maps then falls back', () => {
    expect(langOf(applyDetectedLang('<html lang="spanish"><body>', null))).toBe('es');
  });
});

// ── Mirror of _toTesseractLang — every picker option MUST resolve to a real model (not the eng fallback) ──
const toTesseractLang = (code) => {
  if (!code) return 'eng';
  const c = String(code).trim().toLowerCase().replace(/_/g, '-');
  const base = c.split('-')[0];
  if (base === 'zh') return /(^|[-])(tw|hant|hk|mo)/.test(c) ? 'chi_tra' : 'chi_sim';
  const MAP = {
    en: 'eng', es: 'spa', fr: 'fra', de: 'deu', it: 'ita', pt: 'por', nl: 'nld',
    ru: 'rus', uk: 'ukr', pl: 'pol', tr: 'tur', sv: 'swe', da: 'dan', nb: 'nor', no: 'nor', fi: 'fin',
    cs: 'ces', sk: 'slk', ro: 'ron', hu: 'hun', el: 'ell', bg: 'bul', hr: 'hrv', sr: 'srp',
    he: 'heb', ar: 'ara', fa: 'fas', ps: 'pus', ur: 'urd',
    hi: 'hin', bn: 'ben', pa: 'pan', gu: 'guj', ta: 'tam', te: 'tel', kn: 'kan', ml: 'mal',
    th: 'tha', lo: 'lao', km: 'khm', my: 'mya', vi: 'vie', id: 'ind', ms: 'msa', tl: 'tgl',
    ja: 'jpn', ko: 'kor', am: 'amh', ti: 'tir', sw: 'swa', so: 'som', ht: 'hat',
  };
  return MAP[base] || 'eng';
};

describe('OCR picker: every option resolves to a real Tesseract model (no fake choices)', () => {
  const codes = [...viewSrc.matchAll(/\{ code: '([a-z-]+)', label:/g)].map((m) => m[1]);
  it('parsed a non-trivial option list', () => {
    expect(codes.length).toBeGreaterThanOrEqual(25);
  });
  it('no option falls back to the eng model (which would make the choice a lie)', () => {
    const bad = codes.filter((c) => toTesseractLang(c) === 'eng');
    expect(bad).toEqual([]);
  });
  it('includes the pilot ELL languages', () => {
    for (const c of ['so', 'ar', 'es', 'ps', 'am', 'vi']) expect(codes).toContain(c);
  });
});

describe('anti-drift: both ELL fixes are wired end-to-end', () => {
  it('the pipeline defines _applyDetectedLang with the override-to-detected condition', () => {
    expect(pipeSrc).toMatch(/const _applyDetectedLang = \(html\) =>/);
    expect(pipeSrc).toMatch(/_ad !== 'en' && _ad !== trimmed/);
    expect((pipeSrc.match(/_applyDetectedLang\(/g) || []).length).toBeGreaterThanOrEqual(2); // 2 call sites (def uses `= (html)`)
  });
  it('the host owns pdfOcrLanguage state + exposes it to the pipeline', () => {
    expect(hostSrc).toMatch(/const \[pdfOcrLanguage, setPdfOcrLanguage\] = useState/);
    expect(hostSrc).toMatch(/pdfAuditorCount, pdfTargetScore, pdfOcrLanguage,/); // in __docPipelineState
  });
  it('the view renders the picker bound to setPdfOcrLanguage', () => {
    expect(viewSrc).toMatch(/onChange=\{\(e\) => setPdfOcrLanguage\(e\.target\.value\)\}/);
    expect(viewSrc).toMatch(/OCR_LANG_OPTIONS\.map/);
  });
});
