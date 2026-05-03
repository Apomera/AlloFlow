// Fisher-Yates shuffle used by the unscramble game. Recurses if shuffle produces the same word.
var scrambleWord = function(word) {
  if (!word || word.length < 2) return word;
  var arr = word.split('');
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  var result = arr.join('');
  return result === word ? scrambleWord(word) : result;
};

const useReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// ── TTS utility for read-aloud accessibility ──
// TTS priority: Gemini (selected voice) → Kokoro → Browser fallback
let _speakAudio = null;
const speakText = (text) => {
  if (!text) return;
  const str = String(text);
  try {
    if (_speakAudio) { try { _speakAudio.pause(); _speakAudio = null; } catch(e) {} }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // ── Priority 1: Gemini TTS (uses selected voice from app settings) ──
    if (window.__alloCallTTS && typeof window.__alloCallTTS === 'function') {
      const voice = window.__alloSelectedVoice || 'Kore';
      window.__alloCallTTS(str, voice, 1).then((url) => {
        if (url) {
          _speakAudio = new Audio(url);
          _speakAudio.playbackRate = 0.95;
          _speakAudio.play().catch(() => {});
        } else { _kokoroFallback(str); }
      }).catch(() => _kokoroFallback(str));
      return;
    }
    // ── Priority 2: Kokoro ──
    _kokoroFallback(str);
  } catch (e) { console.warn('TTS failed', e); }
};
const _kokoroFallback = (str) => {
  if (window._kokoroTTS && typeof window._kokoroTTS.speak === 'function') {
    const voice = window.__alloSelectedVoice || 'af_heart';
    window._kokoroTTS.speak(str, voice, 1).then((url) => {
      if (url) {
        _speakAudio = new Audio(url);
        _speakAudio.playbackRate = 0.95;
        _speakAudio.play().catch(() => {});
      } else { _browserTTSFallback(str); }
    }).catch(() => _browserTTSFallback(str));
    return;
  }
  _browserTTSFallback(str);
};
const _browserTTSFallback = (text) => {
  if (window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
};

// ── Theme toggle for game headers ──
const GameThemeToggle = () => {
  let isDark = false, isContrast = false;
  try { isDark = !!document.querySelector('.theme-dark'); isContrast = !!document.querySelector('.theme-contrast'); } catch(e) {}
  return (
    <button
      onClick={() => { if (typeof window.AlloToggleTheme === 'function') window.AlloToggleTheme(); }}
      className="p-2 hover:bg-white/20 rounded-full transition-colors flex items-center gap-1 text-white"
      aria-label="Toggle theme (light / dark / high contrast)"
      title={isContrast ? 'High Contrast' : isDark ? 'Dark Mode' : 'Light Mode'}
      type="button"
    >
      <span>{isContrast ? '\uD83D\uDC41' : isDark ? '\uD83C\uDF19' : '\u2600\uFE0F'}</span>
      <span className="text-[11px] font-bold">{isContrast ? 'Hi-Con' : isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
};

const SpeakButton = ({ text, size = 13, className = "" }) => (
  <button
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); speakText(text); }}
    className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${className}`}
    aria-label={`Read aloud: ${text || ""}`}
    title="Read aloud"
    type="button"
  >
    <Volume2 size={size} />
  </button>
);

// ── Post-game review screen ──
const GameReviewScreen = ({ score, title, items, onPlayAgain, onClose, t }) => {
  const correct = items.filter(i => i.status === 'correct').length;
  const total = items.length;
  return (
    <div className="mt-4 bg-white rounded-2xl border-2 border-indigo-100 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white text-center">
        <h3 className="text-xl font-black">{title || "Review"}</h3>
        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{score} pts</span>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">{correct}/{total} correct</span>
        </div>
      </div>
      <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-3">
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
              item.status === 'correct' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                item.status === 'correct' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
              }`}>
                {item.status === 'correct' ? '\u2713' : '\u2717'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-800 truncate">{item.label}</div>
                {item.detail && <div className="text-xs text-slate-600 truncate">{item.detail}</div>}
              </div>
              <SpeakButton text={item.label} size={12} />
            </div>
          ))}
        </div>
      </div>
      <div className="p-3 border-t border-slate-200 flex gap-2 justify-center">
        <button onClick={onPlayAgain} className="px-5 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2">
          <RefreshCw size={14} /> Play Again
        </button>
        <button onClick={onClose} className="px-5 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};

