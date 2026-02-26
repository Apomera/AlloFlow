"""
TWO FIXES:
1. Auto-navigate: Add setActiveView('word-sounds') to the auto-open logic
2. Word repetition: Make the fallback advancement path also use queue-based consumption
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# FIX 1: Auto-navigate — add setActiveView to auto-open logic
old_auto = """           debugLog("🚀 Auto-opening Word Sounds mode for", wsPreloadedWords.length, "preloaded words");
           setIsWordSoundsMode(true);
           setWordSoundsAutoReview(true); // Ensure review panel opens"""

new_auto = """           debugLog("🚀 Auto-opening Word Sounds mode for", wsPreloadedWords.length, "preloaded words");
           setIsWordSoundsMode(true);
           setActiveView('word-sounds'); // FIX: Set activeView to pass the parent gate
           setWordSoundsAutoReview(true); // Ensure review panel opens"""

if old_auto in content:
    content = content.replace(old_auto, new_auto, 1)
    changes += 1
    print("1. FIXED: Added setActiveView('word-sounds') to auto-open logic")
else:
    print("[WARN] Auto-open pattern not found")
    # Try to find approximate
    for i, l in enumerate(content.split('\n')):
        if 'Auto-opening Word Sounds mode' in l:
            print("  Found at L%d: %s" % (i+1, l.strip()[:180]))

# FIX 2: Word repetition fallback — replace getAdaptiveRandomWord with direct queue pop
old_fallback = """            } else {
                // FALLBACK: Normal fetch if buffer empty
                // Pass CURRENT word to exclude, preventing sequential duplicates
                let word = getAdaptiveRandomWord(currentWordSoundsWord?.singleWord || currentWordSoundsWord);"""

new_fallback = """            } else {
                // FALLBACK: Queue-based fetch (same pattern as primary path)
                const fallbackActId = wordSoundsActivity || 'segmentation';
                const fallbackQueue = sessionQueueRef.current[fallbackActId];
                let word = null;
                if (fallbackQueue && fallbackQueue.length > 0) {
                    word = fallbackQueue[0];
                    sessionQueueRef.current[fallbackActId] = fallbackQueue.slice(1);
                    setSessionWordLists(prev => ({...prev, [fallbackActId]: fallbackQueue.slice(1)}));
                }"""

if old_fallback in content:
    content = content.replace(old_fallback, new_fallback, 1)
    changes += 1
    print("2. FIXED: Replaced getAdaptiveRandomWord fallback with queue-based consumption")
else:
    print("[WARN] Fallback pattern not found")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nApplied %d fixes" % changes)
