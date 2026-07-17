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
  var REVIEW_CANDIDATE_SCHEMA_VERSION = 'pd-review-candidate-1.0';
  var REVIEW_CANDIDATE_CONSENT_VERSION = 'pd-review-candidate-consent-1.0';
  var MAX_COMPLETION_INTEGRITY_EVENTS = 500;
  var REVIEW_MAX_ACTIVITIES = 500;
  var REVIEW_MAX_ARTIFACTS = 1000;
  var REVIEW_MAX_RESPONSE_CHARS = 20000;
  var REVIEW_MAX_AI_FEEDBACK_CHARS = 2000;
  var REVIEW_MAX_PACKAGE_BYTES = 524288;
  var REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT = 100000;
  var REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT = 25000;
  var REVIEW_MAX_INTEGRITY_TOTAL_CHARS = 500000;
  var REVIEW_MAX_INTEGRITY_TOTAL_WORDS = 125000;
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
  function isNonEmptyString(v) { return typeof v === 'string' && v.trim().length > 0; }

  // Stable identifiers are deliberately URL-/filename-friendly so they can be
  // used consistently by catalogs, evidence stores, and future issuers. Colons
  // are allowed for namespaced institutional identifiers.
  function isStableId(v) {
    return isNonEmptyString(v) && v === v.trim() && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
  }

  // Allow ordinary HTTP(S) resources and safe relative references, while
  // rejecting executable/opaque schemes such as javascript:, data:, and file:.
  function isSafeUrl(v) {
    if (!isNonEmptyString(v) || v !== v.trim() || /[\u0000-\u001F\u007F\\\s]/.test(v)) return false;
    if (/^https?:\/\/[^\/?#]+(?:[\/?#].*)?$/i.test(v)) return true;
    if (/^(?:\/(?!\/)|\.\.?\/|[?#])/.test(v)) return true;
    return /^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=@%\/?#-]*$/.test(v);
  }

  function allNonEmptyStrings(values) {
    return Array.isArray(values) && values.every(function (v) { return isNonEmptyString(v); });
  }

  function assessmentPolicyError(policy, path) {
    if (policy === undefined) return null;
    if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return path + ' must be an object.';
    if (policy.paste === undefined) return null;
    var paste = policy.paste;
    if (!paste || typeof paste !== 'object' || Array.isArray(paste)) return path + '.paste must be an object.';
    if (['allowed', 'monitored', 'restricted'].indexOf(paste.mode) === -1) {
      return path + '.paste.mode must be allowed, monitored, or restricted.';
    }
    if (paste.mode === 'restricted' && !isNonEmptyString(paste.accessibleAlternative) && !isNonEmptyString(paste.accommodationContact)) {
      return path + '.paste restricted mode requires an accessibleAlternative or accommodationContact.';
    }
    return null;
  }

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
    if (obj.schema_version !== SCHEMA_VERSION) {
      return { ok: false, error: 'Unsupported schema_version; expected ' + SCHEMA_VERSION + '.' };
    }
    if (!obj.metadata || !isNonEmptyString(obj.metadata.title)) return { ok: false, error: 'Missing metadata.title.' };
    if (!isStableId(obj.metadata.id)) return { ok: false, error: 'metadata.id must be a stable identifier.' };
    var modulePolicyProblem = assessmentPolicyError(obj.assessmentPolicy, 'assessmentPolicy');
    if (modulePolicyProblem) return { ok: false, error: modulePolicyProblem };
    if (!Array.isArray(obj.sections) || obj.sections.length === 0) return { ok: false, error: 'A module needs at least one section.' };

    var ids = {};
    var counts = { sections: obj.sections.length, activities: 0, gated: 0 };
    for (var s = 0; s < obj.sections.length; s++) {
      var sec = obj.sections[s];
      if (!sec || !Array.isArray(sec.activities) || sec.activities.length === 0) {
        return { ok: false, error: 'Section ' + (s + 1) + ' has no activities.' };
      }
      if (!isNonEmptyString(sec.title)) return { ok: false, error: 'Section ' + (s + 1) + ' needs a title.' };
      for (var a = 0; a < sec.activities.length; a++) {
        var act = sec.activities[a];
        counts.activities++;
        if (!act || !isStableId(act.id)) return { ok: false, error: 'Every activity needs a stable string id.' };
        if (ids[act.id]) return { ok: false, error: 'Duplicate activity id: ' + act.id };
        ids[act.id] = true;
        if (ACTIVITY_TYPES.indexOf(act.type) === -1) return { ok: false, error: 'Unknown activity type "' + act.type + '" (' + act.id + ').' };
        if (!isNonEmptyString(act.title)) return { ok: false, error: 'Activity ' + act.id + ' needs a title.' };
        if (!act.content || typeof act.content !== 'object' || Array.isArray(act.content)) {
          return { ok: false, error: 'Activity ' + act.id + ' needs a content object.' };
        }
        var activityPolicyProblem = assessmentPolicyError(act.assessmentPolicy, 'Activity ' + act.id + ' assessmentPolicy');
        if (activityPolicyProblem) return { ok: false, error: activityPolicyProblem };

        if (act.type === 'read') {
          if (!isNonEmptyString(act.content.body)) return { ok: false, error: 'Read ' + act.id + ' needs content.body.' };
          if (act.content.keyPoints !== undefined && !allNonEmptyStrings(act.content.keyPoints)) {
            return { ok: false, error: 'Read ' + act.id + ' content.keyPoints must be an array of non-empty strings.' };
          }
          if (act.content.links !== undefined) {
            if (!Array.isArray(act.content.links)) return { ok: false, error: 'Read ' + act.id + ' content.links must be an array.' };
            for (var l = 0; l < act.content.links.length; l++) {
              var link = act.content.links[l];
              if (!link || !isNonEmptyString(link.label) || !isSafeUrl(link.url)) {
                return { ok: false, error: 'Read ' + act.id + ' link ' + (l + 1) + ' needs a label and a safe URL.' };
              }
            }
          }
        }

        if (act.type === 'quiz') {
          var qs = act.content && act.content.questions;
          if (!Array.isArray(qs) || qs.length === 0) return { ok: false, error: 'Quiz ' + act.id + ' has no questions.' };
          for (var q = 0; q < qs.length; q++) {
            var qq = qs[q];
            if (!qq || !isNonEmptyString(qq.prompt)) return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' has no prompt.' };
            if (!Array.isArray(qq.options) || qq.options.length < 2) return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' needs >=2 options.' };
            if (!allNonEmptyStrings(qq.options)) return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' options must be non-empty strings.' };
            if (!(isNum(qq.correctIndex) && qq.correctIndex === Math.floor(qq.correctIndex) && qq.correctIndex >= 0 && qq.correctIndex < qq.options.length)) {
              return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' has no valid correctIndex (answer key).' };
            }
            if (qq.explanation !== undefined && !isNonEmptyString(qq.explanation)) {
              return { ok: false, error: 'Quiz ' + act.id + ' question ' + (q + 1) + ' explanation must be non-empty when supplied.' };
            }
          }
        }

        if (act.type === 'reflect' && !isNonEmptyString(act.content.prompt)) {
          return { ok: false, error: 'Reflect ' + act.id + ' needs content.prompt.' };
        }

        if (act.type === 'video') {
          if (!isSafeUrl(act.content.url)) return { ok: false, error: 'Video ' + act.id + ' needs a safe content.url.' };
          if (act.content.transcriptUrl !== undefined && !isSafeUrl(act.content.transcriptUrl)) {
            return { ok: false, error: 'Video ' + act.id + ' content.transcriptUrl must be a safe URL.' };
          }
          if (act.content.captionsUrl !== undefined && !isSafeUrl(act.content.captionsUrl)) {
            return { ok: false, error: 'Video ' + act.id + ' content.captionsUrl must be a safe URL.' };
          }
        }

        if (act.type === 'checklist' && !(Array.isArray(act.content.items) && act.content.items.length > 0 && allNonEmptyStrings(act.content.items))) {
          return { ok: false, error: 'Checklist ' + act.id + ' needs content.items (a non-empty array of strings).' };
        }
        if (act.type === 'sim') {
          if (!isNonEmptyString(act.content.scenario)) return { ok: false, error: 'Sim ' + act.id + ' needs a content.scenario.' };
          if (!isNonEmptyString(act.content.rubric)) return { ok: false, error: 'Sim ' + act.id + ' needs a content.rubric.' };
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

  // Static authoring preflight only. This never claims WCAG conformance: a
  // rendered module and its interactive states still require full verification.
  function auditAccessibilityReadiness(mod) {
    var issues = [];
    function issue(code, path, message) { issues.push({ code: code, path: path, message: message }); }
    var metadata = (mod && mod.metadata) || {};
    if (!isNonEmptyString(metadata.language || metadata.lang)) {
      issue('metadata-language-missing', 'metadata.language', 'Declare the primary language of the module.');
    }
    var sections = (mod && Array.isArray(mod.sections)) ? mod.sections : [];
    sections.forEach(function (sec, si) {
      var sectionPath = 'sections[' + si + ']';
      if (!sec || !isNonEmptyString(sec.title)) issue('section-title-missing', sectionPath + '.title', 'Give the section a descriptive title.');
      ((sec && Array.isArray(sec.activities)) ? sec.activities : []).forEach(function (act, ai) {
        var path = sectionPath + '.activities[' + ai + ']';
        var content = (act && act.content) || {};
        if (act && act.type === 'read') {
          if (!isNonEmptyString(content.body)) issue('read-body-empty', path + '.content.body', 'Provide readable content.');
          if (content.links !== undefined) {
            if (!Array.isArray(content.links)) issue('links-invalid', path + '.content.links', 'Links must be a list.');
            else content.links.forEach(function (link, li) {
              var linkPath = path + '.content.links[' + li + ']';
              if (!link || !isNonEmptyString(link.label)) issue('link-label-missing', linkPath + '.label', 'Give the link descriptive text.');
              if (!link || !isSafeUrl(link.url)) issue('link-url-unsafe', linkPath + '.url', 'Use a safe HTTP(S) or relative URL.');
            });
          }
        }
        if (act && act.type === 'reflect' && !isNonEmptyString(content.prompt)) {
          issue('reflect-prompt-empty', path + '.content.prompt', 'Provide a clear response prompt.');
        }
        if (act && act.type === 'video') {
          var captions = content.captions === true || (isNonEmptyString(content.captionsUrl) && isSafeUrl(content.captionsUrl));
          var transcript = isNonEmptyString(content.transcript) || (isNonEmptyString(content.transcriptUrl) && isSafeUrl(content.transcriptUrl));
          var alternative = isNonEmptyString(content.accessibleAlternative);
          if (!captions) issue('video-captions-missing', path + '.content', 'Provide captions for prerecorded video.');
          if (!transcript && !alternative) issue('video-alternative-missing', path + '.content', 'Provide a transcript or documented accessible alternative.');
        }
      });
    });
    return {
      status: issues.length ? 'review-required' : 'ready-for-render-audit',
      standardTarget: 'WCAG 2.2 AA',
      conformanceClaim: false,
      issues: issues,
      warnings: [{ code: 'render-audit-required', message: 'Readiness does not establish conformance; audit the complete rendered process and all states.' }]
    };
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
      // Selecting every answer is not completion: the learner must explicitly
      // submit the attempt. Score remains available for the feedback view, but
      // an unsubmitted attempt cannot pass a gate or complete a record.
      out.completed = raw.submitted === true && qs.length > 0 && answered === qs.length;
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
    // Defense in depth for callers that hand-construct a normalized result.
    if (activity && activity.type === 'quiz' && (!result.raw || result.raw.submitted !== true)) {
      return { passed: false, reason: 'unsubmitted' };
    }
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
  // Normalize AI-assisted qualitative analysis into a bounded, portable shape.
  // Unknown fields are discarded so model output cannot smuggle arbitrary data
  // into learner evidence or credential-review exports.
  function sanitizeQualitativeAnalysis(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    function text(v, max) {
      if (!isNonEmptyString(v)) return '';
      return v.trim().slice(0, max);
    }
    function textList(v, maxItems, maxChars) {
      if (!Array.isArray(v)) return [];
      return v.map(function (item) { return text(item, maxChars); }).filter(Boolean).slice(0, maxItems);
    }
    var strengths = textList(value.strengths, 8, 500);
    var growthAreas = textList(value.growthAreas, 8, 500);
    var criterionEvidence = [];
    if (Array.isArray(value.criterionEvidence)) {
      value.criterionEvidence.slice(0, 12).forEach(function (item) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return;
        var criterion = text(item.criterion, 300);
        if (!criterion) return;
        var assessment = ['met', 'developing', 'not-yet', 'not-assessed'].indexOf(item.assessment) !== -1
          ? item.assessment : 'not-assessed';
        criterionEvidence.push({
          criterion: criterion,
          assessment: assessment,
          evidence: text(item.evidence, 1000),
          feedback: text(item.feedback, 1000)
        });
      });
    }
    if (!strengths.length && !growthAreas.length && !criterionEvidence.length) return null;
    return { strengths: strengths, growthAreas: growthAreas, criterionEvidence: criterionEvidence };
  }

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
          var simResponse = { activityId: act.id, type: 'sim', title: act.title, response: (raw.response || '').trim(), masteryScore: isNum(raw.masteryScore) ? raw.masteryScore : null, feedback: raw.feedback || '' };
          var qualitative = sanitizeQualitativeAnalysis(raw.qualitativeAnalysis);
          if (qualitative) simResponse.qualitativeAnalysis = qualitative;
          out.push(simResponse);
        }
      });
    });
    return out;
  }

  // Preserve privacy-safe integrity metadata only. Clipboard/response contents
  // and arbitrary event properties are intentionally never copied.
  function collectIntegrityEvents(mod, resultsById) {
    var out = [], modulePaste = mod.assessmentPolicy && mod.assessmentPolicy.paste;
    var allowedTypes = ['paste', 'drop', 'beforeinput', 'insertFromPaste'];
    (mod.sections || []).forEach(function (sec) {
      (sec.activities || []).forEach(function (act) {
        var raw = (resultsById[act.id] && resultsById[act.id].raw) || {};
        var events = Array.isArray(raw.integrityEvents) ? raw.integrityEvents : [];
        var activityPaste = act.assessmentPolicy && act.assessmentPolicy.paste;
        var policyMode = (activityPaste && activityPaste.mode) || (modulePaste && modulePaste.mode) || 'allowed';
        var remaining = Math.max(0, MAX_COMPLETION_INTEGRITY_EVENTS - out.length);
        events.slice(0, remaining).forEach(function (event) {
          if (!event || typeof event !== 'object') return;
          var eventType = event.eventType || event.type;
          if (allowedTypes.indexOf(eventType) === -1) return;
          var clean = { activityId: act.id, eventType: eventType, policyMode: policyMode };
          var occurredAt = event.occurredAt || event.timestamp;
          if (isNonEmptyString(occurredAt) && occurredAt.length <= 64 && /^[0-9TZ:+.\-]+$/.test(occurredAt)) clean.occurredAt = occurredAt;
          var chars = isNum(event.characterCount) ? event.characterCount : event.charCount;
          if (isNum(chars) && chars >= 0) clean.characterCount = Math.min(REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT, Math.floor(chars));
          if (isNum(event.wordCount) && event.wordCount >= 0) clean.wordCount = Math.min(REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT, Math.floor(event.wordCount));
          if (typeof event.blocked === 'boolean') clean.blocked = event.blocked;
          if (isStableId(event.fieldId)) clean.fieldId = event.fieldId;
          out.push(clean);
        });
      });
    });
    return out;
  }

  function sanitizeCompletionLearner(learner) {
    var name = learner && typeof learner.name === 'string' ? learner.name.trim() : '';
    if (name.length > 200) name = name.slice(0, 200);
    return { name: name || null };
  }

  function buildCompletionRecord(mod, resultsById, learner, nowISO) {
    var ev = evaluateModule(mod, resultsById);
    return {
      schema_version: COMPLETION_SCHEMA_VERSION,
      moduleId: (mod.metadata && mod.metadata.id) || mod.id || null,
      // A publisher may supply a human-facing release label; contentDigest is
      // the authoritative binding to the exact module content.
      moduleVersion: (mod.metadata && mod.metadata.version) || mod.module_version || mod.version || null,
      contentDigest: moduleContentDigest(mod),
      moduleTitle: mod.metadata && mod.metadata.title,
      topic: mod.metadata && mod.metadata.topic,
      learner: sanitizeCompletionLearner(learner),
      completedAt: nowISO || null,
      complete: ev.complete,
      perActivity: ev.perActivity.map(function (p) { return { activityId: p.activityId, type: p.type, score: p.score, passed: p.passed }; }),
      // The learner's own written work (reflections, committed actions, scenario
      // responses) — makes the downloaded record a portfolio artifact.
      responses: collectResponses(mod, resultsById),
      // Disclosed assessment-integrity signals only; never clipboard contents.
      integrityEvents: collectIntegrityEvents(mod, resultsById),
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
  // Review-candidate evidence is a local, learner-controlled export for a
  // separate human review workflow. It never establishes identity, approval,
  // institutional review, or credential eligibility.
  function reviewCandidateProblem(code, path, message) {
    return { ok: false, code: code, path: path, error: message };
  }

  function reviewIsObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function reviewOnlyKeys(value, allowed) {
    if (!reviewIsObject(value)) return false;
    var allow = {};
    allowed.forEach(function (key) { allow[key] = true; });
    return Object.keys(value).every(function (key) { return !!allow[key]; });
  }

  function reviewIsIsoTimestamp(value) {
    return typeof value === 'string' &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/.test(value) &&
      !isNaN(Date.parse(value));
  }

  function reviewIsLanguageTag(value) {
    return typeof value === 'string' && value.length <= 35 &&
      /^(?:[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*|x(?:-[A-Za-z0-9]{1,8})+)$/.test(value);
  }

  function reviewScoreInterpretation(activityType) {
    if (activityType === 'quiz') return 'module-answer-key';
    if (activityType === 'sim') return 'ai-formative-advisory';
    return 'not-scored';
  }

  function reviewConsentNotice(locale) {
    return {
      version: REVIEW_CANDIDATE_CONSENT_VERSION,
      locale: locale,
      heading: 'Prepare evidence for human review',
      purpose: 'This creates a local learner-device-unverified JSON package for a separate human review process. Nothing is uploaded or submitted by this action, and the package is not an approval decision.',
      privacy: 'Structured identity fields and raw clipboard event/content fields are omitted. Written responses are included as learner-provided, unverified free text and may contain names, email addresses, or other personal data you typed or pasted.',
      consent_label: 'I choose to include my written responses in this local review-candidate export.',
      ai_option_label: 'Optional - Include AI-assisted advisory notes, clearly labeled for human review.',
      integrity_option_label: 'Optional - Include an aggregate paste-event summary (counts only; context, never an automatic decision).'
    };
  }

  function reviewConsentNoticeDigest(locale) {
    return 'sha256:' + sha256Hex(canonicalize(reviewConsentNotice(locale)));
  }

  function reviewIsDigest(value) {
    return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
  }

  function reviewIsInteger(value) {
    return isNum(value) && isFinite(value) && Math.floor(value) === value;
  }

  function reviewQualitativeLimitProblem(value, path) {
    if (value == null) return null;
    if (!reviewIsObject(value)) return reviewCandidateProblem('invalid_ai_analysis', path, 'AI advisory analysis must be an object.');
    if (!reviewOnlyKeys(value, ['strengths', 'growthAreas', 'criterionEvidence']))
      return reviewCandidateProblem('invalid_ai_analysis', path, 'AI advisory analysis contains unsupported fields.');
    var listSpecs = [
      { key: 'strengths', maxItems: 8, maxChars: 500 },
      { key: 'growthAreas', maxItems: 8, maxChars: 500 }
    ];
    for (var li = 0; li < listSpecs.length; li++) {
      var spec = listSpecs[li];
      var list = value[spec.key];
      if (list === undefined) continue;
      if (!Array.isArray(list) || list.length > spec.maxItems) {
        return reviewCandidateProblem('oversized_ai_analysis', path + '.' + spec.key, spec.key + ' exceeds the formal package limit.');
      }
      for (var ti = 0; ti < list.length; ti++) {
        if (!isNonEmptyString(list[ti]) || list[ti].length > spec.maxChars) {
          return reviewCandidateProblem('oversized_ai_analysis', path + '.' + spec.key + '[' + ti + ']', 'AI advisory text is invalid or exceeds the formal package limit.');
        }
      }
    }
    var criteria = value.criterionEvidence;
    if (criteria !== undefined) {
      if (!Array.isArray(criteria) || criteria.length > 12) {
        return reviewCandidateProblem('oversized_ai_analysis', path + '.criterionEvidence', 'criterionEvidence exceeds the formal package limit.');
      }
      for (var ci = 0; ci < criteria.length; ci++) {
        var item = criteria[ci];
        if (!reviewIsObject(item) || !reviewOnlyKeys(item, ['criterion', 'assessment', 'evidence', 'feedback']) ||
            !isNonEmptyString(item.criterion) || item.criterion.length > 300 ||
            ['met', 'developing', 'not-yet', 'not-assessed'].indexOf(item.assessment) === -1 ||
            (item.evidence != null && (typeof item.evidence !== 'string' || item.evidence.length > 1000)) ||
            (item.feedback != null && (typeof item.feedback !== 'string' || item.feedback.length > 1000))) {
          return reviewCandidateProblem('oversized_ai_analysis', path + '.criterionEvidence[' + ci + ']', 'Criterion evidence is invalid or exceeds the formal package limit.');
        }
      }
    }
    return null;
  }

  function reviewArtifactDigest(artifact) {
    var unsigned = {};
    Object.keys(artifact || {}).forEach(function (key) {
      if (key !== 'digest') unsigned[key] = artifact[key];
    });
    return 'sha256:' + sha256Hex(canonicalize(unsigned));
  }

  function reviewCandidateDigest(candidate) {
    if (!reviewIsObject(candidate)) throw new Error('A review-candidate package object is required.');
    var unsigned = {};
    Object.keys(candidate).forEach(function (key) {
      if (key !== 'package_digest') unsigned[key] = candidate[key];
    });
    return 'sha256:' + sha256Hex(canonicalize(unsigned));
  }

  function addReviewArtifact(artifacts, activityId, kind, mediaType, source, provenance, value) {
    var artifact = {
      artifact_id: 'artifact:' + sha256Hex(activityId + '|' + kind).slice(0, 32),
      activity_id: activityId,
      kind: kind,
      media_type: mediaType,
      source: source,
      provenance: provenance,
      value: value
    };
    artifact.digest = reviewArtifactDigest(artifact);
    artifacts.push(artifact);
    return artifact.artifact_id;
  }

  function aggregateReviewIntegrity(mod, resultsById) {
    var rows = [];
    var eventCount = 0;
    var totalCharacterCount = 0;
    var totalWordCount = 0;
    var allowedTypes = ['paste', 'drop', 'beforeinput', 'insertFromPaste'];
    var modulePaste = mod.assessmentPolicy && mod.assessmentPolicy.paste;
    var problem = null;
    (mod.sections || []).forEach(function (sec) {
      (sec.activities || []).forEach(function (act) {
        if (problem) return;
        var raw = (resultsById[act.id] && resultsById[act.id].raw) || {};
        var events = Array.isArray(raw.integrityEvents) ? raw.integrityEvents : [];
        if (eventCount + events.length > MAX_COMPLETION_INTEGRITY_EVENTS) {
          problem = reviewCandidateProblem('integrity_event_limit', 'integrity_summary', 'Too many integrity events for a formal review-candidate package.');
          return;
        }
        eventCount += events.length;
        var activityPaste = act.assessmentPolicy && act.assessmentPolicy.paste;
        var policyMode = (activityPaste && activityPaste.mode) || (modulePaste && modulePaste.mode) || 'allowed';
        var row = {
          activity_id: act.id,
          policy_mode: policyMode,
          event_count: 0,
          blocked_event_count: 0,
          character_count: 0,
          word_count: 0
        };
        events.forEach(function (event) {
          if (problem || !reviewIsObject(event)) return;
          var eventType = event.eventType || event.type;
          if (allowedTypes.indexOf(eventType) === -1) return;
          var chars = event.characterCount !== undefined ? event.characterCount : event.charCount;
          var words = event.wordCount;
          if (chars !== undefined && (!reviewIsInteger(chars) || chars < 0 || chars > REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT)) {
            problem = reviewCandidateProblem('invalid_integrity_count', 'integrity_summary', 'An integrity character count is invalid or too large.');
            return;
          }
          if (words !== undefined && (!reviewIsInteger(words) || words < 0 || words > REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT)) {
            problem = reviewCandidateProblem('invalid_integrity_count', 'integrity_summary', 'An integrity word count is invalid or too large.');
            return;
          }
          totalCharacterCount += chars || 0;
          totalWordCount += words || 0;
          if (totalCharacterCount > REVIEW_MAX_INTEGRITY_TOTAL_CHARS || totalWordCount > REVIEW_MAX_INTEGRITY_TOTAL_WORDS) {
            problem = reviewCandidateProblem('integrity_count_limit', 'integrity_summary', 'Aggregate integrity counters exceed the formal package limits.');
            return;
          }
          row.event_count++;
          if (event.blocked === true) row.blocked_event_count++;
          row.character_count += chars || 0;
          row.word_count += words || 0;
        });
        if (row.event_count) rows.push(row);
      });
    });
    if (problem) return problem;
    return {
      ok: true,
      summary: {
        interpretation: 'Context-only interaction summary; never an automatic completion or review decision.',
        activities: rows
      }
    };
  }

  function buildReviewCandidatePackage(mod, resultsById, options, nowISO) {
    resultsById = resultsById || {};
    options = options || {};
    var moduleCheck = validatePdModule(mod);
    if (!moduleCheck.ok) return reviewCandidateProblem('invalid_module', 'module', moduleCheck.error);
    var metadata = mod.metadata || {};
    if (!isStableId(metadata.version)) {
      return reviewCandidateProblem('module_version_required', 'module.version', 'A stable module version is required for exact evidence binding.');
    }
    if (!reviewIsLanguageTag(metadata.language)) {
      return reviewCandidateProblem('module_language_required', 'module.language', 'A valid module language is required for review.');
    }
    if (metadata.title.length > 200) {
      return reviewCandidateProblem('module_title_too_large', 'module.title', 'Module title exceeds the formal package limit.');
    }
    if (!reviewIsIsoTimestamp(nowISO)) {
      return reviewCandidateProblem('invalid_created_at', 'created_at', 'A valid RFC 3339 created_at timestamp is required.');
    }
    var consent = options.consent;
    if (!reviewIsObject(consent) || consent.granted !== true) {
      return reviewCandidateProblem('explicit_consent_required', 'consent.granted', 'Explicit learner consent is required before preparing review evidence.');
    }
    if (!reviewIsIsoTimestamp(consent.grantedAt)) {
      return reviewCandidateProblem('invalid_consent_time', 'consent.granted_at', 'A valid RFC 3339 consent timestamp is required.');
    }
    if (Date.parse(consent.grantedAt) > Date.parse(nowISO)) {
      return reviewCandidateProblem('invalid_consent_time', 'consent.granted_at', 'Consent cannot be recorded after package creation.');
    }

    var evaluation = evaluateModule(mod, resultsById);
    if (!evaluation.complete) {
      return reviewCandidateProblem('incomplete_module', 'activities', 'Only a complete client-side module observation can be prepared for review.');
    }

    var flatActivities = [];
    (mod.sections || []).forEach(function (sec) {
      (sec.activities || []).forEach(function (act) { flatActivities.push(act); });
    });
    if (!flatActivities.length || flatActivities.length > REVIEW_MAX_ACTIVITIES) {
      return reviewCandidateProblem('activity_limit', 'activities', 'Formal review-candidate packages support 1-' + REVIEW_MAX_ACTIVITIES + ' activities.');
    }

    var includeAi = options.includeAiAnalysis === true;
    var includeIntegrity = options.includeIntegritySummary === true;
    var activities = [];
    var artifacts = [];
    var buildProblem = null;

    flatActivities.forEach(function (act) {
      if (buildProblem) return;
      var result = resultsById[act.id] || { completed: false, score: null, raw: {} };
      var raw = result.raw || {};
      var gate = evaluateGate(act, result);
      var refs = [];
      var scoreInterpretation = reviewScoreInterpretation(act.type);

      if (act.type === 'reflect') {
        if (typeof raw.text !== 'string' || !raw.text.trim()) {
          buildProblem = reviewCandidateProblem('required_evidence_missing', 'activities.' + act.id, 'A reflection needs learner-provided response evidence.');
          return;
        }
        if (raw.text.length > REVIEW_MAX_RESPONSE_CHARS) {
          buildProblem = reviewCandidateProblem('response_too_large', 'activities.' + act.id, 'A learner response exceeds the formal package limit.');
          return;
        }
        var reflection = raw.text.trim();
        if (reflection.length > REVIEW_MAX_RESPONSE_CHARS) {
          buildProblem = reviewCandidateProblem('response_too_large', 'activities.' + act.id, 'A learner response exceeds the formal package limit.');
          return;
        }
        refs.push(addReviewArtifact(artifacts, act.id, 'learner-response', 'text/plain', 'learner-provided-unverified',
          { capture: 'learner-device', verified: false }, reflection));
      } else if (act.type === 'checklist') {
        if (!Array.isArray(raw.checked)) {
          buildProblem = reviewCandidateProblem('required_evidence_missing', 'activities.' + act.id, 'A checklist needs a learner-provided selection.');
          return;
        }
        var items = (act.content && act.content.items) || [];
        var selected = items.filter(function (_item, index) { return !!raw.checked[index]; });
        for (var si = 0; si < selected.length; si++) {
          if (typeof selected[si] !== 'string' || selected[si].length > 2000) {
            buildProblem = reviewCandidateProblem('response_too_large', 'activities.' + act.id, 'A selected commitment exceeds the formal package limit.');
            return;
          }
        }
        if (!selected.length) {
          buildProblem = reviewCandidateProblem('required_evidence_missing', 'activities.' + act.id, 'A checklist needs at least one learner-provided selection.');
          return;
        }
        refs.push(addReviewArtifact(artifacts, act.id, 'learner-selection-of-module-authored-options', 'application/json', 'learner-provided-unverified',
          { capture: 'learner-device', verified: false }, selected));
      } else if (act.type === 'sim') {
        if (typeof raw.response !== 'string' || !raw.response.trim()) {
          buildProblem = reviewCandidateProblem('required_evidence_missing', 'activities.' + act.id, 'A scenario needs learner-provided response evidence.');
          return;
        }
        if (raw.response.length > REVIEW_MAX_RESPONSE_CHARS) {
          buildProblem = reviewCandidateProblem('response_too_large', 'activities.' + act.id, 'A learner response exceeds the formal package limit.');
          return;
        }
          var scenarioResponse = raw.response.trim();
          if (scenarioResponse.length > REVIEW_MAX_RESPONSE_CHARS) {
            buildProblem = reviewCandidateProblem('response_too_large', 'activities.' + act.id, 'A learner response exceeds the formal package limit.');
            return;
          }
          refs.push(addReviewArtifact(artifacts, act.id, 'learner-response', 'text/plain', 'learner-provided-unverified',
            { capture: 'learner-device', verified: false }, scenarioResponse));
        if (includeAi) {
          if (raw.feedback != null && typeof raw.feedback !== 'string') {
            buildProblem = reviewCandidateProblem('invalid_ai_analysis', 'activities.' + act.id + '.feedback', 'AI advisory feedback must be text.');
            return;
          }
          var feedback = (raw.feedback || '').trim();
          if (feedback.length > REVIEW_MAX_AI_FEEDBACK_CHARS) {
            buildProblem = reviewCandidateProblem('oversized_ai_analysis', 'activities.' + act.id + '.feedback', 'AI advisory feedback exceeds the formal package limit.');
            return;
          }
          var analysisProblem = reviewQualitativeLimitProblem(raw.qualitativeAnalysis, 'activities.' + act.id + '.qualitativeAnalysis');
          if (analysisProblem) { buildProblem = analysisProblem; return; }
          var analysis = sanitizeQualitativeAnalysis(raw.qualitativeAnalysis);
          if (feedback || analysis) {
            refs.push(addReviewArtifact(artifacts, act.id, 'ai-advisory-analysis', 'application/json', 'ai-assisted-advisory',
              { capture: 'learner-device', advisory: true, provider: 'not-recorded', model: 'not-recorded', human_review_required: true },
              { feedback: feedback, qualitativeAnalysis: analysis }));
          }
        }
      }

      activities.push({
        activity_id: act.id,
        type: act.type,
        client_observation: {
          completed: !!result.completed,
          gate_passed: !!gate.passed,
          score: isNum(result.score) ? result.score : null,
          score_interpretation: scoreInterpretation
        },
        artifact_refs: refs
      });
    });
    if (buildProblem) return buildProblem;
    if (artifacts.length > REVIEW_MAX_ARTIFACTS) {
      return reviewCandidateProblem('artifact_limit', 'artifacts', 'Too many artifacts for a formal review-candidate package.');
    }

    var integritySummary = null;
    if (includeIntegrity) {
      var integrity = aggregateReviewIntegrity(mod, resultsById);
      if (!integrity.ok) return integrity;
      integritySummary = integrity.summary;
    }

    var scopes = ['learner-response-evidence'];
    if (includeAi) scopes.push('ai-advisory-analysis');
    if (includeIntegrity) scopes.push('integrity-summary');

    var candidate = {
      schema_version: REVIEW_CANDIDATE_SCHEMA_VERSION,
      kind: 'pd_review_candidate',
      trust_model: 'learner-device-unverified',
      purpose: 'human-review-candidate',
      created_at: nowISO,
      module: {
        id: metadata.id,
        version: metadata.version,
        language: metadata.language,
        title: metadata.title,
        content_digest: moduleContentDigest(mod),
        activity_ids: flatActivities.map(function (act) { return act.id; })
      },
      consent: {
        granted: true,
        granted_at: consent.grantedAt,
        notice_version: REVIEW_CANDIDATE_CONSENT_VERSION,
        notice_locale: metadata.language,
        notice_payload: reviewConsentNotice(metadata.language),
        notice_digest: reviewConsentNoticeDigest(metadata.language),
        scopes: scopes
      },
      activities: activities,
      artifacts: artifacts,
      integrity_summary: integritySummary,
      privacy_manifest: {
        structured_identity_fields_included: false,
        raw_clipboard_events_included: false,
        raw_clipboard_content_included: false,
        free_text_may_contain_personal_data: true,
        learner_response_text_included: artifacts.some(function (artifact) { return artifact.kind === 'learner-response'; }),
        exact_event_times_included: false,
        field_identifiers_included: false,
        ai_advisory_analysis_included: artifacts.some(function (artifact) { return artifact.kind === 'ai-advisory-analysis'; }),
        integrity_summary_included: !!integritySummary
      }
    };
    if (utf8Bytes(canonicalize(candidate)).length > REVIEW_MAX_PACKAGE_BYTES) {
      return reviewCandidateProblem('package_too_large', 'package', 'Review-candidate package exceeds the formal package byte limit.');
    }
    candidate.package_digest = reviewCandidateDigest(candidate);
    var validation = validateReviewCandidatePackage(candidate);
    if (!validation.ok) return validation;
    return { ok: true, package: candidate };
  }

  function validateReviewCandidatePackage(candidate) {
    var bad = reviewCandidateProblem;
    if (!reviewOnlyKeys(candidate, ['schema_version', 'kind', 'trust_model', 'purpose', 'created_at', 'module', 'consent', 'activities', 'artifacts', 'integrity_summary', 'privacy_manifest', 'package_digest'])) {
      return bad('invalid_package_shape', 'package', 'Review-candidate package contains unsupported fields.');
    }
    if (candidate.schema_version !== REVIEW_CANDIDATE_SCHEMA_VERSION || candidate.kind !== 'pd_review_candidate' ||
        candidate.trust_model !== 'learner-device-unverified' || candidate.purpose !== 'human-review-candidate') {
      return bad('unsupported_package', 'package', 'Unsupported review-candidate package profile.');
    }
    if (!reviewIsIsoTimestamp(candidate.created_at)) return bad('invalid_created_at', 'created_at', 'created_at must be RFC 3339.');
    if (utf8Bytes(canonicalize(candidate)).length > REVIEW_MAX_PACKAGE_BYTES) {
      return bad('package_too_large', 'package', 'Review-candidate package exceeds the formal package byte limit.');
    }

    var moduleBinding = candidate.module;
    if (!reviewOnlyKeys(moduleBinding, ['id', 'version', 'language', 'title', 'content_digest', 'activity_ids']) ||
        !isStableId(moduleBinding.id) || !isStableId(moduleBinding.version) ||
        !reviewIsLanguageTag(moduleBinding.language) ||
        !isNonEmptyString(moduleBinding.title) || moduleBinding.title.length > 200 ||
        !reviewIsDigest(moduleBinding.content_digest) ||
        !Array.isArray(moduleBinding.activity_ids) || !moduleBinding.activity_ids.length ||
        moduleBinding.activity_ids.length > REVIEW_MAX_ACTIVITIES) {
      return bad('invalid_module_binding', 'module', 'Review evidence requires an exact, bounded module binding.');
    }
    var expectedIds = {};
    for (var mi = 0; mi < moduleBinding.activity_ids.length; mi++) {
      var expectedId = moduleBinding.activity_ids[mi];
      if (!isStableId(expectedId) || expectedIds[expectedId]) return bad('invalid_module_binding', 'module.activity_ids', 'Module activity IDs must be unique stable identifiers.');
      expectedIds[expectedId] = true;
    }

    var consent = candidate.consent;
    var allowedScopes = ['learner-response-evidence', 'ai-advisory-analysis', 'integrity-summary'];
    if (!reviewOnlyKeys(consent, ['granted', 'granted_at', 'notice_version', 'notice_locale', 'notice_payload', 'notice_digest', 'scopes']) ||
        consent.granted !== true || !reviewIsIsoTimestamp(consent.granted_at) ||
        consent.notice_version !== REVIEW_CANDIDATE_CONSENT_VERSION ||
        Date.parse(consent.granted_at) > Date.parse(candidate.created_at) ||
        consent.notice_locale !== moduleBinding.language ||
        !reviewIsObject(consent.notice_payload) ||
        canonicalize(consent.notice_payload) !== canonicalize(reviewConsentNotice(moduleBinding.language)) ||
        consent.notice_digest !== 'sha256:' + sha256Hex(canonicalize(consent.notice_payload)) ||
        consent.notice_digest !== reviewConsentNoticeDigest(moduleBinding.language) ||
        !reviewIsDigest(consent.notice_digest) ||
        !Array.isArray(consent.scopes) || consent.scopes.length > allowedScopes.length || consent.scopes.indexOf('learner-response-evidence') === -1 ||
        consent.scopes.some(function (scope, index) { return allowedScopes.indexOf(scope) === -1 || consent.scopes.indexOf(scope) !== index; })) {
      return bad('invalid_consent', 'consent', 'Explicit, versioned consent scopes are required.');
    }

    var privacy = candidate.privacy_manifest;
    if (!reviewOnlyKeys(privacy, ['structured_identity_fields_included', 'raw_clipboard_events_included', 'raw_clipboard_content_included', 'free_text_may_contain_personal_data', 'learner_response_text_included', 'exact_event_times_included', 'field_identifiers_included', 'ai_advisory_analysis_included', 'integrity_summary_included']) ||
        privacy.structured_identity_fields_included !== false || privacy.raw_clipboard_events_included !== false ||
        privacy.raw_clipboard_content_included !== false || privacy.free_text_may_contain_personal_data !== true ||
        typeof privacy.learner_response_text_included !== 'boolean' || privacy.exact_event_times_included !== false ||
        privacy.field_identifiers_included !== false ||
        typeof privacy.ai_advisory_analysis_included !== 'boolean' ||
        typeof privacy.integrity_summary_included !== 'boolean') {
      return bad('invalid_privacy_manifest', 'privacy_manifest', 'The privacy manifest must distinguish structured exclusions from possible personal data in free text.');
    }

    if (!Array.isArray(candidate.activities) || candidate.activities.length !== moduleBinding.activity_ids.length) {
      return bad('activity_mismatch', 'activities', 'Activities must exactly match the module binding.');
    }
    var activityMap = {};
    var referenced = {};
    for (var ai = 0; ai < candidate.activities.length; ai++) {
      var activity = candidate.activities[ai];
      var observation = activity && activity.client_observation;
      if (!reviewOnlyKeys(activity, ['activity_id', 'type', 'client_observation', 'artifact_refs']) ||
          !expectedIds[activity.activity_id] || activityMap[activity.activity_id] ||
          ACTIVITY_TYPES.indexOf(activity.type) === -1 ||
          !reviewOnlyKeys(observation, ['completed', 'gate_passed', 'score', 'score_interpretation']) ||
          observation.completed !== true || observation.gate_passed !== true ||
          !(observation.score === null || (isNum(observation.score) && isFinite(observation.score) && observation.score >= 0 && observation.score <= 1)) ||
          observation.score_interpretation !== reviewScoreInterpretation(activity.type) ||
          (activity.type === 'quiz' && observation.score === null) ||
          (activity.type !== 'quiz' && activity.type !== 'sim' && observation.score !== null) ||
          !Array.isArray(activity.artifact_refs) || activity.artifact_refs.length > 3) {
        return bad('invalid_activity_observation', 'activities[' + ai + ']', 'Invalid unverified client activity observation.');
      }
      activityMap[activity.activity_id] = activity;
      for (var ri = 0; ri < activity.artifact_refs.length; ri++) {
        var ref = activity.artifact_refs[ri];
        if (!isStableId(ref) || referenced[ref]) return bad('invalid_artifact_ref', 'activities[' + ai + '].artifact_refs', 'Artifact references must be unique stable identifiers.');
        referenced[ref] = activity.activity_id;
      }
    }
    if (Object.keys(activityMap).length !== Object.keys(expectedIds).length) return bad('activity_mismatch', 'activities', 'Activities must exactly match the module binding.');

    if (!Array.isArray(candidate.artifacts) || candidate.artifacts.length > REVIEW_MAX_ARTIFACTS) {
      return bad('artifact_limit', 'artifacts', 'Artifact collection is invalid or too large.');
    }
    var artifactMap = {};
    var aiArtifactFound = false;
    var artifactKindsByActivity = {};
    for (var ar = 0; ar < candidate.artifacts.length; ar++) {
      var artifact = candidate.artifacts[ar];
      if (!reviewOnlyKeys(artifact, ['artifact_id', 'activity_id', 'kind', 'media_type', 'source', 'provenance', 'value', 'digest']) ||
          !isStableId(artifact.artifact_id) || artifactMap[artifact.artifact_id] ||
          !activityMap[artifact.activity_id] || referenced[artifact.artifact_id] !== artifact.activity_id ||
          !reviewIsDigest(artifact.digest)) {
        return bad('invalid_artifact', 'artifacts[' + ar + ']', 'Artifact binding or digest is invalid.');
      }
      if (artifact.kind === 'learner-response') {
        if ((activityMap[artifact.activity_id].type !== 'reflect' && activityMap[artifact.activity_id].type !== 'sim') ||
            artifact.media_type !== 'text/plain' || artifact.source !== 'learner-provided-unverified' ||
            !reviewOnlyKeys(artifact.provenance, ['capture', 'verified']) ||
            artifact.provenance.capture !== 'learner-device' || artifact.provenance.verified !== false ||
            !isNonEmptyString(artifact.value) || artifact.value.length > REVIEW_MAX_RESPONSE_CHARS) {
          return bad('invalid_artifact', 'artifacts[' + ar + ']', 'Learner response artifact is invalid or too large.');
        }
      } else if (artifact.kind === 'learner-selection-of-module-authored-options') {
        if (activityMap[artifact.activity_id].type !== 'checklist' ||
            artifact.media_type !== 'application/json' || artifact.source !== 'learner-provided-unverified' ||
            !reviewOnlyKeys(artifact.provenance, ['capture', 'verified']) ||
            artifact.provenance.capture !== 'learner-device' || artifact.provenance.verified !== false ||
            !Array.isArray(artifact.value) || artifact.value.length > 100 || artifact.value.some(function (item) { return !isNonEmptyString(item) || item.length > 2000; })) {
          return bad('invalid_artifact', 'artifacts[' + ar + ']', 'Selected commitments artifact is invalid or too large.');
        }
      } else if (artifact.kind === 'ai-advisory-analysis') {
        aiArtifactFound = true;
        if (activityMap[artifact.activity_id].type !== 'sim' ||
            artifact.media_type !== 'application/json' || artifact.source !== 'ai-assisted-advisory' ||
            !reviewOnlyKeys(artifact.provenance, ['capture', 'advisory', 'provider', 'model', 'human_review_required']) ||
            artifact.provenance.capture !== 'learner-device' || artifact.provenance.advisory !== true ||
            artifact.provenance.provider !== 'not-recorded' || artifact.provenance.model !== 'not-recorded' ||
            artifact.provenance.human_review_required !== true ||
            !reviewOnlyKeys(artifact.value, ['feedback', 'qualitativeAnalysis']) ||
            typeof artifact.value.feedback !== 'string' || artifact.value.feedback.length > REVIEW_MAX_AI_FEEDBACK_CHARS) {
          return bad('invalid_ai_artifact', 'artifacts[' + ar + ']', 'AI advisory artifact is invalid or too large.');
        }
        var qualitativeProblem = reviewQualitativeLimitProblem(artifact.value.qualitativeAnalysis, 'artifacts[' + ar + '].value.qualitativeAnalysis');
        if (qualitativeProblem) return qualitativeProblem;
      } else {
        return bad('unsupported_artifact_kind', 'artifacts[' + ar + '].kind', 'Unsupported review artifact kind.');
      }
      artifactMap[artifact.artifact_id] = artifact;
      if (reviewArtifactDigest(artifact) !== artifact.digest) {
        return bad('invalid_artifact', 'artifacts[' + ar + '].digest', 'Artifact digest does not match its validated content.');
      }
      artifactKindsByActivity[artifact.activity_id] = artifactKindsByActivity[artifact.activity_id] || [];
      artifactKindsByActivity[artifact.activity_id].push(artifact.kind);
    }
    if (Object.keys(artifactMap).length !== Object.keys(referenced).length) {
      return bad('artifact_ref_mismatch', 'artifacts', 'Every artifact must be referenced exactly once.');
    }
    var requiredArtifactProblem = null;
    var learnerResponseFound = false;
    Object.keys(activityMap).forEach(function (activityId) {
      if (requiredArtifactProblem) return;
      var kinds = artifactKindsByActivity[activityId] || [];
      var activityType = activityMap[activityId].type;
      var responseCount = kinds.filter(function (kind) { return kind === 'learner-response'; }).length;
      var selectionCount = kinds.filter(function (kind) { return kind === 'learner-selection-of-module-authored-options'; }).length;
      if (responseCount) learnerResponseFound = true;
      if ((activityType === 'reflect' || activityType === 'sim') && responseCount !== 1) {
        requiredArtifactProblem = bad('required_evidence_missing', 'activities.' + activityId, 'Reflect and scenario activities require exactly one learner-provided response artifact.');
      } else if (activityType === 'checklist' && selectionCount !== 1) {
        requiredArtifactProblem = bad('required_evidence_missing', 'activities.' + activityId, 'Checklist activities require exactly one learner selection of module-authored options.');
      }
    });
    if (requiredArtifactProblem) return requiredArtifactProblem;
    if (learnerResponseFound !== privacy.learner_response_text_included) {
      return bad('privacy_manifest_mismatch', 'privacy_manifest.learner_response_text_included', 'Free-text inclusion must match the privacy manifest.');
    }

    if (aiArtifactFound !== privacy.ai_advisory_analysis_included ||
        (aiArtifactFound && consent.scopes.indexOf('ai-advisory-analysis') === -1)) {
      return bad('ai_scope_mismatch', 'consent.scopes', 'AI advisory inclusion must match the consent and privacy manifest.');
    }

    var integrity = candidate.integrity_summary;
    if (integrity === null) {
      if (privacy.integrity_summary_included || consent.scopes.indexOf('integrity-summary') !== -1) {
        return bad('integrity_scope_mismatch', 'integrity_summary', 'Integrity scope and privacy manifest do not match.');
      }
    } else {
      if (!reviewOnlyKeys(integrity, ['interpretation', 'activities']) ||
          integrity.interpretation !== 'Context-only interaction summary; never an automatic completion or review decision.' ||
          !Array.isArray(integrity.activities) || integrity.activities.length > REVIEW_MAX_ACTIVITIES ||
          !privacy.integrity_summary_included || consent.scopes.indexOf('integrity-summary') === -1) {
        return bad('invalid_integrity_summary', 'integrity_summary', 'Integrity summary is invalid or outside consent.');
      }
      var integrityRows = {};
      var totalIntegrityEvents = 0;
      var totalIntegrityCharacters = 0;
      var totalIntegrityWords = 0;
      for (var ii = 0; ii < integrity.activities.length; ii++) {
        var row = integrity.activities[ii];
        if (!reviewOnlyKeys(row, ['activity_id', 'policy_mode', 'event_count', 'blocked_event_count', 'character_count', 'word_count']) ||
            !activityMap[row.activity_id] || integrityRows[row.activity_id] || ['allowed', 'monitored', 'restricted'].indexOf(row.policy_mode) === -1 ||
            !reviewIsInteger(row.event_count) || row.event_count < 1 ||
            !reviewIsInteger(row.blocked_event_count) || row.blocked_event_count < 0 || row.blocked_event_count > row.event_count ||
            !reviewIsInteger(row.character_count) || row.character_count < 0 || row.character_count > row.event_count * REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT ||
            !reviewIsInteger(row.word_count) || row.word_count < 0 || row.word_count > row.event_count * REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT) {
          return bad('invalid_integrity_summary', 'integrity_summary.activities[' + ii + ']', 'Integrity summary row is invalid.');
        }
        integrityRows[row.activity_id] = true;
        totalIntegrityEvents += row.event_count;
        totalIntegrityCharacters += row.character_count;
        totalIntegrityWords += row.word_count;
        if (totalIntegrityEvents > MAX_COMPLETION_INTEGRITY_EVENTS ||
            totalIntegrityCharacters > REVIEW_MAX_INTEGRITY_TOTAL_CHARS ||
            totalIntegrityWords > REVIEW_MAX_INTEGRITY_TOTAL_WORDS) {
          return bad('integrity_event_limit', 'integrity_summary', 'Aggregate integrity counters exceed the formal package limits.');
        }
      }
    }

    if (!reviewIsDigest(candidate.package_digest) || reviewCandidateDigest(candidate) !== candidate.package_digest) {
      return bad('package_digest_mismatch', 'package_digest', 'Review-candidate package digest does not match its content.');
    }
    if (utf8Bytes(canonicalize(candidate)).length > REVIEW_MAX_PACKAGE_BYTES) {
      return bad('package_too_large', 'package', 'Review-candidate package exceeds the formal package byte limit.');
    }
    return { ok: true };
  }

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

  // Dependency-free synchronous SHA-256 keeps browser, worker, and Node
  // bindings identical without WebCrypto or an async boundary.
  var SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var cp = str.charCodeAt(i);
      if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < str.length) {
        var low = str.charCodeAt(i + 1);
        if (low >= 0xdc00 && low <= 0xdfff) { cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00); i++; }
      }
      if (cp <= 0x7f) out.push(cp);
      else if (cp <= 0x7ff) out.push(0xc0 | (cp >>> 6), 0x80 | (cp & 0x3f));
      else if (cp <= 0xffff) out.push(0xe0 | (cp >>> 12), 0x80 | ((cp >>> 6) & 0x3f), 0x80 | (cp & 0x3f));
      else out.push(0xf0 | (cp >>> 18), 0x80 | ((cp >>> 12) & 0x3f), 0x80 | ((cp >>> 6) & 0x3f), 0x80 | (cp & 0x3f));
    }
    return out;
  }

  function rotr32(n, bits) { return (n >>> bits) | (n << (32 - bits)); }

  function sha256Hex(text) {
    var bytes = utf8Bytes(String(text));
    var bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    var high = Math.floor(bitLength / 0x100000000);
    var low = bitLength >>> 0;
    for (var hb = 3; hb >= 0; hb--) bytes.push((high >>> (hb * 8)) & 0xff);
    for (var lb = 3; lb >= 0; lb--) bytes.push((low >>> (lb * 8)) & 0xff);

    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    for (var offset = 0; offset < bytes.length; offset += 64) {
      for (var wi = 0; wi < 16; wi++) {
        var j = offset + (wi * 4);
        w[wi] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
      }
      for (var wx = 16; wx < 64; wx++) {
        var s0 = rotr32(w[wx - 15], 7) ^ rotr32(w[wx - 15], 18) ^ (w[wx - 15] >>> 3);
        var s1 = rotr32(w[wx - 2], 17) ^ rotr32(w[wx - 2], 19) ^ (w[wx - 2] >>> 10);
        w[wx] = (w[wx - 16] + s0 + w[wx - 7] + s1) >>> 0;
      }

      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (var round = 0; round < 64; round++) {
        var bigS1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
        var choose = (e & f) ^ ((~e) & g);
        var t1 = (hh + bigS1 + choose + SHA256_K[round] + w[round]) >>> 0;
        var bigS0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
        var majority = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (bigS0 + majority) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    return h.map(function (n) { return ('00000000' + n.toString(16)).slice(-8); }).join('');
  }

  // Exact-version binding over the complete canonical module object.
  function moduleContentDigest(mod) {
    if (!mod || typeof mod !== 'object' || Array.isArray(mod)) throw new Error('A PD module object is required.');
    return 'sha256:' + sha256Hex(canonicalize(mod));
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
        moduleVersion: record.moduleVersion || null,
        contentDigest: record.contentDigest || null,
        moduleTitle: record.moduleTitle || null,
        topic: record.topic || null,
        complete: !!record.complete,
        completedAt: record.completedAt || null,
        achievement: {
          name: record.moduleTitle || record.moduleId || 'PD module',
          moduleVersion: record.moduleVersion || null,
          contentDigest: record.contentDigest || null,
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
    REVIEW_CANDIDATE_SCHEMA_VERSION: REVIEW_CANDIDATE_SCHEMA_VERSION,
    REVIEW_CANDIDATE_CONSENT_VERSION: REVIEW_CANDIDATE_CONSENT_VERSION,
    CREDENTIAL_SCHEMA_VERSION: CREDENTIAL_SCHEMA_VERSION,
    MAX_COMPLETION_INTEGRITY_EVENTS: MAX_COMPLETION_INTEGRITY_EVENTS,
    REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT: REVIEW_MAX_INTEGRITY_CHARS_PER_EVENT,
    REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT: REVIEW_MAX_INTEGRITY_WORDS_PER_EVENT,
    REVIEW_MAX_INTEGRITY_TOTAL_CHARS: REVIEW_MAX_INTEGRITY_TOTAL_CHARS,
    REVIEW_MAX_INTEGRITY_TOTAL_WORDS: REVIEW_MAX_INTEGRITY_TOTAL_WORDS,
    DEFAULT_THRESHOLD: DEFAULT_THRESHOLD,
    ACTIVITY_TYPES: ACTIVITY_TYPES,
    SCORABLE_TYPES: SCORABLE_TYPES,
    validatePdModule: validatePdModule,
    auditAccessibilityReadiness: auditAccessibilityReadiness,
    normalizeResult: normalizeResult,
    evaluateGate: evaluateGate,
    evaluateModule: evaluateModule,
    buildCompletionRecord: buildCompletionRecord,
    buildReviewCandidatePackage: buildReviewCandidatePackage,
    validateReviewCandidatePackage: validateReviewCandidatePackage,
    reviewCandidateDigest: reviewCandidateDigest,
    reviewArtifactDigest: reviewArtifactDigest,
    reviewConsentNotice: reviewConsentNotice,
    canonicalize: canonicalize,
    moduleContentDigest: moduleContentDigest,
    sanitizeQualitativeAnalysis: sanitizeQualitativeAnalysis,
    buildCredentialPayload: buildCredentialPayload
  };

  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.PdCore = API;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})();
