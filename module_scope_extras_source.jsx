// module_scope_extras_source.jsx — module-scope cleanup bundle (Round 4 Tier B)
//
// Three small, low-coupling items that have been sitting at module scope of
// AlloFlowANTI.txt through several extraction rounds:
//
//   1. Language utilities (L679-L749, ~70 lines)
//      - getSpeechLangCode(friendlyName) → BCP-47 code, e.g. "Spanish" → "es-ES"
//      - languageToTTSCode(friendlyName) → 2-letter ISO, e.g. "Spanish" → "es"
//      - isRtlLang(languageName) → boolean
//      - getContentDirection(languageName) → 'rtl' | 'ltr'
//
//   2. ErrorBoundary class (L1680-L1727, ~48 lines)
//      - React error boundary used throughout AlloFlow's component tree.
//      - Reads LanguageContext for translated strings.
//      - Renders an AlertCircle/RefreshCw "try again" panel on error.
//
//   3. Session asset sync (L1765-L1861, ~97 lines)
//      - uploadSessionAssets(appId, resources)  → swaps inline data:image refs
//        out for Firestore session_assets doc references; returns sanitized copy.
//      - hydrateSessionAssets(appId, resources) → reverse: fetches the docs
//        and patches the data: URIs back in.
//      - Used when sharing live sessions so the Firestore doc isn't enormous.
//
// All three are pure module-scope, no closures over AlloFlowContent state.
// Host shims rebind to module exports via the upgrade-hook pattern.

// ── 1. Language utilities ──

const getSpeechLangCode = (friendlyName) => {
    if (!friendlyName) return 'en-US';
    const normalize = (str) => str.toLowerCase().trim();
    const input = normalize(friendlyName);
    const map = {
        'english': 'en-US',
        'spanish': 'es-ES',
        'french': 'fr-FR',
        'german': 'de-DE',
        'portuguese': 'pt-BR',
        'mandarin': 'zh-CN',
        'chinese': 'zh-CN',
        'chinese (mandarin)': 'zh-CN',
        'arabic': 'ar-SA',
        'vietnamese': 'vi-VN',
        'russian': 'ru-RU',
        'japanese': 'ja-JP',
        'italian': 'it-IT',
        'korean': 'ko-KR',
        'hindi': 'hi-IN',
        'dutch': 'nl-NL',
        'polish': 'pl-PL',
        'indonesian': 'id-ID',
        'turkish': 'tr-TR',
        'hebrew': 'he-IL',
        'swedish': 'sv-SE',
        'danish': 'da-DK',
        'norwegian': 'no-NO',
        'finnish': 'fi-FI',
        'greek': 'el-GR',
        'thai': 'th-TH',
        'czech': 'cs-CZ',
        'hungarian': 'hu-HU',
        'romanian': 'ro-RO',
        'ukrainian': 'uk-UA',
        'cantonese': 'zh-HK',
        'tagalog': 'fil-PH',
        'filipino': 'fil-PH',
        'bengali': 'bn-IN',
        'urdu': 'ur-PK',
        'malay': 'ms-MY',
        'swahili': 'sw-KE',
        'bulgarian': 'bg-BG',
        'croatian': 'hr-HR',
        'serbian': 'sr-RS',
        'slovak': 'sk-SK',
        'persian': 'fa-IR',
        'farsi': 'fa-IR',
        'tamil': 'ta-IN',
        'amharic': 'am-ET',
        'afrikaans': 'af-ZA',
        'kurdish': 'ku-TR',
    };
    return map[input] || 'en-US';
};
const languageToTTSCode = (friendlyName) => {
    const bcp47 = getSpeechLangCode(friendlyName);
    return bcp47.split('-')[0].toLowerCase();
};
const isRtlLang = (languageName) => {
    if (!languageName) return false;
    const rtlLanguages = [
        'Arabic', 'Hebrew', 'Persian', 'Urdu', 'Kurdish',
        'Pashto', 'Farsi', 'Yiddish'
    ];
    return rtlLanguages.includes(languageName);
};
const getContentDirection = (languageName) => {
    return isRtlLang(languageName) ? 'rtl' : 'ltr';
};

// ── 2. ErrorBoundary class ──
// LanguageContext is mirrored at window.AlloLanguageContext (build-script preamble
// aliases it). Icons resolved lazily via window.AlloIcons.

