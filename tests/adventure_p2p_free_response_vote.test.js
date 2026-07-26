import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const shell = read('AlloFlowANTI.txt');
const polling = read('live_polling_module.js');
const adventureView = read('view_adventure_source.jsx');
const adventureHandlers = read('adventure_handlers_source.jsx');
const whiteboard = read('whiteboard/whiteboard.html');
const protocol = read('docs/LIVE_SESSION_PROTOCOL.md');

describe('existing Excalidraw companion integration', () => {
  it('keeps the whiteboard device-local and saves PNG plus editable scene through the guarded opener bridge', () => {
    expect(whiteboard).toContain('@excalidraw/excalidraw@0.17.6');
    expect(whiteboard).toContain("type: 'allocwb-save'");
    expect(whiteboard).toContain("type: 'excalidraw', version: 2");
    expect(whiteboard).toContain('Nothing is sent anywhere;');
    expect(shell).toContain("const WHITEBOARD_ORIGIN = 'https://alloflow-cdn.pages.dev'");
    expect(shell).toContain("if (ev.origin !== WHITEBOARD_ORIGIN) return;");
    expect(shell).toContain("whiteboardScene: scene");
  });
});

describe('Adventure free-response class actions reuse P2P Live Polling', () => {
  it('launches a bounded free-text preset with an Adventure voting criterion and no session write', () => {
    const start = shell.indexOf('const openAdventureActionVote = () =>');
    const end = shell.indexOf('useEffect(() => {', start);
    const block = shell.slice(start, end);
    expect(block).toContain("source: 'adventure-free-response'");
    expect(block).toContain("type: 'freetext'");
    expect(block).toContain("afterSubmitMode: 'wait'");
    expect(block).toContain('peerVoteCriterion:');
    expect(block).toContain('setShowLivePollingPanel(true)');
    expect(block).not.toContain('updateDoc(');
    expect(block).not.toContain('democracy.votes');
  });

  it('lets only the teacher launch the class-action round and gives live students an honest waiting state', () => {
    expect(adventureView).toContain('isTeacherMode && activeSessionCode && !adventureFreeResponseEnabled');
    expect(adventureView).toContain("t('adventure.collect_class_actions') || 'Collect and vote on class actions'");
    expect(adventureView).toContain('!isTeacherMode && activeSessionCode ? (');
    expect(adventureView).toContain('Free responses and votes are sent peer to peer.');
    expect(adventureHandlers).toContain('if (!isTeacherMode && activeSessionCode)');
    expect(adventureHandlers).toContain("teacher_control");
  });

  it('returns only anonymous selected text to the teacher composer for review', () => {
    expect(shell).toContain("onUsePeerShowcaseResponse: livePollPreset && livePollPreset.source === 'adventure-free-response'");
    expect(shell).toContain('setAdventureTextInput(action)');
    expect(shell).not.toContain('handleAdventureTextSubmit(action)');

    const start = polling.indexOf('onUsePeerShowcaseResponse(candidate.response');
    const callback = polling.slice(start, start + 520);
    expect(callback).toContain('candidateId: candidate.candidateId');
    expect(callback).not.toContain('ownerUid');
    expect(callback).not.toContain('codename');
    expect(polling).toContain('setPeerVoteCriterion(normalizePeerVoteCriterion(initialPoll.peerVoteCriterion))');
    expect(polling).toContain("tr('Use as Adventure action')");
  });

  it('documents the privacy boundary and keeps legacy Firestore voting limited to fixed choices', () => {
    expect(protocol).toContain('**Adventure Class Actions** [SHIPPED 2026-07-25]');
    expect(protocol).toContain('proposals/votes never enter');
    expect(protocol).toContain('teacher-authored,');
    expect(protocol).toContain('fixed-option choices');
    expect(adventureHandlers).toContain('[`democracy.votes.${user.uid}`]: normalizedChoice');
  });
});
