// view_export_preview_source.jsx — Export Preview & Customization Modal (Round 5 Tier A)
//
// Extracted from AlloFlowANTI.txt L31652-L32469 (817 lines, ~50 props).
//
// Closure deps generated via the SCOPE-AWARE dep enumerator at
// c:/tmp/enumerate_block_scope_aware.js — flat-scope enumerators silently
// drop closure refs shadowed by inner-scope param names (see PdfAuditView's
// missed `t` prop incident, May 2026).

// ── Writing check (Harper) ──
// Open-source grammar checking that runs ENTIRELY in the browser (Rust→WASM,
// Apache-2.0, by Automattic). Chosen over LanguageTool's public API because
// no document text ever leaves the device (FERPA posture), and over
// write-good/retext because Harper does real grammar (subject–verb
// agreement, homophones, repeated words) rather than style lint. English-
// only; the first run downloads the ~10 MB WASM (browser-cached after) —
// both disclosed in the UI. Spelling itself stays with the browser's native
// checker (spellcheck=true is already on in the editor). Function-wrapped
// dynamic import so esbuild doesn't try to resolve the remote URL at build.
let _harperPromise = null;
function _ensureHarper() {
  if (_harperPromise) return _harperPromise;
  _harperPromise = (async () => {
    const _imp = new Function('u', 'return import(u)');
    const mod = await _imp('https://cdn.jsdelivr.net/npm/harper.js@2.4.0/+esm');
    const binary = await mod.createBinaryModuleFromUrl('https://cdn.jsdelivr.net/npm/harper.js@2.4.0/dist/harper_wasm_bg.wasm');
    const linter = new mod.LocalLinter({ binary });
    if (linter.setup) await linter.setup();
    return linter;
  })();
  _harperPromise.catch(() => { _harperPromise = null; }); // failed load → allow retry
  return _harperPromise;
}
// end _ensureHarper
function _builderWordCount(doc) {
  if (!doc?.body) return 0;
  const win = doc.defaultView;
  const NF = win?.NodeFilter || NodeFilter;
  const walker = doc.createTreeWalker(doc.body, NF.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui]')) continue;
    if (node.nodeValue) parts.push(node.nodeValue);
  }
  const text = parts.join(' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

function _builderHeadingOutline(doc) {
  if (!doc) return [];
  return Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((heading, index) => ({
    index,
    level: Number(heading.tagName.substring(1)) || 1,
    text: (heading.textContent || '').replace(/\s+/g, ' ').trim() || `Untitled heading ${index + 1}`,
    node: heading,
  }));
}

function _builderExportPreflight(doc, mode) {
  const issues = [];
  const add = (severity, code, message, count) => issues.push({ severity, code, message, count: count || 1 });
  if (!doc || !doc.body || !doc.documentElement) {
    add('error', 'preview-missing', 'The editable preview is not ready.');
    return { issues, errors: 1, warnings: 0, passed: 0 };
  }
  if (doc.body.getAttribute('data-allo-preview-error') === '1') add('error', 'preview-error', 'The preview contains a render error.');
  const meaningful = (doc.body.textContent || '').trim() || doc.body.querySelector('img,svg,math,table,form,input,textarea,select');
  if (!meaningful) add('error', 'empty-document', 'The document has no exportable content.');
  if (!(doc.documentElement.getAttribute('lang') || '').trim()) add('warning', 'language', 'Set the document language for screen readers and spell-checkers.');
  if (!(doc.title || '').trim()) add('warning', 'title', 'Add a descriptive document title.');
  const headings = _builderHeadingOutline(doc);
  if (!headings.length) add('warning', 'headings', 'Add headings so readers can navigate the document.');
  let previousLevel = 0;
  let skipped = 0;
  headings.forEach((heading) => {
    if (previousLevel && heading.level > previousLevel + 1) skipped += 1;
    previousLevel = heading.level;
  });
  if (skipped) add('warning', 'heading-order', `${skipped} heading level jump${skipped === 1 ? '' : 's'} may make navigation confusing.`, skipped);
  const missingAlt = Array.from(doc.images || []).filter((img) => !img.hasAttribute('alt')).length;
  if (missingAlt) add('error', 'image-alt', `${missingAlt} image${missingAlt === 1 ? ' is' : 's are'} missing alternative text.`, missingAlt);
  const unlabeled = Array.from(doc.querySelectorAll('input,select,textarea')).filter((control) => {
    if (control.type === 'hidden') return false;
    if (control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || control.closest('label')) return false;
    return !(control.id && Array.from(doc.querySelectorAll('label[for]')).some((label) => label.htmlFor === control.id));
  }).length;
  if (unlabeled) add('error', 'form-label', `${unlabeled} form control${unlabeled === 1 ? ' has' : 's have'} no accessible label.`, unlabeled);
  const tablesWithoutHeaders = Array.from(doc.querySelectorAll('table')).filter((table) => !table.querySelector('th')).length;
  if (tablesWithoutHeaders) add('warning', 'table-headers', `${tablesWithoutHeaders} table${tablesWithoutHeaders === 1 ? ' has' : 's have'} no header cells.`, tablesWithoutHeaders);
  const unsafeLinks = Array.from(doc.querySelectorAll('a[href]')).filter((a) => /^\s*(javascript|vbscript|data):/i.test(a.getAttribute('href') || '')).length;
  if (unsafeLinks) add('error', 'unsafe-links', `${unsafeLinks} unsafe link${unsafeLinks === 1 ? '' : 's'} must be removed.`, unsafeLinks);
  const seenIds = new Set();
  let duplicateIds = 0;
  Array.from(doc.querySelectorAll('[id]')).forEach((node) => { const id = node.id; if (seenIds.has(id)) duplicateIds += 1; else seenIds.add(id); });
  if (duplicateIds) add('error', 'duplicate-ids', `${duplicateIds} duplicate element ID${duplicateIds === 1 ? '' : 's'} can break links and labels.`, duplicateIds);
  const chrome = doc.querySelectorAll('.allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui]').length;
  if (chrome) add('warning', 'editor-chrome', 'Editor-only controls will be removed from the exported file.', chrome);
  if (mode === 'slides' && headings.length < 2) add('warning', 'slide-structure', 'Add section headings so the slide deck can split content into meaningful slides.');
  if (mode === 'epub') {
    const remoteImages = Array.from(doc.images || []).filter((img) => !/^data:image\//i.test(img.getAttribute('src') || '')).length;
    if (remoteImages) add('warning', 'epub-images', `${remoteImages} image${remoteImages === 1 ? '' : 's'} must be fetched and packaged for offline e-readers.`, remoteImages);
    const remoteStyles = Array.from(doc.querySelectorAll('link[rel~="stylesheet"][href],style')).filter((node) => {
      const value = node.tagName === 'STYLE' ? node.textContent : node.getAttribute('href');
      return /https?:/i.test(value || '');
    }).length;
    if (remoteStyles) add('warning', 'epub-styles', `${remoteStyles} remote stylesheet or font reference${remoteStyles === 1 ? '' : 's'} will be removed for offline reading.`, remoteStyles);
    const remoteMedia = Array.from(doc.querySelectorAll('audio[src],video[src],source[src],object[data]')).filter((node) => /https?:/i.test(node.getAttribute('src') || node.getAttribute('data') || '')).length;
    if (remoteMedia) add('warning', 'epub-media', `${remoteMedia} remote media asset${remoteMedia === 1 ? '' : 's'} may still require an internet connection.`, remoteMedia);
  }
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  return { issues, errors, warnings, passed: Math.max(0, 8 - errors - warnings) };
}

function _builderH5PCompatibility(item) {
  const type = String(item?.type || '').toLowerCase();
  const plain = (value) => String(value == null ? '' : value).trim();
  if (type === 'quiz') {
    const questions = Array.isArray(item?.data?.questions) ? item.data.questions : [];
    const allMcq = questions.length > 0 && questions.every((question) => !question?.type || question.type === 'mcq');
    let valid = 0;
    let adapted = 0;
    let manualReview = 0;
    questions.forEach((question = {}) => {
      const kind = question.type || 'mcq';
      const prompt = plain(question.question);
      let ready = false;
      if (kind === 'mcq') {
        const options = Array.isArray(question.options) ? question.options.map(plain) : [];
        const key = Number.isInteger(question.correctIndex) ? question.correctIndex : options.indexOf(plain(question.correctAnswer));
        ready = !!prompt && options.length >= 2 && (!allMcq || options.length <= 4) && options.every(Boolean) && key >= 0;
      } else if (kind === 'multi-select') {
        const options = Array.isArray(question.options) ? question.options.map(plain) : [];
        const keys = Array.isArray(question.correctAnswers) ? question.correctAnswers.map(plain) : [];
        ready = !!prompt && options.length >= 2 && keys.length > 0 && keys.every((key) => options.includes(key));
      } else if (kind === 'fill-blank') {
        ready = !!prompt && !!plain(question.expectedFill);
      } else if (kind === 'short-answer' || kind === 'self-explanation') {
        ready = !!prompt;
        if (ready) manualReview += 1;
      } else if (kind === 'sequence-sense') {
        ready = !!prompt && Array.isArray(question.items) && question.items.length >= 3;
        if (ready) { adapted += 1; manualReview += 1; }
      } else if (kind === 'relation-mismatch') {
        const wrong = Number(question.wrongPairIndex);
        ready = !!prompt && Array.isArray(question.pairs) && question.pairs.length >= 2
          && Number.isInteger(wrong) && wrong >= 0 && wrong < question.pairs.length
          && Array.isArray(question.candidatePartners) && question.candidatePartners.length >= 2 && question.candidatePartners.includes(question.correctPartnerForWrong);
        if (ready) adapted += 1;
      } else if (kind === 'answer-evidence') {
        ready = !!prompt && Array.isArray(question.answerOptions) && question.answerOptions.length >= 2 && question.answerOptions.includes(question.correctAnswer)
          && Array.isArray(question.evidenceOptions) && question.evidenceOptions.length >= 2 && question.evidenceOptions.includes(question.correctEvidence);
        if (ready) adapted += 1;
      } else if (kind === 'numeric-response') {
        ready = !!prompt && Number.isFinite(Number(question.correctValue));
        if (ready) {
          adapted += 1;
          if (Number(question.tolerance) > 0) manualReview += 1;
        }
      }
      if (ready) valid += 1;
    });
    return {
      type,
      unit: 'question',
      library: allMcq ? 'Single Choice Set 1.11' : 'Question Set 1.21',
      total: questions.length,
      valid,
      omitted: questions.length - valid,
      adapted,
      manualReview,
      embeddedMedia: 0,
      omittedMedia: 0,
      ready: valid > 0,
    };
  }
  if (type === 'glossary' || type === 'flashcards') {
    const rawData = item?.data;
    const cards = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.cards) ? rawData.cards : (Array.isArray(rawData?.items) ? rawData.items : []));
    let valid = 0;
    let embeddedMedia = 0;
    let omittedMedia = 0;
    const isEmbeddedImage = (value) => typeof value === 'string' && /^data:image\/(png|jpeg|gif);base64,[a-z0-9+/=\s]+$/i.test(value.trim());
    const isEmbeddedAudio = (value) => typeof value === 'string' && /^data:audio\/(mpeg|mp4|ogg|wav|x-wav|webm);base64,[a-z0-9+/=\s]+$/i.test(value.trim());
    cards.forEach((card) => {
      const front = plain(type === 'glossary' ? (card?.term ?? card?.word ?? card?.phrase) : (card?.front ?? card?.term ?? card?.question));
      const back = plain(type === 'glossary' ? (card?.def ?? card?.definition ?? card?.meaning) : (card?.back ?? card?.definition ?? card?.answer));
      if (!front || !back) return;
      valid += 1;
      const image = card?.image ?? card?.imageUrl ?? card?.png;
      const rawAudio = card?.audio ?? card?.audioUrl ?? card?.pronunciationAudio;
      const audio = Array.isArray(rawAudio) ? rawAudio.find((value) => typeof value === 'string' && value.trim()) : rawAudio;
      if (image) { if (isEmbeddedImage(image)) embeddedMedia += 1; else omittedMedia += 1; }
      if (audio) { if (isEmbeddedAudio(audio)) embeddedMedia += 1; else omittedMedia += 1; }
    });
    return {
      type,
      unit: 'card',
      library: 'Dialog Cards 1.9',
      total: cards.length,
      valid,
      omitted: cards.length - valid,
      embeddedMedia,
      omittedMedia,
      ready: valid > 0,
    };
  }
  return { type, unit: 'item', library: '', total: 0, valid: 0, omitted: 0, embeddedMedia: 0, omittedMedia: 0, ready: false };
}

