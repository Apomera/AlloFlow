import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change, button, Simulate } from './helpers/weldlab_interaction_mount.js';
import { React } from './helpers/stem_widgets_smoke_harness.js';

let queue, now, sequence, outside;
beforeEach(() => {
  queue = []; now = 0; sequence = 0;
  vi.stubGlobal('requestAnimationFrame', callback => { queue.push({ id: ++sequence, callback }); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', id => { queue = queue.filter(frame => frame.id !== id); });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return new Proxy({ canvas: this }, { get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return () => ({ width: 20 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      return () => {};
    } });
  });
  freshTool();
});
afterEach(async () => {
  await unmountState(); outside?.remove(); outside = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const query = selector => node().querySelector(selector);
const liveText = () => document.getElementById('allo-live-weldlab').textContent;
const inspector = () => query('input[aria-label="Inspect the bead at"]');
const zone = () => query('[role="group"][tabindex="0"]');
const matchingButton = text => [...node().querySelectorAll('button')].find(control => control.textContent.includes(text));
async function activate(element) { expect(element).toBeTruthy(); element.focus(); await click(element); }
async function key(element, name, extra = {}) { await React.act(() => Simulate.keyDown(element, { key: name, ...extra })); }
async function frames(count) {
  for (let i = 0; i < count; i++) {
    now += 100; const batch = queue; queue = [];
    await React.act(() => batch.forEach(frame => frame.callback(now)));
  }
}
async function stoppedReview() {
  await activate(matchingButton('Strike the arc'));
  expect(document.activeElement).toBe(zone());
  await frames(80);
  await activate(matchingButton('Stop run'));
  expect(document.activeElement.textContent).toContain('After-action review');
  expect(inspector()).toBeTruthy();
}

describe('WeldLab Bead Lab mission and hands-on controls', () => {
  it.each([false, true])('keeps saved module entry focus outside the lab (contrast %s)', async contrast => {
    outside = document.createElement('button'); document.body.append(outside); outside.focus();
    await mountState({ view: 'beadLab', arc_handsOn: true, arc_run: [12, 12], arc_runHand: true,
      arc_missions: { thinAl: { pred: 1, locked: true, predOk: true, done: false, tries: 2, loaded: true } } }, contrast);
    expect(document.activeElement).toBe(outside);
  });

  it('announces each mission hint and keeps the final hint action in place', async () => {
    const app = await mountState({ view: 'beadLab' });
    const hint = query('[data-arc-hint]');
    const before = JSON.stringify(app.latest());
    await activate(hint);
    expect(document.activeElement).toBe(hint);
    expect(liveText()).toContain('Aluminum pulls heat away fast');
    await activate(hint);
    expect(query('[data-arc-hint]')).toBe(hint);
    expect(document.activeElement).toBe(hint);
    expect(hint.getAttribute('aria-disabled')).toBe('true');
    expect(hint.textContent).toBe('💡 All hints shown');
    expect(liveText()).toContain('Keep amperage and nudge travel speed');
    const visibleHints = query('[data-arc-mission]').querySelectorAll('ul li');
    expect(visibleHints).toHaveLength(2);
    await activate(hint);
    expect(query('[data-arc-mission]').querySelectorAll('ul li')).toHaveLength(2);
    expect(JSON.stringify(app.latest())).toBe(before);
  });

  it.each([
    { index: 0, id: 'thinAl', result: 'fail' },
    { index: 3, id: 'coldRopey', result: 'need-preset' }
  ])('focuses every explicit mission check including $id rechecks', async ({ index, id, result }) => {
    const app = await mountState({ view: 'beadLab', arc_mission: index,
      arc_missions: { [id]: { pred: 0, locked: false, predOk: false, done: false, tries: 0, loaded: false } } });
    const check = button('🔎 Check my weld');
    await activate(check);
    const feedback = query('[data-arc-result]');
    expect(feedback.dataset.arcResult).toBe(result);
    expect(document.activeElement).toBe(feedback);
    const slider = query('input[aria-label="Voltage"]');
    slider.focus(); await change(slider, String(Number(slider.value) + Number(slider.step)));
    expect(document.activeElement).toBe(slider);
    await activate(check);
    expect(document.activeElement).toBe(query('[data-arc-result]'));
    expect(query('[data-arc-result]')).toBe(feedback);
    expect(app.latest().arc_missions[id].tries).toBe(result === 'need-preset' ? 0 : 2);
    expect(app.latest().arc_missions[id].locked).toBe(result !== 'need-preset');
  });

  it('provides spoken hand-speed keys and a focus destination when a keyboard-held pass finishes', async () => {
    const app = await mountState({ view: 'beadLab', arc_handsOn: true, arc_handSpeed: 30, arc_run: [] });
    const plate = query('canvas[tabindex="0"]');
    plate.focus(); await key(plate, 'ArrowDown');
    expect(liveText()).toBe('Hand speed 29.0 in/min.');
    expect(query('input[aria-label="Hand speed for Hold to weld and the Right arrow"]').value).toBe('29');
    await key(plate, 'ArrowUp');
    expect(liveText()).toBe('Hand speed 30.0 in/min.');
    const hold = query('button[aria-label="Hold to weld at the hand speed"]');
    hold.focus(); await key(hold, 'Enter', { ctrlKey: true }); await frames(3);
    expect(app.latest().arc_run).toEqual([]);
    expect(hold.disabled).toBe(false);
    hold.focus(); await key(hold, 'Enter');
    for (let i = 0; i < 50 && !hold.disabled; i++) await frames(1);
    expect(hold.disabled).toBe(true);
    expect(document.activeElement).toBe(button('↺ New plate'));
    expect(app.latest().arc_run).toHaveLength(window.__WeldLabCore.arc.SEGMENTS);
    expect(app.latest().arc_runHand).toBe(true);
    expect(liveText()).toContain('Pass complete. Uniformity');
    await activate(button('↺ New plate'));
    expect(document.activeElement).toBe(button('↺ New plate'));
    expect(hold.disabled).toBe(false);
    expect(app.latest().arc_run).toEqual([]);
  });
});

describe('WeldLab Live Bead Run control transitions', () => {
  it.each([false, true])('keeps initial focus, then focuses start, stop and retry destinations (contrast %s)', async contrast => {
    outside = document.createElement('button'); document.body.append(outside); outside.focus();
    const app = await mountState({ view: 'speedChallenge', speedBest: { apprentice_v2: 65 } }, contrast);
    expect(document.activeElement).toBe(outside);
    await activate(matchingButton('Strike the arc'));
    expect(document.activeElement).toBe(zone());
    expect(liveText()).toContain('run started.');
    const travel = query('input[aria-label="Travel speed"]');
    const initialTravel = Number(travel.value);
    await key(zone(), 'ArrowRight');
    expect(Number(travel.value)).toBe(initialTravel + 1);
    expect(liveText()).toBe(`Travel speed ${(initialTravel + 1).toFixed(1)} in/min.`);
    const amps = query('input[aria-label="Amperage (wire feed)"]');
    const initialAmps = Number(amps.value);
    await key(zone(), 'ArrowDown', { shiftKey: true });
    expect(Number(amps.value)).toBe(initialAmps - 15);
    expect(liveText()).toBe(`Amperage ${initialAmps - 15} A.`);
    await frames(1); await activate(matchingButton('Stop run'));
    expect(document.activeElement.textContent).toContain('After-action review');
    expect(liveText()).toBe('Run stopped. No score recorded.');
    await activate(matchingButton('Try again'));
    expect(document.activeElement.textContent).toContain('Before you strike the arc');
    expect(app.latest().speedBest).toEqual({ apprentice_v2: 65 });
    expect(app.writes.filter(([name]) => name === 'speedBest')).toEqual([]);
  });

  it.each([false, true])('keeps pin and clear actions usable as their controls disable or disappear (contrast %s)', async contrast => {
    const app = await mountState({ view: 'speedChallenge' }, contrast);
    await stoppedReview();
    const before = JSON.stringify(app.latest()), writes = app.writes.length;
    const pin = query('[data-run-pin]');
    await activate(pin);
    expect(pin.disabled).toBe(true);
    expect(document.activeElement).toBe(query('[data-run-clear-pin]'));
    expect(liveText()).toMatch(/^Slice at [0-9.]+ in\. pinned\./);
    await change(inspector(), inspector().max);
    expect(pin.disabled).toBe(false);
    await activate(pin);
    expect(document.activeElement).toBe(query('[data-run-clear-pin]'));
    expect(query('[data-run-pair-slice="reference"]').dataset.sliceIndex).toBe(inspector().value);
    await activate(query('[data-run-clear-pin]'));
    expect(document.activeElement).toBe(pin);
    expect(pin.disabled).toBe(false);
    expect(query('[data-run-clear-pin]')).toBeNull();
    expect(query('[data-run-pair-slice="reference"]')).toBeNull();
    expect(liveText()).toBe('Pinned slice cleared.');
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(app.writes).toHaveLength(writes);
  });

  it('announces event and canvas-key selection and focuses the native inspector after a problem jump', async () => {
    const app = await mountState({ view: 'speedChallenge' });
    await activate(matchingButton('Strike the arc'));
    for (let i = 0; i < 650 && !inspector(); i++) await frames(1);
    expect(inspector()).toBeTruthy();
    expect(document.activeElement.textContent).toContain('After-action review');
    expect(liveText()).toContain('Run complete:');
    const before = JSON.stringify(app.latest()), writes = app.writes.length;
    const event = [...node().querySelectorAll('button')].find(control => /^\d+\. .* at [0-9.]+ in\.$/.test(control.textContent));
    await activate(event);
    expect(document.activeElement).toBe(event);
    expect(liveText()).toBe(inspector().getAttribute('aria-valuetext'));
    await change(inspector(), '0');
    zone().focus(); await key(zone(), 'ArrowRight', { shiftKey: true });
    expect(inspector().value).toBe('10');
    expect(document.activeElement).toBe(zone());
    expect(liveText()).toBe(inspector().getAttribute('aria-valuetext'));
    await change(inspector(), '0');
    const next = button('Next problem ▶');
    expect(next.disabled).toBe(false);
    await activate(next);
    expect(document.activeElement).toBe(inspector());
    expect(Number(inspector().value)).toBeGreaterThan(0);
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(app.writes).toHaveLength(writes);
  });
});
