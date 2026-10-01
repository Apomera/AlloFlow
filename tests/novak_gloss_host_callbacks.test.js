import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
let api;
beforeAll(() => { loadAlloModule('instructional_context_module.js'); api = window.AlloModules.InstructionalContext; });
function fixture() {
  const text = 'Upon the heath. Anon!\r\n\r\nThe heath is quiet.';
  const snapshot = api.createSourceSnapshot(text, { sourceArtifactId: 'source-a' });
  const item = api.createSupportedReading(snapshot, { id: 'original-a', unitId: 'lesson-a', sourceFamilyId: 'source-a' });
  const start = text.indexOf('heath');
  item.readingSupports = api.validateReadingSupports(item, [{ id: 'heath', kind: 'gloss', start, end: start + 5, quote: 'heath', text: 'open land', priority: 'essential' }]);
  return { item, text, start };
}
function harness(item, generate = vi.fn(), history = [item]) {
  const stateRef = { current: { history, generatedContent: item, isTeacherMode: true } };
  const source = readFileSync(resolve(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt'), 'utf8');
  const from = source.indexOf('  const handleUpdateReadingSupports =');
  const to = source.indexOf('  const getFilteredHistory =', from);
  // The handlers name the copy they change (imported packs can repeat a public
  // id), using ANTI's own getArtifactInstanceId, sliced here rather than copied.
  const helperFrom = source.indexOf('const ALLO_ARTIFACT_INSTANCE_ID_FIELD =');
  const helperTo = source.indexOf('const _alloSafeArtifactPublicIdValue =', helperFrom);
  if (from < 0 || to < 0 || helperFrom < 0 || helperTo < 0) throw new Error('ANTI anchors moved');
  const instanceHelpers = source.slice(helperFrom, helperTo);
  const instanceOf = new Function(instanceHelpers + '\nreturn getArtifactInstanceId;')();
  // Like the host's onUpdateResource: given an instance id, only that copy changes.
  const onUpdateResource = vi.fn((id, updater, options = {}) => {
    const instanceId = options && typeof options.instanceId === 'string' ? options.instanceId : '';
    const current = stateRef.current.history.find(row => row.id === id && (!instanceId || instanceOf(row) === instanceId));
    if (!current) return false;
    const updated = updater(current);
    if (!updated || updated === current) return false;
    stateRef.current.history = stateRef.current.history.map(row => row === current ? updated : row);
    if (stateRef.current.generatedContent === current) stateRef.current.generatedContent = updated;
    return true;
  });
  window.AlloModules.GenDispatcher = { generateReadingSupports: generate };
  const callbacks = new Function('window', '_resourceMutationStateRef', 'onUpdateResource', 'callGemini', 'cleanJson', 'gradeLevel', 'leveledTextLanguage', instanceHelpers + source.slice(from, to) + '\nreturn { edit: handleUpdateReadingSupports, generate: handleGenerateReadingSupports };')(window, stateRef, onUpdateResource, vi.fn(), value => value, '5', 'English');
  return { ...callbacks, stateRef, onUpdateResource, current: () => stateRef.current.history[0] };
}
describe('curated reading support host updates', () => {
  it('saves a teacher explanation to history and current view without changing the original', () => {
    const { item, text, start } = fixture(); const h = harness(item);
    const saved = h.edit(item, { type: 'upsert', annotation: { id: 'heath', start, end: start + 5, quote: 'heath', text: 'open land with grasses and small bushes', priority: 'essential', pinned: true } });
    expect(saved.annotations[0]).toMatchObject({ origin: 'educator', pinned: true, priority: 'essential' });
    expect(h.current().readingSupports).toEqual(saved);
    expect(h.stateRef.current.generatedContent.readingSupports).toEqual(saved);
    expect(h.current().data).toBe(text); expect(h.current().sourceSnapshot.text).toBe(text);
  });
  it('keeps teacher edits made while generation is in flight', async () => {
    const { item, start, text } = fixture(); let finish; const h = harness(item, () => new Promise(resolve => { finish = resolve; }));
    const pending = h.generate(item);
    h.edit(item, { type: 'upsert', annotation: { id: 'heath', start, end: start + 5, quote: 'heath', text: 'Teacher wording', pinned: true } });
    const anon = text.indexOf('Anon');
    finish(api.validateReadingSupports(item, [{ id: 'heath-new', start, end: start + 5, quote: 'heath', text: 'AI wording' }, { id: 'anon', start: anon, end: anon + 4, quote: 'Anon', text: 'at once, in this reply' }]));
    await pending;
    expect(h.current().readingSupports.annotations.find(row => row.quote === 'heath').text).toBe('Teacher wording');
    expect(h.current().readingSupports.annotations.find(row => row.quote === 'Anon')).toBeTruthy();
    expect(h.current().data).toBe(text);
  });
  it('does not resurrect a support removed during generation', async () => {
    const { item } = fixture(); let finish; const h = harness(item, () => new Promise(resolve => { finish = resolve; }));
    const pending = h.generate(item); h.edit(item, { type: 'remove', id: 'heath' }); finish(item.readingSupports); await pending;
    expect(h.current().readingSupports.annotations).toHaveLength(0);
    expect(h.current().readingSupports.suppressedAnnotations).toHaveLength(1);
  });
  it('rejects invalid overlapping edits without dropping existing supports', () => {
    const { item, text } = fixture(); const h = harness(item);
    expect(() => h.edit(item, { type: 'upsert', annotation: { id: 'overlap', start: 0, end: 14, quote: text.slice(0, 14), text: 'too broad' } })).toThrow();
    expect(h.current()).toBe(item);
  });
  it('rejects an edit from another source family even with identical text and ID', () => {
    const { item } = fixture(); const h = harness({ ...item, sourceFamilyId: 'other-family' });
    expect(() => h.edit(item, { type: 'remove', id: 'heath' })).toThrow(/changed/);
    expect(h.current().readingSupports.annotations).toHaveLength(1);
  });
  it('rejects teacher mutations and late generation completion after changing to student mode', async () => {
    const { item } = fixture(); let finish; const h = harness(item, () => new Promise(resolve => { finish = resolve; }));
    const pending = h.generate(item); h.stateRef.current.isTeacherMode = false;
    expect(() => h.edit(item, { type: 'remove', id: 'heath' })).toThrow(/teacher mode/);
    finish(item.readingSupports); await expect(pending).rejects.toThrow(/editing mode changed/);
    expect(h.current()).toBe(item);
  });
  it('rejects a stale source snapshot and leaves the current saved reading intact', () => {
    const { item } = fixture(); const replacement = api.createSupportedReading(api.createSourceSnapshot('A different original.', { sourceArtifactId: 'source-a' }), { id: item.id, sourceFamilyId: 'source-a', unitId: 'lesson-a' });
    const h = harness(replacement); expect(() => h.edit(item, { type: 'remove', id: 'heath' })).toThrow(/changed/); expect(h.current()).toBe(replacement);
  });
  it('changes only the copy being edited when an imported pack repeats the same id', () => {
    const { item, start } = fixture();
    const mine = { ...item, _artifactInstanceId: 'artifact-mine-0001' }, imported = { ...item, _artifactInstanceId: 'artifact-imported-01' };
    const h = harness(mine, vi.fn(), [imported, mine]);
    h.edit(mine, { type: 'upsert', annotation: { id: 'heath', start, end: start + 5, quote: 'heath', text: 'my explanation', priority: 'essential' } });
    expect(h.onUpdateResource.mock.calls[0][2]).toEqual({ instanceId: 'artifact-mine-0001' });
    const [importedAfter, mineAfter] = h.stateRef.current.history;
    expect(mineAfter.readingSupports.annotations[0].text).toBe('my explanation');
    expect(importedAfter).toBe(imported);
  });
});
