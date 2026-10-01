import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const aggregatorSource = readFileSync('quiz_live_aggregators.js', 'utf8');
const transferAdapterSource = readFileSync('allo_sheet/transfer_adapter.js', 'utf8');

function loadQuizAggregators(withTransferAdapter = false) {
  const fakeWindow = { AlloModules: {} };
  if (withTransferAdapter) {
    new Function('window', transferAdapterSource)(fakeWindow);
  }
  new Function('window', aggregatorSource)(fakeWindow);
  return {
    api: fakeWindow.AlloModules.QuizLiveAggregators,
    window: fakeWindow,
  };
}

function privateQuizFixture(studentCount) {
  const questions = [
    {
      type: 'mcq',
      question: 'PRIVATE PROMPT: identify the capital',
      options: ['PRIVATE CORRECT OPTION', 'PRIVATE WRONG OPTION', 'PRIVATE UNUSED OPTION'],
      correctAnswer: 'PRIVATE CORRECT OPTION',
    },
    {
      type: 'short-answer',
      question: 'PRIVATE PROMPT: explain your reasoning',
    },
  ];
  const roster = {};
  const allResponses = {};
  for (let index = 0; index < studentCount; index += 1) {
    const uid = `private-uid-${index}-ALPHA`;
    roster[uid] = { displayName: `PRIVATE LEARNER NAME ${index}` };
    allResponses[uid] = {
      0: {
        itemType: 'mcq',
        answer: { optionIdx: 1 },
        confidence: 'knew',
        timestamp: 1000 + index,
      },
    };
  }
  if (studentCount > 0) {
    const firstUid = 'private-uid-0-ALPHA';
    allResponses[firstUid][1] = {
      itemType: 'short-answer',
      answer: { text: 'PRIVATE RAW WRITTEN ANSWER ALPHA' },
      timestamp: 2000,
    };
    allResponses[firstUid].r0 = {
      itemType: 'reflection',
      answer: { text: 'PRIVATE REFLECTION ALPHA' },
      timestamp: 2100,
    };
    allResponses[firstUid][2] = {
      itemType: 'assessment-complete',
      answer: { answered: 2, total: 2 },
      timestamp: 2200,
    };
  }
  return {
    quizState: {
      activityId: 'PRIVATE SESSION CODE ALPHA',
      startedAt: 100,
      endedAt: 200,
      allResponses,
    },
    generatedContent: {
      id: 'PRIVATE RESOURCE ID ALPHA',
      title: 'PRIVATE QUIZ TITLE ALPHA',
      data: {
        mode: 'exit-ticket',
        questions,
        reflections: ['PRIVATE AUTHORED REFLECTION PROMPT ALPHA'],
      },
    },
    roster,
  };
}

