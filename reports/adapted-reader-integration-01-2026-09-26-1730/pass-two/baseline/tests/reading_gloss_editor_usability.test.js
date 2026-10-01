import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let React, createRoot, act, Editor, find, contract, root, host;
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
  ({ Editor, find } = new Function('React', 'getInstructionalContextApi', compiled + '\nreturn {Editor:ReadingGlossEditor,find:findReadingGlossOccurrences};')(React, () => contract));
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; vi.restoreAllMocks(); });
function annotation(text, quote, index, id, definition = 'A useful explanation.') {
  let start = -1, from = 0;
  for (let count = 0; count <= index; count++) { start = text.indexOf(quote, from); from = start + quote.length; }
  return { id, start, end: start + quote.length, quote, text: definition, priority: 'helpful', origin: 'generated', pinned: false, kind: 'gloss' };
}
function mount(text = 'Fair is foul. Fair returns.', suppliedEntries) {
  const item = contract.createSupportedReading(text, { id: 'original' });
  const entries = suppliedEntries || [annotation(text, 'Fair', 0, 'first', 'First meaning.'), annotation(text, 'Fair', 1, 'second', 'Second meaning.')];
  let props = { item, supports: contract.validateReadingSupports(item, entries), disabled: false };
  const onUpdate = vi.fn(async (owner, action) => {
    const supports = action.type === 'upsert' ? contract.upsertReadingSupport(owner, props.supports, action.annotation)
      : action.type === 'remove' ? contract.removeReadingSupport(owner, props.supports, action.id)
      : contract.setReadingSupportPinned(owner, props.supports, action.id, action.pinned);
    props = { ...props, supports }; render(); return { ...owner, readingSupports: supports };
  });
  props.onUpdate = onUpdate;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => root.render(React.createElement(Editor, props));
  act(render);
  return { item, onUpdate, get props() { return props; }, update(next) { act(() => { props = { ...props, ...next }; render(); }); } };
}
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text || (text === 'Review word supports' && node.textContent.startsWith(text)));
const editButtons = () => [...host.querySelectorAll('button')].filter(node => node.getAttribute('aria-label')?.startsWith('Edit gloss for'));
const click = async node => { await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const change = (node, value) => act(() => {
  const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
  node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
async function openEdit(index = 0) { await click(button('Review word supports')); await click(editButtons()[index]); }

describe('Gloss editor exact occurrences', () => {
  it('matches whole occurrences, not substrings, contractions, or another inflection', () => {
    const text = "unfair fair fairy affair fair's fair.";
    expect(find(text, 'fair').map(match => match.start)).toEqual([text.indexOf(' fair ') + 1, text.lastIndexOf('fair.')]);
    expect(find('café cafés café', 'café')).toHaveLength(2);
    expect(find('علم معلم علمية علم', 'علم')).toHaveLength(2);
  });
  it('uses safe Unicode boundaries without Intl segmentation', () => {
    const original = Intl.Segmenter;
    try { Intl.Segmenter = undefined; expect(find('the he he’s he', 'he')).toHaveLength(2); expect(find('café cafés café', 'café')).toHaveLength(2); }
    finally { Intl.Segmenter = original; }
  });
  it('distinguishes exactly 200 matches from a capped result and explains the cap', async () => {
    expect(find('Fair '.repeat(200), 'Fair').truncated).toBe(false);
    expect(find('Fair '.repeat(201), 'Fair')).toHaveLength(200);
    expect(find('Fair '.repeat(201), 'Fair').truncated).toBe(true);
    mount('Fair '.repeat(201), []); await click(button('Review word supports')); await click(button('Add a word or phrase'));
    change(host.querySelector('input[type=text]'), 'Fair');
    expect(host.textContent).toContain('Showing the first 200 matching occurrences');
    expect(host.querySelectorAll('select')[0].options).toHaveLength(201);
  });
  it('gives repeated-word controls distinct occurrence context', async () => {
    mount(); await click(button('Review word supports'));
    const names = editButtons().map(node => node.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(2);
    expect(names[0]).toContain('1'); expect(names[1]).toContain('15–18');
    const removeNames = [...host.querySelectorAll('button')].filter(node => node.textContent === 'Remove').map(node => node.getAttribute('aria-label'));
    expect(new Set(removeNames).size).toBe(2);
  });
});

describe('Gloss editor unsaved drafts', () => {
  it('preserves a dirty draft on close, and discards only after local confirmation', async () => {
    mount(); await openEdit();
    change(host.querySelector('textarea'), 'My unsaved meaning.');
    await click(button('Review word supports'));
    expect(host.querySelector('[role=alertdialog]')).not.toBeNull();
    expect(host.querySelector('textarea').value).toBe('My unsaved meaning.');
    await click(button('Keep editing'));
    expect(host.querySelector('textarea').value).toBe('My unsaved meaning.');
    await click(button('Review word supports')); await click(button('Discard changes'));
    expect(host.querySelector('textarea')).toBeNull();
    expect(button('Review word supports').getAttribute('aria-expanded')).toBe('false');
  });
  it('guards add, edit-switch, and external edit requests while dirty', async () => {
    const h = mount(); await openEdit(); change(host.querySelector('textarea'), 'Unsaved first.');
    await click(button('Add a word or phrase')); await click(button('Keep editing'));
    expect(host.querySelector('textarea').value).toBe('Unsaved first.');
    await click(editButtons()[1]); await click(button('Keep editing'));
    expect(host.querySelector('textarea').value).toBe('Unsaved first.');
    h.update({ request: { ownerId: h.item.id, id: 'second', nonce: 1 } });
    expect(host.querySelector('[role=alertdialog]')).not.toBeNull();
    await click(button('Discard changes'));
    expect(host.querySelector('textarea').value).toBe('Second meaning.');
  });
  it('does not prompt when clean, saved, or returning to the same anchor', async () => {
    const h = mount(); await openEdit(); await click(button('Done editing'));
    expect(host.querySelector('[role=alertdialog]')).toBeNull();
    await click(editButtons()[0]); change(host.querySelector('textarea'), 'Saved meaning.');
    h.update({ request: { ownerId: h.item.id, id: 'first', nonce: 1 } });
    expect(host.querySelector('[role=alertdialog]')).toBeNull();
    expect(host.querySelector('textarea').value).toBe('Saved meaning.');
    await click(button('Save word support'));
    expect(h.onUpdate).toHaveBeenCalledTimes(1);
    await click(button('Done editing'));
    expect(host.querySelector('[role=alertdialog]')).toBeNull();
  });
  it('clears stale save/error feedback when the draft changes', async () => {
    const h = mount(); await openEdit(); change(host.querySelector('textarea'), 'First update.');
    await click(button('Save word support')); expect(host.textContent).toContain('Word support saved.');
    change(host.querySelector('textarea'), 'Second update.'); expect(host.textContent).not.toContain('Word support saved.');
    h.update({ onUpdate: vi.fn(async () => { throw new Error('Try again later.'); }) });
    await click(button('Save word support')); expect(host.querySelector('[role=alert]').textContent).toBe('Try again later.');
    change(host.querySelector('textarea'), 'Third update.'); expect(host.querySelector('[role=alert]')).toBeNull();
  });
});

describe('Gloss editor exact-anchor save safety', () => {
  it('edits legacy anchors over 160 and explanations over 600 characters without truncation', async () => {
    const quote = 'long phrase '.repeat(18).trim(), text = quote + '.';
    const explanation = 'Detailed explanation. '.repeat(45);
    const h = mount(text, [annotation(text, quote, 0, 'legacy', explanation)]);
    await openEdit();
    expect(host.querySelector('input[type=text]').value).toBe(quote);
    expect(host.querySelector('input[type=text]').readOnly).toBe(true);
    expect(host.querySelector('textarea').value).toBe(explanation);
    change(host.querySelector('textarea'), explanation + 'A revision.');
    await click(button('Save word support'));
    expect(h.onUpdate.mock.calls[0][1].annotation).toMatchObject({ start: 0, end: quote.length, quote, text: (explanation + 'A revision.').trim() });
    expect(h.item.sourceSnapshot.text).toBe(text); expect(h.item.data).toBe(text);
  });
  it('rebinds a regenerated same-range ID and never writes over the old ID at another anchor', async () => {
    const h = mount(); await openEdit(); change(host.querySelector('textarea'), 'My first occurrence meaning.');
    const original = h.props.supports.annotations;
    h.update({ supports: contract.validateReadingSupports(h.item, [{ ...original[0], id: 'regenerated-first' }, { ...original[1], id: 'first' }]) });
    await click(button('Save word support'));
    const action = h.onUpdate.mock.calls[0][1];
    expect(action.annotation).toMatchObject({ id: 'regenerated-first', start: 0, quote: 'Fair' });
    expect(h.props.supports.annotations.find(entry => entry.id === 'first')).toMatchObject({ start: 14, text: 'Second meaning.' });
  });
  it('allocates a safe new ID if the edited annotation disappears and its ID is reused', async () => {
    const h = mount(); await openEdit(); change(host.querySelector('textarea'), 'Restore the first meaning.');
    h.update({ supports: contract.validateReadingSupports(h.item, [{ ...h.props.supports.annotations[1], id: 'first' }]) });
    await click(button('Save word support'));
    expect(h.onUpdate.mock.calls[0][1].annotation.id).not.toBe('first');
    expect(h.props.supports.annotations.find(entry => entry.id === 'first').start).toBe(14);
    expect(h.props.supports.annotations.find(entry => entry.start === 0).text).toBe('Restore the first meaning.');
  });
  it('removes the exact occurrence after IDs change during discard confirmation', async () => {
    const h = mount(); await openEdit(); change(host.querySelector('textarea'), 'My unsaved first meaning.');
    const removeFirst = [...host.querySelectorAll('button')].find(node => node.getAttribute('aria-label')?.startsWith('Remove gloss for'));
    await click(removeFirst);
    expect(host.querySelector('[role=alertdialog]')).not.toBeNull();
    const original = h.props.supports.annotations;
    h.update({ supports: contract.validateReadingSupports(h.item, [{ ...original[0], id: 'regenerated-first' }, { ...original[1], id: 'first' }]) });
    await click(button('Discard changes'));
    expect(h.onUpdate.mock.calls[0][1]).toEqual({ type: 'remove', id: 'regenerated-first' });
    expect(h.props.supports.annotations).toHaveLength(1);
    expect(h.props.supports.annotations[0]).toMatchObject({ id: 'first', start: 14, text: 'Second meaning.' });
    expect(host.querySelector('textarea')).toBeNull();
  });
  it('keeps disabled controls read-only', async () => {
    const h = mount(); h.update({ disabled: true }); await click(button('Review word supports'));
    expect(editButtons().every(node => node.disabled)).toBe(true);
    expect(button('Add a word or phrase').disabled).toBe(true);
    expect(h.onUpdate).not.toHaveBeenCalled();
  });
});
