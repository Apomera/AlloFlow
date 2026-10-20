// Math review 2 (2026-10-19): the Angles glossary put an isosceles triangle's
// vertex angle "opposite the equal sides". It is the angle the two equal sides
// FORM, opposite the base; each base angle is the one opposite an equal side.
// The old wording gave the vertex angle and the base angles the same location.
// MATH_REVIEW2_ANGLES_SRC lets a mutation run point this at a variant.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW2_ANGLES_SRC || 'stem_lab/stem_tool_angles.js';

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
});

function glossary() {
  const html = renderTool('protractor', { angles: { expSection: 'glossary' } });
  const host = document.createElement('div');
  host.innerHTML = html;
  const entries = {};
  host.querySelectorAll('div.border-l-rose-400').forEach((row) => {
    const [term, def] = row.children;
    if (term && def) entries[term.textContent.trim()] = def.textContent.trim();
  });
  return entries;
}

describe('Angles glossary: isosceles triangle angles', () => {
  it('renders the glossary section', () => {
    const g = glossary();
    expect(Object.keys(g).length).toBeGreaterThan(10);
    expect(g['Vertex angle']).toBeTruthy();
    expect(g['Base angle']).toBeTruthy();
  });

  it('puts the vertex angle between the equal sides, opposite the base', () => {
    const def = glossary()['Vertex angle'];
    expect(def, 'still places the vertex angle opposite the equal sides').not.toMatch(/opposite the equal sides/i);
    expect(def).toMatch(/formed by the two equal sides/i);
    expect(def).toMatch(/opposite the base/i);
  });

  it('puts each base angle at an end of the base', () => {
    const def = glossary()['Base angle'];
    expect(def).toMatch(/base/i);
    expect(def).toMatch(/equal/i);
    // The two definitions must not describe the same place.
    expect(def).not.toBe(glossary()['Vertex angle']);
  });
});
