// Skate Lab source audit, 2026-11-23. The standard codes on the guided investigations were checked against the NGSS
// performance expectations (nextgenscience.org): HS-PS2-1 is "limited to one-dimensional motion", and no PE covers
// angular momentum, so those two labels no longer claim a standard they do not meet. The landing note's knee range
// had no source and was removed. SKATELAB_FILE=<path> points the suite at another copy (start_r4.js turns it red).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.SKATELAB_FILE || 'stem_lab/stem_tool_skatelab.js', 'utf8').replace(/\r\n/g, '\n');
const code = src.replace(/(^|\s)\/\/[^\n]*/g, '$1');

describe('investigation standards', () => {
  it('the codes that match their performance expectation stay', () => {
    for (const [id, ngss] of [['ke_speed_mass', 'MS-PS3-1'], ['pe_height', 'MS-PS3-2'], ['energy_where', 'MS-PS3-5'],
      ['net_force', 'HS-PS2-1'], ['landing_design', 'HS-PS2-3']]) {
      expect(src, id).toContain("{ id: '" + id + "', ngss: '" + ngss + "'");
    }
  });
  it('the spin investigation no longer claims HS-PS2, and the 2-D range one is marked an extension', () => {
    expect(code).not.toContain('HS-PS2 · L = Iω');
    expect(code).not.toContain("'HS-PS2-1 · projectile'");
    expect(src).toContain("__alloT('stem.skatelab.inv_ngss_tuck_open_v2', 'Beyond NGSS · L = Iω')");
    expect(src).toContain("__alloT('stem.skatelab.inv_ngss_range_angle_v2', 'HS-PS2-1 extension · 2-D projectile')");
  });
});

describe('landing note', () => {
  it('drops the unsourced knee range and keeps the guidance, under a new key', () => {
    expect(code).not.toContain('0.5-0.9 m');
    expect(src).toContain("__alloT('stem.skatelab.inv_landing_note_v2', 'Criteria: lands on the deck, peak load under 4 g. Constraint: real knees can bend only so far, so the absorption distance has a limit.')");
  });
});
