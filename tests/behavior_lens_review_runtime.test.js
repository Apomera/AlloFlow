import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
let runtime;
const record = { id: 'entry-a', timestamp: '2026-09-13T02:00:00.000Z', antecedent: 'Independent work', behavior: 'Calls out', consequence: 'Teacher responds', intensity: null, timezoneOffset: 240 };
beforeAll(() => { new Function(readFileSync('behavior_lens_workspace_module.js', 'utf8'))(); runtime = window.AlloModules.BehaviorLensWorkspace; });
describe('Behavior Lens lossless records and consistent analytics', () => {
  it('retains all primary records over former ceilings through save and reopen', () => {
    const workspace = {
      abcEntries: Array.from({ length: 5001 }, (_, i) => ({ ...record, id: 'entry-' + i })),
      observationSessions: Array.from({ length: 1001 }, (_, i) => ({ id: 'observation-' + i, timestamp: record.timestamp, duration: 60 })),
      sessionHistory: Array.from({ length: 1001 }, (_, i) => ({ id: 'session-' + i, count: 0 })),
      sessionNotes: Array.from({ length: 501 }, (_, i) => ({ id: 'note-' + i })),
      teamNotes: Array.from({ length: 501 }, (_, i) => ({ id: 'team-' + i }))
    };
    const reloaded = runtime.normalizeWorkspace(JSON.parse(JSON.stringify(runtime.normalizeWorkspace(workspace))));
    for (const field of Object.keys(workspace)) expect(reloaded[field]).toHaveLength(workspace[field].length);
    expect(reloaded.abcEntries.at(-1).id).toBe('entry-5000');
    expect(reloaded.normalizationReport.abcEntries).toMatchObject({ inputCount: 5001, outputCount: 5001, droppedCount: 0 });
    const validation = runtime.validateWorkspaceImport(workspace);
    expect(validation.ok).toBe(true);
    expect(validation.warnings.join(' ')).toContain('All records will be retained');
    expect(runtime.validateWorkspaceImport(workspace, { sourceBytes: runtime.MAX_WORKSPACE_IMPORT_BYTES + 1 }).ok).toBe(false);
  });
  it('preserves unknown offsets and local dates through repeated normalization', () => {
    for (const value of [null, undefined, '', false]) expect(runtime.normalizeTimezoneOffset(value)).toBeNull();
    const unknown = runtime.normalizeAbcEntry({ ...record, timezoneOffset: null }).entry;
    expect(runtime.normalizeAbcEntry(unknown).entry.timezoneOffset).toBeNull();
    expect(runtime.normalizeAbcEntry(record).entry.localDate).toBe('2026-09-12');
    expect(runtime.normalizeTimezoneOffset(0)).toBe(0);
  });
  it('matches phase exposure and retains observed zero-event phases', () => {
    const phases = runtime.summarizePhases([{ ...record, phase: null }], [{ duration: 3600, phase: 'Baseline' }, { duration: 1800, phase: 'Intervention' }]);
    expect(phases.find(p => p.phase === 'Unassigned').rate).toMatchObject({ denominatorAvailable: false, perObservedHour: null });
    expect(phases.find(p => p.phase === 'Intervention').rate).toMatchObject({ denominatorAvailable: true, incidents: 0, perObservedHour: 0 });
    const scoped = runtime.summarizePhases([{ ...record, phase: 'Baseline', behaviorId: 'a' }], [{ duration: 600, phase: 'Baseline', behaviorId: 'a' }, { duration: 3600, phase: 'Baseline', behaviorId: 'b' }], { behaviorId: 'a' });
    expect(scoped[0].rate.exposure.seconds).toBe(600);
    expect(scoped[0].rate.perObservedHour).toBe(6);
  });
  it('counts distinct incomplete records and preserves unrated intensity', () => {
    const result = runtime.inspectAbcData([{ ...record, antecedent: '' }, { ...record, id: 'entry-b', consequence: '' }], [], []);
    expect(result.incompleteAbcCount).toBe(2);
    expect(result.missingIntensityCount).toBe(2);
    expect(runtime.summarizeIntensity([record]).mean).toBeNull();
  });
  it('invalidates AI after narrative, context, and target-definition edits', () => {
    const targets = [{ id: 'target-a', label: 'Calls out', definition: 'Audible speech during independent work' }];
    const entries = [runtime.normalizeAbcEntry({ ...record, behaviorId: 'target-a' }, { targetBehaviors: targets }).entry];
    const analysis = { provenance: runtime.createAnalysisProvenance(entries, undefined, undefined, targets) };
    expect(runtime.isAnalysisStale(analysis, entries, targets)).toBe(false);
    for (const [field, value] of Object.entries({ antecedent: 'Group work', behavior: 'Quiet response', consequence: 'Peer response', setting: 'Hallway', notes: 'Earlier task was harder', duration: 30 })) expect(runtime.isAnalysisStale(analysis, [{ ...entries[0], [field]: value }], targets), field).toBe(true);
    expect(runtime.isAnalysisStale(analysis, entries, [{ ...targets[0], label: 'Vocal response' }])).toBe(true);
  });
  it('parses quoted CSV records, multiline notes, BOM, and escaped quotes', () => {
    expect(runtime.parseCsvRows('\ufeffdate,notes\r\n2026-09-12,"Line one, with a comma\nHe said ""break"""\r\n')).toEqual([['date', 'notes'], ['2026-09-12', 'Line one, with a comma\nHe said "break"']]);
    expect(() => runtime.parseCsvRows('date,notes\n2026-09-12,"unclosed')).toThrow('not closed');
    expect(() => runtime.parseCsvRows('"closed"unexpected,x')).toThrow('Unexpected text');
  });
});
