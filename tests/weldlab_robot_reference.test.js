import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React } from './helpers/stem_widgets_smoke_harness.js';
import { SRC, freshTool, renderState, mountState, unmountState, node, click, change } from './helpers/weldlab_interaction_mount.js';
import { stripRobotReference } from './helpers/weldlab_robot_reference_restore.js';

const GOOD = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false }];
const CHORD_HIT = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 1, y: 2, m: 'J', w: false }];
const state = extra => ({ view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: GOOD, ...extra });
const q = name => node().querySelector('[data-robot-' + name + ']');
const button = name => [...node().querySelectorAll('button')].find(element => element.textContent.trim() === name || element.getAttribute('aria-label') === name);
const tech = () => window.__WeldLabCore.tech2;
const px = value => 8 + (value + 0.5) * 24;
let realMatchMedia, reduced, raf;

beforeEach(() => {
  reduced = true; realMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: reduced, addEventListener() {}, addListener() {}, removeEventListener() {}, removeListener() {} }));
  raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  freshTool();
});
afterEach(async () => { await unmountState(); window.matchMedia = realMatchMedia; vi.restoreAllMocks(); });

async function inspect(index = 0) { await change(q('inspect-select'), String(index)); }
async function show(index = 0) { await inspect(index); if (q('reference-toggle').getAttribute('aria-pressed') !== 'true') await click(q('reference-toggle')); }
function expected(program, shift = false, track = false) { return tech().checkProgram(program, { shift: { dx: 0, dy: shift ? 1 : 0 }, track }); }
function assertGeometry(segment, index) {
  const layer = q('reference-layer'), bow = q('reference-bow'), chord = q('reference-chord');
  expect(layer.dataset.robotReferenceLayer).toBe(String(index + 1));
  expect(bow.getAttribute('d')).toBe(segment.path.map((point, i) => (i ? 'L ' : 'M ') + px(point.x).toFixed(1) + ' ' + px(point.y).toFixed(1)).join(' '));
  expect(['x1', 'y1', 'x2', 'y2'].map(key => Number(chord.getAttribute(key)))).toEqual([px(segment.a.x), px(segment.a.y), px(segment.b.x), px(segment.b.y)]);
  expect(['ax', 'ay', 'bx', 'by'].map(key => Number(chord.getAttribute('data-' + key)))).toEqual([segment.a.x, segment.a.y, segment.b.x, segment.b.y]);
  expect(chord.getAttribute('stroke-dasharray')).toBe('8 5'); expect(bow.hasAttribute('stroke-dasharray')).toBe(false);
  expect(layer.getAttribute('fill')).toBe('none'); expect(layer.querySelector('polygon,rect,animate,animateTransform,text')).toBeNull();
}

