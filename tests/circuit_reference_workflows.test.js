import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const reference = { workspaceTab: 'reference', expSection: 'poebulb' };
const expected = [
  { id: 's1', paths: [[1]], current: .3, volts: [1.5], powers: [.45] },
  { id: 's2', paths: [[1, 2]], current: .15, volts: [.75, .75], powers: [.1125, .1125] },
  { id: 's3', paths: [[1], [2]], current: .6, volts: [1.5, 1.5], powers: [.45, .45] },
  { id: 's4', paths: [[1, 2]], current: 1.5 / 11, volts: [15 / 11, 1.5 / 11], powers: [22.5 / 121, 2.25 / 121] }
];
const point = value => value.split(',').map(Number);
const key = value => value.join(',');
const inside = (p, a, b) => (a[0] === b[0] && p[0] === a[0] && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1])) || (a[1] === b[1] && p[1] === a[1] && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]));

// Reconstruct electrical nets from rendered wire geometry, including T junctions.
// Components connect those nets only through their actual symbol terminals.
function diagramGraph(svg) {
  const wires = Array.from(svg.querySelectorAll('[data-circuit-poe-wire]')).map(line => [[Number(line.getAttribute('x1')), Number(line.getAttribute('y1'))], [Number(line.getAttribute('x2')), Number(line.getAttribute('y2'))]]);
  const source = svg.querySelector('[data-circuit-poe-source]');
  const parts = Array.from(svg.querySelectorAll('[data-circuit-poe-part]'));
  const terminals = [source, ...parts].flatMap(part => [point(part.dataset.terminalA), point(part.dataset.terminalB)]);
  const points = [...wires.flat(), ...terminals];
  const parent = new Map(points.map(p => [key(p), key(p)]));
  const find = p => { const k = Array.isArray(p) ? key(p) : p; return parent.get(k) === k ? k : find(parent.get(k)); };
  for (const [a, b] of wires) for (const p of points) if (inside(p, a, b)) parent.set(find(p), find(a));
  const positive = find(point(source.dataset.terminalA)), negative = find(point(source.dataset.terminalB));
  const edges = parts.map(part => ({ id: Number(part.dataset.circuitPoePart), a: find(point(part.dataset.terminalA)), b: find(point(part.dataset.terminalB)) }));
  const paths = [];
  function visit(node, seen, path) {
    if (node === negative) { paths.push(path); return; }
    for (const edge of edges) {
      const next = edge.a === node ? edge.b : edge.b === node ? edge.a : null;
      if (next && !seen.has(next)) visit(next, new Set([...seen, next]), [...path, edge.id]);
    }
  }
  visit(positive, new Set([positive]), []);
  return { wires, parts, source, positive, negative, paths };
}

describe('Circuit reference schematic connectivity', () => {
  let doc;
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    doc = document.createElement('div'); doc.innerHTML = renderTool('circuit', { circuit: reference });
  });

  it.each(expected)('$id has complete load paths and separated battery terminals', scenario => {
    const svg = doc.querySelector(`[data-circuit-poe-schematic="${scenario.id}"]`);
    const graph = diagramGraph(svg);
    expect(graph.positive).not.toBe(graph.negative);
    expect(graph.paths).toEqual(scenario.paths);
    for (const part of graph.parts) {
      for (const terminal of [point(part.dataset.terminalA), point(part.dataset.terminalB)]) {
        expect(graph.wires.some(([a, b]) => key(terminal) === key(a) || key(terminal) === key(b))).toBe(true);
        const circle = part.querySelector('circle'), rect = part.querySelector('rect');
        if (circle) expect(Math.hypot(terminal[0] - Number(circle.getAttribute('cx')), terminal[1] - Number(circle.getAttribute('cy')))).toBe(Number(circle.getAttribute('r')));
        else {
          const x = Number(rect.getAttribute('x')), y = Number(rect.getAttribute('y')), width = Number(rect.getAttribute('width')), height = Number(rect.getAttribute('height'));
          expect((terminal[0] === x || terminal[0] === x + width) && terminal[1] === y + height / 2).toBe(true);
        }
      }
    }
    const plates = graph.source.querySelectorAll('line');
    expect(plates).toHaveLength(2);
    expect(Number(plates[0].getAttribute('y1'))).toBeLessThan(Number(plates[1].getAttribute('y1')));
    expect(Number(plates[0].getAttribute('x2')) - Number(plates[0].getAttribute('x1'))).toBeGreaterThan(Number(plates[1].getAttribute('x2')) - Number(plates[1].getAttribute('x1')));
    expect(svg.getAttribute('aria-label')).toContain('volt battery');
    expect(svg.querySelector('desc').id).toBe(svg.getAttribute('aria-describedby'));
    expect(svg.textContent).not.toContain('0.45 W');
  });

  it.each(expected)('$id matches the voltage, current, and power taught by the lesson', scenario => {
    const svg = doc.querySelector(`[data-circuit-poe-schematic="${scenario.id}"]`);
    const graph = diagramGraph(svg);
    const solved = window.StemLab.solveCircuit({ mode: svg.dataset.mode, voltage: Number(graph.source.dataset.voltage), components: graph.parts.map(part => ({ type: part.dataset.partType, value: Number(part.dataset.resistance) })) });
    expect(solved.current).toBeCloseTo(scenario.current, 12);
    solved.rows.forEach((row, index) => {
      expect(row.voltage).toBeCloseTo(scenario.volts[index], 12);
      expect(row.power).toBeCloseTo(scenario.powers[index], 12);
      expect(graph.parts[index].textContent).toContain(row.component.value + ' Ω');
    });
  });

  it('keeps bench actions behind the prediction and evidence steps', () => {
    expect(doc.querySelector('[data-circuit-poe-try]')).toBeNull();
    expect(doc.textContent).toContain('Bulb symbols show connections, not brightness');
  });
});

