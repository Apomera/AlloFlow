// view_misc_panels_source.jsx — 6-component bundle (Round 7, May 2026)
//
// Bundles six small/medium panels + modals from AlloFlowANTI.txt:
//   PdfDiffViewer       (364 lines, PORTAL+IIFE) — pdf diff/fix viewer
//   GroupSessionModal   (315 lines, IIFE)        — live-session group manager
//   FluencyModePanel    (374 lines, JSX)         — fluency mode display
//   SourceGenPanel      (247 lines, JSX)         — source generation panel
//   TourOverlay         (234 lines, JSX)         — guided tour highlight overlay
//   VolumeBuilderView   (261 lines, IIFE)        — math mode 3D volume visualization
//
// All deps generated via SCOPE-AWARE enumerator. Three shape transforms:
//   - JSX:    inner JSX becomes the function's return value
//   - IIFE:   IIFE body (locals + return) becomes the function body verbatim
//   - PORTAL: function returns ReactDOM.createPortal((() => { …iife body… })(), target)
//             (preserves the original IIFE wrapping inside the createPortal call)


// Rebuild the diff's effective text with the selected chunk range [firstId, lastId] replaced by
// `replacement` (an AI-rewritten passage). Mirrors the live effective-text build (add-not-rejected
// + del-rejected + same), but emits `replacement` ONCE in place of the selected chunks. Pure +
// unit-tested; the result is then spliced into the HTML by _applyTextSurgery (coverage-guarded),
// so a bad rewrite can't silently corrupt the document.
function _spliceSelectedText(chunks, firstId, lastId, replacement) {
  if (!Array.isArray(chunks)) return replacement || '';
  let out = '', inserted = false;
  for (const c of chunks) {
    if (c.id >= firstId && c.id <= lastId) {
      if (!inserted) { out += (replacement || ''); inserted = true; }
      continue; // drop the original selected chunks' text
    }
    if (c.type === 'add') { if (!c.rejected) out += c.value; }
    else if (c.type === 'del') { if (c.rejected) out += c.value; }
    else { out += c.value; }
  }
  if (!inserted) out += (replacement || ''); // selection matched no chunk (shouldn't happen)
  return out;
}


