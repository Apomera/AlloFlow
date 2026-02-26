"""
add_chunk_reader.py — Add a Chunked Reading Mode to the immersive reader.
Shows text in syntactic phrase groups with auto-advance timer and full user control.
"""
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"

CHUNK_READER_COMPONENT = r"""
const ChunkedReaderOverlay = React.memo(({ text, onClose, isOpen }) => {
    const { t } = useContext(LanguageContext);
    const [chunks, setChunks] = React.useState([]);
    const [currentChunkIndex, setCurrentChunkIndex] = React.useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = React.useState(false);
    const [chunkInterval, setChunkInterval] = React.useState(3);
    const [visibilityMode, setVisibilityMode] = React.useState('reveal');
    const [showControls, setShowControls] = React.useState(true);
    const timerRef = React.useRef(null);

    const PREPOSITIONS = new Set(['in','on','at','with','for','to','by','from','of','about','into','through','during','before','after','above','below','between','under','over','upon','within','without','toward','towards','against','among','until','along','across','behind','beside','beyond','around','throughout','inside','outside','beneath','despite','except','unlike','regarding','concerning']);
    const CONJUNCTIONS = new Set(['and','but','or','so','yet','because','although','though','while','whereas','since','unless','if','when','where','who','which','that','however','therefore','moreover','furthermore','meanwhile','otherwise','instead','nevertheless','nonetheless']);

    React.useEffect(() => {
        if (!text) return;
        const cleaned = String(text || '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const words = cleaned.split(' ').filter(w => w.length > 0);
        if (words.length === 0) { setChunks([]); return; }

        const result = [];
        let current = [];

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const lower = word.toLowerCase().replace(/[^a-z]/g, '');
            const prevEndsWithPunct = current.length > 0 && /[,.:;!?]$/.test(current[current.length - 1]);

            if (current.length >= 7 || (current.length >= 2 && prevEndsWithPunct) || (current.length >= 3 && (PREPOSITIONS.has(lower) || CONJUNCTIONS.has(lower)))) {
                result.push(current.join(' '));
                current = [word];
            } else {
                current.push(word);
            }
        }
        if (current.length > 0) result.push(current.join(' '));

        setChunks(result);
        setCurrentChunkIndex(0);
    }, [text]);

    React.useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (isAutoPlaying && currentChunkIndex < chunks.length - 1) {
            timerRef.current = setInterval(() => {
                setCurrentChunkIndex(prev => {
                    if (prev >= chunks.length - 1) {
                        setIsAutoPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, chunkInterval * 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isAutoPlaying, chunkInterval, chunks.length, currentChunkIndex]);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            if (e.code === 'Space') { e.preventDefault(); setIsAutoPlaying(p => !p); }
            else if (e.code === 'ArrowRight') { setCurrentChunkIndex(p => Math.min(chunks.length - 1, p + 1)); }
            else if (e.code === 'ArrowLeft') { setCurrentChunkIndex(p => Math.max(0, p - 1)); }
            else if (e.code === 'ArrowUp') { e.preventDefault(); setChunkInterval(p => Math.max(1, p - 0.5)); }
            else if (e.code === 'ArrowDown') { e.preventDefault(); setChunkInterval(p => Math.min(10, p + 0.5)); }
            else if (e.key === 'Escape') { onClose(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, chunks.length]);

    if (!isOpen || chunks.length === 0) return null;

    const isChunkVisible = (idx) => {
        if (visibilityMode === 'focus') return idx === currentChunkIndex;
        if (visibilityMode === 'trail') return idx >= currentChunkIndex - 2 && idx <= currentChunkIndex;
        return idx <= currentChunkIndex;
    };

    const getChunkOpacity = (idx) => {
        if (idx === currentChunkIndex) return 1;
        if (!isChunkVisible(idx)) return 0;
        if (visibilityMode === 'reveal') return 0.25;
        if (visibilityMode === 'trail') return idx === currentChunkIndex - 1 ? 0.5 : 0.25;
        return 0;
    };

    const visibilityModes = [
        { key: 'reveal', label: '👁️ Reveal', desc: 'Previous chunks stay visible' },
        { key: 'focus', label: '🎯 Focus', desc: 'Only current chunk' },
        { key: 'trail', label: '📜 Trail', desc: 'Current + last 2' }
    ];

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950 text-white flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div
                className={`p-4 flex justify-between items-center transition-opacity duration-300 border-b border-slate-800 ${showControls || !isAutoPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
            >
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg text-amber-400">📖 Chunk Reader</span>
                        <span className="text-xs text-slate-500">{currentChunkIndex + 1} / {chunks.length} chunks</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {/* Visibility Mode */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">VIEW</span>
                        <div className="flex gap-1">
                            {visibilityModes.map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => setVisibilityMode(m.key)}
                                    title={m.desc}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${visibilityMode === m.key ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Speed Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">PACE</span>
                        <input
                            aria-label="Chunk speed"
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={chunkInterval}
                            onChange={(e) => setChunkInterval(Number(e.target.value))}
                            className="w-24 accent-amber-500"
                        />
                        <span className="font-mono font-bold text-sm text-amber-400 w-10 text-right">{chunkInterval}s</span>
                    </div>
                </div>
            </div>

            {/* Main chunk display */}
            <div
                className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-8 cursor-pointer select-none"
                onClick={() => {
                    if (currentChunkIndex < chunks.length - 1) {
                        setCurrentChunkIndex(p => p + 1);
                    } else {
                        setIsAutoPlaying(false);
                    }
                }}
            >
                <div className="max-w-3xl w-full space-y-4">
                    {chunks.map((chunk, idx) => {
                        const visible = isChunkVisible(idx);
                        const opacity = getChunkOpacity(idx);
                        const isCurrent = idx === currentChunkIndex;
                        return (
                            <div
                                key={idx}
                                className="transition-all duration-500 ease-out"
                                style={{
                                    opacity,
                                    transform: isCurrent ? 'scale(1.05)' : 'scale(1)',
                                    display: visible || visibilityMode === 'reveal' ? 'block' : 'none',
                                    cursor: 'pointer'
                                }}
                                onClick={(e) => { e.stopPropagation(); setCurrentChunkIndex(idx); }}
                            >
                                <p
                                    className={`text-2xl md:text-4xl font-serif leading-relaxed transition-colors duration-300 ${isCurrent ? 'text-white' : 'text-slate-600'}`}
                                    style={{
                                        borderLeft: isCurrent ? '4px solid #f59e0b' : '4px solid transparent',
                                        paddingLeft: '16px',
                                        marginLeft: '-20px'
                                    }}
                                >
                                    {chunk}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Tap hint */}
                <div className="mt-12 text-slate-500 animate-pulse text-sm">
                    {isAutoPlaying ? (
                        <span className="flex items-center gap-2"><Pause size={16}/> Tap to advance · Space to pause</span>
                    ) : currentChunkIndex >= chunks.length - 1 ? (
                        <span className="flex items-center gap-2">✅ Complete! Press ← to rewind</span>
                    ) : (
                        <span className="flex items-center gap-2"><Play size={16}/> Tap to advance · Space for auto-play</span>
                    )}
                </div>
            </div>

            {/* Navigation controls */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-4 justify-center">
                <button
                    onClick={() => setCurrentChunkIndex(p => Math.max(0, p - 1))}
                    disabled={currentChunkIndex === 0}
                    className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 transition-all"
                    title="Previous chunk (←)"
                >
                    <ChevronLeft size={20}/>
                </button>
                <button
                    onClick={() => setIsAutoPlaying(p => !p)}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${isAutoPlaying ? 'bg-amber-500 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'}`}
                >
                    {isAutoPlaying ? '⏸ Pause' : '▶ Auto-Play'}
                </button>
                <button
                    onClick={() => setCurrentChunkIndex(p => Math.min(chunks.length - 1, p + 1))}
                    disabled={currentChunkIndex >= chunks.length - 1}
                    className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 transition-all"
                    title="Next chunk (→)"
                >
                    <ChevronRight size={20}/>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-slate-900 w-full">
                <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300 ease-out"
                    style={{ width: `${((currentChunkIndex + 1) / chunks.length) * 100}%` }}
                />
            </div>
        </div>
    );
});
"""

