import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const pollingSource = readFileSync(resolve(process.cwd(), 'live_polling_module.js'), 'utf8');
const shellSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

let LivePolling;
beforeAll(() => {
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
  if (!LivePolling) throw new Error('LivePolling failed to register');
});

describe('Feedback Response pure privacy helpers', () => {
  it('remains a bounded configuration of free-text polling', () => {
    expect(LivePolling.normalizeFeedbackConfig({
      type: 'freetext',
      feedback: { enabled: true, criteria: `  Use evidence.  `, maxAttempts: 9 },
    })).toEqual({
      enabled: true,
      criteria: 'Use evidence.',
      maxAttempts: 2,
    });
    expect(LivePolling.normalizeFeedbackConfig({
      type: 'rating',
      feedback: { enabled: true, criteria: 'Must not activate' },
    }).enabled).toBe(false);
  });

  it('bounds student writing, criteria, and teacher feedback', () => {
    expect(LivePolling.normalizeFeedbackResponseText('x'.repeat(3000)))
      .toHaveLength(LivePolling.FEEDBACK_RESPONSE_MAX_LENGTH);
    const packet = LivePolling.sanitizeFeedbackPacket({
      text: 'f'.repeat(2000),
      attempt: 12,
      allowRevision: true,
      uid: 'must-not-leak',
      codename: 'must-not-leak',
    }, 'poll-1');
    expect(packet.text).toHaveLength(LivePolling.FEEDBACK_TEXT_MAX_LENGTH);
    expect(packet.attempt).toBe(2);
    expect(packet.allowRevision).toBe(false);
    expect(packet).not.toHaveProperty('uid');
    expect(packet).not.toHaveProperty('codename');
  });

  it('retains the first and revised response without duplicating the student', () => {
    let rows = LivePolling.upsertFeedbackResponse([], {
      uid: 'u1', codename: 'Blue Fox', response: 'First draft', attempt: 1, timestamp: 10,
    });
    rows = LivePolling.upsertFeedbackResponse(rows, {
      uid: 'u1', codename: 'Blue Fox', response: 'Revised with evidence', attempt: 2, timestamp: 20,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      uid: 'u1',
      response: 'Revised with evidence',
      attempt: 2,
      attempts: [
        { attempt: 1, response: 'First draft', timestamp: 10 },
        { attempt: 2, response: 'Revised with evidence', timestamp: 20 },
      ],
    });
  });

  it('resolves only connected members of the selected audience', () => {
    const guests = [
      { uid: 'u1', codename: 'One' },
      { uid: 'u2', codename: 'Two' },
      { uid: 'u3', codename: 'Three' },
    ];
    const roster = {
      u1: { groupId: 'g1' },
      u2: { groupId: 'g2' },
      u3: { groupId: 'g1' },
      offline: { groupId: 'g1' },
    };
    expect(LivePolling.resolveFeedbackAudienceUids(guests, roster, 'class', '')).toEqual(['u1', 'u2', 'u3']);
    expect(LivePolling.resolveFeedbackAudienceUids(guests, roster, 'group', 'g1')).toEqual(['u1', 'u3']);
    expect(LivePolling.resolveFeedbackAudienceUids(guests, roster, 'individual', 'u2')).toEqual(['u2']);
  });

  it('builds identity-free, criteria-aligned AI instructions', () => {
    const prompt = LivePolling.buildFeedbackPrompt({
      prompt: 'Explain the energy transfer.',
      criteria: 'Use evidence and accurate vocabulary.',
      response: 'Energy moves from the sun to plants.',
      attempt: 1,
    });
    expect(prompt).toContain('Use evidence and accurate vocabulary.');
    expect(prompt).toContain('Energy moves from the sun to plants.');
    expect(prompt).toContain('one specific strength');
    expect(prompt).not.toContain('codename');
    expect(prompt).not.toContain('student name');
  });
});

