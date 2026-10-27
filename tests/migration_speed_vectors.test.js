import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_SPEED_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical speed section: ' + start);
  return source.slice(first, last);
}
const speeds = new Function(
  section('  var SPECIES = [', '  // Resolve model behaviour') +
  section('  function migrNum(', '  // Sibling of migrNum') +
  section('  function migrFlightSpeedValues(', '  function migrFlightInvestigationSnapshot(') +
  '\nreturn migrFlightSpeedValues;'
)();
const createVectors = new Function(section('      function createMigrationSpeedVectors(', '      function initMigrationFlightScene(') + '\nreturn createMigrationSpeedVectors;')();
function fixture(mode = 'chase', aspect = 804 / 560) {
  const positions = { chase: [0, 5.5, 18], aerial: [0, 21, 25], side: [24, 5.5, 5] };
  const camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 900);
  camera.position.fromArray(positions[mode]);
  camera.lookAt(0, 0, -5);
  const root = createVectors(THREE);
  return {
    root, camera,
    update(species = 'canada_goose', wind = 8, enabled = true, cameraMode = mode) {
      const values = speeds(species, wind);
      root.updateValues(enabled, cameraMode, values, camera);
      root.updateMatrixWorld(true);
      return values;
    }
  };
}
function worldBounds(object) {
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  object.traverse(part => {
    const positions = part.geometry?.attributes.position;
    if (!positions) return;
    for (let i = 0; i < positions.count; i++) bounds.expandByPoint(vertex.fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld));
  });
  return bounds;
}
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node);
  walk(node.props?.children, predicate, found);
  return found;
}
let tool;
function view(seed = {}) {
  let state = { tab: 'flight3d', ...seed }, tree;
  const updates = vi.fn();
  const ctx = makeCtx({ update: (_, key, value) => { updates(key, value); state = { ...state, [key]: value }; }, updateMulti: (_, values) => { state = { ...state, ...values }; } });
  const ui = {
    get state() { return state; }, updates,
    draw() { ctx.toolData = { migration: state }; function View() { tree = tool.render(ctx); return tree; } return ReactDOMServer.renderToStaticMarkup(React.createElement(View)); },
    nodes(predicate) { return walk(tree, predicate); },
    set(values) { state = { ...state, ...values }; return ui.draw(); },
    toggle() { const label = ui.nodes(node => node.type === 'label' && walk(node, child => child.type === 'span' && child.props.children === 'Show speed vectors').length)[0]; const input = walk(label, node => node.type === 'input')[0]; input.props.onChange({ target: { checked: !input.props.checked } }); return ui.draw(); },
    label() { return ui.nodes(node => node.props?.className === 'migration-flight-layer-key')[0]; },
    values() { return ui.nodes(node => node.props?.['data-speed-role']).map(node => node.props.children[1]); }
  };
  ui.draw(); return ui;
}
beforeEach(() => { resetStemLab(); tool = loadTool(sourcePath, 'migration'); });

