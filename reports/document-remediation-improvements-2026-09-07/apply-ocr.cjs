const fs = require('node:fs');
const file = 'doc_pipeline_source.jsx';
const original = fs.readFileSync(file, 'utf8');
const newline = original.includes('\r\n') ? '\r\n' : '\n';
let source = original.replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  if (source.split(before).length !== 2) throw new Error('Expected exactly one OCR anchor: ' + before.slice(0, 100));
  source = source.replace(before, () => after);
}
replaceOnce('  // Page-level reconciliation between two OCR outputs', String.raw`  // Keep uncertain multi-page text outside the physical page map. A missing boundary
  // gets one bounded request per physical page; character positions are never page IDs.
  const _resolveVisionOcrChunk = async (chunkText, startPage, pageCount, retryPage) => {
    const marker = /^[ \t]*\[\[PAGE BREAK\]\][ \t]*\r?$/gm;
    const text = String(chunkText || '');
    const parts = text.split(marker);
    const pages = [], pageErrors = [];
    const addPage = (pageNum, value, boundarySource) => {
      const content = String(value || '').trim();
      pages.push({ pageNum, pageStart: pageNum, pageEnd: pageNum, text: content, boundarySource });
      if (!content) pageErrors.push({ pageNum, engine: 'vision', error: 'Gemini Vision returned no text for physical page ' + pageNum + '.' });
    };
    if (parts.length === pageCount && text.trim()) {
      parts.forEach((part, i) => addPage(startPage + i, part, pageCount === 1 ? 'physical-page' : 'page-break'));
    } else if (text.trim() && pageCount > 1) {
      for (let i = 0; i < pageCount; i++) {
        const pageNum = startPage + i;
        try {
          const value = await retryPage(pageNum);
          if (/\[\[PAGE BREAK\]\]/.test(String(value || ''))) throw new Error('Single-page retry returned ambiguous page boundaries.');
          addPage(pageNum, value, 'physical-page-retry');
        } catch (error) {
          if (error && (error.name === 'AbortError' || error.isAbort || error.isThrottle || error.isDailyQuota)) throw error;
          pages.push({ pageNum, pageStart: pageNum, pageEnd: pageNum, text: '', boundarySource: 'unresolved' });
          pageErrors.push({ pageNum, engine: 'vision', error: 'Could not establish text for physical page ' + pageNum + ': ' + String(error && error.message || error).slice(0, 240) });
        }
      }
    } else {
      for (let i = 0; i < pageCount; i++) addPage(startPage + i, '', 'unresolved');
    }
    return { pages, pageErrors, fullText: pages.map(p => p.text).filter(Boolean).join('\n\n'),
      unsegmentedText: parts.length !== pageCount ? text : '', retriedPages: text.trim() && parts.length !== pageCount && pageCount > 1 ? pageCount : 0 };
  };

  // Page-level reconciliation between two OCR outputs`);
replaceOnce('  // Record disagreements (pages where length differs materially) so the fidelity panel can', '  // Record token/value disagreements as well as material length differences so the fidelity panel can');
replaceOnce('  const reconcileOcrPages = (tessPages, visionPages) => {', String.raw`  const reconcileOcrPages = (tessPages, visionPages) => {
    // Normalize presentation-only differences, retaining numbers, signs, names,
    // units and negation. OCR confidence estimates do not prove engine agreement.
    const _agreementTokens = (value) => String(value || '').normalize('NFKC').toLowerCase()
      .replace(/\u2212/g, '-').match(/[+-]?\p{N}+(?:[.,:/-]\p{N}+)*(?:%|\u2030)?|[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)?|[<>=≤≥≠+\-]/gu) || [];`);
