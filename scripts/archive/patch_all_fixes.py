"""
Comprehensive patch script for Word Sounds UI, Help Toggle, Localization & Error Fixes.
Applies Fixes 1, 2, 3, 4, 5, 6, 8, 9 from the implementation plan.
All replacements use the exact text from the file (with \n line endings, since utf-8-sig read strips BOM and Python normalizes).
"""

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Normalize to \n for matching, will write back with original encoding
content = content.replace('\r\n', '\n')

changes_made = []

def safe_replace(content, old, new, label, count=1):
    if old in content:
        content = content.replace(old, new, count)
        changes_made.append(f"✅ {label}")
        return content
    else:
        changes_made.append(f"❌ FAILED: {label}")
        # Show a snippet to debug
        # Find partial match
        first_line = old.split('\n')[0][:60]
        if first_line in content:
            changes_made.append(f"   (first line found, likely whitespace/newline mismatch)")
        else:
            changes_made.append(f"   (first line NOT found: '{first_line}')")
        return content

# ==============================================================================
# FIX 4: PHONEME_GUIDE defensive guards (4 locations)
# ==============================================================================

# Fix 4a: Review panel phoneme drag items
content = safe_replace(content,
    'title={typeof p === "string" && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : (typeof p === "string" ? p : "")}',
    'title={typeof p === "string" && typeof PHONEME_GUIDE !== \'undefined\' && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : (typeof p === "string" ? p : "")}',
    "Fix 4a: PHONEME_GUIDE guard at review panel drag items"
)

# Fix 4b: Phoneme bank play button
content = safe_replace(content,
    "title={PHONEME_GUIDE[p] ? `🔊 ${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : `Play sound: ${p}`}",
    "title={typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[p] ? `🔊 ${PHONEME_GUIDE[p].label} (${PHONEME_GUIDE[p].ipa}) — ${PHONEME_GUIDE[p].examples}` : `Play sound: ${p}`}",
    "Fix 4b: PHONEME_GUIDE guard at phoneme bank play button"
)

# Fix 4c: Phoneme bank drag/add button
content = safe_replace(content,
    """title={PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label}: ${PHONEME_GUIDE[p].tip}${PHONEME_GUIDE[p].confusesWith?.length ? '\\n⚠️ Often confused with: ' + PHONEME_GUIDE[p].confusesWith.join(', ') : ''}` : `Click or drag to add "${p}"`}""",
    """title={typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[p] ? `${PHONEME_GUIDE[p].label}: ${PHONEME_GUIDE[p].tip}${PHONEME_GUIDE[p].confusesWith?.length ? '\\n⚠️ Often confused with: ' + PHONEME_GUIDE[p].confusesWith.join(', ') : ''}` : `Click or drag to add "${p}"`}""",
    "Fix 4c: PHONEME_GUIDE guard at phoneme bank add button"
)

# Fix 4d: Segmentation pool chip
content = safe_replace(content,
    """title={PHONEME_GUIDE[chip.phoneme] ? `${PHONEME_GUIDE[chip.phoneme].label}: ${PHONEME_GUIDE[chip.phoneme].tip}\\nDrag to box or Click to listen` : "Drag to box or Click to listen"}""",
    """title={typeof PHONEME_GUIDE !== 'undefined' && PHONEME_GUIDE[chip.phoneme] ? `${PHONEME_GUIDE[chip.phoneme].label}: ${PHONEME_GUIDE[chip.phoneme].tip}\\nDrag to box or Click to listen` : "Drag to box or Click to listen"}""",
    "Fix 4d: PHONEME_GUIDE guard at segmentation pool chip"
)

# ==============================================================================
# FIX 6: ErrorBoundary onRetry for WordSoundsModal
# ==============================================================================
content = safe_replace(content,
    '<ErrorBoundary fallbackMessage="Word Sounds encountered an error.">',
    '<ErrorBoundary fallbackMessage="Word Sounds encountered an error." onRetry={() => { setWordSoundsPhonemes(null); setCurrentWordSoundsWord(null); setWordSoundsFeedback(null); setWordSoundsActivity(null); }}>',
    "Fix 6: ErrorBoundary onRetry for clean restart"
)

# ==============================================================================
# FIX 8: Help mode toggle - add data-help-ignore to wizard buttons
# ==============================================================================

# Fix 8a: Wizard help toggle - add data-help-ignore
content = safe_replace(content,
    'onClick={() => { setShowWizardHelp(h => !h); setIsHelpMode(prev => !prev); }}\n                    className={`p-2 rounded-full transition-all',
    'data-help-ignore="true"\n                    onClick={() => { setShowWizardHelp(h => !h); setIsHelpMode(prev => !prev); }}\n                    className={`p-2 rounded-full transition-all',
    "Fix 8a: data-help-ignore on wizard help toggle"
)

