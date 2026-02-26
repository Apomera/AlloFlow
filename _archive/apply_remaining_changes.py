#!/usr/bin/env python3
"""
Apply remaining image visibility changes:
1. Update renderPrompt conditional
2. Add Progressive mode triggers in checkAnswer
3. Reset state on word change
4. Add UI dropdown
"""

from pathlib import Path

def apply_remaining_changes(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Update renderPrompt conditional
    old_cond = "{!showWordText && currentWordImage ? ("
    new_cond = """{(() => {
                const shouldShowImage = currentWordImage && (
                    imageVisibilityMode === 'alwaysOn' ||
                    (imageVisibilityMode === 'progressive' && showImageForCurrentWord)
                );
                return shouldShowImage && !showWordText;
            })() ? ("""
    
    if old_cond in content:
        content = content.replace(old_cond, new_cond)
        changes += 1
        print("✓ Updated renderPrompt conditional")
    elif "shouldShowImage" in content:
        print("ℹ renderPrompt already updated")
    else:
        print("✗ Could not find renderPrompt conditional")
    
    # 2. Add Progressive mode trigger on first incorrect answer
    # Find: setAttempts(1);
    # Add after: if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
    old_retry = "setAttempts(1);\r\n            playSound('error');"
    new_retry = """setAttempts(1);
            // Progressive: reveal image after first incorrect
            if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
            playSound('error');"""
    
    if old_retry in content:
        content = content.replace(old_retry, new_retry)
        changes += 1
        print("✓ Added Progressive trigger on incorrect")
    elif "Progressive: reveal image" in content:
        print("ℹ Progressive trigger already added")
    else:
        print("✗ Could not find retry mechanic location")
    
    # 3. Add Progressive mode trigger on correct answer
    # Find: setShowWordText(true);
    # After the one in "Reveal text on correct answer" section
    old_correct = "setShowWordText(true);\r\n        }"
    new_correct = """setShowWordText(true);
            // Progressive: also reveal image on correct
            if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
        }"""
    
    if old_correct in content:
        content = content.replace(old_correct, new_correct, 1)  # Only first occurrence
        changes += 1
        print("✓ Added Progressive trigger on correct")
    elif "also reveal image on correct" in content:
        print("ℹ Correct trigger already added")
    else:
        print("✗ Could not find correct answer location")
    
    # 4. Reset showImageForCurrentWord when loading new word
    # Find where showWordText is reset
    old_reset = "setShowWordText(false);\r\n                setUserAnswer('');"
    new_reset = """setShowWordText(false);
                setShowImageForCurrentWord(false); // Reset per-word image state
                setUserAnswer('');"""
    
    if old_reset in content:
        content = content.replace(old_reset, new_reset)
        changes += 1
        print("✓ Added state reset on word change")
    elif "Reset per-word image state" in content:
        print("ℹ State reset already added")
    else:
        print("✗ Could not find word change location")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} changes successfully")
    else:
        print("\nNo changes applied")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    apply_remaining_changes(file_path)
