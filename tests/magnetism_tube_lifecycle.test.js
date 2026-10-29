import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetStemLab, loadTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function motionEnvironment(reduced = false, legacy = false) {
  const listeners = new Set();
  const query = {
    matches: reduced,
    addEventListener: legacy ? undefined : vi.fn((event, callback) => listeners.add(callback)),
    removeEventListener: legacy ? undefined : vi.fn((event, callback) => listeners.delete(callback)),
    addListener: vi.fn((callback) => listeners.add(callback)),
    removeListener: vi.fn((callback) => listeners.delete(callback)),
  };
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal('matchMedia', matchMedia);
  const frames = new Map();
  let sequence = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++sequence, callback);
    return sequence;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id));
  return {
    listeners, frames, query, matchMedia,
    frame(time) {
      const current = [...frames.values()];
      frames.clear();
      act(() => current.forEach((callback) => callback(time)));
    },
    flip(matches) {
      query.matches = matches;
      act(() => [...listeners].forEach((callback) => callback({ matches })));
    },
  };
}

function mount(extra = {}, empty = false) {
  resetStemLab();
  const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const announcements = [];
  let latest;
  let setData;
  function Harness() {
    const [toolData, setToolData] = React.useState(empty ? {} : { magnetism: {
      tab: 'induce', induceMode: 'eddy', eddyMaterial: 'copper', eddyThickness: 3,
      eddySlit: false, eddySpeed: 6, eddyField: 6, tubeRunning: false, tubeDone: false,
      tubeProg: { cu: 0, pl: 0 }, ...extra,
    } });
    latest = toolData.magnetism;
    setData = setToolData;
    return cfg.render({ React, toolData, setToolData, addToast() {}, announceToSR(message) { announcements.push(message); }, awardXP() {},
      aiHintsEnabled: false, callGemini: null, t: (key, fallback) => fallback || key });
  }
  act(() => root.render(React.createElement(Harness)));
  return {
    state: () => latest, announcements,
    patch(patch) { act(() => setData((previous) => ({ ...previous, magnetism: { ...previous.magnetism, ...patch } }))); },
    click(label) {
      const button = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === label);
      expect(button, label).toBeTruthy();
      act(() => button.click());
    },
    close() { act(() => root.unmount()); host.remove(); },
  };
}

