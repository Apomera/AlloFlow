// immersive_reader_source.jsx — SpeedReaderOverlay, ImmersiveToolbar
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState; var useEffect = React.useEffect; var useRef = React.useRef;
var useContext = React.useContext; var useMemo = React.useMemo; var useCallback = React.useCallback;
var _lazyIcon = function(name) { return function(props) { var I = window.AlloIcons && window.AlloIcons[name]; return I ? React.createElement(I, props) : null; }; };
var ArrowLeft = _lazyIcon('ArrowLeft');
var ArrowRight = _lazyIcon('ArrowRight');
var BookOpen = _lazyIcon('BookOpen');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var List = _lazyIcon('List');
var Pause = _lazyIcon('Pause');
var Play = _lazyIcon('Play');
var Settings2 = _lazyIcon('Settings2');
var Volume2 = _lazyIcon('Volume2');
var X = _lazyIcon('X');
var Zap = _lazyIcon('Zap');

const SpeedReaderOverlay = React.memo(({ text, onClose, isOpen }) => {
  const { t } = useContext(LanguageContext);
    const [words, setWords] = React.useState([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [wpm, setWpm] = React.useState(300);
    const [showControls, setShowControls] = React.useState(true);
    const [focusColor, setFocusColor] = React.useState('#dc2626');
    const colorOptions = [
        { name: 'Red', value: '#dc2626' },
        { name: 'Blue', value: '#2563eb' },
        { name: 'Green', value: '#16a34a' },
        { name: 'Purple', value: '#9333ea' },
        { name: 'Orange', value: '#ea580c' },
        { name: 'Pink', value: '#db2777' },
        { name: 'Teal', value: '#0d9488' },
    ];
    React.useEffect(() => {
        if (text) {
            const cleaned = String(text || '')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const w = cleaned.split(' ').filter(word => word.length > 0);
            setWords(w);
            setCurrentIndex(0);
        }
    }, [text]);
    React.useEffect(() => {
        if (!isPlaying) return;
        const delay = 60000 / wpm;
        const interval = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= words.length - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, delay);
        return () => clearInterval(interval);
    }, [isPlaying, wpm, words.length]);
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPlaying(p => !p);
            } else if (e.code === 'ArrowLeft') {
                setCurrentIndex(p => Math.max(0, p - 1));
            } else if (e.code === 'ArrowRight') {
                setCurrentIndex(p => Math.min(words.length - 1, p + 1));
            } else if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, words.length]);
    if (!isOpen) return null;
    const currentWord = words[currentIndex] || "";
    const centerIdx = Math.floor(currentWord.length / 2);
    const pre = currentWord.slice(0, centerIdx);
    const mid = currentWord.charAt(centerIdx);
    const post = currentWord.slice(centerIdx + 1);
    return (
        <div className="fixed inset-0 z-[300] bg-white text-slate-900 flex flex-col animate-in fade-in duration-200">
            <div
                className={`p-4 flex justify-between items-center transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'}`}
            >
                <div className="flex items-center gap-4">
                     <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                        <ArrowLeft size={24} />
                     </button>
                     <div className="flex flex-col">
                        <span className="font-bold text-lg">{t('adventure.focus_reader')}</span>
                        <span className="text-xs text-slate-600">{currentIndex + 1} / {words.length}</span>
                     </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">COLOR</span>
                        <div className="flex gap-1">
                            {colorOptions.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setFocusColor(c.value)}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${focusColor === c.value ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">SPEED</span>
                        <input aria-label={t('common.speed')}
                            type="range"
                            min="100"
                            max="800"
                            step="50"
                            value={wpm}
                            onChange={(e) => setWpm(Number(e.target.value))}
                            className="w-32 accent-indigo-600"
                        />
                        <span className="font-mono font-bold w-12 text-right">{wpm}</span>
                    </div>
                </div>
            </div>
            <div
                className="flex-1 flex flex-col items-center justify-center cursor-pointer"
                onClick={() => setIsPlaying(p => !p)}
            >
                <div className="relative text-7xl md:text-9xl font-mono font-bold tracking-wide select-none">
                    <div className="flex items-baseline">
                        <span className="text-slate-800">{pre}</span>
                        <span style={{ color: focusColor }}>{mid}</span>
                        <span className="text-slate-800">{post}</span>
                    </div>
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-100 -translate-x-1/2 -z-10 h-full"></div>
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -translate-y-1/2 -z-10 w-full"></div>
                </div>
                <div className="mt-12 text-slate-600 animate-pulse text-sm">
                    {isPlaying ? (
                        <span className="flex items-center gap-2"><Pause size={16}/> Tap to Pause</span>
                    ) : (
                        <span className="flex items-center gap-2"><Play size={16}/> Tap or Space to Play</span>
                    )}
                </div>
            </div>
            <div className="h-2 bg-slate-100 w-full">
                <div
                    className="h-full bg-indigo-600 transition-all duration-100 ease-linear"
                    style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                />
            </div>
        </div>
    );
});

