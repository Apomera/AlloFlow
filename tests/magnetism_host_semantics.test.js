import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const MAGNETISM_PATHS = [
  'stem_lab/stem_tool_magnetism.js',
  'desktop/web-app/public/stem_lab/stem_tool_magnetism.js',
  'desktop/app-build/stem_lab/stem_tool_magnetism.js',
];

describe.each(MAGNETISM_PATHS)('Magnetism host semantics in %s', (filePath) => {
  const source = readFileSync(filePath, 'utf8');

  it('keeps its visual hero out of the host page banner landmarks', () => {
    expect(source).toContain("h('div', { className: 'mag-hero' }");
    expect(source).not.toContain("h('header', { className: 'mag-hero' }");
    expect(source).toContain("h('h2', { style:");
  });

  it('gives every named visual key an ARIA role that supports its label', () => {
    expect(source).toContain("className: 'mag-pole-key', role: 'group', 'aria-label': 'Magnetic pole key'");
    const namedLegends = source.match(/className: 'mag-legend', role: 'group', 'aria-label':/g) || [];
    expect(namedLegends).toHaveLength(4);
    expect(source).not.toMatch(/className: 'mag-(?:pole-key|legend)', 'aria-label':/);
  });
});
