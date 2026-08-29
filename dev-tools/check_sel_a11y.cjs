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
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const QUIET = process.argv.includes('--quiet');
const WRITE_IDX = process.argv.indexOf('--write');
const REPORT_PATH = WRITE_IDX >= 0 && process.argv[WRITE_IDX + 1]
  ? path.resolve(ROOT, process.argv[WRITE_IDX + 1])
  : path.join(ROOT, 'a11y-audit', 'sel_tool_ui_a11y_audit.json');

function replaceFile(file, text) {
  const temporary = `${file}.sel-a11y-${process.pid}.tmp`;
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!transientCodes.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!transientCodes.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

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

const THEME_VARIANTS = [
  {
    id: 'light',
    isDark: false,
    isContrast: false,
    palette: {
      bg: '#f8fafc',
      bgCard: '#ffffff',
      bgInput: '#ffffff',
      text: '#0f172a',
      textMuted: '#475569',
      border: '#cbd5e1',
      headerBg: '#4f46e5',
      headerText: '#f8fafc',
      btnBg: '#7c3aed',
      btnText: '#ffffff',
      accent: '#7c3aed',
      accentText: '#ffffff'
    }
  },
  {
    id: 'dark',
    isDark: true,
    isContrast: false,
    palette: {
      bg: '#0f172a',
      bgCard: '#1e293b',
      bgInput: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#cbd5e1',
      border: '#64748b',
      headerBg: '#0f172a',
      headerText: '#f8fafc',
      btnBg: '#334155',
      btnText: '#f1f5f9',
      accent: '#7c3aed',
      accentText: '#ffffff'
    }
  },
  {
    id: 'high-contrast',
    isDark: true,
    isContrast: true,
    palette: {
      bg: '#000000',
      bgCard: '#000000',
      bgInput: '#000000',
      text: '#ffff00',
      textMuted: '#ffff00',
      border: '#ffff00',
      headerBg: '#000000',
      headerText: '#ffff00',
      btnBg: '#000000',
      btnText: '#00ff00',
      accent: '#00ff00',
      accentText: '#000000'
    }
  }
];

function makeCtx(toolId, themeVariant) {
  const themeBase = Object.assign({
    reduceMotion: false
  }, themeVariant || THEME_VARIANTS[0]);
  const theme = new Proxy(themeBase, { get: function (o, p) { return (p in o) ? o[p] : '#475569'; } });
  const base = {
    React: React,
    toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: toolId,
    addToast: noop, awardXP: noop, getXP: function () { return 0; },
    getSavePolicy: function () {
      return {
        checkpointLabel: 'Private checkpoint',
        sharePacketLabel: 'Share Packet eligible'
      };
    },
    announceToSR: noop, celebrate: noop, beep: noop, t: function (k) { return k; },
    theme: theme,
    isDark: !!themeBase.isDark, isContrast: !!themeBase.isContrast, themePalette: themeBase.palette,
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

function ownText(el) {
  return Array.from(el.childNodes || []).filter(function (node) {
    return node.nodeType === 3;
  }).map(function (node) {
    return node.textContent || '';
  }).join(' ').replace(/\s+/g, ' ').trim();
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

// Alpha-aware colour parse. The old parseColor() dropped anything under 0.85
// alpha, which silently discarded exactly the tinted badge surfaces that turned
// out to be the biggest source of real failures.
function parseColorA(v) {
  const s = String(v || '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (m) {
    let hex = m[1];
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), a];
  }
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([0-9.]+))?\s*\)$/.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  const named = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
  return Object.prototype.hasOwnProperty.call(named, s) ? named[s] : null;
}
function compositeOver(fg, bg) {
  const a = fg[3];
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
}
function rgbaText(c) {
  return 'rgb(' + c.slice(0, 3).map(Math.round).join(',') + ')';
}
// A colour set by a utility class cannot be resolved from SSR markup alone.
const TW_TEXT_CLASS = /\btext-(white|black)\b|\btext-[a-z]+-[0-9]{2,3}\b/;

// Coverage counters, so a run can state how much it actually graded rather than
// implying that "0 warnings" means "all of it is fine".
const coverage = { graded: 0, gradient: 0, classColor: 0 };

