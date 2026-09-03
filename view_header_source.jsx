/**
 * AlloFlow — Header Bar Module
 *
 * The top header bar (when !isZenMode): brand/logo on the left, AI/TTS/export
 * controls + session toolbar on the right. The largest single JSX block of
 * the AlloFlowANTI.txt render — extracted as one module.
 *
 * Extracted from AlloFlowANTI.txt lines 20524-21339 (May 2026).
 *
 * Required props (~119 React state/handlers/setters + 41 icon globals).
 * See HEADER_PROPS catalog at bottom of this file for full list.
 *
 * Icons: read from window globals (each falls back to noop). Avoids tight
 * coupling to the parent app's lucide-react imports.
 */
const _headerUseFocusTrap = (typeof window !== 'undefined' && window.__alloHooks && window.__alloHooks.useFocusTrap) || function(){};

// ── Popover escape hatch ──────────────────────────────────────────────────────
// The Text and Voice settings panels are position:fixed with z-[10001], but they
// were rendered inside #tour-header-settings (relative z-[60]), which is itself
// inside <header> (relative z-50). Each of those is a stacking context, so the
// panel's z-index was only ever compared against its siblings INSIDE the z-60
// box — never against the rest of the page. The sibling #tour-header-utils pill
// (bot toggle / help / cloud sync) sits at z-[100] in the same parent context
// and therefore painted OVER both panels, along with their click-outside
// backdrops.
//
// On a wide screen the pill shares a row with everything else and never reaches
// the panel's `top-28`, so the bug stayed invisible. On a phone the pill is
// `w-full` and wraps onto its own row directly beneath the header — landing
// squarely on the panel and swallowing every tap aimed at the controls.
//
// Portalling to <body> puts the panel in the root stacking context, where
// z-[10001] means what it reads. Falls back to rendering in place if ReactDOM
// is not on window (SSR/test harness), which is no worse than the old behaviour.
const _headerPortal = (node) => {
    try {
        if (typeof window !== 'undefined' && window.ReactDOM && typeof window.ReactDOM.createPortal === 'function'
            && typeof document !== 'undefined' && document.body) {
            return window.ReactDOM.createPortal(node, document.body);
        }
    } catch (_) {}
    return node;
};

// ── Panel skin ────────────────────────────────────────────────────────────────
// Everything _headerPortal renders has to pick its own colours, in JS, from the
// app's `theme` value. Two independent reasons, both measured:
//
//  1. The portal target is document.body. `theme-${theme}` and the `allo-docsuite`
//     scope class both live on divs INSIDE #root (AlloFlowANTI.txt), so a
//     portalled panel is a sibling of the whole themed tree. Neither the theme
//     class nor the generated dark remap in app_styles_source.jsx (which is a
//     `.theme-dark .allo-docsuite ...` descendant selector) can reach it.
//
//  2. Tailwind's `dark:` variant is NOT a substitute. desktop/web-app/tailwind.config.js
//     sets no `darkMode` key, so Tailwind 3.4 uses its default `media` strategy:
//     the shipped bundle has exactly one `@media (prefers-color-scheme: dark)`
//     block and zero `.dark` class rules. `dark:` follows the USER'S OPERATING
//     SYSTEM, never the app's theme toggle.
//
// Together those made these two panels unreadable. Measured in Chromium against
// the real stylesheet with app theme = dark and OS = light, before this change:
//     font-family <select>   #ffffff on #ffffff   contrast 1.00
//     font preview           #ffffff on #f8fafc   contrast 1.04
//     narrator <select>      #ffffff on #f8fafc   contrast 1.05
// The same markup with OS = dark measured 14.63 / 6.04 / 14.63, which is why the
// defect looked intermittent rather than constant.
//
// Contrast theme uses the same black/yellow the header buttons already use, so
// the panels stop being the one part of the header that ignores that theme.
const _headerPanelSkin = (theme) => {
    if (theme === 'contrast') return {
        panel:   'bg-black border-yellow-400 text-yellow-400',
        divider: 'border-yellow-400',
        surface: 'bg-black border border-yellow-400 text-yellow-400',
        chip:    'bg-black border border-yellow-400 text-yellow-400',
        action:  'text-yellow-400 hover:text-black hover:bg-yellow-400',
        dismiss: 'text-yellow-400 hover:text-black hover:bg-yellow-400',
        field:   'bg-black border-yellow-400 text-yellow-400',
        label:   'text-yellow-400',
        muted:   'text-yellow-400',
        ghost:   'hover:bg-yellow-400 hover:text-black',
        accent:  'bg-yellow-400 text-black',
        note:    'bg-black border-yellow-400',
        noteHead:'text-yellow-400',
        noteBody:'text-yellow-400',
    };
    if (theme === 'dark') return {
        panel:   'bg-slate-800 border-slate-600 text-white',
        divider: 'border-slate-700',
        surface: 'bg-slate-700 text-slate-100',
        chip:    'bg-slate-600 text-slate-100',
        action:  'text-indigo-300 hover:text-indigo-200',
        dismiss: 'text-slate-300 hover:text-red-300',
        field:   'bg-slate-900 border-slate-600 text-slate-100',
        label:   'text-slate-300',
        muted:   'text-slate-300',
        ghost:   'hover:bg-slate-700',
        accent:  'bg-indigo-900 border-indigo-400 text-indigo-100',
        note:    'bg-blue-950 border-blue-700',
        noteHead:'text-blue-300',
        noteBody:'text-blue-100',
    };
    return {
        panel:   'bg-white border-slate-200 text-slate-800',
        divider: 'border-slate-100',
        surface: 'bg-slate-100 text-slate-700',
        chip:    'bg-slate-200 text-slate-600',
        action:  'text-indigo-600 hover:text-indigo-800',
        dismiss: 'text-slate-600 hover:text-red-700',
        field:   'bg-white border-slate-400 text-slate-800',
        label:   'text-slate-600',
        muted:   'text-slate-600',
        ghost:   'hover:bg-slate-100',
        accent:  'bg-indigo-50 border-indigo-500 text-indigo-700',
        note:    'bg-blue-50 border-blue-200',
        noteHead:'text-blue-600',
        noteBody:'text-blue-800',
    };
};

