const fs = require('node:fs');
const file = 'doc_pipeline_source.jsx';
const current = fs.readFileSync(file, 'utf8');
const nl = current.includes('\r\n') ? '\r\n' : '\n';
let src = current.replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  const at = src.indexOf(before);
  if (at < 0 || src.indexOf(before, at + before.length) >= 0) throw new Error('Expected unique source snippet: ' + before.slice(0, 90));
  src = src.slice(0, at) + after + src.slice(at + before.length);
}
replaceOnce(`    if (!(fixed.includes('<!DOCTYPE') || fixed.includes('<html') || fixed.includes('<main') || fixed.includes('<body'))) {
      return { accepted: false, reason: 'no-doc-markers' };
    }`, String.raw`    // Fragments use the same content policy as complete documents. Only the wrapper
    // requirement differs: a middle/last chunk need not contain html/body/main.
    if (!(opts && opts.fragment) && !/<(?:!doctype\b|html\b|main\b|body\b)/i.test(fixed)) {
      return { accepted: false, reason: 'no-doc-markers' };
    }
    // Asset identities belong to the source, not the model. An equal token COUNT
    // can hide image 2 being replaced by a second copy of image 1. Also protect
    // __IMG_DATA_N__ used after initial restoration and their actual image refs.
    const imageReferences = (markup) => {
      const clean = String(markup || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
      const tokens = (clean.match(/__(?:ALLOFLOW_DATAURL_(?:FINAL_)?|IMG_DATA_)\d+__/g) || []).sort();
      const refs = [];
      if (typeof DOMParser !== 'undefined') {
        const doc = new DOMParser().parseFromString(clean, 'text/html');
        for (const el of Array.from(doc.querySelectorAll('img, picture source, svg image'))) {
          refs.push([el.tagName.toLowerCase(), el.getAttribute('src') || '', el.getAttribute('srcset') || '', el.getAttribute('href') || el.getAttribute('xlink:href') || '']);
        }
      } else {
        // Quote-aware fallback for non-DOM callers; > inside alt is not a tag end.
        const tags = clean.match(/<(?:img|source|image)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || [];
        for (const tag of tags) {
          const attrs = {};
          tag.replace(/\s(src|srcset|href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, key, dq, sq, bare) => { attrs[key.toLowerCase()] = dq != null ? dq : sq != null ? sq : bare; return m; });
          refs.push([(tag.match(/^<([\w-]+)/) || [])[1].toLowerCase(), attrs.src || '', attrs.srcset || '', attrs.href || attrs['xlink:href'] || '']);
        }
      }
      return JSON.stringify({ tokens, refs });
    };
    try {
      if (imageReferences(original) !== imageReferences(fixed)) return { accepted: false, reason: 'image-reference-changed' };
    } catch (_) {
      // A parser failure must not leave source images unprotected.
      if (/<(?:img|image|source)\b|__(?:ALLOFLOW_DATAURL_|IMG_DATA_)/i.test(original)) return { accepted: false, reason: 'image-reference-uncheckable' };
    }`);
replaceOnce(`    const chunks = splitHtmlOnTagBoundary(_hasImages ? strippedHtml : html, HTML_FIX_CHUNK);
    let _passCoverageReported = false;`, String.raw`    const chunks = splitHtmlOnTagBoundary(_hasImages ? strippedHtml : html, HTML_FIX_CHUNK);
    // Structured, content-free evidence survives the pass callback/checkpoint. The
    // source text and rejected model response never enter this diagnostic record.
    const _candidateRejections = [];
    let _candidateRejectionCount = 0;
    const _recordCandidateRejection = (decision, chunkId, phase) => {
      const record = { chunkId: String(chunkId), phase, reason: decision.reason || 'content-not-preserved' };
      _candidateRejectionCount++;
      if (_candidateRejections.length < 100) _candidateRejections.push(record);
      warnLog('[aiFixChunked:' + label + '] rejected ' + phase + ' candidate for chunk ' + chunkId + ': ' + record.reason + '; preserving the input');
      if (_control && typeof _control.onCandidateRejected === 'function') {
        try { _control.onCandidateRejected(Object.assign({}, record)); } catch (_) {}
      }
    };
    const _checkCandidate = (candidate, input, chunkId, phase, fragment = true) => {
      const decision = acceptFixedHtmlDetailed(candidate, input, { fragment, mode: 'faithful' });
      if (!decision.accepted) _recordCandidateRejection(decision, chunkId, phase);
      return decision;
    };
    let _passCoverageReported = false;`);
