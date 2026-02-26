#!/usr/bin/env python3
"""
Safe implementation of 3-mode image visibility.
This script makes targeted, minimal changes.
"""

from pathlib import Path

def apply_changes(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Add state variables after showLetterHints
    old_state = "const [showLetterHints, setShowLetterHints] = React.useState(false); // Toggle for Pure Sound vs Phonics (Default: Sound Only)\r\n    const [elkoninBoxes, setElkoninBoxes] = React.useState([]);"
    
    new_state = """const [showLetterHints, setShowLetterHints] = React.useState(false); // Toggle for Pure Sound vs Phonics (Default: Sound Only)
    // Image Visibility Modes: alwaysOn, progressive, alwaysOff
    const [imageVisibilityMode, setImageVisibilityMode] = React.useState('progressive');
    const [showImageForCurrentWord, setShowImageForCurrentWord] = React.useState(false);
    const [elkoninBoxes, setElkoninBoxes] = React.useState([]);"""
    
    if old_state in content:
        content = content.replace(old_state, new_state)
        changes += 1
        print("✓ Added image visibility state variables")
    elif "imageVisibilityMode" in content[:100000]:
        print("ℹ State variables already present")
    else:
        print("✗ Could not find state variable location")
        return False
    
    # 2. Update renderPrompt conditional
    old_render = "{!showWordText && currentWordImage ? ("
    new_render = """{(() => {
                const shouldShowImage = currentWordImage && (
                    imageVisibilityMode === 'alwaysOn' ||
                    (imageVisibilityMode === 'progressive' && showImageForCurrentWord)
                );
                return shouldShowImage && !showWordText;
            })() ? ("""
    
    if old_render in content:
        content = content.replace(old_render, new_render)
        changes += 1
        print("✓ Updated renderPrompt conditional")
    elif "shouldShowImage" in content:
        print("ℹ renderPrompt already updated")
    else:
        print("✗ Could not find renderPrompt conditional")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\nApplied {changes} changes successfully")
    
    return True

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    apply_changes(file_path)
