// Geometry World home chooser lifecycle.
//
// THE BUG: the entry effect bailed on `worldActive || showLessonIntro ||
// d._introShownOnce`. Both worldActive and _introShownOnce persist in toolData,
// so once either had been saved the home chooser never showed again: a returning
// user went straight into whatever world was last open with no Continue, no
// Learn/Build/Explore/Create, and no way back except the menu. The chooser had
// silently become a first-visit-only intro.
//
// These mount the real tool with react-dom/client (same recipe as
// geometry_world_engine_lifecycle.test.js) with the builder enhancement loaded,
// so the actual effect runs against the actual toolData it will see in the app.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const BUILDER = 'stem_lab/stem_tool_geometryworld_builder.js';
const ENGINE_KEY = '__geoWorldEngine';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
     'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round',
     'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach(function (m) { v[m] = function () { return v; }; });
    v.clone = function () { return vec(); };
    v.distanceTo = function () { return 99; };
    v.length = function () { return 1; };
    v.lengthSq = function () { return 1; };
    v.dot = function () { return 0; };
    v.toArray = function () { return [0, 0, 0]; };
    return v;
  }
  return new Proxy({}, {
    get: function (_t, prop) {
      if (prop === 'SRGBColorSpace') return 'srgb';
      if (prop === Symbol.toPrimitive || typeof prop === 'symbol') return undefined;
      return function () { return vec(); };
    },
  });
}

function makeFakeEngine() {
  const canvas = document.createElement('canvas');
  const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
  return {
    clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } },
    renderer: { dispose() {}, domElement: canvas },
    camera: { position: v(), quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt() {}, up: v() },
    blocks: {}, npcs: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [],
    moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
    isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null,
    loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 },
    logEvent() {}, geometryHomeLessons: [],
  };
}

function mountTool(cfg, bucket) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;
  const ctx = makeCtx({
    toolData: toolData,
    update: function (b, key, val) { toolData[b] = Object.assign({}, toolData[b], { [key]: val }); if (bump) bump(); },
    updateMulti: function (b, patch) { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); },
  });
  const Comp = function () {
    const st = React.useState(0);
    bump = function () { st[1](function (n) { return n + 1; }); };
    return cfg.render(ctx);
  };
  const root = ReactDOMClient.createRoot(container);
  React.act(function () { root.render(React.createElement(Comp)); });
  return {
    container, toolData,
    bucket: () => toolData.geometryWorld,
    rerender: () => React.act(function () { bump(); }),
    set: (patch) => React.act(function () { ctx.updateMulti('geometryWorld', patch); }),
    unmount: () => { React.act(function () { root.unmount(); }); container.remove(); },
  };
}

