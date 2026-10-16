import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('host_handlers_source.jsx', 'utf8');
const mutation = source.slice(source.indexOf('const onUpdateResource ='), source.indexOf('const focusGuidedTarget ='));
const deletion = source.slice(source.indexOf('const _glossaryDeletionEntryId ='), source.indexOf('const _applySimplifiedTextMutation ='));
const create = new Function('__d', mutation + deletion + '\nreturn { onUpdateResource, handleDeleteGlossaryItem, handleDeleteTermImage };');
const beginGlossaryTask = new Function(readFileSync('glossary_helpers_source.jsx', 'utf8') + '\nreturn beginGlossaryTask;')();

const entry = (id, extra = {}) => ({ entryId: id, term: id, definition: 'Definition of ' + id, ...extra });
const imageFields = {
  image: 'data:image/png;base64,original', imageAlt: 'A green leaf', imageAltHash: 'original-hash',
  imageAltSource: 'author', imageDecorative: false, imageSource: 'mulberry',
  imageAttribution: { author: 'Symbol author', license: 'CC BY-SA' }, imageCreditBand: 48,
};
function setup(data = [entry('leaf', imageFields), entry('root'), entry('stem')], options = {}) {
  const resource = { id: 'glossary-1', type: 'glossary', title: 'Plants', data, ...options.resource };
  const state = { generatedContent: resource, history: [resource], isTeacherMode: true };
  const deps = {
    get generatedContent() { return state.generatedContent; }, get history() { return state.history; },
    _resourceMutationStateRef: options.legacy ? undefined : { current: state },
    setGeneratedContent: update => { state.generatedContent = typeof update === 'function' ? update(state.generatedContent) : update; },
    setHistory: update => { state.history = typeof update === 'function' ? update(state.history) : update; },
    _alloArtifactMatchesInstanceId: (item, id) => item._artifactInstanceId === id,
    t: key => key, addToast: vi.fn(),
  };
  const handlers = create(deps);
  if (options.publicMutation) deps.onUpdateResource = vi.fn(handlers.onUpdateResource);
  const edit = update => {
    deps.setGeneratedContent(update);
    deps.setHistory(previous => previous.map(item => item.id === resource.id ? update(item) : item));
  };
  return { state, deps, ...handlers, edit };
}

