// ui_modals_source.jsx — StudentQuizOverlay, TeacherGate, RoleSelectionModal, StudentEntryModal, StudentWelcomeModal
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useFocusTrap = window.__alloHooks && window.__alloHooks.useFocusTrap;
var UiLanguageSelector = window.UiLanguageSelector || function() { return null; };
var useState = React.useState; var useEffect = React.useEffect; var useRef = React.useRef;
var useContext = React.useContext; var useMemo = React.useMemo; var useCallback = React.useCallback;
var APP_CONFIG = window.APP_CONFIG || {};
var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };
var doc = window._fbDoc || function() { return null; };
var updateDoc = window._fbUpdateDoc || function() { return Promise.resolve(); };
var db = window._fbDb || null;
var UI_MODAL_A11Y_STYLES = `
  [data-allo-ui-modal]:is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible,
  [data-allo-ui-modal] :is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 3px solid #0f172a !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 6px #ffffff !important;
  }
  @media (forced-colors: active) {
    [data-allo-ui-modal]:is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible,
    [data-allo-ui-modal] :is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible {
      outline: 3px solid CanvasText !important;
      box-shadow: none !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-allo-ui-modal], [data-allo-ui-modal] * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
// Lazy icon wrappers — window.AlloIcons is set in a useEffect after CDN scripts load,
// so each icon must look up window.AlloIcons at RENDER time, not at script load time.
var _lazyIcon = function(name) { return function(props) { var I = window.AlloIcons && window.AlloIcons[name]; return I ? React.createElement(I, props) : null; }; };
var CheckCircle = _lazyIcon('CheckCircle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var FolderOpen = _lazyIcon('FolderOpen');
var GraduationCap = _lazyIcon('GraduationCap');
var Heart = _lazyIcon('Heart');
var Layers = _lazyIcon('Layers');
var Lock = _lazyIcon('Lock');
var Mic = _lazyIcon('Mic');
var RefreshCw = _lazyIcon('RefreshCw');
var School = _lazyIcon('School');
var ShieldCheck = _lazyIcon('ShieldCheck');
var Sparkles = _lazyIcon('Sparkles');
var Upload = _lazyIcon('Upload');
var UserCircle2 = _lazyIcon('UserCircle2');
var X = _lazyIcon('X');
var XCircle = _lazyIcon('XCircle');

const StudentQuizOverlay = React.memo(({ sessionData, generatedContent, user, activeSessionCode, targetAppId }) => {
  const { t } = useContext(LanguageContext);
  const isQuizOpen = Boolean(sessionData?.quizState?.isActive && generatedContent && generatedContent.type === 'quiz');
  const quizState = sessionData?.quizState || {};
  const {
      mode = 'live-quiz',
      currentQuestionIndex = 0,
      phase,
      teams = {},
      bossStats,
      responses
  } = quizState;
  const currentQuestion = generatedContent?.data?.questions?.[currentQuestionIndex];
  const teamColor = user ? teams?.[user.uid] : null;
  const studentGroupId = sessionData?.roster?.[user?.uid]?.groupId;
  const studentGroup = studentGroupId ? sessionData.groups?.[studentGroupId] : null;
  const groupLanguage = studentGroup?.language;
  const showTranslated = groupLanguage && groupLanguage !== 'English';
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isLocallyDismissed, setIsLocallyDismissed] = useState(false);
  const quizRef = useRef(null);
  useFocusTrap(quizRef, isQuizOpen && !isLocallyDismissed, () => setIsLocallyDismissed(true));
  useEffect(() => {
      setIsLocallyDismissed(false);
  }, [activeSessionCode, isQuizOpen]);
  useEffect(() => {
      setSubmitError('');
      if (user && responses && responses[user.uid] !== undefined) {
          setHasAnswered(true);
          setSelectedOptionIndex(responses[user.uid]);
      } else {
          if (!user || !responses || responses[user.uid] === undefined) {
             setHasAnswered(false);
             setSelectedOptionIndex(null);
          }
      }
  }, [currentQuestionIndex, responses, user]);
  useEffect(() => {
      if (isQuizOpen && mode === 'team-showdown' && user && activeSessionCode) {
          const currentTeam = teams?.[user.uid];
          if (!currentTeam) {
              const teamOptions = ['Red', 'Blue', 'Green', 'Yellow'];
              const assignedColor = teamOptions[Math.floor(Math.random() * teamOptions.length)];
              const joinTeam = async () => {
                  try {
                      const effectiveAppId = targetAppId || appId;
                      const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
                      await updateDoc(sessionRef, {
                          [`quizState.teams.${user.uid}`]: assignedColor
                      });
                  } catch (e) {
                      warnLog("Team assignment failed:", e);
                  }
              };
              joinTeam();
          }
      }
  }, [isQuizOpen, mode, user, teams, activeSessionCode, targetAppId]);
  const submitQuizResponse = async (optionIndex) => {
      if (hasAnswered || !user || !activeSessionCode) return;
      setSubmitError('');
      setHasAnswered(true);
      setSelectedOptionIndex(optionIndex);
      try {
          // FERPA-first transport: boss answers ride the P2P quiz channel when
          // it's up (shell hook; answer lands only on the teacher device).
          // Firestore quizState.responses stays strictly as the fallback.
          const p2pSend = (typeof window !== 'undefined') && window.__alloQuizChannelSend;
          if (typeof p2pSend === 'function' && p2pSend('boss:' + currentQuestionIndex, optionIndex)) return;
          const effectiveAppId = targetAppId || appId;
          const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
          await updateDoc(sessionRef, {
              [`quizState.responses.${user.uid}`]: optionIndex
          });
      } catch (e) {
          warnLog("Error submitting quiz response:", e);
          setHasAnswered(false);
          setSelectedOptionIndex(null);
          setSubmitError(t('errors.quiz_submit_failed') || 'Your answer could not be submitted. Please try again.');
      }
  };
  const getModeStyles = () => {
      switch(mode) {
          case 'boss-battle': return { bg: 'bg-slate-900', accent: 'text-red-500', icon: '⚔️' };
          case 'team-showdown': return { bg: 'bg-slate-900', accent: 'text-yellow-400', icon: '🏆' };
          case 'live-pulse': return { bg: 'bg-indigo-950', accent: 'text-cyan-400', icon: '📊' };
          default: return { bg: 'bg-indigo-950', accent: 'text-white', icon: '📝' };
      }
  };
  if (!isQuizOpen) return null;
  if (isLocallyDismissed) {
      return (
          <button
              type="button"
              onClick={() => setIsLocallyDismissed(false)}
              className="fixed bottom-4 right-4 z-[1000] min-h-11 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white shadow-2xl"
              data-allo-ui-modal="student-quiz-return"
          >
              Return to live quiz
          </button>
      );
  }
  const styles = getModeStyles();
  const getTeamBadgeColor = (color) => {
      switch(color) {
          case 'Red': return 'bg-red-600 text-white';
          case 'Blue': return 'bg-blue-600 text-white';
          case 'Green': return 'bg-green-600 text-white';
          case 'Yellow': return 'bg-yellow-400 text-black';
          default: return 'bg-slate-600 text-white';
      }
  };
  const isRevealed = phase === 'revealed';
  const correctAnswerIndex = currentQuestion?.options?.findIndex(opt => opt === currentQuestion.correctAnswer);
  const isCorrect = isRevealed && selectedOptionIndex === correctAnswerIndex;
  return (
    <div
        ref={quizRef}
        className={`fixed inset-0 z-[1000] ${styles.bg} flex flex-col animate-in slide-in-from-bottom duration-500 text-white font-sans motion-reduce:animate-none motion-reduce:transition-none`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-quiz-title"
        aria-describedby="student-quiz-question"
        data-allo-ui-modal="student-quiz"
        data-help-key="quiz_student_overlay"
    >
        <style>{UI_MODAL_A11Y_STYLES}</style>
        {submitError && (
            <p id="quiz-submit-error" role="alert" className="m-4 rounded-lg border border-red-300 bg-red-950 px-4 py-3 font-semibold text-white">
                {submitError}
            </p>
        )}
        <div className="p-4 flex justify-between items-start bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0">
            <div>
                <h2 id="student-quiz-title" className={`font-black text-xl uppercase tracking-widest ${styles.accent} flex items-center gap-2 drop-shadow-md`} data-help-key="quiz_student_mode_header">
                    <span aria-hidden="true">{styles.icon}</span>
                    <span>{mode.replace(/-/g, ' ')}</span>
                </h2>
                {teamColor && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase mt-2 inline-block shadow-sm ${getTeamBadgeColor(teamColor)}`}>
                        {t('quiz.team_label', { color: teamColor })}
                    </span>
                )}
            </div>
             <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{t('quiz.question_label')}</span>
                <span className="text-3xl font-mono font-black text-white leading-none">
                    {currentQuestionIndex + 1} <span className="text-lg text-white/50">/ {generatedContent?.data?.questions?.length || 0}</span>
                </span>
            </div>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            {phase === 'boss-defeated' && (
                <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-900/95 to-emerald-800/95 backdrop-blur-lg animate-in zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none">
                    <div className="text-center p-8">
                        <div aria-hidden="true" className="text-8xl mb-6">🎉</div>
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('quiz.boss.victory_msg')}</h2>
                        <p className="text-xl text-green-200">{bossStats?.name || t('quiz.boss.name_fallback')} {t('quiz.boss.defeat_suffix')}</p>
                    </div>
                </div>
            )}
            {phase === 'class-defeated' && (
                <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-900/95 to-rose-800/95 backdrop-blur-lg animate-in zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none">
                    <div className="text-center p-8">
                        <div aria-hidden="true" className="text-8xl mb-6">💀</div>
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('quiz.boss.class_defeat_msg')}</h2>
                        <p className="text-xl text-red-200">{t('quiz.boss.class_fallen_msg')}</p>
                    </div>
                </div>
            )}
            {mode === 'boss-battle' && bossStats && (
                <div className="mb-8 w-full max-w-lg flex flex-col items-center animate-in fade-in zoom-in duration-700">
                     <div className={`relative mb-6 ${phase === 'revealed' && bossStats.lastDamage > 0 ? 'animate-shake motion-reduce:animate-none' : ''}`}>
                         {bossStats.image ? (
                             <img loading="lazy"
                                src={bossStats.image}
                                alt={t('quiz.boss.alt_text')}
                                className="w-32 h-32 md:w-48 md:h-48 object-contain pixelated drop-shadow-2xl"
                                style={STYLE_IMAGE_PIXELATED}
                             />
                         ) : (
                             <div className="w-24 h-24 md:w-32 md:h-32 bg-red-900/50 rounded-full border-4 border-red-500/50 flex items-center justify-center text-4xl shadow-xl backdrop-blur-sm">
                                 {bossStats.isGenerating ? <RefreshCw aria-hidden="true" className="animate-spin text-red-400 motion-reduce:animate-none"/> : <span aria-hidden="true">👾</span>}
                             </div>
                         )}
                         {phase === 'revealed' && bossStats.lastDamage > 0 && (
                             <div role="status" className="absolute top-0 right-[-20px] text-red-500 font-black text-3xl animate-[bounce_0.5s_infinite] motion-reduce:animate-none z-20 stroke-white drop-shadow-md">
                                 -{bossStats.lastDamage}
                             </div>
                         )}
                     </div>
                     <div className="w-full">
                         <div className="flex justify-between text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                             <span>{bossStats.name || "Boss"} HP</span>
                             <span>{Math.round(bossStats.currentHP)} / {bossStats.maxHP}</span>
                         </div>
                         <div className="w-full h-6 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 relative shadow-inner">
                             <div
                                role="progressbar"
                                aria-label={`${bossStats.name || "Boss"} health`}
                                aria-valuemin="0"
                                aria-valuemax={bossStats.maxHP}
                                aria-valuenow={Math.max(0, Math.round(bossStats.currentHP))}
                                className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out motion-reduce:transition-none"
                                style={{ width: `${Math.max(0, (bossStats.currentHP / bossStats.maxHP) * 100)}%` }}
                             ></div>
                         </div>
                     </div>
                     <div className="w-full mt-3">
                         <div className="flex justify-between text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                             <span>{t('quiz.boss.class_hp')}</span>
                             <span>{Math.round(bossStats.classHP ?? 100)} / {bossStats.classMaxHP || 100}</span>
                         </div>
                         <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 relative shadow-inner">
                             <div
                                role="progressbar"
                                aria-label={t('quiz.boss.class_hp')}
                                aria-valuemin="0"
                                aria-valuemax={bossStats.classMaxHP || 100}
                                aria-valuenow={Math.max(0, Math.round(bossStats.classHP ?? 100))}
                                className="h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500 ease-out motion-reduce:transition-none"
                                style={{ width: `${Math.max(0, ((bossStats.classHP ?? 100) / (bossStats.classMaxHP || 100)) * 100)}%` }}
                             ></div>
                         </div>
                         {phase === 'revealed' && bossStats.lastClassDamage > 0 && (
                             <div role="status" className="text-orange-400 text-xs font-bold mt-1 animate-pulse motion-reduce:animate-none text-center">
                                 {t('quiz.boss.counter_attack_msg', { damage: bossStats.lastClassDamage })}
                             </div>
                         )}
                     </div>
                </div>
            )}
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-3xl w-full">
                <h3 id="student-quiz-question" aria-live="polite" aria-atomic="true" className="text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm" data-help-key="quiz_student_question">
                    {currentQuestion ? currentQuestion.question : t('quiz.loading_question')}
                </h3>
                {currentQuestion && showTranslated && currentQuestion.question_en && (
                    <p className="mt-3 text-base md:text-lg text-white/70 italic">
                        {currentQuestion.question_en}
                    </p>
                )}
            </div>
            {/* Phase C (poll subtype): Likert items render as a horizontal 1..N tick
                strip with low/high labels above the strip. submitQuizResponse(idx)
                writes the 0-based array index just like MCQ; the host synthesizes
                options=['1','2',...,'N'] so the wire format and rule-eval path
                stay uniform. Polls have NO correct answer, so revealed-state
                styling intentionally never shows a "right" tick. */}
            {currentQuestion?.itemType === 'likert' ? (
              <div className="w-full max-w-3xl mt-8 px-4">
                <div className="flex justify-between text-xs md:text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                  <span>{currentQuestion.scale?.lowLabel || t('quiz.likert_strongly_disagree') || 'Strongly disagree'}</span>
                  <span>{currentQuestion.scale?.highLabel || t('quiz.likert_strongly_agree') || 'Strongly agree'}</span>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(3, Math.min(7, currentQuestion.scale?.steps || (currentQuestion.options?.length || 5)))}, minmax(0, 1fr))` }}>
                  {(currentQuestion.options || []).map((tickLabel, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const isDisabled = hasAnswered || phase !== 'answering';
                    let btnClass = 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:bg-purple-50';
                    if (isSelected) btnClass = 'bg-purple-500 text-white border-purple-700 scale-[1.05] ring-4 ring-purple-300/40 z-10';
                    else if (isDisabled) btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-60 cursor-not-allowed';
                    return (
                      <button
                        key={idx}
                        data-help-key="quiz_student_likert_tick"
                        onClick={() => submitQuizResponse(idx)}
                        disabled={isDisabled}
                        aria-label={`${tickLabel} of ${currentQuestion.options.length}`}
                        className={`relative p-4 md:p-6 rounded-2xl font-black text-2xl md:text-3xl transition-all transform duration-200 shadow-xl border-b-4 active:border-b-0 active:translate-y-1 ${btnClass}`}
                      >
                        {tickLabel}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-[11px] md:text-xs text-white/60 italic">
                  {t('quiz.no_right_answer') || 'There are no right or wrong answers here.'}
                </p>
              </div>
            ) : (
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 px-4">
                {currentQuestion?.options?.map((option, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const letter = String.fromCharCode(65 + idx);
                    const isDisabled = hasAnswered || phase !== 'answering';
                    let btnClass = 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50';
                    let letterClass = 'bg-indigo-100 text-indigo-600 border-indigo-200 group-hover:bg-white group-hover:border-indigo-300';
                    if (isRevealed) {
                        if (idx === correctAnswerIndex) {
                            btnClass = 'bg-green-700 text-white border-green-800 ring-4 ring-green-700/30 z-10 scale-[1.02] shadow-xl';
                            letterClass = 'bg-white text-green-600 border-white';
                        } else if (isSelected && idx !== correctAnswerIndex) {
                            btnClass = 'bg-red-500 text-white border-red-600 opacity-90';
                            letterClass = 'bg-white text-red-600 border-white';
                        } else {
                            btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-50';
                            letterClass = 'bg-slate-700 text-slate-300 border-slate-600';
                        }
                    } else if (isSelected) {
                        btnClass = 'bg-yellow-400 text-indigo-900 border-yellow-600 scale-[1.02] ring-4 ring-yellow-200/50 z-10';
                        letterClass = 'bg-indigo-900 text-yellow-400 border-indigo-900';
                    } else if (isDisabled) {
                         btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-60 cursor-not-allowed';
                         letterClass = 'bg-slate-700 text-slate-300 border-slate-600';
                    }
                    return (
                        <button
                            key={idx}
                            data-help-key="quiz_student_answer_option"
                            onClick={() => submitQuizResponse(idx)}
                            disabled={isDisabled}
                            className={`
                                relative group overflow-hidden p-6 rounded-2xl font-bold text-lg md:text-xl transition-all transform duration-300 shadow-xl border-b-4 active:border-b-0 active:translate-y-1
                                ${btnClass}
                            `}
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 border-2 transition-colors
                                    ${letterClass}
                                `}>
                                    {letter}
                                </div>
                                <div className="flex flex-col items-start gap-1 text-left leading-tight">
                                    <span>{option}</span>
                                    {showTranslated && currentQuestion?.options_en?.[idx] && (
                                        <span className="text-xs opacity-60 font-normal italic">
                                            {currentQuestion.options_en[idx]}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isSelected && !isRevealed && (
                                <div className="absolute top-2 right-2 text-indigo-900 animate-in zoom-in duration-300">
                                    <CheckCircle2 size={24} className="fill-white"/>
                                </div>
                            )}
                            {isRevealed && idx === correctAnswerIndex && (
                                <div className="absolute top-2 right-2 text-white animate-in zoom-in duration-300">
                                    <CheckCircle2 size={24} />
                                </div>
                            )}
                             {isRevealed && isSelected && idx !== correctAnswerIndex && (
                                <div className="absolute top-2 right-2 text-white animate-in zoom-in duration-300">
                                    <XCircle size={24} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            )}
            <div className="mt-8 min-h-16 flex items-center justify-center w-full mb-8">
                {phase === 'answering' && (
                    hasAnswered ? (
                        <div role="status" aria-live="polite" aria-atomic="true" className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-sm animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none flex items-center gap-3 border border-white/10 shadow-lg">
                           <span className="relative flex h-3 w-3">
                              <span aria-hidden="true" className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 motion-reduce:animate-none"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                           {t('quiz.status.answer_sent')}
                        </div>
                    ) : (
                        <div className="text-white/50 font-mono text-xs uppercase tracking-widest animate-pulse motion-reduce:animate-none">
                            {t('quiz.status.choose_option')}
                        </div>
                    )
                )}
                {phase === 'revealed' && currentQuestion?.itemType === 'likert' && (
                    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-6 items-center w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none px-4">
                        <div className="w-full px-8 py-6 rounded-3xl font-bold text-lg shadow-xl flex items-center justify-center gap-4 border-2 border-purple-300 bg-purple-50 text-purple-900">
                            <span aria-hidden="true">🗣️</span>
                            <span>{t('quiz.poll_completed') || 'Thanks for sharing your take.'}</span>
                        </div>
                    </div>
                )}
                {phase === 'revealed' && currentQuestion?.itemType !== 'likert' && (
                    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-6 items-center w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none px-4">
                        <div className={`
                            w-full px-8 py-6 rounded-3xl font-black text-2xl shadow-2xl flex items-center justify-center gap-6 border-4 transform transition-transform hover:scale-105
                            ${isCorrect
                                ? 'bg-green-700 border-green-500 text-white ring-4 ring-green-700/30'
                                : 'bg-red-500 border-red-300 text-white ring-4 ring-red-500/30'}
                        `}>
                            {isCorrect ? <CheckCircle2 size={40} className="fill-white text-green-500"/> : <XCircle size={40} className="fill-white text-red-500"/>}
                            <div>
                                <div className="uppercase tracking-widest text-xs opacity-90 mb-1 font-medium">{t('quiz.result_label')}</div>
                                {mode === 'boss-battle' ? (
                                    isCorrect
                                        ? t('quiz.status.result_hit', { damage: 10 })
                                        : t('quiz.status.result_miss', { hp: 5 })
                                ) : mode === 'team-showdown' ? (
                                    isCorrect
                                        ? (teamColor ? t('quiz.status.result_score', { points: 100 }) : t('quiz.status.result_score_generic'))
                                        : t('quiz.status.result_no_points')
                                ) : (
                                    isCorrect ? t('quiz.status.result_correct') : t('quiz.status.result_incorrect')
                                )}
                            </div>
                        </div>
                        {currentQuestion.factCheck && (
                             <div className="bg-white/95 backdrop-blur-xl text-slate-800 p-6 rounded-3xl border border-white/20 shadow-2xl w-full text-left relative overflow-hidden z-20">
                                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                 <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                                     <Sparkles size={14} className="fill-yellow-400 text-yellow-500"/> Explanation
                                 </h4>
                                 {/* XSS guard: factCheck is AI-generated; escape <,>,& BEFORE the markdown-to-HTML replacements so injected tags can't echo through. */}
                                 <div
                                    className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: String(currentQuestion.factCheck)
                                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\n/g, '<br/>') }}
                                 />
                                 {showTranslated && currentQuestion.factCheck_en && (
                                     <div className="mt-3 pt-3 border-t border-slate-200">
                                         <p className="text-xs text-slate-600 italic whitespace-pre-wrap">
                                             {currentQuestion.factCheck_en}
                                         </p>
                                     </div>
                                 )}
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        <button
            type="button"
            onClick={() => setIsLocallyDismissed(true)}
            className="absolute right-4 top-4 z-[60] min-h-11 rounded-lg border-2 border-white/70 bg-slate-950/90 px-4 py-2 text-sm font-bold text-white shadow-lg"
            aria-label="Leave live quiz view"
        >
            Exit quiz view
        </button>
    </div>
  );
});

