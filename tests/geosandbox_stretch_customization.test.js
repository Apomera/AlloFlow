import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadAlloModule } from './setup.js';
import { installGeoThreeStub, findByKind, worldVertices } from './helpers/geosandbox_three_stub.js';

let P, R, restore;
beforeAll(() => {
  loadAlloModule('stem_lab/stem_tool_geosandbox.js');
  P = window.StemLab.geoPure;
  R = window.StemLab.geoRender;
  restore = installGeoThreeStub();
});
afterAll(() => { if (restore) restore(); });

function rectangle(id = 3) {
  return { id, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0] };
}
function prism(id = 4) {
  return { id, type: 'prism', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0], w: [0, 0, 4] };
}
function revolution(id = 6) {
  return Object.assign({ id }, P.revolveRect(rectangle(), 'y', 360, 24));
}
function render(objects, selectedId = null, appearance) {
  return R.buildConstructionGroup(window.THREE, objects, selectedId, false, 'u', appearance);
}


describe('Stretch object customization', () => {
  it('preserves a typed name including spaces and limits its length without modifying geometry', () => {
    const original = prism();
    const updated = P.geoCustomizeStretchObject(original, { name: '  Tower roof  ', color: '#12Ab90', opacity: 0.4 });
    expect(updated).toMatchObject({ name: '  Tower roof  ', color: '#12Ab90', opacity: 0.4 });
    expect(P.geoStretchMeasure(updated)).toEqual(P.geoStretchMeasure(original));
    expect(original).not.toHaveProperty('name');
    expect(updated.u).not.toBe(original.u);
    expect(P.geoCustomizeStretchObject(updated, { name: 'a'.repeat(80) }).name).toHaveLength(60);
  });

  it('clamps supported numeric edits and restores default color/opacity by removing overrides', () => {
    const original = prism();
    const customized = P.geoCustomizeStretchObject(original, { position: [-100, -3, 75], opacity: 4, color: '#000000' });
    expect(customized).toMatchObject({ position: [-20, 0, 20], opacity: 1, color: '#000000' });
    expect(P.geoCustomizeStretchObject(customized, { opacity: -1 }).opacity).toBe(0.15);
    const restored = P.geoCustomizeStretchObject(customized, { color: null, opacity: null });
    expect(restored).not.toHaveProperty('color');
    expect(restored).not.toHaveProperty('opacity');
    expect(restored.position).toEqual(customized.position);
    expect(customized.color).toBe('#000000');
  });

  it('returns the original reference for unchanged, unsupported, or invalid edits', () => {
    const original = prism();
    const invalid = [
      {}, { position: [0, 0, 0] }, { color: null, opacity: null },
      { type: 'point', id: 99, u: [30, 0, 0] },
      { name: 42 }, { color: '#abc' }, { color: 'red' }, { opacity: NaN },
      { opacity: Infinity }, { opacity: '0.5' }, { position: [1, 2] },
      { position: [1, 2, Infinity] }, { position: [1, '2', 3] },
      { name: 'Do not partially apply me', color: 'invalid' },
    ];
    invalid.forEach((changes) => expect(P.geoCustomizeStretchObject(original, changes)).toBe(original));
  });

  it('moves points, lines, planes, and solids without changing their measurements', () => {
    const objects = [
      { id: 1, type: 'point', position: [0, 0, 0] },
      { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] },
      rectangle(), prism(), Object.assign({ id: 5 }, P.taperRect(rectangle(), 'z', 4, 0.3, 0.6)),
    ];
    objects.forEach((object) => {
      const moved = P.geoCustomizeStretchObject(object, { position: [7, 4, -5] });
      expect(moved.position).toEqual([7, 4, -5]);
      const before = P.geoStretchMeasure(object), after = P.geoStretchMeasure(moved);
      Object.entries(before).forEach(([key, value]) => {
        if (typeof value === 'number') expect(after[key]).toBeCloseTo(value, 10);
        else expect(after[key]).toEqual(value);
      });
      expect(object.position).toEqual([0, 0, 0]);
    });
  });

  it('allows revolution appearance edits but refuses profile translation that changes sweep geometry', () => {
    const original = revolution();
    expect(P.geoCustomizeStretchObject(original, { position: [4, 0, 0] })).toBe(original);
    const updated = P.geoCustomizeStretchObject(original, { name: 'Cylinder', color: '#8040ff', opacity: 0.6 });
    expect(P.geoStretchMeasure(updated)).toEqual(P.geoStretchMeasure(original));
    expect(updated.name).toBe('Cylinder');
  });
});


