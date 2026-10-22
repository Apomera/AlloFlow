import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const GOOD = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false }];
const MIXED = [{ x: 1, y: 1, m: 'J', w: false }, { x: 4, y: 6, m: 'L', w: false }, { x: 12, y: 6, m: 'J', w: true }, { x: 12, y: 6, m: 'L', w: true }, { x: 1, y: 1, m: 'L', w: false }];
const BASE = { view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: GOOD };
let host, root, realMatchMedia, reduced, raf;
const tech = () => window.__WeldLabCore.tech2;
const ledger = (node = host) => node.querySelector('[data-rob-time-ledger]');
const reading = () => ledger().querySelector('[data-rob-time-reading]');
const num = (node, attribute) => Number(node.getAttribute(attribute));
const named = name => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name || node.getAttribute('aria-label') === name);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); reduced = true;
  realMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: reduced, addEventListener() {}, addListener() {}, removeEventListener() {}, removeListener() {} }));
  raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount()); root = null; host?.remove(); host = null;
  window.matchMedia = realMatchMedia; vi.restoreAllMocks();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (tool, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
async function view(id) { await click(ledger().querySelector(`[data-rob-time-view="${id}"]`)); }
async function select(index) { await change(ledger().querySelector('[data-rob-time-select]'), index); }
function expected(program, shift = false, track = false) {
  const checked = tech().checkProgram(program, { shift: { dx: 0, dy: shift ? 1 : 0 }, track });
  let total = 0, arc = 0; const groups = { on: 0, offJoint: 0, offLinear: 0 }, counts = { on: 0, offJoint: 0, offLinear: 0 };
  const rows = checked.segments.map((segment, index) => {
    const mm = segment.path.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - segment.path[i].x, point.y - segment.path[i].y), 0) * tech().CELL.mm;
    const speed = segment.w ? 6 : segment.m === 'J' ? 200 : 100, seconds = mm / speed, start = total;
    const command = segment.w ? 'on' : segment.m === 'J' ? 'offJoint' : 'offLinear';
    total += seconds; if (segment.w) arc += seconds; groups[command] += seconds; counts[command]++;
    return { index, mm, speed, seconds, start, end: total, command };
  });
  return { rows, total, arc, groups, counts };
}
function assertLedger(node, model, mode = 'sequence') {
  const section = ledger(node), scale = model.total > 0 ? 520 / model.total : 0;
  expect(section.dataset.robTimeLedger).toBe(mode); expect(num(section, 'data-total')).toBeCloseTo(model.total, 11);
  expect(num(section, 'data-arc')).toBeCloseTo(model.arc, 11); expect(num(section, 'data-count')).toBe(model.rows.length);
  expect(section.outerHTML).not.toMatch(/NaN|Infinity/);
  if (!model.rows.length) { expect(section.querySelector('[data-rob-time-empty]')).toBeTruthy(); expect(section.querySelector('select,svg')).toBeNull(); return; }
  const svg = section.querySelector('[data-rob-time-plot]'), axis = svg.querySelector('[data-rob-time-axis]');
  expect(svg.getAttribute('viewBox')).toBe('0 0 680 310'); expect(num(axis, 'data-min')).toBe(0); expect(num(axis, 'data-max')).toBeCloseTo(model.total, 11); expect(num(axis, 'data-scale')).toBeCloseTo(scale, 11);
  expect(num(axis.querySelector('line'), 'x1')).toBe(80); expect(num(axis.querySelector('line'), 'x2')).toBe(model.total > 0 ? 600 : 80);
  if (mode === 'sequence') {
    const bars = [...svg.querySelectorAll('[data-rob-time-segment]')]; expect(bars).toHaveLength(model.rows.length);
    model.rows.forEach((row, index) => {
      const part = bars[index], span = part.querySelector('[data-rob-time-span]');
      expect(num(part, 'data-rob-time-segment')).toBe(index); expect(part.dataset.command).toBe(row.command);
      for (const key of ['start', 'end', 'seconds', 'mm', 'speed']) expect(num(part, `data-${key}`)).toBeCloseTo(row[key], 11);
      expect(num(span, 'x')).toBeCloseTo(80 + row.start * scale, 10); expect(num(span, 'width')).toBeCloseTo(row.seconds * scale, 10);
      expect(num(span, 'y')).toBe(70); expect(num(span, 'height')).toBe(60);
      if (row.seconds === 0) { const zero = part.querySelector('[data-rob-time-zero]'); expect(zero).toBeTruthy(); expect(num(zero, 'x1')).toBeCloseTo(80 + row.start * scale, 10); expect(num(zero, 'x2')).toBe(num(zero, 'x1')); expect(num(span, 'width')).toBe(0); }
      else expect(part.querySelector('[data-rob-time-zero]')).toBeNull();
    });
    expect(model.rows.at(-1).end).toBeCloseTo(model.total, 11);
  } else {
    expect(svg.querySelector('[data-rob-time-segment]')).toBeNull();
    ['on', 'offJoint', 'offLinear'].forEach((id, index) => {
      const group = svg.querySelector(`[data-rob-time-group="${id}"]`);
      expect(num(group, 'data-seconds')).toBeCloseTo(model.groups[id], 11); expect(num(group, 'data-count')).toBe(model.counts[id]);
      expect(num(group, 'x')).toBe(80); expect(num(group, 'y')).toBe(40 + index * 70); expect(num(group, 'height')).toBe(40); expect(num(group, 'width')).toBeCloseTo(model.groups[id] * scale, 10);
    });
  }
  for (const id of ['on', 'offJoint', 'offLinear']) {
    const note = section.querySelector(`[data-rob-time-command-reading="${id}"]`); expect(num(note, 'data-seconds')).toBeCloseTo(model.groups[id], 11);
    expect(note.textContent).toContain(`${model.groups[id].toFixed(3)} s`);
  }
  expect(section.querySelector('[data-rob-time-total]').textContent).toContain(`Total estimated move time: ${model.total.toFixed(3)} s`);
  expect(section.querySelector('[data-rob-time-total]').textContent).toContain(`Arc commanded ON: ${model.arc.toFixed(3)} s`);
}
function assertReading(model, index) {
  const item = reading(), row = model.rows[index]; expect(num(item, 'data-rob-time-reading')).toBe(index);
  for (const key of ['start', 'end', 'seconds', 'mm', 'speed']) expect(num(item, `data-${key}`)).toBeCloseTo(row[key], 11);
  expect(item.textContent).toContain(`${row.mm.toFixed(2)} mm ÷ ${row.speed} mm/s = ${row.seconds.toFixed(3)} s`);
  expect(item.textContent).toContain(`Cumulative start: ${row.start.toFixed(3)} s · End: ${row.end.toFixed(3)} s`);
}

