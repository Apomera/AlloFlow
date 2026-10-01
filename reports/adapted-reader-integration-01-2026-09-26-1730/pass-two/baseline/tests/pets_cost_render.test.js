// Pets Lab — Lifetime Cost panel, rendered.
//
// pets_cost_model covers the arithmetic. This drives the real tool through SSR
// to prove the WORD on screen changes, because the defect being fixed was a
// label that stayed "Lifetime cost" while the number stopped being one.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';

function costView(costSpecies, costYears, extra = {}) {
  return renderTool(ID, { [ID]: { view: 'cost', costSpecies, costYears, ...extra } });
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
  it('uses an honest baseline label while the span fits one animal', () => {
    const html = costView('guinea-pair', 6); // exactly its lifespan
    expect(html).toContain('Baseline planned cost');
    expect(html).toContain('6-year illustrative scenario');
    expect(html).not.toContain('True total commitment');
    expect(html).not.toContain('successive');
  });

  it('keeps the baseline label once the span covers several animals', () => {
    const html = costView('guinea-pair', 30);
    expect(html).toContain('Baseline planned cost');
    expect(html).toContain('30-year illustrative scenario');
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

  it('a long-lived species over the same span stays a single-animal scenario', () => {
    // A parrot lives ~25, so 20 years is still one bird.
    const html = costView('parrot-medium', 20);
    expect(html).toContain('Baseline planned cost');
    expect(html).toContain('20-year illustrative scenario');
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

describe('cost estimate basis and contingency accounting', () => {
  it('starts in transparent illustrative mode without editable research fields', () => {
    const doc = new DOMParser().parseFromString(costView('cat-indoor', 12), 'text/html');
    expect(doc.querySelector('#cs-mode-illustrative')?.hasAttribute('checked')).toBe(true);
    expect(doc.querySelectorAll('[data-pets-cost-input]')).toHaveLength(0);
    expect(doc.querySelector('#pets-cost-source-status')?.textContent)
      .toContain('not local quotes or a forecast');
    expect(doc.body.textContent).toContain('future price changes and unexpected treatment are not forecast');
  });

  it('uses a partial local estimate while identifying every untouched starter value', () => {
    const doc = new DOMParser().parseFromString(costView('cat-indoor', 12, {
      costMode: 'local',
      costEstimates: { 'cat-indoor': { annual: 1500 } },
    }), 'text/html');
    expect(doc.querySelector('#cs-mode-local')?.hasAttribute('checked')).toBe(true);
    expect(doc.querySelector('#pets-cost-source-status')?.textContent)
      .toContain('1 of 3 dollar values replaced');
    expect(doc.querySelector('[data-pets-cost-input="annual"]')?.getAttribute('value')).toBe('1500');
    expect(doc.querySelector('[data-pets-cost-input="annual"]')?.getAttribute('data-pets-cost-input-source')).toBe('local');
    expect(doc.querySelector('[data-pets-cost-input="firstYear"]')?.getAttribute('data-pets-cost-input-source')).toBe('starter');
    expect(doc.body.textContent).toContain('12-year research scenario');
    expect(doc.body.textContent).toContain('$18,300');
  });

  it('uses all three researched values and keeps contingency outside the spending bar', () => {
    const doc = new DOMParser().parseFromString(costView('cat-indoor', 12, {
      costMode: 'local',
      costEstimates: {
        'cat-indoor': { firstYear: 2200, annual: 1400, emergencyFund: 3200 },
      },
    }), 'text/html');
    const status = doc.querySelector('#pets-cost-source-status');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.getAttribute('data-pets-cost-source-status')).toBe('researched');
    expect(status?.textContent).toContain('all 3 dollar values have been replaced');
    expect(doc.body.textContent).toContain('$17,600');
    expect(doc.body.textContent).toContain('Separate contingency savings target: $3,200');
    expect(doc.body.textContent).toContain('not predicted spending');
    expect(doc.body.textContent).toContain('not added to the baseline total');

    const allocation = doc.querySelector('.petslab-cost-allocation-bar');
    expect(allocation?.getAttribute('aria-label')).toContain('Baseline planned spending $17,600');
    expect(allocation?.getAttribute('aria-label')).not.toContain('3,200');
    expect(allocation?.querySelectorAll('.petslab-cost-allocation-segment')).toHaveLength(2);
  });

  it('flags a fully entered zero-dollar assumption for review', () => {
    const doc = new DOMParser().parseFromString(costView('cat-indoor', 12, {
      costMode: 'local',
      costEstimates: {
        'cat-indoor': { firstYear: 2200, annual: 0, emergencyFund: 3200 },
      },
    }), 'text/html');
    const status = doc.querySelector('#pets-cost-source-status');
    expect(status?.getAttribute('data-pets-cost-source-status')).toBe('review');
    expect(status?.textContent).toContain('all 3 values were replaced');
    expect(status?.textContent).toContain('1 is $0');
    expect(status?.textContent).toContain('rather than a missing cost');
  });
});
