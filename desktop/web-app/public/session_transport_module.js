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

  // The single student-safe candidate rule for EVERY content channel:
  // a resource must have an id and must not be a teacher-only type.
  function studentSafeResources(history, teacherOnlyTypes) {
    var blocked = Array.isArray(teacherOnlyTypes) ? teacherOnlyTypes : [];
    return (Array.isArray(history) ? history : []).filter(function (item) {
      return item && item.id && item.type && blocked.indexOf(item.type) === -1;
    });
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
        var candidates = studentSafeResources(history, teacherOnlyTypes);
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
    var seen = ops.seen || {};
    var currentIds = {};
    candidates.forEach(function (item) { currentIds[item.id] = true; });
    var removedIds = Object.keys(seen).filter(function (id) { return !currentIds[id]; });

    var removalPromise = Promise.resolve();
    if (removedIds.length) {
      removedIds.forEach(function (id) { delete seen[id]; });
      if (typeof ops.sendRemovals === 'function') removalPromise = Promise.resolve(ops.sendRemovals(removedIds));
    }

    return removalPromise.then(function () {
      var pushed = 0;
      var failed = 0;
      var chain = Promise.resolve();
      candidates.forEach(function (item) {
        chain = chain.then(function () {
          var fp = ops.fingerprint(item);
          if (seen[item.id] === fp) return null;
          return Promise.resolve(ops.pushItem(item)).then(function () {
            seen[item.id] = fp;
            pushed += 1;
          }, function (error) {
            failed += 1;
            if (typeof ops.onItemError === 'function') ops.onItemError(item, error);
          });
        });
      });
      return chain.then(function () {
        if ((pushed || failed || removedIds.length) && typeof ops.trace === 'function') {
          ops.trace('mailbox:pack-cycle', { candidates: candidates.length, pushed: pushed, failed: failed, removed: removedIds.length });
        }
        if (!candidates.length || typeof ops.hostPack !== 'function' || typeof ops.packFingerprint !== 'function') {
          return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false };
        }
        var packFp = ops.packFingerprint(candidates);
        var hostedFp = typeof ops.getHostedFp === 'function' ? ops.getHostedFp() : null;
        if (packFp === hostedFp) {
          return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: false };
        }
        return Promise.resolve(ops.hostPack(candidates)).then(function (packIdentity) {
          // Fingerprint records ONLY after a fully successful host, so a
          // failed/partial upload re-hosts next cycle (current semantics).
          if (typeof ops.setHostedFp === 'function') ops.setHostedFp(packFp);
          var publish = Promise.resolve();
          if (packIdentity && typeof ops.publishPackRef === 'function') {
            publish = Promise.resolve(ops.publishPackRef({
              id: packIdentity.id,
              k: packIdentity.k,
              n: candidates.length,
              t: typeof ops.now === 'function' ? ops.now() : Date.now(),
            })).catch(function (error) {
              // packRef publish failure is advisory (students self-heal from
              // ring messages); the hosted pack itself succeeded.
              if (typeof ops.onPackRefError === 'function') ops.onPackRefError(error);
            });
          }
          return publish.then(function () {
            return { pushed: pushed, failed: failed, removed: removedIds.length, hosted: true };
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
        var candidates = studentSafeResources(history, teacherOnlyTypes);
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
    selectTransportKind: selectTransportKind,
    createFirebaseTransport: createFirebaseTransport,
    createMailboxTransport: createMailboxTransport,
    runMailboxPackCycle: runMailboxPackCycle,
  };
  window.AlloModules.SessionTransportModule = true;
  console.log('[SessionTransport] registered (unified live-session content channel, stage 1)');
})();