replaceOnce(`            shippedOriginalChunks: Math.max(0, Number(shippedOriginalChunks) || 0),
`, `            shippedOriginalChunks: Math.max(0, Number(shippedOriginalChunks) || 0),
            candidateRejectionCount: _candidateRejectionCount,
            candidateRejections: _candidateRejections.map((entry) => Object.assign({}, entry)),
`);
replaceOnce(`        const fixed = _restoreNeutralizedPromptFences(stripFence(_requireAiResponse(_singleRaw, 'single-chunk fix')));
        // FINAL-token preservation: reject this pass if any image placeholder was dropped.
        const _finalBefore = (_singleHtml.match(/__ALLOFLOW_DATAURL_FINAL_\\d+__/gi) || []);
        const _finalAfter = fixed ? (fixed.match(/__ALLOFLOW_DATAURL_FINAL_\\d+__/gi) || []) : [];
        if (_finalBefore.length > 0 && _finalAfter.length < _finalBefore.length) {
          _reportPassCoverage(1);
        warnLog(\`[aiFixChunked:\${label}] single-chunk dropped \${_finalBefore.length - _finalAfter.length} image FINAL token(s) — keeping original to preserve images\`);
          return html;
        }
        if (acceptFixedHtml(fixed, _singleHtml)) {`, String.raw`        let fixed = _restoreNeutralizedPromptFences(stripFence(_requireAiResponse(_singleRaw, 'single-chunk fix')));
        if (_isJsonWrapped(fixed)) fixed = _tryUnwrapJsonHtml(fixed);
        const _singleFragment = !/<(?:!doctype\b|html\b|main\b|body\b)/i.test(_singleHtml);
        if (_checkCandidate(fixed, _singleHtml, 1, 'single', _singleFragment).accepted) {`);
replaceOnce(`          if (unwrapped && unwrapped.length >= part.length * 0.9 && textCharCount(unwrapped) >= textCharCount(part) * 0.95) {
            out = unwrapped;
          } else {
            _pipeLog('aiFixChunked:' + label, 'chunk ' + (ci + 1) + ' returned JSON wrapper — keeping original', null, _control && _control.owner);
            return part;
          }`, `          if (unwrapped) {
            out = unwrapped;
          } else {
            _recordCandidateRejection({ reason: 'invalid-json-wrapper' }, ci + 1, 'chunk');
            return part;
          }`);
const assetStart = src.indexOf('        // FINAL-token preservation check: if Gemini dropped any __ALLOFLOW_DATAURL_FINAL_N__');
const assetEnd = src.indexOf('          try {\n            const retryPrompt = ', assetStart);
if (assetStart < 0 || assetEnd < 0) throw new Error('Missing image retry boundary');
src = src.slice(0, assetStart) + `        const _candidate = _checkCandidate(out, part, ci + 1, 'chunk');
        if (_candidate.reason === 'image-reference-changed' || _candidate.reason === 'image-reference-uncheckable') {
          warnLog(\`[aiFixChunked:\${label}] chunk \${ci + 1} changed source image references — retrying with explicit preservation instructions\`);
` + src.slice(assetEnd);
replaceOnce('Your previous response REMOVED image placeholder tokens matching __ALLOFLOW_DATAURL_FINAL_N__ — these are extracted images that MUST be preserved. Every <img src="__ALLOFLOW_DATAURL_FINAL_*__"> and <figure> containing such a token must appear in your output verbatim.', 'Your previous response CHANGED source image references. Every __ALLOFLOW_DATAURL_FINAL_N__ and __IMG_DATA_N__ token must retain its exact identity, count, containing image, and order. Preserve every source image and figure, and ALL source text.');
replaceOnce(`            const _finalRetry = retried ? (retried.match(/__ALLOFLOW_DATAURL_FINAL_\\d+__/gi) || []) : [];
            if (retried && retried.length >= part.length * 0.9 && _finalRetry.length >= _finalBefore.length) {
              warnLog(\`[aiFixChunked:\${label}] chunk \${ci + 1} retry recovered all \${_finalBefore.length} image token(s)\`);
              return retried;
            }`, `            if (_checkCandidate(retried, part, ci + 1, 'image-retry').accepted) {
              warnLog(\`[aiFixChunked:\${label}] chunk \${ci + 1} retry preserved source text and image references\`);
              return retried;
            }`);
