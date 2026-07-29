// Pets Lab — Lifetime Cost panel, rendered.
//
// pets_cost_model covers the arithmetic. This drives the real tool through SSR
// to prove the WORD on screen changes, because the defect being fixed was a
// label that stayed "Lifetime cost" while the number stopped being one.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';

function costView(costSpecies, costYears) {
  return renderTool(ID, { [ID]: { view: 'cost', costSpecies, costYears } });
}
/** React escapes &, ' and friends in text nodes. */
function text(html) {
  return html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('cost panel labelling', () => {
  it('says "Lifetime cost" while the span fits one animal', () => {
    const html = costView('guinea-pair', 6); // exactly its lifespan
    expect(html).toContain('Lifetime cost');
    expect(html).not.toContain('successive');
  });

  it('stops saying "Lifetime" once the span covers several animals', () => {
    const html = costView('guinea-pair', 30);
    expect(html).toContain('Cost over 30 yr');
    expect(html).not.toContain('Lifetime cost');
  });

  it('names how many successive animals a long span implies', () => {
    const html = text(costView('guinea-pair', 30));
    expect(html).toMatch(/about 5 successive animals/);
    expect(html).toMatch(/5 first-year setups, not one/);
  });

  it('raises the repeated-loss point, not just the money', () => {
    const html = text(costView('guinea-pair', 30));
    expect(html).toMatch(/goodbyes/);
    expect(html).toMatch(/first experience of losing someone/);
  });

  it('pluralises the animal count correctly at the 2-animal boundary', () => {
    // The multi-generation branch only runs at >=2, so "2 successive animal"
    // was a real rendering slip on the most common long-span case.
    const html = text(costView('dog-large', 20));
    expect(html).toMatch(/2 successive animals/);
    expect(html).not.toMatch(/successive animal\b(?!s)/);
  });

  it('uses singular wording for a single extra goodbye', () => {
    // dog-large lives ~11; 20 years is 2 animals -> exactly 1 extra goodbye.
    const html = text(costView('dog-large', 20));
    expect(html).toMatch(/1 more goodbye\b/);
    expect(html).not.toMatch(/1 more goodbyes/);
  });

  it('a long-lived species over the same span stays a single lifetime', () => {
    // A parrot lives ~25, so 20 years is still one bird.
    const html = costView('parrot-medium', 20);
    expect(html).toContain('Lifetime cost');
    expect(html).not.toContain('successive');
  });

  it('renders every profile at both slider extremes without throwing', () => {
    const ids = ['dog-large', 'dog-small', 'cat-indoor', 'rabbit-pair', 'guinea-pair', 'reptile', 'parrot-medium'];
    for (const id of ids) {
      for (const y of [1, 30]) {
        expect(() => costView(id, y), id + ' at ' + y + 'y').not.toThrow();
      }
    }
  });
});