describe('reversible glossary deletion', () => {
  it.each([{}, { legacy: true }, { publicMutation: true }])('restores a deleted word without discarding later changes: %j', options => {
    const fixture = setup(undefined, options);
    const { state, handleDeleteGlossaryItem, edit } = fixture;
    const deleted = state.generatedContent.data[1];
    const receipt = handleDeleteGlossaryItem(1);
    expect(receipt).toMatchObject({ kind: 'term', term: 'root', resourceId: 'glossary-1' });
    expect(state.generatedContent.data.map(item => item.term)).toEqual(['leaf', 'stem']);
    edit(previous => ({ ...previous, title: 'Revised plants', data: previous.data.map(item => item.entryId === 'leaf' ? { ...item, definition: 'Edited after deletion' } : item) }));
    expect(receipt.undo()).toBe(true);
    for (const resource of [state.generatedContent, state.history[0]]) {
      expect(resource.title).toBe('Revised plants');
      expect(resource.data.map(item => item.term)).toEqual(['leaf', 'root', 'stem']);
      expect(resource.data[0].definition).toBe('Edited after deletion');
      expect(resource.data[1]).toBe(deleted);
    }
    expect(receipt.undo()).toBe(false);
    expect(fixture.deps.addToast).toHaveBeenCalledOnce();
  });

  it('restores words in their original neighborhood after several deletions and insertions', () => {
    const { state, handleDeleteGlossaryItem, edit } = setup([entry('a'), entry('b'), entry('c'), entry('d')]);
    const b = handleDeleteGlossaryItem(1);
    const c = handleDeleteGlossaryItem(1);
    edit(previous => ({ ...previous, data: [entry('new'), ...previous.data] }));
    expect(c.undo()).toBe(true);
    expect(b.undo()).toBe(true);
    expect(state.generatedContent.data.map(item => item.term)).toEqual(['new', 'a', 'b', 'c', 'd']);
  });

  it('restores the last word after the glossary becomes empty', () => {
    const { state, handleDeleteGlossaryItem } = setup([entry('leaf')]);
    const receipt = handleDeleteGlossaryItem(0);
    expect(state.generatedContent.data).toEqual([]);
    expect(receipt.undo()).toBe(true);
    expect(state.generatedContent.data.map(item => item.term)).toEqual(['leaf']);
  });

  it('refuses to duplicate an entry restored by another action', () => {
    const { state, handleDeleteGlossaryItem, edit } = setup();
    const receipt = handleDeleteGlossaryItem(0);
    edit(previous => ({ ...previous, data: [entry('leaf', { definition: 'Restored and edited elsewhere' }), ...previous.data] }));
    expect(receipt.undo()).toBe(false);
    expect(state.generatedContent.data).toHaveLength(3);
    expect(state.generatedContent.data[0].definition).toBe('Restored and edited elsewhere');
  });

  it('supports a legacy entry and detects an externally restored copy', () => {
    const legacy = { term: 'leaf', definition: 'Green plant part' };
    const { state, handleDeleteGlossaryItem, edit } = setup([legacy, entry('root')]);
    const receipt = handleDeleteGlossaryItem(0);
    edit(previous => ({ ...previous, data: [{ ...legacy }, ...previous.data] }));
    expect(receipt.undo()).toBe(false);
    expect(state.generatedContent.data).toHaveLength(2);
  });

  it('can remove and restore one of two equal legacy entries', () => {
    const legacy = { term: 'leaf', definition: 'Green plant part' };
    const { state, handleDeleteGlossaryItem } = setup([legacy, { ...legacy }]);
    const receipt = handleDeleteGlossaryItem(0);
    expect(state.generatedContent.data).toHaveLength(1);
    expect(receipt.undo()).toBe(true);
    expect(state.generatedContent.data).toHaveLength(2);
  });

  it('does not overwrite independent changes in the displayed resource and history', () => {
    const { state, handleDeleteGlossaryItem } = setup();
    const receipt = handleDeleteGlossaryItem(1);
    state.generatedContent = { ...state.generatedContent, title: 'Displayed edits' };
    state.history = [{ ...state.history[0], description: 'History edits' }];
    expect(receipt.undo()).toBe(true);
    expect(state.generatedContent.title).toBe('Displayed edits');
    expect(state.history[0].description).toBe('History edits');
  });

  it.each(['term', 'image'])('leaves other resources untouched after navigating away from a deleted %s', kind => {
    const { state, handleDeleteGlossaryItem, handleDeleteTermImage } = setup();
    const receipt = (kind === 'term' ? handleDeleteGlossaryItem : handleDeleteTermImage)(0);
    const savedHistory = state.history;
    const other = { id: 'other', type: 'glossary', data: [entry('other')] };
    state.generatedContent = other;
    expect(receipt.undo()).toBe(false);
    expect(state.generatedContent).toBe(other);
    expect(state.history).toBe(savedHistory);
  });

  it('does not restore into another copy of the same public resource id', () => {
    const { state, handleDeleteGlossaryItem } = setup(undefined, { resource: { _artifactInstanceId: 'copy-a' } });
    const receipt = handleDeleteGlossaryItem(0);
    state.generatedContent = { ...state.generatedContent, _artifactInstanceId: 'copy-b' };
    expect(receipt.undo()).toBe(false);
    expect(state.generatedContent.data.map(item => item.term)).toEqual(['root', 'stem']);
  });

  it('uses the freshest active resource rather than a stale handler render', () => {
    const { state, deps } = setup();
    const stale = state.generatedContent;
    const newer = { ...stale, data: [entry('new'), ...stale.data] };
    state.generatedContent = newer; state.history = [newer];
    const staleDeps = { ...deps, generatedContent: stale, history: [stale] };
    const { handleDeleteGlossaryItem } = create(staleDeps);
    const receipt = handleDeleteGlossaryItem(0);
    expect(receipt.term).toBe('new');
    expect(state.generatedContent.data[0].term).toBe('leaf');
  });

  it('removes image description and attribution together, then restores them without reverting text edits', () => {
    const { state, handleDeleteTermImage, edit } = setup();
    const receipt = handleDeleteTermImage(0);
    expect(receipt).toMatchObject({ kind: 'image', term: 'leaf', resourceId: 'glossary-1' });
    for (const field of Object.keys(imageFields)) expect(state.generatedContent.data[0]).not.toHaveProperty(field);
    edit(previous => ({ ...previous, data: previous.data.map(item => item.entryId === 'leaf' ? { ...item, definition: 'Updated definition', translations: { French: 'feuille' } } : item).reverse() }));
    expect(receipt.undo()).toBe(true);
    for (const resource of [state.generatedContent, state.history[0]]) {
      expect(resource.data.find(item => item.entryId === 'leaf')).toMatchObject({ ...imageFields, definition: 'Updated definition', translations: { French: 'feuille' } });
    }
    expect(receipt.undo()).toBe(false);
  });

  it('keeps a legacy image receipt attached to its word after editing and reordering', () => {
    const { state, handleDeleteTermImage, edit } = setup([{ term: 'leaf', ...imageFields }, { term: 'root' }]);
    const receipt = handleDeleteTermImage(0);
    const id = state.generatedContent.data[0].entryId;
    expect(id).toMatch(/^glossary-/);
    edit(previous => ({ ...previous, data: previous.data.map(item => item.entryId === id ? { ...item, term: 'leaves' } : item).reverse() }));
    expect(receipt.undo()).toBe(true);
    expect(state.generatedContent.data[1]).toMatchObject({ term: 'leaves', ...imageFields });
    expect(state.generatedContent.data[0]).not.toHaveProperty('image');
  });

  it.each([{ image: 'replacement-image' }, { imageAlt: 'New description awaiting a picture' }])('refuses to overwrite replacement media: %j', replacement => {
    const { state, handleDeleteTermImage, edit } = setup();
    const receipt = handleDeleteTermImage(0);
    edit(previous => ({ ...previous, data: previous.data.map((item, index) => index === 0 ? { ...item, ...replacement } : item) }));
    expect(receipt.undo()).toBe(false);
    expect(state.generatedContent.data[0]).toMatchObject(replacement);
  });

  it('can undo an image removal after undoing deletion of its word', () => {
    const { state, handleDeleteGlossaryItem, handleDeleteTermImage } = setup();
    const image = handleDeleteTermImage(0), word = handleDeleteGlossaryItem(0);
    expect(image.undo()).toBe(false);
    expect(word.undo()).toBe(true);
    expect(image.undo()).toBe(true);
    expect(state.generatedContent.data[0]).toMatchObject(imageFields);
  });

  it.each([-1, 0.5, 3, '0', null, undefined, NaN, Infinity])('ignores invalid deletion indexes: %s', index => {
    const { state, deps, handleDeleteGlossaryItem, handleDeleteTermImage } = setup();
    const original = state.generatedContent;
    expect(handleDeleteGlossaryItem(index)).toBeNull();
    expect(handleDeleteTermImage(index)).toBeNull();
    expect(state.generatedContent).toBe(original);
    expect(deps.addToast).not.toHaveBeenCalled();
  });

  it('does not create an image receipt for a word without an image', () => {
    const { handleDeleteTermImage } = setup([entry('leaf')]);
    expect(handleDeleteTermImage(0)).toBeNull();
  });

  it.each(['term', 'image'])('invalidates pending image work before deleting and restoring a %s, including legacy entries', kind => {
    const { state, deps, handleDeleteGlossaryItem, handleDeleteTermImage } = setup([{ term: 'leaf', ...imageFields }]);
    const registry = new Map();
    const busy = { image: {}, etymology: {} };
    deps.setIsGeneratingTermImage = update => { busy.image = update(busy.image); };
    deps.setIsGeneratingEtymology = update => { busy.etymology = update(busy.etymology); };
    deps._alloBeginGlossaryTask = (index, fields, channel) => beginGlossaryTask({
      ...deps, generatedContent: state.generatedContent,
      getGlossaryLive: () => ({ resource: state.generatedContent, history: state.history, activeView: 'glossary' }),
      glossaryTaskRegistry: registry,
    }, index, fields, channel);
    const pendingImage = deps._alloBeginGlossaryTask(0, ['image'], 'image');
    pendingImage.busy(deps.setIsGeneratingTermImage, true);
    const pendingRoots = deps._alloBeginGlossaryTask(0, ['term'], 'etymology');
    pendingRoots.busy(deps.setIsGeneratingEtymology, true);
    const receipt = kind === 'term' ? handleDeleteGlossaryItem(0) : handleDeleteTermImage(0);
    expect(receipt.undo()).toBe(true);
    expect(pendingImage.signal.aborted).toBe(true);
    expect(pendingImage.commit(() => ({ image: 'obsolete-image' }))).toBe(false);
    expect(state.generatedContent.data[0].image).toBe(imageFields.image);
    expect(busy.image['index:0']).toBe(false);
    expect(pendingRoots.signal.aborted).toBe(kind === 'term');
    if (kind === 'term') {
      expect(pendingRoots.commit(() => ({ etymology: 'obsolete-roots' }))).toBe(false);
      expect(busy.etymology['index:0']).toBe(false);
    }
  });
});