describe('Stretch duplicate and metadata persistence', () => {
  it('duplicates a shape at the requested spacing with a new id and independently copied metadata', () => {
    const original = Object.assign(prism(), { name: 'Tower', color: '#112233', opacity: 0.6, tags: ['left'] });
    const copy = P.geoDuplicateStretchObject(original, 8, 0, 5);
    expect(copy).toMatchObject({ id: 8, position: [5, 0, 0], name: 'Tower', color: '#112233', opacity: 0.6 });
    expect(P.geoStretchMeasure(copy)).toEqual(P.geoStretchMeasure(original));
    copy.tags.push('copy');
    copy.u[0] = 99;
    expect(original.tags).toEqual(['left']);
    expect(original.u).toEqual([3, 0, 0]);
  });

  it('keeps exact spacing or refuses the copy when the target would cross editor bounds', () => {
    const original = Object.assign(prism(), { position: [18, 19, -18] });
    expect(P.geoDuplicateStretchObject(original, 8, 0, 2).position).toEqual([20, 19, -18]);
    expect(P.geoDuplicateStretchObject(original, 8, 0, 3)).toBe(original);
    expect(P.geoDuplicateStretchObject(original, 8, 1, 2)).toBe(original);
    expect(P.geoDuplicateStretchObject(original, 8, 2, 0.01).position[2]).toBeCloseTo(-17.9, 8);
    expect(P.geoDuplicateStretchObject(prism(), 8, 2, 50).position).toEqual([0, 0, 20]);
  });

  it('does not duplicate revolutions or accept invalid identity, axis, or spacing', () => {
    const original = prism();
    [[4, 0, 1], [0, 0, 1], [2.5, 0, 1], [Infinity, 0, 1], [8, -1, 1], [8, 3, 1], [8, 0.5, 1], [8, 0, 0], [8, 0, -1], [8, 0, Infinity], [8, 0, '2']].forEach((args) => {
      expect(P.geoDuplicateStretchObject(original, ...args)).toBe(original);
    });
    const swept = revolution();
    expect(P.geoDuplicateStretchObject(swept, 8, 0, 5)).toBe(swept);
  });

  it('keeps appearance and name through resizing, similar copies, save normalization, undo, and redo', () => {
    const original = Object.assign(prism(), { name: 'Blue tower ', color: '#2277ee', opacity: 0.65 });
    const resized = P.resizeObject(original, 2, 8);
    const scaled = P.geoScaleObject(original, 2);
    [resized, scaled].forEach((copy) => expect(copy).toMatchObject({ name: original.name, color: original.color, opacity: original.opacity }));
    expect(P.geoStretchMeasure(scaled).value).toBeCloseTo(P.geoStretchMeasure(original).value * 8, 8);
    const before = { construction: { objects: [original], selection: original.id } };
    const remembered = P.geoRememberStretchConstruction(before);
    const after = { ...remembered, construction: P.geoNormalizeConstruction({ objects: [resized], selection: resized.id }) };
    const undone = P.geoStepStretchHistory(after, false);
    expect(undone.construction.objects[0]).toEqual(original);
    expect(P.geoStepStretchHistory(undone, true).construction.objects[0]).toEqual(resized);
  });
});


describe('Stretch custom materials preserve selection cues', () => {
  it('keeps default materials unchanged and displays selected custom colors with an amber outline', () => {
    const plain = findByKind(render([prism()], 4).children[0], 'Mesh');
    expect(plain.material).toMatchObject({ color: 0xfbbf24, opacity: 0.7, transparent: true });
    const customized = render([Object.assign(prism(), { color: '#000000' })], 4).children[0];
    expect(findByKind(customized, 'Mesh').material.color).toBe(0);
    expect(findByKind(customized, 'LineSegments').material).toMatchObject({ color: 0xfbbf24, opacity: 0.95, depthTest: false });
    expect(findByKind(customized, 'LineSegments').renderOrder).toBe(3000);
    expect(worldVertices(customized)).toEqual(worldVertices(render([prism()], 4).children[0]));
  });

  it('retains enlarged point and segment endpoints when their custom color is selected', () => {
    const point = { id: 1, type: 'point', position: [0, 0, 0], color: '#225588' };
    const segment = { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0], color: '#225588' };
    [point, segment].forEach((object) => {
      const selected = render([object], object.id).children[0];
      const unselected = render([object]).children[0];
      expect(findByKind(selected, 'Mesh').material.color).toBe(0x225588);
      const height = (node) => Math.max(...worldVertices(node).map((p) => p[1])) - Math.min(...worldVertices(node).map((p) => p[1]));
      expect(height(selected)).toBeGreaterThan(height(unselected));
    });
  });

  it('gives a selected custom-colored revolution a visible outline without changing default revolution rendering', () => {
    const swept = revolution();
    const plain = render([swept], swept.id).children[0];
    expect(plain.children.filter((node) => node.__kind === 'LineSegments')).toHaveLength(0);
    const customized = render([Object.assign({}, swept, { color: '#ff6600' })], swept.id).children[0];
    expect(findByKind(customized, 'Mesh').material.color).toBe(0xff6600);
    expect(findByKind(customized, 'LineSegments').material).toMatchObject({ color: 0xfbbf24, depthTest: false });
    expect(customized.userData.objId).toBe(swept.id);
  });

  it('lets explicit opacity override solid surfaces, then multiplies dimming without fading selected outlines', () => {
    const chosen = Object.assign(prism(4), { opacity: 0.35 });
    const other = Object.assign(prism(5), { position: [5, 0, 0], opacity: 0.5 });
    const scene = render([chosen, other], 4, { surface: 'solid', dimUnselected: true });
    expect(findByKind(scene.children[0], 'Mesh').material).toMatchObject({ opacity: 0.35, transparent: true });
    expect(findByKind(scene.children[0], 'LineSegments').material.opacity).toBe(0.95);
    expect(findByKind(scene.children[1], 'Mesh').material.opacity).toBeCloseTo(0.11, 8);
    expect(findByKind(scene.children[1], 'Mesh').material.depthWrite).toBe(false);
    expect(scene.children[1].userData).toMatchObject({ objId: 5, objType: 'prism' });
    expect(scene.children[1].visible).toBe(true);
  });

  it('ignores invalid saved appearance values and honors fully opaque custom fills', () => {
    const invalid = findByKind(render([Object.assign(prism(), { color: 'garbage', opacity: '0.2' })]).children[0], 'Mesh');
    expect(invalid.material).toMatchObject({ color: 0xa78bfa, opacity: 0.7, transparent: true });
    const opaque = findByKind(render([Object.assign(prism(), { opacity: 1 })]).children[0], 'Mesh');
    expect(opaque.material).toMatchObject({ opacity: 1, transparent: false });
  });
});