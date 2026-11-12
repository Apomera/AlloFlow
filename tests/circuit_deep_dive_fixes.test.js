// Regressions for the 2026-11-08 Circuit Lab review fixes.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, config;
const p = (id, type, a, b, value, waveform) => ({ id, type, a, b, value, waveform });
const sine = (extra = {}) => ({ shape: 'sine', amplitude: 5, frequency: 10, phase: 0, duty: 50, edge: 2, ...extra });
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });

// 2026-11-11: a 1 µs RC in a 10 s window used to draw one straight line from 0 to 5 V (63% at 31.6 ms).
describe('fast time constants in a long window', () => {
  const rc = (duration, extra = {}) => ({ analysis: 'time', duration, components: [p(1, 'voltage', 'A', '0', 5), Object.assign(p(2, 'switch', 'A', 'B', 0), extra.sw || { closed: true }), p(3, 'resistor', 'B', 'C', 1000), Object.assign(p(4, 'capacitor', 'C', '0', 0.001), { initial: 0 })] });
  const crossing = (run, after = 0) => {
    const v = (f) => f.rows.find((r) => r.component.id === 4).voltage, target = 5 * (1 - Math.exp(-1));
    for (let i = 1; i < run.frames.length; i++) { const a = run.frames[i - 1], b = run.frames[i]; if (a.time < after) continue; if (v(a) < target && v(b) >= target) return a.time + (target - v(a)) / (v(b) - v(a)) * (b.time - a.time) - after; }
    return null;
  };
  it('resolves a 1 µs charge in a 10 s and a 60 s window', () => {
    for (const duration of [10, 60]) {
      const run = api.circuitNetworkTransient(rc(duration));
      expect(run.ok, run.message).toBe(true);
      expect(crossing(run) / 1e-6, duration + ' s window').toBeGreaterThan(0.9);
      expect(crossing(run) / 1e-6, duration + ' s window').toBeLessThan(1.1);
      expect(run.steps).toBeLessThan(2000);
    }
  });
  it('resolves it again after a switch closes part-way through', () => {
    const run = api.circuitNetworkTransient(rc(10, { sw: { closed: false, switching: { enabled: true, events: [{ id: 1, time: 4, closed: true }] } } }));
    expect(run.ok, run.message).toBe(true);
    const t = crossing(run, 4);
    expect(t / 1e-6).toBeGreaterThan(0.9);
    expect(t / 1e-6).toBeLessThan(1.1);
  });
});

describe('connected time response integrator fallback', () => {
  const filter = (duration, integration) => ({ duration, integration, components: [p(1, 'voltage', 'A', '0', 0, sine()), p(2, 'resistor', 'A', 'B', 1000), p(3, 'capacitor', 'B', '0', 10)] });

  it('solves a ten-cycle sine filter that backward Euler alone cannot finish', () => {
    const run = api.circuitNetworkTransient(filter(1));
    expect(run.ok, run.message).toBe(true);
    expect(run.integrationFallback).toBe('backward-euler-step-limit');
    expect(run.integration).toBe('trapezoidal');
    expect(run.message).toContain('trapezoidal method');
    expect(run.frames.at(-1).time).toBeCloseTo(1, 12);
  });

  it('keeps backward Euler when it finishes within the step limit', () => {
    const run = api.circuitNetworkTransient(filter(0.3));
    expect(run.ok, run.message).toBe(true);
    expect(run.integration).toBe('backward-euler');
    expect(run.integrationFallback).toBeUndefined();
  });
});

describe('Ohm quiz options carry no size or position cue', () => {
  it('spreads the key across all four size ranks and screen positions, within 20x of the answer', () => {
    const rank = [0, 0, 0, 0], position = [0, 0, 0, 0], n = 8000;
    for (let i = 0; i < n; i++) {
      const q = api.circuitOhmQuestion();
      expect(q.opts.filter((v) => v === q.answer)).toHaveLength(1);
      for (const v of q.opts) { expect(v).toBeGreaterThan(0); expect(v / q.answer).toBeLessThanOrEqual(20.5); expect(q.answer / v).toBeLessThanOrEqual(20.5); }
      rank[q.opts.filter((v) => v < q.answer).length]++;
      position[q.opts.indexOf(q.answer)]++;
    }
    for (const count of rank.concat(position)) { expect(count / n).toBeGreaterThan(0.18); expect(count / n).toBeLessThan(0.32); }
  });
});

