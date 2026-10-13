import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, SETTLE_PASSES, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function cometTree(tree) {
  let panel;
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!React.isValidElement(node)) return;
    if (node.props.id === 'solar-comet-tails') { panel = node; return; }
    React.Children.forEach(node.props.children, visit);
  }
  visit(tree); return panel || React.createElement(React.Fragment);
}

function renderComet(seed = {}) {
  const store = newStore({ solarSystem: { tutorialDismissed: true, solarMissionDashboardOpen: false,
    selectedPlanet: 'Earth', viewTab: 'overview', orreryMode: false, paused: true,
    showComet: true, journalEntries: [], missionLog: [], ...seed } });
  const config = window.StemLab._registry.solarSystem;
  let callbacks, writes;
  const callbackReact = { ...React, createElement(type, props, ...children) {
    if (type === 'style') return null;
    const callback = type === 'button' ? props?.onClick : type === 'input' ? props?.onChange : null;
    if (typeof callback === 'function') {
      const id = String(callbacks.size); callbacks.set(id, callback);
      return React.createElement(type, { ...props, 'data-comet-test-callback': id }, ...children);
    }
    return React.createElement(type, props, ...children);
  } };
  function render() {
    writes = 0;
    for (let pass = 0; pass < SETTLE_PASSES; pass++) {
      store.dirty = false; callbacks = new Map();
      const ctx = makeCtx({ React: callbackReact, t: (key, fallback) => {
        const world = ['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'].find(w => key === 'stem.solar_sys.' + w.toLowerCase());
        return world || fallback || key;
      } }, store), original = ctx.setToolData;
      ctx.setToolData = updater => { writes++; original(updater); };
      document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(() => cometTree(config.render(ctx))));
      if (!store.dirty) break;
    }
  }
  render();
  return { get section() { return document.getElementById('solar-comet-tails'); },
    get state() { return store.toolData.solarSystem; }, get writes() { return writes; },
    invoke(selector, value) { const control = this.section.querySelector(selector); callbacks.get(control.dataset.cometTestCallback)({ target: { value: String(value) } }); render(); },
    render,
  };
}

