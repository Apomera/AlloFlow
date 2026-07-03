/**
 * AlloFlow — Student Save + Adventure Panel Module
 *
 * Two sidebar panels stacked for students-in-session:
 *   1) Save banner: Load from file / Save to disk / Submit-for-grading buttons.
 *   2) Adventure panel: locked until XP threshold, then Resume/New game CTAs
 *      (or "session active" view when in a live class session).
 *
 * Extracted from AlloFlowANTI.txt lines 21439-21548 (May 2026).
 *
 * Required props (14):
 *   activeSessionCode, globalPoints, handleResumeAdventure,
 *   handleSetShowSubmitModalToTrue, handleStartAdventure, hasSavedAdventure,
 *   initiateSaveStudentProject, isResumingAdventure, isSaveActionPulsing,
 *   projectFileInputRef, sessionData, studentProjectSettings, t
 *
 * Icons (from window globals): Save, FolderOpen, Download, Send, MapIcon,
 * CheckCircle2, Lock, RefreshCw, History, Sparkles, Wifi
 */
const StudentSaveThemeFallbackContext = (window.React && window.React.createContext)
  ? window.React.createContext({ theme: 'light', colorOverlay: 'none' })
  : null;

const cx = (...parts) => parts.filter(Boolean).join(' ');

function getStudentSaveThemeStyles(themeContext = {}) {
  const theme = themeContext.theme || 'light';
  const colorOverlay = themeContext.colorOverlay || 'none';
  if (theme === 'contrast') {
    return {
      savePanel: 'bg-black text-white border-4 border-yellow-400 shadow-none',
      saveIcon: 'bg-black text-yellow-400 border-2 border-yellow-400',
      saveTitle: 'text-yellow-400',
      saveText: 'text-white',
      adventurePanel: 'bg-black text-white border-4 border-yellow-400 shadow-none',
      adventureHeader: 'bg-black border-b-4 border-yellow-400',
      adventureTitle: 'text-yellow-400',
      iconBubble: 'bg-black text-yellow-400 border-2 border-yellow-400',
      muted: 'text-white',
      accentText: 'text-yellow-400',
      progressTrack: 'bg-black border-2 border-white',
      progressFill: 'bg-yellow-400',
      progressLabel: 'text-yellow-400',
      unlockedBadge: 'bg-yellow-400 text-black border-2 border-yellow-400',
      livePanel: 'bg-black border-2 border-yellow-400',
      liveTitle: 'text-yellow-400',
      liveText: 'text-white',
      primaryTeal: 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-yellow-400 shadow-none',
      primaryIndigo: 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-yellow-400 shadow-none',
      primaryPurple: 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-yellow-400 shadow-none',
      secondary: 'bg-black text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black',
      secondaryPurple: 'bg-black text-yellow-400 border-2 border-yellow-400 hover:bg-yellow-400 hover:text-black',
      focusOffset: 'focus-visible:ring-offset-black',
      focusTeal: 'focus-visible:ring-yellow-400',
      focusIndigo: 'focus-visible:ring-yellow-400',
      focusPurple: 'focus-visible:ring-yellow-400',
    };
  }
  if (theme === 'dark') {
    return {
      savePanel: 'bg-slate-900 text-slate-100 border-2 border-teal-700 shadow-lg shadow-slate-950/50',
      saveIcon: 'bg-teal-950 text-teal-200 border border-teal-700',
      saveTitle: 'text-teal-100',
      saveText: 'text-slate-300',
      adventurePanel: 'bg-slate-900 text-slate-100 border border-slate-700 shadow-lg shadow-slate-950/50',
      adventureHeader: 'bg-slate-800 border-b border-slate-700',
      adventureTitle: 'text-purple-200',
      iconBubble: 'bg-slate-800 text-slate-200 border border-slate-700',
      muted: 'text-slate-300',
      accentText: 'text-purple-300',
      progressTrack: 'bg-slate-950 border border-slate-600',
      progressFill: 'bg-purple-400',
      progressLabel: 'text-slate-300',
      unlockedBadge: 'bg-emerald-950 text-emerald-200 border border-emerald-700',
      livePanel: 'bg-indigo-950/80 border border-indigo-700',
      liveTitle: 'text-indigo-100',
      liveText: 'text-indigo-200',
      primaryTeal: 'bg-teal-700 hover:bg-teal-600 text-white shadow-none',
      primaryIndigo: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-none',
      primaryPurple: 'bg-purple-600 hover:bg-purple-500 text-white shadow-none',
      secondary: 'bg-slate-950 text-slate-100 border border-slate-600 hover:bg-slate-800',
      secondaryPurple: 'bg-slate-950 text-slate-100 border border-slate-600 hover:bg-slate-800',
      focusOffset: 'focus-visible:ring-offset-slate-900',
      focusTeal: 'focus-visible:ring-teal-400',
      focusIndigo: 'focus-visible:ring-indigo-400',
      focusPurple: 'focus-visible:ring-purple-400',
    };
  }
  const savePanel = colorOverlay === 'blue' ? 'bg-blue-50 border-2 border-blue-200 shadow-blue-500/10'
    : colorOverlay === 'peach' ? 'bg-orange-50 border-2 border-orange-200 shadow-orange-500/10'
    : colorOverlay === 'yellow' ? 'bg-yellow-50 border-2 border-yellow-300 shadow-yellow-500/10'
    : 'bg-teal-50 border-2 border-teal-200 shadow-teal-500/10';
  return {
    savePanel,
    saveIcon: 'bg-teal-100 text-teal-600',
    saveTitle: 'text-teal-900',
    saveText: 'text-teal-800',
    adventurePanel: 'bg-white border border-slate-400 shadow-lg shadow-purple-500/10',
    adventureHeader: 'bg-purple-50 border-b border-purple-100',
    adventureTitle: 'text-purple-800',
    iconBubble: 'bg-slate-100 text-slate-600',
    muted: 'text-slate-600',
    accentText: 'text-purple-600',
    progressTrack: 'bg-slate-100 border border-slate-400',
    progressFill: 'bg-purple-500',
    progressLabel: 'text-slate-600',
    unlockedBadge: 'bg-green-100 text-green-700 border border-green-200',
    livePanel: 'bg-indigo-50 border border-indigo-200',
    liveTitle: 'text-indigo-800',
    liveText: 'text-indigo-600',
    primaryTeal: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm',
    primaryIndigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
    primaryPurple: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 hover:shadow-purple-300',
    secondary: 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-100',
    secondaryPurple: 'bg-white text-purple-700 border-2 border-purple-200 hover:bg-purple-50',
    focusOffset: 'focus-visible:ring-offset-white',
    focusTeal: 'focus-visible:ring-teal-700',
    focusIndigo: 'focus-visible:ring-indigo-600',
    focusPurple: 'focus-visible:ring-purple-600',
  };
}

