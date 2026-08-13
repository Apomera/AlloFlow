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
  var enableVoiceAccess = props.enableVoiceAccess;
  var voiceAccessActive = props.voiceAccessActive === true;
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
  var _voiceSetup = useState(function () {
    var whisperReady = false;
    var kokoroReady = false;
    try {
      whisperReady = !!(window.AlloFlowVoice && window.AlloFlowVoice.isWhisperLoaded && window.AlloFlowVoice.isWhisperLoaded('tiny'));
    } catch (_) {}
    try {
      kokoroReady = !!(window._kokoroTTS && window._kokoroTTS.ready);
    } catch (_) {}
    return {
      whisper: {
        phase: whisperReady ? 'ready' : 'idle',
        progress: null
      },
      kokoro: {
        phase: kokoroReady ? 'ready' : 'idle',
        progress: null
      },
      message: whisperReady || kokoroReady ? 'Previously downloaded offline voice tools are ready.' : ''
    };
  });
  var voiceSetup = _voiceSetup[0];
  var setVoiceSetup = _voiceSetup[1];
  function updateVoiceSetup(engine, patch, message) {
    setVoiceSetup(function (previous) {
      var next = Object.assign({}, previous);
      next[engine] = Object.assign({}, previous[engine] || {}, patch || {});
      if (typeof message === 'string') next.message = message;
      return next;
    });
  }
  async function downloadWhisperFromLaunchPad() {
    if (voiceSetup.whisper.phase === 'loading' || voiceSetup.whisper.phase === 'ready') return;
    var voice = window.AlloFlowVoice;
    if (!voice || typeof voice.preloadWhisper !== 'function') {
      updateVoiceSetup('whisper', {
        phase: 'error',
        progress: null
      }, 'Whisper setup is not available yet. Enter AlloFlow, then try again from voice settings.');
      return;
    }
    var unsubscribe = function () {};
    if (typeof voice.subscribeToVoiceProgress === 'function') {
      unsubscribe = voice.subscribeToVoiceProgress(function (progress) {
        if (!progress || !/^model-|^transformers-fetch$/.test(String(progress.phase || ''))) return;
        var percent = typeof progress.progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress.progress))) : null;
        var detail = percent == null ? 'Preparing the Whisper speech model…' : 'Downloading Whisper speech recognition: ' + percent + '%.';
        updateVoiceSetup('whisper', {
          phase: 'loading',
          progress: percent
        }, detail);
      });
    }
    updateVoiceSetup('whisper', {
      phase: 'loading',
      progress: null
    }, 'Preparing the Whisper speech-recognition download…');
    try {
      await voice.preloadWhisper('tiny');
      updateVoiceSetup('whisper', {
        phase: 'ready',
        progress: 100
      }, 'Whisper speech recognition is ready for offline-capable voice input.');
    } catch (_) {
      updateVoiceSetup('whisper', {
        phase: 'error',
        progress: null
      }, 'Whisper could not be downloaded. Check the connection or school network filter, then try again.');
    } finally {
      try {
        unsubscribe();
      } catch (_) {}
    }
  }
  async function downloadKokoroFromLaunchPad() {
    if (voiceSetup.kokoro.phase === 'loading' || voiceSetup.kokoro.phase === 'ready') return;
    if (typeof window.__loadKokoroTTS !== 'function') {
      updateVoiceSetup('kokoro', {
        phase: 'error',
        progress: null
      }, 'Kokoro setup is not available yet. Enter AlloFlow, then try again from read-aloud settings.');
      return;
    }
    updateVoiceSetup('kokoro', {
      phase: 'loading',
      progress: null
    }, 'Preparing the Kokoro read-aloud download…');
    try {
      var ready = await window.__loadKokoroTTS(function (progress) {
        var ratio = progress && typeof progress.pct === 'number' ? progress.pct : null;
        var percent = ratio == null ? null : Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : ratio)));
        var stage = progress && progress.stage ? String(progress.stage) : 'Downloading Kokoro read-aloud';
        updateVoiceSetup('kokoro', {
          phase: 'loading',
          progress: percent
        }, stage + (percent == null ? '…' : ': ' + percent + '%.'));
      });
      if (!ready) throw new Error('Kokoro did not become ready');
      updateVoiceSetup('kokoro', {
        phase: 'ready',
        progress: 100
      }, 'Kokoro read-aloud is ready on this device.');
    } catch (_) {
      updateVoiceSetup('kokoro', {
        phase: 'error',
        progress: null
      }, 'Kokoro could not be downloaded. Check the connection or school network filter, then try again.');
    }
  }
  var copy = function (key, fallback) {
    var value = t ? t(key) : '';
    return value && value !== key ? value : fallback;
  };
  var fullTitle = copy('launch_pad.full_title', 'Full AlloFlow');
  var fullDesc = copy('launch_pad.full_desc', 'Use the complete workspace with every tool available.');
  var guidedTitle = copy('launch_pad.guided_title', 'Guided Mode');
  var guidedDesc = copy('launch_pad.guided_desc', 'Follow a recommended path with step-by-step support.');
  var learningToolsTitle = copy('launch_pad.learning_tools_title', 'Learning Tools');
  var learningToolsDesc = copy('launch_pad.learning_tools_desc', 'STEAM Lab, StoryForge, SEL Hub, Research Hub & more - explore, create, investigate, and grow.');
  var educatorToolsTitle = copy('launch_pad.educator_tools_title', 'Educator Tools');
  var educatorToolsDesc = copy('launch_pad.educator_tools_desc_open', 'BehaviorLens, Report Writer, and other professional educator tools.');
  var switchHint = copy('launch_pad.switch_hint', 'You can switch modes later.');
  var voiceAccessStarting = !voiceAccessActive && micPermissionStatus === 'requesting';
  var voiceAccessDenied = !voiceAccessActive && micPermissionStatus === 'denied';
  var voiceAccessButtonText = voiceAccessActive ? copy('launch_pad.voice_access_active', 'Voice Access Active') : voiceAccessStarting ? copy('launch_pad.voice_access_starting', 'Starting Voice Access...') : voiceAccessDenied ? copy('launch_pad.voice_access_retry', 'Retry Voice Access') : copy('launch_pad.voice_access_enable', 'Enable Voice Access');
  var voiceAccessStatusText = voiceAccessActive ? copy('launch_pad.voice_access_active_status', 'Voice Access is active. Continuous voice command listening is on.') : voiceAccessStarting ? copy('launch_pad.voice_access_starting_status', 'Starting Voice Access. Complete the browser or operating system microphone prompt if it appears.') : voiceAccessDenied ? copy('launch_pad.voice_access_denied_status', 'Voice Access could not start because microphone access was denied. You can retry after allowing it in your browser or operating system settings.') : micPermissionStatus === 'granted' ? copy('launch_pad.voice_access_ready_status', 'Microphone permission is ready, but Voice Access is not currently listening.') : '';
  function handleEnableVoiceAccess() {
    if (voiceAccessActive || voiceAccessStarting) return;
    if (typeof enableVoiceAccess === 'function') {
      enableVoiceAccess();
      return;
    }
    // Compatibility for hosts that have not yet wired the global voice loop.
    // This path requests permission only and never creates a second recognizer.
    if (typeof requestMicPermission === 'function') requestMicPermission();
  }
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
      backgroundColor: '#080d1d',
      animation: 'fadeIn 0.6s ease-out',
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("style", null, `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
            @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
            @keyframes cardPop { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            body.alloflow-launchpad-active #allo-err-badge { display: none !important; }
            .lp-root { justify-content: center; padding: 40px 0 48px; isolation: isolate; }
            .lp-root { background: radial-gradient(ellipse at top left, rgba(124,58,237,.22), transparent), radial-gradient(ellipse at top right, rgba(14,165,233,.17), transparent), linear-gradient(145deg, #080d1d, #11162d, #171644, #0b2133); }
            .lp-root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
            .lp-card { appearance: none; width: 100%; min-height: 44px; font: inherit; color: inherit; text-align: left; backdrop-filter: blur(20px); background: linear-gradient(145deg, rgba(255,255,255,.115), rgba(255,255,255,.055)); border: 1px solid rgba(226,232,240,.2); border-radius: 22px; padding: 28px 26px; cursor: pointer; transition: transform .28s cubic-bezier(.2,.8,.2,1), background .28s ease, border-color .28s ease, box-shadow .28s ease; position: relative; overflow: hidden; animation: cardPop 0.5s ease-out both; box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 16px 40px rgba(2,6,23,.18); }
            .lp-card:hover { transform: translateY(-5px); background: linear-gradient(145deg, rgba(255,255,255,.16), rgba(255,255,255,.075)); border-color: rgba(199,210,254,.46); }
            .lp-card::after { content: '→'; position: absolute; right: 22px; bottom: 18px; color: rgba(224,231,255,.62); font-size: 18px; transition: transform .25s ease, color .25s ease; }
            .lp-card:hover::after { transform: translateX(4px); color: #fde68a; }
            .lp-card:focus-visible { outline: 3px solid #facc15; outline-offset: 4px; background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.65); box-shadow: 0 0 0 2px #1e1b4b; }
            .lp-card:active { transform: translateY(-1px) scale(0.99); }
            @media (max-width: 600px), (max-height: 820px) { .lp-root { justify-content: flex-start !important; } }
            @media (max-width: 600px) {
              .lp-root { padding: 16px 0 32px !important; }
              .lp-lang-switcher { position: static !important; align-self: flex-end; margin: 0 20px 18px 0; }
              .lp-logo-block { margin-bottom: 24px !important; }
              .lp-mic-shell { padding: 0 24px !important; margin-bottom: 24px !important; }
              .lp-mic-panel { align-items: stretch !important; padding: 18px 20px !important; }
              .lp-mic-title-row { justify-content: flex-start !important; }
              .lp-mic-actions { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
              .lp-mic-actions button { width: 100% !important; }
              .lp-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
              .lp-card { min-height: 126px; padding: 24px 58px 24px 24px !important; }
              .lp-voice-grid { grid-template-columns: 1fr !important; }
              .lp-voice-setup { margin-top: 20px !important; }
              .lp-ai-settings { margin-top: 24px !important; }
            }
            .lp-card::before { content: ''; position: absolute; inset: 0; border-radius: 22px; padding: 1px; background: linear-gradient(135deg, rgba(255,255,255,.42), rgba(255,255,255,.04) 42%, rgba(129,140,248,.28)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
            .lp-badge { display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #4f46e5, #3730a3); color: white; font-size: 9px; font-weight: 800; padding: 5px 10px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; text-transform: uppercase; letter-spacing: 1.35px; animation: shimmer 3s infinite linear; background-size: 200% auto; box-shadow: 0 5px 16px rgba(15,23,42,.25); }
            @media (prefers-reduced-motion: reduce) {
              .lp-root, .lp-card, .lp-card:hover, .lp-card:active, .lp-card-icon, .lp-badge, .lp-lang-item, .lp-lang-trigger, .lp-mic-actions button, .lp-download-button, .lp-download-button:hover, .lp-ai-settings { animation: none !important; transition: none !important; transform: none !important; }
            }
            .lp-lang-item:hover:not([disabled]) { background: rgba(99,102,241,0.2) !important; }
            .lp-download-button { min-height: 44px; border: 1px solid rgba(165,180,252,.38); border-radius: 12px; padding: 10px 14px; background: rgba(67,56,202,.64); color: white; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; transition: background .2s, transform .2s, border-color .2s; box-shadow: inset 0 1px 0 rgba(255,255,255,.12); }
            .lp-download-button:hover:not([disabled]) { background: #4f46e5; border-color: rgba(199,210,254,.72); transform: translateY(-1px); }
            .lp-download-button[disabled] { cursor: default; opacity: 0.75; }
            .lp-voice-disclosure > summary { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border: 1px solid rgba(165,180,252,.24); border-radius: 16px; color: #e0e7ff; background: rgba(8,13,29,.32); font-size: 12px; font-weight: 800; cursor: pointer; list-style: none; }
            .lp-voice-disclosure > summary::-webkit-details-marker { display: none; }
            .lp-voice-disclosure > summary::after { content: '+'; font-size: 18px; color: #a5b4fc; }
            .lp-voice-disclosure[open] > summary { border-radius: 16px 16px 0 0; background: rgba(30,27,75,.58); }
            .lp-voice-disclosure[open] > summary::after { content: '−'; }
            .lp-lang-trigger:focus-visible, .lp-lang-item:focus-visible, .lp-mic-actions button:focus-visible, .lp-download-button:focus-visible, .lp-ai-settings:focus-visible { outline: 3px solid #facc15; outline-offset: 3px; }
            .lp-voice-disclosure > summary:focus-visible { outline: 3px solid #facc15; outline-offset: 3px; }
            .lp-lang-trigger, .lp-lang-item, .lp-mic-actions button, .lp-download-button, .lp-ai-settings { min-height: 44px; }
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
      marginBottom: '38px',
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
      width: '74px',
      height: '74px',
      margin: '0 auto 18px',
      display: 'block',
      filter: 'drop-shadow(0 16px 30px rgba(2,6,23,.48)) drop-shadow(0 0 22px rgba(129,140,248,.30))',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,.25)',
      objectFit: 'cover',
      animation: 'float 4s ease-in-out infinite'
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 'clamp(34px, 5vw, 44px)',
      lineHeight: 1,
      fontWeight: 900,
      background: 'linear-gradient(100deg,#fef3c7,#fcd34d 34%,#fdba74 70%,#fb923c)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      margin: '0 0 12px',
      letterSpacing: '-1.6px'
    }
  }, "AlloFlow"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: '11px',
      color: '#c7d2fe',
      fontWeight: 750,
      letterSpacing: '2.6px',
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
      backdropFilter: 'blur(22px) saturate(120%)',
      background: 'linear-gradient(145deg, rgba(255,255,255,.09), rgba(255,255,255,.045))',
      border: '1px solid rgba(165,180,252,.25)',
      borderRadius: '18px',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.09), 0 14px 36px rgba(2,6,23,.14)'
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
  }, copy('launch_pad.voice_access_title', 'Voice Access')), /*#__PURE__*/React.createElement("p", {
    id: "launch-pad-voice-access-description",
    style: {
      fontSize: '11px',
      color: '#c7d2fe',
      margin: 0,
      lineHeight: '1.5'
    }
  }, copy('launch_pad.voice_access_desc', 'Your browser or operating system may require microphone activation once. After permission, continuous voice command listening starts. Voice Access is optional; touch, pointer, and keyboard remain available.')))), _isCanvasEnv && /*#__PURE__*/React.createElement("p", {
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
    onClick: handleEnableVoiceAccess,
    disabled: voiceAccessActive || voiceAccessStarting,
    "aria-disabled": voiceAccessActive || voiceAccessStarting,
    "aria-busy": voiceAccessStarting,
    "aria-describedby": "launch-pad-voice-access-description launch-pad-voice-access-status",
    "aria-label": voiceAccessButtonText,
    style: {
      padding: '10px 24px',
      borderRadius: '14px',
      border: 'none',
      cursor: voiceAccessStarting ? 'wait' : voiceAccessActive ? 'default' : 'pointer',
      background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
      color: 'white',
      fontSize: '13px',
      fontWeight: 700,
      opacity: voiceAccessStarting ? 0.6 : 1,
      transition: 'all 0.2s',
      boxShadow: '0 4px 20px rgba(99,102,241,0.4)'
    }
  }, voiceAccessStarting ? '⏳ ' : voiceAccessActive ? '✅ ' : '🎤 ', voiceAccessButtonText), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setMicBannerDismissed(true),
    "aria-label": "Skip Voice Access setup",
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
  }, "Skip for Now")), /*#__PURE__*/React.createElement("p", {
    id: "launch-pad-voice-access-status",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: {
      minHeight: '16px',
      fontSize: '11px',
      color: voiceAccessDenied ? '#fca5a5' : '#34d399',
      margin: 0,
      fontWeight: voiceAccessDenied ? 600 : 700
    }
  }, voiceAccessStatusText))), /*#__PURE__*/React.createElement("div", {
    className: "lp-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      maxWidth: '680px',
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
      if (typeof window._alloEducatorAccessCodeRequired === 'function' ? window._alloEducatorAccessCodeRequired() : !!APP_CONFIG._cfg_validation_key) {
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
  }, (typeof window._alloEducatorAccessCodeRequired === 'function' ? window._alloEducatorAccessCodeRequired() : !!APP_CONFIG._cfg_validation_key) ? copy('launch_pad.badge_educator', 'Educator') : copy('launch_pad.badge_educator_open', 'Educator'))), /*#__PURE__*/React.createElement("span", {
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
  }, educatorToolsDesc))), /*#__PURE__*/React.createElement("section", {
    className: "lp-voice-setup",
    "aria-labelledby": "launch-pad-offline-voice-title",
    style: {
      maxWidth: '680px',
      width: '100%',
      padding: '0 24px',
      marginTop: '18px'
    }
  }, /*#__PURE__*/React.createElement("details", {
    className: "lp-voice-disclosure"
  }, /*#__PURE__*/React.createElement("summary", {
    id: "launch-pad-offline-voice-title"
  }, /*#__PURE__*/React.createElement("span", null, "Optional offline voice tools"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#a5b4fc',
      fontSize: '10px',
      fontWeight: 650
    }
  }, "Set up anytime")), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid rgba(165,180,252,.2)',
      borderRadius: '18px',
      background: 'rgba(8,13,29,.38)',
      padding: '16px',
      backdropFilter: 'blur(18px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '6px 12px',
      marginBottom: '12px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      color: 'white',
      fontSize: '14px',
      fontWeight: 850,
      margin: 0
    }
  }, "Private, on-device options"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#c7d2fe',
      fontSize: '10px',
      fontWeight: 650
    }
  }, "One-time download · stored locally when supported")), /*#__PURE__*/React.createElement("div", {
    className: "lp-voice-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: '7px',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '14px',
      padding: '12px',
      background: 'rgba(255,255,255,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      color: 'white',
      fontSize: '12px'
    }
  }, "🎙️ Whisper speech recognition"), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-whisper-desc",
    style: {
      display: 'block',
      color: '#e0e7ff',
      fontSize: '10px',
      lineHeight: 1.5,
      marginTop: '3px'
    }
  }, "Improves private, offline-capable voice input after the model is ready.")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lp-download-button",
    "aria-describedby": "launch-pad-whisper-desc",
    "aria-busy": voiceSetup.whisper.phase === 'loading',
    disabled: voiceSetup.whisper.phase === 'loading' || voiceSetup.whisper.phase === 'ready',
    onClick: downloadWhisperFromLaunchPad
  }, voiceSetup.whisper.phase === 'ready' ? '✓ Whisper ready' : voiceSetup.whisper.phase === 'loading' ? voiceSetup.whisper.progress == null ? 'Preparing Whisper…' : 'Downloading Whisper · ' + voiceSetup.whisper.progress + '%' : voiceSetup.whisper.phase === 'error' ? 'Retry Whisper download' : 'Download Whisper')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: '7px',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '14px',
      padding: '12px',
      background: 'rgba(255,255,255,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      color: 'white',
      fontSize: '12px'
    }
  }, "🔊 Kokoro read-aloud"), /*#__PURE__*/React.createElement("span", {
    id: "launch-pad-kokoro-desc",
    style: {
      display: 'block',
      color: '#e0e7ff',
      fontSize: '10px',
      lineHeight: 1.5,
      marginTop: '3px'
    }
  }, "Downloads the local voice model (about 88 MB) for natural English narration.")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "lp-download-button",
    "aria-describedby": "launch-pad-kokoro-desc",
    "aria-busy": voiceSetup.kokoro.phase === 'loading',
    disabled: voiceSetup.kokoro.phase === 'loading' || voiceSetup.kokoro.phase === 'ready',
    onClick: downloadKokoroFromLaunchPad
  }, voiceSetup.kokoro.phase === 'ready' ? '✓ Kokoro ready' : voiceSetup.kokoro.phase === 'loading' ? voiceSetup.kokoro.progress == null ? 'Preparing Kokoro…' : 'Downloading Kokoro · ' + voiceSetup.kokoro.progress + '%' : voiceSetup.kokoro.phase === 'error' ? 'Retry Kokoro download' : 'Download Kokoro'))), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    style: {
      minHeight: '16px',
      color: voiceSetup.whisper.phase === 'error' || voiceSetup.kokoro.phase === 'error' ? '#fecaca' : '#bbf7d0',
      fontSize: '10px',
      fontWeight: 700,
      lineHeight: 1.5,
      margin: '10px 0 0'
    }
  }, voiceSetup.message)))), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: '24px',
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
