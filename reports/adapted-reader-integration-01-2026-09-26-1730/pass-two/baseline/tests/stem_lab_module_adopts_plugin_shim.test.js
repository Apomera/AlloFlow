// @vitest-environment jsdom
//
// stem_lab_module.js can run AFTER a plugin. The shell deep link (?tool=solarSystem)
// requests the plugin the moment the app is ready, while the module sits in the
// deferred module pump, so on a cold load the plugin executes first and installs
// the six-method registry shim most plugins carry. Until 2026-09-10 the module
// kept that shim untouched ("if (!window.StemLab)"), so the whole session ran
// without ensureThree / loadScriptResilient / setupHiDPI and every 3D tool opened
// from a shared link reported that the 3D engine could not load. Measured on the
// live app, then reproduced offline in Chromium in both orders.
//
// The module needs a little of the host to boot; this gives it React and the
// globals it reads at load time, nothing more.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const MODULE = readFileSync(resolve(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
const REACT = readFileSync(resolve(ROOT, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');

function bootHost() {
  window.AlloModules = {}; // fresh per test: the module dedups on AlloModules.StemLab and would return early
  window.__alloT = (k, fb) => fb || k;
  new Function(REACT)();
  window.React = window.React || globalThis.React;
}

function runModule() {
  try { new Function(MODULE)(); }
  catch (e) { throw new Error('stem_lab_module.js threw at load: ' + (e && e.message)); }
}

const SHIM_PLUGIN = () => {
  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) { config.id = id; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    getRegisteredTools: function () { var s = this; return this._order.map(function (id) { return s._registry[id]; }); },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function () { return null; },
  };
  window.StemLab.registerTool('earlyTool', { label: 'Early Tool', icon: 'x', desc: 'registered before the module', render: function () { return null; } });
};

describe('stem_lab_module.js adopts a plugin shim that got there first', () => {
  it('module after shim: the full object replaces the shim and keeps the early registration', () => {
    delete window.StemLab;
    bootHost();
    SHIM_PLUGIN();
    expect(typeof window.StemLab.ensureThree).toBe('undefined');
    runModule();
    expect(typeof window.StemLab.ensureThree, 'ensureThree present after the module').toBe('function');
    expect(typeof window.StemLab.loadScriptResilient).toBe('function');
    expect(typeof window.StemLab.setupHiDPI).toBe('function');
    expect(window.StemLab.isRegistered('earlyTool'), 'early registration adopted').toBe(true);
    // Re-registered through the real registerTool, so it carries the same
    // defaults as a tool that arrived later.
    expect(window.StemLab._registry.earlyTool.category).toBe('general');
    expect(window.StemLab._order).toContain('earlyTool');
  });

  it('module first: a later plugin registers into the full object, unchanged behaviour', () => {
    delete window.StemLab;
    bootHost();
    runModule();
    const full = window.StemLab;
    SHIM_PLUGIN();
    expect(window.StemLab, 'the plugin must not replace the full object').toBe(full);
    expect(window.StemLab.isRegistered('earlyTool')).toBe(true);
    expect(typeof window.StemLab.ensureThree).toBe('function');
  });

  it('running the module twice does not rebuild the object or drop registrations', () => {
    delete window.StemLab;
    bootHost();
    runModule();
    SHIM_PLUGIN();
    const full = window.StemLab;
    runModule();
    expect(window.StemLab).toBe(full);
    expect(window.StemLab.isRegistered('earlyTool')).toBe(true);
  });
});