function StudentSaveAdventurePanel({
  activeSessionCode,
  globalPoints,
  handleResumeAdventure,
  handleSetShowSubmitModalToTrue,
  handleStartAdventure,
  hasSavedAdventure,
  initiateSaveStudentProject,
  isResumingAdventure,
  isSaveActionPulsing,
  projectFileInputRef,
  sessionData,
  studentProjectSettings,
  t,
}) {
  const noop = () => null;
  const Save = window.Save || noop;
  const FolderOpen = window.FolderOpen || (window.AlloIcons && window.AlloIcons.FolderOpen) || noop;
  const Download = window.Download || noop;
  const Send = window.Send || noop;
  const MapIcon = window.MapIcon || noop;
  const CheckCircle2 = window.CheckCircle2 || noop;
  const Lock = window.Lock || noop;
  const RefreshCw = window.RefreshCw || noop;
  const History = window.History || noop;
  const Sparkles = window.Sparkles || noop;
  const Wifi = window.Wifi || noop;
  const saveTitleId = 'student-save-panel-title';
  const adventureTitleId = 'student-adventure-panel-title';
  const adventureProgressId = 'student-adventure-progress-label';
  const unlockXp = Math.max(1, Number(studentProjectSettings?.adventureUnlockXP || 1));
  const boundedPoints = Math.max(0, Math.min(globalPoints, unlockXp));
  const adventureProgress = Math.min(100, (boundedPoints / unlockXp) * 100);
  const themeContext = React.useContext(window.AlloThemeContext || StudentSaveThemeFallbackContext);
  const styles = getStudentSaveThemeStyles(themeContext);

  return (
    <>
      <section
        className={cx(styles.savePanel, 'rounded-3xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-left-4 shadow-lg')}
        aria-labelledby={saveTitleId}
      >
        <div className="flex items-center gap-3">
          <div className={cx(styles.saveIcon, 'p-2 rounded-full')} aria-hidden="true">
            <Save size={20} />
          </div>
          <div>
            <h4 id={saveTitleId} className={cx('font-bold text-sm', styles.saveTitle)}>{t('student.save_banner_title')}</h4>
            <p className={cx('text-xs', styles.saveText)}>{t('student.save_banner_desc')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label={t('student.load_file')}
            onClick={() => projectFileInputRef.current?.click()}
            className={cx('px-4 py-2 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.secondary, styles.focusTeal, styles.focusOffset)}
          >
            <FolderOpen size={14} aria-hidden="true"/> {t('student.load_file')}
          </button>
          <button
            type="button"
            aria-label={t('student.save_drive')}
            onClick={initiateSaveStudentProject}
            className={cx('px-4 py-2 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryTeal, styles.focusTeal, styles.focusOffset, isSaveActionPulsing ? 'pulse-history shadow-teal-500/50' : '')}
          >
            <Download size={14} aria-hidden="true"/> {t('student.save_drive')}
          </button>
          <button
            type="button"
            aria-label={t('common.export_for_grading')}
            onClick={handleSetShowSubmitModalToTrue}
            className={cx('px-4 py-2 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryIndigo, styles.focusIndigo, styles.focusOffset)}
            title={t('common.export_for_grading')}
          >
            <Send size={14} aria-hidden="true"/> {t('common.submit')}
          </button>
        </div>
      </section>
      <section className={cx(styles.adventurePanel, 'rounded-3xl shadow-lg overflow-hidden shrink-0 mb-4')} aria-labelledby={adventureTitleId}>
        <div className={cx(styles.adventureHeader, 'p-3 flex justify-between items-center')}>
          <div id={adventureTitleId} className={cx('text-sm font-bold flex items-center gap-2', styles.adventureTitle)}>
            <MapIcon size={16} aria-hidden="true" /> {t('adventure.title')}
          </div>
          {globalPoints >= studentProjectSettings.adventureUnlockXP && (
            <span className={cx('text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1', styles.unlockedBadge)} role="status"><CheckCircle2 size={10} aria-hidden="true"/> {t('adventure.unlocked')}</span>
          )}
        </div>
        <div className="p-4">
          {globalPoints < studentProjectSettings.adventureUnlockXP ? (
            <div className="space-y-3">
              <div className={cx('flex items-center gap-3 mb-2', styles.muted)}>
                <div className={cx('p-2 rounded-full', styles.iconBubble)} aria-hidden="true"><Lock size={20}/></div>
                <div className="text-xs">
                  <strong className={cx('block', styles.adventureTitle)}>{t('adventure.locked_status')}</strong>
                  {t('adventure.earn')} <span className={cx('font-bold', styles.accentText)}>{studentProjectSettings.adventureUnlockXP} XP</span> {t('adventure.to_unlock')}
                </div>
              </div>
              <div
                className={cx('w-full rounded-full h-2.5 overflow-hidden', styles.progressTrack)}
                role="progressbar"
                aria-labelledby={adventureProgressId}
                aria-valuemin={0}
                aria-valuemax={unlockXp}
                aria-valuenow={boundedPoints}
              >
                <div
                  className={cx('h-full transition-all duration-1000', styles.progressFill)}
                  style={{ width: `${adventureProgress}%` }}
                ></div>
              </div>
              <div id={adventureProgressId} className={cx('text-[11px] text-right font-mono', styles.progressLabel)}>
                {globalPoints} / {studentProjectSettings.adventureUnlockXP} XP
              </div>
            </div>
          ) : (
            !activeSessionCode ? (
              <div className="flex flex-col gap-2">
                {hasSavedAdventure ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-label={t('common.resume_saved_adventure')}
                      data-help-key="adventure_resume_btn" onClick={handleResumeAdventure}
                      disabled={isResumingAdventure}
                      className={cx('w-full py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryPurple, styles.focusPurple, styles.focusOffset)}
                    >
                      {isResumingAdventure ? <RefreshCw size={18} className="animate-spin" aria-hidden="true" /> : <History size={18} aria-hidden="true"/>}
                      {t('adventure.resume')}
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.start_adventure')}
                      data-help-key="adventure_start_btn" onClick={handleStartAdventure}
                      disabled={isResumingAdventure}
                      className={cx('w-full py-3 rounded-xl font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.secondaryPurple, styles.focusPurple, styles.focusOffset)}
                    >
                      <Sparkles size={18} aria-hidden="true"/> {t('adventure.new_game')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={t('common.start_adventure')}
                    data-help-key="adventure_start_btn" onClick={handleStartAdventure}
                    className={cx('w-full py-3 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryPurple, styles.focusPurple, styles.focusOffset)}
                  >
                    <Sparkles size={18} aria-hidden="true"/> {t('adventure.start')}
                  </button>
                )}
              </div>
            ) : (
              <div className={cx('p-4 rounded-xl text-center', styles.livePanel)} role="status" aria-live="polite">
                <p className={cx('text-sm font-bold mb-1', styles.liveTitle)}>
                  <Wifi size={16} className="inline mr-1 animate-pulse" aria-hidden="true"/> {t('session.live_active')}
                </p>
                <p className={cx('text-xs', styles.liveText)}>
                  {sessionData?.democracy?.isActive ? t('session.vote_prompt') : t('session.watch_prompt')}
                </p>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}
