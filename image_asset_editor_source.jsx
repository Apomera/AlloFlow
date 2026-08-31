const IMAGE_ASSET_ACCEPT = 'image/png,image/jpeg,image/webp';
const IMAGE_ASSET_MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_ASSET_MAX_SOURCE_CHARS = 15 * 1024 * 1024;
const IMAGE_ASSET_MAX_OUTPUT_CHARS = 6 * 1024 * 1024;
const IMAGE_ASSET_MAX_PIXELS = 40 * 1000 * 1000;

const IMAGE_ASSET_ASPECTS = Object.freeze({
  square: Object.freeze({ label: 'Square (1:1)', ratio: 1 }),
  landscape: Object.freeze({ label: 'Landscape (4:3)', ratio: 4 / 3 }),
  wide: Object.freeze({ label: 'Wide (16:9)', ratio: 16 / 9 }),
  portrait: Object.freeze({ label: 'Portrait (4:5)', ratio: 4 / 5 }),
});

const _iaeString = (value, max = 1000) => String(value == null ? '' : value).slice(0, max);
const _iaeClamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function _iaeError(message, code) {
  const error = new Error(message);
  error.code = code || 'image-asset-error';
  return error;
}

function _iaeCanonicalMime(value) {
  const mime = _iaeString(value, 80).trim().toLowerCase();
  if (mime === 'image/jpg' || mime === 'image/jpeg') return 'image/jpeg';
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/webp') return 'image/webp';
  return '';
}

function _iaeMimeFromName(value) {
  const name = _iaeString(value, 500).trim().toLowerCase();
  if (/\.png$/.test(name)) return 'image/png';
  if (/\.jpe?g$/.test(name)) return 'image/jpeg';
  if (/\.webp$/.test(name)) return 'image/webp';
  return '';
}

function normalizeImageAssetSettings(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const mode = raw.mode === 'crop' ? 'crop' : 'fit';
  const aspect = mode === 'crop' && Object.prototype.hasOwnProperty.call(IMAGE_ASSET_ASPECTS, raw.aspect)
    ? raw.aspect
    : (mode === 'crop' ? 'square' : 'original');
  return {
    mode,
    aspect,
    zoom: mode === 'crop' ? Math.round(_iaeClamp(raw.zoom, 100, 250, 100)) : 100,
    focalX: mode === 'crop' ? Math.round(_iaeClamp(raw.focalX, 0, 100, 50)) : 50,
    focalY: mode === 'crop' ? Math.round(_iaeClamp(raw.focalY, 0, 100, 50)) : 50,
  };
}

function validateImageAssetFile(file, options) {
  const maxFileBytes = Math.max(1, Number(options && options.maxFileBytes) || IMAGE_ASSET_MAX_FILE_BYTES);
  if (!file || typeof file !== 'object') {
    return { ok: false, code: 'missing-file', message: 'Choose an image file first.', mime: '' };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, code: 'empty-file', message: 'That image file is empty or could not be read.', mime: '' };
  }
  if (size > maxFileBytes) {
    return { ok: false, code: 'file-too-large', message: 'Choose an image smaller than 10 MB.', mime: '' };
  }
  const declared = _iaeCanonicalMime(file.type);
  const declaredRaw = _iaeString(file.type, 80).trim();
  if (declaredRaw && !declared) {
    return { ok: false, code: 'unsupported-type', message: 'Use a PNG, JPEG, or WebP image.', mime: '' };
  }
  const mime = declared || _iaeMimeFromName(file.name);
  if (!mime) {
    return { ok: false, code: 'unsupported-type', message: 'Use a PNG, JPEG, or WebP image.', mime: '' };
  }
  return {
    ok: true,
    code: '',
    message: '',
    mime,
    name: _iaeString(file.name, 500).trim() || 'image',
    size,
  };
}

