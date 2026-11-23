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
 *   activeSessionCode, globalPoints, handleResumeAdventure, isAdventureAvailable,
 *   handleSetShowSubmitModalToTrue, handleStartAdventure, hasSavedAdventure,
 *   initiateSaveStudentProject, isResumingAdventure, isSaveActionPulsing,
 *   projectFileInputRef, sessionData, studentProjectSettings, t
 *
 * Icons (from window globals): Save, FolderOpen, Download, Send, MapIcon,
 * CheckCircle2, Lock, RefreshCw, History, Sparkles, Wifi
 */
const StudentSaveThemeFallbackContext = (typeof window !== 'undefined' && window.React && window.React.createContext)
  ? window.React.createContext({ theme: 'light', colorOverlay: 'none' })
  : (typeof React !== 'undefined' && React && React.createContext ? React.createContext({ theme: 'light', colorOverlay: 'none' }) : null);

const cx = (...parts) => parts.filter(Boolean).join(' ');
// Solo Adventure turns need text AI; the live class adventure does not (the teacher's device generates).
function _aiUsable(kind, fn, studentProjectSettings) {
  if (studentProjectSettings && studentProjectSettings.hideStudentAiFeatures === true) return false;
  if (typeof window !== 'undefined') {
    const qr = window.__alloQrStudentMode;
    const qrBlocksAi = qr === true || (qr && typeof qr === 'object' && (qr.aiDisabled === true || qr.aiPolicy === 'off'));
    if (
      window.__alloOfflineOnly === true ||
      window.__alloStudentAiDisabled === true ||
      window.__alloAiSecretsLocked === true ||
      qrBlocksAi ||
      window._alloQrBlocked === true ||
      (window.ALLOFLOW_MANAGED_AI_POLICY && window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false)
    ) return false;
    try {
      const policy = window.AlloModules && window.AlloModules.StudentPolicy;
      if (policy && typeof policy.getDecision === 'function') {
        const decision = policy.getDecision(kind || 'text');
        if (decision && decision.allowed === false) return false;
      }
    } catch (_) {
      return false;
    }
  }
  if (fn && fn._alloQrBlocked === true) return false;
  try {
    if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return Boolean(window.__alloAiUsable(kind, fn));
  } catch (_) {
    return false;
  }
  return typeof fn === 'function';
}
const STUDENT_SAVE_ANIMATION_CSS = `
@keyframes student-save-history-pulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
}
.student-save-history-pulse { animation: student-save-history-pulse 2s infinite; }
@media (prefers-reduced-motion: reduce) {
  .student-save-history-pulse { animation: none; }
}
`;

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
      primaryTeal: 'bg-teal-700 hover:bg-teal-800 text-white shadow-none',
      primaryIndigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-none',
      primaryPurple: 'bg-purple-600 hover:bg-purple-700 text-white shadow-none',
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
    saveIcon: 'bg-teal-100 text-teal-700',
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
    unlockedBadge: 'bg-green-100 text-green-800 border border-green-200',
    livePanel: 'bg-indigo-50 border border-indigo-200',
    liveTitle: 'text-indigo-800',
    liveText: 'text-indigo-700',
    primaryTeal: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm',
    primaryIndigo: 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm',
    primaryPurple: 'bg-purple-700 hover:bg-purple-800 text-white shadow-lg shadow-purple-200 hover:shadow-purple-300',
    secondary: 'bg-white text-teal-800 border border-teal-200 hover:bg-teal-100',
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
  // Lesson-scoped by the host: the whole Adventure section is dropped when the
  // current lesson does not carry an adventure, so a lesson without one does not
  // imply the teacher was supposed to include it. Undefined means an older host
  // that does not send the prop, in which case the section shows as before.
  isAdventureAvailable,
  // False when there is nothing to save yet (Save did nothing, silently).
  // Undefined from an older host keeps Save enabled.
  hasSaveableWork,
  initiateSaveStudentProject,
  isResumingAdventure,
  isSaveActionPulsing,
  // Host: AlloModules.AdventureOffline.find(history) -- a teacher-made story that plays with no AI.
  offlineAdventure,
  // Student author mode ("Write your own adventure", no AI). Needs the host's history + setHistory;
  // an older host that does not pass them shows no button.
  history,
  setHistory,
  projectFileInputRef,
  sessionData,
  studentProjectSettings,
  t,
}) {
  const noop = () => null;
  // AlloIcons first, bare window second. Several of these names collide with DOM
  // built-ins — window.History is the History interface constructor, window.Save
  // is nothing at all — and the host only shadows them by Object.assign'ing the
  // Lucide set onto window at AlloFlowANTI.txt:11082. Reading the registry first
  // means this panel does not depend on a DOM global having been clobbered, and
  // it renders standalone. React calls a bare class as a function component, so
  // getting History wrong is a crash, not a missing glyph.
  const icon = (name) => (typeof window !== 'undefined' && ((window.AlloIcons && window.AlloIcons[name]) || window[name])) || noop;
  const Save = icon('Save');
  const FolderOpen = icon('FolderOpen');
  const Download = icon('Download');
  const Send = icon('Send');
  const MapIcon = icon('MapIcon');
  const CheckCircle2 = icon('CheckCircle2');
  const Lock = icon('Lock');
  const RefreshCw = icon('RefreshCw');
  const browserHistoryConstructor = typeof window !== 'undefined' && window.history && window.history.constructor;
  const rawHistory = icon('History');
  const History = (rawHistory !== browserHistoryConstructor && !(rawHistory && rawHistory.prototype && typeof rawHistory.prototype.pushState === 'function'))
    ? rawHistory
    : noop;
  const Sparkles = icon('Sparkles');
  const Wifi = icon('Wifi');
  const saveTitleId = 'student-save-panel-title';
  const adventureTitleId = 'student-adventure-panel-title';
  const adventureProgressId = 'student-adventure-progress-label';
  const [, setAiPolicyTick] = React.useState(0);
  const storyCloseTimerRef = React.useRef(null);
  React.useEffect(() => {
    return () => {
      if (storyCloseTimerRef.current) {
        clearTimeout(storyCloseTimerRef.current);
        storyCloseTimerRef.current = null;
      }
    };
  }, []);
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
    const bump = () => setAiPolicyTick((n) => (n + 1) % 1000000);
    const evs = ['alloflow:ai-config-changed', 'alloflow:student-ai-config-changed', 'alloflow:ai-key-lock-changed', 'storage'];
    evs.forEach((ev) => window.addEventListener(ev, bump));
    return () => evs.forEach((ev) => window.removeEventListener(ev, bump));
  }, []);
  const parsedPoints = Number(globalPoints);
  const safePoints = Number.isFinite(parsedPoints) ? Math.max(0, parsedPoints) : 0;
  const parsedUnlockXp = Number(studentProjectSettings?.adventureUnlockXP ?? 0);
  const rawUnlockXp = Number.isFinite(parsedUnlockXp) ? Math.max(0, parsedUnlockXp) : 0;
  const unlockXp = Math.max(1, rawUnlockXp || 1);
  const boundedPoints = Math.max(0, Math.min(safePoints, unlockXp));
  const adventureProgress = Math.min(100, (boundedPoints / unlockXp) * 100);
  const adventureRemainingXp = Math.max(0, rawUnlockXp - boundedPoints);
  const adventurePercent = Math.round(adventureProgress);
  const tr = (key, fallback, vars) => {
    try {
      const value = typeof t === 'function' ? t(key, vars) : '';
      let text = typeof value === 'string' && value.trim() && value !== key ? value : fallback;
      Object.keys(vars || {}).forEach((name) => { text = text.split('{' + name + '}').join(String(vars[name])); });
      return text;
    } catch (_) { return fallback; }
  };
  const adventureAvailable = isAdventureAvailable !== false;
  const soloAdventureAiOff = !activeSessionCode && !_aiUsable('text', typeof window !== 'undefined' ? window.callGemini : undefined, studentProjectSettings);
  const offlineAdventurePlay = !activeSessionCode && !!offlineAdventure && (soloAdventureAiOff || offlineAdventure.offlineOnly === true);
  const soloAiNeededText = tr('adventure.learning_settings.solo_needs_ai', "Adventure needs AI, which isn't available here. Join your teacher's live adventure to play.");
  const themeContext = React.useContext((typeof window !== 'undefined' && window.AlloThemeContext) || StudentSaveThemeFallbackContext);
  const styles = getStudentSaveThemeStyles(themeContext);
  const [showStoryAuthor, setShowStoryAuthor] = React.useState(false);
  const storyBtnRef = React.useRef(null);
  const offlineApi = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AdventureOffline;
  const StoryPanel = offlineApi && typeof offlineApi.Panel === 'function' ? offlineApi.Panel : null;
  const studentStoryAllowed = !activeSessionCode && typeof setHistory === 'function' && !!StoryPanel
    && !(studentProjectSettings && studentProjectSettings.allowStudentStories === false);
  const hasStudentStory = studentStoryAllowed && typeof offlineApi.findStudentStory === 'function' && !!offlineApi.findStudentStory(history);
  const studentStoryText = tr('adventure.offline.student_button', 'Write your own adventure');
  const Pencil = icon('Pencil');

  return (
    <>
      <style>{STUDENT_SAVE_ANIMATION_CSS}</style>
      <section
        className={cx(styles.savePanel, 'rounded-3xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-left-4 motion-reduce:animate-none shadow-lg')}
        aria-labelledby={saveTitleId}
      >
        <div className="flex items-center gap-3">
          <div className={cx(styles.saveIcon, 'p-2 rounded-full')} aria-hidden="true">
            <Save size={20} />
          </div>
          <div>
            <h4 id={saveTitleId} className={cx('font-bold text-sm', styles.saveTitle)}>{tr('student.save_banner_title', 'Save your work')}</h4>
            <p className={cx('text-xs', styles.saveText)}>{tr('student.save_banner_desc', 'Save a copy to your device or submit when ready.')}</p>
            {hasSaveableWork === false && (
              <p data-student-save-empty-hint="true" className={cx('text-[11px] mt-1 font-medium', styles.muted)}>
                {tr('student.save_empty_hint', 'Open or complete an activity first to enable saving.')}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={tr('student.load_file', 'Load file')}
            data-help-key="student_load_file"
            onClick={() => projectFileInputRef?.current?.click()}
            className={cx('min-h-11 px-4 py-2 font-bold text-xs rounded-xl transition-colors motion-reduce:transition-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.secondary, styles.focusTeal, styles.focusOffset)}
          >
            <FolderOpen size={14} aria-hidden="true"/> {tr('student.load_file', 'Load file')}
          </button>
          <button
            type="button"
            aria-label={tr('student.save_drive', 'Save to device')}
            data-help-key="student_save_work"
            disabled={hasSaveableWork === false}
            onClick={() => { if (typeof initiateSaveStudentProject === 'function') initiateSaveStudentProject(); }}
            className={cx('min-h-11 px-4 py-2 font-bold text-xs rounded-xl transition-colors motion-reduce:transition-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryTeal, styles.focusTeal, styles.focusOffset, 'disabled:cursor-not-allowed disabled:opacity-50', isSaveActionPulsing ? 'student-save-history-pulse shadow-teal-500/50' : '')}
          >
            <Download size={14} aria-hidden="true"/> {tr('student.save_drive', 'Save to device')}
          </button>
          <button
            type="button"
            data-help-key="student_submit_work"
            onClick={() => { if (typeof handleSetShowSubmitModalToTrue === 'function') handleSetShowSubmitModalToTrue(); }}
            className={cx('min-h-11 px-4 py-2 font-bold text-xs rounded-xl transition-colors motion-reduce:transition-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryIndigo, styles.focusIndigo, styles.focusOffset)}
            title={tr('common.export_for_grading', 'Export for grading')}
          >
            <Send size={14} aria-hidden="true"/> {tr('common.submit', 'Submit')}
          </button>
        </div>
      </section>
      {adventureAvailable && (
      <section className={cx(styles.adventurePanel, 'rounded-3xl shadow-lg overflow-hidden shrink-0 mb-4')} aria-labelledby={adventureTitleId}>
        <div className={cx(styles.adventureHeader, 'p-3 flex justify-between items-center')}>
          <div id={adventureTitleId} className={cx('text-sm font-bold flex items-center gap-2', styles.adventureTitle)}>
            <MapIcon size={16} aria-hidden="true" /> {tr('adventure.title', 'Adventure')}
          </div>
          {safePoints >= rawUnlockXp && (
            <span className={cx('text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1', styles.unlockedBadge)} role="status"><CheckCircle2 size={10} aria-hidden="true"/> {tr('adventure.unlocked', 'Unlocked')}</span>
          )}
        </div>
        <div className="p-4">
          {safePoints < rawUnlockXp ? (
            <div className="space-y-3">
              <div className={cx('flex items-center gap-3 mb-2', styles.muted)}>
                <div className={cx('p-2 rounded-full', styles.iconBubble)} aria-hidden="true"><Lock size={20}/></div>
                <div className="text-xs">
                  <strong className={cx('block', styles.adventureTitle)}>{tr('adventure.locked_status', 'Adventure locked')}</strong>
                  {tr('adventure.earn', 'Earn')} <span className={cx('font-bold', styles.accentText)}>{rawUnlockXp} XP</span> {tr('adventure.to_unlock', 'to unlock')}
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
                  className={cx('h-full transition-all duration-1000 motion-reduce:transition-none', styles.progressFill)}
                  style={{ width: `${adventureProgress}%` }}
                ></div>
              </div>
              <div id={adventureProgressId} className={cx('flex items-center justify-between gap-2 text-[11px] font-mono', styles.progressLabel)}>
                <span data-student-adventure-remaining="true" className="font-sans font-bold">
                  {tr('adventure.xp_to_go', '{remaining} XP to go ({percent}%)', { remaining: adventureRemainingXp, percent: adventurePercent })}
                </span>
                <span>{safePoints} / {rawUnlockXp} XP</span>
              </div>
            </div>
          ) : (
            offlineAdventurePlay ? (
              <button
                type="button"
                data-help-key="adventure_start_btn" data-adventure-offline-start onClick={() => { if (typeof handleStartAdventure === 'function') handleStartAdventure(); }}
                className={cx('min-h-11 w-full py-3 rounded-2xl font-bold transition-all motion-reduce:transition-none active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryPurple, styles.focusPurple, styles.focusOffset)}
              >
                <MapIcon size={18} aria-hidden="true"/> {tr('adventure.start', 'Start Adventure')}
              </button>
            ) : soloAdventureAiOff ? (
              <p data-adventure-solo-ai-off className={cx('text-xs leading-relaxed', styles.muted)}>{soloAiNeededText}</p>
            ) : !activeSessionCode ? (
              <div className="flex flex-col gap-2">
                {hasSavedAdventure ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      data-help-key="adventure_resume_btn" onClick={() => { if (typeof handleResumeAdventure === 'function') handleResumeAdventure(); }}
                      disabled={isResumingAdventure}
                      className={cx('min-h-11 w-full py-3 rounded-xl font-bold transition-all motion-reduce:transition-none active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryPurple, styles.focusPurple, styles.focusOffset)}
                    >
                      {isResumingAdventure ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <History size={18} aria-hidden="true"/>}
                      {tr('adventure.resume', 'Resume')}
                    </button>
                    <button
                      type="button"
                      data-help-key="adventure_start_btn" onClick={() => { if (typeof handleStartAdventure === 'function') handleStartAdventure(); }}
                      disabled={isResumingAdventure}
                      className={cx('min-h-11 w-full py-3 rounded-xl font-bold shadow-sm transition-all motion-reduce:transition-none active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.secondaryPurple, styles.focusPurple, styles.focusOffset)}
                    >
                      <Sparkles size={18} aria-hidden="true"/> {tr('adventure.new_game', 'New game')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-help-key="adventure_start_btn" onClick={() => { if (typeof handleStartAdventure === 'function') handleStartAdventure(); }}
                    className={cx('min-h-11 w-full py-3 rounded-2xl font-bold transition-all motion-reduce:transition-none active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primaryPurple, styles.focusPurple, styles.focusOffset)}
                  >
                    <Sparkles size={18} aria-hidden="true"/> {tr('adventure.start', 'Start Adventure')}
                  </button>
                )}
              </div>
            ) : (
              <div className={cx('p-4 rounded-xl text-center', styles.livePanel)} role="status" aria-live="polite">
                <p className={cx('text-sm font-bold mb-1', styles.liveTitle)}>
                  <Wifi size={16} className="inline mr-1 animate-pulse motion-reduce:animate-none" aria-hidden="true"/> {tr('session.live_active', 'Live session active')}
                </p>
                <p className={cx('text-xs', styles.liveText)}>
                  {sessionData?.democracy?.isActive ? tr('session.vote_prompt', 'Vote on the next step') : tr('session.watch_prompt', 'Watch the shared adventure')}
                </p>
              </div>
            )
          )}
          {studentStoryAllowed && (
            <button
              ref={storyBtnRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={showStoryAuthor}
              data-adventure-student-story-open
              onClick={() => setShowStoryAuthor(true)}
              className={cx('mt-3 min-h-11 w-full py-3 rounded-2xl font-bold transition-colors motion-reduce:transition-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.secondaryPurple, styles.focusPurple, styles.focusOffset)}
            >
              <Pencil size={16} aria-hidden="true"/> {studentStoryText}{hasStudentStory ? ' ✓' : ''}
            </button>
          )}
        </div>
      </section>
      )}
      {showStoryAuthor && studentStoryAllowed && <StoryPanel studentMode history={history} setHistory={setHistory} t={t} theme={themeContext && themeContext.theme} onClose={() => {
        setShowStoryAuthor(false);
        if (storyCloseTimerRef.current) clearTimeout(storyCloseTimerRef.current);
        storyCloseTimerRef.current = setTimeout(() => {
          storyCloseTimerRef.current = null;
          try {
            if (typeof document !== 'undefined' && storyBtnRef.current && storyBtnRef.current !== document.body && storyBtnRef.current !== document.documentElement && storyBtnRef.current.isConnected) {
              storyBtnRef.current.focus();
            }
          } catch (_) {}
        }, 0);
      }} />}
    </>
  );
}
