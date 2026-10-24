import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
async function click(element) { expect(element).toBeTruthy(); await React.act(async () => { element.focus(); element.click(); await Promise.resolve(); }); }
async function pointer(stage, type, values = {}) { const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100, ...values }); Object.defineProperty(event, 'pointerId', { value: values.pointerId ?? 1 }); await React.act(async () => stage.dispatchEvent(event)); return event; }
async function key(stage, value, options = {}) { const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options }); await React.act(async () => stage.dispatchEvent(event)); return event; }
const study = t => t.host.querySelector('[data-species-study]');
const stage = t => study(t).querySelector('[data-study-picture-stage]');
const zoom = (t, action) => study(t).querySelector('[data-study-zoom="' + action + '"]');
const view = t => { const s = study(t).dataset; return { scale: Number(s.studyScale), x: Number(s.studyPanX), y: Number(s.studyPanY) }; };
async function mount() {
  let data = { coralReef: { section: 'guide', guideSpeciesId: 'clownfish', speciesFieldNotes: { clownfish: 'Keep this note' }, speciesBookmarks: { clownfish: true }, speciesLog: { green_turtle: { firstSeen: 1 } }, speciesPractice: { rounds: 1, answered: 1, correct: 1, last: { total: 1, correct: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, reduceMotion: true, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); await click(host.querySelector('[data-open-study]'));
  Object.defineProperty(stage(t), 'getBoundingClientRect', { configurable: true, value: () => ({ x: 0, y: 0, width: 400, height: 300, left: 0, top: 0, right: 400, bottom: 300 }) });
  stage(t).setPointerCapture = vi.fn(); return t;
}

describe('direct inspection in the species closer look', () => {
  it('allows interaction only when enlarged, retains the existing bounds and leaves learner records and field marks intact', async () => {
    const t = await mount(), original = JSON.parse(JSON.stringify(t.data)), mark = study(t).querySelector('[data-study-mark-text]').textContent;
    const imageStage = stage(t);
    expect(imageStage.hasAttribute('tabindex')).toBe(false); expect(imageStage.hasAttribute('aria-describedby')).toBe(false);
    expect(study(t).querySelector('img').draggable).toBe(false);
    expect((await pointer(imageStage, 'pointerdown')).defaultPrevented).toBe(false);
    await pointer(imageStage, 'pointermove', { clientX: 200, clientY: 200 }); await pointer(imageStage, 'pointerup');
    expect(view(t)).toEqual({ scale: 1, x: 0, y: 0 }); expect((await key(imageStage, 'ArrowRight')).defaultPrevented).toBe(false);
    await click(zoom(t, 'in')); expect(imageStage.getAttribute('tabindex')).toBe('0'); expect(imageStage.getAttribute('aria-label')).toBe('Enlarged organism picture');
    expect(document.getElementById(imageStage.getAttribute('aria-describedby')).textContent).toContain('Drag the enlarged picture');
    await pointer(imageStage, 'pointerdown'); expect(imageStage.setPointerCapture).toHaveBeenCalledWith(1);
    await pointer(imageStage, 'pointermove', { clientX: 300, clientY: -100 }); expect(view(t)).toEqual({ scale: 1.25, x: 7.5, y: -7.5 });
    await pointer(imageStage, 'pointerup'); await pointer(imageStage, 'pointermove', { clientX: 0, clientY: 200 }); expect(view(t)).toEqual({ scale: 1.25, x: 7.5, y: -7.5 });
    for (let i = 0; i < 3; i++) await click(zoom(t, 'in'));
    await pointer(imageStage, 'pointerdown'); await pointer(imageStage, 'pointermove', { clientX: -400, clientY: 500 }); expect(view(t)).toEqual({ scale: 2, x: -30, y: 30 }); await pointer(imageStage, 'pointerup');
    await click(zoom(t, 'out')); expect(view(t)).toEqual({ scale: 1.75, x: -22.5, y: 22.5 });
    expect(study(t).querySelector('[data-study-mark-text]').textContent).toBe(mark); expect(t.data).toEqual(original);
    expect(study(t).querySelector('[data-species-field-notes]').value).toBe('Keep this note');
  });

  it('supports focused arrow keys without hijacking unrelated keys or browser shortcuts', async () => {
    const t = await mount(); for (let i = 0; i < 4; i++) await click(zoom(t, 'in'));
    const imageStage = stage(t); imageStage.focus();
    expect((await key(imageStage, 'ArrowRight')).defaultPrevented).toBe(true); expect(view(t).x).toBe(8); expect(document.activeElement).toBe(imageStage);
    await key(imageStage, 'ArrowDown'); expect(view(t).y).toBe(8);
    for (const options of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) expect((await key(imageStage, 'ArrowLeft', options)).defaultPrevented).toBe(false);
    expect((await key(imageStage, 'Tab')).defaultPrevented).toBe(false); expect(view(t)).toEqual({ scale: 2, x: 8, y: 8 });
    for (let i = 0; i < 5; i++) await key(imageStage, 'ArrowLeft'); expect(view(t).x).toBe(-30);
    await click(zoom(t, 'reset')); expect(view(t)).toEqual({ scale: 1, x: 0, y: 0 }); expect(document.activeElement).toBe(zoom(t, 'reset'));
    expect(imageStage.hasAttribute('tabindex')).toBe(false); expect((await key(imageStage, 'ArrowDown')).defaultPrevented).toBe(false);
  });

  it('rejects secondary drags and ends movement on cancellation, lost capture, reset and image failure', async () => {
    const t = await mount(); for (let i = 0; i < 4; i++) await click(zoom(t, 'in'));
    const imageStage = stage(t);
    await pointer(imageStage, 'pointerdown', { button: 2 }); await pointer(imageStage, 'pointermove', { clientX: 200 }); expect(view(t).x).toBe(0);
    await pointer(imageStage, 'pointerdown'); await pointer(imageStage, 'pointerdown', { pointerId: 2, clientX: 50 }); await pointer(imageStage, 'pointermove', { pointerId: 2, clientX: 250 }); expect(view(t).x).toBe(0);
    await pointer(imageStage, 'pointermove', { clientX: 140 }); expect(view(t).x).toBe(10);
    for (const end of ['pointercancel', 'lostpointercapture']) {
      await pointer(imageStage, end); const saved = view(t); await pointer(imageStage, 'pointermove', { clientX: 260 }); expect(view(t)).toEqual(saved); await pointer(imageStage, 'pointerdown');
    }
    await click(zoom(t, 'reset')); await pointer(imageStage, 'pointermove', { clientX: 300 }); expect(view(t)).toEqual({ scale: 1, x: 0, y: 0 });
    await click(zoom(t, 'in')); await pointer(imageStage, 'pointerdown');
    await React.act(async () => study(t).querySelector('img').dispatchEvent(new Event('error')));
    await pointer(imageStage, 'pointermove', { clientX: 300 }); expect(view(t)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(study(t).querySelector('img')).toBeNull(); expect(imageStage.querySelector('[role="status"]').textContent).toContain('still explore every field mark');
    expect(imageStage.hasAttribute('tabindex')).toBe(false); expect(study(t).querySelector('.crst-pan-help')).toBeNull();
    await click(zoom(t, 'in')); expect(view(t).scale).toBe(1);
  });
});
