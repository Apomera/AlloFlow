import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

beforeAll(() => { new Function(readFileSync('export_module.js', 'utf8'))(); });
afterEach(() => {
  document.querySelector('.agx-dialog')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  document.body.replaceChildren();
});

const terms = () => [...document.querySelectorAll('.agx-review li')].map(node => node.textContent);
const set = (selector, value) => { const node = document.querySelector(selector); node.value = value; node.dispatchEvent(new Event('change')); };
function setup() {
  const words = [
    { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', isSelected: true },
    { entryId: 'stem', term: 'Stem', def: '', translations: { Spanish: 'Tallo' }, isSelected: false },
    { entryId: 'root', term: 'Root', def: '', isSelected: true },
  ];
  const content = { type: 'glossary', title: 'Plants', data: words };
  const liveRef = { current: { generatedContent: content, filteredGlossaryResource: content, filteredGlossaryData: [words[1]], t: key => key } };
  const api = window.AlloModules.createExport({ liveRef, escapeXml: String });
  api.handleExportGlossaryFile('chooser');
  return { words, liveRef };
}

describe('word-list export missing card backs', () => {
  it('lists only omitted terms for the current card back and scope, with CSV hiding the review', () => {
    setup();
    expect(document.querySelector('.agx-review').hidden).toBe(true);
    document.querySelector('input[value="quizlet"]').click();
    expect(terms()).toEqual(['Stem', 'Root']);
    const review = document.querySelector('.agx-review'); review.open = true;
    set('[data-agx-back]', 'Spanish');
    expect(review.open).toBe(true);
    expect(terms()).toEqual(['Leaf', 'Root']);
    set('[data-agx-scope]', 'filtered');
    expect(terms()).toEqual([]);
    expect(review.hidden).toBe(true);
    expect(document.querySelector('.agx-btn-primary').disabled).toBe(false);
    set('[data-agx-scope]', 'selected');
    expect(terms()).toEqual(['Leaf', 'Root']);
    expect(review.hidden).toBe(false);
    expect(document.querySelector('.agx-btn-primary').disabled).toBe(true);
    document.querySelector('input[value="csv"]').click();
    expect(review.hidden).toBe(true);
    expect(terms()).toEqual([]);
    expect(document.querySelector('.agx-btn-primary').disabled).toBe(false);
  });

  it('keeps every omitted term inspectable when no cards are ready and renders term text safely', () => {
    const { words, liveRef } = setup();
    words[2].term = '<img src=x onerror=alert(1)> جذر';
    liveRef.current.filteredGlossaryData = [words[2]];
    document.querySelector('input[value="anki"]').click();
    set('[data-agx-scope]', 'filtered');
    expect(document.querySelector('.agx-btn-primary').disabled).toBe(true);
    const review = document.querySelector('.agx-review');
    expect(review.hidden).toBe(false);
    expect(review.querySelector('summary').textContent).toBe('Words to review');
    expect(terms()).toEqual(['<img src=x onerror=alert(1)> جذر']);
    expect(review.querySelector('img')).toBeNull();
    expect(review.querySelector('li bdi').dir).toBe('auto');
    const region = review.querySelector('[role="region"]');
    expect(region.tabIndex).toBe(0);
    expect(document.getElementById(region.getAttribute('aria-labelledby'))).toBe(review.querySelector('summary'));
    expect(document.getElementById(review.querySelector('summary').getAttribute('aria-describedby')).textContent).toContain('No words have text for the back');
  });

  it('exports only ready cards and reconstructs the review after returning from Quizlet', () => {
    setup();
    document.querySelector('input[value="quizlet"]').click();
    set('[data-agx-back]', 'Spanish');
    expect(terms()).toEqual(['Leaf', 'Root']);
    document.querySelector('.agx-btn-primary').click();
    expect(document.querySelector('textarea').value).toBe('Stem\tTallo');
    [...document.querySelectorAll('.agx-dialog button')].find(button => button.textContent === 'Back to export options').click();
    expect(document.querySelector('[data-agx-back]').value).toBe('Spanish');
    expect(document.querySelector('input[value="quizlet"]').checked).toBe(true);
    expect(terms()).toEqual(['Leaf', 'Root']);
  });
});
