#!/usr/bin/env python3
"""
Fix the prop passing - use the existing imageVisibilityMode state already in the app.
"""

from pathlib import Path

def fix_props(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # The imageVisibilityMode state is already defined in WordSoundsStudio.
    # But WordSoundsGenerator is rendered in AlloFlow main, not inside WordSoundsStudio.
    # We need to add state in AlloFlow where WordSoundsGenerator is used.
    
    # 1. Fix the prop passing to use inline state (simpler approach)
    old_usage = """imageVisibilityMode={wsImageVisibilityMode}
              setImageVisibilityMode={setWsImageVisibilityMode}"""
    
    # Since the state is in WordSoundsStudio which is separate,
    # we need to add a local state in WordSoundsGenerator instead
    new_usage = """/* imageVisibilityMode is handled inside WordSoundsGenerator */"""
    
    if old_usage in content:
        content = content.replace(old_usage, new_usage)
        changes += 1
        print("✓ Removed prop passing (will use local state)")
    
    # 2. Add local state inside WordSoundsGenerator since it's independent
    old_generator_props = """const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview, imageVisibilityMode, setImageVisibilityMode }) => {
        // Guard: Ensure t is always a valid function
        const t = tProp || ((key, fallback) => fallback || key);
        
        // Source States (Hybrid Mode)"""
    
    new_generator_props = """const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview }) => {
        // Guard: Ensure t is always a valid function
        const t = tProp || ((key, fallback) => fallback || key);
        
        // Image Visibility Mode (session-level setting)
        const [imageVisibilityMode, setImageVisibilityMode] = React.useState('progressive');
        
        // Source States (Hybrid Mode)"""
    
    if old_generator_props in content:
        content = content.replace(old_generator_props, new_generator_props)
        changes += 1
        print("✓ Added local imageVisibilityMode state to WordSoundsGenerator")
    else:
        print("✗ Could not find WordSoundsGenerator to add state")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} fixes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    fix_props(file_path)
