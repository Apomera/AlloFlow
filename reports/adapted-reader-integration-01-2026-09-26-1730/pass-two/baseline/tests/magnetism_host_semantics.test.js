import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

// desktop/app-build/ is a desktop BUILD ARTIFACT: never committed, absent from a
// fresh checkout. Reading it unconditionally threw ENOENT at module load and took
// the whole suite down — zero tests ran, which reports nothing rather than
// failing loudly. Check the mirror only when it has actually been built, the same
// way magnetism_numeric_render_guard and sel_four_copy_parity do.
const MAGNETISM_PATHS = [
  'stem_lab/stem_tool_magnetism.js',
  'desktop/web-app/public/stem_lab/stem_tool_magnetism.js',
  'desktop/app-build/stem_lab/stem_tool_magnetism.js',
].filter((p) => existsSync(p));

describe.each(MAGNETISM_PATHS)('Magnetism host semantics in %s', (filePath) => {
  const source = readFileSync(filePath, 'utf8');

  it('keeps its visual hero out of the host page banner landmarks', () => {
    expect(source).toContain("h('div', { className: 'mag-hero' }");
    expect(source).not.toContain("h('header', { className: 'mag-hero' }");
    expect(source).toContain("h('h2', { style:");
  });

  it('gives every named visual key an ARIA role that supports its label', () => {
    expect(source).toContain(`className: 'mag-pole-key', role: 'group', 'aria-label': __alloT('stem.magnetism.a11y_magnetic_pole_key', 'Magnetic pole key')`);
    const namedLegends = source.match(/className: 'mag-legend', role: 'group', 'aria-label':/g) || [];
    expect(namedLegends).toHaveLength(4);
    expect(source).not.toMatch(/className: 'mag-(?:pole-key|legend)', 'aria-label':/);
  });
});