# Fix 8b: Wizard Skip button
content = safe_replace(content,
    'onClick={handleSkip}\n                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"',
    'data-help-ignore="true"\n                    onClick={handleSkip}\n                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"',
    "Fix 8b: data-help-ignore on wizard Skip button"
)

# Fix 8c: Wizard Close (X) button - remove data-help-key, add data-help-ignore
content = safe_replace(content,
    'onClick={() => { setIsHelpMode(false); onClose(); }} className="p-2 rounded-full text-slate-500 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" data-help-key="wizard_close_btn" aria-label={t(\'common.close_wizard\')}>',
    'data-help-ignore="true" onClick={() => { setIsHelpMode(false); onClose(); }} className="p-2 rounded-full text-slate-500 hover:text-slate-600 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t(\'common.close_wizard\')}>',
    "Fix 8c: data-help-ignore on wizard Close button (removed data-help-key)"
)

# ==============================================================================
# FIX 9: Localization fallback in WordSoundsGenerator
# ==============================================================================
content = safe_replace(content,
    "const t = tProp || ((key, fallback) => fallback || key);",
    "const t = tProp || ((key, params) => getWordSoundsString((k) => k, key, params || {}));",
    "Fix 9: WordSoundsGenerator fallback t() routes through getWordSoundsString"
)

# ==============================================================================
# FIX 1: renderPrompt() — Replace "🔊 Listen" text with animated ear visual
# ==============================================================================
old_fix1 = """            ) : (
                <button 
                    onClick={() => wordSoundsActivity === 'blending' ? playBlending() : handleAudio(currentWordSoundsWord)}
                    disabled={isPlayingAudio}
                    className={`text-4xl font-bold transition-colors flex items-center justify-center gap-3 mx-auto ${
                        isPlayingAudio ? 'text-slate-400 cursor-wait' : 'text-violet-700 hover:text-violet-500'
                    }`}
                >
                    {(getEffectiveTextMode() === 'alwaysOn' || showWordText) ? currentWordSoundsWord : '🔊 Listen'}
                    {isPlayingAudio ? (
                        <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                        <Volume2 size={24} className="text-violet-400" />
                    )}
                </button>"""

new_fix1 = """            ) : (
                <button 
                    onClick={() => wordSoundsActivity === 'blending' ? playBlending() : handleAudio(currentWordSoundsWord)}
                    disabled={isPlayingAudio}
                    className={`flex flex-col items-center justify-center gap-2 mx-auto p-4 rounded-2xl transition-all ${
                        isPlayingAudio ? 'bg-violet-100 scale-105' : 'bg-white/60 hover:bg-violet-50 hover:scale-105'
                    }`}
                >
                    {(getEffectiveTextMode() === 'alwaysOn' || showWordText) && (
                        <span className="text-4xl font-bold text-violet-700">{currentWordSoundsWord}</span>
                    )}
                    <div className="relative flex items-center justify-center">
                        <Ear size={48} className={`transition-all ${isPlayingAudio ? 'text-violet-500 animate-pulse' : 'text-violet-400'}`} />
                        {isPlayingAudio && (
                            <div className="absolute -right-3 -top-1 flex gap-0.5 items-end h-5">
                                <div className="w-1 bg-violet-400 rounded-full" style={{height: '4px', animation: 'soundwave 0.6s ease-in-out infinite alternate'}} />
                                <div className="w-1 bg-violet-500 rounded-full" style={{height: '12px', animation: 'soundwave 0.6s ease-in-out infinite alternate 0.2s'}} />
                                <div className="w-1 bg-violet-400 rounded-full" style={{height: '8px', animation: 'soundwave 0.6s ease-in-out infinite alternate 0.4s'}} />
                            </div>
                        )}
                    </div>
                    {!(getEffectiveTextMode() === 'alwaysOn' || showWordText) && (
                        <span className="text-xs font-medium text-violet-500 mt-1">Tap to hear</span>
                    )}
                </button>"""

content = safe_replace(content, old_fix1, new_fix1, "Fix 1: Animated ear+soundwave replaces '🔊 Listen' text")

