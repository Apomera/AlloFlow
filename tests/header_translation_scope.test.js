import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('host_handlers_source.jsx', 'utf8');
const createHostHandlers = new Function(source + '\nreturn createHostHandlers;')();
const resource = (id, extra = {}) => ({ id, type: 'quiz', data: { questions: [] }, ...extra });
const select = (history, current = history[0], options = {}, scope = 'pack') => createHostHandlers({
  history, generatedContent: current, ...options
}).getTranslationBatchItems(scope);
const ids = batch => batch.items.map(item => item.id);

describe('header translation scope follows the current saved pack', () => {
  it('uses the current resource unit instead of another selected unit or previous pack run', () => {
    const a = resource('a', { unitId: 'unit-a' });
    const b = resource('b', { config: { unitId: 'unit-a' } });
    const other = resource('other', { unitId: 'unit-b' });
    const result = select([a, b, other], a, { activeUnitId: 'unit-b', fullPackRun: { resources: { quiz: { resourceId: 'other' } } } });
    expect(ids(result)).toEqual(['a', 'b']);
    expect(result.kind).toBe('pack');
  });

  it('resolves a shared source family when the resources have no unit', () => {
    const a = resource('a', { sourceFamilyId: 'family-a' });
    const b = resource('b', { config: { sourceFamilyId: 'family-a' } });
    const unrelated = resource('unrelated', { sourceFamilyId: 'family-b' });
    expect(ids(select([a, b, unrelated]))).toEqual(['a', 'b']);
  });

  it('includes the canonical source and dependents that store artifact identity in different locations', () => {
    const sourceItem = resource('source', { type: 'analysis' });
    const a = resource('a', { config: { sourceArtifactId: 'source' } });
    const b = resource('b', { instructionalText: { primaryArtifactId: 'source' } });
    const c = resource('c', { sourceSnapshot: { sourceArtifactId: 'source' } });
    const other = resource('other', { sourceArtifactId: 'other-source' });
    expect(ids(select([sourceItem, a, b, c, other], a))).toEqual(['source', 'a', 'b', 'c']);
    expect(ids(select([sourceItem, a, b, c, other], sourceItem))).toEqual(['source', 'a', 'b', 'c']);
  });

  it('does not widen a known pack to unrelated workspace resources when no original matches', () => {
    const current = resource('translated', { unitId: 'unit-a', translationOf: 'missing-original' });
    const result = select([current, resource('other', { unitId: 'unit-b' })]);
    expect(result).toEqual({ items: [], kind: 'pack' });
    expect(select([resource('other')], resource('unsaved', { sourceFamilyId: 'missing-family' })))
      .toEqual({ items: [], kind: 'pack' });
  });

  it('uses actual full-pack resource ids, including variants and grouped runs', () => {
    const history = ['a', 'b', 'c', 'd', 'other'].map(id => resource(id));
    const result = select(history, history[0], { fullPackRun: {
      resources: { quiz: { resourceId: 'a', resourceIds: ['a', 'b'], generationVariants: [{ artifactId: 'c' }] } },
      groups: { group: { resources: { glossary: { resourceId: 'd' } } } }
    } });
    expect(ids(result)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.kind).toBe('pack');
  });

  it('does not let an old full-pack run claim an unrelated selected resource', () => {
    const history = [resource('new'), resource('old')];
    const result = select(history, history[0], { fullPackRun: { resources: { quiz: { resourceId: 'old' } } } });
    expect(ids(result)).toEqual(['new', 'old']);
    expect(result.kind).toBe('workspace');
  });

  it('uses a real active unit for an otherwise ungrouped current resource', () => {
    const history = [resource('ungrouped'), resource('in-unit', { unitId: 'active' }), resource('other', { unitId: 'other' })];
    const result = select(history, history[0], { activeUnitId: 'active' });
    expect(ids(result)).toEqual(['in-unit']);
    expect(result.kind).toBe('pack');
  });

  it.each(['all', 'uncategorized', 'none', ''])('labels the ungrouped fallback as workspace for unit %j', unitId => {
    const history = [resource('a', { unitId }), resource('b')];
    expect(select(history, history[0], { activeUnitId: unitId })).toEqual({ items: history, kind: 'workspace' });
  });
});