describe('Migration signed speed vectors', () => {
  it.each([
    ['canada_goose', 10, 40, 22.37, 62],
    ['canada_goose', -10, 40, -22.37, 18],
    ['monarch', -15, 12, -33.555, 0],
    ['snow_goose', 0, 50, 0, 50]
  ])('shares validated model values for %s at %s m/s', (species, wind, airSpeed, windMph, groundSpeed) => {
    const values = speeds(species, wind);
    expect(values.airSpeed).toBe(airSpeed);
    expect(values.windMph).toBeCloseTo(windMph, 8);
    expect(values.groundSpeed).toBe(groundSpeed);
    expect(values.rawGroundSpeed).toBeCloseTo(Math.max(0, airSpeed + windMph), 8);
    expect(values.headwindStops).toBe(airSpeed + windMph < 0);
  });

  it('normalizes unknown species, malformed wind and bounded imported values', () => {
    expect(speeds('__proto__', {})).toEqual(speeds('canada_goose', 8));
    expect(speeds('snow_goose', '10')).toEqual(speeds('snow_goose', 10));
    expect(speeds('monarch', -999)).toEqual(speeds('monarch', -15));
    expect(speeds('peregrine', 999)).toEqual(speeds('peregrine', 25));
  });

  it('creates three identified solid arrows from buffers owned by each scene', () => {
    const { root, update } = fixture(); update();
    expect(root.name).toBe('migration-speed-vectors');
    expect(root.children.map(arrow => arrow.name)).toEqual(['migration-speed-air', 'migration-speed-wind', 'migration-speed-ground']);
    expect(root.children.map(arrow => arrow.children[0].material.color.getHex())).toEqual([0x67e8f9, 0xfbbf24, 0x86efac]);
    const other = fixture().root;
    root.children.forEach((arrow, i) => {
      expect(arrow.children).toHaveLength(2);
      expect(arrow.children[0].geometry.attributes.position.count).toBeGreaterThan(20);
      expect(arrow.children[1].geometry.attributes.position.count).toBeGreaterThan(20);
      expect(arrow.children[0].geometry).toBe(root.children[0].children[0].geometry);
      expect(arrow.children[0].geometry).not.toBe(other.children[i].children[0].geometry);
      expect(arrow.children[0].material).not.toBe(other.children[i].children[0].material);
    });
  });

  it('makes geometry lengths proportional to model mph at one fixed scale across all conditions', () => {
    const { root, update } = fixture();
    update(); const scale = root.userData.unitsPerMph;
    for (const [species, wind] of [['canada_goose', 10], ['canada_goose', -10], ['peregrine', 25], ['monarch', -15], ['snow_goose', 0]]) {
      const values = update(species, wind);
      expect(root.userData.unitsPerMph).toBe(scale);
      root.children.forEach(arrow => {
        const mph = values[arrow.userData.valueKey];
        expect(arrow.userData.mph).toBe(mph);
        expect(arrow.userData.tip[2] - arrow.userData.start[2]).toBeCloseTo(-mph * scale, 7);
        if (mph !== 0) {
          const bounds = worldBounds(arrow);
          expect(bounds.max.z - bounds.min.z).toBeCloseTo(Math.abs(mph) * scale, 6);
        }
      });
    }
  });

  it('reverses only negative wind geometry and hides zero arrows including their heads', () => {
    const { root, update } = fixture(); update('canada_goose', -10);
    const wind = root.children[1];
    expect(wind.rotation.y).toBe(Math.PI);
    expect(root.children[0].rotation.y).toBe(0);
    const bounds = worldBounds(wind);
    expect(bounds.min.z).toBeCloseTo(root.position.z, 6);
    expect(bounds.max.z).toBeGreaterThan(root.position.z);
    update('canada_goose', 0);
    expect(wind.visible).toBe(false);
    expect(wind.children.every(part => !part.visible)).toBe(true);
    update('monarch', -15);
    expect(root.children[2].visible).toBe(false);
    expect(root.children[2].children.every(part => !part.visible)).toBe(true);
  });

  it('hides the whole vector diagram when disabled or in Study without discarding it', () => {
    const { root, update } = fixture();
    expect(root.visible).toBe(false);
    update(); expect(root.visible).toBe(true);
    update('canada_goose', 10, true, 'study'); expect(root.visible).toBe(false);
    update('snow_goose', 0, false); expect(root.visible).toBe(false);
    update('monarch', -15); expect(root.visible).toBe(true);
    expect(root.children[0].userData.mph).toBe(12);
  });

  it('responds to explicit condition changes without motion or allocating replacement resources', () => {
    const { root, update } = fixture();
    const resources = root.children.flatMap(arrow => arrow.children.flatMap(part => [part.geometry, part.material]));
    const arrays = root.children.flatMap(arrow => [arrow.userData.start, arrow.userData.tip]);
    for (let i = 0; i < 30; i++) update(i % 2 ? 'monarch' : 'canada_goose', i % 3 ? -10 : 10);
    expect(root.children.flatMap(arrow => arrow.children.flatMap(part => [part.geometry, part.material]))).toEqual(resources);
    root.children.flatMap(arrow => [arrow.userData.start, arrow.userData.tip]).forEach((array, index) => expect(array).toBe(arrays[index]));
    expect(root.children[1].userData.mph).toBeCloseTo(-22.37, 8);
  });

  it.each(['chase', 'aerial', 'side'])('keeps all visible geometry in frame on desktop and phone in %s', mode => {
    for (const aspect of [804 / 560, 390 / 430, 320 / 390]) {
      const { root, camera, update } = fixture(mode, aspect);
      for (const [species, wind] of [['peregrine', 25], ['monarch', -15], ['canada_goose', 0]]) {
        update(species, wind);
        const point = new THREE.Vector3();
        root.children.filter(arrow => arrow.visible).forEach(arrow => arrow.children.forEach(part => {
          const positions = part.geometry.attributes.position;
          for (let index = 0; index < positions.count; index++) {
            point.fromBufferAttribute(positions, index).applyMatrix4(part.matrixWorld).project(camera);
            expect(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)).toBe(true);
            expect(Math.abs(point.x)).toBeLessThan(0.97);
            expect(Math.abs(point.y)).toBeLessThan(0.90);
            expect(point.z).toBeGreaterThan(-1);
            expect(point.z).toBeLessThan(1);
          }
        }));
      }
    }
  });

  it('defaults to opt out and toggles only its own persisted flag', () => {
    const study = { records: {} }, investigation = { trials: [] };
    const ui = view({ flightShowAirflow: true, flightWind: -8, flightStudyObservations: study, flightInvestigation: investigation });
    expect(ui.values()).toEqual([]);
    ui.toggle();
    expect(ui.updates).toHaveBeenLastCalledWith('flightShowSpeedVectors', true);
    expect(ui.state).toMatchObject({ flightShowAirflow: true, flightWind: -8 });
    expect(ui.state.flightStudyObservations).toBe(study); expect(ui.state.flightInvestigation).toBe(investigation);
    ui.toggle(); expect(ui.values()).toEqual([]);
  });

  it('exposes rounded mph roles through one shared accessible layer key and stage label', () => {
    const ui = view({ flightShowSpeedVectors: true, flightShowAirflow: true, flightWind: 10 });
    expect(ui.nodes(node => node.props?.className === 'migration-flight-layer-key')).toHaveLength(1);
    expect(ui.label().props['aria-label']).toBe('Scene layer key');
    expect(ui.values()).toEqual(['Airspeed: 40 mph', 'Along-route wind: +22.4 mph', 'Ground speed: 62 mph']);
    expect(ui.draw()).toContain('Wingtip wake');
    const stage = ui.nodes(node => node.props?.["data-migration-id"] === 'migration-flight-stage')[0];
    expect(stage.props['aria-label']).toContain('Along-route wind: +22.4 mph');
    expect(walk(ui.label(), node => node.props?.['aria-hidden'] === 'true').every(node => node.type === 'i')).toBe(true);
  });

  it('keeps zero values readable and explains the no-backward-travel model limit', () => {
    const ui = view({ flightShowSpeedVectors: true, flightSpecies: 'monarch', flightWind: 0 });
    expect(ui.values()).toEqual(['Airspeed: 12 mph', 'Along-route wind: 0 mph', 'Ground speed: 12 mph']);
    const html = ui.set({ flightWind: -15 });
    expect(ui.values()).toEqual(['Airspeed: 12 mph', 'Along-route wind: -33.6 mph', 'Ground speed: 0 mph']);
    expect(html).toContain('holds ground speed at zero');
    expect(html).toContain('along-route speeds, not crosswind or compass directions');
  });

  it('keeps the preference while Study hides speed values and returning to Chase restores them', () => {
    const ui = view({ flightShowSpeedVectors: true, flightWind: -10 });
    expect(ui.values()).toHaveLength(3);
    expect(ui.set({ flightCamera: 'study' })).toContain('Speed vectors are hidden in Study');
    expect(ui.values()).toEqual([]);
    expect(ui.state.flightShowSpeedVectors).toBe(true);
    ui.set({ flightCamera: 'chase', flightWind: 0 });
    expect(ui.values()).toEqual(['Airspeed: 40 mph', 'Along-route wind: 0 mph', 'Ground speed: 40 mph']);
  });
});