const disagreementStart = source.indexOf('      // Flag disagreement if length gap > 10%');
const disagreementEnd = source.indexOf('\n    }\n    // #1 (2026-07-03)', disagreementStart);
if (disagreementStart < 0 || disagreementEnd < 0) throw new Error('OCR disagreement boundaries missing');
replaceOnce(source.slice(disagreementStart, disagreementEnd), String.raw`      // Compare actual readings, not their lengths. Missing-engine text is
      // covered by page errors/coverage, not reported as an engine conflict.
      if (tLen > 0 && vLen > 0) {
        const tTokens = _agreementTokens(tText), vTokens = _agreementTokens(vText);
        const tokenMismatch = tTokens.length !== vTokens.length || tTokens.some((token, i) => token !== vTokens[i]);
        const lengthMismatch = Math.abs(tLen - vLen) > Math.max(20, longest * 0.1);
        if (tokenMismatch || lengthMismatch) {
          const tValues = tTokens.filter(token => /\p{N}/u.test(token));
          const vValues = vTokens.filter(token => /\p{N}/u.test(token));
          const valueMismatch = tValues.length !== vValues.length || tValues.some((token, i) => token !== vValues[i]);
          disagreements.push({ pageNum: _pn, tesseractChars: tLen, visionChars: vLen, tesseractText: tText, visionText: vText,
            reason: valueMismatch ? 'value-conflict' : tokenMismatch ? 'text-conflict' : 'coverage-conflict',
            selectedSource: chosen.source, requiresReview: true });
        }
      }`);
const oldCommentStart = source.indexOf('    // #1 (2026-07-03): the <=2-page single-pass Vision');
const edgeCommentStart = source.indexOf('    // #F (2026-07-05): strip repeated', oldCommentStart);
replaceOnce(source.slice(oldCommentStart, edgeCommentStart), '');
const fullTextStart = source.indexOf('    let _fullText;', oldCommentStart);
const fullTextEnd = source.indexOf('    return { pages: merged, disagreements', fullTextStart);
replaceOnce(source.slice(fullTextStart, fullTextEnd), String.raw`    // Every accepted record represents one physical page. Never replace this union
    // with a single engine blob: that can erase a page the other engine recovered.
    const _fullText = _edge.texts.filter(Boolean).join('\n\n');
`);
replaceOnce("const _PIPELINE_PROMPT_VERSION = '20260802-1';", "const _PIPELINE_PROMPT_VERSION = '20260907-preservation-1';");
replaceOnce("const _OCR_EVIDENCE_VERSION = '20260715-1';", "const _OCR_EVIDENCE_VERSION = '20260907-page-identity-1';");
// All page counts now use the same delimiter/physical-page path, including two-page scans.
const shortcutStart = source.indexOf('          if (numChunks <= 1 && effectivePageCount <= 2) {');
const shortcutEnd = source.indexOf('          const MAX_PARALLEL = 5;', shortcutStart);
if (shortcutStart < 0 || shortcutEnd < 0) throw new Error('Vision shortcut boundaries missing');
replaceOnce(source.slice(shortcutStart, shortcutEnd), '');
replaceOnce('            chunkPromises.push((async () => {', '            chunkPromises.push(async () => {');
replaceOnce('            })().catch(err => { warnLog(`[PDF Fix] Chunk ${i + 1} (pages ${startPage}-${endPage}) extraction failed:`, err); return null; }));',
  '            });');
replaceOnce('            const batchResults = await Promise.all(batchSlice);', String.raw`            const batchResults = await Promise.all(batchSlice.map((runChunk, index) => runChunk().catch(err => {
              if (err && (err.name === 'AbortError' || err.isAbort)) throw err;
              warnLog('[PDF Fix] OCR chunk ' + (batch + index + 1) + ' extraction failed:', err);
              return null;
            })));`);
