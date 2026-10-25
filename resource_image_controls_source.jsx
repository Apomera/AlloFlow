// Shared authoring controls address the fields consumed by views/exporters.
const RESOURCE_IMAGE_FIELDS = new Set(['image', 'imageUrl', 'iconUrl', 'visualImage', 'avatarUrl', 'portrait', 'sceneImage', 'leftImageUrl', 'rightImageUrl', 'coverImage', 'backgroundImage', 'referenceImage', 'imageSrc']);
const _riGet = (value, path) => path.reduce((node, key) => node == null ? undefined : node[key], value);
function _riSet(value, path, next) {
  if (!path.length) return next;
  const [key, ...rest] = path;
  if (['__proto__', 'constructor', 'prototype'].includes(String(key))) return value;
  const copy = Array.isArray(value) ? value.slice() : (value == null && typeof key === 'number' ? [] : { ...(value || {}) });
  copy[key] = _riSet(copy[key], rest, next);
  return copy;
}
const _riLabel = node => String(node?.term || node?.word || node?.label || node?.title || node?.name || node?.event || node?.question || node?.caption || (typeof node?.content === 'string' ? node.content : '') || '').slice(0, 140);
const _riIdentity = node => String(node?.entryId || node?.glossaryEntryId || node?.id || node?.term || node?.word || node?.name || node?.event || node?.question || node?.label || '');
function _riImageStamp(image) { let hash = 2166136261; for (let i = 0; i < image.length; i++) hash = Math.imul(hash ^ image.charCodeAt(i), 16777619); return image.length + ':' + (hash >>> 0); }
function resourceImageSlots(resource) {
  if (!resource || typeof resource !== 'object') return [];
  const slots = [], seen = new Set();
  const htmlSlots = (html, path) => {
    if (!/<(?:img|figure)\b/i.test(html) || typeof DOMParser === 'undefined') return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = [...doc.querySelectorAll('img, figure[data-img-placeholder]')].filter(node => node.tagName === 'IMG' || !node.querySelector('img'));
    nodes.forEach((node, htmlIndex) => {
      const key = JSON.stringify(path) + ':html:' + htmlIndex;
      const ownerId = node.id || node.parentElement?.id || 'html-' + htmlIndex + ':' + _riImageStamp((node.parentElement?.textContent || '').slice(0, 500));
      slots.push({ key, path, field: 'html', htmlIndex, htmlSource: html, ownerId, value: node.getAttribute('src') || '', alt: node.getAttribute('alt') || node.getAttribute('data-allo-alt') || '', label: node.getAttribute('alt') || node.getAttribute('data-allo-alt') || 'Document image ' + (htmlIndex + 1) });
    });
  };
  const add = (path, label, altKey) => {
    const key = JSON.stringify(path);
    if (seen.has(key)) return;
    const value = _riGet(resource, path), owner = _riGet(resource, path.slice(0, -1));
    if (value != null && typeof value !== 'string') return;
    seen.add(key);
    const field = path[path.length - 1];
    const altField = altKey || (field === 'iconUrl' ? 'iconAlt' : field === 'visualImage' ? 'visualAlt' : ['glossary', 'word-sounds', 'concept-sort'].includes(resource.type) ? 'imageAlt' : resource.type === 'timeline' || path.includes('panels') ? 'alt' : ('alt' in (owner || {}) ? 'alt' : 'altText'));
    const ownerId = path.map((_, index) => index ? _riIdentity(_riGet(resource, path.slice(0, index))) : '').filter(Boolean).join('|');
    slots.push({ key, path, field, ownerId, label: label || _riLabel(owner) || 'Image ' + (slots.length + 1),
      value: value || '', alt: String(owner?.[altField] || ''), altField });
  };
  const entries = (array, path, field, label) => (Array.isArray(array) ? array : []).forEach((entry, i) => {
    if (entry && typeof entry === 'object') add([...path, i, field], _riLabel(entry) || label + ' ' + (i + 1));
  });
  const data = resource.data;
  if (['glossary', 'word-sounds'].includes(resource.type)) entries(data, ['data'], 'image', 'Word');
  if (resource.type === 'word-sounds' && (!Array.isArray(data) || !data.length)) entries(resource.wsPreloadedWords, ['wsPreloadedWords'], 'image', 'Word');
  if (['timeline', 'concept-sort'].includes(resource.type)) entries(data?.items, ['data', 'items'], 'image', 'Item');
  if (resource.type === 'anchor-chart') entries(data?.sections, ['data', 'sections'], 'iconUrl', 'Section');
  if (resource.type === 'memory-aid') entries(data?.cards, ['data', 'cards'], 'visualImage', 'Memory aid');
  if (resource.type === 'applied-challenge') add(['data', 'visual', 'image'], 'Scenario illustration', 'alt');
  if (resource.type === 'image') {
    if (data?.visualPlan?.panels?.length) entries(data.visualPlan.panels, ['data', 'visualPlan', 'panels'], 'imageUrl', 'Panel');
    else add(['data', 'imageUrl'], 'Lesson image', 'altText');
  }
  if (resource.type === 'quiz') (data?.questions || []).forEach((q, i) => {
    add(['data', 'questions', i, 'imageUrl'], 'Question ' + (i + 1), 'imageAltText');
    (q.options || []).forEach((option, j) => add(['data', 'questions', i, 'optionImageUrls', j], 'Question ' + (i + 1) + ' — choice ' + (j + 1)));
  });
  if (resource.type === 'adventure') {
    add(['data', 'sceneImage'], 'Current scene', 'sceneImageAlt');
    entries(data?.characters, ['data', 'characters'], 'portrait', 'Character');
    entries(data?.inventory, ['data', 'inventory'], 'image', 'Inventory');
  }
  if (resource.type === 'persona') entries(Array.isArray(data) ? data : data?.characters, Array.isArray(data) ? ['data'] : ['data', 'characters'], 'avatarUrl', 'Character');
  // Existing fields in other schemas (DBQ, diagrams, cards, document blocks).
  // Do not walk backups, credits, or drawing internals.
  const visit = (node, path, depth) => {
    if (typeof node === 'string') { htmlSlots(node, path); return; }
    if (!node || typeof node !== 'object' || depth > 18) return;
    Object.entries(node).forEach(([key, value]) => {
      if (['originalImage', 'imageAssets', 'whiteboardScene', 'imageAttribution', 'sourceSnapshot', 'annotations', 'frames', 'imageCache'].includes(key)) return;
      const next = [...path, Array.isArray(node) ? Number(key) : key];
      if (RESOURCE_IMAGE_FIELDS.has(key) || (key === 'src' && /image|figure|picture/.test(node.type || node.kind || ''))) {
        if (value && typeof value === 'object') visit(value, next, depth + 1);
        else if (!(resource.type === 'image' && path.length === 1 && key === 'imageUrl' && data?.visualPlan?.panels?.length)) add(next);
      } else if (['images', 'optionImageUrls', 'answerImageUrls', 'evidenceImageUrls'].includes(key) && value && typeof value === 'object') {
        Object.keys(value).forEach(id => add([...next, Array.isArray(value) ? Number(id) : id], _riLabel(node) || 'Image ' + id));
      } else if (typeof value === 'object' || (typeof value === 'string' && /<(?:img|figure)\b/i.test(value))) visit(value, next, depth + 1);
    });
  };
  visit(data, ['data'], 0);
  return slots;
}

