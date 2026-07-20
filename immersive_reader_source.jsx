// immersive_reader_source.jsx — FocusReaderOverlay, ImmersiveToolbar, PerspectiveCrawlOverlay, KaraokeReaderOverlay
// Extracted from AlloFlowANTI.txt for CDN modularization
// NOTE: FocusReaderOverlay unifies the former SpeedReaderOverlay (RSVP, chunkSize=1)
// and BionicChunkReader (chunkSize>=2 with bold-assist) into one overlay with a
// chunkSize slider. The two prior exports are still published as aliases so any
// legacy consumers keep working.

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState; var useEffect = React.useEffect; var useRef = React.useRef;
var useContext = React.useContext; var useMemo = React.useMemo; var useCallback = React.useCallback;

// Defensive translation helper: AlloFlow's t() returns the literal key string
// when no translation exists, so the pervasive `t(key) || fallback` pattern
// can never reach its fallback (a literal key is truthy). safeT detects that
// case and returns the human-readable fallback instead.
const safeT = (t, key, fb) => { const r = t(key); return (r && r !== key) ? r : fb; };

const isInteractiveShortcutTarget = (target) => !!(target && target.closest && target.closest('button, input, select, textarea, a[href], [contenteditable="true"]'));

const useOverlayDialogFocus = (isOpen) => {
    const dialogRef = useRef(null);
    const restoreFocusRef = useRef(null);
    useEffect(() => {
        if (!isOpen) return;
        const dialog = dialogRef.current;
        if (!dialog) return;
        restoreFocusRef.current = document.activeElement;
        const getFocusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        const focusTimer = setTimeout(() => {
            const focusable = getFocusable();
            (focusable[0] || dialog).focus();
        }, 0);
        const containFocus = (e) => {
            if (e.key !== 'Tab') return;
            const focusable = getFocusable();
            if (focusable.length === 0) {
                e.preventDefault();
                dialog.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', containFocus, true);
        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', containFocus, true);
            const previous = restoreFocusRef.current;
            if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
        };
    }, [isOpen]);
    return dialogRef;
};
var _lazyIcon = function(name) { return function(props) { var I = window.AlloIcons && window.AlloIcons[name]; return I ? React.createElement(I, props) : null; }; };
var ArrowLeft = _lazyIcon('ArrowLeft');
var ArrowRight = _lazyIcon('ArrowRight');
var BookOpen = _lazyIcon('BookOpen');
var ChevronLeft = _lazyIcon('ChevronLeft');
var ChevronRight = _lazyIcon('ChevronRight');
var List = _lazyIcon('List');
var Loader2 = _lazyIcon('Loader2');
var Pause = _lazyIcon('Pause');
var Play = _lazyIcon('Play');
var Settings2 = _lazyIcon('Settings2');
var Volume2 = _lazyIcon('Volume2');
var X = _lazyIcon('X');
var Zap = _lazyIcon('Zap');

// ============================================================================
// FocusReaderOverlay — unified RSVP + chunked bionic reader.
// chunkSize === 1 → single-word RSVP with crosshair and focus color.
// chunkSize >= 2 → multi-word chunks with bionic bold-assist on each word.
// Pace is expressed in words-per-minute for intuitiveness; chunk delay is
// derived as (60000 / wpm) * chunkSize so throughput stays constant when the
// user widens the window.
// ============================================================================
const FocusReaderOverlay = React.memo(({ text, onClose, isOpen }) => {
    const { t } = useContext(LanguageContext);
    const dialogRef = useOverlayDialogFocus(isOpen);
    const [words, setWords] = useState([]);
    const [chunkIdx, setChunkIdx] = useState(0);
    const [chunkSize, setChunkSize] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [wpm, setWpm] = useState(300);
    const [theme, setTheme] = useState('warm');
    const [focusColor, setFocusColor] = useState('#dc2626');
    const [punctPauses, setPunctPauses] = useState(true);
    const [countdown, setCountdown] = useState(0); // 0 = inactive; 3/2/1 = showing that number
    const themes = {
        warm: { bg: '#fdfbf7', strong: '#111827', light: '#6b7280', accent: '#4f46e5', panel: 'rgba(255,255,255,0.85)' },
        dark: { bg: '#0f172a', strong: '#f1f5f9', light: '#94a3b8', accent: '#818cf8', panel: 'rgba(15,23,42,0.85)' },
        sepia: { bg: '#f4ecd8', strong: '#3b2a1a', light: '#8b6f4e', accent: '#b45309', panel: 'rgba(244,236,216,0.85)' }
    };
    const c = themes[theme] || themes.warm;
    const colorOptions = [
        { name: 'Red', value: '#dc2626' },
        { name: 'Blue', value: '#2563eb' },
        { name: 'Green', value: '#16a34a' },
        { name: 'Purple', value: '#9333ea' },
        { name: 'Orange', value: '#ea580c' },
        { name: 'Pink', value: '#db2777' },
        { name: 'Teal', value: '#0d9488' },
    ];

    useEffect(() => {
        if (text) {
            const cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            setWords(cleaned.split(' ').filter(w => w.length > 0));
            setChunkIdx(0);
        }
    }, [text]);

    const chunks = useMemo(() => {
        const out = [];
        const size = Math.max(1, chunkSize);
        for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
        return out;
    }, [words, chunkSize]);

    // When chunkSize changes mid-read, remap the current position so the user
    // doesn't lose their place (word index ~= chunkIdx * prevChunkSize).
    const prevChunkSizeRef = useRef(chunkSize);
    useEffect(() => {
        const prev = prevChunkSizeRef.current;
        if (prev !== chunkSize && words.length > 0) {
            const wordCursor = chunkIdx * prev;
            setChunkIdx(Math.min(Math.floor(wordCursor / chunkSize), Math.max(0, Math.ceil(words.length / chunkSize) - 1)));
        }
        prevChunkSizeRef.current = chunkSize;
    }, [chunkSize, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Computes a per-chunk delay. Base = wpm-normalized time for `chunkSize`
    // words. When punctPauses is on, multiply by a factor based on the trailing
    // character of the last word in the chunk — commas get a light pause,
    // sentence-ending punctuation gets a stronger one. Research on RSVP
    // comprehension (Juola, 1991; Benedetto et al., 2015) shows that honoring
    // natural prosody at punctuation substantially helps recall vs. fixed pacing.
    const chunkDelayFor = useCallback((idx) => {
        const base = (60000 / Math.max(50, wpm)) * Math.max(1, chunkSize);
        if (!punctPauses) return Math.max(60, base);
        const chunk = chunks[idx] || [];
        const last = chunk[chunk.length - 1] || '';
        const trailing = last.replace(/["'\u201D\u2019\)\]]*$/, '');
        const tail = trailing.slice(-1);
        let mult = 1;
        if (/[.!?]/.test(tail)) mult = 2.0;
        else if (/[,;:]/.test(tail)) mult = 1.4;
        else if (/[—–]/.test(tail)) mult = 1.3;
        return Math.max(60, base * mult);
    }, [wpm, chunkSize, punctPauses, chunks]);

    // setTimeout-based advance loop. A single setInterval would fire on a fixed
    // cadence and can't do punctuation-aware pacing — we chain setTimeouts so
    // the next delay can depend on the current chunk's trailing punctuation.
    useEffect(() => {
        if (!isPlaying || countdown > 0) return;
        let timeoutId = null;
        const advance = () => {
            setChunkIdx(prev => {
                if (prev >= chunks.length - 1) { setIsPlaying(false); return prev; }
                const next = prev + 1;
                timeoutId = setTimeout(advance, chunkDelayFor(next));
                return next;
            });
        };
        timeoutId = setTimeout(advance, chunkDelayFor(chunkIdx));
        return () => { if (timeoutId) clearTimeout(timeoutId); };
    // chunkIdx intentionally omitted — we read it once at effect start; the
    // functional setState inside advance carries position forward. Re-running
    // this effect on every chunk tick would double-schedule the timer.
    }, [isPlaying, countdown, wpm, chunkSize, punctPauses, chunks, chunkDelayFor]); // eslint-disable-line react-hooks/exhaustive-deps

    // 3-2-1 countdown at the start. Fires when Play is pressed from the first
    // chunk, which is almost always "I just opened this." Skipped on mid-document
    // resumes so the reader isn't forced to wait again after a pause.
    useEffect(() => {
        if (!isPlaying || countdown === 0) return;
        if (countdown === 1) {
            const t2 = setTimeout(() => setCountdown(0), 650);
            return () => clearTimeout(t2);
        }
        const t1 = setTimeout(() => setCountdown(n => n - 1), 650);
        return () => clearTimeout(t1);
    }, [countdown, isPlaying]);

    const handlePlayToggle = useCallback(() => {
        setIsPlaying(p => {
            const next = !p;
            // Only countdown when starting fresh or from the very top — never
            // when pausing, and never mid-document.
            if (next && chunkIdx === 0) setCountdown(3);
            return next;
        });
    }, [chunkIdx]);

    useEffect(() => {
        const handler = (e) => {
            if (!isOpen) return;
            if (e.key !== 'Escape' && isInteractiveShortcutTarget(e.target)) return;
            if (e.code === 'Space') { e.preventDefault(); handlePlayToggle(); }
            else if (e.code === 'ArrowLeft') setChunkIdx(p => Math.max(0, p - 1));
            else if (e.code === 'ArrowRight') setChunkIdx(p => Math.min(chunks.length - 1, p + 1));
            else if (e.key === 'Escape') onClose();
            // +/- tweak WPM in 25-wpm steps (matching the slider step).
            else if (e.key === '+' || e.key === '=') setWpm(w => Math.min(900, w + 25));
            else if (e.key === '-' || e.key === '_') setWpm(w => Math.max(100, w - 25));
            // [ / ] tweak chunk size so fluent readers can widen on the fly.
            else if (e.key === '[') setChunkSize(s => Math.max(1, s - 1));
            else if (e.key === ']') setChunkSize(s => Math.min(6, s + 1));
            // P toggles punctuation pauses.
            else if (e.key === 'p' || e.key === 'P') setPunctPauses(v => !v);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, chunks.length, handlePlayToggle]);

    if (!isOpen) return null;

    const currentChunk = chunks[chunkIdx] || [];
    const progressPct = chunks.length > 0 ? ((chunkIdx + 1) / chunks.length) * 100 : 0;
    const rsvp = chunkSize === 1;
    const rsvpWord = rsvp ? (currentChunk[0] || '') : '';
    const centerIdx = Math.floor(rsvpWord.length / 2);

    const renderBionicWord = (w, i) => {
        const boldLen = Math.max(1, Math.ceil(w.length * 0.4));
        return (
            <span key={i}>
                <span style={{ fontWeight: 900, color: c.strong }}>{w.slice(0, boldLen)}</span>
                <span style={{ fontWeight: 400, color: c.light }}>{w.slice(boldLen)}</span>
                {i < currentChunk.length - 1 ? ' ' : ''}
            </span>
        );
    };

    return (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="focus-reader-dialog-title" tabIndex={-1} className="fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200 motion-reduce:animate-none" style={{ backgroundColor: c.bg }}>
            <div className="p-4 flex justify-between items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={onClose} aria-label={safeT(t, 'common.close', 'Close')} className="p-2 rounded-full hover:bg-black/5" style={{ color: c.strong }}>
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex flex-col">
                        <h2 id="focus-reader-dialog-title" className="font-bold text-base" style={{ color: c.strong }}>{safeT(t, 'immersive.focus_mode', 'Focus Mode')}</h2>
                        <span className="text-xs" style={{ color: c.light }}>
                            {chunkIdx + 1} / {chunks.length} · {rsvp ? 'single-word RSVP' : `${chunkSize}-word chunks · bold-assist`}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-xs font-bold" style={{ color: c.strong }}>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.light }}>WORDS</span>
                        <input aria-label={t('immersive.words_per_chunk_aria') || 'Words per chunk'} type="range" min="1" max="6" value={chunkSize} onChange={e => setChunkSize(parseInt(e.target.value))} className="w-16 accent-indigo-600" />
                        <span className="font-mono w-4 text-end">{chunkSize}</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.light }}>SPEED</span>
                        <input aria-label={safeT(t, 'common.speed', 'Words per minute')} type="range" min="100" max="900" step="25" value={wpm} onChange={e => setWpm(parseInt(e.target.value))} className="w-28 accent-indigo-600" />
                        <span className="font-mono w-16 text-end">{wpm} wpm</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.light }}>THEME</span>
                        <select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value)} className="text-xs rounded px-2 py-1 border" style={{ borderColor: c.light, background: c.bg, color: c.strong }}>
                            <option value="warm">☀ Warm</option>
                            <option value="dark">🌙 Dark</option>
                            <option value="sepia">📜 Sepia</option>
                        </select>
                    </label>
                    <button type="button"
                        onClick={() => setPunctPauses(v => !v)}
                        aria-pressed={punctPauses}
                        title={punctPauses ? 'Punctuation-aware pauses on (P to toggle) — commas slow slightly, sentence ends longer' : 'Punctuation pauses off — constant cadence (P to toggle)'}
                        className="px-3 py-1 rounded-full text-xs transition-all"
                        style={{ background: punctPauses ? c.accent + '22' : 'transparent', border: `1px solid ${c.light}55`, color: c.strong, opacity: punctPauses ? 1 : 0.7 }}
                    >
                        ‥ Pause at punctuation
                    </button>
                    {rsvp && (
                        <div className="flex items-center gap-2">
                            <span style={{ color: c.light }}>FOCUS</span>
                            <div className="flex gap-1">
                                {colorOptions.map(opt => (
                                    <button type="button"
                                        key={opt.value}
                                        onClick={() => setFocusColor(opt.value)}
                                        aria-label={`Focus color ${opt.name}`}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${focusColor === opt.value ? 'scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: opt.value, borderColor: focusColor === opt.value ? c.strong : 'transparent' }}
                                        title={opt.name}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center cursor-pointer select-none px-8 relative" onClick={handlePlayToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePlayToggle(); } }} aria-label={(typeof t === 'function' ? t('immersive.toggle_play_aria') : null) || 'Play or pause reading'}>
                {/* 3-2-1 countdown. Only fires at the very start of a fresh read
                    so mid-document pauses/resumes aren't penalized. */}
                {countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-live="polite" aria-atomic="true">
                        <div
                            key={countdown}
                            className="animate-in fade-in zoom-in duration-300"
                            style={{ fontSize: 'clamp(8rem, 20vw, 16rem)', fontWeight: 900, color: c.accent, textShadow: `0 0 40px ${c.accent}44`, fontFamily: 'Georgia, "Iowan Old Style", serif' }}
                        >
                            {countdown}
                        </div>
                    </div>
                )}
                {rsvp ? (
                    <div className="relative text-7xl md:text-9xl font-mono font-bold tracking-wide" style={{ color: c.strong }}>
                        <div className="flex items-baseline">
                            <span>{rsvpWord.slice(0, centerIdx)}</span>
                            <span style={{ color: focusColor }}>{rsvpWord.charAt(centerIdx)}</span>
                            <span>{rsvpWord.slice(centerIdx + 1)}</span>
                        </div>
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 -z-10 h-full" style={{ backgroundColor: c.light + '33' }}></div>
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 -z-10 w-full" style={{ backgroundColor: c.light + '33' }}></div>
                    </div>
                ) : (
                    <div className="max-w-5xl text-center" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)', lineHeight: 1.15, fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif' }}>
                        {currentChunk.map((w, i) => renderBionicWord(w, i))}
                    </div>
                )}
                <div className="mt-10 text-sm flex items-center gap-2 flex-wrap justify-center max-w-3xl" style={{ color: c.light }}>
                    {isPlaying
                        ? <><Pause size={16} /> {t('immersive.focus_reader_hint_playing') || 'Tap to pause · ← → navigate · +/− speed · [ ] chunk size · P pause-style'}</>
                        : <><Play size={16} /> {t('immersive.focus_reader_hint_paused') || 'Tap or Space to play · ← → navigate · +/− speed · [ ] chunk size · P pause-style · Esc closes'}</>}
                </div>
            </div>
            <div className="h-2 w-full" style={{ background: c.light + '33' }}>
                <div className="h-full transition-all duration-200" style={{ width: `${progressPct}%`, backgroundColor: c.accent }} />
            </div>
        </div>
    );
});

const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader, isChunkReaderActive, onToggleChunkReader, chunkReaderIdx, setChunkReaderIdx, chunkReaderAutoPlay, setChunkReaderAutoPlay, chunkReaderSpeed, setChunkReaderSpeed, totalSentences, interactionMode, setInteractionMode, isBionicReaderActive, onToggleBionicReader, isCrawlReaderActive, onToggleCrawlReader, isKaraokeOverlayActive, onToggleKaraokeOverlay, chunkReaderReadAlong, onToggleChunkReaderReadAlong, chunkReaderMood, setChunkReaderMood, onGeneratePOS, isGeneratingPOS, posReady, onGenerateSyllables, isGeneratingSyllables, syllablesReady, isFocusReaderActive, onToggleFocusReader }) => {
  // Back-compat: if the parent hasn't upgraded to the unified Focus Mode prop
  // yet, synthesize it from the two legacy props (Speed Read and Chunk Stream).
  const focusReaderActive = (typeof isFocusReaderActive === 'boolean')
    ? isFocusReaderActive
    : (!!isSpeedReaderActive || !!isBionicReaderActive);
  const toggleFocusReader = onToggleFocusReader
    || onToggleSpeedReader
    || onToggleBionicReader;
  const { t } = useContext(LanguageContext);
  const toggleSetting = useCallback((key) => setSettings(prev => ({...prev, [key]: !prev[key]})), [setSettings]);
  // POS buttons trigger lazy Gemini tagging the first time any of them is pressed.
  // Subsequent presses (after `posReady` flips true) are a plain toggle. If POS
  // generation is in-flight, we still toggle the setting so the color turns on
  // immediately and starts highlighting the moment tagging finishes — the user
  // doesn't have to click again.
  const handlePosToggle = useCallback((settingKey) => {
    if (!posReady && onGeneratePOS && !isGeneratingPOS) {
      // Fire-and-forget: we don't await because the setting toggle below should
      // flip the color immediately. When the POS data finishes loading, the
      // already-toggled category will light up automatically.
      try { onGeneratePOS(); } catch (err) { console.warn('[Immersive] POS gen failed:', err); }
    }
    toggleSetting(settingKey);
  }, [posReady, onGeneratePOS, isGeneratingPOS, toggleSetting]);
  // Syllable toggle: same lazy-generation pattern as POS, but falls back to the
  // POS generator when a dedicated syllable handler isn't provided — the POS
  // Gemini prompt already adds syllable markers, so one call populates both.
  const handleSyllableToggle = useCallback(() => {
    const gen = onGenerateSyllables || onGeneratePOS;
    const ready = syllablesReady || posReady;
    const busy = isGeneratingSyllables || isGeneratingPOS;
    if (!ready && gen && !busy) {
      try { gen(); } catch (err) { console.warn('[Immersive] Syllable gen failed:', err); }
    }
    toggleSetting('showSyllables');
  }, [onGenerateSyllables, onGeneratePOS, syllablesReady, posReady, isGeneratingSyllables, isGeneratingPOS, toggleSetting]);
  const ToggleButton = React.memo(({ active, onClick, settingKey, title, children, activeColor = "bg-indigo-600 text-white", ...props }) => (
    <button type="button"
      onClick={settingKey ? () => toggleSetting(settingKey) : onClick}
      title={title}
      className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all disabled:opacity-60 disabled:cursor-wait ${
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
              onClick={handleSyllableToggle}
              title={(isGeneratingSyllables || (isGeneratingPOS && !syllablesReady)) ? 'Generating syllable markers…' : t('immersive.toggle_syllables')}
              data-help-key="immersive_syllables"
              disabled={(isGeneratingSyllables || (isGeneratingPOS && !syllablesReady && !posReady)) && !settings.showSyllables}
            >
              {t('immersive.syllables')}{(isGeneratingSyllables || (isGeneratingPOS && !syllablesReady && !posReady)) && settings.showSyllables ? ' …' : ''}
            </ToggleButton>
            <ToggleButton
              active={settings.lineFocus}
              settingKey="lineFocus"
              title={t('immersive.toggle_line_focus')}
              data-help-key="immersive_line_focus"
            >
              {t('immersive.line_focus')}
            </ToggleButton>
            {toggleFocusReader && (
              <ToggleButton
                active={!!focusReaderActive}
                onClick={toggleFocusReader}
                title={safeT(t, 'immersive.focus_mode_title', 'Focus Mode — single-word RSVP or multi-word chunks with bold-assist (drag the WORDS slider once open)')}
                activeColor="bg-sky-500 text-white"
                data-help-key="immersive_focus_mode"
              >
                <Zap size={14} className="me-1 inline"/> {safeT(t, 'immersive.focus_mode', 'Focus Mode')}
              </ToggleButton>
            )}
            <ToggleButton
              active={isChunkReaderActive}
              onClick={onToggleChunkReader}
              title={safeT(t, 'immersive.chunk_read', 'Chunk Read')}
              activeColor="bg-emerald-700 text-white"
              data-help-key="immersive_chunk_reader"
            >
              <List size={14} className="me-1 inline"/> {safeT(t, 'immersive.chunk_read', 'Chunk Read')}
            </ToggleButton>
            {onToggleCrawlReader && (
              <ToggleButton
                active={!!isCrawlReaderActive}
                onClick={onToggleCrawlReader}
                title={safeT(t, 'immersive.cinematic_crawl', 'Cinematic Crawl — receding-perspective scroll')}
                activeColor="bg-amber-500 text-slate-900"
                data-help-key="immersive_perspective_crawl"
              >
                <Zap size={14} className="me-1 inline"/> {safeT(t, 'immersive.cinematic_crawl', 'Crawl')}
              </ToggleButton>
            )}
            {onToggleKaraokeOverlay && (
              <ToggleButton
                active={!!isKaraokeOverlayActive}
                onClick={onToggleKaraokeOverlay}
                title={safeT(t, 'immersive.focus_reader_title', 'Focus Reader — full-screen read-along with sentence-sweep visuals')}
                activeColor="bg-fuchsia-600 text-white"
                data-help-key="immersive_karaoke_overlay"
                aria-pressed={!!isKaraokeOverlayActive}
              >
                <Volume2 size={14} className="me-1 inline"/> {safeT(t, 'immersive.focus_reader', 'Focus Reader')}
              </ToggleButton>
            )}
        </div>
        {setInteractionMode && (
          <>
          <div className="h-4 w-px bg-slate-300 shrink-0"></div>
          <div className="flex items-center gap-1 shrink-0 bg-slate-100 rounded-full p-0.5" role="group" aria-label={safeT(t, 'immersive.tap_mode', 'Tap action')}>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider px-2">{safeT(t, 'immersive.tap_mode', 'Tap')}</span>
            <button type="button"
              onClick={() => setInteractionMode('read')}
              aria-pressed={interactionMode !== 'define' && interactionMode !== 'phonics'}
              title={safeT(t, 'immersive.tap_speak', 'Tap a word to hear it')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode !== 'define' && interactionMode !== 'phonics' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Volume2 size={12}/> {safeT(t, 'immersive.speak', 'Speak')}
            </button>
            <button type="button"
              onClick={() => setInteractionMode('define')}
              aria-pressed={interactionMode === 'define'}
              title={safeT(t, 'immersive.tap_define', 'Tap a word to see its definition and picture')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full transition-colors ${interactionMode === 'define' ? 'bg-yellow-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <BookOpen size={12}/> {safeT(t, 'immersive.define', 'Define')}
            </button>
          </div>
          </>
        )}
        {isChunkReaderActive && (
          <>
          <div className="h-4 w-px bg-slate-300 shrink-0"></div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setChunkReaderIdx(Math.max(0, chunkReaderIdx - 1))} disabled={chunkReaderIdx <= 0} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all" title={safeT(t, 'common.previous', 'Previous') + ' (← / Home)'}><ChevronLeft size={14}/></button>
            <span className="text-xs font-bold text-slate-600 tabular-nums min-w-[3rem] text-center">{chunkReaderIdx + 1} / {totalSentences}</span>
            <button type="button" onClick={() => setChunkReaderIdx(Math.min(totalSentences - 1, chunkReaderIdx + 1))} disabled={chunkReaderIdx >= totalSentences - 1} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all" title={safeT(t, 'common.next', 'Next') + ' (→ / End)'}><ChevronRight size={14}/></button>
            <div className="h-4 w-px bg-slate-200"></div>
            <button type="button" onClick={() => setChunkReaderAutoPlay(!chunkReaderAutoPlay)} className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderAutoPlay ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title={(chunkReaderAutoPlay ? safeT(t, 'common.pause', 'Pause') : safeT(t, 'common.auto_play', 'Auto')) + ' (Space) · Esc exits · Enter skips typewriter reveal'}>
              {chunkReaderAutoPlay ? <Pause size={12} className="inline"/> : <Play size={12} className="inline"/>}
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-600">1s</span>
              <input type="range" min="1000" max="8000" step="500" value={chunkReaderSpeed} onChange={(e) => setChunkReaderSpeed(parseInt(e.target.value))} disabled={!!chunkReaderReadAlong} className={`w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${chunkReaderReadAlong ? 'opacity-30' : ''}`} title={chunkReaderReadAlong ? 'Disabled while Read Along is on — audio length drives the pace' : `${(chunkReaderSpeed/1000).toFixed(1)}s`} aria-label={t('immersive.speed')}/>
              <span className="text-[11px] text-slate-600 tabular-nums">{(chunkReaderSpeed/1000).toFixed(1)}s</span>
            </div>
            {onToggleChunkReaderReadAlong && (
              <>
                <div className="h-4 w-px bg-slate-200"></div>
                <button type="button"
                  onClick={onToggleChunkReaderReadAlong}
                  aria-pressed={!!chunkReaderReadAlong}
                  title={chunkReaderReadAlong ? 'Read-along OFF: return to timer-based advance' : 'Read-along ON: play each sentence with a colored gradient that sweeps across the text in sync with the audio'}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderReadAlong ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  data-help-key="immersive_chunk_read_along"
                >
                  <Volume2 size={12} className="inline"/> {safeT(t, 'immersive.read_along', 'Read Along')}
                </button>
              </>
            )}
            {setChunkReaderMood && (
              <>
                <div className="h-4 w-px bg-slate-200"></div>
                <label className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{safeT(t, 'immersive.chunk_mood_label', 'Mood')}</span>
                  <select
                    aria-label={safeT(t, 'immersive.chunk_mood', 'Chunk Read animation mood')}
                    value={chunkReaderMood || 'highlight'}
                    onChange={e => setChunkReaderMood(e.target.value)}
                    title={t('immersive.chunk_mood_tooltip') || 'Animation mood for active chunk · Enter skips typewriter reveal'}
                    className="text-[11px] font-bold rounded-full px-2 py-1 border border-slate-300 bg-slate-100 text-slate-700 cursor-pointer hover:bg-slate-200"
                    data-help-key="immersive_chunk_mood"
                  >
                    <option value="highlight">✨ Sweep</option>
                    <option value="typewriter">⌨️ Typewriter</option>
                    <option value="popin">🎈 Pop-In</option>
                    <option value="pulse">💗 Pulse</option>
                  </select>
                </label>
              </>
            )}
          </div>
          </>
        )}
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600">{t('immersive.grammar_label')}</span>
            {/* POS toggle buttons — on first press, kick off lazy Gemini tagging.
                When tagging is in-flight we show a subtle spinner suffix so the
                user knows why highlights haven't appeared yet. The toggled-on
                color flips immediately so the button state doesn't appear stuck. */}
            <ToggleButton
              active={settings.showNouns}
              onClick={() => handlePosToggle('showNouns')}
              title={isGeneratingPOS ? 'Classifying parts of speech…' : t('immersive.highlight_nouns')}
              activeColor="bg-blue-700 text-white"
              disabled={isGeneratingPOS && !posReady && !settings.showNouns}
            >
              {t('immersive.nouns')}{isGeneratingPOS && settings.showNouns ? ' …' : ''}
            </ToggleButton>
            <ToggleButton
              active={settings.showVerbs}
              onClick={() => handlePosToggle('showVerbs')}
              title={isGeneratingPOS ? 'Classifying parts of speech…' : t('immersive.highlight_verbs')}
              activeColor="bg-red-500 text-white"
              disabled={isGeneratingPOS && !posReady && !settings.showVerbs}
            >
              {t('immersive.verbs')}{isGeneratingPOS && settings.showVerbs ? ' …' : ''}
            </ToggleButton>
            <ToggleButton
              active={settings.showAdjectives}
              onClick={() => handlePosToggle('showAdjectives')}
              title={isGeneratingPOS ? 'Classifying parts of speech…' : t('immersive.highlight_adjectives')}
              activeColor="bg-green-700 text-white"
              disabled={isGeneratingPOS && !posReady && !settings.showAdjectives}
            >
              {t('immersive.adjectives')}{isGeneratingPOS && settings.showAdjectives ? ' …' : ''}
            </ToggleButton>
            <ToggleButton
              active={settings.showAdverbs}
              onClick={() => handlePosToggle('showAdverbs')}
              title={isGeneratingPOS ? 'Classifying parts of speech…' : t('immersive.highlight_adverbs')}
              activeColor="bg-purple-500 text-white"
              disabled={isGeneratingPOS && !posReady && !settings.showAdverbs}
            >
              {t('immersive.adverbs')}{isGeneratingPOS && settings.showAdverbs ? ' …' : ''}
            </ToggleButton>
        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        {/* Font picker — Lexend and OpenDyslexic are the dyslexia-friendly options
            that Aaron specifically flagged as important. The empty value means
            "inherit from the surrounding theme" so we don't force a font on
            readers who are happy with the default. */}
        <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600">{safeT(t, 'immersive.font', 'Font')}</span>
            <select
              aria-label={safeT(t, 'immersive.font_family', 'Font family')}
              value={settings.fontFamily || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
              className="text-xs bg-slate-100 border border-slate-400 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-700"
              data-help-key="immersive_font_family"
            >
                <option value="">Default</option>
                <option value="'Lexend', system-ui, sans-serif">{t('immersive.font_lexend') || 'Lexend (readable)'}</option>
                <option value="'OpenDyslexic', 'Atkinson Hyperlegible', sans-serif">OpenDyslexic</option>
                <option value="'Atkinson Hyperlegible', system-ui, sans-serif">{t('immersive.font_atkinson') || 'Atkinson Hyperlegible'}</option>
                <option value="Georgia, 'Iowan Old Style', serif">{t('immersive.font_serif_georgia') || 'Serif (Georgia)'}</option>
                <option value="'Inter', system-ui, sans-serif">{t('immersive.font_sans_inter') || 'Sans (Inter)'}</option>
                <option value="'Comic Sans MS', 'Comic Neue', cursive">{t('immersive.font_comic_sans') || 'Comic Sans'}</option>
                <option value="ui-monospace, 'SF Mono', Consolas, monospace">Monospace</option>
            </select>
        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0 relative">
            <span className="text-xs font-bold text-slate-600">{safeT(t, 'immersive.colors', 'Colors')}</span>
            <select
              aria-label={safeT(t, 'immersive.color_preset', 'Color preset')}
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
              className="text-xs bg-slate-100 border border-slate-400 rounded-full px-2 py-1 cursor-pointer hover:bg-slate-200 transition-all font-medium text-slate-600"
            >
              <option value="" disabled>{safeT(t, 'immersive.presets', 'Presets')}</option>
              <option value="warm">☀️ Warm</option>
              <option value="dark">🌙 Dark</option>
              <option value="high-contrast">◼️ High Contrast</option>
              <option value="sepia">📜 Sepia</option>
              <option value="blue-wash">💧 Blue Wash</option>
              <option value="green-tint">🌿 Green Tint</option>
              <option value="rose">🌸 Rose</option>
            </select>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-600">{safeT(t, 'immersive.bg', 'Bg')}</label>
              <input type="color" value={settings.bgColor || '#fdfbf7'} onChange={(e) => setSettings(prev => ({...prev, bgColor: e.target.value}))} className="w-6 h-6 rounded-full border border-slate-400 cursor-pointer p-0 appearance-none" style={{backgroundColor: settings.bgColor}} aria-label={safeT(t, 'immersive.bg_color', 'Background color')}/>
              <label className="text-[11px] text-slate-600">{safeT(t, 'immersive.text', 'Text')}</label>
              <input type="color" value={settings.fontColor || '#1e293b'} onChange={(e) => setSettings(prev => ({...prev, fontColor: e.target.value}))} className="w-6 h-6 rounded-full border border-slate-400 cursor-pointer p-0 appearance-none" style={{backgroundColor: settings.fontColor}} aria-label={safeT(t, 'immersive.text_color', 'Text color')}/>
            </div>
        </div>
      </div>
      <button type="button" aria-label={t('common.close_word_wall')}
        onClick={onClose}
        title={t('immersive.close')}
        className="ms-4 shrink-0 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
});

// Back-compat aliases for FocusReaderOverlay are published at the bottom of
// this module under the old window.AlloModules names (SpeedReaderOverlay,
// BionicChunkReader). No local aliases are needed because nothing inside this
// file references the old names directly.

// ============================================================================
// PerspectiveCrawlOverlay — cinematic upward-receding scroll (the "crawl")
// Text starts at the bottom, scrolls up, tilts away from the reader as it
// travels into the distance. Dramatic long-form reading mode.
// ============================================================================
const PerspectiveCrawlOverlay = React.memo(({ text, onClose, isOpen }) => {
    const { t } = useContext(LanguageContext);
    const dialogRef = useOverlayDialogFocus(isOpen);
    // Persist user's preferred speed / palette / ambient across sessions so each
    // open doesn't reset to defaults. Direct localStorage with try/catch — same
    // lightweight pattern used elsewhere (no safeGetItem dep needed).
    const [speedPxPerSec, setSpeedPxPerSec] = useState(() => {
        try { const v = parseInt(localStorage.getItem('allo_crawl_speed'), 10); return (v >= 10 && v <= 140) ? v : 70; } catch { return 70; }
    });
    useEffect(() => { try { localStorage.setItem('allo_crawl_speed', String(speedPxPerSec)); } catch {} }, [speedPxPerSec]);
    const [isPlaying, setIsPlaying] = useState(true);
    const [translateY, setTranslateY] = useState(0); // negative = scrolled up — used for render only
    const [palette, setPalette] = useState(() => {
        try { const v = localStorage.getItem('allo_crawl_palette'); return ['gold', 'teal', 'paper'].includes(v) ? v : 'gold'; } catch { return 'gold'; }
    }); // 'gold' | 'teal' | 'paper'
    useEffect(() => { try { localStorage.setItem('allo_crawl_palette', palette); } catch {} }, [palette]);
    const [finished, setFinished] = useState(false);
    // Ambient pad defaults OFF — clicking "Cinematic Crawl" counts as a user
    // gesture, so the AudioContext would otherwise start playing immediately and
    // surprise users who didn't expect audio. Users who want it can press M or
    // click ♪; their preference persists across sessions.
    const [ambientOn, setAmbientOn] = useState(() => {
        try { return localStorage.getItem('allo_crawl_ambient') === '1'; } catch { return false; }
    });
    useEffect(() => { try { localStorage.setItem('allo_crawl_ambient', ambientOn ? '1' : '0'); } catch {} }, [ambientOn]);
    const [progressPct, setProgressPct] = useState(0);
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
    // Mirror translateY in a ref so the RAF loop can read/write it without
    // re-triggering the effect every frame (the previous implementation listed
    // translateY in the effect deps, which tore down and re-scheduled RAF on
    // every tick — visible perf cost on long documents).
    const translateYRef = useRef(0);
    // Web Audio nodes for the ambient pad (detuned sines + low-pass). Built
    // lazily on first open so construction doesn't run for users who never
    // launch the Crawl.
    const audioCtxRef = useRef(null);
    const audioNodesRef = useRef(null);
    const resetCrawl = useCallback(() => {
        translateYRef.current = 0;
        setTranslateY(0);
        setFinished(false);
        setProgressPct(0);
        lastTsRef.current = null;
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        resetCrawl();
    }, [isOpen, text, resetCrawl]);

    useEffect(() => {
        if (!isOpen || !isPlaying) { lastTsRef.current = null; return; }
        const step = (ts) => {
            if (lastTsRef.current == null) lastTsRef.current = ts;
            const dt = (ts - lastTsRef.current) / 1000;
            lastTsRef.current = ts;
            const nextY = translateYRef.current - dt * speedPxPerSec;
            translateYRef.current = nextY;
            setTranslateY(nextY);
            const vh = viewportRef.current ? viewportRef.current.clientHeight : 600;
            const th = textRef.current ? textRef.current.clientHeight : 0;
            if (th > 0) {
                const total = th + vh * 0.5;
                setProgressPct(Math.min(100, (-nextY / total) * 100));
                if (nextY < -total) {
                    setIsPlaying(false);
                    setFinished(true);
                    setProgressPct(100);
                    return;
                }
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            lastTsRef.current = null;
        };
    }, [isOpen, isPlaying, speedPxPerSec]);

    // Ambient pad — 3 detuned sines through a low-pass filter, routed to a
    // gain node we can ramp to zero on pause / close for a smooth fade.
    // Built lazily on first "play while isOpen" so we don't synthesize audio
    // nodes for users who never open the Crawl.
    useEffect(() => {
        if (!isOpen || !ambientOn || !isPlaying) {
            // fade out
            if (audioNodesRef.current) {
                try {
                    const { gain, ctx } = audioNodesRef.current;
                    gain.gain.cancelScheduledValues(ctx.currentTime);
                    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
                } catch (e) {}
            }
            return;
        }
        try {
            if (!audioCtxRef.current) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                audioCtxRef.current = new Ctx();
            }
            const ctx = audioCtxRef.current;
            if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
            if (!audioNodesRef.current) {
                const gain = ctx.createGain();
                gain.gain.value = 0;
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 600;
                lp.Q.value = 0.5;
                // Three quiet sines at fifths — harmonically consonant, not melodic.
                const freqs = [110, 164.81, 220]; // A2, E3, A3
                const oscs = freqs.map((f, i) => {
                    const o = ctx.createOscillator();
                    o.type = i === 1 ? 'triangle' : 'sine';
                    o.frequency.value = f;
                    // Subtle detune gives it a breathing pad quality.
                    o.detune.value = (i - 1) * 6;
                    o.connect(gain);
                    o.start();
                    return o;
                });
                gain.connect(lp);
                lp.connect(ctx.destination);
                audioNodesRef.current = { ctx, gain, lp, oscs };
            }
            const { gain, ctx: c2 } = audioNodesRef.current;
            gain.gain.cancelScheduledValues(c2.currentTime);
            gain.gain.setTargetAtTime(0.06, c2.currentTime, 0.8);
        } catch (e) {
            // Audio blocked (no gesture yet, or autoplay restriction). Non-fatal.
        }
    }, [isOpen, isPlaying, ambientOn]);

    // Tear audio all the way down when the overlay closes, so no nodes linger.
    useEffect(() => {
        return () => {
            try {
                if (audioNodesRef.current) {
                    const { oscs } = audioNodesRef.current;
                    oscs.forEach(o => { try { o.stop(); } catch (e) {} });
                    audioNodesRef.current = null;
                }
                if (audioCtxRef.current) {
                    try { audioCtxRef.current.close(); } catch (e) {}
                    audioCtxRef.current = null;
                }
            } catch (e) {}
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key !== 'Escape' && isInteractiveShortcutTarget(e.target)) return;
            if (e.code === 'Space') { e.preventDefault(); setIsPlaying(pl => !pl); }
            else if (e.key === 'Escape') onClose();
            else if (e.key === 'r' || e.key === 'R') { resetCrawl(); setIsPlaying(true); }
            else if (e.key === 'm' || e.key === 'M') setAmbientOn(a => !a);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, resetCrawl]);

    if (!isOpen) return null;

    const cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = cleaned.split(/\n{2,}/).filter(Boolean);
    const togglePlay = () => {
        if (finished) { resetCrawl(); setIsPlaying(true); }
        else setIsPlaying(pl => !pl);
    };

    return (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="perspective-crawl-dialog-title" tabIndex={-1} data-help-key="perspective_crawl_overlay_panel" className="fixed inset-0 z-[300] flex flex-col" style={{ backgroundColor: p.bg, color: p.text }}>
            <div className="p-4 flex justify-between items-center gap-3 flex-wrap backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.55)' }}>
                <div className="flex items-center gap-3">
                    <button type="button" data-help-key="perspective_crawl_exit_btn" onClick={onClose} aria-label={safeT(t, 'common.close', 'Close')} className="p-2 rounded-full" style={{ color: p.text }}>
                        <ArrowLeft size={22} />
                    </button>
                    <h2 id="perspective-crawl-dialog-title" className="font-bold text-base">{safeT(t, 'immersive.cinematic_crawl', 'Cinematic Crawl')}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                    <label className="flex items-center gap-2">
                        <span style={{ opacity: 0.7 }}>SPEED</span>
                        <input data-help-key="perspective_crawl_speed_control" aria-label={t('immersive.crawl_speed_aria') || 'Crawl speed'} type="range" min="10" max="140" value={speedPxPerSec} onChange={e => setSpeedPxPerSec(parseInt(e.target.value))} className="w-24 accent-yellow-400" />
                        <span className="font-mono w-14 text-end">{speedPxPerSec}px/s</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <span style={{ opacity: 0.7 }}>PALETTE</span>
                        <select data-help-key="perspective_crawl_palette_select" aria-label={t("a11y.fab_open_palette")} value={palette} onChange={e => setPalette(e.target.value)} className="text-xs rounded px-2 py-1 border" style={{ borderColor: p.text, background: p.bg, color: p.text }}>
                            <option value="gold">Golden</option>
                            <option value="teal">Aqua</option>
                            <option value="paper">Paper</option>
                        </select>
                    </label>
                    <button type="button"
                        data-help-key="perspective_crawl_ambient_toggle"
                        onClick={() => setAmbientOn(a => !a)}
                        aria-pressed={ambientOn}
                        aria-label={ambientOn ? (t('a11y.mute_ambient_pad') || 'Mute ambient pad') : (t('a11y.unmute_ambient_pad') || 'Unmute ambient pad')}
                        title={ambientOn ? 'Ambient pad on (M to toggle)' : 'Ambient pad muted (M to toggle)'}
                        className="px-3 py-1 rounded text-xs"
                        style={{ background: p.text + '22', color: p.text, opacity: ambientOn ? 1 : 0.55 }}
                    >
                        {ambientOn ? '♪' : '♪̸'}
                    </button>
                    <button type="button" data-help-key="perspective_crawl_play_pause_btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="px-3 py-1 rounded" style={{ background: p.text + '22', color: p.text }}>
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button type="button" data-help-key="perspective_crawl_restart_btn" onClick={() => { resetCrawl(); setIsPlaying(true); }} aria-label={t("a11y.restart_crawl")} className="px-3 py-1 rounded text-xs" style={{ background: p.text + '22', color: p.text }}>
                        ↺ Restart
                    </button>
                </div>
            </div>
            <div
                ref={viewportRef}
                onClick={togglePlay}
                className="flex-1 relative overflow-hidden cursor-pointer select-none"
                style={{ perspective: '900px', perspectiveOrigin: '50% 100%' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlay(); } }}
                aria-label={isPlaying ? 'Pause crawl' : 'Play crawl'}
            >
                {/* Starfield backdrop — three layered box-shadow dot fields drifting at
                    different rates for parallax. Rendered behind the text so we get a
                    sense of travelling through space without needing any image assets. */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: `radial-gradient(circle at 20% 30%, ${p.accent}22 0 1px, transparent 2px), radial-gradient(circle at 70% 20%, ${p.accent}1a 0 1px, transparent 2px), radial-gradient(circle at 85% 80%, ${p.accent}33 0 1px, transparent 2.5px), radial-gradient(circle at 15% 75%, ${p.accent}22 0 1px, transparent 2px), radial-gradient(circle at 40% 60%, ${p.accent}1a 0 1px, transparent 2px)`,
                    backgroundSize: '3px 3px, 5px 5px, 7px 7px, 4px 4px, 6px 6px',
                    backgroundPosition: `0 ${translateY * 0.08}px, 0 ${translateY * 0.12}px, 0 ${translateY * 0.18}px, 0 ${translateY * 0.05}px, 0 ${translateY * 0.1}px`,
                    opacity: 0.6,
                    willChange: 'background-position'
                }} />
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: `radial-gradient(ellipse at 50% 100%, ${p.accent}14 0%, transparent 60%)`
                }} />
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
                        fontSize: 'clamp(2rem, 3.6vw, 3.4rem)',
                        lineHeight: 1.5,
                        textAlign: 'justify',
                        transform: `translateY(${translateY}px) rotateX(15deg)`,
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
                {/* Matching fade-in at bottom so paragraphs ease into view as they enter */}
                <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '8%', background: `linear-gradient(to top, ${p.bg} 0%, transparent 100%)` }} />
                {/* subtle vignette */}
                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 180px rgba(0,0,0,0.6)' }} />
                {/* Outro card when the crawl completes */}
                {finished && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className="text-center px-10 py-6 rounded-lg backdrop-blur-sm"
                            style={{ background: `${p.bg}cc`, border: `1px solid ${p.accent}55`, color: p.text, boxShadow: `0 0 40px ${p.accent}33` }}
                        >
                            <div style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '0.15em' }}>
                                THE END
                            </div>
                            <div className="text-xs mt-2" style={{ opacity: 0.7 }}>
                                Click anywhere · press R to replay · Esc closes
                            </div>
                        </div>
                    </div>
                )}
                {/* Pause indicator — only visible when paused mid-scroll */}
                {!isPlaying && !finished && translateYRef.current < -4 && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs pointer-events-none" style={{ background: `${p.bg}99`, border: `1px solid ${p.accent}33`, color: p.text }}>
                        ⏸ Paused — click to resume
                    </div>
                )}
            </div>
            <div className="h-1 w-full" style={{ background: p.text + '22' }}>
                <div className="h-full transition-all duration-200 ease-linear" style={{ width: `${progressPct}%`, backgroundColor: p.accent }} />
            </div>
            <div className="py-2 text-center text-xs" style={{ color: p.text, opacity: 0.6 }}>
                Click or Space pauses · R restarts · M mutes pad · Esc closes
            </div>
        </div>
    );
});

