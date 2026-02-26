#!/usr/bin/env python3
"""
Update renderPrompt to respect image visibility mode
"""

from pathlib import Path

def update_render_prompt(file_path: Path) -> bool:
    """Update renderPrompt image condition to respect visibility mode."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # The old condition just checks showWordText and currentWordImage
    old_condition = "{!showWordText && currentWordImage ? ("
    
    # New condition checks the visibility mode:
    # - alwaysOff: never show image
    # - alwaysOn: always show if available
    # - progressive/afterResponse/hintMode: check showImageForCurrentWord
    new_condition = """{(() => {
                const shouldShowImage = currentWordImage && (
                    imageVisibilityMode === 'alwaysOn' ||
                    (imageVisibilityMode !== 'alwaysOff' && showImageForCurrentWord)
                );
                return shouldShowImage && !showWordText;
            })() ? ("""
    
    if old_condition in content and "imageVisibilityMode === 'alwaysOn'" not in content:
        content = content.replace(old_condition, new_condition)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Updated renderPrompt image condition to respect visibility mode")
        return True
    elif "imageVisibilityMode === 'alwaysOn'" in content:
        print("ℹ renderPrompt already updated for visibility mode")
        return True
    else:
        print("✗ Could not find renderPrompt condition pattern")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    update_render_prompt(file_path)
