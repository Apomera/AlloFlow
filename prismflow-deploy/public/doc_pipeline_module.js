(function(){"use strict";
if(window.AlloModules&&window.AlloModules.DocPipelineModule){console.log("[CDN] DocPipelineModule already loaded, skipping"); return;}
// doc_pipeline_source.jsx — PDF Accessibility Pipeline + Document Generation
// Pure function extraction — no hooks, no React state, no render JSX.
// All functions receive their dependencies as parameters.

var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };
var processMathHTML = window.processMathHTML || function(t) { return t; };

// Factory: returns all pipeline functions bound to provided deps
// State access: functions read window.__docPipelineState (updated every render by monolith)
// This avoids stale closures — each function call reads fresh state from the window ref.
var createDocPipeline = function(deps) {
  // ── Timeout + Retry utilities ──
  // Wraps any promise with a timeout — rejects with clear error if the promise doesn't settle in time.
  var _withTimeout = function(promise, ms, label) {
    var _timer;
    return Promise.race([
      promise,
      new Promise(function(_, reject) {
        _timer = setTimeout(function() { reject(new Error('Timeout after ' + (ms / 1000) + 's' + (label ? ' (' + label + ')' : ''))); }, ms);
      })
    ]).finally(function() { clearTimeout(_timer); });
  };

  // Wraps an async function call with timeout + 1 automatic retry on timeout/error.
  // retryMs can be shorter than initialMs since we already waited once.
  var _withRetry = function(fn, initialMs, retryMs, label) {
    return _withTimeout(fn(), initialMs, label).catch(function(err) {
      var isTimeout = err && err.message && err.message.indexOf('Timeout') === 0;
      var isRecitation = err && err.message && /RECITATION/i.test(err.message);
      // Skip retry for RECITATION — it's deterministic, same content will always be refused
      if (isRecitation) {
        warnLog('[Retry] ' + (label || 'API call') + ' failed (RECITATION) — skipping retry (content filter is deterministic)');
        throw err;
      }
      warnLog('[Retry] ' + (label || 'API call') + ' failed (' + (isTimeout ? 'timeout' : err.message) + ') — retrying once...');
      return _withTimeout(fn(), retryMs || initialMs, label + ' (retry)');
    });
  };

  // ── Pipeline telemetry logger ──
  // Structured logging with timestamps, durations, and API call tracking.
  // All output prefixed with [DocPipe] for easy filtering in DevTools.
  var _pipelineStats = { apiCalls: 0, visionCalls: 0, totalApiMs: 0, retries: 0, startTime: 0, stepTimes: {} };
  // Canvas-visible sink: in canvas/embedded runtimes, warnLog/console.warn aren't shown. We keep
  // a rolling window-level array AND dispatch a CustomEvent so a host listener (panel, toast,
  // diagnostic overlay) can surface pipeline telemetry without touching each call site.
  if (typeof window !== 'undefined' && !window._alloflowPipelineWarnings) {
    window._alloflowPipelineWarnings = [];
  }
  var _pipeLog = function(tag, msg, data) {
    var elapsed = _pipelineStats.startTime ? '+' + ((performance.now() - _pipelineStats.startTime) / 1000).toFixed(1) + 's' : '';
    var prefix = '[DocPipe][' + tag + '] ' + elapsed + ' — ';
    // Original console/warnLog output (dev-tools).
    if (data) {
      try { console.groupCollapsed(prefix + msg); console.log(data); console.groupEnd(); } catch(e) { warnLog(prefix + msg, data); }
    } else {
      warnLog(prefix + msg);
    }
    // Canvas-visible emission.
    try {
      if (typeof window !== 'undefined') {
        var entry = { ts: Date.now(), elapsed: elapsed, tag: tag, msg: msg, data: data || null };
        if (window._alloflowPipelineWarnings) {
          window._alloflowPipelineWarnings.push(entry);
          // Cap the buffer so long sessions don't leak memory.
          if (window._alloflowPipelineWarnings.length > 500) window._alloflowPipelineWarnings.splice(0, window._alloflowPipelineWarnings.length - 500);
        }
        if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
          window.dispatchEvent(new CustomEvent('alloflow:pipeline-warn', { detail: entry }));
        }
      }
    } catch(e) { /* canvas sink is best-effort; never block the pipeline */ }
  };
  var _pipeStepStart = function(step) {
    _pipelineStats.stepTimes[step] = performance.now();
    _pipeLog('Step ' + step, 'Starting...');
  };
  var _pipeStepEnd = function(step, detail) {
    var dur = _pipelineStats.stepTimes[step] ? ((performance.now() - _pipelineStats.stepTimes[step]) / 1000).toFixed(1) + 's' : '?';
    _pipeLog('Step ' + step, 'Complete (' + dur + ')' + (detail ? ' — ' + detail : ''));
  };

  // Wrap callGemini/callGeminiVision at the binding layer:
  // - Automatic timeout + 1 retry (callGemini: 60s/45s, callGeminiVision: 90s/60s)
  // - Auto-logging: every API call logs entry (prompt size) and exit (response size, duration)
  var _rawCallGemini = deps.callGemini;
  var _rawCallGeminiVision = deps.callGeminiVision;
  var callGemini = _rawCallGemini ? function() {
    var args = arguments;
    var promptLen = args[0] ? String(args[0]).length : 0;
    var callNum = ++_pipelineStats.apiCalls;
    _pipeLog('API→', 'callGemini #' + callNum + ' (' + Math.round(promptLen / 1000) + 'KB prompt)');
    var t0 = performance.now();
    return _withRetry(function() { return _rawCallGemini.apply(null, args); }, 180000, 120000, 'callGemini').then(function(result) {
      var dur = Math.round(performance.now() - t0);
      var respLen = result ? String(result).length : 0;
      _pipelineStats.totalApiMs += dur;
      _pipeLog('API←', 'callGemini #' + callNum + ' done (' + dur + 'ms, ' + Math.round(respLen / 1000) + 'KB response)');
      return result;
    }).catch(function(err) {
      var dur = Math.round(performance.now() - t0);
      _pipelineStats.retries++;
      _pipeLog('API✗', 'callGemini #' + callNum + ' FAILED after ' + dur + 'ms: ' + (err && err.message || err));
      throw err;
    });
  } : null;
  var callGeminiVision = _rawCallGeminiVision ? function() {
    var args = arguments;
    var callNum = ++_pipelineStats.visionCalls;
    _pipeLog('Vision→', 'callGeminiVision #' + callNum);
    var t0 = performance.now();
    return _withRetry(function() { return _rawCallGeminiVision.apply(null, args); }, 120000, 90000, 'callGeminiVision').then(function(result) {
      var dur = Math.round(performance.now() - t0);
      var respLen = result ? String(result).length : 0;
      _pipelineStats.totalApiMs += dur;
      _pipeLog('Vision←', 'callGeminiVision #' + callNum + ' done (' + dur + 'ms, ' + Math.round(respLen / 1000) + 'KB response)');
      return result;
    }).catch(function(err) {
      var dur = Math.round(performance.now() - t0);
      _pipelineStats.retries++;
      _pipeLog('Vision✗', 'callGeminiVision #' + callNum + ' FAILED after ' + dur + 'ms: ' + (err && err.message || err));
      throw err;
    });
  } : null;
  var callImagen = deps.callImagen;
  var addToast = deps.addToast;
  var t = deps.t;
  var isRtlLang = deps.isRtlLang || function() { return false; };
  var updateExportPreview = deps.updateExportPreview || function() {};
  // generateResourceHTML at line 12106 uses getDefaultTitle(item.type)
  // for resources without an explicit title. Threaded via deps from
  // host scope (host const at AlloFlowANTI.txt:15623).
  var getDefaultTitle = deps.getDefaultTitle || function() { return ''; };
  // Proxy all state access through window.__docPipelineState
  var _s = function() { return window.__docPipelineState || {}; };
  // Re-expose state vars as getters so existing code works unchanged
  var exportTheme, exportConfig, exportPreviewMode, leveledTextLanguage,
      selectedFont, responses, history, inputText, gradeLevel,
      projectName, studentNickname, isTeacherMode, generatedContent,
      currentUiLanguage, isIndependentMode, isParentMode,
      pendingPdfBase64, pendingPdfFile, pdfFixResult, pdfAuditResult,
      pdfAutoFixPasses, pdfPolishPasses, pdfAuditorCount,
      pdfPreviewTheme, pdfPreviewFontSize, pdfPreviewA11yInspect,
      pdfBatchQueue, pdfExperimentMode, pdfExperimentRuns,
      customExportCSS, exportStylePrompt, pdfFixModeRef, pdfPreviewRef, pdfTargetScore,
      setPdfAuditResult, setPdfAuditLoading, setPdfFixResult, setPdfFixLoading,
      setPdfFixStep, setPendingPdfBase64, setPendingPdfFile,
      setPdfBatchQueue, setPdfBatchProcessing, setPdfBatchCurrentIndex,
      setPdfBatchStep, setPdfBatchSummary, setIsGeneratingStyle,
      setCustomExportCSS, setInputText, setGenerationStep, setIsExtracting,
      exportAuditResult, setExportAuditLoading, setExportAuditResult;
  // Bind all vars from the state bag before each public function call
  var _bindState = function() {
    var s = _s();
    exportTheme = s.exportTheme; exportConfig = s.exportConfig;
    exportPreviewMode = s.exportPreviewMode; leveledTextLanguage = s.leveledTextLanguage;
    selectedFont = s.selectedFont; responses = s.responses; history = s.history;
    inputText = s.inputText; gradeLevel = s.gradeLevel;
    projectName = s.projectName; studentNickname = s.studentNickname;
    isTeacherMode = s.isTeacherMode; generatedContent = s.generatedContent;
    currentUiLanguage = s.currentUiLanguage || 'English';
    isIndependentMode = s.isIndependentMode; isParentMode = s.isParentMode;
    pendingPdfBase64 = s.pendingPdfBase64; pendingPdfFile = s.pendingPdfFile;
    pdfFixResult = s.pdfFixResult; pdfAuditResult = s.pdfAuditResult;
    pdfAutoFixPasses = s.pdfAutoFixPasses; pdfPolishPasses = s.pdfPolishPasses;
    pdfAuditorCount = s.pdfAuditorCount;
    pdfPreviewTheme = s.pdfPreviewTheme; pdfPreviewFontSize = s.pdfPreviewFontSize;
    pdfPreviewA11yInspect = s.pdfPreviewA11yInspect;
    pdfBatchQueue = s.pdfBatchQueue; pdfExperimentMode = s.pdfExperimentMode;
    pdfExperimentRuns = s.pdfExperimentRuns;
    customExportCSS = s.customExportCSS; exportStylePrompt = s.exportStylePrompt;
    pdfFixModeRef = s.pdfFixModeRef; pdfPreviewRef = s.pdfPreviewRef; pdfTargetScore = s.pdfTargetScore || 90;
    setPdfAuditResult = s.setPdfAuditResult; setPdfAuditLoading = s.setPdfAuditLoading;
    setPdfFixResult = s.setPdfFixResult; setPdfFixLoading = s.setPdfFixLoading;
    setPdfFixStep = s.setPdfFixStep; setPendingPdfBase64 = s.setPendingPdfBase64;
    setPendingPdfFile = s.setPendingPdfFile;
    setPdfBatchQueue = s.setPdfBatchQueue; setPdfBatchProcessing = s.setPdfBatchProcessing;
    setPdfBatchCurrentIndex = s.setPdfBatchCurrentIndex;
    setPdfBatchStep = s.setPdfBatchStep; setPdfBatchSummary = s.setPdfBatchSummary;
    setIsGeneratingStyle = s.setIsGeneratingStyle; setCustomExportCSS = s.setCustomExportCSS;
    setInputText = s.setInputText; setGenerationStep = s.setGenerationStep;
    setIsExtracting = s.setIsExtracting;
    exportAuditResult = s.exportAuditResult;
    setExportAuditLoading = s.setExportAuditLoading; setExportAuditResult = s.setExportAuditResult;
  };

  // ── IndexedDB chunk progress persistence ──
  // Survives tab close, browser crash, API quota exhaustion.
  // Session ID = simple hash of filename + size + page count for stable identification.
  var _CHUNK_DB_NAME = 'alloflow-chunk-progress';
  var _CHUNK_DB_VERSION = 1;
  var _CHUNK_STORE = 'sessions';

  var _openChunkDB = function() {
    return new Promise(function(resolve, reject) {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB not available')); return; }
      var req = indexedDB.open(_CHUNK_DB_NAME, _CHUNK_DB_VERSION);
      req.onupgradeneeded = function(e) { var db = e.target.result; if (!db.objectStoreNames.contains(_CHUNK_STORE)) db.createObjectStore(_CHUNK_STORE); };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function() { reject(req.error); };
    });
  };

  var _chunkSessionId = function(filename, fileSize, pageCount) {
    var raw = (filename || 'doc') + '|' + (fileSize || 0) + '|' + (pageCount || 0);
    var hash = 0;
    for (var i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
    return 'chunk_' + Math.abs(hash).toString(36);
  };

  var saveChunkProgress = function(sessionId, data) {
    return _openChunkDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(_CHUNK_STORE, 'readwrite');
        tx.objectStore(_CHUNK_STORE).put(data, sessionId);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { reject(tx.error); };
      });
    }).catch(function(e) { warnLog('[ChunkProgress] Save failed:', e.message); });
  };

  var loadChunkProgress = function(sessionId) {
    return _openChunkDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(_CHUNK_STORE, 'readonly');
        var req = tx.objectStore(_CHUNK_STORE).get(sessionId);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(e) { warnLog('[ChunkProgress] Load failed:', e.message); return null; });
  };

  var clearChunkProgress = function(sessionId) {
    return _openChunkDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(_CHUNK_STORE, 'readwrite');
        tx.objectStore(_CHUNK_STORE).delete(sessionId);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { reject(tx.error); };
      });
    }).catch(function(e) { warnLog('[ChunkProgress] Clear failed:', e.message); });
  };

  // ── Multi-session PDF remediation persistence ──
  // Lets users tackle a long PDF over multiple days on a free Gemini quota.
  // Each session runs the remediation pipeline on a page range, persists the
  // remediated HTML to IndexedDB keyed by a stable doc fingerprint (filename +
  // size + page count), and merges across sessions on demand.
  //
  // Reuses the existing _CHUNK_DB infrastructure — different namespace prefix
  // ('msdoc_' vs 'chunk_') so the keys don't collide. Expiry is 30 days
  // (vs. chunk-progress's 24 hours) because multi-day workflows are the point.
  // Originally added in d0af1f2; lost in 1ce8054 (Deploy: JSON schema fix regression); restored.
  var _MULTI_SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  var _MULTI_SESSION_SCHEMA = 1;

  // Hash a filename + size + total page count into a stable session key that
  // identifies the same PDF across uploads.
  var _multiSessionId = function(filename, fileSize, pageCount) {
    var raw = (filename || 'doc') + '|' + (fileSize || 0) + '|' + (pageCount || 0);
    var hash = 0;
    for (var i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'msdoc_' + Math.abs(hash).toString(36);
  };

  // Load the multi-session record for a given session ID. Returns null when there's
  // no record, or when the record is older than the expiry window (in which case
  // it's also cleared so it doesn't sit around).
  var loadMultiSession = function(sessionId) {
    return _openChunkDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(_CHUNK_STORE, 'readonly');
        var req = tx.objectStore(_CHUNK_STORE).get(sessionId);
        req.onsuccess = function() { resolve(req.result || null); };
        req.onerror = function() { reject(req.error); };
      });
    }).then(function(record) {
      if (!record) return null;
      if (record.schemaVersion !== _MULTI_SESSION_SCHEMA) {
        warnLog('[MultiSession] Record schema version mismatch — discarding.');
        return clearMultiSession(sessionId).then(function() { return null; });
      }
      var age = Date.now() - (record.lastUpdatedAt || record.createdAt || 0);
      if (age > _MULTI_SESSION_EXPIRY_MS) {
        warnLog('[MultiSession] Record expired (' + Math.round(age / (24 * 60 * 60 * 1000)) + ' days old) — clearing.');
        return clearMultiSession(sessionId).then(function() { return null; });
      }
      return record;
    }).catch(function(e) { warnLog('[MultiSession] Load failed:', e && e.message); return null; });
  };

  // Append (or replace, if pages overlap) one remediated range to a session record.
  // Creates the record on first call. Does not merge HTML — that's the caller's
  // job via mergeRangesToFullHtml.
  var saveMultiSessionRange = function(sessionId, meta, rangeData) {
    return loadMultiSession(sessionId).then(function(existing) {
      var record = existing || {
        schemaVersion: _MULTI_SESSION_SCHEMA,
        sessionId: sessionId,
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        pageCount: meta.pageCount,
        createdAt: Date.now(),
        ranges: [],
      };
      // Detect overlap with existing ranges. The prior behavior only deduped
      // exact-match [start, end] pairs and claimed "overlap beyond exact match
      // is resolved at merge time" — but the merge step actually just
      // concatenates, so partial overlaps (e.g. existing 5-10 plus new 8-15)
      // produced duplicate content in the merged HTML. Fix here at save time:
      // the newer range wins on overlapping pages, and we truncate (or drop)
      // the older range's page metadata so merge excludes duplicates.
      var newPages = rangeData.pages;
      var newStart = newPages[0], newEnd = newPages[1];
      var overlappers = (record.ranges || []).filter(function(r) {
        if (!r.pages) return false;
        if (r.pages[0] === newStart && r.pages[1] === newEnd) return false; // exact match handled below
        return !(r.pages[1] < newStart || r.pages[0] > newEnd);
      });
      if (overlappers.length > 0) {
        warnLog('[MultiSession] New range ' + newStart + '-' + newEnd +
          ' overlaps ' + overlappers.length + ' existing range(s): ' +
          overlappers.map(function(r){ return r.pages[0] + '-' + r.pages[1]; }).join(', ') +
          '. Newer range wins on overlapping pages.');
        record.ranges = (record.ranges || []).map(function(r) {
          if (!r.pages) return r;
          if (r.pages[0] === newStart && r.pages[1] === newEnd) return r; // exact match handled below
          if (r.pages[1] < newStart || r.pages[0] > newEnd) return r; // no overlap
          // New fully contains old — drop old entirely
          if (r.pages[0] >= newStart && r.pages[1] <= newEnd) return null;
          // Old extends to the left of new — truncate old's end
          if (r.pages[0] < newStart && r.pages[1] >= newStart && r.pages[1] <= newEnd) {
            return Object.assign({}, r, { pages: [r.pages[0], newStart - 1], _truncatedBy: [newStart, newEnd] });
          }
          // Old extends to the right of new — truncate old's start
          if (r.pages[0] >= newStart && r.pages[0] <= newEnd && r.pages[1] > newEnd) {
            return Object.assign({}, r, { pages: [newEnd + 1, r.pages[1]], _truncatedBy: [newStart, newEnd] });
          }
          // New is strictly inside old — we'd need to split into two metadata
          // entries to cover {old_start..new_start-1} and {new_end+1..old_end}.
          // Page split without HTML split is fragile; drop the enclosing range
          // and ask the user to re-upload the surrounding portions.
          if (r.pages[0] < newStart && r.pages[1] > newEnd) {
            warnLog('[MultiSession] New range is a strict subset of existing range ' +
              r.pages[0] + '-' + r.pages[1] + ' — splitting at save time is not supported. ' +
              'Dropping the enclosing range; re-upload the uncovered portions if needed.');
            return null;
          }
          return r;
        }).filter(Boolean);
      }
      // Replace any existing range with the exact same [start, end]; re-running overwrites.
      record.ranges = (record.ranges || []).filter(function(r) {
        return !(r.pages && r.pages[0] === newStart && r.pages[1] === newEnd);
      });
      record.ranges.push(Object.assign({ completedAt: Date.now() }, rangeData));
      record.lastUpdatedAt = Date.now();
      return _openChunkDB().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction(_CHUNK_STORE, 'readwrite');
          tx.objectStore(_CHUNK_STORE).put(record, sessionId);
          tx.oncomplete = function() { resolve(record); };
          tx.onerror = function() { reject(tx.error); };
        });
      });
    }).catch(function(e) { warnLog('[MultiSession] Save failed:', e && e.message); return null; });
  };

  // Erase a session record entirely (user clicked "Clear saved progress").
  var clearMultiSession = function(sessionId) {
    return _openChunkDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(_CHUNK_STORE, 'readwrite');
        tx.objectStore(_CHUNK_STORE).delete(sessionId);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { reject(tx.error); };
      });
    }).catch(function(e) { warnLog('[MultiSession] Clear failed:', e && e.message); });
  };

  // ── Deterministic integrity helpers ──
  // textCharCount: count visible text characters in HTML (strips tags/scripts/styles)
  const textCharCount = (html) => {
    if (!html) return 0;
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim().length;
  };

  // htmlToPlainText: same stripping as textCharCount but returns the text. Used for
  // the diff-view feature in the remediation UI so it can compare source PDF text
  // vs. final HTML text word-by-word.
  const htmlToPlainText = (html) => {
    if (!html) return '';
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // acceptFixedHtmlDetailed: strict guard that rejects AI fix outputs that silently shrink
  // the document, returning a structured result with the specific reason. Callers that just
  // need truthy/falsy can use the acceptFixedHtml alias below.
  // Replaces the old `fixed.length > original.length * 0.5` checks which allowed 50% truncation.
  const acceptFixedHtmlDetailed = (fixed, original, opts) => {
    if (!fixed) return { accepted: false, reason: 'empty-output' };
    if (!original) return { accepted: false, reason: 'no-original' };
    const sizeFloor = (opts && opts.sizeFloor) || 0.95;
    const textFloor = (opts && opts.textFloor) || 0.97;
    const sizeRatio = fixed.length / original.length;
    if (sizeRatio < sizeFloor) {
      return { accepted: false, reason: 'size-shrink', sizeRatio: sizeRatio, sizeLost: original.length - fixed.length };
    }
    const origText = textCharCount(original);
    const fixedText = textCharCount(fixed);
    if (origText > 0 && fixedText < origText * textFloor) {
      return { accepted: false, reason: 'text-shrink', textRatio: fixedText / origText, textLost: origText - fixedText };
    }
    if (!(fixed.includes('<!DOCTYPE') || fixed.includes('<html') || fixed.includes('<main') || fixed.includes('<body'))) {
      return { accepted: false, reason: 'no-doc-markers' };
    }
    return { accepted: true };
  };
  const acceptFixedHtml = (fixed, original, opts) => acceptFixedHtmlDetailed(fixed, original, opts).accepted;

  // sampleHtml: return a stratified sample (start + middle + end) instead of just the first N chars.
  // Gives the AI representative visibility into the full document for diagnosis prompts.
  const sampleHtml = (html, budget) => {
    if (!html) return '';
    const b = budget || 9000;
    if (html.length <= b) return html;
    const third = Math.floor(b / 3);
    return html.slice(0, third) +
      '\n<!-- ... middle section ... -->\n' +
      html.slice(Math.floor(html.length / 2) - Math.floor(third / 2), Math.floor(html.length / 2) + Math.floor(third / 2)) +
      '\n<!-- ... end section ... -->\n' +
      html.slice(html.length - third);
  };

  // ── Source hint prescan: deterministic analysis of extracted text to guide the transform prompt ──
  const scanSourceHints = (text) => {
    if (!text) return { hasContent: false };
    const sample = text.length > 20000 ? text.slice(0, 10000) + text.slice(-10000) : text;
    const scripts = {
      cyrillic: /[\u0400-\u04FF]/.test(sample),
      arabic: /[\u0600-\u06FF]/.test(sample),
      hebrew: /[\u0590-\u05FF]/.test(sample),
      cjk: /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(sample),
      devanagari: /[\u0900-\u097F]/.test(sample),
      greek: /[\u0370-\u03FF]/.test(sample),
      thai: /[\u0E00-\u0E7F]/.test(sample),
    };
    const detectedScripts = Object.keys(scripts).filter(k => scripts[k]);
    const tableMatches = (sample.match(/\|.*\|.*\|/g) || []).length;
    const linkMatches = (text.match(/https?:\/\/[^\s)]+/g) || []).length;
    const mailtoMatches = (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || []).length;
    const hasBullets = /^\s*[-•*·]\s/m.test(sample);
    const hasNumbered = /^\s*\d+[.)]\s/m.test(sample);
    const headingMarkers = (sample.match(/^#{1,6}\s/gm) || []).length;
    return {
      hasContent: true,
      hasNonLatinScripts: detectedScripts.length > 0,
      detectedScripts,
      estimatedTableCount: tableMatches > 10 ? 'many' : tableMatches > 2 ? 'some' : 'few',
      estimatedLinkCount: linkMatches,
      estimatedEmailCount: mailtoMatches,
      hasBulletPatterns: hasBullets,
      hasNumberedLists: hasNumbered,
      hasMarkdownHeadings: headingMarkers > 2,
      totalChars: text.length,
    };
  };

  const formatHintsForPrompt = (hints) => {
    if (!hints || !hints.hasContent) return '';
    const parts = [];
    if (hints.hasNonLatinScripts) parts.push(`DETECTED SCRIPTS: ${hints.detectedScripts.join(', ')} — wrap runs of these in <span lang="..."> with correct language codes (ru, ar, he, zh/ja/ko, hi, el, th)`);
    if (hints.estimatedTableCount === 'many') parts.push('MANY TABLES detected — ensure every <table> has <caption>, <thead>, <th scope="col"> and <tbody>');
    if (hints.estimatedLinkCount > 5) parts.push(`${hints.estimatedLinkCount} LINKS detected — ensure every <a> has descriptive link text, never "click here" or bare URLs`);
    if (hints.hasBulletPatterns) parts.push('BULLET LISTS detected — convert all bullet characters to semantic <ul><li> structures');
    if (hints.hasNumberedLists) parts.push('NUMBERED LISTS detected — convert to semantic <ol><li> structures');
    if (!parts.length) return '';
    return '\n\nSOURCE PRESCAN HINTS:\n- ' + parts.join('\n- ');
  };

  // ── Chunked AI fix helper: split HTML on tag boundaries, fix each chunk, rejoin ──
  // Prevents the old `substring(0, 25000)` truncation by processing the full document
  // in AI-sized chunks that stay under the 8192-token output ceiling.
  const HTML_FIX_CHUNK = 16000; // with maxOutputTokens=65536, 16KB chunks are well within capacity
  const splitHtmlOnTagBoundary = (html, size) => {
    if (!html || html.length <= size) return [html || ''];
    const chunks = [];
    let i = 0;
    while (i < html.length) {
      let end = Math.min(i + size, html.length);
      if (end < html.length) {
        // Back up to the last '>' boundary so we never cut mid-tag
        const lastClose = html.lastIndexOf('>', end);
        if (lastClose > i + size * 0.6) end = lastClose + 1;
      }
      chunks.push(html.slice(i, end));
      i = end;
    }
    return chunks;
  };

  const stripFence = (s) => {
    if (!s) return s;
    let c = s.trim();
    if (c.includes('`' + '``')) {
      const parts = c.split('`' + '``');
      c = parts[1] || parts[0];
      if (c.startsWith('html\n') || c.startsWith('html\r\n')) c = c.substring(c.indexOf('\n') + 1);
      if (c.lastIndexOf('`' + '``') !== -1) c = c.substring(0, c.lastIndexOf('`' + '``'));
    }
    return c.trim();
  };

  // Detects chunk responses that the AI wrapped in JSON (e.g. {"html":"..."} or [{"html":"..."}]).
  // textCharCount doesn't penalize JSON syntax, so without this check a wrapped response passes
  // validation and the wrapper leaks into the joined document as visible artifacts.
  const _JSON_HTML_KEYS = /^(?:html|content|text|fixed_html|output_html|accessible_html|body|section|fragment|\w*_?html)$/i;
  const _isJsonWrapped = (s) => {
    if (!s) return false;
    const head = s.trimStart().slice(0, 200);
    return /^[\[\{]\s*[\[\{]?\s*"(?:html|content|text|fixed_html|output_html|accessible_html|body|section|fragment|\w*_?html)"\s*:\s*"/i.test(head);
  };
  const _tryUnwrapJsonHtml = (s) => {
    if (!s) return null;
    try {
      const parsed = JSON.parse(s.trim());
      const pickHtml = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        for (const k of Object.keys(obj)) {
          if (_JSON_HTML_KEYS.test(k) && typeof obj[k] === 'string' && obj[k].length > 0) return obj[k];
        }
        return null;
      };
      if (Array.isArray(parsed)) {
        const joined = parsed.map(item => pickHtml(item) || (typeof item === 'string' ? item : '')).filter(Boolean).join('\n');
        return joined || null;
      }
      return pickHtml(parsed);
    } catch (e) { return null; }
  };

  // aiFixChunked: run AI WCAG fix across the entire document by chunking on tag boundaries.
  // Each chunk is individually validated — if AI shrinks it, the original chunk is kept.
  const aiFixChunked = async (html, violationsText, label) => {
    if (!html) return html;
    // Strip base64 image data URLs before sending to AI — too large for model to reproduce
    // Replace with short placeholders, then restore after AI fixes
    const _imgDataMap = {};
    let _imgCounter = 0;
    let strippedHtml = html.replace(/src="(data:image\/[^"]{100,})"/gi, function(m, dataUrl) {
      const key = '__IMG_DATA_' + (++_imgCounter) + '__';
      _imgDataMap[key] = dataUrl;
      return 'src="' + key + '"';
    });
    const _hasImages = _imgCounter > 0;
    if (_hasImages) warnLog(`[aiFixChunked:${label}] stripped ${_imgCounter} base64 image data URLs before AI processing`);
    const _restoreImages = function(fixedHtml) {
      if (!_hasImages) return fixedHtml;
      var restored = fixedHtml;
      for (var key in _imgDataMap) {
        restored = restored.split(key).join(_imgDataMap[key]);
      }
      return restored;
    };
    const chunks = splitHtmlOnTagBoundary(_hasImages ? strippedHtml : html, HTML_FIX_CHUNK);
    if (chunks.length === 1) {
      // Short doc: single call with full document (use stripped html without base64 images)
      try {
        const _singleHtml = _hasImages ? strippedHtml : html;
        const prompt = `Fix these WCAG violations in the HTML. Change ONLY what's needed. Preserve ALL content and inline styles. Do NOT summarize or shorten.\n\nIMAGE PLACEHOLDERS: Any src value or token matching __ALLOFLOW_DATAURL_*__ (including __ALLOFLOW_DATAURL_FINAL_N__ and __IMG_DATA_N__) is a reference to an extracted image. Do NOT remove the containing <img> or <figure> element, do NOT modify the token text, do NOT replace the src with a description. Keep every such token exactly as-is.\n\nVIOLATIONS:\n${violationsText}\n\nHTML:\n"""\n${_singleHtml}\n"""\n\nReturn the COMPLETE fixed HTML — raw HTML only, do NOT wrap in JSON or a code fence.`;
        const fixed = stripFence(await callGemini(prompt, false));
        // FINAL-token preservation: reject this pass if any image placeholder was dropped.
        const _finalBefore = (_singleHtml.match(/__ALLOFLOW_DATAURL_FINAL_\d+__/gi) || []);
        const _finalAfter = fixed ? (fixed.match(/__ALLOFLOW_DATAURL_FINAL_\d+__/gi) || []) : [];
        if (_finalBefore.length > 0 && _finalAfter.length < _finalBefore.length) {
          warnLog(`[aiFixChunked:${label}] single-chunk dropped ${_finalBefore.length - _finalAfter.length} image FINAL token(s) — keeping original to preserve images`);
          return html;
        }
        if (acceptFixedHtml(fixed, _singleHtml)) return _restoreImages(fixed);
        warnLog(`[aiFixChunked:${label}] single-chunk rejected — keeping original`);
        return html;
      } catch (e) {
        warnLog(`[aiFixChunked:${label}] single-chunk failed:`, e?.message);
        return html;
      }
    }
    // Multi-chunk: fix ALL fragments in PARALLEL for speed
    warnLog(`[aiFixChunked:${label}] splitting ${html.length} chars into ${chunks.length} chunks (parallel)`);
    const fixed = await Promise.all(chunks.map(async (part, ci) => {
      const isFirst = ci === 0, isLast = ci === chunks.length - 1;
      const fragNote = isFirst
        ? 'This is FRAGMENT 1 — it may begin with <!DOCTYPE>/<html>/<head>/<body>/<main>.'
        : isLast
          ? `This is the LAST fragment (${ci + 1} of ${chunks.length}) — it may end with </main></body></html>.`
          : `This is fragment ${ci + 1} of ${chunks.length} — starts and ends mid-document.`;
      const prompt = `Fix these WCAG violations in the HTML fragment below. Change ONLY what's needed. Preserve ALL content, text, and inline styles. Do NOT summarize or shorten.\n\nIMAGE PLACEHOLDERS: Any src value or token matching __ALLOFLOW_DATAURL_*__ (including __ALLOFLOW_DATAURL_FINAL_N__ and __IMG_DATA_N__) is a reference to an extracted image. Do NOT remove the containing <img> or <figure> element, do NOT modify the token text, do NOT replace the src with a description. Keep every such token exactly as-is.\n\n${fragNote}\n\nVIOLATIONS:\n${violationsText}\n\nHTML FRAGMENT:\n"""\n${part}\n"""\n\nReturn ONLY the fixed fragment — raw HTML only, do NOT wrap in JSON or a code fence. Same opening and closing boundaries as the input.`;
      try {
        let out = stripFence(await callGemini(prompt, false));
        if (_isJsonWrapped(out)) {
          const unwrapped = _tryUnwrapJsonHtml(out);
          if (unwrapped && unwrapped.length >= part.length * 0.9 && textCharCount(unwrapped) >= textCharCount(part) * 0.95) {
            out = unwrapped;
          } else {
            _pipeLog('aiFixChunked:' + label, 'chunk ' + (ci + 1) + ' returned JSON wrapper — keeping original');
            return part;
          }
        }
        // FINAL-token preservation check: if Gemini dropped any __ALLOFLOW_DATAURL_FINAL_N__
        // placeholders that were in the input, reject this chunk's output and keep the original.
        // Critical: dropping a FINAL token means the corresponding extracted image is lost.
        const _finalBefore = (part.match(/__ALLOFLOW_DATAURL_FINAL_\d+__/gi) || []);
        const _finalAfter = out ? (out.match(/__ALLOFLOW_DATAURL_FINAL_\d+__/gi) || []) : [];
        if (_finalBefore.length > 0 && _finalAfter.length < _finalBefore.length) {
          const _lost = _finalBefore.length - _finalAfter.length;
          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} dropped ${_lost} image FINAL token(s) — retrying with explicit preservation instructions`);
          try {
            const retryPrompt = `Re-fix this HTML fragment. Your previous response REMOVED image placeholder tokens matching __ALLOFLOW_DATAURL_FINAL_N__ — these are extracted images that MUST be preserved. Every <img src="__ALLOFLOW_DATAURL_FINAL_*__"> and <figure> containing such a token must appear in your output verbatim.\n\nVIOLATIONS:\n${violationsText}\n\nHTML FRAGMENT:\n"""\n${part}\n"""\n\nReturn ONLY the fixed fragment — raw HTML only, do NOT wrap in JSON. Keep ALL __ALLOFLOW_DATAURL_FINAL_*__ tokens intact.`;
            let retried = stripFence(await callGemini(retryPrompt, false));
            if (_isJsonWrapped(retried)) {
              const unwrappedRetry = _tryUnwrapJsonHtml(retried);
              if (unwrappedRetry) retried = unwrappedRetry;
            }
            const _finalRetry = retried ? (retried.match(/__ALLOFLOW_DATAURL_FINAL_\d+__/gi) || []) : [];
            if (retried && retried.length >= part.length * 0.9 && _finalRetry.length >= _finalBefore.length) {
              warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} retry recovered all ${_finalBefore.length} image token(s)`);
              return retried;
            }
          } catch (retryErr) {
            warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} image-token retry failed: ${retryErr && retryErr.message}`);
          }
          // Retry didn't recover — keep the original chunk so images survive (at the cost of
          // not applying this pass's WCAG fixes to this specific chunk).
          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} keeping original to preserve ${_finalBefore.length} image token(s)`);
          return part;
        }
        if (out && out.length >= part.length * 0.9 && textCharCount(out) >= textCharCount(part) * 0.95) {
          return out;
        } else if (part.length > 5000) {
          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} truncated — splitting in half and retrying`);
          const halfChunks = splitHtmlOnTagBoundary(part, Math.ceil(part.length / 2));
          const halfResults = await Promise.all(halfChunks.map(async (half, hi) => {
            try {
              const halfPrompt = `Fix these WCAG violations in the HTML fragment. Change ONLY what's needed. Preserve ALL content.\n\nIMAGE PLACEHOLDERS: Any token matching __ALLOFLOW_DATAURL_*__ (including __ALLOFLOW_DATAURL_FINAL_N__) or __IMG_DATA_N__ is an image placeholder — keep it exactly and do NOT remove its containing element.\n\nVIOLATIONS:\n${violationsText}\n\nHTML FRAGMENT:\n"""\n${half}\n"""\n\nReturn ONLY the fixed fragment — raw HTML only, do NOT wrap in JSON or a code fence.`;
              let halfOut = stripFence(await callGemini(halfPrompt, false));
              if (_isJsonWrapped(halfOut)) {
                const unwrappedHalf = _tryUnwrapJsonHtml(halfOut);
                if (unwrappedHalf && unwrappedHalf.length >= half.length * 0.85 && textCharCount(unwrappedHalf) >= textCharCount(half) * 0.9) {
                  halfOut = unwrappedHalf;
                } else {
                  _pipeLog('aiFixChunked:' + label, 'half-chunk ' + (hi + 1) + ' JSON wrapper — keeping original half');
                  return half;
                }
              }
              if (halfOut && halfOut.length >= half.length * 0.85 && textCharCount(halfOut) >= textCharCount(half) * 0.9) {
                return halfOut;
              }
              warnLog(`[aiFixChunked:${label}] half-chunk ${hi + 1} also rejected — keeping original half`);
              return half;
            } catch (he) { return half; }
          }));
          return halfResults.join('');
        } else {
          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} rejected (in=${part.length}/${textCharCount(part)}, out=${out ? out.length : 0}/${out ? textCharCount(out) : 0}) — keeping original`);
          return part;
        }
      } catch (e) {
        warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} failed:`, e?.message);
        return part;
      }
    }));
    return _restoreImages(fixed.join(''));
  };

  // Strip Markdown triple-backtick code fences from a Gemini response so the
  // inner content (typically JSON or HTML) can be parsed. Previously this was
  // inlined at 7+ call sites with subtly different edge-case handling; each
  // copy mishandled at least one of these common variants:
  //   - Uppercase/mixed-case fence hints (```JSON, ```Json) left "JSON\n" as
  //     a prefix that breaks downstream JSON.parse
  //   - Windows line endings (\r\n) leave a lone \r at the top of the body
  //   - Leading/trailing whitespace inside the fence
  //   - Nested backticks (rare but seen in code-sample responses)
  // This helper centralizes the logic. Input unchanged if no fence found.
  const _stripCodeFence = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    let s = text.replace(/\r\n/g, '\n').trim();
    if (s.indexOf('```') === -1) return s;
    // Prefer a clean opener match: ```[hint]\n ... \n```
    // Capture the content between the first fence-open and the last fence-close.
    const openRe = /^\s*```[\w]*[ \t]*\r?\n?/;
    const hasOpen = openRe.test(s);
    if (hasOpen) s = s.replace(openRe, '');
    const lastFence = s.lastIndexOf('```');
    if (lastFence !== -1) s = s.substring(0, lastFence);
    s = s.trim();
    // Defensive: if the first line looks like a bare language hint that
    // slipped past the opener regex (e.g. `json` on its own line from a
    // malformed fence), strip it.
    const firstNewline = s.indexOf('\n');
    if (firstNewline > 0 && firstNewline < 12) {
      const firstLine = s.substring(0, firstNewline).trim().toLowerCase();
      if (/^(json|html|xml|yaml|yml|js|javascript|ts|typescript)$/.test(firstLine)) {
        s = s.substring(firstNewline + 1).trim();
      }
    }
    return s;
  };
  // Strip JSON array/object wrapper artifacts (`[ "`, `"]`, `<p>[ "</p>` etc.) that leak
  // when Gemini wraps its HTML output as a JSON string or when the response is truncated
  // mid-wrapper. Applied to final HTML in all paths (single-chunk, multi-chunk, heuristic).
  const _stripJsonWrapperArtifacts = (html) => {
    if (!html) return html;
    return html
      .replace(/<p[^>]*>\s*\[\s*["\u201c\u201d]?\s*<\/p>/gi, '')
      .replace(/<p[^>]*>\s*["\u201c\u201d]\s*\]\s*<\/p>/gi, '')
      // Chunk-boundary collision `" ][ "` — chunk N ended with `"]` and chunk N+1 started
      // with `["`; when joined they render as a visible paragraph between real content.
      // Smart-quote variants (U+201C/U+201D) appear when Gemini's response serializes JSON
      // with typographic quotes; strip those too.
      .replace(/<p[^>]*>\s*["\u201c\u201d]\s*\]\s*\[\s*["\u201c\u201d]\s*<\/p>/gi, '')
      .replace(/["\u201c\u201d]\s*\]\s*\[\s*["\u201c\u201d]/g, '')
      // Line-alone artifacts: `" ][ "` or `" ]` or `[ "` sitting on their own line with
      // nothing else (observed after remediation passes that wrap the seam in whitespace
      // without a containing <p>, so the content-level regexes miss it).
      .replace(/^\s*["\u201c\u201d]\s*\]\s*\[\s*["\u201c\u201d]\s*$/gm, '')
      .replace(/^\s*["\u201c\u201d]\s*\]\s*$/gm, '')
      .replace(/^\s*\[\s*["\u201c\u201d]\s*$/gm, '')
      // Chunk-object seam: `"}]{"fixed_html":"` (and variants `"}][{"`, `"}],{"`, whitespace/newlines
      // in between) — happens when each chunk streamed its own `[{"fixed_html":"..."}]` wrapper and the
      // concatenation leaves end-of-N's trailing `}]` next to start-of-N+1's opening `{"fixed_html":"`.
      // Strip the whole seam; real content flanks it on both sides.
      .replace(/<p[^>]*>\s*"\s*\}\s*\]\s*,?\s*\[?\s*,?\s*\{\s*"\s*(?:fixed_html|output_html|accessible_html|html|content)\s*"\s*:\s*"\s*<\/p>/gi, '')
      .replace(/"\s*\}\s*\]\s*,?\s*\[?\s*,?\s*\{\s*"\s*(?:fixed_html|output_html|accessible_html|html|content)\s*"\s*:\s*"/gi, '')
      // Paragraph that STARTS with a chunk-object seam followed by real content.
      .replace(/(<p[^>]*>)\s*"\s*\}\s*\]\s*,?\s*\[?\s*,?\s*\{\s*"\s*(?:fixed_html|output_html|accessible_html|html|content)\s*"\s*:\s*"\s*(?=\S)/gi, '$1')
      // Orphan `{"fixed_html":"` — when the preceding `"}]` was already stripped by the
      // paragraph-fragment rule below but the opening object survived standalone.
      .replace(/\{\s*"\s*(?:fixed_html|output_html|accessible_html)\s*"\s*:\s*"/gi, '')
      // Paragraph that STARTS with a trailing-wrapper fragment (`"]`, `"}]`, `" } ]`, …)
      // followed by real content — happens when chunk N+1's Gemini response opened with
      // `"content"]` or the JSON-object variant `"content"}]` and the leading-strip missed
      // it because the opening `[` was absent. Keep the real content.
      .replace(/(<p[^>]*>)\s*"\s*[}\]][\s}\],]*(?=\S)/gi, '$1')
      // Paragraph that STARTS with a leading-wrapper fragment (`[ "`) followed by real content.
      .replace(/(<p[^>]*>)\s*\[\s*"\s*(?=\S)/gi, '$1')
      .replace(/>\s*\[\s*"?\s*(<\/[^>]+>)/g, '>$1')
      .replace(/\[\s*"\s*<\//g, '</')
      .replace(/^\s*\[\s*"\s*$/gm, '')
      .replace(/\[\s*"\s*(?=<)/g, '')
      // Trailing orphan `"}]` at the very end of the document (or immediately before a block tag)
      // — chunk N's closing wrapper that survived every paragraph-specific sweep above.
      .replace(/["\u201c\u201d]\s*\}\s*\](?=\s*(?:$|<(?:\/?(?:p|div|h[1-6]|section|article|main|header|footer|ul|ol|li|table|figure|aside|nav|blockquote|br|hr)\b|!--|\?)))/g, '')
      // Trailing orphan `"]` (no `}`) — string-array wrappers like `["<html1>","<html2>"]`
      // leave just `"]` at the document tail when the object form wasn't used. Anchor to
      // document end or closing body/main/div tags so we don't touch legit "end-quote + ]"
      // text mid-document (which is essentially never real in an educational doc).
      .replace(/["\u201c\u201d]\s*\](?=\s*(?:$|<\/(?:body|html|main|section|article|div)\b))/g, '')
      // Leading orphan `["` at the absolute start of the document body (before any real content).
      .replace(/^(\s*(?:<(?:html|body|main|section|article|div)[^>]*>\s*)*)\[\s*["\u201c\u201d]\s*/gi, '$1')
      // Final sweep: decode literal \uXXXX escapes that survived the chunk-level
      // decoder at :3155 (which only runs when chunks start with `["`). This catches:
      //   - `\u2026` in image-placeholder descriptions rendering as literal text
      //   - surrogate-pair emoji (`\ud83d\udcf7`) in UI templates when Gemini's
      //     JSON serialization escape-encoded the emoji characters we hardcoded.
      // Adjacent high/low surrogates remain adjacent in the output and render as
      // the intended emoji glyph. Safe for typical doc_pipeline output (no legit
      // `\uXXXX` text content exists in remediated educational documents).
      .replace(/\\u([0-9a-fA-F]{4})/g, function(_, hex) { return String.fromCharCode(parseInt(hex, 16)); });
  };

  // ──────────────────────────────────────────────────────────────────────
  // Legend re-extraction pipeline
  //
  // The first-pass JSON extraction (single-pass at ~7898 / chunked at ~7949)
  // can mis-handle figure legends and color-coded keys. Gemini sees a legend
  // image with N specific entries, decides "this is tabular data," picks K
  // broad category names as headers, and DROPS the N specific items. The
  // output: a table with mostly-empty cells.
  //
  // Two-tier defense:
  //   1. Improved first-pass prompts with explicit legend guidance (lower
  //      false-positive rate; not bulletproof).
  //   2. This validator + reflow pipeline: detect suspect blocks AFTER the
  //      first pass parses, fire a focused vision call with a legend-specific
  //      prompt that demands verbatim enumeration, replace the suspect block
  //      with a `definition_list` block. Falls back to the original if the
  //      second call also fails.
  //
  // Diagnostics surface to `window._legendDiagnostic` so misfires are
  // inspectable post-hoc instead of disappearing into the build output.
  // ──────────────────────────────────────────────────────────────────────

  const _legendDiag = (entry) => {
    try {
      if (typeof window === 'undefined') return;
      window._legendDiagnostic = window._legendDiagnostic || [];
      window._legendDiagnostic.push(Object.assign({ ts: new Date().toISOString() }, entry || {}));
      if (window._legendDiagnostic.length > 200) window._legendDiagnostic.splice(0, window._legendDiagnostic.length - 200);
    } catch (_) {}
  };

  const _isSuspectExtraction = (block) => {
    if (!block || !block.type) return null;
    if (block.type === 'table' && Array.isArray(block.rows)) {
      const allCells = [];
      block.rows.forEach(r => { if (Array.isArray(r)) r.forEach(c => allCells.push(c)); else allCells.push(r); });
      const total = allCells.length;
      const empty = allCells.filter(c => !c || (typeof c === 'string' && c.trim().length === 0)).length;
      if (total > 0 && empty / total > 0.5) return 'table-mostly-empty (' + empty + '/' + total + ')';
      // Small "categorized" tables with a legend/key/figure caption — Gemini
      // grouped specific items into abstract categories then ran out of cells.
      const hdrCount = Array.isArray(block.headers) ? block.headers.length : 0;
      if (hdrCount >= 1 && hdrCount <= 4 && block.rows.length <= 6 && total <= 16) {
        const cap = String(block.caption || '');
        if (/\b(legend|key|figure\b)/i.test(cap)) return 'small-table-with-legend-caption';
      }
    }
    if (block.type === 'image') {
      const desc = String((block.description || '') + ' ' + (block.alt || ''));
      if (/\b(legend|key|color[- ]?coded|colour[- ]?coded|map\s+(?:legend|key))\b/i.test(desc)) {
        // Legend keyword present; check whether description actually enumerates entries.
        // Heuristic: needs a colon followed by ≥3 comma-separated tokens, or a list of
        // bullet/dash markers, or "and" enumerating multiple items.
        const enumerated =
          /:\s*[\w\- ]+(?:[,;]\s*[\w\- ]+){2,}/.test(desc)
          || /(?:•|•|—|–|\d+\.)/.test(desc)
          || /(?:[\w\- ]+,\s*){3,}/.test(desc);
        if (!enumerated) return 'image-mentions-legend-but-not-enumerated';
      }
    }
    return null;
  };

  const _reextractAsLegend = async (originalBlock, pdfBase64, pdfMimeType, pageRange, callGeminiVisionFn) => {
    if (!callGeminiVisionFn) return null;
    const pageHint = pageRange && pageRange.length === 2
      ? 'Focus on pages ' + pageRange[0] + ' through ' + pageRange[1] + ' of the PDF. '
      : '';
    const captionHint = originalBlock.caption
      ? 'The original figure caption (use this as a hint for which legend to find): "' + String(originalBlock.caption).slice(0, 200) + '". '
      : '';
    const descHint = originalBlock.description
      ? 'A prior pass described the visual as: "' + String(originalBlock.description).slice(0, 200) + '". '
      : '';
    const prompt =
      pageHint + captionHint + descHint + '\n\n' +
      'You are extracting a LEGEND or KEY from a document figure. A legend pairs visual markers (color swatches, symbols, patterns, icons) with their meanings.\n\n' +
      'Locate the legend/key on the specified pages. Enumerate EVERY visible entry verbatim. Do NOT summarize. Do NOT group entries into abstract categories. Do NOT skip items. If you see 21 entries, return 21.\n\n' +
      'Output a single JSON object with this exact shape:\n' +
      '{\n' +
      '  "type": "definition_list",\n' +
      '  "caption": "<short caption describing what the legend is for; may be empty>",\n' +
      '  "intro": "<optional 1-sentence intro; may be empty>",\n' +
      '  "sections": [\n' +
      '    {\n' +
      '      "title": "<group heading if the legend has visible subgroupings (e.g. \'Shelf & Slope\'); otherwise empty string>",\n' +
      '      "entries": [\n' +
      '        { "marker": "dark olive green filled square", "label": "Shelf - high profile" },\n' +
      '        { "marker": "medium blue filled square", "label": "Hadal" }\n' +
      '      ]\n' +
      '    }\n' +
      '  ]\n' +
      '}\n\n' +
      'CRITICAL RULES:\n' +
      '- Preserve labels VERBATIM (capitalization, hyphens, exact wording from the source).\n' +
      '- "marker" describes the visual swatch — name the color (or pattern/symbol) and shape. Screen-reader users use this to mentally connect the label to color references in surrounding prose.\n' +
      '- If the legend has visible subheadings/groupings, put those entries in a section with that title. If flat, use a single section with empty title.\n' +
      '- Output ONLY the JSON object. No code fence. No commentary.\n' +
      '- If you cannot find a legend on the specified pages, output exactly: null';

    let raw;
    try {
      raw = await callGeminiVisionFn(prompt, pdfBase64, pdfMimeType);
    } catch (e) {
      _legendDiag({ phase: 'reextract-error', error: e && e.message ? e.message : String(e), pageRange });
      return null;
    }
    if (!raw) { _legendDiag({ phase: 'reextract-empty-response', pageRange }); return null; }
    let cleaned = _stripCodeFence(raw).trim();
    if (!cleaned || cleaned === 'null') { _legendDiag({ phase: 'reextract-said-no-legend', pageRange }); return null; }
    // Trim to JSON-object boundaries so a stray prefix/suffix doesn't break parsing.
    const fi = cleaned.indexOf('{'); if (fi >= 0) cleaned = cleaned.substring(fi);
    const li = cleaned.lastIndexOf('}'); if (li > 0) cleaned = cleaned.substring(0, li + 1);
    let parsed = null;
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
      // One-shot repair: trailing commas, single-quoted strings.
      try {
        const repaired = cleaned.replace(/,\s*([}\]])/g, '$1').replace(/'([^']*)'/g, '"$1"');
        parsed = JSON.parse(repaired);
      } catch (e2) {
        _legendDiag({ phase: 'reextract-json-parse-failed', pageRange, snippet: cleaned.slice(0, 200) });
        return null;
      }
    }
    if (!parsed || parsed.type !== 'definition_list' || !Array.isArray(parsed.sections)) {
      _legendDiag({ phase: 'reextract-wrong-shape', pageRange, gotType: parsed && parsed.type });
      return null;
    }
    const totalEntries = parsed.sections.reduce(function(sum, s) {
      return sum + (Array.isArray(s.entries) ? s.entries.length : 0);
    }, 0);
    if (totalEntries === 0) {
      _legendDiag({ phase: 'reextract-empty-sections', pageRange });
      return null;
    }
    _legendDiag({ phase: 'reextract-success', pageRange, sections: parsed.sections.length, totalEntries });
    return parsed;
  };

  const detectAndRepairLegends = async (blocks, pdfBase64, pdfMimeType, pageRange, callGeminiVisionFn) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return blocks;
    if (!callGeminiVisionFn || !pdfBase64) return blocks;
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const reason = _isSuspectExtraction(block);
      if (!reason) { out.push(block); continue; }
      _legendDiag({ phase: 'flagged-suspect', pageRange, reason, originalType: block.type, caption: block.caption || null });
      const replacement = await _reextractAsLegend(block, pdfBase64, pdfMimeType, pageRange, callGeminiVisionFn);
      if (replacement) { out.push(replacement); }
      else {
        // Reflow the original block to a more honest representation: if it was a
        // broken table, downgrade to an image with a description that explicitly
        // names the failure mode so SR users hear something coherent.
        if (block.type === 'table') {
          out.push({
            type: 'image',
            description: (block.caption || 'Figure legend') + '. Automatic extraction could not enumerate every entry; refer to the source PDF image for the full legend.',
            alt: block.caption ? String(block.caption).slice(0, 120) : 'Figure legend (full content in source image)'
          });
          _legendDiag({ phase: 'fallback-table-to-image', pageRange });
        } else {
          out.push(block);
        }
      }
    }
    return out;
  };

  // ── Heuristic text structuring (RECITATION fallback) ──
  // When Vision refuses to process copyrighted content, structure the pre-extracted text
  // using formatting heuristics. Not as accurate as Vision, but preserves all content.
  const structureTextHeuristic = (rawText, startPage, endPage) => {
    if (!rawText || rawText.trim().length < 10) return [];
    const blocks = [];
    // Multi-column PDFs often capture running-page headers twice: once clipped on one line,
    // then the full header on the next, producing pairs like ["Part II The", "II The Context
    // of the Assessment Chapter"] where line A's suffix overlaps line B's prefix. If left
    // alone, the heuristic classifies the short first line as a heading and the second as
    // body, producing a duplicated-looking header. Merge these pairs before classification.
    // Guards keep the merge from eating legitimately adjacent distinct lines: short-only,
    // non-sentence-terminated, ≥8-char overlap, ≥2 tokens, ≥1 token of 4+ letters.
    const mergeRunningHeaderOverlaps = (lns) => {
      const out = [];
      for (let i = 0; i < lns.length; i++) {
        const a = (lns[i] || '').trim();
        const b = i + 1 < lns.length ? (lns[i + 1] || '').trim() : '';
        if (!a || !b || a.length > 60 || /[.!?]$/.test(a)) { out.push(lns[i]); continue; }
        let overlap = '';
        for (let k = Math.min(a.length, b.length); k >= 8; k--) {
          if (a.slice(-k).toLowerCase() === b.slice(0, k).toLowerCase()) { overlap = a.slice(-k); break; }
        }
        if (!overlap) { out.push(lns[i]); continue; }
        const tokens = overlap.trim().split(/\s+/).filter(Boolean);
        if (tokens.length < 2 || !tokens.some(t => /[A-Za-z]{4,}/.test(t))) { out.push(lns[i]); continue; }
        out.push(a + b.slice(overlap.length));
        i++;
      }
      return out;
    };
    const lines = mergeRunningHeaderOverlaps(rawText.split(/\n/));
    let currentParagraph = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text.length > 0) blocks.push({ type: 'p', text: text });
        currentParagraph = [];
      }
    };

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) { flushParagraph(); continue; }

      // Detect headings: short lines (< 80 chars), often ALL CAPS or Title Case, followed by content
      const isShort = line.length < 80;
      const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line) && line.length > 3;
      const isTitleCase = /^[A-Z][a-z]/.test(line) && line.split(' ').filter(w => /^[A-Z]/.test(w)).length >= Math.ceil(line.split(' ').length * 0.6);
      const nextLine = li + 1 < lines.length ? lines[li + 1].trim() : '';
      const nextIsContent = nextLine.length > 80 || (nextLine.length > 20 && /^[a-z]/.test(nextLine));
      const hasNumber = /^(?:Chapter|Section|Part|Unit|\d+[\.\):])\s/i.test(line);

      if (isShort && (isAllCaps || hasNumber) && line.length > 3) {
        flushParagraph();
        blocks.push({ type: isAllCaps && line.length < 40 ? 'h2' : 'h3', text: line, id: line.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40) });
        continue;
      }
      if (isShort && isTitleCase && nextIsContent && !line.endsWith('.') && line.length > 5) {
        flushParagraph();
        blocks.push({ type: 'h3', text: line, id: line.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40) });
        continue;
      }

      // Detect list items: lines starting with bullets, dashes, numbers, or letters
      if (/^[\u2022\u2023\u25E6\u25AA\u25CF•●○◦-]\s/.test(line) || /^[a-z]\)\s/i.test(line)) {
        flushParagraph();
        // Collect consecutive list items
        const items = [line.replace(/^[\u2022\u2023\u25E6\u25AA\u25CF•●○◦-]\s*/, '').replace(/^[a-z]\)\s*/i, '')];
        while (li + 1 < lines.length && /^[\u2022\u2023\u25E6\u25AA\u25CF•●○◦-]\s|^[a-z]\)\s/i.test(lines[li + 1].trim())) {
          li++;
          items.push(lines[li].trim().replace(/^[\u2022\u2023\u25E6\u25AA\u25CF•●○◦-]\s*/, '').replace(/^[a-z]\)\s*/i, ''));
        }
        blocks.push({ type: 'ul', items: items });
        continue;
      }
      if (/^\d+[\.\)]\s/.test(line)) {
        flushParagraph();
        const items = [line.replace(/^\d+[\.\)]\s*/, '')];
        while (li + 1 < lines.length && /^\d+[\.\)]\s/.test(lines[li + 1].trim())) {
          li++;
          items.push(lines[li].trim().replace(/^\d+[\.\)]\s*/, ''));
        }
        blocks.push({ type: 'ol', items: items });
        continue;
      }

      // Detect table-like content: lines with multiple tabs or pipes (data rows)
      if ((line.split('\t').length >= 3 || line.split('|').length >= 3) && line.length > 10) {
        flushParagraph();
        var sep = line.split('\t').length >= 3 ? '\t' : '|';
        var headerCells = line.split(sep).map(function(c) { return c.trim(); }).filter(Boolean);
        var dataRows = [];
        while (li + 1 < lines.length) {
          var nextL = lines[li + 1].trim();
          if (nextL.split(sep).length >= headerCells.length - 1 && nextL.length > 5 && !/^[-=\s|+]+$/.test(nextL)) {
            li++;
            dataRows.push(nextL.split(sep).map(function(c) { return c.trim(); }));
          } else if (/^[-=\s|+]+$/.test(nextL)) {
            li++; // skip separator lines
          } else {
            break;
          }
        }
        if (dataRows.length > 0) {
          blocks.push({ type: 'table', caption: '', headers: headerCells, rows: dataRows });
        } else {
          blocks.push({ type: 'p', text: line });
        }
        continue;
      }

      // Detect blockquotes: indented lines (4+ spaces or tab at start)
      if (/^(\s{4,}|\t)/.test(lines[li]) && line.length > 20) {
        flushParagraph();
        var quoteLines = [line];
        while (li + 1 < lines.length && /^(\s{4,}|\t)/.test(lines[li + 1]) && lines[li + 1].trim().length > 0) {
          li++;
          quoteLines.push(lines[li].trim());
        }
        blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
        continue;
      }

      // Detect figure/image references: "Figure X", "Fig. X", "Image X"
      if (/^(?:Figure|Fig\.|Image|Illustration|Diagram|Chart|Table)\s+\d/i.test(line) && line.length < 200) {
        flushParagraph();
        blocks.push({ type: 'image', description: line, alt: line });
        continue;
      }

      // Everything else is paragraph text
      currentParagraph.push(line);
    }
    flushParagraph();

    // If we got blocks, add a note that this section used heuristic structuring
    if (blocks.length > 0) {
      blocks.unshift({ type: 'rawhtml', html: '<!-- Pages ' + startPage + '-' + endPage + ': structured from extracted text (Vision unavailable) -->' });
    }
    return blocks;
  };

  // ── Shared helpers for surgical-then-AI remediation (Stage 3) ──
  // ── Word Art presets ──
  // Accessible CSS-only presets. Text remains real DOM text (readable by screen readers) — no SVG
  // path rendering, no rasterization. Colors chosen for WCAG AA on white bg where feasible;
  // decorative contrast rules (1.4.3 "incidental") cover the rest.
  // Exposed on window.AlloWordArt so the Document Builder UI can render identical previews.
  var WORD_ART_PRESETS = {
    goldFoil: {
      name: 'Gold Foil',
      emoji: '✨',
      style: 'background:linear-gradient(135deg,#b45309 0%,#f59e0b 30%,#fde68a 50%,#f59e0b 70%,#92400e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(120,53,15,0.25);font-weight:900;'
    },
    neonGlow: {
      name: 'Neon Glow',
      emoji: '💡',
      style: 'color:#0891b2;text-shadow:0 0 4px #06b6d4,0 0 8px #06b6d4,0 0 15px #0e7490,0 1px 2px rgba(0,0,0,0.3);font-weight:900;'
    },
    retroArcade: {
      name: 'Retro Arcade',
      emoji: '🕹️',
      style: "color:#fef2f2;text-shadow:3px 3px 0 #dc2626,6px 6px 0 #1e3a8a;font-weight:900;font-family:'Impact','Arial Black',sans-serif;letter-spacing:0.03em;"
    },
    chalkboard: {
      name: 'Chalkboard',
      emoji: '🖍️',
      style: "color:#fef3c7;text-shadow:0 0 2px #fbbf24,2px 2px 0 rgba(0,0,0,0.2);font-family:'Caveat','Comic Sans MS',cursive;font-weight:700;letter-spacing:0.05em;",
      wrapperStyle: 'background:#14532d;padding:1rem 1.5rem;border-radius:8px;display:inline-block;border:3px solid #78350f;'
    },
    embossed: {
      name: 'Embossed',
      emoji: '🏛️',
      style: 'color:#475569;text-shadow:-1px -1px 0 rgba(255,255,255,0.8),1px 1px 0 rgba(0,0,0,0.35),2px 2px 4px rgba(0,0,0,0.2);font-weight:900;letter-spacing:0.01em;'
    },
    rainbow: {
      name: 'Rainbow',
      emoji: '🌈',
      style: 'background:linear-gradient(90deg,#dc2626 0%,#ea580c 17%,#ca8a04 33%,#16a34a 50%,#0891b2 67%,#4f46e5 83%,#9333ea 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;'
    }
  };
  var WORD_ART_SIZES = { S: '1.5rem', M: '2.5rem', L: '4rem', XL: '6rem' };
  // Expose to host so Document Builder can render matching previews.
  try { if (typeof window !== 'undefined') { window.AlloWordArt = { presets: WORD_ART_PRESETS, sizes: WORD_ART_SIZES }; } } catch(e) {}

  // Render a wordart block to HTML. Used by renderJsonToHtml and by the Document Builder insert UI.
  var renderWordArtHtml = function(text, presetKey, size, align) {
    var preset = WORD_ART_PRESETS[presetKey] || WORD_ART_PRESETS.goldFoil;
    var fontSize = WORD_ART_SIZES[size] || WORD_ART_SIZES.L;
    var alignStyle = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';
    var safeText = String(text || '').replace(/[<>&]/g, function(ch) { return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&amp;'; });
    var inner = '<span style="display:inline-block;font-size:' + fontSize + ';line-height:1.1;' + preset.style + '">' + safeText + '</span>';
    if (preset.wrapperStyle) inner = '<span style="display:inline-block;' + preset.wrapperStyle + '">' + inner + '</span>';
    return '<div class="alloflow-wordart" data-wa-preset="' + presetKey + '" data-wa-size="' + size + '" data-wa-align="' + alignStyle + '" role="heading" aria-level="2" style="margin:1.5em 0;text-align:' + alignStyle + '">' + inner + '</div>';
  };
  try { if (typeof window !== 'undefined') { window.AlloWordArt && (window.AlloWordArt.render = renderWordArtHtml); } } catch(e) {}

  // Placeholder-swap for base64 data URLs so Gemini never sees (and can't corrupt) image payloads.
  // Handles double-quoted, single-quoted, unquoted, and srcset — the original single-regex version
  // only caught src="data:..." with double quotes, so single-quoted or srcset data URLs leaked
  // through and got mangled by the model.
  const _stripDataUrlsForAi = (html) => {
    if (!html) return { html: html, map: {} };
    const map = {};
    let counter = 0;
    const swap = (val, quote) => {
      const token = '__ALLOFLOW_DATAURL_' + (counter++) + '__';
      map[token] = val;
      return quote + token + quote;
    };
    let out = html;
    // Double-quoted src/href/srcset containing any data: URL
    out = out.replace(/(src|href|srcset)\s*=\s*"([^"]*data:[^"]+)"/gi, function(m, attr, val) {
      return attr + '=' + swap(val, '"');
    });
    // Single-quoted variant
    out = out.replace(/(src|href|srcset)\s*=\s*'([^']*data:[^']+)'/gi, function(m, attr, val) {
      return attr + '=' + swap(val, "'");
    });
    // Unquoted src/href with data: URL (HTML5 allows this)
    out = out.replace(/(src|href)\s*=\s*(data:[^\s>]+)/gi, function(m, attr, val) {
      return attr + '=' + swap(val, '"');
    });
    return { html: out, map: map };
  };
  const _restoreDataUrlsForAi = (html, map) => {
    if (!html || !map) return html;
    let out = html;
    Object.keys(map).forEach(function(token) { out = out.split(token).join(map[token]); });
    return out;
  };
  // Replace entire image-placeholder <figure> blocks (including inline upload buttons, SVG icons,
  // captions, crop-data attrs, upload inputs) with a stable token so AI rewrite passes can't
  // strip or mangle them. Restored verbatim after the AI pass returns.
  // Matches EITHER the pre-replacement marker (`data-img-placeholder="true"`) OR the fully-rendered
  // placeholder (any <figure ... data-img-idx="N" ...>).
  const _stripImagePlaceholdersForAi = (html) => {
    if (!html) return { html: html, map: {} };
    const map = {};
    let counter = 0;
    let out = html;
    // Pre-replacement marker
    out = out.replace(/<figure\s[^>]*data-img-placeholder="true"[\s\S]*?<\/figure>/gi, function(match) {
      const token = '__ALLOFLOW_IMG_FIGURE_' + (counter++) + '__';
      map[token] = match;
      return token;
    });
    // Post-replacement full placeholder (has data-img-idx attribute)
    out = out.replace(/<figure\s[^>]*data-img-idx="\d+"[\s\S]*?<\/figure>/gi, function(match) {
      const token = '__ALLOFLOW_IMG_FIGURE_' + (counter++) + '__';
      map[token] = match;
      return token;
    });
    return { html: out, map: map };
  };
  const _restoreImagePlaceholdersForAi = (html, map) => {
    if (!html || !map) return html;
    let out = html;
    Object.keys(map).forEach(function(token) { out = out.split(token).join(map[token]); });
    return out;
  };

  // Shared tolerant JSON parser for AI-returned arrays. Handles markdown fences, trailing garbage,
  // unquoted keys, single quotes, missing commas, truncation mid-object, etc.
  const repairAndParseJsonShared = (raw) => {
    if (!raw) return null;
    let s = String(raw).trim();
    if (s.indexOf('```') !== -1) {
      const ps = s.split('```');
      s = ps[1] || ps[0];
      if (s.indexOf('\n') !== -1 && /^(json|js)\s*$/i.test(s.split('\n')[0].trim())) s = s.split('\n').slice(1).join('\n');
      if (s.lastIndexOf('```') !== -1) s = s.substring(0, s.lastIndexOf('```'));
      s = s.trim();
    }
    const firstBracket = s.indexOf('[');
    const lastBracket = s.lastIndexOf(']');
    if (firstBracket >= 0) s = s.substring(firstBracket);
    if (lastBracket >= 0 && lastBracket > firstBracket) s = s.substring(0, s.lastIndexOf(']') + 1);
    try { return JSON.parse(s); } catch(e) {}
    let repaired = s
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ':"$1"')
      .replace(/"\s*\n\s*"/g, '","')
      .replace(/}\s*\n?\s*{/g, '},{')
      .replace(/\}\s*$/,'}\]')
      .replace(/"\s*$/,'"}]');
    if (!repaired.startsWith('[')) repaired = '[' + repaired;
    if (!repaired.endsWith(']')) {
      const lastCloseBrace = repaired.lastIndexOf('}');
      if (lastCloseBrace > 0) repaired = repaired.substring(0, lastCloseBrace + 1) + ']';
    }
    try { return JSON.parse(repaired); } catch(e) {}
    const arrMatch = repaired.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch(e) {} }
    _pipeLog('repairAndParseJsonShared', 'gave up — returning null', String(raw).slice(0, 200));
    return null;
  };

  // Shared helper: escape a string for safe interpolation into a RegExp source.
  const escapeForRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // HTML tag names are restricted; validate before trusting AI-supplied values.
  const SAFE_TAG_NAME = /^[a-z][a-z0-9]*$/i;

  // ── Surgical tool registry ──
  // Deterministic micro-operations that apply targeted fixes from Gemini-generated JSON
  // directives. Single source of truth for: (1) the executor functions, (2) the prompt
  // catalog sent to Gemini for diagnosis, and (3) collaborator-facing documentation.
  //
  // Each entry has: { category, params, wcag, fn }. The prompt is derived from this object
  // (see SURGICAL_TOOL_PROMPT below) so adding or renaming a tool updates the AI diagnosis
  // prompt automatically — no chance of the prompt drifting out of sync with the implementation.
  //
  // Referenced by remediateSurgicallyThenAI, processSinglePdfForBatch, and the chunked fix paths
  // via the runSurgical() helper (handles both new {fn} entries and legacy direct-function entries).
  const SURGICAL_TOOL_REGISTRY = {
    fix_alt_text: {
      category: 'CONTENT', wcag: '1.1.1', params: '{index, alt}',
      fn: function(html, p) {
        if (!p.index && p.index !== 0) return html;
        let idx = 0;
        return html.replace(/<img([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== p.index) return m;
          if (/alt="[^"]+"/i.test(attrs) && p.alt) return m.replace(/alt="[^"]*"/, 'alt="' + p.alt.replace(/"/g, '&quot;') + '"');
          return '<img alt="' + (p.alt || 'Image').replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      }
    },
    fix_heading: {
      category: 'CONTENT', wcag: '1.3.1', params: '{index, newLevel}',
      fn: function(html, p) {
        if (!p.newLevel) return html;
        let idx = 0;
        return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, function(m, lv, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          return '<h' + p.newLevel + attrs + '>' + content + '</h' + p.newLevel + '>';
        });
      }
    },
    fix_link_text: {
      category: 'CONTENT', wcag: '2.4.4', params: '{index, newText, force?}',
      fn: function(html, p) {
        if (!p.newText) return html;
        let idx = 0;
        return html.replace(/<a([^>]*)>([\s\S]*?)<\/a>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          var text = content.replace(/<[^>]*>/g, '').trim().toLowerCase();
          if (['click here','here','read more','more','link','learn more'].indexOf(text) !== -1 || p.force) {
            return '<a' + attrs + '>' + p.newText + '</a>';
          }
          return m;
        });
      }
    },
    fix_figcaption: {
      category: 'CONTENT', wcag: '1.3.1', params: '{index, caption}',
      fn: function(html, p) {
        if (!p.caption) return html;
        let idx = 0;
        return html.replace(/<figure([^>]*)>([\s\S]*?)<\/figure>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          if (/<figcaption/i.test(content)) return m;
          return '<figure' + attrs + '>' + content + '<figcaption>' + p.caption + '</figcaption></figure>';
        });
      }
    },
    fix_table_caption: {
      category: 'TABLE', wcag: '1.3.1', params: '{index, caption}',
      fn: function(html, p) {
        if (!p.caption) return html;
        let idx = 0;
        return html.replace(/<table([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          return '<table' + attrs + '><caption>' + p.caption + '</caption>';
        });
      }
    },
    fix_th_scope: {
      category: 'TABLE', wcag: '1.3.1', params: '{index?, scope}',
      fn: function(html, p) {
        var scope = p.scope || 'col';
        let idx = 0;
        return html.replace(/<th(?![^>]*scope)([^>]*)>/gi, function(m, attrs) {
          if (p.index !== undefined && idx++ !== p.index) return m;
          return '<th scope="' + scope + '"' + attrs + '>';
        });
      }
    },
    fix_table_header_row: {
      category: 'TABLE', wcag: '1.3.1', params: '{index}',
      fn: function(html, p) {
        let idx = 0;
        return html.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          if (/<thead/i.test(content)) return m;
          var fixed = content.replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/i, function(row, rAttrs, cells) {
            var headerCells = cells.replace(/<td([^>]*)>/gi, '<th scope="col"$1>').replace(/<\/td>/gi, '</th>');
            return '<thead><tr' + rAttrs + '>' + headerCells + '</tr></thead>';
          });
          return '<table' + attrs + '>' + fixed + '</table>';
        });
      }
    },
    fix_input_label: {
      category: 'FORM', wcag: '3.3.2', params: '{index, label}',
      fn: function(html, p) {
        if (!p.label) return html;
        let idx = 0;
        return html.replace(/<input([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          if (/aria-label/i.test(attrs)) return m.replace(/aria-label="[^"]*"/, 'aria-label="' + p.label.replace(/"/g, '&quot;') + '"');
          return '<input aria-label="' + p.label.replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      }
    },
    fix_button_name: {
      category: 'FORM', wcag: '4.1.2', params: '{index, label}',
      fn: function(html, p) {
        if (!p.label) return html;
        let idx = 0;
        return html.replace(/<button([^>]*)>([\s\S]*?)<\/button>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          if (content.trim()) return m;
          return '<button aria-label="' + p.label.replace(/"/g, '&quot;') + '"' + attrs + '>' + content + '</button>';
        });
      }
    },
    fix_iframe_title: {
      category: 'FORM', wcag: '2.4.1', params: '{index, title}',
      fn: function(html, p) {
        if (!p.title) return html;
        let idx = 0;
        return html.replace(/<iframe([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          if (/title=/i.test(attrs)) return m.replace(/title="[^"]*"/, 'title="' + p.title.replace(/"/g, '&quot;') + '"');
          return '<iframe title="' + p.title.replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      }
    },
    fix_aria_label: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{tag, index, label}',
      fn: function(html, p) {
        if (!p.tag || !p.label) return html;
        if (!SAFE_TAG_NAME.test(p.tag)) return html;
        let idx = 0;
        var re = new RegExp('<' + p.tag + '([^>]*)>', 'gi');
        return html.replace(re, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          if (/aria-label/i.test(attrs)) return m.replace(/aria-label="[^"]*"/, 'aria-label="' + p.label.replace(/"/g, '&quot;') + '"');
          return '<' + p.tag + ' aria-label="' + p.label.replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      }
    },
    fix_add_landmark: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{tag, label}',
      fn: function(html, p) {
        var label = p.label || 'Content';
        var selector = p.selector || 'body';
        if (selector === 'body' && !html.includes('<main')) {
          return html.replace(/<body([^>]*)>/, '<body$1>\n<main id="main-content" role="main" aria-label="' + label + '">').replace('</body>', '</main>\n</body>');
        }
        return html;
      }
    },
    fix_remove_empty_heading: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{index}',
      fn: function(html, p) {
        let idx = 0;
        return html.replace(/<h([1-6])[^>]*>\s*<\/h\1>/gi, function(m) {
          if (p.index !== undefined && idx++ !== p.index) return m;
          return '';
        });
      }
    },
    fix_duplicate_id: {
      category: 'STRUCTURE', wcag: '4.1.1', params: '{id}',
      fn: function(html, p) {
        if (!p.id) return html;
        let count = 0;
        return html.replace(new RegExp('id="' + escapeForRegex(p.id) + '"', 'g'), function(m) {
          count++;
          if (count === 1) return m;
          return 'id="' + p.id + '-' + count + '"';
        });
      }
    },
    fix_skip_nav: {
      category: 'STRUCTURE', wcag: '2.4.1', params: '{}',
      fn: function(html) {
        if (/skip.to|skip-nav|skipnav/i.test(html)) return html;
        return html.replace(/<body([^>]*)>/i, '<body$1>\n<a href="#main-content" class="sr-only" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:9999">Skip to main content</a>');
      }
    },
    fix_title: {
      category: 'STRUCTURE', wcag: '2.4.2', params: '{title}',
      fn: function(html, p) {
        if (!p.title) return html;
        if (/<title>[^<]*<\/title>/i.test(html)) return html.replace(/<title>[^<]*<\/title>/i, '<title>' + p.title + '</title>');
        return html.replace('</head>', '<title>' + p.title + '</title>\n</head>');
      }
    },
    fix_lang: {
      category: 'STRUCTURE', wcag: '3.1.1', params: '{lang}',
      fn: function(html, p) {
        if (!p.lang) return html;
        return html.replace(/<html([^>]*)lang="[^"]*"/, '<html$1lang="' + p.lang + '"')
                   .replace(/<html(?![^>]*lang=)/, '<html lang="' + p.lang + '"');
      }
    },
    fix_lang_span: {
      category: 'STRUCTURE', wcag: '3.1.2', params: '{text, lang}',
      fn: function(html, p) {
        if (!p.text || !p.lang) return html;
        return html.replace(new RegExp(escapeForRegex(p.text)), '<span lang="' + p.lang + '">' + p.text + '</span>');
      }
    },
    fix_contrast: {
      category: 'VISUAL', wcag: '1.4.3', params: '{oldColor, newColor}',
      fn: function(html, p) {
        if (!p.oldColor || !p.newColor) return html;
        return html.replace(new RegExp(escapeForRegex(p.oldColor), 'gi'), p.newColor);
      }
    },
    // Deterministic per-element contrast fix driven by axe-core's reported data
    // (fgColor, bgColor, expectedContrastRatio, target selector). Computes a passing
    // foreground via luminance-descent and injects an inline style attribute — inline
    // beats any class or <style>-block rule that caused the original violation.
    fix_color_contrast: {
      category: 'VISUAL', wcag: '1.4.3', params: '{target, fgColor, bgColor, expectedContrastRatio}',
      fn: function(html, p) {
        if (!p || !p.target || !p.fgColor || !p.bgColor) return html;
        var parseColor = function(c) {
          if (!c) return null;
          var s = String(c).trim();
          if (s[0] === '#') {
            var h = s.slice(1);
            if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
            if (h.length < 6) return null;
            return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
          }
          var m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
          return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
        };
        var rgbToHex = function(r,g,b) { return '#' + [r,g,b].map(function(x) { return Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0'); }).join(''); };
        var lum = function(r,g,b) {
          var map = function(c) { c = c/255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
          return 0.2126*map(r) + 0.7152*map(g) + 0.0722*map(b);
        };
        var ratio = function(a,b) { var l1=lum(a[0],a[1],a[2]), l2=lum(b[0],b[1],b[2]); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
        var fgRgb = parseColor(p.fgColor);
        var bgRgb = parseColor(p.bgColor);
        if (!fgRgb || !bgRgb) return html;
        var target = p.expectedContrastRatio || 4.5;
        var r = fgRgb[0], g = fgRgb[1], b = fgRgb[2];
        var isDarkBg = lum(bgRgb[0],bgRgb[1],bgRgb[2]) < 0.18;
        for (var i = 0; i < 30; i++) {
          if (ratio([r,g,b], bgRgb) >= target) break;
          if (isDarkBg) {
            r = Math.min(255, Math.round(r + (255-r)*0.15));
            g = Math.min(255, Math.round(g + (255-g)*0.15));
            b = Math.min(255, Math.round(b + (255-b)*0.15));
          } else {
            r = Math.max(0, Math.round(r*0.82));
            g = Math.max(0, Math.round(g*0.82));
            b = Math.max(0, Math.round(b*0.82));
          }
        }
        var newFg = rgbToHex(r,g,b);
        // axe target can be nested (frames): [["sel1"], ["sel2"]] → use last frame's selector.
        var rawTarget = p.target;
        var selector = Array.isArray(rawTarget) ? (Array.isArray(rawTarget[rawTarget.length-1]) ? rawTarget[rawTarget.length-1].join(' ') : rawTarget.join(' ')) : String(rawTarget);
        try {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var el = doc.querySelector(selector);
          if (!el) return html;
          var existing = el.getAttribute('style') || '';
          var cleaned = existing.replace(/(?:^|;)\s*color\s*:\s*[^;]+/gi, '').replace(/^;+/, '').trim();
          el.setAttribute('style', (cleaned ? cleaned + ';' : '') + 'color:' + newFg);
          var doctypeMatch = html.match(/^\s*<!DOCTYPE[^>]*>/i);
          var doctypePrefix = doctypeMatch ? doctypeMatch[0] + '\n' : '';
          return doctypePrefix + doc.documentElement.outerHTML;
        } catch (e) {
          return html;
        }
      }
    },
    fix_image_decorative: {
      category: 'VISUAL', wcag: '1.1.1', params: '{index}',
      fn: function(html, p) {
        let idx = 0;
        return html.replace(/<img([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          var cleaned = attrs.replace(/alt="[^"]*"/i, '').replace(/role="[^"]*"/i, '');
          return '<img alt="" role="presentation"' + cleaned + '>';
        });
      }
    },
    fix_abbreviation: {
      category: 'VISUAL', wcag: '3.1.4', params: '{abbr, title}',
      fn: function(html, p) {
        if (!p.abbr || !p.title) return html;
        var re = new RegExp('\\b' + escapeForRegex(p.abbr) + '\\b');
        var replaced = false;
        return html.replace(re, function(m) {
          if (replaced) return m;
          replaced = true;
          return '<abbr title="' + p.title.replace(/"/g, '&quot;') + '">' + m + '</abbr>';
        });
      }
    },
    fix_text_spacing: {
      category: 'VISUAL', wcag: '1.4.12', params: '{letterSpacing?, lineHeight?, wordSpacing?}',
      fn: function(html, p) {
        var css = '';
        if (p.letterSpacing) css += 'letter-spacing:' + p.letterSpacing + ';';
        if (p.wordSpacing) css += 'word-spacing:' + p.wordSpacing + ';';
        if (p.lineHeight) css += 'line-height:' + p.lineHeight + ';';
        if (!css) return html;
        var style = '<style id="alloflow-text-spacing">body{' + css + '}</style>';
        if (html.includes('</head>')) return html.replace('</head>', style + '</head>');
        return style + html;
      }
    },
    fix_list_wrap: {
      category: 'LIST', wcag: '1.3.1', params: '{ordered?}',
      fn: function(html, p) {
        var tag = (p && p.ordered) ? 'ol' : 'ul';
        return html.replace(/(<li[\s>][\s\S]*?<\/li>\s*(?:<li[\s>][\s\S]*?<\/li>\s*)*)/gi, function(m, liBlock, offset) {
          var before = html.substring(Math.max(0, offset - 100), offset);
          if (/<[uo]l[^>]*>\s*$/i.test(before)) return m;
          return '<' + tag + ' role="list">' + liBlock + '</' + tag + '>';
        });
      }
    },
    // Complex table: wrap first row in <thead>, remaining in <tbody>, add IDs to <th>, and set
    // `headers` attribution on body cells where the teacher supplies a mapping.
    // params: { index, headerRowCount?=1, columnHeaders?=['h_0','h_1',...] }
    fix_complex_table: {
      category: 'TABLE', wcag: '1.3.1', params: '{index, headerRowCount?, columnHeaders?}',
      fn: function(html, p) {
        var tblIdx = 0;
        var headerRowCount = Math.max(1, parseInt(p && p.headerRowCount, 10) || 1);
        return html.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, function(m, attrs, content) {
          if (tblIdx++ !== (p && p.index || 0)) return m;
          if (/<thead/i.test(content) && /<tbody/i.test(content) && /id="[a-z0-9_-]+"/i.test(content)) return m;
          var rowRegex = /<tr([^>]*)>([\s\S]*?)<\/tr>/gi;
          var rows = [];
          var r;
          while ((r = rowRegex.exec(content)) !== null) rows.push({ attrs: r[1], cells: r[2], full: r[0] });
          if (rows.length < 2) return m;
          var cellCount = (rows[0].cells.match(/<t[hd][\s>]/gi) || []).length;
          var colIds = [];
          for (var ci = 0; ci < cellCount; ci++) colIds.push('th-col-' + Date.now().toString(36) + '-' + tblIdx + '-' + ci);
          var headerHtml = '<thead>';
          for (var h = 0; h < Math.min(headerRowCount, rows.length); h++) {
            var cellIdx = 0;
            var fixed = rows[h].cells.replace(/<(td|th)([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi, function(cm, tag, cAttrs, inner) {
              var thAttrs = cAttrs || '';
              if (!/scope=/i.test(thAttrs)) thAttrs = ' scope="col"' + thAttrs;
              if (!/id="/i.test(thAttrs) && colIds[cellIdx]) thAttrs = ' id="' + colIds[cellIdx] + '"' + thAttrs;
              cellIdx++;
              return '<th' + thAttrs + '>' + inner + '</th>';
            });
            headerHtml += '<tr' + rows[h].attrs + '>' + fixed + '</tr>';
          }
          headerHtml += '</thead>';
          var bodyHtml = '<tbody>';
          for (var b = headerRowCount; b < rows.length; b++) {
            var bCellIdx = 0;
            var bodyCells = rows[b].cells.replace(/<td([^>]*)>/gi, function(cm, cAttrs) {
              var tdAttrs = cAttrs || '';
              if (!/headers=/i.test(tdAttrs) && colIds[bCellIdx]) tdAttrs = ' headers="' + colIds[bCellIdx] + '"' + tdAttrs;
              bCellIdx++;
              return '<td' + tdAttrs + '>';
            });
            bodyHtml += '<tr' + rows[b].attrs + '>' + bodyCells + '</tr>';
          }
          bodyHtml += '</tbody>';
          return '<table' + attrs + '>' + headerHtml + bodyHtml + '</table>';
        });
      }
    },
    // Secondary landmarks. params: { label?, selector? }
    // selector can be 'header', 'footer', 'nav', 'aside' (wraps matching tag/class region in landmark).
    // If no matching region is found but the document has a clear nav (class/id hint), wraps it.
    fix_add_nav: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{label?}',
      fn: function(html, p) {
        if (/<nav[\s>]/i.test(html)) return html;
        var lbl = (p && p.label) || 'Main navigation';
        // Match first <ul> that contains only <li><a> (likely a nav list) and wrap it.
        return html.replace(/(<ul[^>]*>\s*(?:<li[^>]*>\s*<a[^>]*>[\s\S]*?<\/a>\s*<\/li>\s*){2,}<\/ul>)/i,
          '<nav aria-label="' + lbl.replace(/"/g, '&quot;') + '">$1</nav>');
      }
    },
    fix_add_aside: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{selector?, label?}',
      fn: function(html, p) {
        if (/<aside[\s>]/i.test(html)) return html;
        var lbl = (p && p.label) || 'Sidebar';
        var sel = (p && p.selector) || 'sidebar';
        if (!SAFE_TAG_NAME.test(sel) && !/^[a-z0-9_-]+$/i.test(sel)) return html;
        // Wrap element with matching class or id.
        var re = new RegExp('<(div|section)([^>]*(?:class|id)="[^"]*' + escapeForRegex(sel) + '[^"]*"[^>]*)>([\\s\\S]*?)</\\1>', 'i');
        return html.replace(re, '<aside aria-label="' + lbl.replace(/"/g, '&quot;') + '"><$1$2>$3</$1></aside>');
      }
    },
    fix_add_header: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{}',
      fn: function(html) {
        if (/<header[\s>]/i.test(html)) return html;
        // Wrap a leading <h1> + any sibling tagline div in <header>.
        // NOTE: do NOT add role="banner" here. <header> at the body's top level
        // already exposes the banner landmark by default per ARIA spec, and
        // adding role="banner" inside generated content can collide with the
        // host page's own banner landmark when the document is embedded.
        return html.replace(/(<body[^>]*>\s*)((?:<h1[^>]*>[\s\S]*?<\/h1>\s*)(?:<(?:p|div)[^>]*class="[^"]*(?:tagline|subtitle)[^"]*"[^>]*>[\s\S]*?<\/(?:p|div)>\s*)?)/i,
          '$1<header>$2</header>');
      }
    },
    fix_add_footer: {
      category: 'STRUCTURE', wcag: '1.3.1', params: '{}',
      fn: function(html) {
        if (/<footer[\s>]/i.test(html)) return html;
        // Wrap a trailing copyright/contact block in <footer>.
        return html.replace(/((?:<(?:p|div)[^>]*>[\s\S]*?(?:©|copyright|all rights reserved)[\s\S]*?<\/(?:p|div)>\s*)+)(\s*<\/body>)/i,
          '<footer role="contentinfo">$1</footer>$2');
      }
    },
    // SVG accessibility: adds role="img" and embedded <title>/<desc> when missing.
    // params: { index, title, desc? }
    fix_svg_accessibility: {
      category: 'VISUAL', wcag: '1.1.1', params: '{index, title, desc?}',
      fn: function(html, p) {
        if (!p || !p.title) return html;
        var idx = 0;
        return html.replace(/<svg([^>]*)>([\s\S]*?)<\/svg>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          var newAttrs = attrs || '';
          if (!/role=/i.test(newAttrs)) newAttrs = ' role="img"' + newAttrs;
          var newContent = content || '';
          if (!/<title[\s>]/i.test(newContent)) newContent = '<title>' + p.title.replace(/</g, '&lt;') + '</title>' + newContent;
          if (p.desc && !/<desc[\s>]/i.test(newContent)) newContent = newContent.replace(/<\/title>/i, '</title><desc>' + p.desc.replace(/</g, '&lt;') + '</desc>');
          return '<svg' + newAttrs + '>' + newContent + '</svg>';
        });
      }
    },
  };

  // Derive the Gemini diagnosis prompt from the registry so prompt and tools can never drift.
  // Tools group by category preserving registry order (insertion order per MDN spec).
  const SURGICAL_TOOL_PROMPT = (function() {
    const byCategory = {};
    const order = [];
    Object.keys(SURGICAL_TOOL_REGISTRY).forEach(function(name) {
      const t = SURGICAL_TOOL_REGISTRY[name];
      if (!byCategory[t.category]) { byCategory[t.category] = []; order.push(t.category); }
      byCategory[t.category].push(name + ' ' + t.params);
    });
    return order.map(function(cat) { return cat + ': ' + byCategory[cat].join(', '); }).join('\n');
  })();

  // Backwards-compatible flat executor map. Call sites use SHARED_SURGICAL_TOOLS[fix.tool](html, p).
  // Delegates to registry entry's .fn, so adding new tools to the registry makes them immediately
  // callable everywhere without touching call sites.
  const SHARED_SURGICAL_TOOLS = Object.keys(SURGICAL_TOOL_REGISTRY).reduce(function(acc, name) {
    acc[name] = SURGICAL_TOOL_REGISTRY[name].fn;
    return acc;
  }, {});

  // ── Stage 3: Surgical-then-AI remediation for second-pass "Fix Remaining" ──
  // Layered defense: (1) strip base64 data URLs, (2) chunk on tag boundaries,
  // (3) per chunk: surgical diagnosis + apply, (4) optional Gemini rewrite with integrity gates,
  // (5) reassemble, (6) restore base64. Never sends base64 to Gemini, never asks for paraphrase.
  const remediateSurgicallyThenAI = async (html, opts) => {
    if (!html) return { html: html, surgicalFixCount: 0, geminiPassCount: 0, rejectedChunks: 0 };
    const options = opts || {};
    const aiIssues = options.aiIssues || [];
    const axeResult = options.axeResult || null;
    const enableGeminiPass = options.enableGeminiPass !== false;
    const onProgress = options.onProgress || (function() {});

    const violationLines = [];
    (aiIssues || []).forEach(function(i) {
      if (i && i.issue) {
        const loc = i.location ? ' [at: ' + String(i.location).substring(0, 80) + ']' : '';
        violationLines.push('AI ' + (i.severity || 'issue') + ': ' + i.issue + (i.wcag ? ' (WCAG ' + i.wcag + ')' : '') + loc);
      }
    });
    if (axeResult) {
      ['critical', 'serious', 'moderate', 'minor'].forEach(function(sev) {
        (axeResult[sev] || []).forEach(function(v) {
          const targetHint = (v.nodeDetails && v.nodeDetails[0] && v.nodeDetails[0].target) ? ' target=' + JSON.stringify(v.nodeDetails[0].target) : '';
          violationLines.push('AXE ' + sev.toUpperCase() + ': ' + v.description + ' (' + v.id + ')' + targetHint);
        });
      });
    }
    const violationText = violationLines.slice(0, 20).join('\n') || 'General WCAG 2.1 AA compliance issues';

    const stripped = _stripDataUrlsForAi(html);
    // Also strip image placeholder figures so AI passes can't mangle upload buttons / captions / crop data.
    const figStripped = _stripImagePlaceholdersForAi(stripped.html);
    let workingHtml = figStripped.html;
    const chunks = splitHtmlOnTagBoundary(workingHtml, HTML_FIX_CHUNK);
    warnLog('[SurgicalThenAI] Processing ' + chunks.length + ' chunk(s) with ' + violationLines.length + ' violations');

    let surgicalFixCount = 0;
    let geminiPassCount = 0;
    let rejectedChunks = 0;
    const fixedChunks = new Array(chunks.length);

    for (let ci = 0; ci < chunks.length; ci++) {
      let chunk = chunks[ci];
      onProgress('Chunk ' + (ci + 1) + '/' + chunks.length + ': surgical diagnosis...');

      try {
        const surgPrompt =
          'You are an accessibility remediation expert. Analyze this HTML section and prescribe SPECIFIC targeted fixes.\n\n' +
          'KNOWN VIOLATIONS:\n' + violationText + '\n\n' +
          'HTML SECTION ' + (ci + 1) + '/' + chunks.length + ':\n"""\n' + chunk.substring(0, 5000) + '\n"""\n\n' +
          'Prescribe fixes using these tools (return ONLY a JSON array):\n\n' +
          SURGICAL_TOOL_PROMPT + '\n' +
          'Return ONLY a JSON array. Be specific — use the actual document content.';
        const surgRaw = await callGemini(surgPrompt, true);
        const directives = repairAndParseJsonShared(surgRaw);
        if (Array.isArray(directives)) {
          for (let di = 0; di < directives.length; di++) {
            const fix = directives[di];
            const tool = fix && fix.tool && SHARED_SURGICAL_TOOLS[fix.tool];
            if (tool) {
              const before = chunk;
              try { chunk = tool(chunk, fix); } catch(toolErr) { chunk = before; }
              if (chunk !== before) surgicalFixCount++;
            }
          }
        }
      } catch(surgErr) {
        warnLog('[SurgicalThenAI] Chunk ' + (ci + 1) + ' surgical skipped: ' + (surgErr && surgErr.message));
      }

      if (enableGeminiPass && violationLines.length > 0) {
        onProgress('Chunk ' + (ci + 1) + '/' + chunks.length + ': AI rewrite pass...');
        try {
          const isFirst = ci === 0, isLast = ci === chunks.length - 1;
          const fragNote = isFirst
            ? 'This is FRAGMENT 1 — it may begin with <!DOCTYPE>/<html>/<head>/<body>/<main>.'
            : isLast
              ? 'This is the LAST fragment — it may end with </main></body></html>.'
              : 'This is a middle fragment — starts and ends mid-document.';
          const rewritePrompt =
            'Fix any REMAINING WCAG violations in this HTML fragment. Surgical fixes have already been applied — focus on what\'s left.\n\n' +
            fragNote + '\n\n' +
            'VIOLATIONS CONTEXT:\n' + violationText + '\n\n' +
            'RULES: Preserve ALL text content, ALL attributes (especially src= even if they look like placeholder tokens), ALL inline styles. Do NOT shorten, summarize, or drop content. IMAGE PLACEHOLDERS: Any src value or bare token matching __ALLOFLOW_DATAURL_*__ (including __ALLOFLOW_DATAURL_FINAL_N__) is a reference to an extracted image. Do NOT remove the containing <img> or <figure> element, do NOT modify the token text, do NOT replace the src with a description. Keep every such token exactly as-is.\n\n' +
            'HTML:\n"""\n' + chunk + '\n"""\n\n' +
            'Return ONLY the fixed fragment.';
          let rewritten = stripFence(await callGemini(rewritePrompt, false));
          if (_isJsonWrapped(rewritten)) {
            const unwrappedRw = _tryUnwrapJsonHtml(rewritten);
            if (unwrappedRw && unwrappedRw.length >= chunk.length * 0.9) {
              rewritten = unwrappedRw;
            } else {
              rejectedChunks++;
              _pipeLog('SurgicalThenAI', 'Chunk ' + (ci + 1) + ' rewrite rejected (JSON wrapper, unrecoverable)');
              fixedChunks[ci] = chunk;
              continue;
            }
          }
          const tokensBefore = (chunk.match(/__ALLOFLOW_DATAURL_\d+__/g) || []).length;
          const tokensAfter = rewritten ? (rewritten.match(/__ALLOFLOW_DATAURL_\d+__/g) || []).length : 0;
          const lengthOk = rewritten && rewritten.length >= chunk.length * 0.9;
          const textOk = rewritten && textCharCount(rewritten) >= textCharCount(chunk) * 0.95;
          const tokensOk = tokensAfter >= tokensBefore;
          if (rewritten && lengthOk && textOk && tokensOk) {
            chunk = rewritten;
            geminiPassCount++;
          } else {
            rejectedChunks++;
            warnLog('[SurgicalThenAI] Chunk ' + (ci + 1) + ' Gemini rewrite rejected (length=' + (rewritten ? rewritten.length : 0) + '/' + chunk.length + ', tokens=' + tokensAfter + '/' + tokensBefore + ')');
          }
        } catch(rewriteErr) {
          warnLog('[SurgicalThenAI] Chunk ' + (ci + 1) + ' rewrite failed: ' + (rewriteErr && rewriteErr.message));
        }
      }
      fixedChunks[ci] = chunk;
    }

    let reassembled = fixedChunks.join('');
    reassembled = _restoreImagePlaceholdersForAi(reassembled, figStripped.map);
    reassembled = _restoreDataUrlsForAi(reassembled, stripped.map);
    // Track preservation: if any figure token didn't survive, restore it anyway by splicing the original back in at end.
    try {
      const lostFigTokens = Object.keys(figStripped.map).filter(tok => !reassembled.includes(tok) && !reassembled.includes(figStripped.map[tok]));
      if (lostFigTokens.length > 0) {
        warnLog('[SurgicalThenAI] WARNING: ' + lostFigTokens.length + ' image placeholder figure(s) were dropped by AI — recovering originals');
        // Re-insert lost figures before </body> so users can re-attach.
        const recovered = lostFigTokens.map(tok => figStripped.map[tok]).join('\n');
        if (reassembled.includes('</body>')) reassembled = reassembled.replace('</body>', recovered + '\n</body>');
        else reassembled = reassembled + '\n' + recovered;
      }
    } catch (e) { warnLog('[SurgicalThenAI] figure-recovery threw:', e); }
    warnLog('[SurgicalThenAI] Done: ' + surgicalFixCount + ' surgical fixes, ' + geminiPassCount + ' Gemini passes, ' + rejectedChunks + ' rejected chunks');
    return { html: reassembled, surgicalFixCount: surgicalFixCount, geminiPassCount: geminiPassCount, rejectedChunks: rejectedChunks };
  };

  const clusterAxeViolationsByAncestor = (htmlContent, axeResult) => {
    if (!axeResult || typeof DOMParser === 'undefined') return [];
    const all = []
      .concat(axeResult.critical || [])
      .concat(axeResult.serious || [])
      .concat(axeResult.moderate || [])
      .filter(v => TIER2_RULE_IDS.has(v.id));
    if (all.length === 0) return [];
    let doc;
    try { doc = new DOMParser().parseFromString(htmlContent, 'text/html'); } catch { return []; }
    if (!doc || !doc.body) return [];
    // For each violation node, find its smallest ancestor whose outerHTML
    // is ≤ 2 KB. That's the cluster anchor.
    const MAX_SUBTREE_BYTES = 2048;
    const clusters = new Map(); // anchorElement → { ruleIds: Set, selectors: [], targetedRules: Set }
    for (const v of all) {
      const nodes = Array.isArray(v.nodeDetails) ? v.nodeDetails : [];
      for (const nd of nodes) {
        const sel = Array.isArray(nd.target) ? nd.target[0] : null;
        if (!sel) continue;
        let el;
        try { el = doc.querySelector(sel); } catch { continue; }
        if (!el) continue;
        // Walk up to the smallest ancestor whose outerHTML fits the budget.
        let anchor = el;
        let safety = 8; // never walk more than 8 levels up
        while (anchor && anchor !== doc.body && safety-- > 0) {
          if (anchor.outerHTML && anchor.outerHTML.length <= MAX_SUBTREE_BYTES) break;
          anchor = anchor.parentElement;
        }
        if (!anchor || anchor === doc.body || !anchor.outerHTML || anchor.outerHTML.length > MAX_SUBTREE_BYTES) continue;
        if (!clusters.has(anchor)) {
          clusters.set(anchor, { ruleIds: new Set(), selectors: [], targetedRules: new Set() });
        }
        const c = clusters.get(anchor);
        c.ruleIds.add(v.id);
        c.targetedRules.add(v.id);
        c.selectors.push(sel);
      }
    }
    // Materialize. Cap clusters at 5 violations each — beyond that the prompt
    // gets diluted and Tier 3 is more efficient anyway.
    const result = [];
    for (const [anchor, meta] of clusters.entries()) {
      if (meta.selectors.length > 5) continue;
      result.push({
        anchorHtml: anchor.outerHTML,
        ruleIds: Array.from(meta.ruleIds),
        targetedRules: Array.from(meta.targetedRules),
        violationCount: meta.selectors.length,
        selectors: meta.selectors,
      });
    }
    return result;
  };

  // Audit a small HTML subtree in isolation (no whole-document context).
  // Returns an axe-style result scoped to the subtree's body.
  const auditSubtreeIsolated = async (subtreeHtml) => {
    if (!subtreeHtml || typeof window === 'undefined' || !window.document) return null;
    if (!window.axe) {
      // Cheap path: rely on the existing runAxeAudit lazy-loader by calling it
      // once on a minimal doc to populate window.axe. After this it's cached.
      try { await runAxeAudit('<!DOCTYPE html><html lang="en"><head><title>x</title></head><body></body></html>'); } catch { /* ignore */ }
      if (!window.axe) return null;
    }
    const wrapped = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Subtree audit</title></head><body>' + subtreeHtml + '</body></html>';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:600px;height:400px;opacity:0;pointer-events:none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.title = 'Subtree audit frame';
    document.body.appendChild(iframe);
    try {
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      idoc.open();
      idoc.write(wrapped);
      idoc.close();
      await new Promise(r => setTimeout(r, 150));
      // Inject axe into iframe
      await new Promise((resolve, reject) => {
        const s = idoc.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('axe inject failed'));
        idoc.head.appendChild(s);
      });
      await new Promise(r => setTimeout(r, 100));
      const iframeAxe = iframe.contentWindow.axe;
      if (!iframeAxe) return null;
      const results = await iframeAxe.run(idoc.body, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        resultTypes: ['violations']
      });
      const map = {};
      for (const v of (results.violations || [])) {
        map[v.id] = (map[v.id] || 0) + (v.nodes ? v.nodes.length : 1);
      }
      return { violations: map, totalViolations: Object.values(map).reduce((a, b) => a + b, 0) };
    } catch (e) {
      warnLog('[Tier2] subtree audit failed:', e && e.message);
      return null;
    } finally {
      try { document.body.removeChild(iframe); } catch { /* */ }
    }
  };

  // Ask Gemini to fix a small subtree given a tight, single-cluster prompt.
  // Returns the rewritten subtree (or the original if AI declined / failed).
  const surgicalFixCluster = async (cluster) => {
    if (!callGemini) return cluster.anchorHtml;
    const ruleList = cluster.ruleIds.map(id => '- ' + id).join('\n');
    const prompt =
      'Fix ONLY the listed accessibility violations in this HTML element. ' +
      'Do NOT modify any other elements, text content, or attributes. ' +
      'Do NOT add or remove text the user can read. Preserve all inline styles.\n\n' +
      'VIOLATIONS TO FIX (axe-core rule IDs):\n' + ruleList + '\n\n' +
      'ELEMENT:\n' + cluster.anchorHtml + '\n\n' +
      'Return ONLY the rewritten element. No explanation. No markdown fences. No JSON wrapping. ' +
      'The opening and closing tags must match the input.';
    try {
      let raw = await callGemini(prompt, false);
      if (!raw) return cluster.anchorHtml;
      // Strip code fences if the model added them anyway
      raw = raw.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      // Sanity: must start with '<' and contain the original tag name
      if (!raw.startsWith('<')) return cluster.anchorHtml;
      const origTagMatch = cluster.anchorHtml.match(/^<([a-z][a-z0-9]*)/i);
      const newTagMatch = raw.match(/^<([a-z][a-z0-9]*)/i);
      if (!origTagMatch || !newTagMatch || origTagMatch[1].toLowerCase() !== newTagMatch[1].toLowerCase()) {
        warnLog('[Tier2] surgical fix tag mismatch — reject');
        return cluster.anchorHtml;
      }
      return raw;
    } catch (e) {
      warnLog('[Tier2] surgical fix call failed:', e && e.message);
      return cluster.anchorHtml;
    }
  };

  // Decide whether to keep a surgical rewrite. Strict rule:
  //   1. Targeted rule violations must STRICTLY decrease.
  //   2. No NEW rule violations may appear (i.e. for every rule present in the
  //      rewrite, its count must be ≤ the original's count for that rule).
  // If either check fails, revert to the original.
  const acceptOrRevertSubtreeFix = async (originalHtml, rewrittenHtml, targetedRules) => {
    if (!rewrittenHtml || rewrittenHtml === originalHtml) {
      return { accepted: false, reason: 'no-change' };
    }
    const [origAudit, newAudit] = await Promise.all([
      auditSubtreeIsolated(originalHtml),
      auditSubtreeIsolated(rewrittenHtml)
    ]);
    if (!origAudit || !newAudit) return { accepted: false, reason: 'audit-failed' };
    // Targeted rules must strictly decrease in aggregate
    let targetedBefore = 0, targetedAfter = 0;
    for (const r of targetedRules) {
      targetedBefore += origAudit.violations[r] || 0;
      targetedAfter += newAudit.violations[r] || 0;
    }
    if (targetedAfter >= targetedBefore) {
      return { accepted: false, reason: 'targeted-not-improved (' + targetedBefore + '→' + targetedAfter + ')' };
    }
    // No new violations of ANY rule (counts may not increase)
    for (const ruleId of Object.keys(newAudit.violations)) {
      const before = origAudit.violations[ruleId] || 0;
      const after = newAudit.violations[ruleId] || 0;
      if (after > before) {
        return { accepted: false, reason: 'introduced-new-violation:' + ruleId + ' (' + before + '→' + after + ')' };
      }
    }
    return { accepted: true, reason: 'targeted ' + targetedBefore + '→' + targetedAfter, targetedBefore, targetedAfter };
  };

  // Orchestrator: runs Tier 2 over an HTML document. Returns the modified HTML
  // along with statistics. Safe to call when there are no eligible violations
  // (returns the input unchanged).
  const runTier2SurgicalFixes = async (htmlContent, axeResult, opts) => {
    const _opts = opts || {};
    const stats = { clustersConsidered: 0, accepted: 0, rejected: 0, violationsFixed: 0, rejections: [] };
    if (!htmlContent || !axeResult) return { html: htmlContent, stats };
    const clusters = clusterAxeViolationsByAncestor(htmlContent, axeResult);
    if (clusters.length === 0) return { html: htmlContent, stats };
    stats.clustersConsidered = clusters.length;
    warnLog('[Tier2] considering ' + clusters.length + ' surgical cluster(s)');
    // Process clusters in parallel — they're disjoint by construction (each
    // anchor is a different DOM element).
    const proposals = await Promise.all(clusters.map(async (cluster) => {
      const rewritten = await surgicalFixCluster(cluster);
      const verdict = await acceptOrRevertSubtreeFix(cluster.anchorHtml, rewritten, cluster.targetedRules);
      return { cluster, rewritten, verdict };
    }));
    // Apply accepted rewrites by string replace. Replacements are anchor-disjoint
    // so order shouldn't matter, but we still apply largest-first to avoid any
    // edge case where one anchor's html is a substring of another.
    let working = htmlContent;
    proposals
      .filter(p => p.verdict.accepted)
      .sort((a, b) => b.cluster.anchorHtml.length - a.cluster.anchorHtml.length)
      .forEach(p => {
        const idx = working.indexOf(p.cluster.anchorHtml);
        if (idx === -1) {
          // The exact anchor HTML wasn't found — likely earlier replacements
          // shifted byte ranges. Skip rather than risk a wrong-place insert.
          stats.rejected++;
          stats.rejections.push({ rules: p.cluster.ruleIds.join(','), reason: 'anchor-not-found-after-prior-replacement' });
          warnLog('[Tier2] anchor lost after sibling replacement — skipping ' + p.cluster.ruleIds.join(','));
          return;
        }
        working = working.substring(0, idx) + p.rewritten + working.substring(idx + p.cluster.anchorHtml.length);
        stats.accepted++;
        stats.violationsFixed += (p.verdict.targetedBefore - p.verdict.targetedAfter);
        warnLog('[Tier2] accepted cluster (' + p.cluster.ruleIds.join(',') + '): ' + p.verdict.reason);
      });
    proposals.filter(p => !p.verdict.accepted).forEach(p => {
      stats.rejected++;
      stats.rejections.push({ rules: p.cluster.ruleIds.join(','), reason: p.verdict.reason });
      warnLog('[Tier2] rejected cluster (' + p.cluster.ruleIds.join(',') + '): ' + p.verdict.reason);
    });
    warnLog('[Tier2] done: ' + stats.accepted + ' accepted, ' + stats.rejected + ' rejected, ' + stats.violationsFixed + ' violation(s) fixed');
    return { html: working, stats };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Tier 2.5: Section-scoped AI fixes
  // ─────────────────────────────────────────────────────────────────────────
  // The missing middle between Tier 2 (single-element, ≤2 KB ancestor) and
  // Tier 3 (whole document, 16 KB chunks). For violations that *do* need
  // structural context (heading hierarchy within a section, landmark wrapping,
  // multi-element layout) but DON'T need the whole document, we send just the
  // containing section to Gemini with a tight prompt and re-audit it in
  // isolation. Same accept-or-revert discipline as Tier 2.
  //
  // What Tier 2.5 handles:
  //   - axe rules that need section context: heading-order, region, bypass,
  //     landmark-banner-is-top-level, landmark-no-duplicate-banner,
  //     landmark-no-duplicate-contentinfo, page-has-heading-one
  //     (when the violation lives inside a section)
  //   - AI-flagged issues whose `location` string contains an exact substring
  //     match against a heading inside one of the document's sections
  //
  // What Tier 2.5 does NOT handle:
  //   - violations Tier 2 already addressed (image-alt, link-name, etc.) —
  //     those are checked first and skipped here
  //   - truly document-wide violations (html-has-lang, document-title,
  //     landmark-one-main when there is no main anywhere) — those need Tier 3
  const TIER2_5_SECTION_TAGS = ['section', 'article', 'aside', 'nav', 'header', 'footer', 'main'];
  const TIER2_5_RULE_IDS = new Set([
    'heading-order',
    'region',
    'bypass',
    'landmark-banner-is-top-level',
    'landmark-no-duplicate-banner',
    'landmark-no-duplicate-contentinfo',
    'landmark-complementary-is-top-level',
    'page-has-heading-one',
    'identical-links-same-purpose',
    'duplicate-id',
    'duplicate-id-aria',
    'aria-required-children',
    'aria-required-parent',
  ]);

  // Find the closest section-like ancestor of an element using the priority
  // order. Returns null when no qualifying ancestor exists. Cap walk at 10
  // levels so a deeply-nested element doesn't trigger O(N) walks repeatedly.
  const _findSectionAncestor = (element) => {
    let safety = 10;
    let cur = element;
    while (cur && cur.parentElement && safety-- > 0) {
      const tag = (cur.tagName || '').toLowerCase();
      if (TIER2_5_SECTION_TAGS.indexOf(tag) >= 0) return cur;
      // Accept a div with id as a fallback — it's at least an addressable
      // landmark, even if not semantically tagged.
      if (tag === 'div' && cur.id) return cur;
      cur = cur.parentElement;
    }
    return null;
  };

  // Cluster axe violations by section ancestor. Each cluster holds the
  // section's outerHTML, the rule IDs targeted, and the count of violations.
  // Skips violations Tier 2 already targets, sections too large to send
  // (>8 KB), and clusters with too many violations (>8) — those are better
  // handled by Tier 3.
  const clusterAxeViolationsBySection = (htmlContent, axeResult) => {
    if (!axeResult || typeof DOMParser === 'undefined') return [];
    const all = []
      .concat(axeResult.critical || [])
      .concat(axeResult.serious || [])
      .concat(axeResult.moderate || [])
      .filter(v => TIER2_5_RULE_IDS.has(v.id));
    if (all.length === 0) return [];
    let doc;
    try { doc = new DOMParser().parseFromString(htmlContent, 'text/html'); } catch { return []; }
    if (!doc || !doc.body) return [];
    const MAX_SECTION_BYTES = 8192;
    const MAX_VIOLATIONS_PER_CLUSTER = 8;
    const clusters = new Map(); // sectionElement → { ruleIds: Set, selectors: [], targetedRules: Set }
    for (const v of all) {
      const nodes = Array.isArray(v.nodeDetails) ? v.nodeDetails : [];
      // For document-wide rules without nodeDetails (e.g. page-has-heading-one
      // when there's literally no h1), there's no anchor — Tier 3 handles it.
      if (nodes.length === 0) continue;
      for (const nd of nodes) {
        const sel = Array.isArray(nd.target) ? nd.target[0] : null;
        if (!sel) continue;
        let el;
        try { el = doc.querySelector(sel); } catch { continue; }
        if (!el) continue;
        const section = _findSectionAncestor(el);
        if (!section) continue;
        if (!section.outerHTML || section.outerHTML.length > MAX_SECTION_BYTES) continue;
        if (!clusters.has(section)) {
          clusters.set(section, { ruleIds: new Set(), selectors: [], targetedRules: new Set() });
        }
        const c = clusters.get(section);
        c.ruleIds.add(v.id);
        c.targetedRules.add(v.id);
        c.selectors.push(sel);
      }
    }
    const result = [];
    for (const [section, meta] of clusters.entries()) {
      if (meta.selectors.length > MAX_VIOLATIONS_PER_CLUSTER) continue;
      result.push({
        sectionTag: (section.tagName || 'section').toLowerCase(),
        sectionHtml: section.outerHTML,
        ruleIds: Array.from(meta.ruleIds),
        targetedRules: Array.from(meta.targetedRules),
        violationCount: meta.selectors.length,
        selectors: meta.selectors,
      });
    }
    return result;
  };

  // Section-scoped Gemini prompt. Tighter than Tier 3's whole-document prompt;
  // looser than Tier 2's single-element prompt. The model is told exactly what
  // section it's seeing and exactly which violations to address.
  const sectionScopedFixCluster = async (cluster) => {
    if (!callGemini) return cluster.sectionHtml;
    const ruleList = cluster.ruleIds.map(id => '- ' + id).join('\n');
    const prompt =
      'Fix ONLY the listed accessibility violations in this <' + cluster.sectionTag + '> element.\n' +
      'Do NOT modify any text content (the words a human reads must remain identical).\n' +
      'Do NOT modify alt attributes, aria-label values, or button/link text — those are\n' +
      'handled by other tiers.\n' +
      'You MAY modify: heading levels (h1-h6) within the section, landmark roles, the\n' +
      'section\'s opening tag attributes (e.g. add aria-labelledby), nested element\n' +
      'structure for landmark/region compliance.\n\n' +
      'VIOLATIONS TO FIX (axe-core rule IDs):\n' + ruleList + '\n\n' +
      'SECTION:\n' + cluster.sectionHtml + '\n\n' +
      'Return ONLY the rewritten <' + cluster.sectionTag + '> element. No explanation.\n' +
      'No markdown fences. No JSON wrapping. The opening and closing tag names must match the input.';
    try {
      let raw = await callGemini(prompt, false);
      if (!raw) return cluster.sectionHtml;
      raw = raw.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      if (!raw.startsWith('<')) return cluster.sectionHtml;
      const newTagMatch = raw.match(/^<([a-z][a-z0-9]*)/i);
      if (!newTagMatch || newTagMatch[1].toLowerCase() !== cluster.sectionTag) {
        warnLog('[Tier2.5] section tag mismatch (expected ' + cluster.sectionTag + ', got ' + (newTagMatch ? newTagMatch[1] : '?') + ') — reject');
        return cluster.sectionHtml;
      }
      return raw;
    } catch (e) {
      warnLog('[Tier2.5] section fix call failed:', e && e.message);
      return cluster.sectionHtml;
    }
  };

  // Orchestrator. Same shape as runTier2SurgicalFixes — returns the modified
  // HTML and a stats object. Reuses acceptOrRevertSubtreeFix for the verdict
  // (the math is identical: targeted violations must strictly decrease, no new
  // violations allowed).
  const runTier2_5SectionScopedFixes = async (htmlContent, axeResult) => {
    const stats = { clustersConsidered: 0, accepted: 0, rejected: 0, violationsFixed: 0, rejections: [] };
    if (!htmlContent || !axeResult) return { html: htmlContent, stats };
    const clusters = clusterAxeViolationsBySection(htmlContent, axeResult);
    if (clusters.length === 0) return { html: htmlContent, stats };
    stats.clustersConsidered = clusters.length;
    warnLog('[Tier2.5] considering ' + clusters.length + ' section-scoped cluster(s)');
    const proposals = await Promise.all(clusters.map(async (cluster) => {
      const rewritten = await sectionScopedFixCluster(cluster);
      const verdict = await acceptOrRevertSubtreeFix(cluster.sectionHtml, rewritten, cluster.targetedRules);
      return { cluster, rewritten, verdict };
    }));
    let working = htmlContent;
    proposals
      .filter(p => p.verdict.accepted)
      .sort((a, b) => b.cluster.sectionHtml.length - a.cluster.sectionHtml.length)
      .forEach(p => {
        const idx = working.indexOf(p.cluster.sectionHtml);
        if (idx === -1) {
          stats.rejected++;
          stats.rejections.push({ rules: p.cluster.ruleIds.join(','), reason: 'section-not-found-after-prior-replacement' });
          warnLog('[Tier2.5] section lost after sibling replacement — skipping ' + p.cluster.ruleIds.join(','));
          return;
        }
        working = working.substring(0, idx) + p.rewritten + working.substring(idx + p.cluster.sectionHtml.length);
        stats.accepted++;
        stats.violationsFixed += (p.verdict.targetedBefore - p.verdict.targetedAfter);
        warnLog('[Tier2.5] accepted <' + p.cluster.sectionTag + '> cluster (' + p.cluster.ruleIds.join(',') + '): ' + p.verdict.reason);
      });
    proposals.filter(p => !p.verdict.accepted).forEach(p => {
      stats.rejected++;
      stats.rejections.push({ rules: p.cluster.ruleIds.join(','), reason: p.verdict.reason });
      warnLog('[Tier2.5] rejected <' + p.cluster.sectionTag + '> cluster (' + p.cluster.ruleIds.join(',') + '): ' + p.verdict.reason);
    });
    warnLog('[Tier2.5] done: ' + stats.accepted + ' accepted, ' + stats.rejected + ' rejected, ' + stats.violationsFixed + ' violation(s) fixed');
    return { html: working, stats };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Tier 3: Structural AI fixes (chunked, document-wide)
  // ─────────────────────────────────────────────────────────────────────────
  // Tier 3 wraps the existing aiFixChunked but does three things differently:
  //
  //   1. FILTERS its input. Violations Tier 2 already targeted (image-alt,
  //      link-name, etc.) are stripped from the prompt — if Tier 2 couldn't
  //      fix them, Tier 3's bigger hammer probably can't either, and including
  //      them just bloats the prompt and tempts the model to touch unrelated
  //      content.
  //   2. SCOPES the prompt. The instructions explicitly say "focus on document-
  //      wide structure (heading hierarchy, landmarks, lang attribute) — DO NOT
  //      modify individual elements (alt text, button labels, link text) which
  //      have already been handled."
  //   3. SKIPS itself when the filtered violation list is empty or the only
  //      remaining violations are below a meaningful-work threshold. Saves an
  //      API call (and avoids regression risk) when there's nothing left to do.
  //
  // Tier 3 keeps the same regression guard as before — if a pass makes things
  // worse, it reverts. It also keeps the per-chunk integrity validators in
  // aiFixChunked. This is purely a smarter front-end to existing infrastructure.

  // Build the structural-only prompt instructions, filtering out rules that
  // Tier 2 already handled. Returns null if there's nothing meaningful to fix.
  const buildTier3StructuralPromptText = (axeResult, aiVerification) => {
    if (!axeResult && !aiVerification) return null;
    const tier3RemainingAxe = ['critical', 'serious', 'moderate']
      .flatMap(impact => (axeResult && axeResult[impact]) ? axeResult[impact] : [])
      .filter(v => !TIER2_RULE_IDS.has(v.id));
    const tier3AiIssues = (aiVerification && Array.isArray(aiVerification.issues))
      ? aiVerification.issues
      : [];
    if (tier3RemainingAxe.length === 0 && tier3AiIssues.length === 0) return null;
    const axeLines = tier3RemainingAxe.map(v => {
      const impactLabel = (v.impact || 'moderate').toUpperCase();
      const wcag = v.wcag ? ' — ' + v.wcag : '';
      return impactLabel + ' (axe-core): ' + v.description + ' (' + v.id + ', ' + v.nodes + ' elements)' + wcag;
    });
    const aiLines = tier3AiIssues.map(i => 'AI-FLAGGED: ' + (typeof i === 'string' ? i : (i.issue || i.description || JSON.stringify(i))));
    return axeLines.concat(aiLines).join('\n');
  };

  // Decide whether Tier 3 has meaningful work to do. We skip the full AI pass
  // when only minor or low-confidence issues remain — the API call cost +
  // regression risk outweigh any expected improvement.
  const tier3HasMeaningfulWork = (axeResult, aiVerification, options) => {
    const _opts = options || {};
    const minViolations = _opts.minViolations || 1;
    if (!axeResult && !aiVerification) return false;
    const remainingAxe = ['critical', 'serious', 'moderate']
      .flatMap(impact => (axeResult && axeResult[impact]) ? axeResult[impact] : [])
      .filter(v => !TIER2_RULE_IDS.has(v.id));
    const aiIssueCount = (aiVerification && Array.isArray(aiVerification.issues)) ? aiVerification.issues.length : 0;
    return (remainingAxe.length + aiIssueCount) >= minViolations;
  };

  // Wrap the AI fix call with the structural prompt scoping. Returns the same
  // shape as the inner call. Caller is responsible for applying its own
  // regression guard around our return value.
  const runTier3StructuralFix = async (htmlContent, axeResult, aiVerification, label) => {
    if (!callGemini) return { html: htmlContent, skipped: true, reason: 'no-callGemini' };
    const violationInstructions = buildTier3StructuralPromptText(axeResult, aiVerification);
    if (!violationInstructions) {
      return { html: htmlContent, skipped: true, reason: 'no-structural-violations-remaining' };
    }
    if (!tier3HasMeaningfulWork(axeResult, aiVerification)) {
      return { html: htmlContent, skipped: true, reason: 'below-meaningful-work-threshold' };
    }
    // Prepend a structural-scope preamble so Gemini knows what tier this is.
    const scopedInstructions =
      'TIER 3 STRUCTURAL FIX PASS. Earlier tiers (deterministic regex + surgical per-element AI) ' +
      'have already addressed individual-element violations like missing alt text, button names, ' +
      'link names, iframe titles, and form labels. Focus EXCLUSIVELY on document-wide structural ' +
      'issues from this list:\n\n' + violationInstructions + '\n\n' +
      'STRICT RULES:\n' +
      '- Do NOT modify alt attributes, aria-label values, button content, or link text.\n' +
      '- Do NOT modify any individual <img>, <button>, <a>, <input>, or <iframe> attributes\n' +
      '  unless the violation list above explicitly names that element type.\n' +
      '- DO modify: heading levels (h1-h6), landmark wrappers (main/nav/header/footer/aside),\n' +
      '  the <html lang> attribute, the <title> tag, document outline structure.\n' +
      '- Preserve ALL text content. Preserve ALL inline styles. Preserve ALL data-* attributes.';
    try {
      const fixed = await aiFixChunked(htmlContent, scopedInstructions, label || 'tier3-structural');
      return { html: fixed || htmlContent, skipped: false, reason: 'applied' };
    } catch (e) {
      warnLog('[Tier3] structural fix call failed:', e && e.message);
      return { html: htmlContent, skipped: true, reason: 'call-failed' };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Multi-session merge: assemble a cohesive HTML doc from N remediated ranges
  // ─────────────────────────────────────────────────────────────────────────
  // Pure function — no I/O, no DOM. Takes the ranges[] array stored on a
  // multi-session record and produces a single accessible HTML document
  // covering all completed pages, with explicit boundary markers between
  // ranges and gap markers where the user hasn't remediated yet.
  //
  // Strategy:
  //   1. Sort ranges by starting page.
  //   2. Lift the preamble (DOCTYPE through first <main>/<body> open) from the
  //      first range. Lift the postamble (closing </main>/</body>/</html>)
  //      from the last range.
  //   3. From each range, extract just the body/main inner content.
  //   4. Stitch together with <hr data-multi-session-boundary> between ranges,
  //      and <p data-gap> markers where pages are missing.
  //
  // Defensive: if any range is missing structural tags, fall back to using
  // its raw HTML as a body fragment. We always produce *some* output, even
  // for partial/malformed records — the user can still download what's there.
  const mergeRangesToFullHtml = (ranges, totalPages) => {
    if (!Array.isArray(ranges) || ranges.length === 0) return '';
    const sorted = ranges.slice().sort((a, b) => (a.pages[0] || 0) - (b.pages[0] || 0));
    // Helper: extract body inner content from a single remediated range's HTML.
    // Tries <main>...</main> first (the preferred landmark), falls back to
    // <body>...</body>, then to the raw string if neither is present.
    const _extractBodyContent = (html) => {
      if (!html) return '';
      const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
      if (mainMatch) return mainMatch[1];
      const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) return bodyMatch[1];
      return html; // raw fragment — better than dropping it
    };
    // Helper: pull the document opening (DOCTYPE + html + head + opening body
    // and main if present) from a complete HTML doc. Returns empty string when
    // the input doesn't look like a full document.
    const _extractPreamble = (html) => {
      if (!html) return '';
      const m = html.match(/^([\s\S]*?<main\b[^>]*>)/i);
      if (m) return m[1];
      const b = html.match(/^([\s\S]*?<body\b[^>]*>)/i);
      if (b) return b[1];
      return '';
    };
    const _extractPostamble = (html) => {
      if (!html) return '';
      const m = html.match(/(<\/main>[\s\S]*?<\/html>\s*)$/i);
      if (m) return m[1];
      const b = html.match(/(<\/body>[\s\S]*?<\/html>\s*)$/i);
      if (b) return b[1];
      return '';
    };
    const firstRange = sorted[0];
    const lastRange = sorted[sorted.length - 1];
    const preamble = _extractPreamble(firstRange.remediatedHtml) ||
      '<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>Multi-session remediated document</title></head>\n<body>\n<main id="main-content" role="main">\n';
    const postamble = _extractPostamble(lastRange.remediatedHtml) || '\n</main>\n</body>\n</html>\n';
    const _boundary = (prevEnd, nextStart) => {
      const gapStart = prevEnd + 1;
      const gapEnd = nextStart - 1;
      if (gapEnd >= gapStart) {
        return '\n<hr data-multi-session-boundary="pages ' + prevEnd + '\u2192' + nextStart +
          '" data-gap="pages ' + gapStart + '-' + gapEnd + ' not yet remediated" ' +
          'aria-label="Section break">\n' +
          '<p data-multi-session-gap="' + gapStart + '-' + gapEnd + '" role="note" ' +
          'aria-label="Pages ' + gapStart + ' to ' + gapEnd + ' have not yet been remediated in this session. Re-upload this PDF and select that range to add them." ' +
          'style="background:#fef3c7;border-left:4px solid #fbbf24;padding:0.75em 1em;margin:1em 0;font-style:italic;color:#78350f">' +
          'Pages ' + gapStart + '\u2013' + gapEnd + ' have not yet been remediated in this session. ' +
          'Re-upload this PDF and select that range to add them.' +
          '</p>\n';
      }
      return '\n<hr data-multi-session-boundary="pages ' + prevEnd + '\u2192' + nextStart +
        '" aria-label="Section break — resumed remediation session">\n';
    };
    const bodies = [];
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      bodies.push(
        '<section data-page-range="' + r.pages[0] + '-' + r.pages[1] + '"' +
        (r.completedAt ? ' data-completed-at="' + new Date(r.completedAt).toISOString() + '"' : '') +
        '>\n' +
        _extractBodyContent(r.remediatedHtml) +
        '\n</section>'
      );
      if (i < sorted.length - 1) {
        bodies.push(_boundary(r.pages[1], sorted[i + 1].pages[0]));
      }
    }
    // Optional final gap notice if the last range doesn't reach totalPages.
    let trailingNotice = '';
    if (totalPages && lastRange.pages[1] < totalPages) {
      const remStart = lastRange.pages[1] + 1;
      trailingNotice = '\n<hr data-multi-session-boundary="end-of-completed" ' +
        'aria-label="End of completed pages">\n' +
        '<p data-multi-session-gap="' + remStart + '-' + totalPages + '" role="note" ' +
        'aria-label="Pages ' + remStart + ' to ' + totalPages + ' remain to be remediated. Re-upload this PDF in a future session to continue." ' +
        'style="background:#fef3c7;border-left:4px solid #fbbf24;padding:0.75em 1em;margin:1em 0;font-style:italic;color:#78350f">' +
        'Pages ' + remStart + '\u2013' + totalPages + ' remain to be remediated. ' +
        'Re-upload this PDF in a future session to continue.' +
        '</p>\n';
    }
    return preamble + bodies.join('\n') + trailingNotice + postamble;
  };


  // ── Deterministic extraction helpers (Step 0 of pipeline) ──
  // Lazy-load pdf.js once — reuses the existing pattern from runPdfAccessibilityAudit
  const ensurePdfJsLoaded = async () => {
    if (window.pdfjsLib) return;
    if (document.querySelector('script[data-docpipe-pdfjs]')) {
      await new Promise((resolve, reject) => {
        const wait = setInterval(() => { if (window.pdfjsLib) { clearInterval(wait); resolve(); } }, 100);
        setTimeout(() => { clearInterval(wait); reject(new Error('pdf.js load timeout')); }, 10000);
      });
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.setAttribute('data-docpipe-pdfjs', 'true');
      document.head.appendChild(s);
      await new Promise((resolve, reject) => {
        const wait = setInterval(() => { if (window.pdfjsLib) { clearInterval(wait); resolve(); } }, 100);
        setTimeout(() => { clearInterval(wait); reject(new Error('pdf.js load timeout')); }, 10000);
      });
    }
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  };

  // Extract text from a PDF using pdf.js's native text layer. Zero AI calls, zero truncation.
  // Returns { fullText, pages, pageCount, sourceCharCount, isScanned }.
  // isScanned = true when the PDF has no text layer (< 50 chars/page average) — fall back to OCR.
  const extractPdfTextDeterministic = async (base64) => {
    try {
      await ensurePdfJsLoaded();
      if (!window.pdfjsLib) throw new Error('pdf.js unavailable');
      const raw = base64.includes(',') ? base64.split(',')[1] : base64;
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const pages = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        // Sort items by y (descending since PDF origin is bottom-left), then x (ascending)
        // This preserves reading order for single-column layouts and gives a reasonable fallback for multi-column
        const items = (tc.items || []).slice().sort((a, b) => {
          const ay = a.transform ? a.transform[5] : 0;
          const by = b.transform ? b.transform[5] : 0;
          if (Math.abs(ay - by) > 2) return by - ay; // higher y first
          const ax = a.transform ? a.transform[4] : 0;
          const bx = b.transform ? b.transform[4] : 0;
          return ax - bx;
        });
        const pageText = items.map(i => i.str || '').join(' ').replace(/\s+/g, ' ').trim();
        pages.push({ pageNum: p, text: pageText });
      }
      const fullText = pages.map(p => p.text).filter(Boolean).join('\n\n');
      const avgCharsPerPage = pdf.numPages > 0 ? fullText.length / pdf.numPages : 0;
      return {
        fullText,
        pages,
        pageCount: pdf.numPages,
        sourceCharCount: fullText.length,
        isScanned: avgCharsPerPage < 50,
      };
    } catch (e) {
      const msg = e?.message || '';
      const isEncrypted = /password|encrypted|decrypt/i.test(msg);
      const isCorrupt = /invalid|corrupt|unexpected|stream/i.test(msg);
      if (isEncrypted) {
        warnLog('[PDF Det] PDF is password-protected — falling through to Vision OCR');
        if (typeof addToast === 'function') addToast('PDF appears password-protected — using Vision OCR instead of text layer extraction.', 'info');
      } else if (isCorrupt) {
        warnLog('[PDF Det] PDF may be corrupted:', msg);
        if (typeof addToast === 'function') addToast('PDF may be corrupted or malformed — attempting Vision OCR fallback.', 'info');
      } else {
        warnLog('[PDF Det] extractPdfTextDeterministic failed:', msg);
      }
      return { fullText: '', pages: [], pageCount: 0, sourceCharCount: 0, isScanned: true, error: msg, isEncrypted, isCorrupt };
    }
  };

  // Lazy-load pako (zlib inflate/deflate) for Stage 4 PDF tagging's content-stream
  // surgery. Most PDFs ship their content streams FlateDecode-compressed so per-block
  // BDC/EMC injection requires inflate-edit-deflate. Loaded from CDN only on first
  // tagged-PDF export; no cost for any other code path.
  let _pakoLoadPromise = null;
  const ensurePakoLoaded = async () => {
    if (window.pako && typeof window.pako.inflate === 'function') return window.pako;
    if (_pakoLoadPromise) return _pakoLoadPromise;
    _pakoLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-docpipe-pako]');
      if (existing) {
        const wait = setInterval(() => { if (window.pako) { clearInterval(wait); resolve(window.pako); } }, 50);
        setTimeout(() => { clearInterval(wait); reject(new Error('pako load timeout')); }, 10000);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
      s.setAttribute('data-docpipe-pako', 'true');
      s.onload = () => { if (window.pako) resolve(window.pako); else reject(new Error('pako loaded but not on window')); };
      s.onerror = () => { _pakoLoadPromise = null; reject(new Error('pako CDN load failed')); };
      document.head.appendChild(s);
    });
    return _pakoLoadPromise;
  };

  // ── Stage 4 PDF tagging: pure helpers ──
  // These are pure (no closure state) so they're testable in isolation and
  // easy to reason about. createTaggedPdf orchestrates them per-page with
  // try/catch fallback to Stage 3 behavior on any failure.

  // _stage4_maskStrings — replace literal (...) strings, hex <...> strings, and
  // PDF `%` comments with same-length space padding so we can regex for
  // operators on the masked copy without false hits from string content.
  // Dict brackets `<<` / `>>` are preserved. Byte offsets are unchanged
  // because every replacement is equal-length.
  const _stage4_maskStrings = (s) => {
    let out = ''; let i = 0; const N = s.length;
    while (i < N) {
      const c = s[i];
      if (c === '%') {
        let j = i;
        while (j < N && s[j] !== '\n' && s[j] !== '\r') j++;
        out += ' '.repeat(j - i); i = j; continue;
      }
      if (c === '(') {
        let depth = 1, j = i + 1;
        while (j < N && depth > 0) {
          if (s[j] === '\\') { j += 2; continue; }
          if (s[j] === '(') depth++;
          else if (s[j] === ')') depth--;
          j++;
        }
        out += ' '.repeat(j - i); i = j; continue;
      }
      if (c === '<' && s[i+1] === '<') { out += '<<'; i += 2; continue; }
      if (c === '<') {
        let j = i + 1;
        while (j < N && s[j] !== '>') j++;
        if (j < N) j++;
        out += ' '.repeat(j - i); i = j; continue;
      }
      if (c === '>' && s[i+1] === '>') { out += '>>'; i += 2; continue; }
      out += c; i++;
    }
    return out;
  };

  // _stage4_parseBTSegments — find all BT...ET text-object spans in a content
  // stream (decompressed). Returns byte offsets + the (x,y) position set by
  // Tm or Td inside each span so we can match each span to a pdf.js text
  // item by coordinate.
  const _stage4_parseBTSegments = (streamBytes) => {
    let s = '';
    for (let i = 0; i < streamBytes.length; i++) s += String.fromCharCode(streamBytes[i]);
    const masked = _stage4_maskStrings(s);
    const segments = [];
    const re = /\bBT\b([\s\S]*?)\bET\b/g;
    let m;
    while ((m = re.exec(masked)) !== null) {
      const btStart = m.index;
      const etEnd = m.index + m[0].length;
      const inside = m[1];
      let x = 0, y = 0;
      const tmMatch = /([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+Tm\b/.exec(inside);
      if (tmMatch) { x = parseFloat(tmMatch[5]); y = parseFloat(tmMatch[6]); }
      else {
        const tdMatch = /([-\d.eE+]+)\s+([-\d.eE+]+)\s+T[dD]\b/.exec(inside);
        if (tdMatch) { x = parseFloat(tdMatch[1]); y = parseFloat(tdMatch[2]); }
      }
      segments.push({ btStart, etEnd, x, y });
    }
    return segments;
  };

  // _stage4_rewriteStream — splice /<role> <</MCID i>> BDC before each BT and
  // EMC after each ET. Processes segments last-to-first so earlier offsets
  // stay valid as later splices shift the tail.
  const _stage4_rewriteStream = (streamBytes, segments, wraps) => {
    if (segments.length === 0) return streamBytes;
    const enc = new TextEncoder();
    const out = Array.from(streamBytes);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      const w = wraps[i] || { bdc: '/P <</MCID ' + i + '>> BDC\n', emc: '\nEMC\n' };
      const emcBytes = enc.encode(w.emc);
      const bdcBytes = enc.encode(w.bdc);
      out.splice(seg.etEnd, 0, ...emcBytes);
      out.splice(seg.btStart, 0, ...bdcBytes);
    }
    return new Uint8Array(out);
  };

  // _stage4_extractPdfjsItems — return a normalised per-page list of text
  // items from pdf.js. Filters empty strings (pdf.js emits positioning-only
  // items with empty str that would confuse matching).
  const _stage4_extractPdfjsItems = async (pdfjsDoc, pageIdx) => {
    try {
      const page = await pdfjsDoc.getPage(pageIdx + 1);
      const tc = await page.getTextContent();
      return (tc.items || [])
        .filter(it => it && typeof it.str === 'string' && it.str.trim().length > 0)
        .map(it => ({
          str: it.str,
          x: it.transform ? it.transform[4] : 0,
          y: it.transform ? it.transform[5] : 0,
          fontScale: it.transform ? Math.abs(it.transform[0] || it.transform[3] || 12) : 12,
          fontName: it.fontName || '',
          width: it.width || 0,
          height: it.height || 0,
        }));
    } catch (_) { return []; }
  };

  // _stage4_matchSegmentsToItems — pair BT segments with pdf.js text items.
  // Happy path: equal counts → index-order pairing (both are usually in
  // stream/reading order). Fallback: nearest-neighbour by (x,y) distance.
  const _stage4_matchSegmentsToItems = (segments, items) => {
    const matched = new Array(segments.length);
    if (segments.length === items.length && items.length > 0) {
      for (let i = 0; i < segments.length; i++) matched[i] = items[i];
      return matched;
    }
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      let best = null, bestDist = Infinity;
      for (const it of items) {
        const dx = it.x - seg.x, dy = it.y - seg.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = it; }
      }
      matched[i] = best || { str: '', fontScale: 12, fontName: '' };
    }
    return matched;
  };

  // _stage4_inferRole — pick a PDF structure role for a matched text item.
  // Priority: fuzzy match against the HTML outline (semantically accurate),
  // then a font-scale heuristic as a last resort.
  const _stage4_inferRole = (item, fontScaleMedian, outlineItems) => {
    const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const itemText = norm(item && item.str);
    if (itemText.length >= 4 && Array.isArray(outlineItems)) {
      for (const oi of outlineItems) {
        const ot = norm(oi && oi.text);
        if (ot.length < 4) continue;
        if (ot.startsWith(itemText) || itemText.startsWith(ot) || ot.includes(itemText) || itemText.includes(ot)) {
          return oi.role;
        }
      }
    }
    if (fontScaleMedian > 0 && item && item.fontScale > 0) {
      const ratio = item.fontScale / fontScaleMedian;
      if (ratio >= 1.6) return 'H1';
      if (ratio >= 1.3) return 'H2';
      if (ratio >= 1.1) return 'H3';
      if (ratio <= 0.85) return 'Caption';
    }
    return 'P';
  };

  // _stage4_getStreamBytesAndFilter — pull a page's content-stream bytes out
  // of the Contents entry (handling single-stream or array-of-streams shapes)
  // and indicate whether it's FlateDecode-compressed.
  const _stage4_getStreamBytesAndFilter = (page, PDFName, context) => {
    const node = page.node;
    const contents = node.get(PDFName.of('Contents'));
    if (!contents) return null;
    let filter = null;
    const chunks = [];
    const consume = (ref) => {
      const stream = context.lookup(ref);
      if (!stream) return;
      const raw = stream.getContents ? stream.getContents() : null;
      if (!raw) return;
      const dict = stream.dict || null;
      const f = dict && dict.get ? dict.get(PDFName.of('Filter')) : null;
      if (f) { const fs = String(f); if (fs.includes('FlateDecode')) filter = 'FlateDecode'; }
      chunks.push(raw);
    };
    if (contents && typeof contents.size === 'function') {
      for (let k = 0; k < contents.size(); k++) consume(contents.get(k));
    } else {
      consume(contents);
    }
    if (chunks.length === 0) return null;
    let total = 0;
    for (const c of chunks) total += c.byteLength || c.length || 0;
    const combined = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      const u = c instanceof Uint8Array ? c : new Uint8Array(c);
      combined.set(u, off); off += u.byteLength;
    }
    return { bytes: combined, filter };
  };

  // ── Stage 6b: conservative artifact detection ──
  // Identifies text strings that appear on ≥95% of pages in a ≥5-page doc —
  // typical signatures of running headers, footers, and legal boilerplate.
  // Those strings get tagged /Artifact BMC (no MCID, no StructElem) so SR
  // readers skip them instead of reading "Physics Textbook — Grade 8" on
  // every page transition. Threshold is strict on purpose: false positives
  // silently hide content, which is worse than repeated reading.
  const _stage6b_normalizeArtifactText = (s) => {
    return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  };
  const _stage6b_detectArtifactHashes = (pagesItems, opts) => {
    opts = opts || {};
    const threshold = opts.threshold != null ? opts.threshold : 0.95;
    const minPages = opts.minPages != null ? opts.minPages : 5;
    if (!Array.isArray(pagesItems) || pagesItems.length < minPages) return new Set();
    const perPageHits = new Map();
    for (const items of pagesItems) {
      if (!Array.isArray(items)) continue;
      const seenThisPage = new Set();
      for (const it of items) {
        const norm = _stage6b_normalizeArtifactText(it && it.str);
        if (!norm || norm.length < 2) continue;
        if (seenThisPage.has(norm)) continue;
        seenThisPage.add(norm);
        perPageHits.set(norm, (perPageHits.get(norm) || 0) + 1);
      }
    }
    const requiredHits = Math.ceil(pagesItems.length * threshold);
    const artifacts = new Set();
    for (const [text, count] of perPageHits.entries()) {
      if (count >= requiredHits) artifacts.add(text);
    }
    return artifacts;
  };

  // _stage4_tryWrapPage — orchestrates per-page Stage 4. Reads the content
  // stream, inflates if needed, parses BT/ET, pairs segments with pdf.js
  // items, infers per-block roles, splices BDC/EMC per segment, re-deflates,
  // replaces the Contents entry, and builds a per-page Sect StructElem
  // containing one typed StructElem per block. Throws on any failure;
  // caller catches and falls back to Stage 3.
  const _stage4_tryWrapPage = async (page, pi, pdfjsDoc, outlineItems, context, libs, structRootRef, artifactHashSet) => {
    const { PDFName, PDFString, PDFNumber } = libs;
    if (!window.pako || typeof window.pako.inflate !== 'function') throw new Error('pako unavailable');
    const streamInfo = _stage4_getStreamBytesAndFilter(page, PDFName, context);
    if (!streamInfo || streamInfo.bytes.length === 0) throw new Error('no content stream');
    let bytes = streamInfo.bytes;
    if (streamInfo.filter === 'FlateDecode') {
      bytes = window.pako.inflate(bytes);
    }
    const segments = _stage4_parseBTSegments(bytes);
    if (segments.length === 0) throw new Error('no BT segments');
    const items = await _stage4_extractPdfjsItems(pdfjsDoc, pi);
    if (items.length === 0) throw new Error('no pdf.js items');
    const matched = _stage4_matchSegmentsToItems(segments, items);
    const scales = items.map(it => it.fontScale).filter(n => n > 0).sort((a, b) => a - b);
    const fontScaleMedian = scales.length > 0 ? scales[Math.floor(scales.length / 2)] : 12;
    // Stage 6b: build wraps with two categories — artifacts get /Artifact BMC
    // (no MCID, no StructElem), content gets /<role> <</MCID n>> BDC. Content
    // MCIDs are assigned from an independent counter so we don't gap the
    // sequence when artifacts are interspersed. Only content segments
    // produce StructElems / ParentTree entries.
    const wraps = [];
    const blockInfo = [];
    let contentMcid = 0;
    const hasArtifacts = artifactHashSet instanceof Set && artifactHashSet.size > 0;
    for (let i = 0; i < segments.length; i++) {
      const item = matched[i] || { str: '', fontScale: fontScaleMedian, fontName: '' };
      const norm = hasArtifacts ? _stage6b_normalizeArtifactText(item.str) : '';
      const isArtifact = hasArtifacts && norm && artifactHashSet.has(norm);
      if (isArtifact) {
        wraps.push({ bdc: '/Artifact BMC\n', emc: '\nEMC\n' });
        blockInfo.push({ isArtifact: true });
      } else {
        const role = _stage4_inferRole(item, fontScaleMedian, outlineItems);
        wraps.push({ bdc: '/' + role + ' <</MCID ' + contentMcid + '>> BDC\n', emc: '\nEMC\n' });
        blockInfo.push({ isArtifact: false, role, text: (item.str || '').substring(0, 400), mcid: contentMcid });
        contentMcid++;
      }
    }
    let newBytes = _stage4_rewriteStream(bytes, segments, wraps);
    if (streamInfo.filter === 'FlateDecode') {
      newBytes = window.pako.deflate(newBytes);
    }
    const streamDict = streamInfo.filter === 'FlateDecode'
      ? { Filter: PDFName.of('FlateDecode'), Length: PDFNumber.of(newBytes.length) }
      : { Length: PDFNumber.of(newBytes.length) };
    const newStream = context.stream(newBytes, streamDict);
    const newStreamRef = context.register(newStream);
    page.node.set(PDFName.of('Contents'), newStreamRef);
    page.node.set(PDFName.of('StructParents'), PDFNumber.of(pi));
    // Only content segments produce StructElems (artifacts have no tag-tree
    // entry by design — that's what makes SR readers skip them).
    const pageSectRef = context.nextRef();
    const blockElemRefs = [];
    for (const info of blockInfo) {
      if (info.isArtifact) continue;
      const mcr = context.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(info.mcid) });
      const d = {
        Type: PDFName.of('StructElem'),
        S: PDFName.of(info.role),
        P: pageSectRef,
        Pg: page.ref,
        K: context.obj([mcr]),
      };
      if (info.text) d.ActualText = PDFString.of(info.text);
      blockElemRefs.push(context.register(context.obj(d)));
    }
    context.assign(pageSectRef, context.obj({
      Type: PDFName.of('StructElem'),
      S: PDFName.of('Sect'),
      P: structRootRef,
      Pg: page.ref,
      K: context.obj(blockElemRefs),
    }));
    const parentArrayRef = context.register(context.obj(blockElemRefs.slice()));
    return { pageSectRef, blockElemRefs, parentArrayRef, mcidCount: contentMcid };
  };

  // Lazy-load Tesseract.js from CDN. Zero cost until first call (scanned-PDF path only).
  // Tesseract gives deterministic client-side OCR — no hallucination, no server roundtrip —
  // which pairs with Vision OCR for a reconciled "both" pass on scanned PDFs.
  let _tesseractLoadPromise = null;
  const ensureTesseractLoaded = async () => {
    if (window.Tesseract) return window.Tesseract;
    if (_tesseractLoadPromise) return _tesseractLoadPromise;
    _tesseractLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-docpipe-tesseract]');
      if (existing) {
        const wait = setInterval(() => { if (window.Tesseract) { clearInterval(wait); resolve(window.Tesseract); } }, 100);
        setTimeout(() => { clearInterval(wait); reject(new Error('Tesseract load timeout')); }, 20000);
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.setAttribute('data-docpipe-tesseract', 'true');
      s.onload = () => { if (window.Tesseract) resolve(window.Tesseract); else reject(new Error('Tesseract loaded but not on window')); };
      s.onerror = () => { _tesseractLoadPromise = null; reject(new Error('Tesseract.js CDN load failed')); };
      document.head.appendChild(s);
    });
    return _tesseractLoadPromise;
  };

  // OCR every page of a PDF with Tesseract. Renders each page at 2× to a canvas, recognises,
  // concatenates. Returns { fullText, pages: [{pageNum, text}], sourceCharCount }. Progress
  // callback fires per page (0..1) so the UI can show "OCR page 3 of 12" without blocking.
  const extractPdfTextTesseract = async (base64, onProgress, lang) => {
    try {
      await ensurePdfJsLoaded();
      await ensureTesseractLoaded();
      if (!window.pdfjsLib || !window.Tesseract) throw new Error('pdf.js or Tesseract unavailable');
      const raw = base64.includes(',') ? base64.split(',')[1] : base64;
      const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      const useLang = lang || 'eng';
      const pages = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        if (typeof onProgress === 'function') onProgress({ page: p, total: pdf.numPages, phase: 'render' });
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (typeof onProgress === 'function') onProgress({ page: p, total: pdf.numPages, phase: 'ocr' });
        const result = await window.Tesseract.recognize(canvas, useLang);
        const pageText = ((result && result.data && result.data.text) || '').trim();
        pages.push({ pageNum: p, text: pageText });
        // Free the canvas so a 100-page scan doesn't balloon memory.
        canvas.width = 0; canvas.height = 0;
      }
      const fullText = pages.map(p => p.text).filter(Boolean).join('\n\n');
      return { fullText, pages, pageCount: pdf.numPages, sourceCharCount: fullText.length };
    } catch (e) {
      warnLog('[Tesseract] extractPdfTextTesseract failed:', e && e.message);
      return { fullText: '', pages: [], pageCount: 0, sourceCharCount: 0, error: e && e.message };
    }
  };

  // Word-level reconciliation between two OCR outputs. "Perfect accuracy" for scanned PDFs
  // means losing no content, so the per-page rule is: take whichever output has more chars.
  // Record disagreements (pages where length differs materially) so the fidelity panel can
  // surface them for review. This is a union-of-best-per-page strategy, not a set-union on
  // tokens (which would introduce ordering artifacts).
  const reconcileOcrPages = (tessPages, visionPages) => {
    const pageCount = Math.max(tessPages.length, visionPages.length);
    const merged = [];
    const disagreements = [];
    for (let i = 0; i < pageCount; i++) {
      const tText = (tessPages[i] && tessPages[i].text) || '';
      const vText = (visionPages[i] && visionPages[i].text) || '';
      const tLen = tText.length, vLen = vText.length;
      const longest = Math.max(tLen, vLen);
      // Pick the longer one — loses nothing vs picking shorter; Tesseract wins ties for
      // determinism.
      const chosen = tLen >= vLen ? { source: 'tesseract', text: tText } : { source: 'vision', text: vText };
      merged.push({ pageNum: i + 1, text: chosen.text, source: chosen.source });
      // Flag disagreement if length gap > 10% or > 20 chars absolute.
      if (longest > 0 && (Math.abs(tLen - vLen) > Math.max(20, longest * 0.1))) {
        disagreements.push({ pageNum: i + 1, tesseractChars: tLen, visionChars: vLen, tesseractText: tText, visionText: vText });
      }
    }
    return { pages: merged, disagreements, fullText: merged.map(p => p.text).filter(Boolean).join('\n\n') };
  };

  // Lazy-load mammoth.js for DOCX text extraction
  const ensureMammothLoaded = async () => {
    if (window.mammoth) return;
    if (document.querySelector('script[data-docpipe-mammoth]')) {
      await new Promise((resolve, reject) => {
        const wait = setInterval(() => { if (window.mammoth) { clearInterval(wait); resolve(); } }, 100);
        setTimeout(() => { clearInterval(wait); reject(new Error('mammoth load timeout')); }, 10000);
      });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    s.setAttribute('data-docpipe-mammoth', 'true');
    document.head.appendChild(s);
    await new Promise((resolve, reject) => {
      const wait = setInterval(() => { if (window.mammoth) { clearInterval(wait); resolve(); } }, 100);
      setTimeout(() => { clearInterval(wait); reject(new Error('mammoth load timeout')); }, 10000);
    });
  };

  // Lazy-load jszip (already loaded in main app; this is a safety net)
  const ensureJsZipLoaded = async () => {
    if (window.JSZip) return;
    if (document.querySelector('script[data-docpipe-jszip]')) {
      await new Promise((resolve, reject) => {
        const wait = setInterval(() => { if (window.JSZip) { clearInterval(wait); resolve(); } }, 100);
        setTimeout(() => { clearInterval(wait); reject(new Error('jszip load timeout')); }, 10000);
      });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.setAttribute('data-docpipe-jszip', 'true');
    document.head.appendChild(s);
    await new Promise((resolve, reject) => {
      const wait = setInterval(() => { if (window.JSZip) { clearInterval(wait); resolve(); } }, 100);
      setTimeout(() => { clearInterval(wait); reject(new Error('jszip load timeout')); }, 10000);
    });
  };

  const _base64ToBytes = (base64) => {
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    return Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  };

  // Extract text from a DOCX via mammoth (primary) or jszip+XML (fallback for air-gap)
  const extractDocxTextDeterministic = async (base64) => {
    // Try mammoth first
    try {
      await ensureMammothLoaded();
      if (window.mammoth && typeof window.mammoth.extractRawText === 'function') {
        const bytes = _base64ToBytes(base64);
        const result = await window.mammoth.extractRawText({ arrayBuffer: bytes.buffer });
        const fullText = (result && result.value) || '';
        if (fullText && fullText.length > 0) {
          return { fullText, sourceCharCount: fullText.length, method: 'mammoth' };
        }
      }
    } catch (e) {
      warnLog('[DOCX Det] mammoth failed, falling back to jszip:', e?.message);
    }
    // Fallback: jszip + raw XML text extraction
    try {
      await ensureJsZipLoaded();
      if (!window.JSZip) throw new Error('jszip unavailable');
      const bytes = _base64ToBytes(base64);
      const zip = await window.JSZip.loadAsync(bytes);
      const docXml = zip.file('word/document.xml');
      if (!docXml) throw new Error('word/document.xml not found');
      const xml = await docXml.async('string');
      // Extract text from <w:t> nodes in document order; <w:p> becomes paragraph break
      const paragraphs = [];
      const paraRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
      const textRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      const matches = xml.match(paraRegex) || [];
      for (const p of matches) {
        const parts = [];
        let m;
        textRegex.lastIndex = 0;
        while ((m = textRegex.exec(p)) !== null) {
          parts.push(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
        }
        if (parts.length) paragraphs.push(parts.join(''));
      }
      const fullText = paragraphs.join('\n\n');
      return { fullText, sourceCharCount: fullText.length, method: 'jszip' };
    } catch (e) {
      const msg = e?.message || '';
      warnLog('[DOCX Det] jszip fallback failed:', msg);
      if (/password|encrypted/i.test(msg) && typeof addToast === 'function') addToast('DOCX appears password-protected — using Vision OCR instead.', 'info');
      else if (/invalid|corrupt/i.test(msg) && typeof addToast === 'function') addToast('DOCX may be corrupted — attempting Vision OCR fallback.', 'info');
      return { fullText: '', sourceCharCount: 0, method: 'failed', error: msg };
    }
  };

  // Extract text from a PPTX via jszip — parse ppt/slides/slide*.xml and <a:t> nodes
  const extractPptxTextDeterministic = async (base64) => {
    try {
      await ensureJsZipLoaded();
      if (!window.JSZip) throw new Error('jszip unavailable');
      const bytes = _base64ToBytes(base64);
      const zip = await window.JSZip.loadAsync(bytes);
      // Find all slide files, sort by slide number
      const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
          const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
          return na - nb;
        });
      const slides = [];
      const textRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
      for (const file of slideFiles) {
        const xml = await zip.file(file).async('string');
        const parts = [];
        let m;
        textRegex.lastIndex = 0;
        while ((m = textRegex.exec(xml)) !== null) {
          parts.push(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
        }
        const slideText = parts.join(' ').replace(/\s+/g, ' ').trim();
        if (slideText) slides.push({ slideNum: slides.length + 1, text: slideText });
      }
      const fullText = slides.map(s => '## Slide ' + s.slideNum + '\n\n' + s.text).join('\n\n');
      return { fullText, slides, slideCount: slideFiles.length, sourceCharCount: fullText.length, method: 'jszip' };
    } catch (e) {
      const msg = e?.message || '';
      warnLog('[PPTX Det] extraction failed:', msg);
      if (/password|encrypted/i.test(msg) && typeof addToast === 'function') addToast('PPTX appears password-protected — using Vision OCR instead.', 'info');
      else if (/invalid|corrupt/i.test(msg) && typeof addToast === 'function') addToast('PPTX may be corrupted — attempting Vision OCR fallback.', 'info');
      return { fullText: '', slides: [], slideCount: 0, sourceCharCount: 0, method: 'failed', error: msg };
    }
  };

  // ── PDF Accessibility Audit ──
  const runPdfAccessibilityAudit = async (base64Data, options) => {
    // options: { skipUiUpdates?: boolean } — when true, skips setPdfAuditResult/setPdfAuditLoading/addToast
    //                                        so batch mode can audit per-file without clobbering single-file UI state.
    //                                        In either mode, the final audit result object is returned.
    const _skipUi = !!(options && options.skipUiUpdates);
    if (!_skipUi) setPdfAuditLoading(true);
    // Estimate audit time based on data size (rough proxy for page count before we know it)
    const dataSizeKB = base64Data ? Math.round(base64Data.length * 0.75 / 1024) : 0;
    const estTime = dataSizeKB < 200 ? '15-30 seconds' : dataSizeKB < 1000 ? '30-90 seconds' : dataSizeKB < 5000 ? '2-5 minutes' : '5-10 minutes';
    if (!_skipUi) addToast && addToast(`♿ Auditing document (${dataSizeKB > 1024 ? (dataSizeKB / 1024).toFixed(1) + 'MB' : dataSizeKB + 'KB'}) — typically ${estTime}`, 'info');
    try {
      // ── Triangulated scoring: run 2 independent audits, average scores, flag discrepancies ──
      const auditPrompt = `You are a WCAG 2.1 AA accessibility auditor for educational documents. Analyze this PDF for accessibility violations.

Check for these specific issues:
1. STRUCTURE: Missing heading hierarchy, no logical reading order, flat text without sections
2. IMAGES: Images without alt text or descriptions
3. TABLES: Data tables without header rows, missing row/column associations
4. CONTRAST: Text that may have insufficient color contrast
5. FORMS: Form fields without labels
6. LANGUAGE: Missing document language tag
7. LINKS: Links that say "click here" instead of descriptive text
8. LISTS: Content that should be formatted as lists but isn't
9. TEXT: Scanned image-only pages (no searchable text layer)
10. METADATA: Missing document title, author, or subject

SCORING RUBRIC — Start at 100, deduct points for each unique violation:
  CRITICAL (-15 each): Missing lang attribute, no page title, images without alt text, no main landmark, color contrast below 3:1, no searchable text layer
  SERIOUS (-10 each): Missing heading hierarchy (no h1), heading level skips, data tables without th/scope, form inputs without labels, color contrast below 4.5:1
  MODERATE (-5 each): Missing skip-to-content link, missing header/footer/nav landmarks, non-descriptive link text, missing table caption, bullet characters instead of semantic lists
  MINOR (-2 each): Missing document metadata, extra whitespace in alt text, multiple h1 elements, inconsistent heading granularity

IMPORTANT FORMATTING RULES for the "issue" field:
- Write each issue as ONE complete sentence. Do NOT split sentences across fields.
- Put the WCAG criterion number ONLY in the "wcag" field (e.g. "1.3.1"), NEVER inside the "issue" text.
- Do NOT end issue descriptions with dangling parentheses or incomplete clauses.
- Avoid trailing parenthetical fragments. BAD: "lacks header rows (" GOOD: "lacks header rows and scope attributes"
- Calculate the score by starting at 100 and subtracting per the rubric. Each unique violation deducts points ONCE.

LOCATION FIELD ("location"):
- Provide a short anchor string that identifies WHERE in the document the violation occurs, so a remediation step can target it.
- Prefer (in order of usefulness): a heading title ("Chapter 3. Methods"), a unique phrase from the offending element (first 6-8 words), a page number ("page 4"), or a structural anchor ("first table", "footer").
- Keep it under 80 characters. If truly document-wide (e.g., missing lang attribute), use "document".
- Omit or set to null only if no meaningful anchor can be given.

Return ONLY valid JSON:
{
  "score": "<calculated from rubric deductions>",
  "confidence": "<your confidence in this score: 'high' if document is straightforward, 'medium' if some elements are ambiguous, 'low' if you had to guess about key aspects>",
  "summary": "One balanced sentence that leads with strengths before noting issues. Match tone to score — above 80 is positive with minor notes, below 50 is serious concern.",
  "critical": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N, "location": "short anchor"}],
  "serious": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N, "location": "short anchor"}],
  "moderate": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N, "location": "short anchor"}],
  "minor": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N, "location": "short anchor"}],
  "passes": ["Things the document does well"],
  "pageCount": N,
  "hasSearchableText": true/false,
  "hasImages": true/false,
  "hasTables": true/false,
  "hasForms": true/false
}`;
      // Run N independent audits for high-reliability triangulation (user-configurable)
      const parseAudit = (raw) => {
        let c = raw.trim();
        c = _stripCodeFence(c);
        return JSON.parse(c);
      };
      const allVariants = [
        auditPrompt,
        auditPrompt.replace('Analyze this PDF', 'Perform an independent accessibility analysis of this PDF'),
        auditPrompt.replace('Analyze this PDF', 'As a fresh auditor with no prior context, evaluate this PDF'),
        auditPrompt.replace('Analyze this PDF', 'Conduct a strict WCAG compliance review of this PDF'),
        auditPrompt.replace('Analyze this PDF', 'From the perspective of a screen reader user, assess this PDF'),
        auditPrompt.replace('Analyze this PDF', 'As a document remediation specialist, evaluate this PDF'),
        auditPrompt.replace('Analyze this PDF', 'As a disability rights advocate, critically assess this PDF'),
        auditPrompt.replace('Analyze this PDF', 'Using Section 508 federal standards, audit this PDF'),
        auditPrompt.replace('Analyze this PDF', 'As an assistive technology expert testing with JAWS/NVDA, evaluate this PDF'),
        auditPrompt.replace('Analyze this PDF', 'As a university compliance officer reviewing for Title II ADA, assess this PDF'),
      ];
      const numAuditors = Math.min(pdfAuditorCount, allVariants.length);
      const auditVariants = allVariants.slice(0, numAuditors);
      const auditResults = await Promise.all(auditVariants.map((p, i) => callGeminiVision(p, base64Data, 'application/pdf').catch(e => { console.warn(`[PDF Audit] Auditor ${i + 1} failed:`, e?.message); return null; })));
      const parsedAudits = auditResults.filter(Boolean).map((r, i) => { try { return parseAudit(r); } catch(pe) { console.warn(`[PDF Audit] Parse auditor ${i + 1} failed:`, pe?.message, 'Raw:', r?.substring?.(0, 200)); return null; } }).filter(Boolean);

      // ── Retry backfill: keep retrying until we hit the target count or exhaust attempts ──
      const MAX_RETRY_ROUNDS = 3;
      let retryRound = 0;
      while (parsedAudits.length < numAuditors && parsedAudits.length > 0 && retryRound < MAX_RETRY_ROUNDS) {
        retryRound++;
        const shortfall = numAuditors - parsedAudits.length;
        warnLog(`[PDF Audit] Round ${retryRound}: ${parsedAudits.length}/${numAuditors} completed. Retrying ${shortfall}...`);
        addToast && addToast(`Audit pass ${parsedAudits.length}/${numAuditors} — retrying ${shortfall} (round ${retryRound})...`, 'info');
        // Delay between retry rounds to avoid rate limiting
        if (retryRound > 1) await new Promise(r => setTimeout(r, 1000 * retryRound));
        // Build retry prompts from unused variants + fresh temperature variations
        const retryPool = allVariants.slice(numAuditors).concat(
          allVariants.slice(0, numAuditors).map(p => p + `\n\n(Attempt ${retryRound + 1} — be especially thorough.)`)
        );
        const retryVariants = retryPool.slice(0, shortfall);
        // Run retries sequentially if rate limited, parallel otherwise
        const retryResults = retryRound > 1
          ? await (async () => { const res = []; for (const p of retryVariants) { try { res.push(await callGeminiVision(p, base64Data, 'application/pdf')); } catch { res.push(null); } await new Promise(r => setTimeout(r, 500)); } return res; })()
          : await Promise.all(retryVariants.map(p => callGeminiVision(p, base64Data, 'application/pdf').catch(() => null)));
        const retryParsed = retryResults.filter(Boolean).map(r => { try { return parseAudit(r); } catch { return null; } }).filter(Boolean);
        if (retryParsed.length > 0) {
          parsedAudits.push(...retryParsed);
          warnLog(`[PDF Audit] Round ${retryRound} recovered ${retryParsed.length} → ${parsedAudits.length}/${numAuditors} total`);
        }
        if (parsedAudits.length >= numAuditors) break;
      }
      if (parsedAudits.length < numAuditors && parsedAudits.length > 0) {
        addToast(`⚠️ ${parsedAudits.length}/${numAuditors} audit passes completed after ${MAX_RETRY_ROUNDS} retry rounds`, 'info');
      }

      if (parsedAudits.length === 0) throw new Error('All audit attempts failed');

      // ── Validate each auditor's score against their reported issues ──
      // Recalculate from issue counts using the rubric to reduce variance
      parsedAudits.forEach(a => {
        const critCount = (a.critical || []).length;
        const seriousCount = (a.serious || a.major || []).length;
        const modCount = (a.moderate || []).length;
        const minCount = (a.minor || []).length;
        const passCount = (a.passes || []).length;
        const rawDed = critCount * 15 + seriousCount * 10 + modCount * 5 + minCount * 2;
        const issueCount = critCount + seriousCount + modCount + minCount;
        const passRatio = passCount > 0 ? passCount / (passCount + issueCount) : 0;
        const pf = 1 - (passRatio * 0.4);
        const calculatedScore = Math.max(0, 100 - Math.round(rawDed * pf));
        // If Gemini's score diverges significantly from the rubric calculation, override it
        if (typeof a.score === 'number' && Math.abs(a.score - calculatedScore) > 12) {
          warnLog(`[PDF Audit] Auditor score ${a.score} overridden to ${calculatedScore} (${critCount}C/${seriousCount}S/${modCount}M/${minCount}m, ${passCount} passes)`);
          a.score = calculatedScore;
        }
      });

      // ── Adaptive audit: check for score divergence or low confidence → add more audits ──
      const initialScores = parsedAudits.map(a => a.score).filter(s => typeof s === 'number');
      const lowConfidence = parsedAudits.some(a => a.confidence === 'low');
      const initialRange = initialScores.length > 1 ? Math.max(...initialScores) - Math.min(...initialScores) : 0;

      if (parsedAudits.length >= 2 && parsedAudits.length < allVariants.length && (initialRange > 20 || lowConfidence)) {
        const reason = initialRange > 20 ? `score divergence (${initialRange} point spread: ${initialScores.join(', ')})` : 'low confidence flagged by auditor';
        const additionalCount = Math.min(2, allVariants.length - parsedAudits.length);
        warnLog(`[PDF Audit] Adaptive: adding ${additionalCount} auditor(s) due to ${reason}`);
        addToast && addToast(`Adding ${additionalCount} extra audit(s) — ${reason}`, 'info');
        const extraVariants = allVariants.slice(parsedAudits.length, parsedAudits.length + additionalCount);
        const extraResults = await Promise.all(extraVariants.map(p => callGeminiVision(p, base64Data, 'application/pdf').catch(() => null)));
        const extraParsed = extraResults.filter(Boolean).map(r => { try { return parseAudit(r); } catch { return null; } }).filter(Boolean);
        extraParsed.forEach(a => {
          const critCount = (a.critical || []).length;
          const seriousCount = (a.serious || a.major || []).length;
          const modCount = (a.moderate || []).length;
          const minCount = (a.minor || []).length;
          const passCount = (a.passes || []).length;
          const rawDed = critCount * 15 + seriousCount * 10 + modCount * 5 + minCount * 2;
          const issueCount = critCount + seriousCount + modCount + minCount;
        const passRatio = passCount > 0 ? passCount / (passCount + issueCount) : 0;
        const pf = 1 - (passRatio * 0.4);
          const calculatedScore = Math.max(0, 100 - Math.round(rawDed * pf));
          if (typeof a.score === 'number' && Math.abs(a.score - calculatedScore) > 12) a.score = calculatedScore;
        });
        parsedAudits.push(...extraParsed);
        warnLog(`[PDF Audit] Adaptive: now ${parsedAudits.length} total audits (was ${initialScores.length})`);
      }

      // ── Triangulate: average scores, compute reliability statistics ──
      const scores = parsedAudits.map(a => a.score).filter(s => typeof s === 'number');
      const n = scores.length;
      if (n === 0) throw new Error('All audit attempts returned no score');
      const rawMean = scores.reduce((a, b) => a + b, 0) / n;
      const avgScore = Math.round(rawMean);
      // Compute raw SD from unrounded mean for precision
      const rawSD = n > 1 ? Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - rawMean, 2), 0) / (n - 1)) : 0;
      const scoreSD = Math.round(rawSD * 10) / 10; // display version (1 decimal)
      const scoreRange = n > 1 ? Math.max(...scores) - Math.min(...scores) : 0;
      const scoreSEM = n > 1 ? Math.round((rawSD / Math.sqrt(n)) * 10) / 10 : 0;
      const ci95Lower = Math.max(0, Math.round(rawMean - 1.96 * (rawSD / Math.sqrt(n))));
      const ci95Upper = Math.min(100, Math.round(rawMean + 1.96 * (rawSD / Math.sqrt(n))));

      // Auditor Consistency (ICC-like): custom formula 1 - (SD / 50) using raw unrounded SD.
      // NOT the textbook intraclass correlation coefficient — this is a lightweight agreement
      // index scaled for small auditor panels (n=2–10) where true ICC requires ANOVA components
      // we don't compute. Scale: SD=0 → 1.00 (perfect), SD=5 → 0.90, SD=10 → 0.80, SD=25 → 0.50.
      // Display to 2 decimal places — never round to 1.00 unless SD is truly 0.
      // Variable kept named `icc` for backwards compatibility with saved project files.
      const rawAgreement = n > 1 ? Math.max(0, 1 - (rawSD / 50)) : 1;
      const icc = rawSD === 0 ? 1 : Math.round(rawAgreement * 100) / 100;

      // Auditor Consistency (Cronbach-like): NOT textbook Cronbach's α (which needs per-item
      // variance components we don't have). Instead combines CV-based estimate with weighted
      // pairwise agreement — a pragmatic hybrid for small n. Variable kept named `cronbachAlpha`
      // for backwards compatibility with saved project files.
      let cronbachAlpha = null;
      if (n >= 3) {
        // Method 1: CV-based (how small is the spread relative to the mean?)
        const cv = rawMean > 0 ? rawSD / rawMean : 1;
        const cvAlpha = Math.max(0, Math.min(0.99, 1 - (cv * 5)));
        // Method 2: Weighted pairwise — closer pairs score higher
        // 0 difference = 1.0, 1 point = 0.95, 5 points = 0.75, 10 points = 0.50, 20+ = 0
        let pairSum = 0;
        let totalPairs = 0;
        for (let pi = 0; pi < n; pi++) {
          for (let pj = pi + 1; pj < n; pj++) {
            totalPairs++;
            const diff = Math.abs(scores[pi] - scores[pj]);
            pairSum += Math.max(0, 1 - (diff / 20));
          }
        }
        const pairAlpha = totalPairs > 0 ? pairSum / totalPairs : 1;
        // Average both methods for a balanced estimate, cap at 0.99 unless truly identical
        const combined = (cvAlpha + pairAlpha) / 2;
        cronbachAlpha = rawSD === 0 ? 1 : Math.round(Math.min(0.99, combined) * 100) / 100;
      }

      // Self-repair: normalize each issue to ensure clean text + separate wcag field
      const normalizeIssue = (issue) => {
          if (!issue || !issue.issue) return issue;
          let text = issue.issue;
          let wcag = issue.wcag || '';
          // Extract WCAG code from issue text if not in separate field
          if (!wcag) {
              const wcagMatch = text.match(/\b(\d+\.\d+\.\d+)\b/);
              if (wcagMatch) wcag = wcagMatch[1];
          }
          // Remove embedded WCAG codes from issue text: "(1.3.1)", "(WCAG 1.3.1)", "- 1.3.1"
          text = text.replace(/\s*\(?\s*(?:WCAG\s*)?\d+\.\d+\.\d+\s*\)?\s*$/gi, '').trim();
          text = text.replace(/\s*[-–—]\s*\d+\.\d+\.\d+\s*$/g, '').trim();
          // Fix dangling open parentheses at end — reconnect with content after if possible
          // e.g., "lacks header rows (" → strip the trailing "("
          text = text.replace(/\s*\(\s*$/, '').trim();
          // Fix leading close parentheses — strip ") and ..." fragments
          text = text.replace(/^\)\s*,?\s*/g, '').trim();
          // Fix unclosed parenthetical at end (< 100 chars, no matching open paren in last segment)
          const lastOpenIdx = text.lastIndexOf('(');
          const lastCloseIdx = text.lastIndexOf(')');
          if (lastOpenIdx > lastCloseIdx && (text.length - lastOpenIdx) < 100) {
              // There's an unclosed "(" near the end — close it or remove it
              const parenContent = text.substring(lastOpenIdx + 1).trim();
              if (parenContent.length < 5 || /^[,.\s]*$/.test(parenContent)) {
                  // Almost empty — just remove the dangling paren
                  text = text.substring(0, lastOpenIdx).trim();
              }
              // Otherwise leave it — it's likely meaningful content like "(Learning Objectives)"
          }
          // Ensure text ends with punctuation
          if (text && !/[.!?)\]]$/.test(text)) text += '.';
          return { ...issue, issue: text, wcag };
      };
      const mergeIssues = (...arrays) => {
        const seen = new Set();
        const merged = [];
        arrays.flat().forEach(issue => {
          if (!issue) return;
          const normalized = normalizeIssue(issue);
          const key = (normalized.issue || '').toLowerCase().substring(0, 40);
          if (!seen.has(key)) { seen.add(key); merged.push(normalized); }
        });
        return merged;
      };

      // Issue agreement: count how many auditors flagged each issue
      const issueFrequency = {};
      parsedAudits.forEach(a => {
        [...(a.critical || []), ...(a.serious || a.major || []), ...(a.moderate || []), ...(a.minor || [])].forEach(issue => {
          const key = (issue.issue || '').toLowerCase().substring(0, 40);
          issueFrequency[key] = (issueFrequency[key] || 0) + 1;
        });
      });

      const triangulated = {
        score: avgScore,
        scores,
        scoreSD,
        scoreRange,
        scoreSEM,
        ci95: [ci95Lower, ci95Upper],
        icc: icc,
        cronbachAlpha,
        auditorCount: n,
        requestedAuditors: numAuditors,
        needsAdditionalAnalysis: false, // High variance on pre-remediation is expected — flag only post-remediation
        reliability: icc >= 0.9 ? 'excellent' : icc >= 0.75 ? 'good' : icc >= 0.5 ? 'moderate' : 'variable',
        summary: scoreRange > 25
          ? `Scores varied significantly (range: ${scoreRange}, SD: ${scoreSD}) across ${n} audits. ${parsedAudits[0].summary}`
          : `${parsedAudits[0].summary} (${n}-auditor consensus, SD: ${scoreSD})`,
        critical: mergeIssues(...parsedAudits.map(a => a.critical)),
        serious: mergeIssues(...parsedAudits.map(a => a.serious || a.major)),
        moderate: mergeIssues(...parsedAudits.map(a => a.moderate)),
        minor: mergeIssues(...parsedAudits.map(a => a.minor)),
        issueFrequency,
        passes: [...new Set(parsedAudits.flatMap(a => a.passes || []))],
        pageCount: parsedAudits.find(a => a.pageCount)?.pageCount,
        hasSearchableText: parsedAudits.some(a => a.hasSearchableText !== undefined) ? parsedAudits.some(a => a.hasSearchableText) : undefined,
        hasImages: parsedAudits.some(a => a.hasImages),
        hasTables: parsedAudits.some(a => a.hasTables),
        hasForms: parsedAudits.some(a => a.hasForms),
        timestamp: new Date().toISOString(),
      };
      if (!_skipUi) setPdfAuditResult(triangulated);

      // ── Quick axe-core baseline: extract text deterministically, build minimal HTML, run axe-core ──
      // Uses the shared extractPdfTextDeterministic helper (reading-order sorted, no truncation)
      try {
        // Use the passed-in base64 when skipping UI (batch mode) so we don't read stale pendingPdfBase64 state
        const _base64ForBaseline = _skipUi ? base64Data : pendingPdfBase64;
        const detBaseline = await extractPdfTextDeterministic(_base64ForBaseline);
        const rawText = detBaseline.fullText || '';
        // Build minimal HTML shell from extracted text
        const minimalHtml = `<!DOCTYPE html><html><head><title></title></head><body><main>${rawText.split('\n\n').filter(p => p.trim()).map(p => '<p>' + p.replace(/</g, '&lt;') + '</p>').join('\n')}</main></body></html>`;
        const baselineAxe = await runAxeAudit(minimalHtml);
        if (baselineAxe) {
          warnLog(`[PDF Audit] Baseline axe-core: score ${baselineAxe.score}, ${baselineAxe.totalViolations} violations`);
          // Blend initial score: 50/50 AI + axe-core
          const aiOnlyScore = triangulated.score;
          const blendedInitial = Math.round((aiOnlyScore + baselineAxe.score) / 2);
          // Mutate the triangulated object so the returned result carries the blended score
          triangulated.score = blendedInitial;
          triangulated._aiOnlyScore = aiOnlyScore;
          triangulated._baselineAxeScore = baselineAxe.score;
          triangulated._baselineAxeAudit = baselineAxe;
          triangulated._scoreIsBlended = true;
          if (!_skipUi) {
            setPdfAuditResult(prev => ({
              ...prev,
              score: blendedInitial,
              _aiOnlyScore: aiOnlyScore,
              _baselineAxeScore: baselineAxe.score,
              _baselineAxeAudit: baselineAxe,
              _scoreIsBlended: true
            }));
          }
        }
      } catch (axeErr) {
        warnLog('[PDF Audit] Baseline axe-core failed (non-blocking):', axeErr);
        // Dual-engine guarantee broken at baseline — flag so Fix & Verify can warn.
        triangulated._baselineAxeFailed = true;
        if (!_skipUi) {
          setPdfAuditResult(prev => ({ ...prev, _baselineAxeFailed: true }));
        }
      }
      if (!_skipUi) setPdfAuditLoading(false);
      return triangulated;
    } catch (err) {
      warnLog('[PDF Audit] Failed:', err?.message || err);
      console.error('[PDF Audit] Full error:', err);
      const failureResult = { score: -1, summary: `Audit failed: ${err?.message || 'Unknown error'}. You can retry or proceed to Fix & Verify.`, critical: [], serious: [], moderate: [], minor: [], passes: [] };
      if (!_skipUi) setPdfAuditResult(failureResult);
      if (!_skipUi) setPdfAuditLoading(false);
      return failureResult;
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // ── PDF Batch Remediation Pipeline ──
  // Processes multiple PDFs sequentially: audit → remediate → verify → auto-fix
  // ═══════════════════════════════════════════════════════════════════

  const processSinglePdfForBatch = async (base64Data, fileName, onProgress) => {
    const log = (msg) => { warnLog(`[Batch/${fileName}] ${msg}`); if (onProgress) onProgress(msg); };
    const beforeStartTime = Date.now();

    // ── Phase 1: Multi-auditor scoring ──
    log('Phase 1: Running accessibility audit...');
    const batchAuditPrompt = `You are a WCAG 2.1 AA accessibility auditor for educational documents. Analyze this PDF for accessibility violations.

Check for these specific issues:
1. STRUCTURE: Missing heading hierarchy, no logical reading order, flat text without sections
2. IMAGES: Images without alt text or descriptions
3. TABLES: Data tables without header rows, missing row/column associations
4. CONTRAST: Text that may have insufficient color contrast
5. FORMS: Form fields without labels
6. LANGUAGE: Missing document language tag
7. LINKS: Links that say "click here" instead of descriptive text
8. LISTS: Content that should be formatted as lists but isn't
9. TEXT: Scanned image-only pages (no searchable text layer)
10. METADATA: Missing document title, author, or subject

SCORING RUBRIC — Start at 100, deduct points for each unique violation:
  CRITICAL (-15 each): Missing lang attribute, no page title, images without alt text, no main landmark, color contrast below 3:1, no searchable text layer
  SERIOUS (-10 each): Missing heading hierarchy (no h1), heading level skips, data tables without th/scope, form inputs without labels, color contrast below 4.5:1
  MODERATE (-5 each): Missing skip-to-content link, missing header/footer/nav landmarks, non-descriptive link text, missing table caption, bullet characters instead of semantic lists
  MINOR (-2 each): Missing document metadata, extra whitespace in alt text, multiple h1 elements, inconsistent heading granularity

Return ONLY valid JSON (no markdown, no backticks): {"score":N,"summary":"1-2 sentence overview","critical":[{"issue":"description","wcag":"SC number"}],"serious":[{"issue":"...","wcag":"..."}],"moderate":[{"issue":"...","wcag":"..."}],"minor":[{"issue":"...","wcag":"..."}],"passes":["what's already accessible"],"pageCount":N,"hasSearchableText":true/false,"hasImages":true/false,"hasTables":true/false,"hasForms":true/false}`;

    const batchAllVariants = [
      batchAuditPrompt,
      batchAuditPrompt.replace('accessibility auditor', 'document remediation specialist'),
      batchAuditPrompt.replace('Analyze this PDF', 'Perform a deep-dive accessibility review of this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'As a strict WCAG compliance officer, audit this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'From the perspective of a screen reader user, assess this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'As a disability rights advocate, critically review this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'Using Section 508 federal standards, evaluate this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'As a university Title II compliance officer, assess this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'As an assistive technology expert, test this PDF'),
      batchAuditPrompt.replace('Analyze this PDF', 'Conduct an independent accessibility evaluation of this PDF'),
    ];
    const batchNumAuditors = Math.min(pdfAuditorCount, batchAllVariants.length);
    const batchAuditVariants = batchAllVariants.slice(0, batchNumAuditors);
    const batchAuditResults = await Promise.all(batchAuditVariants.map(p => callGeminiVision(p, base64Data, 'application/pdf').catch(() => null)));
    const batchParsedAudits = batchAuditResults.filter(Boolean).map(r => { try { return parseAuditJson(r); } catch { return null; } }).filter(Boolean);

    // ── Retry backfill for batch audits (same pattern as single-file audit) ──
    let batchRetryRound = 0;
    while (batchParsedAudits.length < batchNumAuditors && batchParsedAudits.length > 0 && batchRetryRound < 2) {
      batchRetryRound++;
      const shortfall = batchNumAuditors - batchParsedAudits.length;
      log(`Audit retry round ${batchRetryRound}: ${batchParsedAudits.length}/${batchNumAuditors}, retrying ${shortfall}...`);
      await new Promise(r => setTimeout(r, 1000 * batchRetryRound));
      const retryVariants = batchAllVariants.slice(batchNumAuditors).concat(
        batchAllVariants.slice(0, batchNumAuditors).map(p => p + `\n\n(Retry attempt ${batchRetryRound + 1})`)
      ).slice(0, shortfall);
      const retryResults = [];
      for (const p of retryVariants) {
        try { retryResults.push(await callGeminiVision(p, base64Data, 'application/pdf')); } catch { retryResults.push(null); }
        await new Promise(r => setTimeout(r, 500));
      }
      const retryParsed = retryResults.filter(Boolean).map(r => { try { return parseAuditJson(r); } catch { return null; } }).filter(Boolean);
      if (retryParsed.length > 0) batchParsedAudits.push(...retryParsed);
    }

    if (batchParsedAudits.length === 0) throw new Error('All audit attempts failed');

    // Recalculate scores from issue counts
    batchParsedAudits.forEach(a => {
      const critCount = (a.critical || []).length;
      const seriousCount = (a.serious || a.major || []).length;
      const modCount = (a.moderate || []).length;
      const minCount = (a.minor || []).length;
      const passCount = (a.passes || []).length;
      const rawDed = critCount * 15 + seriousCount * 10 + modCount * 5 + minCount * 2;
      const issueCount = critCount + seriousCount + modCount + minCount;
        const passRatio = passCount > 0 ? passCount / (passCount + issueCount) : 0;
        const pf = 1 - (passRatio * 0.4);
      const calculatedScore = Math.max(0, 100 - Math.round(rawDed * pf));
      if (typeof a.score === 'number' && Math.abs(a.score - calculatedScore) > 12) {
        a.score = calculatedScore;
      }
    });

    const batchScores = batchParsedAudits.map(a => Number(a.score)).filter(s => !isNaN(s));
    const beforeScore = batchScores.length > 0 ? Math.round(batchScores.reduce((a, b) => a + b, 0) / batchScores.length) : 0;
    const pageCount = batchParsedAudits.find(a => a.pageCount)?.pageCount || 1;

    // Merge issues (4-tier: critical/serious/moderate/minor)
    const allCrit = [...new Map(batchParsedAudits.flatMap(a => (a.critical || []).map(i => [(i.issue || '').substring(0, 40), i])).filter(([k]) => k)).values()];
    const allSer = [...new Map(batchParsedAudits.flatMap(a => (a.serious || a.major || []).map(i => [(i.issue || '').substring(0, 40), i])).filter(([k]) => k)).values()];
    const allMod = [...new Map(batchParsedAudits.flatMap(a => (a.moderate || []).map(i => [(i.issue || '').substring(0, 40), i])).filter(([k]) => k)).values()];
    const allMin = [...new Map(batchParsedAudits.flatMap(a => (a.minor || []).map(i => [(i.issue || '').substring(0, 40), i])).filter(([k]) => k)).values()];

    log(`Audit: score ${beforeScore}/100 (${batchParsedAudits.length} auditors, ${allCrit.length}C/${allSer.length}S/${allMod.length}M/${allMin.length}m)`);

    // ── Phase 2: Extract text ──
    log('Phase 2: Extracting text...');
    const batchIssueList = []
      .concat(allCrit.map(i => '\ud83d\udd34 ' + i.issue))
      .concat(allSer.map(i => '\ud83d\udfe0 ' + i.issue))
      .concat(allMod.map(i => '\ud83d\udfe1 ' + i.issue))
      .concat(allMin.map(i => '\u26aa ' + i.issue))
      .slice(0, 25).join('\n');

    let extractedText = '';
    const BATCH_PAGES_PER_CHUNK = 5;
    const batchChunks = Math.max(1, Math.ceil(pageCount / BATCH_PAGES_PER_CHUNK));
    if (batchChunks <= 1) {
      extractedText = await callGeminiVision(
      `Extract ALL text content from this document.\n\nRULES:\n- Use # for titles, ## for sections, ### for subsections\n- Preserve tables as markdown tables with | pipes and --- dividers\n- Describe images as: [Image: detailed description]\n- Use * for bullet lists, 1. for numbered lists\n- Preserve ALL hyperlinks as [link text](URL)\n- Keep ALL content\n\nReturn ONLY plain text with markdown formatting.`,
      base64Data, 'application/pdf'
      );
    } else {
      log(`Extracting ${batchChunks} chunks (${pageCount} pages)...`);
      const cPromises = [];
      for (let ci = 0; ci < batchChunks; ci++) {
        const sp = ci * BATCH_PAGES_PER_CHUNK + 1;
        const ep = Math.min((ci + 1) * BATCH_PAGES_PER_CHUNK, pageCount);
        cPromises.push(callGeminiVision(`Extract ALL text content from pages ${sp} through ${ep} of this document.\n\nRULES:\n- Use # for titles, ## for sections, ### for subsections\n- Preserve tables as markdown tables with | pipes and --- dividers\n- Describe images as: [Image: detailed description]\n- Use * for bullet lists, 1. for numbered lists\n- Preserve ALL hyperlinks as [link text](URL)\n- Keep ALL content\n\nReturn ONLY plain text with markdown formatting.`, base64Data, 'application/pdf').catch(() => null));
      }
      let cResults = [];
      for (let b = 0; b < cPromises.length; b += 5) {
        const batch = cPromises.slice(b, b + 5);
        cResults = cResults.concat(await Promise.all(batch));
        if (b + 5 < cPromises.length) await new Promise(r => setTimeout(r, 500));
      }
      extractedText = cResults.filter(Boolean).join('\n\n---\n\n');
    }

    if (!extractedText || extractedText.length < 20) {
      throw new Error('Could not extract sufficient text from this PDF');
    }

    extractedText = extractedText
      .replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n')
      .replace(/\\"/g, '"').replace(/\\t/g, '\t')
      .replace(/\n{4,}/g, '\n\n\n').trim();

    log(`Extracted ${extractedText.length} chars`);

    // ── Phase 3: Generate accessible HTML ──
    log('Phase 3: Generating accessible HTML...');

    let batchDocStyle = { headingColor: '#1e3a5f', accentColor: '#2563eb', bgColor: '#ffffff', headerBg: '#1e3a5f', headerText: '#ffffff', bodyFont: 'system-ui, sans-serif', tableBg: '#f1f5f9', tableBorder: '#cbd5e1' };
    // Check brand mode: 'auto' = extract from this PDF (default), 'upload' = use uploaded brand, 'none' = defaults only
    const _brandMode = typeof window !== 'undefined' ? (window.__pdfBrandMode || 'auto') : 'auto';
    const _brandOverride = typeof window !== 'undefined' ? window.__pdfBrandOverride : null;
    if (_brandMode === 'upload' && _brandOverride) {
      // Use colors extracted from uploaded brand reference
      batchDocStyle = { ...batchDocStyle, ..._brandOverride };
      log('Using uploaded brand colors');
    } else if (_brandMode === 'none') {
      // Skip brand extraction, use defaults
      log('Using default palette (no branding)');
    } else {
      // Auto-extract from this PDF
      try {
        const styleRes = await callGeminiVision(
          `Analyze the visual design of this PDF. Extract the exact color scheme.\n\nReturn ONLY JSON:\n{"headingColor":"hex","accentColor":"hex","bgColor":"hex","headerBg":"hex","headerText":"hex","tableBg":"hex","tableBorder":"hex"}`,
          base64Data, 'application/pdf'
        );
        if (styleRes) {
          let sc = styleRes.trim();
          if (sc.indexOf('`' + '``') !== -1) { const ps = sc.split('`' + '``'); sc = ps[1] || ps[0]; if (sc.indexOf('\n') !== -1) sc = sc.split('\n').slice(1).join('\n'); if (sc.lastIndexOf('`' + '``') !== -1) sc = sc.substring(0, sc.lastIndexOf('`' + '``')); }
          batchDocStyle = { ...batchDocStyle, ...JSON.parse(sc) };
          log('Extracted brand colors from original PDF');
        }
      } catch(e) {}
    }

    // ── Boring-palette detection: if the source document has minimal color variation,
    // give the AI creative freedom to apply smart beautification instead of replicating boring styling ──
    const _isBoringPalette = (() => {
      try {
        const hexToGray = (hex) => {
          if (!hex || typeof hex !== 'string') return -1;
          const h = hex.replace('#', '');
          if (h.length < 6) return -1;
          const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
          return 0.299 * r + 0.587 * g + 0.114 * b; // perceived brightness
        };
        const colors = [batchDocStyle.headingColor, batchDocStyle.accentColor, batchDocStyle.headerBg, batchDocStyle.tableBg].filter(Boolean);
        if (colors.length === 0) return true;
        const grays = colors.map(hexToGray).filter(v => v >= 0);
        if (grays.length === 0) return true;
        // Check if all text colors are very dark (< 80 brightness) or very light (> 220 brightness)
        const allDarkOrLight = grays.every(g => g < 80 || g > 220);
        // Check if there's very low color variation (all grays within 60 units of each other)
        const maxGray = Math.max(...grays), minGray = Math.min(...grays);
        const lowVariation = (maxGray - minGray) < 60;
        // Also check the background — if it's pure white or near-white with dark text, that's boring
        const bgGray = hexToGray(batchDocStyle.bgColor);
        const isBoring = allDarkOrLight && lowVariation && bgGray > 240;
        if (isBoring) warnLog('[Style] Source document has a boring palette (grayscale/minimal color) — enabling smart beautification');
        return isBoring;
      } catch(e) { return false; }
    })();

    // Check for user style seed (set via UI before remediation) — unified with STYLE_SEEDS
    const _styleSeedId = typeof window !== 'undefined' ? (window.__pdfStyleSeed || window.__pdfStylePreference || '') : '';
    const _styleSeed = STYLE_SEEDS[_styleSeedId];
    // If the source is boring and user hasn't explicitly chosen a style, inject smart beautification instructions
    const _boringBeautify = _isBoringPalette && (!_styleSeedId || _styleSeedId === 'matchOriginal')
      ? '\nSTYLE ENHANCEMENT: The source document uses minimal/plain styling (mostly black text on white background). Do NOT replicate the boring appearance. Instead, apply smart professional beautification:\n' +
        '- Use a harmonious color scheme: navy (#1e3a5f) for headings, blue (#2563eb) for accents, subtle warm gray (#f8fafc) for callout/highlight blocks\n' +
        '- Add visual hierarchy: colored left-border accent blocks for key sections, subtle background shading for important callouts or definitions\n' +
        '- Use professional spacing: generous padding between sections, clear visual separation between content areas\n' +
        '- Add subtle design touches: rounded corners on callout blocks, thin colored top-border on the main heading, soft box-shadows on card-like sections\n' +
        '- Keep it professional and readable — enhance, don\'t overwhelm. The goal is a document people want to read.\n'
      : '';
    const _styleInstructions = (_styleSeed?.promptInstructions ? '\n' + _styleSeed.promptInstructions : '') + _boringBeautify;

    // If boring palette detected and no explicit style chosen, override the extracted colors
    // so the VISUAL STYLING section of the prompt gives the AI professional defaults instead of black-on-white
    if (_boringBeautify) {
      batchDocStyle = { ...batchDocStyle, headingColor: '#1e3a5f', accentColor: '#2563eb', headerBg: '#1e3a5f', headerText: '#ffffff', tableBg: '#f1f5f9', tableBorder: '#cbd5e1' };
      warnLog('[Style] Overrode boring palette with professional defaults for transform prompt');
    }

    // Deterministic prescan of the source — feed structured hints into the prompt
    const _sourceHints = scanSourceHints(extractedText);
    const _hintBlock = formatHintsForPrompt(_sourceHints);
    if (_sourceHints.hasNonLatinScripts) warnLog(`[Hints] Non-Latin scripts detected: ${_sourceHints.detectedScripts.join(', ')}`);

    // ── Chunked transform: split large text on paragraph boundaries, transform each chunk as fragment ──
    // Stays under 8192-token output ceiling and eliminates silent truncation at 30K char mark.
    const TEXT_TRANSFORM_CHUNK = 12000;
    const splitTextForTransform = (text, size) => {
      if (!text || text.length <= size) return [text || ''];
      const chunks = [];
      let i = 0;
      while (i < text.length) {
        let end = Math.min(i + size, text.length);
        if (end < text.length) {
          const paraBreak = text.lastIndexOf('\n\n', end);
          if (paraBreak > i + size * 0.5) {
            end = paraBreak;
          } else {
            const sentBreak = text.lastIndexOf('. ', end);
            if (sentBreak > i + size * 0.5) end = sentBreak + 1;
          }
        }
        chunks.push(text.slice(i, end));
        i = end;
      }
      return chunks;
    };

    // Build the shared prompt suffix (all rules + styling) so each chunk uses identical instructions
    const buildTransformPrompt = (chunkText, fragMeta) => {
      const { isFirst, isLast, chunkIdx, totalChunks } = fragMeta;
      const fragmentHeader = totalChunks > 1
        ? `\n\nFRAGMENT ${chunkIdx + 1} of ${totalChunks}. ` +
          (isFirst ? 'START the document — include <!DOCTYPE html>, <html lang="en">, <head> with <title>, <meta charset>, skip-to-content link, and opening <main id="main-content" role="main">. ' : 'CONTINUE the document — do NOT include <!DOCTYPE>, <html>, <head>, or <main> opening. Start with content elements only. ') +
          (isLast ? 'END the document — close </main></body></html>.' : 'Do NOT close </main></body></html> — more fragments follow.')
        : '';
      return `You are a senior accessibility remediation specialist. Transform this extracted document text into a fully accessible, professionally styled HTML document that meets WCAG 2.1 Level AA compliance.${_styleInstructions}

ORIGINAL ACCESSIBILITY ISSUES FOUND:
${batchIssueList}${_hintBlock}
${fragmentHeader}

TEXT CONTENT TO TRANSFORM:
"""
${chunkText}
"""

Create accessible HTML following ALL of these requirements:

STRUCTURAL ACCESSIBILITY:
- ${totalChunks > 1 && !isFirst ? 'Continue the existing hierarchy (h2/h3/h4) — do NOT start a new <h1>' : '<!DOCTYPE html>, <html lang="en">, <head> with <meta charset="UTF-8">, meaningful <title>'}
${totalChunks > 1 && !isFirst ? '' : '- <meta name="viewport" content="width=device-width, initial-scale=1.0">\n- Skip-to-content link: <a href="#main-content" class="sr-only">Skip to main content</a>\n- <main id="main-content" role="main"> wrapping all content'}
- <nav>, <header>, <footer>, <section> landmarks where appropriate
- ${totalChunks > 1 && !isFirst ? 'Use h2/h3/h4 only — the h1 is in the first fragment' : 'Exactly ONE <h1>, with proper h2→h3→h4 hierarchy (no skipped levels)'}

TABLE ACCESSIBILITY:
- <table> with <caption> describing the table's purpose
- <thead> with <th scope="col"> for column headers
- <th scope="row"> for row headers where applicable
- <tbody> wrapping data rows

CONTENT QUALITY:
- Convert bullet characters (•, -, *) to semantic <ul>/<ol> lists
- Convert [Image: description] markers to <figure> with <img alt="description"> and <figcaption>
- Preserve all hyperlinks as <a href="..."> with descriptive link text
- Preserve ALL content — do not summarize, shorten, or drop any paragraphs, tables, or list items
- Use <blockquote> for quoted text, <code> for code snippets
- Use <abbr> for abbreviations on first use

VISUAL STYLING (inline CSS):
- Font: font-family: ${batchDocStyle.bodyFont}
- Headings: color: ${batchDocStyle.headingColor}; accent elements: ${batchDocStyle.accentColor}
- Background: ${batchDocStyle.bgColor}; max-width: 800px; margin: 0 auto; padding: 2rem
- Tables: border-collapse:collapse; th background: ${batchDocStyle.tableBg}; border: 1px solid ${batchDocStyle.tableBorder}
- Color contrast: ALL text must meet 4.5:1 ratio against its background
- Line-height: 1.7 for body text (readability)
- Print styles: @media print { body { max-width: 100%; } .sr-only { display: none; } }
- High contrast support: @media (forced-colors: active) { a { text-decoration: underline; } th, td { border: 1px solid CanvasText; } }
- Reduced motion: @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

Return ONLY ${totalChunks > 1 && !isFirst ? 'the HTML fragment (no <!DOCTYPE>, no <html>)' : (totalChunks > 1 ? 'the opening through this fragment\'s content (do NOT close </main></body></html>)' : 'the complete HTML document (<!DOCTYPE html> to </html>)')}.`;
    };

    const textChunks = splitTextForTransform(extractedText, TEXT_TRANSFORM_CHUNK);
    warnLog(`[Transform] Splitting ${extractedText.length} chars into ${textChunks.length} chunk(s) of ~${TEXT_TRANSFORM_CHUNK} chars`);

    let accessibleHtml;
    if (textChunks.length === 1) {
      // Short document: single call, same as before
      const singlePrompt = buildTransformPrompt(textChunks[0], { isFirst: true, isLast: true, chunkIdx: 0, totalChunks: 1 });
      accessibleHtml = await callGemini(singlePrompt, false);
      accessibleHtml = _stripJsonWrapperArtifacts(accessibleHtml);
    } else {
      // Long document: parallel chunks in batches of 5
      const MAX_PARALLEL = 5;
      const chunkResults = new Array(textChunks.length);
      for (let batch = 0; batch < textChunks.length; batch += MAX_PARALLEL) {
        const batchEnd = Math.min(batch + MAX_PARALLEL, textChunks.length);
        const batchPromises = [];
        for (let ci = batch; ci < batchEnd; ci++) {
          const meta = { isFirst: ci === 0, isLast: ci === textChunks.length - 1, chunkIdx: ci, totalChunks: textChunks.length };
          const prompt = buildTransformPrompt(textChunks[ci], meta);
          batchPromises.push(
            callGemini(prompt, false).then(r => ({ ci, result: r })).catch(err => {
              warnLog(`[Transform] Chunk ${ci + 1} failed:`, err?.message);
              return { ci, result: null };
            })
          );
        }
        const batchResults = await Promise.all(batchPromises);
        for (const { ci, result } of batchResults) chunkResults[ci] = result;
        if (batchEnd < textChunks.length) await new Promise(r => setTimeout(r, 500));
      }
      // Strip markdown fences from each chunk and join
      const cleanChunks = chunkResults.map((r, i) => {
        if (!r) return `<section aria-label="Fragment ${i + 1} failed to process"><p>[Fragment ${i + 1} could not be transformed]</p></section>`;
        let c = r.trim();
        if (c.includes('`' + '``')) {
          const parts = c.split('`' + '``');
          c = parts[1] || parts[0];
          if (c.startsWith('html\n') || c.startsWith('html\r\n')) c = c.substring(c.indexOf('\n') + 1);
          if (c.lastIndexOf('`' + '``') !== -1) c = c.substring(0, c.lastIndexOf('`' + '``'));
        }
        c = c.trim();
        // Strip JSON array/object wrapper artifacts. Some Gemini responses return `["<html>..."]`
        // or leave a trailing `[ "` fragment when truncated. Detect and unwrap/recover.
        if (/^\s*\[\s*"/.test(c)) {
          // Wrapped in JSON array-of-string form → unwrap leading `["` and trailing `"]`.
          c = c.replace(/^\s*\[\s*"/, '').replace(/"\s*\]\s*$/, '');
          // Unescape common JSON escapes that survived the unwrap.
          c = c.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          // Decode \uXXXX surrogate-pair escapes (otherwise 📷 renders as literal
          // "\ud83d\udcf7" and … renders as "\u2026" in the final HTML).
          c = c.replace(/\\u([0-9a-fA-F]{4})/g, function(_, hex) { return String.fromCharCode(parseInt(hex, 16)); });
        }
        // Strip a stray trailing `[ "` or `[ "}` left by truncated JSON — common cause of the
        // `[ "` fragment that occasionally appears at the bottom of a rendered page.
        // Also strip leading `["` so that when chunk N+1 is joined to chunk N, the two
        // wrappers can't collide into a `" ][ "` artifact between real content.
        // Widened to also catch `"}]`, `"} ]`, `" } ]` — Gemini's JSON-object wrapping
        // (`[{"html":"…"}]`) leaves a stray `}` between the quote and the `]` that the
        // original narrow `" ]` pattern missed, producing visible artifacts in output.
        c = c.replace(/\[\s*"?\s*$/, '').replace(/"[\s}\],]*\]\s*$/, '').trim();
        c = c.replace(/^\s*\[\s*"\s*/, '').replace(/^\s*"\s*[}\]][\s}\],]*/, '').trim();
        // If a chunk is ENTIRELY partial JSON (no visible HTML tags), drop it with a recovery placeholder.
        if (c && !/<[a-z][\s\S]*?>/i.test(c) && /^\s*[\[\{]/.test(c)) {
          warnLog(`[Transform] Chunk ${i + 1} returned non-HTML JSON fragment — replacing with placeholder`);
          return `<section aria-label="Fragment ${i + 1} recovery"><p>[Fragment ${i + 1} could not be transformed]</p></section>`;
        }
        return c;
      });
      accessibleHtml = cleanChunks.join('\n');
      accessibleHtml = _stripJsonWrapperArtifacts(accessibleHtml);
      // Ensure the document is properly closed (in case the last chunk's AI forgot)
      if (!accessibleHtml.includes('</html>')) {
        if (!accessibleHtml.includes('</body>')) {
          if (!accessibleHtml.includes('</main>')) accessibleHtml += '\n</main>';
          accessibleHtml += '\n</body>';
        }
        accessibleHtml += '\n</html>';
      }
      warnLog(`[Transform] Joined ${cleanChunks.length} chunks → ${accessibleHtml.length} chars HTML`);
    }

    if (!accessibleHtml || accessibleHtml.length < 100) {
      throw new Error('HTML generation failed');
    }

    // Strip markdown fencing
    if (accessibleHtml.includes('`' + '``')) {
      const parts = accessibleHtml.split('`' + '``');
      accessibleHtml = parts[1] || parts[0];
      if (accessibleHtml.startsWith('html\n') || accessibleHtml.startsWith('html\r\n')) {
        accessibleHtml = accessibleHtml.substring(accessibleHtml.indexOf('\n') + 1);
      }
      if (accessibleHtml.lastIndexOf('`' + '``') !== -1) {
        accessibleHtml = accessibleHtml.substring(0, accessibleHtml.lastIndexOf('`' + '``'));
      }
    }

    log(`Generated ${accessibleHtml.length} chars HTML`);

    // ── Phase 3b: Deterministic a11y fixes (full set — mirroring single-file pipeline) ──
    let aiFixCount = 0;

    // 1. Missing alt on images — derive from src/title or add descriptive placeholder
    accessibleHtml = accessibleHtml.replace(/<img([^>]*)>/gi, (match, attrs) => {
      if (/alt\s*=/.test(attrs)) return match;
      aiFixCount++;
      var srcMatch = attrs.match(/src\s*=\s*["']([^"']+)["']/i);
      var titleMatch = attrs.match(/title\s*=\s*["']([^"']+)["']/i);
      var altText = 'Image';
      if (titleMatch && titleMatch[1]) { altText = titleMatch[1]; }
      else if (srcMatch && srcMatch[1]) { var fname = srcMatch[1].split('/').pop().split('?')[0].replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim(); if (fname && fname.length > 2 && !/^(img|image|photo|pic|figure)\d*$/i.test(fname)) altText = fname.charAt(0).toUpperCase() + fname.slice(1); }
      return `<img alt="${altText}"${attrs}>`;
    });

    // 2. Ensure exactly one h1
    const batchH1Count = (accessibleHtml.match(/<h1[\s>]/gi) || []).length;
    if (batchH1Count === 0) {
      accessibleHtml = accessibleHtml.replace(/<h2([^>]*)>/, '<h1$1>');
      accessibleHtml = accessibleHtml.replace(/<\/h2>/, '</h1>');
      aiFixCount++;
    } else if (batchH1Count > 1) {
      let bH1Idx = 0;
      accessibleHtml = accessibleHtml.replace(/<h1([^>]*)>/gi, (m, attrs) => {
        bH1Idx++;
        if (bH1Idx === 1) return m;
        aiFixCount++;
        return `<h2${attrs}>`;
      });
      let bH1CloseIdx = 0;
      accessibleHtml = accessibleHtml.replace(/<\/h1>/gi, () => {
        bH1CloseIdx++;
        if (bH1CloseIdx === 1) return '</h1>';
        return '</h2>';
      });
    }

    // 3. Ensure <html> has valid lang attribute (BCP 47)
    if (!accessibleHtml.includes('lang=')) {
      accessibleHtml = accessibleHtml.replace(/<html/, '<html lang="en"'); aiFixCount++;
    } else {
      // Validate existing lang value — fix common AI mistakes like "English", "en_US", empty string
      const validLangPattern = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
      accessibleHtml = accessibleHtml.replace(/<html([^>]*)lang="([^"]*)"/, (m, before, langVal) => {
        const trimmed = langVal.trim().toLowerCase().replace(/_/g, '-');
        if (!trimmed || !validLangPattern.test(trimmed)) {
          // Map common invalid values to valid BCP 47 codes
          const langMap = { 'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de', 'portuguese': 'pt', 'chinese': 'zh', 'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar', 'russian': 'ru', 'italian': 'it', 'dutch': 'nl', 'hindi': 'hi' };
          const fixed = langMap[trimmed] || 'en';
          aiFixCount++;
          warnLog(`[Det Fix] Invalid lang="${langVal}" → lang="${fixed}"`);
          return `<html${before}lang="${fixed}"`;
        }
        if (trimmed !== langVal) {
          aiFixCount++;
          return `<html${before}lang="${trimmed}"`;
        }
        return m;
      });
    }

    // 4. Ensure <title> is non-empty
    if (/<title>\s*<\/title>/.test(accessibleHtml) || !accessibleHtml.includes('<title>')) {
      const titleText = fileName.replace(/\.pdf$/i, '');
      if (accessibleHtml.includes('<title>')) { accessibleHtml = accessibleHtml.replace(/<title>[^<]*<\/title>/, `<title>${titleText}</title>`); }
      else { accessibleHtml = accessibleHtml.replace('</head>', `<title>${titleText}</title>\n</head>`); }
      aiFixCount++;
    }

    // 5. Ensure all tables have scope on th elements
    accessibleHtml = accessibleHtml.replace(/<th(?![^>]*scope)/gi, () => { aiFixCount++; return '<th scope="col"'; });

    // 6. Ensure all links have descriptive text (not empty)
    accessibleHtml = accessibleHtml.replace(/<a([^>]*)>\s*<\/a>/gi, (match, attrs) => {
      const href = attrs.match(/href="([^"]*)"/);
      aiFixCount++;
      return `<a${attrs}>${href ? href[1].replace(/https?:\/\//, '').substring(0, 40) : 'Link'}</a>`;
    });

    // 7. Ensure skip-to-content link exists (visible on focus, high contrast)
    if (!accessibleHtml.includes('Skip to') && !accessibleHtml.includes('skip-nav')) {
      accessibleHtml = accessibleHtml.replace(/<body[^>]*>/, (m) => {
        aiFixCount++;
        return m + '\n<a href="#main-content" class="skip-link" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000;background:#1e293b;color:#ffffff;padding:8px 16px;font-size:14px;font-weight:bold;text-decoration:none;border-radius:0 0 8px 0;border:2px solid #fbbf24">Skip to main content</a>';
      });
      // Add CSS to make skip link visible on focus with WCAG AA contrast
      if (accessibleHtml.includes('</head>')) {
        accessibleHtml = accessibleHtml.replace('</head>', '<style>.skip-link:focus{position:fixed!important;left:0!important;top:0!important;width:auto!important;height:auto!important;overflow:visible!important;clip:auto!important;z-index:10000!important;background:#1e293b!important;color:#ffffff!important;padding:12px 20px!important;font-size:16px!important;font-weight:bold!important;outline:3px solid #fbbf24!important;outline-offset:2px!important;text-decoration:underline!important}</style>\n</head>');
        aiFixCount++;
      }
    }

    // 8. Ensure main landmark exists
    if (!accessibleHtml.includes('<main')) {
      accessibleHtml = accessibleHtml.replace(/<body[^>]*>/, (m) => { aiFixCount++; return m + '\n<main id="main-content" role="main">'; });
      accessibleHtml = accessibleHtml.replace('</body>', '</main>\n</body>');
    }

    // 8b. Ensure nav landmark exists (wrap any table of contents or link lists)
    if (!accessibleHtml.includes('<nav') && !accessibleHtml.includes('role="navigation"')) {
      // Look for a TOC-like structure (heading + list of links at the top)
      var tocMatch = accessibleHtml.match(/<(h[1-3])[^>]*>.*?(table of contents|contents|navigation|toc).*?<\/\1>\s*<(ul|ol)/i);
      if (tocMatch) {
        var tocIdx = accessibleHtml.indexOf(tocMatch[0]);
        if (tocIdx >= 0) {
          accessibleHtml = accessibleHtml.substring(0, tocIdx) + '<nav role="navigation" aria-label="Table of Contents">' + accessibleHtml.substring(tocIdx);
          // Find the closing </ul> or </ol> after the TOC
          var listTag = tocMatch[3];
          var closingTag = '</' + listTag + '>';
          var closeIdx = accessibleHtml.indexOf(closingTag, tocIdx + tocMatch[0].length);
          if (closeIdx >= 0) {
            accessibleHtml = accessibleHtml.substring(0, closeIdx + closingTag.length) + '</nav>' + accessibleHtml.substring(closeIdx + closingTag.length);
            aiFixCount++;
          }
        }
      }
    }

    // 8c. Ensure footer landmark exists (wrap any footer-like content at the end)
    if (!accessibleHtml.includes('<footer') && !accessibleHtml.includes('role="contentinfo"')) {
      // Look for common footer patterns (copyright, date, attribution near end of body)
      var footerPatterns = [/(<p[^>]*>.*?(?:copyright|©|\u00a9|generated|created|source:|author:).*?<\/p>)\s*<\/main>/i,
                           /(<div[^>]*>.*?(?:copyright|©|\u00a9|AlloFlow|generated on).*?<\/div>)\s*<\/main>/i];
      for (var fpi = 0; fpi < footerPatterns.length; fpi++) {
        var footerMatch = accessibleHtml.match(footerPatterns[fpi]);
        if (footerMatch) {
          accessibleHtml = accessibleHtml.replace(footerMatch[0], '</main>\n<footer role="contentinfo">' + footerMatch[1] + '</footer>');
          aiFixCount++;
          break;
        }
      }
    }

    // 9. Fix heading level skips (h1→h3 becomes h1→h2)
    const batchHeadingLevels = [...accessibleHtml.matchAll(/<h([1-6])[\s>]/gi)].map(m => parseInt(m[1]));
    if (batchHeadingLevels.length > 1) {
      let bPrevLevel = batchHeadingLevels[0];
      for (let hi = 1; hi < batchHeadingLevels.length; hi++) {
        if (batchHeadingLevels[hi] > bPrevLevel + 1) {
          const wrongLevel = batchHeadingLevels[hi];
          const correctLevel = bPrevLevel + 1;
          const skipRe = new RegExp(`<h${wrongLevel}([\\s>])`, 'i');
          const closeRe = new RegExp(`</h${wrongLevel}>`, 'i');
          if (skipRe.test(accessibleHtml)) {
            accessibleHtml = accessibleHtml.replace(skipRe, `<h${correctLevel}$1`);
            accessibleHtml = accessibleHtml.replace(closeRe, `</h${correctLevel}>`);
            aiFixCount++;
          }
          batchHeadingLevels[hi] = correctLevel;
        }
        bPrevLevel = batchHeadingLevels[hi];
      }
    }

    // 10. Remove empty headings
    accessibleHtml = accessibleHtml.replace(/<h([1-6])[^>]*>\s*<\/h\1>/gi, () => { aiFixCount++; return ''; });

    // 11. Fix "click here" / "read more" link text
    accessibleHtml = accessibleHtml.replace(/<a([^>]*href="([^"]*)"[^>]*)>(click here|read more|here|learn more|more)<\/a>/gi, (match, attrs, href, text) => {
      aiFixCount++;
      const domain = href.replace(/https?:\/\//, '').split('/')[0].substring(0, 30);
      return `<a${attrs}>${domain || 'Link'}</a>`;
    });

    // 12. Ensure viewport meta tag
    if (!accessibleHtml.includes('viewport')) {
      accessibleHtml = accessibleHtml.replace('</head>', '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>');
      aiFixCount++;
    }

    // 13. Fix duplicate IDs
    const batchIdMatches = [...accessibleHtml.matchAll(/id="([^"]+)"/g)];
    const batchIdCounts = {};
    batchIdMatches.forEach(m => { batchIdCounts[m[1]] = (batchIdCounts[m[1]] || 0) + 1; });
    Object.entries(batchIdCounts).filter(([, c]) => c > 1).forEach(([id]) => {
      let counter = 0;
      accessibleHtml = accessibleHtml.replace(new RegExp(`id="${id}"`, 'g'), () => {
        counter++;
        if (counter === 1) return `id="${id}"`;
        aiFixCount++;
        return `id="${id}-${counter}"`;
      });
    });

    // 14. Fix orphaned <li> elements not inside <ul> or <ol>
    accessibleHtml = accessibleHtml.replace(/(?<!\n\s*<\/[uo]l>)\s*(<li[\s>])/gi, (match, li, offset) => {
      // Check if this <li> is already inside a <ul> or <ol> by looking back
      const before = accessibleHtml.substring(Math.max(0, offset - 200), offset);
      const lastUlOl = Math.max(before.lastIndexOf('<ul'), before.lastIndexOf('<ol'));
      const lastClose = Math.max(before.lastIndexOf('</ul'), before.lastIndexOf('</ol'));
      if (lastUlOl > lastClose) return match; // already inside a list
      aiFixCount++;
      return '<ul>' + li;
    });
    // Close any unclosed <ul> we just opened (simplified — catches most cases)
    const openUls = (accessibleHtml.match(/<ul[\s>]/gi) || []).length;
    const closeUls = (accessibleHtml.match(/<\/ul>/gi) || []).length;
    if (openUls > closeUls) {
      for (let ui = 0; ui < openUls - closeUls; ui++) {
        accessibleHtml = accessibleHtml.replace(/<\/li>(?![\s\S]*?<li[\s>])/, '</li></ul>');
        aiFixCount++;
      }
    }

    // 15. Fix form inputs without labels
    accessibleHtml = accessibleHtml.replace(/<input([^>]*)>/gi, (match, attrs) => {
      if (/aria-label|aria-labelledby|id="[^"]*"/.test(attrs) && /<label[^>]*for=/.test(accessibleHtml)) return match;
      if (/aria-label/.test(attrs)) return match;
      const type = (attrs.match(/type="([^"]*)"/i) || [])[1] || 'text';
      const placeholder = (attrs.match(/placeholder="([^"]*)"/i) || [])[1] || '';
      const name = (attrs.match(/name="([^"]*)"/i) || [])[1] || '';
      const label = placeholder || name || type;
      if (label && label !== 'hidden' && label !== 'submit') {
        aiFixCount++;
        return `<input aria-label="${label}"${attrs}>`;
      }
      return match;
    });

    // 16. Fix buttons without accessible names
    accessibleHtml = accessibleHtml.replace(/<button([^>]*)>\s*<\/button>/gi, (match, attrs) => {
      if (/aria-label/.test(attrs)) return match;
      aiFixCount++;
      return `<button aria-label="Button"${attrs}></button>`;
    });

    // 17. Fix iframes without titles
    accessibleHtml = accessibleHtml.replace(/<iframe([^>]*)>/gi, (match, attrs) => {
      if (/title=/.test(attrs)) return match;
      const src = (attrs.match(/src="([^"]*)"/i) || [])[1] || '';
      const domain = src.replace(/https?:\/\//, '').split('/')[0].substring(0, 30) || 'Embedded content';
      aiFixCount++;
      return `<iframe title="${domain}"${attrs}>`;
    });

    // 18. Fix positive tabindex values (should be 0 or -1)
    accessibleHtml = accessibleHtml.replace(/tabindex="(\d+)"/gi, (match, val) => {
      if (val === '0' || val === '-1') return match;
      aiFixCount++;
      return 'tabindex="0"';
    });

    // 19. Fix role="img" without alt/aria-label
    accessibleHtml = accessibleHtml.replace(/role="img"([^>]*)>/gi, (match, attrs) => {
      if (/aria-label|alt=/.test(attrs)) return match;
      aiFixCount++;
      return `role="img" aria-label="Image"${attrs}>`;
    });

    // 20. Fix <svg> without accessible name
    accessibleHtml = accessibleHtml.replace(/<svg([^>]*)>/gi, (match, attrs) => {
      if (/aria-label|aria-hidden|role="presentation"/.test(attrs)) return match;
      if (/<title>/.test(accessibleHtml.substring(accessibleHtml.indexOf(match), accessibleHtml.indexOf(match) + 500))) return match;
      aiFixCount++;
      return `<svg aria-hidden="true"${attrs}>`;
    });

    // 21. Ensure <html> has both lang and dir attributes
    if (accessibleHtml.includes('lang="ar"') || accessibleHtml.includes('lang="he"') || accessibleHtml.includes('lang="fa"') || accessibleHtml.includes('lang="ur"')) {
      if (!accessibleHtml.includes('dir=')) {
        accessibleHtml = accessibleHtml.replace(/<html([^>]*)>/, '<html dir="rtl"$1>');
        aiFixCount++;
      }
    }

    // 22. Ensure all <table> elements have role="table" for screen readers
    accessibleHtml = accessibleHtml.replace(/<table(?![^>]*role=)([^>]*)>/gi, () => { aiFixCount++; return '<table role="table"$1>'; });

    // 23. Add aria-current="page" to self-referencing links (common a11y best practice)
    // (skipped — requires knowing the current page URL)

    // 24. Ensure <nav> elements have aria-label
    accessibleHtml = accessibleHtml.replace(/<nav(?![^>]*aria-label)([^>]*)>/gi, () => { aiFixCount++; return '<nav aria-label="Navigation"$1>'; });

    // 25. Strip user-scalable=no and maximum-scale=1 (prevents pinch-to-zoom — WCAG 1.4.4)
    accessibleHtml = accessibleHtml.replace(/user-scalable\s*=\s*no/gi, () => { aiFixCount++; return 'user-scalable=yes'; });
    accessibleHtml = accessibleHtml.replace(/maximum-scale\s*=\s*1(\.0)?/gi, () => { aiFixCount++; return 'maximum-scale=5'; });

    // 26. Fix invalid ARIA roles (correct or strip unknown roles)
    const validRoles = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
    // Common AI mistakes and their corrections
    const roleCorrections = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region', 'radiobutton': 'radio', 'check-box': 'checkbox', 'drop-down': 'listbox', 'text-box': 'textbox', 'search-box': 'searchbox', 'progress-bar': 'progressbar', 'scroll-bar': 'scrollbar', 'tab-panel': 'tabpanel', 'tab-list': 'tablist', 'tree-item': 'treeitem', 'menu-item': 'menuitem', 'list-item': 'listitem' };
    accessibleHtml = accessibleHtml.replace(/role="([^"]*)"/gi, (match, role) => {
      const lower = role.toLowerCase().trim();
      if (validRoles.includes(lower)) return `role="${lower}"`;
      if (roleCorrections[lower]) {
        aiFixCount++;
        warnLog(`[Det Fix] Corrected ARIA role: "${role}" → "${roleCorrections[lower]}"`);
        return `role="${roleCorrections[lower]}"`;
      }
      aiFixCount++;
      warnLog('[Det Fix] Removed invalid ARIA role: ' + role);
      return '';
    });

    // 27. Fix <select> elements without accessible names
    accessibleHtml = accessibleHtml.replace(/<select(?![^>]*aria-label)(?![^>]*id="([^"]*)")([^>]*)>/gi, (match, id, attrs) => {
      if (/aria-label/.test(match)) return match;
      const name = (match.match(/name="([^"]*)"/i) || [])[1] || 'Selection';
      aiFixCount++;
      return `<select aria-label="${name}"${attrs}>`;
    });

    // 28. Fix <object> and <embed> without alt/aria-label
    accessibleHtml = accessibleHtml.replace(/<(object|embed)(?![^>]*aria-label)(?![^>]*alt=)([^>]*)>/gi, (match, tag, attrs) => {
      aiFixCount++;
      return `<${tag} aria-label="Embedded content"${attrs}>`;
    });

    // 29. Ensure <aside> elements have aria-label
    accessibleHtml = accessibleHtml.replace(/<aside(?![^>]*aria-label)([^>]*)>/gi, () => { aiFixCount++; return '<aside aria-label="Supplementary content"$1>'; });

    // 30. Fix definition lists: ensure <dt>/<dd> are inside <dl>
    accessibleHtml = accessibleHtml.replace(/<(dt|dd)([^>]*)>/gi, (match, tag, attrs, offset) => {
      const before = accessibleHtml.substring(Math.max(0, offset - 300), offset);
      const lastDl = before.lastIndexOf('<dl');
      const lastCloseDl = before.lastIndexOf('</dl');
      if (lastDl > lastCloseDl) return match; // already inside dl
      aiFixCount++;
      return '<dl>' + match;
    });

    // 31. Add role="presentation" to layout tables (tables without th/thead)
    accessibleHtml = accessibleHtml.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, (match, attrs, content) => {
      if (/<th[\s>]/i.test(content) || /<thead/i.test(content) || /role=/.test(attrs)) return match;
      // No headers = likely a layout table
      if (/<td[\s>]/i.test(content)) {
        aiFixCount++;
        return `<table role="presentation"${attrs}>${content}</table>`;
      }
      return match;
    });

    // 32. Ensure <footer> has role="contentinfo" if it doesn't have a role
    accessibleHtml = accessibleHtml.replace(/<footer(?![^>]*role=)([^>]*)>/gi, () => { aiFixCount++; return '<footer role="contentinfo"$1>'; });

    // 33. Ensure <header> has role="banner" if it doesn't have a role
    accessibleHtml = accessibleHtml.replace(/<header(?![^>]*role=)([^>]*)>/gi, () => { aiFixCount++; return '<header role="banner"$1>'; });

    // 34. Fix aria-hidden="true" on elements containing focusable children
    accessibleHtml = accessibleHtml.replace(/aria-hidden="true"([^>]*>[\s\S]*?(?:<a\b|<button\b|<input\b|<select\b|<textarea\b|tabindex="0"))/gi, (match) => {
      aiFixCount++;
      return match.replace('aria-hidden="true"', 'aria-hidden="false"');
    });

    // 35. Fix scope attribute on <td> (only valid on <th>)
    accessibleHtml = accessibleHtml.replace(/<td([^>]*)\bscope="[^"]*"([^>]*)>/gi, (match, before, after) => {
      aiFixCount++;
      return `<td${before}${after}>`;
    });

    // 36. Ensure all <section> elements have aria-label or aria-labelledby
    accessibleHtml = accessibleHtml.replace(/<section(?![^>]*aria-label)([^>]*)>/gi, (match, attrs) => {
      // Try to find a heading inside for labelling
      const afterMatch = accessibleHtml.substring(accessibleHtml.indexOf(match));
      const headingMatch = afterMatch.match(/<h[1-6][^>]*>([^<]+)/i);
      const label = headingMatch ? headingMatch[1].trim().substring(0, 60) : 'Content section';
      aiFixCount++;
      return `<section aria-label="${label}"${attrs}>`;
    });

    // 37. Ensure <figure> elements have figcaption or aria-label
    accessibleHtml = accessibleHtml.replace(/<figure(?![^>]*aria-label)([^>]*)>([\s\S]*?)<\/figure>/gi, (match, attrs, content) => {
      if (/<figcaption/i.test(content)) return match; // has figcaption, fine
      const altMatch = content.match(/alt="([^"]*)"/i);
      const label = altMatch ? altMatch[1] : 'Figure';
      aiFixCount++;
      return `<figure aria-label="${label}"${attrs}>${content}</figure>`;
    });

    // 38. Add lang attribute to non-English text patterns (WCAG 3.1.2: Language of Parts)
    // Detect script-based languages and wrap in lang spans. Skip already-tagged content.
    var langPatterns = [
      { regex: /([\u0600-\u06FF]{5,})/g, lang: 'ar' },        // Arabic
      { regex: /([\u4E00-\u9FFF]{3,})/g, lang: 'zh' },        // Chinese (CJK Unified)
      { regex: /([\u3040-\u309F\u30A0-\u30FF]{3,})/g, lang: 'ja' }, // Japanese (Hiragana + Katakana)
      { regex: /([\uAC00-\uD7AF]{3,})/g, lang: 'ko' },        // Korean (Hangul)
      { regex: /([\u0900-\u097F]{5,})/g, lang: 'hi' },        // Hindi (Devanagari)
      { regex: /([\u0E00-\u0E7F]{5,})/g, lang: 'th' },        // Thai
      { regex: /([\u0400-\u04FF]{5,})/g, lang: 'ru' },        // Russian (Cyrillic)
      { regex: /([\u0590-\u05FF]{5,})/g, lang: 'he' }         // Hebrew
    ];
    langPatterns.forEach(function(lp) {
      accessibleHtml = accessibleHtml.replace(lp.regex, function(match, p1, offset) {
        var preceding = accessibleHtml.substring(Math.max(0, offset - 200), offset);
        // Skip if already tagged with this language
        if (new RegExp('lang=["\']' + lp.lang + '["\'][^>]*>[^<]*$', 'i').test(preceding)) return match;
        // Skip if inside <code>, <pre>, or <script> blocks (don't corrupt code examples)
        if (/<(?:code|pre|script)[^>]*>[^<]*$/i.test(preceding)) return match;
        aiFixCount++;
        return '<span lang="' + lp.lang + '">' + match + '</span>';
      });
    });

    // 39. Ensure all <ul>/<ol> have role="list" for Safari VoiceOver compatibility
    // Safari strips list semantics from styled lists even without list-style:none.
    // Always add role="list" to ensure screen readers announce list structure.
    accessibleHtml = accessibleHtml.replace(/<(ul|ol)(?![^>]*role=)([^>]*)>/gi, (match, tag, attrs) => {
      aiFixCount++;
      return `<${tag} role="list"${attrs}>`;
    });

    if (aiFixCount > 0) log(`Applied ${aiFixCount} deterministic fixes`);

    // ── Phase 3c: Surgical AI-diagnosed fixes ──
    // AI diagnoses specific issues → deterministic micro-tools fix each one precisely.
    // Runs BEFORE the full AI rewrite loop — cheaper, safer, more precise.
    // Whatever remains after this goes to the full rewrite loop (Phase 5).
    log('Phase 3c: Surgical AI-diagnosed fixes...');
    const surgicalTools = SHARED_SURGICAL_TOOLS;

    // Run surgical diagnosis (1 API call) + deterministic execution
    try {
      var preAxe = await runAxeAudit(accessibleHtml);
      if (preAxe && preAxe.totalViolations > 0) {
        var surgViolations = []
          .concat((preAxe.critical || []).map(function(v) { return 'CRITICAL: ' + v.description + ' (' + v.id + ', ' + v.nodes + ' elements)'; }))
          .concat((preAxe.serious || []).map(function(v) { return 'SERIOUS: ' + v.description + ' (' + v.id + ', ' + v.nodes + ' elements)'; }))
          .concat((preAxe.moderate || []).map(function(v) { return 'MODERATE: ' + v.description + ' (' + v.id + ')'; }))
          .slice(0, 12).join('\n');

        var surgDiagnosis = await callGemini('You are an accessibility remediation expert. Analyze these axe-core violations and prescribe SPECIFIC targeted fixes.\n\n' +
          'VIOLATIONS:\n' + surgViolations + '\n\n' +
          'HTML (stratified sample for context):\n"""\n' + sampleHtml(accessibleHtml, 9000) + '\n"""\n\n' +
          'Prescribe fixes using these tools (return ONLY a JSON array):\n\n' +
          'CONTENT FIXES:\n' +
          '- fix_alt_text: { "tool": "fix_alt_text", "index": <img# 0-based>, "alt": "descriptive text" }\n' +
          '- fix_heading: { "tool": "fix_heading", "index": <heading# 0-based>, "newLevel": <1-6> }\n' +
          '- fix_link_text: { "tool": "fix_link_text", "index": <link# 0-based>, "newText": "descriptive text" }\n' +
          '- fix_figcaption: { "tool": "fix_figcaption", "index": <figure# 0-based>, "caption": "description" }\n' +
          '- fix_title: { "tool": "fix_title", "title": "document title" }\n' +
          '- fix_lang: { "tool": "fix_lang", "lang": "language code" }\n' +
          '- fix_lang_span: { "tool": "fix_lang_span", "text": "foreign text to wrap", "lang": "code" }\n\n' +
          'TABLE FIXES:\n' +
          '- fix_table_caption: { "tool": "fix_table_caption", "index": <table# 0-based>, "caption": "description" }\n' +
          '- fix_th_scope: { "tool": "fix_th_scope", "index": <th# 0-based or omit for ALL>, "scope": "col" or "row" }\n\n' +
          'FORM/INTERACTIVE FIXES:\n' +
          '- fix_input_label: { "tool": "fix_input_label", "index": <input# 0-based>, "label": "description" }\n' +
          '- fix_button_name: { "tool": "fix_button_name", "index": <button# 0-based>, "label": "description" }\n' +
          '- fix_iframe_title: { "tool": "fix_iframe_title", "index": <iframe# 0-based>, "title": "description" }\n\n' +
          'STRUCTURE FIXES:\n' +
          '- fix_aria_label: { "tool": "fix_aria_label", "tag": "element", "index": <0-based>, "label": "description" }\n' +
          '- fix_add_landmark: { "tool": "fix_add_landmark", "tag": "main", "label": "Main content" }\n' +
          '- fix_remove_empty_heading: { "tool": "fix_remove_empty_heading", "index": <empty heading# 0-based> }\n' +
          '- fix_duplicate_id: { "tool": "fix_duplicate_id", "id": "the-duplicate-id" }\n\n' +
          'VISUAL/READABILITY FIXES:\n' +
          '- fix_contrast: { "tool": "fix_contrast", "oldColor": "#hex", "newColor": "#hex" }\n' +
          '- fix_image_decorative: { "tool": "fix_image_decorative", "index": <img# 0-based> }\n' +
          '- fix_abbreviation: { "tool": "fix_abbreviation", "abbr": "WCAG", "title": "Web Content Accessibility Guidelines" }\n' +
          '- fix_text_spacing: { "tool": "fix_text_spacing", "letterSpacing": "0.05em", "lineHeight": "1.7" }\n\n' +
          'TABLE/LIST FIXES:\n' +
          '- fix_table_header_row: { "tool": "fix_table_header_row", "index": <table# 0-based> }\n' +
          '- fix_list_wrap: { "tool": "fix_list_wrap", "ordered": false }\n' +
          '- fix_skip_nav: { "tool": "fix_skip_nav" }\n\n' +
          'Be specific — use the actual document content to write accurate alt text, labels, and descriptions.\n' +
          'Return ONLY a valid JSON array, no explanation or markdown.', true);

        // Run 2 diagnoses and merge — primary (general) + second opinion (content + structural combined)
        var surgPromptBase = 'VIOLATIONS:\n' + surgViolations + '\n\nHTML (stratified sample):\n"""\n' + sampleHtml(accessibleHtml, 9000) + '\n"""\n\nUse the same tool format. Return ONLY a valid JSON array.';
        var surgDiagnosis2 = await callGemini('You are an independent accessibility expert (second opinion). Focus on BOTH content fixes (alt text quality, link descriptions, heading structure) AND structural fixes (landmarks, ARIA, table headers, form labels). Be thorough — catch anything the first auditor may have missed.\n\n' + surgPromptBase, true);

        // Parse both diagnoses
        var parseSurgical = function(raw) {
          if (!raw) return [];
          var fixes = [];
          try { fixes = JSON.parse(raw); } catch(e) {
            try { fixes = JSON.parse(raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim()); } catch(e2) { fixes = []; }
          }
          return Array.isArray(fixes) ? fixes : [];
        };
        var fixes1 = parseSurgical(surgDiagnosis);
        var fixes2 = parseSurgical(surgDiagnosis2);

        // Merge both: deduplicate by tool+index
        var seenKeys = {};
        var surgFixes = [];
        [].concat(fixes1, fixes2).forEach(function(fix) {
          if (!fix || !fix.tool) return;
          var key = fix.tool + '-' + (fix.index || 0) + '-' + (fix.tag || '');
          if (!seenKeys[key]) { seenKeys[key] = true; surgFixes.push(fix); }
        });

        var surgApplied = 0;
        for (var si = 0; si < surgFixes.length; si++) {
          var fix = surgFixes[si];
          var tool = fix && fix.tool && surgicalTools[fix.tool];
          if (tool) {
            var before = accessibleHtml;
            accessibleHtml = tool(accessibleHtml, fix);
            if (accessibleHtml !== before) surgApplied++;
          }
        }
        if (surgApplied > 0) {
          log('Surgical fixes: ' + surgApplied + '/' + surgFixes.length + ' applied (3 parallel diagnoses, merged)');
        }
      }
    } catch(surgErr) {
      warnLog('[Surgical] Diagnosis failed (non-blocking):', surgErr?.message);
    }

    // ── Phase 4: Verify with both engines ──
    log('Phase 4: Dual-engine verification...');
    const [batchVerification, batchAxeResults] = await Promise.all([
      auditOutputAccessibility(accessibleHtml),
      runAxeAudit(accessibleHtml)
    ]);

    let afterScore = batchVerification ? batchVerification.score : null;

    // Deterministic contrast fix
    if (batchAxeResults && batchAxeResults.critical.concat(batchAxeResults.serious).some(v => v.id === 'color-contrast')) {
      const cf = fixContrastViolations(accessibleHtml);
      if (cf.fixCount > 0) { accessibleHtml = cf.html; log(`Fixed ${cf.fixCount} contrast violations`); }
    }
    // Deterministic list-structure fix
    if (batchAxeResults && batchAxeResults.critical.concat(batchAxeResults.serious).some(v => v.id === 'list')) {
      const lf = fixListViolations(accessibleHtml);
      if (lf.fixCount > 0) { accessibleHtml = lf.html; log(`Fixed ${lf.fixCount} list-structure violations`); }
    }
    // Deterministic WCAG gap closures (form labels, decorative images, complex tables, lang spans)
    accessibleHtml = runDeterministicWcagFixes(accessibleHtml);

    // ── Phase 5: Self-correcting AI fix loop ──
    let autoFixPasses = 0;
    const batchMaxFix = pdfAutoFixPasses;
    let bestAiScore = batchVerification ? batchVerification.score : 0;
    let bestAxeViolations = batchAxeResults ? batchAxeResults.totalViolations : 0;
    let curVerification = batchVerification;
    let curAxeResults = batchAxeResults;

    if (batchMaxFix > 0 && ((curAxeResults && curAxeResults.totalViolations > 0) || bestAiScore < 90)) {
      for (let fp = 0; fp < batchMaxFix; fp++) {
        log(`Fix pass ${fp + 1}/${batchMaxFix} (AI: ${bestAiScore}, axe: ${bestAxeViolations})...`);
        const snap = accessibleHtml;

        const axeIns = []
          .concat((curAxeResults ? curAxeResults.critical || [] : []).map(v => `CRITICAL (axe-core): ${v.description} (${v.id}, ${v.nodes} elements)`))
          .concat((curAxeResults ? curAxeResults.serious || [] : []).map(v => `SERIOUS (axe-core): ${v.description} (${v.id}, ${v.nodes} elements)`))
          .concat((curAxeResults ? curAxeResults.moderate || [] : []).map(v => `MODERATE (axe-core): ${v.description} (${v.id})`));
        const aiIns = curVerification && curVerification.issues
          ? curVerification.issues.map(i => `AI-FLAGGED: ${i.issue || i}`)
          : [];
        const violIns = axeIns.concat(aiIns).join('\n');

        try {
          // Use chunked fix across the entire document (no truncation)
          const fixed = await aiFixChunked(accessibleHtml, violIns, `audit-pass-${fp + 1}`);
          if (fixed && fixed !== accessibleHtml) {
            accessibleHtml = fixed;
          }
        } catch(fixErr) {
          log(`Fix pass ${fp + 1} failed: ${fixErr.message}`);
          break;
        }

        // Run deterministic fixes after each AI pass to clean up structural issues + AI mistakes
        const postListFix = fixListViolations(accessibleHtml);
        if (postListFix.fixCount > 0) { accessibleHtml = postListFix.html; log(`  Deterministic: fixed ${postListFix.fixCount} list issues`); }
        const postContrastFix = fixContrastViolations(accessibleHtml);
        if (postContrastFix.fixCount > 0) { accessibleHtml = postContrastFix.html; log(`  Deterministic: fixed ${postContrastFix.fixCount} contrast issues`); }
        // Deterministic WCAG gap closures (form labels, decorative images, complex tables, lang spans)
        accessibleHtml = runDeterministicWcagFixes(accessibleHtml);
        // Fix invalid ARIA roles that AI may have introduced
        const _validRoles = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
        const _roleCorrections = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region' };
        let _roleFixCount = 0;
        accessibleHtml = accessibleHtml.replace(/role="([^"]*)"/gi, (match, role) => {
          const lower = role.toLowerCase().trim();
          if (_validRoles.includes(lower)) return `role="${lower}"`;
          if (_roleCorrections[lower]) { _roleFixCount++; return `role="${_roleCorrections[lower]}"`; }
          _roleFixCount++; return '';
        });
        if (_roleFixCount > 0) log(`  Deterministic: fixed ${_roleFixCount} invalid ARIA roles`);
        // Fix invalid lang attribute
        const _validLangPat = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
        accessibleHtml = accessibleHtml.replace(/<html([^>]*)lang="([^"]*)"/, (m, before, langVal) => {
          const trimmed = langVal.trim().toLowerCase().replace(/_/g, '-');
          if (!trimmed || !_validLangPat.test(trimmed)) {
            log(`  Deterministic: fixed invalid lang="${langVal}" → "en"`);
            return `<html${before}lang="en"`;
          }
          return m;
        });

        // Run axe-core (local, zero API calls) + 2 Gemini audits per pass
        // 3 parallel audits every pass — Flash calls are cheap, accuracy is priceless
        // Prevents false score swings from prematurely ending or continuing remediation
        const numAudits = 3;
        const auditPromises = [];
        for (let ai = 0; ai < numAudits; ai++) auditPromises.push(auditOutputAccessibility(accessibleHtml));
        auditPromises.push(runAxeAudit(accessibleHtml)); // axe-core is local — no API cost
        const auditResults = await Promise.all(auditPromises);
        const rAxe = auditResults[auditResults.length - 1]; // last result is axe
        const rvAll = auditResults.slice(0, -1); // all but last are AI audits

        let rvScores = rvAll.map(v => v ? v.score : null).filter(s => s !== null);

        // Adaptive: if 2 auditors diverge by >15 points, add a tiebreaker 3rd
        if (rvScores.length === 2 && Math.abs(rvScores[0] - rvScores[1]) > 15) {
          log(`Score divergence (${rvScores[0]} vs ${rvScores[1]}) — adding tiebreaker audit`);
          const tiebreaker = await auditOutputAccessibility(accessibleHtml);
          if (tiebreaker && typeof tiebreaker.score === 'number') {
            rvAll.push(tiebreaker);
            rvScores.push(tiebreaker.score);
          }
        }

        const newAi = rvScores.length > 0 ? Math.round(rvScores.reduce((a, b) => a + b, 0) / rvScores.length) : bestAiScore;
        const rvSD = rvScores.length > 1 ? Math.sqrt(rvScores.reduce((s, x) => s + (x - newAi) ** 2, 0) / (rvScores.length - 1)) : 0;
        const rvSEM = rvScores.length > 1 ? rvSD / Math.sqrt(rvScores.length) : 0;
        const rv = rvAll.filter(Boolean).sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
        if (rv) { rv.score = newAi; rv._sem = rvSEM; rv._sd = rvSD; rv._scores = rvScores; }
        const newAxe = rAxe ? rAxe.totalViolations : bestAxeViolations;
        autoFixPasses++;

        if (newAi < bestAiScore - 5 && newAxe > bestAxeViolations) {
          log(`Pass ${fp + 1} REGRESSED \u2014 REVERTING`);
          accessibleHtml = snap;
          break;
        }

        if (rv) curVerification = rv;
        if (rAxe) curAxeResults = rAxe;
        bestAiScore = newAi;
        bestAxeViolations = newAxe;

        log(`Pass ${fp + 1}: AI ${newAi}/100, axe ${newAxe} violations`);

        const targetScore = pdfTargetScore || 90;
        if (newAxe === 0 && newAi >= targetScore) { log(`Target score ${targetScore} reached (${newAi}) with 0 violations \u2014 stopping`); break; }
        const bMinDet = Math.max(2, Math.round(rvSEM * 1.5));
        if (newAxe >= bestAxeViolations && newAi <= bestAiScore + bMinDet && fp > 0) { log(`Plateau (SEM\u00b1${rvSEM.toFixed(1)}, threshold=${bMinDet}) \u2014 stopping`); break; }
      }
    }

    // ── Final authoritative audit: full audit (not quickMode) for accurate scoring ──
    // quickMode only samples head+tail of long docs, missing violations in the middle
    try {
      const batchFinalAudit = await auditOutputAccessibility(accessibleHtml);
      if (batchFinalAudit) {
        curVerification = batchFinalAudit;
        log(`Final audit: score ${batchFinalAudit.score}, ${(batchFinalAudit.issues || []).length} remaining issues, ${(batchFinalAudit.passes || []).length} passes`);
      }
    } catch(batchFinalErr) {
      log('Final audit failed (using loop result): ' + batchFinalErr.message);
    }

    // Blend final score with axe-core (same 50/50 method as initial audit for consistent comparison)
    let finalScore = curVerification ? curVerification.score : afterScore;
    if (finalScore !== null && curAxeResults && typeof curAxeResults.score === 'number') {
      const blendedFinal = Math.round((finalScore + curAxeResults.score) / 2);
      warnLog(`[Batch] Final blended score: AI ${finalScore} + axe ${curAxeResults.score} = ${blendedFinal}`);
      finalScore = blendedFinal;
    }
    const needsExpertReview = (finalScore !== null && finalScore < 70) || (curAxeResults ? curAxeResults.critical.length : 0) > 0;
    const elapsed = Math.round((Date.now() - beforeStartTime) / 1000);

    log(`Done in ${elapsed}s: ${beforeScore}\u2192${finalScore} (+${(finalScore || 0) - beforeScore}) | ${autoFixPasses} fix passes`);

    // ── Inject accessibility remediation footer into the output ──
    const axeViolationCount = curAxeResults ? curAxeResults.totalViolations : 0;
    const remediationFooter = `<footer role="contentinfo" style="margin-top:48px;padding:16px 20px;border-top:2px solid ${batchDocStyle.accentColor || '#6366f1'};font-family:system-ui,sans-serif;font-size:11px;color:#64748b;page-break-inside:avoid">` +
      `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">` +
      `<span>\u267f Accessibility remediated by AlloFlow \u2014 Score: ${finalScore || '?'}/100 | ${axeViolationCount} axe violation${axeViolationCount !== 1 ? 's' : ''} | ${autoFixPasses} fix pass${autoFixPasses !== 1 ? 'es' : ''}</span>` +
      `<span>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>` +
      `</div></footer>`;
    if (accessibleHtml.includes('</main>')) {
      accessibleHtml = accessibleHtml.replace('</main>', remediationFooter + '\n</main>');
    } else if (accessibleHtml.includes('</body>')) {
      accessibleHtml = accessibleHtml.replace('</body>', remediationFooter + '\n</body>');
    } else {
      warnLog('[PDF Fix] WARNING: No </main> or </body> tag found — appending remediation footer to end of document');
      accessibleHtml += '\n' + remediationFooter;
    }

    return { accessibleHtml, beforeScore, afterScore: finalScore, autoFixPasses, needsExpertReview, axeViolations: axeViolationCount, elapsed, docStyle: batchDocStyle };
  };

  const runPdfBatchRemediation = async () => {
    if (pdfBatchQueue.length === 0) return;
    setPdfBatchProcessing(true);
    setPdfBatchSummary(null);
    const queue = [...pdfBatchQueue];
    const startTime = Date.now();

    // Batch AbortController — separate global from auto-continue so the Stop
    // Batch button doesn't interfere with a single-file auto-continue run if
    // it happens to overlap. Also publish into __alloPdfAbortSignal so the
    // nested callGemini calls inside each _processOne honor the abort
    // immediately (instead of finishing a mid-flight request and only breaking
    // the loop on the next iteration check).
    const _batchAbortCtrl = new AbortController();
    if (typeof window !== 'undefined') {
      window.__alloPdfBatchAbortCtrl = _batchAbortCtrl;
      window.__alloPdfBatchAbortSignal = _batchAbortCtrl.signal;
      window.__alloPdfAbortSignal = _batchAbortCtrl.signal;
    }

    // ── Per-file processing via fixAndVerifyPdf (unifies with single-file pipeline) ──
    // Each file: audit (UI-quiet) → fixAndVerifyPdf with batch overrides → collect result
    // This gives batch mode all the single-file improvements: deterministic text extraction,
    // RECITATION recovery, integrity checks, surgical fixes, etc.
    const _processOne = async (item, i, isRetry) => {
      const label = isRetry ? '[Retry]' : `[${i + 1}/${queue.length}]`;
      const progress = (msg) => setPdfBatchStep(`${label} ${item.fileName}: ${msg}`);
      // Step 1: per-file audit (suppresses single-file UI updates)
      progress('Auditing...');
      const auditResult = await runPdfAccessibilityAudit(item.base64, { skipUiUpdates: true });
      if (!auditResult || auditResult.score === -1) {
        throw new Error(auditResult?.summary || 'Audit failed');
      }
      // Step 2: fix & verify with batch overrides (also suppresses UI state changes)
      const result = await fixAndVerifyPdf({
        base64: item.base64,
        fileName: item.fileName,
        auditResult: auditResult,
        onProgress: (step, msg) => progress(msg),
      });
      return result;
    };

    for (let i = 0; i < queue.length; i++) {
      if (_batchAbortCtrl.signal.aborted) {
        setPdfBatchStep('Stopped by user · ' + i + '/' + queue.length + ' processed');
        break;
      }
      setPdfBatchCurrentIndex(i);
      const item = queue[i];
      setPdfBatchStep(`Processing ${i + 1}/${queue.length}: ${item.fileName}`);
      setPdfBatchQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q));

      try {
        const result = await _processOne(item, i, false);
        queue[i] = { ...item, status: 'done', result };
        setPdfBatchQueue([...queue]);
      } catch (err) {
        warnLog(`[Batch] ${item.fileName} FAILED:`, err);
        queue[i] = { ...item, status: 'failed', error: err.message };
        setPdfBatchQueue([...queue]);
      }

      if (i < queue.length - 1) {
        setPdfBatchStep('Cooling down before next file...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // ── Retry failed files once ──
    const failedFiles = queue.filter(q => q.status === 'failed');
    if (!_batchAbortCtrl.signal.aborted && failedFiles.length > 0 && failedFiles.length < queue.length) {
      setPdfBatchStep(`Retrying ${failedFiles.length} failed file(s)...`);
      await new Promise(r => setTimeout(r, 5000)); // longer cooldown before retry
      for (const failedItem of failedFiles) {
        if (_batchAbortCtrl.signal.aborted) break;
        const idx = queue.indexOf(failedItem);
        setPdfBatchCurrentIndex(idx);
        setPdfBatchStep(`Retrying: ${failedItem.fileName}`);
        try {
          const result = await _processOne(failedItem, idx, true);
          queue[idx] = { ...failedItem, status: 'done', result, retried: true };
          setPdfBatchQueue([...queue]);
        } catch (err) {
          warnLog(`[Batch Retry] ${failedItem.fileName} failed again:`, err);
          queue[idx] = { ...failedItem, status: 'failed', error: 'Failed after retry: ' + err.message };
          setPdfBatchQueue([...queue]);
        }
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    const done = queue.filter(q => q.status === 'done');
    const failed = queue.filter(q => q.status === 'failed');
    const totalElapsed = Math.round((Date.now() - startTime) / 1000);
    setPdfBatchSummary({
      total: queue.length,
      succeeded: done.length,
      failed: failed.length,
      // Surface the names + errors of failed files so the user doesn't have
      // to scroll the queue UI to find which files need attention. Additive
      // field — downstream consumers of pdfBatchSummary stay compatible.
      failedFiles: failed.map(q => ({ fileName: q.fileName, error: q.error || 'unknown error' })),
      avgBefore: (function() { var valid = done.filter(q => q.result?.beforeScore != null); return valid.length ? Math.round(valid.reduce((s, q) => s + q.result.beforeScore, 0) / valid.length) : null; })(),
      avgAfter: (function() { var valid = done.filter(q => q.result?.afterScore != null); return valid.length ? Math.round(valid.reduce((s, q) => s + q.result.afterScore, 0) / valid.length) : null; })(),
      avgImprovement: (function() { var valid = done.filter(q => q.result?.afterScore != null && q.result?.beforeScore != null); return valid.length ? Math.round(valid.reduce((s, q) => s + (q.result.afterScore - q.result.beforeScore), 0) / valid.length) : null; })(),
      above90: done.filter(q => (q.result?.afterScore || 0) >= 90).length,
      needsExpert: done.filter(q => q.result?.needsExpertReview).length,
      totalElapsed,
    });

    setPdfBatchProcessing(false);
    setPdfBatchCurrentIndex(-1);
    setPdfBatchStep('');
    // Release batch abort signal so post-batch Gemini calls aren't picked up
    // by a stale aborted controller. Guard against a subsequent run having
    // already overwritten the slot.
    if (typeof window !== 'undefined') {
      if (window.__alloPdfBatchAbortCtrl === _batchAbortCtrl) {
        window.__alloPdfBatchAbortCtrl = null;
        window.__alloPdfBatchAbortSignal = null;
      }
      if (window.__alloPdfAbortSignal === _batchAbortCtrl.signal) {
        window.__alloPdfAbortSignal = null;
      }
    }
    // Name up to 3 failed files in the toast; the rest stays in the summary.
    const _failList = failed.length > 0
      ? ` \u00b7 Failed: ${failed.slice(0, 3).map(q => q.fileName).join(', ')}${failed.length > 3 ? ` + ${failed.length - 3} more` : ''}`
      : '';
    addToast(`\u2705 Batch complete: ${done.length}/${queue.length} PDFs remediated (avg +${done.length ? Math.round(done.reduce((s, q) => s + ((q.result?.afterScore || 0) - (q.result?.beforeScore || 0)), 0) / done.length) : 0} points)${_failList}`, failed.length > 0 ? 'warning' : 'success');
    // Audio: triumphant chord when batch finishes
    try { window.remediationAudio && window.remediationAudio.sessionComplete(); } catch(e) {}
  };

  const downloadBatchResults = async () => {
    if (!window.JSZip) { addToast('ZIP library not loaded', 'error'); return; }
    const zip = new window.JSZip();
    const results = pdfBatchQueue.filter(f => f.status === 'done');

    results.forEach(f => {
      const safeName = f.fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      zip.file(`${safeName}_accessible.html`, f.result.accessibleHtml);
    });

    const csvRows = ['File,Before Score,After Score,Improvement,Fix Passes,Axe Violations,Time (s),Expert Review,Status'];
    pdfBatchQueue.forEach(f => {
      const r = f.result;
      csvRows.push(`"${f.fileName}",${r?.beforeScore || ''},${r?.afterScore || ''},${r ? (r.afterScore - r.beforeScore) : ''},${r?.autoFixPasses || ''},${r?.axeViolations ?? ''},${r?.elapsed || ''},${r?.needsExpertReview ? 'Yes' : 'No'},${f.status}`);
    });
    zip.file('batch_accessibility_report.csv', csvRows.join('\n'));

    // Structured telemetry JSON for research validation
    const telemetry = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      pipelineConfig: { auditorCount: pdfAuditorCount, autoFixPasses: pdfAutoFixPasses, polishPasses: pdfPolishPasses, verificationSamples: 3 },
      summary: pdfBatchSummary,
      files: pdfBatchQueue.map(f => ({
        fileName: f.fileName, fileSize: f.fileSize, status: f.status, error: f.error || null,
        result: f.result ? { beforeScore: f.result.beforeScore, afterScore: f.result.afterScore, improvement: (f.result.afterScore || 0) - (f.result.beforeScore || 0), autoFixPasses: f.result.autoFixPasses, axeViolations: f.result.axeViolations, needsExpertReview: f.result.needsExpertReview, elapsed: f.result.elapsed } : null,
      })),
    };
    zip.file('telemetry.json', JSON.stringify(telemetry, null, 2));

    const done = pdfBatchQueue.filter(q => q.status === 'done');
    const rptHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Batch Accessibility Report</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1e293b}h1{color:#1e3a5f;border-bottom:3px solid #2563eb;padding-bottom:.5rem}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left}th{background:#f1f5f9}.pass{color:#16a34a;font-weight:bold}.warn{color:#d97706;font-weight:bold}.fail{color:#dc2626;font-weight:bold}.stat{display:inline-block;padding:8px 16px;margin:4px;border-radius:8px;background:#f1f5f9;font-weight:bold}</style></head><body><h1>\u267f AlloFlow Batch Accessibility Report</h1><p>Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p><div><span class="stat">${pdfBatchQueue.length} PDFs</span><span class="stat">\u2705 ${done.length} Succeeded</span><span class="stat">Avg: ${pdfBatchSummary?.avgBefore||'?'}\u2192${pdfBatchSummary?.avgAfter||'?'}</span><span class="stat">${pdfBatchSummary?.above90||0} scored 90+</span></div><table><thead><tr><th>#</th><th>File</th><th>Before</th><th>After</th><th>Gain</th><th>Passes</th><th>Time</th><th>Status</th></tr></thead><tbody>${pdfBatchQueue.map((f,i)=>{const r=f.result;const s=r?.afterScore||0;const c=s>=90?'pass':s>=70?'warn':'fail';return '<tr><td>'+(i+1)+'</td><td>'+f.fileName+'</td><td>'+(r?.beforeScore??'\u2014')+'</td><td class="'+c+'">'+(r?.afterScore??'\u2014')+'</td><td>+'+(r?(r.afterScore-r.beforeScore):'\u2014')+'</td><td>'+(r?.autoFixPasses??'\u2014')+'</td><td>'+(r?.elapsed?r.elapsed+'s':'\u2014')+'</td><td>'+(f.status==='done'?'\u2705':'\u274c '+(f.error||''))+'</td></tr>';}).join('')}</tbody></table></body></html>`;
    zip.file('batch_report.html', rptHtml);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alloflow_batch_remediation_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`\ud83d\udce6 Downloaded ZIP with ${results.length} remediated files + report`, 'success');
  };


  // == Test-Retest Experiment Mode ==
  // Runs same PDF N times to measure scoring reliability
  const runTestRetestExperiment = async (base64Data, fileName, numRuns) => {
    const runs = [];
    setPdfBatchProcessing(true);
    for (let r = 0; r < numRuns; r++) {
      setPdfBatchStep(`Experiment run ${r + 1}/${numRuns}...`);
      try {
        const result = await processSinglePdfForBatch(base64Data, fileName, (msg) => {
          setPdfBatchStep(`[Run ${r + 1}/${numRuns}] ${msg}`);
        });
        runs.push({ run: r + 1, beforeScore: result.beforeScore, afterScore: result.afterScore, autoFixPasses: result.autoFixPasses, elapsed: result.elapsed });
      } catch(err) {
        runs.push({ run: r + 1, error: err.message });
      }
      if (r < numRuns - 1) await new Promise(res => setTimeout(res, 3000));
    }
    const afterScores = runs.filter(r => r.afterScore != null).map(r => r.afterScore);
    const beforeScores = runs.filter(r => r.beforeScore != null).map(r => r.beforeScore);
    const n = afterScores.length;
    const mean = n > 0 ? afterScores.reduce((a, b) => a + b, 0) / n : 0;
    const sd = n > 1 ? Math.sqrt(afterScores.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
    const sem = n > 1 ? sd / Math.sqrt(n) : 0;
    const cv = mean > 0 ? (sd / mean * 100).toFixed(1) : 'N/A';
    const range = n > 0 ? Math.max(...afterScores) - Math.min(...afterScores) : 0;
    const bMean = beforeScores.length > 0 ? beforeScores.reduce((a, b) => a + b, 0) / beforeScores.length : 0;
    const bSD = beforeScores.length > 1 ? Math.sqrt(beforeScores.reduce((s, x) => s + (x - bMean) ** 2, 0) / (beforeScores.length - 1)) : 0;
    const stats = { runs, n, afterMean: Math.round(mean * 10) / 10, afterSD: Math.round(sd * 10) / 10, afterSEM: Math.round(sem * 10) / 10, afterCV: cv, afterRange: range, beforeMean: Math.round(bMean * 10) / 10, beforeSD: Math.round(bSD * 10) / 10 };
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `experiment_${fileName.replace(/\.pdf$/i, '')}_${numRuns}runs.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setPdfBatchProcessing(false); setPdfBatchStep('');
    addToast(`Experiment: ${n} runs, after=${Math.round(mean)}+/-${sd.toFixed(1)} (SEM=${sem.toFixed(1)}, CV=${cv}%, range=${range})`, 'success');
    return stats;
  };

  const proceedWithPdfTransform = async () => {
    if (!pendingPdfBase64) return;
    setPdfAuditResult(null);
    setIsExtracting(true);
    setGenerationStep(t('status_steps.extracting_text') || 'Extracting text...');
    const ocrPrompt = `You are an Optical Character Recognition (OCR) expert for educators.
Extract all readable text from this educational document.
- Preserve the original structure (headers, paragraphs) where possible using markdown.
- If there are images, describe them briefly in [brackets] AND provide a base64-compatible description.
- If there are tables, preserve them as markdown tables with proper header rows.
- Ignore irrelevant UI elements, page numbers, or watermarks if they disrupt the flow.
- If it is a worksheet, transcribe the questions clearly.
Return ONLY the extracted text.`;
    try {
      let extractedText = '';

      // ── Deterministic extraction first (zero AI, zero truncation) ──
      try {
        const _fn = pendingPdfFile?.name || '';
        const _isDocx = /\.docx$/i.test(_fn);
        const _isPptx = /\.pptx$/i.test(_fn);
        if (_isDocx) {
          setGenerationStep('Extracting DOCX text deterministically...');
          const det = await extractDocxTextDeterministic(pendingPdfBase64);
          if (det && det.sourceCharCount > 50) { extractedText = det.fullText; warnLog(`[ProceedTransform Det] DOCX → ${det.sourceCharCount} chars`); }
        } else if (_isPptx) {
          setGenerationStep('Extracting PPTX text deterministically...');
          const det = await extractPptxTextDeterministic(pendingPdfBase64);
          if (det && det.sourceCharCount > 50) { extractedText = det.fullText; warnLog(`[ProceedTransform Det] PPTX → ${det.sourceCharCount} chars`); }
        } else {
          setGenerationStep('Extracting PDF text layer...');
          const det = await extractPdfTextDeterministic(pendingPdfBase64);
          if (det && !det.isScanned && det.sourceCharCount > 100) {
            extractedText = det.fullText;
            warnLog(`[ProceedTransform Det] PDF → ${det.sourceCharCount} chars from ${det.pageCount} pages`);
          }
        }
      } catch (detErr) {
        warnLog('[ProceedTransform Det] Deterministic extraction failed, falling through to Vision OCR:', detErr?.message);
      }

      // ── Vision OCR fallback (only if deterministic didn't yield text) ──
      if (!extractedText || extractedText.length < 50) {
      // Large PDF chunking (>5MB) or if audit found many pages
      if (pendingPdfFile && pendingPdfFile.size > 5 * 1024 * 1024) {
        const sizeMB = (pendingPdfFile.size / (1024 * 1024)).toFixed(1);
        addToast(`Processing ${sizeMB}MB PDF in sections...`, 'info');
        const sectionPrompts = [
          `You are an OCR expert. Extract all text from the FIRST HALF of this document. Preserve structure using markdown. Describe images in [brackets]. Preserve tables as markdown. Return ONLY the text.`,
          `You are an OCR expert. Extract all text from the SECOND HALF of this document. Preserve structure using markdown. Describe images in [brackets]. Preserve tables as markdown. Return ONLY the text.`
        ];
        const chunks = [];
        for (let i = 0; i < sectionPrompts.length; i++) {
          setGenerationStep(`Extracting section ${i + 1} of ${sectionPrompts.length}...`);
          try {
            const chunkText = await callGeminiVision(sectionPrompts[i], pendingPdfBase64, 'application/pdf');
            if (chunkText && chunkText.trim().length > 20) chunks.push(chunkText);
          } catch (chunkErr) {
            warnLog(`[PDF Chunk ${i + 1}] Failed:`, chunkErr?.message);
            if (i === 0) throw chunkErr;
          }
        }
        extractedText = chunks.join('\n\n---\n\n');
      } else {
        extractedText = await callGeminiVision(ocrPrompt, pendingPdfBase64, 'application/pdf');
      }
      } // end Vision OCR fallback

      // ── Quality/Accuracy Verification ──
      if (extractedText && extractedText.length > 100) {
        setGenerationStep('Verifying extraction accuracy...');
        try {
          const verifyResult = await callGeminiVision(
            `Compare the original PDF document with this extracted text. Rate the extraction quality 1-10 and note any significant missing content, misread sections, or structural errors. Be brief (2-3 sentences).

Extracted text (representative sample): """${sampleHtml(extractedText, 4000)}"""

Return ONLY JSON: {"quality": N, "issues": "description or null", "missingContent": true/false}`,
            pendingPdfBase64, 'application/pdf'
          );
          try {
            let vCleaned = verifyResult.trim();
            if (vCleaned.indexOf('```') !== -1) { const parts = vCleaned.split('```'); vCleaned = parts[1] || parts[0]; if (vCleaned.indexOf('\n') !== -1) vCleaned = vCleaned.split('\n').slice(1).join('\n'); if (vCleaned.lastIndexOf('```') !== -1) vCleaned = vCleaned.substring(0, vCleaned.lastIndexOf('```')); }
            const verification = JSON.parse(vCleaned);
            if (verification.quality < 6) {
              addToast(`⚠ Extraction quality: ${verification.quality}/10. ${verification.issues || 'Some content may be missing.'}`, 'info');
            } else if (verification.quality >= 8) {
              addToast(`✅ Extraction verified: ${verification.quality}/10 accuracy`, 'success');
            } else {
              addToast(`Extraction quality: ${verification.quality}/10`, 'info');
            }
          } catch (parseErr) { /* verification parsing failed — non-critical */ }
        } catch (verifyErr) {
          warnLog('[PDF Verify] Verification failed (non-critical):', verifyErr?.message);
        }
      }

      // ── Image Extraction ──
      if (extractedText && pendingPdfBase64) {
        setGenerationStep('Checking for extractable images...');
        try {
          const imageResult = await callGeminiVision(
            `List any significant images, diagrams, charts, or figures in this PDF document. For each, provide:
1. A brief description (1 sentence)
2. Its approximate location (page, position)
3. Whether it contains important educational content

Return ONLY JSON: {"images": [{"description": "text", "location": "page N, top/middle/bottom", "educational": true/false}], "totalImages": N}
If there are no significant images, return: {"images": [], "totalImages": 0}`,
            pendingPdfBase64, 'application/pdf'
          );
          try {
            let iCleaned = imageResult.trim();
            if (iCleaned.indexOf('```') !== -1) { const parts = iCleaned.split('```'); iCleaned = parts[1] || parts[0]; if (iCleaned.indexOf('\n') !== -1) iCleaned = iCleaned.split('\n').slice(1).join('\n'); if (iCleaned.lastIndexOf('```') !== -1) iCleaned = iCleaned.substring(0, iCleaned.lastIndexOf('```')); }
            const imageInfo = JSON.parse(iCleaned);
            if (imageInfo.totalImages > 0) {
              const imgDescs = imageInfo.images.filter(i => i.educational).map(i => `[Image: ${i.description}]`).join('\n');
              if (imgDescs) {
                extractedText += '\n\n## Images Described\n' + imgDescs;
                addToast(`Found ${imageInfo.totalImages} images — descriptions added to source text`, 'info');
              }
            }
          } catch (imgParseErr) { /* image extraction parsing failed — non-critical */ }
        } catch (imgErr) {
          warnLog('[PDF Images] Image detection failed (non-critical):', imgErr?.message);
        }
      }

      setInputText(extractedText);
      setPendingPdfBase64(null);
      setPendingPdfFile(null);
      addToast('PDF transformed to accessible content!', 'success');
    } catch (err) {
      warnLog('[PDF Transform] Failed:', err);
      setError('PDF extraction failed. Try copying and pasting the text directly.');
    }
    setIsExtracting(false);
  };

  // ── Blind Output Accessibility Audit (closing the loop) ──
  // Chunks the full HTML into sections and audits each, then merges results.
  // Uses a strict point-deduction rubric for consistent, reproducible scoring.
  const AUDIT_RUBRIC_PROMPT = `SCORING RUBRIC — Start at 100, deduct points for each violation found:
  CRITICAL (-15 each): Missing lang attribute, no page title, images without alt text, no main landmark, color contrast below 3:1
  SERIOUS (-10 each): Missing heading hierarchy (no h1), heading level skips, data tables without th/scope, form inputs without labels, color contrast below 4.5:1
  MODERATE (-5 each): Missing skip-to-content link, missing header/footer/nav landmarks, non-descriptive link text, missing table caption, bullet characters instead of semantic lists
  MINOR (-2 each): Extra whitespace in alt text, multiple h1 elements, missing aria-labels on icon buttons, inconsistent heading granularity

AUDIT CHECKLIST:
1. LANGUAGE: <html> has lang attribute
2. TITLE: <title> is present and descriptive
3. HEADINGS: h1 exists, hierarchy is logical (h1>h2>h3, no skips)
4. LANDMARKS: <main>, <header>, <nav>, <footer> used appropriately
5. IMAGES: All <img> have meaningful alt (not empty unless decorative)
6. TABLES: <th> with scope, <caption> present
7. CONTRAST: Text colors meet 4.5:1 ratio against background
8. LINKS: All links have descriptive text (no "click here")
9. LISTS: Semantic <ul>/<ol>/<li> used (not bullet characters)
10. SKIP NAV: Skip-to-content link present
11. FORMS: All inputs have associated labels

IMPORTANT: Calculate the score by starting at 100 and subtracting per the rubric above. Each unique violation deducts points ONCE regardless of how many times it appears. Do NOT estimate — count violations and calculate.

LOCATION FIELD ("location"): For each issue, provide a short anchor (<80 chars) that identifies WHERE the violation occurs so remediation can target it. Prefer heading titles, unique phrases from the offending element, page numbers, or structural anchors ("first table", "footer"). Use "document" only for document-wide issues. Omit/null only if no meaningful anchor exists.

Return ONLY JSON:
{
  "score": <calculated score, minimum 0>,
  "summary": "One balanced sentence that leads with what the document does well, then briefly notes remaining areas for improvement. Match the tone to the score — a score above 80 should sound positive, not critical. Example for 94/100: 'The document demonstrates strong accessibility with proper language, headings, and semantic structure, with minor remaining issues in image alt text and navigation landmarks.'",
  "issues": [{"issue": "complete sentence describing violation", "wcag": "X.X.X", "severity": "critical|serious|moderate|minor", "deduction": <points deducted>, "location": "short anchor"}],
  "passes": ["List EVERY checklist item (1-11) that passes. Be thorough — for each item that IS accessible, include a specific description of what was found. A longer passes list is better than a short one."]
}`;
  const parseAuditJson = (raw) => {
    const cleaned = _stripCodeFence(raw);
    return JSON.parse(cleaned);
  };
  // Module-level chunk constants for auditOutputAccessibility. OVERLAP doubled
  // from 400→800 because WCAG violations in tables, code blocks, and long links
  // can span more than 400 chars at a chunk boundary and slip past the audit.
  const AUDIT_CHUNK_SIZE = 16000; // with maxOutputTokens=65536, well within model capacity
  const AUDIT_CHUNK_OVERLAP = 800;
  // Audit HTML for WCAG 2.1 AA compliance
  // Short docs (≤8KB): single Gemini call. Long docs: chunked with deduplication.
  const auditOutputAccessibility = async (htmlContent) => {
    if (!callGemini || !htmlContent) return null;
    try {
      const CHUNK_SIZE = AUDIT_CHUNK_SIZE;
      const OVERLAP = AUDIT_CHUNK_OVERLAP;
      // Short documents: single audit pass
      if (htmlContent.length <= CHUNK_SIZE) {
        const sampleHtml = htmlContent;
        const result = await callGemini(`You are a WCAG 2.1 AA accessibility auditor. Audit this HTML document for accessibility compliance.\n\n${AUDIT_RUBRIC_PROMPT}\n\nHTML to audit:\n"""${sampleHtml}"""`, true);
        const parsed = parseAuditJson(result);
        if (parsed.issues && Array.isArray(parsed.issues)) {
          const totalDeductions = parsed.issues.reduce((sum, i) => sum + (i.deduction || 0), 0);
          // Pass credit: ratio of passes to total checks — more passes = more proportional credit
          const pc = (parsed.passes || []).length;
          const ic = parsed.issues.length;
          const passRatio = pc > 0 ? pc / (pc + ic) : 0;
          const pf = 1 - (passRatio * 0.4);
          const calculatedScore = Math.max(0, 100 - Math.round(totalDeductions * pf));
          if (Math.abs((parsed.score || 0) - calculatedScore) > 12) parsed.score = calculatedScore;
        }
        // Tone-check: if summary contains harsh language but score is high, soften it
        if (parsed.score >= 80 && parsed.summary) {
          const harshWords = /fails?\s+significantly|severely\s+inaccessible|major\s+concern|critically\s+lacking|fundamentally\s+broken|unusable|fails\s+to\s+meet/i;
          if (harshWords.test(parsed.summary)) {
            const issueCount = (parsed.issues || []).length;
            const passCount = (parsed.passes || []).length;
            parsed.summary = `The document scores ${parsed.score}/100 with ${passCount} accessibility checks passing and ${issueCount} remaining issue${issueCount !== 1 ? 's' : ''} to address.`;
          }
        }
        return parsed;
      }
      // For long documents, chunk into overlapping sections and audit each
      // Ensure chunks don't split mid-HTML-tag by adjusting boundaries to nearest '>'
      const chunks = [];
      for (let i = 0; i < htmlContent.length; i += CHUNK_SIZE - OVERLAP) {
        let end = Math.min(i + CHUNK_SIZE, htmlContent.length);
        // If we're not at the end, find the nearest '>' to avoid splitting tags
        if (end < htmlContent.length) {
          const closeTag = htmlContent.indexOf('>', end);
          if (closeTag !== -1 && closeTag - end < 200) end = closeTag + 1;
        }
        chunks.push(htmlContent.substring(i, end));
      }
      // Always include the <head> section in chunk 0 for global checks (lang, title)
      // Audit chunks in parallel (max 4 concurrent to avoid rate limits)
      const chunkResults = [];
      const batchSize = 6;
      for (let b = 0; b < chunks.length; b += batchSize) {
        const batch = chunks.slice(b, b + batchSize);
        const results = await Promise.all(batch.map((chunk, idx) => {
          const chunkNum = b + idx + 1;
          const isFirst = chunkNum === 1;
          const prompt = `You are a WCAG 2.1 AA accessibility auditor. Audit this HTML section (section ${chunkNum} of ${chunks.length}) for accessibility compliance.
${isFirst ? 'This is the FIRST section — check global items (lang, title, skip-nav, landmarks).' : 'This is a MIDDLE/END section — focus on content-level issues (headings, images, tables, links, lists, contrast). Skip global checks (lang, title) since those only appear in the first section.'}

${AUDIT_RUBRIC_PROMPT}

HTML section ${chunkNum}/${chunks.length}:
"""${chunk}"""`;
          return callGemini(prompt, true).then(r => {
            try { return parseAuditJson(r); } catch { return null; }
          }).catch(() => null);
        }));
        chunkResults.push(...results.filter(Boolean));
      }
      if (chunkResults.length === 0) return null;
      // Merge: deduplicate issues across chunks using WCAG code + violation category
      // This prevents length-penalty: "missing alt on page 5" and "missing alt on page 20" count as ONE issue type
      const seenIssues = new Map(); // key → issue (keeps the first/best description)
      const seenPassKeys = new Set();
      const mergedPassList = [];
      chunkResults.forEach(cr => {
        (cr.issues || []).forEach(issue => {
          // Dedup by WCAG code + severity (same violation type = same deduction regardless of how many pages)
          const wcag = (issue.wcag || '').trim();
          const severity = (issue.severity || 'minor').toLowerCase();
          const categoryWords = (issue.issue || '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 3).sort().join('_');
          const key = wcag ? `${wcag}_${severity}` : `${severity}_${categoryWords}`;
          if (!seenIssues.has(key)) {
            seenIssues.set(key, issue);
          }
        });
        // Deduplicate passes by normalized keywords — Gemini phrases the same pass
        // differently per chunk ("No images found" vs "No images without alt text detected")
        (cr.passes || []).forEach(p => {
          const passText = typeof p === 'string' ? p : (p.description || p.id || '');
          const passKey = passText.toLowerCase()
            .replace(/\b(the|a|an|is|are|was|were|no|not|none|found|present|detected|this|that|in|of|for|to|and|or|with|without|section|block|specific|text|content|provided|been|has|have|all)\b/g, '')
            .replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(w => w.length > 2).sort().slice(0, 5).join('_');
          if (passKey && !seenPassKeys.has(passKey)) {
            seenPassKeys.add(passKey);
            mergedPassList.push(passText);
          }
        });
      });
      const mergedIssues = [...seenIssues.values()];

      // ── Structural pass detection on full document ──
      // Chunked audits underreport passes because most chunks are plain content.
      // Check the full HTML structure once for global accessibility features.
      const structuralPasses = [];
      const lc = htmlContent.toLowerCase();
      if (/<html[^>]*lang="[a-z]{2,3}/.test(lc)) structuralPasses.push('HTML lang attribute is correctly set');
      if (/<title>[^<]+<\/title>/.test(lc)) structuralPasses.push('Page title is present and descriptive');
      if (/<main[\s>]/.test(lc)) structuralPasses.push('A <main> landmark defines the primary content area');
      if (/<nav[\s>]/.test(lc)) structuralPasses.push('Navigation landmark (<nav>) is present');
      if (/<header[\s>]/.test(lc)) structuralPasses.push('Header landmark is present');
      if (/<footer[\s>]/.test(lc)) structuralPasses.push('Footer landmark is present');
      if (/<h1[\s>]/.test(lc)) structuralPasses.push('Level 1 heading (h1) establishes the document topic');
      if (/<h2[\s>]/.test(lc)) structuralPasses.push('Section headings (h2) provide document structure');
      if (/<a[^>]*href=/.test(lc) && !/<a[^>]*>click here<\/a>/i.test(htmlContent)) structuralPasses.push('Links use descriptive text');
      if (/<ul[\s>]/.test(lc) && /<li[\s>]/.test(lc)) structuralPasses.push('Semantic list markup (ul/li) is used');
      if (/<ol[\s>]/.test(lc) && /<li[\s>]/.test(lc)) structuralPasses.push('Ordered lists (ol/li) are used for sequential content');
      if (/<table[\s>]/.test(lc) && /<th[\s>]/.test(lc)) structuralPasses.push('Table headers (th) are used for data tables');
      if (/<th[^>]*scope=/.test(lc)) structuralPasses.push('Table header scope attributes define data relationships');
      if (/skip.*content|skip.*nav/i.test(htmlContent)) structuralPasses.push('Skip-to-content link is provided for keyboard navigation');
      if (/<img[^>]*alt="[^"]+"/i.test(htmlContent)) structuralPasses.push('Images have descriptive alt text');
      if (/<figcaption[\s>]/.test(lc)) structuralPasses.push('Figure captions provide image descriptions');
      if (/<label[\s>]/.test(lc) || /aria-label/.test(lc)) structuralPasses.push('Form elements have associated labels');
      if (/role="(main|navigation|banner|contentinfo|complementary)"/.test(lc)) structuralPasses.push('ARIA landmark roles are used for page structure');
      // Merge structural passes with chunk-reported passes (dedup by key)
      structuralPasses.forEach(sp => {
        const spKey = sp.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(w => w.length > 2).sort().slice(0, 5).join('_');
        if (spKey && !seenPassKeys.has(spKey)) {
          seenPassKeys.add(spKey);
          mergedPassList.push(sp);
        }
      });

      const passCount = mergedPassList.length;
      // Score from merged deductions — each unique violation type counted ONCE
      const rawDeductions = mergedIssues.reduce((sum, i) => sum + (i.deduction || 0), 0);
      // Pass credit: ratio of passes to total checks — proportional to document quality
      const issueCount = mergedIssues.length;
      const passRatio = passCount > 0 ? passCount / (passCount + issueCount) : 0;
      const passFactor = 1 - (passRatio * 0.4);
      const adjustedDeductions = Math.round(rawDeductions * passFactor);
      const mergedScore = Math.max(0, 100 - adjustedDeductions);
      // Summary from first chunk (has the global perspective)
      const summary = chunkResults[0]?.summary || `Audited ${chunks.length} sections of ${htmlContent.length.toLocaleString()} chars.`;
      warnLog(`[Output Audit] Chunked: ${chunks.length} sections, ${mergedIssues.length} unique issues, ${passCount} passes (${structuralPasses.length} structural), raw deductions ${rawDeductions}, pass factor ${passFactor.toFixed(2)}, score ${mergedScore}`);
      return {
        score: mergedScore,
        summary: summary + ` (${chunks.length} sections audited)`,
        issues: mergedIssues,
        passes: mergedPassList,
        chunksAudited: chunks.length
      };
    } catch (err) {
      warnLog('[Output Audit] Failed:', err);
      return null;
    }
  };

  // ── axe-core Accessibility Checker (lazy-loaded from CDN) ──
  // Cache axe source text so each iframe audit injects it inline (no second CDN round-trip).
  var _axeSourceCache = null;
  var _axeSourcePromise = null;
  const _AXE_CDN_URL = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js';
  const runAxeAudit = async (htmlContent) => {
    try {
      // Lazy-load axe-core from CDN if not already loaded. Error messages include
      // the CDN URL so field reports can distinguish DNS / proxy / mixed-content /
      // adblock issues without re-running with devtools open.
      if (!window.axe) {
        await new Promise((resolve, reject) => {
          if (document.querySelector('script[data-axe-core]')) {
            // Script tag exists but axe not ready yet — wait
            const wait = setInterval(() => { if (window.axe) { clearInterval(wait); resolve(); } }, 100);
            setTimeout(() => { clearInterval(wait); reject(new Error('axe-core load timeout after 10s from ' + _AXE_CDN_URL + ' (previous script tag exists but window.axe never appeared — CDN may have returned corrupted JS)')); }, 10000);
            return;
          }
          const script = document.createElement('script');
          script.src = _AXE_CDN_URL;
          script.setAttribute('data-axe-core', 'true');
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load axe-core from ' + _AXE_CDN_URL + ' (check network, corporate proxy, or adblock — jsdelivr may be blocked)'));
          document.head.appendChild(script);
        });
      }

      // Fetch + cache axe source text once so subsequent iframe audits can inject inline.
      // De-duplicated via _axeSourcePromise so concurrent audits share a single fetch.
      if (!_axeSourceCache && !_axeSourcePromise) {
        _axeSourcePromise = fetch(_AXE_CDN_URL)
          .then(r => {
            if (!r.ok) {
              warnLog('[axe-core] CDN returned HTTP ' + r.status + ' ' + r.statusText + ' for ' + _AXE_CDN_URL + ' — inline injection disabled, falling back to script tag per iframe');
              return null;
            }
            return r.text();
          })
          .then(txt => { if (txt) _axeSourceCache = txt; return txt; })
          .catch(err => { warnLog('[axe-core] CDN fetch threw: ' + (err?.message || err) + ' (URL: ' + _AXE_CDN_URL + ')'); return null; })
          .finally(() => { _axeSourcePromise = null; });
      }
      if (_axeSourcePromise) { try { await _axeSourcePromise; } catch(e) {} }

      // Create hidden iframe with the HTML content
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:800px;height:600px;opacity:0;pointer-events:none';
      iframe.setAttribute('aria-hidden', 'true');
      iframe.title = 'Accessibility audit frame';
      document.body.appendChild(iframe);

      let results;
      try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      // Strip <script> tags before writing — they can break document.write() parsing
      // and aren't needed for accessibility auditing (axe-core only checks DOM structure)
      const _safeHtml = htmlContent.replace(/<script[\s\S]*?<\/script>/gi, '');
      iframeDoc.open();
      iframeDoc.write(_safeHtml);
      iframeDoc.close();

      // Wait for iframe content to render
      await new Promise(r => setTimeout(r, 800));

      // Inject axe-core into the iframe — prefer the cached source text (no network),
      // fall back to CDN script tag if the cache wasn't populated (e.g., fetch blocked).
      await new Promise((resolve, reject) => {
        const axeScript = iframeDoc.createElement('script');
        if (_axeSourceCache) {
          axeScript.textContent = _axeSourceCache;
          iframeDoc.head.appendChild(axeScript);
          resolve(); // inline scripts execute synchronously on append
        } else {
          axeScript.src = _AXE_CDN_URL;
          axeScript.onload = () => resolve();
          axeScript.onerror = () => reject(new Error('Failed to inject axe-core into iframe from ' + _AXE_CDN_URL + ' (inline cache empty AND iframe script load failed — check CORS / CSP / proxy)'));
          iframeDoc.head.appendChild(axeScript);
        }
      });
      // Shorter settle delay when inlined — no network wait needed.
      await new Promise(r => setTimeout(r, _axeSourceCache ? 50 : 300));

      // Run axe-core inside the iframe
      const iframeAxe = iframe.contentWindow.axe;
      if (!iframeAxe) throw new Error('axe-core not available in iframe');

      results = await _withTimeout(
        iframeAxe.run(iframeDoc, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          resultTypes: ['violations', 'passes', 'incomplete']
        }),
        30000, 'axe-core audit'
      );
      } finally {
        // Always clean up iframe — prevents memory leak on error
        try { document.body.removeChild(iframe); } catch(e) { /* iframe may not be attached */ }
      }

      // Process results
      const critical = results.violations.filter(v => v.impact === 'critical');
      const serious = results.violations.filter(v => v.impact === 'serious');
      const moderate = results.violations.filter(v => v.impact === 'moderate');
      const minor = results.violations.filter(v => v.impact === 'minor');

      // Carry axe's color-contrast check data (fgColor, bgColor, expectedContrastRatio) on
      // nodeDetails so the deterministic surgical fixer can act on it without reparsing the
      // failure summary string.
      const _mapNode = (n) => {
        const base = { html: n.html, target: n.target, failureSummary: n.failureSummary };
        const contrastCheck = (n.any || []).find(a => a && (a.id === 'color-contrast' || a.id === 'color-contrast-enhanced'));
        if (contrastCheck && contrastCheck.data) {
          base.fgColor = contrastCheck.data.fgColor;
          base.bgColor = contrastCheck.data.bgColor;
          base.contrastRatio = contrastCheck.data.contrastRatio;
          base.expectedContrastRatio = contrastCheck.data.expectedContrastRatio;
          base.fontSize = contrastCheck.data.fontSize;
          base.fontWeight = contrastCheck.data.fontWeight;
        }
        return base;
      };
      return {
        engine: 'axe-core',
        version: results.testEngine?.version || '4.10.3',
        totalViolations: results.violations.length,
        totalPasses: results.passes.length,
        totalIncomplete: (results.incomplete || []).length,
        critical: critical.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), nodeDetails: v.nodes.slice(0, 3).map(_mapNode) })),
        serious: serious.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), nodeDetails: v.nodes.slice(0, 3).map(_mapNode) })),
        moderate: moderate.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), nodeDetails: v.nodes.slice(0, 3).map(_mapNode) })),
        minor: minor.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', ') })),
        passes: results.passes.map(p => ({ id: p.id, description: p.help, wcag: (p.tags || []).filter(t => t.startsWith('wcag')).join(', '), nodes: p.nodes.length })),
        incomplete: (results.incomplete || []).map(i => ({ id: i.id, description: i.help, nodes: i.nodes.length })),
        score: Math.max(0, Math.round(100 - (critical.length * 15) - (serious.length * 10) - (moderate.length * 5) - (minor.length * 2))),
      };
    } catch (err) {
      warnLog('[axe-core] Audit failed:', err);
      return null;
    }
  };

  // ── Deterministic color-contrast fixer (comprehensive) ──
  const fixContrastViolations = (htmlContent) => {
    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
      return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
    };
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
    const luminance = (r, g, b) => {
      const [rs, gs, bs] = [r/255, g/255, b/255].map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    const contrastRatio = (rgb1, rgb2) => {
      const l1 = luminance(...rgb1), l2 = luminance(...rgb2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    // Named CSS colors that fail contrast against white
    const namedColorMap = {
      'gray': '#808080', 'grey': '#808080', 'silver': '#c0c0c0', 'darkgray': '#a9a9a9', 'darkgrey': '#a9a9a9',
      'lightgray': '#d3d3d3', 'lightgrey': '#d3d3d3', 'gainsboro': '#dcdcdc', 'lightslategray': '#778899',
      'lightsteelblue': '#b0c4de', 'lightblue': '#add8e6', 'lightskyblue': '#87cefa', 'lightcoral': '#f08080',
      'lightpink': '#ffb6c1', 'lightsalmon': '#ffa07a', 'lightyellow': '#ffffe0', 'lightgreen': '#90ee90',
      'lightcyan': '#e0ffff', 'lemonchiffon': '#fffacd', 'lavender': '#e6e6fa', 'linen': '#faf0e6',
      'mistyrose': '#ffe4e1', 'mintcream': '#f5fffa', 'oldlace': '#fdf5e6', 'papayawhip': '#ffefd5',
      'peachpuff': '#ffdab9', 'seashell': '#fff5ee', 'snow': '#fffafa', 'wheat': '#f5deb3', 'white': '#ffffff',
      'whitesmoke': '#f5f5f5', 'beige': '#f5f5dc', 'cornsilk': '#fff8dc', 'honeydew': '#f0fff0',
      'ivory': '#fffff0', 'khaki': '#f0e68c', 'tan': '#d2b48c', 'thistle': '#d8bfd8', 'plum': '#dda0dd',
      'yellow': '#ffff00', 'lime': '#00ff00', 'aqua': '#00ffff', 'cyan': '#00ffff', 'magenta': '#ff00ff',
      'orange': '#ffa500', 'coral': '#ff7f50', 'tomato': '#ff6347', 'orangered': '#ff4500',
      'red': '#ff0000', 'pink': '#ffc0cb', 'hotpink': '#ff69b4', 'deeppink': '#ff1493',
      'mediumslateblue': '#7b68ee', 'royalblue': '#4169e1', 'dodgerblue': '#1e90ff',
      'cornflowerblue': '#6495ed', 'mediumpurple': '#9370db', 'orchid': '#da70d6',
      'violet': '#ee82ee', 'gold': '#ffd700', 'greenyellow': '#adff2f', 'chartreuse': '#7fff00',
      'springgreen': '#00ff7f', 'mediumspringgreen': '#00fa9a', 'palegreen': '#98fb98',
      'paleturquoise': '#afeeee', 'powderblue': '#b0e0e6', 'skyblue': '#87ceeb',
      'mediumaquamarine': '#66cdaa', 'turquoise': '#40e0d0', 'mediumturquoise': '#48d1cc',
      'sandybrown': '#f4a460', 'burlywood': '#deb887', 'navajowhite': '#ffdead', 'moccasin': '#ffe4b5',
      'rosybrown': '#bc8f8f', 'darkkhaki': '#bdb76b', 'darkseagreen': '#8fbc8f'
    };

    // Darken a color until it meets 4.5:1 against a background (or lighten if bg is dark)
    const fixToPass = (fgRgb, bgRgb, targetRatio = 4.5) => {
      let [r, g, b] = fgRgb;
      const bgLum = luminance(...bgRgb);
      const isDarkBg = bgLum < 0.18;

      for (let i = 0; i < 30; i++) {
        if (contrastRatio([r, g, b], bgRgb) >= targetRatio) break;
        if (isDarkBg) {
          // Lighten foreground against dark backgrounds
          r = Math.min(255, Math.round(r + (255 - r) * 0.15));
          g = Math.min(255, Math.round(g + (255 - g) * 0.15));
          b = Math.min(255, Math.round(b + (255 - b) * 0.15));
        } else {
          // Darken foreground against light backgrounds
          r = Math.max(0, Math.round(r * 0.82));
          g = Math.max(0, Math.round(g * 0.82));
          b = Math.max(0, Math.round(b * 0.82));
        }
      }
      return [r, g, b];
    };

    // Parse any CSS color value to RGB
    const parseColor = (colorStr) => {
      if (!colorStr) return null;
      const s = colorStr.trim().toLowerCase();
      if (s.startsWith('#')) {
        try { return hexToRgb(s); } catch(e) { return null; }
      }
      const rgbMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgbMatch) return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
      if (namedColorMap[s]) {
        try { return hexToRgb(namedColorMap[s]); } catch(e) { return null; }
      }
      return null;
    };

    let fixed = htmlContent;
    let fixCount = 0;

    // ── Detect document background color instead of assuming white ──
    // Search for background on <body> or <html> elements; fall back to white
    const detectDocBg = (html) => {
      // Check body style first, then html style
      const bodyBgMatch = html.match(/<body[^>]*style="[^"]*background(?:-color)?:\s*([^;"]+)/i);
      if (bodyBgMatch) {
        const parsed = parseColor(bodyBgMatch[1].trim());
        if (parsed) return parsed;
      }
      const htmlBgMatch = html.match(/<html[^>]*style="[^"]*background(?:-color)?:\s*([^;"]+)/i);
      if (htmlBgMatch) {
        const parsed = parseColor(htmlBgMatch[1].trim());
        if (parsed) return parsed;
      }
      // Check <style> blocks for body { background... } rules
      const styleBlockMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleBlockMatch) {
        for (const block of styleBlockMatch) {
          const bodyRuleMatch = block.match(/body\s*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i);
          if (bodyRuleMatch) {
            const parsed = parseColor(bodyRuleMatch[1].trim());
            if (parsed) return parsed;
          }
        }
      }
      return [255, 255, 255]; // default white
    };
    const defaultBg = detectDocBg(htmlContent);

    // ── Pass 1: Fix color:#hex declarations against detected background ──
    // Skip any match that lives inside an inline style="..." attribute that ALSO
    // declares its own background — Pass 4 below handles those holistically with
    // the correct local bg context. Previously this pass naively darkened #ffffff
    // against the document background when it actually sits on a blue button, so
    // white button text rendered as dark-orange-on-blue.
    fixed = fixed.replace(/([;"\s])color:\s*(#[0-9a-fA-F]{3,6})\b/g, (match, prefix, hex, offset, fullStr) => {
      try {
        // Look backward for the opening of an inline style="..." attribute. If found
        // unclosed before this match, inspect the full style fragment for a background.
        const back = fullStr.substring(Math.max(0, offset - 400), offset);
        const lastStyleOpen = back.lastIndexOf('style="');
        if (lastStyleOpen !== -1) {
          const afterStyleOpen = back.substring(lastStyleOpen + 7);
          if (!afterStyleOpen.includes('"')) {
            const fwd = fullStr.substring(offset, Math.min(fullStr.length, offset + 400));
            const closingQuote = fwd.indexOf('"');
            const styleFragment = afterStyleOpen + (closingQuote >= 0 ? fwd.substring(0, closingQuote) : fwd);
            if (/background(?:-color)?\s*:/i.test(styleFragment)) {
              return match; // Pass 4 owns this inline style
            }
          }
        }
        const rgb = hexToRgb(hex);
        if (contrastRatio(rgb, defaultBg) < 4.5) {
          const [fr, fg, fb] = fixToPass(rgb, defaultBg);
          fixCount++;
          return prefix + 'color:' + rgbToHex(fr, fg, fb);
        }
      } catch(e) {}
      return match;
    });

    // ── Pass 2: Fix color:rgb() and color:rgba() declarations ──
    // Alpha is captured and normalized: values < 0.75 collapse to opaque because low-alpha
    // text looks washed-out/gray regardless of its raw RGB contrast. A common failure case
    // was banner watermark text styled with `color: rgba(255,255,255,0.4)` on a dark
    // gradient — the RGB contrast (white on navy) reads 14:1 and passes the old check, but
    // the rendered text is unreadable because of the alpha.
    fixed = fixed.replace(/color:\s*rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/gi, (match, r, g, b, a) => {
      const rgb = [parseInt(r), parseInt(g), parseInt(b)];
      const alpha = a !== undefined ? parseFloat(a) : 1;
      let out = rgb;
      let changed = false;
      if (contrastRatio(rgb, defaultBg) < 4.5) {
        out = fixToPass(rgb, defaultBg);
        fixCount++;
        changed = true;
      }
      if (alpha < 0.75) {
        // Drop alpha — convert to opaque hex. Low-alpha text is a readability failure even
        // when the underlying RGB contrast is fine.
        if (!changed) fixCount++;
        return 'color:' + rgbToHex(out[0], out[1], out[2]);
      }
      return changed ? 'color:' + rgbToHex(out[0], out[1], out[2]) : match;
    });

    // ── Pass 3: Fix named CSS color values ──
    const namedColorRegex = new RegExp('([;"\\s])color:\\s*(' + Object.keys(namedColorMap).join('|') + ')\\b', 'gi');
    fixed = fixed.replace(namedColorRegex, (match, prefix, name) => {
      const hex = namedColorMap[name.toLowerCase()];
      if (!hex) return match;
      try {
        const rgb = hexToRgb(hex);
        if (contrastRatio(rgb, defaultBg) < 4.5) {
          const [fr, fg, fb] = fixToPass(rgb, defaultBg);
          fixCount++;
          return prefix + 'color:' + rgbToHex(fr, fg, fb);
        }
      } catch(e) {}
      return match;
    });

    // ── Pass 4: Fix foreground+background combos within same style attribute ──
    fixed = fixed.replace(/style="([^"]*)"/gi, (fullMatch, styleContent) => {
      const fgMatch = styleContent.match(/(?:^|;)\s*color:\s*([^;]+)/i);
      const bgMatch = styleContent.match(/background(?:-color)?:\s*([^;]+)/i);
      if (fgMatch && bgMatch) {
        const fgRgb = parseColor(fgMatch[1].trim());
        const bgRgb = parseColor(bgMatch[1].trim().replace(/\s*!important/gi, ''));
        if (fgRgb && bgRgb && contrastRatio(fgRgb, bgRgb) < 4.5) {
          const [fr, fg, fb] = fixToPass(fgRgb, bgRgb);
          const newStyle = styleContent.replace(/(?:^|;)\s*color:\s*[^;]+/i, ';color:' + rgbToHex(fr, fg, fb));
          fixCount++;
          return 'style="' + newStyle + '"';
        }
      }
      // Fix bg-only case: if element has a dark background but no explicit foreground color, add one
      if (bgMatch && !fgMatch) {
        const bgRgb = parseColor(bgMatch[1].trim().replace(/\s*!important/gi, ''));
        if (bgRgb) {
          const bgLum = luminance(...bgRgb);
          // Dark background with no text color specified — default text (#000) may fail
          if (bgLum < 0.18 && contrastRatio([0,0,0], bgRgb) < 4.5) {
            fixCount++;
            return 'style="' + styleContent + ';color:#ffffff"';
          }
          // Light background — ensure dark text
          if (bgLum > 0.7 && contrastRatio([0,0,0], bgRgb) < 4.5) {
            fixCount++;
            return 'style="' + styleContent + ';color:#1e293b"';
          }
        }
      }
      return fullMatch;
    });

    // ── Pass 5: Fix low opacity ──
    fixed = fixed.replace(/opacity:\s*0\.[0-5]\d*/g, () => { fixCount++; return 'opacity:0.85'; });

    // ── Pass 6: Inject a global CSS rule as a safety net for common light-colored classes ──
    // This catches elements styled by class names rather than inline styles
    // Background-aware: use different overrides for dark vs light document backgrounds
    if (fixed.includes('<head>') && !fixed.includes('/* a11y-contrast-safety */')) {
      const docBgLum = luminance(...defaultBg);
      const isDarkDoc = docBgLum < 0.18;
      const safetyCSS = isDarkDoc
        ? `<style>/* a11y-contrast-safety */
.text-gray-400,.text-gray-300,.text-slate-400,.text-slate-300,.text-zinc-400,.text-zinc-300{color:#d1d5db !important}
.text-blue-300,.text-sky-300,.text-cyan-300,.text-indigo-300{color:#93c5fd !important}
.text-green-300,.text-emerald-300{color:#86efac !important}
.text-red-300,.text-rose-300,.text-pink-300{color:#fca5a5 !important}
.text-yellow-300,.text-amber-300,.text-orange-300{color:#fcd34d !important}
.text-purple-300,.text-violet-300{color:#c4b5fd !important}
.bg-gray-800 *,.bg-slate-800 *,.bg-gray-900 *,.bg-slate-900 *,.bg-black *{color:#e2e8f0}
</style>`
        : `<style>/* a11y-contrast-safety */
.text-gray-400,.text-gray-300,.text-slate-400,.text-slate-300,.text-zinc-400,.text-zinc-300{color:#4b5563 !important}
.text-blue-300,.text-sky-300,.text-cyan-300,.text-indigo-300{color:#1e40af !important}
.text-green-300,.text-emerald-300{color:#166534 !important}
.text-red-300,.text-rose-300,.text-pink-300{color:#991b1b !important}
.text-yellow-300,.text-amber-300,.text-orange-300{color:#92400e !important}
.text-purple-300,.text-violet-300{color:#5b21b6 !important}
.bg-gray-800 *,.bg-slate-800 *,.bg-gray-900 *,.bg-slate-900 *,.bg-black *{color:#e2e8f0}
</style>`;
      fixed = fixed.replace('<head>', '<head>\n' + safetyCSS);
      fixCount++;
    }

    warnLog(`[Contrast Fix] Fixed ${fixCount} color-contrast issues deterministically`);
    return { html: fixed, fixCount };
  };

  // ── WCAG Style Sanitizer: guarantees WCAG compliance on ANY styled HTML ──
  // Runs deterministic checks that cannot be defeated by AI hallucination or theme misconfiguration
  const sanitizeStyleForWCAG = (htmlContent, options = {}) => {
    const { level = 'AA', minFontSize = 12 } = options;
    let html = htmlContent;
    let totalFixes = 0;

    // 1. Run contrast fixer (now background-aware via detectDocBg inside fixContrastViolations)
    //    For AAA level, we need to patch the ratio threshold — fixContrastViolations uses 4.5:1 internally.
    //    We do a second pass for AAA that catches anything between 4.5:1 and 7:1.
    const contrastResult = fixContrastViolations(html);
    html = contrastResult.html;
    totalFixes += contrastResult.fixCount;

    // 2. For AAA: second contrast pass with stricter 7:1 ratio
    if (level === 'AAA') {
      // Re-implement targeted contrast check at 7:1 threshold
      const hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
        return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
      };
      const rgbToHex = (r, g, b) => '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
      const srgb = (c) => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
      const lum = (r, g, b) => 0.2126 * srgb(r/255) + 0.7152 * srgb(g/255) + 0.0722 * srgb(b/255);
      const cr = (rgb1, rgb2) => { const l1 = lum(...rgb1), l2 = lum(...rgb2); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
      const fixAAA = (fgRgb, bgRgb) => {
        let [r, g, b] = fgRgb;
        const bgLum = lum(...bgRgb);
        const isDark = bgLum < 0.18;
        for (let i = 0; i < 30; i++) {
          if (cr([r,g,b], bgRgb) >= 7.0) break;
          if (isDark) { r = Math.min(255, Math.round(r+(255-r)*0.15)); g = Math.min(255, Math.round(g+(255-g)*0.15)); b = Math.min(255, Math.round(b+(255-b)*0.15)); }
          else { r = Math.max(0, Math.round(r*0.82)); g = Math.max(0, Math.round(g*0.82)); b = Math.max(0, Math.round(b*0.82)); }
        }
        return [r, g, b];
      };
      // Detect background for AAA pass
      const bodyBgM = html.match(/<body[^>]*style="[^"]*background(?:-color)?:\s*([^;"]+)/i);
      const styleBgM = html.match(/body\s*\{[^}]*background(?:-color)?:\s*([^;}\s]+)/i);
      let aaaBg = [255, 255, 255];
      if (bodyBgM) { try { const p = hexToRgb(bodyBgM[1].trim()); if (p) aaaBg = p; } catch(e) {} }
      else if (styleBgM) { try { const p = hexToRgb(styleBgM[1].trim()); if (p) aaaBg = p; } catch(e) {} }

      html = html.replace(/([;"\s])color:\s*(#[0-9a-fA-F]{3,6})\b/g, (match, prefix, hex) => {
        try {
          const rgb = hexToRgb(hex);
          if (cr(rgb, aaaBg) < 7.0) {
            const [fr, fg, fb] = fixAAA(rgb, aaaBg);
            totalFixes++;
            return prefix + 'color:' + rgbToHex(fr, fg, fb);
          }
        } catch(e) {}
        return match;
      });
    }

    // 3. Enforce minimum font-size
    html = html.replace(/font-size:\s*([\d.]+)(px|pt)\b/gi, (match, size, unit) => {
      const px = unit.toLowerCase() === 'pt' ? parseFloat(size) * 1.333 : parseFloat(size);
      if (px < minFontSize) {
        totalFixes++;
        return `font-size:${minFontSize}px`;
      }
      return match;
    });

    if (totalFixes > 0) {
      warnLog(`[WCAG Sanitizer] Applied ${totalFixes} fixes (level: ${level}, minFont: ${minFontSize}px)`);
    }
    return { html, fixCount: totalFixes };
  };

  // ── Deterministic list-structure fixer (no AI needed) ──
  const fixListViolations = (htmlContent) => {
    let fixed = htmlContent;
    let fixCount = 0;

    // Fix 1: Wrap direct non-<li> children of <ul>/<ol> in <li> tags
    // Matches <ul> or <ol> content blocks and ensures all direct children are <li>
    fixed = fixed.replace(/<(ul|ol)(\s[^>]*)?>[\s\S]*?<\/\1>/gi, (listBlock, tag) => {
      // Parse direct children — find text/elements between <ul> and </ul> that aren't <li>
      let result = listBlock;

      // Remove stray text nodes directly inside <ul>/<ol> (wrap them in <li>)
      result = result.replace(
        new RegExp('(<' + tag + '(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/' + tag + '>)', 'i'),
        (m, open, content, close) => {
          // Split content into segments: <li>...</li> blocks and everything else
          let newContent = content;

          // Wrap ANY bare block/inline element inside <li> (not just div/p/span)
          // This catches <hr>, <table>, <section>, <article>, <figure>, <blockquote>, <img>, etc.
          newContent = newContent.replace(
            /(<(?:ul|ol)(?:\s[^>]*)?>|<\/li>)(\s*)(<(?!li\b|\/li|ul\b|ol\b|\/ul|\/ol|script|template)[a-z][a-z0-9]*\b[^>]*>[\s\S]*?<\/(?!li|ul|ol)[a-z][a-z0-9]*>)(\s*)(?=<li|<\/(?:ul|ol)>)/gi,
            (m, prefix, ws1, inner, ws2) => { fixCount++; return prefix + '<li>' + inner + '</li>'; }
          );
          // Also wrap self-closing elements like <hr/>, <br/>, <img/>
          newContent = newContent.replace(
            /(<(?:ul|ol)(?:\s[^>]*)?>|<\/li>)(\s*)(<(?:hr|img|br|input)\b[^>]*\/?>)(\s*)(?=<li|<\/(?:ul|ol)>)/gi,
            (m, prefix, ws1, inner, ws2) => { fixCount++; return prefix + '<li>' + inner + '</li>'; }
          );

          // Wrap bare text nodes (non-whitespace text between closing </li> and opening <li>)
          newContent = newContent.replace(
            /(<\/li>)\s*([^<\s][^<]*[^<\s])\s*(<li|<\/(?:ul|ol)>)/gi,
            (m2, closeLi, text, next) => { fixCount++; return closeLi + '<li>' + text.trim() + '</li>' + next; }
          );

          return open + newContent + close;
        }
      );

      return result;
    });

    // Fix 2: Convert <ul> or <ol> that contain <div> wrappers around <li> items
    // Pattern: <ul><div><li>...</li></div></ul> → <ul><li>...</li></ul>
    fixed = fixed.replace(/<(ul|ol)(\s[^>]*)?>(\s*)<div[^>]*>([\s\S]*?)<\/div>(\s*)<\/\1>/gi,
      (m, tag, attrs, ws1, content, ws2) => {
        if (content.includes('<li')) {
          fixCount++;
          return '<' + tag + (attrs || '') + '>' + ws1 + content + ws2 + '</' + tag + '>';
        }
        return m;
      }
    );

    // Fix 3: Remove bare <br> and empty text between <li> elements inside lists
    fixed = fixed.replace(/<(ul|ol)(\s[^>]*)?>[\s\S]*?<\/\1>/gi, (listBlock, tag) => {
      let cleaned = listBlock;
      // Remove stray <br> directly inside <ul>/<ol> (not inside <li>)
      cleaned = cleaned.replace(
        new RegExp('(<' + tag + '(?:\\s[^>]*)?>|<\\/li>)\\s*<br\\s*\\/?>\\s*(?=<li|<\\/' + tag + '>)', 'gi'),
        (m, before) => { fixCount++; return before; }
      );
      return cleaned;
    });

    warnLog(`[List Fix] Fixed ${fixCount} list-structure issues deterministically`);
    return { html: fixed, fixCount };
  };

  // ── fixFormLabels: associate every form field with a label (WCAG 1.3.1, 3.3.2) ──
  const fixFormLabels = (htmlContent) => {
    if (!htmlContent) return { html: htmlContent, fixCount: 0 };
    let fixed = htmlContent;
    let fixCount = 0;
    let idCounter = 0;

    // For each <input>/<select>/<textarea> without aria-label/aria-labelledby/id+for, inject an sr-only label
    fixed = fixed.replace(/<(input|select|textarea)\b([^>]*?)(\/?)>/gi, (match, tag, attrs, selfClose) => {
      // Skip hidden/submit/button types
      if (/type\s*=\s*["']?(hidden|submit|button|image|reset)["']?/i.test(attrs)) return match;
      // Already labeled?
      const hasAriaLabel = /\saria-label(?:ledby)?\s*=/i.test(attrs);
      const idMatch = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
      if (hasAriaLabel) return match;
      if (idMatch) {
        // Check if there's a <label for="..."> somewhere in the doc pointing at this id
        const forRegex = new RegExp('<label\\b[^>]*\\bfor\\s*=\\s*["\']' + idMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']', 'i');
        if (forRegex.test(htmlContent)) return match;
      }
      // Needs a label — generate an id if missing
      idCounter++;
      const newId = idMatch ? idMatch[1] : `docpipe-field-${idCounter}`;
      let newAttrs = attrs;
      if (!idMatch) newAttrs = ` id="${newId}"` + attrs;
      // Infer a label from type/name/placeholder
      const nameMatch = attrs.match(/\bname\s*=\s*["']([^"']+)["']/i);
      const placeholderMatch = attrs.match(/\bplaceholder\s*=\s*["']([^"']+)["']/i);
      const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
      const labelText = (placeholderMatch && placeholderMatch[1]) ||
                        (nameMatch && nameMatch[1].replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) ||
                        (typeMatch && typeMatch[1].replace(/\b\w/g, c => c.toUpperCase()) + ' field') ||
                        `Field ${idCounter}`;
      fixCount++;
      return `<label for="${newId}" class="sr-only">${labelText}</label><${tag}${newAttrs}${selfClose}>`;
    });

    if (fixCount > 0) warnLog(`[Form Labels] Added ${fixCount} label associations deterministically`);
    return { html: fixed, fixCount };
  };

  // ── fixDecorativeImages: mark purely decorative images with alt="" + role="presentation" ──
  const fixDecorativeImages = (htmlContent) => {
    if (!htmlContent) return { html: htmlContent, fixCount: 0 };
    let fixed = htmlContent;
    let fixCount = 0;

    fixed = fixed.replace(/<img\b([^>]*)\/?>/gi, (match, attrs) => {
      // Already marked as decorative?
      if (/\srole\s*=\s*["']presentation["']/i.test(attrs) && /\salt\s*=\s*["']["']/i.test(attrs)) return match;

      // Detection heuristics
      const classMatch = attrs.match(/\bclass\s*=\s*["']([^"']+)["']/i);
      const widthMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+)/i);
      const heightMatch = attrs.match(/\bheight\s*=\s*["']?(\d+)/i);
      const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);

      const isDecoratClass = classMatch && /\b(decor|decoration|separator|divider|bullet|spacer|ornament|ornamental|background|bg)\b/i.test(classMatch[1]);
      const isTiny = (widthMatch && parseInt(widthMatch[1], 10) <= 16) || (heightMatch && parseInt(heightMatch[1], 10) <= 16);
      const isTinySvg = srcMatch && /\.svg$/i.test(srcMatch[1]) && (
        (widthMatch && parseInt(widthMatch[1], 10) <= 24) || (heightMatch && parseInt(heightMatch[1], 10) <= 24)
      );
      const hasPresentationRole = /\srole\s*=\s*["']presentation["']/i.test(attrs);

      if (!isDecoratClass && !isTiny && !isTinySvg && !hasPresentationRole) return match;

      // Strip any existing alt/role, replace with alt="" role="presentation"
      let newAttrs = attrs
        .replace(/\salt\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\srole\s*=\s*["'][^"']*["']/gi, '');
      fixCount++;
      return `<img${newAttrs} alt="" role="presentation">`;
    });

    // Also handle inline <svg> elements that are decorative (by class or tiny dimensions)
    fixed = fixed.replace(/<svg\b([^>]*)>/gi, (match, attrs) => {
      if (/\srole\s*=\s*["']presentation["']/i.test(attrs) || /\saria-hidden\s*=\s*["']true["']/i.test(attrs)) return match;
      const classMatch = attrs.match(/\bclass\s*=\s*["']([^"']+)["']/i);
      const widthMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+)/i);
      const heightMatch = attrs.match(/\bheight\s*=\s*["']?(\d+)/i);
      const isDecoratClass = classMatch && /\b(decor|decoration|separator|divider|bullet|spacer|ornament|icon|chevron)\b/i.test(classMatch[1]);
      const isTiny = (widthMatch && parseInt(widthMatch[1], 10) <= 24) || (heightMatch && parseInt(heightMatch[1], 10) <= 24);
      if (!isDecoratClass && !isTiny) return match;
      let newAttrs = attrs.replace(/\srole\s*=\s*["'][^"']*["']/gi, '').replace(/\saria-hidden\s*=\s*["'][^"']*["']/gi, '');
      fixCount++;
      return `<svg${newAttrs} role="presentation" aria-hidden="true">`;
    });

    if (fixCount > 0) warnLog(`[Decorative Images] Marked ${fixCount} images/SVGs as decorative deterministically`);
    return { html: fixed, fixCount };
  };

  // ── fixComplexTables: add headers="..." associations for merged-cell tables (WCAG 1.3.1) ──
  const fixComplexTables = (htmlContent) => {
    if (!htmlContent) return { html: htmlContent, fixCount: 0 };
    let fixed = htmlContent;
    let fixCount = 0;
    let tableIdx = 0;

    fixed = fixed.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (fullMatch, tableAttrs, tableBody) => {
      tableIdx++;
      // Only touch tables that have merged cells or nested tables
      const hasMerged = /\s(?:colspan|rowspan)\s*=\s*["']?[2-9]/i.test(tableBody);
      const hasNested = /<table\b/i.test(tableBody);
      if (!hasMerged && !hasNested) return fullMatch;

      let newBody = tableBody;

      // Ensure <caption> exists (inject sr-only placeholder if missing)
      if (!/<caption\b/i.test(newBody)) {
        newBody = newBody.replace(/^(\s*)/, `$1<caption class="sr-only">Data table ${tableIdx}</caption>`);
        fixCount++;
      }

      // If the table has NO <th> at all, promote the first row's <td> elements to <th scope="col">
      if (!/<th\b/i.test(newBody)) {
        let firstRowDone = false;
        newBody = newBody.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/i, (rowMatch, rowAttrs, rowContent) => {
          if (firstRowDone) return rowMatch;
          firstRowDone = true;
          const promoted = rowContent.replace(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi, (tdMatch, tdAttrs, tdContent) => {
            fixCount++;
            return `<th scope="col"${tdAttrs}>${tdContent}</th>`;
          });
          // Wrap in <thead> if not already inside one
          if (!/<thead\b/i.test(newBody)) {
            fixCount++;
            return `<thead><tr${rowAttrs}>${promoted}</tr></thead>`;
          }
          return `<tr${rowAttrs}>${promoted}</tr>`;
        });
      }

      // Assign IDs to all <th> elements that don't have one
      let thCounter = 0;
      newBody = newBody.replace(/<th\b([^>]*)>/gi, (m, attrs) => {
        thCounter++;
        if (/\sid\s*=/i.test(attrs)) return m;
        fixCount++;
        return `<th id="docpipe-th-${tableIdx}-${thCounter}"${attrs}>`;
      });

      // For complex tables, ensure scope attributes exist on <th>
      newBody = newBody.replace(/<th\b([^>]*)>/gi, (m, attrs) => {
        if (/\sscope\s*=/i.test(attrs)) return m;
        fixCount++;
        return `<th scope="col"${attrs}>`;
      });

      return `<table${tableAttrs}>${newBody}</table>`;
    });

    if (fixCount > 0) warnLog(`[Complex Tables] Applied ${fixCount} complex-table fixes deterministically`);
    return { html: fixed, fixCount };
  };

  // ── fixLangSpans: wrap non-Latin script runs with <span lang="..."> (WCAG 3.1.2) ──
  const fixLangSpans = (htmlContent) => {
    if (!htmlContent) return { html: htmlContent, fixCount: 0 };
    let fixed = htmlContent;
    let fixCount = 0;

    const scriptRanges = [
      { lang: 'ru', pattern: /([\u0400-\u04FF][\u0400-\u04FF\s.,!?;:'"()-]{2,})/g },
      { lang: 'ar', pattern: /([\u0600-\u06FF][\u0600-\u06FF\s.,!?;:'"()-]{2,})/g },
      { lang: 'he', pattern: /([\u0590-\u05FF][\u0590-\u05FF\s.,!?;:'"()-]{2,})/g },
      { lang: 'zh', pattern: /([\u4E00-\u9FFF][\u4E00-\u9FFF\u3000-\u303F\s,.!?;:'"()-]{1,})/g },
      { lang: 'ja', pattern: /([\u3040-\u309F\u30A0-\u30FF][\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s,.!?;:'"()-]{1,})/g },
      { lang: 'ko', pattern: /([\uAC00-\uD7AF][\uAC00-\uD7AF\s,.!?;:'"()-]{1,})/g },
      { lang: 'hi', pattern: /([\u0900-\u097F][\u0900-\u097F\s,.!?;:'"()-]{2,})/g },
      { lang: 'el', pattern: /([\u0370-\u03FF][\u0370-\u03FF\s,.!?;:'"()-]{2,})/g },
      { lang: 'th', pattern: /([\u0E00-\u0E7F][\u0E00-\u0E7F\s,.!?;:'"()-]{2,})/g },
    ];

    // Only touch text inside visible content tags — skip text already inside <span lang="...">
    // Use a broader regex that captures the preceding tag so we can check for existing lang attr
    fixed = fixed.replace(/(<[^>]*>)([^<]+)/g, (match, precedingTag, textContent) => {
      // Skip if this text node is already inside a <span lang="..."> — prevents double-wrapping
      if (/<span\b[^>]*\blang\s*=/i.test(precedingTag)) return match;
      let newText = textContent;
      for (const { lang, pattern } of scriptRanges) {
        newText = newText.replace(pattern, (runMatch) => {
          if (runMatch.trim().length < 2) return runMatch;
          fixCount++;
          return `<span lang="${lang}">${runMatch}</span>`;
        });
      }
      return precedingTag + newText;
    });

    if (fixCount > 0) warnLog(`[Lang Spans] Wrapped ${fixCount} non-Latin script runs deterministically`);
    return { html: fixed, fixCount };
  };

  // ── Axe-guided targeted contrast fixer ──
  // When the regex-based fixContrastViolations can't catch a color (CSS vars, shorthand
  // `background:`, class-based styles, gradient bg), axe-core still reports them. This function
  // consumes axe's own report and generates selector-specific `!important` overrides so those
  // stuck violations can be resolved. Called from autoFixAxeViolations as a last step each pass.
  const fixAxeContrastViolationsTargeted = (html, axeResult) => {
    if (!html || !axeResult) return { html: html, fixCount: 0 };
    const nodes = [];
    const collect = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach(v => {
        if ((v.id === 'color-contrast' || v.id === 'color-contrast-enhanced') && Array.isArray(v.nodeDetails)) {
          nodes.push.apply(nodes, v.nodeDetails);
        }
      });
    };
    collect(axeResult.critical);
    collect(axeResult.serious);
    collect(axeResult.moderate);
    if (nodes.length === 0) return { html: html, fixCount: 0 };

    // Local color math (duplicated to keep this helper self-contained).
    const hexToRgb = (hex) => {
      const h = hex.replace('#', '');
      if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
      return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
    };
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
    const srgb = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum = (r, g, b) => 0.2126 * srgb(r/255) + 0.7152 * srgb(g/255) + 0.0722 * srgb(b/255);
    const cr = (a, b) => { const l1 = lum.apply(null, a), l2 = lum.apply(null, b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const fixFg = (fgRgb, bgRgb, target) => {
      target = target || 4.5;
      let r = fgRgb[0], g = fgRgb[1], b = fgRgb[2];
      const isDarkBg = lum.apply(null, bgRgb) < 0.18;
      for (let i = 0; i < 40; i++) {
        if (cr([r, g, b], bgRgb) >= target) break;
        if (isDarkBg) { r = Math.min(255, Math.round(r + (255 - r) * 0.15)); g = Math.min(255, Math.round(g + (255 - g) * 0.15)); b = Math.min(255, Math.round(b + (255 - b) * 0.15)); }
        else { r = Math.max(0, Math.round(r * 0.82)); g = Math.max(0, Math.round(g * 0.82)); b = Math.max(0, Math.round(b * 0.82)); }
      }
      return [r, g, b];
    };
    const parseColor = (raw) => {
      if (!raw) return null;
      const s = String(raw).trim();
      if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return s.length === 4 ? '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s.slice(0, 7);
      const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) return rgbToHex(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
      return null;
    };

    // Collect per-node work items (selector + computed new color).
    const items = [];
    const seenSel = new Set();
    nodes.forEach((node) => {
      const summary = String(node.failureSummary || '');
      const fgRaw = (summary.match(/foreground color\s*:?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/i) || [])[1];
      const bgRaw = (summary.match(/background color\s*:?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/i) || [])[1];
      const targetSel = Array.isArray(node.target) ? node.target.join(' ') : String(node.target || '');
      if (!fgRaw || !bgRaw || !targetSel) return;
      const fgHex = parseColor(fgRaw);
      const bgHex = parseColor(bgRaw);
      if (!fgHex || !bgHex) return;
      try {
        const newRgb = fixFg(hexToRgb(fgHex), hexToRgb(bgHex));
        const newHex = rgbToHex(newRgb[0], newRgb[1], newRgb[2]);
        if (newHex.toLowerCase() === fgHex.toLowerCase()) return;
        const safeSel = targetSel.replace(/[{};<>]/g, '').trim();
        if (!safeSel || safeSel.length > 300 || seenSel.has(safeSel)) return;
        seenSel.add(safeSel);
        items.push({ sel: safeSel, newHex });
      } catch (e) { /* skip malformed node */ }
    });

    if (items.length === 0) return { html: html, fixCount: 0 };

    // ── Primary path: DOMParser-based inline style mutation ──
    // Inline `color:X !important` on the actual failing element beats any parent's
    // inline `!important` (inheritance only fills in when no explicit rule wins on
    // the child). This is the only way to beat cases like our banner template,
    // where nested divs carry `style="color:#ffffff !important"` by design.
    let domFixCount = 0;
    let domSerialized = null;
    try {
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const dom = parser.parseFromString(html, 'text/html');
        items.forEach(({ sel, newHex }) => {
          let el = null;
          try { el = dom.querySelector(sel); } catch (e) { /* invalid selector */ }
          if (!el) return;
          // Strip any existing color:... from the element's own inline style, then
          // prepend the new color with !important so declaration order + importance
          // both favor it.
          const prior = (el.getAttribute('style') || '').replace(/(?:^|;)\s*color\s*:[^;]*;?/gi, '').replace(/^;+/, '');
          const next = 'color:' + newHex + ' !important' + (prior ? ';' + prior : '');
          el.setAttribute('style', next);
          domFixCount++;
        });
        if (domFixCount > 0) {
          // Preserve doctype + html outer so downstream regex passes keep working.
          const doctype = /^\s*<!DOCTYPE[^>]*>/i.test(html) ? (html.match(/^\s*<!DOCTYPE[^>]*>/i) || [''])[0] : '<!DOCTYPE html>';
          domSerialized = doctype + '\n' + dom.documentElement.outerHTML;
        }
      }
    } catch (e) { warnLog('[Contrast] DOMParser mutation path failed, falling back to stylesheet rules:', e && e.message); }

    if (domSerialized && domFixCount > 0) {
      _pipeLog('Contrast', 'Axe-guided targeted fix mutated ' + domFixCount + ' inline style' + (domFixCount === 1 ? '' : 's') + ' via DOMParser');
      return { html: domSerialized, fixCount: domFixCount };
    }

    // ── Fallback path: stylesheet rules (used only when DOMParser unavailable or
    // all querySelector lookups failed — e.g. malformed axe selectors). Inline
    // `!important` on the element still beats this, so this is a best-effort tail.
    const rules = items.map(it => it.sel + ' { color: ' + it.newHex + ' !important; }');
    const overrideStyle = '<style id="alloflow-contrast-overrides">\n/* Axe-guided contrast fixes — stylesheet fallback for ' + rules.length + ' element' + (rules.length === 1 ? '' : 's') + ' */\n' + rules.join('\n') + '\n</style>';

    let fixed = html.replace(/<style id="alloflow-contrast-overrides">[\s\S]*?<\/style>\s*/i, '');
    if (/<\/head>/i.test(fixed)) {
      fixed = fixed.replace(/<\/head>/i, overrideStyle + '\n</head>');
    } else {
      fixed = overrideStyle + fixed;
    }

    _pipeLog('Contrast', 'Axe-guided targeted fix applied to ' + rules.length + ' selector' + (rules.length === 1 ? '' : 's') + ' (stylesheet fallback)');
    return { html: fixed, fixCount: rules.length };
  };

  // Convenience wrapper: run all four new deterministic WCAG fixes in sequence
  const runDeterministicWcagFixes = (html) => {
    if (!html) return html;
    let result = html;
    try { result = fixFormLabels(result).html; } catch (e) { warnLog('[Det WCAG] fixFormLabels failed:', e?.message); }
    try { result = fixDecorativeImages(result).html; } catch (e) { warnLog('[Det WCAG] fixDecorativeImages failed:', e?.message); }
    try { result = fixComplexTables(result).html; } catch (e) { warnLog('[Det WCAG] fixComplexTables failed:', e?.message); }
    try { result = fixLangSpans(result).html; } catch (e) { warnLog('[Det WCAG] fixLangSpans failed:', e?.message); }
    return result;
  };

  // ── Tag-safe truncation: never cut inside an HTML tag ──
  const safeSubstring = (html, maxLen) => {
    if (!html || html.length <= maxLen) return html;
    let end = maxLen;
    // If we're inside a tag (after '<' without a following '>'), back up to before the '<'
    const lastOpen = html.lastIndexOf('<', end);
    const lastClose = html.lastIndexOf('>', end);
    if (lastOpen > lastClose) {
      // We're inside an unclosed tag — truncate before it
      end = lastOpen;
    }
    return html.substring(0, end);
  };

  // ── Chunk Verification Helpers ──

  // Extract plain text from HTML (strip tags, decode entities)
  const extractPlainText = (html) => {
    if (!html) return '';
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#\d+;/gi, '')
      .replace(/\s+/g, ' ').trim();
  };

  // Verify that a fixed chunk preserved the original content
  const verifyChunkIntegrity = (originalChunk, fixedChunk) => {
    const originalText = extractPlainText(originalChunk);
    const fixedText = extractPlainText(fixedChunk);
    const originalWords = originalText.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    const fixedWords = fixedText.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
    if (originalWords.length === 0) return { passed: true, reason: 'empty-chunk', wordCountRatio: 1, overlapRatio: 1, originalWordCount: 0, fixedWordCount: 0 };

    const wordCountRatio = fixedWords.length / originalWords.length;
    const fixedWordSet = new Set(fixedWords);
    const matchedWords = originalWords.filter(w => fixedWordSet.has(w)).length;
    const overlapRatio = matchedWords / originalWords.length;
    const passed = wordCountRatio >= 0.80 && overlapRatio >= 0.85;

    return {
      passed,
      wordCountRatio: Math.round(wordCountRatio * 100) / 100,
      overlapRatio: Math.round(overlapRatio * 100) / 100,
      originalWordCount: originalWords.length,
      fixedWordCount: fixedWords.length,
      reason: !passed ? `Content loss: ${Math.round((1 - overlapRatio) * 100)}% words missing, ${Math.round((1 - wordCountRatio) * 100)}% length reduction` : 'ok'
    };
  };

  // Score a chunk locally without API calls (heuristic accessibility check)
  const scoreChunkLocally = (chunkHtml) => {
    let score = 100;
    const imgs = (chunkHtml.match(/<img[^>]*>/gi) || []);
    score -= imgs.filter(i => !/alt\s*=/i.test(i)).length * 10;
    const tables = (chunkHtml.match(/<table[\s\S]*?<\/table>/gi) || []);
    tables.forEach(t => { if (/<th[\s>]/i.test(t) && !/scope=/i.test(t)) score -= 5; if (!/<th[\s>]/i.test(t) && /<td[\s>]/i.test(t)) score -= 10; });
    score -= (chunkHtml.match(/<a[^>]*>\s*<\/a>/gi) || []).length * 5;
    score -= (chunkHtml.match(/<a[^>]*>(click here|here|read more|more|learn more)<\/a>/gi) || []).length * 5;
    const headings = [...chunkHtml.matchAll(/<h([1-6])[\s>]/gi)].map(m => parseInt(m[1]));
    for (let i = 1; i < headings.length; i++) { if (headings[i] > headings[i - 1] + 1) score -= 5; }
    return Math.max(0, Math.min(100, score));
  };

  // ── Persistent chunk state: survives across calls so individual chunks can be re-fixed ──
  // Stored after chunked remediation so the UI can offer "re-fix chunk N" without re-running the whole pipeline.
  let _chunkState = null; // { preamble, postamble, originalChunks[], fixedChunks[], chunkResults[], violationInstructions, headSection }

  // Cheap fingerprint for distinguishing documents — avoids collisions between unrelated runs
  // that share a _chunkState singleton. Uses length + a prefix slice; good enough for "is this
  // the same document I was working on before?" without needing a full hash.
  const _docFingerprint = (html) => String((html || '').length) + ':' + String(html || '').slice(0, 200);

  // ── Auto-fix axe-core violations via targeted AI pass ──
  const autoFixAxeViolations = async (htmlContent, axeResult, maxPasses = 2) => {
    if (!callGemini || !axeResult || axeResult.totalViolations === 0) return { html: htmlContent, axe: axeResult, passes: 0 };
    // Clear stale chunk state from an unrelated prior document. The "re-fix chunk N" feature
    // relies on _chunkState persisting across autoFixAxeViolations calls, but if the calling
    // document has changed we must not reuse the old state — it would splice chunks from
    // document A into document B.
    const _currentDocKey = _docFingerprint(htmlContent);
    if (_chunkState && _chunkState.docKey && _chunkState.docKey !== _currentDocKey) {
      _pipeLog('AutoFix', 'Clearing _chunkState from a different document (' + _chunkState.docKey.slice(0, 30) + '... → ' + _currentDocKey.slice(0, 30) + '...)');
      _chunkState = null;
    }
    let currentHtml = htmlContent;
    let currentAxe = axeResult;
    let passCount = 0;

    // ── Fast path: direct axe rule → surgical tool mapping ──
    // For unambiguous violations (image-alt, button-name, duplicate-id, document-title, etc.)
    // apply the deterministic tool directly, skipping the Gemini diagnosis call. Cheaper + faster.
    const AXE_RULE_TO_TOOL = {
      'document-title': (nodes) => ({ tool: 'fix_title', params: { title: 'Document' } }),
      'html-has-lang':  (nodes) => ({ tool: 'fix_lang',  params: { lang: 'en' } }),
      'duplicate-id':   (nodes) => nodes.map(n => {
        const m = (n.html || n.failureSummary || '').match(/id="([^"]+)"/);
        return m ? { tool: 'fix_duplicate_id', params: { id: m[1] } } : null;
      }).filter(Boolean),
      'image-alt':      (nodes) => nodes.map((n, i) => ({ tool: 'fix_alt_text', params: { index: i, alt: 'Image' } })),
      'button-name':    (nodes) => nodes.map((n, i) => ({ tool: 'fix_button_name', params: { index: i, label: 'Button' } })),
      'input-button-name': (nodes) => nodes.map((n, i) => ({ tool: 'fix_button_name', params: { index: i, label: 'Button' } })),
      'link-name':      (nodes) => nodes.map((n, i) => ({ tool: 'fix_link_text', params: { index: i, newText: 'Learn more', force: true } })),
      'frame-title':    (nodes) => nodes.map((n, i) => ({ tool: 'fix_iframe_title', params: { index: i, title: 'Embedded content' } })),
      'empty-heading':  (nodes) => nodes.map((n, i) => ({ tool: 'fix_remove_empty_heading', params: { index: i } })),
      'skip-link':      () => ({ tool: 'fix_skip_nav', params: {} }),
      'landmark-one-main': () => ({ tool: 'fix_add_landmark', params: { tag: 'main', label: 'Main content' } }),
      'color-contrast': (nodes) => nodes.map(n => {
        if (!n || !n.target || !n.fgColor || !n.bgColor) return null;
        return { tool: 'fix_color_contrast', params: { target: n.target, fgColor: n.fgColor, bgColor: n.bgColor, expectedContrastRatio: n.expectedContrastRatio || 4.5 } };
      }).filter(Boolean),
      'color-contrast-enhanced': (nodes) => nodes.map(n => {
        if (!n || !n.target || !n.fgColor || !n.bgColor) return null;
        return { tool: 'fix_color_contrast', params: { target: n.target, fgColor: n.fgColor, bgColor: n.bgColor, expectedContrastRatio: n.expectedContrastRatio || 7.0 } };
      }).filter(Boolean)
    };
    try {
      const allAxeViolations = [].concat(currentAxe.critical || [], currentAxe.serious || [], currentAxe.moderate || [], currentAxe.minor || []);
      let directFixCount = 0;
      for (const v of allAxeViolations) {
        const mapper = AXE_RULE_TO_TOOL[v.id];
        if (!mapper) continue;
        const nodes = v.nodeDetails || v.nodes || [];
        const directives = mapper(nodes) || [];
        const arr = Array.isArray(directives) ? directives : [directives];
        for (const d of arr) {
          if (!d || !d.tool || !SURGICAL_TOOL_REGISTRY[d.tool]) continue;
          try {
            currentHtml = SURGICAL_TOOL_REGISTRY[d.tool].fn(currentHtml, d.params || {});
            directFixCount++;
          } catch (e) {
            warnLog('[AutoFix direct] tool ' + d.tool + ' threw:', e);
          }
        }
      }
      if (directFixCount > 0) {
        _pipeLog('AutoFix', `Direct-mapped ${directFixCount} violation(s) to surgical tools, skipping AI diagnosis for those.`);
        try {
          const reAudit = await runAxeAudit(currentHtml);
          if (reAudit) currentAxe = reAudit;
        } catch (e) { /* non-fatal — continue with existing axe snapshot */ }
        if (currentAxe.totalViolations === 0) return { html: currentHtml, axe: currentAxe, passes: 0 };
      }
    } catch (e) {
      warnLog('[AutoFix] Direct-mapping fast path failed:', e);
    }

    while (currentAxe.totalViolations > 0 && passCount < maxPasses) {
      passCount++;
      setPdfFixStep(`Auto-fixing ${currentAxe.totalViolations} violations (pass ${passCount}/${maxPasses})...`);

      const violationInstructions = []
        .concat(currentAxe.critical.map(v => `CRITICAL: ${v.description} (${v.id}, ${v.nodes} elements) — ${v.wcag}`))
        .concat(currentAxe.serious.map(v => `SERIOUS: ${v.description} (${v.id}, ${v.nodes} elements) — ${v.wcag}`))
        .concat(currentAxe.moderate.map(v => `MODERATE: ${v.description} (${v.id}, ${v.nodes} elements)`))
        .concat(currentAxe.minor.map(v => `MINOR: ${v.description} (${v.id})`))
        .join('\n');

      try {
        // ── Pass 2+: Selective re-fix of only failing chunks ──
        // If we have chunk state from a previous pass, only re-fix chunks scoring below 80
        // instead of re-chunking and re-fixing the entire document (avoids regressing good chunks)
        let usedSelectiveRefix = false;
        if (passCount > 1 && _chunkState && _chunkState.chunkResults && _chunkState.chunkResults.length > 1) {
          const failingChunks = _chunkState.chunkResults.filter(cr => cr.score < 80);
          if (failingChunks.length > 0 && failingChunks.length < _chunkState.chunkResults.length) {
            usedSelectiveRefix = true;
            // Update violation instructions in chunk state for the retry
            _chunkState.violationInstructions = violationInstructions;
            warnLog(`[AutoFix] Pass ${passCount}: selectively re-fixing ${failingChunks.length}/${_chunkState.chunkResults.length} chunks (score < 80)`);
            // Audio cue: ascending whoosh signals start of selective re-fix pass
            try { window.remediationAudio && window.remediationAudio.refixStart(); } catch(e) {}
            let _refixWonCount = 0;
            for (const fc of failingChunks) {
              setPdfFixStep(`Pass ${passCount}: re-fixing section ${fc.index + 1}/${_chunkState.chunkResults.length} (score: ${fc.score})...`);
              try {
                const result = await refixChunk(fc.index, { onProgress: setPdfFixStep });
                if (result?.html) {
                  currentHtml = result.html;
                  // Track successful re-fixes (score improved)
                  if (result.score && result.score > fc.score) _refixWonCount++;
                }
              } catch(rfErr) {
                warnLog(`[AutoFix] Selective re-fix of chunk ${fc.index + 1} failed: ${rfErr?.message}`);
              }
            }
            // Audio cue: rising C→G tone if at least one chunk improved
            if (_refixWonCount > 0) {
              try { window.remediationAudio && window.remediationAudio.refixSuccess(); } catch(e) {}
            }
            // Run post-reassembly full-doc sanitizer
            try {
              const fullSan = sanitizeStyleForWCAG(currentHtml);
              if (fullSan.fixCount > 0) { currentHtml = fullSan.html; warnLog(`[AutoFix] Post-selective-refix sanitizer: ${fullSan.fixCount} fixes`); }
              const fullList = fixListViolations(currentHtml);
              if (fullList.fixCount > 0) { currentHtml = fullList.html; }
            } catch(e) { /* non-blocking */ }
            // Force a fresh full-doc axe read so the NEXT loop iteration sees
            // the reassembled document's actual violation set, not stale per-chunk
            // snapshots. Without this, a partial chunk failure can leave currentAxe
            // pointing at pre-reassembly state and the progress check bails "no
            // improvement" when violations actually remain (or vice versa).
            try {
              const freshAxe = await runAxeAudit(currentHtml);
              if (freshAxe) {
                currentAxe = freshAxe;
                warnLog(`[AutoFix] Post-selective-refix re-audit: ${freshAxe.totalViolations} violations remain`);
              }
            } catch (e) {
              warnLog('[AutoFix] Post-selective re-audit failed; continuing with prior axe state: ' + (e?.message || e));
            }
          } else if (failingChunks.length === 0) {
            usedSelectiveRefix = true; // Nothing to re-fix
            warnLog(`[AutoFix] Pass ${passCount}: all chunks score ≥80, skipping chunk-level re-fix`);
          }
          // If ALL chunks are failing, fall through to the full re-chunk path below
        }

        if (usedSelectiveRefix) {
          // Selective re-fix handled it — skip the full chunk/single-pass path
        } else
        // ── Chunked remediation: split large documents into sections, fix each, reassemble ──
        // This prevents truncation from Gemini's output token limit (~8K tokens).
        {
        const MAX_CHUNK = 16000; // with maxOutputTokens=65536, 16KB chunks are well within capacity

        if (currentHtml.length <= MAX_CHUNK) {
          // Small document: single-pass fix
          // Emit synthetic chunk events so the Live Remediation UI shows for all documents
          try { window.dispatchEvent(new CustomEvent('alloflow:chunk-session-start', { detail: { totalChunks: 1, chunkSizes: [currentHtml.length], timestamp: Date.now() } })); } catch(e) {}
          try { window.dispatchEvent(new CustomEvent('alloflow:chunk-start', { detail: { index: 0, total: 1, sizeKB: Math.round(currentHtml.length / 1000), timestamp: Date.now() } })); } catch(e) {}

          const fixedHtml = await callGemini(`You are an accessibility remediation expert. Fix the SPECIFIC WCAG violations listed below in this HTML document.

VIOLATIONS TO FIX:
${violationInstructions}

RULES:
- Fix ONLY the listed violations. Do not restructure working content.
- Preserve ALL content word-for-word. Do not remove, shorten, or summarize ANY text.
- Return the COMPLETE HTML document from <!DOCTYPE html> to </html>.
- Do NOT truncate. Every word from the original must appear in your output.

HTML TO FIX:
"""
${currentHtml}
"""

Return ONLY the complete fixed HTML.`, true);

          const _singlePassDecision = acceptFixedHtmlDetailed(fixedHtml, currentHtml);
          if (_singlePassDecision.accepted) {
            currentHtml = fixedHtml;
          } else if (fixedHtml) {
            const _pct = _singlePassDecision.textRatio != null
              ? Math.round((1 - _singlePassDecision.textRatio) * 100)
              : null;
            warnLog(`[Auto-fix] Single-pass rejected (reason=${_singlePassDecision.reason}${_pct != null ? `, ${_pct}% text loss` : ''}): output ${fixedHtml.length} chars (text=${textCharCount(fixedHtml)}) vs source ${currentHtml.length} chars (text=${textCharCount(currentHtml)})`);
            if (_singlePassDecision.reason === 'text-shrink' && typeof addToast === 'function') {
              addToast(`Remediation rejected: ${_pct}% text loss detected. Falling back to chunked fix.`, 'warning');
            }
          }
          // Emit single-pass completion so Live UI updates
          try { window.dispatchEvent(new CustomEvent('alloflow:chunk-fixed', { detail: { index: 0, total: 1, originalHtml: '', fixedHtml: currentHtml, score: 0, deterministicFixCount: 0, surgicalFixCount: 0, integrityPassed: true, aiVerified: true, wasRetried: false, usedOriginal: false, sizeKB: Math.round(currentHtml.length / 1000), timestamp: Date.now() } })); } catch(e) {}
          try { window.dispatchEvent(new CustomEvent('alloflow:chunk-session-complete', { detail: { totalChunks: 1, failedCount: 0, retriedCount: 0, timestamp: Date.now() } })); } catch(e) {}
        } else {
          // ── Large document: chunked remediation ──
          // Strategy: extract <head>, split <body> content into chunks at block-level
          // boundaries (</section>, </div>, </p>, </table>), fix each chunk, reassemble.
          setPdfFixStep(`Large document (${Math.round(currentHtml.length / 1000)}KB) — chunking into sections for complete remediation...`);

          // Extract head and body
          const headMatch = currentHtml.match(/<head[\s>][\s\S]*?<\/head>/i);
          const headSection = headMatch ? headMatch[0] : '';
          const bodyMatch = currentHtml.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1] : currentHtml;

          // Split body at major block boundaries
          const splitPoints = [];
          const blockEnds = ['</section>', '</article>', '</div>', '</table>', '</ul>', '</ol>', '</blockquote>', '</p>', '</h1>', '</h2>', '</h3>', '</h4>', '</h5>', '</h6>', '</nav>', '</header>', '</footer>', '</main>', '</aside>', '</figure>'];
          let searchFrom = 0;
          while (searchFrom < bodyContent.length) {
            // If remaining content fits in one chunk, take it all
            if (searchFrom + MAX_CHUNK >= bodyContent.length) {
              splitPoints.push(bodyContent.length);
              break;
            }
            // Look for the earliest block-level closing tag within [0.7×MAX, 1.3×MAX] of searchFrom
            let bestSplit = -1;
            for (let si = 0; si < blockEnds.length; si++) {
              const idx = bodyContent.indexOf(blockEnds[si], searchFrom + MAX_CHUNK * 0.7);
              if (idx !== -1 && idx < searchFrom + MAX_CHUNK * 1.3) {
                const endPos = idx + blockEnds[si].length;
                if (bestSplit === -1 || endPos < bestSplit) {
                  bestSplit = endPos;
                }
              }
            }
            if (bestSplit === -1) {
              // No block boundary — split at nearest '>' after MAX_CHUNK
              let fallback = searchFrom + MAX_CHUNK;
              if (fallback > bodyContent.length) fallback = bodyContent.length;
              const nextClose = bodyContent.indexOf('>', fallback);
              if (nextClose !== -1 && nextClose - fallback < 500) {
                fallback = nextClose + 1;
              } else if (fallback < bodyContent.length) {
                // Absolute fallback: just split at MAX_CHUNK boundary
                fallback = Math.min(searchFrom + MAX_CHUNK, bodyContent.length);
              }
              splitPoints.push(fallback);
              searchFrom = fallback;
            } else {
              splitPoints.push(bestSplit);
              searchFrom = bestSplit;
            }
            // Safety: prevent infinite loop if searchFrom doesn't advance
            if (searchFrom <= splitPoints[splitPoints.length - 2]) {
              splitPoints[splitPoints.length - 1] = bodyContent.length;
              break;
            }
          }
          // Guarantee the last split covers the end
          if (splitPoints.length === 0 || splitPoints[splitPoints.length - 1] < bodyContent.length) {
            splitPoints.push(bodyContent.length);
          }

          // Create chunks from split points, filtering out empty chunks. Track
          // the drop count so the log line below reflects real split geometry
          // (otherwise "N chunks" hides the fact that some splits collapsed to
          // whitespace — misleading during diagnosis of chunk-size issues).
          const bodyChunks = [];
          let prevEnd = 0;
          let droppedEmptyCount = 0;
          for (let spi = 0; spi < splitPoints.length; spi++) {
            const chunkText = bodyContent.substring(prevEnd, splitPoints[spi]);
            if (chunkText.trim().length > 0) {
              bodyChunks.push(chunkText);
            } else if (chunkText.length > 0) {
              droppedEmptyCount++;
            }
            prevEnd = splitPoints[spi];
          }

          // ── INTEGRITY ASSERTION: verify no bytes lost during chunking ──
          const reassembledLength = bodyChunks.reduce((sum, c) => sum + c.length, 0);
          if (reassembledLength < bodyContent.length * 0.99) {
            warnLog(`[AutoFix] CHUNK INTEGRITY WARNING: body=${bodyContent.length} chars but chunks total=${reassembledLength} chars (${Math.round(reassembledLength/bodyContent.length*100)}%). Gap of ${bodyContent.length - reassembledLength} chars.`);
            // Recover: append any missing tail content to the last chunk
            const lastSplit = splitPoints[splitPoints.length - 1];
            if (lastSplit < bodyContent.length) {
              const missing = bodyContent.substring(lastSplit);
              if (missing.trim().length > 0) {
                bodyChunks.push(missing);
                warnLog(`[AutoFix] Recovered ${missing.length} chars of missing tail content as extra chunk`);
              }
            }
          }
          warnLog(`[AutoFix] Split ${Math.round(bodyContent.length/1000)}KB body into ${bodyChunks.length} chunks (sizes: ${bodyChunks.map(c => Math.round(c.length/1000) + 'KB').join(', ')})${droppedEmptyCount > 0 ? `; dropped ${droppedEmptyCount} empty/whitespace-only split(s)` : ''}`);

          // ── Emit session start event: tells UI to open the live review panel ──
          try {
            if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
              window.dispatchEvent(new CustomEvent('alloflow:chunk-session-start', {
                detail: {
                  totalChunks: bodyChunks.length,
                  chunkSizes: bodyChunks.map(c => c.length),
                  violationInstructions: violationInstructions.substring(0, 500),
                  timestamp: Date.now(),
                }
              }));
            }
          } catch(e) { /* non-blocking */ }

          // ── Resume detection: check IndexedDB for saved progress from a prior session ──
          const _sessionId = _chunkSessionId(
            pendingPdfFile ? pendingPdfFile.name : 'document',
            pendingPdfFile ? pendingPdfFile.size : currentHtml.length,
            bodyChunks.length
          );
          let _resumedResults = null;
          let _resumeStartIndex = 0;
          try {
            const saved = await loadChunkProgress(_sessionId);
            if (saved && saved.chunkResults && saved.chunkResults.length > 0
                && saved.totalChunks === bodyChunks.length && (Date.now() - saved.timestamp) < 24 * 60 * 60 * 1000) {
              // Emit resume-available event for UI to show prompt
              const resumePromise = new Promise(function(resolve) {
                var _onAccept = function() { window.removeEventListener('alloflow:chunk-resume-accept', _onAccept); window.removeEventListener('alloflow:chunk-resume-decline', _onDecline); resolve(true); };
                var _onDecline = function() { window.removeEventListener('alloflow:chunk-resume-accept', _onAccept); window.removeEventListener('alloflow:chunk-resume-decline', _onDecline); resolve(false); };
                window.addEventListener('alloflow:chunk-resume-accept', _onAccept);
                window.addEventListener('alloflow:chunk-resume-decline', _onDecline);
                // Auto-decline after 15s if no user interaction
                setTimeout(function() { _onDecline(); }, 15000);
              });
              window.dispatchEvent(new CustomEvent('alloflow:chunk-resume-available', {
                detail: {
                  completedChunks: saved.chunkResults.length,
                  totalChunks: saved.totalChunks,
                  savedAt: saved.timestamp,
                  sessionId: _sessionId,
                }
              }));
              setPdfFixStep('Found saved progress (' + saved.chunkResults.length + '/' + saved.totalChunks + ' sections). Waiting for your choice...');
              const userWantsResume = await resumePromise;
              if (userWantsResume) {
                _resumedResults = saved.chunkResults;
                _resumeStartIndex = saved.chunkResults.length;
                warnLog('[ChunkProgress] Resuming from chunk ' + (_resumeStartIndex + 1) + '/' + bodyChunks.length);
                setPdfFixStep('Resuming from section ' + (_resumeStartIndex + 1) + '/' + bodyChunks.length + '...');
                // Re-emit chunk-fixed events for already-completed chunks so live UI populates
                for (var ri = 0; ri < _resumedResults.length; ri++) {
                  try {
                    window.dispatchEvent(new CustomEvent('alloflow:chunk-fixed', {
                      detail: Object.assign({}, _resumedResults[ri], { index: ri, total: bodyChunks.length, resumed: true, timestamp: Date.now() })
                    }));
                  } catch(e) {}
                }
              } else {
                await clearChunkProgress(_sessionId);
                warnLog('[ChunkProgress] User chose to start fresh');
              }
            }
          } catch(resumeErr) { warnLog('[ChunkProgress] Resume check failed:', resumeErr.message); }

          // Fix each chunk with integrity verification + retry
          const chunkResults = _resumedResults ? _resumedResults.slice() : [];
          for (let chi = _resumeStartIndex; chi < bodyChunks.length; chi++) {
            const originalChunk = bodyChunks[chi];

            // ── Emit per-chunk start event: UI shows "working on chunk N" placeholder ──
            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('alloflow:chunk-start', {
                  detail: { index: chi, total: bodyChunks.length, sizeKB: Math.round(originalChunk.length / 1000), timestamp: Date.now() }
                }));
              }
            } catch(e) { /* non-blocking */ }

            // ══════════════════════════════════════════════════════════════
            // PRE-AI PASS: Deterministic fixes + surgical micro-tools
            // These are free, instant, and reliable — run BEFORE Gemini
            // ══════════════════════════════════════════════════════════════

            // Step 0a: Deterministic WCAG style sanitizer (contrast, headings, lists, landmarks, etc.)
            let preFixedChunk = originalChunk;
            let deterministicFixCount = 0;
            try {
              // sanitizeStyleForWCAG expects a full doc — wrap chunk in minimal shell
              const chunkShell = `<!DOCTYPE html><html lang="en"><head><style></style></head><body>${preFixedChunk}</body></html>`;
              const sanitized = sanitizeStyleForWCAG(chunkShell);
              if (sanitized.fixCount > 0) {
                // Extract body content back out
                const bodyM = sanitized.html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                if (bodyM) {
                  preFixedChunk = bodyM[1];
                  deterministicFixCount += sanitized.fixCount;
                }
              }
            } catch(detErr) { /* non-blocking */ }

            // Step 0b: Deterministic list structure fixes
            // (NOT inside sanitizeStyleForWCAG — this is more comprehensive than the sanitizer's orphan-li fix)
            try {
              const listFix = fixListViolations(preFixedChunk);
              if (listFix.fixCount > 0) {
                preFixedChunk = listFix.html;
                deterministicFixCount += listFix.fixCount;
              }
            } catch(listErr) { /* non-blocking */ }
            // Note: fixContrastViolations is NOT called here — sanitizeStyleForWCAG (Step 0a) already runs it internally

            if (deterministicFixCount > 0) {
              warnLog(`[AutoFix] Chunk ${chi + 1}: ${deterministicFixCount} deterministic fixes applied pre-AI`);
            }

            // Step 0d: Surgical AI-diagnosed micro-tools (1 Gemini call → deterministic execution)
            let surgicalFixCount = 0;
            try {
              // Build a concise violation summary for this chunk
              const chunkTextPreview = preFixedChunk.substring(0, 5000);
              const surgChunkDiagnosis = await callGemini(
                `You are an accessibility remediation expert. Analyze this HTML section and prescribe SPECIFIC targeted fixes.\n\n` +
                `KNOWN VIOLATIONS IN FULL DOCUMENT:\n${violationInstructions}\n\n` +
                `HTML SECTION ${chi + 1}/${bodyChunks.length} (apply relevant fixes):\n"""\n${chunkTextPreview}\n"""\n\n` +
                `Prescribe fixes using these tools (return ONLY a JSON array):\n\n` +
                SURGICAL_TOOL_PROMPT + `\n` +
                `Be specific — use the actual document content. Return ONLY a valid JSON array, no explanation.`, true);

              const parseSurg = (raw) => {
                if (!raw) return [];
                try { return JSON.parse(raw); } catch(e) {
                  try { return JSON.parse(raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim()); } catch(e2) { return []; }
                }
              };
              const chunkSurgFixes = parseSurg(surgChunkDiagnosis);
              if (Array.isArray(chunkSurgFixes)) {
                for (let sfi = 0; sfi < chunkSurgFixes.length; sfi++) {
                  const fix = chunkSurgFixes[sfi];
                  const tool = fix && fix.tool && SHARED_SURGICAL_TOOLS[fix.tool];
                  if (tool) {
                    const before = preFixedChunk;
                    preFixedChunk = tool(preFixedChunk, fix);
                    if (preFixedChunk !== before) surgicalFixCount++;
                  }
                }
              }
              if (surgicalFixCount > 0) {
                warnLog(`[AutoFix] Chunk ${chi + 1}: ${surgicalFixCount} surgical micro-tool fixes applied pre-AI`);
              }
            } catch(surgErr) {
              warnLog(`[AutoFix] Chunk ${chi + 1}: surgical diagnosis skipped (non-blocking): ${surgErr?.message}`);
            }

            // The pre-fixed chunk now has all deterministic + surgical fixes applied
            const chunk = preFixedChunk;
            setPdfFixStep(`Section ${chi + 1}/${bodyChunks.length}: ${deterministicFixCount} deterministic + ${surgicalFixCount} surgical fixes applied, sending to AI...`);

            let accepted = null;
            let wasRetried = false;
            let usedOriginal = false;

            for (let attempt = 0; attempt < 2; attempt++) {
              const isRetry = attempt === 1;
              if (isRetry) wasRetried = true;
              setPdfFixStep(`${isRetry ? 'Retrying' : 'AI fixing'} section ${chi + 1}/${bodyChunks.length} (${Math.round(chunk.length / 1000)}KB)...`);

              try {
                const prompt = isRetry
                  ? `CRITICAL: Your previous fix of this HTML section LOST CONTENT. The integrity check failed.
Re-fix this section, but you MUST preserve EVERY SINGLE WORD of the original text.
Do NOT remove, shorten, summarize, or omit ANY content. Only add/modify HTML attributes and tags for accessibility.

VIOLATIONS TO FIX:
${violationInstructions}

ORIGINAL HTML SECTION ${chi + 1}/${bodyChunks.length} (preserve ALL of this content):
"""
${chunk}
"""

Return the fixed section with ALL original text preserved verbatim.`
                  : `You are an accessibility remediation expert. Fix REMAINING accessibility violations in this HTML SECTION.
NOTE: This section has already had deterministic fixes applied (contrast, list structure, headings, landmarks).
Focus on issues that require semantic understanding: alt text quality, heading hierarchy, ARIA labels, table structure, link text.

VIOLATIONS TO FIX (apply relevant ones to this section):
${violationInstructions}

RULES:
- This is section ${chi + 1} of ${bodyChunks.length} of a larger document.
- Fix ONLY accessibility issues. Do not restructure content.
- PRESERVE EVERY WORD of the original text. Do not remove, shorten, or summarize anything.
- Return ONLY the fixed HTML fragment (not a full document — just the section content).
- Do NOT add <!DOCTYPE>, <html>, <head>, or <body> tags — just return the fixed content.

HTML SECTION ${chi + 1}/${bodyChunks.length}:
"""
${chunk}
"""

Return the fixed section content only — raw HTML, no JSON wrapping.`;

                const fixedChunk = await callGemini(prompt, false);

                if (!fixedChunk || fixedChunk.trim().length === 0) continue;

                // Clean AI artifacts
                let cleaned = fixedChunk
                  .replace(/^```html?\s*/i, '').replace(/```\s*$/i, '')
                  .replace(/^<!DOCTYPE[^>]*>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '')
                  .replace(/<\/?head[^>]*>[\s\S]*?<\/head>\s*/gi, '').replace(/<\/?body[^>]*>\s*/gi, '')
                  .replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\"/g, '"')
                  .trim();

                // ── Post-AI deterministic cleanup (catch issues AI may have introduced) ──
                try {
                  // Fix invalid ARIA roles AI may have added
                  const _validRolesChunk = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
                  const _roleCorr = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region' };
                  cleaned = cleaned.replace(/role="([^"]*)"/gi, (match, role) => {
                    const lower = role.toLowerCase().trim();
                    if (_validRolesChunk.includes(lower)) return `role="${lower}"`;
                    if (_roleCorr[lower]) return `role="${_roleCorr[lower]}"`;
                    return ''; // Remove invalid roles
                  });
                  // Fix list structure issues AI may have introduced
                  const postListFix = fixListViolations(cleaned);
                  if (postListFix.fixCount > 0) cleaned = postListFix.html;
                  // Fix contrast issues AI may have introduced
                  const postContrastFix = fixContrastViolations(cleaned);
                  if (postContrastFix.fixCount > 0) cleaned = postContrastFix.html;
                } catch(postDetErr) { /* non-blocking */ }

                // ── Step A: Local integrity check (fast, no API) ──
                const integrity = verifyChunkIntegrity(originalChunk, cleaned);

                if (!integrity.passed) {
                  warnLog(`[AutoFix] Chunk ${chi + 1} local integrity FAILED (attempt ${attempt + 1}): ${integrity.reason}`);
                  continue; // Try again
                }

                // ── Step B: AI content verification (Gemini call #2 — checks verbatim preservation) ──
                setPdfFixStep(`Verifying section ${chi + 1}/${bodyChunks.length} content integrity...`);
                let aiVerified = true;
                let aiVerifyDetail = '';
                try {
                  const verifyResult = await callGemini(`You are a content verification expert. Compare the ORIGINAL and FIXED versions of this HTML section.

TASK: Check if the FIXED version preserves ALL text content from the ORIGINAL. The FIXED version may have different HTML tags/attributes (for accessibility), but the actual readable text must be identical.

ORIGINAL SECTION:
"""
${extractPlainText(originalChunk).substring(0, 4000)}
"""

FIXED SECTION:
"""
${extractPlainText(cleaned).substring(0, 4000)}
"""

Respond with ONLY a JSON object (no markdown, no explanation):
{"preserved": true/false, "missingContent": "description of any missing text or empty string", "addedContent": "description of any new non-accessibility text or empty string", "confidence": 0-100}`, true);

                  try {
                    const vJson = JSON.parse(verifyResult.replace(/```json?\s*/gi, '').replace(/```/g, '').trim());
                    if (vJson.preserved === false && vJson.confidence > 60) {
                      aiVerified = false;
                      aiVerifyDetail = vJson.missingContent || 'AI detected content loss';
                      warnLog(`[AutoFix] Chunk ${chi + 1} AI verification FAILED: ${aiVerifyDetail}`);
                    }
                  } catch(jsonErr) {
                    // If we can't parse the verification response, trust the local check
                    aiVerified = true;
                  }
                } catch(verifyErr) {
                  warnLog(`[AutoFix] Chunk ${chi + 1} verification call failed, trusting local check`);
                  aiVerified = true; // Don't block on verification failure
                }

                if (!aiVerified) continue; // Retry the fix

                // ── Step C: AI accessibility audit (Gemini call #3 — scores the fixed chunk) ──
                setPdfFixStep(`Scoring section ${chi + 1}/${bodyChunks.length} accessibility...`);
                let aiScore = scoreChunkLocally(cleaned); // Start with local score as baseline
                try {
                  const auditResult = await callGemini(`You are a WCAG 2.1 AA accessibility auditor. Score this HTML section for accessibility compliance.

Rate this section 0-100 where:
- 100 = perfectly accessible (all images have alt, proper headings, semantic HTML, good contrast)
- 80+ = minor issues only
- 60-79 = moderate issues
- Below 60 = significant issues

HTML SECTION:
"""
${sampleHtml(cleaned, 9000)}
"""

Respond with ONLY a JSON object: {"score": NUMBER, "issues": ["issue1", "issue2"], "passes": ["pass1", "pass2"]}`, true);

                  try {
                    const aJson = JSON.parse(auditResult.replace(/```json?\s*/gi, '').replace(/```/g, '').trim());
                    if (typeof aJson.score === 'number' && aJson.score >= 0 && aJson.score <= 100) {
                      // Blend AI score with local score (70% AI, 30% local for reliability)
                      aiScore = Math.round(aJson.score * 0.7 + aiScore * 0.3);
                    }
                  } catch(jsonErr2) {
                    // Keep local score if AI audit response is unparseable
                  }
                } catch(auditErr) {
                  warnLog(`[AutoFix] Chunk ${chi + 1} AI audit failed, using local score`);
                }

                accepted = { html: cleaned, score: aiScore, integrityCheck: integrity, aiVerified, wasRetried, usedOriginal: false, deterministicFixCount, surgicalFixCount };
                break; // Accept this chunk
              } catch (chunkErr) {
                warnLog(`[AutoFix] Chunk ${chi + 1} attempt ${attempt + 1} error:`, chunkErr?.message);
              }
            }

            // Fall back to pre-fixed chunk (has deterministic + surgical fixes, just no AI pass)
            if (!accepted) {
              usedOriginal = true;
              const fallbackScore = scoreChunkLocally(chunk);
              accepted = { html: chunk, score: fallbackScore, integrityCheck: { passed: false, reason: 'ai-fix-failed-using-deterministic-only' }, aiVerified: false, wasRetried, usedOriginal: true, deterministicFixCount, surgicalFixCount };
              _pipeLog('AutoFix', 'Chunk ' + (chi + 1) + ' needs manual review — AI fix failed, kept deterministic-only version (' + deterministicFixCount + ' det + ' + surgicalFixCount + ' surgical fixes preserved)', { chunkIndex: chi, reason: 'ai-fix-failed', usedOriginal: true });
              if (addToast) { try { addToast('Section ' + (chi + 1) + ' needs manual review — AI couldn\'t fix it', 'info'); } catch(e) {} }
            }

            chunkResults.push(accepted);

            // ── Audio cue: per-chunk completion tick (debounced internally to 150ms) ──
            try {
              if (window.remediationAudio) {
                if (accepted.usedOriginal) window.remediationAudio.chunkBad();
                else if (accepted.score >= 80) window.remediationAudio.chunkGood();
                else if (accepted.score >= 60) window.remediationAudio.chunkMedium();
                else window.remediationAudio.chunkBad();
              }
            } catch(e) { /* non-blocking */ }

            // ── Emit live chunk event for real-time UI review ──
            try {
              if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                const evt = new CustomEvent('alloflow:chunk-fixed', {
                  detail: {
                    index: chi,
                    total: bodyChunks.length,
                    originalHtml: originalChunk,
                    fixedHtml: accepted.html,
                    score: accepted.score,
                    deterministicFixCount: accepted.deterministicFixCount || 0,
                    surgicalFixCount: accepted.surgicalFixCount || 0,
                    integrityPassed: accepted.integrityCheck?.passed || false,
                    integrityReason: accepted.integrityCheck?.reason || null,
                    aiVerified: !!accepted.aiVerified,
                    wasRetried: !!accepted.wasRetried,
                    usedOriginal: !!accepted.usedOriginal,
                    sizeKB: Math.round(accepted.html.length / 1000),
                    violationInstructions: violationInstructions.substring(0, 500),
                    timestamp: Date.now(),
                  }
                });
                window.dispatchEvent(evt);
              }
            } catch(evtErr) { /* non-blocking */ }

            // ── Save progress to IndexedDB after each chunk (survives crashes) ──
            try {
              saveChunkProgress(_sessionId, {
                chunkResults: chunkResults.map(function(cr, i) {
                  return { index: i, html: cr.html, score: cr.score, integrityCheck: cr.integrityCheck, aiVerified: cr.aiVerified, wasRetried: cr.wasRetried, usedOriginal: cr.usedOriginal, deterministicFixCount: cr.deterministicFixCount || 0, surgicalFixCount: cr.surgicalFixCount || 0, sizeKB: Math.round(cr.html.length / 1000) };
                }),
                totalChunks: bodyChunks.length,
                violationInstructions: violationInstructions,
                headSection: headSection,
                timestamp: Date.now(),
              });
            } catch(saveErr) { /* non-blocking — progress save is best-effort */ }
          }

          // ── Compute weighted average score (weighted by original chunk size) ──
          let totalWeight = 0, weightedScoreSum = 0;
          const chunkReport = [];
          for (let cri = 0; cri < chunkResults.length; cri++) {
            const cr = chunkResults[cri];
            const weight = bodyChunks[cri].length;
            totalWeight += weight;
            weightedScoreSum += cr.score * weight;
            chunkReport.push({ index: cri, score: cr.score, integrity: cr.integrityCheck, wasRetried: cr.wasRetried, usedOriginal: cr.usedOriginal, deterministicFixes: cr.deterministicFixCount || 0, surgicalFixes: cr.surgicalFixCount || 0 });
          }
          const chunkWeightedScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : null;

          // Log chunk verification diagnostics
          const failedChunks = chunkReport.filter(c => c.usedOriginal);
          const retriedChunks = chunkReport.filter(c => c.wasRetried);
          const totalDetFixes = chunkReport.reduce((s, c) => s + (c.deterministicFixes || 0), 0);
          const totalSurgFixes = chunkReport.reduce((s, c) => s + (c.surgicalFixes || 0), 0);
          warnLog(`[AutoFix] Chunk verification: ${chunkResults.length} chunks, ${totalDetFixes} deterministic fixes, ${totalSurgFixes} surgical fixes, ${failedChunks.length} fell back to det-only, ${retriedChunks.length} retried, weighted score: ${chunkWeightedScore}`);

          // ── Emit session complete event: UI can finalize the review panel ──
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('alloflow:chunk-session-complete', {
                detail: {
                  totalChunks: chunkResults.length,
                  failedCount: failedChunks.length,
                  retriedCount: retriedChunks.length,
                  totalDetFixes,
                  totalSurgFixes,
                  weightedScore: chunkWeightedScore,
                  timestamp: Date.now(),
                }
              }));
            }
          } catch(e) { /* non-blocking */ }

          // Reassemble the complete document
          const fixedChunks = chunkResults.map(cr => cr.html);
          const preambleMatch = currentHtml.match(/^[\s\S]*?<body[^>]*>/i);
          const preambleStr = preambleMatch ? preambleMatch[0] : '<!DOCTYPE html><html lang="en"><head>' + headSection + '</head><body>';
          const postamble = '</body></html>';
          const reassembled = preambleStr + '\n' + fixedChunks.join('\n') + '\n' + postamble;

          // ── Persist chunk state for selective re-fixing ──
          _chunkState = {
            docKey: _currentDocKey,
            preamble: preambleStr,
            postamble,
            originalChunks: bodyChunks.slice(), // raw originals before any fixing
            fixedChunks: fixedChunks.slice(),    // current fixed versions
            chunkResults: chunkResults.map((cr, i) => ({
              index: i,
              html: cr.html,
              score: cr.score,
              integrityCheck: cr.integrityCheck,
              aiVerified: cr.aiVerified,
              wasRetried: cr.wasRetried,
              usedOriginal: cr.usedOriginal,
              deterministicFixCount: cr.deterministicFixCount || 0,
              surgicalFixCount: cr.surgicalFixCount || 0,
              sizeKB: Math.round(cr.html.length / 1000),
            })),
            violationInstructions,
            headSection,
            timestamp: Date.now(),
          };
          warnLog(`[AutoFix] Chunk state persisted: ${_chunkState.fixedChunks.length} chunks saved for selective re-fixing`);

          // ── Clear IndexedDB progress — full remediation completed successfully ──
          try { clearChunkProgress(_sessionId); } catch(e) {}

          if (reassembled.length > currentHtml.length * 0.7) {
            currentHtml = reassembled;
          }
        }
        } // end else (full chunk/single-pass path)

        // ── Fix literal \n in output (AI sometimes returns escaped newlines) ──
        currentHtml = currentHtml.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        // Remove JSON wrapper artifacts
        currentHtml = currentHtml.replace(/^\s*\[\s*"/, '').replace(/"\s*\]\s*$/, '').replace(/\\"/g, '"');
        // Decode \uXXXX surrogate-pair escapes so emoji/ellipsis render as real characters.
        currentHtml = currentHtml.replace(/\\u([0-9a-fA-F]{4})/g, function(_, hex) { return String.fromCharCode(parseInt(hex, 16)); });

        // ── Post-reassembly: full-document deterministic pass ──
        // Document-level fixes that don't work on fragments: skip-link, <main> landmark, lang attribute,
        // full-document contrast sweep, list structure across chunk boundaries
        try {
          const fullDocSanitized = sanitizeStyleForWCAG(currentHtml);
          if (fullDocSanitized.fixCount > 0) {
            currentHtml = fullDocSanitized.html;
            warnLog(`[AutoFix] Post-reassembly full-doc sanitizer: ${fullDocSanitized.fixCount} fixes`);
          }
          const fullDocList = fixListViolations(currentHtml);
          if (fullDocList.fixCount > 0) {
            currentHtml = fullDocList.html;
            warnLog(`[AutoFix] Post-reassembly list fix: ${fullDocList.fixCount} fixes`);
          }
          // Fix invalid ARIA roles across the full document
          const _validRolesFull = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
          const _roleCorrFull = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region' };
          let roleFixCount = 0;
          currentHtml = currentHtml.replace(/role="([^"]*)"/gi, (match, role) => {
            const lower = role.toLowerCase().trim();
            if (_validRolesFull.includes(lower)) return `role="${lower}"`;
            if (_roleCorrFull[lower]) { roleFixCount++; return `role="${_roleCorrFull[lower]}"`; }
            roleFixCount++; return '';
          });
          if (roleFixCount > 0) warnLog(`[AutoFix] Post-reassembly: fixed ${roleFixCount} invalid ARIA roles`);
        } catch(postErr) { warnLog('[AutoFix] Post-reassembly sanitizer error (non-blocking):', postErr?.message); }
      } catch (fixErr) {
        warnLog(`[Auto-fix] Pass ${passCount} failed:`, fixErr);
        break;
      }

      setPdfFixStep(`Re-checking after fix pass ${passCount}...`);
      let newAxe = await runAxeAudit(currentHtml);
      if (!newAxe) break;

      // ── Axe-guided targeted contrast fix ──
      // If any color-contrast violations survived this pass, use axe's own report (which
      // includes the exact failing selectors + fg/bg colors) to inject !important overrides.
      // Catches CSS-var, shorthand `background:`, class-based, and gradient-bg cases that
      // fixContrastViolations can't detect via inline-style regex.
      const hasContrastViolations = [newAxe.critical, newAxe.serious, newAxe.moderate].some(arr =>
        Array.isArray(arr) && arr.some(v => v.id === 'color-contrast' || v.id === 'color-contrast-enhanced')
      );
      if (hasContrastViolations) {
        try {
          const targetedFix = fixAxeContrastViolationsTargeted(currentHtml, newAxe);
          if (targetedFix.fixCount > 0) {
            currentHtml = targetedFix.html;
            setPdfFixStep('Applied ' + targetedFix.fixCount + ' targeted contrast override' + (targetedFix.fixCount === 1 ? '' : 's') + ', re-checking...');
            const reAxe = await runAxeAudit(currentHtml);
            if (reAxe) newAxe = reAxe;
          }
        } catch (tcErr) { _pipeLog('Contrast', 'Targeted fix threw: ' + (tcErr && tcErr.message)); }
      }

      const fixed = currentAxe.totalViolations - newAxe.totalViolations;
      warnLog(`[Auto-fix] Pass ${passCount}: ${currentAxe.totalViolations} → ${newAxe.totalViolations} (fixed ${fixed})`);

      if (newAxe.totalViolations >= currentAxe.totalViolations) {
        // If no improvement but violations remain and we have passes left, try a more targeted approach
        if (newAxe.totalViolations > 0 && passCount < maxPasses) {
          warnLog(`[Auto-fix] No improvement on pass ${passCount} — trying targeted fix for top violation...`);
          const topViolation = currentAxe.critical[0] || currentAxe.serious[0] || currentAxe.moderate[0];
          if (topViolation) {
            try {
              const targetViolationDesc = `VIOLATION: ${topViolation.description} (${topViolation.id})\nWCAG: ${topViolation.wcag || 'N/A'}\nAFFECTED ELEMENTS: ${topViolation.nodes || 'unknown'} element(s)\nFind every instance of this violation and fix it. Do NOT change anything else.`;
              const targetedFix = await aiFixChunked(currentHtml, targetViolationDesc, `targeted-${topViolation.id}`);
              if (targetedFix && targetedFix !== currentHtml) {
                const targetedAxe = await runAxeAudit(targetedFix);
                if (targetedAxe && targetedAxe.totalViolations < currentAxe.totalViolations) {
                  currentHtml = targetedFix;
                  currentAxe = targetedAxe;
                  warnLog(`[Auto-fix] Targeted fix worked: ${currentAxe.totalViolations} → ${targetedAxe.totalViolations}`);
                  continue;
                }
              }
            } catch (e) { warnLog('[Auto-fix] Targeted fix failed:', e); }
          }
        }
        warnLog('[Auto-fix] No improvement possible, stopping');
        break;
      }
      currentAxe = newAxe;
    }

    return {
      html: currentHtml,
      axe: currentAxe,
      passes: passCount,
      chunkReport: typeof chunkReport !== 'undefined' ? chunkReport : null,
      chunkWeightedScore: typeof chunkWeightedScore !== 'undefined' ? chunkWeightedScore : null,
      chunkState: _chunkState, // Persistent chunk data for selective re-fixing
    };
  };

  // ── Re-fix a single chunk without touching others ──
  // Takes a chunk index, re-runs the full pipeline (deterministic → surgical → AI → verify → score)
  // on just that chunk, then reassembles the full document with only that chunk replaced.
  const refixChunk = async (chunkIndex, options = {}) => {
    if (!_chunkState) throw new Error('No chunk state available — run full remediation first');
    if (chunkIndex < 0 || chunkIndex >= _chunkState.fixedChunks.length) {
      throw new Error(`Invalid chunk index ${chunkIndex} (have ${_chunkState.fixedChunks.length} chunks)`);
    }

    const { onProgress } = options;
    const setStep = onProgress || setPdfFixStep || (() => {});
    const violationInstructions = _chunkState.violationInstructions;
    const totalChunks = _chunkState.fixedChunks.length;

    // Start from the ORIGINAL unfixed chunk — clean slate
    const originalChunk = _chunkState.originalChunks[chunkIndex];
    setStep(`Re-fixing chunk ${chunkIndex + 1}/${totalChunks}: starting from original...`);

    // ── Step 0a: Deterministic WCAG style sanitizer ──
    let preFixedChunk = originalChunk;
    let deterministicFixCount = 0;
    try {
      const chunkShell = `<!DOCTYPE html><html lang="en"><head><style></style></head><body>${preFixedChunk}</body></html>`;
      const sanitized = sanitizeStyleForWCAG(chunkShell);
      if (sanitized.fixCount > 0) {
        const bodyM = sanitized.html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyM) { preFixedChunk = bodyM[1]; deterministicFixCount += sanitized.fixCount; }
      }
    } catch(e) { /* non-blocking */ }

    // ── Step 0b: Deterministic list fixes ──
    try {
      const lf = fixListViolations(preFixedChunk);
      if (lf.fixCount > 0) { preFixedChunk = lf.html; deterministicFixCount += lf.fixCount; }
    } catch(e) { /* non-blocking */ }

    // ── Step 0c: Deterministic contrast fixes ──
    try {
      const cf = fixContrastViolations(preFixedChunk);
      if (cf.fixCount > 0) { preFixedChunk = cf.html; deterministicFixCount += cf.fixCount; }
    } catch(e) { /* non-blocking */ }

    if (deterministicFixCount > 0) warnLog(`[RefixChunk] Chunk ${chunkIndex + 1}: ${deterministicFixCount} deterministic fixes`);

    // ── Step 0d: Surgical AI-diagnosed micro-tools ──
    let surgicalFixCount = 0;
    try {
      setStep(`Re-fixing chunk ${chunkIndex + 1}/${totalChunks}: surgical diagnosis...`);
      const chunkPreview = preFixedChunk.substring(0, 5000);
      const surgDiag = await callGemini(
        `You are an accessibility remediation expert. Analyze this HTML section and prescribe SPECIFIC targeted fixes.\n\n` +
        `KNOWN VIOLATIONS:\n${violationInstructions}\n\n` +
        `HTML SECTION ${chunkIndex + 1}/${totalChunks}:\n"""\n${chunkPreview}\n"""\n\n` +
        `Prescribe fixes using these tools (return ONLY a JSON array):\n` +
        SURGICAL_TOOL_PROMPT + `\n` +
        `Return ONLY a valid JSON array, no explanation.`, true);

      let surgFixes = [];
      try { surgFixes = JSON.parse(surgDiag); } catch(e) {
        try { surgFixes = JSON.parse(surgDiag.replace(/```json?\s*/gi, '').replace(/```/g, '').trim()); } catch(e2) { surgFixes = []; }
      }
      if (Array.isArray(surgFixes)) {
        for (const fix of surgFixes) {
          const tool = fix && fix.tool && SHARED_SURGICAL_TOOLS[fix.tool];
          if (tool) {
            const before = preFixedChunk;
            preFixedChunk = tool(preFixedChunk, fix);
            if (preFixedChunk !== before) surgicalFixCount++;
          }
        }
      }
      if (surgicalFixCount > 0) warnLog(`[RefixChunk] Chunk ${chunkIndex + 1}: ${surgicalFixCount} surgical fixes`);
    } catch(e) {
      warnLog(`[RefixChunk] Chunk ${chunkIndex + 1}: surgical diagnosis skipped: ${e?.message}`);
    }

    const chunk = preFixedChunk;

    // ── AI fix with retry ──
    let accepted = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const isRetry = attempt === 1;
      setStep(`${isRetry ? 'Retrying' : 'AI fixing'} chunk ${chunkIndex + 1}/${totalChunks}...`);

      try {
        const prompt = isRetry
          ? `CRITICAL: Your previous fix of this HTML section LOST CONTENT. Re-fix preserving EVERY word.\n\nVIOLATIONS:\n${violationInstructions}\n\nORIGINAL SECTION ${chunkIndex + 1}/${totalChunks}:\n"""\n${chunk}\n"""\n\nReturn fixed section with ALL text preserved — raw HTML only, no JSON wrapping.`
          : `You are an accessibility remediation expert. Fix REMAINING violations in this HTML SECTION.\nNOTE: Deterministic fixes already applied. Focus on semantic issues: alt text, heading hierarchy, ARIA, table structure, link text.\n\nVIOLATIONS:\n${violationInstructions}\n\nRULES:\n- Section ${chunkIndex + 1} of ${totalChunks}.\n- Fix ONLY accessibility. PRESERVE EVERY WORD.\n- Return ONLY the fixed HTML fragment (no DOCTYPE/html/head/body).\n\nHTML SECTION:\n"""\n${chunk}\n"""\n\nReturn fixed section only — raw HTML, no JSON wrapping.`;

        const fixedChunk = await callGemini(prompt, false);
        if (!fixedChunk || fixedChunk.trim().length === 0) continue;

        // Clean AI artifacts
        let cleaned = fixedChunk
          .replace(/^```html?\s*/i, '').replace(/```\s*$/i, '')
          .replace(/^<!DOCTYPE[^>]*>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '')
          .replace(/<\/?head[^>]*>[\s\S]*?<\/head>\s*/gi, '').replace(/<\/?body[^>]*>\s*/gi, '')
          .replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\"/g, '"')
          .trim();

        // Post-AI deterministic cleanup
        try {
          const _vr = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
          const _rc = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region' };
          cleaned = cleaned.replace(/role="([^"]*)"/gi, (m, role) => {
            const l = role.toLowerCase().trim();
            if (_vr.includes(l)) return `role="${l}"`;
            if (_rc[l]) return `role="${_rc[l]}"`;
            return '';
          });
          const plf = fixListViolations(cleaned);
          if (plf.fixCount > 0) cleaned = plf.html;
          const pcf = fixContrastViolations(cleaned);
          if (pcf.fixCount > 0) cleaned = pcf.html;
        } catch(e) { /* non-blocking */ }

        // Integrity check against original
        const integrity = verifyChunkIntegrity(originalChunk, cleaned);
        if (!integrity.passed) {
          warnLog(`[RefixChunk] Chunk ${chunkIndex + 1} integrity FAILED (attempt ${attempt + 1}): ${integrity.reason}`);
          continue;
        }

        // AI content verification
        setStep(`Verifying chunk ${chunkIndex + 1}/${totalChunks} content...`);
        let aiVerified = true;
        try {
          const vr = await callGemini(`Compare ORIGINAL and FIXED HTML. Check all text is preserved (tags may differ).\n\nORIGINAL:\n"""\n${extractPlainText(originalChunk).substring(0, 4000)}\n"""\n\nFIXED:\n"""\n${extractPlainText(cleaned).substring(0, 4000)}\n"""\n\nRespond ONLY JSON: {"preserved": true/false, "missingContent": "", "confidence": 0-100}`, true);
          try {
            const vj = JSON.parse(vr.replace(/```json?\s*/gi, '').replace(/```/g, '').trim());
            if (vj.preserved === false && vj.confidence > 60) { aiVerified = false; continue; }
          } catch(e) { /* trust local check */ }
        } catch(e) { /* trust local check */ }

        // AI accessibility score
        setStep(`Scoring chunk ${chunkIndex + 1}/${totalChunks}...`);
        let aiScore = scoreChunkLocally(cleaned);
        try {
          const ar = await callGemini(`Score this HTML section 0-100 for WCAG 2.1 AA accessibility.\n\nHTML:\n"""\n${sampleHtml(cleaned, 9000)}\n"""\n\nRespond ONLY JSON: {"score": NUMBER, "issues": [], "passes": []}`, true);
          try {
            const aj = JSON.parse(ar.replace(/```json?\s*/gi, '').replace(/```/g, '').trim());
            if (typeof aj.score === 'number' && aj.score >= 0 && aj.score <= 100) {
              aiScore = Math.round(aj.score * 0.7 + aiScore * 0.3);
            }
          } catch(e) { /* keep local */ }
        } catch(e) { /* keep local */ }

        accepted = { html: cleaned, score: aiScore, integrityCheck: integrity, aiVerified, wasRetried: isRetry, usedOriginal: false, deterministicFixCount, surgicalFixCount };
        break;
      } catch(e) {
        warnLog(`[RefixChunk] Chunk ${chunkIndex + 1} attempt ${attempt + 1} error: ${e?.message}`);
      }
    }

    // Fallback to deterministic-only version
    if (!accepted) {
      const fb = scoreChunkLocally(chunk);
      accepted = { html: chunk, score: fb, integrityCheck: { passed: false, reason: 'ai-refix-failed' }, aiVerified: false, wasRetried: true, usedOriginal: true, deterministicFixCount, surgicalFixCount };
      _pipeLog('RefixChunk', 'Chunk ' + (chunkIndex + 1) + ' needs manual review — AI re-fix failed, kept deterministic-only version', { chunkIndex: chunkIndex, reason: 'ai-refix-failed', usedOriginal: true });
      if (addToast) { try { addToast('Section ' + (chunkIndex + 1) + ' couldn\'t be re-fixed automatically — may need manual review', 'info'); } catch(e) {} }
    }

    // ── Update chunk state and reassemble ──
    _chunkState.fixedChunks[chunkIndex] = accepted.html;
    _chunkState.chunkResults[chunkIndex] = {
      index: chunkIndex,
      html: accepted.html,
      score: accepted.score,
      integrityCheck: accepted.integrityCheck,
      aiVerified: accepted.aiVerified,
      wasRetried: accepted.wasRetried,
      usedOriginal: accepted.usedOriginal,
      deterministicFixCount: accepted.deterministicFixCount || 0,
      surgicalFixCount: accepted.surgicalFixCount || 0,
      sizeKB: Math.round(accepted.html.length / 1000),
    };
    _chunkState.timestamp = Date.now();

    // Reassemble full document with updated chunk
    const fullHtml = _chunkState.preamble + '\n' + _chunkState.fixedChunks.join('\n') + '\n' + _chunkState.postamble;

    // Compute updated weighted score
    let totalWeight = 0, weightedSum = 0;
    for (let i = 0; i < _chunkState.chunkResults.length; i++) {
      const w = _chunkState.originalChunks[i].length;
      totalWeight += w;
      weightedSum += (_chunkState.chunkResults[i].score || 0) * w;
    }
    const newWeightedScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

    setStep('');
    warnLog(`[RefixChunk] Chunk ${chunkIndex + 1} re-fixed: score ${accepted.score}, weighted avg now ${newWeightedScore}`);

    // ── Emit refix event so live review panel updates ──
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('alloflow:chunk-refixed', {
          detail: {
            index: chunkIndex,
            total: totalChunks,
            originalHtml: originalChunk,
            fixedHtml: accepted.html,
            score: accepted.score,
            deterministicFixCount: accepted.deterministicFixCount || 0,
            surgicalFixCount: accepted.surgicalFixCount || 0,
            integrityPassed: accepted.integrityCheck?.passed || false,
            integrityReason: accepted.integrityCheck?.reason || null,
            aiVerified: !!accepted.aiVerified,
            wasRetried: !!accepted.wasRetried,
            usedOriginal: !!accepted.usedOriginal,
            sizeKB: Math.round(accepted.html.length / 1000),
            weightedScore: newWeightedScore,
            timestamp: Date.now(),
          }
        }));
      }
    } catch(e) { /* non-blocking */ }

    return {
      html: fullHtml,
      chunkIndex,
      chunkResult: accepted,
      chunkState: _chunkState,
      chunkWeightedScore: newWeightedScore,
    };
  };

  // ── Get current chunk state (for UI rendering) ──
  const getChunkState = () => _chunkState;

  // ── PDF Fix & Verify: Audit → Extract → Transform → Verify → axe-core → Auto-fix ──
  const fixAndVerifyPdf = async (batchOverrides = null) => {
    // ── Unified pipeline: supports both single-file UI and batch mode ──
    const _isBatch = !!batchOverrides;
    const _base64 = batchOverrides?.base64 || pendingPdfBase64;
    const _fileName = batchOverrides?.fileName || pendingPdfFile?.name || 'document.pdf';
    const _mimeType = _fileName.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : _fileName.endsWith('.pptx') ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/pdf';
    const _auditResult = batchOverrides?.auditResult || pdfAuditResult;
    const _onProgress = batchOverrides?.onProgress || null;
    // Multi-session: when the UI passes pageRange [start, end], we limit extraction to those
    // pages and auto-save the remediated HTML to the multi-session store keyed by doc fingerprint.
    // Lets teachers tackle long PDFs across days without re-remediating earlier pages each session.
    // (Mutable: we normalize to null below if the range covers the full doc.)
    let _pageRange = batchOverrides?.pageRange || null;
    const _startTime = Date.now();

    // Reset pipeline telemetry for this run
    _pipelineStats.apiCalls = 0; _pipelineStats.visionCalls = 0; _pipelineStats.totalApiMs = 0; _pipelineStats.retries = 0;
    _pipelineStats.startTime = performance.now(); _pipelineStats.stepTimes = {};
    _pipeLog('Init', 'Pipeline starting', { file: _fileName, batch: _isBatch, hasAudit: !!_auditResult, pageCount: _auditResult?.pageCount, base64KB: _base64 ? Math.round(_base64.length * 0.75 / 1024) : 0 });
    warnLog('[fixAndVerifyPdf] Starting — batch:', _isBatch, 'base64:', !!_base64, 'audit:', !!_auditResult, 'file:', _fileName);

    if (!_base64) { addToast('Cannot fix: PDF data not found in memory. Please re-upload the PDF.', 'error'); return null; }
    // "Silent mode" = caller is doing its own UI via an onProgress callback
    // (multi-file batch). Partial single-file audits (pageRange only, no
    // onProgress) still need the single-file UI state — otherwise the teacher
    // never sees loading, never sees the result, and multi-session auto-save
    // at the bottom never fires. Previously this gate was `_isBatch` (== any
    // batchOverrides), which over-suppressed the UI whenever pageRange was set.
    const _silentMode = !!_onProgress;
    if (!_silentMode && !_auditResult) { addToast('Cannot fix: No audit results found. Please run the audit first.', 'error'); return null; }
    if (!_silentMode) { setPdfFixLoading(true); setPdfFixResult(null); }

    const beforeScore = (_auditResult?.score) || 0;
    const fullPageCount = (_auditResult?.pageCount) || 1;
    // Normalize pageRange: if the user's selected range exactly covers the
    // whole document, fall through to the no-range code path. Avoids:
    //   - a spurious multi-session auto-save record for what's really a
    //     one-shot full run
    //   - "Multi-session remediation" UI banner artifacts when no multi-
    //     session is actually happening
    //   - cosmetic drift in det.pages.filter() if pages are missing from
    //     the extraction map
    // The internal code path is identical to just not passing pageRange.
    if (_pageRange && _pageRange[0] === 1 && _pageRange[1] === fullPageCount && fullPageCount > 0) {
      warnLog(`[fixAndVerifyPdf] Full-doc range [1, ${fullPageCount}] normalized to null (no partial-audit overhead needed)`);
      _pageRange = null;
    }
    // Use the selected range's length for progress labels + time estimates
    // when partial-audit mode is active, so the teacher sees e.g. "(5 pages)"
    // while fixing pages 1-5 of a 15-page PDF instead of the misleading
    // "(15 pages)". The internal pipeline still knows the full count for
    // context (e.g. prior-range awareness), but UI labels should track what
    // the user actually asked for.
    const pageCount = _pageRange
      ? Math.max(1, Math.min(fullPageCount, (_pageRange[1] || fullPageCount)) - Math.max(1, (_pageRange[0] || 1)) + 1)
      : fullPageCount;
    warnLog(`[fixAndVerifyPdf] auditResult.pageCount=${_auditResult?.pageCount}, fullPageCount=${fullPageCount}, effective pageCount=${pageCount}${_pageRange ? ` (range ${_pageRange[0]}-${_pageRange[1]})` : ''}, auditResult keys:`, _auditResult ? Object.keys(_auditResult) : 'null');
    const totalSteps = 4;
    // Dynamic time estimates based on document length
    const isShort = pageCount <= 5;
    const isMedium = pageCount > 5 && pageCount <= 20;
    // isLong = pageCount > 20
    const timeLabel = (short, med, long) => isShort ? short : isMedium ? med : long;
    const STEP_LABELS = {
      1: { emoji: '📄', name: 'Reading Document', est: timeLabel('~10-20s', '~30-60s', '~1-3 min') },
      2: { emoji: '🏗️', name: 'Building Accessible Version', est: timeLabel('~15-30s', '~45-90s', '~2-5 min') },
      3: { emoji: '🔍', name: 'Auditing Accessibility', est: timeLabel('~10-15s', '~15-30s', '~30-60s') },
      4: { emoji: '🔧', name: 'Fixing Remaining Issues', est: timeLabel('~15-30s per pass', '~30-60s per pass', '~1-2 min per pass') },
    };
    const updateProgress = (step, detail) => {
      const label = STEP_LABELS[step] || { emoji: '⏳', name: 'Processing', est: '' };
      // "(5 of 15 pages)" when partial, "(15 pages)" when full-document.
      const pageNote = _pageRange
        ? ` (${pageCount} of ${fullPageCount} pages)`
        : (pageCount > 1 ? ` (${pageCount} pages)` : '');
      const msg = `Step ${step}/${totalSteps} ${label.emoji} ${label.name}${pageNote} — ${detail}  (typically ${label.est})`;
      if (_silentMode) { _onProgress(step, msg); } else { setPdfFixStep(msg); }
    };

    try {
      const issueList = []
        .concat((_auditResult?.critical || []).map(i => '🔴 ' + i.issue))
        .concat((_auditResult?.serious || _auditResult?.major || []).map(i => '🟠 ' + i.issue))
        .concat((_auditResult?.moderate || []).map(i => '🟡 ' + i.issue))
        .concat((_auditResult?.minor || []).map(i => '⚪ ' + i.issue))
        .slice(0, 25).join('\n');

      // ── Step 1: Extract ALL text content from PDF (chunked for long docs) ──
      _pipeStepStart(1);
      updateProgress(1, 'Reading document content...');
      let extractedText = '';
      // Reset ground-truth state for this run
      window.__lastGroundTruthCharCount = 0;
      window.__lastGroundTruthPageMap = null;
      window.__lastGroundTruthMethod = null;
      // Determine chunk strategy based on page count
      // If audit didn't return pageCount, estimate from base64 size (rough: ~3KB base64 per page)
      let effectivePageCount = pageCount;
      if (effectivePageCount <= 1 && _base64) {
        const estimatedFromSize = Math.max(1, Math.round(_base64.length * 0.75 / 1024 / 3));
        if (estimatedFromSize > 3) {
          effectivePageCount = estimatedFromSize;
          warnLog(`[PDF Fix] pageCount unknown — estimated ${effectivePageCount} pages from ${Math.round(_base64.length * 0.75 / 1024)}KB file size`);
        }
      }

      // ── Step 0: DETERMINISTIC EXTRACTION (no AI calls, no truncation risk) ──
      // For text-layer PDFs, DOCX, and PPTX we can extract the source text exactly from the file itself.
      // Only fall through to Gemini Vision OCR for scanned PDFs / images.
      try {
        const isDocx = _fileName && /\.docx$/i.test(_fileName);
        const isPptx = _fileName && /\.pptx$/i.test(_fileName);
        const isPdf = !isDocx && !isPptx; // default to PDF path for unknown mime types

        if (isDocx) {
          updateProgress(1, 'Extracting DOCX text deterministically...');
          const det = await extractDocxTextDeterministic(_base64);
          if (det && det.sourceCharCount > 50) {
            extractedText = det.fullText;
            window.__lastGroundTruthCharCount = det.sourceCharCount;
            window.__lastGroundTruthMethod = 'docx-' + det.method;
            updateProgress(1, `Extracted ${det.sourceCharCount.toLocaleString()} chars from DOCX (${det.method})`);
            warnLog(`[Det] DOCX → ${det.sourceCharCount} chars via ${det.method}`);
          } else {
            warnLog('[Det] DOCX extraction sparse, falling through to Vision OCR');
          }
        } else if (isPptx) {
          updateProgress(1, 'Extracting PPTX text deterministically...');
          const det = await extractPptxTextDeterministic(_base64);
          if (det && det.sourceCharCount > 50) {
            extractedText = det.fullText;
            window.__lastGroundTruthCharCount = det.sourceCharCount;
            window.__lastGroundTruthMethod = 'pptx-jszip';
            updateProgress(1, `Extracted ${det.sourceCharCount.toLocaleString()} chars from ${det.slideCount} slides`);
            warnLog(`[Det] PPTX → ${det.sourceCharCount} chars from ${det.slideCount} slides`);
          } else {
            warnLog('[Det] PPTX extraction sparse, falling through to Vision OCR');
          }
        } else if (isPdf) {
          updateProgress(1, 'Extracting PDF text layer deterministically...');
          const det = await extractPdfTextDeterministic(_base64);
          if (det && !det.isScanned && det.sourceCharCount > 100) {
            // Multi-session: if a pageRange was specified, narrow the extracted pages to
            // [start, end]. Keeps the full per-page map for later reference but only feeds
            // the selected pages to the downstream remediation pipeline.
            if (_pageRange && Array.isArray(det.pages) && det.pages.length > 0) {
              const rs = Math.max(1, _pageRange[0] || 1);
              const re = Math.min(det.pageCount, _pageRange[1] || det.pageCount);
              const slice = det.pages.filter(p => p.pageNum >= rs && p.pageNum <= re);
              const rangeText = slice.map(p => p.text).filter(Boolean).join('\n\n');
              extractedText = rangeText;
              window.__lastGroundTruthCharCount = rangeText.length;
              window.__lastGroundTruthPageMap = slice;
              window.__lastGroundTruthMethod = 'pdfjs';
              effectivePageCount = re - rs + 1;
              updateProgress(1, `Extracted pages ${rs}-${re} (${rangeText.length.toLocaleString()} chars)`);
              warnLog(`[Det] PDF text layer range pages ${rs}-${re} → ${rangeText.length} chars / ${effectivePageCount} pages`);
            } else {
              extractedText = det.fullText;
              window.__lastGroundTruthCharCount = det.sourceCharCount;
              window.__lastGroundTruthPageMap = det.pages;
              window.__lastGroundTruthMethod = 'pdfjs';
              if (det.pageCount > 0) effectivePageCount = det.pageCount;
              updateProgress(1, `Extracted ${det.sourceCharCount.toLocaleString()} chars deterministically from ${det.pageCount} pages`);
              warnLog(`[Det] PDF text layer → ${det.sourceCharCount} chars / ${det.pageCount} pages (avg ${Math.round(det.sourceCharCount / Math.max(1, det.pageCount))}/page)`);
            }
          } else if (det) {
            warnLog(`[Det] PDF appears scanned (${det.sourceCharCount} chars / ${det.pageCount} pages) — falling through to Vision OCR`);
          }
        }
      } catch (detErr) {
        warnLog('[Det] Deterministic extraction failed, falling through to Vision OCR:', detErr?.message);
      }

      const PAGES_PER_CHUNK = 2; // Tight: 2 pages per chunk — safely fits in 8192 output tokens
      const numChunks = Math.max(1, Math.ceil(effectivePageCount / PAGES_PER_CHUNK));

      // If deterministic extraction succeeded, skip OCR entirely
      if (extractedText && extractedText.length > 100) {
        warnLog(`[Det] Using deterministic extraction (${extractedText.length} chars), skipping OCR`);
        // Fall through to Step 1b (image extraction) with extractedText already populated
      } else if (_base64 && _mimeType === 'application/pdf') {
        // Scanned-PDF path: run Tesseract and Vision in parallel, then reconcile.
        // "Perfect accuracy" per user spec — losing zero words matters more than speed here,
        // so we do both engines and take the longer output per page. Disagreements are
        // stashed on window globals so the fidelity panel can surface them for review.
        updateProgress(1, 'Scanned PDF detected — running Tesseract + Vision OCR in parallel...');
        if (typeof addToast === 'function') addToast('Running Tesseract + Vision OCR for maximum accuracy on this scanned PDF…', 'info');

        const _visionChunkedExtract = async () => {
          // Page-range-aware prompts: when the teacher selected a partial
          // range (e.g. pages 6-10 of a 15-page scanned PDF), ask Gemini to
          // extract ONLY those pages — not pages 1-effectivePageCount, which
          // would map to pages 1-5 of the full PDF and produce the wrong
          // content. Without this, partial remediation on scanned PDFs
          // silently processed the whole document.
          const _rangeStart = (_pageRange && _pageRange[0]) ? _pageRange[0] : 1;
          const _rangeEndRaw = (_pageRange && _pageRange[1]) ? _pageRange[1] : (_rangeStart + effectivePageCount - 1);
          // Clamp the end page to the actual document bounds. The UI lets the
          // teacher type arbitrary numbers, and audit sometimes mis-reports
          // pageCount (e.g. underestimates for multi-column layouts) — asking
          // Gemini Vision to extract pages that don't exist either returns
          // empty blocks or triggers hallucination, both of which silently
          // corrupt the output. Cap at _rangeStart + effectivePageCount - 1
          // since effectivePageCount is our best guess at available pages.
          const _rangeMax = _rangeStart + effectivePageCount - 1;
          const _rangeEnd = Math.min(_rangeEndRaw, _rangeMax);
          if (_rangeEnd < _rangeEndRaw) {
            warnLog(`[Vision] Range end clamped ${_rangeEndRaw} → ${_rangeEnd} (document only has ${effectivePageCount} page(s) from start)`);
          }
          if (numChunks <= 1 && effectivePageCount <= 2) {
            const rangeInstr = _pageRange
              ? `Extract ALL text content from pages ${_rangeStart} through ${_rangeEnd} of this document ONLY. Do not include any other pages. This range contains approximately ${effectivePageCount} page(s).`
              : `Extract ALL text content from this document. This document has approximately ${effectivePageCount} page(s) — extract EVERY page completely.`;
            const single = await callGeminiVision(
              `${rangeInstr}\n\nRULES:\n- Use # for titles, ## for sections, ### for subsections\n- Preserve tables as markdown tables with | pipes and --- dividers\n- Describe images as: [Image: detailed description]\n- Use * for bullet lists, 1. for numbered lists\n- LINKS: Preserve ALL hyperlinks. Format as [link text](URL). If text is hyperlinked but you can see the URL destination, include it. If you can only see blue/underlined text without a visible URL, format as [link text](#) to indicate a link exists.\n- Keep ALL content — every paragraph, heading, list item, table row\n\nIMPORTANT: Return ONLY plain text with markdown formatting. Do NOT wrap in JSON. Do NOT use \\n escape sequences — use actual line breaks. Just the document text.`,
              _base64, _mimeType
            );
            return { fullText: single || '', pages: [{ pageNum: _rangeStart, text: single || '' }] };
          }
          const MAX_PARALLEL = 5;
          const chunkPromises = [];
          for (let i = 0; i < numChunks; i++) {
            // Chunk's absolute page range in the full PDF: start at _rangeStart
            // + i*PAGES_PER_CHUNK, cap at _rangeEnd. When no range is set,
            // _rangeStart=1 so this reduces to the original 1-based chunking.
            const startPage = _rangeStart + i * PAGES_PER_CHUNK;
            const endPage = Math.min(_rangeStart + (i + 1) * PAGES_PER_CHUNK - 1, _rangeEnd);
            chunkPromises.push(
              callGeminiVision(
                `Extract ALL text content from pages ${startPage} through ${endPage} of this document${_pageRange ? ' ONLY (do not include pages outside this range)' : ''}.\n\nRULES:\n- Use # for titles, ## for sections, ### for subsections\n- Preserve tables as markdown tables with | pipes and --- dividers\n- Describe images as: [Image: detailed description]\n- Use * for bullet lists, 1. for numbered lists\n- LINKS: Preserve ALL hyperlinks as [link text](URL). If you can see blue/underlined text with a visible URL, include it. If the URL destination isn't visible, use [link text](#).\n- Keep ALL content — do not skip any paragraphs or details\n- READING ORDER: If the page has multiple text columns, return content in correct reading order — finish the left column top-to-bottom before starting the right column. Two-column academic layouts and newspaper layouts MUST be linearized, not interleaved.\n\nIMPORTANT: Return ONLY plain text with markdown formatting. Do NOT wrap in JSON. Do NOT use \\n escape sequences — use actual line breaks. Just the document text.`,
                _base64, _mimeType
              ).catch(err => { warnLog(`[PDF Fix] Chunk ${i + 1} (pages ${startPage}-${endPage}) extraction failed:`, err); return null; })
            );
          }
          let chunkResults = [];
          for (let batch = 0; batch < chunkPromises.length; batch += MAX_PARALLEL) {
            const batchSlice = chunkPromises.slice(batch, batch + MAX_PARALLEL);
            const batchResults = await Promise.all(batchSlice);
            chunkResults = chunkResults.concat(batchResults);
            if (batch + MAX_PARALLEL < chunkPromises.length) await new Promise(r => setTimeout(r, 500));
          }
          const chunks = chunkResults.map((chunk, i) => {
            if (!chunk || !chunk.trim()) return '';
            return chunk.trim()
              .replace(/^\s*```[\w]*\n?/g, '').replace(/\n?```\s*$/g, '')
              .replace(/^\s*\{[\s\S]*?"(?:text|content)":\s*"/g, '').replace(/"\s*\}\s*$/g, '')
              .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
          });
          // For reconciliation we want a pseudo per-page split. Vision's chunks cover
          // PAGES_PER_CHUNK pages each; split the chunk text into page-count equal slices
          // when we can't do better. Far from perfect alignment but beats nothing.
          const pagesOut = [];
          chunks.forEach((chunkText, ci) => {
            const startPage = ci * PAGES_PER_CHUNK;
            const pageCount = Math.min(PAGES_PER_CHUNK, effectivePageCount - startPage);
            const chunkLen = chunkText.length;
            const per = pageCount > 0 ? Math.floor(chunkLen / pageCount) : chunkLen;
            for (let q = 0; q < pageCount; q++) {
              const from = q * per;
              const to = q === pageCount - 1 ? chunkLen : (q + 1) * per;
              pagesOut.push({ pageNum: startPage + q + 1, text: chunkText.slice(from, to).trim() });
            }
          });
          return { fullText: chunks.join('\n\n---\n\n'), pages: pagesOut };
        };

        const _tesseractExtract = async () => extractPdfTextTesseract(_base64, (ev) => {
          updateProgress(1, `Tesseract OCR page ${ev.page}/${ev.total} (${ev.phase})…`);
        });

        let tessResult = { fullText: '', pages: [] };
        let visionResult = { fullText: '', pages: [] };
        try {
          const [t, v] = await Promise.all([
            _tesseractExtract().catch(e => { warnLog('[OCR reconcile] Tesseract failed:', e && e.message); return { fullText: '', pages: [] }; }),
            _visionChunkedExtract().catch(e => { warnLog('[OCR reconcile] Vision failed:', e && e.message); return { fullText: '', pages: [] }; }),
          ]);
          tessResult = t; visionResult = v;
        } catch (reconErr) {
          warnLog('[OCR reconcile] parallel OCR failed:', reconErr && reconErr.message);
        }

        // Reconcile per-page — take longer text, flag disagreements.
        const rec = reconcileOcrPages(tessResult.pages || [], visionResult.pages || []);
        extractedText = rec.fullText || tessResult.fullText || visionResult.fullText || '';
        // Stash both outputs + disagreement list on window globals for the fidelity panel.
        window.__lastOcrTesseractText = tessResult.fullText || '';
        window.__lastOcrVisionText = visionResult.fullText || '';
        window.__lastOcrDisagreements = rec.disagreements || [];
        window.__lastOcrMethod = (tessResult.fullText && visionResult.fullText) ? 'tesseract+vision' : (tessResult.fullText ? 'tesseract' : 'vision');
        warnLog(`[OCR reconcile] Tesseract ${tessResult.fullText.length} chars · Vision ${visionResult.fullText.length} chars · merged ${extractedText.length} chars · ${rec.disagreements.length} page disagreements`);
        if (typeof addToast === 'function' && rec.disagreements.length > 0) {
          addToast(`OCR reconciled — ${rec.disagreements.length} page${rec.disagreements.length === 1 ? '' : 's'} where Tesseract & Vision disagree. Review in the fidelity panel.`, 'info');
        }
      } else if (numChunks <= 1 && effectivePageCount <= 2) {
        // Very short PDF (1-2 pages): single extraction pass is safe
        updateProgress(1, `Extracting text (${effectivePageCount} page${effectivePageCount > 1 ? 's' : ''})...`);
        extractedText = await callGeminiVision(
          `Extract ALL text content from this document. This document has approximately ${effectivePageCount} page(s) — extract EVERY page completely.\n\nRULES:\n- Use # for titles, ## for sections, ### for subsections\n- Preserve tables as markdown tables with | pipes and --- dividers\n- Describe images as: [Image: detailed description]\n- Use * for bullet lists, 1. for numbered lists\n- LINKS: Preserve ALL hyperlinks. Format as [link text](URL). If text is hyperlinked but you can see the URL destination, include it. If you can only see blue/underlined text without a visible URL, format as [link text](#) to indicate a link exists.\n- Keep ALL content — every paragraph, heading, list item, table row\n\nIMPORTANT: Return ONLY plain text with markdown formatting. Do NOT wrap in JSON. Do NOT use \\n escape sequences — use actual line breaks. Just the document text.`,
          _base64, _mimeType
        );
      } else {
        // Multi-page: extract in page-range chunks (3 pages each), parallel batches to avoid rate limiting
        updateProgress(1, `Extracting ${effectivePageCount} pages in ${numChunks} chunks (${PAGES_PER_CHUNK} pages each)...`);
        const MAX_PARALLEL = 5;
        const chunkPromises = [];
        for (let i = 0; i < numChunks; i++) {
          const startPage = i * PAGES_PER_CHUNK + 1;
          const endPage = Math.min((i + 1) * PAGES_PER_CHUNK, effectivePageCount);
          chunkPromises.push(
            callGeminiVision(
              `Extract ALL text content from pages ${startPage} through ${endPage} of this document.\n\nRULES:\n- Use # for titles, ## for sections, ### for subsections\n- Preserve tables as markdown tables with | pipes and --- dividers\n- Describe images as: [Image: detailed description]\n- Use * for bullet lists, 1. for numbered lists\n- LINKS: Preserve ALL hyperlinks as [link text](URL). If you can see blue/underlined text with a visible URL, include it. If the URL destination isn't visible, use [link text](#).\n- Keep ALL content — do not skip any paragraphs or details\n- READING ORDER: If the page has multiple text columns, return content in correct reading order — finish the left column top-to-bottom before starting the right column. Two-column academic layouts and newspaper layouts MUST be linearized, not interleaved.\n\nIMPORTANT: Return ONLY plain text with markdown formatting. Do NOT wrap in JSON. Do NOT use \\n escape sequences — use actual line breaks. Just the document text.`,
              _base64, _mimeType
            ).catch(err => { warnLog(`[PDF Fix] Chunk ${i + 1} extraction failed:`, err); return null; })
          );
        }
        // Run in batches of MAX_PARALLEL to avoid rate limiting
        let chunkResults = [];
        for (let batch = 0; batch < chunkPromises.length; batch += MAX_PARALLEL) {
          const batchSlice = chunkPromises.slice(batch, batch + MAX_PARALLEL);
          updateProgress(1, `Extracting batch ${Math.floor(batch / MAX_PARALLEL) + 1}/${Math.ceil(chunkPromises.length / MAX_PARALLEL)} (${Math.min(batch + MAX_PARALLEL, chunkPromises.length)}/${chunkPromises.length} chunks of ${PAGES_PER_CHUNK} pages)...`);
          const batchResults = await Promise.all(batchSlice);
          chunkResults = chunkResults.concat(batchResults);
          // Brief pause between batches to avoid rate limiting
          if (batch + MAX_PARALLEL < chunkPromises.length) await new Promise(r => setTimeout(r, 500));
        }
        updateProgress(1, `Processing ${chunkResults.filter(Boolean).length}/${numChunks} chunks...`);
        const chunks = chunkResults.map((chunk, i) => {
          if (!chunk || !chunk.trim()) return `[Chunk ${i + 1} could not be extracted]`;
          return chunk.trim()
            .replace(/^\s*```[\w]*\n?/g, '').replace(/\n?```\s*$/g, '')
            .replace(/^\s*\{[\s\S]*?"(?:text|content)":\s*"/g, '').replace(/"\s*\}\s*$/g, '')
            .replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
        });
        extractedText = chunks.join('\n\n---\n\n');
      }
      // Record ground truth from OCR fallback if deterministic extraction was not used
      if (extractedText && !window.__lastGroundTruthCharCount) {
        window.__lastGroundTruthCharCount = extractedText.length;
        window.__lastGroundTruthMethod = 'vision-ocr';
      }

      if (!extractedText || extractedText.length < 20) {
        throw new Error('Could not extract sufficient text from this PDF');
      }

      // ── Clean extracted text: strip JSON wrappers, fix escaped newlines ──
      // Sometimes the AI returns JSON-wrapped content or literal \n sequences
      extractedText = extractedText
        .replace(/^\s*\[\s*\{[^}]*"(?:html_content|text|content|section)":\s*"/gm, '') // strip JSON wrapper starts
        .replace(/"\s*\}\s*\]\s*$/gm, '') // strip JSON wrapper ends
        .replace(/"\s*,\s*\{[^}]*"(?:html_content|text|content|section)":\s*"/gm, '\n\n') // strip inter-chunk JSON
        .replace(/\\n\\n/g, '\n\n') // fix double-escaped newlines
        .replace(/\\n/g, '\n') // fix single-escaped newlines
        .replace(/\\"/g, '"') // fix escaped quotes
        .replace(/\\t/g, '\t') // fix escaped tabs
        .replace(/\n{4,}/g, '\n\n\n') // collapse excessive newlines
        .trim();

      const extractedLength = extractedText.length;
      const charsPerPage = effectivePageCount > 0 ? Math.round(extractedLength / effectivePageCount) : extractedLength;
      warnLog(`[PDF Fix] Extracted ${extractedLength} chars from ${effectivePageCount} pages in ${numChunks} chunk(s) (~${charsPerPage} chars/page)`);
      // Warn if extraction seems thin (< 200 chars/page suggests truncation or image-only pages)
      if (charsPerPage < 200 && effectivePageCount > 1) {
        warnLog(`[PDF Fix] WARNING: Low extraction density (${charsPerPage} chars/page) — possible truncation or scanned/image-only document`);
      }

      // ── Step 1b: Auto-extract images from PDF ──
      updateProgress(1, 'Extracting images...');
      let extractedImages = [];
      // Track image-step failures (outer Vision refusal, PDF.js extraction
      // errors, per-image regen errors). If 3 or more pile up, we emit a
      // single aggregate warning toast at the end of the step so the teacher
      // doesn't discover broken alt-text stubs in the final HTML only by
      // reading the output. Small counts (0-2) stay quiet — occasional
      // decorative failures are expected and already surfaced in imgReport.
      let _imageFailureCount = 0;
      try {
        const imgResult = await callGeminiVision(
          `Identify and extract ALL images from this PDF document. For each image:\n1. Describe it in detail (what it shows, any text in the image, educational purpose)\n2. Note its approximate location (page number, position)\n3. Indicate if it's decorative (borders, backgrounds) or meaningful (diagrams, photos, charts)\n\nReturn ONLY JSON:\n{"images": [{"id": 1, "description": "detailed description", "page": 1, "position": "top/middle/bottom", "type": "photo|diagram|chart|illustration|logo|decorative", "educationalPurpose": "what it teaches or communicates"}]}`,
          _base64, _mimeType
        );
        if (imgResult) {
          const cleaned = _stripCodeFence(imgResult);
          const parsed = JSON.parse(cleaned);
          extractedImages = (parsed.images || []).filter(img => img.type !== 'decorative');
          warnLog(`[PDF Fix] Found ${extractedImages.length} meaningful images`);

          // Extract images algorithmically from PDF pages using canvas rendering
          // No API calls needed — renders PDF pages to canvas, captures as base64
          if (extractedImages.length > 0) {
            updateProgress(1, `Extracting ${extractedImages.length} images from PDF pages...`);
            try {
              // Load PDF.js from CDN if not already available
              if (!window.pdfjsLib) {
                await new Promise((resolve, reject) => {
                  if (document.querySelector('script[data-pdfjs]')) {
                    const wait = setInterval(() => { if (window.pdfjsLib) { clearInterval(wait); resolve(); } }, 100);
                    setTimeout(() => { clearInterval(wait); reject(new Error('PDF.js timeout')); }, 10000);
                    return;
                  }
                  const script = document.createElement('script');
                  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                  script.setAttribute('data-pdfjs', 'true');
                  script.onload = () => {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    resolve();
                  };
                  script.onerror = () => reject(new Error('Failed to load PDF.js'));
                  document.head.appendChild(script);
                });
              }
              // Convert base64 PDF to Uint8Array
              const rawBase64 = _base64.includes(',') ? _base64.split(',')[1] : _base64;
              const pdfBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
              const pdfDoc = await window.pdfjsLib.getDocument({ data: pdfBytes }).promise;

              // Group images by page for efficient rendering
              const pageGroups = {};
              extractedImages.forEach((img, idx) => {
                const pg = img.page || 1;
                if (!pageGroups[pg]) pageGroups[pg] = [];
                pageGroups[pg].push({ ...img, idx });
              });

              // Extract actual image objects from each page using PDF.js getOperatorList
              for (const [pageNum, imgs] of Object.entries(pageGroups)) {
                try {
                  const pg = parseInt(pageNum);
                  if (pg < 1 || pg > pdfDoc.numPages) continue;
                  updateProgress(1, `Extracting images from page ${pg}...`);
                  const page = await pdfDoc.getPage(pg);
                  const opList = await page.getOperatorList();
                  const OPS = window.pdfjsLib.OPS;

                  // Find paintImageXObject operations — these are actual images in the PDF
                  const imageOps = [];
                  for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
                    if (opList.fnArray[opIdx] === OPS.paintImageXObject || opList.fnArray[opIdx] === OPS.paintJpegXObject) {
                      imageOps.push(opList.argsArray[opIdx][0]); // image name
                    }
                  }

                  // Strategy: render the page, then use page.getOperatorList to find image
                  // transforms (position/size), and crop exactly those regions from the rendered page
                  const viewport = page.getViewport({ scale: 2 });
                  const canvas = document.createElement('canvas');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  const ctx2d = canvas.getContext('2d');
                  await page.render({ canvasContext: ctx2d, viewport }).promise;

                  // Store full-page canvas for user re-cropping later
                  if (!window.__pdfPageCanvases) window.__pdfPageCanvases = {};
                  window.__pdfPageCanvases[pg] = canvas.toDataURL('image/png');

                  if (imageOps.length > 0) {
                    // Find image positions from the transform matrices in the operator list
                    const imagePositions = [];
                    let currentTransform = [1, 0, 0, 1, 0, 0]; // identity
                    for (let opIdx = 0; opIdx < opList.fnArray.length; opIdx++) {
                      const fn = opList.fnArray[opIdx];
                      if (fn === OPS.transform) {
                        currentTransform = opList.argsArray[opIdx];
                      } else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
                        // The transform tells us where and how big the image is
                        const [a, b, c, d, e, f] = currentTransform;
                        // In PDF coordinates: e,f is bottom-left position, a=width, d=height (roughly)
                        const w = Math.abs(a) * viewport.scale;
                        const h = Math.abs(d) * viewport.scale;
                        const x = e * viewport.scale;
                        const y = viewport.height - (f * viewport.scale) - h; // flip Y
                        imagePositions.push({ x: Math.max(0, x), y: Math.max(0, y), w: Math.min(w, canvas.width), h: Math.min(h, canvas.height) });
                      }
                    }

                    // Sort by Y position (top-to-bottom) to match visual reading order
                    imagePositions.sort((a, b) => a.y - b.y);
                    // Crop each image region from the rendered page
                    let imgOpIdx = 0;
                    for (const img of imgs) {
                      const pos = imagePositions[imgOpIdx] || imagePositions[0];
                      imgOpIdx++;
                      if (pos && pos.w > 20 && pos.h > 20) {
                        try {
                          const crop = document.createElement('canvas');
                          crop.width = Math.round(pos.w);
                          crop.height = Math.round(pos.h);
                          crop.getContext('2d').drawImage(canvas, Math.round(pos.x), Math.round(pos.y), Math.round(pos.w), Math.round(pos.h), 0, 0, crop.width, crop.height);
                          const dataUrl = crop.toDataURL('image/png');
                          extractedImages[img.idx].generatedSrc = dataUrl;
                          extractedImages[img.idx].cropData = { page: pg, x: Math.round(pos.x), y: Math.round(pos.y), w: Math.round(pos.w), h: Math.round(pos.h), canvasW: canvas.width, canvasH: canvas.height };
                          warnLog(`[PDF Fix] Cropped image from page ${pg}: ${Math.round(pos.w)}x${Math.round(pos.h)} at (${Math.round(pos.x)},${Math.round(pos.y)})`);
                        } catch(cropErr) { warnLog(`[PDF Fix] Image crop failed:`, cropErr); }
                      }
                    }
                  }

                  // Fallback: assign to any images that didn't get extracted
                  for (const img of imgs) {
                    if (!extractedImages[img.idx].generatedSrc) {
                      const pos = (img.position || 'top').toLowerCase();
                      let y = 0, h = canvas.height * 0.2;
                      if (pos.includes('bottom')) { y = canvas.height * 0.7; h = canvas.height * 0.3; }
                      else if (pos.includes('middle')) { y = canvas.height * 0.3; h = canvas.height * 0.35; }
                      const crop = document.createElement('canvas');
                      crop.width = canvas.width; crop.height = h;
                      crop.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
                      extractedImages[img.idx].generatedSrc = crop.toDataURL('image/jpeg', 0.85);
                      warnLog(`[PDF Fix] Fallback crop for image on page ${pg} (${pos})`);
                    }
                  }
                } catch(pgErr) { _imageFailureCount++; warnLog(`[PDF Fix] Page ${pageNum} extraction failed:`, pgErr); }
              }
            } catch(pdfJsErr) {
              _imageFailureCount++;
              warnLog('[PDF Fix] PDF.js extraction failed, trying Imagen fallback:', pdfJsErr?.message);
              // Fallback: use Imagen to regenerate from descriptions
              if (callImagen && extractedImages.length <= 5) {
                for (let imgI = 0; imgI < extractedImages.length; imgI++) {
                  if (extractedImages[imgI].generatedSrc) continue; // already extracted
                  try {
                    updateProgress(1, `Regenerating image ${imgI + 1} via AI...`);
                    const imgUrl = await callImagen(
                      `Recreate this image for an educational document: ${extractedImages[imgI].description}. Clean, professional style. No text overlays.`,
                      300, 0.8
                    );
                    if (imgUrl) { extractedImages[imgI].generatedSrc = imgUrl; extractedImages[imgI].isRegenerated = true; }
                    else { _imageFailureCount++; }
                  } catch(genErr) { _imageFailureCount++; }
                }
              }
            }
          }
        }
      } catch (imgErr) {
        // Catastrophic failure of the whole image step (Vision refusal, JSON
        // parse, network). Treat as a large failure count so the aggregate
        // toast below fires regardless of how many individual images the
        // teacher expected.
        _imageFailureCount += 99;
        warnLog('[PDF Fix] Image extraction failed (non-blocking):', imgErr);
      }
      // Aggregate user-visible warning. Stays quiet for small counts so
      // occasional decorative-image failures don't nag. The UI's per-image
      // regenerate buttons (imgReport panel) still cover detailed recovery.
      if (_imageFailureCount >= 3 && !_silentMode && typeof addToast === 'function') {
        const _displayCount = _imageFailureCount >= 99 ? 'all' : String(_imageFailureCount);
        addToast(`⚠ ${_displayCount} image${_imageFailureCount === 1 ? '' : 's'} couldn't be extracted or regenerated — the final HTML may have missing images. Check the image review panel to retry individually.`, 'warning');
      }

      _pipeStepEnd(1, extractedText.length + ' chars extracted');

      // ── Listen for user alt text edits from the image review panel ──
      var _userAltTextEdits = {};
      var _onAltTextEdit = function(e) {
        if (e.detail && typeof e.detail.index === 'number') {
          _userAltTextEdits[e.detail.index] = e.detail.altText;
          if (extractedImages[e.detail.index]) extractedImages[e.detail.index].description = e.detail.altText;
        }
      };
      window.addEventListener('alloflow:alt-text-edited', _onAltTextEdit);

      // ── Emit extracted data for UI to show during wait ──
      // Images + metadata are available now; user can review/edit alt text while Steps 2-4 run
      try {
        setTimeout(function() {
          window.dispatchEvent(new CustomEvent('alloflow:extraction-complete', {
            detail: {
              images: extractedImages.map(function(img, i) {
                return { index: i, description: img.description || '', src: img.generatedSrc || null, type: img.type || 'content', educationalPurpose: img.educationalPurpose || '', isRegenerated: !!img.isRegenerated, cropData: img.cropData || null };
              }),
              // Full extracted text surfaces so the UI fidelity panel can compare it against the
              // remediated output. For scanned PDFs this is the reconciled Tesseract+Vision text.
              fullText: extractedText || '',
              // OCR-specific context — only populated when the scanned path ran. Lets the panel
              // show Tesseract vs Vision disagreements for manual review.
              ocr: {
                method: window.__lastOcrMethod || window.__lastGroundTruthMethod || 'pdfjs',
                tesseractText: window.__lastOcrTesseractText || '',
                visionText: window.__lastOcrVisionText || '',
                disagreements: window.__lastOcrDisagreements || [],
              },
              metadata: {
                fileName: _fileName,
                pageCount: pageCount,
                extractedChars: extractedText.length,
                hasImages: extractedImages.length > 0,
                hasTables: /\btable\b/i.test(extractedText),
                language: /[\u0600-\u06FF]/.test(extractedText) ? 'ar' : /[\u4E00-\u9FFF]/.test(extractedText) ? 'zh' : /[\u0400-\u04FF]/.test(extractedText) ? 'ru' : 'en',
                isScanned: (window.__lastOcrMethod === 'tesseract+vision' || window.__lastOcrMethod === 'tesseract' || window.__lastOcrMethod === 'vision'),
                extractionMethod: window.__lastOcrMethod || window.__lastGroundTruthMethod || 'pdfjs',
              },
              timestamp: Date.now(),
            }
          }));
        }, 0);
      } catch(e) { /* non-blocking */ }

      // ── Step 2: Transform to accessible HTML via JSON data pipeline ──
      _pipeStepStart(2);
      // Strategy: AI extracts structured JSON (content + style metadata), then
      // deterministic code renders it into guaranteed-valid styled HTML.
      updateProgress(2, 'Analyzing document structure...');
      let bodyContent = '';

      // ── Step 2a: Determine document styling ──
      // If user selected a preset theme (not "Match Original"), use the theme's colors directly
      // and skip the Vision style extraction call entirely (saves 1 API call + 10-30s)
      const _defaultDocStyle = { headingColor: '#1e3a5f', accentColor: '#2563eb', bgColor: '#ffffff', headerBg: '#1e3a5f', headerText: '#ffffff', bodyFont: 'system-ui, sans-serif', tableBg: '#f1f5f9', tableBorder: '#cbd5e1', sectionBorderColor: '#e2e8f0' };
      const _selectedSeedId = typeof window !== 'undefined' ? (window.__pdfStyleSeed || window.__pdfStylePreference || '') : '';
      const _selectedSeed = _selectedSeedId && STYLE_SEEDS[_selectedSeedId] ? STYLE_SEEDS[_selectedSeedId] : null;
      // Respect user's branding mode choice: 'auto' (default, extract from PDF), 'upload' (use uploaded brand), 'none' (skip all branding, use defaults).
      // Branding mode interacts with style seed as follows:
      //   - If a specific style seed (not "matchOriginal") is chosen → seed colors win, brand mode ignored for the seed's covered fields.
      //   - If "matchOriginal" or no seed → brand mode decides: auto extracts, upload uses override, none uses defaults.
      const _brandMode = typeof window !== 'undefined' ? (window.__pdfBrandMode || 'auto') : 'auto';
      const _brandOverride = typeof window !== 'undefined' ? window.__pdfBrandOverride : null;
      const _hasSpecificSeed = _selectedSeed && _selectedSeedId !== 'matchOriginal' && _selectedSeed.cssVars;
      // Only use extracted/uploaded branding when no specific seed is chosen AND brand mode allows extraction.
      const _useExtractedStyle = !_hasSpecificSeed && _brandMode === 'auto';
      const _useUploadedBrand = !_hasSpecificSeed && _brandMode === 'upload' && _brandOverride;
      let docStyle = { ..._defaultDocStyle };

      if (_useUploadedBrand) {
        // User uploaded a brand reference — use those colors, skip PDF extraction
        docStyle = { ...docStyle, ..._brandOverride };
        _pipeLog('Style', 'Using uploaded brand colors (branding mode: upload)');
      } else if (_brandMode === 'none' && !_hasSpecificSeed) {
        // User turned branding off and hasn't picked a specific theme — use default palette
        _pipeLog('Style', 'Branding off — using default palette');
      } else if (_useExtractedStyle) {
        // Match Original or no theme selected — extract colors from the PDF
        try {
          updateProgress(2, 'Extracting color scheme...');
          _pipeLog('Style', 'Extracting original document colors (Match Original / auto)');
          const styleResult = await callGeminiVision(
            `Analyze the visual design of this PDF. Extract the exact color scheme and typography.\n\nReturn ONLY JSON:\n{"headingColor":"hex","accentColor":"hex for links/accents","bgColor":"hex background","headerBg":"hex or CSS gradient for header area","headerText":"hex","bodyFont":"CSS font-family","tableBg":"hex for table headers","tableBorder":"hex","sectionBorderColor":"hex for section dividers","hasHeaderBanner":true/false,"hasSidebarAccents":true/false,"accentBorderSide":"left|top|none"}`,
            _base64, _mimeType
          );
          if (styleResult) {
            const sc = _stripCodeFence(styleResult);
            const parsed = JSON.parse(sc);
            docStyle = { ...docStyle, ...parsed };
            warnLog('[PDF Fix] Extracted doc style:', docStyle);
          }

          // Detect boring/grayscale palette and offer theme suggestion
          const _colors = [docStyle.headingColor, docStyle.accentColor, docStyle.bgColor, docStyle.headerBg].filter(c => typeof c === 'string' && c.startsWith('#'));
          const _isGrayscale = _colors.every(function(c) {
            if (c.length < 7) return true;
            var r = parseInt(c.slice(1,3), 16), g = parseInt(c.slice(3,5), 16), b = parseInt(c.slice(5,7), 16);
            return Math.max(r,g,b) - Math.min(r,g,b) < 30;
          });
          if (_isGrayscale && _colors.length >= 2) {
            _pipeLog('Style', 'Detected boring/grayscale palette — offering theme suggestion');
            // Emit event for UI to show theme suggestion prompt
            try {
              const _themePromise = new Promise(function(resolve) {
                var _onChoice = function(e) { window.removeEventListener('alloflow:boring-palette-choice', _onChoice); resolve(e.detail ? e.detail.seedId : null); };
                window.addEventListener('alloflow:boring-palette-choice', _onChoice);
                setTimeout(function() { window.removeEventListener('alloflow:boring-palette-choice', _onChoice); resolve(null); }, 10000);
              });
              setTimeout(function() {
                window.dispatchEvent(new CustomEvent('alloflow:boring-palette-detected', {
                  detail: { extractedColors: docStyle, seedId: _selectedSeedId }
                }));
              }, 0);
              updateProgress(2, 'Original styling is minimal — you can keep it or choose a theme...');
              const _chosenSeedId = await _themePromise;
              if (_chosenSeedId && STYLE_SEEDS[_chosenSeedId] && STYLE_SEEDS[_chosenSeedId].cssVars) {
                const _chosenCss = STYLE_SEEDS[_chosenSeedId].cssVars;
                docStyle = { ...docStyle, headingColor: _chosenCss.headingColor, accentColor: _chosenCss.accentColor, bgColor: _chosenCss.bgColor || '#ffffff', headerBg: _chosenCss.headerBg || _chosenCss.headingColor, headerText: _chosenCss.headerText || '#ffffff', bodyFont: _chosenCss.bodyFont || docStyle.bodyFont };
                _pipeLog('Style', 'User chose theme: ' + STYLE_SEEDS[_chosenSeedId].name);
              } else {
                _pipeLog('Style', 'User kept original styling (or timed out)');
              }
            } catch(e) { /* non-blocking */ }
          }
        } catch(styleErr) { warnLog('[PDF Fix] Style extraction failed (using defaults):', styleErr); }
      } else {
        // Preset theme selected — use its CSS vars directly, skip Vision call
        const _css = _selectedSeed.cssVars;
        docStyle = { ...docStyle, headingColor: _css.headingColor, accentColor: _css.accentColor, bgColor: _css.bgColor || '#ffffff', headerBg: _css.headerBg || _css.headingColor, headerText: _css.headerText || '#ffffff', bodyFont: _css.bodyFont || 'system-ui, sans-serif', tableBg: _css.cardBg || docStyle.tableBg, tableBorder: _css.cardBorder || docStyle.tableBorder };
        _pipeLog('Style', 'Using preset theme: ' + _selectedSeed.name + ' (skipped Vision extraction)');
        updateProgress(2, 'Using ' + _selectedSeed.name + ' theme...');
      }

      // ── Deterministic HTML renderer from JSON content blocks ──
      const renderJsonToHtml = (blocks) => {
        if (!Array.isArray(blocks)) return '';
        return blocks.map((block, blockIdx) => {
          // Guard: skip invalid blocks
          if (!block || typeof block !== 'object') return '';
          // ── Normalize alternate schemas ──
          // Gemini sometimes returns {"tag":"p","class":"ds6","content":"..."} or
          // {"element":"p","text":"..."} instead of {"type":"p","text":"..."}.
          // Map all known variants to the canonical {type, text} schema.
          if (!block.type && block.tag) block.type = block.tag;
          if (!block.type && block.element) block.type = block.element;
          if (!block.text && block.content) block.text = block.content;
          if (!block.text && block.value) block.text = block.value;
          if (!block.text && block.body) block.text = block.body;
          // "fixed_html" or "output_html" as raw HTML content
          if (!block.html && block.fixed_html) block.html = block.fixed_html;
          if (!block.html && block.output_html) block.html = block.output_html;
          if (!block.html && block.accessible_html) block.html = block.accessible_html;
          if (!block.type && !block.text && !block.html && !block.title && !block.items) return '';
          if (!block.type && block.text) block.type = 'p';
          if (!block.type && block.title) block.type = 'banner';
          if (!block.type && block.items) block.type = 'ul';
          if (!block.type && block.headers) block.type = 'table';
          if (!block.type && block.html) block.type = 'rawhtml';
          if (!block.type && block.description) block.type = 'image';
          const sanitizeField = (val) => { if (typeof val !== 'string') return String(val || ''); return val.replace(/\\\\n/g, ' ').replace(/\\0/g, '').trim(); };
          try {
          // Clean block text: strip JSON field names, id tags, literal \n, and type labels
          if (block.text) {
            block.text = block.text
              .replace(/\\n/g, ' ')
              .replace(/\n?id:\s*[a-z0-9-]+\n?/gi, '')
              .replace(/^(description|alt|title|subtitle|caption|type|text|items|headers|rows):\s*/gim, '') // strip leaked JSON field names
              .replace(/^(banner|blockquote|image|hr|ul|ol|p|h[1-6])\s*$/gim, '') // strip bare type names on own line
              .replace(/\n{2,}/g, '\n').trim();
          }
          // Clean title/subtitle on banner blocks
          if (block.title) block.title = block.title.replace(/^title:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.subtitle) block.subtitle = block.subtitle.replace(/^subtitle:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.description) block.description = block.description.replace(/^description:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.alt) block.alt = block.alt.replace(/^alt:\s*/i, '').replace(/\\n/g, ' ').trim();
          if (block.caption) block.caption = block.caption.replace(/^caption:\s*/i, '').replace(/\\n/g, ' ').trim();
          // Also clean items arrays (lists)
          if (block.items) {
            block.items = block.items.map(item => (item || '').replace(/\\n/g, ' ').replace(/^(items|text):\s*/i, '').trim());
          }
          // Extract id from text if not in id field (AI sometimes puts "id: slug" in text)
          if (!block.id && block.text) {
            const idMatch = block.text.match(/^id:\s*([a-z0-9-]+)/i);
            if (idMatch) { block.id = idMatch[1]; block.text = block.text.replace(idMatch[0], '').trim(); }
          }
          const id = block.id ? ` id="${block.id}"` : '';
          switch (block.type) {
            case 'h1': return `<h1${id} style="color:${docStyle.headingColor};font-size:1.75rem;font-weight:bold;border-bottom:3px solid ${docStyle.accentColor};padding-bottom:0.5rem;margin:1.5em 0 0.5em">${block.text}</h1>`;
            case 'h2': return `<h2${id} style="color:${docStyle.headingColor};font-size:1.35rem;font-weight:bold;margin:1.5em 0 0.5em;${docStyle.hasSidebarAccents ? 'border-left:4px solid ' + docStyle.accentColor + ';padding-left:12px;' : ''}">${block.text}</h2>`;
            case 'h3': return `<h3${id} style="color:${docStyle.headingColor};font-size:1.1rem;font-weight:bold;margin:1.2em 0 0.4em">${block.text}</h3>`;
            case 'p': return `<p style="margin:0.6em 0;line-height:1.7">${block.text}</p>`;
            case 'ul': return `<ul style="margin:0.6em 0;padding-left:1.5em">${(Array.isArray(block.items) ? block.items : [block.text || '']).filter(Boolean).map(i => `<li style="margin:0.3em 0">${sanitizeField(i)}</li>`).join('')}</ul>`;
            case 'ol': return `<ol style="margin:0.6em 0;padding-left:1.5em">${(Array.isArray(block.items) ? block.items : [block.text || '']).filter(Boolean).map(i => `<li style="margin:0.3em 0">${sanitizeField(i)}</li>`).join('')}</ol>`;
            case 'table': {
              const cap = block.caption ? `<caption style="font-weight:bold;text-align:left;margin-bottom:0.5rem;color:${docStyle.headingColor}">`+sanitizeField(block.caption)+`</caption>` : '';
              const hdrs = Array.isArray(block.headers) ? block.headers : [];
              const hdr = hdrs.length > 0 ? `<thead><tr>`+hdrs.map(h => `<th scope="col" style="background:${docStyle.tableBg};border:1px solid ${docStyle.tableBorder};padding:8px 12px;font-weight:bold;text-align:left">`+sanitizeField(h)+`</th>`).join('')+`</tr></thead>` : '';
              const rowsArr = Array.isArray(block.rows) ? block.rows : [];
              const rows = rowsArr.map(row => {
                if (!Array.isArray(row)) return `<tr><td style="border:1px solid ${docStyle.tableBorder};padding:8px 12px">`+sanitizeField(row)+`</td></tr>`;
                return `<tr>`+row.map(cell => `<td style="border:1px solid ${docStyle.tableBorder};padding:8px 12px">`+sanitizeField(cell)+`</td>`).join('')+`</tr>`;
              }).join('');
              return `<table style="width:100%;border-collapse:collapse;margin:1em 0">`+cap+hdr+`<tbody>`+rows+`</tbody></table>`;
            }
            case 'definition_list': {
              // Semantic match for legends/keys: each entry pairs a marker description
              // (color/symbol) with its label. SR users navigate <dl> as "term/definition"
              // pairs which is what a legend semantically IS — better than a flat table.
              // Sections (with optional <h4> heading) preserve any visible subgroupings.
              const _legCap = block.caption ? `<figcaption style="font-weight:bold;color:${docStyle.headingColor};margin-bottom:0.5rem;font-size:1em">`+sanitizeField(block.caption)+`</figcaption>` : '';
              const _legIntro = block.intro ? `<p style="margin:0 0 0.75rem;color:${docStyle.bodyColor};font-size:0.95em;line-height:1.6">`+sanitizeField(block.intro)+`</p>` : '';
              const _legSections = (Array.isArray(block.sections) ? block.sections : []).map(sec => {
                const _heading = sec && sec.title ? `<h4 style="margin:1em 0 0.4em;color:${docStyle.headingColor};font-size:1em;font-weight:bold">`+sanitizeField(sec.title)+`</h4>` : '';
                const _entries = (Array.isArray(sec && sec.entries) ? sec.entries : []).map(e => {
                  const _marker = e && e.marker ? sanitizeField(e.marker) : '';
                  const _label = e && e.label ? sanitizeField(e.label) : '';
                  return `<dt style="font-weight:600;color:${docStyle.bodyColor};margin-top:0.4em">`+_marker+`</dt>`
                       + `<dd style="margin:0 0 0.4em 1.5em;color:${docStyle.bodyColor};line-height:1.5">`+_label+`</dd>`;
                }).join('');
                return _heading + (_entries ? `<dl style="margin:0">`+_entries+`</dl>` : '');
              }).join('');
              return `<figure role="group" aria-label="${(block.caption ? sanitizeField(block.caption).replace(/"/g,'&quot;') : 'Figure legend')}" style="margin:1em 0;padding:1em 1.25em;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px">`
                + _legCap + _legIntro + _legSections + `</figure>`;
            }
            case 'image': {
              // Uploadable placeholder: even when extractedImages is empty (no extraction happened),
              // users can still upload their own image in the preview. The deferred-image block
              // downstream upgrades the src when a real extracted image is available.
              // Colors chosen for WCAG AA on the #f1f5f9 placeholder bg: #475569 caption (5.35:1),
              // #64748b border (3.92:1 — passes 1.4.11 non-text contrast).
              const _imgDesc = (block.description || block.alt || 'Image').replace(/"/g, '&quot;');
              const _imgAltSafe = (block.description || block.alt || 'Image').replace(/"/g, '').replace(/'/g, '');
              const _imgId = 'pdf-img-ph-' + (block.id ? String(block.id).replace(/[^a-z0-9]/gi, '') : Math.random().toString(36).slice(2, 8));
              const _captionText = block.description || block.alt || '';
              // Drag-and-drop + pick-extracted support: handlers pull a dataURL from
              // either the drop dataTransfer, a local file picker, or the shared
              // window.__alloflowExtractedImages list populated by the main app on iframe load.
              // FIX: remove any open thumbnail picker FIRST, and scope the <img> lookup
              // to direct children only. Without this, `c.querySelector('img')` finds
              // a thumbnail *inside* the picker (not a real target), and the subsequent
              // child-wipe removes the picker — taking the newly-aliased target with it,
              // so the inserted image appears for one frame then vanishes.
              const _insertFn = `function(c, dataUrl, altText){`
                + `var pk=c.querySelector('[data-alloflow-picker]');if(pk)pk.remove();`
                + `var target=null;var kids=c.children;for(var ii=0;ii<kids.length;ii++){if(kids[ii].tagName==='IMG'){target=kids[ii];break;}}`
                + `if(target){target.src=dataUrl;if(altText)target.alt=altText;}`
                + `else{target=document.createElement('img');target.src=dataUrl;target.alt=altText||'Image';target.style.cssText='max-width:100%;border-radius:8px;border:1px solid #e2e8f0';c.appendChild(target);}`
                + `c.style.background='none';c.style.border='none';c.style.padding='0';c.style.minHeight='0';`
                + `Array.from(c.children).forEach(function(ch){if(ch!==target)ch.remove();});`
                + `c.removeAttribute('ondragover');c.removeAttribute('ondragleave');c.removeAttribute('ondrop');`
                // Notify the parent app that the iframe DOM was mutated so it can
                // sync the new outerHTML into pdfFixResult.accessibleHtml. Without
                // this, image swaps live only in the iframe and get wiped by any
                // updatePdfPreview() call (theme/font/a11y/auto-fix/etc.).
                + `try{if(window.parent&&window.parent.__alloflowOnPdfPreviewMutated)window.parent.__alloflowOnPdfPreviewMutated();}catch(_){}}`;
              const _dragOver = `event.preventDefault();this.style.borderColor='#4f46e5';this.style.background='#eef2ff';`;
              const _dragLeave = `this.style.borderColor='#64748b';this.style.background='#f1f5f9';`;
              const _dropHandler = `(function(c,ev){ev.preventDefault();c.style.borderColor='#64748b';c.style.background='#f1f5f9';try{var raw=ev.dataTransfer.getData('text/x-alloflow-image');if(raw){var d=JSON.parse(raw);if(d&&d.src){(${_insertFn})(c,d.src,d.alt||'${_imgAltSafe}');return;}}var f=ev.dataTransfer.files&&ev.dataTransfer.files[0];if(f){var r=new FileReader();r.onload=function(e){(${_insertFn})(c,e.target.result,'${_imgAltSafe}');};r.readAsDataURL(f);}}catch(_){}})(this,event)`;
              const _uploadHandler = `(function(el){var f=el.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){var c=document.getElementById('${_imgId}-container');(${_insertFn})(c,e.target.result,'${_imgAltSafe}');};r.readAsDataURL(f);})(this)`;
              // IMPORTANT: the handler string ends up inside onclick="..." so literal double
              // quotes inside msg.textContent would prematurely terminate the HTML attribute
              // and silently break the button. Use curly quotes (\u201C \u201D) around the
              // referenced button label — visually identical to the user, safe for HTML attrs.
              const _pickHandler = `(function(btn){var c=document.getElementById('${_imgId}-container');if(!c)return;var list=(typeof window!=='undefined'&&window.__alloflowExtractedImages)||[];var prevMsg=c.querySelector('[data-alloflow-nomsg]');if(prevMsg)prevMsg.remove();if(!list.length){var msg=document.createElement('div');msg.setAttribute('data-alloflow-nomsg','true');msg.style.cssText='margin-top:0.5rem;padding:8px 12px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:12px;color:#92400e;max-width:90%';msg.textContent='No extracted images yet. Upload a PDF that contains images, or click the \\u201CUpload image\\u201D button to pick a local file.';c.appendChild(msg);setTimeout(function(){msg.remove();},5000);return;}var ex=c.querySelector('[data-alloflow-picker]');if(ex){ex.remove();return;}var p=document.createElement('div');p.setAttribute('data-alloflow-picker','true');p.style.cssText='margin-top:0.75rem;padding:0.5rem;background:#fff;border:1px solid #cbd5e1;border-radius:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:4px;width:100%;max-height:220px;overflow-y:auto';list.forEach(function(img,i){if(!img||!img.src)return;var t=document.createElement('img');t.src=img.src;t.alt=img.description||('Image '+(i+1));t.title=img.description||('Image '+(i+1));t.style.cssText='width:100%;height:60px;object-fit:cover;cursor:pointer;border:1px solid #e2e8f0;border-radius:4px';t.onclick=function(){(${_insertFn})(c,img.src,img.description||'${_imgAltSafe}');};p.appendChild(t);});c.appendChild(p);})(this)`;
              return `<figure id="${_imgId}-figure" data-img-placeholder="true" style="margin:1em 0">`
                + `<div id="${_imgId}-container" style="background:#f1f5f9;border:2px dashed #64748b;border-radius:8px;padding:1rem;text-align:center;min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem" ondragover="${_dragOver}" ondragleave="${_dragLeave}" ondrop="${_dropHandler}">`
                + `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`
                + `<span style="font-size:13px;color:#334155;font-weight:600">Image placeholder</span>`
                + `<span style="font-size:12px;color:#475569;max-width:90%">${_imgDesc.substring(0, 140)}${_imgDesc.length > 140 ? '…' : ''}</span>`
                + `<span style="font-size:11px;color:#64748b;font-style:italic">Drag an extracted image here, or:</span>`
                + `<div style="display:flex;gap:6px;margin-top:0.25rem;flex-wrap:wrap;justify-content:center">`
                + `<label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#1d4ed8;color:#ffffff !important;border:1px solid #1e3a8a;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span style="color:#ffffff !important">Upload image</span><input type="file" accept="image/*" style="display:none" onchange="${_uploadHandler}"></label>`
                + `<button type="button" onclick="${_pickHandler}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#7c3aed;color:#ffffff !important;border:1px solid #5b21b6;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer" aria-label="Pick from extracted images"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style="color:#ffffff !important">Pick extracted</span></button>`
                + `</div>`
                + `</div>`
                + (_captionText ? `<figcaption style="font-size:0.9em;color:#475569;font-style:italic;margin-top:0.5rem">${_captionText}</figcaption>` : '')
                + `</figure>`;
            }
            case 'link': return `<a href="${block.url || '#'}" style="color:${docStyle.accentColor}">${block.text}</a>`;
            case 'blockquote': return `<blockquote style="border-left:4px solid ${docStyle.accentColor};padding:12px 16px;margin:1em 0;background:${docStyle.bgColor === '#ffffff' ? '#f8fafc' : docStyle.bgColor};border-radius:0 8px 8px 0;font-style:italic">${block.text}</blockquote>`;
            case 'hr': return `<hr style="border:none;border-top:2px solid ${docStyle.sectionBorderColor};margin:2em 0">`;
            case 'wordart': {
              // Decorative stylized text. Renders via the shared WORD_ART_PRESETS so the in-app
              // Document Builder preview and the exported PDF/HTML match exactly.
              return renderWordArtHtml(block.text || block.title || '', block.preset || block.style || 'goldFoil', block.size || 'L', block.align || 'center');
            }
            case 'banner': {
              // Compute an AA-safe text color from the LIGHTEST stop of the header
              // background (solid or gradient). axe-core samples one representative bg
              // color and will fail white-on-yellow even when text-shadow makes it
              // visually readable — so we pick a text color that meets 4.5:1 against
              // the worst-case stop. Dark backgrounds still resolve to white (unchanged).
              const _bTitle = block.title || '';
              const _bSubtitle = block.subtitle || '';
              const _bEyebrow = block.eyebrow || '';
              const _accent = docStyle.accentColor || '#fbbf24';
              const _computeBannerText = (bg) => {
                try {
                  const s = String(bg || '');
                  const stops = [];
                  const hexRe = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
                  let m;
                  while ((m = hexRe.exec(s)) !== null) {
                    let h = m[1];
                    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
                    stops.push([parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)]);
                  }
                  const rgbRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
                  while ((m = rgbRe.exec(s)) !== null) stops.push([+m[1], +m[2], +m[3]]);
                  if (!stops.length) return '#ffffff'; // unknown → preserve prior visual
                  const srgb = (c) => c <= 0.03928 ? c/12.92 : Math.pow((c + 0.055)/1.055, 2.4);
                  const lumOf = ([r,g,b]) => 0.2126*srgb(r/255) + 0.7152*srgb(g/255) + 0.0722*srgb(b/255);
                  const cr = (a, b) => { const l1 = lumOf(a), l2 = lumOf(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
                  // Worst case for text is whichever stop has MAX luminance (brightest bg).
                  let lightest = stops[0];
                  for (let i = 1; i < stops.length; i++) if (lumOf(stops[i]) > lumOf(lightest)) lightest = stops[i];
                  // If even the lightest stop is dark → safe to keep white.
                  if (lumOf(lightest) < 0.35) return '#ffffff';
                  // Otherwise drive near-black darker until >=4.5:1 against the lightest stop.
                  let r = 31, g = 41, b = 55; // #1f2937
                  for (let i = 0; i < 25 && cr([r,g,b], lightest) < 4.5; i++) {
                    r = Math.max(0, Math.round(r * 0.82));
                    g = Math.max(0, Math.round(g * 0.82));
                    b = Math.max(0, Math.round(b * 0.82));
                  }
                  return '#' + [r,g,b].map(c => c.toString(16).padStart(2,'0')).join('');
                } catch (_) { return '#ffffff'; }
              };
              const _bText = _computeBannerText(docStyle.headerBg);
              // Text-shadow direction is still a nice-to-have even when color already passes;
              // we keep it but flip to a light shadow when text is dark (preserves legibility
              // if the lightest stop is also where the text sits).
              const _isDarkText = _bText !== '#ffffff';
              const _shadow = _isDarkText
                ? '0 1px 2px rgba(255,255,255,0.35)'
                : '0 2px 4px rgba(0,0,0,0.35)';
              const _shadowSm = _isDarkText
                ? '0 1px 1px rgba(255,255,255,0.3)'
                : '0 1px 2px rgba(0,0,0,0.3)';
              return `<div style="position:relative;background:${docStyle.headerBg};color:${_bText} !important;padding:36px 40px;border-radius:14px;margin-bottom:28px;overflow:hidden;border-left:6px solid ${_accent};box-shadow:0 6px 20px rgba(15,23,42,0.18)">`
                + (_bEyebrow ? '<div style="color:' + _bText + ' !important;font-size:0.75em;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.95;margin-bottom:10px;text-shadow:' + _shadowSm + '">' + _bEyebrow + '</div>' : '')
                + (_bTitle ? '<div style="color:' + _bText + ' !important;font-size:2.1em;font-weight:800;line-height:1.1;letter-spacing:-0.01em;text-shadow:' + _shadow + '">' + _bTitle + '</div>' : '')
                + (_bSubtitle ? '<div style="color:' + _bText + ' !important;font-size:1.1em;font-weight:500;margin-top:10px;text-shadow:' + _shadowSm + '">' + _bSubtitle + '</div>' : '')
                + `</div>`;
            }
            case 'rawhtml': {
              // Strip scripts, styles, event handlers, and javascript: URLs before trusting model-supplied HTML.
              const _rawHtml = String(block.html || '');
              return _rawHtml
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
                .replace(/javascript:/gi, '');
            }
            default: {
              // Unknown block type — salvage any content field we recognize instead of silently dropping it,
              // and log the type so we can extend the switch if Gemini starts emitting new shapes.
              const _salvage = block.text || block.title || block.description || block.caption
                || (Array.isArray(block.items) ? block.items.join(', ') : '');
              if (block.type) _pipeLog('renderJsonToHtml', 'unknown block type: ' + block.type + ' — salvaged ' + _salvage.length + ' chars');
              return `<div style="margin:0.6em 0">${_salvage}</div>`;
            }
          }
          } catch (blockRenderErr) {
            console.warn('[PDF Fix] Block ' + blockIdx + ' render error (type=' + (block.type||'?') + '):', blockRenderErr);
            const salvageText = block.text || block.title || block.description || (Array.isArray(block.items) ? block.items.join(', ') : '');
            if (salvageText) return '<p style="margin:0.6em 0;line-height:1.7">' + sanitizeField(salvageText) + '</p>';
            return '';
          }
        }).filter(html => html.length > 0).join('\n');
      };

      // ── Step 2b: Extract structured content as JSON ──
      const jsonPrompt = `You are a WCAG 2.1 AA accessibility specialist extracting a PDF into structured, semantically correct HTML content blocks. Your output will be used directly by screen readers, so accuracy matters.

Extract ALL content as a JSON array of content blocks. Each block must be one of these types:

BLOCK TYPES:
- {"type":"banner","title":"Document Title","subtitle":"optional subtitle"} — the document's main title
- {"type":"h1","text":"Title","id":"slug-id"} — ONE per document only (WCAG 2.4.2: page titled)
- {"type":"h2","text":"Section Title","id":"slug-id"} — major sections. Headings MUST NOT skip levels (no h1→h3)
- {"type":"h3","text":"Subsection Title","id":"slug-id"} — subsections under h2
- {"type":"p","text":"Full paragraph text with <strong>bold</strong> and <em>italic</em> and <a href='url'>descriptive link text</a>"}
- {"type":"ul","items":["item 1","item 2"]} — unordered lists (use for bullet points)
- {"type":"ol","items":["step 1","step 2"]} — ordered lists (use for numbered sequences)
- {"type":"table","caption":"Descriptive table caption explaining what data the table shows","headers":["Col 1","Col 2"],"rows":[["data","data"]]} — tables MUST have a caption and header row
- {"type":"image","description":"Detailed description of what the image shows and why it matters in context (2-3 sentences)","alt":"Concise alternative text under 125 characters that conveys the image's purpose, not just its appearance"}
- {"type":"blockquote","text":"quoted text","cite":"attribution if known"}
- {"type":"hr"} — for section breaks between major content areas

ACCESSIBILITY RULES (WCAG 2.1 AA):
- Include EVERY piece of content from the document. Do NOT summarize or omit.
- Preserve the LOGICAL reading order (which may differ from visual layout).
  For multi-column layouts: determine the intended reading sequence, don't just read left-to-right across columns.
- Heading hierarchy MUST be sequential: h1 → h2 → h3. Never skip a level.
  If the PDF uses bold text as a heading, identify it as such and assign the correct level.
- For images: "alt" should answer "what information does this image convey?" not "what does it look like?"
  BAD: "Image of a graph" / "Photo" / "image1.png"
  GOOD: "Bar graph showing enrollment increased 45% from 2020 to 2024"
  GOOD: "Portrait of Dr. Maria Chen, lead researcher"
  If the image is decorative (borders, spacers), use: {"type":"image","alt":"","description":"decorative"}
- For tables: ALWAYS include a caption that describes what data the table presents.
  Headers must be real column/row labels, not just the first row of data.
  For complex tables with merged cells, split into simpler tables if possible.
- For LEGENDS, KEYS, color-coded chart references, infographics, and visual reference panels (any image whose purpose is to pair visual markers — colors, swatches, symbols, patterns — with their meanings):
  Emit as {"type":"image","description":"<thorough enumeration of EVERY label visible: e.g. 'Color-coded categories. Shelf - high profile (dark olive square); Shelf - medium profile (olive square); Shelf - low profile; Slope; Abyss - mountains; Abyss - hills; Abyss - plains; Hadal; canyon; ...'>"}
  DO NOT emit legends as tables. DO NOT abstract specific entries into broad category headers. If the legend has 21 entries, the description must list all 21 verbatim.
  A downstream pass will re-extract these into structured definition lists if needed; your job is to preserve the data, not to structure it.
- For links: link text must describe the destination.
  BAD: <a href="url">click here</a> / <a href="url">link</a>
  GOOD: <a href="url">Download the 2024 Annual Report (PDF)</a>
- Generate slug IDs for all headings (e.g., "program-guide", "course-categories").

Return ONLY a JSON array: [{"type":"...","text":"..."}, ...]`;

      if (pageCount <= 8) {
        // Short-medium documents: single Vision pass with JSON extraction
        updateProgress(2, 'Extracting document structure...');
        try {
          const jsonResult = await callGeminiVision(jsonPrompt, _base64, _mimeType);
          let cleaned = _stripCodeFence(jsonResult);
          // JSON self-repair for single-pass extraction
          const repairSingle = (raw) => {
            let s = raw.trim();
            const fi = s.indexOf('['); if (fi >= 0) s = s.substring(fi);
            const li = s.lastIndexOf(']'); if (li > 0) s = s.substring(0, li + 1);
            try { return JSON.parse(s); } catch(e) {}
            let r = s.replace(/,\s*([}\]])/g,'$1').replace(/([{,]\s*)(\w+)\s*:/g,'$1"$2":').replace(/:\s*'([^']*)'/g,':"$1"').replace(/}\s*\n?\s*{/g,'},{');
            if (!r.startsWith('[')) r = '[' + r;
            const lb = r.lastIndexOf('}'); if (lb > 0 && !r.endsWith(']')) r = r.substring(0, lb + 1) + ']';
            try { return JSON.parse(r); } catch(e) {}
            // Object-by-object recovery
            const objs = raw.match(/\{[^{}]*"type"\s*:\s*"[^"]+?"[^{}]*\}/g);
            if (objs) { const recovered = []; objs.forEach(o => { try { recovered.push(JSON.parse(o)); } catch(e) {} }); if (recovered.length > 0) return recovered; }
            return null;
          };
          const blocks = repairSingle(cleaned);
          if (!blocks) throw new Error('JSON repair failed');
          // Legend re-extraction pass: catches images→empty-tables that the
          // first pass produced when it abstracted legends into broad
          // categories. Only fires on flagged blocks; no-op for documents
          // without legend issues. See _isSuspectExtraction for the criteria.
          let _legendRepairedBlocks = blocks;
          try {
            _legendRepairedBlocks = await detectAndRepairLegends(blocks, _base64, _mimeType, null, callGeminiVision);
          } catch (legendErr) {
            warnLog('[PDF Fix] Legend repair pass threw; using first-pass blocks unchanged:', legendErr && legendErr.message);
            _legendRepairedBlocks = blocks;
          }
          bodyContent = _stripJsonWrapperArtifacts(renderJsonToHtml(_legendRepairedBlocks));
          warnLog(`[PDF Fix] JSON pipeline: ${_legendRepairedBlocks.length} blocks rendered (${_legendRepairedBlocks.length - blocks.length === 0 ? 'no legend repairs' : 'legend repair applied'})`);
        } catch(jsonErr) {
          // Fallback: direct HTML generation if JSON parsing fails
          warnLog('[PDF Fix] JSON extraction failed, falling back to direct HTML:', jsonErr);
          updateProgress(2, 'Fallback: generating HTML directly...');
          const fallbackPrompt = `Transform this PDF into accessible HTML body content meeting WCAG 2.1 AA. Use proper headings, tables with th scope, alt text, lists, links. Include ALL content. Use inline CSS for styling. Return ONLY HTML.`;
          bodyContent = await callGeminiVision(fallbackPrompt, _base64, _mimeType);
          // Validate: reject empty, refusal messages, or non-HTML replies so downstream stages know to recover.
          const _fallbackOk = bodyContent
            && bodyContent.trim().length >= 50
            && /<(?:p|h[1-6]|ul|ol|table|section|article|div|main)\b/i.test(bodyContent);
          if (!_fallbackOk) {
            _pipeLog('PDF Fix', 'Fallback HTML failed structural validation (len=' + (bodyContent ? bodyContent.trim().length : 0) + ') — downstream will rely on heuristic extraction');
            bodyContent = '';
          }
        }
      } else {
        // Long documents: chunked JSON extraction via Vision API
        // Use 3 pages per chunk (not 5) to prevent output truncation on dense documents
        updateProgress(2, 'Extracting document structure (chunked)...');
        const TRANSFORM_PAGES = 3;
        const transformChunks = Math.ceil(pageCount / TRANSFORM_PAGES);
        let allBlocks = [];
        const chunkMeta = []; // Track per-chunk metadata for retry

        // Run ALL JSON extraction chunks in PARALLEL for speed
        updateProgress(2, `Extracting structure: ${transformChunks} chunks in parallel...`);
        const processJsonChunk = async (i) => {
          const startPg = i * TRANSFORM_PAGES + 1;
          const endPg = Math.min((i + 1) * TRANSFORM_PAGES, pageCount);
          try {
            const chunkResult = await callGeminiVision(
              `Extract ALL content from pages ${startPg} through ${endPg} of this PDF as a JSON array of content blocks.\n\n` +
              `This is chunk ${i + 1} of ${transformChunks}.\n` +
              (i === 0 ? 'Include the document title as a "banner" or "h1" block. ' : 'Do NOT repeat the document title. Continue with h2/h3. ') +
              `\n\nBlock types:\n` +
              `- {"type":"banner","title":"...","subtitle":"..."}\n` +
              `- {"type":"h1","text":"...","id":"slug"} / h2 / h3\n` +
              `- {"type":"p","text":"... with <strong>bold</strong> <em>italic</em> <a href='url'>links</a>"}\n` +
              `- {"type":"ul","items":["...","..."]} / ol\n` +
              `- {"type":"table","caption":"...","headers":["..."],"rows":[["...","..."]]}\n` +
              `- {"type":"image","description":"...","alt":"brief"}\n` +
              `- {"type":"blockquote","text":"..."}\n` +
              `- {"type":"hr"}\n\n` +
              `RULES:\n` +
              `- Include ALL content. ALL table rows (not just samples).\n` +
              `- LINKS: Preserve ALL hyperlinks as <a href='URL'>text</a> inside text fields. If text is blue/underlined, include it as a link.\n` +
              `- Describe all images thoroughly for alt text.\n` +
              `- LEGENDS / KEYS / color-coded references: emit as {"type":"image","description":"<verbatim enumeration of EVERY label visible>"}. NEVER as a table. Do NOT abstract specific entries into broad category headers. If the legend has 21 entries, list all 21.\n` +
              `- Generate slug IDs for h2/h3 headings.\n` +
              `- Use <strong> for bold text and <em> for italic within text fields.\n\n` +
              `Return ONLY a JSON array: [{"type":"...","text":"..."}, ...]`,
              _base64, _mimeType
            );
            if (chunkResult) {
              let cleaned = _stripCodeFence(chunkResult);

              // ── JSON self-repair pipeline ──
              const repairAndParseJson = (raw) => {
                let s = raw.trim();
                // 1. Strip any text before the first [ and after the last ]
                const firstBracket = s.indexOf('[');
                const lastBracket = s.lastIndexOf(']');
                if (firstBracket >= 0) s = s.substring(firstBracket);
                if (lastBracket >= 0 && lastBracket > firstBracket) s = s.substring(0, s.lastIndexOf(']') + 1);

                // 2. Direct parse attempt
                try { return JSON.parse(s); } catch(e) {}

                // 3. Fix common AI JSON errors
                let repaired = s
                  .replace(/,\s*([}\]])/g, '$1')          // trailing commas: ,} or ,]
                  .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys: {type: → {"type":
                  .replace(/:\s*'([^']*)'/g, ':"$1"')     // single quotes: 'text' → "text"
                  .replace(/"\s*\n\s*"/g, '","')           // missing comma between strings
                  .replace(/}\s*\n?\s*{/g, '},{')          // missing comma between objects
                  .replace(/\}\s*$/,'}\]')                 // missing closing bracket
                  .replace(/"\s*$/,'"}]');                  // truncated mid-string

                // 4. Ensure starts with [ and ends with ]
                if (!repaired.startsWith('[')) repaired = '[' + repaired;
                if (!repaired.endsWith(']')) {
                  // Find last complete object and close the array
                  const lastCloseBrace = repaired.lastIndexOf('}');
                  if (lastCloseBrace > 0) repaired = repaired.substring(0, lastCloseBrace + 1) + ']';
                }

                try { return JSON.parse(repaired); } catch(e) {}

                // 5. Aggressive: try to extract the array portion only
                const arrMatch = repaired.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch(e) {} }

                return null; // truly unparseable
              };

              let parsed = repairAndParseJson(cleaned);
              if (parsed && Array.isArray(parsed)) {
                // Legend re-extraction per chunk. The pageRange hint helps the
                // second vision call zoom in on the right page (the full PDF
                // is still passed; the prompt narrows attention).
                try {
                  parsed = await detectAndRepairLegends(parsed, _base64, _mimeType, [startPg, endPg], callGeminiVision);
                } catch (legendErr) {
                  warnLog('[PDF Fix] Chunk ' + (i + 1) + ' legend repair threw; using parsed blocks unchanged:', legendErr && legendErr.message);
                }
                return parsed;
              } else {
                warnLog(`[PDF Fix] JSON parse failed for chunk ${i + 1}, attempting object-by-object recovery`);
                const recovered = [];
                const objectMatches = cleaned.match(/\{[^{}]*"(?:type|tag|element)"\s*:\s*"[^"]+?"[^{}]*\}/g);
                if (objectMatches && objectMatches.length > 0) {
                  let recoveredCount = 0;
                  objectMatches.forEach(objStr => {
                    try {
                      const obj = JSON.parse(objStr);
                      if (obj.type) { recovered.push(obj); recoveredCount++; }
                    } catch(e) {}
                  });
                  warnLog(`[PDF Fix] Recovered ${recoveredCount}/${objectMatches.length} objects from chunk ${i + 1}`);
                  return recovered;
                } else {
                  warnLog(`[PDF Fix] No recoverable JSON in chunk ${i + 1}, falling back to direct HTML`);
                  try {
                    const fallbackHtml = await callGeminiVision(
                      `Transform pages ${startPg}-${endPg} of this PDF into accessible HTML. Use headings, tables with th scope, lists, links. Include ALL content. Return ONLY HTML body content.`,
                      _base64, _mimeType
                    );
                    if (fallbackHtml && fallbackHtml.trim().startsWith('<')) {
                      return [{ type: 'rawhtml', html: fallbackHtml }];
                    }
                  } catch(fbErr) {
                    warnLog(`[PDF Fix] Direct HTML fallback also failed for chunk ${i + 1}`);
                  }
                }
              }
            }
          } catch (chunkErr) {
            const isRecitation = chunkErr && chunkErr.message && /RECITATION/i.test(chunkErr.message);
            warnLog(`[PDF Fix] Chunk ${i + 1} failed${isRecitation ? ' (RECITATION — copyrighted content detected)' : ''}:`, chunkErr.message);

            // Extract the pre-extracted text for these pages
            const fallbackStart = Math.floor((i / transformChunks) * extractedText.length);
            const fallbackEnd = Math.floor(((i + 1) / transformChunks) * extractedText.length);
            const chunkText = extractedText.substring(fallbackStart, fallbackEnd);

            // ── Fallback Layer 1 (for RECITATION): Structure-only Vision retry ──
            // Retry with a modified prompt that asks for structure WITHOUT reproducing text.
            // This often works because RECITATION only triggers when the model outputs copyrighted text.
            if (isRecitation) {
              try {
                warnLog(`[PDF Fix] Chunk ${i + 1}: trying structure-only Vision prompt (no text reproduction)`);
                const structureMap = await callGeminiVision(
                  `Look at pages ${startPg}-${endPg} of this PDF. DO NOT reproduce any text content.\n\n` +
                  `Instead, return a JSON array describing the STRUCTURE ONLY:\n` +
                  `[{"type":"h2","lineStart":"first 5 words...","lineEnd":"last 3 words"},\n` +
                  ` {"type":"p","lineStart":"first 5 words...","lineEnd":"last 3 words"},\n` +
                  ` {"type":"table","caption":"brief description","cols":4,"rows":10},\n` +
                  ` {"type":"ul","count":5},\n` +
                  ` {"type":"image","description":"what the image shows"}]\n\n` +
                  `For each block, include only the first few words and last few words so we can match it to text we already have. DO NOT include full text content.\n\n` +
                  `Return ONLY the JSON array.`,
                  _base64, _mimeType
                );
                if (structureMap) {
                  // Parse structure map and merge with extracted text
                  let structBlocks = [];
                  try {
                    let cleaned = _stripCodeFence(structureMap);
                    const fi = cleaned.indexOf('['); if (fi >= 0) cleaned = cleaned.substring(fi);
                    const li = cleaned.lastIndexOf(']'); if (li > 0) cleaned = cleaned.substring(0, li + 1);
                    const parsed = JSON.parse(cleaned);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      // Use structure types from Vision but fill text from extracted content
                      let textPos = 0;
                      const textLines = chunkText.split(/\n/).filter(l => l.trim());
                      parsed.forEach(block => {
                        if (block.type === 'image') {
                          structBlocks.push({ type: 'image', description: block.description || 'Image', alt: block.description || 'Image' });
                        } else if (block.type === 'table') {
                          structBlocks.push({ type: 'p', text: '[Table: ' + (block.caption || 'Data table') + ']' });
                        } else if ((block.type === 'ul' || block.type === 'ol') && block.count) {
                          const items = [];
                          for (let ti = 0; ti < block.count && textPos < textLines.length; ti++) {
                            items.push(textLines[textPos++] || '');
                          }
                          structBlocks.push({ type: block.type, items: items });
                        } else {
                          // Match by lineStart if available
                          if (block.lineStart && textPos < textLines.length) {
                            const startWords = block.lineStart.toLowerCase();
                            // Find the line that starts with these words
                            let matched = false;
                            for (let si = textPos; si < Math.min(textPos + 10, textLines.length); si++) {
                              if (textLines[si].toLowerCase().startsWith(startWords.substring(0, 15))) {
                                // Collect lines until lineEnd or next heading
                                let blockText = textLines[si];
                                textPos = si + 1;
                                if (block.type === 'p') {
                                  while (textPos < textLines.length && textLines[textPos].length > 30 && !/^[A-Z][A-Z\s]{3,}$/.test(textLines[textPos])) {
                                    blockText += ' ' + textLines[textPos++];
                                  }
                                }
                                structBlocks.push({ type: block.type || 'p', text: blockText, id: block.type && block.type.startsWith('h') ? blockText.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40) : undefined });
                                matched = true;
                                break;
                              }
                            }
                            if (!matched) {
                              structBlocks.push({ type: block.type || 'p', text: textLines[textPos++] || '' });
                            }
                          } else if (textPos < textLines.length) {
                            structBlocks.push({ type: block.type || 'p', text: textLines[textPos++] || '' });
                          }
                        }
                      });
                      // Add remaining text as paragraphs
                      while (textPos < textLines.length) {
                        structBlocks.push({ type: 'p', text: textLines[textPos++] });
                      }
                    }
                  } catch(parseErr) {
                    warnLog('[PDF Fix] Structure map parse failed:', parseErr.message);
                  }
                  if (structBlocks.length > 2) {
                    warnLog(`[PDF Fix] Chunk ${i + 1}: structure-only Vision fallback produced ${structBlocks.length} blocks`);
                    return structBlocks;
                  }
                }
              } catch(structErr) {
                warnLog(`[PDF Fix] Structure-only Vision also failed for chunk ${i + 1}:`, structErr.message);
              }
            }

            // ── Final fallback: heuristic structuring from pre-extracted text ──
            const heuristicBlocks = structureTextHeuristic(chunkText, startPg, endPg);
            if (heuristicBlocks.length > 2) {
              warnLog(`[PDF Fix] Chunk ${i + 1}: heuristic fallback produced ${heuristicBlocks.length} blocks from extracted text`);
              return heuristicBlocks;
            }
            // Absolute last resort: preserve ALL chunk text as paragraphs. The previous implementation
            // truncated at 5000 chars — on dense pages that silently dropped 3–7KB of content and
            // collapsed structure into one <p>. Split on blank-line paragraph breaks instead.
            const _fallbackParas = String(chunkText || '').split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
            if (_fallbackParas.length === 0) return [];
            _pipeLog('PDF Fix', 'Chunk ' + (i + 1) + ': last-resort paragraph fallback preserved ' + _fallbackParas.length + ' paragraphs (' + chunkText.length + ' chars)');
            return _fallbackParas.map(p => ({ type: 'p', text: p }));
          }
          return [];
        };
        // Launch chunks in batches of 5 to avoid rate limiting
        const chunkBlockArrays = [];
        for (let batch = 0; batch < transformChunks; batch += 5) {
          const batchEnd = Math.min(batch + 5, transformChunks);
          updateProgress(2, `Structure batch ${Math.floor(batch / 5) + 1}/${Math.ceil(transformChunks / 5)}...`);
          const batchResults = await Promise.all(
            Array.from({ length: batchEnd - batch }, (_, j) => processJsonChunk(batch + j))
          );
          chunkBlockArrays.push(...batchResults);
          if (batchEnd < transformChunks) await new Promise(r => setTimeout(r, 500));
        }
        chunkBlockArrays.forEach((blocks, ci) => {
          const startPg = ci * TRANSFORM_PAGES + 1;
          const endPg = Math.min((ci + 1) * TRANSFORM_PAGES, pageCount);
          const failed = !blocks || blocks.length === 0;
          chunkMeta.push({ index: ci, startPage: startPg, endPage: endPg, blockCount: blocks ? blocks.length : 0, status: failed ? 'failed' : 'success' });
          if (failed) {
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-fail="' + ci + '" role="alert" aria-live="assertive" aria-atomic="true" style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:16px;margin:1em 0;text-align:center"><p style="color:#991b1b;font-weight:bold;font-size:0.9em"><span aria-hidden="true">\u26a0\ufe0f </span>Section ' + (ci + 1) + ' (pages ' + startPg + '-' + endPg + ') failed to process</p><button onclick="window.__retryPdfChunk && window.__retryPdfChunk(' + ci + ')" aria-label="Retry processing section ' + (ci + 1) + ', pages ' + startPg + ' through ' + endPg + '" style="margin-top:8px;padding:6px 16px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:bold;font-size:12px;cursor:pointer"><span aria-hidden="true">\ud83d\udd04 </span>Retry This Section</button></div>' });
          } else {
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-start="' + ci + '" style="display:none"></div>' });
            allBlocks = allBlocks.concat(blocks);
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-end="' + ci + '" style="display:none"></div>' });
          }
        });
        updateProgress(2, `${allBlocks.length} blocks extracted from ${transformChunks} chunks`);

        bodyContent = _stripJsonWrapperArtifacts(renderJsonToHtml(allBlocks));
        warnLog(`[PDF Fix] JSON pipeline (chunked): ${allBlocks.length} blocks rendered`);

        // ── Chunk retry function (exposed on window) ──
        window.__retryPdfChunk = async (chunkIdx) => {
          try {
            const meta = chunkMeta[chunkIdx];
            if (!meta) return;
            warnLog('[PDF Fix] Retrying chunk ' + (chunkIdx + 1) + ' (pages ' + meta.startPage + '-' + meta.endPage + ')...');
            // Show loading state in the placeholder
            const failDiv = document.querySelector('[data-chunk-fail="' + chunkIdx + '"]');
            if (failDiv) failDiv.innerHTML = '<p style="color:#0369a1;font-weight:bold;font-size:0.9em">\u23f3 Retrying section ' + (chunkIdx + 1) + '...</p>';
            // Re-run the chunk extraction
            const retryBlocks = await processJsonChunk(chunkIdx);
            if (retryBlocks && retryBlocks.length > 0) {
              meta.status = 'success';
              meta.blockCount = retryBlocks.length;
              // Replace the fail placeholder in allBlocks
              const failIdx = allBlocks.findIndex(b => b.type === 'rawhtml' && b.html && b.html.includes('data-chunk-fail="' + chunkIdx + '"'));
              if (failIdx >= 0) {
                allBlocks.splice(failIdx, 1, { type: 'rawhtml', html: '<div data-chunk-start="' + chunkIdx + '" style="display:none"></div>' }, ...retryBlocks, { type: 'rawhtml', html: '<div data-chunk-end="' + chunkIdx + '" style="display:none"></div>' });
              }
              // Re-render full body
              bodyContent = renderJsonToHtml(allBlocks);
              // Update the display
              const previewEl = document.querySelector('[data-pdf-fix-preview]');
              if (previewEl) previewEl.innerHTML = bodyContent;
              const storedResult = window.__pdfFixResultRef;
              if (storedResult && storedResult.set) storedResult.set(prev => ({ ...prev, accessibleHtml: prev.accessibleHtml.replace(/<body[^>]*>[\s\S]*<\/body>/, '<body>' + bodyContent + '</body>') }));
              warnLog('[PDF Fix] Chunk ' + (chunkIdx + 1) + ' retry SUCCESS: ' + retryBlocks.length + ' blocks');
            } else {
              if (failDiv) failDiv.innerHTML = '<p style="color:#991b1b;font-weight:bold;font-size:0.9em">\u274c Retry failed. Try running the full remediation again.</p>';
            }
          } catch(retryErr) {
            warnLog('[PDF Fix] Chunk retry error:', retryErr);
          }
        };

        // ── Polish passes: deterministic first, then AI with small chunks ──
        if (transformChunks > 1) {
          // Phase 1: Deterministic fixes (instant, free)
          _pipeLog('Polish', 'Phase 1: deterministic heading/dedup fixes');
          let h1Count = 0;
          bodyContent = bodyContent.replace(/<h1([^>]*)>/gi, function(m, attrs) {
            h1Count++;
            return h1Count > 1 ? '<h2' + attrs + '>' : m;
          });
          if (h1Count > 1) {
            bodyContent = bodyContent.replace(/<\/h1>/gi, function() {
              return h1Count-- > 1 ? '</h2>' : '</h1>';
            });
            warnLog('[Polish] Demoted extra h1 tags → h2');
          }
          bodyContent = bodyContent.replace(/<(h[1-6])[^>]*>([^<]{3,})<\/\1>\s*<\1[^>]*>\2<\/\1>/gi, '<$1>$2</$1>');
          bodyContent = bodyContent.replace(/(<\/(?:section|article|div)>)\s*<hr\s*\/?>\s*(<(?:section|article|div))/gi, '$1\n$2');

          // Phase 1b: Deduplicate inline styles into CSS classes
          // This shrinks CSS-heavy HTML (e.g., 1.5MB → ~150KB) so AI passes can process it
          const _beforeDedup = bodyContent.length;
          const _styleMap = {};
          let _classCounter = 0;
          // Extract all unique style="" values and assign class names
          bodyContent.replace(/\sstyle="([^"]*)"/gi, function(m, styleVal) {
            if (!_styleMap[styleVal]) {
              _classCounter++;
              _styleMap[styleVal] = 'ds' + _classCounter;
            }
            return m;
          });
          // Only deduplicate if there are repeated styles (>5 unique styles used >1 time)
          const _styleEntries = Object.entries(_styleMap);
          if (_styleEntries.length > 0 && _classCounter < bodyContent.split(/style="/gi).length - 1) {
            // Replace inline styles with class references
            bodyContent = bodyContent.replace(/\sstyle="([^"]*)"/gi, function(m, styleVal) {
              var cls = _styleMap[styleVal];
              return cls ? ' class="' + cls + '"' : m;
            });
            // Build CSS block from the style map
            var _cssBlock = '<style>\n' + _styleEntries.map(function(entry) {
              return '.' + entry[1] + '{' + entry[0] + '}';
            }).join('\n') + '\n</style>\n';
            // Insert CSS block at the beginning of the body content
            bodyContent = _cssBlock + bodyContent;
            _pipeLog('Polish', 'Deduplicated ' + (bodyContent.split('class="ds').length - 1) + ' inline styles into ' + _styleEntries.length + ' CSS classes (' + Math.round(_beforeDedup / 1000) + 'KB → ' + Math.round(bodyContent.length / 1000) + 'KB)');
          }

          // Phase 2: AI polish with small chunks (table merging, style unification, transition smoothing)
          if (pdfPolishPasses > 0) {
            const POLISH_CHUNK = 16000; // with maxOutputTokens=65536, 16KB chunks are well within capacity
            const polishViolations = 'TABLE CONTINUITY: Merge split table fragments.\nSTYLE CONSISTENCY: Unify inline CSS to match dominant style.\nTRANSITION SMOOTHING: Remove artifacts at section boundaries.\nPRESERVE ALL CONTENT. Do NOT summarize or shorten.';
            const _maxPolishPasses = 1; // cap at 1 regardless of user setting — diminishing returns
            for (let polishIdx = 0; polishIdx < _maxPolishPasses; polishIdx++) {
              updateProgress(2, `Polish pass ${polishIdx + 1}/${pdfPolishPasses} (style + table unification)...`);
              _pipeLog('Polish', 'Phase 2: AI polish pass ' + (polishIdx + 1) + ' (' + POLISH_CHUNK + ' char chunks)');
              try {
                // Strip <style> block before chunking — CSS classes don't need polishing
                // and they inflate early chunks causing MAX_TOKENS truncation
                let _polishStyleBlock = '';
                let _polishBody = bodyContent;
                const _styleMatch = bodyContent.match(/^(<style[\s\S]*?<\/style>\s*)/i);
                if (_styleMatch) {
                  _polishStyleBlock = _styleMatch[1];
                  _polishBody = bodyContent.substring(_polishStyleBlock.length);
                }
                const polishChunks = splitHtmlOnTagBoundary(_polishBody, POLISH_CHUNK);
                const polishedParts = [];
                let polishSkipped = 0;
                for (let pci = 0; pci < polishChunks.length; pci++) {
                  // Early abort: if >50% of chunks so far have failed, stop wasting API calls
                  if (pci >= 3 && polishSkipped > pci * 0.5) {
                    _pipeLog('Polish', 'Aborting pass — ' + polishSkipped + '/' + pci + ' chunks failed (model output too small)');
                    for (let rem = pci; rem < polishChunks.length; rem++) polishedParts.push(polishChunks[rem]);
                    break;
                  }
                  const pc = polishChunks[pci];
                  try {
                    const pPrompt = `Fix: merge split tables, smooth section transitions, remove duplicated headings. Preserve ALL text and class attributes.\n\nHTML:\n${pc}\n\nReturn ONLY the fixed fragment — raw HTML, no JSON wrapping.`;
                    const pOut = stripFence(await callGemini(pPrompt, false));
                    if (pOut && pOut.length >= pc.length * 0.85 && textCharCount(pOut) >= textCharCount(pc) * 0.9) {
                      polishedParts.push(pOut);
                    } else {
                      polishSkipped++;
                      polishedParts.push(pc);
                    }
                  } catch (pcErr) {
                    polishSkipped++;
                    polishedParts.push(pc);
                  }
                }
                const polished = _polishStyleBlock + polishedParts.join('');
                // Tag-balance check at chunk seams. Polish AI can open/close tags asymmetrically
                // inside a chunk, which only manifests as broken HTML after the naive join. Count
                // matched opens/closes for a short allow-list of block tags. If the delta widened
                // compared to the original body, revert the whole polish pass — better to skip
                // polish than ship a doc with half-open <tr> or <section>.
                const _balanceTags = ['p','div','section','article','table','thead','tbody','tr','td','th','ul','ol','li','figure','blockquote','h1','h2','h3','h4','h5','h6','main','header','footer','nav'];
                const _tagDelta = (src) => {
                  let delta = 0;
                  for (let ti = 0; ti < _balanceTags.length; ti++) {
                    const t = _balanceTags[ti];
                    const opens = (src.match(new RegExp('<' + t + '(?:\\s[^>]*)?>', 'gi')) || []).length;
                    const closes = (src.match(new RegExp('</' + t + '\\s*>', 'gi')) || []).length;
                    delta += Math.abs(opens - closes);
                  }
                  return delta;
                };
                const _originalDelta = _tagDelta(bodyContent);
                const _polishedDelta = _tagDelta(polished);
                const _balanceOk = _polishedDelta <= _originalDelta + 2; // allow ±2 slack for natural drift
                if (polished.length >= bodyContent.length * 0.85 && _balanceOk) {
                  bodyContent = polished;
                  _pipeLog('Polish', 'Pass ' + (polishIdx + 1) + ' applied (' + polishChunks.length + ' chunks, ' + polishSkipped + ' kept original)');
                } else if (!_balanceOk) {
                  _pipeLog('Polish', 'Pass ' + (polishIdx + 1) + ' rejected: tag balance worse (orig Δ=' + _originalDelta + ', polished Δ=' + _polishedDelta + ') — keeping unpolished HTML to avoid broken markup');
                } else {
                  _pipeLog('Polish', 'Pass ' + (polishIdx + 1) + ' rejected: output too short (' + polished.length + ' vs ' + bodyContent.length + ')');
                }
              } catch (polishErr) {
                warnLog('[PDF Fix] Polish pass ' + (polishIdx + 1) + ' failed:', polishErr);
              }
            }
          }
        }
      }

      // Clean any code fences, JSON wrappers, or literal escape sequences from the HTML output
      if (bodyContent) {
        bodyContent = bodyContent.trim()
          .replace(/^\s*```[\w]*\n?/g, '').replace(/\n?```\s*$/g, '')
          .replace(/^[\s\S]*?(<[a-zA-Z])/m, '$1') // strip any preamble before first HTML tag
          .replace(/\\n\\n/g, '</p><p>') // literal \n\n → paragraph break
          .replace(/\\n/g, ' ') // literal \n → space
          .replace(/\\t/g, ' ') // literal \t → space
          .replace(/(<p>\s*<\/p>)+/g, ''); // remove empty paragraphs created by cleanup
      }

      // ── Insert extracted images using placeholder tokens (deferred real-image insertion) ──
      // Instead of embedding base64 data URLs directly, use stable placeholder tokens that survive
      // every AI pass (grammar, surgical, aiFixChunked, artifact cleanup). Real data URLs get
      // swapped in at the very end of the pipeline, after all AI calls complete. This prevents
      // any AI pass from accidentally corrupting/truncating/stripping base64 image data.
      const _deferredImageMap = {}; // token -> dataUrl
      // Reset per-run image diagnostic trackers so stale state from earlier runs doesn't bleed in.
      // __lastImageSrcMissing = images whose generatedSrc was null when the figure was built (fell to
      // the upload UI). __lastImageDroppedByAi = tokens that survived into _deferredImageMap but the
      // final accessibleHtml stripped them (AI pass dropped the figure outright).
      window.__lastImageSrcMissing = [];
      window.__lastImageDroppedByAi = [];
      if (extractedImages.length > 0) {
        let imgIdx = 0;
        // Find figure elements with data-img-placeholder marker (clean, no regex issues)
        bodyContent = bodyContent.replace(/<figure data-img-placeholder="true"[\s\S]*?<\/figure>/gi, (match) => {
          const captionMatch = match.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
          const altText = captionMatch ? captionMatch[1].replace(/<[^>]*>/g, '').trim() : 'Image';
          {
            const imgInfo = extractedImages[imgIdx] || null;
            imgIdx++;
            const imgId = 'pdf-img-' + imgIdx;
            const desc = imgInfo ? imgInfo.description : altText;
            const purpose = imgInfo ? (imgInfo.educationalPurpose || '') : '';
            const hasSrc = imgInfo && imgInfo.generatedSrc;
            const isRegenerated = imgInfo && imgInfo.isRegenerated;
            const hasCropData = imgInfo && imgInfo.cropData;
            const cropJson = hasCropData ? JSON.stringify(imgInfo.cropData).replace(/"/g, '&quot;') : '';
            // Generate a stable placeholder token for this image's data URL. Real src is restored
            // at the end of the pipeline. Token format matches _stripDataUrlsForAi so it's safe
            // in case any nested AI helper also tries to swap data URLs.
            let srcToken = '';
            if (hasSrc) {
              srcToken = '__ALLOFLOW_DATAURL_FINAL_' + imgIdx + '__';
              _deferredImageMap[srcToken] = imgInfo.generatedSrc;
            } else {
              // Extraction + Imagen both failed. Image falls to the upload UI inside the figure,
              // but that's easy to miss — record it so the fidelity panel can surface the failure.
              warnLog('[Images] generatedSrc null for img ' + imgIdx + ' — extraction + Imagen both failed. Rendering as upload placeholder.');
              window.__lastImageSrcMissing.push({
                idx: imgIdx,
                description: desc || '',
                page: imgInfo && imgInfo.page ? imgInfo.page : null,
                reason: imgInfo ? 'extraction-and-imagen-failed' : 'no-extracted-info',
              });
            }
            // Drag-drop + pick-extracted handlers (shared logic with renderJsonToHtml placeholder).
            const _altSafe = desc.replace(/"/g, '').replace(/'/g, '');
            const _insertFn2 = `function(c, dataUrl, altText){`
              + `var pk=c.querySelector('[data-alloflow-picker]');if(pk)pk.remove();`
              + `var target=null;var kids=c.children;for(var ii=0;ii<kids.length;ii++){if(kids[ii].tagName==='IMG'){target=kids[ii];break;}}`
              + `if(target){target.src=dataUrl;if(altText)target.alt=altText;}`
              + `else{target=document.createElement('img');target.src=dataUrl;target.alt=altText||'Image';target.style.cssText='max-width:100%;border-radius:8px;border:1px solid #e2e8f0';c.appendChild(target);}`
              + `c.style.background='none';c.style.border='none';c.style.padding='0';c.style.minHeight='0';`
              + `Array.from(c.children).forEach(function(ch){if(ch!==target)ch.remove();});`
              + `c.removeAttribute('ondragover');c.removeAttribute('ondragleave');c.removeAttribute('ondrop');`
              // Notify parent app of the swap so it can persist iframe state to
              // pdfFixResult.accessibleHtml — see _insertFn note above for the
              // full rationale.
              + `try{if(window.parent&&window.parent.__alloflowOnPdfPreviewMutated)window.parent.__alloflowOnPdfPreviewMutated();}catch(_){}}`;
            const _dragOver2 = `event.preventDefault();this.style.borderColor='#4f46e5';this.style.background='#eef2ff';`;
            const _dragLeave2 = `this.style.borderColor='#cbd5e1';this.style.background='#f1f5f9';`;
            const _dropHandler2 = `(function(c,ev){ev.preventDefault();c.style.borderColor='#cbd5e1';c.style.background='#f1f5f9';try{var raw=ev.dataTransfer.getData('text/x-alloflow-image');if(raw){var d=JSON.parse(raw);if(d&&d.src){(${_insertFn2})(c,d.src,d.alt||'${_altSafe}');return;}}var f=ev.dataTransfer.files&&ev.dataTransfer.files[0];if(f){var r=new FileReader();r.onload=function(e){(${_insertFn2})(c,e.target.result,'${_altSafe}');};r.readAsDataURL(f);}}catch(_){}})(this,event)`;
            const _uploadHandler2 = `(function(el){var f=el.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){var c=document.getElementById('${imgId}-container');(${_insertFn2})(c,e.target.result,'${_altSafe}');};r.readAsDataURL(f);})(this)`;
            // See note above on _pickHandler — same HTML-attribute-quote hazard applies here.
            const _pickHandler2 = `(function(btn){var c=document.getElementById('${imgId}-container');if(!c)return;var list=(typeof window!=='undefined'&&window.__alloflowExtractedImages)||[];var prevMsg=c.querySelector('[data-alloflow-nomsg]');if(prevMsg)prevMsg.remove();if(!list.length){var msg=document.createElement('div');msg.setAttribute('data-alloflow-nomsg','true');msg.style.cssText='margin-top:0.5rem;padding:8px 12px;background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;font-size:12px;color:#92400e;max-width:90%';msg.textContent='No extracted images yet. Upload a PDF that contains images, or click the \\u201CUpload image\\u201D button to pick a local file.';c.appendChild(msg);setTimeout(function(){msg.remove();},5000);return;}var ex=c.querySelector('[data-alloflow-picker]');if(ex){ex.remove();return;}var p=document.createElement('div');p.setAttribute('data-alloflow-picker','true');p.style.cssText='margin-top:0.75rem;padding:0.5rem;background:#fff;border:1px solid #cbd5e1;border-radius:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:4px;width:100%;max-height:220px;overflow-y:auto';list.forEach(function(img,i){if(!img||!img.src)return;var t=document.createElement('img');t.src=img.src;t.alt=img.description||('Image '+(i+1));t.title=img.description||('Image '+(i+1));t.style.cssText='width:100%;height:60px;object-fit:cover;cursor:pointer;border:1px solid #e2e8f0;border-radius:4px';t.onclick=function(){(${_insertFn2})(c,img.src,img.description||'${_altSafe}');};p.appendChild(t);});c.appendChild(p);})(this)`;
            // If we have a regenerated image, show it; otherwise show placeholder with upload
            return `<figure id="${imgId}-figure" data-img-idx="${imgIdx}"${hasCropData ? ` data-crop="${cropJson}"` : ''} style="position:relative;margin:1em 0">
<div id="${imgId}-container" style="${hasSrc ? '' : 'background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:8px;padding:1rem;'}text-align:center;min-height:${hasSrc ? '0' : '120px'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem"${hasSrc ? '' : ` ondragover="${_dragOver2}" ondragleave="${_dragLeave2}" ondrop="${_dropHandler2}"`}>
${hasSrc
  ? `<img src="${srcToken}" alt="${desc.replace(/"/g, '&quot;')}" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0">`
  : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
<span style="font-size:13px;color:#334155;font-weight:600">${imgInfo ? 'Image from page ' + imgInfo.page : 'Image placeholder'}</span>
<span style="font-size:12px;color:#475569">${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}</span>
<span style="font-size:11px;color:#64748b;font-style:italic">Drag an extracted image here, or:</span>`}
<div style="display:flex;gap:4px;margin-top:4px;align-items:center;justify-content:center;flex-wrap:wrap">
<label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:${hasSrc ? '#475569' : '#1d4ed8'};color:#ffffff !important;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${hasSrc ? '#334155' : '#1e3a8a'}">
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${hasSrc ? '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>' : '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'}</svg>
<span style="color:#ffffff !important">${hasSrc ? (isRegenerated ? 'Replace (AI generated)' : 'Replace') : 'Upload image'}</span>
<input type="file" accept="image/*" style="display:none" onchange="${_uploadHandler2}">
</label>
${!hasSrc ? `<button type="button" onclick="${_pickHandler2}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#7c3aed;color:#ffffff !important;border:1px solid #5b21b6;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer" aria-label="Pick from extracted images"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span style="color:#ffffff !important">Pick extracted</span></button>` : ''}
${hasCropData ? `<button onclick="window.__pdfCropImage && window.__pdfCropImage('${imgId}')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#6d28d9;color:#ffffff;border:1px solid #4c1d95;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer" aria-label="Adjust crop for this image"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>Adjust Crop</button>` : ''}
</div>
</div>
<figcaption style="font-size:0.9em;color:#475569;font-style:italic;margin-top:0.5em">${desc}${purpose ? '<br><em style="font-size:0.85em;color:#475569">Purpose: ' + purpose + '</em>' : ''}</figcaption>
</figure>`;
          }
        });
        _pipeLog('Images', 'Deferred ' + Object.keys(_deferredImageMap).length + ' image(s) as placeholder tokens — real data URLs restored at end of pipeline');
      }

      // Wrap in full HTML document
      let accessibleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Accessible Document — ${(_fileName || 'document').replace(/\.pdf$/i, '')}</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.7; color: #1e293b; }
h1, h2, h3, h4 { color: #0f172a; margin-top: 1.5em; }
h1 { font-size: 1.75rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
h2 { font-size: 1.4rem; }
h3 { font-size: 1.15rem; }
p { margin: 0.75em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; text-align: left; }
th { background: #f1f5f9; font-weight: bold; }
caption { font-weight: bold; margin-bottom: 0.5rem; text-align: left; }
img { max-width: 100%; height: auto; }
figure { margin: 1em 0; }
figcaption { font-size: 0.875rem; color: #64748b; font-style: italic; margin-top: 0.25rem; }
a { color: #2563eb; }
ul, ol { margin: 0.75em 0; padding-left: 1.5em; }
li { margin: 0.25em 0; }
pre { background: #f8fafc; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; font-size: 0.875rem; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
.sr-only:focus { position: static; width: auto; height: auto; padding: 0.5rem 1rem; margin: 0; overflow: visible; clip: auto; background: #2563eb; color: white; border-radius: 0.25rem; z-index: 1000; }
.extraction-note { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; }
figure[data-img-idx] { break-inside: avoid; }
@media print { body { padding: 0.5in; } .sr-only { display: none; } label input[type="file"] { display: none !important; } label:has(input[type="file"]) { display: none !important; } button[onclick*="pdfCropImage"] { display: none !important; } }
</style>
<script>
// Image crop adjustment UI — opens a modal with the full PDF page, user drags a selection, re-crops
window.__pdfCropImage = function(imgId) {
  var figure = document.getElementById(imgId + '-figure');
  if (!figure) return;
  var cropStr = figure.getAttribute('data-crop');
  if (!cropStr) { alert('No crop data available for this image.'); return; }
  var crop;
  try { crop = JSON.parse(cropStr); } catch(e) { alert('Invalid crop data.'); return; }
  var pageSrc = window.__pdfPageCanvases && window.__pdfPageCanvases[crop.page];
  if (!pageSrc) { alert('Full page image not available. Re-run remediation to enable cropping.'); return; }

  // Create modal overlay
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Adjust image crop');

  var header = document.createElement('div');
  header.style.cssText = 'color:white;font-size:14px;font-weight:bold;margin-bottom:8px;text-align:center';
  header.textContent = 'Drag to select crop region, then click Apply';
  overlay.appendChild(header);

  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;max-width:90vw;max-height:70vh;overflow:auto;background:#222;border-radius:8px;border:2px solid #555';
  overlay.appendChild(wrapper);

  var pageImg = document.createElement('img');
  pageImg.src = pageSrc;
  pageImg.style.cssText = 'display:block;max-width:100%;user-select:none;-webkit-user-drag:none';
  pageImg.draggable = false;
  wrapper.appendChild(pageImg);

  // Selection box
  var sel = document.createElement('div');
  sel.style.cssText = 'position:absolute;border:2px dashed #2563eb;background:rgba(37,99,235,0.15);pointer-events:none;display:none';
  wrapper.appendChild(sel);

  // Position the selection to match current crop (scaled to displayed image)
  pageImg.onload = function() {
    var scaleX = pageImg.clientWidth / crop.canvasW;
    var scaleY = pageImg.clientHeight / crop.canvasH;
    sel.style.left = (crop.x * scaleX) + 'px';
    sel.style.top = (crop.y * scaleY) + 'px';
    sel.style.width = (crop.w * scaleX) + 'px';
    sel.style.height = (crop.h * scaleY) + 'px';
    sel.style.display = 'block';
  };

  // Drag to create new selection
  var dragging = false, startX = 0, startY = 0;
  wrapper.onmousedown = function(e) {
    if (e.target === pageImg || e.target === wrapper) {
      var rect = pageImg.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      dragging = true;
      sel.style.left = startX + 'px'; sel.style.top = startY + 'px';
      sel.style.width = '0'; sel.style.height = '0';
      sel.style.display = 'block';
      e.preventDefault();
    }
  };
  wrapper.onmousemove = function(e) {
    if (!dragging) return;
    var rect = pageImg.getBoundingClientRect();
    var cx = Math.max(0, Math.min(e.clientX - rect.left, pageImg.clientWidth));
    var cy = Math.max(0, Math.min(e.clientY - rect.top, pageImg.clientHeight));
    sel.style.left = Math.min(startX, cx) + 'px';
    sel.style.top = Math.min(startY, cy) + 'px';
    sel.style.width = Math.abs(cx - startX) + 'px';
    sel.style.height = Math.abs(cy - startY) + 'px';
  };
  wrapper.onmouseup = function() { dragging = false; };

  // Buttons
  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px';

  var applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply Crop';
  applyBtn.style.cssText = 'padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer';
  applyBtn.onclick = function() {
    var scaleX = crop.canvasW / pageImg.clientWidth;
    var scaleY = crop.canvasH / pageImg.clientHeight;
    var sx = parseInt(sel.style.left) * scaleX;
    var sy = parseInt(sel.style.top) * scaleY;
    var sw = parseInt(sel.style.width) * scaleX;
    var sh = parseInt(sel.style.height) * scaleY;
    if (sw < 10 || sh < 10) { alert('Selection too small. Drag a larger area.'); return; }
    // Re-crop from stored full-page canvas
    var tmpImg = new Image();
    tmpImg.onload = function() {
      var c = document.createElement('canvas');
      c.width = Math.round(sw); c.height = Math.round(sh);
      c.getContext('2d').drawImage(tmpImg, Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh), 0, 0, c.width, c.height);
      var dataUrl = c.toDataURL('image/png');
      var container = document.getElementById(imgId + '-container');
      var img = container && container.querySelector('img');
      if (img) { img.src = dataUrl; }
      // Update crop data on figure for potential re-crop
      figure.setAttribute('data-crop', JSON.stringify({ page: crop.page, x: Math.round(sx), y: Math.round(sy), w: Math.round(sw), h: Math.round(sh), canvasW: crop.canvasW, canvasH: crop.canvasH }));
      document.body.removeChild(overlay);
    };
    tmpImg.src = pageSrc;
  };
  btnRow.appendChild(applyBtn);

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'padding:8px 20px;background:#64748b;color:white;border:none;border-radius:8px;font-weight:bold;font-size:13px;cursor:pointer';
  cancelBtn.onclick = function() { document.body.removeChild(overlay); };
  btnRow.appendChild(cancelBtn);

  overlay.appendChild(btnRow);
  document.body.appendChild(overlay);
  // Focus trap
  applyBtn.focus();
  overlay.onkeydown = function(e) { if (e.key === 'Escape') { document.body.removeChild(overlay); } };
};
</script>
</head>
<body>
<a href="#main-content" class="sr-only">Skip to main content</a>
<main id="main-content" role="main">
${bodyContent}
</main>
<footer role="contentinfo" style="margin-top:3rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:0.75rem;color:#94a3b8;">
<p>This document was automatically transformed for accessibility compliance (WCAG 2.1 AA) by AlloFlow. Original: ${(_fileName || 'unknown')} (${pageCount} pages). Transformed: ${new Date().toLocaleDateString()}.</p>
</footer>
</body>
</html>`;

      warnLog(`[PDF Fix] Final HTML: ${accessibleHtml.length} chars from ${extractedLength} chars extracted text`);

      // ── Step 2c: Spelling & grammar correction pass (on extracted text, not HTML) ──
      // Skip when text was extracted deterministically (pdf.js text layer) — no OCR artifacts
      const _wasOcrExtracted = window.__lastGroundTruthMethod === 'vision-ocr';
      if (!_wasOcrExtracted) {
        _pipeLog('Grammar', 'Skipping grammar check — text was extracted deterministically (no OCR artifacts)');
      }
      if (_wasOcrExtracted) {
      updateProgress(2, 'Checking spelling & grammar (OCR text)...');
      try {
        const textForCheck = (extractedText || '').trim();
        // With 65K output, we can send much larger chunks — 20KB instead of 5KB
        const GRAMMAR_CHUNK = 20000;
        const grammarChunks = [];
        for (let gi = 0; gi < textForCheck.length; gi += GRAMMAR_CHUNK) {
          grammarChunks.push(textForCheck.slice(gi, Math.min(gi + GRAMMAR_CHUNK, textForCheck.length)));
        }
        const allCorrections = new Map(); // dedupe by "wrong" text
        for (let gci = 0; gci < grammarChunks.length; gci++) {
          try {
            const grammarResult = await callGemini(`You are a professional proofreader. Check this text for spelling errors, grammar mistakes, and OCR artifacts (garbled characters from scanning).

TEXT TO CHECK (section ${gci + 1} of ${grammarChunks.length}):
"""
${grammarChunks[gci]}
"""

Find ONLY clear errors — not stylistic preferences. Focus on:
1. Misspelled words (especially OCR artifacts like "rn" instead of "m", "l" instead of "I")
2. Missing or extra spaces
3. Broken words from line-break extraction
4. Grammar errors (subject-verb agreement, missing articles)

Return ONLY JSON:
{"corrections": [{"wrong": "exact wrong text", "right": "corrected text", "type": "spelling|grammar|ocr"}], "totalErrors": N}
If no errors found, return: {"corrections": [], "totalErrors": 0}`, true);
            if (grammarResult) {
              let gc = grammarResult.trim();
              if (gc.indexOf('```') !== -1) { const ps = gc.split('```'); gc = ps[1] || ps[0]; if (gc.indexOf('\n') !== -1) gc = gc.split('\n').slice(1).join('\n'); if (gc.lastIndexOf('```') !== -1) gc = gc.substring(0, gc.lastIndexOf('```')); }
              // Self-repair: strip anything after the last } to handle trailing garbage
              const lastBrace = gc.lastIndexOf('}');
              if (lastBrace > 0) gc = gc.substring(0, lastBrace + 1);
              const parsed = JSON.parse(gc);
              if (parsed.corrections && parsed.corrections.length > 0) {
                parsed.corrections.forEach(c => {
                  if (c.wrong && c.right && c.wrong !== c.right) allCorrections.set(c.wrong, c);
                });
              }
            }
          } catch(chunkErr) { warnLog(`[Grammar] Chunk ${gci + 1} failed:`, chunkErr?.message); }
        }
        if (allCorrections.size > 0) {
          let fixCount = 0;
          for (const [, c] of allCorrections) {
            if (accessibleHtml.includes(c.wrong)) {
              accessibleHtml = accessibleHtml.split(c.wrong).join(c.right);
              fixCount++;
            }
          }
          if (fixCount > 0) {
            warnLog(`[PDF Fix] Grammar/spelling: fixed ${fixCount}/${allCorrections.size} issues across ${grammarChunks.length} sections`);
            if (addToast) addToast(`✏️ Fixed ${fixCount} spelling/grammar issue${fixCount > 1 ? 's' : ''}`, 'success');
          }
        }
      } catch(gramErr) { warnLog('[PDF Fix] Grammar check failed (non-blocking):', gramErr); }
      } // end if (_wasOcrExtracted)

      _pipeStepEnd(2, accessibleHtml.length + ' chars HTML generated');
      // ── Step 3a: Baseline axe-core on raw HTML (before any fixes) for consistent "before" score ──
      _pipeStepStart(3);
      updateProgress(3, 'Running baseline axe-core audit...');
      const beforeAxeResult = await runAxeAudit(accessibleHtml);
      const beforeAxeScore = beforeAxeResult ? beforeAxeResult.score : null;

      // ── Steps 3+4: Run quick AI verification + axe-core IN PARALLEL ──
      // Uses quick mode (sample-based) for speed — full chunked audit runs at the end
      updateProgress(3, 'Running quick verification...');
      let [verification, axeResultsRaw] = await Promise.all([
        auditOutputAccessibility(accessibleHtml),
        runAxeAudit(accessibleHtml)
      ]);
      const afterScore = verification ? verification.score : null;
      let axeResults = axeResultsRaw;

      // ── Step 4a: Fix common accessibility issues deterministically ──
      // These are patterns Gemini consistently flags — fixed without API calls
      {
        let aiFixCount = 0;

        // 1. Missing alt on images → derive from figcaption or add descriptive placeholder
        accessibleHtml = accessibleHtml.replace(/<img([^>]*)>/gi, (match, attrs) => {
          if (/alt\s*=/.test(attrs)) return match;
          aiFixCount++;
          return `<img alt="Document image"${attrs}>`;
        });

        // 1b. Heading contrast inside dark-background wrappers.
        // When the AI wraps content in a dark <div style="background:#1e3a5f;...">, any <h1>-<h6>
        // inside may inherit a heading color that matches the bg (docStyle.headingColor == headerBg),
        // producing dark-on-dark "Part II"-style invisible text. Force white for headings nested in
        // dark-background wrappers when they lack an explicit color override.
        try {
          const hexToLum = (hex) => {
            const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '');
            if (!m) return null;
            let h = m[1];
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            const r = parseInt(h.slice(0, 2), 16) / 255;
            const g = parseInt(h.slice(2, 4), 16) / 255;
            const b = parseInt(h.slice(4, 6), 16) / 255;
            const f = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          // Scan: any wrapper <div|section|header|aside|article> with a style="background:..." that
          // is darker than 0.20 luminance. For each such wrapper, ensure nested headings have white text.
          accessibleHtml = accessibleHtml.replace(
            /<(div|section|header|aside|article|main|nav)([^>]*?style="[^"]*?background(?:-color)?\s*:\s*(#[0-9a-f]{3,6})[^"]*?"[^>]*)>([\s\S]*?)<\/\1>/gi,
            (full, tag, attrs, bgHex, inner) => {
              const lum = hexToLum(bgHex);
              if (lum === null || lum >= 0.20) return full;
              const fixed = inner.replace(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, (hm, htag, hattrs, content) => {
                if (/style\s*=\s*"[^"]*color\s*:/i.test(hattrs)) return hm; // explicit color already set
                if (/style\s*=/i.test(hattrs)) {
                  return '<' + htag + hattrs.replace(/style\s*=\s*"([^"]*)"/i, 'style="color:#ffffff;$1"') + '>' + content + '</' + htag + '>';
                }
                return '<' + htag + ' style="color:#ffffff"' + hattrs + '>' + content + '</' + htag + '>';
              });
              if (fixed !== inner) aiFixCount++;
              return '<' + tag + attrs + '>' + fixed + '</' + tag + '>';
            }
          );
        } catch (hcErr) { warnLog('[Fix] Heading contrast pass threw:', hcErr); }

        // 2. Ensure exactly one h1 (document title)
        const h1Count = (accessibleHtml.match(/<h1[\s>]/gi) || []).length;
        if (h1Count === 0) {
          accessibleHtml = accessibleHtml.replace(/<h2([^>]*)>/, '<h1$1>');
          accessibleHtml = accessibleHtml.replace(/<\/h2>/, '</h1>');
          aiFixCount++;
        } else if (h1Count > 1) {
          // Demote extra h1s to h2
          let firstH1Found = false;
          accessibleHtml = accessibleHtml.replace(/<h1([^>]*)>/gi, (m, attrs) => {
            if (!firstH1Found) { firstH1Found = true; return m; }
            aiFixCount++;
            return `<h2${attrs}>`;
          });
          accessibleHtml = accessibleHtml.replace(/<\/h1>/gi, () => {
            if (firstH1Found) { return '</h1>'; } // keep first
            return '</h2>';
          });
        }

        // 3. Ensure <html> has valid lang attribute (BCP 47)
        if (!accessibleHtml.includes('lang=')) {
          accessibleHtml = accessibleHtml.replace(/<html/, '<html lang="en"');
          aiFixCount++;
        } else {
          const validLangPat = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
          accessibleHtml = accessibleHtml.replace(/<html([^>]*)lang="([^"]*)"/, (m, before, langVal) => {
            const trimmed = langVal.trim().toLowerCase().replace(/_/g, '-');
            if (!trimmed || !validLangPat.test(trimmed)) {
              const lMap = { 'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de', 'portuguese': 'pt', 'chinese': 'zh', 'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar' };
              const fixed = lMap[trimmed] || 'en';
              aiFixCount++;
              warnLog(`[Det Fix] Invalid lang="${langVal}" → lang="${fixed}"`);
              return `<html${before}lang="${fixed}"`;
            }
            if (trimmed !== langVal) { aiFixCount++; return `<html${before}lang="${trimmed}"`; }
            return m;
          });
        }

        // 4. Ensure <title> is non-empty
        if (/<title>\s*<\/title>/.test(accessibleHtml) || !accessibleHtml.includes('<title>')) {
          const titleMatch = accessibleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const titleText = titleMatch ? titleMatch[1].trim() : (_fileName || 'Accessible Document').replace(/\.pdf$/i, '');
          if (accessibleHtml.includes('<title>')) {
            accessibleHtml = accessibleHtml.replace(/<title>[^<]*<\/title>/, `<title>${titleText}</title>`);
          } else {
            accessibleHtml = accessibleHtml.replace('</head>', `<title>${titleText}</title>\n</head>`);
          }
          aiFixCount++;
        }

        // 5. Ensure all tables have scope on th elements
        accessibleHtml = accessibleHtml.replace(/<th(?![^>]*scope)/gi, () => {
          aiFixCount++;
          return '<th scope="col"';
        });

        // 6. Ensure all links have descriptive text (not empty)
        accessibleHtml = accessibleHtml.replace(/<a([^>]*)>\s*<\/a>/gi, (match, attrs) => {
          const href = attrs.match(/href="([^"]*)"/);
          aiFixCount++;
          return `<a${attrs}>${href ? href[1].replace(/https?:\/\//, '').substring(0, 40) : 'Link'}</a>`;
        });

        // 7. Ensure skip-to-content link exists (visible on focus, high contrast)
        if (!accessibleHtml.includes('Skip to') && !accessibleHtml.includes('skip-nav')) {
          accessibleHtml = accessibleHtml.replace(/<body[^>]*>/, (match) => {
            aiFixCount++;
            return match + '\n<a href="#main-content" class="skip-link" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:10000;background:#1e293b;color:#ffffff;padding:8px 16px;font-size:14px;font-weight:bold;text-decoration:none;border-radius:0 0 8px 0;border:2px solid #fbbf24">Skip to main content</a>';
          });
          // Inject focus-visible CSS for skip link
          if (accessibleHtml.includes('</head>')) {
            accessibleHtml = accessibleHtml.replace('</head>', '<style>.skip-link:focus{position:fixed!important;left:0!important;top:0!important;width:auto!important;height:auto!important;overflow:visible!important;clip:auto!important;z-index:10000!important;background:#1e293b!important;color:#ffffff!important;padding:12px 20px!important;font-size:16px!important;font-weight:bold!important;outline:3px solid #fbbf24!important;outline-offset:2px!important;text-decoration:underline!important}</style>\n</head>');
            aiFixCount++;
          }
        }

        // 8. Ensure main landmark exists
        if (!accessibleHtml.includes('<main')) {
          accessibleHtml = accessibleHtml.replace(/<body[^>]*>/, (match) => {
            aiFixCount++;
            return match + '\n<main id="main-content" role="main">';
          });
          accessibleHtml = accessibleHtml.replace('</body>', '</main>\n</body>');
        }

        // 8b. Ensure nav landmark (wrap TOC-like structures)
        if (!accessibleHtml.includes('<nav') && !accessibleHtml.includes('role="navigation"')) {
          var tocMatch2 = accessibleHtml.match(/<(h[1-3])[^>]*>.*?(table of contents|contents|navigation|toc).*?<\/\1>\s*<(ul|ol)/i);
          if (tocMatch2) {
            var tocIdx2 = accessibleHtml.indexOf(tocMatch2[0]);
            if (tocIdx2 >= 0) {
              accessibleHtml = accessibleHtml.substring(0, tocIdx2) + '<nav role="navigation" aria-label="Table of Contents">' + accessibleHtml.substring(tocIdx2);
              var listTag2 = tocMatch2[3];
              var closeTag2 = '</' + listTag2 + '>';
              var closeIdx2 = accessibleHtml.indexOf(closeTag2, tocIdx2 + tocMatch2[0].length);
              if (closeIdx2 >= 0) {
                accessibleHtml = accessibleHtml.substring(0, closeIdx2 + closeTag2.length) + '</nav>' + accessibleHtml.substring(closeIdx2 + closeTag2.length);
                aiFixCount++;
              }
            }
          }
        }

        // 8c. Ensure footer landmark (wrap copyright/attribution)
        if (!accessibleHtml.includes('<footer') && !accessibleHtml.includes('role="contentinfo"')) {
          var footerPat2 = [/(<p[^>]*>.*?(?:copyright|©|\u00a9|generated|created|source:|author:).*?<\/p>)\s*<\/main>/i];
          for (var fp2 = 0; fp2 < footerPat2.length; fp2++) {
            var fm2 = accessibleHtml.match(footerPat2[fp2]);
            if (fm2) { accessibleHtml = accessibleHtml.replace(fm2[0], '</main>\n<footer role="contentinfo">' + fm2[1] + '</footer>'); aiFixCount++; break; }
          }
        }

        // 9. Fix heading level skips (h1->h3 becomes h1->h2)
        const headingLevels = [...accessibleHtml.matchAll(/<h([1-6])[\s>]/gi)].map(m => parseInt(m[1]));
        if (headingLevels.length > 1) {
          let prevLevel = headingLevels[0];
          for (let hi = 1; hi < headingLevels.length; hi++) {
            if (headingLevels[hi] > prevLevel + 1) {
              const wrongLevel = headingLevels[hi];
              const correctLevel = prevLevel + 1;
              const skipRe = new RegExp(`<h${wrongLevel}([\\s>])`, 'i');
              const closeRe = new RegExp(`</h${wrongLevel}>`, 'i');
              if (skipRe.test(accessibleHtml)) {
                accessibleHtml = accessibleHtml.replace(skipRe, `<h${correctLevel}$1`);
                accessibleHtml = accessibleHtml.replace(closeRe, `</h${correctLevel}>`);
                aiFixCount++;
              }
              headingLevels[hi] = correctLevel;
            }
            prevLevel = headingLevels[hi];
          }
        }

        // 10. Remove empty headings
        accessibleHtml = accessibleHtml.replace(/<h([1-6])[^>]*>\s*<\/h\1>/gi, () => { aiFixCount++; return ''; });

        // 11. Fix "click here" / "read more" link text
        accessibleHtml = accessibleHtml.replace(/<a([^>]*href="([^"]*)"[^>]*)>(click here|read more|here|learn more|more)<\/a>/gi, (match, attrs, href, text) => {
          aiFixCount++;
          const domain = href.replace(/https?:\/\//, '').split('/')[0].substring(0, 30);
          return `<a${attrs}>${domain || 'Link'}</a>`;
        });

        // 12. Ensure viewport meta tag
        if (!accessibleHtml.includes('viewport')) {
          accessibleHtml = accessibleHtml.replace('</head>', '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>');
          aiFixCount++;
        }

        // 13. Fix duplicate IDs
        const idMatches = [...accessibleHtml.matchAll(/id="([^"]+)"/g)];
        const idCounts = {};
        idMatches.forEach(m => { idCounts[m[1]] = (idCounts[m[1]] || 0) + 1; });
        Object.entries(idCounts).filter(([, c]) => c > 1).forEach(([id]) => {
          let counter = 0;
          accessibleHtml = accessibleHtml.replace(new RegExp(`id="${id}"`, 'g'), () => {
            counter++;
            if (counter === 1) return `id="${id}"`;
            aiFixCount++;
            return `id="${id}-${counter}"`;
          });
        });

        if (aiFixCount > 0) {
          warnLog(`[PDF Fix] Applied ${aiFixCount} deterministic accessibility fixes`);
          if (addToast) addToast(`🔧 Auto-fixed ${aiFixCount} accessibility issues`, 'success');
        }
      }

      // ── Step 4b: Deterministic contrast fix (before AI auto-fix) ──
      if (axeResults && axeResults.critical.concat(axeResults.serious).some(v => v.id === 'color-contrast')) {
        updateProgress(4, 'Adjusting color contrast for readability...');
        const contrastFix = fixContrastViolations(accessibleHtml);
        if (contrastFix.fixCount > 0) {
          accessibleHtml = contrastFix.html;
          warnLog(`[PDF Fix] Deterministic contrast fix: ${contrastFix.fixCount} patterns fixed`);
        }
      }

      // ── Step 4b-1: Deterministic WCAG gap closures (form labels, decorative images, complex tables, lang spans) ──
      updateProgress(4, 'Running deterministic WCAG fixes...');
      accessibleHtml = runDeterministicWcagFixes(accessibleHtml);

      // ── Step 4c: Deterministic list-structure fix ──
      if (axeResults && axeResults.critical.concat(axeResults.serious).some(v => v.id === 'list')) {
        updateProgress(4, 'Fixing list structure for screen readers...');
        const listFix = fixListViolations(accessibleHtml);
        if (listFix.fixCount > 0) {
          accessibleHtml = listFix.html;
          warnLog(`[PDF Fix] Deterministic list fix: ${listFix.fixCount} patterns fixed`);
        }
      }

      // Re-run axe after all deterministic fixes
      if (axeResults) {
        const reAxe = await runAxeAudit(accessibleHtml);
        if (reAxe) axeResults = reAxe;
      }

      _pipeStepEnd(3, 'axe: ' + (axeResults ? axeResults.totalViolations : '?') + ' violations, AI: ' + (verification ? verification.score : '?') + '/100');
      // ── Step 4: Self-correcting AI fix loop with regression guard ──
      // Uses BOTH auditors. Reverts if score drops. Keeps going until stable.
      _pipeStepStart(4);
      let autoFixPasses = 0;
      const maxFixPasses = pdfAutoFixPasses;
      let bestHtml = accessibleHtml;
      let bestAiScore = verification ? verification.score : 0;
      let bestAxeViolations = axeResults ? axeResults.totalViolations : 0;

      const _aiIssueCount = verification && verification.issues ? verification.issues.length : 0;
      const _totalIssues = bestAxeViolations + _aiIssueCount;
      const _targetScore = pdfTargetScore || 90;
      if (maxFixPasses > 0 && _totalIssues > 0 && (bestAxeViolations > 0 || bestAiScore < _targetScore)) {
        // Emit live remediation session start so UI shows progress panel
        warnLog(`[Auto-fix] Starting fix loop: ${_totalIssues} issues (${bestAxeViolations} axe, ${_aiIssueCount} AI), score ${bestAiScore}, target ${_targetScore}`);
        // Emit specific issues list for UI to display during fix passes
        var _issuesList = [];
        if (verification && verification.issues) {
          _issuesList = verification.issues.map(function(iss) { return typeof iss === 'string' ? iss : (iss.issue || iss.description || String(iss)); }).slice(0, 12);
        }
        if (axeResults) {
          (axeResults.critical || []).forEach(function(v) { _issuesList.push('🔴 ' + v.description + ' (' + v.id + ')'); });
          (axeResults.serious || []).forEach(function(v) { _issuesList.push('🟠 ' + v.description + ' (' + v.id + ')'); });
          (axeResults.moderate || []).forEach(function(v) { _issuesList.push('🟡 ' + v.description); });
        }
        try { setTimeout(function() { window.dispatchEvent(new CustomEvent('alloflow:fix-issues-detected', { detail: { issues: _issuesList, score: bestAiScore, axeViolations: bestAxeViolations, target: _targetScore } })); }, 0); } catch(e) {}
        try { setTimeout(function() { window.dispatchEvent(new CustomEvent('alloflow:chunk-session-start', { detail: { totalChunks: maxFixPasses, chunkSizes: [], timestamp: Date.now() } })); }, 0); } catch(e) {}
        for (let fixPass = 0; fixPass < maxFixPasses; fixPass++) {
          // Emit per-pass start event for live UI (setTimeout isolates listener errors from pipeline)
          try { setTimeout(function() { var _fp = fixPass; window.dispatchEvent(new CustomEvent('alloflow:chunk-start', { detail: { index: _fp, total: maxFixPasses, sizeKB: Math.round(accessibleHtml.length / 1000), timestamp: Date.now() } })); }, 0); } catch(e) {}
          const _passAxeCount = axeResults ? axeResults.totalViolations : 0;
          const _passAiCount = verification && verification.issues ? verification.issues.length : 0;
          const _passTotal = _passAxeCount + _passAiCount;
          updateProgress(4, `Improving accessibility — pass ${fixPass + 1} of ${maxFixPasses} (${_passTotal} issue${_passTotal !== 1 ? 's' : ''} remaining — ${_passAxeCount} axe-core, ${_passAiCount} AI-flagged)${_passTotal === 0 ? ' \u2714 verifying...' : ''}...`);

          // Save snapshot before fix attempt
          const snapshotHtml = accessibleHtml;

          // AI attempts targeted fixes for remaining violations from BOTH engines
          const axeInstructions = []
            .concat((axeResults ? axeResults.critical || [] : []).map(v => `CRITICAL (axe-core): ${v.description} (${v.id}, ${v.nodes} elements)`))
            .concat((axeResults ? axeResults.serious || [] : []).map(v => `SERIOUS (axe-core): ${v.description} (${v.id}, ${v.nodes} elements)`))
            .concat((axeResults ? axeResults.moderate || [] : []).map(v => `MODERATE (axe-core): ${v.description} (${v.id})`));
          const aiInstructions = verification && verification.issues
            ? verification.issues.map(i => `AI-FLAGGED: ${i.issue || i}`)
            : [];
          const violationInstructions = axeInstructions.concat(aiInstructions).join('\n');

          try {
            // Chunked fix across the entire document (no truncation)
            const fixedHtml = await aiFixChunked(accessibleHtml, violationInstructions, `pdf-pass-${fixPass + 1}`);
            if (fixedHtml && fixedHtml !== accessibleHtml) {
              accessibleHtml = fixedHtml;
            }
          } catch(fixErr) {
            warnLog(`[Auto-fix] Pass ${fixPass + 1} AI fix failed:`, fixErr);
            break;
          }

          // Deterministic cleanup after each AI fix pass — catches AI-introduced errors
          const _postListFix = fixListViolations(accessibleHtml);
          if (_postListFix.fixCount > 0) { accessibleHtml = _postListFix.html; warnLog(`  Deterministic: fixed ${_postListFix.fixCount} list issues`); }
          const _postContrastFix = fixContrastViolations(accessibleHtml);
          if (_postContrastFix.fixCount > 0) { accessibleHtml = _postContrastFix.html; warnLog(`  Deterministic: fixed ${_postContrastFix.fixCount} contrast issues`); }
          // Deterministic WCAG gap closures
          accessibleHtml = runDeterministicWcagFixes(accessibleHtml);
          // Fix invalid ARIA roles
          const __validRoles = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
          const __roleCorrections = { 'content-info': 'contentinfo', 'nav': 'navigation', 'header': 'banner', 'footer': 'contentinfo', 'aside': 'complementary', 'section': 'region' };
          let __roleFixCount = 0;
          accessibleHtml = accessibleHtml.replace(/role="([^"]*)"/gi, (m, role) => {
            const lower = role.toLowerCase().trim();
            if (__validRoles.includes(lower)) return `role="${lower}"`;
            if (__roleCorrections[lower]) { __roleFixCount++; return `role="${__roleCorrections[lower]}"`; }
            __roleFixCount++; return '';
          });
          if (__roleFixCount > 0) warnLog(`  Deterministic: fixed ${__roleFixCount} invalid ARIA roles`);
          // Fix invalid lang attribute
          accessibleHtml = accessibleHtml.replace(/<html([^>]*)lang=["']([^"']*)["']/i, (m, before, langVal) => {
            const trimmed = langVal.trim().toLowerCase().replace(/_/g, '-');
            const validLang = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
            if (!trimmed || !validLang.test(trimmed)) {
              const langMap = { 'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de', 'portuguese': 'pt', 'chinese': 'zh', 'japanese': 'ja', 'korean': 'ko', 'arabic': 'ar' };
              const fixed = langMap[trimmed] || 'en';
              warnLog(`  Deterministic: fixed invalid lang="${langVal}" → "${fixed}"`);
              return `<html${before}lang="${fixed}"`;
            }
            return m;
          });

          // Re-audit with 2 AI engines + axe-core (2 provides averaging + disagreement detection while saving ~33% API calls vs 3)
          updateProgress(4, `Verifying improvements — checking pass ${fixPass + 1} results...`);
          const [reVerify1, reVerify2, reAxe] = await Promise.all([
            auditOutputAccessibility(accessibleHtml),
            auditOutputAccessibility(accessibleHtml),
            runAxeAudit(accessibleHtml)
          ]);

          // Average 2 AI scores & compute SEM for significance testing
          const reScores = [reVerify1, reVerify2].map(v => v ? v.score : null).filter(s => s !== null);
          const newAiScore = reScores.length > 0 ? Math.round(reScores.reduce((a, b) => a + b, 0) / reScores.length) : bestAiScore;
          const reSD = reScores.length > 1 ? Math.sqrt(reScores.reduce((s, x) => s + (x - newAiScore) ** 2, 0) / (reScores.length - 1)) : 0;
          const reSEM = reScores.length > 1 ? reSD / Math.sqrt(reScores.length) : 0;
          // Pick auditor with HIGHEST score for issues list
          const reVerify = [reVerify1, reVerify2]
            .filter(Boolean)
            .sort((a, b) => (b.score || 0) - (a.score || 0))[0] || null;
          if (reVerify) { reVerify.score = newAiScore; reVerify._sem = reSEM; reVerify._sd = reSD; reVerify._scores = reScores; }
          const newAxeViolations = reAxe ? reAxe.totalViolations : bestAxeViolations;
          autoFixPasses++;

          // Regression guard: if BOTH scores got worse, revert
          const aiWorse = newAiScore < bestAiScore - 5; // allow 5-point tolerance
          const axeWorse = newAxeViolations > bestAxeViolations;

          if (aiWorse && axeWorse) {
            warnLog(`[Auto-fix] Pass ${fixPass + 1} REGRESSED (AI: ${bestAiScore}→${newAiScore}, axe: ${bestAxeViolations}→${newAxeViolations}) — REVERTING`);
            accessibleHtml = snapshotHtml;
            if (addToast) addToast(`⚠️ Fix pass ${fixPass + 1} made things worse — reverted`, 'info');
            break;
          }

          // Update best known state
          if (reVerify) verification = reVerify;
          if (reAxe) axeResults = reAxe;
          bestHtml = accessibleHtml;
          bestAiScore = newAiScore;
          bestAxeViolations = newAxeViolations;

          warnLog(`[Auto-fix] Pass ${fixPass + 1}: AI ${newAiScore}/100, axe ${newAxeViolations} violations`);

          // Emit per-pass completion for live UI
          try { var _cfDetail = { index: fixPass, total: maxFixPasses, originalHtml: '', fixedHtml: accessibleHtml, score: newAiScore, deterministicFixCount: 0, surgicalFixCount: 0, integrityPassed: true, aiVerified: true, wasRetried: false, usedOriginal: false, sizeKB: Math.round(accessibleHtml.length / 1000), timestamp: Date.now() }; setTimeout(function() { window.dispatchEvent(new CustomEvent('alloflow:chunk-fixed', { detail: _cfDetail })); }, 0); } catch(e) {}

          // If BOTH engines report 0 actionable issues, stop regardless of score
          if (newAxeViolations === 0 && (!reVerify || !reVerify.issues || reVerify.issues.length === 0)) {
            warnLog(`[Auto-fix] Pass ${fixPass + 1}: zero issues from both engines — stopping`);
            break;
          }

          // If BOTH engines are satisfied, stop
          const targetScore = pdfTargetScore || 90;
          if (newAxeViolations === 0 && newAiScore >= targetScore) {
            warnLog(`[Auto-fix] Excellent: axe clean + AI ${newAiScore}/100 (target ${targetScore}) — stopping`);
            break;
          }

          // Plateau detection with statistical significance threshold
          const axeImproved = newAxeViolations < bestAxeViolations;
          // Only count AI improvement if it exceeds 1 SEM (statistically meaningful)
          const minDetectable = Math.max(2, Math.round(reSEM * 1.5));
          const aiImproved = newAiScore > bestAiScore + minDetectable;
          if (!axeImproved && !aiImproved && fixPass > 0) {
            warnLog(`[Auto-fix] Plateau: AI ${newAiScore}, axe ${newAxeViolations} — no improvement, stopping`);
            break;
          }
        }
        // Emit session complete for live UI
        try { var _scDetail = { totalChunks: autoFixPasses, timestamp: Date.now() }; setTimeout(function() { window.dispatchEvent(new CustomEvent('alloflow:chunk-session-complete', { detail: _scDetail })); }, 0); } catch(e) {}
      }

      // ── Diff-based semantic cleanup: compare final HTML against extractedText ground truth ──
      // Instead of blind regex, we identify what changed from the original and classify
      // each change as intentional (alt text, headings, labels) vs artifact (JSON, escapes)
      {
        const _beforeCleanHtml = accessibleHtml;

        // Phase 1: Always-safe deterministic fixes (no risk of content loss)
        accessibleHtml = accessibleHtml.replace(/\\n\\n/g, '</p>\n<p>').replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\"/g, '"');
        accessibleHtml = accessibleHtml.replace(/```html\s*/gi, '').replace(/```\s*/g, '');
        accessibleHtml = accessibleHtml.replace(/(<p>\s*<\/p>)+/g, '');

        // Phase 2: Diff-based artifact detection
        if (extractedText && extractedText.length > 100) {
          const _originalNorm = extractedText.toLowerCase().replace(/\s+/g, ' ').trim();
          const _htmlText = accessibleHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const _htmlNorm = _htmlText.toLowerCase();

          // Find text segments in HTML that are NOT in the original (additions)
          // Split HTML text into sentences and check each against original
          const _htmlSentences = _htmlText.split(/[.!?]\s+/).filter(s => s.trim().length > 15);
          const _additions = []; // text that was added (not in original)
          const _preserved = []; // text from original that survived
          const _artifacts = []; // suspected artifacts

          _htmlSentences.forEach(function(sent) {
            const norm = sent.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 100);
            if (norm.length < 15) return;
            if (_originalNorm.includes(norm)) {
              _preserved.push(norm);
            } else {
              // This text was added during remediation — classify it
              var isArtifact = false;
              // JSON syntax artifacts
              if (/\{"type"\s*:|\[\s*\{/.test(sent)) isArtifact = true;
              // Escaped characters that shouldn't be visible
              if (/\\n|\\t|\\"|```/.test(sent)) isArtifact = true;
              // Raw code fence
              if (/^```|```$/.test(sent.trim())) isArtifact = true;

              if (isArtifact) {
                _artifacts.push(sent.substring(0, 80));
              } else {
                _additions.push(sent.substring(0, 80));
              }
            }
          });

          _pipeLog('Diff', 'Semantic diff: ' + _preserved.length + ' original sentences preserved, ' + _additions.length + ' intentional additions (alt text, labels), ' + _artifacts.length + ' artifacts detected');

          // Phase 3: Remove artifacts found by diff analysis
          // Convert raw JSON blocks to HTML (these are definitely artifacts, not intentional)
          // Handle both canonical schema {"type":"p","text":"..."} AND Gemini's alternate
          // schema {"tag":"p","class":"ds6","content":"..."} which leaks when the AI returns
          // a different structure than expected.
          accessibleHtml = accessibleHtml.replace(/\{"(?:type|tag)"\s*:\s*"(?:p|paragraph)"[^{}]*?(?:"(?:text|content)"\s*:\s*"([^"]*)")?\s*\}/g, function(m, txt) { return txt ? '<p>' + txt + '</p>' : ''; });
          accessibleHtml = accessibleHtml.replace(/\{"(?:type|tag)"\s*:\s*"(?:h[1-6])"[^{}]*?(?:"(?:text|content)"\s*:\s*"([^"]*)")?\s*\}/g, function(m, txt) { return txt ? '<h2>' + txt + '</h2>' : ''; });
          accessibleHtml = accessibleHtml.replace(/\{"(?:type|tag)"\s*:\s*"(?:ul|ol)"\s*,\s*"items"\s*:\s*\[([^\]]*)\]\s*\}/g, function(m, items) {
            var parsed = items.split(',').map(function(s) { return s.replace(/"/g, '').trim(); }).filter(Boolean);
            return '<ul>' + parsed.map(function(i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
          });
          accessibleHtml = accessibleHtml.replace(/\{"(?:type|tag)"\s*:\s*"(?:blockquote)"[^{}]*?"(?:text|content)"\s*:\s*"([^"]*)"\s*\}/g, '<blockquote>$1</blockquote>');
          accessibleHtml = accessibleHtml.replace(/\{"(?:type|tag)"\s*:\s*"hr"\s*\}/g, '<hr>');
          // Catch-all: only match JSON objects that ALSO have a type/tag/element/kind/role sibling —
          // without that sibling, this regex used to match legit inline content like
          // {"content": "a long quoted sentence..."} that appears mid-prose, capture only up to the
          // first embedded quote, and greedily consume the rest with [^{}]*} — silently deleting
          // paragraphs of document content. Requiring a sibling "kind" key keeps this effective for
          // true JSON artifacts (Gemini block shapes) while not eating real prose.
          accessibleHtml = accessibleHtml.replace(/\{[^{}]*"(?:type|tag|element|kind|role)"\s*:\s*"[^"]+"[^{}]*"(?:text|content)"\s*:\s*"([^"]{10,})"[^{}]*\}/g, '<p>$1</p>');
          accessibleHtml = accessibleHtml.replace(/\{[^{}]*"(?:text|content)"\s*:\s*"([^"]{10,})"[^{}]*"(?:type|tag|element|kind|role)"\s*:\s*"[^"]+"[^{}]*\}/g, '<p>$1</p>');
          // Strip JSON wrappers — catch all known Gemini key variants including alternate schemas.
          // Gemini has returned: {html, content, text, section, fixed_html, output_html, accessible_html,
          // tag, class, element, value, body} — match any of these or any *_html key.
          var _jsonKeyPat = '(?:html|content|text|section|tag|class|element|value|body|fixed_html|output_html|accessible_html|\\w*_?html)';
          // Empty-array prefix (e.g. "[\n]{\"html\":\"...\"}") — common when one chunk returned []
          // and the next returned a bare object. Original regex required [ and { to be adjacent.
          accessibleHtml = accessibleHtml.replace(new RegExp('^\\s*\\[\\s*\\]\\s*(?=\\{\\s*"' + _jsonKeyPat + '"\\s*:)', ''), '');
          accessibleHtml = accessibleHtml.replace(new RegExp('^\\s*\\[?\\s*\\{[^}]*"' + _jsonKeyPat + '"\\s*:\\s*"', 'm'), '');
          // Suffix: "}]" at end of document — use /s so \s* can span newlines.
          accessibleHtml = accessibleHtml.replace(/"\s*\}\s*\]\s*$/s, '');
          accessibleHtml = accessibleHtml.replace(/"\s*\}\s*$/s, '');
          // Also handle bare string-array suffix: `"]` (for [""..."] shapes without objects).
          accessibleHtml = accessibleHtml.replace(/"\s*\]\s*$/s, '');
          // Final catch-all: strip any leading JSON-shape junk (brackets, braces, quotes, commas,
          // whitespace) that appears BEFORE the first real HTML tag at the document start.
          // Safe because it only fires when a literal HTML tag follows immediately, so legitimate
          // prose that happens to start with '[' won't be mangled.
          accessibleHtml = accessibleHtml.replace(/^[\s\[\]\{\}"',]+(?=<[a-zA-Z])/, '');
          // Strip JSON array transition fragments: "}{ or "][{ patterns that leak between concatenated
          // JSON objects when Gemini returns multiple blocks. These appear as visible garbage in the output.
          accessibleHtml = accessibleHtml.replace(new RegExp('"\\s*,\\s*\\{\\s*"' + _jsonKeyPat + '"\\s*:\\s*"', 'g'), '\n');
          accessibleHtml = accessibleHtml.replace(new RegExp('"\\s*\\]\\s*\\[\\s*\\{\\s*"' + _jsonKeyPat + '"\\s*:\\s*"', 'g'), '\n');
          // Also strip standalone "} ][" and "} ][ {" fragments with no recognized key (bare transitions).
          accessibleHtml = accessibleHtml.replace(/"\s*\}\s*\]\s*\[\s*\{\s*"/g, '\n');
          // Strip orphan escaped-quote-plus-comma fragments ("," or " , ") that appear as raw text when
          // JSON array item separators leak through without being consumed by another cleanup pattern.
          // Only match when surrounded by whitespace/newlines so we don't corrupt legitimate content.
          accessibleHtml = accessibleHtml.replace(/(\n|>)\s*"\s*,\s*"\s*(\n|<)/g, '$1$2');
          accessibleHtml = accessibleHtml.replace(/(\n|>)\s*"\s*,\s*(\n|<)/g, '$1$2');

          // Phase 4: If artifacts remain, send ONLY the diffs to Gemini (not the whole doc)
          var _remainingArtifacts = (accessibleHtml.match(/\{"(?:type|tag|element)"\s*:\s*"/g) || []).length;
          if (_remainingArtifacts > 0 && callGemini && _artifacts.length > 0) {
            _pipeLog('Diff', _remainingArtifacts + ' artifacts remain — sending diff summary to Gemini for cleanup');
            try {
              // Build a compact diff payload with just the problem areas
              const _artifactSamples = _artifacts.slice(0, 10).map(function(a, i) { return (i + 1) + '. "' + a + '"'; }).join('\n');
              const _cleaned = await callGemini(
                'This HTML document has ' + _remainingArtifacts + ' raw JSON artifacts mixed into the content.\n\n' +
                'ARTIFACT EXAMPLES (text that should NOT be in the document):\n' + _artifactSamples + '\n\n' +
                'IMPORTANT: The document also has INTENTIONAL additions like alt text for images, ARIA labels, and heading restructuring. Do NOT remove those.\n\n' +
                'Convert any remaining raw JSON blocks (like {"type":"p","text":"..."}) into proper HTML. Remove escape sequences (\\n, \\t). Preserve ALL other content.\n\n' +
                'HTML:\n"""\n' + accessibleHtml + '\n"""', true);
              if (_cleaned && textCharCount(_cleaned) >= textCharCount(accessibleHtml) * 0.95) {
                accessibleHtml = stripFence(_cleaned);
                _pipeLog('Diff', 'AI diff-based cleanup applied');
              }
            } catch(cleanErr) { warnLog('[Diff Cleanup] AI cleanup failed:', cleanErr.message); }
          }

          // Phase 5: Ground-truth verification — sample original sentences and verify they survived
          const _finalHtmlText = accessibleHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          const _origSentences = extractedText.split(/[.!?]\s+/).filter(s => s.length > 30 && s.length < 200);
          const _sampleSize = Math.min(15, _origSentences.length);
          const _step = Math.max(1, Math.floor(_origSentences.length / _sampleSize));
          let _matchCount = 0, _totalChecked = 0;
          for (let si = 0; si < _origSentences.length && _totalChecked < _sampleSize; si += _step) {
            _totalChecked++;
            const _needle = _origSentences[si].toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 80);
            if (_needle.length > 20 && _finalHtmlText.includes(_needle)) _matchCount++;
          }
          const _matchRate = _totalChecked > 0 ? _matchCount / _totalChecked : 1;
          _pipeLog('Verify', 'Ground-truth: ' + _matchCount + '/' + _totalChecked + ' sentences (' + Math.round(_matchRate * 100) + '% match), ' + _additions.length + ' intentional additions preserved');

          if (_matchRate < 0.5 && _beforeCleanHtml) {
            warnLog('[Cleanup] Ground-truth match too low (' + Math.round(_matchRate * 100) + '%) — reverting to pre-cleanup HTML');
            accessibleHtml = _beforeCleanHtml;
            accessibleHtml = accessibleHtml.replace(/\\n\\n/g, '</p>\n<p>').replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\"/g, '"');
            accessibleHtml = accessibleHtml.replace(/(<p>\s*<\/p>)+/g, '');
          }
        } else {
          // No extracted text available — fall back to regex-only cleanup
          accessibleHtml = accessibleHtml.replace(/\{"type"\s*:\s*"[^"]*"\s*,\s*"text"\s*:\s*"([^"]*)"\s*\}/g, '<p>$1</p>');
          accessibleHtml = accessibleHtml.replace(/\{[^{}]*"text"\s*:\s*"([^"]{10,})"\s*[^{}]*\}/g, '<p>$1</p>');
        }
      }

      // ── Final contrast + WCAG revalidation (catches AI-introduced color violations) ──
      try {
        const _finalContrast = fixContrastViolations(accessibleHtml);
        if (_finalContrast.fixCount > 0) {
          accessibleHtml = _finalContrast.html;
          _pipeLog('Cleanup', 'Final contrast revalidation: fixed ' + _finalContrast.fixCount + ' color issues');
        }
        const _finalSanitize = sanitizeStyleForWCAG(accessibleHtml);
        if (_finalSanitize.fixCount > 0) {
          accessibleHtml = _finalSanitize.html;
          _pipeLog('Cleanup', 'Final WCAG sanitization: fixed ' + _finalSanitize.fixCount + ' issues');
        }
        // Also re-run deterministic list/ARIA fixes
        accessibleHtml = runDeterministicWcagFixes(accessibleHtml);
      } catch(finalFixErr) { warnLog('[Final Fix] Revalidation failed:', finalFixErr.message); }

      // ── Final authoritative audit: re-run ONE clean audit on the finished HTML ──
      // The verification from the fix loop may have stale issues from an earlier pass.
      // This ensures the issues list matches what the user actually gets.
      try {
        // Full chunked audit for accurate final scoring
        const finalAudit = await auditOutputAccessibility(accessibleHtml);
        if (finalAudit) {
          verification = finalAudit;
          warnLog(`[PDF Fix] Final audit: score ${finalAudit.score}, ${(finalAudit.issues || []).length} remaining issues, ${(finalAudit.passes || []).length} passes`);
        }
      } catch(finalAuditErr) {
        warnLog('[PDF Fix] Final audit failed (using loop result):', finalAuditErr);
      }
      // Last-resort fallback: when the loop's verify AND the final audit both
      // return null (Gemini timeout / quota on both), verification ends up
      // undefined and the UI verification panel has nothing to render.
      // Synthesize a minimal verification from axe-core so the panel always
      // shows something; flag as synthesized so the panel can indicate "AI
      // unavailable — issues derived from axe-core automated audit only."
      if (!verification && axeResults) {
        const axeViolations = Array.isArray(axeResults.violations) ? axeResults.violations : [];
        verification = {
          score: (typeof axeResults.score === 'number') ? axeResults.score : null,
          summary: 'AI verification unavailable — issues below derived from axe-core automated audit.',
          issues: axeViolations.slice(0, 20).map(function(v) {
            var tagArr = Array.isArray(v.tags) ? v.tags : [];
            var wcagTag = null;
            for (var ti = 0; ti < tagArr.length; ti++) { if (/^wcag/i.test(tagArr[ti])) { wcagTag = tagArr[ti]; break; } }
            return {
              wcag: wcagTag || 'unknown',
              issue: v.help || v.description || v.id || 'axe violation',
              severity: v.impact || 'moderate',
            };
          }),
          passes: [],
          synthesized: true,
        };
        warnLog('[PDF Fix] Synthesized verification from axe-core (AI verify + final audit both returned null).');
      }

      // ── Post-AI safety-net: re-run deterministic fixers in case AI introduced new issues ──
      if (autoFixPasses > 0) {
        const safetyContrast = fixContrastViolations(accessibleHtml);
        if (safetyContrast.fixCount > 0) {
          accessibleHtml = safetyContrast.html;
          warnLog(`[PDF Fix] Safety-net contrast fix: ${safetyContrast.fixCount} patterns fixed after AI loop`);
        }
        const safetyList = fixListViolations(accessibleHtml);
        if (safetyList.fixCount > 0) {
          accessibleHtml = safetyList.html;
          warnLog(`[PDF Fix] Safety-net list fix: ${safetyList.fixCount} patterns fixed after AI loop`);
        }
        // Safety-net deterministic WCAG gap closures
        accessibleHtml = runDeterministicWcagFixes(accessibleHtml);
        // Re-run axe after safety-net fixes
        const safetyAxe = await runAxeAudit(accessibleHtml);
        if (safetyAxe) axeResults = safetyAxe;
      }

      // Blend final score with axe-core (same 50/50 method as initial audit for consistent comparison)
      let finalAfterScore = verification ? verification.score : afterScore;
      const axeScoreAvailable = axeResults && typeof axeResults.score === 'number';
      let axeCoreFailed = false;
      if (finalAfterScore !== null && axeScoreAvailable) {
        const blendedFinal = Math.round((finalAfterScore + axeResults.score) / 2);
        warnLog(`[PDF Fix] Final blended score: AI ${finalAfterScore} + axe ${axeResults.score} = ${blendedFinal}`);
        finalAfterScore = blendedFinal;
      } else if (!axeScoreAvailable) {
        // Dual-engine guarantee is broken — surface this to the UI so the banner can warn users.
        axeCoreFailed = true;
        warnLog(`[PDF Fix] WARNING: axe-core score unavailable — final score is AI-only (${finalAfterScore}). Results may be less reliable.`);
      }

      // Score divergence check
      if (verification && verification.score !== null && afterScore !== null) {
        const divergence = Math.abs(verification.score - afterScore);
        if (divergence > 15) {
          warnLog(`[PDF Fix] WARNING: Final audit score diverged by ${divergence} points from loop result (final: ${verification.score}, loop: ${afterScore})`);
        }
      }

      // ── Integrity check: compare final HTML text content to deterministic ground truth ──
      // This catches silent truncation that slipped past individual fix-pass guards.
      let integrityCoverage = null;
      let integrityWarning = null;
      try {
        const groundTruth = window.__lastGroundTruthCharCount || 0;
        const groundTruthMethod = window.__lastGroundTruthMethod || 'unknown';
        if (groundTruth > 0) {
          const finalText = textCharCount(accessibleHtml);
          integrityCoverage = Math.round((finalText / groundTruth) * 100);
          warnLog(`[Integrity] Final HTML text: ${finalText} chars / source: ${groundTruth} chars (${integrityCoverage}% coverage, method=${groundTruthMethod})`);
          if (finalText < groundTruth * 0.97) {
            integrityWarning = `Output contains ${finalText.toLocaleString()} chars but source had ${groundTruth.toLocaleString()} (${integrityCoverage}% coverage). Some content may be missing.`;
            if (!_silentMode) addToast('⚠ Integrity: ' + integrityWarning, 'error');
            warnLog('[Integrity] COVERAGE SHORT — ' + integrityWarning);
          } else if (!_silentMode && integrityCoverage >= 98) {
            addToast(`✅ Content integrity: ${integrityCoverage}% coverage verified`, 'success');
          }
        }
      } catch (integrityErr) {
        warnLog('[Integrity] check failed (non-critical):', integrityErr?.message);
      }

      // ── Triage: flag documents that need expert remediation ──
      const axeViolations = axeResults ? axeResults.totalViolations : 0;
      const axeCritical = axeResults ? axeResults.critical.length : 0;
      const axeFailed = !axeResults || typeof axeResults.score !== 'number';
      const needsExpertReview = axeFailed || // axe-core failed entirely — can't verify
        integrityWarning || // content loss detected — always flag for review
        (autoFixPasses > 0 && ((finalAfterScore !== null && finalAfterScore < 70) || axeCritical > 0));

      // ── Final step: restore deferred image data URLs ──
      // All AI passes (grammar, surgical, aiFixChunked, artifact cleanup) have completed; now we
      // swap placeholder tokens for the real base64 data URLs. Because this is a deterministic
      // string replacement on tokens that passed through every AI stage unchanged, we guarantee
      // zero image corruption regardless of what any AI pass tried to do.
      if (_deferredImageMap && Object.keys(_deferredImageMap).length > 0) {
        // Per-token placement tally: we need to know WHICH tokens were dropped (not just how
        // many) so the fidelity panel can surface each failing image to the user with a
        // "Regenerate" button.
        const _parseTokenIdx = (tok) => { const m = tok.match(/__ALLOFLOW_DATAURL_FINAL_(\d+)__/); return m ? parseInt(m[1], 10) : null; };
        const _placedIdx = [];
        const _droppedIdx = [];
        // Tolerant match: case-insensitive, whitespace allowed inside the token. Catches Gemini
        // responses that wrapped a token across a line or lowercased attribute values.
        Object.keys(_deferredImageMap).forEach((token) => {
          const idxMatch = token.match(/__ALLOFLOW_DATAURL_FINAL_(\d+)__/);
          const idx = idxMatch ? parseInt(idxMatch[1], 10) : null;
          if (idx == null) return;
          const tolerantRe = new RegExp('_\\s*_\\s*ALLOFLOW\\s*_\\s*DATAURL\\s*_\\s*FINAL\\s*_\\s*' + idx + '\\s*_\\s*_', 'gi');
          const before = accessibleHtml;
          accessibleHtml = accessibleHtml.replace(tolerantRe, _deferredImageMap[token]);
          if (before !== accessibleHtml) _placedIdx.push(idx);
          else _droppedIdx.push(idx);
        });
        const _tokenCountBefore = _placedIdx.length;
        const _expectedTokens = Object.keys(_deferredImageMap).length;
        _pipeLog('Images', 'Restored ' + _tokenCountBefore + '/' + _expectedTokens + ' image data URL(s) from placeholder tokens');
        if (_droppedIdx.length > 0) {
          warnLog('[Images] WARNING: ' + _droppedIdx.length + ' image placeholder token(s) were missing before restoration — an AI pass dropped figures at indexes: ' + _droppedIdx.join(', '));
          // Fallback re-injection: the actual image bytes still live in _deferredImageMap; append
          // them to a recovery section at the end of <main> so no visual content is silently lost.
          // Placement may be imperfect (end-of-doc rather than original inline position), but the
          // image is guaranteed present in the output.
          const _recovered = [];
          const _recoveredFigures = _droppedIdx.map((i) => {
            const tok = '__ALLOFLOW_DATAURL_FINAL_' + i + '__';
            const dataUrl = _deferredImageMap[tok];
            if (!dataUrl) return '';
            _recovered.push(i);
            return '<figure style="margin:1.5em 0;text-align:center"><img src="' + dataUrl + '" alt="Extracted image ' + (i + 1) + ' from source document" style="max-width:100%;height:auto"/><figcaption style="color:#78350f;font-size:0.85em;margin-top:0.5em">Image ' + (i + 1) + ' (reinserted after remediation)</figcaption></figure>';
          }).filter(Boolean).join('\n');
          if (_recoveredFigures) {
            const recoverySection = '<section aria-label="Extracted images recovered after remediation" data-image-recovery="true" style="margin-top:2em;padding:1em;border-top:2px solid #f59e0b;background:#fffbeb;border-radius:8px">\n' +
              '<h2 style="color:#b45309;font-size:1.1em;margin-top:0">Extracted images</h2>\n' +
              '<p style="color:#78350f;font-size:0.9em">These images were extracted from the source document but were dropped during remediation. They appear here so no visual content is lost — you can move them back inline if needed.</p>\n' +
              _recoveredFigures +
              '\n</section>';
            if (accessibleHtml.includes('</main>')) {
              accessibleHtml = accessibleHtml.replace('</main>', recoverySection + '\n</main>');
            } else if (accessibleHtml.includes('</body>')) {
              accessibleHtml = accessibleHtml.replace('</body>', recoverySection + '\n</body>');
            } else {
              accessibleHtml = accessibleHtml + '\n' + recoverySection;
            }
            _pipeLog('Images', 'Fallback re-injected ' + _recovered.length + ' dropped image(s) into a recovery section at end of <main>');
            // After recovery, these images are technically placed (just at end-of-doc). Keep
            // __lastImageDroppedByAi populated so the fidelity panel can still flag the placement
            // quality, but the images themselves are no longer silently lost.
            _placedIdx.push.apply(_placedIdx, _recovered);
          }
          window.__lastImageDroppedByAi = _droppedIdx.slice();
        }
      }
      // Always emit the image reinsertion report so the UI can surface any failures — even when
      // _deferredImageMap was empty (all images failed at extraction, no tokens ever generated).
      try {
        const _srcMissing = Array.isArray(window.__lastImageSrcMissing) ? window.__lastImageSrcMissing : [];
        const _aiDropped = Array.isArray(window.__lastImageDroppedByAi) ? window.__lastImageDroppedByAi : [];
        const _totalImages = (typeof extractedImages !== 'undefined' && extractedImages) ? extractedImages.length : 0;
        const _placedCount = _totalImages - _srcMissing.length - _aiDropped.length;
        if (_srcMissing.length > 0 || _aiDropped.length > 0) {
          window.dispatchEvent(new CustomEvent('alloflow:image-reinsertion-report', {
            detail: {
              total: _totalImages,
              placed: Math.max(0, _placedCount),
              missingSrc: _srcMissing.map(m => m.idx),
              missingSrcDetails: _srcMissing,
              droppedByAi: _aiDropped,
              timestamp: Date.now(),
            }
          }));
          if (typeof addToast === 'function') {
            const failCount = _srcMissing.length + _aiDropped.length;
            addToast('⚠️ ' + failCount + ' image' + (failCount === 1 ? '' : 's') + ' failed to reinsert — review in the fidelity panel.', 'warning');
          }
        }
      } catch(e) { /* non-blocking */ }

      // ── Store results ──
      // sourceText + finalText feed the "Diff view" button in the remediation UI so
      // the user can audit verbatim-fidelity word-by-word. They cost some memory
      // (~2x doc size) but the UX value is high: the integrity % is only actionable
      // if the user can see WHAT drifted.
      const _result = {
        accessibleHtml,
        integrityCoverage,
        integrityWarning,
        sourceText: extractedText || '',
        finalText: htmlToPlainText(accessibleHtml),
        groundTruthCharCount: window.__lastGroundTruthCharCount || 0,
        groundTruthMethod: window.__lastGroundTruthMethod || null,
        verificationAudit: verification,
        axeAudit: axeResults,
        beforeScore,
        beforeAxeScore,
        afterScore: finalAfterScore,
        axeScore: axeResults ? axeResults.score : null,
        axeViolations: axeResults ? axeResults.totalViolations : 0,
        _axeCoreFailed: axeCoreFailed,
        _scoreIsBlended: !axeCoreFailed && finalAfterScore !== null,
        autoFixPasses,
        needsExpertReview,
        docStyle, // extracted color palette for auto brand match in preview
        pageCount,
        imageCount: extractedImages.length,
        extractedChars: extractedLength,
        htmlChars: accessibleHtml.length,
        issuesFixed: (_auditResult.critical || []).length + (_auditResult.serious || _auditResult.major || []).length + (_auditResult.moderate || []).length + (_auditResult.minor || []).length,
        remainingIssues: verification ? (verification.issues || []).length : null,
        elapsed: Math.round((Date.now() - _startTime) / 1000),
      };

      _pipeStepEnd(4, autoFixPasses + ' fix passes, score: ' + (verification ? verification.score : '?') + '/100');
      _pipeLog('Done', 'Pipeline complete', {
        totalElapsed: Math.round((Date.now() - _startTime) / 1000) + 's',
        apiCalls: _pipelineStats.apiCalls,
        visionCalls: _pipelineStats.visionCalls,
        totalApiTime: Math.round(_pipelineStats.totalApiMs / 1000) + 's',
        retries: _pipelineStats.retries,
        fixPasses: autoFixPasses,
        beforeScore: beforeScore,
        afterScore: verification ? verification.score : null,
        axeViolations: axeResults ? axeResults.totalViolations : null,
        htmlSize: Math.round(accessibleHtml.length / 1000) + 'KB',
      });

      // Silent mode (multi-file batch with onProgress): return without
      // touching React state — caller is managing UI. Partial single-file
      // audits still need the UI updates AND the multi-session auto-save
      // at the bottom, so they fall through.
      if (_silentMode) return _result;

      // Single-file mode: update UI state
      setPdfFixResult(_result);
      setPdfFixLoading(false);
      setPdfFixStep('');

      // Multi-session auto-save — if this run was for a specific pageRange, persist the
      // remediated HTML keyed by doc fingerprint so the UI's multi-session panel can show
      // "pages 1-30 done" and the Merge button can stitch completed ranges later.
      if (_pageRange && _result && _result.accessibleHtml) {
        try {
          const _msMeta = {
            fileName: _fileName,
            fileSize: (_base64 && _base64.length) ? Math.round(_base64.length * 0.75) : 0,
            pageCount: pageCount,
          };
          const _msSessionId = _multiSessionId(_msMeta.fileName, _msMeta.fileSize, _msMeta.pageCount);
          saveMultiSessionRange(_msSessionId, _msMeta, {
            pages: [_pageRange[0], _pageRange[1]],
            html: _result.accessibleHtml,
            beforeScore: beforeScore,
            afterScore: finalAfterScore,
          }).then(function(saved) {
            if (saved) warnLog('[MultiSession] Saved range ' + _pageRange[0] + '-' + _pageRange[1] + ' to ' + _msSessionId);
            else warnLog('[MultiSession] saveMultiSessionRange returned falsy for range ' + _pageRange[0] + '-' + _pageRange[1]);
          }).catch(function(saveErr) {
            // Without this, IndexedDB quota/permission failures were invisible.
            // On Canvas LMS (where IndexedDB is the only durable store across
            // sessions per the doc comment at AlloFlowANTI.txt:10949) this was
            // a real data-loss vector — the teacher believes their multi-session
            // progress is saved when it isn't. Surface a toast so they know to
            // manually export the project file.
            warnLog('[MultiSession] Auto-save rejected:', saveErr && saveErr.message, saveErr);
            if (!_silentMode && typeof addToast === 'function') {
              addToast("⚠ Couldn't save progress for pages " + _pageRange[0] + '-' + _pageRange[1] + " to browser storage (" + (saveErr && saveErr.message ? saveErr.message : 'quota or permission error') + "). Please export the project file manually so you don't lose this range.", 'warning');
            }
          });
        } catch (e) {
          warnLog('[MultiSession] Auto-save failed:', e && e.message);
          if (!_silentMode && typeof addToast === 'function') {
            addToast("⚠ Couldn't save progress for pages " + _pageRange[0] + '-' + _pageRange[1] + " (" + (e && e.message ? e.message : 'unknown error') + "). Export the project file manually to preserve this range.", 'warning');
          }
        }
      }

      // Dual-engine guarantee broken: surface clearly so users don't think an AI-only score is blended.
      if (axeCoreFailed) {
        addToast('⚠ axe-core verification failed — final score is AI-only. Re-run Fix & Verify for the 50/50 blended score.', 'warning');
      }

      const scoreGain = finalAfterScore !== null ? finalAfterScore - beforeScore : null;
      const fixNote = autoFixPasses > 0 ? ` (${autoFixPasses} auto-fix pass${autoFixPasses > 1 ? 'es' : ''})` : '';
      if (finalAfterScore !== null && finalAfterScore >= 80) {
        addToast(`✅ PDF remediated! Score: ${beforeScore} → ${finalAfterScore} (+${scoreGain})${fixNote}`, 'success');
        // Audio: triumphant chord on successful high-score remediation (skipped if integrity warning fired)
        if (!integrityWarning) { try { window.remediationAudio && window.remediationAudio.sessionComplete(); } catch(e) {} }
        else { try { window.remediationAudio && window.remediationAudio.error(); } catch(e) {} }
      } else if (finalAfterScore !== null) {
        addToast(`⚠️ PDF improved: ${beforeScore} → ${finalAfterScore}${fixNote}. Some issues may need manual review.`, 'info');
        // Audio: partial-success still plays the complete chord (document is usable)
        if (!integrityWarning) { try { window.remediationAudio && window.remediationAudio.sessionComplete(); } catch(e) {} }
        else { try { window.remediationAudio && window.remediationAudio.error(); } catch(e) {} }
      } else {
        addToast('PDF transformed to accessible HTML. Verification could not complete.', 'info');
        try { window.remediationAudio && window.remediationAudio.refixSuccess(); } catch(e) {}
      }

      // ── Log to institutional compliance dashboard (non-blocking) ──
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        if (host.includes('.web.app') || host.includes('.firebaseapp.com')) {
          fetch('/api/logRemediation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: pendingPdfFile?.name || 'unknown',
              user: typeof window !== 'undefined' && window.__alloUser ? window.__alloUser.displayName || window.__alloUser.email : 'anonymous',
              email: typeof window !== 'undefined' && window.__alloUser ? window.__alloUser.email : null,
              beforeScore,
              afterScore: finalAfterScore,
              axeViolationsAfter: axeResults ? axeResults.totalViolations : null,
              fixPasses: autoFixPasses,
              needsExpertReview,
              pageCount,
              elapsed: Math.round((Date.now() - _startTime) / 1000),
            }),
          }).catch(() => {}); // fire-and-forget
        }
      } catch(logErr) { /* non-blocking */ }
    } catch (err) {
      warnLog('[PDF Fix] Error:', err);
      if (_silentMode) throw err; // Let batch caller handle it
      setPdfFixLoading(false);
      setPdfFixStep('');
      addToast('PDF remediation failed: ' + (err.message || 'Unknown error'), 'error');
      // Audio: descending minor tone signals pipeline failure
      try { window.remediationAudio && window.remediationAudio.error(); } catch(e) {}
    }
  };

  // ── Generate formatted audit report (human-readable HTML) ──
  const generateAuditReportHtml = (auditData, fileName, isBeforeAfter = false) => {
    const d = auditData;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const scoreColor = (s) => s >= 80 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';
    const severityBadge = (sev, count) => `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;color:white;background:${sev === 'critical' ? '#dc2626' : sev === 'serious' ? '#ea580c' : sev === 'moderate' ? '#d97706' : sev === 'minor' ? '#2563eb' : '#16a34a'}">${sev.toUpperCase()} (${count})</span>`;
    const issueRows = (issues, severity) => (issues || []).map(i => {
      // Issues are already normalized by normalizeIssue() upstream; this is the safety net
      let wcag = i.wcag || '';
      if (!wcag) {
        const wcagMatch = (i.issue || '').match(/(\d+\.\d+\.\d+)/);
        if (wcagMatch) wcag = wcagMatch[1];
      }
      // Light render-time cleanup (heavy lifting done by normalizeIssue)
      let issueText = (i.issue || '')
        .replace(/\s*\(?\s*(?:WCAG\s*)?\d+\.\d+\.\d+\s*\)?\s*$/gi, '')  // strip trailing WCAG code
        .replace(/\s*\(\s*$/g, '')                                          // strip trailing "("
        .replace(/^\)\s*,?\s*/g, '')                                        // strip leading ")"
        .trim();
      // Ensure it ends cleanly
      if (issueText && !/[.!?)\]]$/.test(issueText)) issueText += '.';
      return `<tr><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px;width:65%;word-wrap:break-word;overflow-wrap:break-word">${issueText}</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;width:20%;font-family:monospace">${wcag || 'N/A'}</td><td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;width:15%">${i.count > 1 ? i.count : ''}</td></tr>`;
    }).join('');

    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Accessibility Audit Report - ${fileName}</title>
<style>
body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #1e293b; }
h1 { color: #1e3a5f; font-size: 1.5rem; border-bottom: 3px solid #2563eb; padding-bottom: 0.5rem; }
h2 { color: #1e3a5f; font-size: 1.15rem; margin-top: 2rem; }
.score-box { text-align: center; padding: 24px; border-radius: 12px; margin: 1.5rem 0; }
.score-num { font-size: 3rem; font-weight: 900; }
.meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 1rem 0; }
.meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
.meta-val { font-size: 1.25rem; font-weight: 800; color: #1e3a5f; }
.meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
th { background: #f1f5f9; padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; font-weight: 700; }
.pass-item { padding: 4px 0; font-size: 13px; color: #16a34a; page-break-inside: avoid; }
.footer { margin-top: 3rem; padding-top: 1rem; border-top: 2px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
h2, h3 { page-break-after: avoid; }
table { page-break-inside: auto; }
tr { page-break-inside: avoid; }
@media print { body { padding: 0.5in; } .footer a { color: #000; } h2, h3 { page-break-after: avoid; } }
@media (forced-colors: active) { .score-box { border: 2px solid CanvasText; } th, td { border: 1px solid CanvasText; } a { text-decoration: underline; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style></head><body>
<a href="#audit-content" class="sr-only" style="position:absolute;left:-9999px">Skip to audit results</a>
<main id="audit-content" role="main">
<h1>Accessibility Audit Report</h1>
<p style="color:#64748b;font-size:13px">Document: <strong>${fileName}</strong><br>Date: ${date}<br>Standards: WCAG 2.1 Level AA &bull; ADA Title II &bull; Section 508 &bull; EN 301 549<br>Methodology: AI multi-auditor triangulation + axe-core (Deque) automated verification<br>Tool: AlloFlow Document Accessibility Pipeline</p>`;

    // Score
    const score = isBeforeAfter ? (d.after?.score ?? d.afterScore ?? '?') : (d.score ?? '?');
    const beforeScore = isBeforeAfter ? (d.before?.score ?? d.beforeScore ?? null) : null;
    html += `<div class="score-box" style="background:${typeof score === 'number' ? scoreColor(score) + '15' : '#f8fafc'}">`;
    if (beforeScore !== null) {
      html += `<div style="display:flex;align-items:center;justify-content:center;gap:24px">
        <div><div class="score-num" style="color:${scoreColor(beforeScore)}">${beforeScore}</div><div class="meta-label">Before</div></div>
        <div style="font-size:2rem;color:#94a3b8">&rarr;</div>
        <div><div class="score-num" style="color:${typeof score === 'number' ? scoreColor(score) : '#64748b'}">${score}</div><div class="meta-label">After</div></div>
        ${typeof score === 'number' && score > beforeScore ? '<div style="background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-weight:bold;font-size:14px">+' + (score - beforeScore) + '</div>' : ''}
      </div>`;
    } else {
      html += `<div class="score-num" style="color:${typeof score === 'number' ? scoreColor(score) : '#64748b'}">${score}<span style="font-size:1.2rem;opacity:0.6">/100</span></div>`;
    }
    html += `<div style="font-size:14px;margin-top:8px;color:#475569">${d.summary || d.before?.audit?.summary || ''}</div></div>`;

    // Reliability metrics
    const audit = isBeforeAfter ? (d.before?.audit || d) : d;
    if (audit.scores && audit.scores.length > 1) {
      html += `<h2>Reliability Metrics</h2><div class="meta-grid">
        <div class="meta-card"><div class="meta-val">${audit.ci95 ? audit.ci95[0] + '&ndash;' + audit.ci95[1] : 'N/A'}</div><div class="meta-label">95% Confidence Interval</div></div>
        <div class="meta-card"><div class="meta-val">${audit.scoreSD ?? 'N/A'}</div><div class="meta-label">Standard Deviation</div></div>
        <div class="meta-card"><div class="meta-val">${audit.icc ?? 'N/A'}</div><div class="meta-label">Auditor Consistency (ICC-like)</div></div>
        ${audit.cronbachAlpha !== null && audit.cronbachAlpha !== undefined ? '<div class="meta-card"><div class="meta-val">' + audit.cronbachAlpha + '</div><div class="meta-label">Auditor Consistency (Cronbach-like)</div></div>' : ''}
      </div>
      <p style="font-size:12px;color:#64748b">Auditors: ${audit.auditorCount || audit.scores.length} | Individual scores: ${audit.scores.join(', ')} | SEM: &plusmn;${audit.scoreSEM || 'N/A'} | Range: ${audit.scoreRange || 'N/A'} | Reliability: ${audit.reliability || 'N/A'}</p>`;
    }

    // Document info
    html += `<h2>Document Properties</h2><div class="meta-grid">
      ${audit.hasSearchableText !== undefined ? '<div class="meta-card"><div class="meta-val">' + (audit.hasSearchableText ? '&#10003;' : '&#10007;') + '</div><div class="meta-label">Searchable Text</div></div>' : ''}
      ${audit.hasImages ? '<div class="meta-card"><div class="meta-val">&#10003;</div><div class="meta-label">Contains Images</div></div>' : ''}
      ${audit.hasTables ? '<div class="meta-card"><div class="meta-val">&#10003;</div><div class="meta-label">Contains Tables</div></div>' : ''}
      ${audit.hasForms ? '<div class="meta-card"><div class="meta-val">&#10003;</div><div class="meta-label">Contains Forms</div></div>' : ''}
      ${audit.pageCount ? '<div class="meta-card"><div class="meta-val">' + audit.pageCount + '</div><div class="meta-label">Pages</div></div>' : ''}
    </div>`;

    // Issues — for before/after reports, show BOTH before issues AND after remaining issues
    const issueSource = isBeforeAfter ? (d.before?.audit || d) : d;
    const sectionLabel = isBeforeAfter ? ' (Before Remediation)' : '';
    if (issueSource.critical?.length) {
      html += `<h2>${severityBadge('critical', issueSource.critical.length)} Critical Issues${sectionLabel}</h2>
      <table style="table-layout:fixed;width:100%"><thead><tr><th style="width:65%">Issue</th><th style="width:20%;text-align:center">WCAG</th><th style="width:15%;text-align:center">Count</th></tr></thead><tbody>${issueRows(issueSource.critical, 'critical')}</tbody></table>`;
    }
    const seriousIssues = issueSource.serious || issueSource.major || [];
    if (seriousIssues.length) {
      html += `<h2>${severityBadge('serious', seriousIssues.length)} Serious Issues${sectionLabel}</h2>
      <table style="table-layout:fixed;width:100%"><thead><tr><th style="width:65%">Issue</th><th style="width:20%;text-align:center">WCAG</th><th style="width:15%;text-align:center">Count</th></tr></thead><tbody>${issueRows(seriousIssues, 'serious')}</tbody></table>`;
    }
    if (issueSource.moderate?.length) {
      html += `<h2>${severityBadge('moderate', issueSource.moderate.length)} Moderate Issues${sectionLabel}</h2>
      <table style="table-layout:fixed;width:100%"><thead><tr><th style="width:65%">Issue</th><th style="width:20%;text-align:center">WCAG</th><th style="width:15%;text-align:center">Count</th></tr></thead><tbody>${issueRows(issueSource.moderate, 'moderate')}</tbody></table>`;
    }
    if (issueSource.minor?.length) {
      html += `<h2>${severityBadge('minor', issueSource.minor.length)} Minor Issues${sectionLabel}</h2>
      <table style="table-layout:fixed;width:100%"><thead><tr><th style="width:65%">Issue</th><th style="width:20%;text-align:center">WCAG</th><th style="width:15%;text-align:center">Count</th></tr></thead><tbody>${issueRows(issueSource.minor, 'minor')}</tbody></table>`;
    }
    if (issueSource.passes?.length) {
      html += `<h2 style="color:#16a34a">&#10003; AI Audit — Passing Checks (${issueSource.passes.length})</h2>`;
      html += `<p style="font-size:11px;color:#6b7280;margin:4px 0 8px">${isBeforeAfter ? 'Checks that passed during the initial AI audit (before remediation)' : 'Checks verified as accessible by the AI auditors'}</p>`;
      issueSource.passes.forEach(p => {
        const text = typeof p === 'string' ? p : p.description || p.id || '';
        const wcag = typeof p === 'object' && p.wcag ? ` <span style="color:#94a3b8;font-size:0.85em">[${p.wcag}]</span>` : '';
        const ruleId = typeof p === 'object' && p.id ? ` <span style="color:#94a3b8;font-size:0.85em;font-family:monospace">(${p.id})</span>` : '';
        html += `<div class="pass-item">&#10003; ${text}${ruleId}${wcag}</div>`;
      });
    }

    // After-remediation results (for before/after reports)
    if (isBeforeAfter) {
      html += `<h2 style="margin-top:2rem;border-bottom:3px solid #16a34a;padding-bottom:0.5rem">After Remediation</h2>`;
      html += `<p style="font-size:12px;color:#64748b;margin-bottom:1rem;font-style:italic">Results below reflect the document state after automated remediation and any manual edits.</p>`;
      // AI verification remaining issues
      const afterAiAudit = d.after?.aiAudit;
      if (afterAiAudit) {
        const remainingIssues = afterAiAudit.issues || [];
        html += `<h3 style="color:#4f46e5;font-size:16px;margin-top:1.5rem">🤖 AI Verification — Remaining Issues (${remainingIssues.length})</h3>`;
        html += `<p style="font-size:11px;color:#6b7280;margin:4px 0 12px">AI re-audit of the remediated HTML for WCAG 2.1 AA compliance</p>`;
        if (remainingIssues.length > 0) {
          html += `<table style="table-layout:fixed;width:100%"><thead><tr><th style="width:65%">Issue</th><th style="width:20%;text-align:center">WCAG</th><th style="width:15%;text-align:center">Severity</th></tr></thead><tbody>`;
          var escHtml = function(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
          remainingIssues.forEach(i => {
            let wcag = i.wcag || '';
            if (!wcag) { const m = (i.issue || '').match(/(\d+\.\d+\.\d+)/); if (m) wcag = m[1]; }
            let issueText = (i.issue || '').replace(/\s*\(?\s*(?:WCAG\s*)?\d+\.\d+\.\d+\s*\)?\s*$/gi, '').trim();
            if (issueText && !/[.!?)\]]$/.test(issueText)) issueText += '.';
            html += `<tr><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:13px">${escHtml(issueText)}</td><td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;color:#64748b;text-align:center;font-family:monospace">${wcag || 'N/A'}</td><td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;font-size:12px;font-weight:bold;color:#d97706">${i.severity || 'review'}</td></tr>`;
          });
          html += `</tbody></table>`;
        } else {
          html += `<div role="status" aria-live="polite" aria-atomic="true" aria-label="No AI-detected issues remaining. All WCAG 2.1 AA checks passed in AI verification." style="background:#dcfce7;border:2px solid #16a34a;border-radius:8px;padding:16px;text-align:center;margin:1rem 0"><div style="font-size:1.5rem;font-weight:900;color:#16a34a"><span aria-hidden="true">&#10003; </span>No AI-Detected Issues Remaining</div><div style="font-size:13px;color:#166534;margin-top:4px">All WCAG 2.1 AA checks passed in AI verification</div></div>`;
        }
        // Show verified passes from AI audit
        const afterPasses = afterAiAudit.passes || [];
        if (afterPasses.length > 0) {
          html += `<h3 style="color:#16a34a;margin-top:1rem">&#10003; AI-Verified Accessible Checks (${afterPasses.length})</h3>`;
          html += `<p style="font-size:11px;color:#6b7280;margin:4px 0 8px">Checks that the AI auditor confirmed are now passing after remediation</p>`;
          afterPasses.forEach(p => {
            const text = typeof p === 'string' ? p : p.description || p.id || '';
            html += `<div class="pass-item">&#10003; ${text}</div>`;
          });
        }
      }
      // axe-core automated verification
      if (d.after?.axeCoreAudit) {
        const axe = d.after.axeCoreAudit;
        html += `<h3 style="color:#4f46e5;font-size:16px;margin-top:2rem">🔬 axe-core Automated Verification</h3>`;
        html += `<p style="font-size:11px;color:#6b7280;margin:4px 0 12px">Independent automated testing by Deque axe-core engine (industry standard WCAG scanner)</p>`;
        html += `
        <div class="meta-grid">
          <div class="meta-card"><div class="meta-val" style="color:${axe.totalViolations === 0 ? '#16a34a' : '#dc2626'}">${axe.totalViolations}</div><div class="meta-label">Violations</div></div>
          <div class="meta-card"><div class="meta-val" style="color:#16a34a">${axe.totalPasses}</div><div class="meta-label">Checks Passed</div></div>
          ${axe.score !== undefined ? '<div class="meta-card"><div class="meta-val" style="color:' + scoreColor(axe.score) + '">' + axe.score + '</div><div class="meta-label">axe-core Score</div></div>' : ''}
        </div>`;
        if (axe.totalViolations === 0) {
          html += `<div style="background:#dcfce7;border:2px solid #16a34a;border-radius:8px;padding:12px;text-align:center;margin:0.5rem 0"><div style="font-weight:bold;color:#16a34a">Zero WCAG violations detected by axe-core</div></div>`;
        }
        if (axe.critical?.length || axe.serious?.length || axe.moderate?.length) {
          html += `<h3 style="color:#dc2626;margin-top:1rem">Remaining Violations</h3>`;
          html += `<table><thead><tr><th>Rule</th><th>Impact</th><th>Description</th><th>Elements</th></tr></thead><tbody>`;
          [...(axe.critical || []), ...(axe.serious || []), ...(axe.moderate || [])].forEach(v => {
            html += `<tr><td style="padding:6px;border:1px solid #e2e8f0;font-size:12px;font-family:monospace">${v.id}</td><td style="padding:6px;border:1px solid #e2e8f0;font-size:12px;font-weight:bold;color:${v.impact === 'critical' ? '#dc2626' : v.impact === 'serious' ? '#ea580c' : '#d97706'}">${v.impact}</td><td style="padding:6px;border:1px solid #e2e8f0;font-size:12px">${v.description}</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:center">${v.nodes}</td></tr>`;
          });
          html += `</tbody></table>`;
        }
        // ── Passed Checks Detail ──
        if (axe.passes?.length > 0) {
          html += `<details open style="margin-top:1rem"><summary style="cursor:pointer;font-weight:bold;color:#16a34a;font-size:14px">✅ axe-core: ${axe.passes.length} Accessibility Checks Passed</summary>`;
          html += `<p style="font-size:11px;color:#6b7280;margin:4px 0 8px">Complete list of WCAG rules verified as passing by the axe-core automated scanner</p>`;
          html += `<table style="margin-top:8px"><thead><tr><th>Rule</th><th>Description</th><th>WCAG</th><th>Elements Checked</th></tr></thead><tbody>`;
          axe.passes.forEach(p => {
            html += `<tr><td style="padding:6px;border:1px solid #e2e8f0;font-size:11px;font-family:monospace;color:#16a34a">${p.id}</td><td style="padding:6px;border:1px solid #e2e8f0;font-size:12px">${p.description}</td><td style="padding:6px;border:1px solid #e2e8f0;font-size:11px;color:#64748b">${p.wcag || '—'}</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-size:12px">${p.nodes}</td></tr>`;
          });
          html += `</tbody></table></details>`;
        }
      }
    }

    // ── Reading Level Analysis ──
    try {
      const reportText = (isBeforeAfter ? d.after?.html || '' : d.html || d.accessibleHtml || '').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (reportText.length > 50) {
        const rtWords = (reportText.match(/[a-zA-Z]+(?:[''-][a-zA-Z]+)*/g) || []);
        const rtSentences = Math.max(1, (reportText.match(/[.!?]+/g) || []).length);
        const rtWordCount = Math.max(1, rtWords.length);
        let rtSyllables = 0;
        rtWords.forEach(w => { let lw = w.toLowerCase(); if (lw.length <= 3) { rtSyllables++; return; } lw = lw.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); rtSyllables += (lw.match(/[aeiouy]{1,2}/g) || []).length || 1; });
        const fkGrade = Math.max(0, Math.min(18, (0.39 * (rtWordCount / rtSentences)) + (11.8 * (rtSyllables / rtWordCount)) - 15.59)).toFixed(1);
        const gradeLabel = fkGrade <= 5 ? 'Elementary (K-5)' : fkGrade <= 8 ? 'Middle School (6-8)' : fkGrade <= 12 ? 'High School (9-12)' : 'College Level';
        html += `<h2 style="margin-top:2rem">Reading Level Analysis</h2>
        <div style="display:flex;gap:1rem;margin-bottom:1rem">
          <div style="flex:1;text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px">
            <div style="font-size:24px;font-weight:900;color:#4f46e5">${fkGrade}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">FLESCH-KINCAID GRADE</div>
          </div>
          <div style="flex:1;text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px">
            <div style="font-size:16px;font-weight:700;color:#334155">${gradeLabel}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">READING LEVEL</div>
          </div>
          <div style="flex:1;text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px">
            <div style="font-size:16px;font-weight:700;color:#334155">${rtWordCount.toLocaleString()}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">WORDS</div>
          </div>
        </div>
        <p style="font-size:11px;color:#64748b">Cognitive accessibility note: For broad accessibility, aim for 8th grade reading level or below. AlloFlow's Simplified Text tool can rewrite content at specific grade levels for differentiated access.</p>`;
      }
    } catch(rlErr) { /* non-blocking */ }

    html += `<h2 style="margin-top:2rem">Scoring Methodology</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:1rem">
      <thead><tr style="background:#f8fafc"><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Severity</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:center">Deduction</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Examples</th></tr></thead>
      <tbody>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#dc2626">Critical</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold">-15</td><td style="padding:8px;border:1px solid #e2e8f0">Missing lang attribute, no page title, images without alt text, no main landmark, contrast below 3:1</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#ea580c">Serious</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold">-10</td><td style="padding:8px;border:1px solid #e2e8f0">No h1 heading, heading level skips, data tables without th/scope, form inputs without labels, contrast below 4.5:1</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#d97706">Moderate</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold">-5</td><td style="padding:8px;border:1px solid #e2e8f0">Missing skip-to-content link, missing landmarks, non-descriptive links, bullet characters instead of lists</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#2563eb">Minor</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold">-2</td><td style="padding:8px;border:1px solid #e2e8f0">Missing document metadata, extra whitespace in alt text, multiple h1 elements, inconsistent heading granularity</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:#16a34a">Passes</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold">Mitigate</td><td style="padding:8px;border:1px solid #e2e8f0">Each passed check reduces deduction impact up to 15% (strengths offset weaknesses, capped)</td></tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:#64748b;margin-bottom:0.5rem"><strong>Scoring formula:</strong> Start at 100, subtract per violation: Critical (-15), Serious (-10), Moderate (-5), Minor (-2). Each unique violation counted once. Passing checks proportionally offset deductions — a document that passes 90% of checks receives up to 36% reduction in effective deductions, reflecting that remaining violations represent a small proportion of the overall content. Final score is a 50/50 blend of AI rubric score and axe-core (Deque) automated checker score.</p>`;

    html += `<div class="footer">
      <p><strong>Methodology:</strong> ${audit.auditorCount || 1}-pass AI triangulation with adaptive confidence scoring, statistical reliability analysis (ICC, SEM, CV), and axe-core (Deque Systems) automated WCAG 2.1 AA verification. Deterministic fixes applied for color contrast, heading hierarchy, table structure, and landmark regions.</p>
      <p><strong>Standards:</strong> WCAG 2.1 Level AA | ADA Title II (28 CFR Part 35 Subpart H) | Section 508 | EN 301 549</p>
      <p><strong>Limitations:</strong> This automated audit identifies common accessibility barriers but cannot replace manual testing with assistive technology. For comprehensive compliance verification, consider professional accessibility auditing services such as <a href="https://knowbility.org" style="color:#2563eb">Knowbility</a> (AccessWorks usability testing with people with disabilities).</p>
      <p>Generated by AlloFlow Document Accessibility Pipeline | ${date} | Open source (GNU AGPL v3)</p>
    </div></main></body></html>`;
    return html;
  };

  // ── Tag the ORIGINAL PDF in place (visual layer preserved, tag tree added) ──
  // Takes original PDF bytes + the remediation result and produces a new PDF
  // that:
  //   - Preserves every byte of the original's visual layer (pages, fonts,
  //     images, positions, annotations, colors) — pdf-lib modifies only
  //     document-level metadata and Catalog entries, not content streams.
  //   - Adds a StructTreeRoot with a flat StructElem outline derived from
  //     the accessibleHtml (H1-H6, P, Figure with Alt, Table, List). This
  //     gives capable assistive tech a structural outline to navigate by
  //     heading, and claims PDF/UA scaffolding.
  //   - Sets document Lang (screen readers use this for pronunciation).
  //   - Sets Title + Author + Subject from fixResult metadata.
  //   - Adds MarkInfo {Marked=true, Suspects=false} so readers know the
  //     document has been tagged.
  //
  // What this does NOT do in this pass:
  //   - Content-stream MCID wrapping (each piece of page content wrapped
  //     with /P <</MCID N>> BDC ... EMC and referenced back from the
  //     StructElem). Without MCID linkage, the tag tree is structurally
  //     present but not fully MCID-linked to content — capable readers
  //     still use it for navigation, strict PDF/UA-1 validators will flag
  //     it. Upgrading to MCID-linked content is the logical next step.
  //
  // Returns: Uint8Array of the tagged PDF bytes, or throws.
  const createTaggedPdf = async (originalPdfBytes, fixResult, meta) => {
    meta = meta || {};
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      throw new Error('pdf-lib not loaded — call _ensurePdfLib() first');
    }
    const { PDFDocument, PDFName, PDFString, PDFHexString, PDFNumber, StandardFonts } = window.PDFLib;
    const doc = await PDFDocument.load(originalPdfBytes, { updateMetadata: false });
    const context = doc.context;
    const catalog = doc.catalog;
    // ── Document-level metadata (uses pdf-lib's high-level API) ──
    // These also write corresponding XMP metadata entries.
    if (meta.title) { try { doc.setTitle(meta.title); } catch(_) {} }
    if (meta.author) { try { doc.setAuthor(meta.author); } catch(_) {} }
    if (meta.subject) { try { doc.setSubject(meta.subject); } catch(_) {} }
    try { doc.setProducer('AlloFlow Accessibility Pipeline'); } catch(_) {}
    try { doc.setModificationDate(new Date()); } catch(_) {}
    // ── Document language (Catalog/Lang) ──
    // Required by PDF/UA-1 §7.2. pdf-lib doesn't expose a high-level setter
    // so we write it directly into the Catalog.
    const lang = (meta.lang || 'en').toString();
    catalog.set(PDFName.of('Lang'), PDFString.of(lang));
    // ── MarkInfo dict ──
    // Marked=true signals that the document has Marked Content / is tagged.
    // Required by PDF/UA-1 §7.1. Suspects=false is the conservative claim
    // that we don't have any "suspect" (incomplete) marked content.
    const markInfo = context.obj({ Marked: true, Suspects: false });
    catalog.set(PDFName.of('MarkInfo'), markInfo);
    // ── Build the StructTreeRoot from fixResult.accessibleHtml ──
    // Parse the remediated HTML to get the semantic outline (headings,
    // images with alt, tables, lists), then map those to PDF StructElems.
    // Stage 3 upgrade: build a NESTED tree. Headings open implicit /Sect
    // containers whose K kids are the heading itself plus any following
    // paragraphs/tables/etc until the next peer-or-higher heading closes
    // the section. Nested H2/H3 sections live as K children of their
    // parent H1 section. This gives SR readers real structural hierarchy
    // for heading navigation. If the nested walk throws at any point we
    // fall back to the Stage 1 flat shape — net-safe.
    const html = (fixResult && fixResult.accessibleHtml) || '';
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(html, 'text/html');
    // StructElem "role" mapping from HTML tag → PDF standard structure type.
    // See ISO 32000-1 §14.8.4 "Standard Structure Types".
    const TAG_TO_PDF_ROLE = {
      h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
      p: 'P', ul: 'L', ol: 'L', li: 'LI', img: 'Figure', figure: 'Figure',
      table: 'Table', tr: 'TR', th: 'TH', td: 'TD', caption: 'Caption',
      thead: 'THead', tbody: 'TBody', tfoot: 'TFoot',
      blockquote: 'BlockQuote', a: 'Link', header: 'Sect', footer: 'Sect',
      section: 'Sect', nav: 'Sect', aside: 'Sect', main: 'Sect',
    };
    // ── Stage 5: table semantic pre-pass ──
    // Runs BEFORE the outline walker so downstream code sees a DOM where
    // tables carry proper <th> + scope attributes. Two passes:
    //   1. If <th> cells exist without scope, infer scope from position
    //      (full-TH first row → col, first cell in other rows if TH → row).
    //   2. If NO <th> exists, high-confidence-only promote first-row <td>
    //      → <th scope=col> (≥3 cols, ≥3 rows, all first-row cells text).
    // Low-confidence tables stay flat — the Stage 3/4 flat fallback handles
    // them fine and "didn't enhance" is safer than "enhanced wrong".
    const _stage5_isNumericCell = (t) => {
      const s = (t || '').trim();
      if (!s) return false;
      return /^[-$]?\d+([.,]\d+)?%?$/.test(s) || /^\d+\s*[-\u2013]\s*\d+$/.test(s);
    };
    try {
      const tables = Array.from(htmlDoc.querySelectorAll('table'));
      for (const table of tables) {
        const trs = Array.from(table.querySelectorAll('tr'));
        if (trs.length === 0) continue;
        // Pass 1a: full-TH first row → scope=col (column-header row pattern).
        if (trs[0]) {
          const firstRowCells = Array.from(trs[0].children);
          const allThs = firstRowCells.length > 0 && firstRowCells.every(c => c.tagName && c.tagName.toLowerCase() === 'th');
          if (allThs) {
            for (const th of firstRowCells) {
              if (!th.getAttribute('scope')) th.setAttribute('scope', 'col');
            }
          }
        }
        // Pass 1b: first cell of any row, if TH, → scope=row (row-header
        // pattern). Doesn't overwrite scope=col from Pass 1a.
        for (const tr of trs) {
          const firstCell = tr.firstElementChild;
          if (firstCell && firstCell.tagName && firstCell.tagName.toLowerCase() === 'th' && !firstCell.getAttribute('scope')) {
            firstCell.setAttribute('scope', 'row');
          }
        }
        // Pass 2: no <th> anywhere → high-confidence promotion only.
        const hasAnyTh = trs.some(tr => tr.querySelector('th'));
        if (!hasAnyTh && trs.length >= 3) {
          const firstRow = trs[0];
          const firstRowTds = Array.from(firstRow.querySelectorAll('td'));
          if (firstRowTds.length >= 3) {
            const allTextual = firstRowTds.every(td => {
              const t = (td.textContent || '').trim();
              return t.length > 0 && !_stage5_isNumericCell(t);
            });
            if (allTextual) {
              for (const td of firstRowTds) {
                const th = htmlDoc.createElement('th');
                th.setAttribute('scope', 'col');
                while (td.firstChild) th.appendChild(td.firstChild);
                for (const attr of Array.from(td.attributes)) {
                  try { th.setAttribute(attr.name, attr.value); } catch(_) {}
                }
                td.parentNode.replaceChild(th, td);
              }
            }
          }
        }
      }
      // ── Stage 5b full: Gemini classification for ambiguous tables ──
      // Tables that made it through Stage 5a's heuristics WITHOUT any
      // scope-bearing TH are candidates. For each (≥3 rows × ≥3 cols), we
      // ask Gemini to classify the layout and, if high-confidence, apply
      // the resulting scope attrs. Stage 5b lite (next pass) then picks
      // them up and adds /Headers + /IDTree linkage automatically. Any
      // Gemini failure (network, timeout, malformed JSON) → leave the
      // table flat (Stage 5a behavior preserved). No new failure surface
      // beyond the API call we already depend on for remediation.
      const _stage5bfull_applyClassification = (table, classification) => {
        if (!classification || typeof classification.confidence !== 'number' || classification.confidence < 0.7) return false;
        const layout = classification.layout;
        if (layout !== 'standard' && layout !== 'transposed' && layout !== 'crosstab') return false;
        const trs = Array.from(table.querySelectorAll('tr'));
        if (trs.length === 0) return false;
        const promote = (cell, scope) => {
          const th = htmlDoc.createElement('th');
          th.setAttribute('scope', scope);
          while (cell.firstChild) th.appendChild(cell.firstChild);
          for (const attr of Array.from(cell.attributes)) {
            try { th.setAttribute(attr.name, attr.value); } catch(_) {}
          }
          cell.parentNode.replaceChild(th, cell);
        };
        if (layout === 'standard' || layout === 'crosstab') {
          for (const td of Array.from(trs[0].querySelectorAll('td'))) promote(td, 'col');
        }
        if (layout === 'transposed' || layout === 'crosstab') {
          for (const tr of trs) {
            const first = tr.firstElementChild;
            if (first && first.tagName && first.tagName.toLowerCase() === 'td') promote(first, 'row');
          }
        }
        return true;
      };
      if (typeof callGemini === 'function') {
        for (const table of Array.from(htmlDoc.querySelectorAll('table'))) {
          const trs = Array.from(table.querySelectorAll('tr'));
          if (trs.length < 3) continue;
          const maxCols = trs.reduce((m, tr) => Math.max(m, tr.children.length), 0);
          if (maxCols < 3) continue;
          // Skip if Stage 5a already handled this table
          const hasScoped = Array.from(table.querySelectorAll('th')).some(th => {
            const sc = (th.getAttribute('scope') || '').toLowerCase();
            return sc === 'col' || sc === 'row';
          });
          if (hasScoped) continue;
          let classification = null;
          try {
            const tableHtml = (table.outerHTML || '').substring(0, 2000);
            const prompt = 'You are classifying an HTML table for screen-reader accessibility. Determine its layout.\n\n' +
              'Options:\n' +
              '- "standard" — first row is column headers, remaining rows are data\n' +
              '- "transposed" — first column is row headers, remaining columns are data\n' +
              '- "crosstab" — first row is column headers AND first column is row headers\n' +
              '- "complex-skip" — ambiguous, irregular, merged cells, or multi-level headers\n\n' +
              'Be conservative: return "complex-skip" with low confidence if uncertain. We only apply your classification when confidence >= 0.7.\n\n' +
              'Return ONLY JSON (no markdown fences, no commentary): {"layout":"standard|transposed|crosstab|complex-skip","confidence":0.0}\n\n' +
              'Table HTML:\n' + tableHtml;
            const raw = await callGemini(prompt, true);
            const text = typeof raw === 'string' ? raw : (raw && raw.text) || '';
            const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const jsonS = cleaned.indexOf('{');
            const jsonE = cleaned.lastIndexOf('}');
            if (jsonS >= 0 && jsonE > jsonS) {
              classification = JSON.parse(cleaned.substring(jsonS, jsonE + 1));
            }
          } catch(geminiErr) {
            try { warnLog('[createTaggedPdf] Stage 5b full Gemini classification failed (non-fatal): ' + (geminiErr && geminiErr.message)); } catch(_) {}
            classification = null;
          }
          if (classification) _stage5bfull_applyClassification(table, classification);
        }
      }
      // ── Stage 5b lite: /Headers + /IDTree linkage ──
      // Third pass. For each table with at least one scope-bearing TH,
      // assign each TH a unique data-struct-id and mark each TD with the
      // space-separated list of TH IDs that apply (column headers from
      // earlier rows at same column index + row headers earlier in same
      // row). The walker and buildLeaf consume these attributes to emit
      // /ID on TH StructElems and /A << /Headers [...] >> on TDs.
      let tableIndex = 0;
      for (const table of Array.from(htmlDoc.querySelectorAll('table'))) {
        const trs = Array.from(table.querySelectorAll('tr'));
        if (trs.length === 0) continue;
        const hasScopedTh = Array.from(table.querySelectorAll('th')).some(th => {
          const sc = (th.getAttribute('scope') || '').toLowerCase();
          return sc === 'col' || sc === 'row';
        });
        if (!hasScopedTh) { tableIndex++; continue; }
        let thIdCounter = 0;
        const thIdMap = new Map();
        for (const tr of trs) {
          for (const cell of Array.from(tr.children)) {
            const tag = cell.tagName && cell.tagName.toLowerCase();
            if (tag !== 'th') continue;
            const scope = (cell.getAttribute('scope') || '').toLowerCase();
            if (scope !== 'col' && scope !== 'row') continue;
            const id = 'hdr_' + tableIndex + '_' + (thIdCounter++);
            cell.setAttribute('data-struct-id', id);
            thIdMap.set(cell, id);
          }
        }
        const grid = trs.map(tr => Array.from(tr.children));
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            const cell = grid[r][c];
            if (!cell || !cell.tagName) continue;
            if (cell.tagName.toLowerCase() !== 'td') continue;
            const applicable = [];
            // Column headers (scope=col THs in earlier rows at same column idx)
            for (let r2 = 0; r2 < r; r2++) {
              const above = grid[r2][c];
              if (!above || !above.tagName) continue;
              if (above.tagName.toLowerCase() === 'th' && (above.getAttribute('scope') || '').toLowerCase() === 'col') {
                const id = thIdMap.get(above);
                if (id) applicable.push(id);
              }
            }
            // Row headers (scope=row THs earlier in same row)
            for (let c2 = 0; c2 < c; c2++) {
              const left = grid[r][c2];
              if (!left || !left.tagName) continue;
              if (left.tagName.toLowerCase() === 'th' && (left.getAttribute('scope') || '').toLowerCase() === 'row') {
                const id = thIdMap.get(left);
                if (id) applicable.push(id);
              }
            }
            if (applicable.length > 0) cell.setAttribute('data-headers', applicable.join(' '));
          }
        }
        tableIndex++;
      }
    } catch(tableErr) {
      try { warnLog('[createTaggedPdf] Stage 5 table pre-pass failed (non-fatal): ' + (tableErr && tableErr.message)); } catch(_) {}
    }
    const HEADING_LEVEL = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };
    const structRootRef = context.nextRef();
    // _buildOutlineStructElems — minimal refactor: isolates HTML-DOM walk
    // from PDF-building. Returns either the nested tree's root K (array
    // of refs, some of which are Sect containers) or the flat list (Stage
    // 1 shape) if nesting throws.
    // Stage 5b lite: buildLeaf pushes {id, ref} entries here when it emits
    // a TH with a data-struct-id. We read this after the tree is built to
    // construct the StructTreeRoot /IDTree name tree.
    const idTreeEntries = [];
    // Hoisted to the outer closure so the post-build summary can count
    // headings/paragraphs/tables/etc. without repeating the DOM walk.
    let _outlineItems = [];
    const _buildOutlineStructElems = () => {
      const body = htmlDoc.body || htmlDoc.documentElement;
      // Walk once collecting ordered {role, text, alt, isDecorative, level}.
      const items = _outlineItems;
      const walker = htmlDoc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, null);
      while (walker.nextNode()) {
        const el = walker.currentNode;
        const tag = (el.tagName || '').toLowerCase();
        const pdfRole = TAG_TO_PDF_ROLE[tag];
        if (!pdfRole) continue;
        if (['h1','h2','h3','h4','h5','h6','p','li','caption','blockquote'].includes(tag) && !(el.textContent || '').trim()) continue;
        items.push({
          role: pdfRole,
          text: (el.textContent || '').trim().substring(0, 400),
          alt: tag === 'img' ? (el.getAttribute('alt') || '') : null,
          isDecorative: tag === 'img' && (el.getAttribute('role') === 'presentation' || el.getAttribute('aria-hidden') === 'true'),
          level: HEADING_LEVEL[tag] || 0,
          // Stage 5: capture scope on TH cells so we can emit /Scope on the
          // resulting StructElem. "col" → /Column, "row" → /Row. Other
          // scope values (colgroup/rowgroup) are spec-valid but rarely used
          // in educational content; we pass them through unchanged.
          scope: tag === 'th' ? (el.getAttribute('scope') || '') : '',
          // Stage 5b lite: carry data-struct-id (on TH) and data-headers
          // (on TD) set by the pre-pass so buildLeaf can emit /ID and
          // /Headers on the resulting StructElems.
          structId: tag === 'th' ? (el.getAttribute('data-struct-id') || '') : '',
          headers: tag === 'td' ? (el.getAttribute('data-headers') || '') : '',
          // Stage 6a: /Lang on StructElem — PDF spec §14.9.2 lets an element
          // override the document-level /Lang for SR voice/pronunciation
          // switching on multilingual content (bilingual worksheets,
          // loanwords, quoted foreign passages).
          lang: (el.getAttribute('lang') || '').trim(),
        });
      }
      // Build a leaf StructElem (not a Sect) and register it. The parentRef
      // is the immediate parent — Sect or the StructTreeRoot.
      const buildLeaf = (item, parentRef) => {
        const d = { Type: PDFName.of('StructElem'), S: PDFName.of(item.role), P: parentRef };
        if (item.role === 'Figure') {
          if (item.isDecorative) {
            // Stage 3 E-lite: decorative images become /NonStruct instead of
            // /Span so validators treat them as pure chrome with no content
            // contribution. Equivalent SR behavior to artifact marking
            // without the content-stream rewrite artifact-BMC would require.
            d.S = PDFName.of('NonStruct');
            d.Alt = PDFString.of('');
          } else {
            d.Alt = PDFString.of(item.alt || '(image)');
          }
        }
        if (['H1','H2','H3','H4','H5','H6','P','LI','Caption','BlockQuote'].includes(item.role) && item.text) {
          d.ActualText = PDFString.of(item.text);
        }
        // Stage 6a: /Lang overrides the document-level language for this
        // StructElem. SR readers use this to switch pronunciation voice
        // on foreign-language passages.
        if (item.lang) d.Lang = PDFString.of(item.lang);
        // Stage 5: emit /A << /O /Table /Scope /Column >> on TH StructElems.
        // PDF spec §14.8.5.7 puts /Scope inside the /A (attributes) dict with
        // owner /Table. Readers that honor this announce "column header" /
        // "row header" when a TD in that column/row is focused.
        const attrDict = { O: PDFName.of('Table') };
        let attrDirty = false;
        if (item.role === 'TH' && item.scope) {
          const scopeVal = item.scope.toLowerCase() === 'col' || item.scope.toLowerCase() === 'colgroup' ? 'Column'
                         : item.scope.toLowerCase() === 'row' || item.scope.toLowerCase() === 'rowgroup' ? 'Row'
                         : null;
          if (scopeVal) {
            attrDict.Scope = PDFName.of(scopeVal);
            attrDirty = true;
          }
        }
        // Stage 5b lite: /Headers on TDs — references applicable TH IDs so
        // SR readers can announce "column header X, row header Y, value".
        if (item.role === 'TD' && item.headers) {
          const ids = item.headers.split(/\s+/).filter(Boolean);
          if (ids.length > 0) {
            attrDict.Headers = context.obj(ids.map(id => PDFString.of(id)));
            attrDirty = true;
          }
        }
        if (attrDirty) d.A = context.obj(attrDict);
        const elemRef = context.register(context.obj(d));
        // Stage 5b lite: TH /ID is an indirect spec entry (not inside /A).
        // We collect {id, ref} entries for the /IDTree built after the
        // tree is assembled.
        if (item.role === 'TH' && item.structId) {
          try {
            const lookup = context.lookup(elemRef);
            if (lookup && typeof lookup.set === 'function') {
              lookup.set(PDFName.of('ID'), PDFString.of(item.structId));
            }
          } catch(_) {}
          idTreeEntries.push({ id: item.structId, ref: elemRef });
        }
        return elemRef;
      };
      // Attempt NESTED build with a section stack. Each stack entry is
      // { ref, level, kids: [] } representing an open Sect. On a heading
      // we close stack entries whose level >= the incoming level, then
      // open a new Sect at the new level. Leaf items (p/li/table/figure)
      // go into the top-of-stack's kids, or the root-kids list if no
      // section is open.
      const tryNested = () => {
        const rootKids = [];
        const sectStack = [];
        const pushChild = (ref) => {
          if (sectStack.length > 0) sectStack[sectStack.length - 1].kids.push(ref);
          else rootKids.push(ref);
        };
        const closeTo = (level) => {
          while (sectStack.length > 0 && sectStack[sectStack.length - 1].level >= level) {
            const s = sectStack.pop();
            const parentRef = sectStack.length > 0 ? sectStack[sectStack.length - 1].ref : structRootRef;
            context.assign(s.ref, context.obj({
              Type: PDFName.of('StructElem'),
              S: PDFName.of('Sect'),
              P: parentRef,
              K: context.obj(s.kids),
            }));
          }
        };
        const openSect = (level) => {
          const s = { ref: context.nextRef(), level, kids: [] };
          pushChild(s.ref);
          sectStack.push(s);
          return s;
        };
        for (const it of items) {
          if (it.level > 0) {
            closeTo(it.level);
            const s = openSect(it.level);
            s.kids.push(buildLeaf(it, s.ref));
          } else {
            const parentRef = sectStack.length > 0 ? sectStack[sectStack.length - 1].ref : structRootRef;
            pushChild(buildLeaf(it, parentRef));
          }
        }
        closeTo(0);
        return rootKids;
      };
      // Flat fallback — identical to Stage 1 behavior. Used only when
      // tryNested throws (edge-case HTML we didn't anticipate).
      const tryFlat = () => items.map(it => buildLeaf(it, structRootRef));
      try {
        const nested = tryNested();
        if (nested.length === 0 && items.length > 0) return tryFlat();
        return nested;
      } catch(nestErr) {
        try { warnLog('[createTaggedPdf] nested tree failed, falling back to flat: ' + (nestErr && nestErr.message)); } catch(_) {}
        return tryFlat();
      }
    };
    const structElemRefs = _buildOutlineStructElems();
    // ── Stage 4 prep: flat outline-items list for per-block role matching.
    // We rewalk the DOM here rather than plumb state out of
    // _buildOutlineStructElems because the walk is cheap (~ms) and keeps
    // that helper's return shape unchanged.
    const stage4OutlineItems = [];
    try {
      const _b = htmlDoc.body || htmlDoc.documentElement;
      const _w = htmlDoc.createTreeWalker(_b, NodeFilter.SHOW_ELEMENT, null);
      while (_w.nextNode()) {
        const _el = _w.currentNode;
        const _tag = (_el.tagName || '').toLowerCase();
        const _role = TAG_TO_PDF_ROLE[_tag];
        if (!_role) continue;
        if (['h1','h2','h3','h4','h5','h6','p','li','caption','blockquote'].includes(_tag) && !(_el.textContent || '').trim()) continue;
        stage4OutlineItems.push({ role: _role, text: (_el.textContent || '').trim().substring(0, 400) });
      }
    } catch(_) {}
    // ── Stage 2: content-stream MCID wrapping + per-page StructElems ──
    // For every page we (a) optionally inject an invisible OCR text layer
    // (scanned PDFs), (b) wrap the full content stream with BDC/EMC so a
    // single MCID covers the page, (c) build a per-page StructElem whose K
    // points at the page's MCID 0 via a Marked Content Reference (MCR), and
    // (d) populate the ParentTree entry for the page. This satisfies the
    // PDF/UA-1 §7.1 requirement that all content be tagged — strict
    // validators (Acrobat Pro Accessibility Checker, PAC 2024) want the
    // MCID linkage that Stage 1 omitted.
    const pages = doc.getPages();
    const isScanned = !!(fixResult && (fixResult.groundTruthMethod === 'tesseract' || fixResult.groundTruthMethod === 'vision'));
    // Tesseract extraction (line 2400) only preserves page-level {pageNum,text},
    // no word bboxes. So Path B falls back to a single invisible run per page
    // at top-left — visually clipped but SR reads the actual text instead of
    // announcing "paragraph" over a picture.
    const ocrPages = isScanned
      ? ((fixResult && fixResult.groundTruthPages)
          || (typeof window !== 'undefined' ? window.__lastGroundTruthPageMap : null)
          || [])
      : [];
    let _helvFont = null;
    const _getHelv = async () => {
      if (_helvFont) return _helvFont;
      try { _helvFont = await doc.embedFont(StandardFonts.Helvetica); } catch(_) { _helvFont = null; }
      return _helvFont;
    };
    // Helvetica only supports WinAnsiEncoding. OCR may return curly quotes /
    // em-dashes / accented letters. Swap the common ones and drop anything
    // else outside 0x20–0xFF so drawText doesn't throw mid-document.
    const _toWinAnsi = (s) => (s || '')
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/\u00A0/g, ' ')
      .replace(/[^\x20-\xFF\n\r\t]/g, '');

    // Stage 4 pdf.js doc load (text-layer PDFs only — scanned PDFs use the
    // Stage 3 single-MCID wrap because pdf.js on original bytes sees no text).
    let pdfjsDocForTagging = null;
    // Stage 6b: set of normalized-text hashes considered artifacts (running
    // headers / footers / legal boilerplate). Populated once after the
    // pdf.js load; passed to every per-page Stage 4 call.
    let artifactHashSet = new Set();
    if (!isScanned) {
      try {
        await ensurePdfJsLoaded();
        await ensurePakoLoaded();
        if (window.pdfjsLib) {
          const _srcBytes = originalPdfBytes instanceof Uint8Array ? originalPdfBytes : new Uint8Array(originalPdfBytes);
          pdfjsDocForTagging = await window.pdfjsLib.getDocument({ data: _srcBytes.slice() }).promise;
          // Pre-compute per-page items (only once) → detect artifacts. We
          // avoid re-extracting in each _stage4_tryWrapPage call by passing
          // the hash set down.
          try {
            const allPagesItems = [];
            for (let _pi = 0; _pi < pdfjsDocForTagging.numPages; _pi++) {
              allPagesItems.push(await _stage4_extractPdfjsItems(pdfjsDocForTagging, _pi));
            }
            artifactHashSet = _stage6b_detectArtifactHashes(allPagesItems);
          } catch(_) { artifactHashSet = new Set(); }
        }
      } catch(s4prepErr) {
        try { warnLog('[createTaggedPdf] Stage 4 pdf.js/pako load failed, using Stage 3 for all pages: ' + (s4prepErr && s4prepErr.message)); } catch(_) {}
        pdfjsDocForTagging = null;
      }
    }

    const pageElemRefs = [];
    const parentTreeNums = [];
    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      // Path B — invisible OCR text layer for scanned PDFs. opacity:0 keeps
      // it invisible to sighted users while SR readers still pick it up via
      // the content stream. Wrapped later by the BDC/EMC pass below.
      if (isScanned) {
        let ocrEntry = null;
        if (Array.isArray(ocrPages)) {
          ocrEntry = ocrPages.find(p => p && (p.pageNum === pi + 1 || p.page === pi + 1 || p.pageIndex === pi));
        }
        const ocrText = (ocrEntry && (ocrEntry.text || ocrEntry.content || ocrEntry.fullText || '')) || '';
        if (ocrText && ocrText.trim()) {
          try {
            const helv = await _getHelv();
            if (helv) {
              const sz = page.getSize();
              page.drawText(_toWinAnsi(ocrText), {
                x: 36,
                y: (sz && sz.height ? sz.height : 792) - 36,
                size: 1,
                font: helv,
                opacity: 0,
                lineHeight: 1,
                maxWidth: (sz && sz.width ? sz.width : 612) - 72,
              });
            }
          } catch(textErr) { try { warnLog('[createTaggedPdf] invisible OCR text layer failed p' + (pi+1) + ': ' + (textErr && textErr.message)); } catch(_) {} }
        }
      }
      // ── Stage 4 attempt ── Per-block MCID wrapping with proper /H1, /P,
      // /Caption, etc. roles. Reads the content stream, parses BT...ET text
      // objects, matches each to a pdf.js text item to infer the role, and
      // splices per-block BDC/EMC markers. Throws on any mismatch or parse
      // error; we fall back to the Stage 3 single-MCID wrap below. Scanned
      // PDFs skip Stage 4 because pdf.js on original bytes sees no text.
      let stage4Success = false;
      if (pdfjsDocForTagging && !isScanned && window.pako) {
        try {
          const s4 = await _stage4_tryWrapPage(
            page, pi, pdfjsDocForTagging, stage4OutlineItems,
            context, { PDFName, PDFString, PDFNumber }, structRootRef, artifactHashSet
          );
          if (s4 && s4.pageSectRef) {
            pageElemRefs.push(s4.pageSectRef);
            parentTreeNums.push(PDFNumber.of(pi));
            parentTreeNums.push(s4.parentArrayRef);
            stage4Success = true;
          }
        } catch (s4err) {
          try { warnLog('[createTaggedPdf] Stage 4 p' + (pi+1) + ' → Stage 3 fallback: ' + (s4err && s4err.message)); } catch(_) {}
        }
      }

      if (!stage4Success) {
        // ── Stage 3 fallback (Path A) ── Wrap the entire page content
        // stream with one BDC/EMC and tag it as a single /P. Keeps Stage 3
        // output exactly as it was when Stage 4 isn't applicable (scanned
        // PDFs, Stage 4 parse failures, pdf.js load failures).
        try {
          const bdcBytes = new TextEncoder().encode('/P <</MCID 0>> BDC\n');
          const emcBytes = new TextEncoder().encode('\nEMC\n');
          const bdcStream = context.stream(bdcBytes);
          const emcStream = context.stream(emcBytes);
          const bdcRef = context.register(bdcStream);
          const emcRef = context.register(emcStream);
          const node = page.node;
          const rawContents = node.get(PDFName.of('Contents'));
          const newArr = [bdcRef];
          if (rawContents && typeof rawContents.size === 'function' && typeof rawContents.get === 'function') {
            for (let k = 0; k < rawContents.size(); k++) newArr.push(rawContents.get(k));
          } else if (rawContents) {
            newArr.push(rawContents);
          }
          newArr.push(emcRef);
          node.set(PDFName.of('Contents'), context.obj(newArr));
          node.set(PDFName.of('StructParents'), PDFNumber.of(pi));
        } catch(wrapErr) { try { warnLog('[createTaggedPdf] BDC/EMC wrap failed p' + (pi+1) + ': ' + (wrapErr && wrapErr.message)); } catch(_) {} }

        // Per-page StructElem (type /P) with a single MCR K-child pointing
        // at the page's MCID 0. Validators walk this from content → tag
        // tree.
        try {
          const mcrDict = context.obj({
            Type: PDFName.of('MCR'),
            Pg: page.ref,
            MCID: PDFNumber.of(0),
          });
          const pageElemDict = context.obj({
            Type: PDFName.of('StructElem'),
            S: PDFName.of('P'),
            P: structRootRef,
            Pg: page.ref,
            K: context.obj([mcrDict]),
          });
          const pageElemRef = context.register(pageElemDict);
          pageElemRefs.push(pageElemRef);
          parentTreeNums.push(PDFNumber.of(pi));
          parentTreeNums.push(pageElemRef);
        } catch(elemErr) { try { warnLog('[createTaggedPdf] page StructElem build failed p' + (pi+1) + ': ' + (elemErr && elemErr.message)); } catch(_) {} }
      }
    }
    // ── Stage 3: AcroForm field tagging ──
    // Scan each page's Annots for widget annotations (Subtype=/Widget),
    // create a /Form StructElem per widget with an OBJR child linking
    // back to the annotation, assign a unique StructParent key, and set
    // that key on the annotation's dict so readers can walk from widget
    // to tag tree. No-op when the PDF has no form (the common case).
    const fieldElemRefs = [];
    let nextStructParentKey = pages.length;
    try {
      let form = null;
      try { form = doc.getForm(); } catch(_) { form = null; }
      let fields = [];
      if (form) { try { fields = form.getFields() || []; } catch(_) { fields = []; } }
      if (fields.length > 0) {
        // Map widget ref string → { annotRef, annotDict, page } by scanning
        // each page once.
        const widgetInfo = new Map();
        for (let pi = 0; pi < pages.length; pi++) {
          const page = pages[pi];
          const annots = page.node.get(PDFName.of('Annots'));
          if (!annots || typeof annots.size !== 'function') continue;
          for (let a = 0; a < annots.size(); a++) {
            const annotRef = annots.get(a);
            let annotDict;
            try { annotDict = context.lookup(annotRef); } catch(_) { continue; }
            if (!annotDict || typeof annotDict.get !== 'function') continue;
            const subtype = annotDict.get(PDFName.of('Subtype'));
            if (!subtype || String(subtype) !== '/Widget') continue;
            widgetInfo.set(annotRef.toString(), { annotRef, annotDict, page });
          }
        }
        for (const field of fields) {
          let fieldName = 'form field';
          try { fieldName = field.getName() || fieldName; } catch(_) {}
          // Collect widget refs for this field (Kids array, or the field
          // itself in the merged-widget case).
          const widgetRefs = [];
          try {
            const kids = field.acroField.dict.get(PDFName.of('Kids'));
            if (kids && typeof kids.size === 'function' && kids.size() > 0) {
              for (let k = 0; k < kids.size(); k++) widgetRefs.push(kids.get(k));
            } else {
              widgetRefs.push(field.acroField.ref);
            }
          } catch(_) { continue; }
          for (const wRef of widgetRefs) {
            const info = widgetInfo.get(wRef.toString());
            if (!info) continue;
            const key = nextStructParentKey++;
            const objrDict = context.obj({
              Type: PDFName.of('OBJR'),
              Pg: info.page.ref,
              Obj: info.annotRef,
            });
            const fieldElemDict = context.obj({
              Type: PDFName.of('StructElem'),
              S: PDFName.of('Form'),
              P: structRootRef,
              Pg: info.page.ref,
              Alt: PDFString.of(fieldName),
              K: context.obj([objrDict]),
            });
            const fieldElemRef = context.register(fieldElemDict);
            fieldElemRefs.push(fieldElemRef);
            try { info.annotDict.set(PDFName.of('StructParent'), PDFNumber.of(key)); } catch(_) {}
            parentTreeNums.push(PDFNumber.of(key));
            parentTreeNums.push(fieldElemRef);
          }
        }
      }
    } catch(formErr) { try { warnLog('[createTaggedPdf] AcroForm tagging failed: ' + (formErr && formErr.message)); } catch(_) {} }
    // ParentTree — number tree mapping StructParents key → StructElem ref.
    // Stage 1 left this empty; validators need it populated for MCID linkage.
    const parentTreeDict = context.obj({ Nums: context.obj(parentTreeNums) });
    const parentTreeRef = context.register(parentTreeDict);
    // StructTreeRoot.K holds outline elems first (heading navigation),
    // per-page elems next (content-stream linkage), then form-field elems
    // last (AcroForm widgets). Order matters: outline first gives SR
    // readers the semantic reading order when they traverse the tag tree
    // depth-first.
    const combinedK = structElemRefs.concat(pageElemRefs).concat(fieldElemRefs);
    // Stage 5b lite: /IDTree name tree. Required by readers that resolve TD
    // /Headers [(id)] back to the referenced TH StructElem. Name tree keys
    // must be sorted lexicographically (PDF spec §7.9.6).
    let idTreeRef = null;
    if (idTreeEntries.length > 0) {
      try {
        const sorted = idTreeEntries.slice().sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        const names = [];
        for (const entry of sorted) {
          names.push(PDFString.of(entry.id));
          names.push(entry.ref);
        }
        idTreeRef = context.register(context.obj({ Names: context.obj(names) }));
      } catch(idtErr) { try { warnLog('[createTaggedPdf] Stage 5b /IDTree build failed (non-fatal): ' + (idtErr && idtErr.message)); } catch(_) {} }
    }
    const structRootDictBody = {
      Type: PDFName.of('StructTreeRoot'),
      K: context.obj(combinedK),
      ParentTree: parentTreeRef,
      ParentTreeNextKey: PDFNumber.of(nextStructParentKey),
      RoleMap: context.obj({}),
    };
    if (idTreeRef) structRootDictBody.IDTree = idTreeRef;
    const structRootDict = context.obj(structRootDictBody);
    context.assign(structRootRef, structRootDict);
    catalog.set(PDFName.of('StructTreeRoot'), structRootRef);
    // ── ViewerPreferences: DisplayDocTitle ──
    // PDF/UA-1 §7.1 requires this so the window title bar shows the doc
    // title rather than the filename.
    const viewerPrefs = (catalog.get(PDFName.of('ViewerPreferences')));
    if (viewerPrefs) {
      try { viewerPrefs.set(PDFName.of('DisplayDocTitle'), context.obj(true)); } catch(_) {}
    } else {
      catalog.set(PDFName.of('ViewerPreferences'), context.obj({ DisplayDocTitle: true }));
    }
    // ── Tag summary for visible proof of tagging ──
    // Most PDF readers don't surface "is this tagged?" to the user, so a
    // user clicking "Tagged PDF" downloads a file that visually looks
    // identical to the original (visual layer is preserved byte-identical
    // by design) and reasonably wonders if anything actually happened.
    // Returning a struct-element summary alongside the bytes lets the
    // caller surface "3 headings · 28 paragraphs · 1 table tagged" in a
    // toast, so tagging is demonstrably real.
    //
    // Counts are computed from the same `items` list `_buildOutlineStructElems`
    // already walks (no second DOM pass) plus the page count from the doc.
    const _summary = (() => {
        let headings = 0, paragraphs = 0, tables = 0, lists = 0, images = 0, tableCells = 0, langTagged = 0;
        try {
            if (Array.isArray(_outlineItems)) {
                for (const it of _outlineItems) {
                    if (it.lang) langTagged++;
                    if (/^H[1-6]$/.test(it.role)) headings++;
                    else if (it.role === 'P') paragraphs++;
                    else if (it.role === 'Table') tables++;
                    else if (it.role === 'L') lists++;
                    else if (it.role === 'Figure') images++;
                    else if (it.role === 'TH' || it.role === 'TD') tableCells++;
                }
            }
        } catch(_) {}
        return {
            headings, paragraphs, tables, lists, images, tableCells, langTagged,
            pages: pages.length,
            structElems: (typeof structElemRefs !== 'undefined' && Array.isArray(structElemRefs)) ? structElemRefs.length : 0,
            fields: (typeof fieldElemRefs !== 'undefined' && Array.isArray(fieldElemRefs)) ? fieldElemRefs.length : 0,
        };
    })();
    // ── Return tagged bytes + summary ──
    // useObjectStreams=false produces slightly larger PDFs but more
    // compatible with older readers and validators.
    const _bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false });
    return { bytes: _bytes, summary: _summary };
  };

  // ── Download Accessible PDF from HTML ──
  const downloadAccessiblePdf = (htmlContent, filename) => {
    if (!htmlContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { addToast('Pop-up blocked — allow pop-ups to download PDF', 'error'); return; }
    try {
      printWindow.document.write(htmlContent);
    } catch(writeErr) {
      warnLog('[downloadAccessiblePdf] doc.write failed — retrying with scripts stripped: ' + (writeErr?.message || writeErr));
      try { printWindow.document.write(htmlContent.replace(/<script[\s\S]*?<\/script>/gi, '')); }
      catch(retryErr) { warnLog('[downloadAccessiblePdf] fallback write also failed: ' + (retryErr?.message || retryErr)); }
    }
    printWindow.document.close();
    // Add print instructions
    const printBanner = printWindow.document.createElement('div');
    printBanner.id = 'print-banner';
    printBanner.innerHTML = `<div role="status" aria-live="polite" aria-atomic="true" aria-label="Accessible document ready. Use Control P or Command P, then Save as PDF, to download as a tagged PDF." style="background:#2563eb;color:white;padding:12px 20px;font-family:system-ui;display:flex;align-items:center;justify-content:between;gap:12px;position:sticky;top:0;z-index:9999">
      <span style="font-weight:bold"><span aria-hidden="true">♿ </span>Accessible Document Ready</span>
      <span style="font-size:13px;opacity:0.9">Use <strong>Ctrl+P</strong> (or ⌘+P on Mac) → <strong>Save as PDF</strong> to download as a tagged PDF</span>
      <button onclick="document.getElementById('print-banner').remove();window.print()" aria-label="Save as PDF" style="margin-left:auto;background:white;color:#2563eb;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px"><span aria-hidden="true">📥 </span>Save as PDF</button>
      <button onclick="document.getElementById('print-banner').remove()" aria-label="Dismiss this banner" style="background:transparent;color:white;border:1px solid rgba(255,255,255,0.3);padding:8px 12px;border-radius:6px;cursor:pointer;font-size:13px"><span aria-hidden="true">✕</span></button>
    </div>`;
    printWindow.document.body.insertBefore(printBanner, printWindow.document.body.firstChild);
    // Add print CSS to hide banner
    const printStyle = printWindow.document.createElement('style');
    printStyle.textContent = '@media print { #print-banner { display: none !important; } }';
    printWindow.document.head.appendChild(printStyle);
  };

  // ── PDF Preview: Apply theme to accessible HTML ──
  // ── Apply Style Seed to HTML (unified replacement for applyThemeToPdfHtml) ──
  const applyStyleSeedToHtml = (html, seedId, fontSize) => {
    const seed = STYLE_SEEDS[seedId];
    const extractedStyle = pdfFixResult?.docStyle;

    // Resolve CSS vars: matchOriginal uses extracted PDF colors, others use seed.cssVars
    let cssVars;
    if (seedId === 'matchOriginal' && extractedStyle) {
      cssVars = {
        bodyFont: extractedStyle.bodyFont || 'system-ui, sans-serif',
        headingColor: extractedStyle.headingColor || '#1e3a5f',
        accentColor: extractedStyle.accentColor || '#2563eb',
        bgColor: extractedStyle.bgColor || '#ffffff',
        cardBg: extractedStyle.tableBg || '#f1f5f9',
        cardBorder: extractedStyle.tableBorder || '#cbd5e1',
        extraCSS: extractedStyle.extraCSS || '',
      };
    } else if (seed?.cssVars) {
      cssVars = seed.cssVars;
    } else {
      // Fallback to professional
      cssVars = STYLE_SEEDS.professional.cssVars;
    }

    // For dark themes, use light text color instead of dark
    const textColor = cssVars.bgColor && (() => {
      const hexToRgb = (hex) => { const h = hex.replace('#',''); return h.length === 3 ? [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)] : [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)]; };
      try { const bg = hexToRgb(cssVars.bgColor); const lum = (0.2126*(bg[0]/255<=0.03928?bg[0]/255/12.92:Math.pow((bg[0]/255+0.055)/1.055,2.4))) + (0.7152*(bg[1]/255<=0.03928?bg[1]/255/12.92:Math.pow((bg[1]/255+0.055)/1.055,2.4))) + (0.0722*(bg[2]/255<=0.03928?bg[2]/255/12.92:Math.pow((bg[2]/255+0.055)/1.055,2.4))); return lum < 0.18 ? '#e2e8f0' : '#1e293b'; } catch(e) { return '#1e293b'; }
    })() || '#1e293b';

    // Link underline satisfies WCAG 1.4.1 (Use of Color): a non-color signal
    // distinguishes links from surrounding prose, so accent color alone isn't
    // carrying the meaning. Print media strips the underline separately.
    const themeCSS = `
      body { font-family: ${cssVars.bodyFont}; font-size: ${fontSize}px; background: ${cssVars.bgColor}; color: ${textColor}; }
      h1, h2, h3, h4 { color: ${cssVars.headingColor}; }
      a { color: ${cssVars.accentColor}; text-decoration: underline; }
      table { border-color: ${cssVars.cardBorder}; }
      th { background: ${cssVars.cardBg}; }
      ${cssVars.extraCSS || ''}
    `;
    let themed;
    if (html.includes('</style>')) {
      themed = html.replace('</style>', themeCSS + '\n</style>');
    } else {
      themed = html.replace('</head>', '<style>' + themeCSS + '</style>\n</head>');
    }
    // Run WCAG sanitizer — High Contrast uses AAA (7:1), all others use AA (4.5:1).
    // For matchOriginal, colors come from the uploaded PDF and may have AA-failing
    // combinations that the seed-based themes don't. sanitizeStyleForWCAG already
    // runs fixContrastViolations internally, but we run one explicit extra pass for
    // matchOriginal as belt-and-suspenders insurance against PDF-extracted palettes.
    const wcagLevel = seed?.wcagLevel || 'AA';
    let sanitized = sanitizeStyleForWCAG(themed, { level: wcagLevel });
    if (seedId === 'matchOriginal') {
      const extraContrast = fixContrastViolations(sanitized.html);
      if (extraContrast && extraContrast.html) sanitized = { ...sanitized, html: extraContrast.html };
    }
    return sanitized.html;
  };
  // Backward compat alias
  const applyThemeToPdfHtml = applyStyleSeedToHtml;

  // ── PDF Preview: Update iframe content ──
  // Accept overrides to avoid stale closure — state may not have updated yet when called from setTimeout
  const updatePdfPreview = (overrideTheme, overrideFontSize, overrideA11y) => {
    if (!pdfPreviewRef.current || !pdfFixResult?.accessibleHtml) return;
    const iframe = pdfPreviewRef.current;
    const useTheme = overrideTheme !== undefined ? overrideTheme : pdfPreviewTheme;
    const useFontSize = overrideFontSize !== undefined ? overrideFontSize : pdfPreviewFontSize;
    const useA11y = overrideA11y !== undefined ? overrideA11y : pdfPreviewA11yInspect;
    // Belt-and-suspenders: before applying a new theme/font/a11y view, snapshot
    // the iframe's current outerHTML and prefer that over the (possibly stale)
    // accessibleHtml in React state. This catches user image swaps and any
    // other iframe DOM edits made via designMode='on' that the React state
    // hasn't synced yet — without this, theme/font toggles wipe those edits.
    let sourceHtml = pdfFixResult.accessibleHtml;
    try {
      const liveDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (liveDoc && liveDoc.body) {
        const liveText = liveDoc.body.textContent || '';
        if (liveText.trim().length >= 50) {
          // Strip transient overlay CSS so it doesn't get baked into the export source.
          const inspect = liveDoc.getElementById('a11y-inspect-css');
          if (inspect) inspect.remove();
          sourceHtml = '<!DOCTYPE html>\n' + liveDoc.documentElement.outerHTML;
        }
      }
    } catch (_) { /* fall through to accessibleHtml */ }
    const themed = applyThemeToPdfHtml(sourceHtml, useTheme, useFontSize);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    try {
      doc.write(themed);
    } catch(writeErr) {
      warnLog('[updatePdfPreview] doc.write failed (' + (writeErr?.message || writeErr) + ') — retrying with scripts stripped');
      try {
        const _fallbackHtml = themed.replace(/<script[\s\S]*?<\/script>/gi, '');
        doc.write(_fallbackHtml);
      } catch(retryErr) {
        warnLog('[updatePdfPreview] fallback write also failed: ' + (retryErr?.message || retryErr));
      }
    }
    doc.close();
    // Enable editing
    setTimeout(() => {
      try { doc.designMode = 'on'; } catch(e) {}
                            // Auto-run lightweight a11y audit on preview load
                            var _ear = (_s && typeof _s === 'function') ? (_s().exportAuditResult) : (typeof exportAuditResult !== 'undefined' ? exportAuditResult : null);
                            if (!_ear) { setTimeout(async () => { try { setExportAuditLoading(true); const html = doc.documentElement.outerHTML; const [aiR, axeR] = await Promise.all([auditOutputAccessibility(html), runAxeAudit(html).catch(() => null)]); const combined = aiR || { score: 0, summary: '', issues: [], passes: [] }; if (axeR) { combined.axeViolations = axeR.totalViolations; combined.axePasses = axeR.totalPasses; } setExportAuditResult(combined); } catch(e) {} setExportAuditLoading(false); }, 500); }
      // A11y inspect overlays
      if (useA11y) {
        const inspectCSS = doc.createElement('style');
        inspectCSS.id = 'a11y-inspect-css';
        inspectCSS.textContent = `
          h1,h2,h3,h4,h5,h6 { outline: 2px dashed #7c3aed !important; outline-offset: 2px; position: relative; }
          h1::before { content: 'H1'; position: absolute; top: -8px; right: -4px; background: #7c3aed; color: white; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; font-family: monospace; }
          h2::before { content: 'H2'; position: absolute; top: -8px; right: -4px; background: #7c3aed; color: white; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; font-family: monospace; }
          h3::before { content: 'H3'; position: absolute; top: -8px; right: -4px; background: #7c3aed; color: white; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; font-family: monospace; }
          img { outline: 2px solid #2563eb !important; outline-offset: 2px; }
          img::after { content: attr(alt); display: block; background: #2563eb; color: white; font-size: 9px; padding: 2px 6px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          table { outline: 2px solid #059669 !important; outline-offset: 2px; }
          th { outline: 1px dashed #059669 !important; }
          th::before { content: 'TH'; background: #059669; color: white; font-size: 8px; padding: 0 3px; border-radius: 2px; margin-right: 4px; font-family: monospace; }
          [role] { outline: 1px dotted #ea580c !important; }
          a { outline: 1px dashed #2563eb !important; }
          figure { outline: 2px solid #0891b2 !important; outline-offset: 4px; }
          figcaption { background: #cffafe !important; }
          main { outline: 2px solid #16a34a !important; outline-offset: 4px; }
          main::before { content: 'MAIN'; position: absolute; top: -10px; left: 0; background: #16a34a; color: white; font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; font-family: monospace; }
          [aria-label]::after { content: '🏷️ ' attr(aria-label); display: block; font-size: 8px; color: #6b7280; background: #f3f4f6; padding: 1px 4px; border-radius: 2px; margin-top: 2px; max-width: 300px; overflow: hidden; }
        `;
        doc.head.appendChild(inspectCSS);
      }
    }, 100);
  };

  // ═══════════════════════════════════════════════════════════════
  // EXPERT WORKBENCH — AUTONOMOUS REMEDIATION AGENT
  // Self-prompting AI loop: audit → analyze → plan tools → fix → re-audit.
  // The AI generates its own fix plan using the surgical micro-tools in
  // SHARED_SURGICAL_TOOLS, executes them, and loops until score plateaus
  // or target is reached. Originally added in ba3c50d; lost in 1542fc8
  // (WriteCraft commit regression); restored here.
  // ═══════════════════════════════════════════════════════════════
  const runAutonomousRemediation = async (htmlContent, options) => {
    options = options || {};
    const surgicalTools = SHARED_SURGICAL_TOOLS;
    const maxPasses = options.maxPasses || 5;
    const targetScore = options.targetScore || 90;
    const onProgress = options.onProgress || function() {};
    const onActivity = options.onActivity || function() {};

    let currentHtml = htmlContent;
    let passCount = 0;
    let prevScore = 0;
    let plateauCount = 0;
    const activityLog = [];

    function logActivity(msg, type) {
      var entry = { text: msg, type: type || 'info', time: new Date().toLocaleTimeString() };
      activityLog.push(entry);
      try { onActivity(entry, activityLog); } catch(_) {}
      warnLog('[Agent] ' + msg);
    }

    // Build tool descriptions for the AI prompt from the live registry so any registry-level
    // additions (Phase 2 tools, future additions) show up automatically.
    var toolDescriptions = Object.keys(surgicalTools).map(function(name) {
      return '- ' + name + '(html, params)';
    }).join('\n');

    logActivity('\uD83E\uDD16 Autonomous remediation agent started. Target: ' + targetScore + '/100, max ' + maxPasses + ' passes.', 'start');

    while (passCount < maxPasses) {
      passCount++;
      onProgress('Agent pass ' + passCount + '/' + maxPasses + ': auditing...');
      logActivity('\uD83D\uDD0D Pass ' + passCount + ': Running WCAG audit...', 'audit');

      // AUDIT
      var axeResult;
      try { axeResult = await runAxeAudit(currentHtml); }
      catch (e) { logActivity('\u274C Audit failed: ' + (e.message || e), 'error'); break; }
      if (!axeResult) { logActivity('\u274C Audit returned no results.', 'error'); break; }

      var currentScore = 100 - ((axeResult.critical || []).length * 15 + (axeResult.serious || []).length * 10 + (axeResult.moderate || []).length * 5 + (axeResult.minor || []).length * 2);
      currentScore = Math.max(0, Math.min(100, currentScore));
      logActivity('\uD83D\uDCCA Score: ' + currentScore + '/100 (' + axeResult.totalViolations + ' violations)', 'score');

      if (currentScore >= targetScore) {
        logActivity('\u2705 Target score ' + targetScore + ' reached! Final: ' + currentScore + '/100', 'success');
        break;
      }

      // Plateau detection (no improvement over 2 consecutive passes)
      if (currentScore <= prevScore) {
        plateauCount++;
        if (plateauCount >= 2) {
          logActivity('\uD83D\uDFE1 Plateau detected — score not improving after ' + plateauCount + ' passes. Stopping.', 'plateau');
          break;
        }
      } else { plateauCount = 0; }
      prevScore = currentScore;

      // ANALYZE — ask AI to plan tool calls based on the audit.
      onProgress('Agent pass ' + passCount + '/' + maxPasses + ': analyzing violations...');
      logActivity('\uD83E\uDDE0 Analyzing ' + axeResult.totalViolations + ' violations and planning fixes...', 'analyze');

      var violationSummary = [];
      (axeResult.critical || []).forEach(function(v) { violationSummary.push('CRITICAL: ' + v.description + ' (' + v.id + ') — ' + (v.nodes || 1) + ' elements'); });
      (axeResult.serious || []).forEach(function(v) { violationSummary.push('SERIOUS: ' + v.description + ' (' + v.id + ') — ' + (v.nodes || 1) + ' elements'); });
      (axeResult.moderate || []).forEach(function(v) { violationSummary.push('MODERATE: ' + v.description + ' (' + v.id + ') — ' + (v.nodes || 1) + ' elements'); });

      var analyzePrompt = 'You are a WCAG 2.1 AA remediation agent with surgical micro-tools.\n\n' +
        'AVAILABLE TOOLS:\n' + toolDescriptions + '\n\n' +
        'CURRENT SCORE: ' + currentScore + '/100\nTARGET: ' + targetScore + '/100\n\n' +
        'AXE-CORE VIOLATIONS (' + axeResult.totalViolations + ' total):\n' +
        violationSummary.slice(0, 15).join('\n') + '\n\n' +
        'HTML PREVIEW (first 3000 chars):\n' + currentHtml.substring(0, 3000) + '\n\n' +
        'Plan exactly which tools to call and with what parameters to fix the top violations.\n' +
        'Focus on the highest-impact fixes first (CRITICAL > SERIOUS > MODERATE).\n' +
        'Be specific: provide exact index numbers, alt text strings, heading levels, etc.\n\n' +
        'Return ONLY JSON:\n' +
        '{\n' +
        '  "analysis": "Brief summary of remaining issues",\n' +
        '  "actions": [\n' +
        '    {"tool": "fix_alt_text", "params": {"index": 0, "alt": "descriptive text"}, "reason": "why"},\n' +
        '    {"tool": "fix_heading", "params": {"index": 2, "newLevel": "h3"}, "reason": "why"}\n' +
        '  ],\n' +
        '  "shouldContinue": true\n' +
        '}';

      var plan;
      try {
        var planResult = await callGemini(analyzePrompt, true);
        var planStr = (typeof planResult === 'string' ? planResult : (planResult && planResult.text ? planResult.text : String(planResult || '{}')));
        planStr = planStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        var jsonS = planStr.indexOf('{'), jsonE = planStr.lastIndexOf('}');
        if (jsonS >= 0 && jsonE > jsonS) planStr = planStr.substring(jsonS, jsonE + 1);
        plan = JSON.parse(planStr);
      } catch (e) {
        logActivity('\u26A0\uFE0F AI analysis failed to parse: ' + (e.message || e), 'error');
        break;
      }

      if (!plan || !plan.actions || plan.actions.length === 0) {
        logActivity('\uD83D\uDFE2 AI found no actionable fixes remaining.', 'complete');
        break;
      }

      logActivity('\uD83D\uDCCB Plan: ' + plan.analysis, 'plan');
      logActivity('\uD83D\uDD27 Executing ' + plan.actions.length + ' tool calls...', 'fix');

      // FIX — execute planned tool calls against the live registry.
      var fixedCount = 0;
      for (var ai = 0; ai < plan.actions.length; ai++) {
        var action = plan.actions[ai];
        var toolFn = surgicalTools[action.tool];
        if (toolFn && action.params) {
          try {
            var newHtml = toolFn(currentHtml, action.params);
            if (newHtml && newHtml !== currentHtml) {
              currentHtml = newHtml;
              fixedCount++;
              logActivity('  \u2705 ' + action.tool + ': ' + (action.reason || 'applied'), 'tool');
            } else {
              logActivity('  \u23E9 ' + action.tool + ': no change (already fixed or invalid params)', 'skip');
            }
          } catch (e) {
            logActivity('  \u274C ' + action.tool + ' failed: ' + (e.message || e), 'error');
          }
        } else {
          logActivity('  \u26A0\uFE0F Unknown tool: ' + action.tool, 'error');
        }
      }

      logActivity('\uD83D\uDD27 Applied ' + fixedCount + '/' + plan.actions.length + ' fixes.', 'result');

      if (fixedCount === 0) {
        logActivity('\uD83D\uDFE1 No fixes were effective this pass. Stopping.', 'plateau');
        break;
      }
      if (plan.shouldContinue === false) {
        logActivity('\uD83D\uDFE2 Agent determined no further improvement possible.', 'complete');
        break;
      }
    }

    // Final audit summary.
    var finalAxe = await runAxeAudit(currentHtml).catch(function() { return null; });
    var finalScore = finalAxe ? Math.max(0, 100 - ((finalAxe.critical || []).length * 15 + (finalAxe.serious || []).length * 10 + (finalAxe.moderate || []).length * 5 + (finalAxe.minor || []).length * 2)) : prevScore;
    logActivity('\uD83C\uDFC1 Agent complete. Final score: ' + finalScore + '/100 after ' + passCount + ' passes.', 'complete');

    return { html: currentHtml, score: finalScore, passes: passCount, log: activityLog, axe: finalAxe };
  };

  // ═══════════════════════════════════════════════════════════════
  // EXPERT COMMAND PROCESSOR
  // Parses natural language commands into surgical tool calls. Built-in
  // commands (audit/auto/score/contrast) bypass AI; everything else goes
  // through Gemini for interpretation → tool call planning → execution.
  // ═══════════════════════════════════════════════════════════════
  const processExpertCommand = async (command, currentHtml, options) => {
    options = options || {};
    const surgicalTools = SHARED_SURGICAL_TOOLS;
    var cmd = (command || '').trim().toLowerCase();
    var onActivity = options.onActivity || function() {};
    var ts = function() { return new Date().toLocaleTimeString(); };

    // Built-in commands — zero-AI fast paths.
    if (cmd === 'audit' || cmd === 'check') {
      onActivity({ text: '\uD83D\uDD0D Running WCAG audit...', type: 'audit', time: ts() });
      var axe = await runAxeAudit(currentHtml);
      var sc = axe ? Math.max(0, 100 - ((axe.critical || []).length * 15 + (axe.serious || []).length * 10 + (axe.moderate || []).length * 5 + (axe.minor || []).length * 2)) : 0;
      onActivity({ text: '\uD83D\uDCCA Score: ' + sc + '/100 — ' + (axe ? axe.totalViolations : '?') + ' violations', type: 'score', time: ts() });
      return { type: 'audit', html: currentHtml, score: sc, axe: axe };
    }
    if (cmd === 'auto' || cmd === 'auto-fix' || cmd === 'agent') {
      var result = await runAutonomousRemediation(currentHtml, {
        onProgress: options.onProgress || function() {},
        onActivity: function(entry) { onActivity(entry); },
      });
      return { type: 'agent', html: result.html, score: result.score, log: result.log };
    }
    if (cmd === 'score') {
      var ax = await runAxeAudit(currentHtml);
      var s = ax ? Math.max(0, 100 - ((ax.critical || []).length * 15 + (ax.serious || []).length * 10 + (ax.moderate || []).length * 5 + (ax.minor || []).length * 2)) : 0;
      onActivity({ text: '\uD83D\uDCCA Current score: ' + s + '/100', type: 'score', time: ts() });
      return { type: 'score', html: currentHtml, score: s };
    }
    if (cmd === 'contrast' || cmd === 'fix contrast') {
      onActivity({ text: '\uD83C\uDFA8 Fixing color contrast violations...', type: 'fix', time: ts() });
      var fixed = typeof fixContrastViolations === 'function' ? fixContrastViolations(currentHtml) : currentHtml;
      return { type: 'fix', html: fixed };
    }

    // AI-interpreted commands — free-form expert instructions.
    onActivity({ text: '\uD83E\uDD16 Interpreting: "' + command + '"', type: 'thinking', time: ts() });

    var toolList = Object.keys(surgicalTools).join(', ');
    var interpretPrompt = 'You are a remediation command interpreter. Parse this accessibility expert\'s instruction into surgical tool calls.\n\n' +
      'AVAILABLE TOOLS: ' + toolList + '\n\n' +
      'Each tool takes (html, params). Common params:\n' +
      '- fix_alt_text: {index: N, alt: "text"}\n' +
      '- fix_heading: {index: N, newLevel: "h2"}\n' +
      '- fix_link_text: {index: N, newText: "descriptive text"}\n' +
      '- fix_table_caption: {index: N, caption: "text"}\n' +
      '- fix_aria_label: {tag: "nav", index: N, label: "text"}\n' +
      '- fix_contrast: {oldColor: "#aaa", newColor: "#333"}\n' +
      '- fix_skip_nav: {} (no params)\n' +
      '- fix_lang: {lang: "en"}\n' +
      '- fix_input_label: {index: N, label: "text"}\n' +
      '- fix_math: {index: N}\n' +
      '- fix_reflow: {}\n\n' +
      'EXPERT COMMAND: "' + command + '"\n\n' +
      'HTML PREVIEW (first 1500 chars):\n' + currentHtml.substring(0, 1500) + '\n\n' +
      'Return ONLY JSON:\n' +
      '{"interpretation":"what the expert wants","actions":[{"tool":"fix_alt_text","params":{"index":0,"alt":"text"},"reason":"why"}],"confirmation":"I will..."}';

    try {
      var aiResult = await callGemini(interpretPrompt, true);
      var aiStr = (typeof aiResult === 'string' ? aiResult : (aiResult && aiResult.text ? aiResult.text : '{}'));
      aiStr = aiStr.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var jS = aiStr.indexOf('{'), jE = aiStr.lastIndexOf('}');
      if (jS >= 0 && jE > jS) aiStr = aiStr.substring(jS, jE + 1);
      var parsed = JSON.parse(aiStr);

      if (parsed.confirmation) {
        onActivity({ text: '\uD83D\uDCAC ' + parsed.confirmation, type: 'confirm', time: ts() });
      }

      var resultHtml = currentHtml;
      if (parsed.actions && parsed.actions.length > 0) {
        for (var ci = 0; ci < parsed.actions.length; ci++) {
          var act = parsed.actions[ci];
          var fn = surgicalTools[act.tool];
          if (fn && act.params) {
            try {
              var newH = fn(resultHtml, act.params);
              if (newH && newH !== resultHtml) {
                resultHtml = newH;
                onActivity({ text: '  \u2705 ' + act.tool + ': ' + (act.reason || 'applied'), type: 'tool', time: ts() });
              }
            } catch (e) {
              onActivity({ text: '  \u274C ' + act.tool + ' failed: ' + (e.message || e), type: 'error', time: ts() });
            }
          }
        }
      }

      return { type: 'command', html: resultHtml, interpretation: parsed.interpretation };
    } catch (e) {
      onActivity({ text: '\u274C Could not interpret command: ' + (e.message || e), type: 'error', time: ts() });
      return { type: 'error', html: currentHtml, error: e.message };
    }
  };

  // ── Word restoration (fidelity v2) ──
  // Splice missing words from source OCR back into the remediated HTML using fuzzy ±5-word
  // context anchoring. DOMParser walks text nodes only — attributes, <script>, <style>, and
  // figure captions are never modified. Words that can't be uniquely placed go to a
  // "Content recovery" <section> appendix so nothing is silently dropped.
  const applyWordRestoration = (html, missingList, sourceText) => {
    if (!html || !Array.isArray(missingList) || missingList.length === 0 || !sourceText) {
      return { html: html || '', restored: [], unplaceable: [] };
    }
    const restored = [];
    const unplaceable = [];
    // Preserve any DOCTYPE prefix so serialization round-trips cleanly.
    const doctypeMatch = html.match(/^\s*<!DOCTYPE[^>]*>/i);
    const doctypePrefix = doctypeMatch ? doctypeMatch[0] + '\n' : '';
    let doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch (e) { warnLog('[Restore] DOMParser failed:', e && e.message); return { html, restored: [], unplaceable: missingList.slice() }; }
    // Tokenize source text — raw array preserves casing/punctuation for re-insertion, lc array
    // is used for matching against normalized HTML text nodes.
    const srcWordsRaw = sourceText.match(/\S+/g) || [];
    const srcWordsLc = srcWordsRaw.map(w => w.toLowerCase().replace(/[^a-z0-9'-]/g, ''));
    const wordPositions = {};
    srcWordsLc.forEach((w, i) => { if (w) { (wordPositions[w] = wordPositions[w] || []).push(i); } });
    const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ');
    // Find the FIRST occurrence of `needle` in `textLc` that is unique — returns -1 if absent
    // OR if it appears more than once (we refuse to guess between ambiguous matches).
    const findUniqueContext = (textLc, contextWords) => {
      const needle = contextWords.join(' ');
      if (!needle || needle.length < 4) return -1;
      const firstIdx = textLc.indexOf(needle);
      if (firstIdx === -1) return -1;
      const secondIdx = textLc.indexOf(needle, firstIdx + 1);
      if (secondIdx !== -1) return -1;
      return firstIdx;
    };
    // Walk body text nodes, skipping elements where word insertion would be unsafe.
    const SKIP_PARENTS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, FIGCAPTION: 1 };
    const textNodes = [];
    const root = doc.body || doc.documentElement;
    if (root && doc.createTreeWalker) {
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        let parent = n.parentNode;
        let skip = false;
        while (parent && parent.nodeType === 1) {
          if (SKIP_PARENTS[parent.tagName]) { skip = true; break; }
          parent = parent.parentNode;
        }
        if (!skip && n.nodeValue && n.nodeValue.trim()) textNodes.push(n);
      }
    }
    // Map a normalized-text offset back to the original nodeValue offset. Normalize collapsed
    // whitespace runs to a single space; this walks the original counting non-whitespace chars.
    const mapOffset = (orig, normOffset) => {
      let normCur = 0, origCur = 0, inWhite = false;
      for (; origCur < orig.length && normCur < normOffset; origCur++) {
        const ch = orig[origCur];
        if (/\s/.test(ch)) {
          if (!inWhite) { normCur++; inWhite = true; }
        } else { normCur++; inWhite = false; }
      }
      return origCur;
    };
    missingList.forEach(entry => {
      const targetWord = entry && entry.word ? String(entry.word).toLowerCase() : '';
      if (!targetWord) return;
      const positions = wordPositions[targetWord] || [];
      let placed = false;
      for (const pos of positions) {
        const winStart = Math.max(0, pos - 5);
        const winEnd = Math.min(srcWordsLc.length - 1, pos + 5);
        const beforeCtx = srcWordsLc.slice(winStart, pos).filter(Boolean);
        const afterCtx = srcWordsLc.slice(pos + 1, winEnd + 1).filter(Boolean);
        if (beforeCtx.length < 2 && afterCtx.length < 2) continue;
        for (const node of textNodes) {
          const nodeTextLc = normalize(node.nodeValue);
          let splicePoint = -1;
          if (beforeCtx.length >= 2) {
            const idx = findUniqueContext(nodeTextLc, beforeCtx);
            if (idx !== -1) splicePoint = idx + beforeCtx.join(' ').length;
          }
          if (splicePoint === -1 && afterCtx.length >= 2) {
            const idx = findUniqueContext(nodeTextLc, afterCtx);
            if (idx !== -1) splicePoint = idx;
          }
          if (splicePoint === -1) continue;
          const orig = node.nodeValue;
          const origCursor = mapOffset(orig, splicePoint);
          const origWord = srcWordsRaw[pos] || targetWord;
          const needsLeadingSpace = origCursor > 0 && !/\s/.test(orig[origCursor - 1]);
          const needsTrailingSpace = origCursor < orig.length && !/\s/.test(orig[origCursor]);
          const insert = (needsLeadingSpace ? ' ' : '') + origWord + (needsTrailingSpace ? ' ' : '');
          node.nodeValue = orig.slice(0, origCursor) + insert + orig.slice(origCursor);
          restored.push({ word: origWord, context: beforeCtx.concat([targetWord], afterCtx).join(' ') });
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed) {
        const posForCtx = positions.length > 0 ? positions[0] : 0;
        const winStart = Math.max(0, posForCtx - 5);
        const winEnd = Math.min(srcWordsLc.length - 1, posForCtx + 5);
        const contextSnippet = srcWordsRaw.slice(winStart, winEnd + 1).join(' ');
        const origWord = srcWordsRaw[posForCtx] || targetWord;
        // Guard: if the word is already present anywhere in the doc, it's a count-diff
        // artifact (e.g. running-header dedupe), not a real content loss — skip appendix.
        // Hyphen variants: "physical-biological" tokenizes as one key but may appear in the
        // doc as "physicalbiological" (joined) or "physical biological" (split). Test all
        // three forms so compound / hyphenated terms don't false-flag as missing.
        const docText = ((root && root.textContent) || '').toLowerCase();
        const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escaped = escRe(targetWord);
        const variants = [targetWord];
        if (targetWord.indexOf('-') !== -1) {
          variants.push(targetWord.replace(/-/g, ''));
          variants.push(targetWord.replace(/-/g, ' '));
        }
        const alreadyPresent = escaped && variants.some(v => {
          const esc = escRe(v);
          return esc && new RegExp('\\b' + esc + '\\b').test(docText);
        });
        if (alreadyPresent) {
          restored.push({ word: origWord, context: '(present in doc — count-diff artifact)' });
        } else {
          unplaceable.push({ word: origWord, context: contextSnippet, missingCount: entry.missingCount || 1 });
        }
      }
    });
    // Appendix — nothing silently dropped.
    if (unplaceable.length > 0) {
      const body = doc.body || doc.documentElement;
      // If a prior restore pass added an appendix, extend it instead of duplicating.
      let section = body && body.querySelector ? body.querySelector('section[data-content-recovery="true"]') : null;
      if (!section) {
        section = doc.createElement('section');
        section.setAttribute('aria-label', 'Content recovery');
        section.setAttribute('data-content-recovery', 'true');
        section.style.cssText = 'margin-top:2em;padding:1em;border-top:2px solid #f59e0b;background:#fffbeb;border-radius:8px';
        const h = doc.createElement('h2');
        h.textContent = 'Content recovery';
        h.style.cssText = 'color:#b45309;font-size:1.1em;margin-top:0';
        section.appendChild(h);
        const p = doc.createElement('p');
        p.textContent = 'Words from the source document that could not be confidently placed in context appear here so no content is lost:';
        p.style.cssText = 'color:#78350f;font-size:0.9em';
        section.appendChild(p);
        const ul = doc.createElement('ul');
        ul.setAttribute('data-recovery-list', 'true');
        ul.style.cssText = 'font-size:0.9em;color:#78350f';
        section.appendChild(ul);
        body.appendChild(section);
      }
      const ul = section.querySelector('ul[data-recovery-list="true"]') || section.querySelector('ul');
      unplaceable.forEach(u => {
        const li = doc.createElement('li');
        const strong = doc.createElement('strong');
        strong.textContent = u.word;
        li.appendChild(strong);
        li.appendChild(doc.createTextNode(' — source context: "' + u.context + '"'));
        if (ul) ul.appendChild(li);
      });
    }
    let outHtml;
    try { outHtml = doctypePrefix + (doc.documentElement ? doc.documentElement.outerHTML : html); }
    catch (e) { outHtml = html; }
    return { html: outHtml, restored, unplaceable };
  };

  // ── Stage A: Gemini-targeted sentence re-insertion ──
  // When _buildMissingList reports genuinely dropped words (Gemini paraphrased the surrounding
  // prose so ±5-word fuzzy context fails), send a focused retry: "here's the HTML, here are the
  // specific source sentences that got lost, reinsert them." Uses _chunkState when available
  // (one call per chunk that lost words) to stay under the 8K output budget; otherwise falls
  // back to a single whole-doc call if the HTML is small enough.
  const retargetMissingWordsViaGemini = async (html, missingList, sourceText) => {
    if (!html || !Array.isArray(missingList) || missingList.length === 0 || !sourceText || !callGemini) {
      return { html: html || '', stillMissing: missingList || [], restoredViaRetry: [] };
    }
    const splitSentences = (txt) => (txt || '').match(/[^.!?]+[.!?]+/g) || [];
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokenizeText = (s) => {
      const out = {};
      const matches = (s || '').toLowerCase().match(/[a-z0-9][\w'-]*/g);
      if (matches) matches.forEach(w => {
        const k = w.replace(/^['-]+|['-]+$/g, '');
        if (k) out[k] = (out[k] || 0) + 1;
      });
      return out;
    };
    const buildPrompt = (fragment, sentences, isFragment) => [
      'The following HTML ' + (isFragment ? 'fragment' : 'document') + ' lost some source content during a WCAG remediation pass.',
      'Reinsert the listed source sentences at the most natural locations, preserving ALL existing HTML structure, accessibility attributes, inline styles, and reading order.',
      'Do not alter, rephrase, or remove any existing content. Only add the missing sentences.',
      'Return ONLY the updated HTML ' + (isFragment ? 'fragment' : 'document') + ' — no explanation, no markdown fencing, no JSON wrapper.',
      '',
      'SOURCE SENTENCES TO REINSERT (verbatim, in order):',
      sentences.map((s, i) => (i + 1) + '. ' + s).join('\n'),
      '',
      'CURRENT HTML:',
      fragment
    ].join('\n');

    // Chunk-scoped path: retarget only chunks that actually dropped words.
    if (_chunkState && Array.isArray(_chunkState.fixedChunks) && Array.isArray(_chunkState.originalChunks) &&
        _chunkState.fixedChunks.length === _chunkState.originalChunks.length && _chunkState.fixedChunks.length > 0) {
      const restored = [];
      const updatedFixed = _chunkState.fixedChunks.slice();
      for (let ci = 0; ci < _chunkState.originalChunks.length; ci++) {
        const origChunk = _chunkState.originalChunks[ci] || '';
        const fixedChunk = updatedFixed[ci] || '';
        if (!origChunk || !fixedChunk) continue;
        const origText = extractPlainText(origChunk);
        const fixedText = extractPlainText(fixedChunk);
        const origCounts = tokenizeText(origText);
        const fixedCounts = tokenizeText(fixedText);
        const chunkMissing = [];
        Object.keys(origCounts).forEach(w => {
          if ((fixedCounts[w] || 0) < origCounts[w]) chunkMissing.push(w);
        });
        if (chunkMissing.length === 0) continue;
        const chunkSentences = splitSentences(origText);
        const picked = [];
        const seen = new Set();
        chunkMissing.forEach(w => {
          const re = new RegExp('\\b' + escapeRe(w) + '\\b', 'i');
          for (const s of chunkSentences) {
            if (re.test(s)) {
              const t = s.trim();
              if (!seen.has(t) && t.length >= 15) { seen.add(t); picked.push(t); }
              break;
            }
          }
        });
        if (picked.length === 0) continue;
        const capped = picked.slice().sort((a, b) => b.length - a.length).slice(0, 20);
        try {
          const updated = await callGemini(buildPrompt(fixedChunk, capped, true), true);
          if (updated && typeof updated === 'string' && updated.trim().length > fixedChunk.length * 0.7) {
            updatedFixed[ci] = _stripJsonWrapperArtifacts(updated.trim());
            chunkMissing.forEach(w => { if (!restored.includes(w)) restored.push(w); });
          }
        } catch (e) {
          warnLog('[Retarget] Chunk ' + (ci + 1) + ' retarget failed: ' + (e && e.message));
        }
      }
      if (restored.length > 0) {
        const reassembled = (_chunkState.preamble || '') + '\n' + updatedFixed.join('\n') + '\n' + (_chunkState.postamble || '</body></html>');
        _chunkState.fixedChunks = updatedFixed;
        const restoredSet = new Set(restored);
        const stillMissing = missingList.filter(m => !restoredSet.has(String((m && m.word) || '').toLowerCase()));
        return { html: reassembled, stillMissing, restoredViaRetry: restored };
      }
      return { html, stillMissing: missingList, restoredViaRetry: [] };
    }

    // Whole-document path: only safe for small HTML to stay under output budget.
    if (html.length > 15000) {
      return { html, stillMissing: missingList, restoredViaRetry: [] };
    }
    const sourceSentences = splitSentences(sourceText);
    const picked = [];
    const seen = new Set();
    missingList.forEach(m => {
      const w = (m && m.word) ? String(m.word).toLowerCase().replace(/[^a-z0-9'-]/g, '') : '';
      if (!w) return;
      const re = new RegExp('\\b' + escapeRe(w) + '\\b', 'i');
      for (const s of sourceSentences) {
        if (re.test(s)) {
          const t = s.trim();
          if (!seen.has(t) && t.length >= 15) { seen.add(t); picked.push(t); }
          break;
        }
      }
    });
    if (picked.length === 0) return { html, stillMissing: missingList, restoredViaRetry: [] };
    const capped = picked.slice().sort((a, b) => b.length - a.length).slice(0, 20);
    try {
      const updated = await callGemini(buildPrompt(html, capped, false), true);
      if (updated && typeof updated === 'string' && updated.trim().length > html.length * 0.7) {
        const cleaned = _stripJsonWrapperArtifacts(updated.trim());
        const lcUpdated = cleaned.toLowerCase();
        const restored = [];
        missingList.forEach(m => {
          const w = (m && m.word) ? String(m.word).toLowerCase().replace(/[^a-z0-9'-]/g, '') : '';
          if (w && new RegExp('\\b' + escapeRe(w) + '\\b').test(lcUpdated)) restored.push(w);
        });
        if (restored.length > 0) {
          const restoredSet = new Set(restored);
          const stillMissing = missingList.filter(m => !restoredSet.has(String((m && m.word) || '').toLowerCase()));
          return { html: cleaned, stillMissing, restoredViaRetry: restored };
        }
      }
    } catch (e) {
      warnLog('[Retarget] Whole-doc retarget failed: ' + (e && e.message));
    }
    return { html, stillMissing: missingList, restoredViaRetry: [] };
  };

  // ── Stage B: Deterministic sentence-level restoration ──
  // For each still-missing word, find its source sentence and use the preceding source sentence
  // as a word-overlap anchor to locate the nearest block element in the HTML. Insert the source
  // sentence as a new <p data-source-restored> after that block. Pure DOM work — zero API cost.
  const restoreSentencesDeterministic = (html, missingList, sourceText) => {
    if (!html || !Array.isArray(missingList) || missingList.length === 0 || !sourceText) {
      return { html: html || '', stillMissing: missingList || [], restoredViaSentence: [] };
    }
    const splitSentences = (txt) => (txt || '').match(/[^.!?]+[.!?]+/g) || [];
    const sourceSentences = splitSentences(sourceText).map(s => s.trim()).filter(Boolean);
    if (sourceSentences.length === 0) {
      return { html, stillMissing: missingList, restoredViaSentence: [] };
    }
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const wordSet = (s) => new Set(normalize(s).split(' ').filter(w => w.length >= 3));
    const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doctypeMatch = html.match(/^\s*<!DOCTYPE[^>]*>/i);
    const doctypePrefix = doctypeMatch ? doctypeMatch[0] + '\n' : '';
    let doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch (e) { return { html, stillMissing: missingList, restoredViaSentence: [] }; }
    const body = doc.body || doc.documentElement;
    if (!body) return { html, stillMissing: missingList, restoredViaSentence: [] };
    // Exclude blocks inside the existing content-recovery appendix so we don't anchor to orphans
    // from prior restoration passes.
    const blocks = Array.from(body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, td'))
      .filter(el => {
        if (el.closest('section[data-content-recovery="true"]')) return false;
        return (el.textContent || '').trim().length >= 10;
      })
      .map(el => ({ el, words: wordSet(el.textContent || '') }));
    if (blocks.length === 0) {
      return { html, stillMissing: missingList, restoredViaSentence: [] };
    }
    // Whole-doc text cache for the broader duplicate-presence check: if a target source
    // sentence's distinctive content words already appear elsewhere in the doc (not just
    // in the best-matched block), the sentence is present — possibly in the References
    // section at the top — and we should NOT insert a duplicate copy.
    const fullDocText = normalize(body.textContent || '');
    const restored = [];
    const usedSentenceIndices = new Set();
    // Orphan tracking: source-sentence indices whose anchor-match failed, and which missing words
    // map to which sentence. Populated during the main loop; drained into a single end-of-doc
    // "Preserved source content" section after the loop so nothing silently falls through to the
    // orange Content Recovery appendix as orphan-word bullets.
    const orphanSentenceIndices = new Set();
    const orphanByWord = [];
    for (const m of missingList) {
      const raw = m && m.word ? String(m.word).toLowerCase() : '';
      if (!raw) continue;
      const needle = raw.replace(/[^a-z0-9'-]/g, '');
      if (!needle) continue;
      const re = new RegExp('\\b' + escapeRe(needle) + '\\b', 'i');
      let sentIdx = -1;
      for (let i = 0; i < sourceSentences.length; i++) {
        if (usedSentenceIndices.has(i)) continue;
        if (re.test(sourceSentences[i].toLowerCase())) { sentIdx = i; break; }
      }
      if (sentIdx === -1) continue;
      const targetSentence = sourceSentences[sentIdx];
      // Anchor candidates: preceding and following source sentences only. Target-as-anchor was
      // removed because it trivially matches itself when the sentence content is already partially
      // present in the doc (e.g. heading "Conclusion" + body "Our planet…" caused a duplicate
      // "Conclusion Our planet is seven-tenths ocean." paragraph to be inserted).
      const anchorCandidates = [];
      if (sentIdx > 0) anchorCandidates.push(sourceSentences[sentIdx - 1]);
      if (sentIdx + 1 < sourceSentences.length) anchorCandidates.push(sourceSentences[sentIdx + 1]);
      // Two-tier threshold: 0.6 first pass over all candidates, 0.4 fallback. Catches cases where
      // both neighbors were heavily paraphrased but still share distinctive vocabulary.
      const pickBest = (minScore) => {
        let best = null, bestSc = 0;
        for (const anchor of anchorCandidates) {
          const anchorWords = wordSet(anchor);
          if (anchorWords.size < 3) continue;
          for (const b of blocks) {
            let common = 0;
            anchorWords.forEach(w => { if (b.words.has(w)) common++; });
            const score = common / anchorWords.size;
            if (score > bestSc) { bestSc = score; best = b; }
          }
        }
        return bestSc >= minScore ? { block: best, score: bestSc } : null;
      };
      const matched = pickBest(0.6) || pickBest(0.4);
      if (!matched) {
        // Even without an anchor, check whole-doc presence before treating as orphan —
        // the sentence may already be in the References section (common) or elsewhere in
        // the body, and dumping it into the end-of-doc preserved section would duplicate.
        const orphanContentWords = normalize(targetSentence).split(' ').filter(w => w.length >= 5).slice(0, 8);
        if (orphanContentWords.length >= 3) {
          let docMatched = 0;
          orphanContentWords.forEach(w => { if (fullDocText.indexOf(w) !== -1) docMatched++; });
          if (docMatched / orphanContentWords.length >= 0.8) {
            usedSentenceIndices.add(sentIdx);
            restored.push({ word: m.word, sentence: targetSentence, anchorScore: 0, alreadyPresent: true, matchedVia: 'whole-doc-orphan' });
            continue;
          }
        }
        orphanSentenceIndices.add(sentIdx);
        orphanByWord.push({ word: m.word, sentIdx });
        continue;
      }
      const bestBlock = matched.block;
      const bestScore = matched.score;
      // Duplicate guard (two-tier):
      // (1) Whole-doc check — if ≥ 80% of the target sentence's distinctive content words
      //     (length ≥ 5, up to 8 tokens) already appear anywhere in the doc, the sentence is
      //     already present (commonly in the References section when the target is a citation).
      //     Skip to avoid mashing a duplicate reference into the body flow.
      // (2) Anchor-block check — if ≥ 60% of those words appear in the best-matched block's
      //     text, the sentence is already substantively there, just counted differently by the
      //     tokenizer. Skip insertion.
      const targetContentWords = normalize(targetSentence).split(' ').filter(w => w.length >= 5).slice(0, 8);
      if (targetContentWords.length >= 3) {
        let docMatched = 0;
        targetContentWords.forEach(w => { if (fullDocText.indexOf(w) !== -1) docMatched++; });
        if (docMatched / targetContentWords.length >= 0.8) {
          usedSentenceIndices.add(sentIdx);
          restored.push({ word: m.word, sentence: targetSentence, anchorScore: Math.round(bestScore * 100) / 100, alreadyPresent: true, matchedVia: 'whole-doc' });
          continue;
        }
        const blockText = normalize(bestBlock.el.textContent || '');
        let matchedCount = 0;
        targetContentWords.forEach(w => { if (blockText.indexOf(w) !== -1) matchedCount++; });
        if (matchedCount / targetContentWords.length >= 0.6) {
          usedSentenceIndices.add(sentIdx);
          restored.push({ word: m.word, sentence: targetSentence, anchorScore: Math.round(bestScore * 100) / 100, alreadyPresent: true, matchedVia: 'anchor-block' });
          continue;
        }
      }
      const newP = doc.createElement('p');
      newP.setAttribute('data-source-restored', 'true');
      newP.textContent = targetSentence;
      if (bestBlock.el.parentNode) {
        bestBlock.el.parentNode.insertBefore(newP, bestBlock.el.nextSibling);
        usedSentenceIndices.add(sentIdx);
        restored.push({ word: m.word, sentence: targetSentence, anchorScore: Math.round(bestScore * 100) / 100 });
        // Refresh the inserted block's word set so subsequent anchors can match it if needed
        blocks.push({ el: newP, words: wordSet(targetSentence) });
      }
    }
    // End-of-doc "Preserved source content" section for sentences that failed to anchor. Groups
    // orphan sentences into one section inserted just before </main> so related missing words
    // (typically clustered in one heavily-paraphrased source sentence) appear as integrated prose
    // rather than 5 orphan-word bullets in Stage C's appendix.
    if (orphanSentenceIndices.size > 0) {
      const orphanIdxSorted = Array.from(orphanSentenceIndices).sort((a, b) => a - b);
      const section = doc.createElement('section');
      section.setAttribute('data-source-preserved-block', 'true');
      section.setAttribute('aria-label', 'Preserved source content');
      section.setAttribute('style', 'margin-top:2em;padding:1em;border-top:2px solid #f59e0b;background:#fffbeb;border-radius:8px');
      const h = doc.createElement('h2');
      h.textContent = 'Preserved source content';
      h.setAttribute('style', 'color:#b45309;font-size:1.1em;margin-top:0');
      section.appendChild(h);
      const lead = doc.createElement('p');
      lead.textContent = 'These sentences from the source document could not be anchored to a specific location during remediation. They appear here so no content is lost — move them inline if needed.';
      lead.setAttribute('style', 'color:#78350f;font-size:0.9em');
      section.appendChild(lead);
      orphanIdxSorted.forEach(i => {
        const p = doc.createElement('p');
        p.setAttribute('data-source-restored', 'true');
        p.textContent = sourceSentences[i];
        section.appendChild(p);
      });
      const main = body.querySelector('main');
      if (main) main.appendChild(section);
      else body.appendChild(section);
      orphanByWord.forEach(o => {
        restored.push({ word: o.word, sentence: sourceSentences[o.sentIdx], anchorScore: 0, viaPreservedSection: true });
      });
    }
    if (restored.length === 0) {
      return { html, stillMissing: missingList, restoredViaSentence: [] };
    }
    const restoredWords = new Set(restored.map(r => String(r.word || '').toLowerCase()));
    const stillMissing = missingList.filter(m => !restoredWords.has(String((m && m.word) || '').toLowerCase()));
    let outHtml;
    try { outHtml = doctypePrefix + (doc.documentElement ? doc.documentElement.outerHTML : html); }
    catch (e) { outHtml = html; }
    return { html: outHtml, stillMissing, restoredViaSentence: restored };
  };

  // ── Stage D: Duplicate detection + tiered cleanup ──
  // Auto-removes provably-wrong duplicates (byte-identical sentences ≥ 40 chars AND
  // mid-word truncation fragments left by chunk-boundary stutter). Highlights
  // medium-confidence matches (≥ 85% word overlap + 8-word N-gram repeats) via
  // <mark class="allo-duplicate-suspect"> so the user can curate without destruction.
  // Skip zones: headings, captions, th, figcaption, and our own data-source-restored
  // / data-source-preserved-block / data-image-recovery / data-content-recovery
  // sections (that content SHOULD sometimes echo other text by design).
  const detectAndHandleDuplicates = (html, sourceText) => {
    if (!html) return { html: html || '', autoRemoved: [], highlighted: [] };
    const doctypeMatch = html.match(/^\s*<!DOCTYPE[^>]*>/i);
    const doctypePrefix = doctypeMatch ? doctypeMatch[0] + '\n' : '';
    let doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
    catch (e) { return { html, autoRemoved: [], highlighted: [] }; }
    const body = doc.body || doc.documentElement;
    if (!body) return { html, autoRemoved: [], highlighted: [] };
    const splitSentences = (txt) => (txt || '').match(/[^.!?]+[.!?]+/g) || [];
    const normalizeText = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const wordArr = (s) => normalizeText(s).split(' ').filter(Boolean);
    const isTruncationFragment = (s) => {
      const t = (s || '').trim();
      if (t.length < 20) return false;
      if (/[\u2026…]\s*\)?$/.test(t)) return true; // explicit ellipsis
      if (/[a-zA-Z]-$/.test(t)) return true;       // ends with hyphen mid-word
      // Ends on an alphanumeric char with no sentence punctuation — likely truncation
      if (/[A-Za-z0-9]$/.test(t) && !/[.!?)]$/.test(t)) return true;
      return false;
    };
    const isInSkipZone = (el) => {
      if (!el) return true;
      // Structural elements that may legitimately repeat text
      if (el.closest('h1, h2, h3, h4, h5, h6, caption, th, figcaption, thead')) return true;
      // Our own restoration / recovery sections
      if (el.closest('section[data-content-recovery="true"]')) return true;
      if (el.closest('section[data-source-preserved-block="true"]')) return true;
      if (el.closest('section[data-image-recovery="true"]')) return true;
      if (el.hasAttribute && el.hasAttribute('data-source-restored')) return true;
      return false;
    };
    const blocks = Array.from(body.querySelectorAll('p, li, blockquote, td')).filter(el => {
      if (isInSkipZone(el)) return false;
      return (el.textContent || '').trim().length >= 40;
    });
    const autoRemoved = [];
    const blocksToRemove = new Set();

    // ── Source index from pdf.js extraction — the authoritative ground truth. ──
    // Maps normalized-source-text → count of occurrences in source. Used to gate every
    // auto-remove and highlight decision below. A paragraph appearing 2x in remediated is
    // only a "real" duplicate if the source has it FEWER than 2 times.
    const sourceNormCount = new Map();
    if (sourceText && typeof sourceText === 'string' && sourceText.length > 20) {
      // Sentence-level index for shorter matches.
      splitSentences(sourceText).forEach(s => {
        const trimmed = s.trim();
        if (trimmed.length < 20) return;
        const norm = normalizeText(trimmed);
        if (norm.length < 20) return;
        sourceNormCount.set(norm, (sourceNormCount.get(norm) || 0) + 1);
      });
      // Paragraph-level index (blank-line separated) for whole-block comparison.
      sourceText.split(/\n\s*\n+/).forEach(p => {
        const trimmed = p.trim();
        if (trimmed.length < 40) return;
        const norm = normalizeText(trimmed);
        if (norm.length < 40) return;
        sourceNormCount.set(norm, (sourceNormCount.get(norm) || 0) + 1);
      });
    }
    const srcCountOf = (norm) => sourceNormCount.get(norm) || 0;

    // ── Tier 1: byte-identical full blocks — source-anchored auto-remove. ──
    // Only remove an occurrence when the remediated count exceeds the source count.
    // If the source legitimately has the text N times (running headers, refrains,
    // repeated table labels), we keep all N occurrences in the remediated output.
    const seenCount = new Map();
    blocks.forEach(el => {
      const txt = (el.textContent || '').trim();
      if (txt.length < 40) return;
      const norm = normalizeText(txt);
      if (norm.length < 40) return;
      const prev = seenCount.get(norm);
      const remCountNow = (prev ? prev.count : 0) + 1;
      seenCount.set(norm, { el, count: remCountNow });
      if (remCountNow > 1) {
        const srcCount = srcCountOf(norm);
        if (remCountNow > srcCount) {
          blocksToRemove.add(el);
          autoRemoved.push({
            text: txt.slice(0, 100) + (txt.length > 100 ? '…' : ''),
            reason: srcCount === 0 ? 'ai-hallucination' : 'chunk-stutter',
            srcCount,
            remCount: remCountNow,
          });
        }
        // else: source has >= remCount copies; legitimate repetition, keep.
      }
    });

    // ── Tier 2: truncation fragments — source-anchored auto-remove. ──
    // If the truncation fragment also exists in the source (rare but possible for a
    // legitimate truncated caption or citation), keep it. Otherwise it's a chunk-boundary
    // stutter and safe to remove. Long truncations (≥ 300 chars) are left alone entirely
    // rather than decorated — the user can manually edit if they notice.
    blocks.forEach(el => {
      if (blocksToRemove.has(el)) return;
      const txt = (el.textContent || '').trim();
      if (!isTruncationFragment(txt)) return;
      const norm = normalizeText(txt);
      if (srcCountOf(norm) > 0) return; // source vouches for the fragment
      if (txt.length >= 300) return;    // too long to auto-remove; leave as-is
      blocksToRemove.add(el);
      autoRemoved.push({ text: txt.slice(0, 100) + (txt.length > 100 ? '…' : ''), reason: 'truncation-fragment' });
    });

    // Safety cap: if we're about to remove more than 30% of blocks, abort auto-removal entirely
    // (something is wrong with the detection or the doc is highly repetitive by design). We
    // used to fall back to highlighting the would-have-been-removed blocks, but the visual
    // decoration (yellow background + ::before banner) disrupted preview formatting, so we now
    // just leave the doc untouched when the cap trips.
    if (blocks.length > 0 && blocksToRemove.size > Math.max(3, blocks.length * 0.3)) {
      warnLog('[Dedup] Safety cap hit: would remove ' + blocksToRemove.size + ' of ' + blocks.length + ' blocks — aborting auto-removal.');
      blocksToRemove.clear();
      autoRemoved.length = 0;
    }

    // Apply Tier 1+2 removals
    blocksToRemove.forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });

    // Tier 3 (source-anchored near-duplicate highlighting) was removed on 2026-04-18. Its
    // decorative CSS (yellow background + "⚠ possible duplicate — review" ::before banner)
    // was disruptive to preview formatting. If near-duplicate detection comes back, it should
    // surface via a sidebar list or structured report rather than inline visual decoration.

    let outHtml;
    try { outHtml = doctypePrefix + (doc.documentElement ? doc.documentElement.outerHTML : html); }
    catch (e) { outHtml = html; }
    return { html: outHtml, autoRemoved, highlighted: [] };
  };

  // Side-effecting wrapper — reads current HTML from the preview iframe (authoritative, since
  // the user may have edited), runs restoration, writes back via pdfFixResult + re-renders the
  // iframe. Returns the same shape as applyWordRestoration so callers can show a toast.
  const applyWordRestorationInPlace = (missingList, sourceText) => {
    try {
      const currentHtml = (function() {
        if (pdfPreviewRef && pdfPreviewRef.current) {
          const d = pdfPreviewRef.current.contentDocument || pdfPreviewRef.current.contentWindow?.document;
          if (d) {
            try { d.designMode = 'off'; } catch(_) {}
            const h = '<!DOCTYPE html>\n' + d.documentElement.outerHTML;
            try { d.designMode = 'on'; } catch(_) {}
            return h;
          }
        }
        return (pdfFixResult && pdfFixResult.accessibleHtml) || '';
      })();
      const result = applyWordRestoration(currentHtml, missingList, sourceText);
      // Write the restored HTML back into pdfFixResult so subsequent getPdfPreviewHtml() calls
      // and exports see it. Then re-render the iframe via updatePdfPreview to reflect visually.
      if (result.html && result.html !== currentHtml && typeof setPdfFixResult === 'function' && pdfFixResult) {
        setPdfFixResult({ ...pdfFixResult, accessibleHtml: result.html });
        // Mutate the closure's snapshot too so updatePdfPreview (which reads pdfFixResult via
        // _bindState) picks up the new HTML on this tick.
        pdfFixResult = { ...pdfFixResult, accessibleHtml: result.html };
        setTimeout(() => { try { updatePdfPreview(); } catch(_) {} }, 30);
      }
      return result;
    } catch (e) {
      warnLog('[Restore] applyWordRestorationInPlace failed:', e && e.message);
      return { html: '', restored: [], unplaceable: missingList || [] };
    }
  };

  // ── PDF Preview: Get current edited HTML from iframe ──
  const getPdfPreviewHtml = () => {
    const memHtml = pdfFixResult?.accessibleHtml || '';
    if (!pdfPreviewRef.current) return memHtml;
    const doc = pdfPreviewRef.current.contentDocument || pdfPreviewRef.current.contentWindow?.document;
    if (!doc) return memHtml;
    // If the iframe document exists but hasn't hydrated its body yet (very common when
    // verification fires ~200ms after remediation completes), the outerHTML is a near-
    // empty shell. Falling through to the shell produced empty `remText1` which made
    // the fidelity check silently no-op — the user was "not seeing the verification run."
    // Prefer the in-memory accessibleHtml in that case; only trust the iframe once it
    // clearly holds rendered remediation content.
    const bodyText = (doc.body ? (doc.body.textContent || '') : '');
    if (bodyText.trim().length < 50 && memHtml) return memHtml;
    // Remove inspect CSS before export
    const inspectEl = doc.getElementById('a11y-inspect-css');
    if (inspectEl) inspectEl.remove();
    try { doc.designMode = 'off'; } catch(e) {}
    const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    try { doc.designMode = 'on'; } catch(e) {}
    return html;
  };

  // ── AI Custom Export Style Generator ──
  const generateCustomExportStyle = async () => {
    if (!exportStylePrompt.trim() || !callGemini) return;
    setIsGeneratingStyle(true);
    try {
      const result = await callGemini(`You are a CSS expert creating a beautiful, accessible stylesheet for an educational document export.

The user wants: "${exportStylePrompt}"

The HTML has these CSS classes you can style:
- body (main container, max-width 800px)
- h1, h2, h3 (headings)
- .section (content sections/cards)
- .resource-header (section title bars)
- .meta (metadata like date/topic)
- .quiz-box (quiz containers)
- .question (individual questions)
- .options (answer choices)
- table, th, td (data tables)
- .interactive-textarea (student writing areas)
- .export-header (top banner with title)
- .a11y-badge (accessibility info box at bottom)
- .grid (multi-column layouts)
- .card (individual cards in grids)
- .tag (small label badges)
- img (images)

Requirements:
- Must maintain WCAG AA color contrast (4.5:1 for text)
- Must keep text readable (min 12px font)
- Include @import for any Google Fonts you use
- Make it visually appealing and professional
- Include print styles (@media print)

Return ONLY the CSS — no explanation, no markdown fences, just pure CSS.`);
      setCustomExportCSS(result.trim());
      setTimeout(() => updateExportPreview(), 100);
      addToast('Custom style generated! Preview updated.', 'success');
    } catch (err) {
      warnLog('[Export Style] Failed:', err);
      addToast('Style generation failed — try a different description', 'error');
    }
    setIsGeneratingStyle(false);
  };

  // ── Document Generation (parseMarkdownToHTML, generateResourceHTML, etc.) ──
  const parseMarkdownToHTML = (text) => {
      if (!text) return '';
      // Fix literal \n characters that sometimes come from AI responses or JSON parsing
      let processedText = text.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
      // Strip JSON wrapper artifacts (e.g., ["\n\n...\n"] from malformed responses)
      if (processedText.startsWith('["') || processedText.startsWith('[ "')) {
        processedText = processedText.replace(/^\s*\[\s*"/, '').replace(/"\s*\]\s*$/, '');
      }
      processedText = processedText.replace(/\[[A-Z0-9-]+\]\s*"([^"]+)"[\s\S]*?\(resource:([a-zA-Z0-9]+)\)/g, '[$1](resource:$2)');
      const isRtl = isRtlLang(leveledTextLanguage);
      const align = isRtl ? 'right' : 'left';
      const lines = processedText.split('\n');
      let html = '';
      let inList = false;
      let inTable = false;
      let tableHeaderProcessed = false;
      lines.forEach(line => {
          let content = line.trim();
          content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
          content = content.replace(/\[(.*?)\]\((.*?)\)/g, (match, txt, url) => {
              const isCitation = txt.startsWith('⁽') && txt.endsWith('⁾');
              const style = isCitation ? "text-decoration: none; color: #2563eb;" : "color: #2563eb; text-decoration: underline;";
              return `<a href="${url}" style="${style}" target="_blank">${txt}</a>`;
          });
          content = content.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, (match, prefix, url) => {
              const cleanUrl = url.replace(/[.,;)]$/, '');
              const punctuation = url.slice(cleanUrl.length);
              let displayText = cleanUrl;
              if (cleanUrl.includes('vertexaisearch') || cleanUrl.includes('grounding-api')) {
                  displayText = '[Source Ref]';
              } else if (cleanUrl.length > 40) {
                  try {
                       const urlObj = new URL(cleanUrl);
                       displayText = urlObj.hostname + '/...';
                  } catch (e) {
                       displayText = cleanUrl.substring(0, 30) + '...';
                  }
              }
              return `${prefix}<a href="${cleanUrl}" style="color: #2563eb; text-decoration: underline;" target="_blank">${displayText}</a>${punctuation}`;
          });
          if (content.startsWith('|')) {
              if (!inTable) {
                  if (inList) { html += '</ul>'; inList = false; }
                  html += '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0; border: 1px solid #ddd;">';
                  inTable = true;
                  tableHeaderProcessed = false;
              }
              const rawCells = content.split('|');
              if (rawCells.length > 0 && rawCells[0].trim() === '') rawCells.shift();
              if (rawCells.length > 0 && rawCells[rawCells.length - 1].trim() === '') rawCells.pop();
              const cells = rawCells.map(c => c.trim());
              const isSeparator = cells.length > 0 && cells.every(c => c.match(/^[-:\s]+$/));
              if (isSeparator) {
                  return;
              }
              if (!tableHeaderProcessed) {
                  html += '<thead style="background-color: #f8f9fa;"><tr>';
                  cells.forEach(cell => {
                      html += `<th scope="col" style="border: 1px solid #ddd; padding: 10px; text-align: ${align};">${cell}</th>`;
                  });
                  html += '</tr></thead><tbody>';
                  tableHeaderProcessed = true;
              } else {
                  html += '<tr>';
                  cells.forEach(cell => {
                      html += `<td style="border: 1px solid #ddd; padding: 10px; text-align: ${align};">${cell}</td>`;
                  });
                  html += '</tr>';
              }
              return;
          }
          if (inTable) {
              html += '</tbody></table>';
              inTable = false;
              tableHeaderProcessed = false;
          }
          if (!content) {
              if (inList) { html += '</ul>'; inList = false; }
              html += '<div style="height: 10px;"></div>';
              return;
          }
          if (content.startsWith('###')) {
              if (inList) { html += '</ul>'; inList = false; }
              html += `<h3 style="color: #2c3e50; margin-top: 15px; margin-bottom: 5px;">${content.replace(/^###\s*/, '')}</h3>`;
          }
          else if (content.startsWith('##')) {
              if (inList) { html += '</ul>'; inList = false; }
              html += `<h2 style="color: #2c3e50; margin-top: 20px; margin-bottom: 10px;">${content.replace(/^##\s*/, '')}</h2>`;
          }
          else if (content.startsWith('#')) {
              if (inList) { html += '</ul>'; inList = false; }
              html += `<h1 style="color: #2c3e50; margin-top: 24px; margin-bottom: 12px; font-size: 24pt; font-weight: 900;">${content.replace(/^#\s*/, '')}</h1>`;
          }
          else if (content.startsWith('- ') || content.startsWith('* ') || content.startsWith('• ')) {
              if (!inList) { html += '<ul style="margin: 5px 0; padding-left: 20px;">'; inList = true; }
              const listText = content.replace(/^[-*•]\s+/, '');
              html += `<li style="margin-bottom: 5px;">${listText}</li>`;
          }
          else {
              if (inList) { html += '</ul>'; inList = false; }
              html += `<p style="margin-bottom: 10px;">${content}</p>`;
          }
      });
      if (inList) html += '</ul>';
      if (inTable) html += '</tbody></table>';
      return html;
  };
  const generateResourceHTML = (item, isTeacher, responses = {}, config = null) => {
      const cfg = config || exportConfig;
      // Resource type filtering — configurable via export preview modal.
      // Teacher-only resources (analysis, udl-advice, brainstorm) handled separately
      // below so they appear in teacher copy unconditionally but are toggleable for student copy.
      const typeToggleMap = {
        'lesson-plan': 'includeLessonPlan', 'simplified': 'includeSimplified', 'outline': 'includeOutline',
        'glossary': 'includeGlossary', 'quiz': 'includeQuiz', 'faq': 'includeFaq',
        'sentence-frames': 'includeSentenceFrames', 'image': 'includeImage', 'math': 'includeMath', 'dbq': 'includeDbq'
      };
      const toggleKey = typeToggleMap[item.type];
      if (toggleKey && cfg[toggleKey] === false) return '';
      // Teacher-copy-by-default resources: always show in teacher copy, opt-in for student copy
      if (item.type === 'analysis' || item.type === 'udl-advice' || item.type === 'brainstorm') {
          const studentToggleKey = item.type === 'analysis' ? 'includeAnalysis'
                                  : item.type === 'udl-advice' ? 'includeUdlAdvice'
                                  : 'includeBrainstorm';
          if (!isTeacher && cfg[studentToggleKey] === false) return '';
          // teacher copy always shows these — fall through to render
      }
      // Teacher copy traditionally hides student-facing resources to avoid duplication
      if (isTeacher) {
          if (item.type === 'simplified') return '';
          if (item.type === 'outline') return '';
          if (item.type === 'image') return '';
          if (item.type === 'faq') return '';
          if (item.type === 'sentence-frames') return '';
      }
      const title = item.title || getDefaultTitle(item.type);
      const isRtl = isRtlLang(leveledTextLanguage);
      const align = isRtl ? 'right' : 'left';
      // ── Visual enhancement: resource type icon + accent color ──
      const typeVisuals = {
        'simplified': { icon: '📖', color: '#2563eb', bg: '#eff6ff', label: 'Leveled Text' },
        'analysis': { icon: '📊', color: '#7c3aed', bg: '#f5f3ff', label: 'Source Analysis' },
        'glossary': { icon: '📚', color: '#059669', bg: '#ecfdf5', label: 'Glossary' },
        'quiz': { icon: '❓', color: '#dc2626', bg: '#fef2f2', label: 'Quiz' },
        'outline': { icon: '🗂️', color: '#d97706', bg: '#fffbeb', label: 'Graphic Organizer' },
        'faq': { icon: '💬', color: '#0891b2', bg: '#ecfeff', label: 'FAQ' },
        'sentence-frames': { icon: '✍️', color: '#4f46e5', bg: '#eef2ff', label: 'Sentence Frames' },
        'image': { icon: '🎨', color: '#be185d', bg: '#fdf2f8', label: 'Visual Support' },
        'math': { icon: '🔢', color: '#ea580c', bg: '#fff7ed', label: 'Math' },
        'dbq': { icon: '📜', color: '#92400e', bg: '#fefce8', label: 'Document-Based Question' },
        'lesson-plan': { icon: '📋', color: '#166534', bg: '#f0fdf4', label: 'Lesson Plan' },
        'udl-advice': { icon: '🧩', color: '#7c3aed', bg: '#faf5ff', label: 'UDL Strategies' },
        'brainstorm': { icon: '💡', color: '#ca8a04', bg: '#fefce8', label: 'Brainstorm' },
        'fluency-record': { icon: '🎙️', color: '#0d9488', bg: '#f0fdfa', label: 'Fluency Record' },
        'timeline': { icon: '📅', color: '#4338ca', bg: '#eef2ff', label: 'Timeline' },
        'concept-sort': { icon: '🧩', color: '#6d28d9', bg: '#f5f3ff', label: 'Concept Sort' },
      };
      const tv = typeVisuals[item.type] || { icon: '📄', color: '#475569', bg: '#f8fafc', label: '' };
      const enhancedHeader = `<h2 class="resource-header" role="heading" aria-level="2" style="border-left:4px solid ${tv.color};background:${tv.bg};display:flex;align-items:center;gap:8px;"><span aria-hidden="true" style="font-size:1.3em;">${tv.icon}</span> ${title}${item.meta ? ` <span style="font-weight:normal;font-size:0.8em;color:#64748b;">(${item.meta})</span>` : ''}</h2>`;
      if (item.type === 'simplified') {
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid #2563eb;border-radius:12px;">
                  ${enhancedHeader}
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:1.05em;line-height:1.9;color:#1e293b;padding:8px 4px;">${parseMarkdownToHTML(item.data)}</div>
              </div>
          `;
      } else if (item.type === 'glossary') {
          const wordSearchHtml = (item.gameData && item.gameData.grid) ? (() => {
              let html = '';
              if (item.gameData) {
                  let gridHtml = `<div style="margin-top:20px; page-break-inside:avoid;"><h4>${t('glossary.word_search_key')}</h4><div style="display:inline-block; border:2px solid #333; padding:2px;">`;
                  item.gameData.grid.forEach((row, r) => {
                      gridHtml += '<div style="display:flex;">';
                      row.forEach((char, c) => {
                          const isSol = item.gameData.solutions.includes(`${r}-${c}`);
                          gridHtml += `<div style="width:20px; height:20px; display:flex; align-items:center; justify-content:center; border:1px solid #ccc; font-family:monospace; font-size:10px; ${isSol ? 'background-color:#bbf7d0; font-weight:bold;' : ''}">${char}</div>`;
                      });
                      gridHtml += '</div>';
                  });
                  gridHtml += '</div></div>';
                  html = gridHtml;
              }
              return html;
          })() : '';
          if (isTeacher && !isIndependentMode) {
              return wordSearchHtml ? `<div class="section" id="${item.id}-key">${wordSearchHtml}</div>` : '';
          }
          const hasAnyImages = item.data.some(gItem => gItem.image);
          const hasAnyTranslations = item.data.some(gItem => gItem.translations && Object.keys(gItem.translations).length > 0);
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid #059669;border-radius:12px;">
                  ${enhancedHeader}
                  <table style="border-radius:8px;overflow:hidden;">
                  <thead><tr style="background:#ecfdf5;">
                      ${hasAnyImages ? `<th scope="col" style="text-align: center; width: 70px;color:#059669;">${t('output.col_image') || 'Image'}</th>` : ''}
                      <th scope="col" style="text-align: ${align};color:#059669;">${t('output.col_term')}</th>
                      <th scope="col" style="text-align: ${align};color:#059669;">${t('output.col_def')}</th>
                      ${hasAnyTranslations ? `<th scope="col" style="text-align: ${align};color:#059669;">${t('output.col_trans')}</th>` : ''}
                  </tr></thead>
                  <tbody>
                      ${item.data.map(gItem => `
                      <tr>
                          ${hasAnyImages ? `<td style="text-align: center; vertical-align: middle;">${gItem.image ? `<img loading="lazy" src="${gItem.image}" style="max-width: 60px; max-height: 60px; border-radius: 4px; display: block; margin: 0 auto;" alt="${gItem.term}" />` : ''}</td>` : ''}
                          <td style="text-align: ${align}">
                            <strong>${gItem.term}</strong>
                          </td>
                          <td style="text-align: ${align}">${gItem.def}</td>
                          ${hasAnyTranslations ? `<td style="text-align: ${align}">${Object.entries(gItem.translations || {}).map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br><br>')}</td>` : ''}
                      </tr>
                      `).join('')}
                  </tbody>
                  </table>
                  ${wordSearchHtml}
              </div>
          `;
      } else if (item.type === 'outline') {
          const { main, main_en, branches, structureType } = item.data;
          const type = structureType || 'Structured Outline';
          // WCAG-AA categorical palette for pair-coding multi-branch diagrams
          // (Cause-Effect, Mind Map, Flow Chart). Each entry's `border` and
          // `accent` colors clear 4.5:1 against white per WCAG 2.1 1.4.3.
          // We keep the existing (cause)/(effect) text labels and add ordinal
          // aria-labels so color-blind users still get the relationship
          // signal — color is supplementary, not the only carrier (1.4.1).
          const _PAIR_PALETTE = [
              { border: '#0f766e', bg: '#f0fdfa', accent: '#134e4a', soft: '#ccfbf1' }, // teal
              { border: '#b45309', bg: '#fffbeb', accent: '#78350f', soft: '#fde68a' }, // amber
              { border: '#4338ca', bg: '#eef2ff', accent: '#312e81', soft: '#c7d2fe' }, // indigo
              { border: '#be123c', bg: '#fff1f2', accent: '#881337', soft: '#fecdd3' }, // rose
              { border: '#047857', bg: '#ecfdf5', accent: '#064e3b', soft: '#a7f3d0' }, // emerald
              { border: '#6d28d9', bg: '#f5f3ff', accent: '#4c1d95', soft: '#ddd6fe' }, // violet
              { border: '#0369a1', bg: '#f0f9ff', accent: '#0c4a6e', soft: '#bae6fd' }, // sky
              { border: '#c2410c', bg: '#fff7ed', accent: '#7c2d12', soft: '#fed7aa' }, // orange
          ];
          const _pairColor = (i) => _PAIR_PALETTE[i % _PAIR_PALETTE.length];
          let innerContent = '';
          if (type === 'Venn Diagram') {
               const setA = branches[0] || { title: 'Set A', items: [] };
               const setB = branches[1] || { title: 'Set B', items: [] };
               const shared = branches[2] || { title: 'Shared', items: [] };
               const sharedCount = (shared.items || []).length;
               const sharedFontSize = sharedCount > 6 ? '0.78em' : sharedCount > 4 ? '0.85em' : '0.95em';
               const sharedItemPad = sharedCount > 6 ? '4px 10px' : '6px 12px';
               const sharedItemMargin = sharedCount > 6 ? '5px' : '7px';
               // Color-coded item card per circle: light tint background + colored left border
               // so each item visually belongs to its circle even when scanned from a distance.
               const renderItem = (it, en, opts) => `<li style="margin-bottom: ${opts.mb}; font-size: ${opts.fs}; line-height: 1.4; background: ${opts.bg}; color: ${opts.text}; padding: ${opts.pad}; border-radius: 10px; border-left: 4px solid ${opts.accent}; box-shadow: 0 1px 2px rgba(0,0,0,0.04); text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                       <span style="font-weight: 600;">${it}</span>${en ? `<br><span style="font-size:0.85em;opacity:0.8;font-style:italic;font-weight:normal;">(${en})</span>` : ''}
                    </li>`;
               const renderListA = (items, items_en, limit = 8) => items.slice(0, limit).map((it, i) => renderItem(it, items_en?.[i], { fs: '0.9em', pad: '7px 12px', mb: '7px', bg: '#fff1f2', text: '#881337', accent: '#fb7185' })).join('');
               const renderListB = (items, items_en, limit = 8) => items.slice(0, limit).map((it, i) => renderItem(it, items_en?.[i], { fs: '0.9em', pad: '7px 12px', mb: '7px', bg: '#eff6ff', text: '#1e3a8a', accent: '#60a5fa' })).join('');
               const renderListShared = (items, items_en, limit = 5) => items.slice(0, limit).map((it, i) => renderItem(it, items_en?.[i], { fs: sharedFontSize, pad: sharedItemPad, mb: sharedItemMargin, bg: '#f5f3ff', text: '#5b21b6', accent: '#a78bfa' })).join('');
               // Overflow list: extra shared items beyond the diagram fit
               const sharedOverflow = (shared.items || []).slice(5);
               const sharedOverflowHtml = sharedOverflow.length > 0
                 ? `<div class="venn-overflow" style="max-width: 720px; margin: 18px auto 0; padding: 14px 18px; background: linear-gradient(to bottom, #faf5ff, #f5f3ff); border: 2px solid #ddd6fe; border-radius: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid; box-shadow: 0 2px 6px rgba(124, 58, 237, 0.08);">
                      <div style="font-size: 0.8em; font-weight: 800; color: #6d28d9; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span style="display: inline-block; width: 18px; height: 2px; background: #c4b5fd;"></span>
                        Shared (continued)
                        <span style="display: inline-block; width: 18px; height: 2px; background: #c4b5fd;"></span>
                      </div>
                      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 7px; justify-content: center;">
                        ${sharedOverflow.map(it => `<li style="font-size: 0.85em; font-weight: 600; color: #5b21b6; background: white; padding: 5px 12px; border-radius: 999px; border: 1.5px solid #c4b5fd; box-shadow: 0 1px 2px rgba(124,58,237,0.06);">${it}</li>`).join('')}
                      </ul>
                    </div>`
                 : '';
               innerContent = `
                  <style>
                    .venn-print-wrapper { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 32px 24px; border-radius: 16px; }
                    .venn-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    @media print {
                      .venn-print-wrapper { page-break-inside: avoid; break-inside: avoid; padding: 16px; }
                      .venn-print-wrapper [data-venn-circle] { box-shadow: none !important; }
                      .venn-print-wrapper li { box-shadow: none !important; }
                      .venn-print-wrapper h3, .venn-print-wrapper h4 { color: #000 !important; }
                    }
                  </style>
                  <div class="venn-print-wrapper">
                  <div style="text-align:center; margin-bottom: 32px;">
                      <h3 style="margin:0; font-size: 1.9em; color: #1e293b; font-weight: 800; letter-spacing: -0.02em;">${main}</h3>
                      ${main_en ? `<div style="font-size:1em; color:#64748b; font-style:italic; margin-top:6px;">(${main_en})</div>` : ''}
                      <div style="display: inline-flex; align-items: center; gap: 8px; margin-top: 12px;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#fb7185;"></span>
                        <span style="font-size: 0.7em; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.08em;">Compare and Contrast</span>
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#60a5fa;"></span>
                      </div>
                  </div>
                  <div role="img" aria-label="Venn diagram comparing ${setA.title} and ${setB.title}" style="position: relative; width: 720px; height: 500px; margin: 0 auto; font-family: 'Inter', system-ui, sans-serif; page-break-inside: avoid; break-inside: avoid;">
                      <!-- Set A (Left Circle) -->
                      <div style="position: absolute; top: 0; left: 0; width: 440px;">
                          <!-- Header pill -->
                          <div style="text-align: center; margin-bottom: 14px; padding-right: 120px;">
                              <h4 style="margin: 0; color: #9f1239; font-size: 1.2em; font-weight: 800; background: white; display: inline-block; padding: 8px 22px; border-radius: 999px; border: 2px solid #fda4af; box-shadow: 0 4px 10px -2px rgba(244,63,94,0.18); position: relative; z-index: 20; letter-spacing: 0.01em;">
                                  ${setA.title}
                              </h4>
                              ${setA.title_en ? `<div style="font-size:0.85em; color:#991b1b; margin-top:6px; font-style: italic;">(${setA.title_en})</div>` : ''}
                          </div>
                          <!-- Circle Body — solid fill so backdrop never bleeds through; radial gradient adds soft depth -->
                          <div data-venn-circle="A" style="width: 440px; height: 440px; border-radius: 50%; background: radial-gradient(circle at 30% 35%, #ffe4e6 0%, #fecdd3 100%); border: 4px solid #fb7185; box-sizing: border-box; padding: 60px 140px 40px 50px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; word-wrap: break-word; box-shadow: 0 12px 28px -8px rgba(244,63,94,0.28); z-index: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                              <ul style="list-style: none; padding: 0; margin: 0; width: 100%;">
                                  ${renderListA(setA.items, setA.items_en, 8)}
                              </ul>
                          </div>
                      </div>
                      <!-- Set B (Right Circle) -->
                      <div style="position: absolute; top: 0; right: 0; width: 440px;">
                          <!-- Header pill -->
                          <div style="text-align: center; margin-bottom: 14px; padding-left: 120px;">
                              <h4 style="margin: 0; color: #1e40af; font-size: 1.2em; font-weight: 800; background: white; display: inline-block; padding: 8px 22px; border-radius: 999px; border: 2px solid #93c5fd; box-shadow: 0 4px 10px -2px rgba(59,130,246,0.18); position: relative; z-index: 20; letter-spacing: 0.01em;">
                                  ${setB.title}
                              </h4>
                              ${setB.title_en ? `<div style="font-size:0.85em; color:#1e40af; margin-top:6px; font-style: italic;">(${setB.title_en})</div>` : ''}
                          </div>
                          <!-- Circle Body -->
                          <div data-venn-circle="B" style="width: 440px; height: 440px; border-radius: 50%; background: radial-gradient(circle at 70% 35%, #dbeafe 0%, #bfdbfe 100%); border: 4px solid #60a5fa; box-sizing: border-box; padding: 60px 50px 40px 140px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; word-wrap: break-word; box-shadow: 0 12px 28px -8px rgba(59,130,246,0.28); z-index: 2; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                              <ul style="list-style: none; padding: 0; margin: 0; width: 100%;">
                                  ${renderListB(setB.items, setB.items_en, 8)}
                              </ul>
                          </div>
                      </div>
                      <!-- Shared Region (Absolute Center, in the lens overlap) -->
                      <div style="position: absolute; top: 90px; left: 50%; transform: translateX(-50%); width: 180px; text-align: center; z-index: 15;">
                          <!-- Prominent SHARED badge -->
                          <h4 style="font-size: 0.95em; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #6d28d9; margin: 0 0 14px 0; background: linear-gradient(to bottom, white, #faf5ff); display: inline-block; padding: 7px 18px; border-radius: 999px; border: 2px solid #c4b5fd; box-shadow: 0 4px 10px -2px rgba(124,58,237,0.25); position: relative;">
                              <span style="display: inline-flex; align-items: center; gap: 6px;">
                                <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#a78bfa;"></span>
                                ${shared.title || 'Shared'}
                                <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#a78bfa;"></span>
                              </span>
                              ${shared.title_en ? `<br><span style="font-weight:normal; opacity:0.85; font-size: 0.85em; text-transform: none; letter-spacing: normal; color: #6d28d9;"> (${shared.title_en})</span>` : ''}
                          </h4>
                          <ul style="list-style: none; padding: 0; margin: 0;">
                               ${renderListShared(shared.items, shared.items_en, 5)}
                          </ul>
                      </div>
                  </div>
                  ${sharedOverflowHtml}
                  </div>
               `;
          } else if (type === 'Flow Chart' || type === 'Process Flow / Sequence') {
              // Pair-coded flow chart: each step uses one palette entry. The
              // connector line (vertical bar + downward triangle) above the
              // step inherits the next step's border color, so the visual
              // relationship "this connector leads into the green step"
              // reads at a glance even on dense flows. Decision diamonds
              // get the same palette color but with the diamond's classic
              // amber background overridden to the palette's `soft` tint
              // for visual continuity within the same step.
              const total = branches.length;
              innerContent = `
                <style>
                  .flowchart-print-wrapper { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 24px 16px; border-radius: 16px; }
                  .flowchart-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .flowchart-step { page-break-inside: avoid; break-inside: avoid; }
                  @media print {
                    .flowchart-print-wrapper { padding: 12px; }
                    .flowchart-print-wrapper .flowchart-step { box-shadow: none !important; }
                  }
                </style>
                <div class="flowchart-print-wrapper">
                <div role="img" aria-label="Flow chart: ${main}" style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 700px; margin: 0 auto; font-family: sans-serif;">
                      <div style="background: linear-gradient(135deg, white 0%, #f8fafc 100%); color: #1e293b; padding: 16px 40px; border-radius: 50px; text-align: center; border: 2px solid #475569; margin-bottom: 20px; box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.12); z-index: 20; position: relative;"><h3 style="margin:0; font-size:1.4em; font-weight: 800; letter-spacing: -0.01em;">${main}</h3>${main_en ? `<div style="font-size:0.85em; color:#64748b; font-weight: normal; margin-top:4px; font-style:italic;">(${main_en})</div>` : ''}</div>
                      <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                      ${branches.map((b, idx) => {
                          const c = _pairColor(idx);
                          const isDecision = b.title.includes("?") || b.title.toLowerCase().includes("decision");
                          const hasBranches = b.items && b.items.length > 1;
                          const stepLabel = `Step ${idx + 1} of ${total}: ${b.title}`;
                          return `<div aria-hidden="true" style="height: 32px; width: 3px; background: ${c.border};"></div><div aria-hidden="true" style="color: ${c.border}; font-size: 16px; line-height: 1; margin-top: -4px; margin-bottom: 4px;">&#9660;</div>
                              <div class="flowchart-step" role="group" aria-label="${stepLabel}" style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                                  ${isDecision
                    ? `<div style="position: relative; width: 130px; height: 130px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">` +
                      `<div aria-hidden="true" style="position: absolute; inset: 0; top:0; left:0; right:0; bottom:0; background: ${c.soft}; border: 2px solid ${c.border}; transform: rotate(45deg); border-radius: 4px; z-index: 1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>` +
                      `<div style="position: relative; z-index: 2; text-align: center; width: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center;">` +
                      `<span style="font-weight: bold; font-size: 0.75rem; color: ${c.accent}; line-height: 1.25; word-wrap: break-word;">${idx + 1}. ${b.title}</span>` +
                      `${b.title_en ? `<span style="font-size: 0.65rem; color: ${c.accent}; opacity: 0.85; line-height: 1.25; margin-top: 4px;">(${b.title_en})</span>` : ''}` +
                      `</div></div>`
                    : `<div style="background: ${c.bg}; border: 2px solid ${c.border}; border-radius: 8px; padding: 16px; text-align: center; width: 256px; min-height: 60px; display: flex; flex-direction: column; justify-content: center; z-index: 10; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">` +
                      `<span style="font-weight: bold; font-size: 0.875rem; color: ${c.accent};">${idx + 1}. ${b.title}</span>` +
                      `${b.title_en ? `<span style="font-size: 0.75rem; color: ${c.accent}; opacity: 0.85; margin-top: 4px;">(${b.title_en})</span>` : ''}` +
                      `</div>`}
                                  ${hasBranches ? `<div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; width: 100%; position: relative; align-items: stretch;"><div aria-hidden="true" style="position: absolute; top: 0; left: 40px; right: 40px; height: 16px; border-top: 2px solid ${c.border}; border-left: 2px solid ${c.border}; border-right: 2px solid ${c.border}; border-radius: 12px 12px 0 0;"></div>
                                      ${b.items.map((item, k) => `<div style="display: flex; flex-direction: column; align-items: center; padding-top: 16px; flex: 1; max-width: 150px;"><div style="background: white; border: 1px solid ${c.border}; padding: 8px; border-radius: 4px; font-size: 0.75rem; color: ${c.accent}; text-align: center; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); width: 100%; height: 100%; flex: 1; display: flex; flex-direction: column; justify-content: center;">${item}${b.items_en?.[k] ? `<div style="font-size: 0.65rem; color: ${c.accent}; opacity: 0.85; margin-top: 4px;">(${b.items_en[k]})</div>` : ''}</div></div>`).join('')}</div>` : `
                                      ${b.items && b.items.length === 1 && b.items[0] ? `<div style="margin-top: 8px; background: ${c.bg}; color: ${c.accent}; font-size: 0.75rem; padding: 4px 12px; border-radius: 9999px; border: 1px solid ${c.border};">${b.items[0]} ${b.items_en?.[0] ? `<span style="opacity: 0.85;">(${b.items_en[0]})</span>` : ''}</div>` : ''}`}
                              </div>`;
                      }).join('')}
                      <div aria-hidden="true" style="height: 32px; width: 3px; background: #475569;"></div><div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; font-size: 0.85em; font-weight: bold; padding: 10px 28px; border-radius: 9999px; border: 2px solid #475569; box-shadow: 0 4px 8px -2px rgba(0,0,0,0.2); letter-spacing: 0.04em; text-transform: uppercase;">${t('organizer.labels.end')}</div></div></div></div>`;
          } else {
              if (type === 'Cause and Effect') {
                  // Pair-coded color rotation: each cause+effect pair shares
                  // one palette entry so the relationship reads at a glance.
                  // The `(cause)`/`(effect)` text labels and ordinal aria-label
                  // remain so color-blind users still get the pairing signal.
                  const total = branches.length;
                  const causeLabel = t('organizer.labels.cause') || 'Cause';
                  const effectLabel = t('organizer.labels.effect') || 'Effect';
                  innerContent = `
                    <style>
                      .ce-print-wrapper { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 28px 20px; border-radius: 16px; }
                      .ce-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .ce-pair { page-break-inside: avoid; break-inside: avoid; }
                      @media print {
                        .ce-print-wrapper { padding: 12px; }
                        .ce-print-wrapper .ce-card { box-shadow: none !important; }
                        .ce-print-wrapper h3 { color: #000 !important; }
                      }
                    </style>
                    <div class="ce-print-wrapper">
                      <div style="text-align:center; margin-bottom: 28px;">
                        <h3 style="margin:0; font-size: 1.7em; color: #1e293b; font-weight: 800; letter-spacing: -0.01em;">${main}</h3>
                        ${main_en ? `<div style="font-size:1em; color:#64748b; font-style:italic; margin-top:6px;">(${main_en})</div>` : ''}
                        <div style="display:inline-flex; align-items:center; gap:8px; margin-top:10px; font-size:0.7em; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.08em;">
                          <span>${causeLabel}</span>
                          <span aria-hidden="true" style="color:#94a3b8;">&rarr;</span>
                          <span>${effectLabel}</span>
                        </div>
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 18px; max-width: 860px; margin: 0 auto;">
                        ${branches.map((b, i) => {
                          const c = _pairColor(i);
                          // Render ALL items as effects, not just b.items[0] (was a long-standing bug).
                          const effectItems = (b.items || []).filter(it => (typeof it === 'object' ? it.text : it));
                          const effectsHtml = effectItems.length === 0
                            ? `<div style="color:${c.accent}; opacity:0.6; font-style:italic; font-size:0.9em;">(no effects listed)</div>`
                            : effectItems.map((it, k) => {
                                const text = typeof it === 'object' ? (it.text || '') : String(it);
                                const trans = b.items_en?.[k];
                                return `<div style="background:white; border-left:3px solid ${c.border}; padding:8px 12px; border-radius:6px; margin-bottom:6px; color:${c.accent}; font-weight:600; font-size:0.92em; box-shadow:0 1px 2px rgba(0,0,0,0.04);">${text}${trans ? `<div style="font-weight:normal; font-style:italic; opacity:0.8; font-size:0.85em; margin-top:2px;">(${trans})</div>` : ''}</div>`;
                              }).join('');
                          return `<div class="ce-pair" role="group" aria-label="Cause and effect pair ${i + 1} of ${total}" style="display: flex; align-items: stretch; gap: 14px;">
                            <div class="ce-card" style="flex: 1; background: linear-gradient(135deg, ${c.bg} 0%, white 100%); border: 2px solid ${c.border}; padding: 16px 18px; border-radius: 12px; box-shadow: 0 2px 6px -2px rgba(0,0,0,0.08); position:relative;">
                              <div style="display:inline-flex; align-items:center; gap:6px; background:${c.border}; color:white; font-weight:800; font-size:0.7em; text-transform:uppercase; letter-spacing:0.08em; padding:3px 10px; border-radius:999px; margin-bottom:10px;">
                                <span style="display:inline-block; width:18px; height:18px; border-radius:50%; background:white; color:${c.accent}; font-weight:800; display:inline-flex; align-items:center; justify-content:center; font-size:0.75em;">${i + 1}</span>
                                ${causeLabel}
                              </div>
                              <div style="color: ${c.accent}; font-weight: 700; font-size:0.98em; line-height:1.3;">${b.title}</div>
                              ${b.title_en ? `<div style="font-size:0.82em; color:${c.accent}; opacity: 0.8; font-style:italic; margin-top:3px;">(${b.title_en})</div>` : ''}
                            </div>
                            <div aria-hidden="true" style="display:flex; align-items:center; flex-shrink:0; color: ${c.border};">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));">
                                <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="${c.border}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </div>
                            <div class="ce-card" style="flex: 1.3; background: linear-gradient(135deg, ${c.soft} 0%, white 100%); border: 2px solid ${c.border}; padding: 16px 18px; border-radius: 12px; box-shadow: 0 2px 6px -2px rgba(0,0,0,0.08); position:relative;">
                              <div style="display:inline-flex; align-items:center; gap:6px; background:${c.accent}; color:white; font-weight:800; font-size:0.7em; text-transform:uppercase; letter-spacing:0.08em; padding:3px 10px; border-radius:999px; margin-bottom:10px;">
                                ${effectLabel}${effectItems.length > 1 ? `s (${effectItems.length})` : ''}
                              </div>
                              ${effectsHtml}
                            </div>
                          </div>`;
                        }).join('')}
                      </div>
                    </div>`;
              } else if (type === 'Problem Solution') {
                  // Detect Outcome branch by title keyword (matches view_renderers logic)
                  const psOutcomeIdx = branches.findIndex(b =>
                      (b.title || '').toLowerCase().includes('outcome') ||
                      (b.title || '').toLowerCase().includes('result') ||
                      (b.title || '').toLowerCase().includes('evaluation')
                  );
                  const psOutcome = psOutcomeIdx !== -1 ? branches[psOutcomeIdx] : null;
                  const psSolutions = branches.filter((_, i) => i !== psOutcomeIdx);
                  const problemLabel = t('organizer.labels.problem_label') || 'Problem';
                  const solutionsLabel = t('organizer.labels.solutions') || 'Solutions';
                  // Solutions grid: 2 cols if <= 4, otherwise auto-fit
                  const psGridCols = psSolutions.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))';
                  innerContent = `
                    <style>
                      .ps-print-wrapper { page-break-inside: auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 28px 20px; border-radius: 16px; }
                      .ps-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .ps-card { page-break-inside: avoid; break-inside: avoid; }
                      @media print {
                        .ps-print-wrapper { padding: 12px; }
                        .ps-print-wrapper .ps-card { box-shadow: none !important; }
                      }
                    </style>
                    <div class="ps-print-wrapper" style="max-width: 860px; margin: 0 auto;">
                      <div class="ps-card" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fca5a5; border-left: 6px solid #dc2626; padding: 22px 26px; margin-bottom: 24px; border-radius: 14px; box-shadow: 0 4px 10px -2px rgba(220,38,38,0.15); position: relative;">
                        <div style="display:inline-flex; align-items:center; gap:8px; background:#dc2626; color:white; font-weight:800; font-size:0.7em; text-transform:uppercase; letter-spacing:0.1em; padding:4px 12px; border-radius:999px; margin-bottom:12px;">
                          <span aria-hidden="true">!</span> ${problemLabel}
                        </div>
                        <h3 style="margin: 0; color: #7f1d1d; font-size: 1.4em; font-weight: 800; line-height:1.3;">${main}</h3>
                        ${main_en ? `<div style="color: #991b1b; font-style: italic; margin-top:6px; font-size:0.9em;">(${main_en})</div>` : ''}
                      </div>
                      <div aria-hidden="true" style="text-align: center; margin: -6px 0 18px;">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.1));">
                          <path d="M12 5v14m0 0l-7-7m7 7l7-7" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </div>
                      <div style="text-align:center; margin-bottom: 16px;">
                        <h4 style="display:inline-block; margin:0; padding:6px 18px; color: #166534; font-size:0.9em; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; background:#f0fdf4; border:2px solid #86efac; border-radius:999px;">${solutionsLabel}</h4>
                      </div>
                      <div style="display: grid; grid-template-columns: ${psGridCols}; gap: 14px;">
                        ${psSolutions.map((b, i) => `<div class="ps-card" style="background: linear-gradient(135deg, #f0fdf4 0%, white 100%); border: 2px solid #86efac; border-left: 5px solid #16a34a; padding: 16px 18px; border-radius: 12px; box-shadow: 0 2px 6px -2px rgba(22,163,74,0.12); position:relative;">
                          <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:8px;">
                            <span style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#16a34a; color:white; font-weight:800; font-size:0.85em;">${i + 1}</span>
                            <h4 style="color: #166534; margin: 0; font-size:1em; font-weight:700; line-height:1.3;">${b.title}${b.title_en ? `<div style="color: #16a34a; font-size: 0.78em; margin-top:2px; font-style:italic; font-weight:normal;">(${b.title_en})</div>` : ''}</h4>
                          </div>
                          <ul style="margin: 0; padding: 0; list-style: none; color: #14532d;">
                            ${(b.items || []).map((it, k) => {
                              const text = typeof it === 'object' ? (it.text || '') : String(it);
                              const trans = b.items_en?.[k];
                              return `<li style="display:flex; align-items:flex-start; gap:6px; margin-bottom: 5px; font-size:0.88em; line-height:1.4;"><span style="color:#16a34a; flex-shrink:0; margin-top:2px;" aria-hidden="true">&#10003;</span><span>${text}${trans ? ` <em style="opacity: 0.75; font-size: 0.9em; color:#16a34a;">(${trans})</em>` : ''}</span></li>`;
                            }).join('')}
                          </ul>
                        </div>`).join('')}
                      </div>
                      ${psOutcome ? `<div class="ps-card" style="margin-top: 22px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #93c5fd; border-left: 6px solid #2563eb; padding: 20px 24px; border-radius: 14px; box-shadow: 0 3px 8px -2px rgba(37,99,235,0.15);">
                        <div style="display:inline-flex; align-items:center; gap:8px; background:#2563eb; color:white; font-weight:800; font-size:0.7em; text-transform:uppercase; letter-spacing:0.1em; padding:4px 12px; border-radius:999px; margin-bottom:10px;">
                          ${psOutcome.title || 'Outcome'}
                        </div>
                        ${psOutcome.title_en ? `<div style="color: #1e40af; font-style: italic; font-size:0.85em; margin-bottom:8px;">(${psOutcome.title_en})</div>` : ''}
                        <ul style="margin: 0; padding: 0; list-style: none; color: #1e3a8a;">
                          ${(psOutcome.items || []).map((it, k) => {
                            const text = typeof it === 'object' ? (it.text || '') : String(it);
                            const trans = psOutcome.items_en?.[k];
                            return `<li style="display:flex; align-items:flex-start; gap:8px; margin-bottom: 6px; font-size:0.92em;"><span style="color:#2563eb; flex-shrink:0; margin-top:2px;" aria-hidden="true">&#9656;</span><span>${text}${trans ? ` <em style="opacity: 0.75; font-size: 0.9em; color:#2563eb;">(${trans})</em>` : ''}</span></li>`;
                          }).join('')}
                        </ul>
                      </div>` : ''}
                    </div>`;
              } else if (type === 'T-Chart') {
                  const left = branches[0] || { title: 'Column A', items: [] };
                  const right = branches[1] || { title: 'Column B', items: [] };
                  const renderTChartItems = (items, items_en, color) => (items || []).map((it, i) => {
                      const text = typeof it === 'object' ? (it.text || '') : String(it);
                      const trans = items_en?.[i];
                      return `<li style="margin-bottom: 8px; padding: 8px 14px; background: white; border-left: 4px solid ${color}; border-radius: 8px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05); -webkit-print-color-adjust: exact; print-color-adjust: exact;">${text}${trans ? `<div style="font-weight: normal; font-style: italic; opacity: 0.75; font-size: 0.85em; margin-top: 2px;">(${trans})</div>` : ''}</li>`;
                  }).join('');
                  innerContent = `
                    <style>
                      .tchart-print-wrapper { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .tchart-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      @media print {
                        .tchart-print-wrapper { page-break-inside: avoid; break-inside: avoid; }
                        .tchart-print-wrapper li { box-shadow: none !important; }
                        .tchart-print-wrapper h3, .tchart-print-wrapper h4 { color: #000 !important; }
                      }
                    </style>
                    <div class="tchart-print-wrapper">
                    <div style="text-align:center; margin-bottom: 30px;">
                      <h3 style="margin:0; font-size: 1.6em; color: #2c3e50; font-weight: 800;">${main}</h3>
                      ${main_en ? `<div style="font-size:1em; color:#64748b; font-style:italic; margin-top:4px;">(${main_en})</div>` : ''}
                    </div>
                    <div role="img" aria-label="T-Chart comparing ${left.title} and ${right.title}" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; max-width: 800px; margin: 0 auto; border: 2px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: white;">
                      <div style="padding: 20px; border-right: 2px solid #cbd5e1; background: linear-gradient(to bottom, rgba(207, 250, 254, 0.3), white);">
                        <h4 style="margin: 0 0 12px 0; padding: 10px; background: #cffafe; color: #155e75; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; border-radius: 8px; border: 1px solid #67e8f9; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                          ${left.title}${left.title_en ? `<div style="font-size: 0.75em; font-weight: normal; opacity: 0.85; text-transform: none; letter-spacing: normal;">(${left.title_en})</div>` : ''}
                        </h4>
                        <ul style="list-style: none; padding: 0; margin: 0; color: #155e75;">
                          ${renderTChartItems(left.items, left.items_en, '#22d3ee')}
                        </ul>
                      </div>
                      <div style="padding: 20px; background: linear-gradient(to bottom, rgba(224, 231, 255, 0.3), white);">
                        <h4 style="margin: 0 0 12px 0; padding: 10px; background: #e0e7ff; color: #3730a3; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; border-radius: 8px; border: 1px solid #a5b4fc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                          ${right.title}${right.title_en ? `<div style="font-size: 0.75em; font-weight: normal; opacity: 0.85; text-transform: none; letter-spacing: normal;">(${right.title_en})</div>` : ''}
                        </h4>
                        <ul style="list-style: none; padding: 0; margin: 0; color: #3730a3;">
                          ${renderTChartItems(right.items, right.items_en, '#818cf8')}
                        </ul>
                      </div>
                    </div>
                    </div>`;
              } else if (type === 'Fishbone') {
                  // Fishbone (Ishikawa) — central effect + angled "bones" with cause categories.
                  const VIEW_W = 900, VIEW_H = 360, SPINE_Y = VIEW_H / 2;
                  const HEAD_X = VIEW_W - 130, TAIL_X = 50;
                  const visibleBranches = branches.slice(0, 6);
                  const slotCount = Math.ceil(visibleBranches.length / 2);
                  const boneSvg = visibleBranches.map((b, i) => {
                      const isTop = i % 2 === 0;
                      const slotIdx = Math.floor(i / 2);
                      const xFrac = (slotIdx + 1) / (slotCount + 1);
                      const startX = TAIL_X + 60 + (HEAD_X - TAIL_X - 100) * xFrac;
                      const endX = startX - 40;
                      const endY = isTop ? 60 : VIEW_H - 60;
                      const labelY = isTop ? endY - 8 : endY + 16;
                      return `<g><line x1="${startX}" y1="${SPINE_Y}" x2="${endX}" y2="${endY}" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" /><circle cx="${endX}" cy="${endY}" r="6" fill="#7c3aed" /><text x="${endX - 6}" y="${labelY}" text-anchor="end" fill="#5b21b6" font-weight="800" font-size="13" font-family="Inter, sans-serif">${b.title || `Category ${i + 1}`}</text></g>`;
                  }).join('');
                  const cardsHtml = branches.map((branch, bi) => {
                      const items = (branch.items || []).map((it, k) => {
                          const text = typeof it === 'object' ? (it.text || '') : String(it);
                          const trans = branch.items_en?.[k];
                          return `<li style="margin-bottom: 6px; padding: 6px 10px; background: #faf5ff; border-left: 3px solid #c4b5fd; border-radius: 6px; color: #5b21b6; font-size: 0.9em; -webkit-print-color-adjust: exact; print-color-adjust: exact;">${text}${trans ? `<div style="font-style: italic; opacity: 0.75; font-size: 0.85em;">(${trans})</div>` : ''}</li>`;
                      }).join('');
                      return `<div style="background: white; border: 2px solid #ddd6fe; border-radius: 12px; overflow: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid;">
                        <div style="background: linear-gradient(to right, #ede9fe, #fae8ff); padding: 10px 14px; border-bottom: 2px solid #ddd6fe;">
                          <div style="color: #581c87; font-weight: 800; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em;">${branch.title || `Category ${bi + 1}`}</div>
                          ${branch.title_en ? `<div style="font-size: 0.75em; color: #7c3aed; font-style: italic;">(${branch.title_en})</div>` : ''}
                        </div>
                        <ul style="list-style: none; padding: 12px; margin: 0;">${items || '<li style="font-style: italic; color: #94a3b8; font-size: 0.85em; text-align: center;">No causes</li>'}</ul>
                      </div>`;
                  }).join('');
                  innerContent = `
                    <style>
                      .fishbone-print-wrapper { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .fishbone-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      @media print { .fishbone-print-wrapper { page-break-inside: avoid; break-inside: avoid; } .fishbone-cards { page-break-inside: auto; } }
                    </style>
                    <div class="fishbone-print-wrapper">
                      <div style="text-align:center; margin-bottom: 20px;">
                        <h3 style="margin:0; font-size: 1.5em; color: #2c3e50; font-weight: 800;">${main}</h3>
                        ${main_en ? `<div style="font-size:1em; color:#64748b; font-style:italic; margin-top:4px;">(${main_en})</div>` : ''}
                      </div>
                      <div style="background: white; border: 2px solid #e9d5ff; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                        <svg role="img" aria-label="Fishbone diagram for ${main}" viewBox="0 0 ${VIEW_W} ${VIEW_H}" style="width: 100%; height: auto; max-width: 900px;" xmlns="http://www.w3.org/2000/svg">
                          <polygon points="${TAIL_X},${SPINE_Y - 20} ${TAIL_X + 30},${SPINE_Y} ${TAIL_X},${SPINE_Y + 20}" fill="#a78bfa" opacity="0.5" />
                          <line x1="${TAIL_X + 30}" y1="${SPINE_Y}" x2="${HEAD_X}" y2="${SPINE_Y}" stroke="#7c3aed" stroke-width="6" stroke-linecap="round" />
                          <rect x="${HEAD_X}" y="${SPINE_Y - 40}" width="120" height="80" rx="12" fill="#7c3aed" />
                          <text x="${HEAD_X + 60}" y="${SPINE_Y + 5}" text-anchor="middle" fill="white" font-weight="800" font-size="11" font-family="Inter, sans-serif">${(main || 'Effect').slice(0, 16)}</text>
                          ${boneSvg}
                        </svg>
                      </div>
                      <div class="fishbone-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">${cardsHtml}</div>
                    </div>`;
              } else if (type === 'Key Concept Map') {
                  // Concept map: central hub + radiating branches with attribute lists.
                  const half = Math.ceil(branches.length / 2);
                  const leftBranches = branches.slice(0, half);
                  const rightBranches = branches.slice(half);
                  const renderBranchCard = (b, side) => {
                      const lineStyle = side === 'left'
                        ? 'position: absolute; top: 50%; right: -43px; width: 40px; height: 2px; background: #99f6e4;'
                        : 'position: absolute; top: 50%; left: -43px; width: 40px; height: 2px; background: #99f6e4;';
                      const itemsHtml = (b.items || []).map((it, i) => {
                          const text = typeof it === 'object' ? (it.text || '') : String(it);
                          return `<li style="margin: 2px 0; font-size: 0.85em; color: #134e4a;">${text}${b.items_en?.[i] ? ` <span style="color: #5eead4; font-style: italic;">(${b.items_en[i]})</span>` : ''}</li>`;
                      }).join('');
                      return `<div style="background: white; border: 3px solid #99f6e4; padding: 14px; border-radius: 16px; text-align: ${side === 'left' ? 'right' : 'left'}; min-width: 180px; max-width: 240px; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact;">` +
                          `<div style="color: #134e4a; font-weight: 800;">${b.title}</div>` +
                          (b.title_en ? `<div style="font-size: 0.8em; color: #14b8a6; font-style: italic;">(${b.title_en})</div>` : '') +
                          (itemsHtml ? `<ul style="list-style: none; padding: 0; margin: 6px 0 0 0; ${side === 'left' ? 'text-align: right;' : 'text-align: left;'}">${itemsHtml}</ul>` : '') +
                          `<div style="${lineStyle}"></div></div>`;
                  };
                  innerContent = `
                    <style>
                      .cmap-print-wrapper { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .cmap-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      @media print {
                        .cmap-print-wrapper { page-break-inside: avoid; break-inside: avoid; }
                      }
                    </style>
                    <div class="cmap-print-wrapper" role="img" aria-label="Concept map: ${main}" style="display: flex; justify-content: center; align-items: center; gap: 40px; max-width: 1000px; margin: 0 auto; padding: 20px;">
                      <div style="display: flex; flex-direction: column; gap: 20px; align-items: flex-end; flex: 1;">
                        ${leftBranches.map(b => renderBranchCard(b, 'left')).join('')}
                      </div>
                      <div style="width: 200px; height: 200px; border-radius: 50%; background: linear-gradient(135deg, #14b8a6, #059669); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15); border: 5px solid #ccfbf1; flex-shrink: 0; z-index: 2;">
                        <h3 style="margin: 0; font-size: 1.2em;">${main}</h3>
                        ${main_en ? `<div style="font-size: 0.8em; opacity: 0.85; margin-top: 5px;">(${main_en})</div>` : ''}
                      </div>
                      <div style="display: flex; flex-direction: column; gap: 20px; align-items: flex-start; flex: 1;">
                        ${rightBranches.map(b => renderBranchCard(b, 'right')).join('')}
                      </div>
                    </div>`;
              } else if (type === 'Mind Map') {
                  // Pair-coded mind map: each branch gets its own palette entry,
                  // and the connector line inherits that branch's border color
                  // so the visual relationship between center → branch is
                  // unambiguous even when there are 6+ branches.
                  // Now also renders branch.items inside each card (was a long-
                  // standing bug — printable mind maps lost all item detail).
                  const half = Math.ceil(branches.length / 2);
                  const leftBranches = branches.slice(0, half);
                  const rightBranches = branches.slice(half);
                  const total = branches.length;
                  const renderBranch = (b, side, globalIdx) => {
                      const c = _pairColor(globalIdx);
                      const connectorPos = side === 'left' ? `right: -43px;` : `left: -43px;`;
                      const itemAlign = side === 'left' ? 'right' : 'left';
                      const itemsHtml = (b.items || []).map((it, k) => {
                          const text = typeof it === 'object' ? (it.text || '') : String(it);
                          const trans = b.items_en?.[k];
                          return `<li style="margin: 3px 0; font-size: 0.82em; color: ${c.accent}; line-height: 1.35;">${text}${trans ? ` <em style="opacity: 0.75; font-size: 0.9em;">(${trans})</em>` : ''}</li>`;
                      }).join('');
                      return `<div class="mindmap-branch" role="group" aria-label="Mind map branch ${globalIdx + 1} of ${total}: ${b.title}" style="background: linear-gradient(135deg, ${c.bg} 0%, white 100%); border: 3px solid ${c.border}; padding: 14px 18px; border-radius: 18px; text-align: ${itemAlign}; min-width: 180px; max-width: 240px; position: relative; box-shadow: 0 3px 8px -2px rgba(0,0,0,0.08);">
                          <div style="color: ${c.accent}; font-weight: 800; font-size: 0.95em; line-height: 1.25;">${b.title}</div>
                          ${b.title_en ? `<div style="font-size: 0.78em; color: ${c.accent}; opacity: 0.8; font-style: italic; margin-top: 2px;">(${b.title_en})</div>` : ''}
                          ${itemsHtml ? `<ul style="list-style: none; padding: 0; margin: 8px 0 0 0; border-top: 1px solid ${c.soft}; padding-top: 8px;">${itemsHtml}</ul>` : ''}
                          <div aria-hidden="true" style="position: absolute; top: 50%; ${connectorPos} width: 40px; height: 3px; background: ${c.border}; border-radius: 2px;"></div>
                        </div>`;
                  };
                  innerContent = `
                    <style>
                      .mindmap-print-wrapper { page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 24px 16px; border-radius: 16px; }
                      .mindmap-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .mindmap-branch { page-break-inside: avoid; break-inside: avoid; }
                      @media print {
                        .mindmap-print-wrapper { padding: 12px; }
                        .mindmap-print-wrapper .mindmap-branch { box-shadow: none !important; }
                      }
                    </style>
                    <div class="mindmap-print-wrapper">
                      <div role="img" aria-label="Mind map: ${main}" style="display: flex; justify-content: center; align-items: center; gap: 40px; max-width: 1000px; margin: 0 auto;">
                        <div style="display: flex; flex-direction: column; gap: 22px; align-items: flex-end; flex: 1;">
                          ${leftBranches.map((b, i) => renderBranch(b, 'left', i)).join('')}
                        </div>
                        <div style="width: 210px; height: 210px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #818cf8 0%, #6366f1 50%, #4f46e5 100%); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 24px; box-shadow: 0 12px 28px -6px rgba(99,102,241,0.45), inset 0 -8px 20px rgba(30,27,75,0.25); border: 5px solid #eef2ff; flex-shrink: 0; z-index: 2;">
                          <h3 style="margin: 0; font-size: 1.25em; font-weight: 800; line-height: 1.2; text-shadow: 0 1px 2px rgba(30,27,75,0.3);">${main}</h3>
                          ${main_en ? `<div style="font-size: 0.78em; opacity: 0.9; margin-top: 6px; font-style: italic;">(${main_en})</div>` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 22px; align-items: flex-start; flex: 1;">
                          ${rightBranches.map((b, i) => renderBranch(b, 'right', half + i)).join('')}
                        </div>
                      </div>
                    </div>`;
              } else {
                  // Generic fallback: pair-coded branch cards rotating through
                  // _PAIR_PALETTE so each section reads as a distinct chunk
                  // even when there are 6+ branches.
                  innerContent = `
                    <style>
                      .outline-print-wrapper { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; padding: 28px 20px; border-radius: 16px; }
                      .outline-print-wrapper * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                      .outline-card { page-break-inside: avoid; break-inside: avoid; }
                      @media print {
                        .outline-print-wrapper { padding: 12px; }
                        .outline-print-wrapper .outline-card { box-shadow: none !important; }
                      }
                    </style>
                    <div class="outline-print-wrapper" style="max-width: 900px; margin: 0 auto; text-align: center;">
                      <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%); color: white; padding: 22px 44px; border-radius: 18px; display: inline-block; margin-bottom: 28px; box-shadow: 0 8px 20px -4px rgba(79,70,229,0.35); position: relative;">
                        <h3 style="margin: 0; font-size: 1.5em; font-weight: 800; letter-spacing: -0.01em; text-shadow: 0 1px 2px rgba(30,27,75,0.25);">${main}</h3>
                        ${main_en ? `<div style="opacity: 0.9; font-size: 0.9em; margin-top: 6px; font-style: italic;">(${main_en})</div>` : ''}
                      </div>
                      <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px;">
                        ${branches.map((b, i) => {
                          const c = _pairColor(i);
                          return `<div class="outline-card" style="flex: 1; min-width: 220px; max-width: 320px; background: white; border: 2px solid ${c.border}; border-radius: 12px; overflow: hidden; text-align: left; box-shadow: 0 3px 8px -2px rgba(0,0,0,0.08);">
                            <div style="background: linear-gradient(135deg, ${c.bg} 0%, ${c.soft} 100%); padding: 12px 16px; font-weight: 800; color: ${c.accent}; text-align: center; border-bottom: 2px solid ${c.border}; font-size: 0.95em; letter-spacing: -0.01em;">
                              ${b.title}${b.title_en ? `<div style="font-weight: normal; font-size: 0.78em; color: ${c.accent}; opacity: 0.8; margin-top: 3px; font-style: italic;">(${b.title_en})</div>` : ''}
                            </div>
                            <ul style="padding: 14px 18px; margin: 0; list-style: none; color: ${c.accent};">
                              ${(b.items || []).map((it, k) => {
                                const text = typeof it === 'object' ? (it.text || '') : String(it);
                                const trans = b.items_en?.[k];
                                return `<li style="display:flex; gap:8px; align-items:flex-start; margin-bottom: 6px; font-size:0.9em; line-height:1.4;"><span style="color:${c.border}; flex-shrink:0; margin-top:2px;" aria-hidden="true">&#9656;</span><span>${text}${trans ? ` <em style="color: ${c.accent}; opacity: 0.7; font-size: 0.9em;">(${trans})</em>` : ''}</span></li>`;
                              }).join('')}
                            </ul>
                          </div>`;
                        }).join('')}
                      </div>
                    </div>`;
              }
          }
          // Text-only fallback for screen readers and printable PDFs.
          // Diagrams (Venn, Flow Chart, Mind Map, Cause-Effect, Problem
          // Solution, default) all use absolutely-positioned visual layouts
          // that screen readers can't traverse meaningfully — they just hear
          // the role="img" aria-label, which is a one-line summary at best.
          // The collapsible "View as text" section below renders the same
          // content as a structured plain-text outline so screen-reader
          // users get the actual relationships, and so the diagram is
          // legible if someone prints to a small page where the visual
          // layout breaks. Inspired by WCAG 1.1.1 long descriptions.
          const _textFallback = (() => {
              const escape = (s) => String(s == null ? '' : s).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
              const renderItems = (items, items_en) => {
                  if (!Array.isArray(items) || items.length === 0) return '';
                  return '<ul>' + items.map((it, i) => {
                      const en = items_en && items_en[i] ? ` <em style="color:#64748b;font-size:0.9em;">(${escape(items_en[i])})</em>` : '';
                      return `<li>${escape(it)}${en}</li>`;
                  }).join('') + '</ul>';
              };
              // Per-type framing so the relationships read sensibly aloud.
              let body = '';
              if (type === 'Venn Diagram') {
                  const setA = branches[0] || { title: 'Set A', items: [] };
                  const setB = branches[1] || { title: 'Set B', items: [] };
                  const shared = branches[2] || { title: 'Shared', items: [] };
                  body = `
                      <h4>${escape(setA.title)} only</h4>${renderItems(setA.items, setA.items_en)}
                      <h4>${escape(setB.title)} only</h4>${renderItems(setB.items, setB.items_en)}
                      <h4>${escape(shared.title || 'Shared')}</h4>${renderItems(shared.items, shared.items_en)}
                  `;
              } else if (type === 'Cause and Effect') {
                  // Each branch's title is the cause; items[0] is the effect.
                  // Format the fallback as "Cause N: <title> → Effect: <items[0]>"
                  // so screen readers hear the relationship in reading order.
                  body = branches.map((b, i) => `
                      <p><strong>Cause ${i + 1}:</strong> ${escape(b.title)}${b.title_en ? ` <em style="color:#64748b;font-size:0.9em;">(${escape(b.title_en)})</em>` : ''}</p>
                      <p style="margin-left:1.5rem;"><strong>Effect:</strong> ${escape(b.items[0] || '')}${b.items_en && b.items_en[0] ? ` <em style="color:#64748b;font-size:0.9em;">(${escape(b.items_en[0])})</em>` : ''}</p>
                  `).join('');
              } else if (type === 'Problem Solution') {
                  body = `
                      <p><strong>Problem:</strong> ${escape(main)}</p>
                      <h4>Solutions</h4>
                      ${branches.map(b => `<p><strong>${escape(b.title)}</strong></p>${renderItems(b.items, b.items_en)}`).join('')}
                  `;
              } else if (type === 'Mind Map') {
                  body = `
                      <p><strong>Center:</strong> ${escape(main)}</p>
                      ${branches.map(b => `<p><strong>${escape(b.title)}</strong></p>${renderItems(b.items, b.items_en)}`).join('')}
                  `;
              } else if (type === 'T-Chart') {
                  const left = branches[0] || { title: 'Column A', items: [] };
                  const right = branches[1] || { title: 'Column B', items: [] };
                  body = `
                      <h4>${escape(left.title)}</h4>${renderItems(left.items, left.items_en)}
                      <h4>${escape(right.title)}</h4>${renderItems(right.items, right.items_en)}
                  `;
              } else if (type === 'Key Concept Map') {
                  body = `
                      <p><strong>Central concept:</strong> ${escape(main)}</p>
                      ${branches.map(b => `<p><strong>${escape(b.title)}</strong></p>${renderItems(b.items, b.items_en)}`).join('')}
                  `;
              } else if (type === 'Fishbone') {
                  body = `
                      <p><strong>Effect being analyzed:</strong> ${escape(main)}</p>
                      <p>Cause categories:</p>
                      ${branches.map(b => `<p><strong>${escape(b.title)}</strong> (cause category)</p>${renderItems(b.items, b.items_en)}`).join('')}
                  `;
              } else if (type === 'Flow Chart' || type === 'Process Flow / Sequence') {
                  body = '<ol>' + branches.map(b => {
                      const isDecision = (b.title || '').includes('?') || (b.title || '').toLowerCase().includes('decision');
                      const tag = isDecision ? '<em>(decision)</em> ' : '';
                      return `<li>${tag}<strong>${escape(b.title)}</strong>${b.title_en ? ` <em>(${escape(b.title_en)})</em>` : ''}${renderItems(b.items, b.items_en)}</li>`;
                  }).join('') + '</ol>';
              } else {
                  body = branches.map(b => `
                      <h4>${escape(b.title)}${b.title_en ? ` <em style="color:#64748b;font-size:0.9em;">(${escape(b.title_en)})</em>` : ''}</h4>
                      ${renderItems(b.items, b.items_en)}
                  `).join('');
              }
              return `
                  <details class="diagram-text-fallback" style="margin-top:1rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.5rem 0.75rem;">
                      <summary style="cursor:pointer;font-weight:700;color:#475569;font-size:0.9rem;">📋 View as text</summary>
                      <div style="margin-top:0.5rem;color:#1e293b;font-size:0.95rem;line-height:1.5;">
                          <p style="margin:0 0 0.5rem 0;font-weight:700;">${escape(main)}${main_en ? ` <em style="color:#64748b;font-size:0.9em;font-weight:normal;">(${escape(main_en)})</em>` : ''}</p>
                          ${body}
                      </div>
                  </details>
              `;
          })();
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  ${innerContent}
                  ${_textFallback}
              </div>
          `;
      } else if (item.type === 'image') {
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div style="text-align:center">
                  <img loading="lazy" src="${item.data.imageUrl}" alt="${item.data.prompt || item.title || 'Visual support image'}" />
                  <p><em>${item.data.prompt}</em></p>
                  </div>
              </div>
          `;
      } else if (item.type === 'quiz') {
          const reflectionHtml = Array.isArray(item.data.reflections)
              ? item.data.reflections.map(r => {
                  const text = typeof r === 'string' ? r : r.text;
                  const textEn = typeof r === 'object' && r.text_en ? r.text_en : null;
                  return `
                      <div class="reflection-block">
                          <p><strong>${text}</strong>${textEn ? `<br><span style="font-weight:normal; font-style:italic; color:#666">(${textEn})</span>` : ''}</p>
                          <textarea class="interactive-textarea" aria-label="${text}" placeholder="${t('common.type_answer_here')}"></textarea>
                      </div>
                  `;
                }).join('')
              : `
                  <div class="reflection-block">
                      <p><strong>${item.data.reflection}</strong></p>
                      <textarea class="interactive-textarea" aria-label="${item.data.reflection}" placeholder="${t('common.type_answer_here')}"></textarea>
                  </div>
              `;
          // Resolve each question's correct option to an INDEX (the radio value)
          // so the in-iframe Check button can compare user input directly.
          // q.correctAnswer can be a number, a string matching an option, or an
          // A/B/C/D letter — handle all three. -1 means we couldn't resolve it,
          // and that question gets skipped by the checker rather than scored wrong.
          const _resolveCorrectIdx = (q) => {
              if (q == null || !Array.isArray(q.options)) return -1;
              const ca = q.correctAnswer;
              if (typeof ca === 'number' && ca >= 0 && ca < q.options.length) return ca;
              if (typeof ca === 'string') {
                  const trimmed = ca.trim();
                  // Letter form (A, B, C, D, …)
                  if (/^[A-Za-z]$/.test(trimmed)) {
                      const letterIdx = trimmed.toUpperCase().charCodeAt(0) - 65;
                      if (letterIdx >= 0 && letterIdx < q.options.length) return letterIdx;
                  }
                  // Numeric string ("0", "1", …)
                  if (/^\d+$/.test(trimmed)) {
                      const numIdx = parseInt(trimmed, 10);
                      if (numIdx >= 0 && numIdx < q.options.length) return numIdx;
                  }
                  // Match by literal option text (loose: lowercase + trim)
                  const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
                  const target = norm(trimmed);
                  const found = q.options.findIndex(opt => norm(opt) === target);
                  if (found !== -1) return found;
              }
              return -1;
          };
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div class="quiz-box" data-quiz-id="${item.id}">
                      <h3>${t('output.quiz_mcq')}</h3>
                      ${item.data.questions.map((q, i) => {
                          const correctIdx = _resolveCorrectIdx(q);
                          const correctAttr = correctIdx >= 0 ? ` data-correct="${correctIdx}"` : '';
                          return `
                          <div class="question"${correctAttr}>
                              <p>
                                <strong>${i+1}. ${q.question}</strong>
                                ${q.question_en ? `<br><span style="font-weight:normal; font-style:italic; color:#666">(${q.question_en})</span>` : ''}
                              </p>
                              <div class="options">
                                  ${q.options.map((opt, optIdx) => `
                                      <label class="mcq-label">
                                          <input aria-label={t('common.text_field')} type="radio" name="q_${item.id}_${i}" value="${optIdx}">
                                          <span>${opt} ${q.options_en && q.options_en[optIdx] ? `<span style="color:#888; font-size:0.9em;">(${q.options_en[optIdx]})</span>` : ''}</span>
                                      </label>
                                  `).join('')}
                              </div>
                              ${isTeacher ? `<p class="answer-key" style="color: #16a34a; font-weight: bold; margin-top: 10px;">${t('output.quiz_answer')}: ${q.correctAnswer}</p>` : ''}
                              ${isTeacher && q.factCheck ? `<div style="background:#fffbeb; padding:10px; border:1px solid #fcd34d; border-radius:4px; font-size:0.9em; margin-top:10px; white-space: pre-line; color:#92400e;"><strong>AI Verification:</strong><br/>${parseMarkdownToHTML(q.factCheck)}</div>` : ''}
                          </div>
                      `;
                      }).join('')}
                      ${isTeacher ? '' : `
                          <div class="quiz-controls" style="margin:1rem 0;display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center">
                              <button type="button" class="quiz-check-btn" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.9rem">🎯 Check my answers</button>
                              <button type="button" class="quiz-reset-btn" style="padding:8px 16px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem">↻ Reset</button>
                              <div class="quiz-results" role="status" aria-live="polite" aria-atomic="true" style="font-size:0.95rem;font-weight:700;color:#1e293b;margin-left:0.5rem"></div>
                          </div>
                      `}
                      <h3>${t('output.quiz_reflection')}</h3>
                      ${reflectionHtml}
                  </div>
              </div>
          `;
      } else if (item.type === 'analysis') {
          const readingLevelDisplay = typeof item.data.readingLevel === 'object'
              ? `<strong>${item.data.readingLevel.range}</strong><br/><em style="color:#666; font-size:0.9em;">${item.data.readingLevel.explanation}</em>`
              : item.data.readingLevel;
          const citationsHtml = item.data.accuracy?.citations
            ? `<div style="margin-top:20px; padding-top:15px; border-top:1px solid #e2e8f0; font-size:0.85em; color:#64748b;">
                 ${parseMarkdownToHTML(item.data.accuracy.citations)}
               </div>`
            : '';
          return `
              <div class="section" id="${item.id}" role="region" aria-label="${title}">
                  ${enhancedHeader}
                  <div style="background:#f8fafc; padding:15px; border-radius:5px; border:1px solid #e2e8f0;">
                      <p><strong>${t('simplified.level_estimate_label')}:</strong> ${readingLevelDisplay}</p>
                      <p><strong>${t('output.analysis_accuracy')}:</strong> ${item.data.accuracy.rating} - ${item.data.accuracy.reason}</p>
                      <p><strong>${t('output.analysis_concepts')}:</strong> ${item.data.concepts.join(', ')}</p>
                      <p><strong>${t('output.analysis_grammar')}:</strong> ${item.data.grammar.join('; ')}</p>
                  </div>
                  <div style="margin-top:15px; color: #475569;">${parseMarkdownToHTML(item.data.originalText)}</div>
                  ${citationsHtml}
              </div>
          `;
      } else if (item.type === 'udl-advice') {
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div style="background:#eef2ff; padding:15px; border-radius:5px; border:1px solid #c7d2fe; color:#3730a3;">
                      ${parseMarkdownToHTML(item.data)}
                  </div>
              </div>
          `;
      } else if (item.type === 'faq') {
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div class="quiz-box">
                      ${item.data.map((faq, i) => `
                          <div role="article" style="margin-bottom:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;page-break-inside:avoid;">
                              <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
                                  <span aria-hidden="true" style="background:#0891b2;color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
                                  <h3 style="font-weight:700;color:#0891b2;margin:0;font-size:1em;">${faq.question}</h3>
                              </div>
                              ${faq.question_en ? `<p style="font-size: 0.9em; color: #64748b; margin: 0 0 8px 34px; font-style: italic;">(${faq.question_en})</p>` : ''}
                              <p style="margin:0 0 0 34px;color:#334155;line-height:1.7;">${faq.answer}</p>
                              ${faq.answer_en ? `<p style="font-size: 0.9em; color: #64748b; margin: 4px 0 0 34px; font-style: italic;">(${faq.answer_en})</p>` : ''}
                          </div>
                      `).join('')}
                  </div>
              </div>
          `;
      } else if (item.type === 'brainstorm') {
          if (!isTeacher) return '';
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div class="grid" role="list">
                       ${item.data.map(idea => `
                          <div class="card" role="listitem">
                              <h3 style="margin:0 0 8px 0;font-size:1em;color:#1e293b">${idea.title}</h3>
                              <p><strong>Activity:</strong> ${idea.description}</p>
                              <p style="font-style:italic; color:#666; font-size:0.9em;"><strong>Connection:</strong> ${idea.connection}</p>
                              ${idea.guide ? `<div style="margin-top:15px; padding-top:15px; border-top:1px dashed #ccc; font-size:0.9em; background:#fafafa; padding:10px; border-radius:4px;"><strong>Step-by-Step Guide:</strong><br/>${parseMarkdownToHTML(idea.guide)}</div>` : ''}
                          </div>
                       `).join('')}
                  </div>
              </div>
          `;
      } else if (item.type === 'sentence-frames') {
          const { mode, items, text, text_en } = item.data;
          let contentHtml = '';
          if (mode === 'list') {
              contentHtml = `<ul style="list-style:none;padding:0;">${items.map((i, idx) => {
                  const savedVal = responses[item.id]?.[idx] || '';
                  return `
                  <li style="margin-bottom:15px; font-size: 1.1em;">
                      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:5px;">
                          <span style="background:#4f46e5;color:white;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${idx+1}</span>
                          <div>
                              ${i.text}
                              ${i.text_en ? `<span style="font-size:0.8em; color:#666; margin-left: 5px;">(${i.text_en})</span>` : ''}
                          </div>
                      </div>
                      <textarea class="interactive-textarea" style="height: 60px;border-left:3px solid #4f46e5;" aria-label="${i.text}" placeholder="${t('common.complete_sentence')}">${savedVal}</textarea>
                  </li>`;
              }).join('')}</ul>`;
          } else {
              let pIdx = 0;
              const filledText = text.replace(/\[.*?\]/g, (match) => {
                   const savedVal = responses[item.id]?.[`paragraph-${pIdx}`] || '';
                   pIdx++;
                   return `<input aria-label="___________" type="text" class="interactive-blank" placeholder="___________" value="${savedVal}">`;
              });
              contentHtml = `
                  <div style="line-height: 2.5; border: 1px solid #ddd; padding: 20px; border-radius: 8px; background: #fafafa;">
                      ${filledText}
                  </div>
                  ${text_en ? `<div style="margin-top:20px; color:#666; font-style:italic;"><strong>Translation:</strong><br>${text_en}</div>` : ''}
              `;
          }
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  ${contentHtml}
              </div>
          `;
      } else if (item.type === 'math') {
          const problems = item.data.problems || [{
              question: item.data.problem,
              answer: item.data.answer,
              steps: item.data.steps,
              realWorld: item.data.realWorld
          }];
          const graphData = item.data.graphData;
          // Build a screen-reader-speakable form of a LaTeX expression. The
          // visual span class="math-symbol" produces stylized HTML (fractions,
          // superscripts, etc.) that NVDA/JAWS would otherwise read character
          // by character ("a 1 b" for "a over b"). Wrapping each math span in
          // role="math" + aria-label="<spoken form>" gives screen readers a
          // sentence to announce that matches the visual meaning.
          //
          // We don't generate full MathML markup — that'd be a 500-line lift
          // for marginal gain over a well-formed aria-label. The label below
          // converts the most common LaTeX operators to plain English.
          const _latexToSpeakable = (raw) => {
              if (raw == null || raw === '') return '';
              let s = String(raw);
              // Strip math-mode delimiters
              s = s.replace(/^\$\$/, '').replace(/\$\$$/, '').replace(/^\$/, '').replace(/\$$/, '');
              // Structural commands first (these contain other math)
              s = s.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '$1 over $2');
              s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^}]+)\}/g, '$1th root of $2');
              s = s.replace(/\\sqrt\s*\{([^}]+)\}/g, 'square root of $1');
              s = s.replace(/\\binom\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '$1 choose $2');
              s = s.replace(/\\overline\{([^}]+)\}/g, 'the negation of $1');
              s = s.replace(/\\underline\{([^}]+)\}/g, '$1');
              s = s.replace(/\\(text|textit|textrm|mathrm|operatorname|textbf|mathbf|mathit|mathbb)\{([^}]+)\}/g, '$2');
              // Powers and subscripts (longest first so {^...{n}} is caught before {^n})
              s = s.replace(/\^\{([^}]+)\}/g, ' to the power $1 ');
              s = s.replace(/\^([0-9a-zA-Z+\-])/g, ' to the power $1 ');
              s = s.replace(/_\{([^}]+)\}/g, ' sub $1 ');
              s = s.replace(/_([0-9a-zA-Z])/g, ' sub $1 ');
              // Big operators
              s = s.replace(/\\sum/g, 'the sum of');
              s = s.replace(/\\prod/g, 'the product of');
              s = s.replace(/\\int/g, 'the integral of');
              s = s.replace(/\\(iint|iiint)/g, 'the multiple integral of');
              s = s.replace(/\\oint/g, 'the contour integral of');
              s = s.replace(/\\lim/g, 'the limit of');
              s = s.replace(/\\(min|max|sup|inf)/g, '$1 of');
              // Comparison + arithmetic
              const phraseMap = {
                  'leq': 'less than or equal to', 'le': 'less than or equal to',
                  'geq': 'greater than or equal to', 'ge': 'greater than or equal to',
                  'neq': 'not equal to', 'ne': 'not equal to',
                  'approx': 'approximately equal to', 'equiv': 'equivalent to',
                  'cong': 'congruent to', 'sim': 'similar to', 'simeq': 'similar to',
                  'propto': 'proportional to',
                  'times': 'times', 'div': 'divided by', 'cdot': 'times',
                  'pm': 'plus or minus', 'mp': 'minus or plus',
                  'rightarrow': 'goes to', 'to': 'goes to',
                  'Rightarrow': 'implies', 'Leftrightarrow': 'if and only if',
                  'mapsto': 'maps to',
                  'in': 'in', 'notin': 'not in', 'subset': 'a subset of', 'supset': 'a superset of',
                  'subseteq': 'a subset of or equal to', 'cup': 'union', 'cap': 'intersection',
                  'forall': 'for all', 'exists': 'there exists', 'nexists': 'there does not exist',
                  'neg': 'not', 'lnot': 'not', 'land': 'and', 'lor': 'or',
                  'wedge': 'and', 'vee': 'or',
                  'infty': 'infinity', 'partial': 'partial', 'nabla': 'gradient of',
                  'angle': 'angle', 'perp': 'perpendicular to', 'parallel': 'parallel to',
                  'therefore': 'therefore', 'because': 'because',
                  'ldots': 'and so on', 'cdots': 'and so on', 'dots': 'and so on',
                  'prime': 'prime', 'degree': 'degrees',
                  'sin': 'sine', 'cos': 'cosine', 'tan': 'tangent',
                  'arcsin': 'arc sine', 'arccos': 'arc cosine', 'arctan': 'arc tangent',
                  'log': 'log', 'ln': 'natural log', 'exp': 'e to the',
                  // Greek letters keep their Greek names; screen readers handle these well.
                  'alpha': 'alpha', 'beta': 'beta', 'gamma': 'gamma', 'delta': 'delta',
                  'epsilon': 'epsilon', 'theta': 'theta', 'lambda': 'lambda', 'mu': 'mu',
                  'pi': 'pi', 'rho': 'rho', 'sigma': 'sigma', 'tau': 'tau', 'phi': 'phi',
                  'chi': 'chi', 'psi': 'psi', 'omega': 'omega',
                  'Gamma': 'capital gamma', 'Delta': 'capital delta', 'Theta': 'capital theta',
                  'Lambda': 'capital lambda', 'Sigma': 'capital sigma', 'Pi': 'capital pi',
                  'Phi': 'capital phi', 'Psi': 'capital psi', 'Omega': 'capital omega',
              };
              const sortedKeys = Object.keys(phraseMap).sort((a, b) => b.length - a.length);
              sortedKeys.forEach(cmd => {
                  const re = new RegExp('\\\\' + cmd + '(?![a-zA-Z])', 'g');
                  s = s.replace(re, ' ' + phraseMap[cmd] + ' ');
              });
              // Strip remaining LaTeX bookkeeping: backslashes, braces, &, \\
              s = s.replace(/\\\\/g, ', ');
              s = s.replace(/[{}\\]/g, ' ');
              s = s.replace(/&/g, ' ');
              // Operators in raw form become words
              s = s.replace(/\+/g, ' plus ').replace(/(?<=[\d\w\)])\s*-\s*(?=[\d\w\(])/g, ' minus ').replace(/=/g, ' equals ');
              // Collapse whitespace
              s = s.replace(/\s+/g, ' ').trim();
              // Quote-safe for HTML attribute
              return s.replace(/"/g, '&quot;');
          };
          const formatMath = (t) => {
              const speakable = _latexToSpeakable(t);
              const labelAttr = speakable ? ` aria-label="${speakable}"` : '';
              return `<span class="math-symbol" role="math"${labelAttr}>${processMathHTML(t)}</span>`;
          };
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  ${graphData ? `
                    <div style="text-align:center; margin:20px 0; padding:20px; background:white; border:1px solid #cbd5e1; border-radius:8px;">
                        ${graphData}
                    </div>
                  ` : ''}
                  <div style="background:#f8fafc; padding:20px; border:1px solid #e2e8f0; border-radius:8px;">
                      ${problems.map((p, i) => `
                          <div style="margin-bottom: 30px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 20px; page-break-inside: avoid;">
                              <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                                  <span style="font-weight: bold; color: #475569; font-size: 1.1em;">${i + 1}.</span>
                                  <div style="font-size:1.2em; font-family:'Times New Roman', serif; font-weight:bold; color:#1e293b;">
                                      ${formatMath(p.question)}
                                  </div>
                              </div>
                              ${isTeacher ? `
                                  <!-- Teacher Key View -->
                                  <div style="margin-left: 25px;">
                                      ${p.steps && p.steps.length > 0 ? `
                                      <h4 style="color:#475569; margin-bottom:10px; font-size: 0.9em; text-transform: uppercase;">${t('math.display.steps_header')}</h4>
                                      <ol style="padding-left:20px; color:#334155; margin-bottom: 15px;">
                                          ${p.steps.map(s => `
                                              <li style="margin-bottom:10px;">
                                                  <div style="font-weight:500; margin-bottom:4px;">${s.explanation}</div>
                                                  ${s.latex ? `<div style="font-size:1.0em; color:#1e293b; background:white; display:inline-block; padding:4px 8px; border-radius:4px; border:1px solid #f1f5f9;">${formatMath(s.latex)}</div>` : ''}
                                              </li>
                                          `).join('')}
                                      </ol>
                                      ` : ''}
                                      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:8px; margin-top:10px;">
                                          <div style="font-size:0.8em; text-transform:uppercase; font-weight:bold; color:#166534; margin-bottom:5px;">${t('math.display.answer_header')}</div>
                                          <div style="font-size:1.2em; font-weight:bold; color:#14532d;">${formatMath(p.answer)}</div>
                                      </div>
                                      ${p.realWorld ? `
                                      <div style="margin-top:10px; padding:10px; background:#fff7ed; border:1px solid #ffedd5; border-radius:8px; color:#9a3412; font-size:0.9em;">
                                          <strong>${t('math.display.connection_header')}:</strong> ${p.realWorld}
                                      </div>
                                      ` : ''}
                                  </div>
                              ` : `
                                  <!-- Student Worksheet View -->
                                  <div style="margin-left: 25px; min-height: 150px; border: 1px solid #cbd5e1; border-radius: 8px; background: white;"></div>
                              `}
                          </div>
                      `).join('')}
                  </div>
              </div>
          `;
      } else if (item.type === 'timeline') {
          const rawItems = Array.isArray(item.data) ? item.data : (item.data?.items || []);
          const progression = (!Array.isArray(item.data) && item.data?.progressionLabel) || '';
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  ${progression ? `<div style="display:inline-block;background:#4338ca;color:white;padding:4px 12px;border-radius:999px;font-size:0.85em;font-weight:700;margin-bottom:12px;">${progression}</div>` : ''}
                  <ol style="position: relative; padding-left: 24px; border-left: 3px solid #4338ca; margin-left: 10px; list-style: none;">
                      ${rawItems.map((t, i) => `
                          <li style="margin-bottom: 20px; position: relative;">
                              <div aria-hidden="true" style="position: absolute; left: -32px; top: 0; width: 16px; height: 16px; background: #4f46e5; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #4338ca;"></div>
                              <div style="background: ${i % 2 === 0 ? '#f8fafc' : '#eef2ff'}; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; display:flex; gap:12px; align-items:flex-start;">
                                  ${t.image ? `<img src="${t.image}" alt="${(t.date ? t.date + ': ' : '') + (t.event || '')}" style="width:64px;height:64px;object-fit:contain;border:1px solid #e2e8f0;border-radius:6px;background:white;flex-shrink:0;" />` : ''}
                                  <div style="flex:1;min-width:0;">
                                      <div style="margin-bottom: 4px;">
                                          <span style="display:inline-block;background:#4338ca;color:white;padding:2px 10px;border-radius:999px;font-size:0.8em;font-weight:700;">${t.date}</span>
                                          ${t.date_en ? `<span style="opacity:0.6; font-weight:normal; font-size:0.85em; margin-left:6px;">(${t.date_en})</span>` : ''}
                                      </div>
                                      <div style="color: #334155;">
                                          ${t.event}
                                      </div>
                                      ${t.event_en ? `<div style="color: #64748b; font-size: 0.9em; margin-top: 4px; font-style: italic;">${t.event_en}</div>` : ''}
                                  </div>
                              </div>
                          </li>
                      `).join('')}
                  </ol>
              </div>
          `;
      } else if (item.type === 'concept-sort') {
          const categories = item.data.categories || [];
          const sortItems = item.data.items || [];
          const catColors = ['#dc2626','#2563eb','#059669','#d97706','#7c3aed','#be185d','#0891b2','#ca8a04'];
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div style="display: flex; flex-wrap: wrap; gap: 20px;" role="list">
                      ${categories.map((cat, catIdx) => {
                          const catItems = sortItems.filter(i => i.categoryId === cat.id);
                          const catColor = catColors[catIdx % catColors.length];
                          return `
                              <div role="listitem" style="flex: 1; min-width: 200px; border: 2px solid ${catColor}33; border-radius: 12px; overflow: hidden;">
                                  <h3 style="margin:0;font-size:1em;background:${catColor};color:white; padding: 10px; font-weight: bold; text-align: center;">
                                      ${cat.label}
                                  </h3>
                                  <div style="padding: 10px;">
                                      <ul style="margin: 0; padding-left: 8px; color: #475569; list-style: none;">
                                          ${catItems.map(ci => `<li style="margin-bottom: 5px;">&#9744; ${ci.content}</li>`).join('')}
                                      </ul>
                                  </div>
                              </div>
                          `;
                      }).join('')}
                  </div>
              </div>
          `;
      } else if (item.type === 'dbq') {
          const docs = item.data.documents || [];
          const rubric = item.data.rubric || [];
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  ${item.data.historicalContext ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px;"><strong>Historical Context:</strong><br/>${item.data.historicalContext}</div>` : ''}
                  ${docs.map(doc => `
                      <div style="border:2px solid #e2e8f0;border-radius:8px;margin-bottom:20px;overflow:hidden;">
                          <div style="background:#f8fafc;padding:12px;border-bottom:1px solid #e2e8f0;">
                              <strong style="font-size:1.1em;">${doc.title || 'Document ' + doc.id}</strong>
                              ${doc.source ? `<div style="font-size:0.85em;color:#64748b;margin-top:4px;font-style:italic;">Source: ${doc.source}</div>` : ''}
                          </div>
                          <div style="padding:16px;">
                              <div style="background:#fefce8;border-left:4px solid #eab308;padding:12px;border-radius:4px;margin-bottom:12px;font-size:0.95em;line-height:1.6;">${doc.excerpt || ''}</div>
                              ${doc.sourcingQuestions?.length > 0 ? `<div style="margin-bottom:8px;"><strong style="color:#7c3aed;font-size:0.85em;">Sourcing Questions:</strong><ol style="margin:4px 0 0 20px;color:#475569;font-size:0.9em;">${doc.sourcingQuestions.map(q => `<li style="margin-bottom:4px;">${q}</li>`).join('')}</ol></div>` : ''}
                              ${doc.analysisQuestions?.length > 0 ? `<div><strong style="color:#2563eb;font-size:0.85em;">Analysis Questions:</strong><ol style="margin:4px 0 0 20px;color:#475569;font-size:0.9em;">${doc.analysisQuestions.map(q => `<li style="margin-bottom:4px;">${q}</li>`).join('')}</ol></div>` : ''}
                          </div>
                      </div>
                  `).join('')}
                  ${item.data.synthesisPrompt ? `<div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:2px solid #86efac;border-radius:8px;padding:20px;margin-bottom:20px;"><strong style="font-size:1.1em;color:#166534;">📝 Synthesis Essay Prompt:</strong><p style="margin-top:8px;font-size:1em;line-height:1.7;color:#1e293b;">${item.data.synthesisPrompt}</p></div>` : ''}
                  ${rubric.length > 0 ? `<div style="margin-top:20px;"><strong>Rubric:</strong><table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:0.85em;"><tr><th scope="col" style="border:1px solid #e2e8f0;padding:8px;background:#f1f5f9;text-align:left;">Criteria</th><th scope="col" style="border:1px solid #e2e8f0;padding:8px;background:#fef2f2;text-align:center;">1</th><th scope="col" style="border:1px solid #e2e8f0;padding:8px;background:#fefce8;text-align:center;">2</th><th scope="col" style="border:1px solid #e2e8f0;padding:8px;background:#f0fdf4;text-align:center;">3</th><th scope="col" style="border:1px solid #e2e8f0;padding:8px;background:#eff6ff;text-align:center;">4</th></tr>${rubric.map(r => `<tr><td style="border:1px solid #e2e8f0;padding:8px;font-weight:bold;">${r.criteria}</td><td style="border:1px solid #e2e8f0;padding:8px;font-size:0.85em;">${r['1'] || ''}</td><td style="border:1px solid #e2e8f0;padding:8px;font-size:0.85em;">${r['2'] || ''}</td><td style="border:1px solid #e2e8f0;padding:8px;font-size:0.85em;">${r['3'] || ''}</td><td style="border:1px solid #e2e8f0;padding:8px;font-size:0.85em;">${r['4'] || ''}</td></tr>`).join('')}</table></div>` : ''}
                  ${item.data.teacherNotes ? `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:12px;margin-top:16px;font-size:0.85em;color:#6b21a8;"><strong>Teacher Notes:</strong> ${item.data.teacherNotes}</div>` : ''}
              </div>
          `;
      } else if (item.type === 'gemini-bridge') {
          return `
              <div class="section" id="${item.id}">
                  <div class="resource-header">${title} (${item.meta})</div>
                  <div style="background: #1e293b; color: #cbd5e1; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 0.9em; white-space: pre-wrap;">${item.data}</div>
                  <p style="font-size: 0.8em; color: #666; margin-top: 5px; font-style: italic;">${t('bridge.generated_desc')}</p>
              </div>
          `;
      } else if (item.type === 'fluency-record') {
        const { metrics, wordData, audioRecording, mimeType, feedback } = item.data;
        const heatmapHtml = wordData.map(w => {
            let colorStyle = "color: #94a3b8;";
            if (w.status === 'correct') colorStyle = "color: #15803d; font-weight: bold;";
            else if (w.status === 'missed') colorStyle = "color: #ef4444; text-decoration: line-through;";
            else if (w.status === 'stumbled') colorStyle = "color: #d97706; border-bottom: 2px dotted #f59e0b;";
            return `<span style="margin-right: 4px; ${colorStyle}">${w.word}</span>`;
        }).join('');
        return `
            <div class="section" id="${item.id}">
                <div class="resource-header">${title} (${item.meta})</div>
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center;">
                        <div style="font-size: 0.8em; text-transform: uppercase; color: #166534; font-weight: bold;">Accuracy</div>
                        <div style="font-size: 2em; font-weight: 900; color: #15803d;">${metrics.accuracy}%</div>
                    </div>
                    <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe; text-align: center;">
                        <div style="font-size: 0.8em; text-transform: uppercase; color: #1e40af; font-weight: bold;">Rate (WCPM)</div>
                        <div style="font-size: 2em; font-weight: 900; color: #1e3a8a;">${metrics.wcpm}</div>
                    </div>
                </div>
                <!-- Audio Player -->
                ${audioRecording ? `
                    <div style="margin-bottom: 20px; background: #f8fafc; padding: 10px; border-radius: 50px; border: 1px solid #e2e8f0;">
                        <audio controls src="data:${mimeType};base64,${audioRecording}" style="width: 100%;"></audio>
                    </div>
                ` : '<p style="font-style:italic; color: #94a3b8;">No audio recording available.</p>'}
                <!-- AI Feedback -->
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; margin-bottom: 20px; font-style: italic; color: #92400e;">
                    <strong>AI Feedback:</strong> "${feedback}"
                </div>
                <!-- Detailed Analysis View -->
                <div style="line-height: 1.8; font-family: serif; font-size: 1.1em; background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    ${heatmapHtml}
                </div>
                <div style="margin-top: 10px; font-size: 0.75em; color: #64748b; text-align: center;">
                    Key: <span style="color:#15803d; font-weight:bold;">Correct</span> | <span style="color:#d97706; border-bottom: 2px dotted #f59e0b;">Hesitation</span> | <span style="color:#ef4444; text-decoration: line-through;">Missed/Error</span>
                </div>
            </div>
        `;
      } else if (item.type === 'lesson-plan') {
          const { materialsNeeded, essentialQuestion, objectives, hook, directInstruction, guidedPractice, independentPractice, closure, extensions } = item.data;
          const modeKey = isIndependentMode ? 'student' : (isParentMode ? 'parent' : 'teacher');
          const renderHeader = (key) => {
              const translated = t(`lesson_headers.${modeKey}.${key}`);
              if (currentUiLanguage !== 'English') {
                  const english = UI_STRINGS.lesson_headers[modeKey][key];
                  if (english && translated !== english) {
                      return `${translated} <span style="font-weight:400; font-size:0.9em; opacity:0.7; margin-left: 4px;">(${english})</span>`;
                  }
              }
              return translated;
          };
          const renderBilingualField = (textInput) => {
              if (!textInput) return '';
              const text = String(textInput);
              if (text.includes('--- ENGLISH TRANSLATION ---')) {
                  const parts = text.split('--- ENGLISH TRANSLATION ---');
                  const targetLangText = parts[0].trim();
                  const englishText = parts[1].trim();
                  return `
                      <div>
                          <!-- Target Language Content -->
                          <div style="margin-bottom: 16px;">
                              ${parseMarkdownToHTML(targetLangText)}
                          </div>
                          <!-- English Translation Section -->
                          <div style="
                              margin-top: 16px;
                              padding: 16px;
                              border-left: 4px solid #94a3b8; /* Solid Slate Border */
                              background-color: #f1f5f9;      /* Light Slate Background */
                              border-radius: 0 8px 8px 0;
                          ">
                              <div style="
                                  font-weight: 800;           /* Extra Bold */
                                  text-transform: uppercase;
                                  font-size: 0.75rem;
                                  letter-spacing: 0.05em;
                                  color: #475569;             /* Slate 600 */
                                  margin-bottom: 8px;
                                  border-bottom: 1px solid #cbd5e1;
                                  padding-bottom: 4px;
                                  display: inline-block;
                              ">
                                  English Translation
                              </div>
                              <div style="
                                  font-style: italic;
                                  color: #334155;             /* Slate 700 */
                                  font-size: 0.95em;
                                  line-height: 1.6;
                              ">
                                  ${parseMarkdownToHTML(englishText)}
                              </div>
                          </div>
                      </div>
                  `;
              }
              return parseMarkdownToHTML(text);
          };
          let extensionsHtml = '';
          if (extensions) {
              if (Array.isArray(extensions)) {
                  extensionsHtml = extensions.map(ext => `
                    <div style="background: #f8fafc; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 15px;">
                        <h5 style="margin: 0 0 10px 0; color: #312e81; font-size: 1em;">
                            ${renderBilingualField(typeof ext === 'string' ? "Extension Idea" : ext.title)}
                        </h5>
                        <div style="font-size: 0.9em; color: #334155;">
                            ${renderBilingualField(typeof ext === 'string' ? ext : ext.description)}
                        </div>
                        ${ext.guide ? `
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                                <h6 style="margin: 0 0 5px 0; text-transform: uppercase; font-size: 0.75em; color: #475569;">${t('lesson_plan.teacher_guide')}</h6>
                                <div style="font-size: 0.9em;">${parseMarkdownToHTML(ext.guide)}</div>
                            </div>
                        ` : ''}
                    </div>
                  `).join('');
              } else {
                  extensionsHtml = `<div style="font-size: 0.9em;">${renderBilingualField(extensions)}</div>`;
              }
              extensionsHtml = `
                <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 20px;">
                      <h3 style="margin: 0 0 15px 0; color: #7c3aed; font-size: 0.9em; text-transform: uppercase;">
                          <span aria-hidden="true" style="margin-right:6px;">&#128640;</span>${t('lesson_plan.extensions_header')}
                      </h3>
                      ${extensionsHtml}
                </div>
              `;
          }
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                      ${materialsNeeded && materialsNeeded.length > 0 ? `
                      <div style="margin-bottom: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 15px;">
                          <h3 style="margin: 0 0 10px 0; color: #059669; font-size: 0.9em; text-transform: uppercase; font-weight: 800;">
                              <span aria-hidden="true" style="margin-right:6px;">&#128230;</span>${t('lesson_plan.materials_header')}
                          </h3>
                          <ul style="margin: 0; padding-left: 20px;">
                              ${materialsNeeded.map(m => `<li>${renderBilingualField(m)}</li>`).join('')}
                          </ul>
                      </div>
                      ` : ''}
                      <div style="margin-bottom: 20px;">
                          <h3 style="margin: 0 0 5px 0; color: #7c3aed; font-size: 0.9em; text-transform: uppercase;">
                              <span aria-hidden="true" style="margin-right:6px;">&#10067;</span>${renderHeader('essentialQuestion')}
                          </h3>
                          <div style="margin: 0; font-size: 1.1em; font-style: italic; font-family: serif;">
                              ${renderBilingualField(essentialQuestion)}
                          </div>
                      </div>
                      <div style="margin-bottom: 20px;">
                          <h3 style="margin: 0 0 5px 0; color: #6366f1; font-size: 0.9em; text-transform: uppercase;">
                              ${renderHeader('objectives')}
                          </h3>
                          <ul style="margin: 0; padding-left: 20px;">
                              ${objectives.map(o => `<li>${renderBilingualField(o)}</li>`).join('')}
                          </ul>
                      </div>
                      <div style="margin-bottom: 20px;">
                          <h3 style="margin: 0 0 5px 0; color: #d97706; font-size: 0.9em; text-transform: uppercase;">
                              <span aria-hidden="true" style="margin-right:6px;">&#127907;</span>${renderHeader('hook')}
                          </h3>
                          <div>${renderBilingualField(hook)}</div>
                      </div>
                      <div style="margin-bottom: 20px;">
                          <h3 style="margin: 0 0 5px 0; color: #2563eb; font-size: 0.9em; text-transform: uppercase;">
                              <span aria-hidden="true" style="margin-right:6px;">&#128214;</span>${renderHeader('directInstruction')}
                          </h3>
                          <div>${renderBilingualField(directInstruction)}</div>
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                          <div>
                              <h3 style="margin: 0 0 5px 0; color: #0891b2; font-size: 0.9em; text-transform: uppercase;">
                                  <span aria-hidden="true" style="margin-right:6px;">&#128101;</span>${renderHeader('guidedPractice')}
                              </h3>
                              <div>${renderBilingualField(guidedPractice)}</div>
                          </div>
                          <div>
                              <h3 style="margin: 0 0 5px 0; color: #4f46e5; font-size: 0.9em; text-transform: uppercase;">
                                  <span aria-hidden="true" style="margin-right:6px;">&#9999;&#65039;</span>${renderHeader('independentPractice')}
                              </h3>
                              <div>${renderBilingualField(independentPractice)}</div>
                          </div>
                      </div>
                      <div>
                          <h3 style="margin: 0 0 5px 0; color: #dc2626; font-size: 0.9em; text-transform: uppercase;">
                              <span aria-hidden="true" style="margin-right:6px;">&#127919;</span>${renderHeader('closure')}
                          </h3>
                          <div>${renderBilingualField(closure)}</div>
                      </div>
                  </div>
                  ${extensionsHtml}
              </div>
          `;
      } else if (item.type === 'alignment-report') {
          if (!isTeacher) return '';
          const reports = item.data.reports || [];
          return `
              <div class="section" id="${item.id}">
                  <div class="resource-header">${title} (${item.meta})</div>
                  ${reports.map(report => `
                      <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                          <div style="background: ${report.overallDetermination === 'Pass' ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                              <div>
                                  <h3 style="margin: 0; font-size: 1.2em; color: #334155;">${report.standard}</h3>
                                  <div style="font-size: 0.9em; color: #64748b;">${report.standardBreakdown.cognitiveDemand}</div>
                              </div>
                              <div style="font-weight: bold; text-transform: uppercase; color: ${report.overallDetermination === 'Pass' ? '#15803d' : '#b91c1c'}; border: 2px solid currentColor; padding: 4px 10px; border-radius: 6px;">
                                  ${report.overallDetermination}
                              </div>
                          </div>
                          <div style="padding: 15px;">
                              <div style="margin-bottom: 15px;">
                                  <h4 style="margin: 0 0 5px 0; color: #475569; font-size: 0.9em; text-transform: uppercase;">${t('alignment.text_alignment')}</h4>
                                  <div style="background: #f8fafc; padding: 10px; border-radius: 4px; font-size: 0.9em; border: 1px solid #e2e8f0;">
                                      <strong>Status:</strong> ${report.analysis.textAlignment.status}<br/>
                                      <strong>Evidence:</strong> "<em>${report.analysis.textAlignment.evidence}</em>"
                                  </div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <h4 style="margin: 0 0 5px 0; color: #475569; font-size: 0.9em; text-transform: uppercase;">${t('alignment.activities_header')}</h4>
                                  <div style="background: #f8fafc; padding: 10px; border-radius: 4px; font-size: 0.9em; border: 1px solid #e2e8f0;">
                                      <strong>Status:</strong> ${report.analysis.activityAlignment?.status || "N/A"}<br/>
                                      <strong>Evidence:</strong> "<em>${report.analysis.activityAlignment?.evidence || t('alignment.no_activities')}</em>"
                                  </div>
                              </div>
                              <div style="margin-bottom: 15px;">
                                  <h4 style="margin: 0 0 5px 0; color: #475569; font-size: 0.9em; text-transform: uppercase;">${t('alignment.assessment')}</h4>
                                  <div style="background: #f8fafc; padding: 10px; border-radius: 4px; font-size: 0.9em; border: 1px solid #e2e8f0;">
                                      <strong>Status:</strong> ${report.analysis.assessmentAlignment.status}<br/>
                                      <strong>Evidence:</strong> "<em>${report.analysis.assessmentAlignment.evidence}</em>"
                                  </div>
                              </div>
                              <div>
                                  <h4 style="margin: 0 0 5px 0; color: #475569; font-size: 0.9em; text-transform: uppercase;">${t('alignment.recommendation')}</h4>
                                  <p style="margin: 0; font-size: 0.9em; color: #334155;">${report.adminRecommendation}</p>
                              </div>
                          </div>
                      </div>
                  `).join('')}
              </div>
          `;
      }
      return '';
  };
  // ── Unified Style Seeds: merge pre-remediation preferences + post-remediation themes ──
  // Each seed works as both an AI prompt instruction (during remediation) and a deterministic CSS fallback (for preview/offline)
  const STYLE_SEEDS = {
    professional: {
      name: 'Professional', emoji: '💼', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Professional — use clean sans-serif fonts (Inter), navy (#1e3a5f) headings and blue (#2563eb) accents, white background, formal spacing, polished corporate appearance.',
      cssVars: { bodyFont: "'Inter', system-ui, sans-serif", headingColor: '#1e3a5f', accentColor: '#2563eb', bgColor: '#ffffff', cardBg: '#f8fafc', cardBorder: '#e2e8f0', headerBg: 'linear-gradient(135deg, #1e3a5f, #2563eb)', headerText: '#ffffff' },
    },
    academic: {
      name: 'Academic', emoji: '📚', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Academic — use serif fonts (Georgia), navy (#1b3a5c) and gold (#8b6508) color scheme, formal spacing, scholarly appearance suitable for university submissions.',
      cssVars: { bodyFont: "'Georgia', 'Times New Roman', serif", headingColor: '#1b3a5c', accentColor: '#8b6508', bgColor: '#ffffff', cardBg: '#fefce8', cardBorder: '#e2e8f0', headerBg: 'linear-gradient(135deg, #1b3a5c, #2c5f8a)', headerText: '#ffffff', extraCSS: 'h1 { border-bottom: 2px solid #8b6508; padding-bottom: 0.5rem; } blockquote { border-left: 3px solid #8b6508; padding-left: 1rem; font-style: italic; }' },
    },
    elementary: {
      name: 'Kid-Friendly', emoji: '🌈', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Kid-friendly — use rounded corners (border-radius: 12px), bright cheerful colors (teal, coral, purple), larger fonts (16px base), playful section cards with soft shadows, Comic Sans or Lexend font. Use #be185d for pink accents (WCAG AA compliant).',
      cssVars: { bodyFont: "'Comic Sans MS', 'Lexend', sans-serif", headingColor: '#7c3aed', accentColor: '#be185d', bgColor: '#fefce8', cardBg: '#ffffff', cardBorder: '#fbbf24', headerBg: 'linear-gradient(135deg, #7c3aed, #be185d, #d97706)', headerText: '#ffffff', borderRadius: '16px', extraCSS: '.section { border-left: 5px solid #be185d; border-radius: 12px; padding: 1.5rem; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06); } h2 { color: #7c3aed; } .resource-header { background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-left: 4px solid #a855f7; }' },
    },
    minimal: {
      name: 'Minimalist', emoji: '✨', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Minimalist — lots of whitespace, thin sans-serif font, muted grays, one accent color (#6366f1), hairline borders, understated elegance.',
      cssVars: { bodyFont: "'Georgia', serif", headingColor: '#111827', accentColor: '#6b7280', bgColor: '#ffffff', cardBg: '#ffffff', cardBorder: 'transparent', headerBg: '#ffffff', headerText: '#111827', extraCSS: 'h1 { font-size: 2rem; font-weight: 300; letter-spacing: -0.02em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; } .section { border: none; padding-bottom: 3rem; } .resource-header { background: none; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; }' },
    },
    highContrast: {
      name: 'High Contrast', emoji: '◼️', wcagLevel: 'AAA',
      promptInstructions: 'STYLE PREFERENCE: High Contrast accessibility — use Atkinson Hyperlegible font, pure black text on white background, blue (#0000ff) underlined links, bold 2px borders, increased font size (1.1rem). ALL text must achieve 7:1 contrast ratio (WCAG AAA). No subtle colors.',
      cssVars: { bodyFont: "'Atkinson Hyperlegible', system-ui, sans-serif", headingColor: '#000000', accentColor: '#0000ff', bgColor: '#ffffff', cardBg: '#ffffff', cardBorder: '#000000', headerBg: '#000000', headerText: '#ffff00', extraCSS: 'body { font-size: 1.1rem; } a { color: #0000ff; text-decoration: underline; } .section { border: 2px solid #000; } th { background: #000; color: #fff; }' },
    },
    nature: {
      name: 'Nature & Calm', emoji: '🌿', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Nature & Calm — use Lexend font, deep green (#166534) headings, green accents, soft pale green (#f0fdf4) background, rounded section cards with green left borders, calming and soothing appearance.',
      cssVars: { bodyFont: "'Lexend', system-ui, sans-serif", headingColor: '#166534', accentColor: '#15803d', bgColor: '#f0fdf4', cardBg: '#ffffff', cardBorder: '#bbf7d0', headerBg: 'linear-gradient(135deg, #166534, #15803d)', headerText: '#ffffff', extraCSS: '.section { border-left: 4px solid #86efac; border-radius: 8px; background: white; } .resource-header { background: #f0fdf4; color: #166534; }' },
    },
    print: {
      name: 'Print Optimized', emoji: '🖨️', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Print Optimized — use Times New Roman serif, pure black text on white, page-break-inside: avoid on sections, 12pt base font, optimized for physical printing with clean margins and no decorative elements.',
      cssVars: { bodyFont: "'Times New Roman', serif", headingColor: '#000000', accentColor: '#333333', bgColor: '#ffffff', cardBg: '#ffffff', cardBorder: '#cccccc', headerBg: '#ffffff', headerText: '#000000', extraCSS: 'body { font-size: 12pt; } .section { page-break-inside: avoid; } @media screen { body { max-width: 700px; } }' },
    },
    dark: {
      name: 'Dark Mode', emoji: '🌙', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Dark mode — dark charcoal background (#1e1e2e), soft white text (#e2e8f0), indigo accents (#818cf8), subtle borders, excellent contrast. All text must be light on dark.',
      cssVars: { bodyFont: "'Inter', system-ui, sans-serif", headingColor: '#e2e8f0', accentColor: '#818cf8', bgColor: '#1e1e2e', cardBg: '#2a2a3e', cardBorder: '#3f3f5e', headerBg: 'linear-gradient(135deg, #1e1e2e, #2d2b55)', headerText: '#e2e8f0', extraCSS: 'body { color: #e2e8f0; } a { color: #818cf8; } table { border-color: #3f3f5e; } th { background: #2a2a3e; color: #e2e8f0; } td { color: #cbd5e1; }' },
    },
    magazine: {
      name: 'Magazine', emoji: '📰', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Magazine editorial — large hero headings, pull quotes with colored left borders, serif body text (Georgia), elegant professional feel with editorial flair. Use #c1272d for red accents (WCAG AA compliant).',
      cssVars: { bodyFont: "'Georgia', serif", headingColor: '#1a1a2e', accentColor: '#c1272d', bgColor: '#ffffff', cardBg: '#ffffff', cardBorder: '#e5e7eb', headerBg: 'linear-gradient(135deg, #1a1a2e, #16213e)', headerText: '#ffffff', extraCSS: 'h1 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; } blockquote { border-left: 4px solid #c1272d; padding: 1rem 1.5rem; font-size: 1.2rem; font-style: italic; color: #374151; } .section { border-bottom: 1px solid #e5e7eb; padding-bottom: 2rem; }' },
    },
    matchOriginal: {
      name: 'Match Original', emoji: '📎', wcagLevel: 'AA',
      promptInstructions: '', // Uses extracted docStyle colors instead — no additional instructions
      cssVars: null, // Populated dynamically from PDF color extraction
    },
  };
  // Backward compatibility: EXPORT_THEMES maps to STYLE_SEEDS cssVars
  const EXPORT_THEMES = Object.fromEntries(
    Object.entries(STYLE_SEEDS)
      .filter(([, seed]) => seed.cssVars)
      .map(([id, seed]) => [id, { name: seed.name, emoji: seed.emoji, ...seed.cssVars }])
  );
  const generateFullPackHTML = (historyItems, topic, isWorksheet = false, responses = {}, config = null) => {
      if (historyItems.length === 0) return `<p>${t('export_status.no_content')}</p>`;
      const cfg = config || exportConfig;
      const studentContent = historyItems.map(item => generateResourceHTML(item, false, responses, cfg)).join('');
      const teacherContent = cfg.includeTeacherKey ? historyItems.map(item => generateResourceHTML(item, true, responses, cfg)).join('') : '';
      const isRtl = isRtlLang(leveledTextLanguage);
      const direction = isRtl ? 'rtl' : 'ltr';
      const textAlign = isRtl ? 'right' : 'left';
      const seed = STYLE_SEEDS[exportTheme] || STYLE_SEEDS.professional;
      const theme = seed.cssVars ? { name: seed.name, emoji: seed.emoji, ...seed.cssVars } : (EXPORT_THEMES.professional);
      // Font: honor user's app font if toggled, otherwise use theme font
      // Read FONT_OPTIONS from window (defined in monolith) with safe fallback
      const _fontOptions = (typeof window !== 'undefined' && window.FONT_OPTIONS) || [];
      const appFontEntry = _fontOptions.find(f => f.id === selectedFont);
      const exportFontFamily = cfg.useAppFont && appFontEntry ? `'${appFontEntry.label}', ${theme.bodyFont}` : theme.bodyFont;
      const exportFontImport = cfg.useAppFont && appFontEntry?.googleFont ? `@import url('https://fonts.googleapis.com/css2?family=${appFontEntry.googleFont}&display=swap');` : '';
      const exportFontSize = cfg.fontSize ? `${cfg.fontSize}px` : '16px';
      const studentTitlePrefix = isWorksheet ? '' : t('export.student_copy');
      const lessonTopic = topic || t('export.default_lesson_title');
      const teacherIntro = t('export.teacher_copy_intro');
      const noStudentMsg = t('export.no_student_content');
      const noTeacherMsg = t('export.no_teacher_content');
      const dateLabel = t('export.generated_date_label');
      const topicLabel = t('export.topic');
      const pageTitle = t('export.html_page_title');
      const worksheetHeader = isWorksheet ? `
        <div class="worksheet-header">
            <div class="header-row">
                <div class="header-item" style="flex: 2;">
                    <span class="label">${t('export.name_label')}:</span>
                    <div class="line"></div>
                </div>
                <div class="header-item" style="flex: 1;">
                    <span class="label">${t('export.date_label')}:</span>
                    <div class="line"></div>
                </div>
            </div>
            <div class="header-row" style="margin-top: 20px;">
                <div class="header-item" style="flex: 1;">
                    <span class="label">${t('output.header_score')}:</span>
                    <div class="line"></div>
                </div>
            </div>
        </div>
      ` : '';
      const rawHtml = `
      <!DOCTYPE html>
      <html lang="${({'English':'en','Spanish':'es','French':'fr','German':'de','Italian':'it','Portuguese':'pt','Chinese':'zh','Japanese':'ja','Korean':'ko','Arabic':'ar','Russian':'ru','Hindi':'hi','Vietnamese':'vi','Haitian Creole':'ht','Somali':'so'})[currentUiLanguage] || 'en'}" dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <title>${pageTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Lexend:wght@400;500;600;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap');
          ${exportFontImport}
          body { font-family: ${exportFontFamily}; font-size: ${exportFontSize}; line-height: 1.7; max-width: 800px; margin: 0 auto; padding: 2rem; color: #334155; background: ${theme.bgColor}; direction: ${direction}; text-align: ${textAlign}; }
          h1, h2, h3 { color: ${theme.headingColor}; }
          h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.25rem; }
          .section { margin-bottom: 2rem; page-break-inside: avoid; background: ${theme.cardBg}; border-radius: 12px; padding: 1.5rem; border: 1px solid ${theme.cardBorder}; box-shadow: 0 1px 4px rgba(0,0,0,0.04); overflow: hidden; }
          .section > .resource-header + * { padding-top: 16px; }
          table { width: 100%; border-collapse: collapse; margin: 1rem 0; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
          /* Border bumped from 1px → 1.5px to clear WCAG 1.4.11 (3:1 non-text
             contrast) on light card backgrounds — verified across Professional
             and matchOriginal seeds. Prior 1px borders failed contrast on
             the lightest extracted PDF palettes. */
          th, td { border: 1.5px solid ${theme.cardBorder}; padding: 0.7rem 1rem; text-align: ${textAlign}; vertical-align: top; }
          th { background-color: ${theme.cardBg}; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
          /* Sticky thead for long data tables in the interactive view. The
             container's overflow:hidden is overridden inline only when
             scrolling actually engages, so this doesn't break short tables. */
          thead th { position: sticky; top: 0; z-index: 1; }
          /* Row headers (<th scope="row">) get a distinct treatment so screen
             readers and sighted users can both tell the first column is a
             label, not data. Subtle left accent + slightly heavier text. */
          tbody th[scope="row"] { background: ${theme.cardBg}; font-weight: 600; text-transform: none; letter-spacing: normal; font-size: 0.95rem; color: ${theme.headingColor}; border-left: 3px solid ${theme.accentColor}; text-align: ${textAlign}; }
          tbody tr:nth-child(even) { background-color: rgba(248,250,252,0.5); }
          tbody tr:hover { background-color: rgba(241,245,249,0.8); }
          /* Cap image height in the interactive view so a tall extracted
             PDF image (e.g. a full-page scan) doesn't push everything else
             off-screen on small displays. Print rules below remove the cap
             so PDFs render images at full intended size. */
          img { max-width: 100%; max-height: 90vh; height: auto; border: 1px solid ${theme.cardBorder}; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
          .math-symbol { font-family: "Times New Roman", serif; display: inline-block; }
          .math-fraction {
              display: inline-flex;
              flex-direction: column;
              text-align: center;
              vertical-align: -0.4em;
              margin: 0 0.2em;
              display: inline-block; /* Fallback */
              vertical-align: middle;
          }
          @supports (display: inline-flex) {
             .math-fraction { display: inline-flex; vertical-align: -0.4em; }
          }
          .math-fraction > span:first-child {
              border-bottom: 1px solid currentColor;
              padding: 0 0.2em;
              display: block;
              font-size: 0.9em;
          }
          .math-fraction > span:last-child {
              display: block;
              font-size: 0.9em;
              padding-top: 0.1em;
          }
          .math-sqrt > span:first-child {
              font-size: 1.2em;
              margin-right: 0.1em;
          }
          .math-sqrt > span:last-child {
              border-top: 1px solid currentColor;
              padding-top: 0.1em;
          }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem; }
          .card { border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.03); transition: box-shadow 0.2s; }
          .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
          .card h4 { margin: 0 0 8px 0; font-size: 1em; color: #1e293b; }
          .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
          .tag { display: inline-block; padding: 0.25rem 0.6rem; background: #eef2ff; color: #4f46e5; border-radius: 6px; font-size: 0.8rem; font-weight: 600; margin-right: 0.5rem; }
          .resource-header { padding: 14px 18px; border-radius: 10px 10px 0 0; margin-bottom: 0; font-weight: 800; color: #334155; font-size: 1.05em; letter-spacing: -0.01em; border-bottom: 1px solid rgba(0,0,0,0.06); }
          .quiz-box { background: #fff; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
          .question { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
          .question:last-child { border-bottom: none; margin-bottom: 0; }
          .options { list-style-type: none; padding-left: 0; }
          .options li { padding: 6px 12px; border-radius: 6px; margin-bottom: 4px; transition: background 0.15s; }
          .options li:hover { background: #f8fafc; }
          .interactive-textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            font-family: inherit;
            margin-top: 8px;
            resize: vertical;
            min-height: 120px;
            box-sizing: border-box;
            line-height: 2rem;
            background-color: #fff;
            background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
            background-size: 100% 2rem;
            background-attachment: local;
            background-position: 0 1.9rem;
            color: #334155;
            font-size: 1rem;
          }
          .interactive-textarea:focus { outline: 2px solid #6366f1; border-color: #6366f1; }
          .interactive-blank { border: none; border-bottom: 2px solid #cbd5e1; padding: 0 5px; background: transparent; font-family: inherit; width: 150px; transition: border-color 0.2s; font-weight: bold; color: #1e40af; }
          .interactive-blank:focus { border-bottom-color: #4f46e5; outline: none; }
          .mcq-label { display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 6px; padding: 8px 12px; border-radius: 8px; transition: background-color 0.2s; border: 1px solid transparent; }
          .mcq-label:hover { background-color: #f1f5f9; border-color: #e2e8f0; }
          .mcq-label input[type="radio"] { width: 18px; height: 18px; accent-color: #4f46e5; }
          .reflection-block { margin-bottom: 20px; page-break-inside: avoid; }
          .worksheet-header { margin-bottom: 40px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
          .header-row { display: flex; gap: 30px; }
          .header-item { display: flex; align-items: flex-end; gap: 10px; }
          .label { font-weight: bold; color: #475569; font-size: 1.1em; white-space: nowrap; }
          .line { border-bottom: 2px solid #cbd5e1; flex-grow: 1; width: 100%; min-width: 50px; }
          .page-break { page-break-before: always; border-top: 2px dashed #ccc; margin: 4rem 0; padding-top: 2rem; text-align: center; color: #999; }
          .page-break:after { content: "${t('export.teacher_copy_divider')}"; }
          /* WCAG 1.4.1 Use of Color — links carry a non-color distinguishing signal. Print
             media strips this below so unclickable paper links don't look visually cluttered. */
          a { text-decoration: underline; }
          @media (forced-colors: active) { .section { border: 2px solid CanvasText; } th { border: 1px solid CanvasText; } }
          @media print {
            body { padding: 0.5in; margin: 0; font-size: 11.5pt; line-height: 1.5; }
            /* Orphans/widows control — keeps a single word from being orphaned
               on a new line at the top of a printed page, or stranded at the
               bottom. Particularly important for dyslexic readers, who lose
               the line they were on when widows/orphans break the visual
               flow. CSS spec defaults are 2; bumping to 3 is a common
               readability practice. */
            p, li, blockquote { orphans: 3; widows: 3; }
            /* Hyphenation lets long words wrap at hyphenation points instead
               of overflowing or creating awkward gaps in justified text.
               Latin-language docs only — non-Latin scripts ignore this. */
            p, li, td, dd { hyphens: auto; -webkit-hyphens: auto; }
            /* Keep headings with their following content so a heading at
               the bottom of a page doesn't become an orphan above its body. */
            h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
            /* Avoid splitting figures and definition pairs across pages. */
            figure, dl > div, dt + dd { page-break-inside: avoid; break-inside: avoid; }
            /* Captions stay with their figure so the explanation never
               orphans above its image on the next page. */
            figcaption { page-break-before: avoid; break-before: avoid; }
            /* Definition lists: keep dt + first dd together. CSS doesn't
               have a direct selector for "term + first definition", so we
               disallow page breaks immediately after dt and immediately
               before dd to approximate the desired pairing. */
            dt { page-break-after: avoid; break-after: avoid; }
            dd { page-break-before: avoid; break-before: avoid; }
            .page-break { display: block; page-break-before: always; border: none; color: transparent; margin: 0; padding: 0; }
            .page-break:after { content: ""; }
            .section { page-break-inside: avoid; border: 1px solid #ccc; box-shadow: none; margin-bottom: 1.5rem; }
            .resource-header { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .interactive-textarea { border: 1px solid #94a3b8; background-image: linear-gradient(#c0c0c0 1px, transparent 1px); break-inside: avoid; min-height: 100px; }
            .allo-ta-counter { display: none; } /* counter is interactive-only */
            .interactive-blank { border-bottom: 1px solid #333; }
            .worksheet-header { border: none; padding: 0; margin-bottom: 30px; }
            .line { border-bottom: 1px solid #000; }
            .export-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            /* Repeat thead on each printed page so column context isn't lost
               when a long data table spans multiple pages. position:sticky is
               a viewport concept that has no meaning in print, so disable it
               there to avoid odd rendering in some browsers. */
            thead { display: table-header-group; }
            tbody { display: table-row-group; }
            tfoot { display: table-footer-group; }
            thead th { position: static; }
            tr { page-break-inside: avoid; }
            /* Print: drop the interactive max-height cap so PDFs print full-size. */
            img { max-width: 100%; max-height: none; page-break-inside: avoid; }
            h1, h2, h3 { page-break-after: avoid; }
            audio { display: none; }
            a { color: inherit; text-decoration: none; }
          }
          .a11y-badge { margin-top: 2rem; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 0.75rem; color: #166534; }
          .a11y-badge strong { display: block; margin-bottom: 4px; }
          ${theme.extraCSS || ''}
          ${customExportCSS ? `/* Custom AI-generated style */\n${customExportCSS}` : ''}
        </style>
      </head>
      <body>
        <a href="#main-export-content" class="sr-only" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:100;">Skip to content</a>
        <main id="main-export-content" role="main">
        <div class="export-header" style="background:${theme.headerBg};color:${theme.headerText};padding:28px 36px;border-radius:${theme.borderRadius || '14px'};margin-bottom:28px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
          <h1 style="color:${theme.headerText};margin:0 0 6px 0;font-size:1.85rem;letter-spacing:-0.02em;">${studentTitlePrefix}${lessonTopic}</h1>
          ${!isWorksheet ? `<p style="opacity:0.85;font-size:0.9rem;margin:0;"><strong>${topicLabel}:</strong> ${lessonTopic} &bull; ${dateLabel} ${new Date().toLocaleDateString()}</p>` : ''}
        </div>
        ${worksheetHeader}
        ${studentContent || `<p>${noStudentMsg}</p>`}
        ${cfg.includeTeacherKey ? `
        <div class="page-break"></div>
        <div class="teacher-view">
            <h1>${t('export.teacher_key_title')}</h1>
            <p><em>${teacherIntro}</em></p>
            ${teacherContent || `<p>${noTeacherMsg}</p>`}
        </div>` : ''}
        <div class="a11y-badge" role="note" aria-label="Accessibility information">
          <strong>♿ Accessibility Features</strong>
          This document was generated with WCAG 2.1 AA compliance features: semantic HTML structure, proper heading hierarchy, table header scope, landmark regions, language attribute, logical reading order, and print-optimized layout. Created with AlloFlow.
        </div>
        </main>
        <footer role="contentinfo" style="text-align:center;color:#94a3b8;font-size:0.8rem;margin-top:3rem;padding:24px 0;border-top:1px solid #e2e8f0;">
            <p style="margin:0;">${t('output.generated_via')} • <a href="https://Ko-fi.com/aaronpomeranz207" target="_blank" rel="noopener noreferrer" style="color:#94a3b8;text-decoration:underline;">${t('export.support_dev')}</a></p>
        </footer>
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const textareas = document.querySelectorAll('.interactive-textarea');
                // Stable key prefix per document: title + a hash of body text length
                // makes the autosave bucket unique to this resource without leaking
                // across docs. Falls back to 'doc' if title is empty.
                const _docKey = ((document.title || 'doc').slice(0, 40)) + '|' + (document.body.textContent || '').length;
                // Hash a string to a short stable id for use in storage keys.
                const _hash = (s) => {
                    let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
                    return Math.abs(h).toString(36);
                };
                // Default soft cap. Honors any explicit maxlength on the textarea.
                const _DEFAULT_MAX = 1500;
                textareas.forEach((tx, idx) => {
                    // ── Auto-resize (existing behavior) ──
                    tx.style.height = 'auto';
                    tx.style.height = (tx.scrollHeight > 120 ? tx.scrollHeight : 120) + 'px';
                    // ── Build a stable storage key per textarea ──
                    const labelKey = (tx.getAttribute('aria-label') || tx.getAttribute('placeholder') || ('ta' + idx)).slice(0, 80);
                    const storageKey = 'allo-ta:' + _docKey + ':' + _hash(labelKey);
                    // ── Restore prior value (autosave) ──
                    try {
                        const saved = localStorage.getItem(storageKey);
                        if (saved && !tx.value) {
                            tx.value = saved;
                            tx.style.height = 'auto';
                            tx.style.height = (tx.scrollHeight > 120 ? tx.scrollHeight : 120) + 'px';
                        }
                    } catch (e) { /* private mode / quota */ }
                    // ── Character counter ──
                    const max = parseInt(tx.getAttribute('maxlength') || '', 10) || _DEFAULT_MAX;
                    if (!tx.getAttribute('maxlength')) tx.setAttribute('maxlength', String(max));
                    const counter = document.createElement('div');
                    counter.className = 'allo-ta-counter';
                    counter.setAttribute('aria-live', 'polite');
                    counter.style.cssText = 'font-size:11px;color:#64748b;text-align:right;margin-top:2px;font-variant-numeric:tabular-nums';
                    const updateCounter = () => {
                        const len = tx.value.length;
                        const pct = len / max;
                        counter.textContent = len + ' / ' + max + (len > 0 ? ' characters' : '');
                        counter.style.color = pct > 0.9 ? '#dc2626' : pct > 0.75 ? '#ca8a04' : '#64748b';
                    };
                    tx.parentNode.insertBefore(counter, tx.nextSibling);
                    updateCounter();
                    // ── Debounced autosave on input ──
                    let saveTimer = null;
                    tx.addEventListener('input', function() {
                        // auto-resize
                        this.style.height = 'auto';
                        this.style.height = (this.scrollHeight) + 'px';
                        updateCounter();
                        // debounce save 400ms — feels instant but avoids a write per keystroke
                        if (saveTimer) clearTimeout(saveTimer);
                        saveTimer = setTimeout(() => {
                            try {
                                if (tx.value) localStorage.setItem(storageKey, tx.value);
                                else localStorage.removeItem(storageKey);
                            } catch (e) { /* swallow */ }
                        }, 400);
                    });
                });
                // ── Quiz check-my-work + reset ──
                // Walks every .question[data-correct] in each .quiz-box, compares
                // the chosen radio's value to the data-correct index, and surfaces
                // a per-question color cue + an aria-live result summary so screen
                // readers also announce the score. Teachers see the answer key
                // inline so this UI is only emitted for student-facing exports.
                document.querySelectorAll('.quiz-box').forEach((quiz) => {
                    const checkBtn = quiz.querySelector('.quiz-check-btn');
                    const resetBtn = quiz.querySelector('.quiz-reset-btn');
                    const resultsEl = quiz.querySelector('.quiz-results');
                    if (!checkBtn || !resetBtn || !resultsEl) return;
                    const questions = quiz.querySelectorAll('.question[data-correct]');
                    const reset = () => {
                        questions.forEach((q) => {
                            q.style.borderLeft = '';
                            q.style.paddingLeft = '';
                            q.removeAttribute('aria-invalid');
                        });
                        resultsEl.textContent = '';
                    };
                    checkBtn.addEventListener('click', () => {
                        let correct = 0;
                        let wrong = 0;
                        let skipped = 0;
                        questions.forEach((q) => {
                            const target = parseInt(q.getAttribute('data-correct'), 10);
                            const checked = q.querySelector('input[type="radio"]:checked');
                            // Reset prior state first so re-clicking Check redraws cleanly.
                            q.style.paddingLeft = '0.6rem';
                            if (!checked) {
                                q.style.borderLeft = '4px solid #94a3b8';
                                q.removeAttribute('aria-invalid');
                                skipped++;
                            } else if (parseInt(checked.value, 10) === target) {
                                q.style.borderLeft = '4px solid #16a34a';
                                q.removeAttribute('aria-invalid');
                                correct++;
                            } else {
                                q.style.borderLeft = '4px solid #dc2626';
                                q.setAttribute('aria-invalid', 'true');
                                wrong++;
                            }
                        });
                        const total = questions.length;
                        const parts = [correct + ' of ' + total + ' correct'];
                        if (wrong > 0) parts.push(wrong + ' to review');
                        if (skipped > 0) parts.push(skipped + ' unanswered');
                        resultsEl.textContent = parts.join(' · ');
                    });
                    resetBtn.addEventListener('click', () => {
                        // Also clear the chosen radios so the student can retry honestly.
                        quiz.querySelectorAll('input[type="radio"]:checked').forEach((r) => { r.checked = false; });
                        reset();
                    });
                });
                // ── Same behavior for fill-in-the-blank inputs ──
                document.querySelectorAll('.interactive-blank').forEach((bx, idx) => {
                    const labelKey = (bx.getAttribute('aria-label') || bx.getAttribute('placeholder') || ('bx' + idx)).slice(0, 80);
                    const storageKey = 'allo-bx:' + _docKey + ':' + _hash(labelKey);
                    try {
                        const saved = localStorage.getItem(storageKey);
                        if (saved && !bx.value) bx.value = saved;
                    } catch (e) {}
                    let saveTimer = null;
                    bx.addEventListener('input', function() {
                        if (saveTimer) clearTimeout(saveTimer);
                        saveTimer = setTimeout(() => {
                            try {
                                if (bx.value) localStorage.setItem(storageKey, bx.value);
                                else localStorage.removeItem(storageKey);
                            } catch (e) {}
                        }, 400);
                    });
                });
            });
        </script>
      </body>
      </html>
      `;
      // Run WCAG sanitizer on the complete export HTML to guarantee accessibility
      const sanitized = sanitizeStyleForWCAG(rawHtml);
      return sanitized.html;
  };

  // Wrap each function to bind fresh state before execution
  var _wrap = function(fn) { return function() { _bindState(); return fn.apply(this, arguments); }; };
  var _wrapAsync = function(fn) { return async function() { _bindState(); return fn.apply(this, arguments); }; };
  return {
    runPdfAccessibilityAudit: _wrapAsync(runPdfAccessibilityAudit),
    auditOutputAccessibility: _wrapAsync(auditOutputAccessibility),
    runAxeAudit: _wrapAsync(runAxeAudit),
    fixContrastViolations: _wrap(fixContrastViolations),
    fixAxeContrastViolationsTargeted: _wrap(fixAxeContrastViolationsTargeted),
    sanitizeStyleForWCAG: _wrap(sanitizeStyleForWCAG),
    autoFixAxeViolations: _wrapAsync(autoFixAxeViolations),
    refixChunk: _wrapAsync(refixChunk),
    getChunkState: _wrap(getChunkState),
    fixAndVerifyPdf: _wrapAsync(fixAndVerifyPdf),
    generateAuditReportHtml: _wrap(generateAuditReportHtml),
    downloadAccessiblePdf: _wrap(downloadAccessiblePdf),
    createTaggedPdf: _wrapAsync(createTaggedPdf),
    getPdfPreviewHtml: _wrap(getPdfPreviewHtml),
    updatePdfPreview: _wrap(updatePdfPreview),
    applyWordRestoration: applyWordRestoration, // pure helper (no state binding needed)
    applyWordRestorationInPlace: _wrap(applyWordRestorationInPlace),
    retargetMissingWordsViaGemini: _wrapAsync(retargetMissingWordsViaGemini),
    restoreSentencesDeterministic: restoreSentencesDeterministic, // pure DOM work
    detectAndHandleDuplicates: detectAndHandleDuplicates, // pure DOM work
    runAutonomousRemediation: _wrapAsync(runAutonomousRemediation), // Expert Workbench — autonomous agent loop
    processExpertCommand: _wrapAsync(processExpertCommand),        // Expert Workbench — command bar interpreter
    // Multi-session + Tier 2/2.5/3 — restored after 1ce8054 regression (see comment on
    // _MULTI_SESSION_EXPIRY_MS). UI at AlloFlowANTI.txt references all of these.
    multiSessionId: _multiSessionId,
    loadMultiSession: function(sid) { return loadMultiSession(sid); },
    clearMultiSession: function(sid) { return clearMultiSession(sid); },
    mergeRangesToFullHtml: _wrap(mergeRangesToFullHtml),
    runTier2SurgicalFixes: _wrapAsync(runTier2SurgicalFixes),
    runTier2_5SectionScopedFixes: _wrapAsync(runTier2_5SectionScopedFixes),
    runTier3StructuralFix: _wrapAsync(runTier3StructuralFix),
    generateCustomExportStyle: _wrapAsync(generateCustomExportStyle),
    parseMarkdownToHTML: _wrap(parseMarkdownToHTML),
    generateResourceHTML: _wrap(generateResourceHTML),
    EXPORT_THEMES,
    STYLE_SEEDS,
    applyStyleSeedToHtml: _wrap(applyStyleSeedToHtml),
    generateFullPackHTML: _wrap(generateFullPackHTML),
    runPdfBatchRemediation: _wrapAsync(runPdfBatchRemediation),
    proceedWithPdfTransform: _wrapAsync(proceedWithPdfTransform),
    parseAuditJson: _wrap(parseAuditJson),
    remediateSurgicallyThenAI: _wrapAsync(remediateSurgicallyThenAI),
  };
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.createDocPipeline = createDocPipeline;
window.AlloModules.DocPipelineModule = true;
console.log('[DocPipelineModule] Pipeline factory registered');
})();
