"""
Fix Word Families:
1. Add auto-play of all word options when activity loads (so users hear them before picking)
2. Add individual speaker buttons next to each option for replaying
3. Respect sound-only toggle (showWordText) - hide text when sound-only mode is on
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Pass showWordText to WordFamiliesView in the caller (L11186)
old_caller = """<WordFamiliesView
                        key={`wf-${targetWord}`}
                        data={{
                            family: `-${targetRime} family`,
                            mode: 'rime',
                            difficulty: rimeDifficulty,
                            targetChar: targetRime,
                            targetWord: targetWord,
                            options: selectedMembers,
                            distractors: selectedDistractors
                        }}
                        isEditing={isEditing}
                        onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null, currentWordSoundsWord)}
                        onPlayAudio={(w) => handleAudio(w)}
                        onUpdateOption={handleOptionUpdate}
                        showLetterHints={showLetterHints}
                    />"""

new_caller = """<WordFamiliesView
                        key={`wf-${targetWord}`}
                        data={{
                            family: `-${targetRime} family`,
                            mode: 'rime',
                            difficulty: rimeDifficulty,
                            targetChar: targetRime,
                            targetWord: targetWord,
                            options: selectedMembers,
                            distractors: selectedDistractors
                        }}
                        isEditing={isEditing}
                        onCheckAnswer={(result) => checkAnswer(result === 'correct' ? currentWordSoundsWord : null, currentWordSoundsWord)}
                        onPlayAudio={(w) => handleAudio(w)}
                        onUpdateOption={handleOptionUpdate}
                        showLetterHints={showLetterHints}
                        soundOnlyMode={!showWordText}
                    />"""

if old_caller in content:
    content = content.replace(old_caller, new_caller, 1)
    print("1. Added soundOnlyMode prop to WordFamiliesView caller")
else:
    print("[WARN] Caller pattern not found")

# 2. Update component signature to accept soundOnlyMode
old_sig = "const WordFamiliesView = React.useMemo(() => ({ data, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, showLetterHints }) => {"
new_sig = "const WordFamiliesView = React.useMemo(() => ({ data, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, showLetterHints, soundOnlyMode }) => {"

if old_sig in content:
    content = content.replace(old_sig, new_sig, 1)
    print("2. Added soundOnlyMode to component signature")
else:
    print("[WARN] Signature pattern not found")

# 3. Add auto-play effect for options when wordBank populates
old_effect_end = """                    setFoundWords([]);
                    setIsComplete(false);
                }
            }
        }, [data.options, data.distractors]); // Ref-based guard inside handles stability"""

new_effect_end = """                    setFoundWords([]);
                    setIsComplete(false);
                    // AUTO-PLAY: Read all options aloud so user hears them before picking
                    const playAllOptions = async () => {
                        await new Promise(r => setTimeout(r, 500)); // Brief pause for UI to settle
                        for (const item of mixed_shuffled) {
                            if (!isMountedRef.current) break;
                            try { await onPlayAudio(item.text); } catch(e) {}
                            await new Promise(r => setTimeout(r, 300));
                        }
                    };
                    playAllOptions();
                }
            }
        }, [data.options, data.distractors]); // Ref-based guard inside handles stability"""

if old_effect_end in content:
    content = content.replace(old_effect_end, new_effect_end, 1)
    print("3. Added auto-play of all options on mount")
else:
    print("[WARN] Effect pattern not found")

# 4. Add speaker buttons and sound-only toggle to word bank items
old_button = """                            <button
                                key={`bank-${idx}`}
                                onClick={() => handleWordClick(item)}
                                className={`px-5 py-3 rounded-xl text-lg font-bold shadow-sm border-b-4 transition-all hover:scale-105 active:scale-95 ${
                                    isShaking 
                                        ? 'bg-red-100 border-red-300 text-red-600 animate-shake' 
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600'
                                }`}
                            >
                                {item.text}
                            </button>"""

new_button = """                            <div key={`bank-${idx}`} className="flex items-center gap-1">
                                {/* Play button to hear word before picking */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onPlayAudio(item.text); }}
                                    className="p-2 rounded-full text-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                                    aria-label={`Hear ${soundOnlyMode ? 'option' : item.text}`}
                                    title="Hear this word"
                                >
                                    <Volume2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleWordClick(item)}
                                    className={`px-5 py-3 rounded-xl text-lg font-bold shadow-sm border-b-4 transition-all hover:scale-105 active:scale-95 ${
                                        isShaking 
                                            ? 'bg-red-100 border-red-300 text-red-600 animate-shake' 
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600'
                                    }`}
                                >
                                    {soundOnlyMode ? '🔊' : item.text}
                                </button>
                            </div>"""

if old_button in content:
    content = content.replace(old_button, new_button, 1)
    print("4. Added speaker buttons + sound-only toggle to word bank")
else:
    print("[WARN] Button pattern not found")

# 5. Also respect sound-only in the found words display (the house)
old_found = """                                    {word} <Check size={16} className="text-violet-200" />"""
new_found = """                                    {soundOnlyMode ? '🔊' : word} <Check size={16} className="text-violet-200" />"""

if old_found in content:
    content = content.replace(old_found, new_found, 1)
    print("5. Added sound-only toggle to found words display")
else:
    print("[WARN] Found words pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nAll Word Families fixes applied!")
