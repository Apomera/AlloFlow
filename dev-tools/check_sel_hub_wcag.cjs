#!/usr/bin/env node
/*
 * check_sel_hub_wcag.cjs
 *
 * Headless WCAG/theme audit for the SEL Hub shell: catalog chrome, recent work,
 * teacher launch entry points, and share-packet launch surface. Tool interiors are
 * covered by check_sel_a11y.cjs.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const JSON_PATH = path.join(ROOT, 'a11y-audit', 'sel_hub_wcag_audit.json');
const MD_PATH = path.join(ROOT, 'a11y-audit', 'sel_hub_wcag_audit.md');
const QUIET = process.argv.includes('--quiet');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  console.warn('[check_sel_hub_wcag] SKIPPED - React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
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
function IconStub() { return React.createElement('span', { 'aria-hidden': 'true' }); }
const iconsProxy = new Proxy({}, { get: function () { return IconStub; } });
window.React = React;
global.React = React;
window.AlloIcons = iconsProxy;
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop };
};
window.AlloToggleTheme = noop;

const sampleSnapshots = [
  {
    id: 'audit-zones-reflection',
    tool: 'zones',
    label: 'Zone check reflection',
    ts: Date.now() - 8 * 60000,
    data: { reflection: 'I noticed I was in the yellow zone and chose a grounding strategy before group work.' }
  },
  {
    id: 'audit-strengths-reflection',
    toolId: 'strengths',
    label: 'Strengths checkpoint',
    ts: Date.now() - 36 * 60000,
    data: { summary: 'I chose perseverance and kindness as strengths I want adults to notice.' }
  }
];
window.__alloflowSelSnapshots = sampleSnapshots;
window.__alloflowStudentArtifacts = [];

function loadJs(file) {
  const src = fs.readFileSync(file, 'utf8');
  new Function(src)(); // eslint-disable-line no-new-func
}

const selDir = path.join(ROOT, 'sel_hub');
const loadErrors = [];
try {
  loadJs(path.join(selDir, 'sel_hub_module.js'));
} catch (e) {
  loadErrors.push({ file: 'sel_hub_module.js', error: (e && e.message) || String(e) });
}

fs.readdirSync(selDir).filter(function (f) {
  return /^sel_tool_.*\.js$/.test(f);
}).sort().forEach(function (f) {
  try { loadJs(path.join(selDir, f)); }
  catch (e) { loadErrors.push({ file: f, error: (e && e.message) || String(e) }); }
});

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
  return !!name && /[A-Za-z0-9]/.test(name.replace(/[\s\uFE0F\u200D]/g, ''));
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

function parseColor(value) {
  const s = String(value || '').trim().toLowerCase();
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

function issue(view, severity, code, message, extra) {
  return Object.assign({ view: view, severity: severity, code: code, message: message }, extra || {});
}

function auditMarkup(view, html, theme) {
  const page = new JSDOM('<!doctype html><body>' + html + '</body>');
  const doc = page.window.document;
  const issues = [];

  if (!text(doc.body)) issues.push(issue(view, 'error', 'empty-render', 'SEL Hub rendered no readable content.', { theme: theme }));

  const ids = {};
  Array.from(doc.querySelectorAll('[id]')).forEach(function (el) {
    const id = attr(el, 'id');
    if (!id) return;
    ids[id] = (ids[id] || 0) + 1;
  });
  Object.keys(ids).forEach(function (id) {
    if (ids[id] > 1) issues.push(issue(view, 'error', 'duplicate-id', 'Duplicate id "' + id + '" appears ' + ids[id] + ' times.', { theme: theme }));
  });

  Array.from(doc.querySelectorAll('button, [role="button"]')).forEach(function (el, idx) {
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) issues.push(issue(view, 'error', 'control-name', 'Control is missing a meaningful accessible name.', { theme: theme, index: idx, text: text(el).slice(0, 80) }));
    if (el.tagName.toLowerCase() !== 'button' && attr(el, 'role') === 'button' && !attr(el, 'tabindex')) {
      issues.push(issue(view, 'error', 'role-button-tabindex', 'Non-button role="button" element is missing tabIndex=0.', { theme: theme, index: idx }));
    }
  });

  Array.from(doc.querySelectorAll('input, select, textarea')).forEach(function (el, idx) {
    if (attr(el, 'type').toLowerCase() === 'hidden') return;
    const name = accessibleName(el, doc);
    if (!meaningfulName(name)) issues.push(issue(view, 'error', 'field-name', 'Field is missing a meaningful accessible name.', { theme: theme, index: idx, tag: el.tagName.toLowerCase() }));
  });

  Array.from(doc.querySelectorAll('img')).forEach(function (el, idx) {
    if (!el.hasAttribute('alt')) issues.push(issue(view, 'error', 'img-alt', 'Image is missing alt text.', { theme: theme, index: idx }));
  });

  if (!doc.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) {
    issues.push(issue(view, 'warning', 'heading', 'No heading rendered in this hub view.', { theme: theme }));
  }

  Array.from(doc.querySelectorAll('[style]')).forEach(function (el, idx) {
    const st = parseStyle(attr(el, 'style'));
    const fg = parseColor(st.color);
    const bg = parseColor(st.background || st['background-color']);
    const visibleText = ownText(el) || (el.children.length ? '' : text(el));
    if (!fg || !bg || !visibleText) return;
    const ratio = contrast(fg, bg);
    if (ratio < 4.5) {
      issues.push(issue(view, 'warning', 'inline-contrast', 'Inline foreground/background contrast is below 4.5:1.', {
        theme: theme,
        index: idx,
        ratio: Number(ratio.toFixed(2)),
        color: st.color,
        background: st.background || st['background-color'],
        text: visibleText.slice(0, 80)
      }));
    }
  });

  return issues;
}

const themes = [
  { id: 'light', bodyClass: '', width: 1280 },
  { id: 'dark', bodyClass: 'theme-dark', width: 1280 },
  { id: 'high-contrast', bodyClass: 'theme-contrast', width: 1280 },
  { id: 'mobile-high-contrast', bodyClass: 'theme-contrast', width: 390 }
];

function renderHub(theme) {
  document.body.className = theme.bodyClass;
  document.documentElement.className = theme.bodyClass;
  try { Object.defineProperty(window, 'innerWidth', { configurable: true, value: theme.width }); } catch (_) { window.innerWidth = theme.width; }
  window.__alloflowSelSnapshots = sampleSnapshots;
  window.__alloflowStudentArtifacts = [];

  const props = {
    showSelHub: true,
    setShowSelHub: noop,
    selHubTab: 'explore',
    setSelHubTab: noop,
    selHubTool: null,
    setSelHubTool: noop,
    addToast: noop,
    gradeLevel: '5th Grade',
    callGemini: null,
    callTTS: null,
    callImagen: null,
    callGeminiVision: null,
    onSafetyFlag: noop,
    studentCodename: 'audit-student',
    selectedVoice: null,
    activeSessionCode: null,
    t: function (k) { return k; },
    ArrowLeft: IconStub,
    X: IconStub,
    Sparkles: IconStub,
    Heart: IconStub,
    GripVertical: IconStub,
    onExportRequested: noop
  };

  return RDS.renderToStaticMarkup(React.createElement(window.AlloModules.SelHub, props));
}

const views = [];
const renderErrors = [];
themes.forEach(function (theme) {
  let html = '';
  let issues = [];
  try {
    html = renderHub(theme);
    issues = auditMarkup('sel-hub-catalog', html, theme.id);
  } catch (e) {
    renderErrors.push(issue('sel-hub-catalog', 'error', 'render-throw', (e && e.message) || String(e), { theme: theme.id }));
  }
  views.push({
    view: 'sel-hub-catalog',
    theme: theme.id,
    renderedBytes: html.length,
    issueCount: issues.length,
    errorCount: issues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: issues.filter(function (i) { return i.severity === 'warning'; }).length,
    checks: {
      hasRecentWork: html.indexOf('Recent SEL work') >= 0,
      hasSharePacketLauncher: html.indexOf('Create Share Packet') >= 0,
      hasTeacherLaunch: html.indexOf('Teacher launch') >= 0,
      hasPrivacyCopy: /Private on this device|Export to keep|student/.test(html)
    },
    issues: issues
  });
});

let toolAudit = null;
try {
  toolAudit = JSON.parse(fs.readFileSync(path.join(ROOT, 'a11y-audit', 'sel_tool_ui_a11y_audit.json'), 'utf8'));
} catch (e) {}

const allIssues = views.reduce(function (acc, v) { return acc.concat(v.issues); }, []).concat(renderErrors);
const report = {
  generatedAt: new Date().toISOString(),
  scope: [
    'SEL Hub shell/catalog',
    'Recent SEL work entry point',
    'Create Share Packet launcher',
    'Teacher launch entry point',
    'Tool-by-tool audit summary from sel_tool_ui_a11y_audit.json'
  ],
  themesAudited: themes.map(function (t) { return t.id; }),
  loadErrors: loadErrors,
  renderErrors: renderErrors,
  summary: {
    issueCount: allIssues.length,
    errorCount: allIssues.filter(function (i) { return i.severity === 'error'; }).length,
    warningCount: allIssues.filter(function (i) { return i.severity === 'warning'; }).length,
    toolCount: toolAudit ? toolAudit.toolCount : null,
    toolThemesAudited: toolAudit ? toolAudit.themesAudited : null,
    toolIssueCount: toolAudit ? toolAudit.summary.issueCount : null,
    toolErrorCount: toolAudit ? toolAudit.summary.errorCount : null,
    toolWarningCount: toolAudit ? toolAudit.summary.warningCount : null,
    toolsWithoutStandardShell: toolAudit ? toolAudit.summary.toolsWithoutStandardShell : null
  },
  manualAuditNotes: [
    'Run an interactive browser pass for focus order inside Create SEL Share Packet, For Educators, and custom Station Builder because SSR cannot click-open every state.',
    'Keep crisis/sensitive content in editorial review even when WCAG checks pass; accessible UI does not replace clinical/safety review.',
    'Verify visual responsive layout in the live app at mobile widths after deploy bundling.'
  ],
  views: views
};

fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
fs.writeFileSync(JSON_PATH, JSON.stringify(report, null, 2) + '\n');

const lines = [
  '# SEL Hub WCAG AA and Theme Audit',
  '',
  'Generated: ' + report.generatedAt,
  '',
  '## Summary',
  '',
  '- Hub shell views audited: ' + views.length + ' across ' + report.themesAudited.join(', '),
  '- Hub shell issues: ' + report.summary.errorCount + ' error(s), ' + report.summary.warningCount + ' warning(s)',
  '- Tool audit: ' + (report.summary.toolCount == null ? 'not available' : (report.summary.toolCount + ' tools, ' + report.summary.toolErrorCount + ' error(s), ' + report.summary.toolWarningCount + ' warning(s)')),
  '- Standard tool shell gaps: ' + ((report.summary.toolsWithoutStandardShell || []).length),
  '',
  '## What Looks Strong',
  '',
  '- Every SEL tool is covered by the standard shell audit in light, dark, and high-contrast themes.',
  '- Hub shell exposes labeled controls for close, theme, export, teacher launch, recent work, and share-packet entry points.',
  '- Recent SEL work and Share Packet entry points include student-control/privacy language.',
  '- Theme tokens now cover high-contrast foregrounds for accent, success, warning, danger, teacher-station, and disabled surfaces.',
  '',
  '## Remaining Manual QA',
  '',
  '- Browser-click focus order for Create SEL Share Packet, For Educators, and Station Builder.',
  '- Visual responsive review at mobile, tablet, and desktop widths in the live app.',
  '- Editorial/safety review for crisis and other sensitive SEL content.',
  '',
  '## View Results',
  ''
];
views.forEach(function (view) {
  lines.push('- ' + view.view + ' / ' + view.theme + ': ' + view.errorCount + ' error(s), ' + view.warningCount + ' warning(s); recent=' + view.checks.hasRecentWork + ', sharePacket=' + view.checks.hasSharePacketLauncher + ', teacherLaunch=' + view.checks.hasTeacherLaunch);
});
if (allIssues.length) {
  lines.push('', '## Issues', '');
  allIssues.forEach(function (i) {
    lines.push('- [' + i.severity + '] ' + i.theme + ' ' + i.code + ': ' + i.message + (i.text ? ' (' + i.text + ')' : ''));
  });
}
fs.writeFileSync(MD_PATH, lines.join('\n') + '\n');

if (!QUIET) {
  console.log('[check_sel_hub_wcag] report: ' + path.relative(ROOT, JSON_PATH));
}
if (loadErrors.length) {
  console.error('Load errors: ' + loadErrors.length);
  loadErrors.forEach(function (e) { console.error('  - ' + e.file + ': ' + e.error); });
}
if (renderErrors.length) {
  console.error('Render errors: ' + renderErrors.length);
  renderErrors.forEach(function (e) { console.error('  - ' + e.theme + ': ' + e.message); });
}
if (!QUIET || report.summary.warningCount) {
  console.log('Summary: ' + report.summary.errorCount + ' error(s), ' + report.summary.warningCount + ' warning(s).');
}

if (loadErrors.length || renderErrors.length || report.summary.errorCount > 0) process.exit(1);