describe('Feedback Response targeted peer protocol', () => {
  it('broadcasts the existing poll only to the selected audience', () => {
    const host = LivePolling.createHost({ sessionCode: 'ROOM' });
    const received = { u1: [], u2: [], u3: [] };
    for (const uid of Object.keys(received)) {
      host.peers.set(uid, {
        dc: { readyState: 'open', send: (message) => received[uid].push(JSON.parse(message)) },
      });
    }
    const poll = {
      id: 'feedback-1',
      type: 'freetext',
      prompt: 'Explain.',
      feedback: { enabled: true, criteria: 'Be clear.', maxAttempts: 2 },
    };
    host.broadcastPoll(poll, ['u1', 'u3']);
    expect(received.u1.at(-1)).toMatchObject({ type: 'poll', payload: { id: 'feedback-1' } });
    expect(received.u3.at(-1)).toMatchObject({ type: 'poll', payload: { id: 'feedback-1' } });
    expect(received.u2.at(-1)).toMatchObject({ type: 'closePoll', payload: {} });
    expect(host._isUidInActiveAudience('u2')).toBe(false);
  });

  it('sends reviewed feedback to exactly one participant with no identity fields', () => {
    const host = LivePolling.createHost({ sessionCode: 'ROOM' });
    const received = { u1: [], u2: [] };
    for (const uid of Object.keys(received)) {
      host.peers.set(uid, {
        dc: { readyState: 'open', send: (message) => received[uid].push(JSON.parse(message)) },
      });
    }
    host.broadcastPoll({
      id: 'feedback-2',
      type: 'freetext',
      prompt: 'Explain.',
      feedback: { enabled: true, maxAttempts: 2 },
    }, ['u1', 'u2']);

    expect(host.sendFeedback('u1', 'feedback-2', {
      text: 'Strong cause-and-effect link. Add one piece of evidence.',
      attempt: 1,
      allowRevision: true,
      codename: 'must-not-leak',
    })).toBe(true);

    const feedbackMessages = received.u1.filter((message) => message.type === 'feedback');
    expect(feedbackMessages).toHaveLength(1);
    expect(feedbackMessages[0].payload).toMatchObject({
      pollId: 'feedback-2',
      text: 'Strong cause-and-effect link. Add one piece of evidence.',
      attempt: 1,
      allowRevision: true,
    });
    expect(JSON.stringify(feedbackMessages[0])).not.toContain('must-not-leak');
    expect(received.u2.some((message) => message.type === 'feedback')).toBe(false);
  });

  it('adds only bounded attempt/status metadata to student messages', () => {
    const sent = [];
    const guest = LivePolling.createGuest({ sessionCode: 'ROOM', userUid: 'u1', codename: 'Blue Fox' });
    guest.dc = { readyState: 'open', send: (message) => sent.push(JSON.parse(message)) };
    expect(guest.sendResponse('feedback-3', 'My revision', { attempt: 2 })).toBe(true);
    expect(guest.sendResponseStatus('feedback-3', 'submitted', 2)).toBe(true);
    expect(sent[0]).toMatchObject({
      type: 'response',
      payload: { pollId: 'feedback-3', response: 'My revision', attempt: 2 },
    });
    expect(sent[1]).toMatchObject({
      type: 'responseStatus',
      payload: { pollId: 'feedback-3', status: 'submitted', attempt: 2 },
    });
  });
});

describe('Feedback Response composes existing UI and differentiation seams', () => {
  it('uses a freetext preset rather than registering another poll type', () => {
    expect(shellSource).toContain("t('live_dock.feedback_response') || 'Feedback Response'");
    expect(shellSource).toContain("type: 'freetext'");
    expect(shellSource).toContain('feedbackEnabled: true');
    expect(pollingSource).toContain("enabled: pollType === 'freetext' && feedbackEnabled");
    expect(pollingSource).toContain("['rating', 'mcq', 'freetext', 'wordcloud']");
  });

  it('requires teacher review before private delivery and supports one revision', () => {
    expect(pollingSource).toContain("tr('Review complete — send privately')");
    expect(pollingSource).toContain('configured AI provider');
    expect(pollingSource).toContain("tr('Revise using this feedback')");
    expect(pollingSource).toContain("tr('Submit revision')");
    expect(pollingSource).toContain('sendFeedback(uid, activePoll.id');
    expect(pollingSource).toContain("sendResponseStatus(activePoll.id, 'submitted', currentAttempt)");
  });

  it('reuses existing individual and group resource delivery handlers', () => {
    expect(pollingSource).toContain('props.onSendToStudent(participant.uid, followUpResourceId)');
    expect(pollingSource).toContain('props.onSendToGroup(participant.groupId, followUpResourceId)');
    expect(shellSource).toContain('onSendToStudent: (uid, resourceId) => handleSetStudentResource(uid, resourceId)');
    expect(shellSource).toContain('onSendToGroup: (groupId, resourceId) => handleSetGroupResource(groupId, resourceId)');
    expect(shellSource).toContain('resources: _alloStudentSafeResources(history)');
  });

  it('keeps feedback off the anonymous class-results path', () => {
    expect(pollingSource).toContain('if (!hostRef.current || !activePoll || isFeedbackPoll(activePoll)) return;');
    expect(pollingSource).toContain("!activeFeedbackConfig.enabled ? ce('button'");
    const sendFeedbackStart = pollingSource.indexOf('sendFeedback(uid, pollId, packet)');
    const sendFeedbackBlock = pollingSource.slice(sendFeedbackStart, sendFeedbackStart + 900);
    expect(sendFeedbackBlock).toContain("peer.dc.send(JSON.stringify({ type: 'feedback'");
    expect(sendFeedbackBlock).not.toContain('sessionDocRef');
    expect(sendFeedbackBlock).not.toContain('__alloWriteToSession');
  });
});
