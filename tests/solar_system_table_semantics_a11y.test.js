import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOLAR_SYSTEM_PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
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

      // Both element factories use both quote styles. Counting only h("...")
      // and React.createElement('...') silently skipped named inspection tables.
      const tableCount = count(source, /(?:\bh|React\.createElement)\(\s*(['"])table\1\s*[,)]/g);
      const captionCount = count(source, /(?:\bh|React\.createElement)\(\s*(['"])caption\1\s*[,)]/g);
      expect(tableCount).toBe(11);
      expect(captionCount).toBe(tableCount);
      expect(source).toContain('orrery-k3-verification-table');
      expect(source).toContain('Verify T²/a³ for each world');
      expect(source).toContain("v_budget_earth_all_planets_hohmann");
      expect(source).toContain('\\u0394v\\u2081 (km/s)');
      expect(source).toContain('\\u0394v\\u2082 (km/s)');
      expect(source).toContain('"Total \\u0394v (km/s)"');
      expect(source).toContain('"Transit time (days / yr)"');
      expect(source).toMatch(/id:\s*(['"])orrery-k3-units-note\1/);
      expect(source).toContain('T² (yr²)');
      expect(source).toContain('a³ (AU³)');
      expect(source).toContain('T²/a³ (yr²/AU³)');
      expect(source).toContain("quick_table_of_planet_properties_diame");

      // These counts cover source templates, including mapped table headings
      // and rows, rather than the number of cells produced at runtime.
      expect(count(source, /scope: ["']col["']/g)).toBe(30);
      expect(count(source, /scope: ["']row["']/g)).toBe(tableCount);
      expect(source).not.toContain('h("td", { style: tCellStyle }, b.emoji + " " + b.name)');
      expect(source).not.toContain('h("td", { style: bCellStyle }, p.emoji + " " + p.name)');
      expect(source).not.toContain("React.createElement('td', { className: 'p-1 font-bold '");
    });
  });
});
