(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ModuleScopeExtras) { console.log('[CDN] ModuleScopeExtrasModule already loaded, skipping'); return; }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
// Firestore deps mirrored to window by host (see AlloFlowANTI.txt
// where window.doc / window.db / window.setDoc / window.getDoc are set
// alongside the existing window._fbDoc / window._fbDb pair).
var doc = window.doc || window._fbDoc;
var db = window.db || window._fbDb;
var setDoc = window.setDoc || window._fbSetDoc;
var getDoc = window.getDoc || window._fbGetDoc;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var AlertCircle = _lazyIcon('AlertCircle');
var RefreshCw = _lazyIcon('RefreshCw');
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const getSpeechLangCode = (friendlyName) => {
  if (!friendlyName) return "en-US";
  const normalize = (str) => str.toLowerCase().trim();
  const input = normalize(friendlyName);
  const map = {
    "english": "en-US",
    "spanish": "es-ES",
    "french": "fr-FR",
    "german": "de-DE",
    "portuguese": "pt-BR",
    "mandarin": "zh-CN",
    "chinese": "zh-CN",
    "chinese (mandarin)": "zh-CN",
    "arabic": "ar-SA",
    "vietnamese": "vi-VN",
    "russian": "ru-RU",
    "japanese": "ja-JP",
    "italian": "it-IT",
    "korean": "ko-KR",
    "hindi": "hi-IN",
    "dutch": "nl-NL",
    "polish": "pl-PL",
    "indonesian": "id-ID",
    "turkish": "tr-TR",
    "hebrew": "he-IL",
    "swedish": "sv-SE",
    "danish": "da-DK",
    "norwegian": "no-NO",
    "finnish": "fi-FI",
    "greek": "el-GR",
    "thai": "th-TH",
    "czech": "cs-CZ",
    "hungarian": "hu-HU",
    "romanian": "ro-RO",
    "ukrainian": "uk-UA",
    "cantonese": "zh-HK",
    "tagalog": "fil-PH",
    "filipino": "fil-PH",
    "bengali": "bn-IN",
    "urdu": "ur-PK",
    "malay": "ms-MY",
    "swahili": "sw-KE",
    "bulgarian": "bg-BG",
    "croatian": "hr-HR",
    "serbian": "sr-RS",
    "slovak": "sk-SK",
    "persian": "fa-IR",
    "farsi": "fa-IR",
    "tamil": "ta-IN",
    "amharic": "am-ET",
    "afrikaans": "af-ZA",
    "kurdish": "ku-TR",
    // 2026-07-12: languages that previously fell through to the 'en-US'
    // default — which silently ran ENGLISH speech recognition, TTS hints,
    // and (in Word Sounds) English G2P for these languages. Real codes let
    // every consumer make an honest per-language decision; unsupported
    // engines now fail visibly/fall back instead of pretending English.
    "somali": "so-SO",
    "haitian creole": "ht-HT",
    "haitian": "ht-HT",
    "khmer": "km-KH",
    "cambodian": "km-KH",
    "lao": "lo-LA",
    "burmese": "my-MM",
    "myanmar": "my-MM",
    "nepali": "ne-NP",
    "marathi": "mr-IN",
    "gujarati": "gu-IN",
    "punjabi": "pa-IN",
    "telugu": "te-IN",
    "kannada": "kn-IN",
    "malayalam": "ml-IN",
    "sinhala": "si-LK",
    "yoruba": "yo-NG",
    "igbo": "ig-NG",
    "hausa": "ha-NG",
    "kinyarwanda": "rw-RW",
    "kirundi": "rn-BI",
    "lingala": "ln-CD",
    "tigrinya": "ti-ET",
    "oromo": "om-ET",
    "mongolian": "mn-MN",
    "hmong": "hmn",
    "esperanto": "eo",
    "pashto": "ps-AF",
    "pushto": "ps-AF",
    "dari": "prs-AF",
    "georgian": "ka-GE",
    "armenian": "hy-AM",
    "albanian": "sq-AL",
    "macedonian": "mk-MK",
    "acholi": "ach-UG",
    "karen": "kar-MM",
    "chin (hakha)": "cnh-MM",
    "chin (falam)": "cfm-MM",
    "maay maay": "ymm-SO",
    "marshallese": "mh-MH"
  };
  return map[input] || "en-US";
};
const languageToTTSCode = (friendlyName) => {
  const bcp47 = getSpeechLangCode(friendlyName);
  return bcp47.split("-")[0].toLowerCase();
};
const isRtlLang = (languageNameOrCode) => {
  if (!languageNameOrCode) return false;
  const s = String(languageNameOrCode).trim().toLowerCase();
  if (!s) return false;
  const code = s.split(/[-_]/)[0];
  const rtlCodes = /* @__PURE__ */ new Set(["ar", "arc", "he", "iw", "fa", "prs", "ur", "ps", "ku", "ckb", "sd", "ug", "yi", "dv", "syr", "nqo"]);
  if (rtlCodes.has(s) || rtlCodes.has(code)) return true;
  const rtlNames = /* @__PURE__ */ new Set([
    "arabic",
    "hebrew",
    "persian",
    "farsi",
    "dari",
    "urdu",
    "kurdish",
    "sorani",
    "pashto",
    "pushto",
    "yiddish",
    "sindhi",
    "uyghur",
    "uighur",
    "divehi",
    "dhivehi",
    "maldivian",
    "aramaic",
    "syriac"
  ]);
  return s.split(/[^a-z]+/).some((tok) => tok && rtlNames.has(tok));
};
const getContentDirection = (languageName) => {
  return isRtlLang(languageName) ? "rtl" : "ltr";
};
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    const t = this.context?.t || ((key) => {
      const f = { "errors.component_title": "Something went wrong", "errors.default_desc": "This component encountered an error. Please try again.", "errors.try_again": "Try Again", "common.refresh": "Refresh", "common.error_details": "Error Details" };
      return f[key] || key;
    });
    if (this.state.hasError) {
      return /* @__PURE__ */ React.createElement("div", { role: "alert", "aria-live": "assertive", "aria-atomic": "true", className: "w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-xl text-center animate-in fade-in zoom-in duration-300 motion-reduce:animate-none relative z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-100 p-4 rounded-full text-red-500 mb-4 shadow-sm" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 48, "aria-hidden": "true" })), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-black text-red-800 mb-2" }, this.props.title || t("errors.component_title")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-600 mb-6 max-w-md font-medium leading-relaxed" }, this.props.fallbackMessage || t("errors.default_desc")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          "aria-label": t("common.refresh"),
          onClick: () => {
            if (this.props.onRetry) this.props.onRetry();
            this.setState({ hasError: false, error: null });
          },
          className: "px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, "aria-hidden": "true" }),
        " ",
        this.props.retryLabel || t("errors.try_again")
      )), Boolean(this.state.error) && /* @__PURE__ */ React.createElement("details", { className: "mt-8 text-[11px] text-red-600 text-left max-w-sm opacity-60 cursor-pointer" }, /* @__PURE__ */ React.createElement("summary", null, t("common.error_details")), /* @__PURE__ */ React.createElement("pre", { className: "mt-2 whitespace-pre-wrap" }, this.state.error.toString())));
    }
    return this.props.children;
  }
}
__publicField(ErrorBoundary, "contextType", LanguageContext);
const SESSION_RESOURCE_INLINE_LIMIT = 700 * 1024;
const SESSION_RESOURCE_CHUNK_SIZE = 180 * 1024;
const SESSION_ASSET_WRITE_CONCURRENCY = 3;
const stripUndefinedForFirestore = (obj) => {
  if (obj === null || obj === void 0) return obj;
  if (Array.isArray(obj)) return obj.map((v) => v === void 0 ? null : stripUndefinedForFirestore(v));
  if (typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== void 0).map(([k, v]) => [k, stripUndefinedForFirestore(v)])
    );
  }
  return obj;
};
const jsonByteLength = (value) => {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  try {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str).length;
  } catch (_) {
  }
  return str.length;
};
const hashStringForSessionAsset = (value) => {
  const str = typeof value === "string" ? value : JSON.stringify(value || "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const sanitizeSessionAssetIdPart = (value) => String(value || "x").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80) || "x";
const makeSessionAssetId = (prefix, parts) => {
  if (Array.isArray(parts) && parts.length) {
    return [prefix].concat(parts.map(sanitizeSessionAssetIdPart)).join("_").slice(0, 420);
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};
const getSessionAssetRef = (appId, assetId) => doc(db, "artifacts", appId, "public", "data", "session_assets", assetId);
const getSessionAssetSecurityMetadata = (sessionCode) => {
  const ownerUid = window.__alloFirebase && window.__alloFirebase.auth && window.__alloFirebase.auth.currentUser && window.__alloFirebase.auth.currentUser.uid;
  const parentId = sanitizeSessionAssetIdPart(sessionCode);
  if (!ownerUid) throw new Error("Firebase Authentication must be ready before uploading session assets.");
  if (!sessionCode || parentId !== String(sessionCode)) throw new Error("A valid session or assignment ID is required for asset upload.");
  const parentKind = parentId.startsWith("HW-") ? "assignment" : "live";
  const now = /* @__PURE__ */ new Date();
  const lifetimeMs = parentKind === "assignment" ? 30 * 24 * 60 * 60 * 1e3 : 24 * 60 * 60 * 1e3;
  return {
    ownerUid,
    parentId,
    parentKind,
    createdAt: now,
    expiresAt: new Date(now.getTime() + lifetimeMs)
  };
};
const _sessionAssetUploadMemo = /* @__PURE__ */ new Set();
const enqueueChunkedStringAsset = (appId, assetId, kind, data, writeTasks, metadata = {}, options = {}) => {
  const memoWrites = !!options.contentAddressed;
  const pushSetDoc = (docId, payload) => {
    const memoKey = `${appId}|${docId}`;
    if (memoWrites && _sessionAssetUploadMemo.has(memoKey)) return;
    writeTasks.push(() => Promise.resolve(setDoc(getSessionAssetRef(appId, docId), payload)).then(() => {
      if (memoWrites) _sessionAssetUploadMemo.add(memoKey);
    }));
  };
  const text = typeof data === "string" ? data : JSON.stringify(data);
  if (jsonByteLength(text) > SESSION_RESOURCE_CHUNK_SIZE) {
    const chunkIds = [];
    for (let offset = 0; offset < text.length; offset += SESSION_RESOURCE_CHUNK_SIZE) {
      const chunkId = `${assetId}_chunk_${chunkIds.length}`;
      chunkIds.push(chunkId);
      pushSetDoc(chunkId, {
        kind: `${kind}Chunk`,
        parent: assetId,
        index: chunkIds.length - 1,
        data: text.slice(offset, offset + SESSION_RESOURCE_CHUNK_SIZE),
        ...metadata
      });
    }
    pushSetDoc(assetId, stripUndefinedForFirestore({
      kind: `${kind}Chunks`,
      chunks: chunkIds,
      byteLength: jsonByteLength(text),
      ...metadata
    }));
  } else {
    pushSetDoc(assetId, stripUndefinedForFirestore({
      kind,
      data: text,
      byteLength: jsonByteLength(text),
      ...metadata
    }));
  }
};
const enqueueSessionResourceAsset = (appId, assetId, item, itemJson, writeTasks, metadata = {}) => {
  if (jsonByteLength(itemJson) > SESSION_RESOURCE_CHUNK_SIZE) {
    enqueueChunkedStringAsset(appId, assetId, "sessionResource", itemJson, writeTasks, {
      id: item && item.id,
      type: item && item.type,
      title: item && item.title,
      meta: item && item.meta,
      ...metadata
    });
  } else {
    writeTasks.push(() => setDoc(getSessionAssetRef(appId, assetId), stripUndefinedForFirestore({
      kind: "sessionResource",
      resource: item,
      byteLength: jsonByteLength(itemJson),
      ...metadata
    })));
  }
};
const stripUnsafeLiveSessionFields = (value, keyName = "") => {
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^(audioRecording|rawAudio|voiceClip|recording)$/i.test(keyName) || /^data:audio/i.test(value)) return null;
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => stripUnsafeLiveSessionFields(entry, keyName));
  if (typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    Object.keys(value).forEach((key) => {
      if (/^(audioRecording|rawAudio|voiceClip|recording|mimeType)$/i.test(key)) return;
      out[key] = stripUnsafeLiveSessionFields(value[key], key);
    });
    return out;
  }
  return value;
};
const compactLargeSessionResources = (appId, resources, writeTasks, options = {}) => {
  let resourcesJson = "";
  try {
    resourcesJson = JSON.stringify(resources);
  } catch (_) {
    return resources;
  }
  const shouldExternalize = options.alwaysExternalize || jsonByteLength(resourcesJson) > SESSION_RESOURCE_INLINE_LIMIT;
  if (!shouldExternalize) {
    return resources;
  }
  console.log("[SESSION DEBUG] Storing live-session resource bodies as refs outside the session doc.");
  const sessionCode = options.sessionCode || "session";
  const securityMetadata = options.securityMetadata || {};
  const manifest = resources.map((item, index) => {
    let itemJson = "";
    try {
      itemJson = JSON.stringify(item);
    } catch (_) {
      itemJson = JSON.stringify({
        id: item && item.id,
        type: item && item.type,
        title: item && item.title,
        data: item && item.data
      });
    }
    const itemHash = hashStringForSessionAsset(itemJson);
    const assetId = makeSessionAssetId("res", [sessionCode, index, item && item.id || item && item.type || "resource"]);
    enqueueSessionResourceAsset(appId, assetId, item, itemJson, writeTasks, securityMetadata);
    return stripUndefinedForFirestore({
      id: item && item.id || assetId,
      type: item && item.type || "resource",
      title: item && item.title || "",
      meta: item && item.meta,
      __alloResourceRef: assetId,
      __alloResourceBytes: jsonByteLength(itemJson),
      __alloResourceHash: itemHash,
      __alloResourceIndex: index
    });
  });
  let manifestJson = "";
  try {
    manifestJson = JSON.stringify(manifest);
  } catch (_) {
    return manifest;
  }
  if (jsonByteLength(manifestJson) <= SESSION_RESOURCE_INLINE_LIMIT) {
    return manifest;
  }
  const manifestHash = hashStringForSessionAsset(manifestJson);
  const manifestId = makeSessionAssetId("manifest", [sessionCode, manifestHash]);
  enqueueChunkedStringAsset(appId, manifestId, "sessionResourcesManifest", manifestJson, writeTasks, {
    count: manifest.length,
    hash: manifestHash,
    ...securityMetadata
  });
  return [stripUndefinedForFirestore({
    id: manifestId,
    type: "session-resources-manifest",
    title: "Live session resources",
    __alloResourcesManifestRef: manifestId,
    __alloResourceCount: manifest.length,
    __alloResourcesManifestHash: manifestHash,
    __alloResourceBytes: jsonByteLength(manifestJson)
  })];
};
const runFirestoreWriteTasks = async (writeTasks, concurrency = SESSION_ASSET_WRITE_CONCURRENCY) => {
  if (!Array.isArray(writeTasks) || writeTasks.length === 0) return;
  const workerCount = Math.max(1, Math.min(concurrency, writeTasks.length));
  let nextIndex = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < writeTasks.length) {
      const task = writeTasks[nextIndex++];
      await task();
    }
  });
  await Promise.all(workers);
};
const uploadSessionAssets = async (appId, resources, sessionCode) => {
  console.log("[SESSION DEBUG] uploadSessionAssets called, resources:", resources?.length);
  if (!resources || !Array.isArray(resources)) return;
  try {
    resources.forEach((r, i) => {
      try {
        structuredClone(r);
      } catch (cloneErr) {
        console.error(`[SESSION DEBUG] Resource ${i} (${r?.type}/${r?.title}) CANNOT be cloned:`, cloneErr?.message);
        if (r && typeof r === "object") {
          Object.keys(r).forEach((key) => {
            try {
              structuredClone(r[key]);
            } catch (keyErr) {
              console.error(`[SESSION DEBUG]   Key "${key}" is NOT cloneable:`, keyErr?.message, typeof r[key]);
              if (key === "data" && r[key] && typeof r[key] === "object") {
                Object.keys(r[key]).forEach((subKey) => {
                  try {
                    structuredClone(r[key][subKey]);
                  } catch (subErr) {
                    console.error(`[SESSION DEBUG]     data.${subKey} is NOT cloneable:`, subErr?.message, typeof r[key][subKey]);
                  }
                });
              }
            }
          });
        }
      }
    });
  } catch (preCheckErr) {
    console.error("[SESSION DEBUG] Pre-check error:", preCheckErr);
  }
  const securityMetadata = getSessionAssetSecurityMetadata(sessionCode);
  const safeResources = structuredClone(stripUnsafeLiveSessionFields(resources));
  const writeTasks = [];
  const processField = (obj, key, assetSeed) => {
    const val = obj[key];
    if (val && typeof val === "string" && val.startsWith("data:image")) {
      const assetId = makeSessionAssetId("img", assetSeed.concat([key, hashStringForSessionAsset(val)]));
      obj[key] = `ref::${assetId}`;
      enqueueChunkedStringAsset(appId, assetId, "sessionImage", val, writeTasks, securityMetadata, { contentAddressed: true });
    }
  };
  const processJsonField = (obj, key, prefix, sessionSeed) => {
    const val = obj && obj[key];
    if (!val || typeof val !== "object" || Array.isArray(val)) return;
    let json = "";
    try {
      json = JSON.stringify(val);
    } catch (_) {
      return;
    }
    if (jsonByteLength(json) <= 2048) return;
    const assetId = makeSessionAssetId(prefix, [sessionSeed, hashStringForSessionAsset(json)]);
    obj[key] = `jsonref::${assetId}`;
    enqueueChunkedStringAsset(appId, assetId, "sessionJson", json, writeTasks, securityMetadata, { contentAddressed: true });
  };
  safeResources.forEach((item, index) => {
    const seed = [sessionCode || "session", index, item && item.id || item && item.type || "resource"];
    if (item.type === "image" && item.data) {
      processField(item.data, "imageUrl", seed);
    }
    if (item.type === "glossary" && Array.isArray(item.data)) {
      item.data.forEach((term, termIndex) => {
        processField(term, "image", seed.concat(["term", termIndex]));
      });
    }
    if (item.type === "adventure" && item.data) {
      processField(item.data, "sceneImage", seed);
      if (Array.isArray(item.data.inventory)) {
        item.data.inventory.forEach((inv, invIndex) => processField(inv, "image", seed.concat(["inventory", invIndex])));
      }
    }
    if (item.type === "persona" && Array.isArray(item.data)) {
      item.data.forEach((p, personaIndex) => processField(p, "avatarUrl", seed.concat(["persona", personaIndex])));
    }
    if (item.type === "word-sounds" && Array.isArray(item.data)) {
      item.data.forEach((wordItem, wordIndex) => {
        if (!wordItem || typeof wordItem !== "object") return;
        processField(wordItem, "image", seed.concat(["word", wordIndex]));
        processJsonField(wordItem, "_ttsAssets", "wsaudio", sessionCode || "session");
        processJsonField(wordItem, "_decodingAssets", "wsimg", sessionCode || "session");
        processJsonField(wordItem, "_aacAssets", "wsaac", sessionCode || "session");
      });
    }
  });
  const firestoreResources = stripUndefinedForFirestore(safeResources);
  const resourcesForSessionDoc = compactLargeSessionResources(appId, firestoreResources, writeTasks, { alwaysExternalize: true, sessionCode, securityMetadata });
  await runFirestoreWriteTasks(writeTasks);
  return resourcesForSessionDoc;
};
const loadChunkedAssetString = async (appId, payload) => {
  if (!payload || !Array.isArray(payload.chunks)) return "";
  const chunkSnaps = await Promise.all(payload.chunks.map((chunkId) => getDoc(getSessionAssetRef(appId, chunkId))));
  return chunkSnaps.map((chunkSnap) => chunkSnap.exists() ? (chunkSnap.data() || {}).data || "" : "").join("");
};
const hydrateResourcesManifest = async (appId, resources) => {
  const source = Array.isArray(resources) ? resources : [];
  const expanded = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || !item.__alloResourcesManifestRef) {
      expanded.push(item);
      continue;
    }
    try {
      const manifestSnap = await getDoc(getSessionAssetRef(appId, item.__alloResourcesManifestRef));
      if (!manifestSnap.exists()) continue;
      const payload = manifestSnap.data() || {};
      let manifestJson = "";
      if (payload.kind === "sessionResourcesManifest" && typeof payload.data === "string") {
        manifestJson = payload.data;
      } else if (payload.kind === "sessionResourcesManifestChunks" && Array.isArray(payload.chunks)) {
        manifestJson = await loadChunkedAssetString(appId, payload);
      }
      if (!manifestJson) continue;
      const manifestItems = JSON.parse(manifestJson);
      if (Array.isArray(manifestItems)) expanded.push(...manifestItems);
    } catch (e) {
      warnLog("Failed to load session resources manifest", item.__alloResourcesManifestRef);
    }
  }
  return expanded;
};
const hydrateSessionAssets = async (appId, resources) => {
  const manifestResources = await hydrateResourcesManifest(appId, resources);
  const hydrated = structuredClone(manifestResources);
  const resourceFetchPromises = [];
  hydrated.forEach((item, index) => {
    if (!item || typeof item !== "object" || !item.__alloResourceRef) return;
    const assetRef = getSessionAssetRef(appId, item.__alloResourceRef);
    const promise = getDoc(assetRef).then(async (snap) => {
      if (!snap.exists()) return;
      const payload = snap.data() || {};
      if (payload.kind === "sessionResource" && payload.resource) {
        hydrated[index] = payload.resource;
        return;
      }
      if (payload.kind === "sessionResourceChunks" && Array.isArray(payload.chunks)) {
        const json = await loadChunkedAssetString(appId, payload);
        try {
          hydrated[index] = JSON.parse(json);
        } catch (e) {
          warnLog("Failed to parse session resource chunks", item.__alloResourceRef);
        }
      }
    }).catch(() => warnLog("Failed to load session resource", item.__alloResourceRef));
    resourceFetchPromises.push(promise);
  });
  await Promise.all(resourceFetchPromises);
  const fetchPromises = [];
  const restoreField = (obj, key) => {
    const val = obj[key];
    if (val && typeof val === "string" && val.startsWith("ref::")) {
      const assetId = val.split("ref::")[1];
      const assetRef = getSessionAssetRef(appId, assetId);
      const promise = getDoc(assetRef).then(async (snap) => {
        if (snap.exists()) {
          const payload = snap.data() || {};
          if (payload.kind === "sessionImageChunks" && Array.isArray(payload.chunks)) {
            obj[key] = await loadChunkedAssetString(appId, payload);
          } else {
            obj[key] = payload.data;
          }
        }
      }).catch((e) => warnLog("Failed to load asset", assetId));
      fetchPromises.push(promise);
    }
  };
  const restoreJsonField = (obj, key) => {
    const val = obj && obj[key];
    if (val && typeof val === "string" && val.startsWith("jsonref::")) {
      const assetId = val.slice("jsonref::".length);
      const promise = getDoc(getSessionAssetRef(appId, assetId)).then(async (snap) => {
        if (!snap.exists()) {
          obj[key] = null;
          return;
        }
        const payload = snap.data() || {};
        const json = Array.isArray(payload.chunks) ? await loadChunkedAssetString(appId, payload) : payload.data;
        try {
          obj[key] = JSON.parse(json || "null");
        } catch (_) {
          obj[key] = null;
        }
      }).catch(() => {
        obj[key] = null;
        warnLog("Failed to load asset", assetId);
      });
      fetchPromises.push(promise);
    }
  };
  hydrated.forEach((item) => {
    if (item.type === "image" && item.data) {
      restoreField(item.data, "imageUrl");
    }
    if (item.type === "glossary" && Array.isArray(item.data)) {
      item.data.forEach((term) => restoreField(term, "image"));
    }
    if (item.type === "adventure" && item.data) {
      restoreField(item.data, "sceneImage");
      if (Array.isArray(item.data.inventory)) {
        item.data.inventory.forEach((inv) => restoreField(inv, "image"));
      }
    }
    if (item.type === "persona" && Array.isArray(item.data)) {
      item.data.forEach((p) => restoreField(p, "avatarUrl"));
    }
    if (item.type === "word-sounds" && Array.isArray(item.data)) {
      item.data.forEach((wordItem) => {
        if (!wordItem || typeof wordItem !== "object") return;
        restoreField(wordItem, "image");
        restoreJsonField(wordItem, "_ttsAssets");
        restoreJsonField(wordItem, "_decodingAssets");
        restoreJsonField(wordItem, "_aacAssets");
      });
    }
  });
  await Promise.all(fetchPromises);
  return hydrated;
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.ModuleScopeExtras = {
  getSpeechLangCode: getSpeechLangCode,
  languageToTTSCode: languageToTTSCode,
  isRtlLang: isRtlLang,
  getContentDirection: getContentDirection,
  ErrorBoundary: ErrorBoundary,
  uploadSessionAssets: uploadSessionAssets,
  hydrateSessionAssets: hydrateSessionAssets,
};
// Window mirrors so existing host references resolve without a shim hop.
window.getSpeechLangCode = getSpeechLangCode;
window.languageToTTSCode = languageToTTSCode;
window.isRtlLang = isRtlLang;
window.getContentDirection = getContentDirection;
window.ErrorBoundary = ErrorBoundary;
window.uploadSessionAssets = uploadSessionAssets;
window.hydrateSessionAssets = hydrateSessionAssets;
if (typeof window._upgradeModuleScopeExtras === 'function') {
  try { window._upgradeModuleScopeExtras(); } catch (e) { console.warn('[ModuleScopeExtras] upgrade hook failed', e); }
}
console.log('[CDN] ModuleScopeExtrasModule loaded — 4 lang utils + ErrorBoundary + 2 session-asset helpers');
})();