// ============================================================================
// KaraokeReaderOverlay — sentence-sweep "Focus Reader"
// Full-screen immersive view. Plays each sentence via Gemini TTS (when the
// parent passes `getAudioUrl`) or browser speechSynthesis fallback. As audio
// plays, a colored gradient "wipes" across the active sentence's text —
// proportional to audio.currentTime/audio.duration — so visual progress
// stays synced with audio without needing per-word boundary events.
// (Compatible with Gemini TTS, which returns audio-only with no timepoint
// metadata. See plan.md for rationale.)
// ============================================================================
// Karaoke playback events land in the SAME window.__alloTtsTrace ring buffer
// the TTS module writes, so one "Copy diagnostics" snapshot shows the whole
// chain: overlay intent → bridge resolution → provider routing → outcome.
const KARAOKE_TRACE_MAX = 150;
const karaokeTrace = (event, detail) => {
    try {
        const buffer = window.__alloTtsTrace || (window.__alloTtsTrace = []);
        buffer.push({ at: Date.now(), event: event, detail: detail || null });
        while (buffer.length > KARAOKE_TRACE_MAX) buffer.shift();
    } catch (e) {}
};
// A resolution that never settles (hung queue, stalled plugin load, dead
// provider) must not spin the overlay forever OR poison the warm cache so
// every later Play re-joins the same hang. After this window the player
// falls back to the device voice and the next Play starts FRESH. 20s: real
// generation lands in 2–8s; nobody in a classroom waits 45.
const KARAOKE_RESOLVE_WATCHDOG_MS = 20000;
const KaraokeReaderOverlay = React.memo(({ text, sentenceList, onClose, isOpen, getAudioUrl, isTeacher, captureOn: captureOnProp, onCaptureChange }) => {
    const { t } = useContext(LanguageContext);
    const dialogRef = useOverlayDialogFocus(isOpen);
    const [sentences, setSentences] = useState([]);
    const [sentenceIdx, setSentenceIdx] = useState(0);
    // Teacher read-aloud vetting: regenerate the current sentence, or prepare
    // the whole set for students. Both persist into the resource via the ANTI
    // globals; the player picks up the new audio through the shared store.
    const [regenBusy, setRegenBusy] = useState(false);
    const [prepState, setPrepState] = useState(null); // { busy, done, total, bytes } | null
    const [localCaptureOn, setLocalCaptureOn] = useState(() => { try { return localStorage.getItem('allo_save_karaoke_audio') !== '0'; } catch (_) { return true; } });
    const captureOn = typeof captureOnProp === 'boolean' ? captureOnProp : localCaptureOn;
    const setCaptureOn = useCallback((value) => {
        const next = !!value;
        setLocalCaptureOn(next);
        try { localStorage.setItem('allo_save_karaoke_audio', next ? '1' : '0'); } catch (_) {}
        try { if (typeof onCaptureChange === 'function') onCaptureChange(next); } catch (_) {}
    }, [onCaptureChange]);
    const [recording, setRecording] = useState(false);
    const [studentTakeTick, setStudentTakeTick] = useState(0);
    const _recRef = useRef(null);
    const [sweepPct, setSweepPct] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLoadPhase, setAudioLoadPhase] = useState(null);
    const audioLoadOwnerRef = useRef(0);
    const beginAudioLoad = useCallback((phase) => {
        const owner = audioLoadOwnerRef.current + 1;
        audioLoadOwnerRef.current = owner;
        setAudioLoadPhase(phase);
        return owner;
    }, []);
    const transitionAudioLoad = useCallback((owner, phase) => {
        if (owner != null && audioLoadOwnerRef.current === owner) setAudioLoadPhase(phase);
    }, []);
    const finishAudioLoad = useCallback((owner) => {
        if (owner != null && audioLoadOwnerRef.current === owner) setAudioLoadPhase(null);
    }, []);
    const clearAudioLoad = useCallback(() => {
        audioLoadOwnerRef.current += 1;
        setAudioLoadPhase(null);
    }, []);
    const [playbackFallbackNotice, setPlaybackFallbackNotice] = useState('');
    const isGeneratingAudio = audioLoadPhase === 'generating';
    const isAudioLoading = audioLoadPhase != null;
    const audioLoadingText = audioLoadPhase === 'preparing'
        ? 'Preparing first sentence...'
        : audioLoadPhase === 'starting'
            ? 'Starting audio...'
            : audioLoadPhase === 'starting-device'
                ? 'Starting this device voice...'
                : 'Generating audio...';
    const [currentAudioReadyIdx, setCurrentAudioReadyIdx] = useState(-1);
    const [autoAdvance, setAutoAdvance] = useState(true);
    const [theme, setTheme] = useState('warm');
    // Playback speed multiplier applied to both Gemini audio (audio.playbackRate)
    // and the browser-speechSynthesis fallback (utterance.rate). 1.0 is the
    // default natural pace; 0.75 is helpful for ELL and early readers, 1.5 for
    // fluent readers skimming review material. The ref lets playSentence read
    // the current speed without being re-memoized on every change.
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const playbackSpeedRef = useRef(1);
    useEffect(() => {
        playbackSpeedRef.current = playbackSpeed;
        // Apply to the currently-playing Gemini audio so the user gets immediate
        // feedback when they tap a speed button mid-sentence. speechSynthesis
        // utterances can't change rate after speak() — those will pick up the
        // new rate on the next sentence.
        try { if (audioRef.current) audioRef.current.playbackRate = playbackSpeed; } catch (e) {}
    }, [playbackSpeed]);
    const themes = {
        warm: { bg: '#fdfbf7', ink: '#111827', dim: '#9ca3af', sweep: '#b45309', accent: '#fde68a' },
        dark: { bg: '#0f172a', ink: '#f1f5f9', dim: '#64748b', sweep: '#a5b4fc', accent: '#a855f7' },
        sepia: { bg: '#f4ecd8', ink: '#3b2a1a', dim: '#a08968', sweep: '#c2410c', accent: '#f97316' }
    };
    const c = themes[theme] || themes.warm;
    const audioRef = useRef(null);
    const rafRef = useRef(null);
    const activeSentenceRef = useRef(null);
    // Monotonic token used to ignore stale getAudioUrl resolutions — if the
    // user advances, closes the overlay, or reopens between the async fetch
    // starting and resolving, the token increments and the stale promise bails
    // instead of playing phantom audio over the current sentence.
    const playTokenRef = useRef(0);
    // Parent capture/status renders may replace the callback. Keep playback
    // keyed to sentence/state changes, while always calling the latest resolver.
    const getAudioUrlRef = useRef(getAudioUrl);
    getAudioUrlRef.current = getAudioUrl;
    const audioRequestAbortRef = useRef(null);
    // Sentences whose audio has already been pre-warmed this session (indices).
    // callTTS caches on the shared urlCache, so a warmed sentence is an instant
    // cache hit when the player later requests it — zero perceived latency.
    const warmedRef = useRef(new Set());
    // A play request joins an in-progress warm instead of issuing a duplicate
    // request (important because cancellable requests intentionally do not share
    // callTTS's global in-flight entry).
    const warmPromisesRef = useRef(new Map());
    // Per-sentence audio-derived word timings (WordTiming module): sentence
    // idx → mapping. When present, the sweep clock follows REAL word
    // boundaries from the clip's energy envelope instead of a linear
    // time→weight estimate. Cleared whenever the resolver identity or the
    // sentence list changes (a new voice means new clips).
    const wordTimingsRef = useRef(new Map());
    const captureRetryRef = useRef(new Map());
    const capturePendingRef = useRef(new Set());
    const captureIssueRef = useRef({ limit: false, message: '' });
    const [captureSaveState, setCaptureSaveState] = useState({ pending: 0, failed: 0, limit: false, message: '' });
    const [captureRetrying, setCaptureRetrying] = useState(false);
    const refreshCaptureSaveState = useCallback(() => {
        setCaptureSaveState({
            pending: capturePendingRef.current.size,
            failed: captureRetryRef.current.size,
            limit: !!captureIssueRef.current.limit,
            message: captureIssueRef.current.message || ''
        });
    }, []);
    const captureKeyFor = useCallback((sentenceText) => {
        try {
            const KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
            if (KS && typeof KS.keyFor === 'function') return KS.keyFor(sentenceText);
        } catch (e) {}
        return String(sentenceText || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }, []);
    // Nth-occurrence disambiguation for duplicated sentences (2026-07-19): the
    // shared resolver maps text → canonical segment, so two identical sentences
    // must carry their occurrence index to resolve/capture as DISTINCT
    // segments — otherwise the first twin absorbs both and the saved counter
    // stays permanently short.
    const occurrenceForIndex = useCallback((idx) => {
        let occurrence = 0;
        const target = sentences[idx];
        for (let i = 0; i < idx; i++) { if (sentences[i] === target) occurrence += 1; }
        return occurrence;
    }, [sentences]);
    // "Copy diagnostics": snapshot the shared TTS trace + overlay state as
    // JSON on the clipboard, so a stuck/silent read-aloud can be reported
    // (and diagnosed) without opening DevTools. Declared AFTER every state it
    // lists as a dep — a deps array reads its values at render time, so a
    // later-declared useState would be a TDZ render crash.
    const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
    const copyDiagnostics = useCallback(async () => {
        let payload;
        try {
            payload = JSON.stringify({
                at: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').substring(0, 120) : '',
                overlay: {
                    sentenceIdx,
                    sentenceCount: sentences.length,
                    isPlaying,
                    audioLoadPhase,
                    fallbackNotice: playbackFallbackNotice || null,
                    captureOn,
                    captureState: captureSaveState,
                    currentAudioReadyIdx,
                },
                flags: {
                    geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
                    geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
                    sharedResolver: typeof window.__alloResolveReadAloudAudio === 'function',
                    serviceModule: !!(window.AlloModules && window.AlloModules.ReadAloudAudioServiceModule),
                },
                lastRoute: window.__ttsLastRoute || null,
                trace: (window.__alloTtsTrace || []).slice(-120),
            }, null, 2);
        } catch (e) {
            payload = 'diagnostics-serialize-failed: ' + String(e && e.message || e);
        }
        let copied = false;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(payload);
                copied = true;
            }
        } catch (e) {}
        if (!copied) {
            try {
                const scratch = document.createElement('textarea');
                scratch.value = payload;
                scratch.setAttribute('readonly', '');
                scratch.style.position = 'fixed';
                scratch.style.opacity = '0';
                document.body.appendChild(scratch);
                scratch.select();
                copied = document.execCommand('copy');
                scratch.remove();
            } catch (e) {}
        }
        if (copied) {
            setDiagnosticsCopied(true);
            setTimeout(() => setDiagnosticsCopied(false), 2000);
        }
    }, [sentenceIdx, sentences, isPlaying, audioLoadPhase, playbackFallbackNotice, captureOn, captureSaveState, currentAudioReadyIdx]);
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    const hardStop = useCallback(() => {
        playTokenRef.current++;
        try { if (audioRequestAbortRef.current) audioRequestAbortRef.current.abort(); } catch (e) {}
        audioRequestAbortRef.current = null;
        clearAudioLoad();
        setCurrentAudioReadyIdx(-1);
        try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch (e) {}
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    }, [clearAudioLoad]);


    // Capture is not teacher-gated: a student's played clips persist only into
    // the student's OWN copy of the resource (sharing is teacher→student, never
    // student→student), so capturing simply makes their replays instant. Human
    // recordings are a separate explicit flow and are unaffected.
    const scheduleCaptureForStorage = useCallback((sentenceText, url, occurrence) => {
        if (!captureOn || !sentenceText || !url) return Promise.resolve(false);
        if (typeof window === 'undefined' || typeof window.__alloCaptureKaraokeAudio !== 'function') return Promise.resolve(false);
        // Duplicated sentences are distinct segments: key pending/retry state
        // per occurrence so twin captures never collapse into one entry.
        const occ = Number.isInteger(occurrence) && occurrence >= 0 ? occurrence : 0;
        const key = captureKeyFor(sentenceText) + '::occ' + occ;
        capturePendingRef.current.add(key);
        refreshCaptureSaveState();
        // Invoke immediately so the persistence helper can snapshot the blob URL
        // before playback cleanup. It defers only the heavy MP3 encode after it
        // owns the bytes.
        let request;
        try {
            request = Promise.resolve(window.__alloCaptureKaraokeAudio(sentenceText, url, { occurrence: occ }));
        } catch (e) {
            request = Promise.resolve(false);
        }
        return request.then((saved) => {
            let stored = false;
            try {
                const st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
                stored = !!(st && st.has(sentenceText));
            } catch (e) {}
            capturePendingRef.current.delete(key);
            if (saved || stored) {
                captureRetryRef.current.delete(key);
                if (captureRetryRef.current.size === 0) captureIssueRef.current = { limit: false, message: '' };
            } else {
                captureRetryRef.current.set(key, { sentence: sentenceText, url, occurrence: occ });
                if (!captureIssueRef.current.message) captureIssueRef.current = { limit: false, message: 'Some played audio could not be saved.' };
            }
            karaokeTrace('karaoke:capture-result', { key, saved: !!(saved || stored) });
            refreshCaptureSaveState();
            return !!(saved || stored);
        }).catch(() => {
            capturePendingRef.current.delete(key);
            captureRetryRef.current.set(key, { sentence: sentenceText, url, occurrence: occ });
            captureIssueRef.current = { limit: false, message: 'Some played audio could not be saved.' };
            karaokeTrace('karaoke:capture-error', { key });
            refreshCaptureSaveState();
            return false;
        });
    }, [captureOn, captureKeyFor, refreshCaptureSaveState]);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return;
        const onCaptureStatus = (event) => {
            const detail = event && event.detail ? event.detail : {};
            if (detail.status !== 'error' && detail.status !== 'limit') return;
            const key = captureKeyFor(detail.sentence);
            if (!key || !sentences.some(sentence => captureKeyFor(sentence) === key)) return;
            captureIssueRef.current = {
                limit: detail.status === 'limit',
                message: detail.reason || (detail.status === 'limit' ? 'Saved read-aloud storage is full.' : 'Some played audio could not be saved.')
            };
            refreshCaptureSaveState();
        };
        window.addEventListener('alloflow:karaoke-audio-capture', onCaptureStatus);
        return () => window.removeEventListener('alloflow:karaoke-audio-capture', onCaptureStatus);
    }, [isOpen, sentences, captureKeyFor, refreshCaptureSaveState]);

    const retryFailedCaptures = useCallback(async () => {
        if (captureRetrying || captureRetryRef.current.size === 0 || captureIssueRef.current.limit) return;
        setCaptureRetrying(true);
        const failed = Array.from(captureRetryRef.current.values());
        const resolver = getAudioUrlRef.current;
        for (let i = 0; i < failed.length; i++) {
            const item = failed[i];
            let retryUrl = item.url;
            try {
                if (typeof resolver === 'function') {
                    retryUrl = (await resolver(item.sentence, {
                        reason: 'karaoke-capture-retry',
                        occurrence: item.occurrence,
                    })) || retryUrl;
                }
            } catch (e) {}
            if (retryUrl) await scheduleCaptureForStorage(item.sentence, retryUrl, item.occurrence);
        }
        setCaptureRetrying(false);
        refreshCaptureSaveState();
    }, [captureRetrying, scheduleCaptureForStorage, refreshCaptureSaveState]);

    // Split text into sentences once (self-contained — parent's splitTextToSentences isn't exported)
    useEffect(() => {
        setCurrentAudioReadyIdx(-1);
        captureRetryRef.current.clear();
        capturePendingRef.current.clear();
        captureIssueRef.current = { limit: false, message: '' };
        setCaptureSaveState({ pending: 0, failed: 0, limit: false, message: '' });
        const canonicalSentences = (Array.isArray(sentenceList) ? sentenceList : [])
            .map(s => String(s || '').trim())
            .filter(Boolean);
        if (canonicalSentences.length) {
            setSentences(canonicalSentences);
            setSentenceIdx(0); setSweepPct(0);
            warmedRef.current = new Set();
            warmPromisesRef.current = new Map();
            wordTimingsRef.current = new Map();
            return;
        }
        if (!text) { setSentences([]); return; }
        const cleaned = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        // Prefer the SHARED splitter (KaraokeAudioStore) so stored/vetted
        // audio keys line up exactly with what the player requests; the
        // inline regex below is the identical fallback when the store
        // module is absent (older bundles / web without it).
        const _KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
        if (_KS && typeof _KS.splitSentences === 'function') {
            const _shared = _KS.splitSentences(text);
            setSentences(_shared.length > 0 ? _shared : [cleaned]);
            setSentenceIdx(0); setSweepPct(0); warmedRef.current = new Set(); warmPromisesRef.current = new Map();
            return;
        }
        // Preserve terminal punctuation in each sentence; split on "punct + whitespace"
        const parts = cleaned.split(/([.!?]+["'\u201D\u2019]?)(\s+|$)/);
        const out = [];
        let buf = '';
        for (let i = 0; i < parts.length; i++) {
            buf += parts[i] || '';
            // Every 3rd chunk (index 0, 3, 6...) is body, next two are punct + whitespace
            if ((i % 3) === 2) {
                const s = buf.trim();
                if (s) out.push(s);
                buf = '';
            }
        }
        const tail = buf.trim();
        if (tail) out.push(tail);
        setSentences(out.length > 0 ? out : [cleaned]);
        setSentenceIdx(0);
        setSweepPct(0);
        warmedRef.current = new Set(); // new text → nothing warmed yet
        warmPromisesRef.current = new Map();
    }, [text, sentenceList]);

    // Warm state is index-based, so it is only valid for ONE request
    // signature. The parent's getAudioUrl resolver closes over the selected
    // voice/speed/language (view_simplified memoizes it on exactly those), so
    // a NEW resolver identity means the signature changed — indices marked
    // warm under Puck must not read as warm under Kore (2026-07-17). Spurious
    // identity churn only costs a cheap re-warm through the urlCache.
    useEffect(() => {
        warmedRef.current = new Set();
        warmPromisesRef.current = new Map();
        wordTimingsRef.current = new Map();
    }, [getAudioUrl]);

    // Warm the first sentence while the learner is orienting to the overlay.
    // If Play is pressed immediately, playSentence joins this same promise.
    // Warming does not persist the clip: capture starts only after playback.
    useEffect(() => {
        if (!isOpen || isPlaying || isGeneratingAudio || !sentences.length || typeof getAudioUrlRef.current !== 'function') return;
        if (warmedRef.current.has(0) && warmPromisesRef.current.has(0)) return;
        let cancelled = false;
        const resolver = getAudioUrlRef.current;
        warmedRef.current.add(0);
        const warmLoadOwner = beginAudioLoad('preparing');
        const request = Promise.resolve(resolver(sentences[0], {
            priority: 'interactive',
            maxRetries: 1,
            reason: 'karaoke-open-warm',
            occurrence: 0
        })).then((url) => {
            const entry = warmPromisesRef.current.get(0);
            if (!url && entry && entry.promise === request) {
                warmedRef.current.delete(0);
                warmPromisesRef.current.delete(0);
            }
            return url || null;
        }).catch(() => {
            const entry = warmPromisesRef.current.get(0);
            if (entry && entry.promise === request) {
                warmedRef.current.delete(0);
                warmPromisesRef.current.delete(0);
            }
            return null;
        }).finally(() => {
            if (warmWatchdog) clearTimeout(warmWatchdog);
            if (!cancelled) finishAudioLoad(warmLoadOwner);
        });
        // Watchdog: a warm that never settles must not spin the "Preparing
        // first sentence" pill forever OR stay joinable — clear it so the
        // pill closes and the next Play/reopen issues a FRESH request. If
        // the request settles later anyway, it still lands in the urlCache.
        const warmWatchdog = setTimeout(() => {
            const entry = warmPromisesRef.current.get(0);
            if (entry && entry.promise === request) {
                warmedRef.current.delete(0);
                warmPromisesRef.current.delete(0);
            }
            karaokeTrace('karaoke:open-warm-timeout', { afterMs: KARAOKE_RESOLVE_WATCHDOG_MS });
            if (!cancelled) finishAudioLoad(warmLoadOwner);
        }, KARAOKE_RESOLVE_WATCHDOG_MS);
        // Warm entries record their queue priority: playback may JOIN an
        // interactive warm (same budget it would request itself) but must
        // REPLACE a background one (see playSentence).
        warmPromisesRef.current.set(0, { promise: request, priority: 'interactive' });
        return () => { cancelled = true; clearTimeout(warmWatchdog); finishAudioLoad(warmLoadOwner); };
    }, [isOpen, isPlaying, isGeneratingAudio, sentences, getAudioUrl, beginAudioLoad, finishAudioLoad]);

    // ── Low-priority next-sentence pre-warm ─────────────────────────────
    // Whenever the active sentence changes, quietly fetch the NEXT sentence
    // through the SAME getAudioUrl the player uses. Because that
    // path (callTTS) caches on the shared urlCache under the exact key
    // playback will request, advancing to a warmed sentence is an instant
    // cache hit — the audio "generated once" serves both the fetch and the
    // pre-warm. Design guards:
    //  • FORWARD-ONLY (idx+1…): never competes with the current sentence's
    //    own fetch, so the sentence the student is on is never delayed.
    //  • ONE-sentence look-ahead bounds cloud work and encoder contention.
    //  • Deduped via warmedRef; cancelled on close/advance.
    useEffect(() => {
        if (!isOpen || !isPlaying || currentAudioReadyIdx !== sentenceIdx || sentences.length === 0) return;
        const resolver = getAudioUrlRef.current;
        if (typeof resolver !== 'function') return;
        let cancelled = false;
        const LOOKAHEAD = 1;
        const run = async () => {
            for (let i = sentenceIdx + 1; i <= sentenceIdx + LOOKAHEAD && i < sentences.length; i++) {
                if (cancelled) return;
                const alreadyWarmed = warmedRef.current.has(i);
                if (alreadyWarmed) continue;
                warmedRef.current.add(i);
                // Warm at background priority. If this sentence becomes the
                // ACTIVE one while the warm is still pending, playSentence
                // replaces it with a fresh interactive request (see there) —
                // it only fills the shared urlCache for the instant-hit case.
                let request = null;
                try {
                    request = Promise.resolve(resolver(sentences[i], {
                        priority: 'background',
                        maxRetries: 0,
                        reason: 'karaoke-lookahead',
                        occurrence: occurrenceForIndex(i)
                    }));
                    warmPromisesRef.current.set(i, { promise: request, priority: 'background' });
                    const warmedUrl = await request;
                    if (cancelled) return;
                    if (!warmedUrl) {
                        warmedRef.current.delete(i);
                        const entry = warmPromisesRef.current.get(i);
                        if (entry && entry.promise === request) warmPromisesRef.current.delete(i);
                    }
                }
                catch (e) {
                    warmedRef.current.delete(i);
                    const entry = warmPromisesRef.current.get(i);
                    if (entry && entry.promise === request) warmPromisesRef.current.delete(i);
                }
            }
        };
        // Small defer so the current sentence's on-demand fetch always wins
        // the queue; pre-warm fills in behind it.
        const timer = setTimeout(run, 200);
        return () => { cancelled = true; clearTimeout(timer); };
        // getAudioUrl is a dep ON PURPOSE (2026-07-17): a new resolver identity
        // means the request signature (voice/speed/language) may have changed;
        // the reset effect above just cleared the warm sets, and re-running
        // here re-warms under the new signature. This never restarts the
        // CURRENT sentence — warming is forward-only (idx+1…) and playback
        // reads via getAudioUrlRef.
    }, [isOpen, isPlaying, sentences, sentenceIdx, currentAudioReadyIdx, getAudioUrl, occurrenceForIndex]);

    // If saving is enabled while a sentence is already playing, capture that
    // current clip instead of waiting for the next sentence.
    const previousCaptureOnRef = useRef(captureOn);
    useEffect(() => {
        const justEnabled = !previousCaptureOnRef.current && captureOn;
        previousCaptureOnRef.current = captureOn;
        if (!justEnabled || !isOpen || !isPlaying) return;
        const audio = audioRef.current;
        const sentence = sentences[sentenceIdx];
        if (audio && audio.src && sentence) scheduleCaptureForStorage(sentence, audio.src, occurrenceForIndex(sentenceIdx));
    }, [captureOn, isOpen, isPlaying, sentences, sentenceIdx, scheduleCaptureForStorage, occurrenceForIndex]);

    // Hard teardown when the overlay closes or the component unmounts
    useEffect(() => {
        if (!isOpen) {
            // Bump the play token so any pending getAudioUrl resolution is ignored.
            playTokenRef.current++;
            try { if (audioRequestAbortRef.current) audioRequestAbortRef.current.abort(); } catch (e) {}
            audioRequestAbortRef.current = null;
            try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch (e) {}
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
            setIsPlaying(false);
            clearAudioLoad();
            setPlaybackFallbackNotice('');
            setCurrentAudioReadyIdx(-1);
            setSweepPct(0);
        }
        return () => {
            playTokenRef.current++;
            audioLoadOwnerRef.current += 1;
            try { if (audioRequestAbortRef.current) audioRequestAbortRef.current.abort(); } catch (e) {}
            audioRequestAbortRef.current = null;
            try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch (e) {}
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        };
    }, [isOpen, clearAudioLoad]);

    // Scroll the active sentence into view
    useEffect(() => {
        const node = activeSentenceRef.current;
        if (node) { try { node.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); } catch (e) {} }
    }, [sentenceIdx, reducedMotion]);

    // Play the current sentence (Gemini audio if getAudioUrl provided, else browser TTS fallback)
    const playSentence = useCallback(async (idx) => {
        if (idx < 0 || idx >= sentences.length) return;
        // Stop anything already playing and invalidate any in-flight audio fetch
        try { if (audioRequestAbortRef.current) audioRequestAbortRef.current.abort(); } catch (e) {}
        audioRequestAbortRef.current = null;
        try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch (e) {}
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        setSweepPct(0);
        clearAudioLoad();
        setPlaybackFallbackNotice('');
        setCurrentAudioReadyIdx(-1);
        const sentenceText = sentences[idx];
        const token = ++playTokenRef.current;

        // Try parent-provided audio (Gemini)
        let url = null;
        let audioLoadOwner = null;
        let resolveTimedOut = false;
        const resolver = getAudioUrlRef.current;
        if (typeof resolver === 'function') {
            audioLoadOwner = beginAudioLoad('generating');
            let requestController = null;
            try {
                const warmEntry = warmPromisesRef.current.get(idx);
                let resolution;
                const resolveStartedAt = Date.now();
                if (warmEntry && warmEntry.priority !== 'background') {
                    // An interactive warm (overlay-open) carries the same
                    // priority/retry budget playback would request — join it.
                    karaokeTrace('karaoke:play', { idx, mode: 'join-warm' });
                    resolution = warmEntry.promise;
                } else {
                    // No warm, or only a BACKGROUND look-ahead. A background
                    // warm must not shape ACTIVE playback: it sits in the
                    // background queue lane, has a zero-retry budget, and no
                    // abort handle for Stop. Replace it with a fresh
                    // interactive request; the look-ahead settles harmlessly
                    // into the shared urlCache.
                    if (warmEntry) warmPromisesRef.current.delete(idx);
                    karaokeTrace('karaoke:play', { idx, mode: warmEntry ? 'replace-background-warm' : 'fresh' });
                    requestController = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    audioRequestAbortRef.current = requestController;
                    resolution = resolver(sentenceText, {
                        priority: 'interactive',
                        maxRetries: 1,
                        signal: requestController ? requestController.signal : null,
                        reason: 'karaoke-play',
                        occurrence: occurrenceForIndex(idx)
                    });
                }
                // Watchdog: the resolution chain has awaits that can hang
                // (serialized cloud queue, plugin loads). Give up after the
                // window, fall back to the device voice, and clear the warm
                // bookkeeping so the NEXT Play issues a fresh request rather
                // than re-joining the hung promise.
                let watchdogTimer = null;
                url = await Promise.race([
                    Promise.resolve(resolution),
                    new Promise((resolveLater) => {
                        watchdogTimer = setTimeout(() => {
                            resolveTimedOut = true;
                            resolveLater(null);
                        }, KARAOKE_RESOLVE_WATCHDOG_MS);
                    })
                ]);
                if (watchdogTimer) clearTimeout(watchdogTimer);
                if (resolveTimedOut && !url) {
                    warmedRef.current.delete(idx);
                    warmPromisesRef.current.delete(idx);
                    karaokeTrace('karaoke:resolve-timeout', { idx, afterMs: Date.now() - resolveStartedAt });
                    console.warn('[Karaoke] Audio resolution timed out after ' + Math.round(KARAOKE_RESOLVE_WATCHDOG_MS / 1000) + 's; using the device voice for this sentence.');
                } else {
                    karaokeTrace('karaoke:resolve-settled', { idx, ok: !!url, ms: Date.now() - resolveStartedAt });
                }
            } catch (e) {
                url = null;
                karaokeTrace('karaoke:resolve-error', { idx, error: String(e?.message || e).substring(0, 140) });
                console.warn('[Karaoke] Generated audio request failed; using browser fallback.', e?.message || e);
            } finally {
                if (audioRequestAbortRef.current === requestController) audioRequestAbortRef.current = null;
                if (token === playTokenRef.current) {
                    if (url) {
                        setCurrentAudioReadyIdx(idx);
                        transitionAudioLoad(audioLoadOwner, 'starting');
                    } else {
                        transitionAudioLoad(audioLoadOwner, 'starting-device');
                    }
                }
            }
        }
        // If the user advanced / closed / reopened during the await, bail.
        if (token !== playTokenRef.current) {
            finishAudioLoad(audioLoadOwner);
            return;
        }

        if (url) {
            setPlaybackFallbackNotice('');
            // Audio-derived word timings (non-blocking): decode the clip's
            // energy envelope once and snap word boundaries to real valleys.
            // Until (or unless) the mapping lands, the sweep uses the linear
            // estimate below — same visuals, coarser clock.
            try {
                const WT = window.AlloModules && window.AlloModules.WordTiming;
                if (WT && typeof WT.timingsForUrl === 'function' && !wordTimingsRef.current.has(idx)) {
                    WT.timingsForUrl(url, sentenceText).then((mapping) => {
                        if (mapping && token === playTokenRef.current) wordTimingsRef.current.set(idx, mapping);
                    }).catch(() => {});
                }
            } catch (e) {}
            const audio = new Audio(url);
            audio.playbackRate = playbackSpeedRef.current || 1;
            audioRef.current = audio;
            audio.addEventListener('playing', () => finishAudioLoad(audioLoadOwner));
            const updateSweep = () => {
                if (!audioRef.current || audioRef.current !== audio) return;
                const WT = window.AlloModules && window.AlloModules.WordTiming;
                const mapping = wordTimingsRef.current.get(idx);
                const dur = audio.duration;
                let pct;
                if (WT && mapping && typeof WT.weightPctAtTime === 'function') {
                    // True word-by-word clock: currentTime is in the clip's own
                    // timeline, so playbackRate needs no compensation.
                    pct = WT.weightPctAtTime(mapping, audio.currentTime);
                } else if (isFinite(dur) && dur > 0) {
                    pct = Math.min(100, (audio.currentTime / dur) * 100);
                } else {
                    // Unknown duration — approximate from char count at ~15 chars/sec
                    const estSec = Math.max(1.5, sentenceText.length / 15);
                    pct = Math.min(100, (audio.currentTime / estSec) * 100);
                }
                setSweepPct(reducedMotion ? (pct > 5 ? 100 : 0) : pct);
            };
            audio.addEventListener('timeupdate', updateSweep);
            audio.addEventListener('ended', () => {
                setSweepPct(100);
                if (autoAdvance && idx < sentences.length - 1) {
                    setTimeout(() => { setSentenceIdx(idx + 1); }, 250);
                } else {
                    setIsPlaying(false);
                }
            });
            audio.addEventListener('error', () => {
                if (token === playTokenRef.current) {
                    finishAudioLoad(audioLoadOwner);
                    console.warn('[Karaoke] Generated audio element reported a playback error.');
                    setIsPlaying(false);
                }
            });
            try {
                await audio.play();
                finishAudioLoad(audioLoadOwner);
                if (token !== playTokenRef.current) {
                    try { audio.pause(); } catch (_) {}
                    return;
                }
                karaokeTrace('karaoke:audio-playing', { idx });
                // Let playback win the main-thread/startup race; capture snapshots
                // immediately afterward and performs conversion in the background.
                scheduleCaptureForStorage(sentenceText, url, occurrenceForIndex(idx));
                return;
            } catch (e) {
                if (token !== playTokenRef.current) {
                    finishAudioLoad(audioLoadOwner);
                    return;
                }
                transitionAudioLoad(audioLoadOwner, 'starting-device');
                karaokeTrace('karaoke:audio-start-fail', { idx, error: String(e?.message || e).substring(0, 140) });
                console.warn('[Karaoke] Generated audio could not start; using browser speech fallback.', e?.message || e);
                setPlaybackFallbackNotice(captureOn
                    ? 'Using this device\'s voice. Browser fallback audio cannot be saved; retry when generated audio is available.'
                    : 'Using this device\'s voice because generated audio is unavailable.');
                try { audio.pause(); } catch (_) {}
                if (audioRef.current === audio) audioRef.current = null;
            }
        }

        // Browser TTS fallback with estimated duration
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
            if (audioLoadOwner == null) audioLoadOwner = beginAudioLoad('starting-device');
            else transitionAudioLoad(audioLoadOwner, 'starting-device');
            karaokeTrace('karaoke:device-fallback', { idx, cause: resolveTimedOut ? 'resolve-timeout' : 'no-generated-url' });
            setPlaybackFallbackNotice((captureOn
                ? 'Using this device\'s voice. Browser fallback audio cannot be saved; retry when generated audio is available.'
                : 'Using this device\'s voice because generated audio is unavailable.')
                + (resolveTimedOut ? ' Audio generation timed out — press Play to retry.' : ''));
            try {
                const u = new SpeechSynthesisUtterance(sentenceText);
                u.onstart = () => finishAudioLoad(audioLoadOwner);
                // Native word-boundary events give the device voice TRUE word
                // timing for free (charIndex = the word about to be spoken).
                // Once one fires, the elapsed-time estimate tick stands down.
                let boundarySeen = false;
                u.onboundary = (event) => {
                    try {
                        const WT = window.AlloModules && window.AlloModules.WordTiming;
                        if (!WT || typeof event.charIndex !== 'number' || token !== playTokenRef.current) return;
                        boundarySeen = true;
                        const pct = WT.weightPctAtCharIndex(sentenceText, event.charIndex);
                        setSweepPct(reducedMotion ? (pct > 5 ? 100 : 0) : pct);
                    } catch (e) {}
                };
                // Browser TTS: multiply the natural 0.95 base by the user's
                // playback speed. speechSynthesis rate is clamped by the browser
                // to roughly [0.1, 10], so 0.95 * 0.75 = 0.7125 and 0.95 * 1.5 =
                // 1.425 both land comfortably in range.
                u.rate = 0.95 * (playbackSpeedRef.current || 1);
                u.pitch = 1.0; u.volume = 0.95;
                const estMs = Math.max(1500, sentenceText.length * 60) / (playbackSpeedRef.current || 1);
                const startTs = performance.now();
                const tick = () => {
                    const elapsed = performance.now() - startTs;
                    const pct = Math.min(100, (elapsed / estMs) * 100);
                    // Boundary events (real word starts) outrank the estimate.
                    if (!boundarySeen) setSweepPct(reducedMotion ? (pct > 5 ? 100 : 0) : pct);
                    if (pct < 100) rafRef.current = requestAnimationFrame(tick);
                };
                u.onend = () => {
                    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
                    setSweepPct(100);
                    finishAudioLoad(audioLoadOwner);
                    if (autoAdvance && idx < sentences.length - 1) {
                        setTimeout(() => { setSentenceIdx(idx + 1); }, 250);
                    } else {
                        setIsPlaying(false);
                    }
                };
                u.onerror = () => { finishAudioLoad(audioLoadOwner); if (rafRef.current) cancelAnimationFrame(rafRef.current); setIsPlaying(false); };
                window.speechSynthesis.speak(u);
                setTimeout(() => finishAudioLoad(audioLoadOwner), 2000);
                rafRef.current = requestAnimationFrame(tick);
            } catch (e) { finishAudioLoad(audioLoadOwner); setIsPlaying(false); }
            return;
        }

        // No TTS available — just mark sentence as read after a short display
        finishAudioLoad(audioLoadOwner);
        setTimeout(() => {
            setSweepPct(100);
            if (autoAdvance && idx < sentences.length - 1) setSentenceIdx(idx + 1);
            else setIsPlaying(false);
        }, 1500);
    }, [sentences, autoAdvance, reducedMotion, scheduleCaptureForStorage, captureOn, beginAudioLoad, transitionAudioLoad, finishAudioLoad, clearAudioLoad, occurrenceForIndex]);

    // ── Teacher vetting handlers ────────────────────────────────────────
    // Regenerate the CURRENT sentence's audio, then replay so the teacher hears
    // the new take immediately. The ANTI global stores it + persists it into
    // the resource; getAudioUrl (store-first) serves the new clip next play.
    const regenerateCurrent = useCallback(async () => {
        const sentence = sentences[sentenceIdx];
        if (regenBusy || !sentence || typeof window.__alloRegenerateSentenceAudio !== 'function') return;
        setRegenBusy(true);
        try {
            await window.__alloRegenerateSentenceAudio(sentence);
            warmedRef.current.delete(sentenceIdx); // force a fresh fetch of the new clip
            warmPromisesRef.current.delete(sentenceIdx);
            setSweepPct(0);
            playSentence(sentenceIdx);
        } catch (e) {}
        setRegenBusy(false);
    }, [regenBusy, sentences, sentenceIdx, playSentence]);
    // Generate audio for every not-yet-vetted sentence and persist the set.
    const prepareAll = useCallback(async () => {
        if ((prepState && prepState.busy) || !sentences.length || typeof window.__alloPrepareReadAloud !== 'function') return;
        setPrepState({ busy: true, done: 0, total: sentences.length });
        try {
            const res = await window.__alloPrepareReadAloud(sentences, function (done, total) { setPrepState({ busy: true, done: done, total: total }); });
            setPrepState({
                busy: false,
                done: (res && res.generated) || 0,
                total: (res && res.total) || 0,
                failed: (res && res.failed) || 0,
                remaining: (res && res.remaining) || 0,
                bytes: (res && res.bytes) || 0,
                failure: res && res.failure
            });
        } catch (e) { setPrepState(null); }
    }, [prepState, sentences]);
    // Record the teacher’s own voice for the CURRENT sentence, sentence by
    // sentence. The store is voice-source-agnostic, so the recording plays
    // through karaoke like any clip; tagged human-teacher for honest
    // provenance. Click to start, click to stop → stores + replays the take.
    // Play back the STUDENT’s own recording of the current sentence (their
    // lane), separate from the teacher/AI read-along. Transient Audio so it
    // does not disturb the sweep player.
    const playStudentTake = useCallback(() => {
        try {
            const st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.studentCurrent;
            const url = st && st.get(sentences[sentenceIdx]);
            if (!url) return;
            try { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } } catch (e) {}
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            const a = new Audio(url); a.playbackRate = playbackSpeedRef.current || 1; a.play().catch(() => {});
        } catch (e) {}
    }, [sentences, sentenceIdx]);
    const recordCurrent = useCallback(async () => {
        const sentence = sentences[sentenceIdx];
        if (!sentence) return;
        if (recording) {
            try { const r = _recRef.current; if (r && r.rec && r.rec.state !== 'inactive') r.rec.stop(); } catch (e) {}
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream);
            const chunks = [];
            rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = async () => {
                try { stream.getTracks().forEach(tr => tr.stop()); } catch (e) {}
                setRecording(false);
                if (!chunks.length) return;
                const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                if (isTeacher) {
                    if (typeof window.__alloStoreRecordedSentenceAudio === 'function') {
                        const ok = await window.__alloStoreRecordedSentenceAudio(sentence, blob, 'human-teacher');
                        if (ok) { warmedRef.current.delete(sentenceIdx); warmPromisesRef.current.delete(sentenceIdx); setSweepPct(0); playSentence(sentenceIdx); }
                    }
                } else {
                    if (typeof window.__alloStoreStudentSentenceAudio === 'function') {
                        const ok = await window.__alloStoreStudentSentenceAudio(sentence, blob);
                        if (ok) { setStudentTakeTick(x => x + 1); playStudentTake(); }
                    }
                }
            };
            _recRef.current = { rec: rec, stream: stream };
            rec.start();
            setRecording(true);
        } catch (e) { setRecording(false); }
    }, [recording, sentences, sentenceIdx, playSentence, playStudentTake, isTeacher]);
    // Stop any active recording if the overlay closes mid-take.
    useEffect(() => {
        if (!isOpen) {
            try { const r = _recRef.current; if (r && r.rec && r.rec.state !== 'inactive') r.rec.stop(); if (r && r.stream) r.stream.getTracks().forEach(tr => tr.stop()); } catch (e) {}
            setRecording(false);
        }
    }, [isOpen]);

    // Start / restart playback when sentenceIdx changes while playing, or when play toggles on
    useEffect(() => {
        if (!isOpen || !isPlaying) return;
        playSentence(sentenceIdx);
        // Intentional: playSentence already stops prior audio. Don't return cleanup here to avoid
        // double-stop during sentence transitions (the next call handles it).
    }, [sentenceIdx, isOpen, isPlaying, playSentence]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => {
            if (e.key !== 'Escape' && isInteractiveShortcutTarget(e.target)) return;
            if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
            else if (e.code === 'ArrowRight') { setSentenceIdx(i => Math.min(sentences.length - 1, i + 1)); setSweepPct(0); }
            else if (e.code === 'ArrowLeft')  { setSentenceIdx(i => Math.max(0, i - 1)); setSweepPct(0); }
            else if (e.code === 'Home') { setSentenceIdx(0); setSweepPct(0); }
            else if (e.code === 'End') { setSentenceIdx(Math.max(0, sentences.length - 1)); setSweepPct(0); }
            else if (e.key === 'Escape') {
                try { if (audioRef.current) audioRef.current.pause(); window.speechSynthesis && window.speechSynthesis.cancel(); } catch (ee) {}
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose, sentences.length]);

    if (!isOpen) return null;
    const overallPct = sentences.length > 0
        ? ((sentenceIdx + (sweepPct / 100)) / sentences.length) * 100
        : 0;

    const renderSentence = (sText, idx) => {
        const isActive = idx === sentenceIdx;
        const isPast = idx < sentenceIdx;
        if (isActive) {
            const pct = sweepPct;
            // Word-level sweep in reading order. A single background-clip gradient
            // across the WHOLE sentence looks correct only while the sentence fits
            // on one line: once the text wraps (which it almost always does at this
            // font size in a max-w-3xl column), `linear-gradient(to right, …)`
            // repaints the SAME horizontal band on every wrapped line instead of
            // following reading order, so the colored region drifts out of sync with
            // the spoken words (the "slightly off" highlight). Splitting the sentence
            // into per-word inline boxes lets the browser wrap naturally while the
            // fill advances strictly in reading order — matching the leveled-text
            // reader's accuracy while preserving the karaoke sweep feel.
            //
            // Pacing is PUNCTUATION-AWARE. Base weight is a word's character count
            // (length ≈ speaking time), but Gemini TTS lingers at commas/periods
            // while the audio clock keeps advancing — so we fold a pause "bonus"
            // into the whitespace GAP that follows a punctuated word. That makes the
            // pause belong to the gap: the word stays fully lit while the fill rests
            // in the space, then resumes on the next word — instead of the sweep
            // running ahead through the silence. Weights are character-equivalents;
            // the bonuses mirror the Focus Reader's chunkDelayFor punctuation tiers.
            // Token weights come from the WordTiming module when loaded — the
            // SAME model that maps audio time → sweep pct, so the painted fill
            // and the derived timings can never disagree. The inline fallback
            // below must stay rule-identical to WordTiming.tokenWeights.
            let parts, weights, totalWeight;
            const _wordTimingModel = (() => {
                try {
                    const WT = window.AlloModules && window.AlloModules.WordTiming;
                    return WT && typeof WT.tokenWeights === 'function' ? WT.tokenWeights(sText) : null;
                } catch (e) { return null; }
            })();
            if (_wordTimingModel) {
                parts = _wordTimingModel.parts;
                weights = _wordTimingModel.weights;
                totalWeight = _wordTimingModel.totalWeight;
            } else {
                parts = sText.split(/(\s+)/); // keep whitespace tokens so wrap points/spacing survive
                const pauseBonus = (word) => {
                    const tail = String(word).replace(/["'”’\)\]]*$/, '').slice(-1);
                    if (/[.!?]/.test(tail)) return 5;   // sentence-ending: longest rest
                    if (/[,;:]/.test(tail)) return 3;   // clause break
                    if (/[—–]/.test(tail)) return 3;    // dash
                    return 0;
                };
                // First pass: weight each token. A whitespace gap inherits the pause
                // bonus of the word immediately before it.
                let prevWord = '';
                weights = parts.map((part) => {
                    if (/^\s+$/.test(part)) return part.length + pauseBonus(prevWord);
                    if (part !== '') prevWord = part;
                    return part.length;
                });
                totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
            }
            const filledChars = (pct / 100) * totalWeight; // "filled weight" in the same units
            let charAcc = 0;
            return (
                <span
                    key={idx}
                    ref={el => { activeSentenceRef.current = el; }}
                    aria-current="true"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSentenceIdx(idx); setSweepPct(0); if (!isPlaying) setIsPlaying(true); } }}
                    onClick={() => { setSentenceIdx(idx); setSweepPct(0); if (!isPlaying) setIsPlaying(true); }}
                    style={{ fontWeight: 700, cursor: 'pointer', borderRadius: 2 }}
                >
                    {parts.map((part, pi) => {
                        const start = charAcc;
                        charAcc += weights[pi];
                        // Whitespace inherits color and only marks wrap points — no styling.
                        // Its weight (incl. any pause bonus) still advances the fill so the
                        // sweep rests in the gap during a punctuation pause.
                        if (/^\s+$/.test(part)) return part;
                        const end = charAcc;
                        if (end <= filledChars) {
                            // Already spoken.
                            return <span key={pi} style={{ color: c.sweep, transition: reducedMotion ? 'none' : 'color 0.12s linear' }}>{part}</span>;
                        }
                        if (start >= filledChars) {
                            // Not yet reached.
                            return <span key={pi} style={{ color: c.dim }}>{part}</span>;
                        }
                        // The word currently being spoken — fill it left-to-right with a
                        // gradient. A single word rarely wraps, so a horizontal gradient
                        // is accurate here and gives a smooth sub-word sweep.
                        const wPct = Math.max(0, Math.min(100, ((filledChars - start) / (weights[pi] || 1)) * 100));
                        const wordBg = 'linear-gradient(to right, ' + c.sweep + ' 0%, ' + c.sweep + ' ' + wPct + '%, ' + c.dim + ' ' + wPct + '%, ' + c.dim + ' 100%)';
                        return (
                            <span key={pi} style={{
                                backgroundImage: wordBg,
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                color: 'transparent'
                            }}>{part}</span>
                        );
                    })}
                </span>
            );
        }
        return (
            <span
                key={idx}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSentenceIdx(idx); setSweepPct(0); } }}
                onClick={() => { setSentenceIdx(idx); setSweepPct(0); }}
                style={{
                    color: c.dim,
                    opacity: isPast ? 0.85 : 0.35,
                    transition: reducedMotion ? 'none' : 'opacity 0.3s',
                    cursor: 'pointer'
                }}
            >
                {sText}
            </span>
        );
    };


    const hasStudentTake = studentTakeTick >= 0 && (() => { try { const st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.studentCurrent; return !!(st && st.has(sentences[sentenceIdx])); } catch (e) { return false; } })();
    return (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="karaoke-reader-dialog-title" tabIndex={-1} className="fixed inset-0 z-[300] flex flex-col animate-in fade-in duration-200 motion-reduce:animate-none" style={{ backgroundColor: c.bg, color: c.ink }}>
            <div className="p-4 flex justify-between items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { hardStop(); onClose(); }} aria-label={safeT(t, 'common.close', 'Close')} className="p-2 rounded-full hover:bg-black/5" style={{ color: c.ink }}>
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex flex-col">
                        <h2 id="karaoke-reader-dialog-title" className="font-bold text-base">{safeT(t, 'immersive.focus_reader', 'Focus Reader')}</h2>
                        <span className="text-xs" style={{ color: c.dim }}>Sentence {sentenceIdx + 1} / {sentences.length} · read-along sweep{(() => { try { const _st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current; return _st && _st.sourceOf(sentences[sentenceIdx]) === 'human-teacher'; } catch (e) { return false; } })() ? ' · \uD83C\uDFA4 your voice' : ''}</span>
                        {playbackFallbackNotice ? (
                            <span className="text-xs font-semibold max-w-xl" role="status" aria-live="polite" style={{ color: c.sweep }}>
                                {playbackFallbackNotice}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-xs font-bold">
                    {isTeacher && (
                        <div className="flex items-center gap-2" role="group" aria-label={safeT(t, 'immersive.teacher_audio_tools', 'Read-aloud tools')}>
                            <label className="flex items-center gap-1.5 cursor-pointer" title={safeT(t, 'immersive.save_readaloud_tip', 'Save each sentence shortly after it starts playing into this resource, so students hear your vetted audio instantly on any device.')}>
                                <input type="checkbox" checked={captureOn} onChange={e => setCaptureOn(e.target.checked)} aria-label={safeT(t, "immersive.save_readaloud", "Save read-aloud as I listen")} />
                                <span>{'💾'} {safeT(t, 'immersive.save_readaloud', 'Save read-aloud')}</span>
                            </label>
                            {captureSaveState.pending > 0 && (
                                <span role="status" aria-live="polite" style={{ color: c.sweep }}>
                                    {safeT(t, 'immersive.saving_readaloud', 'Saving')} {captureSaveState.pending}
                                </span>
                            )}
                            {captureSaveState.failed > 0 && captureSaveState.limit && (
                                <span role="alert" title={captureSaveState.message} style={{ color: '#b45309' }}>
                                    {safeT(t, 'immersive.readaloud_limit', 'Storage limit reached')} · {captureSaveState.failed}
                                </span>
                            )}
                            {captureSaveState.failed > 0 && !captureSaveState.limit && (
                                <button
                                    type="button"
                                    onClick={retryFailedCaptures}
                                    disabled={captureRetrying}
                                    title={captureSaveState.message || safeT(t, 'immersive.retry_readaloud_tip', 'Retry audio that could not be saved.')}
                                    className="px-2.5 py-1 rounded-full transition-all"
                                    style={{ background: 'transparent', color: '#b91c1c', border: '1px solid #fca5a5', opacity: captureRetrying ? 0.65 : 1 }}
                                >
                                    {captureRetrying ? '…' : '↻'} {safeT(t, 'immersive.retry_failed_saves', 'Retry failed saves')} · {captureSaveState.failed}
                                </button>
                            )}
                            <button type="button"
                                onClick={regenerateCurrent}
                                disabled={regenBusy}
                                title={safeT(t, 'immersive.regenerate_sentence_tip', 'Re-generate the audio for this sentence if it sounds off. Students hear your vetted version.')}
                                className="px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                style={{ background: 'transparent', color: c.ink, border: `1px solid ${c.dim}55`, opacity: regenBusy ? 0.6 : 1 }}
                            >
                                {regenBusy ? '…' : '🔄'} {safeT(t, 'immersive.regenerate_sentence', 'Regenerate this sentence')}
                            </button>
                            <button type="button"
                                onClick={recordCurrent}
                                title={safeT(t, 'immersive.record_sentence_tip', 'Record your own voice for this sentence. Students hear your recording instead of the computer voice.')}
                                className="px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                style={{ background: recording ? '#dc2626' : 'transparent', color: recording ? '#fff' : c.ink, border: `1px solid ${recording ? '#dc2626' : c.dim + '55'}` }}
                            >
                                {recording ? `⏹ ${safeT(t, 'immersive.stop_recording', 'Stop recording')}` : `🎤 ${safeT(t, 'immersive.record_sentence', 'Record my voice')}`}
                            </button>
                            <button type="button"
                                onClick={() => { if (prepState && prepState.busy) { window.__alloPrepareReadAloudCancel = true; return; } prepareAll(); }}
                                title={prepState && prepState.busy
                                    ? safeT(t, 'immersive.prepare_readaloud_stop', 'Stop after the current sentence (already-saved audio is kept).')
                                    : safeT(t, 'immersive.prepare_readaloud_tip', 'Generate audio for every sentence and save it into this resource so students hear it instantly on any device.')}
                                className="px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                style={{ background: (prepState && !prepState.busy) ? c.accent : 'transparent', color: c.ink, border: `1px solid ${c.dim}55`, opacity: (prepState && prepState.busy) ? 0.7 : 1 }}
                            >
                                {prepState && prepState.busy
                                    ? `… ${prepState.done}/${prepState.total} ✕`
                                    : (prepState && !prepState.busy && prepState.remaining)
                                        ? `↻ ${safeT(t, 'immersive.retry_failed_saves', 'Retry failed saves')} · ${prepState.remaining}`
                                        : (prepState && !prepState.busy)
                                            ? `✓ ${safeT(t, 'immersive.readaloud_saved', 'Saved')}${prepState.bytes ? ' · ' + Math.max(1, Math.round(prepState.bytes / 1048576 * 10) / 10) + ' MB' : ''}`
                                            : `💾 ${safeT(t, 'immersive.prepare_readaloud', 'Prepare read-aloud for students')}`}
                            </button>
                        </div>
                    )}
                    {!isTeacher && (
                        <div className="flex items-center gap-2" role="group" aria-label={safeT(t, 'immersive.student_reading_tools', 'My reading')}>
                            <button type="button"
                                onClick={recordCurrent}
                                title={safeT(t, 'immersive.record_reading_tip', 'Record yourself reading this sentence, then hear it back. The teacher\u2019s read-along stays your reference.')}
                                className="px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                style={{ background: recording ? '#dc2626' : 'transparent', color: recording ? '#fff' : c.ink, border: `1px solid ${recording ? '#dc2626' : c.dim + '55'}` }}
                            >
                                {recording ? `⏹ ${safeT(t, 'immersive.stop_recording', 'Stop recording')}` : `🎤 ${safeT(t, 'immersive.record_reading', 'Record my reading')}`}
                            </button>
                            <button type="button"
                                onClick={playStudentTake}
                                disabled={!hasStudentTake}
                                title={safeT(t, 'immersive.hear_my_reading_tip', 'Play back your own recording of this sentence.')}
                                className="px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
                                style={{ background: 'transparent', color: c.ink, border: `1px solid ${c.dim}55`, opacity: hasStudentTake ? 1 : 0.5 }}
                            >
                                {'▶'} {safeT(t, 'immersive.hear_my_reading', 'Hear my reading')}
                            </button>
                        </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={autoAdvance} onChange={e => setAutoAdvance(e.target.checked)} aria-label={t('immersive.auto_advance_aria') || 'Auto-advance to next sentence'} />
                        <span style={{ color: c.ink }}>Auto-advance</span>
                    </label>
                    {/* Playback speed. Applies live to Gemini audio (the speed
                        flips on the currently-playing sentence); browser TTS
                        picks it up on the next sentence since speechSynthesis
                        rate is locked once speak() fires. */}
                    <div className="flex items-center gap-1" role="group" aria-label={t('immersive.playback_speed_aria') || 'Playback speed'}>
                        <span style={{ color: c.dim }}>SPEED</span>
                        {[0.75, 1, 1.25, 1.5].map(rate => (
                            <button type="button"
                                key={rate}
                                onClick={() => setPlaybackSpeed(rate)}
                                aria-pressed={playbackSpeed === rate}
                                title={`Playback speed ${rate}x`}
                                className="px-2 py-1 text-[11px] rounded-full transition-all tabular-nums"
                                style={{
                                    background: playbackSpeed === rate ? c.accent : 'transparent',
                                    color: playbackSpeed === rate ? c.ink : c.dim,
                                    border: `1px solid ${playbackSpeed === rate ? c.accent : c.dim + '55'}`,
                                    fontWeight: playbackSpeed === rate ? 800 : 600
                                }}
                            >
                                {rate}×
                            </button>
                        ))}
                    </div>
                    <label className="flex items-center gap-2">
                        <span style={{ color: c.dim }}>THEME</span>
                        <select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value)} className="text-xs rounded px-2 py-1 border" style={{ borderColor: c.ink, background: c.bg, color: c.ink }}>
                            <option value="warm">☀️ Warm</option>
                            <option value="dark">🌙 Dark</option>
                            <option value="sepia">📜 Sepia</option>
                        </select>
                    </label>
                    {isAudioLoading && (
                        <span id="karaoke-audio-loading-status" className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold shadow-sm" role="status" aria-live="polite" aria-atomic="true" style={{ color: c.ink, background: c.accent, border: `1px solid ${c.sweep}66` }}>
                            <Loader2 size={15} className="animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
                            <span>{audioLoadingText}</span>
                        </span>
                    )}
                    <button type="button" onClick={() => { if (isPlaying) { hardStop(); setIsPlaying(false); } else { setIsPlaying(true); } }}
                        aria-label={isPlaying ? (isAudioLoading ? 'Stop loading audio' : 'Pause') : 'Play'} aria-pressed={isPlaying} aria-busy={isAudioLoading} aria-describedby={isAudioLoading ? 'karaoke-audio-loading-status' : undefined}
                        className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold" style={{ background: c.accent, color: c.ink }}>
                        {isAudioLoading ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isAudioLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button type="button" onClick={() => { hardStop(); setSentenceIdx(0); setSweepPct(0); setIsPlaying(false); }}
                        className="px-3 py-1 rounded text-xs" style={{ background: c.dim + '33', color: c.ink }} aria-label={t("a11y.restart_first_sentence")}>
                        ↺ Restart
                    </button>
                    <button type="button" onClick={copyDiagnostics}
                        className="px-3 py-1 rounded text-xs" style={{ background: c.dim + '33', color: c.ink }}
                        aria-label="Copy read-aloud diagnostics to clipboard"
                        title="Copies a technical trace of the last read-aloud attempts — paste it into a bug report if audio gets stuck.">
                        {diagnosticsCopied ? '✓ Copied' : '🩺 Diagnostics'}
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto px-6 md:px-16 py-10" style={{ scrollBehavior: reducedMotion ? 'auto' : 'smooth' }}>
                <div className="max-w-3xl mx-auto" style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.25rem)', lineHeight: 1.7, fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif' }}>
                    {sentences.map((s, i) => (
                        <React.Fragment key={i}>{renderSentence(s, i)}{' '}</React.Fragment>
                    ))}
                </div>
            </div>
            <div className="h-2 w-full" role="progressbar" aria-valuenow={Math.round(overallPct)} aria-valuemin={0} aria-valuemax={100} aria-label={t("a11y.reading_progress")} style={{ background: c.dim + '33' }}>
                <div className="h-full" style={{ width: overallPct + '%', backgroundColor: c.sweep, transition: reducedMotion ? 'none' : 'width 0.2s linear' }} />
            </div>
            <div className="px-4 py-2 text-center text-xs" style={{ color: c.dim }}>
                Space play/pause · ← → sentences · Home/End jump · click any sentence to jump · Esc closes
            </div>
        </div>
    );
});

