import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Circuit guided journey transitions', () => {
  let api;
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });

  it('migrates existing lesson evidence and restores a copy without changing the live bench', () => {
    const old = { lessonId: 'resistance', lessonChoice: 2, lessonTrial: api.circuitLessonResult('resistance', 2), lessonExplanation: '90 mA became 45 mA.' };
    const first = api.circuitLessonStart(old, 'paths');
    expect(first.mode).toBe('parallel');
    expect(first.components).toEqual([{ type: 'resistor', value: 100, id: 1 }]);
    expect(first.lessonRecords.resistance).toMatchObject({ choice: 2, tested: true, explanation: old.lessonExplanation });
    const back = api.circuitLessonStart({ ...old, ...first }, 'resistance');
    expect(back).not.toHaveProperty('components');
    expect(back).not.toHaveProperty('mode');
    expect(back).not.toHaveProperty('voltage');
    expect(back.lessonTrial).toEqual(old.lessonTrial);
    expect(back.lessonTrial).not.toBe(old.lessonTrial);
    expect(back.lessonExplanation).toBe(old.lessonExplanation);
    back.lessonTrial.after.components[0].value = 333;
    expect(old.lessonTrial.after.components[0].value).toBe(200);
    expect(first.lessonRecords.resistance.trial.after.components[0].value).toBe(200);
    expect(api.circuitLessonStart({}, 'missing')).toBeNull();
  });

  it('keeps draft predictions while loading fresh copies of the experiment baseline', () => {
    const loop = api.circuitLessonStart({}, 'loop');
    const paths = api.circuitLessonStart({ ...loop, lessonChoice: 1 }, 'paths');
    const back = api.circuitLessonStart(paths, 'loop');
    expect(back.lessonChoice).toBe(1);
    expect(back.lessonTrial).toBeNull();
    expect(back.lessonRecords.loop.tested).toBe(false);
    back.components[1].closed = true;
    expect(api.circuitLessonStart({}, 'loop').components[1].closed).toBe(false);
  });
});