function _iaeDecodeBase64Prefix(payload) {
  try {
    const decoder = typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob.bind(window)
      : (typeof atob === 'function' ? atob : null);
    if (!decoder) return [];
    let prefix = payload.slice(0, 32);
    prefix = prefix.slice(0, prefix.length - (prefix.length % 4));
    if (!prefix) return [];
    const decoded = decoder(prefix);
    const bytes = [];
    for (let index = 0; index < decoded.length; index += 1) bytes.push(decoded.charCodeAt(index));
    return bytes;
  } catch (_) {
    return [];
  }
}

function _iaeHasRasterSignature(mime, payload) {
  const bytes = _iaeDecodeBase64Prefix(payload);
  if (mime === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/webp') {
    return bytes.length >= 12
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

function normalizeRasterDataUrl(value, maxChars) {
  const source = _iaeString(value, Math.max(100, Number(maxChars) || IMAGE_ASSET_MAX_SOURCE_CHARS) + 1).trim();
  const match = source.match(/^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/i);
  if (!match) return '';
  const mime = _iaeCanonicalMime(match[1]);
  const payload = match[2].replace(/\s+/g, '');
  const limit = Math.max(100, Number(maxChars) || IMAGE_ASSET_MAX_SOURCE_CHARS);
  if (!mime || !payload || payload.length > limit || payload.length % 4 !== 0) return '';
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || !_iaeHasRasterSignature(mime, payload)) return '';
  const normalized = 'data:' + mime + ';base64,' + payload;
  return normalized.length <= limit ? normalized : '';
}

function imageAssetMime(value) {
  const normalized = normalizeRasterDataUrl(value, IMAGE_ASSET_MAX_SOURCE_CHARS);
  const match = normalized.match(/^data:(image\/(?:png|jpeg|webp));base64,/i);
  return match ? match[1].toLowerCase() : '';
}

function readImageAssetFile(file, options) {
  const validation = validateImageAssetFile(file, options);
  if (!validation.ok) return Promise.reject(_iaeError(validation.message, validation.code));
  if (typeof FileReader !== 'function') {
    return Promise.reject(_iaeError('Image reading is unavailable in this browser.', 'reader-unavailable'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(_iaeError('That image could not be read. Try a different file.', 'read-failed'));
    reader.onload = () => {
      let result = _iaeString(reader.result, IMAGE_ASSET_MAX_SOURCE_CHARS + 1000);
      if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(result)) {
        result = result.replace(/^data:[^;,]*;base64,/i, 'data:' + validation.mime + ';base64,');
      }
      const dataUrl = normalizeRasterDataUrl(result, IMAGE_ASSET_MAX_SOURCE_CHARS);
      if (!dataUrl || imageAssetMime(dataUrl) !== validation.mime) {
        reject(_iaeError('The file contents do not match a supported PNG, JPEG, or WebP image.', 'signature-mismatch'));
        return;
      }
      resolve({
        dataUrl,
        mime: validation.mime,
        name: validation.name,
        size: validation.size,
      });
    };
    try {
      reader.readAsDataURL(file);
    } catch (_) {
      reject(_iaeError('That image could not be read. Try a different file.', 'read-failed'));
    }
  });
}

function computeImageAssetTargetSize(sourceWidth, sourceHeight, settingsValue, options) {
  const width = Math.max(1, Number(sourceWidth) || 1);
  const height = Math.max(1, Number(sourceHeight) || 1);
  const settings = normalizeImageAssetSettings(settingsValue);
  const maxDimension = Math.max(1, Math.round(Number(options && options.maxDimension) || 1280));
  if (settings.mode === 'fit') {
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  }
  const ratio = IMAGE_ASSET_ASPECTS[settings.aspect].ratio;
  if (ratio >= 1) {
    const targetWidth = Math.max(1, Math.min(maxDimension, width, height * ratio));
    return { width: Math.max(1, Math.round(targetWidth)), height: Math.max(1, Math.round(targetWidth / ratio)) };
  }
  const targetHeight = Math.max(1, Math.min(maxDimension, height, width / ratio));
  return { width: Math.max(1, Math.round(targetHeight * ratio)), height: Math.max(1, Math.round(targetHeight)) };
}

function computeImageAssetDrawRect(sourceWidth, sourceHeight, targetWidth, targetHeight, settingsValue) {
  const sourceW = Math.max(1, Number(sourceWidth) || 1);
  const sourceH = Math.max(1, Number(sourceHeight) || 1);
  const targetW = Math.max(1, Number(targetWidth) || 1);
  const targetH = Math.max(1, Number(targetHeight) || 1);
  const settings = normalizeImageAssetSettings(settingsValue);
  if (settings.mode === 'fit') {
    const scale = Math.min(targetW / sourceW, targetH / sourceH);
    const drawWidth = sourceW * scale;
    const drawHeight = sourceH * scale;
    return {
      dx: (targetW - drawWidth) / 2,
      dy: (targetH - drawHeight) / 2,
      dw: drawWidth,
      dh: drawHeight,
    };
  }
  const scale = Math.max(targetW / sourceW, targetH / sourceH) * (settings.zoom / 100);
  const drawWidth = sourceW * scale;
  const drawHeight = sourceH * scale;
  const drawX = -(drawWidth - targetW) * (settings.focalX / 100);
  const drawY = -(drawHeight - targetH) * (settings.focalY / 100);
  return {
    dx: Object.is(drawX, -0) ? 0 : drawX,
    dy: Object.is(drawY, -0) ? 0 : drawY,
    dw: drawWidth,
    dh: drawHeight,
  };
}

function _iaeLoadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    if (typeof Image !== 'function') {
      reject(_iaeError('Image editing is unavailable in this browser.', 'image-unavailable'));
      return;
    }
    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth || image.width || 0);
      const height = Number(image.naturalHeight || image.height || 0);
      if (!width || !height || width * height > IMAGE_ASSET_MAX_PIXELS) {
        reject(_iaeError('That image is too large to edit safely. Try a smaller image.', 'pixel-limit'));
        return;
      }
      resolve({ image, width, height });
    };
    image.onerror = () => reject(_iaeError('That image could not be decoded. Try a different file.', 'decode-failed'));
    image.src = dataUrl;
  });
}

