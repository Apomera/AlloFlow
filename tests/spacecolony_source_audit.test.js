import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 2026-11-23 source audit (owner's rule: unsourced or wrong facts are corrected or removed).
// Each correction moved to a new _v2 key, because a registered key's stored text overrides the fallback.
const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_spacecolony.js'), 'utf8');

describe('Kepler Colony source audit', () => {
  it('the alien species no longer names a real exoplanet (registered v1 text said Kepler-442b)', () => {
    expect(src).not.toContain("'stem.spacecolony.silicon_based_lifeforms_indigenous_to_'");
    expect(src).toContain("'stem.spacecolony.silicon_based_lifeforms_indigenous_to_v2'");
    // in no quoted (shown) string; comments may cite it
    expect(src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')).not.toMatch(/Kepler-442/);
  });

  it('solar arrays use the photovoltaic effect (DOE), not the photoelectric effect', () => {
    // in no shown string; comments may cite it
    expect(src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')).not.toMatch(/photoelectric/i);
    expect(src).toContain("'stem.spacecolony.converts_stellar_radiation_into_power_v2', 'Turns starlight into electric power through the photovoltaic effect.'");
  });

  it('the cloning gate asks about the first mammal cloned from an ADULT cell (embryo clones came earlier)', () => {
    expect(src).not.toContain('first cloned mammal');
    expect(src).toContain("gateQ: 'What is the name of the first mammal cloned from an adult body cell?'");
  });

  it('faster-than-light comms are labelled science fiction', () => {
    expect(src).not.toContain("'FTL communication with Earth. +10 science/turn.'");
    expect(src).toContain('This is science fiction: as far as we know, nothing travels faster than light.');
  });
});
