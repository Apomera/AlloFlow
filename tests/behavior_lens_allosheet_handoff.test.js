import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));

let handoff;

beforeAll(() => {
  setupBehaviorLens();
  handoff = window.AlloModules.BehaviorLensHandoff;
});

const createdAt = '2026-07-29T16:00:00.000Z';

function sampleWorkspace() {
  return {
    studentName: 'Real Student Name',
    abcEntries: [{
      id: 'private-record-id',
      student: 'Real Student Name',
      timestamp: '2026-07-28T12:00:00.000Z',
      antecedent: 'Transition',
      behavior: 'Left assigned area',
      consequence: 'Given a break',
      setting: 'Classroom',
      intensity: 3,
      duration: 45,
      phase: 'Baseline',
      notes: 'private ABC narrative'
    }],
    observationSessions: [{
      id: 'private-observation-id',
      timestamp: '2026-07-28T13:00:00.000Z',
      method: 'frequency',
      duration: 600,
      notes: 'private observation narrative',
      data: { count: 4, rate: 0.4 }
    }],
    sessionHistory: [{
      id: 'private-session-id',
      date: '2026-07-28',
      behavior: 'Left assigned area',
      count: 4,
      rate: 0.4,
      phase: 'Baseline',
      duration: '10m',
      source: 'observation-frequency',
      notes: 'private session narrative'
    }],
    aiAnalysis: {
      summary: 'must never be transferred by this sender'
    }
  };
}

