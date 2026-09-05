import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import React from '../desktop/web-app/node_modules/react/index.js';
import { createRoot } from '../desktop/web-app/node_modules/react-dom/client.js';
import { act } from '../desktop/web-app/node_modules/react-dom/test-utils.js';

const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const view = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const block = (source, name) => {
  const start = source.indexOf('// BEGIN ' + name);
  const end = source.indexOf('// END ' + name, start);
  if (start < 0 || end < 0) throw new Error('Missing production block: ' + name);
  return source.slice(start, end);
};
const loadBundle = (target = window, sink = vi.fn()) => new Function('window', 'document', 'console', '__alloPushLog',
  block(host, 'ALLO_LIFECYCLE_DIAGNOSTICS') +
  '\nreturn { state: _alloLifecycleState, nextId: _alloLifecycleNextId, bundleId: _alloLifecycleBundleId, record: _alloLifecycleRecord };'
)(target, document, { info: vi.fn() }, sink);

const roots = [];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = '';
  delete window.__alloLifecycleDiagnostics;
});
const makeRoot = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  return root;
};
const components = bundle => new Function('React', 'useRef', 'useEffect', '_alloLifecycleNextId', '_alloLifecycleBundleId', '_alloLifecycleRecord', [
  'function Modal(props) {',
  'const pdfDocumentEpoch = props.pdfDocumentEpoch;',
  'const pdfAuditResult = { _choosing: true };',
  'const pdfAuditLoading = true;',
  block(view, 'ALLO_PDF_MODAL_LIFECYCLE'),
  "return React.createElement('div', null, 'audit');",
  '}',
  'function Host(props) {',
  'const pdfDocumentSelectionEpochRef = useRef(props.epoch);',
  'pdfDocumentSelectionEpochRef.current = props.epoch;',
  'const pdfDocumentEpochLive = props.epoch;',
  block(host, 'ALLO_PDF_HOST_LIFECYCLE'),
  'return React.createElement(Modal, { key: props.modalKey, pdfAuditLifecycle, pdfDocumentEpoch: props.epoch });',
  '}',
  'return { Host, Modal };',
].join('\n'))(React, React.useRef, React.useEffect, bundle.nextId, bundle.bundleId, bundle.record);

describe('PDF audit lifecycle diagnostics', () => {
  it('keeps bundle and root identities across repeated execution in the same window', () => {
    const target = {};
    const first = loadBundle(target);
    const container = document.createElement('div');
    first.state.roots.set(container, first.nextId('root'));
    const second = loadBundle(target);
    expect(second.state).toBe(first.state);
    expect(second.bundleId).not.toBe(first.bundleId);
    expect(second.state.roots.get(container)).toMatch(/^root-/);
    expect(second.state.events.map(e => e.event)).toEqual(['bundle executed', 'bundle executed']);
    expect(second.state.events[1].sequence).toBeGreaterThan(second.state.events[0].sequence);
    expect(loadBundle({}).state.realmId).not.toBe(first.state.realmId);
  });

  it('identifies StrictMode effect replay without claiming a new host or modal instance', () => {
    const bundle = loadBundle();
    const { Host } = components(bundle);
    const root = makeRoot();
    act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { epoch: 2 }))));
    for (const kind of ['host', 'modal']) {
      const mounts = bundle.state.events.filter(e => e.event === kind + ' mounted');
      expect(mounts).toHaveLength(2);
      expect(new Set(mounts.map(e => e[kind + 'Id'])).size).toBe(1);
      const cycle = kind === 'host' ? 'hostEffectCycle' : 'modalEffectCycle';
      expect(mounts.map(e => e[cycle])).toEqual([1, 2]);
    }
  });

  it('distinguishes a keyed modal replacement from a host remount with an epoch reset', () => {
    const bundle = loadBundle();
    const { Host } = components(bundle);
    const root = makeRoot();
    act(() => root.render(React.createElement(Host, { epoch: 2, modalKey: 'first' })));
    act(() => root.render(React.createElement(Host, { epoch: 3, modalKey: 'second' })));
    const hostMounts = () => bundle.state.events.filter(e => e.event === 'host mounted');
    const modalMounts = () => bundle.state.events.filter(e => e.event === 'modal mounted');
    expect(hostMounts()).toHaveLength(1);
    expect(modalMounts()).toHaveLength(2);
    expect(modalMounts()[0].modalId).not.toBe(modalMounts()[1].modalId);
    expect(modalMounts()[0].hostId).toBe(modalMounts()[1].hostId);
    expect(bundle.state.events.find(e => e.event === 'modal unmounted')).toMatchObject({ modalEpoch: 2 });
    act(() => root.render(null));
    act(() => root.render(React.createElement(Host, { epoch: 0, modalKey: 'third' })));
    expect(hostMounts()).toHaveLength(2);
    expect(hostMounts()[1].hostId).not.toBe(hostMounts()[0].hostId);
    expect(hostMounts()[1]).toMatchObject({ refEpoch: 0, renderEpoch: 0 });
    expect(bundle.state.events.find(e => e.event === 'host unmounted')).toMatchObject({ refEpoch: 3, renderEpoch: 3 });
  });

  it('allows the new modal instrumentation to run under an older host', () => {
    const bundle = loadBundle();
    const { Modal } = components(bundle);
    act(() => makeRoot().render(React.createElement(Modal, { pdfDocumentEpoch: 2 })));
    expect(document.body.textContent).toBe('audit');
    expect(bundle.state.events).toHaveLength(1);
  });

  it('bounds the capture and includes lifecycle events in the existing exportable log', () => {
    const sink = vi.fn();
    const bundle = loadBundle({}, sink);
    for (let i = 0; i < 250; i++) bundle.record('host epoch committed', { refEpoch: i });
    expect(bundle.state.events).toHaveLength(200);
    expect(bundle.state.events.at(-1).refEpoch).toBe(249);
    expect(sink).toHaveBeenCalledWith('info', ['[Lifecycle]', expect.objectContaining({ event: 'host epoch committed' })]);
    const failing = loadBundle({}, () => { throw new Error('log unavailable'); });
    expect(() => failing.record('modal mounted')).not.toThrow();
  });

  it('records repeated root creation attempts even with the React warning suppressed', () => {
    const bundle = loadBundle();
    const start = host.indexOf('const _alloMountApp = () => {');
    const end = host.indexOf('// Canvas localStorage hydration gate', start);
    const container = document.createElement('div');
    const fakeReactDOM = { createRoot: vi.fn(() => ({ render: vi.fn() })) };
    const mount = new Function('ReactDOM', 'React', 'container', 'AlloFlowErrorBoundary', 'App',
      '_alloLifecycleNextId', '_alloLifecycleState', '_alloLifecycleRecord', 'console',
      host.slice(start, end) + '\nreturn _alloMountApp;'
    )(fakeReactDOM, React, container, () => null, () => null, bundle.nextId, bundle.state, bundle.record, { error: vi.fn() });
    mount();
    mount();
    const requests = bundle.state.events.filter(e => e.event === 'root creation requested');
    expect(requests).toHaveLength(2);
    expect(requests[0].previousRootId).toBeNull();
    expect(requests[1].previousRootId).toBe(requests[0].rootId);
    expect(fakeReactDOM.createRoot).toHaveBeenCalledTimes(2);
  });
});