async function renderImageAsset(value, settingsValue, options) {
  const source = normalizeRasterDataUrl(value, IMAGE_ASSET_MAX_SOURCE_CHARS);
  if (!source) throw _iaeError('The selected image is not a supported raster image.', 'invalid-source');
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw _iaeError('Image editing is unavailable in this browser.', 'canvas-unavailable');
  }
  const decoded = await _iaeLoadImage(source);
  const settings = normalizeImageAssetSettings(settingsValue);
  const requestedMax = Math.max(256, Math.min(2048, Math.round(Number(options && options.maxDimension) || 1280)));
  const maxOutputChars = Math.max(1000, Number(options && options.maxOutputChars) || IMAGE_ASSET_MAX_OUTPUT_CHARS);
  const attempts = [
    { maxDimension: requestedMax, quality: 0.9 },
    { maxDimension: Math.max(256, Math.round(requestedMax * 0.8)), quality: 0.8 },
    { maxDimension: Math.max(256, Math.round(requestedMax * 0.62)), quality: 0.72 },
    { maxDimension: Math.max(256, Math.round(requestedMax * 0.46)), quality: 0.64 },
  ];

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const target = computeImageAssetTargetSize(decoded.width, decoded.height, settings, attempt);
    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext('2d');
    if (!context) throw _iaeError('Image editing is unavailable in this browser.', 'canvas-unavailable');
    context.clearRect(0, 0, target.width, target.height);
    context.imageSmoothingEnabled = true;
    try { context.imageSmoothingQuality = 'high'; } catch (_) {}
    const draw = computeImageAssetDrawRect(decoded.width, decoded.height, target.width, target.height, settings);
    context.drawImage(decoded.image, draw.dx, draw.dy, draw.dw, draw.dh);
    const rendered = canvas.toDataURL('image/webp', attempt.quality);
    const dataUrl = normalizeRasterDataUrl(rendered, maxOutputChars);
    if (dataUrl) {
      return {
        dataUrl,
        mime: imageAssetMime(dataUrl),
        width: target.width,
        height: target.height,
        settings,
      };
    }
  }
  throw _iaeError('The edited image is still too large to save. Try a smaller source image.', 'output-too-large');
}

