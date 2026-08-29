import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'allo_sheet', 'allo_sheet_casebook.js'), 'utf8');
const workspaceSource = readFileSync(resolve(process.cwd(), 'allo_sheet', 'allo_sheet_workspace.js'), 'utf8');

function loadCasebook() {
  const fakeWindow = { AlloModules: {} };
  const commonJs = { exports: {} };
  new Function('window', 'module', 'exports', source)(fakeWindow, commonJs, commonJs.exports);
  expect(fakeWindow.AlloSheetCasebook).toBe(commonJs.exports);
  expect(fakeWindow.AlloModules.AlloSheetCasebook).toBe(commonJs.exports);
  return commonJs.exports;
}

function loadWorkspaceCodec() {
  const fakeWindow = { AlloModules: {} };
  const commonJs = { exports: {} };
  new Function('window', 'module', 'exports', workspaceSource)(fakeWindow, commonJs, commonJs.exports);
  return commonJs.exports;
}

const Casebook = loadCasebook();
const Workspace = loadWorkspaceCodec();
const CREATED_AT = '2026-08-26T16:30:00.000Z';

function buildBook(templateId = 'aquarium') {
  const tables = Casebook.buildTables(Casebook.getTemplate(templateId), CREATED_AT);
  const book = Casebook.inspectTables(tables);
  expect(book).not.toBeNull();
  return { book, tables };
}

function appendObservation(tables, input) {
  const before = Casebook.inspectTables(tables);
  const record = Casebook.createObservation(before, input);
  before.tables.observations.records.push(record);
  const book = Casebook.inspectTables(tables);
  expect(book).not.toBeNull();
  return { book, record };
}

