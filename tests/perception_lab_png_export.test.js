import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
let config, engine, host, root, latest, writes, edit, profile, images, encodings, blobs, downloads, context, announce;
const button = (label) => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const click = async label => { expect(button(label), label).toBeTruthy(); await act(async () => button(label).click()); };
const pngButton = () => host.querySelector('[data-perception-export-png]');
async function mount(raw = {}, strict = false) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: engine.normalize(raw), otherTool: { preserved: 37 } });
    const [learner, setLearner] = React.useState('png-learner'); latest = data; profile = setLearner;
    edit = fn => setData(previous => ({ ...previous, perceptionLab: fn(previous.perceptionLab) }));
    return config.render(makeCtx({ toolData: data, setToolData: fn => { writes++; setData(fn); }, activeProfileId: learner, announceToSR: announce }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
}
const load = async (index = images.length - 1) => act(async () => images[index].onload());
const encode = async (blob = new NodeBlob(['encoded'], { type: 'image/png' })) => act(async () => encodings.shift()(blob));
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  writes = 0; images = []; encodings = []; blobs = new Map(); downloads = []; announce = vi.fn();
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { const url = 'blob:png-' + (blobs.size + 1); blobs.set(url, blob); return url; }), revokeObjectURL: vi.fn() });
  vi.spyOn(window, 'Image').mockImplementation(function () { this.removeAttribute = vi.fn(); images.push(this); });
  context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(window.HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) { encodings.push(callback); });
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ name: this.download, blob: blobs.get(this.getAttribute('href')) }); });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });
describe('High resolution current drawing PNG export', () => {
  it.each(['brightness','ebbinghaus','mullerLyer','cafeWall','necker','moire'])('exports the actual %s SVG onto an opaque 2400 by 1440 image', async experiment => {
    await mount({ experiment, models: { [experiment]: { reveal: true, swap: true, context: true } } });
    const before = latest, beforeWrites = writes, source = host.querySelector('#perception-stage-current');
    await click('Export PNG'); expect(pngButton().disabled).toBe(true); expect(pngButton().getAttribute('aria-busy')).toBe('true');
    const svg = new DOMParser().parseFromString(await blobs.get(images[0].src).text(), 'image/svg+xml').documentElement;
    expect(svg.localName).toBe('svg'); expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 480'); expect(svg.getAttribute('width')).toBe('800'); expect(svg.getAttribute('height')).toBe('480');
    expect(svg.querySelector('desc').textContent).toBe(source.querySelector('desc').textContent);
    expect(svg.children.length).toBe(source.children.length); expect(svg.hasAttribute('class')).toBe(false);
    await load(); expect(context.fillStyle).toBe('#fff'); expect(context.fillRect).toHaveBeenCalledWith(0, 0, 2400, 1440); expect(context.drawImage).toHaveBeenCalledWith(images[0], 0, 0, 2400, 1440);
    expect(downloads).toHaveLength(0); await encode(); expect(downloads[0].name).toBe('perception-' + experiment + '.png'); expect(downloads[0].blob.type).toBe('image/png');
    expect(pngButton().disabled).toBe(false); expect(announce).toHaveBeenCalledWith('Current experiment exported as a 2400 × 1440 PNG.');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:png-1'); expect(latest).toBe(before); expect(writes).toBe(beforeWrites);
  });
  it('captures settings at click time while later edits and pinned drawings stay independent', async () => {
    await mount({ models: { brightness: { target: 117 } }, comparison: { experiment:'brightness', model:{target:188} } });
    await click('Export PNG'); const snapshot = await blobs.get(images[0].src).text();
    await act(async () => edit(state => ({ ...state, models: { ...state.models, brightness: { ...state.models.brightness, target:203 } } })));
    expect(snapshot).toContain('rgb(117,117,117)'); expect(snapshot).not.toContain('rgb(188,188,188)');
    await load(); await encode(); expect(downloads).toHaveLength(1); expect(latest.perceptionLab.models.brightness.target).toBe(203); expect(latest.perceptionLab.comparison.model.target).toBe(188);
  });
  it('exports from the focused workspace and keeps notes and saved records intact', async () => {
    await mount({ models:{ brightness:{note:'Draft note',prediction:'Same'} }, studies:[{id:'saved',experiment:'moire',model:{},date:''}] });
    await click('Focus experiment'); const before = latest, count = writes;
    await click('Export PNG'); await load(); await encode(); expect(downloads).toHaveLength(1); expect(latest).toBe(before); expect(writes).toBe(count);
    expect(host.querySelector('[data-perception-focus-dialog]').open).toBe(true);
  });
  it('allows only one pending export and supports a fresh export after completion', async () => {
    await mount({}, true); await click('Export PNG'); await act(async () => pngButton().click()); expect(images).toHaveLength(1);
    await load(); await encode(); await click('Export PNG'); expect(images).toHaveLength(2); await load(); await encode(); expect(downloads).toHaveLength(2);
  });
  it.each(['decode','context','encode-null','encode-type','draw','encode-throw','download'])('recovers from a %s failure with no successful download', async failure => {
    await mount(); await click('Export PNG');
    if (failure === 'decode') await act(async () => images[0].onerror());
    else {
      if (failure === 'context') window.HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
      if (failure === 'draw') context.drawImage.mockImplementation(() => { throw new Error('draw failed'); });
      if (failure === 'encode-throw') window.HTMLCanvasElement.prototype.toBlob.mockImplementation(() => { throw new Error('encode failed'); });
      if (failure === 'download') window.HTMLAnchorElement.prototype.click.mockImplementation(() => { throw new Error('download failed'); });
      await load();
      if (failure === 'encode-null') await encode(null);
      if (failure === 'encode-type') await encode(new NodeBlob(['wrong'],{type:'image/jpeg'}));
      if (failure === 'download') await encode();
    }
    expect(pngButton().disabled).toBe(false); expect(downloads).toHaveLength(0); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:png-1'); expect(announce).toHaveBeenCalledWith('Export could not be created. Try again.');
  });
  it('times out and ignores late encoder callbacks', async () => {
    vi.useFakeTimers(); await mount(); await click('Export PNG'); await load(); const late = encodings.shift();
    await act(async () => vi.advanceTimersByTime(15000)); expect(pngButton().disabled).toBe(false); await act(async () => late(new NodeBlob(['late'], {type:'image/png'}))); expect(downloads).toHaveLength(0);
  });
  it.each(['experiment','profile','unmount','study'])('cancels pending work on %s and ignores a late completion', async action => {
    await mount({models:{brightness:{matching:true}}}); await click('Export PNG'); await load(); const late=encodings.shift();
    if(action==='experiment')await act(async()=>edit(state=>({...state,experiment:'moire'})));
    if(action==='profile')await act(async()=>profile('another-learner'));
    if(action==='unmount'){await act(async()=>root.unmount());root=null;}
    if(action==='study'){await click('Start three matches');expect(pngButton().disabled).toBe(true);}
    await act(async()=>late(new NodeBlob(['late'],{type:'image/png'})));expect(downloads).toHaveLength(0);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:png-1');
  });
  it('keeps export disabled throughout an unrevealed three-match study', async () => {
    await mount({models:{brightness:{matching:true}}});await click('Start three matches');expect(pngButton().disabled).toBe(true);
    for(let i=0;i<3;i++){await click('Same');await click('Record match');expect(pngButton().disabled).toBe(true);}
    await click('Reveal study results');expect(pngButton().disabled).toBe(false);await click('Export PNG');await load();await encode();expect(downloads).toHaveLength(1);
  });
});
