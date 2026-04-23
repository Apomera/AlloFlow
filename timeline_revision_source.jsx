// timeline_revision_source.jsx — Timeline / Sequence Builder utilities
// Pure-function extraction + simple AI-call wrapper. No hooks; factory pattern.
// Source of truth; compiled to timeline_revision_module.js (hand-maintained IIFE wrap).
//
// Phase 1 scope (intentionally small):
//   - validateSequenceStructure: pure validator for timeline/sequence content.
//   - handleExplainTimelineItem: AI-call wrapper that generates a student-facing
//     explanation for why an item belongs at a specific sequence position.
//
// Phase 2 candidates (stateful handlers, deferred):
//   - handleTimelineRevision (125 lines, complex state)
//   - handleAutoFixTimeline, handleVerifyTimelineAccuracy, handleGenerateTimelineItemImage

var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };

var createTimelineRevision = function(deps) {
  var callGemini = deps.callGemini;
  var gradeLevel = deps.gradeLevel || 'Grade 5';

  // ──────────────────────────────────────────────────────────────────────────
  // validateSequenceStructure(content, mode)
  // Pure function. Returns { ok: bool, issues: [{ code, itemIndex?, message }] }
  //
  // Structural validation for Sequence Builder output. Checks:
  //   - Items present and well-formed
  //   - No duplicate positions
  //   - Consistent bilingual (_en) coverage if any items have it
  //   - Near-duplicate detection via Jaccard similarity
  //   - Monotonic dates for 'chronological' mode
  //   - Sequential step numbers for 'procedural' mode
  //   - Stage ordering for 'narrative' mode
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
  // Simple callGemini wrapper. Returns a short, encouraging 2-3 sentence student
  // explanation of why an item belongs at its correct position on the sequence.
  // Used by TimelineGame (in games_module.js) via its onExplainIncorrect prop.
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
        '            Write a brief, encouraging 2-3 sentence explanation for the student.\n' +
        '            - State the correct position and why.\n' +
        '            - Reference the ordering criterion (date, size, step, etc.) with specifics.\n' +
        '            - Avoid shaming language; stay warm and instructive.\n' +
        '            Hard limit: 280 characters.\n' +
        '            Return plain text only, no markdown, no quotes, no headers.\n' +
        '          ';
      var raw = await callGemini(prompt, false);
      return (raw || '').trim();
    } catch (e) {
      warnLog("Explain timeline item failed", e);
      return "Couldn't generate an explanation right now. Try again in a moment.";
    }
  }

  return {
    validateSequenceStructure: validateSequenceStructure,
    handleExplainTimelineItem: handleExplainTimelineItem
  };
};

// Expose factory on window.AlloModules
window.AlloModules = window.AlloModules || {};
window.AlloModules.createTimelineRevision = createTimelineRevision;
window.AlloModules.TimelineRevisionModule = true;
console.log('[TimelineRevisionModule] Factory registered');
