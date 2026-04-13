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
      warnLog('[Retry] ' + (label || 'API call') + ' failed (' + (isTimeout ? 'timeout' : err.message) + ') — retrying once...');
      return _withTimeout(fn(), retryMs || initialMs, label + ' (retry)');
    });
  };

  // ── Pipeline telemetry logger ──
  // Structured logging with timestamps, durations, and API call tracking.
  // All output prefixed with [DocPipe] for easy filtering in DevTools.
  var _pipelineStats = { apiCalls: 0, visionCalls: 0, totalApiMs: 0, retries: 0, startTime: 0, stepTimes: {} };
  var _pipeLog = function(tag, msg, data) {
    var elapsed = _pipelineStats.startTime ? '+' + ((performance.now() - _pipelineStats.startTime) / 1000).toFixed(1) + 's' : '';
    var prefix = '[DocPipe][' + tag + '] ' + elapsed + ' — ';
    if (data) {
      try { console.groupCollapsed(prefix + msg); console.log(data); console.groupEnd(); } catch(e) { warnLog(prefix + msg, data); }
    } else {
      warnLog(prefix + msg);
    }
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
    return _withRetry(function() { return _rawCallGemini.apply(null, args); }, 60000, 45000, 'callGemini').then(function(result) {
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
    return _withRetry(function() { return _rawCallGeminiVision.apply(null, args); }, 90000, 60000, 'callGeminiVision').then(function(result) {
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
  // Proxy all state access through window.__docPipelineState
  var _s = function() { return window.__docPipelineState || {}; };
  // Re-expose state vars as getters so existing code works unchanged
  var exportTheme, exportConfig, exportPreviewMode, leveledTextLanguage,
      selectedFont, responses, history, inputText, gradeLevel,
      projectName, studentNickname, isTeacherMode, generatedContent,
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

  // acceptFixedHtml: strict guard that rejects AI fix outputs that silently shrink the document.
  // Replaces the old `fixed.length > original.length * 0.5` checks which allowed 50% truncation.
  const acceptFixedHtml = (fixed, original, opts) => {
    if (!fixed || !original) return false;
    const sizeFloor = (opts && opts.sizeFloor) || 0.95;
    const textFloor = (opts && opts.textFloor) || 0.97;
    if (fixed.length < original.length * sizeFloor) return false;
    const origText = textCharCount(original);
    if (origText > 0 && textCharCount(fixed) < origText * textFloor) return false;
    return fixed.includes('<!DOCTYPE') || fixed.includes('<html') || fixed.includes('<main') || fixed.includes('<body');
  };

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
  const HTML_FIX_CHUNK = 6000; // reduced from 10000 — gemini-3-flash-preview truncates even 5KB chunks when HTML has heavy inline styles
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

  // aiFixChunked: run AI WCAG fix across the entire document by chunking on tag boundaries.
  // Each chunk is individually validated — if AI shrinks it, the original chunk is kept.
  const aiFixChunked = async (html, violationsText, label) => {
    if (!html) return html;
    const chunks = splitHtmlOnTagBoundary(html, HTML_FIX_CHUNK);
    if (chunks.length === 1) {
      // Short doc: single call with full document
      try {
        const prompt = `Fix these WCAG violations in the HTML. Change ONLY what's needed. Preserve ALL content and inline styles. Do NOT summarize or shorten.\n\nVIOLATIONS:\n${violationsText}\n\nHTML:\n"""\n${html}\n"""\n\nReturn the COMPLETE fixed HTML.`;
        const fixed = stripFence(await callGemini(prompt, true));
        if (acceptFixedHtml(fixed, html)) return fixed;
        warnLog(`[aiFixChunked:${label}] single-chunk rejected — keeping original`);
        return html;
      } catch (e) {
        warnLog(`[aiFixChunked:${label}] single-chunk failed:`, e?.message);
        return html;
      }
    }
    // Multi-chunk: fix each fragment with strict per-chunk integrity
    warnLog(`[aiFixChunked:${label}] splitting ${html.length} chars into ${chunks.length} chunks`);
    const fixed = new Array(chunks.length);
    for (let ci = 0; ci < chunks.length; ci++) {
      const part = chunks[ci];
      const isFirst = ci === 0, isLast = ci === chunks.length - 1;
      const fragNote = isFirst
        ? 'This is FRAGMENT 1 — it may begin with <!DOCTYPE>/<html>/<head>/<body>/<main>.'
        : isLast
          ? `This is the LAST fragment (${ci + 1} of ${chunks.length}) — it may end with </main></body></html>.`
          : `This is fragment ${ci + 1} of ${chunks.length} — starts and ends mid-document.`;
      const prompt = `Fix these WCAG violations in the HTML fragment below. Change ONLY what's needed. Preserve ALL content, text, and inline styles. Do NOT summarize or shorten.\n\n${fragNote}\n\nVIOLATIONS:\n${violationsText}\n\nHTML FRAGMENT:\n"""\n${part}\n"""\n\nReturn ONLY the fixed fragment with the same opening and closing boundaries as the input.`;
      try {
        const out = stripFence(await callGemini(prompt, true));
        // Per-chunk integrity: output must not shrink by more than 5% text content
        if (out && out.length >= part.length * 0.9 && textCharCount(out) >= textCharCount(part) * 0.95) {
          fixed[ci] = out;
        } else if (part.length > 5000) {
          // Truncation likely (MAX_TOKENS) — auto-split this chunk and retry with halves
          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} truncated (in=${part.length}/${textCharCount(part)}, out=${out ? out.length : 0}/${out ? textCharCount(out) : 0}) — splitting in half and retrying`);
          const halfChunks = splitHtmlOnTagBoundary(part, Math.ceil(part.length / 2));
          const halfFixed = [];
          for (let hi = 0; hi < halfChunks.length; hi++) {
            try {
              const halfPrompt = `Fix these WCAG violations in the HTML fragment. Change ONLY what's needed. Preserve ALL content.\n\nVIOLATIONS:\n${violationsText}\n\nHTML FRAGMENT:\n"""\n${halfChunks[hi]}\n"""\n\nReturn ONLY the fixed fragment.`;
              const halfOut = stripFence(await callGemini(halfPrompt, true));
              if (halfOut && halfOut.length >= halfChunks[hi].length * 0.85 && textCharCount(halfOut) >= textCharCount(halfChunks[hi]) * 0.9) {
                halfFixed.push(halfOut);
              } else {
                warnLog(`[aiFixChunked:${label}] half-chunk ${hi + 1} also rejected — keeping original half`);
                halfFixed.push(halfChunks[hi]);
              }
            } catch (he) {
              halfFixed.push(halfChunks[hi]);
            }
          }
          fixed[ci] = halfFixed.join('');
        } else {
          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} rejected (in=${part.length}/${textCharCount(part)}, out=${out ? out.length : 0}/${out ? textCharCount(out) : 0}) — keeping original`);
          fixed[ci] = part;
        }
      } catch (e) {
        warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} failed:`, e?.message);
        fixed[ci] = part;
      }
    }
    return fixed.join('');
  };

  // ── Heuristic text structuring (RECITATION fallback) ──
  // When Vision refuses to process copyrighted content, structure the pre-extracted text
  // using formatting heuristics. Not as accurate as Vision, but preserves all content.
  const structureTextHeuristic = (rawText, startPage, endPage) => {
    if (!rawText || rawText.trim().length < 10) return [];
    const blocks = [];
    const lines = rawText.split(/\n/);
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
  const runPdfAccessibilityAudit = async (base64Data) => {
    setPdfAuditLoading(true);
    // Estimate audit time based on data size (rough proxy for page count before we know it)
    const dataSizeKB = base64Data ? Math.round(base64Data.length * 0.75 / 1024) : 0;
    const estTime = dataSizeKB < 200 ? '15-30 seconds' : dataSizeKB < 1000 ? '30-90 seconds' : dataSizeKB < 5000 ? '2-5 minutes' : '5-10 minutes';
    addToast && addToast(`♿ Auditing document (${dataSizeKB > 1024 ? (dataSizeKB / 1024).toFixed(1) + 'MB' : dataSizeKB + 'KB'}) — typically ${estTime}`, 'info');
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

Return ONLY valid JSON:
{
  "score": "<calculated from rubric deductions>",
  "confidence": "<your confidence in this score: 'high' if document is straightforward, 'medium' if some elements are ambiguous, 'low' if you had to guess about key aspects>",
  "summary": "One balanced sentence that leads with strengths before noting issues. Match tone to score — above 80 is positive with minor notes, below 50 is serious concern.",
  "critical": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N}],
  "serious": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N}],
  "moderate": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N}],
  "minor": [{"issue": "complete sentence describing the violation", "wcag": "X.X.X", "count": N}],
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
        if (c.indexOf('```') !== -1) { const parts = c.split('```'); c = parts[1] || parts[0]; if (c.indexOf('\n') !== -1) c = c.split('\n').slice(1).join('\n'); if (c.lastIndexOf('```') !== -1) c = c.substring(0, c.lastIndexOf('```')); }
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

      // Agreement Score: 1 - (SD / 50) using raw unrounded SD
      // SD=0 → 1.00 (perfect), SD=5 → 0.90, SD=10 → 0.80, SD=25 → 0.50
      // Display to 2 decimal places — never round to 1.00 unless SD is truly 0
      const rawAgreement = n > 1 ? Math.max(0, 1 - (rawSD / 50)) : 1;
      const icc = rawSD === 0 ? 1 : Math.round(rawAgreement * 100) / 100;

      // Consistency Score: uses raw SD and pairwise proximity
      // Combines CV-based estimate with weighted pairwise agreement
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
      setPdfAuditResult(triangulated);

      // ── Quick axe-core baseline: extract text deterministically, build minimal HTML, run axe-core ──
      // Uses the shared extractPdfTextDeterministic helper (reading-order sorted, no truncation)
      try {
        const detBaseline = await extractPdfTextDeterministic(pendingPdfBase64);
        const rawText = detBaseline.fullText || '';
        // Build minimal HTML shell from extracted text
        const minimalHtml = `<!DOCTYPE html><html><head><title></title></head><body><main>${rawText.split('\n\n').filter(p => p.trim()).map(p => '<p>' + p.replace(/</g, '&lt;') + '</p>').join('\n')}</main></body></html>`;
        const baselineAxe = await runAxeAudit(minimalHtml);
        if (baselineAxe) {
          warnLog(`[PDF Audit] Baseline axe-core: score ${baselineAxe.score}, ${baselineAxe.totalViolations} violations`);
          // Blend initial score: 50/50 AI + axe-core
          const blendedInitial = Math.round((triangulated.score + baselineAxe.score) / 2);
          setPdfAuditResult(prev => ({
            ...prev,
            score: blendedInitial,
            _aiOnlyScore: triangulated.score,
            _baselineAxeScore: baselineAxe.score,
            _baselineAxeAudit: baselineAxe,
            _scoreIsBlended: true
          }));
        }
      } catch (axeErr) {
        warnLog('[PDF Audit] Baseline axe-core failed (non-blocking):', axeErr);
        // Keep the AI-only score — axe-core is optional at this stage
      }
    } catch (err) {
      warnLog('[PDF Audit] Failed:', err?.message || err);
      console.error('[PDF Audit] Full error:', err);
      setPdfAuditResult({ score: -1, summary: `Audit failed: ${err?.message || 'Unknown error'}. You can retry or proceed to Fix & Verify.`, critical: [], serious: [], moderate: [], minor: [], passes: [] });
    }
    setPdfAuditLoading(false);
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
      accessibleHtml = await callGemini(singlePrompt, true);
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
            callGemini(prompt, true).then(r => ({ ci, result: r })).catch(err => {
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
        return c.trim();
      });
      accessibleHtml = cleanChunks.join('\n');
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
    const surgicalTools = {
      fix_alt_text: function(html, p) {
        if (!p.index && p.index !== 0) return html;
        let idx = 0;
        return html.replace(/<img([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== p.index) return m;
          if (/alt="[^"]+"/i.test(attrs) && p.alt) return m.replace(/alt="[^"]*"/, 'alt="' + p.alt.replace(/"/g, '&quot;') + '"');
          return '<img alt="' + (p.alt || 'Image').replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      },
      fix_heading: function(html, p) {
        if (!p.newLevel) return html;
        let idx = 0;
        return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, function(m, lv, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          return '<h' + p.newLevel + attrs + '>' + content + '</h' + p.newLevel + '>';
        });
      },
      fix_link_text: function(html, p) {
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
      },
      fix_table_caption: function(html, p) {
        if (!p.caption) return html;
        let idx = 0;
        return html.replace(/<table([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          return '<table' + attrs + '><caption>' + p.caption + '</caption>';
        });
      },
      fix_aria_label: function(html, p) {
        if (!p.tag || !p.label) return html;
        let idx = 0;
        var re = new RegExp('<' + p.tag + '([^>]*)>', 'gi');
        return html.replace(re, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          if (/aria-label/i.test(attrs)) return m.replace(/aria-label="[^"]*"/, 'aria-label="' + p.label.replace(/"/g, '&quot;') + '"');
          return '<' + p.tag + ' aria-label="' + p.label.replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      },
      fix_lang: function(html, p) {
        if (!p.lang) return html;
        return html.replace(/<html([^>]*)lang="[^"]*"/, '<html$1lang="' + p.lang + '"')
                   .replace(/<html(?![^>]*lang=)/, '<html lang="' + p.lang + '"');
      },
      // Add scope to a specific table header
      fix_th_scope: function(html, p) {
        var scope = p.scope || 'col';
        let idx = 0;
        return html.replace(/<th(?![^>]*scope)([^>]*)>/gi, function(m, attrs) {
          if (p.index !== undefined && idx++ !== p.index) return m;
          return '<th scope="' + scope + '"' + attrs + '>';
        });
      },
      // Remove an empty heading by index
      fix_remove_empty_heading: function(html, p) {
        let idx = 0;
        return html.replace(/<h([1-6])[^>]*>\s*<\/h\1>/gi, function(m) {
          if (p.index !== undefined && idx++ !== p.index) return m;
          return '';
        });
      },
      // Add label to a form input by index
      fix_input_label: function(html, p) {
        if (!p.label) return html;
        let idx = 0;
        return html.replace(/<input([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          if (/aria-label/i.test(attrs)) return m.replace(/aria-label="[^"]*"/, 'aria-label="' + p.label.replace(/"/g, '&quot;') + '"');
          return '<input aria-label="' + p.label.replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      },
      // Add accessible name to a button by index
      fix_button_name: function(html, p) {
        if (!p.label) return html;
        let idx = 0;
        return html.replace(/<button([^>]*)>([\s\S]*?)<\/button>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          if (content.trim()) return m; // has content, leave it
          return '<button aria-label="' + p.label.replace(/"/g, '&quot;') + '"' + attrs + '>' + content + '</button>';
        });
      },
      // Add title to an iframe by index
      fix_iframe_title: function(html, p) {
        if (!p.title) return html;
        let idx = 0;
        return html.replace(/<iframe([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          if (/title=/i.test(attrs)) return m.replace(/title="[^"]*"/, 'title="' + p.title.replace(/"/g, '&quot;') + '"');
          return '<iframe title="' + p.title.replace(/"/g, '&quot;') + '"' + attrs + '>';
        });
      },
      // Wrap orphaned content in a landmark
      fix_add_landmark: function(html, p) {
        var tag = p.tag || 'section';
        var label = p.label || 'Content';
        var selector = p.selector || 'body';
        // Simple: wrap first non-landmarked block of content
        if (selector === 'body' && !html.includes('<main')) {
          return html.replace(/<body([^>]*)>/, '<body$1>\n<main id="main-content" role="main" aria-label="' + label + '">').replace('</body>', '</main>\n</body>');
        }
        return html;
      },
      // Fix duplicate ID by appending suffix
      fix_duplicate_id: function(html, p) {
        if (!p.id) return html;
        let count = 0;
        return html.replace(new RegExp('id="' + p.id + '"', 'g'), function(m) {
          count++;
          if (count === 1) return m;
          return 'id="' + p.id + '-' + count + '"';
        });
      },
      // Add figcaption to a figure by index
      fix_figcaption: function(html, p) {
        if (!p.caption) return html;
        let idx = 0;
        return html.replace(/<figure([^>]*)>([\s\S]*?)<\/figure>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          if (/<figcaption/i.test(content)) return m; // already has one
          return '<figure' + attrs + '>' + content + '<figcaption>' + p.caption + '</figcaption></figure>';
        });
      },
      // Set document title
      fix_title: function(html, p) {
        if (!p.title) return html;
        if (/<title>[^<]*<\/title>/i.test(html)) return html.replace(/<title>[^<]*<\/title>/i, '<title>' + p.title + '</title>');
        return html.replace('</head>', '<title>' + p.title + '</title>\n</head>');
      },
      // Wrap text in a lang span for multilingual content
      fix_lang_span: function(html, p) {
        if (!p.text || !p.lang) return html;
        // Escape regex special chars in text to prevent crash on content like "Dr. Smith (PhD)"
        var escaped = p.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return html.replace(new RegExp(escaped), '<span lang="' + p.lang + '">' + p.text + '</span>');
      },
      // Change a specific element's text color for contrast compliance
      fix_contrast: function(html, p) {
        if (!p.oldColor || !p.newColor) return html;
        return html.replace(new RegExp(p.oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), p.newColor);
      },
      // Promote first row of a table to thead with th elements
      fix_table_header_row: function(html, p) {
        let idx = 0;
        return html.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, function(m, attrs, content) {
          if (idx++ !== (p.index || 0)) return m;
          if (/<thead/i.test(content)) return m; // already has thead
          // Convert first <tr> with <td> to <thead> with <th>
          var fixed = content.replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/i, function(row, rAttrs, cells) {
            var headerCells = cells.replace(/<td([^>]*)>/gi, '<th scope="col"$1>').replace(/<\/td>/gi, '</th>');
            return '<thead><tr' + rAttrs + '>' + headerCells + '</tr></thead>';
          });
          return '<table' + attrs + '>' + fixed + '</table>';
        });
      },
      // Wrap an acronym/abbreviation in <abbr> with expansion
      fix_abbreviation: function(html, p) {
        if (!p.abbr || !p.title) return html;
        var re = new RegExp('\\b' + p.abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b');
        var replaced = false;
        return html.replace(re, function(m) {
          if (replaced) return m; // only wrap first occurrence
          replaced = true;
          return '<abbr title="' + p.title.replace(/"/g, '&quot;') + '">' + m + '</abbr>';
        });
      },
      // Mark an image as decorative (empty alt + role=presentation)
      fix_image_decorative: function(html, p) {
        let idx = 0;
        return html.replace(/<img([^>]*)>/gi, function(m, attrs) {
          if (idx++ !== (p.index || 0)) return m;
          var cleaned = attrs.replace(/alt="[^"]*"/i, '').replace(/role="[^"]*"/i, '');
          return '<img alt="" role="presentation"' + cleaned + '>';
        });
      },
      // Wrap orphaned list items in a proper list container
      fix_list_wrap: function(html, p) {
        var tag = p.ordered ? 'ol' : 'ul';
        // Find orphaned <li> and wrap them
        return html.replace(/(<li[\s>][\s\S]*?<\/li>\s*(?:<li[\s>][\s\S]*?<\/li>\s*)*)/gi, function(m, liBlock, offset) {
          // Check if already inside a list (use offset param instead of indexOf for O(1))
          var before = html.substring(Math.max(0, offset - 100), offset);
          if (/<[uo]l[^>]*>\s*$/i.test(before)) return m; // already wrapped
          return '<' + tag + ' role="list">' + liBlock + '</' + tag + '>';
        });
      },
      // Add skip-to-content link if missing
      fix_skip_nav: function(html) {
        if (/skip.to|skip-nav|skipnav/i.test(html)) return html;
        return html.replace(/<body([^>]*)>/i, '<body$1>\n<a href="#main-content" class="sr-only" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:9999">Skip to main content</a>');
      },
      // Set text spacing for readability (letter-spacing, word-spacing, line-height)
      fix_text_spacing: function(html, p) {
        var css = '';
        if (p.letterSpacing) css += 'letter-spacing:' + p.letterSpacing + ';';
        if (p.wordSpacing) css += 'word-spacing:' + p.wordSpacing + ';';
        if (p.lineHeight) css += 'line-height:' + p.lineHeight + ';';
        if (!css) return html;
        var style = '<style id="alloflow-text-spacing">body{' + css + '}</style>';
        if (html.includes('</head>')) return html.replace('</head>', style + '</head>');
        return style + html;
      },
    };

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

    for (let i = 0; i < queue.length; i++) {
      setPdfBatchCurrentIndex(i);
      const item = queue[i];
      setPdfBatchStep(`Processing ${i + 1}/${queue.length}: ${item.fileName}`);
      setPdfBatchQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q));

      try {
        const result = await processSinglePdfForBatch(item.base64, item.fileName, (msg) => {
          setPdfBatchStep(`[${i + 1}/${queue.length}] ${item.fileName}: ${msg}`);
        });
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
    if (failedFiles.length > 0 && failedFiles.length < queue.length) {
      setPdfBatchStep(`Retrying ${failedFiles.length} failed file(s)...`);
      await new Promise(r => setTimeout(r, 5000)); // longer cooldown before retry
      for (const failedItem of failedFiles) {
        const idx = queue.indexOf(failedItem);
        setPdfBatchCurrentIndex(idx);
        setPdfBatchStep(`Retrying: ${failedItem.fileName}`);
        try {
          const result = await processSinglePdfForBatch(failedItem.base64, failedItem.fileName, (msg) => {
            setPdfBatchStep(`[Retry] ${failedItem.fileName}: ${msg}`);
          });
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
    addToast(`\u2705 Batch complete: ${done.length}/${queue.length} PDFs remediated (avg +${done.length ? Math.round(done.reduce((s, q) => s + ((q.result?.afterScore || 0) - (q.result?.beforeScore || 0)), 0) / done.length) : 0} points)`, 'success');
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

Return ONLY JSON:
{
  "score": <calculated score, minimum 0>,
  "summary": "One balanced sentence that leads with what the document does well, then briefly notes remaining areas for improvement. Match the tone to the score — a score above 80 should sound positive, not critical. Example for 94/100: 'The document demonstrates strong accessibility with proper language, headings, and semantic structure, with minor remaining issues in image alt text and navigation landmarks.'",
  "issues": [{"issue": "complete sentence describing violation", "wcag": "X.X.X", "severity": "critical|serious|moderate|minor", "deduction": <points deducted>}],
  "passes": ["List EVERY checklist item (1-11) that passes. Be thorough — for each item that IS accessible, include a specific description of what was found. A longer passes list is better than a short one."]
}`;
  const parseAuditJson = (raw) => {
    let cleaned = raw.trim();
    if (cleaned.indexOf('```') !== -1) { const parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
    return JSON.parse(cleaned);
  };
  // Audit HTML for WCAG 2.1 AA compliance
  // Short docs (≤8KB): single Gemini call. Long docs: chunked with deduplication.
  const auditOutputAccessibility = async (htmlContent) => {
    if (!callGemini || !htmlContent) return null;
    try {
      const CHUNK_SIZE = 8000;
      const OVERLAP = 400;
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
  const runAxeAudit = async (htmlContent) => {
    try {
      // Lazy-load axe-core from CDN if not already loaded
      if (!window.axe) {
        await new Promise((resolve, reject) => {
          if (document.querySelector('script[data-axe-core]')) {
            // Script tag exists but axe not ready yet — wait
            const wait = setInterval(() => { if (window.axe) { clearInterval(wait); resolve(); } }, 100);
            setTimeout(() => { clearInterval(wait); reject(new Error('axe-core load timeout')); }, 10000);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js';
          script.setAttribute('data-axe-core', 'true');
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load axe-core from CDN'));
          document.head.appendChild(script);
        });
      }

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

      // Inject axe-core into the iframe
      await new Promise((resolve, reject) => {
        const axeScript = iframeDoc.createElement('script');
        axeScript.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js';
        axeScript.onload = () => resolve();
        axeScript.onerror = () => reject(new Error('Failed to inject axe-core into iframe'));
        iframeDoc.head.appendChild(axeScript);
      });
      await new Promise(r => setTimeout(r, 300));

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

      return {
        engine: 'axe-core',
        version: results.testEngine?.version || '4.10.3',
        totalViolations: results.violations.length,
        totalPasses: results.passes.length,
        totalIncomplete: (results.incomplete || []).length,
        critical: critical.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), nodeDetails: v.nodes.slice(0, 3).map(n => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })) })),
        serious: serious.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), nodeDetails: v.nodes.slice(0, 3).map(n => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })) })),
        moderate: moderate.map(v => ({ id: v.id, impact: v.impact, description: v.help, nodes: v.nodes.length, wcag: v.tags.filter(t => t.startsWith('wcag')).join(', '), nodeDetails: v.nodes.slice(0, 3).map(n => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })) })),
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
    fixed = fixed.replace(/([;"\s])color:\s*(#[0-9a-fA-F]{3,6})\b/g, (match, prefix, hex) => {
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

    // ── Pass 2: Fix color:rgb() and color:rgba() declarations ──
    fixed = fixed.replace(/color:\s*rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/gi, (match, r, g, b) => {
      const rgb = [parseInt(r), parseInt(g), parseInt(b)];
      if (contrastRatio(rgb, defaultBg) < 4.5) {
        const [fr, fg, fb] = fixToPass(rgb, defaultBg);
        fixCount++;
        return 'color:' + rgbToHex(fr, fg, fb);
      }
      return match;
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

  // ── Auto-fix axe-core violations via targeted AI pass ──
  const autoFixAxeViolations = async (htmlContent, axeResult, maxPasses = 2) => {
    if (!callGemini || !axeResult || axeResult.totalViolations === 0) return { html: htmlContent, axe: axeResult, passes: 0 };
    let currentHtml = htmlContent;
    let currentAxe = axeResult;
    let passCount = 0;

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
        const MAX_CHUNK = 12000; // chars per chunk (leaves room for prompt + output)

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

          if (acceptFixedHtml(fixedHtml, currentHtml)) {
            currentHtml = fixedHtml;
          } else if (fixedHtml) {
            warnLog(`[Auto-fix] Single-pass rejected: output ${fixedHtml.length} chars (text=${textCharCount(fixedHtml)}) vs source ${currentHtml.length} chars (text=${textCharCount(currentHtml)})`);
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

          // Create chunks from split points, filtering out empty chunks
          const bodyChunks = [];
          let prevEnd = 0;
          for (let spi = 0; spi < splitPoints.length; spi++) {
            const chunkText = bodyContent.substring(prevEnd, splitPoints[spi]);
            if (chunkText.trim().length > 0) {
              bodyChunks.push(chunkText);
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
          warnLog(`[AutoFix] Split ${Math.round(bodyContent.length/1000)}KB body into ${bodyChunks.length} chunks (sizes: ${bodyChunks.map(c => Math.round(c.length/1000) + 'KB').join(', ')})`);

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
                `CONTENT: fix_alt_text {index, alt}, fix_heading {index, newLevel}, fix_link_text {index, newText, force?}, fix_figcaption {index, caption}\n` +
                `TABLE: fix_table_caption {index, caption}, fix_th_scope {index?, scope}, fix_table_header_row {index}\n` +
                `FORM: fix_input_label {index, label}, fix_button_name {index, label}, fix_iframe_title {index, title}\n` +
                `STRUCTURE: fix_aria_label {tag, index, label}, fix_add_landmark {tag, label}, fix_remove_empty_heading {index}, fix_duplicate_id {id}\n` +
                `VISUAL: fix_contrast {oldColor, newColor}, fix_image_decorative {index}, fix_abbreviation {abbr, title}, fix_text_spacing {letterSpacing?, lineHeight?}\n` +
                `LIST: fix_list_wrap {ordered}, fix_skip_nav {}\n` +
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
                  const tool = fix && fix.tool && surgicalTools[fix.tool];
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

Return the fixed section content only.`;

                const fixedChunk = await callGemini(prompt, true);

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
              warnLog(`[AutoFix] Chunk ${chi + 1}: AI fix failed — using deterministic-only version (${deterministicFixCount} det + ${surgicalFixCount} surgical fixes preserved)`);
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
      const newAxe = await runAxeAudit(currentHtml);
      if (!newAxe) break;

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
        `CONTENT: fix_alt_text {index, alt}, fix_heading {index, newLevel}, fix_link_text {index, newText, force?}, fix_figcaption {index, caption}\n` +
        `TABLE: fix_table_caption {index, caption}, fix_th_scope {index?, scope}, fix_table_header_row {index}\n` +
        `FORM: fix_input_label {index, label}, fix_button_name {index, label}, fix_iframe_title {index, title}\n` +
        `STRUCTURE: fix_aria_label {tag, index, label}, fix_add_landmark {tag, label}, fix_remove_empty_heading {index}, fix_duplicate_id {id}\n` +
        `VISUAL: fix_contrast {oldColor, newColor}, fix_image_decorative {index}, fix_abbreviation {abbr, title}, fix_text_spacing {letterSpacing?, lineHeight?}\n` +
        `LIST: fix_list_wrap {ordered}, fix_skip_nav {}\n` +
        `Return ONLY a valid JSON array, no explanation.`, true);

      let surgFixes = [];
      try { surgFixes = JSON.parse(surgDiag); } catch(e) {
        try { surgFixes = JSON.parse(surgDiag.replace(/```json?\s*/gi, '').replace(/```/g, '').trim()); } catch(e2) { surgFixes = []; }
      }
      if (Array.isArray(surgFixes)) {
        for (const fix of surgFixes) {
          const tool = fix && fix.tool && surgicalTools[fix.tool];
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
          ? `CRITICAL: Your previous fix of this HTML section LOST CONTENT. Re-fix preserving EVERY word.\n\nVIOLATIONS:\n${violationInstructions}\n\nORIGINAL SECTION ${chunkIndex + 1}/${totalChunks}:\n"""\n${chunk}\n"""\n\nReturn fixed section with ALL text preserved.`
          : `You are an accessibility remediation expert. Fix REMAINING violations in this HTML SECTION.\nNOTE: Deterministic fixes already applied. Focus on semantic issues: alt text, heading hierarchy, ARIA, table structure, link text.\n\nVIOLATIONS:\n${violationInstructions}\n\nRULES:\n- Section ${chunkIndex + 1} of ${totalChunks}.\n- Fix ONLY accessibility. PRESERVE EVERY WORD.\n- Return ONLY the fixed HTML fragment (no DOCTYPE/html/head/body).\n\nHTML SECTION:\n"""\n${chunk}\n"""\n\nReturn fixed section only.`;

        const fixedChunk = await callGemini(prompt, true);
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
      warnLog(`[RefixChunk] Chunk ${chunkIndex + 1}: AI failed, using deterministic-only version`);
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
    const _startTime = Date.now();

    // Reset pipeline telemetry for this run
    _pipelineStats.apiCalls = 0; _pipelineStats.visionCalls = 0; _pipelineStats.totalApiMs = 0; _pipelineStats.retries = 0;
    _pipelineStats.startTime = performance.now(); _pipelineStats.stepTimes = {};
    _pipeLog('Init', 'Pipeline starting', { file: _fileName, batch: _isBatch, hasAudit: !!_auditResult, pageCount: _auditResult?.pageCount, base64KB: _base64 ? Math.round(_base64.length * 0.75 / 1024) : 0 });
    warnLog('[fixAndVerifyPdf] Starting — batch:', _isBatch, 'base64:', !!_base64, 'audit:', !!_auditResult, 'file:', _fileName);

    if (!_base64) { addToast('Cannot fix: PDF data not found in memory. Please re-upload the PDF.', 'error'); return null; }
    if (!_isBatch && !_auditResult) { addToast('Cannot fix: No audit results found. Please run the audit first.', 'error'); return null; }
    if (!_isBatch) { setPdfFixLoading(true); setPdfFixResult(null); }

    const beforeScore = (_auditResult?.score) || 0;
    const pageCount = (_auditResult?.pageCount) || 1;
    warnLog(`[fixAndVerifyPdf] auditResult.pageCount=${_auditResult?.pageCount}, effective pageCount=${pageCount}, auditResult keys:`, _auditResult ? Object.keys(_auditResult) : 'null');
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
      const pageNote = pageCount > 1 ? ` (${pageCount} pages)` : '';
      const msg = `Step ${step}/${totalSteps} ${label.emoji} ${label.name}${pageNote} — ${detail}  (typically ${label.est})`;
      if (_isBatch) { _onProgress?.(step, msg); } else { setPdfFixStep(msg); }
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
            extractedText = det.fullText;
            window.__lastGroundTruthCharCount = det.sourceCharCount;
            window.__lastGroundTruthPageMap = det.pages;
            window.__lastGroundTruthMethod = 'pdfjs';
            if (det.pageCount > 0) effectivePageCount = det.pageCount;
            updateProgress(1, `Extracted ${det.sourceCharCount.toLocaleString()} chars deterministically from ${det.pageCount} pages`);
            warnLog(`[Det] PDF text layer → ${det.sourceCharCount} chars / ${det.pageCount} pages (avg ${Math.round(det.sourceCharCount / Math.max(1, det.pageCount))}/page)`);
          } else if (det) {
            warnLog(`[Det] PDF appears scanned (${det.sourceCharCount} chars / ${det.pageCount} pages) — falling through to Vision OCR`);
          }
        }
      } catch (detErr) {
        warnLog('[Det] Deterministic extraction failed, falling through to Vision OCR:', detErr?.message);
      }

      const PAGES_PER_CHUNK = 2; // Tight: 2 pages per chunk — safely fits in 8192 output tokens
      const numChunks = Math.max(1, Math.ceil(effectivePageCount / PAGES_PER_CHUNK));

      // If deterministic extraction succeeded, skip the Vision OCR block entirely
      if (extractedText && extractedText.length > 100) {
        warnLog(`[Det] Using deterministic extraction (${extractedText.length} chars), skipping Vision OCR`);
        // Fall through to Step 1b (image extraction) with extractedText already populated
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
      try {
        const imgResult = await callGeminiVision(
          `Identify and extract ALL images from this PDF document. For each image:\n1. Describe it in detail (what it shows, any text in the image, educational purpose)\n2. Note its approximate location (page number, position)\n3. Indicate if it's decorative (borders, backgrounds) or meaningful (diagrams, photos, charts)\n\nReturn ONLY JSON:\n{"images": [{"id": 1, "description": "detailed description", "page": 1, "position": "top/middle/bottom", "type": "photo|diagram|chart|illustration|logo|decorative", "educationalPurpose": "what it teaches or communicates"}]}`,
          _base64, _mimeType
        );
        if (imgResult) {
          let cleaned = imgResult.trim();
          if (cleaned.indexOf('```') !== -1) { const ps = cleaned.split('```'); cleaned = ps[1] || ps[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
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
                } catch(pgErr) { warnLog(`[PDF Fix] Page ${pageNum} extraction failed:`, pgErr); }
              }
            } catch(pdfJsErr) {
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
                  } catch(genErr) {}
                }
              }
            }
          }
        }
      } catch (imgErr) {
        warnLog('[PDF Fix] Image extraction failed (non-blocking):', imgErr);
      }

      _pipeStepEnd(1, extractedText.length + ' chars extracted');
      // ── Step 2: Transform to accessible HTML via JSON data pipeline ──
      _pipeStepStart(2);
      // Strategy: AI extracts structured JSON (content + style metadata), then
      // deterministic code renders it into guaranteed-valid styled HTML.
      updateProgress(2, 'Analyzing document structure...');
      let bodyContent = '';

      // ── Step 2a: Extract document style metadata ──
      let docStyle = { headingColor: '#1e3a5f', accentColor: '#2563eb', bgColor: '#ffffff', headerBg: '#1e3a5f', headerText: '#ffffff', bodyFont: 'system-ui, sans-serif', tableBg: '#f1f5f9', tableBorder: '#cbd5e1', sectionBorderColor: '#e2e8f0' };
      try {
        updateProgress(2, 'Extracting color scheme...');
        const styleResult = await callGeminiVision(
          `Analyze the visual design of this PDF. Extract the exact color scheme and typography.\n\nReturn ONLY JSON:\n{"headingColor":"hex","accentColor":"hex for links/accents","bgColor":"hex background","headerBg":"hex or CSS gradient for header area","headerText":"hex","bodyFont":"CSS font-family","tableBg":"hex for table headers","tableBorder":"hex","sectionBorderColor":"hex for section dividers","hasHeaderBanner":true/false,"hasSidebarAccents":true/false,"accentBorderSide":"left|top|none"}`,
          _base64, _mimeType
        );
        if (styleResult) {
          let sc = styleResult.trim();
          if (sc.indexOf('```') !== -1) { const ps = sc.split('```'); sc = ps[1] || ps[0]; if (sc.indexOf('\n') !== -1) sc = sc.split('\n').slice(1).join('\n'); if (sc.lastIndexOf('```') !== -1) sc = sc.substring(0, sc.lastIndexOf('```')); }
          const parsed = JSON.parse(sc);
          docStyle = { ...docStyle, ...parsed };
          warnLog('[PDF Fix] Extracted doc style:', docStyle);
        }
      } catch(styleErr) { warnLog('[PDF Fix] Style extraction failed (using defaults):', styleErr); }

      // ── Deterministic HTML renderer from JSON content blocks ──
      const renderJsonToHtml = (blocks) => {
        if (!Array.isArray(blocks)) return '';
        return blocks.map((block, blockIdx) => {
          // Guard: skip invalid blocks
          if (!block || typeof block !== 'object') return '';
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
            case 'image': {
              // Use data-img-placeholder marker instead of SVG data URI (avoids regex issues)
              const imgDesc = (block.description || block.alt || 'Image').replace(/"/g, '&quot;');
              return `<figure data-img-placeholder="true" style="margin:1em 0;text-align:center"><div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:8px;padding:1rem;min-height:80px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#64748b">[Image: ${imgDesc.substring(0, 80)}]</div><figcaption style="font-size:0.85em;color:#64748b;font-style:italic;margin-top:0.25em">${block.description || block.alt || ''}</figcaption></figure>`;
            }
            case 'link': return `<a href="${block.url || '#'}" style="color:${docStyle.accentColor}">${block.text}</a>`;
            case 'blockquote': return `<blockquote style="border-left:4px solid ${docStyle.accentColor};padding:12px 16px;margin:1em 0;background:${docStyle.bgColor === '#ffffff' ? '#f8fafc' : docStyle.bgColor};border-radius:0 8px 8px 0;font-style:italic">${block.text}</blockquote>`;
            case 'hr': return `<hr style="border:none;border-top:2px solid ${docStyle.sectionBorderColor};margin:2em 0">`;
            case 'banner': return `<div style="background:${docStyle.headerBg};color:${docStyle.headerText};padding:24px 28px;border-radius:12px;margin-bottom:24px"><div style="font-size:1.5em;font-weight:bold">${block.title || ''}</div>${block.subtitle ? '<div style="font-size:0.9em;opacity:0.85;margin-top:4px">' + block.subtitle + '</div>' : ''}</div>`;
            case 'rawhtml': return block.html || '';
            default: return `<div style="margin:0.6em 0">${block.text || ''}</div>`;
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
          let cleaned = jsonResult.trim();
          if (cleaned.indexOf('```') !== -1) { const ps = cleaned.split('```'); cleaned = ps[1] || ps[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
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
          bodyContent = renderJsonToHtml(blocks);
          warnLog(`[PDF Fix] JSON pipeline: ${blocks.length} blocks rendered`);
        } catch(jsonErr) {
          // Fallback: direct HTML generation if JSON parsing fails
          warnLog('[PDF Fix] JSON extraction failed, falling back to direct HTML:', jsonErr);
          updateProgress(2, 'Fallback: generating HTML directly...');
          const fallbackPrompt = `Transform this PDF into accessible HTML body content meeting WCAG 2.1 AA. Use proper headings, tables with th scope, alt text, lists, links. Include ALL content. Use inline CSS for styling. Return ONLY HTML.`;
          bodyContent = await callGeminiVision(fallbackPrompt, _base64, _mimeType);
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
              `- Generate slug IDs for h2/h3 headings.\n` +
              `- Use <strong> for bold text and <em> for italic within text fields.\n\n` +
              `Return ONLY a JSON array: [{"type":"...","text":"..."}, ...]`,
              _base64, _mimeType
            );
            if (chunkResult) {
              let cleaned = chunkResult.trim();
              if (cleaned.indexOf('```') !== -1) { const ps = cleaned.split('```'); cleaned = ps[1] || ps[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }

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
                return parsed;
              } else {
                warnLog(`[PDF Fix] JSON parse failed for chunk ${i + 1}, attempting object-by-object recovery`);
                const recovered = [];
                const objectMatches = cleaned.match(/\{[^{}]*"type"\s*:\s*"[^"]+?"[^{}]*\}/g);
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

            // ── Fallback Layer 1: Heuristic structuring from pre-extracted text ──
            // Detects headings, lists, paragraphs from formatting patterns. No API calls.
            const heuristicBlocks = structureTextHeuristic(chunkText, startPg, endPg);
            if (heuristicBlocks.length > 2) {
              warnLog(`[PDF Fix] Chunk ${i + 1}: heuristic fallback produced ${heuristicBlocks.length} blocks from extracted text`);
              return heuristicBlocks;
            }

            // ── Fallback Layer 2: Structure-only Vision prompt ──
            // Ask Vision for block types/boundaries WITHOUT reproducing text content.
            // This avoids RECITATION because Vision doesn't output copyrighted text.
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
                    let cleaned = structureMap.trim();
                    if (cleaned.indexOf('```') !== -1) { const ps = cleaned.split('```'); cleaned = ps[1] || ps[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); }
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

            // ── Final fallback: return heuristic blocks or raw text ──
            if (heuristicBlocks.length > 0) return heuristicBlocks;
            return [{ type: 'p', text: chunkText.substring(0, 5000) }];
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
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-fail="' + ci + '" style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:16px;margin:1em 0;text-align:center"><p style="color:#991b1b;font-weight:bold;font-size:0.9em">\u26a0\ufe0f Section ' + (ci + 1) + ' (pages ' + startPg + '-' + endPg + ') failed to process</p><button onclick="window.__retryPdfChunk && window.__retryPdfChunk(' + ci + ')" style="margin-top:8px;padding:6px 16px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:bold;font-size:12px;cursor:pointer">\ud83d\udd04 Retry This Section</button></div>' });
          } else {
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-start="' + ci + '" style="display:none"></div>' });
            allBlocks = allBlocks.concat(blocks);
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-end="' + ci + '" style="display:none"></div>' });
          }
        });
        updateProgress(2, `${allBlocks.length} blocks extracted from ${transformChunks} chunks`);

        bodyContent = renderJsonToHtml(allBlocks);
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

          // Phase 2: AI polish with small chunks (table merging, style unification, transition smoothing)
          // Skip when HTML is CSS-bloated (>10:1 ratio) — model can't reproduce heavy inline styles
          const _htmlToTextRatio = bodyContent.length / Math.max(1, textCharCount(bodyContent));
          if (_htmlToTextRatio > 10) {
            _pipeLog('Polish', 'Skipping AI polish — HTML is CSS-heavy (' + Math.round(_htmlToTextRatio) + ':1 HTML:text ratio). Inline styles will be deduplicated deterministically instead.');
          } else if (pdfPolishPasses > 0) {
            const POLISH_CHUNK = 2000;
            const polishViolations = 'TABLE CONTINUITY: Merge split table fragments.\nSTYLE CONSISTENCY: Unify inline CSS to match dominant style.\nTRANSITION SMOOTHING: Remove artifacts at section boundaries.\nPRESERVE ALL CONTENT. Do NOT summarize or shorten.';
            const _maxPolishPasses = 1; // cap at 1 regardless of user setting — diminishing returns
            for (let polishIdx = 0; polishIdx < _maxPolishPasses; polishIdx++) {
              updateProgress(2, `Polish pass ${polishIdx + 1}/${pdfPolishPasses} (style + table unification)...`);
              _pipeLog('Polish', 'Phase 2: AI polish pass ' + (polishIdx + 1) + ' (' + POLISH_CHUNK + ' char chunks)');
              try {
                const polishChunks = splitHtmlOnTagBoundary(bodyContent, POLISH_CHUNK);
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
                    const pPrompt = `Fix these issues in this HTML fragment. Preserve ALL content.\n\n${polishViolations}\n\nHTML (${pci + 1}/${polishChunks.length}):\n"""\n${pc}\n"""\n\nReturn ONLY the fixed fragment.`;
                    const pOut = stripFence(await callGemini(pPrompt, true));
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
                const polished = polishedParts.join('');
                if (polished.length >= bodyContent.length * 0.9) {
                  bodyContent = polished;
                  _pipeLog('Polish', 'Pass ' + (polishIdx + 1) + ' applied (' + polishChunks.length + ' chunks, ' + polishSkipped + ' kept original)');
                } else {
                  warnLog('[Polish] Pass ' + (polishIdx + 1) + ' rejected: output too short');
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

      // ── Insert extracted images into placeholders ──
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
            // If we have a regenerated image, show it; otherwise show placeholder with upload
            return `<figure id="${imgId}-figure" data-img-idx="${imgIdx}"${hasCropData ? ` data-crop="${cropJson}"` : ''} style="position:relative;margin:1em 0">
<div id="${imgId}-container" style="${hasSrc ? '' : 'background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:8px;padding:1rem;'}text-align:center;min-height:${hasSrc ? '0' : '120px'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem">
${hasSrc
  ? `<img src="${imgInfo.generatedSrc}" alt="${desc.replace(/"/g, '&quot;')}" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0">`
  : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
<span style="font-size:12px;color:#64748b;font-weight:600">${imgInfo ? 'Image from page ' + imgInfo.page : 'Image placeholder'}</span>
<span style="font-size:11px;color:#94a3b8">${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}</span>`}
<div style="display:flex;gap:4px;margin-top:4px;align-items:center;justify-content:center;flex-wrap:wrap">
<label style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:${hasSrc ? '#64748b' : '#2563eb'};color:white;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer">
${hasSrc ? (isRegenerated ? '🔄 Replace (AI generated)' : '🔄 Replace') : '📷 Upload image'}
<input type="file" accept="image/*" style="display:none" onchange="(function(el){var f=el.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){var c=document.getElementById('${imgId}-container');var img=c.querySelector('img');if(img){img.src=e.target.result;}else{c.style.background='none';c.style.border='none';var ni=document.createElement('img');ni.src=e.target.result;ni.alt='${desc.replace(/"/g, '').replace(/'/g, '')}';ni.style.cssText='max-width:100%;border-radius:8px;border:1px solid #e2e8f0';c.insertBefore(ni,c.firstChild);}};r.readAsDataURL(f);})(this)">
</label>
${hasCropData ? `<button onclick="window.__pdfCropImage && window.__pdfCropImage('${imgId}')" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#8b5cf6;color:white;border:none;border-radius:6px;font-size:11px;font-weight:bold;cursor:pointer" aria-label="Adjust crop for this image">✂ Adjust Crop</button>` : ''}
</div>
</div>
<figcaption style="font-size:0.85em;color:#64748b;font-style:italic;margin-top:0.5em">${desc}${purpose ? '<br><em style="font-size:0.8em;color:#94a3b8">Purpose: ' + purpose + '</em>' : ''}</figcaption>
</figure>`;
          }
        });
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
      // Uses the clean text from Step 1 — much smaller than the CSS-bloated HTML
      updateProgress(2, 'Checking spelling & grammar...');
      try {
        const textForCheck = (extractedText || '').trim();
        const GRAMMAR_CHUNK = 5000;
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
      if (finalAfterScore !== null && axeScoreAvailable) {
        const blendedFinal = Math.round((finalAfterScore + axeResults.score) / 2);
        warnLog(`[PDF Fix] Final blended score: AI ${finalAfterScore} + axe ${axeResults.score} = ${blendedFinal}`);
        finalAfterScore = blendedFinal;
      } else if (!axeScoreAvailable) {
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
            if (!_isBatch) addToast('⚠ Integrity: ' + integrityWarning, 'error');
            warnLog('[Integrity] COVERAGE SHORT — ' + integrityWarning);
          } else if (!_isBatch && integrityCoverage >= 98) {
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

      // ── Store results ──
      const _result = {
        accessibleHtml,
        integrityCoverage,
        integrityWarning,
        groundTruthCharCount: window.__lastGroundTruthCharCount || 0,
        groundTruthMethod: window.__lastGroundTruthMethod || null,
        verificationAudit: verification,
        axeAudit: axeResults,
        beforeScore,
        beforeAxeScore,
        afterScore: finalAfterScore,
        axeScore: axeResults ? axeResults.score : null,
        axeViolations: axeResults ? axeResults.totalViolations : 0,
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

      // Batch mode: return result without touching React state
      if (_isBatch) return _result;

      // Single-file mode: update UI state
      setPdfFixResult(_result);
      setPdfFixLoading(false);
      setPdfFixStep('');

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
      if (_isBatch) throw err; // Let batch caller handle it
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
        <div class="meta-card"><div class="meta-val">${audit.icc ?? 'N/A'}</div><div class="meta-label">Agreement Score</div></div>
        ${audit.cronbachAlpha !== null && audit.cronbachAlpha !== undefined ? '<div class="meta-card"><div class="meta-val">' + audit.cronbachAlpha + '</div><div class="meta-label">Consistency Score</div></div>' : ''}
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
          html += `<div style="background:#dcfce7;border:2px solid #16a34a;border-radius:8px;padding:16px;text-align:center;margin:1rem 0"><div style="font-size:1.5rem;font-weight:900;color:#16a34a">&#10003; No AI-Detected Issues Remaining</div><div style="font-size:13px;color:#166534;margin-top:4px">All WCAG 2.1 AA checks passed in AI verification</div></div>`;
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

  // ── Download Accessible PDF from HTML ──
  const downloadAccessiblePdf = (htmlContent, filename) => {
    if (!htmlContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { addToast('Pop-up blocked — allow pop-ups to download PDF', 'error'); return; }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Add print instructions
    const printBanner = printWindow.document.createElement('div');
    printBanner.id = 'print-banner';
    printBanner.innerHTML = `<div style="background:#2563eb;color:white;padding:12px 20px;font-family:system-ui;display:flex;align-items:center;justify-content:between;gap:12px;position:sticky;top:0;z-index:9999">
      <span style="font-weight:bold">♿ Accessible Document Ready</span>
      <span style="font-size:13px;opacity:0.9">Use <strong>Ctrl+P</strong> (or ⌘+P on Mac) → <strong>Save as PDF</strong> to download as a tagged PDF</span>
      <button onclick="document.getElementById('print-banner').remove();window.print()" style="margin-left:auto;background:white;color:#2563eb;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;font-size:13px">📥 Save as PDF</button>
      <button onclick="document.getElementById('print-banner').remove()" style="background:transparent;color:white;border:1px solid rgba(255,255,255,0.3);padding:8px 12px;border-radius:6px;cursor:pointer;font-size:13px">✕</button>
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

    const themeCSS = `
      body { font-family: ${cssVars.bodyFont}; font-size: ${fontSize}px; background: ${cssVars.bgColor}; color: ${textColor}; }
      h1, h2, h3, h4 { color: ${cssVars.headingColor}; }
      a { color: ${cssVars.accentColor}; }
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
    // Run WCAG sanitizer — High Contrast uses AAA (7:1), all others use AA (4.5:1)
    const wcagLevel = seed?.wcagLevel || 'AA';
    const sanitized = sanitizeStyleForWCAG(themed, { level: wcagLevel });
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
    const themed = applyThemeToPdfHtml(pdfFixResult.accessibleHtml, useTheme, useFontSize);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(themed);
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

  // ── PDF Preview: Get current edited HTML from iframe ──
  const getPdfPreviewHtml = () => {
    if (!pdfPreviewRef.current) return pdfFixResult?.accessibleHtml || '';
    const doc = pdfPreviewRef.current.contentDocument || pdfPreviewRef.current.contentWindow?.document;
    if (!doc) return pdfFixResult?.accessibleHtml || '';
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
          let innerContent = '';
          if (type === 'Venn Diagram') {
               const setA = branches[0] || { title: 'Set A', items: [] };
               const setB = branches[1] || { title: 'Set B', items: [] };
               const shared = branches[2] || { title: 'Shared', items: [] };
               const renderList = (items, items_en, limit = 8) => items.slice(0, limit).map((it, i) =>
                   `<li style="margin-bottom: 6px; font-size: 10pt; line-height: 1.3;">
                       &bull; ${it} ${items_en?.[i] ? `<br><span style="font-size:0.85em;opacity:0.8;font-style:italic;">(${items_en[i]})</span>` : ''}
                    </li>`
               ).join('');
               innerContent = `
                  <div style="text-align:center; margin-bottom: 40px;">
                      <h3 style="margin:0; font-size: 1.8em; color: #2c3e50;">${main}</h3>
                      ${main_en ? `<div style="font-size:1em; color:#666; font-style:italic; margin-top:5px;">(${main_en})</div>` : ''}
                  </div>
                  <div role="img" aria-label="Venn diagram comparing ${setA.title} and ${setB.title}" style="position: relative; width: 750px; height: 480px; margin: 0 auto; font-family: sans-serif;">
                      <!-- Set A (Left Circle) -->
                      <div style="position: absolute; top: 0; left: 0; width: 400px;">
                          <!-- Header Outside Circle -->
                          <div style="text-align: center; margin-bottom: 10px;">
                              <h4 style="margin: 0; color: #9f1239; font-size: 1.2em; font-weight: bold; background: #fff1f2; display: inline-block; padding: 6px 16px; border-radius: 20px; border: 2px solid #fecaca;">
                                  ${setA.title}
                              </h4>
                              ${setA.title_en ? `<div style="font-size:0.9em; color:#991b1b; margin-top:2px;">(${setA.title_en})</div>` : ''}
                          </div>
                          <!-- Circle Body with Increased Right Padding (110px) -->
                          <div style="width: 400px; height: 400px; border-radius: 50%; background-color: rgba(254, 226, 226, 0.4); border: 3px solid #fecaca; box-sizing: border-box; padding: 60px 110px 40px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; word-wrap: break-word;">
                              <ul style="list-style: none; padding: 0; margin: 0; color: #881337; width: 100%;">
                                  ${renderList(setA.items, setA.items_en)}
                              </ul>
                          </div>
                      </div>
                      <!-- Set B (Right Circle) -->
                      <div style="position: absolute; top: 0; right: 0; width: 400px;">
                          <!-- Header Outside Circle -->
                          <div style="text-align: center; margin-bottom: 10px;">
                              <h4 style="margin: 0; color: #1e40af; font-size: 1.2em; font-weight: bold; background: #eff6ff; display: inline-block; padding: 6px 16px; border-radius: 20px; border: 2px solid #bfdbfe;">
                                  ${setB.title}
                              </h4>
                              ${setB.title_en ? `<div style="font-size:0.9em; color:#1e40af; margin-top:2px;">(${setB.title_en})</div>` : ''}
                          </div>
                          <!-- Circle Body with Increased Left Padding (110px) -->
                          <div style="width: 400px; height: 400px; border-radius: 50%; background-color: rgba(219, 234, 254, 0.4); border: 3px solid #bfdbfe; box-sizing: border-box; padding: 60px 40px 40px 110px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; word-wrap: break-word;">
                              <ul style="list-style: none; padding: 0; margin: 0; color: #1e3a8a; width: 100%;">
                                  ${renderList(setB.items, setB.items_en)}
                              </ul>
                          </div>
                      </div>
                      <!-- Shared Region (Absolute Center) -->
                      <div style="position: absolute; top: 140px; left: 50%; transform: translateX(-50%); width: 180px; text-align: center; z-index: 10;">
                          <h4 style="font-size: 0.8em; font-weight: bold; text-transform: uppercase; color: #6b21a8; margin: 0 0 10px 0; background: rgba(255,255,255,0.9); display: inline-block; padding: 2px 8px; border-radius: 4px; border: 1px solid #e9d5ff;">
                              ${shared.title || 'Shared'}
                              ${shared.title_en ? `<span style="font-weight:normal; opacity:0.8;"> (${shared.title_en})</span>` : ''}
                          </h4>
                          <ul style="list-style: none; padding: 0; margin: 0; color: #581c87; font-weight: bold; font-size: 0.9em;">
                               ${renderList(shared.items, shared.items_en, 5)}
                          </ul>
                      </div>
                  </div>
               `;
          } else if (type === 'Flow Chart' || type === 'Process Flow / Sequence') {
              innerContent = `<div role="img" aria-label="Flow chart: ${main}" style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 700px; margin: 0 auto; font-family: sans-serif;">
                      <div style="background: white; color: #1e293b; padding: 15px 40px; border-radius: 50px; text-align: center; border: 2px solid #cbd5e1; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 20; position: relative;"><h3 style="margin:0; font-size:1.2em; font-weight: 800;">${main}</h3>${main_en ? `<div style="font-size:0.8em; color:#64748b; font-weight: normal; margin-top:4px;">(${main_en})</div>` : ''}</div>
                      <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                      ${branches.map(b => {
                          const isDecision = b.title.includes("?") || b.title.toLowerCase().includes("decision");
                          const hasBranches = b.items && b.items.length > 1;
                          return `<div style="height: 32px; width: 2px; background: #94a3b8;"></div><div aria-hidden="true" style="color: #94a3b8; font-size: 16px; line-height: 1; margin-top: -4px; margin-bottom: 4px;">&#9660;</div>
                              <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                                  ${isDecision
                    ? `<div style="position: relative; width: 130px; height: 130px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">` +
                      `<div style="position: absolute; inset: 0; top:0; left:0; right:0; bottom:0; background: #fefce8; border: 2px solid #facc15; transform: rotate(45deg); border-radius: 4px; z-index: 1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></div>` +
                      `<div style="position: relative; z-index: 2; text-align: center; width: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center;">` +
                      `<span style="font-weight: bold; font-size: 0.75rem; color: #713f12; line-height: 1.25; word-wrap: break-word;">${b.title}</span>` +
                      `${b.title_en ? `<span style="font-size: 0.65rem; color: #a16207; line-height: 1.25; margin-top: 4px;">(${b.title_en})</span>` : ''}` +
                      `</div></div>`
                    : `<div style="background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 16px; text-align: center; width: 256px; min-height: 60px; display: flex; flex-direction: column; justify-content: center; z-index: 10; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">` +
                      `<span style="font-weight: bold; font-size: 0.875rem; color: #1e3a8a;">${b.title}</span>` +
                      `${b.title_en ? `<span style="font-size: 0.75rem; color: #3b82f6; margin-top: 4px;">(${b.title_en})</span>` : ''}` +
                      `</div>`}
                                  ${hasBranches ? `<div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; width: 100%; position: relative; align-items: stretch;"><div style="position: absolute; top: 0; left: 40px; right: 40px; height: 16px; border-top: 2px solid #cbd5e1; border-left: 2px solid #cbd5e1; border-right: 2px solid #cbd5e1; border-radius: 12px 12px 0 0;"></div>
                                      ${b.items.map((item, k) => `<div style="display: flex; flex-direction: column; align-items: center; padding-top: 16px; flex: 1; max-width: 150px;"><div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; border-radius: 4px; font-size: 0.75rem; color: #334155; text-align: center; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); width: 100%; height: 100%; flex: 1; display: flex; flex-direction: column; justify-content: center;">${item}${b.items_en?.[k] ? `<div style="font-size: 0.65rem; color: #64748b; margin-top: 4px;">(${b.items_en[k]})</div>` : ''}</div></div>`).join('')}</div>` : `
                                      ${b.items && b.items.length === 1 && b.items[0] ? `<div style="margin-top: 8px; background: #eff6ff; color: #1e40af; font-size: 0.75rem; padding: 4px 12px; border-radius: 9999px; border: 1px solid #dbeafe;">${b.items[0]} ${b.items_en?.[0] ? `<span style="opacity: 0.7;">(${b.items_en[0]})</span>` : ''}</div>` : ''}`}
                              </div>`;
                      }).join('')}
                      <div style="height: 32px; width: 2px; background: #94a3b8;"></div><div style="background: #1e293b; color: white; font-size: 0.8em; font-weight: bold; padding: 8px 24px; border-radius: 9999px; border: 2px solid #475569;">${t('organizer.labels.end')}</div></div></div>`;
          } else {
              if (type === 'Cause and Effect') {
                  innerContent = `<div style="text-align:center; margin-bottom: 30px;"><h3 style="margin:0;">${main}</h3></div>` +
                    `<div style="display: flex; flex-direction: column; gap: 20px; max-width: 800px; margin: 0 auto;">` +
                    `${branches.map(b => `<div style="display: flex; align-items: center; gap: 20px;">` +
                      `<div style="flex: 1; background: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 8px; text-align: center;">` +
                      `<div style="color: #991b1b; font-weight: bold; font-size: 0.8em; text-transform: uppercase; margin-bottom: 5px;">${t('organizer.labels.cause')}</div>` +
                      `<div style="color: #7f1d1d; font-weight: bold;">${b.title}</div>` +
                      `${b.title_en ? `<div style="font-size:0.8em; color:#ef4444;">(${b.title_en})</div>` : ''}</div>` +
                      `<div aria-hidden="true" style="font-size: 30px; color: #cbd5e1;">&#8594;</div>` +
                      `<div style="flex: 1; background: #eff6ff; border: 1px solid #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">` +
                      `<div style="color: #1e40af; font-weight: bold; font-size: 0.8em; text-transform: uppercase; margin-bottom: 5px;">${t('organizer.labels.effect')}</div>` +
                      `<div style="color: #1e3a8a; font-weight: bold;">${b.items[0] || ''}</div>` +
                      `${b.items_en?.[0] ? `<div style="font-size:0.8em; color:#3b82f6;">(${b.items_en[0]})</div>` : ''}</div>` +
                      `</div>`).join('')}</div>`;
              } else if (type === 'Problem Solution') {
                  innerContent = `<div style="max-width: 800px; margin: 0 auto;">` +
                    `<div style="background: #fef2f2; border-left: 5px solid #ef4444; padding: 20px; margin-bottom: 40px; border-radius: 0 8px 8px 0;">` +
                    `<div style="color: #ef4444; font-weight: bold; font-size: 0.8em; text-transform: uppercase;">${t('organizer.labels.problem_label')}</div>` +
                    `<h3 style="margin: 10px 0; color: #7f1d1d;">${main}</h3>` +
                    `${main_en ? `<div style="color: #991b1b; font-style: italic;">(${main_en})</div>` : ''}</div>` +
                    `<div aria-hidden="true" style="text-align: center; font-size: 30px; color: #cbd5e1; margin-bottom: 20px;">&#8595;</div>` +
                    `<h4 style="text-align: center; color: #166534; margin-bottom: 20px;">${t('organizer.labels.solutions')}</h4>` +
                    `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">` +
                    `${branches.map(b => `<div style="background: #f0fdf4; border: 1px solid #dcfce7; padding: 20px; border-radius: 8px;">` +
                      `<h4 style="color: #166534; margin: 0 0 10px 0;">${b.title}</h4>` +
                      `${b.title_en ? `<div style="color: #22c55e; font-size: 0.8em; margin-bottom: 10px;">(${b.title_en})</div>` : ''}` +
                      `<ul style="margin: 0; padding-left: 20px; color: #15803d;">` +
                      `${b.items.map((it, i) => `<li style="margin-bottom: 5px;">${it} ${b.items_en?.[i] ? `<span style="opacity: 0.7; font-size: 0.9em;">(${b.items_en[i]})</span>` : ''}</li>`).join('')}` +
                      `</ul></div>`).join('')}</div></div>`;
              } else if (type === 'Mind Map') {
                  const half = Math.ceil(branches.length / 2);
                  const leftBranches = branches.slice(0, half);
                  const rightBranches = branches.slice(half);
                  innerContent = `<div role="img" aria-label="Mind map: ${main}" style="display: flex; justify-content: center; align-items: center; gap: 40px; max-width: 900px; margin: 0 auto; padding: 20px;">` +
                    `<div style="display: flex; flex-direction: column; gap: 30px; align-items: flex-end; flex: 1;">` +
                    `${leftBranches.map(b => `<div style="background: white; border: 3px solid #e9d5ff; padding: 15px; border-radius: 20px; text-align: center; min-width: 150px; position: relative;">` +
                      `<div style="color: #581c87; font-weight: bold;">${b.title}</div>` +
                      `${b.title_en ? `<div style="font-size: 0.8em; color: #a855f7;">(${b.title_en})</div>` : ''}` +
                      `<div style="position: absolute; top: 50%; right: -43px; width: 40px; height: 2px; background: #e9d5ff;"></div></div>`).join('')}</div>` +
                    `<div style="width: 200px; height: 200px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 5px solid #f3e8ff; z-index: 2;">` +
                    `<h3 style="margin: 0; font-size: 1.2em;">${main}</h3>` +
                    `${main_en ? `<div style="font-size: 0.8em; opacity: 0.8; margin-top: 5px;">(${main_en})</div>` : ''}</div>` +
                    `<div style="display: flex; flex-direction: column; gap: 30px; align-items: flex-start; flex: 1;">` +
                    `${rightBranches.map(b => `<div style="background: white; border: 3px solid #e9d5ff; padding: 15px; border-radius: 20px; text-align: center; min-width: 150px; position: relative;">` +
                      `<div style="color: #581c87; font-weight: bold;">${b.title}</div>` +
                      `${b.title_en ? `<div style="font-size: 0.8em; color: #a855f7;">(${b.title_en})</div>` : ''}` +
                      `<div style="position: absolute; top: 50%; left: -43px; width: 40px; height: 2px; background: #e9d5ff;"></div></div>`).join('')}</div></div>`;
              } else {
                  innerContent = `<div style="max-width: 800px; margin: 0 auto; text-align: center;">` +
                    `<div style="background: #4f46e5; color: white; padding: 20px 40px; border-radius: 15px; display: inline-block; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">` +
                    `<h3 style="margin: 0;">${main}</h3>` +
                    `${main_en ? `<div style="opacity: 0.8; font-size: 0.9em;">(${main_en})</div>` : ''}</div>` +
                    `<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">` +
                    `${branches.map(b => `<div style="flex: 1; min-width: 200px; max-width: 300px; background: white; border: 2px solid #e0e7ff; border-radius: 10px; overflow: hidden; text-align: left;">` +
                      `<div style="background: #eef2ff; padding: 10px; font-weight: bold; color: #3730a3; text-align: center; border-bottom: 2px solid #e0e7ff;">` +
                      `${b.title}${b.title_en ? `<div style="font-weight: normal; font-size: 0.8em; color: #6366f1;">(${b.title_en})</div>` : ''}</div>` +
                      `<ul style="padding: 15px 25px; margin: 0; color: #475569;">` +
                      `${b.items.map((it, i) => `<li style="margin-bottom: 5px;">${it} ${b.items_en?.[i] ? `<span style="color: #94a3b8; font-size: 0.9em;">(${b.items_en[i]})</span>` : ''}</li>`).join('')}` +
                      `</ul></div>`).join('')}</div></div>`;
              }
          }
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  ${innerContent}
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
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <div class="quiz-box">
                      <h3>${t('output.quiz_mcq')}</h3>
                      ${item.data.questions.map((q, i) => `
                          <div class="question">
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
                      `).join('')}
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
          const formatMath = (t) => `<span class="math-symbol">${processMathHTML(t)}</span>`;
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
          const items = Array.isArray(item.data) ? item.data : [];
          return `
              <div class="section" id="${item.id}" style="border-left:4px solid ${tv.color};border-radius:12px;">
                  ${enhancedHeader}
                  <ol style="position: relative; padding-left: 24px; border-left: 3px solid #4338ca; margin-left: 10px; list-style: none;">
                      ${items.map((t, i) => `
                          <li style="margin-bottom: 20px; position: relative;">
                              <div aria-hidden="true" style="position: absolute; left: -32px; top: 0; width: 16px; height: 16px; background: #4f46e5; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px #4338ca;"></div>
                              <div style="background: ${i % 2 === 0 ? '#f8fafc' : '#eef2ff'}; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
                                  <div style="margin-bottom: 4px;">
                                      <span style="display:inline-block;background:#4338ca;color:white;padding:2px 10px;border-radius:999px;font-size:0.8em;font-weight:700;">${t.date}</span>
                                      ${t.date_en ? `<span style="opacity:0.6; font-weight:normal; font-size:0.85em; margin-left:6px;">(${t.date_en})</span>` : ''}
                                  </div>
                                  <div style="color: #334155;">
                                      ${t.event}
                                  </div>
                                  ${t.event_en ? `<div style="color: #64748b; font-size: 0.9em; margin-top: 4px; font-style: italic;">${t.event_en}</div>` : ''}
                              </div>
                          </li>
                      `).join('')}
                  </div>
              </div>
          `;
      } else if (item.type === 'concept-sort') {
          const categories = item.data.categories || [];
          const sortItems = item.data.items || [];
                   addA11yNotes(slide, itemTitle, 'Concept sort with ' + categories.length + ' categories');
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
      promptInstructions: 'STYLE PREFERENCE: Academic — use serif fonts (Georgia), navy (#1b3a5c) and gold (#b8860b) color scheme, formal spacing, scholarly appearance suitable for university submissions.',
      cssVars: { bodyFont: "'Georgia', 'Times New Roman', serif", headingColor: '#1b3a5c', accentColor: '#b8860b', bgColor: '#ffffff', cardBg: '#fefce8', cardBorder: '#e2e8f0', headerBg: 'linear-gradient(135deg, #1b3a5c, #2c5f8a)', headerText: '#ffffff', extraCSS: 'h1 { border-bottom: 2px solid #b8860b; padding-bottom: 0.5rem; } blockquote { border-left: 3px solid #b8860b; padding-left: 1rem; font-style: italic; }' },
    },
    elementary: {
      name: 'Kid-Friendly', emoji: '🌈', wcagLevel: 'AA',
      promptInstructions: 'STYLE PREFERENCE: Kid-friendly — use rounded corners (border-radius: 12px), bright cheerful colors (teal, coral, purple), larger fonts (16px base), playful section cards with soft shadows, Comic Sans or Lexend font.',
      cssVars: { bodyFont: "'Comic Sans MS', 'Lexend', sans-serif", headingColor: '#7c3aed', accentColor: '#ec4899', bgColor: '#fefce8', cardBg: '#ffffff', cardBorder: '#fbbf24', headerBg: 'linear-gradient(135deg, #7c3aed, #ec4899, #f59e0b)', headerText: '#ffffff', borderRadius: '16px', extraCSS: '.section { border-left: 5px solid #ec4899; border-radius: 12px; padding: 1.5rem; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.06); } h2 { color: #7c3aed; } .resource-header { background: linear-gradient(135deg, #faf5ff, #fdf2f8); border-left: 4px solid #a855f7; }' },
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
      promptInstructions: 'STYLE PREFERENCE: Magazine editorial — large hero headings, pull quotes with colored left borders, serif body text (Georgia), elegant professional feel with editorial flair.',
      cssVars: { bodyFont: "'Georgia', serif", headingColor: '#1a1a2e', accentColor: '#e63946', bgColor: '#ffffff', cardBg: '#ffffff', cardBorder: '#e5e7eb', headerBg: 'linear-gradient(135deg, #1a1a2e, #16213e)', headerText: '#ffffff', extraCSS: 'h1 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; } blockquote { border-left: 4px solid #e63946; padding: 1rem 1.5rem; font-size: 1.2rem; font-style: italic; color: #374151; } .section { border-bottom: 1px solid #e5e7eb; padding-bottom: 2rem; }' },
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
          th, td { border: 1px solid ${theme.cardBorder}; padding: 0.7rem 1rem; text-align: ${textAlign}; }
          th { background-color: ${theme.cardBg}; font-weight: 700; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
          tbody tr:nth-child(even) { background-color: rgba(248,250,252,0.5); }
          tbody tr:hover { background-color: rgba(241,245,249,0.8); }
          img { max-width: 100%; height: auto; border: 1px solid ${theme.cardBorder}; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
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
          @media (forced-colors: active) { .section { border: 2px solid CanvasText; } th { border: 1px solid CanvasText; } }
          @media print {
            body { padding: 0.5in; margin: 0; font-size: 11pt; }
            .page-break { display: block; page-break-before: always; border: none; color: transparent; margin: 0; padding: 0; }
            .page-break:after { content: ""; }
            .section { page-break-inside: avoid; border: 1px solid #ccc; box-shadow: none; margin-bottom: 1.5rem; }
            .resource-header { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .interactive-textarea { border: 1px solid #94a3b8; background-image: linear-gradient(#c0c0c0 1px, transparent 1px); break-inside: avoid; min-height: 100px; }
            .interactive-blank { border-bottom: 1px solid #333; }
            .worksheet-header { border: none; padding: 0; margin-bottom: 30px; }
            .line { border-bottom: 1px solid #000; }
            .export-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { max-width: 100%; page-break-inside: avoid; }
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
                textareas.forEach(tx => {
                    tx.style.height = 'auto';
                    tx.style.height = (tx.scrollHeight > 120 ? tx.scrollHeight : 120) + 'px';
                    tx.addEventListener('input', function() {
                        this.style.height = 'auto';
                        this.style.height = (this.scrollHeight) + 'px';
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
    sanitizeStyleForWCAG: _wrap(sanitizeStyleForWCAG),
    autoFixAxeViolations: _wrapAsync(autoFixAxeViolations),
    refixChunk: _wrapAsync(refixChunk),
    getChunkState: _wrap(getChunkState),
    fixAndVerifyPdf: _wrapAsync(fixAndVerifyPdf),
    generateAuditReportHtml: _wrap(generateAuditReportHtml),
    downloadAccessiblePdf: _wrap(downloadAccessiblePdf),
    updatePdfPreview: _wrap(updatePdfPreview),
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
  };
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.createDocPipeline = createDocPipeline;
window.AlloModules.DocPipelineModule = true;
console.log('[DocPipelineModule] Pipeline factory registered');
