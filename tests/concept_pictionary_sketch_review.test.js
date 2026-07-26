import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const source = readFileSync(resolve(process.cwd(), 'concept_pictionary_source.jsx'), 'utf8');
const protocol = readFileSync(resolve(process.cwd(), 'docs/LIVE_SESSION_PROTOCOL.md'), 'utf8');

let api;
beforeAll(() => {
  window.React = window.React || {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useContext: () => null,
    memo: (component) => component,
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('concept_pictionary_module.js');
  api = window.AlloModules.ConceptPictionary;
  if (!api) throw new Error('ConceptPictionary failed to register');
});

const stroke = (strokeId, uid) => ({
  uid,
  strokeId,
  color: '#2b6cb0',
  points: [[10, 10], [20, 20]],
});

describe('Sketch Review pure contracts', () => {
  it('bounds criterion and feedback while enforcing one formal revision', () => {
    expect(api.normalizeSketchCriterion('  clear   labels  ')).toBe('clear labels');
    expect(api.normalizeSketchFeedback({
      text: 'x'.repeat(900),
      criterion: 'Readable model',
      allowRevision: true,
      attempt: 1,
    })).toMatchObject({
      text: 'x'.repeat(800),
      criterion: 'Readable model',
      allowRevision: true,
      attempt: 1,
    });
    expect(api.normalizeSketchFeedback({
      text: 'Final note',
      allowRevision: true,
      attempt: 2,
    })).toMatchObject({
      text: 'Final note',
      allowRevision: false,
      attempt: 2,
    });
  });

  it('freezes bounded anonymous candidates and exposes only a local self-vote flag', () => {
    const round = api.buildSketchVoteRound(
      ['u1', 'u2'],
      { u1: [stroke('a', 'u1')], u2: [stroke('b', 'u2')] },
      'Draw the system',
      'Accurate relationships',
    );
    expect(round.candidates).toHaveLength(2);
    expect(round.candidates[0]).toHaveProperty('ownerUid');

    const forU1 = api.sanitizeSketchVoteRound(round, 'u1');
    expect(forU1.candidates).toHaveLength(2);
    expect(forU1.candidates.filter((candidate) => candidate.own)).toHaveLength(1);
    expect(JSON.stringify(forU1)).not.toContain('ownerUid');
    expect(JSON.stringify(forU1)).not.toContain('"uid"');
  });

  it('rejects self-votes, allows vote updates, and reveals aggregate totals only', () => {
    const round = api.buildSketchVoteRound(
      ['u1', 'u2'],
      { u1: [stroke('a', 'u1')], u2: [stroke('b', 'u2')] },
      'Draw the system',
      'Accurate relationships',
    );
    const own = round.candidates.find((candidate) => candidate.ownerUid === 'u1');
    const other = round.candidates.find((candidate) => candidate.ownerUid === 'u2');
    expect(api.normalizeSketchVote(round, 'u1', own.candidateId)).toBeNull();

    const first = api.normalizeSketchVote(round, 'u1', other.candidateId);
    const votes = api.upsertSketchVote({}, first);
    const results = api.buildSketchVoteResults(round, votes);
    expect(results.votesCast).toBe(1);
    expect(results.candidates.find((candidate) => candidate.candidateId === other.candidateId)).toMatchObject({
      count: 1,
      percent: 100,
    });
    expect(JSON.stringify(results)).not.toContain('ownerUid');
    expect(JSON.stringify(results)).not.toContain('"uid"');
  });

  it('caps frozen showcase payloads independently of the private teacher gallery', () => {
    const many = Array.from({ length: 200 }, (_, index) => ({
      strokeId: 's' + index,
      color: '#1a202c',
      points: Array.from({ length: 20 }, (__, pointIndex) => [pointIndex, pointIndex]),
    }));
    const bounded = api.sanitizeSketchShowcaseStrokes(many);
    expect(bounded.length).toBeLessThanOrEqual(120);
    expect(bounded.reduce((sum, entry) => sum + entry.points.length, 0)).toBeLessThanOrEqual(1200);
  });
});

describe('Sketch Review P2P host and guest protocol', () => {
  it('sends private feedback directly, keeps attempts monotonic, and runs anonymous voting', () => {
    const u1Messages = [];
    const u2Messages = [];
    const voteEvents = [];
    const host = new api.PictionaryHost({
      sessionCode: 'REVIEW',
      onSketchVote: (uid, payload) => voteEvents.push({ uid, payload }),
    });
    host.peers.set('u1', { dc: { readyState: 'open', send: (raw) => u1Messages.push(JSON.parse(raw)) } });
    host.peers.set('u2', { dc: { readyState: 'open', send: (raw) => u2Messages.push(JSON.parse(raw)) } });

    host.startRound({
      mode: 'sketch',
      concept: 'Draw the system',
      criterion: 'Accurate relationships',
      drawerUids: ['u1', 'u2'],
    });
    host._onIncomingStroke('u1', 'Blue Fox', stroke('u1-a'));
    host._onIncomingStroke('u2', 'Quiet Star', stroke('u2-a'));

    u1Messages.length = 0;
    u2Messages.length = 0;
    const feedback = host.sendSketchFeedback('u1', {
      text: 'Strong arrows. Label the energy source.',
      criterion: 'Accurate relationships',
      allowRevision: true,
      attempt: 1,
    });
    expect(feedback.allowRevision).toBe(true);
    expect(u1Messages.at(-1)).toMatchObject({ type: 'sketchFeedback', payload: feedback });
    expect(u2Messages.some((message) => message.type === 'sketchFeedback')).toBe(false);

    host._onIncomingSketchStatus('u1', 'Blue Fox', { status: 'editing', attempt: 2 });
    expect(host.sketchFeedbackByUid.get('u1')).toMatchObject({ attempt: 2, allowRevision: false });

    host.resolveRound({ reason: 'manual' });
    u1Messages.length = 0;
    u2Messages.length = 0;
    const round = host.startSketchVote(['u1', 'u2']);
    expect(round).toBeTruthy();

    const u1Round = u1Messages.find((message) => message.type === 'sketchVoteRound').payload;
    const u2Round = u2Messages.find((message) => message.type === 'sketchVoteRound').payload;
    expect(JSON.stringify(u1Round)).not.toContain('ownerUid');
    const u1Own = u1Round.candidates.find((candidate) => candidate.own);
    const u1Other = u1Round.candidates.find((candidate) => !candidate.own);
    const u2Other = u2Round.candidates.find((candidate) => !candidate.own);

    host._onIncomingSketchVote('u1', { roundId: round.roundId, candidateId: u1Own.candidateId });
    expect(voteEvents).toHaveLength(0);
    host._onIncomingSketchVote('u1', { roundId: round.roundId, candidateId: u1Other.candidateId });
    host._onIncomingSketchVote('u2', { roundId: round.roundId, candidateId: u2Other.candidateId });
    expect(voteEvents).toHaveLength(2);

    const results = host.closeSketchVote();
    expect(results.votesCast).toBe(2);
    expect(JSON.stringify(results)).not.toContain('ownerUid');
    expect(u1Messages.at(-1)).toMatchObject({ type: 'sketchVoteResults', payload: results });
  });

  it('sends revision attempts and votes over the existing ordered data channel', () => {
    const guest = new api.PictionaryGuest({
      sessionCode: 'REVIEW',
      userUid: 'u1',
      codename: 'Blue Fox',
    });
    const sent = [];
    guest.dc = { readyState: 'open', send: (raw) => sent.push(JSON.parse(raw)) };

    expect(guest.sendSketchStatus('submitted', 2)).toBe(true);
    expect(guest.sendSketchVote('round-1', 'candidate-2')).toBe(true);
    expect(sent).toEqual([
      expect.objectContaining({ type: 'sketchStatus', payload: expect.objectContaining({ status: 'submitted', attempt: 2 }) }),
      expect.objectContaining({ type: 'sketchVote', payload: expect.objectContaining({ roundId: 'round-1', candidateId: 'candidate-2' }) }),
    ]);
  });
});

describe('Sketch Review teacher/student UX and privacy documentation', () => {
  it('adds criteria, private feedback, one revision, and anonymous vote controls', () => {
    expect(source).toContain('Sketch response success criterion');
    expect(source).toContain('Send + allow one revision');
    expect(source).toContain('Revise with feedback');
    expect(source).toContain('Start anonymous sketch vote');
    expect(source).toContain('You cannot vote for your own sketch.');
  });

  it('keeps AI assistance text-only and reuses targeted resource delivery', () => {
    expect(source).toContain("AI polish is text-only");
    expect(source).toContain("AI polish is text-only: it receives the teacher's observation note");
    expect(source).toContain("'TEACHER OBSERVATION: ' + JSON.stringify(note");
    expect(source).not.toContain('callGemini(sketchStrokesByUid');
    expect(protocol).toContain('never the sketch bitmap, strokes, uid, or codename');
    expect(source).toContain('onSendToStudent(participant.uid, followUpResourceId)');
    expect(source).toContain('onSendToGroup(groupId, followUpResourceId)');
  });

  it('publishes only existing aggregate Activity Pulse fields and documents no persistence', () => {
    expect(source).toContain('feedbackSent: Object.keys(sketchFeedbackByUid).length');
    expect(source).toContain('showcased: sketchShowcaseRound');
    expect(source).toContain('votesCast: sketchShowcaseResults');
    expect(protocol).toContain('**Sketch Review Cycle** [SHIPPED 2026-07-25]');
    expect(protocol).toContain('Raw strokes, feedback, votes, and author mappings stay');
  });
});