function replaceResourceImage(resource, slot, result) {
  if (!resource || !slot || !result) return resource;
  const live = resourceImageSlots(resource).find(item => item.key === slot.key);
  if (!live || live.value !== slot.value || live.ownerId !== slot.ownerId) return resource;
  if (slot.field === 'html' && live.htmlSource !== slot.htmlSource) return resource;
  const image = result.dataUrl === slot.value ? slot.value : normalizeRasterDataUrl(result.dataUrl);
  if (!image) return resource;
  let next;
  if (slot.field === 'html') {
    const html = _riGet(resource, slot.path), doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = [...doc.querySelectorAll('img, figure[data-img-placeholder]')].filter(node => node.tagName === 'IMG' || !node.querySelector('img'));
    const node = nodes[slot.htmlIndex]; if (!node) return resource;
    const img = node.tagName === 'IMG' ? node : doc.createElement('img');
    img.setAttribute('src', image); img.setAttribute('alt', String(result.alt || '').slice(0, 1600));
    if (node !== img) {
      img.style.maxWidth = '100%';
      const container = node.querySelector('[id$="-container"]');
      if (container) container.replaceChildren(img);
      else { [...node.childNodes].filter(child => child.nodeName !== 'FIGCAPTION').forEach(child => child.remove()); node.insertBefore(img, node.firstChild); }
    }
    next = _riSet(resource, slot.path, /<!doctype|<html\b/i.test(html) ? '<!DOCTYPE html>\n' + doc.documentElement.outerHTML : doc.body.innerHTML);
  } else next = _riSet(resource, slot.path, image);
  const parentPath = slot.path.slice(0, -1), owner = _riGet(next, parentPath);
  const alt = String(result.alt || '').slice(0, 1600);
  if (slot.field !== 'html' && owner && !Array.isArray(owner) && parentPath[parentPath.length - 1] !== 'images') {
    const cleaned = { ...owner, [slot.altField]: alt, imageSource: image === slot.value ? owner.imageSource : result.scene ? 'author-drawing' : 'author-upload', altSource: alt ? 'user' : '', altHash: '', decorative: false };
    if (image !== slot.value) ['imageAttribution', 'imageCreditBand', 'whiteboardScene'].forEach(key => delete cleaned[key]);
    if (slot.altField === 'imageAlt') Object.assign(cleaned, { imageAlt: alt, imageAltSource: alt ? 'author' : '', imageAltHash: '', imageDecorative: false });
    if (slot.field === 'imageUrl' && parentPath.includes('panels')) { delete cleaned.frames; delete cleaned.motionSteps; cleaned.failed = false; }
    if (slot.field === 'visualImage') Object.assign(cleaned, { visualSource: 'uploaded', visualKind: 'image', visualStatus: 'ready', visualAlt: alt, visualAltSource: alt ? 'user' : '', visualNeedsReview: true, visualReview: { status: 'pending' } });
    if (resource.type === 'applied-challenge') Object.assign(cleaned, { source: 'uploaded', reviewed: false });
    if (slot.field === 'portrait') Object.assign(cleaned, { isUserUploaded: true, uploadConsent: true, isGenerating: false });
    next = _riSet(next, parentPath, cleaned);
  }
  if (resource.type === 'image' && parentPath.includes('panels') && slot.path[3] === 0) next = _riSet(next, ['data', 'imageUrl'], image);
  if (['optionImageUrls', 'answerImageUrls', 'evidenceImageUrls'].includes(parentPath[parentPath.length - 1])) {
    next = _riSet(next, [...parentPath.slice(0, -1), parentPath[parentPath.length - 1].replace('Urls', 'AltTexts'), slot.field], alt);
  }
  if (resource.type === 'word-sounds' && Array.isArray(resource.wsPreloadedWords) && slot.path[0] === 'data') {
    const original = resource.data[slot.path[1]];
    next.wsPreloadedWords = resource.wsPreloadedWords.map(word => {
      if (_riIdentity(word) !== _riIdentity(original)) return word;
      const updated = { ...word, image, imageAlt: alt, imageAltSource: 'author', imageAltHash: '', imageDecorative: false, imageSource: result.scene ? 'author-drawing' : 'author-upload' };
      if (image !== slot.value) ['imageAttribution', 'imageCreditBand', 'whiteboardScene'].forEach(key => delete updated[key]);
      return updated;
    });
  }
  const imageAssets = { ...(next.imageAssets || {}) };
  const updatedSlot = resourceImageSlots(next).find(item => item.key === slot.key);
  imageAssets[slot.key] = { ownerId: updatedSlot?.ownerId || slot.ownerId, imageStamp: _riImageStamp(image), alt, scene: result.scene || null };
  return { ...next, imageAssets };
}

