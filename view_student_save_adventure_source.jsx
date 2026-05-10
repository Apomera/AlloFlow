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

  return (
    <>
      <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-left-4 shadow-lg shadow-teal-500/10">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-full text-teal-600">
            <Save size={20} />
          </div>
          <div>
            <h4 className="font-bold text-teal-900 text-sm">{t('student.save_banner_title')}</h4>
            <p className="text-xs text-teal-800">{t('student.save_banner_desc')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => projectFileInputRef.current?.click()}
            className="px-4 py-2 bg-white text-teal-700 border border-teal-200 font-bold text-xs rounded-xl hover:bg-teal-100 transition-colors flex items-center gap-2"
          >
            <FolderOpen size={14}/> {t('student.load_file')}
          </button>
          <button aria-label={t('common.download')}
            onClick={initiateSaveStudentProject}
            className={`px-4 py-2 bg-teal-700 text-white font-bold text-xs rounded-xl hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm ${isSaveActionPulsing ? 'pulse-history shadow-teal-500/50' : ''}`}
          >
            <Download size={14}/> {t('student.save_drive')}
          </button>
          <button
            onClick={handleSetShowSubmitModalToTrue}
            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
            title={t('common.export_for_grading')}
          >
            <Send size={14}/> {t('common.submit')}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-lg shadow-purple-500/10 border border-slate-400 overflow-hidden shrink-0 mb-4">
        <div className="p-3 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
          <div className="text-sm font-bold text-purple-800 flex items-center gap-2">
            <MapIcon size={16} /> {t('adventure.title')}
          </div>
          {globalPoints >= studentProjectSettings.adventureUnlockXP && (
            <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200 flex items-center gap-1"><CheckCircle2 size={10}/> {t('adventure.unlocked')}</span>
          )}
        </div>
        <div className="p-4">
          {globalPoints < studentProjectSettings.adventureUnlockXP ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600 mb-2">
                <div className="bg-slate-100 p-2 rounded-full"><Lock size={20}/></div>
                <div className="text-xs">
                  <strong className="block text-slate-700">{t('adventure.locked_status')}</strong>
                  {t('adventure.earn')} <span className="font-bold text-purple-600">{studentProjectSettings.adventureUnlockXP} XP</span> {t('adventure.to_unlock')}
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-400">
                <div
                  className="h-full bg-purple-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (globalPoints / studentProjectSettings.adventureUnlockXP) * 100)}%` }}
                ></div>
              </div>
              <div className="text-[11px] text-right text-slate-600 font-mono">
                {globalPoints} / {studentProjectSettings.adventureUnlockXP} XP
              </div>
            </div>
          ) : (
            !activeSessionCode ? (
              <div className="flex flex-col gap-2">
                {hasSavedAdventure ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button aria-label={t('common.resume_saved_adventure')}
                      data-help-key="adventure_resume_btn" onClick={handleResumeAdventure}
                      disabled={isResumingAdventure}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResumingAdventure ? <RefreshCw size={18} className="animate-spin" /> : <History size={18}/>}
                      {t('adventure.resume')}
                    </button>
                    <button
                      aria-label={t('common.start_adventure')}
                      data-help-key="adventure_start_btn" onClick={handleStartAdventure}
                      disabled={isResumingAdventure}
                      className="w-full py-3 bg-white text-purple-700 border-2 border-purple-200 rounded-xl font-bold shadow-sm hover:bg-purple-50 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={18}/> {t('adventure.new_game')}
                    </button>
                  </div>
                ) : (
                  <button
                    aria-label={t('common.start_adventure')}
                    data-help-key="adventure_start_btn" onClick={handleStartAdventure}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18}/> {t('adventure.start')}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-center">
                <p className="text-sm text-indigo-800 font-bold mb-1">
                  <Wifi size={16} className="inline mr-1 animate-pulse"/> {t('session.live_active')}
                </p>
                <p className="text-xs text-indigo-600">
                  {sessionData?.democracy?.isActive ? t('session.vote_prompt') : t('session.watch_prompt')}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
