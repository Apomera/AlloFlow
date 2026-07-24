import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const source = readFileSync(resolve(process.cwd(), 'concept_pictionary_source.jsx'), 'utf8');
const shell = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

let ConceptPictionary;
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
  ConceptPictionary = window.AlloModules.ConceptPictionary;
  if (!ConceptPictionary) throw new Error('ConceptPictionary failed to register');
});

describe('Sketch Response pure privacy helpers', () => {
  it('normalizes unknown activity modes back to Pictionary', () => {
    expect(ConceptPictionary.normalizePictionaryActivityMode('sketch')).toBe('sketch');
    expect(ConceptPictionary.normalizePictionaryActivityMode('pictionary')).toBe('pictionary');
    expect(ConceptPictionary.normalizePictionaryActivityMode('unknown')).toBe('pictionary');
  });

  it('groups teacher-local strokes by student without merging canvases', () => {
    const grouped = ConceptPictionary.groupSketchStrokesByUid([
      { uid: 'u1', strokeId: 'a' },
      { uid: 'u2', strokeId: 'b' },
      { uid: 'u1', strokeId: 'c' },
      { strokeId: 'missing-owner' },
    ]);
    expect(grouped.u1.map((stroke) => stroke.strokeId)).toEqual(['a', 'c']);
    expect(grouped.u2.map((stroke) => stroke.strokeId)).toEqual(['b']);
    expect(grouped).not.toHaveProperty('undefined');
  });

  it('sanitizes reveal strokes and removes student identity fields', () => {
    const safe = ConceptPictionary.sanitizeSketchRevealStrokes([
      {
        uid: 'u1',
        codename: 'Blue Fox',
        strokeId: 'stroke-a',
        color: 'javascript:red',
        points: [[-20, 900], ['bad', 4], [30, 40]],
        ts: 42,
      },
    ]);
    expect(safe).toEqual([
      {
        strokeId: 'stroke-a',
        color: '#1a202c',
        points: [[0, 480], [30, 40]],
        ts: 42,
      },
    ]);
    expect(JSON.stringify(safe)).not.toContain('u1');
    expect(JSON.stringify(safe)).not.toContain('Blue Fox');
  });

  it('requires submitted plus approved before a gallery item is revealable', () => {
    const summary = ConceptPictionary.buildSketchSubmissionSummary(
      ['u1', 'u2', 'u3'],
      { u1: [{ strokeId: 'a' }], u2: [{ strokeId: 'b' }], u3: [{ strokeId: 'c' }] },
      { u1: 'submitted', u2: 'drawing', u3: 'submitted' },
      { u1: 'approved', u2: 'approved', u3: 'hidden' },
    );
    expect(summary.find((entry) => entry.uid === 'u1').revealable).toBe(true);
    expect(summary.find((entry) => entry.uid === 'u2').revealable).toBe(false);
    expect(summary.find((entry) => entry.uid === 'u3').revealable).toBe(false);
  });
});

