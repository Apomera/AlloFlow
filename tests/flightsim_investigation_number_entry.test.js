import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, tool, latest;
const number = key => host.querySelector(`[data-investigation-number="${key}"]`);
const range = key => host.querySelector(`#trial-${key}`);
const record = () => latest.stallInvestigation;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const fields = ['airspeed', 'altitude', 'aoa'];
const canonical = () => ({ airspeed: 130, altitude: 5000, aoa: 8 });
const evidence = () => [
  { airspeed: 130, altitude: 5000, aoa: 8 },
  { airspeed: 130, altitude: 5000, aoa: 20 },
  { airspeed: 80, altitude: 5000, aoa: 20 },
];

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  tool = loadTool(process.env.SKYSCHOOL_NUMBER_ENTRY_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null;
  host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(saved = {}, translations = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt',
      stallInvestigation: { phase: 'experiment', prediction: 'angle', ...canonical(), observations: [], ...saved } } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => translations[key] || fallback || key,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}

function inputEvent(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
async function draft(key, value) { await act(async () => inputEvent(number(key), value)); }
async function keyEdit(key, value, pressedKey) {
  await act(async () => {
    const input = number(key);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: pressedKey, bubbles: true, cancelable: true }));
    inputEvent(input, value);
    input.dispatchEvent(new KeyboardEvent('keyup', { key: pressedKey, bubbles: true }));
  });
}
async function click(text) {
  expect(button(text)).toBeTruthy();
  // Programmatic clicks deliberately do not blur a number first. The action
  // must commit its pending conditions even when browser focus has not moved.
  await act(async () => button(text).click());
}
async function commit(key, method = 'blur') {
  const input = number(key);
  await act(async () => {
    if (method === 'Enter') input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    else { input.focus(); input.blur(); }
  });
}
function expectSynchronized(values) {
  expect(record()).toMatchObject(values);
  for (const key of fields) if (Object.hasOwn(values, key)) {
    expect(number(key).value).toBe(String(values[key]));
    expect(Number(range(key).value)).toBe(values[key]);
  }
}
function props(node) {
  const key = Object.keys(node).find(key => key.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return node[key];
}

describe('incremental investigation number entry', () => {
  it.each([
    ['airspeed', '80', 80, '150', 150],
    ['altitude', '10000', 10000, '6500', 6500],
    ['aoa', '-2.5', -2.5, '20', 20],
  ])('keeps %s focused after Enter and accepts another edit without refocusing', async (key, first, firstSaved, second, secondSaved) => {
    await mount(); const input = number(key); input.focus(); await draft(key, first);
    await commit(key, 'Enter'); expectSynchronized({ [key]: firstSaved });
    expect(document.activeElement).toBe(input);
    await draft(key, second); expect(document.activeElement).toBe(input);
    expect(record()[key]).toBe(firstSaved); expect(input.value).toBe(second);
    await commit(key, 'Enter'); expectSynchronized({ [key]: secondSaved });
    expect(document.activeElement).toBe(input); expect(record().observations).toHaveLength(0);
  });

  it.each([
    ['airspeed', '', 130], ['altitude', '25000', 20000], ['aoa', '-10', -5],
  ])('retains %s focus when Enter applies blank or bounded value %j', async (key, value, expected) => {
    await mount(); const input = number(key); input.focus(); await draft(key, value);
    await commit(key, 'Enter'); expectSynchronized({ [key]: expected });
    expect(document.activeElement).toBe(input);
  });

  it('leaves composition Enter to the input method and commits only the later plain Enter', async () => {
    await mount(); const input = number('aoa'); input.focus(); await draft('aoa', '14');
    const event = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true });
    await act(async () => input.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false); expect(record().aoa).toBe(8);
    expect(input.value).toBe('14'); expect(document.activeElement).toBe(input);
    await commit('aoa', 'Enter'); expectSynchronized({ aoa: 14 }); expect(document.activeElement).toBe(input);
  });

  it('does not change saved conditions or move focus when Enter repeats after a commit', async () => {
    await mount(); const input = number('airspeed'); input.focus(); await draft('airspeed', '80');
    await commit('airspeed', 'Enter'); const saved = JSON.stringify(record());
    await act(async () => {
      for (let count = 0; count < 3; count++) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    });
    expect(JSON.stringify(record())).toBe(saved); expect(document.activeElement).toBe(input);
  });

  it('describes each numeric field with its visible bounds and commit behavior', async () => {
    await mount();
    for (const [key, min, max] of [['airspeed', 40, 250], ['altitude', 0, 20000], ['aoa', -5, 25]]) {
      const input = number(key);
      const help = host.querySelector(`[data-investigation-number-help="${key}"]`);
      expect(help).not.toBeNull();
      expect(input.getAttribute('aria-describedby')).toBe(help.id);
      expect(document.getElementById(help.id)).toBe(help);
      expect(host.querySelectorAll(`[id="${help.id}"]`)).toHaveLength(1);
      expect(help.textContent).toContain(`Enter ${min} to ${max}.`);
      expect(help.textContent).toContain('Blank entries keep the saved value.');
      expect(help.textContent).toContain('Values outside this range are limited to the nearest bound when applied.');
      expect(help.hidden).toBe(false);
      expect(help.getAttribute('aria-hidden')).not.toBe('true');
      expect(range(key).hasAttribute('aria-describedby')).toBe(false);
    }
  });

  it('keeps numeric guidance available during incomplete drafts without reporting premature errors', async () => {
    await mount();
    for (const [key, value] of [['airspeed', '8'], ['altitude', ''], ['aoa', '-']]) {
      await draft(key, value);
      expect(number(key).value).toBe(value === '-' ? '' : value);
      expect(number(key).getAttribute('aria-invalid')).not.toBe('true');
      expect(document.getElementById(number(key).getAttribute('aria-describedby'))?.textContent).toContain('Blank entries keep the saved value.');
      expect(record()[key]).toBe(canonical()[key]);
    }
    await click('Record observation');
    expectSynchronized({ airspeed: 40, altitude: 5000, aoa: 8 });
    expect(record().observations[0]).toMatchObject({ airspeed: 40, altitude: 5000, aoa: 8 });
  });

  it('uses translated guidance and substitutes bounds in the translated order', async () => {
    await mount({}, { 'stem.flightsim.guided_numeric_input_help': 'Maximum {max}; minimum {min}. Conserver la valeur enregistrée si le champ est vide.' });
    for (const [key, min, max] of [['airspeed', 40, 250], ['altitude', 0, 20000], ['aoa', -5, 25]]) {
      const help = document.getElementById(number(key).getAttribute('aria-describedby'));
      expect(help?.textContent).toBe(`Maximum ${max}; minimum ${min}. Conserver la valeur enregistrée si le champ est vide.`);
      expect(help?.textContent).not.toMatch(/\{(?:min|max)\}/);
    }
    expectSynchronized(canonical());
  });

  it.each([
    ['airspeed', ['', '8', '80'], 80],
    ['altitude', ['', '1', '10', '100', '1000', '10000'], 10000],
    // type=number exposes an incomplete minus sign as an empty value. It must
    // stay editable rather than restoring the prior positive angle.
    ['aoa', ['', '-', '-2', '-2.5'], -2.5],
  ].flatMap(([key, sequence, expected]) => ['blur', 'Enter'].map(method => [key, sequence, expected, method])))(
    'keeps %s prefixes %j editable and commits %s through %s', async (key, sequence, expected, method) => {
      await mount();
      const initial = canonical()[key];
      await act(async () => number(key).focus());
      for (const value of sequence) {
        await keyEdit(key, value, value.length < number(key).value.length ? 'Backspace' : value.slice(-1) || 'Backspace');
        expect(number(key).value).toBe(value === '-' ? '' : value);
        expect(record()[key]).toBe(initial);
        expect(Number(range(key).value)).toBe(initial);
      }
      await commit(key, method);
      expectSynchronized({ [key]: expected });
    });

  it('supports backspacing through values below minimum before typing a replacement', async () => {
    await mount();
    for (const value of ['13', '1', '', '8', '80']) {
      await keyEdit('airspeed', value, value.length < number('airspeed').value.length ? 'Backspace' : value.slice(-1) || 'Backspace');
      expect(number('airspeed').value).toBe(value);
      expect(record().airspeed).toBe(130);
    }
    await commit('airspeed'); expectSynchronized({ airspeed: 80 });
  });

  it.each([
    ['airspeed', '8', 40], ['airspeed', '999', 250],
    ['altitude', '-500', 0], ['altitude', '25000', 20000],
    ['aoa', '-10', -5], ['aoa', '40', 25],
  ])('bounds a complete %s value %s only when committed', async (key, value, expected) => {
    await mount(); await draft(key, value);
    expect(number(key).value).toBe(value); expect(record()[key]).toBe(canonical()[key]);
    await commit(key, 'Enter'); expectSynchronized({ [key]: expected });
  });

  it.each(fields)('restores the previous %s condition when an empty edit is committed', async key => {
    await mount(); await draft(key, '');
    expect(number(key).value).toBe('');
    await commit(key); expectSynchronized({ [key]: canonical()[key] });
  });
});