describe('edit keys merge one slider gesture into one undo step', () => {
  it('names the changed part field and refuses structural changes', () => {
    const before = { components: [{ id: 1, value: 100 }, { id: 2, value: 5 }] };
    expect(api.circuitEditKey(before, { components: [{ id: 1, value: 120 }, { id: 2, value: 5 }] })).toBe('1.value');
    expect(api.circuitEditKey({ voltage: 9 }, { voltage: 10 })).toBe('voltage');
    expect(api.circuitEditKey(before, { components: [{ id: 1, value: 100 }] })).toBeNull();
    expect(api.circuitEditKey(before, { components: [{ id: 2, value: 5 }, { id: 1, value: 100 }] })).toBeNull();
    expect(api.circuitEditKey(before, { components: before.components })).toBeNull();
  });
});

describe('transistor lesson keeps the Explain step after pre-test reasoning', () => {
  const start = () => api.circuitActiveLessonUpdate({}, 'gain', 'start');
  it('does not count unrevised prediction reasoning as the explanation', () => {
    let s = api.circuitActiveLessonUpdate(start(), 'gain', 'predict', 'more');
    s = api.circuitActiveLessonUpdate(s, 'gain', 'explain', 'I think more base current gives more lamp current.');
    s = api.circuitActiveLessonUpdate(s, 'gain', 'test');
    expect(api.circuitActiveLessonJourney(s, 'gain').phase).toBe('explain');
    expect(s.lessonRecords.gain.reasoning).toBe('I think more base current gives more lamp current.');
    s = api.circuitActiveLessonUpdate(s, 'gain', 'explain', 'The readings show the lamp current rose from 3 mA to 8 mA.');
    expect(api.circuitActiveLessonJourney(s, 'gain').phase).toBe('review');
  });
  it('round-trips the reasoning through a saved investigation and reports it separately', () => {
    let s = api.circuitActiveLessonUpdate(start(), 'gain', 'predict', 'more');
    s = api.circuitActiveLessonUpdate(s, 'gain', 'explain', 'My guess.');
    s = api.circuitActiveLessonUpdate(s, 'gain', 'test');
    const parsed = api.parseCircuitInvestigation(JSON.stringify(api.circuitActiveInvestigation(s)));
    expect(parsed.lessonRecords.gain.reasoning).toBe('My guess.');
    const report = api.circuitActiveReport(s);
    expect(report).toContain('Prediction reasoning (before Test):</strong> My guess.');
    expect(report).toContain('Lesson explanation:</strong> Not yet recorded.');
  });
  it('still accepts saved files without a reasoning field', () => {
    let s = api.circuitActiveLessonUpdate(start(), 'gain', 'predict', 'more');
    s = api.circuitActiveLessonUpdate(s, 'gain', 'test');
    const doc = api.circuitActiveInvestigation(s);
    expect(Object.keys(doc.lessonRecords.gain)).toEqual(['choice', 'tested', 'explanation']);
    expect(() => api.parseCircuitInvestigation(JSON.stringify(doc))).not.toThrow();
  });
});

describe('challenge readings never show solver stand-ins', () => {
  const current = { type: 'current', target: 2 }, resistance = { type: 'resistance', target: 200 };
  it('names a short circuit instead of thousands of amps', () => {
    const solved = api.solveCircuit({ voltage: 9, mode: 'series', components: [{ id: 1, type: 'switch', closed: true }] });
    expect(solved.isShort).toBe(true);
    const reading = api.circuitChallengeReading(solved, current);
    expect(reading.actualText).toBe('Short circuit');
    expect(reading.differenceText).not.toMatch(/\d{4}/);
    expect(reading.onTarget).toBe(false);
  });
  it('names an open path instead of a billion ohms', () => {
    const reading = api.circuitChallengeReading(api.solveCircuit({ voltage: 9, mode: 'series', components: [{ id: 1, type: 'resistor', value: 100 }, { id: 2, type: 'switch', closed: false }] }), resistance);
    expect(reading.actualText).toBe('Open circuit (no path)');
    expect(reading.differenceText).not.toContain('1000000');
  });
});

