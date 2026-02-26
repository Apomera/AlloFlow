"""
1. Revert the Read Aloud additions to ImmersiveToolbar
2. Fix parseTaggedContent to handle malformed/unclosed POS tags
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# ===== REVERT 1: Restore original ImmersiveToolbar props =====
old_props = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader, isPlaying, isPaused, onSpeak, onStopPlayback, onTogglePause }) => {"
new_props = "const ImmersiveToolbar = React.memo(({ settings, setSettings, onClose, playbackRate, setPlaybackRate, lineHeight, setLineHeight, letterSpacing, setLetterSpacing , isSpeedReaderActive, onToggleSpeedReader }) => {"

if old_props in content:
    content = content.replace(old_props, new_props, 1)
    fixes += 1
    print("REVERT 1: Restored original ImmersiveToolbar props")
else:
    print("REVERT 1: SKIP - props already original or pattern not found")

# ===== REVERT 2: Remove the Read Aloud button, Pause button, and Speed slider =====
# This was added after the Speed Read button
old_block = """              <Zap size={14} className="mr-1 inline"/> Speed Read
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

new_block = """              <Zap size={14} className="mr-1 inline"/> Speed Read
            </ToggleButton>
        </div>"""

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    fixes += 1
    print("REVERT 2: Removed Read Aloud button, Pause, and Speed slider")
else:
    print("REVERT 2: SKIP - block not found")

# ===== REVERT 3: Remove extra props from ImmersiveToolbar render site =====
old_render = """                                isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                                isPlaying={isPlaying}
                                isPaused={isPaused}
                                onSpeak={() => handleSpeak(generatedContent?.data, 'simplified-main')}
                                onStopPlayback={stopPlayback}
                                onTogglePause={togglePause}
                            />"""

new_render = """                                isSpeedReaderActive={isSpeedReaderActive}
                                onToggleSpeedReader={() => setIsSpeedReaderActive(!isSpeedReaderActive)}
                            />"""

if old_render in content:
    content = content.replace(old_render, new_render, 1)
    fixes += 1
    print("REVERT 3: Removed extra props from ImmersiveToolbar render")
else:
    print("REVERT 3: SKIP - render props not found")

# ===== FIX 4: Fix parseTaggedContent to handle malformed POS tags =====
# The regex: /(<[nvadbi]>.*?<\/[nvadbi]>)/g only matches PROPERLY closed tags
# If Gemini returns <n>word without </n>, the raw <n> stays in text
# Fix: Add a cleanup step BEFORE the regex split to fix unclosed tags

old_parse = """const parseTaggedContent = (text) => {
    if (!text) return [];"""

new_parse = """const parseTaggedContent = (text) => {
    if (!text) return [];
    // Fix malformed POS tags from Gemini: <n>word without closing </n>
    // Strategy: find orphaned opening tags and close them at the next word boundary
    text = text.replace(/<([nvad])>([^<]*?)(?=<[nvad]>|<\/|\\n|$)/g, (match, tag, content) => {
        // If content doesn't end with a closing tag, wrap it
        if (!match.includes('</' + tag + '>')) {
            return '<' + tag + '>' + content.trim() + '</' + tag + '>';
        }
        return match;
    });
    // Also strip any completely orphaned opening tags with no content
    text = text.replace(/<[nvad]>\\s*(?=<[nvad]>)/g, '');
    // Strip orphaned closing tags
    text = text.replace(/<\\/[nvad]>(?!\\s|[.,!?;:\\)]|$)/g, '');"""

if old_parse in content:
    content = content.replace(old_parse, new_parse, 1)
    fixes += 1
    print("FIX 4: Added malformed POS tag cleanup to parseTaggedContent")
else:
    print("FIX 4: SKIP - parseTaggedContent pattern not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} changes")
