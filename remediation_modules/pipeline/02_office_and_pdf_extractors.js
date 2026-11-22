  // ── Deterministic extraction helpers (Step 0 of pipeline) ──
  // Lazy-load pdf.js once — reuses the existing pattern from runPdfAccessibilityAudit
  // ── Resilient CDN loader (shared) ──────────────────────────────────────────
  // The host can preload pdf.js / pako / Tesseract / fontkit from a local vendor bundle;
  // the browser app retains CDN fallback for installations that do not ship those assets. A single
  // hard-coded URL means a blocked or slow CDN (common on locked-down K-12 networks)
  // silently disables a whole feature with no signal to the teacher. This tries each
  // URL in turn until the library's global appears, and on TOTAL failure records the
  // outage on window.__alloflowCdnDown[label] so the UI can surface "X unavailable"
  // instead of failing silently. Per-label promise cache shares one load across callers.
  function _configureTrustedDocumentScript(script, url) {
    const configure = typeof window !== 'undefined' && window.__alloConfigureTrustedScript;
    if (typeof configure !== 'function') throw new Error('Verified document script delivery is unavailable');
    return configure(script, url);
  }
  async function _getTrustedDocumentRuntimeAsset(graph, binding) {
    const getAsset = typeof window !== 'undefined' && window.__alloGetVerifiedRuntimeAsset;
    if (typeof getAsset !== 'function') throw new Error('Verified document runtime is unavailable');
    const asset = await getAsset(graph, binding);
    if (!asset || typeof asset.url !== 'string' || asset.url.indexOf('blob:') !== 0 || typeof asset.revoke !== 'function') {
      try { if (asset && typeof asset.revoke === 'function') await asset.revoke(); } catch (_) {}
      throw new Error('Verified document runtime returned an invalid asset');
    }
    return asset;
  }
  async function _getVerifiedPdfWorkerAsset() {
    if (_docPipelinePdfWorkerAsset) return _docPipelinePdfWorkerAsset;
    if (!_docPipelinePdfWorkerPending) {
      _docPipelinePdfWorkerPending = _getTrustedDocumentRuntimeAsset('pdfjs', 'worker')
        .then((asset) => { _docPipelinePdfWorkerAsset = asset; return asset; })
        .finally(() => { _docPipelinePdfWorkerPending = null; });
    }
    return _docPipelinePdfWorkerPending;
  }
  async function _createVerifiedTesseractWorker(lang) {
    const asset = await _getTrustedDocumentRuntimeAsset('tesseract', 'worker');
    let released = false;
    const release = async () => {
      if (released) return;
      released = true;
      try { await asset.revoke(); } catch (_) {}
    };
    try {
      const worker = await window.Tesseract.createWorker(lang, 1, { workerPath: asset.url, workerBlobURL: false });
      if (!worker || typeof worker.terminate !== 'function') throw new Error('Verified Tesseract worker did not initialize');
      const terminate = worker.terminate;
      worker.terminate = async function () {
        try { return await terminate.apply(worker, arguments); }
        finally { await release(); }
      };
      return worker;
    } catch (error) { await release(); throw error; }
  }
  const _waitForGlobal = (isReady, ms) => new Promise((resolve) => {
    if (isReady()) return resolve(true);
    const iv = setInterval(() => { if (isReady()) { clearInterval(iv); resolve(true); } }, 50);
    setTimeout(() => { clearInterval(iv); resolve(!!isReady()); }, ms);
  });
  const _cdnLoadPromises = {};
  const _loadCdnScript = (label, urls, isReady, opts) => {
    opts = opts || {};
    const timeout = opts.timeout || 12000;
    if (isReady()) return Promise.resolve(true);
    if (_cdnLoadPromises[label]) return _cdnLoadPromises[label];
    const marker = 'data-docpipe-' + label;
    const list = Array.isArray(urls) ? urls : [urls];
    // Fresh attempt: clear any stale outage flag from a PRIOR failed attempt so a recovered
    // network/CDN isn't still reported as down. (Dead <script> corpses are removed on failure
    // below, so this retry's "already injected" check can't wait the full timeout on one.)
    // (2026-09-06) A chain that just failed is not retried for 45s. One audit calls this three or
    // four times for pdf.js alone; with every mirror blocked (Gemini Canvas CSP) each call re-ran
    // the full 3 × 12s poll, so a 1 KB document spent ~2 minutes on the loading screen — a third of
    // it AFTER the scored result existed. A blip still self-heals: the memo expires.
    try {
      const _downAt = typeof window !== 'undefined' && window.__alloflowCdnDown && window.__alloflowCdnDown[label];
      if (typeof _downAt === 'number' && Date.now() - _downAt < 45000) return Promise.resolve(false);
    } catch (_) {}
    try { if (typeof window !== 'undefined' && window.__alloflowCdnDown) delete window.__alloflowCdnDown[label]; } catch (_) {}
    const p = (async () => {
      // Another path may have already injected this script — wait for its global first.
      if (typeof document !== 'undefined' && document.querySelector('script[' + marker + ']') && await _waitForGlobal(isReady, timeout)) return true;
      for (let k = 0; k < list.length; k++) {
        // (2026-09-06) A refused or failed request says so through the script's error event long
        // before the readiness poll gives up — a mirror a CSP blocks (Gemini Canvas) errors within
        // milliseconds, and the poll used to sit the full 12s on it anyway, three mirrors deep, on
        // every call. The poll still governs a script that loads but never defines its global.
        let _scriptFailed = null;
        try {
          const s = document.createElement('script');
          _scriptFailed = new Promise((resolve) => {
            try {
              s.onerror = () => resolve(false);
              // A mirror that answers 200 + an HTML page "loads" in Firefox and Safari (only
              // Chrome refuses a text/html script). The load event fires after the script ran,
              // so an unready global then is decisive: fail over instead of polling out 12s.
              s.onload = () => setTimeout(() => { if (!isReady()) resolve(false); }, 250);
            } catch (_) { /* the readiness poll still bounds it */ }
          });
          _configureTrustedDocumentScript(s, list[k]);
          s.setAttribute(marker, 'true');
          document.head.appendChild(s);
        } catch (_) { await Promise.resolve(); continue; }
        if (await Promise.race([_waitForGlobal(isReady, timeout), _scriptFailed])) return true; // the global is the real readiness signal; the error event is the fast negative
        try { warnLog('[CDN] ' + label + ' failed from ' + list[k] + (k < list.length - 1 ? ' — trying fallback' : '')); } catch (_) {}
      }
      try {
        if (typeof window !== 'undefined') { window.__alloflowCdnDown = window.__alloflowCdnDown || {}; window.__alloflowCdnDown[label] = Date.now(); }
        warnLog('[CDN] ' + label + ' unavailable from all ' + list.length + ' source(s) — the dependent feature will degrade (network/CDN blocked?).');
        // Don't permanently memoize the failure: drop the cached false-promise so a later call
        // (after the network/CDN recovers) actually RETRIES instead of returning this resolved-
        // false for the rest of the session. Also remove the dead <script> tags we injected so
        // the retry's "already injected" check doesn't re-wait the full timeout on a corpse.
        delete _cdnLoadPromises[label];
        if (typeof document !== 'undefined') document.querySelectorAll('script[' + marker + ']').forEach(el => { try { el.parentNode && el.parentNode.removeChild(el); } catch (_) {} });
      } catch (_) {}
      return false;
    })();
    _cdnLoadPromises[label] = p;
    return p;
  };

  // ── ensurePdfLibLoaded (live-bug fix, 2026-07-02) ──
  // Every page-slice path (audit slicing AND the $6 extraction slicing) used to gate on
  // window.PDFLib being ALREADY loaded — but nothing in the pipeline loaded it; only the
  // ANTI host does, lazily, when a tagged-PDF export runs (script#pdflib-cdn). Result: a
  // FRESH session remediating a large scan had slicing silently disabled, whole-document
  // base64 went inline to Vision, and the teacher saw "Vision API returned invalid
  // response. The document may be too large" — load-order-dependent, which is why it
  // looked fixed and then "regressed". This loader makes slice capability deterministic.
  // Cooperates with the host's loader: honors an in-flight script#pdflib-cdn tag before
  // injecting via the shared _loadCdnScript machinery (same mirror chain as the host).
  const ensurePdfLibLoaded = async () => {
    const _ready = () => !!(typeof window !== 'undefined' && window.PDFLib && window.PDFLib.PDFDocument);
    if (_ready()) return true;
    try {
      if (typeof document !== 'undefined' && document.getElementById('pdflib-cdn')) {
        if (await _waitForGlobal(_ready, 12000)) return true;
      }
    } catch (_) {}
    return _loadCdnScript('pdflib', [
      'https://alloflow-cdn.pages.dev/pdf-lib/1.17.1/pdf-lib.min.js', // (2026-09-06) first-party copy, see ensurePdfJsLoaded
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    ], _ready, { timeout: 15000 });
  };

  const ensurePdfJsLoaded = async () => {
    const ok = await _loadCdnScript('pdfjs', [
      // (2026-09-06) First-party copy first (vendored at the repo root like temml/): Canvas's CSP
      // refuses the third-party hosts, and pdf.js is what the structure read, the deterministic
      // baseline and text extraction all stand on.
      'https://alloflow-cdn.pages.dev/pdfjs-dist/3.11.174/pdf.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
    ], () => !!window.pdfjsLib);
    if (!ok) throw new Error('pdf.js unavailable (all CDN sources failed)');
    if (!window.pdfjsLib || !window.pdfjsLib.GlobalWorkerOptions) throw new Error('pdf.js worker configuration is unavailable');
    const workerAsset = await _getVerifiedPdfWorkerAsset();
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerAsset.url;
  };

  // OOM guard: atob + Uint8Array.from allocates the whole file at once, which crashes
  // memory-constrained devices (education tablets, mobile) before remediation even begins.
  // Throw a clear, user-actionable error instead of a silent tab crash. base64 length
  // × 0.75 ≈ decoded byte count, so we can reject before allocating.
  const _MAX_PDF_BYTES = 200 * 1024 * 1024; // 200 MB
  const _b64ToBytes = (base64) => {
    const raw = base64 && base64.includes(',') ? base64.split(',')[1] : (base64 || '');
    if (raw.length * 0.75 > _MAX_PDF_BYTES) {
      throw new Error('File is too large (~' + Math.round(raw.length * 0.75 / (1024 * 1024)) + ' MB). The accessibility pipeline handles up to ' + Math.round(_MAX_PDF_BYTES / (1024 * 1024)) + ' MB — please split the document into smaller parts.');
    }
    // P4 (deep dive 2026-07-02): was Uint8Array.from(atob(raw), c => c.charCodeAt(0)) — a JS
    // callback PER BYTE (50M invocations ≈ seconds of main-thread block on a 50MB file, and
    // this helper runs several times per pipeline run). Plain indexed loop is ~10× faster.
    const bin = atob(raw);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  };

  // Extract text from a PDF using pdf.js's native text layer. Zero AI calls, zero truncation.
  // Returns { fullText, pages, pageCount, sourceCharCount, isScanned }.
  // isScanned = true when the PDF has no text layer (< 50 chars/page average) — fall back to OCR.
  // ── 'ALLOTRANSCRIPT' document format (2026-06-10) ──
  // Audio/video inputs become a first-class pipeline format: the transcript
  // is wrapped with a magic prefix and base64-encoded, so it flows through
  // every existing dispatcher exactly like JVBER (PDF) and UEsDB (zip) do —
  // intake, audit, fix, project save/load, typeset tagged PDF, all exports.
  // Unicode-safe (TextEncoder/TextDecoder, chunked btoa).
  const TRANSCRIPT_MAGIC = 'ALLOTRANSCRIPT:v1\n';
  const TRANSCRIPT_B64_PREFIX = 'QUxMT1RSQU5TQ1JJUFQ6djE'; // base64('ALLOTRANSCRIPT:v1')
  const encodeTranscriptPayload = (text) => {
    const bytes = new TextEncoder().encode(TRANSCRIPT_MAGIC + String(text || ''));
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const decodeTranscriptPayload = (base64) => {
    try {
      if (typeof base64 !== 'string' || !base64.startsWith(TRANSCRIPT_B64_PREFIX)) return null;
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const text = new TextDecoder().decode(bytes);
      return text.startsWith(TRANSCRIPT_MAGIC) ? text.slice(TRANSCRIPT_MAGIC.length) : null;
    } catch (_) { return null; }
  };

  // Media digestion (2026-06-10, maintainer design): audio and VIDEO carry
  // two information tracks that can diverge — what is SAID vs what is SHOWN.
  // The teacher chooses how to digest at submission; custom instructions ride
  // the prompt. Returns the ALLOTRANSCRIPT payload ready for the pipeline.
  const transcribeMediaToPayload = async (base64Data, mimeType, opts = {}) => {
    const mode = opts.mode || 'speech';
    const isVideo = /^video\//i.test(mimeType || (opts.file && opts.file.type) || '');
    // Pre-transcribed text (e.g. the existing YouTube fileUri extractor in
    // utils_pure) — just wrap it in the format.
    if (opts.preText) {
      const t2 = String(opts.preText).trim();
      if (t2.length < 20) throw new Error('no usable text');
      return { payload: encodeTranscriptPayload(t2), words: t2.split(/\s+/).length, mode: 'pretranscribed' };
    }
    // Long recordings (>15MB): the EXISTING LargeFileHandler machinery —
    // 10-minute 16kHz WAV segments, per-segment transcription, joined.
    // Video chunking extracts the AUDIO track (that's what the machinery
    // does), so chunked = speech analysis; visual/dual need ≤15MB files.
    const LF = (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.LargeFileHandler) || null;
    if (opts.file && LF && typeof LF.needsChunking === 'function' && LF.needsChunking(opts.file)) {
      const chunkPrompt = 'You are an expert educational transcriber. This is ONE SEGMENT of a longer recording. Provide an accurate transcript of the spoken content in THIS segment only. Use blank lines between topic shifts.'
        + (opts.instructions ? ('\nADDITIONAL INSTRUCTIONS from the teacher: ' + String(opts.instructions).slice(0, 1500)) : '')
        + '\nReturn ONLY the transcript text. Never invent content you did not hear.';
      const fn = (isVideo && typeof LF.processVideoFile === 'function') ? 'processVideoFile' : 'processAudioFile';
      const res = await LF[fn](opts.file, async (b64c, mimec) => await callGeminiVision(chunkPrompt, b64c, mimec || 'audio/wav'), opts.onProgress || (() => {}));
      const joined = ((res && res.transcript) || '').trim();
      if (joined.length < 20) throw new Error('chunked transcription returned no usable text');
      return { payload: encodeTranscriptPayload(joined), words: joined.split(/\s+/).length, mode: 'speech', chunked: true };
    }
    if (!base64Data) throw new Error('no media data provided');
    const MODE_PROMPTS = {
      speech: 'Provide a comprehensive, accurate transcript of the SPOKEN content only. Use blank lines between natural topic shifts.',
      visual: 'Describe the VISUAL content only: each scene, slide, diagram, demonstration, or on-screen text, in order. One paragraph per distinct visual. Do not transcribe speech.',
      dual: 'Produce THREE clearly separated sections, exactly these headings:\n## Spoken content\n(a comprehensive, accurate transcript of everything said)\n## What was shown\n(each scene, slide, diagram, demonstration, or on-screen text, in order)\n## Where they diverge\n(anything shown but never said, said but never shown, or contradictory — if none, write "The audio and visuals align.")',
      synthesis: 'Synthesize the spoken content AND the visual content into ONE cohesive narrative a reader can follow without the recording — weave what was shown into where it was said. Where audio and visuals diverge, note it inline in [brackets].',
    };
    const prompt = 'You are an expert educational transcriber analyzing a ' + (isVideo ? 'video' : 'audio') + ' recording.\n'
      + (MODE_PROMPTS[mode] || MODE_PROMPTS.speech)
      + (opts.instructions ? ('\n\nADDITIONAL INSTRUCTIONS from the teacher (follow them within the rules above):\n' + String(opts.instructions).slice(0, 1500)) : '')
      + '\n\nReturn ONLY the text. Never invent content you did not hear or see.';
    const text = await callGeminiVision(prompt, base64Data, mimeType || 'audio/mpeg');
    if (!text || text.trim().length < 20) throw new Error('digestion returned no usable text');
    return { payload: encodeTranscriptPayload(text.trim()), words: text.trim().split(/\s+/).length, mode };
  };

  // ── Spreadsheets → markdown tables (2026-06-11, item 3) ──
  // .xlsx/.xls/.xlsb/.ods via SheetJS (same lazy-CDN pattern Lumen uses).
  // Each sheet becomes '## SheetName' + a pipe-table, which the transcript
  // lane turns into REAL scoped tables → Stage 5b /Headers + /IDTree.
  var _sheetJsPromise = null;
  var _sheetJsOwner = 0;
  const _SHEET_JS_WATCHDOG_MS = 12000;
  const _isApprovedSheetJS = (value) => value && value.version === '0.20.3' && typeof value.read === 'function';
  const _lazyLoadSheetJS = () => {
    if (typeof window !== 'undefined' && _isApprovedSheetJS(window.XLSX)) return Promise.resolve(window.XLSX);
    if (_sheetJsPromise) return _sheetJsPromise;
    if (typeof document === 'undefined' || !document.head || typeof document.createElement !== 'function') {
      return Promise.reject(new Error('SheetJS requires a browser document'));
    }
    const owner = ++_sheetJsOwner;
    const urls = ['https://alloflow-cdn.pages.dev/runtime_assets/document/sheetjs-0.20.3/xlsx.full.min.js', 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'];
    const promise = new Promise((resolve, reject) => {
      let settled = false;
      let activeScript = null;
      let watchdog = null;
      const failures = [];
      const ownsLoader = () => _sheetJsOwner === owner;
      const clearAttempt = () => {
        if (watchdog) { clearTimeout(watchdog); watchdog = null; }
        if (activeScript) {
          activeScript.onload = null;
          activeScript.onerror = null;
          try { activeScript.remove(); } catch (_) {}
          activeScript = null;
        }
      };
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearAttempt();
        if (ownsLoader()) {
          _sheetJsPromise = null;
          _sheetJsOwner = 0;
        }
        if (error) reject(error); else resolve(window.XLSX);
      };
      const tryAt = (i) => {
        if (settled || !ownsLoader()) return;
        clearAttempt();
        if (typeof window !== 'undefined' && _isApprovedSheetJS(window.XLSX)) { finish(); return; }
        if (i >= urls.length) {
          const detail = failures.length ? ': ' + failures.join('; ') : '';
          finish(new Error('SheetJS load failed from all mirrors' + detail));
          return;
        }
        const s = document.createElement('script');
        activeScript = s;
        try { _configureTrustedDocumentScript(s, urls[i]); }
        catch (_) { failures.push('source ' + (i + 1) + ' was not approved'); Promise.resolve().then(() => tryAt(i + 1)); return; }
        s.async = true;
        let attemptSettled = false;
        const retry = (reason) => {
          if (settled || attemptSettled || !ownsLoader()) return;
          attemptSettled = true;
          failures.push('mirror ' + (i + 1) + ' ' + reason);
          clearAttempt();
          tryAt(i + 1);
        };
        s.onload = () => {
          if (attemptSettled || settled || !ownsLoader()) return;
          attemptSettled = true;
          if (typeof window !== 'undefined' && _isApprovedSheetJS(window.XLSX)) finish();
          else {
            failures.push('mirror ' + (i + 1) + ' loaded without XLSX');
            clearAttempt();
            tryAt(i + 1);
          }
        };
        s.onerror = () => retry('failed');
        watchdog = setTimeout(() => retry('timed out'), _SHEET_JS_WATCHDOG_MS);
        try { document.head.appendChild(s); }
        catch (_) { retry('could not be attached'); }
      };
      Promise.resolve().then(() => tryAt(0));
    });
    _sheetJsPromise = promise;
    return promise;
  };
  const convertXlsxToMarkdownTables = async (base64, opts = {}) => {
    const signal = opts && opts.signal ? opts.signal : null;
    const abortError = () => {
      const error = new Error('Workbook conversion cancelled.');
      error.name = 'AbortError';
      return error;
    };
    const throwIfAborted = () => { if (signal && signal.aborted) throw abortError(); };
    const awaitAbortable = (promise) => {
      if (!signal || typeof signal.addEventListener !== 'function') return promise;
      if (signal.aborted) return Promise.reject(abortError());
      return new Promise((resolve, reject) => {
        const onAbort = () => { cleanup(); reject(abortError()); };
        const cleanup = () => { try { signal.removeEventListener('abort', onAbort); } catch (_) {} };
        signal.addEventListener('abort', onAbort, { once: true });
        Promise.resolve(promise).then(
          (value) => { cleanup(); resolve(value); },
          (error) => { cleanup(); reject(error); },
        );
      });
    };
    throwIfAborted();
    // Wave 6 W6-5: enforce the same OOXML zip-bomb guard on .xlsx/.xlsm archives BEFORE SheetJS inflates them.
    try {
      const _xBytes = _base64ToBytes(base64);
      if (_xBytes.length >= 2 && _xBytes[0] === 0x50 && _xBytes[1] === 0x4b) {
        await awaitAbortable(ensureJsZipLoaded());
        if (window.JSZip) {
          const _xZip = await awaitAbortable(window.JSZip.loadAsync(_xBytes));
          _ooxmlGuardArchive(_xZip, _xBytes.length, 'Excel');
          let _xActualTotal = 0;
          const _xEntries = [];
          _xZip.forEach((rel, entry) => { if (entry && !entry.dir) _xEntries.push([rel, entry]); });
          for (const [_rel, _entry] of _xEntries) {
            throwIfAborted();
            const _rem = Math.max(1, _OOXML_MAX_TOTAL_BYTES - _xActualTotal);
            const _cap = Math.min(_OOXML_MAX_ENTRY_BYTES, _rem);
            const _inf = await awaitAbortable(_ooxmlInflateBytes(_entry, _cap, _rel));
            _xActualTotal += _inf.byteLength;
            if (_xActualTotal > _OOXML_MAX_TOTAL_BYTES) throw _ooxmlLimitError('actual inflated size exceeded the total safety budget', 'Excel');
            if (_xBytes.length > 0 && (_xActualTotal / _xBytes.length) > _OOXML_MAX_COMPRESSION_RATIO) throw _ooxmlLimitError('actual inflated ratio is zip-bomb shaped', 'Excel');
          }
        }
      }
    } catch (_xGuardErr) {
      if (_xGuardErr && (_xGuardErr.name === 'AbortError' || _xGuardErr.isArchiveLimit)) throw _xGuardErr;
    }
    throwIfAborted();
    const workbookReader = await awaitAbortable(_lazyLoadSheetJS());
    throwIfAborted();
    const wb = workbookReader.read(base64, { type: 'base64' });
    throwIfAborted();
    const maxRows = opts.maxRowsPerSheet || 200;
    const parts = [];
    const tableGrids = [];
    let truncated = 0;
    for (const name of wb.SheetNames) {
      // Yield between sheets so an input/document cancellation can run instead
      // of waiting for every remaining sheet to allocate rows and markdown.
      await awaitAbortable(new Promise((resolve) => setTimeout(resolve, 0)));
      throwIfAborted();
      const sheet = wb.Sheets[name];
      if (!sheet) continue;
      const rows = workbookReader.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      throwIfAborted();
      const indexedNonEmpty = [];
      for (let ri = 0; ri < rows.length; ri++) {
        const r = rows[ri];
        if (Array.isArray(r) && r.some((c) => String(c).trim())) indexedNonEmpty.push({ origRow: ri, row: r });
      }
      throwIfAborted();
      if (!indexedNonEmpty.length) continue;
      if (indexedNonEmpty.length > maxRows) truncated += indexedNonEmpty.length - maxRows;
      const useIndexed = indexedNonEmpty.slice(0, maxRows);
      const use = useIndexed.map((x) => x.row);
      const width = Math.max.apply(null, use.map((r) => r.length));
      // Build merge lookup from sheet['!merges'] to preserve colspan/rowspan semantics in structured grids.
      const mergeOrigin = new Map();
      const mergeCovered = new Set();
      const merges = Array.isArray(sheet['!merges']) ? sheet['!merges'] : [];
      const rowPosByOrig = new Map();
      useIndexed.forEach((x, idx) => rowPosByOrig.set(x.origRow, idx));
      for (const m of merges) {
        if (!m || !m.s || !m.e) continue;
        const r0 = rowPosByOrig.get(m.s.r);
        if (r0 === undefined) continue;
        const rSpan = Math.max(1, (m.e.r - m.s.r) + 1);
        const cSpan = Math.max(1, (m.e.c - m.s.c) + 1);
        if (rSpan === 1 && cSpan === 1) continue;
        mergeOrigin.set(r0 + ':' + m.s.c, { colspan: cSpan, rowspan: Math.min(rSpan, use.length - r0) });
        for (let rr = r0; rr < Math.min(use.length, r0 + rSpan); rr++) {
          for (let cc = m.s.c; cc <= Math.min(width - 1, m.e.c); cc++) {
            if (rr !== r0 || cc !== m.s.c) mergeCovered.add(rr + ':' + cc);
          }
        }
      }
      const gridRows = use.map((r, ri) => {
        const cells = [];
        for (let ci = 0; ci < width; ci++) {
          const key = ri + ':' + ci;
          if (mergeCovered.has(key)) continue;
          const span = mergeOrigin.get(key);
          const text = String(r[ci] == null ? '' : r[ci]).replace(/\r?\n/g, ' ').trim();
          cells.push({
            text,
            isHeader: ri === 0,
            ...(span && span.colspan > 1 ? { colspan: span.colspan } : {}),
            ...(span && span.rowspan > 1 ? { rowspan: span.rowspan } : {}),
          });
        }
        return { cells };
      });
      tableGrids.push({ caption: name, rows: gridRows });
      const cell = (c) => String(c == null ? '' : c).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
      const md = use.map((r, i) => {
        const padded = Array.from({ length: width }, (_, ci) => cell(r[ci]));
        return '| ' + padded.join(' | ') + ' |' + (i === 0 ? ('\n|' + padded.map(() => ' --- ').join('|') + '|') : '');
      }).join('\n');
      throwIfAborted();
      parts.push('## ' + name + '\n\n' + md);
    }
    throwIfAborted();
    if (!parts.length) throw new Error('no tabular data found in the workbook');
    let _xlsxText = parts.join('\n\n');
    // #10 (2026-07-03): truncatedRows was RETURNED but never read — a >200-row sheet lost rows SILENTLY.
    // Surface the truncation IN the text so it's visible in the remediated output + counted by the fidelity
    // nets, not just a discarded return field.
    if (truncated > 0) _xlsxText += '\n\n> Note: ' + truncated.toLocaleString() + ' additional data row(s) beyond the first ' + maxRows + ' per sheet were not included in this conversion — open the original spreadsheet for the full data.';
    return {
      text: _xlsxText,
      sheets: parts.length,
      truncatedRows: truncated,
      tableGrids,
    };
  };

  // P1 (deep dive 2026-07-02): also accepts a Uint8Array. The tagged-PDF round-trip
  // verification used to re-ENCODE both the original and the shipped PDF to base64 (≈134MB
  // of transient strings for a 50MB doc) at the exact peak-memory moment, only for this
  // function to immediately decode them back. Bytes are CLONED before pdf.js sees them —
  // getDocument({data}) transfers the buffer to the worker and would detach the caller's copy.
  const extractPdfTextDeterministic = async (base64) => {
    const _isBytes = (typeof Uint8Array !== 'undefined') && (base64 instanceof Uint8Array);
    // Transcript chokepoint: EVERY caller (skip-to-extraction, the audit
    // baseline, the fix flow's Step 0) inherits transcript awareness here.
    // (Byte inputs are never transcripts — transcripts only arrive as upload base64.)
    const _transcript = _isBytes ? null : decodeTranscriptPayload(base64);
    if (_transcript !== null) {
      return {
        fullText: _transcript,
        sourceCharCount: _transcript.length,
        method: 'transcript',
        pageCount: Math.max(1, Math.round(_transcript.split(/\s+/).length / 350)),
        hasTextLayer: true,
      };
    }
    let pdf = null; // (2026-06-20) freed in finally to release the pdf.js worker doc — undestroyed docs accumulated over a batch (mid-batch memory leak)
    // (2026-11-07) A read past its first limit keeps waiting for the SAME pdf.js call, up to 3 minutes per document:
    // on a busy machine a 1-page Arabic letter's read passed 30 s, the page counted as blank and the letter took the
    // scanned route (OCR, no tagged PDF). A read that never ends still gives up, as before.
    const _patience = { left: 180000 };
    const _patient = async (work, ms, label) => {
      try { return await _withTimeout(work, ms, label); }
      catch (e) {
        if (!/^Timeout after/.test(String(e && e.message)) || _patience.left <= 0) throw e;
        const more = Math.min(120000, _patience.left), t0 = Date.now();
        try { warnLog('[PDF Det] ' + label + ' still running after ' + (ms / 1000) + 's; waiting up to ' + Math.round(more / 1000) + 's more'); } catch (_) {}
        try { return await _withTimeout(work, more, label + ', second wait'); }
        finally { _patience.left -= Date.now() - t0; }
      }
    };
    try {
      await ensurePdfJsLoaded();
      if (!window.pdfjsLib) throw new Error('pdf.js unavailable');
      const bytes = _isBytes ? new Uint8Array(base64) : _b64ToBytes(base64); // clone: pdf.js detaches the buffer it is given
      // Mechanism 2 repair (2026-08-04, Wave 6 W6-3 lazy): defer full content-stream
      // inflation until a page actually exhibits fragmented intra-word spacing, avoiding
      // a 50 MB clone + whole-doc Flate inflate on clean born-digital PDFs.
      const _csBackupBytes = _isBytes ? bytes.slice() : null;
      let _csPagesLoaded = false;
      let _csPages = null;
      const _COMMON_SHORT_TOKENS = new Set(['a', 'i', 'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'ok', 'on', 'or', 'so', 'to', 'up', 'us', 'we']);
      const _pageSuspectSpaceSplit = (txt) => {
        if (!txt || txt.length < 12) return false;
        if (/(?:^|\s)(?:[A-Za-z]\s){2,}[A-Za-z](?=\s|$)/.test(txt)) return true;
        const mRe = /(?:^|\s)([A-Za-z]{1,2})\s+([a-z]{2,})\b|\b([a-z]{2,})\s+([a-z]{1,2})(?=\s|[.,;:!?]|$)/g;
        let mm;
        while ((mm = mRe.exec(txt)) !== null) {
          const frag = (mm[1] || mm[4] || '').toLowerCase();
          if (frag && !_COMMON_SHORT_TOKENS.has(frag)) return true;
        }
        return false;
      };
      const _getCsPages = async () => {
        if (_csPagesLoaded) return _csPages;
        _csPagesLoaded = true;
        try {
          const srcU8 = _csBackupBytes || _b64ToBytes(base64);
          _csPages = await _alloContentStreamPageTexts(srcU8);
        } catch (_) {
          _csPages = null;
        }
        return _csPages;
      };
      pdf = await _patient(window.pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise, 60000, 'pdf.js getDocument (text layer)');
      const pages = [];
      // 2026-06-08: per-page try/catch — a single-page parse error previously
      // threw all the way out of the loop, the outer catch returned
      // isScanned:true, and the WHOLE document's pdf.js text was discarded.
      // Now: log the failed page + push an empty record + keep going. The
      // denominator below uses non-blank page count so one broken page doesn't
      // trip the isScanned heuristic on a 20-page document.
      const pageErrors = [];
      const unreadablePages = []; // pages whose text layer is unmapped glyph codes (see _alloPageTextUnreadable)
      let _rtlOrderLogged = false; // H12: announce the direction repair ONCE, not per page
      let _csRepairedPages = 0;
      let _csRepairedSpaces = 0;
      let _ligFixed = 0; // lam-alef ligatures put back in logical order (_alloRepairRtlLigatures)
      let _overlayDupDropped = 0; // artifact copies of text the page already prints as content (overlays)
      // M12 (audit 2026-07-26): the lost-hyperlink fidelity net counted markdown `[text](url)` in
      // the source, which this extractor NEVER produces — it joins raw pdf.js text items. So the
      // net read 0 source links on every born-digital PDF and could not fire, no matter how many
      // hyperlinks the remediation dropped. A PDF's links are annotations, not text: ask for them
      // directly and give the net a baseline that actually exists for this input.
      // Deep dive 2026-07-27: count only EXTERNAL, DISTINCT destinations, and only when the run
      // covers the whole document. Three systematic over-counts made this net cry wolf on documents
      // that lost nothing — and a disclosure that fires falsely is worse than none, because it drives
      // needsExpertReview and teaches the teacher to ignore the amber banner:
      //   (1) dest/action-only annotations are INTERNAL navigation — a Word table of contents,
      //       'see page 12' cross-references, and every footnote reference/back-reference PAIR. A
      //       20-page report with 18 footnotes reports ~37 'links' the output can never carry.
      //   (2) one hyperlink spanning two rendered lines is TWO annotation rects, counted twice.
      //   (3) the same URL repeated on every page (a district footer) counted once per page.
      // The output side counts <a href> elements, so the honest baseline is DISTINCT EXTERNAL URLs.
      const _srcTablesSeen = { tables: 0, cells: 0, pages: [] };
      const _srcTableGrids = [];
      let _srcTableGridCells = 0;
      const _srcLinkUrls = new Set();
      let _srcLinkAnnotTotal = 0; // every external Link annotation, for the log (civics: 6 annotations, 1 URL)
      // The URL alone only ever powered a warning ("12 may have been dropped").
      // Pairing it with the anchor text it covers turns that warning into something
      // repairable: a deterministic pass can re-attach the href to the exact words it
      // belonged to, with no model call and no chance of inventing a destination.
      const _srcLinkPairs = [];
      // A fillable PDF becomes an UNFILLABLE web page: extraction reads text and
      // pixels, and a form control is neither. Worse, these fields usually carry the
      // author's own tooltip (the /TU entry) as an accessible name — so the source
      // was, in this one respect, MORE accessible than the remediated output. That is
      // not something to lose silently, so count them and say so in the report.
      const _srcFieldNames = new Set();
      let _srcFieldWidgets = 0;
      let _srcFieldsNamed = 0;
      for (let p = 1; p <= pdf.numPages; p++) {
        try {
          const page = await _patient(pdf.getPage(p), 30000, 'getPage (text layer) p' + p);
          const _pageLinkAnnots = [];
          let _pageWidgets = 0;
          let _pageMarkedItems = null;
          try {
            const _annots = await _withTimeout(page.getAnnotations(), 15000, 'getAnnotations (text layer) p' + p);
            for (let ai = 0; ai < (_annots || []).length; ai++) {
              const _a = _annots[ai];
              // A Link annotation with no destination at all is decorative chrome, not a link the
              // output owes an <a> for.
              if (_a && _a.subtype === 'Widget' && _a.fieldType) {
                _srcFieldWidgets++; _pageWidgets++;
                const _fn = String(_a.fieldName || '').trim();
                if (_fn) _srcFieldNames.add(_fn);
                if (String(_a.alternativeText || '').trim()) _srcFieldsNamed++;
              }
              if (!_a || _a.subtype !== 'Link') continue;
              const _u = String(_a.url || _a.unsafeUrl || '').trim();
              if (!_u) continue; // internal destination (TOC/footnote/cross-reference) — the output owes it no <a href>
              _srcLinkUrls.add(_u);
              _srcLinkAnnotTotal++;
              if (Array.isArray(_a.rect) && _a.rect.length === 4) _pageLinkAnnots.push({ url: _u, rect: _a.rect });
            }
          } catch (_) { /* annotations are a bonus signal — never fail a page over them */ }
          // (2026-10-27) Read with marked content so text the SOURCE marks as an artifact is known. An artifact
          // copy of text the page already prints as content is an overlay (child-find: its contact box is drawn
          // twice at the same spot, once tagged and once as an /Artifact text box): read once, not twice, or
          // the copy shows up as "missing" words and glues lines ("InformationP"). Artifact text found nowhere
          // else on the page is kept; any trouble falls back to the plain read.
          let tc;
          try {
            const _tcm = await _patient(page.getTextContent({ includeMarkedContent: true }), 30000, 'getTextContent (text layer) p' + p);
            _pageMarkedItems = _tcm.items;
            // Not content: inside an /Artifact, or (on a page whose text is tagged) outside any marked content at all,
            // which a reader of the source's tags never reaches (child-find's overlay box is unmarked).
            const _its = [], _art = [], _stk = [], _unmarked = [];
            let _anyTagged = false;
            for (const it of (_tcm.items || [])) {
              if (it && (it.type === 'beginMarkedContent' || it.type === 'beginMarkedContentProps')) { _stk.push(it.tag === 'Artifact'); if (it.tag !== 'Artifact') _anyTagged = true; continue; }
              if (it && it.type === 'endMarkedContent') { _stk.pop(); continue; }
              if (it && typeof it.str === 'string') { _its.push(it); _art.push(_stk.some(Boolean)); _unmarked.push(_stk.length === 0); }
            }
            if (_anyTagged) for (let i = 0; i < _its.length; i++) if (_unmarked[i]) _art[i] = true;
            tc = Object.assign({}, _tcm, { items: _its });
            if (_art.some(Boolean) && _art.some((a) => !a)) {
              // An overlay sits where its twin is (child-find: 3 pt apart). Same text, or one a prefix of the other
              // within 80% of its length ("...Informatio" + "n"), and within 6 pt on both axes. A running header
              // whose words also occur in the body (osep: "Dear Colleague") is elsewhere on the page and stays.
              const _k = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
              const _xy = (it) => { const t = it.transform || [1, 0, 0, 1, 0, 0]; return [t[4], t[5]]; };
              const _content = _its.map((it, i) => (!_art[i] ? { k: _k(it.str), xy: _xy(it) } : null)).filter(Boolean);
              const _twin = (a, b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)) && Math.min(a.length, b.length) >= 0.8 * Math.max(a.length, b.length));
              const _keep = _its.filter((it, i) => {
                if (!_art[i]) return true;
                const k = _k(it.str), xy = _xy(it);
                if (k.length < 3) return true;
                return !_content.some((c) => Math.abs(c.xy[0] - xy[0]) <= 6 && Math.abs(c.xy[1] - xy[1]) <= 6 && _twin(c.k, k));
              });
              if (_keep.length < _its.length) { _overlayDupDropped += _its.length - _keep.length; tc.items = _keep; }
            }
          } catch (_) {
            tc = await _withTimeout(page.getTextContent(), 30000, 'getTextContent (text layer) p' + p);
          }
          // Lam-alef order repair (2026-10-17): pdf.js reverses the two letters of a ligature glyph, so
          // ~10% of the words in a real Arabic school letter came out wrong (some as other real words).
          if ((tc.items || []).some((it) => _ALLO_ALEF_LAM.test((it && it.str) || ''))) {
            try {
              const _ol = await _withTimeout(page.getOperatorList({ annotationMode: window.pdfjsLib.AnnotationMode ? window.pdfjsLib.AnnotationMode.DISABLE : 0 }), 30000, 'getOperatorList (ligature order) p' + p);
              const _runs = [];
              for (let oi = 0; oi < _ol.fnArray.length; oi++) if (_ol.fnArray[oi] === window.pdfjsLib.OPS.showText) _runs.push(_ol.argsArray[oi][0]);
              const _lig = _alloRepairRtlLigatures(tc.items || [], _runs);
              if (_lig.fixed > 0) { tc.items = _lig.items; _ligFixed += _lig.fixed; }
              else if (_lig.reason) { try { warnLog('[PDF Det] p' + p + ': Arabic ligature order not repaired (' + _lig.reason + ')'); } catch (_) {} }
            } catch (_) { /* pdf.js text ships unchanged */ }
          }
          // Recover each link's anchor text by overlap. Text items and annotation rects
          // share the unscaled PDF user space, so a simple area-overlap test is enough;
          // an item counts as inside the link when most of it falls within the rect.
          // Anything ambiguous simply yields no pair — the re-link pass then leaves that
          // link alone rather than guessing at it.
          if (_pageLinkAnnots.length > 0) {
            try {
              const _boxes = (tc.items || []).map((it) => {
                const _t = it.transform || [1, 0, 0, 1, 0, 0];
                const _w = it.width || 0;
                const _h = it.height || Math.abs(_t[3]) || 10;
                return { str: String(it.str || ''), x0: _t[4], y0: _t[5], x1: _t[4] + _w, y1: _t[5] + _h };
              });
              // (2026-10-28) A link that wraps onto the next line is one annotation rect per line; each
              // half alone ("Racial/Ethnic") matched the first place those words appear, a heading (NCES).
              // A rect for the same URL directly under the previous one continues that link's text.
              const _lastByUrl = new Map();
              for (const _la of _pageLinkAnnots) {
                const _rx0 = Math.min(_la.rect[0], _la.rect[2]), _rx1 = Math.max(_la.rect[0], _la.rect[2]);
                const _ry0 = Math.min(_la.rect[1], _la.rect[3]), _ry1 = Math.max(_la.rect[1], _la.rect[3]);
                let _txt = '', _prevB = null;
                for (const _b of _boxes) {
                  const _ox = Math.min(_b.x1, _rx1) - Math.max(_b.x0, _rx0);
                  const _oy = Math.min(_b.y1, _ry1) - Math.max(_b.y0, _ry0);
                  if (_ox <= 0 || _oy <= 0) continue;
                  const _bw = Math.max(0.01, _b.x1 - _b.x0), _bh = Math.max(1, _b.y1 - _b.y0);
                  const _area = Math.max(1, _bw * _bh);
                  let _part = '';
                  if ((_ox * _oy) / _area > 0.4) {
                    _part = _b.str;
                  } else if (_oy / _bh > 0.4 && _b.str.length > 0) {
                    const _n = _b.str.length;
                    let _a = Math.max(0, Math.floor(((_rx0 - _b.x0) / _bw) * _n));
                    let _e = Math.min(_n, Math.ceil(((_rx1 - _b.x0) / _bw) * _n));
                    while (_a > 0 && /\S/.test(_b.str[_a - 1]) && /\S/.test(_b.str[_a])) _a--;
                    while (_e < _n && /\S/.test(_b.str[_e - 1] || '') && /\S/.test(_b.str[_e])) _e++;
                    _part = _b.str.slice(_a, _e);
                  }
                  if (!_part) continue;
                  if (_txt && !/\s$/.test(_txt) && !/^\s/.test(_part) && _prevB) {
                    const _diffLine = Math.abs(_b.y0 - _prevB.y0) > 2;
                    const _gap = _b.x0 - _prevB.x1;
                    if (_diffLine || _gap > 0.14 * _bh) _txt += ' ';
                  }
                  _txt += _part;
                  _prevB = _b;
                }
                _txt = _txt.replace(/\s+/g, ' ').trim();
                const _lineH = _ry1 - _ry0;
                // The previous rect FOR THIS URL: other links' annotations can sit between the two halves
                // (USGS guide: a wrapped "[URL: ...page04/" + "Mextract.htm#copper/]." were #1 and #6).
                const _prevLink = _lastByUrl.get(_la.url);
                if (_prevLink && _txt && _ry1 <= _prevLink.ry0 + 0.5 * _lineH && _prevLink.ry0 - _ry1 <= 1.0 * _lineH) {
                  _prevLink.pair.text = (_prevLink.pair.text + ' ' + _txt).trim();
                  _prevLink.ry0 = _ry0;
                  continue;
                }
                const _pair = { text: _txt, url: _la.url, page: p };
                _lastByUrl.set(_la.url, { ry0: _ry0, pair: _pair });
                _srcLinkPairs.push(_pair);
              }
              // Short anchors stay out (too ambiguous to place); a joined two-line anchor counts whole.
              for (let _i = _srcLinkPairs.length - 1; _i >= 0; _i--) if (_srcLinkPairs[_i].page === p && _srcLinkPairs[_i].text.length < 8) _srcLinkPairs.splice(_i, 1);
            } catch (_) { /* pairing is a bonus signal — never fail a page over it */ }
          }
          // Column-aware reading order (H-5 repair, 2026-07-01). _alloOrderTextItems detects a
          // high-confidence column gutter and reads column-by-column; on ANY ambiguity (single
          // column, table-aligned rows, unbalanced sides) it returns the exact legacy
          // (y desc, x asc) sort — so non-columnar pages are byte-identical to before. The
          // legacy sort alone INTERLEAVED multi-column pages line-by-line, scrambling the
          // ground truth every downstream stage inherits.
          // (2026-11-03) A /Rotate page (notifications: a tabloid brochure at /Rotate 90) reports its text in the
          // UNROTATED space, so lines stacked sideways read as one line: columns interleaved ("days migrant asked
          // Residents") and lines glued ("may be" + "grade." = "begrade"). Order and join in the page's displayed
          // frame (y up); link pairing above keeps the original geometry, as annotation rects use it too.
          // Tables this page shows, for the fidelity note. Only a measured page counts, so a failure or the page cap makes the note quieter, never louder.
          if (deps.publishSourceTelemetry !== false && p <= 150) {
            try {
              let _shown = [];
              try {
                const _tree = await _withTimeout(page.getStructTree(), 15000, 'getStructTree (tables) p' + p);
                _shown = _alloTaggedTablesOnPage(_tree, _pageMarkedItems ? _alloTextByMarkedId(_pageMarkedItems) : null);
              } catch (_) { _shown = []; }
              if (!_shown.length && (tc.items || []).length >= 4) {
                const _tol = await _withTimeout(page.getOperatorList({ annotationMode: window.pdfjsLib.AnnotationMode ? window.pdfjsLib.AnnotationMode.DISABLE : 0 }), 30000, 'getOperatorList (tables) p' + p);
                const _tv = page.view || [0, 0, 612, 792];
                _shown = _alloRuledTablesOnPage(_tol.fnArray, _tol.argsArray, window.pdfjsLib.OPS, tc.items, Math.abs(_tv[2] - _tv[0]), true) || [];
              }
              if (_shown.length) {
                _srcTablesSeen.pages.push(p);
                _shown.forEach((t) => {
                  _srcTablesSeen.tables++; _srcTablesSeen.cells += t.cells;
                  // A page with form fields is a form, and a /Rotate page's geometry runs sideways: neither is rebuilt.
                  if (t.grid && !_pageWidgets && !page.rotate && _srcTableGridCells < 50000) {
                    const _data = _alloDataTableGrid(t.grid);
                    if (_data) { _srcTableGrids.push({ page: p, grid: _data }); _srcTableGridCells += t.cells; }
                  }
                });
              }
            } catch (_) { /* this page is simply not counted */ }
          }
          const _ordered = _alloOrderTextItems(_alloUprightTextItems(tc.items || [], page), {});
          const items = _ordered.items;
          if (_ordered.applied) { try { warnLog('[PDF Det] p' + p + ': multi-column layout detected (' + _ordered.columns + ' columns) — reading order repaired column-by-column'); } catch (_) {} }
          // H12: a reversed RTL line reads as perfect fidelity to every net in the pipeline
          // (they are all count/set based), so the only way anyone finds out is this line.
          if (_ordered.rtl && !_rtlOrderLogged) { _rtlOrderLogged = true; try { warnLog('[PDF Det] right-to-left script detected — reading each line right-to-left (logical order)'); } catch (_) {} }
          // Geometry-aware join (2026-08-04): join(' ') fragmented kerned words —
          // see _alloJoinOrderedTextItems. The trailing whitespace collapse is
          // unchanged, so this can only REMOVE bogus intra-word spaces.
          let pageText = _alloJoinOrderedTextItems(items, _ordered.rtl).replace(/\s+/g, ' ').trim();
          // Mechanism 2 repair: pdf.js also inserts spurious spaces INSIDE
          // items ("legal p ermanent ... U nited S tates"), which no join can
          // reach. Each pdf.js space is kept or dropped individually against
          // the content-stream oracle — dropped only when the junction's
          // characters appear contiguous and unspaced there, and never appear
          // spaced. See _alloRepairSpacesWithCs; characters are never touched.
          if (_pageSuspectSpaceSplit(pageText)) {
            const _lazyCs = await _getCsPages();
            if (_lazyCs && _lazyCs[p - 1]) {
              const _csCollapsed = _lazyCs[p - 1].replace(/\s+/g, ' ').trim();
              const _repair = _alloRepairSpacesWithCs(pageText, _csCollapsed);
              if (_repair.repaired > 0) {
                pageText = _repair.text;
                _csRepairedPages++;
                _csRepairedSpaces += _repair.repaired;
              }
            }
          }
          // Flag, do not blank: the editor path shows this text so a person can see it is garbled and
          // re-scan (see ProceedTransform); the remediation intake blanks flagged pages and OCRs them.
          const _unread = _alloPageTextUnreadable(pageText);
          if (_unread.unreadable) {
            unreadablePages.push({ pageNum: p, nonWs: _unread.nonWs, broken: _unread.broken, pua: _unread.pua });
            try { warnLog('[PDF Det] p' + p + ': text layer is unmapped glyph codes (' + _unread.broken + ' broken, ' + _unread.pua + ' private-use of ' + _unread.nonWs + ')'); } catch (_) {}
          }
          pages.push({ pageNum: p, text: pageText, columns: _ordered.applied ? _ordered.columns : 1 });
          if (_unread.unreadable) pages[pages.length - 1].textLayerUnreadable = true;
        } catch (pageErr) {
          const _pmsg = (pageErr && pageErr.message) || String(pageErr);
          pages.push({ pageNum: p, text: '', error: _pmsg });
          pageErrors.push({ pageNum: p, error: _pmsg });
          try { warnLog('[PDF Det] page ' + p + ' failed (' + (pdf.numPages - 1) + ' other pages still attempted): ' + _pmsg); } catch (_) {}
        }
      }
      // M12: park the real source-link count for the structural fidelity net. Same idiom as H14 —
      // the net runs thousands of lines away, long after this function has returned.
      // Deep dive 2026-07-27: a PAGE-RANGE run remediates a slice, so a whole-document baseline
      // guarantees a false 'dropped links' warning (30 source links vs a 10-page output). Publish the
      // baseline only when the run covers everything; null means 'not measured' and the net falls back
      // to the markdown count, which is correct for the OCR path.
      const _srcLinkAnnotations = _srcLinkUrls.size;
      // The PAGE-RANGE guard lives at the CONSUMER, not here: this extractor takes only `base64`
      // and has no idea whether the run is remediating a slice. See _srcStructCounts in
      // fixAndVerifyPdf and _srcLinks in the view's Fix Remaining lane — both refuse the baseline
      // when a range is set, because a whole-document count against a 10-page output is a
      // guaranteed false "dropped links" warning. (check_free_vars caught the first attempt to read
      // a `pageRange` that does not exist in this scope — three ReferenceErrors in waiting.)
      try { if (deps.publishSourceTelemetry !== false && typeof window !== 'undefined') window.__alloSourceLinkCount = _srcLinkAnnotations; } catch (_) {}
      try {
        if (deps.publishSourceTelemetry !== false && typeof window !== 'undefined') {
          window.__alloSourceTables = _srcTablesSeen.tables > 0 ? _srcTablesSeen : null;
          window.__alloSourceTableGrids = _srcTableGrids.length ? _srcTableGrids : null;
        }
      } catch (_) {}
      // Distinct field names where the PDF supplies them (a radio group is several
      // widgets but ONE field); widget count otherwise.
      try {
        if (deps.publishSourceTelemetry !== false && typeof window !== 'undefined') {
          window.__alloSourceFormFields = {
            fields: _srcFieldNames.size > 0 ? _srcFieldNames.size : _srcFieldWidgets,
            widgets: _srcFieldWidgets,
            withAccessibleName: _srcFieldsNamed,
          };
        }
      } catch (_) {}
      if (_srcFieldWidgets > 0) { try { warnLog('[PDF Det] ' + _srcFieldWidgets + ' form control(s) in the source (' + _srcFieldsNamed + ' with an author-supplied accessible name) — an HTML export cannot carry them'); } catch (_) {} }
      // Distinct (text, url) pairs, longest text first so a link whose text contains a
      // shorter link's text is re-attached before the shorter one can claim the words.
      try {
        if (deps.publishSourceTelemetry !== false && typeof window !== 'undefined') {
          const _seen = new Set();
          // Keep how MANY times each pair occurred. A URL repeated on every page — the
          // district footer the link-count comment warns about — is one distinct pair but
          // several real links, and collapsing it to one left the document's remaining
          // occurrences as plain words. The count is a hard ceiling: the repair can never
          // create more links than the source actually carried.
          const _byPair = new Map();
          for (const _lp of _srcLinkPairs) {
            const _k = _lp.text + String.fromCharCode(0) + _lp.url;
            if (!_byPair.has(_k)) { _byPair.set(_k, { text: _lp.text, url: _lp.url, occurrences: 0, byPage: {} }); _seen.add(_k); }
            _byPair.get(_k).occurrences++;
            // Per page, so a page-range run restores only the links printed on its pages (NCES 2026-10-28).
            _byPair.get(_k).byPage[_lp.page] = (_byPair.get(_k).byPage[_lp.page] || 0) + 1;
          }
          window.__alloSourceLinks = [..._byPair.values()]
            .sort((a, b) => b.text.length - a.text.length)
            .slice(0, 500);
        }
      } catch (_) {}
      if (_srcLinkAnnotations > 0) { try { warnLog('[PDF Det] ' + _srcLinkAnnotations + ' distinct link destination(s) in the source (' + _srcLinkAnnotTotal + ' link annotation(s)) — the output is expected to carry them'); } catch (_) {} }
      if (_csRepairedPages > 0) { try { warnLog('[PDF Det] content-stream spacing repair: removed ' + _csRepairedSpaces + ' spurious space(s) across ' + _csRepairedPages + ' page(s) — characters untouched'); } catch (_) {} }
      if (_ligFixed > 0) { try { warnLog('[PDF Det] Arabic ligature order repaired: ' + _ligFixed + ' lam-alef ligature(s) put back in reading order'); } catch (_) {} }
      if (_overlayDupDropped > 0) { try { warnLog('[PDF Det] read once: ' + _overlayDupDropped + ' text item(s) the source marks as page decoration that repeat text the page already prints (an overlay copy)'); } catch (_) {} }
      const fullText = pages.map(p => p.text).filter(Boolean).join('\n\n');
      // Denominator fix: average against pages that ACTUALLY produced text. A
      // 20-page doc where 1 page failed and 19 produced text shouldn't get
      // an inflated /20 denominator that drops avgCharsPerPage below the
      // isScanned threshold on perfectly good text-layer documents.
      const nonBlankPages = pages.filter(p => p.text && p.text.length > 0).length;
      const avgCharsPerPage = nonBlankPages > 0 ? fullText.length / nonBlankPages : 0;
      return {
        fullText,
        pages,
        pageCount: pdf.numPages,
        sourceCharCount: fullText.length,
        isScanned: avgCharsPerPage < 50,
        pageErrors,
        unreadablePages,
      };
    } catch (e) {
      const msg = e?.message || '';
      // Structured pdf.js error first (PasswordException is stable across versions/wording), with the
      // message-regex kept as a fallback — so a version that changes the message text can't misclassify.
      const isEncrypted = (e && e.name === 'PasswordException') || /password|encrypted|decrypt/i.test(msg);
      const isCorrupt = !isEncrypted && /invalid|corrupt|unexpected|stream/i.test(msg);
      if (isEncrypted) {
        warnLog('[PDF Det] PDF is password-protected — falling through to Vision OCR');
        if (typeof addToast === 'function') addToast(t('toasts.pdf_appears_password_protected_using'), 'info');
      } else if (isCorrupt) {
        warnLog('[PDF Det] PDF may be corrupted:', msg);
        if (typeof addToast === 'function') addToast(t('toasts.pdf_may_corrupted_malformed_attempting'), 'info');
      } else {
        // Input forensics (2026-08-23, field log): "The PDF file is empty, i.e. its size is zero
        // bytes" arrived here for a 5.4MB document. The extractor clones before pdf.js, so a
        // zero-byte read means the INPUT was already empty — either an empty/blank base64 string
        // or a Uint8Array whose buffer an upstream pdf.js call detached (the documented
        // detached-buffer -> phantom-zero class). Log which, so the next field log answers this
        // in one line instead of an archaeology session.
        const _inKind = _isBytes
          ? ('bytes len=' + base64.length + (base64.buffer && base64.buffer.byteLength === 0 ? ' (buffer DETACHED upstream)' : ''))
          : ('string len=' + String(base64 == null ? '' : base64).length);
        warnLog('[PDF Det] extractPdfTextDeterministic failed:', msg, '— input was ' + _inKind);
      }
      return { fullText: '', pages: [], pageCount: 0, sourceCharCount: 0, isScanned: true, error: msg, isEncrypted, isCorrupt, pageErrors: [] };
    } finally { if (pdf) { try { pdf.destroy(); } catch (_) {} } }
  };

  // ── AcroForm field-value extraction (DARK in slice 1, 2026-06-07) ──
  // FERPA-sensitive: filled IEPs, worksheets, and clinician forms carry student PII
  // in field /V values (name, DOB, disability category, parent contact, signature
  // image). Default opts.consent = false makes the helper SAFE-BY-DEFAULT:
  //   - structured `fields` array is ALWAYS populated (name + type + value)
  //     but is NOT joined into a flowing text string until consent=true
  //   - the `fieldText` string field is '' when consent=false
  //   - warnLog NEVER stringifies any field value (only counts) — search the body
  //   - field NAMES go into structured fields[] only; the user-visible
  //     toast / fieldText path emits a per-extraction nonce-prefixed marker
  //     to prevent value-borne injection of fake fields into AI ground truth
  //   - signed PDFs are detected via /SigFlags bit 1 ("SignaturesExist") and
  //     surfaced to the caller so the tagging path can SKIP modifications that
  //     would invalidate the /Sig ByteRange hash
  //
  // SECURITY CONTRACT: this helper MUST NOT be called from any code path that
  // forwards text to Gemini / logs / persists, until the FERPA consent flow +
  // per-profile studentProjectSettings.allowFormValueExtraction toggle ships.
  // The retention-gate at the round-trip text-diff site MUST pass consent:false
  // on both sides regardless of the user's choice — comparing filled-in values
  // pre/post-save would produce noise (pdf-lib re-serializes /V) and would also
  // be a privacy escalation (PII flows through a code path it doesn't need to).
  //
  // See workflow w3tuxi0l5 plan + adversarial verification gaps A/B/C/D folded in.
  const extractPdfFormFieldsDeterministic = async (base64, opts) => {
    const consent = !!(opts && opts.consent);
    // Anti-injection nonce: every emitted marker is prefixed with a per-call
    // random suffix so a teacher's narrative goal containing literal "[FormField]"
    // (or a malicious filled /V) cannot forge a fake field row into the AI ground
    // truth. Logged once in the structured return for downstream parsers.
    const _r = (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues)
      ? (() => { const u = new Uint32Array(1); window.crypto.getRandomValues(u); return u[0].toString(36).slice(0, 6); })()
      : ('rnd' + Math.floor(performance && performance.now ? performance.now() : 0).toString(36).slice(-6));
    const sentinelNonce = _r;
    const sentinel = '[FormField:' + sentinelNonce + ']';
    // ZWSP-escape any literal "[FormField:" occurrences inside emitted values
    // so a value-borne injection cannot spoof the sentinel even with the nonce.
    const _ZWSP = '​';
    const _escFieldMarker = (s) => String(s == null ? '' : s).replace(/\[FormField:/g, '[FormField' + _ZWSP + ':');
    if (typeof window === 'undefined' || !window.PDFLib || !window.PDFLib.PDFDocument) {
      return { hadForm: false, fields: [], fieldText: '', fieldCharCount: 0, suppressedForConsent: !consent, sentinelNonce, error: 'PDFLib not loaded' };
    }
    const PDFLib = window.PDFLib;
    let doc;
    try {
      const bytes = (typeof Uint8Array !== 'undefined' && base64 instanceof Uint8Array) ? base64 : _b64ToBytes(base64);
      doc = await PDFLib.PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
    } catch (e) {
      return { hadForm: false, fields: [], fieldText: '', fieldCharCount: 0, suppressedForConsent: !consent, sentinelNonce, error: (e && e.message) || 'PDF load failed' };
    }
    // Detect existing digital signatures — Stage-3 form tagging caller MUST skip
    // tagging if hasSignatures is true (modifying byte tree invalidates /Sig).
    let hasSignatures = false;
    try {
      let acro = doc.catalog.get(PDFLib.PDFName.of('AcroForm'));
      if (acro && doc.context && typeof doc.context.lookup === 'function') { try { acro = doc.context.lookup(acro) || acro; } catch (_) {} }
      if (acro && typeof acro.get === 'function') {
        let sigFlags = acro.get(PDFLib.PDFName.of('SigFlags'));
        if (sigFlags && doc.context && typeof doc.context.lookup === 'function') { try { sigFlags = doc.context.lookup(sigFlags) || sigFlags; } catch (_) {} }
        if (sigFlags) {
          const sigVal = (typeof sigFlags.asNumber === 'function') ? sigFlags.asNumber()
            : (typeof sigFlags.numberValue === 'number') ? sigFlags.numberValue
            : (typeof sigFlags.value === 'number') ? sigFlags.value
            : Number(String(sigFlags));
          if ((sigVal | 0) & 1) hasSignatures = true;
        }
      }
    } catch (_) {}
    let form, allFields = [];
    try {
      form = doc.getForm();
      allFields = form.getFields();
    } catch (_e) {
      return { hadForm: false, fields: [], fieldText: '', fieldCharCount: 0, suppressedForConsent: !consent, sentinelNonce, hasSignatures };
    }
    const hadForm = allFields.length > 0;
    if (!hadForm) {
      return { hadForm: false, fields: [], fieldText: '', fieldCharCount: 0, suppressedForConsent: !consent, sentinelNonce, hasSignatures };
    }
    const fields = [];
    for (const f of allFields) {
      let type = 'Unknown';
      let value = null;
      let name = '';
      try { name = f.getName() || ''; } catch (_) {}
      try {
        if (PDFLib.PDFTextField && f instanceof PDFLib.PDFTextField) { type = 'Text'; value = f.getText(); }
        else if (PDFLib.PDFCheckBox && f instanceof PDFLib.PDFCheckBox) { type = 'Checkbox'; value = f.isChecked(); }
        else if (PDFLib.PDFRadioGroup && f instanceof PDFLib.PDFRadioGroup) { type = 'Radio'; value = f.getSelected(); }
        else if (PDFLib.PDFDropdown && f instanceof PDFLib.PDFDropdown) { type = 'Dropdown'; value = f.getSelected(); }
        else if (PDFLib.PDFOptionList && f instanceof PDFLib.PDFOptionList) { type = 'Listbox'; value = f.getSelected(); }
        else if (PDFLib.PDFSignature && f instanceof PDFLib.PDFSignature) { type = 'Signature'; value = '<signed>'; }
      } catch (_e2) { type = 'Unknown'; value = null; }
      // CRITICAL: never warnLog field VALUES — only types/counts.
      fields.push({ name, type, value });
    }
    let fieldText = '';
    if (consent) {
      const lines = fields.map((entry) => {
        const safeName = _escFieldMarker(entry.name);
        let v;
        if (entry.value === null || entry.value === undefined || entry.value === '') v = '<empty>';
        else if (entry.type === 'Checkbox') v = entry.value ? '[x]' : '[ ]';
        else if (entry.type === 'Radio' && !entry.value) v = '<not selected>';
        else if (Array.isArray(entry.value)) v = entry.value.length ? entry.value.join(', ') : '<no options selected>';
        else if (typeof entry.value === 'string') v = entry.value.replace(/\n/g, '␋');
        else if (typeof entry.value === 'number' || typeof entry.value === 'boolean') v = String(entry.value);
        else v = '<non-string value>';
        const safeV = _escFieldMarker(v);
        return sentinel + ' ' + safeName + ': ' + safeV;
      });
      fieldText = lines.join('\n');
    }
    return {
      hadForm: true,
      fields,
      fieldText,
      fieldCharCount: fieldText.length,
      suppressedForConsent: !consent,
      sentinelNonce,
      hasSignatures,
    };
  };

  // ── Tier 8: extract PDF tag structure ──
  // Modern tagged PDFs (textbook exports, gov docs, well-prepared LMS exports)
  // ship a logical structure tree (H1/H2/P/Table/Figure/etc.). pdf.js exposes
  // this via page.getStructTree(). The tree nodes don't carry text directly —
  // their leaf children are marked-content references (`{type: 'content', id}`)
  // that we resolve against page.getTextContent({ includeMarkedContent: true }).
  // Result: real heading text the AI prompt + axe-baseline HTML can use.
  const extractPdfStructTree = async (base64) => {
    let pdf = null; // hoisted so finally can always destroy() — was leaking the pdf.js worker doc
    try {
      await ensurePdfJsLoaded();
      if (!window.pdfjsLib) return { hasTags: false };
      const raw = base64.includes(',') ? base64.split(',')[1] : base64;
      const bytes = _b64ToBytes(base64); // capped at _MAX_PDF_BYTES (was raw atob — uncapped OOM on low-RAM devices)
      pdf = await _withTimeout(window.pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise, 60000, 'pdf.js getDocument (structTree)');
      const roleCounts = {};
      const headings = []; // { level, text, page }
      const figureAlts = []; // { page, indexOnPage, alt }
      const formulas = []; // { page, alt, actualText, text }
      let altWithText = 0;
      let altMissing = 0;
      let anyTagsFound = false;
      let catalogLang = null;
      let markInfo = null;
      const outlines = [];

      // Fail-soft document-level metadata: catalog /Lang, /MarkInfo, /Outlines bookmarks.
      const _normBcp47 = (rawLang) => {
        if (typeof rawLang !== 'string') return null;
        const c = rawLang.trim().toLowerCase().replace(/_/g, '-');
        if (!c) return null;
        const valid = typeof _auditLanguageTagIsValid === 'function'
          ? _auditLanguageTagIsValid(c)
          : /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(c);
        return valid ? c : null;
      };
      try {
        if (typeof pdf.getMetadata === 'function') {
          const meta = await _withTimeout(pdf.getMetadata(), 15000, 'pdf.getMetadata (structTree)');
          const infoLang = meta && meta.info && meta.info.Language;
          const xmpLang = meta && meta.metadata && typeof meta.metadata.get === 'function'
            ? (meta.metadata.get('dc:language') || meta.metadata.get('xml:lang'))
            : null;
          const xmpFirst = Array.isArray(xmpLang) ? xmpLang[0] : xmpLang;
          catalogLang = _normBcp47(infoLang) || _normBcp47(xmpFirst);
        }
      } catch (_) { /* optional metadata */ }
      try {
        if (typeof pdf.getMarkInfo === 'function') {
          const mi = await _withTimeout(pdf.getMarkInfo(), 15000, 'pdf.getMarkInfo (structTree)');
          if (mi && typeof mi === 'object') {
            markInfo = { marked: !!mi.Marked, suspects: !!mi.Suspects };
          }
        }
      } catch (_) { /* optional markInfo */ }
      try {
        if (typeof pdf.getOutline === 'function') {
          const rawOutline = await _withTimeout(pdf.getOutline(), 15000, 'pdf.getOutline (structTree)');
          const _walkOutline = (items, level) => {
            if (!Array.isArray(items) || level > 6) return;
            for (let i = 0; i < items.length && outlines.length < 100; i++) {
              const it = items[i];
              if (!it || typeof it !== 'object') continue;
              const title = String(it.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
              if (title) outlines.push({ level, title });
              if (Array.isArray(it.items) && it.items.length > 0 && outlines.length < 100) {
                _walkOutline(it.items, level + 1);
              }
            }
          };
          if (Array.isArray(rawOutline) && rawOutline.length > 0) _walkOutline(rawOutline, 1);
        }
      } catch (_) { /* optional bookmarks */ }

      // Collect every marked-content ID under `node` (recursive), so a heading
      // wrapping multiple text runs assembles its full text.
      const _collectMcids = (node, acc) => {
        if (!node || typeof node !== 'object') return acc;
        if (Array.isArray(node.children)) {
          node.children.forEach(c => {
            if (!c) return;
            if (typeof c === 'object' && c.type === 'content' && c.id != null) {
              acc.push(String(c.id));
            } else if (typeof c === 'object' && c.role) {
              _collectMcids(c, acc);
            }
          });
        }
        return acc;
      };

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await _withTimeout(pdf.getPage(p), 30000, 'getPage (structTree) p' + p);
        let structTree = null;
        try { structTree = await _withTimeout(page.getStructTree(), 30000, 'getStructTree p' + p); } catch (_) { continue; }
        if (!structTree) continue;

        // Build MCID → text map for this page. Pages without tagged content
        // produce an empty map, which is fine — heading text just stays empty.
        const mcidToText = {};
        try {
          const tc = await _withTimeout(page.getTextContent({ includeMarkedContent: true }), 30000, 'getTextContent (structTree) p' + p);
          let stack = [];
          (tc.items || []).forEach(item => {
            if (!item) return;
            if (item.type === 'beginMarkedContent' || item.type === 'beginMarkedContentProps') {
              if (item.id != null) stack.push(String(item.id));
              else stack.push(null);
            } else if (item.type === 'endMarkedContent') {
              stack.pop();
            } else if (item.str != null && stack.length > 0) {
              const top = stack[stack.length - 1];
              if (top != null) mcidToText[top] = (mcidToText[top] || '') + item.str + ' ';
            }
          });
        } catch (_) { /* no marked content on this page */ }

        let pageFigIdx = 0;
        const _walk = (node) => {
          if (!node || typeof node !== 'object') return;
          if (node.role) {
            anyTagsFound = true;
            roleCounts[node.role] = (roleCounts[node.role] || 0) + 1;
            const m = /^H([1-6]?)$/.exec(node.role);
            if (m) {
              const level = m[1] ? parseInt(m[1], 10) : 1;
              const mcids = _collectMcids(node, []);
              const text = mcids.map(id => mcidToText[id] || '').join('').replace(/\s+/g, ' ').trim().slice(0, 300);
              if (text) headings.push({ level, text, page: p });
            }
            if (node.role === 'Figure' || node.role === 'Image') {
              pageFigIdx++;
              const figAlt = typeof node.alt === 'string' ? node.alt.replace(/\s+/g, ' ').trim() : '';
              if (figAlt) {
                altWithText++;
                if (figureAlts.length < 100) figureAlts.push({ page: p, indexOnPage: pageFigIdx, alt: figAlt.slice(0, 600) });
              } else {
                altMissing++;
              }
            }
            if (node.role === 'Formula' && formulas.length < 100) {
              const fAlt = typeof node.alt === 'string' ? node.alt.replace(/\s+/g, ' ').trim() : '';
              const fActual = typeof node.actualText === 'string' ? node.actualText.replace(/\s+/g, ' ').trim() : '';
              const fMcids = _collectMcids(node, []);
              const fText = fMcids.map(id => mcidToText[id] || '').join('').replace(/\s+/g, ' ').trim();
              if (fAlt || fActual || fText) {
                formulas.push({ page: p, alt: fAlt.slice(0, 600), actualText: fActual.slice(0, 600), text: fText.slice(0, 600) });
              }
            }
          }
          if (Array.isArray(node.children)) {
            node.children.forEach(c => { if (c && typeof c === 'object' && c.role) _walk(c); });
          }
        };
        _walk(structTree);
      }

      return {
        hasTags: anyTagsFound,
        roleCounts,
        headings: headings.slice(0, 100),
        headingCount: headings.length,
        altTextPresent: altWithText,
        altTextMissing: altMissing,
        figureAlts,
        formulas,
        catalogLang,
        markInfo,
        outlines,
        pageCount: pdf.numPages,
      };
    } catch (e) {
      warnLog('[PDF StructTree] extraction failed:', e?.message || e);
      return { hasTags: false, error: e?.message || String(e) };
    } finally {
      if (pdf) { try { pdf.destroy(); } catch (_) {} } // release the pdf.js worker doc on every path
    }
  };

  // ── Document Builder Tier 2: AI theme CSS contrast validator + auto-fixer ──
  // Sister of sanitizeCustomExportCSS — that one blocks XSS, this one blocks
  // accessibility regressions. The AI theme generator can return CSS with
  // color pairs that fail WCAG AA contrast (4.5:1 for body text). Without
  // validation, a user prompt of "make it look like Sailor Moon" yields
  // pastel-on-pastel that screen-low-vision users can't read.
  //
  // Mechanics: walk the CSS rule-by-rule via a brace-depth state machine
  // (handles @media + nested rules), parse each rule's `color:` and
  // `background[-color]:` declarations, compute WCAG contrast ratio, auto-fix
  // the foreground via iterative darken/lighten until the pair passes the
  // target ratio. Body-level bg is detected and used as the ambient
  // background for rules that only set `color:`.
  //
  // Returns: { css: <validated and fixed>, fixes: [...], fixCount: N }
  // Each fix entry: { selector, prop, before, after, ratio (pre-fix) }.
  const validateAndFixCssContrast = (cssText, options) => {
    options = options || {};
    const targetRatio = options.targetRatio || 4.5;
    const defaultAmbient = options.ambientBg || [255, 255, 255];
    if (!cssText || typeof cssText !== 'string') return { css: cssText || '', fixes: [], fixCount: 0 };

    // ── Color helpers (intentionally duplicated from sanitizeStyleForWCAG ──
    // closure to avoid a refactor that would touch the larger sanitizer).
    const _hexToRgb = (hex) => {
      const h = String(hex || '').replace('#', '').trim();
      if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
      if (h.length === 6) return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
      return null;
    };
    const _rgbToHex = (r, g, b) => '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
    const _luminance = (r, g, b) => {
      const [rs, gs, bs] = [r/255, g/255, b/255].map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    const _contrastRatio = (rgb1, rgb2) => {
      const l1 = _luminance.apply(null, rgb1), l2 = _luminance.apply(null, rgb2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    // Minimal named-color subset (the colors most likely to fail contrast).
    // Full list lives in sanitizeStyleForWCAG; this is enough for AI output.
    const _named = {
      black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
      yellow: '#ffff00', cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080', grey: '#808080',
      silver: '#c0c0c0', maroon: '#800000', olive: '#808000', purple: '#800080', teal: '#008080',
      navy: '#000080', orange: '#ffa500', pink: '#ffc0cb', gold: '#ffd700', lightgray: '#d3d3d3',
      lightgrey: '#d3d3d3', darkgray: '#a9a9a9', darkgrey: '#a9a9a9',
    };
    const _parseColor = (str) => {
      if (!str) return null;
      const s = String(str).trim().toLowerCase();
      if (s.startsWith('#')) return _hexToRgb(s);
      const rgbM = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (rgbM) return [parseInt(rgbM[1]), parseInt(rgbM[2]), parseInt(rgbM[3])];
      if (_named[s]) return _hexToRgb(_named[s]);
      return null;
    };
    const _fixToPass = (fgRgb, bgRgb, target) => {
      let [r, g, b] = fgRgb;
      const bgLum = _luminance(bgRgb[0], bgRgb[1], bgRgb[2]);
      const isDarkBg = bgLum < 0.18;
      for (let i = 0; i < 30; i++) {
        if (_contrastRatio([r, g, b], bgRgb) >= target) break;
        if (isDarkBg) {
          r = Math.min(255, Math.round(r + (255 - r) * 0.15));
          g = Math.min(255, Math.round(g + (255 - g) * 0.15));
          b = Math.min(255, Math.round(b + (255 - b) * 0.15));
        } else {
          r = Math.max(0, Math.round(r * 0.82));
          g = Math.max(0, Math.round(g * 0.82));
          b = Math.max(0, Math.round(b * 0.82));
        }
      }
      return [r, g, b];
    };

    // ── Brace-depth state-machine parser: walks the CSS, extracting top-level
    // rule blocks plus any inside @media / @supports etc. Doesn't try to
    // parse selectors or declarations completely — just chunks into rules
    // that we can regex on for color/background pairs.
    const rules = []; // [{ selectorStart, selectorEnd, declStart, declEnd }]
    let i = 0;
    const N = cssText.length;
    while (i < N) {
      // Skip whitespace
      while (i < N && /\s/.test(cssText[i])) i++;
      if (i >= N) break;
      // @-rule: at-keyword followed by block or semicolon
      if (cssText[i] === '@') {
        // Find the @-rule's body: either ends at ; (no block) or matched { }
        let j = i + 1;
        while (j < N && cssText[j] !== '{' && cssText[j] !== ';') j++;
        if (j >= N) break;
        if (cssText[j] === ';') { i = j + 1; continue; }
        // Has a block. Recurse into it by treating the inside as more rules.
        // We skip the @-rule header but parse the block contents.
        let depth = 1;
        let k = j + 1;
        const innerStart = k;
        while (k < N && depth > 0) {
          if (cssText[k] === '{') depth++;
          else if (cssText[k] === '}') depth--;
          k++;
        }
        // Parse the inner content as additional CSS — append rules from there.
        const innerCss = cssText.slice(innerStart, k - 1);
        // We'll just rerun the outer logic by string-splicing back to a substring.
        // For simplicity we capture inner rules into the same rules array with adjusted offsets.
        let innerI = 0;
        while (innerI < innerCss.length) {
          while (innerI < innerCss.length && /\s/.test(innerCss[innerI])) innerI++;
          if (innerI >= innerCss.length) break;
          if (innerCss[innerI] === '@') { innerI++; continue; } // skip nested @ (rare)
          const selStart = innerI;
          while (innerI < innerCss.length && innerCss[innerI] !== '{') innerI++;
          if (innerI >= innerCss.length) break;
          const selEnd = innerI;
          innerI++; // past {
          const declStart = innerI;
          let d = 1;
          while (innerI < innerCss.length && d > 0) {
            if (innerCss[innerI] === '{') d++;
            else if (innerCss[innerI] === '}') d--;
            innerI++;
          }
          const declEnd = innerI - 1;
          rules.push({
            selectorStart: innerStart + selStart,
            selectorEnd: innerStart + selEnd,
            declStart: innerStart + declStart,
            declEnd: innerStart + declEnd,
          });
        }
        i = k;
        continue;
      }
      // Regular rule: selector { decls }
      const selStart = i;
      while (i < N && cssText[i] !== '{' && cssText[i] !== '}') i++;
      if (i >= N) break;
      if (cssText[i] === '}') { i++; continue; }
      const selEnd = i;
      i++; // past {
      const declStart = i;
      let depth = 1;
      while (i < N && depth > 0) {
        if (cssText[i] === '{') depth++;
        else if (cssText[i] === '}') depth--;
        i++;
      }
      const declEnd = i - 1;
      rules.push({ selectorStart: selStart, selectorEnd: selEnd, declStart, declEnd });
    }

    // ── Detect body-level background to use as ambient bg for rules that
    // only set `color`. Walk rules looking for a body selector with
    // background or background-color.
    let ambientBg = defaultAmbient;
    for (const r of rules) {
      const sel = cssText.slice(r.selectorStart, r.selectorEnd).trim().toLowerCase();
      if (sel === 'body' || sel === 'html' || sel === 'html, body' || sel === 'body, html') {
        const decls = cssText.slice(r.declStart, r.declEnd);
        const bgM = /\bbackground(?:-color)?\s*:\s*([^;]+)/i.exec(decls);
        if (bgM) {
          const firstToken = bgM[1].trim().split(/\s+/)[0];
          const parsed = _parseColor(firstToken);
          if (parsed) { ambientBg = parsed; break; }
        }
      }
    }

    // ── Walk rules from end to start so byte offsets stay valid when we splice in fixes.
    const fixes = [];
    let out = cssText;
    for (let r = rules.length - 1; r >= 0; r--) {
      const rule = rules[r];
      const selector = out.slice(rule.selectorStart, rule.selectorEnd).trim();
      const decls = out.slice(rule.declStart, rule.declEnd);
      const colorM = /(^|;)\s*color\s*:\s*([^;]+);?/i.exec(decls);
      if (!colorM) continue;
      const fgStr = colorM[2].trim();
      const fgRgb = _parseColor(fgStr);
      if (!fgRgb) continue;

      let bgRgb = ambientBg;
      const bgM = /(^|;)\s*background(?:-color)?\s*:\s*([^;]+);?/i.exec(decls);
      if (bgM) {
        const firstToken = bgM[2].trim().split(/\s+/)[0];
        const parsed = _parseColor(firstToken);
        if (parsed) bgRgb = parsed;
      }
      const ratio = _contrastRatio(fgRgb, bgRgb);
      if (ratio >= targetRatio) continue;
      const fixedRgb = _fixToPass(fgRgb, bgRgb, targetRatio);
      const fixedHex = _rgbToHex(fixedRgb[0], fixedRgb[1], fixedRgb[2]);
      if (fixedHex.toLowerCase() === fgStr.toLowerCase()) continue; // no change possible

      // POST-VERIFY: _fixToPass moves the foreground only and bails after a fixed number
      // of steps, so on a mid-tone background it can return an IMPROVED-but-still-failing
      // colour. Record whether the result actually REACHED the target — `reached:false`
      // entries are an honest "improved, still below AA" (the caller must not claim a pass).
      const newRatio = _contrastRatio(fixedRgb, bgRgb);
      fixes.push({
        selector: selector.slice(0, 60),
        prop: 'color',
        before: fgStr,
        after: fixedHex,
        ratio: Math.round(ratio * 10) / 10,
        newRatio: Math.round(newRatio * 10) / 10,
        reached: newRatio >= targetRatio,
      });

      // Apply the improved colour either way (closer to AA still helps the reader).
      const before = out.slice(0, rule.declStart);
      const after = out.slice(rule.declEnd);
      // Find and replace ONLY this rule's color declaration (first match in decls).
      const newDecls = decls.replace(colorM[0], colorM[0].replace(fgStr, fixedHex));
      out = before + newDecls + after;
    }

    const _reached = fixes.filter((f) => f.reached);
    const _residual = fixes.filter((f) => !f.reached);
    // fixCount = ONLY the ones that truly reached the target (so callers can honestly say
    // "N auto-fixed for AA"); residualCount = improved-but-still-failing, needs human review.
    return { css: out, fixes: fixes.reverse(), fixCount: _reached.length, residualCount: _residual.length, residual: _residual.reverse() };
  };

  // ── Document Builder Tier 1.1: custom CSS sanitizer ──
  // User-provided CSS (via the AI theme generator OR a directly-pasted custom
  // stylesheet) gets injected raw into exported HTML at the bottom of every
  // theme. That's an XSS surface — most acute when a district admin distributes
  // a "shared preset" and an attacker compromises the distribution channel.
  // CSS attack vectors we strip:
  //   - @import (external resource load, can carry tracking or fetch attacker CSS)
  //   - expression() (legacy IE script execution in CSS — dead in modern browsers
  //     but historically real and worth defense-in-depth)
  //   - javascript:/vbscript:/data:text/html URLs inside url() (script execution
  //     via background-image, list-style-image, cursor, etc.)
  //   - behavior: (legacy IE binding loader)
  //   - -moz-binding (mostly dead, historical XSS vector)
  //   - On-handler-style attributes in content: values
  // We don't try to allowlist properties — that's too restrictive for the
  // legitimate theming use case. Blocklist on known-dangerous patterns instead.
  // Logged when something gets stripped so users get feedback.
  const sanitizeCustomExportCSS = (rawCss) => {
    if (!rawCss || typeof rawCss !== 'string') return '';
    let out = String(rawCss);
    const stripped = [];
    // Strip CSS block comments FIRST so a payload can't hide a token from the patterns
    // below (e.g. `@imp/**/ort`, `expres/**/sion(`). Export CSS doesn't need comments.
    if (/\/\*[\s\S]*?\*\//.test(out)) { out = out.replace(/\/\*[\s\S]*?\*\//g, ' '); }
    // @import — external resource load. \s* (not \s+) so the quote-immediate form
    // `@import"https://attacker/x.css";` (no whitespace) is also caught.
    if (/@import\s*['"(]/i.test(out)) { stripped.push('@import'); out = out.replace(/@import\s*[^;]+;?/gi, ' /* @import stripped — external loads blocked for XSS safety */ '); }
    // expression() — IE script execution
    if (/expression\s*\(/i.test(out)) { stripped.push('expression()'); out = out.replace(/expression\s*\([^)]*\)/gi, '/* expression() stripped */'); }
    // Dangerous URL schemes inside url(...) — incl. data:image/svg+xml (SVG can carry scripts)
    if (/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html|data\s*:\s*image\/svg)/i.test(out)) {
      stripped.push('dangerous url()');
      out = out.replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html|data\s*:\s*image\/svg)[^'")]*['"]?\s*\)/gi, 'url("about:blank")');
    }
    // behavior: property (IE htc binding)
    if (/(^|[\s;{])behavior\s*:/i.test(out)) { stripped.push('behavior:'); out = out.replace(/(^|[\s;{])behavior\s*:[^;}]+;?/gi, '$1/* behavior stripped */'); }
    // -moz-binding (Firefox XBL loader, removed but defense in depth)
    if (/-moz-binding\s*:/i.test(out)) { stripped.push('-moz-binding:'); out = out.replace(/-moz-binding\s*:[^;}]+;?/gi, '/* -moz-binding stripped */'); }
    // Inline JS in content: via attr() doesn't execute, but bare javascript:
    // string in any property is suspicious enough to mention if found.
    if (/(?<![a-z])javascript\s*:/i.test(out)) {
      stripped.push('javascript:');
      out = out.replace(/(?<![a-z])javascript\s*:/gi, 'noop:');
    }
    // Neutralize the HTML rawtext end-tag sequence. This CSS is injected into a <style>
    // element, which the HTML parser closes at the first literal "</" — so a value like
    // `…}</style><script>…` would break out and execute. Valid CSS never contains "</",
    // so escaping it (the parser then sees "<\" — not a tag close) is loss-free and is
    // the actual XSS guard the prior sanitizer was missing.
    if (/<\//.test(out)) { stripped.push('</tag breakout'); out = out.replace(/<\//g, '<\\/'); }
    if (stripped.length > 0 && typeof warnLog === 'function') {
      warnLog('[sanitizeCustomExportCSS] stripped dangerous patterns: ' + stripped.join(', '));
    }
    return out;
  };

  // ── Tier 8 follow-up: build heading-aware HTML from extracted text + struct tree ──
  // When the source PDF ships H1/H2/H3 tags, axe-baseline should see real <h1>
  // elements rather than a wall of <p>. We splice the heading texts into the
  // extracted text by string match, wrap them at the correct level, and emit
  // the surrounding paragraphs as <p>. Falls back to all-flat-p when:
  //   - structTree is empty / hasTags=false
  //   - no headings have non-empty text
  //   - none of the heading texts can be located in the extracted text
  // The escape() pass guarantees axe runs on valid markup.
  const buildHtmlFromStructTree = (structTree, fullText) => {
    const _esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const _paras = (s) => {
      return String(s || '').split(/\n\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).map(p => '<p>' + _esc(p) + '</p>').join('\n');
    };
    const _flatFallback = () => _paras(fullText);

    if (!structTree || !structTree.hasTags || !Array.isArray(structTree.headings)) return _flatFallback();
    const headings = structTree.headings.filter(h => h && h.text && typeof h.level === 'number');
    if (headings.length === 0) return _flatFallback();
    if (!fullText) {
      // No body text — at least emit the heading scaffold.
      return headings.map(h => `<h${Math.min(Math.max(h.level, 1), 6)}>${_esc(h.text)}</h${Math.min(Math.max(h.level, 1), 6)}>`).join('\n');
    }

    // Normalize for matching: collapse whitespace and lowercase. We keep the
    // original-cased text for emission so the heading reads naturally.
    const _norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fullNorm = _norm(fullText);

    let html = '';
    let cursor = 0; // index into the ORIGINAL fullText
    let cursorNorm = 0; // index into normalized fullText (kept in lockstep)
    let matchedAny = false;

    for (const h of headings) {
      const headingText = h.text;
      const headingNorm = _norm(headingText);
      if (!headingNorm) continue;
      const idxNorm = fullNorm.indexOf(headingNorm, cursorNorm);
      if (idxNorm === -1) {
        // Heading wasn't found further in the text; emit standalone (no body
        // chunk consumed). This preserves heading scaffold even when extracted
        // text was noisy.
        html += `<h${Math.min(Math.max(h.level, 1), 6)}>${_esc(headingText)}</h${Math.min(Math.max(h.level, 1), 6)}>\n`;
        continue;
      }
      matchedAny = true;
      // Translate normalized index back to original-text index: walk the
      // original text consuming non-whitespace chars to align with normalized.
      // Cheap approximation: count non-space chars up to idxNorm and find that
      // many in the original starting from cursor.
      const target = idxNorm - cursorNorm; // chars to skip in normalized window
      let origIdx = cursor;
      let skipped = 0;
      while (origIdx < fullText.length && skipped < target) {
        const ch = fullText[origIdx];
        if (!/\s/.test(ch) || (skipped > 0 && fullText[origIdx - 1] && !/\s/.test(fullText[origIdx - 1]))) {
          // count this char as contributing to normalized length
          skipped++;
        }
        origIdx++;
      }
      const beforeChunk = fullText.slice(cursor, origIdx).trim();
      if (beforeChunk) html += _paras(beforeChunk) + '\n';
      html += `<h${Math.min(Math.max(h.level, 1), 6)}>${_esc(headingText)}</h${Math.min(Math.max(h.level, 1), 6)}>\n`;
      // Advance cursor past the heading (use the heading length in original
      // text as a rough advance — exact tracking would require char-by-char).
      cursor = origIdx + headingText.length;
      cursorNorm = idxNorm + headingNorm.length;
    }

    // Emit remainder
    const tail = fullText.slice(cursor).trim();
    if (tail) html += _paras(tail);

    return matchedAny ? html : _flatFallback();
  };

  // Lazy-load pako (zlib inflate/deflate) for Stage 4 PDF tagging's content-stream
  // surgery. Most PDFs ship their content streams FlateDecode-compressed so per-block
  // BDC/EMC injection requires inflate-edit-deflate. Loaded from CDN only on first
  // tagged-PDF export; no cost for any other code path.
  let _pakoLoadPromise = null;
  const ensurePakoLoaded = async () => {
    const ok = await _loadCdnScript('pako', [
      'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
      'https://unpkg.com/pako@2.1.0/dist/pako.min.js',
    ], () => !!(window.pako && typeof window.pako.inflate === 'function'));
    if (!ok) throw new Error('pako unavailable (all CDN sources failed)');
    return window.pako;
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

  // pako.inflate RETURNS undefined (no throw) for a zlib stream cut short before its checksum, which
  // pdf.js reads fine: OHCHR Spanish UDHR p5 decoded completely but its last bytes were missing, so
  // Stage 4 crashed on undefined.length, the probe skipped the page, its headings were dropped as
  // "off-page" and the orphan check withheld the whole PDF (2026-10-26). Keep what decoded; the page
  // is re-deflated whole when rewritten.
  const _stage4_inflate = (bytes) => {
    let out;
    try { out = window.pako.inflate(bytes); } catch (_) { out = undefined; }
    if (out && out.length) return out;
    const inf = new window.pako.Inflate();
    const chunks = [];
    inf.onData = (c) => chunks.push(c);
    inf.push(bytes, false);
    if (inf.err) throw new Error('content stream could not be decompressed: ' + (inf.msg || inf.err));
    const st = inf.strm;
    if (st && st.output && st.next_out > 0) chunks.push(st.output.subarray(0, st.next_out));
    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (!total) throw new Error('content stream could not be decompressed');
    const joined = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) { joined.set(c, at); at += c.length; }
    return joined;
  };

  // _stage4_parseBTSegments — find all BT...ET text-object spans in a content
  // stream (decompressed). Returns byte offsets + the (x,y) position set by
  // Tm or Td inside each span so we can match each span to a pdf.js text
  // item by coordinate.
  // opts.fine (2026-10-16): one segment per text-SHOWING operator (Tj, TJ, ', ") instead of one per
  // BT…ET object. Some generators draw a whole page of paragraphs in ONE text object, and one MCID
  // can belong to only one structure element, so no paragraph leaf could ever link to its text.
  // Marked content inside a text object is valid PDF (tagged PDFs put /Span BDC…EMC there); each
  // fine segment wraps just the show operator and its operands, so positioning operators and any
  // marked content the source already had stay outside our wrap and nesting stays balanced. Used
  // only on pages where the marked-content probe supplies the exact text of every segment.
  const _stage4_parseBTSegments = (streamBytes, opts) => {
    let s = '';
    for (let i = 0; i < streamBytes.length; i++) s += String.fromCharCode(streamBytes[i]);
    const masked = _stage4_maskStrings(s);
    const fine = !!(opts && opts.fine);
    // opts.splitFont (2026-10-27): a change of font NAME between show operators on one line starts a new
    // segment, so a bold run-in heading ("Integrated Pest Management M.S.A.D. #49 has...") is its own block
    // (notifications: 4 headings orphaned). createTaggedPdf turns it off for right-to-left documents.
    const splitFont = fine && !!(opts && opts.splitFont);
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
      if (!fine) { segments.push({ btStart, etEnd, x, y }); continue; }
      // LINE segments: consecutive show operators on one text line form one segment; a new one
      // starts where the text moves to a new line (Td/TD with a vertical move, T*, ' and ", or a Tm
      // with a new y). Not finer: glyph-by-glyph right-to-left text (Word draws some Arabic that
      // way, in visual order) must stay in ONE marked-content section for pdf.js to put it back
      // in logical order, and a word split across two show operators stays whole. A segment also
      // never spans the source's own BDC/BMC/EMC, so nesting stays balanced.
      // Operator scan of the body (strings are already masked to spaces): skip names, arrays and
      // dicts; numbers are remembered as operands; an operator is a bare token.
      const bodyStart = btStart + 2, bodyEnd = etEnd - 2;
      let i = bodyStart, prevOpEnd = bodyStart;
      let nums = [];
      let group = null;
      let newLinePending = false;
      let lastTmY = null;
      let lastName = null, curFont = null, fontChangePending = false;
      // (2026-11-03) A font change INSIDE a word is not a run-in heading: IRS 1040 prints its year
      // "(20)Tj /T1_3 1 Tf (25)Tj", and the split made "20" + "25", so the title no longer matched and orphaned
      // (PDF/UA ratchet). No split when nothing moved the pen and literal strings meet letter/digit to letter/digit.
      let movedSinceShow = false, prevShowLast = '';
      // A TJ whose array STARTS with a gap of >= 400/1000 em (a cell after _stage4_splitTJGaps) is a new block.
      let arrAt = -1, arrLead = null;
      // (2026-11-03) A pen move ALONG the line past the text already shown there by 3+ em is a new block too
      // (worksheet: "Rake" 17.2 em before "Chicken" by Td, two labels; Tm-positioned table cells). The shown width
      // is over-estimated (every string byte 0.7 em, 2-byte CIDs count twice), so word spacing never splits.
      let tfs = 1, tmScale = 1, lineBytes = 0, lineX = null, jumpPending = false;
      // (2026-11-06) A row label before a cell moves less than that (FDA letter: "1." then "Final Protocol Submission" 2.5 em
      // on, so the row header stayed empty). Up to 3 real characters shown (2-byte CIDs count once) and a move past 0.7 em
      // each plus 1 em is a new block: a short word plus its space never gets there.
      let lineChars = 0;
      const labelJump = (dx, scale) => lineChars > 0 && lineChars <= 3 && dx > (lineChars * 0.7 + 1) * tfs * scale;
      const closeGroup =() => { if (group) { segments.push({ btStart: group.start, etEnd: group.end, x, y }); group = null; } };
      while (i < bodyEnd) {
        const ch = masked[i];
        if (ch === '[') { arrAt = i; arrLead = null; i++; continue; }
        if (/\s/.test(ch) || ch === ']' || ch === '{' || ch === '}' || ch === '(' || ch === ')') { i++; continue; }
        if (ch === '<' || ch === '>') { i++; continue; }
        if (ch === '/') { const nameStart = i; i++; while (i < bodyEnd && !/[\s\/\[\]<>(){}%]/.test(masked[i])) i++; lastName = masked.slice(nameStart, i); continue; }
        if (/[-+.\d]/.test(ch)) {
          const numStart = i; i++;
          while (i < bodyEnd && /[-+.\deE]/.test(masked[i])) i++;
          nums.push(parseFloat(masked.slice(numStart, i)));
          if (arrAt >= 0 && arrLead === null) arrLead = s.slice(arrAt + 1, numStart).trim() === '' ? parseFloat(masked.slice(numStart, i)) : NaN;
          continue;
        }
        const opStart = i;
        if (ch === "'" || ch === '"') i++;
        else while (i < bodyEnd && /[A-Za-z0-9*]/.test(masked[i])) i++;
        if (i === opStart) { i++; continue; }
        const op = masked.slice(opStart, i);
        if (op === 'Tj' || op === 'TJ' || op === "'" || op === '"') {
          const gapLead = splitFont && op === 'TJ' && arrAt >= 0 && Number.isFinite(arrLead) && arrLead <= -400;
          arrAt = -1; arrLead = null;
          // the string's first / last byte; an array opening or closing with a kerning number gives '' (a gap)
          const operand = s.slice(prevOpEnd, opStart);
          const firstCh = (/^\s*\[?\s*\(([\s\S])/.exec(operand) || [])[1] || '';
          const midWord = fontChangePending && !movedSinceShow && /[A-Za-z0-9]/.test(prevShowLast) && /[A-Za-z0-9]/.test(firstCh);
          prevShowLast = (/([\s\S])\)\s*\]?\s*$/.exec(operand) || [])[1] || '';
          movedSinceShow = false;
          if (op === "'" || op === '"') { lineBytes = 0; lineChars = 0; }
          let _bytes = 0;
          operand.replace(/<([0-9A-Fa-f\s]*)>|\(((?:\\[\s\S]|[^\\)])*)\)/g, (_m, hx, lit) => {
            const b = [];
            if (hx != null) { const h = hx.replace(/\s/g, ''); for (let q = 0; q < h.length; q += 2) b.push(parseInt(h.substr(q, 2).padEnd(2, '0'), 16)); }
            else lit.replace(/\\([0-7]{1,3}|[\s\S])|([\s\S])/g, (_x, esc, ch) => { b.push(esc != null ? (/^[0-7]/.test(esc) ? parseInt(esc, 8) : 1) : ch.charCodeAt(0)); return _x; });
            _bytes += b.length;
            lineChars += b.length && b.length % 2 === 0 && b.every((v, q) => q % 2 === 1 || v === 0) ? b.length / 2 : b.length;
            return _m;
          });
          const jump = splitFont && jumpPending;
          jumpPending = false;
          lineBytes += _bytes;
          if (!group || newLinePending || (fontChangePending && !midWord) || gapLead || jump || op === "'" || op === '"') {
            closeGroup();
            let segStart = prevOpEnd;
            // Skip whitespace in the ORIGINAL text: in `masked` a string operand such as "( )" is
            // blanked to spaces and would be skipped too, putting BDC between operand and operator.
            while (segStart < opStart && /\s/.test(s[segStart])) segStart++;
            group = { start: segStart, end: i };
          } else {
            group.end = i;
          }
          newLinePending = false;
          fontChangePending = false;
        } else if (op === 'Tf') {
          if (splitFont && group && curFont !== null && lastName !== curFont) fontChangePending = true;
          curFont = lastName;
          if (nums.length && nums[nums.length - 1] > 0) tfs = nums[nums.length - 1];
        } else if (op === 'Td' || op === 'TD') {
          movedSinceShow = true;
          if (nums.length >= 2 && Math.abs(nums[nums.length - 1]) > 1e-9) newLinePending = true;
          else if (nums.length >= 2 && group && (nums[nums.length - 2] > (lineBytes * 0.7 + 3) * tfs || labelJump(nums[nums.length - 2], 1))) jumpPending = true;
          lineBytes = 0; lineChars = 0;
        } else if (op === 'T*') {
          newLinePending = true;
          lineBytes = 0; lineChars = 0;
        } else if (op === 'Tm') {
          movedSinceShow = true;
          const ty = nums.length >= 6 ? nums[nums.length - 1] : null;
          const tx = nums.length >= 6 ? nums[nums.length - 2] : null;
          if (ty === null || lastTmY === null || Math.abs(ty - lastTmY) > 1e-6) newLinePending = true;
          else if (group && lineX !== null && (tx - lineX > (lineBytes * 0.7 + 3) * tfs * tmScale || labelJump(tx - lineX, tmScale))) jumpPending = true;
          if (nums.length >= 6) tmScale = Math.hypot(nums[nums.length - 6], nums[nums.length - 5]) || 1;
          lastTmY = ty; lineX = tx; lineBytes = 0; lineChars = 0;
        } else if (op === 'BDC' || op === 'BMC' || op === 'EMC') {
          closeGroup();
        }
        nums = [];
        prevOpEnd = i;
      }
      closeGroup();
    }
    return segments;
  };

  // _stage4_splitTJGaps (2026-10-27) — a spreadsheet often draws a whole table ROW as ONE TJ array, cells
  // separated by large negative adjustments (mdoe expenditures: "[<..> -8605 <..> -8605 ...] TJ", 14 cells),
  // so the row was one block and no cell could link (3,457 cells orphaned). Each adjustment of at least
  // `minGap` thousandths of an em that sits between two string elements starts a new TJ: "[a -8605 b] TJ"
  // becomes "[a] TJ\n[-8605 b] TJ". Consecutive TJ operators continue from the current text position, so
  // the page draws exactly as before. Strings are masked, so brackets inside them are never touched.
  const _stage4_splitTJGaps = (bytes, minGap) => {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    const masked = _stage4_maskStrings(s);
    const cuts = [];
    const re = /\[([^\[\]]*)\]\s*TJ\b/g;
    let m;
    while ((m = re.exec(masked)) !== null) {
      // The masked text finds the array (strings, brackets inside them included, are blanked there); its
      // elements are read from the ORIGINAL bytes: literal strings depth- and escape-aware, hex strings to '>'.
      const base = m.index + 1, body = s.slice(base, base + m[1].length);
      const elems = []; // [{ kind: 'str' | 'num', at, value }]
      for (let i = 0; i < body.length;) {
        const ch = body[i];
        if (ch === '(') {
          let depth = 1, j = i + 1;
          while (j < body.length && depth > 0) { if (body[j] === '\\') { j += 2; continue; } if (body[j] === '(') depth++; else if (body[j] === ')') depth--; j++; }
          elems.push({ kind: 'str', at: i }); i = j; continue;
        }
        if (ch === '<') { const close = body.indexOf('>', i + 1); elems.push({ kind: 'str', at: i }); i = close < 0 ? body.length : close + 1; continue; }
        const nm = /^[-+]?(?:\d+\.?\d*|\.\d+)/.exec(body.slice(i));
        if (nm) { elems.push({ kind: 'num', at: i, value: parseFloat(nm[0]) }); i += nm[0].length; continue; }
        i++;
      }
      for (let k = 1; k < elems.length - 1; k++) {
        const e = elems[k];
        if (e.kind === 'num' && e.value <= -minGap && elems.slice(0, k).some((x) => x.kind === 'str') && elems.slice(k + 1).some((x) => x.kind === 'str')) cuts.push(base + e.at);
      }
    }
    if (!cuts.length) return bytes;
    let out = '', at = 0;
    for (const c of cuts) { out += s.slice(at, c) + '] TJ\n['; at = c; }
    out += s.slice(at);
    return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff);
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
  let _symbolRunsExcludedTotal = 0; // reset per createTaggedPdf run; reported in summary
  // Symbol-font run (Wingdings bullets etc.): pdf.js style fontFamily or a PUA-dense string.
  const _stage4_isSymbolItem = (it, styles) => {
    try {
      const fam = String((styles && styles[it.fontName] && styles[it.fontName].fontFamily) || '');
      if (/wingdings|webdings|dingbat|symbol|marlett/i.test(fam)) return true;
      const chars = Array.from(it.str || '');
      if (!chars.length) return false;
      const pua = chars.filter((c) => { const cp = c.codePointAt(0); return (cp >= 0xE000 && cp <= 0xF8FF) || cp === 0xF0B7 || cp === 0x25CF; }).length;
      return pua / chars.length >= 0.6;
    } catch (_) { return false; }
  };
  const _stage4_extractPdfjsItems = async (pdfjsDoc, pageIdx) => {
    try {
      const page = await _withTimeout(pdfjsDoc.getPage(pageIdx + 1), 30000, 'getPage (tagging) p' + (pageIdx + 1));
      const tc = await _withTimeout(page.getTextContent(), 30000, 'getTextContent (tagging) p' + (pageIdx + 1));
      // Symbol-font runs are decorative marks, not text (2026-06-12,
      // approved): Wingdings/Symbol/Dingbats bullets decode as glyph soup
      // that can never match a tag-tree leaf — every office-made PDF's
      // bullets were poisoning the linkage denominator and the declaration
      // gate. Flag them via pdf.js style fontFamily + a PUA-density check
      // (symbol glyphs map to U+F0xx); flagged items are excluded from
      // matching and counted for the honest report line.
      const _styles = tc.styles || {};
      const _isSymbolItem = (it) => _stage4_isSymbolItem(it, _styles);
      let _symbolRuns = 0;
      const out = (tc.items || [])
        .filter(it => it && typeof it.str === 'string' && it.str.trim().length > 0)
        .map(it => ({
          // Flag, don't filter (2026-06-12 refactor): removing items changed
          // segment↔item pairing from index to coordinate mode on bullet
          // pages. Symbolic items stay in the list — the wrap-builder routes
          // them to /Artifact instead (correct PDF semantics).
          symbolic: (() => { const sy = _isSymbolItem(it); if (sy) _symbolRuns++; return sy; })(),
          str: it.str,
          x: it.transform ? it.transform[4] : 0,
          y: it.transform ? it.transform[5] : 0,
          fontScale: it.transform ? Math.abs(it.transform[0] || it.transform[3] || 12) : 12,
          fontName: it.fontName || '',
          width: it.width || 0,
          height: it.height || 0,
        }));
      out._symbolRunsExcluded = _symbolRuns;
      _symbolRunsExcludedTotal += _symbolRuns;
      return out;
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
      // Prefer NON-symbolic items (audit 2026-06-13): a symbolic item
      // (Wingdings bullet) winning nearest-neighbour would route a REAL
      // text segment to /Artifact downstream — silent content loss. Track
      // the best non-symbolic separately; fall back to a symbolic match
      // only when no non-symbolic candidate exists at all.
      let best = null, bestDist = Infinity;
      let bestSym = null, bestSymDist = Infinity;
      for (const it of items) {
        const dx = it.x - seg.x, dy = it.y - seg.y;
        const d = dx * dx + dy * dy;
        if (it.symbolic) { if (d < bestSymDist) { bestSymDist = d; bestSym = it; } }
        else if (d < bestDist) { bestDist = d; best = it; }
      }
      matched[i] = best || bestSym || { str: '', fontScale: 12, fontName: '' };
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
        // Only LEAF roles are a text block's role; a grouping element's text (a whole /Sect)
        // starts with its first paragraph, so prefix matching tagged blocks /Sect (2026-10-16).
        // Nor a picture's: a <figure>'s text is its caption, and a printed caption block tagged /Figure had no /Alt
        // (budget2, 2026-11-03: 4 chart captions; "Every Figure has /Alt" failed). The caption's own item matches.
        if (oi && /^(Document|Part|Art|Sect|Div|NonStruct|L|LI|Table|TR|THead|TBody|TFoot|TOC|TOCI|Index|Form|Figure|Formula)$/.test(String(oi.role || ''))) continue;
        const ot = norm(oi && oi.text);
        if (ot.length < 4) continue;
        // Prefix relationships (either direction) are usually a pdf.js text run that
        // TRUNCATES the real heading — keep them. Bare mid-string containment with only
        // the 4-char floor was a mislabel vector (pipeline-review F3, 2026-07-01): a
        // short cell like "Item 1" inherited the role of ANY outline entry containing
        // those characters (e.g. an H3 "Item 1: Full Description"), silently promoting
        // a table cell to a heading. Containment now requires the contained string to
        // be ≥12 chars — long enough to be the actual heading text, not a fragment.
        if (ot.startsWith(itemText) || itemText.startsWith(ot)
            || (itemText.length >= 12 && ot.includes(itemText))
            || (ot.length >= 12 && itemText.includes(ot))) {
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
  // Wave 6 W6-6: decode single or chained PDF stream filters (ASCIIHexDecode, ASCII85Decode, FlateDecode).
  const _stage4_decodeAsciiHex = (u8) => {
    const out = [];
    let hi = -1;
    for (let i = 0; i < u8.length; i++) {
      const c = u8[i];
      if (c === 0x3e) break; // '>' EOD
      if (c <= 0x20) continue;
      const v = (c >= 0x30 && c <= 0x39) ? (c - 0x30) : (c >= 0x41 && c <= 0x46) ? (c - 55) : (c >= 0x61 && c <= 0x66) ? (c - 87) : -1;
      if (v < 0) return null;
      if (hi < 0) hi = v;
      else { out.push((hi << 4) | v); hi = -1; }
    }
    if (hi >= 0) out.push(hi << 4);
    return new Uint8Array(out);
  };
  const _stage4_decodeAscii85 = (u8) => {
    const out = [];
    const group = [];
    for (let i = 0; i < u8.length; i++) {
      const c = u8[i];
      if (c <= 0x20) continue;
      if (c === 0x7e && i + 1 < u8.length && u8[i + 1] === 0x3e) break; // '~>' EOD
      if (c === 0x7a) { // 'z' shorthand for 4 zero bytes
        if (group.length !== 0) return null;
        out.push(0, 0, 0, 0);
        continue;
      }
      if (c < 33 || c > 117) return null;
      group.push(c - 33);
      if (group.length === 5) {
        let val = 0;
        for (let k = 0; k < 5; k++) val = val * 85 + group[k];
        if (val > 0xFFFFFFFF) return null;
        out.push((val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff);
        group.length = 0;
      }
    }
    if (group.length === 1) return null;
    if (group.length > 1) {
      const n = group.length;
      while (group.length < 5) group.push(84);
      let val = 0;
      for (let k = 0; k < 5; k++) val = val * 85 + group[k];
      const tmp = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
      for (let k = 0; k < n - 1; k++) out.push(tmp[k]);
    }
    return new Uint8Array(out);
  };
  const _stage4_extractFilterNames = (filterObj, context) => {
    if (!filterObj) return [];
    const resolved = context && typeof context.lookup === 'function' ? (context.lookup(filterObj) || filterObj) : filterObj;
    if (!resolved) return [];
    if (typeof resolved.size === 'function' && typeof resolved.get === 'function') {
      const names = [];
      for (let i = 0; i < resolved.size(); i++) {
        const entry = context && typeof context.lookup === 'function' ? (context.lookup(resolved.get(i)) || resolved.get(i)) : resolved.get(i);
        const s = String(entry || '').replace(/^\//, '').trim();
        if (s) names.push(s);
      }
      return names;
    }
    const s = String(resolved || '').replace(/^\//, '').trim();
    return s ? [s] : [];
  };
  const _stage4_decodeStreamWithFilters = (raw, filterNames) => {
    let cur = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    for (const name of filterNames) {
      if (name === 'FlateDecode' || name === 'Fl') cur = _stage4_inflate(cur);
      else if (name === 'ASCII85Decode' || name === 'A85') { cur = _stage4_decodeAscii85(cur); if (!cur) throw new Error('invalid ASCII85Decode stream'); }
      else if (name === 'ASCIIHexDecode' || name === 'AHx') { cur = _stage4_decodeAsciiHex(cur); if (!cur) throw new Error('invalid ASCIIHexDecode stream'); }
      else throw new Error('unsupported PDF stream filter: ' + name);
    }
    return cur;
  };

  const _stage4_getStreamBytesAndFilter = (page, PDFName, context) => {
    const node = page.node;
    // /Contents can be a reference to an array (IRS 1913 form, 2026-11-05): resolve it, or the page reads as empty.
    const contents = context.lookup(node.get(PDFName.of('Contents')));
    if (!contents) return null;
    const parts = [];
    const consume = (ref) => {
      const stream = context.lookup(ref);
      if (!stream) return;
      const raw = stream.getContents ? stream.getContents() : null;
      if (!raw) return;
      const dict = stream.dict || null;
      const f = dict && dict.get ? dict.get(PDFName.of('Filter')) : null;
      const filters = _stage4_extractFilterNames(f, context);
      parts.push({ raw: raw instanceof Uint8Array ? raw : new Uint8Array(raw), filters });
    };
    if (typeof contents.size === 'function') {
      for (let k = 0; k < contents.size(); k++) consume(contents.get(k));
    } else {
      consume(contents);
    }
    if (parts.length === 0) return null;
    if (parts.length === 1) {
      const f0 = parts[0].filters;
      if (f0.length === 0) return { bytes: parts[0].raw, filter: null };
      if (f0.length === 1 && (f0[0] === 'FlateDecode' || f0[0] === 'Fl')) return { bytes: parts[0].raw, filter: 'FlateDecode' };
      return { bytes: _stage4_decodeStreamWithFilters(parts[0].raw, f0), filter: null, recompress: true };
    }
    // Each stream is compressed on its own, so joined raw bytes would inflate to the FIRST stream only and the rest of
    // the page would be lost. A page's streams are one sequence with white space between them (ISO 32000 7.8.2).
    const decoded = parts.map((p) => (p.filters.length ? _stage4_decodeStreamWithFilters(p.raw, p.filters) : p.raw));
    let total = decoded.length - 1;
    for (const d of decoded) total += d.length;
    const combined = new Uint8Array(total);
    let off = 0;
    decoded.forEach((d, i) => { if (i) combined[off++] = 0x0a; combined.set(d, off); off += d.length; });
    return { bytes: combined, filter: null, recompress: parts.some((p) => p.filters.length > 0) };
  };

  // Wave 6 W6-6: Safe single-level Form XObject (/Subtype /Form invoked via `/Name Do`) inliner
  // used ONLY when a page's direct /Contents has 0 BT..ET text segments (common in LaTeX/Canva/InDesign PDFs).
  // Merges non-colliding /Resources sub-dicts onto the page so fonts/states stay valid; bails safely on any collision.
  const _stage4_tryInlineFormXObjects = (page, bytes, PDFName, context) => {
    try {
      const resources = context.lookup(page.node.get(PDFName.of('Resources')));
      if (!resources || typeof resources.get !== 'function') return null;
      const xobjs = context.lookup(resources.get(PDFName.of('XObject')));
      if (!xobjs || typeof xobjs.get !== 'function') return null;
      let s = '';
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      const doRe = /\/([A-Za-z0-9_.+-]+)\s+Do\b/g;
      const matches = [];
      let m;
      while ((m = doRe.exec(s)) !== null) matches.push({ index: m.index, length: m[0].length, name: m[1] });
      if (!matches.length || matches.length > 16) return null;
      const expansions = [];
      const pendingMerges = [];
      let totalAdded = 0;
      const SUBDICTS = ['Font', 'ExtGState', 'ColorSpace', 'Pattern', 'Shading', 'Properties'];
      for (const hit of matches) {
        const ref = xobjs.get(PDFName.of(hit.name));
        const xStream = ref ? context.lookup(ref) : null;
        if (!xStream || !xStream.dict || typeof xStream.getContents !== 'function') continue;
        const subtype = context.lookup(xStream.dict.get(PDFName.of('Subtype')));
        if (!subtype || String(subtype) !== '/Form') continue;
        const raw = xStream.getContents();
        if (!raw || !raw.length) continue;
        const filters = _stage4_extractFilterNames(xStream.dict.get(PDFName.of('Filter')), context);
        const decoded = filters.length ? _stage4_decodeStreamWithFilters(raw, filters) : (raw instanceof Uint8Array ? raw : new Uint8Array(raw));
        let formStr = '';
        for (let i = 0; i < decoded.length; i++) formStr += String.fromCharCode(decoded[i]);
        // Only inline Form XObjects that actually carry BT text and do not recursively invoke nested /Do XObjects.
        if (!/\bBT\b/.test(formStr) || /\bDo\b/.test(formStr)) continue;
        totalAdded += formStr.length;
        if (totalAdded > 2 * 1024 * 1024) return null;
        const formRes = context.lookup(xStream.dict.get(PDFName.of('Resources')));
        if (formRes && typeof formRes.get === 'function') {
          for (const sd of SUBDICTS) {
            const srcSub = context.lookup(formRes.get(PDFName.of(sd)));
            if (!srcSub || typeof srcSub.entries !== 'function') continue;
            const dstSub = context.lookup(resources.get(PDFName.of(sd)));
            for (const [k, v] of srcSub.entries()) {
              if (dstSub && typeof dstSub.get === 'function') {
                const existing = dstSub.get(k);
                if (existing && String(existing) !== String(v)) return null; // resource name collision — bail safely
              }
              pendingMerges.push({ sd, k, v });
            }
          }
        }
        let matrixPrefix = '';
        const mat = context.lookup(xStream.dict.get(PDFName.of('Matrix')));
        if (mat && typeof mat.size === 'function' && mat.size() === 6) {
          const nums = [];
          for (let mi = 0; mi < 6; mi++) {
            const mv = context.lookup(mat.get(mi));
            const n = mv && typeof mv.numberValue === 'number' ? mv.numberValue : Number(String(mv));
            if (!Number.isFinite(n)) { nums.length = 0; break; }
            nums.push(n);
          }
          if (nums.length === 6) matrixPrefix = nums.join(' ') + ' cm\n';
        }
        expansions.push({ index: hit.index, length: hit.length, replacement: '\nq\n' + matrixPrefix + formStr + '\nQ\n' });
      }
      if (!expansions.length) return null;
      // Apply resource merges now that all collision checks succeeded.
      for (const { sd, k, v } of pendingMerges) {
        let dstSub = context.lookup(resources.get(PDFName.of(sd)));
        if (!dstSub || typeof dstSub.set !== 'function') {
          dstSub = context.obj({});
          resources.set(PDFName.of(sd), dstSub);
        }
        if (!dstSub.get(k)) dstSub.set(k, v);
      }
      let outStr = '';
      let cursor = 0;
      for (const exp of expansions) {
        outStr += s.slice(cursor, exp.index) + exp.replacement;
        cursor = exp.index + exp.length;
      }
      outStr += s.slice(cursor);
      const outBytes = new Uint8Array(outStr.length);
      for (let i = 0; i < outStr.length; i++) outBytes[i] = outStr.charCodeAt(i) & 0xff;
      return outBytes;
    } catch (_) {
      return null;
    }
  };
  // Every other reader of /Contents takes a direct array or one stream. A reference to an array became a nested array in
  // the fallback wrap, which no viewer reads (pdf.js: "t.getBytes is not a function"), so settle the shape once.
  const _alloInlineContentsArrays = (doc, PDFName) => {
    let n = 0;
    for (const page of doc.getPages()) {
      const raw = page.node.get(PDFName.of('Contents'));
      const val = raw ? doc.context.lookup(raw) : null;
      if (val && val !== raw && typeof val.size === 'function' && typeof val.get === 'function') { page.node.set(PDFName.of('Contents'), val); n++; }
    }
    return n;
  };

  // ── Stage 4 segment text by MARKED-CONTENT PROBE (2026-10-16) ──
  // Each BT…ET text object becomes one tagged block, and its text drives role inference, the
  // block's /ActualText and the Stage 4b match against the HTML. That text used to come from ONE
  // pdf.js item, chosen by index when the counts happened to match or by nearest position in a
  // space that ignored the page's cm transform. So a line with a bold word got /ActualText "The "
  // (a screen reader heard only that), flipped-y pages swapped heading and footer text, and the
  // fragments could not match the HTML, leaving leaves orphaned and the page text read a second
  // time at the end. Measured on real pairs (Spanish letter: 1,175 words read for 543 written).
  // Here a THROWAWAY copy of the document gets every segment wrapped in /AlloSeg <</MCID i>>
  // BDC…EMC and pdf.js itself reports which items it draws inside each one: no coordinate
  // guessing. Returns Map(pageIndex -> per-segment arrays of items in _stage4_extractPdfjsItems
  // shape), or null when the probe cannot run (callers keep the old pairing).
  const _STAGE4_PROBE_TAG = 'AlloSeg';
  const _STAGE4_PROBE_DOC_MS = 60000, _STAGE4_PROBE_PAGE_MS = 30000, _STAGE4_PROBE_MORE_MS = 120000;
  const _stage4_itemShape = (it, styles) => ({
    symbolic: _stage4_isSymbolItem(it, styles),
    str: it.str,
    x: it.transform ? it.transform[4] : 0,
    y: it.transform ? it.transform[5] : 0,
    fontScale: it.transform ? Math.abs(it.transform[0] || it.transform[3] || 12) : 12,
    fontName: it.fontName || '',
    width: it.width || 0,
    height: it.height || 0,
    hasEOL: !!it.hasEOL,
  });
  const _stage4_probeSegmentTexts = async (srcBytes, probeOpts) => {
    const { PDFDocument, PDFName, PDFNumber } = window.PDFLib;
    const probe = await PDFDocument.load(srcBytes, { updateMetadata: false });
    const ctx = probe.context;
    const segCounts = new Map();
    probe.getPages().forEach((pg, pi) => {
      try {
        const info = _stage4_getStreamBytesAndFilter(pg, PDFName, ctx);
        if (!info || !info.bytes.length) return;
        let bytes = info.bytes;
        if (info.filter === 'FlateDecode') bytes = _stage4_inflate(bytes);
        // Same table-cell split as _stage4_tryWrapPage, so both see the same segments.
        if (probeOpts && probeOpts.splitFont) bytes = _stage4_splitTJGaps(bytes, 400);
        const segs = _stage4_parseBTSegments(bytes, { fine: true, splitFont: !!(probeOpts && probeOpts.splitFont) });
        if (!segs.length) return;
        const wraps = segs.map((_, i) => ({ bdc: '/' + _STAGE4_PROBE_TAG + ' <</MCID ' + i + '>> BDC\n', emc: '\nEMC\n' }));
        const out = _stage4_rewriteStream(bytes, segs, wraps);
        pg.node.set(PDFName.of('Contents'), ctx.register(ctx.stream(out, { Length: PDFNumber.of(out.length) })));
        segCounts.set(pi, segs.length);
      } catch (_) { /* this page keeps the old pairing */ }
    });
    if (!segCounts.size) return null;
    const saved = await probe.save({ useObjectStreams: false });
    // (2026-11-06) A page lost here silently got coarse blocks, its leaves stayed unlinked and the tagged PDF was
    // withheld; a rerun gave a good one (fda, childfind5, both page 1, under load). A page normally takes under a
    // second, so one that misses the first wait gets a fresh attempt racing the first, and all such pages share ONE
    // further wait: a slow page gets through, a stuck one costs a bounded time, and the reason reaches the log.
    const _docWork = window.pdfjsLib.getDocument({ data: saved, isEvalSupported: false }).promise;
    const _isTimeout = (e) => /^Timeout after/.test(String(e && e.message));
    const pdfjsProbe = await _withTimeout(_docWork, _STAGE4_PROBE_DOC_MS, 'pdf.js getDocument (segment probe)').catch((e) => {
      if (!_isTimeout(e)) throw e;
      warnLog('[Stage4-Probe] document slow to open, waiting once more');
      return _withTimeout(_docWork, _STAGE4_PROBE_MORE_MS, 'pdf.js getDocument (segment probe, second wait)');
    });
    const result = new Map();
    const readPage = (pi) => pdfjsProbe.getPage(pi + 1).then((pg) => pg.getTextContent({ includeMarkedContent: true }));
    const placeItems = (pi, n, tc) => {
      const styles = tc.styles || {};
      const groups = Array.from({ length: n }, () => []);
      const stack = [];
      let textItems = 0, assigned = 0;
      for (const it of (tc.items || [])) {
        if (it && (it.type === 'beginMarkedContentProps' || it.type === 'beginMarkedContent')) {
          // Only OUR marks count (a tagged source may carry its own MCIDs); a pdf.js build that
          // does not report the tag falls back to any MCID.
          const ours = it.tag === _STAGE4_PROBE_TAG || it.tag == null;
          const m = ours ? /_mc(\d+)$/.exec(String(it.id || '')) : null;
          stack.push(m ? Number(m[1]) : null);
          continue;
        }
        if (it && it.type === 'endMarkedContent') { stack.pop(); continue; }
        if (!it || typeof it.str !== 'string' || !it.str.trim()) continue;
        textItems++;
        let seg = null;
        for (let k = stack.length - 1; k >= 0; k--) if (stack[k] != null) { seg = stack[k]; break; }
        if (seg == null || seg >= n) continue;
        groups[seg].push(_stage4_itemShape(it, styles));
        assigned++;
      }
      // A page whose text the probe could not place keeps the old pairing.
      if (textItems === 0 || assigned > 0) { result.set(pi, groups); return true; }
      return false;
    };
    const lost = (pi, why) => {
      if (_isTimeout({ message: why }) && probeOpts && probeOpts.slowPages) probeOpts.slowPages.push(pi + 1);
      warnLog('[Stage4-Probe] page ' + (pi + 1) + ' keeps coarse blocks: ' + why);
    };
    const late = [];
    try {
      for (const [pi, n] of segCounts) {
        const work = readPage(pi);
        work.catch(() => {}); // it may settle after the wait below has moved on
        let tc = null;
        try { tc = await _withTimeout(work, _STAGE4_PROBE_PAGE_MS, 'text (segment probe) p' + (pi + 1)); }
        catch (e) { late.push({ pi, n, first: _isTimeout(e) ? work : null, why: (e && e.message) || 'unknown' }); continue; }
        try { if (!placeItems(pi, n, tc)) lost(pi, 'no text inside its marks'); } catch (e) { lost(pi, (e && e.message) || 'unknown'); }
      }
      if (late.length) {
        warnLog('[Stage4-Probe] trying again for page(s) ' + late.map((l) => l.pi + 1).join(', ') + ': ' + late[0].why);
        const settled = late.map((l) => {
          const again = readPage(l.pi);
          const either = l.first ? Promise.any([l.first, again]) : again;
          return either.then((tc) => { l.tc = tc; l.ended = true; }, (e) => { l.why = (e && e.errors && e.errors[0] && e.errors[0].message) || (e && e.message) || l.why; l.ended = true; });
        });
        try { await _withTimeout(Promise.all(settled), _STAGE4_PROBE_MORE_MS, 'second wait (segment probe)'); }
        catch (_) { /* whatever has not arrived by now is reported below */ }
        for (const l of late) {
          if (!l.tc) { lost(l.pi, l.ended ? l.why : 'Timeout after ' + (_STAGE4_PROBE_MORE_MS / 1000) + 's (second wait)'); continue; }
          try { if (!placeItems(l.pi, l.n, l.tc)) lost(l.pi, 'no text inside its marks'); } catch (e) { lost(l.pi, (e && e.message) || 'unknown'); }
        }
      }
    } finally { try { pdfjsProbe.destroy(); } catch (_) {} }
    return result.size ? result : null;
  };
  // One block's text from the items pdf.js drew inside its segment, in drawing order. Same-line
  // items join with a space only across a real gap; a new line joins with a space, or drops a
  // word-break hyphen (the Stage 4b _joinFrag rule). Right-to-left lines join right to left.
  const _STAGE4_RTL_CHAR = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u;
  const _stage4_mergeSegmentItems = (group) => {
    const real = (group || []).filter((g) => g && g.str && g.str.trim());
    if (!real.length) return { str: '', x: 0, y: 0, fontScale: 12, fontName: '', width: 0, height: 0, symbolic: false };
    const lines = [];
    for (const g of real) {
      const last = lines[lines.length - 1];
      const h = Math.max(1, 0.5 * Math.min(g.fontScale || 12, (last && last[0].fontScale) || 12));
      if (last && !last[last.length - 1].hasEOL && Math.abs(g.y - last[0].y) < h) last.push(g); else lines.push([g]);
    }
    let text = '';
    for (const line of lines) {
      const rtl = (line.map((g) => g.str).join('').match(new RegExp(_STAGE4_RTL_CHAR.source, 'gu')) || []).length
        > (line.map((g) => g.str).join('').match(/[A-Za-z]/g) || []).length;
      const ordered = rtl ? line.slice().sort((a, b) => b.x - a.x) : line;
      let lineText = '';
      for (let i = 0; i < ordered.length; i++) {
        const b = ordered[i];
        if (i > 0) {
          const a = ordered[i - 1];
          const gap = rtl ? a.x - (b.x + b.width) : b.x - (a.x + a.width);
          if (gap > 0.15 * (b.fontScale || 12) && !/\s$/.test(lineText) && !/^\s/.test(b.str)) lineText += ' ';
        }
        lineText += b.str;
      }
      lineText = lineText.trim();
      if (!text) text = lineText;
      else if (/\p{L}-$/u.test(text)) text = text.slice(0, -1) + lineText;
      else text += ' ' + lineText;
    }
    const first = real.find((g) => !g.symbolic) || real[0];
    const _r = {
      str: text.replace(/\s+/g, ' ').trim(),
      x: first.x, y: first.y,
      fontScale: Math.max.apply(null, real.map((g) => g.fontScale || 0)) || 12,
      fontName: first.fontName, width: first.width, height: first.height,
      symbolic: real.every((g) => g.symbolic),
    };
    return _r;
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
      // (2026-10-27) Running headers and footers sit at the page's top or bottom edge. A page drawn one
      // WORD per text object (msad35 agenda: 656 on page 1) has "of", "and", "to" on every page, and
      // counting them anywhere made those words artifacts, so no agenda item could ever link. Only items
      // in the top/bottom 10% of the page's text extent count; a page without positions keeps the old rule.
      const ys = items.map((it) => (it && Number.isFinite(it.y)) ? it.y : null).filter((v) => v !== null);
      const yMin = ys.length ? Math.min.apply(null, ys) : 0, yMax = ys.length ? Math.max.apply(null, ys) : 0;
      const band = (yMax - yMin) * 0.1;
      const inBand = (it) => !(yMax > yMin) || !(it && Number.isFinite(it.y)) || it.y <= yMin + band || it.y >= yMax - band;
      for (const it of items) {
        if (!inBand(it)) continue;
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

  // Marked-content scan of a decoded content stream (2026-10-18). A tagged SOURCE keeps its own
  // BDC/EMC; its /MCID operands belong to the structure tree we replace, so they collide with ours
  // (veraPDF 7.1-1/7.1-2 x282 on IRS 1040: source "/Artifact <</MCID 2>>" resolved through OUR
  // ParentTree to our MCID-2 element). Returns the byte spans of every "/MCID n" (blanked by the
  // caller with equal-length spaces, so offsets and segment boundaries do not move) and the spans
  // of every /Artifact sequence, whose text must stay artifact.
  const _stage4_scanMarks = (s) => {
    const masked = _stage4_maskStrings(s);
    const re = /\/MCID\s+\d+|\/[^\s\/\[\]<>(){}%]*|<<|>>|[A-Za-z'"][A-Za-z0-9*']*/g;
    const mcidSpans = [], artifactSpans = [], stack = [];
    let dict = 0, tag = null, tagAt = 0, m;
    while ((m = re.exec(masked)) !== null) {
      const t = m[0];
      if (t === '<<') { dict++; continue; }
      if (t === '>>') { dict = Math.max(0, dict - 1); continue; }
      if (/^\/MCID\s/.test(t)) { mcidSpans.push([m.index, m.index + t.length]); continue; }
      if (dict > 0) continue;
      if (t[0] === '/') { if (tag === null) { tag = t; tagAt = m.index; } continue; }
      if (t === 'ID') { const e = /\sEI(?=\s|$)/g; e.lastIndex = m.index + 2; const em = e.exec(masked); re.lastIndex = em ? em.index + 3 : masked.length; }
      else if (t === 'BDC' || t === 'BMC') { const up = stack.length ? stack[stack.length - 1].art : false; stack.push({ start: tag !== null ? tagAt : m.index, art: up || tag === '/Artifact', openEnd: m.index + t.length }); }
      else if (t === 'EMC') { const q = stack.pop(); if (q && q.art && !(stack.length && stack[stack.length - 1].art)) artifactSpans.push([q.start, m.index + 3, q.openEnd]); }
      tag = null;
    }
    return { mcidSpans, artifactSpans };
  };
  // Path objects (and sh) drawn outside any tagged or /Artifact marked content get /Artifact BMC
  // (2026-10-18). Stage 4 marks text and images only, so form rules, boxes and background fills
  // stayed "neither Artifact nor tagged" (veraPDF 7.1-3: all 244 on IRS 1040, inherited from the
  // source). Runs on the rewritten stream, where only OUR BDCs still carry an MCID. Each wrap
  // spans one path object (construction ops through the painting op), so it never crosses q/Q,
  // BT/ET or another marked-content boundary. Form XObjects and inline images are left alone.
  const _STAGE4_PATH_BUILD = { m: 1, l: 1, c: 1, v: 1, y: 1, h: 1, re: 1 };
  const _STAGE4_PATH_PAINT = { S: 1, s: 1, f: 1, F: 1, 'f*': 1, B: 1, 'B*': 1, b: 1, 'b*': 1 };
  // (2026-11-04, budget) opts.regions (_alloVectorCropRegions): a path whose box, in the page's default user space
  // (q/Q/cm tracked), lies inside a vector figure's crop is marked /Figure with MCIDs from opts.startMcid instead of
  // /Artifact; runs of the same region join across colour/width/dash operators only (never q/Q, BT/ET, cm or marked
  // content). opts.out receives { key, mcids } per region that got paths. Without regions: exactly as before.
  const _STAGE4_STATE_OPS = { w: 1, J: 1, j: 1, M: 1, d: 1, ri: 1, i: 1, gs: 1, CS: 1, cs: 1, SC: 1, SCN: 1, sc: 1, scn: 1, G: 1, g: 1, RG: 1, rg: 1, K: 1, k: 1 };
  const _stage4_artifactUnmarkedPaths = (bytes, opts) => {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    const masked = _stage4_maskStrings(s);
    const regions = (opts && Array.isArray(opts.regions)) ? opts.regions : [];
    const re = /\/[^\s\/\[\]<>(){}%]*|<<|>>|\[|\]|[-+]?(?:\d+\.?\d*|\.\d+)|[A-Za-z'"][A-Za-z0-9*']*/g;
    const spans = [], stack = [];
    let dict = 0, tag = null, hasMcid = false, opnd = null, pathAt = null, inBT = false, m;
    let ctm = [1, 0, 0, 1, 0, 0], nums = [], box = null;
    const ctmStack = [];
    const pt = (x, y) => {
      const X = ctm[0] * x + ctm[2] * y + ctm[4], Y = ctm[1] * x + ctm[3] * y + ctm[5];
      if (!box) box = [X, Y, X, Y]; else { box[0] = Math.min(box[0], X); box[1] = Math.min(box[1], Y); box[2] = Math.max(box[2], X); box[3] = Math.max(box[3], Y); }
    };
    const regionOf = (b) => {
      if (!b || !regions.length) return null;
      for (const r of regions) if (b[0] >= r.x0 - r.tol && b[1] >= r.y0 - r.tol && b[2] <= r.x1 + r.tol && b[3] <= r.y1 + r.tol) return r.key;
      return null;
    };
    while ((m = re.exec(masked)) !== null) {
      const t = m[0];
      if (t === '<<') { dict++; if (opnd === null) opnd = m.index; continue; }
      if (t === '>>') { dict = Math.max(0, dict - 1); continue; }
      if (dict > 0) { if (t === '/MCID') hasMcid = true; continue; }
      if (!/^[A-Za-z'"]/.test(t)) {
        if (opnd === null) opnd = m.index;
        if (t[0] === '/' && tag === null) tag = t;
        if (/^[-+.\d]/.test(t)) nums.push(parseFloat(t)); else if (t[0] === '/' || t === '[' || t === ']') nums.push(NaN);
        continue;
      }
      const covered = stack.length ? stack[stack.length - 1] : false;
      const n = nums.slice(-6);
      if (t === 'ID') { const e = /\sEI(?=\s|$)/g; e.lastIndex = m.index + 2; const em = e.exec(masked); re.lastIndex = em ? em.index + 3 : masked.length; }
      else if (t === 'BDC' || t === 'BMC') stack.push(covered || hasMcid || tag === '/Artifact');
      else if (t === 'EMC') stack.pop();
      else if (t === 'BT') inBT = true;
      else if (t === 'ET') inBT = false;
      else if (t === 'q') ctmStack.push(ctm);
      else if (t === 'Q') { if (ctmStack.length) ctm = ctmStack.pop(); }
      else if (t === 'cm') {
        if (nums.length >= 6 && n.every(isFinite)) {
          const [a, b, c, d, e, f] = n, C = ctm;
          ctm = [a * C[0] + b * C[2], a * C[1] + b * C[3], c * C[0] + d * C[2], c * C[1] + d * C[3], e * C[0] + f * C[2] + C[4], e * C[1] + f * C[3] + C[5]];
        } else ctm = [NaN, NaN, NaN, NaN, NaN, NaN];
      }
      else if (_STAGE4_PATH_BUILD[t]) {
        if (pathAt === null) { pathAt = opnd !== null ? opnd : m.index; box = null; }
        const need = t === 're' ? 4 : t === 'c' ? 6 : (t === 'v' || t === 'y') ? 4 : (t === 'h' ? 0 : 2);
        const k = nums.slice(-need);
        if (need && (nums.length < need || !k.every(isFinite))) box = [NaN, NaN, NaN, NaN];
        else if (t === 're') { pt(k[0], k[1]); pt(k[0] + k[2], k[1]); pt(k[0], k[1] + k[3]); pt(k[0] + k[2], k[1] + k[3]); }
        else for (let p = 0; p + 1 < need; p += 2) pt(k[p], k[p + 1]);
      }
      else if (_STAGE4_PATH_PAINT[t] || t === 'n') {
        if (t !== 'n' && pathAt !== null && !covered && !inBT) spans.push([pathAt, m.index + t.length, box && box.every(isFinite) ? regionOf(box) : null]);
        pathAt = null; box = null;
      } else if (t === 'sh') { if (!covered && !inBT && opnd !== null) spans.push([opnd, m.index + 2, null]); }
      tag = null; hasMcid = false; opnd = null; nums = [];
    }
    if (!spans.length) return bytes;
    const stateOnly = (gap) => (_stage4_maskStrings(gap).match(/[A-Za-z'"][A-Za-z0-9*']*/g) || []).every((op) => _STAGE4_STATE_OPS[op]);
    const merged = [];
    for (const sp of spans) {
      const last = merged[merged.length - 1];
      const gap = last ? s.slice(last[1], sp[0]) : '';
      if (last && last[2] === sp[2] && (/^\s*$/.test(gap) || (sp[2] !== null && stateOnly(gap)))) last[1] = sp[1]; else merged.push(sp.slice());
    }
    let out = '', at = 0, mcid = opts && Number.isFinite(opts.startMcid) ? opts.startMcid : 0;
    const byKey = new Map();
    for (const [a, b, key] of merged) {
      if (key === null) { out += s.slice(at, a) + '/Artifact BMC\n' + s.slice(a, b) + '\nEMC\n'; at = b; continue; }
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(mcid);
      out += s.slice(at, a) + '/Figure <</MCID ' + (mcid++) + '>> BDC\n' + s.slice(a, b) + '\nEMC\n'; at = b;
    }
    out += s.slice(at);
    if (opts && Array.isArray(opts.out)) for (const [key, mcids] of byKey) opts.out.push({ key, mcids });
    return Uint8Array.from(out, (c) => c.charCodeAt(0) & 0xff);
  };
  const _stage4_tryWrapPage = async (page, pi, pdfjsDoc, outlineItems, context, libs, structRootRef, artifactHashSet, segmentProbe, s4opts) => {
    const { PDFName, PDFString, PDFNumber } = libs;
    // Unicode-safe text strings (2026-06-11): PDFString.of writes
    // PDFDocEncoding which mangles non-Latin; PDFHexString.fromText writes
    // UTF-16BE — the PDF-native unicode form. Fall back when absent.
    const _uniText = (libs.PDFHexString && libs.PDFHexString.fromText) ? libs.PDFHexString.fromText.bind(libs.PDFHexString) : PDFString.of.bind(PDFString);
    if (!window.pako || typeof window.pako.inflate !== 'function') throw new Error('pako unavailable');
    const streamInfo = _stage4_getStreamBytesAndFilter(page, PDFName, context);
    if (!streamInfo || streamInfo.bytes.length === 0) throw new Error('no content stream');
    let bytes = streamInfo.bytes;
    if (streamInfo.filter === 'FlateDecode') {
      bytes = _stage4_inflate(bytes);
    }
    // Table rows drawn as one TJ get one TJ per cell (identical drawing; see _stage4_splitTJGaps). Only where
    // fine segments are used (the probe ran) and for left-to-right documents, like the font split.
    if (s4opts && s4opts.splitFont && segmentProbe instanceof Map && segmentProbe.get(pi)) bytes = _stage4_splitTJGaps(bytes, 400);
    // A tagged source's own MCIDs collide with ours: blank them (equal length, offsets unchanged),
    // and keep text inside the source's /Artifact sequences artifact (2026-10-18).
    let _srcMarks = null;
    try {
      let _s = '';
      for (let k = 0; k < bytes.length; k++) _s += String.fromCharCode(bytes[k]);
      _srcMarks = _stage4_scanMarks(_s);
      if (_srcMarks.mcidSpans.length) { bytes = bytes.slice(); for (const [a, b] of _srcMarks.mcidSpans) bytes.fill(0x20, a, b); }
    } catch (_) { _srcMarks = null; }
    const _inSrcArtifact = (seg) => !!(_srcMarks && seg && _srcMarks.artifactSpans.some(([a, b]) => seg.btStart >= a && seg.etEnd <= b));
    const probeGroups = segmentProbe instanceof Map ? segmentProbe.get(pi) : null;
    // Fine (per show-operator) segments where the probe measured this page; BT objects otherwise.
    let segments = _stage4_parseBTSegments(bytes, { fine: !!probeGroups, splitFont: !!(s4opts && s4opts.splitFont) });
    const useProbe = !!(probeGroups && probeGroups.length === segments.length);
    if (probeGroups && !useProbe) segments = _stage4_parseBTSegments(bytes); // counts disagree: old behaviour, whole BT objects
    if (segments.length === 0) {
      const expanded = _stage4_tryInlineFormXObjects(page, bytes, PDFName, context);
      if (expanded) {
        bytes = expanded;
        segments = _stage4_parseBTSegments(bytes);
      }
    }
    if (segments.length === 0) throw new Error('no BT segments');
    const items = await _stage4_extractPdfjsItems(pdfjsDoc, pi);
    if (items.length === 0) throw new Error('no pdf.js items');
    // Exact per-segment text from the marked-content probe when it saw this page with the same
    // segment count; the old index/nearest pairing otherwise (2026-10-16).
    const matched = useProbe
      ? probeGroups.map(_stage4_mergeSegmentItems)
      : _stage4_matchSegmentsToItems(segments, items);
    // (2026-11-05, 4-H activity) The source marks its non-discrimination notice /Artifact on both pages, and the HTML keeps
    // it as a paragraph, so the PDF never said it. A run of source-artifact text holding a whole 12+ word prose leaf is released
    // (marks blanked, offsets kept) on the one page chosen for that leaf; other copies stay artifact.
    try {
      const _rel = s4opts && s4opts.releaseArtifactProse;
      if (_srcMarks && _rel && _rel.size && _srcMarks.artifactSpans.length) {
        const _k = (t) => String(t || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        for (let i = 0; i < segments.length; i++) {
          if (!_inSrcArtifact(segments[i])) continue;
          let j = i, run = ''; const spans = new Set();
          for (; j < segments.length && _inSrcArtifact(segments[j]); j++) {
            run += _k(matched[j] && matched[j].str);
            const sp = _srcMarks.artifactSpans.find(([a, b]) => segments[j].btStart >= a && segments[j].etEnd <= b);
            if (sp) spans.add(sp);
          }
          let hit = false;
          for (const [key, page] of _rel) if (page === pi && run.includes(key)) { hit = true; _rel.delete(key); break; }
          if (hit) {
            bytes = bytes.slice();
            for (const sp of spans) { bytes.fill(0x20, sp[0], sp[2]); bytes.fill(0x20, sp[1] - 3, sp[1]); }
            _srcMarks.artifactSpans = _srcMarks.artifactSpans.filter((sp) => !spans.has(sp));
            try { warnLog('[Stage4-ReleaseProse] page ' + (pi + 1) + ': text the source marks as decoration that the document keeps as prose is tagged here'); } catch (_) {}
          }
          i = j - 1;
        }
      }
    } catch (relErr) { try { warnLog('[Stage4-ReleaseProse] non-fatal: ' + (relErr && relErr.message)); } catch (_) {} }
    const scales = items.map(it => it.fontScale).filter(n => n > 0).sort((a, b) => a - b);
    const fontScaleMedian = scales.length > 0 ? scales[Math.floor(scales.length / 2)] : 12;
    // Stage 6b: build wraps with two categories — artifacts get /Artifact BMC
    // (no MCID, no StructElem), content gets /<role> <</MCID n>> BDC. Content
    // MCIDs are assigned from an independent counter so we don't gap the
    // sequence when artifacts are interspersed. Only content segments
    // produce StructElems / ParentTree entries.
    const wraps = [];
    const blockInfo = [];
    const _blockPos = new Map(); // MCID -> the block's centre in default user space (Stage 4b: chart labels)
    let contentMcid = 0;
    const hasArtifacts = artifactHashSet instanceof Set && artifactHashSet.size > 0;
    for (let i = 0; i < segments.length; i++) {
      const item = matched[i] || { str: '', fontScale: fontScaleMedian, fontName: '' };
      const norm = hasArtifacts ? _stage6b_normalizeArtifactText(item.str) : '';
      // Symbolic runs (Wingdings bullets etc.) are decorative marks — wrap
      // as /Artifact: correct PDF semantics, and they leave leaf matching
      // by construction (artifact blocks carry no MCID/ActualText).
      const _keptHere = !!(s4opts && s4opts.keepFirstArtifacts && norm && s4opts.keepFirstArtifacts.get(norm) === pi); // a repeated table header on its first page
      // (2026-10-27, osep3: 740 of 839 P elements held only a space) A probed segment that draws nothing but
      // whitespace carries no text for assistive technology: artifact, not an empty P in the reading order.
      const _blankSeg = useProbe && !String((item && item.str) || '').trim();
      const isArtifact = (item && item.symbolic) || _blankSeg || (hasArtifacts && norm && artifactHashSet.has(norm) && !_keptHere) || _inSrcArtifact(segments[i]);
      if (isArtifact) {
        wraps.push({ bdc: '/Artifact BMC\n', emc: '\nEMC\n' });
        blockInfo.push({ isArtifact: true });
      } else {
        // A flat block sits directly in the page /Sect, where a table cell or list part is invalid
        // (veraPDF 7.2-9: TD not in TR). Stage 4b re-points matched blocks onto the real cells.
        const _role0 = _stage4_inferRole(item, fontScaleMedian, outlineItems);
        const role = /^(TR|TH|TD|LI|Lbl|LBody)$/.test(_role0) ? 'P' : _role0;
        wraps.push({ bdc: '/' + role + ' <</MCID ' + contentMcid + '>> BDC\n', emc: '\nEMC\n' });
        // 2026-06-07: removed substring(0, 400) cap. PDF spec §14.9.4 has no length
        // limit on /ActualText. Long paragraphs / TDs / captions previously had their
        // tail silently dropped from the semantic tree (visible to pdf.js extractors
        // but truncated in the tag tree that SR walkers prefer).
        blockInfo.push({ isArtifact: false, role, text: (item.str || ''), mcid: contentMcid });
        if (Number.isFinite(item.x) && Number.isFinite(item.y)) _blockPos.set(contentMcid, { x: item.x + (Number(item.width) || 0) / 2, y: item.y + (Number(item.height) || 0) / 2 });
        contentMcid++;
      }
    }
    let newBytes = _stage4_rewriteStream(bytes, segments, wraps);
    // ── Stage 4c: image marking (2026-06-10) ──
    // Stage 4 wraps only TEXT, so figures had no marked content at all —
    // every Figure leaf was a permanent orphan and any document containing
    // an image could never earn the PDF/UA declaration. Wrap each image-
    // XObject draw (`/ImN Do`) in /Figure BDC/EMC with an MCID continuing
    // the page's sequence. This is a SECOND rewrite pass after the text
    // splice (image draws live outside BT/ET, so segment offsets are
    // untouched). Inline images (BI..EI) and images inside Form XObjects
    // are out of v1 scope — they simply stay unmarked (same as before).
    const imageBlockInfo = [];
    try {
      let resDict = page.node.get(PDFName.of('Resources'));
      try { resDict = context.lookup(resDict) || resDict; } catch (_) {}
      let xo = (resDict && typeof resDict.get === 'function') ? resDict.get(PDFName.of('XObject')) : null;
      try { xo = context.lookup(xo) || xo; } catch (_) {}
      const imgNames = [];
      // (2026-10-27) A VECTOR drawing is a Form XObject (osep: the Department seal, 222 KB of paths), not an
      // /Image, so its Figure leaf stayed orphaned and the PDF was withheld. A form with no text and no
      // nested form is marked like an image, flagged `form`; Stage 4b pairs it only when the image-only
      // count does not match, never a form drawn on 2+ pages, and an unpaired one becomes NonStruct
      // (decoration), never a placeholder "image". A draw inside the source's /Artifact stays artifact.
      const formRefs = new Map(), imgRefs = new Map(), furnitureForms = new Set(), _maskedImgs = new Set(), _otherForms = new Map(), _pictureForms = new Map(), _proseFormText = new Map();
      const _figureLikeForm = (xobj) => {
        const fdict = xobj && xobj.dict;
        if (!fdict || typeof fdict.get !== 'function' || !xobj.contents) return false;
        const filt = String(fdict.get(PDFName.of('Filter')) || '');
        if (filt && filt !== '/FlateDecode') return false;
        let fres = fdict.get(PDFName.of('Resources'));
        try { fres = context.lookup(fres) || fres; } catch (_) {}
        let fxo = (fres && typeof fres.get === 'function') ? fres.get(PDFName.of('XObject')) : null;
        try { fxo = context.lookup(fxo) || fxo; } catch (_) {}
        if (fxo && typeof fxo.entries === 'function') {
          for (const [, r] of fxo.entries()) { const o = context.lookup(r); if (o && o.dict && String(o.dict.get(PDFName.of('Subtype'))) === '/Form') return false; }
        }
        const fb = filt ? _stage4_inflate(xobj.contents) : xobj.contents;
        return _alloFormLooksLikeFigure(new TextDecoder('latin1').decode(fb), false);
      };
      if (xo && typeof xo.entries === 'function') {
        for (const [xn, xref] of xo.entries()) {
          try {
            const xobj = context.lookup(xref);
            const sub = xobj && (xobj.dict && typeof xobj.dict.get === 'function' ? xobj.dict.get(PDFName.of('Subtype')) : (typeof xobj.get === 'function' ? xobj.get(PDFName.of('Subtype')) : null));
            if (String(sub) === '/Image') {
              const inm = String(xn).replace(/^\//, ''); imgNames.push(inm); imgRefs.set(inm, String(xref));
              // (2026-11-03) An image 1-2 px thin and 8+ px long is a ruled line, not a picture (notifications: 18 lines of
              // Nx1 beside the signature, so no count matched and the signature figure orphaned): page furniture, like a
              // repeated form. A 1x1 image is not a line (a stand-in picture in the goldens).
              const _wh = ['Width', 'Height'].map((k) => Number(String(xobj.dict.get(PDFName.of(k)))));
              if (_wh.every((n) => n > 0) && Math.min(_wh[0], _wh[1]) <= 2 && Math.max(_wh[0], _wh[1]) >= 8) furnitureForms.add(inm);
              // drawn twice by the crop split below, a masked image would darken where its copies overlap
              if (['SMask', 'Mask', 'ImageMask'].some((k) => xobj.dict.get(PDFName.of(k)))) _maskedImgs.add(inm);
            }
            else if (String(sub) === '/Form' && s4opts && s4opts.repeatedTextForms && s4opts.repeatedTextForms.has(String(xref))) {
              const fn = String(xn).replace(/^\//, ''); imgNames.push(fn);
              // its first page draws it as a paragraph when it prints prose the HTML keeps (proseFormFirst)
              const _pfF = s4opts.proseFormFirst ? s4opts.proseFormFirst.get(String(xref)) : null;
                if (_pfF && _pfF.page === pi) { _otherForms.set(fn, true); if (_pfF.text) _proseFormText.set(fn, _pfF.text); } else furnitureForms.add(fn);
            }
            else if (String(sub) === '/Form' && _figureLikeForm(xobj)) { const fn = String(xn).replace(/^\//, ''); imgNames.push(fn); formRefs.set(fn, String(xref)); }
            // (2026-11-03) Any other form drawn here was left untagged (fda: a redaction box drawing "(b) (4)" in a
            // form, veraPDF 7.1-3 x3). One that draws text is a paragraph of its own; one that does not, decoration.
            else if (String(sub) === '/Form') {
              // (a form holding a picture or another form stays as it was: it may be a real picture)
              const fn = String(xn).replace(/^\//, ''); let txt = null;
              try {
                const _lu = (o) => { try { return context.lookup(o) || o; } catch (_) { return o; } };
                const fres = _lu(xobj.dict.get(PDFName.of('Resources'))), fxo = fres && fres.get ? _lu(fres.get(PDFName.of('XObject'))) : null;
                const holds = fxo && typeof fxo.entries === 'function' && Array.from(fxo.entries()).length > 0;
                const f = String(xobj.dict.get(PDFName.of('Filter')) || '');
                if (!holds && (!f || f === '/FlateDecode')) txt = /(?:^|[^\/\w])BT(?!\w)/.test(_csLatin1(f ? _stage4_inflate(xobj.contents) : xobj.contents));
                // a form whose whole drawing is ONE image (Word wraps pictures so) is that picture
                const kids = holds ? Array.from(fxo.entries()) : [];
                if (kids.length === 1 && (!f || f === '/FlateDecode')) {
                  const kid = _lu(kids[0][1]);
                  const ops = _csLatin1(f ? _stage4_inflate(xobj.contents) : xobj.contents).replace(/\/[^\s\/\[\]()<>{}%]+/g, ' ').replace(/[-+]?\d*\.?\d+/g, ' ').trim().split(/\s+/).filter(Boolean);
                  if (kid && kid.dict && String(kid.dict.get(PDFName.of('Subtype'))) === '/Image' && ops.filter((o) => o === 'Do').length === 1 && ops.every((o) => /^(q|Q|cm|Do|gs)$/.test(o))) {
                    imgNames.push(fn); _pictureForms.set(fn, String(kids[0][1]));
                  }
                }
              } catch (_) { txt = null; }
              if (txt !== null) { imgNames.push(fn); _otherForms.set(fn, txt); }
            }
          } catch (_) {}
        }
      }
      // The source's own vector figures (_alloSourceVectorFigures) join the draws, as vector Form drawings do.
      // Byte-true decode (2026-11-03): TextDecoder('latin1') is windows-1252, so byte 0x92 came back U+2019 and the
      // "& 0xff" below wrote 0x19 (notifications: every curly quote became a control code drawing .notdef).
      let _s0 = _csLatin1(newBytes), _srcFigs = [];
      try { _srcFigs = _alloSourceVectorFigures(_stage4_maskStrings(_s0)); } catch (_) { _srcFigs = []; }
      for (let k = _srcFigs.length - 1; k >= 0; k--) _s0 = _s0.slice(0, _srcFigs[k].start) + '/Figure <</AlloSrcFigure ' + k + '>> BDC' + _s0.slice(_srcFigs[k].headEnd);
      if (imgNames.length > 0 || _srcFigs.length > 0) {
        const s0 = _s0;
        // (2026-10-27) Images too: a picture the SOURCE marks as page decoration (complaint form: the letterhead
        // logo inside /Artifact /Pagination) wrapped as tagged /Figure was "tagged content inside an artifact"
        // (veraPDF 7.1-2). It stays the source's artifact; its place in draw order is kept for figure pairing.
        const _artSpans = _stage4_scanMarks(s0).artifactSpans;
        const escaped = imgNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const re = new RegExp('/(' + (escaped.length ? escaped.join('|') : '(?!)') + ')\\s+Do(?![0-9A-Za-z])|/Figure <</AlloSrcFigure (\\d+)>> BDC', 'g');
        // (2026-11-03) The HTML's crops of one picture (s4opts.crops, _alloCropDrawPlan): that picture is drawn
        // whole as an artifact, then once per crop clipped to the crop, each its own /Figure, so every cropped
        // figure links to its own part. Only when pdf.js's top-level image paints line up with this page's image Do
        // operators one to one; else nothing changes.
        let _cropPaints = null, _bmpIdx = 0;
        if (s4opts && s4opts.crops && s4opts.crops.length && pdfjsDoc && window.pdfjsLib) {
          try {
            const _pg = await pdfjsDoc.getPage(pi + 1);
            const _ol = await _pg.getOperatorList({ annotationMode: window.pdfjsLib.AnnotationMode ? window.pdfjsLib.AnnotationMode.DISABLE : 0 });
            const _plan = _alloCropDrawPlan(_ol.fnArray, _ol.argsArray, window.pdfjsLib.OPS, _pg.getViewport({ scale: 1 }), s4opts.crops);
            let _bmpDo = 0;
            s0.replace(re, (m, name) => { if (name && imgRefs.has(name)) _bmpDo++; return m; });
            if (_plan && _plan.paints.length === _bmpDo) _cropPaints = _plan.paints;
          } catch (_) { _cropPaints = null; }
        }
        let imgMcid = contentMcid, furnitureWrapped = 0;
        const s1 = s0.replace(re, (m, name, srcK, at) => {
          if (srcK !== undefined) {
            imageBlockInfo.push({ mcid: imgMcid, form: true, xref: 'source-figure:' + pi + ':' + srcK });
            return '/Figure <</MCID ' + (imgMcid++) + '>> BDC';
          }
          const _cp = imgRefs.has(name) && _cropPaints ? _cropPaints[_bmpIdx++] : null;
          const inArtifact = _artSpans.some(([a, b]) => at >= a && at < b);
          if (furnitureForms.has(name)) { if (inArtifact) return m; furnitureWrapped++; return '/Artifact BMC\n' + m + '\nEMC'; }
          if (_pictureForms.has(name)) {
            if (inArtifact) { imageBlockInfo.push({ artifact: true, xref: _pictureForms.get(name) }); return m; }
            imageBlockInfo.push({ mcid: imgMcid, xref: _pictureForms.get(name) });
            return '/Figure <</MCID ' + (imgMcid++) + '>> BDC\n' + m + '\nEMC';
          }
          if (_otherForms.has(name)) {
            if (inArtifact) return m;
            if (!_otherForms.get(name)) { furnitureWrapped++; return '/Artifact BMC\n' + m + '\nEMC'; }
            imageBlockInfo.push({ mcid: imgMcid, textForm: true, text: _proseFormText.get(name) || null });
            return '/P <</MCID ' + (imgMcid++) + '>> BDC\n' + m + '\nEMC';
          }
          const isForm = formRefs.has(name);
          if (isForm && inArtifact) return m;
          if (inArtifact) { imageBlockInfo.push({ artifact: true, xref: imgRefs.get(name) || '' }); return m; }
          if (!isForm && _cp && _cp.crops.length === 1 && _cp.crops[0].whole) {
            imageBlockInfo.push({ mcid: imgMcid, xref: imgRefs.get(name) || '', cropKey: _cp.crops[0].key });
            return '/Figure <</MCID ' + (imgMcid++) + '>> BDC\n' + m + '\nEMC';
          }
          if (!isForm && _cp && _cp.crops.length >= 1 && !_maskedImgs.has(name)) {
            // One crop of part of a picture: the rest may hold content (budget p19: a table picture with the DOE logo in
            // a corner), so the whole stays a Figure that only a picture table may claim (cropWhole); else decoration.
            let out = '/Artifact BMC\n' + m + '\nEMC';
            if (_cp.crops.length === 1) {
              imageBlockInfo.push({ mcid: imgMcid, xref: imgRefs.get(name) || '', cropWhole: true });
              out = '/Figure <</MCID ' + (imgMcid++) + '>> BDC\n' + m + '\nEMC';
            }
            for (const c of _cp.crops) {
              imageBlockInfo.push({ mcid: imgMcid, xref: imgRefs.get(name) || '', cropKey: c.key });
              out += '\n/Figure <</MCID ' + (imgMcid++) + '>> BDC\nq ' + c.clip.map((v) => v.toFixed(5)).join(' ') + ' re W n\n' + m + '\nQ\nEMC';
            }
            return out;
          }
          imageBlockInfo.push(isForm ? { mcid: imgMcid, form: true, xref: formRefs.get(name) } : { mcid: imgMcid, xref: imgRefs.get(name) || '' });
          return '/Figure <</MCID ' + (imgMcid++) + '>> BDC\n' + m + '\nEMC';
        });
        if (imageBlockInfo.length > 0 || furnitureWrapped > 0) newBytes = Uint8Array.from(s1, (c) => c.charCodeAt(0) & 0xff);
      }
    } catch (imgErr) { imageBlockInfo.length = 0; /* image marking is additive — never fail the page over it */ }
    let _vecRegions = null, _cropRects = [];
    if (s4opts && s4opts.crops && s4opts.crops.length && pdfjsDoc && window.pdfjsLib) {
      try {
        const _pg = await pdfjsDoc.getPage(pi + 1);
        const _vp = _pg.getViewport({ scale: 1 });
        _cropRects = s4opts.crops.map((c) => {
          const a = _vp.convertToPdfPoint(c.x0 * _vp.width, c.y0 * _vp.height), b = _vp.convertToPdfPoint(c.x1 * _vp.width, c.y1 * _vp.height);
          return { key: c.key, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]), tol: 0.03 * Math.max(_vp.width, _vp.height) };
        });
        const _ol = await _pg.getOperatorList({ annotationMode: window.pdfjsLib.AnnotationMode ? window.pdfjsLib.AnnotationMode.DISABLE : 0 });
        const _plan = _alloCropDrawPlan(_ol.fnArray, _ol.argsArray, window.pdfjsLib.OPS, _vp, []);
        if (_plan) _vecRegions = _alloVectorCropRegions(s4opts.crops, _plan.paints, _vp);
      } catch (_) { _vecRegions = null; }
    }
    const _vecOut = [];
    try {
      const _nextMcid = contentMcid + imageBlockInfo.filter((x) => !x.artifact).length;
      const _pb = _stage4_artifactUnmarkedPaths(newBytes, _vecRegions && _vecRegions.length ? { regions: _vecRegions, startMcid: _nextMcid, out: _vecOut } : undefined);
      newBytes = _pb;
      for (const v of _vecOut) imageBlockInfo.push({ mcid: v.mcids[0], mcids: v.mcids, vector: true, xref: 'vector-crop:' + v.key, cropKey: v.key });
    } catch (_) { /* additive: never fail the page */ }
    const _reflate = streamInfo.filter === 'FlateDecode' || streamInfo.recompress === true;
    if (_reflate) {
      newBytes = window.pako.deflate(newBytes);
    }
    const streamDict = _reflate
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
      if (info.text) d.ActualText = _uniText(info.text);
      blockElemRefs.push(context.register(context.obj(d)));
    }
    // Stage 4c flat Figure elems — appended AFTER the text elems so the
    // ParentTree array index keeps equaling the MCID (text 0..n-1, images
    // n..). Placeholder Alt satisfies PDF/UA 7.3 if a figure stays
    // unmatched; matched ones are dropped from the Sect when Stage 4b
    // re-points their MCID onto the semantic Figure leaf (which carries
    // the real alt text).
    const imageBlocks = [];
    // ParentTree array index = MCID: a vector-crop figure owns several MCIDs, so its element sits at each of them.
    const _parentByMcid = blockElemRefs.slice();
    for (const info of imageBlockInfo) {
      if (info.artifact) { imageBlocks.push({ artifact: true, xref: info.xref }); continue; } // the source's own artifact: no element
      if (info.vector) {
        const vref = context.register(context.obj({ Type: PDFName.of('StructElem'), S: PDFName.of('Figure'), P: pageSectRef, Pg: page.ref,
          Alt: PDFString.of('Image (description unavailable)'),
          K: context.obj(info.mcids.map((n) => context.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(n) }))) }));
        blockElemRefs.push(vref);
        for (const n of info.mcids) _parentByMcid[n] = vref;
        imageBlocks.push({ ref: vref, mcid: info.mcids[0], mcids: info.mcids.slice(), xref: info.xref, cropKey: info.cropKey, vector: true });
        continue;
      }
      const mcr = context.obj({ Type: PDFName.of('MCR'), Pg: page.ref, MCID: PDFNumber.of(info.mcid) });
      const ref = context.register(context.obj(info.textForm
        ? Object.assign({ Type: PDFName.of('StructElem'), S: PDFName.of('P'), P: pageSectRef, Pg: page.ref, K: context.obj([mcr]) }, info.text ? { ActualText: _uniText(info.text) } : {}) // a text form: real content, read from its own text
        : {
          Type: PDFName.of('StructElem'),
          S: PDFName.of('Figure'),
          P: pageSectRef,
          Pg: page.ref,
          Alt: PDFString.of('Image (description unavailable)'),
          K: context.obj([mcr]),
        }));
      blockElemRefs.push(ref);
      _parentByMcid[info.mcid] = ref;
      if (info.textForm) { imageBlocks.push({ ref, mcid: info.mcid, textForm: true }); continue; }
      imageBlocks.push(info.form ? { ref, mcid: info.mcid, form: true, xref: info.xref } : { ref, mcid: info.mcid, xref: info.xref || '', cropKey: info.cropKey || null, cropWhole: !!info.cropWhole });
    }
    context.assign(pageSectRef, context.obj({
      Type: PDFName.of('StructElem'),
      S: PDFName.of('Sect'),
      P: structRootRef,
      Pg: page.ref,
      K: context.obj(blockElemRefs),
    }));
    const parentArrayRef = context.register(context.obj(_parentByMcid));
    return { pageSectRef, blockElemRefs, parentArrayRef, mcidCount: _parentByMcid.length, imageBlocks, blockPos: _blockPos, cropRects: _cropRects };
  };

  // Lazy-load Tesseract.js from CDN. Zero cost until first call (scanned-PDF path only).
  // Tesseract gives deterministic client-side OCR — no hallucination, no server roundtrip —
  // which pairs with Vision OCR for a reconciled "both" pass on scanned PDFs.
  const ensureTesseractLoaded = async () => {
    const ok = await _loadCdnScript('tesseract', [
      'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js',
    ], () => !!window.Tesseract, { timeout: 20000 });
    if (!ok) throw new Error('Tesseract.js unavailable (all CDN sources failed)');
    return window.Tesseract;
  };

  // Flatten Tesseract.js word boxes into [{t,x0,y0,x1,y1,c}] in PDF points (origin
  // top-left), dividing out the OCR render scale. Tesseract.js v5 returns the
  // block→paragraph→line→word hierarchy under data.blocks when {blocks:true} is
  // requested; older shapes expose a flat data.words. Handles both; returns null on
  // anything unusable so the caller falls back to the block layer.
  const _collectOcrWords = (data, scale) => {
    if (!data) return null;
    const s = scale || 1;
    const out = [];
    const pushWord = (w) => {
      if (!w || typeof w.text !== 'string') return;
      const t = w.text.trim(); if (!t) return;
      const b = w.bbox;
      if (!b || typeof b.x0 !== 'number' || typeof b.y0 !== 'number' || typeof b.x1 !== 'number' || typeof b.y1 !== 'number') return;
      out.push({ t: t, x0: b.x0 / s, y0: b.y0 / s, x1: b.x1 / s, y1: b.y1 / s, c: (typeof w.confidence === 'number' ? w.confidence : null) });
    };
    try {
      if (Array.isArray(data.words) && data.words.length) {
        for (let i = 0; i < data.words.length; i++) pushWord(data.words[i]);
      } else if (Array.isArray(data.blocks)) {
        for (const bl of data.blocks) {
          if (!bl) continue;
          const paras = Array.isArray(bl.paragraphs) ? bl.paragraphs : [];
          for (const pa of paras) {
            const lines = pa && Array.isArray(pa.lines) ? pa.lines : [];
            for (const ln of lines) {
              const ws = ln && Array.isArray(ln.words) ? ln.words : [];
              for (const w of ws) pushWord(w);
            }
          }
        }
      }
    } catch (_) { return null; }
    return out;
  };

  // Map OCR word boxes (PDF points, origin top-left) to invisible-text draw calls in
  // PDF user space (origin bottom-left). Pure + deterministic so it can be unit-tested
  // without pdf-lib. Each call: { text, x, y, size } — font size from box height, text
  // baseline placed at the box bottom. This is what makes Ctrl+F highlight and drag-
  // select align with the scanned image (vs the old single top-left block).
  const _ocrWordsToDrawCalls = (words, pageH, opts) => {
    const o = opts || {};
    const sizeFactor = typeof o.sizeFactor === 'number' ? o.sizeFactor : 0.92;
    const minSize = o.minSize || 4, maxSize = o.maxSize || 300;
    const out = [];
    if (!Array.isArray(words) || typeof pageH !== 'number') return out;
    const _num = (v) => (typeof v === 'number' && isFinite(v));
    const targetH = _num(o.targetH) && o.targetH > 0 ? o.targetH : pageH;
    const scaleX = _num(o.scaleX) && o.scaleX > 0 ? o.scaleX : 1;
    const scaleY = _num(o.scaleY) && o.scaleY > 0 ? o.scaleY : 1;
    const offsetX = _num(o.offsetX) ? o.offsetX : 0;
    const offsetY = _num(o.offsetY) ? o.offsetY : 0;
    const vt = Array.isArray(o.viewportTransform) && o.viewportTransform.length === 6
      && o.viewportTransform.every(_num) ? o.viewportTransform : null;
    let inv = null;
    if (vt) {
      const det = vt[0] * vt[3] - vt[1] * vt[2];
      if (isFinite(det) && Math.abs(det) > 1e-8) {
        inv = (x, y) => ({
          x: (vt[3] * (x - vt[4]) - vt[2] * (y - vt[5])) / det,
          y: (-vt[1] * (x - vt[4]) + vt[0] * (y - vt[5])) / det,
        });
      }
    }
    const _dist = (a, b) => Math.sqrt(Math.pow((a.x || 0) - (b.x || 0), 2) + Math.pow((a.y || 0) - (b.y || 0), 2));
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (!w || typeof w.t !== 'string') continue;
      const text = w.t.trim(); if (!text) continue;
      const rawH = (typeof w.y1 === 'number' && typeof w.y0 === 'number') ? (w.y1 - w.y0) : 0;
      let x, y, boxW = 0, angle = 0, h = rawH * scaleY;
      if (inv && _num(w.x0) && _num(w.x1) && _num(w.y0) && _num(w.y1)) {
        const p0 = inv(w.x0, w.y1);      // left baseline in PDF user space
        const p1 = inv(w.x1, w.y1);      // right baseline in PDF user space
        const pt = inv(w.x0, w.y0);      // top-left, for box height
        x = p0.x; y = p0.y;
        boxW = _dist(p0, p1);
        h = _dist(pt, p0);
        angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
      } else {
        x = offsetX + (w.x0 * scaleX);
        y = offsetY + targetH - (w.y1 * scaleY); // baseline ~= box bottom in PDF (bottom-left origin) space
        // Carry the OCR box WIDTH so the consumer can horizontally scale the glyphs (text-matrix
        // a-component) to span the box — size alone (from height) leaves the invisible run too
        // narrow/wide vs the scanned word, so Ctrl+F highlight / drag-select drifts intra-word.
        boxW = (typeof w.x1 === 'number' && typeof w.x0 === 'number') ? Math.max(0, (w.x1 - w.x0) * scaleX) : 0;
      }
      let size = h > 0 ? h * sizeFactor : 8;
      if (size < minSize) size = minSize; else if (size > maxSize) size = maxSize;
      if (!isFinite(x) || !isFinite(y) || !isFinite(size)) continue;
      out.push({ text: text, x: x, y: y, size: size, w: boxW, angle: (isFinite(angle) ? angle : 0) });
    }
    return out;
  };

  // #H (2026-07-07): distribute a page's POSITIONED word draw calls across the per-leaf MCID runs, in
  // reading order. The per-leaf scanned-tagging path (default since 2026-07-01, @f0615fa8) drew every
  // word top-down at a fixed x via _alloOcrBlockLayout, so the searchable layer stopped aligning with the
  // scanned image (Ctrl+F highlight / drag-select drifted) — a regression vs the per-word positioned layer
  // that shipped 2026-06-07. This maps the RAW OCR boxes (what the scan shows, in reading order) onto the
  // runs by consuming each run's word count; the LAST run soaks up any remainder so NO positioned word is
  // ever dropped. Exact box↔leaf correspondence is secondary — positions align with the image (search
  // works) and every box stays under a reachable MCID (the validated per-leaf tag structure is unchanged;
  // only the glyph x/y differ, which PAC/veraPDF do not check). Every run gets an entry (possibly empty)
  // so its BDC/EMC is still emitted and its MCR stays backed. Pure + deterministic → unit-testable.
  const _distributeCallsToRuns = (runs, calls) => {
    const _runs = Array.isArray(runs) ? runs : [];
    const _calls = Array.isArray(calls) ? calls : [];
    const out = _runs.map((r) => ({ run: r, calls: [] }));
    if (!out.length) return out;
    // M15 (deep dive 2026-07-09): the count-correspondence ASSUMPTION is now guarded instead of
    // assumed. (a) When Vision leaf words and Tesseract boxes diverge by >20%, count-mapping would
    // attribute words to the wrong leaves WHOLESALE (a TH or H1 "reading" a paragraph) — signal
    // `mismatch` so the caller falls back to the semantic block layout (pixel alignment lost on
    // that page, reading order kept: the right trade for an accessibility artifact). (b) The last
    // run no longer soaks the remainder — surplus boxes beyond every leaf's own count land in
    // `overflow`, which the caller draws inside /Artifact marked content: still searchable and
    // selectable on the page, but excluded from the logical structure AT reads (surplus is
    // tokenization dust — split-word halves counted once in the leaf text — not attributable leaf
    // content; before this, it was announced as part of the LAST leaf, worst case a table header).
    const totalWc = _runs.reduce((s, r) => s + ((String(r && r.text || '').trim().match(/\S+/g) || []).length), 0);
    if (Math.abs(totalWc - _calls.length) / Math.max(totalWc, _calls.length, 1) > 0.2) {
      out.mismatch = { leafWords: totalWc, boxes: _calls.length };
      return out;
    }
    // (2026-11-09) Under 20% the counts may still differ, and then every word after the first gap shifts onto the
    // wrong leaf (the garden scan's bullets and missing table put "Questions? Contact..." under the table cells). The
    // caller matches by words instead (_alignCallsToRuns) whenever this is set.
    if (totalWc !== _calls.length) out.countsDiffer = true;
    let ci = 0;
    for (let ri = 0; ri < out.length; ri++) {
      const wc = (String(out[ri].run && out[ri].run.text || '').trim().match(/\S+/g) || []).length;
      const take = Math.min(wc, _calls.length - ci);
      for (let k = 0; k < take && ci < _calls.length; k++, ci++) out[ri].calls.push(_calls[ci]);
    }
    if (ci < _calls.length) out.overflow = _calls.slice(ci);
    return out;
  };

  // (2026-11-09) When word COUNTS diverge (the M15 mismatch above), match the boxes to the runs by their WORDS instead, so
  // a page whose OCR engine missed part of it keeps the rest of its search layer on the printed words. The garden
  // newsletter scan's Tesseract boxes lacked its whole table (118 leaf words, 88 boxes) and the entire page fell to the
  // block layout. LCS of word keys, in reading order: a matched box goes under its run; a box between two matched boxes
  // of the same run joins it; any other box is overflow (/Artifact: searchable, not read). A run no box matched gets its
  // own words placed just after the previous run's last box, in that box's size (approximate, and counted). Fewer than
  // half the boxes matched means the boxes describe some other reading: mismatch, as before. Pure + deterministic.
  const _alignCallsToRuns = (runs, calls) => {
    const _runs = Array.isArray(runs) ? runs : [];
    const _calls = Array.isArray(calls) ? calls : [];
    const out = _runs.map((r) => ({ run: r, calls: [] }));
    out.aligned = true; out.approximatedRuns = 0;
    if (!out.length || !_calls.length) { out.mismatch = { leafWords: 0, boxes: _calls.length }; return out; }
    const key = (t) => String(t || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const L = [];
    _runs.forEach((r, ri) => { for (const w of String((r && r.text) || '').split(/\s+/)) { const k = key(w); if (k) L.push({ ri, k }); } });
    const K = _calls.map((c) => key(c && c.text));
    const n = L.length, m = K.length;
    if (!n || (n + 1) * (m + 1) > 4e6) { out.mismatch = { leafWords: n, boxes: m }; return out; }
    const W = m + 1, d = new Uint16Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i * W + j] = (K[j] && L[i].k === K[j]) ? d[(i + 1) * W + j + 1] + 1 : Math.max(d[(i + 1) * W + j], d[i * W + j + 1]);
    const runOfCall = new Array(m).fill(-1);
    let matched = 0;
    for (let i = 0, j = 0; i < n && j < m;) {
      if (K[j] && L[i].k === K[j] && d[i * W + j] === d[(i + 1) * W + j + 1] + 1) { runOfCall[j] = L[i].ri; matched++; i++; j++; }
      else if (d[(i + 1) * W + j] >= d[i * W + j + 1]) i++; else j++;
    }
    if (matched < Math.max(3, m * 0.5)) { out.mismatch = { leafWords: n, boxes: m, matched }; return out; }
    // Unmatched boxes: inside one run's matched stretch they belong to it; otherwise overflow.
    const overflow = [];
    let prevRun = -1;
    for (let j = 0; j < m; j++) {
      if (runOfCall[j] >= 0) { prevRun = runOfCall[j]; continue; }
      let next = -1;
      for (let k = j + 1; k < m; k++) if (runOfCall[k] >= 0) { next = runOfCall[k]; break; }
      if (prevRun >= 0 && prevRun === next) runOfCall[j] = prevRun;
    }
    for (let j = 0; j < m; j++) { if (runOfCall[j] >= 0) out[runOfCall[j]].calls.push(_calls[j]); else overflow.push(_calls[j]); }
    if (overflow.length) out.overflow = overflow;
    // A run with no box: its own words, laid out from just below the previous placed box (or above the first one).
    let anchor = null;
    const xs = _calls.map((c) => c.x).filter((x) => isFinite(x));
    const left = xs.length ? Math.min.apply(null, xs) : 36, right = xs.length ? Math.max.apply(null, xs) + 120 : 560;
    const firstPlaced = out.find((g) => g.calls.length);
    for (let ri = 0; ri < out.length; ri++) {
      const g = out[ri];
      if (g.calls.length) { anchor = g.calls[g.calls.length - 1]; continue; }
      const words = String((g.run && g.run.text) || '').trim().split(/\s+/).filter(Boolean);
      if (!words.length) continue;
      const base = anchor || (firstPlaced && firstPlaced.calls[0]) || { x: left, y: 700, size: 10 };
      const size = isFinite(base.size) && base.size > 0 ? base.size : 10;
      let x = anchor ? left : base.x, y = anchor ? base.y - size * 1.5 : base.y + size * 1.5;
      for (const t of words) {
        if (x > right) { x = left; y -= size * 1.3; }
        g.calls.push({ text: t, x, y: Math.max(8, y), size, w: 0, angle: 0, approximate: true });
        x += size * 0.55 * t.length + size * 0.3;
      }
      anchor = g.calls[g.calls.length - 1];
      if (words.some((w) => key(w))) out.approximatedRuns++; // a bullet dot or a dash is not text the reader misses
    }
    return out;
  };


  // OCR every page of a PDF with Tesseract. Renders each page at 2× to a canvas, recognises,
  // concatenates. Returns { fullText, pages: [{pageNum, text, words, pageW, pageH}], sourceCharCount }.
  // Progress callback fires per page (0..1) so the UI can show "OCR page 3 of 12" without blocking.
  // Map a BCP-47 / ISO-639 language code (or name fragment) to a Tesseract.js traineddata
  // code. Tesseract auto-fetches the model for the returned code; unknowns fall back to
  // 'eng'. Covers the common European + refugee/ELL languages AlloFlow targets.
  const _toTesseractLang = (code) => {
    if (!code) return 'eng';
    const c = String(code).trim().toLowerCase().replace(/_/g, '-');
    const base = c.split('-')[0];
    if (base === 'zh') return (/(^|[-])(tw|hant|hk|mo)/.test(c)) ? 'chi_tra' : 'chi_sim';
    const MAP = {
      en: 'eng', es: 'spa', fr: 'fra', de: 'deu', it: 'ita', pt: 'por', nl: 'nld',
      ru: 'rus', uk: 'ukr', pl: 'pol', tr: 'tur', sv: 'swe', da: 'dan', nb: 'nor', no: 'nor', fi: 'fin',
      cs: 'ces', sk: 'slk', ro: 'ron', hu: 'hun', el: 'ell', bg: 'bul', hr: 'hrv', sr: 'srp',
      he: 'heb', ar: 'ara', fa: 'fas', ps: 'pus', ur: 'urd',
      hi: 'hin', bn: 'ben', pa: 'pan', gu: 'guj', ta: 'tam', te: 'tel', kn: 'kan', ml: 'mal',
      th: 'tha', lo: 'lao', km: 'khm', my: 'mya', vi: 'vie', id: 'ind', ms: 'msa', tl: 'tgl',
      ja: 'jpn', ko: 'kor', am: 'amh', ti: 'tir', sw: 'swa', so: 'som', ht: 'hat',
    };
    return MAP[base] || 'eng';
  };

  // Best-effort document-language detection for OCR: ONE lightweight Gemini Vision call that
  // returns just the ISO 639-1 code, so Tesseract can run with the right model (its word
  // boxes drive the positioned searchable layer; in 'eng' they mis-segment non-Latin scripts).
  // Returns null on any failure so the caller falls back to English. Vision extraction itself
  // is language-agnostic, so this is purely to sharpen the Tesseract pass.
  const _detectOcrLanguage = async (base64, mimeType) => {
    if (!callGeminiVision) return null;
    try {
      const resp = await callGeminiVision(
        'What is the PRIMARY written language of this document? Respond with ONLY the ISO 639-1 two-letter lowercase code (e.g. en, es, fr, de, it, pt, ru, ar, zh, ja, ko, vi, hi, fa, ur, th, tr). If unsure, respond "en". Output the code and nothing else.',
        base64, mimeType
      );
      const m = String(resp || '').trim().toLowerCase().match(/[a-z]{2,3}(-[a-z]{2,4})?/);
      return m ? m[0] : null;
    } catch (e) { try { warnLog('[OCR lang detect] failed — falling back to eng: ' + (e && e.message)); } catch (_) {} return null; }
  };

  // OCR recognize with bounded, self-healing attempts (Tesseract reliability, 2026-06-18).
  // The original two-line form (recognize {blocks:true} → catch → plain) had NO timeout, so a
  // worker/model-download that STALLS (never resolves) hung the page loop — the per-page
  // try/catch only catches a THROW, not a hang. Here EVERY attempt is _withTimeout-bounded, and
  // the chain also (a) retries a transient failure on the next attempt — the functional API
  // spawns a fresh worker, so the WASM core + traineddata are genuinely re-fetched — and
  // (b) falls back to the always-present English model when the requested language model is
  // unavailable (404 / blocked), turning a whole-page failure into English OCR. Attempt order:
  //   lang+{blocks} → lang(plain) → [eng+{blocks} → eng(plain), only if lang !== 'eng'].
  // Eng-only docs get 2 attempts (no eng fallback to add); non-eng get 4 (the 2 lang attempts,
  // then eng as a fallback). Tiered timeout: the FIRST attempt is generous (the ~10MB model may
  // download here), later attempts are tighter (model is cached / a true hang is already
  // established) so worst-case per-page latency is bounded (~120 + 3×60 = 300s, not 4×120s).
  // Throws the last error ONLY if every attempt fails, so the caller's per-page catch records an
  // empty page and continues exactly as before (no downstream behavior change on success).
  const _OCR_RECOGNIZE_TIMEOUT_FIRST_MS = 120000; // 1st attempt: covers first-page model download + OCR on slow links
  const _OCR_RECOGNIZE_TIMEOUT_NEXT_MS = 60000;   // later attempts: model cached / hang already established → tighter
  // P7 (deep dive 2026-07-02): shared per-language Tesseract worker. The functional API spawns
  // a FRESH worker (WASM boot + traineddata init, ~1-3s) per call — a 200-page scan paid ~200
  // boots, minutes of pure overhead. One worker is created lazily per language and reused
  // across pages; ANY shared-path failure tears it down and _ocrRecognize falls back to the
  // fresh-spawn functional attempts below, preserving the self-healing property the 2026-06-18
  // reliability chain was built on. Released in the OCR loops' finally blocks.
  let _ocrSharedWorker = null;
  let _ocrSharedWorkerLang = null;
  const _ocrWorkerRelease = async () => {
    const w = _ocrSharedWorker;
    _ocrSharedWorker = null; _ocrSharedWorkerLang = null;
    if (w) { try { await w.terminate(); } catch (_) {} }
  };
  const _ocrSharedRecognize = async (canvas, lang, label) => {
    const _boot = !_ocrSharedWorker || _ocrSharedWorkerLang !== lang;
    if (_boot) {
      await _ocrWorkerRelease();
      let bootCancelled = false;
      try {
        _ocrSharedWorker = await _withTimeout((async () => {
          const worker = await _createVerifiedTesseractWorker(lang);
          if (bootCancelled) { try { await worker.terminate(); } catch (_) {} throw new Error('shared worker initialization superseded'); }
          return worker;
        })(), _OCR_RECOGNIZE_TIMEOUT_FIRST_MS, 'Tesseract.createWorker (' + (label || '?') + ' lang=' + lang + ')');
      } catch (error) { bootCancelled = true; throw error; }
      _ocrSharedWorkerLang = lang;
    }
    return _withTimeout(
      _ocrSharedWorker.recognize(canvas, undefined, { blocks: true, text: true }),
      _boot ? _OCR_RECOGNIZE_TIMEOUT_FIRST_MS : _OCR_RECOGNIZE_TIMEOUT_NEXT_MS,
      'worker.recognize (' + (label || '?') + ' lang=' + lang + ')'
    );
  };
  const _ocrRecognize = async (canvas, lang, label) => {
    if (!canvas) throw new Error('OCR recognize: canvas missing'); // can't happen at current call sites; clear error if it ever does
    const useLang = lang || 'eng';
    // P7 fast path: reuse the shared worker; on failure release it and run the fresh-spawn chain.
    if (window.Tesseract && typeof window.Tesseract.createWorker === 'function') {
      try {
        return await _ocrSharedRecognize(canvas, useLang, label);
      } catch (eShared) {
        try { warnLog('[Tesseract] shared-worker path failed (' + (eShared && eShared.message) + ') — falling back to fresh-spawn attempts (' + (label || '?') + ')'); } catch (_) {}
        await _ocrWorkerRelease();
      }
    }
    // M17 (deep dive 2026-07-09): these attempts used to call the STATIC Tesseract.recognize with
    // { blocks: true } as a 4th argument — tesseract.js v5's static API is (image, langs, options)
    // and silently ignores it, so every fresh-spawn attempt returned text WITHOUT the word
    // hierarchy: the tagged PDF's positioned searchable layer degraded to the top-left block
    // exactly when the self-healing chain mattered (worker boot timeout, missing traineddata,
    // shared-path OOM) — and the b:false "plain" rung was byte-identical dead weight. Spawn a real
    // worker per attempt (same output form as the shared path: blocks + text), terminate it either
    // way; the b:false rungs remain as genuine plain-text retries.
    const attempts = [{ l: useLang, b: true }, { l: useLang, b: false }];
    if (useLang !== 'eng') attempts.push({ l: 'eng', b: true }, { l: 'eng', b: false });
    let lastErr = null;
    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      let _w = null, _cancelled = false;
      try {
        const res = await _withTimeout(
          (async () => {
            const _wk = await _createVerifiedTesseractWorker(a.l);
            // The outer timeout may have already given up while createWorker booted — don't
            // leave an orphaned worker running in that case.
            if (_cancelled) { try { _wk.terminate(); } catch (_) {} throw new Error('fresh-spawn attempt superseded'); }
            _w = _wk;
            return _wk.recognize(canvas, undefined, a.b ? { blocks: true, text: true } : { text: true });
          })(),
          i === 0 ? _OCR_RECOGNIZE_TIMEOUT_FIRST_MS : _OCR_RECOGNIZE_TIMEOUT_NEXT_MS,
          'Tesseract fresh-spawn (' + (label || '?') + ' lang=' + a.l + (a.b ? ' +blocks' : '') + ')'
        );
        if (i > 0) { try { warnLog('[Tesseract] recognize recovered on attempt ' + (i + 1) + '/' + attempts.length + ' (lang=' + a.l + ', ' + (label || '?') + ')'); } catch (_) {} }
        return res;
      } catch (e) { lastErr = e; }
      finally { _cancelled = true; if (_w) { try { await _w.terminate(); } catch (_) {} } }
    }
    throw lastErr || new Error('Tesseract.recognize failed (all attempts exhausted)');
  };

  // M14 (audit 2026-07-26): pageRange is [start, end], 1-based inclusive, either element optional.
  // Without it this OCR'd the WHOLE document and the caller threw the out-of-scope pages away —
  // 200 pages rendered and recognised for a 20-page job, a progress label reading "page 137/200"
  // during it, and (worse) every out-of-range render failure landing in window.__lastOcrPageErrors,
  // where it named untouched pages in the Stage-1 banner and permanently blocked OCR-evidence
  // banking, since _ocrEvidenceCompatible refuses any record carrying page errors.
  // ── Hidden-tab-safe page rasterization (2026-08-16, Aaron) ───────────────────────────────
  // Chrome suspends MAIN-THREAD canvas work in a hidden tab: the 2026-08-16 field run shows
  // pdf.js page renders waiting 46s+ for the tab and every Tesseract rung timing out, while
  // Vision (network) sailed on. Dedicated workers are not visibility-throttled, and pdf.js can
  // render into an OffscreenCanvas — so page rasterization moves into a worker and OCR keeps
  // full speed while minimized. Design constraints, in order:
  //   1. FAIL-OPEN. Any failure (CSP blocks blob workers, pdf.js won't load, OffscreenCanvas
  //      render error on a pattern-heavy page) falls back to the existing main-thread ladder,
  //      same rung. Two worker failures abandon the worker for the run. The old path is not
  //      touched; the new path is an overlay.
  //   2. The worker imports its OWN pdf.js and ALSO imports the pdf.worker build into its own
  //      thread ("fake worker" mode): a blob:-origin worker cannot spawn a nested cross-origin
  //      Worker, so parsing runs inline on this worker thread — which is exactly what we want.
  //   3. The worker source is a plain single-quoted string (template literals with backticks
  //      break the enclosing build — the Kokoro lesson — and node --check cannot see into it).
  //   4. One log line names which path ran, so every pasted log answers "was the worker active?"
  const _ALLO_RASTER_WORKER_MAX_BYTES = 60 * 1024 * 1024; // the worker holds a SECOND copy of the PDF
  const _alloOcrRasterWorkerSource = function () {
    return [
      'var pdfDoc = null;',
      'self.onmessage = function (ev) {',
      '  var m = ev.data || {};',
      '  if (m.t === "init") {',
      '    try {',
      '      if (typeof pdfjsLib === "undefined" || !(self.pdfjsWorker && self.pdfjsWorker.WorkerMessageHandler)) { self.postMessage({ t: "init-error", message: "verified PDF graph was not preloaded" }); return; }',
      '      if (!self.__alloRuntimeAssets || typeof self.__alloRuntimeAssets.worker !== "string" || self.__alloRuntimeAssets.worker.indexOf("blob:") !== 0) { self.postMessage({ t: "init-error", message: "verified PDF worker binding is unavailable" }); return; }',
      '      if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = self.__alloRuntimeAssets.worker;',
      '      pdfjsLib.getDocument({ data: new Uint8Array(m.buf), isEvalSupported: false }).promise.then(function (doc) {',
      '        pdfDoc = doc;',
      '        self.postMessage({ t: "ready", pages: doc.numPages });',
      '      }, function (e) { self.postMessage({ t: "init-error", message: String((e && e.message) || e) }); });',
      '    } catch (e) { self.postMessage({ t: "init-error", message: String((e && e.message) || e) }); }',
      '    return;',
      '  }',
      '  if (m.t === "render") {',
      '    if (!pdfDoc) { self.postMessage({ t: "render-error", id: m.id, message: "no document" }); return; }',
      '    pdfDoc.getPage(m.page).then(function (page) {',
      '      var vp = page.getViewport({ scale: m.scale });',
      '      var oc = new OffscreenCanvas(Math.max(1, Math.ceil(vp.width)), Math.max(1, Math.ceil(vp.height)));',
      '      var ctx = oc.getContext("2d");',
      '      return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {',
      '        return oc.convertToBlob({ type: "image/png" });',
      '      }).then(function (blob) { return blob.arrayBuffer(); }).then(function (buf) {',
      '        self.postMessage({ t: "rendered", id: m.id, buf: buf, width: oc.width, height: oc.height, transform: vp.transform }, [buf]);',
      '      });',
      '    }).catch(function (e) { self.postMessage({ t: "render-error", id: m.id, message: String((e && e.message) || e) }); });',
      '    return;',
      '  }',
      '  if (m.t === "close") { try { if (pdfDoc) pdfDoc.destroy(); } catch (e) {} try { self.close(); } catch (e) {} }',
      '};',
    ].join('\n');
  };
  // Returns a controller { render(page, scale, timeoutMs), healthy(), noteFailure(), destroy() }
  // or null when the environment cannot support it. Never throws.
  const _alloCreateOcrRasterWorker = async (bytes) => {
    let ownedWorker = null;
    try {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
      if (!bytes || !bytes.length || bytes.length > _ALLO_RASTER_WORKER_MAX_BYTES) return null;
      const createWorker = typeof window !== 'undefined' && window.__alloCreateVerifiedWorker;
      if (typeof createWorker !== 'function') return null;
      const _worker = await createWorker('pdfjs-raster', _alloOcrRasterWorkerSource(), { name: 'alloflow-pdfjs-raster' });
      ownedWorker = _worker;
      if (!_worker) return null;
      const _pending = new Map();
      let _nextId = 1;
      let _failures = 0;
      let _dead = false;
      _worker.onmessage = (ev) => {
        const m = (ev && ev.data) || {};
        const _p = m.id != null ? _pending.get(m.id) : null;
        if (m.t === 'rendered' && _p) { _pending.delete(m.id); _p.resolve(m); }
        else if (m.t === 'render-error' && _p) { _pending.delete(m.id); _p.reject(new Error(m.message || 'worker render failed')); }
      };
      let _rejectInit = null;
      _worker.onerror = (errEv) => {
        _dead = true;
        const msg = (errEv && errEv.message) ? ('raster worker error: ' + errEv.message) : 'raster worker crashed';
        if (_rejectInit) {
          const rj = _rejectInit;
          _rejectInit = null;
          try { rj(new Error(msg)); } catch (_) {}
        }
        _pending.forEach((p) => { try { p.reject(new Error(msg)); } catch (_) {} });
        _pending.clear();
      };
      // The host verified and preloaded the complete PDF code graph before
      // starting this protocol. Init carries document bytes, never code URLs.
      const _initDone = new Promise((resolve, reject) => {
        const _onInit = (ev) => {
          const m = (ev && ev.data) || {};
          if (m.t === 'ready') { _rejectInit = null; _worker.removeEventListener('message', _onInit); resolve(true); }
          else if (m.t === 'init-error') { _rejectInit = null; _worker.removeEventListener('message', _onInit); reject(new Error(m.message || 'worker init failed')); }
        };
        _rejectInit = (err) => {
          _worker.removeEventListener('message', _onInit);
          reject(err);
        };
        _worker.addEventListener('message', _onInit);
      });
      const _copy = bytes.slice().buffer;
      _worker.postMessage({
        t: 'init',
        buf: _copy,
      }, [_copy]);
      await _withTimeout(_initDone, 20000, 'raster worker init');
      return {
        healthy: () => !_dead && _failures < 2,
        noteFailure: () => { _failures++; },
        render: (page, scale, timeoutMs) => {
          const id = _nextId++;
          const _p = new Promise((resolve, reject) => { _pending.set(id, { resolve, reject }); });
          _worker.postMessage({ t: 'render', id, page, scale });
          return _withTimeout(_p, Math.max(1000, timeoutMs || 45000), 'worker page.render p' + page + ' @' + scale + 'x').finally(() => { _pending.delete(id); });
        },
        destroy: () => {
          _dead = true;
          try { _worker.postMessage({ t: 'close' }); } catch (_) {}
          try { _worker.terminate(); } catch (_) {}
          _pending.forEach((p) => { try { p.reject(new Error('raster worker destroyed')); } catch (_) {} });
          _pending.clear();
        },
      };
    } catch (_) {
      try { if (ownedWorker) ownedWorker.terminate(); } catch (_) {}
      return null;
    }
  };
  const extractPdfTextTesseract = async (base64, onProgress, lang, pageRange) => {
    let pdf = null; // (2026-06-20) freed in finally to release the pdf.js worker doc (batch memory leak)
    let _rasterWorker = null; // (2026-08-16) hidden-tab-safe rasterizer; freed in the same finally
    try {
      await ensurePdfJsLoaded();
      await ensureTesseractLoaded();
      if (!window.pdfjsLib || !window.Tesseract) throw new Error('pdf.js or Tesseract unavailable');
      const raw = base64.includes(',') ? base64.split(',')[1] : base64;
      const bytes = _b64ToBytes(base64); // capped at _MAX_PDF_BYTES (was raw atob — uncapped OOM on low-RAM devices)
      pdf = await _withTimeout(window.pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise, 60000, 'pdf.js getDocument (OCR)');
      // Hidden-tab-safe rasterization (see _alloCreateOcrRasterWorker above). Fail-open: null
      // here simply means every page uses the existing main-thread ladder, exactly as before.
      _rasterWorker = await _alloCreateOcrRasterWorker(bytes);
      if (_rasterWorker) {
        try { warnLog('[Tesseract] page rasterization is running in a background worker (OffscreenCanvas) — OCR continues at full speed while this tab is hidden or minimized'); } catch (_) {}
      } else {
        try { warnLog('[Tesseract] background-worker rasterization unavailable on this host — using the main-thread renderer (a hidden tab will slow page rendering)'); } catch (_) {}
      }
      const useLang = lang || 'eng';
      // 2026-06-08: per-page try/catch — a single page's OOM/canvas/recognize
      // failure previously bubbled to the outer catch and threw away ALL pages'
      // OCR output. Now: log the failure + push an empty record + keep going.
      // Downstream reconcileOcrPages already tolerates empty per-page text.
      const pages = [];
      const pageErrors = [];
      // A timed-out pdf.js RenderTask used to remain alive and poison every later page. Cancel
      // each failed task, then open a document-level circuit after two consecutive pages cannot
      // render at all. Vision OCR runs alongside this pass and remains the content fallback.
      let _renderFailureStreak = 0;
      let _renderCircuitOpen = false;
      // M14: OCR only the selected pages. Clamped to the real document bounds, so a teacher who
      // typed "1-500" on a 30-page file still gets 30 pages rather than 470 render failures.
      const _ocrFirstPage = Math.max(1, Math.min(pdf.numPages, (pageRange && pageRange[0]) || 1));
      const _ocrLastPage = Math.max(_ocrFirstPage, Math.min(pdf.numPages, (pageRange && pageRange[1]) || pdf.numPages));
      if (_ocrFirstPage > 1 || _ocrLastPage < pdf.numPages) {
        warnLog(`[Tesseract] OCR limited to pages ${_ocrFirstPage}-${_ocrLastPage} of ${pdf.numPages} (selected range)`);
      }
      for (let p = _ocrFirstPage; p <= _ocrLastPage; p++) {
        let canvas = null, renderScale = 2.0, renderViewport = null; // hoisted so the finally can free it on BOTH success and failure
        let workerBlob = null, _workerDims = null; // (2026-08-16) set by the hidden-tab-safe worker path instead of `canvas`
        if (_renderCircuitOpen) {
          const _skipMsg = 'Tesseract render circuit open after repeated page-render timeouts; Vision OCR companion remains active';
          pages.push({ pageNum: p, text: '', words: null, error: _skipMsg });
          pageErrors.push({ pageNum: p, error: _skipMsg });
          if (typeof onProgress === 'function') onProgress({ page: p, total: _ocrLastPage, phase: 'vision-fallback' });
          continue;
        }
        try {
          if (typeof onProgress === 'function') onProgress({ page: p, total: _ocrLastPage, phase: 'render' });
          const page = await _withTimeout(pdf.getPage(p), 30000, 'pdf.getPage (OCR p' + p + ')'); // bound getPage too — pdf.js worker can stall
          // Render at 2x for OCR accuracy, bounded so a hung/slow render can't stall the pipeline.
          // #4 fix (2026-06-17): the 45s timeout here used to SILENTLY BLANK a slow/large page (no
          // text layer → "OCR arbitrarily skips that page"). Now a longer first budget AND, on
          // timeout/failure, a single retry at a SMALLER scale — a page that hangs or is slow at 2x
          // (huge canvas on a low-RAM device) usually renders fine at 1.25x, recovering a slightly
          // lower-res OCR pass instead of dropping the page's text layer entirely. Still FULLY BOUNDED
          // (every attempt is _withTimeout-wrapped → no unbounded await → the original hang fix holds).
          // Ladder: high-res first for OCR accuracy, falling to lower scales on timeout. CRITICAL: a
          // SUCCESSFUL Tesseract render is what yields the per-WORD BOXES used to draw the POSITIONED
          // searchable/screen-reader text layer. If every rung times out, the page has no boxes and the
          // OCR text falls back to one top-left block (mispositioned — does NOT overlay the page). So the
          // cheap final 1x rung gets the MOST GENEROUS budget: ~1/4 the pixels of 2x, it reliably renders
          // even a heavy page → guaranteed word boxes (positioning) over raw speed. Word positions are
          // scale-invariant (normalized by renderScale), so a 1x render still overlays correctly. (2026-06-19, fixes top-block regression)
          // After one complete page-render failure, probe the next page at cheap 1x first.
          // A successful probe resets the ladder; a second failure opens the circuit below.
          const _renderScales = _renderFailureStreak > 0 ? [1.0] : [2.0, 1.25, 1.0];
          for (const _sc of _renderScales) {
            // Worker path first (2026-08-16): renders on a dedicated thread the browser does not
            // visibility-throttle, so a hidden tab no longer stalls this rung. Any failure notes
            // it and falls through to the main-thread canvas attempt below AT THE SAME RUNG; two
            // failures retire the worker for the run. Same timeout ladder as the canvas path.
            if (_rasterWorker && _rasterWorker.healthy()) {
              try {
                const _wr = await _rasterWorker.render(p, _sc, _sc >= 2 ? 45000 : (_sc >= 1.25 ? 35000 : 55000));
                workerBlob = new Blob([_wr.buf], { type: 'image/png' });
                _workerDims = { width: _wr.width, height: _wr.height };
                renderScale = _sc;
                renderViewport = { transform: Array.isArray(_wr.transform) ? _wr.transform : null };
                break;
              } catch (_wErr) {
                _rasterWorker.noteFailure();
                try { warnLog('[Tesseract] worker raster p' + p + ' @' + _sc + 'x failed (' + ((_wErr && _wErr.message) || _wErr) + ') — falling back to the main-thread renderer for this rung' + (_rasterWorker.healthy() ? '' : '; worker retired for this run')); } catch (_) {}
              }
            }
            const _vp = page.getViewport({ scale: _sc });
            const _c = document.createElement('canvas'); _c.setAttribute('aria-hidden', 'true');
            _c.width = _vp.width; _c.height = _vp.height;
            let _renderTask = null;
            try {
              _renderTask = page.render({ canvasContext: _c.getContext('2d'), viewport: _vp });
              await _withTimeout(_renderTask.promise, _sc >= 2 ? 45000 : (_sc >= 1.25 ? 35000 : 55000), 'page.render (OCR p' + p + ' @' + _sc + 'x)');
              canvas = _c; renderScale = _sc; renderViewport = _vp; break;
            } catch (_rErr) {
              // _withTimeout rejects only the race; cancel the underlying pdf.js work too so it
              // cannot keep the worker busy and make every following page time out behind it.
              try { if (_renderTask && typeof _renderTask.cancel === 'function') _renderTask.cancel(); } catch (_) {}
              try { _c.width = 0; _c.height = 0; } catch (_) {}
              if (_sc > 1.0) { try { warnLog('[Tesseract] page ' + p + ' render @' + _sc + 'x failed (' + ((_rErr && _rErr.message) || _rErr) + ') — retrying at a lower scale'); } catch (_) {} }
              else throw _rErr; // all scales failed → fall to the per-page catch (recorded, not silent)
            }
          }
          _renderFailureStreak = 0; // this page rendered; restore the full quality ladder next page
          if (typeof onProgress === 'function') onProgress({ page: p, total: _ocrLastPage, phase: 'ocr' });
          // Bounded, self-healing OCR (see _ocrRecognize): timeout per attempt + transient
          // retry + English fallback. v5 returns ONLY text by default; {blocks:true} opts into
          // the word hierarchy that places each word's invisible glyphs at its real position.
          const result = await _ocrRecognize(canvas || workerBlob, useLang, 'p' + p); // tesseract.js accepts a canvas or a Blob interchangeably
          const data = (result && result.data) || {};
          const pageText = (data.text || '').trim();
          const words = _collectOcrWords(data, renderScale); // normalize bboxes to PDF points (actual render scale)
          const viewportTransform = (renderViewport && Array.isArray(renderViewport.transform))
            ? renderViewport.transform.map(n => n / renderScale)
            : null;
          pages.push({ pageNum: p, text: pageText, words: (words && words.length ? words : null), pageW: (canvas ? canvas.width : _workerDims.width) / renderScale, pageH: (canvas ? canvas.height : _workerDims.height) / renderScale, viewportTransform });
        } catch (pageErr) {
          const _pmsg = (pageErr && pageErr.message) || String(pageErr);
          pages.push({ pageNum: p, text: '', words: null, error: _pmsg });
          pageErrors.push({ pageNum: p, error: _pmsg });
          if (_pmsg.indexOf('page.render (OCR p') !== -1) {
            _renderFailureStreak++;
            if (_renderFailureStreak >= 2 && p < pdf.numPages) {
              _renderCircuitOpen = true;
              try { warnLog('[Tesseract] two consecutive pages could not render — skipping Tesseract rendering for the remaining ' + (pdf.numPages - p) + ' page(s); Vision OCR remains active'); } catch (_) {}
            }
          } else {
            _renderFailureStreak = 0;
          }
          try { warnLog('[Tesseract] page ' + p + ' failed (' + (pdf.numPages - 1) + ' other pages still attempted): ' + _pmsg); } catch (_) {}
        } finally {
          // Free the canvas on BOTH success and failure — a mid-page render/recognize throw used to
          // leak the 2x canvas (cleanup was success-path only). null if getPage failed pre-creation.
          if (canvas) { try { canvas.width = 0; canvas.height = 0; } catch (_) {} }
        }
      }
      const fullText = pages.map(p => p.text).filter(Boolean).join('\n\n');
      return { fullText, pages, pageCount: pdf.numPages, sourceCharCount: fullText.length, pageErrors };
    } catch (e) {
      warnLog('[Tesseract] extractPdfTextTesseract failed:', e && e.message);
      // C3 (audit 2026-07-26): a whole-engine failure (this catch also covers ensureTesseractLoaded,
      // so a CDN miss lands here) used to report `pageErrors: []` — indistinguishable from a clean
      // run. Callers concat these into window.__lastOcrPageErrors to decide whether to show the
      // partial-extraction banner, so an empty array meant the engine's total death was invisible.
      // Emit one record per page we know about; fall back to a single document-level record when
      // the failure happened before the page count was known.
      const _engineErr = 'Tesseract OCR failed for the whole document' + (e && e.message ? ': ' + String(e.message).slice(0, 160) : '.');
      const _known = (pdf && pdf.numPages) || 0;
      const _errs = [];
      if (_known > 0) { for (let p = 1; p <= _known; p++) _errs.push({ pageNum: p, engine: 'tesseract', error: _engineErr }); }
      else _errs.push({ pageNum: null, engine: 'tesseract', error: _engineErr });
      return { fullText: '', pages: [], pageCount: 0, sourceCharCount: 0, error: e && e.message, pageErrors: _errs };
    } finally {
      if (pdf) { try { pdf.destroy(); } catch (_) {} }
      if (_rasterWorker) { try { _rasterWorker.destroy(); } catch (_) {} } // free the second pdf.js copy + thread
      try { await _ocrWorkerRelease(); } catch (_) {} // P7: free the shared worker at end-of-document
    }
  };

  // Render + OCR a SPECIFIC SET of 1-indexed pages (Tesseract only — zero API cost). Used to
  // rescue image-only pages embedded in an otherwise text-layer PDF (mixed scanned+digital),
  // which the whole-document isScanned average silently drops. Fail-safe: returns a partial /
  // empty map on any failure so the caller can always keep its original text-layer result.
  // confOut (optional, deep dive 2026-07-02 H3): caller-supplied object populated with the mean
  // Tesseract confidence per page — this used to be discarded, so rescued pages bypassed the
  // low-confidence disclosure nets the full-OCR path feeds.
  const _ocrSpecificPages = async (base64, pageNums, lang, confOut) => {
    const out = {};
    let pdf = null; // (2026-06-20) freed in finally to release the pdf.js worker doc (batch memory leak)
    try {
      await ensurePdfJsLoaded();
      await ensureTesseractLoaded();
      if (!window.pdfjsLib || !window.Tesseract) return out;
      const bytes = _b64ToBytes(base64);
      pdf = await _withTimeout(window.pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise, 60000, 'pdf.js getDocument (mixed-page OCR)');
      const useLang = lang || 'eng';
      for (let i = 0; i < pageNums.length; i++) {
        const p = pageNums[i];
        if (p < 1 || p > pdf.numPages) continue;
        let canvas = null; // hoisted so the finally frees it on failure too (was success-path only → leak)
        try {
          const page = await _withTimeout(pdf.getPage(p), 30000, 'pdf.getPage (mixed-page OCR p' + p + ')'); // bound getPage — pdf.js worker can stall
          const viewport = page.getViewport({ scale: 2.0 });
          canvas = document.createElement('canvas'); if (typeof canvas.setAttribute === 'function') canvas.setAttribute('aria-hidden', 'true');
          canvas.width = viewport.width; canvas.height = viewport.height;
          const cctx = canvas.getContext('2d');
          let _renderTask = null;
          try {
            _renderTask = page.render({ canvasContext: cctx, viewport });
            await _withTimeout(_renderTask.promise, 45000, 'page.render (mixed-page OCR p' + p + ')');
          } catch (_rErr) {
            try { if (_renderTask && typeof _renderTask.cancel === 'function') _renderTask.cancel(); } catch (_) {}
            throw _rErr;
          }
          const result = await _ocrRecognize(canvas, useLang, 'mixed-p' + p);
          const txt = ((result && result.data && result.data.text) || '').trim();
          if (txt) {
            out[p] = txt;
            if (confOut && result && result.data && typeof result.data.confidence === 'number') confOut[p] = Math.round(result.data.confidence);
          }
        } catch (_pageErr) { try { warnLog('[Mixed-page OCR] page ' + p + ' failed: ' + (_pageErr && _pageErr.message)); } catch (_) {} }
        finally { if (canvas) { try { canvas.width = 0; canvas.height = 0; } catch (_) {} } }
      }
    } catch (_e) { try { warnLog('[Mixed-page OCR] setup failed (keeping text-layer): ' + (_e && _e.message)); } catch (_) {} }
    finally {
      if (pdf) { try { pdf.destroy(); } catch (_) {} }
      try { await _ocrWorkerRelease(); } catch (_) {} // P7: free the shared worker at end-of-batch
    }
    return out;
  };

  // Keep uncertain multi-page text outside the physical page map. A missing boundary
  // gets one bounded request per physical page; character positions are never page IDs.
  const _resolveVisionOcrChunk = async (chunkText, startPage, pageCount, retryPage) => {
    const marker = /^[ \t]*\[\[PAGE BREAK\]\][ \t]*\r?$/gm;
    const text = String(chunkText || '');
    const parts = text.split(marker);
    const pages = [], pageErrors = [];
    let stopReason = null;
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
          if (error && (error.name === 'AbortError' || error.isAbort)) throw error;
          const limited = error && (error.isThrottle || error.isDailyQuota || error.status === 429)
            || (typeof _isThrottleErr === 'function' && _isThrottleErr(error));
          if (limited) {
            stopReason = 'rate-limit';
            for (let pending = i; pending < pageCount; pending++) {
              const missingPage = startPage + pending;
              pages.push({ pageNum: missingPage, pageStart: missingPage, pageEnd: missingPage, text: '', boundarySource: 'unresolved' });
              pageErrors.push({ pageNum: missingPage, engine: 'vision', error: 'Physical-page OCR retry paused by a provider rate limit.' });
            }
            break;
          }
          pages.push({ pageNum, pageStart: pageNum, pageEnd: pageNum, text: '', boundarySource: 'unresolved' });
          pageErrors.push({ pageNum, engine: 'vision', error: 'Could not establish text for physical page ' + pageNum + ': ' + String(error && error.message || error).slice(0, 240) });
        }
      }
    } else {
      for (let i = 0; i < pageCount; i++) addPage(startPage + i, '', 'unresolved');
    }
    return { pages, pageErrors, fullText: pages.map(p => p.text).filter(Boolean).join('\n\n'),
      stopReason, unsegmentedText: parts.length !== pageCount ? text : '', retriedPages: text.trim() && parts.length !== pageCount && pageCount > 1 ? pageCount : 0 };
  };

  // Page-level reconciliation between two OCR outputs (H9 honesty note, 2026-07-02: this was
  // long mislabeled "word-level" here and in PIPELINE_ARCHITECTURE.md — it is per-page
  // winner-take-all, not token merging). "Perfect accuracy" for scanned PDFs
  // means losing no content, so the per-page rule is: take whichever output has more chars.
  // Record token/value disagreements as well as material length differences so the fidelity panel can
  // surface them for review. This is a union-of-best-per-page strategy, not a set-union on
  // tokens (which would introduce ordering artifacts).
  const reconcileOcrPages = (tessPages, visionPages) => {
    // Normalize presentation-only differences, retaining numbers, signs, names,
    // units and negation. OCR confidence estimates do not prove engine agreement.
    const _agreementTokens = (value) => String(value || '').normalize('NFKC').toLowerCase()
      .replace(/\u2212/g, '-').match(/[+-]?\p{N}+(?:[.,:/-]\p{N}+)*(?:%|\u2030)?|[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)?|[\p{Sm}<>=≤≥≠+\-]/gu) || [];
    // Language-agnostic OCR "junk" ratio: the fraction of non-whitespace chars that are NOT a
    // Unicode letter or number. Clean prose in ANY script (Latin, Arabic, Bengali, …) is mostly
    // letters/digits → low; symbol-soup garble (broken ligatures, stray punctuation, replacement
    // chars) → high. Lets us avoid a longer-but-garbled OCR pass beating a clean one. (ocr-quality)
    // Transcription scaffolding is structure, not garble: fill-in blank runs ("________"), markdown
    // table pipes and divider rows, heading hashes and list bullets. Left in, a faithful Vision
    // transcript of a form scored 0.21-0.33 against Tesseract's 0.10-0.14 and lost three of four
    // pages to garbled OCR (1954 IRS scan, agent-bridge pilot 2026-09-13). Dot leaders, stray
    // punctuation and replacement characters still count.
    const _ocrJunkProse = (s) => String(s || '')
      .replace(/_{3,}/g, ' ')
      .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?(?:[ \t]*\|[ \t]*:?-{3,}:?)*[ \t]*\|?[ \t]*$/gm, ' ')
      .replace(/\|/g, ' ')
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
      .replace(/^[ \t]*[*-][ \t]+/gm, '');
    const _ocrJunk = (s) => {
      const ns = _ocrJunkProse(s).replace(/\s+/g, '');
      if (!ns.length) return 1;
      const textChars = (ns.match(/[\p{L}\p{N}]/gu) || []).length;
      return 1 - textChars / ns.length;
    };
    // Mean Tesseract per-word confidence (0-100) for a page, or null when unavailable (Vision
    // produces no per-word confidence, so this only ever assesses the Tesseract side).
    const _meanConf = (page) => {
      const w = page && Array.isArray(page.words) ? page.words : null;
      if (!w || !w.length) return null;
      let sum = 0, n = 0;
      for (const x of w) { if (x && typeof x.c === 'number') { sum += x.c; n++; } }
      return n ? sum / n : null;
    };
    // Pair pages by ABSOLUTE pageNum, not array index (#20). Tesseract OCRs the whole doc (pageNum
    // 1..N) while Vision covers only the selected range, so index-pairing mis-reconciled e.g. a
    // page-1 transcript against a page-6 transcript on any partial range. Walk the union of pageNums.
    const _byNum = new Map();
    const _addPages = (arr, key) => { (arr || []).forEach((p, _idx) => { if (!p) return; const _n = (typeof p.pageNum === 'number') ? p.pageNum : (_idx + 1); if (!_byNum.has(_n)) _byNum.set(_n, {}); _byNum.get(_n)[key] = p; }); };
    _addPages(tessPages, 't'); _addPages(visionPages, 'v');
    const _nums = Array.from(_byNum.keys()).sort((a, b) => a - b);
    const merged = [];
    const disagreements = [];
    const lowConfidence = []; // B5 (2026-06-20): pages whose WINNING OCR is low-confidence — surfaced as a banner
    const _dupeCollapses = []; // #G (2026-07-05): line-wrap word echoes collapsed from a winning page, per page
    const _columnReorders = []; // H-5 scanned half (2026-07-13): pages whose ground truth was rebuilt column-aware
    const _visionAlignments = []; // 2026-10-20: pages whose Tesseract boxes took the Vision reading (disclosed)
    for (const _pn of _nums) {
      const _pair = _byNum.get(_pn);
      const tPage = _pair.t || null, vPage = _pair.v || null;
      const tText = (tPage && tPage.text) || '';
      const vText = (vPage && vPage.text) || '';
      const tLen = tText.length, vLen = vText.length;
      const longest = Math.max(tLen, vLen);
      // Default: the longer text wins (more captured content); Tesseract wins ties (determinism).
      let _winner = tLen >= vLen ? 'tesseract' : 'vision';
      // QUALITY OVERRIDE (Aaron 2026-06-15, posture: avoid garbled output, robust to MIXED scan
      // quality). Only flip AWAY from the longer text when it is CLEARLY garbled relative to a
      // SUBSTANTIAL cleaner alternative — so a faxed/photocopied page whose longer OCR is symbol-
      // soup no longer beats the clean transcription, while a clean page never loses real content.
      // Whenever quality is comparable the deterministic length rule (tie→tesseract) is unchanged.
      if (tLen > 0 && vLen > 0) {
        const _tJ = _ocrJunk(tText), _vJ = _ocrJunk(vText);
        const _winJ = _winner === 'tesseract' ? _tJ : _vJ;
        const _altJ = _winner === 'tesseract' ? _vJ : _tJ;
        const _winLen = _winner === 'tesseract' ? tLen : vLen;
        const _altLen = _winner === 'tesseract' ? vLen : tLen;
        const _substantialAlt = _altLen >= _winLen * 0.5;       // don't drop >half the captured content
        const _tConf = _meanConf(tPage);
        const _extremeGarbage = _winJ >= 0.45 && _altJ < _winJ && _substantialAlt; // winner is mostly non-text → garbage even if longer — but only flip when the alt has SUBSTANTIAL content (≥50% len), else we'd drop a page's text to a near-empty "cleaner" alt (audit wo72lu4mh #10; mirrors _clearlyWorse's guard)
        const _clearlyWorse = _winJ >= 0.18 && _winJ >= _altJ * 1.6 && _substantialAlt; // absolutely + relatively junkier
        // Low-confidence Tesseract → prefer a cleaner, substantial Vision. Threshold raised 50→60
        // (2026-06-20) to match the B5 low-confidence banner: garbled-but-letter-shaped OCR (e.g. a
        // shaded callout box — "lke"/"ae"/"mac") has LOW junk-ratio so _extremeGarbage/_clearlyWorse
        // miss it; confidence is the right signal. The guards stay — only flips when Vision is at
        // least as clean (_vJ <= _tJ) AND substantial (≥50% length), so we never trade down to a
        // worse/shorter page. (Won't help when Vision is empty/short for the page — that's the
        // separate Vision per-page-coverage issue.)
        const _lowConfTess = _winner === 'tesseract' && _tConf != null && _tConf < 60 && _vJ <= _tJ && _substantialAlt;
        // Accuracy override (2026-06-30): closes the letter-shaped-garble blind spot noted above —
        // "lke"/"ae"/"rnodern" has LOW junk-ratio so _extremeGarbage/_clearlyWorse miss it, and Tesseract
        // confidence only exists for the Tesseract side. _alloOcrAccuracy (dictionary hit-rate + vowel/
        // fragment plausibility) catches it. CONSERVATIVE, mirrors the guards: only flip to a SUBSTANTIAL
        // (>=50% length) alternative that is clearly cleaner (winner band 'poor', alt not 'poor', score
        // gap >=15) — never trades down. Fail-soft: any error leaves the length/junk/confidence decision.
        let _lowAccuracy = false;
        try {
          const _accT = _alloOcrAccuracy(tText), _accV = _alloOcrAccuracy(vText);
          const _winAcc = _winner === 'tesseract' ? _accT : _accV;
          const _altAcc = _winner === 'tesseract' ? _accV : _accT;
          _lowAccuracy = _substantialAlt && !!_winAcc && !!_altAcc && _winAcc.band === 'poor' && _altAcc.band !== 'poor' && typeof _winAcc.score === 'number' && typeof _altAcc.score === 'number' && (_altAcc.score - _winAcc.score) >= 15;
        } catch (_) { _lowAccuracy = false; }
        if (_extremeGarbage || _clearlyWorse || _lowConfTess || _lowAccuracy) {
          _winner = _winner === 'tesseract' ? 'vision' : 'tesseract';
          if (_lowAccuracy && !(_extremeGarbage || _clearlyWorse || _lowConfTess)) warnLog('[OCR Reconcile] page ' + _pn + ': flipped to ' + _winner + ' on OCR-accuracy estimate (letter-shaped garble the junk/confidence nets missed)');
        }
      }
      // Vision onto Tesseract's boxes (2026-10-20, _alloAlignVisionOntoOcrWords): the corrected boxes are the
      // page's searchable layer whichever text wins. A Tesseract win whose Vision reading is CORROBORATED
      // (Tesseract confirms it and it omits nothing Tesseract read confidently) takes the Vision text: on the
      // 1954 scan the longer Tesseract pages were letter-shaped garble no net above sees. Otherwise a Tesseract
      // win keeps its own text with the aligned corrections. Fail-soft; typeof keeps sliced harnesses working.
      let _aligned = null, _visionCorroborated = false;
      if (tLen > 0 && vLen > 0 && tPage && Array.isArray(tPage.words) && tPage.words.length && typeof _alloAlignVisionOntoOcrWords === 'function') {
        try { _aligned = _alloAlignVisionOntoOcrWords(tPage.words, tText, vText); } catch (_) { _aligned = null; }
        if (_aligned && !_aligned.words) _aligned = null;
      }
      if (_aligned && _winner === 'tesseract' && _aligned.stats.corroborated) {
        _winner = 'vision'; _visionCorroborated = true;
        warnLog('[OCR Reconcile] page ' + _pn + ': Vision reading corroborated by Tesseract (' + Math.round(_aligned.stats.anchorShare * 100) + '% of words agree, nothing omitted) — used as the page text');
      }
      if (_aligned && (_visionCorroborated || _aligned.stats.replaced || _aligned.stats.merged || _aligned.stats.removed)) {
        _visionAlignments.push({ pageNum: _pn, replaced: _aligned.stats.replaced, merged: _aligned.stats.merged, removed: _aligned.stats.removed, textSource: _winner, corroborated: _visionCorroborated, samples: _aligned.stats.samples.slice(0, 6), digitChanges: _aligned.stats.digitChanges || 0, corrections: _aligned.stats.corrections, correctionCount: _aligned.stats.correctionCount });
      }
      const chosen = _winner === 'tesseract' ? { source: 'tesseract', text: _aligned ? _aligned.text : tText } : { source: 'vision', text: vText };
      // #G (2026-07-05): the 7/5 book run shipped "should be reserved reserved for" — the winning engine
      // had echoed a word at a printed line wrap, and the ground truth carried it into the sentence
      // restorer verbatim. Collapse an adjacent duplicate token in the WINNING text only when the OTHER
      // engine's read of the same page lacks that doubled bigram (a legitimate "had had" is seen by both);
      // disclosed downstream via dupeCollapses — never silent.
      {
        const _ddRef = _winner === 'tesseract' ? vText : tText;
        const _dd = _collapseAdjacentDupes(chosen.text, _ddRef);
        if (_dd.collapsed.length) {
          chosen.text = _dd.text;
          _dupeCollapses.push({ pageNum: _pn, words: _dd.collapsed });
          warnLog('[OCR Reconcile] page ' + _pn + ': collapsed ' + _dd.collapsed.length + ' adjacent duplicate token(s) — the echo is absent from the other engine\'s read');
        }
      }
      // H-5's scanned half (2026-07-13): the text-layer path repairs multi-column
      // reading order at extraction; the OCR path relied on Tesseract's internal
      // layout analysis, which interleaves columns on real worksheets/newsletters.
      // When TESSERACT won (its boxes describe the winning text), run the boxes
      // through the same column detector; the helper is doubly conservative
      // (identical word multiset + materially-different order required), so
      // single-column, table, and already-correct pages keep the engine text
      // byte-for-byte. Disclosed via columnReorders — never silent.
      if (_winner === 'tesseract' && tPage && Array.isArray(tPage.words) && tPage.words.length) {
        try {
          const _cr = _alloColumnReorderOcrText(_aligned ? _aligned.words : tPage.words, chosen.text);
          if (_cr) {
            chosen.text = _cr.text;
            _columnReorders.push({ pageNum: _pn, columns: _cr.columns });
            warnLog('[OCR Reconcile] page ' + _pn + ': rebuilt reading order column-aware (' + _cr.columns + ' columns detected; Tesseract had interleaved them)');
          }
        } catch (_) {}
      }
      // Carry the Tesseract word boxes + page dims through reconciliation (Vision has
      // none). These are text+position PAIRS from Tesseract, used to draw a positioned
      // searchable layer — independent of which engine's TEXT won the length contest.
      const _tp = tPage || {};
      merged.push({ pageNum: _pn, text: chosen.text, source: chosen.source,
        words: _aligned ? _aligned.words : (Array.isArray(_tp.words) && _tp.words.length ? _tp.words : null),
        pageW: (typeof _tp.pageW === 'number' ? _tp.pageW : null),
        pageH: (typeof _tp.pageH === 'number' ? _tp.pageH : null),
        viewportTransform: (Array.isArray(_tp.viewportTransform) ? _tp.viewportTransform : null) });
      // B5: flag a page whose WINNING OCR is low-confidence — especially the all-Tesseract case (Vision
      // empty), where the quality-override above is skipped (it needs BOTH engines) so a garbled page
      // would otherwise ship unflagged. Vision has no per-word confidence, so we can only assess
      // Tesseract-won pages; mean Tesseract confidence <60 (clean prose is ~85-95) → flag for review.
      const _winConf = _winner === 'tesseract' ? _meanConf(tPage) : null;
      if (_visionCorroborated && _aligned.stats.residualLowConf > 0.15) {
        // The page TEXT is the corroborated Vision reading, but this much unresolved low-confidence
        // Tesseract text remains in the searchable layer drawn from the boxes: the hidden text needs review.
        lowConfidence.push({ pageNum: _pn, confidence: Math.round((1 - _aligned.stats.residualLowConf) * 100) });
      } else if (chosen.text && _winConf != null && _winConf < 60) {
        lowConfidence.push({ pageNum: _pn, confidence: Math.round(_winConf) });
      } else if (chosen.text && _ocrJunk(chosen.text) >= 0.6) {
        // Engine-AGNOSTIC net: Vision-won / all-Vision pages have no per-word confidence, so a page
        // whose CHOSEN text is mostly non-alphanumeric (symbol-soup OCR) would escape the check above.
        // Conservative 0.6 floor (clean prose ~0.05-0.15; even symbol-heavy math rarely >0.5) avoids
        // STEM false-positives; pseudo-confidence keeps the {pageNum,confidence} shape the banner reads.
        lowConfidence.push({ pageNum: _pn, confidence: Math.round((1 - _ocrJunk(chosen.text)) * 100) });
      } else if (chosen.text) {
        // Accuracy net (2026-06-30): letter-shaped garble ("lke"/"rnodern"/"tlie") that BOTH the
        // confidence net (Tesseract-only) and the junk-ratio net (symbol density) miss — flag a page
        // whose CHOSEN text estimates as POOR OCR quality so it surfaces in the review banner.
        // Pseudo-confidence = the accuracy score, keeping the {pageNum,confidence} shape. Fail-soft.
        try {
          const _chAcc = _alloOcrAccuracy(chosen.text);
          if (_chAcc && _chAcc.band === 'poor' && typeof _chAcc.score === 'number') lowConfidence.push({ pageNum: _pn, confidence: _chAcc.score });
        } catch (_) {}
      }
      // Compare actual readings, not their lengths. Missing-engine text is
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
      }
    }
    // #F (2026-07-05): strip repeated page-edge running heads/folios BEFORE the join — here, where page
    // boundaries still exist. The 7/5 test showed folios riding INSIDE running-head lines ("192 Appendix E",
    // "Consumer-Responsive Report Writing 89") that no whole-line-number strip can catch; they polluted the
    // ground truth -> false "3 numbers changed (90, 192, 193)" alarms + a blocked hyphen fusion (the
    // "ated-in" orphan). Repetition across the MAJORITY of pages is the detector (H4 2026-07-09: the
    // original >=2-page rule deleted repeated CONTENT headings like "Chapter 3"/"Chapter 7").
    const _edge = _stripPageEdgeArtifacts(merged.map(p => p.text));
    // Every accepted record represents one physical page. Never replace this union
    // with a single engine blob: that can erase a page the other engine recovered.
    const _fullText = _edge.texts.filter(Boolean).join('\n\n');
    return { pages: merged, disagreements, lowConfidence, fullText: _fullText, detectedFolios: _edge.folios, strippedEdgeLines: _edge.strippedLines || [], dupeCollapses: _dupeCollapses, columnReorders: _columnReorders, visionAlignments: _visionAlignments };
  };

  // Lazy-load mammoth.js for DOCX text extraction.
  // (2026-09-06) Was a lone cdnjs script tag: one blocked host silently killed the whole DOCX
  // lane (the same class the axe sentinel guards against). Now the shared mirror chain, with
  // the first-party copy first (vendored at the repo root like the accessibility engines), the
  // failure memo and the error-event fail-over. The marker attribute is unchanged.
  const ensureMammothLoaded = async () => {
    if (window.mammoth) return;
    const ok = await _loadCdnScript('mammoth', [
      'https://alloflow-cdn.pages.dev/mammoth/1.6.0/mammoth.browser.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
      'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
    ], () => !!window.mammoth);
    if (!ok) throw new Error('mammoth load failed (all CDN sources failed)');
  };

  // Lazy-load jszip (already loaded in main app; this is a safety net) — same chain as mammoth.
  const ensureJsZipLoaded = async () => {
    if (window.JSZip) return;
    const ok = await _loadCdnScript('jszip', [
      'https://alloflow-cdn.pages.dev/jszip/3.10.1/jszip.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    ], () => !!window.JSZip);
    if (!ok) throw new Error('jszip load failed (all CDN sources failed)');
  };

  const _base64ToBytes = (base64) => _b64ToBytes(base64); // delegate so DOCX/PPTX decode inherits the _MAX_PDF_BYTES cap

  // Extract text from a DOCX via mammoth (primary) or jszip+XML (fallback for air-gap)
  // 2026-06-07: section-marker convention for DOCX/PPTX extraction. Every
  // augmented section (header/footer/notes/comments/footnotes/master/layout/
  // chart/diagram) is wrapped in <<<ALLO_SECTION:KIND[:ID]>>>...<<<ALLO_SECTION:END>>>
  // so downstream prompts can distinguish body text from speaker notes /
  // teacher-only context, AND the integrity diff knows to strip these markers
  // before measuring coverage. Triple-angle sentinel is uncommon enough that
  // AI rewrite usually preserves it; loss is non-fatal because content is
  // still in the text body, just no longer audience-tagged.
  const _ALLO_SECTION_OPEN = (kind, id) => '<<<ALLO_SECTION:' + kind + (id != null ? ':' + id : '') + '>>>';
  const _ALLO_SECTION_CLOSE = '<<<ALLO_SECTION:END>>>';
  const _ALLO_MARKER_RE = /<<<ALLO_SECTION:[^>]+>>>\n?/g;

  // ── Office media extraction (2026-06-11) ──
  // Embedded images in DOCX/PPTX were silently DROPPED at extraction — only
  // their descr alt text survived (as [Image: …] markers). This collects the
  // actual bytes as data URLs so images ride the remediation (aiFixChunked
  // already strips/restores data-URL srcs via __IMG_DATA_N__ placeholders)
  // and land in every export. Honesty rules: EMF/WMF (browsers can't render
  // them) and oversize images degrade to alt-only entries WITH the reason;
  // caps: 2.5 MB per image, 10 MB total per document.
  const _OFFICE_IMG_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };
  // #17 (ChatGPT review 2026-07-10): OOXML decompression budgets. The 200 MB upload cap measures
  // COMPRESSED input — a zip-bomb-shaped DOCX/PPTX can declare orders of magnitude more and the
  // old flow paid the full inflation before any check. JSZip's central directory carries each
  // entry's DECLARED uncompressed size without inflating anything, so budgets are enforced first.
  // A violation is a TYPED error (isArchiveLimit) with a teacher-actionable message, not a generic
  // extraction failure. Declared sizes can lie, so downstream per-part caps still hold.
  const _OOXML_MAX_ENTRIES = 2000;
  const _OOXML_MAX_ENTRY_BYTES = 64 * 1024 * 1024;
  const _OOXML_MAX_TOTAL_BYTES = 256 * 1024 * 1024;
  const _OOXML_MAX_COMPRESSION_RATIO = 100;
  const _OOXML_XML_PART_MAX_BYTES = 16 * 1024 * 1024;
  const _OOXML_RELS_PART_MAX_BYTES = 4 * 1024 * 1024;
  const _OOXML_INFLATE_TIMEOUT_MS = 20000;
  const _ooxmlLimitError = (reason, label) => {
    const e = new Error('This ' + (label || 'Office') + ' file exceeds AlloFlow’s decompression safety limits: ' + reason + '. If this is a real document, re-save it in ' + (label === 'PowerPoint' ? 'PowerPoint' : 'Word') + ' (File → Save As) to normalize it, or export it to PDF and upload that instead.');
    e.isArchiveLimit = true;
    return e;
  };
  const _ooxmlDeclaredSize = (f) => {
    const raw = f && f._data && f._data.uncompressedSize;
    return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
  };
  const _ooxmlGuardArchive = (zip, compressedBytes, label) => {
    let reason = null;
    let entries = 0, total = 0, maxEntry = 0, unreadable = 0;
    try {
      if (!zip || typeof zip.forEach !== 'function') reason = 'its central directory could not be inspected safely';
      else {
        zip.forEach((_, f) => {
          if (!f || f.dir) return;
          entries++;
          const declared = _ooxmlDeclaredSize(f);
          if (declared === null) { unreadable++; return; }
          total += declared;
          if (!Number.isSafeInteger(total)) unreadable++;
          if (declared > maxEntry) maxEntry = declared;
        });
        const compressed = Number(compressedBytes);
        if (!reason && (!Number.isSafeInteger(compressed) || compressed <= 0)) reason = 'its compressed byte length is unavailable';
        else if (!reason && unreadable > 0) reason = unreadable + ' internal file(s) have missing or unreadable declared sizes';
        else if (!reason && entries < 1) reason = 'it contains no readable file entries';
        else if (!reason && entries > _OOXML_MAX_ENTRIES) reason = 'the archive declares ' + entries.toLocaleString() + ' internal files (limit ' + _OOXML_MAX_ENTRIES.toLocaleString() + ')';
        else if (!reason && maxEntry > _OOXML_MAX_ENTRY_BYTES) reason = 'a single internal file declares ' + Math.round(maxEntry / 1048576) + ' MB uncompressed (limit ' + Math.round(_OOXML_MAX_ENTRY_BYTES / 1048576) + ' MB)';
        else if (!reason && total > _OOXML_MAX_TOTAL_BYTES) reason = 'the archive declares ' + Math.round(total / 1048576) + ' MB uncompressed in total (limit ' + Math.round(_OOXML_MAX_TOTAL_BYTES / 1048576) + ' MB)';
        else if (!reason && total / compressed > _OOXML_MAX_COMPRESSION_RATIO) reason = 'its compression ratio is ' + Math.round(total / compressed) + ':1 (limit ' + _OOXML_MAX_COMPRESSION_RATIO + ':1) — zip-bomb shaped';
      }
    } catch (e) {
      if (e && e.isArchiveLimit) throw e;
      reason = 'its central-directory size metadata could not be read safely';
    }
    if (reason) throw _ooxmlLimitError(reason, label);
    return { entries, total, maxEntry };
  };
  const _ooxmlInflateBytes = async (file, maxBytes, label) => {
    const cap = Math.max(1, Math.floor(Number(maxBytes) || 0));
    const declared = _ooxmlDeclaredSize(file);
    if (declared === null) throw _ooxmlLimitError((label || 'an internal part') + ' has no trustworthy declared size', 'Office');
    if (declared > cap) throw _ooxmlLimitError((label || 'an internal part') + ' declares ' + Math.round(declared / 1048576) + ' MB (per-part limit ' + Math.round(cap / 1048576) + ' MB)', 'Office');
    if (file && typeof file.internalStream === 'function') {
      return new Promise((resolve, reject) => {
        let stream = null, settled = false, total = 0;
        const chunks = [];
        const finishError = (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try { if (stream && typeof stream.pause === 'function') stream.pause(); } catch (_) {}
          reject(error && error.isArchiveLimit ? error : _ooxmlLimitError((label || 'an internal part') + ' could not be inflated safely', 'Office'));
        };
        const timer = setTimeout(() => finishError(_ooxmlLimitError((label || 'an internal part') + ' exceeded the ' + Math.round(_OOXML_INFLATE_TIMEOUT_MS / 1000) + ' second inflate limit', 'Office')), _OOXML_INFLATE_TIMEOUT_MS);
        try {
          stream = file.internalStream('uint8array');
          stream.on('data', (chunk) => {
            if (settled) return;
            const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk || 0);
            total += bytes.byteLength;
            if (total > cap) { finishError(_ooxmlLimitError((label || 'an internal part') + ' inflated beyond its ' + Math.round(cap / 1048576) + ' MB limit', 'Office')); return; }
            chunks.push(bytes.slice());
          });
          stream.on('error', finishError);
          stream.on('end', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            const out = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
            resolve(out);
          });
          stream.resume();
        } catch (error) { finishError(error); }
      });
    }
    const bytes = await file.async('uint8array');
    const out = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
    if (out.byteLength > cap) throw _ooxmlLimitError((label || 'an internal part') + ' inflated beyond its ' + Math.round(cap / 1048576) + ' MB limit', 'Office');
    return out;
  };
  const _ooxmlBytesToBase64 = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  };
  const _ooxmlInflatePart = async (file, type, maxBytes, label) => {
    const bytes = await _ooxmlInflateBytes(file, maxBytes, label);
    if (type === 'base64') return _ooxmlBytesToBase64(bytes);
    if (type === 'uint8array') return bytes;
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  };  const _officeMediaFromPart = async (zip, relsPath, partXml, resolveTarget, slideNum, budget) => {
    const out = [];
    try {
      const relsFile = zip.file(relsPath);
      if (!relsFile) return out;
      const relsXml = await _ooxmlInflatePart(relsFile, 'string', _OOXML_RELS_PART_MAX_BYTES, relsPath);
      const relMap = {};
      const _relRe = /<Relationship\b([^>]+)\/?>/gi;
      let rm;
      while ((rm = _relRe.exec(relsXml)) !== null) {
        const attrs = rm[1];
        const idM = attrs.match(/\bId\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
        const tgtM = attrs.match(/\bTarget\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
        if (idM && tgtM) relMap[idM[1] || idM[2]] = tgtM[1] || tgtM[2];
      }
      const _blipRe = /r:embed\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
      const hits = [];
      let bm;
      while ((bm = _blipRe.exec(partXml)) !== null && hits.length < 60) hits.push({ rid: bm[1] || bm[2], idx: bm.index });
      // #10 (2026-07-03): the 60-image cap dropped images 61+ SILENTLY (unlike the size/EMF/budget skips
      // below). If the loop exited on the cap, bm holds the consumed-but-unpushed 61st blip — disclose it.
      const _cappedAt60 = hits.length >= 60 && bm !== null;
      const _xmlDecode = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
      for (let _hi = 0; _hi < hits.length; _hi++) {
        const hit = hits[_hi];
        const target = relMap[hit.rid];
        if (!target || !/media[\\/]/i.test(target)) continue;
        // Alt: the nearest descr= BEFORE the blip (docPr/cNvPr precede it in both OOXML formats),
        // falling back to title= when descr is absent/empty.
        // #8 (2026-07-03): CLAMP the look-back to AFTER the previous blip, so an image with no descr of
        // its own can't STEAL the previous image's alt out of the 1200-char window. 'Picture N' auto-names
        // don't count as alt.
        const _prevBlipIdx = _hi > 0 ? hits[_hi - 1].idx : -1;
        const before = partXml.slice(Math.max(0, hit.idx - 1200, _prevBlipIdx + 1), hit.idx);
        const descrs = before.match(/\bdescr\s*=\s*(?:"([^"]*)"|'([^']*)')/g);
        let alt = '';
        if (descrs && descrs.length) {
          const last = descrs[descrs.length - 1].match(/\bdescr\s*=\s*(?:"([^"]*)"|'([^']*)')/);
          alt = last ? _xmlDecode(last[1] != null ? last[1] : (last[2] || '')).trim() : '';
        }
        if (/^picture \d+$/i.test(alt)) alt = '';
        if (!alt) {
          const titles = before.match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/g);
          if (titles && titles.length) {
            const lastT = titles[titles.length - 1].match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/);
            const cand = lastT ? _xmlDecode(lastT[1] != null ? lastT[1] : (lastT[2] || '')).trim() : '';
            if (cand && !/^picture \d+$/i.test(cand)) alt = cand;
          }
        }
        const path = resolveTarget(target);
        const f = path && zip.file(path);
        if (!f) continue;
        const ext = (path.split('.').pop() || '').toLowerCase();
        const mime = _OFFICE_IMG_MIME[ext];
        if (!mime) { out.push({ alt, slideNum, skipped: true, reason: ext.toUpperCase() + ' format (not web-renderable)' }); continue; }
        // #17: check the DECLARED size BEFORE inflating — the old order paid the full decompression
        // + base64 expansion just to discard the result. Headers can lie, so the post-decode checks
        // below remain the authoritative gate.
        const _declared = _ooxmlDeclaredSize(f);
        if (_declared > 2.5 * 1024 * 1024) { out.push({ alt, slideNum, skipped: true, reason: 'too large (' + (_declared / 1048576).toFixed(1) + ' MB)' }); continue; }
        if (_declared > 0 && budget.used + _declared > 10 * 1024 * 1024) { out.push({ alt, slideNum, skipped: true, reason: 'document image budget (10 MB) reached' }); continue; }
        const b64img = await _ooxmlInflatePart(f, 'base64', 2.5 * 1024 * 1024, path);
        const rawLen = Math.floor(b64img.length * 3 / 4);
        if (rawLen > 2.5 * 1024 * 1024) { out.push({ alt, slideNum, skipped: true, reason: 'too large (' + (rawLen / 1048576).toFixed(1) + ' MB)' }); continue; }
        if (budget.used + rawLen > 10 * 1024 * 1024) { out.push({ alt, slideNum, skipped: true, reason: 'document image budget (10 MB) reached' }); continue; }
        budget.used += rawLen;
        out.push({ alt, slideNum, src: 'data:' + mime + ';base64,' + b64img });
      }
      if (_cappedAt60) out.push({ alt: '', slideNum, skipped: true, reason: 'more than 60 images in this part — images beyond the first 60 were not extracted' });
    } catch (_) { /* media collection is additive — never fail extraction over it */ }
    return out;
  };

  // DOM-walker for OOXML paragraph/text content. Falls back to regex on parse
  // error (failure_mode #1 — never lose the whole file because of XML issues).
  const _ooxmlExtractPart = async (zipFile, paragraphTag, textTag, namespaceURI) => {
    if (!zipFile) return '';
    let xml = '';
    try { xml = await _ooxmlInflatePart(zipFile, 'string', _OOXML_XML_PART_MAX_BYTES, 'OOXML XML part'); } catch (e) { if (e && e.isArchiveLimit) throw e; return ''; }
    if (!xml) return '';
    try {
      const xdoc = new DOMParser().parseFromString(xml, 'text/xml');
      const pErr = xdoc.getElementsByTagName('parsererror');
      if (pErr && pErr.length) throw new Error('xml-parse-error');
      const paras = namespaceURI
        ? xdoc.getElementsByTagNameNS(namespaceURI, paragraphTag)
        : xdoc.getElementsByTagName(paragraphTag);
      const out = [];
      for (let i = 0; i < paras.length; i++) {
        const p = paras[i];
        const ts = namespaceURI
          ? p.getElementsByTagNameNS(namespaceURI, textTag)
          : p.getElementsByTagName(textTag);
        let s = '';
        for (let j = 0; j < ts.length; j++) s += (ts[j].textContent || '');
        if (s.trim()) out.push(s);
      }
      return out.join('\n');
    } catch (_pe) {
      // Regex fallback (the legacy path), narrowed to this file only.
      try {
        // #7 (2026-07-03): OOXML tags are NAMESPACED (<w:p>/<w:t>, <a:p>/<a:t>) but callers pass the bare
        // local name ('p'/'t'), so the old '<p[\s>]' matched nothing and this "never lose the file"
        // fallback returned '' — silently dropping the part on the exact DOMParser failure it exists to
        // survive. Tolerate an optional namespace prefix.
        const _nsp = '(?:[A-Za-z0-9]+:)?';
        const tagOpen = '<' + _nsp + paragraphTag + '[\\s>]';
        const tagClose = '<\\/' + _nsp + paragraphTag + '>';
        const paraRe = new RegExp(tagOpen + '[\\s\\S]*?' + tagClose, 'g');
        const textRe = new RegExp('<' + _nsp + textTag + '[^>]*>([\\s\\S]*?)<\\/' + _nsp + textTag + '>', 'g');
        const matches = xml.match(paraRe) || [];
        const out = [];
        for (const p of matches) {
          const parts = [];
          let m;
          textRe.lastIndex = 0;
          while ((m = textRe.exec(p)) !== null) {
            parts.push(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
          }
          if (parts.length) out.push(parts.join(''));
        }
        return out.join('\n');
      } catch (_re) { return ''; }
    }
  };

  // OOXML namespaces (W3C-stable)
  const _W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const _A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

  // H7 (deep dive 2026-07-02): deterministic HTML→markdown for the mammoth convertToHtml seed.
  // Handles the structures mammoth emits (headings, paragraphs, lists incl. nesting, tables,
  // links, blockquotes). Inline <img> elements are dropped, keeping only "[Image: alt]" — the
  // H1 Office-media splice carries the actual images with their authored alt text. Best-effort:
  // any failure returns '' and the caller falls back to extractRawText.
  const _docxHtmlToMarkdown = (html) => {
    try {
      if (!html || typeof DOMParser === 'undefined') return '';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (!doc || !doc.body) return '';
      const out = [];
      const inline = (node) => {
        let s = '';
        node.childNodes.forEach((ch) => {
          if (ch.nodeType === 3) { s += ch.textContent; return; }
          if (ch.nodeType !== 1) return;
          const tag = ch.tagName.toLowerCase();
          if (tag === 'a') {
            const href = ch.getAttribute('href') || '';
            const txt = inline(ch).trim() || href;
            s += (href && href !== '#') ? '[' + txt + '](' + href + ')' : txt;
          } else if (tag === 'img') {
            const alt = (ch.getAttribute('alt') || '').trim();
            if (alt) s += '[Image: ' + alt + ']';
          } else if (tag === 'sup' || tag === 'sub') {
            const inner = inline(ch);
            if (inner) s += '<' + tag + '>' + inner + '</' + tag + '>';
          } else if (tag === 'br') s += '\n';
          else s += inline(ch);
        });
        return s;
      };
      const walkList = (el, ordered, depth) => {
        let idx = 1;
        Array.from(el.children).forEach((li) => {
          if (li.tagName.toLowerCase() !== 'li') return;
          const nested = Array.from(li.children).filter((c) => /^(ul|ol)$/i.test(c.tagName));
          nested.forEach((nl) => li.removeChild(nl));
          out.push('  '.repeat(depth) + (ordered ? (idx + '. ') : '* ') + inline(li).replace(/\s+/g, ' ').trim());
          idx++;
          nested.forEach((nl) => walkList(nl, nl.tagName.toLowerCase() === 'ol', depth + 1));
        });
      };
      const blocks = (root) => {
        Array.from(root.children).forEach((el) => {
          const tag = el.tagName.toLowerCase();
          const hm = tag.match(/^h([1-6])$/);
          if (hm) { const t = inline(el).replace(/\s+/g, ' ').trim(); if (t) { out.push('#'.repeat(+hm[1]) + ' ' + t); out.push(''); } return; }
          if (tag === 'p') { const t = inline(el).trim(); if (t) { out.push(t); out.push(''); } return; }
          if (tag === 'ul' || tag === 'ol') { walkList(el, tag === 'ol', 0); out.push(''); return; }
          if (tag === 'table') {
            const trs = Array.from(el.querySelectorAll('tr')).filter((tr) => tr.closest('table') === el);
            const rowCols = [];
            const rows = trs.map((tr) => {
              const cells = Array.from(tr.children).filter((c) => /^(td|th)$/i.test(c.tagName));
              let colCount = 0;
              const rendered = [];
              cells.forEach((td) => {
                const cs = Math.max(1, Math.min(50, parseInt(td.getAttribute('colspan'), 10) || 1));
                colCount += cs;
                rendered.push(inline(td).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim());
                for (let k = 1; k < cs; k++) rendered.push('');
              });
              rowCols.push(colCount);
              return '| ' + rendered.join(' | ') + ' |';
            });
            if (rows.length) {
              out.push(rows[0]);
              const cols = Math.max(1, rowCols[0] || 1);
              out.push('|' + Array.from({ length: cols }).map(() => ' --- |').join(''));
              for (let ri = 1; ri < rows.length; ri++) out.push(rows[ri]);
              out.push('');
            }
            return;
          }
          if (tag === 'blockquote') { const t = inline(el).trim(); if (t) { out.push('> ' + t.replace(/\n/g, '\n> ')); out.push(''); } return; }
          if (el.children.length) { blocks(el); return; }
          const t = inline(el).trim(); if (t) { out.push(t); out.push(''); }
        });
      };
      blocks(doc.body);
      return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch (_) { return ''; }
  };

  // Wave 6 W6-4: Linearize Word Office Math (<m:oMath>) XML nodes into readable expressions so
  // Mammoth's omission of native Word equations does not silently drop STEM content.
  const _docxOmmlNodeToText = (node) => {
    if (!node) return '';
    const local = String(node.localName || node.nodeName || '').replace(/^[^:]+:/, '');
    if (local === 't') return node.textContent || '';
    const childBy = (name) => Array.from(node.children || []).find((c) => String(c.localName || c.nodeName || '').replace(/^[^:]+:/, '') === name);
    const childrenText = (el) => Array.from((el && el.children) || []).map(_docxOmmlNodeToText).join('');
    if (local === 'f') {
      const num = childrenText(childBy('num')).trim();
      const den = childrenText(childBy('den')).trim();
      return (num || den) ? `(${num})/(${den})` : '';
    }
    if (local === 'sSup') {
      const e = childrenText(childBy('e')).trim();
      const sup = childrenText(childBy('sup')).trim();
      return `${e}^(${sup})`;
    }
    if (local === 'sSub') {
      const e = childrenText(childBy('e')).trim();
      const sub = childrenText(childBy('sub')).trim();
      return `${e}_(${sub})`;
    }
    if (local === 'sSubSup') {
      const e = childrenText(childBy('e')).trim();
      const sub = childrenText(childBy('sub')).trim();
      const sup = childrenText(childBy('sup')).trim();
      return `${e}_(${sub})^(${sup})`;
    }
    if (local === 'rad') {
      const deg = childrenText(childBy('deg')).trim();
      const e = childrenText(childBy('e')).trim();
      return deg ? `root(${deg}, ${e})` : `sqrt(${e})`;
    }
    if (local === 'nary') {
      const pr = childBy('naryPr');
      let sym = '';
      if (pr) {
        const cNode = Array.from(pr.children || []).find((c) => String(c.localName || c.nodeName || '').replace(/^[^:]+:/, '') === 'chr');
        if (cNode) sym = cNode.getAttribute('m:val') || cNode.getAttribute('val') || '';
      }
      const sub = childrenText(childBy('sub')).trim();
      const sup = childrenText(childBy('sup')).trim();
      const e = childrenText(childBy('e')).trim();
      return `${sym || '∫'}${sub ? `_(${sub})` : ''}${sup ? `^(${sup})` : ''} ${e}`.trim();
    }
    if (local === 'd') {
      const dPr = childBy('dPr');
      let beg = '(', end = ')';
      if (dPr) {
        for (const c of Array.from(dPr.children || [])) {
          const ln = String(c.localName || c.nodeName || '').replace(/^[^:]+:/, '');
          if (ln === 'begChr') beg = c.getAttribute('m:val') || c.getAttribute('val') || beg;
          if (ln === 'endChr') end = c.getAttribute('m:val') || c.getAttribute('val') || end;
        }
      }
      const elems = Array.from(node.children || []).filter((c) => String(c.localName || c.nodeName || '').replace(/^[^:]+:/, '') === 'e').map(childrenText);
      return beg + elems.join(', ') + end;
    }
    if (node.children && node.children.length) {
      return Array.from(node.children).map(_docxOmmlNodeToText).join('');
    }
    return node.textContent || '';
  };

  const _docxExtractOmmlAndTextboxes = (rawDocXml, existingBodyText) => {
    const equations = [];
    const textboxes = [];
    if (!rawDocXml || typeof DOMParser === 'undefined') return { equations, textboxes };
    try {
      const parsed = new DOMParser().parseFromString(rawDocXml, 'application/xml');
      if (!parsed || parsed.querySelector('parsererror')) return { equations, textboxes };
      const bodyNorm = String(existingBodyText || '').replace(/\s+/g, ' ').trim();
      const allNodes = parsed.getElementsByTagName('*');
      for (let i = 0; i < allNodes.length; i++) {
        const el = allNodes[i];
        const ln = String(el.localName || el.nodeName || '').replace(/^[^:]+:/, '');
        if (ln === 'oMath') {
          // Skip nested oMath inside another oMath
          let p = el.parentNode;
          let nested = false;
          while (p) {
            if (String(p.localName || p.nodeName || '').replace(/^[^:]+:/, '') === 'oMath') { nested = true; break; }
            p = p.parentNode;
          }
          if (nested) continue;
          const expr = _docxOmmlNodeToText(el).replace(/\s+/g, ' ').trim();
          if (expr && !bodyNorm.includes(expr)) equations.push(expr);
        } else if (ln === 'txbxContent') {
          const paras = [];
          const pNodes = el.getElementsByTagName('*');
          for (let pi = 0; pi < pNodes.length; pi++) {
            const pn = pNodes[pi];
            if (String(pn.localName || pn.nodeName || '').replace(/^[^:]+:/, '') !== 'p') continue;
            let pTxt = '';
            const tNodes = pn.getElementsByTagName('*');
            for (let ti = 0; ti < tNodes.length; ti++) {
              const tn = tNodes[ti];
              if (String(tn.localName || tn.nodeName || '').replace(/^[^:]+:/, '') === 't') pTxt += tn.textContent || '';
            }
            pTxt = pTxt.replace(/\s+/g, ' ').trim();
            if (pTxt) paras.push(pTxt);
          }
          const tbText = paras.join('\n').trim();
          if (tbText && !bodyNorm.includes(tbText.replace(/\s+/g, ' '))) textboxes.push(tbText);
        }
      }
    } catch (_) {}
    return { equations, textboxes };
  };

  const extractDocxTextDeterministic = async (base64, opts = {}) => {
    const includeComments = !!(opts && opts.includeComments === true);
    // #17 + Wave 6 W6-4: decode base64 & parse JSZip ONCE (instead of 4x), enforcing decompression
    // budgets BEFORE mammoth or XML augmentation touches the archive.
    let _gBytes = null;
    let _gZip = null;
    try {
      await ensureJsZipLoaded();
      if (!window.JSZip) throw _ooxmlLimitError('the archive inspector is unavailable', 'Word');
      _gBytes = _base64ToBytes(base64);
      _gZip = await window.JSZip.loadAsync(_gBytes);
      _ooxmlGuardArchive(_gZip, _gBytes.length, 'Word');
      let _actualTotal = 0;
      const _gEntries = [];
      _gZip.forEach((rel, entry) => { if (entry && !entry.dir) _gEntries.push([rel, entry]); });
      for (const [_rel, _entry] of _gEntries) {
        const _remaining = Math.max(1, _OOXML_MAX_TOTAL_BYTES - _actualTotal);
        const _partCap = Math.min(_OOXML_MAX_ENTRY_BYTES, _remaining);
        const _inflated = await _ooxmlInflateBytes(_entry, _partCap, _rel);
        _actualTotal += _inflated.byteLength;
        if (_actualTotal > _OOXML_MAX_TOTAL_BYTES) throw _ooxmlLimitError('actual inflated size exceeded the total safety budget', 'Word');
        if (_gBytes.length > 0 && (_actualTotal / _gBytes.length) > _OOXML_MAX_COMPRESSION_RATIO) throw _ooxmlLimitError('actual inflated ratio is zip-bomb shaped', 'Word');
      }
    } catch (_ge) {
      const _safeError = _ge && _ge.isArchiveLimit ? _ge : _ooxmlLimitError('the archive or its declared sizes could not be inspected before extraction', 'Word');
      return { fullText: '', sourceCharCount: 0, method: 'failed', error: _safeError.message, mediaImages: [] };
    }
    // Body text via mammoth (primary path — best handling of styles/structure), reusing _gBytes.
    let bodyText = '';
    let usedMammoth = false;
    let usedMammothHtml = false;
    try {
      await ensureMammothLoaded();
      if (window.mammoth) {
        const mammothBuf = _gBytes.byteOffset === 0 && _gBytes.byteLength === _gBytes.buffer.byteLength
          ? _gBytes.buffer
          : _gBytes.slice().buffer;
        if (typeof window.mammoth.convertToHtml === 'function') {
          try {
            const _hr = await window.mammoth.convertToHtml({ arrayBuffer: mammothBuf });
            const _mdown = _docxHtmlToMarkdown((_hr && _hr.value) || '');
            if (_mdown && _mdown.trim().length > 0) { bodyText = _mdown; usedMammoth = true; usedMammothHtml = true; }
          } catch (eH) { warnLog('[DOCX Det] convertToHtml failed — falling back to raw text:', eH?.message); }
        }
        if (!bodyText && typeof window.mammoth.extractRawText === 'function') {
          const result = await window.mammoth.extractRawText({ arrayBuffer: mammothBuf });
          bodyText = (result && result.value) || '';
          if (bodyText && bodyText.length > 0) usedMammoth = true;
        }
      }
    } catch (e) {
      warnLog('[DOCX Det] mammoth failed, falling back to jszip+DOM:', e?.message);
    }
    // Augmentation: reuse _gZip (single ZIP parse) to read word/document.xml once + aux parts.
    let augmentedParts = [];
    let method = usedMammoth ? (usedMammothHtml ? 'mammoth-html' : 'mammoth') : '';
    let _docXmlRaw = '';
    let hasReviewerComments = false;
    let omittedCommentsCount = 0;
    let extractedEquations = 0;
    let extractedTextboxes = 0;
    try {
      const zip = _gZip;
      // If mammoth didn't produce body text, derive it via DOM from word/document.xml
      if (!bodyText) {
        const docFile = zip.file('word/document.xml');
        if (docFile) {
          bodyText = await _ooxmlExtractPart(docFile, 'p', 't', _W_NS);
          if (bodyText) method = 'jszip-dom';
        }
      }
      // Read word/document.xml ONCE for tracked-changes detection, OMML math, DrawingML textboxes, and media extraction.
      try {
        const _docXml = zip.file('word/document.xml');
        if (_docXml) {
          _docXmlRaw = await _ooxmlInflatePart(_docXml, 'string', _OOXML_XML_PART_MAX_BYTES, 'word/document.xml');
          if (/<w:(ins|del)\b/.test(_docXmlRaw) && typeof addToast === 'function') {
            addToast(t('toasts.docx_tracked_changes') || 'This Word file has unresolved tracked changes. AlloFlow flattens them (insertions kept, deletions dropped), which may not match your intent — accept or reject the changes in Word first for an accurate result.', 'info');
          }
          // Recover Word OMML equations (<m:oMath>) and DrawingML textboxes (<w:txbxContent>) that Mammoth omits.
          const _recovered = _docxExtractOmmlAndTextboxes(_docXmlRaw, bodyText);
          if (_recovered.equations.length) {
            extractedEquations = _recovered.equations.length;
            augmentedParts.push(_ALLO_SECTION_OPEN('EQUATIONS', null) + '\n[Mathematical equations from document]\n' + _recovered.equations.map((eq) => 'Equation: ' + eq).join('\n') + '\n' + _ALLO_SECTION_CLOSE);
          }
          if (_recovered.textboxes.length) {
            extractedTextboxes = _recovered.textboxes.length;
            augmentedParts.push(_ALLO_SECTION_OPEN('TEXTBOXES', null) + '\n' + _recovered.textboxes.join('\n\n') + '\n' + _ALLO_SECTION_CLOSE);
          }
        }
      } catch (_) {}
      // Iterate aux XML parts. Sorted for stable ordering across runs.
      const allEntries = Object.keys(zip.files).sort();
      const _readPart = async (path, kind, id) => {
        const f = zip.file(path);
        if (!f) return;
        const txt = await _ooxmlExtractPart(f, 'p', 't', _W_NS);
        if (!txt || !txt.trim()) return;
        if (kind === 'COMMENTS') {
          hasReviewerComments = true;
          const commentLines = txt.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
          if (!includeComments) {
            omittedCommentsCount = Math.max(1, commentLines.length);
            warnLog(`[DOCX Det] Excluded ${omittedCommentsCount} reviewer margin comment line(s) by default to protect internal review notes from entering student-facing output.`);
            if (typeof addToast === 'function') {
              addToast(t('toasts.docx_comments_excluded') || 'This Word file contains reviewer margin comments, which were excluded by default so internal notes do not appear in the student-facing document.', 'info');
            }
            return;
          }
        }
        const labeled = kind === 'COMMENTS'
          ? '[Reviewer margin comments — document review notes, not part of the document body]\n' + txt
          : txt;
        augmentedParts.push(_ALLO_SECTION_OPEN(kind, id) + '\n' + labeled + '\n' + _ALLO_SECTION_CLOSE);
      };
      for (const name of allEntries) {
        const hdrM = name.match(/^word\/header(\d*)\.xml$/);
        if (hdrM) { await _readPart(name, 'HEADER', hdrM[1] || '1'); continue; }
        const ftrM = name.match(/^word\/footer(\d*)\.xml$/);
        if (ftrM) { await _readPart(name, 'FOOTER', ftrM[1] || '1'); continue; }
        if (name === 'word/footnotes.xml') { if (!usedMammothHtml) await _readPart(name, 'FOOTNOTES', null); continue; }
        if (name === 'word/endnotes.xml') { if (!usedMammothHtml) await _readPart(name, 'ENDNOTES', null); continue; }
        if (name === 'word/comments.xml') { await _readPart(name, 'COMMENTS', null); continue; }
      }
    } catch (e) {
      const msg = e?.message || '';
      if (e && e.isArchiveLimit) return { fullText: '', sourceCharCount: 0, method: 'failed', error: msg, mediaImages: [] };
      warnLog('[DOCX Det] augmentation pass failed:', msg);
      if (/password|encrypted/i.test(msg) && typeof addToast === 'function') addToast(t('toasts.docx_appears_password_protected_using'), 'info');
      else if (/invalid|corrupt/i.test(msg) && typeof addToast === 'function') addToast(t('toasts.docx_partly_unreadable') || 'Parts of this Word file could not be read (it may be corrupted) — headers, footnotes, or comments may be missing from the result.', 'info');
    }
    // Embedded images (word/media/* via document.xml.rels) — reuse _gZip and _docXmlRaw.
    let mediaImages = [];
    try {
      if (_gZip && _docXmlRaw) {
        mediaImages = await _officeMediaFromPart(
          _gZip, 'word/_rels/document.xml.rels', _docXmlRaw,
          (tgt) => {
            let p = String(tgt || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/(?:\.\/)+/g, '/');
            if (p.charAt(0) === '/') return p.slice(1).replace(/^(\.\/)+/, '');
            const parts = ('word/' + p.replace(/^word\//i, '')).split('/');
            const norm = [];
            for (const seg of parts) {
              if (!seg || seg === '.') continue;
              if (seg === '..') { if (norm.length) norm.pop(); } else norm.push(seg);
            }
            return norm.join('/');
          },
          null, { used: 0 }
        );
      }
    } catch (_) {}
    if (!bodyText && augmentedParts.length === 0) {
      return { fullText: '', sourceCharCount: 0, method: 'failed', error: 'no readable content', mediaImages };
    }
    // Body first (so AI sees primary content order), then aux parts.
    const fullText = [bodyText, ...augmentedParts].filter(Boolean).join('\n\n');
    return {
      fullText,
      sourceCharCount: fullText.length,
      method: method || 'jszip-dom',
      augmentedParts: augmentedParts.length,
      mediaImages,
      hasReviewerComments,
      omittedCommentsCount,
      extractedEquations,
      extractedTextboxes,
    };
  };

  // PPTX extraction — speaker notes are often the ACTUAL instructional content;
  // master/layout text carries recurring footers and section titles. Per-slide
  // block packs body + notes together inside ONE <<<ALLO_SECTION:SLIDE:N>>>
  // wrapper so the AI sees them as one slide's context, not as separate dumps.
  const extractPptxTextDeterministic = async (base64) => {
    try {
      await ensureJsZipLoaded();
      if (!window.JSZip) throw new Error('jszip unavailable');
      const bytes = _base64ToBytes(base64);
      const zip = await window.JSZip.loadAsync(bytes);
      _ooxmlGuardArchive(zip, bytes.length, 'PowerPoint'); // #17: typed archive-limit error before any part inflates
      const allNames = Object.keys(zip.files);
      const _numericSlideFiles = allNames
        .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => parseInt(a.match(/slide(\d+)\.xml/)[1], 10) - parseInt(b.match(/slide(\d+)\.xml/)[1], 10));
      let slideFiles = _numericSlideFiles;
      try {
        const presF = zip.file('ppt/presentation.xml');
        const presRelsF = zip.file('ppt/_rels/presentation.xml.rels');
        if (presF && presRelsF) {
          const presXml = await _ooxmlInflatePart(presF, 'string', _OOXML_XML_PART_MAX_BYTES, 'ppt/presentation.xml');
          const presRelsXml = await _ooxmlInflatePart(presRelsF, 'string', _OOXML_RELS_PART_MAX_BYTES, 'ppt/_rels/presentation.xml.rels');
          const relMap = new Map();
          const relRe = /<Relationship\b([^>]+)>/gi;
          let rm;
          while ((rm = relRe.exec(presRelsXml)) !== null) {
            const attrs = rm[1];
            const idM = attrs.match(/\bId=(?:"([^"]+)"|'([^']+)')/i);
            const tgtM = attrs.match(/\bTarget=(?:"([^"]+)"|'([^']+)')/i);
            if (idM && tgtM) {
              const relId = idM[1] || idM[2];
              let p = (tgtM[1] || tgtM[2]).replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/(?:\.\/)+/g, '/');
              p = p.charAt(0) === '/' ? p.slice(1).replace(/^(\.\/)+/, '') : ('ppt/' + p).replace(/ppt\/\.\.\//g, '');
              relMap.set(relId, p);
            }
          }
          const ordered = [];
          const seen = new Set();
          const sldLstM = presXml.match(/<(?:p:)?sldIdLst\b[^>]*>([\s\S]*?)<\/(?:p:)?sldIdLst>/i);
          const sldBody = sldLstM ? sldLstM[1] : presXml;
          const sldRe = /<(?:p:)?sldId\b[^>]*\br:id=(?:"([^"]+)"|'([^']+)')[^>]*>/gi;
          let sm;
          while ((sm = sldRe.exec(sldBody)) !== null) {
            const target = relMap.get(sm[1] || sm[2]);
            if (target && zip.file(target) && !seen.has(target)) {
              seen.add(target);
              ordered.push(target);
            }
          }
          if (ordered.length > 0) {
            for (const nf of _numericSlideFiles) { if (!seen.has(nf)) ordered.push(nf); }
            slideFiles = ordered;
          }
        }
      } catch (_) {}
      const notesFiles = allNames
        .filter(n => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))
        .sort((a, b) => parseInt(a.match(/notesSlide(\d+)\.xml/)[1], 10) - parseInt(b.match(/notesSlide(\d+)\.xml/)[1], 10));
      const layoutFiles = allNames.filter(n => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n)).sort();
      const masterFiles = allNames.filter(n => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(n)).sort();
      const chartFiles = allNames.filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)).sort();
      const diagramFiles = allNames.filter(n => /^ppt\/diagrams\/data\d+\.xml$/.test(n)).sort();
      const notesByNum = new Map();
      const notesByFile = new Map();
      for (const nf of notesFiles) {
        const m = nf.match(/notesSlide(\d+)\.xml/);
        const notesText = await _ooxmlExtractPart(zip.file(nf), 'p', 't', _A_NS);
        if (notesText && notesText.trim()) {
          notesByFile.set(nf, notesText);
          if (m) notesByNum.set(parseInt(m[1], 10), notesText);
        }
      }
      // #5 (2026-07-03): notesSlideK.xml is numbered by CREATION order, NOT slide order — the authoritative
      // slide->notes link is the slide's .rels (same source the media loader uses). Resolve via rels; fall
      // back to the by-number best-guess only when a slide declares no notes relationship.
      const _notesForSlide = async (sf, slideNum) => {
        try {
          const relsF = zip.file('ppt/slides/_rels/' + sf.split('/').pop() + '.rels');
          if (relsF) {
            const relsXml = await _ooxmlInflatePart(relsF, 'string', _OOXML_RELS_PART_MAX_BYTES, 'PowerPoint slide relationships');
            const rm = relsXml.match(/<Relationship\b[^>]*\bTarget\s*=\s*(?:"([^"]*notesSlide\d+\.xml)"|'([^']*notesSlide\d+\.xml)')[^>]*>/i);
            if (rm) {
              const tgt = (rm[1] || rm[2] || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/(?:\.\/)+/g, '/');
              const rawPath = tgt.charAt(0) === '/' ? tgt.slice(1) : ('ppt/slides/' + tgt);
              const norm = [];
              for (const seg of rawPath.split('/')) {
                if (!seg || seg === '.') continue;
                if (seg === '..') { if (norm.length) norm.pop(); } else norm.push(seg);
              }
              const path = norm.join('/');
              if (notesByFile.has(path)) return notesByFile.get(path);
            }
          }
        } catch (_) {}
        return notesByNum.get(slideNum) || '';
      };
      const _decodeXmlEntities = (s) => String(s || '')
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => { const cp = parseInt(hex, 16); return Number.isFinite(cp) ? String.fromCodePoint(cp) : _; })
        .replace(/&#(\d+);/g, (_, dec) => { const cp = parseInt(dec, 10); return Number.isFinite(cp) ? String.fromCodePoint(cp) : _; })
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      const slides = [];
      const mediaImages = [];
      const _mediaBudget = { used: 0 };
      for (let _sIdx = 0; _sIdx < slideFiles.length; _sIdx++) {
        const sf = slideFiles[_sIdx];
        const _fileNumM = sf.match(/slide(\d+)\.xml/i);
        const _fileNum = _fileNumM ? parseInt(_fileNumM[1], 10) : (_sIdx + 1);
        const num = _sIdx + 1;
        const slideText = await _ooxmlExtractPart(zip.file(sf), 'p', 't', _A_NS);
        const notesText = await _notesForSlide(sf, _fileNum);
        // Existing alt text (p:cNvPr descr="…"): authored accessibility data
        // that was previously DROPPED at extraction. Surface as [Image: …]
        // markers so remediation preserves the author's descriptions instead
        // of losing them (and the AI doesn't have to re-invent them).
        // 2026-06-11: the image BYTES are now also collected (per-slide rels →
        // ppt/media → data URLs); descr markers are kept only for alts that
        // did NOT attach to a collected image (non-blip shapes, skipped media)
        // so figure captions aren't duplicated as text.
        const altMarkers = [];
        let slideImgs = [];
        try {
          const slideXml = await _ooxmlInflatePart(zip.file(sf), 'string', _OOXML_XML_PART_MAX_BYTES, sf);
          try {
            slideImgs = await _officeMediaFromPart(
              zip, 'ppt/slides/_rels/' + sf.split('/').pop() + '.rels', slideXml,
              (tgt) => {
                const clean = String(tgt || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/(?:\.\/)+/g, '/');
                const rawPath = clean.charAt(0) === '/' ? clean.slice(1) : ('ppt/slides/' + clean);
                const norm = [];
                for (const seg of rawPath.split('/')) {
                  if (!seg || seg === '.') continue;
                  if (seg === '..') { if (norm.length) norm.pop(); } else norm.push(seg);
                }
                return norm.join('/');
              },
              num, _mediaBudget
            );
            for (const im of slideImgs) mediaImages.push(im);
          } catch (_) {}
          const _collectedAlts = new Set(slideImgs.map((i) => i.alt).filter(Boolean));
          const _xmlDecode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
          const _descrRe = /\bdescr="([^"]+)"/g;
          let _dm;
          while ((_dm = _descrRe.exec(slideXml)) !== null && altMarkers.length < 20) {
            const d = _xmlDecode(_dm[1]).trim();
            if (d && d.length > 1 && !/^picture \d+$/i.test(d) && !_collectedAlts.has(d)) altMarkers.push('[Image: ' + d + ']');
          }
        } catch (_) {}
        // Per-slide block packs body + notes into ONE marker so AI keeps them together.
        const blockParts = [];
        blockParts.push(_ALLO_SECTION_OPEN('SLIDE', num));
        if (slideText && slideText.trim()) blockParts.push(slideText);
        if (altMarkers.length) blockParts.push(altMarkers.join('\n'));
        if (notesText && notesText.trim()) {
          blockParts.push('[Teacher speaker notes for slide ' + num + ' — instructional context, not student-facing copy]');
          blockParts.push(notesText);
        }
        blockParts.push(_ALLO_SECTION_CLOSE);
        const block = blockParts.join('\n');
        slides.push({ slideNum: num, text: slideText, notesText, block });
      }
      // Header-level recurring content (layouts + masters): dedup-emit once at top.
      const headerParts = [];
      for (const lf of layoutFiles) {
        const txt = await _ooxmlExtractPart(zip.file(lf), 'p', 't', _A_NS);
        if (txt && txt.trim()) headerParts.push(_ALLO_SECTION_OPEN('LAYOUT', lf.match(/slideLayout(\d+)/)[1]) + '\n' + txt + '\n' + _ALLO_SECTION_CLOSE);
      }
      for (const mf of masterFiles) {
        const txt = await _ooxmlExtractPart(zip.file(mf), 'p', 't', _A_NS);
        if (txt && txt.trim()) headerParts.push(_ALLO_SECTION_OPEN('MASTER', mf.match(/slideMaster(\d+)/)[1]) + '\n' + txt + '\n' + _ALLO_SECTION_CLOSE);
      }
      // Trailing block: charts/diagrams (axis labels, SmartArt text). v1 skips
      // rels cross-ref so these are NOT linked back to their containing slide.
      const trailingParts = [];
      for (const cf of chartFiles) {
        // chart text uses <c:tx><c:rich>...<a:t>...</a:t></c:rich></c:tx> — best-effort regex with XML entity decoding
        try {
          const xml = await _ooxmlInflatePart(zip.file(cf), 'string', _OOXML_XML_PART_MAX_BYTES, cf);
          const m = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
          const txt = m.map(s => _decodeXmlEntities(s.replace(/<[^>]+>/g, ''))).filter(Boolean).join(' ').trim();
          if (txt) trailingParts.push(_ALLO_SECTION_OPEN('CHART', cf.match(/chart(\d+)/)[1]) + '\n' + txt + '\n' + _ALLO_SECTION_CLOSE);
        } catch (_) {}
      }
      for (const df of diagramFiles) {
        try {
          const xml = await _ooxmlInflatePart(zip.file(df), 'string', _OOXML_XML_PART_MAX_BYTES, df);
          const m = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
          const txt = m.map(s => _decodeXmlEntities(s.replace(/<[^>]+>/g, ''))).filter(Boolean).join(' ').trim();
          if (txt) trailingParts.push(_ALLO_SECTION_OPEN('DIAGRAM', df.match(/data(\d+)/)[1]) + '\n' + txt + '\n' + _ALLO_SECTION_CLOSE);
        } catch (_) {}
      }
      const fullText = [...headerParts, ...slides.map(s => s.block), ...trailingParts].filter(Boolean).join('\n\n');
      const notesCount = slides.filter(s => s.notesText && s.notesText.trim()).length;
      return {
        fullText,
        slides,
        mediaImages,
        slideCount: slideFiles.length,
        notesCount,
        layoutCount: layoutFiles.length,
        masterCount: masterFiles.length,
        chartCount: chartFiles.length,
        diagramCount: diagramFiles.length,
        sourceCharCount: fullText.length,
        method: 'jszip-dom',
      };
    } catch (e) {
      const msg = e?.message || '';
      warnLog('[PPTX Det] extraction failed:', msg);
      if (/password|encrypted/i.test(msg) && typeof addToast === 'function') addToast(t('toasts.pptx_appears_password_protected_using'), 'info');
      // Honest wording (deep dive 2026-07-02 H11): same as the DOCX site — there is no Vision
      // fallback for Office files; a corrupt PPTX simply can't be processed client-side.
      else if (/invalid|corrupt/i.test(msg) && typeof addToast === 'function') addToast(t('toasts.pptx_unreadable') || 'This PowerPoint file could not be read (it may be corrupted). Try exporting it to PDF and uploading that instead.', 'info');
      return { fullText: '', slides: [], slideCount: 0, sourceCharCount: 0, method: 'failed', error: msg };
    }
  };
