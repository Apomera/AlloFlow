// One survey-item representation, with adapters to the three that already
// exist. These tests use the REAL shapes read off each surface, not invented
// ones — a schema layer that round-trips only its own idea of the data proves
// nothing about the code it is meant to unify.
import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
let S;

beforeAll(() => {
  const root = {};
  // eslint-disable-next-line no-new-func
  new Function('window', 'self', 'globalThis', fs.readFileSync(path.join(ROOT, 'survey_item_schema_module.js'), 'utf8')).call(root, root, root, root);
  S = root.AlloModules.SurveyItemSchema;
});

// Straight off student_analytics_module.js cqAddQuestion().
const RESEARCH_SUITE_ITEM = {
  id: 'cq1',
  text: 'I feel confident using this tool',
  type: 'likert',
  labels: [
    { text: 'Strongly disagree', image: null },
    { text: 'Disagree', image: null },
    { text: 'Neutral', image: null },
    { text: 'Agree', image: 'data:image/png;base64,AAAA' },
    { text: 'Strongly agree', image: null }
  ],
  options: []
};

// Straight off AlloFlowANTI.txt handleQuizChange.
const QUIZ_ITEM = {
  itemType: 'likert',
  question: 'I feel confident using this tool',
  scale: { steps: 5, lowLabel: 'Strongly disagree', highLabel: 'Strongly agree' },
  options: ['1', '2', '3', '4', '5']
};

// Straight off Code.gs normalizeAssignmentActivityConfig.
const MAILBOX_RATING = {
  v: 1,
  activityId: 'AC-11111111-1111-1111-1111-111111111111',
  type: 'rating',
  delivery: 'shared_async',
  prompt: 'I feel confident using this tool',
  minValue: 1,
  maxValue: 5,
  labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
};

describe('it registers the way the loader expects', () => {
  it('sets AlloModules.SurveyItemSchema', () => {
    // The loader asserts the global is present after a fetch; a module that
    // does not set it reports as a failed load even when it worked.
    expect(S && S.VERSION).toBe('alloflow-survey-item/v1');
  });
});

describe('Research Suite — the richest shape, so it must not lose anything', () => {
  it('round-trips an item without loss, images included', () => {
    const canonical = S.fromResearchSuite([RESEARCH_SUITE_ITEM]);
    const back = S.toResearchSuite(canonical);
    expect(back).toEqual([RESEARCH_SUITE_ITEM]);
  });

  it('keeps a per-label image, which is the whole point for pre-readers', () => {
    const [item] = S.fromResearchSuite([RESEARCH_SUITE_ITEM]);
    expect(item.labels[3].image).toBe('data:image/png;base64,AAAA');
  });

  it('maps mcq to choice and back', () => {
    const mcq = { id: 'q2', text: 'Which fits best?', type: 'mcq', labels: [], options: [{ text: 'A', image: null }, { text: 'B', image: null }] };
    expect(S.toResearchSuite(S.fromResearchSuite([mcq]))).toEqual([mcq]);
  });

  it('tolerates a bare string label, which the editor also accepts', () => {
    const [item] = S.fromResearchSuite([{ id: 'q', text: 'Rate it', type: 'likert', labels: ['Low', 'Mid', 'High'] }]);
    expect(item.labels.map((c) => c.text)).toEqual(['Low', 'Mid', 'High']);
    expect(item.steps).toBe(3);
  });
});

