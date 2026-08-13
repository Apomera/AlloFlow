import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'behavior_lens_workspace_module.js'), 'utf8');

beforeAll(() => {
  window.AlloModules = {};
  // eslint-disable-next-line no-new-func
  new Function(source)();
});

function runtime() {
  return window.AlloModules.BehaviorLensWorkspace;
}

function entry(overrides = {}) {
  return {
    id: overrides.id || 'entry-1',
    timestamp: '2026-08-13T03:30:00.000Z',
    timezoneOffset: 240,
    antecedent: 'Independent work began',
    behavior: 'Hit peer',
    consequence: 'Adult redirected',
    intensity: 4,
    ...overrides
  };
}

describe('Behavior Lens canonical analytics and data-model runtime', () => {
  it('excludes missing and invalid ratings instead of silently substituting zero or three', () => {
    const summary = runtime().summarizeIntensity([
      entry({ intensity: 1 }),
      entry({ id: 'two', intensity: 5 }),
      entry({ id: 'missing', intensity: null }),
      entry({ id: 'invalid', intensity: 9 })
    ]);

    expect(summary).toMatchObject({
      mean: 3,
      ratedCount: 2,
      missingCount: 2,
      totalCount: 4
    });
  });

  it('groups by the local day captured at observation time rather than the UTC day', () => {
    expect(runtime().localDayKey('2026-08-13T03:30:00.000Z', 240)).toBe('2026-08-12');
    expect(runtime().localDayKey('2026-08-13T03:30:00.000Z', -120)).toBe('2026-08-13');

    const grouped = runtime().groupByLocalDay([
      entry({ id: 'late-local' }),
      entry({ id: 'next-day', timestamp: '2026-08-13T05:30:00.000Z', timezoneOffset: 240 })
    ]);
    expect(grouped.map((day) => [day.date, day.count])).toEqual([
      ['2026-08-12', 1],
      ['2026-08-13', 1]
    ]);
  });

  it('resolves aliases to one canonical behavior while retaining original narratives', () => {
    const catalog = runtime().normalizeTargetBehaviors([{
      id: 'physical-contact',
      label: 'Physical contact toward others',
      aliases: ['Hit peer', 'Hitting another student'],
      operationalDefinition: 'Open or closed hand makes contact with another person.'
    }]);
    const groups = runtime().groupByCanonicalBehavior([
      entry({ id: 'one', behavior: 'Hit peer' }),
      entry({ id: 'two', behavior: 'hitting another student' }),
      entry({ id: 'three', behavior: 'Different behavior' })
    ], catalog);

    expect(groups[0]).toMatchObject({ id: 'physical-contact', count: 2, defined: true });
    expect(groups[0].entries.map((item) => item.behavior)).toEqual(['Hit peer', 'hitting another student']);
    expect(groups[1]).toMatchObject({ count: 1, defined: false });
  });

  it('normalizes record types and reports incomplete or malformed source data', () => {
    const normalized = runtime().normalizeAbcEntries([
      entry(),
      { id: 'broken', timestamp: 'not-a-date', behavior: 'Brief event', intensity: 'high' },
      null
    ], { targetBehaviors: [] });

    expect(normalized.items).toHaveLength(2);
    expect(normalized.report.droppedCount).toBe(1);
    expect(normalized.report.issueCounts).toMatchObject({
      'invalid-timestamp': 1,
      'invalid-intensity': 1,
      'missing-intensity': 1,
      'missing-antecedent': 1,
      'missing-consequence': 1
    });
    expect(normalized.items[1]).toMatchObject({
      timestamp: null,
      occurredAt: null,
      intensity: null,
      source: 'unknown'
    });
  });

  it('reports incident rates only when a valid observation-time denominator exists', () => {
    const incidents = [entry(), entry({ id: 'two' })];
    expect(runtime().calculateIncidentRate(incidents, [])).toMatchObject({
      incidents: 2,
      perObservedHour: null,
      denominatorAvailable: false
    });
    expect(runtime().calculateIncidentRate(incidents, [
      { duration: 1800 },
      { duration: 1800 }
    ])).toMatchObject({
      incidents: 2,
      perObservedHour: 2,
      denominatorAvailable: true
    });
  });

  it('builds phase summaries without inventing intensity or exposure values', () => {
    const phases = runtime().summarizePhases([
      entry({ id: 'a', phase: 'baseline', intensity: 4 }),
      entry({ id: 'b', phase: 'baseline', intensity: null }),
      entry({ id: 'c', phase: 'intervention', intensity: 2 })
    ], [
      { phase: 'baseline', duration: 3600 },
      { phase: 'intervention', duration: 1800 }
    ]);

    expect(phases.find((phase) => phase.phase === 'baseline')).toMatchObject({
      count: 2,
      intensity: { mean: 4, ratedCount: 1, missingCount: 1 },
      rate: { perObservedHour: 2 }
    });
    expect(phases.find((phase) => phase.phase === 'intervention').rate.perObservedHour).toBe(2);
  });

  it('uses a date-stratified AI sample and marks saved analysis stale after source edits', () => {
    const entries = Array.from({ length: 100 }, (_, index) => entry({
      id: `entry-${index}`,
      timestamp: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
    }));
    const sample = runtime().selectStratifiedEntries(entries, 20);
    const provenance = runtime().createAnalysisProvenance(entries, sample, '2026-08-13T12:00:00.000Z');
    const analysis = { summary: 'Example', provenance };

    expect(sample).toMatchObject({
      strategy: 'stratified-across-date-range',
      totalCount: 100,
      sampleCount: 20
    });
    expect(sample.entries[0].id).toBe('entry-0');
    expect(sample.entries.at(-1).id).toBe('entry-99');
    expect(runtime().isAnalysisStale(analysis, entries)).toBe(false);
    expect(runtime().isAnalysisStale(analysis, [...entries, entry({ id: 'new-entry' })])).toBe(true);
  });

  it('soft-deletes and restores records without losing their canonical fields', () => {
    const entries = [entry({ id: 'keep' }), entry({ id: 'remove', behaviorId: 'physical-contact' })];
    const deleted = runtime().softDeleteAbcEntries(entries, [], ['remove'], {
      deletedAt: '2026-08-13T12:00:00.000Z',
      deletedBy: 'teacher'
    });
    expect(deleted.entries.map((item) => item.id)).toEqual(['keep']);
    expect(deleted.deletedEntries[0]).toMatchObject({
      entry: { id: 'remove', behaviorId: 'physical-contact' },
      deletedBy: 'teacher'
    });

    const restored = runtime().restoreDeletedAbcEntry(deleted.entries, deleted.deletedEntries, 'remove');
    expect(restored.restored.id).toBe('remove');
    expect(restored.entries.map((item) => item.id)).toEqual(['remove', 'keep']);
    expect(restored.deletedEntries).toEqual([]);
  });

  it('normalizes a complete version-4 workspace and keeps executable/prototype values out of tool state', () => {
    const unsafe = Object.create(null);
    unsafe.valid = { count: 2 };
    unsafe.callback = () => 'not serializable';
    unsafe.__proto__ = { polluted: true };
    const workspace = runtime().normalizeWorkspace({
      version: 3,
      abcEntries: [entry()],
      targetBehaviors: [{ id: 'physical-contact', label: 'Physical contact toward others', aliases: ['Hit peer'] }],
      toolState: unsafe,
      auditLog: [{ timestamp: '2026-08-13T12:00:00.000Z', action: 'record-created' }],
      workflowDiagnostics: [{ timestamp: '2026-08-13T12:00:00.000Z', action: 'panel-open', toolId: 'abc' }]
    });

    expect(workspace.version).toBe(4);
    expect(workspace.abcEntries[0].behaviorId).toBe('physical-contact');
    expect(workspace.toolState).toEqual({ valid: { count: 2 }, callback: null });
    expect(workspace.toolState.polluted).toBeUndefined();
    expect(workspace.auditLog).toHaveLength(1);
    expect(workspace.workflowDiagnostics).toHaveLength(1);
  });

  it('keeps the deployment runtime byte-identical', () => {
    expect(source).toBe(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/behavior_lens_workspace_module.js'), 'utf8'));
  });
});
