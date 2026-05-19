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
    "kurdish": "ku-TR"
  };
  return map[input] || "en-US";
};
const languageToTTSCode = (friendlyName) => {
  const bcp47 = getSpeechLangCode(friendlyName);
  return bcp47.split("-")[0].toLowerCase();
};
const isRtlLang = (languageName) => {
  if (!languageName) return false;
  const rtlLanguages = [
    "Arabic",
    "Hebrew",
    "Persian",
    "Urdu",
    "Kurdish",
    "Pashto",
    "Farsi",
    "Yiddish"
  ];
  return rtlLanguages.includes(languageName);
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
      return /* @__PURE__ */ React.createElement("div", { className: "w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-xl text-center animate-in fade-in zoom-in duration-300 relative z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-100 p-4 rounded-full text-red-500 mb-4 shadow-sm" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 48 })), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-black text-red-800 mb-2" }, this.props.title || t("errors.component_title")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-600 mb-6 max-w-md font-medium leading-relaxed" }, this.props.fallbackMessage || t("errors.default_desc")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          "aria-label": t("common.refresh"),
          onClick: () => {
            if (this.props.onRetry) this.props.onRetry();
            this.setState({ hasError: false, error: null });
          },
          className: "px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2 active:scale-95"
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { size: 16 }),
        " ",
        this.props.retryLabel || t("errors.try_again")
      )), Boolean(this.state.error) && /* @__PURE__ */ React.createElement("details", { className: "mt-8 text-[11px] text-red-600 text-left max-w-sm opacity-60 cursor-pointer" }, /* @__PURE__ */ React.createElement("summary", null, t("common.error_details")), /* @__PURE__ */ React.createElement("pre", { className: "mt-2 whitespace-pre-wrap" }, this.state.error.toString())));
    }
    return this.props.children;
  }
}
__publicField(ErrorBoundary, "contextType", LanguageContext);
const uploadSessionAssets = async (appId, resources) => {
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
  const safeResources = structuredClone(resources);
  const writePromises = [];
  const processField = (obj, key) => {
    const val = obj[key];
    if (val && typeof val === "string" && val.startsWith("data:image")) {
      const assetId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      obj[key] = `ref::${assetId}`;
      const assetRef = doc(db, "artifacts", appId, "public", "data", "session_assets", assetId);
      writePromises.push(setDoc(assetRef, { data: val }));
    }
  };
  safeResources.forEach((item) => {
    if (item.type === "image" && item.data) {
      processField(item.data, "imageUrl");
    }
    if (item.type === "glossary" && Array.isArray(item.data)) {
      item.data.forEach((term) => {
        processField(term, "image");
      });
    }
    if (item.type === "adventure" && item.data) {
      processField(item.data, "sceneImage");
      if (Array.isArray(item.data.inventory)) {
        item.data.inventory.forEach((inv) => processField(inv, "image"));
      }
    }
    if (item.type === "persona" && Array.isArray(item.data)) {
      item.data.forEach((p) => processField(p, "avatarUrl"));
    }
  });
  await Promise.all(writePromises);
  return safeResources;
};
const hydrateSessionAssets = async (appId, resources) => {
  const hydrated = structuredClone(resources);
  const fetchPromises = [];
  const restoreField = (obj, key) => {
    const val = obj[key];
    if (val && typeof val === "string" && val.startsWith("ref::")) {
      const assetId = val.split("ref::")[1];
      const assetRef = doc(db, "artifacts", appId, "public", "data", "session_assets", assetId);
      const promise = getDoc(assetRef).then((snap) => {
        if (snap.exists()) {
          obj[key] = snap.data().data;
        }
      }).catch((e) => warnLog("Failed to load asset", assetId));
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
