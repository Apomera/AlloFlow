#!/usr/bin/env python3
"""
Add Progressive mode triggers to checkAnswer (Unix line endings)
"""

from pathlib import Path

def apply_logic_changes(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Add Progressive mode trigger on first incorrect answer (after setAttempts(1))
    old_retry = "setAttempts(1);\n            playSound('error');"
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
        print("✗ Could not find retry mechanic")
    
    # 2. Add Progressive mode trigger on correct answer (after setShowWordText(true))
    old_correct = "setShowWordText(true);\n        }\n        \n        // Update score"
    new_correct = """setShowWordText(true);
            // Progressive: also reveal image on correct
            if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
        }
        
        // Update score"""
    
    if old_correct in content:
        content = content.replace(old_correct, new_correct)
        changes += 1
        print("✓ Added Progressive trigger on correct")
    elif "also reveal image on correct" in content:
        print("ℹ Correct trigger already added")
    else:
        print("✗ Could not find correct answer section")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} logic changes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    apply_logic_changes(file_path)
