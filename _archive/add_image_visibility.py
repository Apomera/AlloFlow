#!/usr/bin/env python3
"""
Add Image Visibility Modes feature to Word Sounds Studio
- 5 modes: alwaysOn, alwaysOff, progressive, afterResponse, hintMode
- State variables for tracking attempts and hints
- UI dropdown in settings toolbar
"""

from pathlib import Path

def add_image_visibility_feature(file_path: Path) -> list:
    """Add image visibility modes feature."""
    
    content = file_path.read_text(encoding='utf-8')
    fixes = []
    
    # 1. Add state variables after showLetterHints (L2923)
    old_state = "const [showLetterHints, setShowLetterHints] = React.useState(false); // Toggle for Pure Sound vs Phonics (Default: Sound Only)"
    
    new_state = """const [showLetterHints, setShowLetterHints] = React.useState(false); // Toggle for Pure Sound vs Phonics (Default: Sound Only)
    
    // Image Visibility Modes: alwaysOn, alwaysOff, progressive, afterResponse, hintMode
    const [imageVisibilityMode, setImageVisibilityMode] = React.useState('progressive');
    const [currentWordAttempts, setCurrentWordAttempts] = React.useState(0); // Track attempts for Progressive/AfterResponse
    const [hintsRemaining, setHintsRemaining] = React.useState(3); // Hint Mode limit (teacher-configurable)
    const [showImageForCurrentWord, setShowImageForCurrentWord] = React.useState(false); // Per-word image visibility"""
    
    if old_state in content and "imageVisibilityMode" not in content:
        content = content.replace(old_state, new_state)
        fixes.append("Added image visibility state variables")
    elif "imageVisibilityMode" in content:
        fixes.append("State variables already exist")
    
    # 2. Add UI dropdown after the Instruction Toggle (around L9980)
    old_ui = """                            {/* Instruction Toggle */}
                            <button
                                onClick={() => setPlayInstructions(!playInstructions)}"""
    
    new_ui = """                            {/* Image Visibility Mode Selector */}
                            <div className="relative">
                                <select
                                    value={imageVisibilityMode}
                                    onChange={(e) => setImageVisibilityMode(e.target.value)}
                                    className="bg-white/20 border border-white/30 rounded-full pl-7 pr-3 py-1 text-white text-xs cursor-pointer hover:bg-white/30 transition-colors outline-none appearance-none"
                                    title="Image Visibility Mode"
                                >
                                    <option value="progressive" className="text-slate-800">🖼️ Progressive</option>
                                    <option value="afterResponse" className="text-slate-800">✅ After Response</option>
                                    <option value="alwaysOn" className="text-slate-800">👁️ Always On</option>
                                    <option value="alwaysOff" className="text-slate-800">🔒 Always Off</option>
                                    <option value="hintMode" className="text-slate-800">💡 Hint Mode</option>
                                </select>
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none">🖼️</span>
                            </div>
                            
                            {/* Hint Button (Only in Hint Mode) */}
                            {imageVisibilityMode === 'hintMode' && (
                                <button
                                    onClick={() => {
                                        if (hintsRemaining > 0 && currentWordImage) {
                                            setShowImageForCurrentWord(true);
                                            setHintsRemaining(prev => prev - 1);
                                        }
                                    }}
                                    disabled={hintsRemaining <= 0 || showImageForCurrentWord}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-all text-xs font-bold ${
                                        hintsRemaining > 0 && !showImageForCurrentWord
                                            ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200'
                                            : 'bg-white/10 border-white/20 text-white/50 cursor-not-allowed'
                                    }`}
                                    title={`Show image hint (${hintsRemaining} remaining)`}
                                >
                                    💡 Hint ({hintsRemaining})
                                </button>
                            )}

                            {/* Instruction Toggle */}
                            <button
                                onClick={() => setPlayInstructions(!playInstructions)}"""
    
    if old_ui in content and "Image Visibility Mode Selector" not in content:
        content = content.replace(old_ui, new_ui)
        fixes.append("Added Image Visibility Mode dropdown and Hint button to UI")
    elif "Image Visibility Mode Selector" in content:
        fixes.append("UI dropdown already exists")
    
    if fixes:
        file_path.write_text(content, encoding='utf-8')
        print(f"Applied {len(fixes)} changes:")
        for f in fixes:
            print(f"  ✓ {f}")
    else:
        print("No changes applied")
    
    return fixes

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_image_visibility_feature(file_path)
