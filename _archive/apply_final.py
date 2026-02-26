#!/usr/bin/env python3
"""
Add state reset on word change and UI dropdown for image visibility
"""

from pathlib import Path

def apply_final_changes(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Add state reset when new word is loaded
    old_load = "setShowWordText(!wordImage);\n\n                // Use centralized helper"
    new_load = """setShowWordText(!wordImage);
                setShowImageForCurrentWord(false); // Reset per-word visibility state

                // Use centralized helper"""
    
    if old_load in content:
        content = content.replace(old_load, new_load)
        changes += 1
        print("✓ Added state reset on word change")
    elif "Reset per-word visibility" in content:
        print("ℹ State reset already added")
    else:
        print("✗ Could not find word loading location")
    
    # 2. Add UI dropdown in settings toolbar
    # Find the showLetterHints toggle and add after it
    old_toggle = """<span className="text-sm text-slate-600">{ts('word_sounds.settings.letter_hints')}</span>
                    </button>"""
    new_toggle = """<span className="text-sm text-slate-600">{ts('word_sounds.settings.letter_hints')}</span>
                    </button>
                    
                    {/* Image Visibility Mode Selector */}
                    <select
                        value={imageVisibilityMode}
                        onChange={(e) => setImageVisibilityMode(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-700 border border-slate-200 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        title="Image visibility mode"
                    >
                        <option value="alwaysOn">🖼️ Always Show Image</option>
                        <option value="progressive">📈 Progressive (after response)</option>
                        <option value="alwaysOff">🔒 Hide Image</option>
                    </select>"""
    
    if old_toggle in content:
        content = content.replace(old_toggle, new_toggle)
        changes += 1
        print("✓ Added UI dropdown selector")
    elif "Image Visibility Mode Selector" in content:
        print("ℹ UI dropdown already added")
    else:
        # Try alternative pattern - button may be formatted differently
        print("✗ Could not find settings toggle location (pattern 1)")
        
        # Try simpler pattern
        old_simple = ">{ts('word_sounds.settings.letter_hints')}</span>\n                    </button>"
        if old_simple in content:
            new_simple = old_simple + """
                    
                    {/* Image Visibility Mode Selector */}
                    <select
                        value={imageVisibilityMode}
                        onChange={(e) => setImageVisibilityMode(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-sm text-slate-700 border border-slate-200 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        title="Image visibility mode"
                    >
                        <option value="alwaysOn">🖼️ Always Show Image</option>
                        <option value="progressive">📈 Progressive (after response)</option>
                        <option value="alwaysOff">🔒 Hide Image</option>
                    </select>"""
            content = content.replace(old_simple, new_simple)
            changes += 1
            print("✓ Added UI dropdown selector (pattern 2)")
        else:
            print("✗ Could not find settings toggle (pattern 2)")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} final changes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    apply_final_changes(file_path)