describe('translation batches exclude copies while preserving explicit single-resource actions', () => {
  it('excludes repeated translations and unsupported media from both pack and workspace batches', () => {
    const original = resource('original', { unitId: 'unit' });
    const history = [original,
      resource('copy', { unitId: 'unit', translationOf: 'original' }),
      resource('copy-again', { unitId: 'unit', sourceTranslationOf: 'copy' }),
      resource('provenance', { unitId: 'unit', translationProvenance: { sourceId: 'original' } }),
      resource('config-copy', { unitId: 'unit', config: { translationOf: 'original' } }),
      resource('legacy-copy', { unitId: 'unit', meta: { translatedTo: 'Spanish' } }),
      ...['image', 'gemini-bridge', 'audio', 'udl-advice'].map(type => resource(type, { type, unitId: 'unit' }))];
    expect(ids(select(history))).toEqual(['original']);
    expect(ids(select(history, original, {}, 'all'))).toEqual(['original']);
    expect(ids(select(history, history[1], {}, 'single'))).toEqual(['copy']);
  });

  it('keeps in-place analysis language views and does not infer copy status from a title alone', () => {
    const history = [resource('analysis', { type: 'analysis', meta: { translatedTo: 'Spanish' }, data: { reportTranslations: { Spanish: {} } } }),
      resource('named', { title: 'Spanish practice (Spanish)' })];
    expect(ids(select(history, history[1]))).toEqual(['analysis', 'named']);
  });

  it('excludes translated copies after device autosave retains their provenance only in config', () => {
    const original = resource('original', { unitId: 'unit-a', config: { language: 'English' } });
    const translated = resource('translated', { unitId: 'unit-a', translationOf: original.id,
      title: 'Water (German)', meta: 'Translated to German',
      config: { language: 'German', translationOf: original.id, translationSourceId: original.id } });
    const savedFields = item => ({ id: item.id, type: item.type, title: item.title,
      meta: item.meta, unitId: item.unitId, config: item.config, data: item.data });
    const reloaded = JSON.parse(JSON.stringify([original, translated].map(savedFields)));
    expect(reloaded[1]).not.toHaveProperty('translationOf');
    expect(ids(select(reloaded, reloaded[1]))).toEqual(['original']);
    expect(ids(select(reloaded, reloaded[1], {}, 'all'))).toEqual(['original']);
    expect(ids(select(reloaded, reloaded[1], {}, 'single'))).toEqual(['translated']);
  });

  it('makes an explicit all action span original resources across units', () => {
    const history = [resource('a', { unitId: 'a' }), resource('b', { unitId: 'b' })];
    expect(select(history, history[0], {}, 'all')).toEqual({ items: history, kind: 'workspace' });
  });

  it('uses the current saved revision and imported instance for a single action', () => {
    const first = resource('same', { _artifactInstanceId: 'first', title: 'First' });
    const second = resource('same', { _artifactInstanceId: 'second', title: 'Latest saved' });
    const stale = { ...second, title: 'Stale open view' };
    expect(select([first, second], stale, {}, 'single').items).toEqual([second]);
  });

  it('deduplicates repeated history entries without dropping distinct imported instances', () => {
    const first = resource('same', { _artifactInstanceId: 'first' });
    const second = resource('same', { _artifactInstanceId: 'second' });
    expect(select([first, first, second], first, {}, 'all').items).toEqual([first, second]);
  });

  it('reads fresh host state and respects a cleared current selection', () => {
    const stale = resource('stale', { unitId: 'old' });
    const fresh = resource('fresh', { unitId: 'new' });
    const state = { history: [fresh], generatedContent: fresh };
    const handlers = createHostHandlers({ history: [stale], generatedContent: stale, _resourceMutationStateRef: { current: state } });
    expect(ids(handlers.getTranslationBatchItems('single'))).toEqual(['fresh']);
    state.generatedContent = null;
    expect(handlers.getTranslationBatchItems('single')).toEqual({ items: [], kind: 'single' });
  });

  it('handles empty or malformed history without throwing', () => {
    expect(select(null, null)).toEqual({ items: [], kind: 'workspace' });
    expect(select([null, 'bad', resource('a')], null, {}, 'all').items).toEqual([resource('a')]);
    expect(select([resource('image', { type: 'image' })], undefined, {}, 'single').items).toEqual([]);
  });
});
