import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Learning Lab Flashcard Deck rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = {
      learningLab: {
        view: 'mytkFlash',
        viewLabel: 'Flashcard Deck',
        mytkFlash: {
          decks: ['Default', 'Biology'],
          cards: [
            { id: 'card-1', deck: 'Biology', front: 'Cell powerhouse?', back: 'Mitochondria', nextDue: '2026-07-18', reviewCount: 1, ease: 2.5, interval: 1 },
            { id: 'card-2', deck: 'Biology', front: 'Photosynthesis organelle?', back: 'Chloroplast', nextDue: '2026-07-18', reviewCount: 0, ease: 2.5, interval: 0 },
            { id: 'card-3', deck: 'Biology', front: 'DNA shape?', back: 'Double helix', nextDue: '2099-01-01', reviewCount: 2, ease: 2.5, interval: 5 },
          ],
          preservedSibling: true,
        },
      },
    };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({
        toolData,
        update: (toolId, key, value) => {
          setToolData((previous) => ({
            ...previous,
            [toolId]: { ...(previous[toolId] || {}), [key]: value },
          }));
        },
      });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"], [data-learning-lab-form="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  async function openBiology() {
    const button = host.querySelector('button[aria-labelledby="learning-lab-flashcards-deck-biology-title"]');
    await act(async () => { button.click(); await Promise.resolve(); });
  }

  it('renders decks as a named semantic list with explicit native controls', () => {
    expect(host.querySelector('#learning-lab-flashcards-heading')?.tagName).toBe('H2');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-flashcards-heading"] > li')).toHaveLength(2);
    expect(host.querySelector('button[aria-labelledby="learning-lab-flashcards-deck-default-title"]')?.type).toBe('button');
    expect(host.querySelector('button[aria-label="Delete flashcard deck: Biology"]')?.type).toBe('button');
    expect([...host.querySelectorAll('button')].find((button) => button.textContent === 'New deck')?.type).toBe('button');
  });

  it('opens a deck, restores heading focus, and renders semantic card metadata', async () => {
    await openBiology();
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-cards-heading');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-flashcards-cards-heading"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('Reviews completed: 1');
    expect(host.querySelector('time[datetime="2099-01-01"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Edit flashcard: Cell powerhouse?"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Delete flashcard: Cell powerhouse?"]')).not.toBeNull();
  });

  it('opens the labeled native authoring form and reports both missing fields', async () => {
    await openBiology();
    const newCard = [...host.querySelectorAll('button')].find((button) => button.textContent === 'New card');
    await act(async () => { newCard.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-form-heading');
    expect(host.querySelector('label[for="learning-lab-flashcard-front"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-flashcard-back"]')).not.toBeNull();
    const form = host.querySelector('form[aria-labelledby="learning-lab-flashcards-form-heading"]');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const front = host.querySelector('#learning-lab-flashcard-front');
    expect(host.querySelector('#learning-lab-flashcard-front-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-flashcard-back-error')?.getAttribute('role')).toBe('alert');
    expect(front?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(front);
  });

  it('opens an existing card for editing with populated fields', async () => {
    await openBiology();
    const edit = host.querySelector('button[aria-label="Edit flashcard: Cell powerhouse?"]');
    await act(async () => { edit.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-flashcards-form-heading')?.textContent).toContain('Edit flashcard');
    expect(host.querySelector('#learning-lab-flashcard-front')?.value).toBe('Cell powerhouse?');
    expect(host.querySelector('#learning-lab-flashcard-back')?.value).toBe('Mitochondria');
    expect([...host.querySelectorAll('button')].find((button) => button.textContent === 'Save changes')).not.toBeNull();
  });

  it('keeps a stable review queue after rating the first due card', async () => {
    await openBiology();
    const review = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Review 2 due cards');
    await act(async () => { review.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-review-card-heading');
    expect(host.textContent).toContain('Cell powerhouse?');
    const show = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Show answer');
    await act(async () => { show.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-rating-heading');
    expect(host.querySelector('fieldset[aria-describedby="learning-lab-flashcards-rating-help"]')).not.toBeNull();
    const good = host.querySelector('button[aria-label="Good: Use a medium interval"]');
    await act(async () => { good.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-review-card-heading');
    expect(host.textContent).toContain('Card 2 of 2');
    expect(host.textContent).toContain('Photosynthesis organelle?');
  });

  it('confirms card deletion and restores the card heading', async () => {
    await openBiology();
    const remove = host.querySelector('button[aria-label="Delete flashcard: Cell powerhouse?"]');
    await act(async () => { remove.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete card');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Cell powerhouse?');
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-cards-heading');
  });

  it('confirms deck deletion and restores the decks heading', async () => {
    const remove = host.querySelector('button[aria-label="Delete flashcard deck: Biology"]');
    await act(async () => { remove.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete deck');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('button[aria-labelledby="learning-lab-flashcards-deck-biology-title"]')).toBeNull();
    expect(document.activeElement?.id).toBe('learning-lab-flashcards-heading');
  });
});
