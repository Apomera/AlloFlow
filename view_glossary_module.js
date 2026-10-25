/**
 * AlloFlow View - Glossary Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='glossary' block.
 * Source range (pre-extraction): lines 29412-31037 (~1626 lines).
 * Renders the glossary view: term cards, multi-language toggles,
 * flashcard launchers, mini-games (memory/crossword/bingo/scramble/
 * syntax), audio downloads, export buttons, health checks, etymology
 * panels, and edit-mode controls. ErrorBoundary + game components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.GlossaryView) {
    console.log('[CDN] ViewGlossaryModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewGlossaryModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  // Image changes use the host's resource/entry task, shared with AI generation.
// Mulberry is fetched only when its picker opens, a search is submitted, or a result is selected.
const GLOSSARY_IMAGE_TYPES = /^image\/(png|jpeg|gif|webp|avif)$/i;
function readGlossaryImageFile(file, signal, allowSvg = false) {
  if (!file || !(GLOSSARY_IMAGE_TYPES.test(file.type) || allowSvg && file.type === 'image/svg+xml')) return Promise.reject(new Error('Choose a PNG, JPEG, GIF, WebP, or AVIF image.'));
  if (!file.size || file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 10 MB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const aborted = () => {
      reader.abort();
      finish(new Error('Image replacement canceled.'));
    };
    const finish = (error, value) => {
      if (signal) signal.removeEventListener('abort', aborted);
      if (error) reject(error);else resolve(value);
    };
    reader.onload = () => typeof reader.result === 'string' && reader.result.startsWith('data:image/') ? finish(null, reader.result) : finish(new Error('The image could not be read. Try another file.'));
    reader.onerror = () => finish(new Error('The image could not be read. Try another file.'));
    if (signal?.aborted) {
      aborted();
      return;
    }
    if (signal) signal.addEventListener('abort', aborted, {
      once: true
    });
    try {
      reader.readAsDataURL(file);
    } catch (_) {
      finish(new Error('The image could not be read. Try another file.'));
    }
  });
}
async function searchGlossaryMulberry(query, signal) {
  const q = String(query || '').trim();
  if (!q) return [];
  // The glossary's primary term column is English, independent of UI language.
  const response = await fetch('https://globalsymbols.com/api/v1/labels/search?query=' + encodeURIComponent(q) + '&symbolset=mulberry&language=eng&language_iso_format=639-3&limit=30', {
    signal
  });
  if (!response.ok) throw new Error('Mulberry search is unavailable. Please try again.');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Mulberry search returned an unexpected response.');
  const seen = new Set();
  return rows.flatMap(row => {
    const url = row?.picto?.image_url;
    if (typeof url !== 'string' || !/^https:\/\//i.test(url) || seen.has(url)) return [];
    seen.add(url);
    return [{
      id: row.picto.id || row.id || url,
      label: String(row.text || q),
      url
    }];
  }).slice(0, 30);
}
async function prepareGlossaryMulberry(result, signal) {
  if (!/^https:\/\//i.test(result?.url || '')) throw new Error('This symbol has no usable image.');
  const response = await fetch(result.url, {
    signal
  });
  if (!response.ok) throw new Error('The symbol could not be downloaded. Please try again.');
  const source = await readGlossaryImageFile(await response.blob(), signal, true);
  // Rasterize SVGs for the same image editing/export paths as uploaded pictures.
  // Credit travels inside the image, including exports that copy only image bytes.
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    const stop = () => {
      img.src = '';
      cleanup();
      reject(new Error('Image replacement canceled.'));
    };
    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', stop);
    };
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('The symbol image could not be opened.'));
    };
    if (signal?.aborted) {
      stop();
      return;
    }
    if (signal) signal.addEventListener('abort', stop, {
      once: true
    });
    img.src = source;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 688;
  const ctx = canvas.getContext('2d');
  if (!ctx || !image.naturalWidth || !image.naturalHeight) throw new Error('The symbol image could not be opened.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 640, 688);
  const scale = Math.min(608 / image.naturalWidth, 608 / image.naturalHeight);
  const width = image.naturalWidth * scale,
    height = image.naturalHeight * scale;
  ctx.drawImage(image, (640 - width) / 2, (640 - height) / 2, width, height);
  ctx.fillStyle = '#334155';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mulberry Symbols by Steve Lee | CC BY-SA 4.0 | Converted to PNG', 320, 650);
  ctx.fillText('globalsymbols.com/symbolsets/mulberry', 320, 666);
  ctx.fillText('creativecommons.org/licenses/by-sa/4.0/', 320, 682);
  const symbol = canvas.toDataURL('image/png');
  glossaryCreditBands.set(symbol, 688 - 640);
  return symbol;
}
// A classroom photo arrives screened, with AI alt text of the photo itself.
// Credit is drawn in a band under it, as for Mulberry, so it survives exports
// that copy only the image bytes.
async function prepareGlossaryPhoto(choice, signal) {
  const source = typeof choice?.dataUrl === 'string' && /^data:image\/(png|jpeg|gif|webp)[;,]/i.test(choice.dataUrl) ? choice.dataUrl : '';
  if (!source) throw new Error('This photo has no usable image.');
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    const stop = () => {
      img.src = '';
      cleanup();
      reject(new Error('Image replacement canceled.'));
    };
    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', stop);
    };
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('The photo could not be opened.'));
    };
    if (signal?.aborted) {
      stop();
      return;
    }
    if (signal) signal.addEventListener('abort', stop, {
      once: true
    });
    img.src = source;
  });
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('The photo could not be opened.');
  const width = Math.min(960, image.naturalWidth);
  const height = Math.round(image.naturalHeight * (width / image.naturalWidth));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The photo could not be opened.');
  ctx.font = '13px sans-serif';
  // The shared credit band keeps the licence and its address on lines of their own.
  const bandLines = window.AlloModules?.AltText?.creditBandLines;
  const credit = bandLines ? bandLines(ctx, width, choice.attribution, choice.creditLine) : [String(choice.creditLine || '')];
  canvas.width = width;
  canvas.height = height + (credit.length ? 10 + credit.length * 17 : 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.fillStyle = '#334155';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  credit.forEach((text, i) => ctx.fillText(text, width / 2, height + 20 + i * 17, width - 8));
  const photo = canvas.toDataURL('image/jpeg', 0.9);
  glossaryCreditBands.set(photo, canvas.height - height);
  return photo;
}
// The height of the credit band drawn under a prepared picture, by its data URL,
// read once by replace() so an AI refine can take the band off and redraw it.
const glossaryCreditBands = new Map();
function glossaryImageReplacement(image, attribution = null, extra = null) {
  return Object.assign({
    image,
    imageAlt: '',
    imageAltHash: '',
    imageAltSource: '',
    imageDecorative: false,
    imageSource: attribution ? 'mulberry' : 'author-upload',
    imageAttribution: attribution,
    imageCreditBand: 0
  }, extra || {});
}
// Capture only image fields: Undo must not roll back term/definition edits.
function glossaryImageSnapshot(item) {
  const snapshot = {};
  ['image', 'imageAlt', 'imageAltHash', 'imageAltSource', 'imageDecorative', 'imageSource', 'imageAttribution', 'imageCreditBand'].forEach(key => {
    snapshot[key] = item[key] ?? (key === 'imageDecorative' ? false : key === 'imageAttribution' ? null : '');
  });
  return snapshot;
}
function glossaryImageDescriptionHash(image) {
  image = typeof image === 'string' ? image : '';
  let h = 0x811c9dc5;
  const mix = c => {
    h ^= c;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  String(image.length).split('').forEach(ch => mix(ch.charCodeAt(0)));
  const step = Math.max(1, Math.floor(image.length / 4096));
  for (let i = 0; i < image.length; i += step) mix(image.charCodeAt(i));
  return 'img-' + image.length.toString(36) + '-' + h.toString(16).padStart(8, '0');
}
function glossaryCurrentDescription(item) {
  return !item.imageDecorative && (!item.imageAltHash || item.imageAltHash === glossaryImageDescriptionHash(item.image)) ? String(item.imageAlt || '') : '';
}
// Keep Tab cycling inside the picker, including the last link on its search page.
function containGlossaryImageDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const dialog = event.currentTarget;
  const controls = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter(element => !element.hidden && element.getClientRects().length > 0);
  const first = controls[0],
    last = controls[controls.length - 1];
  if (!first) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
    event.preventDefault();
    first.focus();
  }
}
// A failed preview must be visible and retryable before choosing a symbol.
function GlossaryMulberryResult({
  result,
  term,
  working,
  buttonClass,
  onChoose,
  text = (key, fallback) => fallback
}) {
  const [preview, setPreview] = React.useState('loading');
  const [attempt, setAttempt] = React.useState(0);
  const chooseRef = React.useRef(null),
    retryRef = React.useRef(null);
  React.useEffect(() => {
    if (!attempt) return;
    if (preview === 'ready') chooseRef.current?.focus();else if (preview === 'error') retryRef.current?.focus();
  }, [preview, attempt]);
  let previewUrl = result.url;
  if (attempt) {
    const url = new URL(result.url);
    url.searchParams.set('_alloflow_preview_retry', String(attempt));
    previewUrl = url.href;
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 rounded-lg border border-slate-300 bg-white p-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: chooseRef,
    type: "button",
    disabled: working || preview !== 'ready',
    onClick: () => onChoose(previewUrl),
    className: buttonClass + ' w-full',
    "aria-label": text('glossary.images.use_symbol_aria', 'Use {symbol} for {term}').replace('{symbol}', result.label).replace('{term}', term)
  }, /*#__PURE__*/React.createElement("img", {
    key: attempt,
    src: previewUrl,
    alt: "",
    onLoad: () => setPreview('ready'),
    onError: () => setPreview('error'),
    className: preview === 'error' ? 'hidden' : 'h-24 w-full object-contain bg-white',
    loading: "lazy"
  }), preview === 'error' && /*#__PURE__*/React.createElement("span", {
    className: "flex min-h-24 items-center justify-center text-xs text-slate-700"
  }, text('glossary.images.preview_unavailable', 'Preview unavailable')), /*#__PURE__*/React.createElement("span", {
    className: "block break-words"
  }, result.label)), preview !== 'ready' && (preview === 'error' || attempt > 0) && /*#__PURE__*/React.createElement("button", {
    ref: retryRef,
    type: "button",
    className: buttonClass + ' mt-2 w-full',
    disabled: working || preview === 'loading',
    "aria-label": text('glossary.images.retry_preview_aria', 'Retry preview for {symbol}').replace('{symbol}', result.label),
    onClick: () => {
      setPreview('loading');
      setAttempt(value => value + 1);
    }
  }, preview === 'loading' ? text('glossary.images.retrying_preview', 'Retrying preview...') : text('glossary.images.retry_preview', 'Retry preview')));
}
function GlossaryImageControls({
  item,
  index,
  canEdit,
  beginTask,
  onGenerate,
  generating = false,
  t
}) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState('choices');
  const [query, setQuery] = React.useState(item.term || '');
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [error, setError] = React.useState('');
  const [undo, setUndo] = React.useState(null);
  const [description, setDescription] = React.useState(glossaryCurrentDescription(item));
  const inputRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const openerRef = React.useRef(null);
  const searchInputRef = React.useRef(null);
  const descriptionRef = React.useRef(null);
  const focusDescriptionRef = React.useRef(false);
  const searchRef = React.useRef(null);
  const pendingRef = React.useRef(null);
  const generationRef = React.useRef(null);
  const mountedRef = React.useRef(true);
  const dialogTitleId = React.useId();
  const descriptionHelpId = React.useId();
  const uploadHelpId = React.useId();
  const descriptionDirty = description.trim() !== glossaryCurrentDescription(item);
  const working = busy || generating;
  const canUndo = undo && undo.afterImage === item.image;
  const text = (key, fallback) => {
    const value = typeof t === 'function' ? t(key) : '';
    return value && value !== key ? value : fallback;
  };
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      searchRef.current?.abort();
      pendingRef.current?.cancel();
      generationRef.current = null;
    };
  }, []);
  React.useEffect(() => {
    setDescription(glossaryCurrentDescription(item));
    if (focusDescriptionRef.current) {
      focusDescriptionRef.current = false;
      descriptionRef.current?.focus();
    }
  }, [item.image, item.imageAlt, item.imageAltHash, item.imageDecorative]);
  React.useEffect(() => {
    if (!canEdit) closeDialog(false);
  }, [canEdit]);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    // Native top-layer dialogs escape the table's overflow and make the app inert.
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute('open', '');
    dialog.querySelector('button')?.focus();
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    };
  }, [open]);
  React.useEffect(() => {
    if (open && mode === 'mulberry') searchInputRef.current?.focus();
  }, [open, mode]);
  function stopSearch() {
    searchRef.current?.abort();
    searchRef.current = null;
    setSearching(false);
  }
  function closeDialog(restoreFocus = true) {
    stopSearch();
    pendingRef.current?.cancel();
    pendingRef.current = null;
    if (!generationRef.current) setBusy(false);
    if (dialogRef.current?.open && typeof dialogRef.current.close === 'function') dialogRef.current.close();
    setOpen(false);
    setMode('choices');
    if (restoreFocus) openerRef.current?.focus();
  }
  function openDialog() {
    setMode('choices');
    setError('');
    setStatus('');
    setOpen(true);
  }
  async function search(value = query) {
    const q = String(value || '').trim();
    if (!q) return;
    stopSearch();
    const controller = new AbortController();
    searchRef.current = controller;
    setSearching(true);
    setError('');
    setStatus('');
    setResults([]);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const found = await searchGlossaryMulberry(q, controller.signal);
      if (!mountedRef.current || searchRef.current !== controller) return;
      setResults(found);
      setStatus(found.length ? text('glossary.images.symbols_found', '{count} symbols found. Choose an image that fits the definition.').replace('{count}', found.length) : text('glossary.images.no_symbols', 'No symbols found. Try a simpler word.'));
    } catch (_) {
      if (mountedRef.current && searchRef.current === controller) setError(text('glossary.images.mulberry_unavailable', 'Mulberry search is unavailable. Check your connection and try again.'));
    } finally {
      clearTimeout(timeout);
      if (mountedRef.current && searchRef.current === controller) {
        searchRef.current = null;
        setSearching(false);
      }
    }
  }
  function openMulberry() {
    setMode('mulberry');
    setQuery(item.term || '');
    search(item.term);
  }
  function recordReplacement(before, image) {
    setUndo({
      before,
      afterImage: image
    });
    setDescription('');
    setMode('choices');
    stopSearch();
    setStatus(text('glossary.images.updated', 'Image updated. You can add a description or undo this change.'));
    focusDescriptionRef.current = true;
  }
  async function replace(load, attribution, extraFor) {
    if (!canEdit || typeof beginTask !== 'function' || working) return;
    const before = glossaryImageSnapshot(item);
    const task = beginTask(index);
    if (!task) return;
    pendingRef.current = task;
    setBusy(true);
    setError('');
    setStatus('');
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      task.cancel();
    }, 20000);
    try {
      const image = await load(task.signal);
      if (!task.isCurrent()) {
        if (mountedRef.current && task.isOwner()) setError(text('glossary.images.term_changed_loading', 'The term changed while the image loaded. Please try again.'));
        return;
      }
      const creditBand = glossaryCreditBands.get(image) || 0;
      glossaryCreditBands.delete(image);
      const saved = task.commit(() => glossaryImageReplacement(image, attribution, Object.assign({
        imageCreditBand: creditBand
      }, typeof extraFor === 'function' ? extraFor(image) : null)));
      if (mountedRef.current) {
        if (saved) recordReplacement(before, image);else setError(text('glossary.images.term_changed_loading', 'The term changed while the image loaded. Please try again.'));
      }
    } catch (err) {
      if (mountedRef.current && pendingRef.current === task && (task.isOwner() || timedOut)) setError(timedOut ? text('glossary.images.load_timeout', 'The image took too long to load. Please try again.') : err.message || text('glossary.images.load_failed', 'The image could not be loaded.'));
    } finally {
      clearTimeout(timeout);
      task.finish();
      if (pendingRef.current === task) {
        pendingRef.current = null;
        if (mountedRef.current) setBusy(false);
      }
    }
  }
  async function generate() {
    if (!onGenerate || working) return;
    const before = glossaryImageSnapshot(item),
      token = {};
    generationRef.current = token;
    stopSearch();
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const image = await onGenerate(index, item.term);
      if (!mountedRef.current || generationRef.current !== token) return;
      if (typeof image === 'string' && image) recordReplacement(before, image);else setError(text('glossary.images.not_changed', 'The image was not changed. You can try again or choose another source.'));
    } catch (_) {
      if (mountedRef.current && generationRef.current === token) setError(text('glossary.images.generate_failed', 'The image could not be generated. Please try again.'));
    } finally {
      if (generationRef.current === token) {
        generationRef.current = null;
        if (mountedRef.current) setBusy(false);
      }
    }
  }
  function undoReplacement() {
    if (!canUndo || working || !beginTask) return;
    const task = beginTask(index);
    if (!task) return;
    const saved = task.commit(() => undo.before);
    task.finish();
    if (saved) {
      setUndo(null);
      setError('');
      setStatus(text('glossary.images.previous_restored', 'Previous image restored.'));
      setDescription(glossaryCurrentDescription(undo.before));
    } else setError(text('glossary.images.term_changed_reopen', 'The term changed. Reopen the image picker to try again.'));
  }
  function saveDescription() {
    if (!item.image || working || !beginTask) return;
    const task = beginTask(index);
    if (!task) return;
    const saved = task.commit(() => ({
      imageAlt: description.trim(),
      imageAltHash: glossaryImageDescriptionHash(item.image),
      imageAltSource: 'author',
      imageDecorative: false
    }));
    task.finish();
    if (saved) {
      setError('');
      setStatus(text('glossary.images.description_saved', 'Image description saved.'));
    } else setError(text('glossary.images.image_changed_reopen', 'The image changed. Reopen the image picker before describing it.'));
  }
  function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!GLOSSARY_IMAGE_TYPES.test(file.type)) {
      setError(text('glossary.images.type_invalid', 'Choose a PNG, JPEG, GIF, WebP, or AVIF image.'));
      return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      setError(text('glossary.images.too_large', 'Choose an image smaller than 10 MB.'));
      return;
    }
    replace(signal => readGlossaryImageFile(file, signal), null);
  }
  if (!canEdit) return null;
  const buttonClass = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const feedback = /*#__PURE__*/React.createElement(React.Fragment, null, working && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-sm text-slate-700"
  }, text('glossary.images.loading', 'Loading image...')), status && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-sm text-slate-700"
  }, status), error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "text-sm text-red-700"
  }, error));
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-2 print:hidden",
    "data-glossary-image-controls": "true"
  }, /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    type: "file",
    accept: "image/png,image/jpeg,image/gif,image/webp,image/avif",
    className: "hidden",
    "aria-label": text('glossary.images.upload_aria', 'Upload image for {term}').replace('{term}', item.term),
    onChange: upload
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    ref: openerRef,
    type: "button",
    className: buttonClass,
    disabled: !beginTask,
    "aria-haspopup": "dialog",
    "aria-label": text('glossary.images.change_aria', 'Change image for {term}').replace('{term}', item.term),
    onClick: openDialog
  }, text('glossary.images.change', 'Change image')), canUndo && !open && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working,
    onClick: undoReplacement
  }, text('common.undo', 'Undo'))), !open && feedback, !open && item.image && descriptionDirty && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, text('glossary.images.unsaved_description', 'Unsaved image description draft')), open && /*#__PURE__*/React.createElement("dialog", {
    ref: dialogRef,
    tabIndex: -1,
    "aria-modal": "true",
    "aria-labelledby": dialogTitleId,
    onCancel: event => {
      event.preventDefault();
      closeDialog();
    },
    onKeyDown: event => {
      containGlossaryImageDialogFocus(event);
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDialog();
      }
    },
    className: "fixed inset-0 m-auto max-w-none rounded-xl border border-slate-300 bg-white p-4 text-left text-slate-800 shadow-2xl backdrop:bg-slate-900/60",
    style: {
      width: 'min(40rem, calc(100vw - 2rem))',
      maxHeight: 'calc(100dvh - 2rem)',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-3"
  }, /*#__PURE__*/React.createElement("h2", {
    id: dialogTitleId,
    className: "min-w-0 break-words text-lg font-bold"
  }, text('glossary.images.change', 'Change image'), ": ", item.term), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass + ' shrink-0',
    onClick: () => closeDialog()
  }, text('common.close', 'Close'))), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 break-words text-sm text-slate-600"
  }, item.def), /*#__PURE__*/React.createElement("div", {
    className: "my-4 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working || !beginTask,
    "aria-describedby": uploadHelpId,
    onClick: () => inputRef.current?.click()
  }, text('glossary.images.upload', 'Upload image')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working || !beginTask,
    "aria-pressed": mode === 'mulberry',
    onClick: openMulberry
  }, text('glossary.images.mulberry', 'Find Mulberry symbol')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working || !beginTask,
    "aria-pressed": mode === 'photos',
    onClick: () => {
      stopSearch();
      setError('');
      setStatus('');
      setMode('photos');
    }
  }, text('glossary.images.photo', 'Find photo')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working || !onGenerate,
    onClick: generate
  }, text('glossary.images.generate', 'Generate image'))), /*#__PURE__*/React.createElement("p", {
    id: uploadHelpId,
    className: "mb-4 text-xs text-slate-600"
  }, text('glossary.images.upload_help', 'Upload PNG, JPEG, GIF, WebP, or AVIF images, up to 10 MB.')), mode === 'mulberry' ? /*#__PURE__*/React.createElement("section", {
    "aria-label": text('glossary.images.mulberry_section_aria', 'Mulberry symbols for {term}').replace('{term}', item.term)
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: event => {
      event.preventDefault();
      search();
    },
    className: "flex flex-wrap items-end gap-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "min-w-0 flex-1 text-sm font-semibold"
  }, text('glossary.images.search_label', 'Search Mulberry symbols'), /*#__PURE__*/React.createElement("input", {
    ref: searchInputRef,
    type: "search",
    value: query,
    onChange: event => {
      stopSearch();
      setQuery(event.target.value);
      setResults([]);
      setStatus('');
      setError('');
    },
    className: "mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 text-sm text-slate-800"
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: buttonClass,
    disabled: searching || working || !query.trim()
  }, text('common.search', 'Search'))), searching && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "mt-2 text-sm text-slate-700"
  }, text('glossary.images.searching', 'Searching Mulberry...')), /*#__PURE__*/React.createElement("div", {
    className: "my-3 grid grid-cols-2 sm:grid-cols-3 gap-2",
    "aria-busy": searching || working
  }, results.map(result => /*#__PURE__*/React.createElement(GlossaryMulberryResult, {
    key: result.url,
    result: result,
    term: item.term,
    working: working,
    buttonClass: buttonClass,
    text: text,
    onChoose: previewUrl => replace(signal => prepareGlossaryMulberry({
      ...result,
      url: previewUrl
    }, signal), {
      set: 'Mulberry Symbols',
      author: 'Steve Lee',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      via: 'Global Symbols',
      url: result.url,
      label: result.label
    })
  }))), /*#__PURE__*/React.createElement("p", {
    className: "my-3 text-xs text-slate-700"
  }, /*#__PURE__*/React.createElement("a", {
    className: "underline",
    href: "https://globalsymbols.com/symbolsets/mulberry",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "Mulberry Symbols by Steve Lee"), " · ", /*#__PURE__*/React.createElement("a", {
    className: "underline",
    href: "https://creativecommons.org/licenses/by-sa/4.0/",
    target: "_blank",
    rel: "noopener noreferrer"
  }, "CC BY-SA 4.0"), ". ", text('glossary.images.credit_included', 'Credit is included in saved images.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    onClick: () => {
      stopSearch();
      setMode('choices');
      setStatus('');
      setError('');
    }
  }, text('glossary.images.back', 'Back to current image'))) : mode === 'photos' ? /*#__PURE__*/React.createElement("section", {
    "aria-label": text('glossary.images.photos_section_aria', 'Photos for {term}').replace('{term}', item.term)
  }, window.AlloModules && window.AlloModules.ClassroomImagePicker ? React.createElement(window.AlloModules.ClassroomImagePicker, {
    idPrefix: 'glossary-photo-' + index,
    initialQuery: item.term,
    sources: ['photos'],
    t,
    onChoose: choice => replace(signal => prepareGlossaryPhoto(choice, signal), choice.attribution, image => ({
      imageSource: 'wikimedia',
      imageAlt: choice.alt || '',
      imageAltSource: choice.alt ? 'vision' : '',
      imageAltHash: choice.alt ? glossaryImageDescriptionHash(image) : ''
    }))
  }) : /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-sm text-slate-700"
  }, text('glossary.images.photos_loading', 'Photo search is still loading. Try again in a moment.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass + ' mt-3',
    onClick: () => {
      setMode('choices');
      setStatus('');
      setError('');
    }
  }, text('glossary.images.back', 'Back to current image'))) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, item.image ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
    src: item.image,
    alt: glossaryCurrentDescription(item),
    className: "mx-auto max-h-48 max-w-full rounded border border-slate-300 bg-white object-contain"
  }), /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold"
  }, text('glossary.images.description', 'Image description (alt text, optional)'), /*#__PURE__*/React.createElement("textarea", {
    ref: descriptionRef,
    value: description,
    onChange: event => setDescription(event.target.value),
    disabled: working,
    "aria-describedby": descriptionHelpId,
    rows: 3,
    maxLength: 2000,
    className: "mt-1 w-full rounded border border-slate-400 bg-white p-2 text-sm text-slate-800"
  })), /*#__PURE__*/React.createElement("p", {
    id: descriptionHelpId,
    className: "text-xs text-slate-600"
  }, text('glossary.images.description_help', 'This is the image’s alt text for screen readers. Describe the visual details that help explain the term.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working || !descriptionDirty,
    onClick: saveDescription
  }, text('glossary.images.save_description', 'Save description')), descriptionDirty && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, text('glossary.images.draft_help', 'Your draft is kept when you close this picker. Choose Save description to apply it.'))) : /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600"
  }, text('glossary.images.no_image', 'Choose an image source above to add a picture.'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 space-y-2"
  }, feedback, canUndo && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: buttonClass,
    disabled: working,
    onClick: undoReplacement
  }, text('common.undo', 'Undo')))));
}

// A model field the prompt declares as text is not guaranteed to BE text, and React throws
// "Objects are not valid as a React child" on anything else — which costs the whole panel, not
// the one value (2026-09-13: one such entry blanked an entire Curriculum Audit). The phonics
// prompt asks for syllables as ["syl","la","ble"]; if a model answers [{"syllable":"syl"}...]
// instead, the word popup a student just opened would vanish behind an error card. Render text,
// flatten a single-text object, and show nothing for anything else. Pure.
function glossaryAiText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const keys = ['syllable', 'text', 'value', 'label', 'part'];
  for (let i = 0; i < keys.length; i++) {
    if (typeof value[keys[i]] === 'string' && value[keys[i]].trim()) return value[keys[i]];
  }
  return '';
}

// Use the canonical speech/export adapter when loaded, with a string-safe
// fallback so the live view can open before the audio service finishes loading.
function glossaryTranslationText(value) {
  var normalize = window.AlloModules?.normalizeGlossaryTranslation;
  if (typeof normalize === 'function') return normalize(value).spoken;
  var text = input => typeof input === 'string' ? input.trim() : '';
  if (!value || typeof value !== 'object' || Array.isArray(value)) return text(value);
  return text(value.text) || text(value.translation) || [text(value.term) || text(value.word), text(value.def) || text(value.definition) || text(value.meaning)].filter(Boolean).join(': ');
}

