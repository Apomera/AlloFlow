import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOLAR_SYSTEM_PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'prismflow-deploy/public/stem_lab/stem_tool_solarsystem.js',
];

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

describe('Solar System data-table semantics', () => {
  it('keeps the canonical source and deployed mirror byte-identical', () => {
    const [source, mirror] = SOLAR_SYSTEM_PATHS.map((filePath) => readFileSync(filePath, 'utf8'));
    expect(mirror).toBe(source);
  });

  it('names every table and exposes simple row and column relationships', () => {
    SOLAR_SYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(count(source, /(?:h\("caption"|React\.createElement\('caption')/g)).toBe(3);
      expect(source).toContain("verification_table_t_a_should_1_00_for");
      expect(source).toContain("v_budget_earth_all_planets_hohmann");
      expect(source).toContain("quick_table_of_planet_properties_diame");

      expect(count(source, /scope: ["']col["']/g)).toBe(13);
      expect(count(source, /scope: ["']row["']/g)).toBe(3);
      expect(source).not.toContain('h("td", { style: tCellStyle }, b.emoji + " " + b.name)');
      expect(source).not.toContain('h("td", { style: bCellStyle }, p.emoji + " " + p.name)');
      expect(source).not.toContain("React.createElement('td', { className: 'p-1 font-bold '");
    });
  });
});
