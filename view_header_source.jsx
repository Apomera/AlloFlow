/**
 * AlloFlow — Header Bar Module
 *
 * The top header bar (when !isZenMode): brand/logo on the left, AI/TTS/export
 * controls + session toolbar on the right. The largest single JSX block of
 * the AlloFlowANTI.txt render — extracted as one module.
 *
 * Extracted from AlloFlowANTI.txt lines 20524-21339 (May 2026).
 *
 * Required props (~118 React state/handlers/setters + 41 icon globals).
 * See HEADER_PROPS catalog at bottom of this file for full list.
 *
 * Icons: read from window globals (each falls back to noop). Avoids tight
 * coupling to the parent app's lucide-react imports.
 */
const _headerUseFocusTrap = (typeof window !== 'undefined' && window.__alloHooks && window.__alloHooks.useFocusTrap) || function(){};

function HeaderBar(props) {
  const noop = () => null;
  const AlertCircle = window.AlertCircle || noop;
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
  const { isTeacherMode, isIndependentMode, setIsTeacherMode } = _roleCtx;
  const {
    theme, colorOverlay, readingTheme, focusMode, disableAnimations,
    baseFontSize, lineHeight, letterSpacing, selectedFont,
    setReadingTheme, setBaseFontSize, setLineHeight, setLetterSpacing, setSelectedFont,
    toggleTheme, toggleOverlay,
  } = _themeCtx;

  const {
    APP_CONFIG, AnimatedNumber, EDGE_TTS_VOICES, FONT_OPTIONS, GEMINI_VOICES,
    GlobalMuteButton, KOKORO_VOICES, UiLanguageSelector, _isCanvasEnv, activeSessionCode,
    addToast, ai, appId, currentLevelXP,
    customExportCSS, createHomeworkAssignmentLink, dismissHelpOnboarding,
    homeworkExpiryDays, openRecentQrShares, recentQrShareCount, setHomeworkExpiryDays,
    focusNarrationEnabled, generatedContent, globalLevel, globalProgress, globalXPNext,
    handleCloudToggleClick, handleExportIMS, handleExportQTI, handleRestoreView,
    handleSetActiveViewToDashboard, handleSetIsJoinPopoverOpenToFalse,
    handleSetIsTranslateModalOpenToTrue, handleSetShowExportMenuToFalse,
    handleSetShowHintsModalToTrue, handleSetShowInfoModalToTrue,
    handleSetShowSubmitModalToTrue, handleSetShowTextSettingsToFalse,
    handleSetShowVoiceSettingsToFalse, handleSetShowXPModalToTrue,
    handleToggleDisableAnimations, handleToggleFocusMode, handleToggleIsBotVisible,
    handleToggleIsHelpMode, handleToggleIsJoinPopoverOpen, handleToggleShowExportMenu,
    hasConnectedRef, hintHistory, isBotVisible, isCloudSyncEnabled, isExtracting,
    isGeneratingSource, isHelpMode, isJoinPopoverOpen, isProcessing,
    isStudentLinkMode, isZenMode, joinAppIdInput, joinClassSession,
    joinCodeInput, languageToTTSCode, latestLessonPlan,
    leveledTextLanguage, notebookEntryCount, openExportPreview, pptxLoaded,
    resetFontSize, safeRemoveItem, selectedVoice, sessionData,
    sessionUnsubscribeRef, setActiveSessionCode, setHistory,
    setIsGateOpen, setJoinAppIdInput, setJoinCodeInput,
    setPendingRole, setRunTour, setGuidedMode, setGuidedStep, setGuidedSelectedIds,
    guidedStep, guidedMode, resetGuidedProgress,
    setSelectedVoice, setSessionData, setShowAIBackendModal,
    setBridgeSendOpen, setShowClassAnalytics, setShowEducatorHub, setShowExportMenu, setShowLearningHub, setShowNotebook, setShowReadThisPage,
    setShowSessionModal, setShowTextSettings, setShowVoiceSettings, setShowWizard,
    setSliderFontSize, setSpotlightMessage, setTourStep, setVoiceSpeed, setVoiceVolume,
    showExportMenu, showHelpOnboarding, showReadThisPage, showTextSettings,
    showVoiceSettings, sliderFontSize, startClassSession, studentAiPolicyForShare, t,
    voiceSpeed, voiceVolume,
  } = props;

  const [showSetupPathMenu, setShowSetupPathMenu] = React.useState(false);
  const _setupMenuRef = React.useRef(null);
  const _textSettingsRef = React.useRef(null);
  const _voiceSettingsRef = React.useRef(null);
  const _joinPopoverRef = React.useRef(null);
  _headerUseFocusTrap(_setupMenuRef, showSetupPathMenu, () => setShowSetupPathMenu(false));
  _headerUseFocusTrap(_textSettingsRef, showTextSettings, handleSetShowTextSettingsToFalse);
  _headerUseFocusTrap(_voiceSettingsRef, showVoiceSettings, handleSetShowVoiceSettingsToFalse);
  _headerUseFocusTrap(_joinPopoverRef, isJoinPopoverOpen, handleSetIsJoinPopoverOpenToFalse);
  const openQuickStartSetup = () => {
    try { if (safeRemoveItem) safeRemoveItem('allo_wizard_completed'); } catch (_) {}
    setShowSetupPathMenu(false);
    setShowWizard(true);
  };
  // Header entry used to silently reset the tour to step 0 while the LaunchPad/coach
  // entries resumed the preserved step. Now: resume when there's progress, with an
  // explicit "Start over" secondary action; fresh start otherwise.
  const _guidedHasProgress = typeof guidedStep === 'number' && guidedStep > 0;
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
  const canUseKokoroVoicePicker = _isCanvasEnv || isDesktopBundledApp;
  const readThisPageTitle = t('read_this_page.title') || 'Read This Page';
  const readThisPagePanelLabel = t('read_this_page.panel_aria') || (readThisPageTitle + ' panel');
  const closeLabel = t('common.close') || 'Close';
  const notebookLabel = t('cmd.open_notebook') || 'Open my notebook';
  const personalAIConnectLabel = t('header.personal_ai_connect') || 'Connect personal AI';
  const personalAIConnectedLabel = t('header.personal_ai_connected') || 'Personal AI connected';
  const personalAIReadyLabel = t('header.personal_ai_ready') || 'AI ready';
  const personalAIDisconnectLabel = t('header.personal_ai_disconnect') || 'Disconnect personal AI';
  const personalAIDisconnectDetail = t('header.personal_ai_disconnect_detail') || 'Disconnect personal AI and erase the key from this browser tab';
  const readingThemeLabelKeys = {
    default: 'reading_theme_default', warm: 'reading_theme_warm', sepia: 'reading_theme_sepia',
    dark: 'reading_theme_dark', highContrast: 'reading_theme_contrast', blue: 'reading_theme_blue',
    green: 'reading_theme_green', rose: 'reading_theme_rose', dyslexia: 'reading_theme_easy_read'
  };
  const readingThemeFallbackLabels = {
    default: 'Default', warm: 'Warm', sepia: 'Sepia', dark: 'Dark', highContrast: 'Contrast',
    blue: 'Blue', green: 'Green', rose: 'Rose', dyslexia: 'Easy Read'
  };
  const selectedReadingThemeKey = readingThemeLabelKeys[readingTheme] || readingThemeLabelKeys.default;
  const selectedReadingThemeLabel = t('header.' + selectedReadingThemeKey)
    || readingThemeFallbackLabels[readingTheme]
    || readingThemeFallbackLabels.default;

  return (
      <header aria-label={t('common.main_application_header')} className={`p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 w-full min-w-0 overflow-x-clip ${theme === 'contrast' ? 'bg-black border-b-4 border-yellow-400' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900 via-indigo-950 to-slate-900 text-white'}`}>
        <div className="w-full max-w-[98%] mx-auto relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h1 className={`text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3 ${theme === 'contrast' ? 'text-yellow-400' : 'text-white drop-shadow-sm'}`}>
                <span className={`inline-flex items-center justify-center ${theme === 'contrast' ? '' : 'p-1.5 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-200/30'}`} aria-hidden="true">
                  <Layers className="w-10 h-10" aria-hidden="true" />
                </span>
                {theme === 'contrast' ? t('header.app_name') : <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-orange-400 bg-clip-text text-transparent">{t('header.app_name')}</span>}
                <div className={`hidden md:flex items-center gap-1 ml-4 p-1 rounded-full border backdrop-blur-md shadow-sm select-none pointer-events-none ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
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
                </div>
              </h1>
              <p className={`mt-2 text-sm font-medium italic opacity-90 ${theme === 'contrast' ? 'text-yellow-400' : 'text-indigo-100'}`}>
                {t('header.tagline')}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 text-[11px] ${theme === 'contrast' ? 'text-yellow-400' : 'px-2.5 py-0.5 rounded-xl bg-white/10 border border-white/20 text-indigo-100'}`}>
                  {t('header.rights')}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${theme === 'contrast' ? 'text-red-400' : 'px-2.5 py-0.5 rounded-xl bg-orange-400/15 border border-orange-300/30 text-orange-100'}`}>
                  <AlertCircle size={10} aria-hidden="true" /> {t('header.pii_warning')}
                </span>
              </div>
            </div>
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
                            {showTextSettings && (
                                <>
                                    <div aria-hidden="true" className="fixed inset-0 z-[10000]" onClick={handleSetShowTextSettingsToFalse}></div>
                                    <div ref={_textSettingsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="header-text-settings-title" className={`fixed top-28 right-20 w-72 p-5 rounded-xl shadow-2xl border z-[10001] animate-in fade-in zoom-in-95 motion-reduce:animate-none duration-200 ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-600 text-white'}`}>
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                                <h4 id="header-text-settings-title" className="font-bold text-sm">{t('settings.text.header')}</h4>
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={resetFontSize} data-help-key="header_settings_text_reset" className="text-[11px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1"><RefreshCw size={10}/> {t('common.reset')}</button>
                                                    <button type="button" onClick={handleSetShowTextSettingsToFalse} className="min-w-6 min-h-6 rounded text-slate-500 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={t('common.close') || 'Close text settings'}>&times;</button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`text-xs font-bold flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{t('settings.text.font_family')}</label>
                                                <select aria-label={t('common.selection')}
                                                    value={selectedFont}
                                                    onChange={(e) => setSelectedFont(e.target.value)}
                                                    data-help-key="header_settings_text_font"
                                                    className="w-full text-sm p-2.5 rounded-lg border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                                >
                                                    {FONT_OPTIONS.map((font) => (
                                                        <option key={font.id} value={font.id}>{font.label}</option>
                                                    ))}
                                                </select>
                                                <p className={`text-[11px] opacity-70 p-2 rounded bg-slate-50 dark:bg-slate-700 ${FONT_OPTIONS.find(f => f.id === selectedFont)?.cssClass || ''}`}>
                                                    {t('settings.text.font_preview')} {t('settings.text.font_preview_sample')}
                                                </p>
                                            </div>
                                            <button type="button"
                                                aria-label={t('common.toggle_focus_mode')}
                                                onClick={handleToggleFocusMode}
                                                data-help-key="header_settings_text_bionic"
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all group ${focusMode ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-400 dark:text-indigo-100' : 'bg-slate-50 border-transparent hover:border-slate-300 dark:bg-slate-700 dark:text-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md ${focusMode ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-200'}`}>
                                                        <Eye size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="block text-xs font-bold">{t('settings.text.bionic')}</span>
                                                        <span className="block text-[11px] opacity-70">{t('settings.text.bionic_sub')}</span>
                                                    </div>
                                                </div>
                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${focusMode ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${focusMode ? 'left-6' : 'left-1'}`}></div>
                                                </div>
                                            </button>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className={`text-xs font-bold flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{t('settings.text.size')}</label>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{baseFontSize}px</span>
                                                </div>
                                            <div className="flex items-center gap-3" data-help-key="header_settings_text_size">
                                                    <button type="button" aria-label={t('common.minimize')} onClick={() => { setBaseFontSize(Math.max(12, baseFontSize - 1)); setSliderFontSize(Math.max(12, baseFontSize - 1)); }} className={`p-2.5 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-700'}`}><Minimize size={16}/></button>
                                                    <input aria-label={t('common.adjust_slider_font_size')}
                                                        type="range" min="12" max="24" step="1"
                                                        value={sliderFontSize}
                                                        onChange={(e) => setSliderFontSize(parseInt(e.target.value))}
                                                        onMouseUp={() => setBaseFontSize(sliderFontSize)}
                                                        onTouchEnd={() => setBaseFontSize(sliderFontSize)}
                                                        className="flex-grow h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                    />
                                                    <button type="button" aria-label={t('common.maximize')} onClick={() => { setBaseFontSize(Math.min(24, baseFontSize + 1)); setSliderFontSize(Math.min(24, baseFontSize + 1)); }} className={`p-2.5 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-slate-700'}`}><Maximize size={16}/></button>
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className={`text-xs font-bold flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{t('settings.text.line_height')}</label>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{lineHeight}</span>
                                                </div>
                                                <input aria-label={t('common.adjust_line_height')}
                                                    type="range" min="1.0" max="2.5" step="0.1"
                                                    value={lineHeight}
                                                    onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                                                    data-help-key="header_settings_text_line_height"
                                                    className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className={`text-xs font-bold flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{t('settings.text.spacing')}</label>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{letterSpacing}em</span>
                                                </div>
                                                <input aria-label={t('common.adjust_letter_spacing')}
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
                                                    <label className={`text-xs font-bold flex items-center gap-1 ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{t('settings.reading_theme') || '🎨 Reading Theme'}</label>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{selectedReadingThemeLabel}</span>
                                                </div>
                                                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} mb-2`}>{t('settings.reading_theme_desc') || 'Background & text color for all content views'}</p>
                                                <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('header.reading_theme_aria') || 'Reading theme'}>
                                                    {[
                                                        { id: 'default', label: t('header.reading_theme_default') || 'Default', bg: '#ffffff', fg: '#1e293b', border: '#e2e8f0', emoji: '○' },
                                                        { id: 'warm', label: t('header.reading_theme_warm') || 'Warm', bg: '#fef3c7', fg: '#5c4033', border: '#fde68a', emoji: '☀️' },
                                                        { id: 'sepia', label: t('header.reading_theme_sepia') || 'Sepia', bg: '#f4ecd8', fg: '#5c4033', border: '#d4c5a9', emoji: '📜' },
                                                        { id: 'dark', label: t('header.reading_theme_dark') || 'Dark', bg: '#1a1a2e', fg: '#e2e8f0', border: '#334155', emoji: '🌙' },
                                                        { id: 'highContrast', label: t('header.reading_theme_contrast') || 'Contrast', bg: '#000000', fg: '#ffff00', border: '#ffff00', emoji: '◼️' },
                                                        { id: 'blue', label: t('header.reading_theme_blue') || 'Blue', bg: '#d6eaf8', fg: '#1b2631', border: '#85c1e9', emoji: '💧' },
                                                        { id: 'green', label: t('header.reading_theme_green') || 'Green', bg: '#e8f5e9', fg: '#1b5e20', border: '#81c784', emoji: '🌿' },
                                                        { id: 'rose', label: t('header.reading_theme_rose') || 'Rose', bg: '#fce4ec', fg: '#880e4f', border: '#f48fb1', emoji: '🌸' },
                                                        { id: 'dyslexia', label: t('header.reading_theme_easy_read') || 'Easy Read', bg: '#faf8ef', fg: '#1e293b', border: '#e8e0c8', emoji: '🔤' },
                                                    ].map(function(th) {
                                                        var isActive = readingTheme === th.id;
                                                        return <button type="button" key={th.id}
                                                            role="radio" aria-checked={isActive} aria-label={th.label}
                                                            onClick={() => setReadingTheme(th.id)}
                                                            title={th.label}
                                                            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all border-2 cursor-pointer ${isActive ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105' : 'hover:scale-105'}`}
                                                            style={{ background: th.bg, color: th.fg, borderColor: isActive ? '#6366f1' : th.border }}
                                                        >
                                                            <span className="text-sm leading-none">{th.emoji}</span>
                                                            <span className="text-[11px] font-bold leading-none" style={{ color: th.fg }}>{th.label}</span>
                                                        </button>;
                                                    })}
                                                </div>
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
                            {showVoiceSettings && (
                                <>
                                    <div aria-hidden="true" className="fixed inset-0 z-[10000]" onClick={handleSetShowVoiceSettingsToFalse}></div>
                                    <div ref={_voiceSettingsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="header-voice-settings-title" className={`fixed top-28 right-4 w-64 p-5 rounded-xl shadow-2xl border z-[10001] animate-in fade-in zoom-in-95 motion-reduce:animate-none duration-200 ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-600 text-white'}`}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                                <h4 id="header-voice-settings-title" className="font-bold text-sm">{t('settings.voice.label')}</h4>
                                                <button type="button" onClick={handleSetShowVoiceSettingsToFalse} className="min-w-6 min-h-6 rounded text-slate-500 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={t('common.close') || 'Close voice settings'}>&times;</button>
                                            </div>
                                            <div>
                                                <select aria-label={t('common.selection')}
                                                    value={selectedVoice}
                                                    onChange={(e) => {
                                                      const voice = e.target.value;
                                                      setSelectedVoice(voice);
                                                      if (canUseKokoroVoicePicker && KOKORO_VOICES.some(v => v.id === voice) && !window._kokoroTTS?.ready && window.__loadKokoroTTS) {
                                                        window.__kokoroTTSDownloading = true;
                                                        addToast('Downloading Kokoro voice model (~88MB, one time)...', 'info');
                                                        window.__loadKokoroTTS().then(ok => {
                                                          window.__kokoroTTSDownloading = false;
                                                          if (ok) addToast('Kokoro voice ready!', 'success');
                                                          else addToast('Kokoro download failed — using Gemini TTS', 'error');
                                                        });
                                                      }
                                                    }}
                                                    data-help-key="header_settings_voice_select"
                                                    className="w-full text-xs p-2 rounded-lg border border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    {_isCanvasEnv ? (
                                                        <>
                                                            <optgroup label="✨ Gemini TTS (Cloud)">
                                                                {GEMINI_VOICES.slice(0, 15).map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label || v.id}</option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label={window._kokoroTTS?.ready ? "🎤 Kokoro (Ready)" : "🎤 Kokoro (tap to download ~88MB)"}>
                                                                {KOKORO_VOICES.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label}{!window._kokoroTTS?.ready ? ' ⬇' : ''}</option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label="🌐 Browser Fallback">
                                                                <option value="browser">{t('header.voice_browser_default') || 'Browser Default'}</option>
                                                            </optgroup>
                                                        </>
                                                    ) : isLocalVoiceMode ? (
                                                        <>
                                                            {isDesktopBundledApp && (
                                                                <optgroup label={window._kokoroTTS?.ready ? "🎤 Kokoro (Ready)" : "🎤 Kokoro (loading/local)"}>
                                                                    {KOKORO_VOICES.map(v => (
                                                                        <option key={v.id} value={v.id}>{v.label}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            <optgroup label="🎤 Edge TTS Voices">
                                                                {EDGE_TTS_VOICES.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label}</option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label="🔇 Browser Fallback">
                                                                <option value="browser">{t('header.voice_browser_default') || 'Browser Default'}</option>
                                                            </optgroup>
                                                        </>
                                                    ) : (
                                                        GEMINI_VOICES.map(v => (
                                                            <option key={v.id} value={v.id}>{v.label}</option>
                                                        ))
                                                    )}
                                                </select>
                                                {/* ── Kokoro model info (2026-07-06): the old Fast(q4)/High(q8)
                                                    toggle was retired — the q4 file is really ~291MB (not 43MB),
                                                    sounds worse, and benched no faster on wasm CPU. One honest
                                                    tier now: q8, ~88MB, downloaded once + cached on device. ── */}
                                                {canUseKokoroVoicePicker && selectedVoice && selectedVoice.includes('_') && window._kokoroTTS && (
                                                    <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-400 dark:border-slate-600">
                                                        <p className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} m-0`}>
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
                                                <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-400 dark:border-slate-600">
                                                    <label className="flex items-start gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 accent-indigo-600"
                                                            defaultChecked={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').browserTtsFallback === true; } catch { return false; } })()}
                                                            onChange={(e) => {
                                                                try {
                                                                    const cur = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                                                                    localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...cur, browserTtsFallback: e.target.checked }));
                                                                } catch {}
                                                            }}
                                                            aria-label={t('header.browser_tts_fallback_aria') || 'Use browser voice as fallback when Gemini TTS refuses or fails'}
                                                        />
                                                        <span className="text-[11px] leading-tight">
                                                            <span className="font-bold text-slate-600 dark:text-slate-200 block">{t('header.browser_tts_fallback_label') || 'Browser-voice fallback'}</span>
                                                            <span className="text-slate-600 dark:text-slate-400">{t('header.browser_tts_fallback_desc') || 'Read refused/failed sentences with the system voice instead of skipping.'}</span>
                                                        </span>
                                                    </label>
                                                </div>
                                                {/* ── Non-English Language TTS Indicator ── */}
                                                {_isCanvasEnv && leveledTextLanguage && leveledTextLanguage !== 'English' && (
                                                    <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                                                        <div className="text-[11px] uppercase font-bold text-blue-600 dark:text-blue-400">Active TTS: {leveledTextLanguage}</div>
                                                        <div className="text-[11px] text-blue-800 dark:text-blue-200 mt-0.5">
                                                            {window._piperTTS?.supportsLanguage(languageToTTSCode(leveledTextLanguage))
                                                                ? 'Piper Neural Voice \u2014 auto-selected'
                                                                : 'Browser fallback \u2014 language not yet supported'}
                                                        </div>
                                                        <div className="text-[11px] text-blue-500/70 dark:text-blue-400/70 mt-0.5">{t('header.kokoro_english_only') || 'Kokoro voice applies to English content'}</div>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 mt-3">
                                                    <div className="flex-1">
                                                        <label className={`text-[11px] uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} block mb-1`}>Speed: {voiceSpeed}x</label>
                                                        <input aria-label={t('common.range_slider')}
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
                                                        <label className={`text-[11px] uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} block mb-1`}>Volume: {Math.round(voiceVolume * 100)}%</label>
                                                        <input aria-label={t('common.range_slider')}
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
                                  title={t('dashboard.title')}
                                  aria-label={t('dashboard.title')}
                                >
                                  <Layout size={20} />
                                </button>
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
                                title={t('common.recall_hints')}
                                aria-label={t('common.recall_hints')}
                            >
                                <Lightbulb size={20} className={hintHistory.length > 0 ? "fill-yellow-500/20" : ""} />
                                {hintHistory.length > 0 && (
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
                                <span><span aria-hidden="true">&#128161;</span> Click <strong>?</strong> anytime for help!</span>
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
                              title={t('toolbar.setup_options') || 'Setup and Guided Mode'}
                              aria-label={t('toolbar.setup_options_aria') || 'Open setup and Guided Mode options'}
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
                    <div id="tour-header-actions" className={`w-full flex flex-wrap items-center justify-start gap-2 p-1.5 rounded-xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        <div className="w-full sm:w-auto flex flex-col items-start sm:flex-row sm:items-center gap-1.5 px-1 sm:pr-2 sm:border-r sm:border-white/10">
                            <span className="text-[11px] font-bold text-indigo-100/70 uppercase tracking-wider hidden md:block text-right leading-tight">
                                {t('header.app_language')}
                            </span>
                            <div className="max-w-full scale-90 origin-left sm:origin-center" data-help-key="header_language">
                                <UiLanguageSelector />
                            </div>
                        </div>
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
                          <span className="hidden lg:inline">AI</span>
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
                          <span className="hidden lg:inline">Tools</span>
                        </button>
                        )}
                        {isTeacherMode && setShowLearningHub && (
                        <button type="button"
                          onClick={() => setShowLearningHub(true)}
                          data-help-key="header_learning_hub"
                          className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                          title={t('header.learning_tools_tooltip') || 'Learning Tools (STEM Lab, SEL Hub, Research Hub, LitLab, PoetTree, StoryForge)'}
                          aria-label={t('header.learning_tools_aria') || 'Learning Tools'}
                        >
                          <span style={{fontSize:'14px',lineHeight:1}}>🧠</span>
                          <span className="hidden lg:inline">Learn</span>
                        </button>
                        )}
                        {isTeacherMode && !isIndependentMode && setBridgeSendOpen && (
                        <button type="button"
                          onClick={() => setBridgeSendOpen(true)}
                          data-help-key="header_bridge"
                          className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:bg-white/10 text-white/80 hover:text-white border border-white/10"
                          title={t('header.bridge_tooltip') || 'Family Bridge: live translation to talk with multilingual families & students'}
                          aria-label={t('header.bridge_aria') || 'Family Bridge translation'}
                        >
                          <span style={{fontSize:'14px',lineHeight:1}}>🌐</span>
                          <span className="hidden lg:inline">Bridge</span>
                        </button>
                        )}
                        <div className="w-px h-5 bg-white/10 mx-0.5"></div>
                        <div className="relative">
                            {isTeacherMode ? (
                                !isIndependentMode && (<>
                                <button type="button"
                                    aria-label={t('common.connect')}
                                    onClick={() => activeSessionCode ? setShowSessionModal(true) : startClassSession()}
                                    className={`px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border ${activeSessionCode ? 'bg-green-700 text-white border-green-400 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30'}`}
                                    data-help-key="header_session_start"
                                    title={t('session.start_tooltip')}
                                >
                                    <Wifi size={14} />
                                    {activeSessionCode ? `Live: ${activeSessionCode}` : <span className="hidden lg:inline">{t('session.start')}</span>}
                                </button>
                                </>)
                            ) : (
                                <div className="flex items-center">
                                    {activeSessionCode ? (
                                        <div className={`flex items-center gap-2 text-white px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm transition-colors ${sessionData ? 'bg-green-700 border-green-600' : 'bg-yellow-500 border-yellow-400'}`}>
                                            {sessionData ? <Wifi size={14} className="animate-pulse"/> : <RefreshCw size={14} className="animate-spin"/>}
                                            <span>{sessionData ? `Synced: ${activeSessionCode}` : `Connecting: ${activeSessionCode}`}</span>
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
                                                            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">{t('session.host_id_optional')}</label>
                                                            <input aria-label={t('common.session_default_placeholder')}
                                                                type="text"
                                                                value={joinAppIdInput}
                                                                onChange={(e) => setJoinAppIdInput(e.target.value)}
                                                                placeholder={t('session.default_placeholder', {id: appId})}
                                                                className="w-full text-xs border border-slate-400 rounded-xl p-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-slate-600 font-mono mb-2"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">{t('session.code')}</label>
                                                            <div className="flex gap-1">
                                                                <input aria-label={t('common.enter_join_code_input')}
                                                                    autoFocus
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
                        {isTeacherMode && (
                        <div className="relative">
                            <button type="button"
                                onClick={handleSetIsTranslateModalOpenToTrue}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30 mr-2"
                                title={t('header.translate_tooltip')}
                                data-help-key="header_translate"
                            >
                                <Languages size={14} /> <span className="hidden lg:inline">{t('header.translate_button')}</span>
                            </button>
                            <button type="button"
                                aria-label={t('header.documents_menu_aria') || 'Documents menu'}
                                aria-haspopup="menu"
                                aria-expanded={showExportMenu}
                                onClick={handleToggleShowExportMenu}
                                className={`bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border ${showExportMenu ? 'border-white/50 bg-white/20' : 'border-white/10 hover:border-white/30'}`}
                                data-help-key="header_export"
                                title={t('header.export_tooltip')}
                            >
                                <FileText size={14} /> <span className="hidden lg:inline">Documents</span> {showExportMenu ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            {showExportMenu && (
                                <div role="menu" aria-label={t('header.documents_menu_aria') || 'Documents menu'} onKeyDown={(e) => {
                                    const items = e.currentTarget.querySelectorAll('[role="menuitem"]:not([disabled])');
                                    const idx = Array.from(items).indexOf(document.activeElement);
                                    if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
                                    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
                                    else if (e.key === 'Escape') { setShowExportMenu(false); document.querySelector('[data-help-key="header_export"]')?.focus(); }
                                  }} ref={(el) => { if (el) { const first = el.querySelector('[role="menuitem"]'); if (first) first.focus(); } }} className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl p-2 border border-slate-400 z-[100] animate-in fade-in zoom-in-95 flex flex-col gap-1">
                                    <div className="text-xs font-black text-slate-800 px-2 py-1 flex items-center gap-1.5">{"\ud83d\udcc4"} Documents</div>
                                    <button type="button" role="menuitem" onClick={() => openExportPreview('print')} className="w-full px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-1">{"\ud83d\udee0\ufe0f"} Document Builder</button>
                                    {customExportCSS && <div className="text-[11px] text-green-600 font-medium px-2 mb-1">✓ Custom style active</div>}
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83d\udcc4"} Print & PDF</div>
                                    <button type="button" role="menuitem"
                                        aria-label={t('header.open_doc_builder_pdf_aria') || 'Open Document Builder for PDF'}
                                        onClick={() => openExportPreview('print')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-green-700 text-xs font-bold transition-colors"
                                        data-help-key="export_pdf"
                                    >
                                        <FileDown size={14} /> PDF / {t('export_menu.print')}
                                    </button>
                                    <button type="button" role="menuitem"
                                        onClick={() => openExportPreview('worksheet')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                                        data-help-key="export_worksheet"
                                    >
                                        <FileText size={14} /> {t('export_menu.worksheet')}
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83d\udcbb"} Digital Formats</div>
                                    <button type="button" role="menuitem"
                                        onClick={() => openExportPreview('html')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-colors"
                                        data-help-key="export_html"
                                    >
                                        <Code size={14} /> {t('export_menu.html')}
                                    </button>
                                    <button type="button" role="menuitem" aria-label={t('common.export_as_slides')}
                                        onClick={() => openExportPreview('slides')}
                                        disabled={!pptxLoaded} title={t('header.export_slides_tooltip') || 'Opens Document Builder in Slides mode'}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 text-orange-700 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        data-help-key="export_slides"
                                    >
                                        {!pptxLoaded ? <RefreshCw size={14} className="animate-spin"/> : <MonitorPlay size={14} />}
                                        {t('export_menu.slides')}
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">Student QR</div>
                                    <button type="button" role="menuitem"
                                        onClick={() => { if (typeof createHomeworkAssignmentLink === 'function') createHomeworkAssignmentLink(); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-50 text-cyan-700 text-xs font-bold transition-colors"
                                        data-help-key="homework_qr"
                                    >
                                        <Share2 size={14} /> Homework QR
                                    </button>
                                    <div className="px-3 pb-2">
                                      <label className="block text-[11px] font-bold text-slate-600" htmlFor="homework-qr-expiry">Homework link length</label>
                                      <select id="homework-qr-expiry" value={homeworkExpiryDays || 14} onChange={event => setHomeworkExpiryDays(Number(event.target.value) || 14)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                        <option value={1}>1 day</option>
                                        <option value={7}>1 week</option>
                                        <option value={14}>2 weeks</option>
                                        <option value={30}>30 days</option>
                                        <option value={90}>90 days (quarter)</option>
                                        <option value={180}>180 days (semester)</option>
                                        <option value={365}>365 days (school year)</option>
                                      </select>
                                      <button type="button" onClick={() => { if (typeof openRecentQrShares === 'function') openRecentQrShares(); setShowExportMenu(false); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:border-cyan-400 hover:text-cyan-800">
                                        <History size={14}/> Recent homework links{recentQrShareCount ? ` (${recentQrShareCount})` : ''}
                                      </button>
                                    </div>
                                    <p className="px-3 pb-2 text-[11px] leading-snug text-slate-500">{studentAiPolicyForShare === 'student-byok' ? 'Teacher-prepared resources open with optional personal AI. Students supply and test their own provider.' : 'Teacher-prepared resources open for students with AI generation off.'}</p>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83c\udfeb"} LMS Integration</div>
                                    {activeView === 'quiz' && !isIndependentMode && (
                                        <button type="button" role="menuitem"
                                            onClick={() => { handleExportQTI(); setShowExportMenu(false); }}
                                            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-teal-50 text-teal-700 text-xs font-bold transition-colors"
                                            data-help-key="export_qti"
                                        >
                                            <FolderDown size={14} /> {t('export_menu.qti')}
                                        </button>
                                    )}
                                    {!isIndependentMode && (
                                    <button type="button" role="menuitem"
                                        onClick={() => { handleExportIMS(); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-yellow-50 text-yellow-700 text-xs font-bold transition-colors"
                                        data-help-key="export_ims"
                                    >
                                        <FolderDown size={14} /> {t('export_menu.ims')}
                                    </button>
                                    )}
                                </div>
                            )}
                            {showExportMenu && <div aria-hidden="true" className="fixed inset-0 z-[90]" onClick={handleSetShowExportMenuToFalse}></div>}
                        </div>
                        )}
                            {isTeacherMode && (
                            <button type="button"
                                onClick={() => setShowClassAnalytics(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30 ring-1 ring-violet-400/40"
                                title={t('common.assessment_center') || 'Assessment Center'}
                                data-help-key="header_analytics"
                            >
                                <ClipboardList size={14} /> <span className="hidden lg:inline">{t('common.assessment_center') || 'Assessment Center'}</span>
                            </button>
                            )}
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
                  <h2 id="header-setup-options-title" className="text-sm font-black">{t('toolbar.setup_options_title') || 'Choose a setup path'}</h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t('toolbar.setup_options_desc') || 'Restart the setup wizard or turn on Guided Mode for step-by-step lesson building.'}</p>
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
