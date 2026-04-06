(function() {
'use strict';
if (window.AlloModules && window.AlloModules.UIModalsModule) { console.log('[CDN] UIModalsModule already loaded, skipping'); return; }
// ui_modals_source.jsx — StudentQuizOverlay, TeacherGate, RoleSelectionModal, StudentEntryModal, StudentWelcomeModal
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useFocusTrap = window.__alloHooks && window.__alloHooks.useFocusTrap;
var UiLanguageSelector = window.UiLanguageSelector || function () {
  return null;
};
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var APP_CONFIG = window.APP_CONFIG || {};
var warnLog = window.warnLog || function () {
  console.warn.apply(console, arguments);
};
var doc = window._fbDoc || function () {
  return null;
};
var updateDoc = window._fbUpdateDoc || function () {
  return Promise.resolve();
};
var db = window._fbDb || null;
// Lazy icon wrappers — window.AlloIcons is set in a useEffect after CDN scripts load,
// so each icon must look up window.AlloIcons at RENDER time, not at script load time.
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
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
var XCircle = _lazyIcon('XCircle');
const StudentQuizOverlay = React.memo(({
  sessionData,
  generatedContent,
  user,
  activeSessionCode,
  targetAppId
}) => {
  const {
    t
  } = useContext(LanguageContext);
  if (!sessionData?.quizState?.isActive || !generatedContent || generatedContent.type !== 'quiz') return null;
  const {
    mode,
    currentQuestionIndex,
    phase,
    teams,
    bossStats,
    responses
  } = sessionData.quizState;
  const currentQuestion = generatedContent?.data.questions?.[currentQuestionIndex];
  const teamColor = user ? teams?.[user.uid] : null;
  const studentGroupId = sessionData.roster?.[user?.uid]?.groupId;
  const studentGroup = studentGroupId ? sessionData.groups?.[studentGroupId] : null;
  const groupLanguage = studentGroup?.language;
  const showTranslated = groupLanguage && groupLanguage !== 'English';
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  useEffect(() => {
    if (user && responses && responses[user.uid] !== undefined) {
      setHasAnswered(true);
      setSelectedOptionIndex(responses[user.uid]);
    } else {
      if (!responses || responses[user.uid] === undefined) {
        setHasAnswered(false);
        setSelectedOptionIndex(null);
      }
    }
  }, [currentQuestionIndex, responses, user]);
  useEffect(() => {
    if (mode === 'team-showdown' && user && activeSessionCode) {
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
  }, [mode, user, teams, activeSessionCode, targetAppId]);
  const submitQuizResponse = async optionIndex => {
    if (hasAnswered || !user || !activeSessionCode) return;
    setHasAnswered(true);
    setSelectedOptionIndex(optionIndex);
    try {
      const effectiveAppId = targetAppId || appId;
      const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
      await updateDoc(sessionRef, {
        [`quizState.responses.${user.uid}`]: optionIndex
      });
    } catch (e) {
      warnLog("Error submitting quiz response:", e);
      setHasAnswered(false);
      setSelectedOptionIndex(null);
      alert(t('errors.quiz_submit_failed'));
    }
  };
  const getModeStyles = () => {
    switch (mode) {
      case 'boss-battle':
        return {
          bg: 'bg-slate-900',
          accent: 'text-red-500',
          icon: '⚔️'
        };
      case 'team-showdown':
        return {
          bg: 'bg-slate-900',
          accent: 'text-yellow-400',
          icon: '🏆'
        };
      case 'live-pulse':
        return {
          bg: 'bg-indigo-950',
          accent: 'text-cyan-400',
          icon: '📊'
        };
      default:
        return {
          bg: 'bg-indigo-950',
          accent: 'text-white',
          icon: '📝'
        };
    }
  };
  const styles = getModeStyles();
  const getTeamBadgeColor = color => {
    switch (color) {
      case 'Red':
        return 'bg-red-600 text-white';
      case 'Blue':
        return 'bg-blue-600 text-white';
      case 'Green':
        return 'bg-green-600 text-white';
      case 'Yellow':
        return 'bg-yellow-400 text-black';
      default:
        return 'bg-slate-600 text-white';
    }
  };
  const isRevealed = phase === 'revealed';
  const correctAnswerIndex = currentQuestion?.options?.findIndex(opt => opt === currentQuestion.correctAnswer);
  const isCorrect = isRevealed && selectedOptionIndex === correctAnswerIndex;
  return /*#__PURE__*/React.createElement("div", {
    className: `fixed inset-0 z-[1000] ${styles.bg} flex flex-col animate-in slide-in-from-bottom duration-500 text-white font-sans`,
    "data-help-key": "quiz_student_overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 flex justify-between items-start bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: `font-black text-xl uppercase tracking-widest ${styles.accent} flex items-center gap-2 drop-shadow-md`,
    "data-help-key": "quiz_student_mode_header"
  }, /*#__PURE__*/React.createElement("span", null, styles.icon), /*#__PURE__*/React.createElement("span", null, mode.replace(/-/g, ' '))), teamColor && /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-2 inline-block shadow-sm ${getTeamBadgeColor(teamColor)}`
  }, t('quiz.team_label', {
    color: teamColor
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-end"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider"
  }, t('quiz.question_label')), /*#__PURE__*/React.createElement("span", {
    className: "text-3xl font-mono font-black text-white leading-none"
  }, currentQuestionIndex + 1, " ", /*#__PURE__*/React.createElement("span", {
    className: "text-lg text-white/50"
  }, "/ ", generatedContent?.data.questions.length)))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
  }, phase === 'boss-defeated' && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-900/95 to-emerald-800/95 backdrop-blur-lg animate-in zoom-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-8xl mb-6"
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h2", {
    className: "text-5xl font-black text-white mb-4 drop-shadow-lg"
  }, t('quiz.boss.victory_msg')), /*#__PURE__*/React.createElement("p", {
    className: "text-xl text-green-200"
  }, bossStats?.name || t('quiz.boss.name_fallback'), " ", t('quiz.boss.defeat_suffix')))), phase === 'class-defeated' && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-900/95 to-rose-800/95 backdrop-blur-lg animate-in zoom-in duration-500"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-8xl mb-6"
  }, "\uD83D\uDC80"), /*#__PURE__*/React.createElement("h2", {
    className: "text-5xl font-black text-white mb-4 drop-shadow-lg"
  }, t('quiz.boss.class_defeat_msg')), /*#__PURE__*/React.createElement("p", {
    className: "text-xl text-red-200"
  }, t('quiz.boss.class_fallen_msg')))), mode === 'boss-battle' && bossStats && /*#__PURE__*/React.createElement("div", {
    className: "mb-8 w-full max-w-lg flex flex-col items-center animate-in fade-in zoom-in duration-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: `relative mb-6 ${phase === 'revealed' && bossStats.lastDamage > 0 ? 'animate-shake' : ''}`
  }, bossStats.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: bossStats.image,
    alt: t('quiz.boss.alt_text'),
    className: "w-32 h-32 md:w-48 md:h-48 object-contain pixelated drop-shadow-2xl",
    style: STYLE_IMAGE_PIXELATED
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-24 md:w-32 md:h-32 bg-red-900/50 rounded-full border-4 border-red-500/50 flex items-center justify-center text-4xl shadow-xl backdrop-blur-sm"
  }, bossStats.isGenerating ? /*#__PURE__*/React.createElement(RefreshCw, {
    className: "animate-spin text-red-400"
  }) : "👾"), phase === 'revealed' && bossStats.lastDamage > 0 && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 right-[-20px] text-red-500 font-black text-3xl animate-[bounce_0.5s_infinite] z-20 stroke-white drop-shadow-md"
  }, "-", bossStats.lastDamage)), /*#__PURE__*/React.createElement("div", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement("span", null, bossStats.name || "Boss", " HP"), /*#__PURE__*/React.createElement("span", null, Math.round(bossStats.currentHP), " / ", bossStats.maxHP)), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-6 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 relative shadow-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out",
    style: {
      width: `${Math.max(0, bossStats.currentHP / bossStats.maxHP * 100)}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement("span", null, t('quiz.boss.class_hp')), /*#__PURE__*/React.createElement("span", null, Math.round(bossStats.classHP ?? 100), " / ", bossStats.classMaxHP || 100)), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-5 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 relative shadow-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500 ease-out",
    style: {
      width: `${Math.max(0, (bossStats.classHP ?? 100) / (bossStats.classMaxHP || 100) * 100)}%`
    }
  })), phase === 'revealed' && bossStats.lastClassDamage > 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-orange-400 text-xs font-bold mt-1 animate-pulse text-center"
  }, t('quiz.boss.counter_attack_msg', {
    damage: bossStats.lastClassDamage
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl max-w-3xl w-full"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm",
    "data-help-key": "quiz_student_question"
  }, currentQuestion ? currentQuestion.question : t('quiz.loading_question')), currentQuestion && showTranslated && currentQuestion.question_en && /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-base md:text-lg text-white/70 italic"
  }, currentQuestion.question_en)), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 px-4"
  }, currentQuestion?.options?.map((option, idx) => {
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
        btnClass = 'bg-slate-800 text-slate-500 border-slate-900 opacity-50';
        letterClass = 'bg-slate-700 text-slate-500 border-slate-600';
      }
    } else if (isSelected) {
      btnClass = 'bg-yellow-400 text-indigo-900 border-yellow-600 scale-[1.02] ring-4 ring-yellow-200/50 z-10';
      letterClass = 'bg-indigo-900 text-yellow-400 border-indigo-900';
    } else if (isDisabled) {
      btnClass = 'bg-slate-800 text-slate-500 border-slate-900 opacity-60 cursor-not-allowed';
      letterClass = 'bg-slate-700 text-slate-500 border-slate-600';
    }
    return /*#__PURE__*/React.createElement("button", {
      key: idx,
      "data-help-key": "quiz_student_answer_option",
      onClick: () => submitQuizResponse(idx),
      disabled: isDisabled,
      className: `
                                relative group overflow-hidden p-6 rounded-2xl font-bold text-lg md:text-xl transition-all transform duration-300 shadow-xl border-b-4 active:border-b-0 active:translate-y-1
                                ${btnClass}
                            `
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-4 relative z-10"
    }, /*#__PURE__*/React.createElement("div", {
      className: `
                                    w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 border-2 transition-colors
                                    ${letterClass}
                                `
    }, letter), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-col items-start gap-1 text-left leading-tight"
    }, /*#__PURE__*/React.createElement("span", null, option), showTranslated && currentQuestion?.options_en?.[idx] && /*#__PURE__*/React.createElement("span", {
      className: "text-xs opacity-60 font-normal italic"
    }, currentQuestion.options_en[idx]))), isSelected && !isRevealed && /*#__PURE__*/React.createElement("div", {
      className: "absolute top-2 right-2 text-indigo-900 animate-in zoom-in duration-300"
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 24,
      className: "fill-white"
    })), isRevealed && idx === correctAnswerIndex && /*#__PURE__*/React.createElement("div", {
      className: "absolute top-2 right-2 text-white animate-in zoom-in duration-300"
    }, /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 24
    })), isRevealed && isSelected && idx !== correctAnswerIndex && /*#__PURE__*/React.createElement("div", {
      className: "absolute top-2 right-2 text-white animate-in zoom-in duration-300"
    }, /*#__PURE__*/React.createElement(XCircle, {
      size: 24
    })));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 min-h-16 flex items-center justify-center w-full mb-8"
  }, phase === 'answering' && (hasAnswered ? /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-sm animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 border border-white/10 shadow-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "relative flex h-3 w-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
  }), /*#__PURE__*/React.createElement("span", {
    className: "relative inline-flex rounded-full h-3 w-3 bg-green-500"
  })), t('quiz.status.answer_sent')) : /*#__PURE__*/React.createElement("div", {
    className: "text-white/50 font-mono text-xs uppercase tracking-widest animate-pulse"
  }, t('quiz.status.choose_option'))), phase === 'revealed' && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-6 items-center w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500 px-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: `
                            w-full px-8 py-6 rounded-3xl font-black text-2xl shadow-2xl flex items-center justify-center gap-6 border-4 transform transition-transform hover:scale-105
                            ${isCorrect ? 'bg-green-700 border-green-500 text-white ring-4 ring-green-700/30' : 'bg-red-500 border-red-300 text-white ring-4 ring-red-500/30'}
                        `
  }, isCorrect ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 40,
    className: "fill-white text-green-500"
  }) : /*#__PURE__*/React.createElement(XCircle, {
    size: 40,
    className: "fill-white text-red-500"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "uppercase tracking-widest text-xs opacity-90 mb-1 font-medium"
  }, t('quiz.result_label')), mode === 'boss-battle' ? isCorrect ? t('quiz.status.result_hit', {
    damage: 10
  }) : t('quiz.status.result_miss', {
    hp: 5
  }) : mode === 'team-showdown' ? isCorrect ? teamColor ? t('quiz.status.result_score', {
    points: 100
  }) : t('quiz.status.result_score_generic') : t('quiz.status.result_no_points') : isCorrect ? t('quiz.status.result_correct') : t('quiz.status.result_incorrect'))), currentQuestion.factCheck && /*#__PURE__*/React.createElement("div", {
    className: "bg-white/95 backdrop-blur-xl text-slate-800 p-6 rounded-3xl border border-white/20 shadow-2xl w-full text-left relative overflow-hidden z-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
  }), /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-100 pb-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "fill-yellow-400 text-yellow-500"
  }), " Explanation"), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap",
    dangerouslySetInnerHTML: {
      __html: currentQuestion.factCheck.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
    }
  }), showTranslated && currentQuestion.factCheck_en && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-slate-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 italic whitespace-pre-wrap"
  }, currentQuestion.factCheck_en)))))));
});
const TeacherGate = React.memo(({
  isOpen,
  onClose,
  onUnlock
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState(false);
  if (!isOpen) return null;
  const handleSubmit = e => {
    e.preventDefault();
    if (passwordInput === APP_CONFIG._cfg_validation_key) {
      onUnlock();
      onClose();
      setPasswordInput('');
      setError(false);
    } else {
      setError(true);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300",
    "data-help-key": "teacher_gate_modal"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-indigo-100 relative transform transition-all animate-in zoom-in-95"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "absolute top-4 right-4 text-slate-500 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100",
    "aria-label": t('common.cancel')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-200 shadow-sm"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 32,
    className: "text-red-600"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 mb-2"
  }, t('modals.teacher_gate.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 mb-6 text-sm font-medium"
  }, t('modals.teacher_gate.helper')), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSubmit,
    className: "flex flex-col gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: passwordInput,
    onChange: e => {
      setPasswordInput(e.target.value);
      setError(false);
    },
    placeholder: t('modals.teacher_gate.access_code_placeholder'),
    className: `w-full text-center text-lg p-3 border-2 rounded-xl outline-none focus:ring-4 transition-all placeholder:text-slate-500 ${error ? 'border-red-400 bg-red-50 focus:ring-red-200 text-red-900' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-indigo-900'}`,
    autoFocus: true,
    "aria-label": t('modals.teacher_gate.access_code_placeholder'),
    "data-help-key": "teacher_gate_input"
  }), String(error) && /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-red-500 mt-2 animate-pulse flex items-center justify-center gap-1"
  }, /*#__PURE__*/React.createElement(XCircle, {
    size: 12
  }), " ", t('modals.teacher_gate.error_incorrect'))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
    "data-help-key": "teacher_gate_unlock"
  }, t('modals.teacher_gate.unlock')))));
});
const RoleSelectionModal = React.memo(({
  onSelect,
  onGateRequired
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const roleRef = useRef(null);
  useFocusTrap(roleRef, true);
  const handleRoleClick = role => {
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
      alert(t('roles.voice_not_supported'));
      return;
    }
    setMicStatus('requesting');
    const recognition = new SpeechRecognition();
    recognition.onstart = () => {
      setMicStatus('granted');
      recognition.stop();
    };
    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicStatus('denied');
      } else {
        setMicStatus('granted');
      }
    };
    try {
      recognition.start();
    } catch (e) {
      warnLog("Unhandled error:", e);
      setMicStatus('denied');
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: roleRef,
    role: "dialog",
    "aria-modal": "true",
    className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md overflow-y-auto py-8 px-4 animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-h-full flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-4 right-4"
  }, /*#__PURE__*/React.createElement(UiLanguageSelector, null)), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-4 rounded-full shadow-inner"
  }, /*#__PURE__*/React.createElement(Layers, {
    size: 48,
    className: "text-indigo-600"
  }))), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-black text-slate-800 mb-2 tracking-tight"
  }, t('roles.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 mb-8 font-medium"
  }, t('roles.subtitle')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRoleClick('student'),
    className: "flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-teal-400 hover:bg-teal-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none",
    "data-help-key": "role_student"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-100 text-teal-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12"
  }, /*#__PURE__*/React.createElement(GraduationCap, {
    size: 32
  })), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700 group-hover:text-teal-700"
  }, t('roles.student'))), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRoleClick('teacher'),
    className: "flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none",
    "data-help-key": "role_teacher"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:-rotate-12"
  }, /*#__PURE__*/React.createElement(School, {
    size: 32
  })), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700 group-hover:text-indigo-700"
  }, t('roles.teacher'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.like'),
    onClick: () => handleRoleClick('parent'),
    className: "flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none",
    "data-help-key": "role_parent"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-100 text-orange-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12"
  }, /*#__PURE__*/React.createElement(Heart, {
    size: 32
  })), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700 group-hover:text-orange-700"
  }, t('roles.parent'))), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRoleClick('independent'),
    className: "flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none",
    "data-help-key": "role_independent"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-cyan-100 text-cyan-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12"
  }, /*#__PURE__*/React.createElement(UserCircle2, {
    size: 32
  })), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-700 group-hover:text-cyan-700"
  }, t('roles.independent')))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2"
  }, t('roles.mic_setup')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.confirm'),
    onClick: handleMicCheck,
    disabled: micStatus === 'granted' || micStatus === 'requesting',
    className: `flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold transition-all ${micStatus === 'granted' ? 'bg-green-100 text-green-700 cursor-default' : micStatus === 'denied' ? 'bg-red-50 text-red-500 border border-red-100' : micStatus === 'requesting' ? 'bg-slate-100 text-slate-500' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`
  }, micStatus === 'granted' ? /*#__PURE__*/React.createElement(CheckCircle, {
    size: 14
  }) : micStatus === 'denied' ? /*#__PURE__*/React.createElement(XCircle, {
    size: 14
  }) : micStatus === 'requesting' ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Mic, {
    size: 14
  }), micStatus === 'granted' ? t('roles.mic_ready') : micStatus === 'denied' ? t('roles.mic_denied') : micStatus === 'requesting' ? t('roles.mic_requesting') : t('roles.mic_enable')), micStatus === 'idle' && /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mt-2"
  }, t('roles.mic_tip'))))));
});
const StudentEntryModal = React.memo(({
  isOpen,
  onClose,
  onConfirm
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const entryRef = useRef(null);
  useFocusTrap(entryRef, isOpen);
  const adjectives = t('codenames.adjectives') || [];
  const animals = t('codenames.animals') || [];
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
  const handleConfirm = mode => {
    if (selectedAdj && selectedAnimal) {
      onConfirm(getFullName(), mode);
    }
  };
  if (!isOpen) return null;
  return /*#__PURE__*/React.createElement("div", {
    ref: entryRef,
    role: "dialog",
    "aria-modal": "true",
    className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 mb-2"
  }, t('wizard.step_codename') || 'Pick Your Codename!'), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 mb-6 font-medium"
  }, t('modals.student_entry_sub')), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("select", {
    value: selectedAdj,
    onChange: e => setSelectedAdj(e.target.value),
    className: "w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer",
    "aria-label": t('modals.entry.select_adjective'),
    "data-help-key": "entry_adjective"
  }, adjectives.map((adj, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: adj
  }, adj))), /*#__PURE__*/React.createElement("select", {
    value: selectedAnimal,
    onChange: e => setSelectedAnimal(e.target.value),
    className: "w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer",
    "aria-label": t('modals.entry.select_animal'),
    "data-help-key": "entry_animal"
  }, animals.map((anim, i) => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: anim
  }, anim)))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xl font-black text-indigo-600 tracking-tight truncate mr-2"
  }, selectedAdj, " ", selectedAnimal), /*#__PURE__*/React.createElement("button", {
    onClick: randomizeName,
    className: "p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 transition-all shrink-0",
    title: t('modals.entry.randomize_codename'),
    "aria-label": t('modals.entry.randomize_codename'),
    "data-help-key": "entry_randomize_btn"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18
  })))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 font-bold flex items-center justify-center gap-1 mb-6"
  }, /*#__PURE__*/React.createElement(ShieldCheck, {
    size: 12,
    className: "text-green-500"
  }), " ", t('entry.warning')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.generate'),
    onClick: () => handleConfirm('new'),
    disabled: !selectedAdj || !selectedAnimal,
    className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
    "data-help-key": "entry_start_new"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 18,
    className: "text-yellow-400 fill-current"
  }), " ", t('entry.start')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.upload'),
    onClick: () => handleConfirm('load'),
    disabled: !selectedAdj || !selectedAnimal,
    className: "w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed",
    "data-help-key": "entry_load_exist"
  }, /*#__PURE__*/React.createElement(Upload, {
    size: 16
  }), " ", t('entry.load'))), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "mt-4 text-sm text-slate-500 hover:text-slate-600 underline focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
  }, t('common.cancel'))));
});
const StudentWelcomeModal = React.memo(({
  isOpen,
  onClose,
  onUpload
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const welcomeRef = useRef(null);
  useFocusTrap(welcomeRef, isOpen);
  if (!isOpen) return null;
  return /*#__PURE__*/React.createElement("div", {
    ref: welcomeRef,
    role: "dialog",
    "aria-modal": "true",
    className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-teal-100 transform transition-all animate-in zoom-in-95 duration-300 relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors",
    "aria-label": t('welcome.close_aria')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-100 p-4 rounded-full shadow-inner"
  }, /*#__PURE__*/React.createElement(FolderOpen, {
    size: 48,
    className: "text-teal-600"
  }))), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 mb-2"
  }, t('modals.student_welcome')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 mb-8 font-medium"
  }, t('welcome.prompt')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.upload'),
    onClick: () => {
      onUpload();
      onClose();
    },
    className: "w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-700 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95",
    "data-help-key": "welcome_load_btn"
  }, /*#__PURE__*/React.createElement(Upload, {
    size: 20
  }), " ", t('welcome.load')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    onClick: onClose,
    className: "w-full p-3 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-colors active:scale-95",
    "data-help-key": "welcome_skip_btn"
  }, t('welcome.skip')))));
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.StudentQuizOverlay = StudentQuizOverlay;
window.AlloModules.TeacherGate = TeacherGate;
window.AlloModules.RoleSelectionModal = RoleSelectionModal;
window.AlloModules.StudentEntryModal = StudentEntryModal;
window.AlloModules.StudentWelcomeModal = StudentWelcomeModal;
window.AlloModules.UIModalsModule = true;
console.log('[UIModalsModule] 5 components registered');
})();