function HeaderBar(props) {
  const noop = () => null;
  const AlertCircle = window.AlertCircle || noop;
  // X and History were referenced BARE and resolved only because the host
  // Object.assign()s lucide icons onto window — check_free_vars flags them.
  // Declaring them matches every other icon here; behavior is unchanged.
  const X = window.X || noop;
  // C4b follow-through (W3, 2026-08-16). `window.History` is a DOM built-in: the
  // History interface CONSTRUCTOR. React treats a bare class as a function
  // component and calls it without `new`, which throws
  // "Class constructor History cannot be invoked without 'new'" and takes the
  // whole header down. In the running app it happens to work, and only because
  // AlloFlowANTI.txt Object.assign()s the lucide icons onto window and clobbers
  // the DOM global before any module renders. Depending on that is the trap.
  // AlloIcons first, DOM global never reached when the registry is present.
  const icon = (name) => (window.AlloIcons && window.AlloIcons[name]) || window[name] || noop;
  const History = icon('History');
  const ArrowRight = window.ArrowRight || noop;
  const BookOpen = window.BookOpen || noop;
  const CheckCircle2 = window.CheckCircle2 || noop;
  const ChevronDown = window.ChevronDown || noop;
  const ChevronUp = window.ChevronUp || noop;
  const CircleHelp = window.CircleHelp || noop;
  const ClipboardList = window.ClipboardList || noop;
  const Cloud = window.Cloud || noop;
  const CloudOff = window.CloudOff || noop;
  const Code = window.Code || noop;
  const Ear = window.Ear || noop;
  const Eye = window.Eye || noop;
  const FileDown = window.FileDown || noop;
  const FileText = window.FileText || noop;
  const FolderDown = window.FolderDown || noop;
  const GraduationCap = window.GraduationCap || noop;
  const Headphones = window.Headphones || noop;
  const Heart = window.Heart || noop;
  const Info = window.Info || noop;
  const Languages = window.Languages || noop;
  const Layers = window.Layers || noop;
  const Layout = window.Layout || noop;
  const Lightbulb = window.Lightbulb || noop;
  const MapIcon = window.MapIcon || noop;
  const Maximize = window.Maximize || noop;
  const Minimize = window.Minimize || noop;
  const MonitorPlay = window.MonitorPlay || noop;
  const Moon = window.Moon || noop;
  const Palette = window.Palette || noop;
  const RefreshCw = window.RefreshCw || noop;
  const School = window.School || noop;
  const Send = window.Send || noop;
  const Share2 = window.Share2 || noop;
  const Smile = window.Smile || noop;
  const Sparkles = window.Sparkles || noop;
  const Sun = window.Sun || noop;
  const Type = window.Type || noop;
  const Unplug = window.Unplug || noop;
  const Wifi = window.Wifi || noop;
  const WifiOff = window.WifiOff || noop;
  const Zap = window.Zap || noop;
  const ZapOff = window.ZapOff || noop;

  // Phase 2 migration (May 10 2026): consume cross-cutting state via the
  // contexts added in Phase 1. 20 props lifted from the prop drilling
  // interface (1 ActiveView + 3 Role + 16 Theme). The Provider tree wraps
  // the entire AlloFlowContent return so this useContext call always finds
  // a value; the `|| {}` fallback covers the rare CDN-loaded-before-Provider
  // race condition.
  const _activeViewCtx = React.useContext(window.AlloActiveViewContext) || {};
  const _roleCtx = React.useContext(window.AlloRoleContext) || {};
  const _themeCtx = React.useContext(window.AlloThemeContext) || {};
  const { activeView } = _activeViewCtx;
  // Parent mode runs with isTeacherMode: true, so professional/class surfaces
  // must exclude it EXPLICITLY, exactly as isIndependentMode already does.
  // Kept for parents on purpose: the teacher/student view toggle (the
  // hand-the-device-to-your-child affordance), Class Analytics, and the
  // password-gated Educator Tools. See MODE_AUDIT_2026-08-03.md F1.
  const { isTeacherMode, isIndependentMode, isParentMode, setIsTeacherMode } = _roleCtx;
  const {
    theme, colorOverlay, readingTheme, readingThemeFavorites = [], readingThemePreferenceScope, focusMode, disableAnimations,
    baseFontSize, lineHeight, letterSpacing, selectedFont,
    setReadingTheme, toggleReadingThemeFavorite, setBaseFontSize, setLineHeight, setLetterSpacing, setSelectedFont,
    toggleTheme, toggleOverlay,
  } = _themeCtx;
  // Colours for the two portalled settings panels. See _headerPanelSkin above:
  // portalled content sits outside `theme-${theme}`, and `dark:` follows the OS
  // rather than the app theme, so both panels have to be skinned from JS.
  const _skin = _headerPanelSkin(theme);

  const {
    APP_CONFIG, AnimatedNumber, EDGE_TTS_VOICES, FONT_OPTIONS, GEMINI_VOICES,
    GlobalMuteButton, KOKORO_VOICES, UiLanguageSelector, _isCanvasEnv, activeSessionCode,
    addToast, ai, appId, currentLevelXP,
    customExportCSS, createHomeworkAssignmentLink, dismissHelpOnboarding,
    homeworkExpiryDays, openRecentQrShares, recentQrShareCount, setHomeworkExpiryDays,
    sharedAssignmentActivity, setSharedAssignmentActivity,
    focusNarrationEnabled, generatedContent, globalLevel, globalProgress, globalXPNext,
    handleCloudToggleClick, handleExportIMS, handleExportQTI, handleRestoreView,
    handleSetActiveViewToDashboard, handleSetIsJoinPopoverOpenToFalse,
    handleSetIsTranslateModalOpenToTrue, handleSetShowExportMenuToFalse,
    handleSetShowHintsModalToTrue, handleSetShowInfoModalToTrue,
    handleSetShowSubmitModalToTrue, handleSetShowTextSettingsToFalse,
    handleSetShowVoiceSettingsToFalse, handleSetShowXPModalToTrue,
    handleToggleDisableAnimations, handleToggleFocusMode, handleToggleIsBotVisible,
    handleToggleIsHelpMode, handleToggleIsJoinPopoverOpen, handleToggleShowExportMenu,
    hasConnectedRef, hintHistory, toastHistoryCount, isBotVisible, isCloudSyncEnabled, isExtracting,
    isGeneratingSource, isHelpMode, isJoinPopoverOpen, isProcessing,
    isStudentLinkMode, isZenMode, joinAppIdInput, joinClassSession,
    joinCodeInput, languageToTTSCode, latestLessonPlan,
    leveledTextLanguage, notebookEntryCount, openExportPreview, onReturnToStart, pptxLoaded,
    resetFontSize, safeRemoveItem, selectedVoice, sessionData,
    sessionUnsubscribeRef, setActiveSessionCode, setHistory,
    setIsGateOpen, setJoinAppIdInput, setJoinCodeInput,
    setPendingRole, setRunTour, setGuidedMode, setGuidedStep, setGuidedSelectedIds,
    guidedStep, guidedMode, guidedSelectedIds, guidedCompletedIds, resetGuidedProgress,
    setSelectedVoice, setSessionData, setShowAIBackendModal,
    setBridgeSendOpen, setShowClassAnalytics, setShowEducatorHub, setShowExportMenu, setShowLearningHub, setShowNotebook, setShowReadThisPage,
    screenerSession,
    setShowSessionModal, setShowTextSettings, setShowVoiceSettings, setShowWizard,
    setSliderFontSize, setSpotlightMessage, setTourStep, setVoiceSpeed, setVoiceVolume,
    showExportMenu, showHelpOnboarding, showReadThisPage, showTextSettings,
    showVoiceSettings, sliderFontSize, startClassSession, studentAiPolicyForShare, t,
    voiceSpeed, voiceVolume,
  } = props;

  const [showSetupPathMenu, setShowSetupPathMenu] = React.useState(false);
  // Remembered per device. The compact app bar is the default: the complete
  // command surface is still one explicit "More" action away, but it no
  // longer consumes the first third of a laptop viewport on every visit.
  const [headerCollapsed, setHeaderCollapsed] = React.useState(() => {
    try {
      const saved = localStorage.getItem('allo_header_collapsed');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
      return true;
    } catch (_) { return true; }
  });
  const toggleHeaderCollapsed = React.useCallback((event) => {
    const button = event && event.currentTarget;
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.style.opacity = '0.72';
    }
    setTimeout(() => {
      const toggle = () => setHeaderCollapsed(previous => {
        const next = !previous;
        try { localStorage.setItem('allo_header_collapsed', String(next)); } catch (_) {}
        return next;
      });
      if (typeof React.startTransition === 'function') React.startTransition(toggle);
      else toggle();
    }, 40);
  }, []);
  const [voiceInputEngine, setVoiceInputEngine] = React.useState(() => {
    try {
      const shared = typeof window !== 'undefined' && window.AlloFlowVoice;
      if (shared && typeof shared.loadPreference === 'function') return shared.loadPreference().engine || 'auto';
      const parsed = JSON.parse(localStorage.getItem('alloflow_voice_pref') || '{}');
      return ['auto', 'whisper', 'webspeech', 'gemini', 'off'].includes(parsed.engine) ? parsed.engine : 'auto';
    } catch (_) { return 'auto'; }
  });
  const [geminiAudioConfigRevision, setGeminiAudioConfigRevision] = React.useState(0);
  React.useEffect(() => {
    const refreshGeminiAudioConfig = () => setGeminiAudioConfigRevision((revision) => revision + 1);
    const syncVoiceEngine = (event) => {
      const next = event && event.detail && event.detail.engine;
      if (['auto', 'whisper', 'webspeech', 'gemini', 'off'].includes(next)) setVoiceInputEngine(next);
    };
    window.addEventListener('alloflow:ai-config-changed', refreshGeminiAudioConfig);
    window.addEventListener('alloflow:student-ai-config-changed', refreshGeminiAudioConfig);
    window.addEventListener('storage', refreshGeminiAudioConfig);
    window.addEventListener('alloflow:voice-engine-changed', syncVoiceEngine);
    return () => {
      window.removeEventListener('alloflow:ai-config-changed', refreshGeminiAudioConfig);
      window.removeEventListener('alloflow:student-ai-config-changed', refreshGeminiAudioConfig);
      window.removeEventListener('storage', refreshGeminiAudioConfig);
      window.removeEventListener('alloflow:voice-engine-changed', syncVoiceEngine);
    };
  }, []);
  const geminiAudioCapability = (() => {
    void geminiAudioConfigRevision;
    try {
      if (typeof window.__alloResolveGeminiAudioCapability === 'function') {
        const resolved = window.__alloResolveGeminiAudioCapability();
        if (resolved && typeof resolved.available === 'boolean') return resolved;
      }
      // Compatibility with an older host that supplied only the audio bridge.
      return { available: typeof window.callGeminiAudio === 'function', reason: 'bridge-only' };
    } catch (_) {
      return { available: false, reason: 'configuration-unavailable' };
    }
  })();
  const canConfigureGeminiAudio = !_isCanvasEnv
    && typeof setShowAIBackendModal === 'function'
    && (isTeacherMode || !!window.__alloStudentAiSetupAllowed);
  const voiceInputDescriptions = {
    auto: 'Uses prepared on-device Whisper when available, otherwise browser speech. If browser speech is unavailable, it can prepare local Whisper. Auto never uploads microphone audio to Gemini.',
    whisper: 'Private on-device transcription. The speech model may download before the first listening session.',
    webspeech: 'Uses this browser\'s speech service. The browser may send audio to its provider.',
    gemini: 'Sends each completed spoken turn to Gemini for cloud transcription. Requires internet access and a configured Gemini key.',
    off: 'Voice input and hands-free listening stay off. Spoken output remains available.'
  };
  const chooseVoiceInputEngine = (value) => {
    const next = ['auto', 'whisper', 'webspeech', 'gemini', 'off'].includes(value) ? value : 'auto';
    setVoiceInputEngine(next);
    try {
      const shared = typeof window !== 'undefined' && window.AlloFlowVoice;
      if (shared && typeof shared.setVoiceEngine === 'function') shared.setVoiceEngine(next);
      else {
        const current = JSON.parse(localStorage.getItem('alloflow_voice_pref') || '{}');
        localStorage.setItem('alloflow_voice_pref', JSON.stringify({ ...current, engine: next }));
        localStorage.removeItem('allo_voice_engine');
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent('alloflow:voice-engine-changed', { detail: { engine: next } }));
        }
      }
      const loop = typeof window !== 'undefined' && window.__alloVoiceLoop;
      const wasListening = !!(loop && loop.isActive && loop.isActive());
      if (next === 'off') {
        if (shared && typeof shared.stopActiveVoiceSession === 'function') shared.stopActiveVoiceSession('voice-input-off');
        else if (wasListening && loop && typeof loop.stop === 'function') loop.stop();
        if (wasListening && typeof addToast === 'function') addToast(t('header.voice_input_stopped') || 'Voice input is off and the active listening session was stopped.', 'info');
      } else if (wasListening && typeof addToast === 'function') {
        addToast(t('header.voice_input_changes_next_start') || 'Voice-input changes apply the next time listening starts.', 'info');
      }
    } catch (_) {}
  };
  const openGeminiAudioConfiguration = () => {
    try { window.__alloAISettingsRequestedSection = 'gemini-audio'; } catch (_) {}
    handleSetShowVoiceSettingsToFalse();
    if (typeof setShowAIBackendModal === 'function') setShowAIBackendModal(true);
  };
  const [pollAsk, setPollAsk] = React.useState('');
  const [pollAiBusy, setPollAiBusy] = React.useState(false);
  // Fills the options box for the organizer to edit. It never shares, never
  // touches who-is-voting, and its output is clamped exactly like typing.
  const suggestPollTimes = async () => {
    const ask = String(pollAsk || '').trim();
    if (!ask || pollAiBusy) return;
    if (typeof window.callGemini !== 'function') {
      if (typeof addToast === 'function') addToast(t('header.assistant_unavailable_type_options') || 'The assistant is not available right now. You can still type the options yourself.', 'info');
      return;
    }
    setPollAiBusy(true);
    try {
      const reply = await window.callGemini(
        'A teacher is scheduling something and needs the OPTIONS for an availability poll. '
        + 'Return ONE option per line. No numbering, no bullets, no commentary, no heading. '
        + 'At most 12 lines, each under 60 characters. Write times the way a person says them and include the day. '
        + 'Do NOT convert time zones or add a time zone unless the request mentions one. '
        + 'Do not invent attendees or any other detail. Request: ' + ask
      );
      const lines = String(reply || '')
        .split(/\r?\n/)
        // Strip list markers the model adds despite being asked not to, then
        // apply the SAME clamps the config normalizer will apply anyway.
        .map(line => line.replace(/^[\s\-*\u2022]*\d*[.)]?\s*/, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 12);
      if (!lines.length) {
        if (typeof addToast === 'function') addToast(t('header.assistant_no_times') || 'The assistant did not suggest any times. Try describing the window you have in mind.', 'info');
        return;
      }
      setSharedAssignmentActivity(previous => ({ ...(previous || {}), optionsText: lines.join('\n') }));
      if (typeof addToast === 'function') addToast(t('header.suggested_options', { count: lines.length }) || ('Suggested ' + lines.length + ' options. Edit them before you share.'), 'success');
    } catch (error) {
      if (typeof addToast === 'function') addToast((t('header.suggest_times_failed') || 'Could not suggest times: {error}').replace('{error}', (error && error.message) || 'unknown'), 'error');
    } finally {
      setPollAiBusy(false);
    }
  };
  const _setupMenuRef = React.useRef(null);
  const _textSettingsRef = React.useRef(null);
  const _voiceSettingsRef = React.useRef(null);
  const _joinPopoverRef = React.useRef(null);
  const _joinTriggerRef = React.useRef(null);
  const _joinOpenAfterExpandRef = React.useRef(false);
  const _translateTriggerRef = React.useRef(null);
  const _translateA11yFrameRef = React.useRef(0);
  const _translateObserverRef = React.useRef(null);
  const _exportDialogRef = React.useRef(null);
  _headerUseFocusTrap(_setupMenuRef, showSetupPathMenu, () => setShowSetupPathMenu(false));
  _headerUseFocusTrap(_textSettingsRef, showTextSettings, handleSetShowTextSettingsToFalse);
  _headerUseFocusTrap(_voiceSettingsRef, showVoiceSettings, handleSetShowVoiceSettingsToFalse);
  _headerUseFocusTrap(_joinPopoverRef, isJoinPopoverOpen, handleSetIsJoinPopoverOpenToFalse);
  _headerUseFocusTrap(_exportDialogRef, showExportMenu, handleSetShowExportMenuToFalse);
  React.useEffect(() => {
    if (!_joinOpenAfterExpandRef.current || headerCollapsed) return;
    _joinOpenAfterExpandRef.current = false;
    try {
      if (_joinTriggerRef.current && typeof _joinTriggerRef.current.focus === 'function') {
        _joinTriggerRef.current.focus();
      }
    } catch (_) {}
    if (!isJoinPopoverOpen) handleToggleIsJoinPopoverOpen();
  }, [headerCollapsed, isJoinPopoverOpen, handleToggleIsJoinPopoverOpen]);
  // Translate is still rendered by the legacy host. Repair its exposed
  // semantics after it mounts, and remember this trigger because the host's
  // auto-focused input otherwise becomes the focus trap's "previous" node.
  const openTranslateDialogFromHeader = React.useCallback(() => {
    const trigger = _translateTriggerRef.current;
    if (typeof handleSetIsTranslateModalOpenToTrue === 'function') {
      handleSetIsTranslateModalOpenToTrue();
    }
    if (_translateObserverRef.current) {
      _translateObserverRef.current.disconnect();
      _translateObserverRef.current = null;
    }
    if (_translateA11yFrameRef.current) {
      window.cancelAnimationFrame(_translateA11yFrameRef.current);
      _translateA11yFrameRef.current = 0;
    }
    let attempts = 0;
    const repairTranslateDialog = () => {
      _translateA11yFrameRef.current = 0;
      const dialog = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).find(candidate => {
        const backdrop = candidate.parentElement;
        return backdrop?.classList?.contains('z-[300]') && !!candidate.querySelector('input[type="text"]');
      });
      if (!dialog) {
        attempts += 1;
        if (attempts < 30) {
          _translateA11yFrameRef.current = window.requestAnimationFrame(repairTranslateDialog);
        }
        return;
      }
      const backdrop = dialog.parentElement;
      if (backdrop) {
        backdrop.removeAttribute('role');
        backdrop.removeAttribute('tabindex');
      }
      const title = dialog.querySelector('h3');
      if (title) {
        title.id = 'header-translate-dialog-title';
        dialog.setAttribute('aria-labelledby', title.id);
      }
      const input = dialog.querySelector('input[type="text"]');
      const label = dialog.querySelector('label');
      if (input && label) {
        input.id = 'header-translate-target-language';
        label.htmlFor = 'header-translate-target-language';
        input.removeAttribute('aria-label');
      }
      if (typeof window.MutationObserver === 'function') {
        const observer = new window.MutationObserver(() => {
          if (dialog.isConnected) return;
          observer.disconnect();
          if (_translateObserverRef.current === observer) _translateObserverRef.current = null;
          window.requestAnimationFrame(() => {
            if (trigger?.isConnected && typeof trigger.focus === 'function') trigger.focus();
          });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        _translateObserverRef.current = observer;
      }
    };
    _translateA11yFrameRef.current = window.requestAnimationFrame(repairTranslateDialog);
  }, [handleSetIsTranslateModalOpenToTrue]);
  React.useEffect(() => () => {
    if (_translateA11yFrameRef.current) window.cancelAnimationFrame(_translateA11yFrameRef.current);
    if (_translateObserverRef.current) _translateObserverRef.current.disconnect();
  }, []);
  const returnToStartFromHeader = () => {
    setShowSetupPathMenu(false);
    if (typeof onReturnToStart === 'function') onReturnToStart();
  };
  const openQuickStartSetup = () => {
    try { if (safeRemoveItem) safeRemoveItem('allo_wizard_completed'); } catch (_) {}
    setShowSetupPathMenu(false);
    setShowWizard(true);
  };
  // Header entry used to silently reset the tour to step 0 while the LaunchPad/coach
  // entries resumed the preserved step. Now: resume when there's progress, with an
  // explicit "Start over" secondary action; fresh start otherwise.
  const _guidedHasProgress = (typeof guidedStep === 'number' && guidedStep > 0) || Array.isArray(guidedSelectedIds) || (Array.isArray(guidedCompletedIds) && guidedCompletedIds.length > 0);
  const restartGuidedModeFromHeader = () => {
    if (typeof resetGuidedProgress === 'function') resetGuidedProgress();
    else {
      if (typeof setGuidedSelectedIds === 'function') setGuidedSelectedIds(null);
      if (typeof setGuidedStep === 'function') setGuidedStep(0);
    }
    if (typeof setGuidedMode === 'function') setGuidedMode(true);
    setShowSetupPathMenu(false);
    setShowWizard(false);
    if (typeof addToast === 'function') addToast(t('guided.started_from_header') || 'Guided Mode started.', 'success');
  };
  const startGuidedModeFromHeader = () => {
    if (!_guidedHasProgress) { restartGuidedModeFromHeader(); return; }
    if (typeof setGuidedMode === 'function') setGuidedMode(true);
    setShowSetupPathMenu(false);
    setShowWizard(false);
    if (typeof addToast === 'function') addToast(t('guided.resumed') || 'Resumed your guided tutorial.', 'success');
  };
  const isDesktopBundledApp = typeof window !== 'undefined' && !!window._isDesktopBundledApp;
  const isLocalVoiceMode = ai?._ttsProvider === 'local'
    || (ai?._ttsProvider !== 'gemini' && ai?._ttsProvider !== 'browser' && (ai?.backend === 'ollama' || ai?.backend === 'localai' || ai?.backend === 'lmstudio'));
  // ── V5 (2026-08-16): Kokoro was missing from the voice list on iPhone ──
  // The picker had three branches: Canvas, "local voice mode", and everything
  // else — and the everything-else branch listed CLOUD voices only. A phone
  // browser on the hosted app is neither Canvas nor a desktop bundle, so it
  // fell into that branch and the on-device voice simply was not offered. It
  // was never an iOS exclusion or a failed capability probe; the option was
  // not rendered at all. The same branch is why the device voice could not be
  // chosen there either (V6).
  //
  // Nothing here silently omits a voice. If the browser genuinely cannot run
  // an on-device engine, the group is still shown, disabled, with the reason.
  const kokoroCapability = React.useMemo(() => {
    if (typeof window === 'undefined') return { ok: false, reason: t('header.voice_kokoro_unavailable') || 'not available here' };
    const hasWorkers = typeof window.Worker === 'function';
    const hasWasm = typeof window.WebAssembly === 'object';
    if (!hasWorkers || !hasWasm) {
      return { ok: false, reason: t('header.voice_kokoro_no_wasm') || 'this browser cannot run on-device voices' };
    }
    // iOS Safari runs it, but under a tighter memory ceiling and with storage
    // it may reclaim, so the download can be needed again later. Say so rather
    // than hiding the option or pretending it behaves like desktop.
    const ua = String(window.navigator?.userAgent || '');
    const isIOS = /iPad|iPhone|iPod/.test(ua)
      || (/Macintosh/.test(ua) && typeof window.navigator?.maxTouchPoints === 'number' && window.navigator.maxTouchPoints > 1);
    return { ok: true, isIOS };
  }, [t]);
  const canUseKokoroVoicePicker = kokoroCapability.ok;
  // Called, never mounted as <Component/>, so these cannot create a new
  // component identity on each render.
  const renderKokoroVoiceGroup = () => {
    if (!kokoroCapability.ok) {
      return (
        <optgroup label={(t('header.voice_kokoro_group') || 'On-device voice (Kokoro)') + ' (' + kokoroCapability.reason + ')'}>
          <option value="__kokoro_unavailable" disabled>{t('header.voice_kokoro_cannot_run') || 'Cannot run on this device'}</option>
        </optgroup>
      );
    }
    const ready = !!window._kokoroTTS?.ready;
    const label = ready
      ? (t('header.voice_kokoro_ready_group') || 'On-device voice (Kokoro): ready, works offline')
      : (t('header.voice_kokoro_download_group') || 'On-device voice (Kokoro): 88 MB download, then works offline');
    return (
      <optgroup label={'🎤 ' + label}>
        {KOKORO_VOICES.map(v => (
          <option key={v.id} value={v.id}>{v.label}{ready ? '' : ' ⬇'}</option>
        ))}
      </optgroup>
    );
  };
  // ── V6: the device voice is a real choice, not a consolation prize ──
  // It was labelled "Browser Fallback" in two branches and absent from the
  // third. The reason to pick it is latency: it starts speaking immediately
  // because nothing has to be generated or downloaded. The label says that
  // and says the cost, so the trade is the user's to make.
  const renderDeviceVoiceGroup = () => (
    <optgroup label={'⚡ ' + (t('header.voice_device_group') || 'Device voice: starts instantly')}>
      <option value="browser">{t('header.voice_device_option') || 'Device voice (instant, plainer sound)'}</option>
    </optgroup>
  );
  const readThisPageTitle = t('read_this_page.title') || 'Read This Page';
  const readThisPagePanelLabel = t('read_this_page.panel_aria') || (readThisPageTitle + ' panel');
  const closeLabel = t('common.close') || 'Close';
  // Read This Page still renders in the legacy host, after this modular
  // header. Its fixed 360px width clipped the narration control at 320px, and
  // its z-[45] stacking context left pointer controls underneath this z-50
  // header. Bridge those two host-owned presentation details while the panel
  // is open; the stable Read All id avoids matching unrelated complementary
  // landmarks or depending on a localized accessible name.
  React.useEffect(() => {
    if (!showReadThisPage || typeof document === 'undefined') return undefined;
    const readAllButton = document.getElementById('rtp-read-all-btn');
    const panel = readAllButton && readAllButton.closest('[role="complementary"]');
    if (!panel) return undefined;
    const previousMaxWidth = panel.style.maxWidth;
    const previousZIndex = panel.style.zIndex;
    const mutedElements = Array.from(panel.querySelectorAll('.text-slate-600'));
    const previousMutedColors = mutedElements.map(element => element.style.color);
    panel.style.maxWidth = 'calc(100vw - 2rem)';
    panel.style.zIndex = '70';
    mutedElements.forEach(element => {
      element.style.color = theme === 'contrast' ? '#fbbf24' : '#cbd5e1';
    });
    return () => {
      if (!panel.isConnected) return;
      panel.style.maxWidth = previousMaxWidth;
      panel.style.zIndex = previousZIndex;
      mutedElements.forEach((element, index) => {
        element.style.color = previousMutedColors[index];
      });
    };
  }, [showReadThisPage, theme]);
  const notebookLabel = t('cmd.open_notebook') || 'Open my notebook';
  const personalAIConnectLabel = t('header.personal_ai_connect') || 'Connect personal AI';
  const personalAIConnectedLabel = t('header.personal_ai_connected') || 'Personal AI connected';
  const personalAIReadyLabel = t('header.personal_ai_ready') || 'AI ready';
  const personalAIDisconnectLabel = t('header.personal_ai_disconnect') || 'Disconnect personal AI';
  const personalAIDisconnectDetail = t('header.personal_ai_disconnect_detail') || 'Disconnect personal AI and erase the key from this browser tab';
  const readingThemeLabelKeys = {
    default: 'reading_theme_default', warm: 'reading_theme_warm', sepia: 'reading_theme_sepia',
    dark: 'reading_theme_dark', highContrast: 'reading_theme_contrast', blue: 'reading_theme_blue',
    green: 'reading_theme_green', rose: 'reading_theme_rose', dyslexia: 'reading_theme_easy_read',
    dim: 'reading_theme_dim'
  };
  const readingThemeFallbackLabels = {
    default: 'Default', warm: 'Warm', sepia: 'Sepia', dark: 'Dark', highContrast: 'Contrast',
    blue: 'Blue', green: 'Green', rose: 'Rose', dyslexia: 'Easy Read', dim: 'Dim'
  };
  const selectedReadingThemeKey = readingThemeLabelKeys[readingTheme] || readingThemeLabelKeys.default;
  const selectedReadingThemeLabel = t('header.' + selectedReadingThemeKey)
    || readingThemeFallbackLabels[readingTheme]
    || readingThemeFallbackLabels.default;
  const readingThemeBaseOrder = ['default', 'warm', 'sepia', 'dark', 'highContrast', 'blue', 'green', 'rose', 'dyslexia', 'dim'];
  const normalizedReadingThemeFavorites = readingThemeFavorites.filter((id, index, list) => readingThemeBaseOrder.includes(id) && list.indexOf(id) === index);
  const readingThemeOrder = normalizedReadingThemeFavorites.concat(readingThemeBaseOrder.filter(id => !normalizedReadingThemeFavorites.includes(id)));
  const selectedReadingThemeIsFavorite = normalizedReadingThemeFavorites.includes(readingTheme);
  const handleReadingThemeKeyDown = (event, currentTheme) => {
    const key = event.key;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const index = Math.max(0, readingThemeOrder.indexOf(currentTheme));
    const nextIndex = key === 'Home'
      ? 0
      : key === 'End'
        ? readingThemeOrder.length - 1
        : (index + (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1) + readingThemeOrder.length) % readingThemeOrder.length;
    const next = readingThemeOrder[nextIndex];
    setReadingTheme(next);
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        const target = document.querySelector(`[data-reading-theme-option="${next}"]`);
        if (target && typeof target.focus === 'function') target.focus();
      });
    }
  };
  const piiWarningText = t('header.pii_warning');
  const compactRoleLabel = isIndependentMode
    ? (t('roles.independent') || 'Independent Learner')
    : isParentMode
      ? (t('parent_mode.label') || t('roles.parent') || 'Family Mode')
      : isTeacherMode
        ? (t('roles.teacher') || 'Teacher')
        : (t('roles.student') || 'Student');
  // X7 (2026-08-17): dashboard.title reads "Teacher Grading Dashboard" — wrong
  // words for a parent, who deliberately CAN reach this dashboard (the header
  // lets all modes in). Wording only; which dashboard renders is unchanged
  // (switching a parent to the student dashboard is an unverified behavior
  // change — W3's call, left alone).
  const dashboardNavLabel = isParentMode
    ? (t('parent_mode.dashboard_title') || t('dashboard.title_parent') || 'Family Dashboard')
    : isTeacherMode
      ? (t('dashboard.title') || 'Dashboard')
      : (t('common.progress') || 'My Learning Progress');
  const parentProgressLabel = isParentMode
    ? (t('parent_mode.progress_label') || t('common.assessment_center') || 'Child Progress')
    : (t('common.assessment_center') || 'Assessment Center');
  // Header Assessment Center slot (2026-08-23): teachers get it only while a
  // screening battery is actually live, when one-click return matters.
  const screeningLiveActive = Boolean(screenerSession && screenerSession.status !== 'complete' && !isParentMode && !isIndependentMode);
  const headerAnalyticsLabel = screeningLiveActive
    ? (t('header.screening_live') || 'Screening') + ' \u00b7 ' + Math.max(0, ((screenerSession.subtests || []).length - (screenerSession.currentIndex || 0))) + ' ' + (t('header.screening_left') || 'left')
    : parentProgressLabel;
  const compactViewFallback = String(activeView || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  const compactContextLabel = guidedMode
    ? (t('launch_pad.guided_title') || 'Guided Mode')
    : activeView === 'dashboard'
      ? dashboardNavLabel
      : activeView === 'input'
        ? (t('tools.source') || 'Source Material')
        : (compactViewFallback || (t('common.ready') || 'Ready'));
  const openJoinFromCompactHeader = () => {
    // The named, focus-trapped Join dialog lives in the full command surface.
    // Mark the handoff before expanding. The post-commit effect above focuses
    // the connected expanded trigger, then opens on the following render so
    // the shared trap captures a valid element for dismissal restoration.
    _joinOpenAfterExpandRef.current = true;
    setHeaderCollapsed(false);
    try { localStorage.setItem('allo_header_collapsed', 'false'); } catch (_) {}
  };

  return (
      <header aria-label={t('common.main_application_header')} className={`allo-premium-header ${headerCollapsed ? 'px-3 sm:px-5 md:px-6 py-px' : 'p-4 md:py-4 md:px-8'} no-print relative z-50 transition-all duration-500 w-full min-w-0 overflow-x-clip ${theme === 'contrast' ? 'bg-black border-b-4 border-yellow-400' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900 via-indigo-950 to-slate-900 text-white'}`}>
        <style>{`
          .allo-premium-header { border-bottom: 1px solid rgba(255,255,255,.14); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 12px 32px rgba(2,6,23,.18); }
          .allo-premium-header::after { content: ''; position: absolute; left: 3%; right: 3%; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(165,180,252,.55), transparent); pointer-events: none; }
          .allo-premium-header button { min-height: 44px; }
          .allo-premium-header button:focus-visible { outline: 3px solid #facc15; outline-offset: 3px; }
          .allo-premium-appbar { min-height: 68px; }
          .allo-premium-appbar-brand { display: flex; flex: 1 1 auto; align-items: center; gap: .75rem; min-width: 0; }
          .allo-premium-context-block { min-width: 0; max-width: 21rem; flex: 1 1 auto; }
          .allo-premium-context-line, .allo-premium-pii-text { overflow-wrap: anywhere; }
          .allo-premium-compact-nav { scrollbar-width: none; }
          .allo-premium-compact-nav::-webkit-scrollbar { display: none; }
          .allo-header-settings-dialog { max-height: calc(100dvh - 8rem); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
          @media (max-width: 639px) {
            .allo-premium-appbar { flex-wrap: wrap; align-content: center; column-gap: .5rem; row-gap: .375rem; padding-block: .25rem; }
            .allo-premium-appbar-brand { display: contents; }
            .allo-premium-brand-name { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
            .allo-premium-context-block { order: 99; flex: 0 0 100%; width: 100%; max-width: none; }
            .allo-header-settings-dialog { top: 5rem !important; right: .75rem !important; left: .75rem !important; width: auto !important; max-height: calc(100dvh - 6rem); padding: 1rem !important; }
            .allo-reading-theme-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .allo-reading-theme-grid .allo-reading-theme-swatch > span:last-child { overflow: visible !important; text-overflow: clip !important; white-space: normal !important; }
          }
          @media (prefers-reduced-motion: reduce) { .allo-premium-header, .allo-premium-header * { transition-duration: .01ms !important; } }
        `}</style>
        <div className="w-full max-w-[1600px] mx-auto relative">
          <div className={headerCollapsed ? 'allo-premium-appbar flex items-center gap-2 sm:gap-3 min-w-0' : 'flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4'}>
            <div className={headerCollapsed ? 'allo-premium-appbar-brand' : ''}>
              <h1 className={`${headerCollapsed ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} font-black tracking-tight flex min-w-0 shrink-0 items-center gap-3 ${theme === 'contrast' ? 'text-yellow-400' : 'text-white drop-shadow-sm'}`}>
                <span className={`inline-flex items-center justify-center ${theme === 'contrast' ? '' : `${headerCollapsed ? 'p-1 rounded-xl' : 'p-1.5 rounded-2xl'} bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-200/30`}`} aria-hidden="true">
                  <Layers className={headerCollapsed ? 'w-7 h-7' : 'w-9 h-9'} aria-hidden="true" />
                </span>
                <span className={`allo-premium-brand-name ${theme === 'contrast' ? '' : 'bg-gradient-to-r from-amber-300 via-orange-300 to-orange-400 bg-clip-text text-transparent'}`}>{t('header.app_name')}</span>
                {!headerCollapsed && <div className={`hidden 2xl:flex items-center gap-1 ml-4 p-1 rounded-full border backdrop-blur-md shadow-sm select-none pointer-events-none ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                    <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${theme === 'contrast' ? 'text-yellow-400' : 'text-green-200'}`}>
                        <CheckCircle2 size={12} className="fill-current opacity-50" aria-hidden="true" />
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{t('header.equitable')}</span>
                    </div>
                    <div className={`w-px h-3 ${theme === 'contrast' ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
                    <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${theme === 'contrast' ? 'text-yellow-400' : 'text-teal-200'}`}>
                        <CheckCircle2 size={12} className="fill-current opacity-50" aria-hidden="true" />
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{t('header.accessible')}</span>
                    </div>
                    <div className={`w-px h-3 ${theme === 'contrast' ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
                    <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${theme === 'contrast' ? 'text-yellow-400' : 'text-purple-200'}`}>
                        <CheckCircle2 size={12} className="fill-current opacity-50" aria-hidden="true" />
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-90">{t('header.scaffolded')}</span>
                    </div>
                </div>}
              </h1>
              {!headerCollapsed && (
                <p className={`mt-2 text-sm font-medium italic opacity-90 ${theme === 'contrast' ? 'text-yellow-400' : 'text-indigo-100'}`}>
                  {t('header.tagline')}
                </p>
              )}
              {headerCollapsed ? (
                <div className="allo-premium-context-block flex flex-col justify-center leading-tight">
                  <span className={`allo-premium-context-line text-[11px] font-black uppercase tracking-[.14em] ${theme === 'contrast' ? 'text-yellow-400' : 'text-indigo-100'}`}>
                    {compactRoleLabel} <span aria-hidden="true">/</span> {compactContextLabel}
                  </span>
                  <span className={`mt-1 flex min-w-0 items-start gap-1 text-[11px] font-medium ${theme === 'contrast' ? 'text-red-400' : 'text-orange-100'}`} title={piiWarningText}>
                    <AlertCircle size={11} className="mt-px shrink-0" aria-hidden="true" />
                    <span className="allo-premium-pii-text">{piiWarningText}</span>
                  </span>
                </div>
              ) : <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 text-[11px] ${theme === 'contrast' ? 'text-yellow-400' : 'px-2.5 py-0.5 rounded-xl bg-white/10 border border-white/20 text-indigo-100'}`}>
                  {t('header.rights')}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${theme === 'contrast' ? 'text-red-400' : 'px-2.5 py-0.5 rounded-xl bg-orange-400/15 border border-orange-300/30 text-orange-100'}`}>
                  <AlertCircle size={10} aria-hidden="true" /> {piiWarningText}
                </span>
                {/* Explicit and remembered. No scroll-driven shrinking: moving
                    hit targets mid-scroll is exactly the kind of thing this app
                    exists to avoid. */}
                <button
                  type="button"
                  onClick={toggleHeaderCollapsed}
                  aria-expanded={!headerCollapsed}
                  aria-label={headerCollapsed ? (t('common.expand') || 'Expand header') : (t('common.collapse') || 'Collapse header to make room for content')}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/90 hover:bg-white/20"
                >
                  {headerCollapsed ? (t('common.more_information') || 'More') : (t('common.collapse') || 'Less')}
                </button>
              </div>}
            </div>
            {headerCollapsed && (
              <div className="ml-auto min-w-0 flex items-center justify-end gap-1.5 sm:gap-2">
                <nav aria-label={t('common.content_tabs') || 'Primary navigation'} className="allo-premium-compact-nav flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain">
                  {/* Jump to the generated lesson plan. The expanded header has carried
                      this button for a while, but collapsing the header hid it — which is
                      backwards: the header gets collapsed precisely while WORKING through a
                      lesson, so the shortcut disappeared exactly when it was most wanted.
                      Shown only once a plan exists, and it keeps its label at narrower
                      widths than the other compact-nav items because "Lesson Plan" is the
                      destination a teacher, parent, or independent learner is most likely
                      hunting for. */}
                  {latestLessonPlan && (
                    <button type="button"
                      onClick={() => handleRestoreView(latestLessonPlan)}
                      data-help-key="header_jump_lesson_collapsed"
                      className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-3 transition-colors ${generatedContent?.id === latestLessonPlan.id ? 'bg-cyan-100 text-cyan-800 shadow-lg ring-2 ring-cyan-500' : 'text-white/85 hover:bg-white/10 hover:text-white'}`}
                      title={t('header.jump_to_lesson')}
                      aria-label={t('header.jump_to_lesson')}
                    >
                      <ClipboardList size={18} aria-hidden="true" />
                      <span className="hidden lg:inline text-xs font-bold">{t('header.nav_lesson_plan') || 'Lesson Plan'}</span>
                    </button>
                  )}
                  <button type="button"
                    onClick={handleSetActiveViewToDashboard}
                    data-help-key="header_dashboard"
                    className={`hidden sm:inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 transition-colors ${activeView === 'dashboard' ? 'bg-white text-indigo-900 shadow-lg' : 'text-white/85 hover:bg-white/10 hover:text-white'}`}
                    title={dashboardNavLabel}
                    aria-label={dashboardNavLabel}
                  >
                    <Layout size={18} aria-hidden="true" />
                    <span className="hidden 2xl:inline text-xs font-bold">{dashboardNavLabel}</span>
                  </button>
                  {/* NOT gated on isTeacherMode. The Learning Hub IS the learner
                      surface, and the LaunchPad "Learning Tools" card drops the user
                      into it with isTeacherMode false — so a teacher-only gate here
                      meant a learner who closed the hub had no visible way back to
                      it, only the command palette. Matches the palette's own
                      open_learning_hub, which is already roles: 'all'. */}
                  {setShowLearningHub && (
                    <button type="button"
                      onClick={() => setShowLearningHub(true)}
                      data-help-key="header_learning_hub"
                      className="hidden xl:inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-white/85 hover:bg-white/10 hover:text-white transition-colors"
                      title={t('header.learning_tools_tooltip') || 'Learning Tools (STEAM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)'}
                      aria-label={t('header.learning_tools_aria') || 'Learning Tools'}
                    >
                      <BookOpen size={18} aria-hidden="true" />
                      <span className="hidden 2xl:inline text-xs font-bold">{t('header.nav_learn') || 'Learn'}</span>
                    </button>
                  )}
                  {isTeacherMode && (
                    <button type="button"
                      onClick={() => {
                        if (APP_CONFIG._cfg_validation_key) { setPendingRole('educator_hub'); setIsGateOpen(true); }
                        else setShowEducatorHub(true);
                      }}
                      data-help-key="header_educator_hub"
                      className="hidden xl:inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-white/85 hover:bg-white/10 hover:text-white transition-colors"
                      title={t('header.educator_tools_tooltip') || 'Educator Tools (Symbol Studio, BehaviorLens, Report Writer)'}
                      aria-label={t('header.educator_tools_aria') || 'Educator Tools'}
                    >
                      <GraduationCap size={18} aria-hidden="true" />
                      <span className="hidden 2xl:inline text-xs font-bold">{t('header.nav_tools') || 'Tools'}</span>
                    </button>
                  )}
                  {!isTeacherMode && (
                    <button type="button"
                      onClick={() => { try { window.dispatchEvent(new window.CustomEvent('alloflow:open-command-palette')); } catch (_) {} }}
                      data-help-key="header_student_actions"
                      className="hidden sm:inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 text-white shadow-lg shadow-teal-900/20 hover:bg-teal-800 transition-colors"
                      title={t('student.actions') || 'Student actions'}
                      aria-label={t('student.actions') || 'Open student actions'}
                    >
                      <Sparkles size={18} aria-hidden="true" />
                      <span className="hidden 2xl:inline text-xs font-bold">{t('student.actions') || 'Student actions'}</span>
                    </button>
                  )}
                </nav>
                {isTeacherMode && !isIndependentMode && !isParentMode && (
                  <button type="button"
                    onClick={() => activeSessionCode ? setShowSessionModal(true) : startClassSession()}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black border transition-colors ${activeSessionCode ? 'bg-emerald-600 text-white border-emerald-300' : 'bg-white text-indigo-950 border-white shadow-lg hover:bg-indigo-50'}`}
                    data-help-key="header_session_start"
                    title={t('session.start_tooltip')}
                    aria-label={activeSessionCode ? (t('header.live_session_code', { code: activeSessionCode }) || `Live: ${activeSessionCode}`) : (t('session.start') || t('common.connect'))}
                  >
                    <Wifi size={16} aria-hidden="true" />
                    <span className="hidden lg:inline">{activeSessionCode ? (t('header.live_session_code', { code: activeSessionCode }) || `Live: ${activeSessionCode}`) : t('session.start')}</span>
                  </button>
                )}
                {!isTeacherMode && !activeSessionCode && (
                  <button type="button"
                    ref={_joinTriggerRef}
                    onClick={openJoinFromCompactHeader}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/20 transition-colors"
                    data-help-key="header_session_join"
                    title={t('session.join_tooltip')}
                    aria-haspopup="dialog"
                    aria-expanded={isJoinPopoverOpen}
                  >
                    <WifiOff size={16} aria-hidden="true" />
                    <span className="hidden lg:inline">{t('session.join')}</span>
                  </button>
                )}
                {!isTeacherMode && activeSessionCode && (
                  <span role="status" className="hidden md:inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-600 px-3 text-xs font-black text-white">
                    <Wifi size={16} className="animate-pulse motion-reduce:animate-none" aria-hidden="true" /> {t('header.live_session') || 'Live:'} {activeSessionCode}
                  </span>
                )}
                {isTeacherMode && (
                  <button type="button"
                    onClick={() => setShowSetupPathMenu(true)}
                    data-help-key="header_rerun_wizard"
                    className="hidden sm:inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/20 transition-colors"
                    title={t('toolbar.start_setup') || 'Start & setup'}
                    aria-label={t('toolbar.start_setup_aria') || 'Open Start and setup options'}
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    <span className="max-w-[10rem] truncate">{t('toolbar.start_setup') || 'Start & setup'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleHeaderCollapsed}
                  aria-expanded={!headerCollapsed}
                  aria-label={t('common.expand') || 'Expand header'}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 text-xs font-black text-white hover:bg-white/20 transition-colors"
                >
                  <span>{t('common.more_information') || 'More'}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </div>
            )}
            {/* Compact keeps context, primary destinations, session status, and
                Setup visible while the dense settings/utility surface unmounts.
                Every capability returns via the persisted More/Less toggle; no
                control moves in response to scrolling. */}
            {!headerCollapsed && (
            <div className="flex flex-col items-stretch sm:items-end gap-4 w-full lg:w-auto min-w-0">
                <div className="w-full flex items-center gap-2 sm:gap-4 flex-wrap justify-start sm:justify-end relative min-w-0">
                    <button type="button"
                        onClick={handleSetShowXPModalToTrue}
                        data-help-key="xp_modal_trigger"
                        className={`relative z-[60] flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-xl border shadow-inner transition-all hover:scale-105 active:scale-95 cursor-pointer ${theme === 'contrast' ? 'border-yellow-400 bg-black text-yellow-400' : 'bg-yellow-400/20 border-yellow-200/50 text-yellow-100 hover:bg-yellow-400/30'}`}
                        title={t('header.xp_badge_tooltip')}
                    >
                        <div className="bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center text-indigo-900 font-black text-xs border-2 border-indigo-900/20 shadow-sm">
                            {globalLevel}
                        </div>
                        <div className="flex flex-col items-start min-w-[70px]">
                             <span className="text-[11px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">{t('header.next_level')}</span>
                             <div className="w-full flex justify-between text-[11px] font-mono leading-none mb-1 font-bold opacity-90">
                                <span><AnimatedNumber value={currentLevelXP} /></span>
                                <span className="opacity-60">/{globalXPNext}</span>
                             </div>
                             <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden border border-white/10">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${globalProgress}%` }}
                                ></div>
                             </div>
                        </div>
                    </button>
                    <div id="tour-header-settings" className={`relative z-[60] w-full sm:w-auto flex flex-wrap items-center justify-start sm:justify-end gap-2 p-2 rounded-2xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        <GlobalMuteButton
                            className={`px-3 py-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                            muteLabel={t('a11y.mute_all_audio') || 'Mute all audio'}
                            unmuteLabel={t('a11y.unmute_all_audio') || 'Unmute all audio'}
                            muteTitle={t('a11y.mute_all_audio_title') || 'Mute all audio'}
                            unmuteTitle={t('a11y.unmute_all_audio_title') || 'Unmute all audio'}
                        />
                        <button type="button"
                            onClick={() => setShowReadThisPage(prev => !prev)}
                            data-help-key="read_this_page_toggle"
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${showReadThisPage || focusNarrationEnabled ? 'ring-2 ring-purple-400 !bg-purple-600 !text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : ''} ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                            title={showReadThisPage ? (closeLabel + ': ' + readThisPageTitle) : readThisPageTitle}
                            aria-label={showReadThisPage ? (closeLabel + ': ' + readThisPagePanelLabel) : readThisPagePanelLabel}
                        >
                            <Ear size={18} aria-hidden="true" className={showReadThisPage ? 'animate-pulse' : ''} />
                        </button>
                        <div className="relative">
                            <button type="button"
                                onClick={() => { setShowTextSettings(!showTextSettings); setShowVoiceSettings(false); }}
                                data-help-key="header_settings_text"
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                                title={t('immersive.settings_label')}
                                aria-label={t('immersive.settings_label')}
                                aria-haspopup="dialog"
                                aria-expanded={showTextSettings}
                            >
                                <Type size={18} aria-hidden="true"/>
                                <span className="text-xs font-bold hidden xl:inline">{t('immersive.label_text')}</span>
                                {showTextSettings ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            {showTextSettings && _headerPortal(
                                <>
                                    <div aria-hidden="true" className="fixed inset-0 z-[10000]" onClick={handleSetShowTextSettingsToFalse}></div>
                                    <div ref={_textSettingsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="header-text-settings-title" className={`allo-header-settings-dialog fixed top-28 right-20 w-72 p-5 rounded-xl shadow-2xl border z-[10001] animate-in fade-in zoom-in-95 motion-reduce:animate-none duration-200 ${_skin.panel}`}>
                                        <div className="space-y-5">
                                            <div className={`flex justify-between items-center border-b ${_skin.divider} pb-2`}>
                                                <h4 id="header-text-settings-title" className="font-bold text-sm">{t('settings.text.header')}</h4>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={resetFontSize} data-help-key="header_settings_text_reset" className={`text-[11px] font-bold flex items-center gap-1 ${_skin.action}`}><RefreshCw size={10}/> {t('common.reset')}</button>
                                                    <button type="button" onClick={handleSetShowTextSettingsToFalse} className={`min-w-6 min-h-6 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${_skin.dismiss}`} aria-label={t('common.close') || 'Close text settings'}>&times;</button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="header-text-font-family" className={`text-xs font-bold flex items-center gap-1 ${_skin.label}`}>{t('settings.text.font_family')}</label>
                                                <select id="header-text-font-family"
                                                    value={selectedFont}
                                                    onChange={(e) => setSelectedFont(e.target.value)}
                                                    data-help-key="header_settings_text_font"
                                                    className={`w-full text-sm p-2.5 rounded-lg border ${_skin.field} focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                                                >
                                                    {FONT_OPTIONS.map((font) => (
                                                        <option key={font.id} value={font.id}>{font.label}</option>
                                                    ))}
                                                </select>
                                                <p className={`text-[11px] p-2 rounded ${_skin.surface} ${FONT_OPTIONS.find(f => f.id === selectedFont)?.cssClass || ''}`}>
                                                    {t('settings.text.font_preview')} {t('settings.text.font_preview_sample')}
                                                </p>
                                            </div>
                                            <button type="button"
                                                aria-label={t('common.toggle_focus_mode')}
                                                onClick={handleToggleFocusMode}
                                                data-help-key="header_settings_text_bionic"
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all group ${focusMode ? _skin.accent : `${_skin.surface} border-transparent hover:border-slate-300`}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md ${focusMode ? 'bg-indigo-500 text-white' : _skin.chip}`}>
                                                        <Eye size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="block text-xs font-bold">{t('settings.text.bionic')}</span>
                                                        <span className="block text-[11px]">{t('settings.text.bionic_sub')}</span>
                                                    </div>
                                                </div>
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${focusMode ? 'bg-indigo-500' : theme === 'contrast' ? 'bg-yellow-400' : 'bg-slate-500'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${focusMode ? 'left-6' : 'left-1'}`}></div>
                                                </div>
                                            </button>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="header-text-font-size" className={`text-xs font-bold flex items-center gap-1 ${_skin.label}`}>{t('settings.text.size')}</label>
                                                    <span className={`text-[11px] font-mono ${_skin.chip} px-1.5 py-0.5 rounded`}>{baseFontSize}px</span>
                                                </div>
                                            <div className="flex items-center gap-3" data-help-key="header_settings_text_size">
                                                    <button type="button" aria-label={t('common.minimize')} onClick={() => { setBaseFontSize(Math.max(12, baseFontSize - 1)); setSliderFontSize(Math.max(12, baseFontSize - 1)); }} className={`p-2.5 rounded-lg transition-colors ${_skin.ghost}`}><Minimize size={16}/></button>
                                                    <input id="header-text-font-size"
                                                        type="range" min="12" max="24" step="1"
                                                        value={sliderFontSize}
                                                        onChange={(e) => setSliderFontSize(parseInt(e.target.value))}
                                                        onMouseUp={() => setBaseFontSize(sliderFontSize)}
                                                        onTouchEnd={() => setBaseFontSize(sliderFontSize)}
                                                        className="flex-grow h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                    />
                                                    <button type="button" aria-label={t('common.maximize')} onClick={() => { setBaseFontSize(Math.min(24, baseFontSize + 1)); setSliderFontSize(Math.min(24, baseFontSize + 1)); }} className={`p-2.5 rounded-lg transition-colors ${_skin.ghost}`}><Maximize size={16}/></button>
                                                </div>
                                            </div>
                                            <div className={`border-t ${_skin.divider} pt-3 mt-3`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="header-text-line-height" className={`text-xs font-bold flex items-center gap-1 ${_skin.label}`}>{t('settings.text.line_height')}</label>
                                                    <span className={`text-[11px] font-mono ${_skin.chip} px-1.5 py-0.5 rounded`}>{lineHeight}</span>
                                                </div>
                                                <input id="header-text-line-height"
                                                    type="range" min="1.0" max="2.5" step="0.1"
                                                    value={lineHeight}
                                                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                                                    data-help-key="header_settings_text_line_height"
                                                    className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="header-text-letter-spacing" className={`text-xs font-bold flex items-center gap-1 ${_skin.label}`}>{t('settings.text.spacing')}</label>
                                                    <span className={`text-[11px] font-mono ${_skin.chip} px-1.5 py-0.5 rounded`}>{letterSpacing}em</span>
                                                </div>
                                                <input id="header-text-letter-spacing"
                                                    type="range" min="0" max="0.2" step="0.01"
                                                    value={letterSpacing}
                                                    onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                                                    data-help-key="header_settings_text_spacing"
                                                    className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                            {/* ── Reading Theme Swatches ── */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className={`text-xs font-bold flex items-center gap-1 ${_skin.label}`}>{t('settings.reading_theme') || '🎨 Reading Theme'}</label>
                                                    <span aria-live="polite" className={`text-[11px] font-mono ${_skin.chip} px-1.5 py-0.5 rounded`}>{selectedReadingThemeLabel}</span>
                                                </div>
                                                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} mb-2`}>{t('settings.reading_theme_desc') || 'Background & text color for all content views'} {t('settings.reading_theme_scope') || 'Changes lesson colors only; your app theme stays the same.'}</p>
                                                <div className="allo-reading-theme-grid grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('header.reading_theme_aria') || 'Reading theme'}>
                                                    {[
                                                        { id: 'default', label: t('header.reading_theme_default') || 'Default', bg: '#ffffff', fg: '#1e293b', border: '#64748b', focus: '#4f46e5', emoji: '○' },
                                                        { id: 'warm', label: t('header.reading_theme_warm') || 'Warm', bg: '#fdcba5', fg: '#432714', border: '#a85b2f', focus: '#1d4ed8', emoji: '☀️' },
                                                        { id: 'sepia', label: t('header.reading_theme_sepia') || 'Sepia', bg: '#d1bfa9', fg: '#2a1f13', border: '#7f5e3d', focus: '#174ea6', emoji: '📜' },
                                                        { id: 'dark', label: t('header.reading_theme_dark') || 'Dark', bg: '#1a1a2e', fg: '#e2e8f0', border: '#7979ab', focus: '#fbbf24', emoji: '🌙' },
                                                        { id: 'highContrast', label: t('header.reading_theme_contrast') || 'Contrast', bg: '#000000', fg: '#ffff00', border: '#ffff00', focus: '#ffff00', emoji: '◼️' },
                                                        { id: 'blue', label: t('header.reading_theme_blue') || 'Blue', bg: '#b9dbf4', fg: '#16304b', border: '#3b78a5', focus: '#174ea6', emoji: '💧' },
                                                        { id: 'green', label: t('header.reading_theme_green') || 'Green', bg: '#caeccf', fg: '#123f21', border: '#3b7f4c', focus: '#1455a5', emoji: '🌿' },
                                                        { id: 'rose', label: t('header.reading_theme_rose') || 'Rose', bg: '#f9c8d8', fg: '#561530', border: '#a7476b', focus: '#174ea6', emoji: '🌸' },
                                                        { id: 'dyslexia', label: t('header.reading_theme_easy_read') || 'Easy Read', bg: '#f4ebbe', fg: '#3f3b31', border: '#8d7621', focus: '#174ea6', emoji: '🔤' },
                                                        { id: 'dim', label: t('header.reading_theme_dim') || 'Dim', bg: '#adb3bd', fg: '#000000', border: '#46505d', focus: '#1d4ed8', emoji: '🌫️' },
                                                    ].sort(function(a, b) { return readingThemeOrder.indexOf(a.id) - readingThemeOrder.indexOf(b.id); }).map(function(th) {
                                                        var isActive = readingTheme === th.id;
                                                        return <button type="button" key={th.id}
                                                            role="radio" aria-checked={isActive} aria-label={th.label}
                                                            aria-posinset={readingThemeOrder.indexOf(th.id) + 1}
                                                            aria-setsize={10}
                                                            tabIndex={isActive ? 0 : -1}
                                                            data-reading-theme-option={th.id}
                                                            onClick={() => setReadingTheme(th.id)}
                                                            onKeyDown={(event) => handleReadingThemeKeyDown(event, th.id)}
                                                            title={th.label}
                                                            className={`allo-reading-theme-swatch flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all border-2 cursor-pointer ${isActive ? 'scale-105' : 'hover:scale-105'}`}
                                                            style={{
                                                                '--allo-reading-swatch-bg': th.bg,
                                                                '--allo-reading-swatch-fg': th.fg,
                                                                '--allo-reading-swatch-border': th.border,
                                                                '--allo-reading-swatch-focus': th.focus,
                                                            }}
                                                        >
                                                            <span className="text-sm leading-none">{th.emoji}</span>
                                                            <span className="text-[11px] font-bold leading-none">{th.label}</span>
                                                        </button>;
                                                    })}
                                                </div>
                                                {typeof toggleReadingThemeFavorite === 'function' && (
                                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                        <button type="button"
                                                            onClick={() => toggleReadingThemeFavorite(readingTheme)}
                                                            aria-pressed={selectedReadingThemeIsFavorite}
                                                            className={`min-h-9 rounded-lg border px-3 text-xs font-bold transition-colors motion-reduce:transition-none ${selectedReadingThemeIsFavorite ? (theme === 'contrast' ? 'border-yellow-400 bg-yellow-400 text-black' : theme === 'dark' ? 'border-amber-400 bg-amber-950 text-amber-100' : 'border-amber-500 bg-amber-100 text-amber-950') : (_skin.field + ' hover:border-amber-500')}`}
                                                        >
                                                            {selectedReadingThemeIsFavorite ? '★ Favorite' : '☆ Favorite this theme'}
                                                        </button>
                                                        <span aria-live="polite" className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                                                            {readingThemePreferenceScope
                                                                ? `Saved for ${readingThemePreferenceScope} when this live class syncs.`
                                                                : (normalizedReadingThemeFavorites.length ? `${normalizedReadingThemeFavorites.length} favorite${normalizedReadingThemeFavorites.length === 1 ? '' : 's'} saved on this device.` : 'Favorites appear first in this picker.')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="relative">
                            <button type="button"
                                onClick={() => { setShowVoiceSettings(!showVoiceSettings); setShowTextSettings(false); }}
                                data-help-key="header_settings_voice"
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                                title={t('settings.voice.label')}
                                aria-label={t('settings.voice.label')}
                                aria-haspopup="dialog"
                                aria-expanded={showVoiceSettings}
                            >
                                <Headphones size={18} aria-hidden="true"/>
                                <span className="text-xs font-bold hidden xl:inline">{t('immersive.label_voice')}</span>
                                {showVoiceSettings ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            {showVoiceSettings && _headerPortal(
                                <>
                                    <div aria-hidden="true" className="fixed inset-0 z-[10000]" onClick={handleSetShowVoiceSettingsToFalse}></div>
                                    <div ref={_voiceSettingsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="header-voice-settings-title" className={`allo-header-settings-dialog fixed top-28 right-4 w-64 p-5 rounded-xl shadow-2xl border z-[10001] animate-in fade-in zoom-in-95 motion-reduce:animate-none duration-200 ${_skin.panel}`}>
                                        <div className="space-y-3">
                                            <div className={`flex justify-between items-center border-b ${_skin.divider} pb-2`}>
                                                <h4 id="header-voice-settings-title" className="font-bold text-sm">{t('settings.voice.label')}</h4>
                                                <button type="button" onClick={handleSetShowVoiceSettingsToFalse} className={`min-w-6 min-h-6 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${_skin.dismiss}`} aria-label={t('common.close') || 'Close voice and audio settings'}>&times;</button>
                                            </div>
                                            <div className={`rounded-lg border p-2 ${_skin.surface}`}>
                                                <label htmlFor="header-voice-input-engine" className={`text-[11px] uppercase font-bold ${_skin.label} block mb-1`}>{t('header.voice_input') || 'Voice input'}</label>
                                                <select
                                                    id="header-voice-input-engine"
                                                    aria-describedby="header-voice-input-engine-help"
                                                    value={voiceInputEngine}
                                                    onChange={(event) => chooseVoiceInputEngine(event.target.value)}
                                                    className={`w-full text-xs p-2 rounded-lg border ${_skin.field} focus:ring-2 focus:ring-indigo-500 outline-none`}
                                                >
                                                    <option value="auto">{t('header.voice_engine_auto') || 'Auto (private-first)'}</option>
                                                    <option value="whisper">{t('header.voice_engine_whisper') || 'On-device Whisper'}</option>
                                                    <option value="webspeech">{t('header.voice_engine_webspeech') || 'Browser speech service'}</option>
                                                    <option value="gemini">{t('header.voice_engine_gemini') || 'Gemini cloud transcription'}</option>
                                                    <option value="off">{t('header.voice_engine_off') || 'Off'}</option>
                                                </select>
                                                <p id="header-voice-input-engine-help" className={`mt-1 text-[11px] leading-tight ${_skin.label}`}>{voiceInputDescriptions[voiceInputEngine]}</p>
                                                {voiceInputEngine === 'gemini' && !geminiAudioCapability.available && (
                                                  <div role="status" aria-live="polite" className={`mt-2 rounded-lg border p-2 ${_skin.note}`}>
                                                    <p className={`text-[11px] font-bold leading-tight ${_skin.noteHead}`}>
                                                      {canConfigureGeminiAudio
                                                         ? (t('header.gemini_key_missing') || 'Gemini transcription is selected, but no Gemini cloud-services key is configured.')
                                                         : (t('header.gemini_unavailable_activity') || 'Gemini cloud transcription is unavailable in this activity.')}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                      {canConfigureGeminiAudio && (
                                                        <button type="button" onClick={openGeminiAudioConfiguration} data-help-key="header_voice_configure_gemini" className="rounded-md bg-sky-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                                                          {t('header.configure_gemini_access') || 'Configure Gemini access'}
                                                        </button>
                                                      )}
                                                      <button type="button" onClick={() => chooseVoiceInputEngine('auto')} className={`rounded-md border px-2 py-1 text-[11px] font-bold ${_skin.field}`}>
                                                         {t('header.use_auto_instead') || 'Use Auto instead'}
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                            <div>
                                                <label htmlFor="header-spoken-output-voice" className={`text-[11px] uppercase font-bold ${_skin.label} block mb-1`}>{t('header.spoken_output_voice') || 'Spoken-output voice'}</label>
                                                <select id="header-spoken-output-voice"
                                                    value={selectedVoice}
                                                    onChange={(e) => {
                                                      const voice = e.target.value;
                                                      if (voice === '__kokoro_unavailable') return;
                                                      setSelectedVoice(voice);
                                                      if (canUseKokoroVoicePicker && KOKORO_VOICES.some(v => v.id === voice) && !window._kokoroTTS?.ready && window.__loadKokoroTTS) {
                                                        // Choosing the voice IS the consent to download it. Nothing
                                                        // else on a phone may start this fetch; see the off-desktop
                                                        // guard in callTTS.
                                                        window.__kokoroTTSDownloading = true;
                                                        window.__kokoroLoadUserInitiated = true;
                                                        addToast(
                                                          kokoroCapability.isIOS
                                                            ? (t('header.voice_kokoro_downloading_ios') || 'Getting the on-device voice (88 MB). It reads offline afterwards, though this browser may ask for it again after a few weeks unused.')
                                                            : (t('header.voice_kokoro_downloading') || 'Getting the on-device voice (88 MB, one time). You can keep working.'),
                                                          'info'
                                                        );
                                                        window.__loadKokoroTTS().then(ok => {
                                                          window.__kokoroTTSDownloading = false;
                                                          window.__kokoroLoadUserInitiated = false;
                                                          if (ok) addToast(t('header.voice_kokoro_ready_toast') || 'On-device voice ready. It is saved on this device.', 'success');
                                                          else addToast(t('header.voice_kokoro_failed_toast') || 'The on-device voice could not be prepared. Another voice will read for now.', 'error');
                                                        });
                                                      }
                                                    }}
                                                    data-help-key="header_settings_voice_select"
                                                    className={`w-full text-xs p-2 rounded-lg border ${_skin.field} focus:ring-2 focus:ring-indigo-500 outline-none`}
                                                >
                                                    {_isCanvasEnv ? (
                                                        <>
                                                            <optgroup label={'✨ ' + (t('header.voice_cloud_group') || 'Cloud voice (Gemini): most natural, needs the internet')}>
                                                                {GEMINI_VOICES.slice(0, 15).map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label || v.id}</option>
                                                                ))}
                                                            </optgroup>
                                                            {renderKokoroVoiceGroup()}
                                                            {renderDeviceVoiceGroup()}
                                                        </>
                                                    ) : isLocalVoiceMode ? (
                                                        <>
                                                            {renderKokoroVoiceGroup()}
                                                            <optgroup label={t('header.edge_tts_voices') || '🎤 Edge TTS Voices'}>
                                                                {EDGE_TTS_VOICES.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label}</option>
                                                                ))}
                                                            </optgroup>
                                                            {renderDeviceVoiceGroup()}
                                                        </>
                                                    ) : (
                                                        /* Every other surface — the hosted web app, which is what a
                                                           phone loads. This branch used to be cloud voices only. */
                                                        <>
                                                            <optgroup label={'✨ ' + (t('header.voice_cloud_group') || 'Cloud voice (Gemini): most natural, needs the internet')}>
                                                                {GEMINI_VOICES.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label}</option>
                                                                ))}
                                                            </optgroup>
                                                            {renderKokoroVoiceGroup()}
                                                            {renderDeviceVoiceGroup()}
                                                        </>
                                                    )}
                                                </select>
                                                {/* ── Kokoro model info (2026-07-06): the old Fast(q4)/High(q8)
                                                    toggle was retired — the q4 file is really ~291MB (not 43MB),
                                                    sounds worse, and benched no faster on wasm CPU. One honest
                                                    tier now: q8, ~88MB, downloaded once + cached on device. ── */}
                                                {canUseKokoroVoicePicker && selectedVoice && selectedVoice.includes('_') && window._kokoroTTS && (
                                                    <div className={`mt-2 p-2 rounded-lg border ${_skin.surface}`}>
                                                        <p className="text-[11px] m-0">
                                                            <span className="font-bold">{t('header.voice_model_label') || 'Voice model'}:</span>{' '}
                                                            {window._kokoroTTS.ready
                                                                ? (t('header.voice_model_ready') || 'Kokoro (~88MB) — ready on this device. Downloaded once; reads offline.')
                                                                : (t('header.voice_model_preparing') || 'Kokoro (~88MB) — preparing… a temporary voice reads aloud until it finishes.')}
                                                        </p>
                                                    </div>
                                                )}
                                                {/* ── Browser-TTS Fallback Toggle ──
                                                    When Gemini refuses a sentence or exhausts retries, fall back to the
                                                    system voice instead of skipping. Default off because the system voice
                                                    sounds jarring next to Gemini. */}
                                                <div className={`mt-2 p-2 rounded-lg border ${_skin.surface}`}>
                                                    <label className="flex items-start gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 accent-indigo-600"
                                                            defaultChecked={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').browserTtsFallback !== false; } catch { return true; } })()}
                                                            onChange={(e) => {
                                                                try {
                                                                    const cur = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                                                                    localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...cur, browserTtsFallback: e.target.checked }));
                                                                } catch {}
                                                            }}
                                                            aria-label={t('header.browser_tts_fallback_aria') || 'Use browser voice as fallback when Gemini TTS refuses or fails'}
                                                        />
                                                        <span className="text-[11px] leading-tight">
                                                            <span className="font-bold block">{t('header.browser_tts_fallback_label') || 'Browser-voice fallback'}</span>
                                                            <span className="opacity-80">{t('header.browser_tts_fallback_desc') || 'Read refused/failed sentences with the system voice instead of skipping.'}</span>
                                                        </span>
                                                    </label>
                                                </div>
                                                {/* ── Non-English Language TTS Indicator ── */}
                                                {/* Shown on every surface, not only Canvas: the language cascade is
                                                    the same everywhere and a teacher working in Spanish on the web
                                                    app needs the same answer.

                                                    This used to claim "Piper Neural Voice, auto-selected" whenever
                                                    supportsLanguage() was true, which only says a voice EXISTS in
                                                    the table, not that it has been downloaded. In the build before
                                                    2026-08-16, seven of those table entries pointed at models that
                                                    do not exist at all, Spanish among them. Report the three states
                                                    separately instead. */}
                                                {leveledTextLanguage && leveledTextLanguage !== 'English' && (
                                                    <div className={`mt-2 p-2 rounded-lg border ${_skin.note}`}>
                                                        <div className={`text-[11px] uppercase font-bold ${_skin.noteHead}`}>{t('header.voice_active_language') || 'Reading language'}: {leveledTextLanguage}</div>
                                                        <div className={`text-[11px] ${_skin.noteBody} mt-0.5`}>
                                                            {!window._piperTTS?.supportsLanguage(languageToTTSCode(leveledTextLanguage))
                                                                ? (t('header.voice_lang_no_offline') || 'Cloud voice, then the device voice. There is no offline voice for this language yet.')
                                                                : window._piperTTS?.isLanguageReady?.(languageToTTSCode(leveledTextLanguage))
                                                                    ? (t('header.voice_lang_offline_ready') || 'An offline voice for this language is saved on this device.')
                                                                    : (t('header.voice_lang_offline_on_demand') || 'Cloud voice first. An offline voice for this language downloads the first time it is needed.')}
                                                        </div>
                                                        <div className={`text-[11px] ${_skin.noteHead} mt-0.5`}>{t('header.kokoro_english_only') || 'Kokoro voice applies to English content'}</div>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 mt-3">
                                                    <div className="flex-1">
                                                        <label htmlFor="header-voice-speed" className={`text-[11px] uppercase font-bold ${_skin.label} block mb-1`}>{t('header.voice_speed') || 'Speed'}: {voiceSpeed}x</label>
                                                        <input id="header-voice-speed"
                                                            type="range"
                                                            min="0.5"
                                                            max="2"
                                                            step="0.1"
                                                            value={voiceSpeed}
                                                            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                                            data-help-key="header_settings_voice_speed"
                                                            className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label htmlFor="header-voice-volume" className={`text-[11px] uppercase font-bold ${_skin.label} block mb-1`}>{t('header.voice_volume') || 'Volume'}: {Math.round(voiceVolume * 100)}%</label>
                                                        <input id="header-voice-volume"
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.1"
                                                            value={voiceVolume}
                                                            onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                                                            data-help-key="header_settings_voice_volume"
                                                            className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const testVoice = typeof window !== 'undefined' && window.__alloTestVoice;
                                                        if (typeof testVoice === 'function') testVoice();
                                                    }}
                                                    disabled={!(typeof window !== 'undefined' && typeof window.__alloTestVoice === 'function')}
                                                    className={`mt-3 w-full min-h-9 rounded-lg border px-3 py-2 text-xs font-bold ${_skin.surface} ${_skin.action} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    aria-label={t('header.voice_test_aria') || 'Test the selected voice and audio output'}
                                                >
                                                    {t('header.voice_test') || 'Test voice'}
                                                </button>
                                                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} mt-2 italic leading-tight`}>
                                                    {t('settings.voice.helper')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="w-px h-6 bg-white/20 mx-1"></div>
                        <button type="button"
                          onClick={handleToggleDisableAnimations}
                          data-help-key="header_settings_anim"
                          className={`p-2 rounded-xl transition-all flex items-center gap-2 ${disableAnimations ? 'bg-red-700 text-white shadow-lg' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                          title={disableAnimations ? t('a11y.anim_enable') : t('a11y.anim_disable')}
                          aria-label={t('a11y.anim_toggle')}
                        >
                          {disableAnimations ? <ZapOff size={20} aria-hidden="true" /> : <Zap size={20} aria-hidden="true" />}
                        </button>
                        <button type="button"
                          onClick={toggleTheme}
                          data-help-key="header_settings_theme"
                          className={`p-2 rounded-xl transition-all flex items-center gap-2 ${
                              theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' :
                              theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-500 text-yellow-300 shadow-lg shadow-indigo-500/50' :
                              'bg-yellow-400 text-black hover:bg-yellow-300'
                          }`}
                          title={`${t('settings.theme')}: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
                          aria-label={t('a11y.theme_toggle')}
                        >
                          {theme === 'light' && <Sun size={20} aria-hidden="true" />}
                          {theme === 'dark' && <Moon size={20} aria-hidden="true" />}
                          {theme === 'contrast' && <Eye size={20} aria-hidden="true" />}
                        </button>
                        <button type="button"
                          onClick={toggleOverlay}
                          data-help-key="header_settings_overlay"
                          className={`p-2 rounded-xl transition-all flex items-center gap-2 ${colorOverlay !== 'none' ? 'bg-white text-indigo-900 shadow-lg' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                          title={`${t('settings.overlay')}: ${colorOverlay}`}
                          aria-label={t('a11y.overlay_toggle')}
                        >
                          <Palette size={20} aria-hidden="true" />
                        </button>
                    </div>
                    <div id="tour-header-tools" className={`relative z-40 flex items-center gap-2 p-2 rounded-2xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        {!isStudentLinkMode && !isIndependentMode && (
                            <button type="button"
                              onClick={() => {
                                  if (!isTeacherMode && APP_CONFIG._cfg_validation_key) {
                                      setPendingRole('toggle_view');
                                      setIsGateOpen(true);
                                  } else {
                                      setIsTeacherMode(!isTeacherMode);
                                  }
                              }}
                              data-help-key={isTeacherMode ? "header_view_student" : "header_view_teacher"}
                              className={`p-2 rounded-xl transition-all flex items-center gap-2 ${isTeacherMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-teal-700 hover:bg-teal-700 text-white shadow-lg shadow-teal-700/30'}`}
                              title={isTeacherMode ? t('header.view_student') : t('header.view_teacher')}
                              aria-label={isTeacherMode ? t('header.view_student') : t('header.view_teacher')}
                            >
                              {isTeacherMode ? <School size={20} /> : <GraduationCap size={20} />}
                            </button>
                        )}
                        {true /* all modes see dashboard */ && (
                            <>
                                <button type="button"
                                  onClick={handleSetActiveViewToDashboard}
                                  data-help-key="header_dashboard"
                                  className={`p-2 rounded-xl transition-all flex items-center gap-2 ${activeView === 'dashboard' ? 'bg-white text-indigo-900 shadow-lg' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                                  title={dashboardNavLabel}
                                  aria-label={dashboardNavLabel}
                                >
                                  <Layout size={20} />
                                </button>
                                {!isTeacherMode && (
                                    <button type="button"
                                        onClick={() => { try { window.dispatchEvent(new window.CustomEvent('alloflow:open-command-palette')); } catch (_) {} }}
                                        data-help-key="header_student_actions"
                                        className="p-2 rounded-xl transition-all flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white shadow-lg shadow-teal-900/20"
                                        title={t('student.actions') || 'Student actions'}
                                        aria-label={t('student.actions') || 'Open student actions'}
                                    >
                                        <Sparkles size={20} aria-hidden="true" />
                                    </button>
                                )}
                                {latestLessonPlan && (
                                    <button type="button"
                                        onClick={() => handleRestoreView(latestLessonPlan)}
                                        data-help-key="header_jump_lesson"
                                        className={`p-2 rounded-xl transition-all flex items-center gap-2 ${generatedContent?.id === latestLessonPlan.id ? 'bg-cyan-100 text-cyan-800 shadow-lg ring-2 ring-cyan-500' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                                        title={t('header.jump_to_lesson')}
                                        aria-label={t('header.jump_to_lesson')}
                                    >
                                        <ClipboardList size={20} />
                                    </button>
                                )}
                                {notebookEntryCount > 0 && setShowNotebook && (
                                    <button type="button"
                                        onClick={() => setShowNotebook(true)}
                                        data-help-key="header_open_notebook"
                                        className="p-2 rounded-xl transition-all flex items-center gap-1.5 hover:bg-white/10 text-white/80 hover:text-white"
                                        title={`${notebookLabel} (${notebookEntryCount})`}
                                        aria-label={`${notebookLabel} (${notebookEntryCount})`}
                                    >
                                        <BookOpen size={20} />
                                        <span className="text-[10px] font-bold leading-none bg-white/20 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{notebookEntryCount}</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <div id="tour-header-utils" className={`relative z-[100] w-full sm:w-auto flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3 p-2 rounded-2xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        {!isTeacherMode && window.__alloStudentAiSetupAllowed && (
                        <button type='button'
                          onClick={() => setShowAIBackendModal(true)}
                          data-help-key='header_student_ai_setup'
                          className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider border ${window.__alloStudentAiConfigured ? 'bg-emerald-600 text-white border-emerald-300' : 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-50'}`}
                          title={window.__alloStudentAiConfigured ? personalAIConnectedLabel : personalAIConnectLabel}
                          aria-label={window.__alloStudentAiConfigured ? personalAIConnectedLabel : personalAIConnectLabel}
                        >
                          <Unplug size={14} aria-hidden='true' />
                          <span className='hidden lg:inline'>{window.__alloStudentAiConfigured ? personalAIReadyLabel : personalAIConnectLabel}</span>
                        </button>
                        )}
                        {!isTeacherMode && window.__alloStudentAiSetupAllowed && window.__alloStudentAiConfigured && (
                        <button type='button'
                          onClick={() => { if (typeof window.__alloDisconnectStudentAi === 'function') window.__alloDisconnectStudentAi(); }}
                          data-help-key='header_student_ai_disconnect'
                          className='px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider border bg-slate-900/40 text-white border-white/30 hover:bg-rose-700'
                          title={personalAIDisconnectDetail}
                          aria-label={personalAIDisconnectLabel}
                        >
                          <X size={14} aria-hidden='true' />
                          <span className='hidden xl:inline'>{personalAIDisconnectLabel}</span>
                        </button>
                        )}
                        {isTeacherMode && (
                            <button type="button"
                                onClick={handleSetShowHintsModalToTrue}
                                data-help-key="hints_recall"
                                className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors relative"
                                title={t('common.recall_hints_and_messages') || t('common.recall_hints')}
                                aria-label={t('common.recall_hints_and_messages') || t('common.recall_hints')}
                            >
                                {/* D4 (2026-08-16): this button now also opens the replayable
                                    toast log, so the dot has to count it. Without that, a
                                    notice that timed out left no trace anywhere on screen and
                                    the teacher had no reason to look in here for it. */}
                                <Lightbulb size={20} className={(hintHistory.length > 0 || (toastHistoryCount || 0) > 0) ? "fill-yellow-500/20" : ""} />
                                {(hintHistory.length > 0 || (toastHistoryCount || 0) > 0) && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white/50"></span>
                                )}
                            </button>
                        )}
                        <button type="button"
                            onClick={handleToggleIsBotVisible}
                            data-help-key="header_bot_toggle"
                            className={`p-2 rounded-xl transition-colors ${isBotVisible ? 'bg-indigo-500 text-white shadow-md' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                            title={isBotVisible ? t('toolbar.hide_bot') : t('toolbar.show_bot')}
                            aria-label={isBotVisible ? t('toolbar.hide_bot') : t('toolbar.show_bot')}
                        >
                            <div className="relative">
                                <Smile size={20} />
                                {!isBotVisible && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-red-400 rotate-45"></div></div>}
                            </div>
                        </button>
                        <div className="relative">
                        <button type="button"
                            data-help-ignore="true"
                            onClick={handleToggleIsHelpMode}
                            className={`p-2 rounded-xl transition-colors ${isHelpMode ? 'bg-yellow-400 text-slate-900 shadow-md animate-pulse' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                            title={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
                            aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
                        >
                            <CircleHelp size={20} />
                        </button>
                        {showHelpOnboarding && !isHelpMode && (
                            <button
                                type="button"
                                onClick={dismissHelpOnboarding}
                                aria-label={t('common.dismiss') || 'Dismiss help tip'}
                                className="absolute -bottom-14 right-0 min-h-6 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg cursor-pointer animate-bounce motion-reduce:animate-none z-[10999] whitespace-nowrap border-2 border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                style={{ minWidth: '160px', textAlign: 'center' }}
                            >
                                <span aria-hidden="true" className="absolute -top-2 right-4 w-4 h-4 bg-indigo-600 rotate-45 border-l-2 border-t-2 border-indigo-400"></span>
                                <span><span aria-hidden="true">&#128161;</span> {t('header.click_for_help') || 'Click'} <strong>?</strong> {t('header.anytime_for_help') || 'anytime for help!'}</span>
                            </button>
                        )}
                        </div>
                        {isTeacherMode && (
                            <button type="button"
                                onClick={handleCloudToggleClick}
                                data-help-key="header_cloud_sync"
                                className={`p-2 rounded-xl transition-colors ${isCloudSyncEnabled ? 'bg-green-700 text-white shadow-lg shadow-green-500/30' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                                title={isCloudSyncEnabled ? t('header.cloud_sync_active') : t('header.cloud_sync_enable')}
                                aria-label={t('header.cloud_sync_toggle')}
                            >
                                {isCloudSyncEnabled ? <Cloud size={20} /> : <CloudOff size={20} />}
                            </button>
                        )}
                        {isTeacherMode && (
                            <>
                            <button type="button"
                              onClick={() => { setRunTour(true); setTourStep(0); setSpotlightMessage(''); }}
                              data-help-key="header_tour_start"
                              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                              title={t('toolbar.start_tour')}
                              aria-label={t('toolbar.start_tour_aria')}
                            >
                              <MapIcon size={20} />
                            </button>
                            <button type="button"
                              onClick={() => setShowSetupPathMenu(true)}
                              data-help-key="header_rerun_wizard"
                              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                              title={t('toolbar.start_setup') || 'Start & setup'}
                              aria-label={t('toolbar.start_setup_aria') || 'Open Start and setup options'}
                            >
                              <Sparkles size={20} />
                            </button>
                            </>
                        )}
                        <button type="button"
                          onClick={handleSetShowInfoModalToTrue}
                          data-help-key="header_about"
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                          title={t('toolbar.about_label')}
                          aria-label={t('toolbar.about_aria')}
                        >
                          <Info size={20} />
                        </button>
                    </div>
                </div>
                <div className="w-full flex flex-wrap items-center gap-2 sm:gap-3 justify-start sm:justify-end relative z-10 mt-2 min-w-0">
                    <div id="tour-header-actions" className={`w-full sm:w-auto sm:ml-auto flex flex-wrap items-center justify-start sm:justify-end gap-2 p-1.5 rounded-xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        <div className="w-full sm:w-auto flex flex-col items-start sm:flex-row sm:items-center gap-1.5 px-1 sm:pr-2 sm:border-r sm:border-white/10">
                            <span className="text-[11px] font-bold text-indigo-100/70 uppercase tracking-wider hidden md:block text-right leading-tight">
                                {t('header.app_language')}
                            </span>
                            <div className="max-w-full scale-90 origin-left sm:origin-center" data-help-key="header_language">
                                <UiLanguageSelector />
                            </div>
                        </div>
                        {/* Everything other than the language picker stacks into one
                            column beside it. The language block is two controls tall,
                            which left a dead band across the top of this box while the
                            utility cluster sat on a row of its own below — so the box
                            was a row taller than it needed to be. */}
                        <div className="flex-1 min-w-0 w-full sm:w-auto sm:flex-none flex flex-col items-stretch sm:items-end gap-1.5">
                        {isTeacherMode && (
                        <div
                            data-header-utility-cluster="teacher"
                            className={`w-full sm:w-auto flex flex-wrap items-center justify-end gap-1.5 rounded-xl border p-1 ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'border-white/15 bg-slate-950/20 shadow-sm'}`}
                        >
                            <button type="button"
                                ref={_translateTriggerRef}
                                onClick={openTranslateDialogFromHeader}
                                aria-haspopup="dialog"
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30"
                                title={t('header.translate_tooltip')}
                                data-help-key="header_translate"
                            >
                                <Languages size={14} /> <span className="hidden lg:inline">{t('header.translate_button')}</span>
                            </button>
                            <div className="relative shrink-0">
                            <button type="button"
                                aria-label={t('header.documents_menu_aria') || 'Documents menu'}
                                aria-haspopup="dialog"
                                aria-expanded={showExportMenu}
                                onClick={handleToggleShowExportMenu}
                                className={`bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border ${showExportMenu ? 'border-white/50 bg-white/20' : 'border-white/10 hover:border-white/30'}`}
                                data-help-key="header_export"
                                title={t('header.export_tooltip')}
                            >
                                <FileText size={14} /> <span className="hidden lg:inline">{t('header.nav_documents') || 'Documents'}</span> {showExportMenu ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            {showExportMenu && _headerPortal(
                                <>
                                <div ref={_exportDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="header-documents-dialog-title" className="fixed top-4 right-4 bottom-4 w-56 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain bg-white rounded-xl shadow-2xl p-2 border border-slate-400 z-[100] animate-in fade-in zoom-in-95 flex flex-col gap-1">
                                    <div className="flex items-center justify-between gap-2 px-2 py-1">
                                      <h2 id="header-documents-dialog-title" className="text-xs font-black text-slate-800 flex items-center gap-1.5">{"\ud83d\udcc4"} {t('export_menu.section_documents') || 'Documents'}</h2>
                                      <button type="button" onClick={handleSetShowExportMenuToFalse} className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600" aria-label={t('common.close') || 'Close'}><X size={18} aria-hidden="true" /></button>
                                    </div>
                                    <button type="button" onClick={() => openExportPreview('print')} className="w-full px-3 py-2.5 bg-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-1">{"\ud83d\udee0\ufe0f"} {t('export_menu.document_builder') || 'Document Builder'}</button>
                                    {customExportCSS && <div className="text-[11px] text-green-600 font-medium px-2 mb-1">✓ {t('export_menu.custom_style_active') || 'Custom style active'}</div>}
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83d\udcc4"} {t('export_menu.section_print') || 'Print & PDF'}</div>
                                    <button type="button"
                                        aria-label={t('header.open_doc_builder_pdf_aria') || 'Open Document Builder for PDF'}
                                        onClick={() => openExportPreview('print')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-green-700 text-xs font-bold transition-colors"
                                        data-help-key="export_pdf"
                                    >
                                        <FileDown size={14} /> {t('export_menu.pdf_slash_print', { print: t('export_menu.print') }) || `PDF / ${t('export_menu.print')}`}
                                    </button>
                                    <button type="button"
                                        onClick={() => openExportPreview('worksheet')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                                        data-help-key="export_worksheet"
                                    >
                                        <FileText size={14} /> {t('export_menu.worksheet')}
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83d\udcbb"} {t('export_menu.section_digital') || 'Digital Formats'}</div>
                                    <button type="button"
                                        onClick={() => openExportPreview('html')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-colors"
                                        data-help-key="export_html"
                                    >
                                        <Code size={14} /> {t('export_menu.html')}
                                    </button>
                                    <button type="button" aria-label={t('common.export_as_slides')}
                                        onClick={() => openExportPreview('slides')}
                                        disabled={!pptxLoaded} title={t('header.export_slides_tooltip') || 'Opens Document Builder in Slides mode'}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 text-orange-700 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        data-help-key="export_slides"
                                    >
                                        {!pptxLoaded ? <RefreshCw size={14} className="animate-spin"/> : <MonitorPlay size={14} />}
                                        {t('export_menu.slides')}
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{t('export_menu.section_student_qr') || 'Student QR'}</div>
                                    <button type="button"
                                        onClick={() => { if (typeof createHomeworkAssignmentLink === 'function') createHomeworkAssignmentLink(); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-50 text-cyan-700 text-xs font-bold transition-colors"
                                        data-help-key="homework_qr"
                                    >
                                        <Share2 size={14} /> {t('export_menu.homework_qr') || 'Homework QR'}
                                    </button>
                                    <div className="px-3 pb-2">
                                      <label className="block text-[11px] font-bold text-slate-600" htmlFor="homework-qr-expiry">{t('export_menu.homework_link_length') || 'Homework link length'}</label>
                                      <select id="homework-qr-expiry" value={homeworkExpiryDays || 14} onChange={event => setHomeworkExpiryDays(Number(event.target.value) || 14)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value={1}>{t('export_menu.expiry_1_day') || '1 day'}</option>
                                        <option value={7}>{t('export_menu.expiry_1_week') || '1 week'}</option>
                                        <option value={14}>{t('export_menu.expiry_2_weeks') || '2 weeks'}</option>
                                        <option value={30}>{t('export_menu.expiry_30_days') || '30 days'}</option>
                                        <option value={90}>{t('export_menu.expiry_90_days') || '90 days (quarter)'}</option>
                                        <option value={180}>{t('export_menu.expiry_180_days') || '180 days (semester)'}</option>
                                        <option value={365}>{t('export_menu.expiry_365_days') || '365 days (school year)'}</option>
                                      </select>
                                      {/* Activity setup moved to the Assignment Control Center so this
                                          compact dialog only needs one small select plus launch actions. */}
                                      <button type="button" onClick={() => { if (typeof openRecentQrShares === 'function') openRecentQrShares(); setShowExportMenu(false); }} className="mt-2 flex w-full items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-left text-[11px] font-bold text-sky-900 hover:bg-sky-100">
                                        {t('export_menu.setup_activity') || 'Set up a poll, sign-up sheet or class activity'}
                                      </button>
                                      <button type="button" onClick={() => { if (typeof openRecentQrShares === 'function') openRecentQrShares(); setShowExportMenu(false); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:border-cyan-400 hover:text-cyan-800">
                                        <History size={14}/> {t('export_menu.shared_links') || 'Polls, sign-ups & shared links'}{recentQrShareCount ? ` (${recentQrShareCount})` : ''}
                                      </button>
                                    </div>
                                    <p className="px-3 pb-2 text-[11px] leading-snug text-slate-500">{studentAiPolicyForShare === 'student-byok' ? (t('export_menu.share_policy_byok') || 'Teacher-prepared resources open with optional personal AI. Students supply and test their own provider.') : (t('export_menu.share_policy_ai_off') || 'Teacher-prepared resources open for students with AI generation off.')}</p>
                                    {/* Section label shares the buttons' gate \u2014 an excluded mode
                                        must not see an empty "LMS Integration" heading (independent
                                        mode did, before parent exclusions were added). */}
                                    {!isIndependentMode && !isParentMode && (
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83c\udfeb"} {t('export_menu.section_lms') || 'LMS Integration'}</div>
                                    )}
                                    {activeView === 'quiz' && !isIndependentMode && !isParentMode && (
                                        <button type="button"
                                            onClick={() => { handleExportQTI(); setShowExportMenu(false); }}
                                            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-teal-50 text-teal-700 text-xs font-bold transition-colors"
                                            data-help-key="export_qti"
                                        >
                                            <FolderDown size={14} /> {t('export_menu.qti')}
                                        </button>
                                    )}
                                    {!isIndependentMode && !isParentMode && (
                                    <button type="button"
                                        onClick={() => { handleExportIMS(); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-yellow-50 text-yellow-700 text-xs font-bold transition-colors"
                                        data-help-key="export_ims"
                                    >
                                        <FolderDown size={14} /> {t('export_menu.ims')}
                                    </button>
                                    )}
                                </div>
                                <div aria-hidden="true" className="fixed inset-0 z-[90]" onClick={handleSetShowExportMenuToFalse}></div>
                                </>
                            )}
                        </div>
                            {/* W3 (2026-08-16): this button is deliberately NOT gated on
                                !isParentMode, and that is easy to get wrong twice.

                                Family mode sets isTeacherMode AND isParentMode, so a bare
                                isTeacherMode gate normally is a parent leak. Here it is not an
                                oversight: MODE_AUDIT_2026-08-03.md F1 lists Class Analytics
                                under "Kept for parents by decision", because a home-schooling
                                parent has a real use for probe administration and progress.

                                What was actually wrong is one level down, and is fixed there:
                                the panel was handing a parent the Student Data (roster import)
                                and Research (IRB / Likert study suite) tabs. It now receives
                                isParentMode and drops those two, keeping Administer and
                                progress. See student_analytics_module.js.

                                Independent mode is excluded from neither: the panel has its own
                                "My Learning Journey" presentation for it. */}
                            {/* 2026-08-23: the persistent plain-teacher entry moved to the
                                Educator Hub's "Teach and assess" section (the command palette
                                still opens the Center directly). This slot now renders for
                                family and independent mode always — MODE_AUDIT_2026-08-03.md F1 kept the Center for
                                home-schooling parents, and My Learning Journey lives inside
                                the panel — and for teachers only while a screening battery
                                is live ("Screening · N left"). */}
                            {(isParentMode || isIndependentMode || screeningLiveActive) && (
                            <button type="button"
                                onClick={() => setShowClassAnalytics(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30 ring-1 ring-violet-400/40"
                                title={headerAnalyticsLabel}
                                data-help-key="header_analytics"
                            >
                                <ClipboardList size={14} /> <span className="hidden lg:inline">{headerAnalyticsLabel}</span>
                            </button>
                            )}
                        </div>
                            )}
                        <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* AI Backend / Diagnostics — visible to teachers in BOTH Canvas
                            and deploy. The modal itself swaps content based on _isCanvasEnv:
                            Canvas shows only Canvas-viable fields (CSE/Wolfram keys + Model
                            Diagnostics); deploy shows the full provider/key/URL stack +
                            Model Diagnostics. */}
                        {isTeacherMode && (
                        <button type="button"
                          onClick={() => setShowAIBackendModal(true)}
                          data-help-key="header_ai_backend"
                          className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider ${
                            (() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').backend && JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').backend !== 'gemini'; } catch { return false; } })()
                              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/50'
                              : 'hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                          }`}
                          title={_isCanvasEnv ? (t('header.ai_diagnostics_canvas') || 'AI Settings & Model Diagnostics') : (t('header.ai_backend_config') || 'AI Backend Configuration')}
                          aria-label={_isCanvasEnv ? (t('header.ai_diagnostics_canvas') || 'AI Settings & Model Diagnostics') : (t('header.ai_backend_config') || 'AI Backend Configuration')}
                        >
                          <Unplug size={14} aria-hidden="true" />
                          <span className="hidden lg:inline">{t('header.nav_ai') || 'AI'}</span>
                        </button>
                        )}
                        {isTeacherMode && (
                        <button type="button"
                          onClick={() => {
                            if (APP_CONFIG._cfg_validation_key) {
                              setPendingRole('educator_hub');
                              setIsGateOpen(true);
                            } else {
                              setShowEducatorHub(true);
                            }
                          }}
                          data-help-key="header_educator_hub"
                          className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                          title={t('header.educator_tools_tooltip') || 'Educator Tools (Symbol Studio, BehaviorLens, Report Writer)'}
                          aria-label={t('header.educator_tools_aria') || 'Educator Tools'}
                        >
                          <span style={{fontSize:'14px',lineHeight:1}}>🎓</span>
                          <span className="hidden lg:inline">{t('header.nav_tools') || 'Tools'}</span>
                        </button>
                        )}
                        {/* All roles — see the note on the expanded-header twin. */}
                        {setShowLearningHub && (
                        <button type="button"
                          onClick={() => setShowLearningHub(true)}
                          data-help-key="header_learning_hub"
                          className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                          title={t('header.learning_tools_tooltip') || 'Learning Tools (STEAM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)'}
                          aria-label={t('header.learning_tools_aria') || 'Learning Tools'}
                        >
                          <span style={{fontSize:'14px',lineHeight:1}}>🧠</span>
                          <span className="hidden lg:inline">{t('header.nav_learn') || 'Learn'}</span>
                        </button>
                        )}
                        {isTeacherMode && !isIndependentMode && !isParentMode && setBridgeSendOpen && (
                        <button type="button"
                          onClick={() => setBridgeSendOpen(true)}
                          data-help-key="header_bridge"
                          className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                          title={t('header.bridge_tooltip') || 'Family Bridge: live translation to talk with multilingual families & students'}
                          aria-label={t('header.bridge_aria') || 'Family Bridge translation'}
                        >
                          <span style={{fontSize:'14px',lineHeight:1}}>🌐</span>
                          <span className="hidden lg:inline">{t('header.nav_bridge') || 'Bridge'}</span>
                        </button>
                        )}
                        <div className="w-px h-5 bg-white/10 mx-0.5"></div>
                        <div className="relative">
                            {isTeacherMode ? (
                                !isIndependentMode && !isParentMode && (<>
                                <button type="button"
                                    aria-label={t('common.connect')}
                                    onClick={() => activeSessionCode ? setShowSessionModal(true) : startClassSession()}
                                    className={`px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border ${activeSessionCode ? 'bg-green-700 text-white border-green-400 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30'}`}
                                    data-help-key="header_session_start"
                                    title={t('session.start_tooltip')}
                                >
                                    <Wifi size={14} />
                                    {activeSessionCode ? (t('header.live_session_code', { code: activeSessionCode }) || `Live: ${activeSessionCode}`) : <span className="hidden lg:inline">{t('session.start')}</span>}
                                </button>
                                </>)
                            ) : (
                                <div className="flex items-center">
                                    {activeSessionCode ? (
                                        <div className={`flex items-center gap-2 text-white px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm transition-colors ${sessionData ? 'bg-green-700 border-green-600' : 'bg-yellow-500 border-yellow-400'}`}>
                                            {sessionData ? <Wifi size={14} className="animate-pulse"/> : <RefreshCw size={14} className="animate-spin"/>}
                                            <span>{sessionData ? (t('header.synced_session_code', { code: activeSessionCode }) || `Synced: ${activeSessionCode}`) : (t('header.connecting_session_code', { code: activeSessionCode }) || `Connecting: ${activeSessionCode}`)}</span>
                                            <button type="button"
                                                aria-label={t('common.close')}
                                                data-help-key="header_session_status"
                                                onClick={() => {
                                                    if(sessionUnsubscribeRef.current) sessionUnsubscribeRef.current();
                                                    setActiveSessionCode(null);
                                                    setSessionData(null);
                                                    hasConnectedRef.current = false;
                                                    setHistory([]);
                                                    addToast(t('session.toast_disconnected'), "info");
                                                }}
                                                className="ml-2 p-0.5 hover:bg-white/20 rounded"
                                                title={t('common.disconnect')}
                                            >
                                                <X size={12}/>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button type="button"
                                                ref={_joinTriggerRef}
                                                onClick={handleToggleIsJoinPopoverOpen}
                                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30"
                                                data-help-key="header_session_join"
                                                title={t('session.join_tooltip')}
                                                aria-haspopup="dialog"
                                                aria-expanded={isJoinPopoverOpen}
                                            >
                                                <WifiOff size={14} /> <span className="hidden lg:inline">{t('session.join')}</span>
                                            </button>
                                            {isJoinPopoverOpen && (
                                                <div ref={_joinPopoverRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="header-join-session-title" className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl p-3 border border-slate-400 z-[100] animate-in fade-in zoom-in-95 motion-reduce:animate-none">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                                            <h2 id="header-join-session-title" className="text-sm font-black text-slate-800">{t('session.join')}</h2>
                                                            <button type="button" onClick={handleSetIsJoinPopoverOpenToFalse} className="min-w-6 min-h-6 rounded text-slate-500 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={t('common.close') || 'Close join session'}>&times;</button>
                                                        </div>
                                                        <div>
                                                            <label htmlFor="header-join-host-id" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">{t('session.host_id_optional')}</label>
                                                            <input
                                                                id="header-join-host-id"
                                                                type="text"
                                                                value={joinAppIdInput}
                                                                onChange={(e) => setJoinAppIdInput(e.target.value)}
                                                                placeholder={t('session.default_placeholder', {id: appId})}
                                                                className="w-full text-xs border border-slate-400 rounded-xl p-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-slate-600 font-mono mb-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="header-join-code" className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">{t('session.code')}</label>
                                                            <div className="flex gap-1">
                                                                <input
                                                                    id="header-join-code"
                                                                    data-autofocus
                                                                    type="text"
                                                                    value={joinCodeInput}
                                                                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                                                    onKeyDown={(e) => e.key === 'Enter' && joinClassSession(joinCodeInput)}
                                                                    placeholder={t('session.code_placeholder')}
                                                                    maxLength={5}
                                                                    className="w-full text-center font-mono font-bold text-lg border border-slate-400 rounded p-1 uppercase focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                                                                />
                                                                <button type="button"
                                                                    aria-label={t('common.continue')}
                                                                    onClick={() => joinClassSession(joinCodeInput)}
                                                                    className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors"
                                                                >
                                                                    <ArrowRight size={16}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {isJoinPopoverOpen && (
                                                <div aria-hidden="true" className="fixed inset-0 z-[90]" onClick={handleSetIsJoinPopoverOpenToFalse}></div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {!isTeacherMode && (
                            <button type="button"
                                onClick={handleSetShowSubmitModalToTrue}
                                className={`bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30`}
                                title={t('header.submit_tooltip')}
                                data-help-key="header_submit"
                            >
                                <Send size={14} /> <span className="hidden lg:inline">{t('header.submit_work')}</span>
                            </button>
                        )}
                        </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
          </div>
        </div>
        {showSetupPathMenu && (
          <div
            className="fixed inset-0 z-[12000] bg-slate-950/70 backdrop-blur-sm flex items-start justify-end p-4 md:p-8"
            onClick={() => setShowSetupPathMenu(false)}
          >
            <div
              ref={_setupMenuRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="header-setup-options-title"
              className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 text-white shadow-2xl overflow-hidden outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
                <div>
                  <h2 id="header-setup-options-title" className="text-sm font-black">{t('toolbar.start_setup_title') || 'Start & setup'}</h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t('toolbar.start_setup_desc') || 'Return to Start, adjust setup, or use Guided Mode. Your current workspace stays saved.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSetupPathMenu(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={t('common.close') || 'Close'}
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <button
                  type="button"
                  onClick={returnToStartFromHeader}
                  data-help-key="header_return_to_start"
                  className="w-full text-start rounded-xl border border-sky-300/30 bg-sky-500/15 hover:bg-sky-500/25 px-4 py-3 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-black"><Layout size={16} />{t('toolbar.back_to_start') || 'Back to Start'}</span>
                  <span className="block text-xs text-sky-100 mt-1 leading-relaxed">{t('toolbar.back_to_start_desc') || 'Choose another pathway from the Start page. Your current workspace stays saved.'}</span>
                </button>
                <button
                  type="button"
                  onClick={openQuickStartSetup}
                  data-help-key="header_quickstart_setup"
                  className="w-full text-start rounded-xl border border-indigo-300/30 bg-indigo-500/15 hover:bg-indigo-500/25 px-4 py-3 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-black"><Sparkles size={16} />{t('toolbar.rerun_wizard') || 'Re-run Setup Wizard'}</span>
                  <span className="block text-xs text-indigo-100 mt-1 leading-relaxed">{t('toolbar.quickstart_setup_desc') || 'Set grade, source material, standards, languages, and personalization.'}</span>
                </button>
                <button
                  type="button"
                  onClick={startGuidedModeFromHeader}
                  data-help-key="header_guided_mode_start"
                  className="w-full text-start rounded-xl border border-emerald-300/30 bg-emerald-500/15 hover:bg-emerald-500/25 px-4 py-3 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-black"><MapIcon size={16} />{_guidedHasProgress ? (t('toolbar.guided_mode_resume') || 'Resume Guided Mode') : (t('launch_pad.guided_title') || 'Guided Mode')}</span>
                  <span className="block text-xs text-emerald-100 mt-1 leading-relaxed">{_guidedHasProgress ? (t('toolbar.guided_mode_resume_desc') || 'Pick the tour back up where you left off.') : (t('toolbar.guided_mode_setup_desc') || 'Highlight one tool at a time and build a resource pack with prompts, examples, and progress checks.')}</span>
                </button>
                {_guidedHasProgress && (
                  <button
                    type="button"
                    onClick={restartGuidedModeFromHeader}
                    className="w-full text-start rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-200">{t('toolbar.guided_mode_start_over') || 'Start the tour over from step 1'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
  );
}
