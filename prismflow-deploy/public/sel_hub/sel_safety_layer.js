// ═══════════════════════════════════════════════════════════════
// sel_safety_layer.js — SEL Hub Safety Infrastructure (v1.1)
//
// Canvas-compatible: NO localStorage dependency for flags/transcripts.
// Uses in-memory storage + integrates with the existing safety pipeline:
//   - SafetyContentChecker (regex-based immediate checking)
//   - handleAiSafetyFlag callback (feeds aiSafetyFlags state)
//   - syncProgressToFirestore (60s count-summary pipeline to the teacher
//     dashboard — LIVE WEB SESSIONS ONLY; the sync is disabled on Canvas
//     hosts and in solo mode, where flags reach no adult automatically)
//
// Architecture:
//   - Consent: in-memory per session (re-shown each Canvas session = more protective)
//   - Assessment: triangulated AI evaluation (2 primary + 1 confirmation);
//     when the AI is unreachable the result is marked unassessed:true —
//     "couldn't check" is never reported as "checked: safe"
//   - Flags: pushed through ctx.onSafetyFlag callback (same path as persona/adventure)
//   - Transcripts: NOT retained. The crisis modal holds the flagged snippet
//     transiently; storeTranscript/getTranscript are intentional no-ops.
//   - Crisis resources: shown immediately in-chat for Tier 3
//
// This module MUST load before any sel_tool_*.js files.
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  window.SelHub = window.SelHub || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  // ══════════════════════════════════════════════════════════════
  // ── In-Memory State (session-scoped, no persistence needed) ──
  // ══════════════════════════════════════════════════════════════

  var _consentGiven = false;

  // Mirrors the app shell's Canvas detection (AlloFlowANTI isCanvas useMemo):
  // on Canvas hosts the 60s teacher sync is hard-disabled, so even WITH a
  // session code no flag ever reaches a teacher there. Pure location check.
  function _isCanvasHost() {
    try {
      if (typeof window === 'undefined' || !window.location) return false;
      var host = window.location.hostname || '';
      var href = window.location.href || '';
      if (href.indexOf('blob:') === 0) return true;
      return host.indexOf('googleusercontent') !== -1 || host.indexOf('scf.usercontent') !== -1 ||
        host.indexOf('code-server') !== -1 || host.indexOf('idx.google') !== -1 || host.indexOf('run.app') !== -1;
    } catch (_) { return false; }
  }

  // TRUE only when a safety flag can actually reach a teacher: a live session
  // code is set AND we are not on a Canvas host (where the sync is disabled).
  // Every promise-making surface below branches on this, so the copy can
  // never promise adult notification a code path cannot deliver.
  function _liveFlagsReachTeacher(activeSessionCode) {
    return !!(activeSessionCode && String(activeSessionCode).trim()) && !_isCanvasHost();
  }
  // Transient snapshot of the most recent flagged snippet. Single string,
  // overwritten each call, never persisted. The crisis modal owns this data;
  // nothing else stores it. Replaces the prior _transcriptStore Map, which
  // accumulated student writing in memory for the life of the session.
  var _lastSnippet = '';
  var _flagLog = [];         // session-scoped audit log
  var _activeCrisisModal = null; // single-instance guard for the modal

  // ══════════════════════════════════════════════════════════════
  // ── Consent ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.hasCoachConsent = function() { return _consentGiven; };
  window.SelHub.giveCoachConsent = function() { _consentGiven = true; };

  /**
   * Render informed consent screen \u2014 HONEST per mode.
   *
   * The old copy promised unconditionally that "a caring adult at your school
   * will be told" and "may see what you wrote." Neither is deliverable in
   * solo/Canvas mode (no sync, save files exclude flags, no scanner reads SEL
   * chats), and even in live sessions the teacher receives an alert COUNT,
   * never the words. A student deciding what to disclose must not be told an
   * adult is coming when none is. The copy now states only what each mode
   * actually does, and in every mode tells the student the one thing that is
   * always true: an adult can only help if a person tells them.
   *
   * @param {function} h - React.createElement
   * @param {string} band - elementary/middle/high
   * @param {function} onConsent - callback
   * @param {string} [activeSessionCode] - live-session code if hosted (ctx.activeSessionCode);
   *   omitted/falsy or on a Canvas host = solo truth (the safer default).
   */
  window.SelHub.renderConsentScreen = function(h, band, onConsent, activeSessionCode) {
    var isYoung = band === 'elementary';
    var live = _liveFlagsReachTeacher(activeSessionCode);
    var intro = live
      ? (isYoung
        ? 'You\u2019re in a class session with your teacher. Work you save or turn in can be seen by them.'
        : 'You\u2019re in a live class session. Anything you save or submit here can be seen by your teacher.')
      : (isYoung
        ? 'This is a private space to think about how you feel. What you write here is not sent to your teacher or any adult.'
        : 'This is a private space. What you write here is not sent to your teacher or school \u2014 no adult is automatically notified.');
    var safetyBox = live
      ? (isYoung
        ? 'If what you write sounds like you might be in danger, this app shows your teacher an alert so they can check on you \u2014 they see the alert, not your words. And if you are in danger, don\u2019t wait: tell a trusted adult right away.'
        : 'If what you write suggests serious danger \u2014 to you or someone else \u2014 the app raises an alert on your teacher\u2019s dashboard. The alert is a flag, not your words. If you\u2019re in danger right now, don\u2019t wait for software: tell a trusted adult, or call or text 988.')
      : (isYoung
        ? 'This app cannot tell an adult for you. If you are in danger, or someone is hurting you or someone else, tell a trusted adult right away \u2014 a parent, a teacher, or a counselor. If what you write sounds serious, this app will show you ways to get help.'
        : 'This app cannot notify an adult on its own. If what you write suggests danger, it will show you crisis resources right away \u2014 but reaching an adult is up to you. If you\u2019re dealing with harm, abuse, or thoughts of hurting yourself, please tell a trusted adult directly, or call or text 988.');
    var closing = live
      ? (isYoung
        ? 'Asking for help is always okay. A grown-up would rather know.'
        : 'We tell you this up front so you can make an informed choice about what to share.')
      : (isYoung
        ? 'A grown-up can only help if a person tells them. You can always ask a trusted adult for help \u2014 about anything.'
        : 'We tell you this up front so you can make an informed choice about what to share \u2014 and so you never assume an adult has been told when they haven\u2019t.');
    return h('div', { style: { padding: '24px', maxWidth: '520px', margin: '0 auto', textAlign: 'center' } },
      h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '\uD83D\uDD12'),
      h('h3', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 12px' } }, 'Before We Start'),
      h('div', { style: { background: '#f0f9ff', borderRadius: '14px', padding: '18px', border: '1px solid #bae6fd', textAlign: 'left', marginBottom: '16px' } },
        h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#1e293b', margin: '0 0 10px' } }, intro),
        h('div', { style: { background: '#fffbeb', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b', marginBottom: '10px' } },
          h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#78350f', margin: 0 } }, safetyBox)
        ),
        h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#475569', margin: 0 } }, closing)
      ),
      h('button', {
        onClick: onConsent,
        autoFocus: true,
        'aria-label': 'I understand the safety guidelines',
        style: { padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
      }, isYoung ? 'I Understand \u2014 Let\u2019s Talk' : 'I Understand the Guidelines'),
      h('p', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '10px' } }, 'This appears once per session for your awareness.')
    );
  };

  // ══════════════════════════════════════════════════════════════
  // ── Triangulated Safety Assessment ──
  // ══════════════════════════════════════════════════════════════

  // The protocol asks for the verdict token ALONE on line 1 ("Respond ONLY:
  // TIER_X\nThen one sentence rationale"). Loose words (CRITICAL/CONCERN/
  // MONITOR) are trusted only there — rationales legitimately contain them
  // ("not critical", "no concern"), and whole-response substring matching
  // flipped benign rationales into false Tier 2/3 crisis modals. Off-protocol
  // shapes fall back to the explicit TIER_n token anywhere, never loose words.
  function parseTier(response) {
    if (!response) return 0;
    var text = String(response).toUpperCase();
    var firstLine = text.trim().split('\n')[0];
    if (/TIER_3|\bCRITICAL\b/.test(firstLine)) return 3;
    if (/TIER_2|\bCONCERN\b/.test(firstLine)) return 2;
    if (/TIER_1|\bMONITOR\b/.test(firstLine)) return 1;
    if (/TIER_0|\bSAFE\b|FALSE_ALARM/.test(firstLine)) return 0;
    var m = text.match(/\bTIER_([0-3])\b/);
    return m ? parseInt(m[1], 10) : 0;
  }

  /**
   * Triangulated safety assessment.
   * Returns Promise<{ tier, rationale, category }>
   */
  window.SelHub.assessSafety = function(studentMessage, band, toolId, callGemini) {
    if (!callGemini || !studentMessage) return Promise.resolve({ tier: 0, rationale: 'No message', category: 'none' });

    var ctx = toolId ? ('in a "' + toolId + '" SEL coaching session') : 'in an SEL coaching session';

    var prompt1 = 'You are a clinical risk assessor for a student safety monitoring system in a school. '
      + 'A ' + (band || 'elementary') + ' school student wrote the following ' + ctx + ':\n\n'
      + '"' + studentMessage.substring(0, 500) + '"\n\n'
      + 'Assess the safety risk level:\n'
      + '- TIER_0: No concern. Normal emotional processing.\n'
      + '- TIER_1: Low concern. General distress, no indication of harm.\n'
      + '- TIER_2: Moderate concern. Ongoing bullying, persistent fear, being harmed, actively harming another student, or emotional distress warranting adult awareness.\n'
      + '- TIER_3: CRITICAL. Suicidal thoughts, self-harm, physical abuse, weapons, imminent danger.\n\n'
      + 'IMPORTANT: Past-tense reflection is typically TIER_0. Acknowledging past bullying behavior (therapeutic growth) is TIER_0. Currently hurting someone is TIER_2+.\n\n'
      + 'Respond ONLY: TIER_0, TIER_1, TIER_2, or TIER_3\nThen one sentence rationale.';

    var prompt2 = 'You evaluate student messages for duty-to-protect in schools. '
      + 'A ' + (band || 'elementary') + ' student shared ' + ctx + ':\n\n'
      + '"' + studentMessage.substring(0, 500) + '"\n\n'
      + '- SAFE: No duty to act.\n- MONITOR: Low-level distress, no harm.\n- CONCERN: Being harmed, harming others, needs adult support.\n- CRITICAL: Imminent danger, SI, self-harm, weapons, abuse.\n\n'
      + 'Standard: would a reasonable school counselor feel obligated to act?\n\n'
      + 'Respond ONLY: SAFE, MONITOR, CONCERN, or CRITICAL\nThen one sentence rationale.';

    // Outage honesty: a failed assessor returns null (NOT a fake TIER_0/SAFE
    // verdict). When BOTH primaries are unreachable the result is marked
    // unassessed:true so callers can say "couldn't check" + surface resources
    // instead of silently reporting "checked: safe". (The old catch fallbacks
    // scored an AI outage as no-concern — fail-open exactly when the AI is down.)
    return Promise.all([
      callGemini(prompt1, true).catch(function() { return null; }),
      callGemini(prompt2, true).catch(function() { return null; })
    ]).then(function(results) {
      if (results[0] == null && results[1] == null) {
        return { tier: 0, unassessed: true, rationale: 'Safety assessment unavailable (AI unreachable)', category: 'none' };
      }
      var tier1 = parseTier(results[0]);
      var tier2 = parseTier(results[1]);
      var r1 = (results[0] || '').split('\n').slice(1).join(' ').trim();
      var r2 = (results[1] || '').split('\n').slice(1).join(' ').trim();
      var maxTier = Math.max(tier1, tier2);

      if (maxTier <= 1) {
        return { tier: maxTier, rationale: r1 || r2 || 'No concerns', category: 'none' };
      }

      // Confirmation assessor for Tier 2+
      var prompt3 = 'Student message flagged as potentially concerning:\n"' + studentMessage.substring(0, 500) + '"\n\n'
        + 'Assessor 1: TIER_' + tier1 + ' (' + r1 + ')\nAssessor 2: ' + (tier2 >= 3 ? 'CRITICAL' : tier2 >= 2 ? 'CONCERN' : 'MONITOR') + ' (' + r2 + ')\n\n'
        + 'Verify independently:\n- YES_TIER_3: Critical, requires immediate adult intervention\n- YES_TIER_2: Moderate, warrants adult awareness\n- FALSE_ALARM: Normal emotional processing, no adult notification needed\n\n'
        + 'Respond ONLY: YES_TIER_3, YES_TIER_2, or FALSE_ALARM\nThen one sentence rationale.';

      return callGemini(prompt3, true).catch(function() { return 'YES_TIER_2\nMaintaining flag for safety'; }).then(function(conf) {
        // Same first-line discipline as parseTier: the confirmation verdict is
        // trusted only on line 1 — a rationale like "not a false alarm" must
        // never clear a flag (whole-text matching did exactly that). Off-
        // protocol fallback checks escalation tokens BEFORE the clearing token.
        var cu = String(conf || '').trim().split('\n')[0].toUpperCase();
        if (!/FALSE_ALARM|YES_TIER_3|YES_TIER_2/.test(cu)) {
          var full = (conf || '').toUpperCase();
          cu = /\bYES_TIER_3\b/.test(full) ? 'YES_TIER_3' : /\bYES_TIER_2\b/.test(full) ? 'YES_TIER_2' : /\bFALSE_ALARM\b/.test(full) ? 'FALSE_ALARM' : '';
        }
        var cr = (conf || '').split('\n').slice(1).join(' ').trim();

        var category = 'none';
        if (/FALSE_ALARM/.test(cu) && maxTier < 3) {
          return { tier: 1, rationale: 'Cleared by confirmation: ' + cr, category: 'none' };
        }
        if (/YES_TIER_3/.test(cu) || maxTier >= 3) {
          category = /suicid|self.harm|hurt.*self/i.test(studentMessage) ? 'self_harm'
            : /weapon|gun|knife|firearm/i.test(studentMessage) ? 'harm_to_others'
            : /abus|hit.*me|beat/i.test(studentMessage) ? 'harm_to_others'
            : 'concerning';
          return { tier: 3, rationale: cr || r1 || r2, category: category };
        }
        category = /bull/i.test(studentMessage) ? 'bullying' : 'concerning';
        return { tier: 2, rationale: cr || r1 || r2, category: category };
      });
    });
  };

  // ══════════════════════════════════════════════════════════════
  // ── Transient Snippet (replaces the old transcript store) ──
  // The crisis modal owns flagged content. We no longer accumulate
  // student writing in memory across the session. These shim methods
  // exist so older callers that referenced storeTranscript do not break;
  // they intentionally do nothing persistent.
  // ══════════════════════════════════════════════════════════════

  window.SelHub.storeTranscript = function(/* flagId, messages */) {
    // No-op: transcripts are no longer retained. The crisis modal is the
    // only surface that ever holds flagged text, and only for the duration
    // of the modal itself.
  };

  window.SelHub.getTranscript = function() { return null; };

  window.SelHub.getAllTranscripts = function() { return {}; };

  // ══════════════════════════════════════════════════════════════
  // ── Safe Coach Wrapper ──
  // ══════════════════════════════════════════════════════════════

  /**
   * Safety-wrapped AI coach interaction.
   *
   * @param {Object} opts
   * @param {string} opts.studentMessage
   * @param {string} opts.coachPrompt - full prompt for the coach
   * @param {string} opts.toolId - e.g. 'upstander', 'compassion'
   * @param {string} opts.band - grade band
   * @param {function} opts.callGemini
   * @param {string} opts.codename - student identifier
   * @param {Array} opts.conversationHistory
   * @param {function} opts.onSafetyFlag - callback to push flag into app-level aiSafetyFlags
   *   Receives: { category, match, severity, source, context, timestamp, aiGenerated, confidence, tier, transcriptId }
   *
   * @returns {Promise<{ response, tier, showCrisis }>}
   */
  window.SelHub.safeCoach = function(opts) {
    var msg = opts.studentMessage;
    var callGemini = opts.callGemini;
    var onSafetyFlag = opts.onSafetyFlag; // THE KEY: connects to handleAiSafetyFlag
    var toolId = opts.toolId || 'sel';
    var band = opts.band || 'elementary';
    var codename = opts.codename || 'student';
    var history = opts.conversationHistory || [];

    if (!msg) {
      return Promise.resolve({ response: 'Unable to connect right now.', tier: 0, showCrisis: false });
    }

    // The regex-based check (SafetyContentChecker) is LOCAL — it must run
    // whether or not the AI is reachable. It used to sit below an early
    // !callGemini return, so with the AI off a crisis message got no safety
    // channel at all.
    var checker = (window.__alloShared && window.__alloShared.SafetyContentChecker) || window.SafetyContentChecker || null;
    var regexFlags = [];
    if (checker && checker.check) {
      try { regexFlags = checker.check(msg) || []; } catch (_) { regexFlags = []; }
      regexFlags.forEach(function(f) {
        if (onSafetyFlag) onSafetyFlag(Object.assign({}, f, { source: 'sel_' + toolId, timestamp: new Date().toISOString() }));
      });
    }
    var regexCritical = regexFlags.some(function(f) { return f.severity === 'critical'; });
    var crisisText = function() {
      return '\n\n⚠️ I want to make sure you’re safe. '
        + (band === 'elementary'
          ? 'Please talk to a trusted adult — a teacher, school counselor, parent, or any grown-up you trust. If you’re in danger right now, tell an adult immediately.'
          : 'If you’re in crisis: 988 Suicide & Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), or talk to a trusted adult at your school.')
        + ' You don’t have to handle this alone.';
    };

    if (!callGemini) {
      // No AI at all: the local regex check is the only signal. A critical hit
      // still gets the full crisis response — never a cheery dead-end.
      if (regexCritical) {
        _flagLog.push({ time: new Date().toISOString(), tool: toolId, tier: 3, category: 'regex_critical' });
        try { window.SelHub.showCrisisModal({ toolName: toolId, contentSnippet: msg }); } catch (_) { /* modal best-effort */ }
        return Promise.resolve({ response: 'Unable to connect right now.' + crisisText(), tier: 3, showCrisis: true });
      }
      return Promise.resolve({ response: 'Unable to connect right now.', tier: 0, showCrisis: false });
    }

    // Run coach + safety assessment in parallel
    return Promise.all([
      callGemini(opts.coachPrompt, false).catch(function() { return null; }),
      window.SelHub.assessSafety(msg, band, toolId, callGemini)
    ]).then(function(results) {
      var response = results[0];
      var safety = results[1];

      if (!response) {
        response = 'I\u2019m having trouble connecting right now. But I\u2019m glad you\u2019re here.';
      }

      // Outage honesty: "couldn't check" is not "checked: safe". If the AI
      // triage was unreachable, the local regex check still stands - a
      // critical regex hit escalates to the full Tier-3 crisis response; and
      // either way the student is told the check-in didn't run (with
      // resources) instead of silently nothing.
      if (safety.unassessed) {
        if (regexCritical) {
          safety = { tier: 3, unassessed: true, rationale: 'Crisis keywords detected while the AI safety assessment was unavailable', category: 'self_harm' };
        } else {
          response += '\n\n(My safety check-in could not run just now. If anything feels unsafe or too big, please tell a trusted adult'
            + (band === 'elementary' ? '.' : ' - or call or text 988.') + ')';
        }
      }

      // Tier 2+: create flag (no transcript retention — modal owns snippet)
      if (safety.tier >= 2 && onSafetyFlag) {
        var transcriptId = 'sel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

        // Push flag through the SAME pipeline as persona/adventure/socratic.
        // Educators with a configured counter endpoint still see the event;
        // we just no longer cache the conversation text alongside it.
        onSafetyFlag({
          category: 'ai_' + (safety.category || 'concerning'),
          match: safety.rationale || 'SEL coach safety concern',
          severity: safety.tier >= 3 ? 'critical' : 'medium',
          source: 'sel_' + toolId,
          context: msg.substring(0, 100),
          timestamp: new Date().toISOString(),
          aiGenerated: true,
          confidence: safety.tier >= 3 ? 0.9 : 0.7,
          tier: safety.tier,
          transcriptId: transcriptId
        });

        // Log for session audit
        _flagLog.push({ time: new Date().toISOString(), tool: toolId, tier: safety.tier, category: safety.category });
      }

      // Tier 3: append crisis info AND show the blocking modal.
      if (safety.tier >= 3) {
        response += '\n\n\u26A0\uFE0F I want to make sure you\u2019re safe. '
          + (band === 'elementary'
            ? 'Please talk to a trusted adult \u2014 a teacher, school counselor, parent, or any grown-up you trust. If you\u2019re in danger right now, tell an adult immediately.'
            : 'If you\u2019re in crisis: 988 Suicide & Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), or talk to a trusted adult at your school.')
          + ' You don\u2019t have to handle this alone.';
        try {
          window.SelHub.showCrisisModal({ toolName: toolId, contentSnippet: msg });
        } catch (_) { /* swallow \u2014 modal is best-effort */ }
      }

      return { response: response, tier: safety.tier, showCrisis: safety.tier >= 3 };
    });
  };

  // ══════════════════════════════════════════════════════════════
  // ── Crisis Resources Component ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.renderCrisisResources = function(h, band) {
    return h('div', { role: 'alert', 'aria-live': 'assertive', style: { background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '12px', padding: '14px', marginTop: '10px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
        h('span', { style: { fontSize: '18px' } }, '\u26A0\uFE0F'),
        h('span', { style: { fontSize: '13px', fontWeight: 700, color: '#991b1b' } }, 'You matter. Help is available.')
      ),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#7f1d1d' } },
        h('div', null, '\uD83D\uDCDE 988 Suicide & Crisis Lifeline \u2014 call or text 988'),
        h('div', null, '\uD83D\uDCF1 Crisis Text Line \u2014 text HOME to 741741'),
        h('div', null, '\uD83C\uDFEB Talk to a trusted adult at your school')
      )
    );
  };

  // Fast synchronous safety check for use in Rehearse / role-play tabs
  // where the student types directly to a multi-turn AI. Unlike safeCoach
  // (which is async + makes an extra LLM call for nuanced assessment),
  // this is a pure regex check via SafetyContentChecker so it can gate
  // the AI's response without latency.
  //
  // Returns: { action: 'block' | 'nudge' | 'continue', severity, flag }
  //   - 'block' → caller should NOT send the message to the AI. Append a
  //     coach-style break-character response and surface crisis resources.
  //   - 'nudge' → AI turn can proceed. Caller may append a soft "if this
  //     is close to real, talk to a trusted adult" reminder after.
  //   - 'continue' → no safety signal. Proceed normally.
  //
  // Also fires onSafetyFlag (writes to localStorage via the same pipeline
  // as safeCoach), so the flag is visible to a hosting teacher in live
  // sessions.
  window.SelHub.safeRehearseCheck = function(message, opts) {
    opts = opts || {};
    var result = { action: 'continue', severity: 'none', flag: null };
    if (!message || typeof message !== 'string') return result;
    var checker = (window.__alloShared && window.__alloShared.SafetyContentChecker)
      || window.SafetyContentChecker || null;
    if (!checker || !checker.check) return result;
    var flags = checker.check(message);
    if (!flags || flags.length === 0) return result;
    // Find the most severe flag.
    var rank = { low: 1, medium: 2, high: 3, critical: 4 };
    var top = flags.reduce(function(acc, f) {
      return (rank[f.severity] || 0) > (rank[acc.severity] || 0) ? f : acc;
    }, flags[0]);
    result.flag = top;
    result.severity = top.severity;
    // Fire the flag through the same pipeline as safeCoach / adventure /
    // socratic. In solo mode this writes to localStorage only; in live
    // session the teacher dashboard can see it.
    if (opts.onSafetyFlag) {
      try {
        opts.onSafetyFlag(Object.assign({}, top, {
          source: 'sel_rehearse_' + (opts.toolId || 'unknown'),
          context: message.substring(0, 100),
          aiGenerated: false
        }));
      } catch (_) { /* swallow */ }
    }
    // Map severity to action.
    if (top.severity === 'critical') {
      result.action = 'block';
    } else if (top.severity === 'high') {
      result.action = 'nudge';
    } else {
      result.action = 'continue';
    }
    return result;
  };

  // Coach-style break-character response shown in the chat when
  // safeRehearseCheck returns 'block'. Single source of truth so the
  // 5 Rehearse tabs all show the same trustworthy text.
  window.SelHub.rehearseBreakCharacterText = function(severity) {
    return 'Hey, I want to pause the rehearsal for a second. What you just typed sounds heavy, and your wellbeing matters more than the practice. If any of this is real for you right now, please reach out to a trusted adult (a parent, teacher, school counselor) or one of the crisis lines below. You are not alone in this.';
  };

  // Conditional, honest disclosure about what actually happens with the
  // conversation. Two past versions of this copy were each misleading:
  // "this space is monitored for your safety" over-promised in solo mode,
  // and "this conversation stays on your device" under-disclosed — the
  // student's words are sent to the AI service to generate replies, and the
  // chat is saved with the project. This version states both, in both modes.
  //   Solo/Canvas: words go to the AI for replies; saved with your project on
  //     this device; NO adult is notified automatically; crisis words surface
  //     help resources.
  //   Live session (non-Canvas): same, plus saved/submitted work is teacher-
  //     visible and serious safety flags raise a count-alert on the teacher
  //     dashboard.
  window.SelHub.renderSafetyDisclosure = function(h, band, activeSessionCode) {
    var live = _liveFlagsReachTeacher(activeSessionCode);
    var body = live
      ? 'Your teacher is hosting a live session. Anything you save or submit here can be seen by them, and serious safety concerns raise an alert on their dashboard (an alert, not your words). Your words are sent to the AI service to write its replies. If something serious comes up, help resources appear right away. For real safety concerns, please talk to a trusted adult.'
      : 'Your words are sent to the AI service to write its replies, and your conversation is saved with your project on this device. No adult is notified automatically. If something serious comes up, help resources appear right away. For real safety concerns, please talk to a trusted adult.';
    return h('p', {
      style: { fontSize: '11px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.5 }
    }, body);
  };

  // Always-on resource strip for tools that touch sensitive content.
  // Quieter than renderCrisisResources (no role="alert" / aria-live) so screen
  // readers don't announce on every render. Use as a persistent footer.
  window.SelHub.renderResourceFooter = function(h, band) {
    var isYoung = band === 'elementary';
    return h('div', {
      role: 'complementary',
      'aria-label': 'Crisis support resources',
      style: { background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 12, padding: '10px 14px', marginTop: 16, fontSize: 12, color: '#7c2d12' }
    },
      h('div', { style: { fontWeight: 700, marginBottom: 4 } }, isYoung ? 'You\u2019re not alone. Help is here:' : 'You\u2019re not alone. If you need help, reach out:'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px' } },
        !isYoung && h('span', null, '\uD83D\uDCDE 988 (call or text)'),
        !isYoung && h('span', null, '\uD83D\uDCF1 Text HOME to 741741'),
        !isYoung && h('span', null, '\uD83C\uDF08 Trevor (LGBTQ+): 1-866-488-7386'),
        h('span', null, '\uD83C\uDFEB Trusted adult at school')
      )
    );
  };

  window.SelHub.getSessionFlagLog = function() { return _flagLog.slice(); };

  // ══════════════════════════════════════════════════════════════
  // ── Print Packet Helper ──
  // Renders a clean printable artifact (calm plans, action plans,
  // weekly summaries, etc.) in a new window. Intended for take-home
  // use: students bring the printout to a counselor, parent, or IEP
  // meeting.
  //
  // opts: {
  //   title: string,
  //   subtitle?: string,
  //   sections: [{ heading, items?: string[], paragraphs?: string[] }]
  // }
  // ══════════════════════════════════════════════════════════════

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  window.SelHub.printDoc = function(opts) {
    opts = opts || {};
    var w;
    try { w = window.open('', '_blank', 'width=760,height=920'); } catch (e) {}
    if (!w) { alert('Please allow pop-ups to print this. Then click the button again.'); return; }

    var sectionsHtml = (opts.sections || []).map(function(sec) {
      var inner = '';
      if (sec.paragraphs && sec.paragraphs.length) {
        inner += sec.paragraphs.map(function(p) { return '<p>' + _esc(p) + '</p>'; }).join('');
      }
      if (sec.items && sec.items.length) {
        inner += '<ul>' + sec.items.map(function(it) { return '<li>' + _esc(it) + '</li>'; }).join('') + '</ul>';
      }
      if (!inner) inner = '<p class="sel-empty">(nothing recorded yet)</p>';
      return '<section><h2>' + _esc(sec.heading || '') + '</h2>' + inner + '</section>';
    }).join('');

    var subtitleHtml = opts.subtitle ? '<p class="sel-sub">' + _esc(opts.subtitle) + '</p>' : '';
    var dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + _esc(opts.title || 'Print') + '</title>'
      + '<style>'
      + 'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;padding:40px;max-width:720px;margin:auto;line-height:1.55}'
      + 'h1{font-size:24px;margin:0 0 4px}'
      + '.sel-sub{color:#475569;margin:0 0 20px;font-size:14px}'
      + 'h2{font-size:15px;color:#1e293b;margin:22px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}'
      + 'ul{margin:6px 0 10px;padding-left:22px}'
      + 'li{margin-bottom:4px}'
      + 'p{margin:6px 0}'
      + '.sel-empty{color:#94a3b8;font-style:italic;font-size:13px}'
      + '.sel-meta{color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;margin-top:32px;padding-top:8px}'
      + '@media print{body{padding:24px}}'
      + '</style></head><body>'
      + '<h1>' + _esc(opts.title || '') + '</h1>'
      + subtitleHtml
      + sectionsHtml
      + '<div class="sel-meta">Generated ' + _esc(dateStr) + ' • AlloFlow SEL Hub</div>'
      + '</body></html>';

    w.document.write(html);
    w.document.close();
    setTimeout(function() { try { w.focus(); w.print(); } catch (e) {} }, 250);
  };

  // ══════════════════════════════════════════════════════════════
  // ── Client-side Crisis Scanner ──
  // Pure regex, no remote config, no model call. Run on every
  // student text submission (journal, reflection, story, chat-style
  // input) BEFORE tool-specific handling. Tools call
  // SELSafety.showCrisisModal(...) when triggered.
  // ══════════════════════════════════════════════════════════════

  var _CRISIS_TERMS = /\b(suicide|suicidal|kill myself|killing myself|end my life|ending my life|want to die|wanna die|don'?t want to (?:live|be here)|hurt myself|hurting myself|self.?harm|cut myself|cutting myself|overdose|no reason to live|better off dead|being abused|he hits me|she hits me|they hit me|touched me)\b/i;

  // Deflectors run against the 30 chars immediately preceding the match
  // PLUS the match itself, so phrases like "gonna kill this homework" or
  // "dying laughing" don't falsely trigger.
  var _CRISIS_DEFLECT = /(kill that|kill this|killing it|gonna kill .*(homework|test|game|level|boss|workout|it)|dying laughing|dying of (laughter|boredom))/i;

  window.SelHub.scanForCrisis = function(text) {
    var out = { triggered: false, matchedTerm: null };
    if (!text || typeof text !== 'string') return out;
    var m = _CRISIS_TERMS.exec(text);
    if (!m) return out;
    var start = Math.max(0, m.index - 30);
    var window_ = text.substring(start, m.index + m[0].length);
    if (_CRISIS_DEFLECT.test(window_)) return out;
    out.triggered = true;
    out.matchedTerm = m[0];
    return out;
  };

  // ══════════════════════════════════════════════════════════════
  // ── Crisis Modal (blocking, accessible) ──
  // Single public entry point for every tool. The modal owns the
  // snippet for the lifetime of the modal only. No persistence.
  // ══════════════════════════════════════════════════════════════

  function _crisisStyles() {
    if (document.getElementById('sel-crisis-modal-style')) return;
    var st = document.createElement('style');
    st.id = 'sel-crisis-modal-style';
    st.textContent = ''
      + '.sel-cf-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.55);'
      + 'display:flex;align-items:center;justify-content:center;z-index:2147483600;'
      + 'padding:16px;animation:sel-cf-fade 160ms ease-out}'
      + '.sel-cf-card{background:#fff;border-radius:18px;max-width:480px;width:100%;'
      + 'padding:24px;box-shadow:0 24px 60px rgba(15,23,42,0.35);'
      + 'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1e293b;'
      + 'animation:sel-cf-pop 180ms ease-out;max-height:90vh;overflow-y:auto}'
      + '.sel-cf-heart{display:block;margin:0 auto 10px;width:36px;height:36px;color:#64748b}'
      + '.sel-cf-title{font-size:17px;font-weight:700;line-height:1.4;margin:0 0 12px;text-align:center;color:#0f172a}'
      + '.sel-cf-body{font-size:14px;line-height:1.6;margin:0 0 18px;color:#334155}'
      + '.sel-cf-btn{display:block;width:100%;box-sizing:border-box;padding:13px 16px;'
      + 'border-radius:12px;border:none;font-size:14px;font-weight:600;cursor:pointer;'
      + 'text-align:center;text-decoration:none;margin-bottom:10px;line-height:1.4;'
      + 'font-family:inherit}'
      + '.sel-cf-btn-primary{background:#2563eb;color:#fff;box-shadow:0 2px 8px rgba(37,99,235,0.25)}'
      + '.sel-cf-btn-primary:focus{outline:3px solid #93c5fd;outline-offset:2px}'
      + '.sel-cf-btn-secondary{background:#e0f2fe;color:#075985;border:1px solid #bae6fd}'
      + '.sel-cf-btn-secondary:focus{outline:3px solid #7dd3fc;outline-offset:2px}'
      + '.sel-cf-btn-save{background:#f1f5f9;color:#1e293b;border:1px solid #cbd5e1}'
      + '.sel-cf-btn-save:focus{outline:3px solid #94a3b8;outline-offset:2px}'
      + '.sel-cf-btn-close{background:transparent;color:#475569;text-decoration:underline;'
      + 'padding:10px 16px;font-weight:500}'
      + '.sel-cf-btn-close:focus{outline:2px solid #64748b;outline-offset:2px;border-radius:6px}'
      + '.sel-cf-tertiary{font-size:13px;line-height:1.6;color:#475569;background:#f8fafc;'
      + 'border-radius:10px;padding:12px 14px;margin:0 0 12px}'
      + '.sel-cf-sub{font-size:12px;color:#94a3b8;text-align:center;margin:6px 0 0;line-height:1.5}'
      + '.sel-cf-btn-sub{display:block;font-size:11px;font-weight:400;opacity:0.85;margin-top:3px}'
      + '@keyframes sel-cf-fade{from{opacity:0}to{opacity:1}}'
      + '@keyframes sel-cf-pop{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}'
      + '@media (prefers-reduced-motion: reduce){'
      + '  .sel-cf-overlay,.sel-cf-card{animation:none}'
      + '}'
      + '@media (max-width:520px){.sel-cf-card{padding:20px}}';
    document.head.appendChild(st);
  }

  function _downloadSnippet(toolName, contentSnippet) {
    try {
      var payload = {
        timestamp: new Date().toISOString(),
        toolName: toolName || 'AlloFlow SEL Tool',
        contentSnippet: String(contentSnippet || '').substring(0, 500)
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var d = new Date();
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      a.href = url;
      a.download = 'my-note-' + yyyy + '-' + mm + '-' + dd + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        try { URL.revokeObjectURL(url); } catch (_) {}
        try { a.parentNode && a.parentNode.removeChild(a); } catch (_) {}
      }, 0);
    } catch (e) {
      // Best-effort: don't let a download error block the rest of the modal.
    }
  }

  window.SelHub.showCrisisModal = function(context) {
    context = context || {};
    var toolName = context.toolName || 'AlloFlow SEL Tool';
    // Transient — overwritten each call, never persisted. The modal closure
    // is the only consumer.
    _lastSnippet = String(context.contentSnippet || '').substring(0, 500);

    // Guard: only one modal at a time. If one is open, reuse it.
    if (_activeCrisisModal && _activeCrisisModal.overlay && document.body.contains(_activeCrisisModal.overlay)) {
      return _activeCrisisModal;
    }

    if (typeof document === 'undefined' || !document.body) return null;
    _crisisStyles();

    var triggerEl = (document.activeElement && document.activeElement !== document.body) ? document.activeElement : null;

    var overlay = document.createElement('div');
    overlay.className = 'sel-cf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cf-title');

    var card = document.createElement('div');
    card.className = 'sel-cf-card';

    // Small heart outline — calm palette, no alarm icon.
    card.insertAdjacentHTML('beforeend',
      '<svg class="sel-cf-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78'
      + ' l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
    );

    var title = document.createElement('h2');
    title.id = 'cf-title';
    title.className = 'sel-cf-title';
    title.setAttribute('aria-live', 'polite');
    title.textContent = 'You wrote something that sounds really heavy. I want to make sure you’re okay.';
    card.appendChild(title);

    var body = document.createElement('p');
    body.className = 'sel-cf-body';
    body.textContent = 'What you’re feeling is real, and you don’t have to handle it alone. The people below are trained to listen — they won’t judge you, and you don’t need a reason to reach out. If you can, tell an adult you trust today, even if it feels hard. You matter, and this moment is not the whole story.';
    card.appendChild(body);

    // Primary: 988 (call + text variant on a second line)
    var btn988 = document.createElement('a');
    btn988.className = 'sel-cf-btn sel-cf-btn-primary';
    btn988.href = 'tel:988';
    btn988.innerHTML = 'Call 988 — Suicide &amp; Crisis Lifeline'
      + '<span class="sel-cf-btn-sub">or tap here to text instead: '
      + '<a href="sms:988" style="color:inherit;text-decoration:underline">Text 988</a></span>';
    card.appendChild(btn988);

    // Secondary: Crisis Text Line
    var btn741 = document.createElement('a');
    btn741.className = 'sel-cf-btn sel-cf-btn-secondary';
    btn741.href = 'sms:741741?&body=HOME';
    btn741.textContent = 'Text HOME to 741741 — Crisis Text Line';
    card.appendChild(btn741);

    // Tertiary text (not a link)
    var tertiary = document.createElement('p');
    tertiary.className = 'sel-cf-tertiary';
    tertiary.textContent = 'Tell a trusted adult right now — a parent, teacher, coach, family friend, or anyone who has your back.';
    card.appendChild(tertiary);

    // Save button
    var btnSave = document.createElement('button');
    btnSave.type = 'button';
    btnSave.className = 'sel-cf-btn sel-cf-btn-save';
    btnSave.innerHTML = 'Save what I wrote so I can show someone'
      + '<span class="sel-cf-btn-sub">Downloads a small file to your device. Nothing is sent anywhere.</span>';
    btnSave.addEventListener('click', function() {
      _downloadSnippet(toolName, _lastSnippet);
    });
    card.appendChild(btnSave);

    // Close button
    var btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'sel-cf-btn sel-cf-btn-close';
    btnClose.textContent = 'Close this — I’m okay';
    card.appendChild(btnClose);

    var micro = document.createElement('p');
    micro.className = 'sel-cf-sub';
    micro.textContent = 'If that changes in the next few minutes, 988 is always there.';
    card.appendChild(micro);

    overlay.appendChild(card);

    // Focusable order: 988 → 741741 → Save → Close
    var focusables = [btn988, btn741, btnSave, btnClose];

    function close() {
      try { document.removeEventListener('keydown', onKey, true); } catch (_) {}
      try { overlay.parentNode && overlay.parentNode.removeChild(overlay); } catch (_) {}
      _lastSnippet = ''; // drop the transient snippet immediately on dismiss
      _activeCrisisModal = null;
      if (triggerEl && typeof triggerEl.focus === 'function') {
        try { triggerEl.focus(); } catch (_) {}
      }
    }

    btnClose.addEventListener('click', close);

    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        close(); // ESC routes through the "I'm okay" dismiss path, not silent close.
        return;
      }
      if (e.key === 'Tab' || e.keyCode === 9) {
        // Trap focus within the four interactive elements.
        var current = document.activeElement;
        var idx = focusables.indexOf(current);
        if (idx === -1) {
          e.preventDefault();
          focusables[0].focus();
          return;
        }
        var nextIdx;
        if (e.shiftKey) {
          nextIdx = idx === 0 ? focusables.length - 1 : idx - 1;
        } else {
          nextIdx = idx === focusables.length - 1 ? 0 : idx + 1;
        }
        e.preventDefault();
        focusables[nextIdx].focus();
      }
    }
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(overlay);
    // Initial focus: primary action.
    setTimeout(function() { try { btn988.focus(); } catch (_) {} }, 0);

    _activeCrisisModal = { overlay: overlay, close: close };
    return _activeCrisisModal;
  };

  // Backwards-compatible alias matching the design's "SELSafety" namespace.
  window.SELSafety = window.SELSafety || {};
  window.SELSafety.showCrisisModal = window.SelHub.showCrisisModal;
  window.SELSafety.scanForCrisis = window.SelHub.scanForCrisis;

  console.log('[SelHub] Safety layer v1.2 loaded (crisis modal + scanForCrisis)');
})();
