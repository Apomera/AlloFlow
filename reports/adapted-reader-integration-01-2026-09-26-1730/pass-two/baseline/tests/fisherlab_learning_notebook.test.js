import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const KEY = 'fisherLab.learningNotes.v1';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab learning notebook', () => {
  it('normalizes old, malformed, and oversized notes into only three bounded topics', () => {
    const normalize = window.__FisherLabCore.normalizeCoreLearningNotes;
    expect(normalize(null).navigation).toEqual({ claim: '', evidence: '', next: '' });
    const notes = normalize({ navigation: { claim: 'x'.repeat(900), evidence: 5, next: 'Check current', score: 100 }, unknown: { claim: 'no' }, sampling: null });
    expect(Object.keys(notes)).toEqual(['navigation', 'sampling', 'measurement']);
    expect(notes.navigation.claim).toHaveLength(600);
    expect(notes.navigation).toMatchObject({ evidence: '', next: 'Check current' });
    expect(notes.navigation).not.toHaveProperty('score');
  });
  it('merges only the saved topic into the latest notebook without touching voyage state', () => {
    const data = new Map([[KEY, JSON.stringify({ sampling: { claim: 'Another saved topic' } })], ['fisherLab.state.v1', '{"coreTrips":7}']]);
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const draft = { claim: 'Slower means longer', evidence: '2 nm / 2 kn = 1 hour', next: 'Check current' };
    expect(window.__FisherLabCore.writeCoreLearningNote(storage, 'navigation', draft)).toEqual({ ok: true });
    const saved = JSON.parse(data.get(KEY));
    expect(saved.navigation).toEqual(draft);
    expect(saved.sampling.claim).toBe('Another saved topic');
    expect(data.get('fisherLab.state.v1')).toBe('{"coreTrips":7}');
    draft.claim = 'Changed after save';
    expect(JSON.parse(data.get(KEY)).navigation.claim).toBe('Slower means longer');
  });
  it('reports failures without replacing unreadable notes or accepting unknown topics', () => {
    let writes = 0;
    const unreadable = { getItem: () => '{broken', setItem: () => { writes++; } };
    const write = window.__FisherLabCore.writeCoreLearningNote;
    expect(write(unreadable, 'navigation', {})).toEqual({ ok: false });
    expect(writes).toBe(0);
    expect(write(null, 'navigation', {})).toEqual({ ok: false });
    expect(write({ getItem: () => '{}', setItem: () => { throw new Error('quota'); } }, 'sampling', {})).toEqual({ ok: false });
    expect(write(unreadable, '__proto__', {})).toEqual({ ok: false });
  });
  it('exports the current reflection as plain text with its evidence provenance', () => {
    const build = window.__FisherLabCore.buildCoreLearningNoteText;
    const text = build('measurement', { claim: '<script>literal student text</script>', evidence: 'Model mean = 12.5', next: 'Align zero' });
    expect(text).toContain('Student reflection; not a voyage or catch record.');
    expect(text).toContain('MY CLAIM\n<script>literal student text</script>');
    expect(text).toContain('Model mean = 12.5');
    expect(text).toContain('WHAT I WOULD CHECK NEXT\nAlign zero');
    expect(build('__proto__', {})).toBe('');
    expect(build('sampling', {})).toContain('(Not recorded)');
  });
});
