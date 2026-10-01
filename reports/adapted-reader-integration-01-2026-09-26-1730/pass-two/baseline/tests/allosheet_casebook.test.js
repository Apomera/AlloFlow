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

function roundTripWorkspace(tables) {
  const encoded = Workspace.encodeLocalTables({
    workspace: {
      title: 'Casebook roundtrip',
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
  return Workspace.toLocalTables(encoded).localTables;
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

  it('finds distinct exact case-name and case-ID mentions without substring collisions', () => {
    const definition = Casebook.getTemplate('aquarium');
    definition.cases = ['Tank 1', 'Tank 10', 'A', 'Ana'];
    const cases = Casebook.inspectTables(Casebook.buildTables(definition, CREATED_AT)).cases;
    const original = JSON.stringify(cases);

    expect(Casebook.findCaseMentions('TANK 1 was checked.', cases)).toEqual([cases[0]]);
    expect(Casebook.findCaseMentions('The reading belongs to c002.', cases)).toEqual([cases[1]]);
    expect(Casebook.findCaseMentions(
      'Tank 1 and tank 10 were checked; TANK 10 was checked twice.',
      cases,
    )).toEqual([cases[1], cases[0]]);
    expect(Casebook.findCaseMentions(
      'Tank 100, C0010, and Aquarium are not exact case mentions.',
      cases,
    )).toEqual([]);
    expect(Casebook.findCaseMentions(
      'A fish stayed near the filter; mañana will be another observation.',
      cases,
    )).toEqual([]);
    expect(Casebook.findCaseMentions('Ana was observed beside case C003.', cases))
      .toEqual([cases[3], cases[2]]);
    expect(JSON.stringify(cases)).toBe(original);

    expect(() => Casebook.findCaseMentions(null, cases)).toThrow(/narrative is invalid/i);
    expect(() => Casebook.findCaseMentions('', cases)).toThrow(/narrative is required/i);
    expect(() => Casebook.findCaseMentions(
      'x'.repeat(Casebook.limits.maxNarrativeChars + 1),
      cases,
    )).toThrow(/exceeds 1200 characters/i);
    expect(() => Casebook.findCaseMentions('Tank 1\u0000', cases))
      .toThrow(/unsupported control text/i);
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

  it('creates immutable case-context replacements and round-trips multiline and blank context', () => {
    const { book, tables } = buildBook();
    const observation = Casebook.createObservation(book, {
      caseId: 'C001',
      observedAt: '2026-08-26T18:00:00.000Z',
      values: { p_temperature: 79, p_ph: 7.2 },
      note: 'Baseline observation.',
      interpretation: '',
      source: 'typed',
    });
    book.tables.observations.records.push(observation);
    book.tables.observations.sourceRowCount = book.tables.observations.records.length;
    const current = Casebook.inspectTables(tables);
    const originalBook = JSON.stringify(current);
    const originalCaseRecord = JSON.stringify(current.tables.cases.records[0]);
    const originalObservations = JSON.stringify(current.tables.observations.records);
    const context = 'Stable setup:\n10 gallon tank\nFilter runs continuously.';

    const replacement = Casebook.createCaseContextUpdate(current, 'C001', context);
    const contextLabel = Casebook.tableColumnMap(current.tables.cases).context;
    expect(replacement.id).toBe(current.tables.cases.records[0].id);
    expect(Object.getPrototypeOf(replacement.fields)).toBeNull();
    expect(replacement.fields[contextLabel]).toBe(context);
    Object.keys(current.tables.cases.records[0].fields)
      .filter(label => label !== contextLabel)
      .forEach(label => expect(replacement.fields[label]).toBe(current.tables.cases.records[0].fields[label]));
    expect(JSON.stringify(current)).toBe(originalBook);
    expect(JSON.stringify(current.tables.cases.records[0])).toBe(originalCaseRecord);

    expect(() => Casebook.createCaseContextUpdate(current, 'C999', 'Unknown case'))
      .toThrow(/valid case/i);
    expect(() => Casebook.createCaseContextUpdate(
      current,
      'C001',
      'x'.repeat(Casebook.limits.maxNarrativeChars + 1),
    )).toThrow(/exceeds 1200 characters/i);
    expect(() => Casebook.createCaseContextUpdate(current, 'C001', 'Unsafe\u0000context'))
      .toThrow(/unsupported control text/i);
    expect(() => Casebook.createCaseContextUpdate(null, 'C001', context))
      .toThrow(/valid casebook/i);
    expect(JSON.stringify(current)).toBe(originalBook);
    expect(JSON.stringify(current.tables.observations.records)).toBe(originalObservations);

    const recordIndex = current.tables.cases.records.findIndex(record => record.id === replacement.id);
    current.tables.cases.records[recordIndex] = replacement;
    const inspected = Casebook.inspectTables(tables);
    expect(inspected.cases[0].context).toBe(context);
    expect(JSON.stringify(inspected.tables.observations.records)).toBe(originalObservations);

    const reopenedTables = roundTripWorkspace(tables);
    const reopened = Casebook.inspectTables(reopenedTables);
    expect(reopened).not.toBeNull();
    expect(reopened.definition).toMatchObject({ kind: Casebook.kind, version: Casebook.version });
    expect(reopenedTables.map(table => table.id)).toEqual([
      Casebook.tableIds.definition,
      Casebook.tableIds.cases,
      Casebook.tableIds.parameters,
      Casebook.tableIds.observations,
    ]);
    expect(reopened.cases[0].context).toBe(context);
    expect(reopened.observations).toEqual(inspected.observations);

    const blankReplacement = Casebook.createCaseContextUpdate(reopened, 'C001', '');
    const reopenedCaseIndex = reopened.tables.cases.records
      .findIndex(record => record.id === blankReplacement.id);
    reopened.tables.cases.records[reopenedCaseIndex] = blankReplacement;
    const blankReopened = Casebook.inspectTables(roundTripWorkspace(reopenedTables));
    expect(blankReopened.cases[0].context).toBe('');
    expect(blankReopened.observations).toEqual(inspected.observations);
  });

  it('compares latest values and generates evidence-seeking reflections', () => {
    const { tables } = buildBook();
    const base = {
      p_ph: 7.2,
      p_ammonia: 0,
      p_nitrate: 12,
      p_activity: 'active',
    };
    const first = appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-25T12:00:00.000Z',
      values: { ...base, p_temperature: 78 },
      note: 'Fish crossed the center repeatedly.', interpretation: '', source: 'typed',
    });
    const second = appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-26T12:00:00.000Z',
      values: { ...base, p_temperature: 84, p_ph: 7.4, p_activity: 'near filter' },
      note: 'Fish remained close to the filter for five minutes.', interpretation: '', source: 'typed',
    });
    const { book } = appendObservation(tables, {
      caseId: 'C002', observedAt: '2026-08-26T13:00:00.000Z',
      values: { ...base, p_temperature: 80, p_ph: 7.1, p_nitrate: 10 },
      note: 'Fish moved throughout the tank.', interpretation: '', source: 'typed',
    });

    expect([first.record.id, second.record.id]).toEqual(['O001', 'O002']);
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

  it('builds a dated, case-isolated parameter history with explicit missing-data accounting', () => {
    const { tables } = buildBook();
    const contextLabel = Casebook.tableColumnMap(
      tables.find(table => table.id === Casebook.tableIds.cases),
    ).context;
    tables.find(table => table.id === Casebook.tableIds.cases)
      .records[0].fields[contextLabel] = 'Private stable setup: do not include.';
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-27T12:00:00.000Z', values: { p_temperature: 80 },
      note: 'Private note one.', interpretation: 'Private hypothesis one.', source: 'voice transcript',
    });
    appendObservation(tables, {
      caseId: 'C002', observedAt: '2026-08-29T12:00:00.000Z', values: { p_temperature: 99 },
      note: 'Other case.', interpretation: '', source: 'typed',
    });
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-27T12:00:00.000Z', values: { p_temperature: 82 },
      note: 'Private note two.', interpretation: 'Private hypothesis two.', source: 'typed + voice transcript',
    });
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-25T12:00:00.000Z', values: { p_temperature: 78 },
      note: 'Earlier.', interpretation: '', source: 'typed',
    });
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-28T12:00:00.000Z', values: { p_temperature: null },
      note: 'Temperature omitted.', interpretation: '', source: 'typed',
    });
    appendObservation(tables, {
      caseId: 'C001', observedAt: '2026-08-30T12:00:00.000Z', values: { p_temperature: 75 },
      note: 'Date will be made invalid.', interpretation: '', source: 'typed',
    });
    const observationTable = tables.find(table => table.id === Casebook.tableIds.observations);
    const observedAtLabel = Casebook.tableColumnMap(observationTable).observed_at;
    observationTable.records.find(record => record.id === 'O006').fields[observedAtLabel] = 'not-a-date';
    const book = Casebook.inspectTables(tables);
    const before = JSON.stringify(book);

    const history = Casebook.buildParameterHistory(book, 'C001', 'p_temperature');
    expect(history).toEqual({
      case: { id: 'C001', name: 'Tank 1' },
      parameter: {
        key: 'p_temperature', label: 'Temperature', type: 'number', unit: '°F', minimum: 74, maximum: 82,
      },
      totalObservationCount: 5,
      missingValueCount: 1,
      undatedValueCount: 1,
      points: [
        { observationId: 'O004', observedAt: '2026-08-25T12:00:00.000Z', value: 78, displayValue: '78 °F' },
        { observationId: 'O001', observedAt: '2026-08-27T12:00:00.000Z', value: 80, displayValue: '80 °F' },
        { observationId: 'O003', observedAt: '2026-08-27T12:00:00.000Z', value: 82, displayValue: '82 °F' },
      ],
      firstPoint: {
        observationId: 'O004', observedAt: '2026-08-25T12:00:00.000Z', value: 78, displayValue: '78 °F',
      },
      latestPoint: {
        observationId: 'O003', observedAt: '2026-08-27T12:00:00.000Z', value: 82, displayValue: '82 °F',
      },
      firstToLatest: { kind: 'higher', difference: 4 },
      numericRange: { min: 78, max: 82 },
    });
    expect(Casebook.buildParameterHistory(book, 'C002', 'p_temperature')).toMatchObject({
      case: { id: 'C002', name: 'Tank 2' },
      totalObservationCount: 1,
      missingValueCount: 0,
      undatedValueCount: 0,
      firstToLatest: { kind: 'single', difference: null },
      numericRange: { min: 99, max: 99 },
    });
    expect(JSON.stringify(history)).not.toMatch(
      /Private stable setup|Private note|Private hypothesis|voice transcript|capture_source|interpretation/i,
    );
    expect(JSON.stringify(book)).toBe(before);

    observationTable.sourceRowCount = observationTable.records.length;
    const reopened = Casebook.inspectTables(roundTripWorkspace(tables));
    expect(Casebook.buildParameterHistory(reopened, 'C001', 'p_temperature')).toEqual(history);
  });

  it('classifies numeric and non-numeric parameter histories without inventing trends', () => {
    const numeric = buildBook('specimens');
    appendObservation(numeric.tables, {
      caseId: 'C001', observedAt: '2026-08-25T12:00:00.000Z', values: { p_length: 12 },
      note: '', interpretation: '', source: 'typed',
    });
    appendObservation(numeric.tables, {
      caseId: 'C001', observedAt: '2026-08-26T12:00:00.000Z', values: { p_length: 9 },
      note: '', interpretation: '', source: 'typed',
    });
    const numericBook = Casebook.inspectTables(numeric.tables);
    expect(Casebook.buildParameterHistory(numericBook, 'C001', 'p_length')).toMatchObject({
      firstToLatest: { kind: 'lower', difference: -3 },
      numericRange: { min: 9, max: 12 },
    });
    expect(Casebook.buildParameterHistory(numericBook, 'C001', 'p_mass')).toMatchObject({
      totalObservationCount: 2,
      missingValueCount: 2,
      undatedValueCount: 0,
      points: [],
      firstPoint: null,
      latestPoint: null,
      firstToLatest: { kind: 'none', difference: null },
      numericRange: null,
    });

    const text = buildBook('specimens');
    appendObservation(text.tables, {
      caseId: 'C001', observedAt: '2026-08-25T12:00:00.000Z', values: { p_condition: 'green' },
      note: '', interpretation: '', source: 'typed',
    });
    appendObservation(text.tables, {
      caseId: 'C001', observedAt: '2026-08-26T12:00:00.000Z', values: { p_condition: 'blue' },
      note: '', interpretation: '', source: 'typed',
    });
    const textBook = Casebook.inspectTables(text.tables);
    expect(Casebook.buildParameterHistory(textBook, 'C001', 'p_condition')).toMatchObject({
      firstToLatest: { kind: 'changed', difference: null },
      numericRange: null,
    });
    textBook.observations[1].values.p_condition = 'green';
    expect(Casebook.buildParameterHistory(textBook, 'C001', 'p_condition').firstToLatest)
      .toEqual({ kind: 'same', difference: null });
  });

  it('validates parameter-history inputs and leaves malformed observations untouched', () => {
    const { book } = buildBook();
    const before = JSON.stringify(book);
    expect(() => Casebook.buildParameterHistory(null, 'C001', 'p_temperature'))
      .toThrow(/valid casebook/i);
    expect(() => Casebook.buildParameterHistory(book, '', 'p_temperature'))
      .toThrow(/case is required/i);
    expect(() => Casebook.buildParameterHistory(book, 'C999', 'p_temperature'))
      .toThrow(/valid case/i);
    expect(() => Casebook.buildParameterHistory(book, 'C001', 'p_unknown'))
      .toThrow(/valid parameter/i);
    expect(() => Casebook.buildParameterHistory(book, 'C001\u0000', 'p_temperature'))
      .toThrow(/unsupported control text/i);
    expect(JSON.stringify(book)).toBe(before);
  });

  it('builds bounded, explanation-only brainstorm and feedback handoffs from the requested case', () => {
    const { tables } = buildBook();
    const caseTable = tables.find(table => table.id === Casebook.tableIds.cases);
    caseTable.records[0].fields[Casebook.tableColumnMap(caseTable).context] = 'SECRET CASE CONTEXT';
    const timestamps = [
      '2026-08-25T12:00:00.000Z',
      '2026-08-28T12:00:00.000Z',
      '2026-08-26T12:00:00.000Z',
      '2026-08-27T12:00:00.000Z',
    ];
    timestamps.forEach((observedAt, index) => appendObservation(tables, {
      caseId: 'C001', observedAt, values: { p_temperature: 78 + index },
      note: `SECRET NOTE ${index}`, interpretation: `SECRET INTERPRETATION ${index}`, source: 'typed',
    }));
    appendObservation(tables, {
      caseId: 'C002', observedAt: '2026-08-30T12:00:00.000Z', values: { p_temperature: 99 },
      note: 'OTHER CASE SECRET', interpretation: '', source: 'typed',
    });
    const book = Casebook.inspectTables(tables);
    const before = JSON.stringify(book);
    const brainstorm = Casebook.buildAgentReflectionRequest(book, 'C001', 'brainstorm');
    const feedback = Casebook.buildAgentReflectionRequest(book, 'C001', 'feedback');

    expect(brainstorm).toMatchObject({ goal: 'brainstorm', recordIds: ['O002', 'O004', 'O003'] });
    expect(brainstorm.recordIds).toHaveLength(3);
    expect(brainstorm.instruction).toMatch(/3–5 low-risk, observable next observations or questions/i);
    expect(brainstorm.instruction).toMatch(/what it could check and one limitation/i);
    expect(feedback).toMatchObject({ goal: 'feedback', recordIds: ['O002'] });
    expect(feedback.recordIds).toHaveLength(1);
    expect(feedback.instruction).toMatch(/specificity, observability, repeatability, missing context/i);
    expect(feedback.instruction).toMatch(/evidence versus interpretation/i);
    expect(feedback.instruction).toMatch(/future observations only/i);
    [brainstorm, feedback].forEach(request => {
      expect(Object.keys(request)).toEqual(['goal', 'recordIds', 'instruction']);
      expect(request.instruction.length).toBeLessThanOrEqual(800);
      expect(request.instruction).toMatch(/Review only the selected observation rows/i);
      expect(request.instruction).toMatch(/parameter values.*Qualitative note.*recorded evidence/i);
      expect(request.instruction).toMatch(/Human interpretation.*hypothesis, not fact/i);
      expect(request.instruction).toMatch(/support, gaps, and limitations/i);
      expect(request.instruction).toMatch(/empty changes array/i);
      expect(request.instruction).toMatch(/Do not rewrite cells/i);
      expect(request.instruction).toMatch(/Do not infer causes or hidden traits/i);
      expect(request.instruction).not.toMatch(
        /Tank 1|SECRET CASE CONTEXT|SECRET NOTE|SECRET INTERPRETATION|OTHER CASE SECRET/i,
      );
    });
    expect(JSON.stringify(book)).toBe(before);
  });

  it('adds learner-agency safeguards to reflection handoffs without leaking learner data', () => {
    const { tables } = buildBook('learner_support');
    const caseTable = tables.find(table => table.id === Casebook.tableIds.cases);
    caseTable.records[0].fields[Casebook.tableColumnMap(caseTable).context] = 'CONFIDENTIAL SUPPORT PLAN';
    appendObservation(tables, {
      caseId: 'C001', observedAt: CREATED_AT, values: { p_engagement: 'SECRET VALUE' },
      note: 'CONFIDENTIAL NOTE', interpretation: 'CONFIDENTIAL HYPOTHESIS', source: 'voice transcript',
    });
    const book = Casebook.inspectTables(tables);
    ['brainstorm', 'feedback'].forEach(goal => {
      const request = Casebook.buildAgentReflectionRequest(book, 'C001', goal);
      expect(request.recordIds).toEqual(['O001']);
      expect(request.instruction).toMatch(/Preserve individual agency/i);
      ['diagnosis', 'disability', 'placement', 'grade', 'ability', 'motivation', 'risk', 'ranking']
        .forEach(term => expect(request.instruction.toLowerCase()).toContain(term));
      expect(request.instruction).not.toMatch(
        /Learner A|CONFIDENTIAL SUPPORT PLAN|SECRET VALUE|CONFIDENTIAL NOTE|CONFIDENTIAL HYPOTHESIS|voice transcript/i,
      );
      expect(request.instruction.length).toBeLessThanOrEqual(800);
    });
  });

  it('rejects invalid reflection goals, cases, and empty timelines', () => {
    const { book, tables } = buildBook();
    expect(() => Casebook.buildAgentReflectionRequest(book, 'C001', 'summarize'))
      .toThrow(/valid agent reflection goal/i);
    expect(() => Casebook.buildAgentReflectionRequest(book, 'C999', 'brainstorm'))
      .toThrow(/valid case/i);
    expect(() => Casebook.buildAgentReflectionRequest(book, 'C001', 'brainstorm'))
      .toThrow(/record an observation/i);
    appendObservation(tables, {
      caseId: 'C002', observedAt: CREATED_AT, values: { p_temperature: 78 },
      note: '', interpretation: '', source: 'typed',
    });
    const onlyOtherCase = Casebook.inspectTables(tables);
    expect(() => Casebook.buildAgentReflectionRequest(onlyOtherCase, 'C001', 'feedback'))
      .toThrow(/record an observation/i);
    expect(() => Casebook.buildAgentReflectionRequest(null, 'C001', 'feedback'))
      .toThrow(/valid casebook/i);
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
