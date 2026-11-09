import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';

// Round 24, lane road. Road Ready's voice instructor used to pass { force: true } on every
// automatic line, so the STEAM Lab header narration switch could not silence it.
// Now: force only while that switch has never been set (localStorage key unset, the default),
// so students still hear the instructor by default; once someone turns narration off ('off')
// the line goes to the host gate without force. Road Ready also has its own
// "Instructor voice" switch (d.instructorVoice, unset = on), in the Accessibility panel
// and in the drive's More panel; turning it off cancels lines still being made.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mounted = [];

async function mount(roadReady) {
  window.__testHooks = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const calls = [];
  const callTTS = vi.fn((text, voice, speed, opts) => { calls.push({ text, opts }); return new Promise(() => {}); });
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx({
      toolData,
      callTTS,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    });
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, calls, callTTS, state };
  mounted.push(m);
  return m;
}

const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

async function signPledge(extra) {
  const m = await mount(Object.assign({ view: 'driverPledge', driverName: 'Sam' }, extra || {}));
  const btn = buttonByText(m.host, '✍️ Sign the Pledge');
  expect(btn).toBeTruthy();
  await React.act(async () => { btn.click(); });
  return m;
}
const PLEDGE_LINE = 'Pledge signed. Thank you for committing to safe driving.';

beforeEach(() => {
  try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {}
  delete window.__alloIsGlobalMuted;
  delete window.__alloStudentAiDisabled;
});
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  delete window.__testHooks;
  delete window.__alloIsGlobalMuted;
  delete window.__alloStudentAiDisabled;
  try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {}
});

describe('Road Ready instructor voice (rv24)', () => {
  it('header narration never set (the default): still speaks, with force and a cancel signal', async () => {
    const m = await signPledge();
    const line = m.calls.find((c) => c.text === PLEDGE_LINE);
    expect(line).toBeTruthy();
    expect(line.opts.force).toBe(true);
    expect(line.opts.signal).toBeInstanceOf(AbortSignal);
    expect(line.opts.signal.aborted).toBe(false);
  });

  it('header narration turned off: no force, so the host narration switch silences it', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'off');
    const m = await signPledge();
    const line = m.calls.find((c) => c.text === PLEDGE_LINE);
    expect(line).toBeTruthy();
    expect(line.opts.force).not.toBe(true);
  });

  it('header narration on: no force needed', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    const m = await signPledge();
    const line = m.calls.find((c) => c.text === PLEDGE_LINE);
    expect(line).toBeTruthy();
    expect(line.opts.force).not.toBe(true);
  });

  it('Instructor voice off in Road Ready: nothing is sent to the voice', async () => {
    const m = await signPledge({ instructorVoice: false });
    expect(m.state.toolData.roadReady.pledgeSigned).toBeTruthy();
    expect(m.callTTS).not.toHaveBeenCalled();
  });

  it('global mute: nothing is sent to the voice (the host device-voice fallback does not check mute)', async () => {
    window.__alloIsGlobalMuted = () => true;
    const m = await signPledge();
    expect(m.state.toolData.roadReady.pledgeSigned).toBeTruthy();
    expect(m.callTTS).not.toHaveBeenCalled();
  });

  it('Accessibility panel has an Instructor voice checkbox, on by default, saved to the tool state', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    const box = m.host.querySelector('input[type="checkbox"][data-rr-instructor-voice]');
    expect(box).toBeTruthy();
    expect(box.closest('label').textContent).toContain('Instructor voice');
    expect(box.checked).toBe(true);
    await React.act(async () => { box.click(); });
    expect(m.state.toolData.roadReady.instructorVoice).toBe(false);
    expect(m.host.querySelector('input[data-rr-instructor-voice]').checked).toBe(false);
    await React.act(async () => { m.host.querySelector('input[data-rr-instructor-voice]').click(); });
    expect(m.state.toolData.roadReady.instructorVoice).toBe(true);
  });

  it('mid-drive switch in More: turns the voice off, cancels the line being made, stops the device voice', async () => {
    window.__alloStudentAiDisabled = true;
    const cancel = vi.fn();
    const prevSynth = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: { cancel, speak: vi.fn() } });
    try {
      const m = await mount({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true });
      await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
      await React.act(async () => { await sleep(1300); });
      const belt = m.calls.find((c) => c.text === 'Fasten your seatbelt before driving.');
      expect(belt).toBeTruthy();
      expect(belt.opts.signal.aborted).toBe(false);
      await React.act(async () => { buttonByText(m.host, 'More').click(); });
      const on = buttonByText(m.host, 'Instructor voice: On');
      expect(on).toBeTruthy();
      cancel.mockClear();
      await React.act(async () => { on.click(); });
      expect(belt.opts.signal.aborted).toBe(true);
      expect(cancel).toHaveBeenCalled();
      expect(m.state.toolData.roadReady.instructorVoice).toBe(false);
      const off = buttonByText(m.host, 'Instructor voice: Off');
      expect(off).toBeTruthy();
      await React.act(async () => { off.click(); });
      expect(m.state.toolData.roadReady.instructorVoice).toBe(true);
      expect(buttonByText(m.host, 'Instructor voice: On')).toBeTruthy();
    } finally {
      if (prevSynth) Object.defineProperty(window, 'speechSynthesis', prevSynth); else delete window.speechSynthesis;
    }
  });
});