// Owns every asynchronous Diff Apply / AI Refine operation. The document
// identity itself remains a host concern (the host token includes document
// epoch, HTML revision, and the exact accessibleHtml snapshot); this manager
// adds per-view generation and AbortController ownership so an older promise
// cannot clear, commit over, or report progress for a newer operation.
function _createPdfDiffOperationManager(controllerFactory) {
  let generation = 0;
  let active = null;
  const makeController = () => {
    if (typeof controllerFactory === 'function') return controllerFactory();
    if (typeof AbortController !== 'undefined') return new AbortController();
    const signal = { aborted: false };
    return { signal, abort: () => { signal.aborted = true; } };
  };
  const abortOwner = (owner) => {
    try { if (owner && owner.controller && typeof owner.controller.abort === 'function') owner.controller.abort(); } catch (_) {}
  };
  return {
    begin(token, kind) {
      if (active) abortOwner(active);
      const controller = makeController();
      const owner = {
        generation: ++generation,
        token,
        kind: kind || 'remarkup',
        controller,
        signal: controller && controller.signal ? controller.signal : null,
      };
      active = owner;
      return owner;
    },
    isCurrent(owner, tokenIsCurrent) {
      if (!owner || active !== owner || owner.generation !== generation || (owner.signal && owner.signal.aborted)) return false;
      return typeof tokenIsCurrent !== 'function' || tokenIsCurrent(owner.token) === true;
    },
    commit(owner, tokenIsCurrent, commitIfCurrent, updater) {
      if (!this.isCurrent(owner, tokenIsCurrent) || typeof commitIfCurrent !== 'function') return false;
      return commitIfCurrent(owner.token, updater) === true;
    },
    finish(owner) {
      if (!owner || active !== owner || owner.generation !== generation) return false;
      active = null;
      return true;
    },
    cancel(owner) {
      if (owner && active !== owner) return false;
      const target = active;
      if (!target) return false;
      active = null;
      generation += 1;
      abortOwner(target);
      return true;
    },
    getActive() {
      return active;
    },
  };
}
// ── PdfDiffViewer: PORTAL from AlloFlowANTI.txt L22149-L22512 ──
function PdfDiffViewer(props) {
  // `t` is the host's i18n translator. It was missing from this destructure
  // and from the host's prop-passing block, so 2026-06-06 the live Canvas
  // crashed with `ReferenceError: t is not defined` (at the first `t(...)`
  // call) the moment a user opened the diff viewer. Fix is two-sided: add
  // it here AND in AlloFlowANTI.txt. We also fall back to a passthrough
  // function so a stale host bundle that still doesn't pass `t` degrades
  // to labels-as-keys instead of taking down AlloFlowErrorBoundary.
  let { t } = props;
  if (typeof t !== 'function') t = (key) => key;
  const {
    _applyTextSurgery, _lastDiffFingerprintRef, addToast, applyingRemarkup,
    callGemini, capturePdfHtmlCommitToken, commitPdfFixResultIfCurrent,
    diffChunks, diffGranularity, diffLibLoading,
    diffLibReady, diffSelection, diffViewOpen, pdfFixResult,
    isPdfHtmlCommitTokenCurrent, pdfDocumentEpoch,
    setApplyingRemarkup, setDiffChunks, setDiffGranularity, setDiffSelection,
    setDiffViewOpen, setPdfFixResult, setRangeRejected, toggleDiffChunk,
    warnLog
  } = props;
  const theme = ['light', 'dark', 'contrast'].includes(props.theme) ? props.theme : 'light';
  const diffDialogRef = React.useRef(null);
  const diffCloseRef = React.useRef(null);
  const diffConfirmRef = React.useRef(null);
  const diffConfirmCancelRef = React.useRef(null);
  const diffConfirmResolveRef = React.useRef(null);
  const diffRemarkupManagerRef = React.useRef(null);
  if (!diffRemarkupManagerRef.current) diffRemarkupManagerRef.current = _createPdfDiffOperationManager();

  const [diffConfirmation, setDiffConfirmation] = React.useState(null);
  const requestDiffConfirmation = (options) => new Promise(resolve => {
    const pendingResolve = diffConfirmResolveRef.current;
    if (pendingResolve) pendingResolve(false);
    diffConfirmResolveRef.current = resolve;
    setDiffConfirmation(options);
  });
  const finishDiffConfirmation = (accepted) => {
    const resolve = diffConfirmResolveRef.current;
    diffConfirmResolveRef.current = null;
    setDiffConfirmation(null);
    if (resolve) resolve(accepted);
  };
  const captureRemarkupToken = () => {
    if (typeof capturePdfHtmlCommitToken === 'function') return capturePdfHtmlCommitToken();
    return {
      documentEpoch: pdfDocumentEpoch,
      revision: null,
      html: pdfFixResult && typeof pdfFixResult.accessibleHtml === 'string' ? pdfFixResult.accessibleHtml : null,
    };
  };
  const remarkupTokenIsCurrent = (token) => {
    if (!token || typeof token.html !== 'string') return false;
    if (typeof isPdfHtmlCommitTokenCurrent === 'function') return isPdfHtmlCommitTokenCurrent(token) === true;
    if (typeof capturePdfHtmlCommitToken === 'function') {
      const current = capturePdfHtmlCommitToken();
      return !!(current
        && current.documentEpoch === token.documentEpoch
        && current.revision === token.revision
        && current.html === token.html);
    }
    return pdfDocumentEpoch === token.documentEpoch
      && !!pdfFixResult
      && pdfFixResult.accessibleHtml === token.html;
  };
  const beginRemarkupOperation = (kind, existingToken) => {
    const token = existingToken || captureRemarkupToken();
    if (!remarkupTokenIsCurrent(token)) return null;
    const owner = diffRemarkupManagerRef.current.begin(token, kind);
    setApplyingRemarkup(true);
    return owner;
  };
  const remarkupOperationIsCurrent = (owner) => diffRemarkupManagerRef.current.isCurrent(owner, remarkupTokenIsCurrent);
  const commitRemarkupOperation = (owner, updater) => {
    // Refuse the mutation if an older host does not provide an atomic
    // document-token CAS. A no-op is safer than committing into a new file.
    if (typeof commitPdfFixResultIfCurrent !== 'function') return false;
    return diffRemarkupManagerRef.current.commit(owner, remarkupTokenIsCurrent, commitPdfFixResultIfCurrent, updater);
  };
  const finishRemarkupOperation = (owner) => {
    if (diffRemarkupManagerRef.current.finish(owner)) setApplyingRemarkup(false);
  };
  const cancelRemarkupOperation = () => {
    const cancelled = diffRemarkupManagerRef.current.cancel();
    if (cancelled || applyingRemarkup) setApplyingRemarkup(false);
    return cancelled;
  };
  const callGeminiForRemarkup = async (owner, prompt) => {
    if (!remarkupOperationIsCurrent(owner)) return null;
    try {
      const result = await callGemini(prompt, false, false, null, null, owner.signal || null);
      return remarkupOperationIsCurrent(owner) ? result : null;
    } catch (error) {
      if (!remarkupOperationIsCurrent(owner) || (owner.signal && owner.signal.aborted) || error?.name === 'AbortError') return null;
      throw error;
    }
  };

  const containDiffFocus = (event, container, onEscape) => {
    if (!event || !container) return;
    const nestedDialog = event.target?.closest?.('[role="alertdialog"]');
    if (nestedDialog && nestedDialog !== container) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (typeof onEscape === 'function') onEscape();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(container.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) { event.preventDefault(); container.focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  React.useEffect(() => {
    if (!(diffViewOpen && pdfFixResult)) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => diffCloseRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [diffViewOpen, !!pdfFixResult]);
  React.useEffect(() => {
    if (!diffConfirmation) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => diffConfirmCancelRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!diffConfirmation]);
  React.useEffect(() => {
    const active = diffRemarkupManagerRef.current.getActive();
    if (active && (!diffViewOpen || !remarkupTokenIsCurrent(active.token))) {
      diffRemarkupManagerRef.current.cancel(active);
      setApplyingRemarkup(false);
    }
  }, [diffViewOpen, pdfDocumentEpoch, pdfFixResult && pdfFixResult.accessibleHtml, setApplyingRemarkup]);
  React.useEffect(() => {
    if (diffViewOpen) return;
    const resolve = diffConfirmResolveRef.current;
    diffConfirmResolveRef.current = null;
    if (diffConfirmation) setDiffConfirmation(null);
    if (resolve) resolve(false);
  }, [diffViewOpen]);
  React.useEffect(() => () => {
    diffRemarkupManagerRef.current.cancel();
    setApplyingRemarkup(false);
    const resolve = diffConfirmResolveRef.current;
    diffConfirmResolveRef.current = null;
    if (resolve) resolve(false);
  }, [setApplyingRemarkup]);
  if (!(diffViewOpen && pdfFixResult)) return null;
  return ReactDOM.createPortal((() => {
        // When opened via "See what changed" after an Expert Workbench command, diff that COMMAND's
        // before/after (pdfFixResult._diffOverride) instead of the full source->remediated diff.
        const _ov = (pdfFixResult._diffOverride && typeof pdfFixResult._diffOverride.before === 'string') ? pdfFixResult._diffOverride : null;
        const _src = _ov ? _ov.before : (pdfFixResult.sourceText || '');
        const _fin = _ov ? _ov.after : (pdfFixResult.finalText || '');
        const _chunks = diffChunks;
        let _ins = 0, _del = 0, _same = 0;
        let _rejCount = 0, _effectiveText = '';
        const _countedPairs = new Set();
        // 2026-06-08: OCR-disagreement tagging. When both Tesseract and Vision
        // saw a token but the remediated final dropped it, that's a HIGH-
        // confidence "likely dropped inadvertently" signal. When only ONE
        // engine saw it, that's MEDIUM — could be hallucination, worth review.
        // Signal-only: we don't auto-act, just visually distinguish so the
        // user can spot real losses without combing the whole diff.
        const _ocrTess = (typeof window !== 'undefined' && window.__lastOcrTesseractText) || '';
        const _ocrVis = (typeof window !== 'undefined' && window.__lastOcrVisionText) || '';
        const _ocrEnabled = !!(_ocrTess && _ocrVis);
        const _normTok = (tk) => String(tk || '').toLowerCase().replace(/­/g, '').replace(/[^a-z0-9'-]/g, '');
        const _buildTokenSet = (s) => {
          const out = new Set();
          if (!s) return out;
          const parts = String(s).split(/\s+/);
          for (const p of parts) {
            const n = _normTok(p);
            if (n.length >= 2) out.add(n);
          }
          return out;
        };
        const _setT = _ocrEnabled ? _buildTokenSet(_ocrTess) : null;
        const _setV = _ocrEnabled ? _buildTokenSet(_ocrVis) : null;
        const _ocrTagMap = new Map();
        if (_ocrEnabled && _chunks) {
          for (const c of _chunks) {
            if (c.type !== 'del') continue;
            const toks = String(c.value || '').split(/\s+/).map(_normTok).filter(tk => tk.length >= 2);
            if (toks.length === 0) continue;
            const allT = toks.every(tk => _setT.has(tk));
            const allV = toks.every(tk => _setV.has(tk));
            if (allT && allV) _ocrTagMap.set(c.id, { ocrConfidence: 'high' });
            else if (allT) _ocrTagMap.set(c.id, { ocrConfidence: 'medium', ocrSource: 'tesseract' });
            else if (allV) _ocrTagMap.set(c.id, { ocrConfidence: 'medium', ocrSource: 'vision' });
          }
        }
        let _ocrHighCount = 0, _ocrMedCount = 0;
        const _ocrHighList = [];
        if (_ocrTagMap.size > 0 && _chunks) {
          for (const c of _chunks) {
            const tag = _ocrTagMap.get(c.id);
            if (!tag) continue;
            if (tag.ocrConfidence === 'high') { _ocrHighCount++; _ocrHighList.push({ id: c.id, value: c.value }); }
            else if (tag.ocrConfidence === 'medium') _ocrMedCount++;
          }
        }
        const _scrollToChunk = (id) => {
          try {
            const el = document.querySelector('[data-chunk-id="' + id + '"]');
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.outline = '3px solid #f59e0b';
            el.style.outlineOffset = '2px';
            setTimeout(() => { try { el.style.outline = ''; el.style.outlineOffset = ''; } catch (_) {} }, 1500);
          } catch (_) {}
        };
        if (_chunks) {
          _chunks.forEach(c => {
            if (c.type === 'add') {
              _ins += (c.count || 1);
              if (c.rejected) {
                if (c.pairId && _countedPairs.has(c.pairId)) { /* already counted */ }
                else { _rejCount++; if (c.pairId) _countedPairs.add(c.pairId); }
              } else {
                _effectiveText += c.value;
              }
            } else if (c.type === 'del') {
              _del += (c.count || 1);
              if (c.rejected) {
                if (c.pairId && _countedPairs.has(c.pairId)) { /* already counted */ }
                else { _rejCount++; if (c.pairId) _countedPairs.add(c.pairId); }
                _effectiveText += c.value;
              }
            } else {
              _same += (c.count || 1);
              _effectiveText += c.value;
            }
          });
        }
        const _onTryGranularityChange = async (g) => {
          if (g === 'chars') {
            const combined = (_src.length || 0) + (_fin.length || 0);
            const CHARS_GUARD_THRESHOLD = 20000; // ~8-10 PDF pages
            if (combined > CHARS_GUARD_THRESHOLD) {
              const approxSec = Math.round((combined * combined) / 1e9);
              const accepted = await requestDiffConfirmation({
                title: 'Use character-level comparison?',
                message: `This document contains ${combined.toLocaleString()} characters. Character comparison may freeze the browser for about ${Math.max(5, approxSec)} seconds or longer. Words or Sentences will be faster.`,
                confirmLabel: 'Use characters',
                cancelLabel: 'Keep current view'
              });
              if (!accepted) return;
            }
          }
          if (_chunks && _chunks.some(c => c.rejected)) {
            const accepted = await requestDiffConfirmation({
              title: 'Reset rejected changes?',
              message: 'Changing comparison granularity will reset every rejected change in this diff.',
              confirmLabel: 'Change and reset',
              cancelLabel: 'Keep rejections'
            });
            if (!accepted) return;
          }
          setDiffGranularity(g);
          setDiffSelection(null);
        };
        const _undoAllRejections = () => {
          setDiffChunks(prev => prev ? prev.map(c => c.rejected ? { ...c, rejected: false } : c) : prev);
          setDiffSelection(null);
        };
        const _onDiffMouseUp = () => {
          try {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) { setDiffSelection(null); return; }
            const startEl = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
            const endEl = sel.focusNode?.nodeType === 3 ? sel.focusNode.parentElement : sel.focusNode;
            const startChunk = startEl?.closest?.('[data-chunk-id]');
            const endChunk = endEl?.closest?.('[data-chunk-id]');
            if (!startChunk || !endChunk) { setDiffSelection(null); return; }
            const firstId = parseInt(startChunk.getAttribute('data-chunk-id'), 10);
            const lastId = parseInt(endChunk.getAttribute('data-chunk-id'), 10);
            if (Number.isNaN(firstId) || Number.isNaN(lastId)) { setDiffSelection(null); return; }
            if (firstId === lastId) { setDiffSelection(null); return; }
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setDiffSelection({
              firstId: Math.min(firstId, lastId),
              lastId: Math.max(firstId, lastId),
              anchorX: rect.left + rect.width / 2,
              anchorY: rect.top,
            });
          } catch (e) { setDiffSelection(null); }
        };
        const _applyAndExport = async () => {
          if (!_chunks || _rejCount === 0 || applyingRemarkup) return;
          const _remarkupOwner = beginRemarkupOperation('apply');
          if (!_remarkupOwner) return;
          try {
            const _prevHtml = _remarkupOwner.token.html;
            const _prevFinal = pdfFixResult?.finalText || '';
            let newHtml = null;
            let surgeryCoverage = 0;
            let surgeryFailReason = '';
            try {
              const surg = _applyTextSurgery(_prevHtml, _effectiveText);
              if (surg && surg.html) {
                newHtml = surg.html;
                surgeryCoverage = surg.coverage;
                if (surg.reason) surgeryFailReason = surg.reason;
                if (surgeryCoverage < 0.95) {
                  warnLog('[Diff] Surgery coverage below threshold:', Math.round(surgeryCoverage * 100) + '%', '— falling back to Gemini');
                  newHtml = null;
                  surgeryFailReason = 'coverage-low-' + Math.round(surgeryCoverage * 100);
                }
              }
            } catch (surgErr) {
              warnLog('[Diff] Text surgery threw, falling back to Gemini:', surgErr?.message || surgErr);
              surgeryFailReason = 'surgery-error-' + (surgErr?.message || 'unknown');
            }
            if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
            let usedFallback = false;
            if (!newHtml) {
              usedFallback = true;
              const prompt =
                  `You are a WCAG 2.1 AA accessibility remediator. Below is the CURRENT accessible HTML for a document. ` +
                  `The teacher has reviewed the text and approved a revised version (APPROVED_TEXT). ` +
                  `Your job: produce a new HTML that has the same structure as CURRENT_HTML (same <img>, <table>, <figure>, <figcaption>, landmark tags, ids, alt text, class attributes, and overall DOM layout) ` +
                  `but whose TEXT content matches APPROVED_TEXT. ` +
                  `MANDATORY RULES:\n` +
                  `1. PRESERVE every <img> tag with its src, alt, and other attributes UNCHANGED.\n` +
                  `2. PRESERVE every <table>, <thead>, <tbody>, <tr>, <th>, <td> with attributes.\n` +
                  `3. PRESERVE <figure>/<figcaption>, landmarks, ids, roles.\n` +
                  `4. Do NOT add, remove, paraphrase, or reorder any words in APPROVED_TEXT beyond what's already there.\n` +
                  `5. Return ONLY the updated HTML — no commentary, no code fences.\n\n` +
                  `CURRENT_HTML:\n${_prevHtml}\n\n` +
                  `APPROVED_TEXT:\n${_effectiveText}`;
              let remarkedHtml = null;
              try {
                const raw = await callGeminiForRemarkup(_remarkupOwner, prompt);
                if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
                remarkedHtml = (raw || '').replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
              } catch (gErr) {
                if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
                warnLog('[Diff] Gemini fallback remarkup failed:', gErr?.message || gErr);
              }
              if (remarkedHtml) {
                const _stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                const newText = _stripTags(remarkedHtml);
                const approvedTokens = _effectiveText.split(/\s+/).filter(t => t.length > 2);
                const newLower = newText.toLowerCase();
                let found = 0;
                for (const tok of approvedTokens) { if (newLower.includes(tok.toLowerCase())) found++; }
                const cov = approvedTokens.length > 0 ? found / approvedTokens.length : 1;
                if (cov >= 0.9) {
                  newHtml = remarkedHtml;
                } else {
                  warnLog('[Diff] Gemini fallback coverage too low:', Math.round(cov * 100) + '%');
                }
              }
            }
            if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
            if (newHtml) {
              const committed = commitRemarkupOperation(_remarkupOwner, prev => prev ? ({
                ...prev,
                accessibleHtml: newHtml,
                finalText: _effectiveText,
                _userEditedAt: new Date().toISOString(),
                _rejectedHunkCount: _rejCount,
                _preApplyHtml: _prevHtml,
                _preApplyFinalText: _prevFinal,
                _lastApplyPath: usedFallback ? 'gemini' : 'surgery',
                _applyVerificationFailed: null,
              }) : prev);
              if (!committed) return;
              setDiffChunks(null);
              const pathLabel = usedFallback ? 'via Gemini fallback' : 'via text surgery';
              addToast('Edits applied ' + pathLabel + '. Accessible HTML updated.', 'success');
              // The fidelity/Content-Recovery list is computed against the HTML
              // this apply just changed — tell the host to clear it so a stale
              // missing-words list isn't shown (it re-computes on next check).
              try { window.dispatchEvent(new CustomEvent('alloflow:fidelity-stale')); } catch (_) {}
            } else {
              warnLog('[Diff] Apply failed — both surgery and Gemini paths could not produce acceptable output. surgeryReason:', surgeryFailReason);
              const committed = commitRemarkupOperation(_remarkupOwner, prev => prev ? ({
                ...prev,
                finalText: _effectiveText,
                _userEditedAt: new Date().toISOString(),
                _rejectedHunkCount: _rejCount,
                _applyVerificationFailed: surgeryFailReason || 'gemini-failed',
              }) : prev);
              if (!committed) return;
              addToast('⚠ Apply kept original HTML — edits could not be committed cleanly (' + (surgeryFailReason || 'both paths failed') + '). Your text edits are recorded; structure was preserved.', 'warning');
            }
          } finally {
            finishRemarkupOperation(_remarkupOwner);
          }
        };
        const _revertLastApply = () => {
          const prev = pdfFixResult;
          if (!prev || !prev._preApplyHtml) return;
          setPdfFixResult(p => p ? ({
            ...p,
            accessibleHtml: p._preApplyHtml,
            finalText: p._preApplyFinalText || p.finalText,
            _preApplyHtml: null,
            _preApplyFinalText: null,
            _userEditedAt: null,
            _rejectedHunkCount: null,
            _lastApplyPath: null,
            _applyVerificationFailed: null,
          }) : p);
          setDiffChunks(null);
          addToast('Reverted to the state before your last Apply.', 'info');
          try { window.dispatchEvent(new CustomEvent('alloflow:fidelity-stale')); } catch (_) {}
        };
        const _canRevert = !!(pdfFixResult && pdfFixResult._preApplyHtml);
        // ── Region-targeted AI refine ── Rewrite ONLY the drag-selected passage. Fixes the Expert
        // Workbench's ordinal-index guessing: the teacher selects the exact text, the AI rewrites
        // just that span, and it's committed through the SAME coverage-guarded path as Apply
        // (surgery -> Gemini re-markup fallback) — precise, reviewable, and revertible (_preApplyHtml).
        const _refineSelection = async () => {
          if (!diffSelection || applyingRemarkup) return;
          const effVal = (c) => (c.type === 'add' ? (c.rejected ? '' : c.value) : c.type === 'del' ? (c.rejected ? c.value : '') : c.value);
          const selText = (_chunks || []).filter(c => c.id >= diffSelection.firstId && c.id <= diffSelection.lastId).map(effVal).join('').trim();
          if (!selText) { addToast(t('diff_view.refine_empty') || 'Nothing to refine in that selection.', 'info'); setDiffSelection(null); return; }
          const _selectionToken = captureRemarkupToken();
          const refinePrompt = t('diff_view.refine_prompt') || 'Refine the selected passage with AI — describe the change (e.g. "simplify to a grade-5 reading level", "fix the awkward phrasing"):';
          const instruction = (typeof window !== 'undefined' && window.AlloFlowUX && typeof window.AlloFlowUX.prompt === 'function')
            ? await window.AlloFlowUX.prompt(refinePrompt, '', {
              title: t('diff_view.refine_title') || 'Refine selected passage',
              confirmText: t('diff_view.refine_action') || 'Refine passage',
              cancelText: t('common.cancel') || 'Cancel',
              placeholder: t('diff_view.refine_placeholder') || 'Describe the change you want…',
              multiline: true,
              maxLength: 1000,
            })
            : null;
          if (!instruction || !instruction.trim()) return;
          if (!remarkupTokenIsCurrent(_selectionToken)) return;
          const _remarkupOwner = beginRemarkupOperation('refine', _selectionToken);
          if (!_remarkupOwner) return;
          try {
            const _prevHtml = _remarkupOwner.token.html;
            const _prevFinal = pdfFixResult?.finalText || '';
            let rewritten = '';
            try {
              const raw = await callGeminiForRemarkup(_remarkupOwner, 'You are a careful text editor. Rewrite ONLY the passage below per the instruction. Preserve meaning and any factual content (numbers, names, dates) unless the instruction explicitly says otherwise. Return ONLY the rewritten passage as plain text — no commentary, no quotes, no markdown.\n\nINSTRUCTION: ' + instruction.trim() + '\n\nPASSAGE:\n' + selText);
              if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
              rewritten = (raw || '').replace(/^```\w*\s*/i, '').replace(/\s*```\s*$/, '').trim();
            } catch (e) {
              if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
              warnLog('[Diff] refine callGemini failed: ' + (e && e.message || e));
            }
            if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
            if (!rewritten) { addToast(t('diff_view.refine_empty_ai') || 'AI returned nothing — selection unchanged.', 'warning'); return; }
            const newEffective = _spliceSelectedText(_chunks, diffSelection.firstId, diffSelection.lastId, rewritten);
            let newHtml = null, usedFallback = false, failReason = '';
            try {
              const surg = _applyTextSurgery(_prevHtml, newEffective);
              if (surg && surg.html && surg.coverage >= 0.95) newHtml = surg.html;
              else failReason = 'coverage-' + Math.round(((surg && surg.coverage) || 0) * 100);
            } catch (e) { failReason = 'surgery-error'; warnLog('[Diff] refine surgery threw: ' + (e && e.message || e)); }
            if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
            if (!newHtml) {
              usedFallback = true;
              try {
                const raw = await callGeminiForRemarkup(_remarkupOwner, 'You are a WCAG 2.1 AA accessibility remediator. Produce a new HTML identical in STRUCTURE to CURRENT_HTML (same <img>/<table>/<figure>/<figcaption>/landmarks/ids/alt/classes/DOM layout) but whose TEXT matches APPROVED_TEXT. Do NOT add, remove, paraphrase, or reorder words beyond APPROVED_TEXT. Return ONLY the HTML — no commentary, no code fences.\n\nCURRENT_HTML:\n' + _prevHtml + '\n\nAPPROVED_TEXT:\n' + newEffective);
                if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
                const cand = (raw || '').replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
                if (cand) {
                  const _strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                  const newText = _strip(cand);
                  const toks = newEffective.split(/\s+/).filter(x => x.length > 2);
                  let found = 0; for (const tk of toks) if (newText.includes(tk.toLowerCase())) found++;
                  if ((toks.length ? found / toks.length : 1) >= 0.9) newHtml = cand; else failReason = 'gemini-coverage-low';
                }
              } catch (e) {
                if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
                failReason = 'gemini-error';
                warnLog('[Diff] refine gemini fallback failed: ' + (e && e.message || e));
              }
            }
            if (!remarkupOperationIsCurrent(_remarkupOwner)) return;
            if (newHtml) {
              const committed = commitRemarkupOperation(_remarkupOwner, prev => prev ? ({ ...prev, accessibleHtml: newHtml, finalText: newEffective, _userEditedAt: new Date().toISOString(), _preApplyHtml: _prevHtml, _preApplyFinalText: _prevFinal, _lastApplyPath: usedFallback ? 'ai-refine-gemini' : 'ai-refine-surgery', _applyVerificationFailed: null }) : prev);
              if (!committed) return;
              setDiffChunks(null);
              setDiffSelection(null);
              addToast((t('diff_view.refine_applied') || 'AI refine applied to the selection') + ' (' + (usedFallback ? 'via Gemini' : 'via text surgery') + '). Use "Revert last apply" to undo.', 'success');
              try { window.dispatchEvent(new CustomEvent('alloflow:fidelity-stale')); } catch (_) {}
            } else {
              addToast((t('diff_view.refine_failed') || '⚠ AI refine not applied — the rewrite could not be spliced cleanly') + ' (' + failReason + '). Selection unchanged.', 'warning');
            }
          } finally { finishRemarkupOperation(_remarkupOwner); }
        };
        // Close the diff and clear any command before/after override so the NEXT open (normal Diff
        // button / integrity banner / verification accordion) shows the full source->remediated diff.
        const _closeDiff = () => {
          const cancelledRemarkup = cancelRemarkupOperation();
          if (cancelledRemarkup) {
            addToast('AI edit cancelled; no document changes were applied.', 'info');
          }
          if (pdfFixResult && pdfFixResult._diffOverride) { try { setPdfFixResult(p => p ? ({ ...p, _diffOverride: null }) : p); } catch (_) {} }
          setDiffViewOpen(false);
        };
        return (
          <div
            ref={diffDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="allo-diff-title"
            tabIndex={-1}
            onKeyDown={(event) => containDiffFocus(event, diffDialogRef.current, _closeDiff)}
            className={`fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 theme-${theme}`}
            onClick={(e) => { if (e.target === e.currentTarget) _closeDiff(); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-lg">{_ov ? '🤖' : '📝'}</span>
                <div className="flex-1 min-w-0">
                  <h2 id="allo-diff-title" className="text-sm font-black text-slate-800 truncate">{_ov ? ((t('diff_view.cmd_title') || 'What your last command changed') + (_ov.label ? ' · “' + _ov.label + '”' : '')) : (t('diff_view.title') || 'Source PDF ↔ Remediated HTML · Diff')}</h2>
                  <p className="text-[11px] text-slate-600">{_ov ? (t('diff_view.cmd_subtitle') || 'Before → after for your last Expert Workbench command. Reject a span to undo just that part, then Apply.') : (t('diff_view.subtitle') || 'Click any colored span to reject the change. Drag-select across spans to batch-reject. Del→Add paraphrase pairs toggle together.')}</p>
                </div>
                <button
                  ref={diffCloseRef}
                  type="button"
                  onClick={_closeDiff}
                  className="shrink-0 w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                  aria-label={t('diff_view.close_aria') || 'Close diff view'}
                >✕</button>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white flex-wrap">
                <div className="inline-flex rounded-lg border border-slate-400 overflow-hidden text-[11px]">
                  {['words', 'sentences', 'chars'].map(g => (
                    <button
                      key={g}
                      onClick={() => _onTryGranularityChange(g)}
                      className={`px-3 py-1 font-bold transition-colors ${diffGranularity === g ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                      aria-pressed={diffGranularity === g}
                    >{g.charAt(0).toUpperCase() + g.slice(1)}</button>
                  ))}
                </div>
                {_chunks && (
                  <div className="flex items-center gap-3 ml-2 text-[11px]">
                    <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400" /> <span className="font-bold text-emerald-700">{_ins.toLocaleString()}</span> added</span>
                    <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-200 border border-rose-400" /> <span className="font-bold text-rose-700">{_del.toLocaleString()}</span> removed</span>
                    <span className="inline-flex items-center gap-1 text-slate-600"><span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-400" /> <span className="font-bold">{_same.toLocaleString()}</span> unchanged</span>
                    {_rejCount > 0 && (
                      <span className="inline-flex items-center gap-1 ml-1 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-bold text-amber-800">
                        {_rejCount.toLocaleString()} rejected
                        <button onClick={_undoAllRejections} className="ml-1 underline hover:no-underline text-amber-900" title={t('diff_view.undo_all_tooltip') || 'Undo every rejection in this view'}>{t('diff_view.undo_all_button') || 'undo all'}</button>
                      </span>
                    )}
                    {_ocrEnabled && _ocrHighCount > 0 && (
                      <span className="inline-flex items-center gap-1 ml-1 bg-rose-200 border border-rose-500 px-1.5 py-0.5 rounded font-bold text-rose-900" title="Tokens that both Tesseract and Vision OCR saw in the source but that don't appear in the remediated final — high-confidence accidental drops.">
                        <span aria-hidden="true">✓✓</span>
                        <span className="sr-only">Both OCR engines agreed:</span>
                        <span>{_ocrHighCount.toLocaleString()} likely dropped</span>
                      </span>
                    )}
                    {_ocrEnabled && _ocrMedCount > 0 && (
                      <span className="inline-flex items-center gap-1 ml-1 bg-amber-100 border border-amber-400 px-1.5 py-0.5 rounded font-bold text-amber-800" title="Tokens that ONE OCR engine saw but the other did not — could be a hallucination by the engine that saw it, or a real miss by the other. Review.">
                        <span aria-hidden="true">✓?</span>
                        <span className="sr-only">One OCR engine only:</span>
                        <span>{_ocrMedCount.toLocaleString()} needs review</span>
                      </span>
                    )}
                  </div>
                )}
                <div className="ml-auto text-[11px] text-slate-500">
                  <span className="font-mono">{_src.length.toLocaleString()}</span> → <span className="font-mono">{_fin.length.toLocaleString()}</span> chars
                </div>
              </div>
              <div
                className="flex-1 overflow-auto p-4 bg-slate-50 relative"
                onScroll={diffSelection ? () => setDiffSelection(null) : undefined}
              >
                {!diffLibReady && diffLibLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <RefreshCw size={14} className="animate-spin" /> Loading diff engine (jsdiff)…
                  </div>
                )}
                {!diffLibReady && !diffLibLoading && (
                  <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                    Couldn't load the diff engine (network blocked?). Try re-opening the diff view, or check your connection.
                  </div>
                )}
                {/* Fallback branch — lib loaded but chunks haven't built yet
                    (cache-hit-with-null-chunks, race, or empty source/final).
                    Without this branch the modal renders blank, which the user
                    perceives as "didn't open." Provides a manual rebuild path. */}
                {diffLibReady && !_chunks && !diffLibLoading && (
                  <div className="text-sm text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
                    <RefreshCw size={14} className="animate-spin shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold mb-1">{t('diff_view.computing') || 'Computing diff…'}</div>
                      <div className="text-[12px] text-amber-700 leading-relaxed">{t('diff_view.computing_stale_hint') || 'If this persists, the source text and remediated HTML may have drifted out of sync (or the diff cache is stale).'}</div>
                    </div>
                    <button
                      onClick={() => {
                        try { _lastDiffFingerprintRef.current = null; } catch (_) {}
                        setDiffChunks(null);
                        // Touch granularity to force the build effect to re-run
                        // (no-op state change retriggers the dep array).
                        setDiffGranularity(g => g);
                      }}
                      className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-bold text-[12px]"
                      title={t('diff_view.rebuild_tooltip') || 'Clear the diff cache and recompute chunks against the current source ↔ remediated pair.'}
                    >{t('diff_view.rebuild_button') || 'Rebuild diff'}</button>
                  </div>
                )}
                {diffLibReady && _chunks && _ocrEnabled && _ocrHighList.length > 0 && (
                  <details className="mb-3 bg-rose-50 border border-rose-300 rounded-lg p-3" open>
                    <summary className="cursor-pointer font-bold text-rose-900 text-sm flex items-center gap-2">
                      <span aria-hidden="true">✓✓</span>
                      <span>{_ocrHighList.length} likely-dropped token{_ocrHighList.length === 1 ? '' : 's'} (both Tesseract & Vision OCR saw these)</span>
                    </summary>
                    <p className="text-[11px] text-rose-800 mt-2 mb-2 leading-relaxed">
                      Click any token to jump to it in the diff. Both OCR engines saw these words in the source — they're high-confidence accidental drops, not intentional remediation removals.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {_ocrHighList.slice(0, 100).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => _scrollToChunk(item.id)}
                          className="px-2 py-0.5 text-[12px] font-mono bg-white text-rose-900 border border-rose-400 rounded hover:bg-rose-100 hover:ring-1 hover:ring-rose-500"
                          title="Click to scroll to this token in the diff"
                        >{String(item.value).trim().slice(0, 40)}{String(item.value).length > 40 ? '…' : ''}</button>
                      ))}
                      {_ocrHighList.length > 100 && (
                        <span className="text-[11px] text-rose-700 self-center ml-1">…and {_ocrHighList.length - 100} more in the diff below</span>
                      )}
                    </div>
                  </details>
                )}
                {diffLibReady && _chunks && (
                  <pre
                    className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-800 bg-white rounded-lg p-4 border border-slate-400"
                    onMouseUp={_onDiffMouseUp}
                  >
                    {_chunks.map((c) => {
                      const baseCls = c.rejected ? 'opacity-40 line-through' : '';
                      if (c.type === 'add') {
                        return (
                          <ins
                            key={c.id}
                            data-chunk-id={c.id}
                            data-pair-id={c.pairId || ''}
                            onClick={() => toggleDiffChunk(c.id)}
                            className={`bg-emerald-100 text-emerald-900 no-underline rounded px-0.5 cursor-pointer hover:ring-2 hover:ring-emerald-400 ${baseCls}`}
                            title={c.rejected ? 'Rejected — click to keep' : 'Added during remediation — click to reject'}
                          >{c.value}</ins>
                        );
                      }
                      if (c.type === 'del') {
                        // OCR-disagreement tagging: HIGH = both engines saw it (bold red ring),
                        // MEDIUM = only one engine saw it (amber background). Falls through to
                        // the existing rose-100 styling for plain "removed during remediation".
                        const _ocrTag = _ocrTagMap.get(c.id);
                        const _delCls = !_ocrTag
                          ? 'bg-rose-100 text-rose-900 hover:ring-2 hover:ring-rose-400'
                          : _ocrTag.ocrConfidence === 'high'
                            ? 'bg-rose-200 text-rose-900 ring-2 ring-rose-500 font-bold hover:ring-rose-700'
                            : 'bg-amber-100 text-amber-900 ring-1 ring-amber-400 hover:ring-2 hover:ring-amber-500';
                        const _delTitle = !_ocrTag
                          ? (c.rejected ? 'Restored — click to keep removed' : 'Removed from source — click to restore')
                          : _ocrTag.ocrConfidence === 'high'
                            ? (c.rejected ? 'Restored. Both OCR engines saw this — likely dropped inadvertently. Click to keep removed.' : 'Both Tesseract AND Vision saw this in the source — likely dropped inadvertently. Click to restore.')
                            : (c.rejected ? 'Restored. Only ' + _ocrTag.ocrSource + ' saw this — could be OCR hallucination. Click to keep removed.' : 'Only ' + _ocrTag.ocrSource + ' saw this — could be OCR hallucination, please verify. Click to restore.');
                        return (
                          <del
                            key={c.id}
                            data-chunk-id={c.id}
                            data-pair-id={c.pairId || ''}
                            data-ocr-confidence={_ocrTag ? _ocrTag.ocrConfidence : ''}
                            onClick={() => toggleDiffChunk(c.id)}
                            className={`${_delCls} rounded px-0.5 cursor-pointer ${baseCls}`}
                            title={_delTitle}
                          >{c.value}{_ocrTag && _ocrTag.ocrConfidence === 'high' && (<sup aria-hidden="true" className="text-[8px] ml-0.5 text-rose-700">✓✓</sup>)}</del>
                        );
                      }
                      return (<span key={c.id} data-chunk-id={c.id}>{c.value}</span>);
                    })}
                  </pre>
                )}
                {diffLibReady && !_chunks && (
                  <div className="text-sm text-slate-600">{t('diff_view.computing') || 'Computing diff…'}</div>
                )}
                {diffSelection && (
                  <div
                    className="fixed z-[110] bg-slate-900 text-white rounded-lg shadow-2xl px-1 py-1 flex items-center gap-1 text-[11px]"
                    style={{ left: `${diffSelection.anchorX}px`, top: `${Math.max(8, diffSelection.anchorY - 44)}px`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <button
                      onClick={() => setRangeRejected(diffSelection.firstId, diffSelection.lastId, true)}
                      className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 font-bold"
                    >{t('diff_view.reject_selection') || 'Reject selection'}</button>
                    <button
                      onClick={() => setRangeRejected(diffSelection.firstId, diffSelection.lastId, false)}
                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 font-bold"
                    >{t('diff_view.keep_selection') || 'Keep selection'}</button>
                    <button
                      onClick={_refineSelection}
                      disabled={applyingRemarkup}
                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 font-bold disabled:opacity-50"
                      title={t('diff_view.refine_title') || 'Rewrite ONLY this selection with AI — precise, reviewable, revertible'}
                    >{applyingRemarkup ? '…' : (t('diff_view.refine_selection') || '✨ Refine with AI')}</button>
                    <button
                      onClick={() => setDiffSelection(null)}
                      className="px-1.5 py-1 rounded hover:bg-slate-700"
                      aria-label={t('diff_view.dismiss_toolbar_aria') || 'Dismiss toolbar'}
                    >✕</button>
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center gap-3 flex-wrap">
                <span>📚 jsdiff@5.2.0</span>
                <span className="text-slate-500">·</span>
                <span>{t('diff_view.footer_help') || 'Click spans or drag-select to edit. Pairs toggle together.'}</span>
                {/* Revert button — only rendered when there's a snapshot
                    to restore (i.e., the user has previously clicked Apply
                    on this doc). One-level undo; pressing Apply again
                    overwrites the snapshot. */}
                {_canRevert && (
                  <button
                    onClick={_revertLastApply}
                    disabled={applyingRemarkup}
                    className="ml-auto px-3 py-1.5 bg-white border border-slate-400 hover:bg-slate-100 disabled:opacity-60 text-slate-700 rounded-md font-bold inline-flex items-center gap-1.5"
                    title={t('diff_view.revert_tooltip') || 'Restore the accessible HTML to the state before your last Apply & Export'}
                  >
                    ↶ Revert last Apply
                  </button>
                )}
                {_rejCount > 0 && (
                  <button
                    onClick={_applyAndExport}
                    disabled={applyingRemarkup}
                    className={(_canRevert ? '' : 'ml-auto ') + 'px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-md font-bold inline-flex items-center gap-1.5 shadow'}
                    title={t('diff_view.apply_export_tooltip') || "Apply rejections via text surgery (preserves all markup, instant, no Gemini call). Falls back to Gemini round-trip only if surgery can't map some chunks."}
                  >
                    {applyingRemarkup ? <><RefreshCw size={12} className="animate-spin" /> Applying…</> : <>✓ Apply &amp; Export ({_rejCount})</>}
                  </button>
                )}
              </div>
            </div>
            {diffConfirmation && (
              <div role="presentation" className="fixed inset-0 z-[320] bg-slate-950/70 flex items-center justify-center p-4">
                <div ref={diffConfirmRef} role="alertdialog" aria-modal="true" aria-labelledby="allo-diff-confirm-title" aria-describedby="allo-diff-confirm-message" tabIndex={-1}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === 'Escape') { event.preventDefault(); finishDiffConfirmation(false); return; }
                    containDiffFocus(event, diffConfirmRef.current, () => finishDiffConfirmation(false));
                  }}
                  className="w-full max-w-md rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-2xl">
                  <h3 id="allo-diff-confirm-title" className="text-lg font-black text-slate-900">{diffConfirmation.title}</h3>
                  <p id="allo-diff-confirm-message" className="mt-2 text-sm leading-relaxed text-slate-700">{diffConfirmation.message}</p>
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button ref={diffConfirmCancelRef} type="button" onClick={() => finishDiffConfirmation(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">{diffConfirmation.cancelLabel || 'Cancel'}</button>
                    <button type="button" onClick={() => finishDiffConfirmation(true)} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">{diffConfirmation.confirmLabel || 'Continue'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
  })(), document.body);
}

// ── GroupSessionModal: IIFE from AlloFlowANTI.txt L20282-L20596 ──
function GroupSessionModal(props) {
  const {
    activeSessionCode, addToast, appId,
    db, doc, dragOverResourceId, draggedResourceId,
    handleAssignStudent, handleCreateGroup, handleDeleteGroup, handleSetGroupResource,
    handleSetShowGroupModalToFalse, isPushingResource, newGroupName, sessionData,
    setDragOverResourceId, setDraggedResourceId, setNewGroupName, showGroupModal,
    t, updateDoc, warnLog
  } = props;
  const groupDialogRef = React.useRef(null);
  const groupCloseRef = React.useRef(null);
  const containGroupFocus = (event) => {
    if (!event || !groupDialogRef.current) return;
    if (event.key === 'Escape') { event.preventDefault(); handleSetShowGroupModalToFalse(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(groupDialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) { event.preventDefault(); groupDialogRef.current.focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  React.useEffect(() => {
    if (!(showGroupModal && activeSessionCode && sessionData)) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => groupCloseRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [showGroupModal, activeSessionCode, !!sessionData]);
  if (!(showGroupModal && activeSessionCode && sessionData)) return null;
        const moveResourceBy = async (resId, delta) => {
            const resources = [...(sessionData.resources || [])];
            const currentIndex = resources.findIndex(r => r.id === resId);
            const targetIndex = currentIndex + delta;
            if (currentIndex < 0 || targetIndex < 0 || targetIndex >= resources.length) return;
            const [item] = resources.splice(currentIndex, 1);
            resources.splice(targetIndex, 0, item);
            try {
                const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                await updateDoc(sessionRef, { resources });
                addToast((item.title || 'Resource') + (delta < 0 ? ' moved earlier' : ' moved later'), 'success');
            } catch (err) {
                warnLog('Failed to reorder resource:', err);
                addToast(t('common.error') || 'Could not reorder resource', 'error');
            }
        };
        const handleDragStart = (e, resId) => {
            setDraggedResourceId(resId);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', resId);
        };
        const handleDragOver = (e, resId) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (resId !== draggedResourceId) {
                setDragOverResourceId(resId);
            }
        };
        const handleDragLeave = () => {
            setDragOverResourceId(null);
        };
        const handleDrop = async (e, targetResId) => {
            e.preventDefault();
            if (!draggedResourceId || draggedResourceId === targetResId) {
                setDraggedResourceId(null);
                setDragOverResourceId(null);
                return;
            }
            const resources = [...sessionData.resources];
            const draggedIndex = resources.findIndex(r => r.id === draggedResourceId);
            const targetIndex = resources.findIndex(r => r.id === targetResId);
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [draggedItem] = resources.splice(draggedIndex, 1);
                resources.splice(targetIndex, 0, draggedItem);
                try {
                    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
                    await updateDoc(sessionRef, { resources });
                    addToast(t('groups.resources_reordered') || 'Resources reordered', 'success');
                } catch (err) {
                    warnLog('Failed to reorder resources:', err);
                }
            }
            setDraggedResourceId(null);
            setDragOverResourceId(null);
        };
        const handleDragEnd = () => {
            setDraggedResourceId(null);
            setDragOverResourceId(null);
        };
        const getResourceDescription = (r) => {
            if (r.meta) return r.meta;
            try {
                if (r.type === 'glossary' && Array.isArray(r.data)) {
                    return `${r.data.length} terms`;
                }
                if (r.type === 'simplified' && typeof r.data === 'string') return `~${r.data.split(' ').length} words`;
                if ((r.type === 'quiz' || r.type === 'check-for-understanding') && Array.isArray(r.data?.questions || r.data)) return `${(r.data?.questions || r.data).length} questions`;
                if (r.type === 'faq' && Array.isArray(r.data)) return `${r.data.length} Q&A`;
                if (r.type === 'outline' && Array.isArray(r.data)) return `${r.data.length} sections`;
                if (r.type === 'timeline' && Array.isArray(r.data)) return `${r.data.length} events`;
                if (r.type === 'persona' && Array.isArray(r.data)) return `${r.data.length} personas`;
                if (r.type === 'mind-map' && r.data?.nodes) return `${r.data.nodes.length} nodes`;
                if (r.type === 'brainstorm' && Array.isArray(r.data)) return `${r.data.length} ideas`;
                if (r.type === 'adventure' && r.data?.scenes) return `${Object.keys(r.data.scenes).length} scenes`;
            } catch(e) { warnLog('Caught error:', e?.message || e); }
            return '';
        };
        const getResourceLanguage = (r) => {
            if (r.language) return r.language;
            if (r.lang) return r.lang;
            if (r.type === 'glossary' && Array.isArray(r.data) && r.data[0]?.translations) {
                const langs = Object.keys(r.data[0].translations);
                return langs.length > 0 ? langs : null;
            }
            return null;
        };
        const formatResourceDate = (r) => {
            if (r.createdAt) {
                const d = new Date(r.createdAt);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            if (r.timestamp) {
                const d = new Date(r.timestamp);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            return null;
        };
        const typeIcons = {
            quiz: '📝', 'mind-map': '🧠', glossary: '📖', image: '🖼️',
            simplify: '✨', outline: '📋', faq: '❓', 'sentence-frames': '💬',
            brainstorm: '💡', persona: '🎭', timeline: '📅', 'concept-sort': '🗂️',
            'lesson-plan': '📚', adventure: '🎮', simplified: '✨', default: '📄',
        };
        return (
        <div role="presentation" className="fixed inset-0 bg-black/90 z-[160] flex items-center justify-center p-4 animate-in fade-in duration-200 motion-reduce:animate-none" onClick={handleSetShowGroupModalToFalse} data-help-key="group_modal_container">
            <div ref={groupDialogRef} tabIndex={-1} onKeyDown={containGroupFocus} className="bg-white rounded-2xl shadow-2xl w-[95vw] h-[90vh] relative animate-in zoom-in-95 duration-200 motion-reduce:animate-none flex flex-col overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="group-session-title" aria-describedby="group-session-description">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600 p-3 rounded-xl shadow-md">
                            <Users size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 id="group-session-title" className="text-2xl font-black text-slate-800">{t('groups.modal_title')}</h2>
                            <p id="group-session-description" className="text-sm text-slate-600">{t('groups.modal_subtitle')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input aria-label={t('common.groups_new_group_placeholder')}
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder={t('groups.new_group_placeholder')}
                            className="text-sm p-3 rounded-lg border border-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-48"
                            data-help-key="group_create_input"
                        />
                        <button
                            aria-label={t('common.add')}
                            onClick={() => handleCreateGroup()}
                            disabled={!newGroupName.trim()}
                            className="bg-purple-600 text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                            data-help-key="group_create_button"
                        >
                            <Plus size={18} /> {t('groups.add_button')}
                        </button>
                    </div>
                    <button ref={groupCloseRef} type="button" onClick={handleSetShowGroupModalToFalse} className="p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-white/80 transition-colors" aria-label={t('common.close')}>
                        <X size={24}/>
                    </button>
                </div>
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 overflow-hidden">
                    <div className="lg:col-span-2 flex flex-col min-h-0" data-help-key="group_resource_library">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={16} className="text-indigo-600" />
                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">{t('groups.resource_library')}</h3>
                            <span className="text-xs text-slate-600 ml-2">({sessionData.resources?.length || 0} items)</span>
                            <span className="text-[11px] text-purple-700 ml-auto italic flex items-center gap-1">
                                <GripVertical size={12} /> {t('groups.drag_to_reorder') || 'Drag or use Move earlier/later'}
                            </span>
                        </div>
                        <div className="flex-1 bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-xl p-4 border border-indigo-100 overflow-y-auto custom-scrollbar">
                            {sessionData.resources && sessionData.resources.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3" style={{ gridAutoRows: 'min-content' }}>
                                    {sessionData.resources.map((res, index) => {
                                        const assignedGroup = sessionData.groups && Object.entries(sessionData.groups)
                                            .find(([_, g]) => g && g.resourceId === res.id);
                                        const icon = typeIcons[res.type] || typeIcons.default;
                                        const description = getResourceDescription(res);
                                        const isDragging = draggedResourceId === res.id;
                                        const isDragOver = dragOverResourceId === res.id;
                                        const language = getResourceLanguage(res);
                                        const dateStr = formatResourceDate(res);
                                        const activeSessionGroups = Object.entries(sessionData?.groups || {}).filter(([_, g]) => g !== null);
                                        return (
                                            <div
                                                key={res.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, res.id)}
                                                onDragOver={(e) => handleDragOver(e, res.id)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, res.id)}
                                                onDragEnd={handleDragEnd}
                                                className={`
                                                    relative bg-white rounded-xl p-3 border-2 shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing
                                                    ${assignedGroup ? 'border-green-300 bg-green-50/50' : 'border-slate-200 hover:border-purple-300'}
                                                    ${isDragging ? 'opacity-40 scale-95 shadow-lg' : ''}
                                                    ${isDragOver ? 'border-purple-500 bg-purple-50 scale-105 shadow-lg' : ''}
                                                `}
                                                title={res.title || 'Untitled'}
                                            >
                                                <div className="absolute top-1 right-1 text-slate-600 hover:text-slate-900">
                                                    <GripVertical size={14} />
                                                </div>
                                                <div className="absolute -top-2 -left-2 bg-slate-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                                                    {index + 1}
                                                </div>
                                                <div className="flex items-start gap-2 mb-2">
                                                    <span className="text-2xl">{icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-slate-700 truncate">{res.title || 'Untitled'}</div>
                                                        <div className="text-[11px] text-slate-600 capitalize">{res.type?.replace('-', ' ')}</div>
                                                    </div>
                                                </div>
                                                {description && (
                                                    <div className="text-[11px] text-purple-500 bg-purple-50 px-2 py-1 rounded-md mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {description}
                                                    </div>
                                                )}
                                                {(language || dateStr) && (
                                                    <div className="flex flex-wrap gap-1 mb-1">
                                                        {language && (
                                                            Array.isArray(language) ? (
                                                                language.slice(0, 5).map((lang, li) => (
                                                                    <span key={li} className="inline-flex items-center gap-0.5 text-[11px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                                                        <Globe size={8} /> {lang}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="inline-flex items-center gap-0.5 text-[11px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                                                    <Globe size={8} /> {language}
                                                                </span>
                                                            )
                                                        )}
                                                        {dateStr && (
                                                            <span className="inline-flex items-center gap-0.5 text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                                <Clock size={8} /> {dateStr}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {assignedGroup && (
                                                    <div className="mt-1 text-[11px] font-bold text-green-800 bg-green-100 px-2 py-1 rounded-md flex items-center gap-1">
                                                        <Users size={10} /> {assignedGroup[1].name}
                                                    </div>
                                                )}
                                                <div role="group" aria-label={`Reorder ${res.title || 'Untitled'}`} className="mt-2 grid grid-cols-2 gap-1">
                                                    <button type="button" onClick={() => moveResourceBy(res.id, -1)} disabled={index === 0} className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40" aria-label={`Move ${res.title || 'resource'} earlier`}>â† Earlier</button>
                                                    <button type="button" onClick={() => moveResourceBy(res.id, 1)} disabled={index === sessionData.resources.length - 1} className="rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40" aria-label={`Move ${res.title || 'resource'} later`}>Later â†’</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-600 italic">
                                    {t('groups.no_resources') || 'No resources in this session'}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col gap-5 min-h-0">
                        <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Layers size={14} /> {t('groups.active_groups')}
                            </h3>
                            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1" data-help-key="group_active_list">
                                {sessionData.groups && activeSessionGroups.map(([gid, group]) => (
                                    <div key={gid} className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-slate-700">{group.name}</span>
                                            <button onClick={() => handleDeleteGroup(gid)} className="text-red-600 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" aria-label={t('common.delete')}><X size={16}/></button>
                                        </div>
                                        <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block flex items-center gap-2">
                                            {t('groups.assign_resource_label')}
                                            {isPushingResource[gid] === 'pushing' && (
                                                <span className="flex items-center gap-1 text-[10px] text-purple-600 font-bold normal-case">
                                                    <RefreshCw size={11} className="animate-spin" /> {t('groups.pushing') || 'Pushing…'}
                                                </span>
                                            )}
                                            {isPushingResource[gid] === 'success' && (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold normal-case">
                                                    <CheckCircle2 size={11} /> {t('groups.pushed') || 'Sent'}
                                                </span>
                                            )}
                                        </label>
                                        <select aria-label={t('common.selection')}
                                            value={group.resourceId || ""}
                                            onChange={(e) => handleSetGroupResource(gid, e.target.value || null)}
                                            disabled={isPushingResource[gid] === 'pushing'}
                                            className="w-full text-sm p-2 rounded-lg border border-slate-400 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-purple-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">{t('groups.assign_resource_placeholder')}</option>
                                            {sessionData.resources && sessionData.resources.map(res => {
                                                const icon = typeIcons[res.type] || typeIcons.default;
                                                const desc = getResourceDescription(res);
                                                return (
                                                    <option key={res.id} value={res.id}>
                                                        {icon} {res.title || 'Untitled'}{desc ? ` (${desc})` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                ))}
                                {(!sessionData.groups || Object.values(sessionData.groups).filter(g => g !== null).length === 0) && (
                                    <div className="text-sm text-slate-600 italic text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">{t('groups.no_groups')}</div>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0">
                            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <UserCheck size={14} /> {t('groups.roster_assignment')}
                            </h3>
                            <div className="flex-1 bg-slate-50 rounded-xl p-3 overflow-y-auto custom-scrollbar" data-help-key="group_roster_list">
                                 {sessionData.roster && Object.entries(sessionData.roster).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(sessionData.roster).map(([uid, student]) => (
                                            <div key={uid} className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${student.connected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                                    <span className="truncate font-medium text-slate-700 text-sm" title={student.name}>{student.name}</span>
                                                </div>
                                                <select aria-label={t('common.selection')}
                                                    value={student.groupId || ""}
                                                    onChange={(e) => handleAssignStudent(uid, e.target.value)}
                                                    className="text-xs p-2 rounded-lg border border-slate-400 bg-white focus:ring-2 focus:ring-purple-300 outline-none min-w-[100px]"
                                                >
                                                    <option value="">{t('groups.unassigned')}</option>
                                                    {sessionData.groups && activeSessionGroups.map(([gid, group]) => (
                                                        <option key={gid} value={gid}>{group.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                 ) : (
                                     <div className="flex items-center justify-center h-full text-sm text-slate-600 italic">{t('session.waiting_for_students')}</div>
                                 )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end flex-shrink-0">
                    <button
                        aria-label={t('common.confirm')}
                        onClick={handleSetShowGroupModalToFalse}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-colors shadow-md flex items-center gap-2"
                    >
                        <Check size={18} /> {t('groups.done_button')}
                    </button>
                </div>
            </div>
        </div>
        );
}

// ── FluencyModePanel: JSX from AlloFlowANTI.txt L28047-L28420 ──
function FluencyModePanel(props) {
  const {
    ConfettiExplosion, FLUENCY_BENCHMARKS, calculateRunningRecordMetrics, exportFluencyCSV,
    fluencyBenchmarkGrade, fluencyBenchmarkSeason, fluencyCustomNorms, fluencyFeedback,
    fluencyModalRef, fluencyResult, fluencyStatus, fluencyTimeLimit,
    fluencyTimeRemaining, fluencyTimerVisibility, fluencyTranscript, generateFluencyScoreSheet,
    generatedContent, getBenchmarkComparison, isFluencyMode, setFluencyBenchmarkGrade,
    setFluencyBenchmarkSeason, setFluencyCustomNorms, setFluencyFeedback, setFluencyResult,
    setFluencyStatus, setFluencyTimeLimit, setFluencyTimeRemaining, setFluencyTimerVisibility,
    setFluencyTranscript, setIsFluencyMode, showFluencyConfetti, t,
    toggleFluencyRecording, applyFluencyReview, fluencyAssessments = [],
    isTeacherMode, saveFluencyReview, summarizeFluencyEvidence
  } = props;
  const [isReviewingFluency, setIsReviewingFluency] = React.useState(false);
  const [fluencyReviewDraft, setFluencyReviewDraft] = React.useState(null);

  const beginFluencyReview = () => {
    if (!fluencyResult?.wordData) return;
    setFluencyReviewDraft({
      wordData: fluencyResult.wordData.map(word => ({ ...word })),
      insertionsText: (fluencyResult.insertions || []).join(', '),
      reviewer: fluencyResult.review?.reviewer || 'Educator',
      note: fluencyResult.review?.note || ''
    });
    setIsReviewingFluency(true);
  };

  const updateFluencyReviewWord = (index, field, value) => {
    setFluencyReviewDraft(prev => {
      if (!prev) return prev;
      const wordData = prev.wordData.map((word, wordIndex) =>
        wordIndex === index ? { ...word, [field]: value } : word
      );
      return { ...prev, wordData };
    });
  };

  const commitFluencyReview = () => {
    if (!fluencyReviewDraft || typeof applyFluencyReview !== 'function') return;
    const reviewedResult = applyFluencyReview(fluencyResult, {
      wordData: fluencyReviewDraft.wordData,
      insertions: fluencyReviewDraft.insertionsText.split(',').map(word => word.trim()).filter(Boolean),
      reviewer: fluencyReviewDraft.reviewer,
      note: fluencyReviewDraft.note
    });
    if (typeof saveFluencyReview === 'function') saveFluencyReview(reviewedResult);
    else setFluencyResult(reviewedResult);
    setIsReviewingFluency(false);
    setFluencyReviewDraft(null);
  };

  if (!(isFluencyMode && generatedContent)) return null;
  return (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            {showFluencyConfetti && <div className="absolute inset-0 pointer-events-none z-[250] flex items-center justify-center"><ConfettiExplosion /></div>}
            <div
                ref={fluencyModalRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('fluency.tool_label')}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative border-4 border-rose-200 overflow-hidden flex flex-col h-[80vh]"
                data-help-key="fluency_mode_panel"
            >
                <div className="bg-rose-50 p-4 border-b border-rose-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center border border-rose-200 shadow-sm">
                             <Mic size={20} className="text-rose-700"/>
                         </div>
                         <div>
                             <h3 className="font-black text-lg text-slate-800 leading-tight">{t('fluency.title')}</h3>
                             <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('fluency.instruction')}</p>
                         </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {fluencyStatus === 'idle' && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600">{t('fluency.time_limit')}</label>
                                <select aria-label={t('common.selection')}
                                    value={fluencyTimeLimit}
                                    onChange={(e) => { setFluencyTimeLimit(parseInt(e.target.value)); setFluencyTimeRemaining(parseInt(e.target.value)); }}
                                    className="text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
                                    data-help-key="fluency_mode_time_limit"
                                >
                                    <option value={0}>{t('fluency.time_limit_none')}</option>
                                    <option value={30}>30 sec</option>
                                    <option value={60}>60 sec</option>
                                    <option value={90}>90 sec</option>
                                    <option value={120}>120 sec</option>
                                </select>
                                {fluencyTimeLimit > 0 && (
                                    <select aria-label={t('common.timer_display')}
                                        value={fluencyTimerVisibility}
                                        onChange={(e) => setFluencyTimerVisibility(e.target.value)}
                                        className="text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 ml-1"
                                    >
                                        <option value="visible">{t('math.timer_visible')}</option>
                                        <option value="hidden">{t('math.timer_hidden')}</option>
                                    </select>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => { setIsFluencyMode(false); setFluencyStatus('idle'); setFluencyTimeRemaining(fluencyTimeLimit); setIsReviewingFluency(false); setFluencyReviewDraft(null); }}
                            className="p-1.5 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label={t('fluency.close_label')}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar flex flex-col items-center">
                    {fluencyStatus === 'complete' && fluencyResult ? (
                        <div className="w-full max-w-2xl animate-in zoom-in duration-300">
                            {(() => {
                                const rrMetrics = calculateRunningRecordMetrics(fluencyResult.wordData, fluencyResult.insertions);
                                const benchmarkResult = getBenchmarkComparison(fluencyResult.wcpm, fluencyBenchmarkGrade, fluencyBenchmarkSeason, fluencyCustomNorms);
                                const levelColors = { above: 'text-green-600 bg-green-50 border-green-200', at: 'text-emerald-600 bg-emerald-50 border-emerald-200', approaching: 'text-yellow-600 bg-yellow-50 border-yellow-200', well_below: 'text-red-600 bg-red-50 border-red-200', unknown: 'text-slate-600 bg-slate-50 border-slate-200' };
                                const levelLabels = { above: t('fluency.benchmark_above'), at: t('fluency.benchmark_at'), approaching: t('fluency.benchmark_approaching'), well_below: t('fluency.benchmark_below'), unknown: '—' };
                                const readingLevelColors = { independent: 'bg-green-100 text-green-700 border-green-300', instructional: 'bg-yellow-100 text-yellow-700 border-yellow-300', frustrational: 'bg-red-100 text-red-700 border-red-300' };
                                const readingLevelLabels = { independent: t('fluency.independent'), instructional: t('fluency.instructional'), frustrational: t('fluency.frustrational') };
                                const evidenceRecords = (Array.isArray(fluencyAssessments) ? fluencyAssessments : []).slice();
                                if (!evidenceRecords.some(item => (item?.recordId || item?.id) === fluencyResult.recordId)) {
                                    evidenceRecords.push(fluencyResult);
                                }
                                const evidenceSummary = typeof summarizeFluencyEvidence === 'function'
                                    ? summarizeFluencyEvidence(evidenceRecords, { sampleSize: 3 })
                                    : null;
                                return (<>
                            <div className="flex justify-center mb-4 gap-4 flex-wrap">
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-400 text-center relative overflow-hidden">
                                    <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">{t('fluency.accuracy_score')}</div>
                                    <div className={`text-6xl font-black ${fluencyResult.accuracy >= 90 ? 'text-green-500' : fluencyResult.accuracy >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                                        {fluencyResult.accuracy}%
                                    </div>
                                    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${readingLevelColors[rrMetrics.readingLevel]}`}>
                                        {readingLevelLabels[rrMetrics.readingLevel]}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-400 text-center relative overflow-hidden animate-in zoom-in duration-300 delay-100">
                                    <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">{t('fluency.rate_label')}</div>
                                    <div className="text-6xl font-black text-indigo-600">
                                        {fluencyResult.wcpm}
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-bold uppercase tracking-wider mt-1">{t('fluency.wcpm_label')}</div>
                                    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block ${levelColors[benchmarkResult.level]}`}>
                                        {levelLabels[benchmarkResult.level]}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center gap-3 mb-4 items-center">
                                <label className="text-xs font-bold text-slate-600 uppercase">{t('fluency.benchmark_title')}</label>
                                <select aria-label={t('common.grade')} value={fluencyBenchmarkGrade} onChange={(e) => setFluencyBenchmarkGrade(e.target.value)} className="text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                    {Object.keys(FLUENCY_BENCHMARKS).map(g => (<option key={g} value={g}>{t('fluency.grade_select')} {g}</option>))}
                                    <option value="custom">{t('fluency.custom_norms') || 'Custom (Manual)'}</option>
                                </select>
                                <select aria-label={t('common.season')} value={fluencyBenchmarkSeason} onChange={(e) => setFluencyBenchmarkSeason(e.target.value)} className="text-xs font-bold border border-slate-400 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                    <option value="fall">{t('fluency.season_fall')}</option>
                                    <option value="winter">{t('fluency.season_winter')}</option>
                                    <option value="spring">{t('fluency.season_spring')}</option>
                                </select>
                                <span className="text-xs text-slate-600">{t('fluency.benchmark_target')}: {benchmarkResult.target} WCPM</span>
                            </div>
                            {fluencyBenchmarkGrade === 'custom' && (
                                <div className="flex justify-center gap-3 mb-4 items-center animate-in slide-in-from-top duration-200">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase">{t('fluency.custom_wcpm') || 'Target WCPM'}:</label>
                                    {['fall', 'winter', 'spring'].map(s => (
                                        <div key={s} className="flex flex-col items-center gap-0.5">
                                            <input
                                                type="number"
                                                min="0"
                                                max="300"
                                                value={fluencyCustomNorms[s] || ''}
                                                onChange={(e) => setFluencyCustomNorms(prev => ({ ...prev, [s]: parseInt(e.target.value) || 0 }))}
                                                className="w-16 text-center text-xs font-bold border border-slate-400 rounded-lg px-1 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                                placeholder="0"
                                                aria-label={`${s} target WCPM`}
                                            />
                                            <span className="text-[11px] text-slate-600 font-bold uppercase">{t(`fluency.season_${s}`) || s}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {evidenceSummary && (
                                <div className={`mb-4 rounded-xl border p-3 text-left ${evidenceSummary.benchmarkReady ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50 border-sky-200'}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-xs font-black text-slate-700 uppercase tracking-wide">Recent reading evidence</div>
                                        <div className="text-xs font-bold text-slate-700">
                                            {evidenceSummary.sampleCount >= 3 ? `Median of ${evidenceSummary.sampleCount}: ` : 'Current sample: '}
                                            {evidenceSummary.medianWcpm ?? 0} WCPM
                                            {evidenceSummary.medianAccuracy != null ? ` | ${evidenceSummary.medianAccuracy}% accuracy` : ''}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-1">{evidenceSummary.message}</div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-red-600">{rrMetrics.substitutions}</div>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase">{t('fluency.substitutions')}</div>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-orange-600">{rrMetrics.omissions}</div>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase">{t('fluency.omissions')}</div>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-purple-600">{rrMetrics.insertions}</div>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase">{t('fluency.insertions_label')}</div>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-black text-blue-600">{rrMetrics.selfCorrections}</div>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase">{t('fluency.self_corrections')}</div>
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 mb-6 text-xs">
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">1:{rrMetrics.errorRate}</span><span className="text-slate-600 font-bold uppercase">{t('fluency.error_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.scRate}%</span><span className="text-slate-600 font-bold uppercase">{t('fluency.sc_rate')}</span></div>
                                <div className="text-center"><span className="block text-lg font-black text-slate-700">{rrMetrics.totalErrors}</span><span className="text-slate-600 font-bold uppercase">{t('fluency.errors_label')}</span></div>
                            </div>
                            {fluencyResult.prosody && (
                                <div className="grid grid-cols-3 gap-3 mb-4 animate-in fade-in duration-300">
                                    {[
                                        { key: 'pacing', label: t('fluency.prosody_pacing') || 'Pacing', color: 'indigo' },
                                        { key: 'expression', label: t('fluency.prosody_expression') || 'Expression', color: 'violet' },
                                        { key: 'phrasing', label: t('fluency.prosody_phrasing') || 'Phrasing', color: 'fuchsia' },
                                    ].map(({ key, label, color }) => {
                                        const val = fluencyResult.prosody[key] || 0;
                                        const pct = (val / 5) * 100;
                                        return (
                                            <div key={key} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-3 text-center`}>
                                                <div className={`text-2xl font-black text-${color}-600`}>{val}<span className="text-sm font-bold text-slate-600">/5</span></div>
                                                <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">{label}</div>
                                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                    <div className={`h-full bg-${color}-500 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {Boolean(fluencyResult.prosody.note) && (
                                        <div className="col-span-3 text-xs text-slate-600 italic text-center mt-1">{fluencyResult.prosody.note}</div>
                                    )}
                                </div>
                            )}
                            {/* Confidence Self-Assessment */}
                            {fluencyResult.confidence && (
                                <div className={`rounded-xl p-4 mb-4 border ${fluencyResult.confidence.overall >= 7 ? 'bg-green-50 border-green-200' : fluencyResult.confidence.overall >= 4 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`text-2xl font-black ${fluencyResult.confidence.overall >= 7 ? 'text-green-600' : fluencyResult.confidence.overall >= 4 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {fluencyResult.confidence.overall}<span className="text-sm opacity-60">/10</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-700">{t('fluency.ai_confidence_title') || 'AI Confidence in This Analysis'}</div>
                                            <div className="text-[11px] text-slate-600">{fluencyResult.confidence.overall >= 7 ? 'High confidence' : fluencyResult.confidence.overall >= 4 ? 'Moderate confidence — some results may be inaccurate' : 'Low confidence — human verification recommended'}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-[11px] mb-2">
                                        <span className="text-slate-600">🎙️ Audio: {fluencyResult.confidence.audioQuality}/10</span>
                                        <span className="text-slate-600">🗣️ Clarity: {fluencyResult.confidence.speakerClarity}/10</span>
                                        {fluencyResult.confidence.accentDetected && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{t('fluency.accent_detected_badge') || 'Accent detected — scored conservatively'}</span>}
                                        {fluencyResult.confidence.youngVoiceDetected && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">{t('fluency.young_voice_badge') || 'Young voice detected'}</span>}
                                        {fluencyResult.confidence.dialectalPatternsDetected && <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">{t('fluency.dialectal_patterns_badge') || 'Dialectal patterns respected'}</span>}
                                    </div>
                                    {fluencyResult.confidence.lowConfidenceWordCount > 0 && (
                                        <div className="text-[11px] text-amber-700 font-medium">⚠ {fluencyResult.confidence.lowConfidenceWordCount} word(s) marked with low confidence — look for ⚠ in the word display below</div>
                                    )}
                                    {fluencyResult.confidence.note && <div className="text-[11px] text-slate-600 mt-1 italic">{fluencyResult.confidence.note}</div>}
                                    {fluencyResult.confidence.limitationsApplied && fluencyResult.confidence.limitationsApplied !== 'none' && fluencyResult.confidence.limitationsApplied !== 'none detected' && (
                                        <div className="text-[11px] text-slate-600 mt-1">Research basis: {fluencyResult.confidence.limitationsApplied}</div>
                                    )}
                                </div>
                            )}
                            </>);
                            })()}
                            {fluencyFeedback && (
                                <div className="mb-6 animate-in slide-in-from-bottom-2 fade-in">
                                    <div className="flex items-start gap-2 text-left bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600 mt-0.5 shrink-0"><Sparkles size={14}/></div>
                                        <div className="text-sm text-indigo-900 leading-relaxed font-medium">
                                            {fluencyFeedback}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className={`mb-4 rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 ${fluencyResult.review?.status === 'reviewed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="text-left">
                                    <div className="text-xs font-black text-slate-700 uppercase tracking-wide">
                                        {fluencyResult.review?.status === 'reviewed' ? 'Teacher-reviewed running record' : 'Automated running record - review recommended'}
                                    </div>
                                    {fluencyResult.review?.status === 'reviewed' && (
                                        <div className="text-[11px] text-slate-600 mt-0.5">
                                            Revision {fluencyResult.review.revision || 1} by {fluencyResult.review.reviewer || 'Educator'}
                                            {fluencyResult.review.correctedWordCount ? ` | ${fluencyResult.review.correctedWordCount} corrected word classification(s)` : ''}
                                        </div>
                                    )}
                                </div>
                                {isTeacherMode && !isReviewingFluency && (
                                    <button
                                        type="button"
                                        onClick={beginFluencyReview}
                                        className="px-3 py-2 rounded-lg text-xs font-bold bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50"
                                        aria-label="Review and correct the automated running record"
                                    >
                                        Review word classifications
                                    </button>
                                )}
                            </div>
                            {isReviewingFluency && fluencyReviewDraft && (
                                <div className="w-full rounded-xl border border-indigo-200 bg-white p-4" data-help-key="fluency_teacher_review">
                                    <p className="text-xs text-slate-600 mb-3 text-left">
                                        Listen again when possible. Change only classifications you can verify; the automated result remains in the audit trail.
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {fluencyReviewDraft.wordData.map((word, index) => (
                                            <div key={index} className={`rounded-lg border p-2 ${word.lowConfidence ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                                                <div className="font-serif text-base font-bold text-slate-800 truncate" title={word.word}>{word.word}</div>
                                                <label className="block text-[11px] font-bold text-slate-600 mt-1">
                                                    Classification
                                                    <select
                                                        value={word.status}
                                                        onChange={(event) => updateFluencyReviewWord(index, 'status', event.target.value)}
                                                        className="mt-0.5 w-full text-[11px] border border-slate-400 rounded px-1 py-1 bg-white"
                                                        aria-label={`Classification for ${word.word}`}
                                                    >
                                                        <option value="correct">Correct</option>
                                                        <option value="stumbled">Hesitation</option>
                                                        <option value="self_corrected">Self-corrected</option>
                                                        <option value="mispronounced">Substitution / mispronounced</option>
                                                        <option value="missed">Omission</option>
                                                    </select>
                                                </label>
                                                {(word.status === 'mispronounced' || word.status === 'self_corrected') && (
                                                    <label className="block text-[11px] font-bold text-slate-600 mt-1">
                                                        Student said
                                                        <input
                                                            value={word.said || ''}
                                                            onChange={(event) => updateFluencyReviewWord(index, 'said', event.target.value)}
                                                            className="mt-0.5 w-full text-[11px] border border-slate-400 rounded px-1 py-1 bg-white"
                                                            aria-label={`What the student said for ${word.word}`}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3 mt-4 text-left">
                                        <label className="text-xs font-bold text-slate-700">
                                            Inserted words
                                            <input
                                                value={fluencyReviewDraft.insertionsText}
                                                onChange={(event) => setFluencyReviewDraft(prev => ({ ...prev, insertionsText: event.target.value }))}
                                                placeholder="Comma-separated, or leave blank"
                                                className="mt-1 w-full text-sm border border-slate-400 rounded-lg px-2 py-2 bg-white"
                                            />
                                        </label>
                                        <label className="text-xs font-bold text-slate-700">
                                            Reviewer
                                            <input
                                                value={fluencyReviewDraft.reviewer}
                                                onChange={(event) => setFluencyReviewDraft(prev => ({ ...prev, reviewer: event.target.value }))}
                                                className="mt-1 w-full text-sm border border-slate-400 rounded-lg px-2 py-2 bg-white"
                                            />
                                        </label>
                                    </div>
                                    <label className="block text-xs font-bold text-slate-700 mt-3 text-left">
                                        Review note
                                        <textarea
                                            value={fluencyReviewDraft.note}
                                            onChange={(event) => setFluencyReviewDraft(prev => ({ ...prev, note: event.target.value }))}
                                            placeholder="Optional context, such as audio quality or dialect consideration"
                                            className="mt-1 w-full min-h-16 text-sm border border-slate-400 rounded-lg px-2 py-2 bg-white"
                                        />
                                    </label>
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => { setIsReviewingFluency(false); setFluencyReviewDraft(null); }}
                                            className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={commitFluencyReview}
                                            className="px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                                        >
                                            Save reviewed record
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!isReviewingFluency && (<div className="text-xl md:text-2xl font-serif leading-loose text-center flex flex-wrap justify-center gap-1.5" data-help-key="fluency_mode_word_analysis">
                                {fluencyResult.wordData.map((w, i) => (
                                    <span
                                        key={i}
                                        title={w.said ? `${t('fluency.said_label')}: "${w.said}"${w.lowConfidence ? ' (⚠ low confidence)' : ''}` : (w.lowConfidence ? '⚠ AI is uncertain about this word' : '')}
                                        className={`px-1 rounded relative group cursor-default ${w.lowConfidence ? 'ring-1 ring-amber-400 ring-offset-1 ' : ''}${
                                            w.status === 'correct' ? 'text-green-600 font-medium' :
                                            w.status === 'missed' ? 'bg-red-700 text-white' :
                                            w.status === 'stumbled' ? 'bg-yellow-100 text-yellow-700' :
                                            w.status === 'self_corrected' ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-400' :
                                            w.status === 'mispronounced' ? 'bg-red-100 text-red-700 border-b-2 border-red-400' :
                                            'text-slate-600'
                                        }`}
                                    >
                                        {w.word}
                                        {w.said && (
                                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10">
                                                {w.said}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>)}
                            <div className="mt-8 pt-6 border-t border-slate-100 w-full">
                                <p className="text-[11px] text-slate-300 font-bold uppercase tracking-widest text-center mb-3">
                                    {t('fluency.analysis_key')}
                                </p>
                                <div className="flex flex-wrap justify-center gap-3 sm:gap-5 text-xs font-medium text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded text-green-600 font-medium bg-green-50/50">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_correct')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-300">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_hesitation')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-300 border-b-2 border-blue-400">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_self_corrected')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-300 border-b-2 border-red-400">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_mispronounced')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-red-700 text-white">
                                            {t('fluency.legend_word')}
                                        </span>
                                        <span>{t('fluency.legend_missed')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center gap-3 flex-wrap">
                                <button
                                    onClick={() => generateFluencyScoreSheet(fluencyResult, typeof generatedContent?.data === 'string' ? generatedContent.data : '')}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                    aria-label={t('common.print_score_sheet')}
                                    data-help-key="fluency_mode_print_score_sheet_btn"
                                >
                                    <FileText size={15} /> Print Score Sheet
                                </button>
                                <button
                                    onClick={exportFluencyCSV}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-emerald-50 text-emerald-300 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                    aria-label={t('common.export_fluency_csv')}
                                    data-help-key="fluency_mode_export_csv_btn"
                                >
                                    <Download size={15} /> Export Fluency CSV
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl">
                             {fluencyTranscript && (
                                <div className="mb-8 p-4 bg-white rounded-xl border border-slate-400 shadow-sm text-sm text-slate-300 italic">
                                    <span className="font-bold uppercase text-xs text-rose-400 block mb-1">{t('fluency.hearing_label')}</span>
                                    "{fluencyTranscript}"
                                </div>
                             )}
                             <div className="text-xl md:text-3xl font-serif text-slate-800 leading-loose text-center" data-help-key="fluency_mode_passage_display">
                                {typeof generatedContent?.data === 'string' ? (
                                    generatedContent?.data
                                        .split('--- ENGLISH TRANSLATION ---')[0]
                                        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                                        .replace(/\[\d+\]/g, '')
                                        .replace(/[⁽][⁰¹²³⁴⁵⁶⁷⁸⁹]+[⁾]/g, '')
                                        .replace(/https?:\/\/[^\s]+/g, '')
                                        .replace(/^#{1,6}\s/gm, '')
                                        .replace(/\*{1,3}/g, '')
                                        .trim()
                                ) : (
                                   <span className="text-slate-600 italic text-base">{t('fluency.format_error')}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-white border-t border-slate-100 flex flex-col items-center justify-center shrink-0 gap-4">
                    {fluencyStatus === 'listening' && fluencyTimeLimit > 0 && fluencyTimerVisibility === 'visible' && (
                        <div className={`text-4xl font-black tabular-nums transition-colors ${
                            fluencyTimeRemaining <= 10 ? 'text-red-500 animate-pulse' :
                            fluencyTimeRemaining <= 30 ? 'text-yellow-500' :
                            'text-indigo-600'
                        }`}>
                            {Math.floor(fluencyTimeRemaining / 60)}:{(fluencyTimeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                    )}
                    <div className={`text-sm font-bold uppercase tracking-widest transition-colors ${
                        fluencyStatus === 'listening' ? 'text-red-500' :
                        fluencyStatus === 'processing' ? 'text-indigo-500 animate-pulse' :
                        'text-slate-600'
                    }`}>
                        {fluencyStatus === 'listening' ? t('fluency.listening') :
                         fluencyStatus === 'processing' ? t('fluency.processing') :
                         fluencyStatus === 'complete' ? t('fluency.complete') :
                         t('fluency.prompt')}
                    </div>
                    <div className="flex gap-4 items-center">
                        {fluencyStatus === 'complete' && (
                            <button
                                onClick={() => {
                                    setFluencyTranscript('');
                                    setFluencyResult(null);
                                    setIsReviewingFluency(false);
                                    setFluencyReviewDraft(null);
                                    setFluencyFeedback('');
                                    setFluencyStatus('idle');
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors animate-in slide-in-from-right-4"
                                aria-label={t('fluency.reset_label')}
                            >
                                <RefreshCw size={18} /> {t('fluency.try_again')}
                            </button>
                        )}
                        <button
                            onClick={toggleFluencyRecording}
                            disabled={fluencyStatus === 'processing'}
                            data-help-key="fluency_mode_record_btn"
                            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform border-4 ${
                                fluencyStatus === 'listening'
                                ? 'bg-red-700 text-white animate-pulse border-red-200 shadow-red-500/30 hover:scale-105 active:scale-95'
                                : fluencyStatus === 'complete'
                                ? 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:scale-105 active:scale-95'
                                : fluencyStatus === 'processing'
                                ? 'bg-slate-300 text-slate-600 border-slate-200 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-100 shadow-indigo-500/30 hover:scale-105 active:scale-95'
                            }`}
                            aria-label={
                                fluencyStatus === 'listening' ? t('fluency.stop_recording') :
                                fluencyStatus === 'processing' ? t('fluency.processing') :
                                t('fluency.start_recording')
                            }
                        >
                            {fluencyStatus === 'listening' ? <StopCircle size={32} className="fill-current"/> :
                             fluencyStatus === 'processing' ? <RefreshCw size={32} className="animate-spin"/> :
                             fluencyStatus === 'complete' ? <RefreshCw size={32}/> :
                             <Mic size={32} className="fill-current"/>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
  );
}

// ── SourceGenPanel: JSX from AlloFlowANTI.txt L22863-L23109 ──
function SourceGenPanel(props) {
  const {
    addToast, aiStandardQuery, aiStandardRegion, gradeLevel,
    handleAddStandard, handleFindStandards, handleGenerateSource, handleRemoveStandard,
    handleSetStandardModeToAi, handleSetStandardModeToManual, includeSourceCitations, isFindingStandards,
    isGeneratingSource, isIndependentMode, setAiStandardQuery, setAiStandardRegion,
    setIncludeSourceCitations, setSourceCustomInstructions, setSourceLength, setSourceLevel,
    setSourceTone, setSourceTopic, setSourceVocabulary, setStandardInputValue,
    setTargetStandards, showSourceGen, sourceCustomInstructions, sourceLength,
    sourceLevel, sourceTone, sourceTopic, sourceVocabulary,
    standardInputValue, standardMode, suggestedStandards, t,
    targetStandards
  } = props;
  if (!(showSourceGen)) return null;
  return (
                  <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 animate-in slide-in-from-top-2 space-y-3">
                      <div>
                        <label htmlFor="allo-source-topic" className="block text-xs font-medium text-indigo-900 mb-1">{t('input.topic')}</label>
                        <input
                          id="allo-source-topic"
                          type="text"
                          value={sourceTopic}
                          onChange={(e) => setSourceTopic(e.target.value)}
                          placeholder={t('wizard.topic_placeholder')}
                          aria-label={t('common.topic_subject_aria')}
                          className="w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                          onKeyDown={(e) => e.key === 'Enter' && handleGenerateSource()}
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-indigo-900 mb-1">{t('input.tone')}</label>
                            <select
                              value={sourceTone}
                              onChange={(e) => setSourceTone(e.target.value)}
                              className="w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                              aria-label={t('input.tone')}
                            >
                                <option value="Informative">{t('input.tone_options.informative')}</option>
                                <option value="Narrative">{t('input.tone_options.narrative')}</option>
                                <option value="Dialogue">{t('input.tone_options.dialogue')}</option>
                                <option value="Persuasive">{t('input.tone_options.persuasive')}</option>
                                <option value="Humorous">{t('input.tone_options.humorous')}</option>
                                <option value="Step-by-Step">{t('input.tone_options.procedural')}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-indigo-900 mb-1">{t('input.target_level')}</label>
                            <select
                              value={sourceLevel}
                              onChange={(e) => setSourceLevel(e.target.value)}
                              className="w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                              aria-label={t('common.target_level')}
                            >
                                <option value="Kindergarten">{t('input.level_options.k')}</option>
                                <option value="1st Grade">{t('input.level_options.g1')}</option>
                                <option value="2nd Grade">{t('input.level_options.g2')}</option>
                                <option value="3rd Grade">{t('input.level_options.g3')}</option>
                                <option value="4th Grade">{t('input.level_options.g4')}</option>
                                <option value="5th Grade">{t('input.level_options.g5')}</option>
                                <option value="6th Grade">{t('input.level_options.g6')}</option>
                                <option value="7th Grade">{t('input.level_options.g7')}</option>
                                <option value="8th Grade">{t('input.level_options.g8')}</option>
                                <option value="9th Grade">{t('input.level_options.g9')}</option>
                                <option value="10th Grade">{t('input.level_options.g10')}</option>
                                <option value="11th Grade">{t('input.level_options.g11')}</option>
                                <option value="12th Grade">{t('input.level_options.g12')}</option>
                                <option value="College">{t('input.level_options.college')}</option>
                                <option value="Graduate Level">{t('input.level_options.grad')}</option>
                            </select>
                          </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-400">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-slate-600 font-bold flex items-center gap-1">
                                    <CheckCircle size={12} className="text-green-600"/> {isIndependentMode ? t('wizard.learning_goal_header') : t('standards.target_standard')}
                                </label>
                                {!isIndependentMode && (
                                <div className="flex bg-white rounded-md border border-slate-400 p-0.5 shadow-sm">
                                    <button
                                        onClick={handleSetStandardModeToAi}
                                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === 'ai' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        {t('standards.ai_match')}
                                    </button>
                                    <button
                                        onClick={handleSetStandardModeToManual}
                                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === 'manual' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-600'}`}
                                    >
                                        {t('standards.manual')}
                                    </button>
                                </div>
                                )}
                            </div>
                            {standardMode === 'ai' ? (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex gap-2">
                                        <input aria-label={t('common.standards_region_optional')}
                                            type="text"
                                            value={aiStandardRegion}
                                            onChange={(e) => setAiStandardRegion(e.target.value)}
                                            placeholder={t('standards.region_optional')}
                                            className="w-1/3 text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                                        />
                                        <input aria-label={t('common.enter_ai_standard_query')}
                                            type="text"
                                            value={aiStandardQuery}
                                            onChange={(e) => setAiStandardQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleFindStandards(gradeLevel)}
                                            placeholder={t('standards.finder_placeholder')}
                                            className="flex-grow text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                                        />
                                        <button
                                            aria-label={t('common.refresh')}
                                            onClick={() => handleFindStandards(gradeLevel)}
                                            disabled={!aiStandardQuery.trim() || isFindingStandards}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title={t('standards.search_button_title')}
                                        >
                                            {isFindingStandards ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
                                        </button>
                                    </div>
                                    {suggestedStandards.length > 0 && (
                                        <div className="max-h-32 overflow-y-auto custom-scrollbar border border-slate-400 rounded bg-white divide-y divide-slate-100">
                                            {suggestedStandards.map((std, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        const val = `${std.code}: ${std.description}`;
                                                        if (targetStandards.length < 3 && !targetStandards.includes(val)) {
                                                            setTargetStandards(prev => [...prev, val]);
                                                            addToast(`Added ${std.code} to list`, "success");
                                                        } else if (targetStandards.length >= 3) {
                                                            addToast(t('standards.toast_max_limit'), "error");
                                                        }
                                                    }}
                                                    className="w-full text-left p-2 hover:bg-indigo-50 transition-colors group"
                                                >
                                                    <div className="flex justify-between items-start gap-1">
                                                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100">{std.code}</span>
                                                        <span className="text-[11px] text-slate-600 uppercase">{std.framework}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 leading-snug mt-1 line-clamp-2 group-hover:text-indigo-900">
                                                        {std.description}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {suggestedStandards.length === 0 && !isFindingStandards && aiStandardQuery && (
                                        <div className="text-[11px] text-slate-600 italic text-center p-1">
                                            {t('standards.press_search_hint')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input aria-label={t('common.enter_standard_input_value')}
                                        type="text"
                                        value={standardInputValue}
                                        onChange={(e) => setStandardInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddStandard()}
                                        placeholder={t('standards.manual_placeholder')}
                                        className="flex-grow text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300 p-1.5"
                                    />
                                    <button aria-label={t('common.add')}
                                        onClick={handleAddStandard}
                                        disabled={!standardInputValue.trim() || targetStandards.length >= 3}
                                        className="bg-indigo-100 text-indigo-700 p-1.5 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={t('standards.add_button')}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        {targetStandards.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                {targetStandards.map((std, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 animate-in slide-in-from-left-1 max-w-full">
                                        <span className="truncate" title={std}>{std}</span>
                                        <button
                                            aria-label={t('common.close')}
                                            onClick={() => handleRemoveStandard(idx)}
                                            className="hover:text-green-900 ml-1 shrink-0"
                                            title={t('standards.remove_button')}
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                      <div>
                        <label className="block text-xs font-medium text-indigo-900 mb-1">
                          {t('input.vocab')} <span className="text-indigo-600 font-normal">{t('common.optional')}</span>
                        </label>
                        <input
                          type="text"
                          value={sourceVocabulary}
                          onChange={(e) => setSourceVocabulary(e.target.value)}
                          placeholder={t('wizard.vocab_placeholder')}
                          className="w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                          aria-label={t('input.vocab')}
                        />
                      </div>
                      <div data-help-key="source_settings_length">
                        <label className="block text-xs font-medium text-indigo-900 mb-1">
                          {t('input.length')} <span className="text-indigo-600 font-normal">{t('input.approx_words')}</span>
                        </label>
                        <input
                          type="number"
                          value={sourceLength}
                          onChange={(e) => setSourceLength(e.target.value)}
                          placeholder="250"
                          step="50"
                          className="w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                          aria-label={t('wizard.aria_length_label')}
                        />
                      </div>
                      <div data-help-key="source_settings_instructions">
                        <label className="block text-xs font-medium text-indigo-900 mb-1">
                          {t('input.custom_instructions')} <span className="text-indigo-600 font-normal">{t('common.optional')}</span>
                        </label>
                        <textarea
                          value={sourceCustomInstructions}
                          onChange={(e) => setSourceCustomInstructions(e.target.value)}
                          placeholder={t('wizard.instructions_placeholder')}
                          className="w-full text-sm p-2 border border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none resize-none h-16 transition-shadow duration-300"
                          aria-label={t('wizard.input_instructions_label')}
                        />
                      </div>
                      <div className="flex flex-col gap-2 bg-purple-50 p-2.5 rounded-lg border-2 border-purple-200 shadow-sm" data-help-key="source_verify_checkbox">
                          <div className="flex items-center gap-2">
                              <input aria-label={t('common.toggle_include_source_citations')}
                                  id="includeCitations"
                                  type="checkbox"
                                  checked={includeSourceCitations}
                                  onChange={(e) => setIncludeSourceCitations(e.target.checked)}
                                  className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500 cursor-pointer"
                              />
                              <label htmlFor="includeCitations" className="text-xs font-bold text-purple-900 cursor-pointer select-none flex items-center gap-1.5">
                                  <Search size={12} className="text-purple-600"/> {t('input.verify_facts')}
                              </label>
                          </div>
                          {includeSourceCitations && (
                              <p className="text-[11px] text-purple-700 ml-6 leading-relaxed">{t('input.verify_facts_desc')}</p>
                          )}
                      </div>
                      <button aria-label={t('common.generate_source_text')}
                        data-help-key="source_generate_button"
                        onClick={handleGenerateSource}
                        disabled={(!sourceTopic.trim() && targetStandards.length === 0) || isGeneratingSource} aria-busy={isGeneratingSource}
                        className="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGeneratingSource ? <RefreshCw className="animate-spin" size={14} /> : <Pencil size={14} />}
                        {isGeneratingSource ? t('input.writing') : t('input.generate')}
                      </button>
                  </div>
  );
}

// ── TourOverlay: JSX from AlloFlowANTI.txt L27802-L28035 ──
function TourOverlay(props) {
  const {
    botSpotlightPos, handleNextTourStep, handlePrevTourStep, handleSetRunTourToFalse,
    isSpotlightMode, runTour, setIsSpotlightMode, setRunTour,
    setSpotlightMessage, spotlightMessage, t, tourRect,
    tourStep, tourSteps,
    compactTour = false
  } = props;
  const tourDialogRef = React.useRef(null);
  const closeTourOverlay = () => {
    if (spotlightMessage) {
      setRunTour(false);
      setIsSpotlightMode(false);
      setSpotlightMessage('');
    } else {
      handleSetRunTourToFalse();
    }
  };
  const containTourFocus = (event) => {
    if (!event || !tourDialogRef.current) return;
    if (event.key === 'Escape') { event.preventDefault(); closeTourOverlay(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(tourDialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) { event.preventDefault(); tourDialogRef.current.focus(); return; }
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  React.useEffect(() => {
    if (!(runTour && tourRect)) return undefined;
    const previouslyFocused = document.activeElement;
    const timer = setTimeout(() => {
      const firstAction = tourDialogRef.current?.querySelector('button:not([disabled])');
      if (firstAction) firstAction.focus();
      else tourDialogRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [runTour, !!tourRect]);
  if (!(runTour && tourRect)) return null;
  const tourAccessibleTitle = spotlightMessage ? (spotlightMessage.title || t('tour.spotlight_title')) : tourSteps[tourStep].title;
  const tourAccessibleText = spotlightMessage ? (spotlightMessage.text || spotlightMessage || '') : (tourSteps[tourStep].text || '');
  return (
        <div role="presentation" className="fixed inset-0 z-[9999] pointer-events-auto font-sans">
            <div className="absolute inset-0 transition-all duration-500">
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: tourRect.top, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}></div>
                <div style={{ position: 'absolute', top: tourRect.top, left: 0, width: tourRect.left, height: tourRect.height, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}></div>
                <div style={{ position: 'absolute', top: tourRect.top, right: 0, left: tourRect.right, height: tourRect.height, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}></div>
                <div style={{ position: 'absolute', top: tourRect.bottom, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}></div>
            </div>
            {isSpotlightMode && botSpotlightPos && (
                <svg className="absolute inset-0 pointer-events-none z-[10000]" style={{ overflow: 'visible' }} aria-hidden="true">
                    <defs>
                        <radialGradient
                            id="beamGradient"
                            gradientUnits="userSpaceOnUse"
                            cx={botSpotlightPos.x - 53}
                            cy={botSpotlightPos.y + 20}
                            r={Math.hypot(
                                (tourRect.left + tourRect.width/2) - (botSpotlightPos.x - 53),
                                (tourRect.top + tourRect.height/2) - (botSpotlightPos.y + 10)
                            ) * 1.1}
                        >
                            <stop offset="0%" stopColor="rgba(250, 204, 21, 0.7)" />
                            <stop offset="60%" stopColor="rgba(250, 204, 21, 0.1)" />
                            <stop offset="100%" stopColor="rgba(250, 204, 21, 0)" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <path
                        d={`
                            M ${botSpotlightPos.x - 53} ${botSpotlightPos.y + 20}
                            L ${tourRect.left} ${tourRect.top}
                            L ${tourRect.left} ${tourRect.bottom}
                            Z
                        `}
                        fill="url(#beamGradient)"
                        style={{ mixBlendMode: 'screen', filter: 'url(#glow)' }}
                        className="animate-in fade-in duration-500 motion-reduce:animate-none motion-reduce:transition-none"
                    />
                    <rect
                        x={tourRect.left - 10}
                        y={tourRect.top - 10}
                        width={tourRect.width + 20}
                        height={tourRect.height + 20}
                        rx="12"
                        fill="none"
                        stroke="rgba(250, 204, 21, 0.4)"
                        strokeWidth="3"
                        className="animate-pulse motion-reduce:animate-none"
                    />
                </svg>
            )}
            {!isSpotlightMode && (
                <div className="animate-pulse motion-reduce:animate-none" style={{
                    position: 'absolute',
                    top: tourRect.top - 4,
                    left: tourRect.left - 4,
                    width: tourRect.width + 8,
                    height: tourRect.height + 8,
                    border: '4px solid #fbbf24',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
                }}></div>
            )}
            <div
                ref={tourDialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={tourAccessibleTitle}
                tabIndex={-1}
                onKeyDown={containTourFocus}
                className={compactTour ? (
                    // Compact placement for modal-context tours (2026-06-10,
                    // maintainer feedback): the full-height 500px drawer covered
                    // the pipeline modal it was narrating. A centered horizontal
                    // strip docks on whichever edge the TARGET is NOT — target in
                    // the lower half → card on top, and vice versa.
                    `fixed left-1/2 -translate-x-1/2 w-[min(680px,94vw)] bg-white p-5 pt-4 shadow-2xl max-h-[40vh] overflow-y-auto flex flex-col gap-3 animate-in duration-500 motion-reduce:animate-none motion-reduce:transition-none z-[11000] border-4 border-amber-300 rounded-3xl ${
                        (tourRect && (tourRect.top + tourRect.height / 2) > window.innerHeight / 2)
                            ? 'top-3 slide-in-from-top'
                            : 'bottom-3 slide-in-from-bottom'
                    }`
                ) : (
                    `fixed top-4 bottom-4 bg-white p-8 pt-6 shadow-2xl w-[500px] max-h-[calc(100vh-2rem)] overflow-y-auto flex flex-col gap-6 animate-in duration-500 motion-reduce:animate-none motion-reduce:transition-none z-[11000] border-amber-300 ${
                        (tourRect && tourRect.left > window.innerWidth / 2)
                            ? 'left-0 border-r-4 rounded-r-3xl slide-in-from-left'
                            : 'right-0 border-l-4 rounded-l-3xl slide-in-from-right'
                    }`
                )}
            >
                <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{tourAccessibleTitle}. {tourAccessibleText}</div>
                {spotlightMessage ? (
                    <div>
                        <h4 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                            <Sparkles size={18} className="text-yellow-500 fill-current"/> {spotlightMessage.title || t('tour.spotlight_title')}
                        </h4>
                        <div className="flex flex-col gap-2 mt-2">
{(spotlightMessage.text || spotlightMessage || '').split(/\r?\n/).map((line, i) => {
                            const cleanLine = line.trim();
                            if (!cleanLine) return <div key={i} className="h-3" />;
                            const formatText = (text) => {
                                if (!text) return null;
                                return text.split('**').map((part, bIdx) => {
                                    if (bIdx % 2 === 1) {
                                        return <strong key={`b-${bIdx}`} className="font-bold text-slate-900 bg-amber-100/50 px-1 rounded border border-amber-200/50 box-decoration-clone">{part}</strong>;
                                    }
                                    return part.split('*').map((sub, iIdx) => {
                                        if (iIdx % 2 === 1) {
                                             return <em key={`i-${bIdx}-${iIdx}`} className="italic text-slate-600 font-serif">{sub}</em>;
                                        }
                                        return sub;
                                    });
                                });
                            };
                            if (cleanLine.startsWith('> ')) {
                                return (
                                   <div key={i} className="border-l-4 border-slate-300 bg-slate-50 p-4 my-2 text-slate-600 italic rounded-r-lg">
                                     {formatText(cleanLine.substring(1).trim())}
                                   </div>
                                );
                            }
                            if (cleanLine.startsWith('###')) {
                                const headerText = cleanLine.replace(/^###\s*/, '').trim();
                                let HeaderIcon = Sparkles;
                                if (headerText.includes('Options') || headerText.includes('Settings') || headerText.includes('Editor')) HeaderIcon = Settings;
                                if (headerText.includes('Features') || headerText.includes('Components') || headerText.includes('Capabilities')) HeaderIcon = Layout;
                                if (headerText.includes('Pro Tip') || headerText.includes('Benefit')) HeaderIcon = Lightbulb;
                                if (headerText.includes('UDL')) HeaderIcon = Brain;
                                if (headerText.includes('Input')) HeaderIcon = FileText;
                                return (
                                    <h5 key={i} className="text-indigo-600 font-bold uppercase text-sm mt-6 mb-3 tracking-wider border-b border-indigo-100 pb-1 flex items-center gap-2">
                                        <HeaderIcon size={16} className="text-indigo-500"/> {formatText(headerText)}
                                    </h5>
                                );
                            }
                            const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
                            if (isBullet) {
                                const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
                                const bulletText = cleanLine.substring(bulletMarker.length).trim();
                                return (
                                    <div key={i} className="grid grid-cols-[24px_1fr] gap-1 mb-2 items-start group">
                                        <div className="mt-2 h-2 w-2 rounded-full bg-amber-400 group-hover:bg-amber-500 transition-colors mx-auto shrink-0" />
                                        <span className="text-slate-700 text-lg font-medium leading-relaxed">{formatText(bulletText)}</span>
                                    </div>
                                );
                            }
                            return (
                                <p key={i} className="text-slate-800 text-xl font-medium leading-relaxed mb-4">
                                    {formatText(cleanLine)}
                                </p>
                            );
                        })}
                    </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-indigo-900 text-lg">{tourSteps[tourStep].title}</h4>
                            <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">
                                {tourStep + 1} / {tourSteps.length}
                            </span>
                        </div>
                        <div className="text-slate-600 text-sm leading-relaxed flex flex-col gap-2">
                            {(tourSteps[tourStep].text || '').split(/\r?\n/).map((line, i) => {
                                const cleanLine = line.trim();
                                if (!cleanLine) return <div key={i} className="h-2" />;
                                const formatText = (text) => {
                                    if (!text) return null;
                                    return text.split('**').map((part, bIdx) => {
                                        if (bIdx % 2 === 1) {
                                            return <strong key={`b-${bIdx}`} className="font-bold text-slate-900 bg-indigo-50 px-1 rounded border border-indigo-100 box-decoration-clone">{part}</strong>;
                                        }
                                        return part.split('*').map((sub, iIdx) => {
                                            if (iIdx % 2 === 1) {
                                                 return <em key={`i-${bIdx}-${iIdx}`} className="italic text-slate-600 font-serif">{sub}</em>;
                                            }
                                            return sub;
                                        });
                                    });
                                };
                                if (cleanLine.startsWith('###')) {
                                    const headerText = cleanLine.replace(/^###\s*/, '').trim();
                                    return (
                                        <h5 key={i} className="text-indigo-600 font-bold uppercase text-xs mt-2 mb-1 tracking-wider border-b border-indigo-100 pb-1 flex items-center gap-2">
                                            <Sparkles size={12} className="text-indigo-400"/> {formatText(headerText)}
                                        </h5>
                                    );
                                }
                                const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
                                if (isBullet) {
                                    const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
                                    const bulletText = cleanLine.substring(bulletMarker.length).trim();
                                    return (
                                        <div key={i} className="grid grid-cols-[16px_1fr] gap-1 mb-1 items-start group">
                                            <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 group-hover:bg-indigo-500 transition-colors mx-auto shrink-0" />
                                            <span className="text-slate-700 text-sm font-medium leading-relaxed">{formatText(bulletText)}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <p key={i} className="text-slate-600 text-sm leading-relaxed mb-2">
                                        {formatText(cleanLine)}
                                    </p>
                                );
                            })}
                        </div>
                    </>
                )}
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100">
                    {spotlightMessage ? (
                        <button
                            data-help-ignore="true"
                            style={{ pointerEvents: "all", zIndex: 9999 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTourOverlay();
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm w-full"
                        >
                            {t('common.close')}
                        </button>
                    ) : (
                        <>
                            <button onClick={handleSetRunTourToFalse} className="text-xs font-bold text-slate-600 hover:text-slate-600">{t('common.skip')}</button>
                            <div className="flex gap-2">
                                <button
                                    aria-label={t('common.continue')}
                                    onClick={handlePrevTourStep}
                                    disabled={tourStep === 0}
                                    className="text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-30"
                                >
                                    {t('common.back')}
                                </button>
                                <button aria-label={t('common.next')}
                                    onClick={handleNextTourStep}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                                >
                                    {tourStep === tourSteps.length - 1 ? t('common.finish') : t('common.next')} <ArrowRight size={14}/>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
  );
}

// ── VolumeBuilderView: IIFE from AlloFlowANTI.txt L24748-L25008 ──
function VolumeBuilderView(props) {
  const {
    cubeAnswer, cubeChallenge, cubeDims, cubeDragRef,
    cubeFeedback, cubeNotch, cubeRotation, cubeScale,
    cubeShape, cubeShowLayers, exploreDifficulty, getAdaptiveDifficulty,
    mathMode, setCubeAnswer, setCubeChallenge, setCubeDims,
    setCubeFeedback, setCubeNotch, setCubeRotation, setCubeScale,
    setCubeShape, setCubeShowLayers, setExploreDifficulty, t
  } = props;
  if (!(mathMode === 'Volume Builder')) return null;
                            const isLBlock = cubeShape === 'lblock';
                            // Clamp notch dims so they never equal or exceed the parent
                            // axis (an axis-equal notch would slice the entire prism).
                            const safeNotch = {
                                l: Math.max(1, Math.min(cubeNotch.l, cubeDims.l - 1)),
                                w: Math.max(1, Math.min(cubeNotch.w, cubeDims.w - 1)),
                                h: Math.max(1, Math.min(cubeNotch.h, cubeDims.h - 1)),
                            };
                            const rectVolume = cubeDims.l * cubeDims.w * cubeDims.h;
                            const notchVolume = isLBlock ? (safeNotch.l * safeNotch.w * safeNotch.h) : 0;
                            const volume = rectVolume - notchVolume;
                            const surfaceArea = 2 * (cubeDims.l * cubeDims.w + cubeDims.l * cubeDims.h + cubeDims.w * cubeDims.h);
                            const cubeUnit = Math.max(18, Math.min(36, 240 / Math.max(cubeDims.l, cubeDims.w, cubeDims.h)));
                            const handleCubeDrag = (e) => {
                                if (!cubeDragRef.current) return;
                                const dx = e.clientX - cubeDragRef.current.x;
                                const dy = e.clientY - cubeDragRef.current.y;
                                setCubeRotation(prev => ({
                                    x: Math.max(-80, Math.min(10, prev.x + dy * 0.5)),
                                    y: prev.y + dx * 0.5
                                }));
                                cubeDragRef.current = { x: e.clientX, y: e.clientY };
                            };
                            const handleCubeDragEnd = () => { cubeDragRef.current = null; window.removeEventListener('mousemove', handleCubeDrag); window.removeEventListener('mouseup', handleCubeDragEnd); };
                            const maxLayer = cubeShowLayers !== null ? Math.min(cubeShowLayers, cubeDims.h) : cubeDims.h;
                            const cubeGridElements = [];
                            for (let z = 0; z < maxLayer; z++)
                                for (let y = 0; y < cubeDims.w; y++)
                                    for (let x = 0; x < cubeDims.l; x++) {
                                        // L-block: skip cubes inside the corner notch so the
                                        // remaining structure visibly reads as an L-shape.
                                        if (isLBlock && x < safeNotch.l && y < safeNotch.w && z < safeNotch.h) continue;
                                        const hue = 140 + z * 12;
                                        const lightness = 55 + z * 4;
                                        cubeGridElements.push(
                                            React.createElement('div', {
                                                key: x + '-' + y + '-' + z,
                                                style: {
                                                    position: 'absolute',
                                                    width: cubeUnit + 'px', height: cubeUnit + 'px',
                                                    transform: 'translate3d(' + (x * cubeUnit) + 'px, ' + (-(z) * cubeUnit) + 'px, ' + (y * cubeUnit) + 'px)',
                                                    transformStyle: 'preserve-3d'
                                                }
                                            },
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: '100%',
                                                transform: 'translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + hue + ',' + '70%,' + lightness + '%,0.85)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.4)',
                                                boxSizing: 'border-box'
                                            }}),
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: '100%',
                                                transform: 'rotateY(180deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + hue + ',' + '65%,' + (lightness+5) + '%,0.7)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                                                boxSizing: 'border-box'
                                            }}),
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: cubeUnit + 'px', height: '100%',
                                                transform: 'rotateY(-90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue+10) + ',' + '60%,' + (lightness-5) + '%,0.8)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                                                boxSizing: 'border-box'
                                            }}),
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: cubeUnit + 'px', height: '100%',
                                                transform: 'rotateY(90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue+10) + ',' + '60%,' + (lightness+3) + '%,0.8)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.3)',
                                                boxSizing: 'border-box'
                                            }}),
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: cubeUnit + 'px',
                                                transform: 'rotateX(90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue-5) + ',' + '75%,' + (lightness+8) + '%,0.9)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.4)',
                                                boxSizing: 'border-box'
                                            }}),
                                            React.createElement('div', { style: {
                                                position: 'absolute', width: '100%', height: cubeUnit + 'px',
                                                transform: 'rotateX(-90deg) translateZ(' + (cubeUnit/2) + 'px)',
                                                background: 'hsla(' + (hue+5) + ',' + '55%,' + (lightness-8) + '%,0.6)',
                                                border: '1px solid hsla(' + hue + ',80%,30%,0.2)',
                                                boxSizing: 'border-box'
                                            }})
                                        ));
                                    }
                            return (
                            <div className="space-y-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in slide-in-from-top-1" data-help-key="volume_builder_panel">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                        📦 3D Volume Explorer
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCubeScale(s => Math.max(0.4, s - 0.15))} className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center" aria-label={t('volume_builder.zoom_out_aria') || 'Zoom out'}>−</button>
                                        <span className="text-[11px] text-emerald-600 font-mono w-10 text-center">{Math.round(cubeScale * 100)}%</span>
                                        <button onClick={() => setCubeScale(s => Math.min(2.5, s + 0.15))} className="w-7 h-7 rounded-full bg-white border border-emerald-300 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center" aria-label={t('volume_builder.zoom_in_aria') || 'Zoom in'}>+</button>
                                        <button onClick={() => { setCubeRotation({ x: -25, y: -35 }); setCubeScale(1.0); }} className="ml-1 px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100 transition-all" aria-label={t('volume_builder.reset_view_aria') || 'Reset view'}>↺</button>
                                    </div>
                                </div>
                                <div role="group" aria-label="Rotate 3D volume" className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-emerald-800 mr-1">Rotate:</span>
                                    <button type="button" onClick={() => setCubeRotation(prev => ({ ...prev, y: prev.y - 15 }))} className="min-h-[36px] rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100" aria-label="Rotate volume left">Left</button>
                                    <button type="button" onClick={() => setCubeRotation(prev => ({ ...prev, y: prev.y + 15 }))} className="min-h-[36px] rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100" aria-label="Rotate volume right">Right</button>
                                    <button type="button" onClick={() => setCubeRotation(prev => ({ ...prev, x: Math.max(-80, prev.x - 10) }))} className="min-h-[36px] rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100" aria-label="Tilt volume up">Up</button>
                                    <button type="button" onClick={() => setCubeRotation(prev => ({ ...prev, x: Math.min(10, prev.x + 10) }))} className="min-h-[36px] rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100" aria-label="Tilt volume down">Down</button>
                                    <output className="ml-auto text-[11px] font-mono text-emerald-700" aria-live="polite">Tilt {Math.round(cubeRotation.x)} degrees, turn {Math.round(cubeRotation.y)} degrees, zoom {Math.round(cubeScale * 100)} percent</output>
                                </div>
                                <p className="text-xs text-emerald-700/70">{t('volume_builder.help_caption') || 'Use the rotate and zoom buttons, or drag and scroll, to inspect rectangular prisms and L-blocks (5.MD.3-5).'}</p>
                                {/* Shape selector — toggle between a solid rectangular prism
                                    and an L-block (rectangular base with a corner notch carved
                                    out so volume becomes additive: V = L*W*H − notch_l*notch_w*notch_h). */}
                                <div className="flex gap-2 justify-center" role="radiogroup" aria-label={t('volume_builder.shape_radiogroup_aria') || 'Volume Builder shape'} data-help-key="volume_builder_shape_selector">
                                    {[
                                        { id: 'rect',   label: '🧊 Rectangular' },
                                        { id: 'lblock', label: '📐 L-Block' },
                                    ].map(s => {
                                        const sel = cubeShape === s.id;
                                        return (
                                            <button
                                                key={s.id}
                                                role="radio"
                                                aria-checked={sel}
                                                onClick={() => { setCubeShape(s.id); setCubeChallenge(null); setCubeFeedback(null); }}
                                                className={'px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ' + (sel
                                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow'
                                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50')}
                                            >{s.label}</button>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-3 gap-2" data-help-key="volume_builder_dimensions_input">
                                    {['l','w','h'].map(dim => (
                                        <div key={dim}>
                                            <label className="block text-xs text-slate-600 mb-1 font-bold uppercase">{dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'}</label>
                                            <input type="range" min="1" max="10" value={cubeDims[dim]}
                                                onChange={(e) => { setCubeDims(prev => ({...prev, [dim]: parseInt(e.target.value)})); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); }}
                                                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                                aria-label={dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height'} />
                                            <div className="text-center text-sm font-bold text-emerald-700 mt-1">{cubeDims[dim]}</div>
                                        </div>
                                    ))}
                                </div>
                                {/* Notch sliders — only when L-block is selected. Each
                                    notch axis is capped at parent_axis − 1 so the prism
                                    always retains at least one row in each direction. */}
                                {isLBlock && (
                                    <div className="grid grid-cols-3 gap-2 mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                                        {['l','w','h'].map(dim => (
                                            <div key={'notch-' + dim}>
                                                <label className="block text-[10px] text-amber-700 mb-1 font-bold uppercase">{(dim === 'l' ? 'Length' : dim === 'w' ? 'Width' : 'Height') + ' Notch'}</label>
                                                <input type="range" min="1" max={Math.max(1, cubeDims[dim] - 1)} value={Math.min(cubeNotch[dim], Math.max(1, cubeDims[dim] - 1))}
                                                    onChange={(e) => { setCubeNotch(prev => ({...prev, [dim]: parseInt(e.target.value)})); setCubeChallenge(null); setCubeFeedback(null); }}
                                                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                                    aria-label={'Notch ' + (dim === 'l' ? 'length' : dim === 'w' ? 'width' : 'height')} />
                                                <div className="text-center text-xs font-bold text-amber-700 mt-1">{Math.min(cubeNotch[dim], Math.max(1, cubeDims[dim] - 1))}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div
                                    role="img"
                                    aria-label={`3D ${isLBlock ? 'L-block' : 'rectangular prism'}, ${cubeDims.l} by ${cubeDims.w} by ${cubeDims.h}, volume ${volume} cubic units`}
                                    className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-emerald-300/30 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
                                    style={{ minHeight: '400px', perspective: '900px' }}
                                    onMouseDown={(e) => { cubeDragRef.current = { x: e.clientX, y: e.clientY }; window.addEventListener('mousemove', handleCubeDrag); window.addEventListener('mouseup', handleCubeDragEnd); }}
                                    onWheel={(e) => { e.preventDefault(); setCubeScale(s => Math.max(0.4, Math.min(2.5, s + (e.deltaY > 0 ? -0.08 : 0.08)))); }}
                                    onTouchStart={(e) => { if (e.touches.length === 1) cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
                                    onTouchMove={(e) => { if (cubeDragRef.current && e.touches.length === 1) { const dx = e.touches[0].clientX - cubeDragRef.current.x; const dy = e.touches[0].clientY - cubeDragRef.current.y; setCubeRotation(prev => ({ x: Math.max(-80, Math.min(10, prev.x + dy * 0.5)), y: prev.y + dx * 0.5 })); cubeDragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }}
                                    onTouchEnd={() => { cubeDragRef.current = null; }}
                                >
                                    <div style={{
                                        transformStyle: 'preserve-3d',
                                        transform: 'rotateX(' + cubeRotation.x + 'deg) rotateY(' + cubeRotation.y + 'deg) scale3d(' + cubeScale + ',' + cubeScale + ',' + cubeScale + ')',
                                        transition: cubeDragRef.current ? 'none' : 'transform 0.15s ease-out',
                                        position: 'relative',
                                        width: (cubeDims.l * cubeUnit) + 'px',
                                        height: (cubeDims.h * cubeUnit) + 'px'
                                    }}>
                                        {cubeGridElements}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-white/80 rounded-lg p-2 border border-emerald-100">
                                    <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">Layers:</span>
                                    <input type="range" min="1" max={cubeDims.h} value={cubeShowLayers !== null ? cubeShowLayers : cubeDims.h}
                                        aria-label={t('stem.layers_slider') || 'Visible layers'}
                                        onChange={(e) => setCubeShowLayers(parseInt(e.target.value))}
                                        className="flex-1 h-1.5 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                                    <span className="text-xs font-mono text-emerald-600 w-12 text-center">{cubeShowLayers !== null ? cubeShowLayers : cubeDims.h} / {cubeDims.h}</span>
                                    {cubeShowLayers !== null && cubeShowLayers < cubeDims.h && <button onClick={() => setCubeShowLayers(null)} className="text-xs text-emerald-500 hover:text-emerald-700 font-bold">All</button>}
                                </div>
                                <div className="bg-white/80 rounded-lg p-3 border border-emerald-100" data-help-key="volume_builder_volume_readout">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">{t('stem.volume_label')}</div>
                                            <div className="text-lg font-bold text-emerald-800">
                                                {isLBlock ? (
                                                    <>V = ({cubeDims.l}×{cubeDims.w}×{cubeDims.h}) − ({safeNotch.l}×{safeNotch.w}×{safeNotch.h}) = {rectVolume} − {notchVolume} = <span className="text-2xl text-emerald-600">{volume}</span></>
                                                ) : (
                                                    <>V = {cubeDims.l} × {cubeDims.w} × {cubeDims.h} = <span className="text-2xl text-emerald-600">{volume}</span></>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-600">{volume} unit cube{volume !== 1 ? 's' : ''}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">{t('stem.surface_area')}{isLBlock && <span className="ml-1 text-[10px] font-normal text-teal-500/70">(approx — full prism)</span>}</div>
                                            <div className="text-lg font-bold text-teal-800">
                                                SA {isLBlock ? '≈ ' : '= '}<span className="text-2xl text-teal-600">{surfaceArea}</span>
                                            </div>
                                            <div className="text-xs text-slate-600">2({cubeDims.l}×{cubeDims.w} + {cubeDims.l}×{cubeDims.h} + {cubeDims.w}×{cubeDims.h})</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold text-emerald-700">Difficulty:</span>
                                    <div className="flex gap-0.5">
                                        {['easy','medium','hard'].map(d => <button key={d} onClick={() => setExploreDifficulty(d)} className={"text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all " + (exploreDifficulty === d ? (d === 'easy' ? 'bg-green-700 text-white' : d === 'hard' ? 'bg-red-700 text-white' : 'bg-emerald-700 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{d}</button>)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        const vdiff = getAdaptiveDifficulty(); const vmax = vdiff === 'easy' ? 4 : vdiff === 'hard' ? 10 : 7; const l = Math.floor(Math.random() * (vmax - 1)) + 1;
                                        const w = Math.floor(Math.random() * (vmax - 1)) + 1;
                                        const h = Math.floor(Math.random() * (vmax - 1)) + 1;
                                        setCubeDims({ l, w, h });
                                        // Challenge answer adapts to current shape: rectangular
                                        // uses V = L*W*H; L-block subtracts the (clamped) notch
                                        // volume so what's shown equals what's checked.
                                        if (cubeShape === 'lblock') {
                                            const nL = Math.max(1, Math.min(cubeNotch.l, l - 1));
                                            const nW = Math.max(1, Math.min(cubeNotch.w, w - 1));
                                            const nH = Math.max(1, Math.min(cubeNotch.h, h - 1));
                                            setCubeChallenge({ l, w, h, shape: 'lblock', notch: { l: nL, w: nW, h: nH }, answer: l * w * h - nL * nW * nH });
                                        } else {
                                            setCubeChallenge({ l, w, h, shape: 'rect', answer: l * w * h });
                                        }
                                        setCubeAnswer('');
                                        setCubeFeedback(null);
                                        setCubeShowLayers(null);
                                    }} className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md" data-help-key="volume_builder_random_challenge_btn">
                                        🎲 Random Challenge
                                    </button>
                                    <button onClick={() => { setCubeDims({ l: 3, w: 2, h: 2 }); setCubeChallenge(null); setCubeFeedback(null); setCubeShowLayers(null); setCubeRotation({ x: -25, y: -35 }); setCubeScale(1.0); }}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all" data-help-key="volume_builder_reset_btn">
                                        ↺ Reset
                                    </button>
                                </div>
                                {cubeChallenge && (
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                        <p className="text-sm font-bold text-amber-800 mb-2">🤔 What is the volume of this {cubeChallenge.shape === 'lblock' ? 'L-block' : 'rectangular prism'}?</p>
                                        <div className="flex gap-2 items-center">
                                            <input type="number" value={cubeAnswer}
                                                onChange={(e) => setCubeAnswer(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && cubeAnswer) { const ans = parseInt(cubeAnswer); const isLB = cubeChallenge.shape === 'lblock'; const correctMsg = isLB ? ('✅ Correct! (' + cubeChallenge.l + '×' + cubeChallenge.w + '×' + cubeChallenge.h + ') − (' + cubeChallenge.notch.l + '×' + cubeChallenge.notch.w + '×' + cubeChallenge.notch.h + ') = ' + cubeChallenge.answer + ' cubic units') : ('✅ Correct! ' + cubeChallenge.l + ' × ' + cubeChallenge.w + ' × ' + cubeChallenge.h + ' = ' + cubeChallenge.answer + ' cubic units'); const wrongMsg = isLB ? '❌ Not quite. Try V = (L × W × H) − notch' : '❌ Not quite. Try V = L × W × H'; setCubeFeedback(ans === cubeChallenge.answer ? { correct: true, msg: correctMsg } : { correct: false, msg: wrongMsg }); } }}
                                                placeholder={t('volume_builder.answer_placeholder') || 'Enter volume...'}
                                                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                                                aria-label={t('volume_builder.answer_aria') || 'Volume answer'}
                                                data-help-key="volume_builder_answer_field" />
                                            <button onClick={() => { const ans = parseInt(cubeAnswer); const isLB = cubeChallenge.shape === 'lblock'; const correctMsg = isLB ? ('✅ Correct! (' + cubeChallenge.l + '×' + cubeChallenge.w + '×' + cubeChallenge.h + ') − (' + cubeChallenge.notch.l + '×' + cubeChallenge.notch.w + '×' + cubeChallenge.notch.h + ') = ' + cubeChallenge.answer + ' cubic units') : ('✅ Correct! ' + cubeChallenge.l + ' × ' + cubeChallenge.w + ' × ' + cubeChallenge.h + ' = ' + cubeChallenge.answer + ' cubic units'); const wrongMsg = isLB ? '❌ Not quite. Try V = (L × W × H) − notch' : '❌ Not quite. Try V = L × W × H'; setCubeFeedback(ans === cubeChallenge.answer ? { correct: true, msg: correctMsg } : { correct: false, msg: wrongMsg }); }}
                                                disabled={!cubeAnswer}
                                                className="px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 disabled:opacity-40 transition-all"
                                                data-help-key="volume_builder_check_btn">
                                                Check
                                            </button>
                                        </div>
                                        {cubeFeedback && <p className={'text-sm font-bold mt-2 ' + (cubeFeedback.correct ? 'text-green-600' : 'text-red-600')}>{cubeFeedback.msg}</p>}
                                    </div>
                                )}
                            </div>
                            );
}
