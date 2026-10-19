import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let aggregateReflections;
beforeAll(() => {
  const moduleWindow = { AlloModules: {} };
  new Function('window', readFileSync('quiz_live_aggregators.js', 'utf8'))(moduleWindow);
  aggregateReflections = moduleWindow.AlloModules.QuizLiveAggregators.aggregateReflections;
});

const content = { data: { questions: [{ type: 'mcq' }], reflections: ['What changed?', 'What next?'] } };
const legacy = text => ({ itemType: 'reflection', answer: { text }, timestamp: 10 });
const complete = (reflections, timestamp = 20) => ({ itemType: 'assessment-complete', answer: { reflections, submittedAt: timestamp }, timestamp });
function result(responses, roster = { learner: { displayName: 'Learner' } }) {
  return aggregateReflections({ allResponses: responses }, content, roster);
}

describe('final assessment reflections are the authoritative teacher summary', () => {
  it('shows the revised draft when an individually submitted reflection was reopened', () => {
    const summary = result({ learner: {
      r0: legacy('Original thought'),
      1: complete({ 0: { submitted: false, submittedText: 'Original thought', draft: 'Revised thought' } }),
    } });
    expect(summary.buckets[0].responses).toEqual([{ uid: 'learner', displayName: 'Learner', text: 'Revised thought', timestamp: 20 }]);
  });

  it('includes final drafts that were never submitted individually', () => {
    const summary = result({ learner: { 1: complete({ 1: { draft: 'Try a diagram' } }) } });
    expect(summary.buckets[0].responses).toEqual([]);
    expect(summary.buckets[1].responses[0].text).toBe('Try a diagram');
  });

  it('prefers explicitly submitted text until the reflection is reopened', () => {
    const summary = result({ learner: { 1: complete({ 0: { submitted: true, submittedText: 'Confirmed thought', draft: 'Earlier draft' } }) } });
    expect(summary.buckets[0].responses[0].text).toBe('Confirmed thought');
  });

  it.each([
    { 0: { submitted: false, submittedText: 'Original thought', draft: '' } },
    {},
  ])('does not resurrect cleared or missing final entries: %j', finalMap => {
    expect(result({ learner: { r0: legacy('Original thought'), r1: legacy('Original plan'), 1: complete(finalMap) } })).toBeNull();
  });

  it('keeps legacy submittedText-only entries in a final map', () => {
    const summary = result({ learner: { 1: complete({ 0: { submittedText: 'Legacy final thought' } }) } });
    expect(summary.buckets[0].responses[0].text).toBe('Legacy final thought');
  });

  it.each([undefined, null, []])('retains individual submissions when a final reflection map is unavailable: %j', finalMap => {
    const summary = result({ learner: { r0: legacy('Individual thought'), 1: complete(finalMap) } });
    expect(summary.buckets[0].responses[0]).toMatchObject({ text: 'Individual thought', timestamp: 10 });
  });

  it('retains live reflection submissions before final submission', () => {
    const summary = result({ learner: { r0: legacy('Still working') } });
    expect(summary.buckets[0].responses[0].text).toBe('Still working');
  });

  it('does not reuse an older final map when the newest completion has no map', () => {
    const summary = result({ learner: {
      r0: legacy('Latest individual thought'),
      1: complete({ 0: { draft: 'Old completed thought' } }, 20),
      2: complete(undefined, 30),
    } });
    expect(summary.buckets[0].responses[0].text).toBe('Latest individual thought');
  });

  it('selects the latest completion and keeps final and legacy students sorted without duplicates', () => {
    const summary = result({
      z: { r0: legacy('Old Z'), 1: complete({ 0: { draft: 'Latest Z' } }, 40), 2: complete({ 0: { draft: 'Older Z' } }, 30) },
      a: { r0: legacy('Live A') },
    }, { z: { displayName: 'Zoe' }, a: { displayName: 'Ada' } });
    expect(summary.buckets[0].responses.map(({ text }) => text)).toEqual(['Live A', 'Latest Z']);
    expect(summary.totalStudents).toBe(2);
  });
});
