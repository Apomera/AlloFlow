import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
const legacyAdapter = source.includes('window._stemGamepadActive');
const start = source.indexOf('      // ── WCAG Auto-Fixer:');
const end = source.indexOf('      // ── Canvas Narration: Dual-Channel', start);
const install = new Function('React', '_stemDialogRef', 'stemLabTool', 'addToast', source.slice(start, end));
let pads, frames, cleanup, modal, nextFrame;
const gamepad = () => ({ connected: true, id: 'Test controller', axes: [0, 0, 0, 0], buttons: Array.from({length:16}, () => ({pressed:false, value:0})) });
function mount(tool = 'test') {
  const disposers = [];
  install({useEffect(fn) { const dispose = fn(); if(dispose) disposers.push(dispose); }}, {current:modal}, tool, vi.fn());
  const dispose = () => { disposers.reverse().forEach(fn=>fn()); };
  cleanup.push(dispose);
  return dispose;
}
function frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn=>fn(16)); }
function connect(pad) { pads = [pad]; window.dispatchEvent(new Event('gamepadconnected')); }
async function settle() { await Promise.resolve(); await vi.advanceTimersByTimeAsync(300); }
beforeEach(() => {
  vi.useFakeTimers(); pads=[]; frames=new Map(); cleanup=[]; nextFrame=0;
  delete window._stemGamepadActive; delete window._stemA11yFixerActive;
  window.__stemA11yFindings=[]; window.__stemA11ySeen={};
  document.body.innerHTML='<div class="stem-lab-modal"><button id="focus">Action</button><span id="readout">0</span></div>';
  modal=document.querySelector('.stem-lab-modal');
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  Object.defineProperty(navigator, 'getGamepads', {configurable:true,value:()=>pads});
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{ frames.set(++nextFrame,fn); return nextFrame; });
  vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
  vi.spyOn(console,'warn').mockImplementation(()=>{});
});
afterEach(() => { cleanup.reverse().forEach(fn=>fn()); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML=''; });
describe('shared STEM runtime scheduling', () => {
  it('does no animation polling without a controller and stops audits when unchanged', async () => {
    const scans=vi.spyOn(modal,'querySelectorAll'); mount(); await settle();
    const initial=scans.mock.calls.length; expect(initial).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(20000);
    expect(scans).toHaveBeenCalledTimes(initial); expect(frames.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it('audits newly inserted controls and preserves Close labels without a polling loop', async () => {
    mount(); await settle(); modal.insertAdjacentHTML('beforeend','<button>×</button><canvas></canvas>');
    await settle(); await settle();
    expect(modal.querySelector('button[aria-label="Close"]')).toBeTruthy();
    expect(window.__stemA11yFindings.some(f=>f.rule==='canvas-unnamed')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores animation styles and numeric readouts but audits changed button names', async () => {
    const scans=vi.spyOn(modal,'querySelectorAll'); mount(); await settle(); const initial=scans.mock.calls.length;
    const readout=document.getElementById('readout');
    for(let i=0;i<100;i++){ readout.textContent=String(i); readout.style.transform='translateX('+i+'px)'; }
    await settle(); expect(scans).toHaveBeenCalledTimes(initial);
    document.getElementById('focus').textContent='×'; await settle();
    expect(document.getElementById('focus').getAttribute('aria-label')).toBe('Close');
  });
  it.skipIf(!legacyAdapter)('detects an already connected controller, delivers one event, and releases buttons', () => {
    const gp=gamepad(); pads=[gp]; mount(); const events=[];
    const listener=e=>events.push([e.type,e.code,e.key]);
    document.addEventListener('keydown',listener); document.addEventListener('keyup',listener);
    try {
      document.getElementById('focus').focus(); gp.buttons[0].pressed=true; frame(); frame();
      gp.buttons[0].pressed=false; frame();
      expect(events).toEqual([['keydown','Space',' '],['keyup','Space',' ']]);
      expect(frames.size).toBe(1);
    } finally { document.removeEventListener('keydown',listener); document.removeEventListener('keyup',listener); }
  });
  it.skipIf(!legacyAdapter)('releases held input and stops polling on disconnect', () => {
    mount(); const gp=gamepad(); connect(gp); gp.axes[0]=0.8;
    const release=vi.fn(); document.addEventListener('keyup',release);
    try { frame(); pads=[]; window.dispatchEvent(new Event('gamepaddisconnected'));
      expect(release).toHaveBeenCalledTimes(1); expect(release.mock.calls[0][0].code).toBe('KeyD'); expect(frames.size).toBe(0);
    } finally { document.removeEventListener('keyup',release); }
  });
  it.skipIf(!legacyAdapter)('pauses hidden work, resumes once, and cleans up listeners, observers and timers', async () => {
    const dispose=mount(); connect(gamepad()); expect(frames.size).toBe(1);
    vi.spyOn(document,'hidden','get').mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    await settle(); expect(frames.size).toBe(0);
    vi.spyOn(document,'hidden','get').mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(1);
    dispose(); modal.insertAdjacentHTML('beforeend','<canvas></canvas>');
    window.dispatchEvent(new Event('gamepadconnected')); await settle();
    expect(frames.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it.skipIf(!legacyAdapter)('can reopen without leaving duplicate controller loops', async () => {
    pads=[gamepad()]; const dispose=mount(); expect(frames.size).toBe(1); dispose();
    mount(); frame(); expect(frames.size).toBe(1); await settle();
  });
});

it.skipIf(!legacyAdapter).each(['roadReady',null])('leaves controller polling to its owner for %s', tool => {
  pads=[gamepad()]; mount(tool); window.dispatchEvent(new Event('gamepadconnected')); expect(frames.size).toBe(0);
});
it.skipIf(!legacyAdapter)('releases held keys and pending mouse clicks immediately on unmount',()=>{
  const dispose=mount(),gp=gamepad(); connect(gp); document.getElementById('focus').focus();
  const keyUp=vi.fn(),mouseUp=vi.fn(); document.addEventListener('keyup',keyUp); document.addEventListener('mouseup',mouseUp);
  try { gp.axes[0]=0.8;gp.buttons[5].pressed=true;frame();expect(mouseUp).not.toHaveBeenCalled();dispose();
    expect(keyUp).toHaveBeenCalledTimes(1);expect(mouseUp).toHaveBeenCalledTimes(1);expect(frames.size).toBe(0);
  } finally {document.removeEventListener('keyup',keyUp);document.removeEventListener('mouseup',mouseUp);}
});
