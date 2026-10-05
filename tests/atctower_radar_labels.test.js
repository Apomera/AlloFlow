import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const pureSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const model = new Function(pureSource + '\nreturn { atcRadarCallsign, atcRadarTagLayout };')();

function aircraft(id, extra = {}) {
  return { id, callsign: 'United ' + id, x: 200, y: 200, state: 'inbound', fuel: 40,
    altitude: 5000, speed: 140, type: { id: 'B738' }, ...extra };
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expectInBounds(tags, width, height) {
  for (const tag of tags) {
    for (const field of ['x', 'y', 'width', 'height', 'anchorX', 'anchorY']) expect(Number.isFinite(tag[field])).toBe(true);
    expect(tag.width).toBeGreaterThan(0);
    expect(tag.height).toBeGreaterThan(0);
    expect(tag.x).toBeGreaterThanOrEqual(0);
    expect(tag.y).toBeGreaterThanOrEqual(0);
    expect(tag.x + tag.width).toBeLessThanOrEqual(width + 0.001);
    expect(tag.y + tag.height).toBeLessThanOrEqual(height + 0.001);
  }
}

describe('ATC readable radar tags', () => {
  it('preserves the full normalized callsign and supplies useful missing-data fallbacks', () => {
    expect(model.atcRadarCallsign(aircraft(101, { callsign: '  British   Airways  101  ' }))).toBe('British Airways 101');
    expect(model.atcRadarCallsign(aircraft(101, { callsign: 'American 987' }))).toBe('American 987');
    for (const ac of [aircraft(101, { callsign: '' }), { id: 101, type: { id: 'C172' } }, {}]) {
      const label = model.atcRadarCallsign(ac);
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toContain('undefined');
      expect(label).not.toContain('null');
    }
  });

  it('keeps full identity in returned tag data without changing aircraft state', () => {
    const traffic = [aircraft(101, { callsign: 'British Airways 101' }), aircraft(102, { x: 260, callsign: 'Air Canada 102' })];
    const before = JSON.stringify(traffic);
    const tags = model.atcRadarTagLayout(traffic, 600, 600, 101);
    expect(tags.find(tag => tag.id === 101).callsign).toBe('British Airways 101');
    expect(tags.find(tag => tag.id === 102).callsign).toBe('Air Canada 102');
    expect(JSON.stringify(traffic)).toBe(before);
    expect(model.atcRadarTagLayout(traffic, 600, 600, 101)).toEqual(tags);
  });

  it('places tags inside the radar at all four edges on desktop and narrow screens', () => {
    const traffic = [aircraft(1, { x: 0, y: 0 }), aircraft(2, { x: 400, y: 0 }), aircraft(3, { x: 0, y: 400 }), aircraft(4, { x: 400, y: 400 })];
    for (const [width, height] of [[600, 600], [320, 320], [280, 420]]) {
      const tags = model.atcRadarTagLayout(traffic, width, height, 4);
      expect(tags).toHaveLength(4);
      expectInBounds(tags, width, height);
    }
  });

  it('avoids tag overlap for a feasible cluster of nearby tracks', () => {
    const traffic = [aircraft(1, { x: 196, y: 196 }), aircraft(2, { x: 202, y: 196 }), aircraft(3, { x: 196, y: 204 }), aircraft(4, { x: 204, y: 204 })];
    const tags = model.atcRadarTagLayout(traffic, 600, 600, 4);
    expectInBounds(tags, 600, 600);
    for (let i = 0; i < tags.length; i++) for (let j = i + 1; j < tags.length; j++) expect(intersects(tags[i], tags[j])).toBe(false);
  });

  it('draws ordinary traffic before urgent traffic and the selected track last', () => {
    const tags = model.atcRadarTagLayout([
      aircraft(4, { x: 140, emergency: { priority: true } }),
      aircraft(1, { x: 160 }),
      aircraft(2, { x: 220, emergency: { priority: false } }),
      aircraft(3, { x: 260, fuel: 4 }),
    ], 600, 600, 1, [2]);
    expect(tags.at(-1)).toMatchObject({ id: 1, selected: true });
    expect(tags.find(tag => tag.id === 4).priority).toBe(true);
    expect(tags.find(tag => tag.id === 3).priority).toBe(true);
    expect(tags.find(tag => tag.id === 2)).toMatchObject({ priority: false, conflict: true });
    expect(tags.findIndex(tag => tag.id === 2)).toBeLessThan(tags.findIndex(tag => tag.id === 4));
    expect(tags.find(tag => tag.id === 4).selected).toBe(false);
  });

  it('filters retired and unusable tracks while retaining live IDs and anchors', () => {
    const tags = model.atcRadarTagLayout([
      null,
      aircraft(1, { state: 'landed' }),
      aircraft(2, { state: 'departed' }),
      aircraft(3, { x: NaN }),
      aircraft(4, { y: Infinity }),
      aircraft(5, { x: 100, y: 200 }),
    ], 600, 400, null);
    expect(tags).toHaveLength(1);
    // Aircraft and tag anchors share the renderer's uniform airspace scale:
    // min(width, height) / 400, preserving aspect ratio in rectangular canvases.
    expect(tags[0]).toMatchObject({ id: 5, anchorX: 100, anchorY: 200 });
    expect(model.atcRadarTagLayout(null, 600, 400, null)).toEqual([]);
  });

  it('stays finite and bounded when available room cannot avoid all collisions', () => {
    const traffic = Array.from({ length: 8 }, (_, index) => aircraft(index + 1, { callsign: 'British Airways ' + (100 + index) }));
    const tags = model.atcRadarTagLayout(traffic, 120, 80, 8);
    expect(tags).toHaveLength(8);
    expectInBounds(tags, 120, 80);
    expect(tags.at(-1)).toMatchObject({ id: 8, selected: true, callsign: 'British Airways 107' });
  });
});