describe('Robot whole-program time ledger', () => {
  it('accounts for the actual curved and linear paths in chronological order, preserving the existing cycle summary', () => {
    for (const program of [GOOD, MIXED, [{ x: 12, y: 6, m: 'J', w: true }], [{ x: 4, y: 6, m: 'L', w: false }]]) {
      const node = render({ tech2_rob_prog: program }), model = expected(program); assertLedger(node, model);
      expect(node.textContent).toContain(`Cycle time ≈ ${model.total.toFixed(1)} s (${model.arc.toFixed(1)} s with the arc on)`);
      expect(ledger(node).textContent).toContain('Run uses a separate visual replay clock'); expect(ledger(node).textContent).toContain('does not represent these seconds or a production cycle');
    }
  });

  it('groups the same raw seconds by commanded ON, OFF Joint and OFF Linear on the same total-time axis', async () => {
    await mount({ tech2_rob_prog: MIXED }); const model = expected(MIXED); assertLedger(host, model);
    await view('commands'); assertLedger(host, model, 'commands');
    expect(model.groups.on).toBeGreaterThan(0); expect(model.groups.offJoint).toBe(0); expect(model.groups.offLinear).toBeGreaterThan(0);
    const on = ledger().querySelector('[data-rob-time-group="on"]'); expect(num(on, 'data-count')).toBe(2);
    expect(ledger().textContent).toContain('Arc commanded ON'); expect(ledger().textContent).not.toMatch(/accepted welding|valid weld|collision|needs work/);
    await view('sequence'); assertLedger(host, model);
  });

  it('keeps zero-distance moves selectable with actual zero-width bars and no fabricated one-second axis when all moves are zero', async () => {
    const zero = [{ x: 1, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'L', w: true }]; await mount({ tech2_rob_prog: zero }); const model = expected(zero);
    expect(model.total).toBe(0); assertLedger(host, model); expect(ledger().querySelectorAll('[data-rob-time-zero]')).toHaveLength(2);
    await select(1); assertReading(model, 1); expect(reading().textContent).toContain('Zero distance and zero estimated time');
    await view('commands'); assertLedger(host, model, 'commands');
    for (const bar of ledger().querySelectorAll('[data-rob-time-group]')) expect(num(bar, 'width')).toBe(0);
    expect(ledger().querySelector('[data-rob-time-domain]').textContent).toBe('Common scale: 0 to 0.000 s');
  });

  it('normalizes empty and malformed programs without invented moves or interactive measurement controls', () => {
    for (const program of [[], 'junk', [null, { x: Infinity, y: 4 }], { points: GOOD }]) {
      const node = render({ tech2_rob_prog: program }); assertLedger(node, expected(program));
      expect(ledger(node).querySelectorAll('button,select')).toHaveLength(0); expect(node.querySelector('[data-robot-inspector]').dataset.robotInspector).toBe('empty');
    }
  });

  it('supports every taught move up to the existing20-point limit with bounded previous/next navigation and exact prefix sums', async () => {
    const program = Array.from({ length: 24 }, (_, index) => ({ x: index % 16, y: (index * 3) % 10, m: index % 2 ? 'J' : 'L', w: index % 3 === 0 }));
    await mount({ tech2_rob_prog: program }); const model = expected(program); expect(model.rows).toHaveLength(20); assertLedger(host, model);
    expect(ledger().querySelector('[data-rob-time-prev]').disabled).toBe(true);
    for (let i = 0; i < 20; i++) { await select(i); assertReading(model, i); }
    expect(ledger().querySelector('[data-rob-time-next]').disabled).toBe(true);
    await click(ledger().querySelector('[data-rob-time-next]')); assertReading(model, 19);
    await click(ledger().querySelector('[data-rob-time-prev]')); assertReading(model, 18);
    await select(0); expect(ledger().querySelector('[data-rob-time-prev]').disabled).toBe(true);
  });

  it('keeps view and move selection local with zero saved writes, no replay and no change to the paused spatial inspector or torch', async () => {
    const app = await mount({ tech2_rob_sort: { 0: 'manual' }, rob4_job: 2, tech2_rob_arc: true });
    await change(host.querySelector('[data-robot-inspect-select]'), 1); await change(host.querySelector('[data-robot-inspect-progress]'), 80);
    const before = JSON.stringify(app.latest()), count = app.writes.length, torch = host.querySelector('[data-robot-torch]').outerHTML, inspector = host.querySelector('[data-robot-inspector]').outerHTML;
    for (const mode of ['commands', 'sequence', 'commands']) { await view(mode); for (let i = 0; i < GOOD.length; i++) await select(i); }
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes.length - count).toBe(0); expect(raf).not.toHaveBeenCalled();
    expect(host.querySelector('[data-robot-torch]').outerHTML).toBe(torch); expect(host.querySelector('[data-robot-inspector]').outerHTML).toBe(inspector);
    expect(host.querySelector('[data-robot-inspect-issues]')).toBeNull(); expect(host.textContent).not.toContain('Weld complete:');
  });

  it('keeps the existing Run verdict hidden until completion and disables every new action throughout the independent replay', async () => {
    reduced = false; delete window.__alloflowWeldLab; resetStemLab(); loadTool(SRC, 'weldLab');
    await mount({ tech2_rob_prog: [{ x: 12, y: 6, m: 'J', w: true }] }); await view('commands');
    expect(host.textContent).not.toContain('The program needs work.'); expect(host.textContent).not.toContain('Move 1 hits the clamp.');
    await click(named('▶ Run program')); expect(raf).toHaveBeenCalledTimes(1);
    expect([...ledger().querySelectorAll('button,select')].every(control => control.disabled)).toBe(true);
    await change(ledger().querySelector('[data-rob-time-select]'), 0); await click(ledger().querySelector('[data-rob-time-view="sequence"]'));
    expect(ledger().dataset.robTimeLedger).toBe('commands'); expect(host.textContent).not.toContain('The program needs work.');
    expect(host.querySelector('[data-robot-inspect-issues]')).toBeNull();
    await React.act(() => raf.mock.calls.at(-1)[0](0)); await React.act(() => raf.mock.calls.at(-1)[0](5000));
    expect(host.textContent).toContain('The program needs work.');
    expect(ledger().querySelector('[data-rob-time-view="sequence"]').disabled).toBe(false); await view('sequence');
    assertLedger(host, expected([{ x: 12, y: 6, m: 'J', w: true }]));
  });

  it('preserves real Run feedback and clears it on the existing program edits while updating only derived accounting', async () => {
    const app = await mount(); await click(named('▶ Run program')); expect(host.textContent).toContain('Weld complete: seam fully covered, no faults.');
    await view('commands'); await select(1); expect(host.textContent).toContain('Weld complete: seam fully covered, no faults.');
    await click(named('Point 2: arc on or off')); expect(host.textContent).not.toContain('Weld complete: seam fully covered, no faults.');
    assertLedger(host, expected(app.latest().tech2_rob_prog), 'commands'); expect(num(reading(), 'data-speed')).toBe(100);
    await click(named('Point 2: switch move type')); assertLedger(host, expected(app.latest().tech2_rob_prog), 'commands'); expect(num(reading(), 'data-speed')).toBe(200);
    expect(host.querySelector('[data-robot-inspect-issues]')).toBeNull();
  });

  it('uses the existing seam-tracking corrected paths and keeps cell changes invalidating the original verdict', async () => {
    const app = await mount({ tech2_rob_shift: true }); assertLedger(host, expected(GOOD, true, false));
    await click(named('Seam tracking (off)')); assertLedger(host, expected(GOOD, true, true));
    await select(0); assertReading(expected(GOOD, true, true), 0);
    await click(named('▶ Run program')); expect(host.textContent).toContain('Weld complete: seam fully covered, no faults.');
    await click(named('📡 Seam tracking: touch sense + laser (on)')); expect(host.textContent).not.toContain('Weld complete: seam fully covered, no faults.');
    assertLedger(host, expected(GOOD, true, false)); expect(app.latest().tech2_rob_prog).toEqual(GOOD);
  });

  it('clamps selection after delete/undo and returns to the actual empty state on Clear without teaching any point', async () => {
    const app = await mount({ tech2_rob_prog: MIXED }); await select(4); await view('commands');
    await click(named('Delete point 5')); expect(app.latest().tech2_rob_prog).toHaveLength(4); assertReading(expected(app.latest().tech2_rob_prog), 3);
    await click(named('↶ Undo point')); expect(app.latest().tech2_rob_prog).toHaveLength(3); assertReading(expected(app.latest().tech2_rob_prog), 2);
    await click(named('✕ Clear')); expect(app.latest().tech2_rob_prog).toEqual([]); assertLedger(host, expected([]), 'commands');
    expect(host.querySelector('[data-robot-inspector]').dataset.robotInspector).toBe('empty'); expect(raf).not.toHaveBeenCalled();
  });

  it('keeps all other robot topics free of the ledger and preserves sorter reveal and first-pick-final scoring', async () => {
    for (const section of ['overview', 'brands', 'program', 'vision', 'cobots', 'sorter', 'careers', 'unknown']) expect(ledger(render({ rob_sect: section }))).toBeNull();
    const app = await mount(); await view('commands'); await select(2); await click(named('⚖ Robot or manual?'));
    expect(ledger()).toBeNull(); const card = () => host.querySelector('[data-rob-sort-card="0"]'), choices = () => card().querySelectorAll('[role="radio"]');
    expect(card().textContent).not.toContain('High volume, identical joints'); await click(choices()[1]);
    expect(app.latest().tech2_rob_sort).toEqual({ 0: 'manual' }); expect([...choices()].every(choice => choice.disabled)).toBe(true);
    await click(choices()[0]); expect(app.latest().tech2_rob_sort).toEqual({ 0: 'manual' }); expect(host.textContent).toContain('Score 0 / 1');
    await click(named('🕹 Teach-pendant challenge')); expect(ledger().dataset.robTimeLedger).toBe('commands'); assertReading(expected(GOOD), 2);
  });

  it.each([false, true])('provides native44px controls, full-size HTML labels, contrast and strong focus with no shrinking SVG labels (contrast=%s)', contrast => {
    const node = render({}, contrast), section = ledger(node), svg = section.querySelector('svg');
    expect(section.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(section.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(240, 249, 255)');
    for (const control of section.querySelectorAll('button,select')) { expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44); expect(control.style.fontSize).toBe('16px'); }
    expect(section.querySelector('label').classList.contains('text-base')).toBe(true); expect(section.querySelector('[data-rob-time-reading]').classList.contains('text-base')).toBe(true);
    expect(section.querySelector('figcaption').classList.contains('text-base')).toBe(true); expect(section.querySelector('[data-rob-time-commands]').classList.contains('text-base')).toBe(true);
    expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto'); expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelector('text,foreignObject,animate,animateTransform')).toBeNull();
    expect(svg.getAttribute('aria-label')).toContain('Full command labels and times are below');
    const edge = contrast ? '#ffff00' : '#075985'; expect(section.querySelector('style').textContent).toContain(`outline:3px solid ${edge}!important`);
    expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    expect(section.querySelector('[data-rob-time-reading]').compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('restores every original robot lesson byte by removing only the one local hook, one helper and one render call', () => {
    const source = readFileSync(resolve(SRC), 'utf8').replace(/\r\n/g, '\n');
    let region = source.slice(source.indexOf('function RoboticAutomated('), source.indexOf('function InspectionCWIPrep('));
    const hook = "        var robBudgetState = useState({ view: 'sequence', move: 0 });\n", call = '            renderRobTimeLedger(),\n';
    expect(region.split(hook)).toHaveLength(2); expect(region.split(call)).toHaveLength(2);
    const start = region.indexOf('        function renderRobTimeLedger() {'), end = region.indexOf('        function renderPendant() {', start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start); const helper = region.slice(start, end);
    expect(helper).not.toMatch(/robCheck\.(?:issues|pass|coverage)|\.bad\b|usePersisted|\bupd\(|\bsetRobProg|\bsetRobRun|\bsetRobInspect|\bsetRobArc|\bsetRobTrack|requestAnimationFrame|setTimeout|setInterval/);
    region = region.slice(0, start) + region.slice(end); region = region.replace(hook, '').replace(call, '');
    expect(createHash('sha256').update(region).digest('hex')).toBe('b257cfaa540465ffa1836bbaf3a9640bf825176f679139adc6e07ee5cd662b07');
  });
});
