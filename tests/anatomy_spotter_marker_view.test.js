import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'
];
const now = 1800000000000;
const savedRound = {
  _spotterActive: true,
  _spotterTarget: 'skull',
  _spotterOpts: ['skull', 'mandible', 'clavicle', 'ribs'].map(id => ({ id })),
  _spotterStartTime: now - 2000,
  _spotterSerial: 1
};

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = find(child, predicate);
      if (match) return match;
    }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function session(file, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = {
    anatomy: {
      _activeTab: 'spotter', system: 'skeletal', view: 'anterior', complexity: 3,
      _bodyView3d: true, _body3dStyle: 'blueprint', ...extra
    }
  };
  const setToolData = vi.fn(update => { data = typeof update === 'function' ? update(data) : update; });
  const ctx = () => ({ gradeLevel: '9', setToolData });
  const tree = () => tool.render(makeCtx({ toolData: data, ...ctx() }));
  const node = (key, value) => find(tree(), element => element.props?.[key] === value);
  const html = () => {
    const root = document.createElement('div');
    root.innerHTML = renderTool('anatomy', data, ctx());
    return root;
  };
  return {
    data: () => data.anatomy,
    node,
    html,
    setToolData,
    start: () => node('data-anatomy-spotter-start', true).props.onClick(),
    end: () => node('data-anatomy-spotter-end', true).props.onClick()
  };
}

function expectAtlas(root) {
  expect(root.querySelector('[data-anatomy-3d-canvas]')).toBeNull();
  expect(root.querySelector('[data-anatomy-model-shell] canvas[role="img"]')).not.toBeNull();
  expect(root.querySelector('[data-anatomy-canvas-toolbar]').getAttribute('data-anatomy-canvas-mode')).toBe('2d');
  expect(root.querySelector('[data-anatomy-view-dimension="2d"]').getAttribute('aria-pressed')).toBe('true');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  resetStemLab();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

for (const file of files) describe('Spotter marker representation ' + file, () => {
  it('allows the requested 3D view while Spotter is inactive', () => {
    const conversation = session(file);
    const root = conversation.html();
    expect(root.querySelector('[data-anatomy-3d-canvas]')).not.toBeNull();
    expect(root.querySelector('[data-anatomy-view-dimension="3d"]').disabled).toBe(false);
    expect(root.querySelector('[data-anatomy-spotter-view-help]')).toBeNull();
    expect(conversation.data()._bodyView3d).toBe(true);
  });

  it('starts a round in the atlas without overwriting the requested 3D view or model', () => {
    const practice = session(file, {
      _body3dStyle: 'realistic',
      _structureNotes: { skull: 'My saved note' }
    });
    practice.start();
    expect(practice.data()._spotterActive).toBe(true);
    expect(practice.data()._bodyView3d).toBe(true);
    expect(practice.data()._body3dStyle).toBe('realistic');
    expect(practice.data()._structureNotes.skull).toBe('My saved note');
    expectAtlas(practice.html());
    expect(practice.html().querySelector('[data-anatomy-spotter-cue]').textContent).toContain('The marker is');
  });

  for (const answered of [false, true]) it('restores an ' + (answered ? 'answered' : 'unanswered') + ' 3D-saved round using the marker atlas without render writes', () => {
    const practice = session(file, {
      ...savedRound,
      ...(answered ? { _spotterFeedback: 'ribs', _spotterScore: 0, _spotterTotal: 1 } : {})
    });
    const before = structuredClone(practice.data());
    const root = practice.html();
    expectAtlas(root);
    expect(root.querySelector('[data-anatomy-spotter-cue]').textContent).toContain('The marker is');
    expect(root.querySelectorAll('[data-anatomy-spotter-option]')).toHaveLength(4);
    expect(root.textContent).not.toContain('This saved Spotter round is incomplete.');
    expect(root.querySelector('[data-anatomy-spotter-feedback]') !== null).toBe(answered);
    expect(practice.data()).toEqual(before);
    expect(practice.setToolData).not.toHaveBeenCalled();
  });

  it('disables and explains the 3D switch throughout an active round', () => {
    const practice = session(file, savedRound);
    const root = practice.html();
    const switch3d = root.querySelector('[data-anatomy-view-dimension="3d"]');
    expect(switch3d.disabled).toBe(true);
    expect(switch3d.getAttribute('aria-pressed')).toBe('false');
    const explanation = root.querySelector('#' + switch3d.getAttribute('aria-describedby'));
    expect(explanation.textContent).toContain('Spotter uses the 2D atlas for its crosshair.');
    expect(explanation.textContent).toContain('End the test');
    const before = structuredClone(practice.data());
    practice.node('data-anatomy-view-dimension', '3d').props.onClick();
    practice.node('data-anatomy-view-dimension', '2d').props.onClick();
    expect(practice.data()).toEqual(before);
  });

  for (const dimension of ['2d', '3d']) it('ignores a stale ' + dimension + ' switch callback after a round starts', () => {
    const practice = session(file, { _bodyView3d: dimension === '2d' });
    const switchView = practice.node('data-anatomy-view-dimension', dimension).props.onClick;
    practice.start();
    const before = structuredClone(practice.data());
    switchView();
    expect(practice.data()).toEqual(before);
    expectAtlas(practice.html());
  });

  it('returns to the requested 3D representation when the round ends', () => {
    const practice = session(file, { ...savedRound, _body3dStyle: 'realistic' });
    expectAtlas(practice.html());
    practice.end();
    const root = practice.html();
    expect(practice.data()._spotterActive).toBe(false);
    expect(practice.data()._bodyView3d).toBe(true);
    expect(practice.data()._body3dStyle).toBe('realistic');
    expect(root.querySelector('[data-anatomy-3d-canvas]').getAttribute('data-anatomy-3d-style')).toBe('realistic');
    expect(root.querySelector('[data-anatomy-view-dimension="3d"]').getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-anatomy-view-dimension="3d"]').disabled).toBe(false);
    expect(root.querySelector('[data-anatomy-spotter-view-help]')).toBeNull();
  });

  for (const mode of ['explore', 'quiz', 'flashcards', 'tour', 'connections', 'aiTutor', 'pathways', 'homeoHunt']) {
    it('keeps 3D available in ' + mode + ' when an old Spotter round remains saved', () => {
      const practice = session(file, { ...savedRound, _activeTab: mode });
      const root = practice.html();
      expect(root.querySelector('[data-anatomy-3d-canvas]')).not.toBeNull();
      expect(root.querySelector('[data-anatomy-view-dimension="3d"]').disabled).toBe(false);
      expect(root.querySelector('[data-anatomy-view-dimension="3d"]').getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelector('[data-anatomy-spotter-view-help]')).toBeNull();
      expect(practice.data()._bodyView3d).toBe(true);
    });
  }
});
