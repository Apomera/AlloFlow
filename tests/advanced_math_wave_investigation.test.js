import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let root;
beforeEach(() => {
  const drawing = new Proxy({}, { get: (target, key) => key in target ? target[key] :
    typeof key === 'string' && /Gradient$/.test(key) ? () => ({ addColorStop() {} }) : key === 'measureText' ? () => ({ width: 20 }) : () => {} });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(wave = {}) {
  const tool = loadTool('stem_lab/stem_tool_funcgrapher.js', 'funcGrapher');
  let latest;
  const awardXP = vi.fn();
  function App() {
    const [state, setState] = React.useState({ funcGrapher: { type: 'quadratic', a: 2, b: 1, c: -3, _waveHunt: wave } });
    latest = state;
    return tool.render(makeCtx({ toolData: state, labToolData: state, setToolData: setState, setLabToolData: setState, awardXP }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest.funcGrapher, awardXP };
}
const panel = () => document.querySelector('[data-wave-investigation]');
async function click(name) {
  const button = [...panel().querySelectorAll('button')].find(button => button.textContent === name);
  expect(button, name).toBeTruthy();
  await React.act(() => button.click());
}
async function slide(id, value) {
  const input = document.getElementById(id);
  await React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('linked wave investigation', () => {
  it('connects the wave curve to its own sliders while preserving the main graph', async () => {
    const app = await mount();
    const before = panel().querySelector('[data-wave-current]').getAttribute('d');
    await slide('wa-amp', 2);
    expect(panel().querySelector('[data-wave-current]').getAttribute('d')).not.toBe(before);
    expect(Number(panel().querySelector('[data-wave-amplitude]').dataset.waveAmplitude)).toBe(2);
    expect(app.state()).toMatchObject({ type: 'quadratic', a: 2, b: 1, c: -3 });
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('uses the magnitude of a negative coefficient as amplitude', async () => {
    await mount({ amp: -3, freq: 1, phase: 0 });
    expect(Number(panel().querySelector('[data-wave-amplitude]').dataset.waveAmplitude)).toBe(3);
    expect(panel().querySelector('[data-wave-meaning]').textContent).toContain('reflects the wave');
  });

  it('relates the inside multiplier and phase to period, horizontal shift, and y at zero', async () => {
    await mount({ amp: 2, freq: 2, phase: 1 });
    expect(Number(panel().querySelector('[data-wave-period]').dataset.wavePeriod)).toBeCloseTo(Math.PI);
    expect(Number(panel().querySelector('[data-wave-shift]').dataset.waveShift)).toBe(-0.5);
    expect(Number(panel().querySelector('[data-wave-zero-value]').dataset.waveZeroValue)).toBeCloseTo(2 * Math.sin(1));
  });

  it.each([{ amp: 0, freq: 2, phase: 1 }, { amp: 2, freq: 0, phase: 1 }])('handles constant settings without a spurious period or shift: %j', async (wave) => {
    await mount(wave);
    expect(panel().querySelector('[data-wave-meaning]').textContent).toContain('constant function');
    expect(panel().querySelector('[data-wave-measure="period"]').hasAttribute('data-wave-period')).toBe(false);
    expect(panel().querySelector('[data-wave-measure="shift"]').textContent).toBe('Not unique');
    const path = panel().querySelector('[data-wave-current]').getAttribute('d');
    expect(path).not.toMatch(/NaN|Infinity/);
    expect(new Set([...path.matchAll(/,(-?\d+\.\d+)/g)].map(match => match[1])).size).toBe(1);
  });

  it('saves visible records and retains the reference curve when a slider changes', async () => {
    await mount();
    await click('Save setting');
    const reference = panel().querySelector('[data-wave-reference]').getAttribute('d');
    await slide('wa-amp', 2);
    expect(panel().querySelector('[data-wave-reference]').getAttribute('d')).toBe(reference);
    expect(panel().querySelector('[data-wave-current]').getAttribute('d')).not.toBe(reference);
    expect(panel().querySelector('[data-wave-comparison]').textContent).toContain('One parameter changed: a');
    await click('Save setting');
    expect(panel().querySelectorAll('[data-wave-record]')).toHaveLength(2);
    expect([...panel().querySelectorAll('button')].find(button => button.textContent === 'Already saved as setting 2').disabled).toBe(true);
  });

  it('warns about changing several parameters and restores the reference without deleting evidence', async () => {
    const app = await mount();
    await click('Save setting');
    await slide('wa-amp', 2);
    await slide('wa-freq', 2);
    expect(panel().querySelector('[data-wave-comparison]').textContent).toContain('Several parameters changed');
    await click('Restore reference');
    expect(app.state()._waveHunt).toMatchObject({ amp: 1, freq: 1, phase: 0 });
    expect(panel().querySelectorAll('[data-wave-record]')).toHaveLength(1);
  });

  it('keeps eight distinct records and repairs a reference whose old record falls out', async () => {
    const log = Array.from({ length: 8 }, (_, index) => ({ a: index / 10, f: 1, p: 0 }));
    const app = await mount({ amp: 2, freq: 1, phase: 0, log, referenceKey: '0|1|0' });
    await click('Save setting');
    expect(app.state()._waveHunt.log).toHaveLength(8);
    expect(panel().querySelectorAll('[data-wave-record]')).toHaveLength(8);
    expect(panel().querySelector('[data-wave-reference]').dataset.waveReference).toBe('0.1|1|0');
  });

  it('shows legacy phase strings and saved reflections without changing their meaning', async () => {
    await mount({ log: [{ a: -2, f: 1, p: '1.20', st: 'short' }], hypothesis: 'My earlier observation', understood: true, explanation: 'My evidence' });
    expect(panel().querySelector('[data-wave-record]').textContent).toContain('y = -2 sin(1x + 1.2)');
    expect(document.getElementById('wave-working-explanation').value).toBe('My earlier observation');
    expect(panel().querySelector('[aria-label="Function grapher explanation"]').value).toBe('My evidence');
  });

  it('switches reference records and keeps a valid disclosure target when records are hidden', async () => {
    const app = await mount({ amp: 1, freq: 1, phase: 0, log: [{ a: 1, f: 1, p: 0 }, { a: 2, f: 1, p: 0 }] });
    const select = document.getElementById('wave-reference-select');
    await React.act(() => { select.value = '2|1|0'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(panel().querySelector('[data-wave-reference]').dataset.waveReference).toBe('2|1|0');
    await click('Restore reference');
    expect(app.state()._waveHunt.amp).toBe(2);
    await click('Saved settings (2/8)');
    const list = document.getElementById('wave-saved-settings');
    expect(list.hidden).toBe(true);
    expect(panel().querySelector('[aria-controls="wave-saved-settings"]').getAttribute('aria-expanded')).toBe('false');
    expect(panel().querySelector('[data-wave-reference]')).not.toBeNull();
    await click('Saved settings (2/8)');
    expect(list.hidden).toBe(false);
    expect(list.children).toHaveLength(2);
  });

  it('changes the investigation question without changing parameter settings', async () => {
    const app = await mount({ amp: 2, freq: 2, phase: 1 });
    await click('Shift');
    expect(panel().querySelector('[data-wave-question]').dataset.waveQuestion).toBe('shift');
    expect(app.state()._waveHunt).toMatchObject({ amp: 2, freq: 2, phase: 1 });
  });

  it('resets only the wave investigation, clearing stale evidence and notes', async () => {
    const app = await mount({ amp: -2, freq: 2, phase: 1, log: [{ a: 1, f: 1, p: 0 }], understood: true, explanation: 'Old explanation' });
    await click('Reset investigation');
    expect(panel().querySelector('[data-wave-reference]')).toBeNull();
    expect(panel().querySelectorAll('[data-wave-record]')).toHaveLength(0);
    expect(app.state()._waveHunt).toMatchObject({ amp: 1, freq: 1, phase: 0, log: [], explanation: '' });
    expect(app.state().type).toBe('quadratic');
  });
});
