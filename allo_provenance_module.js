// allo_provenance_module.js — Process Provenance P0: the ledger core.
// Design: docs/PROCESS_PROVENANCE_DESIGN_2026-08-04.md
//
// DELIBERATELY INERT IN P0. Nothing in the app creates a ledger yet: per hard
// constraint 2, live collection may not exist before the student-owned "Work
// Story" review surface (P1) exists. This file is the fully-tested core that
// P1 wires up — shipping it separately keeps the tree additive while other
// agents work.
//
// The constraints this code enforces STRUCTURALLY (not by policy):
//   - Metadata-first: events are schema-whitelisted; unknown keys are
//     STRIPPED, free-text fields are absent or hard-capped. There is no API
//     for storing keystroke transcripts or screenshots.
//   - Tamper-EVIDENT, never claimed tamper-proof: SHA-256 hash chain over
//     canonical JSON; verifyLedger reports the first broken link.
//   - The two-lens wall (constraint 8): summarizeProcess (integrity lens)
//     and summarizeSupport (MTSS support-fade lens) are separate functions,
//     and the integrity summary NEVER contains prompt-level/support fields.
//   - No verdicts: nothing here scores, flags, or classifies anything.
(function () {
  'use strict';
  var GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  if (GLOBAL.AlloModules && GLOBAL.AlloModules.ProvenanceModule) { try { console.log('[CDN] ProvenanceModule already loaded, skipping'); } catch (_) {} return; }

  var LEDGER_VERSION = 1;
  var MAX_EVENTS = 20000; // a school year of assignments, not a keylogger
  var PROMPT_LEVELS = ['model', 'guided', 'hint', 'none'];

  // ── Canonical JSON (sorted keys, stable across engines) ───────────────────
  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + stableStringify(value[k]); }).join(',') + '}';
  }

  // ── SHA-256 via WebCrypto (async; appends are serialized on a promise chain)
  function sha256Hex(text) {
    var subtle = (GLOBAL.crypto && GLOBAL.crypto.subtle) || null;
    if (!subtle) return Promise.reject(new Error('WebCrypto unavailable — provenance chain cannot run.'));
    var bytes = new TextEncoder().encode(String(text));
    return subtle.digest('SHA-256', bytes).then(function (buf) {
      var v = new Uint8Array(buf), out = '';
      for (var i = 0; i < v.length; i++) out += (v[i] < 16 ? '0' : '') + v[i].toString(16);
      return out;
    });
  }

  // ── Event schema: whitelist of types and, per type, of fields ─────────────
  var clampStr = function (v, n) { return String(v == null ? '' : v).slice(0, n); };
  var clampInt = function (v, lo, hi) { var n = Math.round(Number(v)); if (!isFinite(n)) return null; return Math.max(lo, Math.min(hi, n)); };
  var EVENT_FIELDS = {
    session: function (e) {
      var action = e.action === 'start' || e.action === 'resume' || e.action === 'end' ? e.action : null;
      if (!action) return null;
      var out = { action: action };
      if (e.wallClock != null) out.wallClock = clampStr(e.wallClock, 40);
      if (e.assignmentId != null) out.assignmentId = clampStr(e.assignmentId, 120);
      if (e.policy && typeof e.policy === 'object') out.policy = { studentAi: clampStr(e.policy.studentAi, 20) };
      return out;
    },
    edit: function (e) {
      var chars = clampInt(e.chars, -1e6, 1e6);
      var len = clampInt(e.len, 0, 5e6);
      if (chars === null || len === null) return null;
      return { field: clampStr(e.field, 80), chars: chars, len: len };
    },
    paste: function (e) {
      var chars = clampInt(e.chars, 0, 5e6);
      if (chars === null) return null;
      var hint = e.sourceHint === 'intra-app' ? 'intra-app' : 'external';
      return { field: clampStr(e.field, 80), chars: chars, sourceHint: hint };
    },
    ai: function (e) {
      var level = PROMPT_LEVELS.indexOf(e.promptLevel) >= 0 ? e.promptLevel : 'none';
      var out = {
        support: clampStr(e.support, 60),
        promptHash: clampStr(e.promptHash, 64),
        responseHash: clampStr(e.responseHash, 64),
        promptPreview: clampStr(e.promptPreview, 120),
        promptLevel: level,
        insertedToWork: e.insertedToWork === true
      };
      if (!out.support) return null;
      return out;
    },
    checkpoint: function (e) {
      var dur = clampInt(e.durationSec, 0, 86400);
      if (dur === null) return null;
      return {
        id: clampStr(e.id, 40),
        aiState: e.aiState === 'off' ? 'off' : 'on',
        durationSec: dur,
        answerHash: clampStr(e.answerHash, 64),
        generatedFrom: clampStr(e.generatedFrom, 120)
      };
    },
    revision: function (e) {
      var rev = clampInt(e.rev, 0, 1e6);
      var len = clampInt(e.len, 0, 5e6);
      if (rev === null || len === null) return null;
      return { field: clampStr(e.field, 80), rev: rev, textHash: clampStr(e.textHash, 64), len: len };
    }
  };

  // Whitelist + strip: the ONLY way data enters a ledger. Unknown types and
  // unknown keys cannot be recorded, so the student review surface can
  // truthfully enumerate everything that is collected.
  function sanitizeEvent(type, fields) {
    var shape = EVENT_FIELDS[type];
    if (!shape) return null;
    return shape(fields && typeof fields === 'object' ? fields : {});
  }

  // ── Ledger factory ────────────────────────────────────────────────────────
  // opts.now: injectable ms clock (tests). opts.storage: optional durable
  // buffer with set(ns,key,value)/get(ns,key) (the device-storage bridge API).
  function createLedger(opts) {
    opts = opts || {};
    var now = typeof opts.now === 'function' ? opts.now : function () { return Date.now(); };
    var startedAt = now();
    var startedWallClock = opts.wallClock ? String(opts.wallClock).slice(0, 40) : new Date(startedAt).toISOString();
    var events = [];
    var head = '';
    var chain = Promise.resolve();
    var storage = opts.storage || null;
    var storageNs = 'provenance_buffer';
    var storageKey = clampStr(opts.bufferKey || 'active', 120);

    function append(type, fields) {
      var clean = sanitizeEvent(type, fields);
      if (!clean) return Promise.resolve(null);
      if (events.length >= MAX_EVENTS) return Promise.resolve(null);
      var evt = Object.assign({ t: Math.max(0, now() - startedAt), type: type }, clean);
      chain = chain.then(function () {
        return sha256Hex(head + '|' + stableStringify(evt)).then(function (h) {
          evt.h = h;
          head = h;
          events.push(evt);
          if (storage) {
            // Crash-safe buffer; a failed persist must never lose the session.
            try { storage.set(storageNs, storageKey, exportNow()); } catch (_) {}
          }
          return evt;
        });
      });
      return chain;
    }

    function exportNow() {
      return { version: LEDGER_VERSION, startedWallClock: startedWallClock, events: events.slice(), head: head };
    }

    // ~15s edit buckets: direction + magnitude, never content.
    var buckets = {};
    var BUCKET_MS = opts.bucketMs || 15000;
    function noteEdit(field, deltaChars, len) {
      var key = String(field || '').slice(0, 80);
      var b = buckets[key];
      var t = now();
      if (b && t - b.since < BUCKET_MS) {
        b.chars += Math.round(Number(deltaChars) || 0);
        b.len = Math.max(0, Math.round(Number(len) || 0));
        return Promise.resolve(null);
      }
      var flushed = b ? append('edit', { field: key, chars: b.chars, len: b.len }) : Promise.resolve(null);
      buckets[key] = { since: t, chars: Math.round(Number(deltaChars) || 0), len: Math.max(0, Math.round(Number(len) || 0)) };
      return flushed;
    }
    function flushEdits() {
      var pending = Object.keys(buckets).map(function (key) {
        var b = buckets[key];
        return append('edit', { field: key, chars: b.chars, len: b.len });
      });
      buckets = {};
      return Promise.all(pending);
    }

    return {
      append: append,
      noteEdit: noteEdit,
      flushEdits: flushEdits,
      // export waits for every in-flight append so the head is final.
      export: function () { return chain.then(function () { return exportNow(); }); },
      eventCount: function () { return events.length; }
    };
  }

  // ── Verification: recompute the chain; report the first broken link. ──────
  function verifyLedger(exported) {
    if (!exported || !Array.isArray(exported.events)) return Promise.resolve({ ok: false, brokenAt: 0, reason: 'not a ledger' });
    var evts = exported.events;
    var head = '';
    var i = 0;
    function step() {
      if (i >= evts.length) {
        var headOk = head === String(exported.head || '');
        return Promise.resolve(headOk ? { ok: true, events: evts.length } : { ok: false, brokenAt: evts.length, reason: 'head mismatch' });
      }
      var evt = evts[i];
      var body = {};
      for (var k in evt) if (k !== 'h' && Object.prototype.hasOwnProperty.call(evt, k)) body[k] = evt[k];
      return sha256Hex(head + '|' + stableStringify(body)).then(function (h) {
        if (h !== evt.h) return { ok: false, brokenAt: i, reason: 'chain break' };
        head = h;
        i++;
        return step();
      });
    }
    return step();
  }

  // ── Attach: additive embed in the student project JSON. ───────────────────
  function attachProvenance(projectJson, exported) {
    if (!projectJson || typeof projectJson !== 'object') return projectJson;
    projectJson.provenance = { version: LEDGER_VERSION, ledger: exported, attachedAt: new Date().toISOString() };
    return projectJson;
  }

  // ── The two lenses — separate by API design (constraint 8). ──────────────
  // Integrity lens: observations for the submission view. NEVER includes
  // prompt-level or support-quantity framing; a test pins that its output
  // carries no support fields.
  function summarizeProcess(exported) {
    var evts = (exported && exported.events) || [];
    var sessions = 0, activeMs = 0, lastT = null, aiCount = 0, pasteEvents = [], checkpoints = 0, edits = 0;
    for (var i = 0; i < evts.length; i++) {
      var e = evts[i];
      if (e.type === 'session' && (e.action === 'start' || e.action === 'resume')) sessions++;
      if (e.type === 'ai') aiCount++;
      if (e.type === 'checkpoint') checkpoints++;
      if (e.type === 'edit') edits++;
      if (e.type === 'paste') pasteEvents.push({ t: e.t, chars: e.chars, sourceHint: e.sourceHint });
      if (lastT !== null) activeMs += Math.min(120000, Math.max(0, e.t - lastT));
      lastT = e.t;
    }
    return {
      sessions: Math.max(1, sessions),
      activeMinutes: Math.round(activeMs / 60000),
      editBuckets: edits,
      aiInteractions: aiCount,
      pasteEvents: pasteEvents.slice(0, 200),
      checkpoints: checkpoints
    };
  }
  // Support-fade lens: prompt-level series over time for MTSS/RTI progress
  // views (Leadership Hub). Consumed by team-facing surfaces ONLY — never
  // rendered beside the integrity summary.
  function summarizeSupport(exported) {
    var evts = (exported && exported.events) || [];
    var series = [];
    var counts = { model: 0, guided: 0, hint: 0, none: 0 };
    for (var i = 0; i < evts.length; i++) {
      var e = evts[i];
      if (e.type !== 'ai') continue;
      var level = PROMPT_LEVELS.indexOf(e.promptLevel) >= 0 ? e.promptLevel : 'none';
      counts[level]++;
      series.push({ t: e.t, promptLevel: level, support: e.support });
    }
    return { promptLevelCounts: counts, series: series.slice(0, 2000) };
  }

  // ── P1 (view half): the student-owned "Work Story" view-model. ────────────
  // Student-facing language throughout. The "what we keep" disclosure is
  // DERIVED FROM the event schema, so the promise shown to students can never
  // drift from what the code can actually record; a test pins the mapping
  // covers every schema type exactly. The "what we never keep" list is the
  // hard floor from the design doc.
  var COLLECTION_DESCRIPTIONS = {
    session: 'When you started, took breaks, and finished working',
    edit: 'How much you typed and when — never the words themselves',
    paste: 'When something was pasted in, and how big it was',
    ai: 'Which AlloFlow helpers you used, and when',
    checkpoint: 'Your check-in answers (as digital fingerprints) and how long they took',
    revision: 'How your work grew over time — sizes, not contents'
  };
  var NEVER_COLLECTED = [
    'The words you type (only amounts and timing)',
    'Screenshots or recordings of your screen',
    'Anything you do outside AlloFlow',
    'Your camera or microphone'
  ];
  function describeCollection() {
    return Object.keys(EVENT_FIELDS).map(function (type) {
      return { type: type, what: COLLECTION_DESCRIPTIONS[type] || type };
    });
  }
  function buildWorkStoryModel(exported) {
    var evts = (exported && exported.events) || [];
    var lines = [];
    for (var i = 0; i < evts.length && lines.length < 400; i++) {
      var e = evts[i];
      var min = Math.round(e.t / 60000);
      var at = min < 1 ? 'right away' : 'at ' + min + ' min';
      if (e.type === 'session') lines.push(e.action === 'start' ? 'You started working.' : e.action === 'resume' ? 'You came back to it ' + at + '.' : 'You finished this session ' + at + '.');
      else if (e.type === 'paste') lines.push('You pasted in about ' + e.chars + ' characters ' + at + (e.sourceHint === 'intra-app' ? ' (from your own work in AlloFlow).' : '.'));
      else if (e.type === 'ai') lines.push('You used the ' + (e.support || 'AI') + ' helper ' + at + '.');
      else if (e.type === 'checkpoint') lines.push('You answered a check-in ' + at + ' (' + e.durationSec + 's, AI ' + e.aiState + ').');
    }
    var s = summarizeProcess(exported || { events: [] });
    return {
      summary: 'You worked for about ' + s.activeMinutes + ' minutes across ' + s.sessions + ' session' + (s.sessions === 1 ? '' : 's') + ', typed in ' + s.editBuckets + ' burst' + (s.editBuckets === 1 ? '' : 's') + ', and used AlloFlow helpers ' + s.aiInteractions + ' time' + (s.aiInteractions === 1 ? '' : 's') + '.',
      lines: lines,
      collected: describeCollection(),
      neverCollected: NEVER_COLLECTED.slice(),
      consentPrompt: 'Include your Work Story with this submission? Your teacher will see the timeline above — nothing more. You can look through every line first.'
    };
  }

  // ── P2: the teacher process panel's view-model (surface-agnostic). ────────
  // Takes a loaded student project JSON; returns everything a "Process" panel
  // renders: the one-line summary (the teacher's DEFAULT view per resolved
  // §12.3), expanded observations, and the integrity line with the §7
  // disclaimer verbatim. Integrity lens only — support/prompt-level data is
  // structurally absent (constraint 8). No scores, no flags, ever.
  function buildProcessPanelModel(projectJson) {
    var prov = projectJson && projectJson.provenance;
    var exported = prov && prov.ledger;
    if (!exported || !Array.isArray(exported.events)) {
      return Promise.resolve({ present: false });
    }
    var s = summarizeProcess(exported);
    return verifyLedger(exported).then(function (v) {
      return {
        present: true,
        summaryLine: s.sessions + ' session' + (s.sessions === 1 ? '' : 's') + ' · ' +
          s.activeMinutes + ' min · ' + s.aiInteractions + ' AI support' + (s.aiInteractions === 1 ? '' : 's') +
          (s.checkpoints ? ' · ' + s.checkpoints + ' checkpoint' + (s.checkpoints === 1 ? '' : 's') + ' attached' : ''),
        process: s,
        startedWallClock: String(exported.startedWallClock || ''),
        integrity: {
          verified: v.ok === true,
          line: v.ok === true
            ? 'Chain verified (' + (v.events || 0) + ' events).'
            : 'This record could not be verified' + (typeof v.brokenAt === 'number' ? ' (breaks at event ' + v.brokenAt + ')' : '') + '.',
          disclaimer: 'This record is tamper-evident, not tamper-proof. It documents process; it does not convict anyone.'
        }
      };
    });
  }

  // ── P1 (surface half): the student's Work Story panel. ───────────────────
  // Rendered by the host beside the student's save/submit controls. Consent
  // is DEFAULT-UNCHECKED and lives here, so the same component that shows the
  // student what is recorded is the one that asks to include it. Ships inside
  // this module (not a separate view module) so collection and surface can
  // never be deployed apart.
  function WorkStoryPanel(props) {
    var React = GLOBAL.React;
    if (!React || !React.createElement) return null;
    var h = React.createElement;
    var t = (props && props.t) || function (k, f) { return f || k; };
    var model = (props && props.model) || null;
    var open = React.useState(false);
    var isOpen = open[0], setOpen = open[1];
    if (!model) return null;
    var included = !!(props && props.included);
    var onToggle = (props && props.onToggle) || function () {};
    var onClear = props && props.onClear;
    return h('section', { className: 'rounded-3xl shadow-lg overflow-hidden shrink-0 mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700', 'aria-labelledby': 'allo-work-story-title' },
      h('div', { className: 'p-3' },
        h('div', { id: 'allo-work-story-title', className: 'text-sm font-bold flex items-center gap-2' }, '📖 ' + t('work_story.title', 'Your Work Story')),
        h('p', { className: 'text-xs mt-1 opacity-80' }, model.summary),
        h('label', { className: 'flex items-start gap-2 mt-2 text-xs cursor-pointer' },
          h('input', { type: 'checkbox', checked: included, onChange: function (e) { onToggle(!!e.target.checked); }, className: 'mt-0.5' }),
          h('span', null, model.consentPrompt)
        ),
        h('button', {
          type: 'button',
          onClick: function () { setOpen(!isOpen); },
          'aria-expanded': isOpen ? 'true' : 'false',
          className: 'mt-2 text-xs underline'
        }, isOpen ? t('work_story.hide', 'Hide the details') : t('work_story.show', 'See everything in it')),
        isOpen ? h('div', { className: 'mt-2 text-xs' },
          h('ol', { className: 'list-decimal ml-4 space-y-0.5' }, model.lines.map(function (line, i) { return h('li', { key: i }, line); })),
          h('p', { className: 'mt-2 font-semibold' }, t('work_story.kept', 'What this keeps:')),
          h('ul', { className: 'list-disc ml-4' }, model.collected.map(function (c) { return h('li', { key: c.type }, c.what); })),
          h('p', { className: 'mt-2 font-semibold' }, t('work_story.never', 'What it never keeps:')),
          h('ul', { className: 'list-disc ml-4' }, model.neverCollected.map(function (n, i) { return h('li', { key: i }, n); })),
          onClear ? h('button', { type: 'button', onClick: onClear, className: 'mt-2 text-xs underline' }, t('work_story.clear', 'Delete what has been recorded so far')) : null
        ) : null
      )
    );
  }

  GLOBAL.AlloModules = GLOBAL.AlloModules || {};
  GLOBAL.AlloModules.WorkStoryPanel = WorkStoryPanel;
  GLOBAL.AlloModules.Provenance = {
    WorkStoryPanel: WorkStoryPanel,
    buildProcessPanelModel: buildProcessPanelModel,
    buildWorkStoryModel: buildWorkStoryModel,
    describeCollection: describeCollection,
    createLedger: createLedger,
    verifyLedger: verifyLedger,
    attachProvenance: attachProvenance,
    summarizeProcess: summarizeProcess,
    summarizeSupport: summarizeSupport,
    sanitizeEvent: sanitizeEvent,
    stableStringify: stableStringify,
    LEDGER_VERSION: LEDGER_VERSION,
    PROMPT_LEVELS: PROMPT_LEVELS.slice()
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = GLOBAL.AlloModules.Provenance;
  GLOBAL.AlloModules.ProvenanceModule = true;
  try { console.log('[Provenance] ledger core registered (inert until the Work Story surface ships)'); } catch (_) {}
})();
