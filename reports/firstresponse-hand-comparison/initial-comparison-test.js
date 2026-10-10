import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(path => resolve(path))
  .find(path => existsSync(resolve(path, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act, Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync(process.env.FIRST_RESPONSE_COMPARISON_SOURCE || 'stem_lab/stem_tool_firstresponse.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const ageIds = ['adult', 'child', 'infant'];
const evidenceLabels = {
  near: { 4: 'Near palm before turn', 5: 'Near palm after turn' },
  support: { 4: 'Supporting hand before turn', 5: 'Supporting hand after turn' }
};
const legacyLabels = {
  near: { 4: 'Inspect before the turn', 5: 'Inspect after the turn' },
  support: { 4: 'Inspect support before turn', 5: 'Inspect support after turn' }
};
let previous, viewer, viewerStatus, host, root, state, patch, focus, reset;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); delete window.__alloflowFirstResponse;
  previous = window.StemLab; viewerStatus = 'ready';
  focus = vi.fn(() => true); reset = vi.fn();
  window.StemLab = { _registry: {}, isRegistered: () => false,
    registerTool(id, tool) { this._registry[id] = tool; },
    makeBayViewer() {
      return viewer = { attach() {}, sync() {}, focus, reset, nudge() {}, zoom() {}, status: () => viewerStatus };
    } };
  // These checks exercise native controls and transient UI state. Geometry and
  // camera fitting remain covered by the existing hand-study fixtures.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove(); window.StemLab = previous; vi.restoreAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dAge: 'adult',
      b3dTab: 'recovery', b3dStatus: 'ready', b3dRec: completed, b3dRecView: 4, ...seed });
    state = data; patch = values => setData(previousState => ({ ...previousState, ...values }));
    return window.StemLab._registry.firstResponse.render({ React,
      toolData: { firstResponse: data }, update: (_, key, value) => patch({ [key]: value }),
      updateMulti: (_, values) => patch(values), t: (_, fallback) => fallback,
      addToast() {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}
function button(label, scope = host) {
  const element = [...scope.querySelectorAll('button')].find(element => element.textContent === label);
  expect(element, label).toBeTruthy(); return element;
}
function click(label, scope = host) { act(() => button(label, scope).click()); }
function rail() {
  const element = host.querySelector('.fr-recovery-comparison'); expect(element, 'comparison beside model').toBeTruthy(); return element;
}
function caption() {
  const element = host.querySelector('.fr-recovery-comparison-caption'); expect(element, 'visible comparison caption').toBeTruthy(); return element;
}
function stage() { return host.querySelector('.fr-body3d-stage'); }
function study() { return host.querySelector('.fr-hand-study'); }
function assertPressed(kind, pose) {
  for (const [hand, label] of [['near', 'Near hand'], ['support', 'Supporting hand']]) {
    expect(button(label, rail()).getAttribute('aria-pressed'), label).toBe(String(hand === kind));
  }
  for (const hand of ['near', 'support']) for (const phase of [4, 5]) {
    const expected = String(hand === kind && phase === pose);
    expect(button(legacyLabels[hand][phase]).getAttribute('aria-pressed'), legacyLabels[hand][phase]).toBe(expected);
    if (study()) expect(button(evidenceLabels[hand][phase], study()).getAttribute('aria-pressed'), evidenceLabels[hand][phase]).toBe(expected);
  }
  for (const [phase, label] of [[4, 'Before the turn'], [5, 'After the turn']]) {
    expect(button(label, rail()).getAttribute('aria-pressed'), label).toBe(String(!!kind && phase === pose));
  }
}
function assertCaption(kind, phase) {
  const hand = kind === 'near' ? 'Near hand' : 'Supporting hand';
  expect(caption().textContent).toContain(hand);
  if (phase === 4) expect(caption().textContent).toContain('Before the turn');
  if (phase === 5) expect(caption().textContent).toContain('After the turn');
}
function review(phase) {
  const select = host.querySelector('#fr-recovery-pose'); expect(select).toBeTruthy();
  act(() => Simulate.change(select, { target: { value: String(phase) } }));
}
function clearSelection() {
  assertPressed(null, null);
  expect(caption().textContent).not.toMatch(/Near hand\s*·|Supporting hand\s*·/);
}
function unchanged(before, allowed = []) {
  const omit = value => Object.fromEntries(Object.entries(value).filter(([key]) => !allowed.includes(key)));
  expect(omit(state)).toEqual(omit(before));
  for (const key of Object.keys(before)) if (!allowed.includes(key)) expect(state[key], key + ' identity').toBe(before[key]);
}

describe('First Response hand and pose comparison identity', () => {
  it('starts with a visible selection prompt and no claimed hand in any equivalent control', () => {
    mount(); const before = state;
    expect(caption().textContent).toContain('Choose a hand close-up');
    assertPressed(null, null); expect(state).toBe(before);
    expect(button('Before the turn', rail()).disabled).toBe(true);
    expect(button('After the turn', rail()).disabled).toBe(true);
    expect(host.querySelectorAll('.fr-recovery-comparison')).toHaveLength(1);
  });

  for (const age of ageIds) for (const phase of [4, 5]) {
    it(`${age} updates every equivalent control when switching hands at pose ${phase}`, () => {
      mount({ b3dAge: age, b3dRecView: phase }); const before = state;
      click(evidenceLabels.near[phase], study()); assertPressed('near', phase); assertCaption('near', phase);
      expect(state).toBe(before);
      click(evidenceLabels.support[phase], study()); assertPressed('support', phase); assertCaption('support', phase);
      expect(state).toBe(before);
      click(evidenceLabels.near[phase], study()); assertPressed('near', phase); assertCaption('near', phase);
      expect(state).toBe(before);
    });
  }

  it('makes legacy near and supporting comparisons select the same hand identity as study controls', () => {
    mount(); click('Inspect support before turn'); assertPressed('support', 4); assertCaption('support', 4);
    click('Inspect before the turn'); assertPressed('near', 4); assertCaption('near', 4);
    click('Inspect support after turn'); assertPressed('support', 5); assertCaption('support', 5);
    click('Inspect after the turn'); assertPressed('near', 5); assertCaption('near', 5);
  });

  it('uses the nearby pose controls to compare the selected hand without changing the other hand', () => {
    mount(); const before = state;
    click('Near hand', rail()); assertPressed('near', 4); assertCaption('near', 4);
    click('Supporting hand', rail()); assertPressed('support', 4); assertCaption('support', 4);
    expect(state).toBe(before);
    click('After the turn', rail()); expect(state.b3dRecView).toBe(5); assertPressed('support', 5); assertCaption('support', 5);
    click('Before the turn', rail()); expect(state.b3dRecView).toBe(4); assertPressed('support', 4); assertCaption('support', 4);
    unchanged(before, ['b3dRecView']);
  });

  it('places the visible caption after the stage and connects it to the stage description', () => {
    mount(); click('Near palm before turn', study());
    const element = caption(), viewerStage = stage(); expect(element.id).toBeTruthy();
    expect(viewerStage.getAttribute('aria-describedby').split(/\s+/)).toContain(element.id);
    expect(viewerStage.contains(element)).toBe(false);
    expect(viewerStage.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(element.getAttribute('aria-hidden')).not.toBe('true');
    expect(element.closest('.fr-body3d-visual')).toBe(viewerStage.closest('.fr-body3d-visual'));
  });

  it('tracks actual pose review rather than leaving an after-turn selection highlighted', () => {
    mount(); click('Supporting hand after turn', study()); assertPressed('support', 5);
    review(4); assertPressed('support', 4); assertCaption('support', 4);
    click('Previous pose'); expect(state.b3dRecView).toBe(3); assertPressed(null, null);
    expect(caption().textContent).toContain('Supporting hand');
    expect(caption().textContent).not.toContain('After the turn');
    click('Next pose'); assertPressed('support', 4); assertCaption('support', 4);
    act(() => patch({ b3dAge: 'child', b3dRecoveryGuides: true }));
    assertPressed('support', 4); assertCaption('support', 4);
  });

  it('clears hand claims when pose review reaches a pose without that hand target', () => {
    mount(); click('Supporting hand before turn', study()); review(2); clearSelection();
    click('Near palm before turn', study()); review(0); clearSelection();
    expect(state.b3dRecView).toBe(0);
    expect(button('Near palm before turn', study()).disabled).toBe(false);
    click('Near palm before turn', study()); assertPressed('near', 4); assertCaption('near', 4);
  });

  it.each(['Whole manikin', 'Head close-up', 'Side view'])('clears a comparison identity for the general camera %s', label => {
    mount(); click('Supporting hand before turn', study()); assertPressed('support', 4); const before = state;
    click(label); clearSelection(); unchanged(before);
  });

  it('clears comparison identity for button reset and keyboard zero reset', () => {
    mount(); click('Near palm before turn', study());
    const resetButton = host.querySelector('button[aria-label="Reset the view"]'); expect(resetButton).toBeTruthy();
    act(() => resetButton.click()); clearSelection();
    click('Supporting hand before turn', study());
    act(() => Simulate.keyDown(stage(), { key: '0', preventDefault() {}, stopPropagation() {} })); clearSelection();
  });

  it('clears a transient selection when leaving recovery and keeps it cleared on return', () => {
    mount(); click('Near palm before turn', study());
    click('3 · Depth + recoil'); expect(host.querySelector('.fr-recovery-comparison')).toBeNull();
    click('6 · Recovery position'); clearSelection();
    click('Supporting hand before turn', study());
    act(() => patch({ b3dTab: 'gate' })); expect(host.querySelector('.fr-recovery-comparison')).toBeNull();
    act(() => patch({ b3dTab: 'recovery' })); clearSelection();
  });

  it('blocks the after-turn pose until the turn has been completed', () => {
    mount({ b3dRec: completed.slice(0, 4) }); expect(study()).toBeNull();
    click('Inspect before the turn'); assertPressed('near', 4); assertCaption('near', 4);
    expect(button('After the turn', rail()).disabled).toBe(true);
    expect(button('Inspect after the turn').disabled).toBe(true);
    expect(button('Inspect support after turn').disabled).toBe(true);
    const before = state;
    click('After the turn', rail()); click('Inspect after the turn'); click('Inspect support after turn');
    expect(state).toBe(before); assertPressed('near', 4);
    act(() => patch({ b3dRec: completed.slice(0, 5) }));
    expect(button('After the turn', rail()).disabled).toBe(false);
    click('After the turn', rail()); assertPressed('near', 5); assertCaption('near', 5);
  });

  it('keeps written study actions usable when the renderer fails without claiming a framed hand view', () => {
    mount(); click('Near palm before turn', study());
    viewerStatus = 'failed'; act(() => patch({ b3dStatus: 'failed' })); clearSelection();
    const before = state;
    click('Supporting hand after turn', study()); expect(state.b3dRecView).toBe(5);
    clearSelection(); expect(caption().textContent.toLowerCase()).toContain('unavailable');
    expect(caption().textContent).not.toMatch(/Supporting hand\s*·\s*After/);
    unchanged(before, ['b3dRecView']);
    expect(button('Supporting hand after turn', study()).disabled).toBe(false);
    for (const field of study().querySelectorAll('fieldset')) {
      act(() => field.querySelector('input[value="unsure"]').click());
    }
    click('Check hand observations', study());
    expect(state.b3dHandStudy.adult.checked).toBe(true);
  });

  it('keeps hand observations, clinical progress and saved snapshots unchanged during comparison actions', () => {
    const handStudy = { adult: { version: 1, near: 'palm', support: 'back', checked: true, note: 'Keep the same observation.' } },
      depthInquiry = { note: 'Keep the depth evidence.' }, skills = { recovery: 3 }, progress = { firstResponse: 19 },
      badges = { safe: true }, mastery = { bleeding: 2 };
    mount({ b3dHandStudy: handStudy, b3dDepthInquiry: depthInquiry, skills, progress, badges, faMastery: mastery });
    const before = state, saved = localStorage.getItem('firstResponse.state.v1'), snapshot = window.__alloflowFirstResponse;
    click('Near palm before turn', study()); click('Supporting hand before turn', study());
    click('After the turn', rail()); click('Before the turn', rail());
    click('Whole manikin'); unchanged(before, ['b3dRecView']);
    expect(state.b3dHandStudy).toBe(handStudy); expect(state.b3dDepthInquiry).toBe(depthInquiry);
    expect(localStorage.getItem('firstResponse.state.v1')).toBe(saved);
    expect(window.__alloflowFirstResponse).toBe(snapshot);
  });
});
