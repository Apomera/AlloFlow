/**
 * AlloFlow Error Reporter Module
 *
 * In-app error capture + one-click bug report. Solves the problem that
 * users in Canvas (or any LMS embed) can't easily access browser DevTools,
 * and most teachers/students don't know F12 exists.
 *
 * Behavior:
 * - Hidden by default. Surfaces a small fixed-position red "⚠ N errors"
 *   badge in the bottom-right ONLY after at least one error is captured.
 * - Clicking the badge opens a modal with the captured log + metadata
 *   (URL, user agent, viewport size, timestamps).
 * - "Send to Aaron" pre-fills a Google Form with the report and opens it
 *   in a new tab so the user reviews before submitting (privacy-respecting
 *   — no silent fetch).
 *
 * Capture policy (default):
 *   ✓ Uncaught Errors (window.onerror)
 *   ✓ Unhandled Promise rejections
 *   ✓ console.error()
 *   ☐ console.warn()  — user can toggle on inside the panel
 *   ✗ console.log()   — never (debug noise)
 *
 * Persistence: last 50 entries in localStorage, so a page reload doesn't
 * lose context. Toggle state and "include warns" preference also persist.
 *
 * No React dep — renders via plain DOM so it still works if React itself
 * fails to load. Usable from any AlloFlow surface (Canvas embed, standalone
 * web, marketing pages).
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.ErrorReporter) {
    console.log('[ErrorReporter] Already loaded, skipping');
    return;
  }

  // ── Google Form configuration (extracted from FB_PUBLIC_LOAD_DATA_) ──
  var FORM_BASE = 'https://docs.google.com/forms/d/e/1FAIpQLSd9dJexeOjd6fvFio9V0Jd45FDpuL7cSQNnm-BLmqyTwrPrhg/viewform?usp=pp_url';
  var ENTRY_TYPE   = '640908447';   // Type of Issue (Bug Report / Feature Request / Other)
  var ENTRY_WHAT   = '234547532';   // What happened? (the error log)
  var ENTRY_STEPS  = '1969020676';  // Steps to Reproduce / What were you doing?
  var ENTRY_BROWSER = '937961519';  // Browser & Device

  var STORAGE_KEY = 'alloflow_error_log';
  var STORAGE_PREFS = 'alloflow_error_log_prefs';
  var MAX_BUFFERED = 50;

  // ── Initial state (rehydrated from localStorage) ──
  var buffer = (function () {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  })();
  var prefs = (function () {
    try { return JSON.parse(localStorage.getItem(STORAGE_PREFS) || '{}'); }
    catch (e) { return {}; }
  })();
  var includeWarns = !!prefs.includeWarns;

  function persistBuffer() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer)); } catch (e) {}
  }
  function persistPrefs() {
    try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs)); } catch (e) {}
  }

  function record(level, message, stack, source, line, column) {
    var entry = {
      ts: new Date().toISOString(),
      level: level,                                    // 'error' | 'warn'
      message: String(message || '').slice(0, 2000),
      stack: stack ? String(stack).slice(0, 2000) : '',
      source: source ? String(source).slice(0, 200) : '',
      line: line || 0,
      column: column || 0,
      url: window.location.href.slice(0, 300)
    };
    buffer.push(entry);
    while (buffer.length > MAX_BUFFERED) buffer.shift();
    persistBuffer();
    updateBadge();
    refreshPanelIfOpen();
  }

  // ── Capture: window error events ──
  window.addEventListener('error', function (ev) {
    try {
      // Avoid capturing image/asset 404s — they're not really actionable bugs
      if (ev.target && ev.target.tagName && ev.target !== window) {
        var t = String(ev.target.tagName).toLowerCase();
        if (t === 'img' || t === 'script' || t === 'link') return;
      }
      record('error',
        ev.message || 'Unhandled error',
        (ev.error && ev.error.stack) || '',
        ev.filename || '',
        ev.lineno || 0,
        ev.colno || 0
      );
    } catch (_) {}
  }, true);

  // ── Capture: unhandled Promise rejections ──
  window.addEventListener('unhandledrejection', function (ev) {
    try {
      var r = ev.reason;
      var msg = (r && r.message) ? r.message : String(r);
      var stk = (r && r.stack) ? r.stack : '';
      record('error', 'Unhandled promise rejection: ' + msg, stk, '', 0, 0);
    } catch (_) {}
  });

  // ── Capture: console.error / console.warn (preserving original behavior) ──
  function safeStringify(args) {
    try {
      return Array.prototype.slice.call(args).map(function (a) {
        if (a && a.stack) return a.stack;
        if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack : '');
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch (_) { return String(a); }
        }
        return String(a);
      }).join(' ');
    } catch (_) { return '[unserializable]'; }
  }

  var origConsoleError = console.error.bind(console);
  console.error = function () {
    try { record('error', safeStringify(arguments), '', '', 0, 0); } catch (_) {}
    origConsoleError.apply(console, arguments);
  };
  var origConsoleWarn = console.warn.bind(console);
  console.warn = function () {
    if (includeWarns) {
      try { record('warn', safeStringify(arguments), '', '', 0, 0); } catch (_) {}
    }
    origConsoleWarn.apply(console, arguments);
  };

  // ── Build a Google-Form prefilled URL from current buffer ──
  function buildReportPayload() {
    var ua = navigator.userAgent;
    var browserDevice = ua + ' · ' + (window.screen ? (window.screen.width + 'x' + window.screen.height) : '?') +
      ' · viewport ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?');
    var errorsOnly = buffer.filter(function (e) { return e.level === 'error'; });
    var entriesToInclude = (errorsOnly.length === 0 ? buffer : errorsOnly).slice(-15);
    var what = entriesToInclude.map(function (e, i) {
      var head = '[' + (i + 1) + '] ' + e.ts + '  ' + e.level.toUpperCase() + '\n' + e.message;
      if (e.source && e.line) head += '\n  at ' + e.source + ':' + e.line + ':' + e.column;
      if (e.stack) head += '\n' + e.stack;
      return head;
    }).join('\n\n---\n\n');
    if (!what) what = '(No errors captured. Sending a manual report.)';

    var steps = 'URL: ' + window.location.href;
    if (window.location.hash) steps += '\nHash: ' + window.location.hash;
    if (window.AlloModules) {
      var loaded = Object.keys(window.AlloModules).filter(function (k) { return k !== 'ErrorReporter'; });
      if (loaded.length) steps += '\nModules loaded: ' + loaded.join(', ');
    }
    steps += '\n\n(Optional: tell me what you were doing when this happened.)';

    return {
      typeOfIssue: 'Bug Report',
      whatHappened: what.slice(0, 8000),
      stepsRepro: steps.slice(0, 4000),
      browserDevice: browserDevice.slice(0, 500)
    };
  }

  function buildPrefilledFormUrl() {
    var p = buildReportPayload();
    return FORM_BASE +
      '&entry.' + ENTRY_TYPE    + '=' + encodeURIComponent(p.typeOfIssue) +
      '&entry.' + ENTRY_WHAT    + '=' + encodeURIComponent(p.whatHappened) +
      '&entry.' + ENTRY_STEPS   + '=' + encodeURIComponent(p.stepsRepro) +
      '&entry.' + ENTRY_BROWSER + '=' + encodeURIComponent(p.browserDevice);
  }

  // ── DOM UI ──
  var badge = null;
  var panel = null;

  function ensureBadge() {
    if (badge) return;
    badge = document.createElement('button');
    badge.id = 'allo-err-badge';
    badge.type = 'button';
    badge.setAttribute('aria-label', 'View captured errors and report a bug');
    badge.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:2147483646',
      'padding:8px 14px', 'border-radius:999px',
      'background:#dc2626', 'color:#fff', 'border:2px solid #fff',
      'font:700 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'cursor:pointer', 'box-shadow:0 4px 14px rgba(0,0,0,0.3)',
      'display:none', 'align-items:center', 'gap:6px'
    ].join(';');
    badge.onclick = function () { openPanel(); };
    badge.onkeydown = function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openPanel(); }
    };
    document.body.appendChild(badge);
  }

  function updateBadge() {
    var errCount = buffer.filter(function (e) { return e.level === 'error'; }).length;
    if (!document.body) return; // still booting
    if (errCount === 0) {
      if (badge) badge.style.display = 'none';
      return;
    }
    ensureBadge();
    badge.style.display = 'inline-flex';
    badge.textContent = '⚠ ' + errCount + ' error' + (errCount === 1 ? '' : 's');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function logEntryHtml(e, idx) {
    var color = e.level === 'error' ? '#dc2626' : '#d97706';
    var bg = e.level === 'error' ? '#fef2f2' : '#fffbeb';
    var border = e.level === 'error' ? '#fecaca' : '#fde68a';
    var loc = (e.source && e.line) ? ('  ' + escapeHtml(e.source) + ':' + e.line + ':' + e.column) : '';
    return '<article style="background:' + bg + ';border:1px solid ' + border + ';border-radius:8px;padding:8px 10px;margin-bottom:6px;">' +
      '<header style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font:700 10px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.06em;color:' + color + ';">' +
      '<span>' + e.level + '</span>' +
      '<span style="color:#64748b;font-weight:500;">#' + (idx + 1) + '</span>' +
      '<span style="color:#64748b;font-weight:500;">' + escapeHtml(e.ts) + '</span>' +
      '</header>' +
      '<pre style="margin:0;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#1e293b;white-space:pre-wrap;word-break:break-word;">' +
      escapeHtml(e.message) + escapeHtml(loc) +
      (e.stack ? '\n' + escapeHtml(e.stack) : '') +
      '</pre>' +
      '</article>';
  }

  function panelHtml() {
    var visible = buffer.filter(function (e) {
      return prefs.filter === 'all' ? true : (e.level === 'error' || (prefs.filter === 'errors_warns' && e.level === 'warn'));
    });
    var entriesHtml = visible.length === 0
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">No entries match the current filter.</p>'
      : visible.slice().reverse().map(logEntryHtml).join('');

    var filterVal = prefs.filter || 'errors';

    return '<div style="background:#fff;border-radius:14px;width:min(720px,100%);max-width:720px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
      // Header
      '<header style="padding:14px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f8fafc;">' +
        '<div>' +
          '<h2 style="margin:0;font:800 16px/1.2 system-ui,sans-serif;color:#0f172a;">⚠ AlloFlow Error Reporter</h2>' +
          '<p style="margin:2px 0 0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">Captured ' + buffer.length + ' entr' + (buffer.length === 1 ? 'y' : 'ies') + '. Send to Aaron with one click.</p>' +
        '</div>' +
        '<button id="aer-close" type="button" aria-label="Close error reporter" style="background:transparent;border:1px solid #cbd5e1;color:#475569;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;line-height:1;">✕</button>' +
      '</header>' +
      // Toolbar
      '<div style="padding:10px 18px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">' +
        '<label style="display:inline-flex;align-items:center;gap:6px;font:600 11px/1 system-ui,sans-serif;color:#374151;">' +
          'Show: ' +
          '<select id="aer-filter" style="padding:5px 8px;border-radius:6px;border:1px solid #94a3b8;font:600 11px/1 system-ui,sans-serif;color:#1e293b;background:#fff;">' +
            '<option value="errors"' + (filterVal === 'errors' ? ' selected' : '') + '>Errors only</option>' +
            '<option value="errors_warns"' + (filterVal === 'errors_warns' ? ' selected' : '') + '>Errors + warnings</option>' +
            '<option value="all"' + (filterVal === 'all' ? ' selected' : '') + '>Everything captured</option>' +
          '</select>' +
        '</label>' +
        '<label style="display:inline-flex;align-items:center;gap:6px;font:600 11px/1 system-ui,sans-serif;color:#374151;cursor:pointer;">' +
          '<input type="checkbox" id="aer-warns"' + (includeWarns ? ' checked' : '') + ' style="width:14px;height:14px;cursor:pointer;">' +
          'Also capture console.warn going forward' +
        '</label>' +
        '<span style="flex:1;"></span>' +
        '<button id="aer-clear" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Clear log</button>' +
        '<button id="aer-copy" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Copy log</button>' +
      '</div>' +
      // Log scroll
      '<div role="region" aria-label="Captured error entries" style="flex:1;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' +
        entriesHtml +
      '</div>' +
      // Footer / submit
      '<footer style="padding:14px 18px;border-top:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">' +
        '<p style="margin:0;font:12px/1.4 system-ui,sans-serif;color:#64748b;flex:1;min-width:200px;">' +
          'The form opens in a new tab pre-filled with this log. You can edit it before submitting.' +
        '</p>' +
        '<button id="aer-send" type="button" style="background:#0d9488;border:none;color:#fff;padding:9px 16px;border-radius:8px;font:700 13px/1 system-ui,sans-serif;cursor:pointer;">📬 Send to Aaron</button>' +
      '</footer>' +
    '</div>';
  }

  function openPanel() {
    if (panel) { closePanel(); return; }
    panel = document.createElement('div');
    panel.id = 'allo-err-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'AlloFlow Error Reporter');
    panel.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(15,23,42,0.55)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px', 'box-sizing:border-box'
    ].join(';');
    panel.innerHTML = panelHtml();
    panel.onclick = function (ev) { if (ev.target === panel) closePanel(); };
    document.body.appendChild(panel);
    wirePanelHandlers();
    // Move focus to close button for keyboard users
    var closeBtn = document.getElementById('aer-close');
    if (closeBtn) closeBtn.focus();
    // ESC closes
    panel.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); closePanel(); }
    });
  }

  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
    if (badge) badge.focus();
  }

  function refreshPanelIfOpen() {
    if (!panel) return;
    panel.innerHTML = panelHtml();
    wirePanelHandlers();
  }

  function wirePanelHandlers() {
    var $ = function (id) { return document.getElementById(id); };
    if ($('aer-close')) $('aer-close').onclick = closePanel;
    if ($('aer-filter')) $('aer-filter').onchange = function (ev) {
      prefs.filter = ev.target.value;
      persistPrefs();
      refreshPanelIfOpen();
    };
    if ($('aer-warns')) $('aer-warns').onchange = function (ev) {
      includeWarns = !!ev.target.checked;
      prefs.includeWarns = includeWarns;
      persistPrefs();
    };
    if ($('aer-clear')) $('aer-clear').onclick = function () {
      buffer.length = 0;
      persistBuffer();
      updateBadge();
      refreshPanelIfOpen();
    };
    if ($('aer-copy')) $('aer-copy').onclick = function () {
      var p = buildReportPayload();
      var text = '== AlloFlow Error Report ==\n' +
        'Type: ' + p.typeOfIssue + '\n' +
        'Browser: ' + p.browserDevice + '\n\n' +
        'Context:\n' + p.stepsRepro + '\n\n' +
        'Log:\n' + p.whatHappened;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            $('aer-copy').textContent = 'Copied ✓';
            setTimeout(function () { if ($('aer-copy')) $('aer-copy').textContent = 'Copy log'; }, 1500);
          });
        } else {
          // Fallback: temporary textarea
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select(); document.execCommand('copy');
          document.body.removeChild(ta);
          $('aer-copy').textContent = 'Copied ✓';
          setTimeout(function () { if ($('aer-copy')) $('aer-copy').textContent = 'Copy log'; }, 1500);
        }
      } catch (_) {
        $('aer-copy').textContent = 'Copy failed';
      }
    };
    if ($('aer-send')) $('aer-send').onclick = function () {
      try {
        var url = buildPrefilledFormUrl();
        // Defensive: Google Forms imposes a URL length limit (~8000-ish chars).
        // If we exceed, drop stack traces from older entries.
        if (url.length > 7500) {
          var p = buildReportPayload();
          // Trim "what" payload more aggressively
          p.whatHappened = p.whatHappened.slice(0, 6000) + '\n\n[Log truncated due to URL length limit]';
          url = FORM_BASE +
            '&entry.' + ENTRY_TYPE    + '=' + encodeURIComponent(p.typeOfIssue) +
            '&entry.' + ENTRY_WHAT    + '=' + encodeURIComponent(p.whatHappened) +
            '&entry.' + ENTRY_STEPS   + '=' + encodeURIComponent(p.stepsRepro) +
            '&entry.' + ENTRY_BROWSER + '=' + encodeURIComponent(p.browserDevice);
        }
        var win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) {
          // Pop-up blocked — copy URL to clipboard and tell user
          try { navigator.clipboard && navigator.clipboard.writeText(url); } catch (_) {}
          alert('Pop-up blocked. The pre-filled report URL has been copied to your clipboard — paste it into a new browser tab.');
        }
      } catch (e) {
        origConsoleError('[ErrorReporter] Submit failed:', e);
      }
    };
  }

  // ── Public API on window.AlloModules ──
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ErrorReporter = {
    record: record,
    setIncludeWarns: function (v) { includeWarns = !!v; prefs.includeWarns = includeWarns; persistPrefs(); },
    getBuffer: function () { return buffer.slice(); },
    clearBuffer: function () { buffer.length = 0; persistBuffer(); updateBadge(); refreshPanelIfOpen(); },
    openPanel: openPanel,
    // Manual report — useful as a "help" entry point when nothing has crashed
    openManualReport: function () {
      // Add a synthetic entry so the badge shows + buffer has something to send
      record('error', 'Manual bug report (no crash captured)', '', '', 0, 0);
      openPanel();
    }
  };

  // Show the badge if there are pre-existing errors from a previous session.
  // document.body may not be ready yet during early load; defer.
  if (document.body) {
    updateBadge();
  } else {
    document.addEventListener('DOMContentLoaded', updateBadge);
  }

  console.log('[ErrorReporter] Loaded. Buffered entries: ' + buffer.length);
})();
