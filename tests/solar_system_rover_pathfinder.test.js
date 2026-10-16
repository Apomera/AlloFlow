import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function roverTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-rover-pathfinder') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree);
  return panel || React.createElement(React.Fragment);
}

function renderRover(seed = {}) {
  const store = newStore({ solarSystem: {
    tutorialDismissed: true, solarMissionDashboardOpen: false, selectedPlanet: 'Earth',
    viewTab: 'overview', orreryMode: false, paused: true, showRover: true,
    journalEntries: [], missionLog: [], ...seed,
  } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : props?.onKeyDown;
    if (typeof callback === 'function') {
      const id = String(callbacks.size);
      callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-rp-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false;
      callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const world = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return world || fallback || key;
      } }, store);
      const original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => roverTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return {
    get section() { return document.getElementById('solar-rover-pathfinder'); },
    get state() { return store.toolData.solarSystem; },
    get writes() { return writes; },
    invoke(selector, event = {}) {
      const control = this.section.querySelector(selector);
      callbacks.get(control.dataset.rpTestCallback)(event);
      render();
    },
    render,
  };
}

const direction = key => '[data-rp-direction="' + key + '"]';
const action = key => '[data-rp-action="' + key + '"]';
const terrain = fn => Array.from({ length: 10 }, (_, y) => Array.from({ length: 10 }, (_, x) => fn(x, y)));
const COSTS = [1, 2, 3, 5];

// Independent reverse relaxation oracle: each starting cell pays the entered neighbor's cost.
function referenceCost(map, position) {
  const distances = Array(100).fill(Infinity);
  distances[59] = 0;
  for (let pass = 0; pass < 100; pass++) {
    let changed = false;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || nx > 9 || ny < 0 || ny > 9) continue;
        const candidate = distances[ny * 10 + nx] + COSTS[map[ny][nx]];
        if (candidate < distances[y * 10 + x]) { distances[y * 10 + x] = candidate; changed = true; }
      }
    }
    if (!changed) break;
  }
  return distances[position.y * 10 + position.x];
}

function pathTo(x, y) {
  const path = [{ x: 0, y: 5 }];
  let row = 5;
  while (row !== y) { row += Math.sign(y - row); path.push({ x: 0, y: row }); }
  for (let column = 1; column <= x; column++) path.push({ x: column, y });
  return path;
}

function guidePoints(section) {
  const value = section.querySelector('[data-rp-guide]')?.getAttribute('points');
  return value ? value.split(' ').map(p => { const [x, y] = p.split(',').map(Number); return { x: (x - 58) / 56, y: (y - 58) / 56 }; }) : [];
}

