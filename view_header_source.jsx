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
    customExportCSS, dismissHelpOnboarding,
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
    setPendingRole, setRunTour,
    setSelectedVoice, setSessionData, setShowAIBackendModal,
    setShowClassAnalytics, setShowEducatorHub, setShowExportMenu, setShowNotebook, setShowReadThisPage,
    setShowSessionModal, setShowTextSettings, setShowVoiceSettings, setShowWizard,
    setSliderFontSize, setSpotlightMessage, setTourStep, setVoiceSpeed, setVoiceVolume,
    showExportMenu, showHelpOnboarding, showReadThisPage, showTextSettings,
    showVoiceSettings, sliderFontSize, startClassSession, t,
    voiceSpeed, voiceVolume,
  } = props;

  return (
      <header aria-label={t('common.main_application_header')} className={`p-6 md:py-8 md:px-10 shadow-2xl no-print relative z-50 transition-all duration-500 ${theme === 'contrast' ? 'bg-black border-b-4 border-yellow-400' : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900 via-indigo-950 to-slate-900 text-white'}`}>
        <div className="w-full max-w-[98%] mx-auto relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h1 className={`text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3 ${theme === 'contrast' ? 'text-yellow-400' : 'text-white drop-shadow-sm'}`}>
                <Layers className="w-10 h-10" aria-hidden="true" />
                {t('header.app_name')}
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
              <p className={`mt-2 text-sm font-medium opacity-90 ${theme === 'contrast' ? 'text-yellow-400' : 'text-indigo-100'}`}>
                {t('header.tagline')}
              </p>
              <p className={`text-[11px] mt-1 ${theme === 'contrast' ? 'text-yellow-400' : 'text-indigo-300/80'}`}>
                {t('header.rights')}
              </p>
              <p className={`text-[11px] mt-1 font-medium flex items-center gap-1 ${theme === 'contrast' ? 'text-red-400' : 'text-orange-200'}`}>
                <AlertCircle size={10} /> {t('header.pii_warning')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-4 flex-wrap justify-end relative">
                    <button
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
                    <div id="tour-header-settings" className={`relative z-[60] flex items-center gap-2 p-2 rounded-2xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        <GlobalMuteButton className={`px-3 py-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`} />
                        <button
                            onClick={() => setShowReadThisPage(prev => !prev)}
                            data-help-key="read_this_page_toggle"
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${showReadThisPage || focusNarrationEnabled ? 'ring-2 ring-purple-400 !bg-purple-600 !text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : ''} ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                            title={showReadThisPage ? 'Close Read This Page' : 'Read This Page — hear page content and UI narration'}
                            aria-label={showReadThisPage ? 'Close Read This Page panel' : 'Open Read This Page — audio narration of current content'}
                        >
                            <Ear size={18} aria-hidden="true" className={showReadThisPage ? 'animate-pulse' : ''} />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => { setShowTextSettings(!showTextSettings); setShowVoiceSettings(false); }}
                                data-help-key="header_settings_text"
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                                title={t('immersive.settings_label')}
                                aria-label={t('immersive.settings_label')}
                            >
                                <Type size={18} aria-hidden="true"/>
                                <span className="text-xs font-bold hidden xl:inline">{t('immersive.label_text')}</span>
                                {showTextSettings ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            {showTextSettings && (
                                <>
                                    <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[10000]" onClick={handleSetShowTextSettingsToFalse}></div>
                                    <div className={`fixed top-28 right-20 w-72 p-5 rounded-xl shadow-2xl border z-[10001] animate-in fade-in zoom-in-95 duration-200 ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-600 text-white'}`}>
                                        <div className="space-y-5">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                                <h4 className="font-bold text-sm">{t('settings.text.header')}</h4>
                                                <button onClick={resetFontSize} data-help-key="header_settings_text_reset" className="text-[11px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-1"><RefreshCw size={10}/> {t('common.reset')}</button>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-600">{t('settings.text.font_family')}</label>
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
                                            <button
                                                aria-label={t('common.toggle_focus_mode')}
                                                onClick={handleToggleFocusMode}
                                                data-help-key="header_settings_text_bionic"
                                                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all group ${focusMode ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-400 dark:text-indigo-100' : 'bg-slate-50 border-transparent hover:border-slate-300 dark:bg-slate-700 dark:text-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-1.5 rounded-md ${focusMode ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-600'}`}>
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
                                                    <label className="text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-600">{t('settings.text.size')}</label>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{baseFontSize}px</span>
                                                </div>
                                            <div className="flex items-center gap-3" data-help-key="header_settings_text_size">
                                                    <button onClick={() => { setBaseFontSize(Math.max(12, baseFontSize - 1)); setSliderFontSize(Math.max(12, baseFontSize - 1)); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Minimize size={14}/></button>
                                                    <input aria-label={t('common.adjust_slider_font_size')}
                                                        type="range" min="12" max="24" step="1"
                                                        value={sliderFontSize}
                                                        onChange={(e) => setSliderFontSize(parseInt(e.target.value))}
                                                        onMouseUp={() => setBaseFontSize(sliderFontSize)}
                                                        onTouchEnd={() => setBaseFontSize(sliderFontSize)}
                                                        className="flex-grow h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                    />
                                                    <button aria-label={t('common.maximize')} onClick={() => { setBaseFontSize(Math.min(24, baseFontSize + 1)); setSliderFontSize(Math.min(24, baseFontSize + 1)); }} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Maximize size={14}/></button>
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-600">{t('settings.text.line_height')}</label>
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
                                                    <label className="text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-600">{t('settings.text.spacing')}</label>
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
                                                    <label className="text-xs font-bold flex items-center gap-1 text-slate-600 dark:text-slate-600">{t('settings.reading_theme') || '🎨 Reading Theme'}</label>
                                                    <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{readingTheme === 'default' ? 'Default' : readingTheme}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 mb-2">{t('settings.reading_theme_desc') || 'Background & text color for all content views'}</p>
                                                <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('header.reading_theme_aria') || 'Reading theme'}>
                                                    {[
                                                        { id: 'default', label: 'Default', bg: '#ffffff', fg: '#1e293b', border: '#e2e8f0', emoji: '○' },
                                                        { id: 'warm', label: 'Warm', bg: '#fef3c7', fg: '#5c4033', border: '#fde68a', emoji: '☀️' },
                                                        { id: 'sepia', label: 'Sepia', bg: '#f4ecd8', fg: '#5c4033', border: '#d4c5a9', emoji: '📜' },
                                                        { id: 'dark', label: 'Dark', bg: '#1a1a2e', fg: '#e2e8f0', border: '#334155', emoji: '🌙' },
                                                        { id: 'highContrast', label: 'Contrast', bg: '#000000', fg: '#ffff00', border: '#ffff00', emoji: '◼️' },
                                                        { id: 'blue', label: 'Blue', bg: '#d6eaf8', fg: '#1b2631', border: '#85c1e9', emoji: '💧' },
                                                        { id: 'green', label: 'Green', bg: '#e8f5e9', fg: '#1b5e20', border: '#81c784', emoji: '🌿' },
                                                        { id: 'rose', label: 'Rose', bg: '#fce4ec', fg: '#880e4f', border: '#f48fb1', emoji: '🌸' },
                                                        { id: 'dyslexia', label: 'Easy Read', bg: '#faf8ef', fg: '#1e293b', border: '#e8e0c8', emoji: '🔤' },
                                                    ].map(function(th) {
                                                        var isActive = readingTheme === th.id;
                                                        return <button key={th.id}
                                                            role="radio" aria-checked={isActive} aria-label={th.label + ' theme'}
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
                            <button
                                onClick={() => { setShowVoiceSettings(!showVoiceSettings); setShowTextSettings(false); }}
                                data-help-key="header_settings_voice"
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${theme === 'light' ? 'bg-white/10 hover:bg-white/20 text-white' : theme === 'contrast' ? 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold' : 'hover:bg-white/10 text-white'}`}
                                title={t('settings.voice.label')}
                                aria-label={t('settings.voice.label')}
                            >
                                <Headphones size={18} aria-hidden="true"/>
                                <span className="text-xs font-bold hidden xl:inline">{t('immersive.label_voice')}</span>
                                {showVoiceSettings ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </button>
                            {showVoiceSettings && (
                                <>
                                    <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[10000]" onClick={handleSetShowVoiceSettingsToFalse}></div>
                                    <div className={`fixed top-28 right-4 w-64 p-5 rounded-xl shadow-2xl border z-[10001] animate-in fade-in zoom-in-95 duration-200 ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-600 text-white'}`}>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                                <h4 className="font-bold text-sm">{t('settings.voice.label')}</h4>
                                            </div>
                                            <div>
                                                <select aria-label={t('common.selection')}
                                                    value={selectedVoice}
                                                    onChange={(e) => {
                                                      const voice = e.target.value;
                                                      setSelectedVoice(voice);
                                                      if (_isCanvasEnv && KOKORO_VOICES.some(v => v.id === voice) && !window._kokoroTTS?.ready && window.__loadKokoroTTS) {
                                                        window.__kokoroTTSDownloading = true;
                                                        addToast('Downloading Kokoro voice model (~40MB)...', 'info');
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
                                                            <optgroup label={window._kokoroTTS?.ready ? "🎤 Kokoro (Ready)" : "🎤 Kokoro (tap to download ~40MB)"}>
                                                                {KOKORO_VOICES.map(v => (
                                                                    <option key={v.id} value={v.id}>{v.label}{!window._kokoroTTS?.ready ? ' ⬇' : ''}</option>
                                                                ))}
                                                            </optgroup>
                                                            <optgroup label="🌐 Browser Fallback">
                                                                <option value="browser">{t('header.voice_browser_default') || 'Browser Default'}</option>
                                                            </optgroup>
                                                        </>
                                                    ) : (ai?._ttsProvider === 'local' || (ai?._ttsProvider !== 'gemini' && ai?._ttsProvider !== 'browser' && (ai?.backend === 'ollama' || ai?.backend === 'localai'))) ? (
                                                        <>
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
                                                {/* ── Kokoro Quality Toggle (only visible for Kokoro voices) ── */}
                                                {_isCanvasEnv && selectedVoice && selectedVoice.includes('_') && window._kokoroTTS && (
                                                    <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-400 dark:border-slate-600">
                                                        <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1.5">{t('header.voice_quality_label') || 'Voice Quality'}</label>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => { window._kokoroTTS.setQuality('fast'); }}
                                                                className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-md transition-all ${
                                                                    !window._kokoroTTS.quality || window._kokoroTTS.quality === 'fast'
                                                                        ? 'bg-indigo-500 text-white shadow-sm'
                                                                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                                                }`}
                                                            >
                                                                ⚡ Fast (~43MB)
                                                            </button>
                                                            <button
                                                                onClick={() => { window._kokoroTTS.setQuality('high'); }}
                                                                className={`flex-1 text-[11px] font-bold px-2 py-1.5 rounded-md transition-all ${
                                                                    window._kokoroTTS.quality === 'high'
                                                                        ? 'bg-emerald-700 text-white shadow-sm'
                                                                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                                                }`}
                                                            >
                                                                🎵 High Quality (~86MB)
                                                            </button>
                                                        </div>
                                                        <p className="text-[11px] text-slate-600 mt-1">{t('header.voice_quality_desc') || 'Fast uses a smaller model for quicker response. High Quality is richer but slower.'}</p>
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
                                                        <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">Speed: {voiceSpeed}x</label>
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
                                                        <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">Volume: {Math.round(voiceVolume * 100)}%</label>
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
                                                <p className="text-[11px] text-slate-600 mt-2 italic leading-tight">
                                                    {t('settings.voice.helper')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="w-px h-6 bg-white/20 mx-1"></div>
                        <button
                          onClick={handleToggleDisableAnimations}
                          data-help-key="header_settings_anim"
                          className={`p-2 rounded-xl transition-all flex items-center gap-2 ${disableAnimations ? 'bg-red-700 text-white shadow-lg' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                          title={disableAnimations ? t('a11y.anim_enable') : t('a11y.anim_disable')}
                          aria-label={t('a11y.anim_toggle')}
                        >
                          {disableAnimations ? <ZapOff size={20} aria-hidden="true" /> : <Zap size={20} aria-hidden="true" />}
                        </button>
                        <button
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
                        <button
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
                            <button
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
                                <button
                                  onClick={handleSetActiveViewToDashboard}
                                  data-help-key="header_dashboard"
                                  className={`p-2 rounded-xl transition-all flex items-center gap-2 ${activeView === 'dashboard' ? 'bg-white text-indigo-900 shadow-lg' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}
                                  title={t('dashboard.title')}
                                  aria-label={t('dashboard.title')}
                                >
                                  <Layout size={20} />
                                </button>
                                {latestLessonPlan && (
                                    <button
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
                                    <button
                                        onClick={() => setShowNotebook(true)}
                                        data-help-key="header_open_notebook"
                                        className="p-2 rounded-xl transition-all flex items-center gap-1.5 hover:bg-white/10 text-white/80 hover:text-white"
                                        title={`Open my notebook (${notebookEntryCount} ${notebookEntryCount === 1 ? 'entry' : 'entries'})`}
                                        aria-label={`Open my notebook, ${notebookEntryCount} ${notebookEntryCount === 1 ? 'entry' : 'entries'}`}
                                    >
                                        <BookOpen size={20} />
                                        <span className="text-[10px] font-bold leading-none bg-white/20 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{notebookEntryCount}</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <div id="tour-header-utils" className={`relative z-[100] flex items-center gap-3 p-2 rounded-2xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        {isTeacherMode && (
                            <button
                                onClick={handleSetShowHintsModalToTrue}
                                data-help-key="hints_recall"
                                className="p-2 rounded-xl hover:bg-white/10 text-yellow-300 transition-colors relative"
                                title={t('common.recall_hints')}
                                aria-label={t('common.recall_hints')}
                            >
                                <Lightbulb size={20} className={hintHistory.length > 0 ? "fill-yellow-500/20" : ""} />
                                {hintHistory.length > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white/50"></span>
                                )}
                            </button>
                        )}
                        <button
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
                        <button
                            data-help-ignore="true"
                            onClick={handleToggleIsHelpMode}
                            className={`p-2 rounded-xl transition-colors ${isHelpMode ? 'bg-yellow-400 text-slate-900 shadow-md animate-pulse' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                            title={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
                            aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
                        >
                            <CircleHelp size={20} />
                        </button>
                        {showHelpOnboarding && !isHelpMode && (
                            <div
                                onClick={dismissHelpOnboarding}
                                className="absolute -bottom-14 right-0 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg cursor-pointer animate-bounce z-[10999] whitespace-nowrap border-2 border-indigo-400"
                                style={{ minWidth: '160px', textAlign: 'center' }}
                            >
                                <div className="absolute -top-2 right-4 w-4 h-4 bg-indigo-600 rotate-45 border-l-2 border-t-2 border-indigo-400"></div>
                                <span>💡 Click <strong>?</strong> anytime for help!</span>
                            </div>
                        )}
                        </div>
                        {isTeacherMode && (
                            <button
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
                            <button
                              onClick={() => { setRunTour(true); setTourStep(0); setSpotlightMessage(''); }}
                              data-help-key="header_tour_start"
                              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                              title={t('toolbar.start_tour')}
                              aria-label={t('toolbar.start_tour_aria')}
                            >
                              <MapIcon size={20} />
                            </button>
                            <button
                              onClick={() => { safeRemoveItem('allo_wizard_completed'); setShowWizard(true); }}
                              data-help-key="header_rerun_wizard"
                              className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                              title={t('toolbar.rerun_wizard') || 'Re-run Setup Wizard'}
                              aria-label={t('toolbar.rerun_wizard_aria') || 'Re-run the QuickStart setup wizard'}
                            >
                              <Sparkles size={20} />
                            </button>
                            </>
                        )}
                        <button
                          onClick={handleSetShowInfoModalToTrue}
                          data-help-key="header_about"
                          className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                          title={t('toolbar.about_label')}
                          aria-label={t('toolbar.about_aria')}
                        >
                          <Info size={20} />
                        </button>
                        <a
                            href="https://Ko-fi.com/aaronpomeranz207"
                            target="_blank"
                            rel="noopener noreferrer"
                            data-help-key="header_support"
                            className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"
                            title={t('header.support_tooltip')}
                            aria-label={t('header.support_aria')}
                        >
                            <Heart size={20} className={isProcessing || isExtracting || isGeneratingSource ? "animate-pulse fill-current" : ""} />
                        </a>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 justify-end relative z-10 mt-2">
                    <div id="tour-header-actions" className={`flex items-center gap-2 p-1.5 rounded-xl backdrop-blur-xl border shadow-inner transition-all ${theme === 'contrast' ? 'border-yellow-400 bg-black' : 'bg-white/10 border-white/20'}`}>
                        <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1.5 px-1 sm:pr-2 sm:border-r sm:border-white/10">
                            <span className="text-[11px] font-bold text-indigo-100/70 uppercase tracking-wider hidden md:block text-right leading-tight">
                                {t('header.app_language')}
                            </span>
                            <div className="scale-90 origin-right sm:origin-center" data-help-key="header_language">
                                <UiLanguageSelector />
                            </div>
                        </div>
                        {!_isCanvasEnv && isTeacherMode && (
                        <button
                          onClick={() => setShowAIBackendModal(true)}
                          data-help-key="header_ai_backend"
                          className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider ${
                            (() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').backend && JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').backend !== 'gemini'; } catch { return false; } })()
                              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/50'
                              : 'hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                          }`}
                          title={t('header.ai_backend_config') || 'AI Backend Configuration'}
                          aria-label={t('header.ai_backend_config') || 'AI Backend Configuration'}
                        >
                          <Unplug size={14} aria-hidden="true" />
                          <span className="hidden lg:inline">AI</span>
                        </button>
                        )}
                        {isTeacherMode && (
                        <button
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
                        <div className="w-px h-5 bg-white/10 mx-0.5"></div>
                        <div className="relative">
                            {isTeacherMode ? (
                                !isIndependentMode && (<>
                                <button
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
                                            <button
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
                                            <button
                                                onClick={handleToggleIsJoinPopoverOpen}
                                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30"
                                                data-help-key="header_session_join"
                                                title={t('session.join_tooltip')}
                                            >
                                                <WifiOff size={14} /> <span className="hidden lg:inline">{t('session.join')}</span>
                                            </button>
                                            {isJoinPopoverOpen && (
                                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl p-3 border border-slate-400 z-[100] animate-in fade-in zoom-in-95">
                                                    <div className="space-y-2">
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
                                                                    maxLength={4}
                                                                    className="w-full text-center font-mono font-bold text-lg border border-slate-400 rounded p-1 uppercase focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                                                                />
                                                                <button
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
                                                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[90]" onClick={handleSetIsJoinPopoverOpenToFalse}></div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {isTeacherMode && (
                        <div className="relative">
                            <button
                                onClick={handleSetIsTranslateModalOpenToTrue}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30 mr-2"
                                title={t('header.translate_tooltip')}
                                data-help-key="header_translate"
                            >
                                <Languages size={14} /> <span className="hidden lg:inline">{t('header.translate_button')}</span>
                            </button>
                            <button
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
                                    <button role="menuitem" onClick={() => openExportPreview('print')} className="w-full px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mb-1">{"\ud83d\udee0\ufe0f"} Document Builder</button>
                                    {customExportCSS && <div className="text-[11px] text-green-600 font-medium px-2 mb-1">✓ Custom style active</div>}
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83d\udcc4"} Print & PDF</div>
                                    <button role="menuitem"
                                        aria-label={t('header.open_doc_builder_pdf_aria') || 'Open Document Builder for PDF'}
                                        onClick={() => openExportPreview('print')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-green-700 text-xs font-bold transition-colors"
                                        data-help-key="export_pdf"
                                    >
                                        <FileDown size={14} /> PDF / {t('export_menu.print')}
                                    </button>
                                    <button role="menuitem"
                                        onClick={() => openExportPreview('worksheet')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                                        data-help-key="export_worksheet"
                                    >
                                        <FileText size={14} /> {t('export_menu.worksheet')}
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83d\udcbb"} Digital Formats</div>
                                    <button role="menuitem"
                                        onClick={() => openExportPreview('html')}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-colors"
                                        data-help-key="export_html"
                                    >
                                        <Code size={14} /> {t('export_menu.html')}
                                    </button>
                                    <button role="menuitem" aria-label={t('common.export_as_slides')}
                                        onClick={() => openExportPreview('slides')}
                                        disabled={!pptxLoaded} title={t('header.export_slides_tooltip') || 'Opens Document Builder in Slides mode'}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 text-orange-700 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        data-help-key="export_slides"
                                    >
                                        {!pptxLoaded ? <RefreshCw size={14} className="animate-spin"/> : <MonitorPlay size={14} />}
                                        {t('export_menu.slides')}
                                    </button>
                                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1 border-t border-slate-100 mt-1">{"\ud83c\udfeb"} LMS Integration</div>
                                    {activeView === 'quiz' && !isIndependentMode && (
                                        <button role="menuitem"
                                            onClick={() => { handleExportQTI(); setShowExportMenu(false); }}
                                            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-teal-50 text-teal-700 text-xs font-bold transition-colors"
                                            data-help-key="export_qti"
                                        >
                                            <FolderDown size={14} /> {t('export_menu.qti')}
                                        </button>
                                    )}
                                    {!isIndependentMode && (
                                    <button role="menuitem"
                                        onClick={() => { handleExportIMS(); setShowExportMenu(false); }}
                                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-yellow-50 text-yellow-700 text-xs font-bold transition-colors"
                                        data-help-key="export_ims"
                                    >
                                        <FolderDown size={14} /> {t('export_menu.ims')}
                                    </button>
                                    )}
                                </div>
                            )}
                            {showExportMenu && <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[90]" onClick={handleSetShowExportMenuToFalse}></div>}
                        </div>
                        )}
                            <button
                                onClick={() => setShowClassAnalytics(true)}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-colors text-xs border border-white/10 hover:border-white/30 ring-1 ring-violet-400/40"
                                title={t('common.assessment_center') || 'Assessment Center'}
                                data-help-key="header_analytics"
                            >
                                <ClipboardList size={14} /> <span className="hidden lg:inline">{t('common.assessment_center') || 'Assessment Center'}</span>
                            </button>
                        {!isTeacherMode && (
                            <button
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
      </header>
  );
}
