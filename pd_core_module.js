/**
 * AlloFlow — Professional Development (PD) core logic module
 *
 * Pure, framework-free logic for community-authored educator PD modules:
 *   - the pd_module data schema + validatePdModule()
 *   - a NORMALIZED per-activity result contract (normalizeResult)
 *   - the gate evaluator (evaluateGate / evaluateModule) — the single piece
 *     that turns a passive lesson into gated PD (score >= threshold to advance)
 *   - the completion-record builder (buildCompletionRecord), designed so a
 *     Tier-1 self-paced record can be re-issued at Tier 2/3 (server / Open
 *     Badges) WITHOUT data loss.
 *
 * No React, no DOM, no network — so it is unit-testable and reusable by the
 * (Phase 2) PdRunner view + the catalogue PD tab. Registers on
 * window.AlloModules.PdCore (browser) and module.exports (Node/tests).
 *
 * Trust note: a purely client-side app CANNOT produce tamper-proof proof.
 * The record built here is an honestly-labelled "self-paced completion
 * record", NOT an accredited credential. See issuer.kind.
 */
(function () {
  'use strict';

  var SCHEMA_VERSION = 'pd-1.0';
  var COMPLETION_SCHEMA_VERSION = 'pd-completion-1.0';
  var DEFAULT_THRESHOLD = 0.8;

  // Activity types understood by the runner. 'sim' is an AI-assessed scenario
  // (formative masteryScore 0..100); wired in the runner, not the AI generator.
  var ACTIVITY_TYPES = ['read', 'quiz', 'reflect', 'video', 'checklist', 'sim'];
  // Types whose objective score may GATE advancement. 'sim' is deliberately
  // excluded: its masteryScore is an AI-self-reported, fuzzy FORMATIVE estimate,
  // so it must never block a learner (and could strand them) — sim is always
  // none-gated and completes on a written response.
  var SCORABLE_TYPES = ['quiz'];

  function isNum(n) { return typeof n === 'number' && !isNaN(n); }

  // ── Validation ────────────────────────────────────────────────────────────
  // Accepts a parsed object OR a JSON string (mirrors catalog validateLessonJson).
  // Rejects modules that are not *completable* (e.g. a score gate with no answer
  // key, or a score gate on a non-scorable activity) so the catalogue never
  // ships a PD module a learner can get permanently stuck on.
  function validatePdModule(input) {
    var obj = input;
    if (typeof input === 'string') {
      if (!input.trim()) return { ok: false, error: 'Empty input.' };
      try { obj = JSON.parse(input); } catch (e) { return { ok: false, error: 'Could not parse JSON: ' + e.message }; }
    }
    if (!obj || typeof obj !== 'object') return { ok: false, error: 'Top-level value must be an object.' };
    if (obj.kind !== 'pd_module') return { ok: false, error: 'Not a PD module (expected kind:"pd_module").' };
    if (!obj.schema_version) return { ok: false, error: 'Missing schema_version.' };
    if (!obj.metadata || !obj.metadata.title) return { ok: false, error: 'Missing metadata.title.' };
    if (!Array.isArray(obj.sections) || obj.sections.length === 0) return { ok: false, error: 'A module needs at least one section.' };

    var ids = {};
    var counts = { sections: obj.sections.length, activities: 0, gated: 0 };
    for (var s = 0; s < obj.sections.length; s++) {
      var sec = obj.sections[s];
      if (!sec || !Array.isArray(sec.activities) || sec.activities.length === 0) {
        return { ok: false, error: 'Section ' + (s + 1) + ' has no activities.' };
      }
      for (var a = 0; a < sec.activities.length; a++) {
        var act = sec.activities[a];
        counts.activities++;
        if (!act || typeof act.id !== 'string' || !act.id) return { ok: false, error: 'Every activity needs a string id.' };
        if (ids[act.id]) return { ok: false, error: 'Duplicate activity id: ' + act.id };
        ids[act.id] = true;
        if (ACTIVITY_TYPES.indexOf(act.type) === -1) return { ok: false, error: 'Unknown activity type "' + act.type + '" (' + act.id + ').' };
        if (!act.title) return { ok: false, error: 'Activity ' + act.id + ' needs a title.' };

        if (act.type === 'quiz') {
          var qs = act.content && act.content.questions;
          if (!Array.isArray(qs) || qs.length === 0) return { ok: false, error: 'Quiz ' + act.id + ' has no questions.' };
          for (var q = 0; q < qs.length; q++) {
            var qq = qs[q];
            if (!qq || !qq.prompt) return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' has no prompt.' };
            if (!Array.isArray(qq.options) || qq.options.length < 2) return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' needs >=2 options.' };
            if (!(qq.correctIndex >= 0 && qq.correctIndex < qq.options.length)) {
              return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' has no valid correctIndex (answer key).' };
            }
          }
        }

        if (act.type === 'video' && !(act.content && typeof act.content.url === 'string' && act.content.url)) {
          return { ok: false, error: 'Video ' + act.id + ' needs a content.url.' };
        }
        if (act.type === 'checklist' && !(act.content && Array.isArray(act.content.items) && act.content.items.length > 0)) {
          return { ok: false, error: 'Checklist ' + act.id + ' needs content.items (a non-empty array).' };
        }
        if (act.type === 'sim' && !(act.content && typeof act.content.scenario === 'string' && act.content.scenario)) {
          return { ok: false, error: 'Sim ' + act.id + ' needs a content.scenario.' };
        }

        var gate = act.gate || { kind: 'none' };
        if (gate.kind && gate.kind !== 'none' && gate.kind !== 'score') {
          return { ok: false, error: 'Activity ' + act.id + ' has unknown gate.kind "' + gate.kind + '".' };
        }
        if (gate.kind === 'score') {
          counts.gated++;
          if (SCORABLE_TYPES.indexOf(act.type) === -1) {
            return { ok: false, error: 'Activity ' + act.id + ' has a score gate but type "' + act.type + '" produces no score.' };
          }
          if (!(isNum(gate.threshold) && gate.threshold > 0 && gate.threshold <= 1)) {
            return { ok: false, error: 'Activity ' + act.id + ' score gate needs a threshold in (0,1].' };
          }
        }
      }
    }
    return { ok: true, module: obj, stats: counts };
  }

  // ── Normalized result contract ────────────────────────────────────────────
  // The critique's key point: there is NO single reusable "percent correct" in
  // AlloFlow. So the runner converts each activity's raw interaction into ONE
  // shape the gate can read: { activityId, type, completed:bool, score:0..1|null, raw }.
  function normalizeResult(activity, raw) {
    raw = raw || {};
    var type = activity && activity.type;
    var out = { activityId: activity && activity.id, type: type, completed: false, score: null, raw: raw };

    if (type === 'read') {
      out.completed = !!raw.acknowledged;
    } else if (type === 'reflect') {
      out.completed = typeof raw.text === 'string' && raw.text.trim().length > 0;
    } else if (type === 'quiz') {
      var qs = (activity.content && activity.content.questions) || [];
      var answers = Array.isArray(raw.answers) ? raw.answers : [];
      var answered = 0, correct = 0;
      for (var i = 0; i < qs.length; i++) {
        if (typeof answers[i] === 'number') {
          answered++;
          if (answers[i] === qs[i].correctIndex) correct++;
        }
      }
      out.completed = qs.length > 0 && answered === qs.length;
      out.score = qs.length > 0 ? (correct / qs.length) : null;
    } else if (type === 'sim') {
      // AI-assessed scenario: masteryScore (0..100, AI-self-reported) is a
      // FORMATIVE estimate only — never a high-stakes measurement. Completes on a
      // score, or (if AI is unavailable) on a written response, so a none-gated
      // sim is never uncompletable offline.
      if (isNum(raw.masteryScore)) { out.score = Math.max(0, Math.min(1, raw.masteryScore / 100)); out.completed = true; }
      else if (typeof raw.response === 'string' && raw.response.trim().length > 0) { out.completed = true; }
    } else if (type === 'video') {
      out.completed = !!raw.watched;
    } else if (type === 'checklist') {
      out.completed = Array.isArray(raw.checked) && raw.checked.some(function (x) { return !!x; });
    } else {
      out.completed = !!raw.completed;
      if (isNum(raw.score)) out.score = raw.score;
    }
    return out;
  }

  // ── Gate evaluator ────────────────────────────────────────────────────────
  function evaluateGate(activity, result) {
    var gate = (activity && activity.gate) || { kind: 'none' };
    if (!result || !result.completed) return { passed: false, reason: 'incomplete' };
    if (!gate.kind || gate.kind === 'none') return { passed: true };
    if (gate.kind === 'score') {
      var threshold = isNum(gate.threshold) ? gate.threshold : DEFAULT_THRESHOLD;
      if (!isNum(result.score)) return { passed: false, reason: 'no-score', threshold: threshold };
      return { passed: result.score >= threshold - 1e-9, score: result.score, threshold: threshold };
    }
    return { passed: false, reason: 'unknown-gate' };
  }

  // resultsById: { [activityId]: <normalized result> }. Module is complete when
  // EVERY activity is completed and every gate passes.
  function evaluateModule(mod, resultsById) {
    resultsById = resultsById || {};
    var per = [], passedCount = 0, gatedTotal = 0, complete = true;
    (mod.sections || []).forEach(function (sec) {
      (sec.activities || []).forEach(function (act) {
        var res = resultsById[act.id] || { completed: false, score: null };
        var ev = evaluateGate(act, res);
        var gated = act.gate && act.gate.kind === 'score';
        if (gated) gatedTotal++;
        if (ev.passed) passedCount++; else complete = false;
        per.push({ activityId: act.id, type: act.type, gated: !!gated, passed: !!ev.passed, score: isNum(res.score) ? res.score : null, threshold: ev.threshold, reason: ev.reason });
      });
    });
    return { complete: complete, perActivity: per, passed: passedCount, total: per.length, gatedTotal: gatedTotal };
  }

  // ── Completion record (Tier-1, honestly labelled, upgrade-ready) ───────────
  // nowISO is passed in (not read from the clock) so the record is deterministic
  // and testable, and so the same builder works at Tier 2/3 server issuance.
  // Capture the learner's actual written work so the record is a real portfolio
  // (their reflections, the actions they committed to, and any scenario response),
  // not just pass/fail. Reads each activity's raw interaction from resultsById.
  function collectResponses(mod, resultsById) {
    var out = [];
    (mod.sections || []).forEach(function (sec) {
      (sec.activities || []).forEach(function (act) {
        var raw = (resultsById[act.id] && resultsById[act.id].raw) || {};
        if (act.type === 'reflect' && typeof raw.text === 'string' && raw.text.trim()) {
          out.push({ activityId: act.id, type: 'reflect', title: act.title, response: raw.text.trim() });
        } else if (act.type === 'checklist' && Array.isArray(raw.checked)) {
          var items = (act.content && act.content.items) || [];
          var chosen = items.filter(function (_it, i) { return !!raw.checked[i]; });
          if (chosen.length) out.push({ activityId: act.id, type: 'checklist', title: act.title, response: chosen });
        } else if (act.type === 'sim' && (typeof raw.response === 'string' && raw.response.trim() || isNum(raw.masteryScore))) {
          out.push({ activityId: act.id, type: 'sim', title: act.title, response: (raw.response || '').trim(), masteryScore: isNum(raw.masteryScore) ? raw.masteryScore : null, feedback: raw.feedback || '' });
        }
      });
    });
    return out;
  }

  function buildCompletionRecord(mod, resultsById, learner, nowISO) {
    var ev = evaluateModule(mod, resultsById);
    return {
      schema_version: COMPLETION_SCHEMA_VERSION,
      moduleId: (mod.metadata && mod.metadata.id) || mod.id || null,
      moduleTitle: mod.metadata && mod.metadata.title,
      topic: mod.metadata && mod.metadata.topic,
      learner: learner || { name: null },
      completedAt: nowISO || null,
      complete: ev.complete,
      perActivity: ev.perActivity.map(function (p) { return { activityId: p.activityId, type: p.type, score: p.score, passed: p.passed }; }),
      // The learner's own written work (reflections, committed actions, scenario
      // responses) — makes the downloaded record a portfolio artifact.
      responses: collectResponses(mod, resultsById),
      // Honest trust framing — this is NOT an accredited credential. A Tier-2
      // server issuer or Tier-4 (MAIER/UMaine) re-issues from this same record.
      issuer: { kind: 'self-paced', verified: false, note: 'Self-paced completion record generated on-device — not an accredited credential or verified contact hours.' }
    };
  }

  // ── Tier-2 (optional): issuer-signed completion attestation ────────────────
  // Shared, pure helpers the worker (sign) and client (verify) BOTH use so they
  // agree byte-for-byte. The signature proves issuance + integrity + timestamp +
  // issuer identity — NOT supervised/proctored or accredited completion (the
  // learner controls the input record). Crypto (Ed25519) lives in the worker /
  // client; only the deterministic payload + canonicalization live here.
  var CREDENTIAL_SCHEMA_VERSION = 'pd-credential-1.0';

  // Deterministic JSON canonicalization (RFC 8785 / JCS-aligned for our value
  // space: strings, FINITE numbers, booleans, null, arrays, plain objects).
  // Sorted keys (UTF-16 code units, as JS sort does) + ECMAScript number
  // formatting (as JSON.stringify does). Rejects non-finite numbers.
  function canonicalize(v) {
    if (v === null) return 'null';
    var t = typeof v;
    if (t === 'number') { if (!isFinite(v)) throw new Error('Cannot canonicalize a non-finite number.'); return JSON.stringify(v); }
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'string') return JSON.stringify(v);
    if (Array.isArray(v)) { return '[' + v.map(function (x) { return canonicalize(x === undefined ? null : x); }).join(',') + ']'; }
    if (t === 'object') {
      var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; }).sort();
      return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + canonicalize(v[k]); }).join(',') + '}';
    }
    throw new Error('Cannot canonicalize value of type ' + t);
  }

  // The unsigned credential payload (what gets canonicalized + signed). Borrows
  // W3C-VC field NAMES (issuer / issuanceDate / credentialSubject / achievement)
  // without the JSON-LD stack. Deterministic: pass issuanceDate (nowISO) in.
  function buildCredentialPayload(record, issuerName, nowISO) {
    record = record || {};
    var per = Array.isArray(record.perActivity) ? record.perActivity : [];
    return {
      schema_version: CREDENTIAL_SCHEMA_VERSION,
      type: 'PdCompletionAttestation',
      issuer: { name: issuerName || 'AlloFlow PD' },
      issuanceDate: nowISO || null,
      credentialSubject: {
        name: (record.learner && record.learner.name) || null,
        moduleId: record.moduleId || null,
        moduleTitle: record.moduleTitle || null,
        topic: record.topic || null,
        complete: !!record.complete,
        completedAt: record.completedAt || null,
        achievement: {
          name: record.moduleTitle || record.moduleId || 'PD module',
          activitiesPassed: per.filter(function (p) { return p && p.passed; }).length,
          activitiesTotal: per.length
        }
      },
      attestation_note: 'Issuer-signed, tamper-evident attestation: confirms this self-paced completion record was issued by the named issuer at issuanceDate and has not been altered since. It is self-reported and NOT proctored, accredited, or contact-hour-bearing.'
    };
  }

  var API = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    COMPLETION_SCHEMA_VERSION: COMPLETION_SCHEMA_VERSION,
    CREDENTIAL_SCHEMA_VERSION: CREDENTIAL_SCHEMA_VERSION,
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,
    ACTIVITY_TYPES: ACTIVITY_TYPES,
    SCORABLE_TYPES: SCORABLE_TYPES,
    validatePdModule: validatePdModule,
    normalizeResult: normalizeResult,
    evaluateGate: evaluateGate,
    evaluateModule: evaluateModule,
    buildCompletionRecord: buildCompletionRecord,
    canonicalize: canonicalize,
    buildCredentialPayload: buildCredentialPayload
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.PdCore = API;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})();
