import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const pollingSource = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');
const lessonSource = readFileSync(resolve(process.cwd(), 'view_live_lesson_run_source.jsx'), 'utf8');

let LivePolling;
beforeAll(() => {
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
  if (!LivePolling) throw new Error('LivePolling failed to register');
});

function makeRound() {
  return LivePolling.buildPeerShowcaseRound({
    roundId: 'showcase-1',
    pollId: 'poll-1',
    prompt: 'Explain the evidence.',
    criterion: 'Strongest use of evidence',
    candidates: [
      { ownerUid: 'u1', response: 'The first response uses evidence A.' },
      { ownerUid: 'u2', response: 'The second response connects A to the claim.' },
      { ownerUid: 'u3', response: 'The third response explains the relationship.' },
    ],
    openedAt: 100,
  });
}

describe('moderated peer showcase helpers', () => {
  it('keeps the latest teacher-private response row and bounds showcase text', () => {
    const rows = LivePolling.buildPeerShowcaseReviewRows([
      { uid: 'u1', codename: 'Blue Fox', response: 'First draft' },
      { uid: 'u1', codename: 'Blue Fox', response: 'x'.repeat(2000) },
      { uid: 'u2', codename: 'Quiet Star', response: 'Second response' },
    ], { u1: 'approved', u2: 'hidden' });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.uid === 'u1')).toMatchObject({
      codename: 'Blue Fox',
      status: 'approved',
    });
    expect(rows.find((row) => row.uid === 'u1').response)
      .toHaveLength(LivePolling.PEER_SHOWCASE_RESPONSE_MAX_LENGTH);
    expect(rows.find((row) => row.uid === 'u2').status).toBe('hidden');
  });

  it('requires 2 candidates, caps at 8, and strips owner identity from student payloads', () => {
    expect(LivePolling.buildPeerShowcaseRound({
      pollId: 'poll-1',
      candidates: [{ ownerUid: 'u1', response: 'Only one' }],
    })).toBeNull();

    const round = LivePolling.buildPeerShowcaseRound({
      roundId: 'showcase-many',
      pollId: 'poll-1',
      candidates: Array.from({ length: 12 }, (_, index) => ({
        ownerUid: `private-${index}`,
        response: `Response ${index}`,
        codename: `Name ${index}`,
      })),
    });
    expect(round.candidates).toHaveLength(LivePolling.PEER_SHOWCASE_MAX_CANDIDATES);

    const studentPayload = LivePolling.sanitizePeerShowcaseRound(round, 'private-0');
    expect(studentPayload.candidates[0].own).toBe(true);
    expect(studentPayload.candidates[1].own).toBe(false);
    const serialized = JSON.stringify(studentPayload);
    expect(serialized).not.toContain('private-0');
    expect(serialized).not.toContain('Name 0');
    expect(serialized).not.toContain('ownerUid');
  });

  it('rejects self-votes and replaces a prior vote when a student changes selection', () => {
    const round = makeRound();
    expect(LivePolling.normalizePeerVote({
      roundId: round.roundId,
      candidateId: 'candidate-1',
    }, round, 'u1')).toBeNull();

    const first = LivePolling.normalizePeerVote({
      roundId: round.roundId,
      candidateId: 'candidate-2',
      timestamp: 10,
    }, round, 'u1');
    const changed = LivePolling.normalizePeerVote({
      roundId: round.roundId,
      candidateId: 'candidate-3',
      timestamp: 20,
    }, round, 'u1');
    let votes = LivePolling.upsertPeerVote({}, 'u1', first);
    votes = LivePolling.upsertPeerVote(votes, 'u1', changed);

    expect(Object.keys(votes)).toEqual(['u1']);
    expect(votes.u1).toMatchObject({ candidateId: 'candidate-3', timestamp: 20 });
  });

  it('publishes aggregate results without voter or author identity', () => {
    const round = makeRound();
    const results = LivePolling.buildPeerVoteResults(round, {
      u1: { roundId: round.roundId, candidateId: 'candidate-2' },
      u2: { roundId: round.roundId, candidateId: 'candidate-1' },
      u3: { roundId: round.roundId, candidateId: 'candidate-1' },
      outsider: { roundId: 'stale-round', candidateId: 'candidate-1' },
    });

    expect(results.votesCast).toBe(3);
    expect(results.candidates.find((candidate) => candidate.candidateId === 'candidate-1'))
      .toMatchObject({ count: 2, percent: 67 });
    const serialized = JSON.stringify(results);
    expect(serialized).not.toContain('u1');
    expect(serialized).not.toContain('ownerUid');
    expect(serialized).not.toContain('codename');
  });
});

