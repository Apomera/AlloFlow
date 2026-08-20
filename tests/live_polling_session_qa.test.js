import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const pollingSource = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');

let LivePolling;
beforeAll(() => {
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
  if (!LivePolling) throw new Error('LivePolling failed to register');
});

function addQuestion(state, ownerUid, codename, text, clientQuestionId, now, token) {
  return LivePolling.submitSessionQaQuestion(state, {
    ownerUid,
    codename,
    text,
    clientQuestionId,
  }, now, token);
}

describe('session-wide moderated Q&A reducers', () => {
  it('bounds, deduplicates, locks, and limits host-memory questions', () => {
    let state = LivePolling.createSessionQaState({ enabled: true });
    state = addQuestion(
      state,
      'private-author',
      'C'.repeat(100),
      `  ${'x'.repeat(700)}  `,
      'client-1',
      100,
      'first',
    );

    expect(state.questions).toHaveLength(1);
    expect(state.questions[0]).toMatchObject({
      ownerUid: 'private-author',
      status: 'held',
      clientQuestionId: 'client-1',
      createdAt: 100,
    });
    expect(state.questions[0].text).toHaveLength(LivePolling.SESSION_QA_QUESTION_MAX_LENGTH);
    expect(state.questions[0].codename).toHaveLength(64);

    const duplicate = addQuestion(
      state,
      'private-author',
      'Different name',
      'Duplicate retry',
      'client-1',
      101,
      'retry',
    );
    expect(duplicate).toBe(state);

    const locked = { ...state, submissionsLocked: true };
    expect(addQuestion(locked, 'u2', 'Student', 'Blocked', 'client-2', 102, 'locked')).toBe(locked);

    let capped = LivePolling.createSessionQaState({ enabled: true });
    for (let index = 0; index < LivePolling.SESSION_QA_MAX_PER_AUTHOR + 3; index += 1) {
      capped = addQuestion(
        capped,
        'same-author',
        'Student',
        `Question ${index}`,
        `client-${index}`,
        200 + index,
        `token${index}`,
      );
    }
    expect(capped.questions).toHaveLength(LivePolling.SESSION_QA_MAX_PER_AUTHOR);
  });

  it('supports hold, approve, dismiss, archive, restore, and feature clearing', () => {
    let state = LivePolling.createSessionQaState({ enabled: true });
    state = addQuestion(state, 'u1', 'Blue Fox', 'Why does this happen?', 'c1', 100, 'one');
    const questionId = state.questions[0].questionId;

    state = LivePolling.moderateSessionQaQuestion(state, questionId, 'approve', 200);
    expect(state.questions[0].status).toBe('approved');

    state = { ...state, featuredQuestionId: questionId };
    state = LivePolling.moderateSessionQaQuestion(state, questionId, 'archive', 300);
    expect(state.questions[0]).toMatchObject({ status: 'archived', archivedFrom: 'approved' });
    expect(state.featuredQuestionId).toBeNull();

    state = LivePolling.moderateSessionQaQuestion(state, questionId, 'restore', 400);
    expect(state.questions[0]).toMatchObject({ status: 'approved', archivedFrom: null });

    state = LivePolling.moderateSessionQaQuestion(state, questionId, 'dismiss', 500);
    expect(state.questions[0].status).toBe('dismissed');
    state = LivePolling.moderateSessionQaQuestion(state, questionId, 'hold', 600);
    expect(state.questions[0].status).toBe('held');
  });

  it('shares approved questions anonymously and only returns private status to the author', () => {
    let state = LivePolling.createSessionQaState({ enabled: true });
    state = addQuestion(state, 'private-author-one', 'Blue Falcon', 'Approved question', 'c1', 100, 'one');
    state = addQuestion(state, 'private-author-two', 'Quiet Star', 'Held question', 'c2', 200, 'two');
    const approvedId = state.questions[0].questionId;
    state = LivePolling.moderateSessionQaQuestion(state, approvedId, 'approve', 300);
    state = LivePolling.setSessionQaUpvote(state, approvedId, 'private-voter', true, 400);
    state = LivePolling.setSessionQaUpvote(state, approvedId, 'private-author-one', true, 450);
    state = { ...state, featuredQuestionId: approvedId, updatedAt: 500 };

    const authorPacket = LivePolling.sanitizeSessionQaState(state, 'private-author-two');
    expect(authorPacket.questions).toHaveLength(2);
    expect(authorPacket.questions.find((question) => question.text === 'Held question'))
      .toMatchObject({ own: true, status: 'held', upvoteCount: 0 });
    expect(authorPacket.questions.find((question) => question.text === 'Approved question'))
      .toMatchObject({ own: false, status: 'approved', upvoteCount: 1, featured: true });

    const outsiderPacket = LivePolling.sanitizeSessionQaState(state, 'outside-viewer');
    expect(outsiderPacket.questions).toHaveLength(1);
    expect(Object.keys(outsiderPacket.featuredQuestion)).toEqual([
      'questionId',
      'text',
      'upvoteCount',
      'featuredAt',
    ]);
    const serialized = JSON.stringify(outsiderPacket);
    expect(serialized).not.toContain('private-author-one');
    expect(serialized).not.toContain('private-author-two');
    expect(serialized).not.toContain('private-voter');
    expect(serialized).not.toContain('Blue Falcon');
    expect(serialized).not.toContain('Quiet Star');
    expect(serialized).not.toContain('ownerUid');
    expect(serialized).not.toContain('codename');
    expect(serialized).not.toContain('upvotesByQuestion');
  });

  it('publishes only aggregate Q&A participation and moderation metadata', () => {
    let state = LivePolling.createSessionQaState({ enabled: true });
    state = addQuestion(state, 'author-one', 'Secret Fox', 'Private first question', 'c1', 100, 'one');
    state = addQuestion(state, 'author-two', 'Secret Owl', 'Private second question', 'c2', 200, 'two');
    const firstId = state.questions[0].questionId;
    const secondId = state.questions[1].questionId;
    state = LivePolling.moderateSessionQaQuestion(state, firstId, 'approve', 300);
    state = LivePolling.moderateSessionQaQuestion(state, secondId, 'dismiss', 350);
    state = LivePolling.setSessionQaUpvote(state, firstId, 'private-voter', true, 400);
    state = { ...state, submissionsLocked: true, featuredQuestionId: firstId, updatedAt: 500 };

    const snapshot = LivePolling.buildSessionQaActivitySnapshot(
      state,
      [{ uid: 'author-one' }, { uid: 'private-voter' }],
      'ROOM',
    );
    expect(snapshot).toMatchObject({
      activityId: 'session-qa-ROOM',
      family: 'polling',
      kind: 'session_qa',
      phase: 'paused',
      audienceUids: ['author-one', 'author-two'],
      participantStatus: { 'author-one': 'submitted', 'author-two': 'submitted' },
      counts: { connected: 1, approved: 1, hidden: 1, revealed: 1, votesCast: 1 },
      startedAt: 100,
      updatedAt: 500,
    });
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('Private first question');
    expect(serialized).not.toContain('Private second question');
    expect(serialized).not.toContain('Secret Fox');
    expect(serialized).not.toContain('Secret Owl');
    expect(serialized).not.toContain('private-voter');
    expect(serialized).not.toContain('questionId');
    expect(serialized).not.toContain('upvotesByQuestion');
  });

  it('rejects self-upvotes and sorts deterministically by latest or top-voted', () => {
    let state = LivePolling.createSessionQaState({ enabled: true });
    state = addQuestion(state, 'u1', 'A', 'Older top question', 'c1', 100, 'one');
    state = addQuestion(state, 'u2', 'B', 'Newer question', 'c2', 200, 'two');
    const firstId = state.questions[0].questionId;
    const secondId = state.questions[1].questionId;
    state = LivePolling.moderateSessionQaQuestion(state, firstId, 'approve', 300);
    state = LivePolling.moderateSessionQaQuestion(state, secondId, 'approve', 301);

    const beforeSelfVote = state;
    state = LivePolling.setSessionQaUpvote(state, firstId, 'u1', true, 400);
    expect(state).toBe(beforeSelfVote);
    state = LivePolling.setSessionQaUpvote(state, firstId, 'voter-a', true, 401);
    state = LivePolling.setSessionQaUpvote(state, firstId, 'voter-b', true, 402);

    const packet = LivePolling.sanitizeSessionQaState(state, 'viewer');
    expect(LivePolling.sortSessionQaQuestions(packet.questions, 'latest')[0].questionId).toBe(secondId);
    expect(LivePolling.sortSessionQaQuestions(packet.questions, 'top')[0].questionId).toBe(firstId);

    const removed = LivePolling.setSessionQaUpvote(state, firstId, 'voter-a', false, 500);
    expect(LivePolling.getSessionQaUpvoteCount(removed.upvotesByQuestion, firstId)).toBe(1);
  });

  it('allowlists untrusted guest state and featured packets', () => {
    const packet = LivePolling.sanitizeSessionQaGuestPacket({
      enabled: true,
      submissionsLocked: true,
      questions: [
        {
          questionId: 'approved-1',
          text: 'Public',
          status: 'approved',
          ownerUid: 'leak-owner',
          codename: 'Leak Name',
          upvoteCount: 4,
          upvotesByUid: { leakVoter: true },
        },
        { questionId: 'held-other', text: 'Not mine', status: 'held', own: false },
        { questionId: 'held-own', text: 'Mine', status: 'held', own: true },
      ],
      featuredQuestion: {
        questionId: 'approved-1',
        text: 'Public',
        upvoteCount: 4,
        featuredAt: 900,
        ownerUid: 'leak-owner',
      },
      ownerUid: 'root-leak',
    });

    expect(packet.questions.map((question) => question.questionId)).toEqual(['approved-1', 'held-own']);
    expect(JSON.stringify(packet)).not.toContain('leak-owner');
    expect(JSON.stringify(packet)).not.toContain('Leak Name');
    expect(JSON.stringify(packet)).not.toContain('leakVoter');
    expect(packet.featuredQuestion).toEqual({
      questionId: 'approved-1',
      text: 'Public',
      upvoteCount: 4,
      featuredAt: 900,
    });
  });
});