describe('mounted builder fixes', () => {
  let host, root, latest;
  beforeEach(() => {
    const ctx2d = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get(t, k) { if (!(k in t)) t[k] = () => {}; return t[k]; }, set(t, k, v) { t[k] = v; return true; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx2d);
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
  async function mount(circuit, ctxExtra = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ _circuit: Object.assign({ mode: 'series', voltage: 9 }, circuit) });
      latest = toolData._circuit;
      return config.render(makeCtx(Object.assign({ toolData, setToolData }, ctxExtra)));
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });
  }

  it('lights the default 50 ohm bulb on 9 V in the schematic', async () => {
    await mount({ pauseMotion: true, components: [{ id: 1, type: 'bulb', value: 50 }] });
    const bulb = host.querySelector('[data-circuit-schematic-part="1"]');
    expect(bulb.innerHTML).toContain('rgba(253,224,71');
  });

  it('does not capture the pointer on press, so inner switch clicks keep their target', async () => {
    await mount({ pauseMotion: true, components: [{ id: 1, type: 'resistor', value: 100 }, { id: 2, type: 'switch', closed: true }] });
    const capture = vi.fn();
    const part = host.querySelector('[data-circuit-schematic-part="2"]');
    part.setPointerCapture = capture;
    await act(async () => part.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 80, clientY: 78 })));
    expect(capture).not.toHaveBeenCalled();
  });

  it('keeps a cleared row value as a draft until Enter or blur', async () => {
    await mount({ pauseMotion: true, components: [{ id: 1, type: 'resistor', value: 100 }] });
    const input = host.querySelector('input[aria-label="R resistance in ohms"]');
    const setValue = async (v) => act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await setValue('');
    expect(latest.components[0].value).toBe(100);
    await setValue('50');
    expect(latest.components[0].value).toBe(100);
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(latest.components[0].value).toBe(50);
    await setValue('');
    await act(async () => { input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); input.dispatchEvent(new FocusEvent('blur')); });
    expect(latest.components[0].value).toBe(50);
    expect(input.value).toBe('50');
  });

  it('labels schematic controls by position and colour name, not internal ids', async () => {
    await mount({ pauseMotion: true, components: [{ id: 1731234567890, type: 'switch', closed: true }, { id: 1731234567891, type: 'led', ledColor: '#22c55e' }] });
    const labels = Array.from(host.querySelectorAll('svg [role="button"]')).map((el) => el.getAttribute('aria-label')).join(' | ');
    expect(labels).not.toMatch(/1731234567/);
    expect(labels).toContain('Switch, part 1 of 2');
    expect(labels).toContain('(green)');
  });

  it('animates flow dots in SVG without writing a tick into tool data', async () => {
    const write = vi.fn();
    await mount({ components: [{ id: 1, type: 'resistor', value: 100 }] }, {});
    expect(host.querySelectorAll('[data-circuit-flow-dot] animateMotion').length).toBeGreaterThan(0);
    expect(latest.tick).toBeUndefined();
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(latest.tick).toBeUndefined();
    expect(write).not.toHaveBeenCalled();
  });

  it('never prints the solver stand-in resistance for an LED below turn-on', async () => {
    await mount({ pauseMotion: true, voltage: 1.5, components: [{ id: 1, type: 'led', ledColor: '#ef4444' }] });
    expect(host.innerHTML).not.toMatch(/100000000\d*\.\d\s*(Ω|ohms)/);
  });
});

