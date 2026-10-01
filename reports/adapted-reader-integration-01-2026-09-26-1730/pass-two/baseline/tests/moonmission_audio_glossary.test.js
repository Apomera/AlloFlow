// Moon Mission — sound that outlives the tool, and a glossary nobody could read.
//
//   • Only the space/EVA ambience watched for the tool leaving the page. Closing
//     STEAM Lab from the host (Escape, Alt+B, Close) during launch, landing or ascent
//     left the looping engine rumble playing until reload, with no mute control left
//     on screen (WCAG 1.4.2). This drives the real sound toggle with a stubbed audio
//     context and fake timers.
//   • On phases 1-9 the glossary rendered straight onto the host's white card with a
//     translucent ground and indigo-200 ink: 1.49:1, the summary was invisible.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

function buttons(node, out = []) {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => buttons(n, out)); return out; }
  if (node.type === 'button') out.push(node.props);
  const kids = node.props && node.props.children;
  if (kids != null) buttons(kids, out);
  return out;
}

function fakeAudio() {
  const sources = [];
  const node = () => ({ connect() {} });
  const ac = {
    sampleRate: 64, currentTime: 0, state: 'running', destination: {},
    createBuffer: (_c, n) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => { const s = Object.assign(node(), { start() {}, stop: vi.fn() }); sources.push(s); return s; },
    createBiquadFilter: () => Object.assign(node(), { type: '', frequency: { value: 0 }, Q: { value: 0 } }),
    createGain: () => Object.assign(node(), { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }),
    createOscillator: () => Object.assign(node(), { frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, start() {}, stop() {} }),
  };
  return { ac, sources };
}

let marker;
beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  marker = document.createElement('div');
  marker.setAttribute('data-moonmission-tool', 'true');
  document.body.appendChild(marker);
});
afterEach(() => {
  vi.useRealTimers();
  if (marker && marker.parentNode) marker.remove();
});

describe('Moon Mission audio and glossary', () => {
  it('the launch rumble stops once the tool leaves the page, and not before', () => {
    loadTool(FILE, ID);
    const audio = fakeAudio();
    window.StemLab.audioContext = () => audio.ac;
    const store = newStore({ moonMission: { missionPhase: 1, soundOff: true } });
    const tree = window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
    const toggle = buttons(tree).find((p) => p['data-moonmission-sound-toggle']);
    toggle.onClick();                                   // sound back on: phase 1 = launch rumble
    const rumble = audio.sources[audio.sources.length - 1];
    expect(rumble, 'no ambient source started').toBeTruthy();

    vi.advanceTimersByTime(3000);
    expect(rumble.stop, 'stopped while the tool was still open').not.toHaveBeenCalled();

    marker.remove();                                    // host closed STEAM Lab
    vi.advanceTimersByTime(2000);
    expect(rumble.stop, 'the rumble kept playing after the tool left the page').toHaveBeenCalled();
  });

  it('the glossary carries its own dark ground on every phase that shows it', () => {
    loadTool(FILE, ID);
    for (const phase of [0, 1, 3, 5, 9, 10]) {
      const html = renderTool(ID, { moonMission: { missionPhase: phase, lunarSamples: [] } });
      const tag = (html.match(/<details[^>]*data-moonmission-glossary="true"[^>]*>/) || [])[0];
      expect(tag, 'phase ' + phase + ' has no glossary').toBeTruthy();
      expect(tag, 'phase ' + phase).toContain('bg-slate-900');
      expect(tag, 'phase ' + phase).not.toContain('bg-white/5');
    }
  });
});