function validResourceDrawingScene(scene) {
  if (!scene || !Array.isArray(scene.elements) || scene.elements.length > 5000) return false;
  if (scene.elements.some(element => !element || ['embeddable', 'iframe', 'magicframe'].includes(element.type))) return false;
  if (Object.values(scene.files || {}).some(file => !file || !normalizeRasterDataUrl(file.dataURL, 2 * 1024 * 1024))) return false;
  try { return JSON.stringify(scene).length <= 2 * 1024 * 1024; } catch (_) { return false; }
}

// Same-origin Whiteboard only. A separate channel, source window and one-time
// token bind the reply to its slot; it never creates an extra history resource.
function openResourceDrawing({ scene, title, onSave, onCancel, onError }) {
  if (!/^https?:$/.test(window.location.protocol) || window.location.origin === 'null') {
    onError?.(new Error('Open AlloFlow in its browser or desktop app to draw here. You can also upload an exported drawing.')); return () => {};
  }
  const token = window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const base = window.location.origin;
  const url = new URL('./whiteboard/whiteboard.html', window.location.href); url.search = '?imageSlot=' + encodeURIComponent(token);
  const popup = window.open(url.href, '_blank', 'width=1120,height=800');
  if (!popup) { onError?.(new Error('Allow pop-ups for AlloFlow, then choose Draw again.')); return () => {}; }
  let done = false, saving = false, connected = false, cancelRequested = false;
  const post = payload => { try { popup.postMessage({ ...payload, token }, base); } catch (_) {} };
  const cleanup = () => { done = true; window.removeEventListener('message', receive); clearInterval(closedTimer); clearTimeout(connectTimer); };
  const receive = async event => {
    if (done || event.source !== popup || event.origin !== base || event.data?.token !== token) return;
    const data = event.data;
    if (data.type === 'alloasset-hello') { connected = true; clearTimeout(connectTimer); post({ type: 'alloasset-ack', title, scene: validResourceDrawingScene(scene) ? scene : null }); return; }
    if (data.type === 'alloasset-closed') { cleanup(); onCancel?.(); return; }
    if (data.type !== 'alloasset-save' || saving) return;
    saving = true;
    try {
      const png = normalizeRasterDataUrl(data.png);
      if (!png || !validResourceDrawingScene(data.scene)) throw Error('The drawing is too large to save as an editable image. Remove large embedded photos and try again.');
      const accepted = await onSave({ dataUrl: png, scene: data.scene });
      if (done) return;
      if (accepted === false) throw Error('This image changed while the drawing was open. Export your drawing or reopen the image slot.');
      post({ type: 'alloasset-saved' }); cleanup();
    } catch (error) { post({ type: 'alloasset-error', message: error.message }); onError?.(error); }
    finally { saving = false; if (cancelRequested && !done) { post({ type: 'alloasset-disconnected' }); cleanup(); } }
  };
  window.addEventListener('message', receive);
  const closedTimer = setInterval(() => { if (popup.closed) { cleanup(); onCancel?.(); } }, 700);
  const connectTimer = setTimeout(() => { if (!connected && !done) { cleanup(); onError?.(Error('The Whiteboard could not connect. Check your connection and try again.')); } }, 30000);
  popup.focus?.();
  return () => { if (saving) { cancelRequested = true; return; } if (!done) { post({ type: 'alloasset-disconnected' }); cleanup(); } };
}

