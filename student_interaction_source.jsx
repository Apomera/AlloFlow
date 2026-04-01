// Student Interaction Components — extracted from AlloFlowANTI.txt

// ═══ StudentSubmitModal (lines 5776-5961) ═══
const StudentSubmitModal = React.memo(({ isOpen, onClose, onSubmit, history = [], currentNickname = "" }) => {
  const { t } = useContext(LanguageContext);
  const adjectives = t('codenames.adjectives') || [];
  const animals = t('codenames.animals') || [];
  const parseNickname = useCallback((nickname) => {
    if (!nickname || typeof nickname !== 'string') return { adj: '', animal: '' };
    const parts = nickname.trim().split(' ');
    if (parts.length >= 2) {
      const potentialAdj = parts[0];
      const potentialAnimal = parts.slice(1).join(' ');
      if (adjectives.includes(potentialAdj) && animals.includes(potentialAnimal)) {
        return { adj: potentialAdj, animal: potentialAnimal };
      }
    }
    return { adj: '', animal: '' };
  }, [adjectives, animals]);
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const randomizeName = useCallback(() => {
    if (adjectives.length > 0 && animals.length > 0) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const animal = animals[Math.floor(Math.random() * animals.length)];
      setSelectedAdj(adj);
      setSelectedAnimal(animal);
    }
  }, [adjectives, animals]);
  useEffect(() => {
    if (isOpen) {
      const parsed = parseNickname(currentNickname);
      if (parsed.adj && parsed.animal) {
        setSelectedAdj(parsed.adj);
        setSelectedAnimal(parsed.animal);
      } else {
        randomizeName();
      }
    }
  }, [isOpen, currentNickname, parseNickname, randomizeName]);
  const getFullName = () => `${selectedAdj} ${selectedAnimal}`;
  if (!isOpen) return null;
  const getSummaryStats = () => {
    const stats = {
      quizzes: 0,
      adventures: 0,
      readings: 0,
      scaffolds: 0,
    };
    history.forEach(item => {
      if (item.type === 'quiz') stats.quizzes++;
      else if (item.type === 'adventure') stats.adventures++;
      else if (item.type === 'simplified') stats.readings++;
      else if (item.type === 'sentence-frames') stats.scaffolds++;
    });
    return stats;
  };
  const stats = getSummaryStats();
  const getSummaryString = () => {
    const parts = [];
    if (stats.quizzes > 0) {
        const key = stats.quizzes === 1 ? 'modals.summary_details.quiz' : 'modals.summary_details.quizzes';
        parts.push(t(key, { count: stats.quizzes }));
    }
    if (stats.adventures > 0) {
        const key = stats.adventures === 1 ? 'modals.summary_details.adventure' : 'modals.summary_details.adventures';
        parts.push(t(key, { count: stats.adventures }));
    }
    if (stats.readings > 0) {
        const key = stats.readings === 1 ? 'modals.summary_details.reading' : 'modals.summary_details.readings';
        parts.push(t(key, { count: stats.readings }));
    }
    if (parts.length === 0) return t('modals.summary_details.empty');
    return parts.join(', ');
  };
  const handleSubmit = () => {
    const fullName = getFullName();
    if (!selectedAdj || !selectedAnimal) return;
    onSubmit(fullName, stats);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            aria-label={t('common.close')}
        >
            <X size={20} />
        </button>
        <div className="text-center mb-6 relative">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-200">
                <Send size={32} className="text-indigo-600 ml-1" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-1">{t('modals.submit_title')}</h2>
            <p className="text-slate-500 text-sm font-medium">{t('modals.submit_ready')}</p>
        </div>
        <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">{t('modals.student_name_label')}</label>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div className="flex gap-2 mb-3">
                    <select
                        value={selectedAdj}
                        onChange={(e) => setSelectedAdj(e.target.value)}
                        className="w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                        aria-label={t('modals.entry.select_adjective')}
                        data-help-key="entry_adjective"
                    >
                        {adjectives.map((adj, i) => (
                            <option key={i} value={adj}>{adj}</option>
                        ))}
                    </select>
                    <select
                        value={selectedAnimal}
                        onChange={(e) => setSelectedAnimal(e.target.value)}
                        className="w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer"
                        aria-label={t('modals.entry.select_animal')}
                        data-help-key="entry_animal"
                    >
                        {animals.map((anim, i) => (
                            <option key={i} value={anim}>{anim}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                    <div className="text-xl font-black text-indigo-600 tracking-tight truncate mr-2">
                        {selectedAdj} {selectedAnimal}
                    </div>
                    <button
                        onClick={randomizeName}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 transition-all shrink-0"
                        title={t('modals.entry.randomize_codename')}
                        aria-label={t('modals.entry.randomize_codename')}
                        data-help-key="entry_randomize_btn"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">{t('modals.work_summary')}</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckSquare size={16} className="text-teal-500"/>
                    <span className="font-bold">{stats.quizzes}</span> {t('modals.summary_quizzes')}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                    <BookOpen size={16} className="text-green-500"/>
                    <span className="font-bold">{stats.readings}</span> {t('modals.summary_readings')}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapIcon size={16} className="text-purple-500"/>
                    <span className="font-bold">{stats.adventures}</span> {t('modals.summary_adventures')}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Quote size={16} className="text-rose-500"/>
                    <span className="font-bold">{stats.scaffolds}</span> {t('modals.summary_scaffolds')}
                </div>
            </div>
            <div className="text-xs text-slate-500 italic text-center mt-2 pt-2 border-t border-slate-200/50">
                "{getSummaryString()}"
            </div>
        </div>
        <div className="flex flex-col gap-3">
            <button aria-label={t('common.download')}
                onClick={handleSubmit}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                data-help-key="submit_confirm_btn"
            >
                <Download size={18} /> {t('modals.download_submission')}
            </button>
            <p className="text-xs text-center text-slate-500 font-medium px-4">
                {t('modals.upload_instruction')}
            </p>
            <button
                aria-label={t('common.close')}
                onClick={onClose}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-3 rounded-xl transition-all active:scale-95"
            >
                {t('common.cancel')}
            </button>
        </div>
      </div>
    </div>
  );
});

// ═══ DraftFeedbackInterface (lines 8998-9198) ═══
const DraftFeedbackInterface = React.memo(({
  status = 'writing',
  rubricCriteria = [],
  gradingDetails = null,
  draftText,
  setDraftText,
  previousDraft,
  onSubmit,
  onCancel,
  draftCount = 1
}) => {
  const { t } = useContext(LanguageContext);
  const renderRubric = () => {
    if (!gradingDetails || !gradingDetails.breakdown) return null;
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">{t('mastery.feedback')} & {t('mastery.score')}</h3>
          <div className={`px-4 py-1 rounded-full text-sm font-black border ${status === 'mastery' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
            {t('mastery.score')}: {gradingDetails.rawScore}/100
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {gradingDetails.breakdown.map((grade, idx) => {
            return (
              <div key={idx} className="p-4 md:p-6">
                <div className="mb-3 flex justify-between items-end">
                    <h4 className="font-bold text-indigo-900 text-sm uppercase tracking-wider">{grade.criterion || "Criterion"}</h4>
                    <span className="text-xs font-medium text-slate-500">{t('mastery.achieved_level')}: {grade.score}/{grade.max || 5}</span>
                </div>
                {grade.reason && (
                    <div className={`mt-2 text-sm p-3 rounded-lg border-l-4 ${grade.score >= (grade.max || 5) * 0.8 ? 'bg-green-50 border-green-400 text-green-800' : 'bg-orange-50 border-orange-400 text-orange-800'}`}>
                        <span className="font-bold mr-1">{t('mastery.feedback')}:</span> {grade.reason}
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  if (status === 'writing') {
    return (
      <div className="max-w-4xl mx-auto p-2">
        <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full"><BookOpen size={20} /></div>
                    <div>
                        <h2 className="font-bold text-lg">{t('mastery.draft_label', { count: draftCount })}</h2>
                        <p className="text-indigo-200 text-xs">{t('mastery.instruction')}</p>
                    </div>
                </div>
                <button onClick={onCancel} className="text-indigo-200 hover:text-white" aria-label={t('common.close')}><X size={20}/></button>
            </div>
            <div className="p-6">
                <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    className="w-full h-64 p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none resize-none text-base leading-relaxed"
                    placeholder={t('mastery.placeholder')}
                    autoFocus
                    data-help-key="mastery_draft_input"
                />
                <div className="mt-4 flex justify-end">
                    <button aria-label={t('common.next')}
                        onClick={onSubmit}
                        disabled={!draftText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    >
                        {t('mastery.submit_feedback')} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }
  if (status === 'grading') {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                <RefreshCw size={24} className="animate-spin" />
            </div>
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-700 animate-pulse">{t('mastery.analyzing')}</h3>
        <p className="text-slate-500 mt-2">{t('mastery.criteria_check')}</p>
      </div>
    );
  }
  if (status === 'revision') {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center bg-orange-50 border border-orange-200 p-4 rounded-xl">
             <div className="flex items-center gap-3">
                 <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                     <RefreshCw size={24} />
                 </div>
                 <div>
                     <h2 className="text-xl font-black text-orange-800">{t('mastery.revision_required')}</h2>
                     <p className="text-orange-700/80 text-sm">{t('mastery.revision_desc')}</p>
                 </div>
             </div>
             <div className="flex items-center gap-2">
                 <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-orange-200 shadow-sm mr-2">
                     <Star size={16} className="text-yellow-500 fill-current" />
                     <span className="text-xs font-bold text-slate-600">{t('mastery.current_progress')}: {gradingDetails?.rawScore}/100</span>
                 </div>
                 <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-600" aria-label={t('common.close')}><X size={20}/></button>
             </div>
        </div>
        {renderRubric()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <History size={14} /> {t('mastery.locked_draft', { count: draftCount })}
                </label>
                <div className="bg-slate-100 text-slate-500 p-6 rounded-xl border border-slate-200 h-96 overflow-y-auto font-serif relative whitespace-pre-wrap">
                    <div className="absolute top-4 right-4 text-slate-500">
                        <Lock size={20} />
                    </div>
                    {previousDraft}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={14} /> {t('mastery.new_draft', { count: draftCount + 1 })}
                </label>
                <div className="relative h-96">
                    <textarea
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        className="w-full h-full p-6 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none resize-none font-serif text-lg leading-relaxed shadow-sm bg-white"
                        placeholder={t('mastery.rewrite_placeholder')}
                    />
                </div>
            </div>
        </div>
        <div className="sticky bottom-6 z-50 flex justify-center">
            <button aria-label={t('common.next')}
                onClick={onSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95"
            >
                {t('mastery.submit_revision')} <ArrowRight size={20} />
            </button>
        </div>
      </div>
    );
  }
  if (status === 'mastery') {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center animate-in zoom-in duration-500">
        <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 rounded-full animate-pulse"></div>
            <Trophy size={120} className="text-yellow-500 fill-yellow-200 relative z-10 drop-shadow-lg mx-auto" />
            <div className="absolute -top-4 -right-12 bg-white border-2 border-yellow-400 text-yellow-600 px-4 py-1 rounded-full font-black text-sm rotate-12 shadow-md">
                {t('mastery.mastery_achieved')}
            </div>
        </div>
        <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">{t('mastery.excellent_work')}</h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            {t('mastery.mastery_desc')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                <div className="text-green-800 font-bold uppercase text-xs mb-2">{t('mastery.final_score')}</div>
                <div className="text-5xl font-black text-green-600">{gradingDetails?.score || 100}</div>
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-200">
                <div className="text-indigo-800 font-bold uppercase text-xs mb-2">{t('mastery.drafts')}</div>
                <div className="text-5xl font-black text-indigo-600">{draftCount}</div>
            </div>
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200">
                <div className="text-purple-800 font-bold uppercase text-xs mb-2">{t('mastery.xp_earned')}</div>
                <div className="text-5xl font-black text-purple-600">+{gradingDetails?.score * 2 || 200}</div>
            </div>
        </div>
        {gradingDetails?.feedback?.strength && (
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left mb-8 max-w-3xl mx-auto">
                 <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                     <Star size={16} className="text-yellow-500 fill-current"/> {t('mastery.teacher_feedback')}
                 </h4>
                 <p className="text-slate-600 italic">"{gradingDetails.feedback.strength}"</p>
             </div>
        )}
        <button
            aria-label={t('common.cancel')}
            onClick={onCancel}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
            {t('mastery.continue')}
        </button>
      </div>
    );
  }
  return null;
});
