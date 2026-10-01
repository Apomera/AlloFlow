// verifyChunkIntegrity CJK/Thai handling (audit #26, 2026-06-15). The gate split on whitespace and
// gated on word-set overlap. CJK/Japanese/Thai have no inter-word spaces, so a paragraph is one
// token; an a11y block reflow shifts that token and overlap collapses → the gate FALSE-FAILS and
// the un-remediated original is kept, despite 100% character preservation. Fix: character-level
// overlap for those scripts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const extractPlainText = (html) => {');
const end = src.indexOf('const scoreChunkLocally = (chunkHtml) => {', start);
if (start === -1 || end === -1) throw new Error('extraction markers missing');
const { verifyChunkIntegrity } = new Function('warnLog',
  src.slice(start, end) + '\n; return { verifyChunkIntegrity };')(() => {});

describe('verifyChunkIntegrity — CJK/Thai use character-level overlap', () => {
  it('a Japanese paragraph reflowed into headings+paragraphs PASSES (was a false fail)', () => {
    // Same characters, restructured from one <p> into a heading + two <p> (an a11y fix). Whitespace
    // word-overlap would see one giant token vs three and collapse to ~0; char overlap stays ~1.
    const orig = '<p>これはアクセシビリティのテストです。学生はスクリーンリーダーで読みます。</p>';
    const fixed = '<h2>これはアクセシビリティのテストです</h2><p>学生は</p><p>スクリーンリーダーで読みます</p>';
    const r = verifyChunkIntegrity(orig, fixed);
    expect(r.passed).toBe(true);
    expect(r.overlapRatio).toBeGreaterThanOrEqual(0.85);
  });

  it('genuine CJK content loss (a sentence dropped) still FAILS', () => {
    const orig = '<p>第一段落のテキストです。第二段落はまったく別の漢字を含みます。</p>';
    const fixed = '<p>第一段落のテキストです。</p>'; // dropped the second sentence's unique chars
    const r = verifyChunkIntegrity(orig, fixed);
    expect(r.passed).toBe(false);
  });

  it('Latin text still uses word overlap (unchanged path)', () => {
    const orig = '<p>The committee approved the annual budget today.</p>';
    const fixed = '<h2>Budget</h2><p>The committee approved the annual budget today.</p>';
    const r = verifyChunkIntegrity(orig, fixed);
    expect(r.passed).toBe(true);
  });

  it('Latin content loss still FAILS', () => {
    const orig = '<p>alpha bravo charlie delta echo foxtrot golf hotel india juliet</p>';
    const fixed = '<p>alpha bravo</p>';
    expect(verifyChunkIntegrity(orig, fixed).passed).toBe(false);
  });
});
