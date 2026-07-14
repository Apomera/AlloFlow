/**
 * AlloFlow — Student Join Panel Module
 *
 * Sidebar panel shown to students who are NOT yet in a session. Collapsed
 * by default (one-line "Join" pill); expands to a 5-character code entry form
 * plus optional host-ID override input.
 *
 * Extracted from AlloFlowANTI.txt lines 21356-21424 (May 2026).
 *
 * Required props (12):
 *   appId, handleSetIsJoinPanelExpandedToFalse,
 *   handleSetIsJoinPanelExpandedToTrue, isJoinPanelExpanded,
 *   joinAppIdInput, joinClassSession, joinCodeInput, setJoinAppIdInput,
 *   setJoinCodeInput, t
 *
 * Icons (from window globals): Minimize, Wifi, ArrowRight
 */
const StudentJoinThemeFallbackContext = (window.React && window.React.createContext)
  ? window.React.createContext({ theme: 'light', colorOverlay: 'none' })
  : null;

const cx = (...parts) => parts.filter(Boolean).join(' ');

function getStudentJoinThemeStyles(themeContext = {}) {
  const theme = themeContext.theme || 'light';
  const colorOverlay = themeContext.colorOverlay || 'none';
  if (theme === 'contrast') {
    return {
      panel: 'bg-black text-white border-4 border-yellow-400 shadow-none',
      hoverPanel: 'hover:bg-yellow-400 hover:text-black',
      icon: 'bg-black text-yellow-400 border-2 border-yellow-400',
      title: 'text-yellow-400',
      text: 'text-white',
      muted: 'text-yellow-400',
      input: 'bg-black border-yellow-400 text-yellow-400 placeholder:text-yellow-200 focus-visible:border-yellow-400 focus-visible:ring-yellow-400',
      primary: 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-none focus-visible:ring-yellow-400',
      focusOffset: 'focus-visible:ring-offset-black',
      arrow: 'bg-yellow-400 text-black',
    };
  }
  if (theme === 'dark') {
    return {
      panel: 'bg-slate-900 text-slate-100 border border-slate-700 shadow-2xl shadow-slate-950/50',
      hoverPanel: 'hover:bg-slate-800',
      icon: 'bg-indigo-950 text-indigo-200 border border-indigo-700',
      title: 'text-slate-100',
      text: 'text-slate-300',
      muted: 'text-slate-400',
      input: 'bg-slate-950 border-slate-600 text-slate-100 placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:ring-indigo-500',
      primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-none focus-visible:ring-indigo-400',
      focusOffset: 'focus-visible:ring-offset-slate-900',
      arrow: 'bg-indigo-600 text-white',
    };
  }
  const overlayPanel = colorOverlay === 'blue' ? 'bg-blue-50 border-blue-200 shadow-blue-500/10'
    : colorOverlay === 'peach' ? 'bg-orange-50 border-orange-200 shadow-orange-500/10'
    : colorOverlay === 'yellow' ? 'bg-yellow-50 border-yellow-300 shadow-yellow-500/10'
    : 'bg-white border-slate-400 shadow-indigo-500/10';
  const overlayIcon = colorOverlay === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-200'
    : colorOverlay === 'peach' ? 'bg-orange-100 text-orange-700 border-orange-200'
    : colorOverlay === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : 'bg-indigo-50 text-indigo-600 border-indigo-100';
  return {
    panel: overlayPanel,
    hoverPanel: colorOverlay === 'none' ? 'hover:bg-slate-50' : 'hover:bg-white/60',
    icon: overlayIcon,
    title: 'text-slate-800',
    text: 'text-slate-600',
    muted: 'text-slate-600',
    input: 'bg-white border-slate-400 text-slate-700 placeholder:text-slate-600 focus-visible:border-indigo-500 focus-visible:ring-indigo-500',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 focus-visible:ring-indigo-500',
    focusOffset: 'focus-visible:ring-offset-white',
    arrow: 'bg-indigo-600 text-white',
  };
}