function ResourceImageInput({ label = 'Image', value = '', scene, alt = '', disabled = false, onApply }) {
  const [editor, setEditor] = React.useState(null), [description, setDescription] = React.useState(alt);
  const [message, setMessage] = React.useState(''), [busy, setBusy] = React.useState(false);
  const alive = React.useRef(true), cancelDrawing = React.useRef(null), trigger = React.useRef(null);
  const disabledRef = React.useRef(disabled); disabledRef.current = disabled;
  const descriptionRef = React.useRef(description); descriptionRef.current = description;
  React.useEffect(() => { setDescription(alt); }, [alt, value]);
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; cancelDrawing.current?.(); }; }, []);
  const finish = async result => {
    if (!alive.current || disabledRef.current) return false;
    const accepted = await onApply({ ...result, alt: descriptionRef.current });
    if (!alive.current) return accepted !== false;
    if (accepted === false) { setMessage('This image changed. Reopen its controls and try again.'); return false; }
    setEditor(null); setMessage('Image saved.'); setBusy(false); trigger.current?.focus(); return true;
  };
  const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50';
  return <section className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900" data-resource-image-input>
    <h4 className="mb-2 font-bold">{label}</h4>
    {value && <img src={value} alt={alt || ''} className="mb-3 max-h-40 max-w-full rounded object-contain" />}
    <label className="block text-sm">Image description
      <textarea value={description} maxLength={1600} disabled={disabled || busy} onChange={event => setDescription(event.target.value)} className="mt-1 block min-h-16 w-full rounded border border-slate-400 p-2" />
    </label>
    <div className="my-2 flex flex-wrap gap-2">
      <ImageAssetPicker label="Upload image" disabled={disabled || busy} onLoaded={result => { setEditor(result); setMessage(''); }} onError={error => setMessage(error.message)} />
      <button ref={trigger} type="button" className={button} disabled={disabled || busy} onClick={() => {
        cancelDrawing.current?.();
        setBusy(true); setMessage('Draw in the Whiteboard, then choose Use drawing.');
        cancelDrawing.current = openResourceDrawing({ scene, title: label, onSave: finish,
          onCancel: () => { if (alive.current) { setBusy(false); setMessage('Drawing closed.'); trigger.current?.focus(); } },
          onError: error => { if (alive.current) { setBusy(false); setMessage(error.message); } } });
      }}>{scene ? 'Edit drawing' : 'Draw with Excalidraw'}</button>
      {value && <button type="button" className={button} disabled={disabled || busy} onClick={() => finish({ dataUrl: value, scene }).catch(error => setMessage(error.message))}>Save description</button>}
    </div>
    {editor && <ImageAssetEditor sourceDataUrl={editor.dataUrl} onApply={result => finish(result).catch(error => setMessage(error.message))} onCancel={() => { setEditor(null); trigger.current?.focus(); }} />}
    <p className="text-sm text-slate-700" role="status">{message}</p>
  </section>;
}

