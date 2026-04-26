// ═══════════════════════════════════════════════════════════════
// sel_safety_layer.js — SEL Hub Safety Infrastructure (v1.1)
//
// Canvas-compatible: NO localStorage dependency for flags/transcripts.
// Uses in-memory storage + integrates with the existing safety pipeline:
//   - SafetyContentChecker (regex-based immediate checking)
//   - handleAiSafetyFlag callback (feeds aiSafetyFlags state)
//   - syncProgressToFirestore (60s pipeline to teacher dashboard)
//
// Architecture:
//   - Consent: in-memory per session (re-shown each Canvas session = more protective)
//   - Assessment: triangulated AI evaluation (2 primary + 1 confirmation)
//   - Flags: pushed through ctx.onSafetyFlag callback (same path as persona/adventure)
//   - Transcripts: in-memory Map, accessible via ctx for teacher dashboard
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
  var _transcriptStore = {}; // flagId → { messages, timestamp }
  var _flagLog = [];         // session-scoped audit log

  // ══════════════════════════════════════════════════════════════
  // ── Consent ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.hasCoachConsent = function() { return _consentGiven; };
  window.SelHub.giveCoachConsent = function() { _consentGiven = true; };

  /**
   * Render informed consent screen.
   * @param {function} h - React.createElement
   * @param {string} band - elementary/middle/high
   * @param {function} onConsent - callback
   */
  window.SelHub.renderConsentScreen = function(h, band, onConsent) {
    var isYoung = band === 'elementary';
    return h('div', { style: { padding: '24px', maxWidth: '520px', margin: '0 auto', textAlign: 'center' } },
      h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '\uD83D\uDD12'),
      h('h3', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 12px' } }, 'Before We Start'),
      h('div', { style: { background: '#f0f9ff', borderRadius: '14px', padding: '18px', border: '1px solid #bae6fd', textAlign: 'left', marginBottom: '16px' } },
        h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#1e293b', margin: '0 0 10px' } },
          isYoung
            ? 'This is a safe space to talk about how you feel. What you write here is private \u2014 but there is one important exception.'
            : 'What you share here is yours. We take your privacy seriously. However, there is one important exception.'
        ),
        h('div', { style: { background: '#fffbeb', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b', marginBottom: '10px' } },
          h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#78350f', margin: 0 } },
            isYoung
              ? 'If what you share tells us you might be in danger, or someone is seriously hurting you or someone else, a caring adult at your school will be told so they can help. They may see what you wrote so they understand how to help you best.'
              : 'If what you share indicates serious danger \u2014 to yourself or others \u2014 a trusted adult at your school will be notified and may access what you wrote. This applies to situations involving physical harm, weapons, self-harm, or abuse.'
          )
        ),
        h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#475569', margin: 0 } },
          isYoung
            ? 'This is the same rule school counselors follow. It exists because your safety matters more than anything else.'
            : 'This follows the same confidentiality standard as school counseling. We tell you now so you can make an informed choice about what to share.'
        )
      ),
      h('button', {
        onClick: onConsent,
        'aria-label': 'I understand the safety guidelines',
        style: { padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
      }, isYoung ? 'I Understand \u2014 Let\u2019s Talk' : 'I Understand the Guidelines'),
      h('p', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '10px' } }, 'This appears once per session for your awareness.')
    );
  };

  // ══════════════════════════════════════════════════════════════
  // ── Triangulated Safety Assessment ──
  // ══════════════════════════════════════════════════════════════

  function parseTier(response) {
    if (!response) return 0;
    var upper = response.toUpperCase();
    if (/TIER_3|CRITICAL/.test(upper)) return 3;
    if (/TIER_2|CONCERN/.test(upper)) return 2;
    if (/TIER_1|MONITOR/.test(upper)) return 1;
    return 0;
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

    return Promise.all([
      callGemini(prompt1, true).catch(function() { return 'TIER_0\nUnavailable'; }),
      callGemini(prompt2, true).catch(function() { return 'SAFE\nUnavailable'; })
    ]).then(function(results) {
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
        var cu = (conf || '').toUpperCase();
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
  // ── Transcript Store (in-memory, session-scoped) ──
  // ══════════════════════════════════════════════════════════════

  window.SelHub.storeTranscript = function(flagId, messages) {
    _transcriptStore[flagId] = { messages: messages, storedAt: new Date().toISOString() };
  };

  window.SelHub.getTranscript = function(flagId) {
    return _transcriptStore[flagId] || null;
  };

  window.SelHub.getAllTranscripts = function() { return _transcriptStore; };

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

    if (!callGemini || !msg) {
      return Promise.resolve({ response: 'Unable to connect right now.', tier: 0, showCrisis: false });
    }

    // Also run regex-based check via SafetyContentChecker (if available)
    var checker = (window.__alloShared && window.__alloShared.SafetyContentChecker) || null;
    if (checker && checker.check) {
      var regexFlags = checker.check(msg);
      regexFlags.forEach(function(f) {
        if (onSafetyFlag) onSafetyFlag(Object.assign({}, f, { source: 'sel_' + toolId, timestamp: new Date().toISOString() }));
      });
    }

    // Run coach + safety assessment in parallel
    return Promise.all([
      callGemini(opts.coachPrompt, true).catch(function() { return null; }),
      window.SelHub.assessSafety(msg, band, toolId, callGemini)
    ]).then(function(results) {
      var response = results[0];
      var safety = results[1];

      if (!response) {
        response = 'I\u2019m having trouble connecting right now. But I\u2019m glad you\u2019re here.';
      }

      // Tier 2+: create flag and store transcript
      if (safety.tier >= 2 && onSafetyFlag) {
        var transcriptId = 'sel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

        // Store transcript in memory for this session
        var transcript = history.concat([
          { role: 'user', text: msg },
          { role: 'coach', text: response }
        ]);
        window.SelHub.storeTranscript(transcriptId, transcript);

        // Push flag through the SAME pipeline as persona/adventure/socratic
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

      // Tier 3: append crisis info
      if (safety.tier >= 3) {
        response += '\n\n\u26A0\uFE0F I want to make sure you\u2019re safe. '
          + (band === 'elementary'
            ? 'Please talk to a trusted adult \u2014 a teacher, school counselor, parent, or any grown-up you trust. If you\u2019re in danger right now, tell an adult immediately.'
            : 'If you\u2019re in crisis: 988 Suicide & Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), or talk to a trusted adult at your school.')
          + ' You don\u2019t have to handle this alone.';
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

  window.SelHub.getSessionFlagLog = function() { return _flagLog.slice(); };

  console.log('[SelHub] Safety layer v1.1 loaded (Canvas-compatible, in-memory)');
})();
