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
  // ── P3 vocabularies (all fail toward the non-incriminating value) ─────────
  var CHECKPOINT_OUTCOMES = ['answered', 'skipped', 'deferred', 'unavailable'];
  var CHECKPOINT_RESPONSE_MODES = ['text', 'audio', 'choice', 'point'];
  var DURATION_BUCKETS = ['under_1m', '1_5m', '5_15m', 'over_15m', 'unknown'];
  // What a teacher may conclude, in code. There is no 'failed', no
  // 'insufficient', no number: a weak answer is evidence of nothing.
  var CHECKPOINT_VERDICTS = ['confirmed', 'talk_with_student'];
  // ★ Accommodations are NEVER suppressed by a checkpoint. The AI-off state
  // may only pause generative answer-production; read-aloud, glossary,
  // translation, simplified text and input aids are access, not answers.
  // Default-deny on the gate list, default-allow on accommodations.
  var CHECKPOINT_ALWAYS_ALLOWED = ['read_aloud', 'glossary', 'translate', 'simplified',
    'spellcheck', 'word_prediction', 'speech_to_text', 'magnify'];
  var CHECKPOINT_GATED_SUPPORTS = ['allobot', 'compose', 'explain_content', 'answer_help'];
  function isAllowedDuringCheckpoint(support) {
    var s = String(support || '').toLowerCase();
    if (CHECKPOINT_ALWAYS_ALLOWED.indexOf(s) >= 0) return true;
    if (CHECKPOINT_GATED_SUPPORTS.indexOf(s) >= 0) return false;
    return false; // unclassified generative support: gated, never guessed open
  }
  function bucketDuration(sec) {
    var n = Number(sec);
    if (!isFinite(n) || n < 0) return 'unknown';
    if (n < 60) return 'under_1m';
    if (n < 300) return '1_5m';
    if (n < 900) return '5_15m';
    return 'over_15m';
  }

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
      // NEVER synthesize a definite origin. An IME composition, an AAC device,
      // a word-prediction commit, a dictation flush or an autocorrect
      // replacement all arrive as an unattributable jump — stamping those
      // "external paste" manufactures the exact signal a teacher over-reads,
      // and it hits assistive-technology users hardest.
      var hint = ['intra-app', 'external', 'unknown'].indexOf(e.sourceHint) >= 0 ? e.sourceHint : 'unknown';
      var out = { field: clampStr(e.field, 80), chars: chars, sourceHint: hint };
      if (e.assistiveTech === true) out.assistiveTech = true;
      return out;
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
      // Fail toward 'unknown', never toward the incriminating value: a race,
      // a missing policy read or a typo must not record a student as having
      // answered with AI on.
      var st = (e.aiState === 'off' || e.aiState === 'on') ? e.aiState : 'unknown';
      var outcome = CHECKPOINT_OUTCOMES.indexOf(e.outcome) >= 0 ? e.outcome : 'unavailable';
      var mode = CHECKPOINT_RESPONSE_MODES.indexOf(e.responseMode) >= 0 ? e.responseMode : 'text';
      // Coarse buckets only. Nothing legitimate needs "74 seconds", and a
      // precise duration beside an answer penalizes slow processors,
      // dictation users and extended-time accommodations.
      var bucket = DURATION_BUCKETS.indexOf(e.durationBucket) >= 0 ? e.durationBucket : bucketDuration(e.durationSec);
      return {
        id: clampStr(e.id, 40),
        aiState: st,
        outcome: outcome,
        responseMode: mode,
        durationBucket: bucket,
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

  // The fields that survive the integrity export. Kept beside the stripping
  // logic so the two can never disagree (a drift test pins the pairing).
  var HIDDEN_FROM_SUBMISSION = { promptLevel: true, promptPreview: true };
  function visibleBody(evt) {
    var out = {};
    for (var k in evt) {
      if (!Object.prototype.hasOwnProperty.call(evt, k)) continue;
      if (k === 'h' || k === 'f' || k === 'v') continue;
      if (evt.type === 'ai' && HIDDEN_FROM_SUBMISSION[k]) continue;
      out[k] = evt[k];
    }
    return out;
  }

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
        // DUAL COMMITMENT. f commits to the whole event (including the
        // support-lens fields a teacher must never see); v commits only to
        // the fields that survive stripping. The chain links BOTH, so the
        // integrity export — which carries f and v but not the hidden
        // fields — stays fully verifiable: v catches edits to what the
        // teacher can see, the f-and-v chain catches reorder, drop and head
        // forgery, and f keeps the hidden fields cryptographically committed
        // without ever disclosing them.
        return Promise.all([
          sha256Hex(stableStringify(evt)),
          sha256Hex(stableStringify(visibleBody(evt)))
        ]).then(function (pair) {
          evt.f = pair[0];
          evt.v = pair[1];
          return sha256Hex(head + '|' + evt.f + '|' + evt.v);
        }).then(function (h) {
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
      // ★★ Constraint 8 enforced at the DATA layer, not the view layer. The
      // integrity export physically cannot carry scaffold intensity or the
      // student's own words: promptLevel and promptPreview are deleted from
      // every ai event, so no future panel, export, or JSON.stringify can
      // conflate "needed help" with doubt about the work, and no teacher ever
      // reads what a child typed into a helper. Chain heads are dropped with
      // them (the hashes covered the removed fields), so the submission
      // export is verified by its own recomputed chain — see verifyLedger's
      // lens handling.
      exportForSubmission: function () {
        return chain.then(function () {
          var full = exportNow();
          var stripped = full.events.map(function (e) {
            var copy = visibleBody(e);
            copy.f = e.f; copy.v = e.v; copy.h = e.h; // commitments travel; hidden values do not
            return copy;
          });
          return { version: LEDGER_VERSION, lens: 'integrity', startedWallClock: startedWallClock, events: stripped, head: full.head };
        });
      },
      // MTSS/RTI lane. Separate consumer, separate transport, separate
      // consent — never rendered beside the integrity view.
      exportForSupport: function () {
        return chain.then(function () {
          var full = exportNow();
          return { version: LEDGER_VERSION, lens: 'support', startedWallClock: startedWallClock, events: full.events.slice(), head: full.head };
        });
      },
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
      // Always recomputable: the visible-field commitment. On a full export
      // the whole-event commitment is checked too; on an integrity export the
      // hidden fields are absent by design, so f is verified as a link only.
      var checks = [sha256Hex(stableStringify(visibleBody(evt)))];
      var isFull = exported.lens !== 'integrity';
      if (isFull) {
        var fullBody = {};
        for (var k in evt) if (k !== 'h' && k !== 'f' && k !== 'v' && Object.prototype.hasOwnProperty.call(evt, k)) fullBody[k] = evt[k];
        checks.push(sha256Hex(stableStringify(fullBody)));
      }
      return Promise.all(checks).then(function (got) {
        if (got[0] !== evt.v) return { ok: false, brokenAt: i, reason: 'chain break' };
        if (isFull && got[1] !== evt.f) return { ok: false, brokenAt: i, reason: 'chain break' };
        return sha256Hex(head + '|' + evt.f + '|' + evt.v).then(function (h) {
          if (h !== evt.h) return { ok: false, brokenAt: i, reason: 'chain break' };
          head = h;
          i++;
          return step();
        });
      });
    }
    return step();
  }

  // ── Attach: additive embed in the student project JSON. ───────────────────
  // ★ Refuses anything but the integrity export. The support lens must never
  // ride a submission, so this throws rather than silently downgrading — a
  // caller that hands over the wrong lens has a bug that must be loud.
  function attachProvenance(projectJson, exported) {
    if (!projectJson || typeof projectJson !== 'object') return projectJson;
    if (!exported || exported.lens !== 'integrity') {
      throw new Error('attachProvenance requires an integrity-lens export (use ledger.exportForSubmission()).');
    }
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

  // ── P3: comprehension checkpoints ────────────────────────────────────────
  // Questions generated FROM the student's own artifact, answered by the
  // student, read by the TEACHER. The safety rules below came out of an
  // adversarial review and are enforced in code, not in guidance:
  //
  //  · FIREWALL: the generator sees artifact TEXT ONLY. It never receives the
  //    ledger, paste events, or AI events — a question aimed at a doubted
  //    span would be an accusation delivered to a child in the second person.
  //    Span selection is deterministic given the same text.
  //  · VERBATIM GATE: a quoted span must appear in the artifact character-for-
  //    character, and must not overlap teacher-provided text (starter copy,
  //    sentence frames, the prompt). Hallucinated attribution — "you wrote X"
  //    about a sentence the student never wrote — is accusation-shaped.
  //  · NO ANSWER LEAK: a question copy-answerable from a short adjacent span
  //    rewards the copier and punishes the paraphraser, so those are dropped.
  //  · NO PRODUCTION FLOOR: no minimum words or characters, ever. Written
  //    production measures expressive language, spelling and English
  //    proficiency — not comprehension.
  //  · ANSWERS NEVER ENTER THE LEDGER: they live in project.checkpoints[],
  //    beside the question and source excerpt the teacher must read.
  var CHECKPOINT_TEMPLATES = [
    'You wrote this part yourself. Say more about why it belongs here.',
    'Put this part in your own words, however you like.',
    'What would change in your work if this part were different?',
    'What made you decide to include this?'
  ];
  function normalizeForCompare(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  // A span is student-authored when it survives removal of every provided
  // text (assignment starter, sentence frames, the prompt itself).
  function isStudentAuthoredSpan(span, artifactText, providedTexts) {
    var s = normalizeForCompare(span);
    if (!s) return false;
    if (normalizeForCompare(artifactText).indexOf(s) < 0) return false;
    var provided = Array.isArray(providedTexts) ? providedTexts : [];
    for (var i = 0; i < provided.length; i++) {
      if (normalizeForCompare(provided[i]).indexOf(s) >= 0) return false;
    }
    return true;
  }
  // Copy-answerable check: if the model's own expected answer is contained in
  // the artifact as a short consecutive run of words, the question tests
  // copying, not understanding.
  function isCopyAnswerable(expectedAnswer, artifactText, maxWords) {
    var words = normalizeForCompare(expectedAnswer).split(' ').filter(Boolean);
    if (!words.length) return false;
    if (words.length <= (maxWords || 15) && normalizeForCompare(artifactText).indexOf(words.join(' ')) >= 0) return true;
    return false;
  }
  function sanitizeCheckpointQuestions(raw, artifactText, opts) {
    opts = opts || {};
    var provided = opts.providedTexts || [];
    var list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.questions) ? raw.questions : []);
    var out = [];
    for (var i = 0; i < list.length && out.length < 3; i++) {
      var q = list[i] || {};
      var text = clampStr(q.question || q.text, 240).trim();
      var span = clampStr(q.sourceExcerpt || q.span, 400).trim();
      if (!text || !span) continue;
      if (!isStudentAuthoredSpan(span, artifactText, provided)) continue;      // verbatim + authorship gate
      if (isCopyAnswerable(q.expectedAnswer || '', artifactText, 15)) continue; // answer-leak gate
      if (/^(is|are|was|were|do|does|did|can|will|would|should|has|have)\b/i.test(text)) continue; // yes/no stem
      out.push({
        id: 'cp' + (out.length + 1),
        question: text,
        sourceExcerpt: span,
        sourceFieldId: clampStr(q.sourceFieldId || opts.fieldId || '', 80)
      });
    }
    return out;
  }
  // Local, no-egress fallback: used when the assignment's AI policy forbids
  // sending student writing out, and whenever generation fails. Deterministic.
  function templateCheckpoints(artifactText, opts) {
    opts = opts || {};
    var sentences = String(artifactText || '').split(/(?<=[.!?])\s+/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length >= 25 && isStudentAuthoredSpan(s, artifactText, opts.providedTexts || []); });
    var picks = [];
    for (var i = 0; i < sentences.length && picks.length < 2; i += Math.max(1, Math.floor(sentences.length / 2))) picks.push(sentences[i]);
    return picks.map(function (span, i) {
      return { id: 'cp' + (i + 1), question: CHECKPOINT_TEMPLATES[i % CHECKPOINT_TEMPLATES.length], sourceExcerpt: span, sourceFieldId: clampStr(opts.fieldId || '', 80) };
    });
  }
  // The generator's ONLY inputs: artifact text, provided texts to exclude,
  // reading level, language. No ledger parameter exists — by signature.
  function buildCheckpointPrompt(artifactText, readingLevel, language) {
    return 'A student wrote the text below. Write 2 short questions that ask the student to explain their OWN thinking about it.\n' +
      'STUDENT TEXT:\n"""\n' + String(artifactText || '').slice(0, 6000) + '\n"""\n' +
      'Rules: quote a span the student wrote VERBATIM as sourceExcerpt. Never ask something answerable by copying a short phrase from the text. ' +
      'No yes/no questions. No questions about spelling or grammar. Never quote a misspelling back — normalize it. ' +
      'Do not presume a choice the student may not have made. Write at a ' + (readingLevel || 'grade 5') + ' reading level' +
      (language && language !== 'English' ? ' in ' + language : '') + '.\n' +
      'Reply with ONLY JSON: [{"question":"…","sourceExcerpt":"verbatim span from the text","expectedAnswer":"what a strong answer would say"}]';
  }
  // The record the TEACHER reads. Lives in project.checkpoints[], never in the
  // ledger: the ledger stays metadata-only, and answers stay out of it.
  function buildCheckpointRecord(q, answer, opts) {
    opts = opts || {};
    var outcome = CHECKPOINT_OUTCOMES.indexOf(opts.outcome) >= 0 ? opts.outcome : (answer ? 'answered' : 'unavailable');
    return {
      id: clampStr(q && q.id, 40) || 'cp1',
      questionText: clampStr(q && q.question, 240),
      sourceExcerpt: clampStr(q && q.sourceExcerpt, 400),
      sourceFieldId: clampStr(q && q.sourceFieldId, 80),
      answerText: outcome === 'answered' ? clampStr(answer, 4000) : '',
      answerLanguage: clampStr(opts.answerLanguage || '', 40),
      responseMode: CHECKPOINT_RESPONSE_MODES.indexOf(opts.responseMode) >= 0 ? opts.responseMode : 'text',
      outcome: outcome,
      aiState: (opts.aiState === 'off' || opts.aiState === 'on') ? opts.aiState : 'unknown',
      generatorSource: opts.generatorSource === 'template' ? 'template' : 'ai',
      // Fixed, non-dismissible guidance for the teacher view. Shipped as data
      // so it cannot be styled away or forgotten by a future panel.
      teacherNote: 'A short or unclear answer is not evidence of anything. It is a reason to talk with the student.'
    };
  }
  // Recognition-mode options. Distractors are drawn from the student's OWN
  // other sentences (critique: recognition beats production for students whose
  // expressive language, spelling or English proficiency would otherwise be
  // what gets measured). Deterministic ordering — no Math.random, so the same
  // artifact always yields the same choices and nothing is unreproducible.
  function buildCheckpointChoices(artifactText, correctSpan, providedTexts) {
    var sentences = String(artifactText || '').split(/(?<=[.!?])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length >= 20 && isStudentAuthoredSpan(s, artifactText, providedTexts || []); });
    var correct = String(correctSpan || '').trim();
    var others = sentences.filter(function (s) { return s !== correct; });
    var opts = [correct].concat(others.slice(0, 3)).filter(Boolean);
    // Stable rotation by span length so the answer is not always first.
    var shift = correct.length % Math.max(1, opts.length);
    return opts.slice(shift).concat(opts.slice(0, shift));
  }

  // Salted so two students who write the same sentence never collide — an
  // unsalted hash is an accidental plagiarism detector and, for short
  // answers, brute-forceable back into the words it promised not to keep.
  function makeCheckpointSalt() {
    try {
      var a = new Uint8Array(16);
      GLOBAL.crypto.getRandomValues(a);
      var s = '';
      for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16);
      return s;
    } catch (_) { return ''; }
  }
  function hashCheckpointAnswer(salt, answer) {
    return sha256Hex(String(salt || '') + '|' + String(answer || ''));
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
    // Honest: the ai shape retains a 120-char promptPreview for the student's
    // OWN view. It is stripped from exportForSubmission, so a teacher never
    // reads it — but the student must be told it exists at all.
    ai: 'Which AlloFlow helpers you used and when — and, in this view only, the start of what you asked them',
    checkpoint: 'Your check-in answers (as digital fingerprints) and how long they took',
    revision: 'How your work grew over time — sizes, not contents'
  };
  var NEVER_COLLECTED = [
    'The words of your assignment answers (only amounts and timing)',
    'What you asked a helper — that never goes to your teacher',
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

  // ── P3 (surface): the student's checkpoint card. ─────────────────────────
  // The §13.5 invariants are behaviour here, not guidance:
  //   · NEVER BLOCKS — a card, not a modal; "I'll come back to this" is
  //     always available and unlimited, and records nothing a teacher sees.
  //   · THE WORK STAYS VISIBLE — this renders beside the student's work and
  //     always shows the source excerpt, so it is never a memory test.
  //   · FOUR RESPONSE MODES ship together; the student picks.
  //   · ESCAPE HATCH — "This question doesn't fit my work" voids the question
  //     and reports it as generator quality, never as a refusal.
  //   · NO PRODUCTION FLOOR — Answer is never disabled on length.
  //   · ACCOMMODATIONS STAY ON, and the card says which.
  function CheckpointPanel(props) {
    var React = GLOBAL.React;
    if (!React || !React.createElement) return null;
    var h = React.createElement;
    var t = (props && props.t) || function (k, f) { return f || k; };
    var q = props && props.question;
    var st = React.useState({ mode: 'text', text: '', choice: '', speaking: false });
    var s = st[0], set = st[1];
    if (!q) return null;
    var onAnswer = (props && props.onAnswer) || function () {};
    var onDefer = (props && props.onDefer) || function () {};
    var onMisfit = (props && props.onMisfit) || function () {};
    var allowed = (props && props.allowedSupports) || CHECKPOINT_ALWAYS_ALLOWED;
    var choices = (props && props.choices) || [];

    var modeBtn = function (id, label) {
      return h('button', {
        key: id, type: 'button',
        onClick: function () { set(Object.assign({}, s, { mode: id })); },
        'aria-pressed': s.mode === id ? 'true' : 'false',
        className: 'text-xs px-2 py-1 rounded border ' + (s.mode === id ? 'bg-indigo-100 border-indigo-300' : 'border-slate-300')
      }, label);
    };
    // Speaking uses on-device speech-to-text (an allowed accommodation) and
    // becomes text the student can edit. Honest label: nothing is uploaded.
    var startSpeaking = function () {
      var SR = GLOBAL.SpeechRecognition || GLOBAL.webkitSpeechRecognition;
      if (!SR) return;
      try {
        var rec = new SR();
        rec.lang = (props && props.language) || 'en-US';
        rec.onresult = function (ev) {
          var said = '';
          for (var i = 0; i < ev.results.length; i++) said += ev.results[i][0].transcript;
          set(function (prev) { return Object.assign({}, prev, { text: (prev.text ? prev.text + ' ' : '') + said, speaking: false }); });
        };
        rec.onerror = function () { set(function (prev) { return Object.assign({}, prev, { speaking: false }); }); };
        rec.onend = function () { set(function (prev) { return Object.assign({}, prev, { speaking: false }); }); };
        set(Object.assign({}, s, { speaking: true }));
        rec.start();
      } catch (_) { set(Object.assign({}, s, { speaking: false })); }
    };

    return h('section', { className: 'rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3 mb-4', 'aria-labelledby': 'allo-cp-title' },
      h('div', { id: 'allo-cp-title', className: 'text-sm font-bold' }, '💬 ' + t('checkpoint.title', 'A quick check-in about your work')),
      h('blockquote', { className: 'text-xs mt-2 p-2 rounded bg-white border-l-4 border-indigo-300' }, '“' + q.sourceExcerpt + '”'),
      h('p', { className: 'text-sm mt-2 font-medium' }, q.question),
      h('p', { className: 'text-[11px] mt-1 opacity-70' },
        t('checkpoint.support_note', 'Still available while you answer: ') + allowed.slice(0, 4).join(', ').replace(/_/g, ' ') +
        t('checkpoint.support_note2', '. Only the answer helper is paused.')),
      h('div', { className: 'flex gap-1 mt-2 flex-wrap' }, [
        modeBtn('text', t('checkpoint.mode_text', '⌨️ Type')),
        modeBtn('audio', t('checkpoint.mode_audio', '🎤 Speak')),
        choices.length > 1 ? modeBtn('choice', t('checkpoint.mode_choice', '☑️ Choose')) : null,
        modeBtn('point', t('checkpoint.mode_point', '👆 Point to it'))
      ].filter(Boolean)),
      s.mode === 'choice'
        ? h('div', { className: 'mt-2 flex flex-col gap-1' }, choices.map(function (c, i) {
            return h('label', { key: i, className: 'text-xs flex items-start gap-2' },
              h('input', { type: 'radio', name: 'allo-cp-choice', checked: s.choice === c, onChange: function () { set(Object.assign({}, s, { choice: c })); } }),
              h('span', null, c));
          }))
        : s.mode === 'point'
          ? h('p', { className: 'text-xs mt-2' }, t('checkpoint.point_help', 'Click the sentence in your work that this is about, then press Answer.'))
          : h('div', { className: 'mt-2' },
              s.mode === 'audio' ? h('button', {
                type: 'button', onClick: startSpeaking,
                className: 'text-xs px-2 py-1 rounded border border-slate-300 mb-1'
              }, s.speaking ? t('checkpoint.listening', '🔴 Listening — say your answer') : t('checkpoint.speak', '🎤 Speak your answer (it becomes text on this device)')) : null,
              h('textarea', {
                value: s.text,
                onChange: function (e) { set(Object.assign({}, s, { text: e.target.value })); },
                rows: 3,
                'aria-label': t('checkpoint.answer_label', 'Your answer'),
                className: 'w-full text-sm p-2 rounded border border-slate-300'
              })),
      h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
        // NO PRODUCTION FLOOR: Answer is never disabled on how much was
        // written. A word minimum would measure expressive language, spelling
        // and English proficiency, then present it as evidence about
        // authorship — do not add one here.
        h('button', {
          type: 'button',
          onClick: function () { onAnswer(s.mode === 'choice' ? s.choice : s.text, s.mode); },
          className: 'text-xs px-3 py-1 rounded bg-indigo-600 text-white'
        }, t('checkpoint.answer', 'Answer')),
        h('button', { type: 'button', onClick: function () { onDefer(); }, className: 'text-xs px-3 py-1 rounded border border-slate-300' },
          t('checkpoint.later', 'I’ll come back to this')),
        h('button', { type: 'button', onClick: function () { onMisfit(); }, className: 'text-xs px-3 py-1 rounded border border-slate-300' },
          t('checkpoint.misfit', 'This question doesn’t fit my work'))
      ),
      h('p', { className: 'text-[11px] mt-2 opacity-70' },
        t('checkpoint.no_grade', 'This is not graded here, there is no timer, and your work stays open while you answer.'))
    );
  }

  // ── P2 (surface): the teacher's Process panel. ───────────────────────────
  // Renders buildProcessPanelModel. Deliberately spare: the one-line summary
  // is the DEFAULT view so the first read is "process", not doubt; details
  // are behind a click; the integrity line is stated with its disclaimer and
  // NEVER styled as an alarm. No score, no flag, no duration beside anything.
  function ProcessPanel(props) {
    var React = GLOBAL.React;
    if (!React || !React.createElement) return null;
    var h = React.createElement;
    var model = props && props.model;
    var open = React.useState(false);
    var isOpen = open[0], setOpen = open[1];
    if (!model || !model.present) return null;
    var p = model.process || {};
    var muted = { color: '#475569', fontSize: '0.8rem' };
    return h('div', { style: { marginTop: 10, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' } },
      h('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Work Story'),
      h('div', { style: { fontSize: '0.85rem', color: '#1e293b', marginTop: 4 } }, model.summaryLine),
      h('button', {
        type: 'button',
        onClick: function () { setOpen(!isOpen); },
        'aria-expanded': isOpen ? 'true' : 'false',
        style: { marginTop: 6, fontSize: '0.78rem', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#475569' }
      }, isOpen ? 'Hide details' : 'See how this work came together'),
      isOpen ? h('div', { style: { marginTop: 6 } },
        h('div', { style: muted }, 'Sessions: ' + p.sessions + ' · Active time: ' + p.activeMinutes + ' min · Typing bursts: ' + p.editBuckets + ' · AlloFlow AI supports used: ' + p.aiInteractions),
        (p.pasteEvents && p.pasteEvents.length)
          ? h('div', { style: { marginTop: 4 } },
              h('div', { style: muted }, 'Text arrived in ' + p.pasteEvents.length + ' larger insertion' + (p.pasteEvents.length === 1 ? '' : 's') + ':'),
              h('ul', { style: { margin: '2px 0 0 16px', padding: 0 } }, p.pasteEvents.slice(0, 12).map(function (ev, i) {
                return h('li', { key: i, style: muted }, Math.round(ev.t / 60000) + ' min in · ~' + ev.chars + ' characters · origin ' +
                  (ev.sourceHint === 'unknown' ? 'not recorded' : ev.sourceHint) + (ev.assistiveTech ? ' · entered with assistive technology' : ''));
              })))
          : h('div', { style: Object.assign({ marginTop: 4 }, muted) }, 'No large insertions recorded.'),
        h('div', { style: { marginTop: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 6, fontSize: '0.78rem', color: '#475569' } },
          model.integrity.line + ' ' + model.integrity.disclaimer)
      ) : null,
      // Checkpoints: the ANSWER first and alone beside its excerpt, under the
      // fixed guidance line. No duration, no length, no verdict — and a
      // non-answer renders in the same neutral register as an answer.
      (props.checkpoints && props.checkpoints.length) ? h('div', { style: { marginTop: 10 } },
        h('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Check-ins'),
        h('div', { style: { margin: '4px 0 6px', padding: '6px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: '0.78rem', color: '#475569' } },
          props.checkpoints[0].teacherNote || 'A short or unclear answer is not evidence of anything. It is a reason to talk with the student.'),
        props.checkpoints.map(function (c, i) {
          return h('div', { key: i, style: { marginTop: 6, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6 } },
            h('div', { style: { fontSize: '0.85rem', color: '#1e293b' } },
              c.outcome === 'answered' ? c.answerText : 'Not attempted. This can happen for many reasons, including technical ones.'),
            h('div', { style: { fontSize: '0.75rem', color: '#475569', marginTop: 4 } }, 'Question: ' + c.questionText),
            c.sourceExcerpt ? h('div', { style: { fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' } }, 'About: “' + c.sourceExcerpt + '”') : null,
            c.answerLanguage ? h('div', { style: { fontSize: '0.72rem', color: '#475569' } }, 'Answered in ' + c.answerLanguage) : null);
        })
      ) : null
    );
  }

  GLOBAL.AlloModules = GLOBAL.AlloModules || {};
  var PROVENANCE_API = {
    ProcessPanel: ProcessPanel,
    CheckpointPanel: CheckpointPanel,
    buildCheckpointChoices: buildCheckpointChoices,
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
    // Exported for checkpoint answer fingerprints (P3): the ledger stores a
    // hash of an answer, never the answer text.
    hashText: sha256Hex,
    LEDGER_VERSION: LEDGER_VERSION,
    PROMPT_LEVELS: PROMPT_LEVELS.slice(),
    // ── P3 ──
    sanitizeCheckpointQuestions: sanitizeCheckpointQuestions,
    templateCheckpoints: templateCheckpoints,
    buildCheckpointPrompt: buildCheckpointPrompt,
    buildCheckpointRecord: buildCheckpointRecord,
    makeCheckpointSalt: makeCheckpointSalt,
    hashCheckpointAnswer: hashCheckpointAnswer,
    isAllowedDuringCheckpoint: isAllowedDuringCheckpoint,
    isStudentAuthoredSpan: isStudentAuthoredSpan,
    bucketDuration: bucketDuration,
    CHECKPOINT_ALWAYS_ALLOWED: CHECKPOINT_ALWAYS_ALLOWED.slice(),
    CHECKPOINT_OUTCOMES: CHECKPOINT_OUTCOMES.slice(),
    CHECKPOINT_RESPONSE_MODES: CHECKPOINT_RESPONSE_MODES.slice(),
    CHECKPOINT_VERDICTS: CHECKPOINT_VERDICTS.slice(),
    DURATION_BUCKETS: DURATION_BUCKETS.slice()
  };
  // Registered against `window` LITERALLY, not via the GLOBAL alias: the
  // repo's registry gate and the loadModule contract both scan for
  // `window.AlloModules.<Name>` as text, so an aliased assignment registers
  // nothing they can see — and loadModule would false-alarm on every load.
  // The GLOBAL alias stays for the Node/test path below.
  GLOBAL.AlloModules.Provenance = PROVENANCE_API;
  GLOBAL.AlloModules.WorkStoryPanel = WorkStoryPanel;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.Provenance = PROVENANCE_API;
    window.AlloModules.WorkStoryPanel = WorkStoryPanel;
    window.AlloModules.ProcessPanel = ProcessPanel;
    window.AlloModules.CheckpointPanel = CheckpointPanel;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = PROVENANCE_API;
  GLOBAL.AlloModules.ProvenanceModule = true;
  try { console.log('[Provenance] ledger core registered (inert until the Work Story surface ships)'); } catch (_) {}
})();