const MemoryGame = React.memo(({ data, onClose, onScoreUpdate, onGameComplete }) => {
  const { t } = useContext(LanguageContext);
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [gameMode, setGameMode] = useState('smart');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [mismatchIndices, setMismatchIndices] = useState([]);
  const [scoreDelta, setScoreDelta] = useState(null);
  const cardRefs = useRef([]);
  const gridRef = useRef(null);
  const scoreDeltaTimerRef = useRef(null);
  const flashScoreDelta = (delta) => {
    if (scoreDeltaTimerRef.current) clearTimeout(scoreDeltaTimerRef.current);
    setScoreDelta(delta);
    scoreDeltaTimerRef.current = setTimeout(() => setScoreDelta(null), 900);
  };
  useEffect(() => () => { if (scoreDeltaTimerRef.current) clearTimeout(scoreDeltaTimerRef.current); }, []);
  useEffect(() => {
    initializeGame();
  }, [data, gameMode]);
  const initializeGame = () => {
    const gameItems = data.slice(0, 10);
    const deck = gameItems.flatMap((item, index) => {
      const pairId = index;
      let strategy = gameMode;
      if (strategy === 'smart') {
          strategy = item.image ? 'term-image' : 'term-def';
      }
      else if (strategy === 'mixed') {
          const options = ['term-def', 'term-image', 'image-def'];
          strategy = options[Math.floor(Math.random() * options.length)];
      }
      if ((strategy === 'term-image' || strategy === 'image-def') && !item.image) {
          strategy = 'term-def';
      }
      let content1, type1, isTerm1;
      let content2, type2, isTerm2;
      switch (strategy) {
          case 'term-def':
              content1 = item.term; type1 = 'text'; isTerm1 = true;
              content2 = item.def; type2 = 'text'; isTerm2 = false;
              break;
          case 'image-def':
              content1 = item.image; type1 = 'image'; isTerm1 = false;
              content2 = item.def; type2 = 'text'; isTerm2 = false;
              break;
          case 'term-image':
          default:
              content1 = item.term; type1 = 'text'; isTerm1 = true;
              content2 = item.image; type2 = 'image'; isTerm2 = false;
              break;
      }
      const card1 = {
        id: `p${index}-1`,
        pairId,
        content: content1,
        type: type1,
        isTerm: isTerm1
      };
      const card2 = {
        id: `p${index}-2`,
        pairId,
        content: content2,
        type: type2,
        isTerm: isTerm2
      };
      return [card1, card2];
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setCards(deck);
    setFlippedIndices([]);
    setMatchedPairs(new Set());
    setMoves(0);
    setScore(0);
    setIsWon(false);
    setAnnouncement(`Game started. ${deck.length} cards. Use arrow keys or tab to navigate. Press Enter or Space to flip.`);
    cardRefs.current = cardRefs.current.slice(0, deck.length);
  };
  const handleCardClick = (index) => {
    if (
      flippedIndices.includes(index) ||
      matchedPairs.has(cards[index].pairId) ||
      flippedIndices.length >= 2
    ) return;
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    const cardContent = cards[index].type === 'image' ? "Image card" : cards[index].content;
    setAnnouncement(`Flipped ${cardContent}`);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const card1 = cards[newFlipped[0]];
      const card2 = cards[newFlipped[1]];
      if (card1.pairId === card2.pairId) {
        setScore(s => s + 30);
        flashScoreDelta(30);
        setTimeout(() => {
          setMatchedPairs(prev => {
            const newSet = new Set(prev);
            newSet.add(card1.pairId);
            return newSet;
          });
          setFlippedIndices([]);
          setAnnouncement(t('memory.announcement_match'));
        }, 500);
      } else {
        setScore(s => Math.max(0, s - 5));
        flashScoreDelta(-5);
        setMismatchIndices(newFlipped);
        setTimeout(() => {
          setFlippedIndices([]);
          setMismatchIndices([]);
          setAnnouncement(t('memory.announcement_mismatch'));
        }, 1500);
      }
    }
  };
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(index);
        return;
    }
    const getCols = () => {
        const grid = gridRef.current;
        if (!grid || grid.children.length === 0) return 1;
        const firstTop = grid.children[0].offsetTop;
        let count = 0;
        for (const child of grid.children) {
            if (child.offsetTop === firstTop) count++;
            else break;
        }
        return count || 1;
    };
    const cols = getCols();
    const total = cards.length;
    let nextIndex = null;
    if (e.key === 'ArrowRight') {
        nextIndex = index + 1;
    } else if (e.key === 'ArrowLeft') {
        nextIndex = index - 1;
    } else if (e.key === 'ArrowDown') {
        nextIndex = index + cols;
    } else if (e.key === 'ArrowUp') {
        nextIndex = index - cols;
    }
    if (nextIndex !== null && nextIndex >= 0 && nextIndex < total) {
        e.preventDefault();
        if (cardRefs.current[nextIndex]) {
            cardRefs.current[nextIndex].focus();
        }
    }
  };
  useEffect(() => {
    if (!isWon && cards.length > 0 && matchedPairs.size === cards.length / 2) {
      setIsWon(true);
      if (onScoreUpdate) onScoreUpdate(score, "Memory Match Complete");
      if (onGameComplete) {
        onGameComplete('memory', {
          score: score,
          pairsMatched: matchedPairs.size,
          totalPairs: cards.length / 2,
          attempts: moves
        });
      }
    }
  }, [matchedPairs, cards.length, isWon, onScoreUpdate, onGameComplete, score, moves]);
  const totalPairs = cards.length / 2;
  const progressPct = totalPairs > 0 ? Math.round((matchedPairs.size / totalPairs) * 100) : 0;
  return (
    <div className={`p-6 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100] overflow-y-auto h-screen w-screen rounded-none bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900' : 'rounded-xl border-2 border-indigo-200 shadow-inner mb-6 relative bg-slate-100'}`}>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 ${isFullscreen ? 'sticky top-0 z-30 bg-slate-900/70 backdrop-blur-md py-3 px-2 -mx-2 rounded-xl border border-white/10' : ''}`}>
        <div>
          <h3 className={`font-bold text-lg flex items-center gap-2 ${isFullscreen ? 'text-white' : 'text-indigo-900'}`}>
            <Brain size={20} /> {t('memory.title')}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold border px-2 py-0.5 rounded-full ${isFullscreen ? 'bg-white/10 text-slate-100 border-white/20' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <RefreshCw size={10} className={isFullscreen ? 'text-slate-300' : 'text-slate-600'} /> {t('memory.moves')}: {moves}
              </span>
              <span className={`relative inline-flex items-center gap-1 text-[11px] font-bold border px-2 py-0.5 rounded-full transition-all ${scoreDelta !== null ? (scoreDelta > 0 ? 'ring-2 ring-emerald-400 scale-105' : 'ring-2 ring-red-400 scale-105') : ''} ${isFullscreen ? 'bg-indigo-500/20 text-indigo-100 border-indigo-400/40' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>
                <Trophy size={10} className="text-yellow-500" /> {t('memory.score')}: {score}
                {scoreDelta !== null && (
                  <span className={`absolute -top-5 right-0 text-[11px] font-black pointer-events-none ${scoreDelta > 0 ? 'text-emerald-500' : 'text-red-500'} ${!useReducedMotion() ? 'animate-in fade-in slide-in-from-bottom-1 duration-300' : ''}`}>
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                  </span>
                )}
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold border px-2 py-0.5 rounded-full ${isFullscreen ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                <CheckCircle2 size={10} className="text-emerald-500" /> {t('memory.pairs')}: {matchedPairs.size}/{totalPairs}
              </span>
          </div>
        </div>
        <div className={`flex flex-wrap items-center gap-1 p-1 rounded-full shadow-sm ${isFullscreen ? 'bg-white/10 border border-white/20 backdrop-blur-md' : 'bg-white border border-slate-400'}`}>
          <select aria-label={t('common.selection')}
            value={gameMode}
            onChange={(e) => {
                const next = e.target.value;
                const inProgress = moves > 0 && !isWon;
                if (inProgress && !window.confirm(t('memory.mode_switch_confirm') || 'Changing the mode will restart this round. Continue?')) {
                    return;
                }
                setGameMode(next);
            }}
            className={`text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer ${isFullscreen ? 'bg-white/10 text-white border-0 [&>option]:text-slate-800' : 'bg-transparent text-indigo-700 border-0'}`}
            data-help-key="memory_mode_select"
          >
            <option value="smart">{t('memory.modes.smart')}</option>
            <option value="term-def">{t('memory.modes.term_def')}</option>
            <option value="term-image">{t('memory.modes.term_image')}</option>
            <option value="image-def">{t('memory.modes.image_def')}</option>
            <option value="mixed">{t('memory.modes.mixed')}</option>
          </select>
          <button
            onClick={initializeGame}
            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full font-bold transition-colors ${isFullscreen ? 'text-white hover:bg-white/10' : 'text-indigo-600 hover:bg-indigo-50'}`}
            aria-label={t('memory.reset')}
            data-help-key="memory_reset_btn"
          >
            <RefreshCw size={14}/> {t('memory.reset')}
          </button>
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className={`p-1.5 rounded-full transition-colors ${isFullscreen ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
            title={isFullscreen ? t('memory.exit_fullscreen') : t('memory.fullscreen')}
            aria-label={isFullscreen ? t('memory.exit_fullscreen') : t('memory.fullscreen')}
            data-help-key="memory_fullscreen_btn"
          >
            {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>}
          </button>
          <button onClick={onClose} className={`p-1.5 rounded-full transition-colors ${isFullscreen ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-700 hover:bg-slate-100'}`} aria-label={t('memory.close_aria')}><X size={18}/></button>
        </div>
      </div>
      {!isWon && totalPairs > 0 && (
        <div className={`mb-5 ${isFullscreen ? '' : ''}`}>
          <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isFullscreen ? 'text-slate-300' : 'text-slate-600'}`}>
            <span>{t('memory.pairs')}</span>
            <span>{progressPct}%</span>
          </div>
          <div className={`h-2 w-full rounded-full overflow-hidden ${isFullscreen ? 'bg-white/10' : 'bg-slate-200'}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-500 to-emerald-500 ${!useReducedMotion() ? 'transition-all duration-500 ease-out' : ''}`}
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
            />
          </div>
        </div>
      )}
      {isWon ? (() => {
          const perfect = totalPairs > 0 && moves === totalPairs;
          const great = totalPairs > 0 && moves <= Math.ceil(totalPairs * 1.5);
          const stars = perfect ? 3 : great ? 2 : 1;
          const accuracy = moves > 0 ? Math.round((totalPairs / moves) * 100) : 100;
          const cardBg = isFullscreen ? 'bg-white/10 border-white/20 backdrop-blur-md' : 'bg-white border-slate-200';
          const labelColor = isFullscreen ? 'text-slate-300' : 'text-slate-600';
          const valueColor = isFullscreen ? 'text-white' : 'text-slate-900';
          return (
          <div className={`flex flex-col items-center justify-center py-8 px-4 text-center${useReducedMotion() ? '' : ' animate-in zoom-in duration-300'}`}>
            {!useReducedMotion() && <ConfettiExplosion />}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg ${isFullscreen ? 'bg-yellow-400/20 text-yellow-300 ring-2 ring-yellow-400/40' : 'bg-yellow-100 text-yellow-600'}`}>
              <Trophy size={40} className="fill-current" />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${isFullscreen ? 'text-white' : 'text-slate-800'}`}>{t('memory.victory')}</h2>
            <div className={`flex items-center gap-1 mb-4 ${!useReducedMotion() ? 'animate-in zoom-in duration-500' : ''}`} aria-label={`${stars} out of 3 stars`}>
              {[0, 1, 2].map(i => (
                <Star
                  key={i}
                  size={32}
                  className={i < stars ? 'text-yellow-400 fill-yellow-400 drop-shadow-md' : (isFullscreen ? 'text-white/20' : 'text-slate-300')}
                  strokeWidth={1.5}
                />
              ))}
            </div>
            <div className={`grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-md mb-6`}>
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${labelColor}`}>{t('memory.score')}</div>
                <div className={`text-xl font-black ${valueColor}`}>{score}</div>
              </div>
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${labelColor}`}>{t('memory.moves')}</div>
                <div className={`text-xl font-black ${valueColor}`}>{moves}</div>
              </div>
              <div className={`rounded-xl border p-3 ${cardBg}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${labelColor}`}>Accuracy</div>
                <div className={`text-xl font-black ${valueColor}`}>{accuracy}%</div>
              </div>
            </div>
            <p className={`text-sm mb-6 ${isFullscreen ? 'text-slate-300' : 'text-slate-600'}`}>{t('memory.cleared_message', { moves })}</p>
            <button
                aria-label={t('common.start_game')}
              onClick={initializeGame}
              className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all active:scale-95"
            >
              {t('memory.play_again')}
            </button>
          </div>
          );
      })() : (
        <div
          ref={gridRef}
          className="grid gap-2 sm:gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${isFullscreen ? '130px' : '110px'}, 1fr))` }}
          role="grid"
          aria-label={t('memory.board_aria')}
        >
          {cards.map((card, index) => {
            const isFlipped = flippedIndices.includes(index) || matchedPairs.has(card.pairId);
            const isMatched = matchedPairs.has(card.pairId);
            const isMismatch = mismatchIndices.includes(index);
            let ariaLabel = `${t('memory.card_prefix')} ${index + 1}`;
            if (isMatched) {
                ariaLabel += `, ${t('memory.matched_suffix')}: ${card.type === 'image' ? t('memory.modes.term_image') : card.content}`;
            } else if (isFlipped) {
                ariaLabel += `, ${t('memory.face_up_suffix')}: ${card.type === 'image' ? t('memory.modes.term_image') : card.content}`;
            } else {
                ariaLabel += `, ${t('memory.face_down_suffix')}`;
            }
            return (
              <div
                key={index}
                ref={el => cardRefs.current[index] = el}
                onClick={() => handleCardClick(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                tabIndex={0}
                role="button"
                aria-label={ariaLabel}
                aria-disabled={isFlipped || isMatched}
                className={`aspect-square cursor-pointer perspective-1000 group relative ${isMatched ? 'opacity-100 cursor-default' : ''} ${isMismatch && !useReducedMotion() ? 'animate-shake' : ''} focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-2 rounded-xl transition-transform ${!isFlipped && !isMatched ? 'hover:-translate-y-1 hover:scale-[1.03]' : ''}`}
                data-help-key="memory_card_item"
              >
                <div className={`w-full h-full transition-all duration-500 transform-style-3d rounded-xl border-2 ${isFlipped ? `rotate-y-180 ${isMismatch ? 'border-red-400 shadow-lg shadow-red-200' : isMatched ? 'border-green-400 shadow-lg shadow-green-200' : 'border-indigo-300 shadow-md'}` : 'rotate-y-0 border-slate-200 bg-white shadow-sm group-hover:shadow-md'}`}>
                  <div className="absolute inset-0 backface-hidden flex items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-indigo-100 via-indigo-100 to-indigo-200 group-hover:from-indigo-200 group-hover:to-indigo-300 transition-colors">
                    <div className="absolute inset-0 opacity-40" style={{
                      backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.25) 0, transparent 45%)'
                    }}></div>
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-indigo-600 shadow-inner ring-1 ring-indigo-200/60">
                      <HelpCircle size={20} strokeWidth={2.25} />
                    </div>
                  </div>
                  <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl flex items-center justify-center p-2 text-center overflow-hidden ${isMismatch ? 'bg-red-50' : isMatched ? 'bg-green-50' : 'bg-white'}`}>
                    {card.type === 'image' ? (
                      <img loading="lazy"
                        src={card.content}
                        alt="memory card"
                        className="w-full h-full object-contain rounded"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center overflow-y-auto custom-scrollbar px-1">
                          <p className={`font-bold w-full leading-tight ${isMismatch ? 'text-red-900' : isMatched ? 'text-green-900' : 'text-slate-800'} ${card.isTerm ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-[11px] font-normal text-slate-600 leading-snug'}`}>
                            {card.content}
                          </p>
                      </div>
                    )}
                    {isMatched && <MatchVisuals />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
const MatchingGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [rightCol, setRightCol] = useState([]);
  const [connections, setConnections] = useState([]);
  const [tempLine, setTempLine] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [snapTarget, setSnapTarget] = useState(null);
  const [score, setScore] = useState(0);
  const [keyboardSelectedTerm, setKeyboardSelectedTerm] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const termRefs = useRef({});
  const defRefs = useRef({});
  const shuffleDefinitions = (validItems) => {
      const defs = validItems.map(item => ({ id: item.term, text: item.def }));
      if (defs.length <= 1) return defs;
      const originalOrder = defs.map(d => d.id);
      for (let attempt = 0; attempt < 20; attempt++) {
          for (let i = defs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [defs[i], defs[j]] = [defs[j], defs[i]];
          }
          if (defs.some((d, i) => d.id !== originalOrder[i])) return defs;
      }
      return defs;
  };
  useEffect(() => {
    const validItems = data.filter(d => d.term && d.def).slice(0, 8).map((item, i) => ({
        id: item.term,
        term: item.term,
        def: item.def
    }));
    setItems(validItems);
    setRightCol(shuffleDefinitions(validItems));
    setConnections([]);
    setIsChecked(false);
    setSnapTarget(null);
    setScore(0);
    setKeyboardSelectedTerm(null);
    setAnnouncement('');
  }, [data]);
  const getDotPos = (element) => {
      if (!element || !canvasRef.current) return { x: 0, y: 0 };
      const rect = element.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      return {
          x: rect.left - canvasRect.left + rect.width / 2,
          y: rect.top - canvasRect.top + rect.height / 2
      };
  };
  const handleTermKeyDown = (e, termId) => {
      if (isChecked) return;
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (keyboardSelectedTerm === termId) {
              setKeyboardSelectedTerm(null);
              setAnnouncement(t('matching.aria_selection_cancelled'));
          } else {
              setKeyboardSelectedTerm(termId);
              setAnnouncement(t('matching.aria_term_selected'));
              if(playSound) playSound('click');
          }
      }
  };
  const handleDefKeyDown = (e, defId) => {
      if (isChecked) return;
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (keyboardSelectedTerm) {
              setConnections(prev => {
                  const filtered = prev.filter(c => c.termId !== keyboardSelectedTerm && c.defId !== defId);
                  return [...filtered, { termId: keyboardSelectedTerm, defId, status: 'pending' }];
              });
              setKeyboardSelectedTerm(null);
              setAnnouncement(t('matching.aria_connected'));
              if(playSound) playSound('click');
          } else {
              setAnnouncement(t('matching.aria_select_first'));
          }
      }
  };
  const handleMouseDown = (e, termId) => {
      if (isChecked) return;
      e.preventDefault();
      const startPos = getDotPos(termRefs.current[termId]);
      setConnections(prev => prev.filter(c => c.termId !== termId));
      setTempLine({
          termId,
          start: startPos,
          end: startPos
      });
      const onMove = (ev) => {
          if (!canvasRef.current) return;
          const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
          const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const rawX = clientX - canvasRect.left;
          const rawY = clientY - canvasRect.top;
          let foundSnap = null;
          let minDist = 50;
          Object.entries(defRefs.current).forEach(([defId, element]) => {
              if (!element) return;
              const dotPos = getDotPos(element);
              const dist = Math.hypot(rawX - dotPos.x, rawY - dotPos.y);
              if (dist < minDist) {
                  minDist = dist;
                  foundSnap = { id: defId, x: dotPos.x, y: dotPos.y };
              }
          });
          if (foundSnap) {
              setSnapTarget(foundSnap.id);
              setTempLine(prev => ({
                  ...prev,
                  end: { x: foundSnap.x, y: foundSnap.y }
              }));
          } else {
              setSnapTarget(null);
              setTempLine(prev => ({
                  ...prev,
                  end: { x: rawX, y: rawY }
              }));
          }
      };
      const onUp = (ev) => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onUp);
          const clientX = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
          const clientY = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
          let hitDefId = null;
          Object.entries(defRefs.current).forEach(([defId, element]) => {
              if (!element) return;
              const rect = element.getBoundingClientRect();
              const dist = Math.hypot(clientX - (rect.left + rect.width/2), clientY - (rect.top + rect.height/2));
              if (dist < 50) {
                  hitDefId = defId;
              }
          });
          if (hitDefId) {
              setConnections(prev => {
                  const filtered = prev.filter(c => c.defId !== hitDefId);
                  return [...filtered, { termId, defId: hitDefId, status: 'pending' }];
              });
              if (playSound) playSound('click');
          }
          setTempLine(null);
          setSnapTarget(null);
          setKeyboardSelectedTerm(null);
      };
      window.addEventListener('mousemove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
  };
  const checkAnswers = () => {
      setIsChecked(true);
      const correctCount = connections.filter(c => c.termId === c.defId).length;
      const isPerfect = correctCount === items.length && connections.length === items.length;
      const earnedPoints = correctCount * 25;
      setScore(earnedPoints);
      if (onScoreUpdate && isPerfect) onScoreUpdate(earnedPoints, "Matching Worksheet Complete");
      if (playSound) playSound(isPerfect ? 'correct' : 'incorrect');
      if (onGameComplete) {
        onGameComplete('matching', {
          score: earnedPoints,
          correctMatches: correctCount,
          totalPairs: items.length,
          isPerfect: isPerfect
        });
      }
  };
  const reset = () => {
      setConnections([]);
      setIsChecked(false);
      setScore(0);
      setKeyboardSelectedTerm(null);
      setRightCol(shuffleDefinitions(items));
      setAnnouncement('');
  };
  return (
    <div className={`fixed inset-0 z-[100] bg-slate-50 flex flex-col overflow-hidden${useReducedMotion() ? '' : ' animate-in fade-in duration-300'}`}>
        <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
        <div className="bg-white border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm no-print z-20 relative">
            <div>
                 <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-900">
                     <GitMerge size={20} className="text-orange-500"/> {t('matching.title')}
                 </h3>
                 <p className="text-xs text-slate-600">{t('matching.instructions')}</p>
                 <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                     <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-400 px-2 py-0.5 rounded-full">
                         <GitMerge size={10} className="text-slate-600"/> {t('matching.pairs') || 'Pairs'}: {connections.length}/{items.length}
                     </span>
                     {isChecked && (
                         <span className={`inline-flex items-center gap-1 text-[11px] font-bold border px-2 py-0.5 rounded-full ${score === items.length * 25 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'} ${!useReducedMotion() ? 'animate-in zoom-in duration-300' : ''}`}>
                             <Trophy size={10} className="text-yellow-500"/> {t('matching.score_display')}: {score} pts
                         </span>
                     )}
                 </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-50 border border-slate-400 shadow-sm self-end sm:self-auto">
                <button
                    onClick={reset}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title={t('matching.reset_aria')}
                    aria-label={t('matching.reset_aria')}
                    data-help-key="matching_reset_btn"
                >
                    <RefreshCw size={14}/> {t('memory.reset') || 'Reset'}
                </button>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-red-50 rounded-full text-slate-600 hover:text-red-500 transition-colors"
                    title={t('common.close')}
                    aria-label={t('matching.close_aria')}
                >
                    <X size={18}/>
                </button>
            </div>
        </div>
        <div
            ref={scrollRef}
            className="flex-grow overflow-y-auto relative touch-none bg-white"
        >
            <div
                className="relative min-h-full p-8"
            >
                <div className="hidden print:block mb-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('matching.print_title')}</h2>
                    <div className="flex justify-between text-sm border-b-2 border-slate-800 pb-2 mb-4">
                        <span>{t('matching.print_name')}: _______________________</span>
                        <span>{t('matching.print_date')}: _______________________</span>
                        <span>{t('matching.print_score')}: _______ / {items.length * 100}</span>
                    </div>
                    <p className="text-sm text-slate-600 italic">{t('matching.print_instructions')}</p>
                </div>
                <div
                    ref={canvasRef}
                    className="max-w-4xl mx-auto relative min-h-[600px]"
                >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 print:hidden">
                        <defs>
                            <filter id="matching-glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="2" result="blur"/>
                                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                        </defs>
                        {connections.map((conn) => {
                            const start = getDotPos(termRefs.current[conn.termId]);
                            const end = getDotPos(defRefs.current[conn.defId]);
                            let color = "#6366f1";
                            if (isChecked) {
                                color = conn.termId === conn.defId ? "#22c55e" : "#ef4444";
                            }
                            const isCorrect = isChecked && conn.termId === conn.defId;
                            const isIncorrect = isChecked && conn.termId !== conn.defId;
                            const midX = (start.x + end.x) / 2;
                            const midY = (start.y + end.y) / 2;
                            return (
                                <g key={`${conn.termId}-${conn.defId}`}>
                                    <line
                                        x1={start.x} y1={start.y}
                                        x2={end.x} y2={end.y}
                                        stroke={color}
                                        strokeWidth={isCorrect ? "4" : "3"}
                                        strokeLinecap="round"
                                        strokeDasharray={isIncorrect ? "8,4" : "none"}
                                        opacity={isIncorrect ? "0.75" : "1"}
                                        filter={isCorrect ? "url(#matching-glow)" : undefined}
                                    />
                                    {isCorrect && (
                                        <g>
                                            <circle cx={midX} cy={midY} r="11" fill="#22c55e" opacity="0.15"/>
                                            <text x={midX} y={midY + 5} textAnchor="middle" fill="#16a34a" fontSize="18" fontWeight="bold" aria-hidden="true">✓</text>
                                        </g>
                                    )}
                                    {isIncorrect && (
                                        <g>
                                            <circle cx={midX} cy={midY} r="11" fill="#ef4444" opacity="0.15"/>
                                            <text x={midX} y={midY + 5} textAnchor="middle" fill="#dc2626" fontSize="16" fontWeight="bold" aria-hidden="true">✗</text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                        {(tempLine) && (
                            <line
                                x1={tempLine.start.x} y1={tempLine.start.y}
                                x2={tempLine.end.x} y2={tempLine.end.y}
                                stroke={snapTarget ? "#22c55e" : "#6366f1"}
                                strokeWidth="3"
                                strokeDasharray="6,4"
                                strokeLinecap="round"
                                style={!useReducedMotion() ? { animation: 'dashflow 0.6s linear infinite' } : undefined}
                            />
                        )}
                    </svg>
                    <div className="flex justify-between gap-12 h-full">
                        <div className="w-1/3 space-y-8">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between h-16 group relative z-20">
                                    <div
                                        onClick={() => {
                                            if (isChecked) return;
                                            if (keyboardSelectedTerm === item.id) {
                                                setKeyboardSelectedTerm(null);
                                                setAnnouncement(t('matching.aria_selection_cancelled'));
                                            } else {
                                                setKeyboardSelectedTerm(item.id);
                                                setAnnouncement(t('matching.aria_term_selected'));
                                                if (playSound) playSound('click');
                                            }
                                        }}
                                        onKeyDown={(e) => handleTermKeyDown(e, item.id)}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${t('matching.select_term_aria')}: ${item.term}`}
                                        aria-pressed={keyboardSelectedTerm === item.id}
                                        className={`bg-indigo-50 border-2 border-indigo-100 p-3 rounded-lg w-full shadow-sm text-sm font-bold text-indigo-900 flex items-center justify-center text-center h-full print:border-slate-300 print:bg-white select-none cursor-pointer hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${keyboardSelectedTerm === item.id ? 'ring-4 ring-yellow-200 border-yellow-400 bg-yellow-50' : ''}`}
                                        data-help-key="matching_term_item"
                                    >
                                        {item.term}
                                        <SpeakButton text={item.term} size={11} className="ml-1" />
                                    </div>
                                    <div
                                        ref={el => termRefs.current[item.id] = el}
                                        onMouseDown={(e) => handleMouseDown(e, item.id)}
                                        onTouchStart={(e) => handleMouseDown(e, item.id)}
                                        onKeyDown={(e) => handleTermKeyDown(e, item.id)}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${t('matching.select_term_aria')}: ${item.term}`}
                                        aria-pressed={keyboardSelectedTerm === item.id}
                                        className={`w-6 h-6 bg-white border-4 rounded-full cursor-pointer hover:scale-110 transition-transform ml-4 print:bg-black print:border-black print:w-4 print:h-4 print:scale-100 focus:outline-none focus:ring-4 focus:ring-indigo-300 ${
                                            (tempLine && tempLine.termId === item.id) || keyboardSelectedTerm === item.id
                                            ? 'border-yellow-500 ring-4 ring-yellow-200 scale-110 animate-pulse'
                                            : 'border-indigo-300'
                                        }`}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="w-2/3 space-y-8">
                            {rightCol.map((def) => (
                                <div key={def.id} className="flex items-center justify-between h-16 relative z-20">
                                    <div
                                        data-id={def.id}
                                        ref={el => defRefs.current[def.id] = el}
                                        onKeyDown={(e) => handleDefKeyDown(e, def.id)}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${t('matching.connect_def_aria')}: ${def.text}`}
                                        className={`def-dot w-6 h-6 bg-white border-4 rounded-full cursor-pointer transition-all mr-4 print:bg-black print:border-black print:w-4 print:h-4 focus:outline-none focus:ring-4 focus:ring-indigo-300 ${snapTarget === def.id ? 'border-green-500 scale-125 bg-green-50' : 'border-slate-300 hover:border-slate-500'}`}
                                    ></div>
                                    <div
                                        onClick={() => {
                                            if (isChecked) return;
                                            if (keyboardSelectedTerm) {
                                                setConnections(prev => {
                                                    const filtered = prev.filter(c => c.termId !== keyboardSelectedTerm && c.defId !== def.id);
                                                    return [...filtered, { termId: keyboardSelectedTerm, defId: def.id, status: 'pending' }];
                                                });
                                                setKeyboardSelectedTerm(null);
                                                setAnnouncement(t('matching.aria_connected'));
                                                if (playSound) playSound('click');
                                            } else {
                                                setAnnouncement(t('matching.aria_select_first'));
                                            }
                                        }}
                                        onKeyDown={(e) => handleDefKeyDown(e, def.id)}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${t('matching.connect_def_aria')}: ${def.text}`}
                                        className={`bg-white border border-slate-400 p-3 rounded-lg w-full shadow-sm text-xs text-slate-600 flex items-center h-full overflow-y-auto leading-snug print:border-slate-300 select-none cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${keyboardSelectedTerm ? 'hover:border-indigo-300 hover:shadow-md' : ''}`}
                                        data-help-key="matching_def_item"
                                    >
                                        {def.text}
                                        <SpeakButton text={def.text} size={11} className="ml-1 shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {isChecked && (
          <div className="px-6 pb-2">
            <GameReviewScreen
              score={score}
              title={t('matching.title') || "Matching"}
              items={items.map(item => {
                const conn = connections.find(c => c.termId === item.id);
                const matched = conn ? conn.defId === item.id : false;
                return {
                  label: item.term,
                  detail: item.def,
                  status: matched ? 'correct' : 'incorrect'
                };
              })}
              onPlayAgain={reset}
              onClose={onClose}
              t={t}
            />
          </div>
        )}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 no-print z-30">
             <div className="flex-1 max-w-md">
                 {!isChecked && items.length > 0 && (
                     <div className="flex items-center gap-2">
                         <div className="h-1.5 flex-grow rounded-full bg-slate-200 overflow-hidden">
                             <div
                                 className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 ${!useReducedMotion() ? 'transition-all duration-500 ease-out' : ''}`}
                                 style={{ width: `${Math.min(100, (connections.length / items.length) * 100)}%` }}
                                 role="progressbar"
                                 aria-valuemin={0}
                                 aria-valuemax={items.length}
                                 aria-valuenow={connections.length}
                             />
                         </div>
                         <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 tabular-nums">{connections.length}/{items.length}</span>
                     </div>
                 )}
             </div>
             <button
                 aria-label={t('common.check_answers')}
                onClick={checkAnswers}
                disabled={isChecked || connections.length === 0}
                className="bg-gradient-to-br from-indigo-600 to-indigo-700 hover:shadow-indigo-500/50 text-white font-bold py-2.5 px-6 rounded-full shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all active:scale-95 flex items-center gap-2"
                data-help-key="matching_check_btn"
             >
                 <CheckCircle2 size={18}/> {t('matching.check_answers')}
             </button>
        </div>
    </div>
  );
});
const TIMELINE_PASTEL_COLORS = [
  'bg-blue-50 border-blue-200 hover:border-blue-300 text-blue-900',
  'bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-900',
  'bg-amber-50 border-amber-200 hover:border-amber-300 text-amber-900',
  'bg-purple-50 border-purple-200 hover:border-purple-300 text-purple-900',
  'bg-pink-50 border-pink-200 hover:border-pink-300 text-pink-900',
  'bg-cyan-50 border-cyan-200 hover:border-cyan-300 text-cyan-900',
  'bg-rose-50 border-rose-200 hover:border-rose-300 text-rose-900',
  'bg-indigo-50 border-indigo-200 hover:border-indigo-300 text-indigo-900',
  'bg-teal-50 border-teal-200 hover:border-teal-300 text-teal-900',
  'bg-lime-50 border-lime-200 hover:border-lime-300 text-lime-900',
  'bg-fuchsia-50 border-fuchsia-200 hover:border-fuchsia-300 text-fuchsia-900',
  'bg-violet-50 border-violet-200 hover:border-violet-300 text-violet-900',
  'bg-sky-50 border-sky-200 hover:border-sky-300 text-sky-900',
  'bg-orange-50 border-orange-200 hover:border-orange-300 text-orange-900',
  'bg-green-50 border-green-200 hover:border-green-300 text-green-900',
  'bg-red-50 border-red-200 hover:border-red-300 text-red-900'
];
const createTimelineDerangement = (arr) => {
  const n = arr.length;
  if (n <= 1) return arr;
  let attempts = 0;
  const maxAttempts = 100;
  while (attempts < maxAttempts) {
    const next = [...arr];
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.every((item, idx) => item.originalIndex !== idx)) return next;
    attempts++;
  }
  const rotated = [...arr];
  const first = rotated.shift();
  rotated.push(first);
  return rotated;
};
const normalizeTimelineData = (data, fallbackLabel) => {
  if (!data) return { itemsArray: [], label: fallbackLabel, labelEn: '' };
  if (Array.isArray(data)) {
    return { itemsArray: data, label: fallbackLabel, labelEn: '' };
  }
  return {
    itemsArray: Array.isArray(data.items) ? data.items : [],
    label: data.progressionLabel || fallbackLabel,
    labelEn: data.progressionLabel_en || ''
  };
};
const indexTimelineItems = (itemsArray) => itemsArray.map((item, i) => ({
    ...item,
    originalIndex: i,
    id: `evt-${i}`,
    colorIdx: Math.floor(Math.random() * TIMELINE_PASTEL_COLORS.length)
}));
const TimelineGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, onExplainIncorrect, initialImageSize }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [keyboardLiftedIdx, setKeyboardLiftedIdx] = useState(null);
  const [progressionLabel, setProgressionLabel] = useState('');
  // In-game image size slider — initial value comes from teacher's preview size
  // (passed via initialImageSize prop). Student can adjust live for accessibility.
  const [imageSize, setImageSize] = useState(() => {
    const n = parseInt(initialImageSize, 10);
    return Number.isFinite(n) && n >= 64 && n <= 300 ? n : 96;
  });
  const [progressionLabelEn, setProgressionLabelEn] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lastCorrectCount, setLastCorrectCount] = useState(null); // null until first check
  const [explanations, setExplanations] = useState({}); // originalIndex -> text | 'loading'
  const [hintHidden, setHintHidden] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const itemRefs = useRef([]);
  const normalizedItemsRef = useRef([]);
  useEffect(() => {
    if (!data) return;
    const fallback = t('timeline.progression_label_default') || 'Sequential Order';
    const { itemsArray, label, labelEn } = normalizeTimelineData(data, fallback);
    normalizedItemsRef.current = itemsArray;
    setProgressionLabel(label);
    setProgressionLabelEn(labelEn);
    setItems(createTimelineDerangement(indexTimelineItems(itemsArray)));
    setIsWon(false);
    setAttempts(0);
    setScore(0);
    setBestScore(0);
    setHintsUsed(0);
    setLastCorrectCount(null);
    setExplanations({});
    setHintHidden(false);
    setAnswerRevealed(false);
    setAnnouncement(t('timeline.game.start_announcement'));
    setKeyboardLiftedIdx(null);
  }, [data]);
  useEffect(() => {
    if (keyboardLiftedIdx === null) return;
    const el = itemRefs.current[keyboardLiftedIdx];
    if (el && typeof el.focus === 'function') el.focus();
  }, [keyboardLiftedIdx, items]);
  useEffect(() => {
    if (draggingIdx === null) return;
    const blockScroll = (e) => { e.preventDefault(); };
    document.addEventListener('touchmove', blockScroll, { passive: false });
    return () => document.removeEventListener('touchmove', blockScroll);
  }, [draggingIdx]);
  const handleDragStart = (e, index) => {
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === index) return;
    const newItems = [...items];
    const draggedItem = newItems[draggingIdx];
    newItems.splice(draggingIdx, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggingIdx(index);
  };
  const handleDragEnd = () => {
    setDraggingIdx(null);
  };
  // ── Touch support for mobile/tablet ──
  const touchDragIdx = useRef(null);
  const handleTouchStart = (e, index) => {
    if (isWon) return;
    touchDragIdx.current = index;
    setDraggingIdx(index);
  };
  const handleTouchMove = useCallback((e) => {
    if (touchDragIdx.current === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    const currentIdx = touchDragIdx.current;
    const elements = itemRefs.current.filter(Boolean);
    for (let i = 0; i < elements.length; i++) {
      if (i === currentIdx) continue;
      const rect = elements[i].getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setItems((prev) => {
          const next = [...prev];
          const dragged = next[currentIdx];
          next.splice(currentIdx, 1);
          next.splice(i, 0, dragged);
          return next;
        });
        touchDragIdx.current = i;
        setDraggingIdx(i);
        break;
      }
    }
  }, []);
  const handleTouchEnd = useCallback(() => {
    touchDragIdx.current = null;
    setDraggingIdx(null);
  }, []);
  const moveItem = (index, direction) => {
    const newItems = [...items];
    const itemToMove = newItems[index];
    if (direction === 'up' && index > 0) {
        [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        setItems(newItems);
        setAnnouncement(t('timeline.game.moved_up', { item: itemToMove.event, pos: index, total: items.length }));
        if (playSound) playSound('click');
    } else if (direction === 'down' && index < items.length - 1) {
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        setItems(newItems);
        setAnnouncement(t('timeline.game.moved_down', { item: itemToMove.event, pos: index + 2, total: items.length }));
        if (playSound) playSound('click');
    }
  };
  const handleKeyDown = (e, index) => {
      if (isWon) return;
      if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (keyboardLiftedIdx === index) {
              setKeyboardLiftedIdx(null);
              setAnnouncement(t('timeline.game.dropped', { item: items[index].event }));
              if (playSound) playSound('click');
          } else {
              setKeyboardLiftedIdx(index);
              setAnnouncement(t('timeline.game.lifted', { item: items[index].event }));
              if (playSound) playSound('click');
          }
      }
      if (keyboardLiftedIdx === index) {
          if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (index > 0) {
                  moveItem(index, 'up');
                  setKeyboardLiftedIdx(index - 1);
              }
          } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (index < items.length - 1) {
                  moveItem(index, 'down');
                  setKeyboardLiftedIdx(index + 1);
              }
          }
      }
  };
  const checkOrder = () => {
    let correctCount = 0;
    items.forEach((item, i) => {
        if (item.originalIndex === i) correctCount++;
    });
    const isCorrect = correctCount === items.length;
    const hintPenalty = hintsUsed * 15;
    // Tuned bonus: linear decay 100 → 10 across attempts, no long plateau.
    const attemptBonus = Math.max(10, 100 - (attempts * 12));
    let currentScore = Math.max(0, (correctCount * 20) - hintPenalty);
    setLastCorrectCount(correctCount);
    if (isCorrect) {
        setIsWon(true);
        const totalPoints = Math.max(0, currentScore + attemptBonus);
        setScore(totalPoints);
        setBestScore(prev => Math.max(prev, totalPoints));
        setAnnouncement(t('timeline.game.win_announcement', { score: totalPoints }) || `Sequence complete! ${totalPoints} points.`);
        if (onScoreUpdate) onScoreUpdate(totalPoints, "Sequence Builder");
        if (onGameComplete) {
          onGameComplete('timeline', {
            score: totalPoints,
            eventsOrdered: items.length,
            totalEvents: items.length,
            attempts: attempts + 1,
            hintsUsed,
            bestScore: Math.max(bestScore, totalPoints)
          });
        }
        if (playSound) playSound('correct');
    } else {
        setAttempts(prev => prev + 1);
        setScore(currentScore);
        setAnnouncement(
            t('timeline.game.partial_correct', { correct: correctCount, total: items.length }) ||
            `${correctCount} of ${items.length} in the correct position — keep trying!`
        );
        if (playSound) playSound('incorrect');
    }
  };
  const handleExplainClick = async (item) => {
      if (!onExplainIncorrect) return;
      const key = item.originalIndex;
      if (explanations[key] && explanations[key] !== 'loading') {
          setExplanations(prev => { const next = { ...prev }; delete next[key]; return next; });
          return;
      }
      setExplanations(prev => ({ ...prev, [key]: 'loading' }));
      try {
          const currentPosition = items.findIndex(i => i.originalIndex === item.originalIndex);
          const correctPosition = item.originalIndex;
          const sortedByCorrect = [...normalizedItemsRef.current];
          const text = await onExplainIncorrect(item, correctPosition, currentPosition, progressionLabel, sortedByCorrect);
          setExplanations(prev => ({ ...prev, [key]: text || t('timeline.game.why_none') || 'No explanation available.' }));
      } catch (e) {
          setExplanations(prev => ({ ...prev, [key]: t('timeline.game.why_failed') || "Couldn't generate an explanation right now." }));
      }
  };
  const useHint = () => {
      if (isWon) return;
      // Find the first item that is NOT in its correct position; move it to where it belongs.
      const wrongIdx = items.findIndex((it, i) => it.originalIndex !== i);
      if (wrongIdx === -1) return;
      const target = items[wrongIdx].originalIndex;
      const next = [...items];
      const [moved] = next.splice(wrongIdx, 1);
      next.splice(target, 0, moved);
      setItems(next);
      setHintsUsed(prev => prev + 1);
      setAnnouncement(t('timeline.game.hint_used', { item: moved.event }) || `Hint: "${moved.event}" moved to its correct spot.`);
      if (playSound) playSound('click');
  };
  const revealAnswer = () => {
      if (isWon) return;
      // Sort items into their correct order by originalIndex. Reveal = no points.
      const sorted = [...items].sort((a, b) => a.originalIndex - b.originalIndex);
      setItems(sorted);
      setAnswerRevealed(true);
      setIsWon(true);
      setScore(0);
      setAnnouncement(t('timeline.game.answer_revealed_announce') || 'Answer revealed. No points awarded.');
      if (playSound) playSound('reveal');
  };
  const reset = () => {
     const itemsArray = normalizedItemsRef.current || [];
     setItems(createTimelineDerangement(indexTimelineItems(itemsArray)));
     setIsWon(false);
     setAttempts(prev => prev + 1);
     setScore(0);
     setHintsUsed(0);
     setLastCorrectCount(null);
     setExplanations({});
     setAnnouncement(t('timeline.game.reset_announcement'));
     setKeyboardLiftedIdx(null);
     // bestScore intentionally preserved across resets within the same game session.
  };
  return (
    <div className={`fixed inset-0 z-[100] bg-slate-50 flex flex-col${useReducedMotion() ? '' : ' animate-in fade-in duration-300'}`}>
       <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
       <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0 shadow-md z-20">
           <div>
               <h3 className="font-bold text-lg flex items-center gap-2">
                   <ListOrdered size={20} className="text-yellow-400"/> {t('timeline.game.header')}
               </h3>
               <p className="text-xs text-indigo-200">{t('timeline.game.desc')}</p>
           </div>
           <div className="flex items-center gap-4">
               <div className="bg-indigo-800/50 px-4 py-1.5 rounded-full border border-indigo-500 flex items-center gap-2">
                   <Trophy size={14} className="text-yellow-400"/>
                   <span className="font-bold text-sm">{score} pts</span>
               </div>
               <label className="hidden sm:flex items-center gap-1.5 text-[10px] text-indigo-100 bg-indigo-800/50 px-2.5 py-1.5 rounded-full border border-indigo-500 cursor-pointer" title={t('timeline.game.image_size_title') || 'Adjust card image size for accessibility'}>
                   <span className="font-bold uppercase tracking-wider text-[9px]">{t('timeline.game.image_size_label') || 'Image'}</span>
                   <input
                       type="range" min={64} max={300} step={16}
                       value={imageSize}
                       onChange={(e) => setImageSize(parseInt(e.target.value, 10) || 96)}
                       className="w-20 accent-yellow-400"
                       aria-label={t('timeline.game.image_size_label') || 'Image size'}
                   />
                   <span className="font-bold w-7 text-right tabular-nums">{imageSize}</span>
               </label>
               <GameThemeToggle />
               <button onClick={onClose} className="p-2 hover:bg-indigo-500 rounded-full transition-colors" aria-label={t('timeline.game.close_aria')}><X size={24}/></button>
           </div>
       </div>
       <div className="flex-grow overflow-y-auto p-6 bg-slate-100 relative custom-scrollbar">
           {isWon && !answerRevealed && !useReducedMotion() && <ConfettiExplosion />}
           {answerRevealed && (
               <div className="max-w-3xl mx-auto mb-4 px-4 py-3 bg-slate-100 border border-slate-400 rounded-lg text-slate-700 text-sm font-medium text-center">
                   👁 {t('timeline.game.answer_revealed_banner') || 'Answer revealed — no points this round. Play again to try for a score.'}
               </div>
           )}
           <div className="max-w-3xl mx-auto relative min-h-full pb-20">
               {!isWon && (
                   <div className="sticky top-0 z-30 flex flex-col items-center gap-2 mb-8">
                       <div className={`bg-white/90 backdrop-blur-sm px-6 py-2 rounded-full border border-indigo-100 shadow-sm text-indigo-600 text-xs font-bold uppercase tracking-wider flex items-center gap-2${useReducedMotion() ? '' : ' animate-in slide-in-from-top-2'}`}>
                           <ArrowDown size={14} /> {t('timeline.game.arrange_instruction')} <ArrowDown size={14} />
                       </div>
                       {progressionLabel && (
                           <div className={`bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold flex flex-col items-center gap-0.5 shadow-md${useReducedMotion() ? '' : ' animate-in slide-in-from-top-3'}`}>
                               <div className="flex items-center gap-2">
                                   <span className="opacity-70">{t('timeline.order_by')}</span> {progressionLabel}
                               </div>
                               {progressionLabelEn && progressionLabelEn !== progressionLabel && (
                                   <div className="text-[11px] font-normal italic opacity-80">{progressionLabelEn}</div>
                               )}
                           </div>
                       )}
                       <div className="flex flex-wrap gap-2 justify-center">
                           {lastCorrectCount !== null && !isWon && (
                               <div className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                   {lastCorrectCount} / {items.length} {t('timeline.game.in_correct_position') || 'in correct position'}
                               </div>
                           )}
                           {bestScore > 0 && (
                               <div className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                   {t('timeline.game.best') || 'Best'}: {bestScore} pts
                               </div>
                           )}
                           {hintsUsed > 0 && (
                               <div className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                   {t('timeline.game.hints_used', { n: hintsUsed }) || `${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} used`}
                               </div>
                           )}
                       </div>
                       {!hintHidden && attempts === 0 && keyboardLiftedIdx === null && items.length > 0 && (
                           <div className="text-[11px] text-slate-600 italic flex items-center gap-2">
                               <span>{t('timeline.game.keyboard_hint') || 'Keyboard: Enter to lift, ↑/↓ to move, Enter to drop.'}</span>
                               <button onClick={() => setHintHidden(true)} className="underline hover:text-slate-700" aria-label={t('common.dismiss') || 'Dismiss'}>×</button>
                           </div>
                       )}
                   </div>
               )}
               <div className="relative pl-8 sm:pl-0">
                   <div className="absolute left-3 sm:left-1/2 top-0 bottom-0 w-1.5 bg-indigo-100 rounded-full -translate-x-1/2 z-0"></div>
                   <div className="space-y-6 sm:space-y-0" role="list">
                       {items.map((item, idx) => {
                           const colorClass = TIMELINE_PASTEL_COLORS[item.colorIdx % TIMELINE_PASTEL_COLORS.length];
                           const isLeft = idx % 2 === 0;
                           const isDragging = draggingIdx === idx;
                           const isLifted = keyboardLiftedIdx === idx;
                           return (
                           <div
                               key={item.id}
                               ref={el => itemRefs.current[idx] = el}
                               tabIndex={isWon ? -1 : 0}
                               role="listitem"
                               aria-roledescription="draggable item"
                               aria-pressed={isLifted}
                               aria-label={`${item.event}. ${t('timeline.game.position_aria', {pos: idx + 1, total: items.length})}. ${isLifted ? t('timeline.game.lifted_aria') : t('timeline.game.lift_aria')}`}
                               onKeyDown={(e) => handleKeyDown(e, idx)}
                               draggable={!isWon}
                               onDragStart={(e) => handleDragStart(e, idx)}
                               onDragOver={(e) => handleDragOver(e, idx)}
                               onDragEnd={handleDragEnd}
                               onTouchStart={(e) => handleTouchStart(e, idx)}
                               onTouchMove={handleTouchMove}
                               onTouchEnd={handleTouchEnd}
                               className={`relative z-10 sm:flex sm:items-center sm:justify-between group transition-all duration-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-4 focus:ring-offset-4 ${isDragging ? 'opacity-20 scale-95' : 'opacity-100'} ${isLifted ? 'z-50 scale-105 ring-4 ring-yellow-400 ring-offset-4 shadow-2xl' : ''}`}
                               data-help-key="timeline_draggable_item"
                           >
                               <div className={`hidden sm:block sm:w-1/2 ${!isLeft ? 'order-1' : 'order-2'}`}></div>
                               <div className={`absolute left-3 sm:left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-4 border-white shadow-sm z-20 transition-all duration-300 ${isWon && item.originalIndex === idx ? 'bg-green-500 scale-110' : 'bg-indigo-300 group-hover:bg-indigo-500'}`}>
                                   {isWon && item.originalIndex === idx && (
                                       <div className={`absolute -right-1 -top-1 text-green-500 opacity-75${useReducedMotion() ? '' : ' animate-ping'}`}><CheckCircle2 size={24}/></div>
                                   )}
                               </div>
                               <div className={`sm:w-1/2 pl-10 sm:pl-0 ${isLeft ? 'sm:pr-12 sm:text-right order-1' : 'sm:pl-12 sm:text-left order-2'} transition-all duration-300`}>
                                   <div className={`
                                       relative p-5 rounded-2xl border-2 shadow-sm transition-all transform duration-200
                                       ${isWon
                                           ? 'bg-green-50 border-green-200 opacity-90'
                                           : `${colorClass} hover:-translate-y-1 hover:shadow-md cursor-grab active:cursor-grabbing`
                                       }
                                   `}>
                                       <div className={`absolute top-3 ${isLeft ? 'right-3 sm:left-3 sm:right-auto' : 'right-3'} w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${isWon ? 'bg-green-200 text-green-800' : 'bg-black/5 text-slate-600'}`}>
                                           {idx + 1}
                                       </div>
                                       <div className="pr-6 sm:px-2">
                                           {isWon && (item.date || item.date_en) && (
                                               <div className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider mb-2 bg-green-100 text-green-800 animate-in zoom-in`}>
                                                   {item.date}
                                               </div>
                                           )}
                                           {item.image && (
                                               <img
                                                   loading="lazy"
                                                   src={item.image}
                                                   alt={`${item.date || ''}: ${item.event || ''}`}
                                                   className={`mx-auto mb-2 object-contain rounded-lg bg-white border ${isWon ? 'border-green-200' : 'border-slate-200'}`}
                                                   style={{ width: imageSize, height: imageSize }}
                                               />
                                           )}
                                           <div className={`text-sm font-bold leading-snug flex items-center gap-1 ${isWon ? 'text-green-900' : ''}`}>
                                               {item.event}
                                               {!isWon && <SpeakButton text={item.event} size={11} />}
                                           </div>
                                           {item.event_en && (
                                               <div className={`text-xs italic mt-1 ${isWon ? 'text-green-700/70' : 'text-slate-600'}`}>
                                                   {item.event_en}
                                               </div>
                                           )}
                                           {onExplainIncorrect && !isWon && lastCorrectCount !== null && item.originalIndex !== idx && (
                                               <>
                                                   <button
                                                       onClick={(e) => { e.stopPropagation(); handleExplainClick(item); }}
                                                       className="mt-2 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white/70 border border-indigo-200 hover:border-indigo-400 rounded px-2 py-0.5 transition-colors inline-flex items-center gap-1"
                                                       aria-label={t('timeline.game.why_aria') || 'Explain why this is out of place'}
                                                       aria-busy={explanations[item.originalIndex] === 'loading'}
                                                   >
                                                       {explanations[item.originalIndex] === 'loading'
                                                           ? (t('timeline.game.why_loading') || '…')
                                                           : (explanations[item.originalIndex]
                                                               ? (t('timeline.game.why_hide') || 'Hide why')
                                                               : (t('timeline.game.why_label') || 'Why?'))}
                                                   </button>
                                                   {explanations[item.originalIndex] && explanations[item.originalIndex] !== 'loading' && (
                                                       <div className="mt-1 p-2 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-900 leading-snug text-left">
                                                           {explanations[item.originalIndex]}
                                                       </div>
                                                   )}
                                               </>
                                           )}
                                       </div>
                                       {!isWon && (
                                           <div className="absolute top-1/2 -translate-y-1/2 right-2 text-black/10 p-1 group-hover:text-black/20">
                                               <GripVertical size={20} />
                                           </div>
                                       )}
                                       {!isWon && (
                                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 sm:hidden opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-full p-1 shadow-sm">
                                                <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-600 hover:text-indigo-600 disabled:opacity-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded" aria-label={t('move_up')} data-help-key="timeline_move_up"><ArrowUp size={14}/></button>
                                                <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1} className="p-1 text-slate-600 hover:text-indigo-600 disabled:opacity-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded" aria-label={t('move_down')} data-help-key="timeline_move_down"><ArrowDown size={14}/></button>
                                            </div>
                                       )}
                                   </div>
                               </div>
                           </div>
                       )})}
                   </div>
               </div>
           </div>
           {isWon && (
             <div className="max-w-3xl mx-auto px-4 pb-6">
               <GameReviewScreen
                 score={score}
                 title={t('timeline.game.header')}
                 items={items.map((item, idx) => ({
                   label: `${idx + 1}. ${item.event}`,
                   detail: item.originalIndex === idx ? null : `Correct position: ${item.originalIndex + 1}`,
                   status: item.originalIndex === idx ? 'correct' : 'incorrect'
                 }))}
                 onPlayAgain={reset}
                 onClose={onClose}
                 t={t}
               />
             </div>
           )}
       </div>
       <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
           <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
               {isWon ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={16}/> {t('timeline.game.complete')}</span> : t('timeline.game.attempts', { attempts })}
           </div>
           <div className="flex gap-3">
               <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2"
                    aria-label={t('timeline.game.reset_aria')}
                    data-help-key="timeline_reset_btn"
               >
                   <RefreshCw size={14}/> {t('timeline.game.reset')}
               </button>
               {!isWon && items.length > 0 && hintsUsed < Math.ceil(items.length / 3) && (
                   <button
                       onClick={useHint}
                       className="px-5 py-2.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-2"
                       aria-label={t('timeline.game.hint_aria') || 'Use a hint'}
                       title={t('timeline.game.hint_tooltip') || 'Move one item to its correct position (-15 pts)'}
                       data-help-key="timeline_hint_btn"
                   >
                       💡 {t('timeline.game.hint') || 'Hint'} <span className="text-[11px] opacity-60">({Math.ceil(items.length / 3) - hintsUsed} {t('common.left') || 'left'})</span>
                   </button>
               )}
               {!isWon && (
                   <button
                       onClick={revealAnswer}
                       className="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-50 text-slate-600 border border-slate-400 hover:bg-slate-100 transition-colors flex items-center gap-2"
                       aria-label={t('timeline.game.reveal_aria') || 'Show the correct answer (no points awarded)'}
                       title={t('timeline.game.reveal_tooltip') || 'Reveal the correct order — no points awarded'}
                       data-help-key="timeline_reveal_btn"
                   >
                       👁 {t('timeline.game.reveal') || 'Show answer'}
                   </button>
               )}
               {!isWon && (
                   <button
                       aria-label={t('common.check_order')}
                        onClick={checkOrder}
                        className="px-6 py-2.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center gap-2"
                        data-help-key="timeline_check_btn"
                   >
                       <CheckCircle2 size={16} /> {t('timeline.game.check_order')}
                   </button>
               )}
           </div>
       </div>
    </div>
  );
});
const ConceptSortGame = React.memo(({ data, onClose, playSound, onGenerateItem, onScoreUpdate, onGameComplete, onExplainIncorrect, imageScale, onImageScaleChange }) => {
  // Image scale: defaults to 1.5 if host doesn't pass one. Bounded 0.5–3.0 to
  // match the host's slider range. Used to scale card visuals during play.
  const _imgScale = (typeof imageScale === 'number' && imageScale >= 0.5 && imageScale <= 3.0) ? imageScale : 1.5;
  const _imgPx = Math.round(64 * _imgScale); // base 64px (w-16 h-16)
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [isChecked, setIsChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [draggedItem, setDraggedItem] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [keyboardSelectedItemId, setKeyboardSelectedItemId] = useState(null);
  const [hasUsedKeyboardCard, setHasUsedKeyboardCard] = useState(false);
  const [hintAutoHidden, setHintAutoHidden] = useState(false);
  const [explanations, setExplanations] = useState({}); // itemId -> text | 'loading'
  const [imageFailCount, setImageFailCount] = useState(0);
  const deckScrollRef = useRef(null);
  const [deckCanScrollRight, setDeckCanScrollRight] = useState(false);
  const [deckCanScrollLeft, setDeckCanScrollLeft] = useState(false);
  const menuRef = useRef(null);
  const isWon = isChecked && items.length > 0 && items.every(i => i.currentContainer === i.categoryId);
  const pastelColors = [
    'bg-blue-50 border-blue-200 hover:border-blue-300',
    'bg-green-50 border-green-200 hover:border-green-300',
    'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
    'bg-purple-50 border-purple-200 hover:border-purple-300',
    'bg-pink-50 border-pink-200 hover:border-pink-300',
    'bg-orange-50 border-orange-200 hover:border-orange-300',
    'bg-teal-50 border-teal-200 hover:border-teal-300',
    'bg-rose-50 border-rose-200 hover:border-rose-300'
  ];
  const bucketColorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-200' },
      red: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-200' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-200' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-200' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-900', border: 'border-teal-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-200' },
      gray: { bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-200' },
      slate: { bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-200' },
      default: { bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-200' }
  };
  useEffect(() => {
    if (!data) return;
    setBuckets(data.categories || []);
    const rawItems = data.items || [];
    const initItems = rawItems.map((item, i) => ({
        ...item,
        currentContainer: 'deck',
        colorIdx: Math.floor(Math.random() * pastelColors.length)
    }));
    for (let i = initItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initItems[i], initItems[j]] = [initItems[j], initItems[i]];
    }
    // Detect partial image coverage: if SOME items have images but not all, the rest failed.
    const withImg = rawItems.filter(it => it.image).length;
    const failed = (withImg > 0 && withImg < rawItems.length) ? (rawItems.length - withImg) : 0;
    setImageFailCount(failed);
    setItems(initItems);
    setIsChecked(false);
    setScore(0);
    setBestScore(0);
    setAttempts(0);
    setExplanations({});
    setKeyboardSelectedItemId(null);
    setHasUsedKeyboardCard(false);
  }, [data]);
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e, targetContainerId) => {
    e.preventDefault();
    if (isChecked || !draggedItem) return;
    setItems(prev => prev.map(item =>
      item.id === draggedItem.id ? { ...item, currentContainer: targetContainerId } : item
    ));
    setDraggedItem(null);
    if(playSound) playSound('click');
  };
  const handleCardKeyDown = (e, item) => {
      if (isChecked) return;
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (keyboardSelectedItemId === item.id) {
              setKeyboardSelectedItemId(null);
          } else {
              setKeyboardSelectedItemId(item.id);
              setHasUsedKeyboardCard(true);
              if (playSound) playSound('click');
          }
      }
  };
  const handleKeyboardMove = (targetContainerId) => {
      if (!keyboardSelectedItemId) return;
      setItems(prev => prev.map(item =>
        item.id === keyboardSelectedItemId ? { ...item, currentContainer: targetContainerId } : item
      ));
      setKeyboardSelectedItemId(null);
      if (playSound) playSound('click');
  };
  useEffect(() => {
      if (keyboardSelectedItemId && menuRef.current) {
          const firstButton = menuRef.current.querySelector('button');
          if (firstButton) firstButton.focus();
      }
  }, [keyboardSelectedItemId]);
  const handleAddItem = async () => {
      if (!newItemText.trim()) return;
      if (!onGenerateItem) {
          alert(t('common.coming_soon'));
          return;
      }
      setIsAdding(true);
      try {
          const newItem = await onGenerateItem(newItemText, buckets);
          if (newItem) {
              setItems(prev => [...prev, {
                  ...newItem,
                  currentContainer: 'deck',
                  colorIdx: prev.length + Math.floor(Math.random() * 10)
              }]);
              setNewItemText('');
              if (playSound) playSound('click');
          }
      } catch (e) {
          warnLog("Add item failed", e);
      } finally {
          setIsAdding(false);
      }
  };
  const checkAnswers = () => {
    let correctCount = 0;
    let incorrectCount = 0;
    items.forEach(item => {
      if (item.currentContainer !== 'deck') {
          if (item.currentContainer === item.categoryId) {
            correctCount++;
          } else {
            incorrectCount++;
          }
      }
    });
    const earnedPoints = Math.max(0, (correctCount * 20) - (incorrectCount * 5));
    const total = items.length;
    setScore(earnedPoints);
    setBestScore(prev => Math.max(prev, earnedPoints));
    setIsChecked(true);
    if (onScoreUpdate && correctCount === total) onScoreUpdate(earnedPoints, "Concept Sort Complete");
    if (correctCount === total) {
        if(playSound) playSound('correct');
        if (onGameComplete) {
          onGameComplete('conceptSort', {
            score: earnedPoints,
            correctPlacements: correctCount,
            totalItems: total,
            isPerfect: incorrectCount === 0,
            attempts: attempts + 1,
            bestScore: Math.max(bestScore, earnedPoints)
          });
        }
    } else {
        if(playSound) playSound('reveal');
    }
  };
  const handleExplainClick = async (item) => {
      if (!onExplainIncorrect) return;
      if (explanations[item.id] && explanations[item.id] !== 'loading') {
          setExplanations(prev => { const next = { ...prev }; delete next[item.id]; return next; });
          return;
      }
      setExplanations(prev => ({ ...prev, [item.id]: 'loading' }));
      try {
          const correct = buckets.find(b => b.id === item.categoryId);
          const chosen = buckets.find(b => b.id === item.currentContainer);
          const text = await onExplainIncorrect(item, correct, chosen);
          setExplanations(prev => ({ ...prev, [item.id]: text || t('concept_sort.why_none') || "No explanation available." }));
      } catch (e) {
          setExplanations(prev => ({ ...prev, [item.id]: t('concept_sort.why_failed') || "Couldn't generate an explanation right now." }));
      }
  };
  const reset = () => {
    const resetItems = items.map(i => ({ ...i, currentContainer: 'deck' }));
    for (let i = resetItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [resetItems[i], resetItems[j]] = [resetItems[j], resetItems[i]];
    }
    setItems(resetItems);
    setIsChecked(false);
    setScore(0);
    setAttempts(prev => prev + 1);
    setExplanations({});
  };
  const renderCard = (item) => {
    let statusClass = `${pastelColors[item.colorIdx % pastelColors.length]} border-2`;
    if (isChecked && item.currentContainer !== 'deck') {
        if (item.currentContainer === item.categoryId) {
            statusClass = "border-green-500 bg-green-50 ring-2 ring-green-200";
        } else {
            statusClass = "border-red-400 bg-red-50 opacity-75 border-dashed";
        }
    }
    if (keyboardSelectedItemId === item.id) {
        statusClass = "border-yellow-400 bg-yellow-50 ring-4 ring-yellow-200 z-30 scale-105";
    }
    return (
      <div
        key={item.id}
        draggable={!isChecked}
        onDragStart={(e) => handleDragStart(e, item)}
        onKeyDown={(e) => handleCardKeyDown(e, item)}
        onClick={() => { if (!isChecked) { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } } }}
        tabIndex={isChecked ? -1 : 0}
        role="button"
        aria-pressed={keyboardSelectedItemId === item.id}
        aria-label={`${item.content}. ${item.currentContainer === 'deck' ? t('concept_sort.unsorted_aria') : t('concept_sort.sorted_aria')}. ${t('concept_sort.move_aria')}`}
        className={`
            relative p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all transform hover:scale-105 mb-2
            ${statusClass} ${isChecked ? 'cursor-default' : ''}
        `}
        data-help-key="concept_sort_card_item"
      >
        {item.image ? (
            <div className="flex flex-col items-center gap-2">
                {/* Card visual: base 64px (w-16 h-16) scaled by host's
                    conceptSortImageScale slider via the imageScale prop. Inline
                    width/height override the Tailwind size classes so the
                    slider feels live during play. */}
                <img loading="lazy"
                    src={item.image}
                    alt={item.content || ''}
                    className="object-contain rounded bg-white/50"
                    style={{ width: _imgPx + 'px', height: _imgPx + 'px' }}
                    decoding="async"
                />
                <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-center leading-tight text-slate-800">{item.content}</p>
                    <SpeakButton text={item.content} size={11} />
                </div>
            </div>
        ) : (
            <div className="flex items-center justify-center gap-1.5">
                <p className="text-sm font-bold text-slate-800 text-center leading-snug">{item.content}</p>
                <SpeakButton text={item.content} size={11} />
            </div>
        )}
        {isChecked && item.currentContainer !== 'deck' && item.currentContainer !== item.categoryId && (
             <>
               <div className="absolute -top-2 -right-2 bg-red-700 text-white rounded-full p-0.5"><X size={12}/></div>
               <div className="mt-1 text-[11px] font-bold text-red-600 text-center leading-tight">
                 ✗ → {buckets.find(b => b.id === item.categoryId)?.label}
               </div>
               {onExplainIncorrect && (
                 <button
                   onClick={(e) => { e.stopPropagation(); handleExplainClick(item); }}
                   className="mt-1 w-full text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:border-indigo-400 rounded px-1 py-0.5 transition-colors"
                   aria-label="Explain why this was incorrect"
                 >
                   {explanations[item.id] === 'loading' ? (t('concept_sort.why_loading') || '…') : (explanations[item.id] ? (t('concept_sort.why_hide') || 'Hide why') : (t('concept_sort.why_label') || 'Why?'))}
                 </button>
               )}
               {explanations[item.id] && explanations[item.id] !== 'loading' && (
                 <div className="mt-1 p-1.5 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-900 leading-snug text-left">
                   {explanations[item.id]}
                 </div>
               )}
             </>
        )}
        {isChecked && item.currentContainer === item.categoryId && (
             <>
               <div className="absolute -top-2 -right-2 bg-green-700 text-white rounded-full p-0.5"><CheckCircle2 size={12}/></div>
               <div className="mt-1 text-[11px] font-bold text-green-600 text-center">✓</div>
             </>
        )}
      </div>
    );
  };
  const deckItems = useMemo(() => items.filter(i => i.currentContainer === 'deck'), [items]);
  const resolveBucketStyles = (rawColor) => {
      const fallbackKey = 'blue';
      if (!rawColor) return bucketColorMap[fallbackKey];
      const cleaned = String(rawColor).replace(/^bg-/, '').replace(/-\d+$/, '').trim().toLowerCase();
      if (bucketColorMap[cleaned]) return bucketColorMap[cleaned];
      if (typeof console !== 'undefined' && console.warn) {
          console.warn('[ConceptSort] Unknown bucket color:', rawColor, '— falling back to blue');
      }
      return bucketColorMap[fallbackKey];
  };
  useEffect(() => {
      const el = deckScrollRef.current;
      if (!el) return;
      const checkScroll = () => {
          setDeckCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
          setDeckCanScrollLeft(el.scrollLeft > 4);
      };
      checkScroll();
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
          el.removeEventListener('scroll', checkScroll);
          window.removeEventListener('resize', checkScroll);
      };
  }, [deckItems.length]);
  // Auto-hide the keyboard tip after 15 seconds if user never engages with it.
  useEffect(() => {
      if (hasUsedKeyboardCard || hintAutoHidden) return;
      const id = setTimeout(() => setHintAutoHidden(true), 15000);
      return () => clearTimeout(id);
  }, [hasUsedKeyboardCard, hintAutoHidden]);
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in fade-in duration-300" data-help-key="concept_sort_game">
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0 shadow-md z-20">
        <div>
            <h3 className="font-bold text-lg flex items-center gap-2" data-help-key="concept_sort_header">
                <Filter size={20} className="text-yellow-400"/> {t('concept_sort.title')}
            </h3>
            <p className="text-xs text-indigo-200">{t('concept_sort.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-indigo-800/50 px-4 py-1.5 rounded-full border border-indigo-500 flex items-center gap-2">
                <Trophy size={14} className="text-yellow-400"/>
                <span className="font-bold text-sm">{score} pts</span>
            </div>
            <GameThemeToggle />
            <button onClick={onClose} className="p-2 hover:bg-indigo-500 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label={t('concept_sort.close_aria')}><X size={24}/></button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-6 relative">
           <div className="flex flex-wrap justify-center gap-6 mb-12 min-h-[300px]">
               {buckets.map((bucket) => {
                   const styles = resolveBucketStyles(bucket.color);
                   return (
                       <div
                            key={bucket.id}
                            data-help-key="concept_sort_bucket"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, bucket.id)}
                            className={`flex-1 min-w-[250px] max-w-sm bg-slate-100 rounded-xl border-2 border-dashed transition-all p-4 flex flex-col ${isChecked ? 'border-slate-300' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                       >
                           <div className={`text-center p-3 rounded-lg font-bold mb-4 shadow-sm border ${styles.bg} ${styles.text} ${styles.border}`}>
                               {bucket.label}
                           </div>
                           <div className="flex-grow space-y-2 min-h-[100px]">
                               {items.filter(i => i.currentContainer === bucket.id).map(item => <React.Fragment key={item.id}>{renderCard(item)}</React.Fragment>)}
                               {items.filter(i => i.currentContainer === bucket.id).length === 0 && (
                                   <div className="text-center text-slate-600 text-xs italic py-8 opacity-50">{t('concept_sort.drop_placeholder')}</div>
                               )}
                           </div>
                           {keyboardSelectedItemId && (
                               <button
                                    onClick={() => handleKeyboardMove(bucket.id)}
                                    className="w-full mt-2 py-2 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border-2 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300 animate-pulse"
                               >
                                   {t('concept_sort.move_here')}
                               </button>
                           )}
                       </div>
                   );
               })}
           </div>
           {isWon && (
             <GameReviewScreen
               score={score}
               title={t('concept_sort.title')}
               items={items.map(i => ({
                 label: i.content,
                 detail: buckets.find(b => b.id === i.categoryId)?.label || i.categoryId,
                 status: i.currentContainer === i.categoryId ? 'correct' : 'incorrect'
               }))}
               onPlayAgain={reset}
               onClose={onClose}
               t={t}
             />
           )}
           <div
                data-help-key="concept_sort_deck"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'deck')}
                className={`bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 p-4 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 ${isChecked ? '' : 'hover:bg-slate-50'}`}
            >
               <div className="max-w-6xl mx-auto relative">
                   <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-3 flex-wrap">
                           <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t('concept_sort.unsorted_cards')} ({deckItems.length})</h4>
                           {keyboardSelectedItemId && !hasUsedKeyboardCard && (
                               <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                   Now pick a category to drop this card into.
                               </span>
                           )}
                           {!keyboardSelectedItemId && !hasUsedKeyboardCard && !hintAutoHidden && items.length > 0 && (
                               <span className="text-[11px] text-slate-600 italic">
                                   Tip: press Enter on a card to sort with the keyboard.
                               </span>
                           )}
                           {attempts > 0 && (
                               <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                   Try {attempts + 1}{bestScore > 0 ? ` · Best: ${bestScore} pts` : ''}
                               </span>
                           )}
                           {imageFailCount > 0 && (
                               <span className="text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                                   {imageFailCount} card visual{imageFailCount === 1 ? '' : 's'} couldn't load — text only.
                               </span>
                           )}
                       </div>
                       <div className="flex gap-2 items-center">
                           {/* Live image-size slider — visible during play so the
                               teacher (or a sensory-sensitive student) can dial
                               card visuals up/down without leaving the activity.
                               Only shown when the host wired onImageScaleChange
                               AND the deck actually has any images to scale. */}
                           {typeof onImageScaleChange === 'function' && items.some(i => i.image) && (
                               <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-full">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Size</span>
                                   <input
                                       type="range"
                                       min="0.5"
                                       max="2.5"
                                       step="0.05"
                                       value={_imgScale}
                                       onChange={(e) => onImageScaleChange(parseFloat(e.target.value) || 1.0)}
                                       aria-label={`Card image size, ${_imgScale.toFixed(2)} times`}
                                       className="w-20 sm:w-28 accent-indigo-600"
                                   />
                                   <span className="text-[10px] font-mono text-indigo-700 min-w-[2.5em] text-right">{_imgScale.toFixed(2)}×</span>
                               </div>
                           )}
                           <button
                                data-help-key="concept_sort_reset"
                                onClick={reset}
                                className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-400 transition-colors"
                                aria-label={t('concept_sort.reset_board')}
                           >
                               {t('concept_sort.reset_board')}
                           </button>
                           <button
                               aria-label={t('common.check_answers')}
                                data-help-key="concept_sort_check_answers"
                                onClick={checkAnswers}
                                disabled={isChecked || items.some(i => i.currentContainer === 'deck')}
                                className="px-6 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                           >
                               {t('concept_sort.check_answers')}
                           </button>
                       </div>
                   </div>
                   <div ref={deckScrollRef} className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar min-h-[140px] relative">
                       <div className="min-w-[160px] w-[160px] h-[120px] bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-3 shrink-0 hover:border-indigo-300 transition-colors group">
                           {isAdding ? (
                               <div className="text-center text-indigo-500 text-xs font-bold animate-pulse">{t('concept_sort.generating_item')}</div>
                           ) : (
                               <>
                                   <input
                                       data-help-key="concept_sort_add_item"
                                       type="text"
                                       value={newItemText}
                                       onChange={(e) => setNewItemText(e.target.value)}
                                       onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                       placeholder={t('concept_sort.add_item_placeholder')}
                                       className="w-full text-xs text-center p-1 bg-transparent border-b border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                                       aria-label={t('concept_sort.add_item_placeholder')}
                                   />
                                    <button aria-label={t('common.add')}
                                        onClick={handleAddItem}
                                        disabled={!newItemText.trim()}
                                        className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-full p-1.5 shadow-sm disabled:opacity-50"
                                        data-help-key="concept_sort_add_btn"
                                    >
                                       <Plus size={16}/>
                                   </button>
                               </>
                           )}
                       </div>
                       {deckItems.map(item => (
                           <div key={item.id} className="shrink-0 w-[160px]">
                               {renderCard(item)}
                           </div>
                       ))}
                       {deckItems.length === 0 && !isWon && (
                           <div className="text-slate-600 italic font-bold text-sm mt-4 text-center w-full">
                               {t('concept_sort.word_bank_empty')}
                           </div>
                       )}
                   </div>
                   {deckCanScrollLeft && (
                       <button
                           onClick={() => {
                               const el = deckScrollRef.current;
                               if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                           }}
                           className="absolute left-2 top-1/2 -translate-y-1/2 bg-white border border-slate-400 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-slate-50 text-slate-600"
                           aria-label="Scroll deck left"
                       >
                           ‹
                       </button>
                   )}
                   {deckCanScrollRight && (
                       <button
                           onClick={() => {
                               const el = deckScrollRef.current;
                               if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                           }}
                           className="absolute right-2 top-1/2 -translate-y-1/2 bg-white border border-slate-400 rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-slate-50 text-slate-600"
                           aria-label="Scroll deck right to see more cards"
                       >
                           ›
                       </button>
                   )}
               </div>
           </div>
           <div ref={menuRef} className="sr-only">
           </div>
      </div>
    </div>
  );
});
const BOTH_TRANSLATIONS = { English: 'Both', Spanish: 'Ambos', French: 'Les deux', Arabic: 'كلاهما', Chinese: '两者', Japanese: '両方', Korean: '둘 다', Portuguese: 'Ambos', German: 'Beide', Italian: 'Entrambi', Russian: 'Оба', Hindi: 'दोनों', Turkish: 'Her ikisi', Vietnamese: 'Cả hai', Thai: 'ทั้งสอง', Hebrew: 'שניהם', Swahili: 'Zote mbili', Dutch: 'Beide', Polish: 'Oba', Ukrainian: 'Обидва' };
const VennGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, titles = { setA: { text: "Set A" }, setB: { text: "Set B" } }, primaryLanguage = "English" }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [gameLang, setGameLang] = useState('primary');
  const [keyboardSelectedItemId, setKeyboardSelectedItemId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [lastHint, setLastHint] = useState(null);
  const moveMenuRef = useRef(null);
  const hintTimerRef = useRef(null);
  const showZoneHint = (correctZone) => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      setLastHint(correctZone);
      hintTimerRef.current = setTimeout(() => setLastHint(null), 3000);
  };
  useEffect(() => {
      if (keyboardSelectedItemId && moveMenuRef.current) {
          const firstBtn = moveMenuRef.current.querySelector('button');
          if (firstBtn) firstBtn.focus();
      }
  }, [keyboardSelectedItemId]);
  useEffect(() => {
    const normalize = (item, zone) => {
        const text = typeof item === 'object' ? item.text : item;
        const translation = typeof item === 'object' ? item.translation : null;
        return {
            id: `v-${Math.random().toString(36).substr(2,9)}`,
            text,
            translation,
            correctZone: zone,
            currentZone: 'bank',
        };
    };
    const allItems = [
        ...(data.setA || []).map(i => normalize(i, 'setA')),
        ...(data.setB || []).map(i => normalize(i, 'setB')),
        ...(data.shared || []).map(i => normalize(i, 'shared'))
    ];
    for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }
    setItems(allItems);
    setScore(0);
    setIsWon(false);
  }, [data]);
  const handleItemKeyDown = (e, item) => {
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (keyboardSelectedItemId === item.id) {
              setKeyboardSelectedItemId(null);
              setAnnouncement(t('concept_map.venn.selection_cancelled'));
          } else {
              setKeyboardSelectedItemId(item.id);
              setAnnouncement(t('concept_map.venn.item_selected', { item: getText(item) }));
              if (playSound) playSound('click');
          }
      }
  };
  const handleKeyboardMove = (targetZone) => {
      if (!keyboardSelectedItemId) return;
      const itemIndex = items.findIndex(i => i.id === keyboardSelectedItemId);
      if (itemIndex === -1) return;
      const item = items[itemIndex];
      const itemName = item ? getText(item) : "Item";
      if (targetZone === 'bank') {
           setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentZone: 'bank' } : i));
           setAnnouncement(t('concept_map.venn.move_neutral', { item: itemName }));
           if (playSound) playSound('click');
      } else {
           if (item.correctZone === targetZone) {
               setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentZone: targetZone } : i));
               setScore(s => s + 20);
               if(playSound) playSound('correct');
               setAnnouncement(t('concept_map.venn.move_correct', { item: itemName, zone: getTitle(targetZone) }));
           } else {
               setAttempts(a => a + 1);
               setScore(s => Math.max(0, s - 5));
               if(playSound) playSound('incorrect');
               showZoneHint(item.correctZone);
               setAnnouncement(t('concept_map.venn.move_incorrect', { item: itemName }));
           }
      }
      setKeyboardSelectedItemId(null);
  };
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, zone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropZone !== zone) setActiveDropZone(zone);
  };
  const handleDragLeave = () => {
    setActiveDropZone(null);
  };
  const handleDrop = (e, targetZone) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropZone(null);
      if (!draggedItem) return;
      if (draggedItem.correctZone === targetZone) {
          if (playSound) playSound('correct');
          setItems(prev => prev.map(i => i.id === draggedItem.id ? { ...i, currentZone: targetZone } : i));
          setScore(s => s + 20);
      } else {
          if (playSound) playSound('incorrect');
          setAttempts(a => a + 1);
          setScore(s => Math.max(0, s - 5));
          showZoneHint(draggedItem.correctZone);
      }
      setDraggedItem(null);
  };
  useEffect(() => {
      if (!isWon && items.length > 0 && items.every(i => i.currentZone !== 'bank')) {
          setIsWon(true);
          if(onScoreUpdate) onScoreUpdate(score, "Venn Diagram Sort");
          playSound('correct');
          if (onGameComplete) {
            onGameComplete('vennDiagram', {
              score: score,
              itemsSorted: items.length,
              totalItems: data?.length || items.length,
              incorrectAttempts: attempts
            });
          }
      }
  }, [items, score, onScoreUpdate, playSound, isWon]);
  const getText = (item) => {
      if (gameLang === 'english' && item.translation) return item.translation;
      return item.text;
  };
  const bothLabel = BOTH_TRANSLATIONS[primaryLanguage] || BOTH_TRANSLATIONS.English;
  const getTitle = (key) => {
      if (key === 'shared') return titles.shared ? (typeof titles.shared === 'string' ? titles.shared : titles.shared.text || bothLabel) : bothLabel;
      const t = titles[key];
      if (!t) return "";
      if (typeof t === 'string') return t;
      if (gameLang === 'english' && t.trans) return t.trans;
      return t.text || "";
  };
  const hasTranslations = items.some(i => i.translation);
  const vennSetA = useMemo(() => items.filter(i => i.currentZone === 'setA'), [items]);
  const vennSetB = useMemo(() => items.filter(i => i.currentZone === 'setB'), [items]);
  const vennShared = useMemo(() => items.filter(i => i.currentZone === 'shared'), [items]);
  const vennBank = useMemo(() => items.filter(i => i.currentZone === 'bank'), [items]);
  return (
      <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in zoom-in-95" data-help-key="venn_game_container">
          <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
          <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-30">
              <h3 className="font-bold text-xl flex items-center gap-2" data-help-key="venn_header">
                  <Layout size={24}/> {t('common.venn_sort_title')}
              </h3>
              <div className="flex items-center gap-4">
                  {hasTranslations && (
                      <select aria-label={t('common.selection')}
                          value={gameLang}
                          onChange={(e) => setGameLang(e.target.value)}
                          className="text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer shadow-sm"
                      >
                          <option value="primary">{primaryLanguage}</option>
                          <option value="english">{t('languages.english')}</option>
                      </select>
                  )}
                  <div className="bg-indigo-800 px-4 py-1 rounded-full font-bold text-yellow-200 border border-indigo-500">
                      {t('common.score')}: {score}
                  </div>
                  <GameThemeToggle />
                  <button
                      aria-label={t('common.close')}
                      onClick={onClose}
                      data-help-key="venn_back_btn"
                      className="flex items-center gap-1 text-xs font-bold bg-indigo-700 hover:bg-indigo-500 px-3 py-1.5 rounded-full transition-colors border border-indigo-400"
                  >
                      <ArrowDown className="rotate-90" size={14}/> {t('concept_map.venn.back_to_editor')}
                  </button>
              </div>
          </div>
          <div className="flex-grow relative bg-slate-100 overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
              {isWon && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="venn-victory-title">
                    <div className={`bg-white p-8 rounded-3xl text-center shadow-2xl ${!useReducedMotion() ? 'animate-bounce' : ''}`}>
                        <h2 id="venn-victory-title" className="text-4xl font-black text-indigo-600 mb-2">{t('concept_map.venn.victory_title')}</h2>
                        <p className="text-slate-600">{t('concept_map.venn.victory_desc')}</p>
                    </div>
                    {!useReducedMotion() && <ConfettiExplosion />}
                </div>
              )}
              {lastHint && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-100 border-2 border-amber-400 text-amber-800 px-5 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
                    <HelpCircle size={16} /> Try: {lastHint === 'shared' ? (getTitle('shared') || 'Both') : getTitle(lastHint)}
                </div>
              )}
              {keyboardSelectedItemId && (
                <div
                    className="absolute inset-0 z-50 bg-black/10 backdrop-blur-[2px] flex items-center justify-center"
                    onClick={() => setKeyboardSelectedItemId(null)}
                >
                    <div
                        ref={moveMenuRef}
                        className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-indigo-500 flex flex-col gap-3 animate-in zoom-in duration-200"
                        role="dialog"
                        aria-label={t('concept_map.venn.choose_dest_aria')}
                        onClick={e => e.stopPropagation()}
                    >
                        <h4 className="text-sm font-bold text-slate-700 text-center mb-2">{t('concept_map.venn.move_menu_title')}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button data-help-key="venn_move_a" onClick={() => handleKeyboardMove('setA')} className="px-4 py-3 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold text-xs transition-colors border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500">
                                {getTitle('setA')}
                            </button>
                            <button data-help-key="venn_move_b" onClick={() => handleKeyboardMove('setB')} className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl font-bold text-xs transition-colors border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {getTitle('setB')}
                            </button>
                            <button data-help-key="venn_move_shared" onClick={() => handleKeyboardMove('shared')} className="col-span-2 px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl font-bold text-xs transition-colors border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500">
                                {getTitle('shared') || t('concept_map.venn.shared_fallback')}
                            </button>
                            <button data-help-key="venn_move_bank" onClick={() => handleKeyboardMove('bank')} className="col-span-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors border border-slate-400 mt-2 focus:outline-none focus:ring-2 focus:ring-slate-500">
                                {t('concept_map.venn.return_bank')}
                            </button>
                        </div>
                        <button data-help-key="venn_move_cancel" onClick={() => setKeyboardSelectedItemId(null)} className="mt-2 text-xs text-slate-600 hover:text-slate-600 underline text-center focus:outline-none focus:ring-2 focus:ring-slate-400 rounded">{t('concept_map.venn.cancel_selection')}</button>
                    </div>
                </div>
              )}
              <div className="w-full max-w-[800px] flex justify-between px-4 md:px-12 mb-2 z-20 pointer-events-none">
                  <div className="bg-rose-100/90 backdrop-blur-sm border-2 border-rose-300 text-rose-800 font-black uppercase tracking-widest px-6 py-2 rounded-2xl shadow-sm max-w-[300px] text-center pointer-events-auto transform -rotate-2">
                      {getTitle('setA')}
                  </div>
                  <div className="bg-blue-100/90 backdrop-blur-sm border-2 border-blue-300 text-blue-800 font-black uppercase tracking-widest px-6 py-2 rounded-2xl shadow-sm max-w-[300px] text-center pointer-events-auto transform rotate-2">
                      {getTitle('setB')}
                  </div>
              </div>
              <div className="relative w-full max-w-[800px] h-[300px] md:h-[500px] flex items-center justify-center select-none scale-[0.6] md:scale-100 origin-center">
                  <div
                      onDrop={(e) => handleDrop(e, 'setA')}
                      onDragOver={(e) => handleDragOver(e, 'setA')}
                      onDragLeave={handleDragLeave}
                      className={`absolute left-0 w-[500px] h-[500px] rounded-full border-4 flex flex-col items-start justify-center pl-24 transition-all duration-300
                        ${activeDropZone === 'setA' ? 'bg-rose-200/60 border-rose-500 scale-[1.02] z-10 shadow-[0_0_30px_rgba(244,63,94,0.3)]' : 'bg-gradient-to-br from-rose-100/50 to-rose-200/30 border-rose-300'}
                      `}
                      data-help-key="venn_drop_zone_a"
                  >
                      <div className="flex flex-wrap gap-2 w-64 content-center justify-center pr-12 h-64 overflow-y-auto custom-scrollbar">
                          {vennSetA.map(item => (
                              <div
                                key={item.id}
                                tabIndex={0}
                                role="button"
                                aria-label={t('concept_map.venn.item_aria', { item: getText(item), zone: getTitle('setA') })}
                                aria-pressed={keyboardSelectedItemId === item.id}
                                onKeyDown={(e) => handleItemKeyDown(e, item)}
                                onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                                data-help-key="venn_sorted_item" className={`bg-white text-rose-700 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border-b-2 border-rose-200 animate-in zoom-in cursor-pointer hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
                              >
                                {getText(item)}
                              </div>
                          ))}
                      </div>
                  </div>
                  <div
                      onDrop={(e) => handleDrop(e, 'setB')}
                      onDragOver={(e) => handleDragOver(e, 'setB')}
                      onDragLeave={handleDragLeave}
                      className={`absolute right-0 w-[500px] h-[500px] rounded-full border-4 flex flex-col items-end justify-center pr-24 transition-all duration-300
                        ${activeDropZone === 'setB' ? 'bg-blue-200/60 border-blue-500 scale-[1.02] z-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'bg-gradient-to-bl from-blue-100/50 to-blue-200/30 border-blue-300'}
                      `}
                      data-help-key="venn_drop_zone_b"
                  >
                      <div className="flex flex-wrap gap-2 w-64 content-center justify-center pl-12 h-64 overflow-y-auto custom-scrollbar">
                          {vennSetB.map(item => (
                              <div
                                key={item.id}
                                tabIndex={0}
                                role="button"
                                aria-label={t('concept_map.venn.item_aria', { item: getText(item), zone: getTitle('setB') })}
                                aria-pressed={keyboardSelectedItemId === item.id}
                                onKeyDown={(e) => handleItemKeyDown(e, item)}
                                onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                                data-help-key="venn_sorted_item" className={`bg-white text-blue-700 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border-b-2 border-blue-200 animate-in zoom-in cursor-pointer hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
                              >
                                {getText(item)}
                              </div>
                          ))}
                      </div>
                  </div>
                  <div
                      onDrop={(e) => handleDrop(e, 'shared')}
                      onDragOver={(e) => handleDragOver(e, 'shared')}
                      onDragLeave={handleDragLeave}
                      className={`absolute w-[180px] h-[340px] z-20 flex flex-col items-center justify-center rounded-[50%] transition-all duration-300
                        ${activeDropZone === 'shared' ? 'bg-purple-200/40 border-2 border-purple-500 scale-105 shadow-[0_0_40px_rgba(168,85,247,0.4)]' : 'hover:bg-purple-100/20'}
                      `}
                      data-help-key="venn_drop_zone_shared"
                  >
                      <h4 className="font-black text-purple-800 uppercase tracking-widest bg-white/90 px-3 py-1 rounded-full mb-2 shadow-sm text-[11px] border border-purple-100 opacity-60 hover:opacity-100 transition-opacity">{t('concept_map.venn.shared_label')}</h4>
                      <div className="flex flex-wrap gap-1.5 justify-center w-full overflow-y-auto max-h-[80%] p-2 custom-scrollbar">
                          {vennShared.map(item => (
                              <div
                                key={item.id}
                                tabIndex={0}
                                role="button"
                                aria-label={t('concept_map.venn.item_aria', { item: getText(item), zone: t('concept_map.venn.shared_label') })}
                                aria-pressed={keyboardSelectedItemId === item.id}
                                onKeyDown={(e) => handleItemKeyDown(e, item)}
                                onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                                data-help-key="venn_sorted_item" className={`bg-white text-purple-700 px-2 py-1 rounded shadow-sm text-[11px] font-bold border-b-2 border-purple-200 animate-in zoom-in cursor-pointer hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
                              >
                                {getText(item)}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
          <div className="h-44 bg-slate-50 border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40" data-help-key="venn_item_bank">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2 text-center">{t('concept_sort.instructions')}</div>
              <div className="flex flex-wrap gap-3 justify-center overflow-y-auto h-full pb-8">
                  {vennBank.map(item => (
                      <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          tabIndex={0}
                          role="button"
                          aria-label={t('concept_map.venn.item_aria', { item: getText(item), zone: t('concept_sort.unsorted_aria') })}
                          aria-pressed={keyboardSelectedItemId === item.id}
                          onKeyDown={(e) => handleItemKeyDown(e, item)}
                          onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                          data-help-key="venn_bank_item" className={`bg-white px-4 py-2 rounded-xl shadow-sm border-b-4 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 cursor-grab active:cursor-grabbing active:border-b-0 active:translate-y-1 transition-all text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 text-center animate-in zoom-in duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 border-yellow-500 z-50 scale-110' : ''}`}
                      >
                          {getText(item)}
                          <SpeakButton text={getText(item)} size={11} />
                      </div>
                  ))}
                  {vennBank.length === 0 && !isWon && (
                      <div className="text-slate-600 italic font-bold text-sm mt-4 text-center w-full">
                          {t('concept_map.venn.bank_empty')}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
});
const CauseEffectSortGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [keyboardSelectedItemId, setKeyboardSelectedItemId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [lastHint, setLastHint] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const moveMenuRef = useRef(null);
  const hintTimerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const playAgainRef = useRef(null);
  const triggerElRef = useRef(null);
  // Snapshot the focused element on mount so we can restore on unmount.
  useEffect(() => {
    triggerElRef.current = (typeof document !== 'undefined') ? document.activeElement : null;
    if (gameContainerRef.current) gameContainerRef.current.focus();
    return () => {
      if (triggerElRef.current && typeof triggerElRef.current.focus === 'function') {
        try { triggerElRef.current.focus(); } catch (_) {}
      }
    };
  }, []);
  // When the game is won, focus moves to Play Again so keyboard users can act immediately.
  useEffect(() => {
    if (isWon && playAgainRef.current) playAgainRef.current.focus();
  }, [isWon]);
  const confirmResetTimerRef = useRef(null);
  const showZoneHint = (correctZone) => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      setLastHint(correctZone);
      hintTimerRef.current = setTimeout(() => setLastHint(null), 3000);
  };
  useEffect(() => {
      if (keyboardSelectedItemId && moveMenuRef.current) {
          const firstBtn = moveMenuRef.current.querySelector('button');
          if (firstBtn) firstBtn.focus();
      }
  }, [keyboardSelectedItemId]);
  // Serialize data to detect actual content changes, not just reference changes
  const dataFingerprint = useMemo(() => {
    if (!data || !data.causes || !data.effects) return '';
    return JSON.stringify([data.causes, data.effects]);
  }, [data]);

  useEffect(() => {
    if (!dataFingerprint || !data) return;
    const allItems = [
        ...(data.causes || []).map((text, i) => ({
            id: `ce-c-${i}-${Math.random().toString(36).substr(2,6)}`,
            text: typeof text === 'object' ? text.text || text : text,
            correctZone: 'causes',
            currentZone: 'bank',
        })),
        ...(data.effects || []).map((text, i) => ({
            id: `ce-e-${i}-${Math.random().toString(36).substr(2,6)}`,
            text: typeof text === 'object' ? text.text || text : text,
            correctZone: 'effects',
            currentZone: 'bank',
        }))
    ];
    for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }
    setItems(allItems);
    setScore(0);
    setIsWon(false);
    setAttempts(0);
  }, [dataFingerprint]);
  const handleItemKeyDown = (e, item) => {
      if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (keyboardSelectedItemId === item.id) {
              setKeyboardSelectedItemId(null);
              setAnnouncement('Selection cancelled.');
          } else {
              setKeyboardSelectedItemId(item.id);
              setAnnouncement(`Selected: ${item.text}. Choose Causes or Effects to sort.`);
              if (playSound) playSound('click');
          }
      }
  };
  const handleKeyboardMove = (targetZone) => {
      if (!keyboardSelectedItemId) return;
      const item = items.find(i => i.id === keyboardSelectedItemId);
      if (!item) return;
      if (targetZone === 'bank') {
           setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentZone: 'bank' } : i));
           setAnnouncement(`Moved "${item.text}" back to the bank.`);
           if (playSound) playSound('click');
      } else {
           if (item.correctZone === targetZone) {
               setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentZone: targetZone } : i));
               setScore(s => s + 20);
               if(playSound) playSound('correct');
               setAnnouncement(`Correct! "${item.text}" is a ${targetZone === 'causes' ? 'Cause' : 'Effect'}.`);
           } else {
               setAttempts(a => a + 1);
               setScore(s => Math.max(0, s - 5));
               if(playSound) playSound('incorrect');
               showZoneHint(item.correctZone);
               setAnnouncement(`Incorrect. "${item.text}" does not belong in ${targetZone === 'causes' ? 'Causes' : 'Effects'}.`);
           }
      }
      setKeyboardSelectedItemId(null);
  };
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, zone) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (activeDropZone !== zone) setActiveDropZone(zone);
  };
  const handleDragLeave = () => {
    setActiveDropZone(null);
  };
  const handleDrop = (e, targetZone) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveDropZone(null);
      if (!draggedItem) return;
      if (draggedItem.correctZone === targetZone) {
          if (playSound) playSound('correct');
          setItems(prev => prev.map(i => i.id === draggedItem.id ? { ...i, currentZone: targetZone } : i));
          setScore(s => s + 20);
      } else {
          if (playSound) playSound('incorrect');
          setAttempts(a => a + 1);
          setScore(s => Math.max(0, s - 5));
          showZoneHint(draggedItem.correctZone);
      }
      setDraggedItem(null);
  };
  useEffect(() => {
      if (!isWon && items.length > 0 && items.every(i => i.currentZone !== 'bank')) {
          setIsWon(true);
          if(onScoreUpdate) onScoreUpdate(score, "Cause & Effect Sort");
          if (playSound) playSound('correct');
          if (onGameComplete) {
            onGameComplete('causeEffectSort', {
              score: score,
              itemsSorted: items.length,
              totalItems: items.length,
              incorrectAttempts: attempts
            });
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isWon]);
  const reset = () => {
      const shuffled = [...items].map(i => ({ ...i, currentZone: 'bank' }));
      for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setItems(shuffled);
      setScore(0);
      setIsWon(false);
      setAttempts(0);
      setLastHint(null);
  };
  const handleResetClick = () => {
      if (confirmingReset) {
          if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
          setConfirmingReset(false);
          reset();
          return;
      }
      setConfirmingReset(true);
      setAnnouncement(t('games.ce_sort.reset_confirm_aria') || 'Press Reset again to confirm clearing the board, or wait to cancel.');
      if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
      confirmResetTimerRef.current = setTimeout(() => setConfirmingReset(false), 3000);
  };
  const causesItems = useMemo(() => items.filter(i => i.currentZone === 'causes'), [items]);
  const effectsItems = useMemo(() => items.filter(i => i.currentZone === 'effects'), [items]);
  const bankItems = useMemo(() => items.filter(i => i.currentZone === 'bank'), [items]);
  return (
      <div ref={gameContainerRef} tabIndex={-1} className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in zoom-in-95 focus:outline-none">
          <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
          <div className="bg-gradient-to-r from-orange-600 to-teal-600 p-4 text-white flex justify-between items-center shadow-md z-30">
              <div>
                  <h3 className="font-bold text-xl flex items-center gap-2">
                      <ArrowRight size={24}/> {t('games.ce_sort.title') || 'Cause & Effect Sort'}
                  </h3>
                  {topicTitle && <p className="text-xs text-white/70 mt-0.5">{topicTitle}</p>}
              </div>
              <div className="flex items-center gap-4">
                  <div className="bg-white/30 px-4 py-1 rounded-full font-bold text-yellow-200 border border-white/40">
                      {t('common.score') || 'Score'}: {score}
                  </div>
                  <GameThemeToggle />
                  <button
                      aria-label={t('common.close') || 'Close'}
                      onClick={onClose}
                      className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors border border-white/30"
                  >
                      <ArrowDown className="rotate-90" size={14}/> {t('concept_map.venn.back_to_editor') || 'Back'}
                  </button>
              </div>
          </div>
          <div className="flex-grow relative overflow-hidden flex flex-col lg:flex-row items-stretch">
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
              {isWon && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className={`bg-white p-8 rounded-3xl text-center shadow-2xl ${!useReducedMotion() ? 'animate-bounce' : ''}`}>
                        <h2 className="text-4xl font-black text-indigo-600 mb-2">{t('concept_map.venn.victory_title') || '🎉 Perfect!'}</h2>
                        <p className="text-slate-600">{t('games.ce_sort.victory_desc') || 'You sorted all causes and effects correctly!'}</p>
                        <p className="text-2xl font-black text-yellow-500 mt-2">{score} pts</p>
                        <div className="flex gap-3 mt-4 justify-center">
                            <button ref={playAgainRef} onClick={reset} className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <RefreshCw size={14}/> Play Again
                            </button>
                            <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-300 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                    {!useReducedMotion() && <ConfettiExplosion />}
                </div>
              )}
              {lastHint && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-100 border-2 border-amber-400 text-amber-800 px-5 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
                    <HelpCircle size={16} /> {t('games.ce_sort.hint_try') || 'Try'}: {lastHint === 'causes' ? (t('games.ce_sort.causes_label') || '🔶 Causes') : (t('games.ce_sort.effects_label') || '🟦 Effects')}
                </div>
              )}
              {keyboardSelectedItemId && (
                <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center pointer-events-none px-4">
                    <div
                        ref={moveMenuRef}
                        className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-500 flex flex-col gap-2 animate-in zoom-in duration-200 max-w-md w-full pointer-events-auto"
                        role="dialog"
                        aria-label="Choose a zone"
                    >
                        <h4 className="text-xs font-bold text-slate-700 text-center mb-1">{t('concept_sort.tap_target') || 'Tap a zone above, or pick one here:'}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleKeyboardMove('causes')} className="px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-xl font-bold text-xs transition-colors border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500">
                                🔶 {t('games.ce_sort.causes_label') || 'Causes'}
                            </button>
                            <button onClick={() => handleKeyboardMove('effects')} className="px-4 py-3 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-xl font-bold text-xs transition-colors border border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500">
                                🟦 {t('games.ce_sort.effects_label') || 'Effects'}
                            </button>
                            <button onClick={() => handleKeyboardMove('bank')} className="col-span-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors border border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500">
                                {t('concept_map.venn.return_bank') || 'Return to bank'}
                            </button>
                        </div>
                        <button onClick={() => setKeyboardSelectedItemId(null)} className="mt-1 text-xs text-slate-600 hover:text-slate-800 underline text-center focus:outline-none focus:ring-2 focus:ring-slate-400 rounded">{t('concept_map.venn.cancel_selection') || 'Cancel'}</button>
                    </div>
                </div>
              )}
              {/* Causes drop zone */}
              <div
                  onDrop={(e) => handleDrop(e, 'causes')}
                  onDragOver={(e) => handleDragOver(e, 'causes')}
                  onDragLeave={handleDragLeave}
                  onClick={keyboardSelectedItemId ? () => handleKeyboardMove('causes') : undefined}
                  role={keyboardSelectedItemId ? 'button' : undefined}
                  tabIndex={keyboardSelectedItemId ? 0 : undefined}
                  aria-label={keyboardSelectedItemId ? 'Place selected item into Causes' : undefined}
                  onKeyDown={keyboardSelectedItemId ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeyboardMove('causes'); } } : undefined}
                  className={`flex-1 flex flex-col items-center justify-start p-6 transition-all duration-300 relative z-10
                    ${activeDropZone === 'causes' ? 'bg-orange-200/60 scale-[1.01] shadow-[inset_0_0_40px_rgba(251,146,60,0.3)]' : 'bg-gradient-to-b from-orange-50/80 to-orange-100/40'}
                    ${keyboardSelectedItemId ? 'cursor-pointer ring-2 ring-yellow-300/60' : ''}
                  `}
              >
                  <div className={`bg-orange-200/80 backdrop-blur-sm border-2 border-orange-300 text-orange-800 font-black uppercase tracking-widest px-6 py-2 rounded-2xl shadow-sm text-center mb-4 transform -rotate-1 ${keyboardSelectedItemId ? 'ring-4 ring-yellow-300' : ''}`}>
                      🔶 {t('games.ce_sort.causes_label') || 'Causes'}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center content-start flex-grow w-full max-w-sm overflow-y-auto custom-scrollbar p-2">
                      {causesItems.map(item => (
                          <div
                            key={item.id}
                            tabIndex={0}
                            role="button"
                            aria-label={`${item.text}, sorted into Causes`}
                            aria-pressed={keyboardSelectedItemId === item.id}
                            onKeyDown={(e) => handleItemKeyDown(e, item)}
                            onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                            className={`bg-white text-orange-800 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border-l-4 border-orange-400 animate-in zoom-in cursor-pointer hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center gap-1.5 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
                          >
                            {item.text}
                            <SpeakButton text={item.text} size={11} />
                          </div>
                      ))}
                      {causesItems.length === 0 && (
                          <div className="text-orange-400 italic text-xs mt-8 text-center w-full">{t('concept_sort.drop_placeholder') || 'Drop causes here'}</div>
                      )}
                  </div>
              </div>
              {/* Center divider with arrow */}
              <div className="hidden lg:flex flex-col items-center justify-center w-16 z-20 relative">
                  <div className="w-0.5 h-full bg-slate-200"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 bg-white p-2 rounded-full border-2 border-slate-200 shadow-sm">
                      <ArrowRight size={20} className="text-slate-400" />
                  </div>
              </div>
              {/* Effects drop zone */}
              <div
                  onDrop={(e) => handleDrop(e, 'effects')}
                  onDragOver={(e) => handleDragOver(e, 'effects')}
                  onDragLeave={handleDragLeave}
                  onClick={keyboardSelectedItemId ? () => handleKeyboardMove('effects') : undefined}
                  role={keyboardSelectedItemId ? 'button' : undefined}
                  tabIndex={keyboardSelectedItemId ? 0 : undefined}
                  aria-label={keyboardSelectedItemId ? 'Place selected item into Effects' : undefined}
                  onKeyDown={keyboardSelectedItemId ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeyboardMove('effects'); } } : undefined}
                  className={`flex-1 flex flex-col items-center justify-start p-6 transition-all duration-300 relative z-10
                    ${activeDropZone === 'effects' ? 'bg-teal-200/60 scale-[1.01] shadow-[inset_0_0_40px_rgba(45,212,191,0.3)]' : 'bg-gradient-to-b from-teal-50/80 to-teal-100/40'}
                    ${keyboardSelectedItemId ? 'cursor-pointer ring-2 ring-yellow-300/60' : ''}
                  `}
              >
                  <div className={`bg-teal-200/80 backdrop-blur-sm border-2 border-teal-300 text-teal-800 font-black uppercase tracking-widest px-6 py-2 rounded-2xl shadow-sm text-center mb-4 transform rotate-1 ${keyboardSelectedItemId ? 'ring-4 ring-yellow-300' : ''}`}>
                      🟦 {t('games.ce_sort.effects_label') || 'Effects'}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center content-start flex-grow w-full max-w-sm overflow-y-auto custom-scrollbar p-2">
                      {effectsItems.map(item => (
                          <div
                            key={item.id}
                            tabIndex={0}
                            role="button"
                            aria-label={`${item.text}, sorted into Effects`}
                            aria-pressed={keyboardSelectedItemId === item.id}
                            onKeyDown={(e) => handleItemKeyDown(e, item)}
                            onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                            className={`bg-white text-teal-800 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border-r-4 border-teal-400 animate-in zoom-in cursor-pointer hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 flex items-center gap-1.5 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
                          >
                            {item.text}
                            <SpeakButton text={item.text} size={11} />
                          </div>
                      ))}
                      {effectsItems.length === 0 && (
                          <div className="text-teal-400 italic text-xs mt-8 text-center w-full">{t('concept_sort.drop_placeholder') || 'Drop effects here'}</div>
                      )}
                  </div>
              </div>
          </div>
          {/* Item bank */}
          <div className="h-44 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
              <div className="max-w-6xl mx-auto">
                  <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t('concept_sort.unsorted_cards') || 'Unsorted Items'} ({bankItems.length})</h4>
                          {attempts > 0 && (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                  {attempts} incorrect attempt{attempts !== 1 ? 's' : ''}
                              </span>
                          )}
                      </div>
                      <div className="flex gap-2 items-center">
                          <button
                               onClick={handleResetClick}
                               className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${confirmingReset ? `bg-rose-600 text-white border-rose-700 hover:bg-rose-700 ${!useReducedMotion() ? 'animate-pulse' : ''}` : 'text-slate-600 hover:bg-slate-100 border-slate-400'}`}
                               aria-label={confirmingReset ? (t('games.ce_sort.reset_confirm') || 'Confirm reset — clears the whole board') : 'Reset board'}
                          >
                              {confirmingReset ? (t('games.ce_sort.reset_confirm_label') || 'Click again to confirm') : (t('concept_sort.reset_board') || 'Reset')}
                          </button>
                      </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center overflow-y-auto h-full pb-8 pt-2">
                      {bankItems.map(item => (
                          <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item)}
                              tabIndex={0}
                              role="button"
                              aria-label={`${item.text}, unsorted. Press Enter to select.`}
                              aria-pressed={keyboardSelectedItemId === item.id}
                              onKeyDown={(e) => handleItemKeyDown(e, item)}
                              onClick={() => { if (keyboardSelectedItemId === item.id) { setKeyboardSelectedItemId(null); } else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                              className={`bg-white px-4 py-2 rounded-xl shadow-sm border-b-4 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 cursor-grab active:cursor-grabbing active:border-b-0 active:translate-y-1 transition-all text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 text-center animate-in zoom-in duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 border-yellow-500 z-50 scale-110' : ''}`}
                          >
                              {item.text}
                              <SpeakButton text={item.text} size={11} />
                          </div>
                      ))}
                      {bankItems.length === 0 && !isWon && (
                          <div className="text-slate-600 italic font-bold text-sm mt-4 text-center w-full">
                              {t('concept_map.venn.bank_empty') || 'All items sorted!'}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
});