describe('Quiz poll mode — endpoints only, and honest about it', () => {
  it('produces the synthesized numeric options the wire format needs', () => {
    const [quiz] = S.toQuizItems(S.fromResearchSuite([RESEARCH_SUITE_ITEM]));
    expect(quiz.options).toEqual(['1', '2', '3', '4', '5']);
    expect(quiz.scale).toEqual({ steps: 5, lowLabel: 'Strongly disagree', highLabel: 'Strongly agree' });
  });

  it('reads a real Quiz item back', () => {
    const [item] = S.fromQuizItems([QUIZ_ITEM]);
    expect(item.type).toBe('likert');
    expect(item.steps).toBe(5);
    expect(item.labels[0].text).toBe('Strongly disagree');
    expect(item.labels[4].text).toBe('Strongly agree');
  });

  it('leaves the middle labels BLANK rather than inventing them', () => {
    // Quiz only ever stored two labels. Filling the gap with plausible words
    // would fabricate instrument wording the author never chose.
    const [item] = S.fromQuizItems([QUIZ_ITEM]);
    expect(item.labels.slice(1, 4).map((c) => c.text)).toEqual(['', '', '']);
  });

  it('loses middle labels and images going TO quiz — the lossy direction', () => {
    const canonical = S.fromResearchSuite([RESEARCH_SUITE_ITEM]);
    const back = S.fromQuizItems(S.toQuizItems(canonical));
    expect(back[0].labels[2].text).toBe('');          // 'Neutral' is gone
    expect(back[0].labels[3].image).toBe(null);       // the image is gone
    expect(back[0].labels[0].text).toBe('Strongly disagree'); // endpoints survive
  });
});

