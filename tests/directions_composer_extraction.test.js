import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve } from 'node:path';
import { parse } from '@babel/parser';
const require = createRequire(import.meta.url);
let React, createRoot, act, Simulate, View, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const ctx = { window: { React } };
  vm.runInNewContext(readFileSync('view_directions_composer_module.js', 'utf8'), ctx);
  View = ctx.window.AlloModules.DirectionsComposer.DirectionsComposerView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = host = null; });
function render(extra = {}) {
  let draft = { title: 'Existing assignment', body: 'Read the passage', objectives: [], choiceBoard: { enabled: false, choices: [] } };
  const close = vi.fn(), add = vi.fn(), derive = vi.fn();
  const Icon = () => React.createElement('span', { 'aria-hidden': true });
  const props = {
    ArrowRight: Icon, ClipboardList: Icon, Sparkles: Icon, X: Icon,
    _alloDirectionsGoalResources: [], _alloGoalOptionsForResource: () => [], _alloStationStyle: () => ({}),
    _mbDirectionsChoiceDraftChoices: [], _mbDirectionsChoicePreviewItems: [], _mbDirectionsChoiceReady: false,
    _mbDirectionsChoiceStaleCount: 0, addDirectionsToPack: add, deriveDirectionsDraft: derive,
    directionsDeriving: false, generateUUID: () => 'new-goal', mbDirectionsDraft: draft,
    mbDirectionsGoalRes: '', mbDirectionsGoalText: '', setMbDirectionsDraft: update => { draft = update(draft); },
    setMbDirectionsGoalRes: vi.fn(), setMbDirectionsGoalText: vi.fn(), setShowDirectionsChoicePreview: vi.fn(),
    setShowDirectionsComposer: close, showDirectionsChoicePreview: false, t: () => '', ...extra,
  };
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  let hostRenders = 0;
  function Host() { hostRenders++; return React.createElement(View, props); }
  act(() => root.render(React.createElement(Host)));
  return { close, add, derive, getDraft: () => draft, hostRenders: () => hostRenders, reopen: () => { act(() => root.render(null)); act(() => root.render(React.createElement(Host))); } };
}
describe('extracted Directions composer', () => {
  it('renders the named dialog and preserves draft edits through host setters', () => {
    const h = render();
    expect(host.querySelector('[role="dialog"]').getAttribute('aria-label')).toBe('Assignment Directions');
    const title = host.querySelector('input[aria-label="Directions title"]');
    expect(title.value).toBe('Existing assignment');
    act(() => Simulate.change(title, { target: { value: 'Revised assignment' } }));
    expect(h.getDraft()).toMatchObject({ title: 'Revised assignment', body: 'Read the passage' });
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent === 'Add to pack').click());
    expect(h.add).toHaveBeenCalledTimes(1);
  });
  it('keeps close/Escape and the in-progress generation guard', () => {
    const h = render({ directionsDeriving: true });
    const derive = [...host.querySelectorAll('button')].find(button => button.disabled);
    expect(derive).toBeTruthy();
    act(() => Simulate.keyDown(host.firstChild, { key: 'Escape', stopPropagation: vi.fn() }));
    expect(h.close).toHaveBeenCalledWith(false);
    act(() => host.querySelector('button[aria-label="Close"]').click());
    expect(h.close).toHaveBeenCalledTimes(2);
  });
  it('keeps goal keystrokes and resource selection local and preserves unfinished input on reopen', () => {
    const goalState = { current: { resource: '', text: '' } };
    const h = render({ directionsGoalEditorState: goalState, setMbDirectionsGoalText: undefined, setMbDirectionsGoalRes: undefined,
      _alloDirectionsGoalResources: [{ id: 'lesson-1', title: 'Lesson one', type: 'lesson' }],
    });
    const input = () => host.querySelector('input[aria-label="Write a goal"]');
    for (const value of ['R', 'Re', 'Read', 'Read the passage']) act(() => Simulate.change(input(), { target: { value } }));
    act(() => Simulate.change(host.querySelector('#dir-goal-res'), { target: { value: 'lesson-1' } }));
    expect(h.hostRenders()).toBe(1);
    expect(goalState.current).toEqual({ resource: 'lesson-1', text: 'Read the passage' });
    expect(h.getDraft().objectives).toEqual([]);
    h.reopen();
    expect(input().value).toBe('Read the passage');
    expect(host.querySelector('#dir-goal-res').value).toBe('lesson-1');
    act(() => Simulate.keyDown(input(), { key: 'Enter', preventDefault: vi.fn() }));
    expect(h.getDraft()).toMatchObject({ title: 'Existing assignment', objectives: [{ id: 'new-goal', kind: 'manual', label: 'Read the passage' }] });
    expect(input().value).toBe('');
    expect(goalState.current.text).toBe('');
  });
  it('supports the older shell goal setters while rejecting blank goal additions', () => {
    const update = vi.fn();
    const h = render({ mbDirectionsGoalText: 'Initial goal', setMbDirectionsGoalText: update });
    const input = host.querySelector('input[aria-label="Write a goal"]');
    expect(input.value).toBe('Initial goal');
    act(() => Simulate.change(input, { target: { value: '   ' } }));
    expect(update).toHaveBeenCalledWith('   ');
    act(() => Simulate.keyDown(input, { key: 'Enter', preventDefault: vi.fn() }));
    expect(h.getDraft().objectives).toEqual([]);
  });
  it('keeps a recoverable host wrapper and explicit prop wiring for every dependency', () => {
    const view = parse(readFileSync('view_directions_composer_source.jsx', 'utf8'), { sourceType: 'script', plugins: ['jsx'] });
    const names = view.program.body[0].params[0].properties.map(prop => prop.key.name);
    const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
    const legacyGoalProps = new Set(['mbDirectionsGoalRes', 'mbDirectionsGoalText', 'setMbDirectionsGoalRes', 'setMbDirectionsGoalText']);
    for (const name of names.filter(name => !legacyGoalProps.has(name))) expect(shell).toContain(name + '={' + name + '}');
    expect(shell).toContain("const directionsGoalEditorState = useRef({ resource: '', text: '' })");
    expect(shell).not.toContain('const [mbDirectionsGoalText, setMbDirectionsGoalText]');
    expect(shell).toContain('loaderName="__alloLazyDirectionsComposer"');
    expect(shell).toContain('Your draft is still here; retry');
    expect(shell).not.toContain('directions.goal_write_placeholder');
    expect(readFileSync('view_directions_composer_module.js', 'utf8')).toBe(readFileSync('desktop/web-app/public/view_directions_composer_module.js', 'utf8'));
  });
});
