#!/usr/bin/env python3
"""
Refine image visibility modes:
1. Rename 'alwaysOff' to 'afterCompletion' and update labels
2. Progressive: shows after 1st incorrect OR correct
3. After Completion: shows after 2nd incorrect OR correct
4. Add word text label below image
"""

from pathlib import Path

def refine_modes(file_path: Path):
    content = file_path.read_text(encoding='utf-8')
    changes = 0
    
    # 1. Update dropdown options in settings panel
    old_dropdown = """<option value="alwaysOn">🖼️ Always Show Image</option>
                            <option value="progressive">📈 Progressive (appears after response)</option>
                            <option value="alwaysOff">🔒 Image Hidden</option>"""
    
    new_dropdown = """<option value="alwaysOn">🖼️ Always On</option>
                            <option value="progressive">📈 Progressive (after 1st response)</option>
                            <option value="afterCompletion">✅ After Completion (after correct/2nd attempt)</option>"""
    
    if old_dropdown in content:
        content = content.replace(old_dropdown, new_dropdown)
        changes += 1
        print("✓ Updated dropdown labels")
    else:
        print("✗ Could not find dropdown")
    
    # 2. Update Progressive trigger - now only on 1st incorrect (attempts=0)
    # Already works: triggers on first incorrect (attempts === 0)
    
    # 3. Add After Completion trigger - on 2nd incorrect (attempts >= 1)
    old_incorrect = """setAttempts(1);
            // Progressive: reveal image after first incorrect
            if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
            playSound('error');"""
    
    new_incorrect = """setAttempts(1);
            // Progressive: reveal image after first incorrect
            if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);
            // After Completion: reveal on 2nd incorrect (handled in final scoring below)
            playSound('error');"""
    
    if old_incorrect in content:
        content = content.replace(old_incorrect, new_incorrect)
        changes += 1
        print("✓ Added comment for After Completion mode")
    
    # 4. Update correct answer trigger to include afterCompletion
    old_correct = """// Progressive: also reveal image on correct
            if (imageVisibilityMode === 'progressive') setShowImageForCurrentWord(true);"""
    
    new_correct = """// Progressive/After Completion: reveal image on correct answer
            if (imageVisibilityMode === 'progressive' || imageVisibilityMode === 'afterCompletion') setShowImageForCurrentWord(true);"""
    
    if old_correct in content:
        content = content.replace(old_correct, new_correct)
        changes += 1
        print("✓ Updated correct trigger for afterCompletion")
    else:
        print("✗ Could not find correct trigger")
    
    # 5. Add After Completion trigger for 2nd incorrect (final scoring when attempts > 0)
    # Find the location where final incorrect is scored (after retry fails)
    old_final_incorrect = """// Update score and streak
        setWordSoundsScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
            streak: newStreak
        }));"""
    
    new_final_incorrect = """// After Completion: reveal on 2nd incorrect attempt
        if (!isCorrect && imageVisibilityMode === 'afterCompletion') {
            setShowImageForCurrentWord(true);
        }
        
        // Update score and streak
        setWordSoundsScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
            streak: newStreak
        }));"""
    
    if old_final_incorrect in content:
        content = content.replace(old_final_incorrect, new_final_incorrect)
        changes += 1
        print("✓ Added After Completion trigger for 2nd incorrect")
    else:
        print("✗ Could not find final scoring section")
    
    # 6. Update renderPrompt to include afterCompletion
    old_render = """imageVisibilityMode === 'alwaysOn' ||
                    (imageVisibilityMode === 'progressive' && showImageForCurrentWord)"""
    
    new_render = """imageVisibilityMode === 'alwaysOn' ||
                    ((imageVisibilityMode === 'progressive' || imageVisibilityMode === 'afterCompletion') && showImageForCurrentWord)"""
    
    if old_render in content:
        content = content.replace(old_render, new_render)
        changes += 1
        print("✓ Updated renderPrompt for afterCompletion")
    else:
        print("✗ Could not find renderPrompt conditional")
    
    # 7. Add word text label below image (always visible)
    old_image = """<img 
                        src={currentWordImage} 
                        alt="Mystery Word" 
                        className="w-32 h-32 object-cover rounded-xl shadow-md mb-2 border-2 border-slate-100"
                    />"""
    
    new_image = """<img 
                        src={currentWordImage} 
                        alt="Mystery Word" 
                        className="w-32 h-32 object-cover rounded-xl shadow-md mb-2 border-2 border-slate-100"
                    />
                    {/* Word Label */}
                    <span className="text-lg font-bold text-slate-700 bg-white/80 px-3 py-1 rounded-full shadow-sm">{currentWordSoundsWord}</span>"""
    
    if old_image in content:
        content = content.replace(old_image, new_image)
        changes += 1
        print("✓ Added word text label below image")
    else:
        print("✗ Could not find image element")
    
    # Write back
    if changes > 0:
        file_path.write_text(content, encoding='utf-8')
        print(f"\n✓ Applied {changes} changes")
    
    return changes > 0

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    refine_modes(file_path)
