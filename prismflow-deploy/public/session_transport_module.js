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

  // ── Mailbox adapter (orchestration shell, stage 1) ──
  // The mailbox pack cycle (per-item fingerprints, chunked pushes, hosted
  // packRef self-heal) stays host-owned as ops.runPackCycle; the adapter
  // contributes the SHARED candidate rule and the common interface so call
  // sites stop caring which transport is live. Policy travels in the join
  // URL/packet on this transport — publishPolicy is a capability no-op.
  function createMailboxTransport(ops) {
    requireOps(ops, ['runPackCycle'], 'mailbox');
    var teacherOnlyTypes = ops.teacherOnlyTypes || [];
    return {
      kind: 'mailbox',
      capabilities: function () {
        return { chunked: true, maxDocBytes: 85 * 1024, policyChannel: 'join-url' };
      },
      publishResources: function (history) {
        var candidates = studentSafeResources(history, teacherOnlyTypes);
        return Promise.resolve(ops.runPackCycle(candidates)).then(function (result) {
          return Object.assign({ kind: 'mailbox', candidates: candidates.length }, result || {});
        });
      },
      publishPolicy: function () {
        return Promise.resolve({ kind: 'mailbox', published: false, reason: 'policy rides the join URL on this transport' });
      },
    };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SessionTransport = {
    studentSafeResources: studentSafeResources,
    selectTransportKind: selectTransportKind,
    createFirebaseTransport: createFirebaseTransport,
    createMailboxTransport: createMailboxTransport,
  };
  window.AlloModules.SessionTransportModule = true;
  console.log('[SessionTransport] registered (unified live-session content channel, stage 1)');
})();