describe('Mars Rover Pathfinder route planning and controls', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  it.each([
    ['open', terrain(() => 0)],
    ['steep', terrain(() => 3)],
    ['mixed', terrain((x, y) => (3 * x + 2 * y) % 4)],
  ].flatMap(([name, map]) => [[0, 5], [0, 0], [4, 3], [8, 9], [9, 5]].map(([x, y]) => [name, map, x, y])))(
    'computes a valid minimum-energy guide on %s terrain from %s / %s / %s', (_name, map, x, y) => {
      const position = { x, y };
      const env = renderRover({ roverTerrain: map, roverPath: pathTo(x, y), roverFuel: 30, roverRouteGuide: true });
      expect(+env.section.dataset.rpCost).toBe(referenceCost(map, position));
      expect(env.writes).toBe(0);
      const route = guidePoints(env.section);
      if (x === 9 && y === 5) { expect(route).toEqual([]); return; }
      expect(route[0]).toEqual(position);
      expect(route.at(-1)).toEqual({ x: 9, y: 5 });
      let total = 0;
      route.forEach((point, i) => {
        expect(Number.isInteger(point.x) && Number.isInteger(point.y)).toBe(true);
        expect(point.x >= 0 && point.x < 10 && point.y >= 0 && point.y < 10).toBe(true);
        if (i) {
          expect(Math.abs(point.x - route[i - 1].x) + Math.abs(point.y - route[i - 1].y)).toBe(1);
          total += COSTS[map[point.y][point.x]];
        }
      });
      expect(total).toBe(referenceCost(map, position));
    }
  );

  it('starts with a reachable fixed terrain, a clear budget and labeled move costs', () => {
    const env = renderRover();
    expect(env.section.dataset.rpPosition).toBe('A6');
    expect(+env.section.dataset.rpFuel).toBe(30);
    expect(+env.section.dataset.rpCost).toBe(11);
    expect(env.section.querySelectorAll('[data-rp-cell]')).toHaveLength(100);
    expect(env.section.querySelector(direction('west')).disabled).toBe(true);
    expect(env.section.querySelector(direction('north')).getAttribute('aria-label')).toMatch(/A5.*2 energy/);
    expect(env.section.querySelector('[data-rp-map-control]').tabIndex).toBe(0);
    expect(env.section.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('charges the entered terrain and undo refunds its exact cost', () => {
    const env = renderRover();
    env.invoke(direction('east')); env.invoke(direction('east')); env.invoke(direction('east'));
    expect(env.state.roverPath.at(-1)).toEqual({ x: 3, y: 5 });
    expect(env.state.roverFuel).toBe(25);
    env.invoke(action('undo'));
    expect(env.state.roverPath.at(-1)).toEqual({ x: 2, y: 5 });
    expect(env.state.roverFuel).toBe(28);
    env.invoke(action('undo')); env.invoke(action('undo'));
    expect(env.state.roverPath).toEqual([{ x: 0, y: 5 }]);
    expect(env.state.roverFuel).toBe(30);
    expect(env.section.querySelector(action('undo')).disabled).toBe(true);
  });

  it('does not move beyond an edge or spend more energy than remains', () => {
    const env = renderRover({ roverFuel: 1 });
    env.invoke(direction('west')); env.invoke(direction('north'));
    expect(env.state.roverPath).toBeUndefined();
    expect(env.state.roverFuel).toBe(1);
    env.invoke(direction('east'));
    expect(env.state.roverFuel).toBe(0);
    expect(env.state.roverPath.at(-1)).toEqual({ x: 1, y: 5 });
    for (const key of ['north', 'west', 'east', 'south']) {
      expect(env.section.querySelector(direction(key)).disabled).toBe(true);
      env.invoke(direction(key));
    }
    expect(env.state.roverFuel).toBe(0);
    expect(env.state.roverPath).toHaveLength(2);
    expect(env.section.querySelector('[role="status"]').textContent).toMatch(/Undo a detour or restart/);
  });

  it('finishes the default traverse and blocks further movement until undo or reset', () => {
    const env = renderRover();
    for (let i = 0; i < 9; i++) env.invoke(direction('east'));
    expect(env.section.dataset.rpReached).toBe('true');
    expect(env.state.roverFuel).toBe(19);
    expect(+env.section.dataset.rpCost).toBe(0);
    expect(env.section.querySelector('[role="status"]').textContent).toMatch(/9 moves with 19 energy/);
    for (const key of ['north', 'west', 'east', 'south']) env.invoke(direction(key));
    expect(env.state.roverPath).toHaveLength(10);
    env.invoke(action('undo'));
    expect(env.section.dataset.rpReached).toBe('false');
    expect(env.state.roverFuel).toBe(20);
  });

  it('keeps keyboard driving scoped to a focusable map and ignores repeats and modifier shortcuts', () => {
    const env = renderRover();
    const preventDefault = vi.fn();
    env.invoke('[data-rp-map-control]', { key: 'w', preventDefault });
    expect(env.section.dataset.rpPosition).toBe('A5');
    expect(env.state.roverFuel).toBe(28);
    env.invoke('[data-rp-map-control]', { key: 'ArrowDown', preventDefault });
    expect(env.section.dataset.rpPosition).toBe('A6');
    expect(env.state.roverFuel).toBe(27);
    env.invoke('[data-rp-map-control]', { key: 'd', repeat: true, preventDefault });
    env.invoke('[data-rp-map-control]', { key: 'd', ctrlKey: true, preventDefault });
    env.invoke('[data-rp-map-control]', { key: 'Tab', preventDefault });
    expect(env.section.dataset.rpPosition).toBe('A6');
    expect(env.state.roverFuel).toBe(27);
    expect(preventDefault).toHaveBeenCalledTimes(3);
  });

  it('keeps compact touch controls in sync with entry costs, undo and both movement locks', () => {
    const touch = key => '[data-rp-touch-direction="' + key + '"]';
    const env = renderRover();
    env.invoke(touch('north'));
    expect(env.section.dataset.rpPosition).toBe('A5');
    expect(env.state.roverFuel).toBe(28);
    env.invoke(touch('east'));
    expect(env.section.dataset.rpPosition).toBe('B5');
    expect(env.state.roverFuel).toBe(27);
    env.invoke(action('undo'));
    expect(env.section.dataset.rpPosition).toBe('A5');
    expect(env.state.roverFuel).toBe(28);
    env.invoke(action('undo'));
    expect(env.section.dataset.rpPosition).toBe('A6');
    expect(env.state.roverFuel).toBe(30);

    for (let i = 0; i < 9; i++) env.invoke(touch('east'));
    expect(env.section.dataset.rpReached).toBe('true');
    const completed = JSON.stringify(env.state.roverPath);
    for (const key of ['north', 'west', 'east', 'south']) {
      for (const selector of [touch(key), direction(key)]) {
        expect(env.section.querySelector(selector).disabled).toBe(true);
        env.invoke(selector);
      }
    }
    expect(JSON.stringify(env.state.roverPath)).toBe(completed);
    expect(env.state.roverFuel).toBe(19);

    const empty = renderRover({ roverFuel: 0 });
    for (const key of ['north', 'west', 'east', 'south']) {
      for (const selector of [touch(key), direction(key)]) {
        expect(empty.section.querySelector(selector).disabled).toBe(true);
        empty.invoke(selector);
      }
    }
    expect(empty.state.roverPath).toBeUndefined();
    expect(empty.state.roverFuel).toBe(0);
  });

  it('keeps route guidance optional and does not spend energy by showing it', () => {
    const env = renderRover();
    expect(env.section.querySelector('[data-rp-guide]')).toBeNull();
    env.invoke(action('guide'));
    expect(env.state.roverRouteGuide).toBe(true);
    expect(guidePoints(env.section)).toHaveLength(10);
    expect(env.state.roverFuel).toBeUndefined();
    expect(env.state.roverPath).toBeUndefined();
    env.invoke(action('guide'));
    expect(env.section.querySelector('[data-rp-guide]')).toBeNull();
  });

  it('resets the route and budget while preserving custom terrain and unrelated saved simulations', () => {
    const map = terrain((x, y) => (x + y) % 4);
    const env = renderRover({ roverTerrain: map, roverPath: pathTo(3, 5), roverFuel: 22, roverRouteGuide: true,
      droneSpeed: 9, magStr: 35, cmeSpeedKmS: 800, gravWellMass: 1.5 });
    env.invoke(action('reset'));
    expect(env.state.roverPath).toEqual([{ x: 0, y: 5 }]);
    expect(env.state.roverFuel).toBe(30);
    expect(env.state.roverTerrain).toEqual(map);
    expect(env.state.roverRouteGuide).toBe(true);
    expect([env.state.droneSpeed, env.state.magStr, env.state.cmeSpeedKmS, env.state.gravWellMass]).toEqual([9, 35, 800, 1.5]);
  });

  it('preserves valid legacy state on render and clamps undo to the starting energy budget', () => {
    const map = terrain(() => 3), path = pathTo(1, 5);
    const env = renderRover({ roverTerrain: map, roverPath: path, roverFuel: 29 });
    expect(env.writes).toBe(0);
    expect(env.state.roverTerrain).toEqual(map);
    expect(env.state.roverPath).toEqual(path);
    expect(env.state.roverFuel).toBe(29);
    env.invoke(action('undo'));
    expect(env.state.roverFuel).toBe(30);
  });

  it.each([
    { roverPath: [] },
    { roverPath: [{ x: 3, y: 4 }] },
    { roverPath: [{ x: 0, y: 5 }, { x: 9, y: 5 }] },
    { roverPath: [{ x: 0, y: 5 }, null] },
    { roverPath: new Array(2) },
    { roverTerrain: [[0]] },
    { roverTerrain: new Array(10) },
    { roverTerrain: terrain(() => '0') },
    { roverFuel: '7' },
    { roverFuel: NaN },
  ])('normalizes invalid restored state without rewriting it: %j', seed => {
    const env = renderRover(seed);
    expect(env.writes).toBe(0);
    expect(env.section.dataset.rpPosition).toBe('A6');
    expect(+env.section.dataset.rpFuel).toBe(30);
    expect(+env.section.dataset.rpCost).toBe(11);
    for (const [key, value] of Object.entries(seed)) expect(env.state[key]).toEqual(value);
  });

  it('explains the abstract budget and allows collapse without losing the saved traverse', () => {
    const env = renderRover({ roverPath: pathTo(2, 5), roverFuel: 28 });
    expect(env.section.textContent).toMatch(/abstract energy budget/);
    expect(env.section.textContent).toMatch(/Cells have no physical distance/);
    expect(env.section.textContent).toMatch(/costs are game rules/);
    env.invoke('[aria-label="Toggle Mars Rover Pathfinder"]');
    expect(env.section.querySelector('#solar-rp-content').hidden).toBe(true);
    expect(env.state.roverPath).toEqual(pathTo(2, 5));
    expect(env.state.roverFuel).toBe(28);
    env.invoke('[aria-label="Toggle Mars Rover Pathfinder"]');
    expect(env.section.dataset.rpPosition).toBe('C6');
    expect(env.section.querySelector('#solar-rp-content').hidden).toBe(false);
  });
});