const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader, isChunkReaderActive, onToggleChunkReader, chunkReaderIdx, setChunkReaderIdx, chunkReaderAutoPlay, setChunkReaderAutoPlay, chunkReaderSpeed, setChunkReaderSpeed, totalSentences, interactionMode, setInteractionMode, isBionicReaderActive, onToggleBionicReader, isCrawlReaderActive, onToggleCrawlReader }) => {
  const { t } = useContext(LanguageContext);
  const toggleSetting = useCallback((key) => setSettings(prev => ({...prev, [key]: !prev[key]})), [setSettings]);
  const ToggleButton = React.memo(({ active, onClick, settingKey, title, children, activeColor = "bg-indigo-600 text-white", ...props }) => (
    <button
      onClick={settingKey ? () => toggleSetting(settingKey) : onClick}
      title={title}
      className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${
        active ? activeColor : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
      {...props}
    >
      {children}
    </button>
  ));
  return (
    <div className="sticky top-0 z-[60] p-4 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 shrink-0">
            <Settings2 size={14}/> {t('immersive.title')}
        </span>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-700">{t('immersive.text_size')}</label>
            <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-600">A</span>
                <input aria-label={t('common.adjust_settings')}
                    type="range"
                    min="12"
                    max="48"
                    value={settings.textSize}
                    onChange={(e) => setSettings(prev => ({...prev, textSize: parseInt(e.target.value)}))}
                    className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    title={t('immersive.text_size')}
                />
                <span className="text-sm font-bold text-slate-700">A</span>
            </div>
        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0">
            <ToggleButton
              active={settings.wideText}
              settingKey="wideText"
              title={t('immersive.toggle_spacing')}
              data-help-key="immersive_wide_text"
            >
              {t('immersive.wide_text')}
            </ToggleButton>
            <ToggleButton
              active={settings.showSyllables}
              settingKey="showSyllables"
              title={t('immersive.toggle_syllables')}
              data-help-key="immersive_syllables"
            >
              {t('immersive.syllables')}
            </ToggleButton>
            <ToggleButton
              active={settings.lineFocus}
              settingKey="lineFocus"
              title={t('immersive.toggle_line_focus')}
              data-help-key="immersive_line_focus"
            >
              {t('immersive.line_focus')}
            </ToggleButton>
            <ToggleButton
              active={isSpeedReaderActive}
              onClick={onToggleSpeedReader}
              title={t('common.lightning_speed_read_rsvp')}
              activeColor="bg-sky-500 text-white"
            >
              <Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
            <ToggleButton
              active={isChunkReaderActive}
              onClick={onToggleChunkReader}
              title={(t('immersive.chunk_read') || 'Chunk Read')}
              activeColor="bg-emerald-700 text-white"
              data-help-key="immersive_chunk_reader"
            >
              <List size={14} className="mr-1 inline"/> {(t('immersive.chunk_read') || 'Chunk Read')}
            </ToggleButton>
            {onToggleBionicReader && (
              <ToggleButton
                active={!!isBionicReaderActive}
                onClick={onToggleBionicReader}
                title={(t('immersive.chunk_stream') || 'Chunk Stream — bold-assist chunked reading')}
                activeColor="bg-indigo-600 text-white"
                data-help-key="immersive_bionic_reader"
              >
                <BookOpen size={14} className="mr-1 inline"/> {(t('immersive.chunk_stream') || 'Chunk Stream')}
              </ToggleButton>
            )}
            {onToggleCrawlReader && (
              <ToggleButton
                active={!!isCrawlReaderActive}
                onClick={onToggleCrawlReader}
                title={(t('immersive.cinematic_crawl') || 'Cinematic Crawl — receding-perspective scroll')}
                activeColor="bg-amber-500 text-slate-900"
                data-help-key="immersive_perspective_crawl"
              >
                <Zap size={14} className="mr-1 inline"/> {(t('immersive.cinematic_crawl') || 'Crawl')}
              </ToggleButton>
            )}
        </div>
        {setInteractionMode && (
          <>
          <div className="h-4 w-px bg-slate-300 shrink-0"></div>
          <div className="flex items-center gap-1 shrink-0 bg-slate-100 rounded-full p-0.5" role="group" aria-label={t('immersive.tap_mode') || 'Tap action'}>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2">{t('immersive.tap_mode') || 'Tap'}</span>
            <button
              onClick={() => setInteractionMode('read')}
              aria-pressed={interactionMode !== 'define' && interactionMode !== 'phonics'}
              title={t('immersive.tap_speak') || 'Tap a word to hear it'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode !== 'define' && interactionMode !== 'phonics' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Volume2 size={12}/> {t('immersive.speak') || 'Speak'}
            </button>
            <button
              onClick={() => setInteractionMode('define')}
              aria-pressed={interactionMode === 'define'}
              title={t('immersive.tap_define') || 'Tap a word to see its definition and picture'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode === 'define' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <BookOpen size={12}/> {t('immersive.define') || 'Define'}
            </button>
          </div>
          </>
        )}
        {isChunkReaderActive && (
          <>
          <div className="h-4 w-px bg-slate-300 shrink-0"></div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setChunkReaderIdx(Math.max(0, chunkReaderIdx - 1))} disabled={chunkReaderIdx <= 0} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all" title={t('common.previous')}><ChevronLeft size={14}/></button>
            <span className="text-xs font-bold text-slate-600 tabular-nums min-w-[3rem] text-center">{chunkReaderIdx + 1} / {totalSentences}</span>
            <button onClick={() => setChunkReaderIdx(Math.min(totalSentences - 1, chunkReaderIdx + 1))} disabled={chunkReaderIdx >= totalSentences - 1} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all" title={t('common.next')}><ChevronRight size={14}/></button>
            <div className="h-4 w-px bg-slate-200"></div>
            <button onClick={() => setChunkReaderAutoPlay(!chunkReaderAutoPlay)} className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderAutoPlay ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title={chunkReaderAutoPlay ? t('common.pause') : (t('common.auto_play') || 'Auto')}>
              {chunkReaderAutoPlay ? <Pause size={12} className="inline"/> : <Play size={12} className="inline"/>}
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-600">1s</span>
              <input type="range" min="1000" max="8000" step="500" value={chunkReaderSpeed} onChange={(e) => setChunkReaderSpeed(parseInt(e.target.value))} className="w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" title={`${(chunkReaderSpeed/1000).toFixed(1)}s`} aria-label={t('immersive.speed')}/>
              <span className="text-[11px] text-slate-600 tabular-nums">{(chunkReaderSpeed/1000).toFixed(1)}s</span>
            </div>
          </div>
          </>
        )}
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600">{t('immersive.grammar_label')}</span>
            <ToggleButton
              active={settings.showNouns}
              settingKey="showNouns"
              title={t('immersive.highlight_nouns')}
              activeColor="bg-blue-700 text-white"
            >
              {t('immersive.nouns')}
            </ToggleButton>
            <ToggleButton
              active={settings.showVerbs}
              settingKey="showVerbs"
              title={t('immersive.highlight_verbs')}
              activeColor="bg-red-500 text-white"
            >
              {t('immersive.verbs')}
            </ToggleButton>
            <ToggleButton
              active={settings.showAdjectives}
              settingKey="showAdjectives"
              title={t('immersive.highlight_adjectives')}
              activeColor="bg-green-700 text-white"
            >
              {t('immersive.adjectives')}
            </ToggleButton>
            <ToggleButton
              active={settings.showAdverbs}
              settingKey="showAdverbs"
              title={t('immersive.highlight_adverbs')}
              activeColor="bg-purple-500 text-white"
            >
              {t('immersive.adverbs')}
            </ToggleButton>
        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0 relative">
            <span className="text-xs font-bold text-slate-600">{t('immersive.colors') || 'Colors'}</span>
            <select
              aria-label={t('immersive.color_preset') || 'Color preset'}
              value=""
              onChange={(e) => {
                const presets = {
                  'warm': { bgColor: '#fdfbf7', fontColor: '#1e293b' },
                  'dark': { bgColor: '#1a1a2e', fontColor: '#e2e8f0' },
                  'high-contrast': { bgColor: '#000000', fontColor: '#ffff00' },
                  'sepia': { bgColor: '#f4ecd8', fontColor: '#5c4033' },
                  'blue-wash': { bgColor: '#d6eaf8', fontColor: '#1b2631' },
                  'green-tint': { bgColor: '#e8f5e9', fontColor: '#1b5e20' },
                  'rose': { bgColor: '#fce4ec', fontColor: '#880e4f' },
                };
                if (presets[e.target.value]) {
                  setSettings(prev => ({...prev, ...presets[e.target.value]}));
                }
              }}
              className="text-xs bg-slate-100 border border-slate-200 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-600"
            >
              <option value="" disabled>{t('immersive.presets') || 'Presets'}</option>
              <option value="warm">☀️ Warm</option>
              <option value="dark">🌙 Dark</option>
              <option value="high-contrast">◼️ High Contrast</option>
              <option value="sepia">📜 Sepia</option>
              <option value="blue-wash">💧 Blue Wash</option>
              <option value="green-tint">🌿 Green Tint</option>
              <option value="rose">🌸 Rose</option>
            </select>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-600">{t('immersive.bg') || 'Bg'}</label>
              <input type="color" value={settings.bgColor || '#fdfbf7'} onChange={(e) => setSettings(prev => ({...prev, bgColor: e.target.value}))} className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none" style={{backgroundColor: settings.bgColor}} aria-label={t('immersive.bg_color') || 'Background color'}/>
              <label className="text-[11px] text-slate-600">{t('immersive.text') || 'Text'}</label>
              <input type="color" value={settings.fontColor || '#1e293b'} onChange={(e) => setSettings(prev => ({...prev, fontColor: e.target.value}))} className="w-5 h-5 rounded-full border border-slate-200 cursor-pointer p-0 appearance-none" style={{backgroundColor: settings.fontColor}} aria-label={t('immersive.text_color') || 'Text color'}/>
            </div>
        </div>
      </div>
      <button aria-label={t('common.close_word_wall')}
        onClick={onClose}
        title={t('immersive.close')}
        className="ml-4 shrink-0 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
});

// ============================================================================
// BionicChunkReader — phrase-chunked display with bionic-style bold-assist
// Shows N words at a time, large and centered, with the leading ~40% of each
// word bolded to accelerate decoding. A calmer, meaning-preserving alternative
// to single-word RSVP.
// ============================================================================
const BionicChunkReader = React.memo(({ text, onClose, isOpen }) => {
    const { t } = useContext(LanguageContext);
    const [words, setWords] = useState([]);
    const [chunkIdx, setChunkIdx] = useState(0);
    const [chunkSize, setChunkSize] = useState(3);
    const [isPlaying, setIsPlaying] = useState(false);
    const [cpm, setCpm] = useState(120); // chunks per minute (120 × 3 words = 360 wpm)
    const [theme, setTheme] = useState('warm'); // 'warm' | 'dark' | 'sepia'
    const themes = {
        warm: { bg: '#fdfbf7', strong: '#111827', light: '#6b7280', accent: '#4f46e5' },
        dark: { bg: '#0f172a', strong: '#f1f5f9', light: '#94a3b8', accent: '#818cf8' },
        sepia: { bg: '#f4ecd8', strong: '#3b2a1a', light: '#8b6f4e', accent: '#b45309' }
    };
    const c = themes[theme] || themes.warm;

    useEffect(() => {
        if (text) {
            const cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            setWords(cleaned.split(' ').filter(w => w.length > 0));
            setChunkIdx(0);
        }
    }, [text]);

    const chunks = useMemo(() => {
        const out = [];
        for (let i = 0; i < words.length; i += chunkSize) out.push(words.slice(i, i + chunkSize));
        return out;
    }, [words, chunkSize]);

    useEffect(() => {
        if (!isPlaying) return;
        const delay = 60000 / Math.max(10, cpm);
        const id = setInterval(() => {
            setChunkIdx(prev => {
                if (prev >= chunks.length - 1) { setIsPlaying(false); return prev; }
                return prev + 1;
            });
        }, delay);
        return () => clearInterval(id);
    }, [isPlaying, cpm, chunks.length]);

    useEffect(() => {
        const handler = (e) => {
            if (!isOpen) return;
            if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
            else if (e.code === 'ArrowLeft') setChunkIdx(p => Math.max(0, p - 1));
            else if (e.code === 'ArrowRight') setChunkIdx(p => Math.min(chunks.length - 1, p + 1));
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, chunks.length]);

    if (!isOpen) return null;

    const renderBionicWord = (w, i) => {
        const boldLen = Math.max(1, Math.ceil(w.length * 0.4));
        return (
            <span key={i}>
                <span style={{ fontWeight: 900, color: c.strong }}>{w.slice(0, boldLen)}</span>
                <span style={{ fontWeight: 400, color: c.light }}>{w.slice(boldLen)}</span>
                {i < (chunks[chunkIdx] || []).length - 1 ? ' ' : ''}
            </span>
        );
    };

    const currentChunk = chunks[chunkIdx] || [];
    const progressPct = chunks.length > 0 ? ((chunkIdx + 1) / chunks.length) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200" style={{ backgroundColor: c.bg }}>
            <div className="p-4 flex justify-between items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} aria-label={t('common.close') || 'Close'} className="p-2 rounded-full hover:bg-black/5" style={{ color: c.strong }}>
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-bold text-base" style={{ color: c.strong }}>{t('immersive.chunk_stream') || 'Chunk Stream'}</span>
                        <span className="text-xs" style={{ color: c.light }}>{chunkIdx + 1} / {chunks.length} · bold-assist reading</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-xs font-bold" style={{ color: c.strong }}>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.light }}>WORDS</span>
                        <input aria-label="Words per chunk" type="range" min="1" max="6" value={chunkSize} onChange={e => setChunkSize(parseInt(e.target.value))} className="w-16" />
                        <span className="font-mono w-4 text-right">{chunkSize}</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.light }}>SPEED</span>
                        <input aria-label="Chunks per minute" type="range" min="40" max="300" step="10" value={cpm} onChange={e => setCpm(parseInt(e.target.value))} className="w-24" />
                        <span className="font-mono w-16 text-right">{cpm} cpm</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.light }}>THEME</span>
                        <select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value)} className="text-xs rounded px-2 py-1 border" style={{ borderColor: c.light + '55', background: 'transparent', color: c.strong }}>
                            <option value="warm">☀️ Warm</option>
                            <option value="dark">🌙 Dark</option>
                            <option value="sepia">📜 Sepia</option>
                        </select>
                    </label>
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none px-8" onClick={() => setIsPlaying(p => !p)}>
                <div className="max-w-5xl text-center" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)', lineHeight: 1.15, fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif' }}>
                    {currentChunk.map((w, i) => renderBionicWord(w, i))}
                </div>
                <div className="mt-10 text-sm flex items-center gap-2" style={{ color: c.light }}>
                    {isPlaying
                        ? <><Pause size={16} /> Tap to pause · ← → navigate</>
                        : <><Play size={16} /> Tap or Space to play · ← → navigate · Esc closes</>}
                </div>
            </div>
            <div className="h-2 w-full" style={{ background: c.light + '33' }}>
                <div className="h-full transition-all duration-200" style={{ width: `${progressPct}%`, backgroundColor: c.accent }} />
            </div>
        </div>
    );
});

