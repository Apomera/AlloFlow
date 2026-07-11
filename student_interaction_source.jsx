// Student Interaction Components — extracted from AlloFlowANTI.txt

// ═══ StudentSubmitModal (lines 5776-5961) ═══
const StudentInteractionThemeFallbackContext = (window.React && window.React.createContext)
  ? window.React.createContext({ theme: 'light', colorOverlay: 'none' })
  : null;

const cx = (...parts) => parts.filter(Boolean).join(' ');

function getStudentInteractionThemeStyles(themeContext = {}) {
  const theme = themeContext.theme || 'light';
  const colorOverlay = themeContext.colorOverlay || 'none';
  if (theme === 'contrast') {
    return {
      overlay: 'bg-black/95',
      dialog: 'bg-black text-white border-4 border-yellow-400 shadow-none',
      panel: 'bg-black text-white border-2 border-yellow-400 shadow-none',
      panelSoft: 'bg-black text-white border-2 border-white',
      header: 'bg-black text-yellow-400 border-b-4 border-yellow-400',
      headerText: 'text-white',
      iconBubble: 'bg-black text-yellow-400 border-2 border-yellow-400',
      title: 'text-yellow-400',
      text: 'text-white',
      muted: 'text-yellow-400',
      input: 'bg-black border-2 border-yellow-400 text-yellow-400 placeholder:text-yellow-200 focus:ring-yellow-400 focus:border-yellow-400',
      primary: 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-yellow-400 shadow-none',
      secondary: 'bg-black border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black',
      focusOffset: 'focus:ring-offset-black',
      positive: 'bg-black border-yellow-400 text-yellow-400',
      needsWork: 'bg-black border-white text-white',
      stat: 'bg-black border-2 border-yellow-400 text-yellow-400',
    };
  }
  if (theme === 'dark') {
    return {
      overlay: 'bg-slate-950/90',
      dialog: 'bg-slate-900 text-slate-100 border-2 border-indigo-800 shadow-2xl shadow-slate-950/80',
      panel: 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm',
      panelSoft: 'bg-slate-950 text-slate-200 border border-slate-700',
      header: 'bg-indigo-950 text-indigo-100 border-b border-indigo-800',
      headerText: 'text-indigo-100',
      iconBubble: 'bg-indigo-950 text-indigo-200 border border-indigo-700',
      title: 'text-slate-100',
      text: 'text-slate-300',
      muted: 'text-slate-400',
      input: 'bg-slate-950 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-indigo-500/40 focus:border-indigo-400',
      primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-none',
      secondary: 'bg-slate-950 border border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white',
      focusOffset: 'focus:ring-offset-slate-900',
      positive: 'bg-emerald-950 border-emerald-700 text-emerald-100',
      needsWork: 'bg-amber-950 border-amber-700 text-amber-100',
      stat: 'bg-slate-800 border border-slate-700 text-slate-100',
    };
  }
  const dialogTint = colorOverlay === 'blue' ? 'bg-blue-50 border-blue-200'
    : colorOverlay === 'peach' ? 'bg-orange-50 border-orange-200'
    : colorOverlay === 'yellow' ? 'bg-yellow-50 border-yellow-300'
    : 'bg-white border-indigo-100';
  return {
    overlay: 'bg-slate-900/90',
    dialog: `${dialogTint} text-slate-800 shadow-2xl`,
    panel: 'bg-white text-slate-800 border border-slate-400 shadow-sm',
    panelSoft: 'bg-slate-50 text-slate-700 border border-slate-400',
    header: 'bg-indigo-600 text-white',
    headerText: 'text-indigo-100',
    iconBubble: 'bg-indigo-100 text-indigo-600 border-2 border-indigo-200',
    title: 'text-slate-800',
    text: 'text-slate-600',
    muted: 'text-slate-600',
    input: 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-500 focus:ring-indigo-500/20 focus:border-indigo-500',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg',
    secondary: 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600',
    focusOffset: 'focus:ring-offset-white',
    positive: 'bg-green-50 border-green-400 text-green-800',
    needsWork: 'bg-orange-50 border-orange-400 text-orange-800',
    stat: 'bg-white border border-slate-400 text-slate-700',
  };
}

