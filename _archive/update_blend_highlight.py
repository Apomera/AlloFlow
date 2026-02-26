#!/usr/bin/env python3
"""
Update blending option highlighting to include highlightedBlendIndex
"""

from pathlib import Path

def update_highlight(file_path: Path) -> bool:
    """Update blending option highlighting to include highlightedBlendIndex."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # Update the className condition at L8775
    old_highlight = "className={`relative group transition-all duration-300 ${playingOptionIndex === idx ? 'scale-105 ring-4 ring-pink-300 rounded-xl z-20' : ''}`}"
    
    new_highlight = "className={`relative group transition-all duration-300 ${(playingOptionIndex === idx || highlightedBlendIndex === idx) ? 'scale-105 ring-4 ring-pink-300 rounded-xl z-20' : ''}`}"
    
    if old_highlight in content:
        content = content.replace(old_highlight, new_highlight)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Updated blending option highlighting to include highlightedBlendIndex")
        return True
    elif new_highlight in content:
        print("ℹ Highlighting already includes highlightedBlendIndex")
        return True
    else:
        print("✗ Could not find the highlighting pattern")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    update_highlight(file_path)
