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
  // Learner copy of a guide: an allowlist of the guide's own sections. Teaching
  // scripts, extension teacher guides, criterion links and live rollup ids,
  // STEAM station picks, unit-path metadata and the recorded generation inputs
  // (summaries, inventory, custom instructions) stay on the teacher's copy.
  function projectStudentGuide(item) {
    if (!item || !item.id || !isStudentDeliverableGuide(item)) return null;
    var data = item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data : {};
    var out = {};
    GUIDE_CONTENT_FIELDS.forEach(function (key) { if (data[key] != null) out[key] = data[key]; });
    if (data.successCriteria != null) {
      out.successCriteria = (Array.isArray(data.successCriteria) ? data.successCriteria : [data.successCriteria]).map(function (entry) {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) return entry.statement != null ? { statement: entry.statement } : null;
        return entry;
      }).filter(function (entry) { return entry != null; });
    }
    if (data.extensions != null) {
      out.extensions = (Array.isArray(data.extensions) ? data.extensions : [data.extensions]).map(function (ext) {
        if (ext && typeof ext === 'object' && !Array.isArray(ext)) {
          var kept = {};
          if (ext.title != null) kept.title = ext.title;
          if (ext.description != null) kept.description = ext.description;
          return Object.keys(kept).length ? kept : null;
        }
        return ext;
      }).filter(function (ext) { return ext != null; });
    }
    var source = item.config;
    var config = { generationInputs: { version: source.generationInputs.version, mode: source.generationInputs.mode } };
    ['grade', 'gradeLevel', 'language', 'sourceTopic', 'topic', 'translationTarget'].forEach(function (key) {
      if (typeof source[key] === 'string' || typeof source[key] === 'number') config[key] = source[key];
    });
    var projected = { id: item.id, type: 'lesson-plan', data: out, config: config, studentProjection: true };
    ['title', 'meta', 'timestamp', 'sourceTopic', 'gradeLevel'].forEach(function (key) {
      if (item[key] != null && typeof item[key] !== 'object') projected[key] = item[key];
    });
    if (item.timestamp instanceof Date) projected.timestamp = item.timestamp;
    return projected;
  }

  // The single student-safe candidate rule for EVERY content channel:
  // a resource must have an id and must not be a teacher-only type.
  function studentSafeResources(history, teacherOnlyTypes, projectActivity) {
    var blocked = Array.isArray(teacherOnlyTypes) ? teacherOnlyTypes : [];
    var reading = window.AlloModules && window.AlloModules.InstructionalContext;
    var resources = reading && typeof reading.ensureReadingSourcePairs === 'function'
      ? reading.ensureReadingSourcePairs(Array.isArray(history) ? history : []) : history;
    return (Array.isArray(resources) ? resources : []).map(function (item) {
      if (!item || !item.id || !item.type) return null;
      if (item.type === 'brainstorm') {
        var projected = typeof projectActivity === 'function' ? projectActivity(item) : null;
        return projected && projected.id === item.id && projected.type === 'brainstorm' && projected.studentProjection === true ? projected : null;
      }
      if (item.type === 'lesson-plan') return projectStudentGuide(item);
      return blocked.indexOf(item.type) === -1 ? item : null;
    }).filter(Boolean);
  }

  function selectTransportKind(context) {
    return context && context.mailboxActive ? 'mailbox' : 'firebase';
  }

  function requireOps(ops, names, kind) {
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
    return {
      kind: 'firebase',
      capabilities: function () {
        return { chunked: false, maxDocBytes: 850 * 1024, policyChannel: 'session-doc' };
      },
      publishResources: function (history) {
        var candidates = studentSafeResources(history, teacherOnlyTypes, ops.projectStudentActivityResource);
        return Promise.resolve(ops.uploadAssets(candidates)).then(function (uploaded) {
          var prepared = ops.prepareResources(uploaded || candidates);
          var payload = { resources: prepared.resources };
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
              publishedIds: (Array.isArray(prepared.resources) ? prepared.resources : [])
                .map(function (item) { return String(item && item.id || ''); })
                .filter(Boolean),
            };
          });
        });
      },
      publishPolicy: function () {
        var policy = typeof ops.policy === 'function' ? ops.policy() : null;
        if (!policy) return Promise.resolve(null);
        return Promise.resolve(ops.write({ aiPolicy: policy })).then(function () {
          return { kind: 'firebase', published: true };
        });
      },
    };
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
    function assertCurrent() {
      if (typeof ops.isCurrent === 'function' && !ops.isCurrent()) {
        var error = new Error('Mailbox publication superseded'); error.name = 'AbortError'; throw error;
      }
    }
    var seen = ops.seen || {};
    var currentIds = Object.create(null);
    candidates.forEach(function (item) { currentIds[item.id] = true; });
    var removedIds = Object.keys(seen).filter(function (id) { return !currentIds[id]; });

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
      candidates.forEach(function (item) {
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
          ops.trace('mailbox:pack-cycle', { candidates: candidates.length, pushed: pushed, failed: failed, removed: removedIds.length });
        }
        if (typeof ops.hostPack !== 'function' || typeof ops.packFingerprint !== 'function') {
          return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false };
        }
        var packFp = ops.packFingerprint(candidates);
        var hostedFp = typeof ops.getHostedFp === 'function' ? ops.getHostedFp() : null;
        if (packFp === hostedFp || (!candidates.length && !removedIds.length && hostedFp == null)) {
          return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false };
        }
        return Promise.resolve(ops.hostPack(candidates)).then(function (packIdentity) {
          assertCurrent();
          // Late joiners need both the pack and its published reference.
          // A failed reference write must remain retryable on the next cycle.
          var referencePublished = true;
          var publish = Promise.resolve();
          if (packIdentity && typeof ops.publishPackRef === 'function') {
            publish = Promise.resolve().then(function () { assertCurrent(); return ops.publishPackRef({
              id: packIdentity.id,
              k: packIdentity.k,
              n: candidates.length,
              t: typeof ops.now === 'function' ? ops.now() : Date.now(),
            }); }).catch(function (error) {
              if (error && error.name === 'AbortError') throw error;
              assertCurrent();
              referencePublished = false;
              if (typeof ops.trace === 'function') ops.trace('mailbox:pack-reference-failed', { candidates: candidates.length });
              if (typeof ops.onPackRefError === 'function') ops.onPackRefError(error);
            });
          }
          return publish.then(function () {
            assertCurrent();
            if (referencePublished && typeof ops.setHostedFp === 'function') ops.setHostedFp(packFp);
            if (referencePublished && !failed && typeof ops.trace === 'function') ops.trace('mailbox:pack-reference-published', { candidates: candidates.length });
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
    var teacherOnlyTypes = ops.teacherOnlyTypes || [];
    var shellMode = typeof ops.runPackCycle === 'function';
    if (!shellMode) requireOps(ops, ['fingerprint', 'pushItem'], 'mailbox');
    return {
      kind: 'mailbox',
      capabilities: function () {
        return { chunked: true, maxDocBytes: 85 * 1024, policyChannel: 'join-url' };
      },
      publishResources: function (history) {
        var candidates = studentSafeResources(history, teacherOnlyTypes, ops.projectStudentActivityResource);
        var cycle = shellMode ? ops.runPackCycle(candidates) : runMailboxPackCycle(candidates, ops);
        return Promise.resolve(cycle).then(function (result) {
          return Object.assign({ kind: 'mailbox', candidates: candidates.length }, result || {});
        });
      },
      publishPolicy: function () {
        return Promise.resolve({ kind: 'mailbox', published: false, reason: 'policy rides the join URL on this transport' });
      },
    };
  }

  window.AlloModules = window.AlloModules || {};
  // ── Class-follow pointer (stage 3) ──
  // The teacher-paced "class follows me to this resource" write, with a
  // Session-tab trace. Pointer channels (currentResourceId, group/student
  // roster fields) ride the SHARED session doc on BOTH transports by design —
  // only the content channel differs — so one write op serves everyone.
  function followResource(item, ops) {
    if (!item || !item.id || !ops || typeof ops.write !== 'function') return Promise.resolve(false);
    return Promise.resolve(ops.write(item)).then(function () {
      if (typeof ops.trace === 'function') {
        ops.trace('sync:follow', { id: String(item.id).slice(0, 40), type: item.type || null });
      }
      return true;
    });
  }

  window.AlloModules.SessionTransport = {
    followResource: followResource,
    studentSafeResources: studentSafeResources,
    isStudentDeliverableGuide: isStudentDeliverableGuide,
    projectStudentGuide: projectStudentGuide,
    selectTransportKind: selectTransportKind,
    createFirebaseTransport: createFirebaseTransport,
    createMailboxTransport: createMailboxTransport,
    runMailboxPackCycle: runMailboxPackCycle,
  };
  window.AlloModules.SessionTransportModule = true;
  console.log('[SessionTransport] registered (unified live-session content channel, stage 1)');
})();
