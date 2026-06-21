// Low-risk/decent-value batch from the 2-day review workflow (2026-06-21). Covers: the auto-continue
// loop's stale weakest-layer score + degraded flag (critic's #1 miss), numeric-fidelity false positives,
// the resume-seed single-use consume, the OCR-layer markdown strip, batch/region lang handling, and the
// veraPDF popup hang + busy chip.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const host = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// ── numeric-fidelity-1 + 3 (mirror of _extractNumericTokens / _numericFidelityLosses) ──
const extractTokens = (text) => {
  const m = String(text || '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
  const counts = new Map();
  const add = (norm) => {
    if (norm.indexOf('.') !== -1) norm = norm.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    if (norm.replace(/\./g, '').length < 2) return;
    counts.set(norm, (counts.get(norm) || 0) + 1);
  };
  for (const tok of m) {
    if (tok.indexOf(',') !== -1) {
      if (/^\d{1,3}(,\d{3})+(?:\.\d+)?$/.test(tok)) add(tok.replace(/,/g, ''));
      else tok.split(',').forEach((p) => { if (p) add(p); });
    } else add(tok);
  }
  return counts;
};
const losses = (src, out) => { const s = extractTokens(src), o = extractTokens(out), lost = []; s.forEach((c, v) => { if ((o.get(v) || 0) < c) lost.push(v); }); return lost; };

describe('numeric-fidelity: comma-lists & trailing zeros no longer false-flag, real changes still caught', () => {
  it('a comma-separated number LIST reflowed → NO loss (was ["123456"])', () => {
    expect(losses('ids 12,34,56', 'ids 12, 34, 56')).toEqual([]);
  });
  it('single-digit list "1,2,3" → no loss (digits skipped)', () => {
    expect(losses('standards 1,2,3', 'standards 1 2 3')).toEqual([]);
  });
  it('trailing decimal zero 3.5↔3.50 → no loss', () => {
    expect(losses('GPA 3.5', 'GPA 3.50')).toEqual([]);
    expect(losses('GPA 3.50', 'GPA 3.5')).toEqual([]);
  });
  it('a TRUE thousands group is still normalized (1,000 ↔ 1000, 1,000,000)', () => {
    expect(losses('total 1,000', 'total 1000')).toEqual([]);
    expect(losses('budget 1,000,000', 'budget 1000000')).toEqual([]);
  });
  it('REGRESSION GUARD: a genuinely changed value is STILL reported lost', () => {
    expect(losses('the score is 47%', 'the score is 74%')).toContain('47');
    expect(losses('total 1,234', 'total 1235')).toContain('1234');
  });
});

// ── ocr-fidelity-4 (mirror of the constrained markdown strip) ──
const stripMd = (s) => s.replace(/^[ \t]*#{1,6}[ \t]+(?!\d|of\b|#)/gm, '').replace(/^[ \t]*\*[ \t]+(?=[A-Za-z])/gm, '');

describe('ocr-fidelity-4: markdown strip keeps literal #/* content', () => {
  it('a real heading is still stripped', () => {
    expect(stripMd('# Introduction')).toBe('Introduction');
    expect(stripMd('## Methods')).toBe('Methods');
  });
  it('"# of students" and "# 5" keep their literal leading #', () => {
    expect(stripMd('# of students: 30')).toBe('# of students: 30');
    expect(stripMd('# 5 things')).toBe('# 5 things');
  });
  it('a letter-led bullet is stripped, a digit-led one is preserved', () => {
    expect(stripMd('* bullet item')).toBe('bullet item');
    expect(stripMd('* 5 apples')).toBe('* 5 apples');
  });
});

// ── lang-ell-2 + 3 (mirror of the override decision) ──
const overrideLang = (trimmed, detected) => {
  const invalid = !trimmed || !/^[a-z]{2,3}(-[a-z]{2,4})?$/.test(trimmed);
  const dBase = (detected || '').split('-')[0], tBase = trimmed.split('-')[0];
  const overrideToDetected = !invalid && detected && detected !== 'en' && dBase !== tBase;
  return invalid || overrideToDetected;
};

describe('lang-ell: override wrong en, preserve a region subtag', () => {
  it('valid-but-wrong en → override to the detected language', () => {
    expect(overrideLang('en', 'es')).toBe(true);
  });
  it('es-MX with audit only detecting es → PRESERVE es-MX (no override)', () => {
    expect(overrideLang('es-mx', 'es')).toBe(false);
  });
  it('same language → no override; invalid → fixed', () => {
    expect(overrideLang('es', 'es')).toBe(false);
    expect(overrideLang('en', 'en')).toBe(false);
    expect(overrideLang('', 'es')).toBe(true);
  });
});

describe('anti-drift: the host auto-continue loop scores by min + clears the degraded flag', () => {
  it('the loop routes its headline through the shared blendAiAxe (delegating helper), not a raw min/mean', () => {
    expect(host).toMatch(/const newScore = \(_det !== null\) \? blendAiAxe\(reVerify\.score, _det\) : reVerify\.score;/);
    expect(host).not.toMatch(/const newScore = \(_det !== null\) \? Math\.min\(reVerify\.score, _det\)/);
    expect(host).not.toMatch(/Math\.round\(\(reVerify\.score \+ _det\) \/ 2\)/);
  });
  it('blendAiAxe delegates to the shared computeHeadline; its fallback is min, never the /2 mean', () => {
    expect(host).toMatch(/if \(typeof _ch === 'function'\) return _ch\(aiScore, axeScore\);/);
    expect(host).toMatch(/return Math\.min\(aiScore, axeScore\);/); // the fallback, used only until the engine module loads
    expect(host).not.toMatch(/return Math\.round\(\(aiScore \+ axeScore\) \/ 2\);/);
  });
  it('a completed re-verify clears _aiVerificationIncomplete on the primary path', () => {
    expect(host).toMatch(/_aiVerificationIncomplete: \(typeof reVerify\.score === 'number'\) \? false : cur\._aiVerificationIncomplete/);
  });
});

describe('anti-drift: doc_pipeline ships the numeric / resume / lang fixes', () => {
  it('numeric: only true thousands groups are stripped', () => {
    expect(pipe).toMatch(/\/\^\\d\{1,3\}\(,\\d\{3\}\)\+\(\?:\\\.\\d\+\)\?\$\/\.test\(tok\)/);
  });
  it('resume seed is read AND cleared unconditionally (true single-use)', () => {
    expect(pipe).toMatch(/const _seed = window\.__resumeExtractedText;\s*\n\s*window\.__resumeExtractedText = null;/);
  });
  it('resume toast no longer claims "no re-scanning needed" unconditionally', () => {
    expect(pipe).not.toMatch(/no re-scanning needed\./);
    expect(pipe).toMatch(/use "Re-scan with OCR" to redo it/);
  });
  it('batch lang path overrides a valid-but-wrong en (base-code compare)', () => {
    expect(pipe).toMatch(/const overrideToDetected = !invalid && _detectedLang && _detectedLang !== 'en' && _dBase !== trimmed\.split\('-'\)\[0\]/);
  });
});

describe('anti-drift: the view ships the veraPDF popup/chip fixes', () => {
  it('validateOnWarmWindow fast-fails when warming failed', () => {
    expect(view).toMatch(/if \(!handle\.warmed\) \{ cleanup\(\); try \{ win\.close\(\); \} catch \(e\) \{\} reject\(new Error\('veraPDF validator did not start/);
  });
  it('the dashboard chip is busy-aware (no stale verdict vs a validating headline)', () => {
    expect(view).toMatch(/\{veraPdfBusy && \(/);
    expect(view).toMatch(/\{!veraPdfBusy && lastTaggedValidation && \(\(\) =>/);
  });
});
