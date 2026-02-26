#!/usr/bin/env python3
"""
Add Image Visibility Mode dropdown in settings toolbar
"""

from pathlib import Path

def add_dropdown(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    
    # Find the Pure Sound toggle closing button and add after
    old = """<span className="hidden sm:inline">{showLetterHints ? ts('word_sounds.mode_phonics') || 'Phonics' : ts('word_sounds.mode_sound') || 'Sound Only'}</span>
                            </button>

                            <DifficultyIndicator />"""
    
    new = """<span className="hidden sm:inline">{showLetterHints ? ts('word_sounds.mode_phonics') || 'Phonics' : ts('word_sounds.mode_sound') || 'Sound Only'}</span>
                            </button>
                            
                            {/* Image Visibility Mode */}
                            <select
                                value={imageVisibilityMode}
                                onChange={(e) => setImageVisibilityMode(e.target.value)}
                                className="bg-violet-800 border border-violet-600 rounded-full px-3 py-1 text-white text-xs cursor-pointer hover:bg-violet-700 transition-colors outline-none"
                                title="Image visibility mode"
                            >
                                <option value="alwaysOn">🖼️ Always Show</option>
                                <option value="progressive">📈 Progressive</option>
                                <option value="alwaysOff">🔒 Hidden</option>
                            </select>

                            <DifficultyIndicator />"""
    
    if old in content:
        content = content.replace(old, new)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Added Image Visibility dropdown to settings toolbar")
        return True
    elif "Image Visibility Mode" in content:
        print("ℹ Dropdown already added")
        return True
    else:
        print("✗ Could not find settings toolbar pattern")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_dropdown(file_path)
