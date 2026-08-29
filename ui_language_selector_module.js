(function() {
'use strict';
if (window.AlloModules && window.AlloModules.UILanguageSelector) { console.log('[CDN] UiLanguageSelectorModule already loaded, skipping'); return; }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useRef = React.useRef;
var useContext = React.useContext;
var useEffect = React.useEffect;
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var Globe = _lazyIcon('Globe');
var RefreshCw = _lazyIcon('RefreshCw');
var FolderOpen = _lazyIcon('FolderOpen');
var Download = _lazyIcon('Download');
var ArrowRight = _lazyIcon('ArrowRight');
const UiLanguageSelector = () => {
  const { t, currentUiLanguage, setUiLanguage, isTranslating, progress, statusMessage, regenerateLanguage, exportLanguagePack, importLanguagePack } = useContext(LanguageContext);
  const [manualInput, setManualInput] = useState("");
  const languageCopy = (key, fallback) => {
    try {
      const value = t(key);
      return value && value !== key ? value : fallback;
    } catch (_) {
      return fallback;
    }
  };
  const FALLBACK_LANGUAGE_OPTIONS = [
    { value: "English", endonym: "English" },
    { value: "Acholi", endonym: "Leb Acholi", provenance: "english-passthrough" },
    { value: "Amharic", endonym: "\u12A0\u121B\u122D\u129B", provenance: "ai-drafted" },
    { value: "Arabic", endonym: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", provenance: "ai-drafted" },
    { value: "Bengali", endonym: "\u09AC\u09BE\u0982\u09B2\u09BE", provenance: "ai-drafted" },
    { value: "Burmese", endonym: "\u1019\u103C\u1014\u103A\u1019\u102C", provenance: "ai-drafted" },
    { value: "Chin (Falam)", endonym: "Laiholh (Falam)", provenance: "english-passthrough" },
    { value: "Chin (Hakha)", endonym: "Laiholh (Hakha)", provenance: "english-passthrough" },
    { value: "Chinese (Simplified)", endonym: "\u7B80\u4F53\u4E2D\u6587", provenance: "ai-drafted" },
    { value: "Chinese (Traditional)", endonym: "\u7E41\u9AD4\u4E2D\u6587", provenance: "ai-drafted" },
    { value: "Dari", endonym: "\u062F\u0631\u06CC", provenance: "ai-drafted" },
    { value: "Dutch", endonym: "Nederlands", provenance: "ai-drafted" },
    { value: "Esperanto", endonym: "Esperanto", provenance: "ai-drafted" },
    { value: "Farsi", endonym: "\u0641\u0627\u0631\u0633\u06CC", provenance: "ai-drafted" },
    { value: "French", endonym: "Fran\xE7ais", provenance: "ai-drafted" },
    { value: "French (Canadian)", endonym: "Fran\xE7ais (Canada)", provenance: "ai-drafted" },
    { value: "German", endonym: "Deutsch", provenance: "ai-drafted" },
    { value: "Greek", endonym: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC", provenance: "ai-drafted" },
    { value: "Gujarati", endonym: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0", provenance: "ai-drafted" },
    { value: "Haitian Creole", endonym: "Krey\xF2l Ayisyen", provenance: "ai-drafted" },
    { value: "Hausa", endonym: "Hausa", provenance: "ai-drafted" },
    { value: "Hebrew", endonym: "\u05E2\u05D1\u05E8\u05D9\u05EA", provenance: "ai-drafted" },
    { value: "Hindi", endonym: "\u0939\u093F\u0928\u094D\u0926\u0940", provenance: "ai-drafted" },
    { value: "Hmong", endonym: "Hmoob", provenance: "ai-drafted" },
    { value: "Igbo", endonym: "Igbo", provenance: "ai-drafted" },
    { value: "Indonesian", endonym: "Bahasa Indonesia", provenance: "ai-drafted" },
    { value: "Italian", endonym: "Italiano", provenance: "ai-drafted" },
    { value: "Japanese", endonym: "\u65E5\u672C\u8A9E", provenance: "ai-drafted" },
    { value: "Kannada", endonym: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1", provenance: "ai-drafted" },
    { value: "Karen", endonym: "\u1000\u100A\u102E\u1000\u103B\u102D\u102C\u103A", provenance: "partial-draft" },
    { value: "Khmer", endonym: "\u1797\u17B6\u179F\u17B6\u1781\u17D2\u1798\u17C2\u179A", provenance: "ai-drafted" },
    { value: "Kinyarwanda", endonym: "Ikinyarwanda", provenance: "ai-drafted" },
    { value: "Kirundi", endonym: "Ikirundi", provenance: "ai-drafted" },
    { value: "Korean", endonym: "\uD55C\uAD6D\uC5B4", provenance: "ai-drafted" },
    { value: "Lao", endonym: "\u0E9E\u0EB2\u0EAA\u0EB2\u0EA5\u0EB2\u0EA7", provenance: "ai-drafted" },
    { value: "Latin", endonym: "Latina", provenance: "ai-drafted" },
    { value: "Lingala", endonym: "Ling\xE1la", provenance: "ai-drafted" },
    { value: "Maay Maay", endonym: "Af-Maay", provenance: "english-passthrough" },
    { value: "Malayalam", endonym: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02", provenance: "ai-drafted" },
    { value: "Marathi", endonym: "\u092E\u0930\u093E\u0920\u0940", provenance: "ai-drafted" },
    { value: "Marshallese", endonym: "Kajin \u1E42aje\u1E37", provenance: "partial-draft" },
    { value: "Nepali", endonym: "\u0928\u0947\u092A\u093E\u0932\u0940", provenance: "ai-drafted" },
    { value: "Pashto", endonym: "\u067E\u069A\u062A\u0648", provenance: "ai-drafted" },
    { value: "Polish", endonym: "Polski", provenance: "ai-drafted" },
    { value: "Portuguese (Angola)", endonym: "Portugu\xEAs (Angola)", provenance: "needs-repair" },
    { value: "Portuguese (Brazil)", endonym: "Portugu\xEAs (Brasil)", provenance: "ai-drafted" },
    { value: "Portuguese (Portugal)", endonym: "Portugu\xEAs (Portugal)", provenance: "ai-drafted" },
    { value: "Punjabi", endonym: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40", provenance: "ai-drafted" },
    { value: "Romanian", endonym: "Rom\xE2n\u0103", provenance: "ai-drafted" },
    { value: "Russian", endonym: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", provenance: "ai-drafted" },
    { value: "Somali", endonym: "Soomaali", provenance: "ai-drafted" },
    { value: "Spanish (Castilian)", endonym: "Espa\xF1ol (Espa\xF1a)", provenance: "ai-drafted" },
    { value: "Spanish (Latin America)", endonym: "Espa\xF1ol (Latinoam\xE9rica)", provenance: "ai-drafted" },
    { value: "Swahili", endonym: "Kiswahili", provenance: "ai-drafted" },
    { value: "Tagalog", endonym: "Tagalog", provenance: "ai-drafted" },
    { value: "Tamil", endonym: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", provenance: "ai-drafted" },
    { value: "Telugu", endonym: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41", provenance: "ai-drafted" },
    { value: "Thai", endonym: "\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22", provenance: "ai-drafted" },
    { value: "Tigrinya", endonym: "\u1275\u130D\u122D\u129B", provenance: "ai-drafted" },
    { value: "Turkish", endonym: "T\xFCrk\xE7e", provenance: "ai-drafted" },
    { value: "Ukrainian", endonym: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", provenance: "ai-drafted" },
    { value: "Urdu", endonym: "\u0627\u0631\u062F\u0648", provenance: "ai-drafted" },
    { value: "Vietnamese", endonym: "Ti\u1EBFng Vi\u1EC7t", provenance: "ai-drafted" },
    { value: "Yoruba", endonym: "Yor\xF9b\xE1", provenance: "ai-drafted" }
  ];
  const [deployedLanguages, setDeployedLanguages] = useState(FALLBACK_LANGUAGE_OPTIONS.filter((d) => d.value !== "English"));
  const fileInputRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const urls = [
      "./lang/manifest.json",
      "https://alloflow-cdn.pages.dev/lang/manifest.json",
      "https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/manifest.json"
    ];
    (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(u, { cache: "no-cache" });
          if (!r.ok) continue;
          const m = await r.json();
          if (m && Array.isArray(m.available)) {
            const displays = m.available.filter((e) => e && e.display).map((e) => ({
              value: e.display,
              endonym: e.endonym || e.display,
              provenance: e.provenance || "ai-drafted"
            })).sort((a, b) => a.value.localeCompare(b.value));
            if (!cancelled) setDeployedLanguages(displays);
            return;
          }
        } catch (_) {
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const commonLanguages = [
    { value: "English", endonym: "English" },
    ...deployedLanguages.filter((d) => d.value !== "English")
  ];
  const PROVENANCE_SUFFIX = {
    "english-passthrough": " [English text, not yet translated]",
    "partial-draft": " [partial draft, needs a native reviewer]",
    "needs-repair": " [known errors, needs a native reviewer]"
  };
  const optionLabel = (entry) => {
    const endonym = entry.endonym || entry.value;
    const suffix = PROVENANCE_SUFFIX[entry.provenance] || "";
    if (endonym === entry.value) return entry.value + suffix;
    return endonym + " \u2014 " + entry.value + suffix;
  };
  const handleChange = (e) => {
    const val = e.target.value;
    if (val !== "Custom") {
      setUiLanguage(val);
      setManualInput("");
    }
  };
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setUiLanguage(manualInput.trim());
      setManualInput("");
    }
  };
  const handleRegenerate = () => {
    const _setConfirm = typeof setConfirmDialog !== "undefined" ? setConfirmDialog : window && window.setConfirmDialog;
    if (typeof _setConfirm === "function") {
      _setConfirm({ message: languageCopy("language_selector.confirm_regenerate", "Regenerate language pack?"), onConfirm: () => {
        regenerateLanguage();
      } });
    } else {
      regenerateLanguage();
    }
  };
  if (isTranslating) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex flex-col justify-center min-w-[260px] px-4 py-3 select-none bg-white rounded-lg border border-indigo-100 shadow-md animate-in fade-in zoom-in-95", role: "status", "aria-live": "polite" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[11px] font-black text-indigo-800 mb-3 uppercase tracking-wider items-center" }, /* @__PURE__ */ React.createElement("span", { className: "truncate max-w-[180px]" }, statusMessage || "Translating..."), /* @__PURE__ */ React.createElement("span", { className: "shrink-0 ml-2" }, progress, "%")), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-400 inner-shadow mb-2", dir: "ltr" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-indigo-600 h-full transition-all duration-300 ease-out",
        style: { width: `${progress}%` }
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-start items-center gap-1 text-[11px] text-indigo-600 font-bold uppercase tracking-wider animate-pulse motion-reduce:animate-none" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin motion-reduce:animate-none" }), " ", languageCopy("language_selector.status_generating", "Generating translation...")));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "relative group z-50 pointer-events-auto flex flex-col gap-1.5 items-end" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-xl shadow-sm p-1 flex items-center gap-1 transition-all hover:shadow-md hover:border-indigo-300" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-100 p-1.5 rounded-lg text-indigo-600" }, /* @__PURE__ */ React.createElement(Globe, { size: 14 })), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: commonLanguages.some((l) => l.value === currentUiLanguage) ? currentUiLanguage : "Custom",
      onChange: handleChange,
      className: "bg-transparent text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer py-1 pr-1 w-24 truncate",
      "aria-label": languageCopy("language_selector.select_label", "Select UI Language"),
      "data-help-key": "ui_language_select"
    },
    commonLanguages.map((lang) => /* @__PURE__ */ React.createElement("option", { key: lang.value, value: lang.value }, optionLabel(lang))),
    /* @__PURE__ */ React.createElement("option", { value: "Custom" }, languageCopy("language_selector.custom_option", "Custom..."))
  ), currentUiLanguage !== "English" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleRegenerate,
      className: "p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors",
      title: languageCopy("language_selector.regenerate_tooltip", "Regenerate Translations"),
      "aria-label": languageCopy("language_selector.regenerate_tooltip", "Regenerate Translations"),
      "data-help-key": "ui_lang_regenerate_btn"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 12 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-lg p-1 shadow-sm transition-all hover:shadow-md hover:border-indigo-300" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      ref: fileInputRef,
      onChange: (e) => importLanguagePack(e.target.files[0]),
      className: "hidden",
      accept: ".json",
      "aria-label": languageCopy("language_selector.upload_tooltip", "Import Language Pack"),
      "data-help-key": "ui_lang_import_btn"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => fileInputRef.current.click(),
      "data-help-key": "source_upload_btn",
      className: "p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors",
      title: languageCopy("language_selector.upload_tooltip", "Import Language Pack"),
      "aria-label": languageCopy("language_selector.upload_tooltip", "Import Language Pack")
    },
    /* @__PURE__ */ React.createElement(FolderOpen, { size: 12 })
  ), currentUiLanguage !== "English" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: exportLanguagePack,
      className: "p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors",
      title: languageCopy("language_selector.download_tooltip", "Export Language Pack"),
      "aria-label": languageCopy("language_selector.download_tooltip", "Export Language Pack"),
      "data-help-key": "ui_lang_export_btn"
    },
    /* @__PURE__ */ React.createElement(Download, { size: 12 })
  )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-lg p-1 shadow-sm transition-all hover:shadow-md hover:border-indigo-300" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: manualInput,
      onChange: (e) => setManualInput(e.target.value),
      onKeyDown: (e) => e.key === "Enter" && handleManualSubmit(),
      placeholder: languageCopy("language_selector.search_placeholder", "Enter Language..."),
      className: "text-[11px] bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 w-20 px-1 text-slate-600 placeholder:text-slate-600",
      "aria-label": languageCopy("language_selector.search_placeholder", "Enter Language..."),
      "data-help-key": "ui_lang_manual_input"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleManualSubmit,
      disabled: !manualInput.trim(),
      className: "p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      "aria-label": languageCopy("language_selector.set_custom_label", "Set Custom Language"),
      "data-help-key": "ui_lang_manual_submit"
    },
    /* @__PURE__ */ React.createElement(ArrowRight, { size: 10 })
  ))));
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.UILanguageSelector = (typeof UiLanguageSelector !== 'undefined') ? UiLanguageSelector : null;
window.UiLanguageSelectorExt = window.AlloModules.UILanguageSelector;
if (typeof window._upgradeUILanguageSelector === 'function') {
  try { window._upgradeUILanguageSelector(); } catch (e) { console.warn('[UILanguageSelector] upgrade hook failed', e); }
}
console.log('[CDN] UiLanguageSelectorModule loaded');
})();
