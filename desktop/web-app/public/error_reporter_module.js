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
 * - "Send to Developers" saves the report privately and keeps a receipt visible.
 *   If saving fails, the user can copy the log into a separate report form.
 *
 * Capture policy (default):
 *   ✓ Uncaught Errors (window.onerror)
 *   ✓ Unhandled Promise rejections
 *   ✓ console.error()
 *   ☐ console.warn()  — user can toggle on inside the panel
 *   ✗ console.log()   — never (debug noise)
 *
 * Persistence: last 50 entries for 24 h in THIS browser tab (sessionStorage),
 * so a page reload doesn't lose context, but the next person on a shared
 * device does not inherit the log. The badge counts only THIS page load's
 * errors; earlier ones in the tab stay in the log and reports, labelled.
 * Toggle state and "include warns" preference persist on the device.
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
  // public repo. If the worker is unreachable, offer the separate Google Form
  // (private responses Sheet) and make clear that it still requires submission.
  var SUBMIT_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/submitBug';
  var SUBMIT_TIMEOUT_MS = 20000;
  var DESCRIPTION_MAX_LENGTH = 2000;
  var MAX_DIAGNOSTIC_TEXT_CHARS = 64 * 1024;
  var OMITTED_DIAGNOSTIC_TEXT = '[Diagnostic text omitted because it exceeds the supported size limit.]';

  // Deployment convenience, not an authorization boundary against page code.
  // Never read approval from browser storage. A district must also enforce its
  // chosen support destinations through its service and network controls.
  function getSupportReportingPolicy() {
    var blocked = { valid: false, enabled: false, endpoint: '', allowGoogleFormFallback: false, signature: 'invalid' };
    try {
      if (!Object.prototype.hasOwnProperty.call(window, 'ALLOFLOW_SUPPORT_REPORTING_POLICY')) {
        return { valid: true, enabled: true, endpoint: SUBMIT_URL, allowGoogleFormFallback: true,
          signature: JSON.stringify([true, SUBMIT_URL, true]) };
      }
      var value = window.ALLOFLOW_SUPPORT_REPORTING_POLICY;
      if (!value || typeof value !== 'object' || Array.isArray(value)
          || Object.keys(value).some(function (key) { return !['version', 'enabled', 'endpoint', 'allowGoogleFormFallback'].includes(key); })
          || value.version !== 1 || typeof value.enabled !== 'boolean'
          || (value.endpoint !== undefined && typeof value.endpoint !== 'string')
          || (value.allowGoogleFormFallback !== undefined && typeof value.allowGoogleFormFallback !== 'boolean')) return blocked;
      var endpoint = value.endpoint === undefined ? SUBMIT_URL : value.endpoint;
      var parsed = new URL(endpoint);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash
          || endpoint.trim() !== endpoint || /[?#]/.test(endpoint)) return blocked;
      endpoint = parsed.href;
      var allowForm = value.enabled && value.allowGoogleFormFallback === true;
      return { valid: true, enabled: value.enabled, endpoint: endpoint, allowGoogleFormFallback: allowForm,
        signature: JSON.stringify([value.enabled, endpoint, allowForm]) };
    } catch (_) { return blocked; }
  }

  var STORAGE_KEY = 'alloflow_error_log';
  var STORAGE_PREFS = 'alloflow_error_log_prefs';
  var MAX_BUFFERED = 50;
  // The log is per tab: logged text can hold a student's answer or a roster
  // entry, and on a shared school device it used to sit in localStorage for
  // 24 h, readable by whoever signed in next. Those device-wide copies are
  // deleted here. A blocked sessionStorage keeps the log in memory only.
  var logStore = (function () { try { return window.sessionStorage || null; } catch (e) { return null; } })();
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

  // App build tag: on desktop the UA carries alloflow-desktop/<version>; on
  // the web there is no stable equivalent, so entries tag as 'web'.
  var APP_BUILD_TAG = (function () {
    try {
      var m = navigator.userAgent.match(/alloflow-desktop\/([\d.]+)/);
      return m ? 'desktop-' + m[1] : 'web';
    } catch (e) { return 'web'; }
  })();

  // Per-page-load id. The buffer outlives the page (and, on a shared school
  // device, the user), and 'web' never changes, so the build check below
  // never pruned anything on the web: a student joining a live session was
  // shown "15 errors" from weeks-old loads. The badge counts this load only.
  var LOAD_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  var MAX_AGE_MS = 24 * 60 * 60 * 1000;

  // Live-session and homework links carry a join secret (?allo_mb= /
  // ?allo_mbp= : base64 JSON holding the mailbox URL and key). Entries kept
  // it in localStorage and every bug report sent it. Scrub wherever a URL
  // or message is stored or sent.
  function isCredentialField(key) {
    return /^(?:authorization|proxy[-_]authorization|x[-_](?:goog[-_])?api[-_]key|api[-_]?key|access[-_]?token|refresh[-_]?token|id[-_]?token|token|secret|client[-_]?secret|password|passwd|credential|private[-_]?key|session[-_]?(?:id|token|secret)|cookie|set[-_]cookie)$/i.test(key);
  }
  function redactSecrets(s, nesting) {
    if (!s) return s || '';
    // Omit the whole value before parsing or regular-expression work. Taking
    // a prefix first could leave a truncated credential that no longer matches.
    if (typeof s === 'string' && s.length > MAX_DIAGNOSTIC_TEXT_CHARS) return OMITTED_DIAGNOSTIC_TEXT;
    var depth = nesting || 0;
    var text = String(s);
    if (text.length > MAX_DIAGNOSTIC_TEXT_CHARS) return OMITTED_DIAGNOSTIC_TEXT;
    if (depth < 3) {
      // Server bodies and redirect targets are often escaped or URL-encoded.
      // Decode only structured quoted strings/URLs, with a strict recursion
      // bound, and retain the original representation when nothing is removed.
      text = text.replace(/"(?:\\.|[^"\\])*"/g, function (quoted, offset, source) {
        try {
          var decoded = JSON.parse(quoted);
          if (isCredentialField(decoded) && /^\s*:/.test(source.slice(offset + quoted.length))) return JSON.stringify(decoded);
          var cleaned = redactSecrets(decoded, depth + 1);
          return cleaned === decoded ? quoted : JSON.stringify(cleaned);
        } catch (_) { return quoted; }
      });
      text = text.replace(/\b(?:https?|wss?|ftp)%(?:25){0,2}3A%(?:25){0,2}2F%(?:25){0,2}2F[^\s"'<>;&]+/gi, function (encoded) {
        var decoded = encoded, layers = 0;
        try {
          while (layers < 3 && !/^[a-z][a-z0-9+.-]*:\/\//i.test(decoded)) {
            var next = decodeURIComponent(decoded);
            if (next === decoded) break;
            decoded = next; layers++;
          }
          if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(decoded)) return encoded;
          var cleaned = redactSecrets(decoded, depth + 1);
          if (cleaned === decoded) return encoded;
          while (layers-- > 0) cleaned = encodeURIComponent(cleaned);
          return cleaned;
        } catch (_) { return encoded; }
      });
    }
    return text
      .replace(/-----BEGIN ([A-Z0-9 ]*PRIVATE KEY)-----[\s\S]*?(?:-----END \1-----|$)/g, '[redacted private key]')
      .replace(/\b(Bearer|Basic)\s+([A-Za-z0-9+/_=.-]+)/gi, function (value, scheme, token) {
        if (scheme.toLowerCase() === 'basic') { try { if (atob(token).indexOf(':') < 0) return value; } catch (_) { return value; } }
        else if (token.length < 8) return value;
        return scheme + ' [redacted]';
      })
      .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, '[redacted]')
      .replace(/(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,})\b/g, '[redacted]')
      .replace(/(\b(?:cookie|set-cookie)\s*:\s*)(?!["'])[^\r\n]*/gi, '$1[redacted]')
      .replace(/(^|[^A-Za-z0-9_-])(["']?)([A-Za-z][A-Za-z0-9_-]*)(\2\s*[:=]\s*)(\[redacted\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;&}\]]+)/g, function (whole, prefix, keyQuote, key, separator, value) {
        if (!isCredentialField(key)) return whole;
        var quote = value[0] === '"' || value[0] === "'" ? value[0] : '';
        return prefix + keyQuote + key + separator + quote + '[redacted]' + quote;
      })
      .replace(/\b([A-Za-z][A-Za-z0-9+.-]{0,31}:\/\/)[^\s\/?#@]+@/g, '$1')
      .replace(/\b(?:https?|wss?|ftp):\/\/[^\s"'<>]+/gi, function (raw) {
        var ending = raw.match(/[),.;}]+$/);
        var suffix = ending ? ending[0] : '';
        try {
          var url = new URL(suffix ? raw.slice(0, -suffix.length) : raw);
          url.username = ''; url.password = '';
          Array.from(url.searchParams.keys()).forEach(function (key) {
            if (/^(?:allo_(?:mbp?|pack))$|key|token|secret|passw(?:or)?d|auth|signature|credential|session[-_]?id/i.test(key)) url.searchParams.set(key, '[redacted]');
            else if (depth < 3) {
              var value = url.searchParams.get(key);
              var cleaned = redactSecrets(value, depth + 1);
              if (cleaned !== value) url.searchParams.set(key, cleaned);
            }
          });
          if (url.hash) url.hash = '[redacted]';
          return url.href.replace(/%5Bredacted%5D/gi, '[redacted]') + suffix;
        } catch (_) { return raw; }
      })
      .replace(/([?&#]allo_(?:mbp?|pack)=)[^&#\s"']*/g, '$1[redacted]')
      .replace(/([?&#][\w.-]*(?:key|token|secret|passw(?:or)?d|auth|signature|credential|session[-_]?id)[\w.-]*=)[^&#\s"']*/gi, '$1[redacted]');
  }

  // Personal details are scrubbed from everything sent to support, whoever is
  // using the app: a student can end up in teacher mode, so the view is never a
  // guarantee. A log-tuned subset of IdentifierRedaction.scrubIdentifiers (that
  // module may be the one that failed to load): phones need separators and
  // generic dates stay, because bare digit runs and dates are build stamps and
  // timestamps in a log. tests/error_reporter_personal_info.test.js holds parity.
  function scrubPersonalInfo(s) {
    if (!s) return s || '';
    return String(s)
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]')
      .replace(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g, '[phone]')
      .replace(/\b(student\s*id|district\s*id|medicaid|case\s*(?:no|number)|dob|date\s+of\s+birth|birth\s*date)(\s*[:#-]?\s*)[A-Z0-9][A-Z0-9\/.-]*/gi, '$1$2[id]')
      .replace(/\b\d{1,5}\s+[A-Z][A-Za-z]*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Way|Place|Pl|Terrace|Ter)\b\.?/g, '[address]')
      .replace(/\b(Mr|Mrs|Ms|Mx|Dr|Miss)\.?\s+[A-Z][a-z]+(?:[ -][A-Z][a-z]+)?/g, '$1. [name]')
      // Chrome quotes the start of the text that failed to parse:
      // Unexpected token 'J', "Jordan wro"... is not valid JSON
      .replace(/"(?:\\.|[^"\\]){0,120}"(?:\.\.\.)?(\s+is not valid JSON)/g, '"…"$1');
  }
  // Engine messages use a small vocabulary, so in the default report any other
  // capitalised word is treated as a possible name. Code names (MiscModals,
  // TypeError) and acronyms do not match the plain-word shape and stay.
  var ENGINE_WORDS = /^(?:Uncaught|Unhandled|Error|Cannot|Can|Failed|Unexpected|Invalid|Maximum|Minified|Script|Load|Loading|Network|Request|Response|The|This|That|A|An|Not|No|Null|Undefined|Object|Array|Function|Promise|Module|Import|Export|Permission|Access|Blocked|Origin|Resource|Fetch|Rejection|Property|Properties|Element|Node|Document|Window|Canvas|Audio|Context|Media|Device|Storage|Quota|Database|Transaction|Index|Key|Value|Type|Message|Stack|Code|Status|State|Event|Listener|React|Component|Hook|Render|Rendered|Too|Many|Missing|Unknown|Unable|Could|Did|Does|Is|In|At|On|For|Of|To|And|Or|Expected|Received|Timeout|Timed|Aborted|Denied|Unsupported|Read|Write|Reading|Setting|Google|Gemini|Chrome|Safari|Firefox|Edge|Kokoro|Firebase|Firestore|Cloudflare|Worker|Service|Tool|Lab|Saved|Voice)$/;
  function maskLikelyNames(s) {
    return String(s).replace(/\b[A-Z][a-z]+\b/g, function (w) { return ENGINE_WORDS.test(w) ? w : '[…]'; });
  }
  // Roster names on a teacher's device. The roster keeps codenames only, but a
  // teacher can type a real name as a codename, so every one is scrubbed. Single
  // name parts need IdentifierRedaction's common-word guard ("Will", "Brave");
  // without it only full names are removed rather than blanking ordinary words.
  var rosterCache = { at: 0, names: [] };
  function rosterNames() {
    if (Date.now() - rosterCache.at < 5000) return rosterCache.names;
    var names = [];
    try {
      var roster = JSON.parse(window.localStorage.getItem('alloflow_roster_key') || 'null');
      var students = roster && roster.students && typeof roster.students === 'object' ? roster.students : {};
      names = Object.keys(students).map(function (n) { return String(n).trim(); }).filter(function (n) { return n.length >= 2 && n.length <= 80; });
    } catch (_) {}
    rosterCache = { at: Date.now(), names: names };
    return names;
  }
  // Full names match in any case. A single part matches only as written: codenames
  // are often adjective-animal pairs, and "be brave" must survive "Brave Otter".
  function nameRegExp(name, anyCase) {
    var words = name.split(/\s+/).filter(Boolean).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
    return new RegExp('(^|[^\\w])(' + words.join('[\\s,]+') + ')(?![\\w])', anyCase ? 'gi' : 'g');
  }
  function scrubRosterNames(s) {
    if (!s) return s || '';
    var names = rosterNames();
    if (!names.length) return s;
    var ir = window.AlloModules && window.AlloModules.IdentifierRedaction;
    var full = [], parts = [];
    names.forEach(function (n) {
      full.push(n);
      var words = n.split(/\s+/).filter(Boolean);
      if (words.length > 1) full.push(words.slice().reverse().join(', '));
      if (ir && typeof ir.nameRedactionParts === 'function') {
        try { (ir.nameRedactionParts(n).safe || []).forEach(function (p) { if (p.length >= 3 && parts.indexOf(p) === -1) parts.push(p); }); } catch (_) {}
      }
    });
    var out = String(s);
    full.sort(function (a, b) { return b.length - a.length; }).forEach(function (n) { out = out.replace(nameRegExp(n, true), '$1[student]'); });
    parts.sort(function (a, b) { return b.length - a.length; }).forEach(function (n) { out = out.replace(nameRegExp(n, false), '$1[student]'); });
    return out;
  }
  function redactOutgoing(s) { return scrubRosterNames(scrubPersonalInfo(redactSecrets(s))); }
  // The host publishes its posture for lazy modules; anything else counts as a
  // learner, the safe side.
  function reporterPosture() {
    try { return window.__alloPendingCoachPosture === 'educator' ? 'educator' : 'learner'; } catch (_) { return 'learner'; }
  }
  // Student view (published by the host; families keep full diagnostics): no
  // error badge, and the panel is only the report form. The raw log can hold
  // earlier users' text on a shared device. An older host never sets the flag,
  // so it keeps today's behavior.
  function quietStudentView() {
    try { return window.__alloStudentView === true; } catch (_) { return false; }
  }

  function sanitizeDiagnosticValue(value, depth, seen) {
    if (typeof value === 'string') return redactSecrets(value);
    if (!value || typeof value !== 'object') return value;
    if ((depth || 0) >= 8) return '[omitted nested diagnostic]';
    var visited = seen || new WeakSet();
    if (visited.has(value)) return '[circular diagnostic]';
    visited.add(value);
    var output = Array.isArray(value) ? [] : {};
    Object.keys(value).forEach(function (key) {
      var safeKey = redactSecrets(key);
      if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') return;
      output[safeKey] = isCredentialField(key)
        ? '[redacted]' : sanitizeDiagnosticValue(value[key], (depth || 0) + 1, visited);
    });
    return output;
  }

  // ── Initial state (rehydrated from this tab's sessionStorage) ──
  // Rehydration honesty (field-caught 2026-07-06): a report filed from 0.2.4
  // opened with a wall of 0.2.2-era entries — every timestamp PREDATED the
  // install — because the buffer persists across app upgrades. Stale entries
  // make fixed bugs look alive, so on load we drop (a) entries captured by a
  // DIFFERENT desktop build, and (b) entries matching the ignore list (they
  // were captured before the pattern was added).
  var buffer = (function () {
    try {
      var stored = JSON.parse((logStore && logStore.getItem(STORAGE_KEY)) || '[]');
      if (!Array.isArray(stored)) return [];
      var now = Date.now();
      return stored.filter(function (entry) {
        if (!entry || typeof entry !== 'object') return false;
        if (entry.v && entry.v !== APP_BUILD_TAG) return false;
        // Age is the only pruning the web gets (see LOAD_ID).
        var seen = Date.parse(entry.lastTs || entry.ts);
        if (!(seen > now - MAX_AGE_MS)) return false;
        // shouldIgnore's pattern list initializes later in this module scope;
        // a throw here must skip the CHECK, not wipe the whole buffer.
        try { if (shouldIgnore(entry.message)) return false; } catch (e) {}
        return true;
      }).map(function (entry) { return sanitizeDiagnosticValue(entry); });
    }
    catch (e) { return []; }
  })();
  var prefs = (function () {
    try { return JSON.parse(localStorage.getItem(STORAGE_PREFS) || '{}'); }
    catch (e) { return {}; }
  })();
  var includeWarns = !!prefs.includeWarns;

  function persistBuffer() {
    buffer = buffer.map(function (entry) { return sanitizeDiagnosticValue(entry); });
    try { if (logStore) logStore.setItem(STORAGE_KEY, JSON.stringify(buffer)); } catch (e) {}
  }
  function persistPrefs() {
    try { localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs)); } catch (e) {}
  }
  persistBuffer();

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

  function record(level, message, stack, source, line, column, api) {
    if (shouldIgnore(message)) return;
    var msg = redactSecrets(String(message || '')).slice(0, 2000);
    // Coalesce a repeat of the most recent entry (same level + message) into a count rather than
    // flooding the log, the badge, and the 50-slot buffer — e.g. a recurring 401 auth error that
    // fires every few seconds. The first ts is kept; lastTs + count track the repeats so the
    // report/panel show one line with "×N" instead of N identical rows.
    var last = buffer.length ? buffer[buffer.length - 1] : null;
    if (last && last.load === LOAD_ID && last.level === level && last.message === msg
        && (!api ? !last.api : last.api && last.api.requestId === api.requestId && last.api.state === api.state)) {
      last.count = (last.count || 1) + 1;
      last.lastTs = new Date().toISOString();
      persistBuffer();
      updateBadge();
      refreshPanelForLog();
      return;
    }
    var entry = {
      ts: new Date().toISOString(),
      level: level,                                    // 'error' | 'warn'
      message: msg,
      stack: stack ? redactSecrets(String(stack)).slice(0, 2000) : '',
      source: source ? redactSecrets(String(source)).slice(0, 200) : '',
      line: line || 0,
      column: column || 0,
      url: redactSecrets(window.location.href).slice(0, 300),
      count: 1,
      v: APP_BUILD_TAG,  // which app build captured this — stale-entry pruning key
      load: LOAD_ID,      // which page load - only this load's errors reach the badge
      ...(api ? { api: sanitizeDiagnosticValue(api) } : {})
    };
    buffer.push(entry);
    while (buffer.length > MAX_BUFFERED) buffer.shift();
    persistBuffer();
    updateBadge();
    refreshPanelForLog();
  }

  function receiveApiFeedback(detail) {
    if (!detail || !/^[A-Za-z0-9_-]{1,96}$/.test(detail.requestId || '')) return;
    if (!['pending', 'retrying', 'succeeded', 'failed', 'cancelled'].includes(detail.state)) return;
    var requestId = detail.requestId;
    if (detail.state === 'succeeded' || detail.state === 'cancelled') {
      buffer.forEach(function (entry) {
        if (entry.load === LOAD_ID && entry.api && entry.api.requestId === requestId) {
          entry.api.recovered = detail.state;
        }
      });
      persistBuffer();
      updateBadge();
      refreshPanelForLog();
      return;
    }
    if (detail.state !== 'retrying' && detail.state !== 'failed') return;
    var api = {
      requestId: requestId,
      state: detail.state,
      operation: redactSecrets(detail.operation || 'API request').slice(0, 40),
      kind: ['auth', 'quota', 'config', 'transient', 'refusal', 'other'].includes(detail.kind) ? detail.kind : 'other',
      httpStatus: Number.isInteger(detail.httpStatus) && detail.httpStatus >= 100 && detail.httpStatus <= 599 ? detail.httpStatus : null,
      attempt: Number.isInteger(detail.attempt) && detail.attempt >= 0 ? Math.min(detail.attempt, 100) : null
    };
    var message = detail.message || (detail.state === 'failed' ? 'The request failed. Review its details and retry when the cause is resolved.' : 'The request is retrying.');
    record(detail.state === 'failed' ? 'error' : 'warn', message, detail.technical || '', '', 0, 0, api);
  }
  window.addEventListener('alloflow:api-feedback', function (event) {
    try { receiveApiFeedback(event.detail); } catch (_) {}
  });

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
  function traceDetail(e) {
    if (!e || e.detail != null) return e ? e.detail : null;
    var d = null;
    Object.keys(e).forEach(function (k) {
      if (k !== 'at' && k !== 'event') { d = d || {}; d[k] = e[k]; }
    });
    return d;
  }

  function traceLinesForReport(entries, cap) {
    return (entries || []).slice(-(cap || 25)).map(function (e) {
      var when = '';
      try { when = new Date(e.at).toISOString().slice(11, 19); } catch (_) {}
      var detail = '';
      try { var d = traceDetail(e); if (d != null) detail = JSON.stringify(sanitizeDiagnosticValue(d)); } catch (_) { detail = '[unserializable]'; }
      if (detail.length > 110) detail = detail.slice(0, 110) + '…';
      return when + ' ' + redactSecrets(String(e.event || '')) + ' ' + detail;
    }).join('\n');
  }


  function moduleLoadTraceLines() {
    var stages = ['module-wait', 'blueprint-preflight', 'blueprint-generation', 'background-queue'];
    var outcomes = ['started', 'slow', 'ready', 'recovered', 'failed', 'timeout', 'cancelled', 'completed', 'partial', 'blocked', 'waiting', 'stopped', 'paused'];
    var statuses = ['queued', 'pending', 'loaded', 'failed', 'idle', 'unknown'];
    var idPattern = /^ml-[a-z0-9-]{1,80}$/i;
    var count = function (v) { return Number.isInteger(v) && v >= 0 ? Math.min(v, 10000) : 0; };
    try {
      var entries = Array.isArray(window.__alloModuleLoadTrace) ? window.__alloModuleLoadTrace : [];
      var lines = entries.slice(-60).filter(function (e) {
        return e && e.schemaVersion === 1 && stages.indexOf(e.stage) >= 0 && outcomes.indexOf(e.outcome) >= 0
          && idPattern.test(e.attemptId || '') && idPattern.test(e.correlationId || '');
      }).slice(-8).map(function (e) {
        var date = Number.isFinite(e.at) ? new Date(e.at) : null;
        var when = date && Number.isFinite(date.getTime()) ? date.toISOString().slice(11, 19) : '?';
        var elapsed = Number.isFinite(e.elapsedMs) ? Math.max(0, Math.min(Math.round(e.elapsedMs), 86400000)) : 0;
        var modules = (Array.isArray(e.modules) ? e.modules : []).filter(function (m) {
          return m && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(m.name || '') && statuses.indexOf(m.status) >= 0;
        }).slice(0, 8).map(function (m) { return m.name + ':' + m.status; }).join(',');
        var counts = e.counts || {};
        return when + ' ' + e.stage + '/' + e.outcome + ' ' + elapsed + 'ms attempt=' + e.attemptId
          + ' group=' + e.correlationId + ' queued=' + count(counts.queued) + ' pending=' + count(counts.pending)
          + ' failed=' + count(counts.failed) + (modules ? ' [' + modules + ']' : '');
      });
      var kept = [];
      var used = 0;
      for (var i = lines.length - 1; i >= 0; i--) {
        if (used + lines[i].length + 1 > 2800) break;
        kept.unshift(lines[i]);
        used += lines[i].length + 1;
      }
      return kept.join('\n');
    } catch (_) { return ''; }
  }

  function identityLine() {
    var bits = [];
    try {
      var stamp = window.__alloBuildStamp;
      if (stamp && stamp.hash) bits.push('build ' + stamp.hash + (stamp.surface ? ' · ' + stamp.surface : ''));
      if (stamp && /^\d{4}-\d{2}-\d{2}-stall-v\d+$/.test(stamp.hostLoaderRevision || '')) bits.push('loader ' + stamp.hostLoaderRevision);
    } catch (_) {}
    bits.push(APP_BUILD_TAG);
    try {
      var snap = typeof window.__alloModuleSnapshot === 'function' ? window.__alloModuleSnapshot() : null;
      if (!snap || !Array.isArray(snap.failed) || !Array.isArray(snap.pending)) {
        bits.push('module status unavailable');
      } else {
        var queued = Array.isArray(snap.queued) ? snap.queued : [];
        if (snap.failed.length) {
          var failedNames = snap.failed.filter(function (name) { return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(name); }).slice(0, 8);
          bits.push(snap.failed.length + ' module(s) FAILED: ' + failedNames.join(', ') + (snap.failed.length > failedNames.length ? ' …' : ''));
        }
        if (snap.pending.length) bits.push(snap.pending.length + ' module(s) still loading');
        if (queued.length) bits.push(queued.length + ' module(s) queued');
        if (!Array.isArray(snap.queued)) bits.push('queue status unavailable');
        else if (!snap.failed.length && !snap.pending.length && !queued.length) bits.push('all modules loaded');
      }
    } catch (_) { bits.push('module status unavailable'); }
    return redactSecrets(bits.join(' · '));
  }

  // Appended to every report: which build/surface this is, plus the tails of
  // the read-aloud and session-sync traces. A stuck read-aloud or a silent
  // sync refusal rarely THROWS — without these, reports arrived blind.
  function buildReportExtras() {
    var parts = ['== Diagnostics: ' + identityLine() + ' =='];
    var moduleTrace = moduleLoadTraceLines();
    if (moduleTrace) parts.push('-- Tool-loading trace (latest attempts) --\n' + moduleTrace);
    var compat = compatReportLines();
    if (compat) parts.push(compat);
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

  function buildCapturedReportPayload() {
    var ua = navigator.userAgent;
    var browserDevice = ua + ' · ' + (window.screen ? (window.screen.width + 'x' + window.screen.height) : '?') +
      ' · viewport ' + (window.innerWidth || '?') + 'x' + (window.innerHeight || '?');
    var errorsOnly = buffer.filter(function (e) { return e.level === 'error'; });
    var entriesToInclude = (errorsOnly.length === 0 ? buffer : errorsOnly).slice(-15);
    var nowCount = errorsOnly.filter(countsTowardBadge).length;
    if (!fullLogRequested()) return buildSafeReportPayload(entriesToInclude, nowCount, browserDevice);
    var what = entriesToInclude.map(function (e, i) {
      var tags = entryTags(e);
      var head = '[' + (i + 1) + '] ' + e.ts + '  ' + e.level.toUpperCase() + (e.count > 1 ? ('  (repeated ×' + e.count + (e.lastTs ? ', last ' + e.lastTs : '') + ')') : '') + (tags.length ? '  [' + tags.join('; ') + ']' : '') + '\n' + e.message;
      if (e.source && e.line) head += '\n  at ' + e.source + ':' + e.line + ':' + e.column;
      if (e.stack) head += '\n' + e.stack;
      return head;
    }).join('\n\n---\n\n');
    if (!what) what = '(No errors captured. Sending a manual report.)';
    else what = 'This page load: ' + nowCount + ' unresolved error' + (nowCount === 1 ? '' : 's') + '. Others below are labelled.\n\n' + what;
    try { what = redactSecrets(buildReportExtras()).slice(0, 4000) + '\n\n' + what; } catch (_) {}
    what = redactSecrets(what);
    var steps = 'URL: ' + redactSecrets(window.location.href);
    if (window.location.hash) steps += '\nURL fragment omitted.';
    if (window.AlloModules) {
      var loaded = Object.keys(window.AlloModules).filter(function (k) { return k !== 'ErrorReporter'; });
      if (loaded.length) steps += '\nModules loaded: ' + loaded.join(', ');
    }
    steps += '\n\n(Optional: tell me what you were doing when this happened.)';

    var captured = sanitizeDiagnosticValue({
      typeOfIssue: 'Bug Report',
      whatHappened: redactOutgoing(what).slice(0, 8000),
      stepsRepro: redactOutgoing(steps).slice(0, 4000),
      browserDevice: redactSecrets(browserDevice).slice(0, 500),
      url: redactOutgoing(window.location.href).slice(0, 500)
    });
    // Redaction can lengthen a cut URL ("https://host" -> "https://host/"). Cap
    // after it, as review does, or the first confirm reports a false credential removal.
    captured.whatHappened = captured.whatHappened.slice(0, 8000);
    captured.stepsRepro = captured.stepsRepro.slice(0, 4000);
    return captured;
  }

  // The default report, in every view: technical facts only, never text the app
  // logged. console.error arguments can hold a student's answer, a roster entry
  // or a prompt, and nobody reads a long log before confirming, so the captured
  // text stays on the device unless a teacher-view user opts into the full log.
  var APP_MARKER = /^\s*(\[[A-Za-z][\w .:\/-]{0,40}\])\s*([A-Za-z][\w.-]{0,40})?/;
  function safeEntryLine(e, i) {
    var tags = entryTags(e);
    var line = '[' + (i + 1) + '] ' + e.ts + '  ' + e.level.toUpperCase() + (e.count > 1 ? '  (repeated ×' + e.count + ')' : '') + (tags.length ? '  [' + tags.join('; ') + ']' : '');
    var first = String(e.message || '').split('\n')[0];
    var marker = first.match(APP_MARKER);
    if (e.source || e.stack) {
      // An engine exception: keep its type and wording, elide long quoted values.
      line += '\n  ' + maskLikelyNames(scrubPersonalInfo(first.replace(/(["'`])[^"'`]{25,}\1/g, '$1…$1'))).slice(0, 140);
      if (e.source && e.line) line += '\n  at ' + String(e.source).split(/[?#]/)[0].split(/[\/\\]/).pop() + ':' + e.line;
    } else if (marker) {
      // An app diagnostic: only its tag and the module it names ("[CDN-FAIL] MiscModals").
      var named = marker[2] && window.AlloModules && window.AlloModules[marker[2]] ? marker[2] : maskLikelyNames(scrubPersonalInfo(marker[2] || ''));
      line += '\n  ' + marker[1] + (named ? ' ' + named : '') + ' (rest of the message not included)';
    } else {
      line += '\n  (message text from the app is not included)';
    }
    return line;
  }
  function safePageUrl() {
    try {
      var u = new URL(window.location.href);
      if (u.protocol === 'blob:') u = new URL(u.pathname);
      return u.origin + u.pathname;
    } catch (_) { return '(unknown page)'; }
  }
  function buildSafeReportPayload(entries, nowCount, browserDevice) {
    var lines = entries.map(safeEntryLine).join('\n');
    var what = (lines ? 'This page load: ' + nowCount + ' unresolved error' + (nowCount === 1 ? '' : 's') + '.\n\n' + lines : '(No errors captured.)');
    try {
      var trace = moduleLoadTraceLines();
      var compat = compatReportLines();
      what = '== Diagnostics: ' + identityLine() + ' ==' + (trace ? '\n-- Tool-loading trace (latest attempts) --\n' + trace : '') + (compat ? '\n' + compat : '') + '\n\n' + what;
    } catch (_) {}
    var steps = 'Page: ' + safePageUrl() + '\nView: ' + (reporterPosture() === 'educator' ? 'teacher' : 'student') + ' mode';
    if (window.AlloModules) {
      var loaded = Object.keys(window.AlloModules).filter(function (k) { return k !== 'ErrorReporter'; });
      if (loaded.length) steps += '\nModules loaded: ' + loaded.join(', ');
    }
    return {
      typeOfIssue: 'Bug Report',
      whatHappened: redactOutgoing(what).slice(0, 8000),
      stepsRepro: redactOutgoing(steps).slice(0, 4000),
      browserDevice: redactSecrets(browserDevice).slice(0, 500),
      url: redactOutgoing(safePageUrl()).slice(0, 500)
    };
  }
  function fullLogRequested() { return includeTechnicalLog === true && reporterPosture() === 'educator'; }
  var REPORT_CATEGORIES = [
    ['', 'Choose one (optional)'],
    ['click', 'A button or control did not work'],
    ['blank', 'The page went blank, froze or would not load'],
    ['audio', 'Read-aloud or audio did not work'],
    ['looks', 'Something looks wrong or is confusing'],
    ['other', 'Something else']
  ];
  function categoryLabel() {
    for (var i = 1; i < REPORT_CATEGORIES.length; i++) if (REPORT_CATEGORIES[i][0] === reportCategory) return REPORT_CATEGORIES[i][1];
    return '';
  }

  function ensureReportDraft() {
    if (!reportDraft) reportDraft = buildCapturedReportPayload();
    return reportDraft;
  }
  function resetReportDraft() {
    reportDraft = buildCapturedReportPayload();
    reviewedSignature = '';
    if (panel) OUTGOING_FIELDS.forEach(function (spec) {
      var field = panel.querySelector('#' + spec[0]);
      if (field) field.value = reportDraft[spec[1]];
    });
  }

  var OUTGOING_FIELDS = [
    ['aer-report-what', 'whatHappened', 'Diagnostics to include', 8000, 8],
    ['aer-report-steps', 'stepsRepro', 'Context and steps to include', 4000, 3],
    ['aer-report-browser', 'browserDevice', 'Browser and device details', 500, 2],
    ['aer-report-url', 'url', 'Page URL to include', 500, 2]
  ];
  function captureOutgoingDraft() {
    if (!panel || submission.status === 'sending' || submission.status === 'saved') return false;
    var draft = ensureReportDraft();
    var sanitized = false;
    OUTGOING_FIELDS.forEach(function (spec) {
      var field = panel.querySelector('#' + spec[0]);
      if (!field) return;
      var clean = redactOutgoing(field.value).slice(0, spec[3]);
      if (draft[spec[1]] !== clean) {
        draft[spec[1]] = clean;
        reviewedSignature = '';
      }
      if (field.value !== clean) { field.value = clean; reviewedSignature = ''; sanitized = true; }
    });
    return sanitized;
  }
  function buildReportPayload() {
    captureDescriptionDraft();
    captureOutgoingDraft();
    var draft = ensureReportDraft();
    var description = redactOutgoing(descriptionDraft.trim()).slice(0, DESCRIPTION_MAX_LENGTH);
    var chosen = categoryLabel();
    var told = (chosen ? 'Problem: ' + chosen + '\n' : '') + description;
    return {
      typeOfIssue: 'Bug Report',
      whatHappened: redactOutgoing((told ? '== What happened? ==\n' + told + '\n\n' : '') + draft.whatHappened).slice(0, 16000),
      stepsRepro: redactOutgoing(draft.stepsRepro).slice(0, 4000),
      browserDevice: redactSecrets(draft.browserDevice).slice(0, 500),
      url: redactOutgoing(draft.url).slice(0, 500)
    };
  }
  function payloadSignature(policy) {
    return JSON.stringify([policy.signature, buildReportPayload()]);
  }
  function updateReviewControls() {
    if (!panel) return;
    var policy = getSupportReportingPolicy();
    var confirmed = policy.enabled && reviewedSignature && reviewedSignature === payloadSignature(policy);
    var checkbox = panel.querySelector('#aer-review-confirm');
    if (checkbox) checkbox.checked = !!confirmed;
    var send = panel.querySelector('#aer-send');
    if (send) send.disabled = submission.status === 'sending' || submission.status === 'saved' || !confirmed;
    // The footer is not re-rendered on a checkbox change, so the hint toggles here.
    var hint = panel.querySelector('#aer-send-hint');
    var needsConfirm = needsReviewConfirmation(policy, confirmed);
    if (hint) hint.hidden = !needsConfirm;
    if (send) { if (needsConfirm) send.setAttribute('aria-describedby', 'aer-send-hint'); else send.removeAttribute('aria-describedby'); }
  }
  // Send is greyed out until the review box is checked; without saying so, the
  // button looked broken (reported 2026-10-28).
  function needsReviewConfirmation(policy, confirmed) {
    return policy.enabled && !confirmed && submission.status !== 'sending' && submission.status !== 'saved';
  }
  function sanitizeReviewDraft() {
    var changed = captureDescriptionDraft();
    if (captureOutgoingDraft()) changed = true;
    var cleanedDescription = redactOutgoing(descriptionDraft);
    if (cleanedDescription !== descriptionDraft) { descriptionDraft = cleanedDescription; changed = true; }
    var draft = ensureReportDraft();
    OUTGOING_FIELDS.forEach(function (spec) {
      var cleaned = redactOutgoing(draft[spec[1]]).slice(0, spec[3]);
      if (cleaned !== draft[spec[1]]) { draft[spec[1]] = cleaned; changed = true; }
      var field = panel && panel.querySelector('#' + spec[0]);
      if (field && field.value !== cleaned) field.value = cleaned;
    });
    var description = panel && panel.querySelector('#aer-description');
    if (description && description.value !== descriptionDraft) description.value = descriptionDraft;
    if (changed) {
      reviewedSignature = '';
      reviewNotice = 'Credentials or personal details were removed. Review the updated fields and confirm again before sending.';
    }
    return changed;
  }

  function buildPrefilledFormUrl() {
    var policy = getSupportReportingPolicy();
    if (!policy.enabled || !policy.allowGoogleFormFallback || !reviewedSignature
        || reviewedSignature !== payloadSignature(policy)) return '';
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
  var panelTrigger = null;
  // Kept outside the panel DOM so log refreshes, tab switches, and closing the
  // dialog cannot lose a pending submission or enable a duplicate send.
  var submission = { status: 'idle', id: '', savedAt: '', message: '', formOpened: false };
  var activeSubmission = null;
  // Free text stays only in this page's memory, never in the persisted error log.
  var descriptionDraft = '';
  var descriptionComposing = false;
  var descriptionRefreshPending = false;
  // This outgoing copy is frozen across later log captures. Only explicit
  // editing or Update report changes it; the persisted diagnostic log is separate.
  var reportDraft = null;
  // Off by default and offered only in teacher view; see buildSafeReportPayload.
  var includeTechnicalLog = false;
  var reportCategory = '';
  var reviewedSignature = '';
  var reviewNotice = '';
  var displayedPolicySignature = '';

  function captureDescriptionDraft() {
    var field = panel && panel.querySelector('#aer-description');
    if (field && submission.status !== 'sending' && submission.status !== 'saved') {
      var raw = field.value;
      var next = redactOutgoing(raw).slice(0, DESCRIPTION_MAX_LENGTH);
      if (descriptionDraft !== next) reviewedSignature = '';
      descriptionDraft = next;
      if (raw !== descriptionDraft) { field.value = descriptionDraft; reviewedSignature = ''; return true; }
    }
    return false;
  }

  // Translator. The badge is built with raw DOM, so its accessible name never
  // passed through React and stayed English in every language.
  function _errT(key, fallback) {
    try {
      if (typeof window.__alloT === 'function') {
        var r = window.__alloT(key);
        if (r && typeof r === 'string' && r !== key) return r;
      }
    } catch (_) {}
    return fallback || key;
  }

  function ensureBadge() {
    if (badge) return;
    badge = document.createElement('button');
    badge.id = 'allo-err-badge';
    badge.type = 'button';
    badge.setAttribute('aria-label', _errT('error_reporter_badge_aria', 'View captured errors and report a bug'));
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

  // A sleeping or backgrounded laptop fires every pending module's 30 s
  // watchdog at once on wake; the script usually still arrives. Once it has,
  // that timeout is not something anyone can act on.
  function recoveredModule(e) {
    var m = /^\[CDN-TIMEOUT\] (\S+) did not settle/.exec((e && e.message) || '');
    if (!m) return '';
    try {
      if (window.AlloModules && window.AlloModules[m[1]]) return m[1];
      var reg = window.__alloModuleRegistry;
      if (reg && reg[m[1]] && reg[m[1]].status === 'loaded') return m[1];
    } catch (_) {}
    return '';
  }

  function countsTowardBadge(e) {
    return e.level === 'error' && e.load === LOAD_ID && !recoveredModule(e)
      && (!e.api || e.api.state === 'failed' && !e.api.recovered);
  }

  function entryTags(e) {
    var tags = [];
    if (e.load !== LOAD_ID) tags.push('earlier page load');
    var mod = recoveredModule(e);
    if (mod) tags.push('recovered: ' + mod + ' loaded later');
    if (e.api) {
      tags.push(e.api.kind + (e.api.httpStatus ? ' / HTTP ' + e.api.httpStatus : ''));
      if (e.api.recovered) tags.push(e.api.recovered === 'succeeded' ? 'recovered: request succeeded' : 'request cancelled');
      else if (e.api.state === 'retrying') tags.push('attempt diagnostic; request retrying');
      else tags.push('action needed');
    }
    return tags;
  }

  function updateBadge() {
    var errCount = buffer.filter(countsTowardBadge).length;
    if (!document.body) return; // still booting
    if (document.body && document.body.classList.contains('alloflow-launchpad-active')) {
      if (badge) badge.style.display = 'none';
      return;
    }
    if (errCount === 0 || quietStudentView()) {
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
      entryTags(e).map(function (tag) { return '<span style="color:#334155;font-weight:600;">' + escapeHtml(tag) + '</span>'; }).join('') +
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
    try { var d = traceDetail(e); if (d != null) detail = JSON.stringify(sanitizeDiagnosticValue(d)); } catch (_) { detail = '[unserializable]'; }
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
      payload = JSON.stringify(sanitizeDiagnosticValue({
        at: new Date().toISOString(),
        surface: 'error-reporter',
        userAgent: redactSecrets(String(navigator.userAgent || '')).slice(0, 120),
        flags: {
          geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
          geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
          kokoroPresent: !!window._kokoroTTS,
          kokoroReady: !!(window._kokoroTTS && window._kokoroTTS.ready),
          sharedResolver: typeof window.__alloResolveReadAloudAudio === 'function'
        },
        lastRoute: window.__ttsLastRoute || null,
        trace: ttsTraceEntries()
      }), null, 2);
    } catch (e) { payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e); }
    return payload;
  }

  // ── Web search tab (2026-07-27) ──
  // Grounded features (Find standards, Research with Web Search, source
  // discovery, fact-check) all funnel through WebSearchProvider, and every
  // transport failure in that chain is caught and flattened into "no results".
  // When the Canvas search proxy was retired, that turned into a whole class of
  // features that silently did nothing — no error, no toast, no console error.
  // This tab answers the two questions that were unanswerable from the UI:
  // is a transport configured at all, and what did the last searches actually do.
  function searchProviderRef() {
    try { return window.WebSearchProvider || null; } catch (_) { return null; }
  }

  function searchTransportSummary() {
    var p = searchProviderRef();
    if (!p) return 'Search provider not loaded (ai_backend_module.js has not registered yet).';
    if (typeof p.describeTransports !== 'function') return 'Search provider loaded, but this build predates transport reporting.';
    try {
      var t = p.describeTransports();
      if (!t.anyTransport) {
        return 'NO SEARCH TRANSPORT CONFIGURED' + (t.isCanvas ? ' (Canvas)' : '') +
          ' - grounded features cannot search. Add a Serper.dev API key in Settings.';
      }
      var parts = [];
      if (t.proxyUrl) parts.push('proxy ' + t.proxyMode + (t.proxyAvailable ? '' : ' (in cooldown)'));
      if (t.directSerperConfigured) parts.push('Serper direct key ' + (t.directSerperKeyHint || ''));
      if (t.searxngEligible) parts.push('SearXNG eligible');
      if (t.duckduckgoEligible) parts.push('DuckDuckGo eligible');
      return (t.isCanvas ? 'Canvas' : 'Standard') + ' - ' + (parts.join(' | ') || 'none') +
        (t.online === false ? ' - OFFLINE' : '');
    } catch (e) { return 'Transport state unavailable: ' + String(e && e.message || e); }
  }

  function searchTraceEntries() {
    try { return (window.__alloSearchTrace || []).slice(-80); } catch (_) { return []; }
  }

  function buildSearchDiagText() {
    var payload;
    try {
      var p = searchProviderRef();
      payload = JSON.stringify(sanitizeDiagnosticValue({
        at: new Date().toISOString(),
        surface: 'error-reporter',
        identity: identityLine(),
        transports: (p && typeof p.describeTransports === 'function') ? p.describeTransports() : null,
        lastSelfTest: window.__alloSearchSelfTest || null,
        trace: searchTraceEntries()
      }), null, 2);
    } catch (e) { payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e); }
    return payload;
  }

  function searchTabHtml() {
    var entries = searchTraceEntries();
    var rows = entries.length === 0
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">No web-search activity recorded yet. Run a test search, or use a feature that searches (Find standards, Research with Web Search).</p>'
      : entries.slice().reverse().map(ttsEntryHtml).join('');

    var last = window.__alloSearchSelfTest;
    var resultHtml = '';
    if (last) {
      var good = !!last.ok;
      var sample = (last.sample || []).map(function (s) {
        return '<li style="margin:2px 0;"><a href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener noreferrer" style="color:#0d9488;">' + escapeHtml(s.title) + '</a></li>';
      }).join('');
      resultHtml =
        '<div style="margin:0 18px 4px;padding:10px 12px;border-radius:8px;border:1px solid ' + (good ? '#5eead4' : '#fca5a5') + ';background:' + (good ? '#f0fdfa' : '#fef2f2') + ';">' +
          '<p style="margin:0;font:700 12px/1.4 system-ui,sans-serif;color:' + (good ? '#0f766e' : '#b91c1c') + ';">' +
            (good ? 'Test search succeeded' : 'Test search failed') + ' (' + escapeHtml(String(last.reason || '')) + ', ' + escapeHtml(String(last.elapsedMs || 0)) + 'ms)' +
          '</p>' +
          '<p style="margin:4px 0 0;font:12px/1.4 system-ui,sans-serif;color:#334155;">' + escapeHtml(String(last.message || '')) + '</p>' +
          (sample ? '<ul style="margin:6px 0 0;padding-left:18px;font:12px/1.4 system-ui,sans-serif;">' + sample + '</ul>' : '') +
        '</div>';
    }

    return '<div style="padding:10px 18px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">' +
        '<span style="font:600 11px/1.4 system-ui,sans-serif;color:#475569;flex:1;min-width:200px;">' + escapeHtml(searchTransportSummary()) + '</span>' +
        '<button id="aer-search-test" type="button" style="background:#0d9488;border:none;color:#fff;padding:5px 10px;border-radius:6px;font:700 11px/1 system-ui,sans-serif;cursor:pointer;">Run test search</button>' +
        '<button id="aer-search-refresh" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Refresh</button>' +
        '<button id="aer-search-copy" type="button" style="background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;">Copy diagnostics</button>' +
      '</div>' +
      resultHtml +
      '<div role="region" aria-label="Web search diagnostic events" style="flex:1;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' + rows + '</div>' +
      '<footer style="padding:10px 18px;border-top:1px solid #e2e8f0;background:#fff;">' +
        '<p style="margin:0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">Web search backs Find standards, Research with Web Search, and source fact-checking. When no transport is configured those features fall back to the AI\'s own knowledge and label their output as not web-verified.</p>' +
      '</footer>';
  }

  // ── Compatibility tab (2026-10-29) ──
  // Hosts differ in what an embedded page may do. In the Gemini desktop app the
  // storage approval window opened with no link back, so Approve stayed off.
  // These checks report what THIS host allows. Results stay on the device until
  // someone copies or sends them, and hold only check names and outcomes.
  var compatResults = null;
  var compatRunning = false;
  var COMPAT_STATUS = {
    ok: ['✓ Works', '#047857'],
    no: ['✗ Not available', '#b91c1c'],
    warn: ['! Partly', '#92400e'],
    info: ['i Check by hand', '#475569']
  };
  // Rows a button fills in; the pattern matches the placeholder a run writes.
  var COMPAT_MANUAL = { download: /^Use Test download/, 'file-picker': /^Use Test file picker/, 'device-storage': /^Checking/ };

  function compatRow(id, label, status, detail) {
    return { id: id, label: label, status: status, detail: detail };
  }

  function compatHostFacts() {
    var ua = String(navigator.userAgent || '');
    var facts = { host: 'Web page', engine: 'unknown', embedded: false, brands: [] };
    try { facts.embedded = window.top !== window; } catch (_) { facts.embedded = true; }
    try {
      var surface = (window.__alloBuildStamp && window.__alloBuildStamp.surface) || '';
      if (surface === 'desktop' || /alloflow-desktop\//.test(ua)) facts.host = 'AlloFlow desktop app';
      else if (surface === 'canvas') facts.host = 'Gemini Canvas';
      else if (surface === 'deployed') facts.host = 'AlloFlow website';
      else if (surface === 'development') facts.host = 'Local development';
    } catch (_) {}
    facts.engine = /Electron\//.test(ua) ? 'Electron' : /Edg\//.test(ua) ? 'Edge or WebView2' :
      /Chrome\//.test(ua) ? 'Chrome or Chromium' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'unknown';
    try {
      facts.brands = ((navigator.userAgentData && navigator.userAgentData.brands) || [])
        .map(function (b) { return String(b.brand) + ' ' + String(b.version); })
        .filter(function (b) { return !/not.?a.?brand/i.test(b); });
    } catch (_) {}
    return facts;
  }

  function permissionPolicyAllows(feature) {
    try {
      var policy = document.permissionsPolicy || document.featurePolicy;
      if (policy && typeof policy.allowsFeature === 'function') return !!policy.allowsFeature(feature);
    } catch (_) {}
    return null;
  }

  function compatMediaRow(id, label, feature) {
    var row = compatRow(id, label, 'no', 'This host offers no camera or microphone access.');
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return Promise.resolve(row);
    var allowed = permissionPolicyAllows(feature);
    if (allowed === false) { row.detail = 'The page that embeds AlloFlow does not allow it.'; return Promise.resolve(row); }
    var done = function (state) {
      if (state === 'denied') { row.status = 'no'; row.detail = 'Permission was denied for this page.'; }
      else if (state === 'granted') { row.status = 'ok'; row.detail = 'Permission already granted.'; }
      else { row.status = 'ok'; row.detail = 'Allowed here; the browser will ask the first time.'; }
      return row;
    };
    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        return navigator.permissions.query({ name: feature }).then(function (s) { return done(s && s.state); }, function () { return done(''); });
      }
    } catch (_) {}
    return Promise.resolve(done(''));
  }

  function compatVoicesRow() {
    var row = compatRow('voices', 'Read-aloud voices on this device', 'no', 'This host has no built-in speech.');
    if (!window.speechSynthesis || typeof window.speechSynthesis.getVoices !== 'function') return Promise.resolve(row);
    return new Promise(function (resolve) {
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        var count = 0;
        try { count = (window.speechSynthesis.getVoices() || []).length; } catch (_) {}
        row.status = count ? 'ok' : 'warn';
        row.detail = count ? count + ' voice(s) available.' : 'Speech exists but lists no voices; AlloFlow falls back to its own engine.';
        resolve(row);
      };
      try { if ((window.speechSynthesis.getVoices() || []).length) { finish(); return; } } catch (_) {}
      try { window.speechSynthesis.addEventListener('voiceschanged', finish); } catch (_) {}
      setTimeout(finish, 1500);
    });
  }

  function compatIndexedDbRow() {
    var row = compatRow('indexeddb', 'Save larger work on this device (IndexedDB)', 'no', 'Not available here.');
    if (!window.indexedDB) return Promise.resolve(row);
    return new Promise(function (resolve) {
      var finished = false;
      var finish = function (ok, detail) {
        if (finished) return;
        finished = true;
        row.status = ok ? 'ok' : 'no';
        row.detail = detail;
        resolve(row);
      };
      try {
        var req = window.indexedDB.open('allo_compat_check', 1);
        req.onsuccess = function () {
          try { req.result.close(); window.indexedDB.deleteDatabase('allo_compat_check'); } catch (_) {}
          finish(true, 'Opened and removed a test database.');
        };
        req.onerror = function () { finish(false, 'Refused: ' + String(req.error && req.error.name || 'error')); };
        req.onblocked = function () { finish(false, 'Blocked by another open copy.'); };
      } catch (e) { finish(false, 'Refused: ' + String(e && e.name || e)); }
      setTimeout(function () { finish(false, 'No answer within 3 seconds.'); }, 3000);
    });
  }

  function compatStorageFactsRow() {
    var row = compatRow('persist', 'Keep saved work when the browser needs space', 'info', 'This host does not say.');
    if (!navigator.storage || typeof navigator.storage.persisted !== 'function') return Promise.resolve(row);
    return Promise.resolve(navigator.storage.persisted()).then(function (persisted) {
      row.status = persisted ? 'ok' : 'warn';
      row.detail = persisted ? 'Saved work is kept until someone clears it.' : 'The browser may clear saved work if the device runs low on space.';
      return row;
    }, function () { return row; });
  }

  // Must run inside the click: browsers allow a new window and clipboard writes
  // only during a user gesture, so those two start before anything awaits.
  function runCompatChecks() {
    if (compatRunning) return;
    compatRunning = true;
    var facts = compatHostFacts();
    var rows = [];
    var pending = [];

    var popupRow = compatRow('popup', 'Open a new window', 'no', 'Blocked: no window opened.');
    var linkRow = compatRow('popup-link', 'New window can report back (storage approval, pop-out tools)', 'no', 'No window to test.');
    var printRow = compatRow('print-window', 'Print through a new window', 'no', 'Needs a new window.');
    var popup = null;
    try { popup = window.open('', 'alloflow_compat_check', 'popup=yes,width=360,height=220'); } catch (_) {}
    if (popup) {
      var linked = false, printable = false;
      try { linked = popup.opener === window; } catch (_) {}
      try { printable = typeof popup.print === 'function'; } catch (_) {}
      try { popup.document.title = 'AlloFlow check'; popup.document.body.textContent = 'AlloFlow compatibility check. This window closes by itself.'; } catch (_) {}
      popupRow.status = 'ok';
      popupRow.detail = 'A window opened.';
      linkRow.status = linked ? 'ok' : 'no';
      linkRow.detail = linked ? 'The window is linked back to AlloFlow.' : 'The window has no link back, so storage approval and pop-out tools cannot send results.';
      printRow.status = printable && linked ? 'ok' : 'no';
      printRow.detail = printable && linked ? 'AlloFlow can print from the new window.' : 'AlloFlow cannot reach the new window to print it.';
      pending.push(new Promise(function (resolve) {
        setTimeout(function () {
          var closedEarly = false;
          try { closedEarly = !!popup.closed; } catch (_) {}
          if (closedEarly) {
            popupRow.status = 'warn';
            popupRow.detail = 'A window opened but closed at once; the host may have sent it to another app.';
          }
          try { popup.close(); } catch (_) {}
          resolve();
        }, 600);
      }));
    }
    rows.push(popupRow, linkRow, printRow);

    var clipRow = compatRow('clipboard', 'Copy to the clipboard', 'no', 'This host offers no clipboard access.');
    rows.push(clipRow);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        pending.push(Promise.resolve(navigator.clipboard.writeText('AlloFlow compatibility check')).then(function () {
          clipRow.status = 'ok';
          clipRow.detail = 'Copied a test line (your clipboard now holds it).';
        }, function (e) { clipRow.detail = 'Refused: ' + String(e && e.name || e); }));
      }
    } catch (e) { clipRow.detail = 'Refused: ' + String(e && e.name || e); }

    var local = compatRow('localstorage', 'Remember settings on this device', 'no', 'Not available here.');
    try {
      window.localStorage.setItem('__allo_compat_check__', '1');
      var back = window.localStorage.getItem('__allo_compat_check__');
      window.localStorage.removeItem('__allo_compat_check__');
      if (back === '1') { local.status = 'ok'; local.detail = 'Wrote and read back a test value.'; }
    } catch (e) { local.detail = 'Refused: ' + String(e && e.name || e); }
    rows.push(local);

    var fullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    rows.push(compatRow('fullscreen', 'Full screen', fullscreen ? 'ok' : 'no', fullscreen ? 'Allowed here.' : 'The host does not allow full screen.'));
    var recognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    rows.push(compatRow('speech-input', 'Speech input', recognition ? 'ok' : 'no', recognition ? 'Speech recognition is available.' : 'No speech recognition in this host.'));
    rows.push(compatRow('cookies', 'Cookies (sign-in)', navigator.cookieEnabled ? 'ok' : 'no', navigator.cookieEnabled ? 'Enabled.' : 'Disabled, so sign-in may fail.'));
    rows.push(compatRow('secure', 'Secure page', window.isSecureContext ? 'ok' : 'no', window.isSecureContext ? 'Yes, so clipboard and microphone can work.' : 'No, so clipboard and microphone are blocked.'));
    rows.push(compatRow('download', 'Download files', 'info', 'Use Test download, then look for alloflow-compat-check.txt in Downloads.'));
    rows.push(compatRow('file-picker', 'Upload files', 'info', 'Use Test file picker. Nothing you pick is read or sent.'));

    var asyncRows = [
      compatMediaRow('microphone', 'Microphone', 'microphone'),
      compatMediaRow('camera', 'Camera', 'camera'),
      compatVoicesRow(),
      compatIndexedDbRow(),
      compatStorageFactsRow()
    ];
    Promise.all(pending.concat([Promise.all(asyncRows).then(function (more) { rows = rows.concat(more); })]))
      .catch(function () {})
      .then(function () {
        // A re-run keeps results the user got by hand (download, picker, storage).
        var manual = (compatResults ? compatResults.rows : []).filter(function (r) { return COMPAT_MANUAL[r.id] && !COMPAT_MANUAL[r.id].test(r.detail); });
        rows = rows.filter(function (r) { return !manual.some(function (m) { return m.id === r.id; }); }).concat(manual);
        compatResults = { at: new Date().toISOString(), facts: facts, rows: rows };
        compatRunning = false;
        refreshPanelIfOpen();
      });
    refreshPanelIfOpen();
  }

  function setCompatRow(row) {
    if (!compatResults) compatResults = { at: new Date().toISOString(), facts: compatHostFacts(), rows: [] };
    compatResults.rows = compatResults.rows.filter(function (r) { return r.id !== row.id; }).concat([row]);
    refreshPanelIfOpen();
  }

  function testCompatDownload() {
    try {
      var blob = new Blob(['AlloFlow compatibility check: if you can read this file, downloads work.\n'], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'alloflow-compat-check.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (_) {} }, 5000);
      setCompatRow(compatRow('download', 'Download files', 'info', 'Download started. If alloflow-compat-check.txt is not in Downloads, this host blocks downloads.'));
    } catch (e) {
      setCompatRow(compatRow('download', 'Download files', 'no', 'Refused: ' + String(e && e.name || e)));
    }
  }

  function testCompatFilePicker() {
    var input = document.createElement('input');
    input.type = 'file';
    input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    var cleanup = function () { try { input.remove(); } catch (_) {} };
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      setCompatRow(file
        ? compatRow('file-picker', 'Upload files', 'ok', 'A file was chosen (' + Math.max(1, Math.round(file.size / 1024)) + ' KB). It was not read or sent.')
        : compatRow('file-picker', 'Upload files', 'warn', 'The picker opened but returned no file.'));
      cleanup();
    });
    input.addEventListener('cancel', function () {
      setCompatRow(compatRow('file-picker', 'Upload files', 'ok', 'The picker opened (cancelled, which is fine).'));
      cleanup();
    });
    document.body.appendChild(input);
    try { input.click(); } catch (e) {
      setCompatRow(compatRow('file-picker', 'Upload files', 'no', 'Refused: ' + String(e && e.name || e)));
      cleanup();
    }
  }

  // Reuses the device-storage probe (popup and embedded-frame channels). Its
  // popup half needs this click, so it runs inline when the module is loaded.
  function runCompatDeviceStorage() {
    var ds = window.alloDeviceStorage;
    if (ds && typeof ds.probe === 'function') {
      setCompatRow(compatRow('device-storage', 'Device storage connection', 'info', 'Checking (up to about 15 seconds)…'));
      Promise.resolve().then(function () { return ds.probe(); }).then(function (res) {
        var s = (res && res.summary) || {};
        var bad = function (v) { return /^FAILED/.test(String(v || '')); };
        var status = bad(s.popup) && bad(s.iframe) ? 'no' : (bad(s.popup) || bad(s.iframe) ? 'warn' : 'ok');
        setCompatRow(compatRow('device-storage', 'Device storage connection', status,
          'Separate window: ' + String(s.popup || 'no answer') + '. Embedded frame: ' + String(s.iframe || 'no answer') + '.'));
      }, function (e) {
        setCompatRow(compatRow('device-storage', 'Device storage connection', 'no', 'Check failed: ' + String(e && (e.code || e.message) || e)));
      });
      return;
    }
    if (typeof window.__alloOpenDeviceStorageProbe === 'function') {
      closePanel();
      window.__alloOpenDeviceStorageProbe();
      return;
    }
    setCompatRow(compatRow('device-storage', 'Device storage connection', 'no', 'The device-storage tool is not loaded in this copy of AlloFlow.'));
  }

  function compatReportLines() {
    if (!compatResults || !compatResults.rows.length) return '';
    var f = compatResults.facts || {};
    return '-- Compatibility check (' + compatResults.at + ') --\n' +
      'host: ' + f.host + ' · engine: ' + f.engine + (f.embedded ? ' · embedded' : ' · top-level') + '\n' +
      compatResults.rows.map(function (r) { return r.id + ': ' + r.status; }).join(', ');
  }

  function buildCompatDiagText() {
    var payload;
    try {
      payload = JSON.stringify(sanitizeDiagnosticValue({
        at: new Date().toISOString(),
        surface: 'error-reporter',
        identity: identityLine(),
        host: compatHostFacts(),
        checks: compatResults ? compatResults.rows : null
      }), null, 2);
    } catch (e) { payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e); }
    return payload;
  }

  function compatTabHtml() {
    var facts = compatHostFacts();
    var btn = 'background:#fff;border:1px solid #94a3b8;color:#475569;padding:5px 10px;border-radius:6px;font:600 11px/1 system-ui,sans-serif;cursor:pointer;';
    var rows = !compatResults
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">' + (compatRunning ? 'Running checks…' : 'Press Run checks. A small window opens and closes by itself, and a test line is copied to your clipboard.') + '</p>'
      : '<ul style="list-style:none;margin:0;padding:0;">' + compatResults.rows.map(function (r) {
          var s = COMPAT_STATUS[r.status] || COMPAT_STATUS.info;
          return '<li data-compat-id="' + escapeHtml(r.id) + '" style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #e2e8f0;">' +
            '<span style="flex:0 0 118px;font:700 12px/1.4 system-ui,sans-serif;color:' + s[1] + ';">' + escapeHtml(s[0]) + '</span>' +
            '<span style="flex:1;font:12px/1.4 system-ui,sans-serif;color:#334155;"><strong style="color:#0f172a;">' + escapeHtml(r.label) + '</strong><br>' + escapeHtml(r.detail) + '</span>' +
          '</li>';
        }).join('') + '</ul>';
    return '<div style="padding:10px 18px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;">' +
        '<span style="font:600 11px/1.4 system-ui,sans-serif;color:#475569;flex:1;min-width:200px;">' +
          escapeHtml(facts.host + ' · ' + facts.engine + (facts.embedded ? ' · embedded in another page' : ' · top-level page')) + '</span>' +
        '<button id="aer-compat-run" type="button"' + (compatRunning ? ' disabled' : '') + ' style="background:#0f766e;border:none;color:#fff;padding:5px 10px;border-radius:6px;font:700 11px/1 system-ui,sans-serif;cursor:pointer;">' + (compatResults ? 'Run checks again' : 'Run checks') + '</button>' +
        '<button id="aer-compat-storage" type="button" style="' + btn + '">Check device storage</button>' +
        '<button id="aer-compat-download" type="button" style="' + btn + '">Test download</button>' +
        '<button id="aer-compat-file" type="button" style="' + btn + '">Test file picker</button>' +
        '<button id="aer-compat-copy" type="button" style="' + btn + '">Copy results</button>' +
      '</div>' +
      '<div role="region" aria-label="Compatibility check results" aria-live="polite" style="flex:1;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' + rows + '</div>' +
      '<footer style="padding:10px 18px;border-top:1px solid #e2e8f0;background:#fff;">' +
        '<p style="margin:0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">Checks what this browser or app lets AlloFlow do. Run it once where AlloFlow works and once where it does not, then compare. Results are added to a bug report as check names and outcomes only.</p>' +
      '</footer>';
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
      payload = JSON.stringify(sanitizeDiagnosticValue({
        at: new Date().toISOString(),
        surface: 'error-reporter',
        identity: identityLine(),
        health: window.__alloSessionHealth || null,
        trace: sessionTraceEntries()
      }), null, 2);
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

  function descriptionHtml() {
    var locked = submission.status === 'sending' || submission.status === 'saved';
    return '<div style="margin:0 0 16px;">' +
      '<label for="aer-description" style="display:block;margin-bottom:6px;font:700 14px/1.4 system-ui,sans-serif;color:#1e293b;">' +
        escapeHtml(_errT('error_reporter_description_label', 'What happened? (optional)')) + '</label>' +
      '<textarea id="aer-description" rows="3" aria-describedby="aer-description-help"' + (locked ? ' readonly' : '') +
        ' placeholder="' + escapeHtml(_errT('error_reporter_description_placeholder', 'What were you doing? What did you expect, and what happened instead?')) + '"' +
        ' style="display:block;box-sizing:border-box;width:100%;min-height:84px;max-height:220px;resize:vertical;padding:9px 10px;border:1px solid #94a3b8;border-radius:8px;background:#fff;color:#0f172a;font:16px/1.45 system-ui,sans-serif;">' + escapeHtml(descriptionDraft) + '</textarea>' +
      '<p id="aer-description-help" style="margin:6px 0 0;font:12px/1.5 system-ui,sans-serif;color:#475569;">' +
        escapeHtml(quietStudentView()
          ? _errT('error_reporter_student_description_help', 'Do not include names or other personal details. Up to 2,000 characters.')
          : _errT('error_reporter_description_help', 'Do not include student details or other private information. Up to 2,000 characters.')) + '</p>' +
      '</div>';
  }

  function outgoingReviewHtml() {
    var draft = ensureReportDraft();
    var locked = submission.status === 'sending' || submission.status === 'saved';
    var policy = getSupportReportingPolicy();
    displayedPolicySignature = policy.signature;
    var teacherView = reporterPosture() === 'educator';
    var full = fullLogRequested();
    return '<section aria-label="Outgoing support report" style="margin:16px 0;padding:12px;border:1px solid #94a3b8;border-radius:8px;background:#fff;">' +
      '<h3 style="margin:0 0 8px;font:700 14px/1.4 system-ui,sans-serif;">Review the report to send</h3>' +
      '<label for="aer-category" style="display:block;margin-top:4px;font:700 12px/1.5 system-ui,sans-serif;">What kind of problem?</label>' +
      '<select id="aer-category"' + (locked ? ' disabled' : '') + ' style="display:block;margin-top:4px;padding:6px 8px;border:1px solid #64748b;border-radius:6px;background:#fff;color:#0f172a;font:15px/1.4 system-ui,sans-serif;">' +
        REPORT_CATEGORIES.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === reportCategory ? ' selected' : '') + '>' + escapeHtml(c[1]) + '</option>'; }).join('') +
      '</select>' +
      '<p id="aer-privacy-scope" style="margin:10px 0 0;padding:8px 10px;border-radius:6px;background:#f0fdfa;color:#134e4a;font:12px/1.5 system-ui,sans-serif;">' +
        escapeHtml(full
          ? 'This report includes the technical log. Email addresses, phone numbers, ID numbers, birth dates, street addresses and names after Mr., Ms. or Dr. are removed automatically; check the fields below for anything else private.'
          : 'This report includes technical details only, never text from the app or its log. Email addresses, phone numbers, ID numbers and similar details are also removed from anything you type.') + '</p>' +
      (teacherView ? '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font:13px/1.5 system-ui,sans-serif;"><input id="aer-include-log" type="checkbox"' +
        (locked ? ' disabled' : '') + (full ? ' checked' : '') + '><span>Include the technical log (helps fix the problem; personal details are removed automatically)</span></label>' : '') +
      '<p style="font:12px/1.5 system-ui,sans-serif;">Report type: Bug Report. Your optional description above and the fields below are the complete report. Edit or remove private information; edits do not change the captured log. New events are not added to this draft automatically.</p>' +
      '<p id="aer-support-destination" style="font:12px/1.5 system-ui,sans-serif;overflow-wrap:anywhere;">' +
        escapeHtml(policy.enabled ? 'Support destination: ' + policy.endpoint : policy.valid ? 'External support reporting is disabled by this deployment. Local diagnostics and Copy log remain available.' : 'External support reporting is unavailable because the deployment policy is invalid. Local diagnostics and Copy log remain available.') + '</p>' +
      OUTGOING_FIELDS.map(function (spec) {
        return '<label for="' + spec[0] + '" style="display:block;margin-top:10px;font:700 12px/1.5 system-ui,sans-serif;">' + spec[2] + '</label>' +
          '<textarea id="' + spec[0] + '" rows="' + spec[4] + '"' + (locked ? ' readonly' : '') +
          ' style="box-sizing:border-box;width:100%;padding:8px;border:1px solid #64748b;border-radius:6px;background:#fff;color:#0f172a;font:16px/1.5 system-ui,sans-serif;">' + escapeHtml(draft[spec[1]]) + '</textarea>';
      }).join('') +
      '<button id="aer-refresh-report" type="button"' + (locked ? ' disabled' : '') + ' style="margin-top:10px;padding:8px;">Update report from current log</button>' +
      '<p id="aer-review-notice" role="status" style="font:12px/1.5 system-ui,sans-serif;color:#854d0e;">' + escapeHtml(reviewNotice) + '</p>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font:13px/1.5 system-ui,sans-serif;"><input id="aer-review-confirm" type="checkbox"' +
        (locked || !policy.enabled ? ' disabled' : '') +
        (reviewedSignature && reviewedSignature === payloadSignature(policy) ? ' checked' : '') +
      '><span><strong>Required to send:</strong> I reviewed this report and am permitted to send these fields to the support destination shown above.</span></label></section>';
  }

  function submissionFooterHtml() {
    var busy = submission.status === 'sending';
    var saved = submission.status === 'saved';
    var failed = submission.status === 'failed' || submission.status === 'uncertain';
    var policy = getSupportReportingPolicy();
    var confirmed = policy.enabled && reviewedSignature && reviewedSignature === payloadSignature(policy);
    var text = 'Send only the reviewed fields to the support destination shown above. A receipt confirms storage, not review.';
    if (busy) text = 'Sending your report. You can close this window; the result will be here when you reopen it.';
    if (failed) text = submission.message;
    if (saved) text = policy.endpoint === SUBMIT_URL
      ? 'Report saved. This confirms storage, not that a developer has reviewed it.'
      : 'Report saved. The support service confirmed storage, not that anyone has reviewed it.';
    return '<footer style="padding:14px 18px;border-top:1px solid #e2e8f0;background:#fff;display:flex;flex-wrap:wrap;align-items:center;gap:10px;flex-shrink:0;">' +
      '<div id="aer-submit-status" role="status" aria-live="polite" aria-atomic="true" style="width:100%;font:12px/1.5 system-ui,sans-serif;color:#334155;overflow-wrap:anywhere;">' +
        '<p style="margin:0;">' + escapeHtml(text) + '</p>' +
        (saved ? '<p style="margin:6px 0 0;"><strong>' + (submission.id ? 'Receipt: <span id="aer-receipt-id">' + escapeHtml(submission.id) + '</span>' : 'No receipt ID was returned by the server.') + '</strong><br>Saved: ' + escapeHtml(submission.savedAt) + '</p>' : '') +
        (failed ? '<p style="margin:6px 0 0;">' + (policy.enabled && policy.allowGoogleFormFallback ? 'You can use Copy log above, paste it into the report form, and press Submit there. Opening the form does not send your report.' : 'Copy log remains available for your approved support process.') + (submission.formOpened ? ' This app cannot confirm a submission made in that form.' : '') + '</p>' : '') +
      '</div>' +
      '<p id="aer-send-hint" style="width:100%;margin:0;font:13px/1.5 system-ui,sans-serif;color:#854d0e;"' + (needsReviewConfirmation(policy, confirmed) ? '' : ' hidden') + '>' +
        'Send is off until you check “I reviewed this report…” in the review section above. ' +
        '<button id="aer-goto-confirm" type="button" style="background:none;border:none;padding:0;color:#0f766e;font:700 13px/1.5 system-ui,sans-serif;text-decoration:underline;cursor:pointer;">Go to the checkbox</button></p>' +
      '<button id="aer-send" type="button"' + (busy || saved || !confirmed ? ' disabled' : '') + (needsReviewConfirmation(policy, confirmed) ? ' aria-describedby="aer-send-hint"' : '') + ' style="background:' + (saved ? '#15803d' : '#0d9488') + ';border:none;color:#fff;padding:9px 16px;border-radius:8px;font:700 13px/1 system-ui,sans-serif;cursor:' + (busy || saved || !confirmed ? 'default' : 'pointer') + ';">' +
        (busy ? 'Sending…' : saved ? 'Report saved' : failed ? 'Try sending again' : 'Send reviewed report') + '</button>' +
      (saved && submission.id ? '<button id="aer-copy-receipt" type="button" style="background:#fff;border:1px solid #64748b;color:#334155;padding:9px 12px;border-radius:8px;font:700 12px/1 system-ui,sans-serif;cursor:pointer;">Copy receipt</button>' : '') +
      (saved ? '<button id="aer-new-report" type="button" style="background:#fff;border:1px solid #64748b;color:#334155;padding:9px 12px;border-radius:8px;font:700 12px/1 system-ui,sans-serif;cursor:pointer;">New report</button>' : '') +
      (failed && policy.enabled && policy.allowGoogleFormFallback ? '<button id="aer-report-form" type="button" style="color:#0f766e;font:700 12px/1.5 system-ui,sans-serif;padding:8px;">Open report form</button>' : '') +
      '</footer>';
  }

  function submitReport() {
    if (submission.status === 'sending' || submission.status === 'saved') return;
    var policy = getSupportReportingPolicy();
    if (sanitizeReviewDraft()) { refreshPanelIfOpen(); return; }
    if (!policy.enabled || !reviewedSignature || reviewedSignature !== payloadSignature(policy)) {
      reviewedSignature = '';
      reviewNotice = policy.enabled ? 'The report or support policy changed. Review the current fields and destination, then confirm before sending.' : 'This deployment does not permit external support reporting. You can still copy local diagnostics.';
      refreshPanelIfOpen();
      return;
    }
    var p = buildReportPayload();
    var payload = { type: p.typeOfIssue, what: p.whatHappened, steps: p.stepsRepro, browser: p.browserDevice, url: p.url };
    var attempt = { controller: typeof AbortController === 'function' ? new AbortController() : null, timer: null };
    activeSubmission = attempt;
    submission = { status: 'sending', id: '', savedAt: '', message: '', formOpened: false };
    refreshPanelIfOpen();
    var finish = function (status, message, id) {
      if (activeSubmission !== attempt) return;
      clearTimeout(attempt.timer);
      activeSubmission = null;
      submission = { status: status, id: id || '', savedAt: status === 'saved' ? new Date().toISOString() : '', message: message || '', formOpened: false };
      refreshPanelIfOpen();
    };
    attempt.timer = setTimeout(function () {
      finish('uncertain', 'Save not confirmed. The request timed out and may have reached the server. Retrying could create a second report.');
      if (attempt.controller) attempt.controller.abort();
    }, SUBMIT_TIMEOUT_MS);
    try {
      var options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
      if (attempt.controller) options.signal = attempt.controller.signal;
      var dispatchPolicy = getSupportReportingPolicy();
      if (!dispatchPolicy.enabled || dispatchPolicy.signature !== policy.signature) {
        reviewedSignature = '';
        finish('failed', 'Report not sent. The deployment support policy changed; review the destination again.');
        return;
      }
      fetch(dispatchPolicy.endpoint, options)
        .then(function (response) {
          return response.json().then(function (json) { return { ok: response.ok, json: json }; }, function () { return { ok: response.ok, json: null }; });
        })
        .then(function (result) {
          if (result.ok && result.json && result.json.ok === true) {
            var id = typeof result.json.id === 'string' ? result.json.id.trim() : '';
            // Older endpoints confirm saving without returning an ID. Keep that
            // confirmation honest; never invent a receipt or invite a duplicate.
            if (!id || id.length > 200 || /[\u0000-\u001f\u007f]/.test(id)) id = '';
            finish('saved', '', id);
          } else if (!result.ok || result.json && result.json.ok === false) {
            finish('failed', 'Report not saved. The reporting service did not accept this submission.');
          } else {
            finish('uncertain', 'Save not confirmed. The server did not return a valid confirmation. Retrying could create a second report.');
          }
        })
        .catch(function () {
          finish('uncertain', 'Save not confirmed. The connection was interrupted and the report may have reached the server. Retrying could create a second report.');
        });
    } catch (_) {
      finish('uncertain', 'Save not confirmed. The report could not be sent from this browser.');
    }
  }

  // What a student sees: the description, the problem type, the reviewed
  // technical-only report and Send. No log entries, toolbar or diagnostic tabs.
  function studentReportHtml() {
    return '<div data-aer-student-report style="background:#fff;border-radius:14px;width:min(640px,100%);max-width:640px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
      '<header style="padding:14px 18px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
        '<div>' +
          '<h2 style="margin:0;font:800 16px/1.2 system-ui,sans-serif;color:#0f172a;">' + escapeHtml(_errT('error_reporter_student_title', 'Report a problem')) + '</h2>' +
          '<p style="margin:4px 0 0;font:13px/1.45 system-ui,sans-serif;color:#475569;">' + escapeHtml(_errT('error_reporter_student_intro', 'Tell us what went wrong. The report includes technical details about the app, never your work.')) + '</p>' +
        '</div>' +
        '<button id="aer-close" type="button" aria-label="' + escapeHtml(_errT('error_reporter_student_close', 'Close')) + '" style="background:transparent;border:1px solid #cbd5e1;color:#475569;width:44px;height:44px;border-radius:8px;font-size:18px;cursor:pointer;line-height:1;flex-shrink:0;">✕</button>' +
      '</header>' +
      '<div id="aer-error-content" role="region" aria-label="' + escapeHtml(_errT('error_reporter_student_title', 'Report a problem')) + '" style="flex:1;min-height:0;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' +
        descriptionHtml() +
        outgoingReviewHtml() +
      '</div>' +
      submissionFooterHtml() +
      '</div>';
  }

  function panelHtml() {
    if (quietStudentView()) return studentReportHtml();
    var visible = buffer.filter(function (e) {
      return prefs.filter === 'all' ? true : (e.level === 'error' || (prefs.filter === 'errors_warns' && e.level === 'warn'));
    });
    var entriesHtml = visible.length === 0
      ? '<p style="color:#64748b;font-style:italic;text-align:center;padding:20px 0;margin:0;">No errors captured this session. 🎉</p>'
      : visible.slice().reverse().map(logEntryHtml).join('');

    var filterVal = prefs.filter || 'errors';
    var onErrors = activeTab !== 'tts' && activeTab !== 'session' && activeTab !== 'search' && activeTab !== 'compat';
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
      '<div id="aer-error-content" role="region" aria-label="Captured error entries" style="flex:1;min-height:0;overflow-y:auto;padding:12px 18px;background:#f8fafc;">' +
        descriptionHtml() +
        outgoingReviewHtml() +
        entriesHtml +
      '</div>' +
      // Footer / submit
      submissionFooterHtml();
    } else if (activeTab === 'session') {
      body = sessionTabHtml();
    } else if (activeTab === 'search') {
      body = searchTabHtml();
    } else if (activeTab === 'compat') {
      body = compatTabHtml();
    } else {
      body = ttsTabHtml();
    }

    return '<div style="background:#fff;border-radius:14px;width:min(720px,100%);max-width:720px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">' +
      // Header
      '<header style="padding:14px 18px 0;border-bottom:1px solid #e2e8f0;background:#f8fafc;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
          '<div>' +
            '<h2 style="margin:0;font:800 16px/1.2 system-ui,sans-serif;color:#0f172a;">🩺 AlloFlow Diagnostics</h2>' +
            '<p style="margin:2px 0 0;font:12px/1.4 system-ui,sans-serif;color:#64748b;">' + (onErrors ? ('Captured ' + buffer.length + ' entr' + (buffer.length === 1 ? 'y' : 'ies') + '. Review a copy before sharing it with support.') : (activeTab === 'session' ? 'Live-session sync activity for this session.' : (activeTab === 'search' ? 'Web-search transports and query activity for this session.' : (activeTab === 'compat' ? 'What this browser or app lets AlloFlow do.' : 'Read-aloud & text-to-speech activity for this session.')))) + '</p>' +
            '<p style="margin:2px 0 0;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#94a3b8;">' + escapeHtml(identityLine()) + '</p>' +
          '</div>' +
          '<button id="aer-close" type="button" aria-label="Close diagnostics" style="background:transparent;border:1px solid #cbd5e1;color:#475569;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;line-height:1;">✕</button>' +
        '</div>' +
        '<div role="tablist" aria-label="Diagnostics sections" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">' +
          '<button id="aer-tab-errors" type="button" role="tab" aria-selected="' + (onErrors ? 'true' : 'false') + '" style="' + tabStyle(onErrors) + '">⚠ Errors</button>' +
          '<button id="aer-tab-tts" type="button" role="tab" aria-selected="' + (activeTab === 'tts' ? 'true' : 'false') + '" style="' + tabStyle(activeTab === 'tts') + '">🔊 Read-aloud</button>' +
          '<button id="aer-tab-session" type="button" role="tab" aria-selected="' + (activeTab === 'session' ? 'true' : 'false') + '" style="' + tabStyle(activeTab === 'session') + '">🛰 Session</button>' +
          '<button id="aer-tab-search" type="button" role="tab" aria-selected="' + (activeTab === 'search' ? 'true' : 'false') + '" style="' + tabStyle(activeTab === 'search') + '">🔎 Web search</button>' +
          '<button id="aer-tab-compat" type="button" role="tab" aria-selected="' + (activeTab === 'compat' ? 'true' : 'false') + '" style="' + tabStyle(activeTab === 'compat') + '">🧩 Compatibility</button>' +
        '</div>' +
      '</header>' +
      body +
      '</div>';
  }


  function openPanel(tab) {
    if (tab === 'tts' || tab === 'errors' || tab === 'session' || tab === 'search' || tab === 'compat') activeTab = tab;
    if (panel) {
      // Already open: a tab request switches tabs instead of toggling closed.
      if (tab) { refreshPanelIfOpen(); return; }
      closePanel(); return;
    }
    panelTrigger = document.activeElement;
    panel = document.createElement('div');
    panel.id = 'allo-err-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', quietStudentView() ? _errT('error_reporter_student_title', 'Report a problem') : 'AlloFlow Error Reporter');
    panel.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(15,23,42,0.55)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:20px', 'box-sizing:border-box'
    ].join(';');
    panel.innerHTML = panelHtml();
    panel.onclick = function (ev) { if (ev.target === panel) closePanel(); };
    panel.addEventListener('pointerdown', holdPanelPress, true);
    panel.addEventListener('keydown', holdPanelPress, true);
    ['pointerup', 'pointercancel', 'keyup'].forEach(function (type) { document.addEventListener(type, releasePanelPress, true); });
    window.addEventListener('blur', releasePanelPress);
    document.body.appendChild(panel);
    wirePanelHandlers();
    // Move focus to close button for keyboard users
    var closeBtn = document.getElementById('aer-close');
    if (closeBtn) closeBtn.focus();
    // ESC closes
    panel.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); closePanel(); }
      if (ev.key === 'Tab') {
        var controls = Array.prototype.slice.call(panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]'))
          .filter(function (node) { return node.tabIndex >= 0 && !node.hidden && !node.closest('[hidden]'); });
        var first = controls[0], last = controls[controls.length - 1];
        if (!first) { ev.preventDefault(); return; }
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    });
  }

  function closePanel() {
    captureDescriptionDraft();
    captureOutgoingDraft();
    descriptionComposing = false;
    descriptionRefreshPending = false;
    panelPressHeld = false;
    logRefreshPending = false;
    if (panel) { panel.remove(); panel = null; }
    var target = panelTrigger && panelTrigger.isConnected ? panelTrigger : badge;
    panelTrigger = null;
    if (target) target.focus();
  }

  // Incoming log entries rebuild the panel. A rebuild between press and release
  // puts the release on a new control and the browser drops the click, so Send
  // and the review checkbox looked dead while errors kept arriving.
  var panelPressHeld = false;
  var logRefreshPending = false;
  function refreshPanelForLog() {
    if (panelPressHeld) { logRefreshPending = true; return; }
    refreshPanelIfOpen();
  }
  function holdPanelPress(ev) {
    if (ev.type === 'pointerdown' || ev.key === ' ') panelPressHeld = true;
  }
  function releasePanelPress() {
    if (!panelPressHeld) return;
    panelPressHeld = false;
    // The click from this release dispatches first, in the same task.
    setTimeout(function () {
      if (logRefreshPending && !panelPressHeld) { logRefreshPending = false; refreshPanelIfOpen(); }
    }, 0);
  }

  function refreshPanelIfOpen() {
    if (!panel) return;
    // Replacing an active IME composition would lose unfinished input.
    if (descriptionComposing) { descriptionRefreshPending = true; return; }
    captureDescriptionDraft();
    captureOutgoingDraft();
    var retainedFields = OUTGOING_FIELDS.map(function (spec) {
      var field = panel.querySelector('#' + spec[0]);
      return field ? { field: field, spec: spec, start: field.selectionStart, end: field.selectionEnd,
        direction: field.selectionDirection, top: field.scrollTop, left: field.scrollLeft } : null;
    }).filter(Boolean);
    var description = panel.querySelector('#aer-description');
    var selection = description ? { start: description.selectionStart, end: description.selectionEnd, direction: description.selectionDirection, top: description.scrollTop, left: description.scrollLeft } : null;
    var content = panel.querySelector('#aer-error-content');
    var contentTop = content ? content.scrollTop : 0;
    var focusedId = panel.contains(document.activeElement) ? document.activeElement.id : '';
    panel.innerHTML = panelHtml();
    var replacement = panel.querySelector('#aer-description');
    if (description && replacement) {
      // Retain the field itself across incoming logs, including its editing state.
      description.readOnly = replacement.readOnly;
      description.placeholder = replacement.placeholder;
      if (description.value !== descriptionDraft) description.value = descriptionDraft;
      replacement.parentNode.replaceChild(description, replacement);
      description.setSelectionRange(selection.start, selection.end, selection.direction);
    }
    retainedFields.forEach(function (item) {
      var replacementField = panel.querySelector('#' + item.spec[0]);
      if (!replacementField) return;
      item.field.readOnly = replacementField.readOnly;
      item.field.value = reportDraft[item.spec[1]];
      replacementField.parentNode.replaceChild(item.field, replacementField);
      item.field.setSelectionRange(item.start, item.end, item.direction);
      item.field.scrollTop = item.top; item.field.scrollLeft = item.left;
    });
    wirePanelHandlers();
    if (focusedId) {
      var target = document.getElementById(focusedId);
      if (!target || target.disabled || target.tabIndex < 0 || target.hidden || target.closest('[hidden]')) target = document.getElementById('aer-close');
      if (target) {
        try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
      }
    }
    if (description && replacement) { description.scrollTop = selection.top; description.scrollLeft = selection.left; }
    content = panel.querySelector('#aer-error-content');
    if (content) content.scrollTop = contentTop;
  }

  // Clipboard write + button flash, shared by the diagnostics tabs. Mirrors the
  // existing per-tab copy handlers (async clipboard, execCommand fallback).
  function copyDiagnosticsText(text, btnId, resetLabel) {
    text = redactSecrets(text);
    var $ = function (id) { return document.getElementById(id); };
    var flash = function (label) {
      var b = $(btnId);
      if (!b) return;
      b.textContent = label;
      setTimeout(function () { var b2 = $(btnId); if (b2) b2.textContent = resetLabel || 'Copy diagnostics'; }, 1500);
    };
    var fallback = function () {
      try {
        var ta = document.createElement('textarea');
        ta.setAttribute('aria-label', 'Temporary field for copying diagnostics');
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
    if ($('aer-tab-search')) $('aer-tab-search').onclick = function () {
      if (activeTab !== 'search') { activeTab = 'search'; refreshPanelIfOpen(); }
    };
    if ($('aer-tab-compat')) $('aer-tab-compat').onclick = function () {
      if (activeTab !== 'compat') { activeTab = 'compat'; refreshPanelIfOpen(); }
    };
    if ($('aer-compat-run')) $('aer-compat-run').onclick = runCompatChecks;
    if ($('aer-compat-storage')) $('aer-compat-storage').onclick = runCompatDeviceStorage;
    if ($('aer-compat-download')) $('aer-compat-download').onclick = testCompatDownload;
    if ($('aer-compat-file')) $('aer-compat-file').onclick = testCompatFilePicker;
    if ($('aer-compat-copy')) $('aer-compat-copy').onclick = function () {
      copyDiagnosticsText(buildCompatDiagText(), 'aer-compat-copy', 'Copy results');
    };
    if ($('aer-search-refresh')) $('aer-search-refresh').onclick = refreshPanelIfOpen;
    if ($('aer-search-test')) $('aer-search-test').onclick = function () {
      var btn = $('aer-search-test');
      var p = searchProviderRef();
      if (!p || typeof p.selfTest !== 'function') {
        window.__alloSearchSelfTest = {
          ok: false, reason: 'provider-missing', elapsedMs: 0,
          message: 'WebSearchProvider is not loaded, so no search can be attempted.'
        };
        refreshPanelIfOpen();
        return;
      }
      if (btn) { btn.disabled = true; btn.textContent = 'Searching...'; }
      p.selfTest().then(function (res) {
        window.__alloSearchSelfTest = res;
      }).catch(function (err) {
        window.__alloSearchSelfTest = {
          ok: false, reason: 'error', elapsedMs: 0,
          message: String(err && err.message || err)
        };
      }).then(function () { refreshPanelIfOpen(); });
    };
    if ($('aer-search-copy')) $('aer-search-copy').onclick = function () {
      copyDiagnosticsText(buildSearchDiagText(), 'aer-search-copy');
    };
    if ($('aer-sess-refresh')) $('aer-sess-refresh').onclick = refreshPanelIfOpen;
    if ($('aer-sess-copy')) $('aer-sess-copy').onclick = function () {
      var text = redactSecrets(buildSessionDiagText());
      var btn = $('aer-sess-copy');
      var flash = function (label) {
        if (!btn) return;
        btn.textContent = label;
        setTimeout(function () { var b = $('aer-sess-copy'); if (b) b.textContent = 'Copy diagnostics'; }, 1500);
      };
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.setAttribute('aria-label', 'Temporary field for copying session diagnostics');
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
      var text = redactSecrets(buildTtsDiagText());
      var btn = $('aer-tts-copy');
      var flash = function (label) {
        if (!btn) return;
        btn.textContent = label;
        setTimeout(function () { var b = $('aer-tts-copy'); if (b) b.textContent = 'Copy diagnostics'; }, 1500);
      };
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.setAttribute('aria-label', 'Temporary field for copying text-to-speech diagnostics');
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
      resetReportDraft();
      persistBuffer();
      updateBadge();
      refreshPanelIfOpen();
    };
    if ($('aer-copy')) $('aer-copy').onclick = function () {
      var p = buildReportPayload();
      var text = redactSecrets('== AlloFlow Error Report ==\n' +
        'Type: ' + p.typeOfIssue + '\n' +
        'Browser: ' + p.browserDevice + '\n\n' +
        'Context:\n' + p.stepsRepro + '\n\n' +
        'Log:\n' + p.whatHappened);
      
      function copyFallback(txt) {
        try {
          var ta = document.createElement('textarea');
          ta.setAttribute('aria-label', 'Temporary field for copying the error report');
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
    if ($('aer-description')) {
      $('aer-description').oninput = function () {
        if (this !== $('aer-description') || submission.status === 'sending' || submission.status === 'saved') {
          this.value = descriptionDraft;
          return;
        }
        captureDescriptionDraft();
        updateReviewControls();
      };
      $('aer-description').oncompositionstart = function () {
        if (this === $('aer-description') && !this.readOnly) descriptionComposing = true;
      };
      $('aer-description').oncompositionend = function () {
        if (this !== $('aer-description')) return;
        descriptionComposing = false;
        captureDescriptionDraft();
        if (descriptionRefreshPending) { descriptionRefreshPending = false; refreshPanelIfOpen(); }
      };
    }
    OUTGOING_FIELDS.forEach(function (spec) {
      var field = $(spec[0]);
      if (!field) return;
      field.oninput = function () {
        if (this !== $(spec[0]) || this.readOnly) return;
        captureOutgoingDraft();
        updateReviewControls();
      };
      field.oncompositionstart = function () { if (!this.readOnly) descriptionComposing = true; };
      field.oncompositionend = function () {
        descriptionComposing = false;
        captureOutgoingDraft();
        updateReviewControls();
        if (descriptionRefreshPending) { descriptionRefreshPending = false; refreshPanelIfOpen(); }
      };
    });
    if ($('aer-review-confirm')) $('aer-review-confirm').onchange = function () {
      if (submission.status === 'sending' || submission.status === 'saved') return;
      var checked = this.checked;
      var policy = getSupportReportingPolicy();
      reviewedSignature = '';
      if (policy.signature !== displayedPolicySignature || !policy.enabled) {
        reviewNotice = 'The support policy changed. Review the current destination before confirming.';
        refreshPanelIfOpen();
        return;
      }
      if (sanitizeReviewDraft()) { refreshPanelIfOpen(); return; }
      if (checked) { reviewedSignature = payloadSignature(policy); reviewNotice = ''; }
      updateReviewControls();
    };
    if ($('aer-refresh-report')) $('aer-refresh-report').onclick = function () {
      if (submission.status === 'sending' || submission.status === 'saved') return;
      captureDescriptionDraft();
      resetReportDraft();
      reviewNotice = 'The draft was updated from the current log. Review and confirm it before sending.';
      refreshPanelIfOpen();
    };
    // Either choice changes what is sent, so the draft is rebuilt and must be confirmed again.
    if ($('aer-category')) $('aer-category').onchange = function () {
      if (submission.status === 'sending' || submission.status === 'saved') return;
      captureDescriptionDraft();
      reportCategory = this.value;
      reviewedSignature = '';
      refreshPanelIfOpen();
    };
    if ($('aer-include-log')) $('aer-include-log').onchange = function () {
      if (submission.status === 'sending' || submission.status === 'saved') return;
      captureDescriptionDraft();
      includeTechnicalLog = this.checked;
      resetReportDraft();
      reviewNotice = '';
      refreshPanelIfOpen();
    };
    if ($('aer-send')) $('aer-send').onclick = submitReport;
    if ($('aer-goto-confirm')) $('aer-goto-confirm').onclick = function () {
      var box = $('aer-review-confirm');
      if (!box) return;
      if (box.scrollIntoView) box.scrollIntoView({ block: 'center' });
      box.focus();
    };
    if ($('aer-copy-receipt')) $('aer-copy-receipt').onclick = function () {
      if (submission.status !== 'saved' || !submission.id) return;
      copyDiagnosticsText('AlloFlow report saved\nReceipt: ' + submission.id + '\nSaved: ' + submission.savedAt + '\nStorage confirmed; developer review is not confirmed.', 'aer-copy-receipt', 'Copy receipt');
    };
    if ($('aer-new-report')) $('aer-new-report').onclick = function () {
      if (submission.status !== 'saved') return;
      submission = { status: 'idle', id: '', savedAt: '', message: '', formOpened: false };
      descriptionDraft = '';
      includeTechnicalLog = false;
      reportCategory = '';
      resetReportDraft();
      reviewNotice = '';
      if ($('aer-description')) $('aer-description').value = '';
      refreshPanelIfOpen();
      if ($('aer-description')) $('aer-description').focus();
    };
    if ($('aer-report-form')) $('aer-report-form').onclick = function (event) {
      var policy = getSupportReportingPolicy();
      if (!policy.enabled || !policy.allowGoogleFormFallback || !reviewedSignature
          || reviewedSignature !== payloadSignature(policy)) {
        if (event) event.preventDefault();
        reviewedSignature = '';
        reviewNotice = 'The report or support policy changed. Review it again before using an external report form.';
        refreshPanelIfOpen();
        return false;
      }
      if (submission.formOpened) return;
      submission.formOpened = true;
      // A form in another tab has its own Submit action. Never treat opening it
      // as a successful report or put the captured log in its public URL.
      var status = $('aer-submit-status');
      if (status) status.appendChild(document.createTextNode(' This app cannot confirm a submission made in that form.'));
      window.open(FORM_BASE, '_blank', 'noopener,noreferrer');
    };
  }

  // ── Public API on window.AlloModules ──
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ErrorReporter = {
    record: record,
    setIncludeWarns: function (v) { includeWarns = !!v; prefs.includeWarns = includeWarns; persistPrefs(); },
    getBuffer: function () { return buffer.map(function (entry) { return sanitizeDiagnosticValue(entry); }); },
    clearBuffer: function () { buffer.length = 0; resetReportDraft(); persistBuffer(); updateBadge(); refreshPanelIfOpen(); },
    getSupportReportingPolicy: getSupportReportingPolicy,
    redactSecrets: redactSecrets,
    openPanel: openPanel,
    // The host calls this when the view changes, so the badge and an open panel follow it.
    refreshView: function () { updateBadge(); refreshPanelIfOpen(); },
    // Direct deep-link to the read-aloud/TTS trace tab (AI backend settings
    // exposes this so the log is reachable with ZERO captured errors — a
    // stuck read-aloud rarely throws, it just stalls).
    openReadAloudLog: function () { openPanel('tts'); },
    openCompatibilityCheck: function () { openPanel('compat'); },
    // Same reasoning for web search: a missing transport throws nothing and
    // captures no error, so the Search tab has to be reachable with an empty
    // error buffer. Grounded features link here when a search comes back dry.
    openSearchLog: function () { openPanel('search'); },
    // Manual entry always opens the report form, even after visiting another
    // diagnostics tab. Repeated entry must not toggle the dialog closed.
    openManualReport: function () {
      openPanel('errors');
      var reportPanel = panel;
      var description = reportPanel && reportPanel.querySelector('#aer-description');
      if (description) description.focus();
      // A settings dialog that launched us may restore its old focus as it
      // closes. Repair that handoff without moving focus inside this dialog.
      var restoreReportFocus = function () {
        if (panel !== reportPanel || activeTab !== 'errors' || !reportPanel || reportPanel.contains(document.activeElement)) return;
        var field = reportPanel.querySelector('#aer-description');
        if (field) field.focus();
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(restoreReportFocus);
      else setTimeout(restoreReportFocus, 0);
    }
  };
  // Generation modules can finish before this async reporter script arrives.
  // Drain their bounded hand-off queue so the first failed pack is not lost.
  try {
    var pendingReports = window.__alloPendingErrorReports;
    if (Array.isArray(pendingReports)) {
      pendingReports.slice().forEach(function (entry) {
        if (!entry || !entry.message) return;
        record(entry.level || 'error', entry.message, entry.stack || '', entry.source || 'pending-diagnostic', 0, 0);
      });
      delete window.__alloPendingErrorReports;
    }
  } catch (_) {}

  // Global convenience hook for host surfaces (settings panels, help flows).
  if (Array.isArray(window.__alloApiFeedbackHistory)) {
    window.__alloApiFeedbackHistory.slice(-100).forEach(function (detail) {
      try { receiveApiFeedback(detail); } catch (_) {}
    });
  }
  try { window.__alloOpenDiagnosticsLog = function (tab) { openPanel(tab === 'tts' || tab === 'session' || tab === 'search' || tab === 'compat' ? tab : 'errors'); }; } catch (_) {}

  // A timed-out module that arrives later drops out of the count.
  try {
    window.addEventListener('alloflow:module-registry-changed', function () {
      updateBadge();
      if (buffer.some(function (e) { return e.load === LOAD_ID && /^\[CDN-TIMEOUT\]/.test(e.message || ''); })) refreshPanelForLog();
    });
  } catch (_) {}

  // Errors drained from the pending queue above can show the badge.
  // document.body may not be ready yet during early load; defer.
  if (document.body) {
    updateBadge();
  } else {
    document.addEventListener('DOMContentLoaded', updateBadge);
  }

  console.log('[ErrorReporter] Loaded. Buffered entries: ' + buffer.length);
})();