function ExportPreviewView(props) {
  const {
    BUILT_IN_PRESETS, FONT_OPTIONS, STYLE_SEEDS, _ensureDiffLib,
    a11yInspectMode, addToast, agentActivityLog, agentLogFullView,
    applyExportPreset, auditOutputAccessibility, customExportCSS, deleteExportPreset,
    diffLibReady, executeExportFromPreview, expertCommandInput, exportAuditLoading,
    exportAuditResult, exportConfig, exportPresets, exportPreviewMode,
    exportPreviewRef, exportStylePrompt, exportTheme, generateCustomExportStyle,
    getExportPreviewHTML, getSkippedResources, history, isAgentRunning, isGeneratingStyle,
    handleExportH5P, handleExportIMS, handleExportQTI,
    pdfFixResult, pptxLoaded, processExpertCommand, runAxeAudit,
    saveExportPreset, selectedFont, setAgentActivityLog, setAgentLogFullView,
    setCustomExportCSS, setDiffViewOpen, setExpertCommandInput, setExportAuditLoading,
    setExportAuditResult, setExportConfigAndRefresh, setExportPreviewMode, setExportStylePrompt,
    setExportTheme, setIsAgentRunning, setShowBrandProfileEditor, setShowExportPreview, showExportPreview,
    t, theme,
    toggleA11yInspect, updateExportPreview,
    exportPreviewSource,
    onExportSuccess,
  } = props;
  // BrandProfile inline integration — replaces the standalone Educator Hub tool.
  // Read the user's saved brand profiles so they can be picked as export themes
  // alongside the built-in STYLE_SEEDS, and surface a "Manage" button + first-
  // time banner so brand setup happens in the context where brands get used.
  // Writing-check panel state: null | {status:'loading'} | {status:'error',error}
  // | {status:'done', items:[{blockIndex,message,start,end,bad,snippet,suggestions}], capped}
  const [writingCheck, setWritingCheck] = React.useState(null);
  const [wordGoalProgress, setWordGoalProgress] = React.useState({ count: 0, goal: 0, percent: 0 });
  const [wordCount, setWordCount] = React.useState(0);
  const [wordGoal, setWordGoal] = React.useState(0);
  const [headingOutline, setHeadingOutline] = React.useState([]);
  const [preflightResult, setPreflightResult] = React.useState(null);
  const [findQuery, setFindQuery] = React.useState('');
  const [replaceQuery, setReplaceQuery] = React.useState('');
  const [altExportBusy, setAltExportBusy] = React.useState('');
  const [pendingImageFile, setPendingImageFile] = React.useState(null);
  const qtiAssessments = React.useMemo(() => (Array.isArray(history) ? history : [])
    .map((item, index) => ({ item, key: `${item?.id || 'quiz'}:${index}` }))
    .filter(({ item }) => item?.type === 'quiz' && Array.isArray(item?.data?.questions)), [history]);
  const [selectedQtiKey, setSelectedQtiKey] = React.useState('');
  React.useEffect(() => {
    if (!qtiAssessments.length) { if (selectedQtiKey) setSelectedQtiKey(''); return; }
    if (!qtiAssessments.some((entry) => entry.key === selectedQtiKey)) {
      setSelectedQtiKey(qtiAssessments[qtiAssessments.length - 1].key);
    }
  }, [qtiAssessments, selectedQtiKey]);
  const h5pActivities = React.useMemo(() => (Array.isArray(history) ? history : [])
    .map((item, index) => ({ item, key: `${item?.id || item?.type || 'activity'}:${index}` }))
    .filter(({ item }) => ['quiz', 'glossary', 'flashcards'].includes(item?.type)), [history]);
  const [selectedH5PKey, setSelectedH5PKey] = React.useState('');
  React.useEffect(() => {
    if (!h5pActivities.length) { if (selectedH5PKey) setSelectedH5PKey(''); return; }
    if (!h5pActivities.some((entry) => entry.key === selectedH5PKey)) {
      setSelectedH5PKey(h5pActivities[h5pActivities.length - 1].key);
    }
  }, [h5pActivities, selectedH5PKey]);
  const selectedH5PActivity = React.useMemo(() => (
    h5pActivities.find((entry) => entry.key === selectedH5PKey) || h5pActivities[h5pActivities.length - 1] || null
  ), [h5pActivities, selectedH5PKey]);
  const h5pCompatibility = React.useMemo(() => _builderH5PCompatibility(selectedH5PActivity?.item), [selectedH5PActivity]);
  const [imageAltText, setImageAltText] = React.useState('');
  const [imageDecorative, setImageDecorative] = React.useState(false);
  const [imageAltError, setImageAltError] = React.useState('');
  const [imageInsertBusy, setImageInsertBusy] = React.useState(false);
  const [exportActionBusy, setExportActionBusy] = React.useState(false);
  const imageFileInputRef = React.useRef(null);
  const imageAddButtonRef = React.useRef(null);
  const imageAltInputRef = React.useRef(null);
  const imageInsertionRangeRef = React.useRef(null);
  const exportDialogRef = React.useRef(null);
  const imageDialogRef = React.useRef(null);
  const imageInsertRunRef = React.useRef(0);
  const writingCheckRunRef = React.useRef(0);
  const auditRunRef = React.useRef(0);
  const expertRunRef = React.useRef(0);
  const exportActionLockRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const findCursorRef = React.useRef({ node: null, offset: 0 });
  const openerRef = React.useRef(null);

  const promptForBuilderText = React.useCallback(async (message, defaultValue, options) => {
    if (!(window.AlloFlowUX && typeof window.AlloFlowUX.prompt === 'function')) {
      addToast && addToast('The text-entry dialog is still loading. Please try again in a moment.', 'error');
      return null;
    }
    return window.AlloFlowUX.prompt(message, defaultValue || '', options || {});
  }, [addToast]);

  React.useEffect(() => () => {
    mountedRef.current = false;
    imageInsertRunRef.current += 1;
    writingCheckRunRef.current += 1;
    auditRunRef.current += 1;
    expertRunRef.current += 1;
  }, []);

  // Capture the launch control before the following focus-trap effect moves
  // focus into the dialog. Effects run in declaration order.
  React.useEffect(() => {
    if (!showExportPreview) return undefined;
    openerRef.current = document.activeElement;
    return () => {
      const opener = openerRef.current;
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        window.setTimeout(() => opener.focus(), 0);
      }
    };
  }, [showExportPreview]);

  const closeImageDialog = React.useCallback(() => {
    imageInsertRunRef.current += 1;
    setImageInsertBusy(false);
    setPendingImageFile(null);
    setImageAltText('');
    setImageDecorative(false);
    setImageAltError('');
    window.setTimeout(() => imageAddButtonRef.current?.focus(), 0);
  }, []);

  React.useEffect(() => {
    if (!showExportPreview || pendingImageFile) return undefined;
    const dialog = exportDialogRef.current;
    if (!dialog) return undefined;
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'));
    if (!dialog.contains(document.activeElement)) (getFocusable()[0] || dialog).focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setShowExportPreview(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [showExportPreview, pendingImageFile, setShowExportPreview]);

  React.useEffect(() => {
    if (!pendingImageFile) return undefined;
    const dialog = imageDialogRef.current;
    if (!dialog) return undefined;
    const timer = window.setTimeout(() => imageAltInputRef.current?.focus(), 0);
    const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeImageDialog(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(timer); dialog.removeEventListener('keydown', onKeyDown); };
  }, [pendingImageFile, closeImageDialog]);

  const insertPendingImage = React.useCallback(() => {
    if (!pendingImageFile || imageInsertBusy) return;
    const file = pendingImageFile;
    const decorative = imageDecorative;
    const alt = decorative ? '' : imageAltText.trim();
    if (!decorative && !alt) {
      setImageAltError('Describe the image, or mark it as decorative.');
      imageAltInputRef.current?.focus();
      return;
    }
    const runId = ++imageInsertRunRef.current;
    setImageInsertBusy(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
      const iframe = exportPreviewRef.current;
      const doc = iframe?.contentDocument;
      const dataUrl = ev?.target?.result;
      if (!doc || typeof dataUrl !== 'string') {
        setImageInsertBusy(false);
        addToast && addToast('Preview not ready yet.', 'error');
        return;
      }
      if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(dataUrl)) {
        setImageInsertBusy(false);
        addToast && addToast('That image format is not supported. Choose PNG, JPEG, GIF, or WebP.', 'error');
        return;
      }
      const img = doc.createElement('img');
      img.style.cssText = 'max-width:100%;height:auto;border-radius:8px;margin:12px 0;cursor:move;';
      img.alt = alt;
      img.setAttribute('tabindex', '0');
      img.setAttribute('data-allo-crop-tabindex-added', 'added');
      img.onload = () => {
        if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
        const pixels = (img.naturalWidth || 0) * (img.naturalHeight || 0);
        if (!img.naturalWidth || img.naturalWidth > 10000 || img.naturalHeight > 10000 || pixels > 25000000) {
          img.onload = null;
          setImageInsertBusy(false);
          addToast && addToast('That image is too large to edit safely. Choose an image under 10,000 pixels per side and 25 megapixels.', 'error');
          return;
        }
        img.onload = null;
        const savedRange = imageInsertionRangeRef.current;
        if (savedRange && savedRange.startContainer?.ownerDocument === doc && savedRange.startContainer?.isConnected) {
          try {
            savedRange.collapse(false);
            savedRange.insertNode(img);
          } catch (_) {
            (doc.querySelector('main') || doc.body).appendChild(img);
          }
        } else {
          (doc.querySelector('main') || doc.body).appendChild(img);
        }
        try {
          if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1');
          const InputEventCtor = doc.defaultView?.Event || Event;
          doc.body?.dispatchEvent(new InputEventCtor('input', { bubbles: true }));
        } catch (_) {}
        imageInsertionRangeRef.current = null;
        closeImageDialog();
        addToast && addToast(decorative ? 'Decorative image inserted.' : 'Image inserted with alternative text.', 'success');
      };
      img.onerror = () => {
        if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
        setImageInsertBusy(false);
        addToast && addToast('Could not decode that image.', 'error');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      if (!mountedRef.current || runId !== imageInsertRunRef.current) return;
      setImageInsertBusy(false);
      addToast && addToast('Could not read that image.', 'error');
    };
    reader.readAsDataURL(file);
  }, [pendingImageFile, imageInsertBusy, imageDecorative, imageAltText, exportPreviewRef, addToast, closeImageDialog]);

  const applyPageMargin = React.useCallback((margin) => {
    const value = ['0.5in', '1in', '1.5in'].includes(margin) ? margin : '1in';
    try {
      const doc = exportPreviewRef.current?.contentDocument;
      if (doc?.head) {
        let style = doc.getElementById('allo-margin-style');
        if (!style) { style = doc.createElement('style'); style.id = 'allo-margin-style'; doc.head.appendChild(style); }
        style.textContent = `@media print { @page { margin: ${value}; } } body { padding-left: ${value}; padding-right: ${value}; }`;
      }
    } catch (_) {}
  }, [exportPreviewRef]);

  React.useEffect(() => {
    applyPageMargin(exportConfig.pageMargin || '1in');
  }, [applyPageMargin, exportConfig.pageMargin, showExportPreview]);

  React.useEffect(() => {
    const goal = Number.isFinite(wordGoal) && wordGoal > 0 ? wordGoal : 0;
    setWordGoalProgress({
      count: wordCount,
      goal,
      percent: goal ? Math.min(100, Math.round((wordCount / goal) * 100)) : 0,
    });
  }, [wordCount, wordGoal]);

  const refreshDocumentStats = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    setWordCount(_builderWordCount(doc));
    setHeadingOutline(_builderHeadingOutline(doc));
    setPreflightResult(null);
  }, [exportPreviewRef]);

  const runBuilderPreflight = React.useCallback((modeOverride, announce = true) => {
    const result = _builderExportPreflight(exportPreviewRef.current?.contentDocument, modeOverride || exportPreviewMode);
    setPreflightResult(result);
    if (announce && addToast) {
      if (result.errors) addToast(`Export preflight found ${result.errors} blocking issue${result.errors === 1 ? '' : 's'} and ${result.warnings} warning${result.warnings === 1 ? '' : 's'}.`, 'error');
      else if (result.warnings) addToast(`Export preflight passed with ${result.warnings} warning${result.warnings === 1 ? '' : 's'} to review.`, 'info');
      else addToast('Export preflight passed - no issues found.', 'success');
    }
    return result;
  }, [exportPreviewRef, exportPreviewMode, addToast]);

  const findNextInPreview = React.useCallback(() => {
    const needle = findQuery.trim();
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc || !needle) return;
    const win = doc.defaultView;
    const NF = win?.NodeFilter || NodeFilter;
    const walker = doc.createTreeWalker(doc.body, NF.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        return parent && !parent.closest('script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui]') && node.nodeValue
          ? NF.FILTER_ACCEPT : NF.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    if (!nodes.length) return;
    const selection = win?.getSelection();
    let startIndex = selection?.anchorNode ? nodes.indexOf(selection.anchorNode) : -1;
    let startOffset = startIndex >= 0 ? Math.max(selection.anchorOffset || 0, selection.focusOffset || 0) : 0;
    const lowerNeedle = needle.toLocaleLowerCase();
    for (let pass = 0; pass < 2; pass++) {
      for (let i = pass ? 0 : Math.max(0, startIndex); i < nodes.length; i++) {
        const from = !pass && i === startIndex ? startOffset : 0;
        const at = String(nodes[i].nodeValue || '').toLocaleLowerCase().indexOf(lowerNeedle, from);
        if (at < 0) continue;
        const range = doc.createRange();
        range.setStart(nodes[i], at);
        range.setEnd(nodes[i], at + needle.length);
        selection.removeAllRanges();
        selection.addRange(range);
        nodes[i].parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        findCursorRef.current = { node: nodes[i], offset: at + needle.length };
        return;
      }
      startIndex = 0; startOffset = 0;
    }
    addToast && addToast(`?${needle}? was not found.`, 'info');
  }, [findQuery, exportPreviewRef, addToast]);

  const replaceAllInPreview = React.useCallback(() => {
    const needle = findQuery.trim();
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc || !needle) return;
    const win = doc.defaultView;
    const NF = win?.NodeFilter || NodeFilter;
    const walker = doc.createTreeWalker(doc.body, NF.SHOW_TEXT);
    const escaped = needle.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'gi');
    let count = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('script,style,.allo-block-controls,.allo-block-remove,[data-allo-crop-ui]')) continue;
      const before = node.nodeValue || '';
      const after = before.replace(pattern, () => { count += 1; return replaceQuery; });
      if (after !== before) node.nodeValue = after;
    }
    if (count) {
      try { doc.body.dispatchEvent(new (win?.Event || Event)('input', { bubbles: true })); } catch (_) {}
      addToast && addToast(`Replaced ${count} occurrence${count === 1 ? '' : 's'}.`, 'success');
    } else addToast && addToast(`?${needle}? was not found.`, 'info');
  }, [findQuery, replaceQuery, exportPreviewRef, addToast]);

  const getCleanBuilderDocument = React.useCallback(() => {
    const doc = exportPreviewRef.current?.contentDocument;
    if (!doc?.documentElement) return null;
    const clone = doc.documentElement.cloneNode(true);
    clone.querySelectorAll('.allo-block-controls,.allo-block-remove,.a11y-inspect-badge,[data-allo-crop-ui],#a11y-inspect-styles,#allo-builder-edit-css,script').forEach((node) => node.remove());
    clone.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-allo-crop-tabindex-added]').forEach((node) => {
      const added = node.getAttribute('data-allo-crop-tabindex-added') === 'added';
      node.removeAttribute('data-allo-crop-tabindex-added');
      if (added) node.removeAttribute('tabindex');
      node.removeAttribute('aria-keyshortcuts');
    });
    const title = String((exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle)) || doc.title || 'AlloFlow Document').trim();
    return { doc, clone, title, html: '<!DOCTYPE html>\n' + clone.outerHTML };
  }, [exportPreviewRef, exportConfig]);

  const downloadBuilderBlob = React.useCallback((blob, options = {}) => {
    if (!blob) throw new Error('The export did not produce a file.');
    const clean = getCleanBuilderDocument();
    const safeTitle = String(clean?.title || 'document').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').substring(0, 60) || 'document';
    const extension = String(options.extension || 'bin').replace(/^\./, '');
    const fileName = options.fileName || `${safeTitle}${options.suffix || ''}.${extension}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    try { if (typeof onExportSuccess === 'function') onExportSuccess({ kind: 'file', format: extension, fileName }); } catch (_) {}
    return fileName;
  }, [getCleanBuilderDocument, onExportSuccess]);

  const runPackageExport = React.useCallback(async (kind) => {
    if (altExportBusy) return;
    const handler = kind === 'qti' ? handleExportQTI : (kind === 'h5p' ? handleExportH5P : handleExportIMS);
    if (typeof handler !== 'function') { addToast && addToast(`${kind.toUpperCase()} export is unavailable right now.`, 'error'); return; }
    setAltExportBusy(kind);
    try {
      if (kind === 'qti' || kind === 'h5p') {
        const activities = kind === 'qti' ? qtiAssessments : h5pActivities;
        const selectedKey = kind === 'qti' ? selectedQtiKey : selectedH5PKey;
        const selected = activities.find((entry) => entry.key === selectedKey) || activities[activities.length - 1];
        if (!selected) throw new Error(`Choose an activity before exporting ${kind.toUpperCase()}.`);
        const succeeded = await handler({ generatedContent: selected.item });
        if (succeeded === false) return;
      } else {
        const clean = getCleanBuilderDocument();
        if (!clean) throw new Error('The editable preview is not ready.');
        await handler({ liveHtml: clean.html, liveTitle: clean.title });
      }
      try { if (typeof onExportSuccess === 'function') onExportSuccess({ kind: 'package', format: kind }); } catch (_) {}
    }
    catch (error) { addToast && addToast(`${kind.toUpperCase()} export failed: ${error?.message || 'unknown error'}`, 'error'); }
    finally { if (mountedRef.current) setAltExportBusy(''); }
  }, [altExportBusy, handleExportQTI, handleExportH5P, handleExportIMS, addToast, qtiAssessments, selectedQtiKey, h5pActivities, selectedH5PKey, getCleanBuilderDocument, onExportSuccess]);

  const runOfficeExport = React.useCallback(async (format) => {
    if (altExportBusy) return;
    const api = window.AlloModules?.AccessibleOfficeExport;
    const doc = exportPreviewRef.current?.contentDocument;
    if (!api || typeof api.build !== 'function') { addToast && addToast('The accessible Office exporter is still loading. Try again in a moment.', 'info'); return; }
    if (!doc) return;
    const preflight = runBuilderPreflight(format, false);
    if (preflight.errors) { addToast && addToast('Office export stopped: fix the blocking preflight issues first.', 'error'); return; }
    setAltExportBusy(format);
    try {
      const clean = getCleanBuilderDocument();
      if (!clean) throw new Error('The editable preview is not ready.');
      const result = await api.build({ html: clean.html, title: clean.title, format });
      downloadBuilderBlob(result.blob, { fileName: result.fileName, extension: format });
      addToast && addToast(result.message, 'success');
    } catch (error) {
      addToast && addToast(`${format.toUpperCase()} export failed: ${error?.message || 'unknown error'}`, 'error');
    } finally { if (mountedRef.current) setAltExportBusy(''); }
  }, [altExportBusy, exportPreviewRef, runBuilderPreflight, addToast, getCleanBuilderDocument, downloadBuilderBlob]);

  const runExportFromPreview = React.useCallback(async () => {
    const preflight = runBuilderPreflight(exportPreviewMode, false);
    if (preflight.errors) { addToast && addToast('Export stopped: fix the blocking preflight issues first.', 'error'); return; }
    if (exportActionLockRef.current) return;
    exportActionLockRef.current = true;
    setExportActionBusy(true);
    try {
      await executeExportFromPreview();
      try { if (typeof onExportSuccess === 'function') onExportSuccess({ kind: 'builder', format: exportPreviewMode }); } catch (_) {}
    } catch (error) {
      if (mountedRef.current) addToast && addToast('Export failed. The builder is still open so you can try again.', 'error');
    } finally {
      exportActionLockRef.current = false;
      if (mountedRef.current) setExportActionBusy(false);
    }
  }, [executeExportFromPreview, runBuilderPreflight, exportPreviewMode, addToast, onExportSuccess]);

  const handleRadioGroupKeyDown = React.useCallback((e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const radios = Array.from(e.currentTarget.querySelectorAll('[role="radio"]:not([disabled])'));
    if (!radios.length) return;
    e.preventDefault();
    const current = Math.max(0, radios.indexOf(document.activeElement));
    let next = current;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = radios.length - 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + radios.length) % radios.length;
    else next = (current + 1) % radios.length;
    radios[next].focus();
    radios[next].click();
  }, []);
  const brandProfiles = React.useMemo(() => {
    try {
      const bp = window.AlloModules && window.AlloModules.BrandProfile;
      return bp && typeof bp.listBrandProfiles === 'function' ? (bp.listBrandProfiles() || []) : [];
    } catch (e) { return []; }
  }, [showExportPreview]);
  const noBrandsYet = brandProfiles.length === 0;
  const openBrandEditor = React.useCallback(() => {
    if (typeof setShowBrandProfileEditor === 'function') setShowBrandProfileEditor(true);
  }, [setShowBrandProfileEditor]);

  const hasGlossary = (history || []).some(h => h && h.type === 'glossary');
  const hasTimeline = (history || []).some(h => h && h.type === 'timeline');
  const hasBrainstorm = (history || []).some(h => h && h.type === 'brainstorm');
  const hasConceptSort = (history || []).some(h => h && h.type === 'concept-sort');
  const hasAssessmentContent = (history || []).some(h => h && (h.type === 'quiz' || h.type === 'assessment' || h.type === 'stem-assessment'));
  const showDisplayModes = hasGlossary || hasTimeline || hasBrainstorm || hasConceptSort;

  if (!showExportPreview) return null;

  return (
          <div className="allo-docsuite fixed inset-0 z-[200] bg-black/60 flex items-stretch justify-center p-4" role="presentation"
            onClick={(e) => { if (e.target === e.currentTarget) setShowExportPreview(false); }}>
            {pendingImageFile && (
              <div className="allo-docsuite fixed inset-0 z-[210] bg-black/70 flex items-center justify-center p-4" role="presentation"
                onClick={(e) => { if (e.target === e.currentTarget) closeImageDialog(); }}
                >
                <div ref={imageDialogRef} tabIndex={-1} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl focus:outline-none" role="dialog" aria-modal="true" aria-labelledby="image-description-title" aria-describedby="image-description-help">
                  <h3 id="image-description-title" className="text-lg font-black text-slate-900">Describe this image</h3>
                  <p id="image-description-help" className="mt-1 text-sm text-slate-700">Alternative text should communicate the image’s purpose to someone who cannot see it.</p>
                  <p className="mt-2 text-xs font-medium text-slate-600 truncate" title={pendingImageFile.name}>{pendingImageFile.name}</p>
                  <label htmlFor="builder-image-alt" className="mt-4 block text-sm font-bold text-slate-800">Alternative text</label>
                  <textarea id="builder-image-alt" ref={imageAltInputRef} value={imageAltText} disabled={imageDecorative} rows={3}
                    onChange={(e) => { setImageAltText(e.target.value); setImageAltError(''); }}
                    aria-describedby="builder-image-alt-help builder-image-alt-error" aria-invalid={imageAltError ? 'true' : undefined}
                    className="mt-1 w-full rounded-lg border border-slate-400 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-100" />
                  <p id="builder-image-alt-help" className="mt-1 text-xs text-slate-600">Describe what matters in this document, not every visual detail.</p>
                  <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50">
                    <input type="checkbox" checked={imageDecorative} onChange={(e) => { setImageDecorative(e.target.checked); setImageAltError(''); }} />
                    <span><strong>Decorative image</strong> — it adds no information and should be skipped by screen readers.</span>
                  </label>
                  <p id="builder-image-alt-error" className="mt-2 min-h-5 text-sm font-bold text-red-700" role="alert">{imageAltError}</p>
                  <div className="mt-4 flex justify-end gap-3">
                    <button type="button" onClick={closeImageDialog} className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancel</button>
                    <button type="button" onClick={insertPendingImage} disabled={imageInsertBusy} aria-busy={imageInsertBusy} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60">{imageInsertBusy ? 'Inserting image...' : 'Insert image'}</button>
                  </div>
                </div>
              </div>
            )}
            <div ref={exportDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="document-builder-title" className="bg-white rounded-2xl shadow-2xl flex flex-col lg:flex-row w-full max-w-[95vw] max-h-[95vh] overflow-y-auto lg:overflow-hidden focus:outline-none" inert={pendingImageFile ? true : undefined} aria-hidden={pendingImageFile ? 'true' : undefined} onClick={(e) => e.stopPropagation()}>
              {/* Left Panel — Settings */}
              <div className="w-full lg:w-72 shrink-0 bg-gradient-to-b from-slate-50 to-white border-b lg:border-b-0 lg:border-r border-slate-200 overflow-visible lg:overflow-y-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 id="document-builder-title" className="text-sm font-black text-slate-800 flex items-center gap-2">🛠️ Document Builder</h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { if (typeof window.AlloToggleTheme === 'function') window.AlloToggleTheme(); }} className="p-1.5 rounded-full hover:bg-indigo-50 text-slate-600 transition-colors text-sm" aria-label={t('a11y.toggle_theme') || 'Toggle color theme'} title={theme === 'contrast' ? (t('theme.high_contrast') || 'High Contrast') : theme === 'dark' ? (t('theme.dark') || 'Dark Mode') : (t('theme.light') || 'Light Mode')}><span aria-hidden="true">{theme === 'contrast' ? '👁' : theme === 'dark' ? '🌙' : '☀️'}</span></button>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">{exportPreviewMode === 'worksheet' ? 'Worksheet' : exportPreviewMode === 'html' ? 'HTML' : exportPreviewMode === 'slides' ? 'Slides' : 'PDF'}</span>
                    <button onClick={() => setShowExportPreview(false)} className="p-2 ml-1 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" data-help-key="doc_builder_close_btn" aria-label={t("a11y.close_doc_builder")}><X size={20} /></button>
                  </div>
                </div>
                <button type="button" aria-controls="document-builder-preview" onClick={() => exportPreviewRef.current?.focus()} className="sr-only focus:not-sr-only focus:relative focus:z-10 focus:rounded focus:bg-indigo-700 focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white">Skip to editable preview</button>
                {exportPreviewSource === 'remediation' && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-800" role="status">
                    <span className="font-bold">♿ {t('export_preview.remediation_banner_title') || 'Editing the remediated document.'}</span>{' '}
                    {t('export_preview.remediation_banner_body') || 'Your edits here are saved back into it when you close the builder, so the Tagged PDF / Word / PowerPoint downloads include them.'}
                  </div>
                )}

                {/* ── SECTION: Quick Start ── */}
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1"><span className="flex-1 h-px bg-indigo-100"></span>Quick Start<span className="flex-1 h-px bg-indigo-100"></span></h3>

                {/* Presets */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Presets</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(BUILT_IN_PRESETS).map(([key, preset]) => (
                      <button key={key} onClick={() => applyExportPreset(preset)}
                        className="px-2 py-1 bg-white border border-slate-400 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 transition-all"
                        title={`Apply "${preset.name}" preset`}
                      >{preset.emoji} {preset.name}</button>
                    ))}
                    {Object.entries(exportPresets).map(([key, preset]) => (
                      <div key={key} className="flex items-center gap-0.5">
                        <button onClick={() => applyExportPreset(preset)}
                          className="px-2 py-1 bg-white border border-violet-600 rounded-l-lg text-[11px] font-bold text-violet-600 hover:bg-violet-50 transition-all"
                          title={`Apply "${preset.name}" preset`}
                        >{preset.emoji} {preset.name}</button>
                        <button onClick={() => deleteExportPreset(key)}
                          className="min-w-6 min-h-6 px-1 py-1 bg-white border border-violet-600 border-l-0 rounded-r-lg text-[11px] text-red-700 hover:text-red-800 hover:bg-red-50 transition-all" aria-label={`Delete "${preset.name}" preset`}
                          title={`Delete "${preset.name}" preset`}
                        ><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={async () => {
                    const name = await promptForBuilderText('Enter a name for this export preset.', '', {
                      title: 'Save export preset', confirmText: 'Save preset', cancelText: 'Cancel',
                      placeholder: 'Preset name', maxLength: 80,
                      validate: (value) => value.trim() ? null : 'Enter a preset name.',
                    });
                    if (name && name.trim()) saveExportPreset(name.trim());
                  }} className="mt-1.5 w-full px-2 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all">
                    + Save Current as Preset
                  </button>
                </div>

                {/* Export Mode */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Format</div>
                  <div className="flex gap-1" role="radiogroup" aria-label="Export format" onKeyDown={handleRadioGroupKeyDown}>
                    {[['print', '📄 PDF'], ['worksheet', '📝 Worksheet'], ['html', '💻 HTML'], ['slides', '📊 Slides']].map(([m, label]) => (
                      <button key={m} role="radio" aria-checked={exportPreviewMode === m} tabIndex={exportPreviewMode === m ? 0 : -1} onClick={() => setExportPreviewMode(m)} className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${exportPreviewMode === m ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* ── SECTION: Appearance ── */}
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2"><span className="flex-1 h-px bg-indigo-100"></span>Appearance<span className="flex-1 h-px bg-indigo-100"></span></h3>

                {/* Style */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
                    <span>Style</span>
                    {setShowBrandProfileEditor && (
                      <button
                        type="button"
                        onClick={openBrandEditor}
                        className="text-[10px] font-semibold text-rose-700 hover:text-rose-800 underline-offset-2 hover:underline normal-case"
                        title="Create, edit, or delete school brand profiles"
                      >🏷️ Manage brand profiles</button>
                    )}
                  </div>
                  {/* First-time banner: brand setup is most discoverable HERE because this is
                      where brands actually get applied. Shown only when no profiles exist. */}
                  {noBrandsYet && setShowBrandProfileEditor && (
                    <button
                      type="button"
                      onClick={openBrandEditor}
                      className="w-full mb-1.5 text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-300 text-rose-800 hover:border-rose-400 hover:from-rose-100 hover:to-orange-100 transition-colors"
                    >🏷️ <strong>First time?</strong> Set up your school brand → colors, fonts, logo for branded exports</button>
                  )}
                  <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label="Document style" onKeyDown={handleRadioGroupKeyDown}>
                    {Object.entries(STYLE_SEEDS).filter(([, s]) => s.cssVars).map(([key, s]) => (
                      <button key={key} role="radio" aria-checked={exportTheme === key} tabIndex={exportTheme === key ? 0 : -1} onClick={() => setExportTheme(key)}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === key ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-100'}`}
                      >{s.emoji} {s.name}</button>
                    ))}
                    {/* User brand profiles as selectable themes — clicking one applies its
                        CSS vars via doc_pipeline_source.jsx:16325 BrandProfile fallback. */}
                    {brandProfiles.map(p => (
                      <button key={p.id} role="radio" aria-checked={exportTheme === p.id} tabIndex={exportTheme === p.id ? 0 : -1} onClick={() => setExportTheme(p.id)}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${exportTheme === p.id ? 'bg-rose-600 text-white ring-2 ring-rose-300' : 'bg-white border border-rose-400 text-rose-700 hover:bg-rose-50'}`}
                        title="School brand profile"
                      >🏷️ {p.name || 'Brand'}</button>
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Typography</div>
                  {/* Font dropdown (2026-06-11): the builder previously had NO
                      font picker — only the use-app-font checkbox. Values:
                      'theme' = the theme's own font, 'app' = follow the app
                      reading-support font, or an explicit FONT_OPTIONS id
                      (incl. OpenDyslexic/Lexend/Atkinson — the @font-face
                      plumbing ships with the export). Rides exportConfig so
                      presets save/restore it. */}
                  <label className="flex items-center gap-2 text-xs text-slate-700 mb-2">
                    <span className="text-[11px] text-slate-600 shrink-0">Font:</span>
                    <select
                      value={exportConfig.fontId || (exportConfig.useAppFont ? 'app' : 'theme')}
                      onChange={(e) => { const v = e.target.value; setExportConfigAndRefresh(p => ({ ...p, fontId: v, useAppFont: v === 'app' })); }}
                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      data-help-key="doc_builder_font_select" aria-label={t('a11y.export_font') || 'Export font family'}
                    >
                      <option value="theme">Theme font (default)</option>
                      <option value="app">My app font ({FONT_OPTIONS.find(f => f.id === selectedFont)?.label || 'Default'})</option>
                      {FONT_OPTIONS.filter(f => f.id !== 'default').map(f => (
                        <option key={f.id} value={f.id}>{f.label}{f.category === 'accessibility' ? ' ♿' : ''}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-600 shrink-0">Size:</span>
                    <input type="range" min={12} max={24} value={exportConfig.fontSize} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, fontSize: parseInt(e.target.value) }))}
                      className="flex-1 accent-indigo-600" data-help-key="doc_builder_font_size_slider" aria-label={t("a11y.font_size")} />
                    <span className="text-xs font-mono text-slate-600 w-8">{exportConfig.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-600 shrink-0">Margins:</span>
                    <div className="flex gap-1 flex-1">
                      {[
                        { label: 'Narrow', val: '0.5in' },
                        { label: 'Normal', val: '1in' },
                        { label: 'Wide', val: '1.5in' },
                      ].map(m => (
                        <button key={m.label} type="button" aria-pressed={(exportConfig.pageMargin || '1in') === m.val} onClick={() => {
                          applyPageMargin(m.val);
                          setExportConfigAndRefresh(p => ({ ...p, pageMargin: m.val }));
                        }}
                          className={`flex-1 text-[11px] font-bold py-1 border rounded transition-colors ${(exportConfig.pageMargin || '1in') === m.val ? 'bg-indigo-600 text-white border-indigo-700' : 'text-slate-600 bg-white border-slate-400 hover:bg-indigo-50 hover:text-indigo-700'}`}
                          title={`${m.label} margins (${m.val})`} aria-label={`Set ${m.label} page margins`}>{m.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Word count + goal */}
                <div className="bg-slate-50 rounded-lg border border-slate-400 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Word Count</span>
                    <span className="text-[11px] font-mono text-slate-600" aria-live="polite">
                      {wordCount.toLocaleString()} words
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[11px] text-slate-600 shrink-0" htmlFor="word-goal-input">Goal:</label>
                    <input type="number" id="word-goal-input" min="0" step="50" placeholder="e.g. 500" value={wordGoal || ''}
                      className="flex-1 text-[11px] border border-slate-400 rounded px-2 py-1 bg-white"
                      aria-label={t("a11y.target_word_count")}
                      onChange={(e) => setWordGoal(Math.max(0, parseInt(e.target.value, 10) || 0))} />
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden" role="progressbar" aria-label={t("a11y.word_count_progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={wordGoalProgress.percent} aria-valuetext={wordGoalProgress.goal > 0 ? `${wordGoalProgress.count} of ${wordGoalProgress.goal} words (${wordGoalProgress.percent}%)` : 'No word-count goal set'}>
                    <div id="word-goal-bar" className="h-full rounded-full transition-all duration-300" style={{ width: wordGoalProgress.percent + '%', background: wordGoalProgress.percent >= 100 ? '#16a34a' : wordGoalProgress.percent >= 75 ? '#2563eb' : '#d97706' }}></div>
                  </div>
                  <div id="word-goal-label" className="text-[11px] text-slate-600 mt-0.5">{wordGoalProgress.goal > 0 ? `${wordGoalProgress.count} / ${wordGoalProgress.goal} (${wordGoalProgress.percent}%)` : ''}</div>
                  <div className="text-[11px] text-slate-600 mt-1">⌨ Ctrl+1/2/3 = headings · Ctrl+K = link · Ctrl+Shift+L = list</div>
                </div>

                {/* ── SECTION: Word Art ── */}
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2 pt-1"><span className="flex-1 h-px bg-indigo-100"></span>Word Art<span className="flex-1 h-px bg-indigo-100"></span></h3>
                <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-lg border border-amber-200 p-2 space-y-2">
                  <input type="text" id="wordart-text-input" placeholder={t("placeholders.word_art_text_input")} defaultValue="" className="w-full text-xs border border-amber-300 rounded px-2 py-1.5 bg-white focus:border-amber-500 outline-none" aria-label={t("a11y.word_art_text")} />
                  <div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Style</div>
                    <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={t("a11y.word_art_style")} onKeyDown={handleRadioGroupKeyDown}>
                      {[['goldFoil','✨','Gold'],['neonGlow','💡','Neon'],['retroArcade','🕹️','Retro'],['chalkboard','🖍️','Chalk'],['embossed','🏛️','3D'],['rainbow','🌈','Rainbow']].map(([key, emoji, label], i) => (
                        <button key={key} type="button" role="radio" aria-checked={i === 0} tabIndex={i === 0 ? 0 : -1} data-wa-preset={key}
                          className="wordart-preset-btn text-[10px] font-bold py-1.5 px-1 rounded-md border text-slate-700 transition-all"
                          style={i === 0 ? { background: '#b45309', color: 'white', borderColor: '#b45309' } : { background: 'white', borderColor: '#fcd34d' }}
                          onClick={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (!parent) return;
                            parent.querySelectorAll('.wordart-preset-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.tabIndex = -1; b.style.background = 'white'; b.style.color = ''; b.style.borderColor = '#fcd34d'; });
                            e.currentTarget.setAttribute('aria-checked', 'true');
                            e.currentTarget.tabIndex = 0;
                            e.currentTarget.style.background = '#b45309';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = '#f59e0b';
                          }}
                        >{emoji} {label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Size</div>
                      <div className="flex gap-0.5" role="radiogroup" aria-label={t("a11y.word_art_size")} onKeyDown={handleRadioGroupKeyDown}>
                        {['S','M','L','XL'].map((s) => (
                          <button key={s} type="button" role="radio" aria-checked={s === 'L'} tabIndex={s === 'L' ? 0 : -1} data-wa-size={s}
                            className="wordart-size-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all"
                            style={s === 'L' ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' } : { background: 'white', color: '#475569' }}
                            onClick={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (!parent) return;
                              parent.querySelectorAll('.wordart-size-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.tabIndex = -1; b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0'; });
                              e.currentTarget.setAttribute('aria-checked', 'true');
                              e.currentTarget.tabIndex = 0;
                              e.currentTarget.style.background = '#4f46e5';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.borderColor = '#4f46e5';
                            }}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-slate-600 uppercase mb-1">Align</div>
                      <div className="flex gap-0.5" role="radiogroup" aria-label={t("a11y.word_art_alignment")} onKeyDown={handleRadioGroupKeyDown}>
                        {[['left','⇤'],['center','⇔'],['right','⇥']].map(([a, icon]) => (
                          <button key={a} type="button" role="radio" aria-checked={a === 'center'} tabIndex={a === 'center' ? 0 : -1} data-wa-align={a} aria-label={`Align ${a}`}
                            className="wordart-align-btn flex-1 text-[10px] font-bold py-1 rounded border border-slate-400 transition-all"
                            style={a === 'center' ? { background: '#4f46e5', color: 'white', borderColor: '#4f46e5' } : { background: 'white', color: '#475569' }}
                            onClick={(e) => {
                              const parent = e.currentTarget.parentElement;
                              if (!parent) return;
                              parent.querySelectorAll('.wordart-align-btn').forEach(b => { b.setAttribute('aria-checked', 'false'); b.tabIndex = -1; b.style.background = 'white'; b.style.color = '#475569'; b.style.borderColor = '#e2e8f0'; });
                              e.currentTarget.setAttribute('aria-checked', 'true');
                              e.currentTarget.tabIndex = 0;
                              e.currentTarget.style.background = '#4f46e5';
                              e.currentTarget.style.color = 'white';
                              e.currentTarget.style.borderColor = '#4f46e5';
                            }}
                          >{icon}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => {
                      const textInput = document.getElementById('wordart-text-input');
                      const text = textInput && textInput.value ? textInput.value.trim() : '';
                      if (!text) { addToast('Please enter word art text first', 'info'); return; }
                      const presetBtn = document.querySelector('.wordart-preset-btn[aria-checked="true"]');
                      const sizeBtn = document.querySelector('.wordart-size-btn[aria-checked="true"]');
                      const alignBtn = document.querySelector('.wordart-align-btn[aria-checked="true"]');
                      const preset = presetBtn ? presetBtn.getAttribute('data-wa-preset') : 'goldFoil';
                      const size = sizeBtn ? sizeBtn.getAttribute('data-wa-size') : 'L';
                      const align = alignBtn ? alignBtn.getAttribute('data-wa-align') : 'center';
                      const iframe = exportPreviewRef.current;
                      const doc = iframe && iframe.contentDocument;
                      if (!doc || !doc.body) { addToast('Preview not ready yet', 'error'); return; }
                      let html = '';
                      if (window.AlloWordArt && typeof window.AlloWordArt.render === 'function') {
                        html = window.AlloWordArt.render(text, preset, size, align);
                      } else {
                        const P = { goldFoil: 'background:linear-gradient(135deg,#b45309 0%,#f59e0b 30%,#fde68a 50%,#f59e0b 70%,#92400e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;', neonGlow: 'color:#0891b2;text-shadow:0 0 4px #06b6d4,0 0 8px #06b6d4,0 0 15px #0e7490;font-weight:900;', retroArcade: "color:#fef2f2;text-shadow:3px 3px 0 #dc2626,6px 6px 0 #1e3a8a;font-weight:900;font-family:Impact,'Arial Black',sans-serif;letter-spacing:0.03em;", chalkboard: "color:#fef3c7;text-shadow:0 0 2px #fbbf24,2px 2px 0 rgba(0,0,0,0.2);font-family:'Caveat','Comic Sans MS',cursive;font-weight:700;letter-spacing:0.05em;", embossed: 'color:#475569;text-shadow:-1px -1px 0 rgba(255,255,255,0.8),1px 1px 0 rgba(0,0,0,0.35),2px 2px 4px rgba(0,0,0,0.2);font-weight:900;', rainbow: 'background:linear-gradient(90deg,#dc2626,#ea580c,#ca8a04,#16a34a,#0891b2,#4f46e5,#9333ea);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900;' };
                        const sz = { S: '1.5rem', M: '2.5rem', L: '4rem', XL: '6rem' };
                        const safe = String(text).replace(/[<>&]/g, (c) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&amp;');
                        const inner = '<span style="display:inline-block;font-size:' + (sz[size] || sz.L) + ';line-height:1.1;' + (P[preset] || P.goldFoil) + '">' + safe + '</span>';
                        const wrapped = preset === 'chalkboard' ? '<span style="display:inline-block;background:#14532d;padding:1rem 1.5rem;border-radius:8px;border:3px solid #78350f;">' + inner + '</span>' : inner;
                        html = '<div class="alloflow-wordart" data-wa-preset="' + preset + '" data-wa-size="' + size + '" data-wa-align="' + align + '" role="heading" aria-level="2" style="margin:1.5em 0;text-align:' + align + '">' + wrapped + '</div>';
                      }
                      if (!html) { addToast('Could not render word art', 'error'); return; }
                      iframe.contentWindow.focus();
                      try { doc.designMode = 'on'; } catch (e) {}
                      const sel = doc.getSelection();
                      const bodyEl = doc.body;
                      const anchor = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).commonAncestorContainer : null;
                      const cursorInsideBody = anchor && (anchor === bodyEl || (bodyEl.contains && bodyEl.contains(anchor.nodeType === 1 ? anchor : anchor.parentNode)));
                      if (!cursorInsideBody) {
                        const main = doc.querySelector('main') || bodyEl;
                        const range = doc.createRange();
                        range.selectNodeContents(main);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                      }
                      let inserted = false;
                      try { inserted = doc.execCommand('insertHTML', false, html); } catch (e) {}
                      if (!inserted) {
                        const wrap = doc.createElement('div');
                        wrap.innerHTML = html;
                        const node = wrap.firstChild;
                        if (node) doc.body.appendChild(node);
                      }
                      try { if (doc.body) { doc.body.setAttribute('data-allo-user-edited', '1'); doc.body.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true })); } } catch (_) {}
                      if (textInput) textInput.value = '';
                      addToast('✨ Word art inserted', 'success');
                    }}
                    className="w-full px-3 py-2 bg-gradient-to-r from-amber-700 to-rose-700 hover:from-amber-800 hover:to-rose-800 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm hover:shadow-md"
                  >✨ Insert Word Art</button>
                </div>

                {/* ── SECTION: Content ── */}
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2"><span className="flex-1 h-px bg-indigo-100"></span>Content<span className="flex-1 h-px bg-indigo-100"></span></h3>

                {/* Resource Toggles */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-bold text-slate-600 uppercase">Include Resources</div>
                    {(() => {
                      const resourceKeys = ['includeAnalysis','includeSimplified','includeGlossary','includeQuiz','includeOutline','includeFaq','includeSentenceFrames','includeImage','includeMath','includeDbq','includeLessonPlan','includeUdlAdvice','includeBrainstorm'];
                      const allOn = resourceKeys.every(k => exportConfig[k]);
                      return history.some(h => h) && (
                        <button onClick={() => {
                          const update = {};
                          resourceKeys.forEach(k => { update[k] = !allOn; });
                          setExportConfigAndRefresh(p => ({ ...p, ...update }));
                        }} className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 transition-colors">
                          {allOn ? 'Deselect All' : 'Select All'}
                        </button>
                      );
                    })()}
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const teacherOnlyDefault = new Set(['includeAnalysis', 'includeUdlAdvice', 'includeBrainstorm']);
                      const available = [
                        ['includeAnalysis', '📊 Source Analysis', 'analysis'],
                        ['includeSimplified', '📖 Leveled Text', 'simplified'],
                        ['includeGlossary', '📚 Glossary', 'glossary'],
                        ['includeQuiz', '❓ Quiz', 'quiz'],
                        ['includeOutline', '🗂️ Graphic Organizer', 'outline'],
                        ['includeFaq', '💬 FAQ', 'faq'],
                        ['includeSentenceFrames', '✍️ Sentence Frames', 'sentence-frames'],
                        ['includeImage', '🎨 Visual Support', 'image'],
                        ['includeMath', '🔢 Math', 'math'],
                        ['includeDbq', '📜 DBQ', 'dbq'],
                        ['includeLessonPlan', '📋 Lesson Plan', 'lesson-plan'],
                        ['includeUdlAdvice', '🧩 UDL Advice', 'udl-advice'],
                        ['includeBrainstorm', '💡 Brainstorm', 'brainstorm'],
                      ].filter(([,, type]) => history.some(h => h && h.type === type));
                      if (available.length === 0) return (
                        <p className="text-[11px] text-slate-600 italic px-1 py-2">No resources generated yet. Generate resources first, then choose which to include in your document.</p>
                      );
                      return available.map(([key, label]) => {
                        const isTeacherOnly = teacherOnlyDefault.has(key);
                        const tooltip = isTeacherOnly
                          ? 'Always included in teacher copy. Toggle to also include in student copy.'
                          : '';
                        return (
                          <label key={key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" title={tooltip}>
                            <input type="checkbox" checked={exportConfig[key]} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, [key]: e.target.checked }))} className="rounded" />
                            <span>{label}{isTeacherOnly && <span className="ml-1 text-[11px] text-indigo-700 font-bold">(also in student copy)</span>}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Skipped interactive resources notice */}
                {(() => {
                  const skipped = getSkippedResources();
                  if (skipped.length === 0) return null;
                  // Adventure/persona DO have static permanent products — they
                  // just live in their own flows (finished storybook / private
                  // session page), so point there instead of dead-ending.
                  const skippedTypes = new Set((Array.isArray(history) ? history : [])
                    .filter(item => item && (item.type === 'adventure' || item.type === 'persona'))
                    .map(item => item.type));
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <p className="text-[11px] font-bold text-amber-700 mb-1">Interactive resources not included:</p>
                      <p className="text-[11px] text-amber-600">{skipped.join(', ')}</p>
                      <p className="text-[11px] text-amber-700 mt-1 italic">These are interactive tools that can't be rendered as static documents.</p>
                      {skippedTypes.has('adventure') && <p className="text-[11px] text-amber-800 mt-1">📖 Adventure stories have their own export: open the adventure and use <strong>Export Storybook</strong> for a finished, self-contained HTML book (optionally narrated with saved TTS).</p>}
                      {skippedTypes.has('persona') && <p className="text-[11px] text-amber-800 mt-1">🎭 Persona conversations: use <strong>Save private session</strong> in the persona view — downloads a private JSON artifact plus a read-anywhere HTML transcript with narration.</p>}
                    </div>
                  );
                })()}

                {/* ── SECTION: Export ── */}
                <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[2px] flex items-center gap-2"><span className="flex-1 h-px bg-indigo-100"></span>Export<span className="flex-1 h-px bg-indigo-100"></span></h3>

                {/* Additional Options */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Options</div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input type="checkbox" checked={exportConfig.includeTeacherKey} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, includeTeacherKey: e.target.checked }))} className="rounded" />
                      📎 Teacher Answer Key
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input type="checkbox" checked={exportConfig.includeStudentResponses} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, includeStudentResponses: e.target.checked }))} className="rounded" />
                      📝 Student Responses
                    </label>
                    {/* Assessment mode (Aaron 2026-07-01): interactive quizzes self-grade via a hidden
                        data-correct marker per question — anyone can read it in view-source. Fine for
                        practice; not for a graded test. This strips the markers + self-check button and
                        suppresses the teacher key, while answers still save/submit normally. */}
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5" title="For graded work: removes the hidden self-check answers and the 'Check my answers' button from the exported file, and leaves the teacher key out even if it's checked above. Students can still fill in and save/submit their answers — they just can't look up or self-grade against the key.">
                      <input type="checkbox" checked={exportConfig.assessmentMode === true} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, assessmentMode: e.target.checked }))} className="rounded" />
                      🔒 Assessment mode (no embedded answers)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input type="checkbox" checked={exportConfig.singleFileHtml} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, singleFileHtml: e.target.checked }))} className="rounded" />
                      📄 Single file (.html, no zip)
                    </label>
                  </div>
                </div>

                {/* Display Modes — switches the rendered layout for specific resource types */}
                {showDisplayModes && (
                  <div>
                    <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">Display modes</div>

                    {/* Glossary display: table / flash cards / language cards */}
                    {hasGlossary && (
                      <div className={`mb-2 ${exportConfig.includeGlossary ? '' : 'opacity-50'}`}>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1 px-1">Glossary</div>
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="glossaryDisplayMode" checked={(exportConfig.glossaryDisplayMode || 'table') === 'table'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, glossaryDisplayMode: 'table' }))} disabled={!exportConfig.includeGlossary} />
                            Table (default)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="glossaryDisplayMode" checked={exportConfig.glossaryDisplayMode === 'flash-cards'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, glossaryDisplayMode: 'flash-cards' }))} disabled={!exportConfig.includeGlossary} />
                            🃏 Flash cards (fold-and-cut for paper, flip for digital)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="glossaryDisplayMode" checked={exportConfig.glossaryDisplayMode === 'language-cards'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, glossaryDisplayMode: 'language-cards' }))} disabled={!exportConfig.includeGlossary} />
                            🌐 Language cards (emphasizes translations)
                          </label>
                        </div>
                        {/* Image size — only relevant for table mode (cards have their own sizing). */}
                        {(exportConfig.glossaryDisplayMode || 'table') === 'table' && (
                          <div className="mt-2 pl-1">
                            <div className="text-[10px] font-semibold text-slate-500 mb-1">Image size</div>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { v: 'small',  label: 'S',  px: 40 },
                                { v: 'medium', label: 'M',  px: 64 },
                                { v: 'large',  label: 'L',  px: 96 },
                                { v: 'xl',     label: 'XL', px: 140 },
                              ].map(opt => {
                                const cur = exportConfig.glossaryImageSize || 'medium';
                                const isActive = cur === opt.v;
                                return (
                                  <button
                                    key={opt.v}
                                    type="button"
                                    disabled={!exportConfig.includeGlossary}
                                    onClick={() => setExportConfigAndRefresh(p => ({ ...p, glossaryImageSize: opt.v }))}
                                    title={opt.label + ' (' + opt.px + ' px)'}
                                    aria-label={'Glossary image size ' + opt.label + ' ' + opt.px + ' pixels'}
                                    aria-pressed={isActive}
                                    className={'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ' + (isActive
                                      ? 'bg-emerald-600 text-white border-emerald-700'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50')}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timeline display: list / cuttable strips */}
                    {hasTimeline && (
                      <div className="mb-2">
                        <div className="text-[11px] font-semibold text-slate-700 mb-1 px-1">Timeline</div>
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="timelineDisplayMode" checked={(exportConfig.timelineDisplayMode || 'list') === 'list'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, timelineDisplayMode: 'list' }))} />
                            List (default)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="timelineDisplayMode" checked={exportConfig.timelineDisplayMode === 'cuttable-strips'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, timelineDisplayMode: 'cuttable-strips' }))} />
                            ✂ Cuttable chronology strips
                          </label>
                        </div>
                        {/* Image size — same SMLXL pattern as glossary. Affects both list + strips modes. */}
                        <div className="mt-2 pl-1">
                          <div className="text-[10px] font-semibold text-slate-500 mb-1">Image size</div>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { v: 'small',  label: 'S',  px: 48 },
                              { v: 'medium', label: 'M',  px: 64 },
                              { v: 'large',  label: 'L',  px: 96 },
                              { v: 'xl',     label: 'XL', px: 140 },
                            ].map(opt => {
                              const cur = exportConfig.timelineImageSize || 'medium';
                              const isActive = cur === opt.v;
                              return (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => setExportConfigAndRefresh(p => ({ ...p, timelineImageSize: opt.v }))}
                                  title={opt.label + ' (' + opt.px + ' px)'}
                                  aria-label={'Timeline image size ' + opt.label + ' ' + opt.px + ' pixels'}
                                  aria-pressed={isActive}
                                  className={'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ' + (isActive
                                    ? 'bg-indigo-600 text-white border-indigo-700'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-indigo-50')}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Brainstorm display: grid / mind-map */}
                    {hasBrainstorm && (
                      <div className={`mb-2 ${exportConfig.includeBrainstorm ? '' : 'opacity-50'}`}>
                        <div className="text-[11px] font-semibold text-slate-700 mb-1 px-1">Brainstorm</div>
                        <div className="space-y-0.5">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="brainstormDisplayMode" checked={(exportConfig.brainstormDisplayMode || 'grid') === 'grid'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, brainstormDisplayMode: 'grid' }))} disabled={!exportConfig.includeBrainstorm} />
                            Card grid (default)
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                            <input type="radio" name="brainstormDisplayMode" checked={exportConfig.brainstormDisplayMode === 'mindmap'} onChange={() => setExportConfigAndRefresh(p => ({ ...p, brainstormDisplayMode: 'mindmap' }))} disabled={!exportConfig.includeBrainstorm} />
                            🌟 Mind-map graphic organizer
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Concept-sort interactive + image size */}
                    {hasConceptSort && (
                      <div>
                        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                          <input type="checkbox" checked={exportConfig.conceptSortInteractive !== false} onChange={(e) => setExportConfigAndRefresh(p => ({ ...p, conceptSortInteractive: e.target.checked }))} className="rounded" />
                          🧩 Concept sort: drag-to-sort on digital
                        </label>
                        <div className="mt-1 pl-1">
                          <div className="text-[10px] font-semibold text-slate-500 mb-1">Sort strip image size</div>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { v: 'small',  label: 'S',  px: 56 },
                              { v: 'medium', label: 'M',  px: 80 },
                              { v: 'large',  label: 'L',  px: 110 },
                              { v: 'xl',     label: 'XL', px: 150 },
                            ].map(opt => {
                              const cur = exportConfig.conceptSortImageSize || 'medium';
                              const isActive = cur === opt.v;
                              return (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => setExportConfigAndRefresh(p => ({ ...p, conceptSortImageSize: opt.v }))}
                                  title={opt.label + ' (' + opt.px + ' px)'}
                                  aria-label={'Concept sort image size ' + opt.label + ' ' + opt.px + ' pixels'}
                                  aria-pressed={isActive}
                                  className={'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ' + (isActive
                                    ? 'bg-rose-600 text-white border-rose-700'
                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-rose-50')}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio embedding moved to the read-aloud modal shown on Download HTML */}

                {/* AI Custom Style */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">✨ AI Style Studio</div>
                  {/* Quick restyle presets */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {[
                      { label: '🎨 Auto-Beautify', prompt: 'Make this document visually stunning and professional with a modern color scheme, elegant typography, subtle gradients, well-spaced sections with rounded cards, and a cohesive design system. Use a sophisticated palette.' },
                      { label: '🏫 Academic', prompt: 'Professional academic style with serif headings (Georgia or similar), clean layout, navy/gold color scheme, formal table styling, proper margins, and a scholarly appearance suitable for university submissions.' },
                      { label: '🌈 Elementary', prompt: 'Bright, playful, and colorful style for elementary students. Use rounded corners, fun colors (teal, coral, purple), larger friendly fonts, emoji-friendly, card-based layout with soft shadows.' },
                      { label: '🌙 Dark Mode', prompt: 'Elegant dark mode with dark slate/charcoal background, soft white text, indigo/purple accents, subtle borders, and beautiful contrast. Easy on the eyes for screen reading.' },
                      { label: '📰 Magazine', prompt: 'Clean editorial magazine layout with large hero headings, pull quotes with colored left borders, two-column text sections where appropriate, serif body text, and professional photo-story feel.' },
                      { label: '🧊 Minimalist', prompt: 'Ultra-minimal Scandinavian design. Lots of whitespace, thin sans-serif font, muted grays and one accent color, hairline borders, understated elegance.' },
                    ].map(preset => (
                      <button key={preset.label} onClick={() => { setExportStylePrompt(preset.prompt); setTimeout(() => generateCustomExportStyle(), 50); }}
                        disabled={isGeneratingStyle}
                        className="px-2 py-1 bg-slate-50 border border-slate-400 rounded-md text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-600 hover:text-indigo-700 disabled:opacity-40 transition-colors"
                      >{preset.label}</button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input type="text" value={exportStylePrompt} onChange={(e) => setExportStylePrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && exportStylePrompt.trim()) generateCustomExportStyle(); }}
                      placeholder={t("placeholders.describe_style_preset")}
                      className="flex-1 text-[11px] p-1.5 border border-slate-400 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
                      aria-label={t("a11y.custom_export_style")} />
                    <button onClick={generateCustomExportStyle}
                      aria-label={isGeneratingStyle ? 'Generating custom style' : 'Generate custom style'}
                      disabled={!exportStylePrompt.trim() || isGeneratingStyle}
                      className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold hover:bg-indigo-200 disabled:opacity-40"
                    >{isGeneratingStyle ? '...' : '✨'}</button>
                  </div>
                  {customExportCSS && <div role="status" aria-live="polite" className="flex items-center gap-2 mt-1">
                    <div className="text-[11px] text-green-700 font-medium">✓ Custom style active</div>
                    <button onClick={() => setCustomExportCSS('')} className="text-[11px] text-slate-600 hover:text-red-500 font-bold">Reset</button>
                  </div>}
                </div>

                {/* ── Writing check (Harper — local, suggestions-only) ── */}
                {(() => {
                  const wc = writingCheck;
                  const _leafBlocks = () => {
                    const doc = exportPreviewRef.current && exportPreviewRef.current.contentDocument;
                    if (!doc || !doc.body) return null;
                    return Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,figcaption,blockquote'))
                      .filter((el) => !el.closest('section[data-content-recovery="true"]'))
                      .filter((el) => !el.querySelector('p,li,td,th,blockquote'))
                      .filter((el) => (el.textContent || '').trim().length >= 3);
                  };
                  const runWritingCheck = async () => {
                    const runId = ++writingCheckRunRef.current;
                    const sourceDoc = exportPreviewRef.current?.contentDocument;
                    const sourceHtml = sourceDoc?.documentElement?.outerHTML || '';
                    setWritingCheck({ status: 'loading' });
                    if (!sourceDoc || !sourceHtml) {
                      setWritingCheck({ status: 'error', error: t('export_preview.writing.no_preview') || 'Preview not ready - wait for it to render.' });
                      return;
                    }
                    try {
                      const linter = await _ensureHarper();
                      if (!mountedRef.current || runId !== writingCheckRunRef.current) return;
                      const blocks = _leafBlocks();
                      if (!blocks) { setWritingCheck({ status: 'error', error: t('export_preview.writing.no_preview') || 'Preview not ready - wait for it to render.' }); return; }
                      const items = [];
                      let capped = false;
                      for (let bi = 0; bi < blocks.length; bi++) {
                        if (items.length >= 150) { capped = true; break; }
                        const blockText = blocks[bi].textContent || '';
                        let lints = [];
                        try { lints = await linter.lint(blockText); } catch (_) { continue; }
                        if (!mountedRef.current || runId !== writingCheckRunRef.current) return;
                        for (const l of lints) {
                          try {
                            const span = l.span();
                            const sugg = (l.suggestions ? l.suggestions() : []).map((s) => (s.get_replacement_text ? s.get_replacement_text() : '')).filter(Boolean).slice(0, 3);
                            items.push({ blockIndex: bi, message: l.message ? l.message() : 'Possible issue', start: span.start, end: span.end, bad: blockText.slice(span.start, span.end), snippet: (span.start > 20 ? '...' : '') + blockText.slice(Math.max(0, span.start - 20), Math.min(blockText.length, span.end + 24)) + (span.end + 24 < blockText.length ? '...' : ''), suggestions: sugg });
                          } catch (_) {}
                          if (items.length >= 150) { capped = true; break; }
                        }
                      }
                      const currentDoc = exportPreviewRef.current?.contentDocument;
                      if (currentDoc !== sourceDoc || currentDoc?.documentElement?.outerHTML !== sourceHtml) {
                        if (mountedRef.current && runId === writingCheckRunRef.current) setWritingCheck({ status: 'error', error: 'The document changed while it was being checked. Run the writing check again for current results.' });
                        return;
                      }
                      setWritingCheck({ status: 'done', items, capped });
                    } catch (e) {
                      if (mountedRef.current && runId === writingCheckRunRef.current) setWritingCheck({ status: 'error', error: ((e && e.message) || 'The checker failed to load - check the network and try again.').slice(0, 180) });
                    }
                  };
                  const _locate = (item, outline) => {
                    const blocks = _leafBlocks();
                    const el = blocks && blocks[item.blockIndex];
                    if (!el) return null;
                    try { el.scrollIntoView({ block: 'center', behavior: (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'auto' : 'smooth' }); if (outline) { el.style.outline = '3px solid #f59e0b'; el.style.outlineOffset = '2px'; setTimeout(() => { try { el.style.outline = ''; el.style.outlineOffset = ''; } catch (_) {} }, 2200); } } catch (_) {}
                    return el;
                  };
                  const _apply = (item, replacement) => {
                    try {
                      const el = _locate(item, false);
                      const doc = exportPreviewRef.current && exportPreviewRef.current.contentDocument;
                      if (!el || !doc) { addToast(t('toasts.writing_block_gone') || 'That block is no longer in the preview — re-run the check.', 'info'); return; }
                      // Verify the text hasn't shifted since the check ran.
                      const cur = el.textContent || '';
                      if (cur.slice(item.start, item.end) !== item.bad) { addToast(t('toasts.writing_text_shifted') || 'The text changed since this check ran — re-run the check to apply safely.', 'info'); return; }
                      // Apply only when the span sits inside ONE text node, so
                      // inline markup (links, bold) can never be destroyed.
                      const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
                      let node, off = 0, hit = null;
                      while ((node = walker.nextNode())) {
                        const len = node.textContent.length;
                        if (item.start >= off && item.end <= off + len) { hit = { node, local: item.start - off }; break; }
                        off += len;
                      }
                      if (!hit) { _locate(item, true); addToast(t('toasts.writing_spans_markup') || 'This suggestion spans formatting (a link or bold text) — fix it by hand at the highlighted spot.', 'info'); return; }
                      const _badLen = item.end - item.start;
                      // Apply via the editable doc's insertText so the browser's NATIVE undo stack (and
                      // the toolbar Undo) can reverse it — a raw textContent assignment is not recorded,
                      // which is why Undo didn't work. Fall back to a direct write if execCommand can't run.
                      let _ok = false;
                      try {
                        const _range = doc.createRange();
                        _range.setStart(hit.node, hit.local);
                        _range.setEnd(hit.node, hit.local + _badLen);
                        const _sel = (doc.defaultView || window).getSelection();
                        _sel.removeAllRanges(); _sel.addRange(_range);
                        _ok = doc.execCommand('insertText', false, replacement);
                      } catch (_) { _ok = false; }
                      if (!_ok) { const raw = hit.node.textContent; hit.node.textContent = raw.slice(0, hit.local) + replacement + raw.slice(hit.local + _badLen); }
                      try { if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1'); } catch (_) {}
                      // Drop the applied card AND keep the OTHER suggestions valid: the edit shifts later
                      // offsets in the SAME block by (replacement − bad) length and invalidates overlaps —
                      // without this, sibling cards' frozen offsets drifted and every later Apply false-
                      // tripped the "text changed" guard (the reported bug).
                      const _delta = replacement.length - _badLen;
                      setWritingCheck((p) => {
                        if (!p || !p.items) return p;
                        const items = p.items.filter((x) => x !== item).map((x) => {
                          if (x.blockIndex !== item.blockIndex || x.end <= item.start) return x;
                          if (x.start >= item.end) return { ...x, start: x.start + _delta, end: x.end + _delta };
                          return null; // overlaps the edit → offsets no longer valid
                        }).filter(Boolean);
                        return { ...p, items };
                      });
                      addToast('✓ "' + item.bad + '" → "' + replacement + '"', 'success');
                    } catch (e) { addToast('Apply failed: ' + ((e && e.message) || 'error'), 'error'); }
                  };
                  const _dismiss = (item) => { setWritingCheck((p) => p && p.items ? { ...p, items: p.items.filter((x) => x !== item) } : p); };
                  return (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">📝 {t('export_preview.writing.heading') || 'Writing Check'}</div>
                  <button onClick={runWritingCheck} data-help-key="doc_builder_writing_check_btn" disabled={wc && wc.status === 'loading'} aria-busy={!!(wc && wc.status === 'loading')} className="w-full px-3 py-2 bg-teal-100 text-teal-800 rounded-lg text-xs font-bold hover:bg-teal-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                    {wc && wc.status === 'loading' ? (t('export_preview.writing.checking') || '⏳ Checking… (first run downloads the checker)') : (t('export_preview.writing.run') || '📝 Check grammar (English)')}
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">{t('export_preview.writing.disclosure') || 'Runs entirely on this device — no text leaves the browser. English only; the checker is a ~10 MB download on first use (checks are instant once loaded; the download may repeat in a fresh session). Spelling is underlined by your browser as you type.'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{t('export_preview.writing.spell_hint') || '💡 To fix a spelling underline, right-click the word in the preview — your browser lists corrections.'}</p>
                  {exportPreviewSource === 'remediation' && wc && (
                    <p className="text-[10px] text-amber-700 mt-1">{t('export_preview.writing.remediation_caution') || '⚠ This is a remediated document — its wording comes from the source PDF. Apply grammar changes thoughtfully; the original author’s phrasing may be intentional.'}</p>
                  )}
                  {wc && wc.status === 'error' && <div role="alert" aria-live="assertive" className="mt-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5">{wc.error}</div>}
                  {wc && wc.status === 'done' && wc.items.length === 0 && <div role="status" aria-live="polite" className="mt-1.5 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded p-1.5">✓ {t('export_preview.writing.clean') || 'No grammar suggestions found.'}</div>}
                  {wc && wc.status === 'done' && wc.items.length > 0 && (
                    <div className="mt-1.5 space-y-1.5 max-h-64 overflow-y-auto">
                      <div role="status" aria-live="polite" className="text-[10px] font-bold text-slate-600">{wc.items.length} {t('export_preview.writing.suggestions') || 'suggestion(s)'}{wc.capped ? ' (first 150 shown)' : ''} — {t('export_preview.writing.suggestions_note') || 'nothing is changed unless you Apply it'}:</div>
                      {wc.items.map((item, ii) => (
                        <div key={ii} className="bg-white border border-slate-200 rounded-lg p-1.5 text-[11px]">
                          <button onClick={() => _locate(item, true)} className="text-left w-full hover:underline" title={t('export_preview.writing.locate_title') || 'Scroll the preview to this spot'}>
                            <span className="text-slate-700">{item.message}</span>
                            <span className="block text-slate-500 italic mt-0.5">{item.snippet}</span>
                          </button>
                          <div className="flex gap-1 mt-1 flex-wrap items-center">
                            {item.suggestions.map((s, si) => (
                              <button key={si} onClick={() => _apply(item, s)} className="px-1.5 py-0.5 bg-teal-50 border border-teal-300 text-teal-800 rounded text-[10px] font-bold hover:bg-teal-100" title={(t('export_preview.writing.apply_title') || 'Replace') + ' "' + item.bad + '"'}>→ {s || '(remove)'}</button>
                            ))}
                            <button onClick={() => _dismiss(item)} className="px-1.5 py-0.5 bg-slate-50 border border-slate-300 text-slate-600 rounded text-[10px] font-bold hover:bg-slate-100 ml-auto" title={t('export_preview.writing.keep_title') || 'Keep the original wording and dismiss this suggestion'}>✓ {t('export_preview.writing.keep') || 'Keep as-is'}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  );
                })()}

                {/* ── Accessibility Audit ── */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">♿ Accessibility Audit</div>
                  <button
                    onClick={async () => {
                      const runId = ++auditRunRef.current;
                      setExportAuditLoading(true); setExportAuditResult(null);
                      try {
                        const iframe = exportPreviewRef.current;
                        const sourceDoc = iframe?.contentDocument;
                        const html = sourceDoc ? sourceDoc.documentElement.outerHTML : getExportPreviewHTML();
                        let _runEA = null;
                        try {
                          const _mk = window.AlloModules && window.AlloModules.createDocPipeline;
                          if (_mk) {
                            const _inst = window.__alloAuditPipeline || (window.__alloAuditPipeline = _mk({
                              callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
                              addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => '',
                            }));
                            if (_inst && typeof _inst.runEqualAccessAudit === 'function') _runEA = _inst.runEqualAccessAudit;
                          }
                        } catch (_) {}
                        const [aiResult, axeResult, eaResult] = await Promise.all([
                          auditOutputAccessibility(html),
                          runAxeAudit(html).catch(() => null),
                          _runEA ? _runEA(html).catch(() => null) : Promise.resolve(null)
                        ]);
                        if (!mountedRef.current || runId !== auditRunRef.current) return;
                        const currentDoc = exportPreviewRef.current?.contentDocument;
                        if (sourceDoc && (currentDoc !== sourceDoc || currentDoc?.documentElement?.outerHTML !== html)) {
                          setExportAuditResult({ score: -2, summary: 'The document changed during the audit. Run the audit again for results bound to the current document.', issues: [], passes: [] });
                          return;
                        }
                        const combined = { ...(aiResult || { score: 0, summary: '', issues: [], passes: [] }) };
                        if (axeResult) {
                          combined.axeViolations = axeResult.totalViolations;
                          combined.axePasses = axeResult.totalPasses;
                          combined.axeDetails = axeResult.critical.concat(axeResult.serious).concat(axeResult.moderate);
                          combined.summary = (combined.summary || '') + ` | axe-core: ${axeResult.totalViolations} violations, ${axeResult.totalPasses} passed`;
                        }
                        if (eaResult) {
                          combined.eaViolations = eaResult.failViolations;
                          combined.eaPotential = eaResult.potentialViolations;
                          combined.summary = (combined.summary || '') + ` | IBM Equal Access: ${eaResult.failViolations} violations`;
                        }
                        if (axeResult && eaResult) combined.deterministicConsensus = (axeResult.totalViolations === 0 && eaResult.failViolations === 0) ? 'clean' : 'issues';
                        setExportAuditResult(combined);
                      } catch (e) {
                        if (mountedRef.current && runId === auditRunRef.current) setExportAuditResult({ score: -1, summary: 'Audit failed. Check your connection and try again.', issues: [], passes: [] });
                      } finally {
                        if (mountedRef.current && runId === auditRunRef.current) setExportAuditLoading(false);
                      }
                    }}
                    disabled={exportAuditLoading}
                    data-help-key="doc_builder_wcag_audit_btn"
                    aria-busy={exportAuditLoading}
                    className="w-full px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {exportAuditLoading ? <><RefreshCw size={12} className="animate-spin" aria-hidden="true" /> Auditing...</> : <><span aria-hidden="true">♿</span> Run WCAG Audit</>}
                  </button>
                  {exportAuditResult && exportAuditResult.score < 0 && (
                    <div role="alert" aria-live="assertive" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] font-bold text-amber-900">{exportAuditResult.summary}</div>
                  )}
                  {exportAuditResult && exportAuditResult.score >= 0 && (
                    <div role="status" aria-live="polite" aria-atomic="true" className="mt-2 space-y-2">
                      <div className={`text-center p-3 rounded-xl ${exportAuditResult.score >= 80 ? 'bg-green-50 border border-green-200' : exportAuditResult.score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className={`text-2xl font-black ${exportAuditResult.score >= 80 ? 'text-green-700' : exportAuditResult.score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{exportAuditResult.score}/100</div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase">Accessibility Automated Score</div>
                      </div>
                      <p className="text-[11px] text-slate-600">{exportAuditResult.summary}</p>
                      {(exportAuditResult.axeViolations != null && exportAuditResult.eaViolations != null) && (
                        <div className={`rounded-lg border p-2 text-[11px] ${exportAuditResult.deterministicConsensus === 'clean' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                          {exportAuditResult.deterministicConsensus === 'clean'
                            ? '✓ Two independent rule engines agree (axe-core + IBM Equal Access): 0 violations.'
                            : `Rule engines — axe-core: ${exportAuditResult.axeViolations}, IBM Equal Access: ${exportAuditResult.eaViolations} violation(s).`}
                          {exportAuditResult.eaPotential > 0 && <span className="block mt-1 text-slate-500">IBM Equal Access also flags {exportAuditResult.eaPotential} item(s) for human review.</span>}
                        </div>
                      )}
                      {(exportAuditResult.eaViolations == null && exportAuditResult.axeViolations != null) && (
                        <div className="text-[10px] text-slate-500 italic">Second deterministic engine (IBM Equal Access) unavailable — showing axe-core only.</div>
                      )}
                      {exportAuditResult.issues?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-red-600 uppercase mb-1">Issues ({exportAuditResult.issues.length})</div>
                          {exportAuditResult.issues.slice(0, 5).map((issue, i) => (
                            <div key={i} className="text-[11px] text-slate-600 mb-1 flex items-start gap-1">
                              <span className="text-red-600 shrink-0">●</span>
                              <span>{typeof issue === 'string' ? issue : issue.issue}{issue.wcag ? ` (${issue.wcag})` : ''}</span>
                            </div>
                          ))}
                          {exportAuditResult.issues.length > 5 && <div className="text-[11px] text-slate-600 italic">+{exportAuditResult.issues.length - 5} more</div>}
                        </div>
                      )}
                      {exportAuditResult.passes?.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-green-700 uppercase mb-1">Passes ({exportAuditResult.passes.length})</div>
                          {exportAuditResult.passes.slice(0, 3).map((pass, i) => (
                            <div key={i} className="text-[11px] text-green-700 mb-0.5 flex items-start gap-1"><span className="text-green-500">✓</span> {pass}</div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-indigo-700 italic">Use the A11y Inspect toggle above to see and fix issues visually, then re-audit.</p>
                      <p className="text-[11px] text-slate-600 italic">Automated checks (axe-core + IBM Equal Access) find many problems but can’t confirm full WCAG 2.2 AA conformance — a manual screen-reader, keyboard, zoom/reflow, and forced-colors pass is still needed. The score above includes an AI review and is a guide, not a certification.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Panel — Live Preview with Editing */}
              <div className="flex-1 flex flex-col min-w-0 min-h-[60vh] lg:min-h-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-700">Live Preview</h3>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">{exportPreviewMode === 'worksheet' ? 'Worksheet' : exportPreviewMode === 'html' ? 'HTML' : exportPreviewMode === 'slides' ? 'Slides' : 'PDF'}</span>
                    <span className="text-[11px] text-indigo-700 font-medium">Focus the preview and edit text directly</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Editing toolbar */}
                    <input ref={imageFileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
                        if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
                          addToast && addToast('Choose a PNG, JPEG, GIF, or WebP image. SVG and other active formats are not supported.', 'error');
                          return;
                        }
                        if (file.size > 8 * 1024 * 1024) {
                          addToast && addToast('That image is larger than 8 MB. Resize or compress it before inserting.', 'error');
                          return;
                        }
                        setImageAltText('');
                        setImageDecorative(false);
                        setImageAltError('');
                        setPendingImageFile(file);
                      }} />
                    <button ref={imageAddButtonRef} type="button" onClick={() => {
                      const doc = exportPreviewRef.current?.contentDocument;
                      const selection = doc?.getSelection();
                      imageInsertionRangeRef.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
                      imageFileInputRef.current?.click();
                    }} className="min-h-8 text-xs font-bold text-slate-700 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100" aria-label="Add an image and provide alternative text" title="Insert image into document">
                      <ImageIcon size={12} aria-hidden="true" /> Add Image
                    </button>
                    <div className="w-px h-5 bg-slate-200"></div>
                    <button onClick={toggleA11yInspect}
                      aria-pressed={a11yInspectMode}
                      className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${a11yInspectMode ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'text-slate-600 hover:text-violet-600 hover:bg-slate-100'}`}
                      title="Toggle accessibility inspector — shows heading hierarchy, alt text, ARIA labels, table structure, and input labels. Editable badges support Enter, Space, and click.">
                      ♿ A11y Inspect
                    </button>
                    <button type="button" onClick={() => runBuilderPreflight(exportPreviewMode, true)}
                      className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded transition-all ${preflightResult ? (preflightResult.errors ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : preflightResult.warnings ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' : 'bg-green-100 text-green-800 ring-1 ring-green-300') : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                      aria-label="Run export preflight checks" title="Check this document for blocking export, accessibility, structure, and packaging issues">
                      Preflight{preflightResult ? ` (${preflightResult.errors ? preflightResult.errors + ' errors' : preflightResult.warnings ? preflightResult.warnings + ' warnings' : 'passed'})` : ''}
                    </button>
                    {/* Diff view entry point for the remediated-PDF pathway of Document Builder.
                        Only shown when a PDF remediation result is loaded (pdfFixResult.sourceText
                        + finalText present). The AlloFlow-generated pathway has no source PDF to
                        compare against, so the button stays hidden in that mode. */}
                    {pdfFixResult && pdfFixResult.sourceText && pdfFixResult.finalText && (
                      <button
                        onClick={async () => {
                                            try { if (typeof window !== 'undefined') { window._diffDiagnostic = window._diffDiagnostic || []; window._diffDiagnostic.push({ ts: new Date().toISOString(), msg: 'button clicked', source: 'click', diffLibReady, hasWindowDiff: !!window.Diff, hasResult: !!pdfFixResult, srcLen: pdfFixResult && pdfFixResult.sourceText ? pdfFixResult.sourceText.length : null, finLen: pdfFixResult && pdfFixResult.finalText ? pdfFixResult.finalText.length : null }); console.warn('[Diff] button clicked — diffLibReady=' + diffLibReady + ', window.Diff=' + !!window.Diff); } } catch (_) {}
                                            setDiffViewOpen(true);
                                            const ok = await _ensureDiffLib();
                                            if (!ok) {
                                              console.warn('[Diff] _ensureDiffLib returned false — script load failed');
                                              if (typeof addToast === 'function') addToast('Diff engine failed to load (network blocked?). Check your connection and try again.', 'error');
                                            }
                                          }}
                        className="text-xs font-bold flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-all"
                        title="Open the word-level diff view comparing the source PDF text to the remediated HTML — see every insertion, deletion, and paraphrase with click-to-reject."
                        aria-label="Open word-level diff view between source PDF and remediated HTML"
                      >
                        📝 Diff
                      </button>
                    )}
                    <div className="w-px h-5 bg-slate-200"></div>
                                        {exportAuditResult && exportAuditResult.score >= 0 && <span className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 ${exportAuditResult.score >= 90 ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : exportAuditResult.score >= 70 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-red-100 text-red-700 ring-1 ring-red-300'}`} title={exportAuditResult.summary || ''}>{"♿"} {exportAuditResult.score}/100</span>}
<button onClick={updateExportPreview} className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"><RefreshCw size={12} /> Regenerate</button>
                    <button onClick={runExportFromPreview}
                      disabled={exportActionBusy || (exportPreviewMode === 'slides' && !pptxLoaded)}
                      aria-busy={exportActionBusy}
                      aria-label={exportActionBusy ? 'Export in progress' : undefined}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={exportPreviewMode === 'slides' && !pptxLoaded ? 'Slides library still loading...' : ''}
                    ><Download size={14} /> {exportPreviewMode === 'worksheet' ? 'Print Worksheet' : exportPreviewMode === 'html' ? 'Download HTML' : exportPreviewMode === 'slides' ? (pptxLoaded ? 'Export Slides' : 'Loading...') : 'Download PDF'}</button>
                    {/* Alternative format exports */}
                    <details className="relative">
                      <summary className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-colors list-none">
                        ♿ Alt Formats <span className="text-[11px] text-slate-600">▾</span>
                      </summary>
                      <div className="absolute right-0 top-full mt-1 bg-white border border-slate-400 rounded-xl shadow-xl p-2 z-50 w-72 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">Editable documents</div>
                        <button type="button" disabled={!!altExportBusy} onClick={() => runOfficeExport('docx')} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-sky-700 hover:bg-sky-50 rounded-lg disabled:opacity-50">{altExportBusy === 'docx' ? 'Building Word...' : 'Accessible Word (.docx)'}</button>
                        <button type="button" disabled={!!altExportBusy} onClick={() => runOfficeExport('odt')} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-teal-700 hover:bg-teal-50 rounded-lg disabled:opacity-50">{altExportBusy === 'odt' ? 'Building ODT...' : 'OpenDocument (.odt)'}</button>
                        {qtiAssessments.length > 0 && <>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">Assessment packages</div>
                          {qtiAssessments.length > 1 && <select aria-label="Quiz to export as QTI" value={selectedQtiKey} onChange={(event) => setSelectedQtiKey(event.target.value)} disabled={!!altExportBusy} className="w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white">
                            {qtiAssessments.map(({ item, key }, index) => <option key={key} value={key}>{item.title || `Quiz ${index + 1}`}</option>)}
                          </select>}
                          <button type="button" disabled={!!altExportBusy} onClick={() => runPackageExport('qti')} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-50">{altExportBusy === 'qti' ? 'Building QTI...' : 'QTI quiz package'}</button>
                          <div className="px-2 text-[10px] leading-tight text-slate-500">QTI uses the selected quiz's structured questions and answers.</div>
                        </>}
                        {h5pActivities.length > 0 && <>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">Interactive H5P</div>
                          {h5pActivities.length > 1 && <select aria-label="Activity to export as H5P" value={selectedH5PKey} onChange={(event) => setSelectedH5PKey(event.target.value)} disabled={!!altExportBusy} className="w-full border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white">
                            {h5pActivities.map(({ item, key }, index) => <option key={key} value={key}>{item.title || `${item.type === 'quiz' ? 'Quiz' : 'Study cards'} ${index + 1}`}</option>)}
                          </select>}
                          <button type="button" aria-describedby="h5p-compatibility-summary" disabled={!!altExportBusy || !h5pCompatibility.ready} onClick={() => runPackageExport('h5p')} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-fuchsia-700 hover:bg-fuchsia-50 rounded-lg disabled:opacity-50">{altExportBusy === 'h5p' ? 'Building H5P...' : 'H5P interactive activity (.h5p)'}</button>
                          <div id="h5p-compatibility-summary" role="status" className={`px-2 text-[10px] leading-tight ${h5pCompatibility.ready ? (h5pCompatibility.omitted || h5pCompatibility.omittedMedia ? 'text-amber-700' : 'text-emerald-700') : 'text-red-700'}`}>
                            {h5pCompatibility.valid} of {h5pCompatibility.total} {h5pCompatibility.unit}{h5pCompatibility.total === 1 ? '' : 's'} ready for {h5pCompatibility.library || 'H5P'}.
                            {h5pCompatibility.omitted > 0 ? ` ${h5pCompatibility.omitted} incomplete or incompatible.` : ''}
                            {h5pCompatibility.adapted > 0 ? ` ${h5pCompatibility.adapted} adapted to equivalent H5P interactions.` : ''}
                            {h5pCompatibility.manualReview > 0 ? ` ${h5pCompatibility.manualReview} ungraded/manual-review.` : ''}
                            {h5pCompatibility.embeddedMedia > 0 ? ` ${h5pCompatibility.embeddedMedia} embedded media asset(s) will be packaged.` : ''}
                            {h5pCompatibility.omittedMedia > 0 ? ` ${h5pCompatibility.omittedMedia} external or unsupported media asset(s) will be omitted.` : ''}
                          </div>
                          <div className="px-2 text-[10px] leading-tight text-slate-500">MCQ-only quizzes export as Single Choice Set. Mixed assessments export as Question Set with Multiple Choice, Fill in the Blanks, and ungraded Essay adaptations. The destination needs the referenced H5P libraries installed.</div>
                        </>}
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">Content package</div>
                        <button type="button" disabled={!!altExportBusy} onClick={() => runPackageExport('ims')} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 rounded-lg disabled:opacity-50">{altExportBusy === 'ims' ? 'Building IMS...' : 'IMS content package'}</button>
                        <div className="px-2 text-[10px] leading-tight text-slate-500">IMS includes the current editable Builder document.</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1">Reading & text</div>
                        <button onClick={() => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          // #7/#14 (export-format review): the old export tag-stripped the RAW
                          // outerHTML — <style>/<script> BODIES and editor-chrome labels landed in
                          // the .txt as garbage lines. Flatten a CLEANED body clone instead, with a
                          // newline per block element so the text keeps its reading structure.
                          let text = '';
                          try {
                            const _tClone = doc.body.cloneNode(true);
                            _tClone.querySelectorAll('.allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, script, style').forEach(el => el.remove());
                            _tClone.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr,figcaption,blockquote,div').forEach(el => { try { el.appendChild(doc.createTextNode('\n')); } catch (_) {} });
                            text = (_tClone.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
                          } catch (_) { text = (doc.body.innerText || doc.body.textContent || '').trim(); }
                          const blob = new Blob([text], { type: 'text/plain' });
                          downloadBuilderBlob(blob, { extension: 'txt' });
                          addToast('Plain text downloaded', 'success');
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg">📄 Plain Text (.txt)</button>
                        <button onClick={async () => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          // #14: strip editor chrome + style/script bodies before the regex conversion.
                          let html = '';
                          try {
                            const _mClone = doc.documentElement.cloneNode(true);
                            _mClone.querySelectorAll('.allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script, style').forEach(el => el.remove());
                            html = _mClone.outerHTML;
                          } catch (_) { html = doc.documentElement.outerHTML; }
                          // Spoken-math captions (2026-07-05): the ```mathml fence below is
                          // opaque to anyone reading the .md without a MathML renderer. When
                          // SRE (sre_loader.js) can produce a spoken form for a block, emit
                          // it as a "Spoken:" line above the fence. Fail-soft: any failure
                          // leaves the fence exactly as before.
                          const _mathBlocks = html.match(/<math\b[\s\S]*?<\/math>/gi) || [];
                          let _spokenByBlock = null;
                          if (_mathBlocks.length) {
                            try {
                              if (!window.AlloMathSpeech && window.__alloLoadPlugin) await window.__alloLoadPlugin('sre_loader.js');
                              if (window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === 'function') {
                                _spokenByBlock = await Promise.all(_mathBlocks.map(m => window.AlloMathSpeech.toSpeech(m, { timeoutMs: 8000 })));
                              }
                            } catch (_) { _spokenByBlock = null; }
                          }
                          let _mathIdx = 0;
                          // #6 (export-format review): tables/images/math vanished under the final
                          // tag-strip. Convert tables to GitHub pipe tables, images to md images
                          // (alt preserved), and MathML to a fenced block BEFORE the strip runs.
                          const _cellTxt = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
                          html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (tbl) => {
                            const rows = (tbl.match(/<tr\b[\s\S]*?<\/tr>/gi) || []).map(tr => (tr.match(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi) || []).map(_cellTxt));
                            if (!rows.length) return '\n';
                            const w = Math.max(...rows.map(r => r.length));
                            const line = (r) => '| ' + Array.from({ length: w }, (_, i) => r[i] || '').join(' | ') + ' |';
                            return '\n\n' + line(rows[0]) + '\n|' + Array.from({ length: w }, () => ' --- |').join('') + '\n' + rows.slice(1).map(line).join('\n') + '\n\n';
                          });
                          html = html.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi, (m, alt) => '\n\n![' + String(alt).replace(/\]/g, ')') + '](image)\n\n');
                          html = html.replace(/<math\b[\s\S]*?<\/math>/gi, (m) => {
                            const _spoken = (_spokenByBlock && _spokenByBlock[_mathIdx]) ? String(_spokenByBlock[_mathIdx]).trim().replace(/\*/g, '') : '';
                            _mathIdx++;
                            return '\n\n' + (_spoken ? ('*Spoken: ' + _spoken + '*\n\n') : '') + '```mathml\n' + m + '\n```\n\n';
                          });
                          let md = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n').replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n').replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                            .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n').replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                            .replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
                          const blob = new Blob([md], { type: 'text/markdown' });
                          downloadBuilderBlob(blob, { extension: 'md' });
                          addToast('Markdown downloaded', 'success');
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg">📝 Markdown (.md)</button>
                        <button disabled={!!altExportBusy} onClick={async () => {
                          if (altExportBusy) return;
                          setAltExportBusy('notebooklm');
                          // Send to NotebookLM: build a NotebookLM-tuned Markdown source from the
                          // structured lesson `history` (front matter + one ## section per resource,
                          // quiz answer keys, glossary/outline/timeline), falling back to converting
                          // the rendered preview HTML when no structured lesson is loaded. Copy to
                          // clipboard (NotebookLM's lowest-friction "paste a source" path) AND download
                          // a .md (for the "upload a source" path) — whichever the user prefers.
                          try {
                            const doc = exportPreviewRef.current?.contentDocument;
                            const items = Array.isArray(history) ? history.filter(h => h && h.data != null) : [];
                            const hasLiveEdits = !!(doc?.body?.getAttribute && doc.body.getAttribute('data-allo-user-edited') === '1');
                            const today = new Date().toISOString().split('T')[0];
                            const title = (exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle)) || (doc && doc.title) || (items[0] && items[0].title) || 'AlloFlow Lesson';
                            const esc = (v) => (v == null ? '' : String(v));
                            const out = ['---', 'title: ' + esc(title), 'source: AlloFlow (Universal Design for Learning toolkit)', 'date_exported: ' + today, '---', '', '# ' + esc(title), ''];
                            if (items.length && !hasLiveEdits) {
                              items.forEach(it => {
                                const ty = it.type, d = it.data;
                                out.push('## ' + esc(it.title || (ty ? ty.charAt(0).toUpperCase() + ty.slice(1).replace(/[-_]/g, ' ') : 'Resource')), '');
                                if (typeof d === 'string') { out.push(d.trim(), ''); }
                                else if (ty === 'glossary' && Array.isArray(d)) {
                                  d.forEach(g => { if (!g) return; out.push('- **' + esc(g.term) + '** — ' + esc(g.def));
                                    if (g.translations && Object.keys(g.translations).length) out.push('  - _Translations:_ ' + Object.values(g.translations).map(t => esc(t)).join(' / '));
                                    if (g.etymology) out.push('  - _Etymology:_ ' + esc(g.etymology)); });
                                  out.push('');
                                }
                                else if (ty === 'quiz' && d && Array.isArray(d.questions)) {
                                  d.questions.forEach((q, i) => { out.push('**Q' + (i + 1) + '. ' + esc(q.question) + '**', '');
                                    (q.options || []).forEach((o, k) => out.push(String.fromCharCode(65 + k) + '. ' + esc(o))); out.push(''); });
                                  // Answer-key gating (export-format review #13, 2026-07-01): this export
                                  // travels — students, shared drives, NotebookLM — and it EMBEDDED the
                                  // full answer key unconditionally, while the HTML pack gates keys behind
                                  // an explicit teacher opt-in (default OFF). Same rule here: include only
                                  // when exportConfig.includeAnswerKey is explicitly true; otherwise say
                                  // where the key lives so teachers aren't surprised.
                                  // 2026-07-01 (Aaron decision): the visible "📎 Teacher Answer Key"
                                  // checkbox in Export Options now controls this too (default OFF), so
                                  // the toggle is discoverable without a config file. Assessment mode
                                  // wins if both are set.
                                  if (exportConfig && exportConfig.assessmentMode !== true && (exportConfig.includeAnswerKey === true || exportConfig.includeTeacherKey === true)) {
                                    out.push('### Answer Key', '');
                                    d.questions.forEach((q, i) => { const li = Array.isArray(q.options) ? q.options.indexOf(q.correctAnswer) : -1;
                                      out.push('- **Q' + (i + 1) + ':** ' + (li >= 0 ? String.fromCharCode(65 + li) + '. ' : '') + esc(q.correctAnswer));
                                      if (q.factCheck) out.push('  - ' + esc(q.factCheck)); });
                                    out.push('');
                                  } else {
                                    out.push('*Answer key omitted from this export (assessment integrity — anyone with this file can read it). Check "Teacher Answer Key" in Export Options to include it.*', '');
                                  }
                                }
                                else if (ty === 'outline' && d && Array.isArray(d.branches)) {
                                  if (d.main) out.push('**' + esc(d.main) + '**', '');
                                  d.branches.forEach(b => { if (!b) return; out.push('- ' + esc(b.title));
                                    if (Array.isArray(b.items)) b.items.forEach(s => out.push('  - ' + esc(s))); });
                                  out.push('');
                                }
                                else if (ty === 'timeline' && Array.isArray(d)) {
                                  d.forEach(e => { if (e) out.push('- **' + esc(e.date) + ':** ' + esc(e.event)); }); out.push('');
                                }
                                else if (ty === 'concept-sort' && d && Array.isArray(d.categories)) {
                                  const its = Array.isArray(d.items) ? d.items : [];
                                  d.categories.forEach(c => { if (!c) return; out.push('### ' + esc(c.label));
                                    its.filter(x => x && x.categoryId === c.id).forEach(x => out.push('- ' + esc(x.content))); out.push(''); });
                                }
                                else if (ty === 'image' && d && d.prompt) { out.push('_Image: ' + esc(d.prompt) + '_', ''); }
                                else { const tx = (d && (d.text || d.content || d.summary)) || ''; if (tx) out.push(esc(tx).trim(), ''); }
                              });
                            } else if (doc) {
                              // #14: strip editor chrome before the regex conversion (button labels
                              // and editor CSS were leaking into the markdown).
                              let html = '';
                              try {
                                const _mdClone = doc.documentElement.cloneNode(true);
                                _mdClone.querySelectorAll('.allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script, style').forEach(el => el.remove());
                                html = _mdClone.outerHTML;
                              } catch (_) { html = doc.documentElement.outerHTML; }
                              // #6: preserve tables (pipe tables) + image alts before the tag-strip.
                              const _cellTxt2 = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
                              html = html.replace(/<table\b[\s\S]*?<\/table>/gi, (tbl) => {
                                const rows = (tbl.match(/<tr\b[\s\S]*?<\/tr>/gi) || []).map(tr => (tr.match(/<t[hd]\b[\s\S]*?<\/t[hd]>/gi) || []).map(_cellTxt2));
                                if (!rows.length) return '\n';
                                const w = Math.max(...rows.map(r => r.length));
                                const line = (r) => '| ' + Array.from({ length: w }, (_, i) => r[i] || '').join(' | ') + ' |';
                                return '\n\n' + line(rows[0]) + '\n|' + Array.from({ length: w }, () => ' --- |').join('') + '\n' + rows.slice(1).map(line).join('\n') + '\n\n';
                              });
                              html = html.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*>/gi, (m, alt) => '\n\n![' + String(alt).replace(/\]/g, ')') + '](image)\n\n');
                              const body = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n').replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n').replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n').replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n').replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n').replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*').replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();
                              out.push(body);
                            } else { addToast('Nothing to export yet — generate a lesson first', 'error'); return; }
                            const md = out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
                            let copied = false;
                            try { copied = window.alloCopyText ? await window.alloCopyText(md) : false; } catch (_) {}
                            const blob = new Blob([md], { type: 'text/markdown' });
                            downloadBuilderBlob(blob, { extension: 'md', suffix: '-notebooklm' });
                            addToast(copied ? 'Copied to clipboard + downloaded .md — paste or upload into NotebookLM as a source' : 'Downloaded .md — upload it into NotebookLM as a source', 'success');
                          } catch (e) { if (addToast) addToast('NotebookLM export failed', 'error'); }
                          finally { if (mountedRef.current) setAltExportBusy(''); }
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-50">{altExportBusy === 'notebooklm' ? 'Building NotebookLM source...' : '📓 Send to NotebookLM (.md)'}</button>
                        <button disabled={!!altExportBusy} onClick={async () => {
                          const _preflight = runBuilderPreflight('epub', false);
                          if (_preflight.errors) { addToast && addToast('ePub export stopped: fix the blocking preflight issues first.', 'error'); return; }
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc || !window.JSZip) { addToast('ePub library loading...', 'info'); return; }
                          if (altExportBusy) return;
                          setAltExportBusy('epub'); try {
                          // Export-format review #1/#5/#14 (2026-07-01): the old ePub shipped the RAW
                          // editor DOM (chrome + contenteditable), a hard-coded single-entry nav (no
                          // TOC — the thing low-vision readers navigate by), title always "AlloFlow
                          // Document" and language always "en". Now: strip editor chrome, build a real
                          // EPUB3 toc nav from the content headings (ids assigned so targets resolve),
                          // and carry the document's actual title + language into the OPF metadata.
                          const _clone = doc.documentElement.cloneNode(true);
                          try {
                            _clone.querySelectorAll('.allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, #allo-builder-edit-css, script').forEach(el => el.remove());
                            _clone.querySelectorAll('[data-allo-crop-tabindex-added]').forEach(el => { const added = el.getAttribute('data-allo-crop-tabindex-added') === 'added'; el.removeAttribute('data-allo-crop-tabindex-added'); if (added) el.removeAttribute('tabindex'); el.removeAttribute('aria-keyshortcuts'); });
                            _clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
                          } catch (_) {}
                          const _escXml = (s) => String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                          const title = ((exportConfig && (exportConfig.title || exportConfig.docTitle || exportConfig.lessonTitle)) || (doc.title || '').trim() || 'AlloFlow Document').substring(0, 120);
                            _clone.querySelectorAll('link[rel~="stylesheet"][href]').forEach((link) => {
                              try { if (/^https?:/i.test(new URL(link.getAttribute('href') || '', doc.baseURI).href)) link.remove(); } catch (_) {}
                            });
                            _clone.querySelectorAll('style').forEach((style) => {
                              const css = style.textContent || '';
                              style.textContent = css.replace(/@import\s+[^;]+;/gi, '')
                                .replace(/@font-face\s*\{[^}]*https?:[^}]*\}/gi, '')
                                .replace(/url\(\s*(['"]?)https?:[^)]+\)/gi, 'none');
                            });
                          const _rawLang = (doc.documentElement.getAttribute('lang') || 'en').trim().replace(/_/g, '-');
                          const lang = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(_rawLang) ? _rawLang : 'en';
                          const xmlTitle = _escXml(title);
                          // Real TOC: every h1-h3 in content order, anchored by generated ids.
                          const _navItems = [];
                          try {
                            const _hs = _clone.querySelectorAll('h1, h2, h3');
                            for (let _hi = 0; _hi < _hs.length; _hi++) {
                              const _h = _hs[_hi];
                              const _txt = (_h.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 120);
                              if (!_txt) continue;
                              if (!_h.id) _h.id = 'allo-toc-' + _hi;
                              _navItems.push('<li><a href="content.xhtml#' + _escXml(_h.id) + '">' + _escXml(_txt) + '</a></li>');
                            }
                          } catch (_) {}
                          const _navList = _navItems.length ? _navItems.join('') : '<li><a href="content.xhtml">' + xmlTitle + '</a></li>';
                          const zip = new window.JSZip();
                          zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
                          zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
                           const _imageManifest = [];
                           let _hasRemoteResources = false;
                           let _unavailableRemoteImages = 0;
                           const _replaceImageFallback = (img) => {
                             const fallback = _clone.ownerDocument.createElement('span');
                             fallback.setAttribute('role', 'img');
                             const alt = (img.getAttribute('alt') || '').trim();
                             fallback.setAttribute('aria-label', alt || 'Image unavailable in this ePub');
                             fallback.textContent = alt ? '[Image: ' + alt + ']' : '[Image unavailable]';
                             img.replaceWith(fallback);
                           };
                           const _images = Array.from(_clone.querySelectorAll('img[src]'));
                           for (let index = 0; index < _images.length; index++) {
                             const img = _images[index];
                             const src = img.getAttribute('src') || '';
                             const match = src.match(/^data:image\/(png|jpe?g|gif|webp);base64,([a-z0-9+/=\s]+)$/i);
                             if (match) {
                               const kind = match[1].toLowerCase();
                               const ext = kind === 'jpeg' || kind === 'jpg' ? 'jpg' : kind;
                               const mediaType = ext === 'jpg' ? 'image/jpeg' : 'image/' + ext;
                               const path = 'images/image-' + (index + 1) + '.' + ext;
                               zip.file('OEBPS/' + path, match[2].replace(/\s/g, ''), { base64: true });
                               img.setAttribute('src', path);
                               _imageManifest.push('<item id="image-' + (index + 1) + '" href="' + path + '" media-type="' + mediaType + '"/>');
                               continue;
                             }
                             try {
                               const absolute = new URL(src, doc.baseURI).href;
                               if (!/^https?:/i.test(absolute)) { _replaceImageFallback(img); continue; }
                               const controller = typeof AbortController === 'function' ? new AbortController() : null;
                               const timer = window.setTimeout(() => controller?.abort(), 10000);
                               let response;
                               try { response = await fetch(absolute, { credentials: 'omit', signal: controller?.signal }); }
                               finally { window.clearTimeout(timer); }
                               if (!response.ok) throw new Error(`Image request failed (${response.status})`);
                               const mediaType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
                               const extensionByType = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
                               const ext = extensionByType[mediaType];
                               if (!ext) throw new Error('Unsupported remote image type');
                               const bytes = await response.arrayBuffer();
                               if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('Remote image exceeds 8 MB');
                               const path = 'images/image-' + (index + 1) + '.' + ext;
                               zip.file('OEBPS/' + path, bytes);
                               img.setAttribute('src', path);
                               _imageManifest.push('<item id="image-' + (index + 1) + '" href="' + path + '" media-type="' + mediaType + '"/>');
                             } catch (_) {
                               _unavailableRemoteImages += 1;
                               _replaceImageFallback(img);
                             }
                           }
                          const _uid = 'alloflow-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
                          try {
                            _hasRemoteResources = Array.from(_clone.querySelectorAll('audio[src],video[src],source[src],object[data]')).some((node) => {
                              const ref = node.getAttribute('src') || node.getAttribute('data') || ''; try { return /^https?:/i.test(new URL(ref, doc.baseURI).href); } catch (_) { return false; }
                            });
                          } catch (_) {}
                          const _contentProps = [];
                          try { if (_clone.querySelector('svg')) _contentProps.push('svg'); if (_clone.querySelector('math')) _contentProps.push('mathml'); if (_hasRemoteResources) _contentProps.push('remote-resources'); } catch (_) {}
                          const _contentPropAttr = _contentProps.length ? ' properties="' + _contentProps.join(' ') + '"' : '';
                          zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${_uid}</dc:identifier><dc:title>${xmlTitle}</dc:title><dc:language>${_escXml(lang)}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"${_contentPropAttr}/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${_imageManifest.join('')}</manifest><spine><itemref idref="content"/></spine></package>`);
                          // #7 (export-format review R2): serialize via XMLSerializer so content.xhtml
                          // is well-formed XML — every void element (<meta>, <input>, <col>, <br>, <img>)
                          // self-closed and entities encoded. The old outerHTML+regex only patched
                          // <br>/<hr>/<img>, so a generated <meta charset> or <input> left the file
                          // invalid and epubcheck / Apple Books / Thorium rejected it.
                          let xhtml;
                          try {
                            xhtml = new XMLSerializer().serializeToString(_clone).replace(/\sxmlns="([^"]+)"(?=[^<>]*\sxmlns="\1")/g, '');
                          } catch (_) {
                            xhtml = _clone.outerHTML.replace(/<br>/g, '<br/>').replace(/<hr>/g, '<hr/>').replace(/<img([^>]*[^/])>/g, '<img$1/>').replace(/&nbsp;/g, '&#160;');
                          }
                          // #8: ALWAYS restore the XHTML namespace on the ROOT html element. The old
                          // `!includes('xmlns')` check was defeated by any child xmlns (MathML/SVG from
                          // a transcribed equation), leaving the root in no namespace so conforming
                          // readers blank-render or reject the whole book.
                          if (!/^<html\b[^>]*\sxmlns=/i.test(xhtml)) xhtml = xhtml.replace(/^<html\b/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
                          zip.file('OEBPS/content.xhtml', xhtml);
                          zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${_escXml(lang)}" xml:lang="${_escXml(lang)}"><head><title>${xmlTitle} — Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${_navList}</ol></nav></body></html>`);
                          const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
                          downloadBuilderBlob(blob, { extension: 'epub' });
                          if (_unavailableRemoteImages) {
                            addToast(`${_unavailableRemoteImages} remote image${_unavailableRemoteImages === 1 ? '' : 's'} could not be packaged and were replaced with accessible text.`, 'warning');
                          } else {
                            addToast('ePub downloaded', 'success');
                          }
                          } catch (error) { addToast && addToast('ePub export failed: ' + (error?.message || 'unknown error'), 'error'); }
                          finally { if (mountedRef.current) setAltExportBusy(''); }
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50">{altExportBusy === 'epub' ? 'Building ePub...' : '📚 ePub (e-readers)'}</button>
                        <button disabled={!!altExportBusy} onClick={async () => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          if (!doc) return;
                          if (altExportBusy) return;
                          setAltExportBusy('brf'); try {
                          // #14: strip editor chrome before flattening — button labels ("×", "+ Row")
                          // were being embossed into the braille output.
                          // #8 (structured sourcing): flatten per BLOCK (a braille line per logical
                          // unit) with a blank line before each heading — braille convention for a
                          // new section — instead of the layout-driven innerText soup. Footnote refs
                          // and emphasis remain future work; structure is the big win.
                          let text = '';
                          try {
                            const _bClone = doc.body.cloneNode(true);
                            _bClone.querySelectorAll('.allo-block-controls, .allo-block-remove, .a11y-inspect-badge, [data-allo-crop-ui], #a11y-inspect-styles, script, style').forEach(el => el.remove());
                            _bClone.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => { try { el.insertAdjacentText('beforebegin', '\n\n'); el.appendChild(doc.createTextNode('\n')); } catch (_) {} });
                            _bClone.querySelectorAll('p,li,tr,figcaption,blockquote,div').forEach(el => { try { el.appendChild(doc.createTextNode('\n')); } catch (_) {} });
                            text = (_bClone.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
                          } catch (_) { text = doc.body.innerText || doc.body.textContent || ''; }
                          // Real ASCII Braille (BRF), Grade 1 / uncontracted (audit 2026-06-13):
                          // a .brf must be ASCII braille (the 0x20–0x5F North-American Braille
                          // Computer Code), NOT Unicode braille patterns — embossers and braille
                          // displays read the ASCII bytes. Capital sign (,) before each capital;
                          // number sign (#) before a digit run with 1-0 → A-J; standard BRF
                          // punctuation. Pages separated by form feed.
                          const _brfDigit = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J' };
                          const _brfPunct = { ',': '1', ';': '2', ':': '3', '.': '4', '!': '6', '?': '8', '(': '"<', ')': '">', "'": "'", '-': '-', '/': '_/', '*': '"9', '&': '@&', '+': '"6', '=': '"7', '<': '@<', '>': '@>' };
                          const _brfSmart = { '\u2018': "'", '\u2019': "'", '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u00a0': ' ', '\u2022': '*' };
                          const _brfOpenQuote = '\ue000', _brfCloseQuote = '\ue001';
                          const _brfPrefix = /[#,;@_^".]$/;
                          const _brfHardSplit = (word, into, cells) => {
                            if (/^#[A-J14]+$/.test(word)) {
                              while (word.length > cells) { into.push(word.slice(0, cells - 1) + '"'); word = word.slice(cells - 1); }
                              if (word) into.push(word);
                              return;
                            }
                            while (word.length > cells) {
                              let cut = cells;
                              while (cut > 1 && _brfPrefix.test(word.slice(0, cut))) cut--;
                              into.push(word.slice(0, cut)); word = word.slice(cut);
                            }
                            if (word) into.push(word);
                          };
                          const _brfWrap = (line, into, cells) => {
                            if (line.length <= cells) { into.push(line); return; }
                            const words = line.split(' '); let cur = '';
                            for (let word of words) {
                              if (word.length > cells) { if (cur) { into.push(cur); cur = ''; } _brfHardSplit(word, into, cells); continue; }
                              if (!cur) cur = word;
                              else if (cur.length + 1 + word.length <= cells) cur += ' ' + word;
                              else { into.push(cur); cur = word; }
                            }
                            if (cur) into.push(cur);
                          };
                          const _toBRF = (src, opts) => {
                            const cells = (opts && opts.cellsPerLine) || 40;
                            let norm = String(src == null ? '' : src).replace(/[\u201c\u00ab]/g, _brfOpenQuote).replace(/[\u201d\u00bb]/g, _brfCloseQuote);
                            norm = norm.replace(/[\u2018\u2019\u2013\u2014\u2026\u00a0\u2022]/g, (c) => _brfSmart[c] || '');
                            try { norm = norm.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
                            const out = []; let dropped = 0;
                            for (const line of norm.replace(/\r\n?/g, '\n').split('\n')) {
                              const chars = Array.from(line); let bl = ''; let numMode = false;
                              for (let i = 0; i < chars.length; i++) {
                                const ch = chars[i];
                                if (ch >= '0' && ch <= '9') { if (!numMode) { bl += '#'; numMode = true; } bl += _brfDigit[ch]; continue; }
                                if (numMode && (ch === ',' || ch === '.')) { bl += _brfPunct[ch]; continue; }
                                if (numMode && ch >= 'a' && ch <= 'j') bl += ';';
                                numMode = false;
                                if (ch >= 'a' && ch <= 'z') { bl += ch.toUpperCase(); continue; }
                                if (ch >= 'A' && ch <= 'Z') {
                                  let end = i;
                                  while (end < chars.length && chars[end] >= 'A' && chars[end] <= 'Z') end++;
                                  const prevIsLetter = i > 0 && /[A-Za-z]/.test(chars[i - 1]);
                                  const nextIsLetter = end < chars.length && /[A-Za-z]/.test(chars[end]);
                                  if (!prevIsLetter && !nextIsLetter && end - i >= 2) { bl += ',,' + chars.slice(i, end).join(''); i = end - 1; }
                                  else bl += ',' + ch;
                                  continue;
                                }
                                if (ch === ' ' || ch === '\t') { bl += ' '; continue; }
                                if (ch === _brfOpenQuote) { bl += '8'; continue; }
                                if (ch === _brfCloseQuote) { bl += '0'; continue; }
                                if (ch === '"') { const prev = i > 0 ? chars[i - 1] : ''; bl += (!prev || /\s|[([{]/.test(prev)) ? '8' : '0'; continue; }
                                if (_brfPunct[ch] !== undefined) { bl += _brfPunct[ch]; continue; }
                                dropped++;
                              }
                              _brfWrap(bl, out, cells);
                            }
                            const brf = out.join('\r\n');
                            return (opts && opts.withMeta) ? { brf, dropped } : brf;
                          };
const _downloadBRF = (brf) => {
                            const blob = new Blob([brf], { type: 'application/x-brf' });
                            downloadBuilderBlob(blob, { extension: 'brf' });
                          };
                          // Prefer UEB Grade 2 (contracted) via liblouis when it's available;
                          // fall back to the shared canonical Grade-1 converter (loaded with the
                          // same file) on ANY failure so the export is never worse than before.
                          // 2026-07-05: nothing ever INJECTED liblouis_braille_loader.js, so
                          // window.AlloBraille could not exist and the UEB path was dead code.
                          // Lazy-load it on demand via the __alloLoadPlugin injector first; the
                          // inline _toBRF above is the last-resort fallback if the load fails.
                          const _ensureBrailleLoader = (window.AlloBraille && typeof window.AlloBraille.toUEB === 'function')
                            ? Promise.resolve(true)
                            : (window.__alloLoadPlugin ? window.__alloLoadPlugin('liblouis_braille_loader.js') : Promise.resolve(false));
                          await Promise.resolve(_ensureBrailleLoader).catch(() => false).then(async () => {
                            let _g1Dropped = 0, _grade1;
                            if (window.AlloBraille && typeof window.AlloBraille.toGrade1BRF === 'function') {
                              const _r = window.AlloBraille.toGrade1BRF(text, { withMeta: true });
                              _grade1 = _r.brf; _g1Dropped = _r.dropped;
                            } else { const _r = _toBRF(text, { withMeta: true }); _grade1 = _r.brf; _g1Dropped = _r.dropped; }
                            const _warnDrop = () => { if (_g1Dropped > 0 && addToast) addToast(_g1Dropped + ' character(s) had no Grade-1 braille equivalent and were skipped. Try the UEB option or check the source.', 'info'); };
                            if (window.AlloBraille && typeof window.AlloBraille.toUEB === 'function') {
                              addToast('Preparing contracted braille (UEB Grade 2)…', 'info');
                              await Promise.resolve(window.AlloBraille.toUEB(text)).then((ueb) => {
                                if (ueb && ueb.replace(/\s/g, '').length) {
                                  _downloadBRF(ueb);
                                  addToast('Electronic Braille (UEB Grade 2) downloaded', 'success');
                                } else {
                                  _downloadBRF(_grade1); _warnDrop();
                                  addToast('Electronic Braille (Grade 1) downloaded', 'success');
                                }
                              }).catch(() => {
                                _downloadBRF(_grade1); _warnDrop();
                                addToast('Electronic Braille (Grade 1) downloaded', 'success');
                              });
                            } else {
                              _downloadBRF(_grade1); _warnDrop();
                              addToast('Electronic Braille (BRF) downloaded', 'success');
                            }
                          });
                          } catch (error) { addToast && addToast('Braille export failed: ' + (error?.message || 'unknown error'), 'error'); }
                          finally { if (mountedRef.current) setAltExportBusy(''); }
                        }} className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50">{altExportBusy === 'brf' ? 'Building Braille...' : '⠿ Electronic Braille (.brf)'}</button>
                      </div>
                    </details>
                  </div>
                </div>
                {preflightResult && (
                  <div className={`border-b px-3 py-2 text-xs ${preflightResult.errors ? 'bg-red-50 border-red-300 text-red-900' : preflightResult.warnings ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-green-50 border-green-300 text-green-900'}`} role="status" aria-live="polite">
                    <div className="flex items-center gap-2">
                      <strong>{preflightResult.errors ? 'Export blocked by preflight' : preflightResult.warnings ? 'Preflight passed with warnings' : 'Preflight passed'}</strong>
                      <span>{preflightResult.errors} error{preflightResult.errors === 1 ? '' : 's'} / {preflightResult.warnings} warning{preflightResult.warnings === 1 ? '' : 's'}</span>
                      <button type="button" onClick={() => setPreflightResult(null)} className="ml-auto underline font-bold">Dismiss</button>
                    </div>
                    {!!preflightResult.issues.length && <ul className="mt-1 list-disc pl-5 space-y-0.5">
                      {preflightResult.issues.map((issue, index) => <li key={issue.code + '-' + index}><strong>{issue.severity === 'error' ? 'Fix:' : 'Review:'}</strong> {issue.message}</li>)}
                    </ul>}
                  </div>
                )}
                <details className="bg-white border-b border-slate-200 shrink-0">
                  <summary className="cursor-pointer px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">Find / Replace | Heading Outline ({headingOutline.length})</summary>
                  <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-2 lg:grid-cols-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <label htmlFor="builder-find" className="sr-only">Find text</label>
                      <input id="builder-find" value={findQuery} onChange={(e) => { setFindQuery(e.target.value); findCursorRef.current = { node: null, offset: 0 }; }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); findNextInPreview(); } }} placeholder="Find" className="min-w-28 flex-1 rounded border border-slate-400 px-2 py-1 text-xs" />
                      <button type="button" onClick={findNextInPreview} disabled={!findQuery.trim()} className="rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40">Next</button>
                      <label htmlFor="builder-replace" className="sr-only">Replace with</label>
                      <input id="builder-replace" value={replaceQuery} onChange={(e) => setReplaceQuery(e.target.value)} placeholder="Replace with" className="min-w-28 flex-1 rounded border border-slate-400 px-2 py-1 text-xs" />
                      <button type="button" onClick={replaceAllInPreview} disabled={!findQuery.trim()} className="rounded border border-indigo-500 bg-white px-2 py-1 text-xs font-bold text-indigo-700 disabled:opacity-40">Replace all</button>
                    </div>
                    <nav aria-label="Document heading outline" className="max-h-24 overflow-y-auto rounded border border-slate-300 bg-white p-1">
                      {headingOutline.length ? headingOutline.map((heading) => (
                        <button key={heading.index + '-' + heading.text} type="button" onClick={() => {
                          const doc = exportPreviewRef.current?.contentDocument;
                          const node = heading.node;
                          if (!doc || !node?.isConnected) return;
                          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          const range = doc.createRange(); range.selectNodeContents(node); range.collapse(false);
                          const selection = doc.defaultView?.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); exportPreviewRef.current?.focus();
                        }} className="block w-full truncate rounded px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-indigo-50" style={{ paddingLeft: Math.min(28, 4 + (heading.level - 1) * 6) }} title={heading.text}>H{heading.level} - {heading.text}</button>
                      )) : <span className="block px-2 py-1 text-[11px] text-slate-500">No headings yet.</span>}
                    </nav>
                  </div>
                </details>
                {/* Formatting toolbar */}
                <div className="px-2 py-1 bg-white border-b border-slate-200 flex items-center gap-0.5 flex-wrap shrink-0" role="toolbar" aria-label={t("a11y.text_formatting")}>
                  {[
                    { cmd: 'bold', icon: 'B', label: 'Bold', style: 'font-bold' },
                    { cmd: 'italic', icon: 'I', label: 'Italic', style: 'italic' },
                    { cmd: 'underline', icon: 'U', label: 'Underline', style: 'underline' },
                  ].map(btn => (
                    <button key={btn.cmd} onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand(btn.cmd, false, null); }}
                      className={`w-8 h-8 rounded text-xs ${btn.style} text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600`}
                      aria-label={btn.label} title={btn.label}>{btn.icon}</button>
                  ))}
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  {[
                    { cmd: 'formatBlock', val: '<h2>', icon: 'H2', label: 'Heading 2' },
                    { cmd: 'formatBlock', val: '<h3>', icon: 'H3', label: 'Heading 3' },
                    { cmd: 'formatBlock', val: '<p>', icon: '¶', label: 'Paragraph' },
                  ].map(btn => (
                    <button key={btn.icon} onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand(btn.cmd, false, btn.val); }}
                      className="min-w-8 h-8 px-1.5 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600"
                      aria-label={btn.label} title={btn.label}>{btn.icon}</button>
                  ))}
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('insertUnorderedList', false, null); }}
                    className="w-8 h-8 rounded text-xs text-slate-600 hover:bg-indigo-100 transition-colors" aria-label={t("a11y.bullet_list")} title="Bullet list">•</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('insertOrderedList', false, null); }}
                    className="w-8 h-8 rounded text-[11px] font-bold text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Numbered list" title="Numbered list">1.</button>
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  <button onClick={async () => { const doc = exportPreviewRef.current?.contentDocument; if (!doc) return;
                    const selection = doc.getSelection?.();
                    const savedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
                    const url = await promptForBuilderText('Enter the destination for this link.', '', {
                      title: 'Insert link', confirmText: 'Insert link', cancelText: 'Cancel',
                      placeholder: 'https://example.org or #section', inputType: 'url', maxLength: 2048,
                      validate: (value) => {
                        const candidate = value.trim();
                        if (!candidate) return 'Enter a link URL.';
                        const scheme = candidate.match(/^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/);
                        return (!scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase()))
                          ? null : 'Only web (http/https), mailto:, tel:, and internal links are allowed.';
                      },
                    });
                    if (!url) return;
                    // Scheme allowlist (builder-review A4, 2026-07-01): createLink accepted ANY URI —
                    // "javascript:alert(1)" became a live link inside the allow-scripts editor iframe
                    // AND survived into the exported/distributed HTML. Allow web/mail/tel/anchor/
                    // relative links only; anything else is refused with a message, never inserted.
                    const _u = url.trim();
                    const _schemeMatch = _u.match(/^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/);
                    const _okScheme = !_schemeMatch || ['http', 'https', 'mailto', 'tel'].includes(_schemeMatch[1].toLowerCase());
                    if (!_okScheme) return;
                    if (savedRange && savedRange.commonAncestorContainer?.isConnected) {
                      selection.removeAllRanges(); selection.addRange(savedRange);
                      exportPreviewRef.current?.contentWindow?.focus();
                    }
                    doc.execCommand('createLink', false, _u); }}
                    className="w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Insert link" title="Insert link">🔗</button>
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  <button onClick={async () => {
                    // Insert accessible math authored in MathLive (mathlive_loader.js →
                    // window.AlloMathInput). The equation goes in as a native <math> MathML
                    // element carrying data-allo-latex (round-trip) + an aria-label spoken
                    // form — the SAME shape the doc pipeline's temml path makes, so it flows
                    // through the accessibility chain (SRE reads it, the .md/.brf exports
                    // already special-case <math>). Fail-soft: loader missing / cancel = no-op.
                    const doc = exportPreviewRef.current?.contentDocument;
                    if (!doc) return;
                    try {
                      if (!(window.AlloMathInput && window.AlloMathInput.ready && window.AlloMathInput.ready()) && window.__alloLoadPlugin) {
                        addToast('Opening the equation editor…', 'info');
                        await window.__alloLoadPlugin('mathlive_loader.js');
                      }
                      if (!(window.AlloMathInput && typeof window.AlloMathInput.promptEquation === 'function')) {
                        addToast('The equation editor could not load. Check your connection and try again.', 'error');
                        return;
                      }
                      const eq = await window.AlloMathInput.promptEquation({ title: '∑  Insert an equation' });
                      if (!eq || !eq.mathml) return;
                      // Prefer SRE's spoken form for the alt when it's available (one spoken-
                      // math voice across the app); fall back to MathLive's own.
                      let spoken = eq.spoken || '';
                      try {
                        if (window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === 'function') {
                          const s = await window.AlloMathSpeech.toSpeech(eq.mathml, { timeoutMs: 4000 });
                          if (s && s.trim()) spoken = s.trim();
                        }
                      } catch (_) { /* keep MathLive's spoken */ }
                      // Stamp data-allo-latex + aria-label onto the <math> root, wrap so the
                      // caret lands after it. execCommand keeps it in the editor's undo stack.
                      const escAttr = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                      let mathHtml = String(eq.mathml).trim();
                      const attrs = ' data-allo-latex="' + escAttr(eq.latex) + '"'
                        + (spoken ? ' aria-label="' + escAttr(spoken) + '"' : '')
                        + ' class="allo-math-authored"';
                      mathHtml = /^<math[\s>]/i.test(mathHtml) ? mathHtml.replace(/^<math\b/i, '<math' + attrs) : ('<math' + attrs + '>' + mathHtml + '</math>');
                      doc.execCommand('insertHTML', false, mathHtml + '\u200B'); // trailing ZWSP so the caret lands after the equation
                      addToast('Equation inserted', 'success');
                    } catch (e) {
                      addToast('Could not insert the equation.', 'error');
                    }
                  }}
                    className="min-w-8 h-8 px-1.5 rounded text-[13px] font-semibold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-600" aria-label="Insert an equation (accessible math)" title="Insert an equation (accessible math)">∑</button>
                  <span className="w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true"></span>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('removeFormat', false, null); }}
                    className="w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Clear formatting" title="Clear formatting">✕</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('undo', false, null); }}
                    className="w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Undo" title="Undo">↩</button>
                  <button onClick={() => { const doc = exportPreviewRef.current?.contentDocument; if (doc) doc.execCommand('redo', false, null); }}
                    className="w-8 h-8 rounded text-[11px] text-slate-600 hover:bg-indigo-100 transition-colors" aria-label="Redo" title="Redo">↪</button>
                  <select onChange={(e) => { const doc = exportPreviewRef.current?.contentDocument; if (doc && e.target.value) doc.execCommand('foreColor', false, e.target.value); e.target.value = ''; }}
                    className="h-8 text-[11px] border border-slate-400 rounded px-1 text-slate-600 ml-0.5" aria-label="Text color" defaultValue="">
                    <option value="" disabled>Color</option>
                    <option value="#000000">⬛ Black</option>
                    <option value="#1e3a5f">🟦 Navy</option>
                    <option value="#991b1b">🟥 Red</option>
                    <option value="#166534">🟩 Green</option>
                    <option value="#7c3aed">🟪 Purple</option>
                  </select>
                </div>
                {/* ── Expert Workbench: Command Bar + Agent Activity (collapsible) ── */}
                <details open className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-600 group">
                  <summary className="cursor-pointer px-2 py-1.5 flex items-center gap-2 list-none select-none hover:bg-slate-800/50">
                    <span className="inline-block transition-transform group-open:rotate-90 text-slate-300 text-[10px]">▸</span>
                    <span className="text-[11px] text-purple-200 font-bold shrink-0">{isAgentRunning ? '🤖 Agent' : '⌨️ Expert'}</span>
                    {isAgentRunning && <span className="text-[11px] text-amber-300 animate-pulse">Running...</span>}
                    <span className="ml-auto text-[10px] text-slate-300">{agentActivityLog.length > 0 ? `${agentActivityLog.length} event${agentActivityLog.length === 1 ? '' : 's'}` : 'idle'}</span>
                  </summary>
                  <div className="px-2 pb-1.5">
                  <form className="flex-1 flex gap-1" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!expertCommandInput.trim() || isAgentRunning) return;
                    const cmd = expertCommandInput.trim();
                    const expertRunId = ++expertRunRef.current;
                    setExpertCommandInput('');
                    setIsAgentRunning(true);
                    console.info('[ExpertWorkbench] start command=' + JSON.stringify(cmd) + ' context=export-preview');
                    addToast(`🤖 Workbench running: ${cmd}`, 'info');
                    setAgentActivityLog(prev => [...prev, { text: '▶ ' + cmd, type: 'command', time: new Date().toLocaleTimeString() }]);
                    try {
                      const iframe = exportPreviewRef.current;
                      const doc = iframe?.contentDocument;
                      const currentHtml = doc ? ('<!DOCTYPE html>\n' + doc.documentElement.outerHTML) : getExportPreviewHTML();
                      const result = await processExpertCommand(cmd, currentHtml, {
                        onProgress: (msg) => { /* could update UI */ },
                        onActivity: (entry) => {
                          console.info('[ExpertWorkbench] activity type=' + entry.type + ' text=' + entry.text);
                          if (mountedRef.current && expertRunId === expertRunRef.current) setAgentActivityLog(prev => [...prev, entry]);
                        }
                      });
                      const liveDoc = exportPreviewRef.current?.contentDocument;
                      const liveHtml = liveDoc ? ('<!DOCTYPE html>\n' + liveDoc.documentElement.outerHTML) : '';
                      const resultIsCurrent = mountedRef.current && expertRunId === expertRunRef.current && liveDoc === doc && liveHtml === currentHtml;
                      if (!resultIsCurrent) {
                        setAgentActivityLog(prev => [...prev, { text: 'Result not applied because the document changed while the command was running.', type: 'info', time: new Date().toLocaleTimeString() }]);
                        addToast('The document changed while the Workbench was running, so its older result was not applied.', 'info');
                      } else if (result && result.html && result.html !== currentHtml && doc) {
                        doc.open(); doc.write(result.html); doc.close();
                        doc.designMode = 'on';
                        try {
                          if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1');
                          window.__alloBuilderEditedPack = { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML, at: Date.now() };
                        } catch (_) {}
                        auditRunRef.current += 1;
                        writingCheckRunRef.current += 1;
                        setExportAuditResult(null);
                        setExportAuditLoading(false);
                        setWritingCheck(null);
                        if (result.score !== undefined) {
                          setAgentActivityLog(prev => [...prev, { text: '📊 Score: ' + result.score + '/100', type: 'score', time: new Date().toLocaleTimeString() }]);
                        }
                        console.info('[ExpertWorkbench] complete command=' + JSON.stringify(cmd) + ' score=' + (result.score !== undefined ? result.score : 'n/a'));
                        addToast('✅ Command applied!', 'success');
                      } else {
                        console.warn('[ExpertWorkbench] noop command=' + JSON.stringify(cmd) + ' — no HTML changes');
                        setAgentActivityLog(prev => [...prev, { text: 'ℹ No changes applied', type: 'info', time: new Date().toLocaleTimeString() }]);
                        addToast('ℹ️ No changes applied', 'info');
                      }
                    } catch (err) {
                      console.error('[ExpertWorkbench] error command=' + JSON.stringify(cmd), err);
                      setAgentActivityLog(prev => [...prev, { text: '❌ ' + (err && (err.message || err)), type: 'error', time: new Date().toLocaleTimeString() }]);
                      addToast('❌ Workbench failed: ' + (err && (err.message || err) || 'unknown error'), 'error');
                    }
                    if (mountedRef.current) setIsAgentRunning(false);
                  }}>
                    <input
                      type="text"
                      value={expertCommandInput}
                      onChange={(e) => setExpertCommandInput(e.target.value)}
                      placeholder={isAgentRunning ? 'Agent working...' : 'Type command: audit, auto, or natural language...'}
                      disabled={isAgentRunning}
                      aria-label="Expert remediation command"
                      className="flex-1 px-2 py-1 bg-slate-700 text-white text-[11px] rounded border border-slate-600 placeholder-slate-500 focus:ring-1 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
                    />
                    <button type="submit" disabled={isAgentRunning || !expertCommandInput.trim()}
                      className="px-2 py-1 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-30 transition-colors"
                      aria-label="Execute command"
                    >{isAgentRunning ? '⏳' : '▶'}</button>
                  </form>
                  </div>
                </details>
                {/* Agent Activity Feed */}
                {agentActivityLog.length > 0 && (
                  <div className="bg-slate-900 border-b border-slate-700">
                    <div className={(agentLogFullView ? 'max-h-64' : 'max-h-24') + ' overflow-y-auto px-2 py-1 space-y-0.5 text-[11px] font-mono'} aria-live="polite" aria-label="Agent activity log">
                      {(agentLogFullView ? agentActivityLog : agentActivityLog.slice(-8)).map((entry, i) => (
                        <div key={i} className={'flex items-start gap-1 ' + (entry.type === 'error' ? 'text-red-400' : entry.type === 'score' ? 'text-cyan-300' : entry.type === 'success' || entry.type === 'complete' ? 'text-green-400' : entry.type === 'tool' ? 'text-amber-300' : entry.type === 'command' ? 'text-purple-300' : 'text-slate-400')}>
                          <span className="text-slate-400 shrink-0">{entry.time}</span>
                          <span>{entry.text}</span>
                        </div>
                      ))}
                      {isAgentRunning && <div className="text-purple-400 animate-pulse">⏳ Processing...</div>}
                    </div>
                    <div className="flex items-center gap-3 px-2 py-1 border-t border-slate-800">
                      <button type="button" onClick={() => setAgentLogFullView(v => !v)} className="text-[10px] text-purple-300 hover:text-purple-200 underline">
                        {agentLogFullView ? 'Show recent only' : `Show full log (${agentActivityLog.length})`}
                      </button>
                      <button type="button" onClick={async () => {
                        const text = agentActivityLog.map(e => ((e && e.time ? e.time + ' ' : '') + ((e && e.text) || ''))).join('\n');
                        let ok = false;
                        try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch (_) { ok = false; }
                        if (!ok) { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.focus(); ta.select(); ok = document.execCommand('copy'); document.body.removeChild(ta); } catch (_) { ok = false; } }
                        addToast(ok ? ('📋 Log copied (' + agentActivityLog.length + ' events)') : 'Could not copy — select the log text manually.', ok ? 'success' : 'error');
                      }} className="text-[10px] text-cyan-300 hover:text-cyan-200 underline" title="Copy the full agent/pipeline log to the clipboard">📋 Copy log</button>
                      <button type="button" onClick={() => { setAgentActivityLog([]); console.info('[ExpertWorkbench] log cleared'); }} className="text-[10px] text-slate-300 hover:text-white underline ml-auto">Clear</button>
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-hidden bg-slate-100 p-4">
                  <iframe
                    id="document-builder-preview"
                    ref={exportPreviewRef}
                    title="Editable document preview"
                    className="w-full h-full bg-white rounded-lg shadow-inner border border-slate-400"
                    sandbox={exportPreviewSource === 'remediation' ? 'allow-same-origin' : 'allow-same-origin allow-scripts allow-forms'}
                    onLoad={() => {
                      console.info('[ExportPreview] iframe loaded');
                      // Paste/drop sanitizer (builder-review A4, 2026-07-01). The editor is an
                      // allow-scripts designMode iframe: a pasted rich-text payload carrying
                      // <script>, on* handlers, or javascript: URLs executed HERE and shipped in
                      // the exported/distributed HTML. Rich-HTML paste/drop is now routed through
                      // a DOMParser scrub (scripts/embeds/forms out; on* attributes off;
                      // javascript:/vbscript:/data: URLs off — data:image/png|jpeg|gif|webp kept
                      // for pasted pictures). Plain-text paste is untouched. onLoad refires after
                      // every doc.write, so each fresh document gets its own listeners.
                      try {
                        const doc = exportPreviewRef.current?.contentDocument;
                        if (!doc || doc.__alloPasteGuard) return;
                        doc.__alloPasteGuard = true;
                        applyPageMargin(exportConfig.pageMargin || '1in');
                        refreshDocumentStats();
                        const _sanitizeFragment = (html) => {
                          try {
                            const p = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html');
                            p.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form').forEach(el => el.remove());
                            p.querySelectorAll('*').forEach(el => {
                              for (const a of Array.from(el.attributes)) {
                                const n = a.name.toLowerCase(), v = String(a.value || '');
                                if (n.startsWith('on')) el.removeAttribute(a.name);
                                else if ((n === 'href' || n === 'src' || n === 'xlink:href' || n === 'formaction' || n === 'action')
                                  && /^\s*(javascript|vbscript|data)\s*:/i.test(v)
                                  && !/^\s*data:image\/(png|jpe?g|gif|webp)/i.test(v)) el.removeAttribute(a.name);
                              }
                            });
                            return p.body.innerHTML;
                          } catch (_) { return String(html || '').replace(/</g, '&lt;'); }
                        };
                        const _insertSanitized = (e, dt) => {
                          const html = dt && dt.getData && dt.getData('text/html');
                          if (!html) return; // plain-text paste/drop is safe — native handling
                          e.preventDefault();
                          try { doc.execCommand('insertHTML', false, _sanitizeFragment(html)); } catch (_) {}
                        };
                        doc.addEventListener('paste', (e) => { try { _insertSanitized(e, e.clipboardData); } catch (_) {} }, true);
                        doc.addEventListener('drop', (e) => { try { _insertSanitized(e, e.dataTransfer); } catch (_) {} }, true);
                        // WYSIWYG edit capture (builder-review A1, capture half, 2026-07-01).
                        // designMode edits previously lived ONLY in this iframe's DOM — Save
                        // Project / export-from-history regenerated from history and silently
                        // discarded them. Capture the edited pack (debounced) into a session
                        // global with a timestamp; the persist/restore wiring (project save +
                        // preview re-hydration, with a history-newer invalidation check) is the
                        // follow-up half — design in memory: project_comprehensive_review.
                        let _capT = null;
                        const _captureEdits = () => {
                          try { window.__alloBuilderEditedPack = { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML, at: Date.now() }; } catch (_) {}
                        };
                        doc.addEventListener('input', () => {
                          try {
                            if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1');
                            writingCheckRunRef.current += 1;
                            auditRunRef.current += 1;
                            expertRunRef.current += 1;
                            if (mountedRef.current) {
                              setWritingCheck(null);
                              setExportAuditResult(null);
                              setExportAuditLoading(false);
                            }
                              refreshDocumentStats();
                            if (_capT) clearTimeout(_capT);
                            _capT = setTimeout(_captureEdits, 800);
                          } catch (_) {}
                        }, true);
                      } catch (_) {}
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
  );
}


// ─── updateExportPreview (extracted from AlloFlowANTI.txt 2026-07-20) ───────
// The Document Builder preview writer: renders getExportPreviewHTML() into the
// preview iframe, arms designMode editing with the edit-loss guard, wires
// builder image-crop affordances, and applies the a11y inspector. Pure DOM —
// every host binding arrives via deps (contract-gated wrapper in the host).
function updateExportPreview(deps) {
  const {
    exportPreviewRef, _exportPreviewErrorRef, _builderRecoverySaveTimerRef,
    getExportPreviewHTML, t, addToast, warnLog, setCanvasRecoveryRevision,
    isCanvas, a11yInspectMode,
  } = deps;

    if (!exportPreviewRef.current) return;
    const iframe = exportPreviewRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    // Check the live dirty flag BEFORE generating replacement HTML. This avoids
    // expensive duplicate generation and ensures a cancelled refresh consumes no draft.
    try {
      if (doc.body && doc.body.getAttribute && doc.body.getAttribute('data-allo-user-edited') === '1') {
        const _canAsk = typeof window !== 'undefined' && typeof window.confirm === 'function';
        const _proceed = _canAsk
          ? window.confirm(t('export_preview.rerender_confirm') || 'Re-rendering the preview will replace your manual edits with freshly generated content.\n\nContinue and discard the edits? (Cancel keeps them - export or close the builder to save first.)')
          : false;
        if (!_proceed) {
          addToast && addToast(t('toasts.builder_edits_preserved') || 'Kept your manual edits - the preview was not re-rendered. Export or close the builder to save them, then change settings.', 'info');
          return;
        }
      }
    } catch (_) {}
    let html;
    try {
      html = getExportPreviewHTML();
      _exportPreviewErrorRef.current = null;
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      warnLog('[Export preview] getExportPreviewHTML threw:', err);
      if (_exportPreviewErrorRef.current !== msg) {
        _exportPreviewErrorRef.current = msg;
        addToast && addToast(t('toasts.preview_failed_render_document_pipeline'), 'error');
      }
      const escapedMsg = msg.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
      html = `<!DOCTYPE html><html><body data-allo-preview-error="1" style="font-family:system-ui;padding:2rem;color:#991b1b;background:#fef2f2"><h2>Preview error</h2><pre style="white-space:pre-wrap;font-size:12px">${escapedMsg}</pre><p style="font-size:12px;color:#7f1d1d;margin-top:1rem">If this persists, the CDN-loaded doc pipeline likely needs a redeploy with the latest fix.</p></body></html>`;
    }
    doc.open();
    doc.write(html);
    doc.close();

    // Initialize edit mode in the iframe doc directly here
    try {
      doc.designMode = 'on';
      if (doc.body) doc.body.spellcheck = true;
      // Make preview images keyboard-reachable while editing. The marker lets
      // every serialization seam remove editor-only tabindex/key hints.
      const _wireBuilderCropImage = (img) => {
        if (!img || img.hasAttribute('data-allo-crop-tabindex-added')) return;
        const hadTabindex = img.hasAttribute('tabindex');
        if (!hadTabindex) img.setAttribute('tabindex', '0');
        img.setAttribute('data-allo-crop-tabindex-added', hadTabindex ? 'preserved' : 'added');
        img.setAttribute('aria-keyshortcuts', 'Enter Space');
      };
      doc.querySelectorAll('img').forEach(_wireBuilderCropImage);
      // Dirty flag for the edit-loss guard above: any user edit marks the
      // body so settings-driven re-renders can't silently wipe hand edits.
      try { doc.addEventListener('input', function () {
        try { if (doc.body) doc.body.setAttribute('data-allo-user-edited', '1'); } catch (_) {}
        if (isCanvas) {
          if (_builderRecoverySaveTimerRef.current) clearTimeout(_builderRecoverySaveTimerRef.current);
          _builderRecoverySaveTimerRef.current = setTimeout(() => {
            _builderRecoverySaveTimerRef.current = null;
            setCanvasRecoveryRevision(value => value + 1);
          }, 500);
        }
      }); } catch (_) {}
      const editStyle = doc.createElement('style');
      // The id lets export paths strip this editor-only CSS so it never
      // ships inside a student-facing document.
      editStyle.id = 'allo-builder-edit-css';
      editStyle.textContent = `
        [contenteditable]:focus, *:focus { outline: 2px solid #6366f1 !important; outline-offset: 2px; border-radius: 4px; }
        img { cursor: move; transition: outline 0.2s; }
        img:hover { outline: 2px dashed #6366f1; }
        ::selection { background: #c7d2fe; }
      `;
      doc.head.appendChild(editStyle);
      doc.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          // WCAG 2.1.2 escape hatch: Escape was dead inside the editing
          // iframe — a keyboard trap. Move focus back to the builder chrome.
          try { e.preventDefault(); const _cb = document.querySelector('[aria-label="' + (t('a11y.close_doc_builder') || 'Close document builder') + '"]'); if (_cb && _cb.focus) _cb.focus(); } catch (_) {}
          return;
        }
        if (e.key === 'Tab') {
          // Key events inside an iframe do not bubble to the parent dialog.
          // Hand focus across the iframe boundary at either edge so the modal
          // remains a single, closed keyboard loop.
          try {
            const inner = Array.from(doc.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'));
            const active = doc.activeElement;
            const atStart = !inner.length || active === doc.body || active === inner[0];
            const atEnd = !inner.length || active === doc.body || active === inner[inner.length - 1];
            if ((e.shiftKey && atStart) || (!e.shiftKey && atEnd)) {
              const frame = exportPreviewRef.current;
              const dialog = frame && frame.closest('[role="dialog"]');
              const outer = dialog ? Array.from(dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0) : [];
              const frameIndex = outer.indexOf(frame);
              const target = e.shiftKey ? outer[Math.max(0, frameIndex - 1)] : outer[0];
              if (target && target.focus) { e.preventDefault(); target.focus(); return; }
            }
          } catch (_) {}
        }
        if ((e.key === 'Enter' || e.key === ' ') && e.target && (e.target.tagName || '').toUpperCase() === 'IMG') {
          e.preventDefault(); e.stopPropagation(); _openBuilderCropModal(e.target); return;
        }
        if (e.ctrlKey || e.metaKey) {
          if (e.key === '1') { e.preventDefault(); doc.execCommand('formatBlock', false, '<h1>'); }
          else if (e.key === '2') { e.preventDefault(); doc.execCommand('formatBlock', false, '<h2>'); }
          else if (e.key === '3') { e.preventDefault(); doc.execCommand('formatBlock', false, '<h3>'); }
          else if (e.key === '0') { e.preventDefault(); doc.execCommand('formatBlock', false, '<p>'); }
          else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); var url = prompt(t('toasts.link_url_prompt') || 'Enter link URL:'); if (url) doc.execCommand('createLink', false, url); }
          else if (e.shiftKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); doc.execCommand('insertUnorderedList', false, null); }
          else if (e.shiftKey && (e.key === 'o' || e.key === 'O')) { e.preventDefault(); doc.execCommand('insertOrderedList', false, null); }
        }
      });
      // ── Image crop (Tier 1, 2026-07-02) ── Click any image in the preview →
      // floating "✂ Crop" button → drag-select modal → the image's src is
      // replaced with the cropped pixels. Unlike the remediated-doc "Adjust
      // Crop" (which re-crops from the cached PDF PAGE canvas and only exists
      // on extracted images carrying data-crop), this works on ANY <img> —
      // uploaded, AI-generated, or generated-content — by cropping the image's
      // own pixels. PRIVACY: the pre-crop original deliberately never enters
      // the DOM — teachers crop to REMOVE content (a student name, a stray
      // face), and an attribute-stashed original would silently ship those
      // pixels inside every export. Originals live in
      // window.__alloBuilderCropOriginals (session-only, FIFO-capped like the
      // page re-crop cache), keyed via data-allo-crop-id, so re-crop starts
      // from the full image while serialized output only ever carries the
      // cropped result. All crop chrome is tagged data-allo-crop-ui: the
      // floating button self-expires, and _removeBuilderCropUi() + the
      // write-back clone-strip sweep it at every serialization seam this file
      // owns. (The view module's Workbench/copy paths serialize too — chrome
      // there is a transient cosmetic risk only, never a pixel leak.)
      const _cropOrigStore = () => {
        if (!window.__alloBuilderCropOriginals) window.__alloBuilderCropOriginals = { map: {}, order: [] };
        return window.__alloBuilderCropOriginals;
      };
      const _openBuilderCropModal = (img) => {
        try { const _old = doc.getElementById('allo-crop-overlay'); if (_old) _old.remove(); } catch (_) {}
        const returnFocus = img;
        const store = _cropOrigStore();
        const keyExisting = img.getAttribute('data-allo-crop-id');
        // Crop from the ORIGINAL when we still have it (non-destructive
        // re-crop); otherwise from the current (possibly already-cropped) src.
        const srcFull = (keyExisting && store.map[keyExisting]) || img.src;
        const overlay = doc.createElement('div');
        overlay.id = 'allo-crop-overlay';
        overlay.setAttribute('data-allo-crop-ui', '1');
        overlay.setAttribute('contenteditable', 'false');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', t('export_preview.crop_dialog') || 'Crop image');
        overlay.setAttribute('aria-describedby', 'allo-crop-instructions');
        overlay.setAttribute('tabindex', '-1');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,0.78);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;font-family:system-ui,sans-serif';
        const header = doc.createElement('div');
        header.id = 'allo-crop-instructions';
        header.style.cssText = 'color:#fff;font-size:13px;font-weight:700;margin-bottom:8px;text-align:center;max-width:86vw';
        header.textContent = t('export_preview.crop_instructions') || 'Drag to select the part to keep — arrow keys nudge the selection, Shift+arrows resize it. Apply replaces the image in every export.';
        overlay.appendChild(header);
        const wrapper = doc.createElement('div');
        wrapper.style.cssText = 'position:relative;max-width:90vw;max-height:66vh;overflow:auto;background:#1e293b;border-radius:8px;border:2px solid #64748b;cursor:crosshair;touch-action:none';
        overlay.appendChild(wrapper);
        const pic = doc.createElement('img');
        pic.alt = '';
        pic.draggable = false;
        pic.style.cssText = 'display:block;max-width:86vw;max-height:62vh;user-select:none;-webkit-user-drag:none';
        pic.src = srcFull;
        wrapper.appendChild(pic);
        const sel = doc.createElement('div');
        sel.style.cssText = 'position:absolute;border:2px dashed #60a5fa;background:rgba(37,99,235,0.18);pointer-events:none;display:none';
        wrapper.appendChild(sel);
        const statusEl = doc.createElement('div');
        statusEl.setAttribute('role', 'status');
        statusEl.style.cssText = 'color:#fde68a;font-size:12px;font-weight:600;min-height:16px;margin-top:6px;text-align:center;max-width:86vw';
        const _status = (msg) => { statusEl.textContent = msg || ''; };
        // Pre-position the selection to the previous crop of the SAME original
        // (skipped when the original was FIFO-evicted — the stored rect would
        // be in the wrong coordinate space).
        pic.onload = () => {
          try {
            const prev = JSON.parse(img.getAttribute('data-allo-crop') || 'null');
            if (prev && prev.nw === pic.naturalWidth && prev.nh === pic.naturalHeight) {
              const kx = pic.clientWidth / prev.nw, ky = pic.clientHeight / prev.nh;
              sel.style.left = (prev.x * kx) + 'px';
              sel.style.top = (prev.y * ky) + 'px';
              sel.style.width = (prev.w * kx) + 'px';
              sel.style.height = (prev.h * ky) + 'px';
              sel.style.display = 'block';
            }
          } catch (_) {}
        };
        pic.onerror = () => { _status(t('export_preview.crop_load_failed') || 'The image failed to load — close this and try again.'); };
        // Pointer (mouse/touch/pen) drag-select — same math as the remediated
        // doc's __pdfCropImage, upgraded to pointer events + capture.
        let _dragging = false, _startX = 0, _startY = 0;
        wrapper.addEventListener('pointerdown', (e) => {
          if (e.target !== pic && e.target !== wrapper) return;
          const r = pic.getBoundingClientRect();
          _startX = Math.max(0, Math.min(e.clientX - r.left, pic.clientWidth));
          _startY = Math.max(0, Math.min(e.clientY - r.top, pic.clientHeight));
          _dragging = true;
          try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
          sel.style.left = _startX + 'px'; sel.style.top = _startY + 'px';
          sel.style.width = '0'; sel.style.height = '0';
          sel.style.display = 'block';
          _status('');
          e.preventDefault(); // also keeps focus on the buttons so arrow keys keep working
        });
        wrapper.addEventListener('pointermove', (e) => {
          if (!_dragging) return;
          const r = pic.getBoundingClientRect();
          const cx = Math.max(0, Math.min(e.clientX - r.left, pic.clientWidth));
          const cy = Math.max(0, Math.min(e.clientY - r.top, pic.clientHeight));
          sel.style.left = Math.min(_startX, cx) + 'px';
          sel.style.top = Math.min(_startY, cy) + 'px';
          sel.style.width = Math.abs(cx - _startX) + 'px';
          sel.style.height = Math.abs(cy - _startY) + 'px';
        });
        wrapper.addEventListener('pointerup', () => { _dragging = false; });
        const _close = () => { try { overlay.remove(); } catch (_) {} try { if (returnFocus && returnFocus.isConnected && returnFocus.focus) returnFocus.focus(); else if (doc.body && doc.body.focus) doc.body.focus(); } catch (_) {} };
        overlay.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); _close(); return; }
          if (e.key === 'Tab') {
            const controls = Array.from(overlay.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length > 0);
            if (!controls.length) { e.preventDefault(); overlay.focus(); return; }
            const first = controls[0], last = controls[controls.length - 1];
            if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); return; }
            if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); return; }
          }
          const moves = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] };
          const d = moves[e.key];
          if (!d || sel.style.display === 'none') return;
          e.preventDefault(); e.stopPropagation(); // don't scroll the wrapper / trip the doc-level Escape handler
          let L = parseFloat(sel.style.left) || 0, T = parseFloat(sel.style.top) || 0;
          let W = parseFloat(sel.style.width) || 0, H = parseFloat(sel.style.height) || 0;
          if (e.shiftKey) {
            W = Math.max(8, Math.min(pic.clientWidth - L, W + d[0]));
            H = Math.max(8, Math.min(pic.clientHeight - T, H + d[1]));
          } else {
            L = Math.max(0, Math.min(pic.clientWidth - W, L + d[0]));
            T = Math.max(0, Math.min(pic.clientHeight - H, T + d[1]));
          }
          sel.style.left = L + 'px'; sel.style.top = T + 'px'; sel.style.width = W + 'px'; sel.style.height = H + 'px';
        });
        const btnRow = doc.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center';
        const _mkBtn = (label, bg, border) => {
          const b = doc.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.style.cssText = 'padding:8px 20px;background:' + bg + ';color:#fff;border:1px solid ' + border + ';border-radius:8px;font-weight:700;font-size:13px;cursor:pointer';
          btnRow.appendChild(b);
          return b;
        };
        const applyBtn = _mkBtn(t('export_preview.crop_apply') || 'Apply Crop', '#2563eb', '#1e3a8a');
        applyBtn.onclick = () => {
          if (sel.style.display === 'none') { _status(t('export_preview.crop_none') || 'Drag a selection first.'); return; }
          if (!pic.naturalWidth || !pic.clientWidth) { _status(t('export_preview.crop_load_failed') || 'The image failed to load — close this and try again.'); return; }
          const kx = pic.naturalWidth / pic.clientWidth, ky = pic.naturalHeight / pic.clientHeight;
          let sx = (parseFloat(sel.style.left) || 0) * kx, sy = (parseFloat(sel.style.top) || 0) * ky;
          let sw = (parseFloat(sel.style.width) || 0) * kx, sh = (parseFloat(sel.style.height) || 0) * ky;
          sx = Math.max(0, Math.min(sx, pic.naturalWidth - 1)); sy = Math.max(0, Math.min(sy, pic.naturalHeight - 1));
          sw = Math.min(sw, pic.naturalWidth - sx); sh = Math.min(sh, pic.naturalHeight - sy);
          if (sw < 8 || sh < 8) { _status(t('export_preview.crop_too_small') || 'That selection is too small — drag a larger area.'); return; }
          const c = doc.createElement('canvas');
          c.width = Math.round(sw); c.height = Math.round(sh);
          let out;
          try {
            c.getContext('2d').drawImage(pic, sx, sy, sw, sh, 0, 0, c.width, c.height);
            // JPEG only when the source already was one (photos stay small);
            // everything else stays PNG so transparency survives the crop.
            const asJpeg = /^data:image\/jpe?g/i.test(srcFull) || /\.jpe?g([?#]|$)/i.test(srcFull);
            out = c.toDataURL(asJpeg ? 'image/jpeg' : 'image/png', 0.92);
          } catch (_taintErr) {
            _status(t('export_preview.crop_blocked') || 'This image comes from another website, so the browser blocks cropping it here. Save it to your device, upload it, then crop.');
            return;
          }
          let key = img.getAttribute('data-allo-crop-id');
          if (!key) {
            window.__alloBuilderCropSeq = (window.__alloBuilderCropSeq || 0) + 1;
            key = 'c' + window.__alloBuilderCropSeq;
            img.setAttribute('data-allo-crop-id', key);
          }
          if (!store.map[key]) {
            store.map[key] = srcFull;
            store.order.push(key);
            while (store.order.length > 30) delete store.map[store.order.shift()]; // FIFO cap — same rationale as the page re-crop cache
          }
          img.src = out;
          img.setAttribute('data-allo-crop', JSON.stringify({ x: Math.round(sx), y: Math.round(sy), w: Math.round(sw), h: Math.round(sh), nw: pic.naturalWidth, nh: pic.naturalHeight }));
          // Programmatic src swaps don't fire the 'input' listener, so arm the
          // edit-loss guard by hand — a settings re-render must not silently
          // wipe the crop.
          try { if (doc.body) { doc.body.setAttribute('data-allo-user-edited', '1'); doc.body.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true })); } } catch (_) {}
          _close();
          addToast(t('toasts.image_cropped') || '✂️ Image cropped — the change rides every export. Click the image again to re-crop or restore the original.', 'success');
        };
        if (keyExisting && store.map[keyExisting]) {
          const resetBtn = _mkBtn(t('export_preview.crop_reset') || 'Restore original', '#b45309', '#92400e');
          resetBtn.onclick = () => {
            img.src = store.map[keyExisting];
            img.removeAttribute('data-allo-crop');
            img.removeAttribute('data-allo-crop-id');
            try { if (doc.body) { doc.body.setAttribute('data-allo-user-edited', '1'); doc.body.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true })); } } catch (_) {}
            _close();
            addToast(t('toasts.image_crop_reset') || '↩️ Original image restored.', 'success');
          };
        }
        const cancelBtn = _mkBtn(t('export_preview.crop_cancel') || 'Cancel', '#64748b', '#475569');
        cancelBtn.onclick = _close;
        overlay.appendChild(btnRow);
        overlay.appendChild(statusEl);
        doc.body.appendChild(overlay);
        try { applyBtn.focus(); } catch (_) {}
      };
      const _dismissCropBtn = () => { try { const b = doc.getElementById('allo-crop-btn'); if (b) b.remove(); } catch (_) {} };
      doc.addEventListener('scroll', _dismissCropBtn, true); // scrolled = the absolute-positioned button no longer hugs its image
      doc.addEventListener('click', (ev) => {
        try {
          const el = ev.target;
          if (el && el.closest && el.closest('[data-allo-crop-ui]')) return; // crop chrome handles its own clicks
          _dismissCropBtn();
          if (!el || (el.tagName || '').toUpperCase() !== 'IMG') return;
          if (!el.src || !el.naturalWidth || el.naturalWidth < 16 || el.naturalHeight < 16) return; // icons / broken images
          const btn = doc.createElement('button');
          btn.id = 'allo-crop-btn';
          btn.type = 'button';
          btn.setAttribute('data-allo-crop-ui', '1');
          btn.setAttribute('contenteditable', 'false');
          btn.textContent = '✂ ' + (t('export_preview.crop_button') || 'Crop');
          btn.title = t('export_preview.crop_button_title') || 'Crop this image (persists in every export)';
          const r = el.getBoundingClientRect();
          const w = doc.defaultView;
          btn.style.cssText = 'position:absolute;z-index:2147482000;left:' + Math.max(0, r.left + (w ? w.pageXOffset : 0) + 6) + 'px;top:' + Math.max(0, r.top + (w ? w.pageYOffset : 0) + 6) + 'px;padding:5px 12px;background:#4f46e5;color:#fff;border:1px solid #3730a3;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,0.35);font-family:system-ui,sans-serif';
          btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); _dismissCropBtn(); _openBuilderCropModal(el); };
          doc.body.appendChild(btn);
          // TTL: the button is chrome inside a serializable DOM — never leave
          // it parked. Each button removes only ITSELF (a fresh button on
          // another image must not be reaped by a stale timer).
          setTimeout(() => { try { if (btn.parentNode) btn.remove(); } catch (_) {} }, 10000);
        } catch (_) {}
      });
    } catch (_editorErr) {
      warnLog('[Export preview] failed to initialize editor in iframe:', _editorErr);
    }

    // If the user has the A11y inspector toggled on, re-paint it now —
    // doc.write() just wiped every badge/style/legend from the iframe.
    // Without this, the inspector flashes briefly and disappears whenever
    // any state change (history bumps, theme tweaks, audio caching, etc.)
    // re-runs updateExportPreview — which is constant traffic for AlloFlow-
    // generated docs. PDF remediation didn't hit this because its preview
    // payload is static after the initial render.
    if (a11yInspectMode) {
      try {
        const _eh = window.AlloModules && window.AlloModules.ExportHandlers;
        if (_eh && typeof _eh.applyA11yInspector === 'function') {
          _eh.applyA11yInspector({ exportPreviewRef: exportPreviewRef, enabled: true });
        }
      } catch (_inspErr) {
        warnLog('[Export preview] applyA11yInspector failed:', _inspErr);
      }
    }
}