def main():
    content = SRC.read_text(encoding='utf-8')
    changes = 0

    # 1. Add isChunkReaderActive state after isSpeedReaderActive
    old_state = "const [isSpeedReaderActive, setIsSpeedReaderActive] = useState(false);"
    new_state = "const [isSpeedReaderActive, setIsSpeedReaderActive] = useState(false);\n  const [isChunkReaderActive, setIsChunkReaderActive] = useState(false);"
    if old_state in content and 'isChunkReaderActive' not in content:
        content = content.replace(old_state, new_state, 1)
        changes += 1
        print("✅ 1. Added isChunkReaderActive state variable")
    elif 'isChunkReaderActive' in content:
        print("ℹ️ 1. State already exists")
    else:
        print("❌ 1. Could not find state anchor")
        return

    # 2. Add handleCloseChunkReader callback after handleCloseSpeedReader
    old_close = "const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);"
    new_close = "const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);\n  const handleCloseChunkReader = useCallback(() => setIsChunkReaderActive(false), []);"
    if old_close in content and 'handleCloseChunkReader' not in content:
        content = content.replace(old_close, new_close, 1)
        changes += 1
        print("✅ 2. Added handleCloseChunkReader callback")
    elif 'handleCloseChunkReader' in content:
        print("ℹ️ 2. Close handler already exists")
    else:
        print("❌ 2. Could not find close handler anchor")
        return

    # 3. Add ChunkedReaderOverlay component after SpeedReaderOverlay (ends with });)
    # Find the exact end: after the closing }); of SpeedReaderOverlay
    anchor3 = "});\nconst ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader }) => {"
    if anchor3 in content and 'ChunkedReaderOverlay' not in content:
        new_anchor3 = "});" + CHUNK_READER_COMPONENT + "\nconst ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader, isChunkReaderActive, onToggleChunkReader }) => {"
        content = content.replace(anchor3, new_anchor3, 1)
        changes += 1
        print("✅ 3. Added ChunkedReaderOverlay component + updated ImmersiveToolbar props")
    elif 'ChunkedReaderOverlay' in content:
        print("ℹ️ 3. Component already exists")
    else:
        print("❌ 3. Could not find component insertion anchor")
        return

    # 4. Add Chunk Read toggle button after Speed Read toggle in toolbar
    old_toggle = """<Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        {/* Grammar Highlighting */}"""
    new_toggle = """<Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
            <ToggleButton
              active={isChunkReaderActive}
              onClick={onToggleChunkReader}
              title="Chunked reading — phrase-by-phrase with auto-advance and rewind"
              activeColor="bg-amber-500 text-white"
            >
              📖 Chunk Read
            </ToggleButton>
        </div>
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        {/* Grammar Highlighting */}"""
    if old_toggle in content:
        content = content.replace(old_toggle, new_toggle, 1)
        changes += 1
        print("✅ 4. Added Chunk Read toggle button in toolbar")
    else:
        print("❌ 4. Could not find toolbar toggle anchor")
        return

    # 5. Add chunk reader props to ImmersiveToolbar render call and mount the overlay
    old_render = """isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                            /><ErrorBoundary fallbackMessage="Speed reader encountered an error. Please close and reopen.">

                            <SpeedReaderOverlay
                                isOpen={isSpeedReaderActive}
                                onClose={handleCloseSpeedReader}
                                text={
                                    (generatedContent?.immersiveData
                                        ?.filter(w => w.pos !== 'newline')
                                        ?.map(w => w.text)
                                        ?.join(' ') || "")
                                        .replace(/<[^>]*>/g, '')
                                }
                            />
                            </ErrorBoundary>"""
    
    new_render = """isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => { setIsSpeedReaderActive(!isSpeedReaderActive); setIsChunkReaderActive(false); }}
                                isChunkReaderActive={isChunkReaderActive}
                                onToggleChunkReader={() => { setIsChunkReaderActive(!isChunkReaderActive); setIsSpeedReaderActive(false); }}
                            /><ErrorBoundary fallbackMessage="Speed reader encountered an error. Please close and reopen.">

                            <SpeedReaderOverlay
                                isOpen={isSpeedReaderActive}
                                onClose={handleCloseSpeedReader}
                                text={
                                    (generatedContent?.immersiveData
                                        ?.filter(w => w.pos !== 'newline')
                                        ?.map(w => w.text)
                                        ?.join(' ') || "")
                                        .replace(/<[^>]*>/g, '')
                                }
                            />
                            </ErrorBoundary>
                            <ErrorBoundary fallbackMessage="Chunk reader encountered an error. Please close and reopen.">
                            <ChunkedReaderOverlay
                                isOpen={isChunkReaderActive}
                                onClose={handleCloseChunkReader}
                                text={
                                    (generatedContent?.immersiveData
                                        ?.filter(w => w.pos !== 'newline')
                                        ?.map(w => w.text)
                                        ?.join(' ') || "")
                                        .replace(/<[^>]*>/g, '')
                                }
                            />
                            </ErrorBoundary>"""
    
    if old_render in content:
        content = content.replace(old_render, new_render, 1)
        changes += 1
        print("✅ 5. Mounted ChunkedReaderOverlay + added mutual exclusion")
    else:
        print("❌ 5. Could not find render mount anchor")
        return

    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Done! {changes} changes applied.")

if __name__ == "__main__":
    main()
