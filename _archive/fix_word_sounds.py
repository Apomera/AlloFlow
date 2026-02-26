#!/usr/bin/env python3
"""
Word Sounds Activity Fixes
1. Add cancelled check before playBlending
2. Add blendingOptions to dependency array
3. Add Blending option auto-play with highlighting (matching Rhyme/Isolation pattern)
"""

from pathlib import Path

def apply_fixes(file_path: Path) -> list:
    """Apply all Word Sounds fixes."""
    
    content = file_path.read_text(encoding='utf-8')
    fixes = []
    
    # FIX 1: Add cancelled check before playBlending (L7046)
    old_blending = '''            // -- Blending: ONLY play phoneme sequence (broken sounds) --
            if (wordSoundsActivity === 'blending' && wordSoundsPhonemes?.phonemes) {
                await new Promise(r => setTimeout(r, 400)); // Small gap
                await playBlending(); // Play phoneme sequence ONLY
            }'''
    
    new_blending = '''            // -- Blending: ONLY play phoneme sequence (broken sounds) --
            if (wordSoundsActivity === 'blending' && wordSoundsPhonemes?.phonemes) {
                await new Promise(r => setTimeout(r, 400)); // Small gap
                if (cancelled) return; // FIX: Check before expensive operation
                await playBlending(); // Play phoneme sequence ONLY
                
                // Auto-play word options with highlighting (matching Rhyme/Isolation pattern)
                if (blendingOptions && blendingOptions.length > 0) {
                    await new Promise(r => setTimeout(r, 600)); // Gap after phonemes
                    for (let i = 0; i < blendingOptions.length; i++) {
                        if (cancelled) break;
                        setHighlightedBlendIndex(i); // Highlight current option
                        await handleAudio(blendingOptions[i]);
                        await new Promise(r => setTimeout(r, 500)); // Gap between options
                    }
                    setHighlightedBlendIndex(null); // Clear highlight when done
                }
            }'''
    
    if old_blending in content:
        content = content.replace(old_blending, new_blending)
        fixes.append("Fix 1: Added cancelled check before playBlending")
        fixes.append("Fix 3+4: Added Blending option auto-play with highlighting")
    else:
        print("  Warning: Could not find blending block")
    
    # FIX 2: Add blendingOptions to dependency array (around L7105)
    old_deps = "isolationState?.currentPosition, rhymeOptions]);"
    new_deps = "isolationState?.currentPosition, rhymeOptions, blendingOptions]);"
    
    if old_deps in content:
        content = content.replace(old_deps, new_deps)
        fixes.append("Fix 2: Added blendingOptions to dependency array")
    elif new_deps in content:
        fixes.append("Fix 2: blendingOptions already in dependency array")
    else:
        print("  Warning: Could not find dependency array pattern")
    
    if fixes:
        file_path.write_text(content, encoding='utf-8')
        print(f"Applied {len(fixes)} fixes:")
        for f in fixes:
            print(f"  ✓ {f}")
    else:
        print("No fixes applied")
    
    return fixes

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    apply_fixes(file_path)