// ── TChartSortGame — drag items into Left or Right column ──
// Shape: data = { leftTitle, rightTitle, leftItems: [string], rightItems: [string] }
const TChartSortGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [keyboardSelectedItemId, setKeyboardSelectedItemId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [lastHint, setLastHint] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const moveMenuRef = useRef(null);
  const hintTimerRef = useRef(null);
  const confirmResetTimerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const playAgainRef = useRef(null);
  const triggerElRef = useRef(null);
  useEffect(() => {
    triggerElRef.current = (typeof document !== 'undefined') ? document.activeElement : null;
    if (gameContainerRef.current) gameContainerRef.current.focus();
    return () => {
      if (triggerElRef.current && typeof triggerElRef.current.focus === 'function') {
        try { triggerElRef.current.focus(); } catch (_) {}
      }
    };
  }, []);
  useEffect(() => { if (isWon && playAgainRef.current) playAgainRef.current.focus(); }, [isWon]);
  const leftTitle = data?.leftTitle || 'Left';
  const rightTitle = data?.rightTitle || 'Right';
  const showZoneHint = (zone) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setLastHint(zone);
    hintTimerRef.current = setTimeout(() => setLastHint(null), 3000);
  };
  // Stable fingerprint to avoid re-init on parent re-renders.
  const dataFingerprint = useMemo(() => {
    if (!data) return '';
    return JSON.stringify([data.leftTitle, data.rightTitle, data.leftItems || [], data.rightItems || []]);
  }, [data]);
  useEffect(() => {
    if (!dataFingerprint || !data) return;
    const all = [
      ...(data.leftItems || []).map((text, i) => ({
        id: `tc-l-${i}-${Math.random().toString(36).substr(2,6)}`,
        text: typeof text === 'object' ? (text.text || '') : String(text),
        correctZone: 'left',
        currentZone: 'bank'
      })),
      ...(data.rightItems || []).map((text, i) => ({
        id: `tc-r-${i}-${Math.random().toString(36).substr(2,6)}`,
        text: typeof text === 'object' ? (text.text || '') : String(text),
        correctZone: 'right',
        currentZone: 'bank'
      }))
    ];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setItems(all);
    setScore(0);
    setIsWon(false);
    setAttempts(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFingerprint]);
  useEffect(() => {
    if (keyboardSelectedItemId && moveMenuRef.current) {
      const firstBtn = moveMenuRef.current.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }
  }, [keyboardSelectedItemId]);
  const placeItem = (item, targetZone) => {
    if (targetZone === 'bank') {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentZone: 'bank' } : i));
      if (playSound) playSound('click');
      setAnnouncement(`Moved "${item.text}" back to the bank.`);
      return;
    }
    if (item.correctZone === targetZone) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentZone: targetZone } : i));
      setScore(s => s + 20);
      if (playSound) playSound('correct');
      setAnnouncement(`Correct! "${item.text}" belongs in ${targetZone === 'left' ? leftTitle : rightTitle}.`);
    } else {
      setAttempts(a => a + 1);
      setScore(s => Math.max(0, s - 5));
      if (playSound) playSound('incorrect');
      showZoneHint(item.correctZone);
      setAnnouncement(`Incorrect. "${item.text}" does not belong in ${targetZone === 'left' ? leftTitle : rightTitle}.`);
    }
  };
  const handleItemKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      if (keyboardSelectedItemId === item.id) {
        setKeyboardSelectedItemId(null);
        setAnnouncement('Selection cancelled.');
      } else {
        setKeyboardSelectedItemId(item.id);
        setAnnouncement(`Selected: ${item.text}. Choose ${leftTitle} or ${rightTitle}.`);
        if (playSound) playSound('click');
      }
    }
  };
  const handleKeyboardMove = (zone) => {
    if (!keyboardSelectedItemId) return;
    const item = items.find(i => i.id === keyboardSelectedItemId);
    if (!item) return;
    placeItem(item, zone);
    setKeyboardSelectedItemId(null);
  };
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, zone) => { e.preventDefault(); setActiveDropZone(zone); };
  const handleDragLeave = () => setActiveDropZone(null);
  const handleDrop = (e, zone) => {
    e.preventDefault();
    setActiveDropZone(null);
    if (!draggedItem) return;
    placeItem(draggedItem, zone);
    setDraggedItem(null);
  };
  useEffect(() => {
    if (!isWon && items.length > 0 && items.every(i => i.currentZone !== 'bank')) {
      const allCorrect = items.every(i => i.currentZone === i.correctZone);
      if (allCorrect) {
        setIsWon(true);
        if (onScoreUpdate) onScoreUpdate(score, 'T-Chart Sort');
        if (playSound) playSound('correct');
        if (onGameComplete) {
          onGameComplete('tchartSort', { score, itemsSorted: items.length, totalItems: items.length, incorrectAttempts: attempts });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isWon]);
  const reset = () => {
    const shuffled = [...items].map(i => ({ ...i, currentZone: 'bank' }));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setItems(shuffled); setScore(0); setIsWon(false); setAttempts(0); setLastHint(null);
  };
  const handleResetClick = () => {
    if (confirmingReset) {
      if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
      setConfirmingReset(false);
      reset();
      return;
    }
    setConfirmingReset(true);
    setAnnouncement('Press Reset again to confirm clearing the board, or wait to cancel.');
    if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
    confirmResetTimerRef.current = setTimeout(() => setConfirmingReset(false), 3000);
  };
  const leftItems = useMemo(() => items.filter(i => i.currentZone === 'left'), [items]);
  const rightItems = useMemo(() => items.filter(i => i.currentZone === 'right'), [items]);
  const bankItems = useMemo(() => items.filter(i => i.currentZone === 'bank'), [items]);
  const renderColumn = (zone, title, items, colorClasses) => {
    const hasSelection = !!keyboardSelectedItemId;
    return (
    <div
      onDrop={(e) => handleDrop(e, zone)}
      onDragOver={(e) => handleDragOver(e, zone)}
      onDragLeave={handleDragLeave}
      onClick={hasSelection ? () => handleKeyboardMove(zone) : undefined}
      role={hasSelection ? 'button' : undefined}
      tabIndex={hasSelection ? 0 : undefined}
      aria-label={hasSelection ? `Place selected item into ${title}` : undefined}
      onKeyDown={hasSelection ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeyboardMove(zone); } } : undefined}
      className={`flex-1 flex flex-col items-center justify-start p-6 transition-all duration-300 relative z-10 ${activeDropZone === zone ? colorClasses.active : colorClasses.idle} ${hasSelection ? 'cursor-pointer ring-2 ring-yellow-300/60' : ''}`}
    >
      <div className={`backdrop-blur-sm border-2 font-black uppercase tracking-widest px-6 py-2 rounded-2xl shadow-sm text-center mb-4 ${colorClasses.header} ${hasSelection ? 'ring-4 ring-yellow-300 ring-offset-2' : ''}`}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2 justify-center content-start flex-grow w-full max-w-sm overflow-y-auto custom-scrollbar p-2">
        {items.map(item => (
          <div
            key={item.id}
            tabIndex={0}
            role="button"
            aria-label={`${item.text}, sorted into ${title}`}
            aria-pressed={keyboardSelectedItemId === item.id}
            onKeyDown={(e) => handleItemKeyDown(e, item)}
            onClick={() => { if (keyboardSelectedItemId === item.id) setKeyboardSelectedItemId(null); else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
            className={`bg-white px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold animate-in zoom-in cursor-pointer focus:outline-none focus:ring-2 flex items-center gap-1.5 ${colorClasses.chip} ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
          >
            {item.text}
            <SpeakButton text={item.text} size={11} />
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-slate-400 italic text-xs mt-8 text-center w-full">{hasSelection ? (t('concept_sort.tap_to_place') || `Tap here to place in ${title}`) : (t('concept_sort.drop_placeholder') || 'Drop here')}</div>
        )}
      </div>
    </div>
  );
  };
  const leftColors = {
    active: 'bg-cyan-200/60 scale-[1.01] shadow-[inset_0_0_40px_rgba(6,182,212,0.3)]',
    idle: 'bg-gradient-to-b from-cyan-50/80 to-cyan-100/40',
    header: 'bg-cyan-200/80 border-cyan-300 text-cyan-800 transform -rotate-1',
    chip: 'text-cyan-800 border-l-4 border-cyan-400 hover:bg-cyan-50 focus:ring-cyan-500'
  };
  const rightColors = {
    active: 'bg-indigo-200/60 scale-[1.01] shadow-[inset_0_0_40px_rgba(99,102,241,0.3)]',
    idle: 'bg-gradient-to-b from-indigo-50/80 to-indigo-100/40',
    header: 'bg-indigo-200/80 border-indigo-300 text-indigo-800 transform rotate-1',
    chip: 'text-indigo-800 border-l-4 border-indigo-400 hover:bg-indigo-50 focus:ring-indigo-500'
  };
  return (
    <div ref={gameContainerRef} tabIndex={-1} className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in zoom-in-95 focus:outline-none">
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-30">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <ArrowRight size={24}/> {t('games.tchart_sort.title') || 'T-Chart Sort'}
          </h3>
          {topicTitle && <p className="text-xs text-white/70 mt-0.5">{topicTitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/30 px-4 py-1 rounded-full font-bold text-yellow-200 border border-white/40">
            {t('common.score') || 'Score'}: {score}
          </div>
          <GameThemeToggle />
          <button
            aria-label={t('common.close') || 'Close'}
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors border border-white/30"
          >
            <ArrowDown className="rotate-90" size={14}/> {t('concept_map.venn.back_to_editor') || 'Back'}
          </button>
        </div>
      </div>
      <div className="flex-grow relative overflow-hidden flex flex-col lg:flex-row items-stretch">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
        {isWon && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="tchart-victory-title">
            <div className={`bg-white p-8 rounded-3xl text-center shadow-2xl ${!useReducedMotion() ? 'animate-bounce' : ''}`}>
              <h2 id="tchart-victory-title" className="text-4xl font-black text-indigo-600 mb-2">{t('concept_map.venn.victory_title') || '🎉 Perfect!'}</h2>
              <p className="text-slate-600">{t('games.tchart_sort.victory_desc') || 'You sorted every item into the correct column!'}</p>
              <p className="text-2xl font-black text-yellow-500 mt-2">{score} pts</p>
              <div className="flex gap-3 mt-4 justify-center">
                <button ref={playAgainRef} onClick={reset} className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <RefreshCw size={14}/> Play Again
                </button>
                <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-300 transition-colors">
                  Close
                </button>
              </div>
            </div>
            {!useReducedMotion() && <ConfettiExplosion />}
          </div>
        )}
        {lastHint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-100 border-2 border-amber-400 text-amber-800 px-5 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
            <HelpCircle size={16} /> Try: {lastHint === 'left' ? leftTitle : rightTitle}
          </div>
        )}
        {keyboardSelectedItemId && (
          <div className="absolute inset-x-0 bottom-4 z-50 flex justify-center pointer-events-none px-4">
            <div ref={moveMenuRef} className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-500 flex flex-col gap-2 animate-in zoom-in duration-200 pointer-events-auto max-w-md w-full" role="dialog" aria-label="Choose a column">
              <h4 className="text-xs font-bold text-slate-700 text-center mb-1">{t('concept_sort.tap_target') || 'Tap a column above, or pick one here:'}</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleKeyboardMove('left')} className="px-4 py-3 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 rounded-xl font-bold text-xs transition-colors border border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500">{leftTitle}</button>
                <button onClick={() => handleKeyboardMove('right')} className="px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl font-bold text-xs transition-colors border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500">{rightTitle}</button>
                <button onClick={() => handleKeyboardMove('bank')} className="col-span-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors border border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500">{t('concept_map.venn.return_bank') || 'Return to bank'}</button>
              </div>
              <button onClick={() => setKeyboardSelectedItemId(null)} className="mt-1 text-xs text-slate-600 hover:text-slate-800 underline text-center focus:outline-none focus:ring-2 focus:ring-slate-400 rounded">{t('concept_map.venn.cancel_selection') || 'Cancel'}</button>
            </div>
          </div>
        )}
        {renderColumn('left', leftTitle, leftItems, leftColors)}
        <div className="hidden lg:flex flex-col items-center justify-center w-16 z-20 relative">
          <div className="w-0.5 h-full bg-slate-200"></div>
          <div className="absolute top-1/2 -translate-y-1/2 bg-white p-2 rounded-full border-2 border-slate-200 shadow-sm">
            <ArrowRight size={20} className="text-slate-400" />
          </div>
        </div>
        {renderColumn('right', rightTitle, rightItems, rightColors)}
      </div>
      <div className="bg-white border-t border-slate-200 shadow-inner p-4 flex-shrink-0 max-h-[40vh] flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t('concept_sort.unsorted_cards') || 'Unsorted Items'} ({bankItems.length})</h4>
              {attempts > 0 && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{attempts} incorrect attempt{attempts !== 1 ? 's' : ''}</span>
              )}
            </div>
            <button
              onClick={handleResetClick}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${confirmingReset ? `bg-rose-600 text-white border-rose-700 hover:bg-rose-700 ${!useReducedMotion() ? 'animate-pulse' : ''}` : 'text-slate-600 hover:bg-slate-100 border-slate-400'}`}
              aria-label={confirmingReset ? 'Confirm reset — clears the whole board' : 'Reset board'}
            >
              {confirmingReset ? 'Click again to confirm' : (t('concept_sort.reset_board') || 'Reset')}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 justify-center overflow-y-auto h-full pb-4 pt-2">
            {bankItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                tabIndex={0}
                role="button"
                aria-label={`${item.text}, unsorted. Press Enter to select.`}
                aria-pressed={keyboardSelectedItemId === item.id}
                onKeyDown={(e) => handleItemKeyDown(e, item)}
                onClick={() => { if (keyboardSelectedItemId === item.id) setKeyboardSelectedItemId(null); else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                className={`bg-white px-4 py-2 rounded-xl shadow-sm border-b-4 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 cursor-grab active:cursor-grabbing active:border-b-0 active:translate-y-1 transition-all text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 text-center animate-in zoom-in duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 border-yellow-500 z-50 scale-110' : ''}`}
              >
                {item.text}
                <SpeakButton text={item.text} size={11} />
              </div>
            ))}
            {bankItems.length === 0 && !isWon && (
              <div className="text-slate-600 italic font-bold text-sm mt-4 text-center w-full">{t('concept_map.venn.bank_empty') || 'All items sorted!'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── Shared N-bucket sort engine (powers ConceptMap + Outline sort games) ──
// Shape: data = { topic, buckets: [{id, title}], items: [{id, text, correctBucketId}] }
// theme: { headerGradient, accentColor (tailwind suffix like 'cyan'), title }
const _MultiBucketSortGame = React.memo(({ data, theme, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "", gameKey = "multiBucket" }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [activeDropZone, setActiveDropZone] = useState(null);
  const [keyboardSelectedItemId, setKeyboardSelectedItemId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [lastHint, setLastHint] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const moveMenuRef = useRef(null);
  const hintTimerRef = useRef(null);
  const confirmResetTimerRef = useRef(null);
  const gameContainerRef = useRef(null);
  const playAgainRef = useRef(null);
  const triggerElRef = useRef(null);
  useEffect(() => {
    triggerElRef.current = (typeof document !== 'undefined') ? document.activeElement : null;
    if (gameContainerRef.current) gameContainerRef.current.focus();
    return () => {
      if (triggerElRef.current && typeof triggerElRef.current.focus === 'function') {
        try { triggerElRef.current.focus(); } catch (_) {}
      }
    };
  }, []);
  useEffect(() => { if (isWon && playAgainRef.current) playAgainRef.current.focus(); }, [isWon]);
  const buckets = useMemo(() => Array.isArray(data?.buckets) ? data.buckets : [], [data]);
  const showZoneHint = (bucketId) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setLastHint(bucketId);
    hintTimerRef.current = setTimeout(() => setLastHint(null), 3000);
  };
  const dataFingerprint = useMemo(() => {
    if (!data) return '';
    return JSON.stringify([data.buckets || [], data.items || []]);
  }, [data]);
  useEffect(() => {
    if (!dataFingerprint || !data) return;
    const all = (data.items || []).map((it, i) => ({
      id: it.id || `mb-${i}-${Math.random().toString(36).substr(2,6)}`,
      text: typeof it === 'object' ? (it.text || '') : String(it),
      correctBucketId: typeof it === 'object' ? it.correctBucketId : null,
      currentBucketId: 'bank'
    }));
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setItems(all);
    setScore(0); setIsWon(false); setAttempts(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFingerprint]);
  useEffect(() => {
    if (keyboardSelectedItemId && moveMenuRef.current) {
      const firstBtn = moveMenuRef.current.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }
  }, [keyboardSelectedItemId]);
  const placeItem = (item, targetBucketId) => {
    if (targetBucketId === 'bank') {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentBucketId: 'bank' } : i));
      if (playSound) playSound('click');
      setAnnouncement(`Moved "${item.text}" back to the bank.`);
      return;
    }
    const bucket = buckets.find(b => b.id === targetBucketId);
    const bucketLabel = bucket ? bucket.title : targetBucketId;
    if (item.correctBucketId === targetBucketId) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, currentBucketId: targetBucketId } : i));
      setScore(s => s + 20);
      if (playSound) playSound('correct');
      setAnnouncement(`Correct! "${item.text}" belongs in ${bucketLabel}.`);
    } else {
      setAttempts(a => a + 1);
      setScore(s => Math.max(0, s - 5));
      if (playSound) playSound('incorrect');
      showZoneHint(item.correctBucketId);
      setAnnouncement(`Incorrect. "${item.text}" does not belong in ${bucketLabel}.`);
    }
  };
  const handleItemKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation();
      if (keyboardSelectedItemId === item.id) {
        setKeyboardSelectedItemId(null);
        setAnnouncement('Selection cancelled.');
      } else {
        setKeyboardSelectedItemId(item.id);
        setAnnouncement(`Selected: ${item.text}. Choose a destination.`);
        if (playSound) playSound('click');
      }
    }
  };
  const handleKeyboardMove = (bucketId) => {
    if (!keyboardSelectedItemId) return;
    const item = items.find(i => i.id === keyboardSelectedItemId);
    if (!item) return;
    placeItem(item, bucketId);
    setKeyboardSelectedItemId(null);
  };
  const handleDragStart = (e, item) => { setDraggedItem(item); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, bucketId) => { e.preventDefault(); setActiveDropZone(bucketId); };
  const handleDragLeave = () => setActiveDropZone(null);
  const handleDrop = (e, bucketId) => {
    e.preventDefault();
    setActiveDropZone(null);
    if (!draggedItem) return;
    placeItem(draggedItem, bucketId);
    setDraggedItem(null);
  };
  useEffect(() => {
    if (!isWon && items.length > 0 && items.every(i => i.currentBucketId !== 'bank')) {
      const allCorrect = items.every(i => i.currentBucketId === i.correctBucketId);
      if (allCorrect) {
        setIsWon(true);
        if (onScoreUpdate) onScoreUpdate(score, theme?.title || 'Sort');
        if (playSound) playSound('correct');
        if (onGameComplete) {
          onGameComplete(gameKey, { score, itemsSorted: items.length, totalItems: items.length, incorrectAttempts: attempts });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isWon]);
  const reset = () => {
    const shuffled = [...items].map(i => ({ ...i, currentBucketId: 'bank' }));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setItems(shuffled); setScore(0); setIsWon(false); setAttempts(0); setLastHint(null);
  };
  const handleResetClick = () => {
    if (confirmingReset) {
      if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
      setConfirmingReset(false);
      reset();
      return;
    }
    setConfirmingReset(true);
    setAnnouncement('Press Reset again to confirm clearing the board, or wait to cancel.');
    if (confirmResetTimerRef.current) clearTimeout(confirmResetTimerRef.current);
    confirmResetTimerRef.current = setTimeout(() => setConfirmingReset(false), 3000);
  };
  const bankItems = useMemo(() => items.filter(i => i.currentBucketId === 'bank'), [items]);
  const itemsByBucket = useMemo(() => {
    const map = {};
    buckets.forEach(b => { map[b.id] = []; });
    items.forEach(i => { if (i.currentBucketId !== 'bank' && map[i.currentBucketId]) map[i.currentBucketId].push(i); });
    return map;
  }, [items, buckets]);
  const accent = theme?.accentColor || 'indigo';
  const headerGradient = theme?.headerGradient || `from-${accent}-600 to-purple-600`;
  const titleText = theme?.title || (t('games.bucket_sort.title') || 'Sort');
  const lastHintLabel = lastHint ? (buckets.find(b => b.id === lastHint)?.title || '') : '';
  return (
    <div ref={gameContainerRef} tabIndex={-1} className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in zoom-in-95 focus:outline-none">
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <div className={`bg-gradient-to-r ${headerGradient} p-4 text-white flex justify-between items-center shadow-md z-30`}>
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2"><ArrowRight size={24}/> {titleText}</h3>
          {topicTitle && <p className="text-xs text-white/70 mt-0.5">{topicTitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/30 px-4 py-1 rounded-full font-bold text-yellow-200 border border-white/40">{t('common.score') || 'Score'}: {score}</div>
          <GameThemeToggle />
          <button aria-label={t('common.close') || 'Close'} onClick={onClose} className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors border border-white/30">
            <ArrowDown className="rotate-90" size={14}/> {t('concept_map.venn.back_to_editor') || 'Back'}
          </button>
        </div>
      </div>
      <div className="flex-grow relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
        {isWon && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mb-victory-title">
            <div className={`bg-white p-8 rounded-3xl text-center shadow-2xl ${!useReducedMotion() ? 'animate-bounce' : ''}`}>
              <h2 id="mb-victory-title" className="text-4xl font-black text-indigo-600 mb-2">{t('concept_map.venn.victory_title') || '🎉 Perfect!'}</h2>
              <p className="text-slate-600">{t('games.bucket_sort.victory_desc') || 'You sorted every item correctly!'}</p>
              <p className="text-2xl font-black text-yellow-500 mt-2">{score} pts</p>
              <div className="flex gap-3 mt-4 justify-center">
                <button ref={playAgainRef} onClick={reset} className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"><RefreshCw size={14}/> Play Again</button>
                <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-300 transition-colors">Close</button>
              </div>
            </div>
            {!useReducedMotion() && <ConfettiExplosion />}
          </div>
        )}
        {lastHint && lastHintLabel && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-amber-100 border-2 border-amber-400 text-amber-800 px-5 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
            <HelpCircle size={16} /> Try: {lastHintLabel}
          </div>
        )}
        {keyboardSelectedItemId && (
          <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center pointer-events-none px-4">
            <div ref={moveMenuRef} className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-500 flex flex-col gap-2 animate-in zoom-in duration-200 max-w-md w-full pointer-events-auto" role="dialog" aria-label="Choose a destination">
              <h4 className="text-xs font-bold text-slate-700 text-center mb-1">{t('concept_sort.tap_target') || 'Tap a bucket above, or pick one here:'}</h4>
              <div className="grid grid-cols-2 gap-2">
                {buckets.map(b => (
                  <button key={b.id} onClick={() => handleKeyboardMove(b.id)} className={`px-4 py-3 bg-${accent}-100 hover:bg-${accent}-200 text-${accent}-800 rounded-xl font-bold text-xs transition-colors border border-${accent}-300 focus:outline-none focus:ring-2 focus:ring-${accent}-500`}>{b.title}</button>
                ))}
                <button onClick={() => handleKeyboardMove('bank')} className="col-span-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors border border-slate-400">{t('concept_map.venn.return_bank') || 'Return to bank'}</button>
              </div>
              <button onClick={() => setKeyboardSelectedItemId(null)} className="mt-1 text-xs text-slate-600 hover:text-slate-800 underline text-center">{t('concept_map.venn.cancel_selection') || 'Cancel'}</button>
            </div>
          </div>
        )}
        <div className={`p-4 grid gap-4 ${buckets.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : buckets.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {buckets.map(b => {
            const placed = itemsByBucket[b.id] || [];
            const isActive = activeDropZone === b.id;
            const hasSelection = !!keyboardSelectedItemId;
            return (
              <div
                key={b.id}
                onDrop={(e) => handleDrop(e, b.id)}
                onDragOver={(e) => handleDragOver(e, b.id)}
                onDragLeave={handleDragLeave}
                onClick={hasSelection ? () => handleKeyboardMove(b.id) : undefined}
                role={hasSelection ? 'button' : undefined}
                tabIndex={hasSelection ? 0 : undefined}
                aria-label={hasSelection ? `Place selected item into ${b.title}` : undefined}
                onKeyDown={hasSelection ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleKeyboardMove(b.id); } } : undefined}
                className={`flex flex-col items-stretch p-4 rounded-2xl border-2 min-h-[140px] transition-all relative z-10 bg-white shadow-sm ${isActive ? `border-${accent}-500 ring-4 ring-${accent}-200` : `border-${accent}-200`} ${hasSelection ? 'cursor-pointer ring-2 ring-yellow-300/60' : ''}`}
              >
                <div className={`text-center font-black uppercase tracking-wider text-sm py-1 mb-2 rounded-md bg-${accent}-100 text-${accent}-800 border border-${accent}-200 ${hasSelection ? 'ring-2 ring-yellow-300' : ''}`}>{b.title}</div>
                <div className="flex flex-wrap gap-1.5 justify-center content-start flex-grow p-1">
                  {placed.map(item => (
                    <div
                      key={item.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${item.text}, sorted into ${b.title}`}
                      aria-pressed={keyboardSelectedItemId === item.id}
                      onKeyDown={(e) => handleItemKeyDown(e, item)}
                      onClick={() => { if (keyboardSelectedItemId === item.id) setKeyboardSelectedItemId(null); else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                      className={`bg-white px-2.5 py-1 rounded-md shadow-sm text-xs font-bold animate-in zoom-in cursor-pointer focus:outline-none focus:ring-2 flex items-center gap-1 text-${accent}-800 border-l-4 border-${accent}-400 hover:bg-${accent}-50 focus:ring-${accent}-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 z-50 scale-110' : ''}`}
                    >
                      {item.text}
                      <SpeakButton text={item.text} size={11} />
                    </div>
                  ))}
                  {placed.length === 0 && <div className="text-slate-400 italic text-[11px] mt-3 text-center w-full">{t('concept_sort.drop_placeholder') || 'Drop here'}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-white border-t border-slate-200 shadow-inner p-4 flex-shrink-0 max-h-[35vh] flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t('concept_sort.unsorted_cards') || 'Unsorted Items'} ({bankItems.length})</h4>
              {attempts > 0 && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{attempts} incorrect attempt{attempts !== 1 ? 's' : ''}</span>
              )}
            </div>
            <button
              onClick={handleResetClick}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${confirmingReset ? `bg-rose-600 text-white border-rose-700 hover:bg-rose-700 ${!useReducedMotion() ? 'animate-pulse' : ''}` : 'text-slate-600 hover:bg-slate-100 border-slate-400'}`}
              aria-label={confirmingReset ? 'Confirm reset — clears the whole board' : 'Reset board'}
            >
              {confirmingReset ? 'Click again to confirm' : (t('concept_sort.reset_board') || 'Reset')}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 justify-center overflow-y-auto h-full pb-4 pt-2">
            {bankItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                tabIndex={0}
                role="button"
                aria-label={`${item.text}, unsorted. Press Enter to select.`}
                aria-pressed={keyboardSelectedItemId === item.id}
                onKeyDown={(e) => handleItemKeyDown(e, item)}
                onClick={() => { if (keyboardSelectedItemId === item.id) setKeyboardSelectedItemId(null); else { setKeyboardSelectedItemId(item.id); if (playSound) playSound('click'); } }}
                className={`bg-white px-4 py-2 rounded-xl shadow-sm border-b-4 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-900 cursor-grab active:cursor-grabbing active:border-b-0 active:translate-y-1 transition-all text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 text-center animate-in zoom-in duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${keyboardSelectedItemId === item.id ? 'ring-4 ring-yellow-400 border-yellow-500 z-50 scale-110' : ''}`}
              >
                {item.text}
                <SpeakButton text={item.text} size={11} />
              </div>
            ))}
            {bankItems.length === 0 && !isWon && (
              <div className="text-slate-600 italic font-bold text-sm mt-4 text-center w-full">{t('concept_map.venn.bank_empty') || 'All items sorted!'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ── ConceptMapSortGame — drag attributes onto the correct branch nodes ──
// Maps outline branches → buckets; each branch.items[] → items with that branch as correct.
const ConceptMapSortGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const adapted = useMemo(() => {
    const branches = Array.isArray(data?.branches) ? data.branches : [];
    const buckets = branches.map((b, bi) => ({ id: `cm-b-${bi}`, title: b.title || `Branch ${bi+1}` }));
    const items = [];
    branches.forEach((b, bi) => {
      (b.items || []).forEach((it, ii) => {
        const text = typeof it === 'object' ? (it.text || '') : String(it);
        if (text) items.push({ id: `cm-i-${bi}-${ii}`, text, correctBucketId: `cm-b-${bi}` });
      });
    });
    return { buckets, items };
  }, [data]);
  return (
    <_MultiBucketSortGame
      data={adapted}
      theme={{ accentColor: 'emerald', headerGradient: 'from-emerald-600 to-teal-600', title: 'Concept Map Sort' }}
      onClose={onClose}
      playSound={playSound}
      topicTitle={topicTitle}
      onScoreUpdate={onScoreUpdate}
      onGameComplete={onGameComplete}
      gameKey="conceptMapSort"
    />
  );
});

// ── ProblemSolutionSortGame — prioritize solutions into Try First / Try Next / Last Resort ──
// Uses the AI-returned ORDER of solutions as the answer key (top-third, middle, bottom-third).
// Pedagogical framing: "Which solutions should you try first?" — not a single right answer in real life,
// but the AI's order represents source-grounded prioritization that students can compare against.
const ProblemSolutionSortGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const adapted = useMemo(() => {
    const branches = Array.isArray(data?.branches) ? data.branches : [];
    // Flatten all solutions across branches (Problem Solution typically has 1 branch w/ all solutions).
    const allSolutions = [];
    branches.forEach((b, bi) => {
      (b.items || []).forEach((it, ii) => {
        const text = typeof it === 'object' ? (it.text || '') : String(it);
        if (text) allSolutions.push({ text, branchIdx: bi, itemIdx: ii });
      });
    });
    const total = allSolutions.length;
    const buckets = [
      { id: 'ps-first', title: 'Try First' },
      { id: 'ps-next',  title: 'Try Next' },
      { id: 'ps-last',  title: 'Last Resort' }
    ];
    // Partition into thirds based on original AI-returned order.
    const items = allSolutions.map((sol, idx) => {
      let correctBucketId;
      if (idx < total / 3) correctBucketId = 'ps-first';
      else if (idx < (2 * total) / 3) correctBucketId = 'ps-next';
      else correctBucketId = 'ps-last';
      return { id: `ps-i-${idx}`, text: sol.text, correctBucketId };
    });
    return { buckets, items };
  }, [data]);
  return (
    <_MultiBucketSortGame
      data={adapted}
      theme={{ accentColor: 'rose', headerGradient: 'from-rose-600 to-pink-600', title: 'Prioritize the Solutions' }}
      onClose={onClose}
      playSound={playSound}
      topicTitle={topicTitle}
      onScoreUpdate={onScoreUpdate}
      onGameComplete={onGameComplete}
      gameKey="problemSolutionSort"
    />
  );
});

// ── FishboneSortGame — drag specific causes onto their correct category bone ──
// Maps fishbone branches → buckets; each branch.items[] → items with that branch as correct.
const FishboneSortGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const adapted = useMemo(() => {
    const branches = Array.isArray(data?.branches) ? data.branches : [];
    const buckets = branches.map((b, bi) => ({ id: `fb-b-${bi}`, title: b.title || `Category ${bi+1}` }));
    const items = [];
    branches.forEach((b, bi) => {
      (b.items || []).forEach((it, ii) => {
        const text = typeof it === 'object' ? (it.text || '') : String(it);
        if (text) items.push({ id: `fb-i-${bi}-${ii}`, text, correctBucketId: `fb-b-${bi}` });
      });
    });
    return { buckets, items };
  }, [data]);
  return (
    <_MultiBucketSortGame
      data={adapted}
      theme={{ accentColor: 'violet', headerGradient: 'from-violet-600 to-fuchsia-600', title: 'Fishbone Sort' }}
      onClose={onClose}
      playSound={playSound}
      topicTitle={topicTitle}
      onScoreUpdate={onScoreUpdate}
      onGameComplete={onGameComplete}
      gameKey="fishboneSort"
    />
  );
});

// ── OutlineSortGame — drag sub-items under their correct heading ──
const OutlineSortGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const adapted = useMemo(() => {
    const branches = Array.isArray(data?.branches) ? data.branches : [];
    const buckets = branches.map((b, bi) => ({ id: `ol-b-${bi}`, title: b.title || `Heading ${bi+1}` }));
    const items = [];
    branches.forEach((b, bi) => {
      (b.items || []).forEach((it, ii) => {
        const text = typeof it === 'object' ? (it.text || '') : String(it);
        if (text) items.push({ id: `ol-i-${bi}-${ii}`, text, correctBucketId: `ol-b-${bi}` });
      });
    });
    return { buckets, items };
  }, [data]);
  return (
    <_MultiBucketSortGame
      data={adapted}
      theme={{ accentColor: 'amber', headerGradient: 'from-amber-600 to-orange-600', title: 'Outline Sort' }}
      onClose={onClose}
      playSound={playSound}
      topicTitle={topicTitle}
      onScoreUpdate={onScoreUpdate}
      onGameComplete={onGameComplete}
      gameKey="outlineSort"
    />
  );
});

const PipelineBuilderGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete, topicTitle = "" }) => {
  const { t } = useContext(LanguageContext);
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
  const [shuffledSteps, setShuffledSteps] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState(null);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [arrowCoords, setArrowCoords] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [keyboardSelectedId, setKeyboardSelectedId] = useState(null);
  const moveMenuRef = useRef(null);
  const [nodePositions, setNodePositions] = useState({});
  const dragRef = useRef({ active: false, id: null, startX: 0, startY: 0, origX: 0, origY: 0 });

  // Serialize data to detect actual content changes, not just reference changes
  const dataFingerprint = useMemo(() => {
    if (!data?.steps?.length) return '';
    return JSON.stringify(data.steps.map(s => typeof s === 'string' ? s : s.title));
  }, [data]);

  useEffect(() => {
    if (!dataFingerprint || !data?.steps?.length) return;
    const steps = data.steps.map((s, i) => ({
      id: `pb-${i}-${Math.random().toString(36).substr(2,6)}`,
      title: typeof s === 'string' ? s : (s.title || s),
      items: s.items || [],
      connectsTo: s.connectsTo || null,
      originalIndex: i,
    }));
    const shuffled = [...steps];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledSteps(shuffled);
    setConnections([]);
    setResults(null);
    setScore(0);
    setIsComplete(false);
    setConnectingFrom(null);
    setChecked(false);
    setNodePositions({});
  }, [dataFingerprint]);

  // Build the set of correct connections from data
  const correctConnectionSet = useMemo(() => {
    const set = new Set();
    if (!data?.steps?.length) return set;
    data.steps.forEach((step, i) => {
      if (step.connectsTo && Array.isArray(step.connectsTo) && step.connectsTo.length > 0) {
        step.connectsTo.forEach(target => set.add(`${i}->${target}`));
      } else if (i < data.steps.length - 1) {
        set.add(`${i}->${i + 1}`);
      }
    });
    return set;
  }, [data]);

  const totalRequired = correctConnectionSet.size;

  // How many outgoing connections does a node need?
  const getRequiredOutCount = (origIdx) => {
    const step = data?.steps?.[origIdx];
    if (step?.connectsTo && Array.isArray(step.connectsTo) && step.connectsTo.length > 0) {
      return step.connectsTo.length;
    }
    return origIdx < (data?.steps?.length || 0) - 1 ? 1 : 0;
  };

  // Recalculate arrow positions
  const recalcArrows = useCallback(() => {
    if (!containerRef.current || connections.length === 0) {
      setArrowCoords([]);
      return;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const coords = connections.map(conn => {
      const fromEl = nodeRefs.current[conn.fromId];
      const toEl = nodeRefs.current[conn.toId];
      if (!fromEl || !toEl) return null;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      return {
        x1: fromRect.right - containerRect.left - 4,
        y1: fromRect.top + fromRect.height / 2 - containerRect.top,
        x2: toRect.left - containerRect.left + 4,
        y2: toRect.top + toRect.height / 2 - containerRect.top,
        fromId: conn.fromId,
        toId: conn.toId,
      };
    }).filter(Boolean);
    setArrowCoords(coords);
  }, [connections, nodePositions]);

  useEffect(() => {
    const timer = setTimeout(recalcArrows, 50);
    return () => clearTimeout(timer);
  }, [connections, shuffledSteps, checked, recalcArrows, nodePositions]);

  useEffect(() => {
    const handleResize = () => recalcArrows();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recalcArrows]);

  useEffect(() => {
    if (keyboardSelectedId && moveMenuRef.current) {
      const firstBtn = moveMenuRef.current.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }
  }, [keyboardSelectedId]);

  const handleNodeClick = (nodeId) => {
    if (isComplete || checked) return;
    if (connectingFrom === null) {
      setConnectingFrom(nodeId);
      setAnnouncement(`Selected step "${shuffledSteps.find(s => s.id === nodeId)?.title}". Now click the next step to connect.`);
      if (playSound) playSound('pop');
    } else if (connectingFrom === nodeId) {
      setConnectingFrom(null);
      setAnnouncement('Connection cancelled.');
    } else {
      // For branching nodes, allow multiple outgoing connections
      const fromStep = shuffledSteps.find(s => s.id === connectingFrom);
      const requiredOut = getRequiredOutCount(fromStep?.originalIndex);
      const existingFromCount = connections.filter(c => c.fromId === connectingFrom).length;
      setConnections(prev => {
        let filtered = prev;
        // If this source already has max outgoing connections, remove oldest
        if (requiredOut <= 1) {
          filtered = prev.filter(c => c.fromId !== connectingFrom);
        } else if (existingFromCount >= requiredOut) {
          // Remove the first outgoing connection to make room
          const firstOut = prev.find(c => c.fromId === connectingFrom);
          if (firstOut) filtered = prev.filter(c => c !== firstOut);
        }
        // Remove any existing connection TO this target
        filtered = filtered.filter(c => c.toId !== nodeId);
        return [...filtered, { fromId: connectingFrom, toId: nodeId }];
      });
      const toStep = shuffledSteps.find(s => s.id === nodeId);
      setAnnouncement(`Connected "${fromStep?.title}" → "${toStep?.title}".`);
      setConnectingFrom(null);
      if (playSound) playSound('pop');
    }
  };

  const handleNodeKeyDown = (e, nodeId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (isComplete || checked) return;
      if (keyboardSelectedId === nodeId) {
        setKeyboardSelectedId(null);
        setAnnouncement('Selection cancelled.');
      } else if (keyboardSelectedId) {
        // For branching, allow multiple outgoing
        const kbStep = shuffledSteps.find(s => s.id === keyboardSelectedId);
        const requiredOut = getRequiredOutCount(kbStep?.originalIndex);
        const existingFromCount = connections.filter(c => c.fromId === keyboardSelectedId).length;
        setConnections(prev => {
          let filtered = prev;
          if (requiredOut <= 1) {
            filtered = prev.filter(c => c.fromId !== keyboardSelectedId);
          } else if (existingFromCount >= requiredOut) {
            const firstOut = prev.find(c => c.fromId === keyboardSelectedId);
            if (firstOut) filtered = prev.filter(c => c !== firstOut);
          }
          filtered = filtered.filter(c => c.toId !== nodeId);
          return [...filtered, { fromId: keyboardSelectedId, toId: nodeId }];
        });
        setAnnouncement(`Connected steps.`);
        setKeyboardSelectedId(null);
        if (playSound) playSound('pop');
      } else {
        setKeyboardSelectedId(nodeId);
        setAnnouncement(`Selected. Press Enter on another step to connect.`);
        if (playSound) playSound('click');
      }
    }
  };

  const handleCheck = () => {
    if (connections.length === 0) return;
    const nodeMap = {};
    shuffledSteps.forEach(n => { nodeMap[n.id] = n; });
    let correctCount = 0;
    let incorrectCount = 0;
    const resultList = connections.map(conn => {
      const fromOrig = nodeMap[conn.fromId].originalIndex;
      const toOrig = nodeMap[conn.toId].originalIndex;
      const connKey = `${fromOrig}->${toOrig}`;
      const isCorrect = correctConnectionSet.has(connKey);
      if (isCorrect) correctCount++;
      else incorrectCount++;
      return { ...conn, correct: isCorrect };
    });
    setResults(resultList);
    setChecked(true);
    const points = correctCount * 20 - incorrectCount * 5;
    const newScore = Math.max(0, score + points);
    setScore(newScore);
    if (onScoreUpdate) onScoreUpdate(points);
    if (correctCount === totalRequired && incorrectCount === 0) {
      setIsComplete(true);
      if (playSound) playSound('victory');
      if (onGameComplete) onGameComplete('pipelineBuilder', { score: newScore, connectionsBuilt: correctCount, totalConnections: totalRequired });
      setAnnouncement('Pipeline complete! All connections are correct!');
    } else {
      if (playSound) playSound('incorrect');
      setAnnouncement(`${correctCount} correct, ${incorrectCount} incorrect. Incorrect connections will be removed.`);
      setTimeout(() => {
        const correctConns = connections.filter(c => {
          const fromOrig = nodeMap[c.fromId].originalIndex;
          const toOrig = nodeMap[c.toId].originalIndex;
          return correctConnectionSet.has(`${fromOrig}->${toOrig}`);
        });
        setConnections(correctConns);
        setResults(null);
        setChecked(false);
      }, 2500);
    }
  };

  const handleReset = () => {
    const steps = [...shuffledSteps];
    for (let i = steps.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [steps[i], steps[j]] = [steps[j], steps[i]];
    }
    setShuffledSteps(steps);
    setConnections([]);
    setConnectingFrom(null);
    setResults(null);
    setChecked(false);
    setScore(0);
    setIsComplete(false);
    setKeyboardSelectedId(null);
    setNodePositions({});
  };

  // Drag-to-reposition handlers
  const handleGripDown = (e, stepId) => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const el = nodeRefs.current[stepId];
    if (!el) return;
    const pos = nodePositions[stepId] || { x: 0, y: 0 };
    dragRef.current = { active: true, id: stepId, startX: clientX, startY: clientY, origX: pos.x, origY: pos.y };
    const handleMove = (ev) => {
      if (!dragRef.current.active) return;
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = cx - dragRef.current.startX;
      const dy = cy - dragRef.current.startY;
      setNodePositions(prev => ({
        ...prev,
        [stepId]: { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy }
      }));
    };
    const handleUp = () => {
      dragRef.current.active = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      recalcArrows();
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  };

  const getConnResult = (nodeId) => {
    if (!results) return null;
    return results.find(r => r.fromId === nodeId || r.toId === nodeId);
  };

  const isConnectedFrom = (nodeId) => connections.some(c => c.fromId === nodeId);
  const isConnectedTo = (nodeId) => connections.some(c => c.toId === nodeId);

  if (shuffledSteps.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in zoom-in-95">
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-indigo-700 p-4 text-white flex justify-between items-center shadow-md z-30">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <GitMerge size={24}/> {t('games.pipeline.title') || 'Pipeline Builder'}
          </h3>
          {topicTitle && <p className="text-xs text-white/70 mt-0.5">{topicTitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/30 px-4 py-1 rounded-full font-bold text-yellow-200 border border-white/40">
            {t('common.score') || 'Score'}: {score}
          </div>
          <div className="text-xs text-white/70 font-bold">
            {connections.length}/{totalRequired} connections
          </div>
          <GameThemeToggle />
          <button
            aria-label={t('common.close') || 'Close'}
            onClick={onClose}
            className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors border border-white/30"
          >
            <ArrowDown className="rotate-90" size={14}/> {t('concept_map.venn.back_to_editor') || 'Back'}
          </button>
        </div>
      </div>

      <div className="flex-grow relative overflow-auto">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>

        {isComplete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pipeline-victory-title">
            <div className={`bg-white p-8 rounded-3xl text-center shadow-2xl ${!useReducedMotion() ? 'animate-bounce' : ''}`}>
              <h2 id="pipeline-victory-title" className="text-4xl font-black text-indigo-600 mb-2">🏗️ Pipeline Complete!</h2>
              <p className="text-slate-600">You built the entire process flow correctly!</p>
              <p className="text-2xl font-black text-yellow-500 mt-2">{score} pts</p>
              <div className="flex gap-3 mt-4 justify-center">
                <button onClick={handleReset} className="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <RefreshCw size={14}/> Play Again
                </button>
                <button onClick={onClose} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-300 transition-colors">
                  Close
                </button>
              </div>
            </div>
            {!useReducedMotion() && <ConfettiExplosion />}
          </div>
        )}

        {connectingFrom && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-indigo-600 text-white px-5 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
            <ArrowRight size={16} className={!useReducedMotion() ? 'animate-pulse' : ''}/> Click the NEXT step to connect
          </div>
        )}

        {keyboardSelectedId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-purple-600 text-white px-5 py-2 rounded-full shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2">
            <ArrowRight size={16}/> Press Enter on another step to connect
          </div>
        )}

        <div ref={containerRef} className="relative p-6 min-h-full">
          {/* SVG arrows overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{overflow: 'visible'}}>
            <defs>
              <marker id="pb-arw" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1"/>
              </marker>
              <marker id="pb-arw-ok" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e"/>
              </marker>
              <marker id="pb-arw-err" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/>
              </marker>
            </defs>
            {arrowCoords.map((arrow) => {
              const result = results && results.find(r => r.fromId === arrow.fromId && r.toId === arrow.toId);
              const color = result ? (result.correct ? '#22c55e' : '#ef4444') : '#6366f1';
              const markerId = result ? (result.correct ? 'pb-arw-ok' : 'pb-arw-err') : 'pb-arw';
              const cpOffset = Math.min(Math.abs(arrow.x2 - arrow.x1), Math.abs(arrow.y2 - arrow.y1)) * 0.4 + 30;
              return (
                <path
                  key={`${arrow.fromId}-${arrow.toId}`}
                  d={`M ${arrow.x1} ${arrow.y1} C ${arrow.x1 + cpOffset} ${arrow.y1}, ${arrow.x2 - cpOffset} ${arrow.y2}, ${arrow.x2} ${arrow.y2}`}
                  stroke={color}
                  strokeWidth={result ? 3.5 : 2.5}
                  strokeDasharray={result ? 'none' : '8 4'}
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                  className={`transition-all duration-300 ${result?.correct === false ? 'animate-pulse' : ''}`}
                />
              );
            })}
          </svg>

          {/* Node grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-[5] max-w-5xl mx-auto pt-8">
            {shuffledSteps.map((step) => {
              const isSource = connectingFrom === step.id;
              const isKbSelected = keyboardSelectedId === step.id;
              const connFrom = isConnectedFrom(step.id);
              const connTo = isConnectedTo(step.id);
              const connResult = getConnResult(step.id);
              const isCorrect = connResult?.correct === true;
              const isIncorrect = connResult?.correct === false;
              const outCount = getRequiredOutCount(step.originalIndex);
              const isBranching = outCount > 1;
              const currentOutCount = connections.filter(c => c.fromId === step.id).length;

              const pos = nodePositions[step.id] || { x: 0, y: 0 };

              return (
                <div
                  key={step.id}
                  ref={el => { nodeRefs.current[step.id] = el; }}
                  onClick={() => handleNodeClick(step.id)}
                  onKeyDown={(e) => handleNodeKeyDown(e, step.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Step: ${step.title}. ${isSource ? 'Selected. Click another step to connect.' : 'Click to connect.'}`}
                  style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, zIndex: dragRef.current.id === step.id ? 50 : 5 }}
                  className={`
                    relative p-5 rounded-2xl border-2 cursor-pointer transition-shadow duration-200 select-none min-h-[100px]
                    ${isSource || isKbSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-200 shadow-xl scale-[1.03]'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg'
                    }
                    ${checked && isCorrect ? 'border-green-400 bg-green-50 ring-2 ring-green-200' : ''}
                    ${checked && isIncorrect ? 'border-red-400 bg-red-50 animate-pulse' : ''}
                    ${isComplete ? 'border-green-300 bg-green-50/50' : ''}
                  `}
                >
                  {/* Drag grip handle */}
                  <div
                    onMouseDown={(e) => handleGripDown(e, step.id)}
                    onTouchStart={(e) => handleGripDown(e, step.id)}
                    className="absolute top-1 right-1 z-30 p-1 rounded-lg cursor-grab active:cursor-grabbing text-slate-300 hover:text-indigo-400 hover:bg-indigo-50 transition-colors"
                    aria-label="Drag to reposition"
                    title="Drag to reposition"
                  >
                    <GripVertical size={14}/>
                  </div>

                  {/* Output port (right) */}
                  <div className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-3 z-20 transition-all flex items-center justify-center
                    ${isSource ? 'bg-indigo-500 border-indigo-600 scale-125 shadow-lg shadow-indigo-300' : connFrom ? 'bg-indigo-500 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'}
                  `}>
                    <ArrowRight size={12} className={`${isSource || connFrom ? 'text-white' : 'text-slate-400'}`}/>
                  </div>

                  {/* Branching badge */}
                  {isBranching && (
                    <div className={`absolute -right-2 -top-2 z-30 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black shadow-md border-2 border-white
                      ${currentOutCount >= outCount ? 'bg-green-500 text-white' : `bg-amber-400 text-amber-900 ${!useReducedMotion() ? 'animate-pulse' : ''}`}
                    `}>
                      <GitMerge size={10}/> {currentOutCount}/{outCount}
                    </div>
                  )}

                  {/* Input port (left) */}
                  <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-3 z-20 transition-all flex items-center justify-center
                    ${connectingFrom && connectingFrom !== step.id ? 'bg-purple-100 border-purple-500 scale-125 animate-pulse shadow-lg shadow-purple-200' : connTo ? 'bg-purple-500 border-purple-600' : 'bg-white border-slate-300'}
                  `}>
                    {connTo && <div className="w-2.5 h-2.5 bg-white rounded-full"/>}
                  </div>

                  <h4 className="font-black text-slate-800 text-sm mb-2 pr-6 pl-2">{step.title}</h4>
                  {step.items?.length > 0 && (
                    <ul className="text-xs text-slate-500 space-y-1 pl-2">
                      {step.items.slice(0, 3).map((item, k) => (
                        <li key={k} className="flex items-start gap-1.5">
                          <span className="text-indigo-300 mt-0.5 shrink-0">•</span>
                          <span>{typeof item === 'string' ? item : item.text || item}</span>
                        </li>
                      ))}
                      {step.items.length > 3 && (
                        <li className="text-slate-400 italic ml-3">+{step.items.length - 3} more</li>
                      )}
                    </ul>
                  )}

                  {/* Step number badge for completed pipeline */}
                  {isComplete && (
                    <div className="absolute -top-3 -left-1 bg-green-600 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                      {step.originalIndex + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t-2 border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600 font-bold">
              {t('games.pipeline.instruction') || 'Click a step\'s'} <span className="inline-flex items-center gap-0.5 text-indigo-600"><ArrowRight size={12}/> output</span> {t('games.pipeline.then') || 'then click another step to connect them'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-300"
            >
              <RefreshCw size={12}/> Reset
            </button>
            {!isComplete && (
              <button
                onClick={handleCheck}
                disabled={connections.length === 0 || checked}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={16}/> Check ({connections.length}/{totalRequired})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
const CrosswordGame = React.memo(({ data, onClose, playSound, onScoreUpdate, onGameComplete }) => {
  const { t } = useContext(LanguageContext);
  const [grid, setGrid] = useState([]);
  const [clues, setClues] = useState({ across: [], down: [] });
  const [userState, setUserState] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [isWon, setIsWon] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [score, setScore] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [crosswordLang, setCrosswordLang] = useState('English');
  const availableLangs = React.useMemo(() => {
    const langs = new Set();
    if (data) {
        data.forEach(item => {
            if (item.translations) {
                Object.keys(item.translations).forEach(k => langs.add(k));
            }
        });
    }
    return Array.from(langs);
  }, [data]);
  useEffect(() => {
    if (!data || data.length === 0) return;
    const words = data.reduce((acc, item) => {
        let term = item.term;
        let def = item.def;
        if (crosswordLang !== 'English') {
            const trans = item.translations?.[crosswordLang];
            if (trans) {
                if (trans.includes(':')) {
                    const splitIdx = trans.indexOf(':');
                    term = trans.substring(0, splitIdx).trim();
                    def = trans.substring(splitIdx + 1).trim();
                } else {
                    if (trans.length < 20) term = trans;
                    else return acc;
                }
            } else {
                return acc;
            }
        }
        const cleanWord = term
            .toUpperCase()
            .replace(/\s+/g, '')
            .replace(/[^A-ZÀ-ÿ]/g, '');
        if (cleanWord.length > 2 && cleanWord.length < 15) {
            acc.push({
                word: cleanWord,
                clue: def,
                original: term
            });
        }
        return acc;
    }, []).sort((a, b) => b.word.length - a.word.length);
    if (words.length === 0) {
        setGrid([]);
        setClues({ across: [], down: [] });
        return;
    }
    const gridSize = 20;
    const tempGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const placedWords = [];
    const canPlace = (word, row, col, dir) => {
      if (dir === 'across') {
        if (col + word.length > gridSize) return false;
        if (col > 0 && tempGrid[row][col-1] !== null) return false;
        if (col + word.length < gridSize && tempGrid[row][col+word.length] !== null) return false;
        for (let i = 0; i < word.length; i++) {
          const cell = tempGrid[row][col+i];
          if (cell !== null && cell.char !== word[i]) return false;
          if (cell === null) {
            if (row > 0 && tempGrid[row-1][col+i] !== null) return false;
            if (row < gridSize-1 && tempGrid[row+1][col+i] !== null) return false;
          }
        }
      } else {
        if (row + word.length > gridSize) return false;
        if (row > 0 && tempGrid[row-1][col] !== null) return false;
        if (row + word.length < gridSize && tempGrid[row+word.length][col] !== null) return false;
        for (let i = 0; i < word.length; i++) {
          const cell = tempGrid[row+i][col];
          if (cell !== null && cell.char !== word[i]) return false;
          if (cell === null) {
             if (col > 0 && tempGrid[row+i][col-1] !== null) return false;
             if (col < gridSize-1 && tempGrid[row+i][col+1] !== null) return false;
          }
        }
      }
      return true;
    };
    const place = (wordObj, row, col, dir) => {
      const { word } = wordObj;
      for (let i = 0; i < word.length; i++) {
        const r = dir === 'across' ? row : row + i;
        const c = dir === 'across' ? col + i : col;
        if (!tempGrid[r][c]) tempGrid[r][c] = { char: word[i], startOf: [] };
      }
      if (tempGrid[row][col]) {
          tempGrid[row][col].startOf.push({ ...wordObj, dir, number: 0 });
      }
      placedWords.push({ ...wordObj, row, col, dir });
    };
    const center = Math.floor(gridSize / 2);
    const firstWord = words[0];
    const startCol = center - Math.floor(firstWord.word.length / 2);
    place(firstWord, center, startCol, 'across');
    for (let i = 1; i < words.length; i++) {
      const current = words[i];
      let placed = false;
      const targets = fisherYatesShuffle(placedWords);
      for (const target of targets) {
        if (placed) break;
        for (let j = 0; j < current.word.length; j++) {
          if (placed) break;
          const char = current.word[j];
          for (let k = 0; k < target.word.length; k++) {
             if (target.word[k] === char) {
               const r = target.dir === 'across' ? target.row : target.row + k;
               const c = target.dir === 'across' ? target.col + k : target.col;
               const newDir = target.dir === 'across' ? 'down' : 'across';
               const newRow = newDir === 'across' ? r : r - j;
               const newCol = newDir === 'across' ? c - j : c;
               if (newRow >= 0 && newCol >= 0 && canPlace(current.word, newRow, newCol, newDir)) {
                 place(current, newRow, newCol, newDir);
                 placed = true;
                 break;
               }
             }
          }
        }
      }
    }
    let clueCounter = 1;
    const newClues = { across: [], down: [] };
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = tempGrid[r][c];
        if (cell && cell.startOf && cell.startOf.length > 0) {
           cell.number = clueCounter++;
           cell.startOf.forEach(w => {
              newClues[w.dir].push({ number: cell.number, clue: w.clue, word: w.word, row: r, col: c });
           });
        }
      }
    }
    setGrid(tempGrid);
    setClues(newClues);
    setUserState({});
    setIsWon(false);
    setShowErrors(false);
    setScore(0);
    setAnnouncement(t('games.crossword.announce_started'));
  }, [data, crosswordLang]);
  const handleCellClick = (r, c) => {
    if (!grid[r][c]) return;
    if (selectedCell?.r === r && selectedCell?.c === c) {
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);
      setAnnouncement(t('games.crossword.direction_toggle', { dir: newDir }));
    } else {
      setSelectedCell({ r, c });
      setAnnouncement(t('games.crossword.selected_cell', { r: r + 1, c: c + 1 }));
    }
  };
  const handleKeyDown = (e) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (e.key === 'Backspace') {
       const newKey = `${r}-${c}`;
       setUserState(prev => {
         const next = { ...prev };
         delete next[newKey];
         return next;
       });
       setAnnouncement(t('games.crossword.announce_deleted'));
       if (direction === 'across') {
           let prevC = c - 1;
           while (prevC >= 0 && !grid[r][prevC]) prevC--;
           if (prevC >= 0 && grid[r][prevC]) setSelectedCell({ r, c: prevC });
       } else {
           let prevR = r - 1;
           while (prevR >= 0 && !grid[prevR][c]) prevR--;
           if (prevR >= 0 && grid[prevR][c]) setSelectedCell({ r: prevR, c });
       }
    } else if (e.key.length === 1 && /^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
       const char = e.key.toUpperCase();
       setUserState(prev => ({ ...prev, [`${r}-${c}`]: char }));
       setAnnouncement(t('games.crossword.announce_typed', { char }));
       if (direction === 'across') {
         let nextC = c + 1;
         while (nextC < 20 && !grid[r][nextC]) nextC++;
         if (grid[r][nextC]) setSelectedCell({ r, c: nextC });
       } else {
         let nextR = r + 1;
         while (nextR < 20 && !grid[nextR][c]) nextR++;
         if (grid[nextR][c]) setSelectedCell({ r: nextR, c });
       }
    } else if (e.key === 'ArrowRight') {
       let nextC = c + 1;
       while (nextC < 20 && !grid[r][nextC]) nextC++;
       if (nextC < 20 && grid[r][nextC]) {
           setSelectedCell({ r, c: nextC });
           setAnnouncement(t('games.crossword.selected_cell', { r: r + 1, c: nextC + 1 }));
       }
    } else if (e.key === 'ArrowLeft') {
       let prevC = c - 1;
       while (prevC >= 0 && !grid[r][prevC]) prevC--;
       if (prevC >= 0 && grid[r][prevC]) {
           setSelectedCell({ r, c: prevC });
           setAnnouncement(t('games.crossword.selected_cell', { r: r + 1, c: prevC + 1 }));
       }
    } else if (e.key === 'ArrowDown') {
       let nextR = r + 1;
       while (nextR < 20 && !grid[nextR][c]) nextR++;
       if (nextR < 20 && grid[nextR][c]) {
           setSelectedCell({ r: nextR, c });
           setAnnouncement(t('games.crossword.selected_cell', { r: nextR + 1, c: c + 1 }));
       }
    } else if (e.key === 'ArrowUp') {
       let prevR = r - 1;
       while (prevR >= 0 && !grid[prevR][c]) prevR--;
       if (prevR >= 0 && grid[prevR][c]) {
           setSelectedCell({ r: prevR, c });
           setAnnouncement(t('games.crossword.selected_cell', { r: prevR + 1, c: c + 1 }));
       }
    } else if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
       e.preventDefault();
       const newDir = direction === 'across' ? 'down' : 'across';
       setDirection(newDir);
       setAnnouncement(t('games.crossword.announce_direction_toggle', { dir: newDir }));
    }
  };
  const checkPuzzle = () => {
    setShowErrors(true);
    let correct = true;
    let currentScore = 0;
    for(let r=0; r<grid.length; r++) {
      for(let c=0; c<grid[r].length; c++) {
         if (grid[r][c]) {
            if (userState[`${r}-${c}`] === grid[r][c].char) {
               currentScore += 2;
            } else {
               correct = false;
            }
         }
      }
    }
    if (correct) {
        setIsWon(true);
        currentScore += 100;
        if (playSound) playSound('correct');
        if (onScoreUpdate) onScoreUpdate(currentScore, "Crossword Challenge Complete");
        if (onGameComplete) {
            onGameComplete('crossword', {
                score: currentScore,
                wordsSolved: clues.across.length + clues.down.length,
                totalWords: data?.length || 0
            });
        }
    } else {
        if (playSound) playSound('incorrect');
    }
    setScore(currentScore);
  };
  const revealPuzzle = () => {
     const autoFill = {};
     for(let r=0; r<grid.length; r++) {
      for(let c=0; c<grid[r].length; c++) {
         if (grid[r][c]) {
            autoFill[`${r}-${c}`] = grid[r][c].char;
         }
      }
    }
    setUserState(autoFill);
    setIsWon(true);
    setScore(0);
  };
  const revealHint = () => {
    const emptyCells = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] && userState[`${r}-${c}`] !== grid[r][c].char) {
          emptyCells.push({ r, c, char: grid[r][c].char });
        }
      }
    }
    if (emptyCells.length === 0) return;
    const pick = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    setUserState(prev => ({ ...prev, [`${pick.r}-${pick.c}`]: pick.char }));
    setSelectedCell({ r: pick.r, c: pick.c });
    setHintsUsed(h => h + 1);
    setScore(s => Math.max(0, s - 1));
    setAnnouncement(`Hint: revealed letter ${pick.char}`);
    if (playSound) playSound('click');
  };
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300" data-help-key="crossword_game_container">
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shadow-md shrink-0">
         <h2 className="text-xl font-bold flex items-center gap-2"><Gamepad2 /> {t('games.crossword_title')}</h2>
         <div className="flex items-center gap-4">
             {isWon && (
                 <div className="bg-indigo-800 px-4 py-1 rounded-full text-yellow-400 text-sm font-bold border border-indigo-500 animate-in zoom-in">
                     {t('common.score')}: {score}
                 </div>
             )}
             {!isWon && score > 0 && (
                 <div className="text-indigo-200 text-xs font-medium">
                     {t('games.crossword.current_score', { score })}
                 </div>
             )}
             {availableLangs.length > 0 && (
                <select aria-label={t('common.selection')}
                    value={crosswordLang}
                    onChange={(e) => setCrosswordLang(e.target.value)}
                    className="text-xs font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer shadow-sm"
                >
                    <option value="English">{t('languages.english')}</option>
                    {availableLangs.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                    ))}
                </select>
             )}
             <GameThemeToggle />
             <button data-help-key="crossword_close_btn" onClick={onClose} className="hover:bg-indigo-500 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t('games.crossword.close_puzzle_aria')}><X size={24}/></button>
         </div>
      </div>
      <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
         <div className="flex-grow p-4 overflow-auto bg-slate-100 flex justify-center items-start relative">
            {isWon && <ConfettiExplosion />}
            <div
              className="grid gap-px bg-slate-300 border-2 border-slate-400 p-1 shadow-xl"
              style={{
                 gridTemplateColumns: `repeat(${grid.length}, minmax(0, 1fr))`,
                 width: 'fit-content',
              }}
              data-help-key="crossword_grid"
            >
               {grid.map((row, r) => (
                  row.map((cell, c) => {
                     if (!cell) return <div key={`${r}-${c}`} className="w-8 h-8 sm:w-10 sm:h-10 bg-transparent"></div>;
                     const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                     const isActiveWord = selectedCell && (
                        (direction === 'across' && selectedCell.r === r) ||
                        (direction === 'down' && selectedCell.c === c)
                     );
                     const userChar = userState[`${r}-${c}`];
                     const isError = showErrors && userChar && userChar !== cell.char;
                     const isCorrect = isWon || (showErrors && userChar === cell.char);
                     return (
                        <div
                          key={`${r}-${c}`}
                          onClick={() => handleCellClick(r, c)}
                          className={`
                             w-8 h-8 sm:w-10 sm:h-10 bg-white relative flex items-center justify-center text-lg font-bold uppercase cursor-pointer select-none
                             ring-1 ring-slate-300 ring-inset
                             ${isSelected ? 'bg-yellow-200 ring-2 ring-yellow-400 z-10' : isActiveWord ? 'bg-yellow-50' : ''}
                             ${isError ? 'text-red-500 bg-red-50' : 'text-slate-800'}
                             ${isCorrect ? 'text-green-600' : ''}
                          `}
                          role="gridcell"
                          aria-selected={isSelected}
                          aria-label={`Row ${r+1} Column ${c+1} ${cell.number ? 'Clue ' + cell.number : ''} ${userChar ? 'Value ' + userChar : 'Empty'}`}
                        >
                           {cell.number && <span className="absolute top-0.5 left-0.5 text-[11px] sm:text-[11px] leading-none text-slate-600 font-normal">{cell.number}</span>}
                           {userChar}
                        </div>
                     );
                  })
               ))}
            </div>
         </div>
         <div className="w-full md:w-1/3 bg-white border-l border-slate-200 flex flex-col h-1/2 md:h-full" data-help-key="crossword_clues_list">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div className="text-sm font-bold text-slate-600">
                    {clues.across.length + clues.down.length} {t('games.crossword.clues')}
                 </div>
                 <div className="flex gap-2" data-help-key="crossword_controls">
                     {!isWon && <button onClick={revealHint} className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center gap-1" aria-label="Reveal one letter hint"><HelpCircle size={12}/> Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ''}</button>}
                     <button onClick={checkPuzzle} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">{t('games.crossword.check')}</button>
                     <button onClick={revealPuzzle} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500">{t('games.crossword.reveal')}</button>
                 </div>
             </div>
             <div className="flex-grow overflow-y-auto p-4 space-y-6">
                 <div>
                     <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">{t('games.crossword.across')}</h4>
                     <ul className="space-y-2 text-sm">
                         {clues.across.map(c => (
                             <li
                               key={`a-${c.number}`}
                               className={`cursor-pointer hover:text-indigo-600 p-1 rounded ${selectedCell && selectedCell.r === c.row && selectedCell.c === c.col && direction === 'across' ? 'bg-yellow-100 font-bold' : ''}`}
                               onClick={() => {
                                   setSelectedCell({ r: c.row, c: c.col });
                                   setDirection('across');
                               }}
                             >
                                 <div className="flex items-center gap-1">
                                     <span className="flex-1"><span className="font-bold mr-1">{c.number}.</span> {c.clue}</span>
                                     <SpeakButton text={c.clue} size={11} />
                                 </div>
                             </li>
                         ))}
                     </ul>
                 </div>
                 <div>
                     <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-xs mb-2 border-b pb-1">{t('games.crossword.down')}</h4>
                     <ul className="space-y-2 text-sm">
                         {clues.down.map(c => (
                             <li
                               key={`d-${c.number}`}
                               className={`cursor-pointer hover:text-indigo-600 p-1 rounded ${selectedCell && selectedCell.r === c.row && selectedCell.c === c.col && direction === 'down' ? 'bg-yellow-100 font-bold' : ''}`}
                               onClick={() => {
                                   setSelectedCell({ r: c.row, c: c.col });
                                   setDirection('down');
                               }}
                             >
                                 <div className="flex items-center gap-1">
                                     <span className="flex-1"><span className="font-bold mr-1">{c.number}.</span> {c.clue}</span>
                                     <SpeakButton text={c.clue} size={11} />
                                 </div>
                             </li>
                         ))}
                     </ul>
                 </div>
             </div>
             <input aria-label={t('common.hidden_input')}
                type="text"
                className="opacity-0 absolute h-0 w-0"
                autoFocus
                onKeyDown={handleKeyDown}
                onBlur={(e) => e.target.focus()}
                aria-hidden="true"
             />
             <div className="p-2 bg-slate-50 text-[11px] text-center text-slate-600 border-t">
                 {t('games.crossword.footer_tip')}
             </div>
             {isWon && <div className="p-3"><GameReviewScreen score={score} title={t('games.crossword_title')} items={[...clues.across, ...clues.down].map(c => ({ label: c.word, detail: c.clue, status: 'correct' }))} onPlayAgain={() => { setIsWon(false); setScore(0); setUserState({}); }} onClose={onClose} t={t} /></div>}
         </div>
      </div>
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 pointer-events-none focus:outline-none"
        autoFocus
        aria-label={t('games.crossword.grid_capture_aria')}
      />
    </div>
  );
});
const SyntaxScramble = React.memo(({ text, onClose, playSound, onScoreUpdate, onGameComplete }) => {
  const { t } = useContext(LanguageContext);
  const [sentences, setSentences] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState([]);
  const [userOrder, setUserOrder] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (!text) return;
    let cleanText = text.replace(/[#*_~`]/g, '');
    cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}]/gu, '');
    const rawSentences = cleanText.match(/[^.!?\n]+[.!?]+["']?/g) || [cleanText];
    const validSentences = rawSentences
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(s => {
          const wordCount = s.split(' ').length;
          const startsWithCapital = /^[A-Z"“]/.test(s);
          return wordCount > 3 && s.length < 150 && startsWithCapital;
      });
    const selectedSentences = fisherYatesShuffle(validSentences).slice(0, 10);
    setSentences(selectedSentences);
  }, [text]);
  useEffect(() => {
    if (sentences.length > 0 && currentSentenceIndex < sentences.length) {
      const target = sentences[currentSentenceIndex];
      const words = target.split(' ').map((w, i) => ({
        id: i,
        text: w,
        status: 'pool',
      }));
      const shuffled = fisherYatesShuffle(words);
      setShuffledWords(shuffled);
      setUserOrder([]);
      setGameStatus('playing');
    } else if (sentences.length > 0 && currentSentenceIndex >= sentences.length) {
      setGameStatus('complete');
      playSound('correct');
      if (onGameComplete) {
        onGameComplete('syntaxScramble', {
          score: score,
          sentencesCompleted: sentences.length,
          totalSentences: sentences.length
        });
      }
    }
  }, [sentences, currentSentenceIndex, playSound]);
  const handleWordClick = (word, fromPool) => {
    if (gameStatus === 'correct') return;
    playSound('click');
    if (fromPool) {
      setUserOrder([...userOrder, word]);
      setShuffledWords(prev => prev.filter(w => w.id !== word.id));
    } else {
      setShuffledWords([...shuffledWords, word]);
      setUserOrder(prev => prev.filter(w => w.id !== word.id));
    }
  };
    const checkAnswer = () => {
    const currentTarget = sentences[currentSentenceIndex];
    const userString = userOrder.map(w => w.text).join(' ');
    if (userString.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") === currentTarget.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")) {
      setGameStatus('correct');
      playSound('correct');
      const newScore = score + 40;
      setScore(newScore);
      if (onScoreUpdate) onScoreUpdate(newScore, "Syntax Scramble");
    } else {
      playSound('incorrect');
      const btn = document.getElementById('check-btn');
      if(btn) {
          btn.classList.add('animate-pulse', 'bg-red-600');
          setTimeout(() => btn.classList.remove('animate-pulse', 'bg-red-600'), 500);
      }
    }
  };
  const nextRound = () => {
    setCurrentSentenceIndex(prev => prev + 1);
  };
  if (sentences.length === 0) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
           <h3 className="font-bold text-xl flex items-center gap-2"><Layout size={24}/> {t('games.syntax.title')}</h3>
           <div className="flex items-center gap-4">
               <div className="bg-indigo-800 px-3 py-1 rounded-full text-xs font-bold text-yellow-400 border border-indigo-500">{t('memory.score')}: {score}</div>
               <GameThemeToggle />
               <button data-help-key="syntax_close" onClick={onClose} className="hover:bg-indigo-500 p-1 rounded-full" aria-label={t('common.close')}><X size={24}/></button>
           </div>
        </div>
        <div className="p-8 flex-grow flex flex-col items-center justify-center bg-slate-50 gap-8 overflow-y-auto">
           {gameStatus === 'complete' ? (
               <div className="text-center animate-in zoom-in">
                   <Trophy size={64} className="text-yellow-500 mx-auto mb-4"/>
                   <h2 className="text-3xl font-black text-slate-800 mb-2">{t('games.syntax.complete')}</h2>
                   <p className="text-slate-600 mb-6">{t('games.syntax.summary', { count: sentences.length })}</p>
                    <button data-help-key="syntax_finish" onClick={onClose} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-300">{t('games.syntax.finish')}</button>
               </div>
           ) : (
               <>
                <div className="w-full flex justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <span>{t('games.syntax.progress', { current: currentSentenceIndex + 1, total: sentences.length })}</span>
                    <span>{t('games.syntax.subtitle')}</span>
                </div>
                <div className={`w-full min-h-[80px] p-4 rounded-xl border-2 border-dashed flex flex-wrap gap-2 items-center justify-center transition-colors ${gameStatus === 'correct' ? 'bg-green-50 border-green-400' : 'bg-white border-slate-300'}`}>
                    {userOrder.length === 0 && <span className="text-slate-600 italic pointer-events-none select-none">{t('games.syntax.empty_zone')}</span>}
                    {userOrder.map((word) => (
                        <button
                            aria-label={t('common.continue')}
                            key={`placed-${word.id}`}
                            data-help-key="syntax_dropped_word" onClick={() => handleWordClick(word, false)}
                            className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-3 py-2 rounded-lg font-bold shadow-sm hover:bg-red-100 hover:text-red-800 hover:border-red-200 transition-all animate-in zoom-in duration-200"
                        >
                            {word.text}
                        </button>
                    ))}
                </div>
                <div className="h-12">
                    {gameStatus === 'correct' ? (
                        <button aria-label={t('common.next')}
                            data-help-key="syntax_next" onClick={nextRound}
                            autoFocus
                            className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 animate-in bounce-in"
                        >
                            {t('games.syntax.next')} <ArrowRight size={18}/>
                        </button>
                    ) : (
                        <button
                            aria-label={t('common.check_answer')}
                            id="check-btn" data-help-key="syntax_check"
                            onClick={checkAnswer}
                            disabled={userOrder.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all"
                        >
                            {t('games.syntax.check')}
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-3 justify-center p-4 bg-slate-200/50 rounded-xl w-full border border-slate-400 min-h-[100px]">
                    {shuffledWords.map((word) => (
                        <button
                            key={word.id}
                            data-help-key="syntax_pool_word" onClick={() => handleWordClick(word, true)}
                            className="bg-white text-slate-700 border-b-4 border-slate-300 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:-translate-y-1 active:border-b-0 active:translate-y-0 transition-all"
                        >
                            {word.text}
                        </button>
                    ))}
                </div>
               </>
           )}
        </div>
      </div>
    </div>
  );
});
const BingoGame = React.memo(({ data, onClose, settings, setSettings, onGenerate, bingoState, setBingoState, onGenerateAudio, selectedVoice, alloBotRef }) => {
  const { t } = useContext(LanguageContext);
  useEffect(() => {
      if (onGenerate && (!bingoState.cards || bingoState.cards.length === 0)) {
          onGenerate();
      }
  }, []);
  const [isCallerMode, setIsCallerMode] = useState(false);
  const [callerQueue, setCallerQueue] = useState([]);
  const [currentCallIndex, setCurrentCallIndex] = useState(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [callDelay, setCallDelay] = useState(8);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const callerAudioRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const startCaller = () => {
      const queue = fisherYatesShuffle(data);
      setCallerQueue(queue);
      setCurrentCallIndex(-1);
      setIsCallerMode(true);
      setIsAutoPlaying(false);
      setIsAudioPlaying(false);
      setIsHistoryVisible(true);
  };
  const playCurrentClue = async (index) => {
      if (index < 0 || index >= callerQueue.length) return;
      const item = callerQueue[index];
      let textToRead = item.def;
      if (item.translations) {
          Object.values(item.translations).forEach(trans => {
              const defPart = trans.includes(':') ? trans.split(':')[1].trim() : trans;
              textToRead += ". " + defPart;
          });
      }
      if (callerAudioRef.current) {
          callerAudioRef.current.pause();
      }
      setIsAudioPlaying(true);
      try {
          if (onGenerateAudio) {
               const url = await onGenerateAudio(textToRead, selectedVoice);
               if (!url) { setIsAudioPlaying(false); return; }
               const audio = new Audio(url);
               callerAudioRef.current = audio;
               audio.onended = () => {
                   setIsAudioPlaying(false);
               };
               audio.onerror = () => {
                   setIsAudioPlaying(false);
                   warnLog("Caller audio failed");
               };
               audio.play();
          } else {
              setIsAudioPlaying(false);
          }
      } catch (e) {
          warnLog("Caller TTS Error", e);
          setIsAudioPlaying(false);
      }
  };
  const nextCall = () => {
      if (currentCallIndex < callerQueue.length - 1) {
          const nextIdx = currentCallIndex + 1;
          setCurrentCallIndex(nextIdx);
          playCurrentClue(nextIdx);
      } else {
          setIsAutoPlaying(false);
      }
  };
  const prevCall = () => {
      if (currentCallIndex > 0) {
          const prevIdx = currentCallIndex - 1;
          setCurrentCallIndex(prevIdx);
          playCurrentClue(prevIdx);
      }
  };
  const toggleAutoPlay = () => {
      const newState = !isAutoPlaying;
      setIsAutoPlaying(newState);
      if (newState && !isAudioPlaying) {
          if (currentCallIndex === -1) {
              nextCall();
          } else {
              handleAutoStep();
          }
      }
  };
  const handleAutoStep = () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = setTimeout(() => {
          if (isAutoPlaying) {
              nextCall();
          }
      }, callDelay * 1000);
  };
  useEffect(() => {
      if (!isAudioPlaying && isAutoPlaying && currentCallIndex < callerQueue.length - 1 && currentCallIndex !== -1) {
          handleAutoStep();
      }
      return () => {
          if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      };
  }, [isAudioPlaying, isAutoPlaying, currentCallIndex, callDelay]);
  useEffect(() => {
      return () => {
          if (callerAudioRef.current) callerAudioRef.current.pause();
          if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] p-6 relative bingo-modal-container">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-600 hover:text-slate-600 transition-colors no-print rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                autoFocus
                data-help-key="bingo_close_btn" aria-label={t('bingo.close_generator')}
            >
                <X size={24} />
            </button>
            <div className="text-center mb-4 no-print">
                <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center justify-center gap-2">
                    <Gamepad2 className="text-rose-500" /> {isCallerMode ? t('bingo.caller_title') : t('bingo.generator_title')}
                </h2>
                <p className="text-slate-600 text-sm">{isCallerMode ? t('bingo.teacher_mode_desc') : t('bingo.generated_desc').replace('{count}', bingoState.cards ? bingoState.cards.length : 0)}</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 mb-4 no-print bg-slate-50 p-3 rounded-xl border border-slate-400 shrink-0">
                {!isCallerMode ? (
                    <>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-bold text-slate-600">{t('bingo.card_count')}</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={settings.cardCount}
                                onChange={(e) => setSettings({...settings, cardCount: Math.max(1, Math.min(50, parseInt(e.target.value) || 20))})}
                                className="w-16 p-1.5 border border-slate-400 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-rose-200 focus:outline-none"
                                data-help-key="bingo_card_count_input" aria-label={t('bingo.card_count')}
                            />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-white px-3 py-1.5 rounded-lg border border-slate-400 shadow-sm hover:border-rose-300 transition-colors">
                            <input
                                type="checkbox"
                                checked={settings.includeImages}
                                onChange={(e) => setSettings({...settings, includeImages: e.target.checked})}
                                className="rounded border-slate-300 text-rose-500 focus:ring-rose-200 h-4 w-4"
                                data-help-key="bingo_images_chk" aria-label={t('bingo.include_pictures')}
                            />
                            <div className="flex items-center gap-1">
                                <ImageIcon size={14} className="text-rose-400"/> {t('bingo.include_pictures')}
                            </div>
                        </label>
                        <button
                            onClick={onGenerate}
                            className="flex items-center gap-2 bg-rose-700 hover:bg-rose-800 text-white px-5 py-2 rounded-full font-bold text-xs transition-colors shadow-sm active:scale-95"
                            data-help-key="bingo_regenerate_btn" aria-label={t('bingo.regenerate')}
                        >
                            <RefreshCw size={14}/> {t('bingo.regenerate')}
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-2"></div>
                        <button
                            onClick={() => {
                                if (alloBotRef && alloBotRef.current) {
                                    alloBotRef.current.speak("Printing your Bingo cards! Have fun playing!", "excited");
                                }
                                window.print();
                            }}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold text-xs shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 active:scale-95"
                            data-help-key="bingo_print_btn" aria-label={t('bingo.print_cards')}
                        >
                            <Printer size={16}/> {t('bingo.print_cards')}
                        </button>
                        <div className="w-px h-6 bg-slate-300 mx-2"></div>
                        <button
                            onClick={startCaller}
                            className="bg-teal-700 text-white px-6 py-2 rounded-full font-bold text-xs shadow-lg hover:bg-teal-700 transition-colors flex items-center gap-2 active:scale-95"
                            data-help-key="bingo_launch_caller_btn" aria-label={t('bingo.launch_caller_aria')}
                        >
                            <Mic size={16}/> {t('bingo.launch_caller')}
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-4 w-full justify-between">
                         <button
                            onClick={() => setIsCallerMode(false)}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-700 font-bold text-xs"
                            data-help-key="bingo_exit_caller_btn" aria-label={t('bingo.exit_caller_aria')}
                        >
                            <ArrowDown className="rotate-90" size={14}/> {t('bingo.exit_caller')}
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-400 shadow-sm">
                                <span className="text-xs font-bold text-slate-600 uppercase">{t('bingo.speed')}</span>
                                <input
                                    type="range"
                                    min="3" max="15" step="1"
                                    value={callDelay}
                                    onChange={(e) => setCallDelay(Number(e.target.value))}
                                    className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                                    title={t('bingo.pause_duration', { seconds: callDelay })}
                                    data-help-key="bingo_speed_slider" aria-label={t('bingo.speed')}
                                />
                                <span className="text-xs font-mono w-8 text-right">{callDelay}s</span>
                            </div>
                            <button
                                onClick={() => setIsHistoryVisible(prev => !prev)}
                                className={`p-2 rounded-full transition-colors ${isHistoryVisible ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-slate-700 text-slate-600 hover:bg-slate-600'}`}
                                title={isHistoryVisible ? t('bingo.hide_list') : t('bingo.show_list')}
                                data-help-key="bingo_toggle_history" aria-label={isHistoryVisible ? t('bingo.hide_list') : t('bingo.show_list')}
                            >
                                {isHistoryVisible ? <Eye size={20}/> : <EyeOff size={20}/>}
                            </button>
                            <button
                                onClick={prevCall}
                                disabled={currentCallIndex <= 0}
                                className="p-2 rounded-full hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                data-help-key="bingo_prev_clue" aria-label={t('bingo.prev_clue')}
                                title={t('bingo.prev_clue')}
                            >
                                <ArrowDown className="rotate-90" size={20}/>
                            </button>
                            <button
                                onClick={toggleAutoPlay}
                                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm shadow-md transition-all ${isAutoPlaying ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-teal-700 text-white hover:bg-teal-700'}`}
                                data-help-key="bingo_toggle_autoplay" aria-label={isAutoPlaying ? t('bingo.stop_auto') : t('bingo.start_auto')}
                            >
                                {isAutoPlaying ? <span className="flex items-center gap-2"><StopCircle size={16}/> {t('bingo.stop_auto')}</span> : <span className="flex items-center gap-2"><MonitorPlay size={16}/> {t('bingo.start_auto')}</span>}
                            </button>
                            <button
                                onClick={() => { setIsAutoPlaying(false); nextCall(); }} data-help-key="bingo_next_clue"
                                disabled={currentCallIndex >= callerQueue.length - 1}
                                className="p-2 rounded-full hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                                aria-label={t('bingo.next_clue')}
                                title={t('bingo.next_clue')}
                            >
                                <ArrowDown className="-rotate-90" size={20}/>
                            </button>
                        </div>
                        <div className="text-xs font-bold text-slate-600">
                            {currentCallIndex + 1} / {callerQueue.length}
                        </div>
                    </div>
                )}
            </div>
            {isCallerMode ? (
                <div className="flex-grow flex gap-6 overflow-hidden">
                    <div className="flex-grow bg-slate-100 rounded-2xl border-4 border-teal-500 flex flex-col items-center justify-center p-8 text-center relative shadow-inner">
                        {currentCallIndex >= 0 ? (
                            <div className="animate-in zoom-in duration-300 max-w-3xl">
                                <div className="mb-6">
                                    <span className="bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-teal-200">{t('bingo.current_clue')}</span>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-medium text-slate-800 leading-relaxed mb-6">
                                    "{callerQueue[currentCallIndex].def}"
                                </h3>
                                {callerQueue[currentCallIndex].translations && (
                                    <div className="pt-6 border-t border-slate-200">
                                        {Object.entries(callerQueue[currentCallIndex].translations).map(([lang, trans], idx) => (
                                            <p key={idx} className="text-xl md:text-2xl text-slate-600 italic mt-2">
                                                "{trans.includes(':') ? trans.split(':')[1].trim() : trans}"
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {isAudioPlaying && (
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-teal-600 animate-pulse font-bold">
                                        <Volume2 size={24}/> {t('status.reading')}
                                    </div>
                                )}
                                {isAutoPlaying && !isAudioPlaying && (
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-teal-500 animate-indeterminate-slide"
                                            style={{ animationDuration: `${callDelay}s` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-slate-600">
                                <p className="text-xl font-bold">{t('bingo.ready')}</p>
                                <p className="text-sm">{t('bingo.ready_sub')}</p>
                            </div>
                        )}
                    </div>
                    <div className="w-64 bg-slate-50 rounded-2xl border border-slate-400 flex flex-col overflow-hidden shrink-0">
                        <div className="bg-slate-200 p-3 text-center font-bold text-slate-600 text-xs uppercase tracking-wider border-b border-slate-300 flex justify-between items-center px-4">
                            <span>{t('bingo.called_terms')}</span>
                            <span className="bg-white/50 px-2 py-0.5 rounded text-slate-600">{currentCallIndex + 1}</span>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 custom-scrollbar space-y-1 relative">
                            {isHistoryVisible ? (
                                <>
                                    {callerQueue.slice(0, currentCallIndex + 1).reverse().map((item, i) => (
                                        <div key={i} className="bg-white p-3 rounded border border-slate-400 shadow-sm flex items-center justify-between animate-in slide-in-from-left-2">
                                            <span className="font-bold text-slate-800 text-sm">{item.term}</span>
                                            <span className="text-[11px] text-slate-600 font-mono">#{currentCallIndex - i + 1}</span>
                                        </div>
                                    ))}
                                    {currentCallIndex === -1 && <p className="text-center text-slate-600 text-xs py-4 italic">{t('bingo.history_empty')}</p>}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600/50">
                                    <EyeOff size={48} className="mb-2"/>
                                    <p className="text-sm font-bold">{t('bingo.hide_list')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                bingoState.cards && bingoState.cards.length > 0 ? (
                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-100 p-4 rounded-xl border border-slate-400 relative bingo-scroll-container">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4 print:block" id="bingo-print-area">
                            {bingoState.cards.map((card, cardIdx) => (
                                <div key={cardIdx} className="bg-white p-6 rounded-xl border-4 border-slate-800 shadow-sm aspect-square flex flex-col page-break-inside-avoid break-inside-avoid mb-8 print:mb-4 print:inline-block print:w-[48%] print:align-top print:mx-[1%] print:border-2">
                                    <div className="text-center mb-4 border-b-2 border-slate-800 pb-2">
                                        <h3 className="text-3xl font-black tracking-[0.5em] text-slate-800 uppercase">{t('common.bingo')}</h3>
                                    </div>
                                    <div
                                        className="grid gap-1 flex-grow"
                                        style={{
                                            gridTemplateColumns: `repeat(${Math.sqrt(card.length)}, 1fr)`,
                                            gridTemplateRows: `repeat(${Math.sqrt(card.length)}, 1fr)`,
                                            aspectRatio: '1/1',
                                        }}
                                    >
                                        {card.map((cell, cellIdx) => (
                                            <div
                                                key={cellIdx}
                                                className={`border border-slate-400 flex flex-col items-center justify-center text-center p-1 text-[11px] sm:text-xs font-bold leading-tight overflow-hidden break-words ${cell.type === 'free' ? 'bg-yellow-400 text-black print:bg-black print:text-white border-yellow-500' : 'bg-slate-50 text-slate-700'}`}
                                            >
                                                {cell.type === 'free' ? (
                                                    <span className="text-black font-black print:text-white">★ {t('bingo.free_space')} ★</span>
                                                ) : (
                                                    <>
                                                        {settings.includeImages && cell.image && (
                                                            <img loading="lazy"
                                                                src={cell.image}
                                                                alt=""
                                                                className="w-8 h-8 md:w-10 md:h-10 object-contain mb-1 mix-blend-multiply"
                                                            />
                                                        )}
                                                        <span>{cell.term}</span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 m-4 h-64">
                         <div className="flex flex-col items-center gap-3 text-slate-600">
                             <RefreshCw size={32} className="animate-spin text-rose-400"/>
                             <span className="font-bold text-sm">{t('bingo.initializing_board')}</span>
                         </div>
                    </div>
                )
            )}
        </div>
        <style>{`
            @media print {
                body * { visibility: hidden; }
                #bingo-print-area, #bingo-print-area * { visibility: visible; }
                #bingo-print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                    background: white;
                }
                .bingo-modal-container {
                    position: static !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                    background: white !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .bingo-scroll-container {
                    overflow: visible !important;
                    height: auto !important;
                    max-height: none !important;
                    background: white !important;
                    border: none !important;
                }
                .no-print { display: none !important; }
                .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
            }
.bridge-send-overlay {
  position: fixed; inset: 0; z-index: 9998;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(6px);
  animation: bridgeFadeIn 0.3s ease-out;
}
.bridge-send-panel {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  border-radius: 20px; padding: 28px; max-width: 520px; width: 90vw;
  color: #e2e8f0; box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 60px rgba(20,184,166,0.1);
  animation: bridgeSlideUp 0.4s ease-out;
  border: 1px solid rgba(20,184,166,0.25);
}
.bridge-send-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 18px; padding-bottom: 12px;
  border-bottom: 1px solid rgba(20,184,166,0.2);
}
.bridge-send-header h2 { font-size: 16px; font-weight: 700; margin: 0; color: #5eead4; }
.bridge-send-input {
  width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px; padding: 14px; color: #e2e8f0; font-size: 15px;
  line-height: 1.6; resize: vertical; min-height: 100px;
  transition: border-color 0.2s; outline: none; font-family: inherit;
}
.bridge-send-input:focus { border-color: rgba(20,184,166,0.5); box-shadow: 0 0 20px rgba(20,184,166,0.1); }
.bridge-send-input::placeholder { color: rgba(148,163,184,0.6); }
.bridge-send-modes {
  display: flex; gap: 8px; margin: 14px 0;
}
.bridge-send-mode-btn {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8; padding: 10px 8px; border-radius: 12px; cursor: pointer;
  font-size: 12px; font-weight: 600; text-align: center;
  transition: all 0.2s;
}
.bridge-send-mode-btn:hover { background: rgba(255,255,255,0.1); color: #cbd5e1; }
.bridge-send-mode-btn.active {
  background: rgba(20,184,166,0.15); border-color: rgba(20,184,166,0.4);
  color: #5eead4; box-shadow: 0 0 12px rgba(20,184,166,0.15);
}
.bridge-send-target-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.bridge-send-target-label { font-size: 12px; font-weight: 600; color: #64748b; }
.bridge-send-target-select {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #e2e8f0; padding: 8px 12px; border-radius: 10px; font-size: 13px;
  outline: none; cursor: pointer;
}
.bridge-send-target-select option { background: #1e293b; color: #e2e8f0; }
.bridge-send-btn {
  width: 100%; background: linear-gradient(135deg, #0d9488, #14b8a6);
  border: none; color: white; padding: 14px; border-radius: 14px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 15px rgba(20,184,166,0.3);
}
.bridge-send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(20,184,166,0.4); }
.bridge-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.bridge-offline-notice {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; margin-bottom: 12px;
  background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.25);
  border-radius: 10px; font-size: 12px; color: #fbbf24;
}
.visual-panel-grid { display: grid; gap: 8px; margin: 8px 0; list-style: none; padding: 0; }
.visual-panel-grid.layout-before-after,
.visual-panel-grid.layout-comparison { grid-template-columns: 1fr 1fr; }
.visual-panel-grid.layout-sequence { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px; }
.visual-panel-grid.layout-labeled-diagram,
.visual-panel-grid.layout-single { grid-template-columns: 1fr; }
.visual-panel { position: relative; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; margin: 0; padding: 0; list-style: none; }
.visual-panel:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.visual-panel img { width: 100%; display: block; max-height: 320px; object-fit: contain; background: #f8fafc; }
.visual-panel-role { display: block; text-align: center; background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; font-size: 12px; font-weight: 800; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.8px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.visual-label { position: absolute !important; display: flex; align-items: center; gap: 4px; background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%), rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 800; color: #1e1b4b; border: 2px solid rgba(99,102,241,0.5); box-shadow: 0 4px 16px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.6); pointer-events: auto; cursor: pointer; transition: opacity 0.3s, transform 0.2s, box-shadow 0.2s; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.02em; z-index: 4; }
.visual-label::before { content: ''; position: absolute; left: -6px; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; background: #6366f1; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(99,102,241,0.5); }
.visual-label:hover { transform: scale(1.08) translateY(-1px); border-color: #6366f1; box-shadow: 0 6px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.5); }
.visual-label.hidden-label { opacity: 0; pointer-events: none; }
.visual-label input { border: none; background: transparent; font-size: 14px; font-weight: 800; color: #1e1b4b; outline: none; width: 100%; min-width: 60px; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
.visual-caption { padding: 4px 10px; font-size: 11px; color: #64748b; text-align: center; background: #f8fafc; border-top: 1px solid #f1f5f9; font-weight: 500; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; letter-spacing: 0.01em; line-height: 1.2; margin: 0; }
.visual-panel-actions { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0.6; transition: opacity 0.2s; }
.visual-panel:hover .visual-panel-actions { opacity: 1; }
.visual-panel-actions button { background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 11px; transition: background 0.2s; }
.visual-panel-actions button:hover { background: #eef2ff; border-color: #6366f1; }
.visual-leader-line { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
.visual-leader-line line { stroke: #6366f1; stroke-width: 1.5; stroke-dasharray: 4 3; opacity: 0.7; }
.leader-line-group:hover .anchor-dot { opacity: 0.85 !important; r: 2 !important; }
.visual-panel.drag-over { outline: 3px dashed #6366f1; outline-offset: -3px; background: #eef2ff; }
.visual-panel[draggable="true"] { cursor: grab; }
.visual-panel[draggable="true"]:active { cursor: grabbing; opacity: 0.7; }
.visual-label:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
.visual-label[tabindex] { outline: none; }
.visual-undo-redo { display: flex; gap: 4px; }
.visual-undo-redo button { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer; color: #64748b; transition: all 0.15s; }
.visual-undo-redo button:hover:not(:disabled) { background: #f1f5f9; border-color: #6366f1; color: #4f46e5; }
.visual-undo-redo button:disabled { opacity: 0.3; cursor: not-allowed; }
.drawing-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3; }
.drawing-overlay.active { cursor: crosshair; }
.drawing-overlay svg { width: 100%; height: 100%; }
.drawing-toolbar { display: flex; gap: 4px; align-items: center; }
.drawing-toolbar button { padding: 4px 8px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; font-size: 11px; cursor: pointer; transition: all 0.15s; }
.drawing-toolbar button:hover { background: #fef3c7; border-color: #f59e0b; }
.drawing-toolbar button.active { background: #fbbf24; color: #78350f; border-color: #f59e0b; }
.drawing-toolbar .color-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #e2e8f0; cursor: pointer; transition: transform 0.15s; }
.drawing-toolbar .color-dot:hover { transform: scale(1.2); }
.drawing-toolbar .color-dot.selected { border-color: #1e293b; transform: scale(1.15); box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
.visual-panel.adding-label { cursor: crosshair !important; }
.visual-panel.adding-label::after { content: '+ Click to place label'; position: absolute; bottom: 50%; left: 50%; transform: translate(-50%, 50%); background: rgba(99,102,241,0.9); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; pointer-events: none; z-index: 10; animation: pulse 1.5s infinite; }
.visual-grid-controls { display: flex; gap: 6px; align-items: center; justify-content: flex-start; flex-wrap: wrap; margin-bottom: 6px; }
.visual-grid-controls button { display: flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; color: #475569; }
.visual-grid-controls button:hover { background: #eef2ff; border-color: #6366f1; color: #4f46e5; }
.visual-grid-controls button.active { background: #4f46e5; color: white; border-color: #4f46e5; }
.visual-label:hover .label-delete-btn { visibility: visible !important; }
.visual-sequence-arrow { display: flex; align-items: center; justify-content: center; font-size: 10px; color: #e2e8f0; align-self: center; padding: 0; margin: 0; line-height: 1; height: 12px; letter-spacing: 2px; }
@media (max-width: 640px) {
  .visual-panel-grid.layout-before-after,
  .visual-panel-grid.layout-comparison { grid-template-columns: 1fr; }
}
.bridge-term-chip-interactive { cursor: default; }
.bridge-term-save-btn:hover {
  background: rgba(99,102,241,0.3) !important;
  border-color: rgba(165,180,252,0.6) !important;
  color: #c7d2fe !important;
  transform: scale(1.1);
}
.bridge-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px);
  animation: bridgeFadeIn 0.3s ease-out;
}
@keyframes bridgeFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes bridgeSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.bridge-panel {
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%);
  border-radius: 24px; padding: 32px; max-width: 640px; width: 92vw;
  max-height: 85vh; overflow-y: auto; color: #e2e8f0;
  box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.15);
  animation: bridgeSlideUp 0.4s ease-out;
  border: 1px solid rgba(99,102,241,0.3);
}
.bridge-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; padding-bottom: 12px;
  border-bottom: 1px solid rgba(99,102,241,0.2);
}
.bridge-header h2 { font-size: 18px; font-weight: 700; margin: 0; color: #c7d2fe; }
.bridge-close-btn {
  background: rgba(255,255,255,0.1); border: none; color: #94a3b8;
  width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
  font-size: 16px; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.bridge-close-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
.bridge-image-container {
  border-radius: 16px; overflow: hidden; margin-bottom: 20px;
  border: 2px solid rgba(99,102,241,0.3);
}
.bridge-image-container img { width: 100%; height: auto; display: block; }
.bridge-text-block {
  background: rgba(255,255,255,0.06); border-radius: 16px;
  padding: 20px; margin-bottom: 16px;
  border: 1px solid rgba(255,255,255,0.08);
}
.bridge-lang-label {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: #818cf8; margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
}
.bridge-text {
  font-size: 20px; line-height: 1.7; font-weight: 400;
  color: #e2e8f0; letter-spacing: 0.01em;
}
.bridge-word { display: inline; transition: all 0.15s ease; padding: 1px 2px; border-radius: 4px; }
.bridge-word-active {
  background: rgba(251,191,36,0.35); color: #fbbf24;
  font-weight: 600; text-shadow: 0 0 10px rgba(251,191,36,0.3);
}
.bridge-audio-controls {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
}
.bridge-play-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none;
  color: white; padding: 8px 16px; border-radius: 12px; cursor: pointer;
  font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;
  transition: all 0.2s; box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}
.bridge-play-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
.bridge-play-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.bridge-play-btn.playing { animation: bridgePulse 1.5s infinite; }
@keyframes bridgePulse { 0%, 100% { box-shadow: 0 2px 8px rgba(99,102,241,0.3); } 50% { box-shadow: 0 2px 20px rgba(99,102,241,0.6); } }
@keyframes bridgeSpinnerSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.bridge-progress {
  flex: 1; height: 6px; background: rgba(255,255,255,0.1);
  border-radius: 3px; overflow: hidden;
}
.bridge-progress-bar {
  height: 100%; background: linear-gradient(90deg, #6366f1, #a78bfa);
  border-radius: 3px; transition: width 0.3s linear;
}
.bridge-actions {
  display: flex; gap: 10px; margin-top: 20px; padding-top: 16px;
  border-top: 1px solid rgba(99,102,241,0.2);
  flex-wrap: wrap;
}
.bridge-action-btn {
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
  color: #c7d2fe; padding: 10px 18px; border-radius: 12px;
  cursor: pointer; font-size: 13px; font-weight: 500;
  transition: all 0.2s; flex: 1; text-align: center; min-width: 120px;
}
.bridge-action-btn:hover { background: rgba(255,255,255,0.15); color: #fff; transform: translateY(-1px); }
        `}</style>
    </div>
  );
});
const StudentBingoGame = React.memo(({ data, onClose, playSound, onGameComplete }) => {
  const { t } = useContext(LanguageContext);
  const [grid, setGrid] = useState([]);
  const [marks, setMarks] = useState(new Set());
  const [isWon, setIsWon] = useState(false);
  // Images-on toggle. Default true so vocabulary pictures appear by default in
  // Play Bingo (matches the teacher batch-generator's default). Local state so
  // students can flip pictures off mid-game without affecting the parent.
  const [showImages, setShowImages] = useState(true);
  useEffect(() => {
      if (grid.length > 0) return; // Lock: don't regenerate if card already exists this session
      if (!data || !Array.isArray(data) || data.length === 0) return;
      const terms = data
          .map(d => d.term)
          .filter(t => t && typeof t === 'string' && t.trim().length > 0);
      if (terms.length === 0) return;
      let pool = [...terms];
      const itemsNeeded = 24;
      if (pool.length < itemsNeeded) {
          while (pool.length < itemsNeeded) {
              pool = [...pool, ...terms];
          }
      }
      const shuffled = fisherYatesShuffle(pool).slice(0, itemsNeeded);
      const newGrid = [];
      let termIdx = 0;
      for(let r=0; r<5; r++) {
          const row = [];
          for(let c=0; c<5; c++) {
              if (r===2 && c===2) {
                  row.push({ type: 'free', text: t('bingo.free_space') });
              } else {
                  const matchingEntry = data.find(d => d.term === shuffled[termIdx]);
                  // Glossary items store the generated picture under `image` (data URL or http URL).
                  // Falls back to `imageUrl` for any future variants.
                  row.push({ type: 'term', text: shuffled[termIdx], imageUrl: matchingEntry?.image || matchingEntry?.imageUrl || null });
                  termIdx++;
              }
          }
          newGrid.push(row);
      }
      setGrid(newGrid);
      setMarks(new Set(['2-2']));
      setIsWon(false);
  }, [data]);
  const toggleCell = (r, c) => {
      const key = `${r}-${c}`;
      if (key === "2-2") return;
      const newMarks = new Set(marks);
      if (newMarks.has(key)) {
          newMarks.delete(key);
          if (playSound) playSound('click');
      } else {
          newMarks.add(key);
          if (playSound) {
             const ctx = getGlobalAudioContext();
             if (ctx) {
                 if (ctx.state === 'suspended') {
                     ctx.resume();
                 }
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 osc.connect(gain);
                 gain.connect(ctx.destination);
                 osc.type = 'triangle';
                 osc.frequency.setValueAtTime(400, ctx.currentTime);
                 gain.gain.setValueAtTime(0.1, ctx.currentTime);
                 gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                 osc.start();
                 osc.stop(ctx.currentTime + 0.1);
             }
          }
      }
      setMarks(newMarks);
      checkWin(newMarks);
  };
  const checkWin = (currentMarks) => {
      const isMarked = (r, c) => currentMarks.has(`${r}-${c}`);
      let win = false;
      for(let r=0; r<5; r++) {
          if ([0,1,2,3,4].every(c => isMarked(r, c))) win = true;
      }
      for(let c=0; c<5; c++) {
          if ([0,1,2,3,4].every(r => isMarked(r, c))) win = true;
      }
      if ([0,1,2,3,4].every(i => isMarked(i, i))) win = true;
      if ([0,1,2,3,4].every(i => isMarked(i, 4-i))) win = true;
      if (win && !isWon) {
          setIsWon(true);
          if(playSound) playSound('correct');
          if (onGameComplete) {
            onGameComplete('bingo', {
              cellsMarked: currentMarks.size,
              totalCells: 25,
              winPattern: 'line',
            });
          }
      }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
        {isWon && <ConfettiExplosion />}
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-indigo-500 flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                     <div className="bg-white/20 p-2 rounded-full"><Gamepad2 size={24} /></div>
                     <div>
                         <h2 className="font-black text-2xl uppercase tracking-widest">{t('bingo.student_title')}</h2>
                         <p className="text-indigo-200 text-xs font-bold">{t('bingo.click_hint')}</p>
                     </div>
                 </div>
                 <button
                    onClick={() => setShowImages(v => !v)}
                    className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${showImages ? 'bg-white/20 hover:bg-white/30' : 'hover:bg-indigo-500'}`}
                    aria-pressed={showImages}
                    aria-label={t('bingo.toggle_images_aria') || 'Toggle picture cards'}
                    title={showImages ? (t('bingo.hide_images_title') || 'Hide pictures') : (t('bingo.show_images_title') || 'Show pictures')}
                 >
                    <ImageIcon size={20} className={showImages ? 'text-white' : 'text-indigo-200'} />
                 </button>
                 <GameThemeToggle />
                 <button onClick={onClose} className="p-2 hover:bg-indigo-500 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" aria-label={t('bingo.close_game_aria')}>
                     <X size={24} />
                 </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar bg-indigo-50 flex-grow flex items-center justify-center">
                <div className="grid grid-cols-5 gap-2 w-full aspect-square max-w-[600px]">
                    {grid.map((row, r) => (
                        row.map((cell, c) => {
                            const isMarked = marks.has(`${r}-${c}`);
                            return (
                                <div
                                    key={`${r}-${c}`}
                                    onClick={() => toggleCell(r, c)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${cell.text}${isMarked ? ' (marked)' : ''}`}
                                    aria-pressed={isMarked}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            toggleCell(r, c);
                                        }
                                    }}
                                    className={`
                                        relative border-2 rounded-lg flex items-center justify-center text-center p-1 cursor-pointer transition-all duration-200 select-none shadow-sm
                                        ${cell.type === 'free'
                                            ? 'bg-indigo-200 border-indigo-400 text-indigo-800 font-black'
                                            : isMarked
                                                ? 'bg-white border-indigo-500'
                                                : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                                        }
                                    `}
                                >
                                    {showImages && cell.imageUrl && (
                                        <img src={cell.imageUrl} alt={cell.text} className={`w-8 h-8 sm:w-10 sm:h-10 object-contain rounded mb-0.5 ${isMarked && cell.type !== 'free' ? 'opacity-40' : ''}`} />
                                    )}
                                    <span className={`text-[11px] sm:text-xs font-bold leading-tight break-words ${isMarked && cell.type !== 'free' ? 'opacity-40' : ''}`}>
                                        {cell.text}
                                    </span>
                                    {isMarked && (
                                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                            {cell.type === 'free' ? (
                                                <Star size={32} className="text-yellow-500 fill-yellow-400 drop-shadow-sm animate-in zoom-in duration-300" />
                                            ) : (
                                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-red-500/80 border-4 border-red-600/50 shadow-lg backdrop-blur-[1px] animate-in zoom-in duration-200"></div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>
            {isWon && (
                <div className="p-4 bg-green-100 border-t border-green-200 text-center">
                    <h3 className="text-2xl font-black text-green-700 animate-bounce">{t('bingo.win_header')}</h3>
                    <p className="text-green-800 text-sm">{t('bingo.win_message')}</p>
                </div>
            )}
        </div>
    </div>
  );
});
const WordScrambleGame = React.memo(({ data, onClose, playSound, onScoreUpdate }) => {
  const { t } = useContext(LanguageContext);
  const [gameItems, setGameItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('idle');
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [results, setResults] = useState([]);
  useEffect(() => {
    if (!data) return;
    const items = data.filter(item => item.term && item.term.length > 2);
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    setGameItems(items);
    setCurrentIndex(0);
    setScore(0);
    setIsGameOver(false);
    setResults([]);
    setFeedback('idle');
    setGuess('');
    if (items.length > 0) {
        setScrambled(scrambleWord(items[0].term));
    }
  }, [data]);
  const nextRound = (currentScore) => {
      if (currentIndex < gameItems.length - 1) {
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          setScrambled(scrambleWord(gameItems[nextIdx].term));
          setGuess('');
          setFeedback('idle');
          setHintLevel(0);
      } else {
          setIsGameOver(true);
          if (onScoreUpdate) onScoreUpdate(currentScore, "Word Scramble Complete");
          if (playSound) playSound('correct');
      }
  };
  const handleCheck = () => {
      const currentItem = gameItems[currentIndex];
      if (!currentItem) return;
      const target = currentItem.term.trim().toLowerCase();
      const userGuess = guess.trim().toLowerCase();
      if (userGuess === target) {
          if (playSound) playSound('correct');
          setFeedback('correct');
          setResults(prev => [...prev, { term: currentItem.term, def: currentItem.def, correct: true }]);
          const newScore = score + 10;
          setScore(newScore);
          setTimeout(() => {
              nextRound(newScore);
          }, 1000);
      } else {
          if (playSound) playSound('incorrect');
          setFeedback('incorrect');
          setTimeout(() => setFeedback('idle'), 800);
      }
  };
  const handleSkip = () => {
      const currentItem = gameItems[currentIndex];
      if (currentItem) setResults(prev => [...prev, { term: currentItem.term, def: currentItem.def, correct: false }]);
      nextRound(score);
  };
  const useHint = () => {
      const currentItem = gameItems[currentIndex];
      if (!currentItem) return;
      const maxHints = Math.max(1, currentItem.term.length - 1);
      if (hintLevel >= maxHints) return;
      setHintLevel(h => h + 1);
      setScore(s => Math.max(0, s - 3));
      if (playSound) playSound('click');
  };
  const hintText = hintLevel > 0 && gameItems[currentIndex]
      ? gameItems[currentIndex].term.slice(0, hintLevel).toUpperCase() + '_ '.repeat(gameItems[currentIndex].term.length - hintLevel).trim()
      : null;
  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in-95">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative p-8 text-center border-4 border-indigo-500">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label={t('common.close')}
            >
                <X size={24} />
            </button>
            <div className="mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                    <Type size={32} />
                </div>
                <h2 className="text-3xl font-black text-indigo-900 mb-2">{t('games.scramble.title')}</h2>
                <p className="text-slate-600 font-medium">{t('games.scramble.subtitle')}</p>
            </div>
            <div className="flex-grow flex flex-col items-center justify-center min-h-[300px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-6 gap-6">
                {isGameOver ? (
                    <div className="text-center animate-in zoom-in">
                        <ConfettiExplosion />
                        <Trophy size={64} className="text-yellow-500 mx-auto mb-4"/>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">{t('games.syntax.complete')}</h2>
                        <div className="text-lg font-bold text-indigo-600 mb-6 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 inline-block">
                            {t('games.scramble.score')}: {score}
                        </div>
                        <GameReviewScreen
                          score={score}
                          title={t('games.scramble.title')}
                          items={results.map(r => ({ label: r.term, detail: r.def, status: r.correct ? 'correct' : 'incorrect' }))}
                          onPlayAgain={() => { setIsGameOver(false); setResults([]); setCurrentIndex(0); setScore(0); setGuess(''); setFeedback('idle'); if (gameItems.length > 0) setScrambled(scrambleWord(gameItems[0].term)); }}
                          onClose={onClose}
                          t={t}
                        />
                    </div>
                ) : gameItems.length > 0 ? (
                    <>
                        <div className="flex items-center justify-between w-full px-4 border-b border-slate-200 pb-2">
                             <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('games.scramble.progress', { current: currentIndex + 1, total: gameItems.length })}</span>
                             <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold text-sm">{t('flashcards.score_label')} {score}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm max-w-lg w-full">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1 justify-center"><Search size={12}/> {t('games.scramble.hint_label')}</h4>
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-lg font-medium text-slate-700 leading-relaxed">"{gameItems[currentIndex].def}"</p>
                                <SpeakButton text={gameItems[currentIndex].def} />
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {scrambled.split('').map((char, idx) => (
                                <div
                                    key={idx}
                                    className="w-12 h-12 sm:w-16 sm:h-16 bg-white border-b-4 border-indigo-300 rounded-lg flex items-center justify-center text-2xl sm:text-4xl font-black text-indigo-900 shadow-sm animate-in zoom-in"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    {char.toUpperCase()}
                                </div>
                            ))}
                        </div>
                        {hintText && (
                            <div className="bg-amber-50 border-2 border-amber-300 text-amber-800 px-4 py-2 rounded-xl font-mono text-xl tracking-[0.3em] font-bold animate-in fade-in">
                                {hintText}
                            </div>
                        )}
                        <div className="flex flex-col gap-3 w-full max-w-xs animate-in slide-in-from-bottom-4 fade-in">
                            <input
                                type="text"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                                className={`w-full text-center text-2xl font-black p-3 rounded-xl border-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all uppercase tracking-widest ${
                                    feedback === 'correct' ? 'border-green-500 bg-green-50 text-green-800' :
                                    feedback === 'incorrect' ? 'border-red-400 bg-red-50 text-red-800' :
                                    'border-indigo-200 focus:border-indigo-400 text-indigo-900 bg-white'
                                }`}
                                placeholder={t('games.scramble.input_placeholder')}
                                disabled={feedback === 'correct'}
                                autoFocus
                                aria-label={t('games.scramble.input_placeholder')}
                            />
                            <div className="flex gap-2 w-full">
                                <button onClick={useHint} className="flex-1 py-3 rounded-xl font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1" aria-label="Get a hint">
                                    <HelpCircle size={14}/> Hint
                                </button>
                                <button data-help-ignore="true"
                                    aria-label={t('common.skip')}
                                    data-help-key="wizard_skip_btn"
                    onClick={handleSkip}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    {t('games.scramble.skip')}
                                </button>
                                <button
                                    aria-label={t('common.check')}
                                    onClick={handleCheck}
                                    className="flex-[2] py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95"
                                >
                                    {t('games.scramble.submit')}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-slate-600 italic">{t('games.scramble.loading')}</p>
                )}
            </div>
        </div>
    </div>
  );
});
