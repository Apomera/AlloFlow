#!/usr/bin/env python3
"""
Add auto-open logic for pre-activity review panel when preloaded words are ready
"""

from pathlib import Path

def add_auto_open(file_path: Path) -> bool:
    """Add auto-open effect for review panel when preloaded words are ready."""
    
    content = file_path.read_text(encoding='utf-8')
    
    # Check if already exists
    if "AUTO-OPEN: Show review panel when preloaded words become ready" in content:
        print("ℹ Auto-open logic already exists")
        return True
    
    # Find the existing sync effect and add new effect after it
    old_pattern = '''    }, [initialShowReviewPanel, preloadedWords.length]);
    
    // FIX: Reset hasStartedFromReview when NEW preloaded words are loaded'''
    
    new_pattern = '''    }, [initialShowReviewPanel, preloadedWords.length]);
    
    // AUTO-OPEN: Show review panel when preloaded words become ready
    React.useEffect(() => {
        // Only auto-open if:
        // 1. We have preloaded words
        // 2. Activity hasn't started yet (no word selected)
        // 3. Review panel isn't already showing
        // 4. Haven't already started from review (prevents re-opening after starting)
        if (preloadedWords.length > 0 && 
            !currentWordSoundsWord && 
            !showReviewPanel && 
            !hasStartedFromReview.current) {
            const timer = setTimeout(() => {
                console.log("📋 Auto-opening Review Panel - words are ready!");
                setShowReviewPanel(true);
            }, 500); // Small delay to ensure UI settles
            return () => clearTimeout(timer);
        }
    }, [preloadedWords.length, currentWordSoundsWord, showReviewPanel]);
    
    // FIX: Reset hasStartedFromReview when NEW preloaded words are loaded'''
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        file_path.write_text(content, encoding='utf-8')
        print("✓ Added auto-open logic for review panel")
        return True
    else:
        print("✗ Could not find the insertion point")
        return False

if __name__ == "__main__":
    file_path = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
    add_auto_open(file_path)
