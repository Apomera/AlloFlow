import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

beforeEach(freshTool);
afterEach(unmountState);
const retained = { car2_reflect: 'Keep my project notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const query = selector => node().querySelector(selector);
const number = (element, attribute) => Number(element.getAttribute(attribute));
const hazPlot = () => query('svg[aria-label^="Peak temperature against distance"]');
const beads = () => [...node().querySelectorAll('[data-pipe-groove-bead]')];
const firstPath = bead => bead.querySelector('path');

describe('HAZ diagram labels above the movable probe', () => {
  it.each([false, true])('retains zone readings and probe geometry while giving labels opaque foreground grounds in contrast=%s', async contrast => {
    const app = await mountState({ ...retained, view: 'metallurgy', met_sect: 'haz', met2_hazH: 16, met2_hazProbe: 2.1 }, contrast);
    const plot = hazPlot(), probe = query('#met2-haz-probe');
    expect(plot).toBeTruthy(); expect(probe.disabled).toBe(false);
    const zones = [...plot.querySelectorAll('[data-met-haz-zone-label]')];
    expect(zones.map(group => group.getAttribute('data-met-haz-zone-label'))).toEqual(['cg', 'fg', 'ic', 'sc', 'bm']);
    expect(zones.map(group => group.querySelector('text').textContent)).toEqual(['2', '3', '4', '5', '6']);
    expect([...plot.children].slice(-zones.length).every((child, index) => child === zones[index])).toBe(true);
    const marker = plot.querySelector('circle[fill="#38bdf8"]');
    expect(marker.compareDocumentPosition(zones[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const group of zones) {
      const ground = group.querySelector('rect'), label = group.querySelector('text');
      expect(ground.getAttribute('fill')).toBe('#0f172a');
      expect(label.getAttribute('fill')).toBe('#f8fafc');
      expect(ground.closest('[opacity]')).toBeNull(); expect(label.closest('[opacity]')).toBeNull();
      expect(number(ground, 'width')).toBeGreaterThan(0); expect(number(ground, 'height')).toBeGreaterThan(0);
    }
    const line = plot.querySelector('line[stroke="#38bdf8"]');
    expect(number(line, 'x1')).toBeCloseTo(129.58, 10); expect(number(line, 'x2')).toBeCloseTo(129.58, 10);
    expect(number(line, 'y1')).toBe(14); expect(number(line, 'y2')).toBe(262);
    const curve = plot.querySelector('polyline').getAttribute('points');
    const modelDescription = plot.getAttribute('aria-label').split('Probe at ')[0];
    const crossSectionRings = query('[data-met-haz-cross-section] [clip-path]').outerHTML;
    const saved = structuredClone(app.latest()), writes = app.writes.length;
    probe.focus(); await change(probe, '3');
    expect(document.activeElement).toBe(probe);
    expect(app.latest()).toEqual({ ...saved, met2_hazProbe: 3 }); expect(app.writes).toHaveLength(writes + 1);
    expect(app.latest()).toMatchObject(retained);
    expect(hazPlot().querySelector('polyline').getAttribute('points')).toBe(curve);
    expect(hazPlot().getAttribute('aria-label').split('Probe at ')[0]).toBe(modelDescription);
    expect(hazPlot().getAttribute('aria-label')).toMatch(/Probe at 3(?:\.0)? mm: peak/);
    expect(node().textContent).toMatch(/At 3(?:\.0)? mm the steel peaked/);
    expect(number(hazPlot().querySelector('line[stroke="#38bdf8"]'), 'x1')).toBeCloseTo(165.4, 10);
    expect(query('[data-met-haz-cross-section] [clip-path]').outerHTML).toBe(crossSectionRings);
    expect([...hazPlot().querySelectorAll('[data-met-haz-zone-label] text')].map(label => label.textContent)).toEqual(['2', '3', '4', '5', '6']);
  });
});

describe('Pipe pass indices independent of path emphasis', () => {
  it.each([false, true])('keeps later pass numbers opaque while their bead paths dim in contrast=%s', async contrast => {
    const stack = ['root', 'hot', 'cap'];
    const app = await mountState({ ...retained, view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: .218, pipe2_stack: stack }, contrast);
    expect(beads()).toHaveLength(3);
    const shapes = beads().map(bead => firstPath(bead).getAttribute('d'));
    const areas = beads().map(bead => number(bead, 'data-groove-area'));
    const plan = window.__WeldLabCore.pipe2GroovePlan(.218);
    expect(areas.reduce((sum, area) => sum + area, 0)).toBeCloseTo(plan.area, 12);
    const saved = structuredClone(app.latest()), writes = app.writes.length;
    for (const selected of [0, 1, 2]) {
      const control = query('[data-pipe-pass-node="' + selected + '"]');
      control.focus(); await click(control);
      expect(document.activeElement).toBe(control);
      expect(control.getAttribute('aria-pressed')).toBe('true');
      expect(query('[data-pipe-groove]').getAttribute('aria-label')).toContain('Pass ' + (selected + 1));
      for (const [index, bead] of beads().entries()) {
        const label = query('[data-pipe-groove-pass-number="' + index + '"] text');
        expect(bead.getAttribute('opacity')).toBeNull();
        expect(firstPath(bead).getAttribute('opacity')).toBe(index > selected ? '0.3' : '1');
        expect(label.textContent).toBe(String(index + 1));
        expect(label.getAttribute('fill')).toBe('#f8fafc');
        expect(label.parentElement.querySelector('rect').getAttribute('fill')).toBe('#0f172a');
        expect(label.closest('[opacity]')).toBeNull();
        expect(firstPath(bead).getAttribute('d')).toBe(shapes[index]);
        expect(number(bead, 'data-groove-area')).toBe(areas[index]);
      }
      const occupied = areas.slice(0, selected + 1).reduce((sum, area) => sum + area, 0);
      expect(Number(query('#pipe-pass-area-progress').value)).toBeCloseTo(occupied, 12);
      expect(number(query('[data-pipe-cumulative-area]'), 'data-pipe-cumulative-area')).toBeCloseTo(occupied, 12);
      expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(writes);
    }
    expect(app.latest().pipe2_stack).toEqual(stack); expect(app.latest()).toMatchObject(retained);
  });
});
