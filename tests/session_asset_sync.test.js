import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const store = new Map();
const clone = (value) => structuredClone(value);
const docKey = (...parts) => parts.join('/');

beforeAll(() => {
  class TestComponent {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(next) {
      this.state = { ...this.state, ...(typeof next === 'function' ? next(this.state, this.props) : next) };
    }
  }

  window.React = {
    Component: TestComponent,
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  window.AlloLanguageContext = {};
  window.doc = (_db, ...parts) => docKey(...parts);
  window.db = {};
  window.setDoc = async (ref, data) => {
    store.set(ref, clone(data));
  };
  window.getDoc = async (ref) => ({
    exists: () => store.has(ref),
    data: () => clone(store.get(ref)),
  });
  window.warnLog = () => {};

  loadAlloModule('module_scope_extras_module.js');
});

beforeEach(() => {
  store.clear();
});

describe('session resource asset sync', () => {
  it('externalizes even small live-session resources and hydrates them back', async () => {
    const resources = [
      { id: 'small-text', type: 'leveled-text', title: 'Small Text', data: { text: 'Hello class' } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect(manifest).toHaveLength(1);
    expect(manifest[0].__alloResourceRef).toBeTruthy();
    expect(manifest[0].data).toBeUndefined();
    expect(JSON.stringify(manifest).length).toBeLessThan(JSON.stringify(resources).length + 200);
    expect([...store.values()].some((entry) => entry.kind === 'sessionResource')).toBe(true);

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('chunks a single oversized resource body and hydrates the full resource', async () => {
    const resources = [
      { id: 'big-text', type: 'document', title: 'Big Text', data: { text: 'X'.repeat(450000) } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect(manifest).toHaveLength(1);
    expect(manifest[0].__alloResourceRef).toBeTruthy();
    expect([...store.values()].some((entry) => entry.kind === 'sessionResourceChunks')).toBe(true);

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('chunks large image assets and restores them after resource hydration', async () => {
    const imageUrl = 'data:image/png;base64,' + 'A'.repeat(420000);
    const resources = [
      { id: 'diagram', type: 'image', title: 'Diagram', data: { prompt: 'Show the water cycle', imageUrl } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect([...store.values()].some((entry) => entry.kind === 'sessionImageChunks')).toBe(true);
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('uses a chunked manifest when even the resource-ref index is too large', async () => {
    const resources = Array.from({ length: 30 }, (_, index) => ({
      id: `resource-${index}`,
      type: 'resource',
      title: `Long Title ${index} ` + 'T'.repeat(25000),
      data: { text: `resource ${index}` },
    }));

    const manifestPointer = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect(manifestPointer).toHaveLength(1);
    expect(manifestPointer[0].__alloResourcesManifestRef).toBeTruthy();
    expect([...store.values()].some((entry) => entry.kind === 'sessionResourcesManifestChunks')).toBe(true);
    expect(JSON.stringify(manifestPointer).length).toBeLessThan(2000);

    const hydrated = await window.hydrateSessionAssets('app-test', manifestPointer);
    expect(hydrated).toEqual(resources);
  });

  it('does not sync raw audio recordings as live-session resource assets', async () => {
    const resources = [
      { id: 'voice', type: 'fluency-record', data: { metrics: { wcpm: 91 }, audioRecording: 'data:audio/webm;base64,' + 'B'.repeat(1000), mimeType: 'audio/webm' } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);

    expect(JSON.stringify([...store.values()])).not.toContain('data:audio/webm;base64');
    expect(hydrated[0].data.metrics).toEqual({ wcpm: 91 });
    expect(hydrated[0].data.audioRecording).toBeUndefined();
    expect(hydrated[0].data.mimeType).toBeUndefined();
  });
});