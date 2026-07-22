#!/usr/bin/env node
/*
 * Render every registered STEM Lab plugin tool and audit common tool-level
 * UI/UX/accessibility risks in the generated markup.
 *
 * The STEM host has a broad after-mount safety net that can auto-label some
 * buttons, fields, and canvases. This audit intentionally still reports those
 * tool-level gaps as warnings so individual tools can be refined instead of
 * relying on generic fallback labels.
 *
 * Usage:
 *   node dev-tools/check_stem_a11y.cjs [--quiet] [--gate]
 *   node dev-tools/check_stem_a11y.cjs --write a11y-audit/stem.json --markdown a11y-audit/stem.md
 *
 * Default exit behavior: fail only on load/render errors. Use --gate to also
 * fail on high-confidence accessibility errors.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { hasLargeFixedWidth } = require('./stem_visual_overflow_heuristic.cjs');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'prismflow-deploy', 'node_modules');
const QUIET = process.argv.includes('--quiet');
const GATE = process.argv.includes('--gate');
const WRITE_IDX = process.argv.indexOf('--write');
const MARKDOWN_IDX = process.argv.indexOf('--markdown');
const REPORT_PATH = WRITE_IDX >= 0 && process.argv[WRITE_IDX + 1]
  ? path.resolve(ROOT, process.argv[WRITE_IDX + 1])
  : path.join(ROOT, 'a11y-audit', 'stem_tool_ui_a11y_audit.json');
const MARKDOWN_PATH = MARKDOWN_IDX >= 0 && process.argv[MARKDOWN_IDX + 1]
  ? path.resolve(ROOT, process.argv[MARKDOWN_IDX + 1])
  : path.join(ROOT, 'a11y-audit', 'stem_tool_ui_a11y_audit.md');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  console.warn('[check_stem_a11y] SKIPPED - React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
  process.exit(0);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/'
});

function setGlobal(k, v) {
  try { global[k] = v; }
  catch (e) {
    try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {}
  }
}

setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('HTMLCanvasElement', dom.window.HTMLCanvasElement);
setGlobal('CustomEvent', dom.window.CustomEvent);
setGlobal('localStorage', dom.window.localStorage);
setGlobal('sessionStorage', dom.window.sessionStorage);
setGlobal('getComputedStyle', dom.window.getComputedStyle);
setGlobal('requestAnimationFrame', function (cb) { return setTimeout(cb, 0); });
setGlobal('cancelAnimationFrame', function (id) { clearTimeout(id); });

const noop = function () {};
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
const palProxy = new Proxy({}, { get: function () { return '#475569'; } });

function StubAudioContext() {
  this.currentTime = 0;
  this.destination = {};
  this.state = 'running';
}
StubAudioContext.prototype.createOscillator = function () {
  return {
    type: 'sine',
    frequency: { value: 440, setValueAtTime: noop },
    connect: noop,
    start: noop,
    stop: noop
  };
};
StubAudioContext.prototype.createGain = function () {
  return { gain: { value: 1, setValueAtTime: noop, exponentialRampToValueAtTime: noop }, connect: noop };
};
StubAudioContext.prototype.createAnalyser = function () { return { fftSize: 2048, connect: noop, getByteTimeDomainData: noop }; };
StubAudioContext.prototype.createBiquadFilter = function () { return { type: 'lowpass', frequency: { value: 0 }, Q: { value: 0 }, connect: noop }; };
StubAudioContext.prototype.createDelay = function () { return { delayTime: { value: 0 }, connect: noop }; };
StubAudioContext.prototype.createWaveShaper = function () { return { curve: null, oversample: 'none', connect: noop }; };
StubAudioContext.prototype.createConvolver = function () { return { buffer: null, connect: noop }; };
StubAudioContext.prototype.createBuffer = function () { return { getChannelData: function () { return new Float32Array(1); } }; };
StubAudioContext.prototype.resume = function () { return Promise.resolve(); };
StubAudioContext.prototype.close = function () { this.state = 'closed'; return Promise.resolve(); };

global.React = React;
window.React = React;
window.AlloIcons = iconsProxy;
window.callGemini = null;
window.AudioContext = window.AudioContext || StubAudioContext;
window.webkitAudioContext = window.webkitAudioContext || StubAudioContext;
global.Audio = function Audio() { return { play: function () { return Promise.resolve(); } }; };
window.ResizeObserver = window.ResizeObserver || function ResizeObserver() {
  return { observe: noop, unobserve: noop, disconnect: noop };
};
window.MutationObserver = window.MutationObserver || function MutationObserver() {
  return { observe: noop, disconnect: noop };
};
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop };
};
if (window.HTMLCanvasElement && window.HTMLCanvasElement.prototype) {
  window.HTMLCanvasElement.prototype.getContext = window.HTMLCanvasElement.prototype.getContext || function () {
    return {
      canvas: this,
      setTransform: noop,
      clearRect: noop,
      fillRect: noop,
      strokeRect: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      rect: noop,
      fill: noop,
      stroke: noop,
      save: noop,
      restore: noop,
      translate: noop,
      rotate: noop,
      scale: noop,
      drawImage: noop,
      fillText: noop,
      strokeText: noop,
      measureText: function (txt) { return { width: String(txt || '').length * 7 }; },
      createLinearGradient: function () { return { addColorStop: noop }; },
      createRadialGradient: function () { return { addColorStop: noop }; }
    };
  };
}

window.AlloStemTheme = {
  palette: function () {
    return {
      canvas: '#0f172a', panel: '#1e293b', deeper: '#020617',
      text: '#e2e8f0', textSoft: '#94a3b8', border: '#334155',
      buttonBg: '#1e293b', buttonText: '#e2e8f0', buttonBorder: '#334155'
    };
  },
  currentTheme: function () { return 'dark'; },
  onChange: function () { return noop; }
};

window.StemLab = {
  _registry: {},
  _order: [],
  registerTool: function (id, config) {
    config = config || {};
    config.id = id;
    config.ready = config.ready !== false;
    if (!config.label) config.label = config.title || config.name || id;
    if (!config.desc) config.desc = config.description || '';
    if (config.aliases && !Array.isArray(config.aliases)) config.aliases = [config.aliases];
    if (!config.aliases && config.searchAliases) config.aliases = Array.isArray(config.searchAliases) ? config.searchAliases : [config.searchAliases];
    if (!config.color) config.color = 'slate';
    if (!config.category) config.category = 'general';
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
  },
  getRegisteredTools: function () {
    var self = this;
    return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function (id) { return !!this._registry[id]; },
  renderTool: function (id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    var rendered;
    try { rendered = tool.render(ctx); }
    catch (e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
    if (rendered == null) return null;
    if (tool.lightBackground === true) return rendered;
    if (!ctx || !ctx.React) return rendered;
    return ctx.React.createElement('div', {
      style: {
        background: 'var(--allo-stem-canvas, #0f172a)',
        color: 'var(--allo-stem-text, #e2e8f0)',
        borderRadius: 12,
        minHeight: 'calc(100vh - 32px)'
      },
      'data-stem-tool-shell': id
    },
      // mirrors the real shell's sr-only tool-name H1 (stem_lab_module.js)
      ctx.React.createElement('h1', { style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 } }, (tool.label || id)),
      rendered);
  },
  setupHiDPI: function (canvas, logicalW, logicalH) {
    if (!canvas) return;
    canvas.width = logicalW || canvas.width || 640;
    canvas.height = logicalH || canvas.height || 360;
    canvas._logicalW = canvas.width;
    canvas._logicalH = canvas.height;
  },
  findById: function (arr, id) {
    return Array.isArray(arr) ? arr.find(function (x) { return x && x.id === id; }) : null;
  }
};

function loadScript(file) {
  const src = fs.readFileSync(file, 'utf8');
  new Function('require', src)(require); // eslint-disable-line no-new-func
}

const dir = path.join(ROOT, 'stem_lab');
const files = fs.readdirSync(dir).filter(function (f) { return /^stem_tool_.*\.js$/.test(f); }).sort();
const loadErrors = [];
files.forEach(function (f) {
  try { loadScript(path.join(dir, f)); }
  catch (e) { loadErrors.push({ file: f, error: (e && e.message) || String(e) }); }
});

function makeCtx(toolId) {
  const base = {
    React: React,
    toolData: {},
    setToolData: noop,
    update: noop,
    updateMulti: noop,
    setStemLabTool: noop,
    setStemLabTab: noop,
    stemLabTab: 'explore',
    stemLabTool: toolId,
    toolSnapshots: [],
    setToolSnapshots: noop,
    addToast: noop,
    awardXP: noop,
    getXP: function () { return 0; },
    announceToSR: noop,
    canvasNarrate: noop,
    setCanvasNarrateEnabled: noop,
    celebrate: noop,
    callGemini: null,
    getHint: noop,
    aiHintsEnabled: false,
    aiChat: null,
    sourceText: '',
    inputText: '',
    sourceTopic: '',
    gradeLevel: '5th Grade',
    gradeBand: 'g68',
    gridRange: { min: -10, max: 10 },
    t: function (k, fb) { return fb != null ? fb : k; },
    icons: iconsProxy,
    _codingCanvasRef: { current: null },
    saveSnapshot: noop,
    renderTutorial: function () { return null; },
    _tutGalaxy: [],
    beep: noop,
    callTTS: null,
    callImagen: null,
    callGeminiVision: null,
    callGeminiImageEdit: null,
    srOnly: function (text) { return React.createElement('span', { className: 'sr-only' }, text); },
    a11yClick: function (h) { return { onClick: h, role: 'button', tabIndex: 0 }; },
    canvasA11yDesc: function (d) { return { role: 'img', 'aria-label': d }; },
    props: {},
    activeSessionCode: null,
    studentNickname: null,
    isTeacherMode: false,
    isDark: true,
    isContrast: false,
    theme: 'dark',
    pal: palProxy,
    exploreScore: { correct: 0, total: 0 },
    setExploreScore: noop,
    exploreDifficulty: 'medium',
    setExploreDifficulty: noop,
    angleValue: 45,
    setAngleValue: noop,
    angleChallenge: null,
    setAngleChallenge: noop,
    angleFeedback: null,
    setAngleFeedback: noop,
    multTableAnswer: '',
    setMultTableAnswer: noop,
    multTableChallenge: null,
    setMultTableChallenge: noop,
    multTableFeedback: null,
    setMultTableFeedback: noop,
    multTableHidden: false,
    setMultTableHidden: noop,
    multTableHover: null,
    setMultTableHover: noop,
    multTableRevealed: new Set(),
    setMultTableRevealed: noop,
    labToolData: {},
    setLabToolData: noop,
    _renderingFlag: { current: false }
  };
  return new Proxy(base, { get: function (o, p) { return (p in o) ? o[p] : noop; } });
}

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

function text(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function cssPath(el) {
  if (!el || !el.tagName) return '';
  const parts = [];
  let cur = el;
  while (cur && cur.tagName && cur.tagName.toLowerCase() !== 'body' && parts.length < 5) {
    let part = cur.tagName.toLowerCase();
    if (cur.id) {
      part += '#' + cur.id;
      parts.unshift(part);
      break;
    }
    const cls = attr(cur, 'class').split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) part += '.' + cls.join('.');
    const parent = cur.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(function (x) { return x.tagName === cur.tagName; });
      if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
    }
    parts.unshift(part);
    cur = parent;
  }
  return parts.join(' > ');
}

function labelTextFor(doc, id) {
  if (!id) return '';
  const safe = String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const labels = Array.from(doc.querySelectorAll('label[for="' + safe + '"]'));
  return labels.map(text).join(' ').trim();
}

function accessibleName(el, doc) {
  const aria = attr(el, 'aria-label');
  if (aria) return aria;
  const labelledBy = attr(el, 'aria-labelledby');
  if (labelledBy) {
    const out = labelledBy.split(/\s+/).map(function (id) {
      const ref = doc.getElementById(id);
      return ref ? text(ref) : '';
    }).join(' ').trim();
    if (out) return out;
  }
  const wrapped = el.closest && el.closest('label');
  if (wrapped) {
    const t = text(wrapped);
    if (t) return t;
  }
  const byFor = labelTextFor(doc, attr(el, 'id'));
  if (byFor) return byFor;
  const title = attr(el, 'title');
  if (title) return title;
  const alt = attr(el, 'alt');
  if (alt) return alt;
  const placeholder = attr(el, 'placeholder');
  if (placeholder) return placeholder;
  return text(el);
}

function meaningfulName(name) {
  if (!name) return false;
  const stripped = String(name).replace(/[\s\uFE0F\u200D]/g, '');
  return /[A-Za-z0-9]/.test(stripped);
}

function parseStyle(styleText) {
  const out = {};
  String(styleText || '').split(';').forEach(function (decl) {
    const idx = decl.indexOf(':');
    if (idx < 0) return;
    out[decl.slice(0, idx).trim().toLowerCase()] = decl.slice(idx + 1).trim();
  });
  return out;
}

function parseColor(v) {
  const s = String(v || '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) {
    let hex = m[1];
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/.exec(s);
  if (m && (m[4] === undefined || Number(m[4]) > 0.85)) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const named = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    transparent: null
  };
  return Object.prototype.hasOwnProperty.call(named, s) ? named[s] : null;
}

function luminance(rgb) {
  const vals = rgb.map(function (c) {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function issue(toolId, severity, code, message, extra) {
  return Object.assign({ toolId: toolId, severity: severity, code: code, message: message }, extra || {});
}

function classList(doc) {
  const out = [];
  Array.from(doc.querySelectorAll('[class]')).forEach(function (el) {
    attr(el, 'class').split(/\s+/).forEach(function (cls) { if (cls) out.push(cls); });
  });
  return out;
}

function issueMeta() {
  return {
    'empty-render': {
      severity: 'error',
      recommendation: 'Render a real first screen with a visible title, purpose, and starting action.'
    },
    'duplicate-id': {
      severity: 'error',
      recommendation: 'Make generated ids unique per repeated control or move to aria-labelledby without repeated ids.'
    },
    'control-name': {
      severity: 'error',
      recommendation: 'Add a specific aria-label/title or visible text to icon-only controls.'
    },
    'role-button-tabindex': {
      severity: 'error',
      recommendation: 'Use a real button, or add tabIndex=0 and keyboard activation handling to role=button elements.'
    },
    'field-name': {
      severity: 'error',
      recommendation: 'Pair each field with a label/aria-label that names what the value controls.'
    },
    'img-alt': {
      severity: 'error',
      recommendation: 'Add alt text for informative images and alt="" for decorative images.'
    },
    'canvas-name': {
      severity: 'warning',
      recommendation: 'Give each canvas a tool-specific role and aria-label, not only the host fallback.'
    },
    'canvas-focus': {
      severity: 'warning',
      recommendation: 'Make interactive canvases keyboard-focusable. For static output, use role=img, a meaningful name and description, plus data-a11y-static=true.'
    },
    'svg-name': {
      severity: 'warning',
      recommendation: 'Mark decorative SVGs aria-hidden or give informative SVGs an aria-label/title.'
    },
    'heading': {
      severity: 'warning',
      recommendation: 'Start each tool with a semantic heading so screen-reader users can orient quickly.'
    },
    'inline-contrast': {
      severity: 'warning',
      recommendation: 'Adjust inline foreground/background colors to meet at least 4.5:1 contrast for body text.'
    },
    'tiny-text': {
      severity: 'warning',
      recommendation: 'Avoid persistent 8px/9px instructional text; keep small labels at 10px+ with clear line height.'
    },
    'horizontal-overflow-risk': {
      severity: 'notice',
      recommendation: 'Review fixed-width elements at 360px and 768px widths so panels and canvases do not overflow.'
    },
    'metadata': {
      severity: 'notice',
      recommendation: 'Fill in label, description, category, and aliases so discovery and context labels stay clear.'
    },
    'light-background': {
      severity: 'notice',
      recommendation: 'Confirm light-background tools still pass contrast across light, dark, and high-contrast themes.'
    }
  };
}

function auditMarkup(toolId, html, tool) {
  const page = new JSDOM('<!doctype html><body>' + html + '</body>');
  const doc = page.window.document;
  const issues = [];

  if (!text(doc.body)) {
    issues.push(issue(toolId, 'error', 'empty-render', 'Tool rendered no readable content.'));
  }

  const ids = {};
  Array.from(doc.querySelectorAll('[id]')).forEach(function (el) {
    const id = attr(el, 'id');
    if (!id) return;
    ids[id] = (ids[id] || 0) + 1;
  });
  Object.keys(ids).forEach(function (id) {
    if (ids[id] > 1) issues.push(issue(toolId, 'error', 'duplicate-id', 'Duplicate id "' + id + '" appears ' + ids[id] + ' times.'));
  });

  Array.from(doc.querySelectorAll('button, [role="button"], a[href], summary, [tabindex]')).forEach(function (el, idx) {
    const tag = el.tagName.toLowerCase();
    const type = attr(el, 'type').toLowerCase();
    if (tag === 'input' && type === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'error', 'control-name', 'Interactive control is missing a meaningful accessible name.', {
        index: idx,
        tag: tag,
        selector: cssPath(el),
        text: text(el).slice(0, 80)
      }));
    }
    if (tag !== 'button' && attr(el, 'role') === 'button' && !attr(el, 'tabindex')) {
      issues.push(issue(toolId, 'error', 'role-button-tabindex', 'Non-button role="button" element is missing tabIndex=0.', {
        index: idx,
        selector: cssPath(el)
      }));
    }
  });

  Array.from(doc.querySelectorAll('input, select, textarea')).forEach(function (el, idx) {
    const type = attr(el, 'type').toLowerCase();
    if (type === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'error', 'field-name', 'Form field is missing a meaningful accessible name.', {
        index: idx,
        tag: el.tagName.toLowerCase(),
        type: type || undefined,
        selector: cssPath(el)
      }));
    }
  });

  Array.from(doc.querySelectorAll('img')).forEach(function (el, idx) {
    if (!el.hasAttribute('alt')) {
      issues.push(issue(toolId, 'error', 'img-alt', 'Image is missing alt text. Use empty alt for decorative images.', {
        index: idx,
        selector: cssPath(el)
      }));
    }
  });

  Array.from(doc.querySelectorAll('canvas')).forEach(function (el, idx) {
    const name = accessibleName(el, doc);
    const role = attr(el, 'role');
    // aria-hidden canvases are removed from the a11y tree, so they need no
    // accessible name (matches the canvas-focus check below, which also skips them).
    if (attr(el, 'aria-hidden') !== 'true' && (!role || !meaningfulName(name))) {
      issues.push(issue(toolId, 'warning', 'canvas-name', 'Canvas lacks a tool-specific role/accessible name before host fallback runs.', {
        index: idx,
        selector: cssPath(el),
        width: attr(el, 'width') || undefined,
        height: attr(el, 'height') || undefined
      }));
    }
    const descriptionIds = attr(el, 'aria-describedby').trim().split(/\s+/).filter(Boolean);
    const hasDescription = descriptionIds.some(function (id) {
      const target = doc.getElementById(id);
      return target && meaningfulName(target.textContent);
    });
    const staticImageCanvas = role === 'img' &&
      attr(el, 'data-a11y-static') === 'true' &&
      meaningfulName(name) && hasDescription;
    if (!attr(el, 'tabindex') && attr(el, 'aria-hidden') !== 'true' && !staticImageCanvas) {
      issues.push(issue(toolId, 'warning', 'canvas-focus', 'Canvas may be interactive but is not focusable in initial markup.', {
        index: idx,
        selector: cssPath(el)
      }));
    }
  });

  Array.from(doc.querySelectorAll('svg')).forEach(function (el, idx) {
    if (attr(el, 'aria-hidden') === 'true') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'warning', 'svg-name', 'SVG is neither aria-hidden nor named.', {
        index: idx,
        selector: cssPath(el)
      }));
    }
  });

  if (!doc.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
    issues.push(issue(toolId, 'warning', 'heading', 'No semantic heading rendered for this tool.'));
  }

  Array.from(doc.querySelectorAll('[style]')).forEach(function (el, idx) {
    const st = parseStyle(attr(el, 'style'));
    const fg = parseColor(st.color);
    const bg = parseColor(st.background || st['background-color']);
    if (!fg || !bg || !text(el)) return;
    const ratio = contrast(fg, bg);
    if (ratio < 4.5) {
      issues.push(issue(toolId, 'warning', 'inline-contrast', 'Inline foreground/background contrast is below 4.5:1.', {
        index: idx,
        selector: cssPath(el),
        ratio: Number(ratio.toFixed(2)),
        color: st.color,
        background: st.background || st['background-color'],
        text: text(el).slice(0, 80)
      }));
    }
  });

  const classes = classList(doc);
  const tinyHits = classes.filter(function (cls) { return /^text-\[(8|9)px\]$/.test(cls); });
  if (tinyHits.length) {
    issues.push(issue(toolId, 'warning', 'tiny-text', 'Tool uses persistent 8px/9px text utility classes.', {
      count: tinyHits.length,
      classes: Array.from(new Set(tinyHits)).sort()
    }));
  }

  const overflowEls = Array.from(doc.querySelectorAll('[style], [width]')).filter(function (el) {
    return hasLargeFixedWidth(attr(el, 'style'), attr(el, 'width'), 400, 700);
  });
  if (overflowEls.length) {
    issues.push(issue(toolId, 'notice', 'horizontal-overflow-risk', 'Tool includes fixed-width surfaces that need mobile visual review.', {
      count: overflowEls.length,
      examples: overflowEls.slice(0, 4).map(function (el) {
        return { selector: cssPath(el), width: attr(el, 'width') || parseStyle(attr(el, 'style')).width || undefined };
      })
    }));
  }

  if (!tool.desc || String(tool.desc).trim().length < 12) {
    issues.push(issue(toolId, 'notice', 'metadata', 'Tool registry description is missing or too short for catalog/context UI.'));
  }
  if (!tool.category || tool.category === 'general') {
    issues.push(issue(toolId, 'notice', 'metadata', 'Tool registry category is missing or generic.'));
  }
  if (tool.lightBackground === true) {
    issues.push(issue(toolId, 'notice', 'light-background', 'Tool opts out of the shared dark tool shell; verify contrast across themes.'));
  }

  const metrics = {
    buttons: doc.querySelectorAll('button').length,
    roleButtons: doc.querySelectorAll('[role="button"]').length,
    fields: doc.querySelectorAll('input:not([type="hidden"]), select, textarea').length,
    canvases: doc.querySelectorAll('canvas').length,
    svgs: doc.querySelectorAll('svg').length,
    images: doc.querySelectorAll('img').length,
    headings: doc.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').length,
    links: doc.querySelectorAll('a[href]').length,
    tinyTextClassHits: tinyHits.length,
    fixedWidthRiskCount: overflowEls.length
  };

  return { issues: issues, metrics: metrics };
}

const registry = window.StemLab._registry || {};
const ids = (window.StemLab._order || Object.keys(registry)).filter(function (id, idx, arr) {
  return id && arr.indexOf(id) === idx && registry[id];
}).sort();
const tools = [];
const renderErrors = [];
const _origErr = console.error;

ids.forEach(function (id) {
  let html = '';
  const caught = [];
  console.error = function () {
    try {
      const msg = Array.prototype.map.call(arguments, function (x) { return x && x.message ? x.message : String(x); }).join(' ');
      if (/error rendering/i.test(msg)) caught.push(msg);
    } catch (_) {}
  };
  try {
    const ctx = makeCtx(id);
    html = RDS.renderToStaticMarkup(React.createElement(function StemA11ySmoke() {
      return window.StemLab.renderTool(id, ctx);
    }));
  } catch (e) {
    renderErrors.push(issue(id, 'error', 'render-throw', (e && e.message) || String(e)));
  } finally {
    console.error = _origErr;
  }
  caught.forEach(function (msg) {
    renderErrors.push(issue(id, 'error', 'render-degraded', msg));
  });
  const tool = registry[id] || {};
  const audited = html ? auditMarkup(id, html, tool) : { issues: [], metrics: {} };
  const issues = audited.issues;
  tools.push({
    id: id,
    label: tool.label || tool.name || tool.title || id,
    category: tool.category || 'general',
    ready: tool.ready !== false,
    lightBackground: tool.lightBackground === true,
    aliases: tool.aliases || [],
    desc: tool.desc || tool.description || '',
    renderedBytes: html.length,
    standardShell: html.indexOf('data-stem-tool-shell="' + id + '"') >= 0,
    issueCount: issues.length,
    errorCount: issues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: issues.filter(function (i) { return i.severity === 'warning'; }).length,
    noticeCount: issues.filter(function (i) { return i.severity === 'notice'; }).length,
    metrics: audited.metrics,
    issues: issues
  });
});

const allIssues = tools.reduce(function (acc, t) { return acc.concat(t.issues); }, []).concat(renderErrors);
const findingsByCode = allIssues.reduce(function (acc, i) {
  if (!acc[i.code]) acc[i.code] = { code: i.code, severity: i.severity, count: 0, tools: [] };
  acc[i.code].count += 1;
  if (acc[i.code].tools.indexOf(i.toolId) === -1) acc[i.code].tools.push(i.toolId);
  return acc;
}, {});
Object.keys(findingsByCode).forEach(function (code) {
  findingsByCode[code].tools.sort();
});

const meta = issueMeta();
const topFindings = Object.keys(findingsByCode).map(function (code) {
  const f = findingsByCode[code];
  return {
    code: code,
    severity: f.severity,
    count: f.count,
    toolCount: f.tools.length,
    exampleTools: f.tools.slice(0, 12),
    recommendation: (meta[code] && meta[code].recommendation) || ''
  };
}).sort(function (a, b) {
  const sev = { error: 0, warning: 1, notice: 2 };
  return (sev[a.severity] - sev[b.severity]) || (b.toolCount - a.toolCount) || a.code.localeCompare(b.code);
});

const categorySummary = tools.reduce(function (acc, t) {
  const key = t.category || 'general';
  if (!acc[key]) acc[key] = { toolCount: 0, errorCount: 0, warningCount: 0, noticeCount: 0 };
  acc[key].toolCount += 1;
  acc[key].errorCount += t.errorCount;
  acc[key].warningCount += t.warningCount;
  acc[key].noticeCount += t.noticeCount;
  return acc;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  source: {
    stemToolFileCount: files.length,
    registeredToolCount: ids.length
  },
  toolCount: ids.length,
  loadErrors: loadErrors,
  renderErrors: renderErrors,
  summary: {
    issueCount: allIssues.length,
    errorCount: allIssues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: allIssues.filter(function (i) { return i.severity === 'warning'; }).length,
    noticeCount: allIssues.filter(function (i) { return i.severity === 'notice'; }).length,
    toolsWithIssues: tools.filter(function (t) { return t.issueCount > 0; }).length,
    toolsWithErrors: tools.filter(function (t) { return t.errorCount > 0; }).length,
    toolsWithWarnings: tools.filter(function (t) { return t.warningCount > 0; }).length,
    toolsWithCanvas: tools.filter(function (t) { return t.metrics && t.metrics.canvases > 0; }).length,
    shellCoverage: {
      standardShellTools: tools.filter(function (t) { return t.standardShell; }).length,
      lightBackgroundTools: tools.filter(function (t) { return t.lightBackground; }).map(function (t) { return t.id; }),
      toolsWithoutStandardShell: tools.filter(function (t) { return !t.standardShell && !t.lightBackground; }).map(function (t) { return t.id; })
    },
    categorySummary: categorySummary
  },
  topFindings: topFindings,
  recommendations: [
    {
      priority: 1,
      title: 'Replace generic host fallback labels with tool-authored labels',
      detail: 'Canvas-heavy tools should emit role, aria-label, and keyboard focus metadata directly in their canvas props so narration is specific before after-mount repairs run.'
    },
    {
      priority: 2,
      title: 'Standardize icon-only and symbolic controls',
      detail: 'Any button or role=button whose visible text is only an icon/symbol should carry an action-specific aria-label and, where useful, a title tooltip.'
    },
    {
      priority: 3,
      title: 'Programmatically label sliders, selects, and text areas',
      detail: 'The science and simulation tools use many controls; each range/input/select needs a label that names the parameter and unit.'
    },
    {
      priority: 4,
      title: 'Mobile-review fixed-width canvases and panels',
      detail: 'Fixed canvas and panel widths are expected in simulations, but tools with many fixed surfaces should be checked at phone widths for clipped controls and horizontal scrolling.'
    },
    {
      priority: 5,
      title: 'Keep metadata complete',
      detail: 'Short descriptions, categories, and aliases improve catalog search, active-tool context, and teacher station-building workflows.'
    }
  ],
  tools: tools
};

function mdEscape(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(rep) {
  const lines = [];
  lines.push('# STEM Tool UI/UX Accessibility Audit');
  lines.push('');
  lines.push('Generated: ' + rep.generatedAt);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Registered STEM tools audited: ' + rep.toolCount);
  lines.push('- Plugin files loaded: ' + rep.source.stemToolFileCount);
  lines.push('- Shared shell coverage: ' + rep.summary.shellCoverage.standardShellTools + '/' + rep.toolCount + ' tools');
  lines.push('- Light-background opt-outs: ' + rep.summary.shellCoverage.lightBackgroundTools.length);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push('| Total findings | ' + rep.summary.issueCount + ' |');
  lines.push('| High-confidence errors | ' + rep.summary.errorCount + ' |');
  lines.push('| Tool-level warnings | ' + rep.summary.warningCount + ' |');
  lines.push('| Review notices | ' + rep.summary.noticeCount + ' |');
  lines.push('| Tools with any finding | ' + rep.summary.toolsWithIssues + ' |');
  lines.push('| Tools with high-confidence errors | ' + rep.summary.toolsWithErrors + ' |');
  lines.push('| Tools with canvas surfaces | ' + rep.summary.toolsWithCanvas + ' |');
  lines.push('');
  if (rep.loadErrors.length || rep.renderErrors.length) {
    lines.push('## Load/Render Errors');
    lines.push('');
    rep.loadErrors.forEach(function (e) { lines.push('- Load: `' + e.file + '` - ' + mdEscape(e.error)); });
    rep.renderErrors.forEach(function (e) { lines.push('- Render: `' + e.toolId + '` - ' + mdEscape(e.message)); });
    lines.push('');
  }
  lines.push('## Top Findings');
  lines.push('');
  lines.push('| Severity | Code | Findings | Tools | Example tools | Recommendation |');
  lines.push('| --- | --- | ---: | ---: | --- | --- |');
  rep.topFindings.forEach(function (f) {
    lines.push('| ' + f.severity + ' | `' + f.code + '` | ' + f.count + ' | ' + f.toolCount + ' | ' + mdEscape(f.exampleTools.join(', ')) + ' | ' + mdEscape(f.recommendation) + ' |');
  });
  lines.push('');
  lines.push('## Recommended Next Passes');
  lines.push('');
  rep.recommendations.forEach(function (r) {
    lines.push(r.priority + '. **' + r.title + '** - ' + r.detail);
  });
  lines.push('');
  lines.push('## Tool Inventory');
  lines.push('');
  lines.push('| Tool | Category | Shell | Buttons | Fields | Canvases | Errors | Warnings | Notices | Top issue codes |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  rep.tools.forEach(function (t) {
    const codeCounts = t.issues.reduce(function (acc, i) {
      acc[i.code] = (acc[i.code] || 0) + 1;
      return acc;
    }, {});
    const codes = Object.keys(codeCounts).sort(function (a, b) { return codeCounts[b] - codeCounts[a] || a.localeCompare(b); })
      .slice(0, 5)
      .map(function (code) { return code + ' x' + codeCounts[code]; })
      .join(', ');
    lines.push('| `' + t.id + '` ' + mdEscape(t.label) + ' | ' + mdEscape(t.category) + ' | ' + (t.standardShell ? 'standard' : (t.lightBackground ? 'light opt-out' : 'missing')) + ' | ' + (t.metrics.buttons || 0) + ' | ' + (t.metrics.fields || 0) + ' | ' + (t.metrics.canvases || 0) + ' | ' + t.errorCount + ' | ' + t.warningCount + ' | ' + t.noticeCount + ' | ' + mdEscape(codes) + ' |');
  });
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- The audit renders the default first screen for every registered plugin tool. It does not click through every tab/state.');
  lines.push('- Canvas and field findings are intentionally tool-level: the STEM host has fallback labeling, but tool-authored names are still more precise and resilient.');
  lines.push('- Use `node dev-tools/check_stem_a11y.cjs --gate` if you want high-confidence errors to fail automation.');
  lines.push('');
  return lines.join('\n');
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
fs.mkdirSync(path.dirname(MARKDOWN_PATH), { recursive: true });
fs.writeFileSync(MARKDOWN_PATH, renderMarkdown(report) + '\n');

if (!QUIET) {
  console.log('[check_stem_a11y] audited ' + ids.length + ' registered STEM tools from ' + files.length + ' plugin file(s)');
  console.log('[check_stem_a11y] JSON report: ' + path.relative(ROOT, REPORT_PATH));
  console.log('[check_stem_a11y] Markdown report: ' + path.relative(ROOT, MARKDOWN_PATH));
}
if (loadErrors.length) {
  console.error('Load errors: ' + loadErrors.length);
  loadErrors.forEach(function (e) { console.error('  - ' + e.file + ': ' + e.error); });
}
if (renderErrors.length) {
  console.error('Render errors: ' + renderErrors.length);
  renderErrors.slice(0, 30).forEach(function (e) { console.error('  - ' + e.toolId + ': ' + e.message); });
}
const errorTools = tools.filter(function (t) { return t.errorCount > 0; });
if (errorTools.length) {
  console.error('Tool-level a11y errors: ' + report.summary.errorCount + ' across ' + errorTools.length + ' tool(s)');
  errorTools.slice(0, 30).forEach(function (t) {
    const first = t.issues.find(function (i) { return i.severity === 'error'; });
    console.error('  - ' + t.id + ': ' + first.code + ' - ' + first.message);
  });
}
if (!QUIET || report.summary.warningCount || report.summary.noticeCount) {
  console.log('Summary: ' + report.summary.errorCount + ' error(s), ' + report.summary.warningCount + ' warning(s), ' + report.summary.noticeCount + ' notice(s).');
}

if (loadErrors.length || renderErrors.length || (GATE && report.summary.errorCount > 0)) process.exit(1);
