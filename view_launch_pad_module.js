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
  // sync with what's actually deployed. Falls back to a curated default if the
  // manifest is unreachable. Mirrors the pattern in ui_language_selector_module.js.
  var _deployedLangs = useState(['English', 'Spanish (Latin America)', 'French', 'Arabic', 'Chinese (Simplified)', 'Hebrew', 'Portuguese (Brazil)', 'Somali', 'Vietnamese', 'Haitian Creole']);
  var LAUNCH_PAD_LANGS = _deployedLangs[0];
  var setLaunchPadLangs = _deployedLangs[1];
  React.useEffect(function () {
    var cancelled = false;
    var urls = ['https://alloflow-cdn.pages.dev/lang/manifest.json', 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/manifest.json'];
    (async function () {
      for (var i = 0; i < urls.length; i++) {
        try {
          var r = await fetch(urls[i], {
            cache: 'no-cache'
          });
          if (!r.ok) continue;
          var m = await r.json();
          if (m && Array.isArray(m.available)) {
            var displays = m.available.map(function (e) {
              return e && e.display;
            }).filter(Boolean).sort(function (a, b) {
              return a.localeCompare(b);
            });
            // English first, then alphabetical
            var ordered = ['English'].concat(displays.filter(function (d) {
              return d !== 'English';
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
    var previousBodyOverflow = body.style.overflow;
    var previousHtmlOverflow = html.style.overflow;
    body.classList.add('alloflow-launchpad-active');
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return function () {
      body.classList.remove('alloflow-launchpad-active');
      body.style.overflow = previousBodyOverflow;
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
  }, currentUiLanguage), /*#__PURE__*/React.createElement("span", {
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
  }, LAUNCH_PAD_LANGS.map(langName => {
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
    }, selected ? '✓ ' : '  ', langName));
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
