#!/usr/bin/env python3
"""
Pass imageVisibilityMode props to WordSoundsReviewPanel
"""

from pathlib import Path

def pass_props(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    
    # Find where props are passed and add the new ones
    old_props = """onDeleteWord={handleDeleteWord}
                t={t}
            />"""
    
    new_props = """onDeleteWord={handleDeleteWord}
                t={t}
                imageVisibilityMode={imageVisibilityMode}
                setImageVisibilityMode={setImageVisibilityMode}
            />"""
    
    if old_props in content:
        content = content.replace(old_props, new_props)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Passed imageVisibilityMode props to WordSoundsReviewPanel")
        return True
    elif "imageVisibilityMode={imageVisibilityMode}" in content[280000:]:
        print("ℹ Props already passed")
        return True
    else:
        print("✗ Could not find prop passing location")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    pass_props(file_path)
