#!/usr/bin/env python3
"""
Add image visibility logic to checkAnswer and word advancement
- Progressive: Show image after 1st incorrect (attempts === 1)
- After Response: Show image after correct OR 2 incorrect
- Reset per-word state on word change
"""

from pathlib import Path

def add_image_visibility_logic(file_path: Path) -> list:
    """Add image visibility logic to checkAnswer."""
    
    content = file_path.read_text(encoding='utf-8')
    fixes = []
    
    # 1. Add Progressive mode logic in the RETRY MECHANIC section
    old_retry = """        // RETRY MECHANIC (Second Chance)
        if (!isCorrect && attempts === 0) {
            setAttempts(1);
            playSound('error'); // Soft error
            // Visual feedback
            setWordSoundsFeedback?.({
                isCorrect: false,
                message: "Try again! Listen closely..."
            });
            // Auto-clear feedback after 1.5s so they can try again
            setTimeout(() => setWordSoundsFeedback?.(null), 1500);
            return;
        }"""
    
    new_retry = """        // RETRY MECHANIC (Second Chance)
        if (!isCorrect && attempts === 0) {
            setAttempts(1);
            setCurrentWordAttempts(prev => prev + 1); // Track for image visibility
            playSound('error'); // Soft error
            
            // Progressive Mode: Show image after first incorrect
            if (imageVisibilityMode === 'progressive' && currentWordImage) {
                setShowImageForCurrentWord(true);
            }
            
            // Visual feedback
            setWordSoundsFeedback?.({
                isCorrect: false,
                message: "Try again! Listen closely..."
            });
            // Auto-clear feedback after 1.5s so they can try again
            setTimeout(() => setWordSoundsFeedback?.(null), 1500);
            return;
        }"""
    
    if old_retry in content and "imageVisibilityMode === 'progressive'" not in content:
        content = content.replace(old_retry, new_retry)
        fixes.append("Added Progressive mode logic in retry mechanic")
    
    # 2. Add After Response mode logic after correct answer handling
    old_correct = """        // Reveal text on correct answer
        if (isCorrect) {
            setIsCelebrating(true);
            playSynthesizedSound('correct', newStreak); // Streak-based pitch shift
            setTimeout(() => setIsCelebrating(false), 2500);
            setShowWordText(true);
        }"""
    
    new_correct = """        // Reveal text on correct answer
        if (isCorrect) {
            setIsCelebrating(true);
            playSynthesizedSound('correct', newStreak); // Streak-based pitch shift
            setTimeout(() => setIsCelebrating(false), 2500);
            setShowWordText(true);
            
            // After Response Mode: Show image after correct answer
            if (imageVisibilityMode === 'afterResponse' && currentWordImage) {
                setShowImageForCurrentWord(true);
            }
        } else {
            // Increment attempts for image visibility tracking
            setCurrentWordAttempts(prev => prev + 1);
            
            // After Response Mode: Show image after 2 incorrect (this is the 2nd failure)
            if (imageVisibilityMode === 'afterResponse' && currentWordImage && currentWordAttempts >= 1) {
                setShowImageForCurrentWord(true);
            }
        }"""
    
    if old_correct in content and "imageVisibilityMode === 'afterResponse'" not in content:
        content = content.replace(old_correct, new_correct)
        fixes.append("Added After Response mode logic")
    
    # 3. Add state reset when word changes (in advanceWord or word transition logic)
    # Find where setCurrentWordSoundsWord is called to reset per-word state
    old_word_set = "setCurrentWordSoundsWord(targetWord);"
    new_word_set = """setCurrentWordSoundsWord(targetWord);
                setCurrentWordAttempts(0); // Reset attempts for new word
                setShowImageForCurrentWord(imageVisibilityMode === 'alwaysOn'); // Reset image visibility"""
    
    if old_word_set in content and "setCurrentWordAttempts(0); // Reset attempts for new word" not in content:
        # Only replace the first occurrence (in the main word loading logic)
        content = content.replace(old_word_set, new_word_set, 1)
        fixes.append("Added per-word state reset on word change")
    
    if fixes:
        file_path.write_text(content, encoding='utf-8')
        print(f"Applied {len(fixes)} changes:")
        for f in fixes:
            print(f"  ✓ {f}")
    else:
        print("No changes applied (logic may already exist)")
    
    return fixes

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_image_visibility_logic(file_path)
