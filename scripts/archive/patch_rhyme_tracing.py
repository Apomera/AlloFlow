"""
Comprehensive patch for:
1. Rhyme Time: Remove duplicate word display & play button (keep orange RhymeView, remove renderPrompt())
   - Add TTS spinner from renderPrompt into RhymeView  
2. Word Families TTS: Remove 2 out-of-scope `if (cancelled) return;` references
3. Letter Tracing: Ensure auto-advance works after both phases complete
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    lines = content.split('\n')
    fixes = []
    
    # =========================================================================
    # FIX 1: Rhyme Time - Remove renderPrompt() call from rhyming case
    # The rhyming case at the end returns:
    #   <div className="flex flex-col gap-4">
    #     {renderPrompt()}        <--- REMOVE THIS LINE (duplicate word + play btn)
    #     <RhymeView ... />
    #     <button ... Use Microphone />
    #   </div>
    # =========================================================================
    
    # Find the exact pattern in the rhyming return block  
    old_rhyme = '''                      <div className="flex flex-col gap-4">
                        {renderPrompt()}
                        <RhymeView'''
    new_rhyme = '''                      <div className="flex flex-col gap-4">
                        <RhymeView'''
    
    if old_rhyme in content:
        content = content.replace(old_rhyme, new_rhyme, 1)
        fixes.append("FIX 1: Removed renderPrompt() from rhyming case to eliminate duplicate word/play button")
    else:
        print("WARNING: Could not find rhyming renderPrompt() pattern")
        # Try alternative spacing
        for i, line in enumerate(lines):
            if 'renderPrompt()' in line and i > 0:
                # Check if next non-empty line has RhymeView
                for j in range(i+1, min(i+5, len(lines))):
                    if 'RhymeView' in lines[j]:
                        print(f"  Found renderPrompt() before RhymeView at line {i+1}")
                        # Check context - is this in the rhyming case?
                        for k in range(max(0, i-10), i):
                            if "case 'rhyming'" in lines[k]:
                                print(f"  Confirmed rhyming case context at line {k+1}")
                                # Remove the renderPrompt line
                                lines[i] = ''
                                content = '\n'.join(lines)
                                fixes.append("FIX 1: Removed renderPrompt() from rhyming case (alt method)")
                                break
                        break

    # =========================================================================
    # FIX 2: Add TTS busy spinner to RhymeView play button 
    # Currently RhymeView's play button is static. We need to pass isPlayingAudio
    # and show a spinner like renderPrompt does.
    # =========================================================================
    
    # Add isPlayingAudio prop to RhymeView's destructured props
    old_rhyme_props = "const RhymeView = React.memo(({ data, showLetterHints, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, highlightedIndex }) => {"
    new_rhyme_props = "const RhymeView = React.memo(({ data, showLetterHints, onPlayAudio, onCheckAnswer, isEditing, onUpdateOption, highlightedIndex, isAudioBusy }) => {"
    
    if old_rhyme_props in content:
        content = content.replace(old_rhyme_props, new_rhyme_props, 1)
        fixes.append("FIX 2a: Added isAudioBusy prop to RhymeView")
    else:
        print("WARNING: Could not find RhymeView props pattern")

    # Update the play button inside RhymeView to show spinner
    old_play_btn = '''                    <button 
                        onClick={() => onPlayAudio(data.word)}
                        className="w-20 h-20 rounded-2xl bg-white text-orange-500 flex items-center justify-center shadow-lg focus:ring-4 focus:ring-orange-300 focus:outline-none hover:scale-105 transition-transform"
                    >
                        <Volume2 size={32} />
                    </button>'''
    
    new_play_btn = '''                    <button 
                        onClick={() => onPlayAudio(data.word)}
                        disabled={isAudioBusy}
                        className={`w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg focus:ring-4 focus:ring-orange-300 focus:outline-none hover:scale-105 transition-all ${isAudioBusy ? 'text-orange-300 cursor-wait' : 'text-orange-500'}`}
                    >
                        {isAudioBusy ? <div className="animate-spin h-8 w-8 border-3 border-orange-400 border-t-transparent rounded-full" /> : <Volume2 size={32} />}
                    </button>'''
    
    if old_play_btn in content:
        content = content.replace(old_play_btn, new_play_btn, 1)
        fixes.append("FIX 2b: Added TTS spinner to RhymeView play button")
    else:
        print("WARNING: Could not find RhymeView play button pattern")
    
    # Pass isPlayingAudio to RhymeView where it's rendered
    old_rhyme_render = '''                        <RhymeView
                            data={{
                                word: currentWordSoundsWord,
                                rhymeWord: wordSoundsPhonemes?.rhymeWord,
                                options: rhymeOptions
                            }}
                            highlightedIndex={highlightedRhymeIndex}
                            showLetterHints={showLetterHints}
                            onPlayAudio={handleAudio}
                            isEditing={isEditing}
                            onUpdateOption={handleOptionUpdate}'''
    
    new_rhyme_render = '''                        <RhymeView
                            data={{
                                word: currentWordSoundsWord,
                                rhymeWord: wordSoundsPhonemes?.rhymeWord,
                                options: rhymeOptions
                            }}
                            highlightedIndex={highlightedRhymeIndex}
                            showLetterHints={showLetterHints}
                            onPlayAudio={handleAudio}
                            isEditing={isEditing}
                            onUpdateOption={handleOptionUpdate}
                            isAudioBusy={isPlayingAudio}'''
    
    if old_rhyme_render in content:
        content = content.replace(old_rhyme_render, new_rhyme_render, 1)
        fixes.append("FIX 2c: Passed isPlayingAudio as isAudioBusy prop to RhymeView")
    else:
        print("WARNING: Could not find RhymeView render pattern")

    # =========================================================================
    # FIX 3: Word Families TTS - Remove out-of-scope `if (cancelled) return;`
    # Two occurrences at lines ~7349 and ~7358
    # =========================================================================
    
    old_cancelled_1 = """                        await handleAudio(INSTRUCTION_AUDIO['sound_match_start']); // "Find all words that start with..."
                        if (cancelled) return;
                        await new Promise(r => setTimeout(r, 300));"""
    new_cancelled_1 = """                        await handleAudio(INSTRUCTION_AUDIO['sound_match_start']); // "Find all words that start with..."
                        await new Promise(r => setTimeout(r, 300));"""
    
    if old_cancelled_1 in content:
        content = content.replace(old_cancelled_1, new_cancelled_1, 1)
        fixes.append("FIX 3a: Removed out-of-scope `cancelled` ref from word_families start TTS")
    else:
        print("WARNING: Could not find cancelled ref in word_families start TTS")

    old_cancelled_2 = """                        await handleAudio(INSTRUCTION_AUDIO['sound_match_end']); // "Find all words that end with..."
                        if (cancelled) return;
                        await new Promise(r => setTimeout(r, 300));"""
    new_cancelled_2 = """                        await handleAudio(INSTRUCTION_AUDIO['sound_match_end']); // "Find all words that end with..."
                        await new Promise(r => setTimeout(r, 300));"""
    
    if old_cancelled_2 in content:
        content = content.replace(old_cancelled_2, new_cancelled_2, 1)
        fixes.append("FIX 3b: Removed out-of-scope `cancelled` ref from word_families end TTS")
    else:
        print("WARNING: Could not find cancelled ref in word_families end TTS")

    # =========================================================================
    # FIX 4: Letter Tracing Auto-Advance
    # The issue: After lowercase bonus completes, checkAnswer is called.
    # checkAnswer auto-advances after 2500ms. But the submissionLockRef might 
    # not get cleared if there's a timing issue, OR the word index doesn't advance.
    #
    # The current flow:
    #   onComplete(true) -> setTimeout 1000ms -> setTracingPhase('upper'), checkAnswer('correct','correct')
    #   checkAnswer -> setTimeout 2500ms -> advance to next word
    #
    # The fix: Ensure the word index increments. Let's look at the advance logic.
    # After checkAnswer, at ~line 7817:
    #   setTimeout(() => {
    #     submissionLockRef.current = false;
    #     // ... advance word from preloaded buffer
    #   }, 2500);
    #
    # Looking more closely, the advance logic sets currentWordSoundsWord and
    # increments currentWordIndex. This SHOULD work. But there's a risk that
    # the celebration animation (2500ms) overlaps and blocks visual progress.
    #
    # The real fix might be that the next word loads but tracingPhase is stuck.  
    # Let's ensure tracingPhase resets when the word changes.
    # =========================================================================
    
    # Add tracingPhase reset when word changes in the init effect
    # Find the effect that initializes Elkonin boxes when word changes
    old_tracing_phase_reset = """        if (['segmentation', 'blending'].includes(wordSoundsActivity) && wordSoundsPhonemes.phonemes) {
             // Only reset if empty or count doesn't match
             if (elkoninBoxes.length === 0 || elkoninBoxes.length !== effectiveCount) {
                 debugLog("🔧 Initializing Elkonin boxes:", effectiveCount, "for", currentWordSoundsWord);"""
    
    new_tracing_phase_reset = """        // Reset tracing phase when word changes
        if (wordSoundsActivity === 'letter_tracing') {
            setTracingPhase('upper');
        }
        
        if (['segmentation', 'blending'].includes(wordSoundsActivity) && wordSoundsPhonemes.phonemes) {
             // Only reset if empty or count doesn't match
             if (elkoninBoxes.length === 0 || elkoninBoxes.length !== effectiveCount) {
                 debugLog("🔧 Initializing Elkonin boxes:", effectiveCount, "for", currentWordSoundsWord);"""
    
    if old_tracing_phase_reset in content:
        content = content.replace(old_tracing_phase_reset, new_tracing_phase_reset, 1)
        fixes.append("FIX 4a: Added tracingPhase reset to 'upper' when word/activity changes")
    else:
        print("WARNING: Could not find tracing phase reset pattern")

    # Also ensure the auto-advance timeout for letter tracing is reasonable
    # The current 1000ms delay before checkAnswer + 2500ms auto-advance = 3.5s total
    # This is fine. But let's also add a safety net: if checkAnswer was already locked,
    # force-unlock it before calling.
    
    old_tracing_complete = """                                      } else {
                                          // Both cases done! — celebration audio
                                          if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['amazing']) {
                                              handleAudio(INSTRUCTION_AUDIO['amazing']);
                                          }
                                          setTimeout(() => {
                                              if (!isMountedRef.current) return;
                                              setTracingPhase('upper');
                                              checkAnswer('correct', 'correct');
                                          }, 1000);"""
    
    new_tracing_complete = """                                      } else {
                                          // Both cases done! — celebration audio
                                          if (typeof INSTRUCTION_AUDIO !== 'undefined' && INSTRUCTION_AUDIO['amazing']) {
                                              handleAudio(INSTRUCTION_AUDIO['amazing']);
                                          }
                                          setTimeout(() => {
                                              if (!isMountedRef.current) return;
                                              // FIX: Force-unlock submission for letter tracing auto-advance
                                              submissionLockRef.current = false;
                                              setTracingPhase('upper');
                                              checkAnswer('correct', 'correct');
                                          }, 1500);"""

    if old_tracing_complete in content:
        content = content.replace(old_tracing_complete, new_tracing_complete, 1)
        fixes.append("FIX 4b: Force-unlock submissionLockRef before letter tracing auto-advance + increased delay to 1500ms")
    else:
        print("WARNING: Could not find tracing complete pattern")
    
    # Write out
    with open(FILE, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"\n{'='*60}")
    print(f"Applied {len(fixes)} fixes:")
    for fix in fixes:
        print(f"  ✓ {fix}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
