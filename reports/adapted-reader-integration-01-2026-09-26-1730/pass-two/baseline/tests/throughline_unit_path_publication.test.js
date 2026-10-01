// Focused contract tests for Throughline's optional Learning Web publication.
// The host callback is intentionally absent from existing integrations, so these
// tests mount the real component and pin the payload, debounce, bounds, exact
// resource identity, callback-churn behavior, and failure isolation.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import {
  React, clearStorage, sampleHistory, sampleUnit, sampleUnits, seedStorage, setupThroughline,
} from './helpers/throughline_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));
const noop = () => {};

function props(over) {
  return Object.assign({
    isOpen: true,
    onClose: noop,
    addToast: noop,
    studentNickname: '',
    t: (key) => key,
    history: sampleHistory(),
  }, over || {});
}

function mount(over) {
  const Component = setupThroughline();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current = props(over);
  act(() => { root.render(React.createElement(Component, current)); });
  return {
    host,
    rerender(next) {
      current = props(Object.assign({}, current, next || {}));
      act(() => { root.render(React.createElement(Component, current)); });
    },
    cleanup() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

async function advance(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function findButton(host, text) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(text));
}

async function confirmDialog(text) {
  const overlay = document.querySelector('[data-throughline-confirm="true"]');
  expect(overlay).toBeTruthy();
  const confirm = Array.from(overlay.querySelectorAll('button')).find((node) => node.textContent === text);
  expect(confirm).toBeTruthy();
  await act(async () => { confirm.click(); await Promise.resolve(); });
}

async function clearUnitThroughUi(mounted) {
  const clear = findButton(mounted.host, 'throughline.clear');
  expect(clear).toBeTruthy();
  act(() => { clear.click(); });
  await confirmDialog('Clear unit');
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('Throughline unit-path publication', () => {
  beforeEach(() => {
    clearStorage();
    vi.useFakeTimers();
    if (window.AlloModules) delete window.AlloModules.ConceptGraphEngine;
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('publishes a stable bounded acg/v1 payload with exact resource IDs after the debounce', async () => {
    const unit = sampleUnit();
    unit.nodes[0].bundledLessonIds = ['h3', 'h2', 'h3'];
    unit.nodes.push({ nodeId: 'n0', lessonId: null, x: 20, y: 300, description: 'Future investigation', role: '', status: 'planned', category: null });
    unit.edges.push({ from: 'n0', to: 'n1', type: 'prerequisite' });
    seedStorage(unit);
    const published = [];
    const mounted = mount({ onRegisterUnitPathGraph: (payload) => { published.push(payload); return true; } });

    await advance(299);
    expect(published).toHaveLength(0);
    await advance(1);
    expect(published).toHaveLength(1);

    const payload = published[0];
    expect(payload.id).toBe('unit-path:tl_fixture1');
    expect(payload.title).toBe('The Water Cycle');
    expect(payload.resourceRefs).toEqual(['h1', 'h2', 'h3']);
    expect(payload.graph).toMatchObject({ version: 'acg/v1', title: 'The Water Cycle' });
    expect(payload.graph.meta.throughline).toMatchObject({ unitId: 'tl_fixture1', sourceUnitId: 'u_fix' });
    expect(payload.graph.nodes.map((node) => node.id)).toEqual(['n0', 'n1', 'n2']);
    expect(payload.graph.nodes.find((node) => node.id === 'n1')).toMatchObject({ resourceId: 'h1', resourceTitle: 'Source Intro', resourceType: 'analysis' });
    expect(payload.graph.nodes.find((node) => node.id === 'n2')).toMatchObject({ resourceId: 'h2', resourceTitle: 'Key Terms', resourceType: 'glossary' });
    expect(payload.graph.nodes.find((node) => node.id === 'n0')).not.toHaveProperty('resourceId');
    expect(payload.graph.nodes.length).toBeLessThanOrEqual(240);
    expect(payload.graph.edges.length).toBeLessThanOrEqual(480);
    mounted.cleanup();
  });

  it('canonicalizes arbitrary imported unit IDs while preserving exact identity metadata', async () => {
    const cases = [
      { key: 'ordinary', value: 'tl_fixture1', expected: 'unit-path:tl_fixture1' },
      { key: 'spaces', value: 'Water Cycle / Grade 5' },
      { key: 'unicode', value: '课程/水循环/💧' },
      { key: 'slashes', value: 'district/school/unit' },
      { key: 'overlong', value: 'x'.repeat(220) },
    ];
    const ids = {};
    for (const entry of cases) {
      clearStorage();
      const unit = sampleUnit();
      unit.unitId = entry.value;
      seedStorage(unit);
      let firstPayload = null;
      const firstMount = mount({ onRegisterUnitPathGraph: (payload) => { firstPayload = payload; return true; } });
      await advance(300);
      expect(firstPayload).toBeTruthy();
      expect(firstPayload.id).toMatch(/^unit-path:[A-Za-z0-9._:-]{1,180}$/);
      expect(firstPayload.id.length).toBeLessThanOrEqual(190);
      expect(firstPayload.graph.meta.throughline.unitId).toBe(entry.value);
      expect(firstPayload.graph.meta.throughline.publicationId).toBe(firstPayload.id);
      if (entry.expected) expect(firstPayload.id).toBe(entry.expected);
      ids[entry.key] = firstPayload.id;
      firstMount.cleanup();

      clearStorage();
      seedStorage(unit);
      let repeatedId = null;
      const secondMount = mount({ onRegisterUnitPathGraph: (payload) => { repeatedId = payload.id; return true; } });
      await advance(300);
      expect(repeatedId).toBe(firstPayload.id);
      secondMount.cleanup();
    }
    expect(new Set(Object.values(ids)).size).toBe(cases.length);
  });

  it('uses the latest callback without republishing unchanged content, then republishes a meaningful edit', async () => {
    seedStorage(sampleUnit());
    const first = vi.fn(() => true);
    const second = vi.fn(() => true);
    const third = vi.fn(() => true);
    const mounted = mount({ onRegisterUnitPathGraph: first });

    mounted.rerender({ onRegisterUnitPathGraph: second });
    await advance(300);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    mounted.rerender({ onRegisterUnitPathGraph: third });
    await advance(600);
    expect(third).not.toHaveBeenCalled();

    const heading = Array.from(mounted.host.querySelectorAll('div')).find((node) => node.textContent === 'The Water Cycle');
    expect(heading).toBeTruthy();
    act(() => { heading.click(); });
    const titleInput = mounted.host.querySelector('#tl-unit-title');
    expect(titleInput).toBeTruthy();
    setInput(titleInput, 'Water Systems');
    setInput(titleInput, 'Water Systems and Change');
    await advance(299);
    expect(third).not.toHaveBeenCalled();
    await advance(1);
    expect(third).toHaveBeenCalledTimes(1);
    expect(third.mock.calls[0][0]).toMatchObject({ id: 'unit-path:tl_fixture1', title: 'Water Systems and Change' });
    mounted.cleanup();
  });

  it('retries transient false and rejection results, then stops after host success', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedStorage(sampleUnit());
    let syncAttempt = 0;
    const syncCallback = vi.fn(() => { syncAttempt += 1; return syncAttempt > 1; });
    const syncMount = mount({ onRegisterUnitPathGraph: syncCallback });
    await advance(300);
    expect(syncCallback).toHaveBeenCalledTimes(1);
    await advance(249);
    expect(syncCallback).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(syncCallback).toHaveBeenCalledTimes(2);
    await advance(2000);
    expect(syncCallback).toHaveBeenCalledTimes(2);
    syncMount.cleanup();

    clearStorage();
    seedStorage(sampleUnit());
    let asyncAttempt = 0;
    const asyncCallback = vi.fn(() => { asyncAttempt += 1; return asyncAttempt === 1 ? Promise.reject(new Error('temporary')) : Promise.resolve(); });
    const asyncMount = mount({ onRegisterUnitPathGraph: asyncCallback });
    await advance(300);
    expect(asyncCallback).toHaveBeenCalledTimes(1);
    await advance(250);
    expect(asyncCallback).toHaveBeenCalledTimes(2);
    await advance(2000);
    expect(asyncCallback).toHaveBeenCalledTimes(2);
    asyncMount.cleanup();
    warn.mockRestore();
  });

  it('cancels stale retries on content edit and unmount', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedStorage(sampleUnit());
    const titles = [];
    const editCallback = vi.fn((payload) => { titles.push(payload.title); return titles.length > 1; });
    const editMount = mount({ onRegisterUnitPathGraph: editCallback });
    await advance(300);
    expect(titles).toEqual(['The Water Cycle']);
    const heading = Array.from(editMount.host.querySelectorAll('div')).find((node) => node.textContent === 'The Water Cycle');
    act(() => { heading.click(); });
    const titleInput = editMount.host.querySelector('#tl-unit-title');
    setInput(titleInput, 'A Changed Unit');
    await advance(250);
    expect(titles).toEqual(['The Water Cycle']);
    await advance(50);
    expect(titles).toEqual(['The Water Cycle', 'A Changed Unit']);
    await advance(1000);
    expect(editCallback).toHaveBeenCalledTimes(2);
    editMount.cleanup();

    clearStorage();
    seedStorage(sampleUnit());
    const unmountCallback = vi.fn(() => false);
    const unmount = mount({ onRegisterUnitPathGraph: unmountCallback });
    await advance(300);
    expect(unmountCallback).toHaveBeenCalledTimes(1);
    unmount.cleanup();
    await advance(2000);
    expect(unmountCallback).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('uses the latest callback during retry churn and does not republish after success', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedStorage(sampleUnit());
    const first = vi.fn(() => false);
    const second = vi.fn(() => true);
    const third = vi.fn(() => true);
    const mounted = mount({ onRegisterUnitPathGraph: first });
    await advance(300);
    expect(first).toHaveBeenCalledTimes(1);
    mounted.rerender({ onRegisterUnitPathGraph: second });
    await advance(250);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    mounted.rerender({ onRegisterUnitPathGraph: third });
    await advance(2000);
    expect(third).not.toHaveBeenCalled();
    mounted.cleanup();
    warn.mockRestore();
  });

  it('bounds nodes and edges deterministically and never leaves dangling edges', async () => {
    const unit = sampleUnit();
    unit.nodes = Array.from({ length: 250 }, (_, index) => ({
      nodeId: 'n' + String(index).padStart(3, '0'),
      lessonId: 'h' + String(index).padStart(3, '0'),
      x: index * 10,
      y: (index % 4) * 100,
      description: '',
      role: '',
      status: 'draft',
      category: index % 2 ? 'B' : 'A',
    }));
    unit.edges = Array.from({ length: 700 }, (_, index) => {
      const from = index % 240;
      let to = (index * 7 + 1) % 240;
      if (to === from) to = (to + 1) % 240;
      return { from: 'n' + String(from).padStart(3, '0'), to: 'n' + String(to).padStart(3, '0'), type: index % 2 ? 'sequence' : 'prerequisite' };
    });
    seedStorage(unit);
    const callback = vi.fn(() => true);
    const mounted = mount({ history: [], onRegisterUnitPathGraph: callback });
    await advance(300);
    const graph = callback.mock.calls[0][0].graph;
    expect(graph.nodes).toHaveLength(240);
    expect(graph.edges).toHaveLength(480);
    expect(graph.nodes.map((node) => node.id)).toEqual(graph.nodes.map((node) => node.id).slice().sort());
    const ids = new Set(graph.nodes.map((node) => node.id));
    expect(graph.edges.every((edge) => ids.has(edge.fromId) && ids.has(edge.toId))).toBe(true);
    mounted.cleanup();
  });

  it('does not publish empty graphs and caps terminal throw/rejection retries without unhandled errors', async () => {
    const emptyCallback = vi.fn();
    const empty = mount({ onRegisterUnitPathGraph: emptyCallback });
    await advance(2000);
    expect(emptyCallback).not.toHaveBeenCalled();
    empty.cleanup();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedStorage(sampleUnit());
    const throwingCallback = vi.fn(() => { throw new Error('sync failure'); });
    const throwing = mount({ onRegisterUnitPathGraph: throwingCallback });
    await expect(advance(300)).resolves.toBeUndefined();
    await expect(advance(250)).resolves.toBeUndefined();
    await expect(advance(500)).resolves.toBeUndefined();
    await expect(advance(2000)).resolves.toBeUndefined();
    expect(throwingCallback).toHaveBeenCalledTimes(3);
    throwing.cleanup();

    clearStorage();
    seedStorage(sampleUnit());
    const rejectingCallback = vi.fn(() => Promise.reject(new Error('async failure')));
    const rejecting = mount({ onRegisterUnitPathGraph: rejectingCallback });
    await expect(advance(300)).resolves.toBeUndefined();
    await expect(advance(250)).resolves.toBeUndefined();
    await expect(advance(500)).resolves.toBeUndefined();
    await expect(advance(2000)).resolves.toBeUndefined();
    expect(rejectingCallback).toHaveBeenCalledTimes(3);
    rejecting.cleanup();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('retires a cleared hostile-ID path only after atomic empty persistence, with exact scope', async () => {
    const unit = sampleUnit();
    unit.unitId = '课程 / Water path 💧';
    seedStorage(unit);
    const scopeId = 'workspace:clear';
    const register = vi.fn(() => ({ scopeId }));
    const unregister = vi.fn(() => true);
    const mounted = mount({ unitPathScopeId: scopeId, onRegisterUnitPathGraph: register, onUnregisterUnitPathGraph: unregister });
    await clearUnitThroughUi(mounted);
    await advance(0);
    expect(register).not.toHaveBeenCalled();
    const publishedId = unregister.mock.calls[0][0].id;
    expect(publishedId).toMatch(/^unit-path:[A-Za-z0-9._:-]{1,180}$/);
    expect(unregister).toHaveBeenCalledWith({ id: publishedId, reason: 'cleared', scopeId });
    const stored = JSON.parse(localStorage.getItem('alloflow_throughline_v1'));
    expect(stored.nodes).toEqual([]);
    expect(stored.learningWebRetirements).toEqual([]);
    mounted.cleanup();
  });

  it('retires delete-last as emptied, but close, unmount, and replacement never retire paths', async () => {
    const one = sampleUnit(); one.nodes = [one.nodes[0]]; one.edges = []; seedStorage(one);
    const scopeId = 'workspace:lifecycle';
    const unregister = vi.fn(() => true);
    const mounted = mount({ units: sampleUnits(), seedUnitId: null, unitPathScopeId: scopeId, onRegisterUnitPathGraph: () => ({ scopeId }), onUnregisterUnitPathGraph: unregister });
    await advance(300);
    const card = mounted.host.querySelector('[role="group"]');
    expect(card).toBeTruthy();
    act(() => { card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); });
    await advance(0);
    expect(unregister).toHaveBeenCalledWith({ id: 'unit-path:tl_fixture1', reason: 'emptied', scopeId });
    mounted.cleanup();

    clearStorage(); seedStorage(sampleUnit()); unregister.mockClear();
    const replacement = mount({ units: sampleUnits(), seedUnitId: null, unitPathScopeId: scopeId, onRegisterUnitPathGraph: () => ({ scopeId }), onUnregisterUnitPathGraph: unregister });
    await advance(300);
    replacement.rerender({ seedUnitId: 'u_other' });
    await confirmDialog('Replace canvas');
    await advance(600);
    expect(unregister).not.toHaveBeenCalled();
    replacement.rerender({ isOpen: false });
    await advance(1000);
    expect(unregister).not.toHaveBeenCalled();
    replacement.cleanup();
    await advance(1000);
    expect(unregister).not.toHaveBeenCalled();
  });

  it('retries async false/rejection, accepts fulfilled undefined, and cancels retries on unmount', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedStorage(sampleUnit());
    const scopeId = 'workspace:retry';
    let attempt = 0;
    const unregister = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return Promise.resolve(false);
      if (attempt === 2) return Promise.reject(new Error('temporary'));
      return Promise.resolve();
    });
    const mounted = mount({ unitPathScopeId: scopeId, onRegisterUnitPathGraph: () => ({ scopeId }), onUnregisterUnitPathGraph: unregister });
    await advance(300); await clearUnitThroughUi(mounted); await advance(0);
    expect(unregister).toHaveBeenCalledTimes(1);
    await advance(250); expect(unregister).toHaveBeenCalledTimes(2);
    await advance(500); expect(unregister).toHaveBeenCalledTimes(3);
    await advance(1000); expect(unregister).toHaveBeenCalledTimes(3);
    mounted.cleanup();

    clearStorage(); seedStorage(sampleUnit());
    const alwaysFalse = vi.fn(() => false);
    const cancel = mount({ unitPathScopeId: scopeId, onRegisterUnitPathGraph: () => ({ scopeId }), onUnregisterUnitPathGraph: alwaysFalse });
    await advance(300); await clearUnitThroughUi(cancel); await advance(0);
    expect(alwaysFalse).toHaveBeenCalledTimes(1);
    cancel.cleanup(); await advance(2000);
    expect(alwaysFalse).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('persists failed retirement for remount, requeues on callback identity, and never trusts imported markers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    seedStorage(sampleUnit());
    const scopeId = 'workspace:durable';
    const fail = vi.fn(() => false);
    const first = mount({ unitPathScopeId: scopeId, onRegisterUnitPathGraph: () => ({ scopeId }), onUnregisterUnitPathGraph: fail });
    await advance(300); await clearUnitThroughUi(first); await advance(0); await advance(250); await advance(500);
    expect(fail).toHaveBeenCalledTimes(3);
    let stored = JSON.parse(localStorage.getItem('alloflow_throughline_v1'));
    expect(stored.learningWebRetirements).toEqual([{ id: 'unit-path:tl_fixture1', scopeId, reason: 'cleared' }]);
    const success = vi.fn(() => true);
    first.rerender({ onUnregisterUnitPathGraph: success });
    await advance(0);
    expect(success).toHaveBeenCalledTimes(1);
    first.cleanup();

    const malicious = sampleUnit();
    malicious.learningWebRetirements = [{ id: 'unit-path:victim', scopeId: 'workspace:victim', reason: 'cleared' }];
    localStorage.setItem('alloflow_throughline_v1', JSON.stringify({ ...malicious, nodes: [], edges: [], learningWebRetirements: [{ id: 'unit-path:tl_fixture1', scopeId, reason: 'cleared' }] }));
    const remountUnregister = vi.fn(() => true);
    const remount = mount({ unitPathScopeId: scopeId, onUnregisterUnitPathGraph: remountUnregister });
    await advance(0);
    expect(remountUnregister).toHaveBeenCalledWith({ id: 'unit-path:tl_fixture1', scopeId, reason: 'cleared' });
    expect(remountUnregister).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'unit-path:victim' }));
    remount.cleanup(); warn.mockRestore();
  });

  it('does not unregister if atomic empty persistence fails', async () => {
    seedStorage(sampleUnit());
    const scopeId = 'workspace:quota';
    const unregister = vi.fn(() => true);
    const mounted = mount({ unitPathScopeId: scopeId, onRegisterUnitPathGraph: () => ({ scopeId }), onUnregisterUnitPathGraph: unregister });
    await advance(300);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await clearUnitThroughUi(mounted); await advance(1000);
    expect(unregister).not.toHaveBeenCalled();
    spy.mockRestore(); warn.mockRestore(); mounted.cleanup();
  });

  it('preserves pending retirements across replacement and keeps private markers out of graph payloads', async () => {
    const unit = sampleUnit();
    unit.learningWebRetirements = [{ id: 'unit-path:older', scopeId: 'workspace:old', reason: 'cleared' }];
    seedStorage(unit);
    const scopeId = 'workspace:new';
    const register = vi.fn(() => ({ scopeId }));
    const mounted = mount({ units: sampleUnits(), unitPathScopeId: scopeId, onRegisterUnitPathGraph: register, onUnregisterUnitPathGraph: () => false });
    await advance(300);
    expect(register.mock.calls[0][0].graph.meta.throughline).not.toHaveProperty('learningWebRetirements');
    mounted.rerender({ seedUnitId: 'u_other' });
    await confirmDialog('Replace canvas'); await advance(0);
    const stored = JSON.parse(localStorage.getItem('alloflow_throughline_v1'));
    expect(stored.learningWebRetirements).toEqual([{ id: 'unit-path:older', scopeId: 'workspace:old', reason: 'cleared' }]);
    mounted.cleanup();
  });

  it('ignores imported retirement commands and omits local tombstones from exported files', async () => {
    const scopeId = 'workspace:io';
    const unregister = vi.fn(() => true);
    const register = vi.fn(() => ({ scopeId }));
    const mounted = mount({ unitPathScopeId: scopeId, onRegisterUnitPathGraph: register, onUnregisterUnitPathGraph: unregister });
    const malicious = sampleUnit();
    malicious.learningWebRetirements = [{ id: 'unit-path:victim', scopeId, reason: 'cleared' }];
    class ImmediateFileReader {
      readAsText(file) { this.onload({ target: { result: file.contents } }); }
    }
    vi.stubGlobal('FileReader', ImmediateFileReader);
    const input = mounted.host.querySelector('input[aria-label="throughline.import_title"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ contents: JSON.stringify({ unitLayout: malicious }) }] });
    await act(async () => {
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
      await Promise.resolve(); await Promise.resolve();
    });
    await advance(300);
    expect(unregister).not.toHaveBeenCalled();
    expect(register.mock.calls[0][0].graph.meta.throughline).not.toHaveProperty('learningWebRetirements');

    let exported = null;
    class CaptureBlob {
      constructor(parts) { exported = parts.join(''); }
    }
    vi.stubGlobal('Blob', CaptureBlob);
    const oldCreate = URL.createObjectURL;
    const oldRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:unit-test';
    URL.revokeObjectURL = () => {};
    const click = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    act(() => { findButton(mounted.host, 'throughline.export').click(); });
    expect(JSON.parse(exported).unitLayout).not.toHaveProperty('learningWebRetirements');
    click.mockRestore();
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
    vi.unstubAllGlobals();
    mounted.cleanup();
  });
  it('uses current scope for delete-last and compensates an in-flight same-ID revival by republishing', async () => {
    const unit = sampleUnit(); unit.nodes = [unit.nodes[0]]; unit.edges = []; seedStorage(unit);
    const pending = deferred();
    const registerOrder = [];
    const register = vi.fn((payload) => { registerOrder.push('register:' + payload.scopeId); return { scopeId: payload.scopeId }; });
    const unregister = vi.fn(() => { registerOrder.push('unregister'); return pending.promise; });
    const mounted = mount({ unitPathScopeId: 'workspace:first', onRegisterUnitPathGraph: register, onUnregisterUnitPathGraph: unregister });
    await advance(300);
    mounted.rerender({ unitPathScopeId: 'workspace:second' });
    await advance(300);
    const card = mounted.host.querySelector('[role="group"]');
    act(() => { card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete', bubbles: true })); });
    await advance(0);
    expect(unregister).toHaveBeenCalledWith({ id: 'unit-path:tl_fixture1', reason: 'emptied', scopeId: 'workspace:second' });

    const add = findButton(mounted.host, 'throughline.add_node');
    act(() => { add.click(); });
    const canvas = mounted.host.querySelector('svg[aria-label="throughline.canvas_aria"]');
    act(() => { canvas.dispatchEvent(new window.MouseEvent('click', { clientX: 300, clientY: 300, bubbles: true })); });
    await advance(600);
    const beforeResolve = register.mock.calls.length;
    await act(async () => { pending.resolve(); await Promise.resolve(); await Promise.resolve(); });
    await advance(300);
    expect(register.mock.calls.length).toBeGreaterThan(beforeResolve);
    expect(registerOrder[registerOrder.length - 1]).toBe('register:workspace:second');
    const stored = JSON.parse(localStorage.getItem('alloflow_throughline_v1'));
    expect(stored.learningWebRetirements).toEqual([]);
    mounted.cleanup();
  });
});