function auditMarkup(toolId, html, themeId, variant) {
  const pal = (variant && variant.palette) || {};
  const pageText = pal.text || '#0f172a';
  const pageSurface = pal.bg || '#ffffff';
  const ungraded = coverage;
  let graded = 0;
  const page = new JSDOM('<!doctype html><body>' + html + '</body>');
  const doc = page.window.document;
  const issues = [];

  if (!text(doc.body)) {
    issues.push(issue(toolId, 'error', 'empty-render', 'Tool rendered no readable content.', { theme: themeId }));
  }

  const ids = {};
  Array.from(doc.querySelectorAll('[id]')).forEach(function (el) {
    const id = attr(el, 'id');
    if (!id) return;
    ids[id] = (ids[id] || 0) + 1;
  });
  Object.keys(ids).forEach(function (id) {
    if (ids[id] > 1) issues.push(issue(toolId, 'error', 'duplicate-id', 'Duplicate id "' + id + '" appears ' + ids[id] + ' times.', { theme: themeId }));
  });

  Array.from(doc.querySelectorAll('button, [role="button"]')).forEach(function (el, idx) {
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'error', 'control-name', 'Button/control is missing a meaningful accessible name.', { theme: themeId, index: idx, tag: el.tagName.toLowerCase(), text: text(el).slice(0, 80) }));
    }
    if (el.tagName.toLowerCase() !== 'button' && attr(el, 'role') === 'button' && !attr(el, 'tabindex')) {
      issues.push(issue(toolId, 'error', 'role-button-tabindex', 'Non-button role="button" element is missing tabIndex=0.', { theme: themeId, index: idx }));
    }
  });

  Array.from(doc.querySelectorAll('input, select, textarea')).forEach(function (el, idx) {
    const type = attr(el, 'type').toLowerCase();
    if (type === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) {
      issues.push(issue(toolId, 'error', 'field-name', 'Form field is missing a meaningful accessible name.', { theme: themeId, index: idx, tag: el.tagName.toLowerCase(), type: type || undefined }));
    }
  });

  Array.from(doc.querySelectorAll('img')).forEach(function (el, idx) {
    if (!el.hasAttribute('alt')) {
      issues.push(issue(toolId, 'error', 'img-alt', 'Image is missing alt text. Use empty alt for decorative images.', { theme: themeId, index: idx }));
    }
  });

  if (!doc.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
    issues.push(issue(toolId, 'warning', 'heading', 'No heading rendered for this tool.', { theme: themeId }));
  }

  // ── Contrast, resolved the way a browser resolves it ──
  // This used to require `color` AND `background` inline on the SAME element,
  // which is not how the markup is written: text sits on a child, the surface is
  // on the card. That rule graded ~3,188 of 10,700 text nodes (30%) and reported
  // zero problems while 287 nodes across 44 tools were below AA.
  //
  // Now: walk ancestors for the nearest declared foreground and the nearest
  // OPAQUE surface, compositing any translucent layers in between (the tinted
  // `hue + '22'` badges only make sense composited). Two cases are reported as
  // UNGRADED rather than silently dropped, because a silent drop is what made
  // the old report look healthy:
  //   * gradient backgrounds — no single colour to measure
  //   * colours that come from a CSS class (Tailwind), which SSR cannot resolve
  Array.from(doc.querySelectorAll('*')).forEach(function (el, idx) {
    const visibleText = ownText(el) || (el.children.length ? '' : text(el));
    if (!visibleText || !/[A-Za-z0-9]/.test(visibleText)) return;

    // nearest declared foreground
    let fg = null, classFg = false, node = el;
    while (node && node.getAttribute) {
      const s = parseStyle(attr(node, 'style'));
      if (s.color) { fg = parseColorA(s.color); break; }
      if (TW_TEXT_CLASS.test(attr(node, 'class'))) { classFg = true; break; }
      node = node.parentElement;
    }
    if (classFg) { ungraded.classColor++; return; }
    if (!fg) fg = parseColorA(pageText);
    if (!fg) return;

    // nearest opaque surface, compositing translucent layers above it
    const layers = []; let gradient = false;
    node = el;
    while (node && node.getAttribute) {
      const s = parseStyle(attr(node, 'style'));
      const b = s.background || s['background-color'];
      if (b) {
        if (/gradient\(/i.test(b)) { gradient = true; break; }
        const c = parseColorA(b);
        if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
      }
      node = node.parentElement;
    }
    if (gradient) { ungraded.gradient++; return; }

    let bg = parseColorA(pageSurface) || [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) bg = compositeOver(layers[i], bg);
    if (fg[3] < 1) fg = compositeOver(fg, bg);

    graded++; coverage.graded++;
    const ratio = contrast(fg, bg);
    if (ratio < 4.5) {
      const own = parseStyle(attr(el, 'style'));
      issues.push(issue(toolId, 'warning', 'inline-contrast', 'Text contrast is below 4.5:1 against its resolved background.', {
        theme: themeId,
        index: idx,
        ratio: Number(ratio.toFixed(2)),
        color: own.color || rgbaText(fg) + ' (inherited)',
        background: rgbaText(bg),
        text: visibleText.slice(0, 80)
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
  const themeResults = [];
  let renderedBytes = 0;
  let standardShell = true;
  THEME_VARIANTS.forEach(function (variant) {
    let html = '';
    try {
      const ctx = makeCtx(id, variant);
      html = RDS.renderToStaticMarkup(React.createElement(function SelA11ySmoke() {
        return window.SelHub.renderTool(id, ctx);
      }));
    } catch (e) {
      renderErrors.push(issue(id, 'error', 'render-throw', (e && e.message) || String(e), { theme: variant.id }));
    }
    renderedBytes += html.length;
    const issues = html ? auditMarkup(id, html, variant.id, variant) : [];
    const themeShell = html.indexOf('data-sel-standard-shell="' + id + '"') >= 0;
    if (!themeShell) standardShell = false;
    themeResults.push({
      theme: variant.id,
      renderedBytes: html.length,
      standardShell: themeShell,
      issueCount: issues.length,
      errorCount: issues.filter(function (i) { return i.severity === 'error'; }).length,
      warningCount: issues.filter(function (i) { return i.severity === 'warning'; }).length,
      issues: issues
    });
  });
  const issues = themeResults.reduce(function (acc, t) { return acc.concat(t.issues); }, []);
  const tool = registry[id] || {};
  tools.push({
    id: id,
    label: tool.label || tool.name || tool.title || id,
    renderedBytes: renderedBytes,
    standardShell: standardShell,
    issueCount: issues.length,
    errorCount: issues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: issues.filter(function (i) { return i.severity === 'warning'; }).length,
    themes: themeResults,
    issues: issues
  });
});

const allIssues = tools.reduce(function (acc, t) { return acc.concat(t.issues); }, []).concat(renderErrors);
const report = {
  generatedAt: new Date().toISOString(),
  toolCount: ids.length,
  themesAudited: THEME_VARIANTS.map(function (t) { return t.id; }),
  loadErrors: loadErrors,
  renderErrors: renderErrors,
  summary: {
    issueCount: allIssues.length,
    errorCount: allIssues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: allIssues.filter(function (i) { return i.severity === 'warning'; }).length,
    toolsWithIssues: tools.filter(function (t) { return t.issueCount > 0; }).length,
    toolsWithoutStandardShell: tools.filter(function (t) { return !t.standardShell; }).map(function (t) { return t.id; }),
    // Coverage is reported alongside the counts on purpose. A warning count is
    // only meaningful next to how much of the text it was computed over; the
    // previous version of this file reported 0 warnings while grading 30%.
    contrastCoverage: {
      textNodesGraded: coverage.graded,
      skippedGradientBackground: coverage.gradient,
      skippedColourFromCssClass: coverage.classColor,
      note: 'Skipped nodes are NOT passes. Gradient-backed text has no single background to measure; class-sourced colours cannot be resolved from SSR markup.'
    }
  },
  tools: tools
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
replaceFile(REPORT_PATH, JSON.stringify(report, null, 2) + String.fromCharCode(10));

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
  console.log('Contrast coverage: ' + coverage.graded + ' text node(s) graded; ' + coverage.gradient + ' skipped (gradient background), ' + coverage.classColor + ' skipped (colour from a CSS class). Skipped is not passed.');
}

// ── Contrast ratchet ──
// Warnings do not fail the build on their own (there is a known backlog), but
// the count must never go UP. Same shape as the other dev-tools baselines.
// Re-baseline deliberately with --update-baseline after a real reduction.
const BASELINE_PATH = path.join(ROOT, 'dev-tools', 'sel_contrast_baseline.json');
let ratchetFailed = false;
try {
  if (process.argv.includes('--update-baseline')) {
    replaceFile(BASELINE_PATH, JSON.stringify({
      note: 'Max allowed contrast warnings from check_sel_a11y. Must only ever go DOWN. Refresh with: node dev-tools/check_sel_a11y.cjs --update-baseline',
      maxWarnings: report.summary.warningCount
    }, null, 2) + String.fromCharCode(10));
    console.log('[check_sel_a11y] baseline updated to ' + report.summary.warningCount + ' warning(s).');
  } else if (fs.existsSync(BASELINE_PATH)) {
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    if (report.summary.warningCount > baseline.maxWarnings) {
      console.error('[check_sel_a11y] CONTRAST REGRESSION: ' + report.summary.warningCount
        + ' warning(s), baseline allows ' + baseline.maxWarnings + '.');
      console.error('  Fix the new failure(s), or re-baseline deliberately with --update-baseline.');
      ratchetFailed = true;
    } else if (report.summary.warningCount < baseline.maxWarnings && !QUIET) {
      console.log('[check_sel_a11y] ' + (baseline.maxWarnings - report.summary.warningCount)
        + ' fewer warning(s) than baseline - run with --update-baseline to lock the gain in.');
    }
  }
} catch (e) {
  console.error('[check_sel_a11y] baseline check failed: ' + ((e && e.message) || e));
  ratchetFailed = true;
}

if (loadErrors.length || renderErrors.length || report.summary.errorCount > 0 || ratchetFailed) process.exit(1);