const TeacherGate = React.memo(({ isOpen, onClose, onUnlock }) => {
  const { t } = useContext(LanguageContext);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  const gateRef = useRef(null);
  useFocusTrap(gateRef, isOpen, onClose);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Verify against a stored PBKDF2 hash envelope (the password itself is never kept in
    // the clear). Legacy console-set plaintext keys still work via the string branch.
    const _key = APP_CONFIG._cfg_validation_key;
    let _ok = false;
    if (_key && typeof _key === 'object' && _key.kind === 'pwhash' && window.AlloModules && window.AlloModules.AlloCrypto) {
      try { _ok = await window.AlloModules.AlloCrypto.verifyPassword(passwordInput, _key); } catch (_) { _ok = false; }
    } else if (typeof _key === 'string') {
      _ok = passwordInput === _key;
    }
    if (_ok) {
      onUnlock();
      onClose();
      setPasswordInput('');
      setError(false);
    } else {
      setError(true);
    }
  };
  return (
    <div ref={gateRef} className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-300 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="teacher-gate-title" aria-describedby="teacher-gate-helper" data-allo-ui-modal="teacher-gate" data-help-key="teacher_gate_modal">
      <style>{UI_MODAL_A11Y_STYLES}</style>
      <div className="my-auto max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center border-4 border-indigo-100 relative transform transition-all animate-in zoom-in-95 motion-reduce:animate-none motion-reduce:transition-none">

        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-200 shadow-sm">
            <Lock aria-hidden="true" size={32} className="text-red-600" />
        </div>
        <h2 id="teacher-gate-title" className="text-2xl font-black text-slate-800 mb-2">{t('modals.teacher_gate.title')}</h2>
        <p id="teacher-gate-helper" className="text-slate-600 mb-6 text-sm font-medium">{t('modals.teacher_gate.helper')}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label id="teacher-gate-access-code-label" htmlFor="teacher-gate-access-code" className="mb-2 block text-sm font-bold text-slate-700">
                    {t('modals.teacher_gate.access_code_placeholder')}
                </label>
                <input
                    id="teacher-gate-access-code"
                    type="password"
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setError(false);
                    }}
                    placeholder={t('modals.teacher_gate.access_code_placeholder')}
                    className={`w-full text-center text-lg p-3 border-2 rounded-xl outline-none focus:ring-4 transition-all placeholder:text-slate-600 ${error ? 'border-red-400 bg-red-50 focus:ring-red-200 text-red-900' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-indigo-900'}`}
                    autoFocus
                    aria-invalid={error}
                    aria-labelledby="teacher-gate-access-code-label"
                    aria-describedby={error ? 'teacher-gate-helper teacher-gate-error' : 'teacher-gate-helper'}
                    data-help-key="teacher_gate_input"
                />
                {error && (
                    <p id="teacher-gate-error" role="alert" className="text-xs font-bold text-red-700 mt-2 flex items-center justify-center gap-1">
                        <XCircle aria-hidden="true" size={12} /> {t('modals.teacher_gate.error_incorrect')}
                    </p>
                )}
            </div>
            <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                data-help-key="teacher_gate_unlock"
            >
                {t('modals.teacher_gate.unlock')}
            </button>
        </form>
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 min-h-6 min-w-6 text-slate-600 hover:text-slate-900 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label={t('common.cancel')}
            data-alloflow-close-on-escape="true"
        >
            <X aria-hidden="true" size={20} />
        </button>
      </div>
    </div>
  );
});