// A saved glossary's base is independent of the current generation language.
// Legacy translation copies can say config.language=Spanish while their terms
// and definitions are still English, so that field is never a base fallback.
function glossaryFieldLanguage(resource, item, field = 'term') {
  const explicit = field === 'definition' ? item?.definitionLanguage : item?.termLanguage || item?.wordLanguage;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  const rowBase = item?.baseLanguage || item?.termLanguage;
  if (typeof rowBase === 'string' && rowBase.trim()) return rowBase.trim();
  const resolve = window.AlloModules?.TextPipelineHelpers?.getGlossaryBaseLanguage;
  if (typeof resolve === 'function') return resolve(resource);
  const translated = resource?.translationOf || resource?.translationSourceId || resource?.sourceTranslationOf || resource?.config?.translationOf || resource?.config?.translationSourceId || resource?.config?.sourceTranslationOf || resource?.meta?.translatedTo;
  return [resource?.baseLanguage, resource?.glossaryBaseLanguage, resource?.config?.baseLanguage, resource?.config?.glossaryBaseLanguage].find(value => typeof value === 'string' && value.trim())?.trim() || (!resource?.config?.language && !translated && typeof resource?.language === 'string' ? resource.language.trim() : '') || 'English';
}
function glossaryHasBaseMetadata(resource, item) {
  return [item?.termLanguage, item?.definitionLanguage, item?.baseLanguage, resource?.baseLanguage, resource?.glossaryBaseLanguage, resource?.config?.baseLanguage, resource?.config?.glossaryBaseLanguage].some(value => typeof value === 'string' && value.trim());
}
function glossaryEnglishBase(resource, item) {
  return /^(?:en(?:[-_]|$)|english(?:\s*\(|$))/i.test(glossaryFieldLanguage(resource, item));
}

// Keep caught launch failures inspectable without attaching the lesson or audio.
// This also works when a newer glossary view is served to an older app shell.
function glossaryWordPracticeDiagnostic(error, wordCount, startedAt) {
  function diagnosticText(value, limit) {
    return (typeof value === 'string' ? value : '').replace(/data:[^\s"'<>]+/gi, '[embedded data]').replace(/(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>)]*/gi, '$1').slice(0, limit);
  }
  var entry = window.__alloModuleRegistry?.WordPractice || {};
  var presenter = window.AlloModules?.WordPractice;
  var launcherAvailable = typeof window.__alloOpenWordPractice === 'function';
  var code = diagnosticText(error?.code, 100);
  return {
    feature: 'glossary-present-export',
    timestamp: new Date().toISOString(),
    phase: !launcherAvailable ? 'launcher' : /^allo-lazy-module-/.test(code) ? 'load-module' : 'open-presenter',
    error: {
      name: diagnosticText(error?.name, 100) || 'Error',
      code: code || 'word-practice-open-failed',
      message: diagnosticText(typeof error === 'string' ? error : error?.message, 800) || 'Unknown presentation error',
      stack: diagnosticText(error?.stack, 2400)
    },
    launcherAvailable: launcherAvailable,
    loaderAvailable: typeof window.__alloLazyWordPractice === 'function',
    ensureAvailable: typeof window.__alloEnsureLazyModule === 'function',
    build: {
      hash: diagnosticText(window.__alloBuildStamp?.hash, 100),
      surface: diagnosticText(window.__alloBuildStamp?.surface, 40)
    },
    online: typeof navigator !== 'undefined' ? navigator.onLine !== false : null,
    wordCount: wordCount,
    elapsedMs: Math.max(0, Date.now() - startedAt),
    module: {
      status: diagnosticText(entry.status, 40) || 'not-requested',
      registered: !!presenter,
      openAvailable: typeof presenter?.open === 'function',
      url: diagnosticText(entry.script?.src || entry.originalUrl, 500),
      fallbackUrl: diagnosticText(entry.fallbackScript?.src, 500)
    }
  };
}

// Image descriptions are tied to the displayed bytes, so replacing an image cannot
// accidentally retain the previous picture's description. Matches AltText.hashImage.
function getGlossaryImageAlt(item) {
  if (!item || item.imageDecorative === true || typeof item.imageAlt !== 'string') return '';
  if (item.imageAltHash) {
    const image = typeof item.image === 'string' ? item.image : '';
    let h = 0x811c9dc5;
    const mix = c => {
      h ^= c;
      h = Math.imul(h, 0x01000193) >>> 0;
    };
    String(image.length).split('').forEach(ch => mix(ch.charCodeAt(0)));
    const step = Math.max(1, Math.floor(image.length / 4096));
    for (let i = 0; i < image.length; i += step) mix(image.charCodeAt(i));
    const hash = 'img-' + image.length.toString(36) + '-' + h.toString(16).padStart(8, '0');
    if (hash !== item.imageAltHash) return '';
  }
  return item.imageAlt.trim();
}

// Lazy Lucide icon resolution from window.AlloIcons (populated by
// host at AlloFlowANTI.txt:4930). Avoids threading dozens of icon
// components as props. Mirrors view_timeline_module.js pattern.
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};

// These helpers sit outside the component and get only `t`: a key it does not
// know (or echoes back) falls back to the English written here.
function dictText(t, key, fallback) {
  var value = typeof t === 'function' ? t(key) : '';
  return value && value !== key ? value : fallback;
}

// Authoritative pronunciation row for the phonics popup: real Wiktionary recording
// + authoritative IPA, shown quietly beside the AI phonics. Pure fn; null when absent.
function renderPhonicsDictRow(phonicsData, t, playDictionaryAudio) {
  var d = phonicsData && phonicsData.dictionary;
  if (!d || !d.phonetic && !d.audio) return null;
  var row = [React.createElement('span', {
    key: 'lbl',
    className: 'text-[10px] font-bold text-emerald-700 uppercase tracking-wide'
  }, t('glossary.popups.dictionary') || 'Dictionary')];
  if (d.phonetic) row.push(React.createElement('span', {
    key: 'ipa',
    className: 'font-mono text-xs text-slate-600'
  }, d.phonetic));
  if (d.audio) row.push(React.createElement('button', {
    key: 'aud',
    type: 'button',
    onClick: function () {
      playDictionaryAudio(d.audio);
    },
    className: 'inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 transition-colors',
    'aria-label': t('glossary.popups.hear_real') || 'Hear a real recording',
    title: t('glossary.popups.hear_real') || 'Hear a real recording'
  }, React.createElement(Volume2, {
    size: 11
  }), React.createElement('span', null, t('glossary.popups.real_audio') || 'Recording')));
  return React.createElement('div', {
    className: 'flex items-center gap-2 flex-wrap px-1'
  }, row);
}

// Flashcard-back dictionary enrichment (example + part-of-speech + synonyms + real
// recording), sense-aligned to the card's lesson definition and read straight from the
// pre-warmed offline cache — collapsible so it never overloads the card. Returns null
// when unavailable (non-English / not cached / no aligned sense) so cards render as
// before. Only added to the English standard deck, not the language deck.
function renderFlashcardDictBack(item, t, flashcardDictAudioKey, playDictionaryAudio, resource) {
  if (!item || !item.term || !glossaryEnglishBase(resource, item)) return null;
  var AD = window.AlloDictionary;
  if (!AD || typeof AD.getCached !== 'function') return null;
  var entry = AD.getCached(item.term);
  if (!entry) return null;
  var sense = typeof AD.pickSense === 'function' ? AD.pickSense(entry, item.def || '') : null;
  var verifiedDef = sense ? sense.definition : '';
  if (!verifiedDef && Array.isArray(entry.meanings)) {
    entry.meanings.some(function (m) {
      if (m && Array.isArray(m.definitions) && m.definitions[0] && m.definitions[0].definition) {
        verifiedDef = m.definitions[0].definition;
        return true;
      }
      return false;
    });
  }
  var pos = sense ? sense.partOfSpeech : '';
  var example = sense ? sense.example : '';
  var syns = Array.isArray(entry.synonyms) ? entry.synonyms.slice(0, 4) : [];
  var audio = entry.audio;
  var sourceWord = entry.word || item.term;
  var sourceUrl = entry.sourceUrl || (sourceWord ? 'https://en.wiktionary.org/wiki/' + encodeURIComponent(sourceWord) : '');
  var sourceLabel = entry.source || 'Wiktionary';
  if (!verifiedDef && !pos && !example && !syns.length && !audio && !sourceUrl) return null;
  var stopCardControlEvent = function (e) {
    e.stopPropagation();
  };
  var audioKey = 'dict-' + String(sourceWord || item.term || '').toLowerCase();
  var isAudioPlaying = flashcardDictAudioKey === audioKey;
  var body = [];
  if (verifiedDef) body.push(React.createElement('p', {
    key: 'def',
    className: 'text-sm text-white leading-relaxed'
  }, pos ? React.createElement('span', {
    className: 'font-semibold text-white mr-1'
  }, pos) : null, verifiedDef));
  if (example) body.push(React.createElement('p', {
    key: 'ex',
    className: 'text-xs text-blue-50 leading-relaxed italic'
  }, '"' + example + '"'));
  if (syns.length) body.push(React.createElement('p', {
    key: 'sy',
    className: 'text-xs text-blue-50 mt-1'
  }, (t('glossary.popups.similar') || 'Similar') + ': ' + syns.join(', ')));
  if (audio) body.push(React.createElement('button', {
    key: 'au',
    type: 'button',
    onClick: function (e) {
      e.stopPropagation();
      playDictionaryAudio(audio, audioKey);
    },
    onMouseDown: stopCardControlEvent,
    onKeyDown: stopCardControlEvent,
    className: 'mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-white border border-blue-200 rounded-full px-2.5 py-1 transition-all motion-reduce:transition-none  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600' + (isAudioPlaying ? ' ring-2 ring-white bg-white shadow-lg shadow-blue-950/20' : ''),
    'aria-label': t('glossary.popups.hear_real') || 'Hear a real recording'
  }, React.createElement(Volume2, {
    size: 12,
    className: isAudioPlaying ? 'animate-pulse motion-reduce:animate-none' : '',
    'aria-hidden': 'true'
  }), React.createElement('span', null, isAudioPlaying ? t('glossary.popups.playing') || 'Playing...' : t('glossary.popups.real_audio') || 'Recording')));
  body.push(React.createElement('details', {
    key: 'src',
    className: 'pt-2 mt-2 border-t border-blue-300/40 text-[0.6875rem] leading-snug text-blue-50',
    onClick: stopCardControlEvent,
    onMouseDown: stopCardControlEvent,
    onKeyDown: stopCardControlEvent
  }, React.createElement('summary', {
    className: 'cursor-pointer font-bold text-blue-50 select-none'
  }, t('common.resource')), React.createElement('p', {
    className: 'mt-1'
  }, dictText(t, 'glossary.verified_dictionary_note', 'Verified dictionary data from {source}, sense-matched against the lesson definition when possible and cached for offline reuse.').split('{source}').join(sourceLabel)), sourceUrl ? React.createElement('a', {
    href: sourceUrl,
    target: '_blank',
    rel: 'noopener noreferrer',
    onClick: function (e) {
      e.stopPropagation();
    },
    onMouseDown: stopCardControlEvent,
    onKeyDown: stopCardControlEvent,
    className: 'inline-flex mt-1 font-bold text-white underline decoration-blue-200 underline-offset-2 hover:text-blue-50',
    'aria-label': t('common.more_information') + ': ' + sourceWord
  }, t('common.more_information')) : null));
  return React.createElement('details', {
    open: true,
    className: 'mt-3 rounded-xl bg-white/10 border border-blue-300/40 px-4 py-3 w-full text-left shadow-inner ring-1 ring-white/10',
    onClick: stopCardControlEvent,
    onMouseDown: stopCardControlEvent,
    onKeyDown: stopCardControlEvent
  }, React.createElement('summary', {
    className: 'text-xs font-bold text-white uppercase cursor-pointer select-none tracking-wide'
  }, dictText(t, 'glossary.verified_dictionary', 'Verified dictionary')), React.createElement('div', {
    className: 'mt-2 space-y-1.5'
  }, body));
}
var ArrowDown = _lazyIcon('ArrowDown');
var Award = _lazyIcon('Award');
var Ban = _lazyIcon('Ban');
var Brain = _lazyIcon('Brain');
var CheckCircle = _lazyIcon('CheckCircle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var AlertCircle = _lazyIcon('AlertCircle');
var ChevronDown = _lazyIcon('ChevronDown');
var Download = _lazyIcon('Download');
var Eye = _lazyIcon('Eye');
var GalleryHorizontal = _lazyIcon('GalleryHorizontal');
var Gamepad2 = _lazyIcon('Gamepad2');
var GitMerge = _lazyIcon('GitMerge');
var Globe = _lazyIcon('Globe');
var ImageIcon = _lazyIcon('ImageIcon');
var Languages = _lazyIcon('Languages');
var MonitorPlay = _lazyIcon('MonitorPlay');
var MousePointerClick = _lazyIcon('MousePointerClick');
var Pencil = _lazyIcon('Pencil');
var Settings = _lazyIcon('Settings');
var Plus = _lazyIcon('Plus');
var Printer = _lazyIcon('Printer');
var RefreshCw = _lazyIcon('RefreshCw');
var Search = _lazyIcon('Search');
var Send = _lazyIcon('Send');
var Shuffle = _lazyIcon('Shuffle');
var Sparkles = _lazyIcon('Sparkles');
var StopCircle = _lazyIcon('StopCircle');
var Trash2 = _lazyIcon('Trash2');
var Volume2 = _lazyIcon('Volume2');
var X = _lazyIcon('X');
var XCircle = _lazyIcon('XCircle');
// ── Theme-safe hover surface for the term rows ───────────────────────────
// Measured (Chromium, .theme-dark, real computed styles): the term row
// carried `hover:bg-slate-50 focus-within:bg-slate-50` and NO base bg
// utility. The generated dark layer only emits selectors for base
// utilities, so the hover kept its light value (#f8fafc) while the row text
// was remapped to #f1f5f9. That is **1.05:1** on hover and 1.42:1 for the
// definition cell: exactly the 'row turns white and the text disappears'
// Aaron reported.
//
// Rows that DO carry a base bg utility were never affected, because the
// remap sets it !important and that beats the non-important hover rule.
// Only elements with no surface of their own are exposed.
//
// Done in CSS rather than by branching on the theme in JS: a hook reads the
// theme one frame late on first paint and re-renders the whole table on a
// theme change for something purely presentational. A stylesheet is right
// before the first paint and cannot drift from the theme class.
var GLOSSARY_HOVER_STYLE_ID = 'allo-glossary-hover-styles';
var GLOSSARY_HOVER_CSS = ['.allo-vghov-row:hover,.allo-vghov-row:focus-within{background-color:#f1f5f9 !important;}', '.theme-dark .allo-vghov-row:hover,.theme-dark .allo-vghov-row:focus-within{background-color:#334155 !important;}', '.theme-contrast .allo-vghov-row:hover,.theme-contrast .allo-vghov-row:focus-within{background-color:#000000 !important;outline:2px solid #ffff00;outline-offset:-2px;}', '[data-glossary-mobile-label]{display:none;}',
// Keep one set of editing/audio controls. Screen-only rules preserve the
// printable table; explicit table roles preserve its accessible structure.
'@media screen and (max-width:639px){', '[data-glossary-word-list] table,[data-glossary-word-list] thead,[data-glossary-word-list] tbody,[data-glossary-word-list] tr{display:block;width:100%;min-width:0;}', '[data-glossary-word-list] thead th:not([data-glossary-selection]){position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}', '[data-glossary-word-list] thead th[data-glossary-selection]{display:block;width:100%;padding:12px;}', '[data-glossary-word-list] thead th[data-glossary-selection]>div{flex-direction:row;justify-content:center;gap:8px;}', '[data-glossary-word-list] tbody>tr{border-bottom:6px solid #e2e8f0;}', '[data-glossary-word-list] tbody>tr:last-child{border-bottom:0;}', '[data-glossary-word-list] td{display:block;width:100%;min-width:0;max-width:100%;padding:12px;border:0;overflow-wrap:anywhere;}', '[data-glossary-word-list] td+td:not([data-glossary-term]){border-top:1px solid #e2e8f0;}', '[data-glossary-word-list] td div{min-width:0;max-width:100%;}', '[data-glossary-word-list] td img{max-width:100%;height:auto !important;}', '[data-glossary-word-list] td textarea,[data-glossary-word-list] td select{min-width:0;max-width:100%;}', '[data-glossary-word-list] [data-glossary-mobile-label]{display:block;margin-bottom:8px;font-size:12px;font-weight:700;font-style:normal;}', '[data-glossary-word-list] [data-glossary-selection] [data-glossary-mobile-label]{display:inline;margin-inline-start:8px;}', '}'].join('\n');
function ensureGlossaryHoverStyles() {
  try {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById(GLOSSARY_HOVER_STYLE_ID)) return;
    var el = document.createElement('style');
    el.id = GLOSSARY_HOVER_STYLE_ID;
    el.textContent = GLOSSARY_HOVER_CSS;
    document.head.appendChild(el);
  } catch (_e) {/* no document */}
}
ensureGlossaryHoverStyles();

// A translation remembers the English it came from (item.translationSource[lang]);
// a different fingerprint now means the term or definition changed since. The
// host records it with this same function (GlossaryView.translationFingerprint, below).
function glossaryTranslationFingerprint(item) {
  var text = String(item && item.term || '').trim() + '\n' + String(item && item.def || '').trim();
  var h = 0x811c9dc5;
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'fp-' + text.length.toString(36) + '-' + h.toString(36);
}

// One Tab stop per word row: its buttons share a roving tabindex, and the
// arrow keys, Home and End move between the ones showing. Text fields and
// the image picker dialog keep their own Tab order.
function glossaryRowControls(row) {
  return Array.prototype.filter.call(row.querySelectorAll('button, summary'), function (el) {
    return !el.closest('dialog, [role="dialog"]');
  });
}
function glossaryRowItemShown(el, row) {
  if (el.disabled || el.closest('[hidden]')) return false;
  for (var node = el; node && node !== row; node = node.parentElement) {
    if (node.style && node.style.display === 'none') return false;
    if (node.tagName === 'DETAILS' && !node.open && !(el.tagName === 'SUMMARY' && el.parentElement === node)) return false;
  }
  return true;
}
function syncGlossaryRowTabStop(row, memory) {
  var controls = glossaryRowControls(row);
  var items = controls.filter(function (el) {
    return glossaryRowItemShown(el, row);
  });
  var active = memory.get(row.getAttribute('data-glossary-entry-key'));
  if (items.indexOf(active) < 0) active = items[0] || null;
  controls.forEach(function (el) {
    var value = el === active ? '0' : '-1';
    if (el.getAttribute('tabindex') !== value) el.setAttribute('tabindex', value);
  });
  return items;
}
// "Aa" reading settings (font, size, spacing) for full-screen glossary activities.
// Rendered only once the host publishes them; the panel opens inside the opener's dialog.
function GlossaryReadingSettingsButton(props) {
  var handleRef = React.useRef(null);
  React.useEffect(function () {
    return function () {
      if (handleRef.current) handleRef.current.close(false);
    };
  }, []);
  var lib = window.AlloModules && window.AlloModules.UIFontLibrary;
  if (!lib || typeof lib.readingSettingsAvailable !== 'function' || !lib.readingSettingsAvailable()) return null;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-haspopup": "dialog",
    "aria-label": props.label,
    title: props.label,
    "data-reading-settings-button": "true",
    onClick: function (e) {
      handleRef.current = lib.openReadingSettings({
        opener: e.currentTarget,
        t: props.t
      });
    },
    className: 'min-h-11 min-w-11 inline-flex items-center justify-center rounded-full font-bold leading-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ' + (props.className || '')
  }, "Aa");
}
function GlossaryView(props) {
  // Pure data + state reads
  var t = props.t;
  var generatedContent = props.generatedContent;
  var glossaryBaseLanguage = glossaryFieldLanguage(generatedContent);
  var history = props.history;
  var selectedLanguages = props.selectedLanguages;
  var displayLanguages = props.displayLanguages;
  // Language tools follow this glossary's own translation columns, not the teacher's current chips.
  var glossaryLanguages = [];
  (Array.isArray(generatedContent?.data) ? generatedContent.data : []).forEach(function (item) {
    var translations = item && item.translations;
    if (!translations || typeof translations !== 'object' || Array.isArray(translations)) return;
    Object.keys(translations).forEach(function (lang) {
      if (lang && glossaryTranslationText(translations[lang]) && glossaryLanguages.indexOf(lang) < 0) glossaryLanguages.push(lang);
    });
  });
  var leveledTextLanguage = props.leveledTextLanguage;
  var currentUiLanguage = props.currentUiLanguage;
  var activeView = props.activeView;
  var isTeacherMode = props.isTeacherMode;
  var gradeLevel = props.gradeLevel;
  var inputText = props.inputText;
  var includeEtymology = props.includeEtymology;
  // Phonics popup wiring — reuses the simplified-view handler so each glossary
  // term can show pronunciation/IPA/syllables on click. The popup state lives
  // at the host level (AlloFlowANTI) so triggering it from glossary surfaces
  // the same overlay used elsewhere in the app.
  var handlePhonicsClick = props.handlePhonicsClick;
  var phonicsData = props.phonicsData;
  var closePhonics = props.closePhonics;
  var voiceSpeed = props.voiceSpeed;
  // Derived state from host
  var filteredGlossaryData = props.filteredGlossaryData;
  // Edit / add / lookup state
  var isEditingGlossary = !!props.isEditingGlossary && !!isTeacherMode;
  var canEditGlossary = isEditingGlossary;
  var isAddingTerm = props.isAddingTerm;
  var newGlossaryTerm = props.newGlossaryTerm;
  var glossarySearchTerm = props.glossarySearchTerm;
  var glossaryFilter = props.glossaryFilter;
  var glossaryImageSize = props.glossaryImageSize || 192;
  var glossaryRefinementInputs = props.glossaryRefinementInputs;
  // Flashcard state
  var flashcardIndex = Math.max(0, Math.min(Number(props.flashcardIndex) || 0, Math.max(0, (generatedContent?.data?.length || 0) - 1)));
  var flashcardMode = props.flashcardMode;
  var flashcardLang = props.flashcardLang;
  var standardDeckLang = props.standardDeckLang;
  var isFlashcardQuizMode = props.isFlashcardQuizMode;
  var isFlashcardFlipped = props.isFlashcardFlipped;
  var showFlashcardImages = props.showFlashcardImages;
  var flashcardScore = props.flashcardScore;
  var flashcardOptions = props.flashcardOptions;
  var flashcardFeedback = props.flashcardFeedback;
  var quizSelectedOption = props.quizSelectedOption;
  var setQuizSelectedOption = props.setQuizSelectedOption || function () {};
  // Host-owned single source of truth for the flashcard answer. The green
  // highlight below must not re-derive it: the old local `opt === item.def`
  // ignored deck mode, so in the Language Deck no option ever highlighted and
  // the student's correct pick was painted red while the chime said correct.
  var flashcardCorrectAnswer = props.flashcardCorrectAnswer || window.flashcardCorrectAnswer;
  var isInteractiveFlashcards = props.isInteractiveFlashcards;
  // Per-term generation state (objects keyed by index)
  var isGeneratingTermImage = props.isGeneratingTermImage;
  var isGeneratingAudio = props.isGeneratingAudio;
  var isGeneratingEtymology = props.isGeneratingEtymology;
  // Audio + playback
  var isPlaying = props.isPlaying;
  var playingContentId = props.playingContentId;
  var downloadingContentId = props.downloadingContentId;
  var selectedVoice = props.selectedVoice;
  // Health-check + screener
  var glossaryHealthCheck = props.glossaryHealthCheck;
  var isRunningHealthCheck = props.isRunningHealthCheck;
  var showHealthCheckPanel = props.showHealthCheckPanel;
  // Game state
  var gameMode = props.gameMode;
  var gameData = props.gameData;
  var isMemoryGame = props.isMemoryGame;
  var isCrosswordGame = props.isCrosswordGame;
  var isMatchingGame = props.isMatchingGame;
  var isBingoGame = props.isBingoGame;
  var isStudentBingoGame = props.isStudentBingoGame;
  var isWordScrambleGame = props.isWordScrambleGame;
  var bingoSettings = props.bingoSettings;
  var bingoState = props.bingoState;
  // Word search
  var wordSearchLang = [glossaryBaseLanguage, ...glossaryLanguages].includes(props.wordSearchLang) ? props.wordSearchLang : glossaryBaseLanguage;
  var showWordSearchAnswers = props.showWordSearchAnswers;
  var selectedLetters = props.selectedLetters;
  var foundWords = props.foundWords;
  // Setters
  var setGlossarySearchTerm = props.setGlossarySearchTerm;
  var setIsEditingGlossary = props.setIsEditingGlossary;
  var setIsAddingTerm = props.setIsAddingTerm;
  var setFlashcardIndex = props.setFlashcardIndex;
  var setFlashcardMode = props.setFlashcardMode;
  var setFlashcardLang = props.setFlashcardLang;
  var setStandardDeckLang = props.setStandardDeckLang;
  var setIsFlashcardQuizMode = props.setIsFlashcardQuizMode;
  var setIsFlashcardFlipped = props.setIsFlashcardFlipped;
  var setShowFlashcardImages = props.setShowFlashcardImages;
  var setFlashcardScore = props.setFlashcardScore;
  var setFlashcardOptions = props.setFlashcardOptions;
  var setFlashcardFeedback = props.setFlashcardFeedback;
  var setIsMatchingGame = props.setIsMatchingGame;
  var setIsMemoryGame = props.setIsMemoryGame;
  var setIsCrosswordGame = props.setIsCrosswordGame;
  var setIsSyntaxGame = props.setIsSyntaxGame;
  var setIsStudentBingoGame = props.setIsStudentBingoGame;
  var setIsInteractiveFlashcards = props.setIsInteractiveFlashcards;
  var setGlossaryHealthCheck = props.setGlossaryHealthCheck;
  var setIsGeneratingAudio = props.setIsGeneratingAudio;
  var setPlayingContentId = props.setPlayingContentId;
  var setGlossaryImageSize = props.setGlossaryImageSize;
  var setBingoSettings = props.setBingoSettings;
  var setBingoState = props.setBingoState;
  var setWordSearchLang = props.setWordSearchLang;
  var setGlossaryImageStyle = props.setGlossaryImageStyle;
  var setNewGlossaryTerm = props.setNewGlossaryTerm;
  var setShowHealthCheckPanel = props.setShowHealthCheckPanel;
  var setGlossaryRefinementInputs = props.setGlossaryRefinementInputs;
  // Handlers
  var handleAddGlossaryTerm = props.handleAddGlossaryTerm;
  var handleQuickAddGlossary = props.handleQuickAddGlossary;
  var handleDeleteTerm = props.handleDeleteTerm;
  var handleGenerateTermImage = props.handleGenerateTermImage;
  var deleteGlossaryImageInHost = props.handleDeleteTermImage;
  var handleGenerateTermEtymology = props.handleGenerateTermEtymology;
  var handleRefineGlossaryImage = props.handleRefineGlossaryImage;
  var handleGlossaryChange = props.handleGlossaryChange;
  var handleSpeak = props.handleSpeak;
  var handleDownloadAudio = props.handleDownloadAudio;
  var handleCardAudioSequence = props.handleCardAudioSequence;
  var handleExportFlashcards = props.handleExportFlashcards;
  var handleQuizOptionClick = props.handleQuizOptionClick;
  var handleToggleIsFlashcardFlipped = props.handleToggleIsFlashcardFlipped;
  var handleToggleShowFlashcardImages = props.handleToggleShowFlashcardImages;
  var handleToggleIsEditingGlossary = props.handleToggleIsEditingGlossary;
  var handleSetGlossaryFilterToAll = props.handleSetGlossaryFilterToAll;
  var handleSetGlossaryFilterToAcademic = props.handleSetGlossaryFilterToAcademic;
  var handleSetGlossaryFilterToDomain = props.handleSetGlossaryFilterToDomain;
  var handleSetGlossarySearchTermConst = props.handleSetGlossarySearchTermConst;
  var handleSetIsMemoryGameToTrue = props.handleSetIsMemoryGameToTrue;
  var handleSetIsCrosswordGameToTrue = props.handleSetIsCrosswordGameToTrue;
  var handleSetIsMatchingGameToTrue = props.handleSetIsMatchingGameToTrue;
  var handleSetIsBingoGameToTrue = props.handleSetIsBingoGameToTrue;
  var handleSetIsStudentBingoGameToTrue = props.handleSetIsStudentBingoGameToTrue;
  var handleSetIsWordScrambleGameToTrue = props.handleSetIsWordScrambleGameToTrue;
  var handleCloseWordScramble = props.handleCloseWordScramble;
  var closeStudentBingo = props.closeStudentBingo;
  var handleToggleShowWordSearchAnswers = props.handleToggleShowWordSearchAnswers;
  var handlePrintGame = props.handlePrintGame;
  var handleSetGameModeToNull = props.handleSetGameModeToNull;
  var handleToggleShowHealthCheckPanel = props.handleToggleShowHealthCheckPanel;
  var handleGlossarySelectAll = props.handleGlossarySelectAll;
  var handleGlossarySelectionChange = props.handleGlossarySelectionChange;
  var deleteGlossaryTermInHost = props.handleDeleteGlossaryItem;
  var fetchReplacementSuggestion = props.fetchReplacementSuggestion;
  var toggleLetterSelection = props.toggleLetterSelection;
  // Screener helpers
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGameCompletion = props.handleGameCompletion;
  var handleScoreUpdate = props.handleScoreUpdate;
  var handleAiSafetyFlag = props.handleAiSafetyFlag;
  var handleGenerateBingo = props.handleGenerateBingo;
  var generateWordSearch = props.generateWordSearch;
  var prevFlashcard = props.prevFlashcard;
  var nextFlashcard = props.nextFlashcard;
  var stopPlayback = props.stopPlayback;
  var launchInteractiveFlashcards = props.launchInteractiveFlashcards;
  var closeInteractiveFlashcardsProp = props.closeInteractiveFlashcards;
  var closeMemory = props.closeMemory;
  var closeCrossword = props.closeCrossword;
  var closeMatching = props.closeMatching;
  var closeBingo = props.closeBingo;
  var runGlossaryHealthCheck = props.runGlossaryHealthCheck;
  function readGlossaryHealthConnection() {
    try {
      return typeof window.__alloResolveAiCapability === 'function' ? window.__alloResolveAiCapability().text === true : false;
    } catch (_) {
      return false;
    }
  }
  var glossaryHealthConnectionState = React.useState(readGlossaryHealthConnection);
  var glossaryHealthConnectionReady = glossaryHealthConnectionState[0];
  React.useEffect(function () {
    var refresh = function () {
      glossaryHealthConnectionState[1](readGlossaryHealthConnection());
    };
    refresh();
    window.addEventListener('alloflow:ai-config-changed', refresh);
    window.addEventListener('storage', refresh);
    return function () {
      window.removeEventListener('alloflow:ai-config-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  var runGlossaryScreener = props.runGlossaryScreener;
  // Pure helpers
  var addToast = props.addToast;
  var playSound = props.playSound;
  var callTTS = props.callTTS;
  var callImagen = props.callImagen;
  var callGeminiImageEdit = props.callGeminiImageEdit;
  var copyToClipboard = props.copyToClipboard;
  var safeDownloadBlob = props.safeDownloadBlob;
  var isRtlLang = props.isRtlLang;
  var cleanJson = props.cleanJson;
  var fisherYatesShuffle = props.fisherYatesShuffle;
  var getRows = props.getRows;
  // Auto-remove + visual prefs
  var autoRemoveWords = props.autoRemoveWords;
  var visualStyle = props.visualStyle;
  var glossaryImageStyle = props.glossaryImageStyle;
  var universalImageStyle = props.universalImageStyle;
  var glossaryStyleModeState = React.useState(function () {
    return String(glossaryImageStyle || '').trim() ? 'override' : 'inherit';
  });
  var glossaryStyleMode = glossaryStyleModeState[0];
  var setGlossaryStyleMode = glossaryStyleModeState[1];
  var handleGlossaryStyleModeChange = function (event) {
    var nextMode = event.target.value;
    setGlossaryStyleMode(nextMode);
    if (nextMode === 'inherit') setGlossaryImageStyle('');
    if (nextMode === 'override' && !String(glossaryImageStyle || '').trim()) {
      setGlossaryImageStyle('Simple flat vector art');
    }
  };
  // Refs
  var alloBotRef = props.alloBotRef;
  // Components from host scope
  var ErrorBoundary = props.ErrorBoundary;
  var SpeakButton = props.SpeakButton;
  var [activityScope, setActivityScope] = React.useState('all');
  var [activityBoardSize, setActivityBoardSize] = React.useState('standard');
  var [activitySessions, setActivitySessions] = React.useState({});
  var activityResourceKey = String(generatedContent?.type || '') + ':' + String(generatedContent?.id || '');
  var activityWords = (activityScope === 'filtered' ? filteredGlossaryData : generatedContent?.data) || [];
  activityWords = (Array.isArray(activityWords) ? activityWords : []).filter(item => item && typeof item.term === 'string' && item.term.trim());
  var activityMemoryCount = activityWords.filter(item => typeof item.def === 'string' && item.def.trim() || item.image).length;
  var activityMatchingCount = activityWords.filter(item => typeof item.def === 'string' && item.def.trim()).length;
  function activityText(key, fallback) {
    var value = t(key);
    return value && value !== key ? value : fallback;
  }
  var [wordPracticeStatus, setWordPracticeStatus] = React.useState({
    busy: false,
    notice: ''
  });
  var wordPracticeControllerRef = React.useRef(null);
  var wordPracticeDiagnosticRef = React.useRef(null);
  var wordPracticeCopyRef = React.useRef(null);
  var wordPracticeDetailsRef = React.useRef(null);
  var wordPracticeTextRef = React.useRef(null);
  React.useEffect(function () {
    setWordPracticeStatus({
      busy: false,
      notice: ''
    });
    return function () {
      if (wordPracticeControllerRef.current) wordPracticeControllerRef.current.abort();
      wordPracticeControllerRef.current = null;
      wordPracticeDiagnosticRef.current = null;
      wordPracticeCopyRef.current = null;
    };
  }, [activityResourceKey, isTeacherMode]);
  async function openGlossaryWordPractice() {
    if (!isTeacherMode || !activityWords.length || wordPracticeControllerRef.current) return;
    var controller = new AbortController();
    var startedAt = Date.now();
    wordPracticeControllerRef.current = controller;
    wordPracticeCopyRef.current = null;
    setWordPracticeStatus(prev => ({
      ...prev,
      busy: true,
      copying: false,
      copyNotice: '',
      notice: ''
    }));
    try {
      if (typeof window.__alloOpenWordPractice !== 'function') {
        var unavailable = new Error('The app shell does not provide the word presentation launcher.');
        unavailable.code = 'word-practice-launcher-unavailable';
        throw unavailable;
      }
      var ttsAssets = {};
      (Array.isArray(generatedContent?.data) ? generatedContent.data : []).forEach(function (item) {
        if (item?._ttsAssets && typeof item._ttsAssets === 'object') Object.assign(ttsAssets, item._ttsAssets);
      });
      await window.__alloOpenWordPractice({
        words: activityWords,
        ttsAssets: ttsAssets,
        title: generatedContent?.title || activityText('glossary.practice_title', 'Vocabulary Practice'),
        language: glossaryFieldLanguage(generatedContent, activityWords[0]),
        source: 'glossary',
        callTTS: callTTS,
        selectedVoice: selectedVoice,
        ttsSpeed: voiceSpeed,
        t: t,
        currentUiLanguage: currentUiLanguage,
        signal: controller.signal
      });
      if (!controller.signal.aborted) {
        wordPracticeDiagnosticRef.current = null;
        setWordPracticeStatus({
          busy: false,
          notice: ''
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        var diagnostic = glossaryWordPracticeDiagnostic(error, activityWords.length, startedAt);
        window.__alloLastWordPracticeDiagnostic = diagnostic;
        console.error('[Glossary Present & Export]', diagnostic);
        var notice = activityText('glossary.practice_open_failed_details', 'Presentation tools could not open. Open Presentation diagnostics below for the error details, then try again.');
        if (!diagnostic.launcherAvailable) notice = activityText('glossary.practice_launcher_unavailable', 'Presentation tools are unavailable in this app version. Save your work, then reload or update AlloFlow.');else if (diagnostic.error.code === 'allo-lazy-module-failed') notice = activityText('glossary.practice_load_failed', 'Presentation tools could not load. Check your connection, then try Present & Export again.');else if (diagnostic.error.code === 'allo-lazy-module-timeout') notice = activityText('glossary.practice_load_timeout', 'Presentation tools took too long to load. Check your connection, then try Present & Export again.');
        // Match only the presenter's known validation messages, including older
        // cached versions. Arbitrary exceptions stay in the diagnostic details.
        else if (/^Use up to 200 (different )?words in one practice set\.$/.test(diagnostic.error.message)) notice = activityText('glossary.practice_word_limit', 'Use up to 200 different words in one practice set. Choose Current filtered words or split the glossary into smaller lists, then retry.');else if (diagnostic.error.message === 'Each word or short phrase must be 120 characters or fewer.') notice = activityText('glossary.practice_term_limit', 'Each word or short phrase must be 120 characters or fewer. Shorten the long terms in Edit, then retry.');else if (/^The (definition|example|translation|sentence prompt) for .+ must be 12,000 characters or fewer\./.test(diagnostic.error.message)) notice = activityText('glossary.practice_text_limit', 'A definition, example, translation, or sentence prompt is too long. Use up to 12,000 characters per field, then retry.');else if (/^This practice set has too much instructional text\./.test(diagnostic.error.message)) notice = activityText('glossary.practice_text_total_limit', 'This set has too much instructional text. Split it into smaller word lists, then retry.');else if (diagnostic.error.message === 'This practice set has too much audio. Split it into smaller word lists.') notice = activityText('glossary.practice_audio_limit', 'This practice set has too much audio. Split it into smaller word lists, or choose Current filtered words, then retry.');
        wordPracticeDiagnosticRef.current = diagnostic;
        setWordPracticeStatus({
          busy: false,
          notice: notice,
          diagnostic: diagnostic
        });
      }
    } finally {
      if (wordPracticeControllerRef.current === controller) wordPracticeControllerRef.current = null;
    }
  }
  async function copyGlossaryWordPracticeDiagnostic() {
    var diagnostic = wordPracticeStatus.diagnostic;
    if (!diagnostic || wordPracticeStatus.busy || wordPracticeCopyRef.current) return;
    var request = {};
    wordPracticeCopyRef.current = request;
    setWordPracticeStatus(prev => ({
      ...prev,
      copying: true,
      copyNotice: ''
    }));
    var copied = false;
    try {
      if (typeof navigator.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
        copied = true;
      }
    } catch (_error) {/* Embedded browsers may deny clipboard permission. */}
    if (wordPracticeCopyRef.current !== request || wordPracticeDiagnosticRef.current !== diagnostic) return;
    wordPracticeCopyRef.current = null;
    if (!copied) {
      if (wordPracticeDetailsRef.current) wordPracticeDetailsRef.current.open = true;
      wordPracticeTextRef.current?.focus();
      wordPracticeTextRef.current?.select();
    }
    setWordPracticeStatus(prev => prev.diagnostic !== diagnostic ? prev : {
      ...prev,
      copying: false,
      copyNotice: copied ? activityText('glossary.practice_diagnostics_copied', 'Diagnostics copied.') : activityText('glossary.practice_diagnostics_copy_manual', 'Automatic copy is unavailable. The details are selected; copy them manually.')
    });
  }
  function activityData(name) {
    var session = activitySessions[name];
    return session && session.resourceKey === activityResourceKey ? session.data : generatedContent?.data;
  }
  function activitySize(name) {
    var session = activitySessions[name];
    return session && session.resourceKey === activityResourceKey ? session.boardSize : undefined;
  }
  function startGlossaryActivity(name, start) {
    if (!activityWords.length) return;
    // Keep a running game's pool stable when the glossary filters change.
    var data = activityWords.map(item => ({
      ...item,
      translations: item.translations ? {
        ...item.translations
      } : item.translations
    }));
    setActivitySessions(prev => ({
      ...prev,
      [name]: {
        resourceKey: activityResourceKey,
        data,
        boardSize: activityBoardSize === 'standard' ? undefined : Number(activityBoardSize)
      }
    }));
    if (name === 'bingo' && typeof setBingoState === 'function') setBingoState({
      cards: [],
      drawPile: [],
      calledTerms: [],
      currentCall: null
    });
    start(data);
  }
  function startScopedWordSearch(language) {
    startGlossaryActivity('wordsearch', data => generateWordSearch(language, data));
  }
  function launchGlossaryLanguageFlashcards() {
    launchInteractiveFlashcards('language');
    var chips = Array.isArray(selectedLanguages) ? selectedLanguages : [];
    var preferred = glossaryLanguages.indexOf(leveledTextLanguage) >= 0 ? leveledTextLanguage : glossaryLanguages.filter(function (lang) {
      return chips.indexOf(lang) >= 0;
    })[0] || glossaryLanguages[0];
    if (preferred && typeof setFlashcardLang === 'function') setFlashcardLang(preferred);
  }
  React.useEffect(() => {
    setActivitySessions({});
    setActivityScope('all');
  }, [activityResourceKey]);
  var detectiveState = React.useState(false);
  var detectiveOpen = detectiveState[0],
    setDetectiveOpen = detectiveState[1];
  var detectiveRefresh = React.useState(0);
  var DefinitionDetectiveGame = window.AlloModules && window.AlloModules.DefinitionDetectiveGame || props.DefinitionDetectiveGame;
  React.useEffect(function () {
    setDetectiveOpen(false);
  }, [generatedContent && generatedContent.id]);
  var detectiveLabel = t('games.detective.title');
  if (!detectiveLabel || detectiveLabel === 'games.detective.title') detectiveLabel = 'Definition Detective';
  var MemoryGame = props.MemoryGame;
  var CrosswordGame = props.CrosswordGame;
  var MatchingGame = props.MatchingGame;
  var BingoGame = props.BingoGame;
  var StudentBingoGame = props.StudentBingoGame;
  var WordScrambleGame = props.WordScrambleGame;
  var flashcardDictAudioKeyState = React.useState(null);
  var flashcardDictAudioKey = flashcardDictAudioKeyState[0];
  var setFlashcardDictAudioKey = flashcardDictAudioKeyState[1];
  var flashcardReviewStateState = React.useState({});
  var flashcardReviewState = flashcardReviewStateState[0];
  var setFlashcardReviewState = flashcardReviewStateState[1];
  var [flashcardSummary, setFlashcardSummary] = React.useState(false);
  var [flashcardRoundKeys, setFlashcardRoundKeys] = React.useState(null);
  var flashcardSummaryRef = React.useRef(null);
  var flashcardNavigationRef = React.useRef(0);
  var flashcardEditDrawerState = React.useState(false);
  var isFlashcardEditDrawerOpen = flashcardEditDrawerState[0];
  var setIsFlashcardEditDrawerOpen = flashcardEditDrawerState[1];
  var glossaryToolsState = React.useState({
    games: false,
    teacher: false
  });
  var glossaryToolsOpen = glossaryToolsState[0];
  var setGlossaryToolsOpen = glossaryToolsState[1];
  var glossaryAudioState = React.useState({
    busy: false,
    done: 0,
    total: 0,
    message: ''
  });
  var glossaryAudioPrep = glossaryAudioState[0];
  var setGlossaryAudioPrep = glossaryAudioState[1];
  // Definitions are part of the core glossary experience, so the safe default
  // prepares both halves of every entry. Teachers can still choose terms only
  // when they deliberately want the smaller audio set.
  var glossaryAudioScopeState = React.useState('core');
  var glossaryAudioScope = glossaryAudioScopeState[0];
  var setGlossaryAudioScope = glossaryAudioScopeState[1];
  var glossaryAudioEditStateState = React.useState({
    busyKey: '',
    message: ''
  });
  var glossaryAudioEditState = glossaryAudioEditStateState[0];
  var setGlossaryAudioEditState = glossaryAudioEditStateState[1];
  var [isGlossaryAudioReviewOpen, setIsGlossaryAudioReviewOpen] = React.useState(false);
  React.useEffect(function () {
    setIsGlossaryAudioReviewOpen(false);
  }, [activityResourceKey, isTeacherMode, isEditingGlossary]);
  var wordSearchStartState = React.useState(null);
  var wordSearchStart = wordSearchStartState[0];
  var setWordSearchStart = wordSearchStartState[1];
  var wordSearchActiveState = React.useState({
    r: 0,
    c: 0
  });
  var wordSearchActive = wordSearchActiveState[0];
  var setWordSearchActive = wordSearchActiveState[1];
  var wordSearchPathState = React.useState([]);
  var wordSearchPath = wordSearchPathState[0];
  var setWordSearchPath = wordSearchPathState[1];
  var wordSearchFoundState = React.useState(function () {
    return new Set();
  });
  var wordSearchFoundWords = wordSearchFoundState[0];
  var setWordSearchFoundWords = wordSearchFoundState[1];
  var wordSearchAnnouncementState = React.useState('');
  var wordSearchAnnouncement = wordSearchAnnouncementState[0];
  var setWordSearchAnnouncement = wordSearchAnnouncementState[1];
  var wordSearchGridRef = React.useRef(null);
  var wordSearchPathTimerRef = React.useRef(null);
  var glossaryResourceKey = String(generatedContent?.type || '') + ':' + String(generatedContent?.id || '');
  var glossaryViewSessionRef = React.useRef({
    key: glossaryResourceKey
  });
  if (glossaryViewSessionRef.current.key !== glossaryResourceKey) glossaryViewSessionRef.current = {
    key: glossaryResourceKey
  };
  var glossarySuggestionScope = glossaryResourceKey + ':' + String(activeView) + ':' + String(isTeacherMode);
  var glossarySuggestionSessionRef = React.useRef({
    key: glossarySuggestionScope,
    pending: new Set()
  });
  if (glossarySuggestionSessionRef.current.key !== glossarySuggestionScope) glossarySuggestionSessionRef.current = {
    key: glossarySuggestionScope,
    pending: new Set()
  };
  var [glossarySuggestionState, setGlossarySuggestionState] = React.useState({
    key: glossarySuggestionScope,
    pending: [],
    message: ''
  });
  var glossaryPendingSuggestions = glossarySuggestionState.key === glossarySuggestionScope ? glossarySuggestionState.pending : [];
  var glossarySuggestionMessage = glossarySuggestionState.key === glossarySuggestionScope ? glossarySuggestionState.message : '';
  React.useEffect(function () {
    setGlossarySuggestionState({
      key: glossarySuggestionScope,
      pending: [],
      message: ''
    });
  }, [glossarySuggestionScope]);
  var glossaryAudioSignature = JSON.stringify((Array.isArray(generatedContent?.data) ? generatedContent.data : []).map(item => item && [item.entryId, item.term, item.def, item.translations]));
  var glossaryAudioOwnerRef = React.useRef({
    key: glossaryResourceKey,
    signature: glossaryAudioSignature
  });
  if (glossaryAudioOwnerRef.current.key !== glossaryResourceKey || glossaryAudioOwnerRef.current.signature !== glossaryAudioSignature) glossaryAudioOwnerRef.current = {
    key: glossaryResourceKey,
    signature: glossaryAudioSignature
  };
  var glossaryMountedRef = React.useRef(true);
  var glossaryAudioControllersRef = React.useRef(new Set());
  var glossaryAudioPrepControllerRef = React.useRef(null);
  var glossaryAudioEditControllerRef = React.useRef(null);
  var glossaryDictionaryAudioRef = React.useRef(null);
  var flashcardMoveTimerRef = React.useRef(null);
  var flashcardFocusTimerRef = React.useRef(null);
  function isGlossaryViewCurrent(owner) {
    return glossaryMountedRef.current && glossaryViewSessionRef.current === owner;
  }
  function isGlossaryAudioCurrent(owner) {
    return glossaryMountedRef.current && glossaryAudioOwnerRef.current === owner;
  }
  function glossarySuggestionKey(term) {
    return String(term || '').trim().toLocaleLowerCase();
  }
  async function handleAddGlossarySuggestion(gap) {
    var addedTerm = String(gap?.term || '').trim();
    var key = glossarySuggestionKey(addedTerm);
    var session = glossarySuggestionSessionRef.current;
    if (!isTeacherMode || activeView !== 'glossary' || !key || session.pending.has(key)) return;
    var owner = glossaryViewSessionRef.current;
    var current = function () {
      return isGlossaryViewCurrent(owner) && glossarySuggestionSessionRef.current === session;
    };
    var updateMessage = function (message) {
      if (current()) setGlossarySuggestionState({
        key: session.key,
        pending: Array.from(session.pending),
        message: message
      });
    };
    session.pending.add(key);
    updateMessage(glossaryText('glossary.suggestion_adding_status', 'Adding {term} to the glossary…', {
      term: addedTerm
    }));
    try {
      var added = await handleQuickAddGlossary(addedTerm, true);
      if (!current()) return;
      if (added === false) {
        updateMessage(glossaryText('glossary.suggestion_add_failed', 'Could not add {term}. Try again.', {
          term: addedTerm
        }));
        return;
      }
      setGlossaryHealthCheck(function (previous) {
        if (!current() || !previous || !Array.isArray(previous.coverageGaps)) return previous;
        return {
          ...previous,
          coverageGaps: previous.coverageGaps.filter(function (item) {
            return glossarySuggestionKey(item.term) !== key;
          })
        };
      });
      updateMessage(glossaryText('glossary.suggestion_added_status', 'Added {term} to the glossary.', {
        term: addedTerm
      }));
      try {
        var replacement = await fetchReplacementSuggestion(generatedContent?.data || [], addedTerm, relatedGlossarySourceText());
        if (replacement && current()) setGlossaryHealthCheck(function (previous) {
          if (!current() || !previous) return previous;
          return {
            ...previous,
            coverageGaps: [...(Array.isArray(previous.coverageGaps) ? previous.coverageGaps : []), replacement]
          };
        });
      } catch (_) {
        updateMessage(glossaryText('glossary.suggestion_refresh_failed', 'Added {term}. More suggestions could not be refreshed.', {
          term: addedTerm
        }));
      }
    } catch (_) {
      updateMessage(glossaryText('glossary.suggestion_add_failed', 'Could not add {term}. Try again.', {
        term: addedTerm
      }));
    } finally {
      session.pending.delete(key);
      if (current()) setGlossarySuggestionState(function (previous) {
        if (!current()) return previous;
        return {
          key: session.key,
          pending: Array.from(session.pending),
          message: previous.key === session.key ? previous.message : ''
        };
      });
    }
  }
  function playGlossaryDictionaryAudio(url, key) {
    if (glossaryDictionaryAudioRef.current) glossaryDictionaryAudioRef.current.pause();
    var owner = glossaryAudioOwnerRef.current;
    try {
      var player = new Audio(url);
      glossaryDictionaryAudioRef.current = player;
      setFlashcardDictAudioKey(key || null);
      var clear = function () {
        if (isGlossaryAudioCurrent(owner) && glossaryDictionaryAudioRef.current === player) {
          glossaryDictionaryAudioRef.current = null;
          setFlashcardDictAudioKey(null);
        }
      };
      player.addEventListener('ended', clear, {
        once: true
      });
      player.addEventListener('error', clear, {
        once: true
      });
      var playback = player.play();
      if (playback && typeof playback.catch === 'function') playback.catch(clear);
    } catch (_) {
      if (isGlossaryAudioCurrent(owner)) setFlashcardDictAudioKey(null);
    }
  }
  var glossarySavedAudioRef = React.useRef(null);
  var glossarySavedAudioSessionRef = React.useRef(0);
  var flashcardEditButtonRef = React.useRef(null);
  var flashcardEditDrawerRef = React.useRef(null);
  var flashcardEditFirstFieldRef = React.useRef(null);
  var flashcardDialogRef = React.useRef(null);
  var flashcardCloseRef = React.useRef(null);
  var phonicsDialogRef = React.useRef(null);
  var phonicsCloseRef = React.useRef(null);
  React.useEffect(function () {
    glossaryMountedRef.current = true;
    setFlashcardReviewState({});
    setFlashcardRoundKeys(null);
    setFlashcardSummary(false);
    flashcardNavigationRef.current += 1;
    setIsFlashcardEditDrawerOpen(false);
    setGlossaryToolsOpen({
      games: false,
      teacher: false
    });
    return function () {
      glossaryMountedRef.current = false;
      clearTimeout(flashcardMoveTimerRef.current);
      clearTimeout(flashcardFocusTimerRef.current);
    };
  }, [glossaryResourceKey]);
  React.useEffect(function () {
    setFlashcardDictAudioKey(null);
    setGlossaryAudioPrep({
      busy: false,
      done: 0,
      total: 0,
      message: ''
    });
    setGlossaryAudioEditState({
      busyKey: '',
      message: ''
    });
    return function () {
      glossarySavedAudioSessionRef.current += 1;
      glossaryAudioControllersRef.current.forEach(controller => controller.abort());
      glossaryAudioControllersRef.current.clear();
      glossaryAudioPrepControllerRef.current = null;
      glossaryAudioEditControllerRef.current = null;
      if (glossaryDictionaryAudioRef.current) {
        glossaryDictionaryAudioRef.current.pause();
        glossaryDictionaryAudioRef.current = null;
      }
      if (glossarySavedAudioRef.current) {
        glossarySavedAudioRef.current.pause();
        glossarySavedAudioRef.current = null;
      }
      if (typeof stopPlayback === 'function') stopPlayback();
    };
  }, [glossaryResourceKey, glossaryAudioSignature]);
  React.useEffect(function () {
    if (Number(props.flashcardIndex) !== flashcardIndex && typeof setFlashcardIndex === 'function') setFlashcardIndex(flashcardIndex);
  }, [props.flashcardIndex, flashcardIndex]);
  React.useEffect(function () {
    if (generatedContent?.type !== 'glossary' || !Array.isArray(generatedContent?.data)) return;
    var ensureIds = typeof window !== 'undefined' ? window.__alloEnsureGlossaryEntryIds : null;
    if (typeof ensureIds === 'function') ensureIds();
  }, [generatedContent?.type, generatedContent?.id, generatedContent?.data]);
  function containModalFocus(e, container, onEscape) {
    if (!e) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onEscape === 'function') onEscape(e);
      return;
    }
    if (e.key !== 'Tab' || !container || typeof container.querySelectorAll !== 'function') return;
    var focusable = Array.prototype.slice.call(container.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(function (el) {
      return el && !el.hidden && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0;
    });
    if (!focusable.length) {
      e.preventDefault();
      container.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (document.activeElement === container) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  React.useEffect(function () {
    if (!isInteractiveFlashcards) return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (flashcardCloseRef.current) flashcardCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isInteractiveFlashcards]);
  React.useEffect(function () {
    if (!phonicsData || activeView !== 'glossary') return undefined;
    var previouslyFocused = document.activeElement;
    var timer = setTimeout(function () {
      if (phonicsCloseRef.current) phonicsCloseRef.current.focus();
    }, 0);
    return function () {
      clearTimeout(timer);
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [!!phonicsData, activeView]);
  var flashcardDeck = Array.isArray(generatedContent?.data) ? generatedContent.data : [];
  // Keep a small, local stack of reversible mutations. Receipts restore only
  // the deleted part of the resource, never an old copy of the whole glossary.
  var [glossaryUndoActions, setGlossaryUndoActions] = React.useState([]);
  var glossaryUndoActionsRef = React.useRef([]);
  var [glossaryUndoAnnouncement, setGlossaryUndoAnnouncement] = React.useState('');
  var glossaryUndoButtonRef = React.useRef(null);
  var glossaryUndoFocusRef = React.useRef(null);
  var glossaryWordListRef = React.useRef(null);
  React.useEffect(function () {
    glossaryUndoActionsRef.current = [];
    glossaryUndoFocusRef.current = null;
    setGlossaryUndoActions([]);
    setGlossaryUndoAnnouncement('');
  }, [activityResourceKey, isTeacherMode]);
  React.useEffect(function () {
    var focus = glossaryUndoFocusRef.current;
    if (!focus) return;
    glossaryUndoFocusRef.current = null;
    if (focus.undo && glossaryUndoButtonRef.current) {
      glossaryUndoButtonRef.current.focus({
        preventScroll: true
      });
      return;
    }
    var list = glossaryWordListRef.current;
    var row = focus.entryKey && list && Array.from(list.querySelectorAll('[data-glossary-entry-key]')).find(node => node.getAttribute('data-glossary-entry-key') === focus.entryKey);
    var target = row?.querySelector('textarea, input, button:not([disabled])') || list;
    target?.focus({
      preventScroll: true
    });
  }, [glossaryUndoActions]);
  function rememberGlossaryDeletion(index, kind, event) {
    if (!canEditGlossary) return;
    var remove = kind === 'image' ? deleteGlossaryImageInHost : deleteGlossaryTermInHost;
    if (typeof remove !== 'function') return;
    var item = generatedContent?.data?.[index];
    var heldFocus = !!event?.currentTarget && document.activeElement === event.currentTarget;
    var receipt = remove(index);
    // Older embedded hosts can still delete but cannot yet return a receipt.
    if (!receipt || typeof receipt.undo !== 'function' || String(receipt.resourceId) !== String(generatedContent?.id)) return;
    var action = {
      receipt: receipt,
      entryKey: getGlossaryEntryKey(item, index),
      message: kind === 'image' ? glossaryText('glossary.undo_image_removed', 'Removed image for {term}.', {
        term: receipt.term
      }) : glossaryText('glossary.undo_term_deleted', 'Deleted {term}.', {
        term: receipt.term
      })
    };
    var actions = glossaryUndoActionsRef.current.slice(-9).concat(action);
    glossaryUndoActionsRef.current = actions;
    if (heldFocus) glossaryUndoFocusRef.current = {
      undo: true
    };
    setGlossaryUndoActions(actions);
    setGlossaryUndoAnnouncement(action.message + ' ' + glossaryText('glossary.undo_available', 'Undo is available.'));
  }
  function handleDeleteGlossaryItem(index, event) {
    rememberGlossaryDeletion(index, 'term', event);
  }
  function handleDeleteTermImage(index, event) {
    rememberGlossaryDeletion(index, 'image', event);
  }
  function undoGlossaryDeletion() {
    var actions = glossaryUndoActionsRef.current;
    var action = actions[actions.length - 1];
    if (!action || !isTeacherMode) return;
    var restored = false;
    try {
      restored = action.receipt.undo() === true;
    } catch (_error) {/* Preserve newer edits if restoration is no longer possible. */}
    var remaining = actions.slice(0, -1);
    glossaryUndoActionsRef.current = remaining;
    glossaryUndoFocusRef.current = {
      entryKey: restored ? action.entryKey : null
    };
    setGlossaryUndoActions(remaining);
    setGlossaryUndoAnnouncement(restored ? glossaryText('glossary.undo_restored', 'Restored {term}.', {
      term: action.receipt.term
    }) : glossaryText('glossary.undo_unavailable', 'This deletion could not be undone because the glossary changed.'));
  }
  function dismissGlossaryUndo() {
    glossaryUndoActionsRef.current = [];
    glossaryUndoFocusRef.current = {};
    setGlossaryUndoActions([]);
    setGlossaryUndoAnnouncement('');
  }
  function renderGlossaryUndoNotice() {
    var action = glossaryUndoActions[glossaryUndoActions.length - 1];
    if (!isTeacherMode) return null;
    var buttonClass = 'min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      "data-glossary-undo-status": true,
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      className: "sr-only print:hidden"
    }, glossaryUndoAnnouncement), action && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      className: "h-28 print:hidden"
    }), /*#__PURE__*/React.createElement("div", {
      "data-glossary-undo": true,
      className: "fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-lg flex-wrap items-center gap-2 rounded-xl border border-indigo-300 bg-white p-3 text-slate-900 shadow-lg print:hidden"
    }, /*#__PURE__*/React.createElement("p", {
      className: "min-w-0 flex-1 line-clamp-2 break-words text-sm",
      title: action.message
    }, action.message), /*#__PURE__*/React.createElement("button", {
      ref: glossaryUndoButtonRef,
      "data-glossary-undo-action": true,
      type: "button",
      onClick: undoGlossaryDeletion,
      className: buttonClass + ' bg-indigo-700 text-white hover:bg-indigo-800',
      "aria-label": action.receipt.kind === 'image' ? glossaryText('glossary.undo_image_aria', 'Undo image removal for {term}', {
        term: action.receipt.term
      }) : glossaryText('glossary.undo_term_aria', 'Undo deletion of {term}', {
        term: action.receipt.term
      })
    }, glossaryText('glossary.undo', 'Undo')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: dismissGlossaryUndo,
      className: buttonClass + ' min-w-11 text-slate-600 hover:bg-slate-100',
      "aria-label": glossaryText('glossary.undo_dismiss', 'Dismiss undo')
    }, /*#__PURE__*/React.createElement(X, {
      size: 18,
      "aria-hidden": "true"
    })))));
  }
  // Word rows: Tab stops, translation status and retry, and reordering.
  // Their messages share the undo status region above.
  var glossaryRowFocusRef = React.useRef(new Map());
  var glossaryMoveFocusRef = React.useRef(null);
  var glossaryRetryPendingRef = React.useRef(new Set());
  var [glossaryRetryState, setGlossaryRetryState] = React.useState({});
  React.useEffect(function () {
    glossaryRowFocusRef.current = new Map();
    glossaryMoveFocusRef.current = null;
    glossaryRetryPendingRef.current = new Set();
    setGlossaryRetryState(function (previous) {
      return Object.keys(previous).length ? {} : previous;
    });
  }, [glossaryResourceKey]);
  React.useLayoutEffect(function () {
    var list = glossaryWordListRef.current;
    if (!list) return;
    var memory = glossaryRowFocusRef.current;
    var rows = Array.prototype.slice.call(list.querySelectorAll('tr[data-glossary-entry-key]'));
    rows.forEach(function (row) {
      syncGlossaryRowTabStop(row, memory);
    });
    var pending = glossaryMoveFocusRef.current;
    if (!pending) return;
    var row = rows.find(function (node) {
      return node.getAttribute('data-glossary-entry-key') === pending.entryKey;
    });
    var button = row && row.querySelector('[data-glossary-move="' + pending.which + '"]');
    if (!button) {
      if (++pending.tries > 2) glossaryMoveFocusRef.current = null;
      return;
    }
    glossaryMoveFocusRef.current = null;
    memory.set(pending.entryKey, button);
    syncGlossaryRowTabStop(row, memory);
    button.focus();
  });
  function handleGlossaryRowFocus(event) {
    var row = event.currentTarget,
      target = event.target;
    if (!target || target.closest('dialog, [role="dialog"]') || glossaryRowControls(row).indexOf(target) < 0 || !glossaryRowItemShown(target, row)) return;
    glossaryRowFocusRef.current.set(row.getAttribute('data-glossary-entry-key'), target);
    syncGlossaryRowTabStop(row, glossaryRowFocusRef.current);
  }
  function handleGlossaryRowKeyDown(event) {
    var key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    var row = event.currentTarget,
      target = event.target;
    if (!target || target.closest('dialog, [role="dialog"]')) return;
    var items = glossaryRowControls(row).filter(function (el) {
      return glossaryRowItemShown(el, row);
    });
    var at = items.indexOf(target);
    if (at < 0) return;
    event.preventDefault();
    var step = key === 'ArrowRight' ? 1 : -1;
    var dirHost = target.closest('[dir="rtl"], [dir="ltr"]');
    if (dirHost && dirHost.getAttribute('dir') === 'rtl') step = -step;
    var next = items[key === 'Home' ? 0 : key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, at + step))];
    glossaryRowFocusRef.current.set(row.getAttribute('data-glossary-entry-key'), next);
    syncGlossaryRowTabStop(row, glossaryRowFocusRef.current);
    next.focus();
  }
  // 'missing' (empty or the "not available" placeholder) or 'outdated' (the
  // English changed after this translation was made); '' otherwise.
  var glossaryUnavailableText = glossaryText('glossary.translation_unavailable', 'Translation not available');
  function glossaryTranslationStatus(item, lang) {
    var value = String(item && item.translations && glossaryTranslationText(item.translations[lang]) || '').trim();
    if (!value || /^translation not available\.?$/i.test(value) || value === glossaryUnavailableText) return 'missing';
    var source = item.translationSource && typeof item.translationSource === 'object' ? item.translationSource[lang] : '';
    return source && source !== glossaryTranslationFingerprint(item) ? 'outdated' : '';
  }
  async function retryGlossaryTranslation(item, idx, lang) {
    var retry = props.handleRetryGlossaryTranslation;
    var pending = glossaryRetryPendingRef.current;
    var key = getGlossaryEntryKey(item, idx) + '|' + lang;
    if (!isTeacherMode || typeof retry !== 'function' || pending.has(key)) return;
    var owner = glossaryViewSessionRef.current;
    pending.add(key);
    setGlossaryRetryState(function (previous) {
      return {
        ...previous,
        [key]: {
          busy: true,
          error: ''
        }
      };
    });
    var result = null;
    try {
      result = await retry(idx, lang);
    } catch (_error) {
      result = null;
    }
    pending.delete(key);
    if (!isGlossaryViewCurrent(owner) || glossaryRetryPendingRef.current !== pending) return;
    var params = {
      term: item.term || '',
      lang: lang
    };
    var reason = result && result.reason;
    var message = result && result.ok ? glossaryText('glossary.translation_retry_done', 'Translated {term} into {lang}.', params) : reason === 'ai-disabled' ? glossaryText('glossary.translation_retry_ai_off', 'AI translation is turned off. You can type the translation in Edit.') : reason === 'ai-unavailable' ? glossaryText('glossary.translation_retry_unavailable', 'AI translation is not available right now. You can type the translation in Edit.') : reason === 'changed' ? glossaryText('glossary.translation_retry_changed', '{term} changed while it was being translated. Try again.', params) : glossaryText('glossary.translation_retry_failed', 'Could not translate {term} into {lang}. Try again.', params);
    setGlossaryRetryState(function (previous) {
      var next = {
        ...previous
      };
      if (result && result.ok) delete next[key];else next[key] = {
        busy: false,
        error: message
      };
      return next;
    });
    setGlossaryUndoAnnouncement(message);
  }
  function renderGlossaryTranslationStatus(status, retry) {
    var busy = !!(retry && retry.busy);
    return /*#__PURE__*/React.createElement("div", {
      "data-glossary-translation-status": status,
      className: "flex flex-col items-center gap-1 not-italic"
    }, /*#__PURE__*/React.createElement("span", {
      className: 'rounded-full border px-2 py-0.5 text-[11px] font-bold ' + (status === 'missing' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-orange-300 bg-orange-50 text-orange-900')
    }, busy ? glossaryText('glossary.translation_retrying', 'Translating…') : status === 'missing' ? glossaryText('glossary.translation_missing', 'Missing') : glossaryText('glossary.translation_outdated', 'May be out of date')), !busy && retry && retry.error && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-red-700"
    }, retry.error));
  }
  function renderGlossaryRetryButton(item, idx, lang, retry) {
    var busy = !!(retry && retry.busy);
    var label = glossaryText('glossary.retry_translation_aria', 'Translate {term} into {lang} again', {
      term: item.term || '',
      lang: lang
    });
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-glossary-retry-translation": lang,
      "aria-label": label,
      title: label,
      "aria-disabled": busy ? 'true' : undefined,
      onClick: () => {
        if (!busy) retryGlossaryTranslation(item, idx, lang);
      },
      className: 'min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (busy ? 'cursor-wait text-indigo-700' : 'text-indigo-700 hover:bg-indigo-50')
    }, busy ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Languages, {
      size: 14,
      "aria-hidden": "true"
    }));
  }
  var GLOSSARY_LESSON_ORDER = ['lesson', 'lesson-order', 'lesson_order', 'original', 'default', 'none'];
  function glossaryReorderBlocked() {
    var sort = props.glossarySort;
    var data = Array.isArray(generatedContent?.data) ? generatedContent.data : [];
    return !!String(glossarySearchTerm || '').trim() || !!glossaryFilter && glossaryFilter !== 'all' || !(sort == null || sort === '' || GLOSSARY_LESSON_ORDER.indexOf(String(sort)) >= 0) || !Array.isArray(filteredGlossaryData) || filteredGlossaryData.length !== data.length;
  }
  function moveGlossaryRow(item, idx, delta) {
    var move = props.handleMoveGlossaryItem;
    var total = Array.isArray(generatedContent?.data) ? generatedContent.data.length : 0;
    var to = idx + delta;
    if (!canEditGlossary || typeof move !== 'function' || glossaryReorderBlocked() || to < 0 || to >= total) return;
    if (move(idx, delta) === false) return;
    glossaryMoveFocusRef.current = {
      entryKey: getGlossaryEntryKey({
        ...item,
        _originalIdx: to
      }, to),
      which: delta < 0 ? 'up' : 'down',
      tries: 0
    };
    setGlossaryUndoAnnouncement(glossaryText('glossary.moved_to_position', '{term} moved to position {n} of {total}.', {
      term: item.term || '',
      n: to + 1,
      total: total
    }));
  }
  function renderGlossaryMoveButton(item, idx, delta) {
    var total = Array.isArray(generatedContent?.data) ? generatedContent.data.length : 0;
    var blocked = glossaryReorderBlocked();
    var unavailable = blocked || idx + delta < 0 || idx + delta >= total;
    var label = delta < 0 ? glossaryText('glossary.move_up_aria', 'Move {term} up', {
      term: item.term || ''
    }) : glossaryText('glossary.move_down_aria', 'Move {term} down', {
      term: item.term || ''
    });
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: delta < 0 ? 'up' : 'down',
      "data-glossary-move": delta < 0 ? 'up' : 'down',
      "aria-label": label,
      title: label,
      "aria-disabled": unavailable ? 'true' : undefined,
      "aria-describedby": blocked ? 'glossary-reorder-help' : undefined,
      onClick: () => {
        if (!unavailable) moveGlossaryRow(item, idx, delta);
      },
      className: 'min-h-11 min-w-11 inline-flex items-center justify-center rounded-full text-slate-600 transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (unavailable ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-700 hover:bg-indigo-50')
    }, /*#__PURE__*/React.createElement(ArrowDown, {
      size: 14,
      "aria-hidden": "true",
      className: delta < 0 ? 'rotate-180' : ''
    }));
  }
  function getGlossaryEntryKey(item, idx) {
    if (item && item.entryId != null && String(item.entryId).trim()) return 'entry:' + String(item.entryId);
    if (item && item.glossaryEntryId != null && String(item.glossaryEntryId).trim()) return 'entry:' + String(item.glossaryEntryId);
    if (item && item.id != null && String(item.id).trim()) return 'id:' + String(item.id);
    return 'index:' + String(item && item._originalIdx != null ? item._originalIdx : idx);
  }
  function getFlashcardReviewKey(item, idx) {
    return getGlossaryEntryKey(item, idx);
  }
  var currentFlashcardItem = flashcardDeck[flashcardIndex] || null;
  var currentFlashcardKey = currentFlashcardItem ? getFlashcardReviewKey(currentFlashcardItem, flashcardIndex) : '';
  var flashcardTransitionKey = String(flashcardMode || 'deck') + '-' + currentFlashcardKey;
  var currentFlashcardConfidence = currentFlashcardKey ? flashcardReviewState[currentFlashcardKey] : '';
  var reviewKeys = flashcardDeck.map(function (item, idx) {
    return getFlashcardReviewKey(item, idx);
  });
  var knownCount = reviewKeys.filter(function (key) {
    return flashcardReviewState[key] === 'known';
  }).length;
  var learningCount = reviewKeys.filter(function (key) {
    return flashcardReviewState[key] === 'learning';
  }).length;
  var flashcardRoundIndices = reviewKeys.map((key, index) => index).filter(index => !flashcardRoundKeys || flashcardRoundKeys.includes(reviewKeys[index]));
  var flashcardRoundPosition = flashcardRoundIndices.indexOf(flashcardIndex);
  var flashcardRoundLast = flashcardRoundPosition >= flashcardRoundIndices.length - 1;
  function flashcardText(key, fallback) {
    var value = t(key);
    return value && value !== key ? value : fallback;
  }
  function glossaryText(key, fallback, params) {
    var text = flashcardText(key, fallback);
    Object.keys(params || {}).forEach(function (name) {
      text = String(text).split('{' + name + '}').join(String(params[name] == null ? '' : params[name]));
    });
    return text;
  }
  // Optional source quote from generation; rendered as React text (escaped).
  function renderGlossaryContextSentence(item, className, labelClassName) {
    var sentence = item && typeof item.contextSentence === 'string' ? item.contextSentence.trim() : '';
    if (!sentence) return null;
    return /*#__PURE__*/React.createElement("p", {
      "data-glossary-context-sentence": true,
      dir: "auto",
      className: className
    }, /*#__PURE__*/React.createElement("span", {
      className: labelClassName
    }, glossaryText('glossary.context_sentence_label', 'In the text:')), " ", /*#__PURE__*/React.createElement("q", null, sentence));
  }
  // A word root read aloud or named for a screen reader, as whole translatable
  // sentences (it was English glue: ", meaning " / "Related words: ").
  function glossaryRootText(root, meaning, related, joiner) {
    var parts = [meaning ? glossaryText('glossary.root_meaning', '{root}, meaning {meaning}', {
      root: root,
      meaning: meaning
    }) : root];
    if (related && related.length) parts.push(glossaryText('glossary.root_related', 'Related words: {words}', {
      words: related.join(', ')
    }));
    return parts.join(joiner);
  }
  function glossaryAudioActionLabel(contentId, field, term, lang) {
    var stopping = playingContentId === contentId;
    var labels = {
      term: stopping ? 'Stop reading term: {term}' : 'Read term: {term}',
      definition: stopping ? 'Stop reading definition for {term}' : 'Read definition for {term}',
      translation: stopping ? 'Stop reading {lang} translation of {term}' : 'Read {lang} translation of {term}'
    };
    return glossaryText('glossary.' + (stopping ? 'stop_' : 'read_') + field + '_aria', labels[field], {
      term: term,
      lang: lang
    });
  }
  function handleGlossaryInputEnter(event, callback, disabled) {
    if (event.key !== 'Enter' || event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.nativeEvent?.keyCode === 229) return;
    event.preventDefault();
    if (event.repeat || disabled) return;
    callback();
  }
  React.useEffect(function () {
    setFlashcardSummary(false);
    setFlashcardRoundKeys(null);
    setFlashcardReviewState({});
    flashcardNavigationRef.current += 1;
    clearTimeout(flashcardMoveTimerRef.current);
    // Not standardDeckLang: adding a support-language line to the Standard
    // Deck changes nothing being studied, so it must not wipe the ratings.
  }, [isInteractiveFlashcards, flashcardMode, flashcardLang]);
  React.useEffect(function () {
    if (flashcardDialogRef.current) flashcardDialogRef.current.scrollTop = 0;
  }, [flashcardIndex, isFlashcardFlipped, flashcardSummary]);
  React.useEffect(function () {
    if (flashcardSummary) flashcardSummaryRef.current?.focus();
  }, [flashcardSummary]);
  var flashcardTermLabel = t('flashcards.front_label_term') || t('glossary.table_term') || '';
  var flashcardDefinitionLabel = t('flashcards.back_label_def') || t('glossary.table_def') || '';
  // Self-ratings use the round summary's words: they were "Correct" and
  // "Try Again!", which the summary then counted as "Known" / "Needs practice".
  var flashcardKnownLabel = flashcardText('flashcards.known_count', 'Known');
  var flashcardLearningLabel = flashcardText('flashcards.practice_count', 'Needs practice');
  var audioReviewLabel = glossaryText('common.listen', 'Listen');
  var audioStopLabel = glossaryText('common.stop', 'Stop');
  var audioGenerateLabel = glossaryText('common.generate', 'Generate');
  var audioRegenerateLabel = glossaryText('common.regenerate', 'Regenerate');
  var glossaryPrepareAudioLabel = glossaryText('glossary.prepare_audio', 'Prepare audio');
  var glossaryPreparingAudioLabel = glossaryText('glossary.preparing_audio', 'Preparing audio…');
  var glossaryProgressLabel = t('common.progress') || '';
  var glossaryQuizToggleLabel = t('flashcards.tooltip_toggle_quiz') || '';
  var audioFieldLabel = function (field, language) {
    return field === 'term' ? flashcardTermLabel : field === 'definition' ? flashcardDefinitionLabel : glossaryText('glossary.audio_translation_field', '{lang} translation', {
      lang: language || ''
    });
  };
  // One translatable sentence (it was English glue around translated labels).
  var flashcardStatusText = currentFlashcardItem ? glossaryText('glossary.flashcard_status', '{label} {position} of {total}: {term}. {side} side. {rating}.', {
    label: flashcardTermLabel,
    position: flashcardRoundPosition + 1,
    total: flashcardRoundIndices.length,
    term: currentFlashcardItem.term || flashcardTermLabel.toLowerCase(),
    side: isFlashcardFlipped ? flashcardDefinitionLabel : flashcardTermLabel,
    rating: currentFlashcardConfidence === 'known' ? flashcardKnownLabel : currentFlashcardConfidence === 'learning' ? flashcardLearningLabel : t('common.progress') || ''
  }) : '';
  React.useEffect(function () {
    if (!isFlashcardEditDrawerOpen) return;
    var timer = setTimeout(function () {
      try {
        if (flashcardEditFirstFieldRef.current && typeof flashcardEditFirstFieldRef.current.focus === 'function') {
          flashcardEditFirstFieldRef.current.focus();
        }
      } catch (_e) {}
    }, 0);
    return function () {
      clearTimeout(timer);
    };
  }, [isFlashcardEditDrawerOpen, currentFlashcardKey]);
  function stopFlashcardControl(e) {
    if (!e) return;
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  function moveToFlashcardIndex(idx) {
    flashcardNavigationRef.current += 1;
    setQuizSelectedOption(null);
    stopGlossarySavedAudio(true);
    setIsFlashcardEditDrawerOpen(false);
    setIsFlashcardFlipped(false);
    setFlashcardFeedback(null);
    var owner = glossaryViewSessionRef.current;
    clearTimeout(flashcardMoveTimerRef.current);
    flashcardMoveTimerRef.current = setTimeout(function () {
      if (isGlossaryViewCurrent(owner)) setFlashcardIndex(idx);
    }, 150);
  }
  function finishFlashcardRound(e) {
    stopFlashcardControl(e);
    flashcardNavigationRef.current += 1;
    clearTimeout(flashcardMoveTimerRef.current);
    stopGlossarySavedAudio(true);
    setIsFlashcardEditDrawerOpen(false);
    setFlashcardSummary(true);
  }
  function goToNextReviewCard(e) {
    stopFlashcardControl(e);
    if (flashcardRoundLast) finishFlashcardRound();else moveToFlashcardIndex(flashcardRoundIndices[flashcardRoundPosition + 1]);
  }
  function goToPreviousReviewCard(e) {
    stopFlashcardControl(e);
    if (flashcardRoundPosition > 0) moveToFlashcardIndex(flashcardRoundIndices[flashcardRoundPosition - 1]);
  }
  function markFlashcardConfidence(status, e) {
    stopFlashcardControl(e);
    if (!currentFlashcardKey) return;
    setFlashcardReviewState(prev => ({
      ...prev,
      [currentFlashcardKey]: status
    }));
    goToNextReviewCard();
  }
  function handleReviewedQuizOption(e, option) {
    if (quizSelectedOption) return;
    var answer = typeof flashcardCorrectAnswer === 'function' ? flashcardCorrectAnswer(currentFlashcardItem, flashcardMode, flashcardLang) : currentFlashcardItem?.def;
    setFlashcardReviewState(prev => ({
      ...prev,
      [currentFlashcardKey]: option === answer ? 'known' : 'learning'
    }));
    var owner = glossaryViewSessionRef.current,
      token = ++flashcardNavigationRef.current;
    if (option !== answer) {
      // A miss waits for Next so the student can read the right answer (it
      // used to say "Try Again!" and move on after 1.5 s). The no-op callback
      // stops the host's auto-advance; focus goes to Next, as the options lock.
      handleQuizOptionClick(e, option, function () {});
      setTimeout(function () {
        var next = flashcardDialogRef.current && flashcardDialogRef.current.querySelector('[data-help-key="flashcard_next"]');
        if (next && isGlossaryViewCurrent(owner) && flashcardNavigationRef.current === token) next.focus();
      }, 0);
      return;
    }
    handleQuizOptionClick(e, option, function () {
      if (isGlossaryViewCurrent(owner) && flashcardNavigationRef.current === token) goToNextReviewCard();
    });
  }
  function restartFlashcardRound(onlyPractice) {
    var keys = onlyPractice ? reviewKeys.filter(key => flashcardReviewState[key] !== 'known') : null;
    if (keys && !keys.length) return;
    flashcardNavigationRef.current += 1;
    clearTimeout(flashcardMoveTimerRef.current);
    setFlashcardRoundKeys(keys);
    setFlashcardSummary(false);
    setFlashcardReviewState(prev => onlyPractice ? Object.fromEntries(Object.entries(prev).filter(([key]) => !keys.includes(key))) : {});
    setFlashcardScore(0);
    setFlashcardFeedback(null);
    setQuizSelectedOption(null);
    setIsFlashcardFlipped(false);
    setFlashcardIndex(keys ? reviewKeys.indexOf(keys[0]) : 0);
    flashcardCloseRef.current?.focus();
  }
  function renderFlashcardSummary() {
    var remaining = reviewKeys.length - knownCount;
    var buttonClass = 'min-h-11 rounded-xl border border-slate-400 px-4 py-3 font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';
    return /*#__PURE__*/React.createElement("section", {
      "data-flashcard-summary": "true",
      className: "w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-10 text-slate-900 shadow-xl"
    }, /*#__PURE__*/React.createElement("h2", {
      ref: flashcardSummaryRef,
      tabIndex: -1,
      className: "text-2xl font-black rounded focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-4"
    }, flashcardText('flashcards.round_complete', 'Study round complete')), /*#__PURE__*/React.createElement("p", {
      className: "mt-3"
    }, flashcardText('flashcards.summary_help', 'Choose what to practice next. Cards you skipped are counted as not rated.')), /*#__PURE__*/React.createElement("dl", {
      className: "my-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center"
    }, [[flashcardText('flashcards.known_count', 'Known'), knownCount], [flashcardText('flashcards.practice_count', 'Needs practice'), learningCount], [flashcardText('flashcards.unrated_count', 'Not rated'), reviewKeys.length - knownCount - learningCount]].map(([label, count]) => /*#__PURE__*/React.createElement("div", {
      key: label,
      className: "rounded-xl bg-slate-100 p-3"
    }, /*#__PURE__*/React.createElement("dt", {
      className: "text-sm"
    }, label), /*#__PURE__*/React.createElement("dd", {
      className: "text-2xl font-bold"
    }, count)))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-3"
    }, remaining > 0 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: buttonClass + ' bg-indigo-700 text-white',
      onClick: () => restartFlashcardRound(true)
    }, flashcardText('flashcards.review_practice', 'Review cards needing practice'), " (", remaining, ")"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: buttonClass,
      onClick: () => restartFlashcardRound(false)
    }, flashcardText('flashcards.start_again', 'Start again')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: buttonClass,
      onClick: closeInteractiveFlashcards
    }, flashcardText('common.done', 'Done'))));
  }
  function handleFlashcardFlipButton(e) {
    stopFlashcardControl(e);
    setIsFlashcardFlipped(!isFlashcardFlipped);
  }
  function handleEditCurrentFlashcard(e) {
    stopFlashcardControl(e);
    if (!currentFlashcardItem) return;
    setIsFlashcardEditDrawerOpen(true);
  }
  function handleCloseFlashcardEditDrawer(e) {
    stopFlashcardControl(e);
    setIsFlashcardEditDrawerOpen(false);
    var owner = glossaryViewSessionRef.current;
    clearTimeout(flashcardFocusTimerRef.current);
    flashcardFocusTimerRef.current = setTimeout(function () {
      if (!isGlossaryViewCurrent(owner)) return;
      try {
        if (flashcardEditButtonRef.current && typeof flashcardEditButtonRef.current.focus === 'function') {
          flashcardEditButtonRef.current.focus();
        }
      } catch (_e) {}
    }, 0);
  }
  function handleFlashcardEditDrawerKeyDown(e) {
    if (!e) return;
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (e.key === 'Escape') {
      handleCloseFlashcardEditDrawer(e);
      return;
    }
    if (e.key !== 'Tab') return;
    var drawer = flashcardEditDrawerRef.current;
    if (!drawer || typeof drawer.querySelectorAll !== 'function') return;
    var focusable = Array.prototype.slice.call(drawer.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(function (el) {
      return el && el.getAttribute('aria-hidden') !== 'true' && el.getClientRects().length > 0;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (document.activeElement === drawer) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  function handleOpenCurrentFlashcardInGlossary(e) {
    stopFlashcardControl(e);
    stopGlossarySavedAudio(true);
    setIsFlashcardEditDrawerOpen(false);
    setIsInteractiveFlashcards(false);
    if (!isEditingGlossary) setIsEditingGlossary(true);
    if (currentFlashcardItem.term && typeof setGlossarySearchTerm === 'function') setGlossarySearchTerm(currentFlashcardItem.term);
  }
  function closeInteractiveFlashcards(e) {
    handleCloseInteractiveFlashcards(e);
  }
  function handleCloseInteractiveFlashcards(e) {
    stopFlashcardControl(e);
    stopGlossarySavedAudio(true);
    setIsFlashcardEditDrawerOpen(false);
    flashcardNavigationRef.current += 1;
    clearTimeout(flashcardMoveTimerRef.current);
    if (typeof closeInteractiveFlashcardsProp === 'function') closeInteractiveFlashcardsProp();
  }
  function handleProgressDotClick(idx, e) {
    stopFlashcardControl(e);
    if (idx === flashcardIndex) return;
    moveToFlashcardIndex(idx);
  }
  function renderFlashcardProgressDots() {
    if (!flashcardDeck.length) return null;
    // One Tab stop for the dots (it was one per card: 50 cards, 50 Tabs); the
    // arrow keys, Home and End move between them. The current card's dot holds
    // the stop, or the first dot shown when the current card is not in the round.
    var inRound = function (item, idx) {
      return !flashcardRoundKeys || flashcardRoundKeys.includes(getFlashcardReviewKey(item, idx));
    };
    var tabStopIdx = flashcardDeck[flashcardIndex] && inRound(flashcardDeck[flashcardIndex], flashcardIndex) ? flashcardIndex : flashcardDeck.findIndex(inRound);
    var onDotsKeyDown = function (e) {
      var step = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1
      }[e.key];
      if (!step && e.key !== 'Home' && e.key !== 'End') return;
      var dots = Array.prototype.slice.call(e.currentTarget.querySelectorAll('button'));
      if (!dots.length) return;
      e.preventDefault();
      var rtl = (e.currentTarget.closest('[dir]') || document.documentElement).getAttribute('dir') === 'rtl';
      if (rtl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) step = -step;
      var at = dots.indexOf(document.activeElement);
      var next = e.key === 'Home' ? 0 : e.key === 'End' ? dots.length - 1 : Math.max(0, Math.min(dots.length - 1, (at < 0 ? 0 : at) + step));
      dots[next].focus();
    };
    return /*#__PURE__*/React.createElement("div", {
      role: "group",
      className: "mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 pr-1",
      "aria-label": t('common.progress'),
      onKeyDown: onDotsKeyDown
    }, flashcardDeck.map(function (item, idx) {
      var key = getFlashcardReviewKey(item, idx);
      if (flashcardRoundKeys && !flashcardRoundKeys.includes(key)) return null;
      var status = flashcardReviewState[key];
      var isCurrent = idx === flashcardIndex;
      var statusLabel = status === 'known' ? flashcardKnownLabel : status === 'learning' ? flashcardLearningLabel : t('common.progress');
      var fillClass = status === 'known' ? 'bg-emerald-400 text-emerald-950' : status === 'learning' ? 'bg-amber-400 text-amber-950' : 'bg-white/35 text-white';
      return /*#__PURE__*/React.createElement("button", {
        key: key + '-' + idx,
        type: "button",
        tabIndex: idx === tabStopIdx ? 0 : -1,
        onClick: function (e) {
          handleProgressDotClick(idx, e);
        },
        className: `h-9 w-9 rounded-full shrink-0 flex items-center justify-center transition-all motion-reduce:transition-none  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${isCurrent ? 'bg-white/15 ring-2 ring-white shadow-lg' : 'hover:bg-white/15'}`,
        "aria-current": isCurrent ? 'step' : undefined,
        "aria-label": `${glossaryProgressLabel} ${idx + 1}: ${item?.term || flashcardTermLabel}, ${statusLabel}`,
        title: `${item?.term || `${flashcardTermLabel} ${idx + 1}`} - ${statusLabel}`
      }, /*#__PURE__*/React.createElement("span", {
        className: `h-4 w-4 rounded-full flex items-center justify-center ${fillClass}`
      }, status === 'known' ? /*#__PURE__*/React.createElement(CheckCircle2, {
        size: 11,
        "aria-hidden": "true"
      }) : status === 'learning' ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 10,
        "aria-hidden": "true"
      }) : null));
    }));
  }
  function renderFlashcardActionBar() {
    var audioActive = isPlaying && playingContentId === 'flashcard-sequence';
    var nextDisabled = !flashcardRoundIndices.length;
    var focusClass = ' focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';
    return /*#__PURE__*/React.createElement("div", {
      className: "sticky bottom-0 z-40 -mx-4 mt-5 border-t border-white/10 bg-slate-950/90 backdrop-blur-xl px-3 py-3 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mx-auto max-w-4xl space-y-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": currentFlashcardConfidence === 'known',
      onClick: e => markFlashcardConfidence('known', e),
      className: `min-h-[44px] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border transition-all motion-reduce:transition-none ${focusClass} ${currentFlashcardConfidence === 'known' ? 'bg-emerald-300 text-emerald-950 border-emerald-100 shadow-lg' : 'bg-white/10 text-emerald-100 border-emerald-400/40 hover:bg-emerald-500/20'}`
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 16,
      "aria-hidden": "true"
    }), " ", flashcardKnownLabel), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": currentFlashcardConfidence === 'learning',
      onClick: e => markFlashcardConfidence('learning', e),
      className: `min-h-[44px] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border transition-all motion-reduce:transition-none ${focusClass} ${currentFlashcardConfidence === 'learning' ? 'bg-amber-400 text-slate-900 border-amber-200 shadow-lg' : 'bg-white/10 text-amber-100 border-amber-400/40 hover:bg-amber-500/20'}`
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 16,
      "aria-hidden": "true"
    }), " ", flashcardLearningLabel), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": isFlashcardFlipped,
      onClick: handleFlashcardFlipButton,
      className: `min-h-[44px] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all motion-reduce:transition-none ${focusClass}`
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 16,
      "aria-hidden": "true"
    }), " ", isFlashcardFlipped ? flashcardTermLabel : flashcardDefinitionLabel), isTeacherMode && flashcardMode === 'standard' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      ref: flashcardEditButtonRef,
      "aria-expanded": isFlashcardEditDrawerOpen,
      "aria-controls": "flashcard-edit-drawer",
      onClick: handleEditCurrentFlashcard,
      className: `min-h-[44px] inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-white transition-all motion-reduce:transition-none ${focusClass}`
    }, /*#__PURE__*/React.createElement(Pencil, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('glossary.edit_term'))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: goToPreviousReviewCard,
      disabled: flashcardRoundPosition <= 0,
      className: `min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors motion-reduce:transition-none disabled:opacity-30 disabled:cursor-not-allowed ${focusClass}`,
      "aria-label": t('common.prev_flashcard'),
      "data-help-key": "flashcard_prev"
    }, /*#__PURE__*/React.createElement(ArrowDown, {
      className: "rotate-90",
      size: 20,
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "hidden sm:inline"
    }, t('flashcards.previous'))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleCardAudioSequence,
      className: `col-span-2 order-first sm:col-span-1 sm:order-none justify-center min-h-[52px] px-6 sm:px-8 py-3 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.35)] hover:scale-105 motion-reduce:hover:scale-100 transition-all motion-reduce:transition-none flex items-center gap-3 font-bold text-base sm:text-lg ${focusClass} ${audioActive ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-300/30' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'}`,
      title: t('common.play_audio_sequence'),
      "aria-label": audioActive ? t('flashcards.stop') : t('flashcards.play_card'),
      "data-help-key": "flashcard_play_sequence"
    }, audioActive ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 24,
      className: "fill-current animate-pulse motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 24,
      className: "fill-current",
      "aria-hidden": "true"
    }), audioActive ? t('flashcards.stop') : t('flashcards.play_card')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: e => goToNextReviewCard(e),
      disabled: nextDisabled,
      className: `min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors motion-reduce:transition-none disabled:opacity-30 disabled:cursor-not-allowed ${focusClass}`,
      "aria-label": flashcardRoundLast ? flashcardText('flashcards.finish_round', 'Finish round') : t('common.next_flashcard'),
      "data-help-key": "flashcard_next"
    }, /*#__PURE__*/React.createElement("span", {
      className: flashcardRoundLast ? '' : 'hidden sm:inline'
    }, flashcardRoundLast ? flashcardText('flashcards.finish_round', 'Finish round') : t('flashcards.next')), " ", /*#__PURE__*/React.createElement(ArrowDown, {
      className: "-rotate-90",
      size: 20,
      "aria-hidden": "true"
    })))));
  }
  function renderFlashcardEditDrawer() {
    if (!isTeacherMode || !isFlashcardEditDrawerOpen || !currentFlashcardItem) return null;
    var fieldClass = 'w-full rounded-lg border border-slate-300 px-3 py-2  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-y';
    var drawerButtonFocus = ' focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-[130] pointer-events-none"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      tabIndex: -1,
      className: "absolute inset-0 bg-slate-950/40 pointer-events-auto",
      onClick: handleCloseFlashcardEditDrawer,
      "aria-label": t('common.close')
    }), /*#__PURE__*/React.createElement("aside", {
      id: "flashcard-edit-drawer",
      ref: flashcardEditDrawerRef,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "flashcard-edit-title",
      onKeyDown: handleFlashcardEditDrawerKeyDown,
      className: "absolute right-0 top-0 h-full w-full max-w-md bg-white text-slate-800 shadow-2xl pointer-events-auto p-5 overflow-y-auto animate-in slide-in-from-right-8 duration-200 motion-reduce:animate-none motion-reduce:transition-none",
      onClick: e => e.stopPropagation(),
      onMouseDown: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3 mb-5"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-xs font-black uppercase tracking-widest text-blue-700"
    }, t('common.edit')), /*#__PURE__*/React.createElement("h3", {
      id: "flashcard-edit-title",
      className: "text-xl font-black text-slate-900"
    }, t('common.edit'), " ", flashcardTermLabel.toLowerCase())), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleCloseFlashcardEditDrawer,
      className: `p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 ${drawerButtonFocus}`,
      "aria-label": t('common.close')
    }, /*#__PURE__*/React.createElement(X, {
      size: 20,
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-black uppercase tracking-widest text-slate-600 mb-1"
    }, flashcardTermLabel), /*#__PURE__*/React.createElement("textarea", {
      ref: flashcardEditFirstFieldRef,
      value: currentFlashcardItem.term || '',
      onChange: e => handleGlossaryChange(flashcardIndex, 'term', e.target.value),
      rows: getRows(currentFlashcardItem.term, 24),
      className: `${fieldClass} text-base font-bold`
    })), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-black uppercase tracking-widest text-slate-600 mb-1"
    }, flashcardDefinitionLabel), /*#__PURE__*/React.createElement("textarea", {
      value: currentFlashcardItem.def || '',
      onChange: e => handleGlossaryChange(flashcardIndex, 'def', e.target.value),
      rows: getRows(currentFlashcardItem.def, 42),
      className: `${fieldClass} text-sm leading-relaxed`
    })), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-black uppercase tracking-widest text-slate-600 mb-1"
    }, t('glossary.tier2') || t('glossary.label_tier2')), /*#__PURE__*/React.createElement("select", {
      value: currentFlashcardItem.tier || '',
      onChange: e => handleGlossaryChange(flashcardIndex, 'tier', e.target.value),
      className: "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 bg-white"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, t('glossary.edit_tier_placeholder')), /*#__PURE__*/React.createElement("option", {
      value: "Academic"
    }, t('glossary.edit_tier_academic')), /*#__PURE__*/React.createElement("option", {
      value: "Domain-Specific"
    }, t('glossary.edit_tier_domain')))), /*#__PURE__*/React.createElement("label", {
      className: "block"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-black uppercase tracking-widest text-slate-600 mb-1"
    }, t('glossary.etymology_label') || t('glossary.etymology_roots_label')), /*#__PURE__*/React.createElement("textarea", {
      value: currentFlashcardItem.etymology || '',
      onChange: e => handleGlossaryChange(flashcardIndex, 'etymology', e.target.value),
      rows: getRows(currentFlashcardItem.etymology, 42),
      className: `${fieldClass} text-sm leading-relaxed`
    }))), /*#__PURE__*/React.createElement("div", {
      className: "mt-6 flex flex-col sm:flex-row gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleCloseFlashcardEditDrawer,
      className: `min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 text-white px-4 py-2.5 text-sm font-bold hover:bg-blue-800 ${drawerButtonFocus}`
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('common.done')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: handleOpenCurrentFlashcardInGlossary,
      className: `min-h-[44px] flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 text-slate-800 px-4 py-2.5 text-sm font-bold hover:bg-slate-200 ${drawerButtonFocus}`
    }, /*#__PURE__*/React.createElement(Search, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('glossary.title')))));
  }
  React.useEffect(function () {
    if (wordSearchPathTimerRef.current) clearTimeout(wordSearchPathTimerRef.current);
    setWordSearchStart(null);
    setWordSearchActive({
      r: 0,
      c: 0
    });
    setWordSearchPath([]);
    setWordSearchFoundWords(new Set());
    setWordSearchAnnouncement('');
    return function () {
      if (wordSearchPathTimerRef.current) clearTimeout(wordSearchPathTimerRef.current);
    };
  }, [gameData]);
  function wordSearchCellKey(r, c) {
    return String(r) + '-' + String(c);
  }
  function wordSearchPathBetween(start, end) {
    if (!start || !end || start.r !== end.r && start.c !== end.c) return [];
    var rowStep = start.r === end.r ? 0 : end.r > start.r ? 1 : -1;
    var colStep = start.c === end.c ? 0 : end.c > start.c ? 1 : -1;
    var length = Math.max(Math.abs(end.r - start.r), Math.abs(end.c - start.c));
    var path = [];
    for (var i = 0; i <= length; i += 1) path.push(wordSearchCellKey(start.r + rowStep * i, start.c + colStep * i));
    return path;
  }
  function wordSearchPathsMatch(first, second) {
    if (!Array.isArray(first) || first.length !== second.length) return false;
    var forward = first.every(function (key, index) {
      return key === second[index];
    });
    var reverse = first.every(function (key, index) {
      return key === second[second.length - index - 1];
    });
    return forward || reverse;
  }
  function isWordSearchFoundCell(key) {
    var found = false;
    wordSearchFoundWords.forEach(function (word) {
      if (gameData && gameData.wordLocations && Array.isArray(gameData.wordLocations[word]) && gameData.wordLocations[word].includes(key)) found = true;
    });
    return found;
  }
  function finishWordSearchPath(start, end) {
    var path = wordSearchPathBetween(start, end);
    if (!path.length) {
      setWordSearchStart(end);
      setWordSearchPath([wordSearchCellKey(end.r, end.c)]);
      setWordSearchAnnouncement(glossaryText('glossary.word_search_pick_end', 'Choose an ending letter in the same row or column. A new starting letter is selected.'));
      return;
    }
    var entries = Object.entries(gameData && gameData.wordLocations ? gameData.wordLocations : {});
    var match = entries.find(function (entry) {
      return wordSearchPathsMatch(entry[1], path);
    });
    setWordSearchPath(path);
    setWordSearchStart(null);
    if (match && !wordSearchFoundWords.has(match[0])) {
      var nextFound = new Set(wordSearchFoundWords);
      nextFound.add(match[0]);
      setWordSearchFoundWords(nextFound);
      var total = Array.isArray(gameData.words) ? gameData.words.length : entries.length;
      var complete = total > 0 && nextFound.size === total;
      setWordSearchAnnouncement(complete ? glossaryText('glossary.word_search_announce.complete', 'Word search complete. You found all {total} words.', {
        total: total
      }) : glossaryText('glossary.word_search_announce.found', 'Found {word}. {count} of {total} words.', {
        word: match[0],
        count: nextFound.size,
        total: total
      }));
      if (typeof playSound === 'function') playSound('correct');
      if (typeof addToast === 'function') addToast(t('glossary.word_search_notifications.found', {
        word: match[0]
      }), 'success');
      if (typeof handleScoreUpdate === 'function') handleScoreUpdate(5, 'Word Search Find', generatedContent?.id);
      if (complete && typeof handleGameCompletion === 'function') handleGameCompletion('wordSearch', {
        score: nextFound.size * 5,
        correctCount: nextFound.size,
        totalItems: total,
        isPerfect: true
      });
    } else if (match) {
      setWordSearchAnnouncement(glossaryText('glossary.word_search_already_found', '{word} was already found.', {
        word: match[0]
      }));
    } else {
      setWordSearchAnnouncement(glossaryText('glossary.word_search_not_a_word', 'That path is not one of the listed words. Try another start and end.'));
      if (typeof playSound === 'function') playSound('incorrect');
    }
    if (wordSearchPathTimerRef.current) clearTimeout(wordSearchPathTimerRef.current);
    wordSearchPathTimerRef.current = setTimeout(function () {
      setWordSearchPath([]);
    }, 650);
  }
  function submitWordSearchCell(r, c) {
    if (wordSearchPathTimerRef.current) clearTimeout(wordSearchPathTimerRef.current);
    var next = {
      r: r,
      c: c
    };
    setWordSearchActive(next);
    if (!wordSearchStart) {
      setWordSearchStart(next);
      setWordSearchPath([wordSearchCellKey(r, c)]);
      setWordSearchAnnouncement(glossaryText('glossary.word_search_start_selected', 'Starting letter selected at row {row}, column {col}. Choose the last letter.', {
        row: r + 1,
        col: c + 1
      }));
      return;
    }
    if (wordSearchStart.r === r && wordSearchStart.c === c) {
      setWordSearchStart(null);
      setWordSearchPath([]);
      setWordSearchAnnouncement(glossaryText('glossary.word_search_announce.cancelled', 'Selection cancelled.'));
      return;
    }
    finishWordSearchPath(wordSearchStart, next);
  }
  function handleWordSearchGridKeyDown(event) {
    if (!gameData || !Array.isArray(gameData.grid) || !gameData.grid.length) return;
    var maxRow = gameData.grid.length - 1;
    var maxCol = gameData.grid[0].length - 1;
    var next = {
      r: wordSearchActive.r,
      c: wordSearchActive.c
    };
    if (event.key === 'ArrowRight') next.c = Math.max(0, Math.min(maxCol, next.c + (gameData.isRtl ? -1 : 1)));else if (event.key === 'ArrowLeft') next.c = Math.max(0, Math.min(maxCol, next.c + (gameData.isRtl ? 1 : -1)));else if (event.key === 'ArrowDown') next.r = Math.min(maxRow, next.r + 1);else if (event.key === 'ArrowUp') next.r = Math.max(0, next.r - 1);else if (event.key === 'Home') next.c = 0;else if (event.key === 'End') next.c = maxCol;else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      submitWordSearchCell(wordSearchActive.r, wordSearchActive.c);
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setWordSearchStart(null);
      setWordSearchPath([]);
      setWordSearchAnnouncement(glossaryText('glossary.word_search_announce.cancelled', 'Selection cancelled.'));
      return;
    } else return;
    event.preventDefault();
    setWordSearchActive(next);
    setWordSearchAnnouncement(glossaryText('glossary.word_search_position', 'Row {row}, column {col}: {letter}', {
      row: next.r + 1,
      col: next.c + 1,
      letter: gameData.grid[next.r][next.c]
    }));
  }
  function handleToggleFlashcardQuizMode() {
    // Switching between flip and quiz keeps the student's ratings, card and
    // focus. It used to restart the round: every rating was wiped and focus
    // jumped to Close, so pressing Enter again closed the deck.
    flashcardNavigationRef.current += 1;
    clearTimeout(flashcardMoveTimerRef.current);
    setFlashcardSummary(false);
    setQuizSelectedOption(null);
    setIsFlashcardQuizMode(!isFlashcardQuizMode);
    setFlashcardScore(0);
    setIsFlashcardFlipped(false);
    setFlashcardOptions([]);
    setFlashcardFeedback(null);
  }
  // Search feedback and selection describe the same data shown by the host.
  // Keep the visible result count immediate, but wait for typing to settle
  // before announcing it. Selection always covers the complete glossary.
  var glossarySearchInputRef = React.useRef(null);
  var glossaryAllWords = Array.isArray(generatedContent?.data) ? generatedContent.data : [];
  var glossaryResultCount = Array.isArray(filteredGlossaryData) ? filteredGlossaryData.length : 0;
  var glossaryTotalCount = glossaryAllWords.length;
  var glossarySelectedCount = glossaryAllWords.filter(function (item) {
    return item && item.isSelected !== false;
  }).length;
  var glossaryAllSelected = glossaryTotalCount > 0 && glossarySelectedCount === glossaryTotalCount;
  var glossarySomeSelected = glossarySelectedCount > 0 && !glossaryAllSelected;
  var glossaryHasFilters = !!String(glossarySearchTerm || '').trim() || glossaryFilter === 'academic' || glossaryFilter === 'domain';
  var glossaryResultText = glossaryText('glossary.result_count', '{shown} of {total} words', {
    shown: glossaryResultCount,
    total: glossaryTotalCount
  });
  var [glossarySearchAnnouncement, setGlossarySearchAnnouncement] = React.useState('');
  React.useEffect(function () {
    var timer = setTimeout(function () {
      setGlossarySearchAnnouncement(glossaryResultText);
    }, 300);
    return function () {
      clearTimeout(timer);
    };
  }, [glossarySearchTerm, glossaryFilter, glossaryResultText, activityResourceKey]);
  function focusGlossarySearch() {
    if (glossarySearchInputRef.current) glossarySearchInputRef.current.focus({
      preventScroll: true
    });
  }
  function clearGlossarySearch() {
    if (typeof setGlossarySearchTerm === 'function') setGlossarySearchTerm('');
    focusGlossarySearch();
  }
  function clearGlossaryFilters() {
    if (typeof handleSetGlossaryFilterToAll === 'function') handleSetGlossaryFilterToAll();
    if (typeof setGlossarySearchTerm === 'function') setGlossarySearchTerm('');
    focusGlossarySearch();
  }
  // ── G6: the phantom "no words match your search" ────────────────────────
  // The old empty state claimed "No terms match this search or vocabulary
  // filter" whenever the table came out empty, including when no search had
  // ever been typed. Three separate things can empty this table and only one
  // of them is a search:
  //
  //   1. A sticky vocabulary filter. `glossaryFilter` lives in the host's
  //      glossary reducer (AlloFlowANTI.txt:8627). It used to survive a tool
  //      switch, a history load and a fresh generation, because `GLOSS_RESET`
  //      had no call site anywhere in the monolith. FIXED in wave 2: the host
  //      now dispatches `GLOSS_RESET` and clears `glossarySearchTerm` when
  //      `generatedContent.id` changes, so causes 1 and 3 can no longer carry
  //      across from a previous glossary. The branches below still matter,
  //      because a filter or search set on THIS glossary can still empty it.
  //   2. A glossary whose entries carry no tier at all. The target-terms
  //      generator at AlloFlowANTI.txt:53891 writes
  //      `tier: <valid> ? <valid> : undefined`, so with a tier filter left on
  //      from a previous glossary, every row is excluded and no search is
  //      involved.
  //   3. A search term the user never typed.
  //      `handleOpenCurrentFlashcardInGlossary` (this file) writes the
  //      flashcard's term into `glossarySearchTerm` when a student opens a
  //      card in the glossary.
  //
  // This version names only the constraints actually in effect, so the word
  // "search" cannot appear unless a non-empty query really is present, and
  // each active constraint gets its own clear action.
  function glossaryEmptyStateInfo() {
    var query = typeof glossarySearchTerm === 'string' ? glossarySearchTerm.trim() : '';
    var allTerms = Array.isArray(generatedContent && generatedContent.data) ? generatedContent.data : [];
    var tierActive = glossaryFilter === 'academic' || glossaryFilter === 'domain';
    var tierLabel = glossaryFilter === 'academic' ? t('glossary.tier2') || 'Academic vocabulary' : t('glossary.tier3') || 'Subject vocabulary';
    return {
      hasQuery: query.length > 0,
      query: query,
      tierActive: tierActive,
      tierLabel: tierLabel,
      // Every entry missing a tier is a data shape problem, not something the
      // teacher did. Saying "no terms match your filter" would send them
      // hunting for a filter they set correctly.
      tierless: tierActive && allTerms.length > 0 && allTerms.every(function (item) {
        return !item || !item.tier;
      })
    };
  }
  function renderGlossaryEmptyState() {
    var info = glossaryEmptyStateInfo();
    // bg-blue-700 is a base utility, so the dark remap already sets it
    // !important and the hover shade is safe in every theme.
    var clearButton = 'min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';
    if (info.tierless) {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-bold text-slate-800"
      }, t('glossary.empty_no_tiers') || 'These terms are not sorted into academic and subject vocabulary yet.'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: handleSetGlossaryFilterToAll,
        className: clearButton
      }, t('glossary.empty_show_all') || 'Show all terms'));
    }
    if (info.hasQuery && info.tierActive) {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-bold text-slate-800"
      }, t('glossary.empty_search_and_filter', {
        query: info.query,
        filter: info.tierLabel
      }) || 'No terms match "' + info.query + '" inside ' + info.tierLabel + '.'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: clearGlossaryFilters,
        className: clearButton
      }, t('glossary.empty_clear_both') || 'Clear the search and show all terms'));
    }
    if (info.hasQuery) {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-bold text-slate-800"
      }, t('glossary.empty_search_only', {
        query: info.query
      }) || 'No terms match "' + info.query + '".'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: function () {
          if (typeof setGlossarySearchTerm === 'function') setGlossarySearchTerm('');
        },
        className: clearButton
      }, t('glossary.empty_clear_search') || 'Clear the search'));
    }
    if (info.tierActive) {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
        className: "text-sm font-bold text-slate-800"
      }, t('glossary.empty_filter_only', {
        filter: info.tierLabel
      }) || 'No terms in this glossary are ' + info.tierLabel + '.'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        onClick: handleSetGlossaryFilterToAll,
        className: clearButton
      }, t('glossary.empty_show_all') || 'Show all terms'));
    }
    // Nothing is filtering and the list is still empty: a data problem, and
    // there is no filter to offer to clear.
    return /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-medium text-slate-700"
    }, t('glossary.no_terms'));
  }
  function toggleGlossaryToolPanel(panel) {
    setGlossaryToolsOpen(function (current) {
      return Object.assign({}, current, {
        [panel]: !current[panel]
      });
    });
  }
  // Score against this glossary's own unit/source analysis, not the newest one in the project.
  function relatedGlossarySourceText() {
    var list = Array.isArray(history) ? history : [];
    var find = window.AlloModules?.GlossaryHelpers?.findRelatedHistoryItem;
    var analysis = typeof find === 'function' ? find(list, 'analysis', generatedContent) : list.slice().reverse().find(function (item) {
      return item && item.type === 'analysis';
    });
    return analysis?.data?.originalText || inputText || '';
  }
  function runCurrentGlossaryHealthCheck() {
    if (generatedContent?.type === 'glossary' && Array.isArray(generatedContent?.data)) {
      var sourceText = relatedGlossarySourceText();
      runGlossaryHealthCheck(generatedContent.data, sourceText);
    } else if (typeof addToast === 'function') {
      addToast(t('common.generate_glossary_first') || 'Generate a glossary first', 'info');
    }
  }
  function stopGlossarySavedAudio(clearPlaybackState) {
    glossarySavedAudioSessionRef.current += 1;
    if (glossarySavedAudioRef.current) {
      glossarySavedAudioRef.current.pause();
      try {
        glossarySavedAudioRef.current.currentTime = 0;
      } catch (_) {}
      glossarySavedAudioRef.current = null;
    }
    if (clearPlaybackState) {
      if (typeof setIsGeneratingAudio === 'function') setIsGeneratingAudio(false);
      if (typeof setPlayingContentId === 'function') setPlayingContentId(null);
    }
  }
  function handleUncachedGlossarySpeak(text, contentId, language) {
    stopGlossarySavedAudio(false);
    if (typeof handleSpeak === 'function') {
      if (language) handleSpeak(text, contentId, 0, false, language);else handleSpeak(text, contentId);
    }
  }
  function downloadGlossaryFieldAudio(item, field, text, filename, contentId, language) {
    if (typeof handleDownloadAudio !== 'function') return;
    if (glossaryHasBaseMetadata(generatedContent, item)) handleDownloadAudio(text, filename, contentId, language || glossaryFieldLanguage(generatedContent, item, field));else handleDownloadAudio(text, filename, contentId);
  }
  // Keep definition playback, downloads, and prepared audio on the same text.
  function formatGlossaryDefinitionSpeech(termValue, definitionValue) {
    const term = String(termValue == null ? '' : termValue).replace(/\s+/g, ' ').trim();
    const definition = String(definitionValue == null ? '' : definitionValue).replace(/\s+/g, ' ').trim();
    if (!term || !definition) return definition;
    const prefix = definition.slice(0, term.length).toLocaleLowerCase();
    if (prefix === term.toLocaleLowerCase() && (definition.length === term.length || /^[\s:：,.!?…;—–-]/.test(definition.slice(term.length)))) return definition;
    return term + ': ' + definition;
  }
  function glossarySpeechText(item, field, text) {
    return field === 'definition' ? formatGlossaryDefinitionSpeech(item && (item.term || item.word), text) : field === 'translation' ? glossaryTranslationText(text) : String(text == null ? '' : text).trim();
  }
  async function handleGlossarySpeak(item, field, spokenText, contentId, language) {
    var text = glossarySpeechText(item, field, spokenText);
    if (!text) return;
    var speechLanguage = language || glossaryFieldLanguage(generatedContent, item, field);
    var speakLive = function () {
      if (typeof handleSpeak !== 'function') return;
      if (glossaryHasBaseMetadata(generatedContent, item)) handleSpeak(text, contentId, 0, false, speechLanguage);else handleSpeak(text, contentId);
    };
    if (playingContentId === contentId) {
      // Invalidate pending saved-audio lookups as well as any active playback.
      stopGlossarySavedAudio(true);
      if (typeof stopPlayback === 'function') stopPlayback();
      return;
    }
    stopGlossarySavedAudio(false);
    if (typeof stopPlayback === 'function') stopPlayback();
    var resolve = typeof window !== 'undefined' ? window.__alloResolveGlossaryAudio : null;
    if (typeof resolve !== 'function') {
      speakLive();
      return;
    }
    var sessionId = glossarySavedAudioSessionRef.current;
    var audioOwner = glossaryAudioOwnerRef.current;
    var liveFallbackStarted = false;
    if (typeof setPlayingContentId === 'function') setPlayingContentId(contentId);
    if (typeof setIsGeneratingAudio === 'function') setIsGeneratingAudio(true);
    function resetResolvedPlayback() {
      if (glossarySavedAudioSessionRef.current !== sessionId || !isGlossaryAudioCurrent(audioOwner)) return;
      glossarySavedAudioRef.current = null;
      if (typeof setIsGeneratingAudio === 'function') setIsGeneratingAudio(false);
      if (typeof setPlayingContentId === 'function') setPlayingContentId(null);
    }
    function fallbackToLiveSpeech() {
      if (liveFallbackStarted || glossarySavedAudioSessionRef.current !== sessionId || !isGlossaryAudioCurrent(audioOwner)) return;
      liveFallbackStarted = true;
      if (glossarySavedAudioRef.current) {
        try {
          glossarySavedAudioRef.current.pause();
        } catch (_) {}
      }
      resetResolvedPlayback();
      speakLive();
    }
    try {
      var resolved = await resolve({
        entryId: item && (item.entryId || item.id) || null,
        field: field,
        language: speechLanguage,
        spokenText: text
      }, {
        reason: 'glossary-playback'
      });
      if (glossarySavedAudioSessionRef.current !== sessionId || !isGlossaryAudioCurrent(audioOwner)) return;
      var url = typeof resolved === 'string' ? resolved : resolved && (resolved.audioUrl || resolved.url || resolved.src);
      if (!url) {
        fallbackToLiveSpeech();
        return;
      }
      var audio = new Audio(url);
      var playbackSettled = false;
      glossarySavedAudioRef.current = audio;
      audio.onended = function () {
        playbackSettled = true;
        resetResolvedPlayback();
      };
      audio.onerror = function () {
        if (playbackSettled) return;
        playbackSettled = true;
        fallbackToLiveSpeech();
      };
      if (typeof setIsGeneratingAudio === 'function') setIsGeneratingAudio(false);
      var playPromise = audio.play();
      if (playPromise !== undefined) await playPromise;
    } catch (_) {
      fallbackToLiveSpeech();
    }
  }
  function makeGlossaryAudioRequest(item, field, spokenText, language) {
    return {
      entryId: item && (item.entryId || item.glossaryEntryId || item.id) || null,
      field: field,
      language: language || glossaryFieldLanguage(generatedContent, item, field),
      spokenText: glossarySpeechText(item, field, spokenText)
    };
  }
  function inspectGlossaryAudio(item, field, spokenText, language) {
    var inspect = typeof window !== 'undefined' ? window.__alloInspectGlossaryAudio : null;
    if (!String(spokenText == null ? '' : spokenText).trim()) return {
      status: 'empty',
      source: null
    };
    if (typeof inspect !== 'function') return {
      status: 'unavailable',
      source: null
    };
    try {
      return inspect(makeGlossaryAudioRequest(item, field, spokenText, language), {
        reason: 'glossary-edit-review'
      }) || {
        status: 'unavailable',
        source: null
      };
    } catch (_) {
      return {
        status: 'unavailable',
        source: null
      };
    }
  }
  function cancelGlossaryClipAudio(item, field, language) {
    var controller = glossaryAudioEditControllerRef.current;
    if (!controller) return;
    var clip = controller.glossaryClipInfo || {};
    controller.abort();
    glossaryAudioEditControllerRef.current = null;
    glossaryAudioControllersRef.current.delete(controller);
    setGlossaryAudioEditState({
      busyKey: '',
      message: glossaryText('glossary.audio_clip_stopped', 'Audio preparation stopped for {field}: {term}.', {
        field: audioFieldLabel(field || clip.field, language || clip.language),
        term: item?.term || clip.term || ''
      })
    });
  }
  async function handleRegenerateGlossaryAudio(item, field, spokenText, contentId, language) {
    var text = String(spokenText == null ? '' : spokenText).trim();
    if (!text || glossaryAudioEditControllerRef.current || glossaryAudioPrepControllerRef.current) return;
    var regenerate = typeof window !== 'undefined' ? window.__alloRegenerateGlossaryAudio : null;
    if (typeof regenerate !== 'function') {
      var unavailableMessage = glossaryText('glossary.audio_preparation_unavailable', 'Audio preparation is unavailable. Reload AlloFlow and try again.');
      setGlossaryAudioEditState({
        busyKey: '',
        message: unavailableMessage
      });
      if (typeof addToast === 'function') addToast(unavailableMessage, 'info');
      return;
    }
    var audioOwner = glossaryAudioOwnerRef.current;
    var controller = new AbortController();
    controller.glossaryClipInfo = {
      term: item?.term || '',
      field: field,
      language: language
    };
    glossaryAudioEditControllerRef.current = controller;
    glossaryAudioControllersRef.current.add(controller);
    var request = makeGlossaryAudioRequest(item, field, text, language);
    var messageParams = {
      field: audioFieldLabel(field, language),
      term: item?.term || ''
    };
    function current() {
      return !controller.signal.aborted && glossaryAudioEditControllerRef.current === controller && isGlossaryAudioCurrent(audioOwner);
    }
    stopGlossarySavedAudio(true);
    if (typeof stopPlayback === 'function') stopPlayback();
    setGlossaryAudioEditState({
      busyKey: contentId,
      message: glossaryText('glossary.audio_clip_preparing', 'Preparing {field} audio for {term}…', messageParams)
    });
    try {
      var url = await regenerate(request, {
        reason: 'glossary-edit-regenerate',
        signal: controller.signal
      });
      if (!current()) return;
      if (!url) throw new Error('No audio was returned');
      var successMessage = glossaryText('glossary.audio_clip_ready', 'Audio ready for {field}: {term}.', messageParams);
      setGlossaryAudioEditState({
        busyKey: '',
        message: successMessage
      });
      if (typeof addToast === 'function') addToast(successMessage, 'success');
    } catch (_) {
      if (!current()) return;
      var failureMessage = glossaryText('glossary.audio_clip_failed', 'Audio could not be prepared for {field}: {term}. Try again.', messageParams);
      setGlossaryAudioEditState({
        busyKey: '',
        message: failureMessage
      });
      if (typeof addToast === 'function') addToast(failureMessage, 'error');
    } finally {
      glossaryAudioControllersRef.current.delete(controller);
      if (glossaryAudioEditControllerRef.current === controller) glossaryAudioEditControllerRef.current = null;
    }
  }
  function renderGlossaryEditAudioTools(item, field, spokenText, contentId, language) {
    var inspection = inspectGlossaryAudio(item, field, spokenText, language);
    var status = inspection && inspection.status || 'missing';
    var isReady = status === 'ready';
    var needsRebuild = status === 'stale' || status === 'corrupt';
    var isBusy = glossaryAudioEditState.busyKey === contentId;
    var anyAudioEditBusy = !!glossaryAudioEditState.busyKey;
    var isThisPlaying = playingContentId === contentId;
    var fieldLabel = audioFieldLabel(field, language);
    var statusLabel = isBusy ? glossaryPreparingAudioLabel : isReady ? glossaryText('glossary.audio_ready', 'Ready') : status === 'corrupt' ? glossaryText('glossary.audio_unavailable', 'Audio unavailable') : needsRebuild ? glossaryText('glossary.audio_needs_update', 'Needs update') : status === 'empty' ? glossaryText('glossary.audio_no_text', 'No text') : status === 'unavailable' ? glossaryText('glossary.audio_unavailable', 'Audio unavailable') : glossaryText('glossary.audio_not_prepared', 'Not prepared');
    var actionLabel = isBusy ? glossaryText('common.cancel', 'Cancel') : isReady || needsRebuild ? audioRegenerateLabel : audioGenerateLabel;
    var actionName = isBusy ? glossaryText('glossary.audio_cancel_clip', 'Cancel preparing {field} audio for {term}', {
      field: fieldLabel,
      term: item?.term || ''
    }) : actionLabel + ': ' + fieldLabel + ' ' + (item?.term || '');
    var statusClass = isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : needsRebuild ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-300 bg-slate-50 text-slate-700';
    var actionClass = 'min-h-11 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50';
    return /*#__PURE__*/React.createElement("div", {
      role: "group",
      "aria-label": audioReviewLabel + ': ' + fieldLabel + ' ' + (item?.term || ''),
      className: "mt-1 flex flex-wrap items-center justify-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      "data-glossary-audio-status": true,
      className: 'inline-flex min-h-7 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ' + statusClass
    }, isBusy ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : isReady ? /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 10,
      "aria-hidden": "true"
    }) : needsRebuild || status === 'unavailable' ? /*#__PURE__*/React.createElement(AlertCircle, {
      size: 10,
      "aria-hidden": "true"
    }) : null, statusLabel), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleGlossarySpeak(item, field, spokenText, contentId, language),
      disabled: !isThisPlaying && (!isReady || anyAudioEditBusy || glossaryAudioPrep.busy || isGeneratingAudio),
      "aria-label": (isThisPlaying ? audioStopLabel : audioReviewLabel) + ': ' + fieldLabel + ' ' + (item?.term || ''),
      title: (isThisPlaying ? audioStopLabel : audioReviewLabel) + ': ' + fieldLabel + ' ' + (item?.term || ''),
      className: actionClass + ' border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50'
    }, isThisPlaying ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 12,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 12,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, isThisPlaying ? audioStopLabel : audioReviewLabel)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => isBusy ? cancelGlossaryClipAudio(item, field, language) : handleRegenerateGlossaryAudio(item, field, spokenText, contentId, language),
      disabled: !isBusy && (!String(spokenText == null ? '' : spokenText).trim() || anyAudioEditBusy || glossaryAudioPrep.busy || isGeneratingAudio),
      "aria-busy": isBusy,
      "aria-label": actionName,
      title: actionName,
      className: actionClass + ' border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
    }, isBusy ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 12,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 12,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, actionLabel)));
  }
  function stopPreparingGlossaryAudio() {
    var controller = glossaryAudioPrepControllerRef.current;
    if (!controller) return;
    controller.abort();
    glossaryAudioPrepControllerRef.current = null;
    glossaryAudioControllersRef.current.delete(controller);
    setGlossaryAudioPrep(prev => ({
      ...prev,
      busy: false,
      message: glossaryText('glossary.audio_preparation_stopped', 'Audio preparation stopped. Completed clips are kept.')
    }));
  }
  async function handlePrepareGlossaryAudio() {
    if (glossaryAudioPrepControllerRef.current || glossaryAudioEditControllerRef.current || !generatedContent?.data?.length) return;
    var includeDefinitions = glossaryAudioScope !== 'terms';
    var preparedLanguages = glossaryAudioScope === 'all' ? glossaryLanguages.slice() : [];
    var prepare = typeof window !== 'undefined' ? window.__alloPrepareGlossaryAudio : null;
    if (typeof prepare !== 'function') {
      var unavailableMessage = glossaryText('glossary.audio_preparation_unavailable', 'Audio preparation is unavailable. Reload AlloFlow and try again.');
      setGlossaryAudioPrep({
        busy: false,
        done: 0,
        total: 0,
        message: unavailableMessage
      });
      if (typeof addToast === 'function') addToast(unavailableMessage, 'info');
      return;
    }
    var audioOwner = glossaryAudioOwnerRef.current;
    var controller = new AbortController();
    glossaryAudioPrepControllerRef.current = controller;
    glossaryAudioControllersRef.current.add(controller);
    stopGlossarySavedAudio(true);
    if (typeof stopPlayback === 'function') stopPlayback();
    setGlossaryAudioPrep({
      busy: true,
      done: 0,
      total: 0,
      message: glossaryPreparingAudioLabel
    });
    function current() {
      return !controller.signal.aborted && glossaryAudioPrepControllerRef.current === controller && isGlossaryAudioCurrent(audioOwner);
    }
    function updateGlossaryAudioProgress(doneOrProgress, total, segment) {
      if (!current()) return;
      var progress = doneOrProgress && typeof doneOrProgress === 'object' ? doneOrProgress : {
        done: doneOrProgress,
        total: total,
        segment: segment
      };
      var count = Math.max(0, Number(progress.total ?? progress.count ?? total ?? 0) || 0);
      var done = Math.max(0, Number(progress.done ?? progress.prepared ?? progress.ready ?? 0) || 0);
      if (count > 0) done = Math.min(done, count);
      setGlossaryAudioPrep({
        busy: true,
        done: Number.isFinite(done) ? done : 0,
        total: Number.isFinite(count) ? count : 0,
        message: count > 0 ? glossaryPreparingAudioLabel + ' ' + done + '/' + count : glossaryPreparingAudioLabel
      });
    }
    try {
      var result = await prepare({
        includeTerms: true,
        includeDefinitions: includeDefinitions,
        languages: preparedLanguages
      }, updateGlossaryAudioProgress, {
        source: 'glossary-teacher-tools',
        signal: controller.signal
      });
      if (!current()) return;
      if (!result || typeof result !== 'object') throw new Error('No preparation result');
      function count(value) {
        var number = Number(value);
        return Number.isFinite(number) ? Math.max(0, number) : 0;
      }
      var total = count(result.total ?? result.ready ?? result.prepared);
      var ready = Math.min(total, count(result.ready ?? result.prepared));
      var partial = result.ok === false || count(result.failed) > 0 || count(result.remaining) > 0 || ready < total;
      var finalMessage = result.cancelled ? glossaryText('glossary.audio_preparation_stopped', 'Audio preparation stopped. Completed clips are kept.') : partial ? glossaryText('glossary.audio_preparation_partial', '{ready} of {total} audio clips ready. Some clips could not be prepared. Try again to finish.', {
        ready: ready,
        total: total
      }) : total > 0 ? glossaryText('glossary.audio_preparation_ready', '{ready} of {total} audio clips ready. Saved with this glossary.', {
        ready: ready,
        total: total
      }) : glossaryText('glossary.audio_preparation_empty', 'No audio clips to prepare for this selection.');
      setGlossaryAudioPrep({
        busy: false,
        done: ready,
        total: total,
        message: finalMessage
      });
      if (typeof addToast === 'function') addToast(finalMessage, result.cancelled || partial || !total ? 'info' : 'success');
    } catch (error) {
      if (!current()) return;
      var failureMessage = glossaryText('glossary.audio_preparation_failed', 'Audio preparation could not finish. Completed clips are kept. Try again.');
      setGlossaryAudioPrep(prev => ({
        ...prev,
        busy: false,
        message: failureMessage
      }));
      if (typeof addToast === 'function') addToast(failureMessage, 'error');
    } finally {
      glossaryAudioControllersRef.current.delete(controller);
      if (glossaryAudioPrepControllerRef.current === controller) glossaryAudioPrepControllerRef.current = null;
    }
  }
  function renderGlossaryAudioReviewPanel() {
    if (!isTeacherMode || !isEditingGlossary || !Array.isArray(generatedContent?.data) || generatedContent.data.length === 0) return null;
    var reviewWords = Array.isArray(filteredGlossaryData) ? filteredGlossaryData : [];
    return /*#__PURE__*/React.createElement("div", {
      id: "glossary-edit-audio-review",
      role: "region",
      "aria-labelledby": "glossary-edit-audio-review-title",
      className: "rounded-xl border border-violet-200 bg-white p-3 shadow-sm",
      "data-help-key": "glossary_audio_review"
    }, /*#__PURE__*/React.createElement("h3", {
      id: "glossary-edit-audio-review-title"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-glossary-audio-review-toggle": true,
      "aria-expanded": isGlossaryAudioReviewOpen,
      "aria-controls": "glossary-edit-audio-review-content",
      "aria-describedby": "glossary-edit-audio-review-help",
      onClick: () => setIsGlossaryAudioReviewOpen(open => !open),
      className: "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-start text-sm font-black text-violet-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
    }, /*#__PURE__*/React.createElement("span", null, glossaryText('glossary.audio_review_title', 'Review and prepare audio')), /*#__PURE__*/React.createElement(ChevronDown, {
      size: 16,
      "aria-hidden": "true",
      className: 'shrink-0 ' + (isGlossaryAudioReviewOpen ? 'rotate-180' : '')
    }))), /*#__PURE__*/React.createElement("p", {
      id: "glossary-edit-audio-review-help",
      className: "mt-0.5 text-xs text-slate-600"
    }, glossaryText('glossary.audio_review_help', 'Review audio for terms, definitions, and translations. Search and filters apply to this list.')), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "aria-live": "polite",
      className: glossaryAudioEditState.message ? 'mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800' : 'sr-only'
    }, glossaryAudioEditState.message), glossaryAudioEditState.busyKey && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: e => {
        cancelGlossaryClipAudio();
        e.currentTarget.closest('#glossary-edit-audio-review')?.querySelector('[data-glossary-audio-review-toggle]')?.focus();
      },
      className: "mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement(StopCircle, {
      size: 14,
      "aria-hidden": "true"
    }), glossaryText('glossary.audio_cancel_preparation', 'Cancel audio preparation')), /*#__PURE__*/React.createElement("div", {
      id: "glossary-edit-audio-review-content",
      hidden: !isGlossaryAudioReviewOpen
    }, isGlossaryAudioReviewOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "my-3 text-xs font-semibold text-slate-700"
    }, glossaryText('glossary.audio_review_count', 'Showing {shown} of {total} words.', {
      shown: reviewWords.length,
      total: generatedContent.data.length
    })), reviewWords.length === 0 && /*#__PURE__*/React.createElement("p", {
      className: "rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
    }, glossaryText('glossary.audio_review_no_matches', 'No words match the current search and filters. Clear or adjust them to review audio.')), /*#__PURE__*/React.createElement("div", {
      className: "max-h-[34rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar"
    }, reviewWords.map(function (item) {
      if (!item || typeof item !== 'object') return null;
      var idx = item._originalIdx;
      return /*#__PURE__*/React.createElement("article", {
        key: 'audio-review-' + getGlossaryEntryKey(item, idx),
        className: "rounded-xl border border-slate-200 bg-slate-50/70 p-3"
      }, /*#__PURE__*/React.createElement("h4", {
        className: "mb-2 text-sm font-black text-slate-900"
      }, item.term || t('common.untitled')), /*#__PURE__*/React.createElement("div", {
        className: "grid gap-2 lg:grid-cols-2"
      }, /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg border border-slate-200 bg-white p-2"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] font-black uppercase tracking-wide text-slate-500"
      }, flashcardTermLabel), /*#__PURE__*/React.createElement("p", {
        dir: "auto",
        className: "mt-1 break-words text-sm font-bold text-slate-900"
      }, item.term || t('common.untitled')), renderGlossaryEditAudioTools(item, 'term', item.term, `audio-review-term-${idx}`, glossaryFieldLanguage(generatedContent, item, 'term'))), /*#__PURE__*/React.createElement("div", {
        className: "rounded-lg border border-slate-200 bg-white p-2"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-[10px] font-black uppercase tracking-wide text-slate-500"
      }, flashcardDefinitionLabel), /*#__PURE__*/React.createElement("p", {
        dir: "auto",
        className: "mt-1 break-words text-sm text-slate-800"
      }, item.def || t('common.untitled')), renderGlossaryEditAudioTools(item, 'definition', item.def, `audio-review-definition-${idx}`, glossaryFieldLanguage(generatedContent, item, 'definition')))), glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement("details", {
        className: "mt-2 rounded-lg border border-slate-200 bg-white p-2"
      }, /*#__PURE__*/React.createElement("summary", {
        className: "min-h-11 cursor-pointer py-2 text-xs font-bold text-indigo-800"
      }, glossaryText('glossary.translation_audio', 'Translation audio')), /*#__PURE__*/React.createElement("div", {
        className: "grid gap-2 pt-2 lg:grid-cols-2"
      }, glossaryLanguages.map(function (lang) {
        var translation = glossaryTranslationText(item.translations?.[lang]) || '';
        return /*#__PURE__*/React.createElement("div", {
          key: lang,
          className: "rounded-lg border border-indigo-100 bg-indigo-50/40 p-2"
        }, /*#__PURE__*/React.createElement("p", {
          className: "text-[10px] font-black uppercase tracking-wide text-indigo-700"
        }, lang), /*#__PURE__*/React.createElement("p", {
          dir: isRtlLang(lang) ? 'rtl' : 'ltr',
          className: "mt-1 break-words text-sm text-slate-800"
        }, translation || t('common.untitled')), renderGlossaryEditAudioTools(item, 'translation', translation, `audio-review-translation-${idx}-${lang}`, lang));
      }))));
    })))));
  }
  function renderGlossaryToolbar() {
    var toolButton = 'min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2';
    var secondaryButton = toolButton + ' bg-white text-slate-700 border-slate-300 hover:border-indigo-300 hover:bg-indigo-50';
    var gameCard = 'grid min-h-[88px] w-full min-w-0 grid-cols-[20px_minmax(0,1fr)] items-start gap-3 rounded-lg border border-slate-300 bg-white p-4 text-start text-sm font-bold leading-5 text-slate-700 break-words transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    // Sort is a view setting the host applies to filteredGlossaryData; hidden when an older host cannot sort.
    var setGlossarySort = props.setGlossarySort;
    var glossarySortValue = ['az', 'za', 'tier'].indexOf(props.glossarySort) >= 0 ? props.glossarySort : 'lesson';
    // One compact row stays visible in a 500 px frame; practice, games and teacher tools sit behind one disclosure.
    var glossaryToolbarToolsOpen = !!glossaryToolsOpen.tools;
    function toggleGlossaryToolbarTools() {
      setGlossaryToolsOpen(function (current) {
        return current.tools ? {
          games: false,
          teacher: false,
          tools: false
        } : Object.assign({}, current, {
          tools: true
        });
      });
    }
    // Skip past the study, game and teacher tools straight to the word list. One wrapper, so the
    // parent's space-y margin does not open a gap above the toolbar.
    return /*#__PURE__*/React.createElement("div", {
      "data-glossary-toolbar": true
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-glossary-skip": true,
      onClick: () => document.querySelector('[data-glossary-word-list]')?.focus(),
      className: "sr-only focus:not-sr-only focus:mb-2 focus:inline-block focus:rounded focus:bg-indigo-700 focus:px-3 focus:py-2 focus:font-bold focus:text-white"
    }, t('glossary.skip_to_words') || 'Skip to the word list'), /*#__PURE__*/React.createElement("section", {
      "aria-label": t('glossary.title'),
      className: "mb-4 space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-2 shadow-sm sm:p-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-2",
      "data-glossary-compact-toolbar": true
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative min-w-0 flex-[1_1_10rem]",
      "data-help-key": "glossary_search"
    }, /*#__PURE__*/React.createElement(Search, {
      className: "pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-blue-700",
      size: 16,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("input", {
      ref: glossarySearchInputRef,
      type: "search",
      "aria-label": t('glossary.search_placeholder'),
      placeholder: t('glossary.search_placeholder'),
      value: glossarySearchTerm,
      onChange: e => setGlossarySearchTerm(e.target.value),
      className: "min-h-11 w-full rounded-lg border border-blue-400 bg-white py-2 ps-10 pe-11 text-sm focus:ring-2 focus:ring-indigo-500"
    }), glossarySearchTerm && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: clearGlossarySearch,
      className: "absolute end-0 top-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-e-lg text-blue-700 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-indigo-600",
      "aria-label": glossaryText('glossary.clear_search', 'Clear search')
    }, /*#__PURE__*/React.createElement(X, {
      size: 16,
      "aria-hidden": "true"
    }))), /*#__PURE__*/React.createElement("div", {
      role: "group",
      "aria-label": t('glossary.title'),
      "aria-describedby": "glossary-tier-help",
      className: "inline-flex max-w-full flex-wrap rounded-lg border border-blue-200 bg-white p-0.5"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": glossaryFilter === 'all',
      "aria-label": t('glossary.filter_all'),
      "data-help-key": "glossary_filter_all",
      onClick: handleSetGlossaryFilterToAll,
      className: 'min-h-11 rounded-md px-3 py-2 text-sm font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (glossaryFilter === 'all' ? 'bg-blue-100 text-blue-800' : 'text-slate-700 hover:bg-slate-50')
    }, t('glossary.filter_all')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": glossaryFilter === 'academic',
      "aria-label": t('glossary.label_tier2'),
      "data-help-key": "glossary_filter_tier2",
      onClick: handleSetGlossaryFilterToAcademic,
      className: 'min-h-11 rounded-md px-3 py-2 text-sm font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (glossaryFilter === 'academic' ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-50')
    }, t('glossary.label_tier2')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": glossaryFilter === 'domain',
      "aria-label": t('glossary.label_tier3'),
      "data-help-key": "glossary_filter_tier3",
      onClick: handleSetGlossaryFilterToDomain,
      className: 'min-h-11 rounded-md px-3 py-2 text-sm font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (glossaryFilter === 'domain' ? 'bg-purple-700 text-white' : 'text-slate-700 hover:bg-slate-50')
    }, t('glossary.label_tier3'))), typeof setGlossarySort === 'function' && /*#__PURE__*/React.createElement("label", {
      "data-glossary-sort": true,
      className: "inline-flex min-h-11 min-w-0 max-w-full flex-[1_1_9rem] items-center gap-2 text-sm font-bold text-blue-900 sm:flex-none"
    }, glossaryText('glossary.sort_label', 'Sort'), /*#__PURE__*/React.createElement("select", {
      value: glossarySortValue,
      onChange: e => setGlossarySort(e.target.value),
      className: "min-h-11 min-w-0 max-w-full flex-1 rounded-lg border border-blue-300 bg-white px-2 text-sm font-normal text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("option", {
      value: "lesson"
    }, glossaryText('glossary.sort_lesson', 'Lesson order')), /*#__PURE__*/React.createElement("option", {
      value: "az"
    }, glossaryText('glossary.sort_az', 'A to Z')), /*#__PURE__*/React.createElement("option", {
      value: "za"
    }, glossaryText('glossary.sort_za', 'Z to A')), /*#__PURE__*/React.createElement("option", {
      value: "tier"
    }, glossaryText('glossary.sort_tier', 'By vocabulary tier')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-glossary-tools-toggle": true,
      onClick: toggleGlossaryToolbarTools,
      "aria-expanded": glossaryToolbarToolsOpen,
      "aria-controls": "glossary-toolbar-tools",
      className: toolButton + ' shrink-0 bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50'
    }, isTeacherMode ? glossaryText('glossary.tools_toggle', 'Tools') : glossaryText('glossary.tools_toggle_student', 'Practice'), " ", /*#__PURE__*/React.createElement(ChevronDown, {
      size: 16,
      "aria-hidden": "true",
      className: 'motion-safe:transition-transform ' + (glossaryToolbarToolsOpen ? 'rotate-180' : '')
    }))), /*#__PURE__*/React.createElement("div", {
      id: "glossary-toolbar-tools",
      hidden: !glossaryToolbarToolsOpen,
      style: {
        display: glossaryToolbarToolsOpen ? undefined : 'none'
      },
      className: "space-y-3"
    }, isTeacherMode && /*#__PURE__*/React.createElement("p", {
      "data-glossary-udl-goal": true,
      className: "max-w-xl text-sm text-blue-800"
    }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('glossary.udl_goal_desc')), /*#__PURE__*/React.createElement("div", {
      className: "grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
    }, /*#__PURE__*/React.createElement("div", {
      role: "group",
      className: "rounded-lg border border-blue-200 bg-white/80 p-3",
      "aria-labelledby": "glossary-study-tools-title"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "glossary-study-tools-title",
      className: "mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-800"
    }, /*#__PURE__*/React.createElement(MonitorPlay, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('flashcards.practice_mode')), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-help-key": "glossary_standard_flashcards",
      onClick: () => launchInteractiveFlashcards('standard'),
      className: toolButton + ' bg-blue-700 text-white border-blue-700 hover:bg-blue-800',
      "aria-label": t('flashcards.tooltip_launch_standard')
    }, /*#__PURE__*/React.createElement(MonitorPlay, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('flashcards.launch_standard')), glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-help-key": "glossary_language_flashcards",
      onClick: launchGlossaryLanguageFlashcards,
      className: toolButton + ' bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50',
      "aria-label": t('flashcards.tooltip_launch_language')
    }, /*#__PURE__*/React.createElement(Languages, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('flashcards.launch_language')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: openGlossaryWordPractice,
      disabled: wordPracticeStatus.busy || !activityWords.length,
      "aria-busy": wordPracticeStatus.busy,
      "aria-describedby": "glossary-presentation-help",
      className: secondaryButton + ' disabled:opacity-60 disabled:cursor-not-allowed'
    }, /*#__PURE__*/React.createElement(MonitorPlay, {
      size: 16,
      "aria-hidden": "true"
    }), " ", wordPracticeStatus.busy ? activityText('glossary.practice_opening', 'Opening presentation tools…') : activityText('glossary.practice_present_export', 'Present & Export'))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
      className: "mt-3"
    }, /*#__PURE__*/React.createElement("label", {
      className: "inline-flex max-w-full flex-wrap items-center gap-2 text-sm font-semibold text-slate-700"
    }, activityText('glossary.practice_words', 'Words to present'), /*#__PURE__*/React.createElement("select", {
      value: activityScope,
      onChange: e => setActivityScope(e.target.value),
      className: "min-h-11 max-w-full rounded-lg border border-slate-400 bg-white px-3 font-normal focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, activityText('glossary.activities.all', 'All glossary words')), /*#__PURE__*/React.createElement("option", {
      value: "filtered"
    }, activityText('glossary.activities.filtered', 'Current filtered words')))), /*#__PURE__*/React.createElement("p", {
      id: "glossary-presentation-help",
      className: "mt-2 text-xs text-slate-600"
    }, glossaryText('glossary.practice_export_help', '{count} words: project practice or download HTML and PowerPoint with meanings and optional audio.', {
      count: activityWords.length
    })), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "aria-live": "polite",
      className: "mt-1 text-sm text-amber-900"
    }, wordPracticeStatus.notice), wordPracticeStatus.diagnostic && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex flex-wrap gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: openGlossaryWordPractice,
      disabled: wordPracticeStatus.busy || !activityWords.length,
      "aria-busy": wordPracticeStatus.busy,
      className: secondaryButton + ' disabled:opacity-60 disabled:cursor-not-allowed'
    }, activityText('glossary.practice_retry', 'Retry')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: copyGlossaryWordPracticeDiagnostic,
      disabled: wordPracticeStatus.busy || wordPracticeStatus.copying,
      "aria-busy": !!wordPracticeStatus.copying,
      className: secondaryButton + ' disabled:opacity-60 disabled:cursor-not-allowed'
    }, activityText('glossary.practice_copy_diagnostics', 'Copy diagnostics'))), /*#__PURE__*/React.createElement("p", {
      role: "status",
      "aria-live": "polite",
      className: "mt-1 text-sm text-slate-700"
    }, wordPracticeStatus.copyNotice), /*#__PURE__*/React.createElement("details", {
      ref: wordPracticeDetailsRef,
      className: "mt-2 min-w-0 text-sm text-slate-700"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer rounded font-semibold focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, activityText('glossary.practice_diagnostics', 'Presentation diagnostics')), /*#__PURE__*/React.createElement("p", {
      className: "my-2"
    }, activityText('glossary.practice_diagnostics_help', 'Copy these details when reporting the problem.')), /*#__PURE__*/React.createElement("textarea", {
      ref: wordPracticeTextRef,
      readOnly: true,
      rows: 10,
      "aria-label": activityText('glossary.practice_diagnostics', 'Presentation diagnostics'),
      value: JSON.stringify(wordPracticeStatus.diagnostic, null, 2),
      className: "w-full min-w-0 rounded border border-slate-400 bg-white p-2 font-mono text-xs text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-start gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => toggleGlossaryToolPanel('games'),
      "aria-expanded": glossaryToolsOpen.games,
      "aria-controls": "glossary-games-tools",
      className: toolButton + ' bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50'
    }, /*#__PURE__*/React.createElement(Gamepad2, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('common.start_game'), " ", /*#__PURE__*/React.createElement(ChevronDown, {
      size: 16,
      "aria-hidden": "true",
      className: glossaryToolsOpen.games ? 'rotate-180' : ''
    })), isTeacherMode && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-help-key": "glossary_edit",
      onClick: handleToggleIsEditingGlossary,
      "aria-pressed": isEditingGlossary,
      className: toolButton + (isEditingGlossary ? ' bg-blue-700 text-white border-blue-700' : ' bg-white text-blue-800 border-blue-300 hover:bg-blue-50')
    }, /*#__PURE__*/React.createElement(Pencil, {
      size: 16,
      "aria-hidden": "true"
    }), " ", isEditingGlossary ? t('common.done') : t('common.edit')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => toggleGlossaryToolPanel('teacher'),
      "aria-expanded": glossaryToolsOpen.teacher,
      "aria-controls": "glossary-teacher-tools",
      className: toolButton + ' bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
    }, /*#__PURE__*/React.createElement(Settings, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('glossary.more_tools'), " ", /*#__PURE__*/React.createElement(ChevronDown, {
      size: 16,
      "aria-hidden": "true",
      className: glossaryToolsOpen.teacher ? 'rotate-180' : ''
    })))), /*#__PURE__*/React.createElement("p", {
      id: "glossary-tier-help",
      className: "text-xs text-blue-800"
    }, glossaryText('glossary.tier_help', 'Academic vocabulary appears across subjects; subject vocabulary is specific to this topic.'))), glossaryToolsOpen.games && /*#__PURE__*/React.createElement("div", {
      role: "group",
      id: "glossary-games-tools",
      className: "rounded-lg border border-indigo-200 bg-indigo-50/70 p-3",
      "aria-labelledby": "glossary-games-tools-title"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "glossary-games-tools-title",
      className: "mb-2 text-xs font-black tracking-wider text-indigo-800"
    }, t('common.start_game')), /*#__PURE__*/React.createElement("div", {
      className: "my-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] items-end gap-3",
      "data-glossary-activity-settings": "true"
    }, /*#__PURE__*/React.createElement("label", {
      className: "flex min-w-0 flex-col gap-1 text-sm font-semibold"
    }, activityText('glossary.activities.words', 'Words for games'), /*#__PURE__*/React.createElement("select", {
      "aria-label": activityText('glossary.activities.words', 'Words for games'),
      value: activityScope,
      onChange: e => setActivityScope(e.target.value),
      "aria-describedby": "glossary-activity-pool",
      className: "min-h-11 max-w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, activityText('glossary.activities.all', 'All glossary words')), /*#__PURE__*/React.createElement("option", {
      value: "filtered"
    }, activityText('glossary.activities.filtered', 'Current filtered words')))), /*#__PURE__*/React.createElement("label", {
      className: "flex min-w-0 flex-col gap-1 text-sm font-semibold"
    }, activityText('glossary.activities.board_size', 'Memory and Matching board size'), /*#__PURE__*/React.createElement("select", {
      "aria-label": activityText('glossary.activities.board_size', 'Memory and Matching board size'),
      value: activityBoardSize,
      onChange: e => setActivityBoardSize(e.target.value),
      className: "min-h-11 max-w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("option", {
      value: "standard"
    }, activityText('glossary.activities.standard_size', 'Standard')), [4, 6, 8].map(size => /*#__PURE__*/React.createElement("option", {
      key: size,
      value: String(size)
    }, glossaryText('glossary.activities.pair_count', '{count} pairs', {
      count: size
    }))))), glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement("label", {
      className: "flex min-w-0 flex-col gap-1 text-sm font-semibold"
    }, activityText('glossary.activities.word_search_language', 'Word Search language'), /*#__PURE__*/React.createElement("select", {
      "aria-label": activityText('glossary.activities.word_search_language', 'Word Search language'),
      "data-help-key": "glossary_puzzle_lang",
      value: wordSearchLang,
      onChange: e => {
        setWordSearchLang(e.target.value);
        if (gameMode === 'wordsearch') startScopedWordSearch(e.target.value);
      },
      className: "min-h-11 max-w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-800 focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, /*#__PURE__*/React.createElement("option", {
      value: glossaryBaseLanguage
    }, glossaryBaseLanguage === 'English' ? t('common.english') : glossaryBaseLanguage), glossaryLanguages.map(lang => /*#__PURE__*/React.createElement("option", {
      key: lang,
      value: lang
    }, lang))))), /*#__PURE__*/React.createElement("p", {
      id: "glossary-activity-pool",
      role: "status",
      className: "mb-2 text-sm text-slate-700"
    }, glossaryText('glossary.activities.available_count', '{count} words available for games.', {
      count: activityWords.length
    }), " ", activityText('glossary.activities.next_round', 'Changes apply when you start an activity.')), !activityWords.length && /*#__PURE__*/React.createElement("p", {
      className: "mb-3 text-sm text-slate-700"
    }, activityText('glossary.activities.empty', 'No words are available in this selection. Choose all glossary words or adjust your search and filters.'), " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setActivityScope('all'),
      className: "min-h-11 rounded px-2 font-bold text-indigo-700 underline focus-visible:ring-2 focus-visible:ring-indigo-600"
    }, activityText('glossary.activities.use_all', 'Use all glossary words'))), /*#__PURE__*/React.createElement("div", {
      className: "grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3",
      "data-glossary-game-grid": true
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": (gameMode === 'wordsearch' ? t('common.regenerate') : t('common.start_game')) + ' ' + t('glossary.word_search'),
      "data-help-key": "glossary_word_search",
      disabled: !activityWords.length,
      onClick: () => startScopedWordSearch(wordSearchLang),
      "aria-describedby": "glossary-activity-wordsearch-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Gamepad2, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, gameMode === 'wordsearch' ? t('common.regenerate') + ' ' + t('glossary.word_search') : t('glossary.word_search')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-wordsearch-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, activityText('glossary.activities.word_search_help', 'Find hidden words in the letter grid')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": detectiveLabel,
      "data-help-key": "glossary_definition_detective",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('detective', () => setDetectiveOpen(true)),
      "aria-describedby": "glossary-activity-detective-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Search, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, detectiveLabel), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-detective-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, activityText('glossary.activities.detective_help', 'Match a word to its meaning')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('glossary.memory_game'),
      "data-help-key": "glossary_memory_game",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('memory', handleSetIsMemoryGameToTrue),
      "aria-describedby": "glossary-activity-memory-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Brain, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, t('glossary.memory_game')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-memory-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, glossaryText('glossary.activities.memory_help_count', '{count} pairs: remember words, pictures, or meanings', {
      count: Math.min(activityMemoryCount, activityBoardSize === 'standard' ? 10 : Number(activityBoardSize))
    })))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('glossary.crossword'),
      "data-help-key": "glossary_crossword",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('crossword', handleSetIsCrosswordGameToTrue),
      "aria-describedby": "glossary-activity-crossword-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Gamepad2, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, t('glossary.crossword')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-crossword-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, activityText('glossary.activities.crossword_help', 'Solve clues and spell the words')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('glossary.matching'),
      "data-help-key": "glossary_matching",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('matching', handleSetIsMatchingGameToTrue),
      "aria-describedby": "glossary-activity-matching-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(GitMerge, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, t('glossary.matching')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-matching-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, glossaryText('glossary.activities.matching_help_count', '{count} pairs: connect words with meanings or pictures', {
      count: Math.min(activityMatchingCount, activityBoardSize === 'standard' ? 8 : Number(activityBoardSize))
    })))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('glossary.bingo'),
      "data-help-key": "glossary_bingo",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('bingo', handleSetIsBingoGameToTrue),
      "aria-describedby": "glossary-activity-bingo-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Gamepad2, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, t('glossary.bingo')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-bingo-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, activityText('glossary.activities.bingo_help', 'Create cards for group play')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('glossary.play_bingo'),
      "data-help-key": "glossary_play_bingo",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('studentBingo', handleSetIsStudentBingoGameToTrue),
      "aria-describedby": "glossary-activity-studentBingo-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Gamepad2, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, t('glossary.play_bingo')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-studentBingo-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, activityText('glossary.activities.studentBingo_help', 'Mark the words you hear')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": t('glossary.scramble'),
      "data-help-key": "glossary_scramble",
      disabled: !activityWords.length,
      onClick: () => startGlossaryActivity('scramble', handleSetIsWordScrambleGameToTrue),
      "aria-describedby": "glossary-activity-scramble-help",
      className: gameCard
    }, /*#__PURE__*/React.createElement(Shuffle, {
      size: 20,
      className: "shrink-0",
      "aria-hidden": "true"
    }), " ", /*#__PURE__*/React.createElement("span", {
      className: "min-w-0 space-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block"
    }, t('glossary.scramble')), /*#__PURE__*/React.createElement("span", {
      id: "glossary-activity-scramble-help",
      className: "block text-xs font-normal leading-5 text-slate-600"
    }, activityText('glossary.activities.scramble_help', 'Unscramble letters to practice spelling')))))), isTeacherMode && glossaryToolsOpen.teacher && /*#__PURE__*/React.createElement("div", {
      role: "group",
      id: "glossary-teacher-tools",
      className: "rounded-lg border border-slate-300 bg-white p-3",
      "aria-labelledby": "glossary-teacher-tools-title"
    }, /*#__PURE__*/React.createElement("h2", {
      id: "glossary-teacher-tools-title",
      className: "mb-2 text-xs font-black tracking-wider text-slate-700"
    }, t('glossary.more_tools')), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-help-key": "glossary_export_standard",
      onClick: () => handleExportFlashcards('standard'),
      className: secondaryButton
    }, /*#__PURE__*/React.createElement(GalleryHorizontal, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('flashcards.export_standard')), glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-help-key": "glossary_export_language",
      onClick: () => handleExportFlashcards('language'),
      className: secondaryButton
    }, /*#__PURE__*/React.createElement(Languages, {
      size: 16,
      "aria-hidden": "true"
    }), " ", t('flashcards.export_language')), typeof props.handleExportGlossaryFile === 'function' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-glossary-export-word-list": true,
      "aria-haspopup": "dialog",
      onClick: e => props.handleExportGlossaryFile('chooser', {
        opener: e.currentTarget
      }),
      className: secondaryButton
    }, /*#__PURE__*/React.createElement(Download, {
      size: 16,
      "aria-hidden": "true"
    }), " ", glossaryText('glossary.export_word_list', 'Export word list…')), /*#__PURE__*/React.createElement("label", {
      "data-help-key": "glossary_image_size",
      className: "min-h-11 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
    }, /*#__PURE__*/React.createElement(ImageIcon, {
      size: 16,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, t('glossary.image_size_tooltip')), /*#__PURE__*/React.createElement("input", {
      "aria-label": t('glossary.image_size_tooltip'),
      type: "range",
      min: "64",
      max: "300",
      step: "16",
      value: glossaryImageSize,
      onChange: e => setGlossaryImageSize(Number(e.target.value)),
      className: "w-24 accent-blue-600"
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: runCurrentGlossaryHealthCheck,
      disabled: !glossaryHealthConnectionReady || isRunningHealthCheck || generatedContent?.type !== 'glossary',
      "aria-describedby": !glossaryHealthConnectionReady ? 'glossary-health-connection-help' : undefined,
      className: secondaryButton + ' disabled:opacity-50 disabled:cursor-not-allowed'
    }, isRunningHealthCheck ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 16,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 16,
      "aria-hidden": "true"
    }), " ", isRunningHealthCheck ? t('common.processing') : glossaryHealthCheck ? glossaryText('glossary_health.rerun', 'Re-run health check') : glossaryText('glossary_health.run', 'Run health check')), !glossaryHealthConnectionReady && /*#__PURE__*/React.createElement("div", {
      id: "glossary-health-connection-help",
      className: "w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
    }, /*#__PURE__*/React.createElement("p", null, glossaryText('glossary_health.connection_required', 'The optional AI health check needs an AI connection. Open AI Backend Settings to connect. You can use this glossary and its activities without AI.')), typeof window.__alloOpenAiSetup === 'function' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => window.__alloOpenAiSetup(),
      className: secondaryButton + ' mt-2'
    }, glossaryText('tooltips.ai_backend_settings', 'AI Backend Settings'))), /*#__PURE__*/React.createElement("label", {
      className: "min-h-11 inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-900"
    }, /*#__PURE__*/React.createElement("span", null, glossaryText('glossary.audio_scope', 'Audio to prepare')), /*#__PURE__*/React.createElement("select", {
      "aria-label": glossaryText('glossary.audio_scope', 'Audio to prepare'),
      "aria-describedby": "glossary-audio-prep-help",
      value: glossaryAudioScope,
      onChange: e => setGlossaryAudioScope(e.target.value),
      disabled: glossaryAudioPrep.busy || !!glossaryAudioEditState.busyKey,
      className: "min-h-9 min-w-0 max-w-full rounded-md border border-violet-300 bg-white px-2 text-sm focus:ring-2 focus:ring-violet-600"
    }, /*#__PURE__*/React.createElement("option", {
      value: "core"
    }, glossaryText('glossary.audio_scope_core', 'Terms + definitions')), /*#__PURE__*/React.createElement("option", {
      value: "terms"
    }, glossaryText('glossary.audio_scope_terms', 'Terms only')), glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement("option", {
      value: "all"
    }, glossaryText('glossary.audio_scope_all', 'All fields')))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: glossaryAudioPrep.busy ? stopPreparingGlossaryAudio : handlePrepareGlossaryAudio,
      disabled: !glossaryAudioPrep.busy && (!!glossaryAudioEditState.busyKey || !generatedContent?.data?.length),
      "aria-busy": glossaryAudioPrep.busy,
      "aria-label": glossaryAudioPrep.busy ? glossaryText('glossary.audio_stop_preparing', 'Stop preparing audio') : glossaryPrepareAudioLabel,
      "aria-describedby": "glossary-audio-prep-help glossary-audio-prep-status",
      className: toolButton + ' bg-violet-700 text-white border-violet-700 hover:bg-violet-800 disabled:opacity-60',
      "data-help-key": "glossary_prepare_audio"
    }, glossaryAudioPrep.busy ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 16,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 16,
      "aria-hidden": "true"
    }), " ", glossaryAudioPrep.busy ? glossaryText('glossary.audio_stop_preparing', 'Stop preparing audio') : glossaryPrepareAudioLabel, glossaryAudioPrep.busy && glossaryAudioPrep.total > 0 && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, glossaryAudioPrep.done, "/", glossaryAudioPrep.total))), /*#__PURE__*/React.createElement("p", {
      id: "glossary-audio-prep-help",
      className: "mt-2 text-xs text-slate-600"
    }, glossaryText('glossary.audio_prepare_help', 'Prepares all glossary words and saves recordings for later playback. Existing recordings are reused.'), glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, " ", glossaryText('glossary.audio_scope_all_help', 'All fields includes translations.'))), /*#__PURE__*/React.createElement("p", {
      id: "glossary-audio-prep-status",
      role: "status",
      "aria-live": "polite",
      className: "mt-2 text-xs text-slate-600"
    }, glossaryAudioPrep.message)), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap items-center justify-between gap-2 print:hidden",
      "data-glossary-search-feedback": true
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm font-semibold text-blue-900",
      "data-glossary-result-count": true
    }, glossaryResultText), glossaryHasFilters && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: clearGlossaryFilters,
      className: secondaryButton
    }, glossaryText('glossary.clear_filters', 'Clear filters')), /*#__PURE__*/React.createElement("p", {
      className: "sr-only",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      "data-glossary-search-announcement": true
    }, glossarySearchAnnouncement)), renderGlossaryAudioReviewPanel()));
  }
  // Wrapped in a Fragment so the phonics popup can render as a sibling of
  // the main content. The popup state (phonicsData) lives at the host level
  // and is set by handlePhonicsClick — same one the simplified view uses.
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, renderGlossaryToolbar(), isInteractiveFlashcards && Array.isArray(generatedContent?.data) && generatedContent.data.length > 0 && /*#__PURE__*/React.createElement("div", {
    ref: flashcardDialogRef,
    style: {
      margin: 0
    },
    role: "dialog",
    "aria-modal": "true",
    "aria-label": flashcardMode === 'language' ? t('flashcards.deck_language', {
      lang: flashcardLang || ''
    }) || 'Interactive flashcards' : t('flashcards.deck_standard') || 'Interactive flashcards',
    tabIndex: -1,
    onKeyDown: e => containModalFocus(e, flashcardDialogRef.current, closeInteractiveFlashcards),
    className: "fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-start pt-20 sm:pt-24 p-4 animate-in fade-in duration-300 motion-reduce:animate-none motion-reduce:transition-none overflow-auto"
  }, /*#__PURE__*/React.createElement(GlossaryReadingSettingsButton, {
    t: t,
    label: glossaryText('reading_settings.title', 'Reading settings'),
    className: "absolute top-6 right-20 z-50 w-12 h-12 text-lg text-white/80 hover:text-white bg-white/10 hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-slate-950"
  }), /*#__PURE__*/React.createElement("button", {
    ref: flashcardCloseRef,
    type: "button",
    onClick: closeInteractiveFlashcards,
    className: "absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 32,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    id: "flashcard-live-status",
    className: "sr-only",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, flashcardStatusText), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-6 z-50 hidden sm:flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": showFlashcardImages,
    onClick: handleToggleShowFlashcardImages,
    className: `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg border  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${showFlashcardImages ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}`,
    title: t('flashcards.tooltip_toggle_images'),
    "aria-label": showFlashcardImages ? t('flashcards.hide_images') : t('flashcards.show_images')
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 16,
    "aria-hidden": "true"
  }), " ", showFlashcardImages ? t('flashcards.hide_images') : t('flashcards.show_images')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": isFlashcardQuizMode,
    onClick: handleToggleFlashcardQuizMode,
    className: `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg border  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${isFlashcardQuizMode ? 'bg-yellow-500 text-indigo-900 border-yellow-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}`,
    title: t('flashcards.tooltip_toggle_quiz'),
    "aria-label": glossaryQuizToggleLabel
  }, isFlashcardQuizMode ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 16,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Brain, {
    size: 16,
    "aria-hidden": "true"
  }), isFlashcardQuizMode ? t('flashcards.quiz_active') : t('flashcards.practice_mode'))), flashcardMode === 'standard' && glossaryLanguages.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-4 max-w-[calc(100%-9.5rem)] sm:left-1/2 sm:-translate-x-1/2 z-50"
  }, /*#__PURE__*/React.createElement("select", {
    "aria-label": t('flashcards.deck_standard'),
    value: standardDeckLang,
    onChange: e => setStandardDeckLang(e.target.value),
    className: "max-w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500  shadow-lg"
  }, /*#__PURE__*/React.createElement("option", {
    value: "English Only"
  }, glossaryBaseLanguage === 'English' ? t('languages.english_only') : glossaryText('glossary.base_language_only', '{language} only', {
    language: glossaryBaseLanguage
  })), glossaryLanguages.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, "+ ", l)))), flashcardMode === 'language' && glossaryLanguages.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-6 left-4 max-w-[calc(100%-9.5rem)] sm:left-1/2 sm:-translate-x-1/2 z-50"
  }, /*#__PURE__*/React.createElement("select", {
    "aria-label": t('flashcards.deck_language'),
    value: flashcardLang,
    onChange: e => setFlashcardLang(e.target.value),
    className: "max-w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 "
  }, glossaryLanguages.map(l => /*#__PURE__*/React.createElement("option", {
    key: l,
    value: l
  }, l)))), flashcardSummary ? renderFlashcardSummary() : /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-4xl min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-6 px-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-white/80 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg flex items-center gap-2"
  }, flashcardMode === 'standard' ? t('flashcards.deck_standard') : t('flashcards.deck_language', {
    lang: flashcardLang || 'Language'
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-normal opacity-70"
  }, "(", flashcardRoundPosition + 1, "/", flashcardRoundIndices.length, ")")), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center gap-2 text-xs font-bold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-400/40 px-2 py-0.5"
  }, flashcardKnownLabel, " ", knownCount), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-amber-500/15 text-amber-100 border border-amber-400/40 px-2 py-0.5"
  }, flashcardLearningLabel, " ", learningCount), (isPlaying || flashcardDictAudioKey) && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full bg-yellow-400 text-slate-900 px-2 py-0.5 animate-pulse motion-reduce:animate-none"
  }, audioReviewLabel)), isFlashcardQuizMode && /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-500 text-indigo-900 px-3 py-0.5 rounded-full text-sm font-black shadow-sm animate-in zoom-in motion-reduce:animate-none"
  }, t('flashcards.score_label'), " ", flashcardScore), /*#__PURE__*/React.createElement("div", {
    className: "sm:hidden flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": showFlashcardImages,
    "aria-label": showFlashcardImages ? t('flashcards.hide_images') : t('flashcards.show_images'),
    onClick: handleToggleShowFlashcardImages,
    className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border transition-colors  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${showFlashcardImages ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 16,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": isFlashcardQuizMode,
    "aria-label": glossaryQuizToggleLabel,
    onClick: handleToggleFlashcardQuizMode,
    className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border transition-colors  focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${isFlashcardQuizMode ? 'bg-yellow-500 border-yellow-400 text-indigo-900' : 'bg-slate-800 border-slate-700 text-slate-300'}`
  }, /*#__PURE__*/React.createElement(Brain, {
    size: 16,
    "aria-hidden": "true"
  })))), renderFlashcardProgressDots()), /*#__PURE__*/React.createElement("div", {
    "data-flashcard-body": "true",
    style: {
      overflowWrap: 'anywhere'
    },
    className: "relative w-full min-w-0 cursor-pointer group",
    onClick: handleToggleIsFlashcardFlipped
  }, /*#__PURE__*/React.createElement("div", {
    key: flashcardTransitionKey,
    className: "w-full min-w-0 shadow-2xl rounded-3xl"
  }, /*#__PURE__*/React.createElement("div", {
    "data-flashcard-face": "front",
    style: {
      display: isFlashcardFlipped ? 'none' : 'flex'
    },
    className: "relative min-h-80 sm:min-h-[420px] bg-white rounded-3xl p-5 sm:p-8 flex-col items-center justify-center text-center border-4 border-blue-100 shadow-inner"
  }, flashcardMode === 'standard' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "self-start mb-4 text-xs font-bold text-blue-700 uppercase tracking-widest"
  }, t('flashcards.front_label_term')), showFlashcardImages && generatedContent?.data[flashcardIndex].image && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 w-full flex justify-center"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: generatedContent?.data[flashcardIndex].image,
    alt: getGlossaryImageAlt(generatedContent?.data[flashcardIndex]),
    role: getGlossaryImageAlt(generatedContent?.data[flashcardIndex]) ? undefined : "presentation",
    className: "max-h-48 sm:max-h-64 max-w-full object-contain rounded-lg shadow-sm border border-slate-100",
    decoding: "async"
  })), /*#__PURE__*/React.createElement("h2", {
    className: `${showFlashcardImages && generatedContent?.data[flashcardIndex].image ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'} font-black text-slate-800 hover:text-blue-600 transition-colors`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleGlossarySpeak(generatedContent?.data[flashcardIndex], 'term', generatedContent?.data[flashcardIndex].term, 'fc-front', glossaryFieldLanguage(generatedContent, generatedContent?.data[flashcardIndex], 'term'));
    },
    "aria-label": `${t('common.click_read_aloud')}: ${generatedContent?.data[flashcardIndex].term}`,
    title: t('flashcards.tooltip_audio'),
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, generatedContent?.data[flashcardIndex].term)), standardDeckLang !== 'English Only' && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-100 w-2/3 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-indigo-600 uppercase mb-1"
  }, standardDeckLang), /*#__PURE__*/React.createElement("h3", {
    className: "text-3xl md:text-4xl font-bold text-indigo-600",
    dir: isRtlLang(standardDeckLang) ? 'rtl' : 'ltr'
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      const fullTrans = glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[standardDeckLang]) || "";
      const term = fullTrans.search(/[:：]/) >= 0 ? fullTrans.split(/[:：]/)[0].trim() : "";
      if (term) handleUncachedGlossarySpeak(term, `fc-front-${standardDeckLang}`, glossaryHasBaseMetadata(generatedContent, generatedContent.data[flashcardIndex]) ? standardDeckLang : undefined);
    },
    disabled: !((glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[standardDeckLang]) || "").search(/[:：]/) >= 0 && (glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[standardDeckLang]) || "").split(/[:：]/)[0].trim()),
    "aria-label": `${t('common.click_read_aloud')}: ${standardDeckLang}`,
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, (() => {
    const fullTrans = glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[standardDeckLang]) || "";
    if (fullTrans.search(/[:：]/) >= 0) {
      return fullTrans.split(/[:：]/)[0].trim();
    }
    return "";
  })())))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "self-start mb-4 text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Globe, {
    size: 14,
    "aria-hidden": "true"
  }), " ", glossaryBaseLanguage === 'English' ? t('languages.english') || 'English' : glossaryBaseLanguage), showFlashcardImages && generatedContent?.data[flashcardIndex].image && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 w-full flex justify-center"
  }, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: generatedContent?.data[flashcardIndex].image,
    alt: getGlossaryImageAlt(generatedContent?.data[flashcardIndex]),
    role: getGlossaryImageAlt(generatedContent?.data[flashcardIndex]) ? undefined : "presentation",
    className: "max-h-48 sm:max-h-64 max-w-full object-contain rounded-lg shadow-sm border border-slate-100",
    decoding: "async"
  })), /*#__PURE__*/React.createElement("h2", {
    className: `${showFlashcardImages && generatedContent?.data[flashcardIndex].image ? 'text-3xl md:text-4xl' : 'text-4xl md:text-6xl'} font-black text-slate-800 mb-2 hover:text-indigo-600 transition-colors`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleGlossarySpeak(generatedContent?.data[flashcardIndex], 'term', generatedContent?.data[flashcardIndex].term, 'fc-front-term', glossaryFieldLanguage(generatedContent, generatedContent?.data[flashcardIndex], 'term'));
    },
    "aria-label": `${t('common.click_read_aloud')}: ${generatedContent?.data[flashcardIndex].term}`,
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, generatedContent?.data[flashcardIndex].term)), /*#__PURE__*/React.createElement("p", {
    className: `${showFlashcardImages && generatedContent?.data[flashcardIndex].image ? 'text-lg' : 'text-2xl'} text-slate-600 leading-relaxed max-w-2xl hover:text-indigo-500 transition-colors`
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleGlossarySpeak(generatedContent?.data[flashcardIndex], 'definition', generatedContent?.data[flashcardIndex].def, 'fc-front-def', glossaryFieldLanguage(generatedContent, generatedContent?.data[flashcardIndex], 'definition'));
    },
    "aria-label": `${t('common.click_read_aloud')}: ${generatedContent?.data[flashcardIndex].term} definition`,
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-center text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, generatedContent?.data[flashcardIndex].def))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 text-slate-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse motion-reduce:animate-none"
  }, t('flashcards.flip_hint'), " ", /*#__PURE__*/React.createElement(RefreshCw, {
    size: 10
  }))), /*#__PURE__*/React.createElement("div", {
    "data-flashcard-face": "back",
    style: {
      display: isFlashcardFlipped ? 'flex' : 'none'
    },
    className: `relative min-h-80 sm:min-h-[420px] rounded-3xl p-5 sm:p-8 flex-col items-center justify-center text-center border-4 shadow-inner text-white ${flashcardMode === 'standard' ? 'bg-blue-600 border-blue-400' : 'bg-indigo-600 border-indigo-400'}`
  }, isFlashcardQuizMode ? /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-300 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl md:text-4xl font-black text-white mb-2 drop-shadow-md"
  }, (() => {
    const item = generatedContent?.data[flashcardIndex];
    if (flashcardMode === 'language' && flashcardLang) {
      const trans = glossaryTranslationText(item.translations?.[flashcardLang]);
      if (trans && trans.search(/[:：]/) >= 0) {
        return trans.split(/[:：]/)[0].trim();
      }
      return item.term;
    }
    return item.term;
  })()), /*#__PURE__*/React.createElement("h3", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    "data-flashcard-quiz-feedback": "true",
    className: 'text-xs font-bold mb-4 text-white/80 tracking-widest' + (flashcardFeedback === 'incorrect' ? ' normal-case text-sm text-white' : ' uppercase')
  }, flashcardFeedback === 'correct' ? t('flashcards.correct_msg') : flashcardFeedback === 'incorrect' ? glossaryText('glossary.quiz_answer_was', 'Not quite. The answer is: {answer}', {
    answer: typeof flashcardCorrectAnswer === 'function' ? flashcardCorrectAnswer(generatedContent?.data[flashcardIndex], flashcardMode, flashcardLang) : generatedContent?.data[flashcardIndex]?.def
  }) : t('flashcards.select_match')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3 w-full  pr-1"
  }, flashcardOptions.map((opt, idx) => {
    const isSelected = quizSelectedOption === opt;
    const currentItem = generatedContent?.data[flashcardIndex];
    const isCorrectAnswer = typeof flashcardCorrectAnswer === 'function' ? opt === flashcardCorrectAnswer(currentItem, flashcardMode, flashcardLang) : opt === currentItem.def;
    let btnClass = "bg-white/10 hover:bg-white/20 text-white border-2 border-white/20";
    let icon = null;
    if (quizSelectedOption) {
      if (isCorrectAnswer) {
        btnClass = "bg-green-700 border-green-600 text-white font-bold ring-2 ring-white scale-[1.02] shadow-lg";
        icon = /*#__PURE__*/React.createElement(CheckCircle2, {
          size: 16,
          className: "shrink-0"
        });
      } else if (isSelected) {
        btnClass = "bg-red-600 border-red-400 text-white opacity-80";
        icon = /*#__PURE__*/React.createElement(XCircle, {
          size: 16,
          className: "shrink-0"
        });
      } else {
        btnClass = "opacity-30 bg-white/5";
      }
    }
    return /*#__PURE__*/React.createElement("button", {
      key: idx,
      type: "button",
      onClick: e => handleReviewedQuizOption(e, opt),
      disabled: !!quizSelectedOption,
      className: `p-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-left shadow-sm flex items-center gap-3 ${btnClass}`
    }, icon && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, icon), /*#__PURE__*/React.createElement("span", {
      className: "break-words"
    }, opt), quizSelectedOption && (isCorrectAnswer || isSelected) && /*#__PURE__*/React.createElement("span", {
      className: "sr-only",
      "data-quiz-option-result": "true"
    }, ' (' + (isCorrectAnswer ? glossaryText('glossary.quiz_correct_answer', 'correct answer') : glossaryText('glossary.quiz_your_answer', 'your answer')) + ')'));
  }))) : flashcardMode === 'standard' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "self-start mb-4 text-xs font-bold text-white uppercase tracking-widest"
  }, t('flashcards.back_label_def')), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-3xl  px-1 space-y-3 text-left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white/10 border border-blue-300/40 px-4 py-3 shadow-inner"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[0.625rem] font-black text-white uppercase tracking-widest mb-1"
  }, flashcardDefinitionLabel), /*#__PURE__*/React.createElement("p", {
    className: "text-xl md:text-3xl font-medium leading-relaxed hover:text-blue-50 transition-colors cursor-pointer"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleGlossarySpeak(generatedContent?.data[flashcardIndex], 'definition', generatedContent?.data[flashcardIndex].def, 'fc-back-def', glossaryFieldLanguage(generatedContent, generatedContent?.data[flashcardIndex], 'definition'));
    },
    "aria-label": `${t('common.click_read_aloud')}: ${generatedContent?.data[flashcardIndex].term} definition`,
    title: t('flashcards.tooltip_audio'),
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-center text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-blue-600 focus-visible:ring-offset-2"
  }, generatedContent?.data[flashcardIndex].def)), renderGlossaryContextSentence(generatedContent?.data[flashcardIndex], 'mt-2 text-sm md:text-base leading-snug text-white', 'font-bold'), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-[0.6875rem] leading-snug text-blue-50"
  }, glossaryText('glossary.flashcard_provenance', "Provenance: generated from this lesson's source text and selected grade level."))), standardDeckLang !== 'English Only' && /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white/10 border border-blue-300/30 px-4 py-3 w-full animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-white uppercase mb-2"
  }, standardDeckLang), /*#__PURE__*/React.createElement("p", {
    className: "text-lg md:text-xl font-medium leading-relaxed italic text-blue-50 hover:text-white cursor-pointer",
    dir: isRtlLang(standardDeckLang) ? 'rtl' : 'ltr'
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      const fullTrans = glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[standardDeckLang]) || "";
      const def = fullTrans.search(/[:：]/) >= 0 ? fullTrans.substring(fullTrans.search(/[:：]/) + 1).trim() : fullTrans;
      handleUncachedGlossarySpeak(def, `fc-back-def-${standardDeckLang}`, glossaryHasBaseMetadata(generatedContent, generatedContent.data[flashcardIndex]) ? standardDeckLang : undefined);
    },
    "aria-label": `${t('common.read_translated_definition')}: ${standardDeckLang}`,
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-center text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-blue-600 focus-visible:ring-offset-2"
  }, (() => {
    const fullTrans = glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[standardDeckLang]) || glossaryText('glossary.translation_unavailable', 'Translation not available');
    if (fullTrans.search(/[:：]/) >= 0) {
      return fullTrans.substring(fullTrans.search(/[:：]/) + 1).trim();
    }
    return fullTrans;
  })()))), generatedContent?.data[flashcardIndex]?.etymology && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-blue-400/50 w-full animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-white uppercase mb-1"
  }, "📜 ", t('glossary.etymology_label') || 'Word roots'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm md:text-base text-blue-50 italic leading-relaxed hover:text-white cursor-pointer"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      handleUncachedGlossarySpeak(generatedContent.data[flashcardIndex].etymology, 'fc-back-etym', glossaryHasBaseMetadata(generatedContent, generatedContent.data[flashcardIndex]) ? glossaryFieldLanguage(generatedContent, generatedContent.data[flashcardIndex], 'definition') : undefined);
    },
    "aria-label": `${t('common.click_read_aloud')}: ${t('glossary.etymology_label') || 'Word roots'}`,
    className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-center text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-blue-600 focus-visible:ring-offset-2"
  }, generatedContent.data[flashcardIndex].etymology))), renderFlashcardDictBack(generatedContent.data[flashcardIndex], t, flashcardDictAudioKey, playGlossaryDictionaryAudio, generatedContent))) : (() => {
    const fullTrans = glossaryTranslationText(generatedContent?.data[flashcardIndex].translations?.[flashcardLang]) || glossaryText('glossary.translation_unavailable', 'Translation not available');
    let transTerm = "";
    let transDef = fullTrans;
    if (fullTrans.search(/[:：]/) >= 0) {
      const splitIdx = fullTrans.search(/[:：]/);
      transTerm = fullTrans.substring(0, splitIdx).trim();
      transDef = fullTrans.substring(splitIdx + 1).trim();
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "self-start mb-4 text-xs font-bold text-indigo-200 uppercase tracking-widest flex items-center gap-2"
    }, /*#__PURE__*/React.createElement(Globe, {
      size: 14
    }), " ", flashcardLang), transTerm && /*#__PURE__*/React.createElement("h2", {
      className: "text-4xl md:text-6xl font-black text-white mb-6 hover:text-indigo-200 transition-colors cursor-pointer",
      dir: isRtlLang(flashcardLang) ? 'rtl' : 'ltr'
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        handleUncachedGlossarySpeak(transTerm, 'fc-back-term', glossaryHasBaseMetadata(generatedContent, generatedContent.data[flashcardIndex]) ? flashcardLang : undefined);
      },
      "aria-label": glossaryText('glossary.read_language_term', 'Read {lang} term', {
        lang: flashcardLang
      }),
      className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-indigo-700 focus-visible:ring-offset-2"
    }, transTerm)), /*#__PURE__*/React.createElement("p", {
      className: "text-xl md:text-2xl text-indigo-100 leading-relaxed font-serif italic hover:text-white transition-colors cursor-pointer",
      dir: isRtlLang(flashcardLang) ? 'rtl' : 'ltr'
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: e => {
        e.stopPropagation();
        handleUncachedGlossarySpeak(transDef, 'fc-back-def', glossaryHasBaseMetadata(generatedContent, generatedContent.data[flashcardIndex]) ? flashcardLang : undefined);
      },
      "aria-label": `${t('common.read_translated_definition')}: ${flashcardLang}`,
      className: "min-h-11 max-w-full inline-flex items-center justify-center appearance-none border-0 bg-transparent p-0 text-center text-inherit [font:inherit] cursor-pointer rounded  focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-indigo-700 focus-visible:ring-offset-2"
    }, transDef)));
  })()))), renderFlashcardActionBar(), renderFlashcardEditDrawer())), detectiveOpen && (DefinitionDetectiveGame ? /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(DefinitionDetectiveGame, {
    data: activityData('detective'),
    onClose: () => setDetectiveOpen(false),
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })) : /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"
  }, /*#__PURE__*/React.createElement("p", null, t('common.loading')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 p-3 font-bold",
    onClick: () => detectiveRefresh[1](value => value + 1)
  }, t('common.refresh')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 p-3 font-bold",
    onClick: () => setDetectiveOpen(false)
  }, t('common.close')))), isMemoryGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(MemoryGame, {
    data: activityData('memory'),
    roundSize: activitySize('memory'),
    onClose: closeMemory,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), isCrosswordGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(CrosswordGame, {
    data: activityData('crossword'),
    onClose: closeCrossword,
    isTeacherMode: isTeacherMode,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), isMatchingGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(MatchingGame, {
    data: activityData('matching'),
    roundSize: activitySize('matching'),
    onClose: closeMatching,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), isBingoGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(BingoGame, {
    data: activityData('bingo'),
    onClose: closeBingo,
    settings: bingoSettings,
    setSettings: setBingoSettings,
    onGenerate: () => handleGenerateBingo(activityData('bingo')),
    bingoState: bingoState,
    setBingoState: setBingoState,
    onGenerateAudio: callTTS,
    selectedVoice: selectedVoice,
    alloBotRef: alloBotRef
  })), isStudentBingoGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(StudentBingoGame, {
    data: activityData('studentBingo'),
    onClose: closeStudentBingo,
    playSound: playSound,
    onGameComplete: handleGameCompletion
  })), isWordScrambleGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: glossaryText('glossary.game_error', 'This activity ran into a problem. Close it and try again.')
  }, /*#__PURE__*/React.createElement(WordScrambleGame, {
    data: activityData('scramble'),
    onClose: handleCloseWordScramble,
    playSound: playSound,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion
  })), gameMode === 'wordsearch' && gameData && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 bg-white p-4 sm:p-6 rounded-xl border-2 border-teal-200 shadow-md animate-in motion-reduce:animate-none fade-in slide-in-from-top-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-slate-100 pb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-teal-800 text-lg flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 20,
    "aria-hidden": "true"
  }), " ", t('glossary.word_search_title')), /*#__PURE__*/React.createElement("p", {
    className: "no-print mt-1 text-xs text-slate-600"
  }, glossaryText('glossary.word_search_select_help', 'Select the first and last letter of a word. Use arrow keys inside the grid, then Enter or Space to select.'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleToggleShowWordSearchAnswers,
    className: 'min-h-11 text-xs flex items-center gap-1 px-3 py-2 rounded-full font-bold transition-colors ' + (showWordSearchAnswers ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
  }, showWordSearchAnswers ? /*#__PURE__*/React.createElement(Eye, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14,
    "aria-hidden": "true"
  }), showWordSearchAnswers ? t('glossary.hide_answers') : t('glossary.show_answers')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handlePrintGame,
    className: "min-h-11 text-xs flex items-center gap-1 bg-teal-100 text-teal-700 px-3 py-2 rounded-full font-bold hover:bg-teal-200 transition-colors"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 14,
    "aria-hidden": "true"
  }), " ", t('glossary.print_puzzle')), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-word-search-print-key": "true",
    onClick: () => handlePrintGame(true),
    "aria-label": (t('common.print') || 'Print') + ': ' + (t('glossary.print_answer_key') || 'Answer key'),
    className: "min-h-11 text-xs flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-2 rounded-full font-bold hover:bg-slate-200 transition-colors"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 14,
    "aria-hidden": "true"
  }), " ", t('glossary.print_answer_key') || 'Answer key'), /*#__PURE__*/React.createElement(GlossaryReadingSettingsButton, {
    t: t,
    label: glossaryText('reading_settings.title', 'Reading settings'),
    className: "no-print text-base bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-teal-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetGameModeToNull,
    className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 18,
    "aria-hidden": "true"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "sr-only",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, wordSearchAnnouncement), /*#__PURE__*/React.createElement("div", {
    id: "printable-game-area",
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "hidden print-only font-bold text-xl mb-4"
  }, t('glossary.word_search_title')), /*#__PURE__*/React.createElement("div", {
    className: "max-w-full overflow-x-auto p-1"
  }, /*#__PURE__*/React.createElement("div", {
    ref: wordSearchGridRef,
    id: "word-search-grid",
    role: "grid",
    tabIndex: 0,
    dir: gameData.isRtl ? 'rtl' : 'ltr',
    "aria-label": glossaryText('glossary.word_search_grid_label', '{title}. {found} of {total} words found.', {
      title: t('glossary.word_search_title') || 'Word search',
      found: wordSearchFoundWords.size,
      total: gameData.words.length
    }),
    "aria-rowcount": gameData.grid.length,
    "aria-colcount": gameData.grid[0]?.length || 0,
    "aria-activedescendant": 'word-search-cell-' + wordSearchActive.r + '-' + wordSearchActive.c,
    onKeyDown: handleWordSearchGridKeyDown,
    className: "inline-grid gap-0 border-2 border-slate-800 bg-white p-1 focus-visible:ring-4 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
    style: {
      gridTemplateColumns: 'repeat(' + (gameData.grid[0]?.length || 0) + ', minmax(2rem, 2.25rem))'
    }
  }, gameData.grid.map((row, r) => /*#__PURE__*/React.createElement("div", {
    key: r,
    role: "row",
    className: "contents"
  }, row.map((char, c) => {
    var key = wordSearchCellKey(r, c);
    var active = wordSearchActive.r === r && wordSearchActive.c === c;
    var inPath = wordSearchPath.includes(key);
    var foundCell = isWordSearchFoundCell(key);
    var isAnswer = gameData.solutions && gameData.solutions.includes(key);
    var highlightClass = showWordSearchAnswers && isAnswer ? 'bg-green-200 text-green-900 font-extrabold' : foundCell ? 'bg-emerald-100 text-emerald-900' : inPath ? 'bg-yellow-200 text-black' : 'bg-white text-slate-700 hover:bg-slate-50';
    return /*#__PURE__*/React.createElement("div", {
      key: c,
      id: 'word-search-cell-' + r + '-' + c,
      role: "gridcell",
      "aria-rowindex": r + 1,
      "aria-colindex": c + 1,
      "aria-selected": active,
      "aria-label": (t('glossary.word_search_cell_aria') || 'Cell') + ' ' + (r + 1) + '-' + (c + 1) + ': ' + char,
      onClick: () => {
        submitWordSearchCell(r, c);
        wordSearchGridRef.current?.focus({
          preventScroll: true
        });
      },
      className: 'w-8 h-8 sm:w-9 sm:h-9 border border-slate-400 flex items-center justify-center font-mono text-sm sm:text-base font-bold cursor-pointer select-none transition-colors grid-cell ' + (active ? 'ring-2 ring-inset ring-teal-600 z-10 ' : '') + highlightClass
    }, char);
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 text-sm font-bold text-teal-800",
    role: "status"
  }, glossaryText('glossary.word_search_found_count', 'Found {found} of {total}', {
    found: wordSearchFoundWords.size,
    total: gameData.words.length
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 w-full max-w-md"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-600 uppercase tracking-wider mb-2 text-center"
  }, t('glossary.word_search_find')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-x-6 gap-y-2 word-list"
  }, gameData.words.map((word, i) => {
    var isFound = wordSearchFoundWords.has(word) || foundWords && typeof foundWords.has === 'function' && foundWords.has(word);
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: 'text-sm font-medium px-2 py-1 rounded transition-all flex items-center gap-1 print:bg-transparent print:p-0 ' + (isFound ? 'bg-green-100 text-green-800 line-through opacity-70 decoration-green-600' : 'text-slate-700 bg-slate-100')
    }, isFound && /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 12,
      className: "inline",
      "aria-hidden": "true"
    }), word);
  }))))), canEditGlossary && /*#__PURE__*/React.createElement("div", {
    "data-help-key": "glossary_add_term",
    className: "flex flex-col sm:flex-row gap-2 mb-4 bg-white p-3 rounded-lg border border-slate-400 shadow-sm sm:items-center animate-in motion-reduce:animate-none fade-in slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden sm:block shrink-0 bg-indigo-100 p-2 rounded-full text-indigo-600"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-full sm:w-1/3 min-w-0 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-indigo-900 mb-1"
  }, glossaryText('glossary.image_style_label', 'Image style')), /*#__PURE__*/React.createElement("select", {
    "aria-label": glossaryText('glossary.image_style_source_aria', 'Glossary image style source'),
    "data-help-key": "glossary_image_style_mode",
    value: glossaryStyleMode,
    onChange: handleGlossaryStyleModeChange,
    disabled: isAddingTerm,
    className: "w-full rounded border border-indigo-300 bg-white px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "inherit"
  }, glossaryText('glossary.image_style_inherit', 'Use Universal style')), /*#__PURE__*/React.createElement("option", {
    value: "override"
  }, glossaryText('glossary.image_style_override', 'Override for this resource'))), glossaryStyleMode === 'inherit' ? /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[10px] leading-snug text-indigo-800"
  }, String(universalImageStyle || '').trim() ? glossaryText('glossary.image_style_using_universal', 'Using Universal style: {style}', {
    style: String(universalImageStyle).trim()
  }) : glossaryText('glossary.image_style_no_universal', 'No Universal style is set; the app default will be used.')) : /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_glossary_image_style'),
    "data-help-key": "glossary_image_style",
    type: "text",
    value: glossaryImageStyle,
    onChange: e => setGlossaryImageStyle(e.target.value),
    placeholder: t('glossary.style_placeholder'),
    className: "mt-2 w-full rounded border border-indigo-300 bg-white px-2 py-2 text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500",
    disabled: isAddingTerm
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[10px] leading-snug text-slate-600"
  }, glossaryText('glossary.image_style_applies', 'Applies to new or regenerated term images.'))), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_new_glossary_term'),
    type: "text",
    value: newGlossaryTerm,
    onChange: e => setNewGlossaryTerm(e.target.value),
    onKeyDown: e => handleGlossaryInputEnter(e, handleAddGlossaryTerm, !newGlossaryTerm.trim() || isAddingTerm),
    placeholder: t('glossary.add_term_placeholder'),
    className: "w-full min-w-0 flex-1 min-h-11 text-sm border border-slate-300 sm:border-none py-2 px-2 focus:ring-2 focus:ring-indigo-500 bg-transparent placeholder:text-slate-600 rounded",
    disabled: isAddingTerm
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAddGlossaryTerm,
    disabled: !newGlossaryTerm.trim() || isAddingTerm,
    "aria-busy": isAddingTerm,
    "aria-describedby": "glossary-add-term-status",
    className: "w-full sm:w-auto shrink-0 justify-center min-h-11 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
  }, isAddingTerm ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    className: "text-yellow-700 fill-current"
  }), isAddingTerm ? t('glossary.defining') : t('glossary.add_term')), /*#__PURE__*/React.createElement("p", {
    id: "glossary-add-term-status",
    role: "status",
    "aria-live": "polite",
    className: "sr-only"
  }, isAddingTerm ? glossaryText('glossary.add_term_pending', 'Preparing the new glossary word…') : '')), isTeacherMode && (glossaryHealthCheck || isRunningHealthCheck) && activeView === 'glossary' && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm overflow-hidden",
    "data-help-key": "glossary_health_check"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full flex flex-wrap items-center gap-2 px-2 py-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleToggleShowHealthCheckPanel,
    "aria-expanded": showHealthCheckPanel,
    "aria-controls": "glossary-health-check-details",
    className: "min-h-11 min-w-0 flex flex-1 items-center justify-between gap-2 rounded-md px-2 text-left hover:bg-amber-100/50 transition-colors  focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex min-w-0 flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg",
    "aria-hidden": "true"
  }, "📊"), /*#__PURE__*/React.createElement("span", {
    id: "glossary-health-check-title",
    className: "font-bold text-amber-900 text-sm"
  }, glossaryText('glossary_health.title', 'Glossary Health Check')), isRunningHealthCheck && /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none text-amber-600",
    "aria-hidden": "true"
  }), glossaryHealthCheck && !glossaryHealthCheck.error && !isRunningHealthCheck && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full font-medium"
  }, glossaryHealthCheck.overallScore ? `${glossaryHealthCheck.overallScore}/5` : '', " — ", glossaryHealthCheck.definitionGradeLevel || glossaryText('glossary_health.analyzed', 'Analyzed'))), /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    "aria-hidden": "true",
    className: `shrink-0 text-amber-600 transition-transform motion-reduce:transition-none ${showHealthCheckPanel ? 'rotate-180' : ''}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-busy": isRunningHealthCheck,
    onClick: () => {
      if (generatedContent?.type === 'glossary' && Array.isArray(generatedContent?.data)) {
        runGlossaryHealthCheck(generatedContent.data, relatedGlossarySourceText());
      }
    },
    disabled: !glossaryHealthConnectionReady || isRunningHealthCheck,
    className: "min-h-11 px-3 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-200/50 hover:bg-amber-300/50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1  focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2",
    title: t('common.re_run_analysis')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    "aria-hidden": "true"
  }), " ", glossaryText('glossary_health.reanalyze', 'Re-analyze')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.dismiss_analysis'),
    onClick: () => {
      setGlossaryHealthCheck(null);
      setShowHealthCheckPanel(false);
    },
    className: "min-h-11 min-w-11 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-200/50 transition-colors inline-flex items-center justify-center  focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2",
    title: t('common.dismiss_analysis')
  }, /*#__PURE__*/React.createElement(X, {
    size: 16,
    "aria-hidden": "true"
  })))), /*#__PURE__*/React.createElement("p", {
    id: "glossary-suggestion-status",
    "data-glossary-suggestion-status": true,
    role: "status",
    "aria-live": "polite",
    className: glossarySuggestionMessage ? "px-4 pb-3 text-sm text-amber-900" : "sr-only"
  }, glossarySuggestionMessage), showHealthCheckPanel && glossaryHealthCheck && !glossaryHealthCheck.error && /*#__PURE__*/React.createElement("div", {
    id: "glossary-health-check-details",
    role: "region",
    "aria-labelledby": "glossary-health-check-title",
    className: "px-4 pb-4 space-y-3 border-t border-amber-200/50 animate-in slide-in-from-top-2 motion-reduce:animate-none duration-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-amber-800 italic pt-2"
  }, glossaryHealthCheck.summary), glossaryHealthCheck.definitionGradeLevel && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase w-28 shrink-0"
  }, t('glossary_health.grade_level')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 flex-grow"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-sm font-bold px-2.5 py-0.5 rounded-full ${glossaryHealthCheck.gradeAppropriate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`
  }, glossaryHealthCheck.definitionGradeLevel), glossaryHealthCheck.gradeAppropriate ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-emerald-600"
  }, glossaryText('glossary_health.appropriate', '✓ Appropriate')) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-600"
  }, glossaryText('glossary_health.may_need_adjustment', '⚠ May need adjustment')))), glossaryHealthCheck.tierAudit && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase"
  }, t('glossary_health.vocabulary_tiers')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex flex-wrap gap-1.5"
  }, (Array.isArray(glossaryHealthCheck.tierAudit.tier2) ? glossaryHealthCheck.tierAudit.tier2 : []).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: `t2-${i}`,
    className: "text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"
  }, glossaryText('glossary_health.tier2_term', 'Tier 2: {term}', {
    term: t
  }))), (Array.isArray(glossaryHealthCheck.tierAudit.tier3) ? glossaryHealthCheck.tierAudit.tier3 : []).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: `t3-${i}`,
    className: "text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium"
  }, glossaryText('glossary_health.tier3_term', 'Tier 3: {term}', {
    term: t
  })))), Array.isArray(glossaryHealthCheck.tierAudit.notes) && glossaryHealthCheck.tierAudit.notes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 space-y-0.5"
  }, glossaryHealthCheck.tierAudit.notes.map((note, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-xs text-slate-600 italic"
  }, "💡 ", typeof note === 'string' ? note : JSON.stringify(note)))), typeof glossaryHealthCheck.tierAudit.notes === 'string' && glossaryHealthCheck.tierAudit.notes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 italic"
  }, "💡 ", glossaryHealthCheck.tierAudit.notes))), Array.isArray(glossaryHealthCheck.coverageGaps) && glossaryHealthCheck.coverageGaps.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase"
  }, t('glossary_health.suggested_terms')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 space-y-1"
  }, glossaryHealthCheck.coverageGaps.map((gap, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex flex-wrap items-center gap-2 bg-white/60 rounded-md px-2.5 py-1.5 border border-amber-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-semibold text-slate-800"
  }, "\"", gap.term, "\""), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 text-xs text-slate-600 flex-grow"
  }, gap.reason), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleAddGlossarySuggestion(gap),
    disabled: glossaryPendingSuggestions.includes(glossarySuggestionKey(gap.term)),
    "aria-busy": glossaryPendingSuggestions.includes(glossarySuggestionKey(gap.term)),
    "aria-label": glossaryPendingSuggestions.includes(glossarySuggestionKey(gap.term)) ? glossaryText('glossary.suggestion_adding_aria', 'Adding {term}', {
      term: gap.term
    }) : glossaryText('glossary.suggestion_add_aria', 'Add {term}', {
      term: gap.term
    }),
    "aria-describedby": "glossary-suggestion-status",
    className: "min-h-11 min-w-11 text-xs font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 px-3 py-2 rounded-full transition-colors inline-flex items-center justify-center gap-1 shrink-0 disabled:opacity-60 disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
    title: t('common.add_this_term_to_glossary')
  }, glossaryPendingSuggestions.includes(glossarySuggestionKey(gap.term)) ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), " ", glossaryText('glossary.suggestion_adding', 'Adding…')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Plus, {
    size: 14,
    "aria-hidden": "true"
  }), " ", glossaryText('common.add', 'Add'))))))), Array.isArray(glossaryHealthCheck.conceptConnections) && glossaryHealthCheck.conceptConnections.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-600 uppercase"
  }, t('glossary_health.concept_web')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 space-y-1.5"
  }, glossaryHealthCheck.conceptConnections.map((cc, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "bg-white/60 rounded-md px-2.5 py-1.5 border border-amber-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-bold text-indigo-700"
  }, "🔗 ", cc.concept), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, "→"), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 text-xs text-slate-600"
  }, (cc.connectedTerms || []).join(', '))), cc.note && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-0.5"
  }, cc.note)))))), showHealthCheckPanel && glossaryHealthCheck && glossaryHealthCheck.error && /*#__PURE__*/React.createElement("div", {
    id: "glossary-health-check-details",
    role: "region",
    "aria-labelledby": "glossary-health-check-title",
    className: "px-4 pb-3 text-sm text-amber-600 italic border-t border-amber-200/50 pt-2"
  }, glossaryText('glossary_health.failed', 'Analysis could not be completed. Click "Re-analyze" to try again.')), showHealthCheckPanel && isRunningHealthCheck && !glossaryHealthCheck && /*#__PURE__*/React.createElement("div", {
    id: "glossary-health-check-details",
    role: "status",
    "aria-live": "polite",
    "aria-labelledby": "glossary-health-check-title",
    className: "px-4 pb-3 text-sm text-amber-600 border-t border-amber-200/50 pt-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), " ", glossaryText('glossary_health.analyzing', 'Analyzing glossary quality...'))), !isMemoryGame && /*#__PURE__*/React.createElement("div", {
    "data-help-key": "glossary_terms_table",
    className: "overflow-hidden rounded-lg border border-slate-400 shadow-sm"
  }, isEditingGlossary && /*#__PURE__*/React.createElement("p", {
    id: "glossary-selection-scope",
    className: "border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 print:hidden"
  }, glossaryText('glossary.selection_scope', 'Selection applies to all {total} words, including words hidden by filters.', {
    total: glossaryTotalCount
  })), isEditingGlossary && typeof props.handleMoveGlossaryItem === 'function' && glossaryReorderBlocked() && /*#__PURE__*/React.createElement("p", {
    id: "glossary-reorder-help",
    className: "border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:hidden"
  }, glossaryText('glossary.reorder_blocked_help', 'To move words, clear the search and filters and sort in lesson order.')), /*#__PURE__*/React.createElement("p", {
    id: "glossary-table-layout-hint",
    className: "px-3 py-2 text-xs text-slate-600 bg-slate-50 sm:hidden print:hidden"
  }, glossaryText('glossary.table_stacked_hint', 'Definitions and translations follow each word.')), /*#__PURE__*/React.createElement("div", {
    ref: glossaryWordListRef,
    "data-glossary-word-list": true,
    className: "overflow-x-auto focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600",
    role: "region",
    "aria-label": t('glossary.table_label'),
    "aria-describedby": "glossary-table-layout-hint",
    tabIndex: 0
  }, /*#__PURE__*/React.createElement("table", {
    role: "table",
    className: "w-full text-center text-sm"
  }, /*#__PURE__*/React.createElement("thead", {
    role: "rowgroup",
    className: "bg-slate-100 text-slate-600 font-semibold"
  }, /*#__PURE__*/React.createElement("tr", {
    role: "row"
  }, isEditingGlossary && /*#__PURE__*/React.createElement("th", {
    role: "columnheader",
    scope: "col",
    "data-glossary-selection": true,
    className: "p-4 border-b border-slate-200 w-12 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    ref: input => {
      if (input) input.indeterminate = glossarySomeSelected;
    },
    "aria-label": glossaryText('glossary.include_all_aria', 'Include all terms'),
    "aria-describedby": "glossary-selection-scope",
    "aria-checked": glossarySomeSelected ? 'mixed' : glossaryAllSelected,
    type: "checkbox",
    className: "rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer",
    checked: glossaryAllSelected,
    disabled: !glossaryTotalCount,
    onChange: handleGlossarySelectAll,
    title: t('glossary.tooltips.select_all_highlight')
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-normal leading-none text-slate-600"
  }, glossaryText('glossary.all_terms', 'All terms')))), /*#__PURE__*/React.createElement("th", {
    role: "columnheader",
    scope: "col",
    className: "p-4 border-b border-slate-200 min-w-[150px]"
  }, t('glossary.table_term')), /*#__PURE__*/React.createElement("th", {
    role: "columnheader",
    scope: "col",
    className: "p-4 border-b border-slate-200 min-w-[200px]"
  }, t('glossary.table_def')), displayLanguages.map(lang => /*#__PURE__*/React.createElement("th", {
    role: "columnheader",
    scope: "col",
    key: lang,
    className: "p-4 border-b border-slate-200 min-w-[150px] text-indigo-600 text-center"
  }, lang)))), /*#__PURE__*/React.createElement("tbody", {
    role: "rowgroup",
    className: "divide-y divide-slate-100"
  }, filteredGlossaryData.map(item => {
    const idx = item._originalIdx;
    const entryKey = getGlossaryEntryKey(item, idx);
    const isTier2 = item.tier === 'Academic';
    const isTier3 = item.tier === 'Domain-Specific';
    return /*#__PURE__*/React.createElement("tr", {
      role: "row",
      "data-glossary-entry-key": getGlossaryEntryKey(item, idx),
      key: getGlossaryEntryKey(item, idx),
      className: "group/row allo-vghov-row",
      onKeyDown: handleGlossaryRowKeyDown,
      onFocus: handleGlossaryRowFocus
    }, isEditingGlossary && /*#__PURE__*/React.createElement("td", {
      role: "cell",
      "data-glossary-selection": true,
      className: "p-4 border-b border-slate-100 text-center align-top"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": glossaryText('glossary.include_term_aria', 'Include {term}', {
        term: item.term || ''
      }),
      type: "checkbox",
      className: "mt-1.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer",
      checked: item.isSelected !== false,
      onChange: () => handleGlossarySelectionChange(idx),
      title: t('glossary.tooltips.select_highlight')
    }), /*#__PURE__*/React.createElement("span", {
      "data-glossary-mobile-label": true,
      "aria-hidden": "true"
    }, t('glossary.highlight_label'))), /*#__PURE__*/React.createElement("td", {
      role: "cell",
      "data-glossary-term": true,
      className: "p-4 font-bold text-slate-800 align-top min-w-[200px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2 items-center"
    }, !isEditingGlossary && item.tier && /*#__PURE__*/React.createElement("span", {
      className: `text-[11px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border mb-1 ${isTier2 ? 'bg-blue-50 text-blue-700 border-blue-200' : isTier3 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`
    }, isTier2 ? glossaryText('glossary.tier_badge_academic', 'Academic vocabulary') : isTier3 ? glossaryText('glossary.tier_badge_subject', 'Subject vocabulary') : item.tier), isEditingGlossary ? /*#__PURE__*/React.createElement("div", {
      className: "w-full flex flex-col gap-2"
    }, /*#__PURE__*/React.createElement("select", {
      "aria-label": (t('glossary.edit_tier_placeholder') || 'Vocabulary type') + ': ' + item.term,
      value: item.tier || '',
      onChange: e => handleGlossaryChange(idx, 'tier', e.target.value),
      className: "text-[11px] font-bold uppercase tracking-wider w-full border border-slate-400 rounded px-1 py-1  focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-slate-600",
      "data-help-key": "glossary_edit_tier"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, t('glossary.edit_tier_placeholder')), /*#__PURE__*/React.createElement("option", {
      value: "Academic"
    }, t('glossary.edit_tier_academic')), /*#__PURE__*/React.createElement("option", {
      value: "Domain-Specific"
    }, t('glossary.edit_tier_domain'))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-2 w-full"
    }, /*#__PURE__*/React.createElement("textarea", {
      dir: "auto",
      "aria-label": t('glossary.edit_term') || 'Edit glossary term',
      value: item.term,
      onChange: e => handleGlossaryChange(idx, 'term', e.target.value),
      rows: getRows(item.term, 25),
      className: "w-full bg-white border border-blue-300 rounded px-2 py-1  focus:ring-2 focus:ring-blue-200 resize-y text-sm font-bold text-center"
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryText('glossary.delete_term_aria', 'Delete term: {term}', {
        term: item.term
      }),
      onClick: e => handleDeleteGlossaryItem(idx, e),
      className: "min-h-11 min-w-11 inline-flex items-center justify-center bg-red-50 text-red-800 hover:bg-red-100 rounded transition-colors shrink-0",
      title: t('glossary.tooltips.delete_term')
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 14
    })))) : /*#__PURE__*/React.createElement("div", {
      className: "px-2 py-1 font-bold text-slate-800 whitespace-pre-wrap text-center",
      dir: "auto"
    }, item.emoji ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      className: "mr-1"
    }, item.emoji) : null, item.term), /*#__PURE__*/React.createElement("div", {
      className: "mt-1 px-1"
    }, item.image ? /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative group/image inline-block w-fit"
    }, /*#__PURE__*/React.createElement("img", {
      loading: "lazy",
      src: item.image,
      alt: getGlossaryImageAlt(item),
      role: getGlossaryImageAlt(item) ? undefined : "presentation",
      style: {
        width: `${glossaryImageSize}px`,
        height: `${glossaryImageSize}px`
      },
      className: "max-w-none rounded-lg border border-slate-400 object-contain bg-white shadow-sm transition-all duration-200",
      decoding: "async"
    }), /*#__PURE__*/React.createElement("div", {
      hidden: !canEditGlossary,
      style: {
        display: canEditGlossary ? undefined : 'none'
      },
      className: "relative mt-2 bg-slate-800 p-1 sm:absolute sm:inset-0 sm:mt-0 sm:p-0 sm:bg-black/60 rounded-lg flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/image:opacity-100 sm:group-focus-within/image:opacity-100 transition-opacity gap-2 sm:backdrop-blur-[1px]"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryText('glossary.delete_image_aria', 'Delete image for {term}', {
        term: item.term
      }),
      onClick: e => handleDeleteTermImage(idx, e),
      className: "min-h-11 min-w-11 inline-flex items-center justify-center text-white hover:text-red-300 bg-white/10 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-white",
      title: t('common.delete'),
      "data-help-key": "glossary_delete_image"
    }, /*#__PURE__*/React.createElement(Trash2, {
      size: 12
    })))), isEditingGlossary && /*#__PURE__*/React.createElement("div", {
      className: "w-full min-w-0 animate-in motion-reduce:animate-none slide-in-from-top-2 mt-1"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleRefineGlossaryImage(idx, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
      disabled: isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx],
      "aria-label": glossaryText('glossary.remove_image_words_aria', 'Remove words from image for {term}', {
        term: item.term
      }),
      className: "min-h-11 w-full mb-1.5 text-[11px] bg-red-50 text-red-800 hover:bg-red-100 border border-red-100 px-2 py-1 rounded flex items-center justify-center gap-1 transition-colors font-bold shadow-sm",
      title: t('glossary.auto_remove_tooltip'),
      "data-help-key": "glossary_remove_words"
    }, isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin motion-reduce:animate-none"
    }) : /*#__PURE__*/React.createElement(Ban, {
      size: 10
    }), " ", t('glossary.remove_words_btn')), /*#__PURE__*/React.createElement("div", {
      className: "flex w-full min-w-0 gap-1"
    }, /*#__PURE__*/React.createElement("input", {
      "aria-label": glossaryText('glossary.image_edit_instructions_aria', 'Image edit instructions for {term}', {
        term: item.term
      }),
      type: "text",
      value: glossaryRefinementInputs[entryKey] || glossaryRefinementInputs[idx] || '',
      onChange: e => setGlossaryRefinementInputs(prev => ({
        ...prev,
        [entryKey]: e.target.value
      })),
      placeholder: t('glossary.custom_edit_placeholder'),
      className: "min-h-11 min-w-0 w-full flex-1 text-xs border border-yellow-400 rounded px-2 py-1 focus:ring-2 focus:ring-yellow-500",
      onKeyDown: e => handleGlossaryInputEnter(e, () => handleRefineGlossaryImage(idx), !String(glossaryRefinementInputs[entryKey] || glossaryRefinementInputs[idx] || '').trim() || isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx])
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryText('glossary.apply_image_edit_aria', 'Apply image edit for {term}', {
        term: item.term
      }),
      onClick: () => handleRefineGlossaryImage(idx),
      disabled: !String(glossaryRefinementInputs[entryKey] || glossaryRefinementInputs[idx] || '').trim() || !!(isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx]),
      "aria-busy": !!(isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx]),
      className: "min-h-11 min-w-11 inline-flex items-center justify-center bg-yellow-400 text-yellow-900 p-2 rounded hover:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed shrink-0",
      title: glossaryText('glossary.apply_image_edit_aria', 'Apply image edit for {term}', {
        term: item.term
      })
    }, isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 10,
      className: "animate-spin motion-reduce:animate-none"
    }) : /*#__PURE__*/React.createElement(Send, {
      size: 10
    }))), /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] text-slate-600 italic mt-0.5 block"
    }, glossaryText('glossary.image_editing_active', 'Image editing active')))) : null), /*#__PURE__*/React.createElement(GlossaryImageControls, {
      key: String(generatedContent?.id) + ":" + entryKey,
      item: item,
      index: idx,
      canEdit: canEditGlossary,
      beginTask: props.beginGlossaryImageTask,
      onGenerate: handleGenerateTermImage,
      generating: !!(isGeneratingTermImage[entryKey] || isGeneratingTermImage[idx]),
      t: t
    }), /*#__PURE__*/React.createElement("div", {
      role: "toolbar",
      "aria-label": glossaryText('glossary.row_actions_aria', 'Actions for {term}', {
        term: item.term || ''
      }),
      className: "flex flex-wrap items-center justify-center gap-1  mt-1"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryAudioActionLabel(`term-${idx}`, 'term', item.term),
      title: glossaryAudioActionLabel(`term-${idx}`, 'term', item.term),
      onClick: () => handleGlossarySpeak(item, 'term', item.term, `term-${idx}`, glossaryFieldLanguage(generatedContent, item, 'term')),
      disabled: isGeneratingAudio && playingContentId !== `term-${idx}`,
      className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${playingContentId === `term-${idx}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`,
      "data-help-key": "glossary_speak_term"
    }, playingContentId === `term-${idx}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : playingContentId === `term-${idx}` ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14,
      "aria-hidden": "true"
    })),
    // Pronounce button — opens the same phonics popup the simplified view uses
    // (phonetic spelling + IPA + syllables + audio playback). Only rendered if
    // the host wired handlePhonicsClick into the props.
    handlePhonicsClick && glossaryEnglishBase(generatedContent, item) && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: ev => handlePhonicsClick(item.term, ev),
      className: "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0 font-bold text-[11px] tracking-tight",
      "aria-label": (t('glossary.pronounce_term') || 'Pronounce') + ': ' + item.term,
      title: t('glossary.pronounce_term_title') || 'Show pronunciation, IPA, and syllables',
      "data-help-key": "glossary_pronounce_term"
    }, "/əˈ/"), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryText('glossary.download_term_audio_aria', 'Download audio for term: {term}', {
        term: item.term
      }),
      title: glossaryText('glossary.download_term_audio_aria', 'Download audio for term: {term}', {
        term: item.term
      }),
      onClick: () => downloadGlossaryFieldAudio(item, 'term', item.term, `term-${idx}-audio`, `dl-term-${idx}`),
      disabled: downloadingContentId === `dl-term-${idx}`,
      className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-indigo-600 rounded-full transition-colors",
      "data-help-key": "glossary_download_audio"
    }, downloadingContentId === `dl-term-${idx}` ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Download, {
      size: 14,
      "aria-hidden": "true"
    })), canEditGlossary && typeof props.handleMoveGlossaryItem === 'function' && [renderGlossaryMoveButton(item, idx, -1), renderGlossaryMoveButton(item, idx, 1)]))), /*#__PURE__*/React.createElement("td", {
      role: "cell",
      className: "p-4 text-slate-600 align-top"
    }, /*#__PURE__*/React.createElement("span", {
      "data-glossary-mobile-label": true,
      "aria-hidden": "true"
    }, t('glossary.table_def')), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col gap-2 items-center"
    }, isEditingGlossary ? /*#__PURE__*/React.createElement("textarea", {
      dir: "auto",
      "aria-label": glossaryText('glossary.edit_definition_aria', 'Edit definition for {term}', {
        term: item.term
      }),
      value: item.def,
      onChange: e => handleGlossaryChange(idx, 'def', e.target.value),
      rows: getRows(item.def, 45),
      className: "w-full bg-white border border-blue-300 rounded px-2 py-1  focus:ring-2 focus:ring-blue-200 resize-y text-sm text-center"
    }) : /*#__PURE__*/React.createElement("div", {
      className: "px-2 py-1 text-slate-600 whitespace-pre-wrap",
      dir: "auto"
    }, currentUiLanguage !== 'English' && /*#__PURE__*/React.createElement("span", {
      className: "block font-bold text-indigo-900 text-xs mb-1 uppercase tracking-wide"
    }, item.term), item.def), renderGlossaryContextSentence(item, 'px-2 text-xs text-slate-600', 'font-semibold text-slate-700'), /*#__PURE__*/React.createElement("div", {
      role: "toolbar",
      "aria-label": glossaryText('glossary.definition_actions_aria', 'Definition actions for {term}', {
        term: item.term || ''
      }),
      className: "flex items-center gap-1 "
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryAudioActionLabel(`def-${idx}`, 'definition', item.term),
      title: glossaryAudioActionLabel(`def-${idx}`, 'definition', item.term),
      onClick: () => handleGlossarySpeak(item, 'definition', item.def, `def-${idx}`, glossaryFieldLanguage(generatedContent, item, 'definition')),
      disabled: isGeneratingAudio && playingContentId !== `def-${idx}`,
      className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${playingContentId === `def-${idx}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`
    }, playingContentId === `def-${idx}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : playingContentId === `def-${idx}` ? /*#__PURE__*/React.createElement(StopCircle, {
      size: 14,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Volume2, {
      size: 14,
      "aria-hidden": "true"
    })), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-label": glossaryText('glossary.download_definition_audio_aria', 'Download definition audio for {term}', {
        term: item.term
      }),
      title: glossaryText('glossary.download_definition_audio_aria', 'Download definition audio for {term}', {
        term: item.term
      }),
      onClick: () => downloadGlossaryFieldAudio(item, 'definition', glossarySpeechText(item, 'definition', item.def), `def-${idx}-audio`, `dl-def-${idx}`),
      disabled: downloadingContentId === `dl-def-${idx}`,
      className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-indigo-600 rounded-full transition-colors"
    }, downloadingContentId === `dl-def-${idx}` ? /*#__PURE__*/React.createElement(RefreshCw, {
      size: 14,
      className: "animate-spin motion-reduce:animate-none",
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(Download, {
      size: 14,
      "aria-hidden": "true"
    }))), item.etymology ? /*#__PURE__*/React.createElement("details", {
      className: "mt-2 text-xs w-full",
      "data-help-key": "glossary_etymology_info"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer text-indigo-700 font-medium hover:text-indigo-900 select-none"
    }, "📜 ", t('glossary.etymology_label') || 'Word roots'), (() => {
      const etyMap = item.etymologyByLang && typeof item.etymologyByLang === 'object' ? item.etymologyByLang : null;
      const displayLang = glossaryFieldLanguage(generatedContent, item, 'definition');
      const etymologyProse = etyMap && etyMap[displayLang] || item.etymology || '';
      return /*#__PURE__*/React.createElement("div", {
        className: "mt-1 pl-4 border-l-2 border-indigo-200 space-y-2"
      }, etyMap && Object.keys(etyMap).length > 1 && /*#__PURE__*/React.createElement("div", {
        className: "text-[10px] uppercase tracking-wide text-indigo-500 font-bold"
      }, displayLang), /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-1"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-slate-700 leading-relaxed italic flex-1"
      }, etymologyProse), /*#__PURE__*/React.createElement("button", {
        onClick: () => handleUncachedGlossarySpeak(etymologyProse, `etym-${idx}`, glossaryHasBaseMetadata(generatedContent, item) ? displayLang : undefined),
        disabled: isGeneratingAudio && playingContentId !== `etym-${idx}`,
        className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${playingContentId === `etym-${idx}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`,
        "aria-label": (t('glossary.etymology_label') || 'Word roots') + ': ' + item.term
      }, playingContentId === `etym-${idx}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 12,
        className: "animate-spin motion-reduce:animate-none"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 12
      }))), (() => {
        const validRoots = Array.isArray(item.roots) ? item.roots.filter(r => r && typeof r.root === 'string' && r.root.trim()) : [];
        if (validRoots.length === 0) return null;
        return /*#__PURE__*/React.createElement("div", {
          role: "group",
          className: "space-y-1.5",
          "aria-label": t('glossary.etymology_roots_label') || 'Source roots'
        }, /*#__PURE__*/React.createElement("div", {
          className: "flex flex-wrap gap-1.5 justify-center"
        }, validRoots.map((r, ri) => {
          const related = Array.isArray(r.related) ? r.related.filter(w => typeof w === 'string' && w.trim()) : [];
          return /*#__PURE__*/React.createElement("button", {
            key: ri,
            type: "button",
            onClick: () => handleUncachedGlossarySpeak(glossaryRootText(r.root, r.meaning, related, '. '), `root-${idx}-${ri}`),
            title: [r.lang || '', related.length > 0 ? glossaryText('glossary.root_related_short', 'Related: {words}', {
              words: related.join(', ')
            }) : ''].filter(Boolean).join(' · '),
            className: "inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-indigo-900",
            "aria-label": glossaryRootText(r.root + (r.lang ? ' (' + r.lang + ')' : ''), r.meaning, related, '; ')
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-bold"
          }, r.root), r.lang && /*#__PURE__*/React.createElement("span", {
            className: "text-[10px] text-indigo-600/80 uppercase tracking-wide"
          }, r.lang), r.meaning && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-600"
          }, "= ", r.meaning));
        })), (() => {
          const allRelated = [];
          const seen = new Set();
          validRoots.forEach(r => {
            if (Array.isArray(r.related)) r.related.forEach(w => {
              const k = String(w || '').trim();
              if (k && !seen.has(k.toLowerCase())) {
                seen.add(k.toLowerCase());
                allRelated.push(k);
              }
            });
          });
          if (allRelated.length === 0) return null;
          return /*#__PURE__*/React.createElement("div", {
            className: "text-[11px] text-slate-600 leading-snug pl-1"
          }, /*#__PURE__*/React.createElement("span", {
            className: "font-semibold text-slate-700"
          }, t('glossary.related_words_label') || 'Related words:'), " ", allRelated.slice(0, 6).map((w, wi) => /*#__PURE__*/React.createElement("span", {
            key: wi
          }, wi > 0 && /*#__PURE__*/React.createElement("span", {
            className: "text-slate-600"
          }, ", "), /*#__PURE__*/React.createElement("span", {
            className: "font-medium text-indigo-800"
          }, w))));
        })());
      })());
    })()) : includeEtymology ? /*#__PURE__*/React.createElement("button", {
      hidden: !canEditGlossary,
      style: {
        display: canEditGlossary ? undefined : 'none'
      },
      onClick: () => handleGenerateTermEtymology(idx, item.term),
      disabled: isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx],
      "aria-busy": !!(isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx]),
      "aria-live": "polite",
      className: "mt-2 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1",
      "data-help-key": "glossary_etymology_info",
      title: t('glossary.etymology_label') || 'Word roots'
    }, isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 12,
      className: "animate-spin motion-reduce:animate-none"
    }), " ", t('glossary.actions.generating_etymology') || 'Finding roots…') : /*#__PURE__*/React.createElement(React.Fragment, null, "📜 ", t('glossary.actions.show_etymology') || 'Show word roots')) : null)), displayLanguages.map(lang => {
      const translationStatus = isTeacherMode ? glossaryTranslationStatus(item, lang) : '';
      const canRetryTranslation = !!translationStatus && typeof props.handleRetryGlossaryTranslation === 'function';
      const retryState = glossaryRetryState[entryKey + '|' + lang];
      return /*#__PURE__*/React.createElement("td", {
        role: "cell",
        key: lang,
        "aria-busy": retryState && retryState.busy ? 'true' : undefined,
        className: "p-4 text-slate-600 italic border-l border-slate-50 align-top"
      }, /*#__PURE__*/React.createElement("span", {
        "data-glossary-mobile-label": true,
        "aria-hidden": "true"
      }, lang), /*#__PURE__*/React.createElement("div", {
        className: "flex flex-col gap-2",
        dir: isRtlLang(lang) ? 'rtl' : 'ltr'
      }, isEditingGlossary ? /*#__PURE__*/React.createElement("textarea", {
        "aria-label": glossaryText('glossary.edit_translation_aria', 'Edit {lang} translation for {term}', {
          lang: lang,
          term: item.term
        }),
        value: glossaryTranslationText(item.translations?.[lang]) || "",
        onChange: e => handleGlossaryChange(idx, 'translations', e.target.value, lang),
        rows: getRows(glossaryTranslationText(item.translations?.[lang]), 30),
        className: "w-full bg-white border border-blue-300 rounded px-2 py-1  focus:ring-2 focus:ring-blue-200 resize-y text-sm italic text-center"
      }) : /*#__PURE__*/React.createElement("div", {
        className: "px-2 py-1 text-slate-600 italic whitespace-pre-wrap text-center"
      }, glossaryTranslationText(item.translations?.[lang]) || ""), translationStatus && renderGlossaryTranslationStatus(translationStatus, retryState), (glossaryTranslationText(item.translations?.[lang]) || canRetryTranslation) && /*#__PURE__*/React.createElement("div", {
        role: "toolbar",
        "aria-label": glossaryText('glossary.translation_actions_aria', '{lang} actions for {term}', {
          lang: lang,
          term: item.term || ''
        }),
        className: "flex items-center gap-1  justify-center",
        dir: "ltr"
      }, glossaryTranslationText(item.translations?.[lang]) && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-label": glossaryAudioActionLabel(`trans-${idx}-${lang}`, 'translation', item.term, lang),
        title: glossaryAudioActionLabel(`trans-${idx}-${lang}`, 'translation', item.term, lang),
        onClick: () => handleGlossarySpeak(item, 'translation', glossaryTranslationText(item.translations[lang]), `trans-${idx}-${lang}`, lang),
        disabled: isGeneratingAudio && playingContentId !== `trans-${idx}-${lang}`,
        className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${playingContentId === `trans-${idx}-${lang}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`
      }, playingContentId === `trans-${idx}-${lang}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 14,
        className: "animate-spin motion-reduce:animate-none",
        "aria-hidden": "true"
      }) : playingContentId === `trans-${idx}-${lang}` ? /*#__PURE__*/React.createElement(StopCircle, {
        size: 14,
        "aria-hidden": "true"
      }) : /*#__PURE__*/React.createElement(Volume2, {
        size: 14,
        "aria-hidden": "true"
      })), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "aria-label": glossaryText('glossary.download_translation_audio_aria', 'Download {lang} translation audio for {term}', {
          lang: lang,
          term: item.term
        }),
        title: glossaryText('glossary.download_translation_audio_aria', 'Download {lang} translation audio for {term}', {
          lang: lang,
          term: item.term
        }),
        onClick: () => downloadGlossaryFieldAudio(item, 'translation', glossaryTranslationText(item.translations[lang]), `trans-${idx}-${lang}-audio`, `dl-trans-${idx}-${lang}`, lang),
        disabled: downloadingContentId === `dl-trans-${idx}-${lang}`,
        className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-indigo-600 rounded-full transition-colors"
      }, downloadingContentId === `dl-trans-${idx}-${lang}` ? /*#__PURE__*/React.createElement(RefreshCw, {
        size: 14,
        className: "animate-spin motion-reduce:animate-none",
        "aria-hidden": "true"
      }) : /*#__PURE__*/React.createElement(Download, {
        size: 14,
        "aria-hidden": "true"
      }))), canRetryTranslation && renderGlossaryRetryButton(item, idx, lang, retryState)), glossaryTranslationText(item.translations?.[lang]) && (() => {
        const etyLangProse = item.etymologyByLang && typeof item.etymologyByLang === 'object' ? item.etymologyByLang[lang] : null;
        const hasOwnProse = typeof etyLangProse === 'string' && etyLangProse.trim() && etyLangProse.trim() !== 'NONE';
        const hasEnglishEty = !!(item.etymology || item.etymologyByLang && (item.etymologyByLang.English || Object.keys(item.etymologyByLang).length > 0));
        const ETYMOLOGY_LABELS = {
          Spanish: {
            roots: 'Raíces',
            show: 'Ver raíces',
            loading: 'Buscando raíces…',
            related: 'Palabras relacionadas:'
          },
          French: {
            roots: 'Racines',
            show: 'Voir les racines',
            loading: 'Recherche en cours…',
            related: 'Mots apparentés :'
          },
          German: {
            roots: 'Wortwurzeln',
            show: 'Wortwurzeln zeigen',
            loading: 'Wurzeln werden gesucht…',
            related: 'Verwandte Wörter:'
          },
          Italian: {
            roots: 'Radici',
            show: 'Mostra radici',
            loading: 'Ricerca radici…',
            related: 'Parole correlate:'
          },
          Portuguese: {
            roots: 'Raízes',
            show: 'Ver raízes',
            loading: 'Buscando raízes…',
            related: 'Palavras relacionadas:'
          },
          Dutch: {
            roots: 'Woordwortels',
            show: 'Woordwortels tonen',
            loading: 'Wortels zoeken…',
            related: 'Verwante woorden:'
          },
          Russian: {
            roots: 'Корни',
            show: 'Показать корни',
            loading: 'Поиск корней…',
            related: 'Родственные слова:'
          },
          Polish: {
            roots: 'Rdzenie',
            show: 'Pokaż rdzenie',
            loading: 'Szukanie rdzeni…',
            related: 'Słowa pokrewne:'
          },
          Ukrainian: {
            roots: 'Корені',
            show: 'Показати корені',
            loading: 'Пошук коренів…',
            related: 'Споріднені слова:'
          },
          Arabic: {
            roots: 'الجذور',
            show: 'عرض جذور الكلمة',
            loading: 'جاري البحث…',
            related: 'كلمات ذات صلة:'
          },
          Hebrew: {
            roots: 'שורשים',
            show: 'הצג שורשי מילה',
            loading: 'מחפש שורשים…',
            related: 'מילים קשורות:'
          },
          Hindi: {
            roots: 'शब्द-मूल',
            show: 'शब्द-मूल दिखाएँ',
            loading: 'मूल खोज रहे हैं…',
            related: 'संबंधित शब्द:'
          },
          Chinese: {
            roots: '词根',
            show: '显示词根',
            loading: '正在查找词根…',
            related: '相关词语：'
          },
          Japanese: {
            roots: '語源',
            show: '語源を表示',
            loading: '語源を検索中…',
            related: '関連語：'
          },
          Korean: {
            roots: '어근',
            show: '어근 보기',
            loading: '어근 검색 중…',
            related: '관련 단어:'
          },
          Vietnamese: {
            roots: 'Gốc từ',
            show: 'Xem gốc từ',
            loading: 'Đang tìm gốc từ…',
            related: 'Từ liên quan:'
          },
          Turkish: {
            roots: 'Kökler',
            show: 'Kökleri göster',
            loading: 'Kökler aranıyor…',
            related: 'İlgili kelimeler:'
          },
          Swahili: {
            roots: 'Mizizi',
            show: 'Onyesha mizizi',
            loading: 'Inatafuta mizizi…',
            related: 'Maneno yanayohusiana:'
          },
          Somali: {
            roots: 'Xididada',
            show: 'Muuji xididada',
            loading: 'Raadinta xididada…',
            related: 'Ereyada la xidhiidha:'
          },
          Tagalog: {
            roots: 'Ugat ng salita',
            show: 'Ipakita ang ugat',
            loading: 'Naghahanap ng ugat…',
            related: 'Mga kaugnay na salita:'
          }
        };
        const langLabels = ETYMOLOGY_LABELS[lang] || null;
        const rootsLabel = langLabels?.roots || t('glossary.etymology_label') || 'Word roots';
        const showLabel = langLabels?.show || t('glossary.actions.show_etymology') || 'Show word roots';
        const loadingLabel = langLabels?.loading || t('glossary.actions.generating_etymology') || 'Finding roots…';
        const relatedLabel = langLabels?.related || t('glossary.related_words_label') || 'Related words:';
        const ORIGIN_LANG_LOCALIZED = {
          Spanish: {
            Latin: 'latín',
            Greek: 'griego',
            'Old English': 'inglés antiguo',
            French: 'francés',
            'Old French': 'francés antiguo',
            Germanic: 'germánico',
            'Proto-Germanic': 'protogermánico',
            Sanskrit: 'sánscrito',
            Arabic: 'árabe',
            Hebrew: 'hebreo',
            Norse: 'nórdico',
            'Old Norse': 'nórdico antiguo'
          },
          French: {
            Latin: 'latin',
            Greek: 'grec',
            'Old English': 'vieil anglais',
            French: 'français',
            'Old French': 'ancien français',
            Germanic: 'germanique',
            'Proto-Germanic': 'proto-germanique',
            Sanskrit: 'sanskrit',
            Arabic: 'arabe',
            Hebrew: 'hébreu',
            Norse: 'norrois',
            'Old Norse': 'vieux norrois'
          },
          German: {
            Latin: 'lateinisch',
            Greek: 'griechisch',
            'Old English': 'altenglisch',
            French: 'französisch',
            'Old French': 'altfranzösisch',
            Germanic: 'germanisch',
            'Proto-Germanic': 'urgermanisch',
            Sanskrit: 'sanskrit',
            Arabic: 'arabisch',
            Hebrew: 'hebräisch',
            Norse: 'nordisch',
            'Old Norse': 'altnordisch'
          },
          Italian: {
            Latin: 'latino',
            Greek: 'greco',
            'Old English': 'inglese antico',
            French: 'francese',
            'Old French': 'francese antico',
            Germanic: 'germanico',
            'Proto-Germanic': 'protogermanico',
            Sanskrit: 'sanscrito',
            Arabic: 'arabo',
            Hebrew: 'ebraico',
            Norse: 'norreno',
            'Old Norse': 'norreno antico'
          },
          Portuguese: {
            Latin: 'latim',
            Greek: 'grego',
            'Old English': 'inglês antigo',
            French: 'francês',
            'Old French': 'francês antigo',
            Germanic: 'germânico',
            'Proto-Germanic': 'protogermânico',
            Sanskrit: 'sânscrito',
            Arabic: 'árabe',
            Hebrew: 'hebraico',
            Norse: 'nórdico',
            'Old Norse': 'nórdico antigo'
          },
          Dutch: {
            Latin: 'Latijn',
            Greek: 'Grieks',
            'Old English': 'Oudengels',
            French: 'Frans',
            'Old French': 'Oudfrans',
            Germanic: 'Germaans',
            'Proto-Germanic': 'Proto-Germaans',
            Sanskrit: 'Sanskriet',
            Arabic: 'Arabisch',
            Hebrew: 'Hebreeuws',
            Norse: 'Noors',
            'Old Norse': 'Oudnoors'
          },
          Russian: {
            Latin: 'латинский',
            Greek: 'греческий',
            'Old English': 'древнеанглийский',
            French: 'французский',
            'Old French': 'старофранцузский',
            Germanic: 'германский',
            'Proto-Germanic': 'прагерманский',
            Sanskrit: 'санскрит',
            Arabic: 'арабский',
            Hebrew: 'иврит',
            Norse: 'норвежский',
            'Old Norse': 'древнескандинавский'
          },
          Polish: {
            Latin: 'łaciński',
            Greek: 'grecki',
            'Old English': 'staroangielski',
            French: 'francuski',
            'Old French': 'starofrancuski',
            Germanic: 'germański',
            'Proto-Germanic': 'pragermański',
            Sanskrit: 'sanskryt',
            Arabic: 'arabski',
            Hebrew: 'hebrajski',
            Norse: 'nordycki',
            'Old Norse': 'staronordycki'
          },
          Ukrainian: {
            Latin: 'латинська',
            Greek: 'грецька',
            'Old English': 'давньоанглійська',
            French: 'французька',
            'Old French': 'старофранцузька',
            Germanic: 'германська',
            'Proto-Germanic': 'прагерманська',
            Sanskrit: 'санскрит',
            Arabic: 'арабська',
            Hebrew: 'іврит'
          },
          Arabic: {
            Latin: 'اللاتينية',
            Greek: 'اليونانية',
            'Old English': 'الإنجليزية القديمة',
            French: 'الفرنسية',
            'Old French': 'الفرنسية القديمة',
            Germanic: 'الجرمانية',
            Sanskrit: 'السنسكريتية',
            Arabic: 'العربية',
            Hebrew: 'العبرية',
            Norse: 'الإسكندنافية'
          },
          Hebrew: {
            Latin: 'לטינית',
            Greek: 'יוונית',
            'Old English': 'אנגלית עתיקה',
            French: 'צרפתית',
            'Old French': 'צרפתית עתיקה',
            Germanic: 'גרמאנית',
            Sanskrit: 'סנסקריט',
            Arabic: 'ערבית',
            Hebrew: 'עברית',
            Norse: 'נורדית'
          },
          Hindi: {
            Latin: 'लैटिन',
            Greek: 'ग्रीक',
            'Old English': 'पुरानी अंग्रेज़ी',
            French: 'फ्रेंच',
            Germanic: 'जर्मेनिक',
            Sanskrit: 'संस्कृत',
            Arabic: 'अरबी',
            Hebrew: 'हिब्रू',
            Norse: 'नॉर्स'
          },
          Chinese: {
            Latin: '拉丁语',
            Greek: '希腊语',
            'Old English': '古英语',
            French: '法语',
            'Old French': '古法语',
            Germanic: '日耳曼语',
            'Proto-Germanic': '原始日耳曼语',
            Sanskrit: '梵语',
            Arabic: '阿拉伯语',
            Hebrew: '希伯来语',
            Norse: '北欧语',
            'Old Norse': '古诺尔斯语'
          },
          Japanese: {
            Latin: 'ラテン語',
            Greek: 'ギリシャ語',
            'Old English': '古英語',
            French: 'フランス語',
            'Old French': '古フランス語',
            Germanic: 'ゲルマン語',
            Sanskrit: 'サンスクリット語',
            Arabic: 'アラビア語',
            Hebrew: 'ヘブライ語',
            Norse: 'ノルド語',
            'Old Norse': '古ノルド語'
          },
          Korean: {
            Latin: '라틴어',
            Greek: '그리스어',
            'Old English': '고대 영어',
            French: '프랑스어',
            'Old French': '고대 프랑스어',
            Germanic: '게르만어',
            Sanskrit: '산스크리트어',
            Arabic: '아랍어',
            Hebrew: '히브리어',
            Norse: '노르드어',
            'Old Norse': '고대 노르드어'
          },
          Vietnamese: {
            Latin: 'tiếng La-tinh',
            Greek: 'tiếng Hy Lạp',
            'Old English': 'tiếng Anh cổ',
            French: 'tiếng Pháp',
            'Old French': 'tiếng Pháp cổ',
            Germanic: 'tiếng Giéc-manh',
            Sanskrit: 'tiếng Phạn',
            Arabic: 'tiếng Ả Rập',
            Hebrew: 'tiếng Hê-brơ'
          },
          Turkish: {
            Latin: 'Latince',
            Greek: 'Yunanca',
            'Old English': 'Eski İngilizce',
            French: 'Fransızca',
            'Old French': 'Eski Fransızca',
            Germanic: 'Germence',
            Sanskrit: 'Sanskritçe',
            Arabic: 'Arapça',
            Hebrew: 'İbranice',
            Norse: 'Norsça',
            'Old Norse': 'Eski Norsça'
          },
          Swahili: {
            Latin: 'Kilatini',
            Greek: 'Kigiriki',
            'Old English': 'Kiingereza cha Kale',
            French: 'Kifaransa',
            Germanic: 'Kijerumani',
            Arabic: 'Kiarabu',
            Hebrew: 'Kiebrania'
          },
          Somali: {
            Latin: 'Laatiin',
            Greek: 'Giriig',
            'Old English': 'Ingiriisi qadiim ah',
            French: 'Faransiis',
            Arabic: 'Carabi',
            Hebrew: 'Cibraani'
          },
          Tagalog: {
            Latin: 'Latin',
            Greek: 'Griyego',
            'Old English': 'Lumang Ingles',
            French: 'Pranses',
            Germanic: 'Germaniko',
            Arabic: 'Arabe',
            Hebrew: 'Hebreo'
          }
        };
        const localizeRoot = function (r) {
          var langLocalized = r.langByLocale && r.langByLocale[lang] || ORIGIN_LANG_LOCALIZED[lang] && ORIGIN_LANG_LOCALIZED[lang][r.lang] || r.lang || '';
          var meaningLocalized = r.meaningByLang && r.meaningByLang[lang] || r.meaning || '';
          return {
            langLocalized: langLocalized,
            meaningLocalized: meaningLocalized
          };
        };
        const validRootsL = Array.isArray(item.roots) ? item.roots.filter(r => r && typeof r.root === 'string' && r.root.trim()) : [];
        if (hasOwnProse) {
          return /*#__PURE__*/React.createElement("details", {
            className: "mt-1 text-xs w-full",
            dir: isRtlLang(lang) ? 'rtl' : 'ltr'
          }, /*#__PURE__*/React.createElement("summary", {
            className: "cursor-pointer text-indigo-700 font-medium hover:text-indigo-900 select-none text-center"
          }, "📜 ", rootsLabel), /*#__PURE__*/React.createElement("div", {
            className: "mt-1 pl-3 border-l-2 border-indigo-200 space-y-2"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex items-start gap-1"
          }, /*#__PURE__*/React.createElement("p", {
            className: "text-slate-700 leading-relaxed italic flex-1 not-italic"
          }, etyLangProse), /*#__PURE__*/React.createElement("button", {
            onClick: () => handleUncachedGlossarySpeak(etyLangProse, `etym-${idx}-${lang}`, glossaryHasBaseMetadata(generatedContent, item) ? lang : undefined),
            disabled: isGeneratingAudio && playingContentId !== `etym-${idx}-${lang}`,
            className: `min-h-11 min-w-11 inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${playingContentId === `etym-${idx}-${lang}` ? 'text-red-700 bg-red-50' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`,
            "aria-label": rootsLabel
          }, playingContentId === `etym-${idx}-${lang}` && isGeneratingAudio ? /*#__PURE__*/React.createElement(RefreshCw, {
            size: 12,
            className: "animate-spin motion-reduce:animate-none"
          }) : /*#__PURE__*/React.createElement(Volume2, {
            size: 12
          }))), validRootsL.length > 0 && /*#__PURE__*/React.createElement("div", {
            role: "group",
            className: "space-y-1.5",
            "aria-label": t('glossary.etymology_roots_label') || 'Source roots',
            dir: "ltr"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex flex-wrap gap-1.5 justify-center"
          }, validRootsL.map((r, ri) => {
            const relatedL = Array.isArray(r.related) ? r.related.filter(w => typeof w === 'string' && w.trim()) : [];
            const _loc = localizeRoot(r);
            const _langLoc = _loc.langLocalized;
            const _meaningLoc = _loc.meaningLocalized;
            return /*#__PURE__*/React.createElement("button", {
              key: ri,
              type: "button",
              onClick: () => handleUncachedGlossarySpeak(`${r.root}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? '. ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`, `root-${idx}-${lang}-${ri}`),
              title: `${_langLoc || ''}${relatedL.length > 0 ? (_langLoc ? ' · ' : '') + relatedLabel + ' ' + relatedL.join(', ') : ''}`.trim(),
              className: "inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-indigo-900",
              "aria-label": `${r.root}${_langLoc ? ' (' + _langLoc + ')' : ''}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? ', ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`
            }, /*#__PURE__*/React.createElement("span", {
              className: "font-bold"
            }, r.root), _langLoc && /*#__PURE__*/React.createElement("span", {
              className: "text-[10px] text-indigo-600/80 uppercase tracking-wide"
            }, _langLoc), _meaningLoc && /*#__PURE__*/React.createElement("span", {
              className: "text-slate-600"
            }, "= ", _meaningLoc));
          })), (() => {
            const allRelL = [];
            const seenL = new Set();
            validRootsL.forEach(r => {
              if (Array.isArray(r.related)) r.related.forEach(w => {
                const k = String(w || '').trim();
                if (k && !seenL.has(k.toLowerCase())) {
                  seenL.add(k.toLowerCase());
                  allRelL.push(k);
                }
              });
            });
            if (allRelL.length === 0) return null;
            return /*#__PURE__*/React.createElement("div", {
              className: "text-[11px] text-slate-600 leading-snug pl-1"
            }, /*#__PURE__*/React.createElement("span", {
              className: "font-semibold text-slate-700"
            }, relatedLabel), " ", allRelL.slice(0, 6).map((w, wi) => /*#__PURE__*/React.createElement("span", {
              key: wi
            }, wi > 0 && /*#__PURE__*/React.createElement("span", {
              className: "text-slate-600"
            }, ", "), /*#__PURE__*/React.createElement("span", {
              className: "font-medium text-indigo-800"
            }, w))));
          })())));
        }
        if (validRootsL.length > 0) {
          return /*#__PURE__*/React.createElement("details", {
            className: "mt-1 text-xs w-full",
            dir: isRtlLang(lang) ? 'rtl' : 'ltr'
          }, /*#__PURE__*/React.createElement("summary", {
            className: "cursor-pointer text-indigo-700 font-medium hover:text-indigo-900 select-none text-center"
          }, "📜 ", rootsLabel), /*#__PURE__*/React.createElement("div", {
            className: "mt-1 pl-3 border-l-2 border-indigo-200 space-y-2",
            dir: "ltr"
          }, /*#__PURE__*/React.createElement("div", {
            className: "flex flex-wrap gap-1.5 justify-center"
          }, validRootsL.map((r, ri) => {
            const relatedL = Array.isArray(r.related) ? r.related.filter(w => typeof w === 'string' && w.trim()) : [];
            const _loc = localizeRoot(r);
            const _langLoc = _loc.langLocalized;
            const _meaningLoc = _loc.meaningLocalized;
            return /*#__PURE__*/React.createElement("button", {
              key: ri,
              type: "button",
              onClick: () => handleUncachedGlossarySpeak(`${r.root}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? '. ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`, `root-${idx}-${lang}-${ri}`),
              title: `${_langLoc || ''}${relatedL.length > 0 ? (_langLoc ? ' · ' : '') + relatedLabel + ' ' + relatedL.join(', ') : ''}`.trim(),
              className: "inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-indigo-900",
              "aria-label": `${r.root}${_langLoc ? ' (' + _langLoc + ')' : ''}${_meaningLoc ? ', ' + _meaningLoc : ''}${relatedL.length > 0 ? ', ' + relatedLabel + ' ' + relatedL.join(', ') : ''}`
            }, /*#__PURE__*/React.createElement("span", {
              className: "font-bold"
            }, r.root), _langLoc && /*#__PURE__*/React.createElement("span", {
              className: "text-[10px] text-indigo-600/80 uppercase tracking-wide"
            }, _langLoc), _meaningLoc && /*#__PURE__*/React.createElement("span", {
              className: "text-slate-600"
            }, "= ", _meaningLoc));
          })), /*#__PURE__*/React.createElement("button", {
            hidden: !canEditGlossary,
            style: {
              display: canEditGlossary ? undefined : 'none'
            },
            onClick: () => handleGenerateTermEtymology(idx, item.term),
            disabled: isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx],
            "aria-busy": !!(isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx]),
            className: "mt-1 text-[11px] text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1",
            title: rootsLabel
          }, isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
            size: 10,
            className: "animate-spin motion-reduce:animate-none"
          }), " ", loadingLabel) : /*#__PURE__*/React.createElement(React.Fragment, null, "+ ", showLabel))));
        }
        if (includeEtymology || hasEnglishEty) {
          return /*#__PURE__*/React.createElement("button", {
            hidden: !canEditGlossary,
            style: {
              display: canEditGlossary ? undefined : 'none'
            },
            onClick: () => handleGenerateTermEtymology(idx, item.term),
            disabled: isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx],
            "aria-busy": !!(isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx]),
            className: "mt-1 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-wait flex items-center gap-1 justify-center",
            title: rootsLabel,
            dir: isRtlLang(lang) ? 'rtl' : 'ltr'
          }, isGeneratingEtymology[entryKey] || isGeneratingEtymology[idx] ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
            size: 12,
            className: "animate-spin motion-reduce:animate-none"
          }), " ", loadingLabel) : /*#__PURE__*/React.createElement(React.Fragment, null, "📜 ", showLabel));
        }
        return null;
      })()));
    }));
  }), filteredGlossaryData.length === 0 && /*#__PURE__*/React.createElement("tr", {
    role: "row"
  }, /*#__PURE__*/React.createElement("td", {
    role: "cell",
    colSpan: 2 + displayLanguages.length + (isEditingGlossary ? 1 : 0),
    className: "p-10 text-center text-slate-600"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl allo-empty-float select-none",
    "aria-hidden": "true"
  }, "📖"), generatedContent?.data.length === 0 ? /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-slate-700"
  }, t('glossary.no_terms')) : renderGlossaryEmptyState()))))))), renderGlossaryUndoNotice(),
  // ── Phonics popup (sibling) ──
  // Mirrors the simplified-view popup at view_simplified_module.js:784–865.
  // Renders only when the host has set phonicsData (via handlePhonicsClick),
  // and only when the active view is glossary so it doesn't double-render
  // alongside the simplified-view copy if both views were ever to coexist.
  phonicsData && activeView === 'glossary' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "fixed inset-0 z-[90]",
    onClick: closePhonics
  }), /*#__PURE__*/React.createElement("div", {
    ref: phonicsDialogRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "glossary-phonics-popup-title",
    tabIndex: -1,
    onKeyDown: e => containModalFocus(e, phonicsDialogRef.current, closePhonics),
    className: "fixed z-[100] bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none",
    style: {
      top: Math.min(window.innerHeight - 300, (phonicsData.y || 100) + 10) + 'px',
      left: Math.min(window.innerWidth - 300, (phonicsData.x || 100) - 20) + 'px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    id: "glossary-phonics-popup-title",
    className: "font-black text-emerald-900 text-2xl capitalize tracking-tight"
  }, phonicsData.word), /*#__PURE__*/React.createElement("button", {
    ref: phonicsCloseRef,
    type: "button",
    onClick: closePhonics,
    className: "min-h-11 min-w-11 inline-flex items-center justify-center text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 14,
    "aria-hidden": "true"
  }))), phonicsData.isLoading ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center py-6 gap-2 text-emerald-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider"
  }, t('glossary.popups.analyzing'))) : phonicsData.data ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-emerald-50 p-3 rounded-lg border border-emerald-100"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1"
  }, t('glossary.phonetic_spelling')), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-serif italic text-slate-700"
  }, "/", phonicsData.data.phoneticSpelling, "/")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('glossary.popups.replay') || t('common.volume'),
    onClick: function () {
      if (phonicsData.audioUrl) {
        var audio = new Audio(phonicsData.audioUrl);
        audio.playbackRate = voiceSpeed || 1;
        audio.play().catch(function () {});
      }
    },
    className: "bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95",
    title: t('glossary.popups.replay')
  }, /*#__PURE__*/React.createElement(Volume2, {
    size: 20,
    className: "fill-current"
  }))), renderPhonicsDictRow(phonicsData, t, playGlossaryDictionaryAudio), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-2 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
  }, t('glossary.popups.ipa')), /*#__PURE__*/React.createElement("div", {
    className: "font-mono text-sm text-slate-600"
  }, phonicsData.data.ipa)), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 p-2 rounded border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
  }, t('glossary.popups.syllables')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-0.5"
  }, (phonicsData.data.syllables || []).map(function (syl, i) {
    return /*#__PURE__*/React.createElement(React.Fragment, null, i > 0 && /*#__PURE__*/React.createElement("span", {
      className: "text-emerald-500 font-bold px-0.5",
      "aria-hidden": "true"
    }, "•"), /*#__PURE__*/React.createElement("span", {
      className: "bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm"
    }, glossaryAiText(syl)));
  }))))) : (() => {
    // Say WHY there is no AI help (turned off for the class, or the check
    // failed), keep the dictionary recording and IPA, and offer a retry
    // when one can work. It used to say only "Could not analyze word."
    var availability = typeof phonicsData.getAiAvailability === 'function' ? phonicsData.getAiAvailability() : null;
    var aiOff = window.__alloStudentAiDisabled === true || availability === 'disabled' || availability == null && phonicsData.aiStatus === 'disabled';
    var canRetry = !aiOff && availability !== 'unavailable' && typeof phonicsData.retry === 'function';
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-2 py-2",
      "data-phonics-status": aiOff ? 'ai-disabled' : 'error'
    }, /*#__PURE__*/React.createElement("p", {
      role: "status",
      className: "text-center text-slate-700 text-xs font-bold"
    }, aiOff ? glossaryText('glossary.popups.ai_disabled', 'AI pronunciation help is turned off for this class.') : phonicsData.aiErrorReason === 'timeout' ? glossaryText('glossary.popups.timeout', 'The pronunciation check took too long.') : t('glossary.popups.failed')), renderPhonicsDictRow(phonicsData, t, playGlossaryDictionaryAudio), canRetry && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-phonics-retry": "true",
      onClick: function () {
        phonicsData.retry();
      },
      className: "mx-auto flex min-h-11 items-center justify-center rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
    }, glossaryText('glossary.popups.retry', 'Try again')));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45"
  })))));
}
GlossaryView.translationFingerprint = glossaryTranslationFingerprint;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.GlossaryView = GlossaryView;
  window.AlloModules.ViewGlossaryModule = true;
})();