describe('eddy-current tube race lifecycle', () => {
  it('progresses after the start rerender, shows plastic ahead, and finishes once', () => {
    const motion = motionEnvironment();
    const live = mount();
    try {
      live.click('Drop both magnets');
      expect(live.state().tubeRunning).toBe(true);
      expect(motion.frames.size).toBe(1);
      motion.frame(100);
      motion.frame(425);
      expect(live.state().tubeProg.pl).toBeCloseTo(0.5);
      expect(live.state().tubeProg.cu).toBeGreaterThan(0);
      expect(live.state().tubeProg.cu).toBeLessThan(live.state().tubeProg.pl);
      expect(live.state().tubeRunning).toBe(true);
      motion.frame(4000);
      expect(live.state()).toMatchObject({ tubeRunning: false, tubeDone: true, tubeProg: { cu: 1, pl: 1 } });
      expect(motion.frames.size).toBe(0);
      expect(live.announcements.filter((message) => message.startsWith('Race finished.'))).toHaveLength(1);
      live.click('Drop again');
      expect(live.state()).toMatchObject({ tubeRunning: true, tubeDone: false, tubeProg: { cu: 0, pl: 0 } });
    } finally { live.close(); }
  });

  it.each(['Aluminum', 'Solid plate/tube: closed loop'])('changing %s resets and invalidates already queued frames', (control) => {
    const motion = motionEnvironment();
    const live = mount();
    try {
      live.click('Drop both magnets');
      motion.frame(0);
      motion.frame(300);
      const staleFrame = [...motion.frames.values()][0];
      live.click(control);
      expect(motion.frames.size).toBe(0);
      act(() => staleFrame(10000));
      expect(live.state()).toMatchObject({ tubeRunning: false, tubeDone: false, tubeProg: { cu: 0, pl: 0 } });
      expect(live.announcements.some((message) => message.startsWith('Race finished.'))).toBe(false);
    } finally { live.close(); }
  });

  it.each([{ induceMode: 'hand' }, { tab: 'field' }])('leaving the activity cancels an active race: %j', (patch) => {
    const motion = motionEnvironment();
    const live = mount();
    try {
      live.click('Drop both magnets');
      motion.frame(0);
      motion.frame(300);
      const staleFrame = [...motion.frames.values()][0];
      live.patch(patch);
      expect(motion.frames.size).toBe(0);
      act(() => staleFrame(10000));
      expect(live.state()).toMatchObject({ tubeRunning: false, tubeDone: false, tubeProg: { cu: 0, pl: 0 } });
      live.patch({ tab: 'induce', induceMode: 'eddy' });
      live.click('Drop both magnets');
      expect(live.state().tubeRunning).toBe(true);
    } finally { live.close(); }
  });

  it('completes immediately for reduced motion and uses a changed preference on the next start', () => {
    const motion = motionEnvironment(true);
    const live = mount();
    try {
      live.click('Drop both magnets');
      expect(live.state()).toMatchObject({ tubeRunning: false, tubeDone: true, tubeProg: { cu: 1, pl: 1 } });
      expect(motion.frames.size).toBe(0);
      motion.flip(false);
      live.click('Drop again');
      expect(live.state().tubeRunning).toBe(true);
      motion.frame(0);
      motion.frame(300);
      expect(live.state().tubeProg.pl).toBeGreaterThan(0);
      const staleFrame = [...motion.frames.values()][0];
      motion.flip(true);
      expect(motion.frames.size).toBe(0);
      expect(live.state()).toMatchObject({ tubeRunning: false, tubeDone: true, tubeProg: { cu: 1, pl: 1 } });
      const announcements = live.announcements.length;
      act(() => staleFrame(10000));
      expect(live.announcements).toHaveLength(announcements);
    } finally { live.close(); }
  });

  it('cancels on unmount and makes queued callbacks inert', () => {
    const motion = motionEnvironment();
    const live = mount();
    live.click('Drop both magnets');
    const staleFrame = [...motion.frames.values()][0];
    live.close();
    expect(motion.frames.size).toBe(0);
    const announcements = live.announcements.length;
    act(() => staleFrame(10000));
    expect(live.announcements).toHaveLength(announcements);
    expect(motion.listeners.size).toBe(0);
  });

  it('clears an orphaned running flag from a saved project', () => {
    const motion = motionEnvironment();
    const live = mount({ tubeRunning: true, tubeProg: { cu: 0.1, pl: 0.5 } });
    try {
      expect(live.state()).toMatchObject({ tubeRunning: false, tubeDone: false, tubeProg: { cu: 0, pl: 0 } });
      live.click('Drop both magnets');
      expect(motion.frames.size).toBe(1);
    } finally { live.close(); }
  });
});

describe('reduced-motion subscription ownership', () => {
  it.each([false, true])('keeps one listener across rerenders and removes it on unmount (legacy=%s)', (legacy) => {
    const motion = motionEnvironment(false, legacy);
    const live = mount();
    try {
      for (let value = 1; value <= 5; value++) live.patch({ eddySpeed: value });
      expect(motion.matchMedia).toHaveBeenCalledTimes(1);
      expect(motion.listeners.size).toBe(1);
      expect(legacy ? motion.query.addListener : motion.query.addEventListener).toHaveBeenCalledTimes(1);
    } finally { live.close(); }
    expect(motion.listeners.size).toBe(0);
    expect(legacy ? motion.query.removeListener : motion.query.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('keeps the same hook order while initializing an empty project', () => {
    const motion = motionEnvironment();
    const live = mount({}, true);
    try {
      live.patch({ tab: 'induce', induceMode: 'eddy' });
      live.click('Drop both magnets');
      motion.frame(0);
      motion.frame(300);
      expect(live.state().tubeProg.pl).toBeGreaterThan(0);
      expect(motion.listeners.size).toBe(1);
    } finally { live.close(); }
  });
});