replaceOnce('          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} keeping original to preserve ${_finalBefore.length} image token(s)`);', '          warnLog(`[aiFixChunked:${label}] chunk ${ci + 1} keeping original to preserve source images`);');
replaceOnce(`        if (out && out.length >= part.length * 0.9 && textCharCount(out) >= textCharCount(part) * 0.95) {
          return out;
        } else if (part.length > 5000) {`, `        if (_candidate.accepted) {
          return out;
        } else if (part.length > 5000 && /^(?:size-shrink|text-shrink)$/.test(_candidate.reason || '')) {`);
replaceOnce(`                if (unwrappedHalf && unwrappedHalf.length >= half.length * 0.9 && textCharCount(unwrappedHalf) >= textCharCount(half) * 0.95) {  // B13: half gate ≥ full gate (90%/95%) — a weaker half gate let a split chunk ship degraded content the full gate would reject
                  halfOut = unwrappedHalf;
                } else {
                  _pipeLog('aiFixChunked:' + label, 'half-chunk ' + (hi + 1) + ' JSON wrapper — keeping original half', null, _control && _control.owner);
                  return half;
                }`, `                if (unwrappedHalf) {
                  halfOut = unwrappedHalf;
                } else {
                  _recordCandidateRejection({ reason: 'invalid-json-wrapper' }, String(ci + 1) + '.' + String(hi + 1), 'half');
                  return half;
                }`);
replaceOnce(`              if (halfOut && halfOut.length >= half.length * 0.9 && textCharCount(halfOut) >= textCharCount(half) * 0.95) {  // B13: half gate ≥ full gate (matches the line-3313 full-chunk gate)
                return halfOut;
              }`, `              if (_checkCandidate(halfOut, half, String(ci + 1) + '.' + String(hi + 1), 'half').accepted) {
                return halfOut;
              }`);
replaceOnce(`          return halfResults.join('');
`, `          const _halfJoined = halfResults.join('');
          return _checkCandidate(_halfJoined, part, ci + 1, 'half-assembly').accepted ? _halfJoined : part;
`);
replaceOnce(`    _reportPassCoverage(_shippedOriginalChunks);
    const _joined = fixed.join('');`, String.raw`    const _joined = fixed.join('');
    // Backstop for oversized tables split across chunks and changes to asset order
    // across boundaries. Validate BEFORE reporting what this pass actually ships.
    const _sourceForGate = _hasImages ? strippedHtml : html;
    const _assemblyFragment = !/<(?:!doctype\b|html\b|main\b|body\b)/i.test(_sourceForGate);
    if (!_checkCandidate(_joined, _sourceForGate, 'all', 'assembly', _assemblyFragment).accepted) {
      _reportPassCoverage(chunks.length);
      return html;
    }
    _reportPassCoverage(_shippedOriginalChunks);`);
if (fs.readFileSync(file, 'utf8') !== current) throw new Error('Concurrent source update; rerun against latest bytes.');
fs.writeFileSync(file, src.replace(/\n/g, nl));
console.log('Updated acceptance and chunk gates from freshly read source; no generated files changed.');