let _iaePickerId = 0;

function ImageAssetPicker(props) {
  const idRef = React.useRef('');
  if (!idRef.current) idRef.current = props.id || 'image-asset-picker-' + String(++_iaePickerId);
  const inputId = idRef.current;
  const helpId = inputId + '-help';
  const errorId = inputId + '-error';
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const readFile = typeof props.readFile === 'function' ? props.readFile : readImageAssetFile;

  const handleChange = async (event) => {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await readFile(file, { maxFileBytes: props.maxFileBytes || IMAGE_ASSET_MAX_FILE_BYTES });
      if (typeof props.onLoaded === 'function') props.onLoaded(result);
    } catch (reason) {
      const message = _iaeString(reason && reason.message, 500) || 'That image could not be opened.';
      setError(message);
      if (typeof props.onError === 'function') props.onError(reason);
    } finally {
      setBusy(false);
      try { input.value = ''; } catch (_) {}
    }
  };

  return (
    <div className={props.className || ''} data-image-asset-picker="true" aria-busy={busy}>
      <label htmlFor={inputId} className="block text-xs font-black text-slate-700">{props.label || 'Upload an image from this device'}</label>
      <input
        id={inputId}
        type="file"
        accept={IMAGE_ASSET_ACCEPT}
        disabled={!!props.disabled || busy}
        onChange={handleChange}
        aria-describedby={helpId + (error ? ' ' + errorId : '')}
        className="mt-1 block min-h-11 w-full cursor-pointer rounded-xl border border-fuchsia-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-fuchsia-100 file:px-3 file:py-2 file:font-black file:text-fuchsia-900 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p id={helpId} className="mt-1 text-xs leading-relaxed text-slate-600">PNG, JPEG, or WebP; up to 10 MB. The file is processed in this browser, and only the resized result is saved with the resource.</p>
      {busy && <p role="status" className="mt-1 text-xs font-bold text-fuchsia-900">Reading image…</p>}
      {error && <p id={errorId} role="alert" className="mt-1 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

function ImageAssetEditor(props) {
  const headingRef = React.useRef('');
  if (!headingRef.current) headingRef.current = 'image-asset-editor-' + String(++_iaePickerId);
  const [settings, setSettings] = React.useState(() => normalizeImageAssetSettings(props.initialSettings));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const source = normalizeRasterDataUrl(props.sourceDataUrl, IMAGE_ASSET_MAX_SOURCE_CHARS);
  const renderer = typeof props.renderImageAsset === 'function' ? props.renderImageAsset : renderImageAsset;

  React.useEffect(() => {
    setSettings(normalizeImageAssetSettings(props.initialSettings));
    setError('');
  }, [props.sourceDataUrl]);

  const patchSettings = (patch) => setSettings(current => normalizeImageAssetSettings(Object.assign({}, current, patch)));
  const apply = async () => {
    if (!source) return;
    setBusy(true);
    setError('');
    try {
      const result = await renderer(source, settings, {
        maxDimension: props.maxDimension || 1280,
        maxOutputChars: props.maxOutputChars || IMAGE_ASSET_MAX_OUTPUT_CHARS,
      });
      const rawDataUrl = typeof result === 'string' ? result : result && result.dataUrl;
      const dataUrl = normalizeRasterDataUrl(rawDataUrl, props.maxOutputChars || IMAGE_ASSET_MAX_OUTPUT_CHARS);
      if (!dataUrl) throw _iaeError('The edited image could not be saved safely.', 'invalid-output');
      if (typeof props.onApply === 'function') {
        props.onApply(Object.assign({}, result && typeof result === 'object' ? result : {}, {
          dataUrl,
          mime: imageAssetMime(dataUrl),
          settings: normalizeImageAssetSettings(settings),
        }));
      }
    } catch (reason) {
      const message = _iaeString(reason && reason.message, 500) || 'The image could not be edited.';
      setError(message);
      if (typeof props.onError === 'function') props.onError(reason);
    } finally {
      setBusy(false);
    }
  };

  if (!source) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">The selected image cannot be edited. Choose a PNG, JPEG, or WebP file.</p>;
  }

  const aspect = settings.mode === 'crop' ? IMAGE_ASSET_ASPECTS[settings.aspect].ratio : 4 / 3;
  const previewImageStyle = settings.mode === 'crop'
    ? {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: settings.focalX + '% ' + settings.focalY + '%',
        transform: 'scale(' + String(settings.zoom / 100) + ')',
        transformOrigin: settings.focalX + '% ' + settings.focalY + '%',
      }
    : { width: '100%', height: '100%', objectFit: 'contain' };

  return (
    <section className="rounded-2xl border-2 border-fuchsia-300 bg-white p-4" aria-labelledby={headingRef.current} aria-busy={busy}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 id={headingRef.current} className="text-sm font-black text-fuchsia-950">Position your visual</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">Fit keeps the whole image. Crop fills a chosen frame and lets you move the point of focus.</p>
        </div>
        {props.sourceName && <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{_iaeString(props.sourceName, 120)}</span>}
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-100" style={{ aspectRatio: String(aspect) }}>
          <img src={source} alt={props.previewAlt || 'Preview of the image being positioned'} className="block" style={previewImageStyle} />
        </div>

        <div className="space-y-3">
          <fieldset>
            <legend className="text-xs font-black text-slate-800">Image treatment</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800">
                <input type="radio" name={headingRef.current + '-mode'} checked={settings.mode === 'fit'} onChange={() => patchSettings({ mode: 'fit' })} />
                Fit whole image
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800">
                <input type="radio" name={headingRef.current + '-mode'} checked={settings.mode === 'crop'} onChange={() => patchSettings({ mode: 'crop', aspect: 'square' })} />
                Crop to frame
              </label>
            </div>
          </fieldset>

          {settings.mode === 'crop' && (
            <React.Fragment>
              <label className="block text-xs font-black text-slate-700">Frame shape
                <select value={settings.aspect} onChange={(event) => patchSettings({ aspect: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600">
                  {Object.keys(IMAGE_ASSET_ASPECTS).map(key => <option key={key} value={key}>{IMAGE_ASSET_ASPECTS[key].label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-black text-slate-700">Zoom <output className="font-medium">{settings.zoom}%</output>
                <input type="range" min="100" max="250" step="5" value={settings.zoom} onChange={(event) => patchSettings({ zoom: event.target.value })} aria-label="Image zoom" className="mt-1 block min-h-11 w-full accent-fuchsia-700" />
              </label>
              <label className="block text-xs font-black text-slate-700">Horizontal focus <output className="font-medium">{settings.focalX}%</output>
                <input type="range" min="0" max="100" step="5" value={settings.focalX} onChange={(event) => patchSettings({ focalX: event.target.value })} aria-label="Horizontal image focus" className="mt-1 block min-h-11 w-full accent-fuchsia-700" />
              </label>
              <label className="block text-xs font-black text-slate-700">Vertical focus <output className="font-medium">{settings.focalY}%</output>
                <input type="range" min="0" max="100" step="5" value={settings.focalY} onChange={(event) => patchSettings({ focalY: event.target.value })} aria-label="Vertical image focus" className="mt-1 block min-h-11 w-full accent-fuchsia-700" />
              </label>
              <button type="button" onClick={() => setSettings(normalizeImageAssetSettings({ mode: 'crop', aspect: settings.aspect }))} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600">Center and reset zoom</button>
            </React.Fragment>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={apply} disabled={busy} className="min-h-11 rounded-xl bg-fuchsia-700 px-4 py-2 text-sm font-black text-white hover:bg-fuchsia-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600 focus-visible:ring-offset-2">{busy ? 'Preparing image…' : 'Use edited image'}</button>
        <button type="button" onClick={() => typeof props.onCancel === 'function' && props.onCancel()} disabled={busy} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">Cancel</button>
      </div>
    </section>
  );
}