describe('Circuit guided journey interactions', () => {
  let host, root, config, latest, awardXP;
  beforeEach(() => {
    const canvas = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get(target, key) { return key in target ? target[key] : () => {}; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    awardXP = vi.fn(); latest = null;
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
  async function mount(circuit = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ _circuit: { mode: 'series', voltage: 6, components: [{ id: 8, type: 'resistor', value: 470 }], pauseMotion: true, lessonOpen: true, ...circuit } });
      latest = toolData._circuit;
      return config.render(makeCtx({ toolData, setToolData, awardXP }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const panel = () => host.querySelector('.circuit-lessons');
  const button = label => Array.from(panel().querySelectorAll('button')).find(element => element.textContent === label);
  const card = title => Array.from(panel().querySelectorAll('.circuit-lesson-cards button')).find(element => element.querySelector('strong').textContent === title);
  const click = async element => { expect(element).toBeDefined(); await act(async () => element.click()); };
  const progress = () => panel().querySelector('progress').value;
  async function explain(text) {
    const field = panel().querySelector('textarea');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, text);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('keeps wrong predictions and explanations across lessons, and reloads saved evidence through Undo', async () => {
    const before = { mode: 'series', voltage: 6, components: [{ id: 8, type: 'resistor', value: 470 }] };
    const observations = [{ before, after: { ...before, voltage: 12 }, delta: 6 / 470, explanation: 'Keep my own investigation.', changes: ['Supply voltage'], controlled: true }];
    await mount({ observations });
    await click(card('Turn down the current'));
    await click(button('It doubles'));
    await click(button('Test my prediction'));
    expect(progress()).toBe(1);
    expect(panel().textContent).toContain('Use this result to revise your prediction.');
    await explain('I expected more current; 90 mA became 45 mA because resistance doubled.');
    await click(button('Next: Give charge another path'));
    expect(latest.lessonId).toBe('paths');
    await click(button('It doubles'));
    await click(button('Test my prediction'));
    expect(progress()).toBe(2);
    const live = JSON.stringify({ mode: latest.mode, voltage: latest.voltage, components: latest.components });
    const historySize = latest.undo.length;
    await click(card('Turn down the current'));
    expect(JSON.stringify({ mode: latest.mode, voltage: latest.voltage, components: latest.components })).toBe(live);
    expect(latest.undo).toHaveLength(historySize);
    expect(latest.lessonChoice).toBe(2);
    expect(panel().querySelector('textarea').value).toContain('90 mA became 45 mA');
    expect(panel().textContent).toContain('Saved experiment evidence. Your live bench has changed since this test.');
    expect(Array.from(panel().querySelectorAll('.circuit-comparison strong')).slice(0, 2).map(element => element.textContent)).toEqual(['90.00 mA', '45.00 mA']);
    await click(button('Load this experiment result'));
    expect(latest.mode).toBe('series');
    expect(latest.components[0].value).toBe(200);
    expect(latest.undo).toHaveLength(historySize + 1);
    expect(panel().textContent).toContain('These readings match the experiment now on your bench.');
    const undo = Array.from(host.querySelectorAll('button')).find(element => element.textContent === 'Undo');
    await click(undo);
    expect(JSON.stringify({ mode: latest.mode, voltage: latest.voltage, components: latest.components })).toBe(live);
    expect(latest.lessonExplanation).toContain('90 mA became 45 mA');
    expect(latest.observations).toEqual(observations);
  });

  it('retains untested draft choices without counting them as tested experiments', async () => {
    await mount();
    await click(card('Complete the loop'));
    expect(button('Test my prediction').disabled).toBe(true);
    await click(button('It stays at zero'));
    await click(card('Give charge another path'));
    expect(card('Complete the loop').textContent).toContain('Prediction saved');
    await click(card('Complete the loop'));
    expect(latest.lessonChoice).toBe(1);
    expect(button('It stays at zero').getAttribute('aria-pressed')).toBe('true');
    expect(button('Test my prediction').disabled).toBe(false);
    expect(progress()).toBe(0);
  });

  it('moves focus to the question after selecting a lesson, Next, and Retry', async () => {
    await mount();
    const firstCard = card('Complete the loop');
    firstCard.focus();
    await click(firstCard);
    expect(document.activeElement).toBe(panel().querySelector('legend'));
    await click(button('It stays at zero'));
    await click(button('Test my prediction'));
    const nextButton = button('Next: Turn down the current');
    nextButton.focus();
    await click(nextButton);
    expect(latest.lessonId).toBe('resistance');
    expect(document.activeElement).toBe(panel().querySelector('legend'));
    await click(button('It stays the same'));
    await click(button('Test my prediction'));
    const retryButton = button('Try this experiment again');
    retryButton.focus();
    await click(retryButton);
    expect(latest.lessonTrial).toBeNull();
    expect(document.activeElement).toBe(panel().querySelector('legend'));
    expect(button('Test my prediction').disabled).toBe(true);
  });

  it('offers the next untried experiment and counts each test once without requiring a correct prediction or explanation', async () => {
    await mount();
    await click(card('Complete the loop'));
    await click(button('It stays at zero'));
    await click(button('Test my prediction'));
    expect(button('Next: Turn down the current')).toBeDefined();
    await click(button('Next: Turn down the current'));
    await click(button('It stays the same'));
    await click(button('Test my prediction'));
    await click(button('Next: Give charge another path'));
    await click(button('It stays the same'));
    await click(button('Test my prediction'));
    expect(progress()).toBe(3);
    expect(panel().textContent).toContain('All three experiments tested');
    expect(panel().textContent).toContain('Plan an investigation');
    expect(panel().querySelector('textarea').value).toBe('');
    expect(Array.from(panel().querySelectorAll('button')).some(element => element.textContent.startsWith('Next: '))).toBe(false);
    expect(awardXP).not.toHaveBeenCalled();
    await click(button('Try this experiment again'));
    expect(progress()).toBe(3);
    await click(button('It doubles'));
    await click(button('Test my prediction'));
    expect(progress()).toBe(3);
    expect(awardXP).not.toHaveBeenCalled();
  });
});