describe('session Q&A reuses the polling P2P star', () => {
  it('holds raw submissions on the host and broadcasts personalized sanitized state', () => {
    const host = LivePolling.createHost({ sessionCode: 'ROOM', enableSessionQa: true });
    const received = { author: [], classmate: [] };
    host.peers.set('private-author', {
      dc: { readyState: 'open', send: (message) => received.author.push(JSON.parse(message)) },
    });
    host.peers.set('private-classmate', {
      dc: { readyState: 'open', send: (message) => received.classmate.push(JSON.parse(message)) },
    });

    host._receiveSessionQaQuestion('private-author', 'Blue Fox', {
      text: 'Can we explain this another way?',
      clientQuestionId: 'client-1',
    });
    expect(host.sessionQaState.questions[0]).toMatchObject({
      ownerUid: 'private-author',
      codename: 'Blue Fox',
      status: 'held',
    });

    const authorState = received.author.at(-1).payload;
    const classmateState = received.classmate.at(-1).payload;
    expect(authorState.questions).toHaveLength(1);
    expect(authorState.questions[0]).toMatchObject({ own: true, status: 'held' });
    expect(classmateState.questions).toEqual([]);

    const questionId = host.sessionQaState.questions[0].questionId;
    host.setSessionQaQuestionStatus(questionId, 'approve');
    expect(received.classmate.at(-1).payload.questions[0])
      .toMatchObject({ own: false, status: 'approved', upvoteCount: 0 });
    expect(JSON.stringify(received.classmate)).not.toContain('Blue Fox');
    expect(JSON.stringify(received.classmate)).not.toContain('private-author');
  });

  it('enforces submission locks, anonymous upvotes, featuring, and reconnect sync', () => {
    const host = LivePolling.createHost({ sessionCode: 'ROOM', enableSessionQa: true });
    const received = { author: [], voter: [] };
    host.peers.set('author-secret', {
      dc: { readyState: 'open', send: (message) => received.author.push(JSON.parse(message)) },
    });
    host.peers.set('voter-secret', {
      dc: { readyState: 'open', send: (message) => received.voter.push(JSON.parse(message)) },
    });

    host._receiveSessionQaQuestion('author-secret', 'Author Name', {
      text: 'Approved question',
      clientQuestionId: 'client-1',
    });
    const questionId = host.sessionQaState.questions[0].questionId;
    host.setSessionQaQuestionStatus(questionId, 'approve');

    host._receiveSessionQaUpvote('author-secret', { questionId, active: true });
    expect(LivePolling.getSessionQaUpvoteCount(host.sessionQaState.upvotesByQuestion, questionId)).toBe(0);
    host._receiveSessionQaUpvote('voter-secret', { questionId, active: true });
    expect(LivePolling.getSessionQaUpvoteCount(host.sessionQaState.upvotesByQuestion, questionId)).toBe(1);

    const featured = host.featureSessionQaQuestion(questionId);
    expect(featured).toMatchObject({ questionId, text: 'Approved question', upvoteCount: 1 });
    expect(Object.keys(featured)).toEqual(['questionId', 'text', 'upvoteCount', 'featuredAt']);

    received.voter.splice(0);
    expect(host._sendSessionQaStateToPeer('voter-secret')).toBe(true);
    expect(received.voter.map((message) => message.type)).toEqual([
      'sessionQaState',
      'sessionQaFeatured',
    ]);
    expect(JSON.stringify(received.voter)).not.toContain('author-secret');
    expect(JSON.stringify(received.voter)).not.toContain('voter-secret');
    expect(JSON.stringify(received.voter)).not.toContain('Author Name');

    host.setSessionQaSubmissionsLocked(true);
    host._receiveSessionQaQuestion('voter-secret', 'Voter Name', {
      text: 'Should not be accepted',
      clientQuestionId: 'client-2',
    });
    expect(host.sessionQaState.questions).toHaveLength(1);
    const latestQaState = received.voter.filter((message) => message.type === 'sessionQaState').at(-1);
    expect(latestQaState.payload.submissionsLocked).toBe(true);
  });

  it('sends bounded guest question and upvote packets without identity fields', () => {
    const sent = [];
    const guest = LivePolling.createGuest({
      sessionCode: 'ROOM',
      userUid: 'private-user',
      codename: 'Private Name',
    });
    guest.dc = { readyState: 'open', send: (message) => sent.push(JSON.parse(message)) };

    expect(guest.sendSessionQaQuestion('x'.repeat(900), 'c'.repeat(120))).toBe(true);
    expect(sent[0]).toMatchObject({ type: 'sessionQaQuestion' });
    expect(sent[0].payload.text).toHaveLength(LivePolling.SESSION_QA_QUESTION_MAX_LENGTH);
    expect(sent[0].payload.clientQuestionId).toHaveLength(80);
    expect(JSON.stringify(sent[0])).not.toContain('private-user');
    expect(JSON.stringify(sent[0])).not.toContain('Private Name');

    expect(guest.sendSessionQaUpvote('q'.repeat(180), true)).toBe(true);
    expect(sent[1]).toMatchObject({
      type: 'sessionQaUpvote',
      payload: { active: true },
    });
    expect(sent[1].payload.questionId).toHaveLength(120);
  });
});

