#!/usr/bin/env node
/*
 * Render every SEL Hub tool through the real host renderer and audit common
 * UI/accessibility risks in the generated markup.
 *
 * This complements check_sel_render.cjs: that gate catches first-render crashes;
 * this one catches user-facing markup issues such as unlabeled controls,
 * duplicate ids, invalid role=button affordances, and obvious inline contrast
 * failures. It writes a JSON report for tool-by-tool review.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'prismflow-deploy', 'node_modules');
const QUIET = process.argv.includes('--quiet');
const WRITE_IDX = process.argv.indexOf('--write');
const REPORT_PATH = WRITE_IDX >= 0 && process.argv[WRITE_IDX + 1]
  ? path.resolve(ROOT, process.argv[WRITE_IDX + 1])
  : path.join(ROOT, 'a11y-audit', 'sel_tool_ui_a11y_audit.json');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  console.warn('[check_sel_a11y] SKIPPED - React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
  process.exit(0);
}

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/'
});

function setGlobal(k, v) {
  try { global[k] = v; }
  catch (e) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {} }
}

setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('CustomEvent', dom.window.CustomEvent);
setGlobal('localStorage', dom.window.localStorage);
setGlobal('sessionStorage', dom.window.sessionStorage);
setGlobal('getComputedStyle', dom.window.getComputedStyle);

const noop = function () {};
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
const palProxy = new Proxy({}, { get: function () { return '#475569'; } });

global.React = React;
window.React = React;
window.AlloIcons = iconsProxy;
window.AlloModules = window.AlloModules || {};
window.callGemini = null;
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop };
};
global.Audio = function Audio() { return { play: function () { return Promise.resolve(); } }; };

function loadScript(file) {
  const src = fs.readFileSync(file, 'utf8');
  new Function('require', src)(require); // eslint-disable-line no-new-func
}

const dir = path.join(ROOT, 'sel_hub');
const loadErrors = [];
try {
  loadScript(path.join(dir, 'sel_hub_module.js'));
} catch (e) {
  loadErrors.push({ file: 'sel_hub_module.js', error: (e && e.message) || String(e) });
}

fs.readdirSync(dir).filter(function (f) {
  return /\.js$/.test(f) && f !== 'sel_hub_module.js' && !/^_build/.test(f);
}).sort().forEach(function (f) {
  try { loadScript(path.join(dir, f)); }
  catch (e) { loadErrors.push({ file: f, error: (e && e.message) || String(e) }); }
});

function makeCtx(toolId) {
  const themeBase = {
    isDark: false,
    isContrast: false,
    reduceMotion: false,
    palette: {
      bg: '#f8fafc',
      bgCard: '#ffffff',
      bgInput: '#ffffff',
      text: '#0f172a',
      textMuted: '#475569',
      border: '#cbd5e1',
      headerBg: '#0f172a',
      headerText: '#f8fafc',
      btnBg: '#7c3aed',
      btnText: '#ffffff',
      accent: '#7c3aed'
    }
  };
  const theme = new Proxy(themeBase, { get: function (o, p) { return (p in o) ? o[p] : '#475569'; } });
  const base = {
    React: React,
    toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: toolId,
    addToast: noop, awardXP: noop, getXP: function () { return 0; },
    announceToSR: noop, celebrate: noop, beep: noop, t: function (k) { return k; },
    theme: theme,
    isDark: false, isContrast: false, themePalette: themeBase.palette,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: 'Student', selectedVoice: null, activeSessionCode: null,
    icons: iconsProxy,
    gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: function (text) { return React.createElement('span', { className: 'sr-only' }, text); },
    a11yClick: function (h) { return { onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }; },
    props: { onExportRequested: noop }
  };
  return new Proxy(base, { get: function (o, p) { return (p in o) ? o[p] : noop; } });
}

function attr(el, name) {
  return (el.getAttribute(name) || '').trim();
}

function text(el) {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function labelTextFor(doc, id) {
  if (!id) return '';
  const labels = Array.from(doc.querySelectorAll('label[for="' + String(id).replace(/"/g, '\\"') + '"]'));
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
  const stripped = name.replace(/[\s\uFE0F\u200D]/g, '');
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
  const named = { white: [255, 255, 255], black: [0, 0, 0], transparent: null };
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

function auditMarkup(toolId, html) {
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

  Array.from(doc.querySelectorAll('button, [role="button"]')).forEach(function (el, idx) {
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'error', 'control-name', 'Button/control is missing a meaningful accessible name.', { index: idx, tag: el.tagName.toLowerCase(), text: text(el).slice(0, 80) }));
    }
    if (el.tagName.toLowerCase() !== 'button' && attr(el, 'role') === 'button' && !attr(el, 'tabindex')) {
      issues.push(issue(toolId, 'error', 'role-button-tabindex', 'Non-button role="button" element is missing tabIndex=0.', { index: idx }));
    }
  });

  Array.from(doc.querySelectorAll('input, select, textarea')).forEach(function (el, idx) {
    const type = attr(el, 'type').toLowerCase();
    if (type === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'error', 'field-name', 'Form field is missing a meaningful accessible name.', { index: idx, tag: el.tagName.toLowerCase(), type: type || undefined }));
    }
  });

  Array.from(doc.querySelectorAll('img')).forEach(function (el, idx) {
    if (!el.hasAttribute('alt')) {
      issues.push(issue(toolId, 'error', 'img-alt', 'Image is missing alt text. Use empty alt for decorative images.', { index: idx }));
    }
  });

  if (!doc.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
    issues.push(issue(toolId, 'warning', 'heading', 'No heading rendered for this tool.'));
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
        ratio: Number(ratio.toFixed(2)),
        color: st.color,
        background: st.background || st['background-color'],
        text: text(el).slice(0, 80)
      }));
    }
  });

  return issues;
}

const registry = (window.SelHub && window.SelHub._registry) || {};
const ids = Object.keys(registry).sort();
const tools = [];
let renderErrors = [];

ids.forEach(function (id) {
  let html = '';
  try {
    const ctx = makeCtx(id);
    html = RDS.renderToStaticMarkup(React.createElement(function SelA11ySmoke() {
      return window.SelHub.renderTool(id, ctx);
    }));
  } catch (e) {
    renderErrors.push(issue(id, 'error', 'render-throw', (e && e.message) || String(e)));
  }
  const issues = html ? auditMarkup(id, html) : [];
  const tool = registry[id] || {};
  tools.push({
    id: id,
    label: tool.label || tool.name || tool.title || id,
    renderedBytes: html.length,
    standardShell: html.indexOf('data-sel-standard-shell="' + id + '"') >= 0,
    issueCount: issues.length,
    errorCount: issues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: issues.filter(function (i) { return i.severity === 'warning'; }).length,
    issues: issues
  });
});

const allIssues = tools.reduce(function (acc, t) { return acc.concat(t.issues); }, []).concat(renderErrors);
const report = {
  generatedAt: new Date().toISOString(),
  toolCount: ids.length,
  loadErrors: loadErrors,
  renderErrors: renderErrors,
  summary: {
    issueCount: allIssues.length,
    errorCount: allIssues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: allIssues.filter(function (i) { return i.severity === 'warning'; }).length,
    toolsWithIssues: tools.filter(function (t) { return t.issueCount > 0; }).length,
    toolsWithoutStandardShell: tools.filter(function (t) { return !t.standardShell; }).map(function (t) { return t.id; })
  },
  tools: tools
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

if (!QUIET) {
  console.log('[check_sel_a11y] audited ' + ids.length + ' SEL tools');
  console.log('[check_sel_a11y] report: ' + path.relative(ROOT, REPORT_PATH));
}
if (loadErrors.length) {
  console.error('Load errors: ' + loadErrors.length);
  loadErrors.forEach(function (e) { console.error('  - ' + e.file + ': ' + e.error); });
}
if (renderErrors.length) {
  console.error('Render errors: ' + renderErrors.length);
  renderErrors.forEach(function (e) { console.error('  - ' + e.toolId + ': ' + e.message); });
}
const errorTools = tools.filter(function (t) { return t.errorCount > 0; });
if (errorTools.length) {
  console.error('A11y errors: ' + report.summary.errorCount + ' across ' + errorTools.length + ' tool(s)');
  errorTools.slice(0, 30).forEach(function (t) {
    const first = t.issues.find(function (i) { return i.severity === 'error'; });
    console.error('  - ' + t.id + ': ' + first.code + ' - ' + first.message);
  });
}
if (!QUIET || report.summary.warningCount) {
  console.log('Summary: ' + report.summary.errorCount + ' error(s), ' + report.summary.warningCount + ' warning(s), ' + report.summary.toolsWithoutStandardShell.length + ' tool(s) without standard shell.');
}

if (loadErrors.length || renderErrors.length || report.summary.errorCount > 0) process.exit(1);
