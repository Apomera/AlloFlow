import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mountGame } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const content = 'Sharing a meal';
const description = 'A child and two adults share a meal around a table.';
const cleanups = [];
beforeAll(() => loadAlloModule('alt_text_module.js'));
afterEach(() => cleanups.splice(0).forEach(fn => fn()));

function renderItem(overrides = {}) {
  const item = { id: 'meal', content, categoryId: 'same', image, imageAlt: description,
    imageAltHash: window.AlloModules.AltText.hashImage(image), ...overrides };
  const game = mountGame('ConceptSortGame', {
    data: { categories: [{ id: 'same', label: 'Stayed the same' }], items: [item] },
    onClose: () => {},
  });
  cleanups.push(game.unmount);
  return { card: game.container.querySelector('[data-help-key="concept_sort_card_item"]'),
    img: game.container.querySelector('img') };
}

describe('concept-sort picture descriptions', () => {
  it('exposes the current reviewed description in both the image and card accessible name', () => {
    const { card, img } = renderItem();
    expect(img.alt).toBe(description);
    expect(card.getAttribute('aria-label')).toContain(content);
    expect(card.getAttribute('aria-label')).toContain(description);
  });
  it('does not announce a stale description after the picture changes', () => {
    const { card, img } = renderItem({ imageAltHash: 'stale-image' });
    expect(img.alt).toBe(content);
    expect(card.getAttribute('aria-label')).not.toContain(description);
  });
  it('respects decorative images without losing the card text', () => {
    const { card, img } = renderItem({ imageDecorative: true });
    expect(img.alt).toBe('');
    expect(card.getAttribute('aria-label')).toContain(content);
    expect(card.getAttribute('aria-label')).not.toContain(description);
  });
  it('keeps legacy descriptions that have no image hash', () => {
    const { img } = renderItem({ imageAltHash: undefined });
    expect(img.alt).toBe(description);
  });
  it('omits picture descriptions when the picture has been removed', () => {
    const { card, img } = renderItem({ image: null });
    expect(img).toBeNull();
    expect(card.getAttribute('aria-label')).not.toContain(description);
  });
});