describe('trial actions commit visible numeric conditions', () => {
  it('records all pending edits without needing a native blur first', async () => {
    await mount();
    await draft('airspeed', '8'); await draft('airspeed', '80');
    await draft('altitude', '10000'); await draft('aoa', '-2.5');
    expect(record()).toMatchObject(canonical());
    await click('Record observation');
    expectSynchronized({ airspeed: 80, altitude: 10000, aoa: -2.5 });
    expect(record().observations).toHaveLength(1);
    expect(record().observations[0]).toMatchObject({ airspeed: 80, altitude: 10000, aoa: -2.5 });
  });

  it('commits edits and records them in the same batched event turn', async () => {
    await mount();
    await act(async () => {
      inputEvent(number('airspeed'), '80');
      inputEvent(number('altitude'), '6500');
      inputEvent(number('aoa'), '20');
      button('Record observation').click();
    });
    expectSynchronized({ airspeed: 80, altitude: 6500, aoa: 20 });
    expect(record().observations[0]).toMatchObject({ airspeed: 80, altitude: 6500, aoa: 20, state: 'stall' });
  });

  it('resolves an empty visible field before adding an observation', async () => {
    await mount(); await draft('airspeed', ''); await click('Record observation');
    expectSynchronized(canonical());
    expect(record().observations[0].airspeed).toBe(130);
  });

  it('keeps a pending number when another variable is changed with its range control', async () => {
    await mount(); await draft('airspeed', '80');
    await act(async () => inputEvent(range('altitude'), '6500'));
    expectSynchronized({ airspeed: 80, altitude: 6500, aoa: 8 });
    await click('Record observation');
    expect(record().observations[0]).toMatchObject({ airspeed: 80, altitude: 6500, aoa: 8 });
  });

  it('lets a range control replace a pending draft for that same variable', async () => {
    await mount(); await draft('airspeed', '8');
    await act(async () => inputEvent(range('airspeed'), '150'));
    expectSynchronized({ airspeed: 150 });
  });

  it('reference conditions replace pending drafts and synchronize every control', async () => {
    await mount(); await draft('airspeed', '80'); await draft('altitude', '10000'); await draft('aoa', '-2.5');
    await click('Reference conditions'); expectSynchronized(canonical());
    await click('Record observation'); expect(record().observations[0]).toMatchObject(canonical());
  });

  it('uses committed draft conditions when preparing an angle-only comparison', async () => {
    await mount(); await draft('airspeed', '80'); await draft('altitude', '6500'); await draft('aoa', '20');
    await click('Change angle only'); expectSynchronized({ airspeed: 80, altitude: 6500, aoa: 8 });
  });

  it('preparing from recorded Trial A replaces pending trial controls without changing evidence', async () => {
    await mount({ observations: evidence() });
    await draft('airspeed', '200'); await draft('altitude', '10000'); await draft('aoa', '-2.5');
    await click('Prepare angle trial from A');
    expectSynchronized({ airspeed: 130, altitude: 5000, aoa: 20 });
    expect(record().observations).toHaveLength(3);
  });

  it('commits controls before phase navigation and does not replay stale number events on return', async () => {
    await mount();
    const stale = props(number('airspeed'));
    await draft('airspeed', '80'); await click('Back to prediction');
    expect(record()).toMatchObject({ phase: 'predict', airspeed: 80 });
    await click('Continue to trials'); expectSynchronized({ airspeed: 80 });
    await draft('airspeed', '100');
    await act(async () => { stale.onChange({ target: { value: '250' } }); stale.onBlur(); });
    expect(number('airspeed').value).toBe('100');
    expect(record().airspeed).toBe(80);
    await click('Record observation'); expect(record().observations[0].airspeed).toBe(100);
  });

  it('reloads only canonical values, then retains a value after its validated commit', async () => {
    await mount(); await draft('airspeed', '80');
    await mount(JSON.parse(JSON.stringify(record()))); expectSynchronized({ airspeed: 130 });
    await draft('airspeed', '80'); await commit('airspeed', 'Enter');
    await mount(JSON.parse(JSON.stringify(record()))); expectSynchronized({ airspeed: 80 });
  });

  it('preserves completion while exploring numbers and invalidates it only after recording new evidence', async () => {
    const completedAt = '2026-10-20T12:00:00.000Z';
    await mount({ observations: evidence(), explanation: 'Angle changed the flow state.',
      transferAnswer: 'stall', transferChoice: 'stall', completedAt });
    await draft('airspeed', '200'); await commit('airspeed');
    expect(record().completedAt).toBe(completedAt);
    await click('Record observation'); expect(record().completedAt).toBeNull();
  });
});
