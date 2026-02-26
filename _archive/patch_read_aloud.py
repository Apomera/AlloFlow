"""
Restore the missing Read Aloud button and speed slider in ImmersiveToolbar.
The infrastructure (playbackRate, setPlaybackRate, playbackState) already exists.

Need to add:
1. A Read Aloud / Play button alongside the Speed Read button  
2. A playback rate slider

The toolbar already passes: playbackRate, setPlaybackRate, isSpeedReaderActive, onToggleSpeedReader
But it also needs: isPlaying, isPaused, onSpeak, onStop (for read-aloud controls)

Plan:
- Add isPlaying, isPaused, onSpeak, onStopPlayback to ImmersiveToolbar props
- Add the UI controls next to the Speed Read button
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Update ImmersiveToolbar props to include playback controls
old_props = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader }) => {"
new_props = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader, isPlaying, isPaused, onSpeak, onStopPlayback, onTogglePause }) => {"

if old_props in content:
    content = content.replace(old_props, new_props, 1)
    fixes += 1
    print("1. Updated ImmersiveToolbar props")
else:
    print("1. SKIP: props pattern not found")

# 2. Add Read Aloud button and speed slider after the Speed Read button
old_speed_read = """              <Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
        </div>"""

new_speed_read = """              <Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
            <ToggleButton
              active={isPlaying}
              onClick={isPlaying ? onStopPlayback : onSpeak}
              title={isPlaying ? t('common.stop') : t('common.read_aloud')}
              activeColor="bg-emerald-500 text-white"
            >
              {isPlaying ? <Square size={14} className="mr-1 inline"/> : <Play size={14} className="mr-1 inline"/>}
              {isPlaying ? t('common.stop') : t('common.read_aloud')}
            </ToggleButton>
            {isPlaying && (
              <button
                onClick={onTogglePause}
                title={isPaused ? t('common.resume') : t('common.pause')}
                className={`px-2.5 py-1 text-xs font-bold rounded-full transition-all ${isPaused ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {isPaused ? <Play size={14} className="inline"/> : <Pause size={14} className="inline"/>}
              </button>
            )}
        </div>
        {/* Playback Speed */}
        <div className="h-4 w-px bg-slate-300 shrink-0"></div>
        <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-700">{t('immersive.speed')}</label>
            <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-500">0.5x</span>
                <input aria-label={t('common.adjust_settings')}
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    title={`${playbackRate}x`}
                />
                <span className="text-[10px] font-bold text-slate-700">{playbackRate}x</span>
            </div>
        </div>"""

if old_speed_read in content:
    content = content.replace(old_speed_read, new_speed_read, 1)
    fixes += 1
    print("2. Added Read Aloud button and speed slider")
else:
    print("2. SKIP: Speed Read button pattern not found")

# 3. Pass the new props where ImmersiveToolbar is rendered (~line 62223)
old_render = """<ImmersiveToolbar
                                settings={immersiveSettings}
                                setSettings={setImmersiveSettings}
                                onClose={handleCloseImmersiveReader}
                                playbackRate={playbackRate}
                                setPlaybackRate={setPlaybackRate}
                                lineHeight={lineHeight}
                                setLineHeight={setLineHeight}
                                letterSpacing={letterSpacing}
                                setLetterSpacing={setLetterSpacing}
                                isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                            />"""

new_render = """<ImmersiveToolbar
                                settings={immersiveSettings}
                                setSettings={setImmersiveSettings}
                                onClose={handleCloseImmersiveReader}
                                playbackRate={playbackRate}
                                setPlaybackRate={setPlaybackRate}
                                lineHeight={lineHeight}
                                setLineHeight={setLineHeight}
                                letterSpacing={letterSpacing}
                                setLetterSpacing={setLetterSpacing}
                                isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                                isPlaying={isPlaying}
                                isPaused={isPaused}
                                onSpeak={() => handleSpeak(generatedContent?.data, 'simplified-main')}
                                onStopPlayback={stopPlayback}
                                onTogglePause={togglePause}
                            />"""

if old_render in content:
    content = content.replace(old_render, new_render, 1)
    fixes += 1
    print("3. Passed new props to ImmersiveToolbar render")
else:
    print("3. SKIP: ImmersiveToolbar render pattern not found")

if fixes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nApplied {fixes}/{3} fixes")
else:
    print("\nNo fixes applied")