describe('Circuit reference to bench workflow', () => {
  let host, root, config, latest, announcements;
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get: (object, property) => object[property] || (() => {}) }));
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); announcements = [];
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
  async function mount(state) {
    function Harness() {
      const [toolData, setToolData] = React.useState(state); latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: message => announcements.push(message) }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const click = async element => { expect(element).toBeTruthy(); await act(async () => element.click()); };

  it('loads exact parallel settings, preserves notes/progress, and restores the populated bench with Undo', async () => {
    const design = { mode: 'series', voltage: 9, components: [{ id: 11, type: 'resistor', value: 220 }, { id: 12, type: 'bulb', value: 100 }] };
    const observations = [{ before: design, after: { ...design, voltage: 6 }, delta: -3 / 320, prediction: 'Less current', explanation: 'Same resistance', controlled: true }];
    const lesson = { stage: { s3: { picked: 1, revealed: true, revision: 'supported', reason: 'Both branches receive the same voltage.', complete: true } } };
    await mount({ _circuit: { ...design, pauseMotion: true, networkWorkbench: true, observations, prediction: 'Saved prediction', experimentBaseline: { circuit: design, prediction: 'Saved prediction' }, undo: [], redo: [design] }, circuit: { ...reference, poeb: lesson } });
    await click(host.querySelector('[data-circuit-poe-try="s3"]'));
    expect(latest.circuit.workspaceTab).toBe('build');
    expect(latest.circuit.poeb).toEqual(lesson);
    expect(latest._circuit).toMatchObject({ mode: 'parallel', voltage: 1.5, networkWorkbench: false, activeWorkbench: false, mixedWorkbench: false, benchView: 'schematic', selectedPart: 0, redo: [] });
    expect(latest._circuit.components).toEqual([{ id: 1, type: 'bulb', value: 5 }, { id: 2, type: 'bulb', value: 5 }]);
    expect(window.StemLab.solveCircuit(latest._circuit).current).toBeCloseTo(.6, 12);
    expect(latest._circuit.observations).toEqual(observations);
    expect(latest._circuit.prediction).toBe('Saved prediction');
    expect(latest._circuit.experimentBaseline.circuit).toEqual(design);
    expect(latest._circuit.undo).toEqual([design]);
    expect(announcements.at(-1)).toContain('Simple circuits');
    // Trying the same lesson again replaces the circuit; it never appends duplicate parts.
    await click(host.querySelector('#circuit-workspace-tab-reference'));
    await click(host.querySelector('[data-circuit-poe-try="s3"]'));
    expect(latest._circuit.components).toHaveLength(2);
    expect(new Set(latest._circuit.components.map(part => part.id)).size).toBe(2);
    const undo = () => Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Undo');
    await click(undo()); await click(undo());
    expect({ mode: latest._circuit.mode, voltage: latest._circuit.voltage, components: latest._circuit.components }).toEqual(design);
    expect(latest._circuit.observations).toEqual(observations);
    expect(latest.circuit.poeb).toEqual(lesson);
  });

  it('carries an actual prediction through revealing evidence and testing the single-bulb circuit', async () => {
    await mount({ _circuit: { components: [], pauseMotion: true }, circuit: reference });
    let card = host.querySelector('[data-circuit-poe-schematic="s1"]').parentElement;
    await click(Array.from(card.querySelectorAll('button')).find(button => button.textContent === '0.45 W'));
    card = host.querySelector('[data-circuit-poe-schematic="s1"]').parentElement;
    await click(Array.from(card.querySelectorAll('button')).find(button => button.textContent === 'Reveal model evidence'));
    expect(latest.circuit.poeb.stage.s1).toMatchObject({ picked: 3, revealed: true });
    await click(host.querySelector('[data-circuit-poe-try="s1"]'));
    expect(latest._circuit.components).toEqual([{ id: 1, type: 'bulb', value: 5 }]);
    expect(window.StemLab.solveCircuit(latest._circuit).power).toBeCloseTo(.45, 12);
    expect(latest.circuit.poeb.stage.s1).toMatchObject({ picked: 3, revealed: true, complete: false });
  });
});
