#!/usr/bin/env node
/*
 * check_module_render.cjs — render-smoke for NON-STEM CDN view modules.
 *
 * Companion to check_stem_render.cjs. STEM tools share one ctx contract so they can be
 * smoked generically; the other CDN modules each export bespoke components with bespoke
 * props, and many exports are helpers (createX) not components — so "render every export"
 * would false-positive. Instead this is a CURATED, extensible config: per module, name
 * the real entry-point components + the props that drive them to a real render. A throw
 * = a render-phase crash (the class static gates miss: bare `t`, undefined.map, etc. —
 * e.g. the 2026-06-05 annotation Toolbar `t is not defined` crash).
 *
 * Deeply-stateful modules (word_sounds, symbol_studio, behavior_lens) already have
 * golden-master harnesses run by `npm test`, so they are intentionally NOT duplicated here.
 *
 * SSR-only (render phase, not effects). Skips gracefully if React/jsdom are absent.
 * Usage:  node dev-tools/check_module_render.cjs [--quiet]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, 'prismflow-deploy', 'node_modules');
const QUIET = process.argv.includes('--quiet');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES_DIR, 'jsdom')).JSDOM;
  React = require(path.join(MODULES_DIR, 'react'));
  RDS = require(path.join(MODULES_DIR, 'react-dom', 'server'));
} catch (e) {
  console.warn('[check_module_render] SKIPPED — React/jsdom not found at ' + MODULES_DIR + ' (' + e.message + ')');
  process.exit(0);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true });
function setGlobal(k, v) {
  try { global[k] = v; } catch (e) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {} }
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('getComputedStyle', dom.window.getComputedStyle);

const noop = function () {};
const t = function (k) { return k; };
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
setGlobal('React', React);
dom.window.React = React;
dom.window.AlloIcons = iconsProxy;
dom.window.AlloModules = dom.window.AlloModules || {};
if (typeof dom.window.matchMedia !== 'function') {
  dom.window.matchMedia = function () { return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }; };
}

// Sample annotations covering every Overlay node kind (sticker/note/highlight/voice/draw).
const ANNS = [
  { id: 's1', type: 'sticker', kind: 'sticker', stickerType: 'star', x: 10, y: 10, author: 'teacher', authorName: 'T' },
  { id: 'n1', type: 'note', kind: 'note', content: 'hi', x: 10, y: 10, color: 'yellow', author: 'teacher', authorName: 'T' },
  { id: 'h1', type: 'highlight', kind: 'highlight', color: 'yellow', rects: [{ x: 0, y: 0, width: 10, height: 10 }], x: 0, y: 0, width: 10, height: 10, author: 'teacher', authorName: 'T' },
  { id: 'v1', type: 'voice', kind: 'voice', x: 10, y: 10, audioData: 'data:audio/webm;base64,AA==', durationSec: 3, author: 'teacher', authorName: 'T' },
  { id: 'd1', type: 'draw', kind: 'draw', color: 'red', width: 4, shape: 'free', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], path: 'M0,0 L5,5', author: 'teacher', authorName: 'T' },
];

// Curated config: each entry names a module file, its window.AlloModules key, and a
// function returning [label, reactElement] pairs to render. Add modules here over time.
const CONFIG = [
  {
    file: 'annotation_suite_module.js',
    key: 'AnnotationSuite',
    renders: function (M) {
      return [
        ['Toolbar(note,teacher)', React.createElement(M.Toolbar, { t: t, mode: 'note', isTeacher: true })],
        ['Toolbar(sticker,student)', React.createElement(M.Toolbar, { t: t, mode: 'sticker', isTeacher: false })],
        ['Toolbar(no-props)', React.createElement(M.Toolbar, {})], // worst case: host didn't thread t
        ['Overlay(all-kinds)', React.createElement(M.Overlay, {
          annotations: ANNS, mode: 'off', isTeacher: true,
          onNoteChange: noop, onNoteDelete: noop, onHighlightDelete: noop, onVoiceDelete: noop, onDrawDelete: noop, onMove: noop, t: t,
        })],
        ['Sidebar', React.createElement(M.Sidebar, { t: t, annotations: ANNS, isTeacher: true })],
      ];
    },
  },
];

let failures = 0;
let rendered = 0;
const missing = [];

CONFIG.forEach(function (entry) {
  const file = path.join(ROOT, entry.file);
  if (!fs.existsSync(file)) { missing.push(entry.file); return; }
  try {
    new Function(fs.readFileSync(file, 'utf8'))(); // eslint-disable-line no-new-func
  } catch (e) {
    failures++;
    console.error('✗ ' + entry.file + ' failed to LOAD: ' + ((e && e.message) || e));
    return;
  }
  const M = dom.window.AlloModules[entry.key];
  if (!M) {
    failures++;
    console.error('✗ ' + entry.file + ': window.AlloModules.' + entry.key + ' did not register');
    return;
  }
  let pairs;
  try { pairs = entry.renders(M); } catch (e) {
    failures++;
    console.error('✗ ' + entry.key + ': render config threw — ' + ((e && e.message) || e));
    return;
  }
  pairs.forEach(function (p) {
    const label = p[0], element = p[1];
    try {
      RDS.renderToStaticMarkup(React.createElement(function ModuleSmoke() { return element; }));
      rendered++;
    } catch (e) {
      failures++;
      console.error('✗ ' + entry.key + ' › ' + label + ': ' + ((e && e.message) || e));
    }
  });
});

if (!QUIET) {
  console.log('[check_module_render] ' + rendered + ' component render(s) across ' + CONFIG.length + ' module(s) OK');
}
if (missing.length && !QUIET) {
  console.warn('  (skipped missing files: ' + missing.join(', ') + ')');
}
if (failures > 0) {
  console.error('✗ check_module_render: ' + failures + ' non-STEM render failure(s).');
  process.exit(1);
}
console.log('✓ check_module_render: all curated non-STEM module renders pass (' + rendered + ' renders).');
