"""
Patch Phase 2: Add Smart Image Display Mode to WordSoundsStudio runtime engine
This updates the modal runtime to use smart mode and resolve activity-specific behavior.
"""

import re

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changes = []
    
    # 1. Change default state in WordSoundsStudio from 'progressive' to 'smart' (around L3000)
    # This is the SECOND imageVisibilityMode useState (WordSoundsStudio has its own)
    old_studio_state = "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('progressive');\n    const [showImageForCurrentWord, setShowImageForCurrentWord]"
    new_studio_state = "const [imageVisibilityMode, setImageVisibilityMode] = React.useState('smart');\n    const [showImageForCurrentWord, setShowImageForCurrentWord]"
    
    if old_studio_state in content:
        content = content.replace(old_studio_state, new_studio_state, 1)
        changes.append("Changed WordSoundsStudio default imageVisibilityMode to 'smart'")
    else:
        print("WARNING: Could not find WordSoundsStudio imageVisibilityMode state (may already be patched)")
    
    # 2. Add SMART_IMAGE_VISIBILITY constant to WordSoundsStudio (after the state declarations)
    # We'll add it after showImageForCurrentWord state
    smart_const_studio = '''
        // SMART IMAGE VISIBILITY - Activity-specific optimal image behavior
        const SMART_IMAGE_VISIBILITY = {
            'counting':       'afterCompletion',
            'isolation':      'progressive',
            'blending':       'afterCompletion',
            'segmentation':   'alwaysOn',
            'rhyming':        'progressive',
            'letter_tracing': 'alwaysOn',
            'mapping':        'alwaysOn',
            'orthography':    'afterCompletion',
            'word_families':  'progressive',
            'spelling_bee':   'afterCompletion',
            'word_scramble':  'afterCompletion',
            'missing_letter': 'afterCompletion'
        };
        
        // Resolve 'smart' mode to activity-specific mode
        const getEffectiveImageMode = () => {
            if (imageVisibilityMode === 'smart') {
                return SMART_IMAGE_VISIBILITY[wordSoundsActivity] || 'progressive';
            }
            return imageVisibilityMode;
        };
'''
    
    # Find a unique anchor point after showImageForCurrentWord in WordSoundsStudio
    anchor = "const [showImageForCurrentWord, setShowImageForCurrentWord] = React.useState(false);\n    const [elkoninBoxes, setElkoninBoxes]"
    new_anchor = "const [showImageForCurrentWord, setShowImageForCurrentWord] = React.useState(false);" + smart_const_studio + "\n    const [elkoninBoxes, setElkoninBoxes]"
    
    # Count occurrences of anchor to find the right one (second occurrence is in WordSoundsStudio)
    if anchor in content and "getEffectiveImageMode" not in content:
        content = content.replace(anchor, new_anchor, 1)
        changes.append("Added SMART_IMAGE_VISIBILITY constant and getEffectiveImageMode() to WordSoundsStudio")
    else:
        if "getEffectiveImageMode" in content:
            print("Note: getEffectiveImageMode already exists")
        else:
            print("WARNING: Could not find anchor for SMART_IMAGE_VISIBILITY insertion")
    
    # 3. Update renderPrompt() to use effectiveMode instead of imageVisibilityMode directly
    # Old pattern in renderPrompt (around L8395-8397):
    old_render_logic = '''const shouldShowImage = currentWordImage && (
                    imageVisibilityMode === 'alwaysOn' ||
                    ((imageVisibilityMode === 'progressive' || imageVisibilityMode === 'afterCompletion') && showImageForCurrentWord)
                );'''
    
    new_render_logic = '''const effectiveMode = getEffectiveImageMode();
                const shouldShowImage = currentWordImage && (
                    effectiveMode === 'alwaysOn' ||
                    ((effectiveMode === 'progressive' || effectiveMode === 'afterCompletion') && showImageForCurrentWord)
                );'''
    
    if old_render_logic in content:
        content = content.replace(old_render_logic, new_render_logic, 1)
        changes.append("Updated renderPrompt() to use getEffectiveImageMode()")
    else:
        print("WARNING: Could not find renderPrompt shouldShowImage pattern")
    
    # 4. Update checkAnswer() progressive reveal logic
    # Old: if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
    old_progressive_check = "if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);"
    new_progressive_check = """const effectiveCheckMode = getEffectiveImageMode();
            if (effectiveCheckMode === 'progressive') setShowImageForCurrentWord(true);"""
    
    if old_progressive_check in content:
        content = content.replace(old_progressive_check, new_progressive_check, 1)
        changes.append("Updated checkAnswer() progressive reveal to use effective mode")
    else:
        print("WARNING: Could not find checkAnswer progressive pattern")
    
    # 5. Update checkAnswer() afterCompletion reveal logic
    old_after_check = "if (!isCorrect && imageVisibilityMode === 'afterCompletion') {"
    new_after_check = "if (!isCorrect && effectiveCheckMode === 'afterCompletion') {"
    
    if old_after_check in content:
        content = content.replace(old_after_check, new_after_check, 1)
        changes.append("Updated checkAnswer() afterCompletion reveal to use effective mode")
    else:
        print("WARNING: Could not find checkAnswer afterCompletion pattern")
    
    # Write the patched content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("=" * 60)
    print("PATCH PHASE 2 COMPLETE - Changes Made:")
    for i, c in enumerate(changes, 1):
        print(f"  {i}. {c}")
    print("=" * 60)
    
    return len(changes)

if __name__ == "__main__":
    filepath = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
    patch_file(filepath)
