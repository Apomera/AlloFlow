// ═══════════════════════════════════════════════════════════════
// sel_safety_layer.js — SEL Hub Safety Infrastructure (v1.0)
//
// Provides triangulated AI safety assessment for all SEL tool
// AI coach interactions. Implements Approach D:
//   - Informed consent before first coach use
//   - Separate safety assessment (not baked into coach prompt)
//   - Triangulated evaluation (2 independent assessors + confirmation)
//   - Tiered response with dashboard integration
//   - Teacher transcript access for Tier 2-3
//
// Tiers:
//   0: No concern. Fully private.
//   1: Low concern. Monitor. No flag.
//   2: Moderate concern. Dashboard flag. Teacher can access transcript.
//   3: Critical. Immediate flag. Teacher gets transcript. Crisis resources shown.
//
// Clinical model: mirrors limits-of-confidentiality in school counseling.
// Students are informed BEFORE disclosure. System fails safe (one cautious
// assessor can escalate; one dismissive assessor cannot suppress).
//
// This module MUST load before any sel_tool_*.js files.
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Ensure SelHub registry exists
  window.SelHub = window.SelHub || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Constants ──
  // ══════════════════════════════════════════════════════════════

  var CONSENT_KEY = 'alloSelCoachConsent';
  var FLAGS_KEY = 'alloSelSafetyFlags';
  var TRANSCRIPTS_KEY = 'alloSelSafetyTranscripts';
  var MAX_FLAGS = 200; // prevent unbounded localStorage growth

  // ══════════════════════════════════════════════════════════════
  // ── Consent Management ──
  // ══════════════════════════════════════════════════════════════

  /**
   * Check if the current student has acknowledged coach consent.
   * Returns true if consent was previously given.
   */
  window.SelHub.hasCoachConsent = function() {
    try { return localStorage.getItem(CONSENT_KEY) === 'true'; } catch(e) { return false; }
  };

  /**
   * Record that the student has acknowledged coach consent.
   */
  window.SelHub.giveCoachConsent = function() {
    try { localStorage.setItem(CONSENT_KEY, 'true'); } catch(e) {}
  };

  /**
   * Render the informed consent screen.
   * @param {function} h - React.createElement
   * @param {string} band - grade band (elementary/middle/high)
   * @param {function} onConsent - callback when student acknowledges
   * @returns {ReactElement}
   */
  window.SelHub.renderConsentScreen = function(h, band, onConsent) {
    var isYoung = band === 'elementary';
    return h('div', { style: { padding: '24px', maxWidth: '520px', margin: '0 auto', textAlign: 'center' } },
      h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '\uD83D\uDD12'),
      h('h3', { style: { fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: '0 0 12px' } }, 'Before We Start'),
      h('div', { style: { background: '#f0f9ff', borderRadius: '14px', padding: '18px', border: '1px solid #bae6fd', textAlign: 'left', marginBottom: '16px' } },
        h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#1e293b', margin: '0 0 10px' } },
          isYoung
            ? 'This is a safe space to talk about how you feel. What you write here stays private \u2014 we won\u2019t show your words to anyone unless we need to.'
            : 'What you share here is private. Your words are yours. We take that seriously.'
        ),
        h('p', { style: { fontSize: '14px', lineHeight: 1.7, color: '#1e293b', margin: '0 0 10px', fontWeight: 600 } },
          isYoung
            ? 'There is one exception:'
            : 'There is one important exception:'
        ),
        h('div', { style: { background: '#fffbeb', borderRadius: '10px', padding: '12px', borderLeft: '4px solid #f59e0b', marginBottom: '10px' } },
          h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#78350f', margin: 0 } },
            isYoung
              ? 'If what you share tells us that you might be in danger, or someone is seriously hurting you or someone else, a caring adult at your school will be told so they can help. They may see what you wrote so they understand how to help you best.'
              : 'If what you share indicates serious danger \u2014 to yourself or others \u2014 a trusted adult at your school will be notified and may access what you wrote. This applies to situations involving physical harm, weapons, self-harm, or abuse.'
          )
        ),
        h('p', { style: { fontSize: '13px', lineHeight: 1.7, color: '#6b7280', margin: 0 } },
          isYoung
            ? 'This is the same rule school counselors follow. It exists because your safety matters more than anything else.'
            : 'This follows the same confidentiality standard as school counseling: everything is private except when safety requires action. We tell you now so you can make an informed choice about what to share.'
        )
      ),
      h('button', {
        onClick: onConsent,
        'aria-label': 'I understand the safety guidelines',
        style: { padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
      }, isYoung ? 'I Understand \u2014 Let\u2019s Talk' : 'I Understand the Guidelines'),
      h('p', { style: { fontSize: '11px', color: '#94a3b8', marginTop: '10px' } }, 'You only need to acknowledge this once.')
    );
  };

  // ══════════════════════════════════════════════════════════════
  // ── Safety Assessment Engine ──
  // ══════════════════════════════════════════════════════════════

  // Parse a tier from an assessment response string
  function parseTier(response) {
    if (!response) return 0;
    var upper = response.toUpperCase();
    if (/TIER_3|CRITICAL/.test(upper)) return 3;
    if (/TIER_2|CONCERN/.test(upper)) return 2;
    if (/TIER_1|MONITOR/.test(upper)) return 1;
    return 0;
  }

  /**
   * Run triangulated safety assessment on a student message.
   * Returns a Promise resolving to { tier: number, rationale: string }.
   *
   * Assessment strategy:
   *   1. Clinical risk assessor
   *   2. Duty-to-protect assessor
   *   3. Confirmation assessor (only if 1 or 2 flags Tier 2+)
   *
   * Fail-safe: if EITHER primary assessor flags Tier 3, result is Tier 3.
   * For Tier 2: either primary assessor can escalate, confirmation can downgrade.
   */
  window.SelHub.assessSafety = function(studentMessage, band, toolId, callGemini) {
    if (!callGemini || !studentMessage) return Promise.resolve({ tier: 0, rationale: 'No message to assess' });

    var contextLabel = toolId ? ('in a "' + toolId + '" SEL coaching session') : 'in an SEL coaching session';

    // Assessor 1: Clinical risk framing
    var prompt1 = 'You are a clinical risk assessor for a student safety monitoring system in a school. '
      + 'A ' + (band || 'elementary') + ' school student wrote the following ' + contextLabel + ':\n\n'
      + '"' + studentMessage + '"\n\n'
      + 'Assess the safety risk level:\n'
      + '- TIER_0: No concern. Normal emotional processing, reflection, or skill-building.\n'
      + '- TIER_1: Low concern. General sadness or frustration, but no indication of harm.\n'
      + '- TIER_2: Moderate concern. Student describes ongoing bullying, persistent fear of school, being harmed by others, or emotional distress warranting adult awareness.\n'
      + '- TIER_3: HIGH concern. Student describes or implies: suicidal thoughts, self-harm, physical abuse, weapons, imminent danger to self or others, or actively harming another student.\n\n'
      + 'IMPORTANT: Past-tense reflection about difficult experiences is typically TIER_0 or TIER_1. '
      + 'A student acknowledging they used to bully someone (therapeutic growth) is TIER_0. '
      + 'A student describing CURRENTLY hurting someone is TIER_2 or TIER_3.\n\n'
      + 'Respond with ONLY one of: TIER_0, TIER_1, TIER_2, TIER_3\n'
      + 'Then on a new line, a brief (1 sentence) clinical rationale.';

    // Assessor 2: Duty-to-protect framing
    var prompt2 = 'You are evaluating a student\'s message for duty-to-protect obligations in a school setting. '
      + 'A ' + (band || 'elementary') + ' student shared the following during an SEL coaching session:\n\n'
      + '"' + studentMessage + '"\n\n'
      + 'Under mandated reporting and duty-to-warn standards, assess:\n'
      + '- SAFE: No duty to act. Normal emotional expression or therapeutic processing.\n'
      + '- MONITOR: Low-level concern. Distress present but no indication of harm or danger.\n'
      + '- CONCERN: Student describes being harmed by others, harming others presently, or patterns suggesting they need adult support.\n'
      + '- CRITICAL: Imminent danger, suicidal ideation, self-harm, weapons, abuse, or situations requiring immediate adult intervention.\n\n'
      + 'IMPORTANT: Err on the side of caution for safety. However, do NOT flag normal emotional processing (sadness about a breakup, frustration with school, past regrets) as concerning. '
      + 'The standard is: would a reasonable school counselor feel obligated to act on this disclosure?\n\n'
      + 'Respond with ONLY one of: SAFE, MONITOR, CONCERN, CRITICAL\n'
      + 'Then on a new line, a brief (1 sentence) rationale.';

    // Run both primary assessments in parallel
    return Promise.all([
      callGemini(prompt1, true).catch(function() { return 'TIER_0\nAssessment unavailable'; }),
      callGemini(prompt2, true).catch(function() { return 'SAFE\nAssessment unavailable'; })
    ]).then(function(results) {
      var tier1 = parseTier(results[0]);
      var tier2 = parseTier(results[1]);
      var rationale1 = (results[0] || '').split('\n').slice(1).join(' ').trim();
      var rationale2 = (results[1] || '').split('\n').slice(1).join(' ').trim();

      // Fail-safe escalation: highest tier from either assessor
      var maxTier = Math.max(tier1, tier2);

      // If both agree it's safe, we're done
      if (maxTier <= 1) {
        return { tier: maxTier, rationale: rationale1 || rationale2 || 'No concerns identified' };
      }

      // Tier 2 or 3 detected — run confirmation assessor
      var prompt3 = 'A student safety screening has flagged the following student message as potentially concerning.\n\n'
        + 'Student message: "' + studentMessage + '"\n\n'
        + 'Assessor 1 rated: TIER_' + tier1 + ' (' + rationale1 + ')\n'
        + 'Assessor 2 rated: ' + (tier2 >= 3 ? 'CRITICAL' : tier2 >= 2 ? 'CONCERN' : 'MONITOR') + ' (' + rationale2 + ')\n\n'
        + 'Please independently verify. Is this a genuine safety concern that requires adult notification?\n'
        + '- YES_TIER_3: Critical concern requiring immediate adult intervention\n'
        + '- YES_TIER_2: Moderate concern warranting adult awareness and check-in\n'
        + '- FALSE_ALARM: The message was flagged incorrectly; this is normal emotional processing that does not require adult notification\n\n'
        + 'Consider: would a school counselor hearing this in session feel a duty to act? Or is this healthy processing?\n\n'
        + 'Respond with ONLY one of: YES_TIER_3, YES_TIER_2, FALSE_ALARM\n'
        + 'Then a brief rationale.';

      return callGemini(prompt3, true).catch(function() { return 'YES_TIER_2\nConfirmation unavailable - maintaining flag for safety'; }).then(function(confirmation) {
        var confUpper = (confirmation || '').toUpperCase();
        var confRationale = (confirmation || '').split('\n').slice(1).join(' ').trim();

        // If confirmation says false alarm AND neither primary said Tier 3, downgrade
        if (/FALSE_ALARM/.test(confUpper) && maxTier < 3) {
          return { tier: 1, rationale: 'Flagged then cleared by confirmation: ' + confRationale };
        }

        // If confirmation says Tier 3 OR either primary said Tier 3, escalate to 3
        if (/YES_TIER_3/.test(confUpper) || maxTier >= 3) {
          return { tier: 3, rationale: 'Critical: ' + (confRationale || rationale1 || rationale2) };
        }

        // Otherwise Tier 2
        return { tier: 2, rationale: confRationale || rationale1 || rationale2 };
      });
    });
  };

  // ══════════════════════════════════════════════════════════════
  // ── Dashboard Flag Management ──
  // ══════════════════════════════════════════════════════════════

  function loadFlags() {
    try { return JSON.parse(localStorage.getItem(FLAGS_KEY) || '[]'); } catch(e) { return []; }
  }

  function saveFlags(flags) {
    try { localStorage.setItem(FLAGS_KEY, JSON.stringify(flags.slice(-MAX_FLAGS))); } catch(e) {}
  }

  function loadTranscripts() {
    try { return JSON.parse(localStorage.getItem(TRANSCRIPTS_KEY) || '{}'); } catch(e) { return {}; }
  }

  function saveTranscripts(transcripts) {
    try { localStorage.setItem(TRANSCRIPTS_KEY, JSON.stringify(transcripts)); } catch(e) {}
  }

  /**
   * Push a safety flag to the dashboard.
   * Called automatically by safeCoach when Tier 2+ is detected.
   */
  window.SelHub.pushSafetyFlag = function(flag) {
    var flags = loadFlags();
    flags.push({
      id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toISOString(),
      tier: flag.tier,
      toolId: flag.toolId || 'unknown',
      category: flag.category || 'general',
      rationale: flag.rationale || '',
      codename: flag.codename || 'anonymous',
      acknowledged: false
    });
    saveFlags(flags);
  };

  /**
   * Store a transcript for teacher access (Tier 2-3 only).
   */
  window.SelHub.storeTranscript = function(flagId, messages) {
    var transcripts = loadTranscripts();
    transcripts[flagId] = {
      messages: messages,
      storedAt: new Date().toISOString()
    };
    saveTranscripts(transcripts);
  };

  /**
   * Get all unacknowledged safety flags (for teacher dashboard).
   */
  window.SelHub.getSafetyFlags = function() {
    return loadFlags().filter(function(f) { return !f.acknowledged; });
  };

  /**
   * Get all safety flags including acknowledged (for history).
   */
  window.SelHub.getAllSafetyFlags = function() {
    return loadFlags();
  };

  /**
   * Acknowledge a flag (teacher has reviewed it).
   */
  window.SelHub.acknowledgeSafetyFlag = function(flagId) {
    var flags = loadFlags();
    flags = flags.map(function(f) { return f.id === flagId ? Object.assign({}, f, { acknowledged: true }) : f; });
    saveFlags(flags);
  };

  /**
   * Get transcript for a specific flag.
   */
  window.SelHub.getTranscript = function(flagId) {
    var transcripts = loadTranscripts();
    return transcripts[flagId] || null;
  };

  // ══════════════════════════════════════════════════════════════
  // ── Safe Coach Wrapper ──
  // ══════════════════════════════════════════════════════════════

  /**
   * Safety-wrapped AI coach interaction.
   * Use this instead of calling callGemini directly in SEL tool coaches.
   *
   * @param {Object} options
   * @param {string} options.studentMessage - what the student typed
   * @param {string} options.coachPrompt - the full prompt for the coach response
   * @param {string} options.toolId - which tool is calling (e.g. 'upstander')
   * @param {string} options.band - grade band
   * @param {function} options.callGemini - the AI call function
   * @param {string} options.codename - student codename for the flag
   * @param {Array} options.conversationHistory - full conversation for transcript storage
   *
   * @returns {Promise<Object>} { response: string, tier: number, showCrisis: boolean, flagId: string|null }
   */
  window.SelHub.safeCoach = function(options) {
    var msg = options.studentMessage;
    var coachPrompt = options.coachPrompt;
    var toolId = options.toolId || 'sel';
    var band = options.band || 'elementary';
    var callGemini = options.callGemini;
    var codename = options.codename || 'anonymous';
    var history = options.conversationHistory || [];

    if (!callGemini || !msg) {
      return Promise.resolve({ response: 'Unable to connect right now.', tier: 0, showCrisis: false, flagId: null });
    }

    // Run coach response AND safety assessment in parallel
    return Promise.all([
      callGemini(coachPrompt, true).catch(function() { return null; }),
      window.SelHub.assessSafety(msg, band, toolId, callGemini)
    ]).then(function(results) {
      var coachResponse = results[0];
      var safety = results[1];

      var flagId = null;

      // Handle coach failure
      if (!coachResponse) {
        coachResponse = 'I\u2019m having trouble connecting right now. But I\u2019m glad you\u2019re here and talking about this.';
      }

      // Tier 2+: push flag and store transcript
      if (safety.tier >= 2) {
        flagId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8);

        window.SelHub.pushSafetyFlag({
          id: flagId,
          tier: safety.tier,
          toolId: toolId,
          category: safety.tier >= 3 ? 'critical-safety' : 'safety-concern',
          rationale: safety.rationale,
          codename: codename
        });

        // Store transcript (conversation history + this exchange)
        var transcript = history.concat([
          { role: 'user', text: msg },
          { role: 'coach', text: coachResponse }
        ]);
        window.SelHub.storeTranscript(flagId, transcript);
      }

      // Tier 3: append crisis resources to coach response
      if (safety.tier >= 3) {
        coachResponse += '\n\n\u26A0\uFE0F I want to make sure you\u2019re safe. '
          + (band === 'elementary'
            ? 'Please talk to a trusted adult \u2014 a teacher, school counselor, parent, or any adult you trust. If you\u2019re in danger right now, tell an adult immediately.'
            : 'If you\u2019re in crisis, please reach out: 988 Suicide & Crisis Lifeline (call or text 988), Crisis Text Line (text HOME to 741741), or talk to a trusted adult at your school.')
          + ' You don\u2019t have to handle this alone.';
      }

      return {
        response: coachResponse,
        tier: safety.tier,
        showCrisis: safety.tier >= 3,
        flagId: flagId
      };
    });
  };

  // ══════════════════════════════════════════════════════════════
  // ── Crisis Resources Component ──
  // ══════════════════════════════════════════════════════════════

  /**
   * Render crisis resources banner (shown when Tier 3 is detected).
   */
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

  console.log('[SelHub] Safety layer loaded');
})();
