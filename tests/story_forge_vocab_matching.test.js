// StoryForge vocabulary matcher — Unicode correctness.
//
// termUsed() drives vocabUsage → the readiness score, the 'unused-vocabulary'
// warning, the vocab_star achievement, teacher-facing submission analytics, and
// the "unused vocabulary" list handed to the AI writing coach. Until 2026-08-16
// it used \b, which is ASCII-only: every term with an accented FIRST or LAST
// letter (árbol, être — and all of Arabic) was reported unused even when the
// student had used it, while "sol" matched inside "solárium". The AI coach was
// then prompted to tell students to use words already in their draft.
//
// The test extracts the real function from BOTH the source and the built module
// so a rebuild that drops the fix is caught, not just a source edit.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  path.join(process.cwd(), 'story_forge_source.jsx'),
  path.join(process.cwd(), 'story_forge_module.js'),
];

function extractTermUsed(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/const termUsed = \(text, term\) => \{[\s\S]*?\n\};/);
  if (!m) throw new Error('termUsed not found in ' + path.basename(file));
  // eslint-disable-next-line no-new-func
  return new Function('return ' + m[0].replace(/^const termUsed = /, '').replace(/;$/, ''))();
}

// [term, draft text, expected]
const CASES = [
  // Accented edges — the exact shape \b broke.
  ['árbol', 'El árbol es grande', true],
  ['être', 'Je veux être libre', true],
  ['Árbol', 'el árbol crece', true],          // case-insensitive across accents
  ['über', 'Der Über-Plan', true],
  ['niño', 'el niño corre', true],            // interior accent (passed even under \b)
  // Non-Latin scripts.
  ['شجرة', 'هذه شجرة كبيرة', true],            // Arabic, space-separated
  ['树', '这是一棵树', true],                    // Chinese, no word spacing
  // Substrings must NOT count as usage.
  ['sol', 'el solárium', false],
  ['être', 'fenêtre ouverte', false],
  ['cat', 'concatenate', false],
  ['tree', 'treehouse only', false],
  // ASCII controls.
  ['tree', 'The tree is big', true],
  ['tree', 'A tree.', true],                  // punctuation boundary
  ['tree', '', false],
  ['', 'anything', false],
];

for (const file of FILES) {
  describe(`termUsed (${path.basename(file)})`, () => {
    const termUsed = extractTermUsed(file);
    for (const [term, text, want] of CASES) {
      it(`${JSON.stringify(term)} in ${JSON.stringify(text)} → ${want}`, () => {
        expect(termUsed(text, term)).toBe(want);
      });
    }
  });
}