describe('session Q&A UI and privacy seams', () => {
  it('is hidden by default and opt-in on both existing React owners', () => {
    expect(pollingSource.match(/props\.enableSessionQa === true/g)).toHaveLength(2);
    expect(pollingSource).toContain("sessionQaOptIn ? ce('div', { 'data-live-workspace-section': 'questions'");
    expect(pollingSource).toContain('ce(SessionQaHostPanel, {');
    expect(pollingSource).toContain("tr('Ask / Q&A')");
    expect(pollingSource).toContain("tr('Lock questions')");
    expect(pollingSource).toContain("tr('Restore')");
    expect(pollingSource).toContain("tr('Top voted')");
    expect(pollingSource).toContain('buildSessionQaActivitySnapshot(sessionQaState, guests, sessionCode)');
  });

  it('keeps the Q&A protocol away from session-document persistence', () => {
    const start = pollingSource.lastIndexOf('    _sendSessionQaStateToPeer(uid) {');
    const end = pollingSource.indexOf('sendFeedback(uid, pollId, packet)', start);
    const protocolBlock = pollingSource.slice(start, end);
    expect(protocolBlock).toContain("type: 'sessionQaState'");
    expect(protocolBlock).toContain("type: 'sessionQaFeatured'");
    expect(protocolBlock).not.toContain('sessionDocRef');
    expect(protocolBlock).not.toContain('__alloWriteToSession');
    expect(protocolBlock).not.toContain('setDoc(');
  });
});