const RoleSelectionModal = React.memo(({ onSelect, onGateRequired }) => {
  const { t } = useContext(LanguageContext);
  const roleRef = useRef(null);
  useFocusTrap(roleRef, true);
  const handleRoleClick = (role) => {
    if (APP_CONFIG._cfg_validation_key && ['teacher', 'parent', 'independent'].includes(role)) {
        if (onGateRequired) onGateRequired(role);
    } else {
        onSelect(role);
    }
  };
  const [micStatus, setMicStatus] = useState('idle');
  const handleMicCheck = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          setMicStatus('unsupported');
          return;
      }
      setMicStatus('requesting');
      const recognition = new SpeechRecognition();
      recognition.onstart = () => {
          setMicStatus('granted');
          recognition.stop();
      };
      recognition.onerror = (event) => {
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
              setMicStatus('denied');
          } else {
              setMicStatus('denied');
          }
      };
      try {
          recognition.start();
      } catch (e) {
          warnLog("Unhandled error:", e);
          setMicStatus('denied');
      }
  };
  const micStatusText = micStatus === 'granted' ? t('roles.mic_ready') :
      micStatus === 'unsupported' ? t('roles.voice_not_supported') :
      micStatus === 'denied' ? t('roles.mic_denied') :
      micStatus === 'requesting' ? t('roles.mic_requesting') :
      t('roles.mic_enable');
  return (
  <div
    ref={roleRef}
    className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md overflow-y-auto py-4 sm:py-8 px-4 animate-in fade-in duration-300 motion-reduce:animate-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="role-selection-title"
    aria-describedby="role-selection-description"
    data-allo-ui-modal="role-selection"
  >
    <style>{UI_MODAL_A11Y_STYLES}</style>
    <div className="min-h-full flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-3xl w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none relative">
      <div className="flex justify-end mb-2">
          <UiLanguageSelector />
      </div>
      <div className="flex justify-center mb-6">
        <div className="bg-indigo-100 p-4 rounded-full shadow-inner">
           <Layers size={48} className="text-indigo-600" />
        </div>
      </div>
      <h2 id="role-selection-title" className="text-3xl font-black text-slate-800 mb-2 tracking-tight">{t('roles.title')}</h2>
      <p id="role-selection-description" className="text-slate-600 mb-8 font-medium">{t('roles.subtitle')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
            onClick={() => handleRoleClick('student')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-teal-400 hover:bg-teal-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_student"
        >
            <div className="bg-teal-100 text-teal-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12">
                <GraduationCap size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-teal-700">{t('roles.student')}</span>
        </button>
        <button
            onClick={() => handleRoleClick('teacher')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_teacher"
        >
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:-rotate-12">
                <School size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-indigo-700">{t('roles.teacher')}</span>
        </button>
        <button
            onClick={() => handleRoleClick('parent')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_parent"
        >
            <div className="bg-orange-100 text-orange-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12">
                <Heart size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-orange-700">{t('roles.parent')}</span>
        </button>
        <button
            onClick={() => handleRoleClick('independent')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_independent"
        >
            <div className="bg-cyan-100 text-cyan-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12">
                <UserCircle2 size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-cyan-700">{t('roles.independent')}</span>
        </button>
      </div>
      <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-2">{t('roles.mic_setup')}</p>
          <button
            type="button"
            onClick={handleMicCheck}
            disabled={micStatus === 'granted' || micStatus === 'requesting'}
            aria-busy={micStatus === 'requesting'}
            aria-describedby="role-mic-status"
            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold transition-all ${
                micStatus === 'granted' ? 'bg-green-100 text-green-700 cursor-default' :
                micStatus === 'denied' || micStatus === 'unsupported' ? 'bg-red-50 text-red-700 border border-red-200' :
                micStatus === 'requesting' ? 'bg-slate-100 text-slate-600' :
                'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
              {micStatus === 'granted' ? <CheckCircle aria-hidden="true" size={14} /> :
               micStatus === 'denied' || micStatus === 'unsupported' ? <XCircle aria-hidden="true" size={14} /> :
               micStatus === 'requesting' ? <RefreshCw aria-hidden="true" size={14} className="animate-spin motion-reduce:animate-none"/> :
               <Mic aria-hidden="true" size={14} />}
              <span>{micStatusText}</span>
          </button>
          <p id="role-mic-status" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {micStatus === 'idle' ? '' : micStatusText}
          </p>
          {micStatus === 'idle' && (
              <p id="role-mic-tip" className="text-[11px] text-slate-600 mt-2">
                  {t('roles.mic_tip')}
              </p>
          )}
      </div>
    </div>
    </div>
  </div>
  );
});

const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm }) => {
  const { t } = useContext(LanguageContext);
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const entryRef = useRef(null);
  useFocusTrap(entryRef, isOpen, onClose);
  const adjectives = t('codenames.adjectives', { returnObjects: true }) || [];
  const animals = t('codenames.animals', { returnObjects: true }) || [];
  const randomizeName = useCallback(() => {
    if (adjectives.length > 0 && animals.length > 0) {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        setSelectedAdj(adj);
        setSelectedAnimal(animal);
    }
  }, [adjectives, animals]);
  useEffect(() => {
    if (isOpen && (!selectedAdj || !selectedAnimal)) {
      randomizeName();
    }
  }, [isOpen, randomizeName]);
  const getFullName = () => `${selectedAdj} ${selectedAnimal}`;
  const handleConfirm = (mode) => {
    if (selectedAdj && selectedAnimal) {
      onConfirm(getFullName(), mode);
    }
  };
  if (!isOpen) return null;
  return (
    <div
        ref={entryRef}
        className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-300 motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-entry-title"
        aria-describedby="student-entry-description"
        data-allo-ui-modal="student-entry"
    >
      <style>{UI_MODAL_A11Y_STYLES}</style>
      <div className="my-auto max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none relative">
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 min-h-6 min-w-6 p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={t('common.close')}
            data-alloflow-close-on-escape="true"
        >
            <X aria-hidden="true" size={20} />
        </button>
        <h2 id="student-entry-title" className="text-2xl font-black text-slate-800 mb-2">{t('wizard.step_codename') || 'Pick Your Codename!'}</h2>
        <p id="student-entry-description" className="text-slate-600 mb-6 font-medium">{t('modals.student_entry_sub')}</p>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
                <label className="text-left text-xs font-bold text-indigo-900">
                    <span className="mb-1 block">{t('modals.entry.select_adjective')}</span>
                    <select
                        value={selectedAdj}
                        onChange={(e) => setSelectedAdj(e.target.value)}
                        className="w-full min-h-11 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm cursor-pointer"
                        aria-label={t('modals.entry.select_adjective')}
                        data-help-key="entry_adjective"
                    >
                        {adjectives.map((adj, i) => (
                            <option key={i} value={adj}>{adj}</option>
                        ))}
                    </select>
                </label>
                <label className="text-left text-xs font-bold text-indigo-900">
                    <span className="mb-1 block">{t('modals.entry.select_animal')}</span>
                    <select
                        value={selectedAnimal}
                        onChange={(e) => setSelectedAnimal(e.target.value)}
                        className="w-full min-h-11 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm cursor-pointer"
                        aria-label={t('modals.entry.select_animal')}
                        data-help-key="entry_animal"
                    >
                        {animals.map((anim, i) => (
                            <option key={i} value={anim}>{anim}</option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                <div className="text-xl font-black text-indigo-600 tracking-tight truncate mr-2" role="status" aria-live="polite" aria-atomic="true">
                    {selectedAdj} {selectedAnimal}
                </div>
                <button
                    type="button"
                    onClick={randomizeName}
                    className="min-h-6 min-w-6 p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 motion-reduce:hover:scale-100 transition-all shrink-0"
                    title={t('modals.entry.randomize_codename')}
                    aria-label={t('modals.entry.randomize_codename')}
                    data-help-key="entry_randomize_btn"
                >
                    <RefreshCw aria-hidden="true" size={18} />
                </button>
            </div>
        </div>
        <p className="text-xs text-slate-600 font-bold flex items-center justify-center gap-1 mb-6">
            <ShieldCheck aria-hidden="true" size={12} className="text-green-500"/> {t('entry.warning')}
        </p>
        <div className="flex flex-col gap-3">
            <button
                onClick={() => handleConfirm('new')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-help-key="entry_start_new"
            >
                <Sparkles size={18} className="text-yellow-400 fill-current" /> {t('entry.start')}
            </button>
            <button
                onClick={() => handleConfirm('load')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                data-help-key="entry_load_exist"
            >
                <Upload size={16} /> {t('entry.load')}
            </button>
        </div>
        <button type="button" onClick={onClose} className="mt-4 min-h-6 inline-flex items-center text-sm text-slate-600 hover:text-slate-900 underline rounded">{t('common.cancel')}</button>
      </div>
    </div>
  );
});

const StudentWelcomeModal = React.memo(({ isOpen, onClose, onUpload }) => {
  const { t } = useContext(LanguageContext);
  const welcomeRef = useRef(null);
  useFocusTrap(welcomeRef, isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div
        ref={welcomeRef}
        className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-300 motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-welcome-title"
        aria-describedby="student-welcome-description"
        data-allo-ui-modal="student-welcome"
    >
      <style>{UI_MODAL_A11Y_STYLES}</style>
      <div className="my-auto max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border-4 border-teal-100 transform transition-all animate-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none relative">
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 min-h-6 min-w-6 p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={t('welcome.close_aria')}
            data-alloflow-close-on-escape="true"
        >
            <X aria-hidden="true" size={20} />
        </button>
        <div className="flex justify-center mb-6">
          <div className="bg-teal-100 p-4 rounded-full shadow-inner">
             <FolderOpen aria-hidden="true" size={48} className="text-teal-600" />
          </div>
        </div>
        <h2 id="student-welcome-title" className="text-2xl font-black text-slate-800 mb-2">{t('modals.student_welcome')}</h2>
        <p id="student-welcome-description" className="text-slate-600 mb-8 font-medium">{t('welcome.prompt')}</p>
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => {
                    onUpload();
                    onClose();
                }}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95"
                data-help-key="welcome_load_btn"
            >
                <Upload size={20} /> {t('welcome.load')}
            </button>
            <button
                type="button"
                onClick={onClose}
                className="w-full p-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors active:scale-95"
                data-help-key="welcome_skip_btn"
            >
                {t('welcome.skip')}
            </button>
        </div>
      </div>
    </div>
  );
});

window.AlloModules = window.AlloModules || {};
window.AlloModules.StudentQuizOverlay = StudentQuizOverlay;
window.AlloModules.TeacherGate = TeacherGate;
window.AlloModules.RoleSelectionModal = RoleSelectionModal;
window.AlloModules.StudentEntryModal = StudentEntryModal;
window.AlloModules.StudentWelcomeModal = StudentWelcomeModal;
window.AlloModules.UIModalsModule = true;
console.log('[UIModalsModule] 5 components registered');