function ResourceImagesPanel({ resource, onUpdateResource, disabled = false, instanceId = '' }) {
  const [open, setOpen] = React.useState(false);
  const current = React.useRef(resource); current.current = resource;
  const slots = resourceImageSlots(resource);
  const [enabled, setEnabled] = React.useState(window.AlloImageGeneration.isEnabled);
  React.useEffect(() => window.AlloImageGeneration.subscribe(setEnabled), []);
  if (!slots.length) return null;
  return <div className="no-print mb-4 rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900" data-resource-images>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 rounded px-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">Resource images ({slots.length}) — upload or draw</button>
    {!enabled && <p className="px-2 text-sm text-slate-600">AI image generation is off. Add your own images below.</p>}
    {open && <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {slots.map(slot => {
        const saved = resource.imageAssets?.[slot.key];
        const ownsSaved = saved?.imageStamp === _riImageStamp(slot.value) && saved?.ownerId === slot.ownerId;
        const scene = ownsSaved ? saved.scene : (resource.type === 'image' && slot.path.length === 2 ? resource.data?.whiteboardScene : null);
        return <ResourceImageInput key={slot.key + ':' + slot.ownerId} label={slot.label} value={slot.value} alt={ownsSaved ? saved.alt : slot.alt} scene={scene} disabled={disabled}
          onApply={result => {
            const live = resourceImageSlots(current.current).find(item => item.key === slot.key);
            if (!live || live.value !== slot.value || live.ownerId !== slot.ownerId) return false;
            if (slot.field === 'html' && live.htmlSource !== slot.htmlSource) return false;
            return onUpdateResource(resource.id, previous => replaceResourceImage(previous, slot, result), { instanceId });
          }} />;
      })}
    </div>}
  </div>;
}
