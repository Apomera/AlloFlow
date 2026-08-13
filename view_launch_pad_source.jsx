
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
  var _voiceSetup = useState(function() {
    var whisperReady = false;
    var kokoroReady = false;
    try { whisperReady = !!(window.AlloFlowVoice && window.AlloFlowVoice.isWhisperLoaded && window.AlloFlowVoice.isWhisperLoaded('tiny')); } catch (_) {}
    try { kokoroReady = !!(window._kokoroTTS && window._kokoroTTS.ready); } catch (_) {}
    return {
      whisper: { phase: whisperReady ? 'ready' : 'idle', progress: null },
      kokoro: { phase: kokoroReady ? 'ready' : 'idle', progress: null },
      message: whisperReady || kokoroReady ? 'Previously downloaded offline voice tools are ready.' : ''
    };
  });
  var voiceSetup = _voiceSetup[0];
  var setVoiceSetup = _voiceSetup[1];
  function updateVoiceSetup(engine, patch, message) {
    setVoiceSetup(function(previous) {
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
      updateVoiceSetup('whisper', { phase: 'error', progress: null }, 'Whisper setup is not available yet. Enter AlloFlow, then try again from voice settings.');
      return;
    }
    var unsubscribe = function() {};
    if (typeof voice.subscribeToVoiceProgress === 'function') {
      unsubscribe = voice.subscribeToVoiceProgress(function(progress) {
        if (!progress || !/^model-|^transformers-fetch$/.test(String(progress.phase || ''))) return;
        var percent = typeof progress.progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress.progress))) : null;
        var detail = percent == null ? 'Preparing the Whisper speech model…' : 'Downloading Whisper speech recognition: ' + percent + '%.';
        updateVoiceSetup('whisper', { phase: 'loading', progress: percent }, detail);
      });
    }
    updateVoiceSetup('whisper', { phase: 'loading', progress: null }, 'Preparing the Whisper speech-recognition download…');
    try {
      await voice.preloadWhisper('tiny');
      updateVoiceSetup('whisper', { phase: 'ready', progress: 100 }, 'Whisper speech recognition is ready for offline-capable voice input.');
    } catch (_) {
      updateVoiceSetup('whisper', { phase: 'error', progress: null }, 'Whisper could not be downloaded. Check the connection or school network filter, then try again.');
    } finally {
      try { unsubscribe(); } catch (_) {}
    }
  }
  async function downloadKokoroFromLaunchPad() {
    if (voiceSetup.kokoro.phase === 'loading' || voiceSetup.kokoro.phase === 'ready') return;
    if (typeof window.__loadKokoroTTS !== 'function') {
      updateVoiceSetup('kokoro', { phase: 'error', progress: null }, 'Kokoro setup is not available yet. Enter AlloFlow, then try again from read-aloud settings.');
      return;
    }
    updateVoiceSetup('kokoro', { phase: 'loading', progress: null }, 'Preparing the Kokoro read-aloud download…');
    try {
      var ready = await window.__loadKokoroTTS(function(progress) {
        var ratio = progress && typeof progress.pct === 'number' ? progress.pct : null;
        var percent = ratio == null ? null : Math.max(0, Math.min(100, Math.round(ratio <= 1 ? ratio * 100 : ratio)));
        var stage = progress && progress.stage ? String(progress.stage) : 'Downloading Kokoro read-aloud';
        updateVoiceSetup('kokoro', { phase: 'loading', progress: percent }, stage + (percent == null ? '…' : ': ' + percent + '%.'));
      });
      if (!ready) throw new Error('Kokoro did not become ready');
      updateVoiceSetup('kokoro', { phase: 'ready', progress: 100 }, 'Kokoro read-aloud is ready on this device.');
    } catch (_) {
      updateVoiceSetup('kokoro', { phase: 'error', progress: null }, 'Kokoro could not be downloaded. Check the connection or school network filter, then try again.');
    }
  }
  var copy = function(key, fallback) {
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
  var voiceAccessButtonText = voiceAccessActive
    ? copy('launch_pad.voice_access_active', 'Voice Access Active')
    : voiceAccessStarting
      ? copy('launch_pad.voice_access_starting', 'Starting Voice Access...')
      : voiceAccessDenied
        ? copy('launch_pad.voice_access_retry', 'Retry Voice Access')
        : copy('launch_pad.voice_access_enable', 'Enable Voice Access');
  var voiceAccessStatusText = voiceAccessActive
    ? copy('launch_pad.voice_access_active_status', 'Voice Access is active. Continuous voice command listening is on.')
    : voiceAccessStarting
      ? copy('launch_pad.voice_access_starting_status', 'Starting Voice Access. Complete the browser or operating system microphone prompt if it appears.')
      : voiceAccessDenied
        ? copy('launch_pad.voice_access_denied_status', 'Voice Access could not start because microphone access was denied. You can retry after allowing it in your browser or operating system settings.')
        : micPermissionStatus === 'granted'
          ? copy('launch_pad.voice_access_ready_status', 'Microphone permission is ready, but Voice Access is not currently listening.')
          : '';
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
  var setUiLanguage = _langCtx.setUiLanguage || function(){};
  var isTranslating = !!_langCtx.isTranslating;
  var _langMenu = useState(false);
  var langMenuOpen = _langMenu[0];
  var setLangMenuOpen = _langMenu[1];
  var langTriggerRef = React.useRef(null);
  var langListRef = React.useRef(null);
  var closeLanguageMenu = function() {
    setLangMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.setTimeout(function() {
        if (langTriggerRef.current) langTriggerRef.current.focus();
      }, 0);
    }
  };
  // Dynamically loaded from the language pack manifest so the list stays in
  // sync with what's actually deployed. The local copy comes first so the
  // bundled app does not lose languages when it is offline or the CDN is down.
  // Mirrors the pattern in ui_language_selector_module.js.
  var FALLBACK_LANGUAGE_OPTIONS = [
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
  var _deployedLangs = useState(FALLBACK_LANGUAGE_OPTIONS);
  var LAUNCH_PAD_LANGS = _deployedLangs[0];
  var setLaunchPadLangs = _deployedLangs[1];
  React.useEffect(function() {
    var cancelled = false;
    var urls = [
      './lang/manifest.json',
      'https://alloflow-cdn.pages.dev/lang/manifest.json',
      'https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/manifest.json'
    ];
    (async function() {
      for (var i = 0; i < urls.length; i++) {
        try {
          var r = await fetch(urls[i], { cache: 'no-cache' });
          if (!r.ok) continue;
          var m = await r.json();
          if (m && Array.isArray(m.available)) {
            // Keep the endonym next to the English display name. The VALUE handed to
            // setUiLanguage stays the English name; only the label changes.
            var displays = m.available
              .filter(function(e) { return e && e.display; })
              .map(function(e) { return {
                value: e.display,
                endonym: e.endonym || e.display,
                provenance: e.provenance || 'ai-drafted'
              }; })
              .sort(function(a, b) { return a.value.localeCompare(b.value); });
            // English first, then alphabetical
            var ordered = [{ value: 'English', endonym: 'English' }]
              .concat(displays.filter(function(d) { return d.value !== 'English'; }));
            if (!cancelled) setLaunchPadLangs(ordered);
            return;
          }
        } catch (_) { /* try next URL */ }
      }
    })();
    return function() { cancelled = true; };
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

  React.useEffect(function() {
    if (!langMenuOpen || typeof document === 'undefined') return;
    var list = langListRef.current;
    var selectedButton = list && list.querySelector('button[aria-pressed="true"]');
    var firstButton = list && list.querySelector('button:not([disabled])');
    var focusTarget = selectedButton || firstButton;
    if (focusTarget) focusTarget.focus();
    var handleLanguageKeyDown = function(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLanguageMenu();
      }
    };
    document.addEventListener('keydown', handleLanguageKeyDown);
    return function() { document.removeEventListener('keydown', handleLanguageKeyDown); };
  }, [langMenuOpen]);
  React.useEffect(function() {
    if (typeof document === 'undefined') return;
    var body = document.body;
    var html = document.documentElement;
    if (!body || !html) return;
    // Ref-counted shared body scroll lock (window.__alloScrollLockState):
    // save/restore of body.style.overflow strands the page at
    // overflow:hidden when two modules interleave open/close non-LIFO.
    var scrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    if (++scrollLock.count === 1) { scrollLock.prev = body.style.overflow; body.style.overflow = 'hidden'; }
    var previousHtmlOverflow = html.style.overflow;
    body.classList.add('alloflow-launchpad-active');
    html.style.overflow = 'hidden';
    return function() {
      body.classList.remove('alloflow-launchpad-active');
      scrollLock.count = Math.max(0, scrollLock.count - 1);
      if (scrollLock.count === 0) body.style.overflow = scrollLock.prev;
      html.style.overflow = previousHtmlOverflow;
    };
  }, []);
  function LaunchPadIcon(iconProps) {
    var IconComponent = window.AlloIcons && window.AlloIcons[iconProps.name];
    if (IconComponent) {
      return <IconComponent className={iconProps.className || ''} size={iconProps.size || 22} strokeWidth={iconProps.strokeWidth || 1.9} aria-hidden="true" focusable="false" />;
    }
    return <span className={iconProps.className || ''} aria-hidden="true">{iconProps.fallback || '\u25c7'}</span>;
  }
  return (
        <div className="lp-root" data-alloflow-launch-pad="true" role="region" aria-label="Choose how to use AlloFlow" style={{
          position: 'fixed', inset: 0, zIndex: 2147483000,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          backgroundColor: '#080d1d',
          animation: 'lpEnter .28s ease-out',
          overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box',
        }}>
          <style>{`
            @keyframes lpEnter { from { opacity: 0; } to { opacity: 1; } }
            body.alloflow-launchpad-active #allo-err-badge { display: none !important; }
            .lp-root { justify-content: flex-start; padding: 88px 0 42px; isolation: isolate; color-scheme: dark; }
            .lp-root { background: radial-gradient(circle at 14% 0%, rgba(99,102,241,.18), transparent 34%), radial-gradient(circle at 88% 8%, rgba(14,165,233,.11), transparent 30%), linear-gradient(155deg, #080b16 0%, #0d1324 48%, #10182b 100%); }
            .lp-root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
            .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; }
            .lp-shell { width: min(760px, 100%); padding: 0 24px; display: grid; gap: 28px; }
            .lp-utility-bar { position: absolute; top: 18px; right: 20px; z-index: 2147483001; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
            .lp-lang-switcher { position: relative; }
            .lp-logo-block { text-align: center; }
            .lp-voice-setup { width: 100%; }
            .lp-launch-footer { padding-top: 2px; }
            .lp-section-intro { display: grid; gap: 7px; margin-bottom: 14px; }
            .lp-eyebrow { margin: 0; color: #a5b4fc; font-size: 10px; font-weight: 850; letter-spacing: 1.45px; text-transform: uppercase; }
            .lp-section-title { margin: 0; color: #f8fafc; font-size: clamp(20px, 3vw, 25px); line-height: 1.2; font-weight: 820; letter-spacing: -.45px; }
            .lp-section-copy { margin: 0; color: #aebbd2; font-size: 12px; line-height: 1.55; }
            .lp-mode-grid, .lp-direct-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .lp-card { appearance: none; width: 100%; min-height: 44px; font: inherit; color: inherit; text-align: left; background: rgba(20,29,49,.92); border: 1px solid rgba(148,163,184,.22); border-radius: 18px; cursor: pointer; transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease; position: relative; overflow: hidden; box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 14px 36px rgba(2,6,23,.2); }
            .lp-card::before { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; border-top: 1px solid rgba(255,255,255,.06); }
            .lp-card::after { content: '→'; position: absolute; right: 20px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 18px; transition: transform .18s ease, color .18s ease; }
            .lp-mode-grid .lp-card { min-height: 178px; padding: 24px 54px 22px 22px; }
            .lp-mode-grid .lp-card[data-emphasis="recommended"] { background: linear-gradient(145deg, rgba(55,48,163,.86), rgba(30,41,82,.96)); border-color: rgba(165,180,252,.62); box-shadow: inset 0 1px 0 rgba(255,255,255,.13), 0 18px 46px rgba(49,46,129,.28); }
            .lp-direct-grid .lp-card { min-height: 104px; padding: 18px 50px 18px 18px; display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: 13px; box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 10px 26px rgba(2,6,23,.15); }
            .lp-card-icon { display: inline-grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(165,180,252,.24); border-radius: 13px; color: #c7d2fe; background: rgba(99,102,241,.14); box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 8px 18px rgba(2,6,23,.14); transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease; }
            .lp-mode-grid .lp-card-icon { width: 46px; height: 46px; margin-bottom: 18px; border-radius: 14px; }
            .lp-card[data-emphasis="recommended"] .lp-card-icon { color: #fff7d6; border-color: rgba(253,230,138,.33); background: rgba(253,230,138,.12); }
            .lp-card[data-pathway="full"] .lp-card-icon { color: #bae6fd; border-color: rgba(125,211,252,.3); background: rgba(14,165,233,.11); }
            .lp-card[data-pathway="learning"] .lp-card-icon { color: #a7f3d0; border-color: rgba(110,231,183,.3); background: rgba(16,185,129,.11); }
            .lp-card[data-pathway="educator"] .lp-card-icon { color: #ddd6fe; border-color: rgba(196,181,253,.3); background: rgba(139,92,246,.11); }
            .lp-card-title { display: block; color: #f8fafc; font-size: 17px; font-weight: 820; line-height: 1.25; letter-spacing: -.2px; }
            .lp-card-desc { display: block; color: #c3cede; font-size: 11px; line-height: 1.55; margin-top: 6px; }
            .lp-direct-copy { min-width: 0; padding-right: 4px; }
            .lp-badge { display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #4f46e5, #3730a3); color: white; font-size: 9px; font-weight: 800; padding: 5px 9px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; text-transform: uppercase; letter-spacing: 1.1px; box-shadow: 0 4px 14px rgba(15,23,42,.2); }
            .lp-mode-badge { position: absolute; top: 14px; right: 14px; }
            .lp-direct-badge { display: inline-block; margin-top: 8px; color: #a5b4fc; font-size: 9px; font-weight: 800; letter-spacing: .75px; text-transform: uppercase; }
            .lp-direct-badge .lp-badge { padding: 3px 7px; font-size: 8px; letter-spacing: .8px; box-shadow: none; }
            @media (hover: hover) {
              .lp-card:hover { transform: translateY(-2px); background: rgba(27,38,63,.98); border-color: rgba(165,180,252,.48); box-shadow: inset 0 1px 0 rgba(255,255,255,.075), 0 18px 42px rgba(2,6,23,.28); }
              .lp-card:hover::after { transform: translate(3px, -50%); color: #fde68a; }
              .lp-card:hover .lp-card-icon { transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 10px 22px rgba(2,6,23,.2); }
            }
            .lp-card:focus-visible { outline: 3px solid #facc15; outline-offset: 4px; background: rgba(30,41,67,.98); border-color: rgba(255,255,255,0.65); box-shadow: 0 0 0 2px #1e1b4b; }
            .lp-card:active { transform: translateY(0) scale(.995); }
            .lp-setup-panel { border: 1px solid rgba(148,163,184,.18); border-top: 0; border-radius: 0 0 16px 16px; background: rgba(8,13,27,.52); padding: 16px; }
            .lp-mic-panel { display: grid; gap: 13px; padding: 14px; border: 1px solid rgba(165,180,252,.2); border-radius: 14px; background: rgba(255,255,255,.035); }
            .lp-mic-title-row { display: flex; align-items: flex-start; gap: 11px; }
            .lp-mic-icon { flex: 0 0 auto; display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: #c7d2fe; background: rgba(99,102,241,.15); border: 1px solid rgba(165,180,252,.2); }
            .lp-mic-actions { display: flex; gap: 9px; flex-wrap: wrap; }
            .lp-mic-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
            .lp-setup-divider { height: 1px; margin: 16px 0; background: rgba(148,163,184,.16); }
            .lp-offline-header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 12px; margin-bottom: 11px; }
            .lp-voice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
            .lp-voice-option { display: grid; gap: 8px; border: 1px solid rgba(148,163,184,.16); border-radius: 13px; padding: 12px; background: rgba(255,255,255,.035); }
            .lp-voice-option-title { display: flex; align-items: center; gap: 7px; color: #f8fafc; font-size: 12px; }
            .lp-lang-trigger, .lp-ai-settings { display: inline-flex; align-items: center; gap: 7px; padding: 8px 11px; border: 1px solid rgba(148,163,184,.22); border-radius: 11px; background: rgba(15,23,42,.76); color: #dbe4f3; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; backdrop-filter: blur(16px); transition: background .18s ease, border-color .18s ease, color .18s ease; }
            .lp-lang-trigger:hover:not([aria-disabled="true"]), .lp-ai-settings:hover { background: rgba(30,41,67,.96); border-color: rgba(165,180,252,.42); color: white; }
            .lp-lang-item:hover:not([disabled]) { background: rgba(99,102,241,0.2) !important; }
            .lp-download-button { min-height: 44px; border: 1px solid rgba(165,180,252,.38); border-radius: 11px; padding: 10px 13px; background: rgba(67,56,202,.64); color: white; font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; transition: background .18s, transform .18s, border-color .18s; box-shadow: inset 0 1px 0 rgba(255,255,255,.1); }
            .lp-download-button:hover:not([disabled]) { background: #4f46e5; border-color: rgba(199,210,254,.72); transform: translateY(-1px); }
            .lp-download-button[disabled] { cursor: default; opacity: 0.75; }
            .lp-voice-disclosure > summary { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 15px; border: 1px solid rgba(148,163,184,.2); border-radius: 16px; color: #cbd5e1; background: rgba(15,23,42,.5); font-size: 11px; font-weight: 800; cursor: pointer; list-style: none; }
            .lp-voice-disclosure > summary::-webkit-details-marker { display: none; }
            .lp-voice-summary-copy { display: inline-flex; align-items: center; gap: 9px; }
            .lp-voice-summary-meta { margin-left: auto; color: #94a3b8; font-size: 10px; font-weight: 650; }
            .lp-voice-disclosure > summary::after { content: '+'; font-size: 18px; color: #a5b4fc; }
            .lp-voice-disclosure[open] > summary { border-radius: 16px 16px 0 0; background: rgba(30,41,67,.78); color: #f8fafc; }
            .lp-voice-disclosure[open] > summary::after { content: '−'; }
            .lp-lang-trigger:focus-visible, .lp-lang-item:focus-visible, .lp-mic-actions button:focus-visible, .lp-download-button:focus-visible, .lp-ai-settings:focus-visible { outline: 3px solid #facc15; outline-offset: 3px; }
            .lp-voice-disclosure > summary:focus-visible { outline: 3px solid #facc15; outline-offset: 3px; }
            .lp-lang-trigger, .lp-lang-item, .lp-mic-actions button, .lp-download-button, .lp-ai-settings { min-height: 44px; }
            @media (max-width: 680px), (max-height: 820px) { .lp-root { justify-content: flex-start !important; } }
            @media (max-width: 680px) {
              .lp-root { padding: 18px 0 32px !important; }
              .lp-utility-bar { position: static; width: 100%; padding: 0 16px; margin-bottom: 22px; }
              .lp-shell { padding: 0 16px; gap: 24px; }
              .lp-logo-block { margin-bottom: 2px !important; }
              .lp-mode-grid, .lp-direct-grid { grid-template-columns: 1fr !important; }
              .lp-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
              .lp-mode-grid .lp-card { min-height: 142px; padding: 20px 54px 19px 19px; }
              .lp-direct-grid .lp-card { min-height: 92px; }
              .lp-mic-actions { flex-direction: column; align-items: stretch; }
              .lp-mic-actions button { width: 100%; }
              .lp-voice-grid { grid-template-columns: 1fr !important; }
              .lp-voice-summary-meta { display: none; }
            }
            @media (max-width: 390px) {
              .lp-utility-bar { justify-content: space-between; }
              .lp-lang-trigger > span:nth-child(2) { max-width: 108px !important; }
              .lp-section-title { font-size: 20px; }
            }
            @media (max-width: 360px) {
              .lp-ai-settings { width: 44px; padding: 8px; justify-content: center; }
              .lp-ai-settings span { display: none; }
            }
            @media (prefers-reduced-motion: reduce) {
              .lp-root, .lp-card, .lp-card:hover, .lp-card:active, .lp-card-icon, .lp-badge, .lp-lang-item, .lp-lang-trigger, .lp-mic-actions button, .lp-download-button, .lp-download-button:hover, .lp-ai-settings { animation: none !important; transition: none !important; transform: none !important; }
            }
          `}</style>
          {/* ── Compact Language Switcher (top-right) ── */}
          <div className="lp-utility-bar" aria-label={copy('launch_pad.utilities_label', 'Launch Pad settings')}>
          {!_isCanvasEnv && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowAIBackendModal(true); }}
              className="lp-ai-settings"
              aria-label="AI Backend Settings"
              title="AI Backend Settings"
            >
              <Unplug size={15} aria-hidden="true" />
              <span>AI Backend Settings</span>
            </button>
          )}
          <div className="lp-lang-switcher">
            <button
              type="button"
              ref={langTriggerRef}
              className="lp-lang-trigger"
              onClick={() => { if (!isTranslating) setLangMenuOpen(!langMenuOpen); }}
              aria-label={(t('launch_pad.change_language') || 'Change language') + '. ' + (t('launch_pad.current_language') || 'Current') + ': ' + currentUiLanguage}
              aria-expanded={langMenuOpen}
              aria-haspopup="true"
              aria-controls="launch-pad-language-list"
              aria-disabled={isTranslating}
              style={{ opacity: isTranslating ? 0.6 : 1, cursor: isTranslating ? 'wait' : 'pointer' }}
            >
              <LaunchPadIcon name="Globe" size={15} strokeWidth={2} />
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lpCurrentLabel()}</span>
              <LaunchPadIcon name={langMenuOpen ? 'ChevronUp' : 'ChevronDown'} size={13} strokeWidth={2.2} />
            </button>
            {langMenuOpen && (
              <>
                <div onClick={closeLanguageMenu} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 99999 }} />
                <ul id="launch-pad-language-list" ref={langListRef} aria-label={t('launch_pad.available_languages') || 'Available languages'} style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'rgba(15,23,42,0.96)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                  padding: '6px', minWidth: '220px', margin: 0, listStyle: 'none',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  maxHeight: '60vh', overflowY: 'auto', zIndex: 100001,
                }}>
                  {LAUNCH_PAD_LANGS.map((lang) => {
                    var langName = lang.value;
                    var selected = langName === currentUiLanguage;
                    return (
                      <li key={langName} style={{ margin: 0 }}>
                        <button
                          type="button"
                          className="lp-lang-item"
                          aria-pressed={selected}
                          disabled={isTranslating}
                          onClick={() => { closeLanguageMenu(); if (!selected) setUiLanguage(langName); }}
                          style={{
                            display: 'block', width: '100%', textAlign: 'start',
                            padding: '9px 12px', borderRadius: '8px', border: 'none',
                            background: selected ? 'rgba(99,102,241,0.3)' : 'transparent',
                            color: 'white', fontSize: '13px', fontWeight: selected ? 700 : 500,
                            cursor: isTranslating ? 'wait' : 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          {selected ? '✓ ' : '  '}{lpLangLabel(lang)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          </div>
          <main className="lp-shell">
          <header className="lp-logo-block">
            <img src="rainbow-book.jpg" alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '58px', height: '58px', margin: '0 auto 14px', display: 'block', filter: 'drop-shadow(0 12px 24px rgba(2,6,23,.42))', borderRadius: '16px', border: '1px solid rgba(255,255,255,.2)', objectFit: 'cover' }} />
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 41px)', lineHeight: 1, fontWeight: 900, background: 'linear-gradient(100deg,#fff7d6,#fcd34d 42%,#fb923c)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', margin: '0 0 10px', letterSpacing: '-1.45px' }}>AlloFlow</h1>
            <p style={{ fontSize: '10px', color: '#aebbd2', fontWeight: 780, letterSpacing: '2.25px', textTransform: 'uppercase', margin: 0 }}>{copy('launch_pad.subtitle', 'Adaptive Levels, Layers, & Outputs')}</p>
          </header>
          <section className="lp-choice-section" aria-labelledby="launch-pad-choice-title">
            <div className="lp-section-intro">
              <p className="lp-eyebrow">{copy('launch_pad.workspace_eyebrow', 'Choose your workspace')}</p>
              <h2 id="launch-pad-choice-title" className="lp-section-title">{copy('launch_pad.choice_title', 'How would you like to begin?')}</h2>
              <p className="lp-section-copy">{copy('launch_pad.choice_desc', 'Start with step-by-step guidance or open the complete AlloFlow workspace.')}</p>
            </div>
          <div className="lp-grid lp-mode-grid">
            {/* setGuidedMode(false) is not redundant: a restored workspace can arrive
                with guided mode already on, and Full Platform is a non-guided choice. */}
            <button type="button" className="lp-card" data-emphasis="recommended" data-pathway="guided" aria-labelledby="launch-pad-guided-title" aria-describedby="launch-pad-guided-badge launch-pad-guided-desc" onClick={() => { setHasSelectedMode(true); setGuidedMode(true); }}>
              <span id="launch-pad-guided-badge" className="lp-mode-badge"><span className="lp-badge">{copy('launch_pad.badge_recommended', 'Recommended')}</span></span>
              <LaunchPadIcon className="lp-card-icon" name="ListChecks" size={24} />
              <span id="launch-pad-guided-title" className="lp-card-title">{guidedTitle}</span>
              <span id="launch-pad-guided-desc" className="lp-card-desc">{guidedDesc}</span>
            </button>
            <button type="button" className="lp-card" data-emphasis="standard" data-pathway="full" aria-labelledby="launch-pad-full-title" aria-describedby="launch-pad-full-desc" onClick={() => { setHasSelectedMode(true); setGuidedMode(false); }}>
              <LaunchPadIcon className="lp-card-icon" name="Layout" size={24} />
              <span id="launch-pad-full-title" className="lp-card-title">{fullTitle}</span>
              <span id="launch-pad-full-desc" className="lp-card-desc">{fullDesc}</span>
            </button>
          </div>
          </section>
          <section className="lp-direct-section" aria-labelledby="launch-pad-direct-title">
            <div className="lp-section-intro">
              <p className="lp-eyebrow">{copy('launch_pad.direct_eyebrow', 'Destinations')}</p>
              <h2 id="launch-pad-direct-title" className="lp-section-title">{copy('launch_pad.direct_title', 'Open a tool directly')}</h2>
              <p className="lp-section-copy">{copy('launch_pad.direct_desc', 'Jump straight to a focused collection without opening the full workspace first.')}</p>
            </div>
            <div className="lp-direct-grid">
            <button type="button" className="lp-card" data-pathway="learning" aria-labelledby="launch-pad-learning-title" aria-describedby="launch-pad-learning-badge launch-pad-learning-desc" onClick={() => { setShowLearningHub(true); setIsTeacherMode(false); setShowWizard(false); setHasSelectedRole(true); setHasSelectedMode(true); }}>
              <LaunchPadIcon className="lp-card-icon" name="Backpack" size={22} />
              <span className="lp-direct-copy">
                <span id="launch-pad-learning-title" className="lp-card-title">{learningToolsTitle}</span>
                <span id="launch-pad-learning-desc" className="lp-card-desc">{learningToolsDesc}</span>
                <span id="launch-pad-learning-badge" className="lp-direct-badge"><span className="lp-badge" style={{ background: 'linear-gradient(135deg, #047857, #065f46)' }}>{copy('launch_pad.badge_3_tools', '8 Tools')}</span></span>
              </span>
            </button>
            <button type="button" className="lp-card" data-pathway="educator" aria-labelledby="launch-pad-educator-title" aria-describedby="launch-pad-educator-badge launch-pad-educator-desc" onClick={() => { setHasSelectedMode(true); setHasSelectedRole(true); setShowWizard(false); if ((typeof window._alloEducatorAccessCodeRequired === 'function' ? window._alloEducatorAccessCodeRequired() : !!APP_CONFIG._cfg_validation_key)) { setPendingRole('educator_hub'); setIsGateOpen(true); } else { setIsTeacherMode(true); setShowEducatorHub(true); } }}>
              <LaunchPadIcon className="lp-card-icon" name="GraduationCap" size={22} />
              <span className="lp-direct-copy">
                <span id="launch-pad-educator-title" className="lp-card-title">{educatorToolsTitle}</span>
                <span id="launch-pad-educator-desc" className="lp-card-desc">{educatorToolsDesc}</span>
                <span id="launch-pad-educator-badge" className="lp-direct-badge"><span className="lp-badge" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>{(typeof window._alloEducatorAccessCodeRequired === 'function' ? window._alloEducatorAccessCodeRequired() : !!APP_CONFIG._cfg_validation_key) ? copy('launch_pad.badge_educator', 'Educator') : copy('launch_pad.badge_educator_open', 'Educator')}</span></span>
              </span>
            </button>
          </div>
          </section>
          <section className="lp-voice-setup" aria-labelledby="launch-pad-offline-voice-title">
            <details className="lp-voice-disclosure">
            <summary id="launch-pad-offline-voice-title">
              <span className="lp-voice-summary-copy"><LaunchPadIcon name="Settings2" size={16} />{copy('launch_pad.voice_device_title', 'Voice & device setup')}</span>
              <span className="lp-voice-summary-meta">{voiceAccessActive ? copy('launch_pad.voice_access_active_short', 'Voice active') : copy('launch_pad.optional_label', 'Optional')}</span>
            </summary>
            <div className="lp-setup-panel">
              {!micBannerDismissed && (
                <>
                <div className="lp-mic-panel">
                  <div className="lp-mic-title-row">
                    <span className="lp-mic-icon"><LaunchPadIcon name="Mic" size={18} /></span>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>
                        {copy('launch_pad.voice_access_title', 'Voice Access')}
                      </p>
                      <p id="launch-pad-voice-access-description" style={{ fontSize: '11px', color: '#c7d2fe', margin: 0, lineHeight: '1.5' }}>
                        {copy('launch_pad.voice_access_desc', 'Your browser or operating system may require microphone activation once. After permission, continuous voice command listening starts. Voice Access is optional; touch, pointer, and keyboard remain available.')}
                      </p>
                    </div>
                  </div>
                  {_isCanvasEnv && (
                    <p style={{ fontSize: '10px', color: '#fbbf24', margin: 0, textAlign: 'center', lineHeight: '1.5', fontWeight: 600 }}>
                      ⚠️ {copy('launch_pad.mic_canvas_warning', 'In this environment, enabling the microphone will briefly reload the app. It\'s best to do it now before you start working.')}
                    </p>
                  )}
                  <div className="lp-mic-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={handleEnableVoiceAccess}
                      disabled={voiceAccessActive || voiceAccessStarting}
                      aria-disabled={voiceAccessActive || voiceAccessStarting}
                      aria-busy={voiceAccessStarting}
                      aria-describedby="launch-pad-voice-access-description launch-pad-voice-access-status"
                      aria-label={voiceAccessButtonText}
                      style={{
                        padding: '10px 24px', borderRadius: '14px', border: 'none', cursor: voiceAccessStarting ? 'wait' : voiceAccessActive ? 'default' : 'pointer',
                        background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
                        color: 'white', fontSize: '13px', fontWeight: 700,
                        opacity: voiceAccessStarting ? 0.6 : 1,
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                      }}
                    >
                      <LaunchPadIcon name={voiceAccessStarting ? 'Loader2' : voiceAccessActive ? 'CheckCircle2' : 'Mic'} size={15} />{voiceAccessButtonText}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMicBannerDismissed(true)}
                      aria-label="Skip Voice Access setup"
                      style={{
                        padding: '10px 24px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer', background: 'rgba(255,255,255,0.06)',
                        color: '#c7d2fe', fontSize: '13px', fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      {copy('launch_pad.voice_access_skip', 'Skip for Now')}
                    </button>
                  </div>
                  <p id="launch-pad-voice-access-status" role="status" aria-live="polite" aria-atomic="true" style={{ minHeight: '16px', fontSize: '11px', color: voiceAccessDenied ? '#fca5a5' : '#34d399', margin: 0, fontWeight: voiceAccessDenied ? 600 : 700 }}>
                    {voiceAccessStatusText}
                  </p>
                </div>
                <div className="lp-setup-divider" aria-hidden="true" />
                </>
              )}
              <div className="lp-offline-header">
                <h2 style={{ color: 'white', fontSize: '13px', fontWeight: 820, margin: 0 }}>{copy('launch_pad.on_device_title', 'Private, on-device options')}</h2>
                <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 650 }}>{copy('launch_pad.on_device_note', 'One-time download · stored locally when supported')}</span>
              </div>
              <div className="lp-voice-grid">
                <div className="lp-voice-option">
                  <div><strong className="lp-voice-option-title"><LaunchPadIcon name="Mic" size={15} />Whisper speech recognition</strong><span id="launch-pad-whisper-desc" style={{ display: 'block', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.5, marginTop: '3px' }}>Improves private, offline-capable voice input after the model is ready.</span></div>
                  <button type="button" className="lp-download-button" aria-describedby="launch-pad-whisper-desc" aria-busy={voiceSetup.whisper.phase === 'loading'} disabled={voiceSetup.whisper.phase === 'loading' || voiceSetup.whisper.phase === 'ready'} onClick={downloadWhisperFromLaunchPad}>{voiceSetup.whisper.phase === 'ready' ? '✓ Whisper ready' : voiceSetup.whisper.phase === 'loading' ? (voiceSetup.whisper.progress == null ? 'Preparing Whisper…' : 'Downloading Whisper · ' + voiceSetup.whisper.progress + '%') : voiceSetup.whisper.phase === 'error' ? 'Retry Whisper download' : 'Download Whisper'}</button>
                </div>
                <div className="lp-voice-option">
                  <div><strong className="lp-voice-option-title"><LaunchPadIcon name="Volume2" size={15} />Kokoro read-aloud</strong><span id="launch-pad-kokoro-desc" style={{ display: 'block', color: '#e0e7ff', fontSize: '10px', lineHeight: 1.5, marginTop: '3px' }}>Downloads the local voice model (about 88 MB) for natural English narration.</span></div>
                  <button type="button" className="lp-download-button" aria-describedby="launch-pad-kokoro-desc" aria-busy={voiceSetup.kokoro.phase === 'loading'} disabled={voiceSetup.kokoro.phase === 'loading' || voiceSetup.kokoro.phase === 'ready'} onClick={downloadKokoroFromLaunchPad}>{voiceSetup.kokoro.phase === 'ready' ? '✓ Kokoro ready' : voiceSetup.kokoro.phase === 'loading' ? (voiceSetup.kokoro.progress == null ? 'Preparing Kokoro…' : 'Downloading Kokoro · ' + voiceSetup.kokoro.progress + '%') : voiceSetup.kokoro.phase === 'error' ? 'Retry Kokoro download' : 'Download Kokoro'}</button>
                </div>
              </div>
              <p role="status" aria-live="polite" aria-atomic="true" style={{ minHeight: '16px', color: voiceSetup.whisper.phase === 'error' || voiceSetup.kokoro.phase === 'error' ? '#fecaca' : '#bbf7d0', fontSize: '10px', fontWeight: 700, lineHeight: 1.5, margin: '10px 0 0' }}>{voiceSetup.message}</p>
            </div>
            </details>
          </section>
          <footer className="lp-launch-footer">
            <p style={{ margin: 0, textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 550 }}>{switchHint}</p>
          </footer>
          </main>
        </div>
  );
}
