import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
let React, act, createRoot, Editor, contract, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'))); act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  contract = require('../instructional_context_module.js');
  const source = readFileSync('view_simplified_source.jsx', 'utf8');
  const compiled = require('@babel/core').transformSync(source.slice(source.indexOf('  function findReadingGlossOccurrences('), source.indexOf('  function SimplifiedView(props)')), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false
  }).code;
  Editor = new Function('React', 'getInstructionalContextApi', compiled + '\nreturn ReadingGlossEditor;')(React, () => contract);
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); });
function fixture(adapted = false) {
  const original = contract.createSupportedReading('The heron stood in water.', { id: 'original' });
  let item = adapted ? { id: 'adapted', type: 'simplified', data: original.data, sourceSnapshot: original.sourceSnapshot, instructionalText: { form: 'adapted' } } : original;
  const entry = { id: 'heron', start: 4, end: 9, quote: 'heron', text: 'A wading bird.' };
  let supports = adapted ? contract.upsertAdaptedReadingSupport(item, null, entry) : contract.upsertReadingSupport(item, null, entry);
  const initial = supports, session = require('../reader_support_drafts.js').createSession();
  const persist = vi.fn(async (owner, action) => {
    const suffix = adapted ? 'AdaptedReadingSupport' : 'ReadingSupport';
    const saved = action.type === 'remove' ? contract['remove' + suffix](item, supports, action.id)
      : action.type === 'pin' ? contract['set' + suffix + 'Pinned'](item, supports, action.id, action.pinned)
      : contract['upsert' + suffix](item, supports, action.annotation);
    supports = saved; render();
    return { ...item, [adapted ? 'adaptedReadingSupports' : 'readingSupports']: saved };
  });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  function render() { root.render(React.createElement(Editor, { item, supports, adapted, snapshot: adapted ? contract.getAdaptedSupportSnapshot(item, supports) : undefined, draftSession: session, onUpdate: persist })); }
  act(render);
  return { initial, item, session, persist, get supports() { return supports; }, changeOwner: next => act(() => { item = next; render(); }) };
}
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text || (text === 'Review word supports' && node.textContent.startsWith(text)));
const click = async node => act(async () => { expect(node).toBeTruthy(); node.click(); });
const draft = () => host.querySelector('[data-gloss-draft]');
const entryPin = () => host.querySelector('input[aria-label^="Always show in lighter view:"]');
const remove = () => host.querySelector('button[aria-label^="Remove gloss for"]');
async function edit() { await click(button('Review word supports')); await click(host.querySelector('button[aria-label^="Edit gloss for"]')); }
function type(value) { act(() => { const node = draft().querySelector('textarea'); node.focus(); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

describe('save confirmation source and owner', () => {
  for (const adapted of [false, true]) {
    it.each(['wrong source', 'missing source', 'malformed annotations', 'null annotation'])(`retains the ${adapted ? 'adapted' : 'original'} draft and blocks navigation for %s`, async result => {
      const h = fixture(adapted); await edit(); type('Retain my explanation.');
      const accepted = { ...h.initial, annotations: h.initial.annotations.map(entry => ({ ...entry, text: 'Retain my explanation.' })) };
      if (result === 'wrong source') accepted.sourceFingerprint = 'another-source';
      if (result === 'missing source') delete accepted.sourceFingerprint;
      if (result === 'malformed annotations') accepted.annotations = { saved: true };
      if (result === 'null annotation') accepted.annotations = [null];
      h.persist.mockResolvedValueOnce({ [adapted ? 'adaptedReadingSupports' : 'readingSupports']: accepted });
      const leave = vi.fn(); act(() => h.session.request(leave)); await click(button('Save and continue'));
      expect(leave).not.toHaveBeenCalled(); expect(host.textContent).toContain('did not confirm this word support');
      expect(draft().querySelector('textarea').value).toBe('Retain my explanation.'); expect(h.session.hasChanges()).toBe(true);
      await click(button('Keep editing')); expect(document.activeElement).toBe(draft().querySelector('textarea'));
      act(() => h.session.request(leave)); await click(button('Save and continue'));
      expect(leave).toHaveBeenCalledOnce(); expect(h.session.hasChanges()).toBe(false);
    });
  }
  for (const field of ['_artifactInstanceId', 'sourceFamilyId', 'unitId']) {
    it.each(['success', 'failure'])(`ignores a late save %s after ${field} changes with identical ID and text`, async outcome => {
      const h = fixture(); await edit(); type('Belongs to the previous owner.');
      const pending = deferred(); h.persist.mockReturnValueOnce(pending.promise); await click(button('Save word support'));
      const accepted = contract.upsertReadingSupport(h.item, h.initial, h.persist.mock.calls[0][1].annotation);
      h.changeOwner({ ...h.item, [field]: 'new-owner' }); expect(draft()).toBeNull();
      await act(async () => outcome === 'success' ? pending.resolve(accepted) : pending.reject(new Error('Previous owner save failed.')));
      expect(draft()).toBeNull(); expect(host.textContent).not.toContain('Word support saved.'); expect(host.textContent).not.toContain('Previous owner save failed.');
      h.changeOwner(h.item); expect(draft().querySelector('textarea').value).toBe('Belongs to the previous owner.'); expect(h.session.hasChanges()).toBe(true);
    });
  }
  it.each(['success', 'failure'])('ignores an obsolete %s after owner A → B → A', async outcome => {
    const h = fixture(); await edit(); type('Earlier unsaved wording.'); const pending = deferred();
    h.persist.mockReturnValueOnce(pending.promise); await click(button('Save word support'));
    const accepted = contract.upsertReadingSupport(h.item, h.initial, h.persist.mock.calls[0][1].annotation);
    h.changeOwner({ ...h.item, _artifactInstanceId: 'temporary-owner' }); h.changeOwner(h.item); type('Newer wording after returning.');
    await act(async () => outcome === 'success' ? pending.resolve(accepted) : pending.reject(new Error('Obsolete failure.')));
    expect(draft().querySelector('textarea').value).toBe('Newer wording after returning.'); expect(host.textContent).not.toContain('Obsolete failure.'); expect(h.session.hasChanges()).toBe(true);
  });
});

describe('confirmed support mutations', () => {
  it.each(['unchanged', 'malformed', 'wrong source', 'wrong occurrence'])('does not claim an unconfirmed pin succeeded: %s', async result => {
    const h = fixture(); await edit(); type('Keep my draft.');
    let returned = h.initial;
    if (result === 'malformed') returned = { ok: true };
    if (result === 'wrong source') returned = { ...h.initial, sourceFingerprint: 'other-source', annotations: h.initial.annotations.map(entry => ({ ...entry, pinned: true })) };
    if (result === 'wrong occurrence') returned = { ...h.initial, annotations: [{ ...h.initial.annotations[0], start: 19, end: 24, quote: 'water', pinned: true }] };
    h.persist.mockResolvedValueOnce(returned); await click(entryPin());
    expect(host.textContent).toContain('did not confirm the pin change'); expect(host.textContent).not.toContain('This support will stay visible');
    expect(draft().querySelector('input[type="checkbox"]').checked).toBe(false); expect(draft().querySelector('textarea').value).toBe('Keep my draft.'); expect(h.session.hasChanges()).toBe(true);
    await click(entryPin()); expect(h.supports.annotations[0].pinned).toBe(true); expect(draft().querySelector('input[type="checkbox"]').checked).toBe(true);
    expect(draft().querySelector('textarea').value).toBe('Keep my draft.'); expect(h.session.hasChanges()).toBe(true);
  });
  it('confirms unpinning without dirtying a clean editor', async () => {
    const h = fixture(); await edit(); await click(entryPin()); await click(entryPin());
    expect(h.supports.annotations[0].pinned).toBe(false); expect(draft().querySelector('input[type="checkbox"]').checked).toBe(false); expect(h.session.hasChanges()).toBe(false);
  });
  for (const adapted of [false, true]) {
    it.each(['unchanged', 'malformed', 'missing suppression', 'malformed suppression', 'wrong source'])(`retains the ${adapted ? 'adapted' : 'original'} editor after an unconfirmed removal: %s`, async result => {
      const h = fixture(adapted); await edit();
      let returned = h.initial;
      if (result === 'malformed') returned = { ok: true };
      if (result === 'missing suppression') returned = { ...h.initial, annotations: [] };
      if (result === 'malformed suppression') returned = { ...h.initial, annotations: [], suppressedAnnotations: {} };
      if (result === 'wrong source') returned = { ...h.initial, sourceFingerprint: 'other-source', annotations: [], suppressedAnnotations: [h.initial.annotations[0]] };
      h.persist.mockResolvedValueOnce(returned); await click(remove());
      expect(host.textContent).toContain('did not confirm this removal'); expect(host.textContent).not.toContain('Word support removed.');
      expect(draft().querySelector('textarea').value).toBe('A wading bird.'); expect(h.supports.annotations).toHaveLength(1);
      await click(remove()); expect(draft()).toBeNull(); expect(h.supports.annotations).toHaveLength(0);
      expect(h.supports.suppressedAnnotations).toContainEqual({ start: 4, end: 9, quote: 'heron' }); expect(h.session.hasChanges()).toBe(false);
    });
  }
});
