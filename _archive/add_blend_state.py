#!/usr/bin/env python3
"""
Add highlightedBlendIndex state variable
"""

from pathlib import Path

def add_state(file_path: Path) -> bool:
    """Add highlightedBlendIndex state variable."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # Check if already exists
    if "highlightedBlendIndex" in content:
        print("ℹ highlightedBlendIndex already exists")
        return True
    
    # Add after highlightedIsoIndex
    old_pattern = "const [highlightedIsoIndex, setHighlightedIsoIndex] = React.useState(null); // Track which isolation option is highlighted"
    new_pattern = """const [highlightedIsoIndex, setHighlightedIsoIndex] = React.useState(null); // Track which isolation option is highlighted
    const [highlightedBlendIndex, setHighlightedBlendIndex] = React.useState(null); // Track which blending option is highlighted"""
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Added highlightedBlendIndex state variable")
        return True
    else:
        print("✗ Could not find highlightedIsoIndex pattern")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_state(file_path)