describe('Sketch Response uses the existing Pictionary peer protocol', () => {
  it('keeps private strokes at the host and broadcasts only an anonymous approved reveal payload', () => {
    const statuses = [];
    const receivedByU1 = [];
    const receivedByU2 = [];
    const receivedByNonparticipant = [];
    const host = new ConceptPictionary.PictionaryHost({
      sessionCode: 'SKETCH',
      onSketchStatus: (uid, codename, payload) => statuses.push({ uid, codename, payload }),
    });
    host.peers.set('u1', {
      dc: { readyState: 'open', send: (raw) => receivedByU1.push(JSON.parse(raw)) },
      codename: 'Blue Fox',
    });
    host.peers.set('u2', {
      dc: { readyState: 'open', send: (raw) => receivedByU2.push(JSON.parse(raw)) },
      codename: 'Quiet Star',
    });
    host.peers.set('u3', {
      dc: { readyState: 'open', send: (raw) => receivedByNonparticipant.push(JSON.parse(raw)) },
      codename: 'Outside Audience',
    });

    host.startRound({
      mode: 'sketch',
      concept: 'Draw an energy-flow model',
      drawerUids: ['u1', 'u2'],
    });
    expect(receivedByNonparticipant.some((message) => message.type === 'roundStart')).toBe(false);
    expect(receivedByNonparticipant).toContainEqual({ type: 'roundSync', payload: { active: false } });
    receivedByU1.length = 0;
    receivedByU2.length = 0;
    receivedByNonparticipant.length = 0;

    host._onIncomingStroke('u1', 'Blue Fox', {
      strokeId: 'u1-a',
      color: '#2b6cb0',
      points: [[10, 10], [20, 20]],
    });
    expect(host.strokeHistory).toHaveLength(1);
    expect(receivedByU2.some((message) => message.type === 'stroke')).toBe(false);

    host._onIncomingSketchStatus('u1', 'Blue Fox', { status: 'submitted', timestamp: 10 });
    expect(statuses).toEqual([
      {
        uid: 'u1',
        codename: 'Blue Fox',
        payload: expect.objectContaining({ status: 'submitted', timestamp: 10 }),
      },
    ]);

    const reveal = host.broadcastSketchReveal('u1', 'Draw an energy-flow model');
    expect(reveal).toMatchObject({
      label: 'Anonymous sketch',
      prompt: 'Draw an energy-flow model',
      strokes: [{ strokeId: 'u1-a', color: '#2b6cb0' }],
    });
    const serialized = JSON.stringify(reveal);
    expect(serialized).not.toContain('"uid"');
    expect(serialized).not.toContain('Blue Fox');
    expect(receivedByU2.at(-1)).toMatchObject({ type: 'sketchReveal', payload: reveal });
    expect(receivedByNonparticipant.some((message) => message.type === 'sketchReveal')).toBe(false);
  });

  it('preserves a resolved Sketch Response gallery for teacher review but still clears Pictionary rounds', () => {
    const host = new ConceptPictionary.PictionaryHost({ sessionCode: 'SKETCH' });
    host.startRound({ mode: 'sketch', concept: 'Model', drawerUids: ['u1'] });
    host._onIncomingStroke('u1', 'Fox', { strokeId: 'a', color: '#1a202c', points: [[1, 1]] });
    host.resolveRound({ reason: 'manual' });
    expect(host.activeRound).toBeNull();
    expect(host.strokeHistory).toHaveLength(1);
    expect(host.lastResolvedSketch).toEqual({ prompt: 'Model', participantUids: ['u1'] });
    expect(host.broadcastSketchReveal('u1', 'Model')).toBeTruthy();

    host.startRound({ mode: 'pictionary', concept: 'Plant', drawerUids: ['u1'] });
    host._onIncomingStroke('u1', 'Fox', { strokeId: 'b', color: '#1a202c', points: [[2, 2]] });
    host.resolveRound({ reason: 'manual' });
    expect(host.strokeHistory).toEqual([]);
    expect(host.lastResolvedSketch).toBeNull();
  });

  it('routes explicit submitted/editing status messages through the existing guest data channel', () => {
    const guest = new ConceptPictionary.PictionaryGuest({
      sessionCode: 'SKETCH',
      userUid: 'u1',
      codename: 'Fox',
    });
    const sent = [];
    guest.dc = { readyState: 'open', send: (raw) => sent.push(JSON.parse(raw)) };
    expect(guest.sendSketchStatus('submitted')).toBe(true);
    expect(guest.sendSketchStatus('editing')).toBe(true);
    expect(guest.sendSketchStatus('invalid')).toBe(false);
    expect(sent.map((message) => message.payload.status)).toEqual(['submitted', 'editing']);
  });
});

describe('Sketch Response UI and existing resource-delivery integration', () => {
  it('exposes private gallery moderation, submit/edit, and anonymous reveal controls', () => {
    expect(source).toContain('Private response gallery');
    expect(source).toContain('Approve submitted');
    expect(source).toContain('Reveal anonymously');
    expect(source).toContain('Submit drawing');
    expect(source).toContain('Edit drawing');
    expect(source).toContain('Your board stays private to the teacher');
  });

  it('supports whole-class, existing-group, and individual participant selection', () => {
    expect(source).toContain('setDrawerUids(Object.keys(roster))');
    expect(source).toContain('roster[uid].groupId === groupId');
    expect(source).toContain('toggleDrawer(s.uid)');
  });

  it('calls the established student/group resource handlers from gallery cards', () => {
    expect(source).toContain('onSendToStudent(participant.uid, followUpResourceId)');
    expect(source).toContain('onSendToGroup(groupId, followUpResourceId)');
    expect(shell).toContain('onSendToStudent: (uid, resourceId) => handleSetStudentResource(uid, resourceId)');
    expect(shell).toContain('onSendToGroup: (groupId, resourceId) => handleSetGroupResource(groupId, resourceId)');
    expect(shell).toContain('resources: _alloStudentSafeResources(history)');
  });

  it('opens Sketch Response as a preset of the existing Pictionary host and excludes nonparticipants', () => {
    expect(shell).toContain("setPictionaryInitialMode('sketch'); setShowPictionaryHost(true)");
    expect(shell).toContain('initialMode: pictionaryInitialMode');
    expect(shell).toContain("_picRoundMode !== 'sketch' ? 'guesser' : null");
    expect(source).toContain(
      "updates[`roster.${uid}.role`] = drawerUids.includes(uid) ? 'drawer' : (activityMode === PICTIONARY_ACTIVITY_MODE ? 'guesser' : null)",
    );
  });
});
