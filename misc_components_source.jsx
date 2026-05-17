// misc_components_source.jsx — Miscellaneous React components CDN module
// Extracted from AlloFlowANTI.txt 2026-04-21 (v3 audit — Module E).
//
// Contents:
//   AnimatedNumber (36 lines) — RAF-based tween from displayed value to target
//   ClozeInput (76 lines) — fill-in-the-blank input with status state machine
//   WordSoundsReviewPanel (899 lines) — pre-activity review modal for Word Sounds
//     lessons incl. the Sound Swap phoneme manipulation feature (added in parallel
//     commit 22b0aeb). Props-driven, takes `t` as a prop (no LanguageContext).
//
// All three components are fully props-driven with no closures over
// AlloFlowContent state. WordSoundsReviewPanel is also consumed by
// word_sounds_module.js via window.WordSoundsReviewPanel — the registration
// footer below preserves that consumption path.
//
// Icons used in WSRP: Ban, ChevronDown, ChevronLeft, ImageIcon, Play,
// RefreshCw, Sparkles. ClozeInput uses LanguageContext for t().

const AnimatedNumber = ({ value, duration = 1000, disableAnimations = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(value);
  const animationFrameRef = useRef(null);
  useEffect(() => {
    if (disableAnimations) {
        setDisplayValue(value);
        return;
    }
    if (value === displayValue) return;
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      const ease = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
      const current = Math.round(startValueRef.current + (value - startValueRef.current) * ease(percentage));
      setDisplayValue(current);
      if (progress < duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
  }, [value, duration, disableAnimations]);
  return <>{displayValue}</>;
};

const ClozeInput = React.memo(({ targetWord, onCorrect, isSolved }) => {
  const { t } = useContext(LanguageContext);
  const [val, setVal] = useState(isSolved ? targetWord : '');
  const [status, setStatus] = useState(isSolved ? 'success' : 'neutral');
  useEffect(() => {
      if (isSolved) {
          setVal(targetWord);
          setStatus('success');
      } else {
          setVal('');
          setStatus('neutral');
      }
  }, [isSolved, targetWord]);
  const normalize = (str) => str ? str.toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '';
  const handleDrop = (e) => {
    e.preventDefault();
    if (status === 'success') return;
    const droppedText = e.dataTransfer.getData("text/plain");
    if (normalize(droppedText) === normalize(targetWord)) {
        setVal(targetWord);
        setStatus('success');
        if (onCorrect) onCorrect(targetWord);
    } else {
        setStatus('error');
        setTimeout(() => setStatus('neutral'), 800);
    }
  };
  const handleDragOver = (e) => {
      if (status !== 'success') {
          e.preventDefault();
          if(status !== 'active') setStatus('active');
      }
  };
  const handleDragLeave = () => {
      if (status === 'active') setStatus('neutral');
  };
  const handleChange = (e) => {
      if (status === 'success') return;
      const newVal = e.target.value;
      setVal(newVal);
      if (normalize(newVal) === normalize(targetWord)) {
          setStatus('success');
          if (onCorrect) onCorrect(targetWord);
      }
  };
  const width = Math.max(80, targetWord.length * 12) + 'px';
  return (
      <span
        className="inline-block mx-1 relative align-middle"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
          <input
              type="text"
              value={val}
              onChange={handleChange}
              readOnly={status === 'success'}
              className={`
                  text-center border-b-2 px-1 py-0.5 text-sm font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-400 rounded-t
                  ${status === 'success' ? 'border-green-500 bg-green-50 text-green-800' :
                    status === 'error' ? 'border-red-500 bg-red-50 animate-pulse' :
                    status === 'active' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' :
                    'border-indigo-300 bg-white focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200'}
              `}
              style={{ width }}
              placeholder="?"
              autoComplete="off"
              aria-label={t('games.fill_blank.input_label')}
          />
          {status === 'success' && (
              <span className="absolute -top-2 -right-2 text-green-500 bg-white rounded-full shadow-sm animate-in zoom-in duration-300"><CheckCircle2 size={16} className="fill-green-100"/></span>
          )}
      </span>
  );
});

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
    onRegenerateManipulationTask,
    onRegenerateAll,
    onRetryFailedTTS,
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
                    <h2 className="text-2xl font-black flex items-center gap-2">{t('word_sounds.pre_activity_review') || '📋 Pre-Activity Review'}
                        <span className="relative group ml-2">
                            <span className="cursor-help text-white/70 hover:text-white text-base">ℹ️</span>
                            <div className="absolute left-0 top-8 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 pointer-events-none">
                                <strong className="block mb-1">{t('word_sounds.phonics_counting_guide_title') || '📖 Phonics Counting Guide'}</strong>
                                <p className="mb-2">{t('word_sounds.r_controlled_explanation_prefix') || 'R-controlled vowels (ar, er, ir, or, ur) are counted as '}<strong>{t('word_sounds.single_sounds') || 'single sounds'}</strong>{t('word_sounds.r_controlled_explanation_suffix') || ' because the vowel and R blend together.'}</p>
                                <p className="text-slate-600">{t('word_sounds.r_controlled_example') || 'Example: "star" = 3 sounds (s-t-ar), not 4. This aligns with Orton-Gillingham and Wilson Reading methods.'}</p>
                            </div>
                        </span>
                    </h2>
                    <p className="text-sm opacity-80 mt-1 flex items-center gap-2 flex-wrap">
                        <span>{t('word_sounds.review_and_edit_words') || 'Review and edit words'} • {preloadedWords.length} {t('word_sounds.words_ready') || 'words ready'}</span>
                        {isLoading && <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs animate-pulse"><div className="w-2 h-2 bg-white rounded-full animate-bounce"/> {t('word_sounds.generating_more') || 'Generating more...'}</span>}
                        {!isLoading && preloadedWords.some(w => w && w._ttsFailed) && (
                            <span className="flex items-center gap-2 bg-red-500/30 border border-red-200/60 px-3 py-1 rounded-full text-xs">
                                <span>🔇 Audio missing for {preloadedWords.filter(w => w && w._ttsFailed).length} word{preloadedWords.filter(w => w && w._ttsFailed).length === 1 ? '' : 's'}</span>
                                {typeof onRetryFailedTTS === 'function' && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onRetryFailedTTS(); }}
                                        className="px-2 py-0.5 bg-white/90 hover:bg-white text-red-600 font-bold rounded-full text-xs"
                                        title={t('word_sounds.retry_audio_tooltip') || 'Retry audio generation for words that failed'}
                                    >{t('word_sounds.retry_audio') || 'Retry audio'}</button>
                                )}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {preloadedWords.length === 0 ? (
                        <div className="text-center py-12 text-slate-600">
                            <div className="text-4xl mb-2">⏳</div>
                            {isLoading ? <p className="animate-pulse">{t('word_sounds.generating_new_words') || 'Generating new words... this may take a moment'}</p> : <p>{t('word_sounds.no_words_preloaded') || 'No words preloaded yet. Start the activity to generate words.'}</p>}
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
                                                        if (window.AlloFlowUX) window.AlloFlowUX.toast("Error: Regenerate function missing or invalid", 'error'); else alert("Error: Regenerate function missing or invalid");
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
                                                className={`w-6 h-6 flex items-center justify-center rounded text-xs ${idx === 0 ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-600'}`}
                                                data-help-key="word_sounds_review_move_word" title={t('common.move_up')}
                                            >▲</button>
                                            <button
                                                aria-label={t('common.move_down')}
                                                onClick={(e) => { e.stopPropagation(); moveWord(idx, 'down'); }}
                                                disabled={idx === preloadedWords.length - 1}
                                                className={`w-6 h-6 flex items-center justify-center rounded text-xs ${idx === preloadedWords.length - 1 ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-600'}`}
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
                                        <span className="text-xs font-mono text-slate-600 w-6">{idx + 1}.</span>
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
                                                word._ttsFailed
                                                    ? 'bg-red-100 hover:bg-red-200 text-red-600 border-2 border-red-300'
                                                    : playingWordIndex === idx
                                                        ? 'bg-pink-200 text-pink-700 animate-pulse'
                                                        : playingWordIndex !== null
                                                            ? 'bg-pink-50 text-pink-300 cursor-not-allowed'
                                                            : 'bg-pink-100 hover:bg-pink-200 text-pink-600'
                                            }`}
                                            title={playingWordIndex === idx ? (t('word_sounds.playing') || 'Playing...') : word._ttsFailed ? (t('word_sounds.audio_failed_retry_hint') || 'Audio failed to generate — click Retry audio in header') : !word.ttsReady ? (t('word_sounds.loading_audio') || 'Loading audio...') : (t('word_sounds.play_word') || 'Play word')}
                                        >
                                            {word._ttsFailed ? '🔇' : (playingWordIndex === idx ? <RefreshCw size={18} className="animate-spin" /> : <Volume2 size={18} />)}
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
                                        <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); }}} className="relative group/img" onClick={(e) => e.stopPropagation()}>
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
                                                        <><RefreshCw size={16} className="animate-spin"/> {t('word_sounds.generating_image') || 'Generating...'}</>
                                                    ) : (
                                                        <><ImageIcon size={16}/> {t('word_sounds.add_image_button') || '+ Image'}</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-xl font-bold text-slate-800">{word.targetWord || word.word}</span>
                                        <select aria-label={t('common.selection')}
                                            value={word.difficulty || 'medium'}
                                            role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
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
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                                            {word.phonemes?.length || 0} sounds
                                        </span>
                                    </div>
                                    <ChevronDown size={20} className={`text-slate-600 transition-transform ${expandedIndex === idx ? 'rotate-180' : ''}`} />
                                </div>
                                {expandedIndex === idx && (
                                    <div className="border-t border-slate-100 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('word_sounds.phonemes')}</label>
                                                    <button
                                                        onClick={() => onRegenerateWord && onRegenerateWord(idx)}
                                                        disabled={regeneratingIndex === idx}
                                                        className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold transition-colors ${regeneratingIndex === idx ? 'bg-slate-100 text-slate-600' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}
                                                        title={t('word_sounds.recheck_phonemes_tooltip') || 'Re-check phonemes with Gemini'}
                                                    >
                                                        {regeneratingIndex === idx ? <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" /> : '✨'}
                                                        {t('word_sounds.recheck_phonemes_button') || 'Check'}
                                                    </button>
                                                </div>
                                                </div>
                                                <button
                                                    data-help-key="word_sounds_review_phoneme_bank" onClick={() => setShowPhonemeBank(showPhonemeBank === idx ? null : idx)}
                                                    className={`text-xs px-2 py-1 rounded-full transition-colors ${showPhonemeBank === idx ? 'bg-pink-700 text-white' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}`}
                                                >
                                                    {showPhonemeBank === idx ? (t('word_sounds.close_bank') || '✕ Close Bank') : (t('word_sounds.add_sound') || '+ Add Sound')}
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
                                                            <span className="text-slate-600 text-xs mr-1">⠿</span>
                                                            {p}
                                                            <button
                                                                aria-label={t('common.remove')}
                                                                onClick={() => removePhoneme(idx, i)}
                                                                className="w-4 h-4 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                                                title={t('common.remove')}
                                                            >×</button>
                                                        </span>
                                                    </div>
                                                ))}
                                                {((() => { const p = word.phonemes; const a = Array.isArray(p) ? p : (p?.phonemes && Array.isArray(p.phonemes)) ? p.phonemes : []; return a.length === 0; })()) && (
                                                    <span className="text-slate-600 text-sm italic">{t('word_sounds.no_phonemes_hint') || 'No phonemes - click "Add Sound" to build'}</span>
                                                )}
                                            </div>
                                            {showPhonemeBank === idx && (
                                                <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mt-2 animate-in slide-in-from-top-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs text-slate-600 italic">{t('word_sounds.phoneme_bank_hover_hint') || '💡 Hover any sound for teaching tips'}</span>
                                                    </div>
                                                    {Object.entries(PHONEME_BANK).map(([category, phonemes]) => (
                                                        <div key={category} className="mb-3">
                                                            <div className="text-xs font-bold text-slate-600 uppercase mb-1" title={
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
                                                                    <div key={p} className="inline-flex rounded overflow-hidden border border-slate-400 hover:border-pink-400 transition-colors">
                                                                        <button
                                                                            onClick={() => onPlayAudio && onPlayAudio(p)}
                                                                            className="px-1.5 py-1 bg-slate-100 hover:bg-pink-200 text-slate-600 hover:text-pink-600 transition-colors border-r border-slate-300"
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
                                                        className="px-3 py-1.5 font-bold border-2 border-green-300 bg-green-50 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-400 focus:ring-offset-1 outline-none"
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
                                                                className="flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 outline-none"
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
                                                                className="p-2 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-600 transition-colors min-w-[32px] flex justify-center"
                                                                data-help-key="word_sounds_review_play_distractor" title={t('common.play_tts')}
                                                            >
                                                                {playingAudioKey === `${idx}-rhyme-${i}` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                            </button>
                                                            <button
                                                                aria-label={t('word_sounds.refresh_audio') || 'Refresh audio'}
                                                                onClick={async () => {
                                                                    if (!onRegenerateOption) return;
                                                                    const key = `${idx}-rhyme-${i}`;
                                                                    setRegeneratingOptions(prev => ({ ...prev, [key]: true }));
                                                                    try {
                                                                        await onRegenerateOption(idx, 'rhymeDistractors', i, d);
                                                                    } finally {
                                                                        setRegeneratingOptions(prev => { const n = {...prev}; delete n[key]; return n; });
                                                                    }
                                                                }}
                                                                disabled={!!regeneratingOptions[`${idx}-rhyme-${i}`]}
                                                                className={`${regeneratingOptions[`${idx}-rhyme-${i}`] ? 'w-auto px-2 gap-1 bg-orange-200 text-orange-800' : 'w-8 bg-orange-50 hover:bg-orange-100 text-orange-400 hover:text-orange-600'} h-8 rounded-lg transition-colors flex items-center justify-center text-xs font-bold`}
                                                                title={t('word_sounds.refresh_audio_tooltip') || 'Refresh audio (re-synthesize TTS for this word)'}
                                                            >
                                                                {regeneratingOptions[`${idx}-rhyme-${i}`] ? (<><RefreshCw size={14} className="animate-spin" /><span>{t('word_sounds.refreshing') || 'Refreshing…'}</span></>) : '🔄'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newDist = [...(word.rhymeDistractors || []), ''];
                                                            onUpdateWord(idx, { ...word, rhymeDistractors: newDist });
                                                        }}
                                                        className="px-3 py-1.5 bg-orange-100 text-orange-600 rounded-lg border-2 border-dashed border-orange-300 hover:bg-orange-200 text-sm font-bold"
                                                    >{t('word_sounds.add_distractor') || '+ Add'}</button>
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
                                                                className="flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-violet-400 focus:ring-2 focus:ring-violet-300 focus:ring-offset-1 outline-none"
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
                                                                className="p-2 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-600 transition-colors min-w-[32px] flex justify-center"
                                                                data-help-key="word_sounds_review_play_distractor" title={t('common.play_tts')}
                                                            >
                                                                {playingAudioKey === `${idx}-blend-${i}` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                            </button>
                                                            <button
                                                                aria-label={t('word_sounds.refresh_audio') || 'Refresh audio'}
                                                                onClick={async () => {
                                                                    if (!onRegenerateOption) return;
                                                                    const key = `${idx}-blend-${i}`;
                                                                    setRegeneratingOptions(prev => ({ ...prev, [key]: true }));
                                                                    try {
                                                                        await onRegenerateOption(idx, 'blendingDistractors', i, d);
                                                                    } finally {
                                                                        setRegeneratingOptions(prev => { const n = {...prev}; delete n[key]; return n; });
                                                                    }
                                                                }}
                                                                disabled={!!regeneratingOptions[`${idx}-blend-${i}`]}
                                                                className={`${regeneratingOptions[`${idx}-blend-${i}`] ? 'w-auto px-2 gap-1 bg-violet-200 text-violet-800' : 'w-8 bg-violet-50 hover:bg-violet-100 text-violet-400 hover:text-violet-600'} h-8 rounded-lg transition-colors flex items-center justify-center text-xs font-bold`}
                                                                title={t('word_sounds.refresh_audio_tooltip') || 'Refresh audio (re-synthesize TTS for this word)'}
                                                            >
                                                                {regeneratingOptions[`${idx}-blend-${i}`] ? (<><RefreshCw size={14} className="animate-spin" /><span>{t('word_sounds.refreshing') || 'Refreshing…'}</span></>) : '🔄'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newDist = [...(word.blendingDistractors || []), ''];
                                                            onUpdateWord(idx, { ...word, blendingDistractors: newDist });
                                                        }}
                                                        className="px-3 py-1.5 bg-violet-100 text-violet-600 rounded-lg border-2 border-dashed border-violet-300 hover:bg-violet-200 text-sm font-bold"
                                                    >{t('word_sounds.add_distractor') || '+ Add'}</button>
                                                </div>
                                            </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-bold text-amber-600 uppercase tracking-wider block">{t('word_sounds.sound_swap_label') || 'Sound Swap (Manipulation Activity)'}</label>
                                                {word.manipulationTask?.type && (
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                                                        {word.manipulationTask.type}
                                                    </span>
                                                )}
                                            </div>
                                            {word.manipulationTask ? (
                                                <div className="space-y-2 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">{t('word_sounds.instruction_label') || 'Instruction (spoken to student)'}</label>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                aria-label={t('word_sounds.sound_swap_instruction_aria') || 'Sound Swap instruction'}
                                                                value={word.manipulationTask.instruction || ''}
                                                                onChange={(e) => onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, instruction: e.target.value } })}
                                                                className="flex-1 px-3 py-1.5 text-sm font-medium border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                                                                placeholder={t('word_sounds.sound_swap_instruction_placeholder') || "Say 'word'. Now say it again, but leave out the /x/ sound."}
                                                            />
                                                            <button
                                                                aria-label={t('word_sounds.preview_instruction_tts_aria') || 'Preview instruction TTS'}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const key = `${idx}-manip-instruction`;
                                                                    if (playingAudioKey) return;
                                                                    setPlayingAudioKey(key);
                                                                    try { await onPlayAudio(word.manipulationTask.instruction); } finally { setPlayingAudioKey(null); }
                                                                }}
                                                                className="p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors min-w-[32px] flex justify-center"
                                                                title={t('word_sounds.preview_instruction_tooltip') || 'Preview instruction'}
                                                            >
                                                                {playingAudioKey === `${idx}-manip-instruction` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">{t('word_sounds.answer_distractors_label') || 'Answer (correct) + Distractors'}</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    aria-label={t('word_sounds.correct_answer_aria') || 'Correct answer'}
                                                                    value={word.manipulationTask.answer || ''}
                                                                    onChange={(e) => onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, answer: e.target.value } })}
                                                                    className="px-3 py-1.5 font-bold border-2 border-green-300 bg-green-50 rounded-lg focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-300"
                                                                    placeholder={t('word_sounds.answer_placeholder') || 'answer'}
                                                                />
                                                                <button
                                                                    aria-label={t('word_sounds.preview_answer_aria') || 'Preview answer'}
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        const key = `${idx}-manip-answer`;
                                                                        if (playingAudioKey) return;
                                                                        setPlayingAudioKey(key);
                                                                        try { await onPlayAudio(word.manipulationTask.answer); } finally { setPlayingAudioKey(null); }
                                                                    }}
                                                                    className="p-2 rounded-lg bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-600 transition-colors min-w-[32px] flex justify-center"
                                                                    title={t('word_sounds.preview_answer_tooltip') || 'Preview answer'}
                                                                >
                                                                    {playingAudioKey === `${idx}-manip-answer` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                                </button>
                                                            </div>
                                                            {(word.manipulationTask.distractors || []).map((d, i) => (
                                                                <div key={i} className="flex items-center gap-1">
                                                                    <input
                                                                        aria-label={`Distractor ${i + 1}`}
                                                                        value={d}
                                                                        onChange={(e) => {
                                                                            const newDist = [...(word.manipulationTask.distractors || [])];
                                                                            newDist[i] = e.target.value;
                                                                            onUpdateWord(idx, { ...word, manipulationTask: { ...word.manipulationTask, distractors: newDist } });
                                                                        }}
                                                                        className="flex-1 px-3 py-1.5 font-medium border-2 border-slate-200 rounded-lg focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
                                                                        placeholder={t('word_sounds.distractor_placeholder') || 'distractor'}
                                                                    />
                                                                    <button
                                                                        aria-label={t('word_sounds.preview_distractor_aria') || 'Preview distractor'}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const key = `${idx}-manip-d-${i}`;
                                                                            if (playingAudioKey) return;
                                                                            setPlayingAudioKey(key);
                                                                            try { await onPlayAudio(d); } finally { setPlayingAudioKey(null); }
                                                                        }}
                                                                        className="p-2 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-600 transition-colors min-w-[32px] flex justify-center"
                                                                        title={t('word_sounds.preview_distractor_tooltip') || 'Preview distractor'}
                                                                    >
                                                                        {playingAudioKey === `${idx}-manip-d-${i}` ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : '🔊'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (onRegenerateManipulationTask) {
                                                                const key = `${idx}-manip-regen`;
                                                                setRegeneratingOptions(prev => ({ ...prev, [key]: true }));
                                                                try { await onRegenerateManipulationTask(idx); } finally {
                                                                    setRegeneratingOptions(prev => { const n = {...prev}; delete n[key]; return n; });
                                                                }
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 border-2 border-amber-300 rounded-lg text-sm font-bold transition-all"
                                                        title={t('word_sounds.regenerate_sound_swap_tooltip') || 'Generate a fresh Sound Swap task for this word'}
                                                    >
                                                        {regeneratingOptions[`${idx}-manip-regen`] ? <><RefreshCw size={14} className="animate-spin"/> {t('word_sounds.regenerating') || 'Regenerating…'}</> : <><RefreshCw size={14}/> {t('word_sounds.regenerate_task') || 'Regenerate Task'}</>}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-between gap-3">
                                                    <span className="text-sm text-slate-600 italic">{t('word_sounds.no_sound_swap_yet') || 'No Sound Swap task generated for this word yet.'}</span>
                                                    <button
                                                        onClick={async () => {
                                                            if (onRegenerateManipulationTask) {
                                                                const key = `${idx}-manip-regen`;
                                                                setRegeneratingOptions(prev => ({ ...prev, [key]: true }));
                                                                try { await onRegenerateManipulationTask(idx); } finally {
                                                                    setRegeneratingOptions(prev => { const n = {...prev}; delete n[key]; return n; });
                                                                }
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow"
                                                    >
                                                        {regeneratingOptions[`${idx}-manip-regen`] ? <><RefreshCw size={14} className="animate-spin"/> {t('word_sounds.generating') || 'Generating…'}</> : <><Sparkles size={14}/> {t('word_sounds.generate') || 'Generate'}</>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">{t('word_sounds.sound_positions_label') || 'Sound Positions (Find Sounds Activity)'}</label>
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
                                                            <span className="text-xs font-bold text-slate-600">{ordinalLabel}:</span>
                                                            <span className="font-bold text-violet-700 text-lg">{phoneme}</span>
                                                        </div>
                                                    );
                                                })}
                                                {(!word.phonemes || word.phonemes.length === 0) && (
                                                    <span className="text-slate-600 text-sm italic">{t('word_sounds.no_phonemes')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                                <ImageIcon size={12} /> {t('word_sounds.word_image_label') || 'Word Image'}
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
                                                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-600 bg-slate-50">
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
                                                            <><RefreshCw size={14} className="animate-spin"/> {t('word_sounds.generating_image') || 'Generating...'}</>
                                                        ) : word.image ? (
                                                            <><RefreshCw size={14}/> {t('word_sounds.regenerate_image_button') || 'Regenerate Image'}</>
                                                        ) : (
                                                            <><Sparkles size={14}/> {t('word_sounds.generate_image_button') || 'Generate Image'}</>
                                                        )}
                                                    </button>
                                                    {word.image && (
                                                        <div className="space-y-2">
                                                            <button
                                                                onClick={() => onRefineImage && onRefineImage(idx, "Remove all text, labels, letters, and words from the image. Keep the illustration clean.")}
                                                                disabled={generatingImageIndex === idx}
                                                                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-all"
                                                            >
                                                                <Ban size={12}/> {t('word_sounds.remove_text_from_image') || 'Remove Text from Image'}
                                                            </button>
                                                            <div className="flex gap-1">
                                                                <input aria-label={t('common.e_g_make_it_cuter_add_a_banana')}
                                                                    type="text"
                                                                    value={imageRefinementInputs[idx] || ''}
                                                                    onChange={(e) => setImageRefinementInputs(prev => ({...prev, [idx]: e.target.value}))}
                                                                    placeholder={t('word_sounds.image_refine_placeholder') || 'e.g., make it cuter, add a banana'}
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
                                                                    className="px-3 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs transition-colors"
                                                                >
                                                                    {generatingImageIndex === idx ? <RefreshCw size={12} className="animate-spin"/> : <Send size={12}/>}
                                                                </button>
                                                            </div>
                                                            <span className="text-[11px] text-slate-600 italic">{t('word_sounds.nano_mode_hint') || '✨ Nano Mode: Type custom edits like "make it blue" or "add a hat"'}</span>
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
                        {t('word_sounds.back_to_setup') || 'Back to Setup'}
                    </button>
                    <div className="flex gap-3">
                        <button
                            aria-label={t('common.play')}
                            onClick={onStartActivity}
                            data-help-key="word_sounds_review_start" className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Play size={18} /> {t('word_sounds.start_activity') || 'Start Activity'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Registration ───────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.AnimatedNumber = AnimatedNumber;
window.AlloModules.ClozeInput = ClozeInput;
window.AlloModules.WordSoundsReviewPanel = WordSoundsReviewPanel;
// Preserve existing consumption path for word_sounds_module.js.
window.WordSoundsReviewPanel = WordSoundsReviewPanel;
console.log('[MiscComponentsModule] 3 components registered.');
