import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');

// AlloFlowANTI.txt is pasted into Gemini Canvas verbatim, so its comments ship to every
// student. They are agent-to-agent regression notes and worth keeping, but they only
// ratchet DOWN (2026-09-13: 336 KB, 12.6% of the file, after a previous full strip regrew).
// To add a note, condense or remove another; write why, not what. Re-baseline with
// `node dev-tools/check_anti_comment_budget.cjs --update` (down) or `--allow-increase`.
describe('AlloFlowANTI.txt comment budget', () => {
  it('keeps comment bytes at or under the ratchet baseline', () => {
    const source = readFileSync('AlloFlowANTI.txt', 'utf8');
    const baseline = JSON.parse(readFileSync('dev-tools/anti_comment_budget_baseline.json', 'utf8'));
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'], attachComment: true });
    let bytes = 0;
    for (const c of ast.comments) bytes += Buffer.byteLength(source.slice(c.start, c.end), 'utf8');
    expect(bytes, `comment bytes ${bytes} exceed the baseline ${baseline.bytes}; condense a note or re-baseline deliberately`).toBeLessThanOrEqual(baseline.bytes);
    expect(baseline.bytes).toBeGreaterThan(0);
  });
});