describe('AlloSheet Casebook pure module', () => {
  it('builds and inspects an independent starter-template roundtrip', () => {
    const template = Casebook.getTemplate('aquarium');
    template.title = 'Room 12 aquarium study';
    template.cases.push('Tank 3');
    const tables = Casebook.buildTables(template, CREATED_AT);
    const book = Casebook.inspectTables(tables);

    expect(tables.map(table => table.id)).toEqual([
      Casebook.tableIds.definition,
      Casebook.tableIds.cases,
      Casebook.tableIds.parameters,
      Casebook.tableIds.observations,
    ]);
    expect(book.definition).toMatchObject({
      kind: Casebook.kind,
      version: Casebook.version,
      title: 'Room 12 aquarium study',
      caseLabel: 'Tank',
      privacyMode: 'general',
    });
    expect(book.cases.map(item => [item.id, item.name])).toEqual([
      ['C001', 'Tank 1'],
      ['C002', 'Tank 2'],
      ['C003', 'Tank 3'],
    ]);
    expect(book.parameters.map(item => item.key)).toEqual([
      'p_temperature', 'p_ph', 'p_ammonia', 'p_nitrate', 'p_activity',
    ]);
    expect(book.observations).toEqual([]);
    expect(Casebook.fieldByKey(
      book.tables.definition,
      book.tables.definition.records[0],
      'created_at',
    )).toBe(CREATED_AT);
    expect(Casebook.getTemplate('aquarium')).toMatchObject({
      title: 'Aquarium observation study',
      cases: ['Tank 1', 'Tank 2'],
    });
  });

  it('parses natural-language measurements while preserving a review draft', () => {
    const { book } = buildBook();
    const narrative = 'Temperature 83.5, pH 7.4, activity: hovering near the filter.';
    const draft = Casebook.parseNarrative(narrative, book.parameters, { source: 'voice' });

    expect(draft.values).toMatchObject({
      p_temperature: 83.5,
      p_ph: 7.4,
      p_ammonia: null,
      p_nitrate: null,
      p_activity: 'hovering near the filter',
    });
    expect(draft.matched.map(item => item.key)).toEqual(['p_temperature', 'p_ph', 'p_activity']);
    expect(draft.missing).toEqual(['p_ammonia', 'p_nitrate']);
    expect(draft).toMatchObject({ note: narrative, interpretation: '', source: 'voice transcript' });
    expect(draft.warnings.join(' ')).toMatch(/Temperature is above the expected context/i);
  });

  it('creates a reviewed record without applying it until the caller approves', () => {
    const { book, tables } = buildBook();
    const draft = Casebook.parseNarrative(
      'Temperature 78, pH 7.3, activity: swimming near the plants.',
      book.parameters,
      { source: 'mixed' },
    );
    const interpretation = 'Reviewed interpretation: compare activity after the next feeding.';
    const record = Casebook.createObservation(book, {
      caseId: 'C002',
      observedAt: '2026-08-26T17:45:00-04:00',
      values: draft.values,
      note: draft.note,
      interpretation,
      source: draft.source,
    });

    expect(record.id).toBe('O001');
    expect(book.tables.observations.records).toHaveLength(0);
    expect(Casebook.fieldByKey(book.tables.observations, record, 'case_id')).toBe('C002');
    expect(Casebook.fieldByKey(book.tables.observations, record, 'p_temperature')).toBe(78);
    expect(Casebook.fieldByKey(book.tables.observations, record, 'qualitative_note')).toBe(draft.note);
    expect(Casebook.fieldByKey(book.tables.observations, record, 'interpretation')).toBe(interpretation);
    expect(Casebook.fieldByKey(book.tables.observations, record, 'capture_source')).toBe('typed + voice transcript');

    book.tables.observations.records.push(record);
    const reopened = Casebook.inspectTables(tables);
    expect(reopened.observations).toEqual([
      expect.objectContaining({ id: 'O001', caseId: 'C002', orphaned: false, interpretation }),
    ]);
    expect(Casebook.createObservation(reopened, {
      caseId: 'C002',
      observedAt: '2026-08-27T09:00:00.000Z',
      values: { p_ph: 7.2 },
      note: '',
      interpretation: '',
      source: 'typed',
    }).id).toBe('O002');
  });

  it('compares latest values and generates evidence-seeking reflections', () => {
    const { tables } = buildBook();
    const base = {
      p_ph: 7.2,
      p_ammonia: 0,
      p_nitrate: 12,
      p_activity: 'active',
    };
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-25T12:00:00.000Z',
      values: { ...base, p_temperature: 78 },
      note: 'Fish crossed the center repeatedly.', interpretation: '', source: 'typed',
    });
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-26T12:00:00.000Z',
      values: { ...base, p_temperature: 84, p_ph: 7.4, p_activity: 'near filter' },
      note: 'Fish remained close to the filter for five minutes.', interpretation: '', source: 'typed',
    });
    const { book } = appendObservation(tables, {
      caseId: 'C002', observedAt: '2026-08-26T13:00:00.000Z',
      values: { ...base, p_temperature: 80, p_ph: 7.1, p_nitrate: 10 },
      note: 'Fish moved throughout the tank.', interpretation: '', source: 'typed',
    });

    expect(Casebook.caseTimeline(book, 'C001').map(item => item.id)).toEqual(['O002', 'O001']);
    expect(Casebook.buildComparison(book, 'p_temperature').rows).toEqual([
      expect.objectContaining({ caseId: 'C001', value: 84, status: 'Above expected context' }),
      expect.objectContaining({ caseId: 'C002', value: 80, status: 'Within expected context' }),
    ]);
    const reflections = Casebook.buildReflections(book, 'C001');
    expect(reflections.some(prompt => prompt.includes('repeated or checked'))).toBe(true);
    expect(reflections.some(prompt => prompt.includes('Temperature changed from'))).toBe(true);
    expect(reflections.every(prompt => prompt.endsWith('?'))).toBe(true);
  });

  it('rejects oversized, malformed, and prototype-shaped input', () => {
    const specimen = Casebook.getTemplate('specimens');
    const tooMany = Array.from({ length: Casebook.limits.maxParameters + 1 }, (_, index) => ({
      label: `Measure ${index + 1}`,
      type: 'number',
    }));
    expect(() => Casebook.normalizeDefinition({ ...specimen, parameters: tooMany }))
      .toThrow(/at most 12 parameters/i);
    expect(() => Casebook.normalizeDefinition({ ...specimen, title: 'Unsafe\u0000title' }))
      .toThrow(/unsupported control text/i);
    expect(() => Casebook.normalizeDefinition(Object.create({ ...specimen })))
      .toThrow(/definition is invalid/i);
    expect(() => Casebook.getTemplate('__proto__')).toThrow(/supported casebook starter/i);
    expect(() => Casebook.parseNarrative(
      'x'.repeat(Casebook.limits.maxNarrativeChars + 1),
      buildBook().book.parameters,
    )).toThrow(/exceeds 1200 characters/i);

    const normalized = Casebook.normalizeDefinition({
      ...specimen,
      parameters: [{ label: 'Measured value', key: '__proto__', type: 'number' }],
    });
    expect(normalized.parameters[0].key).toBe('p_measured_value');
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('uses collision-proof export-safe observation columns and round-trips slash units', () => {
    const specimen = Casebook.getTemplate('specimens');
    specimen.parameters = [
      { key: 'case_id', label: 'Case ID', type: 'text' },
      { key: 'p_temperature', label: 'Temperature', type: 'number', unit: 'mg/L' },
      { key: 'p_decorated_temperature', label: 'Temperature (mg/L)', type: 'number' },
      { key: 'p_length_width', label: 'Length/width', type: 'number', unit: 'cm\\mm' },
    ];
    const tables = Casebook.buildTables(specimen, CREATED_AT);
    const observationTable = tables.find(table => table.id === Casebook.tableIds.observations);

    expect(new Set(observationTable.columns).size).toBe(observationTable.columns.length);
    expect(observationTable.columns.every(label => !/[\/\\]/.test(label))).toBe(true);
    expect(observationTable.columns).toEqual(expect.arrayContaining([
      'Case ID',
      'Measure 1: Case ID',
      'Measure 2: Temperature (mg per L)',
      'Measure 3: Temperature (mg per L)',
      'Measure 4: Length per width (cm per mm)',
    ]));

    const encoded = Workspace.encodeLocalTables({
      workspace: {
        title: specimen.title,
        createdAt: CREATED_AT,
        savedAt: CREATED_AT,
        activeTableId: Casebook.tableIds.observations,
        modifiedTableIds: tables.map(table => table.id),
      },
      origin: {
        kind: 'blank',
        source: { tool: 'allosheet_casebook', label: 'AlloSheet Observation Casebook', version: '1' },
        createdAt: CREATED_AT,
        classification: {
          level: 'observation-data', identifierIncluded: false, notesIncluded: true, declarationKnown: false,
        },
        privacy: { scope: 'local-observation-authoring', reducedData: false, transferEnablesAI: false },
        provenance: { schema: Casebook.kind },
      },
      capabilities: { writeBack: false, aiEnabled: false },
      tables,
    });
    const reopened = Casebook.inspectTables(Workspace.toLocalTables(encoded).localTables);
    expect(reopened).not.toBeNull();
    expect(reopened.parameters.map(parameter => parameter.unit)).toEqual(['', 'mg/L', '', 'cm\\mm']);
  });

  it('restores number and boolean types after ordinary table text edits', () => {
    const { tables } = buildBook();
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-25T12:00:00.000Z',
      values: { p_temperature: 78 }, note: 'Baseline.', interpretation: '', source: 'typed',
    });
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-26T12:00:00.000Z',
      values: { p_temperature: 80 }, note: 'Follow-up.', interpretation: '', source: 'typed',
    });
    const observationTable = tables.find(table => table.id === Casebook.tableIds.observations);
    const temperatureLabel = Casebook.tableColumnMap(observationTable).p_temperature;
    observationTable.records[1].fields[temperatureLabel] = '84';
    const reopened = Casebook.inspectTables(tables);
    expect(reopened.observations[0].values.p_temperature).toBe(78);
    expect(reopened.observations[1].values.p_temperature).toBe(84);
    expect(Casebook.buildComparison(reopened, 'p_temperature').rows[0])
      .toMatchObject({ value: 84, status: 'Above expected context' });
    expect(Casebook.buildReflections(reopened, 'C001').join(' ')).toContain('Temperature changed from');

    const booleanDefinition = Casebook.getTemplate('specimens');
    booleanDefinition.parameters = [{ key: 'p_present', label: 'Present', type: 'boolean' }];
    const booleanTables = Casebook.buildTables(booleanDefinition, CREATED_AT);
    appendObservation(booleanTables, {
      caseId: 'C001', observedAt: CREATED_AT, values: { p_present: true },
      note: '', interpretation: '', source: 'typed',
    });
    const booleanTable = booleanTables.find(table => table.id === Casebook.tableIds.observations);
    booleanTable.records[0].fields[Casebook.tableColumnMap(booleanTable).p_present] = 'false';
    const booleanBook = Casebook.inspectTables(booleanTables);
    expect(booleanBook.observations[0].values.p_present).toBe(false);
    expect(Casebook.valueText(booleanBook.parameters[0], false)).toBe('No');
  });

  it('keeps learner evidence, human interpretation, and agent reflection separate', () => {
    const { book, tables } = buildBook('learner_support');
    expect(book.definition.privacyMode).toBe('learner-support');
    expect(book.parameters.map(item => item.label)).toEqual([
      'Engagement', 'Access need', 'Support used', 'Independence', 'Goal evidence',
    ]);
    expect(book.parameters.map(item => item.label).join(' ')).not.toMatch(/diagnosis|deficit|risk score|rank/i);

    const narrative = 'Engagement: joined the group, access: worksheet glare, support: large print, independence: used one reminder, goal: read two sentences aloud.';
    const draft = Casebook.parseNarrative(narrative, book.parameters, { source: 'typed' });
    expect(draft).toMatchObject({ note: narrative, interpretation: '' });
    expect(draft.values).toMatchObject({
      p_engagement: 'joined the group',
      p_access: 'worksheet glare',
      p_support: 'large print',
      p_independence: 'used one reminder',
      p_goal_evidence: 'read two sentences aloud',
    });

    const humanInterpretation = 'Teacher hypothesis: the large-print copy may have reduced the access barrier.';
    const { book: reopened, record } = appendObservation(tables, {
      caseId: 'C001', observedAt: CREATED_AT, values: draft.values,
      note: draft.note, interpretation: humanInterpretation, source: draft.source,
    });
    const reflections = Casebook.buildReflections(reopened, 'C001');
    expect(Casebook.fieldByKey(reopened.tables.observations, record, 'qualitative_note')).toBe(narrative);
    expect(Casebook.fieldByKey(reopened.tables.observations, record, 'interpretation')).toBe(humanInterpretation);
    expect(reflections.length).toBeGreaterThan(0);
    expect(reflections.join(' ')).not.toContain('Teacher hypothesis');
    expect(reopened.observations[0]).toMatchObject({ note: narrative, interpretation: humanInterpretation });
  });
});
