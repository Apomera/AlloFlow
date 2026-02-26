"""
Build a Chunked Reader feature for the Immersive Reader.

Concept: A focused reading mode that shows text sentence-by-sentence (or in small chunks)
with auto-advance timer and manual controls. Highlights the current sentence in the immersive
reader text and dims others.

Implementation:
1. Add a "Chunk Read" toggle button to the ImmersiveToolbar
2. Add state: isChunkReaderActive, chunkReaderIdx
3. When active: highlight the current sentence, dim others, show navigation controls
4. Auto-advance with configurable timer
5. Manual prev/next/pause controls

This uses the existing sentence infrastructure:
- splitTextToSentences() already exists
- The immersive reader already assigns sentenceIdx to each word (line 62294)
- playbackState.currentIdx already triggers scroll (line 35189)
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Add state variables for chunk reader
old_state = "  const [isSpeedReaderActive, setIsSpeedReaderActive] = useState(false);"
new_state = """  const [isSpeedReaderActive, setIsSpeedReaderActive] = useState(false);
  const [isChunkReaderActive, setIsChunkReaderActive] = useState(false);
  const [chunkReaderIdx, setChunkReaderIdx] = useState(0);
  const [chunkReaderAutoPlay, setChunkReaderAutoPlay] = useState(false);
  const [chunkReaderSpeed, setChunkReaderSpeed] = useState(3000);
  const chunkReaderTimerRef = useRef(null);"""

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    fixes += 1
    print("1. Added chunk reader state variables")
else:
    print("1. SKIP: state pattern not found")

# 2. Add the handleCloseSpeedReader companion for chunk reader
old_close = "  const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);"
new_close = """  const handleCloseSpeedReader = useCallback(() => setIsSpeedReaderActive(false), []);
  const handleCloseChunkReader = useCallback(() => {
      setIsChunkReaderActive(false);
      setChunkReaderAutoPlay(false);
      setChunkReaderIdx(0);
      if (chunkReaderTimerRef.current) clearTimeout(chunkReaderTimerRef.current);
  }, []);"""

if old_close in content:
    content = content.replace(old_close, new_close, 1)
    fixes += 1
    print("2. Added chunk reader close handler")
else:
    print("2. SKIP: close handler pattern not found")

# 3. Update ImmersiveToolbar props
old_toolbar_props = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader }) => {"
new_toolbar_props = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader, isChunkReaderActive, onToggleChunkReader, chunkReaderIdx, setChunkReaderIdx, chunkReaderAutoPlay, setChunkReaderAutoPlay, chunkReaderSpeed, setChunkReaderSpeed, totalSentences }) => {"

if old_toolbar_props in content:
    content = content.replace(old_toolbar_props, new_toolbar_props, 1)
    fixes += 1
    print("3. Updated ImmersiveToolbar props for chunk reader")
else:
    print("3. SKIP: toolbar props not found")

# 4. Add Chunk Reader button and controls after Speed Read button in toolbar
old_speed_btn = """              <Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
        </div>"""

new_speed_btn = """              <Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
            <ToggleButton
              active={isChunkReaderActive}
              onClick={onToggleChunkReader}
              title={t('immersive.chunk_read')}
              activeColor="bg-emerald-500 text-white"
              data-help-key="immersive_chunk_reader"
            >
              <AlignLeft size={14} className="mr-1 inline"/> {t('immersive.chunk_read')}
            </ToggleButton>
        </div>
        {isChunkReaderActive && (
          <>
          <div className="h-4 w-px bg-slate-300 shrink-0"></div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setChunkReaderIdx(Math.max(0, chunkReaderIdx - 1))} disabled={chunkReaderIdx <= 0} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all" title={t('common.previous')}><ChevronLeft size={14}/></button>
            <span className="text-xs font-bold text-slate-600 tabular-nums min-w-[3rem] text-center">{chunkReaderIdx + 1} / {totalSentences}</span>
            <button onClick={() => setChunkReaderIdx(Math.min(totalSentences - 1, chunkReaderIdx + 1))} disabled={chunkReaderIdx >= totalSentences - 1} className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all" title={t('common.next')}><ChevronRight size={14}/></button>
            <div className="h-4 w-px bg-slate-200"></div>
            <button onClick={() => setChunkReaderAutoPlay(!chunkReaderAutoPlay)} className={`px-2 py-1 text-xs font-bold rounded-full transition-all ${chunkReaderAutoPlay ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title={chunkReaderAutoPlay ? t('common.pause') : t('common.auto_play')}>
              {chunkReaderAutoPlay ? <Pause size={12} className="inline"/> : <Play size={12} className="inline"/>}
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">1s</span>
              <input type="range" min="1000" max="8000" step="500" value={chunkReaderSpeed} onChange={(e) => setChunkReaderSpeed(parseInt(e.target.value))} className="w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" title={`${(chunkReaderSpeed/1000).toFixed(1)}s`} aria-label={t('immersive.speed')}/>
              <span className="text-[10px] text-slate-500 tabular-nums">{(chunkReaderSpeed/1000).toFixed(1)}s</span>
            </div>
          </div>
          </>
        )}"""

if old_speed_btn in content:
    content = content.replace(old_speed_btn, new_speed_btn, 1)
    fixes += 1
    print("4. Added Chunk Reader button and controls to toolbar")
else:
    print("4. SKIP: Speed Read button pattern not found")

# 5. Pass chunk reader props to ImmersiveToolbar render site
old_render_props = """                                isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                            />"""

# We need to compute totalSentences before render. Let me pass it inline
new_render_props = """                                isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                                isChunkReaderActive={isChunkReaderActive}
                                onToggleChunkReader={() => { setIsChunkReaderActive(!isChunkReaderActive); setChunkReaderIdx(0); setChunkReaderAutoPlay(false); }}
                                chunkReaderIdx={chunkReaderIdx}
                                setChunkReaderIdx={setChunkReaderIdx}
                                chunkReaderAutoPlay={chunkReaderAutoPlay}
                                setChunkReaderAutoPlay={setChunkReaderAutoPlay}
                                chunkReaderSpeed={chunkReaderSpeed}
                                setChunkReaderSpeed={setChunkReaderSpeed}
                                totalSentences={(() => { const sbs = getSideBySideContent(generatedContent?.data); const ps = sbs ? [...(sbs.source || []), ...(sbs.target || [])] : (generatedContent?.data || '').split(/\n{2,}/); return ps.flatMap(p => p.trim().startsWith('|') ? [] : splitTextToSentences(p)).length || 1; })()}
                            />"""

if old_render_props in content:
    content = content.replace(old_render_props, new_render_props, 1)
    fixes += 1
    print("5. Passed chunk reader props to ImmersiveToolbar render")
else:
    print("5. SKIP: render props pattern not found")

# 6. Modify the ImmersiveWord rendering to dim non-active sentences when chunk reader is active
# The word rendering already has assignedIdx (line 62294). We need to add an opacity modifier.
# Find where the ImmersiveWord component is rendered
old_word_render = """return <ImmersiveWord key={wordData.id || i} wordData={wordData} settings={immersiveSettings} isActive={assignedIdx === playbackState.currentIdx}"""

# Check if this exists
if old_word_render in content:
    new_word_render = old_word_render.replace(
        "isActive={assignedIdx === playbackState.currentIdx}",
        "isActive={assignedIdx === playbackState.currentIdx || (isChunkReaderActive && assignedIdx === chunkReaderIdx)}"
    )
    content = content.replace(old_word_render, new_word_render, 1)
    fixes += 1
    print("6. Updated ImmersiveWord isActive for chunk reader")
else:
    print("6. SKIP: ImmersiveWord render pattern not found, searching...")
    # Try to find it
    idx = content.find('ImmersiveWord key={wordData.id')
    if idx > 0:
        snippet = content[idx:idx+300]
        print(f"   Found at: {snippet[:150]}")

# 7. Add auto-advance useEffect for chunk reader
# We need an effect that auto-advances chunkReaderIdx when autoPlay is on
# Insert after the existing handleCloseChunkReader
old_chunk_close = """  const handleCloseChunkReader = useCallback(() => {
      setIsChunkReaderActive(false);
      setChunkReaderAutoPlay(false);
      setChunkReaderIdx(0);
      if (chunkReaderTimerRef.current) clearTimeout(chunkReaderTimerRef.current);
  }, []);"""

new_chunk_close = """  const handleCloseChunkReader = useCallback(() => {
      setIsChunkReaderActive(false);
      setChunkReaderAutoPlay(false);
      setChunkReaderIdx(0);
      if (chunkReaderTimerRef.current) clearTimeout(chunkReaderTimerRef.current);
  }, []);
  useEffect(() => {
      if (!isChunkReaderActive || !chunkReaderAutoPlay) {
          if (chunkReaderTimerRef.current) clearTimeout(chunkReaderTimerRef.current);
          return;
      }
      chunkReaderTimerRef.current = setTimeout(() => {
          setChunkReaderIdx(prev => {
              if (prev >= 999) { setChunkReaderAutoPlay(false); return prev; }
              return prev + 1;
          });
      }, chunkReaderSpeed);
      return () => { if (chunkReaderTimerRef.current) clearTimeout(chunkReaderTimerRef.current); };
  }, [isChunkReaderActive, chunkReaderAutoPlay, chunkReaderIdx, chunkReaderSpeed]);
  useEffect(() => {
      if (isChunkReaderActive && chunkReaderIdx >= 0) {
          const el = document.querySelector('[data-sentence-idx="' + chunkReaderIdx + '"]');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [chunkReaderIdx, isChunkReaderActive]);"""

if old_chunk_close in content:
    content = content.replace(old_chunk_close, new_chunk_close, 1)
    fixes += 1
    print("7. Added auto-advance useEffect for chunk reader")
else:
    print("7. SKIP: chunk close pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} changes")
