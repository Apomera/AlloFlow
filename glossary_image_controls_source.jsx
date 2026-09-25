// Image changes use the host's resource/entry task, shared with AI generation.
// Mulberry is fetched only when its picker opens, a search is submitted, or a result is selected.
const GLOSSARY_IMAGE_TYPES = /^image\/(png|jpeg|gif|webp|avif)$/i;
function readGlossaryImageFile(file, signal, allowSvg = false) {
  if (!file || !(GLOSSARY_IMAGE_TYPES.test(file.type) || (allowSvg && file.type === 'image/svg+xml'))) return Promise.reject(new Error('Choose a PNG, JPEG, GIF, WebP, or AVIF image.'));
  if (!file.size || file.size > 10 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 10 MB.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const aborted = () => { reader.abort(); finish(new Error('Image replacement canceled.')); };
    const finish = (error, value) => {
      if (signal) signal.removeEventListener('abort', aborted);
      if (error) reject(error); else resolve(value);
    };
    reader.onload = () => typeof reader.result === 'string' && reader.result.startsWith('data:image/')
      ? finish(null, reader.result) : finish(new Error('The image could not be read. Try another file.'));
    reader.onerror = () => finish(new Error('The image could not be read. Try another file.'));
    if (signal?.aborted) { aborted(); return; }
    if (signal) signal.addEventListener('abort', aborted, { once: true });
    try { reader.readAsDataURL(file); } catch (_) { finish(new Error('The image could not be read. Try another file.')); }
  });
}
async function searchGlossaryMulberry(query, signal) {
  const q = String(query || '').trim();
  if (!q) return [];
  // The glossary's primary term column is English, independent of UI language.
  const response = await fetch('https://globalsymbols.com/api/v1/labels/search?query=' + encodeURIComponent(q) + '&symbolset=mulberry&language=eng&language_iso_format=639-3&limit=30', { signal });
  if (!response.ok) throw new Error('Mulberry search is unavailable. Please try again.');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Mulberry search returned an unexpected response.');
  const seen = new Set();
  return rows.flatMap(row => {
    const url = row?.picto?.image_url;
    if (typeof url !== 'string' || !/^https:\/\//i.test(url) || seen.has(url)) return [];
    seen.add(url);
    return [{ id: row.picto.id || row.id || url, label: String(row.text || q), url }];
  }).slice(0, 30);
}
async function prepareGlossaryMulberry(result, signal) {
  if (!/^https:\/\//i.test(result?.url || '')) throw new Error('This symbol has no usable image.');
  const response = await fetch(result.url, { signal });
  if (!response.ok) throw new Error('The symbol could not be downloaded. Please try again.');
  const source = await readGlossaryImageFile(await response.blob(), signal, true);
  // Rasterize SVGs for the same image editing/export paths as uploaded pictures.
  // Credit travels inside the image, including exports that copy only image bytes.
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    const stop = () => { img.src = ''; cleanup(); reject(new Error('Image replacement canceled.')); };
    const cleanup = () => { if (signal) signal.removeEventListener('abort', stop); };
    img.onload = () => { cleanup(); resolve(img); };
    img.onerror = () => { cleanup(); reject(new Error('The symbol image could not be opened.')); };
    if (signal?.aborted) { stop(); return; }
    if (signal) signal.addEventListener('abort', stop, { once: true });
    img.src = source;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 688;
  const ctx = canvas.getContext('2d');
  if (!ctx || !image.naturalWidth || !image.naturalHeight) throw new Error('The symbol image could not be opened.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 640, 688);
  const scale = Math.min(608 / image.naturalWidth, 608 / image.naturalHeight);
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, (640 - width) / 2, (640 - height) / 2, width, height);
  ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
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
    const stop = () => { img.src = ''; cleanup(); reject(new Error('Image replacement canceled.')); };
    const cleanup = () => { if (signal) signal.removeEventListener('abort', stop); };
    img.onload = () => { cleanup(); resolve(img); };
    img.onerror = () => { cleanup(); reject(new Error('The photo could not be opened.')); };
    if (signal?.aborted) { stop(); return; }
    if (signal) signal.addEventListener('abort', stop, { once: true });
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
  canvas.width = width; canvas.height = height + (credit.length ? 10 + credit.length * 17 : 0);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, width, height);
  ctx.fillStyle = '#334155'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
  credit.forEach((text, i) => ctx.fillText(text, width / 2, height + 20 + i * 17, width - 8));
  const photo = canvas.toDataURL('image/jpeg', 0.9);
  glossaryCreditBands.set(photo, canvas.height - height);
  return photo;
}
// The height of the credit band drawn under a prepared picture, by its data URL,
// read once by replace() so an AI refine can take the band off and redraw it.
const glossaryCreditBands = new Map();
function glossaryImageReplacement(image, attribution = null, extra = null) {
  return Object.assign({ image, imageAlt: '', imageAltHash: '', imageAltSource: '', imageDecorative: false,
    imageSource: attribution ? 'mulberry' : 'author-upload', imageAttribution: attribution, imageCreditBand: 0 }, extra || {});
}
// Capture only image fields: Undo must not roll back term/definition edits.
function glossaryImageSnapshot(item) {
  const snapshot = {};
  ['image', 'imageAlt', 'imageAltHash', 'imageAltSource', 'imageDecorative', 'imageSource', 'imageAttribution', 'imageCreditBand'].forEach(key => { snapshot[key] = item[key] ?? (key === 'imageDecorative' ? false : key === 'imageAttribution' ? null : ''); });
  return snapshot;
}
function glossaryImageDescriptionHash(image) {
  image = typeof image === 'string' ? image : '';
  let h = 0x811c9dc5;
  const mix = c => { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; };
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
  const first = controls[0], last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); dialog.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
}
// A failed preview must be visible and retryable before choosing a symbol.
function GlossaryMulberryResult({ result, term, working, buttonClass, onChoose }) {
  const [preview, setPreview] = React.useState('loading');
  const [attempt, setAttempt] = React.useState(0);
  const chooseRef = React.useRef(null), retryRef = React.useRef(null);
  React.useEffect(() => {
    if (!attempt) return;
    if (preview === 'ready') chooseRef.current?.focus();
    else if (preview === 'error') retryRef.current?.focus();
  }, [preview, attempt]);
  let previewUrl = result.url;
  if (attempt) { const url = new URL(result.url); url.searchParams.set('_alloflow_preview_retry', String(attempt)); previewUrl = url.href; }
  return <div className="min-w-0 rounded-lg border border-slate-300 bg-white p-2">
    <button ref={chooseRef} type="button" disabled={working || preview !== 'ready'} onClick={() => onChoose(previewUrl)} className={buttonClass + ' w-full'} aria-label={'Use ' + result.label + ' for ' + term}>
      <img key={attempt} src={previewUrl} alt="" onLoad={() => setPreview('ready')} onError={() => setPreview('error')} className={preview === 'error' ? 'hidden' : 'h-24 w-full object-contain bg-white'} loading="lazy" />
      {preview === 'error' && <span className="flex min-h-24 items-center justify-center text-xs text-slate-700">Preview unavailable</span>}
      <span className="block break-words">{result.label}</span>
    </button>
    {preview !== 'ready' && (preview === 'error' || attempt > 0) && <button ref={retryRef} type="button" className={buttonClass + ' mt-2 w-full'} disabled={working || preview === 'loading'} aria-label={'Retry preview for ' + result.label} onClick={() => { setPreview('loading'); setAttempt(value => value + 1); }}>{preview === 'loading' ? 'Retrying preview...' : 'Retry preview'}</button>}
  </div>;
}
function GlossaryImageControls({ item, index, canEdit, beginTask, onGenerate, generating = false, t }) {
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
  const text = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  React.useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; searchRef.current?.abort(); pendingRef.current?.cancel(); generationRef.current = null; };
  }, []);
  React.useEffect(() => {
    setDescription(glossaryCurrentDescription(item));
    if (focusDescriptionRef.current) { focusDescriptionRef.current = false; descriptionRef.current?.focus(); }
  }, [item.image, item.imageAlt, item.imageAltHash, item.imageDecorative]);
  React.useEffect(() => {
    if (!canEdit) closeDialog(false);
  }, [canEdit]);
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    // Native top-layer dialogs escape the table's overflow and make the app inert.
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
    dialog.querySelector('button')?.focus();
    return () => { if (typeof dialog.close === 'function' && dialog.open) dialog.close(); };
  }, [open]);
  React.useEffect(() => { if (open && mode === 'mulberry') searchInputRef.current?.focus(); }, [open, mode]);
  function stopSearch() { searchRef.current?.abort(); searchRef.current = null; setSearching(false); }
  function closeDialog(restoreFocus = true) {
    stopSearch(); pendingRef.current?.cancel(); pendingRef.current = null;
    if (!generationRef.current) setBusy(false);
    if (dialogRef.current?.open && typeof dialogRef.current.close === 'function') dialogRef.current.close();
    setOpen(false); setMode('choices');
    if (restoreFocus) openerRef.current?.focus();
  }
  function openDialog() {
    setMode('choices'); setError(''); setStatus(''); setOpen(true);
  }
  async function search(value = query) {
    const q = String(value || '').trim();
    if (!q) return;
    stopSearch();
    const controller = new AbortController(); searchRef.current = controller;
    setSearching(true); setError(''); setStatus(''); setResults([]);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const found = await searchGlossaryMulberry(q, controller.signal);
      if (!mountedRef.current || searchRef.current !== controller) return;
      setResults(found); setStatus(found.length ? found.length + ' symbols found. Choose an image that fits the definition.' : 'No symbols found. Try a simpler word.');
    } catch (_) {
      if (mountedRef.current && searchRef.current === controller) setError('Mulberry search is unavailable. Check your connection and try again.');
    } finally {
      clearTimeout(timeout);
      if (mountedRef.current && searchRef.current === controller) { searchRef.current = null; setSearching(false); }
    }
  }
  function openMulberry() { setMode('mulberry'); setQuery(item.term || ''); search(item.term); }
  function recordReplacement(before, image) {
    setUndo({ before, afterImage: image }); setDescription(''); setMode('choices'); stopSearch();
    setStatus('Image updated. You can add a description or undo this change.');
    focusDescriptionRef.current = true;
  }
  async function replace(load, attribution, extraFor) {
    if (!canEdit || typeof beginTask !== 'function' || working) return;
    const before = glossaryImageSnapshot(item);
    const task = beginTask(index);
    if (!task) return;
    pendingRef.current = task; setBusy(true); setError(''); setStatus('');
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; task.cancel(); }, 20000);
    try {
      const image = await load(task.signal);
      if (!task.isCurrent()) { if (mountedRef.current && task.isOwner()) setError('The term changed while the image loaded. Please try again.'); return; }
      const creditBand = glossaryCreditBands.get(image) || 0;
      glossaryCreditBands.delete(image);
      const saved = task.commit(() => glossaryImageReplacement(image, attribution, Object.assign({ imageCreditBand: creditBand }, typeof extraFor === 'function' ? extraFor(image) : null)));
      if (mountedRef.current) {
        if (saved) recordReplacement(before, image);
        else setError('The term changed while the image loaded. Please try again.');
      }
    } catch (err) {
      if (mountedRef.current && pendingRef.current === task && (task.isOwner() || timedOut)) setError(timedOut ? 'The image took too long to load. Please try again.' : err.message || 'The image could not be loaded.');
    } finally {
      clearTimeout(timeout); task.finish();
      if (pendingRef.current === task) { pendingRef.current = null; if (mountedRef.current) setBusy(false); }
    }
  }
  async function generate() {
    if (!onGenerate || working) return;
    const before = glossaryImageSnapshot(item), token = {};
    generationRef.current = token; stopSearch(); setBusy(true); setError(''); setStatus('');
    try {
      const image = await onGenerate(index, item.term);
      if (!mountedRef.current || generationRef.current !== token) return;
      if (typeof image === 'string' && image) recordReplacement(before, image);
      else setError('The image was not changed. You can try again or choose another source.');
    } catch (_) {
      if (mountedRef.current && generationRef.current === token) setError('The image could not be generated. Please try again.');
    } finally {
      if (generationRef.current === token) { generationRef.current = null; if (mountedRef.current) setBusy(false); }
    }
  }
  function undoReplacement() {
    if (!canUndo || working || !beginTask) return;
    const task = beginTask(index);
    if (!task) return;
    const saved = task.commit(() => undo.before); task.finish();
    if (saved) { setUndo(null); setError(''); setStatus('Previous image restored.'); setDescription(glossaryCurrentDescription(undo.before)); }
    else setError('The term changed. Reopen the image picker to try again.');
  }
  function saveDescription() {
    if (!item.image || working || !beginTask) return;
    const task = beginTask(index);
    if (!task) return;
    const saved = task.commit(() => ({ imageAlt: description.trim(), imageAltHash: glossaryImageDescriptionHash(item.image), imageAltSource: 'author', imageDecorative: false })); task.finish();
    if (saved) { setError(''); setStatus('Image description saved.'); }
    else setError('The image changed. Reopen the image picker before describing it.');
  }
  function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!GLOSSARY_IMAGE_TYPES.test(file.type)) { setError('Choose a PNG, JPEG, GIF, WebP, or AVIF image.'); return; }
    if (!file.size || file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); return; }
    replace(signal => readGlossaryImageFile(file, signal), null);
  }
  if (!canEdit) return null;
  const buttonClass = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  const feedback = <>{working && <p role="status" className="text-sm text-slate-700">{text('glossary.images.loading', 'Loading image...')}</p>}{status && <p role="status" className="text-sm text-slate-700">{status}</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</>;
  return <div className="mt-2 space-y-2 print:hidden" data-glossary-image-controls="true">
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" className="hidden" aria-label={'Upload image for ' + item.term} onChange={upload} />
    <div className="flex flex-wrap justify-center gap-2">
      <button ref={openerRef} type="button" className={buttonClass} disabled={!beginTask} aria-haspopup="dialog" aria-label={'Change image for ' + item.term} onClick={openDialog}>{text('glossary.images.change', 'Change image')}</button>
      {canUndo && !open && <button type="button" className={buttonClass} disabled={working} onClick={undoReplacement}>{text('common.undo', 'Undo')}</button>}
    </div>
    {!open && feedback}
    {!open && item.image && descriptionDirty && <p className="text-xs text-slate-600">{text('glossary.images.unsaved_description', 'Unsaved image description draft')}</p>}
    {open && <dialog ref={dialogRef} tabIndex={-1} aria-modal="true" aria-labelledby={dialogTitleId} onCancel={event => { event.preventDefault(); closeDialog(); }} onKeyDown={event => { containGlossaryImageDialogFocus(event); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeDialog(); } }} className="fixed inset-0 m-auto max-w-none rounded-xl border border-slate-300 bg-white p-4 text-left text-slate-800 shadow-2xl backdrop:bg-slate-900/60" style={{ width: 'min(40rem, calc(100vw - 2rem))', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
      <div className="flex items-start justify-between gap-3">
        <h2 id={dialogTitleId} className="min-w-0 break-words text-lg font-bold">{text('glossary.images.change', 'Change image')}: {item.term}</h2>
        <button type="button" className={buttonClass + ' shrink-0'} onClick={() => closeDialog()}>{text('common.close', 'Close')}</button>
      </div>
      <p className="mt-2 break-words text-sm text-slate-600">{item.def}</p>
      <div className="my-4 flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={working || !beginTask} aria-describedby={uploadHelpId} onClick={() => inputRef.current?.click()}>{text('glossary.images.upload', 'Upload image')}</button>
        <button type="button" className={buttonClass} disabled={working || !beginTask} aria-pressed={mode === 'mulberry'} onClick={openMulberry}>{text('glossary.images.mulberry', 'Find Mulberry symbol')}</button>
        <button type="button" className={buttonClass} disabled={working || !beginTask} aria-pressed={mode === 'photos'} onClick={() => { stopSearch(); setError(''); setStatus(''); setMode('photos'); }}>{text('glossary.images.photo', 'Find photo')}</button>
        <button type="button" className={buttonClass} disabled={working || !onGenerate} onClick={generate}>{text('glossary.images.generate', 'Generate image')}</button>
      </div>
      <p id={uploadHelpId} className="mb-4 text-xs text-slate-600">{text('glossary.images.upload_help', 'Upload PNG, JPEG, GIF, WebP, or AVIF images, up to 10 MB.')}</p>
      {mode === 'mulberry' ? <section aria-label={'Mulberry symbols for ' + item.term}>
        <form onSubmit={event => { event.preventDefault(); search(); }} className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-semibold">{text('glossary.images.search_label', 'Search Mulberry symbols')}<input ref={searchInputRef} type="search" value={query} onChange={event => { stopSearch(); setQuery(event.target.value); setResults([]); setStatus(''); setError(''); }} className="mt-1 min-h-11 w-full min-w-0 rounded border border-slate-400 bg-white px-2 text-sm text-slate-800" /></label>
          <button type="submit" className={buttonClass} disabled={searching || working || !query.trim()}>{text('common.search', 'Search')}</button>
        </form>
        {searching && <p role="status" className="mt-2 text-sm text-slate-700">{text('glossary.images.searching', 'Searching Mulberry...')}</p>}
        <div className="my-3 grid grid-cols-2 sm:grid-cols-3 gap-2" aria-busy={searching || working}>
          {results.map(result => <GlossaryMulberryResult key={result.url} result={result} term={item.term} working={working} buttonClass={buttonClass} onChoose={previewUrl => replace(signal => prepareGlossaryMulberry({ ...result, url: previewUrl }, signal), { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Global Symbols', url: result.url, label: result.label })} />)}
        </div>
        <p className="my-3 text-xs text-slate-700"><a className="underline" href="https://globalsymbols.com/symbolsets/mulberry" target="_blank" rel="noopener noreferrer">Mulberry Symbols by Steve Lee</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Credit is included in saved images.</p>
        <button type="button" className={buttonClass} onClick={() => { stopSearch(); setMode('choices'); setStatus(''); setError(''); }}>{text('glossary.images.back', 'Back to current image')}</button>
      </section> : mode === 'photos' ? <section aria-label={'Photos for ' + item.term}>
        {window.AlloModules && window.AlloModules.ClassroomImagePicker
          ? React.createElement(window.AlloModules.ClassroomImagePicker, {
            idPrefix: 'glossary-photo-' + index, initialQuery: item.term, sources: ['photos'], t,
            onChoose: choice => replace(signal => prepareGlossaryPhoto(choice, signal), choice.attribution, image => ({
              imageSource: 'wikimedia', imageAlt: choice.alt || '', imageAltSource: choice.alt ? 'vision' : '',
              imageAltHash: choice.alt ? glossaryImageDescriptionHash(image) : '',
            })),
          })
          : <p role="status" className="text-sm text-slate-700">{text('glossary.images.photos_loading', 'Photo search is still loading. Try again in a moment.')}</p>}
        <button type="button" className={buttonClass + ' mt-3'} onClick={() => { setMode('choices'); setStatus(''); setError(''); }}>{text('glossary.images.back', 'Back to current image')}</button>
      </section> : <div className="space-y-3">
        {item.image ? <><img src={item.image} alt={glossaryCurrentDescription(item)} className="mx-auto max-h-48 max-w-full rounded border border-slate-300 bg-white object-contain" />
          <label className="block text-sm font-semibold">{text('glossary.images.description', 'Image description (alt text, optional)')}<textarea ref={descriptionRef} value={description} onChange={event => setDescription(event.target.value)} disabled={working} aria-describedby={descriptionHelpId} rows={3} maxLength={2000} className="mt-1 w-full rounded border border-slate-400 bg-white p-2 text-sm text-slate-800" /></label>
          <p id={descriptionHelpId} className="text-xs text-slate-600">{text('glossary.images.description_help', 'This is the image’s alt text for screen readers. Describe the visual details that help explain the term.')}</p>
          <button type="button" className={buttonClass} disabled={working || !descriptionDirty} onClick={saveDescription}>{text('glossary.images.save_description', 'Save description')}</button>
          {descriptionDirty && <p className="text-xs text-slate-600">{text('glossary.images.draft_help', 'Your draft is kept when you close this picker. Choose Save description to apply it.')}</p>}
        </> : <p className="text-sm text-slate-600">{text('glossary.images.no_image', 'Choose an image source above to add a picture.')}</p>}
      </div>}
      <div className="mt-4 space-y-2">{feedback}{canUndo && <button type="button" className={buttonClass} disabled={working} onClick={undoReplacement}>{text('common.undo', 'Undo')}</button>}</div>
    </dialog>}
  </div>;
}
