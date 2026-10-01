import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// The Machine Lab carries ~860 translatable strings. Four faults in them are
// invisible to every rendering test, because the English fallback keeps the
// screen looking right while the translated build is broken. This checks the
// tool for all four — and checks the checker against samples that are known to
// be bad, because a gate that has never failed is not a gate.

const require = createRequire(import.meta.url);
const { checkSource } = require(path.resolve(process.cwd(), 'dev-tools/ml_i18n_hygiene.cjs'));

const TOOL = 'stem_lab/stem_tool_machinelab.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_machinelab.js';
const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

describe('Machine Lab translation keys are fit to translate', () => {
  it('has no key without an English fallback, out of namespace, blank, or double-booked', () => {
    const res = checkSource(read(TOOL), TOOL);
    expect(res.problems, res.problems.join('\n')).toEqual([]);
    // If this ever collapses to a handful, the scanner has stopped seeing the
    // calls rather than the tool having lost its strings.
    expect(res.keys).toBeGreaterThan(700);
  });

  it('holds for the mirrored copy the desktop app serves', () => {
    const res = checkSource(read(MIRROR), MIRROR);
    expect(res.problems, res.problems.join('\n')).toEqual([]);
  });

  it('catches a call with no English fallback', () => {
    const bad = checkSource("h('p', {}, __alloT('stem.machinelab.orphan'))", 'x');
    expect(bad.problems).toHaveLength(1);
    expect(bad.problems[0]).toContain('has no English fallback');
  });

  it('catches a key outside the namespace the pack pipeline collects', () => {
    const bad = checkSource("__alloT('machinelab.loose', 'Loose!')", 'x');
    expect(bad.problems[0]).toContain('outside the stem.machinelab. namespace');
  });

  it('catches a blank or whitespace-only English string', () => {
    expect(checkSource("__alloT('stem.machinelab.gap', ' ')", 'x').problems[0]).toContain('blank English string');
    expect(checkSource("__alloT('stem.machinelab.gap', '')", 'x').problems[0]).toContain('blank English string');
  });

  it('catches one key carrying two different English strings', () => {
    const bad = checkSource(
      "__alloT('stem.machinelab.dup', 'Fire') + __alloT('stem.machinelab.dup', 'Loose')",
      'x'
    );
    expect(bad.problems).toHaveLength(1);
    expect(bad.problems[0]).toContain('different English');
  });

  it('allows the same key twice when the English agrees, which is how shared words work', () => {
    const ok = checkSource(
      "__alloT('stem.machinelab.sling', 'sling') + __alloT('stem.machinelab.sling', 'sling')",
      'x'
    );
    expect(ok.problems).toEqual([]);
    expect(ok.keys).toBe(1);
  });

  it('is not fooled by commas, parens or apostrophes inside the English', () => {
    const ok = checkSource(
      "__alloT('stem.machinelab.long', 'Aim off into the wind, or wait (a while) for it to drop.')",
      'x'
    );
    expect(ok.problems).toEqual([]);
    const esc = checkSource(
      "__alloT('stem.machinelab.esc', 'the stone\\\\'s own shadow')",
      'x'
    );
    expect(esc.problems).toEqual([]);
  });
});