const normalizeStart = source.indexOf('          const chunks = chunkResults.map((chunk, i) => {');
const normalizeEnd = source.indexOf('          // Per-page split for reconciliation.', normalizeStart);
if (normalizeStart < 0 || normalizeEnd < 0) throw new Error('Vision normalization boundaries missing');
replaceOnce(source.slice(normalizeStart, normalizeEnd), String.raw`          const _normalizeChunkText = (chunk, i) => {
            const fenced = String(chunk || '').trim().replace(/^\s*\x60\x60\x60[\w]*\n?/g, '').replace(/\n?\x60\x60\x60\s*$/g, '');
            const unwrapped = _safeStripJsonWrapper(fenced, i);
            if (!unwrapped.stripped) return unwrapped.text;
            return unwrapped.text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
          };
          const chunks = chunkResults.map((chunk, i) => {
            if (!chunk || !String(chunk).trim()) { _failedChunkIdx.add(i); return ''; }
            if (_TRUNCATION_NOTE.test(chunk)) { _truncatedChunkIdx.add(i); chunk = chunk.replace(_TRUNCATION_NOTE, ''); }
            return _normalizeChunkText(chunk, i);
          });
`);
const splitStart = source.indexOf('          // Per-page split for reconciliation.', normalizeStart);
const splitEnd = source.indexOf('\n        };\n\n        // ── OCR language resolution', splitStart);
if (splitStart < 0 || splitEnd < 0) throw new Error('Vision split boundaries missing');
replaceOnce(source.slice(splitStart, splitEnd), String.raw`          // Unsegmented output never receives guessed physical-page identities.
          // Retry only ambiguous chunks, one physical page at a time, with the same
          // normalization and transport limits as the initial extraction.
          const pagesOut = [], _visionPageErrors = [], unsegmentedChunks = [];
          let _retriedPages = 0;
          for (let ci = 0; ci < chunks.length; ci++) {
            const startPage = _rangeStart + ci * PAGES_PER_CHUNK;
            const pageCount = Math.min(PAGES_PER_CHUNK, _rangeEnd - startPage + 1);
            const resolution = await _resolveVisionOcrChunk(chunks[ci], startPage, pageCount, async pageNum => {
              let bytes = _base64;
              let prompt = 'Extract ALL text content from physical page ' + pageNum + ' of this document ONLY. Do not include any other page.';
              if (_sliceSrcDoc) {
                bytes = await _extractSliceB64(pageNum, pageNum);
                prompt = 'Extract ALL text content from this one-page file. It is physical page ' + pageNum + ' of a larger document.';
              }
              const raw = await callGeminiVision(prompt + '\n\n' + _EXTRACT_RULES, bytes, _mimeType);
              if (_TRUNCATION_NOTE.test(String(raw || ''))) throw new Error('Gemini Vision truncated physical page ' + pageNum + '.');
              return _normalizeChunkText(raw, ci);
            });
            pagesOut.push(...resolution.pages);
            _visionPageErrors.push(...resolution.pageErrors);
            _retriedPages += resolution.retriedPages;
            if (resolution.unsegmentedText) unsegmentedChunks.push({ pageStart: startPage, pageEnd: startPage + pageCount - 1, text: resolution.unsegmentedText });
            if (_truncatedChunkIdx.has(ci)) {
              for (let q = 0; q < pageCount; q++) _visionPageErrors.push({ pageNum: startPage + q, engine: 'vision', partial: true,
                error: 'Gemini Vision truncated chunk ' + (ci + 1) + '; this page requires a complete independent reading.' });
            }
          }
          if (_retriedPages) warnLog('[Vision] Retried ' + _retriedPages + ' physical page(s) because multi-page boundaries were ambiguous.');
          if (_visionPageErrors.length) warnLog('[Vision] ' + _visionPageErrors.length + ' page extraction issue(s) recorded for reconciliation.');
          return { fullText: pagesOut.map(p => p.text).filter(Boolean).join('\n\n'), rawFullText: chunks.join('\n\n---\n\n'),
            pages: pagesOut, pageErrors: _visionPageErrors, unsegmentedChunks };`);
replaceOnce("window.__lastOcrVisionText = visionResult.fullText || '';", "window.__lastOcrVisionText = visionResult.rawFullText || visionResult.fullText || '';");
// Preserve partial-extraction warnings unless the other engine, rather than the
// same truncated Vision record, has recovered the page completely.
replaceOnce("            if (typeof e.pageNum === 'number' && _recovered.has(e.pageNum)) return;", String.raw`            if (typeof e.pageNum === 'number' && _recovered.has(e.pageNum)) {
              const recoveredPage = (rec.pages || []).find(p => p.pageNum === e.pageNum);
              if (!e.partial || (recoveredPage && recoveredPage.source !== 'vision')) return;
            }`);
if (fs.readFileSync(file, 'utf8') !== original) throw new Error('Source changed while preparing OCR edits; retry against current source.');
fs.writeFileSync(file, newline === '\r\n' ? source.replace(/\n/g, '\r\n') : source);
console.log('Applied OCR page identity, disagreement, and bounded concurrency improvements.');