const StudentSubmitModal = React.memo(({ isOpen, onClose, onSubmit, history = [], currentNickname = "", submissionMethod = "download", submissionContext = "file" }) => {
  const { t } = useContext(LanguageContext);
  const themeContext = useContext(window.AlloThemeContext || StudentInteractionThemeFallbackContext);
  const styles = getStudentInteractionThemeStyles(themeContext);
  const dialogRef = useRef(null);
  const titleId = 'student-submit-modal-title';
  const descId = 'student-submit-modal-desc';
  const summaryId = 'student-submit-summary-title';
  const [submitting, setSubmitting] = useState(false);
  const adjectives = t('codenames.adjectives', { returnObjects: true }) || [];
  const animals = t('codenames.animals', { returnObjects: true }) || [];
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
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelector('button, select, input, textarea, a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable && typeof focusable.focus === 'function') focusable.focus();
      else dialog.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [isOpen]);
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
  const mailboxDelivery = submissionMethod === 'mailbox';
  const submitLabel = mailboxDelivery ? 'Submit to teacher’s Drive' : (t('modals.download_submission') || 'Download submission file');
  const submitHint = mailboxDelivery
    ? 'Your complete work will be saved automatically as a JSON file in your teacher’s private “AlloFlow Class Mailbox” Drive folder. If delivery fails, a backup file downloads instead.'
    : submissionContext === 'standard-live'
      ? 'Live quiz and activity responses sync during class. Your complete portfolio downloads as a file for your teacher or LMS.'
      : 'Your complete work downloads as a file. Send it to your teacher or upload it to your LMS.';
  const handleSubmit = async () => {
    const fullName = getFullName();
    if (!selectedAdj || !selectedAnimal || submitting) return;
    setSubmitting(true);
    try {
      const completed = await Promise.resolve(onSubmit(fullName, stats));
      if (completed !== false) onClose();
    } finally {
      setSubmitting(false);
    }
  };
  const handleDialogKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll('button, select, input, textarea, a[href], [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.disabled && el.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return (
    <div className={cx('fixed inset-0 z-[300] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300', styles.overlay)}>
      <div
        ref={dialogRef}
        className={cx('rounded-2xl p-6 max-w-md w-full relative transform transition-all animate-in zoom-in-95 duration-300', styles.dialog)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <button
            type="button"
            onClick={onClose}
            className={cx('absolute top-4 right-4 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors', styles.secondary, styles.focusOffset)}
            aria-label={t('common.close')}
        >
            <X size={20} aria-hidden="true" />
        </button>
        <div className="text-center mb-6 relative">
            <div className={cx('w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4', styles.iconBubble)} aria-hidden="true">
                <Send size={32} className="ml-1" />
            </div>
            <h2 id={titleId} className={cx('text-2xl font-black mb-1', styles.title)}>{t('modals.submit_title')}</h2>
            <p id={descId} className={cx('text-sm font-medium', styles.text)}>{t('modals.submit_ready')}</p>
        </div>
        <div className="mb-6">
            <label className={cx('block text-xs font-bold uppercase tracking-wider mb-2 text-center', styles.muted)}>{t('modals.student_name_label')}</label>
            <div className={cx('p-4 rounded-xl', styles.panelSoft)}>
                <div className="flex gap-2 mb-3">
                    <select
                        value={selectedAdj}
                        onChange={(e) => setSelectedAdj(e.target.value)}
                        className={cx('w-1/2 p-2 rounded-lg border font-bold text-sm focus:ring-2 outline-none cursor-pointer', styles.input)}
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
                        className={cx('w-1/2 p-2 rounded-lg border font-bold text-sm focus:ring-2 outline-none cursor-pointer', styles.input)}
                        aria-label={t('modals.entry.select_animal')}
                        data-help-key="entry_animal"
                    >
                        {animals.map((anim, i) => (
                            <option key={i} value={anim}>{anim}</option>
                        ))}
                    </select>
                </div>
                <div className={cx('flex items-center justify-between p-3 rounded-xl shadow-sm', styles.panel)} role="status" aria-live="polite">
                    <div className={cx('text-xl font-black tracking-tight truncate mr-2', styles.title)}>
                        {selectedAdj} {selectedAnimal}
                    </div>
                    <button
                        type="button"
                        onClick={randomizeName}
                        className={cx('p-2 rounded-full hover:scale-110 transition-all shrink-0', styles.secondary)}
                        title={t('modals.entry.randomize_codename')}
                        aria-label={t('modals.entry.randomize_codename')}
                        data-help-key="entry_randomize_btn"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>
        </div>
        <div className={cx('rounded-xl p-4 mb-6', styles.panelSoft)} aria-labelledby={summaryId}>
            <h4 id={summaryId} className={cx('text-xs font-bold uppercase tracking-widest mb-3 border-b pb-2', styles.muted)}>{t('modals.work_summary')}</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <CheckSquare size={16} className="text-teal-500" aria-hidden="true"/>
                    <span className="font-bold">{stats.quizzes}</span> {t('modals.summary_quizzes')}
                </div>
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <BookOpen size={16} className="text-green-500" aria-hidden="true"/>
                    <span className="font-bold">{stats.readings}</span> {t('modals.summary_readings')}
                </div>
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <MapIcon size={16} className="text-purple-500" aria-hidden="true"/>
                    <span className="font-bold">{stats.adventures}</span> {t('modals.summary_adventures')}
                </div>
                <div className={cx('flex items-center gap-2 text-sm', styles.text)}>
                    <Quote size={16} className="text-rose-500" aria-hidden="true"/>
                    <span className="font-bold">{stats.scaffolds}</span> {t('modals.summary_scaffolds')}
                </div>
            </div>
            <div className={cx('text-xs italic text-center mt-2 pt-2 border-t', styles.muted)}>
                "{getSummaryString()}"
            </div>
        </div>
        <div className="flex flex-col gap-3">
            <button
                type="button"
                aria-label={submitLabel}
                onClick={handleSubmit}
                disabled={!selectedAdj || !selectedAnimal || submitting}
                className={cx('w-full font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2', styles.primary)}
                data-help-key="submit_confirm_btn"
            >
                {mailboxDelivery ? <Send size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />} {submitting ? 'Submitting…' : submitLabel}
            </button>
            <p className={cx('text-xs text-center font-medium px-4', styles.text)}>
                {submitHint}
            </p>
            <button
                type="button"
                aria-label={t('common.close')}
                onClick={onClose}
                disabled={submitting}
                className={cx('w-full font-bold py-3 rounded-xl transition-all active:scale-95', styles.secondary)}
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
  const themeContext = useContext(window.AlloThemeContext || StudentInteractionThemeFallbackContext);
  const styles = getStudentInteractionThemeStyles(themeContext);
  const renderRubric = () => {
    if (!gradingDetails || !gradingDetails.breakdown) return null;
    return (
      <div className={cx('rounded-xl shadow-sm overflow-hidden mb-6', styles.panel)}>
        <div className={cx('p-4 border-b flex justify-between items-center', styles.panelSoft)}>
          <h3 className={cx('font-bold', styles.title)}>{t('mastery.feedback')} & {t('mastery.score')}</h3>
          <div className={cx('px-4 py-1 rounded-full text-sm font-black border', status === 'mastery' ? styles.positive : styles.stat)}>
            {t('mastery.score')}: {gradingDetails.rawScore}/100
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {gradingDetails.breakdown.map((grade, idx) => {
            return (
              <div key={idx} className="p-4 md:p-6">
                <div className="mb-3 flex justify-between items-end">
                    <h4 className={cx('font-bold text-sm uppercase tracking-wider', styles.title)}>{grade.criterion || "Criterion"}</h4>
                    <span className={cx('text-xs font-medium', styles.muted)}>{t('mastery.achieved_level')}: {grade.score}/{grade.max || 5}</span>
                </div>
                {grade.reason && (
                    <div className={cx('mt-2 text-sm p-3 rounded-lg border-l-4', grade.score >= (grade.max || 5) * 0.8 ? styles.positive : styles.needsWork)}>
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
        <div className={cx('rounded-2xl shadow-xl overflow-hidden', styles.panel)}>
            <div className={cx('p-4 flex items-center justify-between gap-3', styles.header)}>
                <div className="flex items-center gap-3">
                    <div className={cx('p-2 rounded-full', styles.iconBubble)}><BookOpen size={20} /></div>
                    <div>
                        <h2 className="font-bold text-lg">{t('mastery.draft_label', { count: draftCount })}</h2>
                        <p className={cx('text-xs', styles.headerText)}>{t('mastery.instruction')}</p>
                    </div>
                </div>
                <button onClick={onCancel} className={cx('p-2 rounded-full', styles.secondary)} aria-label={t('common.close')}><X size={20}/></button>
            </div>
            <div className="p-6">
                <textarea
                    aria-label={t('mastery.draft_aria') || t('mastery.placeholder') || 'Draft response'}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    className={cx('w-full h-64 p-4 border-2 rounded-xl focus:ring-4 outline-none resize-none text-base leading-relaxed', styles.input)}
                    placeholder={t('mastery.placeholder')}
                    autoFocus
                    data-help-key="mastery_draft_input"
                />
                <div className="mt-4 flex justify-end">
                    <button aria-label={t('common.next')}
                        onClick={onSubmit}
                        disabled={!draftText.trim()}
                        className={cx('font-bold py-3 px-8 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:scale-100 flex items-center gap-2', styles.primary)}
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
      <div className={cx('flex flex-col items-center justify-center h-96 p-8', styles.panel)} role="status" aria-live="polite" aria-busy="true">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            <div className={cx('absolute inset-0 flex items-center justify-center', styles.title)}>
                <RefreshCw size={24} className="animate-spin" />
            </div>
        </div>
        <h3 className={cx('mt-6 text-xl font-bold animate-pulse', styles.title)}>{t('mastery.analyzing')}</h3>
        <p className={cx('mt-2', styles.text)}>{t('mastery.criteria_check')}</p>
      </div>
    );
  }
  if (status === 'revision') {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={cx('flex justify-between items-center p-4 rounded-xl', styles.needsWork)}>
             <div className="flex items-center gap-3">
                 <div className={cx('p-2 rounded-full', styles.iconBubble)}>
                     <RefreshCw size={24} />
                 </div>
                 <div>
                     <h2 className={cx('text-xl font-black', styles.title)}>{t('mastery.revision_required')}</h2>
                     <p className={cx('text-sm', styles.text)}>{t('mastery.revision_desc')}</p>
                 </div>
             </div>
             <div className="flex items-center gap-2">
                 <div className={cx('hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm mr-2', styles.panel)}>
                     <Star size={16} className="text-yellow-500 fill-current" />
                     <span className={cx('text-xs font-bold', styles.text)}>{t('mastery.current_progress')}: {gradingDetails?.rawScore}/100</span>
                 </div>
                 <button onClick={onCancel} className={cx('p-2 rounded-full', styles.secondary)} aria-label={t('common.close')}><X size={20}/></button>
             </div>
        </div>
        {renderRubric()}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
                <label className={cx('text-xs font-bold uppercase tracking-wider flex items-center gap-2', styles.muted)}>
                    <History size={14} /> {t('mastery.locked_draft', { count: draftCount })}
                </label>
                <div className={cx('p-6 rounded-xl h-96 overflow-y-auto font-serif relative whitespace-pre-wrap', styles.panelSoft)}>
                    <div className={cx('absolute top-4 right-4', styles.muted)}>
                        <Lock size={20} />
                    </div>
                    {previousDraft}
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <label className={cx('text-xs font-bold uppercase tracking-wider flex items-center gap-2', styles.title)}>
                    <BookOpen size={14} /> {t('mastery.new_draft', { count: draftCount + 1 })}
                </label>
                <div className="relative h-96">
                    <textarea
                        aria-label={t('mastery.new_draft', { count: draftCount + 1 }) || 'New draft'}
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        className={cx('w-full h-full p-6 border-2 rounded-xl focus:ring-4 outline-none resize-none font-serif text-lg leading-relaxed shadow-sm', styles.input)}
                        placeholder={t('mastery.rewrite_placeholder')}
                    />
                </div>
            </div>
        </div>
        <div className="sticky bottom-6 z-50 flex justify-center">
            <button aria-label={t('common.next')}
                onClick={onSubmit}
                className={cx('font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95', styles.primary)}
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
        <h2 className={cx('text-5xl font-black mb-4 tracking-tight', styles.title)}>{t('mastery.excellent_work')}</h2>
        <p className={cx('text-xl mb-8 max-w-2xl mx-auto', styles.text)}>
            {t('mastery.mastery_desc')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
            <div className={cx('p-6 rounded-2xl', styles.stat)}>
                <div className={cx('font-bold uppercase text-xs mb-2', styles.muted)}>{t('mastery.final_score')}</div>
                <div className={cx('text-5xl font-black', styles.title)}>{gradingDetails?.score || 100}</div>
            </div>
            <div className={cx('p-6 rounded-2xl', styles.stat)}>
                <div className={cx('font-bold uppercase text-xs mb-2', styles.muted)}>{t('mastery.drafts')}</div>
                <div className={cx('text-5xl font-black', styles.title)}>{draftCount}</div>
            </div>
            <div className={cx('p-6 rounded-2xl', styles.stat)}>
                <div className={cx('font-bold uppercase text-xs mb-2', styles.muted)}>{t('mastery.xp_earned')}</div>
                <div className={cx('text-5xl font-black', styles.title)}>+{gradingDetails?.score * 2 || 200}</div>
            </div>
        </div>
        {gradingDetails?.feedback?.strength && (
             <div className={cx('p-6 rounded-2xl shadow-sm text-left mb-8 max-w-3xl mx-auto', styles.panel)}>
                 <h4 className={cx('font-bold flex items-center gap-2 mb-2', styles.title)}>
                     <Star size={16} className="text-yellow-500 fill-current"/> {t('mastery.teacher_feedback')}
                 </h4>
                 <p className={cx('italic', styles.text)}>"{gradingDetails.feedback.strength}"</p>
             </div>
        )}
        <button
            aria-label={t('common.cancel')}
            onClick={onCancel}
            className={cx('font-bold py-3 px-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95', styles.primary)}
        >
            {t('mastery.continue')}
        </button>
      </div>
    );
  }
  return null;
});