function StudentJoinPanel({
  appId,
  handleSetIsJoinPanelExpandedToFalse,
  handleSetIsJoinPanelExpandedToTrue,
  isJoinPanelExpanded,
  joinAppIdInput,
  joinClassSession,
  joinCodeInput,
  setJoinAppIdInput,
  setJoinCodeInput,
  t,
}) {
  const noop = () => null;
  const Minimize = window.Minimize || noop;
  const Wifi = window.Wifi || noop;
  const ArrowRight = window.ArrowRight || noop;
  const titleId = 'student-join-panel-title';
  const collapsedTitleId = 'student-join-panel-collapsed-title';
  const instructionsId = 'student-join-panel-instructions';
  const hostInputId = 'student-join-host-id';
  const codeInputId = 'student-join-code';
  const canJoin = joinCodeInput.length >= 5;
  const themeContext = React.useContext(window.AlloThemeContext || StudentJoinThemeFallbackContext);
  const styles = getStudentJoinThemeStyles(themeContext);
  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (canJoin) joinClassSession(joinCodeInput);
  };

  return (
    <div
      className={cx(styles.panel, 'rounded-3xl shadow-xl mb-4 shrink-0 animate-in slide-in-from-left-4 duration-500 overflow-hidden transition-all', isJoinPanelExpanded ? 'p-6' : 'p-2')}
      role="region"
      aria-labelledby={isJoinPanelExpanded ? titleId : collapsedTitleId}
    >
      {isJoinPanelExpanded ? (
        <div className="text-center relative">
          <button
            type="button"
            aria-label={t('common.minimize')}
            onClick={handleSetIsJoinPanelExpandedToFalse}
            className={cx('absolute -top-2 -right-2 p-2 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.muted, styles.hoverPanel, styles.focusOffset)}
            title={t('common.minimize')}
          >
            <Minimize size={16} />
          </button>
          <div className={cx('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', styles.icon)} aria-hidden="true">
            <Wifi size={32} />
          </div>
          <h2 id={titleId} className={cx('text-xl font-black mb-2 tracking-tight', styles.title)}>{t('session.join_panel_title')}</h2>
          <p id={instructionsId} className={cx('text-sm mb-6 font-medium', styles.text)}>{t('session.join_instructions')}</p>
          <form className="flex flex-col gap-3 max-w-xs mx-auto" onSubmit={handleJoinSubmit} aria-describedby={instructionsId}>
            <div className="text-left">
              <label htmlFor={hostInputId} className={cx('block text-[11px] font-bold mb-1 uppercase tracking-wider', styles.muted)}>{t('session.host_id_optional')}</label>
              <input
                id={hostInputId}
                aria-label={t('common.enter_join_app_id_input')}
                type="text"
                value={joinAppIdInput}
                onChange={(e) => setJoinAppIdInput(e.target.value)}
                placeholder={`Default: ${appId}`}
                className={cx('w-full text-xs border rounded-xl p-2 focus-visible:outline-none focus-visible:ring-2 font-mono mb-2', styles.input)}
              />
            </div>
            <label htmlFor={codeInputId} className="sr-only">{t('common.enter_join_code_input')}</label>
            <input
              id={codeInputId}
              aria-label={t('common.enter_join_code_input')}
              aria-describedby={instructionsId}
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder={t('session.code_placeholder')}
              maxLength={5}
              autoComplete="one-time-code"
              inputMode="text"
              className={cx('w-full text-center font-mono font-black text-3xl tracking-[0.5em] border-2 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-4 uppercase transition-all', styles.input)}
            />
            <button
              type="submit"
              aria-label={t('common.continue')}
              disabled={!canJoin}
              aria-disabled={!canJoin}
              className={cx('w-full font-bold text-lg py-3 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.primary, styles.focusOffset)}
            >
              {t('session.join_action')} <ArrowRight size={20} aria-hidden="true"/>
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          aria-label={t('common.connect')}
          onClick={handleSetIsJoinPanelExpandedToTrue}
          className={cx('w-full flex items-center justify-between p-2 rounded-2xl transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2', styles.hoverPanel, styles.focusOffset)}
        >
          <div className="flex items-center gap-3">
            <div className={cx('w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform', styles.icon)} aria-hidden="true">
              <Wifi size={20} />
            </div>
            <div className="text-left">
              <h3 id={collapsedTitleId} className={cx('font-bold text-sm', styles.title)}>{t('session.join')}</h3>
              <p className={cx('text-[11px]', styles.text)}>{t('session.sync_desc')}</p>
            </div>
          </div>
          <div className={cx('p-2 rounded-full opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-sm', styles.arrow)} aria-hidden="true">
            <ArrowRight size={16} />
          </div>
        </button>
      )}
    </div>
  );
}