# ==============================================================================
# FIX 2: Remove duplicate "Blend these sounds together" instruction
# ==============================================================================
content = safe_replace(content,
    """<p className="text-sm text-slate-500">{ts('word_sounds.blending_instruction') || `Listen to the sounds, then ${useMicInput ? "say the word!" : "pick the word!"}`}</p>""",
    """<p className="text-sm text-slate-500">{`Listen to the sounds, then ${useMicInput ? "say the word!" : "pick the word!"}`}</p>""",
    "Fix 2: Removed duplicate blending_instruction text"
)

# ==============================================================================
# FIX 3: Find Sounds — Comprehensive SIMILAR_SOUNDS distractor map
# ==============================================================================
old_fix3 = """            const isoAllPhonemes = wordSoundsPhonemes?.phonemes || [];
            const isoDistractors = isoAllPhonemes.filter(p => p.toLowerCase() !== correctSound?.toLowerCase()).slice(0, 5);
            const isoCommon = ['b', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'w'];
            // Ensure unique distractors
            const used = new Set([correctSound?.toLowerCase(), ...(isoDistractors || []).map(d => d.toLowerCase())]);
            while (isoDistractors.length < 5 && isoCommon.length > 0) {
                const r = isoCommon.splice(Math.floor(Math.random() * isoCommon.length), 1)[0];
                if (!used.has(r)) {
                    isoDistractors.push(r);
                    used.add(r);
                }
            }"""

new_fix3 = """            const isoAllPhonemes = wordSoundsPhonemes?.phonemes || [];
            // TIER 1: Word-internal phonemes (other sounds in the same word)
            const isoDistractors = isoAllPhonemes.filter(p => p.toLowerCase() !== correctSound?.toLowerCase()).slice(0, 3);
            const used = new Set([correctSound?.toLowerCase(), ...(isoDistractors || []).map(d => d.toLowerCase())]);
            // TIER 2: Phonetically similar confusers (comprehensive map)
            const SIMILAR_SOUNDS = {
                'b': ['d','p','v','g'], 'd': ['b','t','g','n'], 'f': ['v','th','s','p'],
                'g': ['k','d','b','j'], 'h': ['wh','f'], 'j': ['g','ch','zh','z'],
                'k': ['g','t','c','ck'], 'l': ['r','w','n','y'], 'm': ['n','b','p','ng'],
                'n': ['m','ng','d','l'], 'p': ['b','t','f','k'], 'r': ['l','w','y','er'],
                's': ['z','sh','th','f'], 't': ['d','k','p','ch'], 'v': ['f','b','w','th'],
                'w': ['r','l','wh','y'], 'y': ['w','l','ee','i'], 'z': ['s','zh','j','th'],
                'sh': ['ch','s','zh','th'], 'ch': ['sh','j','t','tch'], 'th': ['f','v','s','d'],
                'wh': ['w','h','f'], 'ng': ['n','m','nk'], 'ck': ['k','g','c'],
                'a': ['e','u','o','ah'], 'e': ['i','a','u','eh'], 'i': ['e','ee','y','ih'],
                'o': ['u','a','aw','ah'], 'u': ['o','oo','a','uh'],
                'ee': ['i','ea','e','y'], 'oo': ['u','ew','o'], 'ai': ['ay','a','ei'],
                'oa': ['o','ow','oe'], 'ou': ['ow','oo','u'], 'ow': ['ou','oa','o'],
                'oi': ['oy','ou','aw'], 'oy': ['oi','ow','o'],
                'ar': ['or','er','a','ah'], 'or': ['ar','er','aw','ore'], 'er': ['ar','or','ur','ir'],
                'ir': ['er','ur','ear'], 'ur': ['er','ir','or'],
                'aw': ['or','o','au','ow'], 'au': ['aw','o','ou'],
                'c': ['k','s','ck','g'],
            };
            const similarPool = SIMILAR_SOUNDS[correctSound?.toLowerCase()] || [];
            const wordSeed = (currentWordSoundsWord || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const shuffledSimilar = [...similarPool].sort((a, b) => ((wordSeed * 31 + a.charCodeAt(0)) % 97) - ((wordSeed * 31 + b.charCodeAt(0)) % 97));
            for (const sim of shuffledSimilar) {
                if (isoDistractors.length >= 5) break;
                if (!used.has(sim.toLowerCase())) { isoDistractors.push(sim); used.add(sim.toLowerCase()); }
            }
            // TIER 3: Expanded common pool (consonants + vowels + digraphs, seeded shuffle)
            const isoExpandedPool = ['b','d','f','g','h','j','k','l','m','n','p','r','s','t','v','w','z','a','e','i','o','u','sh','ch','th','wh','ng','ee','oo','ar','or','er'];
            const shuffledPool = [...isoExpandedPool].sort((a, b) => ((wordSeed * 13 + a.charCodeAt(0)) % 89) - ((wordSeed * 13 + b.charCodeAt(0)) % 89));
            for (const p of shuffledPool) {
                if (isoDistractors.length >= 5) break;
                if (!used.has(p.toLowerCase())) { isoDistractors.push(p); used.add(p.toLowerCase()); }
            }"""

