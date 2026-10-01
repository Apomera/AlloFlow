import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Generative Art playback and workspace controls', () => {
  let config, host, root, latest, edit, frames, images, hidden, toast, announcements, sequence;
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    hidden = false; sequence = 0; frames = new Map(); images = []; toast = vi.fn(); announcements = vi.fn();
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++sequence, callback); return sequence; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      if (this._ctx) return this._ctx;
      const ctx = { fingerprint: 2166136261 };
      for (const name of ['arc', 'beginPath', 'fill', 'fillRect']) ctx[name] = (...args) => {
        for (const ch of JSON.stringify([name, args, ctx.fillStyle, ctx.globalCompositeOperation])) ctx.fingerprint = Math.imul(ctx.fingerprint ^ ch.charCodeAt(0), 16777619) >>> 0;
      };
      ctx.drawImage = image => { ctx.fingerprint = image.fingerprint; };
      this._ctx = ctx; return ctx;
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () { return 'data:image/png;base64,' + btoa(String(this.getContext('2d').fingerprint)); });
    vi.stubGlobal('Image', class { set src(value) { this.fingerprint = Number(atob(value.split(',')[1])); images.push(this); } });
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  async function mount(initial = {}) {
    function App() {
      const [data, setData] = React.useState({ artStudio: { tab: 'generative', studioHome: false, studioStarted: true, genStyle: 'rain', genSeed: 314, genDensity: 20, genPaused: true, ...initial } });
      latest = data.artStudio; edit = patch => setData(previous => ({ artStudio: { ...previous.artStudio, ...patch } }));
      return config.render(makeCtx({ toolData: data, setToolData: setData, activeProfileId: data.artStudio.testProfile || 'gen-a', addToast: toast, announceToSR: announcements }));
    }
    await act(async () => root.render(React.createElement(App)));
  }
  const canvas = () => host.querySelector('#genCanvas');
  const capture = () => canvas()._captureArtStudioState();
  const patch = values => act(async () => edit(values));
  async function click(text) {
    const button = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
    expect(button).toBeTruthy(); await act(async () => button.click());
  }
  async function frame(time) { await act(async () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(callback => callback(time)); }); }
  async function playSecond(rate) { await frame(0); for (let i = 1; i <= rate; i++) await frame(i * 1000 / rate); }
  async function decode() { await act(async () => images.splice(0).forEach(image => image.onload?.())); }
  const burst = () => canvas().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

  it.each(['flow', 'rain', 'stars', 'aurora'])('produces identical %s particles and paint at 60, 120, and 144 Hz', async style => {
    await mount({ genStyle: style, genPaused: false }); await playSecond(60); const reference = capture(); expect(reference.genFrame).toBe(60);
    for (const refreshRate of [120, 144]) { await click('Same seed'); await patch({ genPaused: false }); await playSecond(refreshRate); expect(capture()).toEqual(reference); }
  });
  it('changes playback speed without replacing the canvas or moving the paused artwork', async () => {
    await mount(); await click('+100 steps'); const original = canvas(), before = capture();
    await patch({ genSpeed: 2 }); expect(canvas()).toBe(original); expect(capture().genSnapshot).toBe(before.genSnapshot); expect(capture().genState).toEqual(before.genState);
    await patch({ genPaused: false }); await playSecond(120); expect(capture().genFrame).toBe(220);
    await click('Same seed'); await patch({ genSpeed: 0.25, genPaused: false }); await playSecond(60); expect(capture().genFrame).toBe(15);
  });
  it('idles while paused or hidden and starts a fresh time anchor when resumed', async () => {
    await mount(); expect(canvas()._genAnim).toBeNull();
    await patch({ genPaused: false }); await frame(100); await frame(150); expect(capture().genFrame).toBe(3);
    await patch({ genPaused: true }); const frozen = capture(); expect(canvas()._genAnim).toBeNull(); await frame(9000); expect(capture()).toEqual(frozen);
    await patch({ genPaused: false }); await frame(10000); expect(capture().genFrame).toBe(3);
    await act(async () => { hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    expect(canvas()._genAnim).toBeNull(); await frame(20000); expect(capture().genFrame).toBe(3);
    await act(async () => { hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
    await frame(30000); await frame(30050); expect(capture().genFrame).toBe(6);
  });
  it('limits foreground catch-up after a long stall', async () => {
    await mount({ genPaused: false }); await frame(0); await frame(60000); expect(capture().genFrame).toBe(6);
  });
  it('does not poll during image decoding and resumes exactly from a restored checkpoint', async () => {
    await mount(); await click('+100 steps'); const saved = capture();
    await patch({ ...saved, genPaused: false, genReset: 'pending' }); const restored = canvas();
    expect(restored.dataset.genRestoring).toBe('1'); expect(restored._genAnim).toBeNull(); expect(restored._genAdvance(1)).toBe(false);
    await frame(700); expect(capture().genFrame).toBe(100); await decode(); expect(restored.dataset.genRestoring).toBe('0'); expect(capture().genSnapshot).toBe(saved.genSnapshot);
    await frame(900); expect(capture().genFrame).toBe(100); await frame(950); expect(capture().genFrame).toBe(103);
  });
  it('cancels obsolete callbacks and removes visibility listeners when reset or unmounted', async () => {
    const add = vi.spyOn(document, 'addEventListener'), remove = vi.spyOn(document, 'removeEventListener');
    await mount({ genPaused: false }); const old = canvas(), stale = frames.get(old._genAnim);
    await click('Same seed'); const next = capture(); stale(1000); expect(capture()).toEqual(next); expect(old._genAnim).toBeNull();
    await patch({ genPaused: false }); const last = canvas(), lastFrame = frames.get(last._genAnim);
    await act(async () => root.unmount()); lastFrame(3000); expect(last._genAnim).toBeNull();
    const listeners = add.mock.calls.filter(([name]) => name === 'visibilitychange').map(([, listener]) => listener); expect(listeners).toHaveLength(2);
    for (const listener of listeners) expect(remove).toHaveBeenCalledWith('visibilitychange', listener);
  });
  it('advances 1, 10, or 100 exact steps and persists the selected paused frame', async () => {
    await mount({ genPaused: false }); for (const label of ['+1 step', '+10 steps', '+100 steps']) await click(label);
    expect(capture().genFrame).toBe(111); expect(capture().genPaused).toBe(true); expect(latest.genFrame).toBe(111);
    expect(host.querySelector('#artstudio-generative-live').textContent).toContain('Step 111');
    for (const invalid of [-1, 1.5, Infinity, 1001]) expect(canvas()._genAdvance(invalid)).toBe(false); expect(capture().genFrame).toBe(111);
  });
  it('discards a pending decode and runtime when the learner scope changes', async () => {
    await mount(); await click('+100 steps'); const saved = capture(); await patch({ ...saved, genReset: 'restore-scope' });
    const old = canvas(), image = images[0], staleDecode = image.onload;
    await patch({ testProfile: 'gen-b', genState: null, genSnapshot: '', genFrame: 0 });
    expect(canvas()).not.toBe(old); expect(old.isConnected).toBe(false); expect(image.onload).toBeNull();
    const fresh = capture(); staleDecode(); expect(capture()).toEqual(fresh); expect(fresh.genFrame).toBe(0);
  });
  it('stays paused and usable when a saved preview cannot decode', async () => {
    await mount(); await click('+10 steps'); const saved = capture(); await patch({ ...saved, genReset: 'bad-image' });
    await act(async () => images.shift().onerror()); expect(canvas().dataset.genRestoring).toBe('0'); expect(canvas()._genAnim).toBeNull();
    expect(capture().genState).toEqual(saved.genState); await click('+1 step'); expect(capture().genFrame).toBe(11);
    expect(announcements).toHaveBeenCalledWith('The saved particle trails could not be loaded. The simulation settings and particles are restored.');
  });
  it('restores legacy checkpoints without a trail setting and preserves the next random steps', async () => {
    await mount(); await click('+100 steps'); const saved = capture(); await click('+100 steps'); const future = capture();
    const legacy = JSON.parse(JSON.stringify(saved)); delete legacy.genState.settings.trailFade; delete legacy.genTrailFade;
    await patch({ ...legacy, genReset: 'legacy' }); await decode(); expect(capture()).toEqual(saved); await click('+100 steps'); expect(capture()).toEqual(future);
  });
  it('changes trail fade while retaining the seeded motion and restarting at zero', async () => {
    await mount(); await click('+100 steps'); const before = capture(), slider = host.querySelector('#artstudio-generative-trails');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '15'); slider.dispatchEvent(new Event('input', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(capture().genFrame).toBe(0); expect(capture().genState.settings.trailFade).toBe(15);
    await click('+100 steps'); expect(capture().genState.particles).toEqual(before.genState.particles); expect(capture().genSnapshot).not.toBe(before.genSnapshot);
  });
  it('adjusts burst size live and bounds repeated paused input', async () => {
    await mount(); const original = canvas(); await patch({ genBurstSize: 100 }); expect(canvas()).toBe(original);
    burst(); expect(capture().genState.particles).toHaveLength(120); expect(capture().genFrame).toBe(0);
    for (let i = 0; i < 35; i++) burst(); expect(capture().genState.particles).toHaveLength(2920); expect(capture().genState.burstCount).toBe(29);
    expect(announcements).toHaveBeenLastCalledWith('The canvas is full of particles. Advance or resume the animation before adding another burst.');
  });
  it('recovers malformed settings and rejects oversized or out-of-range checkpoints', async () => {
    await mount({ genDensity: Infinity, genSpeed: NaN, genBurstSize: {}, genTrailFade: Infinity, genHue: NaN, genStyle: 'unknown' });
    const saved = capture(); expect(saved.genState.particles).toHaveLength(100); expect(saved.genStyle).toBe('flow'); expect(saved.genSpeed).toBe(1);
    expect(saved.genTrailFade).toBe(4); expect(saved.genBurstSize).toBe(30); expect(saved.genState.settings.hue).toBe(0); await click('+10 steps'); const valid = capture();
    for (const [index, particles] of [[{ ...valid.genState.particles[0], size: 1e100 }], Array(3001).fill(valid.genState.particles[0])].entries()) {
      await patch({ ...valid, genReset: 'invalid-'+index, genState: { ...valid.genState, particles } });
      expect(capture().genFrame).toBe(0); expect(capture().genState.particles).toHaveLength(100); expect(images).toHaveLength(0);
    }
  });
  it('maps scaled canvas pointer input to the drawing area inside its border', async () => {
    await mount(); const c = canvas(); c.getBoundingClientRect = () => ({ left: 10, top: 20, width: 964, height: 724 });
    Object.defineProperties(c, { clientLeft: { value: 2 }, clientTop: { value: 2 }, clientWidth: { value: 960 }, clientHeight: { value: 720 } });
    const event = new MouseEvent('pointerdown', { button: 0, clientX: 732, clientY: 202, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'pointerType', { value: 'pen' }); c.dispatchEvent(event); expect(capture().genState.particles.at(-1)).toMatchObject({ x: 480, y: 120 });
  });
  it('reports failed PNG exports without creating an empty download or success toast', async () => {
    await mount(); canvas()._genExportAction = () => ''; const download = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    await act(async () => host.querySelector('[aria-label="Export PNG"]').click());
    expect(download).not.toHaveBeenCalled(); expect(toast).toHaveBeenLastCalledWith('The PNG could not be exported. Please try again.', 'error');
  });
});