describe('Geometry World home chooser lifecycle', () => {
  let cfg;

  beforeAll(() => {
    resetStemLab();
    window.THREE = makeThreeStub();
    cfg = loadTool(FILE, 'geometryWorld');
    // the builder enhancement registers geometryWorldBuilderPure and wraps render
    new Function(readFileSync(BUILDER, 'utf8'))();
    if (!window.StemLab.geometryWorldBuilderPure) throw new Error('builder enhancement did not register');
    cfg = window.StemLab._registry.geometryWorld;
  });

  beforeEach(() => {
    window.THREE = makeThreeStub();
    window[ENGINE_KEY] = makeFakeEngine();
    delete window.__alloGeometryWorldPendingBuild;
    delete window.__alloGeometryWorldReturnProject;
    delete window.__alloGeometryWorldHomePresented;
  });

  afterEach(() => {
    delete window[ENGINE_KEY];
    delete window.__alloGeometryWorldPendingBuild;
    delete window.__alloGeometryWorldReturnProject;
    document.body.innerHTML = '';
  });

  it('THE REGRESSION: a returning user with _introShownOnce and a live world still gets the chooser, with Continue', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true, activeLesson: 'volumeExplorer' });
    m.rerender();
    const b = m.bucket();
    expect(b.showGeometryHome).toBe(true);
    // non-initial is what the builder reads to offer Continue
    expect(b._geometryHomeInitial).toBe(false);
    expect(b.geometryHomePage).toBe('start');
    const dialog = m.container.querySelector('.gwe-home[role="dialog"]');
    expect(dialog).toBeTruthy();
    const cont = Array.from(m.container.querySelectorAll('button.gwe-home-continue'));
    expect(cont.length).toBe(1);
    m.unmount();
  });

  it('a fresh user gets the initial chooser without Continue', () => {
    const m = mountTool(cfg, {});
    m.rerender();
    const b = m.bucket();
    expect(b.showGeometryHome).toBe(true);
    expect(b._geometryHomeInitial).toBe(true);
    expect(m.container.querySelector('button.gwe-home-continue')).toBeNull();
    m.unmount();
  });

  it('clears the old lesson intro overlay when the chooser opens', () => {
    const m = mountTool(cfg, { showLessonIntro: true, _introShownOnce: true, worldActive: true });
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(true);
    expect(m.bucket().showLessonIntro).toBe(false);
    m.unmount();
  });

  it('bypasses Home only for an explicit return, not a saved Print Lab backup', () => {
    window.__alloGeometryWorldPendingBuild = { projectId: 'p1' };
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    m.rerender();
    expect(m.bucket().showGeometryHome).not.toBe(true);
    m.unmount();

    delete window.__alloGeometryWorldPendingBuild;
    window.__alloGeometryWorldReturnProject = { id: 'p1' };
    const m2 = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    m2.rerender();
    expect(m2.bucket().showGeometryHome).toBe(true);
    m2.unmount();
  });

  it('does not reopen after the user dismisses it during the same mount', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(true);
    // the user continues into their world
    m.set({ showGeometryHome: false });
    m.rerender();
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(false);
    // and unrelated state churn does not bring it back
    m.set({ blocksPlaced: 3 });
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(false);
    m.unmount();
  });

  it('shows the chooser again on a fresh mount (the guard is per mount, not persisted)', () => {
    const m = mountTool(cfg, { _introShownOnce: true, worldActive: true });
    m.rerender();
    m.set({ showGeometryHome: false });
    m.rerender();
    const persisted = Object.assign({}, m.bucket());
    m.unmount();
    // a returning user's toolData, including showGeometryHome:false and _introShownOnce:true
    const m2 = mountTool(cfg, persisted);
    m2.rerender();
    expect(m2.bucket().showGeometryHome).toBe(true);
    expect(m2.bucket()._geometryHomeInitial).toBe(false);
    m2.unmount();
  });

  it('_introShownOnce alone never suppresses the chooser', () => {
    const m = mountTool(cfg, { _introShownOnce: true });
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(true);
    m.unmount();
  });

  it('falls back to the legacy lesson intro only when the builder enhancement is missing', () => {
    const pure = window.StemLab.geometryWorldBuilderPure;
    const wrapped = window.StemLab._registry.geometryWorld;
    try {
      delete window.StemLab.geometryWorldBuilderPure;
      // render the core tool (the builder wrapper would still call it, but the
      // effect keys on the pure API being absent)
      const m = mountTool(wrapped, {});
      m.rerender();
      expect(m.bucket().showGeometryHome).not.toBe(true);
      expect(m.bucket().showLessonIntro).toBe(true);
      expect(m.bucket()._introShownOnce).toBe(true);
      m.unmount();
      // and there, a user who has seen the intro is not shown it again
      const m2 = mountTool(wrapped, { _introShownOnce: true });
      m2.rerender();
      expect(m2.bucket().showLessonIntro).not.toBe(true);
      m2.unmount();
    } finally {
      window.StemLab.geometryWorldBuilderPure = pure;
    }
  });

  it('does not open Home after a pending return has been consumed', () => {
    window.__alloGeometryWorldPendingBuild = {projectId:'returning'};
    const m=mountTool(cfg,{worldActive:true,_introShownOnce:true});
    delete window.__alloGeometryWorldPendingBuild;
    m.set({worldActive:true,showGeometryHome:false});
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(false);
    m.unmount();
  });

  it('resets a persisted subpage and stale modal flags on a new visit', () => {
    const m=mountTool(cfg,{worldActive:true,showGeometryHome:true,geometryHomePage:'create',showGameSettings:true,showLessonIntro:true,creatorMode:true});
    expect(m.bucket().geometryHomePage).toBe('start');
    expect(m.bucket().showGameSettings).toBe(false);
    expect(m.bucket().showLessonIntro).toBe(false);
    expect(m.bucket().creatorMode).toBe(false);
    expect(m.container.querySelectorAll('.gwe-home-card')).toHaveLength(4);
    m.unmount();
  });

  it('upgrades a fallback intro when the enhancement becomes available', () => {
    const pure=window.StemLab.geometryWorldBuilderPure;
    let m;
    try {
      delete window.StemLab.geometryWorldBuilderPure;
      m=mountTool(cfg,{});
      expect(m.bucket().showLessonIntro).toBe(true);
      window.StemLab.geometryWorldBuilderPure=pure;
      m.rerender();
      expect(m.bucket().showGeometryHome).toBe(true);
      expect(m.bucket().showLessonIntro).toBe(false);
    } finally {window.StemLab.geometryWorldBuilderPure=pure;if(m)m.unmount();}
  });

  it('falls back to the main menu for an unknown saved page', () => {
    const m=mountTool(cfg,{worldActive:true});
    m.set({geometryHomePage:'obsolete-page'});
    expect(m.container.querySelectorAll('.gwe-home-card')).toHaveLength(4);
    expect(m.container.querySelector('nav[aria-label="Geometry World modes"]')).toBeTruthy();
    m.unmount();
  });

  it('returns keyboard focus to the mode used to enter a subpage', () => {
    const m=mountTool(cfg,{worldActive:true});
    React.act(()=>m.container.querySelector('[data-path="build"]').click());
    expect(m.bucket().geometryHomePage).toBe('build');
    React.act(()=>m.container.querySelector('.gwe-home-back').click());
    expect(document.activeElement).toBe(m.container.querySelector('[data-path="build"]'));
    m.unmount();
  });

  it('keeps Garden out of the lesson selector even when it was saved as the chosen lesson', () => {
    const m=mountTool(cfg,{worldActive:true,geometryHomeLesson:'geometryGarden'});
    React.act(()=>m.container.querySelector('[data-path="learn"]').click());
    const select=m.container.querySelector('#gwe-home-lesson');
    expect(select.value).not.toBe('geometryGarden');
    expect(select.value).not.toBe('');
    expect(m.container.querySelector('.gwe-home-preview h2').textContent).toBe(select.selectedOptions[0].textContent);
    m.unmount();
  });

  // Explore used to hold only the Garden. Skyline City (2026-09-24) is a second place;
  // Explore lists every lesson marked explore, and Learn lists none of them.
  it('Explore offers both places to wander, and Learn offers neither', () => {
    const m=mountTool(cfg,{worldActive:true});
    React.act(()=>m.container.querySelector('[data-path="explore"]').click());
    const place=id=>m.container.querySelector('[data-gwe-place="'+id+'"]');
    const enter=()=>[...m.container.querySelectorAll('.gwe-home-primary')].find(b=>/^Enter /.test(b.textContent));
    expect([...m.container.querySelectorAll('[data-gwe-place]')].map(b=>b.getAttribute('data-gwe-place'))).toEqual(['geometryGarden','skylineCity']);
    expect(m.container.querySelector('.gwe-home-place-picker').getAttribute('aria-label')).toBe('Choose a place');
    expect([place('geometryGarden').getAttribute('aria-pressed'),place('skylineCity').getAttribute('aria-pressed')]).toEqual(['true','false']);
    expect(enter().textContent).toBe('Enter Geometry Garden');
    React.act(()=>place('skylineCity').click());
    expect(m.bucket().geometryHomeExplore).toBe('skylineCity');
    expect([place('geometryGarden').getAttribute('aria-pressed'),place('skylineCity').getAttribute('aria-pressed')]).toEqual(['false','true']);
    expect(place('skylineCity').textContent).toContain('Towers, a bridge and a packing yard');
    expect(m.container.querySelector('.gwe-home-preview h2').textContent).toContain('Skyline City');
    expect(enter().textContent).toBe('Enter Skyline City');
    React.act(()=>enter().click());
    expect(m.bucket().activeLesson).toBe('skylineCity');
    m.unmount();
    window[ENGINE_KEY]=makeFakeEngine(); // unmounting disposes the engine
    const learn=mountTool(cfg,{worldActive:true});
    React.act(()=>learn.container.querySelector('[data-path="learn"]').click());
    const ids=[...learn.container.querySelectorAll('#gwe-home-lesson option')].map(o=>o.value);
    expect(ids).toContain('scaleUp');
    expect(ids.filter(id=>id==='geometryGarden'||id==='skylineCity')).toEqual([]);
    expect(learn.container.querySelector('[data-gwe-place]')).toBeNull();
    learn.unmount();
  });
});