describe('simplified layouts', () => {
  const order = (html, labels) => labels.map((label) => { const at = html.indexOf(label); expect(at, label).toBeGreaterThan(-1); return at; });
  it('puts the builder bench before one Activities section and file tools last', () => {
    const html = renderTool('circuit', { _circuit: {} }, { gradeBand: 'g68' });
    const at = order(html, ['Build your circuit', 'Circuit diagram', '03 / ACTIVITIES', 'What will change the current?', 'Circuit challenges · hit a target', 'Save or open a circuit']);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toMatch(/<details class="circuit-activity-challenges mt-4">/);
  });
  it('opens the transistor lab at its guided experiment with one chooser and no map or entry card', () => {
    const html = renderTool('circuit', { _circuit: { activeWorkbench: true }, _circuitActive: { lessonId: 'gain', lessonRecords: { gain: { choice: 'more', tested: true, explanation: '' } } } }, { gradeBand: 'g912' });
    const at = order(html, ['Explore a transistor change', 'Investigation notebook', '01 · Change the input']);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).not.toContain('circuit-active-learning-entry');
    expect(html).not.toContain('circuit-active-lesson-map');
    expect(html).not.toContain('<progress');
    expect(html).toMatch(/<option value="gain"[^>]*>[^<]*· tested<\/option>/);
    expect(html).toContain('Next experiment: ');
  });
});

describe('reference menu by grade band', () => {
  const menu = (band, extra = {}) => renderTool('circuit', { circuit: Object.assign({ workspaceTab: 'reference' }, extra) }, { gradeBand: band });
  it('lists Investigate first and keeps advanced tables to grades 9-12 unless Show all is on', () => {
    const k2 = menu('k2'), hs = menu('g912'), all = menu('k2', { showAllSections: true });
    expect(hs.indexOf('Investigate tabs')).toBeLessThan(hs.indexOf('Fundamentals tabs'));
    expect(hs).toContain('Op-amps');
    expect(hs).not.toContain('Show all sections');
    expect(k2).not.toContain('Op-amps');
    expect(k2).toContain('Predict bulb');
    expect(k2).toMatch(/Show all sections \(\d+ more\)/);
    expect(all).toContain('Op-amps');
    expect(all).toContain('Show sections for my grade');
  });
  it('keeps an already-open section listed for a younger band', () => {
    expect(menu('k2', { expSection: 'opamp' })).toContain('Op-amps');
  });
});

