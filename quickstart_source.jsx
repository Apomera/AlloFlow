const QuickStartWizard = React.memo(({ isOpen, onClose, onComplete, onUpload, onLookupStandards, onCallGemini, onWebSearch, addToast, isParentMode, isIndependentMode, isHelpMode, setIsHelpMode }) => {
  const [step, setStep] = useState(1);
  const { t } = useContext(LanguageContext);
  const wizardRef = useRef(null);
  useFocusTrap(wizardRef, isOpen);
  const [localData, setLocalData] = useState({
      topic: '',
      grade: '3rd Grade',
      materialType: 'text',
      length: '500',
      standards: [],
      languages: [],
      interests: [],
      format: 'Standard Text',
      sourceMode: '',
      fetchedContent: '',
      resourceMeta: null,
      searchQuery: '',
      searchOptions: [],
      tone: 'Informative',
      verification: false,
      sourceCustomInstructions: '',
      dokLevel: '',
      vocabulary: '',
      citationFormat: 'Links Only',
  });
  const [wizLangInput, setWizLangInput] = useState('');
  const [wizInterestInput, setWizInterestInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [standardMode, setStandardMode] = useState('ai');
  const [standardInputValue, setStandardInputValue] = useState('');
  const [aiStandardRegion, setAiStandardRegion] = useState('');
  const [aiStandardQuery, setAiStandardQuery] = useState('');
  const [suggestedStandards, setSuggestedStandards] = useState([]);
  const [isFindingStandards, setIsFindingStandards] = useState(false);
  const [learningGoal, setLearningGoal] = useState('');
  const [region, setRegion] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const standardsListRef = useRef(null);
  const wizardStepHelp = {
    1: { title: 'Step 1: Grade Level', text: 'Select the grade level for your content. This determines vocabulary complexity, sentence structure, and concept depth. All generated materials will be calibrated to this level. You can always change it later in settings.' },
    2: { title: 'Step 2: Source Material', text: 'Choose how to provide your lesson content. You can paste or type text directly, fetch content from a URL, upload a file, or let the AI generate content from a topic. Each option creates a rich source document for all tools to work from.' },
    3: { title: 'Step 3: Standards & Customization', text: 'Align your content to academic standards (Common Core, NGSS, state-specific). You can search by AI or enter codes manually. Also set DOK level, output format, writing tone, languages, and student interests for personalized content.' },
    4: { title: 'Step 4: Review & Personalize', text: 'Final review of your settings. Add vocabulary terms, a learning goal, citation preferences, and any custom instructions for the AI. Click Finish to generate your lesson with all configured options applied.' },
  };
  if (!isOpen) return null;
  const handleSkip = () => {
    safeSetItem('allo_wizard_completed', 'true');
    setIsHelpMode(false);
    onClose();
  };
  const handleNext = () => {
    if (step === 1 && !localData.grade) {
        return;
    }
    setStep(prev => prev + 1);
  };
  const handleFindStandards = async () => {
      if (!aiStandardQuery.trim()) {
          if (addToast) addToast(t('standards.toast_describe_skill'), "info");
          return;
      }
      if (!onLookupStandards) return;
      setIsFindingStandards(true);
      try {
          const results = await onLookupStandards(localData.grade, aiStandardQuery, aiStandardRegion);
          if (results && Array.isArray(results) && results.length > 0) {
              setSuggestedStandards(prev => {
                  const existingCodes = new Set(prev.map(s => s.code));
                  const newItems = results.filter(r => !existingCodes.has(r.code));
                  return [...newItems, ...prev];
              });
              setTimeout(() => {
                  if (standardsListRef.current) {
                      standardsListRef.current.scrollTop = 0;
                  }
              }, 100);
              setAiStandardQuery('');
          } else {
             if (addToast) addToast(t('standards.toast_no_standards'), "info");
          }
      } catch (e) {
          warnLog("Standards search error:", e);
          if (addToast) addToast(t('standards.toast_search_failed'), "error");
      } finally {
          setIsFindingStandards(false);
      }
  };
  const handleAddStandard = () => {
      if (!standardInputValue.trim()) return;
      if (localData.standards.length >= 3) {
          if (addToast) addToast(t('standards.toast_max_limit'), "error");
          return;
      }
      if (localData.standards.includes(standardInputValue.trim())) {
          if (addToast) addToast(t('standards.toast_duplicate'), "info");
          setStandardInputValue('');
          return;
      }
      setLocalData(prev => ({ ...prev, standards: [...prev.standards, standardInputValue.trim()] }));
      setStandardInputValue('');
      if (addToast) addToast(t('standards.toast_added'), "success");
  };
  const handleRemoveStandard = (index) => {
      setLocalData(prev => ({ ...prev, standards: prev.standards.filter((_, i) => i !== index) }));
  };
  const addWizLanguage = () => {
      const val = wizLangInput.trim();
      if (val && !localData.languages.includes(val) && localData.languages.length < 4) {
          setLocalData(prev => ({ ...prev, languages: [...prev.languages, val] }));
          setWizLangInput('');
      }
  };
  const addCommonLanguage = (val) => {
       if (val && !localData.languages.includes(val) && localData.languages.length < 4) {
          setLocalData(prev => ({ ...prev, languages: [...prev.languages, val] }));
      }
  };
  const removeWizLanguage = (lang) => {
      setLocalData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }));
  };
  const addWizInterest = () => {
      const val = wizInterestInput.trim();
      if (val && !localData.interests.includes(val) && localData.interests.length < 5) {
          setLocalData(prev => ({ ...prev, interests: [...prev.interests, val] }));
          setWizInterestInput('');
      }
  };
  const removeWizInterest = (interest) => {
      setLocalData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }));
  };
  const handleWizardUrlFetch = async (url) => {
      if (!url || !url.trim()) return;
      setIsFetching(true);
      try {
          const content = await fetchAndCleanUrl(url, onCallGemini, addToast);
          if (typeof content === 'string' && content.trim()) {
              setLocalData(prev => ({ ...prev, fetchedContent: content }));
          }
      } catch (err) {
          warnLog("Wizard URL Fetch Error:", err);
          if (addToast && err.message) addToast(err.message, "error");
      } finally {
          setIsFetching(false);
      }
  };
  const handleWizardAiSearch = async () => {
      if (!localData.searchQuery.trim()) return;
      setIsFetching(true);
      setLocalData(prev => ({ ...prev, searchOptions: [], fetchedContent: '', resourceMeta: null }));
      try {
          let options = [];

          // ── For local backends: use webSearchProvider directly ──
          if (onWebSearch) {
              try {
                  const searchResults = await onWebSearch(`${localData.searchQuery} ${localData.grade} educational resource`);
                  if (searchResults && searchResults.length > 0) {
                      options = searchResults.slice(0, 5).map(r => ({
                          url: r.url,
                          title: r.title,
                          description: r.snippet || t('wizard.google_search_result', { title: r.title })
                      }));
                  }
              } catch (searchErr) {
                  console.warn('[Wizard] Web search provider failed, falling back to Gemini grounding:', searchErr.message);
              }
          }

          // ── Fallback: Gemini grounding search ──
          if (options.length === 0) {
              const prompt = `Find high-quality, text-based educational resources about: ${localData.searchQuery}. Target audience: ${localData.grade}.`;
              const result = await onCallGemini(prompt, false, true);
              if (result && result.groundingMetadata?.groundingChunks) {
                   const rawChunks = result.groundingMetadata.groundingChunks;
                   options = rawChunks
                    .filter(chunk => chunk.web?.uri && chunk.web?.title)
                    .map(chunk => ({
                        url: chunk.web.uri,
                        title: chunk.web.title,
                        description: t('wizard.google_search_result', { title: chunk.web.title })
                    }));
              }
          }

          const uniqueOptions = Array.from(
              new Map(options.map(item => [item.url, item])).values()
          ).slice(0, 5);
          if (uniqueOptions.length > 0) {
              setLocalData(prev => ({ ...prev, searchOptions: uniqueOptions }));
              if (addToast) addToast(t('wizard.resources_found', { count: uniqueOptions.length }), "success");
          } else {
              if (addToast) addToast(t('toasts.no_sources_found'), "warning");
          }
      } catch (e) {
          if (addToast) addToast(t('toasts.search_failed'), "error");
      } finally {
          setIsFetching(false);
      }
  };
  const selectSearchOption = async (option) => {
      if (!option || !option.url) return;
      if (isGoogleRedirect(option.url)) {
          window.open(option.url, '_blank');
          setLocalData(prev => ({ ...prev, sourceMode: 'url' }));
          setUrlInput('');
          if (addToast) addToast(t('toasts.copy_url_paste'), "info");
          return;
      }
      setUrlInput(option.url);
      setLocalData(prev => ({ ...prev, sourceMode: 'url' }));
      await handleWizardUrlFetch(option.url);
      setLocalData(prev => ({ ...prev, resourceMeta: { title: option.title, description: option.description } }));
  };
  const handleGoalSearch = async () => {
      if (!learningGoal.trim() || !onLookupStandards) return;
      setIsSearching(true);
      try {
          const results = await onLookupStandards(localData.grade, learningGoal, region);
          if (results && Array.isArray(results)) {
              setSuggestedStandards(results);
              setTimeout(() => {
                  if (standardsListRef.current) standardsListRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
          }
      } catch (e) { warnLog("Unhandled error:", e); } finally { setIsSearching(false); }
  };
  const toggleStandard = (stdString) => {
      setLocalData(prev => {
          const current = prev.standards || [];
          if (current.includes(stdString)) return { ...prev, standards: current.filter(s => s !== stdString) };
          return { ...prev, standards: [...current, stdString] };
      });
  };
  const grades = [
      { label: t('grades_short.k'), value: 'Kindergarten' },
      { label: t('grades_short.g1'), value: '1st Grade' },
      { label: t('grades_short.g2'), value: '2nd Grade' },
      { label: t('grades_short.g3'), value: '3rd Grade' },
      { label: t('grades_short.g4'), value: '4th Grade' },
      { label: t('grades_short.g5'), value: '5th Grade' },
      { label: t('grades_short.g6'), value: '6th Grade' },
      { label: t('grades_short.g7'), value: '7th Grade' },
      { label: t('grades_short.g8'), value: '8th Grade' },
      { label: t('grades_short.g9'), value: '9th Grade' },
      { label: t('grades_short.g10'), value: '10th Grade' },
      { label: t('grades_short.g11'), value: '11th Grade' },
      { label: t('grades_short.g12'), value: '12th Grade' },
      { label: t('grades_short.college'), value: 'College' },
  ];
  return (
    <div
        ref={wizardRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
    >
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-400 max-h-[90vh]">
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-yellow-500 fill-current" size={20} /> {t('wizard.title')}
                  </h2>
                  <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map(s => (
                          <div key={s} className={`h-1.5 w-5 rounded-full transition-colors ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                      ))}
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <button
                      aria-label={t('common.skip')}
                    data-help-ignore="true"
                    onClick={handleSkip}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors uppercase tracking-wider"
                  >
                    {t('common.skip')}
                  </button>
                  <button data-help-ignore="true" onClick={() => { setIsHelpMode(false); onClose(); }} className="p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t('common.close_wizard')}><X size={24}/></button>
              </div>
          </div>
          {isHelpMode && wizardStepHelp[step] && (
            <div className="mx-8 mt-4 mb-0 p-4 bg-indigo-50 border border-indigo-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <HelpCircle size={18} className="text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-indigo-800">{wizardStepHelp[step].title}</p>
                  <p className="text-xs text-indigo-700 mt-1 leading-relaxed">{wizardStepHelp[step].text}</p>
                  <p className="text-xs text-indigo-500 mt-2 italic">💡 Click any element below for a detailed explanation</p>
                </div>
                <button onClick={() => setIsHelpMode(false)} className="text-indigo-400 hover:text-indigo-600 shrink-0 p-1"><X size={14}/></button>
              </div>
            </div>
          )}
          <div className="p-8 overflow-y-auto custom-scrollbar">
              {step === 1 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <div>
                          <label className="block text-lg font-bold text-slate-700 mb-3">{t('wizard.global_context')}</label>
                          <p className="text-slate-600 mb-4 text-sm">{t('wizard.grade_helper')}</p>
                          <div className="grid grid-cols-4 gap-3">
                              {grades.map((g) => (
                                  <button
                                    key={g.value}
                                    data-help-key="wizard_grade_option"
                                    onClick={() => setLocalData(prev => ({ ...prev, grade: g.value }))}
                                    className={`py-3 px-2 rounded-xl border-2 font-bold transition-all text-sm ${localData.grade === g.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700'}`}
                                  >
                                    {g.label}
                                  </button>
                              ))}
                          </div>
                      </div>
                      {!isParentMode && (
                      <div className="border-t border-slate-100 pt-4">
                          <label className="block text-lg font-bold text-slate-700 mb-2">
                          {isIndependentMode ? t('wizard.learning_goals') : t('wizard.learning_goal_header')}
                          </label>
                          <p className="text-slate-600 mb-4 text-sm">{t('wizard.learning_goal_desc')}</p>
                          <div className="flex flex-col sm:flex-row gap-2">
                              {!isIndependentMode && (
                              <input aria-label={t('common.enter_region')}
                                  type="text"
                                  value={region}
                                  onChange={(e) => setRegion(e.target.value)}
                                  data-help-key="wizard_region_input"
                                  placeholder={t('standards.region_placeholder')}
                                  className="w-full sm:w-1/3 text-base p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all"
                              />
                              )}
                              <div className="flex-grow flex gap-2">
                                  <input aria-label={t('common.enter_learning_goal')}
                                    type="text"
                                    value={learningGoal}
                                    onChange={(e) => setLearningGoal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGoalSearch()}
                                    className="w-full text-base p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all"
                                    data-help-key="wizard_growth_goal_input"
                                    placeholder={isIndependentMode ? t('wizard.independent_learning_goal') : t('wizard.learning_goal_placeholder')}
                                  />
                                  <button aria-label={t('common.search_learning_standards')}
                                    data-help-key="wizard_find_standard_btn"
                                    onClick={handleGoalSearch}
                                    disabled={isSearching || !learningGoal.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
                                  >
                                    {isSearching ? <RefreshCw size={20} className="animate-spin"/> : <Search size={20}/>}
                                    {t('wizard.find_button')}
                                  </button>
                              </div>
                          </div>
                      </div>
                      )}
                      {suggestedStandards.length > 0 && (
                          <div ref={standardsListRef} className="space-y-2 animate-in slide-in-from-top-2">
                              <label className="block text-sm font-bold text-slate-700">{t('wizard.standards_selection_label')}</label>
                              <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                                  {suggestedStandards.map((std, i) => {
                                      const val = `${std.code}: ${std.description}`;
                                      const isSelected = localData.standards.includes(val);
                                      return (
                                          <div
                                            key={i}
                                            data-help-key="wizard_standard_select"
                                            onClick={() => toggleStandard(val)}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all mb-2 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                                          >
                                              <div className="flex items-start gap-3">
                                                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                                      {isSelected && <CheckCircle size={14}/>}
                                                  </div>
                                                  <div>
                                                      {!isIndependentMode && (
                                                          <div className="font-bold text-indigo-900 text-xs">{std.code}</div>
                                                      )}
                                                      <div className={`${isIndependentMode ? 'text-sm font-medium text-slate-800' : 'text-xs text-slate-600'} leading-snug`}>{std.description}</div>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                              <p className="text-xs text-slate-600 text-right">{localData.standards.length} {t('wizard.selected_counter')}</p>
                          </div>
                      )}
                  </div>
              )}
              {step === 2 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <div>
                          <label className="block text-lg font-bold text-slate-700 mb-2">{t('wizard.source_material')}</label>
                          <p className="text-slate-600 mb-6 text-sm">{t('wizard.source_desc')}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <button data-help-key="wizard_upload_source"
                                  aria-label={t('common.upload')}
                                onClick={() => {
                                    setLocalData(prev => ({ ...prev, sourceMode: 'file' }));
                                    setStep(3);
                                }}
                                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group bg-white active:scale-95 h-40"
                              >
                                <div className="bg-indigo-50 p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform group-hover:bg-white">
                                    <Upload size={32} className="text-indigo-600"/>
                                </div>
                                <span className="font-bold text-slate-700 group-hover:text-indigo-700 text-lg">{t('wizard.upload_file')}</span>
                                <span className="text-xs text-slate-600 mt-1">{t('wizard.upload_desc')}</span>
                              </button>
                              <button data-help-key="wizard_url_source"
                                onClick={() => {
                                    setLocalData(prev => ({ ...prev, sourceMode: 'url' }));
                                    setStep(3);
                                }}
                                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group bg-white active:scale-95 h-40"
                              >
                                <div className="bg-blue-50 p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform group-hover:bg-white">
                                    <Link size={32} className="text-blue-600"/>
                                </div>
                                <span className="font-bold text-slate-700 group-hover:text-blue-700 text-lg">{t('wizard.paste_url')}</span>
                                <span className="text-xs text-slate-600 mt-1">{t('wizard.url_desc')}</span>
                              </button>
                              <button data-help-key="wizard_search_source"
                                onClick={() => {
                                    setLocalData(prev => ({ ...prev, sourceMode: 'search' }));
                                    setStep(3);
                                }}
                                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group bg-white active:scale-95 h-40"
                              >
                                <div className="bg-teal-50 p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform group-hover:bg-white">
                                    <Globe size={32} className="text-teal-600"/>
                                </div>
                                <span className="font-bold text-slate-700 group-hover:text-teal-700 text-lg">{t('wizard.ai_search')}</span>
                                <span className="text-xs text-slate-600 mt-1">{t('wizard.search_desc')}</span>
                              </button>
                              <button data-help-key="wizard_generate_source"
                                  aria-label={t('common.generate')}
                                onClick={() => {
                                    setLocalData(prev => ({ ...prev, sourceMode: 'generate' }));
                                    setStep(3);
                                }}
                                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all group bg-white active:scale-95 h-40"
                              >
                                <div className="bg-purple-50 p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform group-hover:bg-white">
                                    <Sparkles size={32} className="text-purple-600 fill-current"/>
                                </div>
                                <span className="font-bold text-slate-700 group-hover:text-purple-700 text-lg">{t('wizard.generate_scratch')}</span>
                                <span className="text-xs text-slate-600 mt-1">{t('wizard.generate_desc')}</span>
                              </button>
                          </div>
                      </div>
                  </div>
              )}
              {step === 3 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      {localData.sourceMode === 'url' && (
                          <div>
                              <label className="block text-lg font-bold text-slate-700 mb-2">{t('wizard.import_web')}</label>
                              <p className="text-slate-600 mb-4 text-sm">{t('wizard.url_helper')}</p>
                              <div className="flex gap-2 mb-6">
                                  <input aria-label={t('common.enter_url_input')}
                                      type="url"
                                      value={urlInput}
                                      onChange={(e) => setUrlInput(e.target.value)}
                                      data-help-key="wizard_url_input"
                                      placeholder={t('wizard.url_placeholder')}
                                      className="flex-grow p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all"
                                      onKeyDown={(e) => e.key === 'Enter' && handleWizardUrlFetch(urlInput)}
                                      autoFocus
                                  />
                                  <button
                                      aria-label={t('common.refresh')}
                                      data-help-key="wizard_url_fetch_btn"
                                      onClick={() => handleWizardUrlFetch(urlInput)}
                                      disabled={isFetching || !urlInput}
                                      className="bg-blue-600 text-white font-bold px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md"
                                  >
                                      {isFetching ? <RefreshCw size={20} className="animate-spin"/> : <Download size={20}/>}
                                      {t('wizard.fetch_action')}
                                  </button>
                              </div>
                              {typeof localData.fetchedContent === 'string' && localData.fetchedContent && (
                                  <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                      <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                                          <CheckCircle size={20} className="fill-green-100 text-green-600" /> {t('wizard.content_loaded')}
                                      </div>
                                      <p className="text-xs text-green-700 mb-4 line-clamp-3 opacity-80 bg-white/50 p-2 rounded border border-green-100">
                                          {localData.fetchedContent.substring(0, 300)}...
                                      </p>
                                      <button
                                          aria-label={t('common.continue')}
                                          data-help-key="wizard_content_next_btn"
                                          onClick={() => setStep(4)}
                                          className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-md"
                                      >
                                          {t('common.next')} <ArrowRight size={18} />
                                      </button>
                                  </div>
                              )}
                          </div>
                      )}
                      {localData.sourceMode === 'search' && (
                          <div>
                              <label className="block text-lg font-bold text-slate-700 mb-2">{t('wizard.ai_search')}</label>
                              <p className="text-slate-600 mb-4 text-sm">{t('wizard.search_helper')}</p>
                              <div className="flex gap-2 mb-6">
                                  <input aria-label={t('common.enter_local_data')}
                                      type="text"
                                      value={localData.searchQuery}
                                      onChange={(e) => setLocalData(prev => ({ ...prev, searchQuery: e.target.value }))}
                                      data-help-key="wizard_search_input"
                                      placeholder={t('wizard.search_placeholder')}
                                      className="flex-grow p-3 border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/30 outline-none transition-all"
                                      onKeyDown={(e) => e.key === 'Enter' && handleWizardAiSearch()}
                                      autoFocus
                                  />
                                  <button aria-label={t('common.search_with_ai')}
                                      data-help-key="wizard_search_btn"
                                      onClick={handleWizardAiSearch}
                                      disabled={isFetching || !localData.searchQuery}
                                      className="bg-teal-600 text-white font-bold px-6 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md"
                                  >
                                      {isFetching ? <RefreshCw size={20} className="animate-spin"/> : <Search size={20}/>}
                                      {isFetching ? t('wizard.finding_button') : t('wizard.find_button')}
                                  </button>
                              </div>
                              {!(typeof localData.fetchedContent === 'string' && localData.fetchedContent) && localData.searchOptions && localData.searchOptions.length > 0 && (
                                  <div className="space-y-3 mb-6 animate-in slide-in-from-bottom-4">
                                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('wizard.select_resource')}</h4>
                                      {localData.searchOptions.map((opt, idx) => (
                                          <div key={idx} className="relative group">
                                            <button
                                                aria-label={t('common.refresh')}
                                                data-help-key="wizard_search_result_select"
                                                onClick={() => selectSearchOption(opt)}
                                                className="w-full text-left p-4 pr-12 rounded-xl border-2 border-slate-100 hover:border-teal-500 hover:bg-teal-50 transition-all bg-white shadow-sm"
                                            >
                                                <div className="font-bold text-slate-700 group-hover:text-teal-800 mb-1 text-sm">{opt.title || t('wizard.untitled_resource')}</div>
                                                <div className="text-xs text-slate-600 group-hover:text-teal-600 line-clamp-2">{opt.description || t('wizard.no_description')}</div>
                                                <div className="text-[11px] text-slate-600 mt-2 truncate max-w-xs">{opt.url}</div>
                                                {isFetching && (
                                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                                        <RefreshCw size={20} className="animate-spin text-teal-600"/>
                                                    </div>
                                                )}
                                            </button>
                                            <a
                                                href={opt.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLocalData(prev => ({ ...prev, sourceMode: 'url' }));
                                                    setUrlInput('');
                                                    if (addToast) addToast(t('wizard.link_opened_toast'), "info");
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-teal-600 hover:bg-teal-100 rounded-full transition-colors z-20"
                                                data-help-key="wizard_search_result_link"
                                                title={t('wizard.open_link_title')}
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                          </div>
                                      ))}
                                  </div>
                              )}
                              {typeof localData.fetchedContent === 'string' && localData.fetchedContent && (
                                  <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-in fade-in slide-in-from-top-2 shadow-sm">
                                      <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                                          <CheckCircle size={20} className="fill-green-100 text-green-600" /> {t('wizard.content_loaded')}
                                      </div>
                                      {localData.resourceMeta && (
                                          <div className="mb-3 pb-3 border-b border-green-200/50">
                                              <h4 className="font-bold text-green-900 text-sm">{localData.resourceMeta.title}</h4>
                                              <p className="text-xs text-green-700 italic">{localData.resourceMeta.description}</p>
                                          </div>
                                      )}
                                      <p className="text-xs text-green-700 mb-4 line-clamp-3 opacity-80 bg-white/50 p-2 rounded border border-green-100">
                                          {localData.fetchedContent.substring(0, 300)}...
                                      </p>
                                      <div className="flex gap-2">
                                          <button
                                              aria-label={t('common.continue')}
                                            data-help-key="wizard_back_results_btn"
                                            onClick={() => setLocalData(prev => ({ ...prev, fetchedContent: '', resourceMeta: null }))}
                                            className="px-4 py-3 text-xs font-bold text-slate-600 hover:text-slate-700 bg-white border border-slate-400 rounded-xl"
                                          >
                                              {t('wizard.back_to_results')}
                                          </button>
                                          <button
                                              aria-label={t('common.continue')}
                                              onClick={() => setStep(4)}
                                              className="flex-grow bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-md"
                                          >
                                              {t('common.next')} <ArrowRight size={18} />
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                      {localData.sourceMode === 'generate' && (
                          <div>
                              <label className="block text-lg font-bold text-slate-700 mb-2">{t('wizard.generate_scratch_title')}</label>
                              <p className="text-slate-600 mb-6 text-sm">{t('wizard.generate_scratch_helper')}</p>
                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('wizard.input_topic_label')}</label>
                                      <div className="relative">
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                              <Type size={14} className="text-slate-600" />
                                          </div>
                                          <input
                                              type="text"
                                              value={localData.topic}
                                              onChange={(e) => setLocalData(prev => ({ ...prev, topic: e.target.value }))}
                                              placeholder={t('wizard.topic_placeholder')}
                                              className="w-full ps-9 p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all"
                                              autoFocus
                                              data-help-key="wizard_topic_input"
                                              aria-label={t('wizard.input_topic_label')}
                                          />
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('wizard.input_tone_label')}</label>
                                          <div className="relative">
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                  <MessageSquare size={14} className="text-slate-600" />
                                              </div>
                                              <select
                                                  value={localData.tone}
                                                  onChange={(e) => setLocalData(prev => ({ ...prev, tone: e.target.value }))}
                                                  className="w-full ps-9 p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all bg-white"
                                                  data-help-key="wizard_tone_select"
                                                  aria-label={t('wizard.input_tone_label')}
                                              >
                                                  <option value="Informative">{t('wizard.tones.informative')}</option>
                                                  <option value="Narrative">{t('wizard.tones.narrative')}</option>
                                                  <option value="Persuasive">{t('wizard.tones.persuasive')}</option>
                                                  <option value="Humorous">{t('wizard.tones.humorous')}</option>
                                                  <option value="Step-by-Step">{t('wizard.tones.procedural')}</option>
                                              </select>
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('wizard.input_length_label')}</label>
                                          <div className="relative">
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                  <AlignJustify size={14} className="text-slate-600" />
                                              </div>
                                              <select
                                                  value={localData.length}
                                                  onChange={(e) => setLocalData(prev => ({ ...prev, length: e.target.value }))}
                                                  className="w-full ps-9 p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all bg-white"
                                                  data-help-key="wizard_length_select"
                                                  aria-label={t('wizard.input_length_label')}
                                              >
                                                  <option value="200">{t('wizard.lengths.short')}</option>
                                                  <option value="500">{t('wizard.lengths.medium')}</option>
                                                  <option value="800">{t('wizard.lengths.long')}</option>
                                                  <option value="1200">{t('wizard.lengths.extended')}</option>
                                                  <option value="2000">{t('wizard.lengths.deep')}</option>
                                              </select>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('wizard.input_level_label')}</label>
                                          <div className="relative">
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                  <GraduationCap size={14} className="text-slate-600" />
                                              </div>
                                              <select
                                                  value={localData.grade}
                                                  onChange={(e) => setLocalData(prev => ({ ...prev, grade: e.target.value }))}
                                                  className="w-full ps-9 p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all bg-white"
                                                  data-help-key="wizard_level_select"
                                                  aria-label={t('common.target_level')}
                                              >
                                                  <option value="Kindergarten">{t('grades.k')}</option>
                                                  <option value="1st Grade">{t('grades.g1')}</option>
                                                  <option value="2nd Grade">{t('grades.g2')}</option>
                                                  <option value="3rd Grade">{t('grades.g3')}</option>
                                                  <option value="4th Grade">{t('grades.g4')}</option>
                                                  <option value="5th Grade">{t('grades.g5')}</option>
                                                  <option value="6th Grade">{t('grades.g6')}</option>
                                                  <option value="7th Grade">{t('grades.g7')}</option>
                                                  <option value="8th Grade">{t('grades.g8')}</option>
                                                  <option value="9th Grade">{t('grades.g9')}</option>
                                                  <option value="10th Grade">{t('grades.g10')}</option>
                                                  <option value="11th Grade">{t('grades.g11')}</option>
                                                  <option value="12th Grade">{t('grades.g12')}</option>
                                                  <option value="College">{t('grades.college')}</option>
                                                  <option value="Graduate Level">{t('grades.grad')}</option>
                                              </select>
                                          </div>
                                      </div>
                                      {!isParentMode && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('wizard.input_dok_label')}</label>
                                          <div className="relative">
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                  <Brain size={14} className="text-slate-600" />
                                              </div>
                                              <select
                                                  value={localData.dokLevel}
                                                  onChange={(e) => setLocalData(prev => ({ ...prev, dokLevel: e.target.value }))}
                                                  className="w-full ps-9 p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all bg-white"
                                                  data-help-key="wizard_dok_select"
                                                  aria-label={t('wizard.aria_dok_label')}
                                              >
                                                  <option value="">{t('wizard.dok_levels.none')}</option>
                                                  <option value="Level 1: Recall & Reproduction">{t('wizard.dok_levels.l1')}</option>
                                                  <option value="Level 2: Skill/Concept">{t('wizard.dok_levels.l2')}</option>
                                                  <option value="Level 3: Strategic Thinking">{t('wizard.dok_levels.l3')}</option>
                                                  <option value="Level 4: Extended Thinking">{t('wizard.dok_levels.l4')}</option>
                                              </select>
                                          </div>
                                      </div>
                                      )}
                                  </div>
                                  {!isParentMode && (
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-400">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs text-slate-600 font-bold flex items-center gap-1">
                                                <CheckCircle size={12} className="text-green-600"/> {isIndependentMode ? t('wizard.learning_goals') : t('wizard.target_standard')}
                                            </label>
                                            {!isIndependentMode && (
                                            <div className="flex bg-white rounded-md border border-slate-400 p-0.5 shadow-sm">
                                                <button
                                                    data-help-key="wizard_std_mode_ai"
                                                    onClick={() => setStandardMode('ai')}
                                                    className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === 'ai' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-600'}`}
                                                >
                                                    {t('standards.ai_match')}
                                                </button>
                                                <button
                                                    data-help-key="wizard_std_mode_manual"
                                                    onClick={() => setStandardMode('manual')}
                                                    className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${standardMode === 'manual' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:text-slate-600'}`}
                                                >
                                                    {t('standards.manual')}
                                                </button>
                                            </div>
                                            )}
                                        </div>
                                        {standardMode === 'ai' ? (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex gap-2">
                                                    {!isIndependentMode && (
                                                    <input aria-label={t('common.common_standards_region_placeholder')}
                                                        type="text"
                                                        value={aiStandardRegion}
                                                        onChange={(e) => setAiStandardRegion(e.target.value)}
                                                        placeholder={t('common.standards_region_placeholder')}
                                                        className="w-1/3 text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                                                    />
                                                    )}
                                                    <input aria-label={t('common.enter_ai_standard_query')}
                                                        type="text"
                                                        value={aiStandardQuery}
                                                        onChange={(e) => setAiStandardQuery(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleFindStandards()}
                                                        data-help-key="standards_query_input" placeholder={isIndependentMode ? t('wizard.independent_learning_goal') : t('wizard.skill_search_placeholder')}
                                                        className="flex-grow text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                                                    />
                                                    <button
                                                        onClick={handleFindStandards} data-help-key="standards_search_btn"
                                                        disabled={isFindingStandards || !aiStandardQuery.trim()}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded disabled:opacity-50 transition-colors shadow-sm"
                                                        title={t('standards.search_button_title')}
                                                        aria-label={t('standards.search_button_title')}
                                                    >
                                                        {isFindingStandards ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
                                                    </button>
                                                </div>
                                                {suggestedStandards.length > 0 && (
                                                    <div ref={standardsListRef} className="max-h-32 overflow-y-auto custom-scrollbar border border-slate-400 rounded bg-white divide-y divide-slate-100 shadow-inner">
                                                        {suggestedStandards.map((std, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    const val = `${std.code}: ${std.description}`;
                                                                    if (localData.standards.length < 3 && !localData.standards.includes(val)) {
                                                                        setLocalData(prev => ({ ...prev, standards: [...prev.standards, val] }));
                                                                        if(addToast) addToast(`Added ${std.code}`, "success");
                                                                    } else if (localData.standards.length >= 3) {
                                                                        if(addToast) addToast(t('standards.toast_max_limit'), "error");
                                                                    }
                                                                }}
                                                                className="w-full text-left p-2 hover:bg-indigo-50 transition-colors group flex flex-col gap-1"
                                                            >
                                                                <div className="flex justify-between items-start gap-1">
                                                                    {!isIndependentMode && (
                                                                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100">{std.code}</span>
                                                                    )}
                                                                    <span className="text-[11px] text-slate-600 uppercase ml-auto">{std.framework}</span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 group-hover:text-indigo-900">
                                                                    {std.description}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {suggestedStandards.length === 0 && !isFindingStandards && aiStandardQuery && (
                                                    <div className="text-[11px] text-slate-600 italic text-center p-1">
                                                        {t('standards.press_search_hint')}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <input aria-label={t('common.enter_standard_input_value')}
                                                    type="text"
                                                    value={standardInputValue}
                                                    onChange={(e) => setStandardInputValue(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddStandard()}
                                                    data-help-key="wizard_std_manual_input"
                                                    placeholder={t('standards.manual_placeholder')}
                                                    className="flex-grow text-xs border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                                                />
                                                <button
                                                    aria-label={t('common.add')}
                                                    onClick={handleAddStandard}
                                                    disabled={!standardInputValue.trim() || localData.standards.length >= 3}
                                                    className="bg-indigo-100 text-indigo-700 p-1.5 rounded hover:bg-indigo-200 transition-colors disabled:opacity-50"
                                                    data-help-key="wizard_std_manual_add_btn"
                                                    title={t('standards.add_standard')}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                  )}
                                  {localData.standards.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                          {localData.standards.map((std, idx) => (
                                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 animate-in slide-in-from-left-1 max-w-full">
                                                  <span className="truncate" title={std}>
                                                      {std.split(':')[0]}
                                                  </span>
                                                  <button
                                                      onClick={() => handleRemoveStandard(idx)}
                                                      className="hover:text-green-900 ml-1 shrink-0"
                                                      data-help-key="wizard_std_remove_btn"
                                                      title={t('standards.remove_standard')}
                                                      aria-label={t('standards.remove_standard')}
                                                  >
                                                      <X size={10} />
                                                  </button>
                                              </span>
                                          ))}
                                      </div>
                                  )}
                                  <div>
                                    <label className="block text-xs font-medium text-indigo-900 mb-1">
                                      {t('wizard.input_vocab_label')} <span className="text-indigo-600 font-normal">{t('common.optional')}</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Languages size={14} className="text-slate-600" />
                                        </div>
                                        <input
                                          type="text"
                                          value={localData.vocabulary}
                                          onChange={(e) => setLocalData(prev => ({ ...prev, vocabulary: e.target.value }))}
                                          placeholder={t('wizard.vocab_placeholder')}
                                          className="w-full ps-9 p-3 border-2 border-indigo-200 rounded-md focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-shadow duration-300"
                                          data-help-key="wizard_vocab_input"
                                          aria-label={t('input.vocab')}
                                        />
                                    </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">{t('wizard.input_instructions_label')} <span className="text-indigo-600 font-normal">{t('common.optional')}</span></label>
                                      <div className="relative">
                                          <div className="absolute top-3 left-3 pointer-events-none">
                                              <Wrench size={14} className="text-slate-600" />
                                          </div>
                                          <textarea
                                              value={localData.sourceCustomInstructions}
                                              onChange={(e) => setLocalData(prev => ({ ...prev, sourceCustomInstructions: e.target.value }))}
                                              data-help-key="wizard_instructions_input"
                                              placeholder={t('wizard.instructions_placeholder')}
                                              className="w-full ps-9 p-3 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none transition-all h-20 resize-none"
                                          />
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                      <input aria-label={t('common.toggle_verification')}
                                          type="checkbox"
                                          data-help-key="wizard_verify_checkbox" id="wiz-verify"
                                          checked={localData.verification}
                                          onChange={(e) => setLocalData(prev => ({ ...prev, verification: e.target.checked }))}
                                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300 cursor-pointer"
                                      />
                                      <label htmlFor="wiz-verify" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                          <ShieldCheck size={16} className="text-purple-500"/> {t('wizard.verify_facts')}
                                      </label>
                                  </div>
                                  <button
                                      aria-label={t('common.continue')}
                                      onClick={() => setStep(4)}
                                      disabled={!localData.topic.trim()}
                                      className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-md mt-4"
                                  >
                                      {t('common.next')} <ArrowRight size={18} />
                                  </button>
                              </div>
                          </div>
                      )}
                      {localData.sourceMode === 'file' && (
                          <div className="text-center py-8">
                              <div className="inline-block p-6 bg-indigo-50 rounded-full mb-4 border-2 border-indigo-100">
                                  <Upload size={48} className="text-indigo-500"/>
                              </div>
                              <h3 className="text-xl font-bold text-slate-700 mb-2">{t('wizard.upload_title')}</h3>
                              <p className="text-slate-600 mb-8 max-w-xs mx-auto text-sm">
                                  {t('wizard.file_helper')}
                              </p>
                              <button
                                  aria-label={t('common.upload')}
                                  onClick={() => {
                                      onUpload();
                                      onClose();
                                  }}
                                  className="bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto shadow-xl"
                              >
                                  <Upload size={20}/> {t('wizard.select_file')}
                              </button>
                              <p className="text-xs text-slate-600 mt-4">{t('wizard.file_process_msg')}</p>
                          </div>
                      )}
                  </div>
              )}
              {step === 4 && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                      <div>
                          <label className="block text-lg font-bold text-slate-700 mb-2">{t('wizard.adaptation')}</label>
                          <p className="text-slate-600 mb-6">{t('wizard.adaptation_desc')}</p>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-bold text-slate-600 mb-2">{t('wizard.output_format')}</label>
                                  <select aria-label={t('common.selection')}
                                    value={localData.format}
                                    data-help-key="wizard_format_select"
                                    onChange={(e) => setLocalData({...localData, format: e.target.value})}
                                    className="w-full p-3 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                  >
                                    <option value="Standard Text">{t('simplified.formats.standard')}</option>
                                    <option value="Dialogue Script">{t('simplified.formats.dialogue')}</option>
                                    <option value="Mock Advertisement">{t('simplified.formats.advertisement')}</option>
                                    <option value="News Report">{t('simplified.formats.news')}</option>
                                    <option value="Podcast Script">{t('simplified.formats.podcast')}</option>
                                    <option value="Social Media Thread">{t('simplified.formats.social')}</option>
                                    <option value="Poetry">{t('simplified.formats.poetry')}</option>
                                    <option value="Narrative Story">{t('simplified.formats.narrative_story')}</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-600 mb-1">{t('wizard.output_languages_label')}</label>
                                  <div className="flex gap-2 mb-2">
                                      <input aria-label={t('common.enter_wiz_lang_input')}
                                        type="text"
                                        value={wizLangInput}
                                        onChange={(e) => setWizLangInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addWizLanguage()}
                                        data-help-key="wizard_lang_input"
                                        placeholder={t('wizard.language_placeholder')}
                                        className="flex-grow p-3 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        disabled={localData.languages.length >= 4}
                                      />
                                      <button aria-label={t('common.add')}
                                        data-help-key="wizard_lang_add_btn"
                                        onClick={addWizLanguage}
                                        disabled={!wizLangInput.trim() || localData.languages.length >= 4}
                                        className="bg-indigo-100 text-indigo-700 p-3 rounded-xl hover:bg-indigo-200 disabled:opacity-50 transition-colors"
                                      >
                                        <Plus size={20} />
                                      </button>
                                  </div>
                                  <select aria-label={t('common.selection')}
                                      data-help-key="wizard_lang_common_select"
                                      onChange={(e) => { addCommonLanguage(e.target.value); e.target.value = ""; }}
                                      className="w-full text-xs border border-slate-400 rounded-lg p-2 bg-slate-50 text-slate-600 mb-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                                      disabled={localData.languages.length >= 4}
                                  >
                                      <option data-help-key="wizard_lang_common_select" value="">{t('wizard.quick_add_language')}</option>
                                      <option value="Spanish">{t('languages_list.Spanish')}</option>
                                      <option value="French">{t('languages_list.French')}</option>
                                      <option value="German">{t('languages_list.German')}</option>
                                      <option value="Portuguese">{t('languages_list.Portuguese')}</option>
                                      <option value="Mandarin">{t('languages_list.Mandarin')}</option>
                                      <option value="Arabic">{t('languages_list.Arabic')}</option>
                                      <option value="Vietnamese">{t('languages_list.Vietnamese')}</option>
                                      <option value="Russian">{t('languages_list.Russian')}</option>
                                      <option value="Japanese">{t('languages_list.Japanese')}</option>
                                  </select>
                                  <div className="flex flex-wrap gap-2 min-h-[40px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      {localData.languages.map(lang => (
                                          <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 animate-in zoom-in">
                                              {lang}
                                              <button
                                                  aria-label={t('common.close')}
                                                  data-help-key="wizard_lang_remove_btn"
                                                  onClick={() => removeWizLanguage(lang)}
                                                  className="hover:text-indigo-900 ml-1"
                                              >
                                                  <X size={12} />
                                              </button>
                                          </span>
                                      ))}
                                      {localData.languages.length === 0 && <span className="text-xs text-slate-600 italic self-center w-full text-center">{t('wizard.no_langs_selected')}</span>}
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-slate-600 mb-1">{t('wizard.interests_label_optional').replace(' (Optional)', '')}<span className="text-slate-400 font-normal"> (Optional)</span></label>
                                  <div className="flex gap-2 mb-2">
                                      <input aria-label={t('common.enter_wiz_interest_input')}
                                        type="text"
                                        value={wizInterestInput}
                                        onChange={(e) => setWizInterestInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addWizInterest()}
                                        data-help-key="wizard_interest_input"
                                        placeholder={t('wizard.interest_placeholder')}
                                        className="flex-grow p-3 border border-slate-400 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        disabled={localData.interests.length >= 5}
                                      />
                                      <button aria-label={t('common.add')}
                                        data-help-key="wizard_interest_add_btn"
                                        onClick={addWizInterest}
                                        disabled={!wizInterestInput.trim() || localData.interests.length >= 5}
                                        className="bg-indigo-100 text-indigo-700 p-3 rounded-xl hover:bg-indigo-200 disabled:opacity-50 transition-colors"
                                      >
                                        <Plus size={20} />
                                      </button>
                                  </div>
                                  <div className="flex flex-wrap gap-2 min-h-[40px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      {localData.interests.map(interest => (
                                          <span key={interest} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 animate-in zoom-in">
                                              {interest}
                                              <button
                                                  aria-label={t('common.close')}
                                                  data-help-key="wizard_interest_remove_btn"
                                                  onClick={() => removeWizInterest(interest)}
                                                  className="hover:text-pink-900 ml-1"
                                              >
                                                  <X size={12} />
                                              </button>
                                          </span>
                                      ))}
                                      {localData.interests.length === 0 && <span className="text-xs text-slate-600 italic self-center w-full text-center">{t('wizard.no_interests')}</span>}
                                  </div>
                                  <p className="text-xs text-slate-600 mt-1">{t('wizard.interests_helper')}</p>
                              </div>
                          </div>
                          <div className="flex justify-between pt-4 mt-4 border-t border-slate-100">
                              <button
                                  aria-label={t('common.check')}
                                data-help-key="wizard_prev_btn"
                                onClick={() => setStep(s => s - 1)}
                                className="text-slate-600 hover:text-slate-600 font-bold text-sm px-4 py-2 flex items-center gap-2"
                              >
                                <ArrowDown className="rotate-90" size={16}/> {t('common.back')}
                              </button>
                              <button
                                  aria-label={t('common.check')}
                                data-help-key="wizard_complete_btn"
                                onClick={() => onComplete(localData)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2"
                              >
                                {t('common.finish')} <CheckCircle2 size={18} />
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
          {step < 4 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                  {step > 1 ? (
                      <button
                          aria-label={t('common.continue')}
                        onClick={() => setStep(s => s - 1)}
                        className="text-slate-600 hover:text-slate-600 font-bold text-sm px-4 py-2 flex items-center gap-2 transition-colors"
                      >
                        <ArrowDown className="rotate-90" size={16}/> {t('common.back')}
                      </button>
                  ) : (
                      <div></div>
                  )}
                  {step === 1 && (
                      <button aria-label={t('common.next')}
                        data-help-key="wizard_next_grade_btn"
                        onClick={handleNext}
                        disabled={!localData.grade}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        {t('common.next')} <ArrowRight size={20} />
                      </button>
                  )}
              </div>
          )}
      </div>
    </div>
  );
});

window.AlloModules = window.AlloModules || {};
window.AlloModules.QuickStartWizard = QuickStartWizard;
console.log('[QuickStartWizard] Module registered successfully');
