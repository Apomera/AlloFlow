import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.nebula = { nebulaPose, nebulaAdvance, nebulaBeacon, readObservations, notebookBackup, readNotebookBackup, notebookImportPlan };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { nebulaPose: pose, nebulaAdvance: advance, nebulaBeacon: beacon, readObservations: notes,
  notebookBackup: backup, readNotebookBackup: restore, notebookImportPlan: importPlan } = sandbox.window.nebula;
const start = Object.freeze({ x: 0, y: 0, z: 0, heading: 0, pitch: 0, travel: 7 });
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);


describe('Orion Nebula interior navigation', () => {
  it('moves forward, sideways and vertically in light-years using the camera heading and pitch', () => {
    const cases = [
      [start, { forward: 1 }, [0, 0, -.1]],
      [{ ...start, heading: 90 }, { forward: 1 }, [.1, 0, 0]],
      [start, { side: 1 }, [.1, 0, 0]],
      [{ ...start, heading: 90 }, { side: 1 }, [0, 0, .1]],
      [start, { forward: -1 }, [0, 0, .1]],
      [start, { lift: 1 }, [0, .1, 0]],
      [{ ...start, pitch: .5 }, { forward: 1 }, [0, .1 * Math.sin(.5), -.1 * Math.cos(.5)]]
    ];
    for (const [initial, input, coordinates] of cases) {
      const moved = advance(initial, input, .05, 2);
      for (const [index, key] of ['x', 'y', 'z'].entries()) expect(moved[key]).toBeCloseTo(coordinates[index], 10);
      expect(moved.travel).toBeCloseTo(7.1, 10);
      expect(moved.heading).toBe(initial.heading);
      expect(moved.pitch).toBe(initial.pitch);
    }
    expect(start).toEqual({ x: 0, y: 0, z: 0, heading: 0, pitch: 0, travel: 7 });
  });

  it('keeps combined movement at the selected rate even when forward motion already includes a climb', () => {
    for (const pitch of [0, .7, -.7]) {
      const initial = { ...start, pitch };
      const moved = advance(initial, { forward: 1, side: 1, lift: 1 }, .05, 2);
      expect(distance(initial, moved)).toBeCloseTo(.1, 10);
      expect(moved.travel - initial.travel).toBeCloseTo(.1, 10);
      expect(advance(initial, { forward: 99, side: 99, lift: 99 }, .05, 2)).toEqual(moved);
    }
    expect(advance(start, { forward: NaN, side: Infinity, lift: -Infinity }, .05, 2)).toEqual(start);
    expect(advance(start, null, .05, 2)).toEqual(start);
  });

  it('caps render gaps and travel rates and ignores invalid elapsed times', () => {
    expect(advance(start, { forward: 1 }, 20, 2).z).toBeCloseTo(-.1, 10);
    for (const seconds of [0, -.2, NaN, Infinity, '0.05', undefined]) {
      expect(advance(start, { forward: 1 }, seconds, 2)).toEqual(start);
    }
    for (const [rate, expected] of [[-20, .15], [0, .15], [99, 2], [NaN, .8], [Infinity, .8], ['2', .8], [undefined, .8]]) {
      const moved = advance(start, { forward: 1 }, .05, rate);
      expect(distance(start, moved)).toBeCloseTo(expected * .05, 10);
    }
    expect(distance(start, advance(start, { forward: 1 }, .02, 1.25))).toBeCloseTo(.025, 10);
  });

  it('counts only actual movement at the volume bounds and caps accumulated free travel', () => {
    const nearEdge = { ...start, x: 16.78, y: 16.799, z: -16.79 };
    const moved = advance(nearEdge, { forward: 1, side: 1, lift: 1 }, .05, 2);
    expect(moved).toMatchObject({ x: 16.8, y: 16.8, z: -16.8 });
    expect(moved.travel - nearEdge.travel).toBeCloseTo(Math.hypot(.02, .001, .01), 10);
    expect(moved.travel - nearEdge.travel).toBeCloseTo(distance(nearEdge, moved), 10);
    expect(advance(moved, { forward: 1, side: 1, lift: 1 }, .05, 2)).toEqual(moved);
    const negativeEdge = advance({ ...start, x: -16.8, y: -16.8, z: 16.8 }, { forward: -1, side: -1, lift: -1 }, .05, 2);
    expect(negativeEdge).toMatchObject({ x: -16.8, y: -16.8, z: 16.8, travel: 7 });
    expect(advance({ ...start, travel: 1e6 - .01 }, { forward: 1 }, .05, 2).travel).toBe(1e6);
  });

  it('recovers invalid poses to the overview and bounds valid saved coordinates and angles', () => {
    const overview = beacon('overview');
    for (const invalid of [null, {}, []]) expect(pose(invalid)).toEqual(overview);
    for (const key of ['x', 'y', 'z', 'heading', 'pitch']) {
      for (const invalid of [NaN, Infinity, -Infinity, '2', undefined, null]) {
        expect(pose({ ...start, [key]: invalid })).toEqual(overview);
      }
    }
    expect(pose({ x: 999, y: -999, z: 999, heading: -370, pitch: 99, travel: 2e6 }))
      .toEqual({ x: 16.8, y: -16.8, z: 16.8, heading: 350, pitch: 1.2, travel: 1e6 });
    expect(pose({ ...start, pitch: -99, travel: -4 })).toMatchObject({ pitch: -1.2, travel: 0 });
    for (const travel of [NaN, Infinity, '4']) expect(pose({ ...start, travel })).toEqual({ ...start, travel: 0 });
    const saved = { x: 1.25, y: -.75, z: 8.125, heading: 123.4, pitch: -.32, travel: 7.25 };
    expect(pose(saved)).toMatchObject({ ...saved, heading: expect.closeTo(saved.heading, 10) });
    expect(pose(saved)).not.toBe(saved);
  });

  it('points every beacon toward its feature while preserving free travel across camera jumps', () => {
    const stations = [
      ['overview', [1.1, .8, 10.4], [-.144, .336, 3.24]],
      ['trapezium', [.75, .52, 4.2], [-.144, .336, 3.24]],
      ['cavity', [.05, .6, 5.4], [1.4, -2.3, 1]],
      ['front', [7, -4.5, 3.5], [4.56, -2.76, .84]],
      ['dust', [-6.6, 6.6, 6.8], [-3.6, 4.56, 2.64]]
    ];
    const current = Object.freeze({ ...start, travel: 14.25 });
    for (const [id, eye, aim] of stations) {
      const view = beacon(id, current), heading = view.heading * Math.PI / 180;
      expect([view.x, view.y, view.z]).toEqual(eye);
      const direction = [Math.sin(heading) * Math.cos(view.pitch), Math.sin(view.pitch), -Math.cos(heading) * Math.cos(view.pitch)];
      const length = Math.hypot(...aim.map((value, index) => value - eye[index]));
      direction.forEach((value, index) => expect(value).toBeCloseTo((aim[index] - eye[index]) / length, 10));
      expect(view.travel).toBe(14.25);
      expect(advance(view, { forward: 1 }, .05, .8).travel).toBeCloseTo(14.29, 10);
    }
    expect(current.travel).toBe(14.25);
    expect(beacon('unknown', current)).toEqual(beacon('overview', current));
    expect(beacon('dust', { travel: -4 }).travel).toBe(0);
    expect(beacon('dust', { travel: 2e6 }).travel).toBe(1e6);
    for (const travel of [NaN, Infinity, '4']) expect(beacon('dust', { travel }).travel).toBe(0);
  });

  it('restores interior poses only for Orion observations and sanitizes saved speed and older entries', () => {
    const saved = { x: 2.5, y: -.8, z: 4.1, heading: 123, pitch: -.2, travel: 13.375 };
    const entries = notes([
      { itemId: 'orion-nebula', detailId: 'trapezium', nebulaInside: true, nebulaPose: saved, nebulaSpeed: 1.25 },
      { itemId: 'orion-nebula', detailId: 'stellar-cavity', nebulaInside: false, nebulaPose: saved },
      { itemId: 'orion-nebula', detailId: 'dust-ridge', nebulaInside: 'true', nebulaPose: saved },
      { itemId: 'orion-nebula', nebulaInside: true, nebulaPose: { ...saved, x: Infinity }, nebulaSpeed: Infinity },
      { itemId: 'moon', nebulaInside: true, nebulaPose: saved }
    ]);
    expect(entries).toHaveLength(5);
    expect(entries[0]).toMatchObject({ nebulaInside: true, nebulaPose: saved, nebulaSpeed: 1.25 });
    for (const index of [1, 2, 4]) expect(entries[index]).toMatchObject({ nebulaInside: false, nebulaPose: null });
    expect(entries[3]).toMatchObject({ nebulaInside: true, nebulaPose: beacon('overview'), nebulaSpeed: .8 });
    expect(notes([{ itemId: 'orion-nebula' }])[0]).toMatchObject({ nebulaInside: false, nebulaPose: null, nebulaSpeed: .8 });
    for (const [nebulaSpeed, expected] of [[-4, .15], [99, 2], [NaN, .8], ['1', .8], [undefined, .8]]) {
      expect(notes([{ itemId: 'orion-nebula', nebulaInside: true, nebulaSpeed }])[0].nebulaSpeed).toBe(expected);
    }
    expect(notes([{ itemId: 'orion-nebula', nebulaInside: true }])[0].nebulaPose).toEqual(beacon('overview'));
  });

  it('round-trips a saved interior course through notebook backup, restore and import', () => {
    const saved = { observations: [{ itemId: 'orion-nebula', detailId: 'trapezium', nebulaInside: true, nebulaReveal: true,
      nebulaPose: { x: 2.5, y: -.8, z: 4.1, heading: 123, pitch: -.2, travel: 13.375 }, nebulaSpeed: 1.25,
      note: 'Followed the cavity toward the cluster.' }], investigations: [] };
    const before = JSON.stringify(saved), restored = restore(backup(saved));
    expect(restored.error).toBeUndefined();
    expect(restored.recovered).toBe(false);
    expect(restored.notebook.observations).toHaveLength(1);
    expect(restored.notebook.observations[0]).toMatchObject(saved.observations[0]);
    const imported = importPlan({}, restored.notebook);
    expect(imported).toMatchObject({ imported: 1, blocked: 0 });
    expect(imported.rows[0]).toMatchObject({ status: 'add', selected: true });
    expect(imported.notebook.observations[0]).toEqual(restored.notebook.observations[0]);
    const duplicate = importPlan(imported.notebook, restored.notebook);
    expect(duplicate.imported).toBe(0);
    expect(duplicate.rows[0]).toMatchObject({ status: 'duplicate', selected: false });
    expect(JSON.stringify(saved)).toBe(before);
  });
});