describe('peer showcase reuses the polling RTC star', () => {
  it('sends personalized self-vote guards only to the active poll audience', () => {
    const host = LivePolling.createHost({ sessionCode: 'ROOM' });
    const received = { u1: [], u2: [], outside: [] };
    Object.keys(received).forEach((uid) => {
      host.peers.set(uid, {
        dc: { readyState: 'open', send: (message) => received[uid].push(JSON.parse(message)) },
      });
    });
    host.broadcastPoll({ id: 'poll-1', type: 'freetext', prompt: 'Explain.' }, ['u1', 'u2']);
    Object.values(received).forEach((messages) => messages.splice(0));

    const opened = host.openPeerShowcase(makeRound(), ['u1', 'u2', 'outside']);
    expect(opened).toBeTruthy();
    expect(received.outside).toEqual([]);

    const forU1 = received.u1.find((message) => message.type === 'peerShowcase');
    const forU2 = received.u2.find((message) => message.type === 'peerShowcase');
    expect(forU1.payload.candidates.find((candidate) => candidate.candidateId === 'candidate-1').own).toBe(true);
    expect(forU2.payload.candidates.find((candidate) => candidate.candidateId === 'candidate-2').own).toBe(true);
    expect(JSON.stringify(forU1)).not.toContain('ownerUid');
    expect(JSON.stringify(forU1)).not.toContain('u1');
  });

  it('reveals only aggregate results and closes with the existing host lifecycle', () => {
    const host = LivePolling.createHost({ sessionCode: 'ROOM' });
    const received = [];
    host.peers.set('u1', {
      dc: { readyState: 'open', send: (message) => received.push(JSON.parse(message)) },
    });
    host.broadcastPoll({ id: 'poll-1', type: 'freetext', prompt: 'Explain.' }, ['u1']);
    host.openPeerShowcase(makeRound(), ['u1']);
    const results = host.broadcastPeerVoteResults('showcase-1', {
      u1: { roundId: 'showcase-1', candidateId: 'candidate-2' },
    });
    expect(results.votesCast).toBe(1);
    expect(received.at(-1)).toMatchObject({
      type: 'peerVoteResults',
      payload: { roundId: 'showcase-1', votesCast: 1 },
    });

    host.closePoll('poll-1');
    expect(host.activePeerShowcase).toBeNull();
    expect(received.some((message) => message.type === 'peerShowcaseClose')).toBe(true);
  });

  it('uses one bounded peerVote message for initial and changed votes', () => {
    const sent = [];
    const guest = LivePolling.createGuest({
      sessionCode: 'ROOM',
      userUid: 'u1',
      codename: 'Blue Fox',
    });
    guest.dc = { readyState: 'open', send: (message) => sent.push(JSON.parse(message)) };

    expect(guest.sendPeerVote('r'.repeat(200), 'c'.repeat(100))).toBe(true);
    expect(sent[0].type).toBe('peerVote');
    expect(sent[0].payload.roundId).toHaveLength(120);
    expect(sent[0].payload.candidateId).toHaveLength(64);
    expect(JSON.stringify(sent[0])).not.toContain('Blue Fox');
  });
});

describe('peer showcase UI and coordination seams', () => {
  it('adds moderation, criterion-driven voting, hidden live totals, and existing follow-up handlers', () => {
    expect(pollingSource).toContain("tr('Peer showcase moderation')");
    expect(pollingSource).toContain("tr('Open anonymous peer vote')");
    expect(pollingSource).toContain("tr('votes received. Candidate totals stay hidden until you close voting.')");
    expect(pollingSource).toContain('onSendToStudent(internal.ownerUid, followUpResourceId)');
    expect(pollingSource).toContain('onSendToGroup(ownerGroupId, followUpResourceId)');
  });

  it('keeps peer response/vote traffic off the session-document write path', () => {
    const start = pollingSource.indexOf('openPeerShowcase(round, audienceUids)');
    const end = pollingSource.indexOf('sendFeedback(uid, pollId, packet)', start);
    const protocolBlock = pollingSource.slice(start, end);
    expect(protocolBlock).toContain("type: 'peerShowcase'");
    expect(protocolBlock).toContain("type: 'peerVoteResults'");
    expect(protocolBlock).not.toContain('sessionDocRef');
    expect(protocolBlock).not.toContain('__alloWriteToSession');
  });

  it('allows only aggregate showcase/vote counts into Activity Pulse', () => {
    expect(lessonSource).toContain("'showcased', 'votesCast'");
    expect(pollingSource).toContain('showcased: peerShowcaseRound');
    expect(pollingSource).toContain('votesCast: peerShowcaseRound');
  });
});
