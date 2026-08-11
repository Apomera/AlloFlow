// The leveled-text "Refined" path splits across two consecutive `if (repaired)`
// blocks: the first translates the repaired text (and may set repaired = null to
// bail), the second sanitizes citations and composes the final artifact. The
// English translation is produced in the FIRST and consumed in the SECOND.
//
// It shipped `let`-scoped to the first block, so every non-English refine threw
// ReferenceError at the citation sanitize step. check_free_vars catches that
// exact spelling of the bug — but it would stay green if the declaration were
// moved into the SECOND block instead, which compiles fine and silently drops
// the translation. That is the failure this test exists to pin.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const TARGETS = [
  'generate_dispatcher_source.jsx',
  'generate_dispatcher_module.js',
  path.join('desktop', 'web-app', 'public', 'generate_dispatcher_module.js'),
];

describe.each(TARGETS)('%s — refined leveled-text translation scope', (relPath) => {
  const source = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');

  it('declares repairedEnglish exactly once', () => {
    const declarations = source.match(/\b(?:let|const|var)\s+repairedEnglish\b/g) || [];
    expect(declarations).toHaveLength(1);
  });

  it('declares it before the block that assigns it, so the value survives into the consumer', () => {
    const declIndex = source.search(/\blet\s+repairedEnglish\s*=/);
    expect(declIndex).toBeGreaterThan(-1);

    // The assignment that carries the translation out of the first block.
    const assignIndex = source.indexOf('repairedEnglish = repairedTranslation.text;');
    expect(assignIndex).toBeGreaterThan(-1);

    // The consumer in the second block.
    const consumeIndex = source.indexOf('repairedEnglish = _mdBoundsRepair(repairedEnglish);');
    expect(consumeIndex).toBeGreaterThan(-1);

    // Declaration must precede both — and critically must NOT sit between the
    // producer and the consumer, which is where a well-meaning re-declaration
    // would land and quietly reset the translation to ''.
    expect(declIndex).toBeLessThan(assignIndex);
    expect(declIndex).toBeLessThan(consumeIndex);
  });

  it('hoists the declaration above the first of the two `if (repaired)` blocks', () => {
    const declIndex = source.search(/\blet\s+repairedEnglish\s*=/);
    const firstBlockIndex = source.indexOf('if (repaired) {', declIndex - 400 > 0 ? declIndex - 400 : 0);
    expect(firstBlockIndex).toBeGreaterThan(declIndex);
  });
});