describe('3D bench bulb glow follows power', () => {
  it('glows the 50 ohm bulb brighter than the 100 ohm bulb beside it', () => {
    const html = renderTool('circuit', { _circuit: { benchView: '3d', mode: 'parallel', voltage: 9, components: [{ type: 'bulb', value: 50, id: 1 }, { type: 'bulb', value: 100, id: 2 }] } });
    const levels = [...html.matchAll(/data-bulb-level="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(levels).toEqual([0.9, 0.64]);
  });
  const bench = (components) => renderTool('circuit', { _circuit: { benchView: '3d', voltage: 9, components } });
  it('glows an LED brighter with a smaller series resistor', () => {
    const level = (ohms) => Number(bench([{ type: 'resistor', value: ohms, id: 1 }, { type: 'led', value: 0, id: 2 }]).match(/data-led-level="([\d.]+)"/)[1]);
    expect(level(220)).toBeGreaterThan(level(1000));
    expect(level(1000)).toBeGreaterThan(0);
  });
  it('runs a dim filament orange and a bright one white-hot', () => {
    expect(bench([{ type: 'bulb', value: 50, id: 1 }])).toContain('#fff3c4');
    const dim = bench([{ type: 'resistor', value: 150, id: 1 }, { type: 'bulb', value: 50, id: 2 }]);
    expect(dim).not.toContain('#fff3c4');
    expect(dim).toContain('#ff9a4a');
  });
});

describe('3D board explains the heat and charge cues', () => {
  const board = (ohms, extra) => renderTool('circuit', { _circuit: { networkWorkbench: true }, _circuitNetwork: { view: 'orbit', selected: 2, components: [{ id: 1, type: 'voltage', a: 'A', b: '0', value: 9 }, { id: 2, type: 'resistor', a: 'A', b: '0', value: ohms }, ...(extra || [])] } });
  it('warns only when a resistor dissipates more than a typical 1/4 W rating', () => {
    expect(board(100)).toContain('It dissipates 0.81 W, more than the ¼ W rating of a typical small resistor.');
    expect(board(1000)).not.toContain('¼ W rating');
  });
  it('tells students what the capacitor patch shows', () => {
    const html = renderTool('circuit', { _circuit: { networkWorkbench: true }, _circuitNetwork: { view: 'orbit', selected: 3, components: [{ id: 1, type: 'voltage', a: 'A', b: '0', value: 5 }, { id: 2, type: 'resistor', a: 'A', b: 'B', value: 1000 }, { id: 3, type: 'capacitor', a: 'B', b: '0', value: 100 }] } });
    expect(html).toContain('The bright patch on the 3D capacitor grows with its voltage, as stored charge does (Q = CV).');
  });
});

describe('3D board explains the coil field and transistor region cues', () => {
  const orbit = (components, selected) => renderTool('circuit', { _circuit: { networkWorkbench: true }, _circuitNetwork: { view: 'orbit', selected, components } });
  it('says what the coil field loops show', () => {
    const html = orbit([{ id: 1, type: 'voltage', a: 'A', b: '0', value: 5 }, { id: 2, type: 'resistor', a: 'A', b: 'B', value: 10 }, { id: 3, type: 'inductor', a: 'B', b: '0', value: 100 }], 3);
    expect(html).toContain('The blue loops around the 3D coil brighten with its current');
  });
  it('says what the diode and op-amp state cues show', () => {
    expect(orbit([{ id: 1, type: 'voltage', a: 'A', b: '0', value: 9 }, { id: 2, type: 'diode', a: 'A', b: 'B', value: 0 }, { id: 3, type: 'resistor', a: 'B', b: '0', value: 470 }], 2)).toContain('its label adds forward, reverse or breakdown');
    expect(orbit([{ id: 1, type: 'voltage', a: 'A', b: '0', value: 5 }, { id: 2, type: 'opamp', a: 'C', b: '0', value: 1000, control: { positive: 'A', negative: '0' } }, { id: 3, type: 'resistor', a: 'C', b: '0', value: 1000 }], 2)).toContain('a warm glow show when the output is pinned at a limit');
  });
  it('names the colour for the transistor region', () => {
    const html = orbit([{ id: 1, type: 'voltage', a: 'A', b: '0', value: 9 }, { id: 2, type: 'resistor', a: 'A', b: 'C', value: 1000 }, { id: 4, type: 'resistor', a: 'A', b: 'B', value: 100000 }, { id: 3, type: 'bjt', a: 'C', b: '0', bjt: { base: 'B', polarity: 'npn' } }], 3);
    expect(html).toContain('On the 3D board the transistor’s face shows this region: grey when off, green when active');
  });
});

describe('mixed bench labels each branch with its current', () => {
  const mixed = (closed) => renderTool('circuit', { _circuit: { mixedWorkbench: true }, _circuitMixed: { mode: 'mixed', voltage: 12, components: [{ id: 1, type: 'resistor', value: 200, branch: 1 }, { id: 2, type: 'resistor', value: 100, branch: 1 }, { id: 3, type: 'bulb', value: 300, branch: 2 }, { id: 4, type: 'switch', closed, branch: 2 }] } });
  it('shows the branch current and says when a branch carries none', () => {
    expect(mixed(true)).toContain('BRANCH A · 40.00 mA');
    expect(mixed(false)).toContain('BRANCH A · 40.00 mA');
    expect(mixed(false)).toContain('BRANCH B · no current');
  });
});

describe('builder warns about resistor power from grades 6-8 up', () => {
  const builder = (band, ohms, extra) => renderTool('circuit', { _circuit: Object.assign({ voltage: 9, components: [{ type: 'resistor', value: ohms, id: 1 }] }, extra) }, { gradeBand: band });
  const note = 'This resistor turns 0.81 W into heat, more than the ¼ W rating of a typical small resistor.';
  it('shows the note for grades 6-8 and 9-12, not for younger grades or a safe resistor', () => {
    expect(builder('g68', 100)).toContain(note);
    expect(builder('g912', 100)).toContain(note);
    expect(builder('k2', 100)).not.toContain('¼ W rating');
    expect(builder('g35', 100)).not.toContain('¼ W rating');
    expect(builder('g912', 1000)).not.toContain('¼ W rating');
  });
  it('heats the 3D bench resistor only where the note shows', () => {
    expect(builder('g912', 100, { benchView: '3d' })).toMatch(/data-resistor-hot="0.81"/);
    expect(builder('g912', 100, { benchView: '3d' })).toContain('0.81 W · over ¼ W');
    expect(builder('k2', 100, { benchView: '3d' })).not.toContain('data-resistor-hot');
  });
});

describe('reference sections without repeated content', () => {
  const open = (expSection) => renderTool('circuit', { circuit: { workspaceTab: 'reference', expSection } }, { gradeBand: 'g912' });
  const count = (html, s) => html.split(s).length - 1;
  it('merges Famous circuits into Circuit building blocks, each block listed once', () => {
    const html = open('patterns');
    expect(html).not.toContain('Famous circuits');
    expect(html).toContain('Project ideas');
    expect(html).toContain('More building blocks');
    expect(html).toContain('Current mirror');
    for (const name of ['Voltage divider', '555 timer (astable)', 'Common-emitter']) expect(count(html, name), name).toBe(1);
    expect(html).not.toContain('Common emitter (BJT)');
    expect(open('famouscirc')).toContain('More building blocks');
  });
  it('folds Standards + plugs into Connectors & plugs and links to plug types by country', () => {
    const html = open('connectors');
    expect(html).not.toContain('Standards + plugs');
    expect(html).toContain('GPIB (IEEE-488)');
    expect(count(html, '>USB-C<')).toBe(1);
    expect(html).toContain('Wall voltages and plug types by country');
    expect(open('standards')).toContain('GPIB (IEEE-488)');
    expect(open('world')).toContain('G in the UK');
  });
  it('leaves the chip era to the computer timeline and links there', () => {
    const html = open('famous');
    expect(html).not.toContain('Intel 4004');
    expect(html).toContain('Chips and computers: the computer history timeline');
    expect(open('computers')).toContain('Intel 4004');
  });
});

describe('transistor lesson reveals the model explanation only on request after writing', () => {
  let host, root, latest;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
  async function mount(explanation) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: Object.assign(api.circuitActiveDesign(Object.assign({}, { input: 1.5 })), { lessonId: 'gain', lessonRecords: { gain: { choice: 'more', tested: true, explanation, reasoning: 'guess' } } }) };
    function Harness() { const [s, set] = React.useState(initial); latest = s; return config.render(makeCtx({ toolData: s, setToolData: set })); }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  it('hides it while the explanation is only the pre-test reasoning', async () => {
    await mount('guess');
    expect(lab().querySelector('.circuit-active-lesson-compare')).toBeNull();
    expect(lab().querySelector('.circuit-active-lesson-model-reason')).toBeNull();
  });
  it('shows a compare button once the student has written, and the explanation only after it is pressed', async () => {
    await mount('The lamp current rose because more base current flowed.');
    expect(lab().querySelector('.circuit-active-lesson-model-reason')).toBeNull();
    const compare = lab().querySelector('.circuit-active-lesson-compare');
    expect(compare).not.toBeNull();
    await act(async () => compare.click());
    expect(lab().querySelector('.circuit-active-lesson-model-reason').textContent).toContain('The model’s explanation');
    expect(latest._circuitActive.lessonRecords.gain.explanation).toBe('The lamp current rose because more base current flowed.');
  });
});

describe('grade band follows the host band and adult grades', () => {
  it('shows the grades 6-12 Kirchhoff panel to College users', () => {
    expect(renderTool('circuit', { _circuit: {} }, { gradeLevel: 'Kindergarten', gradeBand: 'k2' })).not.toContain('Kirchhoff Laws');
    expect(renderTool('circuit', { _circuit: {} }, { gradeLevel: 'College', gradeBand: undefined })).toContain('Kirchhoff Laws');
  });
});