describe('Robot Joint move reference lines', () => {
  it('starts off and offers the optional overlay only for an existing Joint move under active inspection', async () => {
    for (const raw of [[], 'bad', [null, { x: Infinity, y: 3 }]]) {
      const holder = renderState(state({ tech2_rob_prog: raw })); expect(holder.querySelector('[data-robot-reference-control]')).toBeNull(); expect(holder.querySelector('[data-robot-reference-layer]')).toBeNull();
    }
    await mountState(state()); expect(q('reference-toggle').disabled).toBe(true); expect(q('reference-toggle').getAttribute('aria-pressed')).toBe('false'); expect(q('reference-layer')).toBeNull();
    await inspect(); expect(q('reference-toggle').disabled).toBe(false); await click(q('reference-toggle')); assertGeometry(expected(GOOD).segments[0], 0);
    await inspect(1); expect(q('reference-control')).toBeNull(); expect(q('reference-layer')).toBeNull();
    await inspect(0); expect(q('reference-toggle').getAttribute('aria-pressed')).toBe('true'); assertGeometry(expected(GOOD).segments[0], 0);
    await click(q('reference-toggle')); expect(q('reference-layer')).toBeNull(); expect(q('reference-toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('exposes the exact sampled curve and endpoint chord without revealing the chord-only collision before Run', async () => {
    await mountState(state({ tech2_rob_prog: CHORD_HIT })); const checked = expected(CHORD_HIT), segment = checked.segments[2], fixture = tech().FIXTURES[0];
    expect(segment.hit).toBe(true); expect(segment.bad).toBe('collision');
    expect(segment.path.slice(1).some((point, i) => tech().segHitsRect(segment.path[i], point, fixture))).toBe(false);
    expect(tech().segHitsRect(segment.a, segment.b, fixture)).toBe(true);
    await show(2); assertGeometry(segment, 2); expect(q('reference-layer').getAttribute('stroke')).toBe('#a5f3fc'); expect(q('reference-layer').dataset.revealedCollision).toBe('false');
    expect(q('inspect-issues')).toBeNull(); expect(node().textContent).not.toContain('The program needs work.');
    await click(button('▶ Run program')); expect(node().textContent).toContain('The program needs work.'); expect(q('reference-layer')).toBeNull();
    await inspect(2); assertGeometry(segment, 2); expect(q('reference-layer').getAttribute('stroke')).toBe('#f87171'); expect(q('reference-layer').dataset.revealedCollision).toBe('true');
    expect(q('inspect-issues').textContent).toContain('Move 3 hits the clamp.');
    await click(button('Point 3: arc on or off')); expect(q('reference-layer')).toBeNull(); expect(q('inspect-issues')).toBeNull();
    await inspect(2); expect(q('reference-layer').getAttribute('stroke')).toBe('#a5f3fc'); expect(q('reference-layer').dataset.revealedCollision).toBe('false');
  });

  it('draws the corrected endpoints and sampled path after the existing shifted-part and tracking choices', async () => {
    const app = await mountState(state({ tech2_rob_shift: true })); await show(0); assertGeometry(expected(GOOD, true, false).segments[0], 0);
    await click(button('Seam tracking (off)')); assertGeometry(expected(GOOD, true, true).segments[0], 0);
    expect(q('reference-chord').dataset.ay).toBe('1'); expect(q('reference-chord').dataset.by).toBe('7');
    await inspect(2); assertGeometry(expected(GOOD, true, true).segments[2], 2); expect(q('reference-chord').dataset.ay).toBe('7'); expect(q('reference-chord').dataset.by).toBe('1');
    await click(button('📡 Seam tracking: touch sense + laser (on)')); assertGeometry(expected(GOOD, true, false).segments[2], 2);
    expect(app.latest().tech2_rob_prog).toEqual(GOOD); expect(q('inspect-issues')).toBeNull();
  });

  it('keeps the overlay local without changing the taught program, paused torch, timing, progress, saved evidence or grading', async () => {
    const app = await mountState(state({ tech2_rob_sort: { 0: 'manual' }, rob4_job: 3, rob4_lens: 'fit' })); await inspect(0); await change(q('inspect-progress'), '80');
    const saved = JSON.stringify(app.latest()), writes = app.writes.length, torch = q('torch').outerHTML, inspector = q('inspector').outerHTML, ledger = node().querySelector('[data-rob-time-ledger]').outerHTML;
    await click(q('reference-toggle')); await click(q('reference-toggle')); await click(q('reference-toggle'));
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes); expect(raf).not.toHaveBeenCalled();
    expect(q('torch').outerHTML).toBe(torch); expect(q('inspector').outerHTML).toBe(inspector); expect(node().querySelector('[data-rob-time-ledger]').outerHTML).toBe(ledger); expect(q('inspect-issues')).toBeNull();
    await click(button('⌨ Programming')); expect(q('reference-control')).toBeNull(); await click(button('🕹 Teach-pendant challenge')); expect(q('reference-toggle').getAttribute('aria-pressed')).toBe('true'); expect(q('inspector').dataset.progress).toBe('0.8'); assertGeometry(expected(GOOD).segments[0], 0);
  });

  it('pauses and disables reference interaction throughout replay without changing the independent Run clock', async () => {
    reduced = false; freshTool(); await mountState(state()); await show(0); await click(button('▶ Run program'));
    expect(raf).toHaveBeenCalledTimes(1); expect(q('reference-layer')).toBeNull(); expect(q('reference-toggle').disabled).toBe(true);
    await click(q('reference-toggle')); expect(q('reference-toggle').getAttribute('aria-pressed')).toBe('true'); expect(q('reference-layer')).toBeNull(); expect(q('inspect-issues')).toBeNull();
    await React.act(() => raf.mock.calls.at(-1)[0](0)); await React.act(() => raf.mock.calls.at(-1)[0](5000));
    expect(node().textContent).toContain('Weld complete: seam fully covered, no faults.'); expect(q('reference-layer')).toBeNull();
    await inspect(0); assertGeometry(expected(GOOD).segments[0], 0); expect(q('reference-layer').dataset.revealedCollision).toBe('false');
  });

  it('retains exact finite zero-distance references and hides stale geometry after program edits or Clear', async () => {
    const zero = [{ x: 1, y: 1, m: 'J', w: false }, ...GOOD]; await mountState(state({ tech2_rob_prog: zero })); await show(0); assertGeometry(expected(zero).segments[0], 0); expect(q('reference-layer').outerHTML).not.toMatch(/NaN|Infinity/);
    await click(button('Delete point 1')); expect(q('reference-layer')).toBeNull(); await inspect(0); assertGeometry(expected(GOOD).segments[0], 0);
    await click(button('✕ Clear')); expect(q('reference-layer')).toBeNull(); expect(q('reference-control')).toBeNull();
  });

  it.each([false, true])('provides readable HTML explanations and a44px native focusable toggle with static contrast-safe lines (contrast=%s)', async contrast => {
    await mountState(state(), contrast); await inspect(0); const toggle = q('reference-toggle'), control = q('reference-control');
    expect(toggle.type).toBe('button'); expect(toggle.style.minHeight).toBe('44px'); expect(toggle.style.fontSize).toBe('16px'); expect(toggle.style.maxWidth).toBe('100%'); expect(toggle.style.whiteSpace).toBe('normal');
    expect(toggle.getAttribute('aria-describedby')).toBe('rob12-reference-note'); expect(document.getElementById('rob12-reference-note').textContent).toContain('The lesson’s clamp check tests both lines.');
    expect(control.textContent).toContain('do not show the robot arm or a checked interior area'); expect(document.getElementById('rob12-reference-note').className).toContain('text-base');
    toggle.focus(); expect(document.activeElement).toBe(toggle); await click(toggle); expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(control.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(240, 249, 255)'); expect(control.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(q('reference-layer').getAttribute('stroke')).toBe(contrast ? '#ffffff' : '#a5f3fc'); expect(q('reference-layer').style.animation).toBe('none'); expect(q('reference-bow').getAttribute('vector-effect')).toBe('non-scaling-stroke'); expect(q('reference-chord').getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(control.querySelector('style').textContent).toContain('outline:3px solid ' + (contrast ? '#ffff00' : '#0369a1') + '!important'); expect(control.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
  });

  it('restores the complete previous robotics region exactly by removing only the three additive reference blocks', () => {
    const source = stripWeldlabWcagFixes(readFileSync(SRC, 'utf8')), region = source.slice(source.indexOf('function RoboticAutomated('), source.indexOf('function InspectionCWIPrep('));
    const restored = stripRobotReference(region); expect(restored).not.toBe(region.replace(/\r\n/g, '\n'));
    expect(createHash('sha256').update(restored).digest('hex')).toBe('05e9defc2d836897fab4ca835c6f56fef3ac93e20ff61d932ae1b1b8c54e56bd');
    const matches = [...region.matchAll(/__alloT\('stem\.weldlab\.(rob12_[^']+)'/g)].map(match => match[1]); expect(matches).toHaveLength(4); expect(new Set(matches).size).toBe(matches.length);
    const blocks = [...region.replace(/\r\n/g, '\n').matchAll(/\/\/ rob12: begin [^\n]+\n([\s\S]*?)\/\/ rob12: end /g)].map(match => match[1]).join('\n');
    expect(blocks).not.toMatch(/usePersisted|\bupd\(|\bsetRobProg|\bsetRobRun|\bsetRobInspect|requestAnimationFrame|setTimeout|setInterval|tech2CheckProgram|tech2MovePath/);
    expect(() => stripRobotReference(region.replace('// rob12: end reference geometry', '// missing geometry end'))).toThrow('marker count');
  });
});
