// makeOrbitViewer status subscriber (2026-11-04): a tool that keeps its viewer
// across a real detach, or subscribes after ready, still hears status changes.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SRC = 'stem_lab/stem_lab_module.js';
const source = fs.readFileSync(SRC, 'utf8');

function fakeThree() {
  function Vec() { this.x = 0; this.y = 0; this.z = 0; }
  Vec.prototype.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; return this; };
  function Group() { this.children = []; }
  Group.prototype.add = function (c) { this.children.push(c); };
  Group.prototype.remove = function (c) { this.children.splice(this.children.indexOf(c), 1); };
  Group.prototype.traverse = function (fn) { fn(this); this.children.forEach(fn); };
  return {
    Vector3: Vec, Group, Scene: Group,
    PerspectiveCamera: function () { this.position = new Vec(); this.up = new Vec(); },
    WebGLRenderer: function () {
      this.domElement = document.createElement('canvas');
      this.setPixelRatio = this.setSize = this.setClearColor = this.render = () => {};
      this.forceContextLoss = this.dispose = () => {};
    }
  };
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const loseContext = (host) => host.querySelector('canvas')
  .dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

let saved, viewers;
beforeEach(() => {
  saved = { StemLab: window.StemLab, AlloModules: window.AlloModules,
    raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
  // Lifecycle only: frame() needs a real THREE, so never let it run.
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  window.StemLab = undefined;
  window.AlloModules = {};
  // eslint-disable-next-line no-new-func
  new Function(source)();
  const three = fakeThree();
  window.StemLab.ensureThree = () => Promise.resolve(three);
  viewers = [];
});
afterEach(() => {
  viewers.forEach((v) => { try { v.dispose(); } catch (e) {} });
  document.body.innerHTML = '';
  window.StemLab = saved.StemLab;
  window.AlloModules = saved.AlloModules;
  globalThis.requestAnimationFrame = saved.raf;
  globalThis.cancelAnimationFrame = saved.caf;
});
function viewer() { const v = window.StemLab.makeOrbitViewer({ build() {} }); viewers.push(v); return v; }
function host() { const h = document.createElement('div'); document.body.appendChild(h); return h; }

describe('makeOrbitViewer status subscriber', () => {
  it('keeps a once-made subscription across a real detach and a later re-attach (3D -> 2D -> 3D)', async () => {
    const v = viewer(), seen = [];
    v.onStatusChange((s) => seen.push(s));
    v.attach(host()); await flush();
    v.attach(null); await flush();          // the host is gone for longer than one commit
    const h2 = host();
    v.attach(h2); await flush();
    loseContext(h2);
    expect(v.status()).toBe('failed');
    expect(seen).toEqual(['loading', 'ready', 'loading', 'ready', 'failed']);
  });

  it('tells a subscriber that arrives after the async flip what the state already is', async () => {
    const v = viewer(), seen = [];
    v.attach(host()); await flush();        // 'ready' before an effect subscribes
    v.onStatusChange((s) => seen.push(s));
    expect(seen).toEqual(['ready']);
  });

  it('does not call back from inside a render-body re-subscribe (no render-phase setState)', async () => {
    const v = viewer(), seen = [];
    const render = () => v.onStatusChange((s) => seen.push(s));
    render(); v.attach(host()); await flush();
    const n = seen.length;
    render(); render(); render();           // every re-render subscribes a new closure
    expect(seen.length).toBe(n);
  });

  it('says nothing at subscribe time while idle', () => {
    const v = viewer(), seen = [];
    v.onStatusChange((s) => seen.push(s));
    expect(seen).toEqual([]);
  });

  it('still keeps the subscriber through a same-commit detach/re-attach', async () => {
    const v = viewer(), seen = [];
    v.onStatusChange((s) => seen.push(s));
    const h = host();
    v.attach(h); v.attach(null); v.attach(h); await flush();
    expect(seen.at(-1)).toBe('ready');
  });

  it('delivers nothing while detached, so an unmounted tool is never called', async () => {
    let resolveLate;
    window.StemLab.ensureThree = () => new Promise((r) => { resolveLate = r; });
    const v = viewer(), seen = [];
    v.onStatusChange((s) => seen.push(s));
    v.attach(host());
    v.attach(null); await flush();          // unmounted mid-load
    const n = seen.length;
    resolveLate(fakeThree()); await flush();
    expect(seen.length).toBe(n);
    expect(v.status()).toBe('idle');
  });

  it('releases the subscriber on dispose() and on onStatusChange(null)', async () => {
    const v = viewer(), seen = [];
    v.onStatusChange((s) => seen.push(s));
    const h = host();
    v.attach(h); await flush();
    v.onStatusChange(null);
    loseContext(h);
    expect(seen).toEqual(['loading', 'ready']);
    const v2 = viewer(), seen2 = [];
    v2.onStatusChange((s) => seen2.push(s));
    const h2 = host();
    v2.attach(h2); await flush();
    const canvas = h2.querySelector('canvas');
    v2.dispose();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(seen2).toEqual(['loading', 'ready']);
  });

  it('a callback that re-subscribes itself during catch-up is bounded', async () => {
    const v = viewer();
    v.attach(host()); await flush();
    let calls = 0;
    const fn = () => { calls++; v.onStatusChange(null); v.onStatusChange(fn); };
    v.onStatusChange(fn);
    expect(calls).toBe(1);
  });
});
