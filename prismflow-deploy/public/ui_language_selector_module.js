(function() {
'use strict';
if (window.AlloModules && window.AlloModules.UILanguageSelector) { console.log('[CDN] UiLanguageSelectorModule already loaded, skipping'); return; }
var React = window.React || React;
var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useRef = React.useRef;
var useContext = React.useContext;
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
  const fileInputRef = useRef(null);
  const commonLanguages = ["English", "Spanish", "French", "Arabic", "Chinese (Mandarin)", "Vietnamese", "Russian", "Portuguese"];
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
      _setConfirm({ message: t("language_selector.confirm_regenerate") || "Regenerate language pack?", onConfirm: () => {
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
    )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-start items-center gap-1 text-[11px] text-indigo-600 font-bold uppercase tracking-wider animate-pulse" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Generating..."));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "relative group z-50 pointer-events-auto flex flex-col gap-1.5 items-end" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-xl shadow-sm p-1 flex items-center gap-1 transition-all hover:shadow-md hover:border-indigo-300" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-100 p-1.5 rounded-lg text-indigo-600" }, /* @__PURE__ */ React.createElement(Globe, { size: 14 })), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: commonLanguages.includes(currentUiLanguage) ? currentUiLanguage : "Custom",
      onChange: handleChange,
      className: "bg-transparent text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer py-1 pr-1 w-24 truncate",
      "aria-label": t("language_selector.select_label"),
      "data-help-key": "ui_language_select"
    },
    commonLanguages.map((lang) => /* @__PURE__ */ React.createElement("option", { key: lang, value: lang }, t(`languages_list.${lang}`) || lang)),
    /* @__PURE__ */ React.createElement("option", { value: "Custom" }, t("language_selector.custom_option"))
  ), currentUiLanguage !== "English" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleRegenerate,
      className: "p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors",
      title: t("language_selector.regenerate_tooltip"),
      "aria-label": t("language_selector.regenerate_tooltip"),
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
      "aria-label": t("language_selector.upload_tooltip"),
      "data-help-key": "ui_lang_import_btn"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => fileInputRef.current.click(),
      "data-help-key": "source_upload_btn",
      className: "p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors",
      title: t("language_selector.upload_tooltip"),
      "aria-label": t("language_selector.upload_tooltip")
    },
    /* @__PURE__ */ React.createElement(FolderOpen, { size: 12 })
  ), currentUiLanguage !== "English" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: exportLanguagePack,
      className: "p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors",
      title: t("language_selector.download_tooltip"),
      "aria-label": t("language_selector.download_tooltip"),
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
      placeholder: t("language_selector.search_placeholder"),
      className: "text-[11px] bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 w-20 px-1 text-slate-600 placeholder:text-slate-600",
      "aria-label": t("language_selector.search_placeholder"),
      "data-help-key": "ui_lang_manual_input"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleManualSubmit,
      disabled: !manualInput.trim(),
      className: "p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      "aria-label": t("language_selector.set_custom_label"),
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
