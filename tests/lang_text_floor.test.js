// lang-text-floor (2026-06-15): the translate + simplify accept gates were
// STRUCTURE-only (_tagSeqOf / _structSeqOf) with no text-volume measure — unlike
// the WCAG path's text floor — so a chunk the model returned with the same tags but
// EMPTIED text passed parity and silently dropped facts. The fix ANDs a loose
// gross-drop text floor (F=0.5 translate, 0.35 simplify) using the same
// textCharCount primitive the WCAG path uses.
//
// translate/simplify are async and close over many helpers + callGemini, so rather
// than a fragile whole-function extraction we (a) runtime-extract the REAL
// textCharCount and prove the floor predicate accepts faithful output / rejects a
// gutted chunk, and (b) anti-drift-guard that both floor expressions are live in
// the shipped accept gates.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const textCharCount = (html) => {');
const end = src.indexOf('\n  };', start) + '\n  };'.length;
if (start === -1) throw new Error('textCharCount extraction marker missing');
const textCharCount = new Function(src.slice(start, end) + '\n; return textCharCount;')();

// the shipped predicate, parameterized by the floor F
const passesGate = (resp, chunk, F) => textCharCount(resp) >= textCharCount(chunk) * F;

describe('lang-text-floor — gross-drop text floor on the translate/simplify accept gate', () => {
  const chunk = '<p>The board approved the annual budget with real facts here.</p>';

  it('REJECTS a tag-preserving but text-emptied chunk (translate F=0.5)', () => {
    expect(passesGate('<p></p>', chunk, 0.5)).toBe(false);
  });
  it('ACCEPTS a faithful same-length translation (translate F=0.5, regression guard)', () => {
    const faithful = '<p>LA JUNTA APROBÓ EL PRESUPUESTO ANUAL CON DATOS REALES AQUÍ.</p>';
    expect(passesGate(faithful, chunk, 0.5)).toBe(true);
  });
  it('REJECTS an emptied chunk under the looser simplify floor too (F=0.35)', () => {
    expect(passesGate('<p></p>', chunk, 0.35)).toBe(false);
  });
  it('ACCEPTS an aggressive but valid ~40% simplification (F=0.35, regression guard)', () => {
    const simplified = '<p>The board said yes to the budget.</p>'; // ~40% of original chars
    expect(passesGate(simplified, chunk, 0.35)).toBe(true);
  });
  it('a zero-text chunk passes naturally (floor is 0 — nothing to lose)', () => {
    expect(passesGate('<hr/>', '<hr/>', 0.5)).toBe(true);
    expect(passesGate('<hr/>', '<hr/>', 0.35)).toBe(true);
  });

  it('anti-drift: both floor expressions are live in the shipped accept gates', () => {
    // translate gate now uses a CJK-aware _floor (0.25 for zh/ja/ko, else 0.5 — fix #10)
    expect(src).toContain('textCharCount(resp) >= textCharCount(chunk) * _floor');
    expect(src).toContain('? 0.25 : 0.5;');
    // simplify gate keeps its flat 0.35
    expect(src).toContain('textCharCount(resp) >= textCharCount(chunk) * 0.35');
  });
});