// ============================================================================
// PerspectiveCrawlOverlay — cinematic upward-receding scroll (the "crawl")
// Text starts at the bottom, scrolls up, tilts away from the reader as it
// travels into the distance. Dramatic long-form reading mode.
// ============================================================================
const PerspectiveCrawlOverlay = React.memo(({ text, onClose, isOpen }) => {
    const { t } = useContext(LanguageContext);
    const [speedPxPerSec, setSpeedPxPerSec] = useState(50);
    const [isPlaying, setIsPlaying] = useState(true);
    const [translateY, setTranslateY] = useState(0); // negative = scrolled up
    const [palette, setPalette] = useState('gold'); // 'gold' | 'teal' | 'paper'
    const palettes = {
        gold: { bg: '#000000', text: '#fde047', accent: '#facc15' },
        teal: { bg: '#061629', text: '#67e8f9', accent: '#22d3ee' },
        paper: { bg: '#111827', text: '#f9fafb', accent: '#e5e7eb' }
    };
    const p = palettes[palette] || palettes.gold;
    const viewportRef = useRef(null);
    const textRef = useRef(null);
    const rafRef = useRef(null);
    const lastTsRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        // reset when text or open state changes
        setTranslateY(0);
        lastTsRef.current = null;
    }, [isOpen, text]);

    useEffect(() => {
        if (!isOpen || !isPlaying) { lastTsRef.current = null; return; }
        const step = (ts) => {
            if (lastTsRef.current == null) lastTsRef.current = ts;
            const dt = (ts - lastTsRef.current) / 1000;
            lastTsRef.current = ts;
            setTranslateY(y => y - dt * speedPxPerSec);
            // stop when text fully off-top
            const vh = viewportRef.current ? viewportRef.current.clientHeight : 600;
            const th = textRef.current ? textRef.current.clientHeight : 0;
            if (th > 0 && translateY < -(th + vh * 0.5)) {
                setIsPlaying(false);
                return;
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            lastTsRef.current = null;
        };
    }, [isOpen, isPlaying, speedPxPerSec, translateY]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.code === 'Space') { e.preventDefault(); setIsPlaying(pl => !pl); }
            else if (e.key === 'Escape') onClose();
            else if (e.key === 'r' || e.key === 'R') setTranslateY(0);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[300] flex flex-col" style={{ backgroundColor: p.bg, color: p.text }}>
            <div className="p-4 flex justify-between items-center gap-3 flex-wrap backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.55)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} aria-label={t('common.close') || 'Close'} className="p-2 rounded-full" style={{ color: p.text }}>
                        <ArrowLeft size={22} />
                    </button>
                    <span className="font-bold text-base">{t('immersive.cinematic_crawl') || 'Cinematic Crawl'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                    <label className="flex items-center gap-2">
                        <span style={{ opacity: 0.7 }}>SPEED</span>
                        <input aria-label="Crawl speed" type="range" min="10" max="140" value={speedPxPerSec} onChange={e => setSpeedPxPerSec(parseInt(e.target.value))} className="w-24 accent-yellow-400" />
                        <span className="font-mono w-14 text-right">{speedPxPerSec}px/s</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <span style={{ opacity: 0.7 }}>PALETTE</span>
                        <select aria-label="Palette" value={palette} onChange={e => setPalette(e.target.value)} className="text-xs rounded px-2 py-1 bg-transparent border" style={{ borderColor: p.text + '55', color: p.text }}>
                            <option value="gold">Golden</option>
                            <option value="teal">Aqua</option>
                            <option value="paper">Paper</option>
                        </select>
                    </label>
                    <button onClick={() => setIsPlaying(pl => !pl)} aria-label={isPlaying ? 'Pause' : 'Play'} className="px-3 py-1 rounded" style={{ background: p.text + '22', color: p.text }}>
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => setTranslateY(0)} aria-label="Restart crawl from top" className="px-3 py-1 rounded text-xs" style={{ background: p.text + '22', color: p.text }}>
                        ↺ Restart
                    </button>
                </div>
            </div>
            <div ref={viewportRef} className="flex-1 relative overflow-hidden" style={{ perspective: '500px', perspectiveOrigin: '50% 100%' }}>
                {/* The scrolling slab */}
                <div
                    ref={textRef}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '100%',
                        padding: '0 10%',
                        fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
                        fontWeight: 700,
                        fontSize: 'clamp(1.4rem, 2.6vw, 2.4rem)',
                        lineHeight: 1.5,
                        textAlign: 'justify',
                        transform: `translateY(${translateY}px) rotateX(22deg)`,
                        transformOrigin: '50% 100%',
                        willChange: 'transform',
                        textShadow: '0 0 12px ' + p.accent + '44'
                    }}
                >
                    {paragraphs.map((para, i) => (
                        <p key={i} style={{ marginBottom: '1.5em' }}>{para}</p>
                    ))}
                </div>
                {/* Fade at top so text gracefully vanishes as it recedes */}
                <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '40%', background: `linear-gradient(to bottom, ${p.bg} 0%, ${p.bg}cc 40%, transparent 100%)` }} />
                {/* subtle vignette */}
                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px rgba(0,0,0,0.6)' }} />
            </div>
            <div className="py-2 text-center text-xs" style={{ color: p.text, opacity: 0.6 }}>
                Space pauses · R restarts · Esc closes
            </div>
        </div>
    );
});

window.AlloModules = window.AlloModules || {};
window.AlloModules.SpeedReaderOverlay = SpeedReaderOverlay;
window.AlloModules.BionicChunkReader = BionicChunkReader;
window.AlloModules.PerspectiveCrawlOverlay = PerspectiveCrawlOverlay;
window.AlloModules.ImmersiveToolbar = ImmersiveToolbar;
window.AlloModules.ImmersiveReaderModule = true;
console.log('[ImmersiveReaderModule] 4 components registered');
