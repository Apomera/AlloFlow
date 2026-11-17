// The six builders each carry their own copy of two small rules: the code-name rule (codeName) and the rule that makes
// text safe to put in a file's data block (safeJson). They are copies so that each builder stays one plain file a page
// loads on its own. A drifted copy of the safe-text rule would be a security bug, so this test holds the copies to one
// another (review 2.8, 2026-11-17). Change one, change all.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BUILDERS = ['word_sounds_packet_builder.js', 'packet_math_practice_builder.js', 'packet_check_builder.js', 'packet_vocab_builder.js', 'packet_symbol_runner_builder.js', 'packet_read_along_builder.js'];
const body = (src, name) => {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) return null;
  let depth = 0, i = src.indexOf('{', at);
  const start = i;
  for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (!depth) break; } }
  // Layout aside (a line break before .replace is the same rule).
  return src.slice(start, i + 1).replace(/\s+/g, ' ').replace(/ \./g, '.');
};

describe('the builders\' copies of the small rules are the same', () => {
  it('codeName: the same source in every builder, and the same answer for hostile and foreign names', () => {
    const sources = new Set(BUILDERS.map((f) => body(readFileSync(f, 'utf8'), 'codeName')));
    expect(sources.size).toBe(1);
    const NAMES = ['Blue Heron 7', '  Ana   Li ', '<script>alert(1)</script>', 'José', 'Zoë-Ann_2', '"quoted"', '‮hidden', 'a'.repeat(80), 'Đặng', '日本 名前', ''];
    const answers = BUILDERS.map((f) => NAMES.map((n) => require('../' + f).codeName(n)));
    for (const a of answers) expect(a).toEqual(answers[0]);
    expect(answers[0][2]).toBe('scriptalert1script');
  });
  it('safeJson: wherever a builder has its own, it is the same rule', () => {
    const copies = BUILDERS.map((f) => body(readFileSync(f, 'utf8'), 'safeJson')).filter(Boolean);
    expect(copies.length).toBeGreaterThan(1);
    expect(new Set(copies).size).toBe(1);
    expect(copies[0]).toContain("replace(/</g, '\\\\u003c')");
  });
});