describe('Comet tails: Sun-relative direction and distance', () => {
  beforeEach(() => {
    resetStemLab(); loadTool('stem_lab/stem_tool_solarsystem.js', 'solarSystem');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  function geometry(section) {
    const sun = section.querySelector('[data-comet-sun]'), comet = section.querySelector('[data-comet-nucleus]'), ion = section.querySelector('[data-comet-ion]'), arrow = section.querySelector('[data-comet-arrow=motion]');
    const x = Number(comet.getAttribute('cx')), y = Number(comet.getAttribute('cy'));
    return { x, y, outward: [x - Number(sun.getAttribute('cx')), y - Number(sun.getAttribute('cy'))],
      tail: [Number(ion.getAttribute('x2')) - x, Number(ion.getAttribute('y2')) - y],
      movement: [Number(arrow.getAttribute('x2')) - Number(arrow.getAttribute('x1')), Number(arrow.getAttribute('y2')) - Number(arrow.getAttribute('y1'))],
      spine: section.querySelector('[data-comet-dust-spine]').getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number),
    };
  }

  it.each([0,30,90,135,180,225,270,315,360])('keeps the ion tail outward and nonzero at %s°, even when motion reverses', cometAngle => {
    const env = renderComet({ cometAngle, cometDist: 50, cometMotion: 1 });
    const original = geometry(env.section);
    const dot = (a,b) => a[0]*b[0]+a[1]*b[1], cross = (a,b) => a[0]*b[1]-a[1]*b[0];
    for (const direction of [1,-1]) {
      env.invoke('[data-comet-motion-preset="'+direction+'"]');
      const g = geometry(env.section), radial = g.outward.map(v=>v/Math.hypot(...g.outward));
      expect(Math.hypot(...g.tail)).toBeGreaterThan(40);
      expect(dot(g.tail,radial)).toBeCloseTo(Math.hypot(...g.tail), 10);
      expect(cross(g.tail,radial)).toBeCloseTo(0, 10);
      expect(dot(g.movement,radial)).toBeCloseTo(0, 10);
      expect(g.tail).toEqual(original.tail); expect([g.x,g.y]).toEqual([original.x,original.y]);
      expect(g.movement[0]).toBeCloseTo(original.movement[0]*direction, 10);
      expect(g.movement[1]).toBeCloseTo(original.movement[1]*direction, 10);
      // Actual Bezier control points lie outward and behind the example motion.
      for (let index=2; index<g.spine.length; index+=2) {
        const offset=[g.spine[index]-g.x,g.spine[index+1]-g.y];
        expect(dot(offset,radial)).toBeGreaterThan(0);
        expect(dot(offset,g.movement)).toBeLessThan(0);
        const previous=[original.spine[index]-g.x,original.spine[index+1]-g.y];
        expect(dot(offset,radial)).toBeCloseTo(dot(previous,radial), 10);
        expect(cross(offset,radial)).toBeCloseTo(cross(previous,radial)*direction, 10);
      }
    }
    expect(env.section.querySelectorAll('svg text')).toHaveLength(0); expect(env.writes).toBe(0);
  });

  it.each([[10,.5,4],[20,1,1],[40,2,.25],[50,2.5,.16],[100,5,.04]])('converts saved distance %s to %s AU and calculates sunlight without a tail cutoff', (cometDist, au, expected) => {
    const env = renderComet({ cometDist });
    expect(Number(env.section.dataset.cometDistance)).toBe(au);
    expect(Number(env.section.querySelector('[data-comet-sunlight]').dataset.cometSunlight)).toBeCloseTo(expected,12);
    expect(env.section.querySelector('#solar-comet-distance').getAttribute('aria-valuetext')).toContain(au.toFixed(2)+' astronomical units');
    expect(env.section.querySelector('[data-comet-ion]')).toBeTruthy(); expect(env.section.querySelector('[data-comet-dust-fan]')).toBeTruthy();
    expect(env.state.cometDist).toBe(cometDist); expect(env.writes).toBe(0);
  });

  it.each([[NaN,50,90],[Infinity,50,90],[-5,10,0],[900,100,360],['30',50,90],[null,50,90]])('bounds restored controls %s for display without changing saved values', (raw, distance, angle) => {
    const env=renderComet({cometDist:raw,cometAngle:raw,cometMotion:'invalid'});
    expect(Number(env.section.dataset.cometDistance)).toBe(distance*.05);expect(Number(env.section.dataset.cometAngle)).toBe(angle);
    expect(env.section.dataset.cometMotion).toBe('1');expect(env.state.cometMotion).toBe('invalid');
    expect(env.state.cometDist).toBe(raw);expect(env.state.cometAngle).toBe(raw);expect(env.writes).toBe(0);
  });

  it('changes geometry with distance and keeps accurate minimum and maximum sunlight values', () => {
    const env=renderComet({cometDist:10});const near=geometry(env.section);
    env.invoke('[data-comet-distance-preset="100"]');const far=geometry(env.section);
    expect(Math.hypot(...far.outward)).toBeGreaterThan(Math.hypot(...near.outward));
    expect(Math.hypot(...far.tail)).toBeLessThan(Math.hypot(...near.tail));
    expect(Number(env.section.querySelector('[data-comet-sunlight]').dataset.cometSunlight)).toBe(.04);
    expect(env.section.textContent).toContain('Distance is compressed');
  });

  it('preserves all authored work and other simulations through native controls and collapse', () => {
    const env=renderComet({cometDist:50,cometAngle:90,cometMotion:1,raceTime:12,cobEcc:.85,selectedPlanet:'Mars',journalEntries:[{observation:'Keep my evidence.'}],journalDrafts:{Earth:{observation:'Keep my draft.'}},signalNotebooks:{Mars:{explanation:'Keep my notes.'}},gravMass:81});
    const before={...env.state};env.invoke('[data-comet-angle-preset="270"]');expect(env.state).toEqual({...before,cometAngle:270});
    env.invoke('[data-comet-distance-preset="20"]');expect(env.state).toEqual({...before,cometAngle:270,cometDist:20});
    env.invoke('[data-comet-motion-preset="-1"]');const updated={...before,cometAngle:270,cometDist:20,cometMotion:-1};expect(env.state).toEqual(updated);
    env.invoke('#solar-comet-angle','invalid');expect(env.state).toEqual(updated);
    const toggle='[aria-controls=solar-comet-content]';env.invoke(toggle);expect(env.section.querySelector('#solar-comet-content').hidden).toBe(true);expect(env.section.querySelectorAll('svg')).toHaveLength(0);
    env.invoke(toggle);expect(env.state).toEqual(updated);expect(env.section.querySelector('#solar-comet-content').hidden).toBe(false);
  });

  it('keeps endpoint selection and accessible descriptions consistent with the model', () => {
    const env=renderComet({cometAngle:360});
    expect(env.section.querySelector('[data-comet-angle-preset="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(env.section.querySelector('[data-comet-direction]').textContent).toContain('0°');
    for (const key of ['aria-labelledby','aria-describedby']) for (const id of env.section.querySelector('svg').getAttribute(key).split(' ')) expect(document.getElementById(id)).toBeTruthy();
    expect(env.section.textContent).toContain('not elapsed time');expect(env.section.textContent).toContain('not how bright the comet looks');
    expect(env.section.textContent).toContain('no universal distance');expect(env.section.textContent).not.toContain('Dormant');
    expect(env.section.querySelector('[aria-label="Wind angle (°)"]')).toBeNull();
  });
});
