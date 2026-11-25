/**
 * AlloFlow Session Transport Module
 *
 * Stage 1 of unifying the two live-session content channels (Firebase
 * session-doc sync vs. Class Mailbox pack push). Every feature used to be
 * built twice with slightly different rules — the worst drift being the
 * CANDIDATE FILTER: the Firebase path synced every resource with an id
 * (teacher-only types included, merely hidden client-side) while the mailbox
 * path excluded TEACHER_ONLY_TYPES entirely. One filter now serves both.
 *
 * Adapters are dependency-injected: they orchestrate, the host owns the
 * primitives (writeToSession, uploadSessionAssets, the mailbox pack cycle).
 * Nothing here touches window state, React, or the network directly — which
 * is what makes it testable and lets call sites migrate one at a time.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.SessionTransport) {
    console.log('[SessionTransport] Already loaded, skipping');
    return;
  }

  // Study Guides and Family Guides are written for learners and families, so
  // they may travel. A teacher lesson plan, or a plan with no recorded
  // audience, stays teacher-only on every route. This is the one eligibility
  // rule; every channel reaches it through studentSafeResources.
  function isStudentDeliverableGuide(item) {
    var config = item && item.type === 'lesson-plan' && item.config && typeof item.config === 'object' ? item.config : null;
    var inputs = config && config.generationInputs && typeof config.generationInputs === 'object' ? config.generationInputs : null;
    return !!(inputs && (inputs.mode === 'study' || inputs.mode === 'family'));
  }
  var GUIDE_CONTENT_FIELDS = ['essentialQuestion', 'objectives', 'materialsNeeded', 'hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'];
  var MAX_GUIDE_DEPTH = 12;
  function isSafeKey(key) {
    return typeof key === 'string' && key.length > 0 && key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
  }
  function projectStudentGuideValue(value, depth, seen) {
    depth = depth || 0;
    if (depth > MAX_GUIDE_DEPTH) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) {
      if (!seen) seen = [];
      if (seen.indexOf(value) !== -1) return null;
      seen.push(value);
      var arr = value.map(function (entry) { return projectStudentGuideValue(entry, depth + 1, seen); }).filter(function (entry) { return entry != null; });
      seen.pop();
      return arr;
    }
    if (!value || typeof value !== 'object') return null;
    if (!seen) seen = [];
    if (seen.indexOf(value) !== -1) return null;
    seen.push(value);
    var kept = {};
    var allowed = ['en', 'text', 'description', 'title', 'label', 'name', 'item', 'statement', 'instructions', 'studentTask', 'activity', 'steps', 'questions', 'prompt'];
    allowed.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(value, key) && value[key] != null) {
        var next = projectStudentGuideValue(value[key], depth + 1, seen);
        if (next != null) kept[key] = next;
      }
    });
    // Preserve home-language translation strings (e.g. es, fr, ar, zh-CN, text_en)
    // while keeping the strict allowlist for nested objects and teacher-only keys.
    Object.keys(value).forEach(function (key) {
      if (!isSafeKey(key) || Object.prototype.hasOwnProperty.call(kept, key)) return;
      if (typeof value[key] !== 'string') return;
      if (key === 'id' || key === 'q' || key === 'a') return;
      if (/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(key) || /^(?:text|title|description|label|statement|instructions|prompt)_en$/.test(key)) {
        kept[key] = value[key];
      }
    });
    seen.pop();
    return Object.keys(kept).length ? kept : null;
  }
  function projectStudentGuideData(data, mode) {
    var out = {};
    data = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    GUIDE_CONTENT_FIELDS.concat(['successCriteria', 'extensions', 'activities']).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) return;
      if (mode !== 'study' && mode !== 'family' && ['hook', 'directInstruction', 'guidedPractice', 'independentPractice', 'closure'].indexOf(key) !== -1 && (typeof data[key] === 'string' || typeof data[key] === 'number')) return;
      if (data[key] != null) { var next = projectStudentGuideValue(data[key]); if (next != null) out[key] = next; }
    });
    return out;
  }
  // Learner copy of a guide: an allowlist of the guide's own sections. Teaching
  // scripts, extension teacher guides, criterion links and live rollup ids,
  // STEAM station picks, unit-path metadata and the recorded generation inputs
  // (summaries, inventory, custom instructions) stay on the teacher's copy.
  function projectStudentGuide(item) {
    if (!item || !item.id || !isStudentDeliverableGuide(item)) return null;
    var data = item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : {};
    var out = projectStudentGuideData(data, item.config.generationInputs.mode);
    var source = item.config;
    var config = { generationInputs: { version: source.generationInputs.version, mode: source.generationInputs.mode } };
    ['grade', 'gradeLevel', 'language', 'sourceTopic', 'topic', 'translationTarget'].forEach(function (key) {
      if (typeof source[key] === 'string' || (typeof source[key] === 'number' && Number.isFinite(source[key]))) config[key] = source[key];
    });
    var projected = { id: item.id, type: 'lesson-plan', data: out, config: config, studentProjection: true };
    ['title', 'meta', 'timestamp', 'sourceTopic', 'gradeLevel'].forEach(function (key) {
      var v = item[key];
      if (typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) projected[key] = v;
    });
    if (item.timestamp instanceof Date && Number.isFinite(item.timestamp.getTime())) projected.timestamp = item.timestamp;
    return projected;
  }

  // The single student-safe candidate rule for EVERY content channel:
  // a resource must have an id and must not be a teacher-only type. A
  // student's submitted copy under teacher review never travels back out,
  // even when a caller forgets to drop it first.
  function isSubmissionCopy(item) {
    return !!(item && item.data && typeof item.data === 'object' && item.data.submissionCopy);
  }
  // KWL teacher examples (branch.teacherExample) stay on the teacher's device;
  // the branch stays so the student's writing prompt still renders.
  function withoutTeacherExamples(item) {
    var data = item && item.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.branches)) return item;
    var changed = false;
    var branches = data.branches.map(function (branch) {
      if (!branch || branch.teacherExample !== true) return branch;
      var next = Object.assign({}, branch);
      ['items', 'items_en'].forEach(function (key) { if (Array.isArray(next[key]) && next[key].length) { next[key] = []; changed = true; } });
      return next;
    });
    return changed ? Object.assign({}, item, { data: Object.assign({}, data, { branches: branches }) }) : item;
  }
  // Students see only the passage of a source check (and its translated versions);
  // the findings (accuracy, grammar, barriers, DoK ideas, report views, per-section
  // reports, idea drafts) are teacher notes and stay on the teacher's copy.
  var SOURCE_CHECK_TEACHER_FIELDS = ['accuracy', 'grammar', 'grammarUnreadable', 'learnerBarriers', 'depthOfKnowledge',
    'reportTranslations', 'displayReportLanguage', 'analysisCoverage', 'analysisIdeaDrafts', 'passageVersionsToRefresh',
    'summary', 'standards', 'contentReview', 'factCheck', 'readability', 'teacherNotes', 'pedagogicalNotes'];
  function projectStudentSourceCheck(item) {
    var data = item && item.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return item;
    var kept = {};
    Object.keys(data).forEach(function (key) {
      if (isSafeKey(key) && SOURCE_CHECK_TEACHER_FIELDS.indexOf(key) === -1) kept[key] = data[key];
    });
    return Object.assign({}, item, { data: kept });
  }
  function studentSafeResources(history, teacherOnlyTypes, projectActivity) {
    var blocked = Array.isArray(teacherOnlyTypes) ? teacherOnlyTypes : [];
    var reading = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.InstructionalContext;
    var source = (Array.isArray(history) ? history : []).filter(function (item) { return !isSubmissionCopy(item); });
    var resources = reading && typeof reading.ensureReadingSourcePairs === 'function'
      ? reading.ensureReadingSourcePairs(source) : source;
    return (Array.isArray(resources) ? resources : []).map(function (item) {
      if (!item || !item.id || !item.type || isSubmissionCopy(item)) return null;
      if (item.type === 'brainstorm') {
        var projected = typeof projectActivity === 'function' ? projectActivity(item) : null;
        return projected && projected.id === item.id && projected.type === 'brainstorm' && projected.studentProjection === true ? projected : null;
      }
      if (item.type === 'lesson-plan') return projectStudentGuide(item);
      if (item.type === 'analysis' && blocked.indexOf('analysis') === -1) return projectStudentSourceCheck(item);
      return blocked.indexOf(item.type) === -1 ? withoutTeacherExamples(item) : null;
    }).filter(Boolean);
  }

  function selectTransportKind(context) {
    return context && context.mailboxActive ? 'mailbox' : 'firebase';
  }

  function requireOps(ops, names, kind) {
    if (!ops || typeof ops !== 'object') {
      throw new Error('[SessionTransport] ' + kind + ' adapter requires ops object');
    }
    names.forEach(function (name) {
      if (typeof ops[name] !== 'function') {
        throw new Error('[SessionTransport] ' + kind + ' adapter requires ops.' + name);
      }
    });
  }

  // ── Firebase adapter ──
  // publishResources: student-safe filter → asset upload → size-capped
  // preparation → ONE gated write carrying resources + the AI policy.
  function createFirebaseTransport(ops) {
    requireOps(ops, ['uploadAssets', 'prepareResources', 'write'], 'firebase');
    var teacherOnlyTypes = ops.teacherOnlyTypes || [];
    return Object.freeze({
      kind: 'firebase',
      capabilities: function () {
        return { chunked: false, maxDocBytes: 850 * 1024, policyChannel: 'session-doc' };
      },
      publishResources: function (history) {
        var candidates = studentSafeResources(history, teacherOnlyTypes, ops.projectStudentActivityResource);
        var uploadPromise;
        try { uploadPromise = Promise.resolve(ops.uploadAssets(candidates)); } catch (err) { return Promise.reject(err); }
        return uploadPromise.then(function (uploaded) {
          var rawPrepared = ops.prepareResources(uploaded || candidates);
          var prepared = (rawPrepared && typeof rawPrepared === 'object')
            ? rawPrepared
            : { resources: [], keptCount: 0, droppedCount: 0, byteLength: 0 };
          var payload = { resources: Array.isArray(prepared.resources) ? prepared.resources : [] };
          if (typeof ops.policy === 'function') {
            var policy = ops.policy();
            if (policy) payload.aiPolicy = policy;
          }
          return Promise.resolve(ops.write(payload)).then(function () {
            if ((prepared.droppedCount > 0 || prepared.overLimit) && typeof ops.onTrimmed === 'function') {
              ops.onTrimmed(prepared);
            }
            return {
              kind: 'firebase',
              candidates: candidates.length,
              kept: prepared.keptCount,
              dropped: prepared.droppedCount,
              bytes: prepared.byteLength,
              publishedIds: payload.resources
                .map(function (item) { return String(item && item.id || ''); })
                .filter(Boolean),
            };
          });
        });
      },
      publishPolicy: function () {
        try {
          var policy = typeof ops.policy === 'function' ? ops.policy() : null;
          if (!policy) return Promise.resolve(null);
          return Promise.resolve(ops.write({ aiPolicy: policy })).then(function () {
            return { kind: 'firebase', published: true };
          });
        } catch (err) {
          return Promise.reject(err);
        }
      },
    });
  }

  // ── Mailbox pack-cycle algorithm (stage 2) ──
  // The CYCLE SEMANTICS live here — removal detection, per-item fingerprint
  // dedupe with failure isolation (a failed push must not strand the rest,
  // and only success records the fingerprint so the item retries next
  // cycle), and fingerprint-gated hosted-pack refresh (zero Drive writes
  // when the student-safe set is unchanged). The HOST keeps the primitives:
  // encoding, chunked network sends, Firestore packRef writes.
  function runMailboxPackCycle(candidates, ops) {
    requireOps(ops, ['fingerprint', 'pushItem'], 'mailbox pack cycle');
    var list = (Array.isArray(candidates) ? candidates : []).filter(function (item) {
      return item && typeof item === 'object' && isSafeKey(String(item.id || ''));
    });
    function assertCurrent() {
      if (typeof ops.isCurrent === 'function' && !ops.isCurrent()) {
        var error = new Error('Mailbox publication superseded'); error.name = 'AbortError'; throw error;
      }
    }
    var seen = (ops.seen && typeof ops.seen === 'object') ? ops.seen : {};
    var currentIds = Object.create(null);
    list.forEach(function (item) { currentIds[item.id] = true; });
    var removedIds = Object.keys(seen).filter(function (id) { return isSafeKey(id) && !currentIds[id]; });

    var removalPromise = Promise.resolve();
    if (removedIds.length) {
      removalPromise = Promise.resolve().then(function () {
        assertCurrent();
        if (typeof ops.sendRemovals === 'function') return ops.sendRemovals(removedIds);
      }).then(function () {
        assertCurrent();
        // Keep the pending removal until delivery succeeds, including retries.
        removedIds.forEach(function (id) { delete seen[id]; });
      });
    }

    return removalPromise.then(function () {
      assertCurrent();
      var pushed = 0;
      var failed = 0;
      var chain = Promise.resolve();
      list.forEach(function (item) {
        chain = chain.then(function () {
          return Promise.resolve().then(function () {
            assertCurrent();
            var fp = ops.fingerprint(item);
            if (Object.prototype.hasOwnProperty.call(seen, item.id) && seen[item.id] === fp) return null;
            return Promise.resolve().then(function () { assertCurrent(); return ops.pushItem(item); }).then(function () {
              assertCurrent();
              Object.defineProperty(seen, item.id, { value: fp, enumerable: true, configurable: true, writable: true });
              pushed += 1;
            });
          }).catch(function (error) {
            if (error && error.name === 'AbortError') throw error;
            failed += 1;
            if (typeof ops.onItemError === 'function') ops.onItemError(item, error);
          });
        });
      });
      return chain.then(function () {
        assertCurrent();
        if ((pushed || failed || removedIds.length) && typeof ops.trace === 'function') {
          ops.trace('mailbox:pack-cycle', { candidates: list.length, pushed: pushed, failed: failed, removed: removedIds.length });
        }
        if (typeof ops.hostPack !== 'function' || typeof ops.packFingerprint !== 'function') {
          return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false };
        }
        var packFp = ops.packFingerprint(list);
        var hostedFp = typeof ops.getHostedFp === 'function' ? ops.getHostedFp() : null;
        if (packFp === hostedFp || (!list.length && !removedIds.length && hostedFp == null)) {
          return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false };
        }
        return Promise.resolve().then(function () { return ops.hostPack(list); }).then(function (packIdentity) {
          assertCurrent();
          if (!packIdentity) {
            if (typeof ops.trace === 'function') ops.trace('mailbox:pack-host-empty', { candidates: list.length });
            return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false, referencePublished: false };
          }
          // Late joiners need both the pack and its published reference.
          // A failed reference write must remain retryable on the next cycle.
          var referencePublished = true;
          var publish = Promise.resolve();
          if (typeof ops.publishPackRef === 'function') {
            publish = Promise.resolve().then(function () { assertCurrent(); return ops.publishPackRef({
              id: packIdentity.id,
              k: packIdentity.k,
              n: list.length,
              t: typeof ops.now === 'function' ? ops.now() : Date.now(),
            }); }).catch(function (error) {
              if (error && error.name === 'AbortError') throw error;
              assertCurrent();
              referencePublished = false;
              if (typeof ops.trace === 'function') ops.trace('mailbox:pack-reference-failed', { candidates: list.length });
              if (typeof ops.onPackRefError === 'function') ops.onPackRefError(error);
            });
          }
          return publish.then(function () {
            assertCurrent();
            if (referencePublished && typeof ops.setHostedFp === 'function') ops.setHostedFp(packFp);
            if (referencePublished && !failed && typeof ops.trace === 'function') ops.trace('mailbox:pack-reference-published', { candidates: list.length });
            return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: true, referencePublished: referencePublished };
          });
        });
      });
    });
  }

  // ── Mailbox adapter ──
  // Granular ops (stage 2): the adapter runs the module-owned pack cycle.
  // Legacy shell (stage 1): ops.runPackCycle keeps working for callers that
  // still own their cycle. Policy travels in the join URL/packet on this
  // transport — publishPolicy is a capability no-op either way.
  function createMailboxTransport(ops) {
    if (!ops || typeof ops !== 'object') {
      throw new Error('[SessionTransport] mailbox adapter requires ops object');
    }
    var teacherOnlyTypes = ops.teacherOnlyTypes || [];
    var shellMode = typeof ops.runPackCycle === 'function';
    if (!shellMode) requireOps(ops, ['fingerprint', 'pushItem'], 'mailbox');
    return Object.freeze({
      kind: 'mailbox',
      capabilities: function () {
        return { chunked: true, maxDocBytes: 85 * 1024, policyChannel: 'join-url' };
      },
      publishResources: function (history) {
        var candidates = studentSafeResources(history, teacherOnlyTypes, ops.projectStudentActivityResource);
        var cycle;
        try {
          cycle = shellMode ? ops.runPackCycle(candidates) : runMailboxPackCycle(candidates, ops);
        } catch (err) {
          return Promise.reject(err);
        }
        return Promise.resolve(cycle).then(function (result) {
          return Object.assign({ kind: 'mailbox', candidates: candidates.length }, result || {});
        });
      },
      publishPolicy: function () {
        return Promise.resolve({ kind: 'mailbox', published: false, reason: 'policy rides the join URL on this transport' });
      },
    });
  }

  window.AlloModules = window.AlloModules || {};
  // ── Class-follow pointer (stage 3) ──
  // The teacher-paced "class follows me to this resource" write, with a
  // Session-tab trace. Pointer channels (currentResourceId, group/student
  // roster fields) ride the SHARED session doc on BOTH transports by design —
  // only the content channel differs — so one write op serves everyone.
  function followResource(item, ops) {
    if (!item || !item.id || !ops || typeof ops.write !== 'function') return Promise.resolve(false);
    var writePromise;
    try { writePromise = Promise.resolve(ops.write(item)); } catch (err) { return Promise.reject(err); }
    return writePromise.then(function () {
      if (typeof ops.trace === 'function') {
        ops.trace('sync:follow', { id: String(item.id).slice(0, 40), type: item.type || null });
      }
      return true;
    });
  }

  window.AlloModules.SessionTransport = Object.freeze({
    followResource: followResource,
    studentSafeResources: studentSafeResources,
    isStudentDeliverableGuide: isStudentDeliverableGuide,
    projectStudentGuide: projectStudentGuide,
    projectStudentGuideData: projectStudentGuideData,
    selectTransportKind: selectTransportKind,
    createFirebaseTransport: createFirebaseTransport,
    createMailboxTransport: createMailboxTransport,
    runMailboxPackCycle: runMailboxPackCycle,
  });
  window.AlloModules.SessionTransportModule = true;
  console.log('[SessionTransport] registered (unified live-session content channel, stage 1)');
})();
