import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(path => resolve(path)).find(path => existsSync(resolve(path, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const prompt = 'Follow one finger from its tip toward the wrist. Use the folds and nails to follow the same hand before and after the turn. Which side faces upward?';
const answer = 'The palm side faces upward in both poses. The folds help you follow its surface; the nails mark the back of the hand.';
let host, root, state, patch, viewerStatus, previousRegistry, update, updateMulti;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  delete window.__alloflowFirstResponse;
  previousRegistry = window.StemLab;
  viewerStatus = 'ready';
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer() {
      return { attach() {}, sync() {}, focus() {}, reset() {}, nudge() {}, zoom() {}, status: () => viewerStatus };
    },
    registerTool(id, tool) { this._registry[id] = tool; },
  };
  new Function(source)();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.StemLab = previousRegistry;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d', b3dTab: 'recovery',
      b3dStatus: 'ready', b3dRec: completed, b3dRecView: 4, ...seed });
    state = data;
    patch = values => setData(previous => ({ ...previous, ...values }));
    return window.StemLab._registry.firstResponse.render({
      React, toolData: { firstResponse: data }, update, updateMulti,
      t: (_, fallback) => fallback, addToast() {}, gradeBand: 'g68',
    });
  }
  update = vi.fn((_, key, value) => patch({ [key]: value }));
  updateMulti = vi.fn((_, values) => patch(values));
  act(() => root.render(React.createElement(Harness)));
}

function observation() { return host.querySelector('.fr-hand-landmark-observation'); }

describe('First Response finger landmark observation', () => {
  it.each([0, 1])('waits for the near-arm pose when the shown pose is %s', pose => {
    mount({ b3dRecView: pose });
    expect(observation()).toBeNull();
    expect(host.querySelector('.fr-palm-detail-comparison').textContent).not.toContain(prompt);
  });

  it.each([2, 4, 5, 8])('offers the observation at available recovery pose %s', pose => {
    mount({ b3dRecView: pose });
    expect(observation()).toBeTruthy();
    expect(host.querySelectorAll('.fr-hand-landmark-observation')).toHaveLength(1);
    expect(host.querySelector('.fr-palm-detail-comparison').textContent).toContain(prompt);
    expect(observation().textContent).toContain(answer);
  });

  it('uses the shown completed pose rather than a requested unfinished pose', () => {
    mount({ b3dRec: [], b3dRecView: 8 });
    expect(observation()).toBeNull();
    act(() => patch({ b3dRec: completed.slice(0, 1) }));
    expect(observation()).toBeNull();
    act(() => patch({ b3dRec: completed.slice(0, 2) }));
    expect(observation()).toBeTruthy();
    expect(state.b3dRec).toEqual(completed.slice(0, 2));
    expect(state.b3dRecView).toBe(8);
  });

  it.each(['ready', 'failed', 'idle', 'loading'])('keeps text observation available while the viewer is %s', status => {
    viewerStatus = status === 'failed' ? 'failed' : 'ready';
    mount({ b3dStatus: status });
    expect(observation()).toBeTruthy();
    expect(observation().querySelector('summary').textContent).toBe('Check your observation');
    expect(observation().textContent).toContain(answer);
    expect(observation().hasAttribute('disabled')).toBe(false);
    expect(observation().hasAttribute('aria-disabled')).toBe(false);
  });

  it('uses a native closed disclosure with a visible question before the answer', () => {
    mount();
    const details = observation();
    const comparison = host.querySelector('.fr-palm-detail-comparison');
    const question = [...comparison.querySelectorAll('p')].find(element => element.textContent === prompt);
    expect(details.tagName).toBe('DETAILS');
    expect(details.open).toBe(false);
    expect(details.firstElementChild.tagName).toBe('SUMMARY');
    expect(details.firstElementChild.textContent).toBe('Check your observation');
    expect(details.firstElementChild.hasAttribute('role')).toBe(false);
    expect(details.firstElementChild.hasAttribute('aria-expanded')).toBe(false);
    expect(question).toBeTruthy();
    expect(details.contains(question)).toBe(false);
    expect(question.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...details.querySelectorAll('p')].some(element => element.textContent === answer)).toBe(true);
  });

  it('renders and opens the disclosure without changing learner state', () => {
    const progress = completed.slice(0, 5);
    const depth = { age: 'child', depth: 5, lean: 1, motion: 'inspect', phase: 50, hands: true, rate: 120 };
    const inquiry = { peak: 'same', release: 'b' };
    const reference = { age: 'child', depth: 5, lean: 0 };
    mount({ b3dAge: 'child', b3dChildHands: 'one', b3dRecoveryGuides: true,
      b3dRec: progress, b3dRecView: 4, b3dDepthLab: depth, b3dDepthInquiry: inquiry, b3dDepthReference: reference });
    const before = state;
    const persisted = localStorage.getItem('firstResponse.state.v1');
    expect(update).not.toHaveBeenCalled();
    expect(updateMulti).not.toHaveBeenCalled();
    // jsdom does not establish native keyboard behavior. Exercise disclosure
    // state and its event here; the browser fixture verifies keyboard input.
    act(() => {
      observation().open = true;
      observation().dispatchEvent(new Event('toggle'));
    });
    expect(observation().open).toBe(true);
    expect(state).toBe(before);
    expect(state.b3dRec).toBe(progress);
    expect(state.b3dDepthLab).toBe(depth);
    expect(state.b3dDepthInquiry).toBe(inquiry);
    expect(state.b3dDepthReference).toBe(reference);
    expect(localStorage.getItem('firstResponse.state.v1')).toBe(persisted);
    expect(update).not.toHaveBeenCalled();
    expect(updateMulti).not.toHaveBeenCalled();
  });

  it('keeps the landmark observation within recovery', () => {
    mount({ b3dTab: 'depth' });
    for (const tab of ['depth', 'place', 'coach', 'gate', 'aed', 'call']) {
      act(() => patch({ b3dTab: tab }));
      expect(observation()).toBeNull();
      expect(host.textContent).not.toContain(prompt);
    }
  });
});
