/**
 * AlloFlow Audit Remediator Module
 *
 * Closes the loop on the Curriculum Audit: parses the audit's structured
 * recommendations across 5 dimensions, maps each to a regeneration action,
 * and applies them in a confirm-before-apply modal. Optionally batched
 * Google-Search-grounded fact-check on flagged claims (default-on when
 * claims exist).
 *
 * Module export: window.AlloModules.AuditRemediator (React component).
 *
 * Props expected from the monolith host:
 *   isOpen: boolean
 *   onClose: () => void
 *   generatedContent: alignment-report history item (must have data.comprehensive)
 *   history: array of history items
 *   handleGenerate: async (type, lang, keepLoading, textOverride, configOverride, switchView) => void
 *   callGemini: async (prompt, jsonMode, useSearchGrounding, ...) => string
 *   cleanJson: (raw) => string
 *   addToast: (msg, type) => void
 *   setHistory: (updater) => void
 *   t: (key) => string
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.AuditRemediator) {
    console.log('[CDN] AuditRemediator already loaded, skipping');
    return;
  }

  var React = window.React;
  if (!React) {
    console.error('[CDN] AuditRemediator requires window.React');
    return;
  }
  var e = React.createElement;
  var useState = React.useState;
  var useMemo = React.useMemo;

  // ------------------------------------------------------------------
  // parseRecommendations: comprehensive → Action[]
  // ------------------------------------------------------------------
  // Each Action has: id, dimension, label, target (artifact type to regenerate or 'manual'),
  // configHints (data passed to handleGenerate), source (original recommendation text).
  //
  // Unparseable recommendations land in 'manual-review' bucket (target='manual').
  // ------------------------------------------------------------------

  var ENGAGEMENT_KEYWORD_MAP = [
    { re: /visual\s+organi[sz]er|graphic\s+organi[sz]er|concept\s+map|outline/i, type: 'outline' },
    { re: /adventure|interactive\s+narrative|roleplay|scenario/i, type: 'adventure' },
    { re: /sentence\s+frames?|sentence\s+stems?|sentence\s+starters?/i, type: 'sentence-frames' },
    { re: /concept\s+sort|category\s+sort|sorting\s+activity/i, type: 'concept-sort' },
    { re: /timeline|sequence|chronolog/i, type: 'timeline' },
    { re: /quiz|question|assessment|exit\s+ticket/i, type: 'quiz' },
    { re: /(image|visual|illustration|diagram|figure)/i, type: 'image' },
    { re: /simplified|leveled\s+text|adapted\s+text/i, type: 'simplified' },
    { re: /glossary|vocabulary\s+list|word\s+bank/i, type: 'glossary' },
  ];

  function actionId(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 8);
  }

  function parseEngagementGap(gap) {
    for (var i = 0; i < ENGAGEMENT_KEYWORD_MAP.length; i++) {
      if (ENGAGEMENT_KEYWORD_MAP[i].re.test(gap)) return ENGAGEMENT_KEYWORD_MAP[i].type;
    }
    return null;
  }

  function findExistingItem(history, type) {
    if (!Array.isArray(history)) return null;
    for (var i = history.length - 1; i >= 0; i--) {
      if (history[i] && history[i].type === type) return history[i];
    }
    return null;
  }

  function parseRecommendations(comprehensive, history) {
    var actions = [];
    if (!comprehensive) return actions;

    // ---- Vocabulary ----
    var vocab = comprehensive.vocabulary;
    if (vocab && vocab.llmReview) {
      var addTerms = []
        .concat(Array.isArray(vocab.llmReview.recommendations) ? vocab.llmReview.recommendations : [])
        .concat(Array.isArray(vocab.llmReview.missedTier2) ? vocab.llmReview.missedTier2 : []);
      // De-dup
      var seen = {};
      addTerms = addTerms.filter(function (t) {
        if (!t || typeof t !== 'string') return false;
        var k = t.toLowerCase().trim();
        if (seen[k]) return false; seen[k] = true; return true;
      });
      if (addTerms.length > 0) {
        var existingGlossary = findExistingItem(history, 'glossary');
        actions.push({
          id: actionId('vocab'),
          dimension: 'Vocabulary',
          icon: '📚',
          label: 'Add ' + addTerms.length + ' Tier 2/3 word' + (addTerms.length === 1 ? '' : 's') + ' to glossary',
          detail: addTerms.slice(0, 6).join(', ') + (addTerms.length > 6 ? ' …' : ''),
          target: 'glossary',
          existingItemId: existingGlossary ? existingGlossary.id : null,
          configHints: {
            glossaryCustomInstructions: 'CRITICAL: include these specific terms in the glossary: ' + addTerms.join(', ') + '. Add their definitions at the appropriate grade level.',
          },
          source: addTerms,
        });
      }
    }

    // ---- Engagement ----
    var eng = comprehensive.engagement;
    if (eng && eng.llmReview) {
      var formatGaps = Array.isArray(eng.llmReview.formatGaps) ? eng.llmReview.formatGaps : [];
      formatGaps.forEach(function (gap) {
        if (typeof gap !== 'string') return;
        var artifactType = parseEngagementGap(gap);
        if (artifactType) {
          var existing = findExistingItem(history, artifactType);
          actions.push({
            id: actionId('eng'),
            dimension: 'Engagement',
            icon: '🎯',
            label: (existing ? 'Regenerate ' : 'Generate ') + artifactType + ' to address gap',
            detail: gap,
            target: artifactType,
            existingItemId: existing ? existing.id : null,
            configHints: { customInstructions: gap },
            source: gap,
          });
        } else {
          actions.push({
            id: actionId('eng'),
            dimension: 'Engagement',
            icon: '🎯',
            label: 'Manual review',
            detail: gap,
            target: 'manual',
            source: gap,
          });
        }
      });
      // DOK assessment: if it mentions L3/L4 deficit, suggest quiz augmentation
      var dok = eng.llmReview.dokAssessment || '';
      if (/recall.heavy|skews?\s+(low|recall)|add\s+\d+\s+(application|analysis|higher|L3|L4)/i.test(dok)) {
        var existingQuiz = findExistingItem(history, 'quiz');
        actions.push({
          id: actionId('dok'),
          dimension: 'Engagement',
          icon: '🧠',
          label: 'Augment quiz with higher-DOK questions',
          detail: dok,
          target: 'quiz',
          existingItemId: existingQuiz ? existingQuiz.id : null,
          configHints: { quizCustomInstructions: 'CRITICAL: include at least 2 Depth-of-Knowledge Level 3 (Strategic Thinking) questions. ' + dok },
          source: dok,
        });
      }
    }

    // ---- Accessibility ----
    var ax = comprehensive.accessibility;
    if (ax && ax.llmReview) {
      var fixes = Array.isArray(ax.llmReview.fixes) ? ax.llmReview.fixes : [];
      fixes.forEach(function (fix) {
        if (typeof fix !== 'string') return;
        var artifactType = null;
        if (/alt\s+text|describe\s+image|image\s+description/i.test(fix)) {
          artifactType = 'image';
        } else if (/chunk|break\s+up|shorter\s+passage|paragraph/i.test(fix)) {
          artifactType = 'simplified';
        }
        if (artifactType) {
          var existing = findExistingItem(history, artifactType);
          actions.push({
            id: actionId('a11y'),
            dimension: 'Accessibility',
            icon: '♿',
            label: (existing ? 'Regenerate ' : 'Generate ') + artifactType + ' to fix accessibility',
            detail: fix,
            target: artifactType,
            existingItemId: existing ? existing.id : null,
            configHints: { customInstructions: fix },
            source: fix,
          });
        } else {
          actions.push({
            id: actionId('a11y'),
            dimension: 'Accessibility',
            icon: '♿',
            label: 'Manual review',
            detail: fix,
            target: 'manual',
            source: fix,
          });
        }
      });
    }

    // ---- UDL pillars ----
    var udl = comprehensive.udl;
    if (udl) {
      ['representation', 'engagement', 'actionExpression'].forEach(function (pillar) {
        var p = udl[pillar];
        if (!p || !p.recommendation || p.status === 'Aligned') return;
        var rec = p.recommendation;
        var artifactType = parseEngagementGap(rec); // reuse the same keyword map
        if (artifactType) {
          var existing = findExistingItem(history, artifactType);
          actions.push({
            id: actionId('udl'),
            dimension: 'UDL · ' + (pillar === 'actionExpression' ? 'Action & Expression' : pillar.charAt(0).toUpperCase() + pillar.slice(1)),
            icon: '🌐',
            label: (existing ? 'Regenerate ' : 'Generate ') + artifactType + ' (UDL pillar)',
            detail: rec,
            target: artifactType,
            existingItemId: existing ? existing.id : null,
            configHints: { customInstructions: rec },
            source: rec,
          });
        } else {
          actions.push({
            id: actionId('udl'),
            dimension: 'UDL · ' + pillar,
            icon: '🌐',
            label: 'Manual review',
            detail: rec,
            target: 'manual',
            source: rec,
          });
        }
      });
    }

    // ---- Accuracy: claimsToVerify becomes a verify-only set; no auto-action ----
    // Handled separately by the fact-check toggle (verifyClaimsBatch).

    return actions;
  }

  // ------------------------------------------------------------------
  // verifyClaimsBatch: ONE search-grounded call for ALL claims.
  // ------------------------------------------------------------------
  async function verifyClaimsBatch(claims, callGemini, cleanJson) {
    if (!claims || claims.length === 0) return [];
    // Chunk if >30 claims (rare; safety bound)
    var chunkSize = 30;
    var chunks = [];
    for (var i = 0; i < claims.length; i += chunkSize) chunks.push(claims.slice(i, i + chunkSize));
    var verdicts = [];
    var offset = 0;
    for (var c = 0; c < chunks.length; c++) {
      var chunk = chunks[c];
      var numbered = chunk.map(function (claim, idx) { return 'CLAIM ' + (idx + 1) + ': "' + String(claim).replace(/"/g, '\\"') + '"'; }).join('\n');
      var prompt = 'You are a fact-checker with Google Search access. For each numbered claim below, verify factual accuracy and return per-claim verdicts.\n\n'
        + numbered + '\n\n'
        + 'Return ONLY a single JSON object:\n'
        + '{\n'
        + '  "verdicts": [\n'
        + '    {\n'
        + '      "claimNumber": 1,\n'
        + '      "status": "verified" | "discrepancy" | "unclear",\n'
        + '      "evidence": "ONE sentence summarizing what the search found",\n'
        + '      "sources": ["url1", "url2"]\n'
        + '    }\n'
        + '  ]\n'
        + '}\n\n'
        + 'Use Google Search for every claim. Do not skip any. If unable to verify, mark "unclear" with brief explanation. Return verdicts in claim-number order.';
      try {
        var raw = await callGemini(prompt, true, true);
        var rawText = (raw && typeof raw === 'object' && raw.text) ? raw.text : String(raw || '');
        var parsed = JSON.parse(cleanJson(rawText));
        if (Array.isArray(parsed.verdicts)) {
          parsed.verdicts.forEach(function (v) {
            if (!v || typeof v !== 'object') return;
            var localNum = typeof v.claimNumber === 'number' ? v.claimNumber : verdicts.length + 1;
            verdicts.push({
              claimNumber: offset + localNum,
              originalClaim: chunk[localNum - 1] || null,
              status: typeof v.status === 'string' ? v.status : 'unclear',
              evidence: typeof v.evidence === 'string' ? v.evidence : '',
              sources: Array.isArray(v.sources) ? v.sources.slice(0, 3) : [],
            });
          });
        }
      } catch (err) {
        console.warn('[Remediator] verifyClaimsBatch chunk failed:', err);
      }
      offset += chunk.length;
    }
    return verdicts;
  }

  // ------------------------------------------------------------------
  // applyArtifactAction: invokes handleGenerate, then snapshots prior data.
  // ------------------------------------------------------------------
  async function applyArtifactAction(action, props) {
    if (!action || action.target === 'manual') return { ok: false, reason: 'manual' };
    var handleGenerate = props.handleGenerate;
    var setHistory = props.setHistory;
    if (typeof handleGenerate !== 'function') return { ok: false, reason: 'no-handle-generate' };

    // Capture the existing item (if any) BEFORE regeneration.
    var existingId = action.existingItemId;
    var beforeSnapshot = null;
    if (existingId && Array.isArray(props.history)) {
      var found = props.history.find(function (h) { return h && h.id === existingId; });
      if (found) beforeSnapshot = JSON.parse(JSON.stringify({ id: found.id, type: found.type, data: found.data, title: found.title, meta: found.meta, timestamp: found.timestamp || Date.now() }));
    }

    try {
      // Trigger regeneration. handleGenerate appends a NEW history item.
      await handleGenerate(action.target, null, false, null, action.configHints || {}, false);
    } catch (e) {
      return { ok: false, reason: 'generation-failed', error: String(e) };
    }

    // Post-generation: merge the new item into the existing slot if there was one.
    // We use setHistory(updater) for fresh state access.
    if (existingId) {
      setHistory(function (prev) {
        if (!Array.isArray(prev)) return prev;
        // Find the newest item of action.target (handleGenerate just appended it)
        var newestIdx = -1;
        for (var i = prev.length - 1; i >= 0; i--) {
          if (prev[i] && prev[i].type === action.target) { newestIdx = i; break; }
        }
        if (newestIdx === -1) return prev;
        var newest = prev[newestIdx];
        // Find the existing slot
        var existingIdx = prev.findIndex(function (h) { return h && h.id === existingId; });
        if (existingIdx === -1 || existingIdx === newestIdx) return prev;
        // Build merged: keep existing.id, copy new.data + new.meta, snapshot old data.
        var existingItem = prev[existingIdx];
        var merged = Object.assign({}, existingItem, {
          data: newest.data,
          meta: newest.meta || existingItem.meta,
          title: newest.title || existingItem.title,
          previousVersions: (Array.isArray(existingItem.previousVersions) ? existingItem.previousVersions.slice() : []).concat([{
            data: existingItem.data,
            meta: existingItem.meta,
            title: existingItem.title,
            timestamp: existingItem.timestamp || Date.now(),
            replacedAt: Date.now(),
            remediationSource: action.dimension + ': ' + (action.label || ''),
          }]),
          lastRemediatedAt: Date.now(),
        });
        // Replace old, drop new
        var next = prev.slice();
        next[existingIdx] = merged;
        next.splice(newestIdx, 1);
        return next;
      });
    }

    return { ok: true, beforeSnapshot: beforeSnapshot };
  }

  // ------------------------------------------------------------------
  // <AuditRemediator /> React component
  // ------------------------------------------------------------------
  function AuditRemediator(props) {
    var generatedContent = props.generatedContent || null;
    var comprehensive = generatedContent && generatedContent.data && generatedContent.data.comprehensive;
    var initialActions = useMemo(function () { return parseRecommendations(comprehensive, props.history || []); }, [comprehensive, props.history]);

    var initialClaims = useMemo(function () {
      var acc = comprehensive && comprehensive.accuracy && comprehensive.accuracy.llmReview;
      return acc && Array.isArray(acc.claimsToVerify) ? acc.claimsToVerify : [];
    }, [comprehensive]);

    var initialReadiness = useMemo(function () {
      return comprehensive && comprehensive.overall ? {
        score: comprehensive.overall.score,
        label: comprehensive.overall.label,
        perDimension: comprehensive.overall.perDimensionPercent || {},
      } : null;
    }, [comprehensive]);

    var checkedSet = useState(function () {
      var s = {};
      initialActions.forEach(function (a) { if (a.target !== 'manual') s[a.id] = true; });
      return s;
    });
    var checked = checkedSet[0]; var setChecked = checkedSet[1];

    var [factCheckOn, setFactCheckOn] = useState(initialClaims.length > 0);
    var [phase, setPhase] = useState('confirm'); // confirm | applying | verifying | reAuditing | done | error
    var [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
    var [verdicts, setVerdicts] = useState(null);
    var [errorMsg, setErrorMsg] = useState('');

    function toggleAction(id) {
      var next = Object.assign({}, checked);
      next[id] = !next[id];
      setChecked(next);
    }

    async function handleApply() {
      var selected = initialActions.filter(function (a) { return a.target !== 'manual' && checked[a.id]; });
      var totalSteps = selected.length + (factCheckOn && initialClaims.length > 0 ? 1 : 0) + 1; // +1 for re-audit
      var step = 0;

      // 1. Optional fact-check
      if (factCheckOn && initialClaims.length > 0) {
        step++;
        setPhase('verifying');
        setProgress({ current: step, total: totalSteps, label: 'Verifying ' + initialClaims.length + ' claim' + (initialClaims.length === 1 ? '' : 's') + ' with Google Search...' });
        try {
          var v = await verifyClaimsBatch(initialClaims, props.callGemini, props.cleanJson);
          setVerdicts(v);
        } catch (err) {
          console.warn('[Remediator] Fact-check failed:', err);
          if (props.addToast) props.addToast('Fact-check failed; continuing with other fixes.', 'warning');
        }
      }

      // 2. Apply selected artifact actions
      setPhase('applying');
      for (var i = 0; i < selected.length; i++) {
        step++;
        var action = selected[i];
        setProgress({ current: step, total: totalSteps, label: 'Applying: ' + action.label });
        try {
          var result = await applyArtifactAction(action, props);
          if (!result.ok && props.addToast) props.addToast('Skipped: ' + action.label + ' (' + (result.reason || 'unknown') + ')', 'warning');
        } catch (err) {
          console.warn('[Remediator] Action failed:', action, err);
          if (props.addToast) props.addToast('Failed: ' + action.label, 'error');
        }
      }

      // 3. Re-audit
      step++;
      setPhase('reAuditing');
      setProgress({ current: step, total: totalSteps, label: 'Re-running audit to verify fixes...' });
      try {
        await props.handleGenerate('alignment-report', null, false, null, {}, false);
      } catch (err) {
        console.warn('[Remediator] Re-audit failed:', err);
        setErrorMsg('Re-audit failed: ' + String(err));
        setPhase('error');
        return;
      }

      setPhase('done');
    }

    var newReadiness = useMemo(function () {
      if (phase !== 'done' && phase !== 'error') return null;
      // After re-audit, props.generatedContent should reflect the new audit
      var ng = props.generatedContent;
      if (!ng || !ng.data || !ng.data.comprehensive || !ng.data.comprehensive.overall) return null;
      return {
        score: ng.data.comprehensive.overall.score,
        label: ng.data.comprehensive.overall.label,
        perDimension: ng.data.comprehensive.overall.perDimensionPercent || {},
      };
    }, [phase, props.generatedContent]);

    if (!props.isOpen) return null;

    var selectedCount = initialActions.filter(function (a) { return a.target !== 'manual' && checked[a.id]; }).length;
    var manualCount = initialActions.filter(function (a) { return a.target === 'manual'; }).length;

    function ActionRow(action) {
      var isManual = action.target === 'manual';
      return e('div', {
        key: action.id,
        className: 'flex items-start gap-3 p-3 rounded-lg border ' + (isManual ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-indigo-300'),
      },
        !isManual && e('input', {
          type: 'checkbox',
          checked: !!checked[action.id],
          onChange: function () { toggleAction(action.id); },
          className: 'mt-1 w-4 h-4 accent-indigo-600',
          disabled: phase !== 'confirm',
          'aria-label': action.label,
        }),
        isManual && e('div', { className: 'mt-1 w-4 h-4 flex items-center justify-center text-slate-400', 'aria-hidden': 'true' }, '⚠'),
        e('div', { className: 'flex-1 min-w-0' },
          e('div', { className: 'flex items-center gap-2 mb-1' },
            e('span', { className: 'text-base', 'aria-hidden': 'true' }, action.icon),
            e('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, action.dimension),
            isManual && e('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800' }, 'Manual')
          ),
          e('div', { className: 'text-sm font-semibold text-slate-800' }, action.label),
          action.detail && e('div', { className: 'text-xs text-slate-600 mt-1 italic' }, action.detail)
        )
      );
    }

    function ReadinessBlock(label, r) {
      if (!r) return null;
      var color = r.score >= 90 ? 'emerald' : r.score >= 70 ? 'lime' : r.score >= 50 ? 'amber' : 'rose';
      return e('div', { className: 'flex-1 p-3 rounded-lg bg-' + color + '-50 border border-' + color + '-300' },
        e('div', { className: 'text-xs font-bold uppercase tracking-wider text-' + color + '-700 mb-1' }, label),
        e('div', { className: 'text-3xl font-black text-' + color + '-800' }, r.score),
        e('div', { className: 'text-xs text-' + color + '-700 mt-1' }, r.label || '')
      );
    }

    return e('div', {
      className: 'fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4',
      onClick: function (ev) { if (ev.target === ev.currentTarget && phase === 'confirm') props.onClose(); },
    },
      e('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col' },
        // Header
        e('div', { className: 'px-6 py-4 border-b border-slate-200 flex items-center justify-between' },
          e('div', null,
            e('h2', { className: 'text-xl font-black text-slate-800 flex items-center gap-2' },
              e('span', { 'aria-hidden': 'true' }, '🛠️'),
              ' Apply Audit Fixes'),
            e('p', { className: 'text-xs text-slate-600 mt-0.5' },
              initialActions.length + ' suggestion' + (initialActions.length === 1 ? '' : 's') + ' parsed from the audit · ' + selectedCount + ' selected'
              + (manualCount > 0 ? ' · ' + manualCount + ' need manual review' : ''))
          ),
          phase === 'confirm' && e('button', {
            className: 'text-slate-500 hover:text-slate-800 text-2xl leading-none px-2',
            onClick: props.onClose, 'aria-label': 'Close',
          }, '×')
        ),

        // Body
        e('div', { className: 'flex-1 overflow-y-auto px-6 py-4 space-y-3' },
          phase === 'confirm' && [
            initialClaims.length > 0 && e('label', {
              key: 'fc',
              className: 'flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 cursor-pointer hover:bg-indigo-100',
            },
              e('input', {
                type: 'checkbox',
                checked: factCheckOn,
                onChange: function () { setFactCheckOn(!factCheckOn); },
                className: 'mt-1 w-4 h-4 accent-indigo-600',
                'aria-label': 'Verify factual claims with Google Search',
              }),
              e('div', { className: 'flex-1' },
                e('div', { className: 'text-sm font-bold text-indigo-900' },
                  '🔍 Verify factual claims with Google Search'),
                e('div', { className: 'text-xs text-indigo-700 mt-0.5' },
                  initialClaims.length + ' claim' + (initialClaims.length === 1 ? '' : 's') + ' flagged. One batched search-grounded call (~5-10s, recommended).')
              )
            ),
            initialActions.length === 0 && e('div', {
              key: 'empty',
              className: 'p-8 text-center text-slate-500 italic',
            }, 'No actionable recommendations parsed from this audit. The audit may be too thin (run more artifacts first), or all dimensions are already aligned.'),
            initialActions.map(ActionRow)
          ],

          (phase === 'verifying' || phase === 'applying' || phase === 'reAuditing') && e('div', { className: 'p-8 text-center' },
            e('div', { className: 'text-4xl mb-3', 'aria-hidden': 'true' }, '⚙️'),
            e('div', { className: 'text-base font-bold text-slate-800 mb-2' }, progress.label),
            e('div', { className: 'w-full max-w-md mx-auto h-2 bg-slate-200 rounded-full overflow-hidden' },
              e('div', {
                className: 'h-full bg-indigo-500 transition-all duration-300',
                style: { width: progress.total > 0 ? Math.round((progress.current / progress.total) * 100) + '%' : '0%' },
              })
            ),
            e('div', { className: 'text-xs text-slate-500 mt-2' }, 'Step ' + progress.current + ' of ' + progress.total)
          ),

          phase === 'done' && e('div', null,
            e('div', { className: 'p-4 rounded-lg bg-emerald-50 border border-emerald-300 mb-4' },
              e('div', { className: 'text-base font-bold text-emerald-900 flex items-center gap-2' },
                e('span', { 'aria-hidden': 'true' }, '✓'), ' Fixes applied and audit re-run')
            ),
            initialReadiness && newReadiness && e('div', { className: 'flex items-center gap-3 mb-4' },
              ReadinessBlock('Before', initialReadiness),
              e('div', { className: 'text-2xl text-slate-400', 'aria-hidden': 'true' }, '→'),
              ReadinessBlock('After', newReadiness)
            ),
            verdicts && verdicts.length > 0 && e('div', { className: 'mt-4' },
              e('h3', { className: 'text-sm font-bold text-slate-800 mb-2' }, 'Fact-check verdicts'),
              e('ul', { className: 'space-y-2' },
                verdicts.map(function (v, i) {
                  var color = v.status === 'verified' ? 'emerald' : v.status === 'discrepancy' ? 'rose' : 'amber';
                  return e('li', { key: i, className: 'p-2 rounded bg-' + color + '-50 border border-' + color + '-200 text-xs' },
                    e('div', { className: 'font-bold text-' + color + '-800 mb-1' },
                      (v.status === 'verified' ? '✓ Verified' : v.status === 'discrepancy' ? '⚠ Discrepancy' : '? Unclear') + ' · Claim ' + v.claimNumber),
                    v.originalClaim && e('div', { className: 'italic text-slate-700 mb-1' }, '"' + v.originalClaim + '"'),
                    v.evidence && e('div', { className: 'text-' + color + '-900' }, v.evidence)
                  );
                })
              )
            )
          ),

          phase === 'error' && e('div', { className: 'p-4 rounded-lg bg-rose-50 border border-rose-300' },
            e('div', { className: 'text-base font-bold text-rose-900' }, 'Something went wrong'),
            e('div', { className: 'text-sm text-rose-800 mt-1' }, errorMsg || 'Unknown error.')
          )
        ),

        // Footer
        e('div', { className: 'px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3' },
          phase === 'confirm' && e('button', {
            className: 'px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900',
            onClick: props.onClose,
          }, 'Cancel'),
          phase === 'confirm' && e('button', {
            className: 'px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed',
            onClick: handleApply,
            disabled: selectedCount === 0 && !(factCheckOn && initialClaims.length > 0),
          }, 'Apply' + (selectedCount > 0 ? ' ' + selectedCount + ' fix' + (selectedCount === 1 ? '' : 'es') : '')),
          (phase === 'done' || phase === 'error') && e('button', {
            className: 'px-4 py-2 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg',
            onClick: props.onClose,
          }, 'Close')
        )
      )
    );
  }

  // ------------------------------------------------------------------
  // Register
  // ------------------------------------------------------------------
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AuditRemediator = AuditRemediator;
  console.log('[CDN] AuditRemediator loaded');
})();
