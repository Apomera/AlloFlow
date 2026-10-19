/**
 * Read aloud. Each phase is a long page of text on a phone, so Mission Control
 * reads the essentials (the phase, what it is, your job now, what comes next) and
 * each Predict first card reads its question with what the card shows: the
 * numbered choices, then the student's pick, then the result. Speech goes through
 * the host's TTS (forced, because the student asked) or the browser's own speech,
 * and stops when the student moves to another phase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';
let speech;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
  // jsdom has no speech: record what the browser would say.
  speech = { spoken: [], cancelled: 0 };
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  window.speechSynthesis = { speak: (u) => speech.spoken.push(u.text), cancel: () => { speech.cancelled++; } };
});
afterEach(() => { delete window.SpeechSynthesisUtterance; delete window.speechSynthesis; document.body.innerHTML = ''; });

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
function buttons(tree, test) {
  const found = [];
  const walk = (n) => {
    if (n == null || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'button' && n.props && test(n.props)) found.push(n.props);
    walk(n.props && n.props.children);
  };
  walk(tree);
  return found;
}
const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
};
function mount(state, extra = {}) {
  const store = newStore({ moonMission: Object.assign({ lunarSamples: [] }, state) });
  const tree = window.StemLab._registry[ID].render(makeCtx(Object.assign({ toolData: store.toolData }, extra), store));
  return { store, tree, readAloud: (key) => buttons(tree, (p) => p['data-moonmission-read-aloud'] === key) };
}

describe('Moon Mission read aloud', () => {
  it('Mission Control reads the phase, what it is, your job now and what comes next, as displayed', () => {
    for (const phase of [0, 1, 4, 9, 10]) {
      const page = document.createElement('div');
      page.innerHTML = renderTool(ID, { moonMission: { missionPhase: phase } });
      const heading = page.querySelector('[data-moonmission-phase-heading]'), task = page.querySelector('[data-moonmission-task]');
      const shown = [heading.textContent + '.', heading.nextElementSibling.textContent, task.textContent.replace(/^\S+\s/, ''), task.nextElementSibling.textContent].map(norm).join(' ');
      const [button] = mount({ missionPhase: phase }).readAloud('phase');
      expect(button, 'phase ' + phase + ' read-aloud button').toBeTruthy();
      expect(button['aria-label'], 'label in name: starts with the visible words').toMatch(/^Read aloud: this phase/);
      speech.spoken.length = 0;
      button.onClick();
      expect(speech.spoken.map(norm), 'phase ' + phase).toEqual([shown]);
    }
  });

  it('a prediction card reads its question and numbered choices, then the pick, then the result', () => {
    const question = 'The same push that gives a 0.35-second hop on Earth, tried on the Moon. How long are you in the air?';
    const ask = mount({ missionPhase: 6 }).readAloud('prediction');
    expect(ask.length).toBe(1);
    ask[0].onClick();
    expect(norm(speech.spoken.pop())).toBe(question + ' 1. About the same, 0.35 s. 2. About twice as long, 0.7 s. 3. About six times as long, 2 s.');
    mount({ missionPhase: 6, predictions: { hop_time: 'double' } }).readAloud('prediction')[0].onClick();
    expect(norm(speech.spoken.pop())).toBe(question + ' Your prediction: About twice as long, 0.7 s. On the surface, press Space (or JUMP) and watch the hop timer.');
    mount({ missionPhase: 6, predictions: { hop_time: 'double' }, evaHopTime: 2.1 }).readAloud('prediction')[0].onClick();
    const result = norm(speech.spoken.pop());
    expect(result.startsWith(question + ' Your prediction: About twice as long, 0.7 s. The flight showed: About six times as long, 2 s. Your last hop: 2.1 s in the air.')).toBe(true);
    expect(result).toMatch(/one sixth as hard/);
  });

  it('uses the host speech with force when it has it, and the browser when the host returns nothing', async () => {
    const callTTS = vi.fn(() => Promise.resolve('blob:spoken'));
    mount({ missionPhase: 1 }, { callTTS }).readAloud('phase')[0].onClick();
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(callTTS.mock.calls[0][0]).toMatch(/^Launch\./);
    expect(callTTS.mock.calls[0][3]).toEqual({ force: true });
    await Promise.resolve(); await Promise.resolve();
    expect(speech.spoken, 'host spoke it').toEqual([]);
    const silent = vi.fn(() => Promise.resolve(null));
    mount({ missionPhase: 1 }, { callTTS: silent }).readAloud('phase')[0].onClick();
    await Promise.resolve(); await Promise.resolve();
    expect(speech.spoken.length, 'browser fallback').toBe(1);
    const broken = vi.fn(() => { throw new Error('no voice'); });
    mount({ missionPhase: 1 }, { callTTS: broken }).readAloud('phase')[0].onClick();
    expect(speech.spoken.length, 'fallback after a throw').toBe(2);
  });

  it('tells the student when no speech is available', () => {
    delete window.speechSynthesis;
    const addToast = vi.fn();
    mount({ missionPhase: 0 }, { addToast }).readAloud('phase')[0].onClick();
    expect(addToast).toHaveBeenCalledWith('Read aloud is not available in this browser.', 'info');
  });

  it('stops reading when the student moves to the next phase', () => {
    const { tree } = mount({ missionPhase: 0 });
    const begin = buttons(tree, (p) => /Begin Mission/.test(textOf(p.children)))[0];
    expect(begin, 'Begin Mission button').toBeTruthy();
    const before = speech.cancelled;
    begin.onClick();
    expect(speech.cancelled, 'speech cancelled on the phase change').toBeGreaterThan(before);
  });
});