describe('BehaviorLens -> AlloSheet envelope', () => {
  it('registers a pure, versioned builder with the shared bounded contract', () => {
    expect(handoff).toBeTruthy();
    expect(handoff.kind).toBe('alloflow.tabular.v1');
    expect(handoff.limits).toMatchObject({
      maxTables: 5,
      maxColumnsPerTable: 40,
      maxRowsPerTable: 200,
      maxCellCharacters: 1200,
      maxEnvelopeBytes: 2000000
    });
    expect(typeof handoff.buildEnvelope).toBe('function');
  });

  it('defaults to summary tables without identifiers, notes, AI, or write-back', () => {
    const input = sampleWorkspace();
    const before = JSON.stringify(input);
    const envelope = handoff.buildEnvelope(input, { createdAt, dateRange: 'all' });
    const serialized = JSON.stringify(envelope);

    expect(envelope).toMatchObject({
      kind: 'alloflow.tabular.v1',
      version: 1,
      source: { tool: 'behaviorlens', label: 'BehaviorLens' },
      title: 'BehaviorLens data review',
      classification: {
        level: 'sensitive-education-record',
        identifierIncluded: false,
        freeTextNotesIncluded: false
      },
      privacy: {
        identifierIncluded: false,
        notesIncluded: false,
        reducedData: true,
        transferEnablesAI: false
      },
      provenance: {
        transferMode: 'summary',
        dateRange: 'all'
      },
      capabilities: {
        writeBack: false,
        aiEnabled: false
      }
    });
    expect(envelope.tables.map((table) => table.id)).toEqual([
      'abc-data',
      'observation-sessions',
      'session-history'
    ]);
    expect(envelope.tables.every((table) =>
      table.rows.every((row) => typeof row.id === 'string' && row.values && !Array.isArray(row.values))
    )).toBe(true);
    expect(serialized).not.toContain('Real Student Name');
    expect(serialized).not.toContain('private ABC narrative');
    expect(serialized).not.toContain('private observation narrative');
    expect(serialized).not.toContain('private session narrative');
    expect(serialized).not.toContain('must never be transferred');
    expect(envelope.privacy).not.toHaveProperty('deidentified');
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps identifier and free-text notes opt-in even for Detailed mode', () => {
    const input = sampleWorkspace();
    const reduced = handoff.buildEnvelope(input, {
      createdAt,
      dateRange: 'all',
      mode: 'detailed'
    });
    const reducedColumns = reduced.tables.flatMap((table) => table.columns.map((column) => column.key));
    expect(reducedColumns).not.toContain('student_identifier');
    expect(reducedColumns).not.toContain('notes');
    expect(JSON.stringify(reduced)).not.toContain('Real Student Name');
    expect(JSON.stringify(reduced)).not.toContain('private ABC narrative');

    const explicit = handoff.buildEnvelope(input, {
      createdAt,
      dateRange: 'all',
      mode: 'detailed',
      includeStudentIdentifier: true,
      includeNotes: true
    });
    const explicitColumns = explicit.tables.flatMap((table) => table.columns.map((column) => column.key));
    expect(explicitColumns).toContain('student_identifier');
    expect(explicitColumns).toContain('notes');
    expect(explicit.classification.identifierIncluded).toBe(true);
    expect(explicit.classification.freeTextNotesIncluded).toBe(true);
    expect(JSON.stringify(explicit)).toContain('Real Student Name');
    expect(JSON.stringify(explicit)).toContain('private ABC narrative');
  });

  it('applies date and dataset choices without mutating the source', () => {
    const input = sampleWorkspace();
    input.abcEntries.push({
      timestamp: '2025-01-01T00:00:00.000Z',
      behavior: 'Old entry',
      notes: 'old private note'
    });
    const before = JSON.stringify(input);
    const envelope = handoff.buildEnvelope(input, {
      createdAt,
      dateRange: '7d',
      mode: 'detailed',
      datasets: { abc: true, observations: false, sessionHistory: false }
    });

    expect(envelope.tables).toHaveLength(1);
    expect(envelope.tables[0].id).toBe('abc-data');
    expect(envelope.tables[0].sourceRowCount).toBe(1);
    expect(envelope.provenance.datasets).toEqual(['abc']);
    expect(envelope.provenance.sourceCounts.abc).toBe(1);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('enforces row, column, cell, and payload limits with visible truncation metadata', () => {
    const longNote = 'n'.repeat(2400);
    const input = {
      studentName: 'Student Codename',
      abcEntries: Array.from({ length: 240 }, (_, index) => ({
        timestamp: new Date(Date.parse(createdAt) - index * 60000).toISOString(),
        antecedent: 'A'.repeat(1600),
        behavior: 'Behavior ' + index,
        consequence: 'C'.repeat(1600),
        setting: 'Classroom',
        intensity: 3,
        notes: longNote
      })),
      observationSessions: [],
      sessionHistory: []
    };
    const envelope = handoff.buildEnvelope(input, {
      createdAt,
      dateRange: 'all',
      mode: 'detailed',
      includeNotes: true,
      datasets: { abc: true, observations: false, sessionHistory: false }
    });
    const table = envelope.tables[0];

    expect(table.sourceRowCount).toBe(240);
    expect(table.rowCount).toBeLessThanOrEqual(200);
    expect(table.truncated).toBe(true);
    expect(table.columns.length).toBeLessThanOrEqual(40);
    for (const row of table.rows) {
      for (const value of Object.values(row.values)) {
        if (typeof value === 'string') expect(value.length).toBeLessThanOrEqual(1200);
      }
    }
    expect(Buffer.byteLength(JSON.stringify(envelope), 'utf8')).toBeLessThan(2000000);
  });

  it('normalizes native Session Data Tracker targets and legacy latency with explicit units', () => {
    const envelope = handoff.buildEnvelope({
      studentName: 'Eagle',
      abcEntries: [],
      observationSessions: [],
      sessionHistory: [{
        id: 'native-tracker-session',
        date: '2026-07-28T12:00:00.000Z',
        durationSec: 120,
        targets: [
          { name: 'Calls out', type: 'frequency', count: 4, rate: 2, durations: [], intervals: [] },
          { name: 'Leaves seat', type: 'duration', count: 2, rate: 1, durations: [5, 7], intervals: [] },
          { name: 'On task', type: 'interval', count: 2, rate: 1, durations: [], intervals: [true, false, true] },
          { name: 'Correct response', type: 'percentage', count: 3, total: 4, rate: 1.5, durations: [], intervals: [] }
        ]
      }, {
        date: '2026-07-28',
        behavior: 'Begins assigned work',
        count: 3,
        rate: 1.25,
        phase: 'Latency',
        duration: '3 trials',
        source: 'latency-recorder'
      }]
    }, {
      createdAt,
      dateRange: 'all',
      mode: 'detailed',
      datasets: { abc: false, observations: false, sessionHistory: true }
    });
    const table = envelope.tables[0];
    const byBehavior = Object.fromEntries(table.rows.map((row) => [row.values.behavior, row.values]));

    expect(table.id).toBe('session-history');
    expect(table.sourceRowCount).toBe(5);
    expect(table.rowCount).toBe(5);
    expect(table.columns.map((column) => column.key)).toEqual(expect.arrayContaining([
      'measurement_type',
      'measurement_value',
      'measurement_unit',
      'rate_per_minute',
      'total_duration_seconds',
      'percentage'
    ]));
    expect(byBehavior['Calls out']).toMatchObject({
      measurement_type: 'frequency',
      measurement_value: 2,
      measurement_unit: 'per_minute',
      count: 4,
      rate_per_minute: 2,
      session_duration_seconds: 120,
      source: 'session-data-tracker'
    });
    expect(byBehavior['Leaves seat']).toMatchObject({
      measurement_type: 'duration',
      measurement_value: 12,
      measurement_unit: 'seconds',
      total_duration_seconds: 12
    });
    expect(byBehavior['On task']).toMatchObject({
      measurement_type: 'interval',
      measurement_value: 66.67,
      measurement_unit: 'percent',
      percentage: 66.67
    });
    expect(byBehavior['Correct response']).toMatchObject({
      measurement_type: 'percentage',
      measurement_value: 75,
      measurement_unit: 'percent',
      percentage: 75
    });
    expect(byBehavior['Begins assigned work']).toMatchObject({
      measurement_type: 'latency',
      measurement_value: 1.25,
      measurement_unit: 'seconds',
      rate_per_minute: null
    });

    const summary = handoff.buildEnvelope({
      abcEntries: [],
      observationSessions: [],
      sessionHistory: [{
        date: '2026-07-28',
        behavior: 'Begins assigned work',
        count: 3,
        rate: 1.25,
        phase: 'Latency',
        source: 'latency-recorder'
      }]
    }, {
      createdAt,
      dateRange: 'all',
      datasets: { abc: false, observations: false, sessionHistory: true }
    });
    expect(summary.tables[0].columns.map((column) => column.key)).not.toContain('average_rate');
    expect(summary.tables[0].rows[0].values).toMatchObject({
      measurement_type: 'latency',
      measurement_unit: 'seconds',
      average_measurement: 1.25
    });
  });

  it('exports frequency, interval, duration, and latency observations without losing method semantics', () => {
    const envelope = handoff.buildEnvelope({
      abcEntries: [],
      sessionHistory: [],
      observationSessions: [{
        timestamp: '2026-07-28T12:00:00.000Z',
        method: 'frequency',
        duration: 180,
        data: {
          count: 6,
          rate: 2,
          counters: [
            { label: 'Calls out', count: 4, rate: 1.33 },
            { label: 'Leaves seat', count: 2, rate: 0.67 }
          ]
        }
      }, {
        timestamp: '2026-07-28T13:00:00.000Z',
        method: 'interval',
        duration: 75,
        data: { totalIntervals: 20, completedCount: 5, occurredCount: 2, percentage: 40 }
      }, {
        timestamp: '2026-07-28T14:00:00.000Z',
        method: 'duration',
        duration: 120,
        data: { durations: [4, 10], totalDuration: 14 }
      }, {
        timestamp: '2026-07-28T15:00:00.000Z',
        method: 'latency',
        duration: 30,
        data: { latencyMs: 1250 }
      }]
    }, {
      createdAt,
      dateRange: 'all',
      mode: 'detailed',
      datasets: { abc: false, observations: true, sessionHistory: false }
    });
    const table = envelope.tables[0];
    const byMethod = Object.fromEntries(table.rows.map((row) => [row.values.method, row.values]));
    const columnKeys = table.columns.map((column) => column.key);

    expect(columnKeys).toContain('completed_intervals');
    expect(columnKeys).toContain('planned_intervals');
    expect(columnKeys).toContain('latency_seconds');
    expect(columnKeys).not.toContain('total_intervals');
    expect(byMethod.frequency).toMatchObject({
      event_count: 6,
      rate_per_minute: 2,
      behavior_labels: 'Calls out; Leaves seat'
    });
    expect(byMethod.interval).toMatchObject({
      occurred_intervals: 2,
      completed_intervals: 5,
      planned_intervals: 20,
      percentage: 40
    });
    expect(byMethod.duration.total_behavior_duration_seconds).toBe(14);
    expect(byMethod.latency.latency_seconds).toBe(1.25);
  });
});

describe('BehaviorLens -> AlloSheet review UI contract', () => {
  const behaviorSource = readFileSync('behavior_lens_module.js', 'utf8');
  const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');

  it('uses an injected callback and never stores a sensitive global snapshot', () => {
    expect(behaviorSource).toContain('onOpenAlloSheet(envelope)');
    expect(behaviorSource).toContain('onOpenAlloSheetReview: openAlloSheetHandoffReview');
    expect(behaviorSource).not.toMatch(/window\.[A-Za-z0-9_]*AlloSheet[A-Za-z0-9_]*\s*=\s*envelope/);
  });

  it('provides a named modal with focus entry, Escape, Tab containment, and focus restoration', () => {
    expect(behaviorSource).toContain("'aria-labelledby': 'bl-allosheet-review-title'");
    expect(behaviorSource).toContain("'aria-describedby': 'bl-allosheet-review-description'");
    expect(behaviorSource).toContain("'data-bl-allosheet-initial': 'true'");
    expect(behaviorSource).toContain("document.addEventListener('keydown', handleAlloSheetDialogKeyDown, true)");
    expect(behaviorSource).toContain("if (event.key === 'Escape')");
    expect(behaviorSource).toContain('last.focus();');
    expect(behaviorSource).toContain('first.focus();');
    expect(behaviorSource).toContain('opener && opener.isConnected');
    expect(behaviorSource).toContain('alloSheetHandoffBusyRef.current');
    expect(behaviorSource).toContain('if (dialog && typeof dialog.focus');
    expect(behaviorSource).toContain('}, [showAlloSheetHandoff]);');
    expect(behaviorSource).not.toContain('[showAlloSheetHandoff, alloSheetHandoffBusy]');
  });

  it('makes summary, date, datasets, privacy choices, truncation, and no-AI status explicit', () => {
    expect(behaviorSource).toContain('Summary (recommended)');
    expect(behaviorSource).toContain('bl-allosheet-date-range');
    expect(behaviorSource).toContain('Include active student identifier');
    expect(behaviorSource).toContain('Include free-text notes');
    expect(behaviorSource).toContain('table.truncated');
    expect(behaviorSource).toContain('Opening these tables does not enable AI');
    expect(behaviorSource).toContain('This is a one-way copy.');
    expect(behaviorSource).toContain('No explicit student identifier column will be included.');
    expect(behaviorSource).toContain('table.columns.map((column)');
    expect(behaviorSource).toContain("'aria-label': `${table.title} fields`");
  });

  it('threads a guarded host callback into the existing bridge without a duplicate loader', () => {
    expect(hostSource).toContain('onOpenAlloSheet: (artifact) =>');
    expect(hostSource).toContain('const bridge = window.AlloSheetHostBridge;');
    expect(hostSource).toContain('bridge.open({ theme, artifact })');
    expect(hostSource).toContain("addToast('AlloSheet is still loading. Try again in a moment.', 'error')");
  });

  it('renders every preview field and keeps focus inside during a pending popup callback', async () => {
    const priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    let resolveOpen;
    let openCalls = 0;
    const pendingOpen = new Promise((resolvePromise) => { resolveOpen = resolvePromise; });

    try {
      localStorage.clear();
      localStorage.setItem('bl_onboarded', '1');
      localStorage.setItem('behaviorLens_abc_Eagle', JSON.stringify([{
        timestamp: '2026-07-28T12:00:00.000Z',
        antecedent: 'Transition',
        behavior: 'Leaves seat',
        consequence: 'Break',
        intensity: 2,
        duration: 15,
        phase: 'Baseline'
      }]));

      await React.act(async () => {
        root.render(React.createElement(
          window.AlloModules.BehaviorLens,
          baseProps({
            studentNickname: 'Eagle',
            isTeacherMode: true,
            onOpenAlloSheet: () => {
              openCalls += 1;
              return pendingOpen;
            }
          })
        ));
        await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 20));
      });

      const exportCard = host.querySelector('[aria-labelledby="bl-tool-export-title"]');
      const exportButton = exportCard && Array.from(exportCard.querySelectorAll('button')).find((button) =>
        !button.hasAttribute('aria-pressed') && !button.disabled
      );
      expect(exportButton).toBeTruthy();
      await React.act(async () => {
        exportButton.click();
        await Promise.resolve();
      });

      const reviewOpener = Array.from(host.querySelectorAll('button')).find((button) =>
        button.textContent.includes('Open in AlloSheet')
      );
      expect(reviewOpener).toBeTruthy();
      await React.act(async () => {
        reviewOpener.click();
        await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 10));
      });
      await React.act(async () => {
        await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 10));
      });

      const dialog = host.querySelector('[role="dialog"][aria-labelledby="bl-allosheet-review-title"]');
      expect(dialog).toBeTruthy();
      const fieldList = dialog.querySelector('[aria-label="ABC daily summary fields"]');
      expect(fieldList).toBeTruthy();
      expect(Array.from(fieldList.querySelectorAll('li')).map((item) => item.textContent)).toEqual([
        'Date',
        'Phase',
        'ABC entries',
        'Average intensity',
        'Total duration (seconds)',
        'Most common behavior'
      ]);
      expect(dialog.textContent).toContain('No explicit student identifier column will be included.');
      expect(document.activeElement.textContent).toBe('Cancel');

      const transferButton = Array.from(dialog.querySelectorAll('button')).find((button) =>
        button.textContent.trim() === 'Open in AlloSheet'
      );
      expect(transferButton).toBeTruthy();
      expect(transferButton.disabled).toBe(false);
      await React.act(async () => {
        transferButton.click();
        await Promise.resolve();
      });

      expect(openCalls).toBe(1);
      expect(host.contains(dialog)).toBe(true);
      expect(dialog.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(dialog);
      expect(document.activeElement.disabled).not.toBe(true);
      expect(Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Cancel').disabled).toBe(true);

      await React.act(async () => {
        resolveOpen(true);
        await pendingOpen;
        await Promise.resolve();
      });
      expect(host.querySelector('[aria-labelledby="bl-allosheet-review-title"]')).toBeNull();
    } finally {
      await React.act(async () => { root.unmount(); });
      host.remove();
      localStorage.clear();
      globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
    }
  });
});
