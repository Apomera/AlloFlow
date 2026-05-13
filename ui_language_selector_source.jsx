// ui_language_selector_source.jsx — UiLanguageSelector component CDN module
// Extracted from AlloFlowANTI.txt lines 1622-1749 (May 2026, Round 3 Tier A).
//
// Pure consumer of LanguageContext (mirrored to window.AlloLanguageContext at
// AlloFlowANTI.txt:1583 so identity is preserved across the module boundary).
// Renders the header language picker: select + custom input + import/export
// + regenerate. Used at exactly one site in the monolith (AlloFlowContent
// header, line ~22034, no props).
//
// Closure deps: handleRegenerate references `setConfirmDialog` from outer
// scope. In the monolith this is also unresolved at module top-level (App's
// setConfirmDialog at line 5740 is inside AlloFlowContent's body and not
// reachable via closure from the module-scope component) — extraction
// preserves that latent behavior. If a fix is needed, pass setConfirmDialog
// in via prop and update the call site.
//
// Icons: Globe, RefreshCw, FolderOpen, Download, ArrowRight (resolved
// lazily from window.AlloIcons at render time).

const UiLanguageSelector = () => {
  const { t, currentUiLanguage, setUiLanguage, isTranslating, progress, statusMessage, regenerateLanguage, exportLanguagePack, importLanguagePack } = useContext(LanguageContext);
  const [manualInput, setManualInput] = useState('');
  const fileInputRef = useRef(null);
  const commonLanguages = ["English", "Spanish", "French", "Arabic", "Chinese (Mandarin)", "Vietnamese", "Russian", "Portuguese"];
  const handleChange = (e) => {
    const val = e.target.value;
    if (val !== "Custom") {
        setUiLanguage(val);
        setManualInput('');
    }
  };
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
        setUiLanguage(manualInput.trim());
        setManualInput('');
    }
  };
  const handleRegenerate = () => {
      const _setConfirm = (typeof setConfirmDialog !== 'undefined') ? setConfirmDialog : (window && window.setConfirmDialog);
      if (typeof _setConfirm === 'function') {
        _setConfirm({ message: t('language_selector.confirm_regenerate') || 'Regenerate language pack?', onConfirm: () => {
            regenerateLanguage();
        }});
      } else {
        regenerateLanguage();
      }
  };
  if (isTranslating) {
      return (
          <div className="flex flex-col justify-center min-w-[260px] px-4 py-3 select-none bg-white rounded-lg border border-indigo-100 shadow-md animate-in fade-in zoom-in-95" role="status" aria-live="polite">
              <div className="flex justify-between text-[11px] font-black text-indigo-800 mb-3 uppercase tracking-wider items-center">
                  <span className="truncate max-w-[180px]">{statusMessage || "Translating..."}</span>
                  <span className="shrink-0 ml-2">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-400 inner-shadow mb-2" dir="ltr">
                  <div
                      className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                  ></div>
              </div>
              <div className="flex justify-start items-center gap-1 text-[11px] text-indigo-600 font-bold uppercase tracking-wider animate-pulse">
                  <RefreshCw size={12} className="animate-spin" /> Generating...
              </div>
          </div>
      );
  }
  return (
    <div className="relative group z-50 pointer-events-auto flex flex-col gap-1.5 items-end">
        <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-xl shadow-sm p-1 flex items-center gap-1 transition-all hover:shadow-md hover:border-indigo-300">
            <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                <Globe size={14} />
            </div>
            <select
                value={commonLanguages.includes(currentUiLanguage) ? currentUiLanguage : "Custom"}
                onChange={handleChange}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer py-1 pr-1 w-24 truncate"
                aria-label={t('language_selector.select_label')}
                data-help-key="ui_language_select"
            >
                {commonLanguages.map(lang => (
                    <option key={lang} value={lang}>{t(`languages_list.${lang}`) || lang}</option>
                ))}
                <option value="Custom">{t('language_selector.custom_option')}</option>
            </select>
            {currentUiLanguage !== 'English' && (
                <button
                    onClick={handleRegenerate}
                    className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title={t('language_selector.regenerate_tooltip')}
                    aria-label={t('language_selector.regenerate_tooltip')}
                    data-help-key="ui_lang_regenerate_btn"
                >
                    <RefreshCw size={12} />
                </button>
            )}
        </div>
        <div className="flex items-center gap-1">
            <div className="flex gap-1 bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-lg p-1 shadow-sm transition-all hover:shadow-md hover:border-indigo-300">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => importLanguagePack(e.target.files[0])}
                    className="hidden"
                    accept=".json"
                    aria-label={t('language_selector.upload_tooltip')}
                    data-help-key="ui_lang_import_btn"
                />
                <button
                    onClick={() => fileInputRef.current.click()} data-help-key="source_upload_btn"
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title={t('language_selector.upload_tooltip')}
                    aria-label={t('language_selector.upload_tooltip')}
                >
                    <FolderOpen size={12} />
                </button>
                {currentUiLanguage !== 'English' && (
                    <button
                        onClick={exportLanguagePack}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title={t('language_selector.download_tooltip')}
                        aria-label={t('language_selector.download_tooltip')}
                        data-help-key="ui_lang_export_btn"
                    >
                        <Download size={12} />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-lg p-1 shadow-sm transition-all hover:shadow-md hover:border-indigo-300">
                <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder={t('language_selector.search_placeholder')}
                    className="text-[11px] bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 w-20 px-1 text-slate-600 placeholder:text-slate-600"
                    aria-label={t('language_selector.search_placeholder')}
                    data-help-key="ui_lang_manual_input"
                />
                <button
                    onClick={handleManualSubmit}
                    disabled={!manualInput.trim()}
                    className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t('language_selector.set_custom_label')}
                    data-help-key="ui_lang_manual_submit"
                >
                    <ArrowRight size={10} />
                </button>
            </div>
        </div>
    </div>
  );
};
