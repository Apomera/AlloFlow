(function(){"use strict";
if(window.AlloModules&&window.AlloModules.TimelineRevisionModule){console.log("[CDN] TimelineRevisionModule already loaded, skipping"); return;}
// timeline_revision_source.jsx — Timeline / Sequence Builder utilities
// Pure-function extraction + AI-call wrappers + stateful handlers.
// No hooks; factory pattern. Source of truth; compiled to
// timeline_revision_module.js (hand-maintained IIFE wrap).
//
// Phase 1 scope (pure/simple):
//   - validateSequenceStructure: pure validator for timeline/sequence content.
//   - handleExplainTimelineItem: AI-call wrapper that generates a student-facing
//     explanation for why an item belongs at a specific sequence position.
//
// Phase 2 scope (stateful handlers, setter+call-time-args pattern):
//   - handleTimelineRevision: revise sequence items based on teacher instructions.
//   - handleAutoFixTimeline: apply validator issues via AI, preserving images.
//   - handleVerifyTimelineAccuracy: per-item fact/position verification.
//   - handleGenerateTimelineItemImage: regenerate or refine one item's image.
//
// State access pattern for Phase 2 handlers: callers pass a `ctx` object with
// live state values + setters + utilities. This avoids stale-closure issues
// because the monolith's delegator (declared inside the React functional
// component) reads fresh state each render and passes it explicitly.

var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };

var createTimelineRevision = function(deps) {
  var callGemini = deps.callGemini;
  var gradeLevel = deps.gradeLevel || 'Grade 5';

  // ──────────────────────────────────────────────────────────────────────────
  // validateSequenceStructure(content, mode)
  // Pure function. Returns { ok: bool, issues: [{ code, itemIndex?, message }] }
  // ──────────────────────────────────────────────────────────────────────────
  function validateSequenceStructure(content, mode) {
    var issues = [];
    if (!content || !Array.isArray(content.items) || content.items.length === 0) {
      return { ok: false, issues: [{ code: 'NO_ITEMS', message: 'No items produced.' }] };
    }
    var items = content.items;
    items.forEach(function(it, i) {
      if (!it || typeof it !== 'object') {
        issues.push({ code: 'MALFORMED_ITEM', itemIndex: i, message: 'Item ' + (i + 1) + ' is not a valid object.' });
        return;
      }
      if (!it.event || !String(it.event).trim()) {
        issues.push({ code: 'EMPTY_EVENT', itemIndex: i, message: 'Item ' + (i + 1) + ' has no event text.' });
      }
      if (!it.date || !String(it.date).trim()) {
        issues.push({ code: 'EMPTY_DATE', itemIndex: i, message: 'Item ' + (i + 1) + ' has no position/date value.' });
      }
    });
    var dateCounts = {};
    items.forEach(function(it, i) {
      var d = String((it && it.date) || '').trim().toLowerCase();
      if (!d) return;
      if (!dateCounts[d]) dateCounts[d] = [];
      dateCounts[d].push(i);
    });
    Object.keys(dateCounts).forEach(function(d) {
      var indices = dateCounts[d];
      if (indices.length > 1) {
        issues.push({
          code: 'DUPLICATE_DATE',
          itemIndex: indices[0],
          message: 'Items ' + indices.map(function(x) { return x + 1; }).join(', ') + ' all share the same position "' + d + '". Positions must be unique.'
        });
      }
    });
    var withDateEn = items.filter(function(it) { return it && it.date_en; }).length;
    var withEventEn = items.filter(function(it) { return it && it.event_en; }).length;
    if (withDateEn > 0 && withDateEn < items.length) {
      issues.push({ code: 'PARTIAL_EN_DATE', message: withDateEn + ' of ' + items.length + ' items have date_en — should be all or none.' });
    }
    if (withEventEn > 0 && withEventEn < items.length) {
      issues.push({ code: 'PARTIAL_EN_EVENT', message: withEventEn + ' of ' + items.length + ' items have event_en — should be all or none.' });
    }
    var norm = function(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(); };
    var jaccard = function(a, b) {
      var sa = new Set(norm(a).split(/\s+/).filter(Boolean));
      var sb = new Set(norm(b).split(/\s+/).filter(Boolean));
      if (sa.size === 0 || sb.size === 0) return 0;
      var inter = 0;
      sa.forEach(function(t) { if (sb.has(t)) inter++; });
      return inter / (sa.size + sb.size - inter);
    };
    for (var i = 0; i < items.length; i++) {
      for (var j = i + 1; j < items.length; j++) {
        var sim = jaccard(items[i] && items[i].event, items[j] && items[j].event);
        if (sim >= 0.85) {
          issues.push({
            code: 'NEAR_DUPLICATE',
            itemIndex: i,
            message: 'Items ' + (i + 1) + ' and ' + (j + 1) + ' are nearly identical. Students can\'t tell them apart.'
          });
        }
      }
    }
    if (mode === 'chronological') {
      var parseYear = function(s) {
        var str = String(s || '');
        var neg = /bce|bc\b/i.test(str) ? -1 : 1;
        var m = str.match(/-?\d{1,5}/);
        if (!m) return null;
        return parseInt(m[0], 10) * neg;
      };
      var parsed = items.map(function(it) { return parseYear(it && it.date); });
      var parsedOk = parsed.filter(function(x) { return x !== null; }).length;
      if (parsedOk >= items.length - 1) {
        var nonMono = 0;
        for (var k = 1; k < parsed.length; k++) {
          if (parsed[k - 1] !== null && parsed[k] !== null && parsed[k - 1] > parsed[k]) nonMono++;
        }
        if (nonMono > 0) {
          issues.push({ code: 'NON_MONOTONIC_DATES', message: nonMono + ' chronological step(s) go backward in time — dates aren\'t in order.' });
        }
      }
    }
    if (mode === 'procedural') {
      var stepNums = items.map(function(it) {
        var m = String((it && it.date) || '').match(/step\s*(\d+)/i);
        return m ? parseInt(m[1], 10) : null;
      });
      if (stepNums.filter(function(x) { return x !== null; }).length >= items.length - 1) {
        var first = stepNums.find(function(x) { return x !== null; });
        if (first !== 1) {
          issues.push({ code: 'STEPS_NOT_STARTING_AT_1', message: 'Procedural steps should start at "Step 1".' });
        }
        var gap = false;
        for (var s = 1; s < stepNums.length; s++) {
          if (stepNums[s] !== null && stepNums[s - 1] !== null && stepNums[s] !== stepNums[s - 1] + 1) gap = true;
        }
        if (gap) issues.push({ code: 'STEP_GAP', message: 'Procedural step numbers have gaps or repeats.' });
      }
    }
    if (mode === 'narrative') {
      var order = ['exposition', 'rising', 'climax', 'falling', 'resolution', 'denouement'];
      var stageIdx = items.map(function(it) {
        var d = String((it && it.date) || '').toLowerCase();
        return order.findIndex(function(stg) { return d.indexOf(stg) !== -1; });
      });
      var labeled = stageIdx.filter(function(x) { return x !== -1; });
      if (labeled.length >= 3) {
        for (var n = 1; n < stageIdx.length; n++) {
          if (stageIdx[n] !== -1 && stageIdx[n - 1] !== -1 && stageIdx[n] < stageIdx[n - 1]) {
            issues.push({ code: 'NARRATIVE_OUT_OF_ORDER', message: 'Narrative stages aren\'t in order (exposition → rising → climax → falling → resolution).' });
            break;
          }
        }
      }
    }
    return { ok: issues.length === 0, issues: issues };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // handleExplainTimelineItem(item, correctPosition, currentPosition, progressionLabel, allItems)
  // Simple callGemini wrapper. Returns a 2-3 sentence student explanation.
  // ──────────────────────────────────────────────────────────────────────────
  async function handleExplainTimelineItem(item, correctPosition, currentPosition, progressionLabel, allItems) {
    try {
      var cleanLabel = progressionLabel || 'Sequential order';
      var neighborHint = (function() {
        if (!Array.isArray(allItems) || correctPosition < 0) return '';
        var before = correctPosition > 0 ? allItems[correctPosition - 1] : null;
        var after = correctPosition < allItems.length - 1 ? allItems[correctPosition + 1] : null;
        var parts = [];
        if (before) parts.push('comes AFTER "' + before.event + '" (' + (before.date || '') + ')');
        if (after) parts.push('comes BEFORE "' + after.event + '" (' + (after.date || '') + ')');
        return parts.length ? 'Context: in the correct sequence, "' + item.event + '" ' + parts.join(' and ') + '.' : '';
      })();
      var prompt = '\n' +
        '            A ' + gradeLevel + ' student placed the item "' + item.event + '" (' + (item.date || '') + ') at position ' + (currentPosition + 1) + ', but the correct position is ' + (correctPosition + 1) + '.\n' +
        '            The ordering criterion is: ' + cleanLabel + '.\n' +
        '            ' + neighborHint + '\n' +
        '            Write a brief, supportive 2-3 sentence explanation for the student.\n' +
        '            IMPORTANT: The student got this WRONG. Do NOT open with "Great job", "Nice work", or any positive affirmation — those read as sarcastic when paired with corrective feedback. Open with a warm but honest framing like "Close — but actually..." or "Let\'s look at this one together..."\n' +
        '            - State the correct position and why.\n' +
        '            - Reference the ordering criterion (date, size, step, etc.) with specifics.\n' +
        '            - Acknowledge the mistake kindly; stay warm and instructive; never shame.\n' +
        '            Hard limit: 320 characters.\n' +
        '            Return plain text only, no markdown, no quotes, no headers.\n' +
        '          ';
      var raw = await callGemini(prompt, false);
      return (raw || '').trim();
    } catch (e) {
      warnLog("Explain timeline item failed", e);
      return "Couldn't generate an explanation right now. Try again in a moment.";
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 2: stateful handlers. Each takes a ctx object with live state +
  // setters + utilities. Callers in AlloFlowANTI.txt declare wrapper closures
  // inside the React functional component (fresh each render → no stale state).
  // ──────────────────────────────────────────────────────────────────────────

  async function handleTimelineRevision(ctx) {
    var input = ctx.input;
    var generatedContent = ctx.generatedContent;
    var includeTimelineVisuals = ctx.includeTimelineVisuals;
    var timelineImageStyle = ctx.timelineImageStyle || '';
    var TIMELINE_MODE_DEFINITIONS = ctx.TIMELINE_MODE_DEFINITIONS || {};
    var t = ctx.t;
    var cleanJson = ctx.cleanJson;
    var addToast = ctx.addToast;
    var callImagen = ctx.callImagen;
    var setGeneratedContent = ctx.setGeneratedContent;
    var setHistory = ctx.setHistory;
    var setIsRevisingTimeline = ctx.setIsRevisingTimeline;
    var setTimelineRevisionInput = ctx.setTimelineRevisionInput;

    if (!input || !input.trim() || !generatedContent || !generatedContent.data) return;
    setIsRevisingTimeline(true);
    try {
      var currentData = generatedContent.data;
      var currentItems = Array.isArray(currentData) ? currentData : (currentData.items || []);
      var currentProgressionLabel = currentData.progressionLabel || (t && t('timeline.progression_label_default')) || 'Sequential order';
      var currentProgressionLabelEn = (!Array.isArray(currentData) && currentData.progressionLabel_en) || null;
      var currentMode = (!Array.isArray(currentData) && currentData.mode) || null;
      var currentAutoDetected = (!Array.isArray(currentData) && currentData.autoDetected) || false;
      var currentModeDef = currentMode ? TIMELINE_MODE_DEFINITIONS[currentMode] : null;
      var modeRule = currentMode
          ? (currentAutoDetected
              ? 'The current mode is "' + ((currentModeDef && currentModeDef.label) || currentMode) + '" (auto-detected). If the user\'s instructions imply a different mode (e.g. "sort by cause and effect instead"), switch modes and return "detectedMode": "<new>". Otherwise keep "' + currentMode + '".'
              : 'The current mode is "' + ((currentModeDef && currentModeDef.label) || currentMode) + '" (locked by teacher). Maintain this ordering criterion. Only change if the user\'s instructions explicitly request a mode switch; if so, return "detectedMode": "<new>". The progressionLabel should match the template: "' + ((currentModeDef && currentModeDef.labelTemplate) || currentProgressionLabel) + '".')
          : '';
      var safeInstructions = JSON.stringify(input.trim());
      var prompt = '\nYou are an AI assistant helping to revise a sequence/timeline.\n' +
        'The user has a sequence with this ordering principle: ' + JSON.stringify(currentProgressionLabel) + '.\n' +
        modeRule + '\n' +
        'Current sequence items:\n' +
        JSON.stringify(currentItems, null, 2) + '\n' +
        'User\'s revision instructions: ' + safeInstructions + '\n' +
        'IMPORTANT RULES:\n' +
        '1. Apply the user\'s revision instructions to modify the sequence\n' +
        '2. Maintain the same progressionLabel format unless the user explicitly asks to change it\n' +
        '3. Keep the same JSON structure with progressionLabel and items array\n' +
        '4. Each item must have "date" (position on axis) and "event" (description) fields\n' +
        '5. ' + (currentProgressionLabelEn ? 'The original has progressionLabel_en — you MUST include an updated progressionLabel_en that matches the new progressionLabel.' : 'No progressionLabel_en needed.') + '\n' +
        '6. ' + (currentItems[0] && currentItems[0].event_en ? 'The original items have _en translations (date_en, event_en) — preserve or translate them for every item.' : '') + '\n' +
        'Return ONLY a valid JSON object:\n' +
        '{\n' +
        '    ' + (currentMode ? '"detectedMode": "<mode key if changed, else omit>",' : '') + '\n' +
        '    "progressionLabel": "Y-axis ordering principle",\n' +
        '    ' + (currentProgressionLabelEn ? '"progressionLabel_en": "English translation",' : '') + '\n' +
        '    "items": [\n' +
        '        {\n' +
        '            "date": "Position/Value",\n' +
        '            ' + (currentItems[0] && currentItems[0].date_en ? '"date_en": "...",' : '') + '\n' +
        '            "event": "Description"\n' +
        '            ' + (currentItems[0] && currentItems[0].event_en ? ',"event_en": "..."' : '') + '\n' +
        '        }\n' +
        '    ]\n' +
        '}\n';
      var result = await callGemini(prompt, true);
      var parsed = JSON.parse(cleanJson(result));
      var revisedItemsRaw = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : currentItems;
      var revisedItems = revisedItemsRaw.map(function(it) {
        var rest = {};
        Object.keys(it).forEach(function(k) { if (k !== 'image') rest[k] = it[k]; });
        return rest;
      });
      var labelChanged = parsed.progressionLabel && parsed.progressionLabel !== currentProgressionLabel;
      var revisedLabelEn = parsed.progressionLabel_en
        ? parsed.progressionLabel_en
        : (labelChanged ? null : currentProgressionLabelEn);
      var revisedMode = (parsed.detectedMode && TIMELINE_MODE_DEFINITIONS[parsed.detectedMode])
        ? parsed.detectedMode
        : currentMode;
      var revisedAutoDetected = (parsed.detectedMode && parsed.detectedMode !== currentMode)
        ? false
        : currentAutoDetected;
      var revisedData = {
        progressionLabel: parsed.progressionLabel || currentProgressionLabel,
        progressionLabel_en: revisedLabelEn,
        items: revisedItems,
        mode: revisedMode,
        autoDetected: revisedAutoDetected
      };
      setGeneratedContent(function(prev) { return Object.assign({}, prev, { data: revisedData }); });
      addToast((t && t('timeline.revision_success')) || 'Sequence revised successfully!', 'success');
      setTimelineRevisionInput('');
      if (includeTimelineVisuals && revisedItems.length > 0) {
        addToast((t && t('timeline.visuals.regenerating_batch')) || 'Regenerating visuals...', 'info');
        var POOL_SIZE = 5;
        var MAX_RETRIES = 3;
        var progression = revisedData.progressionLabel || 'sequential order';
        var failCount = 0;
        var generateOne = async function(item) {
          var styleInstruction = timelineImageStyle.trim() ? 'Style: ' + timelineImageStyle + '.' : 'Educational style.';
          var imgPrompt = 'Simple vector icon/illustration of: "' + item.event + '" (sequence position: "' + (item.date || '') + '"). Context: part of a sequence ordered by ' + progression + '. White background. ' + styleInstruction + ' No text. Visual only.';
          for (var attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) await new Promise(function(r) { setTimeout(r, 1000 * Math.pow(2, attempt)); });
              var imageUrl = await callImagen(imgPrompt);
              return Object.assign({}, item, { image: imageUrl });
            } catch (e) {
              if (attempt === MAX_RETRIES - 1) { failCount++; warnLog('Post-revise image gen failed', e); return item; }
            }
          }
          return item;
        };
        var output = new Array(revisedItems.length);
        for (var ii = 0; ii < revisedItems.length; ii += POOL_SIZE) {
          var batch = revisedItems.slice(ii, ii + POOL_SIZE);
          var results = await Promise.all(batch.map(generateOne));
          results.forEach(function(r, jj) { output[ii + jj] = r; });
        }
        setGeneratedContent(function(prev) {
          if (!prev || prev.type !== 'timeline') return prev;
          var nextData = Object.assign({}, prev.data || {}, {
            items: output,
            progressionLabel: revisedData.progressionLabel,
            progressionLabel_en: revisedData.progressionLabel_en,
            mode: revisedData.mode,
            autoDetected: revisedData.autoDetected
          });
          var updated = Object.assign({}, prev, { data: nextData });
          setHistory(function(h) { return h.map(function(item) { return item.id === prev.id ? updated : item; }); });
          return updated;
        });
        if (failCount > 0) {
          var msg = t && t('timeline.visuals.failed', { failed: failCount, total: output.length });
          addToast((msg && msg !== 'timeline.visuals.failed') ? msg : failCount + ' of ' + output.length + ' visuals couldn\'t be generated.', 'warning');
        }
      }
    } catch (error) {
      warnLog("Timeline Revision Error:", error);
      addToast((t && t('timeline.revision_error')) || 'Failed to revise sequence. Please try again.', 'error');
    } finally {
      setIsRevisingTimeline(false);
    }
  }

  async function handleAutoFixTimeline(ctx) {
    var generatedContent = ctx.generatedContent;
    var TIMELINE_MODE_DEFINITIONS = ctx.TIMELINE_MODE_DEFINITIONS || {};
    var t = ctx.t;
    var cleanJson = ctx.cleanJson;
    var addToast = ctx.addToast;
    var setGeneratedContent = ctx.setGeneratedContent;
    var setHistory = ctx.setHistory;
    var setIsAutoFixingTimeline = ctx.setIsAutoFixingTimeline;

    if (!generatedContent || generatedContent.type !== 'timeline') return;
    var data = generatedContent.data;
    if (Array.isArray(data) || !Array.isArray(data.validationIssues) || data.validationIssues.length === 0) return;
    setIsAutoFixingTimeline(true);
    try {
      var issueList = data.validationIssues.map(function(iss, i) { return (i + 1) + '. ' + iss.message; }).join('\n');
      var progression = data.progressionLabel || 'sequential order';
      var modeLbl = data.mode && TIMELINE_MODE_DEFINITIONS[data.mode] ? TIMELINE_MODE_DEFINITIONS[data.mode].label : 'sequence';
      var currentJson = JSON.stringify(data.items, null, 2);
      var prompt = '\nYou are fixing validation issues in a ' + modeLbl + ' sequence ordered by "' + progression + '".\n' +
        'Current items:\n' + currentJson + '\n' +
        'Problems to fix:\n' + issueList + '\n' +
        'Return ONLY valid JSON with the same structure, with the specific problems resolved:\n' +
        '{\n' +
        '    "items": [ { "date": "...", "event": "..."' + (data.items[0] && data.items[0].date_en ? ', "date_en": "..."' : '') + (data.items[0] && data.items[0].event_en ? ', "event_en": "..."' : '') + ' } ]\n' +
        '}\n' +
        'Keep the same number of items and same overall content scope — just fix the listed problems.\n';
      var result = await callGemini(prompt, true);
      var parsed = JSON.parse(cleanJson(result));
      var newItems = Array.isArray(parsed.items) && parsed.items.length > 0 ? parsed.items : data.items;
      var merged = newItems.map(function(it, i) {
        var original = data.items[i];
        return original && original.image ? Object.assign({}, it, { image: original.image }) : it;
      });
      var newData = Object.assign({}, data, { items: merged });
      var revalid = validateSequenceStructure(newData, data.mode);
      if (!revalid.ok) {
        newData.validationIssues = revalid.issues;
        addToast((t && t('timeline.validation.partial_fix', { remaining: revalid.issues.length })) || ('Fixed some issues, ' + revalid.issues.length + ' remain.'), 'warning');
      } else {
        delete newData.validationIssues;
        addToast((t && t('timeline.validation.all_fixed')) || 'All validation issues fixed.', 'success');
      }
      var updated = Object.assign({}, generatedContent, { data: newData });
      setGeneratedContent(updated);
      setHistory(function(prev) { return prev.map(function(item) { return item.id === generatedContent.id ? updated : item; }); });
    } catch (e) {
      warnLog('Timeline auto-fix failed:', e);
      addToast((t && t('timeline.validation.fix_failed')) || "Couldn't auto-fix. Please revise manually.", 'error');
    } finally {
      setIsAutoFixingTimeline(false);
    }
  }

  async function handleVerifyTimelineAccuracy(ctx) {
    var generatedContent = ctx.generatedContent;
    var TIMELINE_MODE_DEFINITIONS = ctx.TIMELINE_MODE_DEFINITIONS || {};
    var gradeLevelLive = ctx.gradeLevel || gradeLevel;
    var t = ctx.t;
    var cleanJson = ctx.cleanJson;
    var addToast = ctx.addToast;
    var setGeneratedContent = ctx.setGeneratedContent;
    var setHistory = ctx.setHistory;
    var setIsVerifyingTimeline = ctx.setIsVerifyingTimeline;

    if (!generatedContent || generatedContent.type !== 'timeline') return;
    var data = generatedContent.data;
    var items = Array.isArray(data) ? data : (data && data.items) || [];
    if (items.length === 0) return;
    setIsVerifyingTimeline(true);
    try {
      var modeLbl = (!Array.isArray(data) && data.mode && TIMELINE_MODE_DEFINITIONS[data.mode]) ? TIMELINE_MODE_DEFINITIONS[data.mode].label : 'sequence';
      var progression = (!Array.isArray(data) && data.progressionLabel) || 'sequential order';
      var itemsJson = items.map(function(it, i) { return { index: i, date: it.date, event: it.event }; });
      var prompt = '\nYou are verifying a ' + modeLbl + ' sequence ordered by "' + progression + '".\n' +
        'Target grade level: ' + gradeLevelLive + '.\n' +
        'For each item, assess:\n' +
        '  - "isFactuallyAccurate": boolean — are the factual claims (dates, names, values) correct?\n' +
        '  - "isPositionCorrect": boolean — does it belong at this position on the ' + modeLbl + ' axis?\n' +
        '  - "concern": string — if either is false, a short (≤100 chars) explanation; else empty string.\n' +
        '  - "rationale": string — ALWAYS populated. 1–2 sentences explaining what you checked and why this item is (or is not) correct at this position. Include any specific facts, dates, or reasoning you relied on. ≤300 chars.\n' +
        'Items:\n' + JSON.stringify(itemsJson, null, 2) + '\n' +
        'Return ONLY a JSON array like:\n' +
        '[{"index": 0, "isFactuallyAccurate": true, "isPositionCorrect": true, "concern": "", "rationale": "Verified the date 1969 against historical Apollo 11 records; this is correctly placed as the first crewed Moon landing."}, ...]\n';
      var result = await callGemini(prompt, true);
      var parsed = JSON.parse(cleanJson(result));
      if (!Array.isArray(parsed)) throw new Error('Invalid verification response');
      var verdictByIndex = {};
      parsed.forEach(function(v) {
        if (typeof v.index === 'number') verdictByIndex[v.index] = {
          factual: v.isFactuallyAccurate !== false,
          position: v.isPositionCorrect !== false,
          concern: String(v.concern || '').substring(0, 200),
          rationale: String(v.rationale || '').substring(0, 400)
        };
      });
      var newItems = items.map(function(it, i) {
        var v = verdictByIndex[i];
        if (!v) return it;
        return Object.assign({}, it, { verification: v });
      });
      var newData = Array.isArray(data) ? newItems : Object.assign({}, data, { items: newItems });
      var updated = Object.assign({}, generatedContent, { data: newData });
      setGeneratedContent(updated);
      setHistory(function(prev) { return prev.map(function(item) { return item.id === generatedContent.id ? updated : item; }); });
      var concerns = parsed.filter(function(v) { return v.isFactuallyAccurate === false || v.isPositionCorrect === false; }).length;
      if (concerns === 0) {
        addToast((t && t('timeline.validation.verified_clean')) || 'Verified: all items look accurate.', 'success');
      } else {
        addToast((t && t('timeline.validation.verified_concerns', { count: concerns })) || ('Verified: ' + concerns + ' item(s) flagged. Review badges for details.'), 'warning');
      }
    } catch (e) {
      warnLog('Timeline verification failed:', e);
      addToast((t && t('timeline.validation.verify_failed')) || "Couldn't run accuracy check. Try again later.", 'error');
    } finally {
      setIsVerifyingTimeline(false);
    }
  }

  async function handleGenerateTimelineItemImage(ctx) {
    var index = ctx.index;
    var event = ctx.event;
    var date = ctx.date;
    var customPromptOverride = ctx.customPromptOverride;
    var generatedContent = ctx.generatedContent;
    var timelineImageStyle = ctx.timelineImageStyle || '';
    var autoRemoveWords = ctx.autoRemoveWords;
    var t = ctx.t;
    var addToast = ctx.addToast;
    var callImagen = ctx.callImagen;
    var callGeminiImageEdit = ctx.callGeminiImageEdit;
    var setGeneratedContent = ctx.setGeneratedContent;
    var setHistory = ctx.setHistory;
    var setIsGeneratingTimelineImage = ctx.setIsGeneratingTimelineImage;

    if (!generatedContent || generatedContent.type !== 'timeline') return;
    setIsGeneratingTimelineImage(function(prev) { var next = Object.assign({}, prev); next[index] = true; return next; });
    var hangGuard = setTimeout(function() {
      setIsGeneratingTimelineImage(function(prev) { var next = Object.assign({}, prev); next[index] = false; return next; });
      warnLog('Timeline image hang guard tripped for:', event);
    }, 30000);
    try {
      var data = generatedContent.data;
      var isArrayShape = Array.isArray(data);
      var progression = (!isArrayShape && data && data.progressionLabel) || 'sequential order';
      var styleInstruction = timelineImageStyle.trim() ? 'Style: ' + timelineImageStyle + '.' : 'Educational style.';
      var imgPrompt = 'Simple vector icon/illustration of: "' + event + '" (sequence position: "' + (date || '') + '"). Context: part of a sequence ordered by ' + progression + '. White background. ' + styleInstruction + ' No text. Visual only.';
      var imageUrl;
      if (customPromptOverride) {
        var prevItems = isArrayShape ? data : ((data && data.items) || []);
        var existingItem = prevItems.find(function(it) { return it && it.event === event; });
        var existing = existingItem && existingItem.image;
        if (existing) {
          try {
            var rawBase64 = existing.split(',')[1];
            imageUrl = await callGeminiImageEdit(customPromptOverride, rawBase64);
          } catch (refineErr) {
            warnLog('Timeline refine edit failed, falling back to regen:', event, refineErr);
          }
        } else {
          warnLog('Timeline refine called with no existing image; falling through to regenerate:', event);
        }
      }
      if (!imageUrl) {
        imageUrl = await callImagen(imgPrompt);
        if (autoRemoveWords) {
          try {
            var rawBase64_2 = imageUrl.split(',')[1];
            var editPrompt = "Remove all text, labels, letters, and words from the image. Keep the illustration clean.";
            imageUrl = await callGeminiImageEdit(editPrompt, rawBase64_2);
          } catch (editErr) {
            warnLog("Auto-remove text failed for timeline item:", event, editErr);
          }
        }
      }
      setGeneratedContent(function(prev) {
        if (!prev || prev.type !== 'timeline') return prev;
        var prevData = prev.data;
        var prevIsArray = Array.isArray(prevData);
        var prevItems = prevIsArray ? prevData : ((prevData && prevData.items) || []);
        var liveIdx = prevItems.findIndex(function(it) { return it && it.event === event; });
        if (liveIdx === -1) {
          warnLog('Timeline item no longer exists, discarding image for:', event);
          return prev;
        }
        var nextItems = prevItems.slice();
        nextItems[liveIdx] = Object.assign({}, nextItems[liveIdx], { image: imageUrl });
        var nextData = prevIsArray ? nextItems : Object.assign({}, prevData, { items: nextItems });
        var updated = Object.assign({}, prev, { data: nextData });
        setHistory(function(h) { return h.map(function(item) { return item.id === prev.id ? updated : item; }); });
        return updated;
      });
      addToast((t && t('timeline.visuals.regen_success')) || 'Image updated.', 'success');
    } catch (e) {
      warnLog('Timeline image regen failed', e);
      addToast((t && t('timeline.visuals.regen_failed')) || "Couldn't regenerate image right now.", 'error');
    } finally {
      clearTimeout(hangGuard);
      setIsGeneratingTimelineImage(function(prev) { var next = Object.assign({}, prev); next[index] = false; return next; });
    }
  }

  return {
    validateSequenceStructure: validateSequenceStructure,
    handleExplainTimelineItem: handleExplainTimelineItem,
    handleTimelineRevision: handleTimelineRevision,
    handleAutoFixTimeline: handleAutoFixTimeline,
    handleVerifyTimelineAccuracy: handleVerifyTimelineAccuracy,
    handleGenerateTimelineItemImage: handleGenerateTimelineItemImage
  };
};

// Expose factory on window.AlloModules
window.AlloModules = window.AlloModules || {};
window.AlloModules.createTimelineRevision = createTimelineRevision;
window.AlloModules.TimelineRevisionModule = true;
console.log('[TimelineRevisionModule] Factory registered');
})();