window.AlloModules = window.AlloModules || {};
window.AlloModules.FocusReaderOverlay = FocusReaderOverlay;
// Back-compat aliases — old consumers resolve to the unified overlay.
window.AlloModules.SpeedReaderOverlay = FocusReaderOverlay;
window.AlloModules.BionicChunkReader = FocusReaderOverlay;
window.AlloModules.PerspectiveCrawlOverlay = PerspectiveCrawlOverlay;
window.AlloModules.KaraokeReaderOverlay = KaraokeReaderOverlay;
window.AlloModules.ImmersiveToolbar = ImmersiveToolbar;
window.AlloModules.ImmersiveReaderModule = true;
console.log('[ImmersiveReaderModule] Focus + Crawl + Karaoke + Toolbar registered');

// ─── ImmersiveWord (merged from AlloFlowANTI.txt 2026-04-21) ─────────────
// Atomic word unit for immersive reading — POS highlights (noun/verb/adj/adv),
// syllables-on-demand, click handler. Pure props-driven React.memo.
const ImmersiveWord = React.memo(({ wordData, settings, onClick, isActive }) => {
    const { t } = useContext(LanguageContext);
    const isSyllableMode = settings.showSyllables && wordData.pos !== 'markdown' && wordData.pos !== 'newline';
    const isPosHighlighted = (wordData.pos === 'noun' && settings.showNouns) ||
                             (wordData.pos === 'verb' && settings.showVerbs) ||
                             (wordData.pos === 'adj' && settings.showAdjectives) ||
                             (wordData.pos === 'adv' && settings.showAdverbs);
    const getPosLabel = (posCode) => {
        return t(`immersive.pos.${posCode}`) || posCode;
    };
    let content = wordData.text;
    if (isSyllableMode) {
        const syllables = wordData.syllables || [wordData.text];
        if (syllables.length > 1) {
            content = syllables.map((syl, idx) => (
                <span key={idx}>
                    <span className={!isPosHighlighted && idx % 2 !== 0 ? "text-rose-600" : ""}>{syl}</span>
                    {idx < syllables.length - 1 && (
                        <span className={`font-black mx-[2px] ${isPosHighlighted ? 'opacity-60' : 'text-slate-600'}`}>·</span>
                    )}
                </span>
            ));
        }
    }
    let className = "inline-block transition-all duration-200 cursor-pointer ";
    if (isActive) {
        className += "font-semibold ";
    } else {
        if (wordData.pos === 'noun' && settings.showNouns) {
            className += "bg-blue-100 text-blue-900 rounded px-1 mx-0.5 border-b-2 border-blue-400 font-bold ";
        } else if (wordData.pos === 'verb' && settings.showVerbs) {
            className += "bg-red-100 text-red-900 rounded px-1 mx-0.5 border-b-2 border-red-400 font-bold ";
        } else if (wordData.pos === 'adj' && settings.showAdjectives) {
            className += "bg-green-100 text-green-900 rounded px-1 mx-0.5 border-b-2 border-green-400 font-bold ";
        } else if (wordData.pos === 'adv' && settings.showAdverbs) {
            className += "bg-purple-100 text-purple-900 rounded px-1 mx-0.5 border-b-2 border-purple-400 font-bold ";
        }
    }
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
        }
    };
    if (wordData.pos === 'markdown') {
        return null;
    }
    const headerMatch = wordData.pos?.match?.(/^header(\d)$/);
    const isHeader = !!headerMatch;
    if (headerMatch) {
        const level = parseInt(headerMatch[1]);
        const headerSizes = {
            1: 'text-3xl font-bold',
            2: 'text-2xl font-bold',
            3: 'text-xl font-bold',
            4: 'text-lg font-semibold',
            5: 'text-base font-semibold',
            6: 'text-base font-semibold italic',
        };
        const sizeClass = headerSizes[level] || 'font-bold';
        className += ` ${sizeClass} text-slate-800 block mt-4 mb-2 `;
    }
    if (wordData.pos === 'bold') {
        className += ' font-bold ';
    }
    if (wordData.pos === 'italic') {
        className += ' italic ';
    }
    return (
        <span
            onClick={onClick}
            title={isPosHighlighted ? getPosLabel(wordData.pos) : null}
            className={className}
            style={{
                fontSize: isHeader ? `${settings.textSize * 1.15}px` : `${settings.textSize}px`,
                lineHeight: settings.lineHeight,
                whiteSpace: 'pre-wrap',
            }}
        >
            {content}
        </span>
    );
});