// The chooser lives in the builder enhancement. The shell loads each STEM lab on demand, one script per tile,
// so a companion script must be declared as a dependency or it never loads: on the live app (measured
// 2026-09-14, build 2b2407ccf) only stem_tool_geometryworld.js was fetched, geometryWorldBuilderPure was never
// defined, and every user, first-time or returning, landed on the legacy "Volume Explorer" lesson intro.
describe('Geometry World home chooser reaches the live app', () => {
  it('the shell declares the builder as Geometry World\'s dependency in both copies', () => {
    for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const source = readFileSync(file, 'utf8');
      const map = source.indexOf('var stemModuleDependencies = {');
      expect(map, file).toBeGreaterThan(-1);
      const entry = source.indexOf("'stem_lab/stem_tool_geometryworld.js': ['stem_lab/stem_tool_geometryworld_builder.js']");
      expect(entry, file + ' lists the builder as a dependency').toBeGreaterThan(map);
      expect(entry - map, file + ' entry sits inside the map').toBeLessThan(2500);
    }
  });

  it('the builder wraps the tool the instant the core registers, even when it loads first (the dependency order)', () => {
    resetStemLab();
    window.THREE = makeThreeStub();
    // Dependency first: the builder finds no tool yet and must not wait for its 100 ms poll.
    new Function(readFileSync(BUILDER, 'utf8'))();
    expect(window.StemLab.isRegistered('geometryWorld')).toBe(false);
    expect(typeof window.StemLab.geometryWorldBuilderPure).toBe('object');
    loadTool(FILE, 'geometryWorld');
    const tool = window.StemLab._registry.geometryWorld;
    // Synchronously enhanced: the host mounts the tool as soon as it registers, and a render whose hook
    // count grows on a later re-render throws in React.
    expect(tool.__alloflowBuilderEnhanced).toBe(true);
    expect(tool.desc).toMatch(/free-build sandbox/);
    const m = mountTool(tool, { _introShownOnce: true, worldActive: true });
    m.rerender();
    expect(m.bucket().showGeometryHome).toBe(true);
    expect(m.container.querySelector('.gwe-home[role="dialog"]')).toBeTruthy();
    expect(m.container.querySelectorAll('button.gwe-home-continue').length).toBe(1);
    m.unmount();
  });
});
