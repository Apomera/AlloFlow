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
  { value: "Amharic", endonym: "\u12a0\u121b\u122d\u129b", provenance: "ai-drafted" },
  { value: "Arabic", endonym: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", provenance: "ai-drafted" },
  { value: "Bengali", endonym: "\u09ac\u09be\u0982\u09b2\u09be", provenance: "ai-drafted" },
  { value: "Burmese", endonym: "\u1019\u103c\u1014\u103a\u1019\u102c", provenance: "ai-drafted" },
  { value: "Chin (Falam)", endonym: "Laiholh (Falam)", provenance: "english-passthrough" },
  { value: "Chin (Hakha)", endonym: "Laiholh (Hakha)", provenance: "english-passthrough" },
  { value: "Chinese (Simplified)", endonym: "\u7b80\u4f53\u4e2d\u6587", provenance: "ai-drafted" },
  { value: "Chinese (Traditional)", endonym: "\u7e41\u9ad4\u4e2d\u6587", provenance: "ai-drafted" },
  { value: "Dari", endonym: "\u062f\u0631\u06cc", provenance: "ai-drafted" },
  { value: "Dutch", endonym: "Nederlands", provenance: "ai-drafted" },
  { value: "Esperanto", endonym: "Esperanto", provenance: "ai-drafted" },
  { value: "Farsi", endonym: "\u0641\u0627\u0631\u0633\u06cc", provenance: "ai-drafted" },
  { value: "French", endonym: "Fran\u00e7ais", provenance: "ai-drafted" },
  { value: "French (Canadian)", endonym: "Fran\u00e7ais (Canada)", provenance: "ai-drafted" },
  { value: "German", endonym: "Deutsch", provenance: "ai-drafted" },
  { value: "Greek", endonym: "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac", provenance: "ai-drafted" },
  { value: "Gujarati", endonym: "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0", provenance: "ai-drafted" },
  { value: "Haitian Creole", endonym: "Krey\u00f2l Ayisyen", provenance: "ai-drafted" },
  { value: "Hausa", endonym: "Hausa", provenance: "ai-drafted" },
  { value: "Hebrew", endonym: "\u05e2\u05d1\u05e8\u05d9\u05ea", provenance: "ai-drafted" },
  { value: "Hindi", endonym: "\u0939\u093f\u0928\u094d\u0926\u0940", provenance: "ai-drafted" },
  { value: "Hmong", endonym: "Hmoob", provenance: "ai-drafted" },
  { value: "Igbo", endonym: "Igbo", provenance: "ai-drafted" },
  { value: "Indonesian", endonym: "Bahasa Indonesia", provenance: "ai-drafted" },
  { value: "Italian", endonym: "Italiano", provenance: "ai-drafted" },
  { value: "Japanese", endonym: "\u65e5\u672c\u8a9e", provenance: "ai-drafted" },
  { value: "Kannada", endonym: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1", provenance: "ai-drafted" },
  { value: "Karen", endonym: "\u1000\u100a\u102e\u1000\u103b\u102d\u102c\u103a", provenance: "partial-draft" },
  { value: "Khmer", endonym: "\u1797\u17b6\u179f\u17b6\u1781\u17d2\u1798\u17c2\u179a", provenance: "ai-drafted" },
  { value: "Kinyarwanda", endonym: "Ikinyarwanda", provenance: "ai-drafted" },
  { value: "Kirundi", endonym: "Ikirundi", provenance: "ai-drafted" },
  { value: "Korean", endonym: "\ud55c\uad6d\uc5b4", provenance: "ai-drafted" },
  { value: "Lao", endonym: "\u0e9e\u0eb2\u0eaa\u0eb2\u0ea5\u0eb2\u0ea7", provenance: "ai-drafted" },
  { value: "Latin", endonym: "Latina", provenance: "ai-drafted" },
  { value: "Lingala", endonym: "Ling\u00e1la", provenance: "ai-drafted" },
  { value: "Maay Maay", endonym: "Af-Maay", provenance: "english-passthrough" },
  { value: "Malayalam", endonym: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02", provenance: "ai-drafted" },
  { value: "Marathi", endonym: "\u092e\u0930\u093e\u0920\u0940", provenance: "ai-drafted" },
  { value: "Marshallese", endonym: "Kajin \u1e42aje\u1e37", provenance: "partial-draft" },
  { value: "Nepali", endonym: "\u0928\u0947\u092a\u093e\u0932\u0940", provenance: "ai-drafted" },
  { value: "Pashto", endonym: "\u067e\u069a\u062a\u0648", provenance: "ai-drafted" },
  { value: "Polish", endonym: "Polski", provenance: "ai-drafted" },
  { value: "Portuguese (Angola)", endonym: "Portugu\u00eas (Angola)", provenance: "needs-repair" },
  { value: "Portuguese (Brazil)", endonym: "Portugu\u00eas (Brasil)", provenance: "ai-drafted" },
  { value: "Portuguese (Portugal)", endonym: "Portugu\u00eas (Portugal)", provenance: "ai-drafted" },
  { value: "Punjabi", endonym: "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40", provenance: "ai-drafted" },
  { value: "Romanian", endonym: "Rom\u00e2n\u0103", provenance: "ai-drafted" },
  { value: "Russian", endonym: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", provenance: "ai-drafted" },
  { value: "Somali", endonym: "Soomaali", provenance: "ai-drafted" },
  { value: "Spanish (Castilian)", endonym: "Espa\u00f1ol (Espa\u00f1a)", provenance: "ai-drafted" },
  { value: "Spanish (Latin America)", endonym: "Espa\u00f1ol (Latinoam\u00e9rica)", provenance: "ai-drafted" },
  { value: "Swahili", endonym: "Kiswahili", provenance: "ai-drafted" },
  { value: "Tagalog", endonym: "Tagalog", provenance: "ai-drafted" },
  { value: "Tamil", endonym: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd", provenance: "ai-drafted" },
  { value: "Telugu", endonym: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41", provenance: "ai-drafted" },
  { value: "Thai", endonym: "\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22", provenance: "ai-drafted" },
  { value: "Tigrinya", endonym: "\u1275\u130d\u122d\u129b", provenance: "ai-drafted" },
  { value: "Turkish", endonym: "T\u00fcrk\u00e7e", provenance: "ai-drafted" },
  { value: "Ukrainian", endonym: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430", provenance: "ai-drafted" },
  { value: "Urdu", endonym: "\u0627\u0631\u062f\u0648", provenance: "ai-drafted" },
  { value: "Vietnamese", endonym: "Ti\u1ebfng Vi\u1ec7t", provenance: "ai-drafted" },
  { value: "Yoruba", endonym: "Yor\u00f9b\u00e1", provenance: "ai-drafted" },
];
  const [deployedLanguages, setDeployedLanguages] = useState(FALLBACK_LANGUAGE_OPTIONS.filter((d) => d.value !== 'English')); // sorted display names from manifest
  const fileInputRef = useRef(null);
  // Fetch the language-pack manifest from Cloudflare on mount. The dropdown
  // shows only languages with actual deployed packs (plus English as the source
  // language, plus Custom… for free-form input that triggers regenerateLanguage).
  // Mirrors the URL+fallback pattern used by language_matcher_module.js so it
  // works even when CF Pages is briefly unavailable.
  useEffect(() => {
    let cancelled = false;
    const urls = [
      './lang/manifest.json',
      'https://alloflow-cdn.pages.dev/lang/manifest.json',
      'https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/manifest.json'
    ];
    (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(u, { cache: 'no-cache' });
          if (!r.ok) continue;
          const m = await r.json();
          if (m && Array.isArray(m.available)) {
            // Keep the endonym alongside the English display name. The VALUE
            // stays the English display (that is what setUiLanguage and the
            // pack lookup expect); only the LABEL changes.
            const displays = m.available
              .filter(e => e && e.display)
              .map(e => ({
                value: e.display,
                endonym: e.endonym || e.display,
                provenance: e.provenance || 'ai-drafted'
              }))
              .sort((a, b) => a.value.localeCompare(b.value));
            if (!cancelled) setDeployedLanguages(displays);
            return;
          }
        } catch (_) { /* try next URL */ }
      }
      // Silent fallback — picker still works with English + Custom only.
    })();
    return () => { cancelled = true; };
  }, []);
  // English is always available (it's the source language, not in the manifest).
  // Other languages come from the Cloudflare manifest so the picker stays in sync
  // with what's actually been built and deployed.
  const commonLanguages = [
    { value: 'English', endonym: 'English' },
    ...deployedLanguages.filter(d => d.value !== 'English'),
  ];
  // Label a language in ITSELF, not in whatever language the UI happens to be.
  //
  // This list previously showed the English `display` name, translated through
  // t('languages_list.<name>') when a key happened to exist. Only 14 of 64
  // options had one, so the list read as a half-translated mix ("Inglés,
  // Acholi, Amharic, Árabe, Bengali...") — and even a complete set would fail
  // the person the picker exists for: someone who reads only Somali cannot find
  // their language in a Vietnamese-labelled list. An endonym is legible to its
  // own speaker whatever the current UI language is, which is why OS and
  // browser pickers work this way. It is also 63 strings instead of 63x63.
  //
  // Always show both names when they differ. A separator is used instead of
  // another pair of parentheses so variants such as "Español (España)" and
  // "Spanish (Castilian)" remain readable and unambiguous.
  const PROVENANCE_SUFFIX = {
    'english-passthrough': ' [English text, not yet translated]',
    'partial-draft': ' [partial draft, needs a native reviewer]',
    'needs-repair': ' [known errors, needs a native reviewer]'
  };
  const optionLabel = (entry) => {
    const endonym = entry.endonym || entry.value;
    const suffix = PROVENANCE_SUFFIX[entry.provenance] || '';
    if (endonym === entry.value) return entry.value + suffix;
    return endonym + ' — ' + entry.value + suffix;
  };
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
        _setConfirm({ message: languageCopy('language_selector.confirm_regenerate', 'Regenerate language pack?'), onConfirm: () => {
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
              <div className="flex justify-start items-center gap-1 text-[11px] text-indigo-600 font-bold uppercase tracking-wider animate-pulse motion-reduce:animate-none">
                  <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" /> {languageCopy('language_selector.status_generating', 'Generating translation...')}
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
                value={commonLanguages.some(l => l.value === currentUiLanguage) ? currentUiLanguage : "Custom"}
                onChange={handleChange}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer py-1 pr-1 w-24 truncate"
                aria-label={languageCopy('language_selector.select_label', 'Select UI Language')}
                data-help-key="ui_language_select"
            >
                {commonLanguages.map(lang => (
                    <option key={lang.value} value={lang.value}>{optionLabel(lang)}</option>
                ))}
                <option value="Custom">{languageCopy('language_selector.custom_option', 'Custom...')}</option>
            </select>
            {currentUiLanguage !== 'English' && (
                <button
                    onClick={handleRegenerate}
                    className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title={languageCopy('language_selector.regenerate_tooltip', 'Regenerate Translations')}
                    aria-label={languageCopy('language_selector.regenerate_tooltip', 'Regenerate Translations')}
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
                    aria-label={languageCopy('language_selector.upload_tooltip', 'Import Language Pack')}
                    data-help-key="ui_lang_import_btn"
                />
                <button
                    onClick={() => fileInputRef.current.click()} data-help-key="source_upload_btn"
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title={languageCopy('language_selector.upload_tooltip', 'Import Language Pack')}
                    aria-label={languageCopy('language_selector.upload_tooltip', 'Import Language Pack')}
                >
                    <FolderOpen size={12} />
                </button>
                {currentUiLanguage !== 'English' && (
                    <button
                        onClick={exportLanguagePack}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title={languageCopy('language_selector.download_tooltip', 'Export Language Pack')}
                        aria-label={languageCopy('language_selector.download_tooltip', 'Export Language Pack')}
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
                    placeholder={languageCopy('language_selector.search_placeholder', 'Enter Language...')}
                    className="text-[11px] bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 w-20 px-1 text-slate-600 placeholder:text-slate-600"
                    aria-label={languageCopy('language_selector.search_placeholder', 'Enter Language...')}
                    data-help-key="ui_lang_manual_input"
                />
                <button
                    onClick={handleManualSubmit}
                    disabled={!manualInput.trim()}
                    className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={languageCopy('language_selector.set_custom_label', 'Set Custom Language')}
                    data-help-key="ui_lang_manual_submit"
                >
                    <ArrowRight size={10} />
                </button>
            </div>
        </div>
    </div>
  );
};
