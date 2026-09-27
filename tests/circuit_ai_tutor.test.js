import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe('Circuit AI tutor request lifecycle', () => {
  let host, root, config, latest, update, provider, seed;
  const response = () => host.querySelector('[data-circuit-ai-response]')?.textContent || '';
  const snapshot = (prompt) => JSON.parse(prompt.split('Circuit snapshot:\n')[1].split('\n\nModel limits:')[0]);
  const ask = () => host.querySelector('#circuit-ai-question').nextElementSibling;
  const editQuestion = async (value) => {
    await act(async () => {
      const input = host.querySelector('#circuit-ai-question');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  function Harness({ visible = true }) {
    const [toolData, setToolData] = React.useState(seed);
    latest = toolData._circuit;
    update = (patch) => setToolData(prev => ({ ...prev, _circuit: { ...prev._circuit, ...patch } }));
    return visible ? config.render(makeCtx({ toolData, setToolData, callGemini: provider })) : React.createElement('p', null, 'Another tool');
  }
  const render = async (visible = true) => {
    await act(async () => root.render(React.createElement(Harness, { visible })));
  };
  const request = async () => { await act(async () => ask().click()); };

  beforeEach(() => {
    const context = new Proxy({
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }),
    }, { get: (target, key) => target[key] || (() => {}) });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    seed = { _circuit: { mode: 'series', voltage: 9, components: [{ id: 1, type: 'resistor', value: 470 }], pauseMotion: true, showAI: true, aiQuestion: 'Why does the current change?', prediction: 'Keep this private notebook note.' } };
    provider = vi.fn();
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks();
  });

  it('sends the approved circuit readings and accepts a valid string response', async () => {
    provider.mockReturnValue('  Use the readings to compare your circuits.  ');
    await render(); await request();
    expect(provider).toHaveBeenCalledTimes(1);
    const [prompt, ...options] = provider.mock.calls[0];
    expect(prompt).toContain('Student question: "Why does the current change?"');
    const circuit = snapshot(prompt);
    expect(circuit.connection).toBe('series');
    expect(circuit.supplyVoltageV).toBe(9);
    expect(circuit.equivalentResistanceOhm).toBe(470);
    expect(circuit.sourceCurrentA).toBeCloseTo(9 / 470, 12);
    expect(circuit.sourcePowerW).toBeCloseTo(81 / 470, 12);
    expect(circuit.parts).toHaveLength(1);
    expect(circuit.parts[0]).toMatchObject({ position: 1, type: 'resistor', settings: { resistanceOhm: 470 }, voltageV: 9 });
    expect(circuit.parts[0].currentA).toBeCloseTo(9 / 470, 12);
    expect(circuit.parts[0].powerW).toBeCloseTo(81 / 470, 12);
    expect(prompt).not.toContain('private notebook note');
    expect(options).toEqual([false, false, 0.7]);
    expect(response()).toBe('Use the readings to compare your circuits.');
    expect(latest._aiLoading).toBe(false);
    expect(ask().disabled).toBe(false);
  });

  it('includes LED polarity and forward drop with calculated resistor and LED readings', async () => {
    seed._circuit.components.push({ id: 2, type: 'led', reversed: false, ledColor: '#ef4444' });
    provider.mockResolvedValue('Compare the LED drop with the resistor drop.');
    await render(); await request();
    const circuit = snapshot(provider.mock.calls[0][0]), current = (9 - 2) / (470 + 10);
    expect(circuit.parts[1]).toMatchObject({ type: 'led', settings: { polarity: 'forward', color: '#ef4444', forwardVoltageV: 2 } });
    expect(circuit.sourceCurrentA).toBeCloseTo(current, 12);
    expect(circuit.parts[0].voltageV).toBeCloseTo(current * 470, 12);
    expect(circuit.parts[1].voltageV).toBeCloseTo(2 + current * 10, 12);
    expect(circuit.parts[0].powerW + circuit.parts[1].powerW).toBeCloseTo(circuit.sourcePowerW, 12);
  });

  it('preserves unknown capacitor voltages instead of inventing zero readings', async () => {
    seed._circuit.components.push({ id: 2, type: 'capacitor', value: 100 }, { id: 3, type: 'capacitor', value: 220 });
    provider.mockResolvedValue('Those individual capacitor voltages are undetermined.');
    await render(); await request();
    const prompt = provider.mock.calls[0][0], circuit = snapshot(prompt);
    expect(circuit.openCircuit).toBe(true);
    expect(circuit.ambiguousVoltages).toBe(true);
    expect(circuit.sourceCurrentA).toBe(0);
    expect(circuit.parts[1]).toMatchObject({ settings: { capacitanceMicrofarad: 100 }, voltageV: null, currentA: 0 });
    expect(circuit.parts[2]).toMatchObject({ settings: { capacitanceMicrofarad: 220 }, voltageV: null, currentA: 0 });
    expect(prompt).toContain('null means undetermined, not zero');
  });

  it('describes parallel branch settings and an ideal short with the model limits', async () => {
    seed._circuit.mode = 'parallel';
    seed._circuit.components = [
      { id: 1, type: 'bulb', value: 300 }, { id: 2, type: 'switch', closed: false }, { id: 3, type: 'ammeter' },
    ];
    provider.mockResolvedValue('The ammeter branch has very low resistance.');
    await render(); await request();
    const prompt = provider.mock.calls[0][0], circuit = snapshot(prompt);
    expect(circuit.connection).toBe('parallel');
    expect(circuit.shortCircuit).toBe(true);
    expect(circuit.parts[0]).toMatchObject({ settings: { resistanceOhm: 300 }, voltageV: 9, currentA: .03 });
    expect(circuit.parts[1]).toMatchObject({ settings: { position: 'open' }, voltageV: 9, currentA: 0 });
    expect(circuit.parts[2]).toMatchObject({ type: 'ammeter', voltageV: 9, currentA: 9000 });
    for (const text of ['each listed part is its own branch', 'ideal steady DC', 'Bulbs have fixed resistance', 'no current limit', 'not calculated time data', 'startup transients are not modeled']) expect(prompt).toContain(text);
  });

  it('whitelists circuit fields and leaves notebook notes, history, and prior answers out of the prompt', async () => {
    Object.assign(seed._circuit, {
      explanation: 'PRIVATE_EXPLANATION', lessonExplanation: 'PRIVATE_LESSON_NOTE', _aiResponse: 'PRIVATE_PREVIOUS_ANSWER',
      undo: [{ mode: 'series', voltage: 3, components: [], privateHistory: 'PRIVATE_HISTORY' }],
      observations: [{ before: { mode: 'series', voltage: 9, components: [] }, after: { mode: 'series', voltage: 9, components: [] }, delta: 0, prediction: 'PRIVATE_OBSERVATION', explanation: 'PRIVATE_OBSERVATION_EXPLANATION' }],
    });
    provider.mockResolvedValue('Use the current readings.');
    await render(); await request();
    const prompt = provider.mock.calls[0][0], circuit = snapshot(prompt);
    expect(prompt).not.toContain('PRIVATE_');
    expect(prompt).not.toContain('private notebook note');
    expect(Object.keys(circuit).sort()).toEqual(['connection', 'supplyVoltageV', 'sourceCurrentA', 'sourcePowerW', 'equivalentResistanceOhm', 'openCircuit', 'shortCircuit', 'ambiguousVoltages', 'ledOvercurrent', 'parts'].sort());
    expect(Object.keys(circuit.parts[0]).sort()).toEqual(['position', 'type', 'settings', 'voltageV', 'currentA', 'powerW'].sort());
  });

  it('discards a reply after a circuit edit and permits a fresh request', async () => {
    const first = deferred(), second = deferred();
    provider.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await render(); await request();
    expect(latest._aiLoading).toBe(true);
    await act(async () => update({ voltage: 12 }));
    expect(latest._aiLoading).toBe(false);
    expect(response()).toContain('circuit or question changed');
    await request();
    expect(snapshot(provider.mock.calls[1][0]).supplyVoltageV).toBe(12);
    await act(async () => first.resolve('An obsolete answer about 9 V.'));
    expect(latest._aiLoading).toBe(true);
    expect(response()).toBe('');
    await act(async () => second.resolve('An answer about 12 V.'));
    expect(response()).toBe('An answer about 12 V.');
    expect(latest.voltage).toBe(12);
    expect(latest.prediction).toBe('Keep this private notebook note.');
  });

  it('discards a reply after editing the question', async () => {
    const pending = deferred(); provider.mockReturnValue(pending.promise);
    await render(); await request(); await editQuestion('What does resistance do?');
    expect(ask().disabled).toBe(false);
    await act(async () => pending.resolve('Answer to the old question.'));
    expect(response()).toContain('circuit or question changed');
    expect(response()).not.toContain('old question');
  });

  it('checks the latest host state when an edit and reply arrive in the same batch', async () => {
    const pending = deferred(); provider.mockReturnValue(pending.promise);
    await render(); await request();
    await act(async () => { update({ voltage: 24 }); pending.resolve('Obsolete 9 V answer.'); });
    expect(latest._aiLoading).toBe(false);
    expect(response()).toContain('circuit or question changed');
    expect(response()).not.toContain('Obsolete');
  });

  it('clears busy on unmount and keeps an older mount from overwriting a later answer', async () => {
    const first = deferred(), second = deferred();
    provider.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await render(); await request(); await render(false);
    expect(latest._aiLoading).toBe(false);
    await render(); await request();
    await act(async () => second.resolve('The current study answer.'));
    await act(async () => first.resolve('A reply from the previous mount.'));
    expect(response()).toBe('The current study answer.');
  });

  it('lets the student stop waiting and retry without accepting the stopped reply', async () => {
    const first = deferred(), second = deferred();
    provider.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await render(); await request();
    await act(async () => host.querySelector('[data-circuit-ai-stop]').click());
    expect(response()).toContain('Stopped waiting'); expect(ask().disabled).toBe(false);
    await request(); await act(async () => first.reject(new Error('Late failure')));
    expect(latest._aiLoading).toBe(true); expect(response()).toBe('');
    await act(async () => second.resolve('Retry succeeded.'));
    expect(response()).toBe('Retry succeeded.');
  });

  it.each([
    ['synchronous throw', () => { throw new Error('Provider failed'); }],
    ['rejection', () => Promise.reject(new Error('Provider failed'))],
    ['undefined return', () => undefined],
    ['object return', () => ({ text: 'Unexpected response shape' })],
    ['empty reply', () => Promise.resolve('   ')],
  ])('clears busy after %s and allows retry', async (_label, failure) => {
    provider.mockImplementationOnce(failure).mockResolvedValueOnce('Recovered.');
    await render(); await request();
    expect(latest._aiLoading).toBe(false); expect(response()).toContain('Try asking again');
    expect(ask().disabled).toBe(false);
    await request(); expect(response()).toBe('Recovered.');
  });

  it('handles an unavailable provider and restores a saved busy state', async () => {
    seed._circuit._aiLoading = true; provider = null;
    await render(); expect(ask().disabled).toBe(false);
    await request(); expect(response()).toContain('unavailable here'); expect(latest._aiLoading).toBe(false);
  });

  it('ignores duplicate clicks and empty questions', async () => {
    const pending = deferred(); provider.mockReturnValue(pending.promise);
    await render(); await act(async () => { const button = ask(); button.click(); button.click(); });
    expect(provider).toHaveBeenCalledTimes(1);
    await editQuestion('   '); expect(ask().disabled).toBe(true);
    await act(async () => host.querySelector('#circuit-ai-question').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
