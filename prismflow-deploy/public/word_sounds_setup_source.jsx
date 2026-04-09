    const WordSoundsGenerator = React.memo(({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview , onMinimize, onExpand, isProbeMode}) => {
        const t = tProp || ((key, params) => getWordSoundsString((k) => k, key, params || {}));
        const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');
    React.useEffect(() => {
        if (isProbeMode) setImageVisibilityMode('off');
    }, [isProbeMode]);
    React.useEffect(() => {
        if (isProbeMode) setImageVisibilityMode('off');
    }, [isProbeMode]);
        const SMART_IMAGE_VISIBILITY = {
            'counting':       'afterCompletion',
            'isolation':      'progressive',
            'blending':       'afterCompletion',
            'segmentation':   'alwaysOn',
            'rhyming':        'alwaysOn',
            'letter_tracing': 'alwaysOn',
            'mapping':        'alwaysOn',
            'orthography':    'afterCompletion',
            'sound_sort':     'progressive',
            'word_families':  'progressive',
            'spelling_bee':   'afterCompletion',
            'word_scramble':  'afterCompletion',
            'missing_letter': 'afterCompletion'
        };
        const [includeGlossary, setIncludeGlossary] = React.useState(true);
        const [includeFamily, setIncludeFamily] = React.useState(false);
        const [includeCustom, setIncludeCustom] = React.useState(false);
        const [includeAI, setIncludeAI] = React.useState(false);
        const [wordCount, setWordCount] = React.useState(10);
        const [selectedFamily, setSelectedFamily] = React.useState('');
    const [includeSightWords, setIncludeSightWords] = React.useState(false);
    const [selectedSightWordList, setSelectedSightWordList] = React.useState('');
        const [wordSoundsSessionGoal, setWordSoundsSessionGoal] = React.useState(30);
        const [orthoSessionGoal, setOrthoSessionGoal] = React.useState(0);
    const includeOrthographic = orthoSessionGoal > 0;
        const [customText, setCustomText] = React.useState('');
        const [includeLessonPlan, setIncludeLessonPlan] = React.useState(false);
        const [lessonPlan, setLessonPlan] = React.useState({
            isolation: { enabled: false, count: 5 },
            blending: { enabled: false, count: 5 },
            segmentation: { enabled: false, count: 5 },
            orthography: { enabled: false, count: 5 },
            rhyming: { enabled: false, count: 5 },
            letter_tracing: { enabled: false, count: 5 },
            counting: { enabled: false, count: 5 },
            mapping: { enabled: false, count: 5 },
            sound_sort: { enabled: false, count: 5 },
            word_families: { enabled: false, count: 5 },
            word_scramble: { enabled: false, count: 5 },
        });
        const [lessonPlanOrder, setLessonPlanOrder] = React.useState([
            'isolation', 'blending', 'segmentation', 'orthography', 'rhyming',
            'letter_tracing', 'counting', 'mapping', 'sound_sort', 'word_families', 'word_scramble'
        ]);
        const [draggedActivity, setDraggedActivity] = React.useState(null);
        const [imageTheme, setImageTheme] = React.useState('');
        const [syllableRange, setSyllableRange] = React.useState({ min: 1, max: 4 });
        const [aiTopic, setAiTopic] = React.useState('');
        const [aiTerms, setAiTerms] = React.useState([]);
        const [isAiGenerating, setIsAiGenerating] = React.useState(false);
        const [isProcessing, setIsProcessing] = React.useState(false);
        const [isMinimized, setIsMinimized] = React.useState(false);
    React.useEffect(() => {
        if (typeof loadPsychometricProbes === 'function') {
            loadPsychometricProbes();
        }
    }, []);
        const [generatedCount, setGeneratedCount] = React.useState(0);
        const [selectedIndices, setSelectedIndices] = React.useState(new Set());
        const hasAutoNavigated = React.useRef(preloadedWords.length > 0);
        React.useEffect(() => {
            if (preloadedWords.length > 0 && !isProcessing && onShowReview && !hasAutoNavigated.current) {
                debugLog("📋 Words preloaded! Auto-navigating to Review Panel...");
                hasAutoNavigated.current = true;
                const timer = setTimeout(() => {
                    onShowReview();
                }, 300);
                return () => clearTimeout(timer);
            }
        }, [preloadedWords.length, isProcessing, onShowReview]);
        const countSyllables = React.useCallback((word) => {
            if (!word) return 1;
            const w = word.toLowerCase().trim();
            if (w.length <= 3) return 1;
            const cleaned = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
                             .replace(/^y/, '');
            const vowelGroups = cleaned.match(/[aeiouy]+/g);
            return vowelGroups ? vowelGroups.length : 1;
        }, []);
        const previewList = React.useMemo(() => {
            let list = [];
            // Include already-generated words so they appear in the Lesson Preview grid
            if (preloadedWords && preloadedWords.length > 0) {
                const preloadedWordStrings = preloadedWords.map(w => w.targetWord || w.word || w.term || (typeof w === 'string' ? w : ''));
                list = [...list, ...preloadedWordStrings.filter(w => w)];
            }
            if (includeGlossary && Array.isArray(glossaryTerms)) {
                const glossaryWords = glossaryTerms.map(t => t.term || t.word || t);
                list = [...list, ...glossaryWords];
            }
            if (includeFamily && selectedFamily && WORD_FAMILY_PRESETS[selectedFamily]) {
                const familyWords = WORD_FAMILY_PRESETS[selectedFamily].filter(w => {
                    const count = countSyllables(w);
                    return count >= syllableRange.min && count <= syllableRange.max;
                });
                list = [...list, ...familyWords];
            }
            if (includeCustom && customText) {
                const customWords = customText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
                list = [...list, ...customWords];
            }
            if (includeSightWords && selectedSightWordList && SIGHT_WORD_PRESETS[selectedSightWordList]) {
                const sightWords = SIGHT_WORD_PRESETS[selectedSightWordList];
                list = [...list, ...sightWords];
            }
            if (includeAI && aiTerms.length > 0) {
                list = [...list, ...aiTerms];
            }
            return [...new Set(list)];
        }, [includeGlossary, includeFamily, includeCustom, includeAI, includeSightWords, selectedSightWordList, glossaryTerms, selectedFamily, customText, aiTerms, preloadedWords]);
        React.useEffect(() => {
            const limit = Math.min(previewList.length, wordCount);
            const indices = new Set();
            for(let i=0; i<limit; i++) indices.add(i);
            setSelectedIndices(indices);
        }, [previewList, wordCount]);
        const toggleSelection = (index) => {
            const next = new Set(selectedIndices);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            setSelectedIndices(next);
        };
        const toggleAll = () => {
             if (selectedIndices.size === previewList.length && previewList.length > 0) {
                 setSelectedIndices(new Set());
             } else {
                 setSelectedIndices(new Set(previewList.map((_, i) => i)));
             }
        };
        const handleAiGenerate = async () => {
            if (!aiTopic.trim()) return;
            setIsAiGenerating(true);
            try {
                const syllableConstraint = ` All words must have between ${syllableRange.min} and ${syllableRange.max} syllables.`;
                const prompt = `Generate a list of 15 phonics-rich words related to the topic: "${aiTopic}". Target Grade Level: ${gradeLevel}.${syllableConstraint} Return ONLY a comma-separated list of words.`;
                const result = await callGemini(prompt, false);
                const words = result.replace(/[^a-zA-Z,\s-]/g, '').split(',').map(w => w.trim()).filter(w => w);
                setAiTerms(words);
                setIncludeAI(true);
            } catch (e) {
                warnLog("AI Gen Failed", e);
            }
            setIsAiGenerating(false);
        };
        const handleStart = async () => {
             const wordsToProcess = previewList.filter((_, i) => selectedIndices.has(i));
             if (wordsToProcess.length === 0) return;
             setIsProcessing(true);
             setGeneratedCount(0);
             const processed = [];
             for (let i = 0; i < wordsToProcess.length; i++) {
                 const rawWord = wordsToProcess[i];
                 try {
                     const prompt = `
                         Analyze the word "${rawWord}" for phonemic awareness activities. Target Audience: ${gradeLevel || 'Early Readers (K-2)'}.
                         PHONEME NOTATION (use EXACTLY these symbols):
                         • LONG VOWELS: Use macron symbols: ā (long a), ē (long e), ī (long i), ō (long o), ū (long u)
                         • SHORT VOWELS: Use plain letters: a, e, i, o, u
                         • DIGRAPHS: sh, ch, th, wh, ng, ck (count as ONE sound)
                         • R-CONTROLLED VOWELS: ar, er, ir, or, ur (count as ONE sound — do NOT split into separate phonemes)
                         CRITICAL RULES:
                         • R-CONTROLLED vowels are ALWAYS one sound: "or" in "corn" = 1 phoneme, NOT "o"+"r"
                         • Silent letters are skipped: "knight" → ["n", "ī", "t"]
                         • Vowel teams are one sound: "rain" → ["r", "ā", "n"]
                         EXAMPLES:
                         • "cat" → ["k", "a", "t"] (3 phonemes, short a)
                         • "cake" → ["k", "ā", "k"] (3 phonemes, long a)
                         • "ship" → ["sh", "i", "p"] (3 phonemes, sh is ONE sound)
                         • "corn" → ["k", "or", "n"] (3 phonemes, or is ONE sound)
                         • "orbit" → ["or", "b", "i", "t"] (4 phonemes, or is ONE sound)
                         • "bird" → ["b", "ir", "d"] (3 phonemes, ir is ONE sound)
                         • "star" → ["s", "t", "ar"] (3 phonemes — do NOT add extra r)
                         • "turn" → ["t", "ur", "n"] (3 phonemes, ur is ONE sound)
                         • "fern" → ["f", "er", "n"] (3 phonemes, er is ONE sound)
                         • "rain" → ["r", "ā", "n"] (3 phonemes, ai = long a)
                         Return ONLY JSON:
                         {
                             "word": "${rawWord}",
                             "phonemes": ["k", "or", "n"],
                             "phonemeCount": 3,
                             "syllables": ["corn"],
                             "rhymeWord": "horn",
                             "rhymeDistractors": ["dog", "sun", "bed", "leg", "cup"],
                             "blendingDistractors": ["cord", "core", "born", "worn", "torn"],
                             "wordFamily": "-orn",
                             "familyEnding": "-orn",
                             "familyMembers": ["horn", "born", "worn", "torn", "morn"],
                             "firstSound": "k",
                             "lastSound": "n",
                             "definition": "Simple definition matching grade level",
                             "imagePrompt": "Icon of ${rawWord}, white background"
                         }
                      `;
                     const result = await callGemini(prompt, true);
                     const data = JSON.parse(result.replace(/```json/g, '').replace(/```/g, ''));
                     let imageUrl = null;
                     if (callImagen) {
                        try {
                            const themePrefix = imageTheme?.trim() ? `${imageTheme.trim()} style, ` : '';
                            const finalPrompt = data.imagePrompt
                                ? `${themePrefix}${data.imagePrompt}`
                                : `${themePrefix}Icon of ${rawWord}, white background`;
                            imageUrl = await callImagen(finalPrompt);
                        } catch(e) { warnLog('Caught error:', e?.message || e); }
                     }
                     const validatedPhonemes = (data.phonemes && data.phonemes.length > 0)
                         ? data.phonemes
                         : data.word.toLowerCase().split('');
                     processed.push({
                         id: Date.now() + i,
                         term: data.word,
                         word: data.word,
                         targetWord: data.word,
                         displayWord: data.word,
                         phonemes: validatedPhonemes,
                          phonemeCount: validatedPhonemes.length,
                         syllables: data.syllables,
                         rhymes: data.rhymes || [data.rhymeWord],
                         rhymeWord: data.rhymeWord || (data.rhymes && data.rhymes[0]) || '',
                         rhymeDistractors: data.rhymeDistractors || [],
                         blendingDistractors: data.blendingDistractors || [],
                         familyEnding: data.familyEnding || '',
                         familyMembers: data.familyMembers || [],
                         firstSound: data.firstSound || (data.phonemes && data.phonemes[0]) || '',
                         lastSound: data.lastSound || (data.phonemes && data.phonemes[data.phonemes.length - 1]) || '',
                         definition: data.definition,
                         image: imageUrl
                     });
                 } catch (e) {
                     warnLog("Word processing failed for:", rawWord, e.message);
                     const fallbackPhonemes = rawWord.toLowerCase().split('');
                     processed.push({
                         term: rawWord,
                         word: rawWord,
                         targetWord: rawWord,
                         phonemes: fallbackPhonemes,
                         phonemeCount: fallbackPhonemes.length,
                         firstSound: fallbackPhonemes[0] || rawWord[0],
                         lastSound: fallbackPhonemes[fallbackPhonemes.length - 1] || rawWord[rawWord.length - 1],
                         image: null,
                         _fallbackUsed: true
                     });
                 }
                     const lastItem = processed[processed.length - 1];
                     if (callTTS && typeof callTTS === 'function' && lastItem && !lastItem._fallbackUsed) {
                         const ttsTasks = new Set();
                         if (lastItem.rhymeWord) ttsTasks.add(lastItem.rhymeWord);
                         (lastItem.rhymeDistractors || []).forEach(w => w && ttsTasks.add(w));
                         (lastItem.blendingDistractors || []).forEach(w => w && ttsTasks.add(w));
                         (lastItem.familyMembers || []).forEach(w => w && ttsTasks.add(w));
                         try { await Promise.allSettled(Array.from(ttsTasks).map(w => callTTS(w))); } catch(e) { warnLog('Caught error:', e?.message || e); }
                     }
                     setGeneratedCount(prev => prev + 1);
             }
             let sequence = [];
             const enabledActivities = [];
             if (includeLessonPlan) {
                 lessonPlanOrder.forEach(actId => {
                     const cfg = lessonPlan[actId];
                     if (cfg && cfg.enabled) {
                         enabledActivities.push({ id: actId, count: cfg.count, enabled: true });
                         for (let k = 0; k < cfg.count; k++) sequence.push(actId);
                     }
                 });
             }
             const lessonPlanConfig = includeLessonPlan ? {
                 masteryMode: 'consecutive',
                 masteryThreshold: 3,
                 activities: enabledActivities,
                 order: lessonPlanOrder.filter(id => lessonPlan[id]?.enabled),
                 totalItems: sequence.length,
                 estimatedMinutes: Math.ceil(sequence.length * 0.5)
             } : null;
             const configSummary = lessonPlanConfig
                 ? `Mastery: ${lessonPlanConfig.masteryThreshold} consecutive • ` +
                   enabledActivities.map(a => `${a.id.replace('_', ' ')} (${a.count})`).join(' → ') +
                   ` • Est. ${lessonPlanConfig.estimatedMinutes} min`
                 : 'Quick Practice Mode';
             onStartGame(processed, sequence, lessonPlanConfig, configSummary);
             setIsProcessing(false);
        };
        if (isMinimized) {
            return (
                <div className="fixed bottom-4 right-4 z-[100] bg-white rounded-2xl shadow-2xl border-2 border-violet-500 p-4 animate-in slide-in-from-bottom-10 fade-in w-80">
                     <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-2">
                             <Loader2 className={`text-violet-600 ${isProcessing ? 'animate-spin' : ''}`} size={20} />
                             <span className="font-bold text-slate-700 text-sm">
                                 {isProcessing ? 'Generating...' : 'Word Sounds'}
                             </span>
                         </div>
                         <button data-help-key="ws_gen_expand" onClick={() => { setIsMinimized(false); if (onExpand) onExpand(); }} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                             <Maximize2 size={18} />
                         </button>
                     </div>
                     {isProcessing && (
                         <div className="space-y-2">
                             <div className="flex justify-between text-xs font-bold text-violet-600">
                                 <span>{t('status.analyzing', 'Processing...')}</span>
                                 <span>{generatedCount} / {selectedIndices.size}</span>
                             </div>
                             <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                 <div
                                     className="h-full bg-violet-600 transition-all duration-300"
                                     style={{ width: `${selectedIndices.size ? (generatedCount / selectedIndices.size) * 100 : 0}%` }}
                                 />
                             </div>
                         </div>
                     )}
                     {!isProcessing && (
                          <div className="text-center">
                              <button
                                  aria-label={t('common.generate')}
                                  data-help-key="ws_gen_expand" onClick={() => { setIsMinimized(false); if (onExpand) onExpand(); }}
                                  className="text-xs bg-violet-100 text-violet-700 font-bold px-3 py-1.5 rounded-full hover:bg-violet-200"
                              >
                                  Tap to Expand
                              </button>
                          </div>
                     )}
                </div>
            );
        }
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Sparkles size={32} className="text-yellow-300 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black tracking-tight">{isProbeMode ? `📊 ${(probeActivity || '').charAt(0).toUpperCase() + (probeActivity || '').slice(1)} Probe` : t('word_sounds.title', 'Word Sounds Studio')}</h2>
                                <p className="text-indigo-100 font-medium opacity-90">{t('word_sounds.subtitle', 'Design your phonics lesson')} • {gradeLevel || 'K-2'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button data-help-key="ws_gen_minimize" onClick={() => { setIsMinimized(true); if (onMinimize) onMinimize(); }} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors" title={t('common.minimize')}>
                                <Minimize size={24} />
                            </button>
                            <button aria-label={t('common.close_minimize')} data-help-key="ws_gen_close" onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors" title={t('common.close')}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    {preloadedWords && preloadedWords.length > 0 && (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 rounded-full p-1.5">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                </div>
                                <div>
                                    <span className="font-bold text-emerald-800">{preloadedWords.length} words ready</span>
                                    <span className="text-emerald-600 text-sm ml-2">
                                        {preloadedWords.slice(0, 5).map(w => w.targetWord || w.word || w).join(', ')}
                                        {preloadedWords.length > 5 && `, +${preloadedWords.length - 5} more`}
                                    </span>
                                </div>
                            </div>
                            <button
                                aria-label={t('common.show')}
                                data-help-key="ws_gen_review_btn" onClick={onShowReview}
                                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Eye size={14} />
                                Review Words
                            </button>
                        </div>
                    )}
                    <div className="flex flex-1 overflow-hidden">
                        <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t('word_sounds.settings', 'Settings')}</label>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.count', 'Word Count')}</span>
                                        <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-md text-xs font-bold">{wordCount}</span>
                                    </div>
                                    <input aria-label={t('common.word_count_slider')}
                                        type="range" min="5" max="40" step="1"
                                        data-help-key="ws_gen_count_slider" value={wordCount} onChange={(e) => setWordCount(parseInt(e.target.value))}
                                        className="w-full accent-violet-600 cursor-pointer"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">{t('word_sounds.auto_select_hint', `Auto-selects ${wordCount} words`)}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.phono_activity_length', 'Sound Activities per Session')}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{wordSoundsSessionGoal || 30}</span>
                                    </div>
                                    <input aria-label={t('common.session_goal_slider')}
                                        type="range" min="5" max="200" step="5"
                                        data-help-key="ws_gen_session_slider" value={wordSoundsSessionGoal || 30}
                                        onChange={(e) => setWordSoundsSessionGoal && setWordSoundsSessionGoal(parseInt(e.target.value))}
                                        className="w-full accent-emerald-500 cursor-pointer"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">{t('word_sounds.phono_activity_length_hint', 'Phonological activities complete after this many correct answers')}</p>
                                </div>
                                <div className="mt-3">
                                    <div className={`bg-white p-4 rounded-xl border ${includeLessonPlan ? 'opacity-50 cursor-not-allowed border-slate-200' : orthoSessionGoal > 0 ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'} shadow-sm`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-slate-700">{t('word_sounds.ortho_activity_length', '🔤 Spelling Activities per Session')}</span>
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${orthoSessionGoal > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{orthoSessionGoal || 'Off'}</span>
                                        </div>
                                        <input aria-label={t('common.spelling_session_goal_slider')}
                                            type="range" min="0" max="100" step="5"
                                            data-help-key="ws_gen_ortho_slider" value={orthoSessionGoal || 0}
                                            onChange={(e) => !includeLessonPlan && setOrthoSessionGoal(parseInt(e.target.value))}
                                            className={`w-full ${includeLessonPlan ? 'opacity-50' : ''} accent-indigo-500 cursor-pointer`}
                                            disabled={includeLessonPlan}
                                        />
                                        <p className="text-xs text-slate-500 mt-2">
                                            {includeLessonPlan
                                                ? '⚠️ Controlled by Lesson Plan mode'
                                                : orthoSessionGoal > 0
                                                    ? t('word_sounds.ortho_activity_hint_on', `Spelling activities begin after sound activities complete (${orthoSessionGoal} items)`)
                                                    : t('word_sounds.ortho_activity_hint_off', 'Slide right to add spelling practice after phonics activities')
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.image_theme', 'Image Style')}</span>
                                        <Palette size={18} className="text-pink-500" />
                                    </div>
                                    <input aria-label={t('common.image_theme_input')}
                                        type="text"
                                        data-help-key="ws_gen_theme_input" value={imageTheme}
                                        onChange={(e) => setImageTheme(e.target.value)}
                                        placeholder={t('word_sounds.theme_placeholder', 'e.g. cartoon, pixel art, realistic...')}
                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                    />
                                    <p className="text-xs text-slate-500 mt-2">{t('word_sounds.theme_hint', 'Optional: Style for new word images (not glossary)')}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.image_display_mode')}</span>
                                        <ImageIcon size={18} className="text-violet-500" />
                                    </div>
                                    <select aria-label={t('common.image_display_mode')}
                                        value={imageVisibilityMode}
                                        onChange={(e) => setImageVisibilityMode(e.target.value)}
                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-violet-400 focus:outline-none"
                                        title={t('common.control_when_word_images_appear_during_activities')}
                                    >
                                        <option value="smart">🧠 Smart (Recommended) - Activity-specific</option>
                                        <option value="alwaysOn">🖼️ Always On - Image visible immediately</option>
                                        <option value="progressive">📈 Progressive - After 1st response</option>
                                        <option value="afterCompletion">✅ After Completion - After correct or 2nd attempt</option>
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">When should word images be revealed during activities (Smart = optimized per activity)</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{t('word_sounds.syllable_range')}</span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{syllableRange.min} - {syllableRange.max}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500 block mb-1">Min</label>
                                            <input aria-label={t('common.min')}
                                                type="number" min="1" max="4"
                                                data-help-key="ws_gen_syllable_min" value={syllableRange.min}
                                                onChange={(e) => {
                                                    const val = Math.max(1, Math.min(4, parseInt(e.target.value) || 1));
                                                    setSyllableRange(prev => ({ ...prev, min: Math.min(val, prev.max) }));
                                                }}
                                                className="w-full p-2 border rounded-lg text-center font-bold"
                                            />
                                        </div>
                                        <span className="text-slate-500 mt-4">-</span>
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500 block mb-1">Max</label>
                                            <input aria-label={t('common.max')}
                                                type="number" min="1" max="4"
                                                data-help-key="ws_gen_syllable_max" value={syllableRange.max}
                                                onChange={(e) => {
                                                    const val = Math.max(1, Math.min(4, parseInt(e.target.value) || 4));
                                                    setSyllableRange(prev => ({ ...prev, max: Math.max(val, prev.min) }));
                                                }}
                                                className="w-full p-2 border rounded-lg text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Limit word complexity (Min/Max Syllables)</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t('word_sounds.sources', 'Active Sources')}</label>
                                <div role="button" tabIndex={0} className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${includeGlossary ? 'bg-violet-50 border-violet-500' : 'bg-white border-slate-200'}`} data-help-key="ws_gen_src_glossary" onClick={() => setIncludeGlossary(prev => !prev)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeGlossary ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                                            {includeGlossary && <Check size={14} className="text-white" />}
                                        </div>
                                        <BookOpen size={18} className="text-violet-600" />
                                        <span className="font-bold text-slate-700">{t('word_sounds.source_glossary', 'Glossary')} ({glossaryTerms?.length || 0})</span>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeFamily ? 'bg-pink-50 border-pink-500' : 'bg-white border-slate-200'}`}>
                                    <div role="button" tabIndex={0} className="flex items-center gap-3 cursor-pointer" data-help-key="ws_gen_src_family" onClick={() => setIncludeFamily(prev => !prev)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeFamily ? 'bg-pink-600 border-pink-600' : 'border-slate-300'}`}>
                                            {includeFamily && <Check size={14} className="text-white" />}
                                        </div>
                                        <Layers size={18} className="text-pink-600" />
                                        <span className="font-bold text-slate-700">{t('word_sounds.source_family', 'Word Family')}</span>
                                    </div>
                                    {includeFamily && (
                                        <><select aria-label={t('common.selection')} data-help-key="ws_gen_family_select"
                                            value={selectedFamily}
                                            onChange={(e) => setSelectedFamily(e.target.value)}
                                            className="mt-3 w-full p-2 rounded-lg border border-pink-200 bg-white text-sm focus:ring-2 focus:ring-pink-400 focus:outline-none"
                                        >
                                            <option value="">{t('word_sounds.select_family', 'Select family...')}</option>
                                            {Object.keys(WORD_FAMILY_PRESETS).map(k => <option key={k} value={k}>{k} ({WORD_FAMILY_PRESETS[k].length})</option>)}
                                        </select>
                                        {selectedFamily && WORD_FAMILY_PRESETS[selectedFamily] && WORD_FAMILY_PRESETS[selectedFamily].filter(w => {
                                            const c = countSyllables(w);
                                            return c >= syllableRange.min && c <= syllableRange.max;
                                        }).length === 0 && (
                                            <p className="text-red-500 text-xs mt-2 font-bold bg-red-50 p-2 rounded border border-red-100">
                                                ⚠️ No words match range ({syllableRange.min}-{syllableRange.max}). Adjust Syllables or range.
                                            </p>
                                        )}
                                    </>)}
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeCustom ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-200'}`}>
                                    <div role="button" tabIndex={0} className="flex items-center gap-3 cursor-pointer" data-help-key="ws_gen_src_custom" onClick={() => setIncludeCustom(prev => !prev)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeCustom ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                                            {includeCustom && <Check size={14} className="text-white" />}
                                        </div>
                                        <Edit2 size={18} className="text-emerald-600" />
                                        <span className="font-bold text-slate-700">{t('word_sounds.source_custom', 'Custom Manual')}</span>
                                    </div>
                                    {includeCustom && (<>
                                        <div className="mt-3 flex gap-2">
                                            <input aria-label={t('common.quick_add_word')}
                                                id="word-sounds-quick-add" data-help-key="ws_gen_quick_add_input"
                                                type="text"
                                                placeholder={t('word_sounds.add_word', 'Add a word...')}
                                                className="flex-1 p-2 rounded-lg border border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const input = e.target;
                                                        const word = input.value.trim();
                                                        if (word) {
                                                            setCustomText(prev => prev ? `${prev} ${word}` : word);
                                                            input.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <button data-help-key="ws_gen_quick_add_btn"
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById('word-sounds-quick-add');
                                                    const word = input?.value.trim();
                                                    if (word) {
                                                        setCustomText(prev => prev ? `${prev} ${word}` : word);
                                                        input.value = '';
                                                    }
                                                }}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <textarea
                                            aria-label={t('word_sounds.type_words', 'Type words here')}
                                            value={customText} onChange={(e) => setCustomText(e.target.value)}
                                            placeholder={t('word_sounds.type_words', 'Type words here (space or comma separated)...')}
                                            className="mt-2 w-full h-20 p-2 rounded-lg border border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none resize-none"
                                        />
                                    </>)}
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeSightWords ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-200'}`}>
                                    <div role="button" tabIndex={0} className="flex items-center gap-3 cursor-pointer" onClick={() => setIncludeSightWords(prev => !prev)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeSightWords ? 'bg-amber-600 border-amber-600' : 'border-slate-300'}`}>
                                            {includeSightWords && <Check size={14} className="text-white" />}
                                        </div>
                                        <BookOpen size={18} className="text-amber-600" />
                                        <span className="font-bold text-slate-700">{t('word_sounds.source_sight_words', '📚 Sight Words')}</span>
                                    </div>
                                    {includeSightWords && (
                                        <select aria-label={t('common.selection')}
                                            value={selectedSightWordList}
                                            onChange={(e) => setSelectedSightWordList(e.target.value)}
                                            className="mt-3 w-full p-2 rounded-lg border border-amber-200 bg-white text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                                        >
                                            <option value="">Select a sight word list...</option>
                                            {Object.keys(SIGHT_WORD_PRESETS).map(k => (
                                                <option key={k} value={k}>{k} ({SIGHT_WORD_PRESETS[k].length} words)</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className={`p-3 rounded-xl border-2 transition-all ${includeAI ? 'bg-violet-50 border-violet-500' : 'bg-white border-slate-200'}`}>
                                    <div role="button" tabIndex={0} className="flex items-center gap-3 cursor-pointer" onClick={() => setIncludeAI(prev => !prev)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeAI ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                                            {includeAI && <Check size={14} className="text-white" />}
                                        </div>
                                        <Sparkles size={18} className="text-violet-600" />
                                        <span className="font-bold text-slate-700">{t('word_sounds.source_ai', 'AI Topic Gen')}</span>
                                    </div>
                                    {includeAI && (
                                        <div className="mt-3 flex gap-2">
                                            <input aria-label={t('common.e_g_space_ocean')}
                                                value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                                                placeholder="e.g. Space, Ocean..."
                                                className="flex-1 p-2 rounded-lg border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                            />
                                            <button
                                                aria-label={t('common.confirm')}
                                                onClick={handleAiGenerate} disabled={isAiGenerating}
                                                className="bg-violet-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50"
                                            >
                                                {isAiGenerating ? '...' : 'Go'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 mt-4 border-t border-slate-200">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">📋 Lesson Plan (Advanced)</label><div className={`p-4 rounded-xl border-2 transition-all ${includeLessonPlan ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200'}`}>
                                    <div role="button" tabIndex={0} className="flex items-center justify-between cursor-pointer mb-3" onClick={() => setIncludeLessonPlan(prev => !prev)}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${includeLessonPlan ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                {includeLessonPlan && <Check size={14} className="text-white" />}
                                            </div>
                                            <span className="font-bold text-slate-700">{t('word_sounds.enable_lesson_plan')}</span>
                                        </div>
                                    </div>
                                    {includeLessonPlan && (
                                        <div className="space-y-3 pl-2 mt-3 animate-in fade-in slide-in-from-top-1">
                                            {lessonPlanOrder.map(actId => {
                                                const activityDefs = {
                                                    isolation: { id: 'isolation', label: 'Find Sounds', icon: ScanSearch },
                                                    blending: { id: 'blending', label: 'Blending', icon: GripHorizontal },
                                                    segmentation: { id: 'segmentation', label: 'Break It Down', icon: Scissors },
                                                    orthography: { id: 'orthography', label: 'Sight & Spell', icon: Type },
                                                    rhyming: { id: 'rhyming', label: 'Rhyme Time', icon: Music },
                                                    letter_tracing: { id: 'letter_tracing', label: 'Letter Tracing', icon: PenTool },
                                                    counting: { id: 'counting', label: 'Sound Counting', icon: Calculator },
                                                    mapping: { id: 'mapping', label: 'Sound Mapping', icon: GitCompare },
                                                    sound_sort: { id: 'sound_sort', label: 'Sound Sort', icon: Users },
                                                    word_families: { id: 'word_families', label: 'Word Families', icon: Users },
                                                    word_scramble: { id: 'word_scramble', label: 'Word Scramble', icon: Shuffle },
                                                };
                                                const activity = activityDefs[actId];
                                                return (
                                                <div
                                                    key={activity.id}
                                                    draggable
                                                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', activity.id); setDraggedActivity(activity.id); }}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        const fromId = e.dataTransfer.getData('text/plain');
                                                        const toId = activity.id;
                                                        if (fromId !== toId) {
                                                            setLessonPlanOrder(prev => {
                                                                const newOrder = [...prev];
                                                                const fromIdx = newOrder.indexOf(fromId);
                                                                const toIdx = newOrder.indexOf(toId);
                                                                newOrder.splice(fromIdx, 1);
                                                                newOrder.splice(toIdx, 0, fromId);
                                                                return newOrder;
                                                            });
                                                        }
                                                        setDraggedActivity(null);
                                                    }}
                                                    onDragEnd={() => setDraggedActivity(null)}
                                                    className={`bg-white p-3 rounded-lg border transition-all cursor-move ${draggedActivity === activity.id ? 'border-indigo-500 shadow-lg scale-[1.02]' : 'border-indigo-100 hover:border-indigo-300'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical size={14} className="text-slate-500 cursor-grab active:cursor-grabbing" />
                                                            <input aria-label={t('common.toggle_enabled')}
                                                                type="checkbox"
                                                                checked={lessonPlan[activity.id]?.enabled}
                                                                onChange={(e) => setLessonPlan(prev => ({
                                                                    ...prev,
                                                                    [activity.id]: { ...prev[activity.id], enabled: e.target.checked }
                                                                }))}
                                                                className="accent-indigo-600 w-4 h-4"
                                                            />
                                                            <span className="text-sm font-semibold text-slate-700">{activity.label}</span>
                                                        </div>
                                                        {lessonPlan[activity.id].enabled && (
                                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                {lessonPlan[activity.id].count}x
                                                            </span>
                                                        )}
                                                    </div>
                                                    {lessonPlan[activity.id].enabled && (
                                                        <input aria-label={t('common.adjust_lesson_plan')}
                                                            type="range" min="1" max="20" step="1"
                                                            value={lessonPlan[activity.id].count}
                                                            onChange={(e) => setLessonPlan(prev => ({
                                                                ...prev,
                                                                [activity.id]: { ...prev[activity.id], count: parseInt(e.target.value) }
                                                            }))}
                                                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                                                        />
                                                    )}
                                                </div>
                                            ); })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white p-8 overflow-y-auto flex flex-col">
                             <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-700">{t('word_sounds.preview_title', 'Lesson Preview')}</h3>
                                    <div className="flex items-center gap-4">
                                        <p className="text-slate-500 font-medium">{selectedIndices.size} {t('word_sounds.of_total', 'of')} {previewList.length} {t('word_sounds.words_selected', 'words selected')}</p>
                                        {previewList.length > 0 && (
                                            <button
                                                aria-label={t('common.toggle_all')}
                                                onClick={toggleAll}
                                                className="text-xs font-bold uppercase tracking-wider text-violet-600 hover:text-violet-700 hover:underline"
                                            >
                                                {selectedIndices.size === previewList.length ? t('word_sounds.deselect_all', 'Deselect All') : t('word_sounds.select_all', 'Select All')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleStart}
                                    disabled={selectedIndices.size === 0 || isProcessing}
                                    className={`px-8 py-4 rounded-2xl font-black text-xl shadow-xl transition-all flex items-center gap-3 ${
                                        selectedIndices.size > 0 && !isProcessing
                                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:scale-105 active:scale-95 hover:shadow-2xl hover:brightness-110'
                                            : isProcessing
                                                ? 'bg-violet-400 text-white cursor-wait'
                                                : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : <PlayCircle fill="currentColor" className="text-white/20" size={28} />}
                                    {isProcessing ? t('status.generating', 'Generating...') : t('word_sounds.start', 'Start Activity')}
                                </button>
                             </div>
                             {isProcessing && (
                                 <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-6 border border-violet-200 animate-in fade-in slide-in-from-top-2">
                                     <div className="flex items-center justify-between mb-3">
                                         <div className="flex items-center gap-3">
                                             <Loader2 className="animate-spin text-violet-600" size={24} />
                                             <span className="font-bold text-violet-800 text-lg">{t('status.analyzing', 'Creating audio & analyzing words...')}</span>
                                         </div>
                                         <span className="text-violet-600 font-black text-xl">{generatedCount} / {selectedIndices.size}</span>
                                     </div>
                                     <div className="w-full h-4 bg-violet-200/50 rounded-full overflow-hidden">
                                         <div
                                             className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                                             style={{ width: `${(generatedCount / selectedIndices.size) * 100}%` }}
                                         ></div>
                                     </div>
                                     <p className="text-violet-500 text-sm mt-2 text-center">
                                         {generatedCount < selectedIndices.size
                                             ? `Building Audio: "${previewList[Array.from(selectedIndices)[generatedCount]] || '...'}"`
                                             : 'Finishing up...'}
                                     </p>
                                 </div>
                             )}
                             {previewList.length > 0 ? (
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
                                     {previewList.map((word, i) => {
                                         const isSelected = selectedIndices.has(i);
                                         return (
                                             <div
                                                 key={i}
                                                 onClick={() => toggleSelection(i)}
                                                 className={`border-2 rounded-xl px-4 py-3 flex items-center justify-between group cursor-pointer transition-all ${
                                                     isSelected
                                                         ? 'bg-violet-50 border-violet-500 shadow-md'
                                                         : 'bg-slate-50 border-slate-100 hover:border-violet-200'
                                                 }`}
                                             >
                                                 <div className="flex items-center gap-3">
                                                     <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                         isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white'
                                                     }`}>
                                                         {isSelected && <Check size={14} className="text-white" />}
                                                     </div>
                                                     <span className={`font-bold text-lg capitalize ${isSelected ? 'text-violet-900' : 'text-slate-600'}`}>{word}</span>
                                                 </div>
                                                 <div className="flex gap-1">
                                                     <span className="w-2 h-2 rounded-full bg-indigo-400" title={t('common.phonemes')}></span>
                                                     <span className="w-2 h-2 rounded-full bg-pink-400" title={t('common.image')}></span>
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                                     <Layers size={48} className="mb-4 opacity-50" />
                                     <p className="text-xl font-bold">{t('word_sounds.no_words', 'No words selected')}</p>
                                     <p className="text-sm">{t('word_sounds.choose_source_hint', 'Choose a source to begin')}</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        );
    });
// @section WORD_SOUNDS_REVIEW — Session review panel
const WordSoundsReviewPanel = ({
    preloadedWords,
    onUpdateWord,
    onReorderWords,
    onStartActivity,
    onClose,
    onBackToSetup,
    onPlayAudio,
    onRegenerateWord,
    onRegenerateOption,
    onRegenerateAll,
    regeneratingIndex,
    onGenerateImage,
    onRefineImage,
    generatingImageIndex,
    isLoading,
    onDeleteWord,
    t,
    activitySequence,
    setActivitySequence,
    isStudentLocked,
    setIsStudentLocked,
    imageVisibilityMode,
    setImageVisibilityMode,
    isProbeMode
}) => {
    React.useEffect(() => {
    }, []);
    const [expandedIndex, setExpandedIndex] = React.useState(null);
    const [showPhonemeBank, setShowPhonemeBank] = React.useState(null);
    const [imageRefinementInputs, setImageRefinementInputs] = React.useState({});
    const [draggedPhoneme, setDraggedPhoneme] = React.useState(null);
    const [dragOverIndex, setDragOverIndex] = React.useState(null);
    const [playingWordIndex, setPlayingWordIndex] = React.useState(null);
    const [regeneratingOptions, setRegeneratingOptions] = React.useState({});
    const [playingAudioKey, setPlayingAudioKey] = React.useState(null);
    const [audioProgress, setAudioProgress] = React.useState({ ready: 0, total: 0 });
    React.useEffect(() => {
        if (!preloadedWords || preloadedWords.length === 0) return;
        const checkAudio = () => {
             setAudioProgress({
                 ready: preloadedWords.filter(w => w.ttsReady || w.phonemes).length,
                 total: preloadedWords.length
             });
        };
        const interval = setInterval(checkAudio, 1000);
        checkAudio();
        return () => clearInterval(interval);
    }, [preloadedWords]);
    const PHONEME_BANK = {
        'Consonants': ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'y', 'z'],
        'Digraphs': ['sh', 'zh', 'ch', 'th', 'wh', 'ph', 'ck', 'ng', 'q'],
        'Vowels (Short)': ['a', 'e', 'i', 'o', 'u', 'oo_short'],
        'Vowels (Long)': ['ee', 'oo', 'ue', 'aw', 'ai', 'ea', 'oa'],
        'Diphthongs': ['ay', 'ie', 'ow', 'oy'],
        'R-Controlled': ['ar', 'er', 'ir', 'or', 'ur', 'air', 'ear']
    };
    const estimateFirstPhoneme = (word) => {
        if (!word) return '';
        const w = word.toLowerCase();
        const EXCEPTIONS = {
            'city': 's', 'cent': 's', 'cell': 's', 'circle': 's', 'cycle': 's', 'cedar': 's', 'cereal': 's', 'center': 's',
            'gym': 'j', 'gem': 'j', 'giant': 'j', 'giraffe': 'j', 'gentle': 'j', 'germ': 'j', 'gist': 'j', 'ginger': 'j',
            'knight': 'n', 'knee': 'n', 'knob': 'n', 'knock': 'n', 'knot': 'n', 'know': 'n', 'knife': 'n',
            'wrap': 'r', 'wren': 'r', 'write': 'r', 'wrong': 'r', 'wrist': 'r',
            'gnaw': 'n', 'gnat': 'n', 'gnome': 'n',
            'psalm': 's', 'psychology': 's',
        };
        if (EXCEPTIONS[w]) return EXCEPTIONS[w];
        const digraphs = (PHONEME_BANK && PHONEME_BANK['Digraphs']) || ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck'];
        for (const dg of digraphs) { if (w.startsWith(dg)) return dg; }
        if (w.startsWith('kn')) return 'n';
        if (w.startsWith('wr')) return 'r';
        if (w.startsWith('gn')) return 'n';
        if (w.startsWith('c') && w.length > 1 && 'eiy'.includes(w[1])) return 's';
        if (w.startsWith('g') && w.length > 1 && 'eiy'.includes(w[1])) return 'j';
        return w.charAt(0);
    };
    const estimateLastPhoneme = (word) => {
        if (!word) return '';
        const w = word.toLowerCase();
        const EXCEPTIONS = {
            'come': 'm', 'some': 'm', 'done': 'n', 'gone': 'n', 'give': 'v', 'live': 'v', 'have': 'v',
            'nation': 'n', 'action': 'n',
        };
        if (EXCEPTIONS[w]) return EXCEPTIONS[w];
        const rControlled = (PHONEME_BANK && PHONEME_BANK['R-Controlled']) || ['ar', 'er', 'ir', 'or', 'ur'];
        for (const rc of rControlled) { if (w.endsWith(rc)) return rc; }
        const digraphs = (PHONEME_BANK && PHONEME_BANK['Digraphs']) || ['sh', 'ch', 'th', 'ng', 'ck'];
        for (const dg of digraphs) {
            if (dg === 'ck' && w.endsWith('ck')) return 'k';
            if (w.endsWith(dg)) return dg;
        }
        return w.slice(-1);
    };
const IPA_TO_AUDIO = {
    'ŋ': 'ng',
    'ʃ': 'sh',
    'tʃ': 'ch',
    'θ': 'th',
    'ð': 'dh',
    'ʒ': 'zh',
    'ɔ': 'aw',
    'ɔr': 'or',
    'i': 'ee',
    'oʊ': 'oa',
        'ɪr': 'ear',
        'ɪər': 'ear',
    'u': 'oo',
    'ʊ': 'oo_short',
    'k': 'k',
    'g': 'g',
    'p': 'p',
    'eɪ': 'ay',
    'aɪ': 'ie',
    'ɔɪ': 'oy',
    'aʊ': 'ow',
    'ɛ': 'e',
    'æ': 'a',
    'ɪ': 'i',
    'ɒ': 'o',
    'ʌ': 'u',
    'ɑr': 'ar',
    'ɛr': 'er',
    'ɜr': 'er',
    'ʊr': 'ur',
    'ɛər': 'air',
    'dʒ': 'j',
    'w': 'w',
    'j': 'y',
    'r': 'r',
    'l': 'l',
    'f': 'f',
    'v': 'v',
    'n': 'n',
    'm': 'm',
    'b': 'b',
    'd': 'd',
    's': 's',
    'z': 'z',
    't': 't',
    'h': 'h',
    'kw': 'q',
};
const PHONEME_GUIDE = {
    'a':  { label: 'Short A',     ipa: 'æ',  examples: 'cat, bat, map',        tip: 'As in "apple" — mouth open wide', confusesWith: ['ay'] },
    'e':  { label: 'Short E',     ipa: 'ɛ',  examples: 'bed, pet, red',        tip: 'As in "egg" — mouth slightly open', confusesWith: ['ee'] },
    'i':  { label: 'Short I',     ipa: 'ɪ',  examples: 'sit, kid, pig',        tip: 'As in "igloo" — quick and short', confusesWith: ['ie'] },
    'o':  { label: 'Short O',     ipa: 'ɒ',  examples: 'hot, pot, dog',        tip: 'As in "octopus" — mouth round', confusesWith: ['oa'] },
    'u':  { label: 'Short U',     ipa: 'ʌ',  examples: 'cup, bus, fun',        tip: 'As in "umbrella" — like a grunt', confusesWith: ['oo'] },
    'ay': { label: 'Long A',      ipa: 'eɪ', examples: 'cake, rain, play',     tip: 'Says its letter name "ay"', confusesWith: ['a'] },
    'ee': { label: 'Long E',      ipa: 'iː', examples: 'tree, see, meat',      tip: 'Says its letter name "ee"', confusesWith: ['e'] },
    'ie': { label: 'Long I',      ipa: 'aɪ', examples: 'kite, my, pie',        tip: 'Says its letter name "eye"', confusesWith: ['i'] },
    'oa': { label: 'Long O',      ipa: 'oʊ', examples: 'boat, go, bone',       tip: 'Says its letter name "oh"', confusesWith: ['o'] },
    'oo': { label: 'Long OO',     ipa: 'uː', examples: 'moon, food, blue',     tip: 'As in "ooze" — lips rounded tight', confusesWith: ['oo_short'] },
    'ue': { label: 'Long U',      ipa: 'juː',examples: 'cute, mule, use',      tip: 'Says "you" — starts with Y glide', confusesWith: ['oo'] },
    'oo_short': { label: 'Short OO', ipa: 'ʊ', examples: 'book, put, wood',    tip: 'Shorter than "moon" — as in "foot"', confusesWith: ['oo'] },
    'aw': { label: 'AW Sound',    ipa: 'ɔː', examples: 'saw, ball, caught',    tip: 'Jaw drops open — like saying "aww"', confusesWith: ['o'] },
    'ow': { label: 'OW Sound',    ipa: 'aʊ', examples: 'cow, house, loud',     tip: 'Like saying "ow!" when hurt', confusesWith: ['oa'] },
    'oy': { label: 'OY Sound',    ipa: 'ɔɪ', examples: 'boy, coin, toy',       tip: 'Starts with "aw" and glides to "ee"', confusesWith: [] },
    'ar': { label: 'AR Sound',    ipa: 'ɑr', examples: 'car, star, farm',      tip: 'Bossy R changes the vowel — pirate "arrr"', confusesWith: ['or'] },
    'er': { label: 'ER Sound',    ipa: 'ɜr', examples: 'her, fern, water',     tip: 'Same as IR and UR — most common spelling', confusesWith: ['ir', 'ur'] },
    'ir': { label: 'IR Sound',    ipa: 'ɪr', examples: 'bird, first, girl',    tip: 'Sounds identical to ER and UR', confusesWith: ['er', 'ur'] },
    'or': { label: 'OR Sound',    ipa: 'ɔr', examples: 'corn, door, more',     tip: 'Like "or" in "for" — distinct from AR', confusesWith: ['ar'] },
    'ur': { label: 'UR Sound',    ipa: 'ʊr', examples: 'turn, burn, nurse',    tip: 'Sounds identical to ER and IR', confusesWith: ['er', 'ir'] },
    'air':{ label: 'AIR Sound',   ipa: 'ɛər',examples: 'fair, care, bear',     tip: 'Like "air" you breathe', confusesWith: ['ar'] },
    'ear':{ label: 'EAR Sound',   ipa: 'ɪər',examples: 'ear, hear, near',      tip: 'Like "ear" on your head', confusesWith: ['er'] },
    'sh': { label: 'SH Sound',    ipa: 'ʃ',  examples: 'ship, fish, wish',     tip: '"Shhh" — quiet sound, no voice', confusesWith: ['ch'] },
    'ch': { label: 'CH Sound',    ipa: 'tʃ', examples: 'chip, lunch, watch',   tip: 'Like a sneeze "achoo" — plosive', confusesWith: ['sh'] },
    'th': { label: 'TH (Unvoiced)', ipa: 'θ', examples: 'think, thin, math',   tip: 'Tongue between teeth, blow air — no buzz', confusesWith: ['dh'] },
    'dh': { label: 'TH (Voiced)', ipa: 'ð',  examples: 'this, that, mother',   tip: 'Same tongue position as TH but throat buzzes', confusesWith: ['th'] },
    'wh': { label: 'WH Sound',    ipa: 'hw', examples: 'when, where, white',   tip: 'Start with a puff of air then W', confusesWith: ['w'] },
    'ng': { label: 'NG Sound',    ipa: 'ŋ',  examples: 'sing, ring, bang',     tip: 'Back of tongue touches roof — nasal hum', confusesWith: ['n'] },
    'ck': { label: 'CK Sound',    ipa: 'k',  examples: 'kick, back, duck',     tip: 'Same sound as K — used after short vowels', confusesWith: ['k'] },
    'zh': { label: 'ZH Sound',    ipa: 'ʒ',  examples: 'vision, measure, beige', tip: 'Voiced version of SH — rare in English', confusesWith: ['sh'] },
    'ph': { label: 'PH Sound',    ipa: 'f',  examples: 'phone, photo, graph',  tip: 'Sounds exactly like F — Greek origin', confusesWith: ['f'] },
    'b':  { label: 'B Sound',     ipa: 'b',  examples: 'bat, big, tub',        tip: 'Lips pop open — voiced', confusesWith: ['p'] },
    'c':  { label: 'C Sound',     ipa: 'k',  examples: 'cat, cup, cot',        tip: 'Hard C = K sound (before a, o, u)', confusesWith: ['k', 's'] },
    'd':  { label: 'D Sound',     ipa: 'd',  examples: 'dog, dig, bed',        tip: 'Tongue taps roof — voiced', confusesWith: ['t'] },
    'f':  { label: 'F Sound',     ipa: 'f',  examples: 'fun, fish, leaf',      tip: 'Top teeth on lower lip — blow air', confusesWith: ['v'] },
    'g':  { label: 'G Sound',     ipa: 'g',  examples: 'go, big, frog',        tip: 'Back of throat — voiced (hard G)', confusesWith: ['k'] },
    'h':  { label: 'H Sound',     ipa: 'h',  examples: 'hat, hot, hill',       tip: 'Just a breath of air — lightest consonant', confusesWith: [] },
    'j':  { label: 'J Sound',     ipa: 'dʒ', examples: 'jump, judge, gem',     tip: 'Like CH but with voice — vibrating', confusesWith: ['ch'] },
    'k':  { label: 'K Sound',     ipa: 'k',  examples: 'kite, kick, lake',     tip: 'Back of tongue hits roof — unvoiced', confusesWith: ['g', 'c'] },
    'l':  { label: 'L Sound',     ipa: 'l',  examples: 'leg, lamp, bell',      tip: 'Tongue tip touches ridge behind teeth', confusesWith: ['r'] },
    'm':  { label: 'M Sound',     ipa: 'm',  examples: 'man, map, swim',       tip: 'Lips together — hum through nose', confusesWith: ['n'] },
    'n':  { label: 'N Sound',     ipa: 'n',  examples: 'net, no, fun',         tip: 'Tongue on ridge — hum through nose', confusesWith: ['m', 'ng'] },
    'p':  { label: 'P Sound',     ipa: 'p',  examples: 'pet, pop, map',        tip: 'Lips pop — unvoiced (no buzz)', confusesWith: ['b'] },
    'q':  { label: 'QU Sound',    ipa: 'kw', examples: 'queen, quick, quiet',  tip: 'Always paired with U — really K+W together', confusesWith: ['k'] },
    'r':  { label: 'R Sound',     ipa: 'r',  examples: 'red, run, car',        tip: 'Tongue curls back — does not touch roof', confusesWith: ['l', 'w'] },
    's':  { label: 'S Sound',     ipa: 's',  examples: 'sun, sit, bus',        tip: 'Snake hiss — tongue behind teeth', confusesWith: ['z'] },
    't':  { label: 'T Sound',     ipa: 't',  examples: 'top, ten, cat',        tip: 'Tongue taps roof — unvoiced', confusesWith: ['d'] },
    'v':  { label: 'V Sound',     ipa: 'v',  examples: 'van, very, love',      tip: 'Top teeth on lower lip + voice', confusesWith: ['f'] },
    'w':  { label: 'W Sound',     ipa: 'w',  examples: 'wet, swim, wow',       tip: 'Round lips like kissing — voiced', confusesWith: ['wh'] },
    'y':  { label: 'Y Sound',     ipa: 'j',  examples: 'yes, yet, you',        tip: 'Consonant Y — tongue high in mouth', confusesWith: [] },
    'z':  { label: 'Z Sound',     ipa: 'z',  examples: 'zoo, buzz, nose',      tip: 'Buzzing S — add voice', confusesWith: ['s'] },
};
const normalizePhoneme = (p, defaultGrapheme = null) => {
    if (!p) return { ipa: '', grapheme: '' };
    if (typeof p === 'object' && p.ipa) {
        return { ipa: p.ipa, grapheme: p.grapheme || p.ipa };
    }
    const grapheme = String(p).toLowerCase().trim();
    const GRAPHEME_TO_IPA = {
        'ng': 'ŋ', 'sh': 'ʃ', 'ch': 'tʃ', 'th': 'θ',
        'dh': 'ð', 'zh': 'ʒ', 'aw': 'ɔ', 'or': 'ɔr',
        'ee': 'i', 'oo': 'u', 'wh': 'w',
        'ā': 'eɪ', 'ē': 'i', 'ī': 'aɪ', 'ō': 'oʊ', 'ū': 'u',
        'ar': 'ɑr', 'er': 'ɛr', 'ir': 'ɛr', 'ur': 'ɛr',
    };
    const ipa = GRAPHEME_TO_IPA[grapheme] || grapheme;
    return { ipa, grapheme: defaultGrapheme || grapheme };
};
    const addPhoneme = (wordIdx, phoneme) => {
        const word = preloadedWords[wordIdx];
        const newPhonemes = [...(word.phonemes || []), phoneme];
        onUpdateWord(wordIdx, { ...word, phonemes: newPhonemes });
    };
    const removePhoneme = (wordIdx, phonemeIdx) => {
        const word = preloadedWords[wordIdx];
        const newPhonemes = (word.phonemes || []).filter((_, i) => i !== phonemeIdx);
        onUpdateWord(wordIdx, { ...word, phonemes: newPhonemes });
    };
    const handlePhonemeReorder = (wordIdx, fromIndex, toIndex) => {
        const word = preloadedWords[wordIdx];
        const phonemes = [...(word.phonemes || [])];
        const [moved] = phonemes.splice(fromIndex, 1);
        phonemes.splice(toIndex, 0, moved);
        onUpdateWord(wordIdx, { ...word, phonemes });
    };
    const handleDragStart = (e, phoneme, sourceType, sourceWordIdx = null, sourcePhonemeIdx = null) => {
        e.dataTransfer.effectAllowed = 'copyMove';
        setDraggedPhoneme({ phoneme, sourceType, sourceWordIdx, sourcePhonemeIdx });
    };
    const handleDragOver = (e, targetIdx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOverIndex(targetIdx);
    };
    const handleDrop = (e, wordIdx, dropPosition = null) => {
        e.preventDefault();
        if (!draggedPhoneme) return;
        const { phoneme, sourceType, sourceWordIdx, sourcePhonemeIdx } = draggedPhoneme;
        if (sourceType === 'bank') {
            if (dropPosition !== null) {
                const word = preloadedWords[wordIdx];
                const currentPhonemes = Array.isArray(word.phonemes) ? [...word.phonemes] : [];
                if (dropPosition >= 0 && dropPosition < currentPhonemes.length) {
                    currentPhonemes[dropPosition] = phoneme;
                    onUpdateWord(wordIdx, { ...word, phonemes: currentPhonemes });
                }
            } else {
                addPhoneme(wordIdx, phoneme);
            }
        } else if (sourceType === 'word' && sourceWordIdx === wordIdx && dropPosition !== null) {
            handlePhonemeReorder(wordIdx, sourcePhonemeIdx, dropPosition);
        }
        setDraggedPhoneme(null);
        setDragOverIndex(null);
    };
    const handleDragEnd = () => {
        setDraggedPhoneme(null);
        setDragOverIndex(null);
    };
    const moveWord = (index, direction) => {
        if (!onReorderWords) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= preloadedWords.length) return;
        const newList = [...preloadedWords];
        const [removed] = newList.splice(index, 1);
        newList.splice(newIndex, 0, removed);
        onReorderWords(newList);
        setExpandedIndex(null);
    };
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b bg-gradient-to-r from-pink-500 to-violet-500 text-white flex-shrink-0">
                    <h2 className="text-2xl font-black flex items-center gap-2">📋 Pre-Activity Review
                        <span className="relative group ml-2">
                            <span className="cursor-help text-white/70 hover:text-white text-base">ℹ️</span>
                            <div className="absolute left-0 top-8 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                <strong className="block mb-1">📖 Phonics Counting Guide</strong>
                                <p className="mb-2">R-controlled vowels (ar, er, ir, or, ur) are counted as <strong>single sounds</strong> because the vowel and R blend together.</p>
                                <p className="text-slate-500">Example: "star" = 3 sounds (s-t-ar), not 4. This aligns with Orton-Gillingham and Wilson Reading methods.</p>
                            </div>
                        </span>
                    </h2>
                    <p className="text-sm opacity-80 mt-1 flex items-center gap-2">
                        <span>Review and edit words • {preloadedWords.length} words ready</span>
                        {isLoading && <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs animate-pulse"><div className="w-2 h-2 bg-white rounded-full animate-bounce"/> Generating more...</span>}
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {preloadedWords.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <div className="text-4xl mb-2">⏳</div>
                            {isLoading ? <p className="animate-pulse">Generating new words... this may take a moment</p> : <p>No words preloaded yet. Start the activity to generate words.</p>}
                        </div>
                    ) : (
                        (preloadedWords || []).map((word, idx) => (
                            <div
                                key={word.id || `word-${word.targetWord || word.word}-${idx}`}
                                className={`border-2 rounded-2xl transition-all ${expandedIndex === idx ? 'border-pink-300 bg-pink-50/50' : 'border-slate-100 hover:border-pink-200'}`}
                            >
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative z-50">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    if (regeneratingIndex !== null) {
                                                        debugLog("⏳ Already regenerating, ignoring click");
                                                        return;
                                                    }
                                                    debugLog("🔄 FORCE CLICK regen idx:", idx);
                                                    if (typeof onRegenerateWord === 'function') {
                                                        debugLog("✅ Calling onRegenerateWord for idx:", idx);
                                                        onRegenerateWord(idx);
                                                    } else {
                                                        warnLog("❌ onRegenerateWord is not a function:", typeof onRegenerateWord);
                                                        alert("Error: Regenerate function missing or invalid");
                                                    }
                                                }}
                                                disabled={regeneratingIndex === idx}
                                                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors text-base font-bold border-2
                                                    ${regeneratingIndex === idx
                                                        ? 'bg-orange-200 border-orange-400 animate-spin text-orange-700'
                                                        : 'bg-orange-50 border-orange-200 text-orange-500 hover:bg-orange-100 hover:border-orange-300 hover:scale-110 shadow-sm'
                                                    }`}
                                                data-help-key="word_sounds_review_regen_word" title={t('common.regenerate_this_word')}
                                                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                                            >
                                                {regeneratingIndex === idx ? '⏳' : '🔄'}
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                aria-label={t('common.move_up')}
                                                onClick={(e) => { e.stopPropagation(); moveWord(idx, 'up'); }}
                                                disabled={idx === 0}
                                                className={`w-6 h-6 flex items-center justify-center rounded text-xs ${idx === 0 ? 'text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-600'}`}
                                                data-help-key="word_sounds_review_move_word" title={t('common.move_up')}
                                            >▲</button>
                                            <button
                                                aria-label={t('common.move_down')}
                                                onClick={(e) => { e.stopPropagation(); moveWord(idx, 'down'); }}
                                                disabled={idx === preloadedWords.length - 1}
                                                className={`w-6 h-6 flex items-center justify-center rounded text-xs ${idx === preloadedWords.length - 1 ? 'text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-600'}`}
                                                data-help-key="word_sounds_review_move_word" title={t('common.move_down')}
                                            >▼</button>
                                        </div>
                                        <div className="relative z-50" style={{ pointerEvents: 'auto' }}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    e.nativeEvent.stopImmediatePropagation();
                                                    debugLog("🗑️ DELETE pressed for idx:", idx);
                                                    if (typeof onDeleteWord === 'function') {
                                                        onDeleteWord(idx);
                                                        debugLog("✅ Called onDeleteWord for idx:", idx);
                                                    } else {
                                                        warnLog("❌ onDeleteWord is not a function");
                                                    }
                                                    return false;
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    return false;
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors border-2 border-red-200 hover:border-red-400"
                                                style={{ pointerEvents: 'auto', cursor: 'pointer', position: 'relative', zIndex: 100 }}
                                                data-help-key="word_sounds_review_delete_word" title={t('common.delete_word')}
                                            >🗑️</button>
                                        </div>
                                        <span className="text-xs font-mono text-slate-500 w-6">{idx + 1}.</span>
                                        <button data-help-key="word_sounds_review_play_word"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!onPlayAudio || playingWordIndex !== null) return;
                                                setPlayingWordIndex(idx);
                                                try {
                                                    const timeoutPromise = new Promise((_, reject) =>
                                                        setTimeout(() => reject(new Error('Audio timeout')), 5000)
                                                    );
                                                    await Promise.race([
                                                        onPlayAudio(word.targetWord || word.word),
                                                        timeoutPromise
                                                    ]);
                                                } catch (e) {
                                                    warnLog('Play audio error or timeout:', e);
                                                } finally {
                                                    setPlayingWordIndex(null);
                                                }
                                            }}
                                            disabled={playingWordIndex !== null || !word.ttsReady}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                                playingWordIndex === idx
                                                    ? 'bg-pink-200 text-pink-700 animate-pulse'
                                                    : playingWordIndex !== null
                                                        ? 'bg-pink-50 text-pink-300 cursor-not-allowed'
                                                        : 'bg-pink-100 hover:bg-pink-200 text-pink-600'
                                            }`}
                                            title={playingWordIndex === idx ? "Playing..." : !word.ttsReady ? "Loading audio..." : "Play word"}
                                        >
                                            {playingWordIndex === idx ? <RefreshCw size={18} className="animate-spin" /> : <Volume2 size={18} />}
                                        </button>
                                        {word.phonemes && Array.isArray(word.phonemes) && word.phonemes.length > 0 && (
                                            <button
                                                aria-label={t('common.play_phoneme_sequence')}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (onPlayAudio) {
                                                        const seqId = Date.now();
                                                        window._currentPhonemeSeqId = seqId;
                                                        for (const phoneme of word.phonemes) {
                                                            if (window._currentPhonemeSeqId !== seqId) {
                                                                debugLog('Phoneme sequence cancelled');
                                                                break;
                                                            }
                                                            await onPlayAudio(phoneme);
                                                            await new Promise(r => setTimeout(r, 900));
                                                        }
                                                    }
                                                }}
                                                className="w-10 h-10 bg-violet-100 hover:bg-violet-200 text-violet-600 rounded-full flex items-center justify-center transition-colors"
                                                data-help-key="word_sounds_review_play_phonemes" title={t('common.play_phoneme_sequence')}
                                            >
                                                <span className="text-sm font-bold">🔤</span>
                                            </button>
                                        )}
                                        <div role="button" tabIndex={0} className="relative group/img" onClick={(e) => e.stopPropagation()}>
                                            {word.image && !word.imageFailed ? (
                                                <div className="relative">
                                                    <img loading="lazy"
                                                        src={word.image}
                                                        alt={word.targetWord || word.word}
                                                        className="w-12 h-12 rounded-lg object-cover border-2 border-indigo-200 shadow-sm"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerHTML = '<span class="text-red-400 text-xs">⚠️ Error</span>';
                                                        }}
                                                    />
                                                    <button
                                                        aria-label={t('common.regenerate_image')}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onGenerateImage && onGenerateImage(idx, word.targetWord || word.word);
                                                        }}
                                                        disabled={generatingImageIndex === idx}
                                                        className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity border border-indigo-200"
                                                        data-help-key="word_sounds_review_image_gen" title={t('common.regenerate_image')}
                                                    >
                                                        {generatingImageIndex === idx ? <RefreshCw size={10} className="animate-spin text-indigo-500"/> : <RefreshCw size={10} className="text-indigo-500"/>}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    aria-label={t('common.generate_image_for_this_word')}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onGenerateImage && onGenerateImage(idx, word.targetWord || word.word);
                                                    }}
                                                    disabled={generatingImageIndex === idx}
                                                    className={`px-3 py-2 rounded-lg border-2 flex items-center gap-2 text-sm font-bold transition-all ${
                                                        generatingImageIndex === idx
                                                            ? 'border-indigo-400 bg-indigo-100 text-indigo-600 animate-pulse'
                                                            : 'border-dashed border-indigo-300 text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 hover:scale-105'
                                                    }`}
                                                    data-help-key="word_sounds_review_image_gen" title={t('common.generate_image_for_this_word')}
                                                >
                                                    {generatingImageIndex === idx ? (
                                                        <><RefreshCw size={16} className="animate-spin"/> Generating...</>
                                                    ) : (
                                                        <><ImageIcon size={16}/> + Image</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-xl font-bold text-slate-800">{word.targetWord || word.word}</span>
                                        <select aria-label={t('common.selection')}
                                            value={word.difficulty || 'medium'}
                                            role="dialog" onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => onUpdateWord(idx, { ...word, difficulty: e.target.value })}
                                            className={`text-xs font-bold px-2 py-1 rounded-full border cursor-pointer appearance-none ${
                                                word.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-300' :
                                                word.difficulty === 'hard' ? 'bg-red-100 text-red-700 border-red-300' :
                                                'bg-yellow-100 text-yellow-700 border-yellow-300'
                                            }`}
                                        >
                                            <option value="easy">🟢 Easy</option>
                                            <option value="medium">🟡 Medium</option>
                                            <option value="hard">🔴 Hard</option>
                                        </select>
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                                            {word.phonemes?.length || 0} sounds
                                        </span>
                                    </div>
                                    <ChevronDown size={20} className={`text-slate-500 transition-transform ${expandedIndex === idx ? 'rotate-180' : ''}`} />
                                </div>
                                {expandedIndex === idx && (
                                    <div className="border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('word_sounds.phonemes')}</label>
                                                    <button
                                                        onClick={() => onRegenerateWord && onRegenerateWord(idx)}
                                                        disabled={regeneratingIndex === idx}
                                                        className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold transition-colors ${regeneratingIndex === idx ? 'bg-slate-100 text-slate-500' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
                                                        title="Re-check phonemes with Gemini"
                                                    >
                                                        {regeneratingIndex === idx ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : '✨'}
                                                        Check
                                                    </button>
                                                </div>
                                                </div>
                                                <button
                                                    data-help-key="word_sounds_review_phoneme_bank" onClick={() => setShowPhonemeBank(showPhonemeBank === idx ? null : idx)}
                                                    className={`text-xs px-2 py-1 rounded-full transition-colors ${showPhonemeBank === idx ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}`}
                                                >
                                                    {showPhonemeBank === idx ? '✕ Close Bank' : '+ Add Sound'}
                                                </button>
                                            </div>
                                            <div
                                                className={`flex flex-wrap gap-2 mb-2 min-h-[40px] p-2 rounded-lg border-2 border-dashed transition-colors ${draggedPhoneme ? 'border-pink-300 bg-pink-50' : 'border-transparent'}`}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleDrop(e, idx)}
                                            >
                                                {(Array.isArray(word.phonemes) ? word.phonemes : []).map((p, i) => (
                                                    <div
                                                        key={i}
                                                        className={`group relative cursor-grab active:cursor-grabbing ${dragOverIndex === i ? 'ring-2 ring-pink-400' : ''}`}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, p, 'word', idx, i)}
                                                        onDragOver={(e) => handleDragOver(e, i)}
                                                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, idx, i); }}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-100 to-violet-100 text-violet-700 font-bold rounded-lg border-2 border-violet-200" title={typeof p === "string" && typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : (typeof p === "string" ? p : "")}>
                                                            <span className="text-slate-500 text-xs mr-1">⠿</span>
                                                            {p}
                                                            <button
                                                                aria-label={t('common.remove')}
                                                                onClick={() => removePhoneme(idx, i)}
                                                                className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title={t('common.remove')}
                                                            >×</button>
                                                        </span>
                                                    </div>
                                                ))}
                                                {((() => { const p = word.phonemes; const a = Array.isArray(p) ? p : (p?.phonemes && Array.isArray(p.phonemes)) ? p.phonemes : []; return a.length === 0; })()) && (
                                                    <span className="text-slate-500 text-sm italic">No phonemes - click "Add Sound" to build</span>
                                                )}
                                            </div>
                                            {showPhonemeBank === idx && (
                                                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mt-2 animate-in slide-in-from-top-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs text-slate-500 italic">💡 Hover any sound for teaching tips</span>
                                                    </div>
                                                    {Object.entries(PHONEME_BANK).map(([category, phonemes]) => (
                                                        <div key={category} className="mb-3">
                                                            <div className="text-xs font-bold text-slate-500 uppercase mb-1" title={
                                                                category === 'Consonants' ? 'Single consonant sounds — pair voiced (b,d,g) with unvoiced (p,t,k)' :
                                                                category === 'Vowels (Short)' ? 'Quick vowel sounds — cat, pet, sit, hot, cup, book' :
                                                                category === 'Vowels (Long)' ? 'Longer vowel sounds — see, moon, cue, saw + vowel teams ai, ea, oa' :
                                                                category === 'Digraphs' ? 'Two letters that make ONE sound — sh, ch, th, wh, ng' :
                                                                category === 'R-Controlled' ? 'Bossy R changes the vowel sound — ar, er, ir, or, ur, air, ear' :
                                                                category === 'Diphthongs' ? 'Vowel sounds that glide — ay (day), ie (tie), ow (cow), oy (boy)' :
                                                                category
                                                            }>{category}</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {(Array.isArray(phonemes) ? phonemes : []).map(p => (
                                                                    <div key={p} className="inline-flex rounded overflow-hidden border border-slate-300 hover:border-pink-400 transition-colors">
                                                                        <button
                                                                            onClick={() => onPlayAudio && onPlayAudio(p)}
                                                                            className="px-1.5 py-1 bg-slate-100 hover:bg-pink-200 text-slate-500 hover:text-pink-600 transition-colors border-r border-slate-300"
                                                                            title={typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[p] ? `🔊 ${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : `Play sound: ${p}`}
                                                                        >🔊</button>
                                                                        <button
                                                                            onClick={() => addPhoneme(idx, p)}
                                                                            draggable
                                                                            onDragStart={(e) => handleDragStart(e, p, 'bank')}
                                                                            onDragEnd={handleDragEnd}
                                                                            className="px-2 py-1 bg-white hover:bg-pink-100 text-sm font-mono transition-colors cursor-grab active:cursor-grabbing"
                                                                            title={typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label}: ${PHONEME_GUIDE[p].tip}${PHONEME_GUIDE[p].confusesWith?.length ? '\n⚠️ Often confused with: ' + PHONEME_GUIDE[p].confusesWith.join(', ') : ''}` : `Click or drag to add "${p}"`}
                                                                        >{p === 'oo_short' ? 'ŏŏ' : p}</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2 block">{t('word_sounds.rhyme_options')}</label>
                                                <div className="flex flex-wrap gap-2">
                                                    <input aria-label={t('common.rhyme_time_options')}
                                                        value={word.rhymeWord || ''}
                                                        onChange={(e) => onUpdateWord(idx, { ...word, rhymeWord: e.target.value })}
                                                        className="px-3 py-1.5 font-bold border-2 border-green-300 bg-green-50 rounded-lg focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-300"
                                                        data-help-key="word_sounds_review_distractor_input" placeholder={t('common.placeholder_correct_rhyme')}
                                                    />
                                                    {(word.rhymeDistractors || []).map((d, i) => (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <input aria-label={t('common.enter_d')}
                                                                value={d}
                                                                onChange={(e) => {
                                                                    const newDist = [...(word.rhymeDistractors || [])];
                                                                    newDist[i] = e.target.value;
                                                                    onUpdateWord(idx, { ...word, rhymeDistractors: newDist });
                                                                }}
                                                                className="flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
                                                                data-help-key="word_sounds_review_distractor_input" placeholder={t('common.placeholder_distractor')}
                                                            />
                                                            <button
                                                                aria-label={t('common.play_tts')}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const key = `${idx}-rhyme-${i}`;
                                                                    if (playingAudioKey) return;
                                                                    setPlayingAudioKey(key);
                                                                    try { await onPlayAudio(d); } finally { setPlayingAudioKey(null); }
                                                                }}
                                                                className="p-2 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-500 hover:text-orange-600 transition-colors min-w-[32px] flex justify-center"
                                                                data-help-key="word_sounds_review_play_distractor" title={t('common.play_tts')}
                                                            >
                                                                {playingAudioKey === `${idx}-rhyme-${i}` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                            </button>
                                                            <button
                                                                aria-label={t('common.regenerate_this_option')}
                                                                onClick={async () => {
                                                                    if (onRegenerateOption) {
                                                                        const key = `${idx}-rhyme-${i}`;
                                                                        setRegeneratingOptions(prev => ({ ...prev, [key]: true }));
                                                                        await onRegenerateOption(idx, 'rhymeDistractors', i, d);
                                                                        setRegeneratingOptions(prev => { const n = {...prev}; delete n[key]; return n; });
                                                                    }
                                                                }}
                                                                className="w-8 h-8 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center"
                                                                title={t('common.regenerate_this_option')}
                                                            >
                                                                {regeneratingOptions[`${idx}-rhyme-${i}`] ? <RefreshCw size={14} className="animate-spin" /> : '🔄'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newDist = [...(word.rhymeDistractors || []), ''];
                                                            onUpdateWord(idx, { ...word, rhymeDistractors: newDist });
                                                        }}
                                                        className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg border-2 border-dashed border-orange-300 hover:bg-orange-200 text-sm font-bold"
                                                    >+ Add</button>
                                                </div>
                                            </div>
                                        <div>
                                            <label className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2 block">{t('word_sounds.blend_options')}</label>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-3 py-1.5 font-bold bg-green-100 text-green-700 rounded-lg border-2 border-green-300">
                                                        {word.targetWord || word.word} ✓
                                                    </span>
                                                    {(word.blendingDistractors || []).map((d, i) => (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <input aria-label={t('common.enter_d')}
                                                                value={d}
                                                                onChange={(e) => {
                                                                    const newDist = [...word.blendingDistractors];
                                                                    newDist[i] = e.target.value;
                                                                    onUpdateWord(idx, { ...word, blendingDistractors: newDist });
                                                                }}
                                                                className="flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                                                            />
                                                            <button
                                                                aria-label={t('common.play_tts')}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const key = `${idx}-blend-${i}`;
                                                                    if (playingAudioKey) return;
                                                                    setPlayingAudioKey(key);
                                                                    try { await onPlayAudio(d); } finally { setPlayingAudioKey(null); }
                                                                }}
                                                                className="p-2 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-500 hover:text-violet-600 transition-colors min-w-[32px] flex justify-center"
                                                                data-help-key="word_sounds_review_play_distractor" title={t('common.play_tts')}
                                                            >
                                                                {playingAudioKey === `${idx}-blend-${i}` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                            </button>
                                                            <button
                                                                aria-label={t('common.regenerate_this_option')}
                                                                onClick={async () => {
                                                                    if (onRegenerateOption) {
                                                                        const key = `${idx}-blend-${i}`;
                                                                        setRegeneratingOptions(prev => ({ ...prev, [key]: true }));
                                                                        await onRegenerateOption(idx, 'blendingDistractors', i, d);
                                                                        setRegeneratingOptions(prev => { const n = {...prev}; delete n[key]; return n; });
                                                                    }
                                                                }}
                                                                className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center"
                                                                title={t('common.regenerate_this_option')}
                                                            >
                                                                {regeneratingOptions[`${idx}-blend-${i}`] ? <RefreshCw size={14} className="animate-spin" /> : '🔄'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newDist = [...(word.blendingDistractors || []), ''];
                                                            onUpdateWord(idx, { ...word, blendingDistractors: newDist });
                                                        }}
                                                        className="px-3 py-1.5 bg-violet-100 text-violet-600 rounded-lg border-2 border-dashed border-violet-300 hover:bg-violet-200 text-sm font-bold"
                                                    >+ Add</button>
                                                </div>
                                            </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sound Positions (Find Sounds Activity)</label>
                                            <div className="flex flex-wrap gap-2">
                                                {(() => {
                                                    const phonemesRaw = word.phonemes;
                                                    const phonemeArray = Array.isArray(phonemesRaw) ? phonemesRaw : (phonemesRaw?.phonemes && Array.isArray(phonemesRaw.phonemes)) ? phonemesRaw.phonemes : [];
                                                    return phonemeArray;
                                                })().map((phoneme, soundIdx) => {
                                                    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
                                                    const ordinalLabel = ordinals[soundIdx] || `${soundIdx + 1}th`;
                                                    return (
                                                        <div key={soundIdx} className="flex items-center gap-1 bg-gradient-to-r from-violet-50 to-pink-50 border-2 border-violet-200 rounded-lg px-2 py-1">
                                                            <span className="text-xs font-bold text-slate-500">{ordinalLabel}:</span>
                                                            <span className="font-bold text-violet-700 text-lg">{phoneme}</span>
                                                        </div>
                                                    );
                                                })}
                                                {(!word.phonemes || word.phonemes.length === 0) && (
                                                    <span className="text-slate-500 text-sm italic">{t('word_sounds.no_phonemes')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                                <ImageIcon size={12} /> Word Image
                                            </label>
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0">
                                                    {word.image ? (
                                                        <img loading="lazy"
                                                            src={word.image}
                                                            alt={word.targetWord || word.word}
                                                            className="w-24 h-24 rounded-xl object-cover border-2 border-indigo-200 shadow-md"
                                                        />
                                                    ) : (
                                                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                                                            <ImageIcon size={32} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <button
                                                        aria-label={t('common.refresh')}
                                                        onClick={() => onGenerateImage && onGenerateImage(idx, word.targetWord || word.word)}
                                                        disabled={generatingImageIndex === idx}
                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                                                            word.image
                                                                ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 border border-indigo-200'
                                                                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md'
                                                        }`}
                                                    >
                                                        {generatingImageIndex === idx ? (
                                                            <><RefreshCw size={14} className="animate-spin"/> Generating...</>
                                                        ) : word.image ? (
                                                            <><RefreshCw size={14}/> Regenerate Image</>
                                                        ) : (
                                                            <><Sparkles size={14}/> Generate Image</>
                                                        )}
                                                    </button>
                                                    {word.image && (
                                                        <div className="space-y-2">
                                                            <button
                                                                onClick={() => onRefineImage && onRefineImage(idx, "Remove all text, labels, letters, and words from the image. Keep the illustration clean.")}
                                                                disabled={generatingImageIndex === idx}
                                                                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all"
                                                            >
                                                                <Ban size={12}/> Remove Text from Image
                                                            </button>
                                                            <div className="flex gap-1">
                                                                <input aria-label={t('common.e_g_make_it_cuter_add_a_banana')}
                                                                    type="text"
                                                                    value={imageRefinementInputs[idx] || ''}
                                                                    onChange={(e) => setImageRefinementInputs(prev => ({...prev, [idx]: e.target.value}))}
                                                                    placeholder="e.g., make it cuter, add a banana"
                                                                    className="flex-1 text-xs border border-yellow-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                                                    onKeyDown={(e) => e.key === 'Enter' && onRefineImage && imageRefinementInputs[idx] && onRefineImage(idx, imageRefinementInputs[idx])}
                                                                />
                                                                <button
                                                                    aria-label={t('common.refresh')}
                                                                    onClick={() => {
                                                                        if (onRefineImage && imageRefinementInputs[idx]) {
                                                                            onRefineImage(idx, imageRefinementInputs[idx]);
                                                                            setImageRefinementInputs(prev => ({...prev, [idx]: ''}));
                                                                        }
                                                                    }}
                                                                    disabled={!imageRefinementInputs[idx] || generatingImageIndex === idx}
                                                                    className="px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 font-bold text-xs transition-colors"
                                                                >
                                                                    {generatingImageIndex === idx ? <RefreshCw size={12} className="animate-spin"/> : <Send size={12}/>}
                                                                </button>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 italic">✨ Nano Mode: Type custom edits like "make it blue" or "add a hat"</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-between items-center flex-shrink-0">
                    <button
                        aria-label={t('common.previous')}
                        onClick={() => { if (isProbeMode && !window.confirm("End probe early? Progress will be lost.")) return; (onBackToSetup || onClose)?.(); }}
                        data-help-key="word_sounds_review_back" className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium flex items-center gap-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} />
                        Back to Setup
                    </button>
                    <div className="flex gap-3">
                        <button
                            aria-label={t('common.play')}
                            onClick={onStartActivity}
                            data-help-key="word_sounds_review_start" className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Play size={18} /> Start Activity
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