describe('Share & Collect mailbox', () => {
  // Code.gs v13 hosts a real multi-item survey activity, so a whole
  // instrument travels as ONE activity — the earlier N-single-prompt split
  // was retired before it ever shipped.
  it('emits one survey activity carrying the whole instrument', () => {
    const canonical = S.fromResearchSuite([
      RESEARCH_SUITE_ITEM,
      { id: 'q2', text: 'Which fits best?', type: 'mcq', labels: [], options: [{ text: 'A', image: null }, { text: 'B', image: null }] },
      { id: 'q3', text: 'Anything else?', type: 'freetext', labels: [], options: [] },
    ]);
    const { activities, overflow } = S.toMailboxActivities(canonical, { identityMode: 'anonymous', prompt: 'Weekly check-in' });
    expect(activities).toHaveLength(1);
    expect(overflow).toBe(0);
    expect(activities[0]).toMatchObject({ type: 'survey', identityMode: 'anonymous', prompt: 'Weekly check-in' });
    expect(activities[0].items.map((item) => item.type)).toEqual(['likert', 'choice', 'freetext']);
    expect(activities[0].items[0]).toMatchObject({ steps: 5, labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'] });
    expect(activities[0].items[1].options).toEqual([{ label: 'A' }, { label: 'B' }]);
  });

  it('will not invent an identity mode — the server refuses defaults and so does this', () => {
    const { activities } = S.toMailboxActivities(S.fromResearchSuite([RESEARCH_SUITE_ITEM]));
    expect(activities[0].identityMode).toBe('');
  });

  it('reads a server-normalized survey activity back with its generated ids', () => {
    const wire = {
      activityId: 'AC-1', type: 'survey', prompt: 'Weekly check-in',
      items: [
        { id: 'i1', type: 'likert', text: 'Confidence', steps: 5, labels: ['Low', '', '', '', 'High'], required: true },
        { id: 'i2', type: 'choice', text: 'Best support?', options: [{ id: 'o1', label: 'Read-aloud' }, { id: 'o2', label: 'Glossary' }] },
        { id: 'i3', type: 'numeric', text: 'Minutes', min: 0, max: 240 },
      ],
    };
    const instrument = S.fromMailboxActivity(wire);
    expect(instrument.map((item) => item.id)).toEqual(['i1', 'i2', 'i3']);
    expect(instrument[0]).toMatchObject({ type: 'likert', steps: 5, required: true });
    expect(instrument[0].labels.map((c) => c.text)).toEqual(['Low', '', '', '', 'High']);
    expect(instrument[1].options.map((c) => c.text)).toEqual(['Read-aloud', 'Glossary']);
    expect(instrument[2]).toMatchObject({ min: 0, max: 240 });
  });

  it('still reads a legacy single-prompt rating activity as one item', () => {
    const item = S.fromMailboxActivity(MAILBOX_RATING);
    expect(item.type).toBe('likert');
    expect(item.steps).toBe(5);
    expect(item.labels.map((c) => c.text)).toEqual(MAILBOX_RATING.labels);
  });

  it('reports that label images cannot survive the hop', () => {
    // The mailbox stores plain strings. Silently dropping an image an author
    // generated for a pre-reader would be the worst kind of quiet failure.
    const canonical = S.fromResearchSuite([RESEARCH_SUITE_ITEM]);
    expect(S.toMailboxActivities(canonical).lossy).toEqual(['label-images']);
  });

  it('reports overflow past the per-survey item cap instead of truncating silently', () => {
    const many = [];
    for (let i = 0; i < 15; i += 1) many.push({ id: 'q' + i, text: 'Item ' + i, type: 'likert', steps: 5 });
    const out = S.toMailboxActivities(many);
    expect(out.activities[0].items.length).toBe(S.MAILBOX_MAX_SURVEY_ITEMS);
    expect(out.overflow).toBe(3);
  });
});

describe('research validity is REPORTED, never silently applied', () => {
  it('accepts a normal multi-item 5-point instrument', () => {
    const items = S.fromResearchSuite([RESEARCH_SUITE_ITEM, Object.assign({}, RESEARCH_SUITE_ITEM, { id: 'cq2', text: 'I would use it again' })]);
    expect(S.researchValidity(items).ok).toBe(true);
  });

  it('flags a single-item Likert scale, the rule the router already enforces', () => {
    const report = S.researchValidity(S.fromResearchSuite([RESEARCH_SUITE_ITEM]));
    expect(report.ok).toBe(false);
    expect(report.problems.map((p) => p.code)).toContain('single-item-scale');
  });

  it('flags too many steps without rewriting the author\'s scale', () => {
    const ten = { id: 'q', text: 'Rate 1-10', type: 'likert', steps: 10 };
    const items = [S.normalizeItem(ten, 0), S.normalizeItem(Object.assign({}, ten, { id: 'q2' }), 1)];
    const report = S.researchValidity(items);
    expect(report.problems.map((p) => p.code)).toContain('steps-too-many');
    // The item itself is untouched: a 1-10 vibe check is a legitimate
    // non-research use and must not be clamped behind the author's back.
    expect(items[0].steps).toBe(10);
  });

  it('flags a label count that disagrees with the step count', () => {
    const item = S.normalizeItem({ id: 'q', text: 'Rate it', type: 'likert', steps: 5, labels: ['Low', 'High'] }, 0);
    // Labels are the stronger signal, so steps follows them...
    expect(item.steps).toBe(2);
    // ...which then trips the too-few rule rather than passing quietly.
    expect(S.researchValidity([item, item]).problems.map((p) => p.code)).toContain('steps-too-few');
  });

  it('does not impose the scale rule on a survey with no Likert items', () => {
    const items = S.fromResearchSuite([{ id: 'q', text: 'Anything to add?', type: 'freetext' }]);
    expect(S.researchValidity(items).ok).toBe(true);
  });
});

describe('the three surfaces agree on the same instrument', () => {
  it('carries an instrument through Research Suite -> mailbox survey -> back', () => {
    const canonical = S.fromResearchSuite([RESEARCH_SUITE_ITEM]);
    const { activities } = S.toMailboxActivities(canonical, { identityMode: 'anonymous' });
    const returned = S.fromMailboxActivity(Object.assign({ activityId: 'AC-1' }, activities[0]));
    expect(returned).toHaveLength(1);
    expect(returned[0].text).toBe(RESEARCH_SUITE_ITEM.text);
    expect(returned[0].steps).toBe(5);
    expect(returned[0].labels.map((c) => c.text)).toEqual(RESEARCH_SUITE_ITEM.labels.map((c) => c.text));
  });
});
