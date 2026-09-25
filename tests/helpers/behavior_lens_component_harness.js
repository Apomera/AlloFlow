// Runs one Behavior Lens component's REAL source with controlled hooks, so a test can
// read what it renders and call its handlers without a browser. Lifted from
// behavior_lens_measurement_flows.test.js so more suites can share it.
//
// The component is sliced from the module text (from "    const Name =" to the
// next "\n    };"), then evaluated with the globals it expects supplied through
// `env`. Anything the component references that is not in env throws a
// ReferenceError at render, which is how an undefined handler is caught.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect } from 'vitest';

let workspaceRuntime = null;
export function behaviorLensRuntime() {
  if (!workspaceRuntime) {
    if (!window.AlloModules || !window.AlloModules.BehaviorLensWorkspace) {
      new Function(readFileSync('behavior_lens_workspace_module.js', 'utf8'))();
    }
    workspaceRuntime = window.AlloModules.BehaviorLensWorkspace;
  }
  return workspaceRuntime;
}

// The module keeps its helpers (esc, fmtDate, the entry readers...) inside one IIFE.
// For tests, load a copy with a lookup inserted just before the IIFE closes; a
// direct eval there resolves any module-scope name, so a sliced component gets the
// REAL helpers rather than hand-written stand-ins. The shipped file is not changed.
const RESERVED = new Set(('break case catch class const continue debugger default delete do else enum export extends false finally for '
  + 'function if import in instanceof let new null return static super switch this throw true try typeof var void while with yield '
  + 'await implements interface package private protected public undefined NaN Infinity arguments eval async of get set').split(' '));
let internals = null;
export function behaviorLensInternals() {
  if (internals) return internals;
  behaviorLensRuntime();
  // The module reads React's hooks at load; supply the app's React if a suite has not.
  if (!globalThis.React) {
    const React = createRequire(import.meta.url)(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
    globalThis.React = React;
    if (typeof window !== 'undefined') window.React = React;
  }
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  const close = source.lastIndexOf('})();');
  if (close < 0) throw new Error('behavior_lens_module.js no longer ends in an IIFE');
  const probe = '\n    window.__blInternalsForTests = function (name) { try { return eval(name); } catch (e) { return undefined; } };\n';
  window.AlloModules = window.AlloModules || {};
  const registered = window.AlloModules.BehaviorLens;
  delete window.AlloModules.BehaviorLens; // the module returns early when already registered
  try { new Function(source.slice(0, close) + probe + source.slice(close))(); }
  finally { if (registered) window.AlloModules.BehaviorLens = registered; }
  internals = window.__blInternalsForTests;
  delete window.__blInternalsForTests;
  if (typeof internals !== 'function') throw new Error('Behavior Lens internals lookup did not install');
  return internals;
}

export function componentSource(name, source = readFileSync('behavior_lens_module.js', 'utf8')) {
  const start = source.indexOf('    const ' + name + ' =');
  if (start < 0) throw new Error('component not found: ' + name);
  const end = source.indexOf('\n    };', start) + '\n    };'.length;
  return source.slice(start, end);
}

export function componentHarness(name, props, extraEnv = {}) {
  const runtime = behaviorLensRuntime();
  const slots = []; let cursor = 0; const effects = new Map(); let tree; let nextId = 0;
  const equal = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  const useState = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
    if (!slots[index].setter) slots[index].setter = value => { slots[index].value = typeof value === 'function' ? value(slots[index].value) : value; };
    return [slots[index].value, slots[index].setter];
  };
  const useMemo = (factory, deps) => {
    const index = cursor++;
    if (!slots[index] || !equal(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
    return slots[index].value;
  };
  const useEffect = (effect, deps) => {
    const index = cursor++;
    if (!slots[index] || !equal(slots[index].deps, deps)) effects.set(index, effect);
    slots[index] = { deps };
  };
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false && child !== '') });
  // extraEnv.__durable seeds persisted tool state by key (what a returning user has).
  const durable = extraEnv.__durable || {};
  // extraEnv.__durableLog, an array, receives [key, value] for every persisted write.
  const durableLog = extraEnv.__durableLog || null;
  extraEnv = Object.assign({}, extraEnv); delete extraEnv.__durable; delete extraEnv.__durableLog;
  const env = Object.assign({
    h, useState, useMemo, useEffect,
    useCallback: (callback, deps) => useMemo(() => callback, deps),
    useRef: initial => useState(() => ({ current: initial }))[0],
    useDurableToolState: (key, initial) => {
      const [value, set] = useState(() => (key in durable ? durable[key] : (typeof initial === 'function' ? initial() : initial)));
      if (!durableLog) return [value, set];
      return [value, next => { set(next); durableLog.push([key, typeof next === 'function' ? next(value) : next]); }];
    },
    tt: (key, fallback, params) => {
      let s = fallback;
      if (params && typeof s === 'string') Object.keys(params).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); });
      return s;
    },
    getBehaviorLensWorkspaceRuntime: () => runtime,
    uid: () => 'test-' + (++nextId),
    InfoTooltip: 'span',
  }, extraEnv);
  const body = componentSource(name);
  // Fill every other module-scope name the component uses with the real one.
  const lookup = behaviorLensInternals();
  for (const id of new Set(body.match(/\b[A-Za-z_$][\w$]*\b/g) || [])) {
    if (id === name || id in env || RESERVED.has(id)) continue;
    const value = lookup(id);
    if (value !== undefined && value !== globalThis[id]) env[id] = value;
  }
  const component = new Function(...Object.keys(env), body + '\nreturn ' + name)(...Object.values(env));
  const cleanups = [];
  const render = (runEffects = false) => {
    cursor = 0; tree = component(props);
    if (runEffects) {
      const pending = [...effects.values()]; effects.clear();
      pending.forEach(effect => { const c = effect(); if (typeof c === 'function') cleanups.push(c); });
    }
    return tree;
  };
  const all = (predicate, node = tree, result = []) => { if (node && typeof node === 'object') { if (predicate(node)) result.push(node); node.children.forEach(child => all(predicate, child, result)); } return result; };
  const text = (node = tree) => node && typeof node === 'object' ? node.children.map(text).join('') : String(node ?? '');
  const byAttr = (attr, value) => all(node => node.props[attr] === value);
  const button = value => { const node = all(node => node.type === 'button' && (text(node).includes(value) || node.props['aria-label'] === value))[0]; expect(node, value).toBeTruthy(); return node; };
  const dispose = () => { while (cleanups.length) cleanups.pop()(); };
  render();
  return { render, all, text, byAttr, button, props, dispose, get tree() { return tree; } };
}
