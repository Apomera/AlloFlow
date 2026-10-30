/** AlloFlow shared raster asset editor. Generated from image_asset_editor_source.jsx. */
(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ImageAssetEditorModule) { console.log('[CDN] ImageAssetEditorModule already loaded, skipping'); return; }
var React = window.React;
if (!React) { console.error('[ImageAssetEditor] React not found on window'); return; }
const IMAGE_ASSET_ACCEPT = "image/png,image/jpeg,image/webp";
const IMAGE_ASSET_MAX_FILE_BYTES = 10 * 1024 * 1024;
const IMAGE_ASSET_MAX_SOURCE_CHARS = 15 * 1024 * 1024;
const IMAGE_ASSET_MAX_OUTPUT_CHARS = 6 * 1024 * 1024;
const IMAGE_ASSET_MAX_PIXELS = 40 * 1e3 * 1e3;
const AI_IMAGE_PREFERENCE_KEY = "alloflow_ai_image_generation_enabled";
function readAiImagePreference() {
  try {
    return localStorage.getItem(AI_IMAGE_PREFERENCE_KEY) !== "false";
  } catch (_) {
    return true;
  }
}
if (!window.AlloImageGeneration) {
  let enabled = readAiImagePreference(), revision = 0, controller = new AbortController();
  if (!enabled) controller.abort();
  const listeners = /* @__PURE__ */ new Set();
  const notify = () => {
    revision++;
    if (!enabled) controller.abort();
    else if (controller.signal.aborted) controller = new AbortController();
    listeners.forEach((fn) => fn(enabled));
  };
  window.AlloImageGeneration = {
    isEnabled: () => enabled,
    revision: () => revision,
    signalFor(signal) {
      if (!signal) return controller.signal;
      if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, controller.signal]);
      const combined = new AbortController(), policySignal = controller.signal;
      const abort = () => {
        combined.abort();
        signal.removeEventListener("abort", abort);
        policySignal.removeEventListener("abort", abort);
      };
      signal.addEventListener("abort", abort, { once: true });
      policySignal.addEventListener("abort", abort, { once: true });
      if (signal.aborted || policySignal.aborted) abort();
      return combined.signal;
    },
    setEnabled(value) {
      enabled = value !== false;
      try {
        localStorage.setItem(AI_IMAGE_PREFERENCE_KEY, String(enabled));
      } catch (_) {
      }
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
  window.addEventListener("storage", (event) => {
    if (event.key === AI_IMAGE_PREFERENCE_KEY || event.key === null) {
      enabled = readAiImagePreference();
      notify();
    }
  });
}
function AiImageGenerationToggle() {
  const policy = window.AlloImageGeneration;
  const [enabled, setEnabled] = React.useState(policy.isEnabled);
  React.useEffect(() => policy.subscribe(setEnabled), [policy]);
  const helpId = React.useId();
  return /* @__PURE__ */ React.createElement("div", { className: "mt-3", "data-help-key": "universal_image_generation" }, /* @__PURE__ */ React.createElement("label", { className: "flex min-h-11 items-center gap-3 text-sm font-bold text-slate-800" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "checkbox",
      role: "switch",
      checked: enabled,
      "aria-describedby": helpId,
      onChange: (event) => policy.setEnabled(event.target.checked),
      className: "h-5 w-5 accent-indigo-600"
    }
  ), "Allow AI image generation"), /* @__PURE__ */ React.createElement("p", { id: helpId, className: "mt-1 text-xs text-slate-600" }, "Remembered on this device. When off, new AI pictures and AI image edits are skipped across resources. You can still upload images, draw, and use existing pictures."));
}
const IMAGE_ASSET_ASPECTS = Object.freeze({
  square: Object.freeze({ label: "Square (1:1)", ratio: 1 }),
  landscape: Object.freeze({ label: "Landscape (4:3)", ratio: 4 / 3 }),
  wide: Object.freeze({ label: "Wide (16:9)", ratio: 16 / 9 }),
  portrait: Object.freeze({ label: "Portrait (4:5)", ratio: 4 / 5 })
});
const _iaeString = (value, max = 1e3) => String(value == null ? "" : value).slice(0, max);
const _iaeClamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
function _iaeError(message, code) {
  const error = new Error(message);
  error.code = code || "image-asset-error";
  return error;
}
function _iaeCanonicalMime(value) {
  const mime = _iaeString(value, 80).trim().toLowerCase();
  if (mime === "image/jpg" || mime === "image/jpeg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  return "";
}
function _iaeMimeFromName(value) {
  const name = _iaeString(value, 500).trim().toLowerCase();
  if (/\.png$/.test(name)) return "image/png";
  if (/\.jpe?g$/.test(name)) return "image/jpeg";
  if (/\.webp$/.test(name)) return "image/webp";
  return "";
}
function normalizeImageAssetSettings(value) {
  const raw = value && typeof value === "object" ? value : {};
  const mode = raw.mode === "crop" ? "crop" : "fit";
  const aspect = mode === "crop" && Object.prototype.hasOwnProperty.call(IMAGE_ASSET_ASPECTS, raw.aspect) ? raw.aspect : mode === "crop" ? "square" : "original";
  return {
    mode,
    aspect,
    zoom: mode === "crop" ? Math.round(_iaeClamp(raw.zoom, 100, 250, 100)) : 100,
    focalX: mode === "crop" ? Math.round(_iaeClamp(raw.focalX, 0, 100, 50)) : 50,
    focalY: mode === "crop" ? Math.round(_iaeClamp(raw.focalY, 0, 100, 50)) : 50
  };
}
function validateImageAssetFile(file, options) {
  const maxFileBytes = Math.max(1, Number(options && options.maxFileBytes) || IMAGE_ASSET_MAX_FILE_BYTES);
  if (!file || typeof file !== "object") {
    return { ok: false, code: "missing-file", message: "Choose an image file first.", mime: "" };
  }
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, code: "empty-file", message: "That image file is empty or could not be read.", mime: "" };
  }
  if (size > maxFileBytes) {
    return { ok: false, code: "file-too-large", message: "Choose an image smaller than 10 MB.", mime: "" };
  }
  const declared = _iaeCanonicalMime(file.type);
  const declaredRaw = _iaeString(file.type, 80).trim();
  if (declaredRaw && !declared) {
    return { ok: false, code: "unsupported-type", message: "Use a PNG, JPEG, or WebP image.", mime: "" };
  }
  const mime = declared || _iaeMimeFromName(file.name);
  if (!mime) {
    return { ok: false, code: "unsupported-type", message: "Use a PNG, JPEG, or WebP image.", mime: "" };
  }
  return {
    ok: true,
    code: "",
    message: "",
    mime,
    name: _iaeString(file.name, 500).trim() || "image",
    size
  };
}
function _iaeDecodeBase64Prefix(payload) {
  try {
    const decoder = typeof window !== "undefined" && typeof window.atob === "function" ? window.atob.bind(window) : typeof atob === "function" ? atob : null;
    if (!decoder) return [];
    let prefix = payload.slice(0, 32);
    prefix = prefix.slice(0, prefix.length - prefix.length % 4);
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
  if (mime === "image/png") {
    return bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  }
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/webp") {
    return bytes.length >= 12 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80;
  }
  return false;
}
function normalizeRasterDataUrl(value, maxChars) {
  const source = _iaeString(value, Math.max(100, Number(maxChars) || IMAGE_ASSET_MAX_SOURCE_CHARS) + 1).trim();
  const match = source.match(/^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/i);
  if (!match) return "";
  const mime = _iaeCanonicalMime(match[1]);
  const payload = match[2].replace(/\s+/g, "");
  const limit = Math.max(100, Number(maxChars) || IMAGE_ASSET_MAX_SOURCE_CHARS);
  if (!mime || !payload || payload.length > limit || payload.length % 4 !== 0) return "";
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || !_iaeHasRasterSignature(mime, payload)) return "";
  const normalized = "data:" + mime + ";base64," + payload;
  return normalized.length <= limit ? normalized : "";
}
function imageAssetMime(value) {
  const normalized = normalizeRasterDataUrl(value, IMAGE_ASSET_MAX_SOURCE_CHARS);
  const match = normalized.match(/^data:(image\/(?:png|jpeg|webp));base64,/i);
  return match ? match[1].toLowerCase() : "";
}
function readImageAssetFile(file, options) {
  const validation = validateImageAssetFile(file, options);
  if (!validation.ok) return Promise.reject(_iaeError(validation.message, validation.code));
  if (typeof FileReader !== "function") {
    return Promise.reject(_iaeError("Image reading is unavailable in this browser.", "reader-unavailable"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(_iaeError("That image could not be read. Try a different file.", "read-failed"));
    reader.onload = () => {
      let result = _iaeString(reader.result, IMAGE_ASSET_MAX_SOURCE_CHARS + 1e3);
      if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(result)) {
        result = result.replace(/^data:[^;,]*;base64,/i, "data:" + validation.mime + ";base64,");
      }
      const dataUrl = normalizeRasterDataUrl(result, IMAGE_ASSET_MAX_SOURCE_CHARS);
      if (!dataUrl || imageAssetMime(dataUrl) !== validation.mime) {
        reject(_iaeError("The file contents do not match a supported PNG, JPEG, or WebP image.", "signature-mismatch"));
        return;
      }
      resolve({
        dataUrl,
        mime: validation.mime,
        name: validation.name,
        size: validation.size
      });
    };
    try {
      reader.readAsDataURL(file);
    } catch (_) {
      reject(_iaeError("That image could not be read. Try a different file.", "read-failed"));
    }
  });
}
function computeImageAssetTargetSize(sourceWidth, sourceHeight, settingsValue, options) {
  const width = Math.max(1, Number(sourceWidth) || 1);
  const height = Math.max(1, Number(sourceHeight) || 1);
  const settings = normalizeImageAssetSettings(settingsValue);
  const maxDimension = Math.max(1, Math.round(Number(options && options.maxDimension) || 1280));
  if (settings.mode === "fit") {
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
  if (settings.mode === "fit") {
    const scale2 = Math.min(targetW / sourceW, targetH / sourceH);
    const drawWidth2 = sourceW * scale2;
    const drawHeight2 = sourceH * scale2;
    return {
      dx: (targetW - drawWidth2) / 2,
      dy: (targetH - drawHeight2) / 2,
      dw: drawWidth2,
      dh: drawHeight2
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
    dh: drawHeight
  };
}
function _iaeLoadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    if (typeof Image !== "function") {
      reject(_iaeError("Image editing is unavailable in this browser.", "image-unavailable"));
      return;
    }
    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth || image.width || 0);
      const height = Number(image.naturalHeight || image.height || 0);
      if (!width || !height || width * height > IMAGE_ASSET_MAX_PIXELS) {
        reject(_iaeError("That image is too large to edit safely. Try a smaller image.", "pixel-limit"));
        return;
      }
      resolve({ image, width, height });
    };
    image.onerror = () => reject(_iaeError("That image could not be decoded. Try a different file.", "decode-failed"));
    image.src = dataUrl;
  });
}
async function renderImageAsset(value, settingsValue, options) {
  const source = normalizeRasterDataUrl(value, IMAGE_ASSET_MAX_SOURCE_CHARS);
  if (!source) throw _iaeError("The selected image is not a supported raster image.", "invalid-source");
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    throw _iaeError("Image editing is unavailable in this browser.", "canvas-unavailable");
  }
  const decoded = await _iaeLoadImage(source);
  const settings = normalizeImageAssetSettings(settingsValue);
  const requestedMax = Math.max(256, Math.min(2048, Math.round(Number(options && options.maxDimension) || 1280)));
  const maxOutputChars = Math.max(1e3, Number(options && options.maxOutputChars) || IMAGE_ASSET_MAX_OUTPUT_CHARS);
  const attempts = [
    { maxDimension: requestedMax, quality: 0.9 },
    { maxDimension: Math.max(256, Math.round(requestedMax * 0.8)), quality: 0.8 },
    { maxDimension: Math.max(256, Math.round(requestedMax * 0.62)), quality: 0.72 },
    { maxDimension: Math.max(256, Math.round(requestedMax * 0.46)), quality: 0.64 }
  ];
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    const target = computeImageAssetTargetSize(decoded.width, decoded.height, settings, attempt);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw _iaeError("Image editing is unavailable in this browser.", "canvas-unavailable");
    context.clearRect(0, 0, target.width, target.height);
    context.imageSmoothingEnabled = true;
    try {
      context.imageSmoothingQuality = "high";
    } catch (_) {
    }
    const draw = computeImageAssetDrawRect(decoded.width, decoded.height, target.width, target.height, settings);
    context.drawImage(decoded.image, draw.dx, draw.dy, draw.dw, draw.dh);
    const rendered = canvas.toDataURL("image/webp", attempt.quality);
    const dataUrl = normalizeRasterDataUrl(rendered, maxOutputChars);
    if (dataUrl) {
      return {
        dataUrl,
        mime: imageAssetMime(dataUrl),
        width: target.width,
        height: target.height,
        settings
      };
    }
  }
  throw _iaeError("The edited image is still too large to save. Try a smaller source image.", "output-too-large");
}
let _iaePickerId = 0;
function ImageAssetPicker(props) {
  const idRef = React.useRef("");
  if (!idRef.current) idRef.current = props.id || "image-asset-picker-" + String(++_iaePickerId);
  const inputId = idRef.current;
  const helpId = inputId + "-help";
  const errorId = inputId + "-error";
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const readFile = typeof props.readFile === "function" ? props.readFile : readImageAssetFile;
  const handleChange = async (event) => {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const result = await readFile(file, { maxFileBytes: props.maxFileBytes || IMAGE_ASSET_MAX_FILE_BYTES });
      if (typeof props.onLoaded === "function") props.onLoaded(result);
    } catch (reason) {
      const message = _iaeString(reason && reason.message, 500) || "That image could not be opened.";
      setError(message);
      if (typeof props.onError === "function") props.onError(reason);
    } finally {
      setBusy(false);
      try {
        input.value = "";
      } catch (_) {
      }
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: props.className || "", "data-image-asset-picker": "true", "aria-busy": busy }, /* @__PURE__ */ React.createElement("label", { htmlFor: inputId, className: "block text-xs font-black text-slate-700" }, props.label || "Upload an image from this device"), /* @__PURE__ */ React.createElement(
    "input",
    {
      id: inputId,
      type: "file",
      accept: IMAGE_ASSET_ACCEPT,
      disabled: !!props.disabled || busy,
      onChange: handleChange,
      "aria-describedby": helpId + (error ? " " + errorId : ""),
      className: "mt-1 block min-h-11 w-full cursor-pointer rounded-xl border border-fuchsia-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-fuchsia-100 file:px-3 file:py-2 file:font-black file:text-fuchsia-900 disabled:cursor-not-allowed disabled:opacity-50"
    }
  ), /* @__PURE__ */ React.createElement("p", { id: helpId, className: "mt-1 text-xs leading-relaxed text-slate-600" }, "PNG, JPEG, or WebP; up to 10 MB. The file is processed in this browser, and only the resized result is saved with the resource."), busy && /* @__PURE__ */ React.createElement("p", { role: "status", className: "mt-1 text-xs font-bold text-fuchsia-900" }, "Reading image\u2026"), error && /* @__PURE__ */ React.createElement("p", { id: errorId, role: "alert", className: "mt-1 text-xs font-bold text-red-700" }, error));
}
function ImageAssetEditor(props) {
  const headingRef = React.useRef("");
  if (!headingRef.current) headingRef.current = "image-asset-editor-" + String(++_iaePickerId);
  const [settings, setSettings] = React.useState(() => normalizeImageAssetSettings(props.initialSettings));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const source = normalizeRasterDataUrl(props.sourceDataUrl, IMAGE_ASSET_MAX_SOURCE_CHARS);
  const renderer = typeof props.renderImageAsset === "function" ? props.renderImageAsset : renderImageAsset;
  React.useEffect(() => {
    setSettings(normalizeImageAssetSettings(props.initialSettings));
    setError("");
  }, [props.sourceDataUrl]);
  const patchSettings = (patch) => setSettings((current) => normalizeImageAssetSettings(Object.assign({}, current, patch)));
  const apply = async () => {
    if (!source) return;
    setBusy(true);
    setError("");
    try {
      const result = await renderer(source, settings, {
        maxDimension: props.maxDimension || 1280,
        maxOutputChars: props.maxOutputChars || IMAGE_ASSET_MAX_OUTPUT_CHARS
      });
      const rawDataUrl = typeof result === "string" ? result : result && result.dataUrl;
      const dataUrl = normalizeRasterDataUrl(rawDataUrl, props.maxOutputChars || IMAGE_ASSET_MAX_OUTPUT_CHARS);
      if (!dataUrl) throw _iaeError("The edited image could not be saved safely.", "invalid-output");
      if (typeof props.onApply === "function") {
        props.onApply(Object.assign({}, result && typeof result === "object" ? result : {}, {
          dataUrl,
          mime: imageAssetMime(dataUrl),
          settings: normalizeImageAssetSettings(settings)
        }));
      }
    } catch (reason) {
      const message = _iaeString(reason && reason.message, 500) || "The image could not be edited.";
      setError(message);
      if (typeof props.onError === "function") props.onError(reason);
    } finally {
      setBusy(false);
    }
  };
  if (!source) {
    return /* @__PURE__ */ React.createElement("p", { role: "alert", className: "rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" }, "The selected image cannot be edited. Choose a PNG, JPEG, or WebP file.");
  }
  const aspect = settings.mode === "crop" ? IMAGE_ASSET_ASPECTS[settings.aspect].ratio : 4 / 3;
  const previewImageStyle = settings.mode === "crop" ? {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: settings.focalX + "% " + settings.focalY + "%",
    transform: "scale(" + String(settings.zoom / 100) + ")",
    transformOrigin: settings.focalX + "% " + settings.focalY + "%"
  } : { width: "100%", height: "100%", objectFit: "contain" };
  return /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border-2 border-fuchsia-300 bg-white p-4", "aria-labelledby": headingRef.current, "aria-busy": busy }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { id: headingRef.current, className: "text-sm font-black text-fuchsia-950" }, "Position your visual"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs leading-relaxed text-slate-600" }, "Fit keeps the whole image. Crop fills a chosen frame and lets you move the point of focus.")), props.sourceName && /* @__PURE__ */ React.createElement("span", { className: "max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700" }, _iaeString(props.sourceName, 120))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 grid gap-4 md:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-xl border border-slate-300 bg-slate-100", style: { aspectRatio: String(aspect) } }, /* @__PURE__ */ React.createElement("img", { src: source, alt: props.previewAlt || "Preview of the image being positioned", className: "block", style: previewImageStyle })), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("fieldset", null, /* @__PURE__ */ React.createElement("legend", { className: "text-xs font-black text-slate-800" }, "Image treatment"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 grid gap-2 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement("label", { className: "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: headingRef.current + "-mode", checked: settings.mode === "fit", onChange: () => patchSettings({ mode: "fit" }) }), "Fit whole image"), /* @__PURE__ */ React.createElement("label", { className: "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800" }, /* @__PURE__ */ React.createElement("input", { type: "radio", name: headingRef.current + "-mode", checked: settings.mode === "crop", onChange: () => patchSettings({ mode: "crop", aspect: "square" }) }), "Crop to frame"))), settings.mode === "crop" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-black text-slate-700" }, "Frame shape", /* @__PURE__ */ React.createElement("select", { value: settings.aspect, onChange: (event) => patchSettings({ aspect: event.target.value }), className: "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600" }, Object.keys(IMAGE_ASSET_ASPECTS).map((key) => /* @__PURE__ */ React.createElement("option", { key, value: key }, IMAGE_ASSET_ASPECTS[key].label)))), /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-black text-slate-700" }, "Zoom ", /* @__PURE__ */ React.createElement("output", { className: "font-medium" }, settings.zoom, "%"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "100", max: "250", step: "5", value: settings.zoom, onChange: (event) => patchSettings({ zoom: event.target.value }), "aria-label": "Image zoom", className: "mt-1 block min-h-11 w-full accent-fuchsia-700" })), /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-black text-slate-700" }, "Horizontal focus ", /* @__PURE__ */ React.createElement("output", { className: "font-medium" }, settings.focalX, "%"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "0", max: "100", step: "5", value: settings.focalX, onChange: (event) => patchSettings({ focalX: event.target.value }), "aria-label": "Horizontal image focus", className: "mt-1 block min-h-11 w-full accent-fuchsia-700" })), /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-black text-slate-700" }, "Vertical focus ", /* @__PURE__ */ React.createElement("output", { className: "font-medium" }, settings.focalY, "%"), /* @__PURE__ */ React.createElement("input", { type: "range", min: "0", max: "100", step: "5", value: settings.focalY, onChange: (event) => patchSettings({ focalY: event.target.value }), "aria-label": "Vertical image focus", className: "mt-1 block min-h-11 w-full accent-fuchsia-700" })), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setSettings(normalizeImageAssetSettings({ mode: "crop", aspect: settings.aspect })), className: "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600" }, "Center and reset zoom")))), error && /* @__PURE__ */ React.createElement("p", { role: "alert", className: "mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" }, error), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: apply, disabled: busy, className: "min-h-11 rounded-xl bg-fuchsia-700 px-4 py-2 text-sm font-black text-white hover:bg-fuchsia-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-600 focus-visible:ring-offset-2" }, busy ? "Preparing image\u2026" : "Use edited image"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => typeof props.onCancel === "function" && props.onCancel(), disabled: busy, className: "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500" }, "Cancel")));
}
const RESOURCE_IMAGE_FIELDS = /* @__PURE__ */ new Set(["image", "imageUrl", "iconUrl", "visualImage", "avatarUrl", "portrait", "sceneImage", "leftImageUrl", "rightImageUrl", "coverImage", "backgroundImage", "referenceImage", "imageSrc"]);
const _riGet = (value, path) => path.reduce((node, key) => node == null ? void 0 : node[key], value);
function _riSet(value, path, next) {
  if (!path.length) return next;
  const [key, ...rest] = path;
  if (["__proto__", "constructor", "prototype"].includes(String(key))) return value;
  const copy = Array.isArray(value) ? value.slice() : value == null && typeof key === "number" ? [] : { ...value || {} };
  copy[key] = _riSet(copy[key], rest, next);
  return copy;
}
const _riLabel = (node) => String(node?.term || node?.word || node?.label || node?.title || node?.name || node?.event || node?.question || node?.caption || (typeof node?.content === "string" ? node.content : "") || "").slice(0, 140);
const _riIdentity = (node) => String(node?.entryId || node?.glossaryEntryId || node?.id || node?.term || node?.word || node?.name || node?.event || node?.question || node?.label || "");
function _riImageStamp(image) {
  let hash = 2166136261;
  for (let i = 0; i < image.length; i++) hash = Math.imul(hash ^ image.charCodeAt(i), 16777619);
  return image.length + ":" + (hash >>> 0);
}
function resourceImageSlots(resource) {
  if (!resource || typeof resource !== "object") return [];
  const slots = [], seen = /* @__PURE__ */ new Set();
  const htmlSlots = (html, path) => {
    if (!/<(?:img|figure)\b/i.test(html) || typeof DOMParser === "undefined") return;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes = [...doc.querySelectorAll("img, figure[data-img-placeholder]")].filter((node) => node.tagName === "IMG" || !node.querySelector("img"));
    nodes.forEach((node, htmlIndex) => {
      const key = JSON.stringify(path) + ":html:" + htmlIndex;
      const ownerId = node.id || node.parentElement?.id || "html-" + htmlIndex + ":" + _riImageStamp((node.parentElement?.textContent || "").slice(0, 500));
      slots.push({ key, path, field: "html", htmlIndex, htmlSource: html, ownerId, value: node.getAttribute("src") || "", alt: node.getAttribute("alt") || node.getAttribute("data-allo-alt") || "", label: node.getAttribute("alt") || node.getAttribute("data-allo-alt") || "Document image " + (htmlIndex + 1) });
    });
  };
  const add = (path, label, altKey) => {
    const key = JSON.stringify(path);
    if (seen.has(key)) return;
    const value = _riGet(resource, path), owner = _riGet(resource, path.slice(0, -1));
    if (value != null && typeof value !== "string") return;
    seen.add(key);
    const field = path[path.length - 1];
    const altField = altKey || (field === "iconUrl" ? "iconAlt" : field === "visualImage" ? "visualAlt" : ["glossary", "word-sounds", "concept-sort"].includes(resource.type) ? "imageAlt" : resource.type === "timeline" || path.includes("panels") ? "alt" : "alt" in (owner || {}) ? "alt" : "altText");
    const ownerId = path.map((_, index) => index ? _riIdentity(_riGet(resource, path.slice(0, index))) : "").filter(Boolean).join("|");
    slots.push({
      key,
      path,
      field,
      ownerId,
      label: label || _riLabel(owner) || "Image " + (slots.length + 1),
      value: value || "",
      alt: String(owner?.[altField] || ""),
      altField
    });
  };
  const entries = (array, path, field, label) => (Array.isArray(array) ? array : []).forEach((entry, i) => {
    if (entry && typeof entry === "object") add([...path, i, field], _riLabel(entry) || label + " " + (i + 1));
  });
  const data = resource.data;
  if (["glossary", "word-sounds"].includes(resource.type)) entries(data, ["data"], "image", "Word");
  if (resource.type === "word-sounds" && (!Array.isArray(data) || !data.length)) entries(resource.wsPreloadedWords, ["wsPreloadedWords"], "image", "Word");
  if (["timeline", "concept-sort"].includes(resource.type)) entries(data?.items, ["data", "items"], "image", "Item");
  if (resource.type === "anchor-chart") entries(data?.sections, ["data", "sections"], "iconUrl", "Section");
  if (resource.type === "memory-aid") entries(data?.cards, ["data", "cards"], "visualImage", "Memory aid");
  if (resource.type === "applied-challenge") add(["data", "visual", "image"], "Scenario illustration", "alt");
  if (resource.type === "image") {
    if (data?.visualPlan?.panels?.length) entries(data.visualPlan.panels, ["data", "visualPlan", "panels"], "imageUrl", "Panel");
    else add(["data", "imageUrl"], "Lesson image", "altText");
  }
  if (resource.type === "quiz") (data?.questions || []).forEach((q, i) => {
    add(["data", "questions", i, "imageUrl"], "Question " + (i + 1), "imageAltText");
    (q.options || []).forEach((option, j) => add(["data", "questions", i, "optionImageUrls", j], "Question " + (i + 1) + " \u2014 choice " + (j + 1)));
  });
  if (resource.type === "adventure") {
    add(["data", "sceneImage"], "Current scene", "sceneImageAlt");
    entries(data?.characters, ["data", "characters"], "portrait", "Character");
    entries(data?.inventory, ["data", "inventory"], "image", "Inventory");
  }
  if (resource.type === "persona") entries(Array.isArray(data) ? data : data?.characters, Array.isArray(data) ? ["data"] : ["data", "characters"], "avatarUrl", "Character");
  const visit = (node, path, depth) => {
    if (typeof node === "string") {
      htmlSlots(node, path);
      return;
    }
    if (!node || typeof node !== "object" || depth > 18) return;
    Object.entries(node).forEach(([key, value]) => {
      if (["originalImage", "imageAssets", "whiteboardScene", "imageAttribution", "sourceSnapshot", "annotations", "frames", "imageCache"].includes(key)) return;
      const next = [...path, Array.isArray(node) ? Number(key) : key];
      if (RESOURCE_IMAGE_FIELDS.has(key) || key === "src" && /image|figure|picture/.test(node.type || node.kind || "")) {
        if (value && typeof value === "object") visit(value, next, depth + 1);
        else if (!(resource.type === "image" && path.length === 1 && key === "imageUrl" && data?.visualPlan?.panels?.length)) add(next);
      } else if (["images", "optionImageUrls", "answerImageUrls", "evidenceImageUrls"].includes(key) && value && typeof value === "object") {
        Object.keys(value).forEach((id) => add([...next, Array.isArray(value) ? Number(id) : id], _riLabel(node) || "Image " + id));
      } else if (typeof value === "object" || typeof value === "string" && /<(?:img|figure)\b/i.test(value)) visit(value, next, depth + 1);
    });
  };
  visit(data, ["data"], 0);
  return slots;
}
function replaceResourceImage(resource, slot, result) {
  if (!resource || !slot || !result) return resource;
  const live = resourceImageSlots(resource).find((item) => item.key === slot.key);
  if (!live || live.value !== slot.value || live.ownerId !== slot.ownerId) return resource;
  if (slot.field === "html" && live.htmlSource !== slot.htmlSource) return resource;
  const image = result.dataUrl === slot.value ? slot.value : normalizeRasterDataUrl(result.dataUrl);
  if (!image) return resource;
  let next;
  if (slot.field === "html") {
    const html = _riGet(resource, slot.path), doc = new DOMParser().parseFromString(html, "text/html");
    const nodes = [...doc.querySelectorAll("img, figure[data-img-placeholder]")].filter((node2) => node2.tagName === "IMG" || !node2.querySelector("img"));
    const node = nodes[slot.htmlIndex];
    if (!node) return resource;
    const img = node.tagName === "IMG" ? node : doc.createElement("img");
    img.setAttribute("src", image);
    img.setAttribute("alt", String(result.alt || "").slice(0, 1600));
    if (node !== img) {
      img.style.maxWidth = "100%";
      const container = node.querySelector('[id$="-container"]');
      if (container) container.replaceChildren(img);
      else {
        [...node.childNodes].filter((child) => child.nodeName !== "FIGCAPTION").forEach((child) => child.remove());
        node.insertBefore(img, node.firstChild);
      }
    }
    next = _riSet(resource, slot.path, /<!doctype|<html\b/i.test(html) ? "<!DOCTYPE html>\n" + doc.documentElement.outerHTML : doc.body.innerHTML);
  } else next = _riSet(resource, slot.path, image);
  const parentPath = slot.path.slice(0, -1), owner = _riGet(next, parentPath);
  const alt = String(result.alt || "").slice(0, 1600);
  if (slot.field !== "html" && owner && !Array.isArray(owner) && parentPath[parentPath.length - 1] !== "images") {
    const cleaned = { ...owner, [slot.altField]: alt, imageSource: image === slot.value ? owner.imageSource : result.scene ? "author-drawing" : "author-upload", altSource: alt ? "user" : "", altHash: "", decorative: false };
    if (image !== slot.value) ["imageAttribution", "imageCreditBand", "whiteboardScene"].forEach((key) => delete cleaned[key]);
    if (slot.altField === "imageAlt") Object.assign(cleaned, { imageAlt: alt, imageAltSource: alt ? "author" : "", imageAltHash: "", imageDecorative: false });
    if (slot.field === "imageUrl" && parentPath.includes("panels")) {
      delete cleaned.frames;
      delete cleaned.motionSteps;
      cleaned.failed = false;
    }
    if (slot.field === "visualImage") Object.assign(cleaned, { visualSource: "uploaded", visualKind: "image", visualStatus: "ready", visualAlt: alt, visualAltSource: alt ? "user" : "", visualNeedsReview: true, visualReview: { status: "pending" } });
    if (resource.type === "applied-challenge") Object.assign(cleaned, { source: "uploaded", reviewed: false });
    if (slot.field === "portrait") Object.assign(cleaned, { isUserUploaded: true, uploadConsent: true, isGenerating: false });
    next = _riSet(next, parentPath, cleaned);
  }
  if (resource.type === "image" && parentPath.includes("panels") && slot.path[3] === 0) next = _riSet(next, ["data", "imageUrl"], image);
  if (["optionImageUrls", "answerImageUrls", "evidenceImageUrls"].includes(parentPath[parentPath.length - 1])) {
    next = _riSet(next, [...parentPath.slice(0, -1), parentPath[parentPath.length - 1].replace("Urls", "AltTexts"), slot.field], alt);
  }
  if (resource.type === "word-sounds" && Array.isArray(resource.wsPreloadedWords) && slot.path[0] === "data") {
    const original = resource.data[slot.path[1]];
    next.wsPreloadedWords = resource.wsPreloadedWords.map((word) => {
      if (_riIdentity(word) !== _riIdentity(original)) return word;
      const updated = { ...word, image, imageAlt: alt, imageAltSource: "author", imageAltHash: "", imageDecorative: false, imageSource: result.scene ? "author-drawing" : "author-upload" };
      if (image !== slot.value) ["imageAttribution", "imageCreditBand", "whiteboardScene"].forEach((key) => delete updated[key]);
      return updated;
    });
  }
  const imageAssets = { ...next.imageAssets || {} };
  const updatedSlot = resourceImageSlots(next).find((item) => item.key === slot.key);
  imageAssets[slot.key] = { ownerId: updatedSlot?.ownerId || slot.ownerId, imageStamp: _riImageStamp(image), alt, scene: result.scene || null };
  return { ...next, imageAssets };
}
function validResourceDrawingScene(scene) {
  if (!scene || !Array.isArray(scene.elements) || scene.elements.length > 5e3) return false;
  if (scene.elements.some((element) => !element || ["embeddable", "iframe", "magicframe"].includes(element.type))) return false;
  if (Object.values(scene.files || {}).some((file) => !file || !normalizeRasterDataUrl(file.dataURL, 2 * 1024 * 1024))) return false;
  try {
    return JSON.stringify(scene).length <= 2 * 1024 * 1024;
  } catch (_) {
    return false;
  }
}
const RESOURCE_WHITEBOARD_ORIGIN = "https://alloflow-cdn.pages.dev";
function resourceDrawingWhiteboardUrl(loc, token, hostOrigin) {
  const host = String(loc.hostname || "").toLowerCase(), web = /^https?:$/.test(loc.protocol);
  const url = web && /^(localhost|127\.0\.0\.1)$/.test(host) ? new URL("./whiteboard/whiteboard.html", loc.href) : new URL("/whiteboard/whiteboard.html", web && /(^|\.)alloflow-cdn\.pages\.dev$/.test(host) ? loc.origin : RESOURCE_WHITEBOARD_ORIGIN);
  url.search = "?imageSlot=" + encodeURIComponent(token) + "&host=" + encodeURIComponent(hostOrigin) + "&v=4";
  return url;
}
function openResourceDrawing({ scene, title, onSave, onCancel, onError, onStatus }) {
  const token = window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  const hostOrigin = typeof window.origin === "string" && window.origin || window.location.origin;
  const url = resourceDrawingWhiteboardUrl(window.location, token, hostOrigin), base = url.origin;
  const popup = window.open(url.href, "_blank", "width=1120,height=800");
  if (!popup) {
    onError?.(new Error("Allow pop-ups for AlloFlow, then choose Draw again."));
    return () => {
    };
  }
  let done = false, saving = false, connected = false, cancelRequested = false;
  const post = (payload) => {
    try {
      popup.postMessage({ ...payload, token }, base);
    } catch (_) {
    }
  };
  const cleanup = () => {
    done = true;
    window.removeEventListener("message", receive);
    clearInterval(closedTimer);
    clearTimeout(connectTimer);
    clearTimeout(slowTimer);
  };
  const receive = async (event) => {
    if (done || event.source !== popup || event.origin !== base || event.data?.token !== token) return;
    const data = event.data;
    if (data.type === "alloasset-hello") {
      connected = true;
      clearTimeout(connectTimer);
      clearTimeout(slowTimer);
      onStatus?.("Draw in the Whiteboard, then choose Use drawing.");
      post({ type: "alloasset-ack", title, scene: validResourceDrawingScene(scene) ? scene : null });
      return;
    }
    if (data.type === "alloasset-closed") {
      cleanup();
      onCancel?.();
      return;
    }
    if (data.type !== "alloasset-save" || saving) return;
    saving = true;
    try {
      const png = normalizeRasterDataUrl(data.png);
      if (!png || !validResourceDrawingScene(data.scene)) throw Error("The drawing is too large to save as an editable image. Remove large embedded photos and try again.");
      const accepted = await onSave({ dataUrl: png, scene: data.scene });
      if (done) return;
      if (accepted === false) throw Error("This image changed while the drawing was open. Export your drawing or reopen the image slot.");
      post({ type: "alloasset-saved" });
      cleanup();
    } catch (error) {
      post({ type: "alloasset-error", message: error.message });
      onError?.(error);
    } finally {
      saving = false;
      if (cancelRequested && !done) {
        post({ type: "alloasset-disconnected" });
        cleanup();
      }
    }
  };
  window.addEventListener("message", receive);
  const closedTimer = setInterval(() => {
    if (popup.closed) {
      cleanup();
      onCancel?.();
    }
  }, 700);
  const slowTimer = setTimeout(() => {
    if (!connected && !done) onStatus?.("Still connecting to the Whiteboard. If it says it has no link back to AlloFlow, choose Export PNG there, then Upload image here.");
  }, 8e3);
  const connectTimer = setTimeout(() => {
    if (!connected && !done) {
      cleanup();
      onError?.(Error("The Whiteboard could not connect. You can still draw there: choose Export PNG, then Upload image here."));
    }
  }, 3e4);
  popup.focus?.();
  return () => {
    if (saving) {
      cancelRequested = true;
      return;
    }
    if (!done) {
      post({ type: "alloasset-disconnected" });
      cleanup();
    }
  };
}
function ResourceImageInput({ label = "Image", value = "", scene, alt = "", disabled = false, onApply }) {
  const [editor, setEditor] = React.useState(null), [description, setDescription] = React.useState(alt);
  const [message, setMessage] = React.useState(""), [busy, setBusy] = React.useState(false);
  const alive = React.useRef(true), cancelDrawing = React.useRef(null), trigger = React.useRef(null);
  const disabledRef = React.useRef(disabled);
  disabledRef.current = disabled;
  const descriptionRef = React.useRef(description);
  descriptionRef.current = description;
  React.useEffect(() => {
    setDescription(alt);
  }, [alt, value]);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelDrawing.current?.();
    };
  }, []);
  const finish = async (result) => {
    if (!alive.current || disabledRef.current) return false;
    const accepted = await onApply({ ...result, alt: descriptionRef.current });
    if (!alive.current) return accepted !== false;
    if (accepted === false) {
      setMessage("This image changed. Reopen its controls and try again.");
      return false;
    }
    setEditor(null);
    setMessage("Image saved.");
    setBusy(false);
    trigger.current?.focus();
    return true;
  };
  const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50";
  return /* @__PURE__ */ React.createElement("section", { className: "rounded-xl border border-slate-300 bg-white p-3 text-slate-900", "data-resource-image-input": true }, /* @__PURE__ */ React.createElement("h4", { className: "mb-2 font-bold" }, label), value && /* @__PURE__ */ React.createElement("img", { src: value, alt: alt || "", className: "mb-3 max-h-40 max-w-full rounded object-contain" }), /* @__PURE__ */ React.createElement("label", { className: "block text-sm" }, "Image description", /* @__PURE__ */ React.createElement("textarea", { value: description, maxLength: 1600, disabled: disabled || busy, onChange: (event) => setDescription(event.target.value), className: "mt-1 block min-h-16 w-full rounded border border-slate-400 p-2" })), /* @__PURE__ */ React.createElement("div", { className: "my-2 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(ImageAssetPicker, { label: "Upload image", disabled, onLoaded: (result) => {
    cancelDrawing.current?.();
    cancelDrawing.current = null;
    setBusy(false);
    setEditor(result);
    setMessage("");
  }, onError: (error) => setMessage(error.message) }), /* @__PURE__ */ React.createElement("button", { ref: trigger, type: "button", className: button, disabled: disabled || busy, onClick: () => {
    cancelDrawing.current?.();
    setBusy(true);
    setMessage("Draw in the Whiteboard, then choose Use drawing.");
    cancelDrawing.current = openResourceDrawing({
      scene,
      title: label,
      onSave: finish,
      onCancel: () => {
        if (alive.current) {
          setBusy(false);
          setMessage("Drawing closed.");
          trigger.current?.focus();
        }
      },
      onError: (error) => {
        if (alive.current) {
          setBusy(false);
          setMessage(error.message);
        }
      },
      onStatus: (text) => {
        if (alive.current) setMessage(text);
      }
    });
  } }, scene ? "Edit drawing" : "Draw with Excalidraw"), value && /* @__PURE__ */ React.createElement("button", { type: "button", className: button, disabled: disabled || busy, onClick: () => finish({ dataUrl: value, scene }).catch((error) => setMessage(error.message)) }, "Save description")), editor && /* @__PURE__ */ React.createElement(ImageAssetEditor, { sourceDataUrl: editor.dataUrl, onApply: (result) => finish(result).catch((error) => setMessage(error.message)), onCancel: () => {
    setEditor(null);
    trigger.current?.focus();
  } }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-700", role: "status" }, message));
}
function ResourceImagesPanel({ resource, onUpdateResource, disabled = false, instanceId = "" }) {
  const [open, setOpen] = React.useState(false);
  const current = React.useRef(resource);
  current.current = resource;
  const slots = resourceImageSlots(resource);
  const [enabled, setEnabled] = React.useState(window.AlloImageGeneration.isEnabled);
  React.useEffect(() => window.AlloImageGeneration.subscribe(setEnabled), []);
  if (!slots.length) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "no-print mb-4 rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-900", "data-resource-images": true }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-expanded": open, onClick: () => setOpen(!open), className: "min-h-11 rounded px-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" }, "Resource images (", slots.length, ") \u2014 upload or draw"), !enabled && /* @__PURE__ */ React.createElement("p", { className: "px-2 text-sm text-slate-600" }, "AI image generation is off. Add your own images below."), open && /* @__PURE__ */ React.createElement("div", { className: "mt-3 grid gap-3 sm:grid-cols-2" }, slots.map((slot) => {
    const saved = resource.imageAssets?.[slot.key];
    const ownsSaved = saved?.imageStamp === _riImageStamp(slot.value) && saved?.ownerId === slot.ownerId;
    const scene = ownsSaved ? saved.scene : resource.type === "image" && slot.path.length === 2 ? resource.data?.whiteboardScene : null;
    return /* @__PURE__ */ React.createElement(
      ResourceImageInput,
      {
        key: slot.key + ":" + slot.ownerId,
        label: slot.label,
        value: slot.value,
        alt: ownsSaved ? saved.alt : slot.alt,
        scene,
        disabled,
        onApply: (result) => {
          const live = resourceImageSlots(current.current).find((item) => item.key === slot.key);
          if (!live || live.value !== slot.value || live.ownerId !== slot.ownerId) return false;
          if (slot.field === "html" && live.htmlSource !== slot.htmlSource) return false;
          return onUpdateResource(resource.id, (previous) => replaceResourceImage(previous, slot, result), { instanceId });
        }
      }
    );
  })));
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.ImageAssetEditor = ImageAssetEditor;
window.AlloModules.ImageAssetPicker = ImageAssetPicker;
window.AlloModules.AiImageGenerationToggle = AiImageGenerationToggle;
window.AlloModules.ResourceImagesPanel = ResourceImagesPanel;
window.AlloModules.ResourceImageInput = ResourceImageInput;
window.AlloModules.ResourceImageTools = { resourceImageSlots, replaceResourceImage, openResourceDrawing, validResourceDrawingScene, resourceDrawingWhiteboardUrl };
window.AlloModules.ImageAssetTools = {
  IMAGE_ASSET_ACCEPT: IMAGE_ASSET_ACCEPT,
  IMAGE_ASSET_MAX_FILE_BYTES: IMAGE_ASSET_MAX_FILE_BYTES,
  IMAGE_ASSET_MAX_OUTPUT_CHARS: IMAGE_ASSET_MAX_OUTPUT_CHARS,
  IMAGE_ASSET_ASPECTS: IMAGE_ASSET_ASPECTS,
  normalizeImageAssetSettings: normalizeImageAssetSettings,
  validateImageAssetFile: validateImageAssetFile,
  normalizeRasterDataUrl: normalizeRasterDataUrl,
  imageAssetMime: imageAssetMime,
  readImageAssetFile: readImageAssetFile,
  computeImageAssetTargetSize: computeImageAssetTargetSize,
  computeImageAssetDrawRect: computeImageAssetDrawRect,
  renderImageAsset: renderImageAsset
};
window.AlloModules.ImageAssetEditorModule = true;
console.log('[CDN] ImageAssetEditorModule loaded');
})();