content = safe_replace(content, old_fix3, new_fix3, "Fix 3: 3-tier SIMILAR_SOUNDS distractor system")

# ==============================================================================
# FIX 5: Blending options wait guard during TTS auto-play
# Replace the entire blending auto-play block with a version that waits
# ==============================================================================
old_fix5 = """                if (blendingOptions && blendingOptions.length > 0) {
                    // PRE-CACHE TTS: Generate audio for ALL options simultaneously
                    // This prevents the correct answer from loading first (giving away the answer)
                    try {
                        await Promise.allSettled(blendingOptions.map(w => callTTS(w)));
                    } catch(e) { debugLog('Blending TTS pre-cache error:', e); }
                    await new Promise(r => setTimeout(r, 600)); // Gap after phonemes
                    for (let i = 0; i < blendingOptions.length; i++) {
                        if (cancelled) break;
                        setHighlightedBlendIndex(i); // Highlight current option
                        await handleAudio(blendingOptions[i]);
                        if (cancelled) return;
                        await new Promise(r => setTimeout(r, 500)); // Gap between options
                    }
                    setHighlightedBlendIndex(null); // Clear highlight when done
                }"""

new_fix5 = """                // FIX: Wait for blending options to populate (repair effect may be async)
                let effectiveBlendingOptions = blendingOptions;
                if (!effectiveBlendingOptions || effectiveBlendingOptions.length === 0) {
                    for (let waitAttempt = 0; waitAttempt < 15; waitAttempt++) {
                        await new Promise(r => setTimeout(r, 200));
                        if (cancelled) return;
                        if (blendingOptions && blendingOptions.length > 0) {
                            effectiveBlendingOptions = blendingOptions;
                            break;
                        }
                    }
                }
                if (effectiveBlendingOptions && effectiveBlendingOptions.length > 0) {
                    // PRE-CACHE TTS: Generate audio for ALL options simultaneously
                    // This prevents the correct answer from loading first (giving away the answer)
                    try {
                        await Promise.allSettled(effectiveBlendingOptions.map(w => callTTS(w)));
                    } catch(e) { debugLog('Blending TTS pre-cache error:', e); }
                    await new Promise(r => setTimeout(r, 600)); // Gap after phonemes
                    for (let i = 0; i < effectiveBlendingOptions.length; i++) {
                        if (cancelled) break;
                        setHighlightedBlendIndex(i); // Highlight current option
                        await handleAudio(effectiveBlendingOptions[i]);
                        if (cancelled) return;
                        await new Promise(r => setTimeout(r, 500)); // Gap between options
                    }
                    setHighlightedBlendIndex(null); // Clear highlight when done
                }"""

content = safe_replace(content, old_fix5, new_fix5, "Fix 5: Blending options wait guard before TTS auto-play")

# ==============================================================================
# Add @keyframes soundwave animation CSS
# ==============================================================================
content = safe_replace(content,
    ".help-mode-interactive {",
    "@keyframes soundwave {\n    0% { height: 4px; }\n    100% { height: 16px; }\n}\n.help-mode-interactive {",
    "CSS: Added soundwave keyframes for animated ear visual"
)

# ==============================================================================
# WRITE FILE
# ==============================================================================
# Convert back to \r\n for Windows
content = content.replace('\n', '\r\n')

success_count = sum(1 for c in changes_made if c.startswith('✅'))
fail_count = sum(1 for c in changes_made if c.startswith('❌'))

print(f"\n{'='*60}")
print(f"PATCH SUMMARY: {success_count} succeeded, {fail_count} failed")
print(f"{'='*60}")
for change in changes_made:
    print(f"  {change}")

if success_count > 0:
    with open(FILE, 'w', encoding='utf-8-sig') as f:  # Preserve BOM!
        f.write(content)
    print(f"\n✅ File saved (UTF-8 with BOM preserved)")
else:
    print("\n❌ No changes were made")

# Verify BOM is preserved
with open(FILE, 'rb') as f:
    bom = f.read(3)
    if bom == b'\xef\xbb\xbf':
        print("✅ BOM verified: EF BB BF present")
    else:
        print(f"⚠️ BOM check: {bom.hex()} (expected efbbbf)")
