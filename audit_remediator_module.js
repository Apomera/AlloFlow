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
  var useEffect = React.useEffect;
  var useRef = React.useRef;

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

  function _stableHash(str) {
    var s = String(str || '');
    var h = 5381;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
  }

  function actionId(prefix, key, index) {
    var normKey = Array.isArray(key) ? key.join('|') : String(key || '');
    var suffix = _stableHash(normKey.toLowerCase().replace(/\s+/g, ' ').trim());
    return prefix + '_' + suffix + (typeof index === 'number' && index > 0 ? '_' + index : '');
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
    var usedIds = {};
    function nextStableId(prefix, key) {
      var base = actionId(prefix, key);
      if (!usedIds[base]) { usedIds[base] = 1; return base; }
      var n = usedIds[base]++;
      var candidate = base + '_' + n;
      while (usedIds[candidate]) { n++; candidate = base + '_' + n; }
      usedIds[candidate] = 1;
      return candidate;
    }

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
          id: nextStableId('vocab', 'glossary:' + addTerms.join(',')),
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
            id: nextStableId('eng', artifactType + ':' + gap),
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
            id: nextStableId('eng', 'manual:' + gap),
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
          id: nextStableId('dok', 'quiz:' + dok),
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
            id: nextStableId('a11y', artifactType + ':' + fix),
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
            id: nextStableId('a11y', 'manual:' + fix),
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

    // ---- Cognitive load / pacing ----
    // Missing or unrealistic segment durations are fixed by regenerating the
    // lesson plan: the generator now opens every segment with "(N min)".
    var cl = comprehensive.cognitiveLoad;
    if (cl && !cl.notApplicable && !cl.notEvaluated && !cl.computeFailed && cl.status && cl.status !== 'Aligned') {
      var existingPlan = findExistingItem(history, 'lesson-plan');
      var missingDurations = !(cl.claimedTotalMinutes > 0);
      var clRecs = Array.isArray(cl.recommendations) ? cl.recommendations.filter(function (r) { return typeof r === 'string' && r; }) : [];
      var clDetail = clRecs[0] || (cl.llmReview && cl.llmReview.narrative) || 'Lesson pacing needs adjustment.';
      actions.push({
        id: nextStableId('pace', 'lesson-plan:' + clDetail),
        dimension: 'Cognitive load / pacing',
        icon: '⏱️',
        label: missingDurations
          ? (existingPlan ? 'Regenerate ' : 'Generate ') + 'Lesson Plan with segment time estimates'
          : 'Regenerate Lesson Plan with adjusted pacing',
        detail: clDetail,
        target: 'lesson-plan',
        existingItemId: existingPlan ? existingPlan.id : null,
        configHints: {},
        source: clDetail,
      });
      var adjustments = cl.llmReview && Array.isArray(cl.llmReview.specificAdjustments) ? cl.llmReview.specificAdjustments : [];
      adjustments.forEach(function (adj) {
        if (typeof adj !== 'string' || !adj.trim()) return;
        actions.push({
          id: nextStableId('pace', 'manual:' + adj),
          dimension: 'Cognitive load / pacing',
          icon: '⏱️',
          label: 'Manual review',
          detail: adj,
          target: 'manual',
          source: adj,
        });
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
            id: nextStableId('udl', pillar + ':' + artifactType + ':' + rec),
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
            id: nextStableId('udl', pillar + ':manual:' + rec),
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

  function _arAiUsable(kind, fn) {
    if (typeof fn !== 'function' || fn._alloQrBlocked) return false;
    if (typeof window !== 'undefined') {
      if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window.__alloQrStudentMode === true || window._alloQrBlocked === true) return false;
      if (window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false) return false;
      if (typeof window.__alloAiUsable === 'function') {
        try { return !!window.__alloAiUsable(kind, fn); } catch (_) { return false; }
      }
    }
    return true;
  }

  // ------------------------------------------------------------------
  // verifyClaimsBatch: ONE search-grounded call for ALL claims.
  // ------------------------------------------------------------------
  async function verifyClaimsBatch(claims, callGemini, cleanJson) {
    if (!claims || claims.length === 0 || !_arAiUsable('text', callGemini)) return [];
    // Chunk if >30 claims (rare; safety bound)
    var chunkSize = 30;
    var chunks = [];
    for (var i = 0; i < claims.length; i += chunkSize) chunks.push(claims.slice(i, i + chunkSize));
    var verdicts = [];
    var offset = 0;
    var failedChunks = 0;
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
        var parsed = JSON.parse(typeof cleanJson === 'function' ? cleanJson(rawText) : rawText);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.verdicts)) {
          parsed.verdicts.forEach(function (v, idx) {
            if (!v || typeof v !== 'object') return;
            var localNum = (typeof v.claimNumber === 'number' && Number.isFinite(v.claimNumber) && v.claimNumber >= 1) ? Math.floor(v.claimNumber) : (idx + 1);
            verdicts.push({
              claimNumber: offset + localNum,
              originalClaim: chunk[localNum - 1] || null,
              status: typeof v.status === 'string' ? v.status : 'unclear',
              evidence: typeof v.evidence === 'string' ? v.evidence : '',
              sources: Array.isArray(v.sources) ? v.sources.slice(0, 3) : [],
            });
          });
        } else {
          failedChunks += 1;
        }
      } catch (err) {
        failedChunks += 1;
        console.warn('[Remediator] verifyClaimsBatch chunk failed:', err);
      }
      offset += chunk.length;
    }
    if (failedChunks > 0 && verdicts.length === 0) {
      throw new Error('Fact-check failed for all claim batches.');
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
    if (!_arAiUsable('text', handleGenerate)) return { ok: false, reason: 'ai-unavailable' };

    // Snapshot pre-call history IDs and item count so we ONLY merge a genuinely NEW
    // item created by this handleGenerate invocation (handling both append & prepend
    // and preventing wrong-item merges or false-success on silent failures).
    var existingId = action.existingItemId;
    var beforeSnapshot = null;
    var priorIds = new Set();
    var priorTargetItems = new Set();
    if (Array.isArray(props.history)) {
      props.history.forEach(function (h) {
        if (!h) return;
        if (h.id != null) priorIds.add(h.id);
        if (h.type === action.target) priorTargetItems.add(h);
      });
      if (existingId) {
        var found = props.history.find(function (h) { return h && h.id === existingId; });
        if (found) beforeSnapshot = JSON.parse(JSON.stringify({ id: found.id, type: found.type, data: found.data, title: found.title, meta: found.meta, timestamp: found.timestamp || Date.now() }));
      }
    }

    var genRet;
    try {
      // Trigger regeneration. handleGenerate adds a NEW history item (append or prepend).
      genRet = await handleGenerate(action.target, null, false, null, action.configHints || {}, false);
    } catch (e) {
      return { ok: false, reason: 'generation-failed', error: String(e) };
    }
    if (genRet === false || (genRet && typeof genRet === 'object' && genRet.ok === false)) {
      return { ok: false, reason: (genRet && genRet.reason) || 'generation-failed' };
    }

    // Post-generation: locate the newly added item of action.target (not in priorIds)
    // and, when existingId is set, merge it into the existing slot while snapshotting prior data.
    var updaterRan = false;
    var foundNewItem = false;
    var latestHistory = null;
    if (typeof setHistory === 'function') {
      await new Promise(function (resolveUpdater) {
        var settled = false;
        var finish = function () { if (!settled) { settled = true; resolveUpdater(); } };
        setHistory(function (prev) {
          updaterRan = true;
          if (!Array.isArray(prev)) { finish(); return prev; }
          // Identify genuinely NEW items of action.target (works for both append & prepend).
          var newCandidates = [];
          for (var i = 0; i < prev.length; i++) {
            var item = prev[i];
            if (!item || item.type !== action.target) continue;
            var isNew = item.id != null ? !priorIds.has(item.id) : !priorTargetItems.has(item);
            if (isNew) newCandidates.push({ idx: i, item: item });
          }
          if (newCandidates.length === 0) {
            foundNewItem = false;
            latestHistory = prev;
            finish();
            return prev;
          }
          foundNewItem = true;
          if (!existingId) {
            latestHistory = prev;
            finish();
            return prev;
          }

          // Pick the newest candidate (highest timestamp if present, else last in list).
          var picked = newCandidates[newCandidates.length - 1];
          for (var ci = 0; ci < newCandidates.length; ci++) {
            var candTs = Number(newCandidates[ci].item.timestamp) || 0;
            var pickedTs = Number(picked.item.timestamp) || 0;
            if (candTs > pickedTs) picked = newCandidates[ci];
          }
          var newestIdx = picked.idx;
          var newest = picked.item;

          // Find the existing slot
          var existingIdx = prev.findIndex(function (h) { return h && h.id === existingId; });
          if (existingIdx === -1 || existingIdx === newestIdx) {
            latestHistory = prev;
            finish();
            return prev;
          }
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
          // Replace old, drop newly inserted duplicate regardless of whether it was appended or prepended.
          var next = prev.slice();
          next[existingIdx] = merged;
          next.splice(newestIdx, 1);
          latestHistory = next;
          finish();
          return next;
        });
        setTimeout(finish, 0);
      });
    }

    if (updaterRan && !foundNewItem) {
      return { ok: false, reason: 'no-new-item-created', beforeSnapshot: beforeSnapshot, nextHistory: latestHistory };
    }

    return { ok: true, beforeSnapshot: beforeSnapshot, nextHistory: latestHistory };
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

    var aiUsable = _arAiUsable('text', props.callGemini);
    var generateUsable = _arAiUsable('text', props.handleGenerate);
    var checkedSet = useState(function () {
      var s = {};
      initialActions.forEach(function (a) { if (a.target !== 'manual') s[a.id] = true; });
      return s;
    });
    var checked = checkedSet[0]; var setChecked = checkedSet[1];

    // Preserve user toggles when history updates (deterministic IDs), and default-check newly parsed actions.
    useEffect(function () {
      setChecked(function (prev) {
        var next = {};
        var changed = false;
        initialActions.forEach(function (a) {
          if (a.target === 'manual') return;
          if (Object.prototype.hasOwnProperty.call(prev, a.id)) {
            next[a.id] = prev[a.id];
          } else {
            next[a.id] = true;
            changed = true;
          }
        });
        if (!changed && Object.keys(prev).length === Object.keys(next).length) return prev;
        return next;
      });
    }, [initialActions]);

    var [factCheckOn, setFactCheckOn] = useState(initialClaims.length > 0 && aiUsable);
    var [phase, setPhase] = useState('confirm'); // confirm | applying | verifying | reAuditing | done | error
    var [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
    var [verdicts, setVerdicts] = useState(null);
    var [errorMsg, setErrorMsg] = useState('');
    var beforeReadinessRef = useRef(initialReadiness);
    var historyRef = useRef(props.history);
    historyRef.current = props.history;
    var inFlightRef = useRef(false);
    var mountedRef = useRef(true);
    var dialogRef = useRef(null);
    var backdropDownRef = useRef(false);
    useEffect(function () {
      mountedRef.current = true;
      return function () { mountedRef.current = false; };
    }, []);

    // Reset transient remediation state whenever the modal opens so a mounted host
    // re-opening after a prior Apply never shows stale 'done'/'error' or prior readiness.
    useEffect(function () {
      if (props.isOpen) {
        setPhase('confirm');
        setVerdicts(null);
        setErrorMsg('');
        setProgress({ current: 0, total: 0, label: '' });
        setFactCheckOn(initialClaims.length > 0 && _arAiUsable('text', props.callGemini));
        beforeReadinessRef.current = initialReadiness;
      }
    }, [props.isOpen]);

    // Keep beforeReadiness snapshot aligned while in confirm phase; freeze once Apply starts.
    useEffect(function () {
      if (phase === 'confirm') {
        beforeReadinessRef.current = initialReadiness;
      }
    }, [phase, initialReadiness]);

    // WCAG modal keyboard accessibility: focus trap, #root inert, body scroll lock, Escape, focus restore.
    useEffect(function () {
      if (!props.isOpen) return;
      var dialog = dialogRef.current;
      var prevFocus = typeof document !== 'undefined' ? document.activeElement : null;
      var scrollLock = typeof window !== 'undefined' ? (window.__alloScrollLockState = window.__alloScrollLockState || { count: 0, prev: '' }) : null;
      if (scrollLock && document.body) {
        if (scrollLock.count === 0) {
          scrollLock.prev = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
        }
        scrollLock.count += 1;
      }
      var hiddenSiblings = [];
      var rootHost = (typeof document !== 'undefined' && document.getElementById('root')) || (typeof document !== 'undefined' && document.body);
      if (rootHost && dialog) {
        Array.prototype.slice.call(rootHost.children || []).forEach(function (child) {
          if (!child || child === dialog || child.contains(dialog)) return;
          var role = child.getAttribute && child.getAttribute('role');
          if (role === 'status' || role === 'alert' || role === 'log' || (child.hasAttribute && child.hasAttribute('aria-live'))) return;
          hiddenSiblings.push({ node: child, hadInert: child.hasAttribute('inert'), prevAriaHidden: child.getAttribute('aria-hidden') });
          child.setAttribute('inert', '');
          child.setAttribute('aria-hidden', 'true');
        });
      }
      var getFocusables = function () {
        if (!dialog) return [];
        return Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function (el) {
          return el && !el.hidden && !el.closest('[hidden], [inert], [aria-hidden="true"]');
        });
      };
      var focusTimer = setTimeout(function () {
        var list = getFocusables();
        var target = list[0] || dialog;
        if (target && typeof target.focus === 'function') { try { target.focus(); } catch (_) {} }
      }, 0);
      var onKeyDown = function (ev) {
        if (!ev) return;
        if (ev.key === 'Escape') {
          var canDismissNow = phase === 'confirm' || phase === 'done' || phase === 'error';
          if (canDismissNow && typeof props.onClose === 'function') {
            ev.preventDefault();
            ev.stopPropagation();
            props.onClose();
          }
          return;
        }
        if (ev.key === 'Tab' && dialog) {
          var list = getFocusables();
          if (!list.length) { ev.preventDefault(); dialog.focus(); return; }
          var first = list[0], last = list[list.length - 1];
          if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
            ev.preventDefault(); (ev.shiftKey ? last : first).focus();
          } else if (ev.shiftKey && document.activeElement === first) {
            ev.preventDefault(); last.focus();
          } else if (!ev.shiftKey && document.activeElement === last) {
            ev.preventDefault(); first.focus();
          }
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return function () {
        clearTimeout(focusTimer);
        document.removeEventListener('keydown', onKeyDown);
        hiddenSiblings.forEach(function (entry) {
          if (!entry.hadInert) entry.node.removeAttribute('inert');
          if (entry.prevAriaHidden === null) entry.node.removeAttribute('aria-hidden');
          else entry.node.setAttribute('aria-hidden', entry.prevAriaHidden);
        });
        if (scrollLock && document.body) {
          scrollLock.count = Math.max(0, scrollLock.count - 1);
          if (scrollLock.count === 0) document.body.style.overflow = scrollLock.prev;
        }
        if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus(); } catch (_) {}
        }
      };
    }, [props.isOpen, phase, props.onClose]);

    function toggleAction(id) {
      var next = Object.assign({}, checked);
      next[id] = !next[id];
      setChecked(next);
    }

    async function handleApply() {
      if (inFlightRef.current) return;
      if (!_arAiUsable('text', props.handleGenerate)) {
        setErrorMsg('AI remediation is unavailable right now.');
        setPhase('error');
        return;
      }
      inFlightRef.current = true;
      beforeReadinessRef.current = initialReadiness;
      try {
        var runFactCheck = !!(factCheckOn && initialClaims.length > 0 && _arAiUsable('text', props.callGemini));
        var selected = initialActions.filter(function (a) { return a.target !== 'manual' && checked[a.id]; });
        var totalSteps = selected.length + (runFactCheck ? 1 : 0) + 1; // +1 for re-audit
        var step = 0;

        // 1. Optional fact-check
        if (runFactCheck) {
          step++;
          if (mountedRef.current) {
            setPhase('verifying');
            setProgress({ current: step, total: totalSteps, label: 'Verifying ' + initialClaims.length + ' claim' + (initialClaims.length === 1 ? '' : 's') + ' with Google Search...' });
          }
          try {
            var v = await verifyClaimsBatch(initialClaims, props.callGemini, props.cleanJson);
            if (!mountedRef.current) return;
            setVerdicts(v);
          } catch (err) {
            console.warn('[Remediator] Fact-check failed:', err);
            if (mountedRef.current && props.addToast) props.addToast('Fact-check failed; continuing with other fixes.', 'warning');
          }
        }

        // 2. Apply selected artifact actions using latest rolling history
        if (mountedRef.current) setPhase('applying');
        var rollingHistory = Array.isArray(historyRef.current) ? historyRef.current : [];
        for (var i = 0; i < selected.length; i++) {
          if (!mountedRef.current) return;
          step++;
          var action = selected[i];
          setProgress({ current: step, total: totalSteps, label: 'Applying: ' + action.label });
          try {
            var actionProps = Object.assign({}, props, { history: rollingHistory });
            var result = await applyArtifactAction(action, actionProps);
            if (Array.isArray(result && result.nextHistory)) {
              rollingHistory = result.nextHistory;
            } else if (Array.isArray(historyRef.current)) {
              rollingHistory = historyRef.current;
            }
            if (!mountedRef.current) return;
            if (!result.ok && props.addToast) props.addToast('Skipped: ' + action.label + ' (' + (result.reason || 'unknown') + ')', 'warning');
          } catch (err) {
            console.warn('[Remediator] Action failed:', action, err);
            if (mountedRef.current && props.addToast) props.addToast('Failed: ' + action.label, 'error');
          }
        }

        // 3. Re-audit
        if (!mountedRef.current) return;
        step++;
        setPhase('reAuditing');
        setProgress({ current: step, total: totalSteps, label: 'Re-running audit to verify fixes...' });
        try {
          var reAuditRet = await props.handleGenerate('alignment-report', null, false, null, {}, false);
          if (!mountedRef.current) return;
          if (reAuditRet === false || (reAuditRet && typeof reAuditRet === 'object' && reAuditRet.ok === false)) {
            setErrorMsg('Re-audit did not complete. Please re-run the audit manually.');
            setPhase('error');
            return;
          }
        } catch (err) {
          console.warn('[Remediator] Re-audit failed:', err);
          if (mountedRef.current) {
            setErrorMsg('Re-audit failed: ' + String(err));
            setPhase('error');
          }
          return;
        }

        if (mountedRef.current) setPhase('done');
      } finally {
        inFlightRef.current = false;
      }
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
      var Tag = isManual ? 'div' : 'label';
      return e(Tag, {
        key: action.id,
        className: 'flex items-start gap-3 p-3 rounded-lg border min-h-11 ' + (isManual ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-indigo-300 cursor-pointer'),
      },
        !isManual && e('input', {
          type: 'checkbox',
          checked: !!checked[action.id],
          onChange: function () { toggleAction(action.id); },
          className: 'mt-1 w-4 h-4 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
          disabled: phase !== 'confirm' || !generateUsable,
          'aria-label': action.label,
        }),
        isManual && e('div', { className: 'mt-1 w-4 h-4 flex items-center justify-center text-slate-600', 'aria-hidden': 'true' }, '⚠'),
        e('div', { className: 'flex-1 min-w-0' },
          e('div', { className: 'flex items-center gap-2 mb-1' },
            e('span', { className: 'text-base', 'aria-hidden': 'true' }, action.icon),
            e('span', { className: 'text-xs font-bold uppercase tracking-wider text-slate-600' }, action.dimension),
            isManual && e('span', { className: 'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900' }, 'Manual')
          ),
          e('div', { className: 'text-sm font-semibold text-slate-800' }, action.label),
          action.detail && e('div', { className: 'text-xs text-slate-600 mt-1 italic' }, action.detail)
        )
      );
    }

    var READINESS_TONES = {
      high: { box: 'bg-emerald-50 border-emerald-300', label: 'text-emerald-800', score: 'text-emerald-900' },
      good: { box: 'bg-teal-50 border-teal-300', label: 'text-teal-800', score: 'text-teal-900' },
      mid: { box: 'bg-amber-50 border-amber-300', label: 'text-amber-800', score: 'text-amber-900' },
      low: { box: 'bg-rose-50 border-rose-300', label: 'text-rose-800', score: 'text-rose-900' },
    };

    function ReadinessBlock(label, r) {
      if (!r) return null;
      var tone = r.score >= 90 ? READINESS_TONES.high : r.score >= 70 ? READINESS_TONES.good : r.score >= 50 ? READINESS_TONES.mid : READINESS_TONES.low;
      return e('div', { className: 'flex-1 p-3 rounded-lg border ' + tone.box },
        e('div', { className: 'text-xs font-bold uppercase tracking-wider mb-1 ' + tone.label }, label),
        e('div', { className: 'text-3xl font-black ' + tone.score }, r.score),
        e('div', { className: 'text-xs mt-1 ' + tone.label }, r.label || '')
      );
    }

    var canDismiss = phase === 'confirm' || phase === 'done' || phase === 'error';
    var beforeReadiness = beforeReadinessRef.current || initialReadiness;
    var factCheckReady = !!(factCheckOn && aiUsable && initialClaims.length > 0);

    return e('div', {
      className: 'fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4',
      onMouseDown: function (ev) { backdropDownRef.current = ev.target === ev.currentTarget; },
      onClick: function (ev) {
        var shouldClose = backdropDownRef.current && ev.target === ev.currentTarget;
        backdropDownRef.current = false;
        if (shouldClose && canDismiss && typeof props.onClose === 'function') props.onClose();
      },
    },
      e('div', {
        ref: dialogRef,
        tabIndex: -1,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'audit-remediator-title',
        className: 'allo-docsuite bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col',
      },
        // Header
        e('div', { className: 'px-6 py-4 border-b border-slate-200 flex items-center justify-between' },
          e('div', null,
            e('h2', { id: 'audit-remediator-title', className: 'text-xl font-black text-slate-800 flex items-center gap-2' },
              e('span', { 'aria-hidden': 'true' }, '🛠️'),
              ' Apply Audit Fixes'),
            e('p', { className: 'text-xs text-slate-600 mt-0.5' },
              initialActions.length + ' suggestion' + (initialActions.length === 1 ? '' : 's') + ' parsed from the audit · ' + selectedCount + ' selected'
              + (manualCount > 0 ? ' · ' + manualCount + ' need manual review' : ''))
          ),
          canDismiss && e('button', {
            type: 'button',
            className: 'min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 text-2xl leading-none px-2',
            onClick: props.onClose, 'aria-label': 'Close',
          }, '×')
        ),

        // Body
        e('div', { className: 'flex-1 overflow-y-auto px-6 py-4 space-y-3' },
          phase === 'confirm' && !generateUsable && e('p', {
            role: 'status',
            className: 'p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900',
          }, 'AI remediation is unavailable while AI access is disabled or locked.'),
          phase === 'confirm' && [
            initialClaims.length > 0 && aiUsable && e('label', {
              key: 'fc',
              className: 'flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 cursor-pointer hover:bg-indigo-100 min-h-11',
            },
              e('input', {
                type: 'checkbox',
                checked: factCheckOn,
                onChange: function () { setFactCheckOn(!factCheckOn); },
                className: 'mt-1 w-4 h-4 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
                'aria-label': 'Verify factual claims with Google Search',
              }),
              e('div', { className: 'flex-1' },
                e('div', { className: 'text-sm font-bold text-indigo-900' },
                  '🔍 Verify factual claims with Google Search'),
                e('div', { className: 'text-xs text-indigo-800 mt-0.5' },
                  initialClaims.length + ' claim' + (initialClaims.length === 1 ? '' : 's') + ' flagged. One batched search-grounded call (~5-10s, recommended).')
              )
            ),
            initialActions.length === 0 && e('div', {
              key: 'empty',
              className: 'p-8 text-center text-slate-600 italic',
            }, 'No actionable recommendations parsed from this audit. The audit may be too thin (run more artifacts first), or all dimensions are already aligned.'),
            initialActions.map(ActionRow)
          ],

          (phase === 'verifying' || phase === 'applying' || phase === 'reAuditing') && e('div', {
            role: 'status',
            'aria-live': 'polite',
            className: 'p-8 text-center',
          },
            e('div', { className: 'text-4xl mb-3', 'aria-hidden': 'true' }, '⚙️'),
            e('div', { className: 'text-base font-bold text-slate-800 mb-2' }, progress.label),
            e('div', { className: 'w-full max-w-md mx-auto h-2 bg-slate-200 rounded-full overflow-hidden' },
              e('div', {
                className: 'h-full bg-indigo-500 transition-all motion-reduce:transition-none duration-300',
                style: { width: progress.total > 0 ? Math.round((progress.current / progress.total) * 100) + '%' : '0%' },
              })
            ),
            e('div', { className: 'text-xs text-slate-600 mt-2' }, 'Step ' + progress.current + ' of ' + progress.total)
          ),

          phase === 'done' && e('div', null,
            e('div', { className: 'p-4 rounded-lg bg-emerald-50 border border-emerald-300 mb-4', role: 'status', 'aria-live': 'polite' },
              e('div', { className: 'text-base font-bold text-emerald-900 flex items-center gap-2' },
                e('span', { 'aria-hidden': 'true' }, '✓'), ' Fixes applied and audit re-run')
            ),
            beforeReadiness && newReadiness && e('div', { className: 'flex items-center gap-3 mb-4' },
              ReadinessBlock('Before', beforeReadiness),
              e('div', { className: 'text-2xl text-slate-600', 'aria-hidden': 'true' }, '→'),
              ReadinessBlock('After', newReadiness)
            ),
            verdicts && verdicts.length > 0 && e('div', { className: 'mt-4' },
              e('h3', { className: 'text-sm font-bold text-slate-800 mb-2' }, 'Fact-check verdicts'),
              e('ul', { className: 'space-y-2' },
                verdicts.map(function (v, i) {
                  var vTone = v.status === 'verified'
                    ? { item: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-800', body: 'text-emerald-900' }
                    : v.status === 'discrepancy'
                      ? { item: 'bg-rose-50 border-rose-200', title: 'text-rose-800', body: 'text-rose-900' }
                      : { item: 'bg-amber-50 border-amber-200', title: 'text-amber-800', body: 'text-amber-900' };
                  return e('li', { key: i, className: 'p-2 rounded border text-xs ' + vTone.item },
                    e('div', { className: 'font-bold mb-1 ' + vTone.title },
                      (v.status === 'verified' ? '✓ Verified' : v.status === 'discrepancy' ? '⚠ Discrepancy' : '? Unclear') + ' · Claim ' + v.claimNumber),
                    v.originalClaim && e('div', { className: 'italic text-slate-700 mb-1' }, '"' + v.originalClaim + '"'),
                    v.evidence && e('div', { className: vTone.body }, v.evidence)
                  );
                })
              )
            )
          ),

          phase === 'error' && e('div', { role: 'alert', className: 'p-4 rounded-lg bg-rose-50 border border-rose-300' },
            e('div', { className: 'text-base font-bold text-rose-900' }, 'Something went wrong'),
            e('div', { className: 'text-sm text-rose-800 mt-1' }, errorMsg || 'Unknown error.')
          )
        ),

        // Footer
        e('div', { className: 'px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3' },
          phase === 'confirm' && e('button', {
            type: 'button',
            className: 'min-h-11 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600',
            onClick: props.onClose,
          }, 'Cancel'),
          phase === 'confirm' && e('button', {
            type: 'button',
            className: 'min-h-11 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
            onClick: handleApply,
            disabled: !generateUsable || (selectedCount === 0 && !factCheckReady),
          }, 'Apply' + (selectedCount > 0 ? ' ' + selectedCount + ' fix' + (selectedCount === 1 ? '' : 'es') : '')),
          (phase === 'done' || phase === 'error') && e('button', {
            type: 'button',
            className: 'min-h-11 px-4 py-2 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
            onClick: props.onClose,
          }, 'Close')
        )
      )
    );
  }

  AuditRemediator._internals = {
    actionId: actionId,
    parseEngagementGap: parseEngagementGap,
    parseRecommendations: parseRecommendations,
    applyArtifactAction: applyArtifactAction,
    verifyClaimsBatch: verifyClaimsBatch,
    _arAiUsable: _arAiUsable,
  };

  // ------------------------------------------------------------------
  // Register
  // ------------------------------------------------------------------
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AuditRemediator = AuditRemediator;
  console.log('[CDN] AuditRemediator loaded');
})();
