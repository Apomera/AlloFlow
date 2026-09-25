// The word-support editor shows the whole sentence around a word, and asks
// for a short meaning rather than the sentence.
//
// WHY (2026-09-23): the "In context" line was a fixed window of 35 characters
// before the word and 45 after, so it cut words in half ("ike a giant wheel
// ... changes into differe"). It sat directly above the Explanation box and
// was copied into it, so the reading showed the sentence again in brackets
// instead of what the word means.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let React, createRoot, act, Editor, context, contract, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  contract = require('../instructional_context_module.js');
  const source = readFileSync('view_simplified_source.jsx', 'utf8');
  const start = source.indexOf('  function findReadingGlossOccurrences(');
  const end = source.indexOf('  function SimplifiedView(props)', start);
  const compiled = require('@babel/core').transformSync(source.slice(start, end), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false
  }).code;
  ({ Editor, context } = new Function('React', 'getInstructionalContextApi', compiled + '\nreturn {Editor:ReadingGlossEditor,context:readingGlossContext};')(React, () => contract));
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; });

const WATER = '## The Journey\n\nThis process is called the **water cycle**. This loop is like a giant wheel that never stops spinning. As the water moves, it changes into different forms.';
const at = (text, word) => [text.indexOf(word), text.indexOf(word) + word.length];

describe('the sentence around a word support', () => {
  it('is the whole sentence, with no cut words', () => {
    const [s, e] = at(WATER, 'spinning');
    expect(context(WATER, s, e).text).toBe('This loop is like a giant wheel that never stops spinning.');
  });
  it('drops Markdown markers from headings and emphasis', () => {
    const [s, e] = at(WATER, 'cycle');
    expect(context(WATER, s, e).text).toBe('This process is called the water cycle.');
    const [h, he] = at(WATER, 'Journey');
    expect(context(WATER, h, he).text).toBe('The Journey');
  });
  it('trims a very long sentence at word boundaries and marks it', () => {
    const long = 'Word '.repeat(80) + 'target ' + 'word '.repeat(80) + 'end.';
    const [s, e] = at(long, 'target');
    const parts = context(long, s, e, 120);
    expect(parts.text.startsWith('…')).toBe(true);
    expect(parts.text.endsWith('…')).toBe(true);
    expect(parts.text).toContain('target');
    expect(parts.text.length).toBeLessThanOrEqual(130);
    expect(parts.text.replace(/…/g, '').trim().split(' ').every(w => ['Word', 'word', 'target'].includes(w))).toBe(true);
  });
  it('stops at a line break, like a heading or a list item', () => {
    const text = 'A title\nOne line about heath\nAnother line';
    const [s, e] = at(text, 'heath');
    expect(context(text, s, e).text).toBe('One line about heath');
  });
});

describe('the editor', () => {
  function mountEditing(word) {
    const item = contract.createSupportedReading(WATER, { id: 'original' });
    const [s, e] = at(WATER, word);
    const supports = contract.validateReadingSupports(item, [{ id: 'g', start: s, end: e, quote: word, text: 'turning around and around', priority: 'helpful', kind: 'gloss' }]);
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(Editor, { item, supports, onUpdate: async () => null, disabled: false })));
    const click = node => act(() => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    click([...host.querySelectorAll('button')].find(b => b.textContent.startsWith('Review word supports')));
    click(host.querySelector('button[aria-label^="Edit gloss for"]'));
  }
  it('shows the sentence with the word marked, and asks for a short meaning', () => {
    mountEditing('spinning');
    const line = host.querySelector('[data-gloss-context]');
    expect(line.textContent).toBe('In the text: This loop is like a giant wheel that never stops spinning.');
    expect(line.querySelector('mark').textContent).toBe('spinning');
    const box = host.querySelector('textarea');
    expect(box.getAttribute('placeholder')).toMatch(/turning around/);
    expect(host.querySelector('#' + box.getAttribute('aria-describedby')).textContent).toMatch(/means in this sentence/);
    expect(host.querySelector('[data-gloss-context-warning]')).toBeNull();
    // The list of saved supports names each one by the same whole sentence.
    const listed = [...host.querySelectorAll('li p')].find(p => /text position/.test(p.textContent));
    expect(listed.textContent).toMatch(/: This loop is like a giant wheel that never stops spinning\.$/);
  });
  it('says so when the sentence is pasted in as the explanation', () => {
    mountEditing('spinning');
    const box = host.querySelector('textarea');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(box, 'In context: like a giant wheel that never stops spinning.');
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('[data-gloss-context-warning]').textContent).toMatch(/Write what the word means/);
  });
});
