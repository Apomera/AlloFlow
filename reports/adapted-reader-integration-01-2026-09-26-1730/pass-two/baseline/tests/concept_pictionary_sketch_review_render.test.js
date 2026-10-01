import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const ReactStub = {
  Fragment: 'fragment',
  memo: (component) => component,
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: (current) => ({ current }),
  useCallback: (fn) => fn,
  useMemo: (factory) => factory(),
  useContext: () => null,
};

let api;
beforeAll(() => {
  window.React = ReactStub;
  loadAlloModule('concept_pictionary_module.js');
  api = window.AlloModules.ConceptPictionary;
  if (!api) throw new Error('ConceptPictionary failed to register');
});

describe('Sketch Review render smoke', () => {
  it('renders the extended host owner and gallery without undefined runtime references', () => {
    const hostTree = api.HostView({
      isOpen: true,
      initialMode: 'sketch',
      sessionCode: 'RENDER',
      sessionData: {
        roster: {
          u1: { name: 'Student One', groupId: 'g1' },
          u2: { name: 'Student Two', groupId: 'g1' },
        },
        groups: { g1: { name: 'Table One' } },
      },
      resources: [{ id: 'resource-1', title: 'Modeling guide' }],
    });
    const galleryTree = api.SketchResponseGallery({
      participants: [
        { uid: 'u1', name: 'Student One', groupId: 'g1' },
        { uid: 'u2', name: 'Student Two', groupId: 'g1' },
      ],
      strokesByUid: {
        u1: [{ strokeId: 'a', color: '#1a202c', points: [[1, 1]] }],
        u2: [{ strokeId: 'b', color: '#1a202c', points: [[2, 2]] }],
      },
      statuses: { u1: 'submitted', u2: 'submitted' },
      moderation: { u1: 'approved', u2: 'approved' },
      attemptsByUid: { u1: 1, u2: 2 },
      feedbackByUid: {},
      feedbackDraftsByUid: {},
      feedbackBusyByUid: {},
      feedbackBusyKindByUid: {},
      visionNoticeByUid: {},
      criterion: 'Accurate relationships',
      canStartShowcase: true,
      canPolishFeedback: true,
      canAnalyzeSketch: true,
      visionProviderLabel: 'AlloFlow Local',
      resources: [{ id: 'resource-1', title: 'Modeling guide' }],
      groups: { g1: { name: 'Table One' } },
    });

    const serialized = JSON.stringify([hostTree, galleryTree]);
    expect(serialized).toContain('Sketch Response');
    expect(serialized).toContain('Success criterion');
    expect(serialized).toContain('Start anonymous sketch vote');
    expect(serialized).toContain('Analyze sketch with AI');
    expect(serialized).toContain('identity-free PNG');
    expect(serialized).toContain('Choose a follow-up resource');
    expect(serialized).not.toContain('ReferenceError');
  });
});