class ErrorBoundary extends React.Component {
  static contextType = LanguageContext;
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
    const t = this.context?.t || ((key) => { const f = { 'errors.component_title': 'Something went wrong', 'errors.default_desc': 'This component encountered an error. Please try again.', 'errors.try_again': 'Try Again', 'common.refresh': 'Refresh', 'common.error_details': 'Error Details' }; return f[key] || key; });
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 border-2 border-red-200 rounded-xl text-center animate-in fade-in zoom-in duration-300 relative z-50">
          <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4 shadow-sm">
             <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-black text-red-800 mb-2">{this.props.title || t('errors.component_title')}</h2>
          <p className="text-sm text-red-600 mb-6 max-w-md font-medium leading-relaxed">
            {this.props.fallbackMessage || t('errors.default_desc')}
          </p>
          <div className="flex gap-3">
              <button
                  aria-label={t('common.refresh')}
                onClick={() => {
                    if (this.props.onRetry) this.props.onRetry();
                    this.setState({ hasError: false, error: null });
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2 active:scale-95"
              >
                <RefreshCw size={16} /> {this.props.retryLabel || t('errors.try_again')}
              </button>
          </div>
          {Boolean(this.state.error) && (
              <details className="mt-8 text-[11px] text-red-400 text-left max-w-sm opacity-60 cursor-pointer">
                  <summary>{t('common.error_details')}</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── 3. Session asset sync ──
// Firestore deps (doc, db, setDoc, getDoc) are mirrored to window.* by the host;
// the build-script preamble aliases them as locals.

const uploadSessionAssets = async (appId, resources) => {
    console.log("[SESSION DEBUG] uploadSessionAssets called, resources:", resources?.length);
    if (!resources || !Array.isArray(resources)) return;
    try {
        resources.forEach((r, i) => {
            try {
                structuredClone(r);
            } catch (cloneErr) {
                console.error(`[SESSION DEBUG] Resource ${i} (${r?.type}/${r?.title}) CANNOT be cloned:`, cloneErr?.message);
                if (r && typeof r === 'object') {
                    Object.keys(r).forEach(key => {
                        try { structuredClone(r[key]); } catch(keyErr) {
                            console.error(`[SESSION DEBUG]   Key "${key}" is NOT cloneable:`, keyErr?.message, typeof r[key]);
                            if (key === 'data' && r[key] && typeof r[key] === 'object') {
                                Object.keys(r[key]).forEach(subKey => {
                                    try { structuredClone(r[key][subKey]); } catch(subErr) {
                                        console.error(`[SESSION DEBUG]     data.${subKey} is NOT cloneable:`, subErr?.message, typeof r[key][subKey]);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    } catch(preCheckErr) {
        console.error("[SESSION DEBUG] Pre-check error:", preCheckErr);
    }
    const safeResources = structuredClone(resources);
    const writePromises = [];
    const processField = (obj, key) => {
        const val = obj[key];
        if (val && typeof val === 'string' && val.startsWith('data:image')) {
            const assetId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            obj[key] = `ref::${assetId}`;
            const assetRef = doc(db, 'artifacts', appId, 'public', 'data', 'session_assets', assetId);
            writePromises.push(setDoc(assetRef, { data: val }));
        }
    };
    safeResources.forEach(item => {
        if (item.type === 'image' && item.data) {
            processField(item.data, 'imageUrl');
        }
        if (item.type === 'glossary' && Array.isArray(item.data)) {
            item.data.forEach(term => {
                processField(term, 'image');
            });
        }
        if (item.type === 'adventure' && item.data) {
            processField(item.data, 'sceneImage');
            if (Array.isArray(item.data.inventory)) {
                item.data.inventory.forEach(inv => processField(inv, 'image'));
            }
        }
        if (item.type === 'persona' && Array.isArray(item.data)) {
            item.data.forEach(p => processField(p, 'avatarUrl'));
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
        if (val && typeof val === 'string' && val.startsWith('ref::')) {
            const assetId = val.split('ref::')[1];
            const assetRef = doc(db, 'artifacts', appId, 'public', 'data', 'session_assets', assetId);
            const promise = getDoc(assetRef).then(snap => {
                if (snap.exists()) {
                    obj[key] = snap.data().data;
                }
            }).catch(e => warnLog("Failed to load asset", assetId));
            fetchPromises.push(promise);
        }
    };
    hydrated.forEach(item => {
        if (item.type === 'image' && item.data) {
            restoreField(item.data, 'imageUrl');
        }
        if (item.type === 'glossary' && Array.isArray(item.data)) {
            item.data.forEach(term => restoreField(term, 'image'));
        }
        if (item.type === 'adventure' && item.data) {
            restoreField(item.data, 'sceneImage');
            if (Array.isArray(item.data.inventory)) {
                item.data.inventory.forEach(inv => restoreField(inv, 'image'));
            }
        }
        if (item.type === 'persona' && Array.isArray(item.data)) {
            item.data.forEach(p => restoreField(p, 'avatarUrl'));
        }
    });
    await Promise.all(fetchPromises);
    return hydrated;
};
