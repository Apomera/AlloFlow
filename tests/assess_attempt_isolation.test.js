import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
let live, aggs;
beforeAll(() => {
  loadAlloModule('live_polling_module.js');
  loadAlloModule('quiz_live_aggregators.js');
  live = window.AlloModules.LivePolling;
  aggs = window.AlloModules.QuizLiveAggregators;
});
const question = { type: 'mcq', question: 'Choose A.', options: ['A', 'B'], correctAnswer: 'A' };
function packet(id, start, values = {}) {
  return { itemType: 'mcq', answer: { optionIdx: 0, optionText: 'A' }, submitted: true,
    assessmentAttemptId: id, assessmentAttemptStartedAt: start, assessmentActivityId: 'activity',
    timestamp: start + 1, questionSignature: aggs.assessmentItemSignature(question), ...values };
}
function merge(state, index, response) {
  const result = live.mergeAssessmentResponse(state, index, response);
  expect(result.accepted).toBe(true);
  return result.responses;
}
function finished() {
  let state = merge({}, 0, packet('first', 100));
  state = merge(state, 1, packet('first', 100));
  return merge(state, 2, packet('first', 100, { itemType: 'assessment-complete', assessmentFinal: true,
    answer: { attemptId: 'first', reflections: { 0: { draft: 'Old reflection' } } } }));
}
describe('live Assess attempts remain isolated', () => {
  it('restarts with no previous answers, completion, or reflections and preserves prior history', () => {
    const prior = finished();
    const state = merge(prior, 2, packet('second', 200, { itemType: 'assessment-start', answer: null, submitted: false }));
    expect(state[0]).toBeUndefined(); expect(state[1]).toBeUndefined();
    expect(state.__assessmentAttempt).toEqual({ attemptId: 'second', startedAt: 200, status: 'in-progress' });
    expect(state.__assessmentHistory[0].responses[0].answer.optionText).toBe('A');
    expect(prior[2].itemType).toBe('assessment-complete');
    const content = { data: { questions: [question, question], reflections: ['Reflect.'] } };
    const quiz = { allResponses: { learner: state } };
    expect(aggs.aggregateGradebook(quiz, content, { learner: {} }).studentRows[0]).toMatchObject({ totalAnswered: 0, totalPossible: 0, attemptStatus: 'in-progress' });
    expect(aggs.aggregateReflections(quiz, content, {})).toBeNull();
  });
  it('also separates a new attempt when its first answer arrives before its start marker', () => {
    const state = merge(finished(), 0, packet('second', 200, { answer: { optionIdx: 1, optionText: 'B' } }));
    expect(state[1]).toBeUndefined(); expect(state[2]).toBeUndefined();
    const row = aggs.aggregateGradebook({ allResponses: { learner: state } }, { data: { questions: [question, question] } }, {}).studentRows[0];
    expect(row).toMatchObject({ totalAnswered: 1, totalPossible: 1, scorePercent: 0, attemptStatus: 'in-progress' });
  });
  it.each([
    () => packet('first', 100),
    () => packet('first', 100, { itemType: 'assessment-complete', assessmentFinal: true }),
    () => ({ itemType: 'mcq', answer: { optionIdx: 0 } }),
    () => packet('second', 199),
    () => packet('third', 200),
  ])('rejects an older, unsigned, or inconsistent packet after a new attempt starts', makePacket => {
    const state = merge(finished(), 0, packet('second', 200));
    const result = live.mergeAssessmentResponse(state, 0, makePacket());
    expect(result).toEqual({ accepted: false, responses: state });
  });
  it('rejects an out-of-order response in the same attempt', () => {
    const state = merge({}, 0, packet('first', 100, { timestamp: 120 }));
    expect(live.mergeAssessmentResponse(state, 0, packet('first', 100, { timestamp: 110 })).accepted).toBe(false);
  });
  it('accepts the saved final answer after a later-timestamp practice packet', () => {
    const practice = merge({}, 0, packet('first', 100, { timestamp: 200, answer: { optionIdx: 1, optionText: 'B' } }));
    const state = merge(practice, 0, packet('first', 100, { timestamp: 150, assessmentFinal: true }));
    expect(state[0]).toMatchObject({ assessmentFinal: true, timestamp: 150, answer: { optionIdx: 0, optionText: 'A' } });
    expect(state.__assessmentAttempt.status).toBe('in-progress');
  });
  it('protects each acknowledged final answer before the completion marker arrives', () => {
    const final = merge({}, 0, packet('first', 100, { timestamp: 150, assessmentFinal: true }));
    const late = live.mergeAssessmentResponse(final, 0, packet('first', 100, { timestamp: 200, answer: { optionIdx: 1, optionText: 'B' } }));
    expect(late).toEqual({ accepted: false, responses: final });
    const completed = merge(late.responses, 1, packet('first', 100, { timestamp: 150, itemType: 'assessment-complete', assessmentFinal: true }));
    const row = aggs.aggregateGradebook({ allResponses: { learner: completed } }, { data: { questions: [question] } }, {}).studentRows[0];
    expect(row).toMatchObject({ attemptStatus: 'submitted', totalEarned: 1, totalPossible: 1 });
    expect(completed[0].answer.optionText).toBe('A');
  });
  it('keeps timestamp ordering between two final packets and accepts an identical retry', () => {
    const final = packet('first', 100, { timestamp: 150, assessmentFinal: true });
    const state = merge({}, 0, final);
    expect(live.mergeAssessmentResponse(state, 0, { ...final, timestamp: 140, answer: { optionIdx: 1 } }).accepted).toBe(false);
    expect(merge(state, 0, { ...final })[0]).toEqual(final);
    expect(merge(state, 0, { ...final, timestamp: 160 })[0].timestamp).toBe(160);
  });
  it('does not reopen a completed attempt from repeated start announcements or late practice answers', () => {
    const state = finished();
    expect(merge(state, 2, packet('first', 100, { itemType: 'assessment-start' }))).toBe(state);
    expect(live.mergeAssessmentResponse(state, 0, packet('first', 100, { timestamp: 200 })).accepted).toBe(false);
    expect(merge(state, 0, packet('first', 100, { assessmentFinal: true })).__assessmentAttempt.status).toBe('submitted');
  });
  it('keeps legacy practice working until a versioned attempt claims the response bank', () => {
    const legacy = { itemType: 'mcq', answer: { optionIdx: 1 } };
    const old = merge({}, 0, legacy);
    expect(old[0]).toBe(legacy);
    const state = merge(old, 1, packet('new', 100));
    expect(state[0]).toBeUndefined(); expect(state.__assessmentHistory[0].status).toBe('legacy');
  });
  it('bounds in-memory previous-attempt history', () => {
    let state = {};
    for (let i = 1; i <= 14; i++) state = merge(state, 0, packet('attempt-' + i, i));
    expect(state.__assessmentHistory).toHaveLength(8);
    expect(state.__assessmentHistory.at(-1).attemptId).toBe('attempt-13');
  });
  it('teacher acknowledgements reject retired attempts through the real peer consumer', async () => {
    let state = merge(finished(), 0, packet('second', 200));
    const host = live.createHost({ sessionCode: 'ROOM', signalingPath: 'quiz-signaling', acceptResponse: () => true,
      onResponse: (_, __, payload) => { const result = live.mergeAssessmentResponse(state, payload.pollId, payload.response); state = result.responses; return result.accepted; } });
    const guest = live.createGuest({ sessionCode: 'ROOM', userUid: 'u', signalingPath: 'quiz-signaling' });
    host.peers.set('u', { dc: { readyState: 'open', send: data => guest._receiveConfirmedResponseReceipt(JSON.parse(data).payload) } });
    guest.dc = { readyState: 'open', send: data => host._receiveConfirmedResponse('u', 'Learner', JSON.parse(data).payload) };
    expect(await guest.sendConfirmedResponse(1, packet('first', 100, { assessmentFinal: true }), 'old-q1')).toEqual({ status: 'rejected' });
    expect(await guest.sendConfirmedResponse(1, packet('second', 200, { assessmentFinal: true }), 'new-q1')).toEqual({ status: 'received' });
    expect(state[1].assessmentAttemptId).toBe('second');
  });
  it('host integration does not merge legacy fallback answers into a current attempt', () => {
    const source = readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(source).toContain('LP.mergeAssessmentResponse(prior[uid], questionIndex, payload.response)');
    expect(source).toContain('liveQuizAnswers[uid].__assessmentAttempt ? liveQuizAnswers[uid]');
    expect(source).toContain('if (!merged.accepted) return false;');
  });
});
