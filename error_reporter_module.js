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
 * - "Send to Developers" pre-fills a Google Form with the report and opens it
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

  // Primary submit path: the community Cloudflare Worker → PRIVATE KV. Bug reports carry error
  // logs + free text that can include FERPA-sensitive data, so they go to private KV, NOT the
  // public repo. If the worker is unreachable (e.g. not yet deployed), we fall back to the
  // pre-filled Google Form (private responses Sheet) so a report is never lost.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/submitBug';

  var STORAGE_KEY = 'alloflow_error_log';
  var STORAGE_PREFS = 'alloflow_error_log_prefs';
  var MAX_BUFFERED = 50;

  // App build tag: on desktop the UA carries alloflow-desktop/<version>; on
  // the web there is no stable equivalent, so entries tag as 'web'.
  var APP_BUILD_TAG = (function () {
    try {
      var m = navigator.userAgent.match(/alloflow-desktop\/([\d.]+)/);
      return m ? 'desktop-' + m[1] : 'web';
    } catch (e) { return 'web'; }
  })();

  // ── Initial state (rehydrated from localStorage) ──
  // Rehydration honesty (field-caught 2026-07-06): a report filed from 0.2.4
  // opened with a wall of 0.2.2-era entries — every timestamp PREDATED the
  // install — because the buffer persists across app upgrades. Stale entries
  // make fixed bugs look alive, so on load we drop (a) entries captured by a
  // DIFFERENT desktop build, and (b) entries matching the ignore list (they
  // were captured before the pattern was added).
  var buffer = (function () {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.filter(function (entry) {
        if (!entry || typeof entry !== 'object') return false;
        if (entry.v && entry.v !== APP_BUILD_TAG) return false;
        // shouldIgnore's pattern list initializes later in this module scope;
        // a throw here must skip the CHECK, not wipe the whole buffer.
        try { if (shouldIgnore(entry.message)) return false; } catch (e) {}
        return true;
      });
    }
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

  // Patterns the reporter should NOT capture — browser warnings that fire
  // through the same channels as real errors but aren't actionable. Most
  // notable: "ResizeObserver loop completed with undelivered notifications"
  // fires whenever a resize callback synchronously triggers another resize;
  // the browser aborts after one frame and the warning bubbles up as an
  // 'error' event. Real apps see it routinely (the StudentAnalytics charts
  // dispatch one on first paint, for example). Excluding it keeps the user-
  // facing "⚠ N errors" badge meaningful instead of trivially-true.
  var IGNORE_MESSAGE_PATTERNS = [
    /ResizeObserver loop /,    // ResizeObserver loop completed / limit exceeded
    // onnxruntime perf ADVISORIES from local-AI workers (Kokoro TTS, SD-Turbo,
    // whisper). "Some nodes were not assigned to the preferred execution
    // providers" + its follow-up line are expected on every session init —
    // ORT deliberately pins shape ops to CPU — but they arrive via stderr/
    // console.error and were landing in teacher bug reports as ERRORs.
    /VerifyEachNodeIsAssignedToAnEp/,
    /Some nodes were not assigned to the preferred execution providers/,
    /Rerunning with verbose output on a non-minimal build/,
  ];

  function shouldIgnore(message) {
    if (!message) return false;
    var s = String(message);
    for (var i = 0; i < IGNORE_MESSAGE_PATTERNS.length; i++) {
      if (IGNORE_MESSAGE_PATTERNS[i].test(s)) return true;
    }
    return false;
  }

  function record(level, message, stack, source, line, column) {
    if (shouldIgnore(message)) return;
    var msg = String(message || '').slice(0, 2000);
    // Coalesce a repeat of the most recent entry (same level + message) into a count rather than
    // flooding the log, the badge, and the 50-slot buffer — e.g. a recurring 401 auth error that
    // fires every few seconds. The first ts is kept; lastTs + count track the repeats so the
    // report/panel show one line with "×N" instead of N identical rows.
    var last = buffer.length ? buffer[buffer.length - 1] : null;
    if (last && last.level === level && last.message === msg) {
      last.count = (last.count || 1) + 1;
      last.lastTs = new Date().toISOString();
      persistBuffer();
      updateBadge();
      refreshPanelIfOpen();
      return;
    }
    var entry = {
      ts: new Date().toISOString(),
      level: level,                                    // 'error' | 'warn'
      message: msg,
      stack: stack ? String(stack).slice(0, 2000) : '',
      source: source ? String(source).slice(0, 200) : '',
      line: line || 0,
      column: column || 0,
      url: window.location.href.slice(0, 300),
      count: 1,
      v: APP_BUILD_TAG   // which app build captured this — stale-entry pruning key
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
  // Compact one-line-per-event rendering of a diagnostics ring for reports.
  function traceLinesForReport(entries, cap) {
    return (entries || []).slice(-(cap || 25)).map(function (e) {
      var when = '';
      try { when = new Date(e.at).toISOString().slice(11, 19); } catch (_) {}
      var detail = '';
      try { if (e.detail != null) detail = JSON.stringify(e.detail); } catch (_) { detail = '[unserializable]'; }
      if (detail.length > 110) detail = detail.slice(0, 110) + '…';
      return when + ' ' + String(e.event || '') + ' ' + detail;
    }).join('\n');
  }

  function identityLine() {
    var bits = [];
    try {
      var stamp = window.__alloBuildStamp;
      if (stamp && stamp.hash) bits.push('build ' + stamp.hash + (stamp.surface ? ' · ' + stamp.surface : ''));
    } catch (_) {}
    bits.push(APP_BUILD_TAG);
    try {
      if (typeof window.__alloModuleSnapshot === 'function') {
        var snap = window.__alloModuleSnapshot();
        if (snap.failed.length) bits.push(snap.failed.length + ' module(s) FAILED: ' + snap.failed.join(', '));
        else if (snap.pending.length) bits.push(snap.pending.length + ' module(s) still loading');
        else bits.push('all modules loaded');
      }
    } catch (_) {}
    return bits.join(' · ');
  }

  // Appended to every report: which build/surface this is, plus the tails of
  // the read-aloud and session-sync traces. A stuck read-aloud or a silent
  // sync refusal rarely THROWS — without these, reports arrived blind.
  function buildReportExtras() {
    var parts = ['== Diagnostics: ' + identityLine() + ' =='];
    try {
      var tts = (window.__alloTtsTrace || []);
      if (tts.length) parts.push('-- Read-aloud trace (last ' + Math.min(tts.length, 25) + ') --\n' + traceLinesForReport(tts, 25));
    } catch (_) {}
    try {
      var sess = (window.__alloSessionSyncTrace || []);
      if (sess.length) parts.push('-- Session sync trace (last ' + Math.min(sess.length, 15) + ') --\n' + traceLinesForReport(sess, 15));
    } catch (_) {}
    return parts.join('\n\n');
  }

  function buildReportPayload() {
    var ua = navigator.userAgent;
    var browserDevice = ua + ' · ' + (window.screen ? (window.screen.width + 'x' + window.screen.height) : '?') +
      ' · viewport ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?');
    var errorsOnly = buffer.filter(function (e) { return e.level === 'error'; });
    var entriesToInclude = (errorsOnly.length === 0 ? buffer : errorsOnly).slice(-15);
    var what = entriesToInclude.map(function (e, i) {
      var head = '[' + (i + 1) + '] ' + e.ts + '  ' + e.level.toUpperCase() + (e.count > 1 ? ('  (repeated ×' + e.count + (e.lastTs ? ', last ' + e.lastTs : '') + ')') : '') + '\n' + e.message;
      if (e.source && e.line) head += '\n  at ' + e.source + ':' + e.line + ':' + e.column;
      if (e.stack) head += '\n' + e.stack;
      return head;
    }).join('\n\n---\n\n');
    if (!what) what = '(No errors captured. Sending a manual report.)';
    try { what += '\n\n' + buildReportExtras(); } catch (_) {}

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
      // Bottom-LEFT diagnostics cluster (2026-06-19): the reading-tools FAB stack (ruler/line-focus/
      // dictation) owns bottom-RIGHT, and the pipeline diagnostics-log button was also bottom-right —
      // a bottom-right error badge stacked on top of them on small screens. The badge now sits at the
      // bottom-LEFT corner; the diagnostics-log button stacks just above it. Keep the small badge below
      // modal/first-run layers; the report panel itself still opens at maximum priority.
      'position:fixed', 'bottom:16px', 'left:16px', 'z-index:9000',
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
    if (document.body && document.body.classList.contains('alloflow-launchpad-active')) {
      if (badge) badge.style.display = 'none';
      return;
    }
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
      (e.count > 1 ? '<span style="background:' + color + ';color:#fff;font-weight:700;padding:1px 6px;border-radius:999px;">×' + e.count + '</span>' : '') +
      '</header>' +
      '<pre style="margin:0;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#1e293b;white-space:pre-wrap;word-break:break-word;">' +
      escapeHtml(e.message) + escapeHtml(loc) +
      (e.stack ? '\n' + escapeHtml(e.stack) : '') +
      '</pre>' +
      '</article>';
  }

  // ── Read-aloud / TTS diagnostics tab (2026-07-20) ──
  // The TTS pipeline writes a bounded event trace to window.__alloTtsTrace
  // (playSequence, karaoke overlay, bridge, provider routing). Surfacing it
  // here means the log is reachable even when nothing "errored" — a stuck
  // read-aloud rarely throws, it just stalls.
  var activeTab = 'errors';

  function ttsEventColor(name) {
    if (/timeout|null-url|error|fail|watchdog/.test(name)) return '#dc2626';
    if (name.indexOf('pk:') === 0) return '#0d9488';
    if (name.indexOf('karaoke:') === 0) return '#7c3aed';
    if (name.indexOf('bridge:') === 0) return '#d97706';
    if (name.indexOf('route:') === 0) return '#15803d';
    return '#334155';
  }

  function ttsTraceEntries() {
    try { return (window.__alloTtsTrace || []).slice(-120); } catch (_) { return []; }
  }

  function ttsFlagsSummary() {
    var bits = [];
    try {
      if (window.__ttsGeminiQuotaFailed) bits.push('cloud QUOTA failed');
      if (window.__ttsGeminiAuthFailed) bits.push('cloud KEY rejected');
      bits.push(window._kokoroTTS ? ('local engine ' + (window._kokoroTTS.ready ? 'ready' : 'present, not ready')) : 'no local engine');
      var route = window.__ttsLastRoute;
      if (route && route.route) bits.push('last route: ' + route.route + (route.detail ? ' (' + route.detail + ')' : ''));
    } catch (_) {}
    return bits.join(' · ') || 'no provider flags recorded yet';
  }

  function ttsEntryHtml(e) {
    var when = '';
    try { when = new Date(e.at).toLocaleTimeString(); } catch (_) {}
    var detail = '';
    try { if (e.detail != null) detail = JSON.stringify(e.detail); } catch (_) { detail = '[unserializable]'; }
    if (detail.length > 200) detail = detail.slice(0, 200) + '…';
    return '<div style="display:flex;gap:8px;align-items:baseline;padding:4px 0;border-bottom:1px solid #f1f5f9;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">' +
      '<span style="color:#94a3b8;white-space:nowrap;">' + escapeHtml(when) + '</span>' +
      '<span style="color:' + ttsEventColor(String(e.event || '')) + ';font-weight:700;white-space:nowrap;">' + escapeHtml(String(e.event || '')) + '</span>' +
      '<span style="color:#475569;word-break:break-word;">' + escapeHtml(detail) + '</span>' +
    '</div>';
  }

  function buildTtsDiagText() {
    var payload;
    try {
      payload = JSON.stringify({
        at: new Date().toISOString(),
        surface: 'error-reporter',
        userAgent: String(navigator.userAgent || '').slice(0, 120),
        flags: {
          geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
          geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
          kokoroPresent: !!window._kokoroTTS,
          kokoroReady: !!(window._kokoroTTS && window._kokoroTTS.ready),
          sharedResolver: typeof window.__alloResolveReadAloudAudio === 'function'
        },
        lastRoute: window.__ttsLastRoute || null,
        trace: ttsTraceEntries()
      }, null, 2);
    } catch (e) { payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e); }
    return payload;
  }

  // ── Session sync tab (2026-07-20) ──
  // Live-session delivery failures are usually SILENT (a privacy-gate
  // refusal once killed resource sync for 2.5 days with only a console
  // line). writeToSession + the mailbox pack sync now trace into
  // window.__alloSessionSyncTrace; the host's snapshot listener stamps
  // window.__alloSessionHealth.
  function sessionHealthSummary() {
    try {
      var h = window.__alloSessionHealth;
      if (!h || !h.code) return 'No live session joined this browser session.';
      var age = h.at ? Math.round((Date.now() - h.at) / 1000) : null;
      return 'Session ' + h.code + ' · ' + (h.transport || '?') + ' · ' + (h.role || '?') +
        ' · roster ' + (h.roster != null ? h.roster : '?') +
        ' · resources ' + (h.resources != null ? h.resources : '?') +
        (age != null ? ' · updated ' + age + 's ago' : '');
    } catch (_) { return 'Session state unavailable.'; }
  }

  function sessionTraceEntries() {
    try { return (window.__alloSessionSyncTrace || []).slice(-80); } catch (_) { return []; }
  }

  function buildSessionDiagText() {
    var payload;
    try {
      payload = JSON.stringify({
        at: new Date().toISOString(),
        surface: 'error-reporter',
        identity: identityLine(),
        health: window.__alloSessionHealth || null,
        trace: sessionTraceEntries()
      }, null, 2);
    } catch (e) { payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e); }
    return payload;
  }

  function sessionTabHtml() {
    var entries = sessionTraceEntries();
    var rows = entries.length === 0
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">No session sync activity recorded yet. Start or join a live session and sync events will appear here.</p>'
      : entries.slice().reverse().map(ttsEntryHtml).join('');
    return '<div style="padding:10px 18px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">' +
        '<span style="font:600 11px/1.4 system-ui,sans-serif;color:#475569;flex:1;min-width:200px;">' + escapeHtml(sessionHealthSummary()) + '</span>' +
        '<button id="aer-sess-refresh" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Refresh</button>' +
        '<button id="aer-sess-copy" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Copy diagnostics</button>' +
      '</div>' +
      '<div role="region" aria-label="Session sync diagnostic events" style="flex:1;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' + rows + '</div>' +
      '<footer style="padding:10px 18px;border-top:1px solid #e2e8f0;background:#fff;">' +
        '<p style="margin:0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">Shows what actually synced to students (resource counts, trims, privacy-gate refusals, mailbox pack pushes) — check here when students are missing resources.</p>' +
      '</footer>';
  }

  function ttsTabHtml() {
    var entries = ttsTraceEntries();
    var rows = entries.length === 0
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">No read-aloud activity recorded yet this session. Play any text-to-speech and events will appear here.</p>'
      : entries.slice().reverse().map(ttsEntryHtml).join('');
    return '<div style="padding:10px 18px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">' +
        '<span style="font:600 11px/1.4 system-ui,sans-serif;color:#475569;flex:1;min-width:200px;">' + escapeHtml(ttsFlagsSummary()) + '</span>' +
        '<button id="aer-tts-refresh" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Refresh</button>' +
        '<button id="aer-tts-clear" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Clear trace</button>' +
        '<button id="aer-tts-copy" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Copy diagnostics</button>' +
      '</div>' +
      '<div role="region" aria-label="Read-aloud diagnostic events" style="flex:1;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' + rows + '</div>' +
      '<footer style="padding:10px 18px;border-top:1px solid #e2e8f0;background:#fff;">' +
        '<p style="margin:0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">This trace records read-aloud/TTS activity even when nothing visibly fails — paste it into a bug report when audio stalls or plays the wrong voice.</p>' +
      '</footer>';
  }

  function panelHtml() {
    var visible = buffer.filter(function (e) {
      return prefs.filter === 'all' ? true : (e.level === 'error' || (prefs.filter === 'errors_warns' && e.level === 'warn'));
    });
    var entriesHtml = visible.length === 0
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">No errors captured this session. 🎉</p>'
      : visible.slice().reverse().map(logEntryHtml).join('');

    var filterVal = prefs.filter || 'errors';
    var onErrors = activeTab !== 'tts' && activeTab !== 'session';
    var tabStyle = function (on) {
      return 'padding:7px 14px;border:none;border-bottom:2px solid ' + (on ? '#0d9488' : 'transparent') + ';background:transparent;color:' + (on ? '#0f172a' : '#64748b') + ';font:700 12px/1 system-ui,sans-serif;cursor:pointer;';
    };

    var body;
    if (onErrors) {
      body =
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
        '<button id="aer-send" type="button" style="background:#0d9488;border:none;color:#fff;padding:9px 16px;border-radius:8px;font:700 13px/1 system-ui,sans-serif;cursor:pointer;">📬 Send to Developers</button>' +
      '</footer>';
    } else if (activeTab === 'session') {
      body = sessionTabHtml();
    } else {
      body = ttsTabHtml();
    }

    return '<div style="background:#fff;border-radius:14px;width:min(720px,100%);max-width:720px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
      // Header
      '<header style="padding:14px 18px 0;border-bottom:1px solid #e2e8f0;background:#f8fafc;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
          '<div>' +
            '<h2 style="margin:0;font:800 16px/1.2 system-ui,sans-serif;color:#0f172a;">🩺 AlloFlow Diagnostics</h2>' +
            '<p style="margin:2px 0 0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">' + (onErrors ? ('Captured ' + buffer.length + ' entr' + (buffer.length === 1 ? 'y' : 'ies') + '. Send to the developers with one click.') : (activeTab === 'session' ? 'Live-session sync activity for this session.' : 'Read-aloud & text-to-speech activity for this session.')) + '</p>' +
            '<p style="margin:2px 0 0;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#94a3b8;">' + escapeHtml(identityLine()) + '</p>' +
          '</div>' +
          '<button id="aer-close" type="button" aria-label="Close diagnostics" style="background:transparent;border:1px solid #cbd5e1;color:#475569;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;line-height:1;">✕</button>' +
        '</div>' +
        '<div role="tablist" aria-label="Diagnostics sections" style="display:flex;gap:4px;margin-top:8px;">' +
          '<button id="aer-tab-errors" type="button" role="tab" aria-selected="' + (onErrors ? 'true' : 'false') + '" style="' + tabStyle(onErrors) + '">⚠ Errors</button>' +
          '<button id="aer-tab-tts" type="button" role="tab" aria-selected="' + (activeTab === 'tts' ? 'true' : 'false') + '" style="' + tabStyle(activeTab === 'tts') + '">🔊 Read-aloud</button>' +
          '<button id="aer-tab-session" type="button" role="tab" aria-selected="' + (activeTab === 'session' ? 'true' : 'false') + '" style="' + tabStyle(activeTab === 'session') + '">🛰 Session</button>' +
        '</div>' +
      '</header>' +
      body +
      '</div>';
  }


  function openPanel(tab) {
    if (tab === 'tts' || tab === 'errors' || tab === 'session') activeTab = tab;
    if (panel) {
      // Already open: a tab request switches tabs instead of toggling closed.
      if (tab) { refreshPanelIfOpen(); return; }
      closePanel(); return;
    }
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
    if ($('aer-tab-errors')) $('aer-tab-errors').onclick = function () {
      if (activeTab !== 'errors') { activeTab = 'errors'; refreshPanelIfOpen(); }
    };
    if ($('aer-tab-tts')) $('aer-tab-tts').onclick = function () {
      if (activeTab !== 'tts') { activeTab = 'tts'; refreshPanelIfOpen(); }
    };
    if ($('aer-tab-session')) $('aer-tab-session').onclick = function () {
      if (activeTab !== 'session') { activeTab = 'session'; refreshPanelIfOpen(); }
    };
    if ($('aer-sess-refresh')) $('aer-sess-refresh').onclick = refreshPanelIfOpen;
    if ($('aer-sess-copy')) $('aer-sess-copy').onclick = function () {
      var text = buildSessionDiagText();
      var btn = $('aer-sess-copy');
      var flash = function (label) {
        if (!btn) return;
        btn.textContent = label;
        setTimeout(function () { var b = $('aer-sess-copy'); if (b) b.textContent = 'Copy diagnostics'; }, 1500);
      };
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          flash(ok ? 'Copied ✓' : 'Copy failed');
        } catch (_) { flash('Copy failed'); }
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { flash('Copied ✓'); }).catch(fallback);
        } else fallback();
      } catch (_) { fallback(); }
    };
    if ($('aer-tts-refresh')) $('aer-tts-refresh').onclick = refreshPanelIfOpen;
    if ($('aer-tts-clear')) $('aer-tts-clear').onclick = function () {
      try { if (window.__alloTtsTrace) window.__alloTtsTrace.length = 0; } catch (_) {}
      refreshPanelIfOpen();
    };
    if ($('aer-tts-copy')) $('aer-tts-copy').onclick = function () {
      var text = buildTtsDiagText();
      var btn = $('aer-tts-copy');
      var flash = function (label) {
        if (!btn) return;
        btn.textContent = label;
        setTimeout(function () { var b = $('aer-tts-copy'); if (b) b.textContent = 'Copy diagnostics'; }, 1500);
      };
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          flash(ok ? 'Copied ✓' : 'Copy failed');
        } catch (_) { flash('Copy failed'); }
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { flash('Copied ✓'); }).catch(fallback);
        } else fallback();
      } catch (_) { fallback(); }
    };
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
      
      function copyFallback(txt) {
        try {
          var ta = document.createElement('textarea');
          ta.value = txt;
          ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) {
            $('aer-copy').textContent = 'Copied ✓';
          } else {
            $('aer-copy').textContent = 'Copy failed';
          }
        } catch (_) {
          $('aer-copy').textContent = 'Copy failed';
        }
        setTimeout(function () { if ($('aer-copy')) $('aer-copy').textContent = 'Copy log'; }, 1500);
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            $('aer-copy').textContent = 'Copied ✓';
            setTimeout(function () { if ($('aer-copy')) $('aer-copy').textContent = 'Copy log'; }, 1500);
          }).catch(function () {
            copyFallback(text);
          });
        } else {
          copyFallback(text);
        }
      } catch (_) {
        copyFallback(text);
      }
    };
    if ($('aer-send')) $('aer-send').onclick = function () {
      var btn = $('aer-send');
      // Fallback: the original Google-Form path (private responses Sheet), used if the worker POST fails.
      var openFormFallback = function () {
        try {
          var url = buildPrefilledFormUrl();
          // Defensive: Google Forms imposes a URL length limit (~8000-ish chars).
          // If we exceed, drop stack traces from older entries.
          if (url.length > 7500) {
            var p = buildReportPayload();
            p.whatHappened = p.whatHappened.slice(0, 6000) + '\n\n[Log truncated due to URL length limit]';
            url = FORM_BASE +
              '&entry.' + ENTRY_TYPE    + '=' + encodeURIComponent(p.typeOfIssue) +
              '&entry.' + ENTRY_WHAT    + '=' + encodeURIComponent(p.whatHappened) +
              '&entry.' + ENTRY_STEPS   + '=' + encodeURIComponent(p.stepsRepro) +
              '&entry.' + ENTRY_BROWSER + '=' + encodeURIComponent(p.browserDevice);
          }
          var win = window.open(url, '_blank', 'noopener,noreferrer');
          if (!win) {
            if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).catch(function () {}); }
            if (window.AlloFlowUX) window.AlloFlowUX.toast('Pop-up blocked. The pre-filled report URL has been copied to your clipboard — paste it into a new browser tab.', 'error'); else alert('Pop-up blocked. The pre-filled report URL has been copied to your clipboard — paste it into a new browser tab.');
          }
        } catch (e) { origConsoleError('[ErrorReporter] Submit failed:', e); }
      };
      // Primary: POST to the worker → private KV. No new tab, no PII to a public surface.
      var p = buildReportPayload();
      var payload = { type: p.typeOfIssue, what: p.whatHappened, steps: p.stepsRepro, browser: p.browserDevice, url: (location.href || '').slice(0, 500) };
      btn.disabled = true; btn.textContent = 'Sending…';
      var done = function (text, color) { if (!$('aer-send')) return; var b = $('aer-send'); b.textContent = text; if (color) b.style.background = color; setTimeout(closePanel, 1300); };
      var fail = function () { if ($('aer-send')) { $('aer-send').disabled = false; $('aer-send').textContent = '📬 Send to Developers'; } openFormFallback(); };
      try {
        fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: r.ok, j: null }; }); })
          .then(function (res) { if (res.ok && res.j && res.j.ok) done('Sent ✓ Thank you!', '#15803d'); else fail(); })
          .catch(function () { fail(); });
      } catch (_) { fail(); }
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
    // Direct deep-link to the read-aloud/TTS trace tab (AI backend settings
    // exposes this so the log is reachable with ZERO captured errors — a
    // stuck read-aloud rarely throws, it just stalls).
    openReadAloudLog: function () { openPanel('tts'); },
    // Alias kept for API stability — just opens the panel. The form's "what
    // happened?" field falls back to "(No errors captured. Sending a manual
    // report.)" when the buffer is empty, so we don't need to inject anything.
    openManualReport: openPanel
  };
  // Global convenience hook for host surfaces (settings panels, help flows).
  try { window.__alloOpenDiagnosticsLog = function (tab) { openPanel(tab === 'tts' || tab === 'session' ? tab : 'errors'); }; } catch (_) {}

  // Show the badge if there are pre-existing errors from a previous session.
  // document.body may not be ready yet during early load; defer.
  if (document.body) {
    updateBadge();
  } else {
    document.addEventListener('DOMContentLoaded', updateBadge);
  }

  console.log('[ErrorReporter] Loaded. Buffered entries: ' + buffer.length);
})();