describe('Quiz aggregate-only AlloSheet handoff', () => {
  it('builds a bounded tabular artifact without learner, response, prompt, or session content', () => {
    const { api } = loadQuizAggregators();
    const fixture = privateQuizFixture(5);
    const artifact = api.buildQuizAlloSheetEnvelope(
      fixture.quizState,
      fixture.generatedContent,
      fixture.roster,
      {
        createdAt: '2026-07-29T12:00:00.000Z',
        aiGradedCache: {
          'private-uid-0-ALPHA:1': {
            status: 'incorrect',
            feedback: 'PRIVATE AI FEEDBACK ALPHA',
          },
        },
      },
    );

    expect(artifact).toMatchObject({
      kind: 'alloflow.tabular.v1',
      version: 1,
      source: { tool: 'quiz-analytics', label: 'Quiz Analytics', version: '1' },
      title: 'Quiz item analysis',
      createdAt: '2026-07-29T12:00:00.000Z',
      classification: {
        level: 'aggregate-education-data',
        studentIdentifierIncluded: false,
        freeTextNotesIncluded: false,
      },
      privacy: {
        scope: 'educator-reviewed-aggregate',
        identifierIncluded: false,
        reducedData: true,
        notesIncluded: false,
        transferEnablesAI: false,
      },
      capabilities: { writeBack: false, aiEnabled: false },
    });
    expect(artifact.tables).toHaveLength(1);
    expect(artifact.tables[0]).toMatchObject({
      id: 'quiz_item_analysis',
      title: 'Quiz item analysis',
      rowCount: 2,
      sourceRowCount: 2,
      truncated: false,
    });
    expect(artifact.tables[0].columns.map(column => column.key)).toEqual([
      'question_number',
      'item_type',
      'unscored',
      'respondents',
      'omitted_count',
      'gradable_count',
      'correct_count',
      'partial_count',
      'incorrect_count',
      'idk_count',
      'awaiting_review_count',
      'high_confidence_incorrect',
      'correct_rate_percent',
      'sample_status',
      'signal_codes',
    ]);
    expect(artifact.tables[0].rows[0]).toMatchObject({
      id: 'quiz-item-1',
      values: {
        question_number: 1,
        item_type: 'mcq',
        respondents: 5,
        incorrect_count: 5,
        high_confidence_incorrect: 5,
        correct_rate_percent: 0,
        sample_status: 'sufficient_sample',
        signal_codes: 'challenging;confidence-mismatch',
      },
    });
    expect(artifact.tables[0].rows[1]).toMatchObject({
      id: 'quiz-item-2',
      values: {
        question_number: 2,
        item_type: 'short-answer',
        respondents: 1,
        incorrect_count: 1,
        sample_status: 'early_signal',
        signal_codes: '',
      },
    });

    const serialized = JSON.stringify(artifact);
    [
      'PRIVATE PROMPT',
      'PRIVATE CORRECT OPTION',
      'PRIVATE WRONG OPTION',
      'PRIVATE UNUSED OPTION',
      'private-uid-',
      'PRIVATE LEARNER NAME',
      'PRIVATE RAW WRITTEN ANSWER',
      'PRIVATE REFLECTION',
      'PRIVATE AUTHORED REFLECTION PROMPT',
      'PRIVATE AI FEEDBACK',
      'PRIVATE SESSION CODE',
      'PRIVATE RESOURCE ID',
      'PRIVATE QUIZ TITLE',
    ].forEach(secret => expect(serialized).not.toContain(secret));
    expect(serialized).not.toContain('"byUid"');
    expect(serialized).not.toContain('"cohorts"');
    expect(serialized).not.toContain('"activityId"');
  });

  it('enforces the five-respondent interpretation floor while retaining descriptive counts', () => {
    const { api } = loadQuizAggregators();
    const early = privateQuizFixture(4);
    const earlyArtifact = api.buildQuizAlloSheetEnvelope(
      early.quizState,
      early.generatedContent,
      early.roster,
      { createdAt: '2026-07-29T12:00:00.000Z' },
    );
    expect(earlyArtifact.provenance.minimumSignalSample).toBe(5);
    expect(earlyArtifact.tables[0].rows[0].values).toMatchObject({
      respondents: 4,
      incorrect_count: 4,
      correct_rate_percent: 0,
      sample_status: 'early_signal',
      signal_codes: '',
    });

    const sufficient = privateQuizFixture(5);
    const sufficientArtifact = api.buildQuizAlloSheetEnvelope(
      sufficient.quizState,
      sufficient.generatedContent,
      sufficient.roster,
      { createdAt: '2026-07-29T12:00:00.000Z' },
    );
    expect(sufficientArtifact.tables[0].rows[0].values).toMatchObject({
      respondents: 5,
      sample_status: 'sufficient_sample',
      signal_codes: 'challenging;confidence-mismatch',
    });
  });

  it('caps authored questions and participants without leaking truncated records', () => {
    const { api } = loadQuizAggregators();
    const questions = Array.from({ length: 105 }, (_, index) => ({
      type: 'mcq',
      question: `PRIVATE BULK PROMPT ${index}`,
      options: ['PRIVATE YES', 'PRIVATE NO'],
      correctAnswer: 'PRIVATE YES',
    }));
    const roster = {};
    for (let index = 0; index < 260; index += 1) {
      roster[`PRIVATE-BULK-UID-${String(index).padStart(3, '0')}`] = {
        displayName: `PRIVATE BULK NAME ${index}`,
      };
    }
    const allResponses = {
      'PRIVATE-BULK-UID-000': {
        0: { itemType: 'mcq', answer: { optionIdx: 0 } },
      },
    };
    const artifact = api.buildQuizAlloSheetEnvelope(
      { activityId: 'PRIVATE BULK SESSION', allResponses },
      { id: 'PRIVATE BULK RESOURCE', title: 'PRIVATE BULK TITLE', data: { questions } },
      roster,
      { createdAt: '2026-07-29T12:00:00.000Z' },
    );

    expect(artifact.tables[0]).toMatchObject({
      rowCount: 100,
      sourceRowCount: 105,
      truncated: true,
    });
    expect(artifact.tables[0].rows).toHaveLength(100);
    expect(artifact.tables[0].columns).toHaveLength(15);
    expect(artifact.provenance).toMatchObject({
      authoredQuestionCount: 105,
      analyzedQuestionCount: 100,
      participantCount: 250,
      questionsTruncated: 5,
      participantsTruncated: 10,
    });
    const serialized = JSON.stringify(artifact);
    expect(serialized).not.toContain('PRIVATE BULK PROMPT');
    expect(serialized).not.toContain('PRIVATE-BULK-UID');
    expect(serialized).not.toContain('PRIVATE BULK NAME');
    expect(serialized).not.toContain('PRIVATE BULK SESSION');
    expect(serialized).not.toContain('PRIVATE BULK RESOURCE');
    expect(serialized).not.toContain('PRIVATE BULK TITLE');
  });

  it('uses the shared transfer adapter when present and exposes the builder through API metadata', () => {
    const { api, window: fakeWindow } = loadQuizAggregators(true);
    const adapter = fakeWindow.AlloSheetTransferAdapter;
    const originalTable = adapter.table.bind(adapter);
    const originalEnvelope = adapter.envelope.bind(adapter);
    adapter.table = vi.fn(config => originalTable(config));
    adapter.envelope = vi.fn(config => originalEnvelope(config));

    const fixture = privateQuizFixture(5);
    const artifact = api.buildQuizAlloSheetEnvelope(
      fixture.quizState,
      fixture.generatedContent,
      fixture.roster,
      { createdAt: '2026-07-29T12:00:00.000Z' },
    );

    expect(adapter.table).toHaveBeenCalledTimes(1);
    expect(adapter.envelope).toHaveBeenCalledTimes(1);
    expect(artifact.capabilities).toEqual({ writeBack: false, aiEnabled: false });
    expect(api._meta).toMatchObject({
      version: '1',
      allosheetMinimumSignalSample: 5,
    });
    expect(api._meta.buildQuizAlloSheetEnvelope).toBe(api.buildQuizAlloSheetEnvelope);
  });
});
