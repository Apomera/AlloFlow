/**
 * AlloFlow View - Launch Pad Splash
 * Extracted from AlloFlowANTI.txt isAppReady && !hasSelectedMode block
 * (130 lines body). The splash screen shown before role/mode selection:
 * AlloFlow logo, mic permission banner, 4 mode-selection cards
 * (Full / Guided / Learning Tools / Educator Tools), AI Backend Settings.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.LaunchPadView) {
    console.log('[CDN] ViewLaunchPadModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewLaunchPadModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Unplug = _lazyIcon('Unplug');

  function LaunchPadView(props) {
  var React = window.React;
  var useState = React.useState;
  var useContext = React.useContext;
  var t = props.t;
  var micBannerDismissed = props.micBannerDismissed;
  var _isCanvasEnv = props._isCanvasEnv;
  var micPermissionStatus = props.micPermissionStatus;
  var APP_CONFIG = props.APP_CONFIG;
  var requestMicPermission = props.requestMicPermission;
  var setHasSelectedMode = props.setHasSelectedMode;
  var setMicBannerDismissed = props.setMicBannerDismissed;
  var setGuidedMode = props.setGuidedMode;
  var setHasSelectedRole = props.setHasSelectedRole;
  var setShowWizard = props.setShowWizard;
  var setIsTeacherMode = props.setIsTeacherMode;
  var setShowLearningHub = props.setShowLearningHub;
  var setShowEducatorHub = props.setShowEducatorHub;
  var setPendingRole = props.setPendingRole;
  var setIsGateOpen = props.setIsGateOpen;
  var setShowAIBackendModal = props.setShowAIBackendModal;
  var copy = function (key, fallback) {
    var value = t ? t(key) : '';
    return value && value !== key ? value : fallback;
  };
  var fullTitle = copy('launch_pad.full_title', 'Full AlloFlow');
  var fullDesc = copy('launch_pad.full_desc', 'Use the complete workspace with every tool available.');
  var guidedTitle = copy('launch_pad.guided_title', 'Guided Mode');
  var guidedDesc = copy('launch_pad.guided_desc', 'Follow a recommended path with step-by-step support.');
  var learningToolsTitle = copy('launch_pad.learning_tools_title', 'Learning Tools');
  var learningToolsDesc = copy('launch_pad.learning_tools_desc', 'STEM Lab, StoryForge, SEL Hub, Research Hub & more - explore, create, investigate, and grow.');
  var educatorToolsTitle = copy('launch_pad.educator_tools_title', 'Educator Tools');
  var educatorToolsDesc = copy('launch_pad.educator_tools_desc_open', 'BehaviorLens, Report Writer, and other professional educator tools.');
  var switchHint = copy('launch_pad.switch_hint', 'You can switch modes later.');
  // Compact language switcher state (LanguageContext is mirrored to window.AlloLanguageContext at AlloFlowANTI.txt:1583)
  var _langCtx = useContext(window.AlloLanguageContext) || {};
  var currentUiLanguage = _langCtx.currentUiLanguage || 'English';
  var setUiLanguage = _langCtx.setUiLanguage || function () {};
  var isTranslating = !!_langCtx.isTranslating;
  var _langMenu = useState(false);
  var langMenuOpen = _langMenu[0];
  var setLangMenuOpen = _langMenu[1];
  var langTriggerRef = React.useRef(null);
  var langListRef = React.useRef(null);
  var closeLanguageMenu = function () {
    setLangMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.setTimeout(function () {
        if (langTriggerRef.current) langTriggerRef.current.focus();
      }, 0);
    }
  };
  // Dynamically loaded from the language pack manifest so the list stays in
  // sync with what's actually deployed. The local copy comes first so the
  // bundled app does not lose languages when it is offline or the CDN is down.
  // Mirrors the pattern in ui_language_selector_module.js.
  var FALLBACK_LANGUAGE_OPTIONS = [{
    value: "English",
    endonym: "English"
  }, {
    value: "Acholi",
    endonym: "Leb Acholi",
    provenance: "english-passthrough"
  }, {
    value: "Amharic",
    endonym: "\u12a0\u121b\u122d\u129b",
    provenance: "ai-drafted"
  }, {
    value: "Arabic",
    endonym: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    provenance: "ai-drafted"
  }, {
    value: "Bengali",
    endonym: "\u09ac\u09be\u0982\u09b2\u09be",
    provenance: "ai-drafted"
  }, {
    value: "Burmese",
    endonym: "\u1019\u103c\u1014\u103a\u1019\u102c",
    provenance: "ai-drafted"
  }, {
    value: "Chin (Falam)",
    endonym: "Laiholh (Falam)",
    provenance: "english-passthrough"
  }, {
    value: "Chin (Hakha)",
    endonym: "Laiholh (Hakha)",
    provenance: "english-passthrough"
  }, {
    value: "Chinese (Simplified)",
    endonym: "\u7b80\u4f53\u4e2d\u6587",
    provenance: "ai-drafted"
  }, {
    value: "Chinese (Traditional)",
    endonym: "\u7e41\u9ad4\u4e2d\u6587",
    provenance: "ai-drafted"
  }, {
    value: "Dari",
    endonym: "\u062f\u0631\u06cc",
    provenance: "ai-drafted"
  }, {
    value: "Dutch",
    endonym: "Nederlands",
    provenance: "ai-drafted"
  }, {
    value: "Esperanto",
    endonym: "Esperanto",
    provenance: "ai-drafted"
  }, {
    value: "Farsi",
    endonym: "\u0641\u0627\u0631\u0633\u06cc",
    provenance: "ai-drafted"
  }, {
    value: "French",
    endonym: "Fran\u00e7ais",
    provenance: "ai-drafted"
  }, {
    value: "French (Canadian)",
    endonym: "Fran\u00e7ais (Canada)",
    provenance: "ai-drafted"
  }, {
    value: "German",
    endonym: "Deutsch",
    provenance: "ai-drafted"
  }, {
    value: "Greek",
    endonym: "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac",
    provenance: "ai-drafted"
  }, {
    value: "Gujarati",
    endonym: "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0",
    provenance: "ai-drafted"
  }, {
    value: "Haitian Creole",
    endonym: "Krey\u00f2l Ayisyen",
    provenance: "ai-drafted"
  }, {
    value: "Hausa",
    endonym: "Hausa",
    provenance: "ai-drafted"
  }, {
    value: "Hebrew",
    endonym: "\u05e2\u05d1\u05e8\u05d9\u05ea",
    provenance: "ai-drafted"
  }, {
    value: "Hindi",
    endonym: "\u0939\u093f\u0928\u094d\u0926\u0940",
    provenance: "ai-drafted"
  }, {
    value: "Hmong",
    endonym: "Hmoob",
    provenance: "ai-drafted"
  }, {
    value: "Igbo",
    endonym: "Igbo",
    provenance: "ai-drafted"
  }, {
    value: "Indonesian",
    endonym: "Bahasa Indonesia",
    provenance: "ai-drafted"
  }, {
    value: "Italian",
    endonym: "Italiano",
    provenance: "ai-drafted"
  }, {
    value: "Japanese",
    endonym: "\u65e5\u672c\u8a9e",
    provenance: "ai-drafted"
  }, {
    value: "Kannada",
    endonym: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1",
    provenance: "ai-drafted"
  }, {
    value: "Karen",
    endonym: "\u1000\u100a\u102e\u1000\u103b\u102d\u102c\u103a",
    provenance: "partial-draft"
  }, {
    value: "Khmer",
    endonym: "\u1797\u17b6\u179f\u17b6\u1781\u17d2\u1798\u17c2\u179a",
    provenance: "ai-drafted"
  }, {
    value: "Kinyarwanda",
    endonym: "Ikinyarwanda",
    provenance: "ai-drafted"
  }, {
    value: "Kirundi",
    endonym: "Ikirundi",
    provenance: "ai-drafted"
  }, {
    value: "Korean",
    endonym: "\ud55c\uad6d\uc5b4",
    provenance: "ai-drafted"
  }, {
    value: "Lao",
    endonym: "\u0e9e\u0eb2\u0eaa\u0eb2\u0ea5\u0eb2\u0ea7",
    provenance: "ai-drafted"
  }, {
    value: "Latin",
    endonym: "Latina",
    provenance: "ai-drafted"
  }, {
    value: "Lingala",
    endonym: "Ling\u00e1la",
    provenance: "ai-drafted"
  }, {
    value: "Maay Maay",
    endonym: "Af-Maay",
    provenance: "english-passthrough"
  }, {
    value: "Malayalam",
    endonym: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02",
    provenance: "ai-drafted"
  }, {
    value: "Marathi",
    endonym: "\u092e\u0930\u093e\u0920\u0940",
    provenance: "ai-drafted"
  }, {
    value: "Marshallese",
    endonym: "Kajin \u1e42aje\u1e37",
    provenance: "partial-draft"
  }, {
    value: "Nepali",
    endonym: "\u0928\u0947\u092a\u093e\u0932\u0940",
    provenance: "ai-drafted"
  }, {
    value: "Pashto",
    endonym: "\u067e\u069a\u062a\u0648",
    provenance: "ai-drafted"
  }, {
    value: "Polish",
    endonym: "Polski",
    provenance: "ai-drafted"
  }, {
    value: "Portuguese (Angola)",
    endonym: "Portugu\u00eas (Angola)",
    provenance: "needs-repair"
  }, {
    value: "Portuguese (Brazil)",
    endonym: "Portugu\u00eas (Brasil)",
    provenance: "ai-drafted"
  }, {
    value: "Portuguese (Portugal)",
    endonym: "Portugu\u00eas (Portugal)",
    provenance: "ai-drafted"
  }, {
    value: "Punjabi",
    endonym: "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40",
    provenance: "ai-drafted"
  }, {
    value: "Romanian",
    endonym: "Rom\u00e2n\u0103",
    provenance: "ai-drafted"
  }, {
    value: "Russian",
    endonym: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
    provenance: "ai-drafted"
  }, {
    value: "Somali",
    endonym: "Soomaali",
    provenance: "ai-drafted"
  }, {
    value: "Spanish (Castilian)",
    endonym: "Espa\u00f1ol (Espa\u00f1a)",
    provenance: "ai-drafted"
  }, {
    value: "Spanish (Latin America)",
    endonym: "Espa\u00f1ol (Latinoam\u00e9rica)",
    provenance: "ai-drafted"
  }, {
    value: "Swahili",
    endonym: "Kiswahili",
    provenance: "ai-drafted"
  }, {
    value: "Tagalog",
    endonym: "Tagalog",
    provenance: "ai-drafted"
  }, {
    value: "Tamil",
    endonym: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd",
    provenance: "ai-drafted"
  }, {
    value: "Telugu",
    endonym: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41",
    provenance: "ai-drafted"
  }, {
    value: "Thai",
    endonym: "\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22",
    provenance: "ai-drafted"
  }, {
    value: "Tigrinya",
    endonym: "\u1275\u130d\u122d\u129b",
    provenance: "ai-drafted"
  }, {
    value: "Turkish",
    endonym: "T\u00fcrk\u00e7e",
    provenance: "ai-drafted"
  }, {
    value: "Ukrainian",
    endonym: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
    provenance: "ai-drafted"
  }, {
    value: "Urdu",
    endonym: "\u0627\u0631\u062f\u0648",
    provenance: "ai-drafted"
  }, {
    value: "Vietnamese",
    endonym: "Ti\u1ebfng Vi\u1ec7t",
    provenance: "ai-drafted"
  }, {
    value: "Yoruba",
    endonym: "Yor\u00f9b\u00e1",
    provenance: "ai-drafted"
  }];
  var _deployedLangs = useState(FALLBACK_LANGUAGE_OPTIONS);
  var LAUNCH_PAD_LANGS = _deployedLangs[0];
  var setLaunchPadLangs = _deployedLangs[1];
  React.useEffect(function () {
    var cancelled = false;
    var urls = ['./lang/manifest.json', 'https://alloflow-cdn.pages.dev/lang/manifest.json', 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/manifest.json'];
    (async function () {
      for (var i = 0; i < urls.length; i++) {
        try {
          var r = await fetch(urls[i], {
            cache: 'no-cache'
          });
          if (!r.ok) continue;
          var m = await r.json();
          if (m && Array.isArray(m.available)) {
            // Keep the endonym next to the English display name. The VALUE handed to
            // setUiLanguage stays the English name; only the label changes.
            var displays = m.available.filter(function (e) {
              return e && e.display;
            }).map(function (e) {
              return {
                value: e.display,
                endonym: e.endonym || e.display,
                provenance: e.provenance || 'ai-drafted'
              };
            }).sort(function (a, b) {
              return a.value.localeCompare(b.value);
            });
            // English first, then alphabetical
            var ordered = [{
              value: 'English',
              endonym: 'English'
            }].concat(displays.filter(function (d) {
              return d.value !== 'English';
            }));
            if (!cancelled) setLaunchPadLangs(ordered);
            return;
          }
        } catch (_) {/* try next URL */}
      }
    })();
    return function () {
      cancelled = true;
    };
  }, []);
  // Always show both names when they differ, matching the header picker. The
  // separator avoids nested parentheses for regional language variants.
  var LP_PROVENANCE_SUFFIX = {
    'english-passthrough': ' [English text, not yet translated]',
    'partial-draft': ' [partial draft, needs a native reviewer]',
    'needs-repair': ' [known errors, needs a native reviewer]'
  };
  function lpLangLabel(entry) {
    if (!entry) return '';
    var endonym = entry.endonym || entry.value;
    var suffix = LP_PROVENANCE_SUFFIX[entry.provenance] || '';
    if (endonym === entry.value) return entry.value + suffix;
    return endonym + ' — ' + entry.value + suffix;
  }
  function lpCurrentLabel() {
    for (var i = 0; i < LAUNCH_PAD_LANGS.length; i++) {
      if (LAUNCH_PAD_LANGS[i] && LAUNCH_PAD_LANGS[i].value === currentUiLanguage) {
        return lpLangLabel(LAUNCH_PAD_LANGS[i]);
      }
    }
    return currentUiLanguage;
  }
  React.useEffect(function () {
    if (!langMenuOpen || typeof document === 'undefined') return;
    var list = langListRef.current;
    var selectedButton = list && list.querySelector('button[aria-pressed="true"]');
    var firstButton = list && list.querySelector('button:not([disabled])');
    var focusTarget = selectedButton || firstButton;
    if (focusTarget) focusTarget.focus();
    var handleLanguageKeyDown = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLanguageMenu();
      }
    };
    document.addEventListener('keydown', handleLanguageKeyDown);
    return function () {
      document.removeEventListener('keydown', handleLanguageKeyDown);
    };
  }, [langMenuOpen]);
  React.useEffect(function () {
    if (typeof document === 'undefined') return;
    var body = document.body;
    var html = document.documentElement;
    if (!body || !html) return;
    // Ref-counted shared body scroll lock (window.__alloScrollLockState):
    // save/restore of body.style.overflow strands the page at
    // overflow:hidden when two modules interleave open/close non-LIFO.
    var scrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = {
      count: 0,
      prev: ''
    });
    if (++scrollLock.count === 1) {
      scrollLock.prev = body.style.overflow;
      body.style.overflow = 'hidden';
    }
    var previousHtmlOverflow = html.style.overflow;
    body.classList.add('alloflow-launchpad-active');
    html.style.overflow = 'hidden';
    return function () {
      body.classList.remove('alloflow-launchpad-active');
      scrollLock.count = Math.max(0, scrollLock.count - 1);
      if (scrollLock.count === 0) body.style.overflow = scrollLock.prev;
      html.style.overflow = previousHtmlOverflow;
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "lp-root",
    "data-alloflow-launch-pad": "true",
    role: "region",
    "aria-label": "Choose how to use AlloFlow",
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 2147483000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #312e81 60%, #1e3a5f 100%)',
      animation: 'fadeIn 0.6s ease-out',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("style", null, `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
            @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
            @keyframes cardPop { from { opacity: 0; transform: scale(0.85) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            body.alloflow-launchpad-active #allo-err-badge { display: none !important; }
            .lp-root { justify-content: center; padding: 32px 0 40px; }
            .lp-card { appearance: none; width: 100%; min-height: 44px; font: inherit; color: inherit; text-align: center; backdrop-filter: blur(20px); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.3); border-radius: 24px; padding: 32px 28px; cursor: pointer; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); position: relative; overflow: hidden; animation: cardPop 0.5s ease-out both; }
            .lp-card:hover { transform: translateY(-6px) scale(1.03); background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.5); box-shadow: 0 20px 60px rgba(99,102,241,0.3); }
            .lp-card:focus-visible { outline: 3px solid #facc15; outline-offset: 4px; background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.65); box-shadow: 0 0 0 2px #1e1b4b; }
            .lp-card:active { transform: translateY(-2px) scale(0.99); }
            @media (max-width: 600px), (max-height: 820px) { .lp-root { justify-content: flex-start !important; } }
            @media (max-width: 600px) {
              .lp-root { padding: 16px 0 28px !important; }
              .lp-lang-switcher { position: static !important; align-self: flex-end; margin: 0 20px 18px 0; }
              .lp-logo-block { margin-bottom: 28px !important; }
              .lp-mic-shell { padding: 0 24px !important; margin-bottom: 24px !important; }
              .lp-mic-panel { align-items: stretch !important; padding: 18px 20px !important; }
              .lp-mic-title-row { justify-content: flex-start !important; }
              .lp-mic-actions { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
              .lp-mic-actions button { width: 100% !important; }
              .lp-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
              .lp-card { min-height: 128px; padding: 28px !important; }
              .lp-ai-settings { margin-top: 24px !important; }
            }
            .lp-card::before { content: ''; position: absolute; inset: 0; border-radius: 24px; padding: 1px; background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent, rgba(99,102,241,0.3)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
            .lp-badge { display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #4f46e5, #3730a3); color: white; font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px; animation: shimmer 3s infinite linear; background-size: 200% auto; }
            @media (prefers-reduced-motion: reduce) {
              .lp-root, .lp-card, .lp-card:hover, .lp-card:active, .lp-card-icon, .lp-badge, .lp-lang-item, .lp-lang-trigger, .lp-mic-actions button, .lp-ai-settings { animation: none !important; transition: none !important; transform: none !important; }
            }
            .lp-lang-item:hover:not([disabled]) { background: rgba(99,102,241,0.2) !important; }
            .lp-lang-trigger:focus-visible, .lp-lang-item:focus-visible, .lp-mic-actions button:focus-visible, .lp-ai-settings:focus-visible { outline: 3px solid #facc15; outline-offset: 3px; }
            .lp-lang-trigger, .lp-lang-item, .lp-mic-actions button, .lp-ai-settings { min-height: 44px; }
          `), /*#__PURE__*/React.createElement("div", {
    className: "lp-lang-switcher",
    style: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 2147483001
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    ref: langTriggerRef,
    className: "lp-lang-trigger",
    onClick: () => {
      if (!isTranslating) setLangMenuOpen(!langMenuOpen);
    },
    "aria-label": (t('launch_pad.change_language') || 'Change language') + '. ' + (t('launch_pad.current_language') || 'Current') + ': ' + currentUiLanguage,
    "aria-expanded": langMenuOpen,
    "aria-haspopup": "true",
    "aria-controls": "launch-pad-language-list",
    "aria-disabled": isTranslating,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      color: '#e0e7ff',
      fontSize: '12px',
      fontWeight: 600,
      cursor: isTranslating ? 'wait' : 'pointer',
      transition: 'all 0.2s',
      opacity: isTranslating ? 0.6 : 1
    },
    onMouseOver: e => {
      if (!isTranslating) {
        e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
      }
    },
    onMouseOut: e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: '14px'
    }
  }, "🌐"), /*#__PURE__*/React.createElement("span", {
    style: {
      maxWidth: '140px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, lpCurrentLabel()), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: '9px',
      opacity: 0.7
    }
  }, langMenuOpen ? '▲' : '▼')), langMenuOpen && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    onClick: closeLanguageMenu,
    "aria-hidden": "true",
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 99999
    }
  }), /*#__PURE__*/React.createElement("ul", {
    id: "launch-pad-language-list",
    ref: langListRef,
    "aria-label": t('launch_pad.available_languages') || 'Available languages',
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      right: 0,
      background: 'rgba(15,23,42,0.96)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '12px',
      padding: '6px',
      minWidth: '220px',
      margin: 0,
      listStyle: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      maxHeight: '60vh',
      overflowY: 'auto',
      zIndex: 100001
    }
  }, LAUNCH_PAD_LANGS.map(lang => {
    var langName = lang.value;
    var selected = langName === currentUiLanguage;
    return /*#__PURE__*/React.createElement("li", {
      key: langName,
      style: {
        margin: 0
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "lp-lang-item",
      "aria-pressed": selected,
      disabled: isTranslating,
      onClick: () => {
        closeLanguageMenu();
        if (!selected) setUiLanguage(langName);
      },
      style: {
        display: 'block',
        width: '100%',
        textAlign: 'start',
        padding: '9px 12px',
        borderRadius: '8px',
        border: 'none',
        background: selected ? 'rgba(99,102,241,0.3)' : 'transparent',
        color: 'white',
        fontSize: '13px',
        fontWeight: selected ? 700 : 500,
        cursor: isTranslating ? 'wait' : 'pointer',
        transition: 'background 0.15s'
      }
    }, selected ? '✓ ' : '  ', lpLangLabel(lang)));
  })))), /*#__PURE__*/React.createElement("div", {
    className: "lp-logo-block",
    style: {
      textAlign: 'center',
      marginBottom: '48px',
      animation: 'fadeIn 0.6s ease-out'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "rainbow-book.jpg",
    alt: "",
    "aria-hidden": "true",
    onError: e => {
      e.currentTarget.style.display = 'none';
    },
    style: {
      width: '80px',
      height: '80px',
      margin: '0 auto 16px',
      display: 'block',
      filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.5))',
      borderRadius: '16px',
      objectFit: 'cover',
      animation: 'float 3s ease-in-out infinite'
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: '32px',
      fontWeight: 900,
      background: 'linear-gradient(90deg,#fcd34d,#fdba74,#fb923c)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      margin: '0 0 8px',
      letterSpacing: '-0.5px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }, "AlloFlow"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '12px',
      color: '#c7d2fe',
      fontWeight: 600,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      margin: 0
    }
  }, copy('launch_pad.subtitle', 'Adaptive Levels, Layers, & Outputs'))), !micBannerDismissed && /*#__PURE__*/React.createElement("div", {
    className: "lp-mic-shell",
    style: {
      maxWidth: '620px',
      width: '100%',
      padding: '0 24px',
      marginBottom: '24px',
      animation: 'fadeIn 0.5s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-mic-panel",
    style: {
      backdropFilter: 'blur(20px)',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(129,140,248,0.3)',
      borderRadius: '20px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lp-mic-title-row",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '24px'
    }
  }, "🎤"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '14px',
      fontWeight: 700,
      color: 'white',
      margin: '0 0 2px'
    }
  }, copy('launch_pad.mic_title', 'Microphone Setup')), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '11px',
      color: '#c7d2fe',
      margin: 0,
      lineHeight: '1.5'
    }
  }, copy('launch_pad.mic_desc', 'Some tools use your microphone for dictation, recording, and voice input.')))), _isCanvasEnv && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '10px',
      color: '#fbbf24',
      margin: 0,
      textAlign: 'center',
      lineHeight: '1.5',
      fontWeight: 600
    }
  }, "⚠️ ", copy('launch_pad.mic_canvas_warning', 'In this environment, enabling the microphone will briefly reload the app. It\'s best to do it now before you start working.')), /*#__PURE__*/React.createElement("div", {
    className: "lp-mic-actions",
    style: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (micPermissionStatus !== 'requesting') requestMicPermission();
    },
    "aria-disabled": micPermissionStatus === 'requesting',
    "aria-busy": micPermissionStatus === 'requesting',
    "aria-label": micPermissionStatus === 'requesting' ? copy('launch_pad.mic_requesting', 'Requesting microphone access') : copy('launch_pad.mic_enable', 'Enable microphone access'),
    style: {
      padding: '10px 24px',
      borderRadius: '14px',
      border: 'none',
      cursor: micPermissionStatus === 'requesting' ? 'wait' : 'pointer',
      background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
      color: 'white',
      fontSize: '13px',
      fontWeight: 700,
      opacity: micPermissionStatus === 'requesting' ? 0.6 : 1,
      transition: 'all 0.2s',
      boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
    }
  }, micPermissionStatus === 'requesting' ? '⏳ Requesting...' : '🎤 Enable Microphone'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMicBannerDismissed(true),
    "aria-label": "Skip microphone setup",
    style: {
      padding: '10px 24px',
      borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.2)',
      cursor: 'pointer',
      background: 'rgba(255,255,255,0.06)',
      color: '#c7d2fe',
      fontSize: '13px',
      fontWeight: 600,
      transition: 'all 0.2s'
    }
  }, "Skip for Now")), micPermissionStatus === 'granted' && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: {
      fontSize: '11px',
      color: '#34d399',
      margin: 0,
      fontWeight: 700
    }
  }, "✅ Microphone enabled!"), micPermissionStatus === 'denied' && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: {
      fontSize: '11px',
      color: '#fca5a5',
      margin: 0,
      fontWeight: 600
    }
  }, "Microphone was denied. You can enable it later in browser settings."))), /*#__PURE__*/React.createElement("div", {
    className: "lp-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '24px',
      maxWidth: '620px',
      width: '100%',
      padding: '0 24px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lp-card",
    style: {
      animationDelay: '0.1s'
    },
    "aria-labelledby": "launch-pad-full-title",
    "aria-describedby": "launch-pad-full-desc",
    onClick: () => {
      setHasSelectedMode(true);
      setGuidedMode(false);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-card-icon",
    style: {
      display: 'block',
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite'
    },
    "aria-hidden": "true"
  }, "🚀"), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-full-title",
    style: {
      display: 'block',
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, fullTitle), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-full-desc",
    style: {
      display: 'block',
      fontSize: '12px',
      color: '#e0e7ff',
      lineHeight: '1.6',
      margin: 0
    }
  }, fullDesc)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lp-card",
    style: {
      animationDelay: '0.2s'
    },
    "aria-labelledby": "launch-pad-guided-title",
    "aria-describedby": "launch-pad-guided-badge launch-pad-guided-desc",
    onClick: () => {
      setHasSelectedMode(true);
      setGuidedMode(true);
    }
  }, /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-guided-badge",
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-badge"
  }, copy('launch_pad.badge_recommended', 'Recommended'))), /*#__PURE__*/React.createElement("span", {
    className: "lp-card-icon",
    style: {
      display: 'block',
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite',
      animationDelay: '0.5s'
    },
    "aria-hidden": "true"
  }, "🧭"), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-guided-title",
    style: {
      display: 'block',
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, guidedTitle), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-guided-desc",
    style: {
      display: 'block',
      fontSize: '12px',
      color: '#e0e7ff',
      lineHeight: '1.6',
      margin: 0
    }
  }, guidedDesc)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lp-card",
    style: {
      animationDelay: '0.3s'
    },
    "aria-labelledby": "launch-pad-learning-title",
    "aria-describedby": "launch-pad-learning-badge launch-pad-learning-desc",
    onClick: () => {
      setShowLearningHub(true);
      setIsTeacherMode(false);
      setShowWizard(false);
      setHasSelectedRole(true);
      setHasSelectedMode(true);
    }
  }, /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-learning-badge",
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-badge",
    style: {
      background: 'linear-gradient(135deg, #047857, #065f46)'
    }
  }, copy('launch_pad.badge_3_tools', '8 Tools'))), /*#__PURE__*/React.createElement("span", {
    className: "lp-card-icon",
    style: {
      display: 'block',
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite',
      animationDelay: '1s'
    },
    "aria-hidden": "true"
  }, "🧩"), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-learning-title",
    style: {
      display: 'block',
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, learningToolsTitle), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-learning-desc",
    style: {
      display: 'block',
      fontSize: '12px',
      color: '#e0e7ff',
      lineHeight: '1.6',
      margin: 0
    }
  }, learningToolsDesc)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lp-card",
    style: {
      animationDelay: '0.4s'
    },
    "aria-labelledby": "launch-pad-educator-title",
    "aria-describedby": "launch-pad-educator-badge launch-pad-educator-desc",
    onClick: () => {
      setHasSelectedMode(true);
      setHasSelectedRole(true);
      setShowWizard(false);
      if (APP_CONFIG._cfg_validation_key) {
        setPendingRole('educator_hub');
        setIsGateOpen(true);
      } else {
        setIsTeacherMode(true);
        setShowEducatorHub(true);
      }
    }
  }, /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-educator-badge",
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lp-badge",
    style: {
      background: 'linear-gradient(135deg, #7c3aed, #5b21b6)'
    }
  }, APP_CONFIG._cfg_validation_key ? copy('launch_pad.badge_educator', 'Educator') : copy('launch_pad.badge_educator_open', 'Educator'))), /*#__PURE__*/React.createElement("span", {
    className: "lp-card-icon",
    style: {
      display: 'block',
      fontSize: '40px',
      marginBottom: '16px',
      animation: 'float 3s ease-in-out infinite',
      animationDelay: '1.5s'
    },
    "aria-hidden": "true"
  }, "🛠️"), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-educator-title",
    style: {
      display: 'block',
      fontSize: '18px',
      fontWeight: 800,
      color: 'white',
      margin: '0 0 8px'
    }
  }, educatorToolsTitle), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-educator-desc",
    style: {
      display: 'block',
      fontSize: '12px',
      color: '#e0e7ff',
      lineHeight: '1.6',
      margin: 0
    }
  }, educatorToolsDesc))), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: '48px',
      fontSize: '11px',
      color: 'rgba(199,210,254,0.85)',
      fontWeight: 500
    }
  }, switchHint), !_isCanvasEnv && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: e => {
      e.stopPropagation();
      setShowAIBackendModal(true);
    },
    className: "lp-ai-settings",
    style: {
      marginTop: '16px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: '#312e81',
      border: '1px solid rgba(165,180,252,0.4)',
      borderRadius: '16px',
      padding: '10px 20px',
      color: '#e0e7ff',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s',
      backdropFilter: 'blur(10px)'
    },
    onMouseOver: e => {
      e.currentTarget.style.background = '#4338ca';
      e.currentTarget.style.color = '#ffffff';
      e.currentTarget.style.borderColor = 'rgba(165,180,252,0.7)';
    },
    onMouseOut: e => {
      e.currentTarget.style.background = '#312e81';
      e.currentTarget.style.color = '#e0e7ff';
      e.currentTarget.style.borderColor = 'rgba(165,180,252,0.4)';
    },
    "aria-label": "AI Backend Settings",
    title: "AI Backend Settings"
  }, /*#__PURE__*/React.createElement(Unplug, {
    size: 16,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, "AI Backend Settings")));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LaunchPadView = LaunchPadView;
  window.AlloModules.ViewLaunchPadModule = true;
})();
